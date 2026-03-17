{
    app.beginUndoGroup("Apply Fluttering Animation");

    var comp = app.project.activeItem;

    if (!(comp instanceof CompItem)) {
        alert("アクティブなコンポジションを開いてください。");
                } else {
        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) {
            alert("少なくとも1つのレイヤーを選択してください。");
        } else {
            // --- Ensure a single global control layer exists and has all sliders ---
            var CTRL_NAME = "Confetti Controls";

            function findLayerByName(cmp, name) {
                for (var li = 1; li <= cmp.numLayers; li++) {
                    if (cmp.layer(li).name === name) return cmp.layer(li);
                }
                return null;
            }

            function ensureControlLayer(cmp) {
                var ctrl = findLayerByName(cmp, CTRL_NAME);
                if (!ctrl) {
                    ctrl = cmp.layers.addNull();
                    ctrl.name = CTRL_NAME;
                    ctrl.label = 9; // Cyan label for visibility
                    ctrl.moveToBeginning();
                }
                return ctrl;
            }

            function ensureSliderOn(layerRef, name, defaultValue) {
                var fx = layerRef.property("Effects");
                if (!fx) return null;
                var prop = fx.property(name);
                if (!prop) {
                    prop = fx.addProperty("ADBE Slider Control");
                    prop.name = name;
                    prop.property("Slider").setValue(defaultValue);
                }
                return prop;
            }

            function ensureCheckboxOn(layerRef, name, defaultChecked) {
                var fx = layerRef.property("Effects");
                if (!fx) return null;
                var prop = fx.property(name);
                if (!prop) {
                    prop = fx.addProperty("ADBE Checkbox Control");
                    prop.name = name;
                    prop.property("Checkbox").setValue(defaultChecked ? 1 : 0);
                }
                return prop;
            }

            var ctrlLayer = ensureControlLayer(comp);
            // Create required global sliders if missing (defaults mirror previous per-layer defaults)
            ensureSliderOn(ctrlLayer, "startTime", 0.0);
            ensureSliderOn(ctrlLayer, "endTime", 0.0);
            ensureSliderOn(ctrlLayer, "easingDuration", 10);
            ensureSliderOn(ctrlLayer, "seed", 0);
            ensureSliderOn(ctrlLayer, "intensity", 1);
            ensureSliderOn(ctrlLayer, "swayYAmount", 0);
            ensureSliderOn(ctrlLayer, "posterizeFPS", 0);
            ensureCheckboxOn(ctrlLayer, "posterizeOn", 0);
            ensureSliderOn(ctrlLayer, "swayAmplitude", 30);
            ensureSliderOn(ctrlLayer, "swayFrequency", 1.0);
            ensureSliderOn(ctrlLayer, "rotationSpeed", 40);
            ensureSliderOn(ctrlLayer, "scaleWobble", 3);
            ensureSliderOn(ctrlLayer, "flipFreqX", 1.2);
            ensureSliderOn(ctrlLayer, "flipFreqY", 0.8);
            ensureSliderOn(ctrlLayer, "minScale", 8);

            for (var i = 0; i < selectedLayers.length; i++) {
                var layer = selectedLayers[i];
                if (layer === ctrlLayer) { continue; }

                // Remove any existing layer-level controls with matching names
                (function removePerLayerControls(){
                    var names = [
                        "startTime","endTime","easingDuration","seed","intensity","swayYAmount","posterizeFPS","posterizeOn","swayAmplitude","swayFrequency","rotationSpeed",
                        "scaleWobble","flipFreqX","flipFreqY","minScale"
                    ];
                    var fx = layer.property("Effects");
                    if (!fx) return;
                    for (var ei = fx.numProperties; ei >= 1; ei--) {
                        var eff = fx.property(ei);
                        if (!eff) continue;
                        for (var ni = 0; ni < names.length; ni++) {
                            if (eff.name === names[ni]) { eff.remove(); break; }
                        }
                    }
                })();

                // Prefer applying expressions to Shape Group transforms if available
                (function applyToShapeGroupsOrLayer(){
                    var appliedToGroups = false;
                    var contents = layer.property("ADBE Root Vectors Group");
                    if (contents && contents.numProperties > 0) {
                        for (var gi = 1; gi <= contents.numProperties; gi++) {
                            var group = contents.property(gi);
                            if (!group) { continue; }
                            var xform = group.property("ADBE Vector Transform Group");
                            if (!xform) { continue; }
                            appliedToGroups = true;

                            // Group Position (randomized flutter using wiggle on X only)
                            var gp = xform.property("ADBE Vector Position");
                            if (gp) {
                                gp.expression = 'ctrl = thisComp.layer("' + CTRL_NAME + '");\n' +
                                               'start = framesToTime(ctrl.effect("startTime")("Slider"));\n' +
                                               'endT = framesToTime(ctrl.effect("endTime")("Slider"));\n' +
                                               'edur = framesToTime(ctrl.effect("easingDuration")("Slider"));\n' +
                                               'amp = ctrl.effect("swayAmplitude")("Slider");\n' +
                                               'freq = ctrl.effect("swayFrequency")("Slider");\n' +
                                               'inten = Math.max(0, ctrl.effect("intensity")("Slider"));\n' +
                                               'gseed = Math.floor(ctrl.effect("seed")("Slider"));\n' +
                                               'ay = Math.max(0, ctrl.effect("swayYAmount")("Slider"));\n' +
                                               'pfps = Math.max(0, ctrl.effect("posterizeFPS")("Slider"));\n' +
                                               'pOn = ctrl.effect("posterizeOn")("Checkbox");\n' +
                                               'function clamp01(x){return Math.max(0, Math.min(1, x));}\n' +
                                               'function smooth01(x){x = clamp01(x); return x*x*(3-2*x);}\n' +
                                               't = time;\n' +
                                               'if (pOn > 0 && pfps > 0) posterizeTime(pfps);\n' +
                                               'wIn = (edur>0) ? smooth01((t - start)/edur) : (t>=start?1:0);\n' +
                                               'wOut = (endT>start) ? ((edur>0) ? smooth01((endT - t)/edur) : (t < endT ? 1 : 0)) : 1;\n' +
                                               'w = wIn * clamp01(wOut);\n' +
                                               'tStop = (endT>start) ? Math.min(t, endT) : t;\n' +
                                               'u = Math.max(0, tStop - start);\n' +
                                               'if (edur <= 0) { td = u; } else if (u < edur) { td = edur * smooth01(u/edur); } else if (endT>start && tStop > (endT - edur)) { u2 = (tStop - (endT - edur)) / edur; td = (endT - start - edur) + edur * smooth01(Math.max(0, Math.min(1, u2))); } else { td = u; }\n' +
                                               'seedRandom(thisLayer.index + gseed, true);\n' +
                                               'ph = random(0, 1000);\n' +
                                               'base = valueAtTime(start - thisComp.frameDuration);\n' +
                                               'nx = base[0] + (amp * inten) * noise(freq * td + ph);\n' +
                                               'ny = base[1] + (ay * inten) * noise(freq * td + ph + 500);\n' +
                                               '[ base[0] + (nx - base[0]) * w, base[1] + (ny - base[1]) * w ];';
                            }

                            // Group Rotation (Z)
                            var gr = xform.property("ADBE Vector Rotation");
                            if (gr) {
                                gr.expression = 'ctrl = thisComp.layer("' + CTRL_NAME + '");\n' +
                                               'start = framesToTime(ctrl.effect("startTime")("Slider"));\n' +
                                               'endT = framesToTime(ctrl.effect("endTime")("Slider"));\n' +
                                               'edur = framesToTime(ctrl.effect("easingDuration")("Slider"));\n' +
                                               'rotSpeed = ctrl.effect("rotationSpeed")("Slider");\n' +
                                               'inten = Math.max(0, ctrl.effect("intensity")("Slider"));\n' +
                                                'pfps = Math.max(0, ctrl.effect("posterizeFPS")("Slider"));\n' +
                                                'pOn = ctrl.effect("posterizeOn")("Checkbox");\n' +
                                               'function clamp01(x){return Math.max(0, Math.min(1, x));}\n' +
                                               'function smooth01(x){x = clamp01(x); return x*x*(3-2*x);}\n' +
                                               't = time;\n' +
                                                'if (pOn > 0 && pfps > 0) posterizeTime(pfps);\n' +
                                               'wIn = (edur>0) ? smooth01((t - start)/edur) : (t>=start?1:0);\n' +
                                               'wOut = (endT>start) ? ((edur>0) ? smooth01((endT - t)/edur) : (t < endT ? 1 : 0)) : 1;\n' +
                                               'w = wIn * clamp01(wOut);\n' +
                                               'tStop = (endT>start) ? Math.min(t, endT) : t;\n' +
                                               'u = Math.max(0, tStop - start);\n' +
                                               'if (edur <= 0) { td = u; } else if (u < edur) { td = edur * smooth01(u/edur); } else if (endT>start && tStop > (endT - edur)) { u2 = (tStop - (endT - edur)) / edur; td = (endT - start - edur) + edur * smooth01(Math.max(0, Math.min(1, u2))); } else { td = u; }\n' +
                                               'base = valueAtTime(start - thisComp.frameDuration);\n' +
                                                'base + (rotSpeed * inten * td) * w;';
                            }

                            // Group Scale (fake 3D confetti flips using X/Y scale)
                            var gs = xform.property("ADBE Vector Scale");
                            if (gs) {
                                gs.expression = 'ctrl = thisComp.layer("' + CTRL_NAME + '");\n' +
                                               'start = framesToTime(ctrl.effect("startTime")("Slider"));\n' +
                                               'endT = framesToTime(ctrl.effect("endTime")("Slider"));\n' +
                                               'edur = framesToTime(ctrl.effect("easingDuration")("Slider"));\n' +
                                               'fx = ctrl.effect("flipFreqX")("Slider");\n' +
                                               'fy = ctrl.effect("flipFreqY")("Slider");\n' +
                                               'minAbs = ctrl.effect("minScale")("Slider");\n' +
                                               'wobble = ctrl.effect("scaleWobble")("Slider");\n' +
                                               'inten = Math.max(0, ctrl.effect("intensity")("Slider"));\n' +
                                               'gseed = Math.floor(ctrl.effect("seed")("Slider"));\n' +
                                               'pfps = Math.max(0, ctrl.effect("posterizeFPS")("Slider"));\n' +
                                               'function clamp01(x){return Math.max(0, Math.min(1, x));}\n' +
                                               'function smooth01(x){x = clamp01(x); return x*x*(3-2*x);}\n' +
                                               'function softClamp(raw, minA){var m = Math.abs(raw); if (minA <= 0) return raw; if (m >= minA) return raw; var t = smooth01(m/minA); return (raw < 0 ? -1 : 1) * (minA * t);}\n' +
                                               't = time;\n' +
                                               'if (pfps > 0) posterizeTime(pfps);\n' +
                                               'wIn = (edur>0) ? smooth01((t - start)/edur) : (t>=start?1:0);\n' +
                                               'wOut = (endT>start) ? ((edur>0) ? smooth01((endT - t)/edur) : (t < endT ? 1 : 0)) : 1;\n' +
                                               'w = wIn * clamp01(wOut);\n' +
                                               'tStop = (endT>start) ? Math.min(t, endT) : t;\n' +
                                               'u = Math.max(0, tStop - start);\n' +
                                               'if (edur <= 0) { td = u; } else if (u < edur) { td = edur * smooth01(u/edur); } else if (endT>start && tStop > (endT - edur)) { u2 = (tStop - (endT - edur)) / edur; td = (endT - start - edur) + edur * smooth01(Math.max(0, Math.min(1, u2))); } else { td = u; }\n' +
                                               'seedRandom(thisLayer.index + gseed, true);\n' +
                                               'phx = random(0, Math.PI*2);\n' +
                                               'phy = random(0, Math.PI*2);\n' +
                                               'sx = 100 * Math.cos(2*Math.PI*fx*td + phx);\n' +
                                               'sy = 100 * Math.cos(2*Math.PI*fy*td + phy);\n' +
                                               'sx = softClamp(sx, minAbs);\n' +
                                               'sy = softClamp(sy, minAbs);\n' +
                                               'jx = (wobble > 0) ? noise(td*2 + 200) * (wobble * inten) : 0;\n' +
                                               'jy = (wobble > 0) ? noise(td*2 + 300) * (wobble * inten) : 0;\n' +
                                               'base = valueAtTime(start - thisComp.frameDuration);\n' +
                                               'tx = sx + jx; ty = sy + jy;\n' +
                                               '[ base[0] + (tx - base[0]) * w, base[1] + (ty - base[1]) * w ];';
                            }
                        }
                    }

                    if (appliedToGroups) {
                        // Clear any layer-level expressions to avoid double transforms
                        try { layer.property("Transform").property("Position").expression = ""; } catch(e) {}
                        try { layer.property("Transform").property("Rotation").expression = ""; } catch(e) {}
                        try { layer.property("Transform").property("Scale").expression = ""; } catch(e) {}
                    } else {
                        // Fallback: apply to layer transforms (no shape groups found)
                        layer.property("Transform").property("Position").expression =
                            'ctrl = thisComp.layer("' + CTRL_NAME + '");\n' +
                            'start = framesToTime(ctrl.effect("startTime")("Slider"));\n' +
                            'endT = framesToTime(ctrl.effect("endTime")("Slider"));\n' +
                            'edur = framesToTime(ctrl.effect("easingDuration")("Slider"));\n' +
                            'amp = ctrl.effect("swayAmplitude")("Slider");\n' +
                            'freq = ctrl.effect("swayFrequency")("Slider");\n' +
                            'inten = Math.max(0, ctrl.effect("intensity")("Slider"));\n' +
                            'gseed = Math.floor(ctrl.effect("seed")("Slider"));\n' +
                            'ay = Math.max(0, ctrl.effect("swayYAmount")("Slider"));\n' +
                                               'pfps = Math.max(0, ctrl.effect("posterizeFPS")("Slider"));\n' +
                                               'pOn = ctrl.effect("posterizeOn")("Checkbox");\n' +
                                               'function clamp01(x){return Math.max(0, Math.min(1, x));}\n' +
                            'function smooth01(x){x = clamp01(x); return x*x*(3-2*x);}\n' +
                                               'if (pOn > 0 && pfps > 0) posterizeTime(pfps);\n' +
                                               't = time;\n' +
                            'wIn = (edur>0) ? smooth01((t - start)/edur) : (t>=start?1:0);\n' +
                            'wOut = (endT>start) ? ((edur>0) ? smooth01((endT - t)/edur) : (t < endT ? 1 : 0)) : 1;\n' +
                            'w = wIn * clamp01(wOut);\n' +
                            'tStop = (endT>start) ? Math.min(t, endT) : t;\n' +
                            'u = Math.max(0, tStop - start);\n' +
                            'if (edur <= 0) { td = u; } else if (u < edur) { td = edur * smooth01(u/edur); } else if (endT>start && tStop > (endT - edur)) { u2 = (tStop - (endT - edur)) / edur; td = (endT - start - edur) + edur * smooth01(Math.max(0, Math.min(1, u2))); } else { td = u; }\n' +
                            'seedRandom(thisLayer.index + gseed, true);\n' +
                            'ph = random(0, 1000);\n' +
                            'base = valueAtTime(start - thisComp.frameDuration);\n' +
                            'nx = base[0] + (amp * inten) * noise(freq * td + ph);\n' +
                            'ny = base[1] + (ay * inten) * noise(freq * td + ph + 500);\n' +
                            '[ base[0] + (nx - base[0]) * w, base[1] + (ny - base[1]) * w ];';

                        layer.property("Transform").property("Rotation").expression =
                            'ctrl = thisComp.layer("' + CTRL_NAME + '");\n' +
                            'start = framesToTime(ctrl.effect("startTime")("Slider"));\n' +
                            'endT = framesToTime(ctrl.effect("endTime")("Slider"));\n' +
                            'edur = framesToTime(ctrl.effect("easingDuration")("Slider"));\n' +
                            'rotSpeed = ctrl.effect("rotationSpeed")("Slider");\n' +
                            'inten = Math.max(0, ctrl.effect("intensity")("Slider"));\n' +
                                                'pfps = Math.max(0, ctrl.effect("posterizeFPS")("Slider"));\n' +
                                                'pOn = ctrl.effect("posterizeOn")("Checkbox");\n' +
                                                'function clamp01(x){return Math.max(0, Math.min(1, x));}\n' +
                            'function smooth01(x){x = clamp01(x); return x*x*(3-2*x);}\n' +
                                                'if (pOn > 0 && pfps > 0) posterizeTime(pfps);\n' +
                                                't = time;\n' +
                            'wIn = (edur>0) ? smooth01((t - start)/edur) : (t>=start?1:0);\n' +
                            'wOut = (endT>start) ? ((edur>0) ? smooth01((endT - t)/edur) : (t < endT ? 1 : 0)) : 1;\n' +
                            'w = wIn * clamp01(wOut);\n' +
                            'tStop = (endT>start) ? Math.min(t, endT) : t;\n' +
                            'u = Math.max(0, tStop - start);\n' +
                            'if (edur <= 0) { td = u; } else if (u < edur) { td = edur * smooth01(u/edur); } else if (endT>start && tStop > (endT - edur)) { u2 = (tStop - (endT - edur)) / edur; td = (endT - start - edur) + edur * smooth01(Math.max(0, Math.min(1, u2))); } else { td = u; }\n' +
                            'base = valueAtTime(start - thisComp.frameDuration);\n' +
                            'base + (rotSpeed * inten * td) * w;';

                        layer.property("Transform").property("Scale").expression =
                            'ctrl = thisComp.layer("' + CTRL_NAME + '");\n' +
                            'start = framesToTime(ctrl.effect("startTime")("Slider"));\n' +
                            'endT = framesToTime(ctrl.effect("endTime")("Slider"));\n' +
                            'edur = framesToTime(ctrl.effect("easingDuration")("Slider"));\n' +
                            'fx = ctrl.effect("flipFreqX")("Slider");\n' +
                            'fy = ctrl.effect("flipFreqY")("Slider");\n' +
                            'minAbs = ctrl.effect("minScale")("Slider");\n' +
                            'wobble = ctrl.effect("scaleWobble")("Slider");\n' +
                            'inten = Math.max(0, ctrl.effect("intensity")("Slider"));\n' +
                            'gseed = Math.floor(ctrl.effect("seed")("Slider"));\n' +
                            'function clamp01(x){return Math.max(0, Math.min(1, x));}\n' +
                            'function smooth01(x){x = clamp01(x); return x*x*(3-2*x);}\n' +
                            'function softClamp(raw, minA){var m = Math.abs(raw); if (minA <= 0) return raw; if (m >= minA) return raw; var t = smooth01(m/minA); return (raw < 0 ? -1 : 1) * (minA * t);}\n' +
                            't = time;\n' +
                            'wIn = (edur>0) ? smooth01((t - start)/edur) : (t>=start?1:0);\n' +
                            'wOut = (endT>start) ? ((edur>0) ? smooth01((endT - t)/edur) : (t < endT ? 1 : 0)) : 1;\n' +
                            'w = wIn * clamp01(wOut);\n' +
                            'tStop = (endT>start) ? Math.min(t, endT) : t;\n' +
                            'u = Math.max(0, tStop - start);\n' +
                            'if (edur <= 0) { td = u; } else if (u < edur) { td = edur * smooth01(u/edur); } else if (endT>start && tStop > (endT - edur)) { u2 = (tStop - (endT - edur)) / edur; td = (endT - start - edur) + edur * smooth01(Math.max(0, Math.min(1, u2))); } else { td = u; }\n' +
                            'seedRandom(thisLayer.index + gseed, true);\n' +
                            'phx = random(0, Math.PI*2);\n' +
                            'phy = random(0, Math.PI*2);\n' +
                            'sx = 100 * Math.cos(2*Math.PI*fx*td + phx);\n' +
                            'sy = 100 * Math.cos(2*Math.PI*fy*td + phy);\n' +
                            'sx = softClamp(sx, minAbs);\n' +
                            'sy = softClamp(sy, minAbs);\n' +
                            'jx = (wobble > 0) ? noise(td*2 + 200) * (wobble * inten) : 0;\n' +
                            'jy = (wobble > 0) ? noise(td*2 + 300) * (wobble * inten) : 0;\n' +
                            'base = valueAtTime(start - thisComp.frameDuration);\n' +
                            'tx = sx + jx; ty = sy + jy;\n' +
                            '[ base[0] + (tx - base[0]) * w, base[1] + (ty - base[1]) * w ];';
                    }
                })();
            }

            alert("ヒラヒラ揺れアニメーションを適用しました！");
        }
        }

        app.endUndoGroup();
    }