// -------------------- OPERATION FUNCTIONS --------------------    // This function preserves the current value when removing keyframes
function removePropertyKeyframes(property, skipUndoGroup) {
    if (!property || !property.canSetExpression || property.numKeys === 0) {
        return;
    }
    
    try {
        // Store current value
        var currentTime = app.project.activeItem.time;
        var currentValue = property.valueAtTime(currentTime, true);
        
        // Remove all keyframes
        while (property.numKeys > 0) {
            property.removeKey(1);
        }
        
        // Set the value to what it was at the current time
        if (currentValue !== null && currentValue !== undefined) {
            property.setValue(currentValue);
        }
    } catch (e) {
        // Some properties might cause errors when getting/setting values
    }
}// Layer Utility Script - Improved Version with Toggle Buttons
// This script provides functions for managing layer properties in After Effects

function LayerUtilities(thisObj) {
// -------------------- CONFIGURATION --------------------
var scriptName = "Quick Reset and Delete";
var scriptVersion = "1.2";

// UI Elements
var resetTransformationsBtn, deleteKeyframesBtn, deleteLayerMarkersBtn;
var effectsBtn, toggleEffectsBtn, expressionsBtn, toggleExpressionsBtn;
var deleteMasksBtn, resetAllBtn, statusText;

// -------------------- UTILITY FUNCTIONS --------------------
function isCompActive() {
    return app.project && app.project.activeItem && (app.project.activeItem instanceof CompItem);
}

function hasSelectedLayers() {
    return isCompActive() && app.project.activeItem.selectedLayers.length > 0;
}

function validateCompAndLayers() {
    if (!isCompActive()) {
        updateStatusText("Please select a composition first", true);
        return false;
    }
    
    // No longer validating selected layers - removing that requirement
    return true;
}

function getProperties(property, propertyMatch) {
    var result = [];
    
    try {
        // Handle null properties
        if (!property) return result;
        
        // Check if this is a match
        if (propertyMatch && propertyMatch(property)) {
            result.push(property);
        }
        
        // If it has sub-properties, process them
        if (property.numProperties) {
            for (var i = 1; i <= property.numProperties; i++) {
                var subProperty = property.property(i);
                if (subProperty) {
                    result = result.concat(getProperties(subProperty, propertyMatch));
                }
            }
        }
    } catch (e) {
        // Silently fail for missing or inaccessible properties
    }
    
    return result;
}

// Function to cycle through mask modes
function cycleMaskModes() {
    if (!isCompActive()) {
        updateStatusText("Please select a composition first", true);
        return;
    }
    
    var selectedLayers = app.project.activeItem.selectedLayers;
    
    if (selectedLayers.length === 0) {
        updateStatusText("No layers selected", true);
        return;
    }
    
    // Mask modes to cycle through
    var maskModes = [
        MaskMode.ADD,
        MaskMode.SUBTRACT,
        MaskMode.INTERSECT,
        MaskMode.LIGHTEN,
        MaskMode.DARKEN,
        MaskMode.DIFFERENCE
    ];
    
    // Mode names for status message
    var maskModeNames = {
        1: "Add",
        2: "Subtract",
        3: "Intersect",
        4: "Lighten",
        5: "Darken",
        6: "Difference"
    };
    
    app.beginUndoGroup("Cycle Mask Modes");
    
    var masksModified = 0;
    
    for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        
        try {
            var maskProperty = layer.mask;
            if (maskProperty && maskProperty.numProperties > 0) {
                for (var m = 1; m <= maskProperty.numProperties; m++) {
                    var mask = maskProperty(m);
                    var currentMode = mask.maskMode;
                    
                    // Find the index of the current mode
                    var currentIndex = -1;
                    for (var j = 0; j < maskModes.length; j++) {
                        if (currentMode === maskModes[j]) {
                            currentIndex = j;
                            break;
                        }
                    }
                    
                    // Move to the next mode (or first if not found or at the end)
                    var nextIndex = (currentIndex === -1 || currentIndex === maskModes.length - 1) ? 
                                     0 : currentIndex + 1;
                    
                    // Set the new mode
                    mask.maskMode = maskModes[nextIndex];
                    masksModified++;
                }
            }
        } catch (e) {
            // Skip if masks can't be accessed
        }
    }
    
    if (masksModified > 0) {
        var modeName = maskModeNames[maskModes[nextIndex]] || "Unknown";
        updateStatusText("Changed " + masksModified + " masks to " + modeName + " mode", false);
    } else {
        updateStatusText("No masks found to modify", true);
    }
    
    app.endUndoGroup();
}

// Function to toggle between None and current mask mode
function toggleNoneMaskMode() {
    if (!isCompActive()) {
        updateStatusText("Please select a composition first", true);
        return;
    }
    
    var selectedLayers = app.project.activeItem.selectedLayers;
    
    if (selectedLayers.length === 0) {
        updateStatusText("No layers selected", true);
        return;
    }
    
    app.beginUndoGroup("Toggle Mask Mode None");
    
    var masksToggled = 0;
    var wasNone = false;
    
    for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        
        try {
            var maskProperty = layer.mask;
            if (maskProperty && maskProperty.numProperties > 0) {
                for (var m = 1; m <= maskProperty.numProperties; m++) {
                    var mask = maskProperty(m);
                    
                    // Store the current mode in a custom attribute if it doesn't exist
                    if (mask.maskMode === MaskMode.NONE) {
                        // If mask is None, restore the previous mode or default to Add
                        var prevMode = mask.previousMode || MaskMode.ADD;
                        mask.maskMode = prevMode;
                        wasNone = true;
                    } else {
                        // If mask has a mode, store it and set to None
                        mask.previousMode = mask.maskMode;
                        mask.maskMode = MaskMode.NONE;
                        wasNone = false;
                    }
                    
                    masksToggled++;
                }
            }
        } catch (e) {
            // Skip if masks can't be accessed
        }
    }
    
    if (masksToggled > 0) {
        updateStatusText("Toggled " + masksToggled + " masks to " + (wasNone ? "previous" : "None") + " mode", false);
    } else {
        updateStatusText("No masks found to toggle", true);
    }
    
    app.endUndoGroup();
}

// -------------------- ICON HANDLING --------------------
// Function to get the script folder path
function getScriptFolderPath() {
    var scriptFile = File($.fileName);
    return scriptFile.parent.fsName;
}

// Function to load icon from file
function loadIcon(iconName) {
    var iconFile = new File(getScriptFolderPath() + "/icons/" + iconName + ".png");
    if (iconFile.exists) {
        return iconFile;
    }
    return null;
}

// Function to create icon button
function addIconButton(parent, iconName, fallbackText, tooltip) {
    var iconFile = loadIcon(iconName);
    var button;
    
    if (iconFile && iconFile.exists) {
        // Create button with icon
        button = parent.add("iconbutton", undefined, iconFile, {style: "toolbutton"});
        
        // Set button size to 28x28
        button.preferredSize.width = 28;
        button.preferredSize.height = 28;
    } else {
        // Fallback to text button if icon can't be loaded
        button = parent.add("button", undefined, fallbackText);
        button.preferredSize.width = 28;
        button.preferredSize.height = 28;
    }
    
    button.alignment = ["left", "center"];
    if (tooltip) button.helpTip = tooltip;
    return button;
}

// Function to create a toggle button that switches icons on click
function addToggleIconButton(parent, iconOn, iconOff, initialState, tooltip) {
    // Load the appropriate icon based on initial state
    var initialIcon = initialState ? iconOn : iconOff;
    var btn = addIconButton(parent, initialIcon, initialState ? "ON" : "OFF", tooltip);
    
    // Store the toggle state and icon names
    btn.toggle = initialState;
    btn.iconOn = iconOn;
    btn.iconOff = iconOff;
    
    // Set the button's onClick handler
    btn.onClick = function() {
        // Toggle the state
        btn.toggle = !btn.toggle;
        
        // Change the icon
        var iconFile = loadIcon(btn.toggle ? btn.iconOn : btn.iconOff);
        if (iconFile && iconFile.exists) {
            btn.image = iconFile;
        } else {
            // If no icon, update the text
            btn.text = btn.toggle ? "ON" : "OFF";
        }
        
        // Call the appropriate function based on toggle state
        if (this === toggleEffectsBtn) {
            setEffectsEnabled(btn.toggle);
        } else if (this === toggleExpressionsBtn) {
            setExpressionsEnabled(btn.toggle);
        }
    };
    
    return btn;
}

// -------------------- UI FUNCTIONS --------------------
function createGroup(parent, orientation) {
    var group = parent.add("group");
    group.orientation = orientation || "column";
    group.spacing = 2; // Reduced from 3
    group.alignChildren = ["fill", "top"];
    group.alignment = ["fill", "top"];
    return group;
}

function addButton(parent, text, tooltip) {
    var button = parent.add("button", undefined, text);
    button.alignment = ["fill", "fill"];
    if (tooltip) button.helpTip = tooltip;
    return button;
}

function updateStatusText(text, isError) {
    if (statusText) {
        statusText.text = text || "";
        statusText.graphics.foregroundColor = isError ? 
            statusText.graphics.newPen(statusText.graphics.PenType.SOLID_COLOR, [1, 0.4, 0.4, 1], 1) :
            statusText.graphics.newPen(statusText.graphics.PenType.SOLID_COLOR, [0.3, 0.7, 0.3, 1], 1);
    }
}

function refreshUI() {
    refreshCheckboxes();
    // No longer calling updateButtonStates() since buttons always remain active
}

function updateButtonStates() {
    // No longer disabling buttons - all buttons remain active
    // Only here for backward compatibility with any other code that might call this
}

function refreshCheckboxes() {
    var activeComp = app.project.activeItem;
    if (!isCompActive() || !hasSelectedLayers()) {
        return;
    }
    
    var allEffectsEnabled = true;
    var allExpressionsEnabled = true;
    var selectedLayers = activeComp.selectedLayers;
    
    // Check each selected layer
    for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        
        // Check effects
        var effectsFolder = null;
        try {
            effectsFolder = layer.property("ADBE Effect Parade");
            if (effectsFolder && effectsFolder.numProperties > 0) {
                for (var e = 1; e <= effectsFolder.numProperties; e++) {
                    if (effectsFolder.property(e).enabled === false) {
                        allEffectsEnabled = false;
                        break;
                    }
                }
            }
        } catch (e) {
            // Skip if effects can't be accessed
        }
        
        // Check expressions
        var hasDisabledExpressions = false;
        var expressionProperties = getProperties(layer, function(prop) {
            return prop.propertyType === PropertyType.PROPERTY && 
                   prop.canSetExpression && 
                   prop.expression !== "";
        });
        
        for (var p = 0; p < expressionProperties.length; p++) {
            if (!expressionProperties[p].expressionEnabled) {
                hasDisabledExpressions = true;
                allExpressionsEnabled = false;
                break;
            }
        }
        
        // Break early if both are already found to be false
        if (!allEffectsEnabled && !allExpressionsEnabled) {
            break;
        }
    }
    
    // Update toggle buttons if they exist and their state has changed
    if (toggleEffectsBtn && toggleEffectsBtn.toggle !== allEffectsEnabled) {
        // Update the internal toggle state
        toggleEffectsBtn.toggle = allEffectsEnabled;
        
        // Update the icon
        var effectsIconFile = loadIcon(allEffectsEnabled ? toggleEffectsBtn.iconOn : toggleEffectsBtn.iconOff);
        if (effectsIconFile && effectsIconFile.exists) {
            toggleEffectsBtn.image = effectsIconFile;
        } else {
            toggleEffectsBtn.text = allEffectsEnabled ? "ON" : "OFF";
        }
    }
    
    if (toggleExpressionsBtn && toggleExpressionsBtn.toggle !== allExpressionsEnabled) {
        // Update the internal toggle state
        toggleExpressionsBtn.toggle = allExpressionsEnabled;
        
        // Update the icon
        var expressionsIconFile = loadIcon(allExpressionsEnabled ? toggleExpressionsBtn.iconOn : toggleExpressionsBtn.iconOff);
        if (expressionsIconFile && expressionsIconFile.exists) {
            toggleExpressionsBtn.image = expressionsIconFile;
        } else {
            toggleExpressionsBtn.text = allExpressionsEnabled ? "ON" : "OFF";
        }
    }
}

// Find transform groups within shape contents
function findShapeTransforms(property) {
    var result = [];
    
    try {
        // Handle null properties
        if (!property) return result;
        
        // Check if this is a transform group
        if (property.matchName === "ADBE Vector Transform Group") {
            result.push(property);
        }
        
        // If it has sub-properties, process them
        if (property.numProperties) {
            for (var i = 1; i <= property.numProperties; i++) {
                var subProperty = property.property(i);
                if (subProperty) {
                    result = result.concat(findShapeTransforms(subProperty));
                }
            }
        }
    } catch (e) {
        // Silently fail for inaccessible properties
    }
    
    return result;
}
function deleteKeyframes(skipUndoGroup) {
    if (!isCompActive()) {
        if (!skipUndoGroup) updateStatusText("Please select a composition first", true);
        return 0;
    }
    
    if (!skipUndoGroup) app.beginUndoGroup("Delete Keyframes");
    
    var activeComp = app.project.activeItem;
    var selectedLayers = activeComp.selectedLayers;
    var selectedProps = activeComp.selectedProperties;
    var hasSelectedKeyframes = false;
    var operationCount = 0;
    
    // If no layers are selected, there's nothing to do
    if (selectedLayers.length === 0) {
        if (!skipUndoGroup) {
            updateStatusText("No layers selected", true);
            app.endUndoGroup();
        }
        return 0;
    }
    
    // Try to handle selected properties with keyframes first
    if (selectedProps && selectedProps.length > 0) {
        for (var i = 0; i < selectedProps.length; i++) {
            var prop = selectedProps[i];
            
            if (prop.propertyType === PropertyType.PROPERTY && 
                prop.canSetExpression && 
                prop.numKeys > 0) {
                
                // Check for selected keyframes
                var keysToRemove = [];
                
                for (var k = 1; k <= prop.numKeys; k++) {
                    if (prop.keySelected(k)) {
                        keysToRemove.push(k);
                        hasSelectedKeyframes = true;
                    }
                }
                
                // Remove selected keyframes (in reverse order)
                if (keysToRemove.length > 0) {
                    keysToRemove.sort(function(a, b) { return b - a; });
                    for (var j = 0; j < keysToRemove.length; j++) {
                        prop.removeKey(keysToRemove[j]);
                        operationCount++;
                    }
                }
            }
        }
    }
    
    // If no keyframes were directly selected, remove all keyframes
    if (!hasSelectedKeyframes) {
        for (var i = 0; i < selectedLayers.length; i++) {
            var layer = selectedLayers[i];
            var keyframeProperties = getProperties(layer, function(prop) {
                return prop.propertyType === PropertyType.PROPERTY && 
                       prop.canSetExpression && 
                       prop.numKeys > 0;
            });
            
            for (var p = 0; p < keyframeProperties.length; p++) {
                var keyCount = keyframeProperties[p].numKeys;
                removePropertyKeyframes(keyframeProperties[p]);
                operationCount += keyCount;
            }
        }
    }
    
    if (!skipUndoGroup) {
        updateStatusText("Removed " + operationCount + " keyframes", false);
        app.endUndoGroup();
    } else {
        return operationCount;
    }
}

function deleteLayerMarkers(skipUndoGroup) {
    if (!isCompActive()) {
        if (!skipUndoGroup) updateStatusText("Please select a composition first", true);
        return 0;
    }
    
    if (!skipUndoGroup) app.beginUndoGroup("Delete Layer Markers");
    
    var selectedLayers = app.project.activeItem.selectedLayers;
    var totalMarkersRemoved = 0;
    
    // If no layers are selected, there's nothing to do
    if (selectedLayers.length === 0) {
        if (!skipUndoGroup) {
            updateStatusText("No layers selected", true);
            app.endUndoGroup();
        }
        return 0;
    }
    
    for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        
        try {
            if (layer.marker && layer.marker.numKeys > 0) {
                var numMarkers = layer.marker.numKeys;
                while (layer.marker.numKeys > 0) {
                    layer.marker.removeKey(1);
                }
                totalMarkersRemoved += numMarkers;
            }
        } catch (e) {
            // Skip if markers can't be accessed
        }
    }
    
    if (!skipUndoGroup) {
        updateStatusText("Removed " + totalMarkersRemoved + " markers", false);
        app.endUndoGroup();
    } else {
        return totalMarkersRemoved;
    }
}

function deleteEffects(skipUndoGroup) {
    if (!isCompActive()) {
        if (!skipUndoGroup) updateStatusText("Please select a composition first", true);
        return 0;
    }
    
    if (!skipUndoGroup) app.beginUndoGroup("Delete Effects");
    
    var selectedLayers = app.project.activeItem.selectedLayers;
    var totalEffectsRemoved = 0;
    
    // If no layers are selected, there's nothing to do
    if (selectedLayers.length === 0) {
        if (!skipUndoGroup) {
            updateStatusText("No layers selected", true);
            app.endUndoGroup();
        }
        return 0;
    }
    
    for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        
        try {
            var effectsFolder = layer.property("ADBE Effect Parade");
            if (effectsFolder) {
                var numEffects = effectsFolder.numProperties;
                while (effectsFolder.numProperties > 0) {
                    effectsFolder.property(1).remove();
                }
                totalEffectsRemoved += numEffects;
            }
        } catch (e) {
            // Skip if effects can't be accessed
        }
    }
    
    if (!skipUndoGroup) {
        updateStatusText("Removed " + totalEffectsRemoved + " effects", false);
        refreshCheckboxes();
        app.endUndoGroup();
    } else {
        refreshCheckboxes();
        return totalEffectsRemoved;
    }
}

function deleteDisabledEffects() {
    if (!validateCompAndLayers()) return;
    
    app.beginUndoGroup("Delete Disabled Effects");
    
    var selectedLayers = app.project.activeItem.selectedLayers;
    var totalEffectsRemoved = 0;
    
    for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        
        try {
            var effectsFolder = layer.property("ADBE Effect Parade");
            if (effectsFolder && effectsFolder.numProperties > 0) {
                // Remove effects from back to front to avoid index issues
                for (var e = effectsFolder.numProperties; e >= 1; e--) {
                    var effect = effectsFolder.property(e);
                    // Check if the effect is enabled
                    if (effect.enabled === false) {
                        effect.remove();
                        totalEffectsRemoved++;
                    }
                }
            }
        } catch (e) {
            // Skip if effects can't be accessed
        }
    }
    
    updateStatusText("Removed " + totalEffectsRemoved + " disabled effects", false);
    refreshCheckboxes();
    app.endUndoGroup();
}

function setEffectsEnabled(enabled) {
    if (!validateCompAndLayers()) return;
    
    var action = enabled ? "Enable" : "Disable";
    app.beginUndoGroup(action + " Effects");
    
    var selectedLayers = app.project.activeItem.selectedLayers;
    var effectsModified = 0;
    
    for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        
        try {
            var effectsFolder = layer.property("ADBE Effect Parade");
            if (effectsFolder && effectsFolder.numProperties > 0) {
                for (var e = 1; e <= effectsFolder.numProperties; e++) {
                    effectsFolder.property(e).enabled = enabled;
                    effectsModified++;
                }
            }
        } catch (e) {
            // Skip if effects can't be accessed
        }
    }
    
    updateStatusText((enabled ? "Enabled " : "Disabled ") + effectsModified + " effects", false);
    refreshCheckboxes();
    app.endUndoGroup();
}

function deleteExpressions(skipUndoGroup) {
    if (!isCompActive()) {
        if (!skipUndoGroup) updateStatusText("Please select a composition first", true);
        return 0;
    }
    
    if (!skipUndoGroup) app.beginUndoGroup("Delete Expressions");
    
    var selectedLayers = app.project.activeItem.selectedLayers;
    var totalExpressionsRemoved = 0;
    
    // If no layers are selected, there's nothing to do
    if (selectedLayers.length === 0) {
        if (!skipUndoGroup) {
            updateStatusText("No layers selected", true);
            app.endUndoGroup();
        }
        return 0;
    }
    
    for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        
        var expressionProperties = getProperties(layer, function(prop) {
            return prop.propertyType === PropertyType.PROPERTY && 
                   prop.canSetExpression && 
                   prop.expression !== "";
        });
        
        for (var p = 0; p < expressionProperties.length; p++) {
            try {
                var prop = expressionProperties[p];
                // Store current value
                var currentValue = prop.value;
                // Remove expression
                prop.expression = "";
                // Set value back
                if (currentValue !== null && currentValue !== undefined) {
                    try {
                        prop.setValue(currentValue);
                    } catch (e) {
                        // Some properties might not accept setValue after expression removal
                    }
                }
                totalExpressionsRemoved++;
            } catch (e) {
                // Skip if expression can't be removed
            }
        }
    }
    
    if (!skipUndoGroup) {
        updateStatusText("Removed " + totalExpressionsRemoved + " expressions", false);
        refreshCheckboxes();
        app.endUndoGroup();
    } else {
        refreshCheckboxes();
        return totalExpressionsRemoved;
    }
}

function deleteDisabledExpressions() {
    if (!validateCompAndLayers()) return;
    
    app.beginUndoGroup("Delete Disabled Expressions");
    
    var selectedLayers = app.project.activeItem.selectedLayers;
    var totalExpressionsRemoved = 0;
    
    for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        
        var disabledExpressionProperties = getProperties(layer, function(prop) {
            return prop.propertyType === PropertyType.PROPERTY && 
                   prop.canSetExpression && 
                   prop.expression !== "" && 
                   !prop.expressionEnabled;
        });
        
        for (var p = 0; p < disabledExpressionProperties.length; p++) {
            try {
                var prop = disabledExpressionProperties[p];
                // Store current value
                var currentValue = prop.value;
                // Remove expression
                prop.expression = "";
                // Set value back
                if (currentValue !== null && currentValue !== undefined) {
                    try {
                        prop.setValue(currentValue);
                    } catch (e) {
                        // Some properties might not accept setValue after expression removal
                    }
                }
                totalExpressionsRemoved++;
            } catch (e) {
                // Skip if expression can't be removed
            }
        }
    }
    
    updateStatusText("Removed " + totalExpressionsRemoved + " disabled expressions", false);
    refreshCheckboxes();
    app.endUndoGroup();
}

function setExpressionsEnabled(enabled) {
    if (!validateCompAndLayers()) return;
    
    var action = enabled ? "Enable" : "Disable";
    app.beginUndoGroup(action + " Expressions");
    
    var selectedLayers = app.project.activeItem.selectedLayers;
    var expressionsModified = 0;
    
    for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        expressionsModified += processPropertyGroupForExpressionToggle(layer, enabled);
    }
    
    updateStatusText((enabled ? "Enabled " : "Disabled ") + expressionsModified + " expressions", false);
    refreshCheckboxes();
    app.endUndoGroup();
}

function processPropertyGroupForExpressionToggle(propertyGroup, enabled) {
    if (propertyGroup == null) return 0;
    var count = 0;

    // Process properties
    for (var i = 1; i <= propertyGroup.numProperties; i++) {
        var prop = propertyGroup.property(i);
        
        // If property has sub-properties, process them
        if (prop.propertyType === PropertyType.INDEXED_GROUP || 
            prop.propertyType === PropertyType.NAMED_GROUP) {
            count += processPropertyGroupForExpressionToggle(prop, enabled);
        }
        // If it's a regular property with an expression, enable/disable it
        else if (prop.propertyType === PropertyType.PROPERTY && 
                prop.canSetExpression && prop.expression !== "") {
            prop.expressionEnabled = enabled;
            count++;
        }
    }
    
    return count;
}

function deleteMasks(skipUndoGroup) {
    if (!isCompActive()) {
        if (!skipUndoGroup) updateStatusText("Please select a composition first", true);
        return 0;
    }
    
    if (!skipUndoGroup) app.beginUndoGroup("Delete Masks");
    
    var selectedLayers = app.project.activeItem.selectedLayers;
    var totalMasksRemoved = 0;
    
    // If no layers are selected, there's nothing to do
    if (selectedLayers.length === 0) {
        if (!skipUndoGroup) {
            updateStatusText("No layers selected", true);
            app.endUndoGroup();
        }
        return 0;
    }
    
    for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        
        try {
            var maskProperty = layer.mask;
            if (maskProperty) {
                var numMasks = maskProperty.numProperties;
                // Remove masks from back to front to avoid index issues
                for (var m = numMasks; m >= 1; m--) {
                    maskProperty(m).remove();
                }
                totalMasksRemoved += numMasks;
            }
        } catch (e) {
            // Skip if masks can't be accessed
        }
    }
    
    if (!skipUndoGroup) {
        updateStatusText("Removed " + totalMasksRemoved + " masks", false);
        app.endUndoGroup();
    } else {
        return totalMasksRemoved;
    }
}

function resetTransformations(skipUndoGroup) {
    if (!isCompActive()) {
        if (!skipUndoGroup) updateStatusText("Please select a composition first", true);
        return 0;
    }
    
    if (!skipUndoGroup) app.beginUndoGroup("Reset Transformations");
    
    var activeComp = app.project.activeItem;
    var selectedLayers = activeComp.selectedLayers;
    var transformsReset = 0;
    var shapeTransformsReset = 0;
    var shapeLayers = 0;
    
    // If no layers are selected, there's nothing to do
    if (selectedLayers.length === 0) {
        if (!skipUndoGroup) {
            updateStatusText("No layers selected", true);
            app.endUndoGroup();
        }
        return 0;
    }
    
    for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        
        // PART 1: Reset layer transforms
        var transform = layer.transform;
        var transformCount = 0;
        
        // Position (handle both combined and separate dimensions)
        try {
            if (transform.position) {
                // Set value directly without removing keyframes
                if (layer instanceof CameraLayer) {
                    transform.position.setValue([activeComp.width/2, activeComp.height/2, -activeComp.width * 0.5]);
                } else {
                    transform.position.setValue([activeComp.width/2, activeComp.height/2, 0]);
                }
                transformCount++;
            }
        } catch (e) {}
        
        try {
            if (transform.xPosition) {
                // Set value directly without removing keyframes
                transform.xPosition.setValue(activeComp.width/2);
                transform.yPosition.setValue(activeComp.height/2);
                transformCount += 2;
                
                if (transform.zPosition) {
                    transform.zPosition.setValue(0);
                    transformCount++;
                }
            }
        } catch (e) {}
        
        // Scale
        try {
            if (transform.scale) {
                // Set value directly without removing keyframes
                transform.scale.setValue([100, 100, 100]);
                transformCount++;
            }
        } catch (e) {}
        
        // Rotation (handle both 2D and 3D)
        try {
            if (transform.rotation) {
                // Set value directly without removing keyframes
                transform.rotation.setValue(0);
                transformCount++;
            }
        } catch (e) {}
        
        try {
            if (transform.orientation) {
                // Set value directly without removing keyframes
                transform.orientation.setValue([0, 0, 0]);
                transformCount++;
            }
        } catch (e) {}
        
        try {
            if (transform.xRotation) {
                // Set value directly without removing keyframes
                transform.xRotation.setValue(0);
                transform.yRotation.setValue(0);
                transform.zRotation.setValue(0);
                transformCount += 3;
            }
        } catch (e) {}
        
        // Opacity
        try {
            if (transform.opacity) {
                // Set value directly without removing keyframes
                transform.opacity.setValue(100);
                transformCount++;
            }
        } catch (e) {}
        
        // Anchor point
        try {
            if (transform.anchorPoint) {
                // Set value directly without removing keyframes
                if (layer.threeDLayer) {
                    transform.anchorPoint.setValue([0, 0, 0]);
                } else {
                    transform.anchorPoint.setValue([0, 0]);
                }
                transformCount++;
            }
        } catch (e) {}
        
        transformsReset += transformCount;
        
        // PART 2: Reset shape transforms if it's a shape layer
        if (layer instanceof ShapeLayer) {
            shapeLayers++;
            try {
                var contents = layer.property("ADBE Root Vectors Group");
                if (contents) {
                    // Find all transform groups
                    var transformGroups = findShapeTransforms(contents);
                    
                    // Reset each transform property in each group
                    for (var t = 0; t < transformGroups.length; t++) {
                        var transformGroup = transformGroups[t];
                        var shapeResetCount = 0;
                        
                        // Position
                        if (transformGroup.property("ADBE Vector Position")) {
                            transformGroup.property("ADBE Vector Position").setValue([0, 0]);
                            shapeResetCount++;
                        }
                        
                        // Anchor Point
                        if (transformGroup.property("ADBE Vector Anchor")) {
                            transformGroup.property("ADBE Vector Anchor").setValue([0, 0]);
                            shapeResetCount++;
                        }
                        
                        // Scale
                        if (transformGroup.property("ADBE Vector Scale")) {
                            transformGroup.property("ADBE Vector Scale").setValue([100, 100]);
                            shapeResetCount++;
                        }
                        
                        // Rotation
                        if (transformGroup.property("ADBE Vector Rotation")) {
                            transformGroup.property("ADBE Vector Rotation").setValue(0);
                            shapeResetCount++;
                        }
                        
                        // Opacity (if it exists)
                        if (transformGroup.property("ADBE Vector Group Opacity")) {
                            transformGroup.property("ADBE Vector Group Opacity").setValue(100);
                            shapeResetCount++;
                        }
                        
                        // Skew (if it exists)
                        if (transformGroup.property("ADBE Vector Skew")) {
                            transformGroup.property("ADBE Vector Skew").setValue(0);
                            shapeResetCount++;
                        }
                        
                        // Skew Axis (if it exists)
                        if (transformGroup.property("ADBE Vector Skew Axis")) {
                            transformGroup.property("ADBE Vector Skew Axis").setValue(0);
                            shapeResetCount++;
                        }
                        
                        shapeTransformsReset += shapeResetCount;
                    }
                }
            } catch (e) {
                // Skip if contents can't be accessed
            }
        }
    }
    
    if (!skipUndoGroup) {
        var statusMsg = "Reset " + transformsReset + " layer transform properties";
        if (shapeLayers > 0) {
            statusMsg += " and " + shapeTransformsReset + " shape transform properties in " + shapeLayers + " shape layer(s)";
        }
        updateStatusText(statusMsg, false);
        app.endUndoGroup();
    } else {
        return transformsReset + shapeTransformsReset;
    }
}

function resetAll() {
    if (!isCompActive()) {
        updateStatusText("Please select a composition first", true);
        return;
    }
    
    app.beginUndoGroup("Reset All");
    
    // Track operation counts
    var keyframesRemoved = deleteKeyframes(true);
    var markersRemoved = deleteLayerMarkers(true);
    var effectsRemoved = deleteEffects(true);
    var expressionsRemoved = deleteExpressions(true);
    var masksRemoved = deleteMasks(true);
    var transformsReset = resetTransformations(true); // This now includes shape transforms too
    
    var totalLayers = app.project.activeItem.selectedLayers.length;
    
    updateStatusText("Reset completed on " + totalLayers + " layers", false);
    app.endUndoGroup();
}

// -------------------- UI CREATION --------------------
function buildUI(thisObj) {
    var panel = (thisObj instanceof Panel) ? thisObj : new Window("palette", scriptName, undefined, {resizeable: true});
    panel.orientation = "column";
    panel.alignChildren = ["fill", "top"];
    panel.spacing = 2; // Reduced from 5
    panel.margins = 6; // Reduced from 10
    
    // Set a minimum size for the panel
    panel.minimumSize = [400, 80]; // Width increased, height reduced
    
    // Single row toolbar with grouped functions
    var mainRow = panel.add("group");
    mainRow.orientation = "row";
    mainRow.alignChildren = ["left", "center"];
    mainRow.spacing = 2; // Reduced from 4
    mainRow.alignment = ["fill", "top"];
    
    // Group 1: Transform functions
    var transformGroup = mainRow.add("group");
    transformGroup.orientation = "row";
    transformGroup.alignChildren = ["left", "center"];
    transformGroup.spacing = 1; // Reduced from 4
    
    resetTransformationsBtn = addIconButton(transformGroup, "reset", "T", "Reset Transformations (including shape transforms)");
    
    // Add spacer (smaller)
    mainRow.add("statictext", undefined, " ");
    
    // Group 2: Keyframe functions
    var keyframeGroup = mainRow.add("group");
    keyframeGroup.orientation = "row";
    keyframeGroup.alignChildren = ["left", "center"];
    keyframeGroup.spacing = 1; // Reduced from 4
    
    deleteKeyframesBtn = addIconButton(keyframeGroup, "key", "K", "Delete Keyframes");
    deleteLayerMarkersBtn = addIconButton(keyframeGroup, "marker", "M", "Delete Layer Markers");
    
    // Add spacer (16px)
    mainRow.add("statictext", undefined, "   ");
    
    // Group 3: Effects functions
    var effectsGroup = mainRow.add("group");
    effectsGroup.orientation = "row";
    effectsGroup.alignChildren = ["left", "center"];
    effectsGroup.spacing = 1; // Reduced from 4
    
    effectsBtn = addIconButton(effectsGroup, "fx", "FX", "Delete Effects (Alt: delete disabled only)");
    toggleEffectsBtn = addToggleIconButton(effectsGroup, "fx_on", "fx_off", true, "Toggle Effects On/Off");
    
    // Add spacer (16px)
    mainRow.add("statictext", undefined, "   ");
    
    // Group 4: Expression functions
    var expressionGroup = mainRow.add("group");
    expressionGroup.orientation = "row";
    expressionGroup.alignChildren = ["left", "center"];
    expressionGroup.spacing = 1; // Reduced from 4
    
    expressionsBtn = addIconButton(expressionGroup, "ex", "EX", "Delete Expressions (Alt: delete disabled only)");
    toggleExpressionsBtn = addToggleIconButton(expressionGroup, "ex_on", "ex_off", true, "Toggle Expressions On/Off");
    
    // Add spacer (16px)
    mainRow.add("statictext", undefined, "   ");
    
    // Group 5: Mask functions
    var maskGroup = mainRow.add("group");
    maskGroup.orientation = "row";
    maskGroup.alignChildren = ["left", "center"];
    maskGroup.spacing = 1; // Reduced from 4
    
    deleteMasksBtn = addIconButton(maskGroup, "mask", "Ma", "Delete Masks (Shift: Cycle Modes, Alt: Toggle None)");
    
    // Add spacer (16px)
    mainRow.add("statictext", undefined, "   ");
    
    // Group 6: Reset All
    var resetGroup = mainRow.add("group");
    resetGroup.orientation = "row";
    resetGroup.alignChildren = ["left", "center"];
    resetGroup.spacing = 1; // Reduced from 4
    
    resetAllBtn = addIconButton(resetGroup, "resetall", "All", "Reset All Properties (including shape transforms)");
    
    // Status text
    var statusGroup = panel.add("group");
    statusGroup.orientation = "row";
    statusGroup.alignChildren = ["fill", "center"];
    statusGroup.alignment = ["fill", "bottom"];
    
    statusText = statusGroup.add("statictext", undefined, "Ready");
    statusText.alignment = ["fill", "center"];
    
    // Add event listeners
    resetTransformationsBtn.onClick = function() { resetTransformations(); };
    deleteKeyframesBtn.onClick = function() { deleteKeyframes(); };
    deleteLayerMarkersBtn.onClick = function() { deleteLayerMarkers(); };
    
    effectsBtn.onClick = function() {
        var keyState = ScriptUI.environment.keyboardState;
        if (keyState.altKey || keyState.metaKey) {
            deleteDisabledEffects();
        } else {
            deleteEffects();
        }
    };
    
    expressionsBtn.onClick = function() {
        var keyState = ScriptUI.environment.keyboardState;
        if (keyState.altKey || keyState.metaKey) {
            deleteDisabledExpressions();
        } else {
            deleteExpressions();
        }
    };
    
    deleteMasksBtn.onClick = function() { 
        // Check for modifier keys
        var keyState = ScriptUI.environment.keyboardState;
        
        if (keyState.shiftKey) {
            // Shift+Click: Cycle through mask modes
            cycleMaskModes();
        } else if (keyState.altKey || keyState.metaKey) {
            // Alt/Option+Click: Toggle None mask mode
            toggleNoneMaskMode();
        } else {
            // Normal Click: Delete masks
            deleteMasks(); 
        }
    };
    resetAllBtn.onClick = function() { resetAll(); };
    
    // Set up activation handlers
    panel.onShow = refreshUI;
    panel.onActivate = refreshUI;
    
    // Set up resize behavior
    panel.layout.layout(true);
    if (panel instanceof Window) {
        panel.onResizing = panel.onResize = function() {
            this.layout.resize();
        };
    }
    
    return panel;
}

// Create and show the panel
var panelGlobal = buildUI(thisObj);

// Force layout update to ensure all sizing is applied correctly
panelGlobal.layout.layout(true);

if (panelGlobal instanceof Window) {
    panelGlobal.center();
    panelGlobal.show();
} else {
    // For dockable panels, we need to manually adjust the size
    panelGlobal.layout.resize();
}
}

// Execute the script with "this" as the context
LayerUtilities(this);