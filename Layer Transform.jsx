(function (thisObj) {
    // ===== LAYER TRANSFORM TOOL =====
    // A modern, intuitive tool for transforming After Effects layers.
    // Runs as a floating palette, or docked when placed in ScriptUI Panels.

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
    var panel = (thisObj instanceof Panel)
        ? thisObj
        : new Window("palette", config.panelName, undefined, { resizeable: true });
    panel.orientation = "column";
    panel.alignChildren = "fill";
    panel.spacing = config.spacing;
    panel.margins = config.margins;
    panel.preferredSize.width = config.panelWidth;

    // === HEADER WITH STATUS ===
    var headerGroup = panel.add("group");
    headerGroup.orientation = "row";
    headerGroup.alignChildren = ["fill", "center"];

    var titleText = headerGroup.add("statictext", undefined, config.panelName);
    titleText.graphics.font = ScriptUI.newFont("Arial", "BOLD", 16);

    // The status line gets a row of its own so long summaries stay readable
    var statusGroup = panel.add("group");
    statusGroup.orientation = "row";
    statusGroup.alignChildren = ["fill", "center"];

    var statusText = statusGroup.add("statictext", undefined, "Ready", { multiline: true });
    statusText.alignment = ["fill", "top"];
    statusText.preferredSize.height = 34;
    statusText.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 10);

    // === GLOBAL MODE SELECTION ===
    var modePanel = panel.add("panel", undefined, "Operation Mode");
    modePanel.orientation = "row";
    modePanel.alignChildren = ["fill", "center"];
    modePanel.spacing = config.spacing;
    modePanel.margins = config.margins;

    var relativeRadio = modePanel.add("radiobutton", undefined, "Add to Current Values");
    var absoluteRadio = modePanel.add("radiobutton", undefined, "Set Absolute Values");
    relativeRadio.value = true;

    relativeRadio.helpTip = "Position and rotation are added, scale is multiplied,\nopacity is offset from 100%.";
    absoluteRadio.helpTip = "Set exact values. Position is a composition coordinate.\nOnly the properties ticked under 'Properties to Apply' are written.";
    modePanel.helpTip = "Applies to the Transform and Randomize tabs. The Utilities tab has fixed behaviour.";

    // === MAIN TABBED PANEL ===
    var tabPanel = panel.add("tabbedpanel");
    tabPanel.alignChildren = "fill";

    var transformTab = tabPanel.add("tab", undefined, "Transform");
    var randomizeTab = tabPanel.add("tab", undefined, "Randomize");
    var utilitiesTab = tabPanel.add("tab", undefined, "Utilities");

    // ========== TRANSFORM TAB ==========
    transformTab.alignChildren = "fill";
    transformTab.spacing = config.spacing;

    // === PROPERTY SELECTION ===
    // Without this the tool could never write a default value (scale 100%,
    // opacity 100, rotation 0), because it had to guess intent from the value
    var applyPropsGroup = transformTab.add("panel", undefined, "Properties to Apply");
    applyPropsGroup.orientation = "row";
    applyPropsGroup.alignChildren = ["fill", "center"];
    applyPropsGroup.spacing = 15;
    applyPropsGroup.margins = config.margins;

    var applyPositionCheck = applyPropsGroup.add("checkbox", undefined, "Position");
    var applyRotationCheck = applyPropsGroup.add("checkbox", undefined, "Rotation");
    var applyScaleCheck = applyPropsGroup.add("checkbox", undefined, "Scale");
    var applyOpacityCheck = applyPropsGroup.add("checkbox", undefined, "Opacity");

    applyPositionCheck.value = true;
    applyRotationCheck.value = true;
    applyScaleCheck.value = true;
    applyOpacityCheck.value = true;

    applyPropsGroup.helpTip = "Only the ticked properties are written when you press Apply Transform";

    // === POSITION CONTROLS ===
    var positionGroup = transformTab.add("panel", undefined, "Position");
    positionGroup.orientation = "column";
    positionGroup.alignChildren = "fill";
    positionGroup.spacing = 8;
    positionGroup.margins = config.margins;

    // Rounds for display without throwing away typed precision
    function formatValue(value) {
        return (Math.round(value * 100) / 100).toString();
    }

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
        input.helpTip = "The field accepts decimals and values beyond the slider's range";

        if (unit) {
            var unitText = group.add("statictext", undefined, unit);
            unitText.preferredSize.width = 20;
        }

        var control = {
            slider: slider,
            input: input,
            group: group,
            min: min,
            max: max,
            onUserChange: null
        };

        // The text field is the source of truth, so typed values are never
        // clamped or rounded away - only the slider's handle is kept in range
        control.get = function () {
            var value = parseFloat(this.input.text);
            return isNaN(value) ? defaultValue : value;
        };

        control.set = function (value) {
            var numeric = parseFloat(value);
            if (isNaN(numeric)) return;
            this.input.text = formatValue(numeric);
            this.slider.value = Math.max(min, Math.min(max, numeric));
        };

        function notify() {
            if (control.onUserChange) control.onUserChange(control);
        }

        slider.onChanging = function () {
            input.text = formatValue(this.value);
            notify();
        };

        input.onChanging = function () {
            var value = parseFloat(this.text);
            if (!isNaN(value)) {
                slider.value = Math.max(min, Math.min(max, value));
                notify();
            }
        };

        input.onChange = function () {
            var value = parseFloat(this.text);
            if (isNaN(value)) {
                this.text = formatValue(slider.value);
            } else {
                this.text = formatValue(value);
                slider.value = Math.max(min, Math.min(max, value));
            }
            notify();
        };

        return control;
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

    // The link follows typing as well as dragging, and works in both directions
    linkCheckbox.onClick = function () {
        if (this.value) scaleYControl.set(scaleXControl.get());
    };

    scaleXControl.onUserChange = function (control) {
        if (linkCheckbox.value) scaleYControl.set(control.get());
    };

    scaleYControl.onUserChange = function (control) {
        if (linkCheckbox.value) scaleXControl.set(control.get());
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

    rangeGroup.helpTip = "Each value is a maximum deviation: the result lands anywhere between minus and plus this amount";

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

    centerBtn.helpTip = "Move every selected layer so its visible center sits on the comp center";
    roundBtn.helpTip = "Round each layer's position values to whole pixels";
    centerAvgBtn.helpTip = "Stack every selected layer on the average of their visible centers";

    var row2 = quickGroup.add("group");
    row2.orientation = "row";
    row2.alignChildren = ["fill", "center"];
    row2.spacing = 10;

    var resetTransformBtn = row2.add("button", undefined, "Reset Transform");
    var distributeBtn = row2.add("button", undefined, "Distribute Evenly");

    resetTransformBtn.helpTip = "Position to comp center, rotation 0, scale 100%, opacity 100%";
    distributeBtn.helpTip = "Spread the in-between layers evenly between the two outermost ones,\nalong whichever axis the selection is wider";

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

    nullParentBtn.helpTip = "Create a null at the center of the selection and parent the selection to it";
    matchPosBtn.helpTip = "Move every selected layer onto the position of the topmost selected layer";

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

    function describeError(error) {
        var message = (error && error.toString) ? error.toString() : String(error);
        if (error && error.line) message += " (line " + error.line + ")";
        return message;
    }

    // After Effects' own error text is far longer than one status row, so a
    // failed run also opens a dialog where the whole message is readable
    function reportFailures(title, failures) {
        if (failures.length === 0) return;
        
        var lines = [];
        for (var i = 0; i < failures.length && i < 10; i++) {
            lines.push("- " + failures[i]);
        }
        if (failures.length > 10) {
            lines.push("...and " + (failures.length - 10) + " more");
        }
        
        alert(title + " could not finish:\n\n" + lines.join("\n"));
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

    // Counted while a run is in progress: a property with an expression accepts
    // a new value but the expression keeps overriding it, so the user sees
    // nothing happen unless we say so
    var expressionConflicts = 0;

    // Sets a property value, keeping animated properties intact by writing a key
    function setPropertyValue(prop, value, time) {
        if (prop.expressionEnabled) expressionConflicts++;
        if (prop.numKeys > 0) {
            prop.setValueAtTime(time, value);
        } else {
            prop.setValue(value);
        }
    }

    // Keeps a value at the dimension the property already uses: a 3D layer's
    // position and scale have three components, a 2D layer's have two
    function matchDimensions(current, next) {
        var result = [next[0], next[1]];
        if (current.length > 2) {
            result.push(next.length > 2 ? next[2] : current[2]);
        }
        return result;
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

    // A 2D layer wants a 2D point and a 3D layer a 3D one; handing either the
    // wrong shape is rejected by After Effects
    function layerPoint(layer, point) {
        return layer.threeDLayer
            ? [point[0], point[1], point[2] || 0]
            : [point[0], point[1]];
    }
    
    // Comp-space location of a layer's anchor point (where its position lands)
    function getLayerCompAnchor(layer, time) {
        try {
            var anchor = layer.transform.anchorPoint.value;
            var point = layer.toComp(layerPoint(layer, anchor), time);
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
                var origin = layer.parent.fromComp(layerPoint(layer.parent, [0, 0, 0]), time);
                var moved = layer.parent.fromComp(layerPoint(layer.parent, delta), time);
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

        setPropertyValue(posProp, matchDimensions(value, [
            value[0] + delta[0],
            value[1] + delta[1],
            (value[2] || 0) + delta[2]
        ]), time);
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
                point = layer.toComp(layerPoint(layer, corners[i]), time);
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

    // Where a layer looks like it sits, which is not its anchor point when the
    // anchor has been moved off center
    function getLayerVisualCenter(layer, time) {
        var bounds = getLayerCompBounds(layer, time);
        if (bounds) {
            return [(bounds.left + bounds.right) / 2, (bounds.top + bounds.bottom) / 2];
        }
        var anchor = getLayerCompAnchor(layer, time);
        return anchor ? [anchor[0], anchor[1]] : null;
    }

    // Moves a layer so its visible center lands on a comp-space point
    function moveLayerVisualCenter(layer, point, time) {
        var anchor = getLayerCompAnchor(layer, time);
        var center = getLayerVisualCenter(layer, time);
        if (!anchor || !center) return;

        setLayerCompAnchor(layer, [
            anchor[0] + (point[0] - center[0]),
            anchor[1] + (point[1] - center[1]),
            anchor[2]
        ], time);
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

    // ========== SELECTION RUNNER ==========

    // Every action goes through here. It resolves the comp and the selection,
    // puts aside the layers it must not write to, owns the undo group, and
    // keeps one failing layer from cancelling the rest of the run.
    //
    // options.avOnly        skip cameras and lights (default true)
    // options.topLevelOnly  skip layers parented to another selected layer
    // options.minLayers     refuse to run below this many usable layers
    //
    // The body receives a context with:
    //   comp, time       the composition and the time the run reads and writes
    //   selected         everything the user had selected
    //   writable         the layers this run may change
    //   targets          writable, after the topLevelOnly filter
    //   each(fn)         run fn per target, collecting failures instead of stopping
    //   attempt(layer, fn)  the same for a single layer
    // and returns the status message, or nothing for a generic one.
    function runOnSelection(undoName, options, body) {
        var comp = getActiveComp();
        if (!comp) return;

        var selected = getSelectedLayers(comp);
        if (!selected) return;

        options = options || {};
        var avOnly = (options.avOnly !== false);

        var writable = [];
        var skippedLocked = 0;
        var skippedType = 0;

        for (var i = 0; i < selected.length; i++) {
            if (selected[i].locked) {
                skippedLocked++;
            } else if (avOnly && !isAVLayer(selected[i])) {
                skippedType++;
            } else {
                writable.push(selected[i]);
            }
        }

        if (writable.length === 0) {
            updateStatus("Nothing in the selection can be transformed" +
                (skippedLocked ? " (" + skippedLocked + " locked)" : ""), true);
            return;
        }

        if (options.minLayers && writable.length < options.minLayers) {
            updateStatus("Select at least " + options.minLayers + " unlocked layer(s)", true);
            return;
        }

        var ctx = {
            comp: comp,
            time: comp.time,
            selected: selected,
            writable: writable,
            targets: options.topLevelOnly ? getTopLevelLayers(writable) : writable,
            applied: 0,
            failures: []
        };

        ctx.attempt = function (layer, work) {
            try {
                work();
                ctx.applied++;
            } catch (error) {
                ctx.failures.push(layer.name + " - " + describeError(error));
            }
        };

        ctx.each = function (perLayer) {
            for (var j = 0; j < ctx.targets.length; j++) {
                var layer = ctx.targets[j];
                try {
                    perLayer(layer, ctx);
                    ctx.applied++;
                } catch (error) {
                    ctx.failures.push(layer.name + " - " + describeError(error));
                }
            }
        };

        expressionConflicts = 0;
        app.beginUndoGroup(undoName);

        var summary = null;
        try {
            summary = body(ctx);
        } catch (error) {
            ctx.failures.push(describeError(error));
        }

        app.endUndoGroup();

        var parts = [summary || (ctx.applied + " layer(s) updated")];
        if (skippedLocked > 0) parts.push(skippedLocked + " locked layer(s) skipped");
        if (skippedType > 0) parts.push(skippedType + " camera/light skipped");
        if (expressionConflicts > 0) parts.push(expressionConflicts + " expression(s) override the result");
        if (ctx.failures.length > 0) parts.push(ctx.failures.length + " failed: " + ctx.failures[0]);

        updateStatus(parts.join(" · "), ctx.failures.length > 0);
        reportFailures(undoName, ctx.failures);
    }

    // ========== CORE FUNCTIONS ==========

    function applyTransforms() {
        var isRelative = relativeRadio.value;

        runOnSelection("Apply Layer Transform", {}, function (ctx) {
            var posX = xControl.get();
            var posY = yControl.get();
            var posZ = zControl.get();
            var rotation = rotationControl.get();
            var scaleX = scaleXControl.get();
            var scaleY = scaleYControl.get();
            var opacity = opacityControl.get();

            ctx.each(function (layer) {
                if (applyPositionCheck.value) {
                    var anchor = getLayerCompAnchor(layer, ctx.time);
                    if (anchor) {
                        setLayerCompAnchor(layer, isRelative
                            ? [anchor[0] + posX, anchor[1] + posY, anchor[2] + posZ]
                            : [posX, posY, posZ], ctx.time);
                    }
                }

                if (applyRotationCheck.value) {
                    var rotProp = layer.property("ADBE Transform Group").property("ADBE Rotate Z");
                    if (!rotProp) throw new Error("no Z rotation property");
                    setPropertyValue(rotProp, isRelative ? rotProp.value + rotation : rotation, ctx.time);
                }

                if (applyScaleCheck.value) {
                    var scaleProp = layer.transform.scale;
                    var current = scaleProp.value;
                    setPropertyValue(scaleProp, matchDimensions(current, isRelative
                        ? [current[0] * (scaleX / 100), current[1] * (scaleY / 100)]
                        : [scaleX, scaleY]), ctx.time);
                }

                if (applyOpacityCheck.value) {
                    var opacityProp = layer.transform.opacity;
                    var newOpacity = isRelative ? opacityProp.value + (opacity - 100) : opacity;
                    setPropertyValue(opacityProp, Math.max(0, Math.min(100, newOpacity)), ctx.time);
                }
            });

            return "Transform applied to " + ctx.applied + " layer(s)";
        });
    }

    function resetControls() {
        xControl.set(0);
        yControl.set(0);
        zControl.set(0);
        rotationControl.set(0);
        scaleXControl.set(100);
        scaleYControl.set(100);
        opacityControl.set(100);
        applyPositionCheck.value = true;
        applyRotationCheck.value = true;
        applyScaleCheck.value = true;
        applyOpacityCheck.value = true;
        updateStatus("Controls reset");
    }

    // ========== RANDOMIZATION ==========

    function randomOffset(range) {
        return (Math.random() * 2 - 1) * range;
    }

    function applyRandomization() {
        var isRelative = relativeRadio.value;

        var chosen = [];
        if (randomPosition.value && posRangeControl.get() > 0) chosen.push("position");
        if (randomRotation.value && rotRangeControl.get() > 0) chosen.push("rotation");
        if (randomScale.value && scaleRangeControl.get() > 0) chosen.push("scale");
        if (randomOpacity.value && opacityRangeControl.get() > 0) chosen.push("opacity");

        if (chosen.length === 0) {
            updateStatus("No properties selected for randomization", true);
            return;
        }

        runOnSelection("Randomize Layer Properties", {}, function (ctx) {
            var posRange = posRangeControl.get();
            var rotRange = rotRangeControl.get();
            var scaleRange = scaleRangeControl.get();
            var opacityRange = opacityRangeControl.get();

            ctx.each(function (layer) {
                for (var i = 0; i < chosen.length; i++) {
                    switch (chosen[i]) {
                        case "position":
                            randomizeLayerPosition(layer, ctx, posRange, isRelative);
                            break;
                        case "rotation":
                            randomizeLayerRotation(layer, ctx, rotRange, isRelative);
                            break;
                        case "scale":
                            randomizeLayerScale(layer, ctx, scaleRange, isRelative);
                            break;
                        case "opacity":
                            randomizeLayerOpacity(layer, ctx, opacityRange, isRelative);
                            break;
                    }
                }
            });

            return "Randomized " + chosen.length + " propert" + (chosen.length === 1 ? "y" : "ies") +
                " on " + ctx.applied + " layer(s)";
        });
    }

    // "Add to Current Values" jitters each layer where it stands; only the
    // absolute mode scatters the selection around the comp center
    function randomizeLayerPosition(layer, ctx, range, isRelative) {
        var anchor = getLayerCompAnchor(layer, ctx.time);
        if (!anchor) return;

        var target = isRelative
            ? [anchor[0] + randomOffset(range), anchor[1] + randomOffset(range), anchor[2] + randomOffset(range)]
            : [
                ctx.comp.width / 2 + randomOffset(range),
                ctx.comp.height / 2 + randomOffset(range),
                randomOffset(range)
            ];

        setLayerCompAnchor(layer, target, ctx.time);
    }

    function randomizeLayerRotation(layer, ctx, range, isRelative) {
        var rotProp = layer.property("ADBE Transform Group").property("ADBE Rotate Z");
        if (!rotProp) throw new Error("no Z rotation property");

        var offset = randomOffset(range);
        setPropertyValue(rotProp, isRelative ? rotProp.value + offset : offset, ctx.time);
    }

    function randomizeLayerScale(layer, ctx, range, isRelative) {
        var scaleProp = layer.transform.scale;
        var current = scaleProp.value;
        var factor = 1 + randomOffset(range / 100);

        setPropertyValue(scaleProp, matchDimensions(current, isRelative
            ? [current[0] * factor, current[1] * factor]
            : [100 * factor, 100 * factor]), ctx.time);
    }

    function randomizeLayerOpacity(layer, ctx, range, isRelative) {
        var opacityProp = layer.transform.opacity;
        var base = isRelative ? opacityProp.value : 100;

        setPropertyValue(opacityProp, Math.max(0, Math.min(100, base + randomOffset(range))), ctx.time);
    }

    // ========== UTILITY FUNCTIONS ==========

    function centerLayers() {
        runOnSelection("Center Layers", {}, function (ctx) {
            var center = [ctx.comp.width / 2, ctx.comp.height / 2];
            ctx.each(function (layer) {
                moveLayerVisualCenter(layer, center, ctx.time);
            });
            return "Centered " + ctx.applied + " layer(s) in the comp";
        });
    }

    function centerToAverage() {
        runOnSelection("Center to Average", {}, function (ctx) {
            var sumX = 0, sumY = 0, count = 0;

            for (var i = 0; i < ctx.targets.length; i++) {
                var center = getLayerVisualCenter(ctx.targets[i], ctx.time);
                if (center) {
                    sumX += center[0];
                    sumY += center[1];
                    count++;
                }
            }

            if (count === 0) throw new Error("could not measure the selection");

            var average = [sumX / count, sumY / count];
            ctx.each(function (layer) {
                moveLayerVisualCenter(layer, average, ctx.time);
            });

            return "Stacked " + ctx.applied + " layer(s) on their average center";
        });
    }

    function roundPositions() {
        runOnSelection("Round Positions", { avOnly: false }, function (ctx) {
            ctx.each(function (layer) {
                var posProp = layer.transform.position;
                var pos = posProp.value;
                setPropertyValue(posProp, matchDimensions(pos, [
                    Math.round(pos[0]),
                    Math.round(pos[1]),
                    Math.round(pos[2] || 0)
                ]), ctx.time);
            });
            return "Rounded positions for " + ctx.applied + " layer(s)";
        });
    }

    function resetLayerRotation(layer, time) {
        var transform = layer.property("ADBE Transform Group");
        setPropertyValue(transform.property("ADBE Rotate Z"), 0, time);

        if (layer.threeDLayer) {
            setPropertyValue(transform.property("ADBE Rotate X"), 0, time);
            setPropertyValue(transform.property("ADBE Rotate Y"), 0, time);
            setPropertyValue(transform.property("ADBE Orientation"), [0, 0, 0], time);
        }
    }

    function resetTransform() {
        runOnSelection("Reset Transform", {}, function (ctx) {
            var center = [ctx.comp.width / 2, ctx.comp.height / 2, 0];

            ctx.each(function (layer) {
                setLayerCompAnchor(layer, center, ctx.time);
                resetLayerRotation(layer, ctx.time);

                var scaleProp = layer.transform.scale;
                setPropertyValue(scaleProp, matchDimensions(scaleProp.value, [100, 100, 100]), ctx.time);
                setPropertyValue(layer.transform.opacity, 100, ctx.time);
            });

            return "Reset transform for " + ctx.applied + " layer(s)";
        });
    }

    function distributeLayers() {
        runOnSelection("Distribute Layers", { minLayers: 3, topLevelOnly: true }, function (ctx) {
            var entries = [];
            for (var i = 0; i < ctx.targets.length; i++) {
                var center = getLayerVisualCenter(ctx.targets[i], ctx.time);
                if (center) entries.push({ layer: ctx.targets[i], center: center });
            }

            if (entries.length < 3) throw new Error("needs at least 3 measurable layers");

            // Spread along whichever axis the selection already runs, so the
            // other axis - and the layers' own spacing on it - is left alone
            var minX = entries[0].center[0], maxX = minX;
            var minY = entries[0].center[1], maxY = minY;
            for (var j = 1; j < entries.length; j++) {
                minX = Math.min(minX, entries[j].center[0]);
                maxX = Math.max(maxX, entries[j].center[0]);
                minY = Math.min(minY, entries[j].center[1]);
                maxY = Math.max(maxY, entries[j].center[1]);
            }

            var horizontal = (maxX - minX) >= (maxY - minY);
            var axis = horizontal ? 0 : 1;

            entries.sort(function (a, b) {
                return a.center[axis] - b.center[axis];
            });

            var start = entries[0].center[axis];
            var step = (entries[entries.length - 1].center[axis] - start) / (entries.length - 1);

            if (step === 0) throw new Error("the layers sit on the same spot");

            for (var k = 1; k < entries.length - 1; k++) {
                (function (entry, index) {
                    ctx.attempt(entry.layer, function () {
                        var point = horizontal
                            ? [start + step * index, entry.center[1]]
                            : [entry.center[0], start + step * index];
                        moveLayerVisualCenter(entry.layer, point, ctx.time);
                    });
                })(entries[k], k);
            }

            return "Distributed " + entries.length + " layer(s) " + (horizontal ? "horizontally" : "vertically");
        });
    }

    // ========== ADVANCED UTILITY FUNCTIONS ==========

    function addNullParent() {
        runOnSelection("Add Null Parent", { topLevelOnly: true }, function (ctx) {
            // Center of the selection's combined bounding box, measured before
            // the null exists so it is not part of the calculation
            var bounds = getSelectionBounds(ctx.writable, ctx.time);
            if (!bounds) throw new Error("could not measure the selection bounds");

            var needs3D = false;
            for (var i = 0; i < ctx.targets.length; i++) {
                if (ctx.targets[i].threeDLayer) {
                    needs3D = true;
                    break;
                }
            }

            // Create a null object
            var nullLayer = ctx.comp.layers.addNull();
            nullLayer.name = "Parent Null";
            if (needs3D) nullLayer.threeDLayer = true;

            // Put the null's anchor point in the middle of its own square so the
            // pivot and the visible null both sit on the selection center
            try {
                var nullRect = nullLayer.sourceRectAtTime(ctx.time, false);
                var currentAnchor = nullLayer.transform.anchorPoint.value;
                nullLayer.transform.anchorPoint.setValue(matchDimensions(currentAnchor, [
                    nullRect.left + nullRect.width / 2,
                    nullRect.top + nullRect.height / 2
                ]));
            } catch (error) {
                // Keep the default anchor point if the null has no source rect
            }

            var currentPos = nullLayer.transform.position.value;
            nullLayer.transform.position.setValue(matchDimensions(currentPos, [
                bounds.centerX,
                bounds.centerY,
                needs3D ? bounds.centerZ : 0
            ]));

            // Parent the selected layers to the null
            ctx.each(function (layer) {
                layer.parent = nullLayer;
            });

            return "Added null parent at the center of " + ctx.applied + " layer(s)";
        });
    }

    function matchPosition() {
        runOnSelection("Match Position", { minLayers: 2 }, function (ctx) {
            // comp.selectedLayers is ordered by the timeline, so the reference
            // is the topmost selected layer rather than the first one clicked
            var reference = ctx.targets[0];
            var target = getLayerCompAnchor(reference, ctx.time);
            if (!target) throw new Error("could not read " + reference.name + "'s position");

            for (var i = 1; i < ctx.targets.length; i++) {
                (function (layer) {
                    ctx.attempt(layer, function () {
                        setLayerCompAnchor(layer, target, ctx.time);
                    });
                })(ctx.targets[i]);
            }

            return "Matched " + ctx.applied + " layer(s) to " + reference.name;
        });
    }

    // Negates the scale on the flipped axis, around the layer's own anchor point
    function mirrorLayerScale(layer, isHorizontal, time) {
        var scaleProp = layer.transform.scale;
        var scale = scaleProp.value;

        setPropertyValue(scaleProp, matchDimensions(scale, isHorizontal
            ? [-scale[0], scale[1]]
            : [scale[0], -scale[1]]), time);
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
            // Layers without a rotation property
        }
    }

    function flipLayers(isHorizontal) {
        var individually = individualMirrorCheck.value;
        var axisName = isHorizontal ? "horizontally" : "vertically";

        runOnSelection(isHorizontal ? "Flip Horizontal" : "Flip Vertical",
            { topLevelOnly: !individually }, function (ctx) {

            if (individually) {
                ctx.each(function (layer) {
                    mirrorLayerScale(layer, isHorizontal, ctx.time);
                });
                return "Flipped " + ctx.applied + " layer(s) " + axisName + " individually";
            }

            // Group mirror: everything is reflected across one shared axis
            // through the center of the whole selection. The axis comes from
            // every layer the run may touch, while only the top-level ones are
            // moved - children follow their parent on their own.
            var bounds = getSelectionBounds(ctx.writable, ctx.time);
            if (!bounds) throw new Error("could not measure the selection bounds");

            var axis = isHorizontal ? bounds.centerX : bounds.centerY;

            ctx.each(function (layer) {
                var anchor = getLayerCompAnchor(layer, ctx.time);

                mirrorLayerScale(layer, isHorizontal, ctx.time);
                mirrorLayerRotation(layer, isHorizontal, ctx.time);

                if (anchor) {
                    var target = [anchor[0], anchor[1], anchor[2]];
                    if (isHorizontal) {
                        target[0] = 2 * axis - anchor[0];
                    } else {
                        target[1] = 2 * axis - anchor[1];
                    }
                    setLayerCompAnchor(layer, target, ctx.time);
                }
            });

            return "Flipped " + ctx.writable.length + " layer(s) " + axisName + " as a group";
        });
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
    resetRandomBtn.onClick = function () {
        posRangeControl.set(100);
        rotRangeControl.set(45);
        scaleRangeControl.set(20);
        opacityRangeControl.set(25);
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

    // The Utilities tab has fixed behaviour, so the mode radio is greyed there
    // rather than sitting above the tabs looking as if it applied
    tabPanel.onChange = function () {
        modePanel.enabled = (this.selection !== utilitiesTab);
    };

    // Set default tab
    tabPanel.selection = transformTab;
    modePanel.enabled = true;

    // Initialize
    updateStatus("Layer Transform Tool ready");

    panel.onResizing = panel.onResize = function () {
        this.layout.resize();
    };

    if (panel instanceof Window) {
        panel.center();
        panel.show();
    } else {
        panel.layout.layout(true);
        panel.layout.resize();
    }

})(this);
