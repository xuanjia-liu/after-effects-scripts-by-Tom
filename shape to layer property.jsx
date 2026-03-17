/*
 * Shape <-> Layer Transform Property Copier
 * Copies Transform properties between a shape group and its layer Transform
 */

(function() {
    "use strict";
    
    // Main function
    function main() {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            alert("Please select a composition.");
            return;
        }
        
        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) {
            alert("Please select a layer.");
            return;
        }
        
        // Single Layer Mode
        if (selectedLayers.length === 1) {
            processSingleLayer(selectedLayers[0]);
        } 
        // Batch Mode
        else {
            processMultipleLayers(selectedLayers);
        }
    }
    
    function processSingleLayer(layer) {
        if (layer.nullLayer) {
            alert("Selected layer is null.");
            return;
        }
        
        // Check if it's a shape layer
        var contents = layer.property("Contents");
        if (!contents || contents.numProperties === 0) {
            alert("Selected layer has no contents. Please select a shape layer.");
            return;
        }
        
        // Find all shapes (groups and individual shapes)
        var shapes = findShapes(contents);
        
        if (shapes.length === 0) {
            alert("No shapes found in the selected layer.");
            return;
        }
        
        // Show UI dialog
        var result = showMainDialog(shapes);
        if (!result) {
            return; // User cancelled
        }
        
        // Get selected shape
        var selectedShape = shapes[result.shapeIndex];
        
        // Copy properties
        copyTransformProperties(selectedShape, layer, result.properties, result.removeOriginal, false, result.direction);
        
        alert("Transform properties copied successfully!");
    }
    
    function processMultipleLayers(layers) {
        // Show Batch Config Dialog
        var config = showBatchConfigDialog();
        if (!config) return;
        
        var successCount = 0;
        var processedLayers = 0;
        
        app.beginUndoGroup("Batch Copy Shape Transform");
        try {
            for (var i = 0; i < layers.length; i++) {
                var layer = layers[i];
                
                // Skip null or non-shape layers silently in batch? 
                // Or count them.
                if (layer.nullLayer) continue;
                var contents = layer.property("Contents");
                if (!contents || contents.numProperties === 0) continue;
                
                var shapes = findShapes(contents);
                if (shapes.length === 0) continue;
                
                var shapeToUse = null;
                if (shapes.length === 1) {
                    shapeToUse = shapes[0];
                } else {
                    if (config.useFirstShape) {
                        shapeToUse = shapes[0];
                    } else {
                        // Ask user for specific shape
                        var result = showLayerShapeDialog(layer, shapes);
                        if (!result) {
                            // Cancel batch?
                            return; 
                        }
                        shapeToUse = shapes[result.shapeIndex];
                    }
                }
                
                if (shapeToUse) {
                    copyTransformProperties(shapeToUse, layer, config.properties, config.removeOriginal, true, config.direction);
                    successCount++;
                }
                processedLayers++;
            }
        } catch (e) {
            alert("Error in batch processing: " + e.toString());
        } finally {
            app.endUndoGroup();
        }
        
        alert("Processed " + successCount + " layers successfully.");
    }
    
    // Find all shapes in contents
    function findShapes(contents) {
        var shapes = [];
        
        function traverse(prop) {
            if (!prop) return;
            
            // Check if prop is a PropertyGroup (has property() method)
            if (typeof prop.property === "function") {
                // Check if this is a shape group with Transform
                try {
                    var transformProp = prop.property("Transform");
                    if (transformProp) {
                        shapes.push(prop);
                    }
                } catch (e) {
                    // Property doesn't have Transform, continue
                }
                
                // Traverse children if it has numProperties
                if (typeof prop.numProperties !== "undefined") {
                    try {
                        for (var i = 1; i <= prop.numProperties; i++) {
                            var child = prop.property(i);
                            if (child) {
                                traverse(child);
                            }
                        }
                    } catch (e) {
                        // Can't traverse children, skip
                    }
                }
            }
        }
        
        if (contents && typeof contents.numProperties !== "undefined") {
            for (var i = 1; i <= contents.numProperties; i++) {
                try {
                    var prop = contents.property(i);
                    if (prop) {
                        traverse(prop);
                    }
                } catch (e) {
                    // Skip this property
                }
            }
        }
        
        return shapes;
    }
    
    // Show Main Dialog (Single Layer)
    function showMainDialog(shapes) {
        var dialog = new Window("dialog", "Copy Transform (Shape <-> Layer)");
        dialog.orientation = "column";
        dialog.alignChildren = "fill";
        dialog.spacing = 10;
        dialog.margins = 16;
        
        // Direction selection
        var directionPanel = dialog.add("panel", undefined, "Direction");
        directionPanel.orientation = "column";
        directionPanel.alignChildren = "left";
        directionPanel.spacing = 6;
        directionPanel.margins = 12;
        
        var dirShapeToLayer = directionPanel.add("radiobutton", undefined, "Shape -> Layer");
        var dirLayerToShape = directionPanel.add("radiobutton", undefined, "Layer -> Shape");
        dirShapeToLayer.value = true;
        
        // Shape selection
        var shapeGroup = dialog.add("group");
        shapeGroup.orientation = "row";
        shapeGroup.add("statictext", undefined, "Select Shape:");
        
        var shapeDropdown = shapeGroup.add("dropdownlist", undefined, []);
        shapeDropdown.preferredSize.width = 250;
        
        // Populate dropdown
        for (var i = 0; i < shapes.length; i++) {
            var shapeName = shapes[i].name || ("Shape " + (i + 1));
            shapeDropdown.add("item", shapeName);
        }
        shapeDropdown.selection = 0;
        
        // Property checkboxes
        var propGroup = dialog.add("panel", undefined, "Properties to Copy");
        propGroup.orientation = "column";
        propGroup.alignChildren = "left";
        propGroup.spacing = 8;
        propGroup.margins = 12;
        
        var positionCheck = propGroup.add("checkbox", undefined, "Position");
        positionCheck.value = true;
        
        var scaleCheck = propGroup.add("checkbox", undefined, "Scale");
        scaleCheck.value = true;
        
        var rotationCheck = propGroup.add("checkbox", undefined, "Rotation");
        rotationCheck.value = true;
        
        var anchorPointCheck = propGroup.add("checkbox", undefined, "Anchor Point");
        anchorPointCheck.value = true;
        
        var opacityCheck = propGroup.add("checkbox", undefined, "Opacity");
        opacityCheck.value = true;
        
        // Remove original checkbox
        var removeCheck = dialog.add("checkbox", undefined, "Reset source Transform after copying (prevents double transforms)");
        removeCheck.value = true;
        
        // Buttons
        var buttonGroup = dialog.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignment = "right";
        
        var okButton = buttonGroup.add("button", undefined, "OK");
        okButton.preferredSize.width = 80;
        
        var cancelButton = buttonGroup.add("button", undefined, "Cancel");
        cancelButton.preferredSize.width = 80;
        
        // Store result in dialog object
        dialog.result = null;
        
        // Handle button clicks
        okButton.onClick = function() {
            var properties = {
                position: positionCheck.value,
                scale: scaleCheck.value,
                rotation: rotationCheck.value,
                anchorPoint: anchorPointCheck.value,
                opacity: opacityCheck.value
            };
            
            // Check if at least one property is selected
            var hasSelection = false;
            for (var prop in properties) {
                if (properties[prop]) {
                    hasSelection = true;
                    break;
                }
            }
            
            if (!hasSelection) {
                alert("Please select at least one property to copy.");
                return;
            }
            
            dialog.result = {
                direction: dirShapeToLayer.value ? "shapeToLayer" : "layerToShape",
                shapeIndex: shapeDropdown.selection.index,
                properties: properties,
                removeOriginal: removeCheck.value
            };
            dialog.close(1);
        };
        
        cancelButton.onClick = function() {
            dialog.close(0);
        };
        
        // Show dialog
        if (dialog.show() === 1) {
            return dialog.result;
        }
        
        return null;
    }
    
    // Show Batch Config Dialog
    function showBatchConfigDialog() {
        var dialog = new Window("dialog", "Batch Copy Config");
        dialog.orientation = "column";
        dialog.alignChildren = "fill";
        dialog.spacing = 10;
        dialog.margins = 16;
        
        // Direction selection
        var directionPanel = dialog.add("panel", undefined, "Direction");
        directionPanel.orientation = "column";
        directionPanel.alignChildren = "left";
        directionPanel.spacing = 6;
        directionPanel.margins = 12;
        
        var dirShapeToLayer = directionPanel.add("radiobutton", undefined, "Shape -> Layer");
        var dirLayerToShape = directionPanel.add("radiobutton", undefined, "Layer -> Shape");
        dirShapeToLayer.value = true;
        
        // Property checkboxes
        var propGroup = dialog.add("panel", undefined, "Properties to Copy");
        propGroup.orientation = "column";
        propGroup.alignChildren = "left";
        propGroup.spacing = 8;
        propGroup.margins = 12;
        
        var positionCheck = propGroup.add("checkbox", undefined, "Position");
        positionCheck.value = true;
        
        var scaleCheck = propGroup.add("checkbox", undefined, "Scale");
        scaleCheck.value = true;
        
        var rotationCheck = propGroup.add("checkbox", undefined, "Rotation");
        rotationCheck.value = true;
        
        var anchorPointCheck = propGroup.add("checkbox", undefined, "Anchor Point");
        anchorPointCheck.value = true;
        
        var opacityCheck = propGroup.add("checkbox", undefined, "Opacity");
        opacityCheck.value = true;
        
        // Options
        var optionsGroup = dialog.add("group");
        optionsGroup.orientation = "column";
        optionsGroup.alignChildren = "left";
        
        var removeCheck = optionsGroup.add("checkbox", undefined, "Reset source Transform after copying");
        removeCheck.value = true;
        
        var firstShapeCheck = optionsGroup.add("checkbox", undefined, "Automatically use first shape (don't ask)");
        firstShapeCheck.value = false;
        
        // Buttons
        var buttonGroup = dialog.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignment = "right";
        
        var okButton = buttonGroup.add("button", undefined, "OK");
        okButton.preferredSize.width = 80;
        
        var cancelButton = buttonGroup.add("button", undefined, "Cancel");
        cancelButton.preferredSize.width = 80;
        
        dialog.result = null;
        
        okButton.onClick = function() {
            var properties = {
                position: positionCheck.value,
                scale: scaleCheck.value,
                rotation: rotationCheck.value,
                anchorPoint: anchorPointCheck.value,
                opacity: opacityCheck.value
            };
            
            var hasSelection = false;
            for (var prop in properties) {
                if (properties[prop]) { hasSelection = true; break; }
            }
            
            if (!hasSelection) {
                alert("Please select at least one property to copy.");
                return;
            }
            
            dialog.result = {
                direction: dirShapeToLayer.value ? "shapeToLayer" : "layerToShape",
                properties: properties,
                removeOriginal: removeCheck.value,
                useFirstShape: firstShapeCheck.value
            };
            dialog.close(1);
        };
        
        cancelButton.onClick = function() { dialog.close(0); };
        
        if (dialog.show() === 1) return dialog.result;
        return null;
    }
    
    // Show Layer Shape Selection Dialog
    function showLayerShapeDialog(layer, shapes) {
        var dialog = new Window("dialog", "Select Shape for: " + layer.name);
        dialog.orientation = "column";
        dialog.alignChildren = "fill";
        dialog.spacing = 10;
        dialog.margins = 16;
        
        var shapeGroup = dialog.add("group");
        shapeGroup.orientation = "row";
        shapeGroup.add("statictext", undefined, "Shape:");
        
        var shapeDropdown = shapeGroup.add("dropdownlist", undefined, []);
        shapeDropdown.preferredSize.width = 250;
        
        for (var i = 0; i < shapes.length; i++) {
            var shapeName = shapes[i].name || ("Shape " + (i + 1));
            shapeDropdown.add("item", shapeName);
        }
        shapeDropdown.selection = 0;
        
        var buttonGroup = dialog.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignment = "right";
        
        var okButton = buttonGroup.add("button", undefined, "OK");
        var cancelButton = buttonGroup.add("button", undefined, "Cancel");
        
        dialog.result = null;
        
        okButton.onClick = function() {
            dialog.result = { shapeIndex: shapeDropdown.selection.index };
            dialog.close(1);
        };
        
        cancelButton.onClick = function() { dialog.close(0); };
        
        if (dialog.show() === 1) return dialog.result;
        return null;
    }
    
    // Copy transform properties between shape and layer
    function copyTransformProperties(shape, layer, properties, removeOriginal, suppressUndo, direction) {
        direction = direction || "shapeToLayer";
        if (!suppressUndo) app.beginUndoGroup(direction === "layerToShape" ? "Copy Layer Transform to Shape" : "Copy Shape Transform to Layer");
        
        try {
            if (!shape || typeof shape.property !== "function") {
                throw new Error("Invalid shape object.");
            }
            
            var shapeTransform = shape.property("Transform");
            if (!shapeTransform) {
                throw new Error("Shape does not have Transform property.");
            }
            
            var layerTransform = layer.transform;
            var comp = layer.containingComp;
            if (!comp) {
                comp = app.project.activeItem;
            }
            
            if (direction === "layerToShape") {
                transferLayerToShape(shapeTransform, layerTransform, properties, removeOriginal, comp);
            } else {
                transferShapeToLayer(shapeTransform, layerTransform, properties, removeOriginal, comp);
            }
            
        } catch (e) {
            alert("Error copying properties: " + e.toString());
            throw e; // Re-throw to handle in batch loop
        } finally {
            if (!suppressUndo) app.endUndoGroup();
        }
    }
    
    // Direction: Shape -> Layer (existing behavior)
    function transferShapeToLayer(shapeTransform, layerTransform, properties, removeOriginal, comp) {
        // 1. Calculate Position Keyframes FIRST
        var positionKeyframes = [];
        if (properties.position) {
            positionKeyframes = calculatePositionKeyframes(
                shapeTransform.property("Position"),
                shapeTransform.property("Anchor Point"),
                layerTransform,
                comp
            );
        }
        
        // 2. Combine and Apply Scale
        if (properties.scale) {
            combineAndApplyScale(
                shapeTransform.property("Scale"),
                layerTransform.property("Scale"),
                layerTransform.property("Scale"),
                shapeTransform.property("Scale")
            );
            if (removeOriginal) {
                resetProperty(shapeTransform.property("Scale"), [100, 100]);
            }
        }
        
        // 3. Combine and Apply Rotation
        if (properties.rotation) {
            combineAndApplyRotation(
                shapeTransform.property("Rotation"),
                layerTransform.property("Rotation"),
                layerTransform.property("Rotation"),
                shapeTransform.property("Rotation")
            );
            if (removeOriginal) {
                resetProperty(shapeTransform.property("Rotation"), 0);
            }
        }
        
        // 4. Apply Pre-calculated Position
        if (properties.position) {
            applyKeyframes(layerTransform.property("Position"), positionKeyframes);
            copyInterpolation(shapeTransform.property("Position"), layerTransform.property("Position"), positionKeyframes);
            if (removeOriginal) {
                resetProperty(shapeTransform.property("Position"), [0, 0]);
            }
        }
        
        // 5. Copy Anchor Point
        if (properties.anchorPoint) {
            copyProperty(shapeTransform.property("Anchor Point"), layerTransform.property("Anchor Point"));
            if (removeOriginal) {
                resetProperty(shapeTransform.property("Anchor Point"), [0, 0]);
            }
        }
        
        // 6. Combine and Apply Opacity
        if (properties.opacity) {
            combineAndApplyOpacity(
                shapeTransform.property("Opacity"),
                layerTransform.property("Opacity"),
                layerTransform.property("Opacity"),
                shapeTransform.property("Opacity")
            );
            if (removeOriginal) {
                resetProperty(shapeTransform.property("Opacity"), 100);
            }
        }
    }
    
    // Direction: Layer -> Shape (new behavior)
    function transferLayerToShape(shapeTransform, layerTransform, properties, removeOriginal, comp) {
        var anchorTargetProp = properties.anchorPoint ? layerTransform.property("Anchor Point") : shapeTransform.property("Anchor Point");
        
        // 1. Calculate new Shape Position keyframes before we modify anything
        var positionKeyframes = [];
        if (properties.position) {
            positionKeyframes = calculatePositionKeyframesToShape(
                shapeTransform,
                layerTransform,
                anchorTargetProp,
                comp
            );
        }
        
        // 2. Combine and Apply Scale (Layer * Shape)
        if (properties.scale) {
            combineAndApplyScale(
                layerTransform.property("Scale"),
                shapeTransform.property("Scale"),
                shapeTransform.property("Scale"),
                layerTransform.property("Scale")
            );
            if (removeOriginal) {
                resetProperty(layerTransform.property("Scale"), [100, 100]);
            }
        }
        
        // 3. Combine and Apply Rotation
        if (properties.rotation) {
            combineAndApplyRotation(
                layerTransform.property("Rotation"),
                shapeTransform.property("Rotation"),
                shapeTransform.property("Rotation"),
                layerTransform.property("Rotation")
            );
            if (removeOriginal) {
                resetProperty(layerTransform.property("Rotation"), 0);
            }
        }
        
        // 4. Apply recalculated Position to Shape
        if (properties.position) {
            applyKeyframes(shapeTransform.property("Position"), positionKeyframes);
            copyInterpolation(layerTransform.property("Position"), shapeTransform.property("Position"), positionKeyframes);
            if (removeOriginal) {
                resetProperty(layerTransform.property("Position"), [0, 0]);
            }
        }
        
        // 5. Copy Anchor Point down to Shape
        if (properties.anchorPoint) {
            copyProperty(layerTransform.property("Anchor Point"), shapeTransform.property("Anchor Point"));
            if (removeOriginal) {
                resetProperty(layerTransform.property("Anchor Point"), [0, 0]);
            }
        }
        
        // 6. Combine and Apply Opacity
        if (properties.opacity) {
            combineAndApplyOpacity(
                layerTransform.property("Opacity"),
                shapeTransform.property("Opacity"),
                shapeTransform.property("Opacity"),
                layerTransform.property("Opacity")
            );
            if (removeOriginal) {
                resetProperty(layerTransform.property("Opacity"), 100);
            }
        }
    }
    
    // Helper to get all unique keyframe times from multiple properties
    function getUniqueKeyTimes(props) {
        var times = [];
        for (var i = 0; i < props.length; i++) {
            var prop = props[i];
            if (prop && prop.numKeys > 0) {
                for (var j = 1; j <= prop.numKeys; j++) {
                    var t = prop.keyTime(j);
                    // Simple check to avoid duplicates
                    var exists = false;
                    for (var k = 0; k < times.length; k++) {
                        if (Math.abs(times[k] - t) < 0.001) {
                            exists = true;
                            break;
                        }
                    }
                    if (!exists) {
                        times.push(t);
                    }
                }
            }
        }
        return times.sort(function(a, b) { return a - b; });
    }
    
    // Basic math helpers for 2D/3D vectors
    function degToRad(deg) { return deg * Math.PI / 180; }
    
    function addVectors(a, b) {
        var len = Math.max(a.length, b.length);
        var out = [];
        for (var i = 0; i < len; i++) {
            var av = i < a.length ? a[i] : 0;
            var bv = i < b.length ? b[i] : 0;
            out.push(av + bv);
        }
        return out;
    }
    
    function subtractVectors(a, b) {
        var len = Math.max(a.length, b.length);
        var out = [];
        for (var i = 0; i < len; i++) {
            var av = i < a.length ? a[i] : 0;
            var bv = i < b.length ? b[i] : 0;
            out.push(av - bv);
        }
        return out;
    }
    
    function scaleVector(vec, scale) {
        if (!vec) return [0, 0];
        if (!scale || typeof scale.length === "undefined") return vec;
        var out = [];
        for (var i = 0; i < vec.length; i++) {
            var sVal = scale.length > 1 ? scale[i] : scale[0];
            out.push(vec[i] * (sVal / 100));
        }
        return out;
    }
    
    function rotateVector(vec, degrees) {
        if (!vec || vec.length === 0) return [0, 0];
        var rad = degToRad(degrees || 0);
        var cos = Math.cos(rad);
        var sin = Math.sin(rad);
        var x = vec[0] * cos - vec[1] * sin;
        var y = vec[0] * sin + vec[1] * cos;
        var out = [x, y];
        if (vec.length > 2) {
            out.push(vec[2]); // Keep Z untouched for 2D rotation
        }
        return out;
    }
    
    function applyCompositeToVector(vec, shapeScale, shapeRot, layerScale, layerRot) {
        var v = scaleVector(vec, shapeScale);
        v = rotateVector(v, shapeRot);
        v = scaleVector(v, layerScale);
        v = rotateVector(v, layerRot);
        return v;
    }
    
    // Calculate new Shape Position values when pushing Layer Transform down
    function calculatePositionKeyframesToShape(shapeTransform, layerTransform, anchorTargetProp, comp) {
        var shapePosProp = shapeTransform.property("Position");
        var shapeAnchorProp = shapeTransform.property("Anchor Point");
        var shapeScaleProp = shapeTransform.property("Scale");
        var shapeRotProp = shapeTransform.property("Rotation");
        var layerPosProp = layerTransform.property("Position");
        var layerAnchorProp = layerTransform.property("Anchor Point");
        var layerScaleProp = layerTransform.property("Scale");
        var layerRotProp = layerTransform.property("Rotation");
        
        var relevantProps = [
            shapePosProp, shapeAnchorProp, layerPosProp, layerAnchorProp,
            shapeScaleProp, shapeRotProp, layerScaleProp, layerRotProp
        ];
        if (anchorTargetProp) relevantProps.push(anchorTargetProp);
        
        var times = getUniqueKeyTimes(relevantProps);
        if (times.length === 0) {
            times = [comp.time];
        }
        
        var keyframes = [];
        for (var i = 0; i < times.length; i++) {
            var time = times[i];
            
            var sPos = shapePosProp.valueAtTime(time, false);
            var sAnchor = shapeAnchorProp ? shapeAnchorProp.valueAtTime(time, false) : [0, 0];
            var lPos = layerPosProp.valueAtTime(time, false);
            var lAnchor = layerAnchorProp ? layerAnchorProp.valueAtTime(time, false) : [0, 0];
            var sScale = shapeScaleProp.valueAtTime(time, false);
            var sRot = shapeRotProp.valueAtTime(time, false);
            var lScale = layerScaleProp.valueAtTime(time, false);
            var lRot = layerRotProp.valueAtTime(time, false);
            var targetAnchor = anchorTargetProp ? anchorTargetProp.valueAtTime(time, false) : sAnchor;
            
            // World position of current shape anchor
            var offset = subtractVectors(sPos, lAnchor);
            offset = scaleVector(offset, lScale);
            offset = rotateVector(offset, lRot);
            var worldAnchorPos = addVectors(lPos, offset);
            
            // Adjust for anchor change so rotation/scale pivot stays consistent
            var oldAnchorTerm = applyCompositeToVector(sAnchor, sScale, sRot, lScale, lRot);
            var newAnchorTerm = applyCompositeToVector(targetAnchor, sScale, sRot, lScale, lRot);
            
            var newShapePos = addVectors(subtractVectors(worldAnchorPos, oldAnchorTerm), newAnchorTerm);
            newShapePos = normalizeValueForProp(shapePosProp, newShapePos);
            
            // Handle Z if present (simplified, keeps existing Z offsets)
            if (sPos.length > 2 || lPos.length > 2) {
                var zOffset = (sPos.length > 2 ? sPos[2] : 0) - (lAnchor.length > 2 ? lAnchor[2] : 0);
                if (lScale.length > 2) {
                    zOffset *= lScale[2] / 100;
                }
                var z = (lPos.length > 2 ? lPos[2] : 0) + zOffset;
                newShapePos[2] = z;
            }
            
            keyframes.push({
                time: time,
                value: newShapePos
            });
        }
        
        return keyframes;
    }

    // Calculate new Position keyframes based on Shape Position world location
    function calculatePositionKeyframes(shapePosProp, shapeAnchorProp, layerTransform, comp) {
        // Relevant properties that affect World Position of Shape Anchor
        var relevantProps = [
            shapePosProp,
            shapeAnchorProp,
            layerTransform.property("Position"),
            layerTransform.property("Anchor Point"),
            layerTransform.property("Scale"),
            layerTransform.property("Rotation")
        ];
        
        var times = getUniqueKeyTimes(relevantProps);
        if (times.length === 0) {
            times = [comp.time]; // If no keys, use current time
        }
        
        var keyframes = [];
        
        for (var i = 0; i < times.length; i++) {
            var time = times[i];
            
            // Get values
            var shapePos = shapePosProp.valueAtTime(time, false);
            var shapeAnchor = shapeAnchorProp ? shapeAnchorProp.valueAtTime(time, false) : [0,0];
            var layerPos = layerTransform.property("Position").valueAtTime(time, false);
            var layerAnchor = layerTransform.property("Anchor Point").valueAtTime(time, false);
            var layerScale = layerTransform.property("Scale").valueAtTime(time, false);
            var layerRot = layerTransform.property("Rotation").valueAtTime(time, false);
            
            // Calculate World Position of Shape Anchor
            // P_world = L_pos + Rotate(Scale(S_pos - L_anchor))
            
            var offset = [
                shapePos[0] - layerAnchor[0],
                shapePos[1] - layerAnchor[1]
            ];
            
            // Apply Layer Scale
            if (layerScale.length >= 2) {
                offset[0] *= layerScale[0] / 100;
                offset[1] *= layerScale[1] / 100;
            }
            
            // Apply Layer Rotation
            if (layerRot !== 0) {
                var rad = layerRot * Math.PI / 180;
                var cos = Math.cos(rad);
                var sin = Math.sin(rad);
                var x = offset[0] * cos - offset[1] * sin;
                var y = offset[0] * sin + offset[1] * cos;
                offset[0] = x;
                offset[1] = y;
            }
            
            var worldPos = [
                layerPos[0] + offset[0],
                layerPos[1] + offset[1]
            ];
            
            // Handle 3D (simplified)
            if (shapePos.length > 2 || layerPos.length > 2) {
                var zOffset = (shapePos.length > 2 ? shapePos[2] : 0) - (layerAnchor.length > 2 ? layerAnchor[2] : 0);
                if (layerScale.length > 2) zOffset *= layerScale[2] / 100;
                var z = (layerPos.length > 2 ? layerPos[2] : 0) + zOffset;
                worldPos.push(z);
            }
            
            keyframes.push({
                time: time,
                value: worldPos
            });
        }
        
        return keyframes;
    }
    
    // Combine Scale: (first * second) / 100
    function combineAndApplyScale(firstScaleProp, secondScaleProp, targetProp, interpolationSource) {
        var times = getUniqueKeyTimes([firstScaleProp, secondScaleProp]);
        if (times.length === 0) {
            times = [app.project.activeItem.time];
        }
        
        if (!targetProp) targetProp = secondScaleProp;
        if (!interpolationSource) interpolationSource = firstScaleProp;
        
        var newKeyframes = [];
        for (var i = 0; i < times.length; i++) {
            var time = times[i];
            var s = firstScaleProp.valueAtTime(time, false);
            var l = secondScaleProp.valueAtTime(time, false);
            
            var combined = [];
            for (var j = 0; j < Math.max(s.length, l.length); j++) {
                var sv = j < s.length ? s[j] : s[0];
                var lv = j < l.length ? l[j] : l[0];
                combined.push((sv * lv) / 100);
            }
            newKeyframes.push({time: time, value: combined});
        }
        
        applyKeyframes(targetProp, newKeyframes);
        copyInterpolation(interpolationSource, targetProp, newKeyframes);
    }
    
    // Combine Rotation: first + second
    function combineAndApplyRotation(firstRotProp, secondRotProp, targetProp, interpolationSource) {
        var times = getUniqueKeyTimes([firstRotProp, secondRotProp]);
        if (times.length === 0) {
            times = [app.project.activeItem.time];
        }
        
        if (!targetProp) targetProp = secondRotProp;
        if (!interpolationSource) interpolationSource = firstRotProp;
        
        var newKeyframes = [];
        for (var i = 0; i < times.length; i++) {
            var time = times[i];
            var s = firstRotProp.valueAtTime(time, false);
            var l = secondRotProp.valueAtTime(time, false);
            newKeyframes.push({time: time, value: s + l});
        }
        
        applyKeyframes(targetProp, newKeyframes);
        copyInterpolation(interpolationSource, targetProp, newKeyframes);
    }
    
    // Combine Opacity: (first * second) / 100
    function combineAndApplyOpacity(firstOpProp, secondOpProp, targetProp, interpolationSource) {
        var times = getUniqueKeyTimes([firstOpProp, secondOpProp]);
        if (times.length === 0) {
            times = [app.project.activeItem.time];
        }
        
        if (!targetProp) targetProp = secondOpProp;
        if (!interpolationSource) interpolationSource = firstOpProp;
        
        var newKeyframes = [];
        for (var i = 0; i < times.length; i++) {
            var time = times[i];
            var s = firstOpProp.valueAtTime(time, false);
            var l = secondOpProp.valueAtTime(time, false);
            newKeyframes.push({time: time, value: (s * l) / 100});
        }
        
        applyKeyframes(targetProp, newKeyframes);
        copyInterpolation(interpolationSource, targetProp, newKeyframes);
    }
    
    // Ensure values match target property dimensions (prevents 2D/3D mismatches)
    function normalizeValueForProp(prop, value) {
        if (!prop) return value;
        if (value === null || value === undefined) return value;
        
        // Non-array values (opacity, rotation, etc.)
        if (typeof value.length === "undefined") return value;
        
        // Determine target dimension
        var target = prop.value;
        var targetDim = 0;
        if (target && typeof target.length !== "undefined") {
            targetDim = target.length;
        } else if (prop.propertyValueType === PropertyValueType.TwoD || prop.propertyValueType === PropertyValueType.TwoD_SPATIAL) {
            targetDim = 2;
        } else if (prop.propertyValueType === PropertyValueType.ThreeD || prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL) {
            targetDim = 3;
        } else {
            targetDim = value.length || 1;
        }
        
        var out = [];
        for (var i = 0; i < targetDim; i++) {
            if (i < value.length) {
                out.push(value[i]);
            } else {
                // Fill missing components with sensible defaults
                if (prop.matchName === "ADBE Scale") {
                    out.push(100);
                } else {
                    out.push(0);
                }
            }
        }
        
        // If the property is effectively 1D, collapse to a scalar
        if (targetDim === 1 && out.length > 0 && typeof prop.value === "number") {
            return out[0];
        }
        
        return out;
    }
    
    // Apply keyframes to property (clears existing keys first)
    function applyKeyframes(targetProp, keyframes) {
        // Clear existing
        while (targetProp.numKeys > 0) {
            targetProp.removeKey(1);
        }
        
        if (keyframes.length === 0) return;
        
        // If only one value (no animation), just set value
        if (keyframes.length === 1) {
            targetProp.setValue(normalizeValueForProp(targetProp, keyframes[0].value));
            return;
        }
        
        // Apply keys
        for (var i = 0; i < keyframes.length; i++) {
            targetProp.setValueAtTime(keyframes[i].time, normalizeValueForProp(targetProp, keyframes[i].value));
        }
    }
    
    // Copy interpolation from source to target
    function copyInterpolation(sourceProp, targetProp, keyframes) {
        if (targetProp.numKeys <= 1) return;
        
        for (var i = 1; i <= targetProp.numKeys; i++) {
            var t = targetProp.keyTime(i);
            var sourceKeyIndex = -1;
            if (sourceProp.numKeys > 0) {
                for (var j = 1; j <= sourceProp.numKeys; j++) {
                    if (Math.abs(sourceProp.keyTime(j) - t) < 0.001) {
                        sourceKeyIndex = j;
                        break;
                    }
                }
            }
            
            if (sourceKeyIndex !== -1) {
                try {
                    var inInterp = sourceProp.keyInInterpolationType(sourceKeyIndex);
                    var outInterp = sourceProp.keyOutInterpolationType(sourceKeyIndex);
                    targetProp.setInterpolationTypeAtKey(i, inInterp, outInterp);
                    
                     if (sourceProp.propertyValueType === PropertyValueType.TwoD || 
                        sourceProp.propertyValueType === PropertyValueType.ThreeD) {
                        try {
                             var inTan = sourceProp.keyInSpatialTangent(sourceKeyIndex);
                             var outTan = sourceProp.keyOutSpatialTangent(sourceKeyIndex);
                             targetProp.setSpatialTangentsAtKey(i, inTan, outTan);
                        } catch(e){}
                    }
                    
                    try {
                        var inEase = sourceProp.keyInTemporalEase(sourceKeyIndex);
                        var outEase = sourceProp.keyOutTemporalEase(sourceKeyIndex);
                        targetProp.setTemporalEaseAtKey(i, inEase, outEase);
                    } catch(e){}
                    
                } catch (e) {}
            }
        }
    }
    
    // Copy simple property (used for Anchor Point)
    function copyProperty(sourceProp, targetProp) {
        if (!sourceProp || !targetProp) return;
        
        while (targetProp.numKeys > 0) targetProp.removeKey(1);
        
        if (sourceProp.expressionEnabled) {
            targetProp.expression = sourceProp.expression;
            targetProp.expressionEnabled = true;
            return;
        }
        
        if (sourceProp.numKeys > 0) {
            for (var i = 1; i <= sourceProp.numKeys; i++) {
                var v = sourceProp.keyValue(i);
                targetProp.setValueAtTime(sourceProp.keyTime(i), normalizeValueForProp(targetProp, v));
            }
            copyInterpolation(sourceProp, targetProp);
        } else {
            targetProp.setValue(normalizeValueForProp(targetProp, sourceProp.value));
        }
    }

    // Reset property to default value
    function resetProperty(prop, defaultValue) {
        if (!prop) return;
        
        try {
            prop.expressionEnabled = false;
            prop.expression = "";
            while (prop.numKeys > 0) prop.removeKey(1);
            
            if (defaultValue !== undefined) {
                prop.setValue(normalizeValueForProp(prop, defaultValue));
            }
        } catch (e) {}
    }
    
    main();
})();
