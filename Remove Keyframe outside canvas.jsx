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
        
        // Process each selected layer
        for (var i = 0; i < selectedLayers.length; i++) {
            var layer = selectedLayers[i];
            
            // Skip layers that don't have position property (like cameras, lights in some cases)
            if (!layer.position) continue;
            
            processedLayers++;
            removedKeyframesCount += processLayer(layer, comp, userSettings.margin);
        }
        
        // Show results
        alert("Processing complete!\n" +
              "Layers processed: " + processedLayers + "\n" +
              "Keyframes removed: " + removedKeyframesCount + "\n" +
              "Margin used: " + userSettings.margin + "px");
              
    } catch (error) {
        alert("Error: " + error.message);
    } finally {
        app.endUndoGroup();
    }
    
    
    // Function to show UI and get user settings
    function showUI() {
        var dialog = new Window("dialog", "Remove Keyframes Outside Canvas");
        dialog.orientation = "column";
        dialog.alignChildren = "fill";
        dialog.spacing = 10;
        dialog.margins = 20;
        
        // Header
        var headerGroup = dialog.add("group");
        headerGroup.orientation = "column";
        headerGroup.alignChildren = "left";
        
        var titleText = headerGroup.add("statictext", undefined, "Remove Keyframes Outside Canvas");
        titleText.graphics.font = ScriptUI.newFont("dialog", "bold", 14);
        
        var descText = headerGroup.add("statictext", undefined, "Remove keyframes when layers are outside the composition by more than the specified margin.");
        descText.preferredSize.width = 400;
        
        // Separator
        var separator1 = dialog.add("panel");
        separator1.preferredSize.height = 2;
        
        // Settings group
        var settingsGroup = dialog.add("group");
        settingsGroup.orientation = "column";
        settingsGroup.alignChildren = "fill";
        settingsGroup.spacing = 15;
        
        // Margin setting
        var marginGroup = settingsGroup.add("group");
        marginGroup.orientation = "row";
        marginGroup.alignChildren = "center";
        
        marginGroup.add("statictext", undefined, "Margin (pixels):");
        var marginEdit = marginGroup.add("edittext", undefined, "0");
        marginEdit.preferredSize.width = 80;
        marginEdit.alignment = "left";
        
        var marginHelp = marginGroup.add("statictext", undefined, "(0 = exactly outside, >0 = further outside)");
        marginHelp.graphics.foregroundColor = marginHelp.graphics.newPen(marginHelp.graphics.PenType.SOLID_COLOR, [0.5, 0.5, 0.5], 1);
        
        // Info group
        var infoGroup = settingsGroup.add("group");
        infoGroup.orientation = "column";
        infoGroup.alignChildren = "fill";
        
        var infoPanel = infoGroup.add("panel", undefined, "Information");
        infoPanel.orientation = "column";
        infoPanel.alignChildren = "fill";
        infoPanel.margins = 10;
        
        var info1 = infoPanel.add("statictext", undefined, "• Margin = 0: Remove keyframes when layer is completely outside");
        var info2 = infoPanel.add("statictext", undefined, "• Margin > 0: Remove keyframes when layer is further outside by margin amount");
        var info3 = infoPanel.add("statictext", undefined, "• Selected layers: " + selectedLayers.length);
        var info4 = infoPanel.add("statictext", undefined, "• Composition: " + comp.name + " (" + comp.width + "x" + comp.height + ")");
        
        info1.preferredSize.width = 380;
        info2.preferredSize.width = 380;
        info3.preferredSize.width = 380;
        info4.preferredSize.width = 380;
        
        // Separator
        var separator2 = dialog.add("panel");
        separator2.preferredSize.height = 2;
        
        // Buttons
        var buttonGroup = dialog.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignment = "center";
        buttonGroup.spacing = 10;
        
        var cancelButton = buttonGroup.add("button", undefined, "Cancel");
        var okButton = buttonGroup.add("button", undefined, "Remove Keyframes");
        okButton.preferredSize.width = 120;
        
        // Event handlers
        marginEdit.onChanging = function() {
            var value = parseFloat(this.text);
            if (isNaN(value) || value < 0) {
                this.text = "0";
            }
        };
        
        cancelButton.onClick = function() {
            dialog.close(0);
        };
        
        okButton.onClick = function() {
            var margin = parseFloat(marginEdit.text);
            if (isNaN(margin) || margin < 0) {
                alert("Please enter a valid margin value (0 or greater).");
                return;
            }
            
            dialog.close(1);
        };
        
        // Show dialog
        var result = dialog.show();
        
        if (result === 1) {
            return {
                margin: parseFloat(marginEdit.text)
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
