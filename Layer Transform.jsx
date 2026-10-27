(function (thisObj) {
    // ===== LAYER TRANSFORM TOOL =====
    // Transform, group-transform, mirror and randomize After Effects layers.
    // Runs as a floating palette, or docked when placed in ScriptUI Panels.

    var config = {
        panelName: "Layer Transform Tool v3.0",
        spacing: 8,
        margins: 12,
        panelWidth: 430,
        sliderWidth: 130,
        inputWidth: 56,
        leaderWidth: 78,
        buttonHeight: 28
    };

    // ========== SMALL UI BUILDERS ==========

    // Rounds for display without throwing away typed precision
    function formatValue(value) {
        return (Math.round(value * 100) / 100).toString();
    }

    function addRow(parent, spacing) {
        var row = parent.add("group");
        row.orientation = "row";
        row.alignChildren = ["left", "center"];
        row.spacing = (spacing === undefined) ? 6 : spacing;
        return row;
    }

    function addPanel(parent, title) {
        var group = parent.add("panel", undefined, title);
        group.orientation = "column";
        group.alignChildren = "left";
        group.spacing = 6;
        group.margins = [12, 14, 12, 10];
        return group;
    }

    function addSpacer(parent, width) {
        var spacer = parent.add("statictext", undefined, "");
        spacer.preferredSize.width = width;
        return spacer;
    }

    // A plain numeric field. The text is the source of truth: typed values are
    // never clamped or rounded away behind the user's back.
    function createNumberField(parent, value, width) {
        var input = parent.add("edittext", undefined, String(value));
        input.preferredSize.width = width || config.inputWidth;

        var field = { input: input, defaultValue: value };

        field.get = function () {
            var parsed = parseFloat(this.input.text);
            return isNaN(parsed) ? this.defaultValue : parsed;
        };

        field.set = function (next) {
            var parsed = parseFloat(next);
            if (!isNaN(parsed)) this.input.text = formatValue(parsed);
        };

        input.onChange = function () {
            var parsed = parseFloat(this.text);
            this.text = isNaN(parsed) ? formatValue(field.defaultValue) : formatValue(parsed);
        };

        return field;
    }

    // One row of: [leader] [axis] [slider] [field] [unit].
    // The leader is either a checkbox that switches the property on, or blank
    // space so continuation rows line up underneath it.
    function createSliderRow(parent, options) {
        var row = addRow(parent);
        var control = { onUserChange: null, defaultValue: options.value };

        if (options.check) {
            control.check = row.add("checkbox", undefined, options.check);
            control.check.value = (options.checked !== false);
            control.check.preferredSize.width = config.leaderWidth;
        } else if (options.label) {
            var label = row.add("statictext", undefined, options.label);
            label.preferredSize.width = config.leaderWidth;
        } else {
            addSpacer(row, config.leaderWidth);
        }

        var axis = row.add("statictext", undefined, options.axis || "");
        axis.preferredSize.width = 12;

        var slider = row.add("slider", undefined, options.value, options.min, options.max);
        slider.preferredSize.width = config.sliderWidth;

        var input = row.add("edittext", undefined, String(options.value));
        input.preferredSize.width = config.inputWidth;
        input.helpTip = "Accepts decimals and values beyond the slider's range";

        var unit = row.add("statictext", undefined, options.unit || "");
        unit.preferredSize.width = 18;

        control.row = row;
        control.slider = slider;
        control.input = input;

        control.get = function () {
            var parsed = parseFloat(this.input.text);
            return isNaN(parsed) ? this.defaultValue : parsed;
        };

        control.set = function (next) {
            var parsed = parseFloat(next);
            if (isNaN(parsed)) return;
            this.input.text = formatValue(parsed);
            this.slider.value = Math.max(options.min, Math.min(options.max, parsed));
        };

        function notify() {
            if (control.onUserChange) control.onUserChange(control);
        }

        slider.onChanging = function () {
            input.text = formatValue(this.value);
            notify();
        };

        input.onChanging = function () {
            var parsed = parseFloat(this.text);
            if (!isNaN(parsed)) {
                slider.value = Math.max(options.min, Math.min(options.max, parsed));
                notify();
            }
        };

        input.onChange = function () {
            var parsed = parseFloat(this.text);
            if (isNaN(parsed)) {
                this.text = formatValue(slider.value);
            } else {
                this.text = formatValue(parsed);
                slider.value = Math.max(options.min, Math.min(options.max, parsed));
            }
            notify();
        };

        return control;
    }

    // [x] Label   [ min ] to [ max ]  unit
    function createRangeRow(parent, options) {
        var row = addRow(parent);

        var check = row.add("checkbox", undefined, options.label);
        check.value = !!options.checked;
        check.preferredSize.width = 96;
        if (options.helpTip) check.helpTip = options.helpTip;

        var min = createNumberField(row, options.min, 52);
        var to = row.add("statictext", undefined, "to");
        to.preferredSize.width = 16;
        var max = createNumberField(row, options.max, 52);

        var unit = row.add("statictext", undefined, options.unit || "");
        unit.preferredSize.width = 28;

        return { check: check, min: min, max: max, row: row, label: options.label };
    }

    // A 3x3 grid picking which point of a bounding box to work around.
    // Radio buttons only exclude each other inside one container, and these
    // sit in three rows, so exclusivity is handled by hand.
    function createPivotPicker(parent) {
        var names = [
            "Top left", "Top center", "Top right",
            "Middle left", "Center", "Middle right",
            "Bottom left", "Bottom center", "Bottom right"
        ];

        var holder = parent.add("group");
        holder.orientation = "column";
        holder.spacing = 1;
        holder.alignChildren = "left";

        var buttons = [];
        var picker = { index: 4, buttons: buttons, names: names };

        function select(index) {
            for (var i = 0; i < buttons.length; i++) {
                buttons[i].value = (i === index);
            }
            picker.index = index;
        }

        function makeHandler(index) {
            return function () { select(index); };
        }

        for (var r = 0; r < 3; r++) {
            var row = addRow(holder, 1);
            for (var c = 0; c < 3; c++) {
                var index = r * 3 + c;
                var button = row.add("radiobutton", undefined, "");
                button.preferredSize = [20, 18];
                button.helpTip = names[index];
                button.onClick = makeHandler(index);
                buttons.push(button);
            }
        }

        picker.select = select;
        select(4);
        return picker;
    }

    // ========== WINDOW ==========

    var panel = (thisObj instanceof Panel)
        ? thisObj
        : new Window("palette", config.panelName, undefined, { resizeable: true });
    panel.orientation = "column";
    panel.alignChildren = "fill";
    panel.spacing = config.spacing;
    panel.margins = config.margins;
    panel.preferredSize.width = config.panelWidth;

    var titleText = panel.add("statictext", undefined, config.panelName);
    titleText.graphics.font = ScriptUI.newFont("Arial", "BOLD", 15);

    // The status gets a full-width row of its own and wraps, because After
    // Effects' error text is far too long for a corner of the title bar
    var statusText = panel.add("statictext", undefined, "Ready", { multiline: true });
    statusText.alignment = ["fill", "top"];
    statusText.preferredSize.height = 32;
    statusText.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 10);

    var modeRow = addRow(panel, 14);
    modeRow.alignment = ["fill", "center"];
    var relativeRadio = modeRow.add("radiobutton", undefined, "Add to current values");
    var absoluteRadio = modeRow.add("radiobutton", undefined, "Set absolute values");
    relativeRadio.value = true;
    relativeRadio.helpTip = "Position and rotation are added, scale is multiplied, opacity is offset";
    absoluteRadio.helpTip = "Write the value as typed. Position is a composition coordinate.";

    var tabPanel = panel.add("tabbedpanel");
    tabPanel.alignChildren = "fill";

    var transformTab = tabPanel.add("tab", undefined, "Transform");
    var groupTab = tabPanel.add("tab", undefined, "Group");
    var randomizeTab = tabPanel.add("tab", undefined, "Randomize");
    var utilitiesTab = tabPanel.add("tab", undefined, "Utilities");

    // ========== TRANSFORM TAB ==========

    transformTab.alignChildren = "fill";
    transformTab.spacing = config.spacing;
    transformTab.margins = [8, 10, 8, 8];

    var transformPanel = addPanel(transformTab, "Per layer");

    var xControl = createSliderRow(transformPanel, { check: "Position", axis: "X", value: 0, min: -2000, max: 2000, unit: "px" });
    var yControl = createSliderRow(transformPanel, { axis: "Y", value: 0, min: -2000, max: 2000, unit: "px" });
    var zControl = createSliderRow(transformPanel, { axis: "Z", value: 0, min: -1000, max: 1000, unit: "px" });
    var rotationControl = createSliderRow(transformPanel, { check: "Rotation", value: 0, min: -360, max: 360, unit: "\u00B0" });
    var scaleXControl = createSliderRow(transformPanel, { check: "Scale", axis: "X", value: 100, min: 0, max: 300, unit: "%" });
    var scaleYControl = createSliderRow(transformPanel, { axis: "Y", value: 100, min: 0, max: 300, unit: "%" });
    var opacityControl = createSliderRow(transformPanel, { check: "Opacity", value: 100, min: 0, max: 100, unit: "%" });

    var applyPositionCheck = xControl.check;
    var applyRotationCheck = rotationControl.check;
    var applyScaleCheck = scaleXControl.check;
    var applyOpacityCheck = opacityControl.check;

    applyPositionCheck.helpTip = "Only ticked properties are written, so absolute mode can set 100% or 0 degrees";

    var linkRow = addRow(transformPanel);
    addSpacer(linkRow, config.leaderWidth);
    var linkCheckbox = linkRow.add("checkbox", undefined, "Link X and Y scale");
    linkCheckbox.value = true;

    linkCheckbox.onClick = function () {
        if (this.value) scaleYControl.set(scaleXControl.get());
    };

    scaleXControl.onUserChange = function (control) {
        if (linkCheckbox.value) scaleYControl.set(control.get());
    };

    scaleYControl.onUserChange = function (control) {
        if (linkCheckbox.value) scaleXControl.set(control.get());
    };

    var transformActions = addRow(transformTab, 10);
    transformActions.alignment = ["center", "center"];
    var applyBtn = transformActions.add("button", undefined, "Apply Transform");
    applyBtn.preferredSize = [150, config.buttonHeight];
    var resetBtn = transformActions.add("button", undefined, "Reset Values");
    resetBtn.preferredSize = [120, config.buttonHeight];

    // ========== GROUP TAB ==========

    groupTab.alignChildren = "fill";
    groupTab.spacing = config.spacing;
    groupTab.margins = [8, 10, 8, 8];

    var pivotPanel = addPanel(groupTab, "Pivot");
    var pivotTop = addRow(pivotPanel, 12);

    var pivotFields = pivotTop.add("group");
    pivotFields.orientation = "column";
    pivotFields.alignChildren = "left";
    pivotFields.spacing = 6;

    var pivotSourceRow = addRow(pivotFields);
    var pivotSourceLabel = pivotSourceRow.add("statictext", undefined, "Around:");
    pivotSourceLabel.preferredSize.width = 52;
    var pivotSource = pivotSourceRow.add("dropdownlist", undefined, [
        "Selection bounds",
        "Composition",
        "Topmost selected layer",
        "Typed value"
    ]);
    pivotSource.selection = 0;
    pivotSource.preferredSize.width = 170;
    pivotSource.helpTip = "Which box the pivot is measured from";

    var pivotValueRow = addRow(pivotFields);
    var pivotValueLabel = pivotValueRow.add("statictext", undefined, "Typed:");
    pivotValueLabel.preferredSize.width = 52;
    pivotValueRow.add("statictext", undefined, "X");
    var pivotXField = createNumberField(pivotValueRow, 960, 60);
    pivotValueRow.add("statictext", undefined, "Y");
    var pivotYField = createNumberField(pivotValueRow, 540, 60);
    pivotValueRow.helpTip = "Composition coordinates, used when 'Around' is set to Typed value";

    var pivotPicker = createPivotPicker(pivotTop);

    var rotatePanel = addPanel(groupTab, "Rotate and scale the selection");
    var groupAngle = createSliderRow(rotatePanel, { label: "Angle", value: 0, min: -360, max: 360, unit: "\u00B0" });
    var groupScaleX = createSliderRow(rotatePanel, { label: "Scale", axis: "X", value: 100, min: 1, max: 400, unit: "%" });
    var groupScaleY = createSliderRow(rotatePanel, { axis: "Y", value: 100, min: 1, max: 400, unit: "%" });

    var groupUniformRow = addRow(rotatePanel);
    addSpacer(groupUniformRow, config.leaderWidth);
    var groupUniformCheck = groupUniformRow.add("checkbox", undefined, "Uniform");
    groupUniformCheck.value = true;
    groupUniformCheck.helpTip = "Non-uniform scaling cannot be represented exactly on rotated layers";

    groupUniformCheck.onClick = function () {
        if (this.value) groupScaleY.set(groupScaleX.get());
    };

    groupScaleX.onUserChange = function (control) {
        if (groupUniformCheck.value) groupScaleY.set(control.get());
    };

    groupScaleY.onUserChange = function (control) {
        if (groupUniformCheck.value) groupScaleX.set(control.get());
    };

    var groupButtons = addRow(rotatePanel, 10);
    addSpacer(groupButtons, config.leaderWidth - 6);
    var rotateBtn = groupButtons.add("button", undefined, "Rotate");
    rotateBtn.preferredSize = [100, config.buttonHeight];
    rotateBtn.helpTip = "Turn the whole selection around the pivot, keeping its shape.\nThe bounding box is re-measured on every press, so one turn of 90\u00B0\nand six turns of 15\u00B0 need not land in exactly the same place.";
    var scaleBtn = groupButtons.add("button", undefined, "Scale");
    scaleBtn.preferredSize = [100, config.buttonHeight];
    scaleBtn.helpTip = "Grow or shrink the whole selection around the pivot, spacing included";

    var mirrorPanel = addPanel(groupTab, "Mirror");
    var mirrorButtons = addRow(mirrorPanel, 10);
    var flipHBtn = mirrorButtons.add("button", undefined, "Flip Horizontal");
    flipHBtn.preferredSize = [150, config.buttonHeight];
    var flipVBtn = mirrorButtons.add("button", undefined, "Flip Vertical");
    flipVBtn.preferredSize = [150, config.buttonHeight];
    flipHBtn.helpTip = "Mirror left to right across the pivot";
    flipVBtn.helpTip = "Mirror top to bottom across the pivot";

    var mirrorCopyCheck = mirrorPanel.add("checkbox", undefined, "Mirror a duplicate, keep the original");
    mirrorCopyCheck.helpTip = "Copies the selection first and mirrors the copy, for instant symmetry";

    var individualMirrorCheck = mirrorPanel.add("checkbox", undefined, "Mirror each layer individually");
    individualMirrorCheck.helpTip = "On: every layer flips around its own anchor point.\nOff: the selection is mirrored as one group.";

    var keyframeCheck = groupTab.add("checkbox", undefined, "Include keyframes, so motion paths mirror too");
    keyframeCheck.value = true;
    keyframeCheck.helpTip = "Rewrites every keyframe and its motion-path tangents, not just the value at the playhead";

    // ========== RANDOMIZE TAB ==========

    randomizeTab.alignChildren = "fill";
    randomizeTab.spacing = config.spacing;
    randomizeTab.margins = [8, 10, 8, 8];

    var distributionRow = addRow(randomizeTab, 14);
    distributionRow.add("statictext", undefined, "Distribution:");
    var uniformRadio = distributionRow.add("radiobutton", undefined, "Uniform");
    var gaussianRadio = distributionRow.add("radiobutton", undefined, "Gaussian");
    uniformRadio.value = true;
    uniformRadio.helpTip = "Every value in the range is equally likely";
    gaussianRadio.helpTip = "Values cluster around the middle of the range and thin out towards the ends";

    var transformRanges = addPanel(randomizeTab, "Transform (min to max)");

    var randPosX = createRangeRow(transformRanges, { label: "Position X", min: -100, max: 100, unit: "px", checked: true });
    var randPosY = createRangeRow(transformRanges, { label: "Position Y", min: -100, max: 100, unit: "px", checked: true });
    var randRotation = createRangeRow(transformRanges, { label: "Rotation", min: -45, max: 45, unit: "\u00B0" });
    var randScale = createRangeRow(transformRanges, { label: "Scale", min: 80, max: 120, unit: "%",
        helpTip: "Relative mode multiplies by this percentage, absolute mode sets it" });
    var randOpacity = createRangeRow(transformRanges, { label: "Opacity", min: -50, max: 0, unit: "%" });
    var randAnchorX = createRangeRow(transformRanges, { label: "Anchor X", min: -50, max: 50, unit: "px",
        helpTip: "Moves the anchor point without moving the layer, so pivots vary" });
    var randAnchorY = createRangeRow(transformRanges, { label: "Anchor Y", min: -50, max: 50, unit: "px",
        helpTip: "Moves the anchor point without moving the layer, so pivots vary" });

    var timingRanges = addPanel(randomizeTab, "Timing (min to max)");

    var randStart = createRangeRow(timingRanges, { label: "Start time", min: -10, max: 10, unit: "fr",
        helpTip: "Slides the whole layer along the timeline" });
    var randIn = createRangeRow(timingRanges, { label: "In point", min: 0, max: 10, unit: "fr",
        helpTip: "Trims where the layer starts showing" });
    var randOut = createRangeRow(timingRanges, { label: "Out point", min: -10, max: 0, unit: "fr",
        helpTip: "Trims where the layer stops showing" });

    var extrasPanel = addPanel(randomizeTab, "Also");
    var extrasRow = addRow(extrasPanel, 20);
    var randLabelCheck = extrasRow.add("checkbox", undefined, "Label colour");
    randLabelCheck.helpTip = "Gives every selected layer a random label colour";
    var randOrderCheck = extrasRow.add("checkbox", undefined, "Stacking order");
    randOrderCheck.helpTip = "Shuffles the selected layers' order in the timeline";

    var randomActions = addRow(randomizeTab, 10);
    randomActions.alignment = ["center", "center"];
    var applyRandomBtn = randomActions.add("button", undefined, "Apply Randomization");
    applyRandomBtn.preferredSize = [180, config.buttonHeight];
    var resetRandomBtn = randomActions.add("button", undefined, "Reset");
    resetRandomBtn.preferredSize = [90, config.buttonHeight];

    // ========== UTILITIES TAB ==========

    utilitiesTab.alignChildren = "fill";
    utilitiesTab.spacing = config.spacing;
    utilitiesTab.margins = [8, 10, 8, 8];

    var quickGroup = addPanel(utilitiesTab, "Quick actions");
    quickGroup.alignChildren = "fill";

    var row1 = addRow(quickGroup, 8);
    var centerBtn = row1.add("button", undefined, "Center in Comp");
    var roundBtn = row1.add("button", undefined, "Round Positions");
    var centerAvgBtn = row1.add("button", undefined, "Center to Average");

    centerBtn.helpTip = "Move every selected layer so its visible center sits on the comp center";
    roundBtn.helpTip = "Round each layer's position values to whole pixels";
    centerAvgBtn.helpTip = "Stack every selected layer on the average of their visible centers";

    var row2 = addRow(quickGroup, 8);
    var resetTransformBtn = row2.add("button", undefined, "Reset Transform");
    var distributeBtn = row2.add("button", undefined, "Distribute Evenly");

    resetTransformBtn.helpTip = "Position to comp center, rotation 0, scale 100%, opacity 100%";
    distributeBtn.helpTip = "Spread the in-between layers evenly between the two outermost ones,\nalong whichever axis the selection is wider";

    var advancedGroup = addPanel(utilitiesTab, "Parenting");
    advancedGroup.alignChildren = "fill";

    var row3 = addRow(advancedGroup, 8);
    var nullParentBtn = row3.add("button", undefined, "Add Null Parent");
    var matchPosBtn = row3.add("button", undefined, "Match Position");

    nullParentBtn.helpTip = "Create a null at the center of the selection and parent the selection to it";
    matchPosBtn.helpTip = "Move every selected layer onto the position of the topmost selected layer";

    // ========== STATUS AND ERRORS ==========

    function updateStatus(message, isError) {
        statusText.text = message;
        statusText.graphics.foregroundColor = statusText.graphics.newPen(
            statusText.graphics.PenType.SOLID_COLOR,
            isError ? [1, 0.3, 0.3, 1] : [0.45, 0.78, 0.45, 1],
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

    // ========== PROPERTY HELPERS ==========

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

    // Rewrites a property through a map: every keyframe when the caller asked
    // for keyframes and the property has them, otherwise the value at `time`
    function mapPropertyValues(prop, time, includeKeys, mapValue) {
        var k;

        if (includeKeys && prop.numKeys > 0) {
            var times = [];
            var values = [];

            for (k = 1; k <= prop.numKeys; k++) {
                times.push(prop.keyTime(k));
                values.push(prop.keyValue(k));
            }

            if (prop.expressionEnabled) expressionConflicts++;

            for (k = 0; k < times.length; k++) {
                prop.setValueAtTime(times[k], mapValue(values[k]));
            }
        } else {
            setPropertyValue(prop, mapValue(prop.valueAtTime(time, false)), time);
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

    // A 2D layer wants a 2D point and a 3D layer a 3D one; handing either the
    // wrong shape is rejected by After Effects
    function layerPoint(layer, point) {
        return layer.threeDLayer
            ? [point[0], point[1], point[2] || 0]
            : [point[0], point[1]];
    }

    // Drops layers whose parent (or grandparent...) is also in the list, so a
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
    // no part in bounds measuring or mirroring.
    //
    // The test names the two classes to exclude rather than asking for an
    // AVLayer: ExtendScript's instanceof does not follow After Effects' class
    // hierarchy, so a shape or text layer answers false to `instanceof
    // AVLayer` even though it is one, and the whole selection would be
    // skipped. CameraLayer and LightLayer are leaf classes, so they answer
    // reliably.
    function isTransformableLayer(layer) {
        try {
            if (layer instanceof CameraLayer) return false;
            if (layer instanceof LightLayer) return false;
        } catch (error) {
            // Older hosts without these globals: fall through to the
            // capability test below
        }

        try {
            return (layer.transform.scale !== null && layer.transform.scale !== undefined);
        } catch (error) {
            return false;
        }
    }

    // ========== GEOMETRY ==========

    // Comp-space location of a layer's anchor point at a given time, which is
    // where its position value lands
    function getLayerCompAnchor(layer, time) {
        try {
            var anchor = layer.transform.anchorPoint.valueAtTime(time, false);
            var point = layer.toComp(layerPoint(layer, anchor), time);
            return [point[0], point[1], point[2] || 0];
        } catch (error) {
            try {
                var pos = layer.transform.position.valueAtTime(time, false);
                return [pos[0], pos[1], pos[2] || 0];
            } catch (innerError) {
                return null;
            }
        }
    }

    // A move measured in comp space, expressed in the layer's own value space,
    // which is the parent's coordinate system when the layer is parented
    function compDeltaToLayerDelta(layer, delta, time) {
        if (!layer.parent) return [delta[0], delta[1], delta[2] || 0];

        try {
            var origin = layer.parent.fromComp(layerPoint(layer.parent, [0, 0, 0]), time);
            var moved = layer.parent.fromComp(layerPoint(layer.parent, delta), time);
            return [
                moved[0] - origin[0],
                moved[1] - origin[1],
                (moved[2] || 0) - (origin[2] || 0)
            ];
        } catch (error) {
            return [delta[0], delta[1], delta[2] || 0];
        }
    }

    // The same move the other way round, for motion-path tangents, which are
    // stored in the layer's own value space
    function layerDeltaToCompDelta(layer, delta, time) {
        if (!layer.parent) return [delta[0], delta[1], delta[2] || 0];

        try {
            var anchor = layer.parent.transform.anchorPoint.valueAtTime(time, false);
            var base = layer.parent.toComp(layerPoint(layer.parent, anchor), time);
            var moved = layer.parent.toComp(layerPoint(layer.parent, [
                anchor[0] + delta[0],
                anchor[1] + delta[1],
                (anchor[2] || 0) + (delta[2] || 0)
            ]), time);
            return [
                moved[0] - base[0],
                moved[1] - base[1],
                (moved[2] || 0) - (base[2] || 0)
            ];
        } catch (error) {
            return [delta[0], delta[1], delta[2] || 0];
        }
    }

    // Moves a layer so its anchor point lands on a comp-space point
    function setLayerCompAnchor(layer, target, time) {
        var current = getLayerCompAnchor(layer, time);
        if (!current) return;

        var delta = compDeltaToLayerDelta(layer, [
            target[0] - current[0],
            target[1] - current[1],
            (target[2] || 0) - current[2]
        ], time);

        var posProp = layer.transform.position;
        var value = posProp.valueAtTime(time, false);

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

    function finishBounds(bounds) {
        if (!bounds) return null;
        bounds.centerX = (bounds.left + bounds.right) / 2;
        bounds.centerY = (bounds.top + bounds.bottom) / 2;
        return bounds;
    }

    // Combined comp-space bounding box of a set of layers
    function getSelectionBounds(layers, time) {
        var combined = null;
        var zSum = 0;
        var zCount = 0;

        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            if (!isTransformableLayer(layer)) continue;

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
        combined.centerZ = zCount ? (zSum / zCount) : 0;
        return finishBounds(combined);
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
    // The body receives a context with comp, time, selected, writable, targets,
    // each(fn) and attempt(layer, fn), and returns the status message.
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
            } else if (avOnly && !isTransformableLayer(selected[i])) {
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

        updateStatus(parts.join(" \u00B7 "), ctx.failures.length > 0);
        reportFailures(undoName, ctx.failures);
    }

    // ========== GROUP TRANSFORM ENGINE ==========
    //
    // A group transform is one affine map applied in composition space. Each
    // layer's anchor point is moved through it, and the layer's own rotation
    // and scale are adjusted so its content follows. Writing it this way means
    // rotate, scale and mirror all share one code path, keyframes included.

    function makeMirrorTransform(axisValue, isHorizontal) {
        return {
            point: function (p) {
                return isHorizontal
                    ? [2 * axisValue - p[0], p[1], p[2]]
                    : [p[0], 2 * axisValue - p[1], p[2]];
            },
            vector: function (v) {
                return isHorizontal
                    ? [-v[0], v[1], v[2] || 0]
                    : [v[0], -v[1], v[2] || 0];
            },
            adjust: function (layer, time, includeKeys) {
                mirrorLayerScale(layer, isHorizontal, time, includeKeys);
                mirrorLayerRotation(layer, isHorizontal, time, includeKeys);
            }
        };
    }

    function makeRotateTransform(pivot, degrees) {
        var radians = degrees * Math.PI / 180;
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);

        return {
            point: function (p) {
                var dx = p[0] - pivot[0];
                var dy = p[1] - pivot[1];
                return [pivot[0] + dx * cos - dy * sin, pivot[1] + dx * sin + dy * cos, p[2]];
            },
            vector: function (v) {
                return [v[0] * cos - v[1] * sin, v[0] * sin + v[1] * cos, v[2] || 0];
            },
            adjust: function (layer, time, includeKeys) {
                offsetLayerRotation(layer, degrees, time, includeKeys);
            }
        };
    }

    function makeScaleTransform(pivot, factorX, factorY) {
        return {
            point: function (p) {
                return [
                    pivot[0] + (p[0] - pivot[0]) * factorX,
                    pivot[1] + (p[1] - pivot[1]) * factorY,
                    p[2]
                ];
            },
            vector: function (v) {
                return [v[0] * factorX, v[1] * factorY, v[2] || 0];
            },
            adjust: function (layer, time, includeKeys) {
                multiplyLayerScale(layer, factorX, factorY, time, includeKeys);
            }
        };
    }

    // Negating the scale on one axis mirrors the layer's content around its
    // own anchor point
    function mirrorLayerScale(layer, isHorizontal, time, includeKeys) {
        mapPropertyValues(layer.transform.scale, time, includeKeys, function (value) {
            return matchDimensions(value, isHorizontal
                ? [-value[0], value[1]]
                : [value[0], -value[1]]);
        });
    }

    function multiplyLayerScale(layer, factorX, factorY, time, includeKeys) {
        mapPropertyValues(layer.transform.scale, time, includeKeys, function (value) {
            return matchDimensions(value, [value[0] * factorX, value[1] * factorY]);
        });
    }

    // A true mirror also reverses rotation, otherwise rotated layers end up
    // facing the wrong way. In 3D it flips the axes the mirror plane turns
    // over and leaves the one lying in the plane alone.
    function mirrorLayerRotation(layer, isHorizontal, time, includeKeys) {
        var transform = layer.property("ADBE Transform Group");
        var props = [transform.property("ADBE Rotate Z")];

        if (layer.threeDLayer) {
            props.push(transform.property(isHorizontal ? "ADBE Rotate Y" : "ADBE Rotate X"));
        }

        function negate(value) {
            return -value;
        }

        for (var i = 0; i < props.length; i++) {
            if (props[i]) mapPropertyValues(props[i], time, includeKeys, negate);
        }
    }

    function offsetLayerRotation(layer, degrees, time, includeKeys) {
        var prop = layer.property("ADBE Transform Group").property("ADBE Rotate Z");
        if (!prop) throw new Error("no Z rotation property");

        mapPropertyValues(prop, time, includeKeys, function (value) {
            return value + degrees;
        });
    }

    // Tangents live in the layer's value space, so they travel out to comp
    // space, through the transform's linear part, and back again
    function mapTangent(layer, tangent, transform, time) {
        if (!tangent) return [0, 0, 0];

        var inComp = layerDeltaToCompDelta(layer, tangent, time);
        var mapped = transform.vector(inComp);
        var back = compDeltaToLayerDelta(layer, mapped, time);

        return matchDimensions(tangent, back);
    }

    // Rewrites every keyframe of the position property through the map, and
    // carries the motion path's tangents across so the path keeps its shape
    function mapPositionKeys(layer, transform, time) {
        var prop = layer.transform.position;
        var keys = [];
        var k;

        // Read the whole path first: writing one key changes what a later
        // read of the others would report
        for (k = 1; k <= prop.numKeys; k++) {
            var keyTime = prop.keyTime(k);
            var entry = {
                time: keyTime,
                anchor: getLayerCompAnchor(layer, keyTime),
                value: prop.valueAtTime(keyTime, false),
                inTangent: null,
                outTangent: null
            };

            if (prop.isSpatial) {
                entry.inTangent = prop.keyInSpatialTangent(k);
                entry.outTangent = prop.keyOutSpatialTangent(k);
            }

            keys.push(entry);
        }

        if (prop.expressionEnabled) expressionConflicts++;

        for (k = 0; k < keys.length; k++) {
            var key = keys[k];
            if (!key.anchor) continue;

            var target = transform.point(key.anchor);
            var delta = compDeltaToLayerDelta(layer, [
                target[0] - key.anchor[0],
                target[1] - key.anchor[1],
                (target[2] || 0) - key.anchor[2]
            ], key.time);

            prop.setValueAtTime(key.time, matchDimensions(key.value, [
                key.value[0] + delta[0],
                key.value[1] + delta[1],
                (key.value[2] || 0) + delta[2]
            ]));
        }

        if (!prop.isSpatial) return;

        for (k = 0; k < keys.length; k++) {
            try {
                prop.setSpatialTangentsAtKey(k + 1,
                    mapTangent(layer, keys[k].inTangent, transform, keys[k].time),
                    mapTangent(layer, keys[k].outTangent, transform, keys[k].time));
            } catch (error) {
                // Roving and auto-bezier keys work their own tangents out
            }
        }
    }

    function applyGroupTransform(ctx, transform, includeKeys) {
        ctx.each(function (layer) {
            // Scale and rotation leave the anchor point where it is, so the
            // positional half below still measures the right thing
            transform.adjust(layer, ctx.time, includeKeys);

            var posProp = layer.transform.position;
            if (includeKeys && posProp.numKeys > 0) {
                mapPositionKeys(layer, transform, ctx.time);
            } else {
                var anchor = getLayerCompAnchor(layer, ctx.time);
                if (anchor) setLayerCompAnchor(layer, transform.point(anchor), ctx.time);
            }
        });
    }

    // ========== PIVOT ==========

    // The box the pivot is measured from, following the "Around" dropdown
    function resolvePivotBounds(ctx) {
        var which = pivotSource.selection ? pivotSource.selection.index : 0;

        if (which === 1) {
            return finishBounds({ left: 0, top: 0, right: ctx.comp.width, bottom: ctx.comp.height });
        }

        if (which === 2) {
            var reference = ctx.writable[0];
            var bounds = getLayerCompBounds(reference, ctx.time);
            if (!bounds) {
                var anchor = getLayerCompAnchor(reference, ctx.time);
                if (!anchor) return null;
                bounds = { left: anchor[0], right: anchor[0], top: anchor[1], bottom: anchor[1] };
            }
            return finishBounds(bounds);
        }

        if (which === 3) {
            var x = pivotXField.get();
            var y = pivotYField.get();
            return finishBounds({ left: x, right: x, top: y, bottom: y });
        }

        return getSelectionBounds(ctx.writable, ctx.time);
    }

    function resolvePivot(ctx) {
        var bounds = resolvePivotBounds(ctx);
        if (!bounds) return null;

        var xs = [bounds.left, bounds.centerX, bounds.right];
        var ys = [bounds.top, bounds.centerY, bounds.bottom];
        var index = pivotPicker.index;

        return [xs[index % 3], ys[Math.floor(index / 3)]];
    }

    function pivotDescription() {
        var source = pivotSource.selection ? pivotSource.selection.text : "Selection bounds";
        return pivotPicker.names[pivotPicker.index].toLowerCase() + " of the " + source.toLowerCase();
    }

    // ========== GROUP ACTIONS ==========

    function runGroupTransform(undoName, makeTransform, describe) {
        runOnSelection(undoName, { topLevelOnly: true }, function (ctx) {
            var pivot = resolvePivot(ctx);
            if (!pivot) throw new Error("could not measure the pivot");

            applyGroupTransform(ctx, makeTransform(ctx, pivot), keyframeCheck.value);

            return describe(ctx, pivot);
        });
    }

    function rotateSelection() {
        var degrees = groupAngle.get();
        if (degrees === 0) {
            updateStatus("Set an angle first", true);
            return;
        }

        runGroupTransform("Rotate Selection", function (ctx, pivot) {
            return makeRotateTransform(pivot, degrees);
        }, function (ctx) {
            return "Rotated " + ctx.applied + " layer(s) by " + formatValue(degrees) +
                " degrees around the " + pivotDescription();
        });
    }

    function scaleSelection() {
        var factorX = groupScaleX.get() / 100;
        var factorY = groupUniformCheck.value ? factorX : (groupScaleY.get() / 100);

        if (factorX === 1 && factorY === 1) {
            updateStatus("Set a scale other than 100% first", true);
            return;
        }
        if (factorX === 0 || factorY === 0) {
            updateStatus("A scale of 0% would collapse the selection", true);
            return;
        }

        runGroupTransform("Scale Selection", function (ctx, pivot) {
            return makeScaleTransform(pivot, factorX, factorY);
        }, function (ctx) {
            return "Scaled " + ctx.applied + " layer(s) around the " + pivotDescription();
        });
    }

    // Duplicates the selection and hands back the copies, with any parenting
    // inside the selection rewired to point at the copies
    function duplicateSelection(ctx) {
        var originals = ctx.writable;
        var originalIndex = [];
        var parentIndex = [];
        var duplicates = [];
        var map = {};
        var i;

        // Both lists are read before the first copy exists: inserting a
        // duplicate renumbers every layer below it, so an index read mid-loop
        // would no longer line up with the parents recorded here
        for (i = 0; i < originals.length; i++) {
            originalIndex.push(originals[i].index);
            parentIndex.push(originals[i].parent ? originals[i].parent.index : null);
        }

        for (i = 0; i < originals.length; i++) {
            var copy = originals[i].duplicate();
            map["i" + originalIndex[i]] = copy;
            duplicates.push(copy);
        }

        for (i = 0; i < duplicates.length; i++) {
            if (parentIndex[i] === null) continue;
            var mapped = map["i" + parentIndex[i]];
            if (mapped) duplicates[i].parent = mapped;
        }

        for (i = 0; i < originals.length; i++) {
            originals[i].selected = false;
        }
        for (i = 0; i < duplicates.length; i++) {
            duplicates[i].selected = true;
        }

        return duplicates;
    }

    function flipSelection(isHorizontal) {
        var individually = individualMirrorCheck.value;
        var asCopy = mirrorCopyCheck.value;
        var axisName = isHorizontal ? "horizontally" : "vertically";
        var undoName = (asCopy ? "Mirror Copy " : "Flip ") + (isHorizontal ? "Horizontal" : "Vertical");

        runOnSelection(undoName, { topLevelOnly: !individually }, function (ctx) {
            if (individually) {
                ctx.each(function (layer) {
                    mirrorLayerScale(layer, isHorizontal, ctx.time, keyframeCheck.value);
                });
                return "Flipped " + ctx.applied + " layer(s) " + axisName + " individually";
            }

            // The axis is measured from the original selection, before any
            // duplicate exists, so the copy lands as a true reflection
            var pivot = resolvePivot(ctx);
            if (!pivot) throw new Error("could not measure the pivot");

            var axisValue = isHorizontal ? pivot[0] : pivot[1];
            var mirrored = ctx.writable.length;

            if (asCopy) {
                var copies = duplicateSelection(ctx);
                ctx.targets = getTopLevelLayers(copies);
                mirrored = copies.length;
            }

            applyGroupTransform(ctx, makeMirrorTransform(axisValue, isHorizontal), keyframeCheck.value);

            return (asCopy ? "Mirrored a copy of " : "Flipped ") + mirrored + " layer(s) " +
                axisName + " across the " + pivotDescription();
        });
    }

    function flipHorizontal() {
        flipSelection(true);
    }

    function flipVertical() {
        flipSelection(false);
    }

    // ========== TRANSFORM TAB ACTIONS ==========

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
                    setPropertyValue(rotProp, isRelative
                        ? rotProp.valueAtTime(ctx.time, false) + rotation
                        : rotation, ctx.time);
                }

                if (applyScaleCheck.value) {
                    var scaleProp = layer.transform.scale;
                    var current = scaleProp.valueAtTime(ctx.time, false);
                    setPropertyValue(scaleProp, matchDimensions(current, isRelative
                        ? [current[0] * (scaleX / 100), current[1] * (scaleY / 100)]
                        : [scaleX, scaleY]), ctx.time);
                }

                if (applyOpacityCheck.value) {
                    var opacityProp = layer.transform.opacity;
                    var next = isRelative
                        ? opacityProp.valueAtTime(ctx.time, false) + (opacity - 100)
                        : opacity;
                    setPropertyValue(opacityProp, Math.max(0, Math.min(100, next)), ctx.time);
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

    // Box-Muller, so the gaussian option needs no lookup table
    function standardNormal() {
        var u = 0;
        var v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    // Uniform spreads evenly; gaussian centres on the middle of the range with
    // the ends about three deviations out, then clamps the rare outlier
    function randomInRange(min, max) {
        if (min > max) {
            var swap = min;
            min = max;
            max = swap;
        }
        if (min === max) return min;

        if (gaussianRadio.value) {
            var middle = (min + max) / 2;
            var deviation = (max - min) / 6;
            return Math.max(min, Math.min(max, middle + standardNormal() * deviation));
        }

        return min + Math.random() * (max - min);
    }

    function rollRange(row) {
        return randomInRange(row.min.get(), row.max.get());
    }

    function randomizeRows() {
        return [randPosX, randPosY, randRotation, randScale, randOpacity,
                randAnchorX, randAnchorY, randStart, randIn, randOut];
    }

    function countEnabledRows() {
        var rows = randomizeRows();
        var count = 0;
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].check.value) count++;
        }
        if (randLabelCheck.value) count++;
        if (randOrderCheck.value) count++;
        return count;
    }

    // Moving the anchor point would drag the layer with it, so the layer is
    // put back where it was: the pivot changes, the picture does not
    function randomizeLayerAnchor(layer, ctx, deltaX, deltaY) {
        var anchorProp = layer.transform.anchorPoint;
        var current = anchorProp.valueAtTime(ctx.time, false);
        var moved = [current[0] + deltaX, current[1] + deltaY, current[2] || 0];

        var keepAt;
        try {
            keepAt = layer.toComp(layerPoint(layer, moved), ctx.time);
        } catch (error) {
            keepAt = null;
        }

        setPropertyValue(anchorProp, matchDimensions(current, moved), ctx.time);

        if (keepAt) {
            setLayerCompAnchor(layer, [keepAt[0], keepAt[1], keepAt[2] || 0], ctx.time);
        }
    }

    function randomizeLayerTiming(layer, ctx, isRelative) {
        var frame = ctx.comp.frameDuration;

        if (randStart.check.value) {
            var startOffset = rollRange(randStart) * frame;
            layer.startTime = isRelative ? layer.startTime + startOffset : startOffset;
        }

        if (!randIn.check.value && !randOut.check.value) return;

        var inPoint = layer.inPoint;
        var outPoint = layer.outPoint;

        if (randIn.check.value) {
            var inOffset = rollRange(randIn) * frame;
            inPoint = isRelative ? inPoint + inOffset : layer.startTime + inOffset;
        }
        if (randOut.check.value) {
            var outOffset = rollRange(randOut) * frame;
            outPoint = isRelative ? outPoint + outOffset : layer.startTime + outOffset;
        }

        // A layer cannot end before it starts
        if (outPoint <= inPoint) outPoint = inPoint + frame;

        // Widening before narrowing keeps every intermediate state valid,
        // whichever direction the two points moved
        if (inPoint < layer.inPoint) layer.inPoint = inPoint;
        layer.outPoint = outPoint;
        layer.inPoint = inPoint;
    }

    function shuffleStackingOrder(ctx) {
        var layers = [];
        var i;

        for (i = 0; i < ctx.targets.length; i++) {
            layers.push(ctx.targets[i]);
        }
        if (layers.length < 2) return;

        layers.sort(function (a, b) {
            return a.index - b.index;
        });

        // The layer directly above the selection, captured before anything
        // moves, is what the shuffled stack is rebuilt against
        var topIndex = layers[0].index;
        var above = (topIndex > 1) ? ctx.comp.layer(topIndex - 1) : null;

        for (i = layers.length - 1; i > 0; i--) {
            var pick = Math.floor(Math.random() * (i + 1));
            var swap = layers[i];
            layers[i] = layers[pick];
            layers[pick] = swap;
        }

        var previous = above;
        for (i = 0; i < layers.length; i++) {
            if (previous) {
                layers[i].moveAfter(previous);
            } else {
                layers[i].moveToBeginning();
            }
            previous = layers[i];
        }
    }

    function applyRandomization() {
        var enabled = countEnabledRows();
        if (enabled === 0) {
            updateStatus("Tick something to randomize first", true);
            return;
        }

        var isRelative = relativeRadio.value;

        runOnSelection("Randomize Layer Properties", {}, function (ctx) {
            ctx.each(function (layer) {
                if (randPosX.check.value || randPosY.check.value) {
                    var anchor = getLayerCompAnchor(layer, ctx.time);
                    if (anchor) {
                        var dx = randPosX.check.value ? rollRange(randPosX) : 0;
                        var dy = randPosY.check.value ? rollRange(randPosY) : 0;
                        setLayerCompAnchor(layer, isRelative
                            ? [anchor[0] + dx, anchor[1] + dy, anchor[2]]
                            : [
                                randPosX.check.value ? dx : anchor[0],
                                randPosY.check.value ? dy : anchor[1],
                                anchor[2]
                            ], ctx.time);
                    }
                }

                if (randRotation.check.value) {
                    var rotProp = layer.property("ADBE Transform Group").property("ADBE Rotate Z");
                    if (!rotProp) throw new Error("no Z rotation property");
                    var angle = rollRange(randRotation);
                    setPropertyValue(rotProp, isRelative
                        ? rotProp.valueAtTime(ctx.time, false) + angle
                        : angle, ctx.time);
                }

                if (randScale.check.value) {
                    var scaleProp = layer.transform.scale;
                    var currentScale = scaleProp.valueAtTime(ctx.time, false);
                    var percent = rollRange(randScale);
                    setPropertyValue(scaleProp, matchDimensions(currentScale, isRelative
                        ? [currentScale[0] * (percent / 100), currentScale[1] * (percent / 100)]
                        : [percent, percent]), ctx.time);
                }

                if (randOpacity.check.value) {
                    var opacityProp = layer.transform.opacity;
                    var rolled = rollRange(randOpacity);
                    var nextOpacity = isRelative
                        ? opacityProp.valueAtTime(ctx.time, false) + rolled
                        : rolled;
                    setPropertyValue(opacityProp, Math.max(0, Math.min(100, nextOpacity)), ctx.time);
                }

                if (randAnchorX.check.value || randAnchorY.check.value) {
                    randomizeLayerAnchor(layer, ctx,
                        randAnchorX.check.value ? rollRange(randAnchorX) : 0,
                        randAnchorY.check.value ? rollRange(randAnchorY) : 0);
                }

                if (randLabelCheck.value) {
                    layer.label = Math.floor(Math.random() * 16) + 1;
                }

                randomizeLayerTiming(layer, ctx, isRelative);
            });

            if (randOrderCheck.value) {
                shuffleStackingOrder(ctx);
            }

            return "Randomized " + enabled + " setting(s) on " + ctx.applied + " layer(s)";
        });
    }

    function resetRandomControls() {
        randPosX.min.set(-100); randPosX.max.set(100); randPosX.check.value = true;
        randPosY.min.set(-100); randPosY.max.set(100); randPosY.check.value = true;
        randRotation.min.set(-45); randRotation.max.set(45); randRotation.check.value = false;
        randScale.min.set(80); randScale.max.set(120); randScale.check.value = false;
        randOpacity.min.set(-50); randOpacity.max.set(0); randOpacity.check.value = false;
        randAnchorX.min.set(-50); randAnchorX.max.set(50); randAnchorX.check.value = false;
        randAnchorY.min.set(-50); randAnchorY.max.set(50); randAnchorY.check.value = false;
        randStart.min.set(-10); randStart.max.set(10); randStart.check.value = false;
        randIn.min.set(0); randIn.max.set(10); randIn.check.value = false;
        randOut.min.set(-10); randOut.max.set(0); randOut.check.value = false;
        randLabelCheck.value = false;
        randOrderCheck.value = false;
        uniformRadio.value = true;
        gaussianRadio.value = false;
        updateStatus("Randomization settings reset");
    }

    // ========== UTILITY ACTIONS ==========

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
            var sumX = 0;
            var sumY = 0;
            var count = 0;

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
                var pos = posProp.valueAtTime(ctx.time, false);
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
                setPropertyValue(scaleProp,
                    matchDimensions(scaleProp.valueAtTime(ctx.time, false), [100, 100, 100]), ctx.time);
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
            var minX = entries[0].center[0];
            var maxX = minX;
            var minY = entries[0].center[1];
            var maxY = minY;

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

    function addNullParent() {
        runOnSelection("Add Null Parent", { topLevelOnly: true }, function (ctx) {
            // Measured before the null exists, so it is not part of the sum
            var bounds = getSelectionBounds(ctx.writable, ctx.time);
            if (!bounds) throw new Error("could not measure the selection bounds");

            var needs3D = false;
            for (var i = 0; i < ctx.targets.length; i++) {
                if (ctx.targets[i].threeDLayer) {
                    needs3D = true;
                    break;
                }
            }

            var nullLayer = ctx.comp.layers.addNull();
            nullLayer.name = "Parent Null";
            if (needs3D) nullLayer.threeDLayer = true;

            // Put the null's anchor point in the middle of its own square so
            // the pivot and the visible null both sit on the selection center
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

    // ========== EVENT LISTENERS ==========

    applyBtn.onClick = applyTransforms;
    resetBtn.onClick = resetControls;

    rotateBtn.onClick = rotateSelection;
    scaleBtn.onClick = scaleSelection;
    flipHBtn.onClick = flipHorizontal;
    flipVBtn.onClick = flipVertical;

    applyRandomBtn.onClick = applyRandomization;
    resetRandomBtn.onClick = resetRandomControls;

    centerBtn.onClick = centerLayers;
    centerAvgBtn.onClick = centerToAverage;
    roundBtn.onClick = roundPositions;
    resetTransformBtn.onClick = resetTransform;
    distributeBtn.onClick = distributeLayers;
    nullParentBtn.onClick = addNullParent;
    matchPosBtn.onClick = matchPosition;

    // The Group and Utilities tabs have fixed behaviour, so the mode radios
    // are greyed there rather than sitting above the tabs looking as if they
    // applied
    tabPanel.onChange = function () {
        var usesMode = (this.selection !== utilitiesTab && this.selection !== groupTab);
        relativeRadio.enabled = usesMode;
        absoluteRadio.enabled = usesMode;
    };

    tabPanel.selection = transformTab;
    relativeRadio.enabled = true;
    absoluteRadio.enabled = true;

    updateStatus("Ready");

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
