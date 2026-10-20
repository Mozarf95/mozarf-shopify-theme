# MozClip

Clipper VST3 / Standalone écrit avec JUCE : 4 courbes (Soft, Classic, Modern, Hard),
suréchantillonnage 1x–8x, ceiling, gain d'entrée/sortie, mix parallèle et mode Delta.

## Compiler (débutant)

### Windows
1. Installer [Visual Studio Community](https://visualstudio.microsoft.com/) avec la charge de travail « Développement Desktop en C++ ».
2. Installer [CMake](https://cmake.org/download/) (cocher « Add to PATH »).
3. Dans un terminal, depuis ce dossier :
   ```
   cmake -B build
   cmake --build build --config Release
   ```
4. Le `.vst3` est copié automatiquement dans `C:\Program Files\Common Files\VST3`.

### macOS
1. `xcode-select --install` et `brew install cmake`
2. ```
   cmake -B build
   cmake --build build --config Release
   ```
3. Le plugin est copié dans `~/Library/Audio/Plug-Ins/VST3`.

La première configuration télécharge JUCE (internet requis). Une version Standalone est aussi
générée dans `build/MozClip_artefacts/Release/Standalone` pour tester sans DAW.
