(function () {
    // ===== LAYER TRANSFORM TOOL - REDESIGNED UI/UX =====
    // A modern, intuitive tool for transforming After Effects layers
    
    var config = {
        panelName: "Layer Transform Tool v2.0",
        spacing: 10,
        margins: 15,
        panelWidth: 400,
        sliderWidth: 150,
        inputWidth: 60,
        buttonHeight: 32
    };
    
    // === MAIN WINDOW ===
    var window = new Window("palette", config.panelName, undefined, { resizeable: true });
    window.orientation = "column";
    window.alignChildren = "fill";
    window.spacing = config.spacing;
    window.margins = config.margins;
    window.preferredSize.width = config.panelWidth;
    
    // === HEADER WITH STATUS ===
    var headerGroup = window.add("group");
    headerGroup.orientation = "row";
    headerGroup.alignChildren = ["fill", "center"];
    
    var titleText = headerGroup.add("statictext", undefined, "Layer Transform Tool");
    titleText.graphics.font = ScriptUI.newFont("Arial", "BOLD", 16);
    
    var statusText = headerGroup.add("statictext", undefined, "Ready");
    statusText.alignment = ["right", "center"];
    statusText.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 10);
    statusText.enabled = false;
    
    // === GLOBAL MODE SELECTION ===
    var modePanel = window.add("panel", undefined, "Operation Mode");
    modePanel.orientation = "row";
    modePanel.alignChildren = ["fill", "center"];
    modePanel.spacing = config.spacing;
    modePanel.margins = config.margins;
    
    var relativeRadio = modePanel.add("radiobutton", undefined, "Add to Current Values");
    var absoluteRadio = modePanel.add("radiobutton", undefined, "Set Absolute Values");
    relativeRadio.value = true;
    
    relativeRadio.helpTip = "Add/subtract from current layer properties";
    absoluteRadio.helpTip = "Set exact values for layer properties";
    
    // === MAIN TABBED PANEL ===
    var tabPanel = window.add("tabbedpanel");
    tabPanel.alignChildren = "fill";
    
    var transformTab = tabPanel.add("tab", undefined, "Transform");
    var randomizeTab = tabPanel.add("tab", undefined, "Randomize");
    var utilitiesTab = tabPanel.add("tab", undefined, "Utilities");
    
    // ========== TRANSFORM TAB ==========
    transformTab.alignChildren = "fill";
    transformTab.spacing = config.spacing;
    
    // Transform values storage
    var transformValues = { position: [0, 0, 0], rotation: 0, scale: [100, 100], opacity: 100 };
    
    // === POSITION CONTROLS ===
    var positionGroup = transformTab.add("panel", undefined, "Position");
    positionGroup.orientation = "column";
    positionGroup.alignChildren = "fill";
    positionGroup.spacing = 8;
    positionGroup.margins = config.margins;
    
    // Helper function to create slider-input pairs
    function createSliderInput(parent, label, defaultValue, min, max, unit) {
        var group = parent.add("group");
        group.orientation = "row";
        group.alignChildren = ["fill", "center"];
        group.spacing = 8;
        
        var labelText = group.add("statictext", undefined, label);
        labelText.preferredSize.width = 30;
        
        var slider = group.add("slider", undefined, defaultValue, min, max);
        slider.preferredSize.width = config.sliderWidth;
        
        var input = group.add("edittext", undefined, defaultValue.toString());
        input.preferredSize.width = config.inputWidth;
        
        if (unit) {
            var unitText = group.add("statictext", undefined, unit);
            unitText.preferredSize.width = 20;
        }
        
        // Sync slider and input
        slider.onChanging = function() {
            input.text = Math.round(this.value).toString();
        };
        
        input.onChanging = function() {
            var value = parseFloat(this.text);
            if (!isNaN(value)) {
                slider.value = Math.max(min, Math.min(max, value));
            }
        };
        
        return { slider: slider, input: input, group: group };
    }
    
    var xControl = createSliderInput(positionGroup, "X:", 0, -2000, 2000, "px");
    var yControl = createSliderInput(positionGroup, "Y:", 0, -2000, 2000, "px");
    var zControl = createSliderInput(positionGroup, "Z:", 0, -1000, 1000, "px");
    
    // === ROTATION CONTROLS ===
    var rotationGroup = transformTab.add("panel", undefined, "Rotation");
    rotationGroup.orientation = "column";
    rotationGroup.alignChildren = "fill";
    rotationGroup.spacing = 8;
    rotationGroup.margins = config.margins;
    
    var rotationControl = createSliderInput(rotationGroup, "Angle:", 0, -360, 360, "°");
    
    // === SCALE CONTROLS ===
    var scaleGroup = transformTab.add("panel", undefined, "Scale");
    scaleGroup.orientation = "column";
    scaleGroup.alignChildren = "fill";
    scaleGroup.spacing = 8;
    scaleGroup.margins = config.margins;
    
    var scaleXControl = createSliderInput(scaleGroup, "X:", 100, 0, 300, "%");
    var scaleYControl = createSliderInput(scaleGroup, "Y:", 100, 0, 300, "%");
    
    var linkGroup = scaleGroup.add("group");
    linkGroup.orientation = "row";
    var linkCheckbox = linkGroup.add("checkbox", undefined, "Link X and Y Scale");
    linkCheckbox.value = true;
    
    // Link scale values
    linkCheckbox.onClick = function() {
        if (this.value) {
            scaleYControl.slider.value = scaleXControl.slider.value;
            scaleYControl.input.text = scaleXControl.input.text;
        }
    };
    
    scaleXControl.slider.onChanging = function() {
        scaleXControl.input.text = Math.round(this.value).toString();
        if (linkCheckbox.value) {
            scaleYControl.slider.value = this.value;
            scaleYControl.input.text = Math.round(this.value).toString();
        }
    };
    
    // === OPACITY CONTROLS ===
    var opacityGroup = transformTab.add("panel", undefined, "Opacity");
    opacityGroup.orientation = "column";
    opacityGroup.alignChildren = "fill";
    opacityGroup.spacing = 8;
    opacityGroup.margins = config.margins;
    
    var opacityControl = createSliderInput(opacityGroup, "Value:", 100, 0, 100, "%");
    
    // === TRANSFORM ACTION BUTTONS ===
    var actionGroup = transformTab.add("group");
    actionGroup.orientation = "row";
    actionGroup.alignChildren = ["center", "center"];
    actionGroup.spacing = 15;
    
    var applyBtn = actionGroup.add("button", undefined, "Apply Transform");
    applyBtn.preferredSize.height = config.buttonHeight;
    applyBtn.preferredSize.width = 150;
    
    var resetBtn = actionGroup.add("button", undefined, "Reset Values");
    resetBtn.preferredSize.height = config.buttonHeight;
    resetBtn.preferredSize.width = 120;
    
    // ========== RANDOMIZE TAB ==========
    randomizeTab.alignChildren = "fill";
    randomizeTab.spacing = config.spacing;
    
    // === PROPERTY SELECTION ===
    var propertyGroup = randomizeTab.add("panel", undefined, "Select Properties to Randomize");
    propertyGroup.orientation = "row";
    propertyGroup.alignChildren = ["fill", "center"];
    propertyGroup.spacing = 15;
    propertyGroup.margins = config.margins;
    
    var randomPosition = propertyGroup.add("checkbox", undefined, "Position");
    var randomRotation = propertyGroup.add("checkbox", undefined, "Rotation");
    var randomScale = propertyGroup.add("checkbox", undefined, "Scale");
    var randomOpacity = propertyGroup.add("checkbox", undefined, "Opacity");
    
    randomPosition.value = true;
    
    // === RANDOMIZATION RANGES ===
    var rangeGroup = randomizeTab.add("panel", undefined, "Randomization Ranges");
    rangeGroup.orientation = "column";
    rangeGroup.alignChildren = "fill";
    rangeGroup.spacing = 8;
    rangeGroup.margins = config.margins;
    
    var posRangeControl = createSliderInput(rangeGroup, "Position:", 100, 0, 500, "px");
    var rotRangeControl = createSliderInput(rangeGroup, "Rotation:", 45, 0, 180, "°");
    var scaleRangeControl = createSliderInput(rangeGroup, "Scale:", 20, 0, 100, "%");
    var opacityRangeControl = createSliderInput(rangeGroup, "Opacity:", 25, 0, 100, "%");
    
    // === RANDOMIZE ACTION BUTTONS ===
    var randomActionGroup = randomizeTab.add("group");
    randomActionGroup.orientation = "row";
    randomActionGroup.alignChildren = ["center", "center"];
    randomActionGroup.spacing = 15;
    
    var applyRandomBtn = randomActionGroup.add("button", undefined, "Apply Randomization");
    applyRandomBtn.preferredSize.height = config.buttonHeight;
    applyRandomBtn.preferredSize.width = 180;
    
    var resetRandomBtn = randomActionGroup.add("button", undefined, "Reset");
    resetRandomBtn.preferredSize.height = config.buttonHeight;
    resetRandomBtn.preferredSize.width = 80;
    
    // ========== UTILITIES TAB ==========
    utilitiesTab.alignChildren = "fill";
    utilitiesTab.spacing = config.spacing;
    
    // === QUICK ACTIONS ===
    var quickGroup = utilitiesTab.add("panel", undefined, "Quick Actions");
    quickGroup.orientation = "column";
    quickGroup.alignChildren = "fill";
    quickGroup.spacing = 10;
    quickGroup.margins = config.margins;
    
    var row1 = quickGroup.add("group");
    row1.orientation = "row";
    row1.alignChildren = ["fill", "center"];
    row1.spacing = 10;
    
    var centerBtn = row1.add("button", undefined, "Center in Comp");
    var roundBtn = row1.add("button", undefined, "Round Positions");
    var centerAvgBtn = row1.add("button", undefined, "Center to Average");
    
    var row2 = quickGroup.add("group");
    row2.orientation = "row";
    row2.alignChildren = ["fill", "center"];
    row2.spacing = 10;
    
    var resetTransformBtn = row2.add("button", undefined, "Reset Transform");
    var distributeBtn = row2.add("button", undefined, "Distribute Evenly");
    
    // === ADVANCED TOOLS ===
    var advancedGroup = utilitiesTab.add("panel", undefined, "Advanced Tools");
    advancedGroup.orientation = "column";
    advancedGroup.alignChildren = "fill";
    advancedGroup.spacing = 10;
    advancedGroup.margins = config.margins;
    
    var row3 = advancedGroup.add("group");
    row3.orientation = "row";
    row3.alignChildren = ["fill", "center"];
    row3.spacing = 10;
    
    var nullParentBtn = row3.add("button", undefined, "Add Null Parent");
    var matchPosBtn = row3.add("button", undefined, "Match Position");
    
    var row4 = advancedGroup.add("group");
    row4.orientation = "row";
    row4.alignChildren = ["fill", "center"];
    row4.spacing = 10;
    
    var flipHBtn = row4.add("button", undefined, "Flip Horizontal");
    var flipVBtn = row4.add("button", undefined, "Flip Vertical");
    
    var row5 = advancedGroup.add("group");
    row5.orientation = "row";
    row5.alignChildren = ["left", "center"];
    row5.spacing = 10;
    
    var individualMirrorCheck = row5.add("checkbox", undefined, "Mirror each layer individually");
    individualMirrorCheck.value = false;
    individualMirrorCheck.helpTip = "On: every layer is mirrored around its own anchor point.\nOff: the selection is mirrored as one group around its combined center.";
    
    flipHBtn.helpTip = "Mirror the selection horizontally around its combined center";
    flipVBtn.helpTip = "Mirror the selection vertically around its combined center";
    
    // ========== HELPER FUNCTIONS ==========
    
    function updateStatus(message, isError) {
        statusText.text = message;
        statusText.graphics.foregroundColor = statusText.graphics.newPen(
            statusText.graphics.PenType.SOLID_COLOR,
            isError ? [1, 0, 0, 1] : [0, 0.6, 0, 1],
            1
        );
    }
    
    function getActiveComp() {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            updateStatus("Please select a composition", true);
            return null;
        }
        return comp;
    }
    
    function getSelectedLayers(comp) {
        if (!comp) return null;
        var layers = comp.selectedLayers;
        if (layers.length === 0) {
            updateStatus("Please select at least one layer", true);
            return null;
        }
        return layers;
    }
    
    // Sets a property value, keeping animated properties intact by writing a key
    function setPropertyValue(prop, value, time) {
        if (prop.numKeys > 0) {
            prop.setValueAtTime(time, value);
        } else {
            prop.setValue(value);
        }
    }
    
    // Drops layers whose parent (or grandparent...) is also selected, so a
    // group operation never transforms the same layer twice
    function getTopLevelLayers(layers) {
        var selected = {};
        for (var i = 0; i < layers.length; i++) {
            selected["i" + layers[i].index] = true;
        }
        
        var result = [];
        for (var j = 0; j < layers.length; j++) {
            var isNested = false;
            var parent = layers[j].parent;
            while (parent) {
                if (selected["i" + parent.index]) {
                    isNested = true;
                    break;
                }
                parent = parent.parent;
            }
            if (!isNested) result.push(layers[j]);
        }
        return result;
    }
    
    // Cameras and lights have neither a scale nor a source rect, so they take
    // no part in bounds measuring or mirroring
    function isAVLayer(layer) {
        return (layer instanceof AVLayer);
    }
    
    // Comp-space location of a layer's anchor point (where its position lands)
    function getLayerCompAnchor(layer, time) {
        try {
            var anchor = layer.transform.anchorPoint.value;
            var point = layer.toComp([anchor[0], anchor[1], anchor[2] || 0], time);
            return [point[0], point[1], point[2] || 0];
        } catch (error) {
            try {
                var pos = layer.transform.position.value;
                return [pos[0], pos[1], pos[2] || 0];
            } catch (innerError) {
                return null;
            }
        }
    }
    
    // Moves a layer so its anchor point lands on a comp-space point, taking
    // any parent's coordinate space into account
    function setLayerCompAnchor(layer, target, time) {
        var current = getLayerCompAnchor(layer, time);
        if (!current) return;
        
        var delta = [target[0] - current[0], target[1] - current[1], (target[2] || 0) - current[2]];
        
        if (layer.parent) {
            try {
                var origin = layer.parent.fromComp([0, 0, 0], time);
                var moved = layer.parent.fromComp(delta, time);
                delta = [
                    moved[0] - origin[0],
                    moved[1] - origin[1],
                    (moved[2] || 0) - (origin[2] || 0)
                ];
            } catch (error) {
                // Parent without a coordinate space (camera/light): use the
                // comp-space delta unchanged
            }
        }
        
        var posProp = layer.transform.position;
        var value = posProp.value;
        var newValue = (value.length > 2)
            ? [value[0] + delta[0], value[1] + delta[1], value[2] + delta[2]]
            : [value[0] + delta[0], value[1] + delta[1]];
        
        setPropertyValue(posProp, newValue, time);
    }
    
    // Comp-space bounding box of one layer, or null when it has no source rect
    function getLayerCompBounds(layer, time) {
        var rect;
        try {
            rect = layer.sourceRectAtTime(time, false);
        } catch (error) {
            return null;
        }
        if (!rect || rect.width === undefined) return null;
        
        var corners = [
            [rect.left, rect.top],
            [rect.left + rect.width, rect.top],
            [rect.left, rect.top + rect.height],
            [rect.left + rect.width, rect.top + rect.height]
        ];
        
        var bounds = null;
        for (var i = 0; i < corners.length; i++) {
            var point;
            try {
                point = layer.toComp(corners[i], time);
            } catch (error) {
                return null;
            }
            if (!bounds) {
                bounds = { left: point[0], right: point[0], top: point[1], bottom: point[1] };
            } else {
                bounds.left = Math.min(bounds.left, point[0]);
                bounds.right = Math.max(bounds.right, point[0]);
                bounds.top = Math.min(bounds.top, point[1]);
                bounds.bottom = Math.max(bounds.bottom, point[1]);
            }
        }
        return bounds;
    }
    
    // Combined comp-space bounding box of a set of layers
    function getSelectionBounds(layers, time) {
        var combined = null;
        var zSum = 0;
        var zCount = 0;
        
        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            if (!isAVLayer(layer)) continue;
            
            var anchor = getLayerCompAnchor(layer, time);
            if (anchor) {
                zSum += anchor[2];
                zCount++;
            }
            
            var bounds = getLayerCompBounds(layer, time);
            if (!bounds) {
                if (!anchor) continue;
                bounds = { left: anchor[0], right: anchor[0], top: anchor[1], bottom: anchor[1] };
            }
            
            if (!combined) {
                combined = { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom };
            } else {
                combined.left = Math.min(combined.left, bounds.left);
                combined.right = Math.max(combined.right, bounds.right);
                combined.top = Math.min(combined.top, bounds.top);
                combined.bottom = Math.max(combined.bottom, bounds.bottom);
            }
        }
        
        if (!combined) return null;
        
        combined.centerX = (combined.left + combined.right) / 2;
        combined.centerY = (combined.top + combined.bottom) / 2;
        combined.centerZ = zCount ? (zSum / zCount) : 0;
        return combined;
    }
    
    // ========== CORE FUNCTIONS ==========
    
    function applyTransforms() {
        var comp = getActiveComp();
        if (!comp) return;
        
        var layers = getSelectedLayers(comp);
        if (!layers) return;
        
        var isRelative = relativeRadio.value;
        
        app.beginUndoGroup("Apply Layer Transform");
        
        try {
            var posX = parseFloat(xControl.input.text) || 0;
            var posY = parseFloat(yControl.input.text) || 0;
            var posZ = parseFloat(zControl.input.text) || 0;
            var rotation = parseFloat(rotationControl.input.text) || 0;
            var scaleX = parseFloat(scaleXControl.input.text) || 100;
            var scaleY = parseFloat(scaleYControl.input.text) || 100;
            var opacity = parseFloat(opacityControl.input.text) || 100;
            
            for (var i = 0; i < layers.length; i++) {
                var layer = layers[i];
                
                // Apply position
                if (posX !== 0 || posY !== 0 || posZ !== 0) {
                    var currentPos = layer.transform.position.value;
                    var newPos;
                    if (isRelative) {
                        newPos = [
                            currentPos[0] + posX,
                            currentPos[1] + posY,
                            (currentPos[2] || 0) + posZ
                        ];
                    } else {
                        var compCenter = [comp.width / 2, comp.height / 2, 0];
                        newPos = [compCenter[0] + posX, compCenter[1] + posY, compCenter[2] + posZ];
                    }
                    layer.transform.position.setValue(newPos);
                }
                
                // Apply rotation
                if (rotation !== 0) {
                    var rotProp = layer.property("ADBE Transform Group").property("ADBE Rotate Z");
                    if (rotProp) {
                        var currentRot = rotProp.value;
                        var newRot = isRelative ? currentRot + rotation : rotation;
                        rotProp.setValue(newRot);
                    } else {
                        updateStatus("Rotation property not accessible", true);
                    }
                }
                
                // Apply scale
                if (scaleX !== 100 || scaleY !== 100) {
                    var currentScale = layer.transform.scale.value;
                    var newScale;
                    if (isRelative) {
                        newScale = [
                            currentScale[0] * (scaleX / 100),
                            currentScale[1] * (scaleY / 100)
                        ];
                    } else {
                        newScale = [scaleX, scaleY];
                    }
                    layer.transform.scale.setValue(newScale);
                }
                
                // Apply opacity
                if (opacity !== 100) {
                    var currentOpacity = layer.transform.opacity.value;
                    var newOpacity = isRelative ? 
                        Math.max(0, Math.min(100, currentOpacity + (opacity - 100))) : 
                        opacity;
                    layer.transform.opacity.setValue(newOpacity);
                }
            }
            
            updateStatus("Transform applied to " + layers.length + " layer(s)");
            
        } catch (error) {
            updateStatus("Error: " + error.toString(), true);
        }
        
        app.endUndoGroup();
    }
    
    function resetControls() {
        xControl.slider.value = 0; xControl.input.text = "0";
        yControl.slider.value = 0; yControl.input.text = "0";
        zControl.slider.value = 0; zControl.input.text = "0";
        rotationControl.slider.value = 0; rotationControl.input.text = "0";
        scaleXControl.slider.value = 100; scaleXControl.input.text = "100";
        scaleYControl.slider.value = 100; scaleYControl.input.text = "100";
        opacityControl.slider.value = 100; opacityControl.input.text = "100";
        updateStatus("Controls reset");
    }
    
    function applyRandomization() {
        var comp = getActiveComp();
        if (!comp) return;
        
        var layers = getSelectedLayers(comp);
        if (!layers) return;
        
        var isRelative = relativeRadio.value; // Use global Operation Mode
        
        app.beginUndoGroup("Randomize Layer Properties");
        
        try {
            var appliedCount = 0;
            
            if (randomPosition.value) {
                var range = parseFloat(posRangeControl.input.text) || 0;
                if (range > 0) {
                    randomizePosition(comp, layers, range, isRelative);
                    appliedCount++;
                }
            }
            
            if (randomRotation.value) {
                var range = parseFloat(rotRangeControl.input.text) || 0;
                if (range > 0) {
                    randomizeRotation(layers, range, isRelative);
                    appliedCount++;
                }
            }
            
            if (randomScale.value) {
                var range = parseFloat(scaleRangeControl.input.text) || 0;
                if (range > 0) {
                    randomizeScale(layers, range, isRelative);
                    appliedCount++;
                }
            }
            
            if (randomOpacity.value) {
                var range = parseFloat(opacityRangeControl.input.text) || 0;
                if (range > 0) {
                    randomizeOpacity(layers, range, isRelative);
                    appliedCount++;
                }
            }
            
            if (appliedCount > 0) {
                updateStatus("Randomized " + appliedCount + " properties on " + layers.length + " layer(s)");
            } else {
                updateStatus("No properties selected for randomization", true);
            }
            
        } catch (error) {
            updateStatus("Error: " + error.toString(), true);
        }
        
        app.endUndoGroup();
    }
    
    function randomizePosition(comp, layers, range, isRelative) {
        if (isRelative && layers.length > 1) {
            // Smart distribution around average
            var avgPos = [0, 0, 0];
            for (var i = 0; i < layers.length; i++) {
                var pos = layers[i].transform.position.value;
                avgPos[0] += pos[0];
                avgPos[1] += pos[1];
                avgPos[2] += (pos[2] || 0);
            }
            avgPos[0] /= layers.length;
            avgPos[1] /= layers.length;
            avgPos[2] /= layers.length;
            
            for (var i = 0; i < layers.length; i++) {
                var newPos = [
                    avgPos[0] + (Math.random() * 2 - 1) * range,
                    avgPos[1] + (Math.random() * 2 - 1) * range,
                    avgPos[2] + (Math.random() * 2 - 1) * range
                ];
                layers[i].transform.position.setValue(newPos);
            }
        } else {
            // Individual randomization
            for (var i = 0; i < layers.length; i++) {
                var layer = layers[i];
                var currentPos = layer.transform.position.value;
                var newPos;
                
                if (isRelative) {
                    newPos = [
                        currentPos[0] + (Math.random() * 2 - 1) * range,
                        currentPos[1] + (Math.random() * 2 - 1) * range,
                        (currentPos[2] || 0) + (Math.random() * 2 - 1) * range
                    ];
                } else {
                    var compCenter = [comp.width / 2, comp.height / 2, 0];
                    newPos = [
                        compCenter[0] + (Math.random() * 2 - 1) * range,
                        compCenter[1] + (Math.random() * 2 - 1) * range,
                        compCenter[2] + (Math.random() * 2 - 1) * range
                    ];
                }
                layer.transform.position.setValue(newPos);
            }
        }
    }
    
    function randomizeRotation(layers, range, isRelative) {
        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            try {
                var rotProp = layer.property("ADBE Transform Group").property("ADBE Rotate Z");
                if (rotProp) {
                    var currentRot = rotProp.value;
                    var randomOffset = (Math.random() * 2 - 1) * range;
                    var newRot = isRelative ? currentRot + randomOffset : randomOffset;
                    rotProp.setValue(newRot);
                } else {
                    updateStatus("Rotation property not accessible", true);
                }
            } catch (error) {
                updateStatus("Randomize rotation error: " + error.toString(), true);
            }
        }
    }
    
    function randomizeScale(layers, range, isRelative) {
        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            var currentScale = layer.transform.scale.value;
            var factor = 1 + (Math.random() * 2 - 1) * (range / 100);
            var newScale = isRelative ? 
                [currentScale[0] * factor, currentScale[1] * factor] :
                [100 * factor, 100 * factor];
            layer.transform.scale.setValue(newScale);
        }
    }
    
    function randomizeOpacity(layers, range, isRelative) {
        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            var currentOpacity = layer.transform.opacity.value;
            var newOpacity = isRelative ?
                Math.max(0, Math.min(100, currentOpacity + (Math.random() * 2 - 1) * range)) :
                Math.max(0, Math.min(100, 100 + (Math.random() * 2 - 1) * range));
            layer.transform.opacity.setValue(newOpacity);
        }
    }
    
    // ========== UTILITY FUNCTIONS ==========
    
    function centerLayers() {
        var comp = getActiveComp();
        if (!comp) return;
        var layers = getSelectedLayers(comp);
        if (!layers) return;
        
        app.beginUndoGroup("Center Layers");
        try {
            var compCenter = [comp.width / 2, comp.height / 2, 0];
            for (var i = 0; i < layers.length; i++) {
                layers[i].transform.position.setValue(compCenter);
            }
            updateStatus("Centered " + layers.length + " layer(s)");
        } catch (error) {
            updateStatus("Error: " + error.toString(), true);
        }
        app.endUndoGroup();
    }

    function centerToAverage() {
        var comp = getActiveComp();
        if (!comp) return;
        var layers = getSelectedLayers(comp);
        if (!layers) return;

        app.beginUndoGroup("Center to Average");
        try {
            var avgPos = [0, 0, 0];
            for (var i = 0; i < layers.length; i++) {
                var pos = layers[i].transform.position.value;
                avgPos[0] += pos[0];
                avgPos[1] += pos[1];
                avgPos[2] += (pos[2] || 0);
            }
            avgPos[0] /= layers.length;
            avgPos[1] /= layers.length;
            avgPos[2] /= layers.length;

            for (var j = 0; j < layers.length; j++) {
                layers[j].transform.position.setValue(avgPos);
            }
            updateStatus("Centered " + layers.length + " layer(s) to average center");
        } catch (error) {
            updateStatus("Error: " + error.toString(), true);
        }
        app.endUndoGroup();
    }
    
    function roundPositions() {
        var comp = getActiveComp();
        if (!comp) return;
        var layers = getSelectedLayers(comp);
        if (!layers) return;
        
        app.beginUndoGroup("Round Positions");
        try {
            for (var i = 0; i < layers.length; i++) {
                var pos = layers[i].transform.position.value;
                var roundedPos = [Math.round(pos[0]), Math.round(pos[1]), Math.round(pos[2] || 0)];
                layers[i].transform.position.setValue(roundedPos);
            }
            updateStatus("Rounded positions for " + layers.length + " layer(s)");
        } catch (error) {
            updateStatus("Error: " + error.toString(), true);
        }
        app.endUndoGroup();
    }
    
    function resetTransform() {
        var comp = getActiveComp();
        if (!comp) return;
        var layers = getSelectedLayers(comp);
        if (!layers) return;
        
        app.beginUndoGroup("Reset Transform");
        try {
            var compCenter = [comp.width / 2, comp.height / 2, 0];
            for (var i = 0; i < layers.length; i++) {
                var layer = layers[i];
                layer.transform.position.setValue(compCenter);
                layer.transform.rotation.setValue(0);
                layer.transform.scale.setValue([100, 100]);
                layer.transform.opacity.setValue(100);
            }
            updateStatus("Reset transform for " + layers.length + " layer(s)");
        } catch (error) {
            updateStatus("Error: " + error.toString(), true);
        }
        app.endUndoGroup();
    }
    
    function distributeLayers() {
        var comp = getActiveComp();
        if (!comp) return;
        var layers = getSelectedLayers(comp);
        if (!layers || layers.length < 2) {
            updateStatus("Select at least 2 layers to distribute", true);
            return;
        }
        
        app.beginUndoGroup("Distribute Layers");
        try {
            var spacing = comp.width / (layers.length + 1);
            var startY = comp.height / 2;
            for (var i = 0; i < layers.length; i++) {
                var newPos = [spacing * (i + 1), startY, 0];
                layers[i].transform.position.setValue(newPos);
            }
            updateStatus("Distributed " + layers.length + " layers evenly");
        } catch (error) {
            updateStatus("Error: " + error.toString(), true);
        }
        app.endUndoGroup();
    }
    
    // ========== ADVANCED UTILITY FUNCTIONS ==========
    
    function addNullParent() {
        var comp = getActiveComp();
        if (!comp) return;
        var layers = getSelectedLayers(comp);
        if (!layers) return;
        
        app.beginUndoGroup("Add Null Parent");
        try {
            // Only layers that are not already children of another selected
            // layer get re-parented, so existing hierarchies stay intact
            var targets = getTopLevelLayers(layers);
            
            // Center of the selection's combined bounding box, measured before
            // the null exists so it is not part of the calculation
            var bounds = getSelectionBounds(layers, comp.time);
            if (!bounds) {
                updateStatus("Could not measure the selection bounds", true);
                app.endUndoGroup();
                return;
            }
            
            var needs3D = false;
            for (var i = 0; i < targets.length; i++) {
                if (targets[i].threeDLayer) {
                    needs3D = true;
                    break;
                }
            }
            
            // Create a null object
            var nullLayer = comp.layers.addNull();
            nullLayer.name = "Parent Null";
            if (needs3D) nullLayer.threeDLayer = true;
            
            // Put the null's anchor point in the middle of its own square so the
            // pivot and the visible null both sit on the selection center
            try {
                var nullRect = nullLayer.sourceRectAtTime(comp.time, false);
                var currentAnchor = nullLayer.transform.anchorPoint.value;
                var centeredAnchor = [
                    nullRect.left + nullRect.width / 2,
                    nullRect.top + nullRect.height / 2
                ];
                if (currentAnchor.length > 2) centeredAnchor.push(currentAnchor[2]);
                nullLayer.transform.anchorPoint.setValue(centeredAnchor);
            } catch (error) {
                // Keep the default anchor point if the null has no source rect
            }
            
            var currentPos = nullLayer.transform.position.value;
            var centerPos = [bounds.centerX, bounds.centerY];
            if (currentPos.length > 2) centerPos.push(needs3D ? bounds.centerZ : 0);
            nullLayer.transform.position.setValue(centerPos);
            
            // Parent the selected layers to the null
            for (var j = 0; j < targets.length; j++) {
                targets[j].parent = nullLayer;
            }
            
            updateStatus("Added null parent at the center of " + layers.length + " layer(s)");
        } catch (error) {
            updateStatus("Error: " + error.toString(), true);
        }
        app.endUndoGroup();
    }
    
    function matchPosition() {
        var comp = getActiveComp();
        if (!comp) return;
        var layers = getSelectedLayers(comp);
        if (!layers || layers.length < 2) {
            updateStatus("Select at least 2 layers to match position", true);
            return;
        }
        
        app.beginUndoGroup("Match Position");
        try {
            // Use the first layer's position as reference
            var referencePos = layers[0].transform.position.value;
            
            for (var i = 1; i < layers.length; i++) {
                layers[i].transform.position.setValue(referencePos);
            }
            
            updateStatus("Matched position of " + (layers.length - 1) + " layer(s) to first layer");
        } catch (error) {
            updateStatus("Error: " + error.toString(), true);
        }
        app.endUndoGroup();
    }
    
    // Negates the scale on the flipped axis, around the layer's own anchor point
    function mirrorLayerScale(layer, isHorizontal, time) {
        var scaleProp = layer.transform.scale;
        var scale = scaleProp.value;
        var newScale = isHorizontal
            ? [-scale[0], scale[1]]
            : [scale[0], -scale[1]];
        if (scale.length > 2) newScale.push(scale[2]);
        setPropertyValue(scaleProp, newScale, time);
    }
    
    // A true mirror also reverses rotation around the axes that the mirror
    // plane flips, otherwise rotated layers end up facing the wrong way
    function mirrorLayerRotation(layer, isHorizontal, time) {
        function negate(prop) {
            if (prop && prop.value !== 0) {
                setPropertyValue(prop, -prop.value, time);
            }
        }
        
        try {
            if (layer.threeDLayer) {
                negate(layer.transform.zRotation);
                negate(isHorizontal ? layer.transform.yRotation : layer.transform.xRotation);
            } else {
                negate(layer.transform.rotation);
            }
        } catch (error) {
            // Cameras, lights and layers without a rotation property
        }
    }
    
    function flipLayers(isHorizontal) {
        var comp = getActiveComp();
        if (!comp) return;
        var layers = getSelectedLayers(comp);
        if (!layers) return;
        
        var axisName = isHorizontal ? "horizontally" : "vertically";
        var individually = individualMirrorCheck.value;
        
        app.beginUndoGroup(isHorizontal ? "Flip Horizontal" : "Flip Vertical");
        try {
            if (individually) {
                for (var i = 0; i < layers.length; i++) {
                    if (!isAVLayer(layers[i])) continue;
                    mirrorLayerScale(layers[i], isHorizontal, comp.time);
                }
                updateStatus("Flipped " + layers.length + " layer(s) " + axisName + " individually");
                app.endUndoGroup();
                return;
            }
            
            // Group mirror: everything is reflected across one shared axis
            // through the center of the whole selection. The axis comes from
            // every selected layer, while only the top-level ones are moved -
            // children follow their parent on their own.
            var targets = getTopLevelLayers(layers);
            var bounds = getSelectionBounds(layers, comp.time);
            if (!bounds) {
                updateStatus("Could not measure the selection bounds", true);
                app.endUndoGroup();
                return;
            }
            
            var axis = isHorizontal ? bounds.centerX : bounds.centerY;
            
            for (var j = 0; j < targets.length; j++) {
                var layer = targets[j];
                if (!isAVLayer(layer)) continue;
                
                var anchor = getLayerCompAnchor(layer, comp.time);
                
                mirrorLayerScale(layer, isHorizontal, comp.time);
                mirrorLayerRotation(layer, isHorizontal, comp.time);
                
                if (anchor) {
                    var target = [anchor[0], anchor[1], anchor[2]];
                    if (isHorizontal) {
                        target[0] = 2 * axis - anchor[0];
                    } else {
                        target[1] = 2 * axis - anchor[1];
                    }
                    setLayerCompAnchor(layer, target, comp.time);
                }
            }
            
            updateStatus("Flipped " + layers.length + " layer(s) " + axisName + " as a group");
        } catch (error) {
            updateStatus("Error: " + error.toString(), true);
        }
        app.endUndoGroup();
    }
    
    function flipHorizontal() {
        flipLayers(true);
    }
    
    function flipVertical() {
        flipLayers(false);
    }
    
    // ========== EVENT LISTENERS ==========
    
    // Transform tab
    applyBtn.onClick = applyTransforms;
    resetBtn.onClick = resetControls;
    
    // Randomize tab
    applyRandomBtn.onClick = applyRandomization;
    resetRandomBtn.onClick = function() {
        posRangeControl.slider.value = 100; posRangeControl.input.text = "100";
        rotRangeControl.slider.value = 45; rotRangeControl.input.text = "45";
        scaleRangeControl.slider.value = 20; scaleRangeControl.input.text = "20";
        opacityRangeControl.slider.value = 25; opacityRangeControl.input.text = "25";
        randomPosition.value = true;
        randomRotation.value = false;
        randomScale.value = false;
        randomOpacity.value = false;
        updateStatus("Randomization settings reset");
    };
    
    // Utilities tab
    centerBtn.onClick = centerLayers;
    centerAvgBtn.onClick = centerToAverage;
    roundBtn.onClick = roundPositions;
    resetTransformBtn.onClick = resetTransform;
    distributeBtn.onClick = distributeLayers;
    
    // Advanced tools
    nullParentBtn.onClick = addNullParent;
    matchPosBtn.onClick = matchPosition;
    flipHBtn.onClick = flipHorizontal;
    flipVBtn.onClick = flipVertical;
    
    // Set default tab
    tabPanel.selection = transformTab;
    
    // Initialize
    updateStatus("Layer Transform Tool ready");
    window.center();
    window.show();
    
})();
