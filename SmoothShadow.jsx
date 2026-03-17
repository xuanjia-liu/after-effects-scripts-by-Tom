// Multi-Shadow Generator for After Effects
// Based on shadows.brumm.af algorithm
// Enhanced version with presets, performance improvements, and light source control

(function() {
    // Check if a project is open
    if (!app.project) {
        alert("Please open a project first.");
        return;
    }
    
    // Check if a comp is active
    if (!app.project.activeItem || !(app.project.activeItem instanceof CompItem)) {
        alert("Please select a composition.");
        return;
    }
    
    // No initial check for selected layers - we'll handle this in the UI
    
    var comp = app.project.activeItem;
    // We'll make this a function to allow refreshing the selection
    function getSelectedLayers() {
        return comp.selectedLayers;
    }
    var selectedLayers = getSelectedLayers();
    
    // Function to read existing shadow settings from a layer
    function readExistingShadowSettings() {
        try {
            var layers = getSelectedLayers();
            if (layers.length === 0) return null;
            
            // Look for the first layer with drop shadow effects
            for (var i = 0; i < layers.length; i++) {
                var layer = layers[i];
                var shadowEffects = [];
                
                // Find all drop shadow effects on this layer
                for (var j = 1; j <= layer.Effects.numProperties; j++) {
                    var effect = layer.Effects.property(j);
                    if (effect.matchName === "ADBE Drop Shadow") {
                        shadowEffects.push(effect);
                    }
                }
                
                if (shadowEffects.length > 0) {
                    // Get settings from the first shadow effect
                    var firstShadow = shadowEffects[0];
                    var lastShadow = shadowEffects[shadowEffects.length - 1];
                    
                    // Get shadow color - ensure it's in the right format
                    // Color in AE is stored as [r, g, b, 0] where rgb are 0-1 values
                    var shadowColorValue = firstShadow.property("Shadow Color").value;
                    
                    var settings = {
                        color: [shadowColorValue[0], shadowColorValue[1], shadowColorValue[2]],
                        opacity: lastShadow.property("Opacity").value / 100, // Convert from percentage
                        direction: lastShadow.property("Direction").value,
                        distance: lastShadow.property("Distance").value,
                        softness: lastShadow.property("Softness").value,
                        layers: shadowEffects.length,
                        // Try to determine if reverse alpha is being used
                        reverse: shadowEffects.length > 1 ? 
                            (shadowEffects[0].property("Opacity").value > 
                             shadowEffects[shadowEffects.length-1].property("Opacity").value) : false
                    };
                    
                    return settings;
                }
            }
            
            return null;
        } catch (e) {
            // Silent fail - don't log in production
            return null;
        }
    }
    
    // Read existing shadow settings if available
    var existingSettings = readExistingShadowSettings();
    
    // Utility functions for color conversion
    function hexToRgb(hex) {
        hex = hex.replace(/^#/, '');
        var shorthandRegex = /^([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });
        var result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255
        ] : [0, 0, 0];
    }

    function rgbToHex(rgb) {
        function componentToHex(c) {
            var hex = Math.round(c * 255).toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        }
        return "#" + componentToHex(rgb[0]) + componentToHex(rgb[1]) + componentToHex(rgb[2]);
    }

    function rgbToHsb(r, g, b) {
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, v = max;
        var d = max - min;
        s = max == 0 ? 0 : d / max;
        if (max == min) {
            h = 0;
        } else {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return [h * 360, s * 100, v * 100];
    }

    function hsbToRgb(h, s, b) {
        h /= 360;
        s /= 100;
        b /= 100;
        var r, g, bl;
        var i = Math.floor(h * 6);
        var f = h * 6 - i;
        var p = b * (1 - s);
        var q = b * (1 - f * s);
        var t = b * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: r = b, g = t, bl = p; break;
            case 1: r = q, g = b, bl = p; break;
            case 2: r = p, g = b, bl = t; break;
            case 3: r = p, g = q, bl = b; break;
            case 4: r = t, g = p, bl = b; break;
            case 5: r = b, g = p, bl = q; break;
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(bl * 255)];
    }
    
    // Bezier calculation for cubic ease
    function cubicBezier(p1x, p1y, p2x, p2y, t) {
        // Calculate cubic Bezier curve for given control points and t
        var cx = 3 * p1x;
        var bx = 3 * (p2x - p1x) - cx;
        var ax = 1 - cx - bx;
        
        var cy = 3 * p1y;
        var by = 3 * (p2y - p1y) - cy;
        var ay = 1 - cy - by;
        
        function sampleCurveX(t) {
            return ((ax * t + bx) * t + cx) * t;
        }
        
        function sampleCurveY(t) {
            return ((ay * t + by) * t + cy) * t;
        }
        
        function solveCurveX(x) {
            // Newton-Raphson iteration
            var t = x;
            for (var i = 0; i < 8; i++) {
                var currentX = sampleCurveX(t);
                if (Math.abs(currentX - x) < 0.001) {
                    return t;
                }
                var dx = (sampleCurveX(t + 0.001) - currentX) / 0.001;
                if (Math.abs(dx) < 0.0001) break;
                t = t - (currentX - x) / dx;
            }
            return t;
        }
        
        // Find t for given x, then return corresponding y
        if (t <= 0) return 0;
        if (t >= 1) return 1;
        return sampleCurveY(solveCurveX(t));
    }
    
    // Easing functions
    var easingFunctions = {
        "Cubic": function(t) {
            return cubicBezier(0.755, 0.05, 0.855, 0.06, t);
        },
        "Linear": function(t) {
            return t;
        },
        "Quad": function(t) {
            return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        },
        "Sine": function(t) {
            return -(Math.cos(Math.PI * t) - 1) / 2;
        },
        "Expo": function(t) {
            return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
        }
    };
    
    // Out InSine ease for opacity (0.05, 0.445, 0.95, 0.55)
    function outInSineEase(t) {
        return cubicBezier(0.05, 0.445, 0.95, 0.55, t);
    }
    
    // Define default presets
    var defaultPresets = {
        "Soft Drop": {
            layers: 5,
            opacity: 0.2,
            distance: 12,
            direction: 180,
            softness: 40,
            reverse: false,
            color: [0, 0, 0]
        },
        "Hard Drop": {
            layers: 3,
            opacity: 0.4,
            distance: 8,
            direction: 180,
            softness: 10,
            reverse: false,
            color: [0, 0, 0]
        },
        "Subtle Ambient": {
            layers: 8,
            opacity: 0.15,
            distance: 30,
            direction: 180,
            softness: 100,
            reverse: true,
            color: [0, 0, 0]
        },
        "Material Design": {
            layers: 4,
            opacity: 0.25,
            distance: 16,
            direction: 135,
            softness: 24,
            reverse: false,
            color: [0, 0, 0]
        },
        "Neon Glow": {
            layers: 6,
            opacity: 0.5,
            distance: 20,
            direction: 180,
            softness: 80,
            reverse: true,
            color: [0.83, 0.24, 0.97]
        }
    };
    
    // Setup file for saving presets
    var scriptFileName = "MultiShadowGeneratorPresets.json";
    var presetFile = new File(getPresetsFilePath());
    var presets = {};
    
    // Function to get the presets file path in user's preferences folder
    function getPresetsFilePath() {
        var prefsFolder;
        if ($.os.indexOf("Windows") !== -1) {
            // Windows
            prefsFolder = new Folder(Folder.userData.fsName + "/Adobe/After Effects/");
        } else {
            // macOS
            prefsFolder = new Folder(Folder.userData.fsName + "/Library/Preferences/Adobe/After Effects/");
        }
        
        // Create folder if it doesn't exist
        if (!prefsFolder.exists) {
            prefsFolder.create();
        }
        
        return prefsFolder.fsName + "/" + scriptFileName;
    }
    
    // Load presets from file
    function loadPresets() {
        if (presetFile.exists) {
            try {
                presetFile.open("r");
                var content = presetFile.read();
                presetFile.close();
                
                if (content) {
                    var loadedPresets = JSON.parse(content);
                    return loadedPresets;
                }
            } catch (e) {
                alert("Error loading presets: " + e.toString());
            }
        }
        // If file doesn't exist or there's an error, return the default presets
        return JSON.parse(JSON.stringify(defaultPresets)); // Deep copy default presets
    }
    
    // Save presets to file
    function savePresets() {
        try {
            presetFile.open("w");
            presetFile.write(JSON.stringify(presets, null, 2)); // Pretty print with 2-space indentation
            presetFile.close();
        } catch (e) {
            alert("Error saving presets: " + e.toString());
        }
    }
    
    // Load saved presets or use defaults
    presets = loadPresets();
    
    // Create UI
    var win = new Window("palette", "Multi-Shadow Generator with Light Source");
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 10;
    win.margins = 16;
    
    // Add preset dropdown
    var presetGroup = win.add("group");
    presetGroup.orientation = "row";
    presetGroup.alignChildren = ["left", "center"];
    presetGroup.add("statictext", undefined, "Preset:");
    var presetDropdown = presetGroup.add("dropdownlist", undefined, ["Custom"].concat(Object.keys(presets)));
    presetDropdown.selection = 0;
    presetDropdown.preferredSize.width = 150;
    
    // Add preset management buttons
    var presetButtonGroup = presetGroup.add("group");
    presetButtonGroup.orientation = "row";
    presetButtonGroup.alignChildren = ["left", "center"];
    var savePresetButton = presetButtonGroup.add("button", undefined, "Save");
    savePresetButton.preferredSize.width = 50;
    var deletePresetButton = presetButtonGroup.add("button", undefined, "Delete");
    deletePresetButton.preferredSize.width = 50;
    
    // Main Shadow Settings Group
    var shadowSettingsPanel = win.add("panel", undefined, "Shadow Settings");
    shadowSettingsPanel.orientation = "column";
    shadowSettingsPanel.alignChildren = ["fill", "top"];
    shadowSettingsPanel.spacing = 8;
    shadowSettingsPanel.margins = 12;
    
    // Shadow color
    var colorGroup = shadowSettingsPanel.add("group");
    colorGroup.orientation = "row";
    colorGroup.alignChildren = ["left", "center"];
    var colorLabel = colorGroup.add("statictext", undefined, "Color:");
    colorLabel.preferredSize.width = 60; // Set fixed width for label alignment
    
    // Create color display panel that will show the current color
    var colorDisplay = colorGroup.add("panel");
    colorDisplay.preferredSize = [60, 20];
    
    // Add a button for the color picker
    var colorPickerBtn = colorGroup.add("button", undefined, "Choose Color");
    colorPickerBtn.preferredSize.width = 90;
    
    // Add hex color display
    var hexColorText = colorGroup.add("statictext", undefined, "#000000");
    hexColorText.preferredSize.width = 60;
    
    // Direction
    var directionGroup = shadowSettingsPanel.add("group");
    directionGroup.orientation = "row";
    directionGroup.alignChildren = ["left", "center"];
    var directionLabel = directionGroup.add("statictext", undefined, "Direction:");
    directionLabel.preferredSize.width = 60; // Set fixed width for label alignment
    var directionSlider = directionGroup.add("slider", undefined, 180, 0, 360);
    directionSlider.preferredSize.width = 150;
    var directionText = directionGroup.add("statictext", undefined, "180°");
    directionText.preferredSize.width = 40;
    var directionInput = directionGroup.add("edittext", undefined, "180");
    directionInput.preferredSize.width = 50;
    
    // Distance
    var distanceGroup = shadowSettingsPanel.add("group");
    distanceGroup.orientation = "row";
    distanceGroup.alignChildren = ["left", "center"];
    var distanceLabel = distanceGroup.add("statictext", undefined, "Distance:");
    distanceLabel.preferredSize.width = 60; // Set fixed width for label alignment
    var distanceSlider = distanceGroup.add("slider", undefined, 24, 0, 1000);
    distanceSlider.preferredSize.width = 150;
    var distanceText = distanceGroup.add("statictext", undefined, "24px");
    distanceText.preferredSize.width = 40;
    var distanceInput = distanceGroup.add("edittext", undefined, "24");
    distanceInput.preferredSize.width = 50;
    
    // Number of layers
    var layersGroup = shadowSettingsPanel.add("group");
    layersGroup.orientation = "row";
    layersGroup.alignChildren = ["left", "center"];
    var layersLabel = layersGroup.add("statictext", undefined, "Layers:");
    layersLabel.preferredSize.width = 60; // Set fixed width for label alignment
    var layersSlider = layersGroup.add("slider", undefined, 6, 1, 100);
    layersSlider.preferredSize.width = 150;
    var layersText = layersGroup.add("statictext", undefined, "6");
    layersText.preferredSize.width = 40;
    var layersInput = layersGroup.add("edittext", undefined, "6");
    layersInput.preferredSize.width = 50;
    
    // Final opacity
    var opacityGroup = shadowSettingsPanel.add("group");
    opacityGroup.orientation = "row";
    opacityGroup.alignChildren = ["left", "center"];
    var opacityLabel = opacityGroup.add("statictext", undefined, "Opacity:");
    opacityLabel.preferredSize.width = 60; // Set fixed width for label alignment
    var opacitySlider = opacityGroup.add("slider", undefined, 0.2, 0, 2);
    opacitySlider.preferredSize.width = 150;
    var opacityText = opacityGroup.add("statictext", undefined, "20%");
    opacityText.preferredSize.width = 40;
    var opacityInput = opacityGroup.add("edittext", undefined, "20");
    opacityInput.preferredSize.width = 50;
    
    // Softness (blur)
    var softnessGroup = shadowSettingsPanel.add("group");
    softnessGroup.orientation = "row";
    softnessGroup.alignChildren = ["left", "center"];
    var softnessLabel = softnessGroup.add("statictext", undefined, "Blur:");
    softnessLabel.preferredSize.width = 60; // Set fixed width for label alignment
    var softnessSlider = softnessGroup.add("slider", undefined, 80, 0, 1000);
    softnessSlider.preferredSize.width = 150;
    var softnessText = softnessGroup.add("statictext", undefined, "80px");
    softnessText.preferredSize.width = 40;
    var softnessInput = softnessGroup.add("edittext", undefined, "80");
    softnessInput.preferredSize.width = 50;

    // Reverse alpha checkbox
    var reverseAlphaCheckbox = shadowSettingsPanel.add("checkbox", undefined, "Reverse alpha (higher opacity for smaller shadows)");
    
    // Add easing type dropdown
    var easingGroup = shadowSettingsPanel.add("group");
    easingGroup.orientation = "row";
    easingGroup.alignChildren = ["left", "center"];
    easingGroup.add("statictext", undefined, "Easing:");
    var easingDropdown = easingGroup.add("dropdownlist", undefined, ["Cubic", "Linear", "Quad", "Sine", "Expo"]);
    easingDropdown.selection = 0;
    easingDropdown.preferredSize.width = 150;
    
    // Apply button at the bottom of shadow settings
    var shadowApplyGroup = shadowSettingsPanel.add("group");
    shadowApplyGroup.orientation = "row";
    shadowApplyGroup.alignChildren = ["center", "center"];
    shadowApplyGroup.alignment = ["center", "bottom"];
    var applyButton = shadowApplyGroup.add("button", undefined, "Re-enable Fixed Shadow", {name: "ok"});
    applyButton.preferredSize.width = 180;
    
    // Light Source Control panel
    var lightSourcePanel = win.add("panel", undefined, "Light Source Control");
    lightSourcePanel.orientation = "column";
    lightSourcePanel.alignChildren = ["left", "top"];
    lightSourcePanel.margins = 10;
    
    // Create light source controls
    var lightSourceGroup = lightSourcePanel.add("group");
    lightSourceGroup.orientation = "row";
    lightSourceGroup.alignChildren = ["left", "center"];
    
    // Add create light source button
    var createLightSourceBtn = lightSourceGroup.add("button", undefined, "Create Light Source");
    createLightSourceBtn.preferredSize.width = 130;
    
    // Add use existing light source checkbox
    var useExistingLightSourceCheck = lightSourceGroup.add("checkbox", undefined, "Use existing light source");
    useExistingLightSourceCheck.value = false;
    
    // Update UI with any existing shadow settings found
    if (existingSettings) {
        try {
            // Update color - create a clean RGB array
            var colorArray = existingSettings.color;
            updateColorDisplay(colorArray);
            
            // Update settings from existing shadows
            directionSlider.value = existingSettings.direction;
            directionText.text = Math.round(existingSettings.direction) + "°";
            directionInput.text = Math.round(existingSettings.direction);
            
            distanceSlider.value = existingSettings.distance;
            distanceText.text = Math.round(existingSettings.distance) + "px";
            distanceInput.text = Math.round(existingSettings.distance);
            
            layersSlider.value = existingSettings.layers;
            layersText.text = existingSettings.layers;
            layersInput.text = existingSettings.layers;
            
            opacitySlider.value = existingSettings.opacity;
            opacityText.text = Math.round(existingSettings.opacity * 100) + "%";
            opacityInput.text = Math.round(existingSettings.opacity * 100);
            
            softnessSlider.value = existingSettings.softness;
            softnessText.text = Math.round(existingSettings.softness) + "px";
            softnessInput.text = Math.round(existingSettings.softness);
            
            // Update checkbox
            reverseAlphaCheckbox.value = existingSettings.reverse;
        } catch (e) {
            // Silent fail in production
        }
    }
    
    // Live preview functionality - now the only way to apply effects
    var previewEffects = {}; // Change to object to track effects per layer
    var autoApplyActive = true; // Auto-apply is always on
    var previewNull = null; // Reference to preview light source null
    
    // Initialize the current color
    var currentColor = [0, 0, 0]; // Default black
    
    // Function to update the color display
    function updateColorDisplay(color) {
        colorDisplay.graphics.backgroundColor = colorDisplay.graphics.newBrush(
            colorDisplay.graphics.BrushType.SOLID_COLOR, color);
        currentColor = color;
        hexColorText.text = rgbToHex(color);
    }
    
    // Set the initial color display
    updateColorDisplay(currentColor);
    
    // Function to create a light source null object
    function createLightSourceNull(comp, selectedLayers, settings) {
        // Create a new null object
        var lightNull = comp.layers.addNull();
        lightNull.name = "Light Source";
        
        // Position the null at a reasonable location relative to selected layers
        var centerX = 0, centerY = 0, count = 0;
        
        // Calculate average position of selected layers
        for (var i = 0; i < selectedLayers.length; i++) {
            var layer = selectedLayers[i];
            var layerPos = layer.transform.position.value;
            centerX += layerPos[0];
            centerY += layerPos[1];
            count++;
        }
        
        if (count > 0) {
            centerX /= count;
            centerY /= count;
        } else {
            // Default to composition center if no layers selected
            centerX = comp.width / 2;
            centerY = comp.height / 2;
        }
        
        // Calculate radians from direction for positioning
        var radians = (settings.direction * Math.PI) / 180;
        
        // Position light source based on the direction and distance
        // We invert the direction to make it intuitive (light comes from direction)
        var offsetX = Math.cos(radians) * settings.distance * -3; // Multiply by 3 for better visibility
        var offsetY = Math.sin(radians) * settings.distance * -3;
        
        lightNull.transform.position.setValue([centerX + offsetX, centerY + offsetY, 0]);
        
        // Add expression controls for shadow settings
        var shadowOpacity = lightNull.Effects.addProperty("ADBE Slider Control");
        shadowOpacity.name = "Shadow Opacity";
        shadowOpacity.property("Slider").setValue(settings.opacity * 100); // Convert to percentage
        
        var shadowLayers = lightNull.Effects.addProperty("ADBE Slider Control");
        shadowLayers.name = "Shadow Layers";
        shadowLayers.property("Slider").setValue(settings.layers);
        
        var shadowDistance = lightNull.Effects.addProperty("ADBE Slider Control");
        shadowDistance.name = "Shadow Distance Factor";
        shadowDistance.property("Slider").setValue(100); // Default 100%
        
        var shadowSoftness = lightNull.Effects.addProperty("ADBE Slider Control");
        shadowSoftness.name = "Shadow Softness";
        shadowSoftness.property("Slider").setValue(settings.softness);
        
        var shadowColor = lightNull.Effects.addProperty("ADBE Color Control");
        shadowColor.name = "Shadow Color";
        shadowColor.property("Color").setValue([settings.color[0], settings.color[1], settings.color[2], 1]);
        
        var reverseAlpha = lightNull.Effects.addProperty("ADBE Checkbox Control");
        reverseAlpha.name = "Reverse Alpha";
        reverseAlpha.property("Checkbox").setValue(settings.reverse ? 1 : 0);
        
        // Add a description to the null to help users
        lightNull.comment = "Move this null to control shadow direction and distance. Adjust Effect Controls to modify shadow properties.";
        
        return lightNull;
    }
    
    function clearPreview() {
        // Remove any preview effects
        try {
            for (var layerId in previewEffects) {
                var effectsArray = previewEffects[layerId];
                for (var i = 0; i < effectsArray.length; i++) {
                    if (effectsArray[i] && effectsArray[i].parentProperty) {
                        effectsArray[i].remove();
                    }
                }
            }
            
            // Remove preview null if it exists
            if (previewNull && previewNull.containingComp) {
                previewNull.remove();
                previewNull = null;
            }
        } catch (e) {
            // Silent fail on cleanup errors
        }
        previewEffects = {}; // Reset to empty object
    }
    
    // Function to find an existing light source null
    function findExistingLightSource() {
        for (var i = 1; i <= comp.layers.length; i++) {
            var layer = comp.layers[i];
            // Check if it's a null layer (After Effects doesn't have a NullObject type but null layers have AVLayer type)
            if (layer.name.indexOf("Light Source") !== -1 && layer instanceof AVLayer && layer.nullLayer === true) {
                // Check if it has the required effects
                try {
                    if (layer.effect("Shadow Opacity") && 
                        layer.effect("Shadow Layers") && 
                        layer.effect("Shadow Distance Factor") && 
                        layer.effect("Shadow Softness") && 
                        layer.effect("Shadow Color") && 
                        layer.effect("Reverse Alpha")) {
                        return layer;
                    }
                } catch (e) {
                    // Skip this layer if effects are missing
                    continue;
                }
            }
        }
        return null;
    }
    
    function updatePreview() {
        // Auto-apply is always on now
        
        try {
            // Clear previous preview
            clearPreview();
            
            // Get current settings
            var layers = Math.round(layersSlider.value);
            var finalOpacity = opacitySlider.value;
            var distance = distanceSlider.value;
            var direction = directionSlider.value;
            var softness = softnessSlider.value;
            var reverseAlpha = reverseAlphaCheckbox.value;
            var shadowColor = currentColor;
            var easingType = easingDropdown.selection.text;
            
            // Create settings object
            var settings = {
                layers: layers,
                opacity: finalOpacity,
                distance: distance,
                direction: direction,
                softness: softness,
                reverse: reverseAlpha,
                color: shadowColor,
                easingType: easingType
            };
            
            // Get current selection
            var currentLayers = getSelectedLayers();
            
            // Apply preview to all selected layers
            if (currentLayers.length > 0) {
                // Check if should use existing light source
                if (useExistingLightSourceCheck.value) {
                    // Find existing light source
                    var existingLightSource = findExistingLightSource();
                    
                    if (existingLightSource) {
                        // Apply shadows with existing light source to each layer
                        for (var i = 0; i < currentLayers.length; i++) {
                            var targetLayer = currentLayers[i];
                            if (targetLayer.containingComp) {
                                // Remove existing drop shadow effects
                                removeDropShadowEffects(targetLayer);
                                
                                // Apply with existing light source
                                applyMultiShadowWithLightSource(targetLayer, existingLightSource, settings);
                            }
                        }
                    } else {
                        // No existing light source found, revert to standard shadow method
                        alert("No existing light source found. Using standard shadows instead.");
                        useExistingLightSourceCheck.value = false;
                        
                        // Use the original method (without light source)
                        for (var i = 0; i < currentLayers.length; i++) {
                            var targetLayer = currentLayers[i];
                            if (targetLayer.containingComp) {
                                // First, remove any regular (non-preview) drop shadow effects on the layer
                                removeDropShadowEffects(targetLayer);
                                
                                // Now apply preview shadows
                                applyMultiShadow(targetLayer, layers, finalOpacity, distance, direction, softness, 
                                                reverseAlpha, shadowColor, easingType, true);
                            }
                        }
                    }
                } else {
                    // Use the original method (without light source)
                    for (var i = 0; i < currentLayers.length; i++) {
                        var targetLayer = currentLayers[i];
                        if (targetLayer.containingComp) {
                            // First, remove any regular (non-preview) drop shadow effects on the layer
                            removeDropShadowEffects(targetLayer);
                            
                            // Now apply preview shadows
                            applyMultiShadow(targetLayer, layers, finalOpacity, distance, direction, softness, 
                                            reverseAlpha, shadowColor, easingType, true);
                        }
                    }
                }
            }
        } catch (e) {
            // Silently fail on preview errors - don't show alert dialogs during preview
            clearPreview();
        }
    }
    
    // Function to remove all drop shadow effects from a layer
    function removeDropShadowEffects(layer) {
        // Count backwards to avoid index shifting issues when removing effects
        for (var i = layer.Effects.numProperties; i > 0; i--) {
            var effect = layer.Effects.property(i);
            if (effect.matchName === "ADBE Drop Shadow") {
                effect.remove();
            }
        }
    }
    
    // Function to apply multi-shadow to a layer
    function applyMultiShadow(layer, shadowLayers, finalOpacity, distance, direction, softness, 
                             reverseAlpha, shadowColor, easingType, isPreview) {
        try {
            // Skip null layers
            if (layer.nullLayer) {
                return false;
            }
            
            var layerId = layer.index.toString(); // Use layer index as unique identifier
            
            // Remove existing drop shadow effects if not in preview mode
            if (!isPreview) {
                removeDropShadowEffects(layer);
            } 
            // For preview mode, remove previous preview effects for this layer only
            else if (previewEffects[layerId]) {
                var effectsArray = previewEffects[layerId];
                for (var i = 0; i < effectsArray.length; i++) {
                    if (effectsArray[i] && effectsArray[i].parentProperty) {
                        effectsArray[i].remove();
                    }
                }
                delete previewEffects[layerId];
            }
            
            // Initialize effects array for this layer if in preview mode
            if (isPreview) {
                previewEffects[layerId] = [];
            }
            
            // Convert direction to radians
            var radians = (direction * Math.PI) / 180;
            
            // Get appropriate easing function
            var easingFunction = easingFunctions[easingType];
            
            // Apply multiple shadows
            for (var i = 0; i < shadowLayers; i++) {
                // Calculate position on scale (0 to 1)
                var t = i / (shadowLayers - 1 || 1);
                
                // Apply selected easing for sizes
                var sizeScale = easingFunction(t);
                
                // Apply size based on easing scale
                var currentDistance = distance * sizeScale;
                var currentSoftness = softness * sizeScale;
                
                // Calculate x and y from angle and distance
                var xOffset = Math.cos(radians) * currentDistance;
                var yOffset = Math.sin(radians) * currentDistance;
                
                // Apply Out InSine ease for opacity
                var transparencyScale = outInSineEase(t);
                var currentOpacity;
                if (reverseAlpha) {
                    // Higher opacity for smaller shadows
                    currentOpacity = finalOpacity * (1 - transparencyScale) + 0.015;
                } else {
                    // Higher opacity for larger shadows
                    currentOpacity = finalOpacity * transparencyScale + 0.015;
                }
                
                // Create a descriptive name for each shadow
                var effectName = "Drop Shadow " + (i + 1) + " of " + shadowLayers;
                
                // Apply drop shadow effect
                var dropShadow = layer.Effects.addProperty("ADBE Drop Shadow");
                
                // Set shadow properties
                dropShadow.property("Shadow Color").setValue(shadowColor);
                dropShadow.property("Opacity").setValue(currentOpacity * 100); // AE uses percentage
                dropShadow.property("Direction").setValue(direction);
                dropShadow.property("Distance").setValue(currentDistance);
                dropShadow.property("Softness").setValue(currentSoftness);
                
                // Rename the effect for better organization
                dropShadow.name = effectName;
                
                // Store reference for preview cleanup
                if (isPreview) {
                    previewEffects[layerId].push(dropShadow);
                }
            }
            
            return true;
        } catch (e) {
            if (!isPreview) {
                alert("Error applying shadows to " + layer.name + ": " + e.toString());
            }
            return false;
        }
    }
    
    // Function to apply multi-shadow with light source
    function applyMultiShadowWithLightSource(layer, lightNull, settings) {
        try {
            // Skip null layers
            if (layer.nullLayer) {
                return false;
            }
            
            var layerId = layer.index.toString(); // Use layer index as unique identifier
            
            // Remove existing drop shadow effects
            removeDropShadowEffects(layer);
            
            // Initialize effects array for this layer if in preview mode
            previewEffects[layerId] = [];
            
            // Get number of shadow layers from settings
            var shadowLayers = settings.layers;
            
            // Apply multiple shadows
            for (var i = 0; i < shadowLayers; i++) {
                // Calculate position on scale (0 to 1)
                var t = i / (shadowLayers - 1 || 1);
                
                // Create a descriptive name for each shadow
                var effectName = "Light Shadow " + (i + 1) + " of " + shadowLayers;
                
                // Apply drop shadow effect
                var dropShadow = layer.Effects.addProperty("ADBE Drop Shadow");
                dropShadow.name = effectName;
                
                // Set shadow properties with expressions
                // Shadow Color expression
                var colorExpression = 'thisComp.layer("' + lightNull.name + '").effect("Shadow Color")("Color");';
                dropShadow.property("Shadow Color").expression = colorExpression;
                
                // Opacity expression (includes easing calculation)
                var opacityExpression = 'var lightNull = thisComp.layer("' + lightNull.name + '");\n';
                opacityExpression += 'var finalOpacity = lightNull.effect("Shadow Opacity")("Slider") / 100;\n'; // Convert from percentage
                opacityExpression += 'var reverseAlpha = lightNull.effect("Reverse Alpha")("Checkbox") == 1;\n';
                opacityExpression += 'var t = ' + t.toFixed(6) + ';\n'; // Position on the scale
                
                // Add cubic Bezier function for easing
                opacityExpression += 'function cubicBezier(p1x, p1y, p2x, p2y, t) {\n';
                opacityExpression += '  if (t <= 0) return 0;\n';
                opacityExpression += '  if (t >= 1) return 1;\n';
                opacityExpression += '  var cx = 3 * p1x;\n';
                opacityExpression += '  var bx = 3 * (p2x - p1x) - cx;\n';
                opacityExpression += '  var ax = 1 - cx - bx;\n';
                opacityExpression += '  var cy = 3 * p1y;\n';
                opacityExpression += '  var by = 3 * (p2y - p1y) - cy;\n';
                opacityExpression += '  var ay = 1 - cy - by;\n';
                
                opacityExpression += '  function sampleCurveX(t) {\n';
                opacityExpression += '    return ((ax * t + bx) * t + cx) * t;\n';
                opacityExpression += '  }\n';
                
                opacityExpression += '  function sampleCurveY(t) {\n';
                opacityExpression += '    return ((ay * t + by) * t + cy) * t;\n';
                opacityExpression += '  }\n';
                
                opacityExpression += '  function solveCurveX(x) {\n';
                opacityExpression += '    var t = x;\n';
                opacityExpression += '    for (var i = 0; i < 8; i++) {\n';
                opacityExpression += '      var currentX = sampleCurveX(t);\n';
                opacityExpression += '      if (Math.abs(currentX - x) < 0.001) {\n';
                opacityExpression += '        return t;\n';
                opacityExpression += '      }\n';
                opacityExpression += '      var dx = (sampleCurveX(t + 0.001) - currentX) / 0.001;\n';
                opacityExpression += '      if (Math.abs(dx) < 0.0001) break;\n';
                opacityExpression += '      t = t - (currentX - x) / dx;\n';
                opacityExpression += '    }\n';
                opacityExpression += '    return t;\n';
                opacityExpression += '  }\n';
                
                opacityExpression += '  return sampleCurveY(solveCurveX(t));\n';
                opacityExpression += '}\n';
                
                // Using OutInSine easing for opacity (preserved from original)
                opacityExpression += 'var transparencyScale = cubicBezier(0.05, 0.445, 0.95, 0.55, t);\n';
                opacityExpression += 'var currentOpacity;\n';
                opacityExpression += 'if (reverseAlpha) {\n';
                opacityExpression += '    currentOpacity = finalOpacity * (1 - transparencyScale) + 0.015;\n';
                opacityExpression += '} else {\n';
                opacityExpression += '    currentOpacity = finalOpacity * transparencyScale + 0.015;\n';
                opacityExpression += '}\n';
                opacityExpression += 'currentOpacity * 100;'; // Convert to percentage for AE
                
                dropShadow.property("Opacity").expression = opacityExpression;
                
                // Direction expression based on light source position
                var directionExpression = 'var lightPos = thisComp.layer("' + lightNull.name + '").toWorld(thisComp.layer("' + lightNull.name + '").anchorPoint);\n';
                directionExpression += 'var thisLayerPos = toWorld(anchorPoint);\n';
                directionExpression += 'var diff = thisLayerPos - lightPos;\n';
                directionExpression += 'var angle = Math.atan2(diff[1], diff[0]) * 180 / Math.PI;\n';
                directionExpression += '// Add 90 degrees as directed\n';
                directionExpression += '(angle + 90) % 360;';
                
                dropShadow.property("Direction").expression = directionExpression;
                
                // Distance expression based on light source position and easing
                var distanceExpression = 'var lightNull = thisComp.layer("' + lightNull.name + '");\n';
                distanceExpression += 'var lightPos = lightNull.toWorld(lightNull.anchorPoint);\n';
                distanceExpression += 'var thisLayerPos = toWorld(anchorPoint);\n';
                distanceExpression += 'var diff = thisLayerPos - lightPos;\n';
                distanceExpression += 'var dist = length(diff);\n';
                distanceExpression += 'var distanceFactor = lightNull.effect("Shadow Distance Factor")("Slider") / 100;\n';
                distanceExpression += 'var t = ' + t.toFixed(6) + ';\n'; // Position on the scale
                
                // Add cubic Bezier function for easing
                distanceExpression += 'function cubicBezier(p1x, p1y, p2x, p2y, t) {\n';
                distanceExpression += '  if (t <= 0) return 0;\n';
                distanceExpression += '  if (t >= 1) return 1;\n';
                distanceExpression += '  var cx = 3 * p1x;\n';
                distanceExpression += '  var bx = 3 * (p2x - p1x) - cx;\n';
                distanceExpression += '  var ax = 1 - cx - bx;\n';
                distanceExpression += '  var cy = 3 * p1y;\n';
                distanceExpression += '  var by = 3 * (p2y - p1y) - cy;\n';
                distanceExpression += '  var ay = 1 - cy - by;\n';
                
                distanceExpression += '  function sampleCurveX(t) {\n';
                distanceExpression += '    return ((ax * t + bx) * t + cx) * t;\n';
                distanceExpression += '  }\n';
                
                distanceExpression += '  function sampleCurveY(t) {\n';
                distanceExpression += '    return ((ay * t + by) * t + cy) * t;\n';
                distanceExpression += '  }\n';
                
                distanceExpression += '  function solveCurveX(x) {\n';
                distanceExpression += '    var t = x;\n';
                distanceExpression += '    for (var i = 0; i < 8; i++) {\n';
                distanceExpression += '      var currentX = sampleCurveX(t);\n';
                distanceExpression += '      if (Math.abs(currentX - x) < 0.001) {\n';
                distanceExpression += '        return t;\n';
                distanceExpression += '      }\n';
                distanceExpression += '      var dx = (sampleCurveX(t + 0.001) - currentX) / 0.001;\n';
                distanceExpression += '      if (Math.abs(dx) < 0.0001) break;\n';
                distanceExpression += '      t = t - (currentX - x) / dx;\n';
                distanceExpression += '    }\n';
                distanceExpression += '    return t;\n';
                distanceExpression += '  }\n';
                
                distanceExpression += '  return sampleCurveY(solveCurveX(t));\n';
                distanceExpression += '}\n';
                
                // Always use Cubic easing for distance regardless of dropdown selection
                distanceExpression += 'var sizeScale = cubicBezier(0.755, 0.05, 0.855, 0.06, t);\n';
                distanceExpression += 'dist * sizeScale * distanceFactor / 6;'; // Scale down distance for better control
                
                dropShadow.property("Distance").expression = distanceExpression;
                
                // Softness expression
                var softnessExpression = 'var lightNull = thisComp.layer("' + lightNull.name + '");\n';
                softnessExpression += 'var softnessFactor = lightNull.effect("Shadow Softness")("Slider");\n';
                softnessExpression += 'var t = ' + t.toFixed(6) + ';\n'; // Position on the scale
                
                // Add cubic Bezier function for easing (if not already added in distance expression)
                softnessExpression += 'function cubicBezier(p1x, p1y, p2x, p2y, t) {\n';
                softnessExpression += '  if (t <= 0) return 0;\n';
                softnessExpression += '  if (t >= 1) return 1;\n';
                softnessExpression += '  var cx = 3 * p1x;\n';
                softnessExpression += '  var bx = 3 * (p2x - p1x) - cx;\n';
                softnessExpression += '  var ax = 1 - cx - bx;\n';
                softnessExpression += '  var cy = 3 * p1y;\n';
                softnessExpression += '  var by = 3 * (p2y - p1y) - cy;\n';
                softnessExpression += '  var ay = 1 - cy - by;\n';
                
                softnessExpression += '  function sampleCurveX(t) {\n';
                softnessExpression += '    return ((ax * t + bx) * t + cx) * t;\n';
                softnessExpression += '  }\n';
                
                softnessExpression += '  function sampleCurveY(t) {\n';
                softnessExpression += '    return ((ay * t + by) * t + cy) * t;\n';
                softnessExpression += '  }\n';
                
                softnessExpression += '  function solveCurveX(x) {\n';
                softnessExpression += '    var t = x;\n';
                softnessExpression += '    for (var i = 0; i < 8; i++) {\n';
                softnessExpression += '      var currentX = sampleCurveX(t);\n';
                softnessExpression += '      if (Math.abs(currentX - x) < 0.001) {\n';
                softnessExpression += '        return t;\n';
                softnessExpression += '      }\n';
                softnessExpression += '      var dx = (sampleCurveX(t + 0.001) - currentX) / 0.001;\n';
                softnessExpression += '      if (Math.abs(dx) < 0.0001) break;\n';
                softnessExpression += '      t = t - (currentX - x) / dx;\n';
                softnessExpression += '    }\n';
                softnessExpression += '    return t;\n';
                softnessExpression += '  }\n';
                
                softnessExpression += '  return sampleCurveY(solveCurveX(t));\n';
                softnessExpression += '}\n';
                
                // Always use Cubic easing for softness
                softnessExpression += 'var sizeScale = cubicBezier(0.755, 0.05, 0.855, 0.06, t);\n';
                softnessExpression += 'softnessFactor * sizeScale;';
                
                dropShadow.property("Softness").expression = softnessExpression;
                
                // Store reference for preview cleanup
                previewEffects[layerId].push(dropShadow);
            }
            
            return true;
        } catch (e) {
            alert("Error applying shadows to " + layer.name + ": " + e.toString());
            return false;
        }
    }
    
    // Function to open the color picker dialog
    function openColorPicker() {
        // Open enhanced color picker
        var dialog = new Window("dialog", "Choose Shadow Color", undefined, { resizeable: true });
        dialog.orientation = "column";
        dialog.spacing = 8;
        dialog.margins = 10;
        
        // Color buttons row
        var colorGroup = dialog.add("group");
        colorGroup.orientation = "row";
        colorGroup.alignChildren = "center";
        colorGroup.spacing = 2;
        
        var colorButtonSettings = [
            { label: "🔴", color: "#FF0000" }, { label: "🟠", color: "#FFA500" },
            { label: "🟡", color: "#FFFF00" }, { label: "🟢", color: "#00FF00" },
            { label: "🔵", color: "#0000FF" }, { label: "🟣", color: "#800080" },
            { label: "⚫️", color: "#000000" }, { label: "⚪️", color: "#FFFFFF" },
            { label: "🟤", color: "#803f02" }, { label: "⬛️", color: "#808080" }
        ];
        
        for (var i = 0; i < colorButtonSettings.length; i++) {
            var settings = colorButtonSettings[i];
            var button = colorGroup.add("button", undefined, settings.label);
            button.preferredSize = [25, 25];
            button.onClick = (function(color) {
                return function() {
                    var rgbColor = hexToRgb(color);
                    updateColorDisplay(rgbColor);
                    dialog.close();
                    presetDropdown.selection = 0; // Set to Custom
                    useExistingLightSourceCheck.value = false; // Turn off light source when color changes
                    app.beginUndoGroup("Change Shadow Color");
                    updatePreview();
                    app.endUndoGroup();
                };
            })(settings.color);
        }
        
        // Main Split Group
        var mainSplitGroup = dialog.add("group");
        mainSplitGroup.orientation = "row";
        mainSplitGroup.alignChildren = ["top", "fill"];
        mainSplitGroup.spacing = 10;
        
        // Left Side: Color Preview
        var previewGroup = mainSplitGroup.add("group");
        previewGroup.orientation = "column";
        previewGroup.alignChildren = "center";
        var colorPreview = previewGroup.add("panel");
        colorPreview.preferredSize = [100, 100];
        colorPreview.graphics.backgroundColor = colorPreview.graphics.newBrush(
            colorPreview.graphics.BrushType.SOLID_COLOR, currentColor);
        
        // Right Side: Custom Color Controls
        var customColorGroup = mainSplitGroup.add("group");
        customColorGroup.orientation = "column";
        customColorGroup.alignChildren = ["left", "top"];
        customColorGroup.spacing = 4;
        
        // Hex Input and Color Picker Button
        var hexInputGroup = customColorGroup.add("group");
        hexInputGroup.orientation = "row";
        hexInputGroup.alignChildren = "center";
        hexInputGroup.spacing = 4;
        
        var hexInput = hexInputGroup.add("edittext", undefined, rgbToHex(currentColor));
        hexInput.characters = 7;
        var aePicker = hexInputGroup.add("button", undefined, "AE");
        aePicker.preferredSize = [25, 25];
        
        // Sliders (HSB)
        var sliderGroup = customColorGroup.add("group");
        sliderGroup.orientation = "column";
        sliderGroup.alignChildren = "left";
        sliderGroup.spacing = 8;
        
        function createSlider(label, min, max, value) {
            var group = sliderGroup.add("group");
            group.orientation = "row";
            group.alignChildren = ["left", "center"];
            group.spacing = 5;
            group.add("statictext", undefined, label + ":");
            var slider = group.add("slider", undefined, value, min, max);
            slider.preferredSize = [120, -1];
            var valueText = group.add("statictext", undefined, value.toString());
            valueText.characters = 4;
            slider.onChanging = function() {
                valueText.text = Math.round(slider.value).toString();
            };
            return slider;
        }
        
        // Convert current color to HSB
        var hsb = rgbToHsb(
            currentColor[0] * 255, 
            currentColor[1] * 255, 
            currentColor[2] * 255
        );
        
        var hueSlider = createSlider("H", 0, 360, Math.round(hsb[0]));
        var saturationSlider = createSlider("S", 0, 100, Math.round(hsb[1]));
        var brightnessSlider = createSlider("B", 0, 100, Math.round(hsb[2]));
        
        // Update Functions
        function updateColorFromHex() {
            var hexValue = hexInput.text;
            if (/^#?([0-9A-Fa-f]{3}){1,2}$/.test(hexValue)) {
                var rgb = hexToRgb(hexValue);
                var hsb = rgbToHsb(rgb[0] * 255, rgb[1] * 255, rgb[2] * 255);
                hueSlider.value = Math.round(hsb[0]);
                saturationSlider.value = Math.round(hsb[1]);
                brightnessSlider.value = Math.round(hsb[2]);
                colorPreview.graphics.backgroundColor = colorPreview.graphics.newBrush(
                    colorPreview.graphics.BrushType.SOLID_COLOR, rgb);
            }
        }
        
        function updateHexFromSliders() {
            var rgb = hsbToRgb(hueSlider.value, saturationSlider.value, brightnessSlider.value);
            var rgbNormalized = [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
            var hexColor = rgbToHex(rgbNormalized);
            hexInput.text = hexColor;
            colorPreview.graphics.backgroundColor = colorPreview.graphics.newBrush(
                colorPreview.graphics.BrushType.SOLID_COLOR, rgbNormalized);
        }
        
        hexInput.onChange = updateColorFromHex;
        hueSlider.onChanging = function() {
            hueSlider.parent.children[2].text = Math.round(hueSlider.value).toString();
            updateHexFromSliders();
        };
        saturationSlider.onChanging = function() {
            saturationSlider.parent.children[2].text = Math.round(saturationSlider.value).toString();
            updateHexFromSliders();
        };
        brightnessSlider.onChanging = function() {
            brightnessSlider.parent.children[2].text = Math.round(brightnessSlider.value).toString();
            updateHexFromSliders();
        };
        
        aePicker.onClick = function() {
            var initialColor = hexToRgb(hexInput.text);
            try {
                var pickedColor = colorPicker(initialColor);
                if (pickedColor !== null) {
                    hexInput.text = rgbToHex(pickedColor);
                    updateColorFromHex();
                }
            } catch(e) {
                alert("AE Color picker failed: " + e.toString());
            }
        };
        
        // Buttons
        var buttonGroup = dialog.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignChildren = ["center", "center"];
        buttonGroup.alignment = ["center", "top"];
        var cancelButton = buttonGroup.add("button", undefined, "Cancel");
        var okButton = buttonGroup.add("button", undefined, "OK", {name: "ok"});
        
        cancelButton.onClick = function() {
            dialog.close();
        };
        
        okButton.onClick = function() {
            var rgb = hsbToRgb(hueSlider.value, saturationSlider.value, brightnessSlider.value);
            var normalizedRgb = [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
            updateColorDisplay(normalizedRgb);
            presetDropdown.selection = 0; // Set to Custom
            useExistingLightSourceCheck.value = false; // Turn off light source when color changes
            dialog.close();
            app.beginUndoGroup("Change Shadow Color");
            updatePreview();
            app.endUndoGroup();
        };
        
        dialog.addEventListener("keydown", function(event) {
            if (event.keyName === "Escape") dialog.close();
        });
        
        dialog.show();
    }
    
    // Color picker button handler
    colorPickerBtn.onClick = function() {
        openColorPicker();
    };
    
    // Connect sliders to auto-apply update and connect text inputs
    layersSlider.onChanging = function() { 
        var val = Math.round(layersSlider.value);
        layersText.text = val;
        layersInput.text = val;
        presetDropdown.selection = 0; // Set to Custom
        useExistingLightSourceCheck.value = false; // Turn off light source when settings change
        app.beginUndoGroup("Change Shadow Layers");
        updatePreview();
        app.endUndoGroup();
    };
    
    layersInput.onChange = function() {
        var val = parseInt(layersInput.text);
        if (!isNaN(val)) {
            val = Math.max(1, Math.min(100, val)); // Clamp to slider range
            layersInput.text = val; // Update input with clamped value
            layersSlider.value = val;
            layersText.text = val;
            presetDropdown.selection = 0; // Set to Custom
            useExistingLightSourceCheck.value = false;
            app.beginUndoGroup("Change Shadow Layers");
            updatePreview();
            app.endUndoGroup();
        }
    };
    
    opacitySlider.onChanging = function() { 
        var percent = Math.round(opacitySlider.value * 100);
        opacityText.text = percent + "%";
        opacityInput.text = percent;
        presetDropdown.selection = 0; // Set to Custom
        useExistingLightSourceCheck.value = false; // Turn off light source when settings change
        app.beginUndoGroup("Change Shadow Opacity");
        updatePreview();
        app.endUndoGroup();
    };
    
    opacityInput.onChange = function() {
        var percent = parseInt(opacityInput.text);
        if (!isNaN(percent)) {
            percent = Math.max(0, Math.min(200, percent)); // Clamp to slider range (0-200%)
            opacityInput.text = percent; // Update input with clamped value
            var val = percent / 100;
            opacitySlider.value = val;
            opacityText.text = percent + "%";
            presetDropdown.selection = 0; // Set to Custom
            useExistingLightSourceCheck.value = false;
            app.beginUndoGroup("Change Shadow Opacity");
            updatePreview();
            app.endUndoGroup();
        }
    };
    
    distanceSlider.onChanging = function() { 
        var val = Math.round(distanceSlider.value);
        distanceText.text = val + "px";
        distanceInput.text = val;
        presetDropdown.selection = 0; // Set to Custom
        useExistingLightSourceCheck.value = false; // Turn off light source when settings change
        app.beginUndoGroup("Change Shadow Distance");
        updatePreview();
        app.endUndoGroup();
    };
    
    distanceInput.onChange = function() {
        var val = parseInt(distanceInput.text);
        if (!isNaN(val)) {
            val = Math.max(0, Math.min(1000, val)); // Clamp to slider range
            distanceInput.text = val; // Update input with clamped value
            distanceSlider.value = val;
            distanceText.text = val + "px";
            presetDropdown.selection = 0; // Set to Custom
            useExistingLightSourceCheck.value = false;
            app.beginUndoGroup("Change Shadow Distance");
            updatePreview();
            app.endUndoGroup();
        }
    };
    
    directionSlider.onChanging = function() { 
        var val = Math.round(directionSlider.value);
        directionText.text = val + "°";
        directionInput.text = val;
        presetDropdown.selection = 0; // Set to Custom
        useExistingLightSourceCheck.value = false; // Turn off light source when settings change
        app.beginUndoGroup("Change Shadow Direction");
        updatePreview();
        app.endUndoGroup();
    };
    
    directionInput.onChange = function() {
        var val = parseInt(directionInput.text);
        if (!isNaN(val)) {
            val = val % 360; // Wrap around for angles
            if (val < 0) val += 360; // Handle negative angles
            directionInput.text = val; // Update input with normalized value
            directionSlider.value = val;
            directionText.text = val + "°";
            presetDropdown.selection = 0; // Set to Custom
            useExistingLightSourceCheck.value = false;
            app.beginUndoGroup("Change Shadow Direction");
            updatePreview();
            app.endUndoGroup();
        }
    };
    
    softnessSlider.onChanging = function() { 
        var val = Math.round(softnessSlider.value);
        softnessText.text = val + "px";
        softnessInput.text = val;
        presetDropdown.selection = 0; // Set to Custom
        useExistingLightSourceCheck.value = false; // Turn off light source when settings change
        app.beginUndoGroup("Change Shadow Softness");
        updatePreview();
        app.endUndoGroup();
    };
    
    softnessInput.onChange = function() {
        var val = parseInt(softnessInput.text);
        if (!isNaN(val)) {
            val = Math.max(0, Math.min(1000, val)); // Clamp to slider range
            softnessInput.text = val; // Update input with clamped value
            softnessSlider.value = val;
            softnessText.text = val + "px";
            presetDropdown.selection = 0; // Set to Custom
            useExistingLightSourceCheck.value = false;
            app.beginUndoGroup("Change Shadow Softness");
            updatePreview();
            app.endUndoGroup();
        }
    };
    
    reverseAlphaCheckbox.onClick = function() {
        presetDropdown.selection = 0; // Set to Custom
        useExistingLightSourceCheck.value = false; // Turn off light source when settings change
        app.beginUndoGroup("Change Shadow Alpha Order");
        updatePreview();
        app.endUndoGroup();
    };
    
    easingDropdown.onChange = function() {
        presetDropdown.selection = 0; // Set to Custom
        useExistingLightSourceCheck.value = false; // Turn off light source when settings change
        app.beginUndoGroup("Change Shadow Easing");
        updatePreview();
        app.endUndoGroup();
    };

    // Light source controls handlers
    createLightSourceBtn.onClick = function() {
        presetDropdown.selection = 0; // Set to Custom
        
        app.beginUndoGroup("Create Light Source");
        
        // Clear any preview effects
        clearPreview();
        
        // Get current settings
        var settings = {
            layers: Math.round(layersSlider.value),
            opacity: opacitySlider.value,
            distance: distanceSlider.value,
            direction: directionSlider.value,
            softness: softnessSlider.value,
            reverse: reverseAlphaCheckbox.value,
            color: currentColor,
            easingType: easingDropdown.selection.text
        };
        
        // Get current selection
        var targetLayers = getSelectedLayers();
        
        if (targetLayers.length === 0) {
            alert("Please select at least one layer.");
            return;
        }
        
        // Check if we should try to use an existing light source first
        var lightNull = null;
        if (useExistingLightSourceCheck.value) {
            // Try to find an existing light source
            lightNull = findExistingLightSource();
            
            if (lightNull) {
                // Use existing light source
                for (var i = 0; i < targetLayers.length; i++) {
                    applyMultiShadowWithLightSource(targetLayers[i], lightNull, settings);
                }
                
                // Select the light source to make it easier to find
                for (var i = 1; i <= comp.layers.length; i++) {
                    comp.layers[i].selected = false;
                }
                lightNull.selected = true;
                
                app.endUndoGroup();
                return; // Exit function since we used existing light source
            }
            // If no existing light source, fall through to create a new one
        }
        
        // Create a light source null
        lightNull = createLightSourceNull(comp, targetLayers, settings);
        
        // Apply to all target layers using the null
        for (var i = 0; i < targetLayers.length; i++) {
            applyMultiShadowWithLightSource(targetLayers[i], lightNull, settings);
        }
        
        // Select the light source null to make it easier to find
        // First deselect all layers
        for (var i = 1; i <= comp.layers.length; i++) {
            comp.layers[i].selected = false;
        }
        // Then select the light source null
        lightNull.selected = true;
        
        app.endUndoGroup();
    };
    
    useExistingLightSourceCheck.onClick = function() {
        presetDropdown.selection = 0; // Set to Custom
        app.beginUndoGroup("Toggle Use Existing Light Source");
        updatePreview();
        app.endUndoGroup();
    };
    
    // Preset handler
    presetDropdown.onChange = function() {
        if (presetDropdown.selection.index === 0) {
            return; // Custom selected, do nothing
        }
        
        var presetName = presetDropdown.selection.text;
        var preset = presets[presetName];
        
        // Apply preset values
        layersSlider.value = preset.layers;
        layersText.text = preset.layers;
        layersInput.text = preset.layers;
        
        opacitySlider.value = preset.opacity;
        opacityText.text = Math.round(preset.opacity * 100) + "%";
        opacityInput.text = Math.round(preset.opacity * 100);
        
        distanceSlider.value = preset.distance;
        distanceText.text = preset.distance + "px";
        distanceInput.text = preset.distance;
        
        directionSlider.value = preset.direction;
        directionText.text = preset.direction + "°";
        directionInput.text = preset.direction;
        
        softnessSlider.value = preset.softness;
        softnessText.text = preset.softness + "px";
        softnessInput.text = preset.softness;
        
        reverseAlphaCheckbox.value = preset.reverse;
        
        updateColorDisplay(preset.color);
        
        // Turn off light source when applying preset
        useExistingLightSourceCheck.value = false;
        
        // Auto-apply the preset
        app.beginUndoGroup("Apply Preset");
        updatePreview();
        app.endUndoGroup();
    };
    
    // Function to update the preset dropdown
    function updatePresetDropdown() {
        presetDropdown.removeAll();
        presetDropdown.add("item", "Custom");
        
        var presetNames = Object.keys(presets);
        for (var i = 0; i < presetNames.length; i++) {
            presetDropdown.add("item", presetNames[i]);
        }
    }
    
    // Initialize dropdown with loaded presets
    updatePresetDropdown();
    presetDropdown.selection = 0;
    
    // Save preset handler
    savePresetButton.onClick = function() {
        var presetName = prompt("Enter preset name:", "My Preset");
        if (!presetName) return;
        
        // Save current settings as a preset
        presets[presetName] = {
            layers: Math.round(layersSlider.value),
            opacity: opacitySlider.value,
            distance: distanceSlider.value,
            direction: directionSlider.value,
            softness: softnessSlider.value,
            reverse: reverseAlphaCheckbox.value,
            color: currentColor
        };
        
        // Update dropdown
        updatePresetDropdown();
        presetDropdown.selection = presetDropdown.items.length - 1;
        
        // Save presets to file
        savePresets();
        
        alert("Preset '" + presetName + "' saved.");
    };
    
    // Delete preset handler
    deletePresetButton.onClick = function() {
        if (presetDropdown.selection.index === 0) {
            alert("Cannot delete 'Custom' preset.");
            return;
        }
        
        var presetName = presetDropdown.selection.text;
        
        // Check if it's a default preset
        if (defaultPresets.hasOwnProperty(presetName)) {
            var confirmDefaultDelete = confirm("'" + presetName + "' is a default preset. It will be restored when you reinstall the script. Delete anyway?");
            if (!confirmDefaultDelete) return;
        } else {
            var confirmDelete = confirm("Are you sure you want to delete the preset '" + presetName + "'?");
            if (!confirmDelete) return;
        }
        
        delete presets[presetName];
        
        // Update dropdown
        updatePresetDropdown();
        presetDropdown.selection = 0;
        
        // Save presets to file
        savePresets();
        
        alert("Preset '" + presetName + "' deleted.");
    };
    
    // Apply button handler
    applyButton.onClick = function() {
        app.beginUndoGroup("Apply Standard Shadows");
        
        try {
            // Clear any preview effects first
            clearPreview();
            
            // Get current settings
            var settings = {
                layers: Math.round(layersSlider.value),
                opacity: opacitySlider.value,
                distance: distanceSlider.value,
                direction: directionSlider.value,
                softness: softnessSlider.value,
                reverse: reverseAlphaCheckbox.value,
                color: currentColor,
                easingType: easingDropdown.selection.text
            };
            
            // Get current selection when applying
            var targetLayers = getSelectedLayers();
            
            // Check if there are layers selected
            if (targetLayers.length === 0) {
                alert("Please select at least one layer.");
                return;
            }
            
            // Apply using the original method without null (standard shadows only)
            var successCount = 0;
            for (var i = 0; i < targetLayers.length; i++) {
                if (applyMultiShadow(targetLayers[i], settings.layers, settings.opacity, settings.distance, 
                                    settings.direction, settings.softness, settings.reverse, 
                                    settings.color, settings.easingType, false)) {
                    successCount++;
                }
            }
            
            // No popup on success for cleaner UI experience
        } catch (e) {
            alert("Error applying shadows: " + e.toString());
        }
        
        app.endUndoGroup();
    };
    
    // Make sure to clean up preview effects when window is closed
    win.onClose = function() {
        clearPreview();
    };
    
    win.center();
    win.show();
})();