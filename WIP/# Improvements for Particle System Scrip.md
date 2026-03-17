Repetitive code:
Multiple instances of setting slider ranges and properties follow the same pattern. Create a helper function like configureSlider(slider, min, max, defaultValue) to reduce repetition.
The color conversion functions (rgbToHex, rgbToHsb, hsbToRgb) could be organized into a color utility object.
There's repetitive code for creating UI elements with similar properties - a UI builder function could be created.
Redundant code:
The repeated systemDropdown.removeAll() and repopulation logic could be extracted into a refreshSystemDropdown() function.
The shape type checking (if (shapeType === "Rectangle"), etc.) appears in multiple places and could be refactored using a strategy pattern or lookup table.
The var sliderProperty = X.property("Slider") pattern is repeated multiple times unnecessarily.
Code organization improvements:
Group related functions together (color utilities, UI handling, particle system creation, etc.)
The color picker implementation is quite large and could be moved to a separate file or module.
Verbose comments:
Many comments simply restate what the code does (e.g., "// Function to show a color picker dialog and return the chosen color"). These can be shortened or removed.
Some comments like "// Add the new Active Particles control at the top for visibility" could be more concise.
Performance optimization:
In loops like findExistingParticleSystems, caching the layer count (var count = comp.numLayers) would be more efficient than repeatedly calling comp.numLayers.