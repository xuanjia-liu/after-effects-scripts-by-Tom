// Keyframe Cleanup Tools - After Effects Script
//
// Three cleanup passes for the selected layers:
//   Remove Outside    - drop keyframes while the layer sits outside the comp bounds
//   Quick Optimize    - one-click conservative simplification
//   Advanced Optimize - tolerance-driven simplification, optionally refitting easing
//
// Bounds come from sourceRectAtTime + toComp, so text, shapes, rotation, parenting
// and 3D are all handled by After Effects rather than re-derived here.

(function keyframeCleanupTools() {

    var SETTINGS_SECTION = "MotionTools";
    var SETTINGS_PREFIX = "KeyframeCleanup_";
    var DEFAULT_EASE_INFLUENCE = 33.3333;
    var MAX_CURVE_SAMPLES = 4000;
    var EPSILON = 1e-9;

    var EASING_NONE = "none";
    var EASING_SPEED_MATCH = "speed";
    var EASING_AUTO_BEZIER = "autoBezier";

    var EASING_MODES = [EASING_NONE, EASING_SPEED_MATCH, EASING_AUTO_BEZIER];
    var EASING_LABELS = [
        "Leave easing as it is",
        "Match the original curve's speed",
        "Auto-bezier (let AE smooth it)"
    ];
    var EASING_HELP = "Speed match reads the curve you had before thinning and" +
                      " writes that speed back. Auto-bezier lets After Effects" +
                      " pick the handles with no reference to the original.";

    if (typeof app === "undefined") {
        alert("This script must be run in After Effects.");
        return;
    }

    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        alert("Please select a composition.");
        return;
    }

    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length === 0) {
        alert("Please select one or more layers.");
        return;
    }

    var settings = showUI(selectedLayers);
    if (!settings) {
        return; // User cancelled
    }

    app.beginUndoGroup(settings.undoName);

    try {
        var report = (settings.action === "removeOutside")
            ? runRemoveOutside(comp, selectedLayers, settings)
            : runOptimize(comp, selectedLayers, settings);

        alert(formatReport(settings, report));
    } catch (error) {
        alert("Keyframe Cleanup error:\n" + error.toString() +
              (error.line ? "\nLine " + error.line : ""));
    } finally {
        app.endUndoGroup();
    }


    // ----------------------------------------------------------------------
    // Settings persistence
    // ----------------------------------------------------------------------

    function loadSetting(key, fallback) {
        try {
            if (app.settings.haveSetting(SETTINGS_SECTION, SETTINGS_PREFIX + key)) {
                return app.settings.getSetting(SETTINGS_SECTION, SETTINGS_PREFIX + key);
            }
        } catch (e) {
            // Fall through to the default
        }
        return fallback;
    }

    function saveSetting(key, value) {
        try {
            app.settings.saveSetting(SETTINGS_SECTION, SETTINGS_PREFIX + key, String(value));
        } catch (e) {
            // Preferences are not writable - not worth interrupting the run
        }
    }

    function loadBool(key, fallback) {
        return loadSetting(key, fallback ? "1" : "0") === "1";
    }

    function loadNumber(key, fallback) {
        return parseFloatOr(loadSetting(key, String(fallback)), fallback);
    }


    // ----------------------------------------------------------------------
    // UI
    // ----------------------------------------------------------------------

    function showUI(layers) {
        var propertiesAreSelected = anyPropertiesSelected(layers);

        var dialog = new Window("dialog", "Keyframe Cleanup Tools");
        dialog.orientation = "column";
        dialog.alignChildren = "fill";
        dialog.spacing = 14;
        dialog.margins = 18;

        var tabs = dialog.add("tabbedpanel");
        tabs.alignChildren = "fill";
        tabs.preferredSize.width = 430;
        tabs.preferredSize.height = 285;

        // --- Remove Outside -------------------------------------------------
        var removeTab = tabs.add("tab", undefined, "Remove Outside");
        removeTab.orientation = "column";
        removeTab.alignChildren = "fill";
        removeTab.margins = 0;
        removeTab.spacing = 0;

        var removeContainer = removeTab.add("panel");
        removeContainer.orientation = "column";
        removeContainer.alignChildren = "fill";
        removeContainer.margins = 14;
        removeContainer.spacing = 10;

        var removeIntro = removeContainer.add("statictext", undefined,
            "Remove keys from selected layers while they sit outside the comp bounds.");
        removeIntro.preferredSize.width = 380;
        removeIntro.justify = "left";

        var marginGroup = removeContainer.add("group");
        marginGroup.orientation = "row";
        marginGroup.alignChildren = "center";
        marginGroup.spacing = 12;

        var marginLabel = marginGroup.add("statictext", undefined, "Margin:");
        marginLabel.preferredSize.width = 60;
        var marginSlider = marginGroup.add("slider", undefined, 0, 0, 500);
        marginSlider.preferredSize.width = 200;
        var marginEdit = marginGroup.add("edittext", undefined, "0");
        marginEdit.preferredSize.width = 60;

        var marginHelp = removeContainer.add("statictext", undefined,
            "0 removes keys as soon as the layer is fully outside.\nIncrease it to wait until the layer is further off-canvas.",
            { multiline: true });
        marginHelp.preferredSize.width = 380;
        marginHelp.preferredSize.height = 32;

        var keepBoundaryCheck = removeContainer.add("checkbox", undefined, "Keep entry / exit keyframes");
        keepBoundaryCheck.helpTip = "Keeps the first and last key of each off-canvas run so the layer still flies out and back in.";

        var includeExtentsCheck = removeContainer.add("checkbox", undefined, "Include masks and effect extents in bounds");
        includeExtentsCheck.helpTip = "Counts glows, shadows and mask extents as part of the layer. Slower.";

        // --- Quick Optimize -------------------------------------------------
        var quickTab = tabs.add("tab", undefined, "Quick Optimize");
        quickTab.orientation = "column";
        quickTab.alignChildren = "fill";
        quickTab.margins = 0;
        quickTab.spacing = 0;

        var quickContainer = quickTab.add("panel");
        quickContainer.orientation = "column";
        quickContainer.alignChildren = "fill";
        quickContainer.margins = 14;
        quickContainer.spacing = 10;

        var quickIntro = quickContainer.add("statictext", undefined,
            "One-click simplification using a conservative 2% value pass.");
        quickIntro.preferredSize.width = 380;
        quickIntro.justify = "left";

        var quickInfo1 = quickContainer.add("statictext", undefined,
            "Keys are dropped only where the curve stays within 2% of its own range.");
        var quickInfo2 = quickContainer.add("statictext", undefined,
            "Best for most animation when you want a fast cleanup with no setup.");
        quickInfo1.preferredSize.width = 380;
        quickInfo2.preferredSize.width = 380;

        var quickEasingRow = quickContainer.add("group");
        quickEasingRow.orientation = "row";
        quickEasingRow.alignChildren = "center";
        quickEasingRow.spacing = 10;
        var quickEasingLabel = quickEasingRow.add("statictext", undefined, "Easing:");
        quickEasingLabel.preferredSize.width = 60;
        var quickEasingList = quickEasingRow.add("dropdownlist", undefined, EASING_LABELS);
        quickEasingList.preferredSize.width = 250;
        quickEasingList.helpTip = EASING_HELP;

        // --- Advanced Optimize ----------------------------------------------
        var advancedTab = tabs.add("tab", undefined, "Advanced Optimize");
        advancedTab.orientation = "column";
        advancedTab.alignChildren = "fill";
        advancedTab.margins = 0;
        advancedTab.spacing = 0;

        var advancedContainer = advancedTab.add("panel");
        advancedContainer.orientation = "column";
        advancedContainer.alignChildren = "fill";
        advancedContainer.margins = 14;
        advancedContainer.spacing = 10;

        var advancedIntro = advancedContainer.add("statictext", undefined,
            "Choose an optimize mode and tune the tolerance for more control.");
        advancedIntro.preferredSize.width = 380;
        advancedIntro.justify = "left";

        var modeGroup = advancedContainer.add("group");
        modeGroup.orientation = "row";
        modeGroup.alignChildren = "center";
        modeGroup.spacing = 12;
        var modeLabel = modeGroup.add("statictext", undefined, "Mode:");
        modeLabel.preferredSize.width = 60;
        var valueModeRadio = modeGroup.add("radiobutton", undefined, "Value Mode");
        var timeModeRadio = modeGroup.add("radiobutton", undefined, "Time Mode");

        var toleranceRow = advancedContainer.add("group");
        toleranceRow.orientation = "row";
        toleranceRow.alignChildren = "center";
        toleranceRow.spacing = 12;
        var toleranceLabel = toleranceRow.add("statictext", undefined, "Tolerance:");
        toleranceLabel.preferredSize.width = 60;
        var toleranceSlider = toleranceRow.add("slider", undefined, 20, 1, 250);
        toleranceSlider.preferredSize.width = 160;
        var toleranceEdit = toleranceRow.add("edittext", undefined, "2.0");
        toleranceEdit.preferredSize.width = 50;
        var toleranceUnit = toleranceRow.add("statictext", undefined, "% of range");
        toleranceUnit.preferredSize.width = 70;

        var advancedEasingRow = advancedContainer.add("group");
        advancedEasingRow.orientation = "row";
        advancedEasingRow.alignChildren = "center";
        advancedEasingRow.spacing = 12;
        var advancedEasingLabel = advancedEasingRow.add("statictext", undefined, "Easing:");
        advancedEasingLabel.preferredSize.width = 60;
        var advancedEasingList = advancedEasingRow.add("dropdownlist", undefined, EASING_LABELS);
        advancedEasingList.preferredSize.width = 250;
        advancedEasingList.helpTip = EASING_HELP;

        var modeInfoPanel = advancedContainer.add("panel", undefined, "Mode Guide");
        modeInfoPanel.orientation = "column";
        modeInfoPanel.alignChildren = "fill";
        modeInfoPanel.margins = 10;

        var modeInfo1 = modeInfoPanel.add("statictext", undefined, "");
        var modeInfo2 = modeInfoPanel.add("statictext", undefined, "");
        modeInfo1.preferredSize.width = 350;
        modeInfo2.preferredSize.width = 350;

        // --- Shared options -------------------------------------------------
        var sharedPanel = dialog.add("panel", undefined, "Applies to every mode");
        sharedPanel.orientation = "column";
        sharedPanel.alignChildren = "left";
        sharedPanel.margins = 12;
        sharedPanel.spacing = 6;

        var selectedPropsCheck = sharedPanel.add("checkbox", undefined, "Limit to selected properties");
        selectedPropsCheck.helpTip = "When properties are selected in the timeline, touch only those.";
        selectedPropsCheck.enabled = propertiesAreSelected;
        if (!propertiesAreSelected) {
            selectedPropsCheck.text = "Limit to selected properties (none selected)";
        }

        var skipExpressionsCheck = sharedPanel.add("checkbox", undefined, "Skip properties that have expressions");
        skipExpressionsCheck.helpTip = "An expression drives the final value, so editing its keys rarely does what you expect.";

        var dryRunCheck = sharedPanel.add("checkbox", undefined, "Preview only - report without removing anything");

        // --- Buttons --------------------------------------------------------
        var buttonGroup = dialog.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignment = "center";
        buttonGroup.spacing = 10;

        var cancelButton = buttonGroup.add("button", undefined, "Cancel");
        var okButton = buttonGroup.add("button", undefined, "Run Cleanup");
        okButton.preferredSize.width = 140;

        dialog.defaultElement = okButton;
        dialog.cancelElement = cancelButton;

        // --- State ----------------------------------------------------------
        var toleranceState = {
            value: clamp(loadNumber("valueTolerance", 2), 0.1, 25),
            time: clamp(loadNumber("timeTolerance", 2), 1, 10)
        };

        marginEdit.text = String(Math.round(clamp(loadNumber("margin", 0), 0, 500)));
        keepBoundaryCheck.value = loadBool("keepBoundary", true);
        includeExtentsCheck.value = loadBool("includeExtents", false);
        selectedPropsCheck.value = propertiesAreSelected && loadBool("useSelectedProperties", true);
        skipExpressionsCheck.value = loadBool("skipExpressions", true);
        dryRunCheck.value = false;

        // "refitEasing" is the pre-dropdown key, read once so an existing
        // preference survives the upgrade.
        var savedEasing = loadSetting("easingMode",
            loadBool("refitEasing", false) ? EASING_SPEED_MATCH : EASING_NONE);
        var easingIndex = easingModeToIndex(savedEasing);
        quickEasingList.selection = easingIndex;
        advancedEasingList.selection = easingIndex;

        if (loadSetting("optimizeMode", "value") === "time") {
            timeModeRadio.value = true;
        } else {
            valueModeRadio.value = true;
        }

        var selectedTab = null;

        // --- Handlers -------------------------------------------------------
        marginSlider.onChanging = function () {
            marginEdit.text = String(Math.round(this.value));
        };

        marginEdit.onChanging = function () {
            syncMarginFromField(false);
        };

        marginEdit.onChange = function () {
            syncMarginFromField(true);
        };

        toleranceSlider.onChanging = function () {
            var v = Math.round(this.value) / 10;
            toleranceState[currentMode()] = v;
            toleranceEdit.text = v.toFixed(1);
        };

        toleranceEdit.onChange = function () {
            var range = toleranceRange();
            var v = clamp(parseFloatOr(toleranceEdit.text, toleranceState[currentMode()]), range.min, range.max);
            toleranceState[currentMode()] = v;
            toleranceSlider.value = v * 10;
            toleranceEdit.text = v.toFixed(1);
        };

        valueModeRadio.onClick = onModeChanged;
        timeModeRadio.onClick = onModeChanged;

        var syncingEasing = false;

        quickEasingList.onChange = function () {
            syncEasing(quickEasingList, advancedEasingList);
        };

        advancedEasingList.onChange = function () {
            syncEasing(advancedEasingList, quickEasingList);
        };

        tabs.onChange = updateWorkflowState;

        cancelButton.onClick = function () {
            dialog.close(0);
        };

        okButton.onClick = function () {
            if (tabs.selection === removeTab) {
                var margin = parseFloat(marginEdit.text);
                if (isNaN(margin) || margin < 0) {
                    alert("Please enter a valid margin value (0 or greater).");
                    return;
                }
            }
            selectedTab = tabs.selection;
            dialog.close(1);
        };

        // Assigning .selection fires onChange again, so the two lists would
        // bounce the value back and forth without this guard.
        function syncEasing(source, target) {
            if (syncingEasing || !source.selection) return;
            syncingEasing = true;
            try {
                target.selection = source.selection.index;
            } finally {
                syncingEasing = false;
            }
        }

        function selectedEasingMode(list) {
            return list.selection ? EASING_MODES[list.selection.index] : EASING_NONE;
        }

        function currentMode() {
            return timeModeRadio.value ? "time" : "value";
        }

        function toleranceRange() {
            return (currentMode() === "time")
                ? { min: 1, max: 10 }
                : { min: 0.1, max: 25 };
        }

        function onModeChanged() {
            applyToleranceToUI();
            updateAdvancedModeInfo();
        }

        function applyToleranceToUI() {
            var range = toleranceRange();
            var mode = currentMode();
            var v = clamp(toleranceState[mode], range.min, range.max);
            toleranceState[mode] = v;

            toleranceSlider.minvalue = range.min * 10;
            toleranceSlider.maxvalue = range.max * 10;
            toleranceSlider.value = v * 10;
            toleranceEdit.text = v.toFixed(1);
            toleranceUnit.text = (mode === "time") ? "frames" : "% of range";
        }

        function syncMarginFromField(commit) {
            var value = parseFloat(marginEdit.text);

            if (isNaN(value)) {
                if (!commit) return;
                value = 0;
            }

            value = clamp(value, 0, 500);
            marginSlider.value = value;
            if (commit) {
                marginEdit.text = String(Math.round(value));
            }
        }

        function updateAdvancedModeInfo() {
            if (timeModeRadio.value) {
                modeInfo1.text = "Time Mode thins keys so survivors are at least the tolerance apart.";
                modeInfo2.text = "Best for baked or frame-by-frame animation.";
            } else {
                modeInfo1.text = "Value Mode drops keys while the curve stays within the tolerance.";
                modeInfo2.text = "Tolerance is a share of each property's own range, so it suits any unit.";
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

        // --- Show -----------------------------------------------------------
        updateAdvancedModeInfo();
        applyToleranceToUI();
        syncMarginFromField(true);

        var savedTab = parseFloatOr(loadSetting("tab", "0"), 0);
        tabs.selection = (savedTab === 1) ? quickTab : (savedTab === 2 ? advancedTab : removeTab);
        updateWorkflowState();

        if (dialog.show() !== 1) {
            return null;
        }

        // --- Collect --------------------------------------------------------
        var result = {
            margin: clamp(parseFloatOr(marginEdit.text, 0), 0, 500),
            keepBoundaryKeys: keepBoundaryCheck.value,
            includeExtents: includeExtentsCheck.value,
            useSelectedProperties: propertiesAreSelected && selectedPropsCheck.value,
            skipExpressions: skipExpressionsCheck.value,
            dryRun: dryRunCheck.value,
            easingMode: EASING_NONE,
            mode: "value",
            modeLabel: "Value Mode",
            tolerance: 2
        };

        var tabIndex = 0;

        if (selectedTab === quickTab) {
            tabIndex = 1;
            result.action = "quickSimplify";
            result.actionLabel = "Quick Optimize";
            result.undoName = "Quick Optimize Keyframes";
            result.mode = "value";
            result.modeLabel = "Value Mode";
            result.tolerance = 2;
            result.easingMode = selectedEasingMode(quickEasingList);
        } else if (selectedTab === advancedTab) {
            tabIndex = 2;
            result.action = "advancedSimplify";
            result.actionLabel = "Advanced Optimize";
            result.undoName = "Advanced Optimize Keyframes";
            result.mode = currentMode();
            result.modeLabel = timeModeRadio.value ? "Time Mode" : "Value Mode";
            result.tolerance = toleranceState[result.mode];
            result.easingMode = selectedEasingMode(advancedEasingList);
        } else {
            result.action = "removeOutside";
            result.actionLabel = "Remove Outside Canvas";
            result.undoName = "Remove Keyframes Outside Canvas";
            result.mode = "outside";
            result.modeLabel = "Outside Canvas";
        }

        result.easingLabel = EASING_LABELS[easingModeToIndex(result.easingMode)];

        result.toleranceDisplay = (result.mode === "time")
            ? result.tolerance.toFixed(1) + " frames"
            : result.tolerance.toFixed(1) + "% of range";

        saveSetting("tab", tabIndex);
        saveSetting("margin", result.margin);
        saveSetting("keepBoundary", keepBoundaryCheck.value ? 1 : 0);
        saveSetting("includeExtents", includeExtentsCheck.value ? 1 : 0);
        saveSetting("useSelectedProperties", selectedPropsCheck.value ? 1 : 0);
        saveSetting("skipExpressions", skipExpressionsCheck.value ? 1 : 0);
        saveSetting("easingMode", result.easingMode);
        saveSetting("optimizeMode", currentMode());
        saveSetting("valueTolerance", toleranceState.value);
        saveSetting("timeTolerance", toleranceState.time);

        return result;
    }

    function easingModeToIndex(mode) {
        for (var i = 0; i < EASING_MODES.length; i++) {
            if (EASING_MODES[i] === mode) return i;
        }
        return 0;
    }

    function anyPropertiesSelected(layers) {
        for (var i = 0; i < layers.length; i++) {
            var selected = layers[i].selectedProperties;
            if (selected && selected.length > 0) return true;
        }
        return false;
    }


    // ----------------------------------------------------------------------
    // Remove Outside Canvas
    // ----------------------------------------------------------------------

    function runRemoveOutside(comp, layers, settings) {
        var report = newReport();
        var progress = createProgress("Remove Keyframes Outside Canvas", layers.length);

        try {
            for (var i = 0; i < layers.length; i++) {
                var layer = layers[i];
                progress.update(i, layer.name);

                var reason = boundsSkipReason(layer);
                if (reason) {
                    report.skipped.push(layer.name + " (" + reason + ")");
                    continue;
                }

                var removed = removeOutsideForLayer(comp, layer, settings, report);
                if (removed > 0) {
                    report.layers++;
                    report.keyframes += removed;
                }
            }
        } finally {
            progress.close();
        }

        return report;
    }

    function boundsSkipReason(layer) {
        if (layer.locked) return "locked";
        if (layer instanceof CameraLayer) return "camera";
        if (layer instanceof LightLayer) return "light";
        if (!(layer instanceof AVLayer)) return "no bounds";
        return null;
    }

    function removeOutsideForLayer(comp, layer, settings, report) {
        var props = targetProperties(layer, settings, report);
        if (props.length === 0) return 0;

        var keyTimes = uniqueKeyTimes(props);
        if (keyTimes.length === 0) return 0;

        var isOutside = createOutsideSampler(layer, comp, settings);
        var runs = outsideRuns(keyTimes, isOutside);
        if (runs.length === 0) return 0;

        var doomed = [];
        for (var r = 0; r < runs.length; r++) {
            var from = settings.keepBoundaryKeys ? runs[r].start + 1 : runs[r].start;
            var to = settings.keepBoundaryKeys ? runs[r].end - 1 : runs[r].end;
            for (var i = from; i <= to; i++) {
                doomed.push(keyTimes[i]);
            }
        }
        if (doomed.length === 0) return 0;

        // timeInList binary-searches this, so it has to stay sorted.
        doomed.sort(function (a, b) { return a - b; });

        // Doomed times come from these same keyTime() calls, so this only has
        // to absorb float noise - not a whole frame, which would catch the
        // boundary keys we just went to the trouble of keeping.
        var tolerance = 1e-4;
        var count = 0;

        for (var p = 0; p < props.length; p++) {
            count += settings.dryRun
                ? countKeysAtTimes(props[p], doomed, tolerance)
                : removeKeysAtTimes(props[p], doomed, tolerance);
        }

        return count;
    }

    // A layer only needs testing where it actually has keys, plus the midpoint
    // between adjacent off-canvas keys to catch a fast dip back into frame.
    function outsideRuns(keyTimes, isOutside) {
        var flags = [];
        for (var i = 0; i < keyTimes.length; i++) {
            flags.push(isOutside(keyTimes[i]));
        }

        var runs = [];
        var start = -1;

        for (var j = 0; j < keyTimes.length; j++) {
            if (!flags[j]) {
                if (start >= 0) {
                    runs.push({ start: start, end: j - 1 });
                    start = -1;
                }
                continue;
            }

            if (start < 0) {
                start = j;
            } else if (!isOutside((keyTimes[j - 1] + keyTimes[j]) / 2)) {
                runs.push({ start: start, end: j - 1 });
                start = j;
            }
        }

        if (start >= 0) {
            runs.push({ start: start, end: keyTimes.length - 1 });
        }

        return runs;
    }

    function createOutsideSampler(layer, comp, settings) {
        var cachedRect = null;
        var staticSource = !settings.includeExtents &&
                           !(layer instanceof TextLayer) &&
                           !(layer instanceof ShapeLayer);
        var margin = settings.margin;

        return function (time) {
            var rect;

            if (staticSource) {
                if (cachedRect === null) {
                    cachedRect = safeSourceRect(layer, time, settings.includeExtents);
                }
                rect = cachedRect;
            } else {
                rect = safeSourceRect(layer, time, settings.includeExtents);
            }

            var bounds = rectToCompBounds(layer, rect, time);
            if (!bounds) return false;

            return bounds.right < -margin ||
                   bounds.left > comp.width + margin ||
                   bounds.bottom < -margin ||
                   bounds.top > comp.height + margin;
        };
    }

    function safeSourceRect(layer, time, includeExtents) {
        try {
            var rect = layer.sourceRectAtTime(time, includeExtents === true);
            if (!rect || rect.width <= 0 || rect.height <= 0) return null;
            return rect;
        } catch (e) {
            return null;
        }
    }

    // Let After Effects do the transform work: toComp covers anchor point,
    // scale, rotation, the whole parent chain and 3D projection.
    function rectToCompBounds(layer, rect, time) {
        if (!rect) return null;

        var corners = [
            [rect.left, rect.top],
            [rect.left + rect.width, rect.top],
            [rect.left, rect.top + rect.height],
            [rect.left + rect.width, rect.top + rect.height]
        ];

        var minX = null, minY = null, maxX = null, maxY = null;

        try {
            for (var i = 0; i < corners.length; i++) {
                var point = layer.toComp(corners[i], time);
                if (minX === null || point[0] < minX) minX = point[0];
                if (maxX === null || point[0] > maxX) maxX = point[0];
                if (minY === null || point[1] < minY) minY = point[1];
                if (maxY === null || point[1] > maxY) maxY = point[1];
            }
        } catch (e) {
            return null;
        }

        if (minX === null) return null;
        return { left: minX, top: minY, right: maxX, bottom: maxY };
    }

    function removeKeysAtTimes(prop, sortedTimes, tolerance) {
        var removed = 0;
        for (var k = prop.numKeys; k >= 1; k--) {
            if (timeInList(prop.keyTime(k), sortedTimes, tolerance)) {
                try {
                    prop.removeKey(k);
                    removed++;
                } catch (e) {
                    // Protected or already gone
                }
            }
        }
        return removed;
    }

    function countKeysAtTimes(prop, sortedTimes, tolerance) {
        var count = 0;
        for (var k = 1; k <= prop.numKeys; k++) {
            if (timeInList(prop.keyTime(k), sortedTimes, tolerance)) count++;
        }
        return count;
    }

    function timeInList(time, sortedTimes, tolerance) {
        var lo = 0;
        var hi = sortedTimes.length - 1;

        while (lo <= hi) {
            var mid = Math.floor((lo + hi) / 2);
            var delta = sortedTimes[mid] - time;
            if (Math.abs(delta) <= tolerance) return true;
            if (delta < 0) lo = mid + 1;
            else hi = mid - 1;
        }

        return false;
    }


    // ----------------------------------------------------------------------
    // Optimize
    // ----------------------------------------------------------------------

    function runOptimize(comp, layers, settings) {
        var report = newReport();
        var progress = createProgress(settings.actionLabel, layers.length);

        try {
            for (var i = 0; i < layers.length; i++) {
                var layer = layers[i];
                progress.update(i, layer.name);

                if (layer.locked) {
                    report.skipped.push(layer.name + " (locked)");
                    continue;
                }

                var props = targetProperties(layer, settings, report);
                var removedHere = 0;
                var touched = 0;

                for (var p = 0; p < props.length; p++) {
                    var prop = props[p];
                    if (prop.numKeys < 3) continue;

                    var removed = simplifyProperty(comp, prop, settings);
                    if (removed > 0 || settings.easingMode !== EASING_NONE) touched++;
                    removedHere += removed;
                }

                if (touched > 0) {
                    report.layers++;
                    report.properties += touched;
                    report.keyframes += removedHere;
                }
            }
        } finally {
            progress.close();
        }

        return report;
    }

    function simplifyProperty(comp, prop, settings) {
        var keyCount = prop.numKeys;
        if (keyCount < 3) return 0;

        var firstTime = prop.keyTime(1);
        var lastTime = prop.keyTime(keyCount);
        if (lastTime - firstTime <= 0) return 0;

        // Sample the curve as it stands, easing included, before touching anything.
        var baseline = sampleProperty(comp, prop, firstTime, lastTime);

        var keep = (settings.mode === "time")
            ? chooseKeysByTime(comp, prop, settings.tolerance)
            : chooseKeysByValue(prop, baseline, settings.tolerance / 100);

        var doomed = [];
        for (var k = 1; k <= keyCount; k++) {
            if (!keep[k] && !isHoldAdjacent(prop, k)) doomed.push(k);
        }

        if (settings.dryRun) return doomed.length;

        doomed.sort(function (a, b) { return b - a; });

        var removed = 0;
        for (var d = 0; d < doomed.length; d++) {
            try {
                prop.removeKey(doomed[d]);
                removed++;
            } catch (e) {
                // Protected keyframe
            }
        }

        applyEasingMode(prop, baseline, settings.easingMode);

        return removed;
    }

    // Ramer-Douglas-Peucker over the keys, with error measured against the
    // sampled curve rather than against the neighbouring key values. Error is
    // bounded across the whole property instead of compounding key by key.
    function chooseKeysByValue(prop, baseline, tolerance) {
        var n = prop.numKeys;
        var keep = {};
        keep[1] = true;
        keep[n] = true;
        if (n < 3) return keep;

        var keyTimes = [];
        for (var k = 1; k <= n; k++) keyTimes.push(prop.keyTime(k));

        var spreads = propertySpreads(prop);
        var stack = [[1, n]];
        var guard = 0;

        while (stack.length > 0 && guard++ < 100000) {
            var range = stack.pop();
            var a = range[0];
            var b = range[1];
            if (b - a < 2) continue;

            var startIdx = nearestSampleIndex(baseline, keyTimes[a - 1]);
            var endIdx = nearestSampleIndex(baseline, keyTimes[b - 1]);
            var worst = spanDeviation(baseline, startIdx, endIdx, spreads);

            if (worst.error <= tolerance) continue;

            var splitKey = nearestKeyInRange(keyTimes, baseline[worst.index].time, a, b);
            if (splitKey < 0) continue;

            keep[splitKey] = true;
            stack.push([a, splitKey]);
            stack.push([splitKey, b]);
        }

        return keep;
    }

    function chooseKeysByTime(comp, prop, toleranceFrames) {
        var n = prop.numKeys;
        var keep = {};
        keep[1] = true;
        keep[n] = true;

        var maxGap = toleranceFrames * comp.frameDuration;
        var lastKeptTime = prop.keyTime(1);

        for (var k = 2; k < n; k++) {
            var time = prop.keyTime(k);
            if (time - lastKeptTime > maxGap) {
                keep[k] = true;
                lastKeptTime = time;
            }
        }

        return keep;
    }

    function spanDeviation(baseline, startIdx, endIdx, spreads) {
        var start = baseline[startIdx];
        var end = baseline[endIdx];
        var span = end.time - start.time;

        var worst = { error: 0, index: startIdx };
        if (span <= 0) return worst;

        for (var i = startIdx + 1; i < endIdx; i++) {
            var amount = (baseline[i].time - start.time) / span;
            var expected = interpolateValue(start.value, end.value, amount);
            var error = normalizedDeviation(baseline[i].value, expected, spreads);
            if (error > worst.error) {
                worst.error = error;
                worst.index = i;
            }
        }

        return worst;
    }

    function nearestKeyInRange(keyTimes, time, a, b) {
        var best = -1;
        var bestDistance = null;

        for (var k = a + 1; k < b; k++) {
            var distance = Math.abs(keyTimes[k - 1] - time);
            if (bestDistance === null || distance < bestDistance) {
                bestDistance = distance;
                best = k;
            }
        }

        return best;
    }

    function sampleProperty(comp, prop, fromTime, toTime) {
        var step = comp.frameDuration;
        var count = Math.ceil((toTime - fromTime) / step);

        if (count > MAX_CURVE_SAMPLES) {
            count = MAX_CURVE_SAMPLES;
            step = (toTime - fromTime) / count;
        }
        if (count < 1) count = 1;

        var samples = [];
        for (var i = 0; i <= count; i++) {
            var time = fromTime + i * step;
            if (time > toTime) time = toTime;
            samples.push({ time: time, value: prop.valueAtTime(time, true) });
        }

        return samples;
    }

    function nearestSampleIndex(baseline, time) {
        if (baseline.length < 2) return 0;

        var first = baseline[0].time;
        var step = baseline[1].time - first;
        if (step <= 0) return 0;

        var index = Math.round((time - first) / step);
        if (index < 0) index = 0;
        if (index > baseline.length - 1) index = baseline.length - 1;
        return index;
    }

    // Per-component spread, so one tolerance means the same thing for position
    // in pixels, opacity in percent, rotation in degrees and colour in 0-1.
    function propertySpreads(prop) {
        var lows = null;
        var highs = null;

        for (var k = 1; k <= prop.numKeys; k++) {
            var components = toArray(prop.keyValue(k));

            if (lows === null) {
                lows = [];
                highs = [];
                for (var c = 0; c < components.length; c++) {
                    lows.push(components[c]);
                    highs.push(components[c]);
                }
                continue;
            }

            for (var i = 0; i < components.length && i < lows.length; i++) {
                if (components[i] < lows[i]) lows[i] = components[i];
                if (components[i] > highs[i]) highs[i] = components[i];
            }
        }

        if (lows === null) return [];

        var spreads = [];
        for (var s = 0; s < lows.length; s++) spreads.push(highs[s] - lows[s]);
        return spreads;
    }

    function normalizedDeviation(a, b, spreads) {
        var av = toArray(a);
        var bv = toArray(b);
        var worst = 0;

        for (var i = 0; i < av.length && i < bv.length; i++) {
            var difference = Math.abs(av[i] - bv[i]);
            var spread = (i < spreads.length) ? spreads[i] : 0;

            if (spread > EPSILON) {
                worst = Math.max(worst, difference / spread);
            } else if (difference > EPSILON) {
                worst = Math.max(worst, 1);
            }
        }

        return worst;
    }

    function interpolateValue(startValue, endValue, amount) {
        if (startValue instanceof Array) {
            var result = [];
            for (var i = 0; i < startValue.length; i++) {
                result.push(startValue[i] + (endValue[i] - startValue[i]) * amount);
            }
            return result;
        }

        if (typeof startValue === "number") {
            return startValue + (endValue - startValue) * amount;
        }

        return startValue;
    }

    function toArray(value) {
        if (value instanceof Array) return value;
        if (typeof value === "number") return [value];
        return [];
    }

    function isHoldAdjacent(prop, keyIndex) {
        try {
            if (prop.keyInInterpolationType(keyIndex) === KeyframeInterpolationType.HOLD) return true;
            if (prop.keyOutInterpolationType(keyIndex) === KeyframeInterpolationType.HOLD) return true;
            if (keyIndex > 1 &&
                prop.keyOutInterpolationType(keyIndex - 1) === KeyframeInterpolationType.HOLD) return true;
            if (keyIndex < prop.numKeys &&
                prop.keyInInterpolationType(keyIndex + 1) === KeyframeInterpolationType.HOLD) return true;
        } catch (e) {
            return false;
        }

        return false;
    }


    // ----------------------------------------------------------------------
    // Easing refit
    //
    // After Effects has no "fit the nearest bezier to this motion" call, so
    // this reads the speed of the original curve at each surviving key and
    // writes it back as a bezier temporal ease. The thinned curve then leaves
    // and arrives at every key at the speed the original did.
    // ----------------------------------------------------------------------

    function applyEasingMode(prop, baseline, mode) {
        if (mode === EASING_SPEED_MATCH) {
            refitTemporalEase(prop, baseline);
        } else if (mode === EASING_AUTO_BEZIER) {
            applyTemporalAutoBezier(prop);
        }
    }

    // After Effects' own smoothing. It chooses the handles itself with no
    // reference to the curve that was there before, so it reads smoother than
    // the speed match but will not reproduce the original timing. Temporal
    // only - spatial tangents, and so the shape of the motion path, are left
    // exactly as they are.
    function applyTemporalAutoBezier(prop) {
        if (!canSetTemporalEase(prop)) return;

        for (var k = 1; k <= prop.numKeys; k++) {
            if (isHoldAdjacent(prop, k)) continue;
            if (isRovingKey(prop, k)) continue;

            try {
                prop.setInterpolationTypeAtKey(k,
                    KeyframeInterpolationType.BEZIER,
                    KeyframeInterpolationType.BEZIER);
                prop.setTemporalAutoBezierAtKey(k, true);
            } catch (e) {
                // Some properties refuse auto-bezier - leave them alone
            }
        }
    }

    function isRovingKey(prop, keyIndex) {
        if (!isSpatialProperty(prop)) return false;
        try {
            return prop.keyRoving(keyIndex) === true;
        } catch (e) {
            return false;
        }
    }

    function refitTemporalEase(prop, baseline) {
        if (!canSetTemporalEase(prop)) return;

        var spatial = isSpatialProperty(prop);
        var dimensions = easeDimensionCount(prop);

        for (var k = 1; k <= prop.numKeys; k++) {
            if (isHoldAdjacent(prop, k)) continue;
            if (isRovingKey(prop, k)) continue;

            var velocity = velocityAt(baseline, prop.keyTime(k));
            var magnitude = vectorMagnitude(velocity);

            var inEases = [];
            var outEases = [];

            for (var d = 0; d < dimensions; d++) {
                var speed = spatial ? magnitude : (d < velocity.length ? velocity[d] : 0);
                inEases.push(new KeyframeEase(speed, DEFAULT_EASE_INFLUENCE));
                outEases.push(new KeyframeEase(speed, DEFAULT_EASE_INFLUENCE));
            }

            try {
                prop.setInterpolationTypeAtKey(k,
                    KeyframeInterpolationType.BEZIER,
                    KeyframeInterpolationType.BEZIER);
                prop.setTemporalEaseAtKey(k, inEases, outEases);
            } catch (e) {
                // Some properties refuse temporal ease - leave them as they are
            }
        }
    }

    function velocityAt(baseline, time) {
        var index = nearestSampleIndex(baseline, time);
        var previous = baseline[Math.max(0, index - 1)];
        var next = baseline[Math.min(baseline.length - 1, index + 1)];
        var span = next.time - previous.time;

        var a = toArray(previous.value);
        var b = toArray(next.value);
        var velocity = [];

        for (var i = 0; i < a.length && i < b.length; i++) {
            velocity.push(span > 0 ? (b[i] - a[i]) / span : 0);
        }

        return velocity;
    }

    function vectorMagnitude(vector) {
        var total = 0;
        for (var i = 0; i < vector.length; i++) total += vector[i] * vector[i];
        return Math.sqrt(total);
    }

    function isSpatialProperty(prop) {
        return prop.propertyValueType === PropertyValueType.TwoD_SPATIAL ||
               prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL;
    }

    // Spatial properties take a single ease (speed along the path); everything
    // else takes one per dimension.
    function easeDimensionCount(prop) {
        if (isSpatialProperty(prop)) return 1;

        switch (prop.propertyValueType) {
            case PropertyValueType.TwoD: return 2;
            case PropertyValueType.ThreeD: return 3;
            case PropertyValueType.COLOR: return 4;
            default: return 1;
        }
    }

    function canSetTemporalEase(prop) {
        switch (prop.propertyValueType) {
            case PropertyValueType.OneD:
            case PropertyValueType.TwoD:
            case PropertyValueType.TwoD_SPATIAL:
            case PropertyValueType.ThreeD:
            case PropertyValueType.ThreeD_SPATIAL:
            case PropertyValueType.COLOR:
                return true;
        }
        return false;
    }


    // ----------------------------------------------------------------------
    // Property collection
    // ----------------------------------------------------------------------

    function targetProperties(layer, settings, report) {
        var found = [];

        if (settings.useSelectedProperties) {
            // Selection is honoured per layer: a selected layer with nothing
            // selected on it is left alone rather than processed whole.
            if (!layer.selectedProperties || layer.selectedProperties.length === 0) {
                return [];
            }
            for (var i = 0; i < layer.selectedProperties.length; i++) {
                collectAnimatedProperties(layer.selectedProperties[i], found);
            }
        } else {
            // One pass over the layer covers Transform, Effects, Masks, Text
            // and everything else, so nothing gets walked twice.
            for (var p = 1; p <= layer.numProperties; p++) {
                try {
                    collectAnimatedProperties(layer.property(p), found);
                } catch (e) {
                    // Inaccessible property group
                }
            }
        }

        var kept = [];
        var seen = {};

        for (var f = 0; f < found.length; f++) {
            var prop = found[f];
            var id = propertyPathKey(prop);
            if (seen[id]) continue;
            seen[id] = true;

            if (!isEditableKeyProperty(prop)) continue;

            if (settings.skipExpressions && propertyHasExpression(prop)) {
                report.expressionProps++;
                continue;
            }

            kept.push(prop);
        }

        return kept;
    }

    function collectAnimatedProperties(root, out) {
        if (!root) return;

        if (root.numKeys !== undefined) {
            if (root.numKeys > 0) out.push(root);
            return;
        }

        if (root.numProperties !== undefined) {
            for (var i = 1; i <= root.numProperties; i++) {
                try {
                    collectAnimatedProperties(root.property(i), out);
                } catch (e) {
                    // Inaccessible sub-property
                }
            }
        }
    }

    // Property objects are fresh wrappers on every access, so identity
    // comparison is unreliable - compare the index path instead.
    function propertyPathKey(prop) {
        var parts = [];
        var node = prop;
        var guard = 0;

        try {
            while (node && node.propertyIndex !== undefined && guard++ < 64) {
                parts.push(node.propertyIndex);
                node = node.parentProperty;
            }
        } catch (e) {
            // Reached the layer
        }

        return parts.join(".");
    }

    function isEditableKeyProperty(prop) {
        try {
            if (prop.propertyValueType === PropertyValueType.NO_VALUE) return false;
            if (prop.propertyValueType === PropertyValueType.MARKER) return false;
            if (prop.propertyValueType === PropertyValueType.CUSTOM_VALUE) return false;
            if (prop.propertyValueType === PropertyValueType.LAYER_INDEX) return false;
            if (prop.propertyValueType === PropertyValueType.MASK_INDEX) return false;
            if (prop.propertyValueType === PropertyValueType.TEXT_DOCUMENT) return false;
            if (prop.propertyValueType === PropertyValueType.SHAPE) return false;
            if (prop.canVaryOverTime === false) return false;
            return true;
        } catch (e) {
            return false;
        }
    }

    function propertyHasExpression(prop) {
        try {
            return prop.expressionEnabled === true && prop.expression !== "";
        } catch (e) {
            return false;
        }
    }

    function uniqueKeyTimes(props) {
        var seen = {};
        var times = [];

        for (var p = 0; p < props.length; p++) {
            var prop = props[p];
            for (var k = 1; k <= prop.numKeys; k++) {
                var time = prop.keyTime(k);
                var id = time.toFixed(6);
                if (seen[id]) continue;
                seen[id] = true;
                times.push(time);
            }
        }

        times.sort(function (a, b) { return a - b; });
        return times;
    }


    // ----------------------------------------------------------------------
    // Reporting
    // ----------------------------------------------------------------------

    function newReport() {
        return {
            layers: 0,
            properties: 0,
            keyframes: 0,
            expressionProps: 0,
            skipped: []
        };
    }

    function formatReport(settings, report) {
        var lines = [];

        lines.push(settings.dryRun ? "Preview only - nothing was changed." : "Processing complete.");
        lines.push("");
        lines.push("Mode: " + settings.actionLabel);

        if (settings.action === "removeOutside") {
            lines.push("Margin: " + settings.margin + " px");
            lines.push("Keep entry / exit keys: " + (settings.keepBoundaryKeys ? "yes" : "no"));
        } else {
            lines.push("Optimizer: " + settings.modeLabel);
            lines.push("Tolerance: " + settings.toleranceDisplay);
            lines.push("Easing: " + settings.easingLabel);
        }

        lines.push("");
        lines.push("Layers affected: " + report.layers);

        if (settings.action !== "removeOutside") {
            lines.push("Properties processed: " + report.properties);
        }

        lines.push(settings.dryRun
            ? "Keyframes that would be removed: " + report.keyframes
            : "Keyframes removed: " + report.keyframes);

        if (report.expressionProps > 0) {
            lines.push("Properties skipped (expressions): " + report.expressionProps);
        }

        if (report.skipped.length > 0) {
            lines.push("");
            lines.push("Layers skipped:");
            var shown = Math.min(report.skipped.length, 8);
            for (var i = 0; i < shown; i++) {
                lines.push("  - " + report.skipped[i]);
            }
            if (report.skipped.length > shown) {
                lines.push("  ...and " + (report.skipped.length - shown) + " more");
            }
        }

        return lines.join("\n");
    }

    function createProgress(title, total) {
        var win = null;
        var bar = null;
        var label = null;

        try {
            win = new Window("palette", title, undefined, { closeButton: false });
            win.orientation = "column";
            win.alignChildren = "fill";
            win.margins = 16;
            win.spacing = 8;
            win.preferredSize.width = 330;

            label = win.add("statictext", undefined, "Preparing...");
            label.preferredSize.width = 296;

            bar = win.add("progressbar", undefined, 0, Math.max(1, total));
            bar.preferredSize.width = 296;

            win.show();
            win.update();
        } catch (e) {
            win = null;
        }

        return {
            update: function (done, name) {
                if (!win) return;
                try {
                    bar.value = done;
                    label.text = "Layer " + (done + 1) + " of " + total + ": " + name;
                    win.update();
                } catch (e) {
                    // Window went away
                }
            },
            close: function () {
                if (!win) return;
                try {
                    win.close();
                } catch (e) {
                    // Already closed
                }
                win = null;
            }
        };
    }


    // ----------------------------------------------------------------------
    // Small helpers
    // ----------------------------------------------------------------------

    function clamp(value, low, high) {
        if (value < low) return low;
        if (value > high) return high;
        return value;
    }

    function parseFloatOr(text, fallback) {
        var value = parseFloat(text);
        return isNaN(value) ? fallback : value;
    }

})();
