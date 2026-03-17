// Remove Keyframes Outside Canvas - After Effects Script
// This script removes keyframes on all properties of selected layers
// when the layer's position is outside the composition area
// Takes anchor points into consideration when calculating position

(function removeKeyframesOutsideCanvas() {
    
    // Check if After Effects is available
    if (typeof app === "undefined") {
        alert("This script must be run in After Effects.");
        return;
    }
    
    // Get active composition
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        alert("Please select a composition.");
        return;
    }
    
    // Get selected layers
    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length === 0) {
        alert("Please select one or more layers.");
        return;
    }
    
    // Show UI to get user settings
    var userSettings = showUI();
    if (!userSettings) {
        return; // User cancelled
    }
    
    // Begin undo group
    app.beginUndoGroup("Remove Keyframes Outside Canvas");
    
    try {
        var removedKeyframesCount = 0;
        var processedLayers = 0;
        var processedProperties = 0;
        
        if (userSettings.action === "removeOutside") {
            // Process each selected layer
            for (var i = 0; i < selectedLayers.length; i++) {
                var layer = selectedLayers[i];
                
                // Skip layers that don't have position property (like cameras, lights in some cases)
                if (!layer.position) continue;
                
                processedLayers++;
                removedKeyframesCount += processLayer(layer, comp, userSettings.margin);
            }
            
            alert("Processing complete!\n" +
                  "Mode: Remove Outside Canvas\n" +
                  "Layers processed: " + processedLayers + "\n" +
                  "Keyframes removed: " + removedKeyframesCount + "\n" +
                  "Margin used: " + userSettings.margin + "px");
        } else {
            var optimizeResult = optimizeSelectedLayers(comp, selectedLayers, userSettings);
            removedKeyframesCount = optimizeResult.removedKeyframes;
            processedLayers = optimizeResult.processedLayers;
            processedProperties = optimizeResult.processedProperties;
            
            alert("Processing complete!\n" +
                  "Mode: " + userSettings.actionLabel + "\n" +
                  "Optimizer mode: " + userSettings.modeLabel + "\n" +
                  "Layers processed: " + processedLayers + "\n" +
                  "Properties simplified: " + processedProperties + "\n" +
                  "Keyframes removed: " + removedKeyframesCount + "\n" +
                  "Tolerance used: " + userSettings.toleranceDisplay);
        }
              
    } catch (error) {
        alert("Error: " + error.message);
    } finally {
        app.endUndoGroup();
    }
    
    
    // Function to show UI and get user settings
    function showUI() {
        var dialog = new Window("dialog", "Keyframe Cleanup Tools");
        dialog.orientation = "column";
        dialog.alignChildren = "fill";
        dialog.spacing = 14;
        dialog.margins = 18;
        
        // Workflow tabs
        var tabs = dialog.add("tabbedpanel");
        tabs.alignChildren = "fill";
        tabs.preferredSize.width = 430;
        tabs.preferredSize.height = 260;
        
        var removeTab = tabs.add("tab", undefined, "Remove Outside");
        removeTab.orientation = "column";
        removeTab.alignChildren = "fill";
        removeTab.margins = 0;
        removeTab.spacing = 0;
        
        var removeContainer = removeTab.add("panel");
        removeContainer.orientation = "column";
        removeContainer.alignChildren = "fill";
        removeContainer.margins = 14;
        removeContainer.spacing = 12;
        
        var removeIntro = removeContainer.add("statictext", undefined, "Remove keys from selected layers when they are outside the comp bounds.");
        removeIntro.preferredSize.width = 380;
        removeIntro.justify = "left";
        
        var removeSettings = removeContainer.add("group");
        removeSettings.orientation = "column";
        removeSettings.alignChildren = "fill";
        removeSettings.spacing = 10;
        
        var marginGroup = removeSettings.add("group");
        marginGroup.orientation = "row";
        marginGroup.alignChildren = "center";
        marginGroup.spacing = 12;
        
        marginGroup.add("statictext", undefined, "Margin:");
        var marginSlider = marginGroup.add("slider", undefined, 0, 0, 500);
        marginSlider.preferredSize.width = 210;
        var marginEdit = marginGroup.add("edittext", undefined, "0");
        marginEdit.preferredSize.width = 70;
        marginEdit.alignment = "left";
        
        var marginHelp = removeSettings.add("statictext", undefined, "Use 0 to remove keys when a layer is fully outside.\nIncrease it to wait until the layer is further off-canvas.", {multiline: true});
        marginHelp.preferredSize.width = 380;
        
        // Quick Optimize settings
        var quickTab = tabs.add("tab", undefined, "Quick Optimize");
        quickTab.orientation = "column";
        quickTab.alignChildren = "fill";
        quickTab.margins = 0;
        quickTab.spacing = 0;
        
        var quickContainer = quickTab.add("panel");
        quickContainer.orientation = "column";
        quickContainer.alignChildren = "fill";
        quickContainer.margins = 14;
        quickContainer.spacing = 12;
        
        var quickIntro = quickContainer.add("statictext", undefined, "One-click simplification using a conservative Value Mode pass.");
        quickIntro.preferredSize.width = 380;
        quickIntro.justify = "left";
        
        var quickPanel = quickContainer.add("group");
        quickPanel.orientation = "column";
        quickPanel.alignChildren = "fill";
        quickPanel.spacing = 10;
        
        var quickInfo1 = quickPanel.add("statictext", undefined, "Applies a sensible default pass with no extra setup.");
        var quickInfo2 = quickPanel.add("statictext", undefined, "Best for most animations when you want a faster, one-click cleanup.");
        quickInfo1.preferredSize.width = 380;
        quickInfo2.preferredSize.width = 380;
        
        // Advanced Optimize settings
        var advancedTab = tabs.add("tab", undefined, "Advanced Optimize");
        advancedTab.orientation = "column";
        advancedTab.alignChildren = "fill";
        advancedTab.margins = 0;
        advancedTab.spacing = 0;
        
        var advancedContainer = advancedTab.add("panel");
        advancedContainer.orientation = "column";
        advancedContainer.alignChildren = "fill";
        advancedContainer.margins = 14;
        advancedContainer.spacing = 12;
        
        var advancedIntro = advancedContainer.add("statictext", undefined, "Choose an optimize mode and tune the tolerance for more control.");
        advancedIntro.preferredSize.width = 380;
        advancedIntro.justify = "left";
        
        var advancedPanel = advancedContainer.add("group");
        advancedPanel.orientation = "column";
        advancedPanel.alignChildren = "fill";
        advancedPanel.spacing = 12;
        
        var modeGroup = advancedPanel.add("group");
        modeGroup.orientation = "row";
        modeGroup.alignChildren = "center";
        modeGroup.spacing = 12;
        var modeLabel = modeGroup.add("statictext", undefined, "Mode:");
        modeLabel.preferredSize.width = 72;
        var valueModeRadio = modeGroup.add("radiobutton", undefined, "Value Mode");
        var timeModeRadio = modeGroup.add("radiobutton", undefined, "Time Mode");
        valueModeRadio.value = true;
        
        var toleranceRow = advancedPanel.add("group");
        toleranceRow.orientation = "row";
        toleranceRow.alignChildren = "center";
        toleranceRow.spacing = 12;
        var toleranceLabel = toleranceRow.add("statictext", undefined, "Tolerance:");
        toleranceLabel.preferredSize.width = 72;
        var toleranceSlider = toleranceRow.add("slider", undefined, 10, 1, 100);
        toleranceSlider.preferredSize.width = 210;
        var toleranceEdit = toleranceRow.add("edittext", undefined, "1.0");
        toleranceEdit.preferredSize.width = 70;
        toleranceEdit.alignment = "left";
        
        var modeInfoPanel = advancedPanel.add("panel", undefined, "Mode Guide");
        modeInfoPanel.orientation = "column";
        modeInfoPanel.alignChildren = "fill";
        modeInfoPanel.margins = 10;
        modeInfoPanel.preferredSize.height = 86;
        
        var modeInfo1 = modeInfoPanel.add("statictext", undefined, "");
        var modeInfo2 = modeInfoPanel.add("statictext", undefined, "");
        var modeInfo3 = modeInfoPanel.add("statictext", undefined, "");
        var modeInfo4 = modeInfoPanel.add("statictext", undefined, "");
        modeInfo1.preferredSize.width = 360;
        modeInfo2.preferredSize.width = 360;
        modeInfo3.preferredSize.width = 360;
        modeInfo4.preferredSize.width = 360;
        
        // Buttons
        var buttonGroup = dialog.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignment = "center";
        buttonGroup.spacing = 10;
        
        var cancelButton = buttonGroup.add("button", undefined, "Cancel");
        var okButton = buttonGroup.add("button", undefined, "Run Cleanup");
        okButton.preferredSize.width = 120;
        
        // Event handlers
        marginSlider.onChanging = function() {
            marginEdit.text = String(Math.round(this.value));
        };
        
        marginEdit.onChanging = function() {
            syncMarginFromField(false);
        };
        
        marginEdit.onChange = function() {
            syncMarginFromField(true);
        };
        
        toleranceSlider.onChanging = function() {
            updateToleranceText();
        };
        
        toleranceEdit.onChanging = function() {
            syncToleranceFromField(false);
        };
        
        toleranceEdit.onChange = function() {
            syncToleranceFromField(true);
        };
        
        valueModeRadio.onClick = function() {
            updateAdvancedModeInfo();
            updateToleranceText();
        };
        
        timeModeRadio.onClick = function() {
            updateAdvancedModeInfo();
            updateToleranceText();
        };
        
        tabs.onChange = updateWorkflowState;
        
        cancelButton.onClick = function() {
            dialog.close(0);
        };
        
        okButton.onClick = function() {
            if (tabs.selection === removeTab) {
                var margin = parseFloat(marginEdit.text);
                if (isNaN(margin) || margin < 0) {
                    alert("Please enter a valid margin value (0 or greater).");
                    return;
                }
            }
            
            dialog.close(1);
        };
        
        function updateToleranceText() {
            var rawTolerance = toleranceSlider.value / 10;
            if (timeModeRadio.value) {
                toleranceEdit.text = rawTolerance.toFixed(1);
            } else {
                toleranceEdit.text = rawTolerance.toFixed(1);
            }
        }
        
        function syncMarginFromField(commit) {
            var value = parseFloat(marginEdit.text);
            
            if (isNaN(value)) {
                if (commit) {
                    value = 0;
                } else {
                    return;
                }
            }
            
            value = Math.max(0, Math.min(500, value));
            marginSlider.value = value;
            if (commit) {
                marginEdit.text = String(Math.round(value));
            }
        }
        
        function syncToleranceFromField(commit) {
            var value = parseFloat(toleranceEdit.text);
            
            if (isNaN(value)) {
                if (commit) {
                    value = 1.0;
                } else {
                    return;
                }
            }
            
            value = Math.max(0.1, Math.min(10.0, value));
            toleranceSlider.value = value * 10;
            if (commit) {
                toleranceEdit.text = value.toFixed(1);
            }
        }
        
        function updateAdvancedModeInfo() {
            if (timeModeRadio.value) {
                modeInfo1.text = "Time Mode merges keyframes that are very close in time.";
                modeInfo2.text = "Best for baked or frame-by-frame animation.";
                modeInfo3.text = "";
                modeInfo4.text = "";
            } else {
                modeInfo1.text = "Value Mode removes keyframes when the motion change is very small.";
                modeInfo2.text = "Best for over-keyed animation with similar values.";
                modeInfo3.text = "";
                modeInfo4.text = "";
            }
        }
        
        function updateWorkflowState() {
            if (tabs.selection === removeTab) {
                okButton.text = "Remove Keyframes";
            } else if (tabs.selection === quickTab) {
                okButton.text = "Quick Optimize";
            } else {
                okButton.text = "Advanced Optimize";
            }
            
            dialog.layout.layout(true);
        }
        
        // Show dialog
        updateAdvancedModeInfo();
        syncMarginFromField(true);
        updateToleranceText();
        tabs.selection = removeTab;
        updateWorkflowState();
        var result = dialog.show();
        
        if (result === 1) {
            var action = "removeOutside";
            var actionLabel = "Remove Outside Canvas";
            var mode = "value";
            var modeLabel = "Value Mode";
            var tolerance = 1.0;
            
            if (tabs.selection === quickTab) {
                action = "quickSimplify";
                actionLabel = "Quick Optimize";
            } else if (tabs.selection === advancedTab) {
                action = "advancedSimplify";
                actionLabel = "Advanced Optimize";
                mode = timeModeRadio.value ? "time" : "value";
                modeLabel = timeModeRadio.value ? "Time Mode" : "Value Mode";
                tolerance = toleranceSlider.value / 10;
            } else {
                mode = "outside";
                modeLabel = "Outside Canvas";
            }
            
            return {
                action: action,
                actionLabel: actionLabel,
                margin: parseFloat(marginEdit.text),
                mode: mode,
                modeLabel: modeLabel,
                tolerance: tolerance,
                toleranceDisplay: mode === "time" ? tolerance.toFixed(1) + " frames" : tolerance.toFixed(1)
            };
        } else {
            return null;
        }
    }
    
    
    // Function to process a single layer
    function processLayer(layer, comp, margin) {
        var removedCount = 0;
        
        // Get all keyframe times from all properties
        var keyframeTimes = getAllKeyframeTimes(layer);
        
        if (keyframeTimes.length === 0) return 0;
        
        // Find all time periods where layer is outside canvas
        var outsideSegments = findOutsideSegments(layer, comp, margin);
        
        // Remove keyframes that fall within outside segments
        for (var t = 0; t < keyframeTimes.length; t++) {
            var time = keyframeTimes[t];
            
            // Check if this keyframe time falls within any outside segment
            if (isTimeInOutsideSegments(time, outsideSegments)) {
                removedCount += removeKeyframesAtTime(layer, time);
            }
        }
        
        return removedCount;
    }
    
    
    // Function to find all continuous segments where layer is outside canvas
    function findOutsideSegments(layer, comp, margin) {
        var segments = [];
        
        // Define sampling range
        var startTime = Math.max(0, layer.inPoint);
        var endTime = Math.min(comp.duration, layer.outPoint);
        var sampleInterval = comp.frameDuration / 2; // Sample at half-frame intervals for precision
        
        // Sample the layer position at regular intervals
        var currentSegment = null;
        
        for (var time = startTime; time <= endTime; time += sampleInterval) {
            var isOutside = isLayerOutsideCanvas(layer, comp, time, margin);
            
            if (isOutside) {
                if (currentSegment === null) {
                    // Start new outside segment
                    currentSegment = {
                        start: time,
                        end: time
                    };
                } else {
                    // Extend current segment
                    currentSegment.end = time;
                }
            } else {
                if (currentSegment !== null) {
                    // End current segment and add to list
                    segments.push(currentSegment);
                    currentSegment = null;
                }
            }
        }
        
        // Handle case where layer ends while outside
        if (currentSegment !== null) {
            segments.push(currentSegment);
        }
        
        // Merge adjacent segments (within one frame of each other)
        var mergedSegments = [];
        for (var i = 0; i < segments.length; i++) {
            var segment = segments[i];
            
            if (mergedSegments.length === 0) {
                mergedSegments.push(segment);
            } else {
                var lastSegment = mergedSegments[mergedSegments.length - 1];
                
                // If segments are close (within one frame), merge them
                if (segment.start - lastSegment.end <= comp.frameDuration) {
                    lastSegment.end = segment.end;
                } else {
                    mergedSegments.push(segment);
                }
            }
        }
        
        return mergedSegments;
    }
    
    
    // Function to check if a time falls within any outside segment
    function isTimeInOutsideSegments(time, segments) {
        for (var i = 0; i < segments.length; i++) {
            var segment = segments[i];
            if (time >= segment.start && time <= segment.end) {
                return true;
            }
        }
        return false;
    }
    
    
    // Function to get all unique keyframe times from all properties of a layer
    function getAllKeyframeTimes(layer) {
        var times = [];
        var timeSet = {}; // Use object as set to avoid duplicates
        
        // Helper function to recursively get keyframe times from properties
        function getTimesFromProperty(prop) {
            if (prop.numKeys > 0) {
                for (var k = 1; k <= prop.numKeys; k++) {
                    var time = prop.keyTime(k);
                    if (!timeSet[time]) {
                        timeSet[time] = true;
                        times.push(time);
                    }
                }
            }
            
            // Recursively check sub-properties
            if (prop.numProperties > 0) {
                for (var p = 1; p <= prop.numProperties; p++) {
                    try {
                        var subProp = prop.property(p);
                        if (subProp) {
                            getTimesFromProperty(subProp);
                        }
                    } catch (e) {
                        // Skip properties that can't be accessed
                    }
                }
            }
        }
        
        // Start with transform properties
        getTimesFromProperty(layer.transform);
        
        // Check effects
        if (layer.Effects && layer.Effects.numProperties > 0) {
            getTimesFromProperty(layer.Effects);
        }
        
        // Check other properties (masks, etc.)
        for (var i = 1; i <= layer.numProperties; i++) {
            try {
                var prop = layer.property(i);
                if (prop && prop !== layer.transform && prop !== layer.Effects) {
                    getTimesFromProperty(prop);
                }
            } catch (e) {
                // Skip properties that can't be accessed
            }
        }
        
        return times.sort(function(a, b) { return a - b; });
    }
    
    
    // Function to check if layer is outside canvas at specific time
    function isLayerOutsideCanvas(layer, comp, time, margin) {
        try {
            // Get the world position of the layer (accounting for all parent transforms)
            var worldPosition = getWorldPosition(layer, time);
            
            // Get layer properties at this time
            var anchorPoint = layer.anchorPoint.valueAtTime(time, false);
            var scale = getWorldScale(layer, time);
            
            // Calculate actual position considering anchor point and scale
            var actualX = worldPosition[0] - (anchorPoint[0] * scale[0] / 100);
            var actualY = worldPosition[1] - (anchorPoint[1] * scale[1] / 100);
            
            // Get layer dimensions with scale applied
            var layerWidth = layer.width * scale[0] / 100;
            var layerHeight = layer.height * scale[1] / 100;
            
            // Calculate layer bounds
            var leftEdge = actualX;
            var rightEdge = actualX + layerWidth;
            var topEdge = actualY;
            var bottomEdge = actualY + layerHeight;
            
            // Composition bounds with margin applied
            var compWidth = comp.width;
            var compHeight = comp.height;
            
            // Apply margin to the composition bounds
            // Margin extends the "inside" area, so layer needs to be further outside to be considered outside
            var marginLeft = -margin;
            var marginRight = compWidth + margin;
            var marginTop = -margin;
            var marginBottom = compHeight + margin;
            
            // Check if layer is completely outside composition (with margin)
            var outsideLeft = rightEdge < marginLeft;
            var outsideRight = leftEdge > marginRight;
            var outsideTop = bottomEdge < marginTop;
            var outsideBottom = topEdge > marginBottom;
            
            return outsideLeft || outsideRight || outsideTop || outsideBottom;
            
        } catch (error) {
            // If we can't evaluate the position at this time, assume it's not outside
            return false;
        }
    }
    
    
    // Function to get world position accounting for all parent transforms
    function getWorldPosition(layer, time) {
        var worldPos = [0, 0];
        var currentLayer = layer;
        
        // Traverse up the parent chain and accumulate transforms
        while (currentLayer) {
            var position = currentLayer.position.valueAtTime(time, false);
            var anchorPoint = currentLayer.anchorPoint.valueAtTime(time, false);
            var rotation = currentLayer.rotation ? currentLayer.rotation.valueAtTime(time, false) : 0;
            var scale = currentLayer.scale.valueAtTime(time, false);
            
            // If this is not the original layer, we need to apply parent transformations
            if (currentLayer !== layer) {
                // Apply scale to the accumulated position
                worldPos[0] *= scale[0] / 100;
                worldPos[1] *= scale[1] / 100;
                
                // Apply rotation if present
                if (rotation !== 0) {
                    var rad = rotation * Math.PI / 180;
                    var cos = Math.cos(rad);
                    var sin = Math.sin(rad);
                    
                    var x = worldPos[0];
                    var y = worldPos[1];
                    worldPos[0] = x * cos - y * sin;
                    worldPos[1] = x * sin + y * cos;
                }
            }
            
            // Add this layer's position (relative to its anchor point)
            worldPos[0] += position[0] - anchorPoint[0];
            worldPos[1] += position[1] - anchorPoint[1];
            
            // Move to parent layer
            currentLayer = currentLayer.parent;
        }
        
        // Add back the original layer's anchor point
        var originalAnchor = layer.anchorPoint.valueAtTime(time, false);
        worldPos[0] += originalAnchor[0];
        worldPos[1] += originalAnchor[1];
        
        return worldPos;
    }
    
    
    // Function to get world scale accounting for all parent scales
    function getWorldScale(layer, time) {
        var worldScale = [100, 100]; // Start with 100% scale
        var currentLayer = layer;
        
        // Traverse up the parent chain and accumulate scales
        while (currentLayer) {
            var scale = currentLayer.scale.valueAtTime(time, false);
            
            // Multiply scales
            worldScale[0] *= scale[0] / 100;
            worldScale[1] *= scale[1] / 100;
            
            // Move to parent layer
            currentLayer = currentLayer.parent;
        }
        
        return worldScale;
    }
    
    
    function optimizeSelectedLayers(comp, selectedLayers, userSettings) {
        var processedLayers = 0;
        var processedProperties = 0;
        var removedKeyframes = 0;
        var hasSelectedProperties = false;
        
        for (var i = 0; i < selectedLayers.length; i++) {
            if (selectedLayers[i].selectedProperties && selectedLayers[i].selectedProperties.length > 0) {
                hasSelectedProperties = true;
                break;
            }
        }
        
        for (var layerIndex = 0; layerIndex < selectedLayers.length; layerIndex++) {
            var layer = selectedLayers[layerIndex];
            var targetProperties = [];
            
            if (hasSelectedProperties && layer.selectedProperties && layer.selectedProperties.length > 0) {
                collectOptimizablePropertiesFromList(layer.selectedProperties, targetProperties);
            } else if (!hasSelectedProperties) {
                collectOptimizablePropertiesFromPropertyGroup(layer, targetProperties);
            }
            
            if (targetProperties.length === 0) {
                continue;
            }
            
            processedLayers++;
            for (var p = 0; p < targetProperties.length; p++) {
                removedKeyframes += simplifyProperty(comp, targetProperties[p], userSettings.mode, userSettings.tolerance);
                processedProperties++;
            }
        }
        
        return {
            processedLayers: processedLayers,
            processedProperties: processedProperties,
            removedKeyframes: removedKeyframes
        };
    }
    
    
    function collectOptimizablePropertiesFromList(propertyList, output) {
        for (var i = 0; i < propertyList.length; i++) {
            collectOptimizableProperties(propertyList[i], output);
        }
    }
    
    
    function collectOptimizablePropertiesFromPropertyGroup(group, output) {
        if (!group || group.numProperties === undefined) {
            return;
        }
        
        for (var i = 1; i <= group.numProperties; i++) {
            try {
                collectOptimizableProperties(group.property(i), output);
            } catch (e) {
                // Skip inaccessible properties
            }
        }
    }
    
    
    function collectOptimizableProperties(prop, output) {
        if (!prop) {
            return;
        }
        
        if (isOptimizableProperty(prop)) {
            output.push(prop);
            return;
        }
        
        if (prop.numProperties && prop.numProperties > 0) {
            for (var i = 1; i <= prop.numProperties; i++) {
                try {
                    collectOptimizableProperties(prop.property(i), output);
                } catch (e) {
                    // Skip inaccessible sub-properties
                }
            }
        }
    }
    
    
    function isOptimizableProperty(prop) {
        if (!prop || prop.numKeys === undefined || prop.numKeys < 3) {
            return false;
        }
        
        if (prop.propertyValueType === PropertyValueType.NO_VALUE ||
            prop.propertyValueType === PropertyValueType.CUSTOM_VALUE ||
            prop.propertyValueType === PropertyValueType.MARKER ||
            prop.propertyValueType === PropertyValueType.LAYER_INDEX ||
            prop.propertyValueType === PropertyValueType.MASK_INDEX ||
            prop.propertyValueType === PropertyValueType.TEXT_DOCUMENT ||
            prop.propertyValueType === PropertyValueType.SHAPE) {
            return false;
        }
        
        return true;
    }
    
    
    function simplifyProperty(comp, prop, mode, tolerance) {
        var removedCount = 0;
        
        for (var k = prop.numKeys - 1; k >= 2; k--) {
            if (hasHoldInterpolation(prop, k)) {
                continue;
            }
            
            var shouldRemove = false;
            if (mode === "time") {
                shouldRemove = shouldRemoveByTime(comp, prop, k, tolerance);
            } else {
                shouldRemove = shouldRemoveByValue(prop, k, tolerance);
            }
            
            if (shouldRemove) {
                try {
                    prop.removeKey(k);
                    removedCount++;
                } catch (e) {
                    // Some keyframes might be protected or invalid
                }
            }
        }
        
        return removedCount;
    }
    
    
    function hasHoldInterpolation(prop, keyIndex) {
        try {
            if (prop.keyInInterpolationType(keyIndex) === KeyframeInterpolationType.HOLD) {
                return true;
            }
            if (prop.keyOutInterpolationType(keyIndex) === KeyframeInterpolationType.HOLD) {
                return true;
            }
            if (keyIndex > 1 && prop.keyOutInterpolationType(keyIndex - 1) === KeyframeInterpolationType.HOLD) {
                return true;
            }
            if (keyIndex < prop.numKeys && prop.keyInInterpolationType(keyIndex + 1) === KeyframeInterpolationType.HOLD) {
                return true;
            }
        } catch (e) {
            return false;
        }
        
        return false;
    }
    
    
    function shouldRemoveByTime(comp, prop, keyIndex, tolerance) {
        var prevTime = prop.keyTime(keyIndex - 1);
        var currentTime = prop.keyTime(keyIndex);
        var nextTime = prop.keyTime(keyIndex + 1);
        var maxGap = tolerance * comp.frameDuration;
        
        return (currentTime - prevTime) <= maxGap && (nextTime - currentTime) <= maxGap;
    }
    
    
    function shouldRemoveByValue(prop, keyIndex, tolerance) {
        var prevTime = prop.keyTime(keyIndex - 1);
        var currentTime = prop.keyTime(keyIndex);
        var nextTime = prop.keyTime(keyIndex + 1);
        var timeSpan = nextTime - prevTime;
        
        if (timeSpan <= 0) {
            return false;
        }
        
        var prevValue = prop.keyValue(keyIndex - 1);
        var currentValue = prop.keyValue(keyIndex);
        var nextValue = prop.keyValue(keyIndex + 1);
        var normalizedTime = (currentTime - prevTime) / timeSpan;
        var expectedValue = interpolateValue(prevValue, nextValue, normalizedTime);
        var delta = getValueDifference(currentValue, expectedValue);
        
        return delta <= tolerance;
    }
    
    
    function interpolateValue(startValue, endValue, amount) {
        if (typeof startValue === "number") {
            return startValue + (endValue - startValue) * amount;
        }
        
        if (startValue instanceof Array) {
            var result = [];
            for (var i = 0; i < startValue.length; i++) {
                result.push(startValue[i] + (endValue[i] - startValue[i]) * amount);
            }
            return result;
        }
        
        return startValue;
    }
    
    
    function getValueDifference(a, b) {
        if (typeof a === "number") {
            return Math.abs(a - b);
        }
        
        if (a instanceof Array) {
            var maxDifference = 0;
            for (var i = 0; i < a.length; i++) {
                maxDifference = Math.max(maxDifference, Math.abs(a[i] - b[i]));
            }
            return maxDifference;
        }
        
        return Number.MAX_VALUE;
    }
    
    
    // Function to remove keyframes at specific time from all properties
    function removeKeyframesAtTime(layer, time) {
        var removedCount = 0;
        
        // Helper function to recursively remove keyframes from properties
        function removeFromProperty(prop) {
            if (prop.numKeys > 0) {
                // Find and remove keyframes at this time (with small tolerance)
                for (var k = prop.numKeys; k >= 1; k--) {
                    var keyTime = prop.keyTime(k);
                    if (Math.abs(keyTime - time) < 0.001) { // Small tolerance for floating point comparison
                        try {
                            prop.removeKey(k);
                            removedCount++;
                        } catch (e) {
                            // Some keyframes might not be removable
                        }
                    }
                }
            }
            
            // Recursively check sub-properties
            if (prop.numProperties > 0) {
                for (var p = 1; p <= prop.numProperties; p++) {
                    try {
                        var subProp = prop.property(p);
                        if (subProp) {
                            removeFromProperty(subProp);
                        }
                    } catch (e) {
                        // Skip properties that can't be accessed
                    }
                }
            }
        }
        
        // Remove from transform properties
        removeFromProperty(layer.transform);
        
        // Remove from effects
        if (layer.Effects && layer.Effects.numProperties > 0) {
            removeFromProperty(layer.Effects);
        }
        
        // Remove from other properties (masks, etc.)
        for (var i = 1; i <= layer.numProperties; i++) {
            try {
                var prop = layer.property(i);
                if (prop && prop !== layer.transform && prop !== layer.Effects) {
                    removeFromProperty(prop);
                }
            } catch (e) {
                // Skip properties that can't be accessed
            }
        }
        
        return removedCount;
    }
    
})();
