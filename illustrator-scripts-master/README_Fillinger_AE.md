# Fillinger AE - Advanced Layer Filling Tool for After Effects

An enhanced After Effects script based on the original Illustrator Fillinger by A Jongware Script and Alexander Ladygin. This version brings advanced layer filling capabilities to After Effects with significant improvements and AE-specific features.

## Features

### Core Functionality
- **Smart Layer Filling**: Fill shape layers with duplicated objects using intelligent placement algorithms
- **Advanced Triangulation**: Uses adapted triangulation algorithms for optimal space utilization
- **Collision Detection**: Prevents object overlap with configurable minimum distances
- **Size Optimization**: Multiple size steps for efficient space filling

### Improved Layer Selection
- **Multi-type Support**: Works with Shape layers, Solids, Text layers, and Precomps
- **Filter System**: Show/hide different layer types for easier selection
- **Multi-selection**: Select multiple fill objects with Ctrl/Cmd+click
- **Auto-refresh**: Dynamic layer list updates
- **Quick Selection**: "Add Selected" button for current layer selection

### After Effects Specific Features
- **Animation Support**: 
  - Static positioning
  - Floating animation with expressions
  - Orbital motion patterns
  - Animated rotation with keyframes
- **Expression Integration**: Automatic expression generation for ongoing randomization
- **Null Parent System**: Optional null object creation for easier animation control
- **Undo Integration**: Full undo group support

### Advanced UI
- **Real-time Preview**: Visual preview system with red dots showing placement
- **Progress Tracking**: Progress bar for generation process
- **Slider Controls**: Synchronized sliders and text inputs for precise control
- **Settings Persistence**: Save and load custom presets
- **Tooltips**: Comprehensive help system
- **Input Validation**: Prevents invalid configurations

## Installation

1. Copy `fillinger_ae.jsx` to your After Effects Scripts folder:
   - **Windows**: `C:\Program Files\Adobe\Adobe After Effects [version]\Support Files\Scripts\`
   - **macOS**: `/Applications/Adobe After Effects [version]/Scripts/`

2. Restart After Effects

3. Access via: `File > Scripts > fillinger_ae.jsx`

## Usage

### Basic Workflow

1. **Open a Composition**: Select an active composition in After Effects
2. **Create Container**: Create a shape layer that will serve as the container/boundary
3. **Create Fill Objects**: Create layers that will be duplicated and placed inside the container
4. **Run Script**: Execute the script from the Scripts menu

### Step-by-Step Guide

1. **Select Container Layer**:
   - Choose a shape layer from the dropdown
   - Only shape layers with valid paths are shown

2. **Choose Fill Objects**:
   - Use the filter checkboxes to show desired layer types
   - Select one or more layers from the list (multi-select with Ctrl/Cmd+click)
   - Use "Add Selected" to quickly add currently selected layers

3. **Configure Size & Distribution**:
   - **Min/Max Size**: Set size range as percentage of container size
   - **Min Distance**: Minimum spacing between objects (pixels)
   - **Scale Factor**: Overall scaling percentage for all objects
   - **Density**: Controls filling intensity (10-100%)

4. **Set Animation Behavior**:
   - **Rotation**: Random, fixed angle, or animated over time
   - **Position**: Static, floating animation, or orbital motion
   - **Expressions**: Add expressions for continued randomization
   - **Null Parents**: Create null objects for easier animation control

5. **Preview and Generate**:
   - Use "Toggle Preview" to see approximate placement
   - Adjust settings as needed
   - Click "Generate" to create the final result

### Advanced Features

#### Animation Options
- **Random Rotation**: Each object gets a random rotation value
- **Fixed Rotation**: All objects rotate by the same specified angle
- **Animated Rotation**: Objects rotate over the composition duration
- **Floating Animation**: Subtle sine/cosine wave movement
- **Orbital Motion**: Objects orbit around their placement points

#### Expression Examples
The script automatically generates expressions like:
```javascript
// Floating animation
value + [Math.sin(time * 2) * 5, Math.cos(time * 1.5) * 3];

// Orbital motion  
center = [centerX, centerY];
radius = objectRadius;
angle = time * 30;
center + [Math.cos(degreesToRadians(angle)) * radius, Math.sin(degreesToRadians(angle)) * radius];

// Random rotation variation
value + Math.sin(time * random(0.5, 2)) * random(5, 15);
```

## Settings

### Persistence
- Settings are automatically saved when closing the window
- Use "Save Settings" / "Load Settings" for manual control
- Settings stored in: `User/AE_Scripts/Fillinger AE_settings.json`

### Default Values
- Min Size: 5%
- Max Size: 15%
- Min Distance: 5px
- Scale Factor: 100%
- Density: 50%
- Random Rotation: Enabled
- Random Selection: Enabled

## Technical Details

### Algorithm Improvements
- **Simplified Triangulation**: Optimized for After Effects path structure
- **Point-in-Polygon**: Ray casting algorithm for accurate boundary detection
- **Distance Calculations**: Efficient edge distance computation
- **Size Stepping**: Logarithmic size reduction for optimal filling

### Performance Optimizations
- **Preview Limiting**: Maximum 50 preview objects for responsiveness
- **Batch Operations**: Efficient layer creation and manipulation
- **Memory Management**: Proper cleanup of temporary objects
- **Progress Feedback**: Non-blocking UI updates during generation

### Compatibility
- **After Effects**: CC 2019 and later recommended
- **Operating Systems**: Windows and macOS
- **Script Engine**: ExtendScript compatible

## Troubleshooting

### Common Issues

1. **"Could not extract path from selected container layer"**
   - Ensure the container is a shape layer with a valid path
   - Try creating a simple rectangle or ellipse shape

2. **No objects generated**
   - Check if min/max size values are appropriate
   - Increase density setting
   - Verify fill objects are properly selected

3. **Objects appear outside container**
   - This may occur with complex shapes
   - Try simplifying the container path
   - Adjust min distance settings

4. **Script doesn't appear in menu**
   - Verify script is in correct Scripts folder
   - Restart After Effects completely
   - Check file permissions

### Performance Tips
- Use lower density for initial testing
- Limit preview to avoid slowdown
- Consider container complexity vs. performance
- Use expressions sparingly for large object counts

## Improvements Over Original

### Enhanced UI
- Modern, organized interface with panels and groups
- Real-time preview system
- Progress indication
- Comprehensive tooltips and help

### Better Layer Management
- Multi-type layer support beyond just paths
- Advanced filtering and selection
- Automatic layer organization
- Null parent system for animation

### After Effects Integration
- Native AE coordinate system support
- Expression integration
- Keyframe animation support
- Undo system integration

### Algorithm Enhancements
- Improved space utilization
- Better collision detection
- Optimized for AE performance
- Simplified triangulation for paths

## Future Enhancements

Potential improvements for future versions:
- Support for mask paths as containers
- 3D layer support
- Custom distribution patterns
- Batch processing multiple compositions
- Integration with third-party plugins

## Credits

- **Original Concept**: A Jongware Script (Circle fill)
- **Original Enhancement**: Alexander Ladygin (www.ladyginpro.ru)
- **After Effects Adaptation**: AI Assistant
- **Triangulation Algorithm**: Based on original Illustrator implementation
- **UI Framework**: Adobe ExtendScript ScriptUI

## License

This script builds upon the original work and maintains the same open-source spirit. Use freely for personal and commercial projects.

---

*For support and updates, please refer to the original Illustrator script documentation and After Effects scripting resources.*
