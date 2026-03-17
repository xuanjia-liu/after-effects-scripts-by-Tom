// Batch adjust fill/stroke colors on selected shape layers (solids & gradients)
// Modes:
//  - Solid: change identical colors, adjust hue, adjust brightness
//  - Gradient: change identical color stops, change identical opacity stops,
//              adjust hue (all stops), adjust brightness (all stops)
(function () {
    // -------- Helpers --------
    function clamp(v, min, max) {
        return Math.min(max, Math.max(min, v));
    }

    function rgbToHsl(c) {
        var r = c[0], g = c[1], b = c[2];
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, l = (max + min) / 2;
        if (max === min) {
            h = s = 0;
        } else {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                default:
                    h = (r - g) / d + 4;
            }
            h /= 6;
        }
        return [h, s, l];
    }

    function hslToRgb(h, s, l) {
        function hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        }

        var r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        return [r, g, b];
    }

    function adjustHue(color, degrees) {
        var hsl = rgbToHsl(color);
        var delta = degrees / 360;
        var newH = (hsl[0] + delta) % 1;
        if (newH < 0) newH += 1;
        return hslToRgb(newH, hsl[1], hsl[2]);
    }

    function adjustBrightness(color, percent) {
        var hsl = rgbToHsl(color);
        var newL = clamp(hsl[2] + percent / 100, 0, 1);
        return hslToRgb(hsl[0], hsl[1], newL);
    }

    function colorKey(c) {
        return (
            c[0].toFixed(4) +
            "|" +
            c[1].toFixed(4) +
            "|" +
            c[2].toFixed(4)
        );
    }

    function opacityKey(v) {
        return v.toFixed(2);
    }

    function rgbToInt(rgb) {
        return (
            (Math.round(clamp(rgb[0], 0, 1) * 255) << 16) |
            (Math.round(clamp(rgb[1], 0, 1) * 255) << 8) |
            Math.round(clamp(rgb[2], 0, 1) * 255)
        );
    }

    function intToRgb(v) {
        return [
            ((v >> 16) & 255) / 255,
            ((v >> 8) & 255) / 255,
            (v & 255) / 255,
        ];
    }

    function pickColor(initial) {
        var initInt = rgbToInt(initial);
        var result = $.colorPicker(initInt);
        if (result === -1) return null; // cancelled
        return intToRgb(result);
    }

    function promptNumber(message, defVal) {
        var input = prompt(message, defVal);
        if (input === null) return null;
        var num = parseFloat(input);
        if (isNaN(num)) return null;
        return num;
    }

    function collectPropertiesFromLayer(layer, buckets) {
        var contents = layer.property("ADBE Root Vectors Group");
        if (!contents) return;
        collectFromGroup(contents, buckets);
    }

    function collectFromGroup(group, buckets) {
        if (!group || typeof group.numProperties !== "number") return;
        for (var i = 1; i <= group.numProperties; i++) {
            var p = group.property(i);
            if (!p) continue;
            var pType = p.propertyType;
            if (
                pType === PropertyType.INDEXED_GROUP ||
                pType === PropertyType.NAMED_GROUP
            ) {
                collectFromGroup(p, buckets);
            } else if (pType === PropertyType.PROPERTY) {
                var mn = p.matchName;
                if (mn === "ADBE Vector Fill Color" || mn === "ADBE Vector Stroke Color") {
                    buckets.solidColors.push(p);
                } else if (mn === "ADBE Vector Grad Colors") {
                    buckets.gradientColors.push(p);
                } else if (mn === "ADBE Vector Grad Opacity") {
                    buckets.gradientOpacities.push(p);
                }
            }
        }
    }

    // -------- Operations --------
    function changeIdenticalSolidColors(props) {
        var map = {};
        for (var i = 0; i < props.length; i++) {
            var val = props[i].value;
            if (!val || val.length < 3) continue;
            var c = [val[0], val[1], val[2]];
            var key = colorKey(c);
            if (!map[key]) {
                map[key] = { color: c, props: [] };
            }
            map[key].props.push(props[i]);
        }

        var keys = [];
        for (var k in map) keys.push(k);
        if (keys.length === 0) return 0;

        var changed = 0;
        for (var j = 0; j < keys.length; j++) {
            var entry = map[keys[j]];
            var newColor = pickColor(entry.color);
            if (!newColor) continue;
            for (var pi = 0; pi < entry.props.length; pi++) {
                try {
                    entry.props[pi].setValue(newColor);
                    changed++;
                } catch (e) {}
            }
        }
        return changed;
    }

    function adjustSolidColors(props, mode, amount) {
        var changed = 0;
        for (var i = 0; i < props.length; i++) {
            try {
                var val = props[i].value;
                if (!val || val.length < 3) continue;
                var c = [val[0], val[1], val[2]];
                var nc =
                    mode === "hue"
                        ? adjustHue(c, amount)
                        : adjustBrightness(c, amount);
                props[i].setValue(nc);
                changed++;
            } catch (e) {}
        }
        return changed;
    }

    function changeIdenticalGradientColors(props) {
        var map = {};
        for (var i = 0; i < props.length; i++) {
            var arr = props[i].value;
            if (!arr || arr.length < 4) continue;
            for (var j = 0; j < arr.length; j += 4) {
                var c = [arr[j + 1], arr[j + 2], arr[j + 3]];
                var key = colorKey(c);
                if (!map[key]) {
                    map[key] = { color: c, refs: [] };
                }
                map[key].refs.push({ prop: props[i], index: j });
            }
        }

        var keys = [];
        for (var k in map) keys.push(k);
        if (keys.length === 0) return 0;

        var changed = 0;
        for (var ki = 0; ki < keys.length; ki++) {
            var entry = map[keys[ki]];
            var newColor = pickColor(entry.color);
            if (!newColor) continue;
            for (var r = 0; r < entry.refs.length; r++) {
                var ref = entry.refs[r];
                try {
                    var arr = ref.prop.value.slice();
                    arr[ref.index + 1] = newColor[0];
                    arr[ref.index + 2] = newColor[1];
                    arr[ref.index + 3] = newColor[2];
                    ref.prop.setValue(arr);
                    changed++;
                } catch (e) {}
            }
        }
        return changed;
    }

    function changeIdenticalGradientOpacities(props) {
        var map = {};
        for (var i = 0; i < props.length; i++) {
            var arr = props[i].value;
            if (!arr || arr.length < 2) continue;
            for (var j = 0; j < arr.length; j += 2) {
                var op = arr[j + 1];
                var key = opacityKey(op);
                if (!map[key]) {
                    map[key] = { opacity: op, refs: [] };
                }
                map[key].refs.push({ prop: props[i], index: j });
            }
        }

        var keys = [];
        for (var k in map) keys.push(k);
        if (keys.length === 0) return 0;

        var changed = 0;
        for (var ki = 0; ki < keys.length; ki++) {
            var entry = map[keys[ki]];
            var newVal = promptNumber(
                "New opacity for stops at " + entry.opacity.toFixed(1) + "% (0-100)",
                entry.opacity.toFixed(1)
            );
            if (newVal === null) continue;
            newVal = clamp(newVal, 0, 100);
            for (var r = 0; r < entry.refs.length; r++) {
                var ref = entry.refs[r];
                try {
                    var arr = ref.prop.value.slice();
                    arr[ref.index + 1] = newVal;
                    ref.prop.setValue(arr);
                    changed++;
                } catch (e) {}
            }
        }
        return changed;
    }

    function adjustGradientColors(props, mode, amount) {
        var changed = 0;
        for (var i = 0; i < props.length; i++) {
            var arr = props[i].value;
            if (!arr || arr.length < 4) continue;
            var newArr = arr.slice();
            var touched = false;
            for (var j = 0; j < newArr.length; j += 4) {
                var c = [newArr[j + 1], newArr[j + 2], newArr[j + 3]];
                var nc =
                    mode === "hue"
                        ? adjustHue(c, amount)
                        : adjustBrightness(c, amount);
                newArr[j + 1] = nc[0];
                newArr[j + 2] = nc[1];
                newArr[j + 3] = nc[2];
                touched = true;
            }
            if (touched) {
                try {
                    props[i].setValue(newArr);
                    changed++;
                } catch (e) {}
            }
        }
        return changed;
    }

    // -------- UI --------
    var win = new Window("dialog", "Batch Color/Gradient Adjust");
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.margins = 12;

    var modeList = [
        "Solid: Change identical colors",
        "Solid: Adjust hue (deg)",
        "Solid: Adjust brightness (%)",
        "Gradient: Change identical color stops",
        "Gradient: Change identical opacity stops",
        "Gradient: Adjust hue (deg)",
        "Gradient: Adjust brightness (%)",
    ];

    var modeDropdown = win.add("dropdownlist", undefined, modeList);
    modeDropdown.selection = 0;

    var inputStack = win.add("group");
    inputStack.orientation = "stack";
    inputStack.alignChildren = ["fill", "top"];

    // Color picker panel (used for change-identical modes)
    var colorPanel = inputStack.add("panel", undefined, "Pick replacement color");
    colorPanel.orientation = "column";
    colorPanel.alignChildren = ["fill", "top"];
    colorPanel.margins = 10;
    var colorPreview = colorPanel.add("statictext", undefined, "Uses color picker per unique color/stop");
    colorPreview.alignment = "fill";

    // Slider panel for hue / brightness
    var sliderPanel = inputStack.add("panel", undefined, "Adjust amount");
    sliderPanel.orientation = "column";
    sliderPanel.alignChildren = ["fill", "top"];
    sliderPanel.margins = 10;
    var sliderLabel = sliderPanel.add("statictext", undefined, "Value");
    var slider = sliderPanel.add("slider", undefined, 20, -180, 180);
    slider.preferredSize = [220, -1];
    var sliderValue = sliderPanel.add("edittext", undefined, "20");
    sliderValue.characters = 8;

    slider.onChanging = function () {
        sliderValue.text = slider.value.toFixed(0);
    };
    sliderValue.onChange = function () {
        var v = parseFloat(sliderValue.text);
        if (isNaN(v)) v = 0;
        v = clamp(v, slider.minvalue, slider.maxvalue);
        slider.value = v;
        sliderValue.text = v.toFixed(0);
    };

    function setModeUI(idx) {
        if (idx === 0 || idx === 3 || idx === 4) {
            colorPanel.visible = true;
            sliderPanel.visible = false;
        } else {
            colorPanel.visible = false;
            sliderPanel.visible = true;
            if (idx === 1 || idx === 5) {
                slider.minvalue = -180;
                slider.maxvalue = 180;
                sliderLabel.text = "Hue (degrees)";
            } else {
                slider.minvalue = -100;
                slider.maxvalue = 100;
                sliderLabel.text = "Brightness (%)";
            }
            slider.value = 20;
            sliderValue.text = "20";
        }
    }
    setModeUI(modeDropdown.selection.index);
    modeDropdown.onChange = function () {
        setModeUI(modeDropdown.selection.index);
    };

    var btns = win.add("group");
    btns.alignment = "right";
    var okBtn = btns.add("button", undefined, "Run", { name: "ok" });
    btns.add("button", undefined, "Cancel", { name: "cancel" });

    if (win.show() !== 1) {
        return;
    }

    var modeIndex = modeDropdown.selection ? modeDropdown.selection.index : 0;
    var amount = sliderPanel.visible ? parseFloat(sliderValue.text) : 0;
    if (isNaN(amount)) amount = 0;

    var comp = app.project && app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) {
        alert("Open a composition and select shape layers.");
        return;
    }

    var layers = comp.selectedLayers;
    if (!layers || layers.length === 0) {
        alert("Select one or more shape layers.");
        return;
    }

    var buckets = {
        solidColors: [],
        gradientColors: [],
        gradientOpacities: [],
    };

    for (var li = 0; li < layers.length; li++) {
        if (layers[li] instanceof ShapeLayer) {
            collectPropertiesFromLayer(layers[li], buckets);
        }
    }

    var modeNeeds = [
        "solid",
        "solid",
        "solid",
        "gradColor",
        "gradOpacity",
        "gradColor",
        "gradColor",
    ];

    var need = modeNeeds[modeIndex] || "solid";
    if (need === "solid" && buckets.solidColors.length === 0) {
        alert("No solid fills/strokes found in the selection.");
        return;
    }
    if (need === "gradColor" && buckets.gradientColors.length === 0) {
        alert("No gradient fills/strokes found in the selection.");
        return;
    }
    if (need === "gradOpacity" && buckets.gradientOpacities.length === 0) {
        alert("No gradient opacity stops found in the selection.");
        return;
    }

    app.beginUndoGroup("Batch Adjust Colors");
    var updated = 0;

    switch (modeIndex) {
        case 0:
            updated = changeIdenticalSolidColors(buckets.solidColors);
            break;
        case 1:
            updated = adjustSolidColors(buckets.solidColors, "hue", amount);
            break;
        case 2:
            updated = adjustSolidColors(buckets.solidColors, "brightness", amount);
            break;
        case 3:
            updated = changeIdenticalGradientColors(buckets.gradientColors);
            break;
        case 4:
            updated = changeIdenticalGradientOpacities(buckets.gradientOpacities);
            break;
        case 5:
            updated = adjustGradientColors(buckets.gradientColors, "hue", amount);
            break;
        case 6:
            updated = adjustGradientColors(
                buckets.gradientColors,
                "brightness",
                amount
            );
            break;
    }

    app.endUndoGroup();
    alert("Updated " + updated + " properties.");
})();
