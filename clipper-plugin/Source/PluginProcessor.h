#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_dsp/juce_dsp.h>

class MozClipProcessor : public juce::AudioProcessor
{
public:
    MozClipProcessor();
    ~MozClipProcessor() override = default;

    void prepareToPlay (double sampleRate, int samplesPerBlock) override;
    void releaseResources() override {}
    bool isBusesLayoutSupported (const BusesLayout& layouts) const override;
    void processBlock (juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return "MozClip"; }
    bool acceptsMidi() const override { return false; }
    bool producesMidi() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram (int) override {}
    const juce::String getProgramName (int) override { return {}; }
    void changeProgramName (int, const juce::String&) override {}

    void getStateInformation (juce::MemoryBlock&) override;
    void setStateInformation (const void*, int) override;

    juce::AudioProcessorValueTreeState apvts;

private:
    static juce::AudioProcessorValueTreeState::ParameterLayout createLayout();
    static float clipSample (float x, int mode);

    static constexpr int maxOversamplingStages = 3; // 1x, 2x, 4x, 8x

    std::array<std::unique_ptr<juce::dsp::Oversampling<float>>, maxOversamplingStages + 1> oversamplers;
    juce::dsp::DelayLine<float, juce::dsp::DelayLineInterpolationTypes::None> dryDelay { 1024 };
    juce::AudioBuffer<float> dryBuffer;
    int currentStage = -1;

    std::atomic<float>* inGainParam   = nullptr;
    std::atomic<float>* ceilingParam  = nullptr;
    std::atomic<float>* outGainParam  = nullptr;
    std::atomic<float>* mixParam      = nullptr;
    std::atomic<float>* modeParam     = nullptr;
    std::atomic<float>* osParam       = nullptr;
    std::atomic<float>* deltaParam    = nullptr;

    juce::SmoothedValue<float> inGainSmoothed, outGainSmoothed, mixSmoothed;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (MozClipProcessor)
};
