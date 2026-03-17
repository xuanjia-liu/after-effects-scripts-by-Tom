# Shape Particle System Extension

A CEP extension for Adobe After Effects that creates dynamic shape layer particle systems with advanced physics controls.

## Features

- Create shape layer-based particle systems with customizable appearance and behavior
- Use control layers to easily manipulate emitter position and parameters
- Apply physics parameters including velocity, gravity, and resistance
- Control particle lifecycle with fading, color transitions, and more
- Save and load settings from existing particle systems

## Installation

### Developer Mode (Easiest for Testing)

1. Enable CEP extension loading in developer mode:
   - **macOS**: Create or edit the file: `~/Library/Preferences/com.adobe.CSXS.10.plist` and add:
     ```xml
     <?xml version="1.0" encoding="UTF-8"?>
     <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
     <plist version="1.0">
     <dict>
         <key>PlayerDebugMode</key>
         <string>1</string>
     </dict>
     </plist>
     ```
   - **Windows**: Create a registry key `HKEY_CURRENT_USER/Software/Adobe/CSXS.10` with String value `PlayerDebugMode` set to `1`

2. Copy the extension folder to the CEP extensions directory:
   - **macOS**: `~/Library/Application Support/Adobe/CEP/extensions/`
   - **Windows**: `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\`

3. Launch After Effects and find the extension under Window > Extensions > Shape Particle System

### Package for Distribution

To create a ZXP package for distribution:
1. Use Adobe's ZXPSignCmd tool to sign the extension
2. Users will need to use an extension manager like Anastasiy's Extension Manager to install the ZXP

## Usage

1. Open After Effects and a composition
2. Launch the extension from Window > Extensions > Shape Particle System
3. Set the desired number of particles
4. Click "Create Particle System" to generate the particles

Two layers will be created:
- **Shape Particles**: The shape layer containing the actual particles
- **SP-ctrl**: A guide layer with controls for adjusting particle behavior

## Parameters

The control layer includes many parameters that can be adjusted or keyframed:

- **Active Particles**: Set how many particles to display (for performance optimization)
- **Position/Color Offset**: Control the timing spread of particles
- **Fade In/Out Distance**: Control how particles fade in/out based on travel distance
- **Emitter Width/Height**: Create an area emitter instead of a point emitter
- **Particle Lifetime**: How long each particle lives before resetting
- **Velocity/Direction**: Control initial particle movement
- **Gravity/Resistance**: Apply forces to particles over time
- **Color and Opacity**: Control particle appearance and transparency

## License

© 2023 Your Name. All rights reserved. 