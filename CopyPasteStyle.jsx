(function () {
    // Check if Alt key is pressed at the beginning
    var altKeyPressed = ScriptUI.environment.keyboardState.altKey;
    var shiftKeyPressed = ScriptUI.environment.keyboardState.shiftKey;
    
    // Storage for copied properties - use settings to persist between runs
    var SETTINGS_PREFIX = "ShapeColorCopy";
    
    // Basic color and visibility settings
    initSetting("lastFillColor", "");
    initSetting("lastStrokeColor", "");
    initSetting("fillVisible", "true");
    initSetting("strokeVisible", "true");
    
    // Fill properties
    initSetting("fillBlendingMode", "1");  // Normal
    initSetting("fillOpacity", "100");
    
    // Stroke properties
    initSetting("strokeBlendingMode", "1"); // Normal
    initSetting("strokeOpacity", "100");
    initSetting("strokeWidth", "1");
    initSetting("strokeLineCap", "1");      // Butt Cap
    initSetting("strokeLineJoin", "1");     // Miter Join
    initSetting("strokeMiterLimit", "4");
    initSetting("strokeDashes", "[]");
    initSetting("strokeDashOffset", "0");
    initSetting("strokeTaperOption", "{}");
    initSetting("strokeWaveOption", "{}");
    
    // Helper to initialize a setting if it doesn't exist
    function initSetting(name, defaultValue) {
        if (!app.settings.haveSetting(SETTINGS_PREFIX, name)) {
            app.settings.saveSetting(SETTINGS_PREFIX, name, defaultValue);
        }
    }
    
    // Get stored settings
    var lastFillColor = app.settings.getSetting(SETTINGS_PREFIX, "lastFillColor");
    var lastStrokeColor = app.settings.getSetting(SETTINGS_PREFIX, "lastStrokeColor");
    var fillVisible = app.settings.getSetting(SETTINGS_PREFIX, "fillVisible") === "true";
    var strokeVisible = app.settings.getSetting(SETTINGS_PREFIX, "strokeVisible") === "true";
    
    // Fill properties
    var fillBlendingMode = parseInt(app.settings.getSetting(SETTINGS_PREFIX, "fillBlendingMode"));
    var fillOpacity = parseFloat(app.settings.getSetting(SETTINGS_PREFIX, "fillOpacity"));
    
    // Stroke properties
    var strokeBlendingMode = parseInt(app.settings.getSetting(SETTINGS_PREFIX, "strokeBlendingMode"));
    var strokeOpacity = parseFloat(app.settings.getSetting(SETTINGS_PREFIX, "strokeOpacity"));
    var strokeWidth = parseFloat(app.settings.getSetting(SETTINGS_PREFIX, "strokeWidth"));
    var strokeLineCap = parseInt(app.settings.getSetting(SETTINGS_PREFIX, "strokeLineCap"));
    var strokeLineJoin = parseInt(app.settings.getSetting(SETTINGS_PREFIX, "strokeLineJoin"));
    var strokeMiterLimit = parseFloat(app.settings.getSetting(SETTINGS_PREFIX, "strokeMiterLimit"));
    var strokeDashes = JSON.parse(app.settings.getSetting(SETTINGS_PREFIX, "strokeDashes") || "[]");
    var strokeDashOffset = parseFloat(app.settings.getSetting(SETTINGS_PREFIX, "strokeDashOffset"));
    var strokeTaperOption;
    var strokeWaveOption;
    
    try {
        strokeTaperOption = JSON.parse(app.settings.getSetting(SETTINGS_PREFIX, "strokeTaperOption") || "{}");
        strokeWaveOption = JSON.parse(app.settings.getSetting(SETTINGS_PREFIX, "strokeWaveOption") || "{}");
    } catch (e) {
        strokeTaperOption = {};
        strokeWaveOption = {};
    }
    
    // Ensure a project is open
    if (!app.project) {
        alert("Please open a project first.");
        return;
    }
    
    // Ensure a layer is selected
    var activeComp = app.project.activeItem;
    if (!(activeComp && activeComp instanceof CompItem)) {
        alert("Please select a composition.");
        return;
    }
    if (activeComp.selectedLayers.length === 0) {
        alert("Please select at least one shape layer.");
        return;
    }
    
    // Apply stored properties if Alt key is pressed
    if (altKeyPressed) {
        applyStoredPropertiesToSelectedLayers();
        return;
    }
    
    // Swap fill and stroke if Shift key is pressed
    if (shiftKeyPressed) {
        swapFillAndStrokeInSelectedLayers();
        return;
    }
    
    // Main properties extraction code (direct click behavior)
    var selectedLayer = activeComp.selectedLayers[0];
    
    // Check if the selected layer is a shape layer
    if (!(selectedLayer instanceof ShapeLayer)) {
        alert("Please select a shape layer.");
        return;
    }
    
    app.beginUndoGroup("Copy Shape Properties");
    
    try {
        // Find all shape groups in the layer
        var shapeGroups = findShapeGroups(selectedLayer.property("Contents"));
        
        // If there are multiple shape groups, let user select which to copy from
        if (shapeGroups.length > 1) {
            promptForShapeGroupSelection(shapeGroups);
        } else if (shapeGroups.length === 1) {
            // If only one shape group, directly copy its properties
            copyPropertiesFromShapeGroup(shapeGroups[0]);
        } else {
            alert("No shape groups found in the selected layer.");
        }
    } catch (error) {
        alert("Error: " + error.toString());
    }
    
    app.endUndoGroup();
    
    /**
     * Find all shape groups in contents
     * @param {PropertyGroup} contents - Contents property group
     * @return {Array} Array of shape group properties
     */
    function findShapeGroups(contents) {
        var groups = [];
        
        function collectGroups(contents, path) {
            if (!contents) return;
            
            var numProps = contents.numProperties;
            for (var i = 1; i <= numProps; i++) {
                var prop = contents.property(i);
                var propName = prop.name;
                var currentPath = path ? path + " > " + propName : propName;
                
                if (prop.matchName === "ADBE Vector Group" && prop.property("Contents")) {
                    // Found a shape group, collect it with its path
                    groups.push({
                        property: prop,
                        path: currentPath,
                        // Collect properties from group
                        properties: collectPropertiesFromGroup(prop.property("Contents"))
                    });
                } else if ((prop.propertyType === PropertyType.INDEXED_GROUP || 
                           prop.propertyType === PropertyType.NAMED_GROUP) && 
                           prop.numProperties > 0) {
                    // Recursively check other property groups
                    collectGroups(prop, currentPath);
                }
            }
        }
        
        collectGroups(contents, "");
        return groups;
    }
    
    /**
     * Collect properties from a shape group
     * @param {PropertyGroup} contents - Contents property group
     * @return {Object} Properties information
     */
    function collectPropertiesFromGroup(contents) {
        var properties = {
            fill: {
                exists: false,
                enabled: true,
                color: null,
                blendingMode: 1,  // Normal
                opacity: 100
            },
            stroke: {
                exists: false,
                enabled: true,
                color: null,
                blendingMode: 1,  // Normal
                opacity: 100,
                width: 1,
                lineCap: 1,       // Butt Cap
                lineJoin: 1,      // Miter Join
                miterLimit: 4,
                dashes: [],
                dashOffset: 0,
                taperOption: {},
                waveOption: {}
            }
        };
        
        function traverse(contents) {
            if (!contents) return;
            
            var numProps = contents.numProperties;
            for (var i = 1; i <= numProps; i++) {
                var prop = contents.property(i);
                var matchName = prop.matchName;
                
                // Fill properties
                if (matchName === "ADBE Vector Graphic - Fill") {
                    properties.fill.exists = true;
                    properties.fill.enabled = prop.enabled;
                    
                    if (prop.property("Color")) {
                        properties.fill.color = prop.property("Color").value;
                    }
                    
                    // Get blending mode
                    if (prop.property("Blend Mode")) {
                        properties.fill.blendingMode = prop.property("Blend Mode").value;
                    }
                    
                    // Get opacity
                    if (prop.property("Opacity")) {
                        properties.fill.opacity = prop.property("Opacity").value;
                    }
                }
                // Stroke properties
                else if (matchName === "ADBE Vector Graphic - Stroke") {
                    properties.stroke.exists = true;
                    properties.stroke.enabled = prop.enabled;
                    
                    if (prop.property("Color")) {
                        properties.stroke.color = prop.property("Color").value;
                    }
                    
                    // Get blending mode
                    if (prop.property("Blend Mode")) {
                        properties.stroke.blendingMode = prop.property("Blend Mode").value;
                    }
                    
                    // Get opacity
                    if (prop.property("Opacity")) {
                        properties.stroke.opacity = prop.property("Opacity").value;
                    }
                    
                    // Get stroke width
                    if (prop.property("Stroke Width")) {
                        properties.stroke.width = prop.property("Stroke Width").value;
                    }
                    
                    // Get line cap
                    if (prop.property("Line Cap")) {
                        properties.stroke.lineCap = prop.property("Line Cap").value;
                    }
                    
                    // Get line join
                    if (prop.property("Line Join")) {
                        properties.stroke.lineJoin = prop.property("Line Join").value;
                    }
                    
                    // Get miter limit
                    if (prop.property("Miter Limit")) {
                        properties.stroke.miterLimit = prop.property("Miter Limit").value;
                    }
                    
                    // Get dashes
                    if (prop.property("Dashes")) {
                        var dashesGroup = prop.property("Dashes");
                        var dashArray = [];
                        
                        // AE's dash pattern consists of alternating dash and gap values
                        for (var j = 1; j <= dashesGroup.numProperties; j++) {
                            var dashProp = dashesGroup.property(j);
                            if (dashProp.matchName.indexOf("ADBE Vector Stroke Dash") !== -1 ||
                                dashProp.matchName.indexOf("ADBE Vector Stroke Gap") !== -1) {
                                dashArray.push({
                                    name: dashProp.name,
                                    value: dashProp.value
                                });
                            }
                        }
                        
                        properties.stroke.dashes = dashArray;
                    }
                    
                    // Get dash offset
                    if (prop.property("Dash Phase")) {
                        properties.stroke.dashOffset = prop.property("Dash Phase").value;
                    }
                    
                    // Get taper options
                    if (prop.property("Taper")) {
                        var taperGroup = prop.property("Taper");
                        var taperOptions = {};
                        
                        // Collect all taper properties
                        for (var j = 1; j <= taperGroup.numProperties; j++) {
                            var taperProp = taperGroup.property(j);
                            taperOptions[taperProp.name] = taperProp.value;
                        }
                        
                        properties.stroke.taperOption = taperOptions;
                    }
                    
                    // Get wave options
                    if (prop.property("Wave")) {
                        var waveGroup = prop.property("Wave");
                        var waveOptions = {};
                        
                        // Collect all wave properties
                        for (var j = 1; j <= waveGroup.numProperties; j++) {
                            var waveProp = waveGroup.property(j);
                            waveOptions[waveProp.name] = waveProp.value;
                        }
                        
                        properties.stroke.waveOption = waveOptions;
                    }
                }
                // Check for nested groups
                else if ((matchName === "ADBE Vector Group" || 
                         prop.propertyType === PropertyType.INDEXED_GROUP || 
                         prop.propertyType === PropertyType.NAMED_GROUP) && 
                         prop.numProperties > 0) {
                    traverse(prop);
                }
            }
        }
        
        traverse(contents);
        return properties;
    }
    
    /**
     * Show dialog to select which shape group to copy from
     * @param {Array} shapeGroups - Array of shape groups
     */
    function promptForShapeGroupSelection(shapeGroups) {
        var dialog = new Window("dialog", "Select Shape Group");
        dialog.orientation = "column";
        dialog.alignChildren = ["fill", "top"];
        dialog.spacing = 10;
        dialog.margins = 16;
        
        dialog.add("statictext", undefined, "Click on a shape group to copy its properties:");
        
        // Create scrollable area
        var scrollGroup = dialog.add("group");
        scrollGroup.orientation = "column";
        scrollGroup.alignChildren = ["fill", "top"];
        scrollGroup.spacing = 8;
        scrollGroup.maximumSize.height = 400;
        
        // Calculate maximum width needed based on group paths
        var maxPathLength = 0;
        for (var i = 0; i < shapeGroups.length; i++) {
            maxPathLength = Math.max(maxPathLength, shapeGroups[i].path.length);
        }
        var groupWidth = Math.min(Math.max(350, maxPathLength * 7), 600);
        scrollGroup.maximumSize.width = groupWidth;
        
        // Populate with buttons for each shape group
        for (var i = 0; i < shapeGroups.length; i++) {
            var group = shapeGroups[i];
            var props = group.properties;
            
            var btnGroup = scrollGroup.add("group");
            btnGroup.orientation = "row";
            btnGroup.alignChildren = ["left", "center"];
            btnGroup.spacing = 5;
            btnGroup.margins = 2;
            
            // The main button that contains the group path
            var btn = btnGroup.add("button", undefined, group.path);
            btn.size = [groupWidth - 120, 28];
            btn.group = group;
            
            // Fill color preview
            var fillLabel = btnGroup.add("statictext", undefined, "Fill:");
            
            // Create fill color swatch
            var fillR = 204, fillG = 204, fillB = 204; // Default gray
            var fillHidden = false;
            
            if (props.fill.exists && props.fill.color) {
                fillR = Math.round(props.fill.color[0] * 255);
                fillG = Math.round(props.fill.color[1] * 255);
                fillB = Math.round(props.fill.color[2] * 255);
                fillHidden = !props.fill.enabled;
            }
            
            // Create fill color swatch
            var fillColorSwatch = btnGroup.add("group");
            fillColorSwatch.margins = 0;
            fillColorSwatch.size = [20, 20];
            
            // Set background color directly with ScriptUI's background color property
            fillColorSwatch.graphics.backgroundColor = fillColorSwatch.graphics.newBrush(
                fillColorSwatch.graphics.BrushType.SOLID_COLOR, 
                [fillR/255, fillG/255, fillB/255, 1]
            );
            
            // Add indicator for hidden fills
            if (fillHidden) {
                var fillX = fillColorSwatch.add("statictext", [5, 0, 20, 20], "×");
                fillX.graphics.foregroundColor = fillX.graphics.newPen(
                    fillX.graphics.PenType.SOLID_COLOR, [1, 0, 0, 1], 2
                );
            }
            
            // Stroke color preview
            var strokeLabel = btnGroup.add("statictext", undefined, "Stroke:");
            
            // Create stroke color swatch
            var strokeR = 204, strokeG = 204, strokeB = 204; // Default gray
            var strokeHidden = false;
            
            if (props.stroke.exists && props.stroke.color) {
                strokeR = Math.round(props.stroke.color[0] * 255);
                strokeG = Math.round(props.stroke.color[1] * 255);
                strokeB = Math.round(props.stroke.color[2] * 255);
                strokeHidden = !props.stroke.enabled;
            }
            
            // Create stroke color swatch
            var strokeColorSwatch = btnGroup.add("group");
            strokeColorSwatch.margins = 0;
            strokeColorSwatch.size = [20, 20];
            
            // Set background color directly
            strokeColorSwatch.graphics.backgroundColor = strokeColorSwatch.graphics.newBrush(
                strokeColorSwatch.graphics.BrushType.SOLID_COLOR, 
                [strokeR/255, strokeG/255, strokeB/255, 1]
            );
            
            // Add indicator for hidden strokes
            if (strokeHidden) {
                var strokeX = strokeColorSwatch.add("statictext", [5, 0, 20, 20], "×");
                strokeX.graphics.foregroundColor = strokeX.graphics.newPen(
                    strokeX.graphics.PenType.SOLID_COLOR, [1, 0, 0, 1], 2
                );
            }
            
            // Set button click handler
            btn.onClick = function() {
                copyPropertiesFromShapeGroup(this.group);
                dialog.close();
            };
        }
        
        var buttonGroup = dialog.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignChildren = ["center", "center"];
        
        var cancelButton = buttonGroup.add("button", undefined, "Cancel");
        
        cancelButton.onClick = function() {
            dialog.close();
        };
        
        dialog.show();
    }
    
    /**
     * Copy properties from a shape group to clipboard and settings
     * @param {Object} group - Shape group object
     */
    function copyPropertiesFromShapeGroup(group) {
        var props = group.properties;
        var fillProps = props.fill;
        var strokeProps = props.stroke;
        
        // Prepare text for clipboard
        var clipboardText = "=== Shape Properties ===\n";
        
        // Fill properties
        clipboardText += "\nFill: " + (fillProps.exists ? 
            (fillProps.color ? rgbToHex(fillProps.color) : "None") + 
            (fillProps.enabled ? "" : " (Hidden)") : "None");
        
        if (fillProps.exists) {
            clipboardText += "\n  Blend Mode: " + getBlendingModeName(fillProps.blendingMode);
            clipboardText += "\n  Opacity: " + fillProps.opacity + "%";
        }
        
        // Stroke properties
        clipboardText += "\n\nStroke: " + (strokeProps.exists ? 
            (strokeProps.color ? rgbToHex(strokeProps.color) : "None") + 
            (strokeProps.enabled ? "" : " (Hidden)") : "None");
        
        if (strokeProps.exists) {
            clipboardText += "\n  Blend Mode: " + getBlendingModeName(strokeProps.blendingMode);
            clipboardText += "\n  Opacity: " + strokeProps.opacity + "%";
            clipboardText += "\n  Width: " + strokeProps.width + "px";
            clipboardText += "\n  Line Cap: " + getLineCapName(strokeProps.lineCap);
            clipboardText += "\n  Line Join: " + getLineJoinName(strokeProps.lineJoin);
            clipboardText += "\n  Miter Limit: " + strokeProps.miterLimit;
            
            // Dashes
            if (strokeProps.dashes.length > 0) {
                clipboardText += "\n  Dashes: ";
                for (var i = 0; i < strokeProps.dashes.length; i++) {
                    clipboardText += strokeProps.dashes[i].name + " = " + strokeProps.dashes[i].value + "px, ";
                }
                clipboardText = clipboardText.slice(0, -2); // Remove trailing comma
                clipboardText += "\n  Dash Offset: " + strokeProps.dashOffset + "px";
            }
            
            // Taper
            if (strokeProps.taperOption && Object.keys(strokeProps.taperOption).length > 0) {
                clipboardText += "\n  Taper: ";
                for (var prop in strokeProps.taperOption) {
                    clipboardText += prop + " = " + strokeProps.taperOption[prop] + ", ";
                }
                clipboardText = clipboardText.slice(0, -2); // Remove trailing comma
            }
            
            // Wave
            if (strokeProps.waveOption && Object.keys(strokeProps.waveOption).length > 0) {
                clipboardText += "\n  Wave: ";
                for (var prop in strokeProps.waveOption) {
                    clipboardText += prop + " = " + strokeProps.waveOption[prop] + ", ";
                }
                clipboardText = clipboardText.slice(0, -2); // Remove trailing comma
            }
        }
        
        // Save fill properties to settings
        saveSetting("lastFillColor", fillProps.color ? rgbToHex(fillProps.color) : "");
        saveSetting("fillVisible", fillProps.enabled.toString());
        saveSetting("fillBlendingMode", fillProps.blendingMode.toString());
        saveSetting("fillOpacity", fillProps.opacity.toString());
        
        // Save stroke properties to settings
        saveSetting("lastStrokeColor", strokeProps.color ? rgbToHex(strokeProps.color) : "");
        saveSetting("strokeVisible", strokeProps.enabled.toString());
        saveSetting("strokeBlendingMode", strokeProps.blendingMode.toString());
        saveSetting("strokeOpacity", strokeProps.opacity.toString());
        saveSetting("strokeWidth", strokeProps.width.toString());
        saveSetting("strokeLineCap", strokeProps.lineCap.toString());
        saveSetting("strokeLineJoin", strokeProps.lineJoin.toString());
        saveSetting("strokeMiterLimit", strokeProps.miterLimit.toString());
        saveSetting("strokeDashes", JSON.stringify(strokeProps.dashes));
        saveSetting("strokeDashOffset", strokeProps.dashOffset.toString());
        saveSetting("strokeTaperOption", JSON.stringify(strokeProps.taperOption));
        saveSetting("strokeWaveOption", JSON.stringify(strokeProps.waveOption));
        
        // Copy to clipboard
        writeToClipboard(clipboardText);
    }
    
    /**
     * Helper to save a setting
     */
    function saveSetting(name, value) {
        app.settings.saveSetting(SETTINGS_PREFIX, name, value);
    }
    
    /**
     * Get blending mode name from value
     */
    function getBlendingModeName(mode) {
        var modes = {
            1: "Normal",
            2: "Dissolve",
            3: "Behind",
            4: "Clear",
            5: "Add",
            6: "Multiply",
            7: "Screen",
            8: "Overlay",
            9: "Soft Light",
            10: "Hard Light",
            11: "Darken",
            12: "Lighten",
            13: "Classic Color Dodge",
            14: "Classic Color Burn",
            15: "Linear Dodge",
            16: "Linear Burn",
            17: "Linear Light",
            18: "Vivid Light",
            19: "Pin Light",
            20: "Hard Mix",
            21: "Difference",
            22: "Exclusion",
            23: "Hue",
            24: "Saturation",
            25: "Color",
            26: "Luminosity",
            27: "Stencil Alpha",
            28: "Stencil Luma",
            29: "Silhouette Alpha",
            30: "Silhouette Luma",
            31: "Alpha Add",
            32: "Luminescent Premul"
        };
        
        return modes[mode] || "Unknown (" + mode + ")";
    }
    
    /**
     * Get line cap name from value
     */
    function getLineCapName(cap) {
        var caps = {
            1: "Butt Cap",
            2: "Round Cap",
            3: "Projecting Cap"
        };
        
        return caps[cap] || "Unknown (" + cap + ")";
    }
    
    /**
     * Get line join name from value
     */
    function getLineJoinName(join) {
        var joins = {
            1: "Miter Join",
            2: "Round Join",
            3: "Bevel Join"
        };
        
        return joins[join] || "Unknown (" + join + ")";
    }
    
    /**
     * Check if a property is accessible for writing
     * @param {Property} prop - The property to check
     * @return {Boolean} True if the property can be modified
     */
    function isPropertyAccessible(prop) {
        if (!prop) return false;
        
        try {
            // Check if property itself is enabled/unlocked
            if (prop.propertyType === PropertyType.PROPERTY && !prop.isTimeVarying) {
                // Try to get the value as a test
                var testValue = prop.value;
                return true;
            }
            
            // For property groups, check if they're enabled
            if (prop.enabled !== undefined) {
                return prop.enabled;
            }
            
            return true;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Safely set a property value with error checking
     * @param {Property} prop - The property to set
     * @param {Any} value - The value to set
     * @return {Boolean} True if successful
     */
    function safeSetValue(prop, value) {
        if (!prop) return false;
        
        try {
            // Check if property and its parents are accessible
            if (isPropertyAccessible(prop)) {
                prop.setValue(value);
                return true;
            }
            return false;
        } catch (e) {
            // Property might be locked or otherwise inaccessible
            return false;
        }
    }
    
    /**
     * Safely set enabled status with error checking
     * @param {Property} prop - The property to set
     * @param {Boolean} enabled - The enabled status to set
     * @return {Boolean} True if successful
     */
    function safeSetEnabled(prop, enabled) {
        if (!prop) return false;
        
        try {
            prop.enabled = enabled;
            return true;
        } catch (e) {
            // Property might be locked or otherwise inaccessible
            return false;
        }
    }
    
    /**
     * Apply stored properties to all selected layers
     */
    function applyStoredPropertiesToSelectedLayers() {
        if (!lastFillColor && !lastStrokeColor) {
            alert("No properties have been copied yet.");
            return;
        }
        
        app.beginUndoGroup("Apply Copied Properties");
        
        try {
            var selectedLayers = activeComp.selectedLayers;
            var appliedCount = 0;
            var errorCount = 0;
            
            for (var i = 0; i < selectedLayers.length; i++) {
                var layer = selectedLayers[i];
                
                if (layer instanceof ShapeLayer) {
                    var result = applyPropertiesToAllShapeGroups(layer.property("Contents"));
                    if (result.applied) {
                        appliedCount++;
                    }
                    errorCount += result.errors;
                }
            }
            
            if (appliedCount === 0) {
                alert("No shape layers found in selection.");
            }
            // No alert for errors anymore
        } catch (error) {
            alert("Error applying properties: " + error.toString());
        }
        
        app.endUndoGroup();
    }
    
    /**
     * Apply stored properties to all shape groups in contents
     * @param {PropertyGroup} contents - Contents property group
     * @return {Object} Result with applied and errors counts
     */
    function applyPropertiesToAllShapeGroups(contents) {
        if (!contents) return { applied: false, errors: 0 };
        
        var result = { applied: false, errors: 0 };
        
        // Create RGB arrays for fill and stroke
        var fillRgb = lastFillColor ? hexToRgb(lastFillColor) : null;
        var strokeRgb = lastStrokeColor ? hexToRgb(lastStrokeColor) : null;
        
        if (fillRgb) {
            fillRgb = [fillRgb.r/255, fillRgb.g/255, fillRgb.b/255];
        }
        
        if (strokeRgb) {
            strokeRgb = [strokeRgb.r/255, strokeRgb.g/255, strokeRgb.b/255];
        }
        
        // Apply properties to all properties recursively
        function applyProperties(contents) {
            if (!contents) return;
            
            var numProps = contents.numProperties;
            for (var i = 1; i <= numProps; i++) {
                var prop = contents.property(i);
                var matchName = prop.matchName;
                
                // Apply to fill properties
                if (matchName === "ADBE Vector Graphic - Fill") {
                    // Apply visibility
                    if (!safeSetEnabled(prop, fillVisible)) {
                        result.errors++;
                    }
                    
                    // Apply color
                    if (fillRgb && prop.property("Color")) {
                        if (!safeSetValue(prop.property("Color"), fillRgb)) {
                            result.errors++;
                        } else {
                            result.applied = true;
                        }
                    }
                    
                    // Apply blend mode
                    if (prop.property("Blend Mode")) {
                        if (!safeSetValue(prop.property("Blend Mode"), fillBlendingMode)) {
                            result.errors++;
                        }
                    }
                    
                    // Apply opacity
                    if (prop.property("Opacity")) {
                        if (!safeSetValue(prop.property("Opacity"), fillOpacity)) {
                            result.errors++;
                        }
                    }
                }
                // Apply to stroke properties
                else if (matchName === "ADBE Vector Graphic - Stroke") {
                    // Apply visibility
                    if (!safeSetEnabled(prop, strokeVisible)) {
                        result.errors++;
                    }
                    
                    // Apply color
                    if (strokeRgb && prop.property("Color")) {
                        if (!safeSetValue(prop.property("Color"), strokeRgb)) {
                            result.errors++;
                        } else {
                            result.applied = true;
                        }
                    }
                    
                    // Apply blend mode
                    if (prop.property("Blend Mode")) {
                        if (!safeSetValue(prop.property("Blend Mode"), strokeBlendingMode)) {
                            result.errors++;
                        }
                    }
                    
                    // Apply opacity
                    if (prop.property("Opacity")) {
                        if (!safeSetValue(prop.property("Opacity"), strokeOpacity)) {
                            result.errors++;
                        }
                    }
                    
                    // Apply stroke width
                    if (prop.property("Stroke Width")) {
                        if (!safeSetValue(prop.property("Stroke Width"), strokeWidth)) {
                            result.errors++;
                        }
                    }
                    
                    // Apply line cap
                    if (prop.property("Line Cap")) {
                        if (!safeSetValue(prop.property("Line Cap"), strokeLineCap)) {
                            result.errors++;
                        }
                    }
                    
                    // Apply line join
                    if (prop.property("Line Join")) {
                        if (!safeSetValue(prop.property("Line Join"), strokeLineJoin)) {
                            result.errors++;
                        }
                    }
                    
                    // Apply miter limit
                    if (prop.property("Miter Limit")) {
                        if (!safeSetValue(prop.property("Miter Limit"), strokeMiterLimit)) {
                            result.errors++;
                        }
                    }
                    
                    // Apply dashes
                    if (prop.property("Dashes") && strokeDashes.length > 0) {
                        var dashesGroup = prop.property("Dashes");
                        
                        for (var j = 0; j < strokeDashes.length; j++) {
                            var dashItem = strokeDashes[j];
                            // Find matching dash property by name
                            for (var k = 1; k <= dashesGroup.numProperties; k++) {
                                var dashProp = dashesGroup.property(k);
                                if (dashProp.name === dashItem.name) {
                                    if (!safeSetValue(dashProp, dashItem.value)) {
                                        result.errors++;
                                    }
                                    break;
                                }
                            }
                        }
                    }
                    
                    // Apply dash offset
                    if (prop.property("Dash Phase")) {
                        if (!safeSetValue(prop.property("Dash Phase"), strokeDashOffset)) {
                            result.errors++;
                        }
                    }
                    
                    // Apply taper options
                    if (prop.property("Taper") && Object.keys(strokeTaperOption).length > 0) {
                        var taperGroup = prop.property("Taper");
                        
                        for (var taperPropName in strokeTaperOption) {
                            for (var j = 1; j <= taperGroup.numProperties; j++) {
                                var taperProp = taperGroup.property(j);
                                if (taperProp.name === taperPropName) {
                                    if (!safeSetValue(taperProp, strokeTaperOption[taperPropName])) {
                                        result.errors++;
                                    }
                                    break;
                                }
                            }
                        }
                    }
                    
                    // Apply wave options
                    if (prop.property("Wave") && Object.keys(strokeWaveOption).length > 0) {
                        var waveGroup = prop.property("Wave");
                        
                        for (var wavePropName in strokeWaveOption) {
                            for (var j = 1; j <= waveGroup.numProperties; j++) {
                                var waveProp = waveGroup.property(j);
                                if (waveProp.name === wavePropName) {
                                    if (!safeSetValue(waveProp, strokeWaveOption[wavePropName])) {
                                        result.errors++;
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
                // Recursively process nested groups
                else if ((matchName === "ADBE Vector Group" || 
                         prop.propertyType === PropertyType.INDEXED_GROUP || 
                         prop.propertyType === PropertyType.NAMED_GROUP) && 
                         prop.numProperties > 0) {
                    applyProperties(prop);
                }
            }
        }
        
        applyProperties(contents);
        return result;
    }
    
    /**
     * Swap fill and stroke colors in selected shape layers
     */
    function swapFillAndStrokeInSelectedLayers() {
        app.beginUndoGroup("Swap Fill and Stroke Colors");
        
        try {
            var selectedLayers = activeComp.selectedLayers;
            var swappedCount = 0;
            var errorCount = 0;
            
            for (var i = 0; i < selectedLayers.length; i++) {
                var layer = selectedLayers[i];
                
                if (layer instanceof ShapeLayer) {
                    var result = swapColorsInContents(layer.property("Contents"));
                    if (result.swapped) {
                        swappedCount++;
                    }
                    errorCount += result.errors;
                }
            }
            
            if (swappedCount === 0) {
                alert("No fill/stroke pairs found to swap in the selected layers.");
            }
            // No alert for errors anymore
        } catch (error) {
            alert("Error swapping colors: " + error.toString());
        }
        
        app.endUndoGroup();
    }
    
    /**
     * Recursively swap fill and stroke colors in contents
     * @param {PropertyGroup} contents - Contents property group
     * @return {Object} Result with swapped and errors counts
     */
    function swapColorsInContents(contents) {
        if (!contents) return { swapped: false, errors: 0 };
        
        var result = { swapped: false, errors: 0 };
        
        // First, collect all fills and strokes in the group
        var fills = [];
        var strokes = [];
        
        // Collect all fills and strokes
        function collectFillsAndStrokesForSwap(contents) {
            if (!contents) return;
            
            var numProps = contents.numProperties;
            for (var i = 1; i <= numProps; i++) {
                var prop = contents.property(i);
                var matchName = prop.matchName;
                
                // Check property type
                if (matchName === "ADBE Vector Graphic - Fill" && prop.property("Color")) {
                    fills.push({
                        property: prop,
                        color: prop.property("Color").value,
                        enabled: prop.enabled
                    });
                }
                else if (matchName === "ADBE Vector Graphic - Stroke" && prop.property("Color")) {
                    strokes.push({
                        property: prop,
                        color: prop.property("Color").value,
                        enabled: prop.enabled
                    });
                }
                // Check for nested groups
                else if ((matchName === "ADBE Vector Group" || 
                         prop.propertyType === PropertyType.INDEXED_GROUP || 
                         prop.propertyType === PropertyType.NAMED_GROUP) && 
                         prop.numProperties > 0) {
                    collectFillsAndStrokesForSwap(prop);
                }
            }
        }
        
        collectFillsAndStrokesForSwap(contents);
        
        // Now swap the colors
        if (fills.length > 0 && strokes.length > 0) {
            // Get first fill and stroke for swapping
            var fill = fills[0];
            var stroke = strokes[0];
            
            // Swap colors
            var fillColor = fill.color;
            var strokeColor = stroke.color;
            
            // Swap enabled states
            var fillEnabled = fill.enabled;
            var strokeEnabled = stroke.enabled;
            
            // Apply swapped colors and states to all fills and strokes
            for (var i = 0; i < fills.length; i++) {
                if (!safeSetValue(fills[i].property.property("Color"), strokeColor)) {
                    result.errors++;
                }
                if (!safeSetEnabled(fills[i].property, strokeEnabled)) {
                    result.errors++;
                }
            }
            
            for (var i = 0; i < strokes.length; i++) {
                if (!safeSetValue(strokes[i].property.property("Color"), fillColor)) {
                    result.errors++;
                }
                if (!safeSetEnabled(strokes[i].property, fillEnabled)) {
                    result.errors++;
                }
            }
            
            result.swapped = true;
        }
        
        return result;
    }

    /**
     * Fast RGB to HEX conversion with inline padding
     */
    function rgbToHex(rgb) {
        if (!rgb || rgb.length < 3) return "#000000";
        
        // Convert using bit shifts and masks for better performance
        var r = Math.min(255, Math.max(0, Math.round(rgb[0] * 255)));
        var g = Math.min(255, Math.max(0, Math.round(rgb[1] * 255)));
        var b = Math.min(255, Math.max(0, Math.round(rgb[2] * 255)));
        
        return "#" + 
               ((r < 16 ? "0" : "") + r.toString(16).toUpperCase()) +
               ((g < 16 ? "0" : "") + g.toString(16).toUpperCase()) +
               ((b < 16 ? "0" : "") + b.toString(16).toUpperCase());
    }
    
    /**
     * Converts a hex color string to RGB values
     * @param {String} hex - Hex color string (e.g., "#FF5500")
     * @return {Object} Object with r, g, b values (0-255)
     */
    function hexToRgb(hex) {
        // Remove the hash if present
        hex = hex.replace(/^#/, '');
        
        // Parse the hex values
        var r = parseInt(hex.substring(0, 2), 16);
        var g = parseInt(hex.substring(2, 4), 16);
        var b = parseInt(hex.substring(4, 6), 16);
        
        return { r: r, g: g, b: b };
    }

    /**
     * Fast copy to clipboard using the most efficient method available
     * @param {String} text - Text to copy to clipboard
     */
    function writeToClipboard(text) {
        try {
            // Try to use the ScriptUI clipboard first (fastest method)
            if (ScriptUI.clipboard) {
                ScriptUI.clipboard = text;
                return;
            }
            
            // Fall back to system methods if ScriptUI clipboard is not available
            if ($.os.indexOf("Windows") !== -1) {
                // Windows - Use more direct ClipboardData method via VBScript
                var vbscript = 'Set objHTML = CreateObject("htmlfile")\n';
                vbscript += 'Set objClip = objHTML.parentWindow.clipboardData\n';
                vbscript += 'objClip.setData "Text", "' + text.replace(/"/g, '""') + '"\n';
                
                var vbsFile = new File(Folder.temp.absoluteURI + "/clipboard.vbs");
                vbsFile.encoding = "UTF-8";
                vbsFile.open("w");
                vbsFile.write(vbscript);
                vbsFile.close();
                
                system.callSystem('cscript //nologo "' + vbsFile.fsName + '"');
                vbsFile.remove();
            } else {
                // macOS - Use faster AppleScript method
                system.callSystem('osascript -e \'set the clipboard to "' + 
                    text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/'/g, "'\\''") + '"\'');
            }
        } catch (error) {
            // Silent error - don't show alert to avoid disrupting workflow
        }
    }
})();