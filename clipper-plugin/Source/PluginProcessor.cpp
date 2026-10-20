#include "PluginProcessor.h"

namespace
{
    enum ClipMode { Soft = 0, Classic, Modern, Hard };
}

MozClipProcessor::MozClipProcessor()
    : AudioProcessor (BusesProperties()
                          .withInput  ("Input",  juce::AudioChannelSet::stereo(), true)
                          .withOutput ("Output", juce::AudioChannelSet::stereo(), true)),
      apvts (*this, nullptr, "PARAMS", createLayout())
{
    inGainParam  = apvts.getRawParameterValue ("inGain");
    ceilingParam = apvts.getRawParameterValue ("ceiling");
    outGainParam = apvts.getRawParameterValue ("outGain");
    mixParam     = apvts.getRawParameterValue ("mix");
    modeParam    = apvts.getRawParameterValue ("mode");
    osParam      = apvts.getRawParameterValue ("oversampling");
    deltaParam   = apvts.getRawParameterValue ("delta");
}

juce::AudioProcessorValueTreeState::ParameterLayout MozClipProcessor::createLayout()
{
    using namespace juce;
    AudioProcessorValueTreeState::ParameterLayout layout;

    layout.add (std::make_unique<AudioParameterFloat> ("inGain",  "Input Gain (dB)",
                    NormalisableRange<float> (0.0f, 24.0f, 0.01f), 0.0f));
    layout.add (std::make_unique<AudioParameterFloat> ("ceiling", "Ceiling (dB)",
                    NormalisableRange<float> (-12.0f, 0.0f, 0.01f), -0.3f));
    layout.add (std::make_unique<AudioParameterFloat> ("outGain", "Output Gain (dB)",
                    NormalisableRange<float> (-12.0f, 12.0f, 0.01f), 0.0f));
    layout.add (std::make_unique<AudioParameterFloat> ("mix",     "Mix (%)",
                    NormalisableRange<float> (0.0f, 100.0f, 0.1f), 100.0f));
    layout.add (std::make_unique<AudioParameterChoice> ("mode", "Clip Mode",
                    StringArray { "Soft", "Classic", "Modern", "Hard" }, Modern));
    layout.add (std::make_unique<AudioParameterChoice> ("oversampling", "Oversampling",
                    StringArray { "Off", "2x", "4x", "8x" }, 1));
    layout.add (std::make_unique<AudioParameterBool> ("delta", "Delta", false));

    return layout;
}

// x is normalised so that 1.0 == ceiling. Every curve saturates at +/-1.
float MozClipProcessor::clipSample (float x, int mode)
{
    const float a = std::abs (x);

    switch (mode)
    {
        case Soft:
            return std::tanh (x);

        case Classic:
        {
            // Smooth knee, closer to an overdriven converter
            const float a2 = a * a;
            return x / std::pow (1.0f + a2 * a2, 0.25f);
        }

        case Modern:
        {
            // Transparent below the knee, tanh rounding above it
            constexpr float knee = 0.7f;
            if (a <= knee)
                return x;
            const float over = (a - knee) / (1.0f - knee);
            return std::copysign (knee + (1.0f - knee) * std::tanh (over), x);
        }

        case Hard:
        default:
            return juce::jlimit (-1.0f, 1.0f, x);
    }
}

void MozClipProcessor::prepareToPlay (double sampleRate, int samplesPerBlock)
{
    const auto numChannels = (juce::uint32) juce::jmax (1, getTotalNumOutputChannels());

    for (int stage = 0; stage <= maxOversamplingStages; ++stage)
    {
        oversamplers[(size_t) stage] = std::make_unique<juce::dsp::Oversampling<float>> (
            numChannels, (size_t) stage,
            juce::dsp::Oversampling<float>::filterHalfBandFIREquiphase, true, false);
        oversamplers[(size_t) stage]->initProcessing ((size_t) samplesPerBlock);
    }

    juce::dsp::ProcessSpec spec { sampleRate, (juce::uint32) samplesPerBlock, numChannels };
    dryDelay.prepare (spec);
    dryBuffer.setSize ((int) numChannels, samplesPerBlock);

    inGainSmoothed.reset  (sampleRate, 0.02);
    outGainSmoothed.reset (sampleRate, 0.02);
    mixSmoothed.reset     (sampleRate, 0.02);
    inGainSmoothed.setCurrentAndTargetValue  (juce::Decibels::decibelsToGain (inGainParam->load()));
    outGainSmoothed.setCurrentAndTargetValue (juce::Decibels::decibelsToGain (outGainParam->load()));
    mixSmoothed.setCurrentAndTargetValue     (mixParam->load() * 0.01f);

    currentStage = -1; // force latency update on the first block
}

bool MozClipProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
    const auto& out = layouts.getMainOutputChannelSet();
    return (out == juce::AudioChannelSet::stereo() || out == juce::AudioChannelSet::mono())
           && out == layouts.getMainInputChannelSet();
}

void MozClipProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer&)
{
    juce::ScopedNoDenormals noDenormals;

    const int numChannels = buffer.getNumChannels();
    const int numSamples  = buffer.getNumSamples();

    const int stage = juce::jlimit (0, maxOversamplingStages, (int) osParam->load());
    auto& os = *oversamplers[(size_t) stage];

    if (stage != currentStage)
    {
        currentStage = stage;
        os.reset();
        dryDelay.reset();
        const int latency = (int) std::round (os.getLatencyInSamples());
        dryDelay.setDelay ((float) latency);
        setLatencySamples (latency);
    }

    // Dry path, delayed to line up with the oversampled wet path
    for (int ch = 0; ch < numChannels; ++ch)
        dryBuffer.copyFrom (ch, 0, buffer, ch, 0, numSamples);
    {
        juce::dsp::AudioBlock<float> dryBlock (dryBuffer.getArrayOfWritePointers(),
                                               (size_t) numChannels, (size_t) numSamples);
        dryDelay.process (juce::dsp::ProcessContextReplacing<float> (dryBlock));
    }

    // Parameters
    inGainSmoothed.setTargetValue  (juce::Decibels::decibelsToGain (inGainParam->load()));
    outGainSmoothed.setTargetValue (juce::Decibels::decibelsToGain (outGainParam->load()));
    mixSmoothed.setTargetValue     (mixParam->load() * 0.01f);
    const float ceilingGain = juce::Decibels::decibelsToGain (ceilingParam->load());
    const int   mode        = (int) modeParam->load();
    const bool  delta       = deltaParam->load() > 0.5f;

    // Input gain (per-sample smoothing, same ramp on every channel)
    for (int i = 0; i < numSamples; ++i)
    {
        const float g = inGainSmoothed.getNextValue();
        for (int ch = 0; ch < numChannels; ++ch)
            buffer.getWritePointer (ch)[i] *= g;
    }

    // Wet path: clip at the oversampled rate
    juce::dsp::AudioBlock<float> block (buffer);
    auto upBlock = os.processSamplesUp (block);
    const float invCeiling = 1.0f / ceilingGain;

    for (size_t ch = 0; ch < upBlock.getNumChannels(); ++ch)
    {
        auto* data = upBlock.getChannelPointer (ch);
        for (size_t i = 0; i < upBlock.getNumSamples(); ++i)
            data[i] = clipSample (data[i] * invCeiling, mode) * ceilingGain;
    }

    os.processSamplesDown (block);

    // Mix, delta and output gain
    for (int i = 0; i < numSamples; ++i)
    {
        const float mix = mixSmoothed.getNextValue();
        const float out = outGainSmoothed.getNextValue();

        for (int ch = 0; ch < numChannels; ++ch)
        {
            const float wet = buffer.getReadPointer (ch)[i];
            const float dry = dryBuffer.getReadPointer (ch)[i];
            const float sig = delta ? (dry * inGainSmoothed.getTargetValue() - wet)
                                    : (dry * (1.0f - mix) + wet * mix);
            buffer.getWritePointer (ch)[i] = sig * out;
        }
    }
}

juce::AudioProcessorEditor* MozClipProcessor::createEditor()
{
    return new juce::GenericAudioProcessorEditor (*this);
}

void MozClipProcessor::getStateInformation (juce::MemoryBlock& destData)
{
    if (auto xml = apvts.copyState().createXml())
        copyXmlToBinary (*xml, destData);
}

void MozClipProcessor::setStateInformation (const void* data, int size)
{
    if (auto xml = getXmlFromBinary (data, size))
        if (xml->hasTagName (apvts.state.getType()))
            apvts.replaceState (juce::ValueTree::fromXml (*xml));
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new MozClipProcessor();
}
