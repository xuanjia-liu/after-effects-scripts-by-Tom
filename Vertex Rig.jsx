/**
 * Vertex Rig 1.0
 * Shape layer (and mask) point rigging for After Effects.
 *
 * Put controls only on the vertices you pick, give those points bezier handle
 * controls, drive many points from one Pivot, attach followers that ride the
 * path, split and merge layers without breaking the rig, and bake it back to
 * plain path keyframes when you are done.
 *
 * The rig is made of ordinary After Effects expressions plus "VXR L*" Layer
 * Control effects on the rigged layer. Anyone can open the project and move the
 * controls without this script installed, as long as those effects stay put.
 *
 * HOW IT WORKS
 *   Pick vertices in the panel's preview (click, shift-click, or drag a
 *   marquee), then press a button. Everything else reads the After Effects
 *   selection: Follower attaches the selected layers, Merge folds the selected
 *   shape layers together, Delete understands a selected Pivot or follower.
 *
 *   Points    Create      a control layer on each picked vertex
 *             + Handles   the same, plus both bezier handles
 *             Handles     add the missing handles to points already rigged
 *             Delete      remove the picked controls, or the whole rig
 *   Group     Pivot       one control that moves, turns and scales many points,
 *                         across layers; its Pivot Offset shifts the centre of
 *                         rotation without moving the artwork, and animates
 *             Add/Release join or leave an existing Pivot
 *             Bake        freeze the rig into path keyframes and drop it
 *   Follow    Follower    ride the path, with Offset and Follow Rotation
 *             Average     sit at the centre of a group of points
 *             Apply       swap those points' handles between masks and layers
 *   Layers    Extract     move the picked shapes into layers of their own
 *             Merge       fold the selected shape layers into the topmost one
 *             To Bezier   rectangles, ellipses and stars become editable paths
 *
 * KNOWN LIMITS
 *   Vertices are picked in the panel, not in the After Effects viewer; AE does
 *   not expose the viewer's vertex selection to scripts. Group Skew is the one
 *   shape-group transform the generated expression cannot undo, and Create
 *   warns when it finds one. Merge is 2D only and refuses 3D layers.
 *
 * File must stay pure ASCII: After Effects reads .jsx as Latin-1.
 */

(function (thisObj) {

    // ------------------------------------------------------------------ setup

    var NAME = "Vertex Rig";
    var VERSION = "1.0";
    var TAG = "VXR";
    var PREFS = "VertexRig1";

    var K_POINT = "point";
    var K_HANDLE = "handle";
    var K_PIVOT = "pivot";
    var K_FOLLOW = "follow";
    var K_AVG = "avg";

    var MN_CONTENTS = "ADBE Root Vectors Group";
    var MN_GROUP = "ADBE Vector Group";
    var MN_VECTORS = "ADBE Vectors Group";
    var MN_SHAPEGRP = "ADBE Vector Shape - Group";
    var MN_SHAPE = "ADBE Vector Shape";
    var MN_GXFORM = "ADBE Vector Transform Group";
    var MN_FILL = "ADBE Vector Graphic - Fill";
    var MN_STROKE = "ADBE Vector Graphic - Stroke";
    var MN_EFFECTS = "ADBE Effect Parade";
    var MN_MASKS = "ADBE Mask Parade";
    var MN_MASK = "ADBE Mask Atom";
    var MN_MASKSHAPE = "ADBE Mask Shape";
    var MN_LAYERCTL = "ADBE Layer Control";
    var MN_SLIDER = "ADBE Slider Control";
    var MN_CHECKBOX = "ADBE Checkbox Control";
    var MN_POINTCTL = "ADBE Point Control";

    var MASK_IN = TAG + " In";
    var MASK_OUT = TAG + " Out";

    // --------------------------------------------------------- tiny ES3 shims

    function indexOf(arr, v) {
        for (var i = 0; i < arr.length; i++) { if (arr[i] === v) { return i; } }
        return -1;
    }

    function has(arr, v) { return indexOf(arr, v) >= 0; }

    function trim(s) { return String(s).replace(/^[\s\u0000]+|[\s\u0000]+$/g, ""); }

    function pad(n, w) {
        var s = String(n);
        while (s.length < w) { s = "0" + s; }
        return s;
    }

    function sortNum(a, b) { return a - b; }

    // Minimal JSON writer / reader. Only ever round-trips our own manifests.
    function enc(v) {
        if (v === null || v === undefined) { return "null"; }
        var t = typeof v;
        if (t === "number") { return isFinite(v) ? String(Math.round(v * 1e6) / 1e6) : "0"; }
        if (t === "boolean") { return v ? "true" : "false"; }
        if (t === "string") { return encStr(v); }
        if (v instanceof Array) {
            var a = [];
            for (var i = 0; i < v.length; i++) { a.push(enc(v[i])); }
            return "[" + a.join(",") + "]";
        }
        var parts = [];
        for (var k in v) {
            if (v.hasOwnProperty(k)) { parts.push(encStr(k) + ":" + enc(v[k])); }
        }
        return "{" + parts.join(",") + "}";
    }

    function encStr(s) {
        s = String(s);
        s = s.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
        s = s.replace(/[\r\n\t]/g, " ");
        return "\"" + s + "\"";
    }

    function dec(s) {
        try { return eval("(" + s + ")"); } catch (e) { return null; }
    }

    // String literal for generated expression source.
    function estr(s) { return encStr(s); }

    function numLit(v) {
        var x = Math.round(Number(v) * 10000) / 10000;
        return isFinite(x) ? String(x) : "0";
    }

    // " - [x, y]" for a handle standing off a corner, which must read as no
    // tangent at all until it is moved; "" for a handle that shows a real one.
    function restLit(r) {
        if (!r || (!r[0] && !r[1])) { return ""; }
        return " - [" + numLit(r[0]) + ", " + numLit(r[1]) + "]";
    }

    // ------------------------------------------------------------ 2D affine
    // m = [a, b, c, d, tx, ty]   ->   x' = a*x + c*y + tx ,  y' = b*x + d*y + ty

    function mId() { return [1, 0, 0, 1, 0, 0]; }

    function mMul(A, B) {              // apply B first, then A
        return [
            A[0] * B[0] + A[2] * B[1],
            A[1] * B[0] + A[3] * B[1],
            A[0] * B[2] + A[2] * B[3],
            A[1] * B[2] + A[3] * B[3],
            A[0] * B[4] + A[2] * B[5] + A[4],
            A[1] * B[4] + A[3] * B[5] + A[5]
        ];
    }

    function mPt(m, p) {
        return [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
    }

    function mVec(m, p) {
        return [m[0] * p[0] + m[2] * p[1], m[1] * p[0] + m[3] * p[1]];
    }

    function mInv(m) {
        var det = m[0] * m[3] - m[1] * m[2];
        if (!det) { return mId(); }
        var a = m[3] / det, b = -m[1] / det, c = -m[2] / det, d = m[0] / det;
        return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
    }

    // M = T(pos) * R(rot) * S(scale) * T(-anchor)
    function mTRS(pos, rotDeg, scl, anc) {
        var r = rotDeg * Math.PI / 180;
        var co = Math.cos(r), si = Math.sin(r);
        var sx = scl[0] / 100, sy = scl[1] / 100;
        var a = co * sx, b = si * sx, c = -si * sy, d = co * sy;
        return [a, b, c, d,
            pos[0] - (a * anc[0] + c * anc[1]),
            pos[1] - (b * anc[0] + d * anc[1])];
    }

    function xy(v) {
        if (v === null || v === undefined) { return [0, 0]; }
        if (v instanceof Array) { return [Number(v[0]) || 0, Number(v[1]) || 0]; }
        return [Number(v) || 0, 0];
    }

    function val(prop, t, fallback) {
        try { return prop.valueAtTime(t, false); } catch (e) { return fallback; }
    }

    function zRot(layer, t) {
        try {
            if (layer.threeDLayer) {
                return Number(val(layer.transform.property("ADBE Rotate Z"), t, 0)) || 0;
            }
            return Number(val(layer.transform.rotation, t, 0)) || 0;
        } catch (e) { return 0; }
    }

    // Layer space -> comp space, following the parent chain. 2D approximation:
    // 3D layers are read through their Z rotation only, which is enough for the
    // on-screen preview. Control placement never relies on this (see compOf).
    function layerMatrix(layer, t, depth) {
        depth = depth || 0;
        var tr = layer.transform;
        var m = mTRS(xy(val(tr.position, t, [0, 0])), zRot(layer, t),
                     xy(val(tr.scale, t, [100, 100])), xy(val(tr.anchorPoint, t, [0, 0])));
        if (layer.parent && depth < 24) { m = mMul(layerMatrix(layer.parent, t, depth + 1), m); }
        return m;
    }

    // Group space -> layer space for a chain of nested shape groups.
    function chainMatrix(item, t) {
        var m = mId();
        var holder = item.layer.property(MN_CONTENTS);
        for (var i = 0; i < item.chain.length; i++) {
            var g = holder.property(item.chain[i]);
            if (!g) { return m; }
            var tr = g.property(MN_GXFORM);
            m = mMul(m, mTRS(xy(val(tr.property("ADBE Vector Position"), t, [0, 0])),
                             Number(val(tr.property("ADBE Vector Rotation"), t, 0)) || 0,
                             xy(val(tr.property("ADBE Vector Scale"), t, [100, 100])),
                             xy(val(tr.property("ADBE Vector Anchor"), t, [0, 0]))));
            holder = g.property(MN_VECTORS);
        }
        return m;
    }

    function itemMatrix(item, t) { return mMul(layerMatrix(item.layer, t), chainMatrix(item, t)); }

    // ------------------------------------------------------------- scanning

    function activeComp() {
        var it = app.project ? app.project.activeItem : null;
        return (it && it instanceof CompItem) ? it : null;
    }

    function kindOf(layer) {
        var c = String(layer.comment || "");
        if (c.substring(0, TAG.length + 1) !== TAG + "|") { return null; }
        var bits = c.split("|");
        return bits.length > 1 ? bits[1] : null;
    }

    function isControl(layer) { return kindOf(layer) !== null; }

    function isOwnControl(layer) {
        var bits = String(layer.comment || "").split("|");
        return bits.length > 2 && bits[2] === "own";
    }

    function markControl(layer, kind, note) {
        layer.comment = TAG + "|" + kind + (note ? "|" + note : "");
    }

    // One rigged-or-riggable path in the comp.
    //   layer  : the AVLayer that owns it
    //   prop   : the Path / Mask Path property
    //   chain  : names of the enclosing shape groups, outermost first ([] for masks)
    //   ref    : how another layer's expression addresses this path
    function makeItem(layer, prop, chain, sname, ref, label) {
        return {
            layer: layer, prop: prop, chain: chain, sname: sname, ref: ref, label: label,
            key: String(layer.id) + "/" + ref
        };
    }

    function walkVectors(holder, chain, out, layer) {
        for (var i = 1; i <= holder.numProperties; i++) {
            var p = holder.property(i);
            if (p.matchName === MN_GROUP) {
                walkVectors(p.property(MN_VECTORS), chain.concat([p.name]), out, layer);
            } else if (p.matchName === MN_SHAPEGRP) {
                var path = p.property(MN_SHAPE);
                if (!path) { continue; }
                var ref = "";
                for (var c = 0; c < chain.length; c++) { ref += "content(" + estr(chain[c]) + ")."; }
                ref += "content(" + estr(p.name) + ").path";
                out.push(makeItem(layer, path, chain, p.name, ref, layer.name + " / " + p.name));
            }
        }
    }

    function scanPaths(comp, layers) {
        var out = [];
        var list = layers;
        if (!list) {
            list = [];
            for (var i = 1; i <= comp.numLayers; i++) { list.push(comp.layer(i)); }
        }
        for (var n = 0; n < list.length; n++) {
            var L = list[n];
            if (isControl(L)) { continue; }
            var masks = null;
            try { masks = L.property(MN_MASKS); } catch (e) { masks = null; }
            if (masks) {
                for (var m = 1; m <= masks.numProperties; m++) {
                    var mk = masks.property(m);
                    var mp = mk.property(MN_MASKSHAPE);
                    if (mp) {
                        out.push(makeItem(L, mp, [], mk.name,
                                          "mask(" + estr(mk.name) + ").maskPath",
                                          L.name + " / " + mk.name));
                    }
                }
            }
            var contents = null;
            try { contents = L.property(MN_CONTENTS); } catch (e) { contents = null; }
            if (contents) { walkVectors(contents, [], out, L); }
        }
        return out;
    }

    function primKind(mn) {
        if (mn === "ADBE Vector Shape - Rect") { return "rectangle"; }
        if (mn === "ADBE Vector Shape - Ellipse") { return "ellipse"; }
        if (mn === "ADBE Vector Shape - Star") { return "star"; }
        return null;
    }

    // Rectangles, ellipses and stars are not paths - After Effects keeps them
    // as a handful of numbers, and there is no vertex to rig until they are
    // converted. The panel still has to find them: a layer made of nothing but
    // a rectangle would otherwise come up blank, and the artwork looks lost.
    function scanPrimitives(comp, layers) {
        var out = [];
        var list = layers;
        if (!list) {
            list = [];
            for (var i = 1; i <= comp.numLayers; i++) { list.push(comp.layer(i)); }
        }
        for (var n = 0; n < list.length; n++) {
            var L = list[n];
            if (isControl(L)) { continue; }
            var contents = null;
            try { contents = L.property(MN_CONTENTS); } catch (e) { contents = null; }
            if (contents) { walkPrimitives(contents, [], out, L); }
        }
        return out;
    }

    function walkPrimitives(holder, chain, out, layer) {
        for (var i = 1; i <= holder.numProperties; i++) {
            var p = holder.property(i);
            if (p.matchName === MN_GROUP) {
                // A primitive nested inside a group counts just as much, and
                // the group's transforms are what place it on screen.
                walkPrimitives(p.property(MN_VECTORS), chain.concat([p.name]), out, layer);
            } else if (primKind(p.matchName)) {
                out.push({
                    layer: layer, prop: p, chain: chain, sname: p.name,
                    kind: primKind(p.matchName),
                    label: layer.name + " / " + p.name,
                    key: String(layer.id) + "/prim/" + chain.join("/") + "/" + p.name
                });
            }
        }
    }

    function selectedLayers(comp) {
        var sel = comp.selectedLayers, out = [];
        for (var i = 0; i < sel.length; i++) { out.push(sel[i]); }
        return out;
    }

    // --------------------------------------------------------- the manifest
    // Stored as the first line of the generated path expression:
    //   // VXR {"v":1,"pts":[{"i":3,"fx":"VXR L1","im":1,"of":"VXR L2"}]}
    //     i  vertex index
    //     fx Layer Control effect naming the point control
    //     im 1 when the in handle is a mask on the point control
    //     om 1 when the out handle is a mask on the point control
    //     if / of  Layer Control effect naming a separate handle control

    function readManifest(prop) {
        if (!prop.expressionEnabled) { return null; }
        var ex = String(prop.expression || "");
        var m = ex.match(new RegExp("^//\\s*" + TAG + "\\s+(\\{[\\s\\S]*?\\})\\s*$", "m"));
        if (!m) { return null; }
        var obj = dec(m[1]);
        if (!obj || !obj.pts) { return null; }
        return obj;
    }

    function isForeignRig(prop) {
        return prop.expressionEnabled && trim(String(prop.expression || "")) !== "" &&
               readManifest(prop) === null;
    }

    function manEntry(man, idx) {
        for (var i = 0; i < man.pts.length; i++) {
            if (man.pts[i].i === idx) { return man.pts[i]; }
        }
        return null;
    }

    function dropEntry(man, idx) {
        var keep = [];
        for (var i = 0; i < man.pts.length; i++) {
            if (man.pts[i].i !== idx) { keep.push(man.pts[i]); }
        }
        man.pts = keep;
    }

    // --------------------------------------------- generated path expression

    function chainRef(chain, upto) {
        var s = "";
        for (var i = 0; i < upto; i++) { s += "content(" + estr(chain[i]) + ")."; }
        return s;
    }

    function buildPathExpression(man, chain) {
        var L = [], i;
        L.push("// " + TAG + " " + enc(man));
        L.push("// " + NAME + " " + VERSION + " - move the controls, not this expression.");
        L.push("var _P = thisProperty.points();");
        L.push("var _I = thisProperty.inTangents();");
        L.push("var _O = thisProperty.outTangents();");
        L.push("var _C = thisProperty.isClosed();");
        L.push("function _lay(n) { try { return effect(n)(\"Layer\"); } catch (e) { return null; } }");

        if (chain.length) {
            L.push("function _ig(v, T) {");
            L.push("  var d = v - T.position;");
            L.push("  var r = -degreesToRadians(T.rotation);");
            L.push("  var c = Math.cos(r), s = Math.sin(r);");
            L.push("  d = [d[0] * c - d[1] * s, d[0] * s + d[1] * c];");
            L.push("  var k = T.scale / 100;");
            L.push("  return T.anchorPoint + [k[0] == 0 ? 0 : d[0] / k[0], k[1] == 0 ? 0 : d[1] / k[1]];");
            L.push("}");
            L.push("function _toG(v) {");
            for (i = 0; i < chain.length; i++) {
                L.push("  v = _ig(v, " + chainRef(chain, i + 1) + "transform);");
            }
            L.push("  return v;");
            L.push("}");
        } else {
            L.push("function _toG(v) { return v; }");
        }

        L.push("function _cp(n) {");
        L.push("  var l = _lay(n);");
        L.push("  if (l == null) { return null; }");
        L.push("  return _toG(fromCompToSurface(l.toComp([0, 0])));");
        L.push("}");
        L.push("function _mp(n, m) {");
        L.push("  var l = _lay(n);");
        L.push("  if (l == null) { return null; }");
        L.push("  var q;");
        L.push("  try { q = l.mask(m).maskPath.points()[1]; } catch (e) { return null; }");
        L.push("  return _toG(fromCompToSurface(l.toComp(q)));");
        L.push("}");
        L.push("var _v;");

        for (i = 0; i < man.pts.length; i++) {
            var e = man.pts[i];
            var at = "_P[" + e.i + "]";
            L.push("if (_P.length > " + e.i + ") {");
            L.push("  _v = _cp(" + estr(e.fx) + "); if (_v != null) { " + at + " = _v; }");
            var ri = restLit(e.ri), ro = restLit(e.ro);
            if (e.im) {
                L.push("  _v = _mp(" + estr(e.fx) + ", " + estr(MASK_IN) + "); if (_v != null) { _I[" + e.i + "] = _v - " + at + ri + "; }");
            } else if (e["if"]) {
                L.push("  _v = _cp(" + estr(e["if"]) + "); if (_v != null) { _I[" + e.i + "] = _v - " + at + ri + "; }");
            }
            if (e.om) {
                L.push("  _v = _mp(" + estr(e.fx) + ", " + estr(MASK_OUT) + "); if (_v != null) { _O[" + e.i + "] = _v - " + at + ro + "; }");
            } else if (e.of) {
                L.push("  _v = _cp(" + estr(e.of) + "); if (_v != null) { _O[" + e.i + "] = _v - " + at + ro + "; }");
            }
            L.push("}");
        }

        L.push("createPath(_P, _I, _O, _C);");
        return L.join("\n");
    }

    // Group space -> comp space, written as expression source. Used on a scratch
    // null so After Effects itself does the transform maths, which keeps control
    // placement exact for parented, 3D and camera-affected layers.
    function compOfExpression(layerIndex, chain, pt) {
        var L = [];
        L.push("var _L = thisComp.layer(" + layerIndex + ");");
        L.push("function _fg(v, T) {");
        L.push("  var d = v - T.anchorPoint;");
        L.push("  var k = T.scale / 100;");
        L.push("  d = [d[0] * k[0], d[1] * k[1]];");
        L.push("  var r = degreesToRadians(T.rotation);");
        L.push("  var c = Math.cos(r), s = Math.sin(r);");
        L.push("  return T.position + [d[0] * c - d[1] * s, d[0] * s + d[1] * c];");
        L.push("}");
        L.push("var _v = [" + pt[0] + ", " + pt[1] + "];");
        for (var i = chain.length - 1; i >= 0; i--) {
            L.push("_v = _fg(_v, _L." + chainRef(chain, i + 1) + "transform);");
        }
        L.push("var _q = _L.toComp(_v);");
        L.push("[_q[0], _q[1]];");
        return L.join("\n");
    }

    // A scratch null that evaluates group-space points into comp space.
    function Probe(comp) {
        this.comp = comp;
        this.layer = comp.layers.addNull();
        this.layer.name = TAG + " probe";
        this.layer.enabled = false;
        this.layer.shy = true;
    }

    Probe.prototype.eval = function (src, t, fallback) {
        var p = this.layer.transform.position;
        try {
            p.expression = src;
            var v = p.valueAtTime(t, false);
            // After Effects disables an expression it cannot run instead of throwing.
            if (!p.expressionEnabled) { return fallback; }
            try { if (trim(String(p.expressionError || "")) !== "") { return fallback; } } catch (e1) {}
            if (!(v instanceof Array) || !isFinite(v[0]) || !isFinite(v[1])) { return fallback; }
            return [Number(v[0]), Number(v[1])];
        } catch (e) {
            return fallback;
        }
    };

    Probe.prototype.at = function (item, pt, t) {
        return this.eval(compOfExpression(item.layer.index, item.chain, pt), t,
                         mPt(itemMatrix(item, t), pt));
    };

    Probe.prototype.done = function () {
        try { this.layer.remove(); } catch (e) {}
    };

    // ----------------------------------------------------------- preferences

    var P = {
        shape: "circle",          // circle | square | diamond | triangle
        size: 14,
        outline: true,
        guide: true,
        handleMode: "masks",      // masks | layers
        colPoint: [0.25, 0.70, 1.00],
        colHandle: [1.00, 0.76, 0.24],
        colPivot: [0.47, 0.93, 0.45],
        colFollow: [1.00, 0.42, 0.78],
        bakeWorkArea: true
    };

    function prefGet(key, def) {
        try {
            if (app.settings.haveSetting(PREFS, key)) {
                var raw = app.settings.getSetting(PREFS, key);
                var v = dec(raw);
                return (v === null || v === undefined) ? def : v;
            }
        } catch (e) {}
        return def;
    }

    function loadPrefs() {
        for (var k in P) {
            if (P.hasOwnProperty(k)) { P[k] = prefGet(k, P[k]); }
        }
    }

    function savePrefs() {
        for (var k in P) {
            if (P.hasOwnProperty(k)) {
                try { app.settings.saveSetting(PREFS, k, enc(P[k])); } catch (e) {}
            }
        }
    }

    function colorFor(kind) {
        if (kind === K_HANDLE) { return P.colHandle; }
        if (kind === K_PIVOT) { return P.colPivot; }
        if (kind === K_FOLLOW || kind === K_AVG) { return P.colFollow; }
        return P.colPoint;
    }

    function labelFor(kind) {
        if (kind === K_HANDLE) { return 11; }
        if (kind === K_PIVOT) { return 9; }
        if (kind === K_FOLLOW || kind === K_AVG) { return 14; }
        return 13;
    }

    // --------------------------------------------------- control layer build

    var KAPPA = 0.5522847498;

    // Each control gets its own silhouette so the rig reads at a glance.
    function markerShape(kind, r) {
        var sh = new Shape();
        sh.closed = true;
        if (kind === K_POINT && P.shape === "circle") {
            sh.vertices = [[0, -r], [r, 0], [0, r], [-r, 0]];
            var k = r * KAPPA;
            sh.inTangents = [[-k, 0], [0, -k], [k, 0], [0, k]];
            sh.outTangents = [[k, 0], [0, k], [-k, 0], [0, -k]];
            return sh;
        }
        if (kind === K_PIVOT) {
            var o = r, i2 = r * 0.42;
            sh.vertices = [[0, -o], [i2, -i2], [o, 0], [i2, i2], [0, o], [-i2, i2], [-o, 0], [-i2, -i2]];
        } else if (kind === K_HANDLE) {
            sh.vertices = [[0, -r], [r, 0], [0, r], [-r, 0]];
        } else if (kind === K_FOLLOW || kind === K_AVG) {
            sh.vertices = [[0, -r], [r * 0.87, r * 0.5], [-r * 0.87, r * 0.5]];
        } else if (P.shape === "square") {
            sh.vertices = [[-r, -r], [r, -r], [r, r], [-r, r]];
        } else if (P.shape === "diamond") {
            sh.vertices = [[0, -r], [r, 0], [0, r], [-r, 0]];
        } else if (P.shape === "triangle") {
            sh.vertices = [[0, -r], [r * 0.87, r * 0.5], [-r * 0.87, r * 0.5]];
        } else {
            sh.vertices = [[-r, -r], [r, -r], [r, r], [-r, r]];
        }
        var z = [];
        for (var n = 0; n < sh.vertices.length; n++) { z.push([0, 0]); }
        sh.inTangents = z;
        sh.outTangents = z;
        return sh;
    }

    function uniqueLayerName(comp, base) {
        var taken = {};
        for (var i = 1; i <= comp.numLayers; i++) { taken[comp.layer(i).name] = true; }
        if (!taken[base]) { return base; }
        for (var n = 2; n < 10000; n++) {
            if (!taken[base + " " + n]) { return base + " " + n; }
        }
        return base + " " + (new Date()).getTime();
    }

    function makeControl(comp, name, kind, pos) {
        var size = Math.max(4, Number(P.size) || 14);
        var r = size / 2;
        var col = colorFor(kind);

        var L = comp.layers.addShape();
        L.name = uniqueLayerName(comp, name);
        var grp = L.property(MN_CONTENTS).addProperty(MN_GROUP);
        grp.name = "Marker";
        var vecs = grp.property(MN_VECTORS);

        var shp = vecs.addProperty(MN_SHAPEGRP);
        shp.name = "Marker Path";
        shp.property(MN_SHAPE).setValue(markerShape(kind, r));

        if (P.outline) {
            var st = vecs.addProperty(MN_STROKE);
            st.property("ADBE Vector Stroke Color").setValue([0, 0, 0, 1]);
            st.property("ADBE Vector Stroke Width").setValue(Math.max(1, Math.round(size / 8)));
        }
        var fl = vecs.addProperty(MN_FILL);
        fl.property("ADBE Vector Fill Color").setValue([col[0], col[1], col[2], 1]);

        L.transform.anchorPoint.setValue([0, 0]);
        L.transform.position.setValue([pos[0], pos[1]]);
        L.label = labelFor(kind);
        L.guideLayer = !!P.guide;
        markControl(L, kind);
        return L;
    }

    // A thin leash drawn from a handle control back to the point it belongs to.
    function addLeash(handleLayer, linkEffectName) {
        var grp = handleLayer.property(MN_CONTENTS).addProperty(MN_GROUP);
        grp.name = "Leash";
        var vecs = grp.property(MN_VECTORS);
        var shp = vecs.addProperty(MN_SHAPEGRP);
        shp.name = "Leash Path";
        shp.property(MN_SHAPE).expression =
            "var l = null;\n" +
            "try { l = effect(" + estr(linkEffectName) + ")(\"Layer\"); } catch (e) { l = null; }\n" +
            "var b = l == null ? [0, 0] : fromCompToSurface(l.toComp([0, 0]));\n" +
            "createPath([[0, 0], b], [[0, 0], [0, 0]], [[0, 0], [0, 0]], false);";
        var st = vecs.addProperty(MN_STROKE);
        var col = colorFor(K_HANDLE);
        st.property("ADBE Vector Stroke Color").setValue([col[0], col[1], col[2], 1]);
        st.property("ADBE Vector Stroke Width").setValue(1.5);
        st.property("ADBE Vector Stroke Opacity").setValue(55);
        // Draw the leash under the marker.
        try { grp.moveTo(handleLayer.property(MN_CONTENTS).numProperties); } catch (e) {}
    }

    // ------------------------------------------------------- link effects

    function effectsOf(layer) {
        var fx = layer.property(MN_EFFECTS);
        if (!fx) { throw new Error("Layer \"" + layer.name + "\" cannot hold effects."); }
        return fx;
    }

    function freeLinkName(layer) {
        var fx = effectsOf(layer);
        var taken = {};
        for (var i = 1; i <= fx.numProperties; i++) { taken[fx.property(i).name] = true; }
        for (var n = 1; n < 100000; n++) {
            var nm = TAG + " L" + n;
            if (!taken[nm]) { return nm; }
        }
        return TAG + " L" + (new Date()).getTime();
    }

    function addLink(layer, target) {
        var fx = effectsOf(layer);
        var nm = freeLinkName(layer);
        var e = fx.addProperty(MN_LAYERCTL);
        e.name = nm;
        e.property(1).setValue(target.index);
        return nm;
    }

    function findEffect(layer, name) {
        var fx = null;
        try { fx = layer.property(MN_EFFECTS); } catch (e) { return null; }
        if (!fx) { return null; }
        for (var i = 1; i <= fx.numProperties; i++) {
            if (fx.property(i).name === name) { return fx.property(i); }
        }
        return null;
    }

    function linkedLayer(layer, name) {
        var e = findEffect(layer, name);
        if (!e) { return null; }
        var idx = 0;
        try { idx = e.property(1).value; } catch (err) { return null; }
        if (!idx) { return null; }
        try { return layer.containingComp.layer(idx); } catch (err2) { return null; }
    }

    function removeEffect(layer, name) {
        var e = findEffect(layer, name);
        if (e) { try { e.remove(); } catch (err) {} }
    }

    // Link effects nobody references any more.
    function pruneLinks(layer) {
        var fx = null;
        try { fx = layer.property(MN_EFFECTS); } catch (e) { return; }
        if (!fx) { return; }
        var used = {};
        var items = scanPaths(layer.containingComp, [layer]);
        for (var i = 0; i < items.length; i++) {
            var man = readManifest(items[i].prop);
            if (!man) { continue; }
            for (var k = 0; k < man.pts.length; k++) {
                var e = man.pts[k];
                if (e.fx) { used[e.fx] = true; }
                if (e["if"]) { used[e["if"]] = true; }
                if (e.of) { used[e.of] = true; }
            }
        }
        for (var n = fx.numProperties; n >= 1; n--) {
            var p = fx.property(n);
            if (p.name.substring(0, TAG.length + 2) === TAG + " L" && !used[p.name]) {
                try { p.remove(); } catch (err) {}
            }
        }
    }

    // ------------------------------------------------------------ messaging

    var UI = {
        say: function () {},
        refresh: function () {}
    };

    var UNDO_CMD = 16;   // After Effects' Undo command id, not a menu name

    function undoLast() {
        try { app.executeCommand(UNDO_CMD); return; } catch (e) {}
        try { app.executeCommand(app.findMenuCommandId("Undo")); } catch (e2) {}
    }

    // One undo per action: on any failure the whole action is rolled back.
    function run(title, fn) {
        var comp = activeComp();
        if (!comp) { UI.say("Open a composition first."); return false; }
        app.beginUndoGroup(NAME + ": " + title);
        var out;
        try {
            out = fn(comp);
        } catch (e) {
            try { app.endUndoGroup(); } catch (e2) {}
            undoLast();
            UI.say("Rolled back - " + e.toString());
            UI.refresh();
            return false;
        }
        app.endUndoGroup();
        UI.refresh();
        if (typeof out === "string") { UI.say(out); }
        return true;
    }

    Probe.prototype.intoLayer = function (layer, compPt, t) {
        return this.eval("var _L = thisComp.layer(" + layer.index + ");\n" +
                         "var _q = _L.fromComp([" + compPt[0] + ", " + compPt[1] + "]);\n" +
                         "[_q[0], _q[1]];",
                         t, mPt(mInv(layerMatrix(layer, t)), compPt));
    };

    Probe.prototype.outOfLayer = function (layer, layerPt, t) {
        return this.eval("var _L = thisComp.layer(" + layer.index + ");\n" +
                         "var _q = _L.toComp([" + layerPt[0] + ", " + layerPt[1] + "]);\n" +
                         "[_q[0], _q[1]];",
                         t, mPt(layerMatrix(layer, t), layerPt));
    };

    // ------------------------------------- parametric shapes -> bezier paths

    function kTan(r) { return r * KAPPA; }

    function rectBezier(size, pos, round) {
        var w = size[0] / 2, h = size[1] / 2;
        var r = Math.max(0, Math.min(Number(round) || 0, Math.min(w, h)));
        var cx = pos[0], cy = pos[1];
        var sh = new Shape();
        sh.closed = true;
        if (r <= 0.0001) {
            sh.vertices = [[cx + w, cy - h], [cx + w, cy + h], [cx - w, cy + h], [cx - w, cy - h]];
            sh.inTangents = [[0, 0], [0, 0], [0, 0], [0, 0]];
            sh.outTangents = [[0, 0], [0, 0], [0, 0], [0, 0]];
            return sh;
        }
        var k = kTan(r);
        sh.vertices = [
            [cx + w, cy - h + r], [cx + w, cy + h - r], [cx + w - r, cy + h],
            [cx - w + r, cy + h], [cx - w, cy + h - r], [cx - w, cy - h + r],
            [cx - w + r, cy - h], [cx + w - r, cy - h]
        ];
        sh.inTangents = [[0, -k], [0, 0], [k, 0], [0, 0], [0, k], [0, 0], [-k, 0], [0, 0]];
        sh.outTangents = [[0, 0], [0, k], [0, 0], [-k, 0], [0, 0], [0, -k], [0, 0], [k, 0]];
        return sh;
    }

    function ellipseBezier(size, pos) {
        var rx = size[0] / 2, ry = size[1] / 2;
        var cx = pos[0], cy = pos[1];
        var kx = kTan(rx), ky = kTan(ry);
        var sh = new Shape();
        sh.closed = true;
        sh.vertices = [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]];
        sh.inTangents = [[-kx, 0], [0, -ky], [kx, 0], [0, ky]];
        sh.outTangents = [[kx, 0], [0, ky], [-kx, 0], [0, -ky]];
        return sh;
    }

    function starBezier(isStar, pts, pos, rot, rOut, rIn, roundOut, roundIn) {
        var n = Math.max(3, Math.round(pts));
        var total = isStar ? n * 2 : n;
        var step = (Math.PI * 2) / total;
        var start = (Number(rot) || 0) * Math.PI / 180 - Math.PI / 2;
        var sh = new Shape();
        sh.closed = true;
        var v = [], ins = [], outs = [];
        for (var i = 0; i < total; i++) {
            var outer = !isStar || (i % 2 === 0);
            var r = outer ? rOut : rIn;
            var a = start + step * i;
            var px = pos[0] + Math.cos(a) * r;
            var py = pos[1] + Math.sin(a) * r;
            v.push([px, py]);
            // Roundness bulges the corner along the circle's tangent, which is
            // how After Effects draws it for the usual cases.
            var rn = (outer ? (Number(roundOut) || 0) : (Number(roundIn) || 0)) / 100;
            var len = rn * r * step * 0.5;
            var tx = -Math.sin(a) * len, ty = Math.cos(a) * len;
            ins.push([-tx, -ty]);
            outs.push([tx, ty]);
        }
        sh.vertices = v;
        sh.inTangents = ins;
        sh.outTangents = outs;
        return sh;
    }

    function parametricShape(prop, t) {
        var mn = prop.matchName;
        if (mn === "ADBE Vector Shape - Rect") {
            return rectBezier(xy(val(prop.property("ADBE Vector Rect Size"), t, [100, 100])),
                              xy(val(prop.property("ADBE Vector Rect Position"), t, [0, 0])),
                              Number(val(prop.property("ADBE Vector Rect Roundness"), t, 0)) || 0);
        }
        if (mn === "ADBE Vector Shape - Ellipse") {
            return ellipseBezier(xy(val(prop.property("ADBE Vector Ellipse Size"), t, [100, 100])),
                                 xy(val(prop.property("ADBE Vector Ellipse Position"), t, [0, 0])));
        }
        if (mn === "ADBE Vector Shape - Star") {
            var isStar = (Number(val(prop.property("ADBE Vector Star Type"), t, 1)) || 1) === 1;
            return starBezier(isStar,
                Number(val(prop.property("ADBE Vector Star Points"), t, 5)) || 5,
                xy(val(prop.property("ADBE Vector Star Position"), t, [0, 0])),
                Number(val(prop.property("ADBE Vector Star Rotation"), t, 0)) || 0,
                Number(val(prop.property("ADBE Vector Star Outer Radius"), t, 100)) || 100,
                Number(val(prop.property("ADBE Vector Star Inner Radius"), t, 50)) || 50,
                Number(val(prop.property("ADBE Vector Star Outer Roundess"), t, 0)) || 0,
                Number(val(prop.property("ADBE Vector Star Inner Roundess"), t, 0)) || 0);
        }
        return null;
    }

    function findParametric(holder, out) {
        for (var i = 1; i <= holder.numProperties; i++) {
            var p = holder.property(i);
            if (p.matchName === MN_GROUP) {
                findParametric(p.property(MN_VECTORS), out);
            } else if (primKind(p.matchName)) {
                out.push(p);
            }
        }
        return out;
    }

    function actToBezier(layers) {
        return run("Convert to Bezier", function (comp) {
            var done = 0;
            for (var n = 0; n < layers.length; n++) {
                var L = layers[n];
                var contents = null;
                try { contents = L.property(MN_CONTENTS); } catch (e) { continue; }
                if (!contents) { continue; }
                // Converting one shape renumbers its group's children, which
                // makes stale every Property object already collected for that
                // group - so take one at a time and look again each round.
                // skip steps past anything that cannot be converted, which
                // would otherwise come back first for ever.
                var skip = 0, guard = 0;
                while (guard++ < 1000) {
                    var list = findParametric(contents, []);
                    if (skip >= list.length) { break; }
                    var prop = list[skip];
                    var sh = parametricShape(prop, comp.time);
                    if (!sh) { skip++; continue; }
                    var holder = prop.propertyGroup(1);
                    var at = prop.propertyIndex;
                    var nm = prop.name;
                    // Adding to a shape group renumbers its children, which
                    // invalidates every Property object already held for them.
                    // Drop the old path first, while its reference is still good.
                    prop.remove();
                    var ng = holder.addProperty(MN_SHAPEGRP);
                    ng.property(MN_SHAPE).setValue(sh);
                    try { ng.name = nm; } catch (e2) {}
                    try { ng.moveTo(at); } catch (e3) {}
                    done++;
                }
            }
            if (!done) { return "Nothing to convert - no rectangles, ellipses or stars found."; }
            return "Converted " + done + " parametric shape" + (done === 1 ? "" : "s") + " to bezier.";
        });
    }

    // ------------------------------------------------------ create controls

    function chainSkewed(item, t) {
        var holder = item.layer.property(MN_CONTENTS);
        for (var i = 0; i < item.chain.length; i++) {
            var g = holder.property(item.chain[i]);
            if (!g) { return false; }
            var sk = g.property(MN_GXFORM).property("ADBE Vector Skew");
            if (sk && Math.abs(Number(val(sk, t, 0)) || 0) > 0.0001) { return true; }
            holder = g.property(MN_VECTORS);
        }
        return false;
    }

    function basePath(item, t) {
        try { return item.prop.valueAtTime(t, false); } catch (e) { return item.prop.value; }
    }

    // Put a control on every picked point that has not got one yet, and, when
    // handles are asked for, give handles both to the new controls and to the
    // points that were already rigged without them. Returns a tally; the caller
    // owns the undo group, so Pivot can rig and group in one step.
    function rigPoints(comp, probe, picks, withHandles) {
        var r = { made: 0, handled: 0, skipped: 0, foreign: 0, skewed: 0 };
        for (var n = 0; n < picks.length; n++) {
            var item = picks[n].item, idxs = picks[n].idx;
            if (!item) { continue; }
            if (isForeignRig(item.prop)) { r.foreign++; continue; }
            if (chainSkewed(item, comp.time)) { r.skewed++; }
            var man = readManifest(item.prop) || { v: 1, pts: [] };
            var sh = basePath(item, comp.time);
            var upp = (withHandles && sh.vertices.length)
                ? unitsPerPixel(probe, item, sh.vertices[0], comp.time) : 1;
            var touched = false;
            for (var k = 0; k < idxs.length; k++) {
                var i = idxs[k];
                if (i >= sh.vertices.length) { continue; }
                var entry = manEntry(man, i);
                if (entry) {
                    // Already has a control. Only the missing handles are left
                    // to do, and addHandlesTo leaves the ones it finds alone.
                    var ctrl = linkedLayer(item.layer, entry.fx);
                    if (!withHandles || !ctrl) { r.skipped++; continue; }
                    var full = (entry.im || entry["if"]) && (entry.om || entry.of);
                    if (full) { r.skipped++; continue; }
                    addHandlesTo(comp, probe, item, sh, entry, ctrl, upp);
                    r.handled++;
                    touched = true;
                    continue;
                }
                var cp = probe.at(item, sh.vertices[i], comp.time);
                var fresh = makeControl(comp, item.layer.name + " Pt " + (i + 1), K_POINT, cp);
                entry = { i: i, fx: addLink(item.layer, fresh) };
                man.pts.push(entry);
                r.made++;
                touched = true;
                if (withHandles) {
                    addHandlesTo(comp, probe, item, sh, entry, fresh, upp);
                }
            }
            if (touched) {
                man.pts.sort(function (a, b) { return a.i - b.i; });
                item.prop.expression = buildPathExpression(man, item.chain);
            }
        }
        return r;
    }

    function rigReport(r, withHandles) {
        if (!r.made && !r.handled) {
            if (r.foreign) { return "Skipped - those paths already carry another tool's expression."; }
            if (r.skipped) {
                return withHandles
                    ? "Those points already have controls and handles."
                    : "Those points already have controls.";
            }
            return "Pick some points first.";
        }
        var bits = [];
        if (r.made) {
            bits.push("rigged " + r.made + " point" + (r.made === 1 ? "" : "s") +
                      (withHandles ? " with handles" : ""));
        }
        if (r.handled) {
            bits.push("added handles to " + r.handled +
                      " point" + (r.handled === 1 ? "" : "s") + " already rigged");
        }
        var msg = bits.join(", ") + ".";
        msg = msg.substring(0, 1).toUpperCase() + msg.substring(1);
        if (r.skipped) { msg += " " + r.skipped + " needed nothing."; }
        if (r.foreign) { msg += " " + r.foreign + " path(s) skipped: foreign expression."; }
        if (r.skewed) { msg += " Warning: " + r.skewed + " group(s) use Skew, which the rig cannot undo."; }
        return msg;
    }

    function actCreate(picks, withHandles) {
        return run(withHandles ? "Create controls with handles" : "Create controls", function (comp) {
            // Rigging hands a point to a control that sits exactly where it
            // already was, so the curve must come out identical to the pixel.
            var before = allPathSignature(comp);
            var probe = new Probe(comp);
            var r;
            try {
                r = rigPoints(comp, probe, picks, withHandles);
            } finally {
                probe.done();
            }
            checkUnchanged(comp, before, "Rigging");
            return rigReport(r, withHandles);
        });
    }

    // ------------------------------------------------------ bezier handles

    function addMaskHandle(ctrl, name, offset) {
        var masks = ctrl.property(MN_MASKS);
        for (var i = 1; i <= masks.numProperties; i++) {
            if (masks.property(i).name === name) { return masks.property(i); }
        }
        var mk = masks.addProperty(MN_MASK);
        mk.name = name;
        mk.maskMode = MaskMode.NONE;
        var col = colorFor(K_HANDLE);
        try { mk.color = [col[0], col[1], col[2]]; } catch (e) {}
        var sh = new Shape();
        sh.closed = false;
        sh.vertices = [[0, 0], [offset[0], offset[1]]];
        sh.inTangents = [[0, 0], [0, 0]];
        sh.outTangents = [[0, 0], [0, 0]];
        mk.property(MN_MASKSHAPE).setValue(sh);
        return mk;
    }

    // How far off its vertex a resting handle stands, in composition pixels.
    // It has to be measured on screen: path data lives in the shape group's
    // own units, and a group scaled to 878% turns a 20-unit stand-off into a
    // 176-pixel one, which is most of the artwork.
    var HANDLE_REST_PX = 24;

    // One composition pixel, in the units this path is drawn in. The whole
    // chain down to the comp is affine, so one sample serves every vertex.
    function unitsPerPixel(probe, item, at, t) {
        var o = probe.at(item, at, t);
        var x = probe.at(item, [at[0] + 1, at[1]], t);
        var y = probe.at(item, [at[0], at[1] + 1], t);
        var dx = Math.sqrt((x[0] - o[0]) * (x[0] - o[0]) + (x[1] - o[1]) * (x[1] - o[1]));
        var dy = Math.sqrt((y[0] - o[0]) * (y[0] - o[0]) + (y[1] - o[1]) * (y[1] - o[1]));
        var d = (dx + dy) / 2;
        if (!isFinite(d) || d < 1e-9) { return 1; }
        return 1 / d;
    }

    // Where to stand a resting handle: back along the path for the in handle,
    // on along it for the out one, which is where the eye looks for them.
    function restOffset(sh, i, back, len) {
        var n = sh.vertices.length;
        var j = back ? i - 1 : i + 1, flip = 1;
        if (j < 0 || j >= n) {
            if (sh.closed) { j = (j + n) % n; }
            else { j = back ? i + 1 : i - 1; flip = -1; }
        }
        if (j < 0 || j >= n) { return back ? [-len, 0] : [len, 0]; }
        var d = [(sh.vertices[j][0] - sh.vertices[i][0]) * flip,
                 (sh.vertices[j][1] - sh.vertices[i][1]) * flip];
        var m = Math.sqrt(d[0] * d[0] + d[1] * d[1]);
        if (!isFinite(m) || m < 1e-6) { return back ? [-len, 0] : [len, 0]; }
        return [d[0] / m * len, d[1] / m * len];
    }

    // Give one already-rigged point its two bezier handle controls.
    function addHandlesTo(comp, probe, item, sh, entry, ctrl, upp) {
        var i = entry.i;
        var vtx = sh.vertices[i];
        var pairs = [
            { key: "in", tan: sh.inTangents[i], mask: MASK_IN, mf: "if", mm: "im", rk: "ri", lbl: "In" },
            { key: "out", tan: sh.outTangents[i], mask: MASK_OUT, mf: "of", mm: "om", rk: "ro", lbl: "Out" }
        ];
        for (var p = 0; p < pairs.length; p++) {
            var pr = pairs[p];
            if (entry[pr.mm] || entry[pr.mf]) { continue; }
            var t = pr.tan || [0, 0];
            if (Math.abs(t[0]) < 0.001 && Math.abs(t[1]) < 0.001) {
                // A corner has no tangent to show. Parking the handle on the
                // vertex leaves nothing to grab, and inventing a tangent
                // rounds the corner off - so stand it off along the path and
                // record the stand-off, which the expression takes back out.
                // The corner stays a corner until the handle is really moved.
                t = restOffset(sh, i, pr.key === "in", (Number(upp) || 1) * HANDLE_REST_PX);
                entry[pr.rk] = [t[0], t[1]];
            }
            var compPt = probe.at(item, [vtx[0] + t[0], vtx[1] + t[1]], comp.time);
            if (P.handleMode === "masks") {
                var off = probe.intoLayer(ctrl, compPt, comp.time);
                addMaskHandle(ctrl, pr.mask, off);
                entry[pr.mm] = 1;
            } else {
                var h = makeControl(comp, ctrl.name + " " + pr.lbl, K_HANDLE, compPt);
                addLeash(h, addLink(h, ctrl));
                try { h.parent = ctrl; } catch (e) {}
                entry[pr.mf] = addLink(item.layer, h);
            }
        }
    }

    // Swap every handle on the picked points between masks and separate layers.
    function actSwitchHandleMode(picks, mode) {
        return run("Handles as " + mode, function (comp) {
            var probe = new Probe(comp);
            var moved = 0;
            try {
                for (var n = 0; n < picks.length; n++) {
                    var item = picks[n].item, idxs = picks[n].idx;
                    var man = readManifest(item.prop);
                    if (!man) { continue; }
                    var sh = basePath(item, comp.time);
                    var touched = false;
                    for (var k = 0; k < idxs.length; k++) {
                        var entry = manEntry(man, idxs[k]);
                        if (!entry) { continue; }
                        var ctrl = linkedLayer(item.layer, entry.fx);
                        if (!ctrl) { continue; }
                        var pairs = [
                            { mask: MASK_IN, mf: "if", mm: "im", lbl: "In" },
                            { mask: MASK_OUT, mf: "of", mm: "om", lbl: "Out" }
                        ];
                        for (var p = 0; p < pairs.length; p++) {
                            var pr = pairs[p];
                            var world = null;
                            if (mode === "layers" && entry[pr.mm]) {
                                var mk = null;
                                var masks = ctrl.property(MN_MASKS);
                                for (var m = 1; m <= masks.numProperties; m++) {
                                    if (masks.property(m).name === pr.mask) { mk = masks.property(m); }
                                }
                                if (!mk) { continue; }
                                var lp = mk.property(MN_MASKSHAPE).valueAtTime(comp.time, false).vertices[1];
                                world = probe.outOfLayer(ctrl, lp, comp.time);
                                try { mk.remove(); } catch (e) {}
                                entry[pr.mm] = 0;
                                var h = makeControl(comp, ctrl.name + " " + pr.lbl, K_HANDLE, world);
                                addLeash(h, addLink(h, ctrl));
                                try { h.parent = ctrl; } catch (e9) {}
                                entry[pr.mf] = addLink(item.layer, h);
                                moved++;
                                touched = true;
                            } else if (mode === "masks" && entry[pr.mf]) {
                                var hl = linkedLayer(item.layer, entry[pr.mf]);
                                if (!hl) { continue; }
                                var wc = probe.outOfLayer(hl, [0, 0], comp.time);
                                var off = probe.intoLayer(ctrl, wc, comp.time);
                                addMaskHandle(ctrl, pr.mask, off);
                                removeEffect(item.layer, entry[pr.mf]);
                                try { hl.remove(); } catch (e2) {}
                                entry[pr.mf] = null;
                                delete entry[pr.mf];
                                entry[pr.mm] = 1;
                                moved++;
                                touched = true;
                            }
                        }
                    }
                    if (touched) { item.prop.expression = buildPathExpression(man, item.chain); }
                }
            } finally {
                probe.done();
            }
            return moved ? "Switched " + moved + " handle set to " + mode + "."
                         : "Nothing to switch.";
        });
    }

    // --------------------------------------------------------------- pivots

    function sameLayer(a, b) { return a && b && a.id === b.id; }

    function dedupeLayers(list) {
        var seen = {}, out = [];
        for (var i = 0; i < list.length; i++) {
            if (list[i] && !seen[list[i].id]) { seen[list[i].id] = true; out.push(list[i]); }
        }
        return out;
    }

    function pickedControls(picks) {
        var out = [];
        for (var n = 0; n < picks.length; n++) {
            var item = picks[n].item;
            var man = readManifest(item.prop);
            if (!man) { continue; }
            for (var k = 0; k < picks[n].idx.length; k++) {
                var e = manEntry(man, picks[n].idx[k]);
                if (!e) { continue; }
                var c = linkedLayer(item.layer, e.fx);
                if (c) { out.push(c); }
            }
        }
        return dedupeLayers(out);
    }

    function childrenOf(comp, layer) {
        var out = [];
        for (var i = 1; i <= comp.numLayers; i++) {
            var L = comp.layer(i);
            if (L.parent && sameLayer(L.parent, layer)) { out.push(L); }
        }
        return out;
    }

    function releaseChildren(comp, layer) {
        var kids = childrenOf(comp, layer);
        for (var i = 0; i < kids.length; i++) {
            try { kids[i].parent = null; } catch (e) {}   // keeps the world transform
        }
    }

    var PIVOT_OFFSET = TAG + " Pivot Offset";

    // Also run over an existing pivot, so a rig built before this was right
    // is put right the next time it is touched rather than having to be redone.
    function setPivotExpressions(piv) {
        var e = findEffect(piv, PIVOT_OFFSET);
        if (!e) {
            e = effectsOf(piv).addProperty(MN_POINTCTL);
            e.name = PIVOT_OFFSET;
            e.property(1).setValue([0, 0]);
        }
        // The offset is the centre of rotation and scale, so it has to land
        // on the position: a child's comp point is position + rot*scale*(its
        // own point - anchor), which turns about wherever position puts the
        // anchor. Rolling rotation into position instead - as this once did -
        // makes the two copies of the offset cancel, and every child goes on
        // turning about the untouched centre.
        //
        // The anchor takes the offset back out in the layer's own units, so
        // dragging the offset leaves the artwork where it is, at any scale.
        piv.transform.anchorPoint.expression =
            "var d = effect(" + estr(PIVOT_OFFSET) + ")(\"Point\");\n" +
            "var k = scale / 100;\n" +
            "value + [k[0] == 0 ? 0 : d[0] / k[0], k[1] == 0 ? 0 : d[1] / k[1]];";
        piv.transform.position.expression =
            "value + effect(" + estr(PIVOT_OFFSET) + ")(\"Point\");";
    }

    function makePivot(comp, pos) {
        var piv = makeControl(comp, "Pivot", K_PIVOT, pos);
        setPivotExpressions(piv);
        return piv;
    }

    function actPivot(picks, extraLayers) {
        return run("Create Pivot", function (comp) {
            // Picking points and pressing Pivot used to do nothing unless they
            // had been rigged first. Rig whatever still needs it, then group.
            var rigged = null;
            var probe = new Probe(comp);
            try {
                rigged = rigPoints(comp, probe, picks, false);
            } finally {
                probe.done();
            }
            // pickedControls re-reads the manifest off the live property, so
            // it already sees whatever was just rigged.
            var ctrls = pickedControls(picks);
            for (var i = 0; i < extraLayers.length; i++) {
                var k = kindOf(extraLayers[i]);
                if (k === K_POINT || k === K_PIVOT) { ctrls.push(extraLayers[i]); }
            }
            ctrls = dedupeLayers(ctrls);
            if (ctrls.length < 1) { return "Pick some points, or select their controls, first."; }

            var sx = 0, sy = 0;
            for (i = 0; i < ctrls.length; i++) {
                var w = mPt(layerMatrix(ctrls[i], comp.time), [0, 0]);
                sx += w[0];
                sy += w[1];
            }
            var piv = makePivot(comp, [sx / ctrls.length, sy / ctrls.length]);
            var done = 0;
            for (i = 0; i < ctrls.length; i++) {
                if (sameLayer(ctrls[i], piv)) { continue; }
                try { ctrls[i].parent = piv; done++; } catch (e) {}
            }
            piv.selected = true;
            var msg = "Pivot driving " + done + " control" + (done === 1 ? "" : "s") + ".";
            if (rigged && rigged.made) {
                msg += " Rigged " + rigged.made + " new point" +
                       (rigged.made === 1 ? "" : "s") + " on the way.";
            }
            return msg;
        });
    }

    function actAddToPivot(picks, selLayers) {
        return run("Add to Pivot", function (comp) {
            var piv = null;
            for (var i = 0; i < selLayers.length; i++) {
                if (kindOf(selLayers[i]) === K_PIVOT) { piv = selLayers[i]; break; }
            }
            if (!piv) { return "Select the Pivot layer as well."; }
            setPivotExpressions(piv);
            var ctrls = pickedControls(picks);
            for (i = 0; i < selLayers.length; i++) {
                if (kindOf(selLayers[i]) === K_POINT) { ctrls.push(selLayers[i]); }
            }
            ctrls = dedupeLayers(ctrls);
            var done = 0;
            for (i = 0; i < ctrls.length; i++) {
                if (sameLayer(ctrls[i], piv)) { continue; }
                try { ctrls[i].parent = piv; done++; } catch (e) {}
            }
            return done ? "Added " + done + " control(s) to " + piv.name + "." : "Nothing to add.";
        });
    }

    function actRelease(picks, selLayers) {
        return run("Release from Pivot", function (comp) {
            var ctrls = pickedControls(picks);
            for (var i = 0; i < selLayers.length; i++) {
                // Selecting the Pivot means "free the things hanging off it",
                // not "free the Pivot", which is almost never parented itself.
                if (kindOf(selLayers[i]) === K_PIVOT) {
                    var kids = childrenOf(comp, selLayers[i]);
                    for (var k = 0; k < kids.length; k++) { ctrls.push(kids[k]); }
                } else if (isControl(selLayers[i])) {
                    ctrls.push(selLayers[i]);
                }
            }
            ctrls = dedupeLayers(ctrls);
            var done = 0;
            for (i = 0; i < ctrls.length; i++) {
                if (ctrls[i].parent) {
                    try { ctrls[i].parent = null; done++; } catch (e) {}
                }
            }
            return done ? "Released " + done + " control(s)." : "Nothing was parented.";
        });
    }

    // ------------------------------------------------------------ followers

    var FX_PATH = TAG + " Path";
    var FX_OFFSET = TAG + " Offset";
    var FX_FOLLOWROT = TAG + " Follow Rotation";
    var FX_FOLLOWSCL = TAG + " Follow Scale";

    // A point read off a path is in the shape group's own space; toComp wants
    // layer space. Every group transform in between has to be applied first,
    // or a follower crawls round a path the size of the raw numbers while the
    // artwork is drawn nine times bigger - which reads as barely moving.
    function groupToLayerExpr(chain) {
        if (!chain || !chain.length) { return ["function _fgl(v) { return v; }"]; }
        var L = [];
        L.push("function _fg1(v, T) {");
        L.push("  var d = v - T.anchorPoint;");
        L.push("  var k = T.scale / 100;");
        L.push("  d = [d[0] * k[0], d[1] * k[1]];");
        L.push("  var r = degreesToRadians(T.rotation);");
        L.push("  var c = Math.cos(r), s = Math.sin(r);");
        L.push("  return T.position + [d[0] * c - d[1] * s, d[0] * s + d[1] * c];");
        L.push("}");
        L.push("function _fgl(v) {");
        for (var i = chain.length - 1; i >= 0; i--) {
            L.push("  v = _fg1(v, _L." + chainRef(chain, i + 1) + "transform);");
        }
        L.push("  return v;");
        L.push("}");
        return L;
    }

    function followPositionExpr(ref, chain) {
        chain = chain || [];
        var L = [
            "// " + TAG + " " + enc({ v: 1, kind: K_FOLLOW, ref: ref, chain: chain }),
            "var _r = value;",
            "var _L = null;",
            "try { _L = effect(" + estr(FX_PATH) + ")(\"Layer\"); } catch (e) { _L = null; }"
        ];
        L = L.concat(groupToLayerExpr(chain));
        L.push("if (_L != null) {");
        L.push("  var _p = _L." + ref + ";");
        L.push("  var _t = effect(" + estr(FX_OFFSET) + ")(\"Slider\") / 100;");
        L.push("  _t = _t - Math.floor(_t);");
        L.push("  var _q = _L.toComp(_fgl(_p.pointOnPath(_t, time)));");
        L.push("  var _o = hasParent ? parent.fromComp(_q) : _q;");
        L.push("  _r = (value.length > 2) ? [_o[0], _o[1], value[2]] : [_o[0], _o[1]];");
        L.push("}");
        L.push("_r;");
        return L.join("\n");
    }

    function followRotationExpr(ref, chain) {
        chain = chain || [];
        var L = [
            "var _r = value;",
            "var _L = null;",
            "try { _L = effect(" + estr(FX_PATH) + ")(\"Layer\"); } catch (e) { _L = null; }"
        ];
        L = L.concat(groupToLayerExpr(chain));
        L.push("if (_L != null && effect(" + estr(FX_FOLLOWROT) + ")(\"Checkbox\") > 0) {");
        L.push("  var _p = _L." + ref + ";");
        L.push("  var _t = effect(" + estr(FX_OFFSET) + ")(\"Slider\") / 100;");
        L.push("  _t = _t - Math.floor(_t);");
        L.push("  var _d = 0.004;");
        L.push("  var _t2 = _t + _d;");
        L.push("  if (_t2 > 1) { _t2 = _t - _d; _d = -_d; }");
        L.push("  var _a = _L.toComp(_fgl(_p.pointOnPath(_t, time)));");
        L.push("  var _b = _L.toComp(_fgl(_p.pointOnPath(_t2, time)));");
        L.push("  var _ang = radiansToDegrees(Math.atan2(_b[1] - _a[1], _b[0] - _a[0]));");
        L.push("  if (_d < 0) { _ang = _ang + 180; }");
        L.push("  _r = value + _ang;");
        L.push("}");
        L.push("_r;");
        return L.join("\n");
    }

    // Where along the path a layer already sits, so Offset starts sensibly.
    function nearestT(item, compPt, t) {
        var sh = basePath(item, t);
        var m = itemMatrix(item, t);
        var bestAt = 0, bestD = Infinity, total = 0, prev = null;
        var steps = 400;
        var n = sh.vertices.length;
        if (!n) { return 0; }
        var segs = sh.closed ? n : n - 1;
        if (segs < 1) { return 0; }
        for (var s = 0; s <= steps; s++) {
            var u = s / steps;
            var f = u * segs;
            var si = Math.min(segs - 1, Math.floor(f));
            var lt = f - si;
            var a = sh.vertices[si];
            var b = sh.vertices[(si + 1) % n];
            var o = sh.outTangents[si];
            var ii = sh.inTangents[(si + 1) % n];
            var pt = bezierAt(a, [a[0] + o[0], a[1] + o[1]], [b[0] + ii[0], b[1] + ii[1]], b, lt);
            // pointOnPath counts by arc length along the path's own numbers,
            // so walk it the same way - stepping by segment would drop the
            // rider somewhere else the moment Follow is applied to a path
            // whose segments are not all the same length.
            if (prev) {
                total += Math.sqrt((pt[0] - prev[0]) * (pt[0] - prev[0]) +
                                   (pt[1] - prev[1]) * (pt[1] - prev[1]));
            }
            prev = pt;
            var w = mPt(m, pt);
            var d = (w[0] - compPt[0]) * (w[0] - compPt[0]) + (w[1] - compPt[1]) * (w[1] - compPt[1]);
            if (d < bestD) { bestD = d; bestAt = total; }
        }
        return total > 0 ? bestAt / total : 0;
    }

    function bezierAt(p0, p1, p2, p3, t) {
        var u = 1 - t;
        var a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
        return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
                a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
    }

    function setupFollower(comp, item, layer) {
        var fx = effectsOf(layer);
        removeEffect(layer, FX_PATH);
        removeEffect(layer, FX_OFFSET);
        removeEffect(layer, FX_FOLLOWROT);

        var e1 = fx.addProperty(MN_LAYERCTL);
        e1.name = FX_PATH;
        e1.property(1).setValue(item.layer.index);

        var here = mPt(layerMatrix(layer, comp.time), [0, 0]);
        var t0 = nearestT(item, here, comp.time);

        var e2 = fx.addProperty(MN_SLIDER);
        e2.name = FX_OFFSET;
        e2.property(1).setValue(Math.round(t0 * 1000) / 10);

        var e3 = fx.addProperty(MN_CHECKBOX);
        e3.name = FX_FOLLOWROT;
        e3.property(1).setValue(0);

        layer.transform.position.expression = followPositionExpr(item.ref, item.chain);
        try {
            layer.transform.rotation.expression = followRotationExpr(item.ref, item.chain);
        } catch (e) {}
    }

    function isFollower(layer) {
        return findEffect(layer, FX_PATH) !== null || findEffect(layer, TAG + " P1") !== null;
    }

    // Let the layer go, leaving it exactly where the rig had put it.
    function detachFollower(comp, L) {
        var own = isOwnControl(L);
        if (!own) {
            var props = [L.transform.position, L.transform.rotation, L.transform.scale];
            for (var i = 0; i < props.length; i++) {
                var pr = props[i];
                if (!pr || !pr.expressionEnabled) { continue; }
                var v = null;
                try { v = pr.valueAtTime(comp.time, false); } catch (e) { v = null; }
                pr.expression = "";
                if (v !== null) { try { pr.setValue(v); } catch (e2) {} }
            }
        }
        removeEffect(L, FX_PATH);
        removeEffect(L, FX_OFFSET);
        removeEffect(L, FX_FOLLOWROT);
        removeEffect(L, FX_FOLLOWSCL);
        for (var n = 1; n <= 500; n++) {
            if (!findEffect(L, TAG + " P" + n)) { break; }
            removeEffect(L, TAG + " P" + n);
        }
        if (own) { try { L.remove(); } catch (e3) {} }
    }

    function actFollower(picks, selLayers) {
        return run("Create follower", function (comp) {
            if (!picks.length) { return "Pick a point on the path you want to follow."; }
            var item = picks[0].item;
            var targets = [];
            for (var i = 0; i < selLayers.length; i++) {
                if (!isControl(selLayers[i]) && !sameLayer(selLayers[i], item.layer)) {
                    targets.push(selLayers[i]);
                }
            }
            if (!targets.length) {
                var sh = basePath(item, comp.time);
                var idx = picks[0].idx.length ? picks[0].idx[0] : 0;
                var probe = new Probe(comp);
                var cp;
                try { cp = probe.at(item, sh.vertices[Math.min(idx, sh.vertices.length - 1)], comp.time); }
                finally { probe.done(); }
                var own = makeControl(comp, item.layer.name + " Follower", K_FOLLOW, cp);
                markControl(own, K_FOLLOW, "own");
                targets.push(own);
            }
            for (i = 0; i < targets.length; i++) { setupFollower(comp, item, targets[i]); }
            return "Attached " + targets.length + " follower" + (targets.length === 1 ? "" : "s") +
                   " to " + item.label + ". Drag " + FX_OFFSET + " to slide it along.";
        });
    }

    // ------------------------------------------------------ average follower

    function avgExprs(ctrls, rest, restCtr) {
        var n = ctrls.length;
        var head = [
            "var _n = " + n + ";",
            "var _rest = " + enc(rest) + ";",
            "var _rc = " + enc(restCtr) + ";",
            "function _p(i) {",
            "  try {",
            "    var l = effect(" + estr(TAG + " P") + " + i)(\"Layer\");",
            "    var q = l.toComp([0, 0]);",
            "    return [q[0], q[1]];",
            "  } catch (e) { return null; }",
            "}",
            "var _pts = [], _sx = 0, _sy = 0, _c = 0;",
            "for (var _i = 0; _i < _n; _i++) {",
            "  var _q = _p(_i + 1);",
            "  _pts.push(_q);",
            "  if (_q != null) { _sx = _sx + _q[0]; _sy = _sy + _q[1]; _c++; }",
            "}",
            "var _ctr = _c > 0 ? [_sx / _c, _sy / _c] : _rc;"
        ].join("\n");

        var pos = [
            "// " + TAG + " " + enc({ v: 1, kind: K_AVG, n: n }),
            head,
            "var _o = hasParent ? parent.fromComp(_ctr) : _ctr;",
            "(value.length > 2) ? [_o[0], _o[1], value[2]] : [_o[0], _o[1]];"
        ].join("\n");

        var rot = [
            head,
            "var _sum = 0, _cnt = 0;",
            "if (effect(" + estr(FX_FOLLOWROT) + ")(\"Checkbox\") > 0) {",
            "  for (_i = 0; _i < _n; _i++) {",
            "    if (_pts[_i] == null) { continue; }",
            "    var _a0 = Math.atan2(_rest[_i][1] - _rc[1], _rest[_i][0] - _rc[0]);",
            "    var _a1 = Math.atan2(_pts[_i][1] - _ctr[1], _pts[_i][0] - _ctr[0]);",
            "    var _d = _a1 - _a0;",
            "    while (_d > Math.PI) { _d = _d - Math.PI * 2; }",
            "    while (_d < -Math.PI) { _d = _d + Math.PI * 2; }",
            "    _sum = _sum + _d; _cnt++;",
            "  }",
            "}",
            "value + (_cnt > 0 ? radiansToDegrees(_sum / _cnt) : 0);"
        ].join("\n");

        var scl = [
            head,
            "var _l0 = 0, _l1 = 0;",
            "if (effect(" + estr(FX_FOLLOWSCL) + ")(\"Checkbox\") > 0) {",
            "  for (_i = 0; _i < _n; _i++) {",
            "    if (_pts[_i] == null) { continue; }",
            "    _l0 = _l0 + length(_rest[_i], _rc);",
            "    _l1 = _l1 + length(_pts[_i], _ctr);",
            "  }",
            "}",
            "var _f = _l0 > 0.0001 ? _l1 / _l0 : 1;",
            "(value.length > 2) ? [value[0] * _f, value[1] * _f, value[2]] : [value[0] * _f, value[1] * _f];"
        ].join("\n");

        return { pos: pos, rot: rot, scl: scl };
    }

    function actAverageFollower(picks, selLayers) {
        return run("Average follower", function (comp) {
            var ctrls = pickedControls(picks);
            if (ctrls.length < 2) { return "Pick at least two rigged points first."; }

            var rest = [], sx = 0, sy = 0;
            for (var i = 0; i < ctrls.length; i++) {
                var w = mPt(layerMatrix(ctrls[i], comp.time), [0, 0]);
                rest.push([Math.round(w[0] * 1000) / 1000, Math.round(w[1] * 1000) / 1000]);
                sx += w[0];
                sy += w[1];
            }
            var ctr = [Math.round(sx / ctrls.length * 1000) / 1000,
                       Math.round(sy / ctrls.length * 1000) / 1000];

            var target = null;
            for (i = 0; i < selLayers.length; i++) {
                if (!isControl(selLayers[i])) { target = selLayers[i]; break; }
            }
            var ownAvg = false;
            if (!target) {
                target = makeControl(comp, "Average", K_AVG, ctr);
                markControl(target, K_AVG, "own");
                ownAvg = true;
            }

            var fx = effectsOf(target);
            for (i = 1; i <= ctrls.length; i++) {
                removeEffect(target, TAG + " P" + i);
                var e = fx.addProperty(MN_LAYERCTL);
                e.name = TAG + " P" + i;
                e.property(1).setValue(ctrls[i - 1].index);
            }
            removeEffect(target, FX_FOLLOWROT);
            removeEffect(target, FX_FOLLOWSCL);
            var r = fx.addProperty(MN_CHECKBOX);
            r.name = FX_FOLLOWROT;
            r.property(1).setValue(0);
            var s = fx.addProperty(MN_CHECKBOX);
            s.name = FX_FOLLOWSCL;
            s.property(1).setValue(0);

            var ex = avgExprs(ctrls, rest, ctr);
            target.transform.position.expression = ex.pos;
            try { target.transform.rotation.expression = ex.rot; } catch (e2) {}
            try { target.transform.scale.expression = ex.scl; } catch (e3) {}
            if (ownAvg) { target.selected = true; }
            return "Average follower on " + ctrls.length + " points. Turn on " +
                   FX_FOLLOWROT + " / " + FX_FOLLOWSCL + " to let it turn and scale.";
        });
    }

    // ------------------------------------------------- deleting and baking

    function rigIndex(comp) {
        var items = scanPaths(comp, null), out = [];
        for (var i = 0; i < items.length; i++) {
            var man = readManifest(items[i].prop);
            if (man) { out.push({ item: items[i], man: man }); }
        }
        return out;
    }

    // Which rigged points do these control layers belong to?
    function picksFromControls(comp, layers) {
        if (!layers.length) { return []; }
        var idx = rigIndex(comp), picks = [];
        for (var r = 0; r < idx.length; r++) {
            var hit = [];
            for (var e = 0; e < idx[r].man.pts.length; e++) {
                var ent = idx[r].man.pts[e];
                var cand = [linkedLayer(idx[r].item.layer, ent.fx)];
                if (ent["if"]) { cand.push(linkedLayer(idx[r].item.layer, ent["if"])); }
                if (ent.of) { cand.push(linkedLayer(idx[r].item.layer, ent.of)); }
                var found = false;
                for (var c = 0; c < cand.length && !found; c++) {
                    for (var l = 0; l < layers.length; l++) {
                        if (sameLayer(cand[c], layers[l])) { found = true; break; }
                    }
                }
                if (found) { hit.push(ent.i); }
            }
            if (hit.length) { picks.push({ item: idx[r].item, idx: hit }); }
        }
        return picks;
    }

    function removeEntry(comp, item, man, entry) {
        var handles = [];
        if (entry["if"]) { handles.push(entry["if"]); }
        if (entry.of) { handles.push(entry.of); }
        for (var i = 0; i < handles.length; i++) {
            var hl = linkedLayer(item.layer, handles[i]);
            removeEffect(item.layer, handles[i]);
            if (hl) {
                releaseChildren(comp, hl);
                try { hl.remove(); } catch (e) {}
            }
        }
        var ctrl = linkedLayer(item.layer, entry.fx);
        removeEffect(item.layer, entry.fx);
        if (ctrl) {
            releaseChildren(comp, ctrl);
            try { ctrl.remove(); } catch (e2) {}
        }
        dropEntry(man, entry.i);
    }

    function writeBack(item, man) {
        if (man.pts.length) {
            item.prop.expression = buildPathExpression(man, item.chain);
        } else {
            item.prop.expression = "";
            pruneLinks(item.layer);
        }
    }

    function shapesEqual(a, b, eps) {
        if (!a || !b) { return false; }
        if (a.vertices.length !== b.vertices.length) { return false; }
        for (var i = 0; i < a.vertices.length; i++) {
            if (Math.abs(a.vertices[i][0] - b.vertices[i][0]) > eps) { return false; }
            if (Math.abs(a.vertices[i][1] - b.vertices[i][1]) > eps) { return false; }
            if (Math.abs(a.inTangents[i][0] - b.inTangents[i][0]) > eps) { return false; }
            if (Math.abs(a.inTangents[i][1] - b.inTangents[i][1]) > eps) { return false; }
            if (Math.abs(a.outTangents[i][0] - b.outTangents[i][0]) > eps) { return false; }
            if (Math.abs(a.outTangents[i][1] - b.outTangents[i][1]) > eps) { return false; }
        }
        return true;
    }

    // Freeze the live rig into ordinary path keyframes.
    function bakePath(comp, item) {
        var start = P.bakeWorkArea ? comp.workAreaStart : 0;
        var dur = P.bakeWorkArea ? comp.workAreaDuration : comp.duration;
        var step = 1 / comp.frameRate;
        var frames = Math.floor(dur / step + 0.5) + 1;
        if (frames > 20000) { throw new Error("That range is " + frames + " frames; shorten the work area first."); }

        var times = [], vals = [];
        for (var f = 0; f < frames; f++) {
            var t = start + f * step;
            times.push(t);
            vals.push(item.prop.valueAtTime(t, false));
        }
        var moving = false;
        for (var i = 1; i < vals.length; i++) {
            if (!shapesEqual(vals[0], vals[i], 0.0005)) { moving = true; break; }
        }
        item.prop.expression = "";
        while (item.prop.numKeys > 0) { item.prop.removeKey(1); }
        if (!moving) {
            item.prop.setValue(vals[0]);
            return 0;
        }
        for (i = 0; i < times.length; i++) { item.prop.setValueAtTime(times[i], vals[i]); }
        return times.length;
    }

    function actDelete(picks, selLayers, bake) {
        return run(bake ? "Delete with bake" : "Delete rig", function (comp) {
            var work = picks.slice(0);
            var rest = [], extra = 0, i;
            for (i = 0; i < selLayers.length; i++) {
                if (kindOf(selLayers[i]) === K_PIVOT) {
                    releaseChildren(comp, selLayers[i]);
                    try { selLayers[i].remove(); extra++; } catch (e) {}
                } else if (isFollower(selLayers[i])) {
                    detachFollower(comp, selLayers[i]);
                    extra++;
                } else {
                    rest.push(selLayers[i]);
                }
            }
            selLayers = rest;
            if (extra && !work.length && !selLayers.length) {
                return "Removed " + extra + " pivot/follower" + (extra === 1 ? "" : "s") + ".";
            }
            var ctrlPicks = picksFromControls(comp, selLayers);
            for (i = 0; i < ctrlPicks.length; i++) { work.push(ctrlPicks[i]); }

            // Baking is a whole-path operation, and so is "nothing picked".
            var whole = bake || !work.length;
            if (whole) {
                var idx = rigIndex(comp);
                var scope = [];
                for (i = 0; i < idx.length; i++) {
                    var keep = !selLayers.length && !work.length;
                    for (var l = 0; l < selLayers.length; l++) {
                        if (sameLayer(idx[i].item.layer, selLayers[l])) { keep = true; }
                    }
                    for (var w = 0; w < work.length; w++) {
                        if (work[w].item.key === idx[i].item.key) { keep = true; }
                    }
                    if (keep) { scope.push(idx[i]); }
                }
                if (!scope.length) { return "Select a rigged layer, or pick its points."; }
                var keyed = 0, rigs = 0;
                for (i = 0; i < scope.length; i++) {
                    if (bake) { keyed += bakePath(comp, scope[i].item); }
                    var man = scope[i].man;
                    while (man.pts.length) {
                        removeEntry(comp, scope[i].item, man, man.pts[0]);
                    }
                    if (!bake) { writeBack(scope[i].item, man); }
                    else { pruneLinks(scope[i].item.layer); }
                    rigs++;
                }
                return bake
                    ? "Baked " + rigs + " path(s), " + keyed + " keyframes written, controls removed."
                    : "Removed the rig from " + rigs + " path(s).";
            }

            var gone = 0;
            for (i = 0; i < work.length; i++) {
                var it = work[i].item;
                var m = readManifest(it.prop);
                if (!m) { continue; }
                for (var k = 0; k < work[i].idx.length; k++) {
                    var ent = manEntry(m, work[i].idx[k]);
                    if (ent) { removeEntry(comp, it, m, ent); gone++; }
                }
                writeBack(it, m);
            }
            return gone ? "Removed " + gone + " point control(s)." : "Nothing to remove.";
        });
    }

    // ------------------------------------------------------- extract / merge

    // How far a vertex may wander before the move counts as real. Half a pixel
    // is below anything the viewer can show, and far above the drift of taking
    // a layer transform apart and rebuilding it as a shape group's own.
    var MOVED_PX = 0.5;

    // One row per path: a coarse key, used only to put the rows in a stable
    // order that does not itself depend on a rounding boundary, plus the raw
    // comp-space coordinates, which are what actually get compared.
    function allPathSignature(comp) {
        var items = scanPaths(comp, null);
        if (items.length > 400) { return null; }
        var out = [];
        for (var i = 0; i < items.length; i++) {
            var sh;
            try { sh = items[i].prop.valueAtTime(comp.time, false); } catch (e) { continue; }
            var m = itemMatrix(items[i], comp.time);
            var pts = [], key = [];
            for (var v = 0; v < sh.vertices.length; v++) {
                var vx = sh.vertices[v];
                var it = sh.inTangents[v] || [0, 0], ot = sh.outTangents[v] || [0, 0];
                var w = mPt(m, vx);
                pts.push(w[0]);
                pts.push(w[1]);
                key.push(Math.round(w[0]) + "," + Math.round(w[1]));
                // The tangents are half the shape. Round a corner off and not
                // one vertex moves, while the artwork plainly changes - so
                // compare where the handles land as well as the points.
                var a = mPt(m, [vx[0] + it[0], vx[1] + it[1]]);
                pts.push(a[0]);
                pts.push(a[1]);
                var b = mPt(m, [vx[0] + ot[0], vx[1] + ot[1]]);
                pts.push(b[0]);
                pts.push(b[1]);
            }
            out.push({ key: key.join(" "), pts: pts });
        }
        out.sort(function (a, b) {
            return (a.key < b.key) ? -1 : ((a.key > b.key) ? 1 : 0);
        });
        return out;
    }

    // Compare by distance, never by rounded equality: rounding would refuse a
    // difference of a millionth of a pixel that happened to straddle a boundary,
    // and wave through a drift of almost a tenth.
    function checkUnchanged(comp, before, what) {
        if (before === null) { return; }
        var after = allPathSignature(comp);
        if (after === null) { return; }
        var same = (after.length === before.length);
        for (var i = 0; same && i < before.length; i++) {
            var b = before[i].pts, a = after[i].pts;
            if (a.length !== b.length) { same = false; break; }
            for (var k = 0; k < b.length; k++) {
                if (Math.abs(a[k] - b[k]) > MOVED_PX) { same = false; break; }
            }
        }
        if (!same) {
            throw new Error(what + " would have moved the artwork or broken another rig.");
        }
    }

    function topGroups(layer) {
        var out = [], c = null;
        try { c = layer.property(MN_CONTENTS); } catch (e) { return out; }
        if (!c) { return out; }
        for (var i = 1; i <= c.numProperties; i++) {
            if (c.property(i).matchName === MN_GROUP) { out.push(c.property(i).name); }
        }
        return out;
    }

    // Followers point at a layer through a Layer Control; after a restructure
    // their path may live somewhere else now.
    function repointFollowers(comp, oldLayer, newLayer, groupNames) {
        for (var i = 1; i <= comp.numLayers; i++) {
            var L = comp.layer(i);
            var e = findEffect(L, FX_PATH);
            if (!e) { continue; }
            var tgt = linkedLayer(L, FX_PATH);
            if (!sameLayer(tgt, oldLayer)) { continue; }
            var ex = String(L.transform.position.expression || "");
            var m = ex.match(new RegExp("^//\\s*" + TAG + "\\s+(\\{[\\s\\S]*?\\})\\s*$", "m"));
            if (!m) { continue; }
            var info = dec(m[1]);
            if (!info || !info.ref) { continue; }
            var first = info.ref.match(/^content\("((?:[^"\\]|\\.)*)"\)/);
            if (!first) { continue; }
            var gname = first[1].replace(/\\(.)/g, "$1");
            if (!has(groupNames, gname)) { continue; }
            try { e.property(1).setValue(newLayer.index); } catch (err) {}
        }
    }

    function actExtract(picks, selLayers) {
        return run("Extract shapes", function (comp) {
            var before = allPathSignature(comp);
            var byLayer = {};
            var i, n;

            for (i = 0; i < picks.length; i++) {
                var it = picks[i].item;
                if (!it.chain.length) { continue; }
                var id = String(it.layer.id);
                if (!byLayer[id]) { byLayer[id] = { layer: it.layer, groups: [] }; }
                if (!has(byLayer[id].groups, it.chain[0])) { byLayer[id].groups.push(it.chain[0]); }
            }
            if (!picks.length) {
                for (i = 0; i < selLayers.length; i++) {
                    var g = topGroups(selLayers[i]);
                    if (g.length > 1) { byLayer[String(selLayers[i].id)] = { layer: selLayers[i], groups: g }; }
                }
            }

            var made = 0, singles = 0;
            for (var key in byLayer) {
                if (!byLayer.hasOwnProperty(key)) { continue; }
                var src = byLayer[key].layer;
                var want = byLayer[key].groups;
                var all = topGroups(src);
                // Extracting the only group would just duplicate the layer.
                if (all.length <= 1) { singles++; continue; }
                // Keep at least one group on the original layer.
                var take = [];
                for (i = 0; i < want.length; i++) {
                    if (take.length < all.length - 1) { take.push(want[i]); }
                }
                for (n = 0; n < take.length; n++) {
                    var gname = take[n];
                    var dup = src.duplicate();
                    dup.name = uniqueLayerName(comp, src.name + " - " + gname);
                    dup.moveAfter(src);

                    var dc = dup.property(MN_CONTENTS);
                    for (i = dc.numProperties; i >= 1; i--) {
                        var p = dc.property(i);
                        if (p.matchName === MN_GROUP && p.name !== gname) {
                            try { p.remove(); } catch (e) {}
                        }
                    }
                    var sc = src.property(MN_CONTENTS);
                    for (i = sc.numProperties; i >= 1; i--) {
                        var q = sc.property(i);
                        if (q.matchName === MN_GROUP && q.name === gname) {
                            try { q.remove(); } catch (e2) {}
                        }
                    }
                    pruneLinks(dup);
                    pruneLinks(src);
                    repointFollowers(comp, src, dup, [gname]);
                    made++;
                }
            }
            if (!made) {
                if (singles) {
                    return "Nothing to extract - that shape is already the only " +
                           "group on its layer.";
                }
                return "Pick points on the shapes you want in their own layers.";
            }
            checkUnchanged(comp, before, "Extract");
            return "Extracted " + made + " shape" + (made === 1 ? "" : "s") + " into its own layer.";
        });
    }

    // ---------------------------------------------------- property copying

    function childByMatch(group, matchName, name) {
        var fallback = null;
        for (var i = 1; i <= group.numProperties; i++) {
            var p = group.property(i);
            if (p.matchName === matchName) {
                if (p.name === name) { return p; }
                if (!fallback) { fallback = p; }
            }
        }
        return fallback;
    }

    var copyLost = 0;

    // After Effects lists properties it will not let a script write: the dash and
    // taper slots of a stroke that has none, and the whole 3D material block on a
    // flat layer.  They are all still at their defaults, so failing to copy one
    // loses nothing - only count a loss the user would actually see.
    function carriesData(p) {
        var m;
        try { m = p.isModified; } catch (e) { return true; }
        // A build that does not report isModified tells us nothing either way,
        // so treat the property as real rather than hide a loss that matters.
        if (m === undefined || m === null) { return true; }
        return m === true;
    }

    function copyLeaf(sp, dp) {
        try { if (dp.canSetEnabled) { dp.enabled = sp.enabled; } } catch (e) {}
        if (sp.numKeys > 0) {
            for (var k = 1; k <= sp.numKeys; k++) {
                try {
                    dp.setValueAtTime(sp.keyTime(k), sp.keyValue(k));
                } catch (e1) { if (carriesData(sp)) { copyLost++; } }
            }
            for (k = 1; k <= dp.numKeys && k <= sp.numKeys; k++) {
                try {
                    dp.setInterpolationTypeAtKey(k, sp.keyInInterpolationType(k), sp.keyOutInterpolationType(k));
                    if (sp.keyInInterpolationType(k) === KeyframeInterpolationType.BEZIER ||
                        sp.keyOutInterpolationType(k) === KeyframeInterpolationType.BEZIER) {
                        dp.setTemporalEaseAtKey(k, sp.keyInTemporalEase(k), sp.keyOutTemporalEase(k));
                    }
                } catch (e2) {}
            }
        } else {
            try { dp.setValue(sp.value); } catch (e3) { if (carriesData(sp)) { copyLost++; } }
        }
        if (sp.expressionEnabled) {
            try { dp.expression = sp.expression; } catch (e4) {}
        }
    }

    function copyTree(src, dst) {
        for (var i = 1; i <= src.numProperties; i++) {
            var sp = src.property(i);
            var dp = null;
            if (sp.propertyType === PropertyType.PROPERTY) {
                dp = childByMatch(dst, sp.matchName, sp.name);
                if (!dp) {
                    try { dp = dst.addProperty(sp.matchName); } catch (e) { dp = null; }
                }
                if (!dp) { if (carriesData(sp)) { copyLost++; } continue; }
                try { if (dp.canSetName) { dp.name = sp.name; } } catch (e1) {}
                copyLeaf(sp, dp);
            } else {
                var can = false;
                try { can = dst.canAddProperty(sp.matchName); } catch (e2) { can = false; }
                if (can) {
                    try { dp = dst.addProperty(sp.matchName); } catch (e3) { dp = null; }
                }
                if (!dp) { dp = childByMatch(dst, sp.matchName, sp.name); }
                if (!dp) { if (carriesData(sp)) { copyLost++; } continue; }
                try { if (dp.canSetName) { dp.name = sp.name; } } catch (e4) {}
                copyTree(sp, dp);
            }
        }
    }

    // ---------------------------------------------------------------- merge

    function decompose(m) {
        var sx = Math.sqrt(m[0] * m[0] + m[1] * m[1]);
        var sy = Math.sqrt(m[2] * m[2] + m[3] * m[3]);
        var det = m[0] * m[3] - m[1] * m[2];
        if (det < 0) { sy = -sy; }
        if (sx < 1e-6 || Math.abs(sy) < 1e-6) { return null; }
        var rot = Math.atan2(m[1], m[0]) * 180 / Math.PI;
        var rebuilt = mTRS([m[4], m[5]], rot, [sx * 100, sy * 100], [0, 0]);
        for (var i = 0; i < 4; i++) {
            if (Math.abs(rebuilt[i] - m[i]) > 1e-4) { return null; }
        }
        return { pos: [m[4], m[5]], rot: rot, scl: [sx * 100, sy * 100] };
    }

    function pathByChain(layer, chain, shapeName) {
        var holder = null;
        try { holder = layer.property(MN_CONTENTS); } catch (e) { return null; }
        if (!holder) { return null; }
        for (var i = 0; i < chain.length; i++) {
            var g = holder.property(chain[i]);
            if (!g) { return null; }
            holder = g.property(MN_VECTORS);
        }
        var sg = holder.property(shapeName);
        return sg ? sg.property(MN_SHAPE) : null;
    }

    function retargetFollower(L, newLayer, newRef, newChain) {
        var e = findEffect(L, FX_PATH);
        if (e) { try { e.property(1).setValue(newLayer.index); } catch (err) {} }
        L.transform.position.expression = followPositionExpr(newRef, newChain);
        try {
            L.transform.rotation.expression = followRotationExpr(newRef, newChain);
        } catch (err2) {}
    }

    function followersOf(comp, layer, ref) {
        var out = [];
        for (var i = 1; i <= comp.numLayers; i++) {
            var L = comp.layer(i);
            if (!findEffect(L, FX_PATH)) { continue; }
            if (!sameLayer(linkedLayer(L, FX_PATH), layer)) { continue; }
            var ex = String(L.transform.position.expression || "");
            var m = ex.match(new RegExp("^//\\s*" + TAG + "\\s+(\\{[\\s\\S]*?\\})\\s*$", "m"));
            if (!m) { continue; }
            var info = dec(m[1]);
            if (info && info.ref === ref) { out.push(L); }
        }
        return out;
    }

    function uniqueGroupName(layer, base) {
        var taken = {};
        var c = layer.property(MN_CONTENTS);
        for (var i = 1; i <= c.numProperties; i++) { taken[c.property(i).name] = true; }
        if (!taken[base]) { return base; }
        for (var n = 2; n < 10000; n++) {
            if (!taken[base + " " + n]) { return base + " " + n; }
        }
        return base + " " + (new Date()).getTime();
    }

    function actMerge(selLayers) {
        return run("Merge layers", function (comp) {
            var shapes = [], i, n;
            for (i = 0; i < selLayers.length; i++) {
                var L = selLayers[i];
                if (isControl(L)) { continue; }
                var c = null;
                try { c = L.property(MN_CONTENTS); } catch (e) { c = null; }
                if (c) { shapes.push(L); }
            }
            if (shapes.length < 2) { return "Select two or more shape layers to merge."; }
            for (i = 0; i < shapes.length; i++) {
                if (shapes[i].threeDLayer) {
                    return "\"" + shapes[i].name + "\" is a 3D layer; switch it to 2D before merging.";
                }
            }
            shapes.sort(function (a, b) { return a.index - b.index; });

            var before = allPathSignature(comp);
            copyLost = 0;
            var target = shapes[0];
            var moved = 0;

            for (var s = 1; s < shapes.length; s++) {
                var src = shapes[s];
                var D = mMul(mInv(layerMatrix(target, comp.time)), layerMatrix(src, comp.time));
                var d = decompose(D);
                if (!d) {
                    throw new Error("\"" + src.name + "\" is skewed or flat relative to \"" +
                                    target.name + "\"; a shape group cannot reproduce that transform.");
                }

                // Remember the rigs on the source before its content moves.
                var srcItems = scanPaths(comp, [src]);
                var carry = [];
                for (i = 0; i < srcItems.length; i++) {
                    var man = readManifest(srcItems[i].prop);
                    if (!man || !srcItems[i].chain.length) { continue; }
                    var ctrls = [];
                    for (n = 0; n < man.pts.length; n++) {
                        var e = man.pts[n];
                        ctrls.push({
                            i: e.i,
                            im: e.im, om: e.om,
                            pt: linkedLayer(src, e.fx),
                            hi: e["if"] ? linkedLayer(src, e["if"]) : null,
                            ho: e.of ? linkedLayer(src, e.of) : null
                        });
                    }
                    carry.push({ chain: srcItems[i].chain, sname: srcItems[i].sname,
                                 ref: srcItems[i].ref, pts: ctrls });
                }

                var wrap = target.property(MN_CONTENTS).addProperty(MN_GROUP);
                var wrapName = uniqueGroupName(target, src.name);
                wrap.name = wrapName;
                var tr = wrap.property(MN_GXFORM);
                tr.property("ADBE Vector Anchor").setValue([0, 0]);
                tr.property("ADBE Vector Position").setValue(d.pos);
                tr.property("ADBE Vector Rotation").setValue(d.rot);
                tr.property("ADBE Vector Scale").setValue(d.scl);
                var into = wrap.property(MN_VECTORS);

                var sc = src.property(MN_CONTENTS);
                for (i = 1; i <= sc.numProperties; i++) {
                    var sp = sc.property(i);
                    var dp = null;
                    try { dp = into.addProperty(sp.matchName); } catch (e2) { dp = null; }
                    if (!dp) { copyLost++; continue; }
                    try { if (dp.canSetName) { dp.name = sp.name; } } catch (e3) {}
                    copyTree(sp, dp);
                }

                // Rebuild each carried rig against the freshly copied path.
                for (i = 0; i < carry.length; i++) {
                    var cr = carry[i];
                    var newChain = [wrapName].concat(cr.chain);
                    var prop = pathByChain(target, newChain, cr.sname);
                    if (!prop) { copyLost++; continue; }
                    var nm = { v: 1, pts: [] };
                    for (n = 0; n < cr.pts.length; n++) {
                        var c2 = cr.pts[n];
                        if (!c2.pt) { continue; }
                        var ent = { i: c2.i, fx: addLink(target, c2.pt) };
                        if (c2.im) { ent.im = 1; }
                        if (c2.om) { ent.om = 1; }
                        if (c2.hi) { ent["if"] = addLink(target, c2.hi); }
                        if (c2.ho) { ent.of = addLink(target, c2.ho); }
                        nm.pts.push(ent);
                    }
                    nm.pts.sort(function (a, b) { return a.i - b.i; });
                    prop.expression = buildPathExpression(nm, newChain);

                    var newRef = "content(" + estr(wrapName) + ")." + cr.ref;
                    var fols = followersOf(comp, src, cr.ref);
                    for (var f = 0; f < fols.length; f++) {
                        retargetFollower(fols[f], target, newRef, newChain);
                    }
                }

                // Followers on paths that were not rigged still need the new home.
                for (i = 0; i < srcItems.length; i++) {
                    var fols2 = followersOf(comp, src, srcItems[i].ref);
                    for (var f2 = 0; f2 < fols2.length; f2++) {
                        retargetFollower(fols2[f2], target,
                                         "content(" + estr(wrapName) + ")." + srcItems[i].ref,
                                         [wrapName].concat(srcItems[i].chain));
                    }
                }

                src.remove();
                moved++;
            }

            pruneLinks(target);
            checkUnchanged(comp, before, "Merge");
            var msg = "Merged " + moved + " layer" + (moved === 1 ? "" : "s") + " into " + target.name + ".";
            if (copyLost) { msg += " " + copyLost + " propert(y/ies) could not be copied - check gradients."; }
            return msg;
        });
    }

    // =====================================================================
    //  Panel
    // =====================================================================

    var state = {
        items: [],
        geom: [],
        prims: [],
        ghosts: [],
        status: "",
        sel: {},
        view: { s: 1, tx: 0, ty: 0 },
        fitted: false,
        shown: null,
        drag: null
    };

    var FLATTEN = 12;

    // A bezier path as a polyline in comp space, segment by segment.
    function flattenPath(sh, m) {
        var poly = [], n = sh.vertices.length;
        var segs = sh.closed ? n : n - 1;
        for (var s = 0; s < segs; s++) {
            var a = sh.vertices[s], b = sh.vertices[(s + 1) % n];
            var o = sh.outTangents[s], ii = sh.inTangents[(s + 1) % n];
            var c1 = [a[0] + o[0], a[1] + o[1]], c2 = [b[0] + ii[0], b[1] + ii[1]];
            for (var k = 0; k <= FLATTEN; k++) {
                poly.push(mPt(m, bezierAt(a, c1, c2, b, k / FLATTEN)));
            }
        }
        return poly;
    }

    // What a primitive would look like as a path, for drawing only - nothing
    // is written back, so the shape stays parametric until To Bezier is used.
    function ghostFor(item, t) {
        var sh = null;
        try { sh = parametricShape(item.prop, t); } catch (e) { return null; }
        if (!sh || !sh.vertices.length) { return null; }
        var poly = flattenPath(sh, itemMatrix(item, t));
        if (!poly.length) { return null; }
        return { poly: poly, kind: item.kind };
    }

    function geomFor(item, t) {
        var sh;
        try { sh = item.prop.valueAtTime(t, false); } catch (e) { return null; }
        var m = itemMatrix(item, t);
        var n = sh.vertices.length;
        if (!n) { return null; }
        var verts = [], i;
        for (i = 0; i < n; i++) { verts.push(mPt(m, sh.vertices[i])); }

        var poly = flattenPath(sh, m);

        var man = readManifest(item.prop);
        var rigged = {}, hands = [];
        if (man) {
            for (i = 0; i < man.pts.length; i++) {
                var e = man.pts[i];
                rigged[e.i] = true;
                if (e.i >= n) { continue; }
                if (e.im || e["if"]) {
                    hands.push([verts[e.i], mPt(m, [sh.vertices[e.i][0] + sh.inTangents[e.i][0],
                                                    sh.vertices[e.i][1] + sh.inTangents[e.i][1]])]);
                }
                if (e.om || e.of) {
                    hands.push([verts[e.i], mPt(m, [sh.vertices[e.i][0] + sh.outTangents[e.i][0],
                                                    sh.vertices[e.i][1] + sh.outTangents[e.i][1]])]);
                }
            }
        }
        return { verts: verts, poly: poly, rigged: rigged, hands: hands,
                 closed: sh.closed, foreign: isForeignRig(item.prop) };
    }

    function toCanvas(p) {
        return [p[0] * state.view.s + state.view.tx, p[1] * state.view.s + state.view.ty];
    }

    function toComp(p) {
        return [(p[0] - state.view.tx) / state.view.s, (p[1] - state.view.ty) / state.view.s];
    }

    function fitView(w, h) {
        var minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9, any = false, i;
        for (i = 0; i < state.geom.length; i++) {
            var g = state.geom[i];
            if (!g) { continue; }
            for (var v = 0; v < g.verts.length; v++) {
                var p = g.verts[v];
                any = true;
                if (p[0] < minx) { minx = p[0]; }
                if (p[1] < miny) { miny = p[1]; }
                if (p[0] > maxx) { maxx = p[0]; }
                if (p[1] > maxy) { maxy = p[1]; }
            }
        }
        // A layer of nothing but a rectangle has no vertices to frame, so the
        // dimmed outlines have to count towards the fit or it falls back to
        // the whole comp and the shape comes up tiny.
        for (i = 0; i < state.ghosts.length; i++) {
            var gh = state.ghosts[i];
            if (!gh) { continue; }
            for (var q = 0; q < gh.poly.length; q++) {
                var c = gh.poly[q];
                any = true;
                if (c[0] < minx) { minx = c[0]; }
                if (c[1] < miny) { miny = c[1]; }
                if (c[0] > maxx) { maxx = c[0]; }
                if (c[1] > maxy) { maxy = c[1]; }
            }
        }
        var comp = activeComp();
        if (!any) {
            if (!comp) { state.view = { s: 1, tx: 0, ty: 0 }; return; }
            minx = 0; miny = 0; maxx = comp.width; maxy = comp.height;
        }
        var bw = Math.max(1, maxx - minx), bh = Math.max(1, maxy - miny);
        var pad = 22;
        var s = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh);
        if (!isFinite(s) || s <= 0) { s = 1; }
        s = Math.min(s, 8);
        state.view.s = s;
        state.view.tx = w / 2 - ((minx + maxx) / 2) * s;
        state.view.ty = h / 2 - ((miny + maxy) / 2) * s;
    }

    // True while some part of the artwork still lands on the canvas. Nothing
    // here pans or zooms by hand, so every view came from a fit; move the
    // layer in After Effects and that fit can end up framing empty space.
    function anythingInView(w, h) {
        var saw = false, i;
        for (i = 0; i < state.geom.length; i++) {
            var g = state.geom[i];
            if (!g) { continue; }
            for (var v = 0; v < g.verts.length; v++) {
                saw = true;
                var p = toCanvas(g.verts[v]);
                if (p[0] >= 0 && p[0] <= w && p[1] >= 0 && p[1] <= h) { return true; }
            }
        }
        for (i = 0; i < state.ghosts.length; i++) {
            var gh = state.ghosts[i];
            if (!gh) { continue; }
            for (var q = 0; q < gh.poly.length; q++) {
                saw = true;
                var c = toCanvas(gh.poly[q]);
                if (c[0] >= 0 && c[0] <= w && c[1] >= 0 && c[1] <= h) { return true; }
            }
        }
        return !saw;
    }

    function selOf(key) {
        if (!state.sel[key]) { state.sel[key] = []; }
        return state.sel[key];
    }

    function toggleSel(key, idx, additive) {
        var a = selOf(key);
        var at = indexOf(a, idx);
        if (at >= 0) {
            if (additive) { a.splice(at, 1); }
        } else {
            if (!additive) { state.sel = {}; a = selOf(key); }
            a.push(idx);
        }
    }

    function countSel() {
        var n = 0;
        for (var k in state.sel) {
            if (state.sel.hasOwnProperty(k)) { n += state.sel[k].length; }
        }
        return n;
    }

    function currentPicks() {
        var out = [];
        for (var i = 0; i < state.items.length; i++) {
            var k = state.items[i].key;
            if (state.sel[k] && state.sel[k].length) {
                out.push({ item: state.items[i], idx: state.sel[k].slice(0).sort(sortNum) });
            }
        }
        return out;
    }

    function buildUI(root) {
        var win = (root instanceof Panel)
            ? root
            : new Window("palette", NAME + " " + VERSION, undefined, { resizeable: true });
        win.alignChildren = ["fill", "top"];
        win.spacing = 4;
        win.margins = 6;

        // -------------------------------------------------------- preview
        var head = win.add("group");
        head.alignChildren = ["left", "center"];
        head.spacing = 4;
        var scopeDd = head.add("dropdownlist", undefined, ["Selected layers", "All layers"]);
        scopeDd.selection = 0;
        scopeDd.preferredSize.width = 120;
        var bRefresh = head.add("button", undefined, "Refresh");
        bRefresh.preferredSize = [62, 22];
        var bFit = head.add("button", undefined, "Fit");
        bFit.preferredSize = [40, 22];
        var bAll = head.add("button", undefined, "All");
        bAll.preferredSize = [40, 22];
        var bNone = head.add("button", undefined, "None");
        bNone.preferredSize = [46, 22];
        var bInv = head.add("button", undefined, "Invert");
        bInv.preferredSize = [52, 22];

        var cv = win.add("group");
        cv.alignment = ["fill", "fill"];
        cv.minimumSize = [260, 180];
        cv.preferredSize = [320, 260];

        var hint = win.add("statictext", undefined,
            "Click a point to pick it. Shift-click adds. Drag for a marquee.");
        hint.graphics.foregroundColor = hint.graphics.newPen(
            hint.graphics.PenType.SOLID_COLOR, [0.6, 0.6, 0.6, 1], 1);

        // ------------------------------------------------------- full rows
        var full = win.add("group");
        full.orientation = "column";
        full.alignChildren = ["fill", "top"];
        full.spacing = 3;

        function row(label) {
            var g = full.add("group");
            g.alignChildren = ["left", "center"];
            g.spacing = 3;
            var t = g.add("statictext", undefined, label);
            t.preferredSize.width = 48;
            return g;
        }
        function btn(g, label, w, tip) {
            var b = g.add("button", undefined, label);
            b.preferredSize = [w, 22];
            if (tip) { b.helpTip = tip; }
            return b;
        }

        var rPts = row("Points");
        var bCreate = btn(rPts, "Create", 62, "Put a control on every picked point");
        var bHand = btn(rPts, "Handles", 72,
                        "Give the picked points bezier handles, rigging any that are not yet");
        var bDel = btn(rPts, "Delete", 58, "Remove the picked controls, or the whole rig");

        var rGrp = row("Group");
        var bPivot = btn(rGrp, "Pivot", 62, "One control for every picked point");
        var bAddPiv = btn(rGrp, "Add to Pivot", 86, "Select the Pivot too, then add more points to it");
        var bRel = btn(rGrp, "Release", 62, "Detach controls from their Pivot");
        var bBake = btn(rGrp, "Bake", 58, "Keep the animation as path keyframes, drop the rig");

        var rFol = row("Follow");
        var bFol = btn(rFol, "Follower", 68, "Attach the selected layers to the picked path");
        var bAvg = btn(rFol, "Average", 68, "One follower at the centre of the picked points");
        var modeDd = rFol.add("dropdownlist", undefined, ["Handles: masks", "Handles: layers"]);
        modeDd.preferredSize.width = 120;
        modeDd.selection = (P.handleMode === "layers") ? 1 : 0;
        var bSwap = btn(rFol, "Apply", 50, "Convert the picked points' handles to that style");

        var rLay = row("Layers");
        var bExtract = btn(rLay, "Extract", 62, "Move the picked shapes into layers of their own");
        var bMerge = btn(rLay, "Merge", 58, "Fold the selected shape layers into the topmost one");
        var bBez = btn(rLay, "To Bezier", 72, "Turn rectangles, ellipses and stars into editable paths");
        var bPrefs = btn(rLay, "Prefs", 50, "Colours, sizes and shapes of the controls");
        var bSmall = btn(rLay, "Compact", 66, "Fold the panel down to two rows of buttons");

        // ---------------------------------------------------- compact rows
        var small = win.add("group");
        small.orientation = "column";
        small.alignChildren = ["fill", "top"];
        small.spacing = 3;
        small.visible = false;
        var sr1 = small.add("group");
        sr1.spacing = 3;
        var sr2 = small.add("group");
        sr2.spacing = 3;
        var sCreate = btn(sr1, "Create", 62);
        var sHand = btn(sr1, "Handles", 62);
        var sPivot = btn(sr1, "Pivot", 54);
        var sFol = btn(sr1, "Follow", 58);
        var sAvg = btn(sr2, "Average", 62);
        var sExtract = btn(sr2, "Extract", 62);
        var sMerge = btn(sr2, "Merge", 54);
        var sDel = btn(sr2, "Delete", 58);
        var sBig = btn(sr2, "Preview", 62, "Bring the point picker back");

        var status = win.add("statictext", undefined,
            "                                                                      ");
        status.alignment = ["fill", "bottom"];
        status.text = "Ready.";

        function setStatus(s) {
            state.status = String(s);
            try { status.text = s; } catch (e) {}
        }

        function redraw() {
            try { cv.notify("onDraw"); } catch (e) {
                try { win.layout.layout(true); } catch (e2) {}
            }
        }

        // ------------------------------------------------------- rendering
        cv.onDraw = function () {
            var g = this.graphics;
            var w = this.size.width, h = this.size.height;
            var bg = g.newBrush(g.BrushType.SOLID_COLOR, [0.145, 0.145, 0.145, 1]);
            g.newPath();
            g.rectPath(0, 0, w, h);
            g.fillPath(bg);

            var comp = activeComp();
            if (comp) {
                var a = toCanvas([0, 0]), b = toCanvas([comp.width, comp.height]);
                var framePen = g.newPen(g.PenType.SOLID_COLOR, [0.32, 0.32, 0.32, 1], 1);
                g.newPath();
                g.rectPath(a[0], a[1], b[0] - a[0], b[1] - a[1]);
                g.strokePath(framePen);
            }

            var pathPen = g.newPen(g.PenType.SOLID_COLOR, [0.62, 0.62, 0.62, 1], 1);
            var leashPen = g.newPen(g.PenType.SOLID_COLOR,
                [P.colHandle[0], P.colHandle[1], P.colHandle[2], 1], 1);
            var foreignPen = g.newPen(g.PenType.SOLID_COLOR, [0.85, 0.45, 0.3, 1], 1);
            var dotFree = g.newBrush(g.BrushType.SOLID_COLOR, [0.78, 0.78, 0.78, 1]);
            var dotRig = g.newBrush(g.BrushType.SOLID_COLOR,
                [P.colPoint[0], P.colPoint[1], P.colPoint[2], 1]);
            var dotSel = g.newBrush(g.BrushType.SOLID_COLOR, [1, 0.92, 0.25, 1]);
            var edge = g.newPen(g.PenType.SOLID_COLOR, [0.08, 0.08, 0.08, 1], 1);

            var i, k, p, q;

            // The parametric shapes first and underneath, in a dimmer, cooler
            // line and with no vertex dots: enough to show the user where
            // their artwork is, clearly not something that can be picked.
            var ghostPen = g.newPen(g.PenType.SOLID_COLOR, [0.42, 0.46, 0.56, 1], 1);
            for (i = 0; i < state.ghosts.length; i++) {
                var gh = state.ghosts[i];
                if (!gh) { continue; }
                var gper = FLATTEN + 1;
                for (var gs = 0; gs * gper < gh.poly.length; gs++) {
                    g.newPath();
                    for (k = 0; k < gper; k++) {
                        var gat = gs * gper + k;
                        if (gat >= gh.poly.length) { break; }
                        p = toCanvas(gh.poly[gat]);
                        if (k === 0) { g.moveTo(p[0], p[1]); } else { g.lineTo(p[0], p[1]); }
                    }
                    g.strokePath(ghostPen);
                }
            }

            for (i = 0; i < state.geom.length; i++) {
                var gm = state.geom[i];
                if (!gm) { continue; }
                var pen = gm.foreign ? foreignPen : pathPen;
                var per = FLATTEN + 1;
                for (var seg = 0; seg * per < gm.poly.length; seg++) {
                    g.newPath();
                    for (k = 0; k < per; k++) {
                        var at = seg * per + k;
                        if (at >= gm.poly.length) { break; }
                        p = toCanvas(gm.poly[at]);
                        if (k === 0) { g.moveTo(p[0], p[1]); } else { g.lineTo(p[0], p[1]); }
                    }
                    g.strokePath(pen);
                }
                for (k = 0; k < gm.hands.length; k++) {
                    p = toCanvas(gm.hands[k][0]);
                    q = toCanvas(gm.hands[k][1]);
                    g.newPath();
                    g.moveTo(p[0], p[1]);
                    g.lineTo(q[0], q[1]);
                    g.strokePath(leashPen);
                    g.newPath();
                    g.ellipsePath(q[0] - 2.5, q[1] - 2.5, 5, 5);
                    g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR,
                        [P.colHandle[0], P.colHandle[1], P.colHandle[2], 1]));
                }

                var sel = state.sel[state.items[i].key] || [];
                for (k = 0; k < gm.verts.length; k++) {
                    p = toCanvas(gm.verts[k]);
                    var r = 3.5;
                    var brush = gm.rigged[k] ? dotRig : dotFree;
                    if (has(sel, k)) { brush = dotSel; r = 5; }
                    g.newPath();
                    g.rectPath(p[0] - r, p[1] - r, r * 2, r * 2);
                    g.fillPath(brush);
                    g.newPath();
                    g.rectPath(p[0] - r, p[1] - r, r * 2, r * 2);
                    g.strokePath(edge);
                }
            }

            if (state.drag && state.drag.marquee) {
                var d = state.drag;
                var x0 = Math.min(d.x0, d.x1), y0 = Math.min(d.y0, d.y1);
                var mp = g.newPen(g.PenType.SOLID_COLOR, [1, 0.92, 0.25, 1], 1);
                g.newPath();
                g.rectPath(x0, y0, Math.abs(d.x1 - d.x0), Math.abs(d.y1 - d.y0));
                g.strokePath(mp);
            }

            if (!state.geom.length) {
                var tp = g.newPen(g.PenType.SOLID_COLOR, [0.55, 0.55, 0.55, 1], 1);
                g.drawString("Select a shape or masked layer, then press Refresh.", tp, 14, h / 2 - 8,
                             ScriptUI.newFont("dialog", "REGULAR", 11));
            }
        };

        // --------------------------------------------------- point picking
        function nearestVertex(cx, cy, maxDist) {
            var best = null, bestD = maxDist * maxDist;
            for (var i = 0; i < state.geom.length; i++) {
                var gm = state.geom[i];
                if (!gm) { continue; }
                for (var k = 0; k < gm.verts.length; k++) {
                    var p = toCanvas(gm.verts[k]);
                    var d = (p[0] - cx) * (p[0] - cx) + (p[1] - cy) * (p[1] - cy);
                    if (d <= bestD) { bestD = d; best = { key: state.items[i].key, idx: k }; }
                }
            }
            return best;
        }

        cv.addEventListener("mousedown", function (ev) {
            state.drag = { x0: ev.clientX, y0: ev.clientY, x1: ev.clientX, y1: ev.clientY,
                           marquee: false, shift: ev.shiftKey };
        });

        cv.addEventListener("mousemove", function (ev) {
            if (!state.drag) { return; }
            state.drag.x1 = ev.clientX;
            state.drag.y1 = ev.clientY;
            if (Math.abs(state.drag.x1 - state.drag.x0) > 3 ||
                Math.abs(state.drag.y1 - state.drag.y0) > 3) {
                state.drag.marquee = true;
                redraw();
            }
        });

        cv.addEventListener("mouseup", function (ev) {
            var d = state.drag;
            state.drag = null;
            if (!d) { return; }
            d.x1 = ev.clientX;
            d.y1 = ev.clientY;

            if (d.marquee) {
                var x0 = Math.min(d.x0, d.x1), x1 = Math.max(d.x0, d.x1);
                var y0 = Math.min(d.y0, d.y1), y1 = Math.max(d.y0, d.y1);
                if (!d.shift) { state.sel = {}; }
                for (var i = 0; i < state.geom.length; i++) {
                    var gm = state.geom[i];
                    if (!gm) { continue; }
                    for (var k = 0; k < gm.verts.length; k++) {
                        var p = toCanvas(gm.verts[k]);
                        if (p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1) {
                            var a = selOf(state.items[i].key);
                            if (!has(a, k)) { a.push(k); }
                        }
                    }
                }
            } else {
                var hit = nearestVertex(d.x1, d.y1, 10);
                if (hit) {
                    toggleSel(hit.key, hit.idx, d.shift);
                } else if (!d.shift) {
                    state.sel = {};
                }
            }
            reportSel();
            redraw();
        });

        // Name the dimmed shapes, so a layer that came up with nothing to pick
        // says why instead of leaving the user hunting for their artwork.
        function primNote() {
            var n = state.prims.length;
            if (!n) { return ""; }
            var tally = {}, order = [], i;
            for (i = 0; i < state.prims.length; i++) {
                var k = state.prims[i].kind;
                if (!tally[k]) { tally[k] = 0; order.push(k); }
                tally[k]++;
            }
            var bits = [];
            for (i = 0; i < order.length; i++) {
                var c = tally[order[i]];
                bits.push(c + " " + order[i] + (c === 1 ? "" : "s"));
            }
            return bits.join(" and ") + " shown dimmed - press To Bezier to rig " +
                   (n === 1 ? "it" : "them") + ".";
        }

        function primLayers() {
            var seen = {}, out = [];
            for (var i = 0; i < state.prims.length; i++) {
                var L = state.prims[i].layer;
                if (seen[L.id]) { continue; }
                seen[L.id] = true;
                out.push(L);
            }
            return out;
        }

        function reportSel() {
            var n = countSel();
            var note = primNote();
            var msg;
            if (n) {
                msg = n + " point" + (n === 1 ? "" : "s") + " picked on " +
                      currentPicks().length + " path(s).";
            } else if (state.items.length) {
                msg = state.items.length + " path(s) in view. Nothing picked.";
            } else if (note) {
                msg = "Nothing to pick here yet.";
            } else {
                msg = "0 path(s) in view. Nothing picked.";
            }
            if (note) { msg += " " + note; }
            setStatus(msg);
        }

        // -------------------------------------------------------- refresh
        function refresh() {
            var comp = activeComp();
            var keep = state.sel;
            state.items = [];
            state.geom = [];
            state.prims = [];
            state.ghosts = [];
            if (!comp) {
                state.sel = {};
                setStatus("Open a composition to start.");
                redraw();
                return;
            }
            var layers = null;
            if (scopeDd.selection && scopeDd.selection.index === 0) {
                layers = selectedLayers(comp);
                if (!layers.length) { layers = null; }
            }
            var all = scanPaths(comp, layers);
            var cap = 120;
            for (var i = 0; i < all.length && state.items.length < cap; i++) {
                var g = geomFor(all[i], comp.time);
                if (!g) { continue; }
                state.items.push(all[i]);
                state.geom.push(g);
            }
            var prims = scanPrimitives(comp, layers);
            for (i = 0; i < prims.length && state.prims.length < cap; i++) {
                var gh = ghostFor(prims[i], comp.time);
                if (!gh) { continue; }
                state.prims.push(prims[i]);
                state.ghosts.push(gh);
            }
            // Keep whatever picks still point at a path that is still here.
            state.sel = {};
            for (i = 0; i < state.items.length; i++) {
                var k = state.items[i].key;
                if (keep[k]) {
                    var kept = [];
                    for (var n = 0; n < keep[k].length; n++) {
                        if (keep[k][n] < state.geom[i].verts.length) { kept.push(keep[k][n]); }
                    }
                    if (kept.length) { state.sel[k] = kept; }
                }
            }
            // Refit whenever the preview is showing something else. Picking
            // a different layer in After Effects brings up different paths,
            // and a view fitted to artwork that has gone leaves the new paths
            // off-centre, or off the canvas altogether. Same paths in the
            // same place: leave the view where it is, so nothing shifts under
            // the pointer between seeing a vertex and clicking it.
            var cw = Math.max(60, cv.size.width), ch = Math.max(60, cv.size.height);
            var shown = [];
            for (i = 0; i < state.items.length; i++) { shown.push(state.items[i].key); }
            for (i = 0; i < state.prims.length; i++) { shown.push(state.prims[i].key); }
            shown = shown.join("\n");
            if (!state.fitted || shown !== state.shown || !anythingInView(cw, ch)) {
                fitView(cw, ch);
                state.fitted = true;
            }
            state.shown = shown;
            reportSel();
            redraw();
        }

        UI.say = setStatus;
        UI.refresh = function () {
            try { refresh(); } catch (e) {}
        };

        // -------------------------------------------------------- commands
        function picks() { return currentPicks(); }
        function sel() {
            var comp = activeComp();
            return comp ? selectedLayers(comp) : [];
        }

        bRefresh.onClick = function () { state.fitted = false; refresh(); };
        bFit.onClick = function () {
            fitView(Math.max(60, cv.size.width), Math.max(60, cv.size.height));
            redraw();
        };
        bAll.onClick = function () {
            state.sel = {};
            for (var i = 0; i < state.items.length; i++) {
                var a = [];
                for (var k = 0; k < state.geom[i].verts.length; k++) { a.push(k); }
                state.sel[state.items[i].key] = a;
            }
            reportSel();
            redraw();
        };
        bNone.onClick = function () { state.sel = {}; reportSel(); redraw(); };
        bInv.onClick = function () {
            for (var i = 0; i < state.items.length; i++) {
                var key = state.items[i].key;
                var cur = state.sel[key] || [], a = [];
                for (var k = 0; k < state.geom[i].verts.length; k++) {
                    if (!has(cur, k)) { a.push(k); }
                }
                if (a.length) { state.sel[key] = a; } else { delete state.sel[key]; }
            }
            reportSel();
            redraw();
        };
        scopeDd.onChange = function () { state.fitted = false; refresh(); };

        bCreate.onClick = function () { actCreate(picks(), false); };
        bHand.onClick = function () { actCreate(picks(), true); };
        bDel.onClick = function () { actDelete(picks(), sel(), false); };
        bBake.onClick = function () { actDelete(picks(), sel(), true); };
        bPivot.onClick = function () { actPivot(picks(), sel()); };
        bAddPiv.onClick = function () { actAddToPivot(picks(), sel()); };
        bRel.onClick = function () { actRelease(picks(), sel()); };
        bFol.onClick = function () { actFollower(picks(), sel()); };
        bAvg.onClick = function () { actAverageFollower(picks(), sel()); };
        bExtract.onClick = function () { actExtract(picks(), sel()); };
        bMerge.onClick = function () { actMerge(sel()); };
        bBez.onClick = function () {
            var layers = sel();
            // The dimmed shapes are the ones the status line just offered to
            // convert, so take those rather than refuse the press.
            if (!layers.length) { layers = primLayers(); }
            if (!layers.length) { setStatus("Select the shape layers to convert."); return; }
            state.fitted = false;
            actToBezier(layers);
        };
        modeDd.onChange = function () {
            P.handleMode = (modeDd.selection.index === 1) ? "layers" : "masks";
            savePrefs();
        };
        bSwap.onClick = function () { actSwitchHandleMode(picks(), P.handleMode); };

        sCreate.onClick = bCreate.onClick;
        sHand.onClick = bHand.onClick;
        sPivot.onClick = bPivot.onClick;
        sFol.onClick = bFol.onClick;
        sAvg.onClick = bAvg.onClick;
        sExtract.onClick = bExtract.onClick;
        sMerge.onClick = bMerge.onClick;
        sDel.onClick = bDel.onClick;

        function setCompact(on) {
            head.visible = !on;
            cv.visible = !on;
            hint.visible = !on;
            full.visible = !on;
            small.visible = on;
            try {
                if (on) {
                    cv.maximumSize = [4000, 0];
                    cv.minimumSize = [0, 0];
                } else {
                    cv.minimumSize = [260, 180];
                    cv.maximumSize = [4000, 4000];
                }
                win.layout.layout(true);
                win.layout.resize();
            } catch (e) {}
        }
        bSmall.onClick = function () { setCompact(true); };
        sBig.onClick = function () { setCompact(false); refresh(); };

        // ----------------------------------------------------- preferences
        bPrefs.onClick = function () {
            if (prefsDialog(win)) {
                modeDd.selection = (P.handleMode === "layers") ? 1 : 0;
                refresh();
                setStatus("Preferences saved. New controls use them.");
            }
        };

        // --------------------------------------------------------- layout
        win.onResizing = win.onResize = function () {
            try {
                this.layout.resize();
                redraw();
            } catch (e) {}
        };

        // Come back to the panel and it re-reads the comp by itself, so the
        // preview is never stale. refresh() keeps picks that still point at a
        // path that is still there, so this does not throw away a selection.
        // Activation can fire in bursts, and a refresh walks every layer, so
        // ignore anything that follows hard on the heels of the last one.
        var lastAuto = 0;
        function autoRefresh() {
            var now = (new Date()).getTime();
            if (now - lastAuto < 350) { return; }
            lastAuto = now;
            try { refresh(); } catch (e) {}
        }
        win.onActivate = autoRefresh;
        // A docked panel does not always get onActivate, but the canvas sees
        // the pointer arrive, which is the same moment from the user's side.
        cv.addEventListener("mouseover", autoRefresh);

        if (win instanceof Window) {
            win.center();
            win.show();
        } else {
            win.layout.layout(true);
            win.layout.resize();
        }
        refresh();
        return win;
    }

    // ------------------------------------------------------ prefs dialog

    function swatch(parent, get, set) {
        var g = parent.add("group");
        g.preferredSize = [30, 18];
        g.onDraw = function () {
            var gr = this.graphics;
            var c = get();
            gr.newPath();
            gr.rectPath(0, 0, this.size.width, this.size.height);
            gr.fillPath(gr.newBrush(gr.BrushType.SOLID_COLOR, [c[0], c[1], c[2], 1]));
            gr.newPath();
            gr.rectPath(0, 0, this.size.width, this.size.height);
            gr.strokePath(gr.newPen(gr.PenType.SOLID_COLOR, [0.1, 0.1, 0.1, 1], 1));
        };
        g.addEventListener("mousedown", function () {
            var c = get();
            var cur = (Math.round(c[0] * 255) << 16) | (Math.round(c[1] * 255) << 8) |
                      Math.round(c[2] * 255);
            var picked = -1;
            try { picked = $.colorPicker(cur); } catch (e) { picked = -1; }
            if (picked >= 0) {
                set([((picked >> 16) & 255) / 255, ((picked >> 8) & 255) / 255, (picked & 255) / 255]);
                try { g.notify("onDraw"); } catch (e2) {}
            }
        });
        return g;
    }

    function prefsDialog(parent) {
        var d = new Window("dialog", NAME + " preferences");
        d.alignChildren = ["fill", "top"];
        d.spacing = 6;
        d.margins = 12;

        function line(label) {
            var g = d.add("group");
            g.alignChildren = ["left", "center"];
            var t = g.add("statictext", undefined, label);
            t.preferredSize.width = 108;
            return g;
        }

        var gShape = line("Point shape");
        var ddShape = gShape.add("dropdownlist", undefined, ["Circle", "Square", "Diamond", "Triangle"]);
        ddShape.preferredSize.width = 110;
        var shapes = ["circle", "square", "diamond", "triangle"];
        ddShape.selection = Math.max(0, indexOf(shapes, P.shape));

        var gSize = line("Size");
        var szTxt = gSize.add("edittext", undefined, String(P.size));
        szTxt.characters = 5;
        var szSl = gSize.add("slider", undefined, P.size, 4, 60);
        szSl.preferredSize.width = 120;
        szSl.onChanging = function () { szTxt.text = String(Math.round(szSl.value)); };
        szTxt.onChange = function () {
            var v = parseFloat(szTxt.text);
            if (!isNaN(v)) { szSl.value = Math.max(4, Math.min(60, v)); }
        };

        var gCols = line("Colours");
        swatch(gCols, function () { return P.colPoint; }, function (c) { P.colPoint = c; });
        gCols.add("statictext", undefined, "point");
        swatch(gCols, function () { return P.colHandle; }, function (c) { P.colHandle = c; });
        gCols.add("statictext", undefined, "handle");
        swatch(gCols, function () { return P.colPivot; }, function (c) { P.colPivot = c; });
        gCols.add("statictext", undefined, "pivot");
        swatch(gCols, function () { return P.colFollow; }, function (c) { P.colFollow = c; });
        gCols.add("statictext", undefined, "follower");

        var gFlags = d.add("group");
        gFlags.alignChildren = ["left", "center"];
        gFlags.spacing = 14;
        var cbOutline = gFlags.add("checkbox", undefined, "Dark outline");
        cbOutline.value = !!P.outline;
        cbOutline.helpTip = "Keeps controls readable on light artwork";
        var cbGuide = gFlags.add("checkbox", undefined, "Guide layers");
        cbGuide.value = !!P.guide;
        cbGuide.helpTip = "Controls stay out of the render";

        var gMode = line("Handles");
        var ddMode = gMode.add("dropdownlist", undefined,
            ["Masks inside the point control", "Separate layers with a leash"]);
        ddMode.preferredSize.width = 230;
        ddMode.selection = (P.handleMode === "layers") ? 1 : 0;

        var gBake = line("Bake range");
        var ddBake = gBake.add("dropdownlist", undefined, ["Work area", "Whole composition"]);
        ddBake.preferredSize.width = 160;
        ddBake.selection = P.bakeWorkArea ? 0 : 1;

        var btns = d.add("group");
        btns.alignment = ["right", "top"];
        var bCancel = btns.add("button", undefined, "Cancel", { name: "cancel" });
        var bOk = btns.add("button", undefined, "OK", { name: "ok" });

        var saved = false;
        bOk.onClick = function () {
            P.shape = shapes[ddShape.selection.index];
            P.size = Math.max(4, Math.min(60, Math.round(szSl.value)));
            P.outline = cbOutline.value;
            P.guide = cbGuide.value;
            P.handleMode = (ddMode.selection.index === 1) ? "layers" : "masks";
            P.bakeWorkArea = (ddBake.selection.index === 0);
            savePrefs();
            saved = true;
            d.close();
        };
        bCancel.onClick = function () { d.close(); };
        d.center(parent);
        d.show();
        return saved;
    }

    // ---------------------------------------------------------------- boot

    loadPrefs();
    buildUI(thisObj);

})(this);
