/*
Neko_Kakera – UI Panel
created by : nekodanharuno
version 1.0
*/

(function Neko_Kakera(thisObj) {
    var ORIG_TAG = "NEKO_ORIG:";

    // Utilities
    function clampOrder(minVal, maxVal, defMin, defMax) {
        var a = parseFloat(minVal), b = parseFloat(maxVal);
        if (isNaN(a)) a = defMin;
        if (isNaN(b)) b = defMax;
        if (a > b) { var t = a; a = b; b = t; }
        return [a, b];
    }
    function parsePositiveInt(v, d) {
        var n = Math.floor(parseFloat(v));
        if (isNaN(n) || n <= 0) return d;
        return n;
    }
    function randInRange(min, max) { return min + Math.random() * (max - min); }
    function getTransform(layer) { return layer.property("ADBE Transform Group"); }
    function hasProp(obj, name) { try { return (obj && (name in obj)); } catch(e){ return false; } }
    function removeAllKeys(prop) {
        try { if (!prop || prop.numKeys === undefined) return;
            for (var i = prop.numKeys; i >= 1; i--) prop.removeKey(i);
        } catch (e) {}
    }
    function getRotProperty(t, is3D) {
        return is3D ? t.property("ADBE Rotate Z")
                    : (t.property("ADBE Rotation") || t.property("ADBE Rotate Z"));
    }
    function shuffleArray(arr) { // Fisher–Yates
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
        }
        return arr;
    }

    // Separate toggle
    function getSeparated(posProp) {
        try {
            if (hasProp(posProp, "dimensionsSeparated")) return posProp.dimensionsSeparated;
            if (hasProp(posProp, "separateDimensions"))   return posProp.separateDimensions;
        } catch (e) {}
        return null;
    }
    function setSeparated(posProp, flag) {
        if (!posProp) return false;
        try {
            if (hasProp(posProp, "separateDimensions")) {
                if (posProp.separateDimensions !== flag) posProp.separateDimensions = flag;
                return true;
            }
            if (hasProp(posProp, "dimensionsSeparated")) {
                if (posProp.dimensionsSeparated !== flag) posProp.dimensionsSeparated = flag;
                return true;
            }
        } catch (e) {}
        try {
            if (flag && typeof posProp.separateDimensions === "function") {
                posProp.separateDimensions();
                return true;
            }
        } catch (e) {}
        return false;
    }

    // Baseline via Slider Control Expression
    function getEffects(L){ return L.property("ADBE Effect Parade"); }
    function findBaselineEffect(L) {
        var fx = getEffects(L);
        if (!fx) return null;
        for (var i = 1; i <= fx.numProperties; i++) {
            var ef = fx.property(i);
            if (!ef) continue;
            try {
                if (ef.matchName === "ADBE Slider Control" && ef.name === "Neko Baseline") return ef;
            } catch (e) {}
        }
        return null;
    }
    function getBaselineSlider(ef) {
        if (!ef) return null;
        return ef.property("ADBE Slider Control-0001") || ef.property(1);
    }
    function loadBaseline(L) {
        var ef = findBaselineEffect(L);
        if (!ef) return null;
        var sl = getBaselineSlider(ef);
        if (!sl || !sl.canSetExpression) return null;
        var expr = "";
        try { expr = sl.expression || ""; } catch (e) { expr = ""; }
        var idx = expr.indexOf(ORIG_TAG);
        if (idx < 0) return null;
        var start = idx + ORIG_TAG.length;
        var end = expr.indexOf("*/", start);
        if (end < 0) end = expr.length;
        var body = expr.substring(start, end);
        try { return eval(body); } catch (e) { return null; }
    }
    function saveBaseline(L, data) {
        var fx = getEffects(L);
        if (!fx) return;
        var ef = findBaselineEffect(L);
        if (!ef) {
            try { ef = fx.addProperty("ADBE Slider Control"); ef.name = "Neko Baseline"; } catch(e){ return; }
        }
        var sl = getBaselineSlider(ef);
        if (!sl) return;
        try { sl.setValue(0); } catch(e){}
        var blob = "/*" + ORIG_TAG + data.toSource() + "*/\n0;";
        try { sl.expression = blob; sl.expressionEnabled = true; } catch (e) {}
    }
    function ensureBaseline(L) {
        if (loadBaseline(L)) return;
        var t = getTransform(L);
        if (!t) return;
        var pos = t.property("ADBE Position");
        var sc  = t.property("ADBE Scale");
        var sep = false; try { sep = pos ? pos.dimensionsSeparated : false; } catch(e){}

        var rot2D = t.property("ADBE Rotation");
        var rx = t.property("ADBE Rotate X");
        var ry = t.property("ADBE Rotate Y");
        var rz = t.property("ADBE Rotate Z");

        var base = {
            threeD: !!L.threeDLayer,
            sep: !!sep,
            pos: pos ? (function(v){ return [v[0], v[1], (v.length>2 ? v[2] : null)]; })(pos.value) : null,
            rotMatch: rot2D ? "ADBE Rotation" : "ADBE Rotate Z",
            rotVal: rot2D ? rot2D.value : (rz ? rz.value : null),
            rot3D: (L.threeDLayer ? [ rx ? rx.value : 0, ry ? ry.value : 0, rz ? rz.value : 0 ] : null),
            scale: sc ? (function(v){ return [v[0], v[1], (v.length>2 ? v[2] : null)]; })(sc.value) : null
        };
        saveBaseline(L, base);
    }

    // Actions
    function revertToOriginal() {
        var proj = app.project;
        if (!proj || !proj.activeItem || !(proj.activeItem instanceof CompItem)) { alert("Open a composition and select at least one layer."); return; }
        var comp = proj.activeItem, sel = comp.selectedLayers;
        if (!sel || sel.length === 0) { alert("Select at least one layer."); return; }

        app.beginUndoGroup("Neko_Kakera: Revert to Original");

        for (var i = 0; i < sel.length; i++) {
            var L = sel[i];
            if (L.locked) continue;
            var t = getTransform(L); if (!t) continue;

            var pos = t.property("ADBE Position");
            if (pos) removeAllKeys(pos);
            var px = t.property("ADBE Position_0");
            var py = t.property("ADBE Position_1");
            var pz = t.property("ADBE Position_2");
            if (px) removeAllKeys(px);
            if (py) removeAllKeys(py);
            if (pz) removeAllKeys(pz);

            var rx = t.property("ADBE Rotate X");
            var ry = t.property("ADBE Rotate Y");
            var rz = t.property("ADBE Rotate Z");
            var r2 = t.property("ADBE Rotation");
            if (rx) removeAllKeys(rx);
            if (ry) removeAllKeys(ry);
            if (rz) removeAllKeys(rz);
            if (r2) removeAllKeys(r2);

            var sc = t.property("ADBE Scale");
            if (sc) removeAllKeys(sc);

            var base = loadBaseline(L);
            if (!base) continue;

            try { if (L.threeDLayer !== base.threeD) L.threeDLayer = base.threeD; } catch (e) {}

            var posProp = t.property("ADBE Position");
            if (posProp) { try { setSeparated(posProp, !!base.sep); } catch (e) {} }

            if (posProp && base.pos) {
                var want3D = !!base.threeD;
                var bx = base.pos[0], by = base.pos[1], bz = (base.pos[2] !== null ? base.pos[2] : 0);
                var nowSep = false; try { nowSep = posProp.dimensionsSeparated; } catch(e){}
                if (nowSep) {
                    var xp = t.property("ADBE Position_0");
                    var yp = t.property("ADBE Position_1");
                    var zp = want3D ? t.property("ADBE Position_2") : null;
                    try { if (xp) xp.setValue(bx); } catch(e){}
                    try { if (yp) yp.setValue(by); } catch(e){}
                    if (want3D && zp) { try { zp.setValue(bz); } catch(e){} }
                } else {
                    var out = want3D ? [bx, by, bz] : [bx, by];
                    try { posProp.setValue(out); } catch(e){}
                }
            }

            if (base.rot3D && base.threeD) {
                var rxx = t.property("ADBE Rotate X");
                var ryy = t.property("ADBE Rotate Y");
                var rzz = t.property("ADBE Rotate Z");
                try { if (rxx) rxx.setValue(base.rot3D[0]); } catch(e){}
                try { if (ryy) ryy.setValue(base.rot3D[1]); } catch(e){}
                try { if (rzz) rzz.setValue(base.rot3D[2]); } catch(e){}
            } else if (base.rotMatch !== null && base.rotVal !== null) {
                var rotProp = (base.rotMatch === "ADBE Rotation")
                    ? t.property("ADBE Rotation")
                    : t.property("ADBE Rotate Z");
                if (rotProp) { try { rotProp.setValue(base.rotVal); } catch(e){} }
            }

            if (base.scale) {
                var scp = t.property("ADBE Scale");
                if (scp) {
                    var s = scp.value.slice(0);
                    s[0] = base.scale[0]; s[1] = base.scale[1];
                    if (base.scale[2] !== null && s.length > 2) s[2] = base.scale[2];
                    try { scp.setValue(s); } catch(e){}
                }
            }
        }

        app.endUndoGroup();
    }

    function separateToggleSelected(opts) {
        var proj = app.project;
        if (!proj || !proj.activeItem || !(proj.activeItem instanceof CompItem)) { alert("Open a composition and select layers."); return; }
        var comp = proj.activeItem, sel = comp.selectedLayers;
        if (!sel || sel.length === 0) { alert("Select at least one layer."); return; }

        app.beginUndoGroup("Neko_Kakera: Separate Toggle");
        for (var i = 0; i < sel.length; i++) {
            var L = sel[i]; if (L.locked) continue;
            var t = getTransform(L); if (!t) continue;

            if (opts.posZ.value && !L.threeDLayer) { try { L.threeDLayer = true; } catch (e) {} }

            var pos = t.property("ADBE Position"); if (!pos) continue;
            var st = getSeparated(pos); var target = !(st === true);
            setSeparated(pos, target);
        }
        app.endUndoGroup();
    }

    function applyRandom(opts) {
        var proj = app.project;
        if (!proj || !proj.activeItem || !(proj.activeItem instanceof CompItem)) { alert("Open a composition and select at least one layer."); return; }
        var comp = proj.activeItem, sel = comp.selectedLayers;
        if (!sel || sel.length === 0) { alert("Select at least one layer."); return; }

        var xr = clampOrder(opts.xMin.text, opts.xMax.text, -150, 150);
        var yr = clampOrder(opts.yMin.text, opts.yMax.text, -150, 150);
        var zr = clampOrder(opts.zMin.text, opts.zMax.text, -150, 150);

        var rotR = clampOrder(opts.rotMin.text, opts.rotMax.text, -15, 15);
        var scxR = clampOrder(opts.scxMin.text, opts.scxMax.text, 0, 50);
        var scyR = clampOrder(opts.scyMin.text, opts.scyMax.text, 0, 50);

        var posMain = opts.posMain.value;
        var posX    = opts.posX.value;
        var posY    = opts.posY.value;
        var posZ    = opts.posZ.value;

        var useRot  = opts.rotToggle.value;
        var useSc   = opts.scToggle.value;
        var scUniform = opts.scUniform.value;

        var addKF   = opts.kfToggle.value;
        var gapFrames = parsePositiveInt(opts.kfFPS.text, 24);
        var dirRandomToOriginal = opts.dirRandomToOriginal.value;

        var anyParamActive = (posMain && (posX || posY || posZ)) || useRot || useSc;
        if (addKF && !anyParamActive) { alert("Please enable at least one parameter (Position / Rotation / Scale) before creating keyframes."); return; }

        app.beginUndoGroup("Neko_Kakera: Kakera!");

        for (var i = 0; i < sel.length; i++) {
            var L = sel[i]; if (L.locked) continue;

            ensureBaseline(L);

            var t = getTransform(L); if (!t) continue;

            if (posMain && posZ && !L.threeDLayer) { try { L.threeDLayer = true; } catch (e) {} }

            var posProp = t.property("ADBE Position");
            var sep = false; try { sep = posProp ? posProp.dimensionsSeparated : false; } catch (e) {}

            var dx = (posMain && posX) ? randInRange(xr[0], xr[1]) : 0;
            var dy = (posMain && posY) ? randInRange(yr[0], yr[1]) : 0;
            var dz = (posMain && posZ && L.threeDLayer) ? randInRange(zr[0], zr[1]) : 0;

            var rotDelta = useRot ? randInRange(rotR[0], rotR[1]) : 0;

            var scxDelta = 0, scyDelta = 0;
            if (useSc) {
                if (scUniform) { var u = randInRange(scxR[0], scxR[1]); scxDelta = u; scyDelta = u; }
                else { scxDelta = randInRange(scxR[0], scxR[1]); scyDelta = randInRange(scyR[0], scyR[1]); }
            }

            var t0 = L.inPoint;
            var t1 = t0 + (gapFrames * comp.frameDuration);
            if (t1 > L.outPoint) t1 = L.outPoint;
            if (t1 <= t0) t1 = Math.min(L.outPoint, t0 + comp.frameDuration);

            // Position
            if (posMain && posProp) {
                if (addKF) {
                    if (sep) {
                        var xP = t.property("ADBE Position_0");
                        var yP = t.property("ADBE Position_1");
                        var zP = L.threeDLayer ? t.property("ADBE Position_2") : null;

                        var baseAtT0 = posProp.valueAtTime(t0, false);
                        var baseX = xP ? xP.valueAtTime(t0, false) : baseAtT0[0];
                        var baseY = yP ? yP.valueAtTime(t0, false) : baseAtT0[1];
                        var baseZ = (L.threeDLayer && zP) ? zP.valueAtTime(t0, false) : (baseAtT0[2] || 0);

                        var sX = baseX, eX = baseX, sY = baseY, eY = baseY, sZ = baseZ, eZ = baseZ;

                        if (dirRandomToOriginal) { if (posX) sX = baseX + dx; if (posY) sY = baseY + dy; if (posZ && L.threeDLayer) sZ = baseZ + dz; }
                        else { if (posX) eX = baseX + dx; if (posY) eY = baseY + dy; if (posZ && L.threeDLayer) eZ = baseZ + dz; }

                        try { if (posX && xP && xP.enabled && !xP.locked) { xP.setValueAtTime(t0, sX); xP.setValueAtTime(t1, eX); } } catch(e){}
                        try { if (posY && yP && yP.enabled && !yP.locked) { yP.setValueAtTime(t0, sY); yP.setValueAtTime(t1, eY); } } catch(e){}
                        if (posZ && L.threeDLayer && zP && zP.enabled && !zP.locked) {
                            try { zP.setValueAtTime(t0, sZ); zP.setValueAtTime(t1, eZ); } catch(e){}
                        }
                    } else {
                        var base = posProp.valueAtTime(t0, false);
                        var is3D = L.threeDLayer;
                        var s = base.slice(0), e = base.slice(0);
                        if (dirRandomToOriginal) { if (posX) s[0] = base[0] + dx; if (posY) s[1] = base[1] + dy; if (is3D && posZ) s[2] = base[2] + dz; }
                        else { if (posX) e[0] = base[0] + dx; if (posY) e[1] = base[1] + dy; if (is3D && posZ) e[2] = base[2] + dz; }
                        try { posProp.setValueAtTime(t0, s); } catch(e){}
                        try { posProp.setValueAtTime(t1, e); } catch(e){}
                    }
                } else {
                    if (sep) {
                        var xP2 = t.property("ADBE Position_0");
                        var yP2 = t.property("ADBE Position_1");
                        var zP2 = L.threeDLayer ? t.property("ADBE Position_2") : null;
                        if (posX && xP2 && xP2.enabled && !xP2.locked) { try { xP2.setValue(xP2.value + dx); } catch(e){} }
                        if (posY && yP2 && yP2.enabled && !yP2.locked) { try { yP2.setValue(yP2.value + dy); } catch(e){} }
                        if (posZ && zP2 && zP2.enabled && !zP2.locked)   { try { zP2.setValue(zP2.value + dz); } catch(e){} }
                    } else {
                        var cur = posProp.value, out = cur.slice(0);
                        if (posX) out[0] = cur[0] + dx;
                        if (posY) out[1] = cur[1] + dy;
                        if (L.threeDLayer && posZ) out[2] = cur[2] + dz;
                        try { posProp.setValue(out); } catch(e){}
                    }
                }
            }

            // Rotation (2D or Z for 3D)
            if (useRot) {
                var rotProp = getRotProperty(t, L.threeDLayer);
                if (rotProp) {
                    if (addKF) {
                        var baseRot = rotProp.valueAtTime(t0, false);
                        var sR = baseRot, eR = baseRot;
                        if (dirRandomToOriginal) { sR = baseRot + rotDelta; } else { eR = baseRot + rotDelta; }
                        try { rotProp.setValueAtTime(t0, sR); } catch(e){}
                        try { rotProp.setValueAtTime(t1, eR); } catch(e){}
                    } else {
                        try { rotProp.setValue(rotProp.value + rotDelta); } catch(e){}
                    }
                }
            }

            // Scale
            if (useSc) {
                var scProp = t.property("ADBE Scale");
                if (scProp) {
                    if (addKF) {
                        var baseS = scProp.valueAtTime(t0, false);
                        var sS = baseS.slice(0), eS = baseS.slice(0);
                        if (dirRandomToOriginal) { sS[0] = baseS[0] + scxDelta; sS[1] = baseS[1] + scyDelta; }
                        else { eS[0] = baseS[0] + scxDelta; eS[1] = baseS[1] + scyDelta; }
                        try { scProp.setValueAtTime(t0, sS); } catch(e){}
                        try { scProp.setValueAtTime(t1, eS); } catch(e){}
                    } else {
                        var curS = scProp.value, outS = curS.slice(0);
                        outS[0] = curS[0] + scxDelta; outS[1] = curS[1] + scyDelta;
                        try { scProp.setValue(outS); } catch(e){}
                    }
                }
            }
        }

        app.endUndoGroup();
    }

    // UI
    function buildUI(thisObj) {
        var pal = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", "Neko_Kakera", undefined, {resizeable:true});

        pal.spacing = 4; pal.margins = 6;

        var g = pal.add("group");
        g.orientation = "column";
        g.alignChildren = ["fill", "top"];
        g.spacing = 4; g.margins = 0;

        // Position ± presets
        var rowPreset = g.add("group"); rowPreset.orientation = "row"; rowPreset.alignChildren = ["left","center"];
        rowPreset.add("statictext", undefined, "Preset ±:");
        var presetList = rowPreset.add("dropdownlist", undefined, ["Custom","50","150","250","350","450","550","650"]);
        presetList.selection = 0;

        // Position
        var posPanel = g.add("panel", undefined, "Position");
        posPanel.orientation = "column"; posPanel.alignChildren = ["fill","top"]; posPanel.margins = 6; posPanel.spacing = 4;

        var posHeader = posPanel.add("group");
        posHeader.orientation = "row"; posHeader.alignChildren = ["left","center"];
        var posMain = posHeader.add("checkbox", undefined, "Enable Position"); posMain.value = true;
        var btnSeparateToggle = posHeader.add("button", undefined, "Separate (Toggle)");

        var gx = posPanel.add("group"); gx.orientation = "row"; gx.alignChildren = ["left","center"]; gx.spacing = 4;
        var posX = gx.add("checkbox", undefined, "X"); posX.value = true;
        var xMin = gx.add("edittext", undefined, "-150"); xMin.characters = 5;
        gx.add("statictext", undefined, "to");
        var xMax = gx.add("edittext", undefined, "150"); xMax.characters = 5;

        var gy = posPanel.add("group"); gy.orientation = "row"; gy.alignChildren = ["left","center"]; gy.spacing = 4;
        var posY = gy.add("checkbox", undefined, "Y"); posY.value = true;
        var yMin = gy.add("edittext", undefined, "-150"); yMin.characters = 5;
        gy.add("statictext", undefined, "to");
        var yMax = gy.add("edittext", undefined, "150"); yMax.characters = 5;

        var gz = posPanel.add("group"); gz.orientation = "row"; gz.alignChildren = ["left","center"]; gz.spacing = 4;
        var posZ = gz.add("checkbox", undefined, "Z (3D)"); posZ.value = false;
        var zMin = gz.add("edittext", undefined, "-150"); zMin.characters = 5;
        gz.add("statictext", undefined, "to");
        var zMax = gz.add("edittext", undefined, "150"); zMax.characters = 5;

        function refreshPosGroup() {
            var en = posMain.value;
            posX.enabled = en; xMin.enabled = en; xMax.enabled = en;
            posY.enabled = en; yMin.enabled = en; yMax.enabled = en;
            posZ.enabled = en; zMin.enabled = en && posZ.value; zMax.enabled = en && posZ.value;
            btnSeparateToggle.enabled = en;
        }
        posMain.onClick = refreshPosGroup; posZ.onClick = refreshPosGroup; refreshPosGroup();
        btnSeparateToggle.onClick = function(){ separateToggleSelected({ posZ: posZ }); };

        presetList.onChange = function () {
            var sel = presetList.selection ? presetList.selection.text : "Custom";
            if (sel !== "Custom") {
                var n = parseFloat(sel);
                if (!isNaN(n)) {
                    xMin.text = (-n).toString(); xMax.text = (n).toString();
                    yMin.text = (-n).toString(); yMax.text = (n).toString();
                    zMin.text = (-n).toString(); zMax.text = (n).toString();
                }
            }
        };

        // Rotation
        var rotPanel = g.add("panel", undefined, "Rotation (°)");
        rotPanel.orientation = "row"; rotPanel.alignChildren = ["left","center"]; rotPanel.margins = 6; rotPanel.spacing = 4;
        var rotToggle = rotPanel.add("checkbox", undefined, "Enable"); rotToggle.value = false;
        var rotMin = rotPanel.add("edittext", undefined, "-15"); rotMin.characters = 5;
        rotPanel.add("statictext", undefined, "to");
        var rotMax = rotPanel.add("edittext", undefined, "15"); rotMax.characters = 5;
        function refreshRot(){ var en = rotToggle.value; rotMin.enabled = en; rotMax.enabled = en; }
        rotToggle.onClick = refreshRot; refreshRot();

        // Scale
        var scPanel = g.add("panel", undefined, "Scale Δ (%)");
        scPanel.orientation = "column"; scPanel.alignChildren = ["fill","top"]; scPanel.margins = 6; scPanel.spacing = 4;

        var scTop = scPanel.add("group"); scTop.orientation = "row"; scTop.alignChildren = ["left","center"]; scTop.spacing = 6;
        var scToggle = scTop.add("checkbox", undefined, "Enable"); scToggle.value = false;
        var scUniform = scTop.add("checkbox", undefined, "Uniform (X = Y)"); scUniform.value = true;

        var scPresetRow = scPanel.add("group"); scPresetRow.orientation = "row"; scPresetRow.alignChildren = ["left","center"];
        scPresetRow.add("statictext", undefined, "Preset:");
        var scPreset = scPresetRow.add("dropdownlist", undefined, ["Custom","50","100","150","200","250"]);
        scPreset.selection = 0;

        var scRowX = scPanel.add("group"); scRowX.orientation = "row"; scRowX.alignChildren = ["left","center"]; scRowX.spacing = 4;
        scRowX.add("statictext", undefined, "X:");
        var scxMin = scRowX.add("edittext", undefined, "0"); scxMin.characters = 5;
        scRowX.add("statictext", undefined, "to");
        var scxMax = scRowX.add("edittext", undefined, "50"); scxMax.characters = 5;

        var scRowY = scPanel.add("group"); scRowY.orientation = "row"; scRowY.alignChildren = ["left","center"]; scRowY.spacing = 4;
        scRowY.add("statictext", undefined, "Y:");
        var scyMin = scRowY.add("edittext", undefined, "0"); scyMin.characters = 5;
        scRowY.add("statictext", undefined, "to");
        var scyMax = scRowY.add("edittext", undefined, "50"); scyMax.characters = 5;

        function syncScaleYToX(){ if (!scUniform.value) return; scyMin.text = scxMin.text; scyMax.text = scxMax.text; }
        scxMin.onChanging = syncScaleYToX; scxMax.onChanging = syncScaleYToX;

        function refreshScale() {
            var en = scToggle.value;
            scUniform.enabled = en; scPreset.enabled = en;
            scxMin.enabled = en; scxMax.enabled = en;
            var yEnabled = en && !scUniform.value; scyMin.enabled = yEnabled; scyMax.enabled = yEnabled;
            if (scUniform.value) syncScaleYToX();
        }
        scToggle.onClick = refreshScale; scUniform.onClick = refreshScale; refreshScale();

        scPreset.onChange = function () {
            var sel = scPreset.selection ? scPreset.selection.text : "Custom";
            if (sel !== "Custom") {
                var n = parseFloat(sel);
                if (!isNaN(n)) { scxMin.text = "0"; scxMax.text = String(n); syncScaleYToX(); }
            }
        };

        // Keyframes
        var kfp = g.add("panel", undefined, "Keyframes");
        kfp.orientation = "column"; kfp.alignChildren = ["fill", "top"]; kfp.margins = 6; kfp.spacing = 4;

        var kfRow1 = kfp.add("group");
        kfRow1.orientation = "row"; kfRow1.alignChildren = ["left", "center"];
        var kfToggle = kfRow1.add("checkbox", undefined, "Add Keyframes (2)");
        kfToggle.value = true; // default checked
        var fpsLbl = kfRow1.add("statictext", undefined, "Frames:");
        var kfFPS = kfRow1.add("edittext", undefined, "24"); kfFPS.characters = 5;

        var kfRow2 = kfp.add("group");
        kfRow2.orientation = "row"; kfRow2.alignChildren = ["left", "center"];
        kfRow2.add("statictext", undefined, "Direction:");
        var dirRandomToOriginal = kfRow2.add("radiobutton", undefined, "Random → Original");
        var dirOriginalToRandom = kfRow2.add("radiobutton", undefined, "Original → Random");
        dirRandomToOriginal.value = true;

        function refreshKFUI(){
            var en = kfToggle.value;
            kfFPS.enabled = en; fpsLbl.enabled = en;
            dirRandomToOriginal.enabled = en; dirOriginalToRandom.enabled = en;
        }
        kfToggle.onClick = refreshKFUI; 
        refreshKFUI();

        // --- Random Select Layers (below Keyframes) ---
        var rsPanel = g.add("panel", undefined, "Random Select Layers");
        rsPanel.orientation = "column"; rsPanel.alignChildren = ["fill", "top"]; rsPanel.margins = 6; rsPanel.spacing = 6;

        var rsRow = rsPanel.add("group");
        rsRow.orientation = "row"; rsRow.alignChildren = ["left","center"]; rsRow.spacing = 6;

        rsRow.add("statictext", undefined, "Percentage:");
        var rsSlider = rsRow.add("slider", undefined, 50, 0, 100);
        rsSlider.preferredSize = [140, 18];
        var rsEdit = rsRow.add("edittext", undefined, "50"); rsEdit.characters = 4;
        rsRow.add("statictext", undefined, "%");

        var rsBtnRow = rsPanel.add("group");
        rsBtnRow.orientation = "row"; rsBtnRow.alignChildren = ["left","center"];
        var btnRandomSelect = rsBtnRow.add("button", undefined, "Random Select");

        var rsStatus = rsPanel.add("statictext", undefined, "Select 2+ layers, then click Random Select.");
        rsStatus.characters = 40;

        rsSlider.onChanging = function(){ rsEdit.text = String(Math.round(rsSlider.value)); };
        rsEdit.onChange = function(){
            var v = parseFloat(rsEdit.text); if (isNaN(v)) v = 0;
            v = Math.max(0, Math.min(100, v));
            v = Math.round(v);
            rsEdit.text = String(v); rsSlider.value = v;
        };

        btnRandomSelect.onClick = function(){
            var comp = app.project && app.project.activeItem;
            if (!(comp && comp instanceof CompItem)) { rsStatus.text = "No active composition."; return; }
            var selected = comp.selectedLayers;
            var n = selected.length;
            if (n < 2) { rsStatus.text = "Select at least 2 layers."; return; }

            var pct = Math.round(parseFloat(rsEdit.text) || 0);
            pct = Math.max(0, Math.min(100, pct));
            var k = Math.round(n * pct / 100);

            var idx = []; for (var i=0;i<n;i++) idx.push(i);
            shuffleArray(idx);

            app.beginUndoGroup("Neko_Kakera: Random Select");
            try {
                for (var a=0;a<n;a++) selected[a].selected = false;
                for (var b=0;b<k;b++) selected[idx[b]].selected = true;
                rsStatus.text = "Selected " + k + " of " + n + " layers (" + pct + "%).";
            } catch(err) {
                rsStatus.text = "Error: " + err.toString();
            } finally {
                app.endUndoGroup();
            }
        };

        // Footer buttons
        var gb = g.add("group"); gb.orientation = "row"; gb.alignment = ["fill", "top"]; gb.spacing = 6;
        var btnApply  = gb.add("button", undefined, "Kakera!");
        var btnRevert = gb.add("button", undefined, "Revert to Original");
        var btnAbout  = gb.add("button", undefined, "About");

        btnApply.onClick = function () {
            applyRandom({
                posMain: posMain, posX: posX, posY: posY, posZ: posZ,
                xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax, zMin: zMin, zMax: zMax,
                rotToggle: rotToggle, rotMin: rotMin, rotMax: rotMax,
                scToggle: scToggle, scUniform: scUniform, scxMin: scxMin, scxMax: scxMax, scyMin: scyMin, scyMax: scyMax,
                kfToggle: kfToggle, kfFPS: kfFPS, dirRandomToOriginal: dirRandomToOriginal
            });
        };
        btnRevert.onClick = function () { revertToOriginal(); };
        btnAbout.onClick = function () {
            alert(
                "Neko_Kakera — version 1.1\n" +
                "created by : nekodanharuno\n\n" +
                "• Position: main toggle + X/Y/Z (Z forces 3D) + Separate (Toggle)\n" +
                "• Ranges with ± presets: 50, 150, 250, 350, 450, 550, 650\n" +
                "• Rotation (2D or Z in 3D)\n" +
                "• Scale Δ% [X, Y] + Uniform, presets 50..250 (default 0→50)\n" +
                "• Keyframes: two keys only, gap in frames, Random→Original / Original→Random\n" +
                "• Random Select Layers: pick a random subset from current selection by %\n" +
                "• Kakera!: apply random offsets to active toggles\n" +
                "• Revert to Original: clears keys and restores Position, Rotation (2D or X/Y/Z), and Scale\n"
            );
        };

        try { pal.preferredSize.width = 270; } catch (e) {}
        pal.layout.layout(true);
        pal.onResizing = pal.onResize = function () { this.layout.resize(); };
        return pal;
    }

    var ui = (function build(thisObj){ 
        var p = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Neko_Kakera", undefined, {resizeable:true});
        var built = buildUI(p);
        if (built instanceof Window) { built.center(); built.show(); }
        return built;
    })(thisObj);

})(this);
