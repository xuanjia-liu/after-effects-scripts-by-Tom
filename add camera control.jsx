/**
 * Add Camera Control - camera rig builder for After Effects
 *
 *   Run                  Wraps the selected camera(s) in a rig, or creates a
 *                        brand new camera rig when nothing is selected.
 *   Alt / Option or      Opens the options dialog. Settings are remembered
 *   Shift while running  between runs.
 *
 * The rig is three layers: a camera, a controller null it is parented to, and
 * a target null it aims at. Every camera setting is exposed as an effect
 * control on the controller, so the camera itself never has to be touched.
 *
 * Expressions reach the controller through `parent` rather than
 * thisComp.layer("name"), so renaming layers cannot break the rig, and read
 * effect parameters by index - effect("X")(1) - so a localised After Effects
 * UI cannot break it either.
 */
(function () {

    // -----------------------------------------------------------------
    // Configuration
    // -----------------------------------------------------------------

    var SETTINGS_SECTION = "MotionTools_CameraRig";

    // A 50 mm lens on a 36 mm sensor: zoom(px) = compWidth * 50 / 36.
    // Using the same figure for zoom and distance puts a layer at z = 0 at
    // exactly 100% scale, so a fresh rig starts out looking like no camera.
    var LENS_50MM = 50 / 36;

    // After Effects label indices, 0-16.
    var LABEL_NAMES = ["None", "Red", "Yellow", "Aqua", "Pink", "Lavender",
                       "Peach", "Sea Foam", "Blue", "Green", "Purple",
                       "Orange", "Brown", "Fuchsia", "Cyan", "Sandstone",
                       "Dark Green"];

    var DEFAULTS = {
        cameraName:     "Cam1",
        controllerType: "prefix",
        controllerText: "ctrl",
        camDistance:    0,      // 0 = derive from the comp width
        focalLength:    0,      // 0 = derive from the comp width
        addTarget:      true,
        targetDistance: 1000,
        dofEnabled:     true,
        aperture:       200,
        blurLevel:      200,
        dollyZoom:      false,
        expose:         true,
        labelColor:     11,     // Orange
        lockCamera:     true
    };

    // Match names, so nothing here depends on the language of the AE UI.
    var MN = {
        effects:    "ADBE Effect Parade",
        slider:     "ADBE Slider Control",
        sliderVal:  "ADBE Slider Control-0001",
        checkbox:   "ADBE Checkbox Control",
        checkVal:   "ADBE Checkbox Control-0001",
        camOptions: "ADBE Camera Options Group",
        dof:        "ADBE Camera Depth of Field",
        focusDist:  "ADBE Camera Focus Distance",
        aperture:   "ADBE Camera Aperture",
        blurLevel:  "ADBE Camera Blur Level",
        zoom:       "ADBE Camera Zoom"
    };

    // -----------------------------------------------------------------
    // Small utilities
    // -----------------------------------------------------------------

    var warnings = [];

    function errText(e) {
        if (!e) { return "unknown error"; }
        var msg = e.toString();
        if (e.line) { msg += "  (line " + e.line + ")"; }
        return msg;
    }

    function warn(context, e) {
        warnings.push(context + " - " + errText(e));
    }

    function note(message) {
        warnings.push(message);
    }

    function flushWarnings(title) {
        if (!warnings.length) { return; }
        alert(title + "\n\n- " + warnings.join("\n- "));
        warnings = [];
    }

    function trim(s) {
        return String(s).replace(/^\s+|\s+$/g, "");
    }

    function clamp(v, lo, hi) {
        return v < lo ? lo : (v > hi ? hi : v);
    }

    function toNumber(text, fallback) {
        var v = parseFloat(trim(text));
        return isNaN(v) ? fallback : v;
    }

    function formatNum(v) {
        return String(Math.round(v * 100) / 100);
    }

    // Escape a layer name so it is safe inside a double quoted expression string.
    function esc(s) {
        return String(s).replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
    }

    function defaultDistance(comp) {
        return comp.width * LENS_50MM;
    }

    // -----------------------------------------------------------------
    // Property helpers
    // -----------------------------------------------------------------

    function camOpt(camera, matchName) {
        try {
            var group = camera.property(MN.camOptions);
            return group ? group.property(matchName) : null;
        } catch (e) {
            return null;
        }
    }

    function setValueSafe(prop, value, label) {
        if (!prop) { return false; }
        try {
            if (prop.canSetValue) {
                prop.setValue(value);
                return true;
            }
        } catch (e) {
            warn(label, e);
        }
        return false;
    }

    function setExpressionSafe(prop, expression, label) {
        if (!prop) { return false; }
        try {
            if (prop.canSetExpression) {
                prop.expression = expression;
                return true;
            }
        } catch (e) {
            warn(label, e);
        }
        return false;
    }

    function hasLiveExpression(prop) {
        try {
            return !!prop && prop.expression !== "" && prop.expressionEnabled;
        } catch (e) {
            return false;
        }
    }

    function addSlider(effects, name, value) {
        var ctrl = effects.addProperty(MN.slider);
        ctrl.name = name;
        ctrl.property(MN.sliderVal).setValue(value);
        return ctrl;
    }

    function addCheckbox(effects, name, value) {
        var ctrl = effects.addProperty(MN.checkbox);
        ctrl.name = name;
        ctrl.property(MN.checkVal).setValue(value ? 1 : 0);
        return ctrl;
    }

    function getSelectedCameras(comp) {
        var found = [];
        var selected = comp.selectedLayers;
        for (var i = 0; i < selected.length; i++) {
            if (selected[i] instanceof CameraLayer) {
                found.push(selected[i]);
            }
        }
        return found;
    }

    function deselectAll(comp) {
        for (var i = 1; i <= comp.numLayers; i++) {
            try { comp.layer(i).selected = false; } catch (e) { /* locked layer */ }
        }
    }

    // -----------------------------------------------------------------
    // Naming
    // -----------------------------------------------------------------

    function buildNameSet(comp) {
        var taken = {};
        for (var i = 1; i <= comp.numLayers; i++) {
            // Prefixed so layer names such as "toString" cannot collide with
            // Object.prototype members.
            taken["|" + comp.layer(i).name] = true;
        }
        return taken;
    }

    function decorate(base, controllerType, controllerText) {
        var text = trim(controllerText);
        if (!text) { return base; }
        if (controllerType === "prefix") { return text + "_" + base; }
        if (controllerType === "suffix") { return base + "_" + text; }
        return base;
    }

    // Camera / controller / target names that share one index and collide with
    // nothing already in the comp.
    function getNewRigNames(comp, baseName, controllerType, controllerText) {
        var taken = buildNameSet(comp);
        var parts = trim(baseName).match(/^(.*?)(\d*)$/);
        var stem  = (parts && parts[1]) ? parts[1] : "Cam";
        var num   = (parts && parts[2]) ? parseInt(parts[2], 10) : 1;
        if (!(num >= 1)) { num = 1; }

        for (var guard = 0; guard < 2000; guard++, num++) {
            var names = {
                camera:     stem + num,
                controller: decorate(stem + num, controllerType, controllerText),
                target:     decorate("camTarget" + num, controllerType, controllerText)
            };
            if (!taken["|" + names.camera] &&
                !taken["|" + names.controller] &&
                !taken["|" + names.target]) {
                return names;
            }
        }
        return null;
    }

    // Controller / target names for a camera that already exists. The camera
    // keeps the name it has.
    function getWrapRigNames(comp, cameraName, controllerType, controllerText) {
        var taken = buildNameSet(comp);

        var controller = decorate(cameraName, controllerType, controllerText);
        if (taken["|" + controller] || controller === cameraName) {
            var stem = controller;
            var n = 2;
            while (n < 2000 && (taken["|" + (stem + " " + n)] || (stem + " " + n) === cameraName)) {
                n++;
            }
            controller = stem + " " + n;
        }

        var target = "";
        var num = 1;
        while (num < 2000) {
            target = decorate("camTarget" + num, controllerType, controllerText);
            if (!taken["|" + target] && target !== controller) { break; }
            num++;
        }

        return { camera: cameraName, controller: controller, target: target };
    }

    // -----------------------------------------------------------------
    // Expressions
    // -----------------------------------------------------------------

    function exprControllerValue(effectName, comment) {
        return "// " + comment + " - driven by the controller null.\n" +
               "hasParent ? parent.effect(\"" + esc(effectName) + "\")(1) : value;";
    }

    function exprCameraPosition() {
        return [
            "// Z comes from the controller's Camera Distance slider.",
            "// X and Y read `value`, never `transform.position`, which would",
            "// make this expression reference itself.",
            "var x = value[0];",
            "var y = value[1];",
            "var z = value[2];",
            "",
            "if (hasParent) {",
            "    var c = parent;",
            "    var dist = c.effect(\"Camera Distance\")(1);",
            "",
            "    if (c.effect(\"Dolly Zoom Effect\")(1) > 0) {",
            "        // Hold the subject the same size while the lens changes:",
            "        // distance scales with focal length.",
            "        var ref = c.effect(\"Ref Focal Length\")(1);",
            "        if (ref > 0) { dist = dist * c.effect(\"Focal Length\")(1) / ref; }",
            "    }",
            "",
            "    z = -dist;",
            "}",
            "",
            "[x, y, z];"
        ].join("\n");
    }

    function exprAimAtTarget(targetName) {
        return [
            "// Point of Interest follows the target null. Falls back to the",
            "// property's own value if the target is ever deleted.",
            "var t = null;",
            "try { t = thisComp.layer(\"" + esc(targetName) + "\"); } catch (e) { t = null; }",
            "",
            "var r = value;",
            "if (t) {",
            "    var w = t.toWorld(t.anchorPoint);",
            "    r = hasParent ? parent.fromWorld(w) : w;",
            "}",
            "r;"
        ].join("\n");
    }

    function exprFocusOnTarget(targetName) {
        return [
            "// Focus distance = distance from this camera to the target null.",
            "var t = null;",
            "try { t = thisComp.layer(\"" + esc(targetName) + "\"); } catch (e) { t = null; }",
            "",
            "var r = value;",
            "if (t) { r = length(toWorld([0, 0, 0]), t.toWorld(t.anchorPoint)); }",
            "r;"
        ].join("\n");
    }

    // -----------------------------------------------------------------
    // Rig construction
    // -----------------------------------------------------------------

    function applyDOFSettings(camera, dofEnabled, aperture, blurLevel) {
        if (!(camera instanceof CameraLayer)) { return; }
        if (dofEnabled !== null) {
            setValueSafe(camOpt(camera, MN.dof), dofEnabled, "Depth of Field");
        }
        if (aperture !== null) {
            setValueSafe(camOpt(camera, MN.aperture), aperture, "Aperture");
        }
        if (blurLevel !== null) {
            setValueSafe(camOpt(camera, MN.blurLevel), blurLevel, "Blur Level");
        }
    }

    // Build the controller's effect rig and wire the camera to it. The
    // controller is the single source of truth: nothing is written to the
    // camera directly, so no value can be silently overwritten afterwards.
    function exposeCameraSettings(camera, controller, wiring) {
        var effects = controller.property(MN.effects);

        addCheckbox(effects, "DOF Enabled",      wiring.dofEnabled);
        addSlider(effects,   "Aperture",         wiring.aperture);
        addSlider(effects,   "Blur Level",       wiring.blurLevel);
        addSlider(effects,   "Focal Length",     wiring.focalLength);
        addSlider(effects,   "Ref Focal Length", wiring.focalLength);
        addSlider(effects,   "Camera Distance",  wiring.camDistance);
        addCheckbox(effects, "Dolly Zoom Effect", wiring.dollyZoom);

        setExpressionSafe(camOpt(camera, MN.dof),
            exprControllerValue("DOF Enabled", "Depth of Field"), "DOF expression");
        setExpressionSafe(camOpt(camera, MN.aperture),
            exprControllerValue("Aperture", "Aperture"), "Aperture expression");
        setExpressionSafe(camOpt(camera, MN.blurLevel),
            exprControllerValue("Blur Level", "Blur Level"), "Blur Level expression");
        setExpressionSafe(camOpt(camera, MN.zoom),
            exprControllerValue("Focal Length", "Zoom, in pixels"), "Focal Length expression");
        setExpressionSafe(camera.transform.position,
            exprCameraPosition(), "Camera position expression");
    }

    function createController(comp, name, labelColor) {
        var controller = comp.layers.addNull(comp.duration);
        // Only the layer is renamed. Writing to source.name would rename the
        // null's item in the Project panel as well.
        controller.name = name;
        // 3D before anything is parented to it, so children are computed in 3D.
        controller.threeDLayer = true;
        controller.label = labelColor;
        return controller;
    }

    function addTargetNull(comp, camera, controller, targetName, localPosition, labelColor) {
        var target = comp.layers.addNull(comp.duration);
        target.name = targetName;
        target.threeDLayer = true;
        target.label = labelColor;
        target.parent = controller;
        target.transform.position.setValue(localPosition);

        setExpressionSafe(camera.transform.pointOfInterest,
            exprAimAtTarget(targetName), "Point of Interest expression");
        setExpressionSafe(camOpt(camera, MN.focusDist),
            exprFocusOnTarget(targetName), "Focus Distance expression");

        return target;
    }

    function createRig(comp, names, camDistance, labelColor) {
        var center = [comp.width / 2, comp.height / 2];

        var controller = createController(comp, names.controller, labelColor);
        controller.transform.position.setValue([center[0], center[1], 0]);

        var camera = comp.layers.addCamera(names.camera, center);
        camera.label = labelColor;
        camera.parent = controller;
        camera.transform.position.setValue([0, 0, -camDistance]);
        // Aim at the controller origin. Overridden by the target, if there is one.
        setValueSafe(camera.transform.pointOfInterest, [0, 0, 0], "Point of Interest");

        return { camera: camera, controller: controller };
    }

    // Wrap an existing camera without moving it. Everything stays in the
    // camera's current parent space, so no world space maths is needed and a
    // camera that is already parented keeps working.
    function wrapCamera(comp, camera, names, labelColor) {
        var oldParent = camera.parent;
        var camPos    = camera.transform.position.value;
        var poi       = camera.transform.pointOfInterest.value;

        var controller = createController(comp, names.controller, labelColor);
        controller.parent = oldParent;
        controller.transform.position.setValue([poi[0], poi[1], poi[2]]);

        // AE rewrites the camera's local values on reparent, so it does not move.
        camera.parent = controller;
        camera.label = labelColor;

        // Camera Distance drives local Z, so measure the signed Z gap to
        // reproduce the camera's current position exactly.
        var distance = poi[2] - camPos[2];
        if (Math.abs(distance) < 1) {
            var dx = camPos[0] - poi[0];
            var dy = camPos[1] - poi[1];
            var dz = camPos[2] - poi[2];
            var straightLine = Math.sqrt(dx * dx + dy * dy + dz * dz);
            distance = straightLine >= 1 ? straightLine : defaultDistance(comp);
            note("\"" + camera.name + "\": the camera sits at the same depth as its " +
                 "Point of Interest, so Camera Distance was set to " +
                 formatNum(distance) + " and the camera moved.");
        }

        return { camera: camera, controller: controller, targetLocal: [0, 0, 0],
                 camDistance: distance };
    }

    function readZoom(camera, fallback) {
        var zoom = camOpt(camera, MN.zoom);
        try {
            if (zoom) {
                var v = zoom.value;
                if (typeof v === "number" && v > 0) { return v; }
            }
        } catch (e) { /* fall through */ }
        return fallback > 0 ? fallback : 1000;
    }

    // Say out loud what wrapping is about to replace, rather than doing it silently.
    function noteReplacedWork(camera) {
        var clashes = [];
        var position = camera.transform.position;
        var zoom = camOpt(camera, MN.zoom);

        if (position.numKeys > 0) { clashes.push("Position keyframes (Z is overridden)"); }
        if (hasLiveExpression(position)) { clashes.push("a Position expression"); }
        if (zoom && zoom.numKeys > 0) { clashes.push("Zoom keyframes"); }
        if (hasLiveExpression(zoom)) { clashes.push("a Zoom expression"); }

        if (clashes.length) {
            note("\"" + camera.name + "\" already had " + clashes.join(", ") +
                 ". The rig replaced them - undo if that is not what you wanted.");
        }
    }

    function buildRig(comp, opts, existingCamera) {
        var names, camera, controller, targetLocal, camDistance, focalLength;
        var wasLocked = false;

        if (existingCamera) {
            wasLocked = existingCamera.locked;
            if (wasLocked) { existingCamera.locked = false; }

            names = getWrapRigNames(comp, existingCamera.name,
                                    opts.controllerType, opts.controllerText);
            if (opts.expose) { noteReplacedWork(existingCamera); }

            focalLength = readZoom(existingCamera, opts.focalLength);

            var wrapped = wrapCamera(comp, existingCamera, names, opts.labelColor);
            camera      = wrapped.camera;
            controller  = wrapped.controller;
            targetLocal = wrapped.targetLocal;
            camDistance = wrapped.camDistance;
        } else {
            names = getNewRigNames(comp, opts.cameraName,
                                   opts.controllerType, opts.controllerText);
            if (!names) {
                throw new Error("Could not build a unique set of layer names. " +
                                "Rename a few layers and try again.");
            }
            camDistance = opts.camDistance > 0 ? opts.camDistance : defaultDistance(comp);
            focalLength = opts.focalLength > 0 ? opts.focalLength : defaultDistance(comp);

            var created = createRig(comp, names, camDistance, opts.labelColor);
            camera      = created.camera;
            controller  = created.controller;
            targetLocal = [0, 0, opts.targetDistance];
        }

        var wiring = {
            dofEnabled:  opts.dofEnabled,
            aperture:    opts.aperture,
            blurLevel:   opts.blurLevel,
            focalLength: focalLength,
            camDistance: camDistance,
            dollyZoom:   opts.dollyZoom
        };

        if (opts.expose) {
            exposeCameraSettings(camera, controller, wiring);
        } else {
            applyDOFSettings(camera, wiring.dofEnabled, wiring.aperture, wiring.blurLevel);
            setValueSafe(camOpt(camera, MN.zoom), wiring.focalLength, "Zoom");
        }

        var target = null;
        if (opts.addTarget) {
            target = addTargetNull(comp, camera, controller, names.target,
                                   targetLocal, opts.labelColor);

            if (camera.autoOrient !== AutoOrientType.CAMERA_OR_POINT_OF_INTEREST) {
                note("\"" + camera.name + "\": Auto-Orient is off, so the target only " +
                     "drives focus distance. Set Layer > Transform > Auto-Orient to " +
                     "\"Orient Towards Point of Interest\" to aim the camera at it.");
            }
        }

        // Tidy stack: camera, then controller, then target.
        try {
            controller.moveAfter(camera);
            if (target) { target.moveAfter(controller); }
        } catch (e) {
            warn("Layer order", e);
        }

        return { camera: camera, controller: controller, target: target,
                 wasLocked: wasLocked };
    }

    function applyDOFToSelectedCameras(dofEnabled, aperture, blurLevel) {
        var comp = app.project ? app.project.activeItem : null;
        if (!(comp instanceof CompItem)) {
            alert("Open a composition first.");
            return;
        }

        var cameras = getSelectedCameras(comp);
        if (!cameras.length) {
            alert("Select one or more camera layers first.");
            return;
        }

        app.beginUndoGroup("Apply DOF to Selected Cameras");
        try {
            for (var i = 0; i < cameras.length; i++) {
                if (hasLiveExpression(camOpt(cameras[i], MN.aperture))) {
                    note("\"" + cameras[i].name + "\" is rigged - change these values " +
                         "on its controller instead.");
                    continue;
                }
                applyDOFSettings(cameras[i], dofEnabled, aperture, blurLevel);
            }
        } catch (e) {
            warn("Apply DOF", e);
        } finally {
            app.endUndoGroup();
        }

        flushWarnings("Depth of field");
    }

    // -----------------------------------------------------------------
    // Saved settings
    // -----------------------------------------------------------------

    function getSetting(key, fallback) {
        try {
            if (app.settings.haveSetting(SETTINGS_SECTION, key)) {
                return app.settings.getSetting(SETTINGS_SECTION, key);
            }
        } catch (e) { /* fall through */ }
        return fallback;
    }

    function setSetting(key, value) {
        try {
            app.settings.saveSetting(SETTINGS_SECTION, key, String(value));
        } catch (e) { /* preferences are optional */ }
    }

    function getNum(key, fallback) {
        return toNumber(getSetting(key, ""), fallback);
    }

    function getBool(key, fallback) {
        var v = getSetting(key, null);
        if (v === null) { return fallback; }
        return v === "true" || v === "1";
    }

    function loadOptions() {
        return {
            cameraName:     getSetting("cameraName", DEFAULTS.cameraName),
            controllerType: getSetting("controllerType", DEFAULTS.controllerType),
            controllerText: getSetting("controllerText", DEFAULTS.controllerText),
            camDistance:    getNum("camDistance", DEFAULTS.camDistance),
            focalLength:    getNum("focalLength", DEFAULTS.focalLength),
            addTarget:      getBool("addTarget", DEFAULTS.addTarget),
            targetDistance: getNum("targetDistance", DEFAULTS.targetDistance),
            dofEnabled:     getBool("dofEnabled", DEFAULTS.dofEnabled),
            aperture:       getNum("aperture", DEFAULTS.aperture),
            blurLevel:      getNum("blurLevel", DEFAULTS.blurLevel),
            dollyZoom:      getBool("dollyZoom", DEFAULTS.dollyZoom),
            expose:         getBool("expose", DEFAULTS.expose),
            labelColor:     getNum("labelColor", DEFAULTS.labelColor),
            lockCamera:     getBool("lockCamera", DEFAULTS.lockCamera)
        };
    }

    function saveOptions(opts) {
        for (var key in opts) {
            if (key === "mode") { continue; }
            setSetting(key, opts[key]);
        }
    }

    // -----------------------------------------------------------------
    // Dialog
    // -----------------------------------------------------------------

    function addNumberRow(parent, label, value, min, max, labelWidth) {
        var group = parent.add("group");
        group.orientation = "row";
        group.alignChildren = ["left", "center"];
        group.spacing = 8;

        var caption = group.add("statictext", undefined, label);
        caption.preferredSize.width = labelWidth;

        var input = group.add("edittext", undefined, formatNum(value));
        input.characters = 7;

        var slider = group.add("slider", undefined, clamp(value, min, max), min, max);
        slider.preferredSize.width = 150;

        input.onChange = function () {
            var v = toNumber(input.text, value);
            input.text = formatNum(v);
            slider.value = clamp(v, min, max);
        };

        slider.onChanging = function () {
            input.text = formatNum(Math.round(slider.value));
        };

        return {
            group: group,
            value: function () { return toNumber(input.text, value); },
            set: function (v) {
                input.text = formatNum(v);
                slider.value = clamp(v, min, max);
            },
            enable: function (state) {
                caption.enabled = state;
                input.enabled = state;
                slider.enabled = state;
            }
        };
    }

    function buildDialog(comp, selectedCameras, opts) {
        var LABEL_W = 108;
        var chosen = null;

        var win = new Window("dialog", "Camera Rig");
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.margins = 16;
        win.spacing = 10;

        // --- Mode -----------------------------------------------------
        var modeGroup = win.add("group");
        modeGroup.orientation = "row";
        modeGroup.alignChildren = ["left", "center"];
        modeGroup.spacing = 12;

        var modeCaption = modeGroup.add("statictext", undefined, "Mode:");
        modeCaption.preferredSize.width = LABEL_W - 12;

        var createRadio = modeGroup.add("radiobutton", undefined, "Create new camera");
        var wrapLabel = selectedCameras.length === 1
            ? "Wrap selected camera"
            : "Wrap " + selectedCameras.length + " selected cameras";
        var wrapRadio = modeGroup.add("radiobutton", undefined, wrapLabel);

        wrapRadio.enabled = selectedCameras.length > 0;
        if (wrapRadio.enabled) { wrapRadio.value = true; } else { createRadio.value = true; }

        var hint = win.add("statictext", undefined, "", { multiline: true });
        hint.preferredSize = [430, 28];

        // --- Camera ---------------------------------------------------
        var camPanel = win.add("panel", undefined, "Camera");
        camPanel.orientation = "column";
        camPanel.alignChildren = ["fill", "top"];
        camPanel.margins = [14, 16, 14, 14];
        camPanel.spacing = 8;

        var nameGroup = camPanel.add("group");
        nameGroup.orientation = "row";
        nameGroup.alignChildren = ["left", "center"];
        nameGroup.spacing = 8;
        var nameCaption = nameGroup.add("statictext", undefined, "Camera name:");
        nameCaption.preferredSize.width = LABEL_W;
        var nameInput = nameGroup.add("edittext", undefined, opts.cameraName);
        nameInput.characters = 18;

        var distRow = addNumberRow(camPanel, "Camera distance:",
            opts.camDistance > 0 ? opts.camDistance : defaultDistance(comp),
            0, 10000, LABEL_W);
        var focalRow = addNumberRow(camPanel, "Focal length:",
            opts.focalLength > 0 ? opts.focalLength : defaultDistance(comp),
            10, 10000, LABEL_W);

        var ctrlGroup = camPanel.add("group");
        ctrlGroup.orientation = "row";
        ctrlGroup.alignChildren = ["left", "center"];
        ctrlGroup.spacing = 8;
        var ctrlCaption = ctrlGroup.add("statictext", undefined, "Controller name:");
        ctrlCaption.preferredSize.width = LABEL_W;
        var prefixRadio = ctrlGroup.add("radiobutton", undefined, "Prefix");
        var suffixRadio = ctrlGroup.add("radiobutton", undefined, "Suffix");
        prefixRadio.value = opts.controllerType !== "suffix";
        suffixRadio.value = !prefixRadio.value;
        var ctrlInput = ctrlGroup.add("edittext", undefined, opts.controllerText);
        ctrlInput.characters = 8;

        var exposeCheck = camPanel.add("checkbox", undefined,
            "Expose camera settings as controls on the controller");
        exposeCheck.value = opts.expose;

        var dollyCheck = camPanel.add("checkbox", undefined,
            "Enable dolly zoom (distance follows focal length)");
        dollyCheck.value = opts.dollyZoom;

        // --- Target ---------------------------------------------------
        var targetPanel = win.add("panel", undefined, "Target");
        targetPanel.orientation = "column";
        targetPanel.alignChildren = ["fill", "top"];
        targetPanel.margins = [14, 16, 14, 14];
        targetPanel.spacing = 8;

        var targetCheck = targetPanel.add("checkbox", undefined,
            "Add a target null for the camera to aim at and focus on");
        targetCheck.value = opts.addTarget;

        var targetDistRow = addNumberRow(targetPanel, "Target distance:",
            opts.targetDistance, 0, 10000, LABEL_W);

        // --- Depth of field -------------------------------------------
        var dofPanel = win.add("panel", undefined, "Depth of Field");
        dofPanel.orientation = "column";
        dofPanel.alignChildren = ["fill", "top"];
        dofPanel.margins = [14, 16, 14, 14];
        dofPanel.spacing = 8;

        var dofCheck = dofPanel.add("checkbox", undefined, "Enable depth of field");
        dofCheck.value = opts.dofEnabled;

        var apertureRow = addNumberRow(dofPanel, "Aperture:", opts.aperture, 0, 2000, LABEL_W);
        var blurRow     = addNumberRow(dofPanel, "Blur level:", opts.blurLevel, 0, 1000, LABEL_W);

        var applyGroup = dofPanel.add("group");
        applyGroup.orientation = "row";
        applyGroup.alignment = ["right", "top"];
        var applyButton = applyGroup.add("button", undefined, "Apply to selected cameras");

        applyButton.onClick = function () {
            applyDOFToSelectedCameras(dofCheck.value, apertureRow.value(), blurRow.value());
        };

        // --- Rig layers -----------------------------------------------
        var rigPanel = win.add("panel", undefined, "Rig Layers");
        rigPanel.orientation = "row";
        rigPanel.alignChildren = ["left", "center"];
        rigPanel.margins = [14, 16, 14, 14];
        rigPanel.spacing = 8;

        var labelCaption = rigPanel.add("statictext", undefined, "Label colour:");
        labelCaption.preferredSize.width = LABEL_W;
        var labelList = rigPanel.add("dropdownlist", undefined, LABEL_NAMES);
        labelList.selection = clamp(Math.round(opts.labelColor), 0, LABEL_NAMES.length - 1);

        var lockCheck = rigPanel.add("checkbox", undefined, "Lock and shy the camera");
        lockCheck.value = opts.lockCamera;

        // --- Buttons ---------------------------------------------------
        var buttonGroup = win.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignment = ["right", "top"];
        buttonGroup.spacing = 8;
        buttonGroup.margins.top = 6;

        // Deliberately not named "ok": a button with that name closes the dialog
        // whatever its handler does, which would defeat validation. defaultElement
        // keeps the Enter key working.
        var createButton = buttonGroup.add("button", undefined, "Create Rig");
        var cancelButton = buttonGroup.add("button", undefined, "Cancel", { name: "cancel" });
        win.defaultElement = createButton;
        win.cancelElement = cancelButton;

        // --- Wiring ----------------------------------------------------
        function syncMode() {
            var wrap = wrapRadio.value;

            nameCaption.enabled = !wrap;
            nameInput.enabled = !wrap;
            distRow.enable(!wrap);
            focalRow.enable(!wrap);
            targetDistRow.enable(!wrap && targetCheck.value);

            var dofLive = exposeCheck.value || !wrap;
            apertureRow.enable(dofLive);
            blurRow.enable(dofLive);

            dollyCheck.enabled = exposeCheck.value;

            createButton.text = wrap
                ? (selectedCameras.length > 1 ? "Wrap Cameras" : "Wrap Camera")
                : "Create Rig";

            hint.text = wrap
                ? "A controller and target are built around each selected camera. " +
                  "Position, aim and lens are preserved."
                : "A new camera, controller and target are created at the centre of the comp.";
        }

        createRadio.onClick = syncMode;
        wrapRadio.onClick = syncMode;
        targetCheck.onClick = syncMode;
        exposeCheck.onClick = syncMode;
        syncMode();

        function collect() {
            var problems = [];

            var cameraName = trim(nameInput.text) || DEFAULTS.cameraName;
            var camDistance = distRow.value();
            var focalLength = focalRow.value();
            var targetDistance = targetDistRow.value();
            var aperture = apertureRow.value();
            var blurLevel = blurRow.value();

            if (createRadio.value) {
                if (!(camDistance > 0)) { problems.push("Camera distance must be greater than 0."); }
                if (!(focalLength > 0)) { problems.push("Focal length must be greater than 0."); }
            }
            if (!(aperture > 0)) { problems.push("Aperture must be greater than 0."); }
            if (!(blurLevel >= 0)) { problems.push("Blur level cannot be negative."); }
            if (isNaN(targetDistance)) { problems.push("Target distance must be a number."); }

            if (problems.length) {
                alert("Check these values before building the rig:\n\n- " +
                      problems.join("\n- "));
                return null;
            }

            return {
                mode:           wrapRadio.value ? "wrap" : "create",
                cameraName:     cameraName,
                controllerType: prefixRadio.value ? "prefix" : "suffix",
                controllerText: trim(ctrlInput.text),
                camDistance:    camDistance,
                focalLength:    focalLength,
                addTarget:      targetCheck.value,
                targetDistance: targetDistance,
                dofEnabled:     dofCheck.value,
                aperture:       aperture,
                blurLevel:      blurLevel,
                dollyZoom:      dollyCheck.value,
                expose:         exposeCheck.value,
                labelColor:     labelList.selection ? labelList.selection.index : 0,
                lockCamera:     lockCheck.value
            };
        }

        createButton.onClick = function () {
            var settings = collect();
            if (!settings) { return; }
            chosen = settings;
            win.close(1);
        };

        win.layout.layout(true);
        win.center();
        win.show();

        return chosen;
    }

    // -----------------------------------------------------------------
    // Entry point
    // -----------------------------------------------------------------

    var comp = app.project ? app.project.activeItem : null;
    if (!(comp instanceof CompItem)) {
        alert("Open a composition first.");
        return;
    }

    var selectedCameras = getSelectedCameras(comp);
    var options = loadOptions();

    var keys = ScriptUI.environment.keyboardState;
    if (keys.altKey || keys.shiftKey) {
        var chosen = buildDialog(comp, selectedCameras, options);
        if (!chosen) { return; }   // cancelled
        saveOptions(chosen);
        options = chosen;
    } else {
        options.mode = selectedCameras.length ? "wrap" : "create";
    }

    var cameras = (options.mode === "wrap" && selectedCameras.length)
        ? selectedCameras
        : [null];

    app.beginUndoGroup(cameras[0] ? "Wrap Camera in Rig" : "Add Camera Rig");
    var built = [];
    try {
        for (var i = 0; i < cameras.length; i++) {
            built.push(buildRig(comp, options, cameras[i]));
        }

        // Selection and locking come last: a locked layer cannot be changed,
        // and creating a layer clears the selection.
        deselectAll(comp);
        for (i = 0; i < built.length; i++) {
            var rig = built[i];
            try {
                rig.controller.selected = true;
                if (rig.target) { rig.target.selected = true; }
            } catch (e) {
                warn("Selection", e);
            }

            try {
                if (options.lockCamera) {
                    rig.camera.shy = true;
                    rig.camera.locked = true;
                } else {
                    rig.camera.locked = rig.wasLocked;
                    if (!rig.wasLocked) { rig.camera.selected = true; }
                }
            } catch (e) {
                warn("Lock camera", e);
            }
        }
    } catch (e) {
        alert("Camera rig failed: " + errText(e) + "\n\nUndo to roll back any partial work.");
    } finally {
        app.endUndoGroup();
    }

    flushWarnings("Camera rig - please read");
})();
