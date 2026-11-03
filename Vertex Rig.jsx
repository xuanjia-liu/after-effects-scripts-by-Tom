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

    // Where a tangent is measured from.
    //
    // A handle standing off a corner has to read as no tangent at all, so the
    // stand-off is taken back out. Taking out a constant in the shape group's
    // units is wrong the moment the rig turns: the vertex and the handle both
    // swing round with the Pivot while the constant sits still, and the corner
    // grows a tangent out of nothing that widens with the angle. So the point
    // the tangent is measured from is kept in the control's own frame ("bi" /
    // "bo") and read back through it, which turns and scales with everything
    // else. Rigs written before this carry the old group-space pair ("ri" /
    // "ro"); those are still read the old way so they do not jump, and a
    // handle added to one now gets the new kind beside it.
    function restBase(e, side, at) {
        var turning = e[side === "in" ? "bi" : "bo"];
        if (turning) {
            return "_rp(" + estr(e.fx) + ", " + numLit(turning[0]) + ", " +
                   numLit(turning[1]) + ")";
        }
        var fixed = e[side === "in" ? "ri" : "ro"];
        if (fixed && (fixed[0] || fixed[1])) {
            return at + " + [" + numLit(fixed[0]) + ", " + numLit(fixed[1]) + "]";
        }
        return at;
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
                    kind: primKind(p.matchName), prim: true,
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
    //     tf linear map from an original path tangent to the control's bind frame

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
        // A point fixed in a control's own frame, in the path's units: where a
        // handle rests, turning and scaling with the control it belongs to.
        L.push("function _rp(n, rx, ry) {");
        L.push("  var l = _lay(n);");
        L.push("  if (l == null) { return null; }");
        L.push("  return _toG(fromCompToSurface(l.toComp([rx, ry])));");
        L.push("}");
        // Tangents are vectors, not positions. Transform both ends through
        // the same control frame so translation cancels and the curve keeps
        // its proportions and local angle when a Pivot scales or turns.
        L.push("function _tv(n, v, a, b, c, d) {");
        L.push("  var o = _rp(n, 0, 0);");
        L.push("  var q = _rp(n, a * v[0] + c * v[1], b * v[0] + d * v[1]);");
        L.push("  return o == null || q == null ? v : q - o;");
        L.push("}");
        L.push("function _mp(n, m) {");
        L.push("  var l = _lay(n);");
        L.push("  if (l == null) { return null; }");
        L.push("  var q;");
        L.push("  try { q = l.mask(m).maskPath.points()[1]; } catch (e) { return null; }");
        L.push("  return _toG(fromCompToSurface(l.toComp(q)));");
        L.push("}");
        L.push("var _v, _w;");

        for (i = 0; i < man.pts.length; i++) {
            var e = man.pts[i];
            var at = "_P[" + e.i + "]";
            L.push("if (_P.length > " + e.i + ") {");
            // Either a control of its own, or a point held in a Pivot's frame
            // and read back through it - the same reading either way.
            L.push("  _v = " + (e.pp
                ? ("_rp(" + estr(e.fx) + ", " + numLit(e.pp[0]) + ", " + numLit(e.pp[1]) + ")")
                : ("_cp(" + estr(e.fx) + ")")) +
                "; if (_v != null) { " + at + " = _v; }");
            var inAt = restBase(e, "in", at), outAt = restBase(e, "out", at);
            if (e.im || e["if"]) {
                L.push("  _w = " + inAt + "; if (_w == null) { _w = " + at + "; }");
                L.push("  _v = " + (e.im
                    ? ("_mp(" + estr(e.fx) + ", " + estr(MASK_IN) + ")")
                    : ("_cp(" + estr(e["if"]) + ")")) +
                    "; if (_v != null) { _I[" + e.i + "] = _v - _w; }");
            } else if (e.tf) {
                L.push("  _I[" + e.i + "] = _tv(" + estr(e.fx) + ", _I[" + e.i + "], " +
                       numLit(e.tf[0]) + ", " + numLit(e.tf[1]) + ", " +
                       numLit(e.tf[2]) + ", " + numLit(e.tf[3]) + ");");
            }
            if (e.om || e.of) {
                L.push("  _w = " + outAt + "; if (_w == null) { _w = " + at + "; }");
                L.push("  _v = " + (e.om
                    ? ("_mp(" + estr(e.fx) + ", " + estr(MASK_OUT) + ")")
                    : ("_cp(" + estr(e.of) + ")")) +
                    "; if (_v != null) { _O[" + e.i + "] = _v - _w; }");
            } else if (e.tf) {
                L.push("  _O[" + e.i + "] = _tv(" + estr(e.fx) + ", _O[" + e.i + "], " +
                       numLit(e.tf[0]) + ", " + numLit(e.tf[1]) + ", " +
                       numLit(e.tf[2]) + ", " + numLit(e.tf[3]) + ");");
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
        pivotMode: "pivot",       // pivot (one layer) | points (a control each)
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
    function circleShape(r) {
        var sh = new Shape();
        sh.closed = true;
        var k = r * KAPPA;
        sh.vertices = [[0, -r], [r, 0], [0, r], [-r, 0]];
        sh.inTangents = [[-k, 0], [0, -k], [k, 0], [0, k]];
        sh.outTangents = [[k, 0], [0, k], [-k, 0], [0, -k]];
        return sh;
    }

    // The Pivot's marker, drawn to the same proportions as the Pivot icon on
    // the panel: a ring with a dot at its centre and four ticks out to the
    // edge. It used to be an eight pointed star, which said nothing about what
    // the layer does and matched nothing in the panel.
    //
    // Three paths cannot share one paint here - a fill meant for the dot would
    // fill the ring solid as well - so the ring and ticks get their own group
    // with a stroke, and the dot gets another with a fill.
    function buildPivotMarker(vecs, r, col) {
        var paint = [col[0], col[1], col[2], 1];

        var gRing = vecs.addProperty(MN_GROUP);
        gRing.name = "Ring";
        var rv = gRing.property(MN_VECTORS);
        var ring = rv.addProperty(MN_SHAPEGRP);
        ring.name = "Ring Path";
        ring.property(MN_SHAPE).setValue(circleShape(r * 0.435));
        var axis = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        for (var t = 0; t < 4; t++) {
            var tick = rv.addProperty(MN_SHAPEGRP);
            tick.name = "Tick " + (t + 1);
            var sh = new Shape();
            sh.closed = false;
            sh.vertices = [[axis[t][0] * r * 0.609, axis[t][1] * r * 0.609],
                           [axis[t][0] * r, axis[t][1] * r]];
            sh.inTangents = [[0, 0], [0, 0]];
            sh.outTangents = [[0, 0], [0, 0]];
            tick.property(MN_SHAPE).setValue(sh);
        }
        var st = rv.addProperty(MN_STROKE);
        st.property("ADBE Vector Stroke Color").setValue(paint);
        st.property("ADBE Vector Stroke Width").setValue(Math.max(1, r * 0.191));

        var gCore = vecs.addProperty(MN_GROUP);
        gCore.name = "Core";
        var cv = gCore.property(MN_VECTORS);
        var core = cv.addProperty(MN_SHAPEGRP);
        core.name = "Core Path";
        core.property(MN_SHAPE).setValue(circleShape(Math.max(1, r * 0.139)));
        var fl = cv.addProperty(MN_FILL);
        fl.property("ADBE Vector Fill Color").setValue(paint);
    }

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

        if (kind === K_PIVOT) {
            buildPivotMarker(vecs, r, col);
        } else {
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
        }

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

    // After Effects draws the vertices of whatever path property is selected,
    // so showing them is a matter of selecting the property itself. Nothing in
    // the composition changes, which is why this is not an undo step.
    //
    // The layer is not selected here on purpose: After Effects selects it for
    // you the moment a property on it is selected, and clearing the layer
    // clears the property with it - the two cannot be separated. That is also
    // why the layer's bounding box comes along, and why the vertices show as
    // selected rather than hollow: the hollow look belongs to clicking the
    // path in the viewer, which scripting cannot reach.
    // What to select to put a path on screen: the group that holds it - the
    // shape group, or the mask for a mask path - rather than the path
    // property itself. Selecting the path selects all of its vertices with it,
    // which draws them as handles already grabbed; selecting the group round
    // it shows the path with its points left alone.
    function pointsHolder(item) {
        try {
            var g = item.prop.propertyGroup(1);
            if (g) { return g; }
        } catch (e) {}
        return item.prop;
    }

    function actShowPoints(items) {
        var comp = activeComp();
        if (!comp) { UI.say("Open a composition first."); return false; }
        if (!items.length) { UI.say("Nothing in view to show."); return false; }
        var i, showing = 0, holders = [];
        for (i = 0; i < items.length; i++) {
            holders.push(pointsHolder(items[i]));
            try { if (holders[i].selected) { showing++; } } catch (e) {}
        }
        // Every one of them already showing means the press is asking to stop.
        var want = (showing < items.length), done = 0;
        for (i = 0; i < items.length; i++) {
            try {
                // The path's own selection would grab every vertex, so clear it.
                if (want) { items[i].prop.selected = false; }
                holders[i].selected = want;
                done++;
            } catch (e2) {}
        }
        var what = done + " path" + (done === 1 ? "" : "s");
        UI.say(want ? "Showing the points of " + what + " in the composition."
                    : "Hid the points of " + what + ".");
        return true;
    }

    // Turn every rectangle, ellipse and star on these layers into a real
    // path. There is no button for this any more: it happens when a point on
    // one of them is rigged, which is the only time it was ever wanted.
    function toBezierOn(comp, layers) {
        {
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
            return done;
        }
    }

    // Picking a point on a parametric shape is a request for that shape to
    // become a path. Do it here, on use, and point the picks at the paths that
    // come out: the vertex order is the same, because the path is built from
    // the same parametricShape the preview drew its points from.
    // Replace one parametric shape with the bezier path it describes, in the
    // slot it was in and under the name it had.
    function convertOne(comp, prim) {
        var sh = parametricShape(prim.prop, comp.time);
        if (!sh) { return false; }
        var holder = prim.prop.propertyGroup(1);
        var at = prim.prop.propertyIndex;
        var nm = prim.prop.name;
        // Drop it before adding the replacement: adding renumbers the group.
        prim.prop.remove();
        var ng = holder.addProperty(MN_SHAPEGRP);
        ng.property(MN_SHAPE).setValue(sh);
        try { ng.name = nm; } catch (e) {}
        try { ng.moveTo(at); } catch (e2) {}
        return true;
    }

    function resolvePrimitives(comp, picks) {
        var want = [], layers = [], seenL = {}, seenK = {}, i, n, q;
        for (i = 0; i < picks.length; i++) {
            var it0 = picks[i].item;
            if (!it0 || !it0.prim || seenK[it0.key]) { continue; }
            seenK[it0.key] = true;
            // Only the shapes whose points were picked: a neighbour on the
            // same layer is left as it is.
            want.push({ layer: it0.layer, chain: it0.chain.join("/"), sname: it0.sname });
            if (!seenL[it0.layer.id]) { seenL[it0.layer.id] = true; layers.push(it0.layer); }
        }
        if (!want.length) { return { picks: picks, made: 0 }; }

        var made = 0;
        for (n = 0; n < want.length; n++) {
            // Look again each time: converting one renumbers its group and
            // makes every reference held into that group stale.
            var prims = scanPrimitives(comp, [want[n].layer]);
            for (q = 0; q < prims.length; q++) {
                if (prims[q].sname !== want[n].sname) { continue; }
                if (prims[q].chain.join("/") !== want[n].chain) { continue; }
                if (convertOne(comp, prims[q])) { made++; }
                break;
            }
        }
        var fresh = scanPaths(comp, layers), out = [];
        for (i = 0; i < picks.length; i++) {
            var it = picks[i].item;
            if (!it || !it.prim) { out.push(picks[i]); continue; }
            var found = null;
            for (n = 0; n < fresh.length && !found; n++) {
                if (!sameLayer(fresh[n].layer, it.layer)) { continue; }
                if (fresh[n].sname !== it.sname) { continue; }
                if (fresh[n].chain.join("/") !== it.chain.join("/")) { continue; }
                found = fresh[n];
            }
            if (found) { out.push({ item: found, idx: picks[i].idx }); }
        }
        return { picks: out, made: made };
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

    // Capture the path-to-control linear map at attachment. Reading original
    // tangents live (rather than storing their current values) also preserves
    // tangent animation on the underlying path. Probe includes layer, parent
    // and nested shape-group transforms, including nonuniform scale.
    function tangentFrame(probe, item, ctrl, at, t) {
        var pts = [at, [at[0] + 1, at[1]], [at[0], at[1] + 1]], loc = [];
        for (var i = 0; i < pts.length; i++) {
            loc.push(probe.intoLayer(ctrl, probe.at(item, pts[i], t), t));
        }
        return [loc[1][0] - loc[0][0], loc[1][1] - loc[0][1],
                loc[2][0] - loc[0][0], loc[2][1] - loc[0][1]];
    }

    function bindTangents(probe, item, man, t) {
        var base = null, fixed = 0;
        for (var i = 0; i < man.pts.length; i++) {
            var e = man.pts[i];
            if (e.tf) { continue; }
            var ctrl = linkedLayer(item.layer, e.fx);
            if (!ctrl) { continue; }
            if (!base) { base = basePath(item, t); }
            var at = base.vertices[e.i];
            if (!at) { continue; }
            e.tf = tangentFrame(probe, item, ctrl, at, t);
            fixed++;
        }
        return fixed;
    }

    // Explicit Refresh upgrades older Vertex Rig expressions in one undo
    // step. Bind the current pose so existing artwork does not jump.
    function actRepairTangents() {
        var comp = activeComp();
        if (!comp) { return false; }
        var rigs = rigIndex(comp), needs = false;
        for (var i = 0; i < rigs.length && !needs; i++) {
            for (var j = 0; j < rigs[i].man.pts.length; j++) {
                if (!rigs[i].man.pts[j].tf) { needs = true; break; }
            }
        }
        if (!needs) { return false; }
        return run("Update tangent bindings", function (c) {
            var probe = new Probe(c), fixed = 0;
            try {
                for (var r = 0; r < rigs.length; r++) {
                    var n = bindTangents(probe, rigs[r].item, rigs[r].man, c.time);
                    if (!n) { continue; }
                    fixed += n;
                    writeBack(rigs[r].item, rigs[r].man);
                }
            } finally { probe.done(); }
            return "Updated tangent bindings on " + fixed + " point(s).";
        });
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
            // Put any old constant stand-offs right first. This runs even
            // when there is nothing else to do, because a rig whose points are
            // already handled would otherwise never be rewritten, and would go
            // on pulling apart under a Pivot for ever.
            var touched = (upgradeRests(comp, probe, item, man) > 0);
            if (bindTangents(probe, item, man, comp.time)) { touched = true; }
            // Free any handle mask still carrying that expression, so a rig
            // made while it was there becomes draggable again.
            unpinMaskHandles(item, man);
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
                entry.tf = tangentFrame(probe, item, fresh, sh.vertices[i], comp.time);
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
            return "Pick some points, or select their controls, first.";
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

    // Points picked on the canvas and points whose controls are selected in
    // the timeline mean the same thing, so take both and count each once.
    function mergePicks(a, b) {
        var all = (a || []).concat(b || []), out = [], byKey = {}, i, k;
        for (i = 0; i < all.length; i++) {
            var pick = all[i];
            if (!pick || !pick.item) { continue; }
            var key = pick.item.key;
            if (!byKey[key]) {
                byKey[key] = { item: pick.item, idx: [] };
                out.push(byKey[key]);
            }
            for (k = 0; k < pick.idx.length; k++) {
                if (indexOf(byKey[key].idx, pick.idx[k]) < 0) {
                    byKey[key].idx.push(pick.idx[k]);
                }
            }
        }
        for (i = 0; i < out.length; i++) {
            out[i].idx.sort(function (x, y) { return x - y; });
        }
        return out;
    }

    function actCreate(picks, withHandles, selLayers) {
        return run(withHandles ? "Create controls with handles" : "Create controls", function (comp) {
            // Selecting a point's control, or one of its handles, is as good
            // as picking the point on the canvas - the same way Delete reads a
            // selection - so Handles can fill in the side that is missing
            // without going back to the preview to find the point again.
            var work = mergePicks(picks, picksFromControls(comp, selLayers || []));
            // Any parametric shape among them becomes a path first. This has
            // to happen before the signature is taken, or the new path would
            // read as artwork that appeared out of nowhere.
            var turned = resolvePrimitives(comp, work);
            work = turned.picks;
            // Rigging hands a point to a control that sits exactly where it
            // already was, so the curve must come out identical to the pixel.
            var before = allPathSignature(comp);
            var probe = new Probe(comp);
            var r;
            try {
                r = rigPoints(comp, probe, work, withHandles);
            } finally {
                probe.done();
            }
            checkUnchanged(comp, before, "Rigging");
            var out = rigReport(r, withHandles);
            if (turned.made) {
                out += " Turned " + turned.made + " shape" +
                       (turned.made === 1 ? "" : "s") + " into a bezier path on the way.";
            }
            return out;
        });
    }

    // ------------------------------------------------------ bezier handles

    // A handle mask was briefly given an expression that held its near end on
    // the point. After Effects will not let you drag a mask path that has an
    // expression, so that froze the far end too - the one end that matters -
    // and it has to come back off. Dragging the near end was only ever untidy:
    // the rig reads points()[1] and has never looked at the other end.
    var PIN_NEAR_END = [
        "var p = thisProperty.points();",
        "var i = thisProperty.inTangents();",
        "var o = thisProperty.outTangents();",
        "if (p.length) { p[0] = [0, 0]; i[0] = [0, 0]; o[0] = [0, 0]; }",
        "createPath(p, i, o, false);"
    ].join("\n");

    function unpinMaskHandles(item, man) {
        var freed = 0;
        for (var n = 0; n < man.pts.length; n++) {
            var e = man.pts[n];
            if (!e.im && !e.om) { continue; }
            var ctrl = linkedLayer(item.layer, e.fx);
            var masks = null;
            try { masks = ctrl ? ctrl.property(MN_MASKS) : null; } catch (e1) { masks = null; }
            for (var m = 1; masks && m <= masks.numProperties; m++) {
                var mk = masks.property(m);
                if (mk.name !== MASK_IN && mk.name !== MASK_OUT) { continue; }
                try {
                    var sp = mk.property(MN_MASKSHAPE);
                    if (String(sp.expression || "") !== PIN_NEAR_END) { continue; }
                    // Keep where the handle is now, then let it go.
                    var here = sp.valueAtTime(item.layer.containingComp.time, false);
                    sp.expression = "";
                    sp.setValue(here);
                    freed++;
                } catch (e2) {}
            }
        }
        return freed;
    }

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

    // Where a handle actually sits now, in composition space.
    function handleAt(comp, probe, item, e, side) {
        var ctrl = linkedLayer(item.layer, e.fx);
        if (!ctrl) { return null; }
        if (side === "in" ? e.im : e.om) {
            var masks = null;
            try { masks = ctrl.property(MN_MASKS); } catch (e1) { return null; }
            var want = (side === "in") ? MASK_IN : MASK_OUT;
            for (var m = 1; masks && m <= masks.numProperties; m++) {
                if (masks.property(m).name !== want) { continue; }
                var lp = masks.property(m).property(MN_MASKSHAPE)
                              .valueAtTime(comp.time, false).vertices[1];
                return probe.outOfLayer(ctrl, lp, comp.time);
            }
            return null;
        }
        var nm = (side === "in") ? e["if"] : e.of;
        var hl = nm ? linkedLayer(item.layer, nm) : null;
        return hl ? probe.outOfLayer(hl, [0, 0], comp.time) : null;
    }

    // A stand-off written before it turned with the rig is a constant in the
    // path's own units, so a Pivot that turns or scales drags the point and
    // its handle apart. Move it into the control's frame the next time the rig
    // is written. A handle still sitting on its stand-off converts exactly,
    // whatever pose the Pivot happens to be in, because where it is IS the
    // stand-off; one that has been moved is converted through the chain, which
    // is exact with the Pivot at rest.
    function upgradeRests(comp, probe, item, man) {
        var sides = [["ri", "bi", "in"], ["ro", "bo", "out"]];
        var live = null, base = null, fixed = 0;
        for (var n = 0; n < man.pts.length; n++) {
            var e = man.pts[n];
            if (!linkedLayer(item.layer, e.fx)) { continue; }
            for (var s = 0; s < sides.length; s++) {
                var oldK = sides[s][0], newK = sides[s][1], side = sides[s][2];
                if (!e[oldK] || e[newK]) { continue; }
                if (!live) { live = item.prop.valueAtTime(comp.time, false); }
                var tan = (side === "in") ? live.inTangents[e.i] : live.outTangents[e.i];
                var moved = tan && (Math.abs(tan[0]) > 0.5 || Math.abs(tan[1]) > 0.5);
                var cp = moved ? null : handleAt(comp, probe, item, e, side);
                if (!cp) {
                    if (!base) { base = basePath(item, comp.time); }
                    var v = base.vertices[e.i];
                    if (!v) { continue; }
                    cp = probe.at(item, [v[0] + e[oldK][0], v[1] + e[oldK][1]], comp.time);
                }
                var off = probe.intoLayer(linkedLayer(item.layer, e.fx), cp, comp.time);
                e[newK] = [off[0], off[1]];
                delete e[oldK];
                fixed++;
            }
        }
        return fixed;
    }

    // Give one already-rigged point its two bezier handle controls.
    function addHandlesTo(comp, probe, item, sh, entry, ctrl, upp) {
        var i = entry.i;
        var vtx = sh.vertices[i];
        var pairs = [
            { key: "in", tan: sh.inTangents[i], mask: MASK_IN, mf: "if", mm: "im", rk: "bi", lbl: "In" },
            { key: "out", tan: sh.outTangents[i], mask: MASK_OUT, mf: "of", mm: "om", rk: "bo", lbl: "Out" }
        ];
        for (var p = 0; p < pairs.length; p++) {
            var pr = pairs[p];
            if (entry[pr.mm] || entry[pr.mf]) { continue; }
            var t = pr.tan || [0, 0], resting = false;
            if (Math.abs(t[0]) < 0.001 && Math.abs(t[1]) < 0.001) {
                // A corner has no tangent to show. Parking the handle on the
                // vertex leaves nothing to grab, and inventing a tangent
                // rounds the corner off - so stand it off along the path and
                // record the stand-off, which the expression takes back out.
                // The corner stays a corner until the handle is really moved.
                t = restOffset(sh, i, pr.key === "in", (Number(upp) || 1) * HANDLE_REST_PX);
                resting = true;
            }
            var compPt = probe.at(item, [vtx[0] + t[0], vtx[1] + t[1]], comp.time);
            var off = probe.intoLayer(ctrl, compPt, comp.time);
            // Kept in the control's frame, not the path's, so it turns with it.
            if (resting) { entry[pr.rk] = [off[0], off[1]]; }
            if (P.handleMode === "masks") {
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

    // Every picked vertex kept in the Pivot's own frame and read back through
    // it, so one layer carries the lot: moving, turning or scaling the Pivot
    // takes them all, and nothing is made per point.
    function pivotOnly(comp, picks, extraLayers) {
        var probe = new Probe(comp);
        try {
            var sx = 0, sy = 0, count = 0, n, i, sh, v;
            for (n = 0; n < picks.length; n++) {
                if (!picks[n].item || isForeignRig(picks[n].item.prop)) { continue; }
                sh = basePath(picks[n].item, comp.time);
                for (i = 0; i < picks[n].idx.length; i++) {
                    v = sh.vertices[picks[n].idx[i]];
                    if (!v) { continue; }
                    var w = probe.at(picks[n].item, v, comp.time);
                    sx += w[0]; sy += w[1]; count++;
                }
            }
            if (!count) { return "Pick some points first."; }

            var piv = makePivot(comp, [sx / count, sy / count]);
            var done = 0, paths = 0, heldCtrls = [];
            for (n = 0; n < picks.length; n++) {
                var it = picks[n].item;
                if (!it || isForeignRig(it.prop)) { continue; }
                var man = readManifest(it.prop) || { v: 1, pts: [] };
                var base = basePath(it, comp.time);
                var fx = addLink(it.layer, piv);
                var touched = bindTangents(probe, it, man, comp.time) > 0;
                var added = false;
                for (i = 0; i < picks[n].idx.length; i++) {
                    var idx = picks[n].idx[i];
                    if (idx >= base.vertices.length) { continue; }
                    // A point that already has a control of its own keeps it,
                    // and the control is hung off the Pivot instead - so
                    // pressing Pivot always groups what was picked, however
                    // those points came to be rigged.
                    var was = manEntry(man, idx);
                    if (was) {
                        if (!was.pp) {
                            var hc = linkedLayer(it.layer, was.fx);
                            if (hc) { heldCtrls.push(hc); }
                        }
                        continue;
                    }
                    var cp = probe.at(it, base.vertices[idx], comp.time);
                    var loc = probe.intoLayer(piv, cp, comp.time);
                    man.pts.push({ i: idx, fx: fx, pp: [loc[0], loc[1]],
                                   tf: tangentFrame(probe, it, piv, base.vertices[idx], comp.time) });
                    done++;
                    touched = true;
                    added = true;
                }
                if (!added) { removeEffect(it.layer, fx); }
                if (touched) {
                    man.pts.sort(function (a, b) { return a.i - b.i; });
                    it.prop.expression = buildPathExpression(man, it.chain);
                    paths++;
                }
            }

            // Controls picked by hand hang off it as well, so the two ways of
            // working share a Pivot.
            for (i = 0; i < extraLayers.length; i++) {
                var k = kindOf(extraLayers[i]);
                if (k === K_POINT || k === K_PIVOT) { heldCtrls.push(extraLayers[i]); }
            }
            heldCtrls = dedupeLayers(heldCtrls);
            var hung = 0;
            for (i = 0; i < heldCtrls.length; i++) {
                if (sameLayer(heldCtrls[i], piv)) { continue; }
                try { heldCtrls[i].parent = piv; hung++; } catch (e) {}
            }

            if (!done && !hung) {
                try { piv.remove(); } catch (e2) {}
                return "Pick some points first.";
            }
            piv.selected = true;
            var bits = [];
            if (done) {
                bits.push("driving " + done + " point" + (done === 1 ? "" : "s") +
                          " on " + paths + " path" + (paths === 1 ? "" : "s"));
            }
            if (hung) {
                bits.push("carrying " + hung + " control" + (hung === 1 ? "" : "s") +
                          " that already existed");
            }
            return "Pivot " + bits.join(", ") + ".";
        } finally {
            probe.done();
        }
    }

    function actPivot(picks, extraLayers) {
        return run("Create Pivot", function (comp) {
            var turned = resolvePrimitives(comp, picks);
            picks = turned.picks;
            if (P.pivotMode !== "points") { return pivotOnly(comp, picks, extraLayers); }
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
            // Upgrade before reparenting so the binding is made in the old,
            // visually unchanged frame.
            var probe = new Probe(comp);
            try {
                var old = picks.concat(picksFromControls(comp, selLayers)), seen = {};
                for (var r = 0; r < old.length; r++) {
                    var it = old[r].item;
                    if (seen[it.key]) { continue; }
                    seen[it.key] = true;
                    var man = readManifest(it.prop);
                    if (man && bindTangents(probe, it, man, comp.time)) { writeBack(it, man); }
                }
            } finally { probe.done(); }
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
        if (entry.pp) {
            // The link names a Pivot that the other points share, so the entry
            // goes and the layer stays. Delete the Pivot itself to be rid of it.
            dropEntry(man, entry.i);
            var stillUsed = false;
            for (var u = 0; u < man.pts.length; u++) {
                if (man.pts[u].fx === entry.fx) { stillUsed = true; break; }
            }
            if (!stillUsed) { removeEffect(item.layer, entry.fx); }
            return;
        }
        var ctrl = linkedLayer(item.layer, entry.fx);
        removeEffect(item.layer, entry.fx);
        if (ctrl) {
            releaseChildren(comp, ctrl);
            try { ctrl.remove(); } catch (e2) {}
        }
        dropEntry(man, entry.i);
    }

    // Drop one handle and leave its point where it is. Selecting a handle and
    // pressing Delete used to map back to the point that owns it and take the
    // whole thing.
    function removeHandleLayer(comp, layer) {
        var idx = rigIndex(comp), sides = ["if", "of"];
        for (var r = 0; r < idx.length; r++) {
            var item = idx[r].item, man = idx[r].man;
            for (var e = 0; e < man.pts.length; e++) {
                var ent = man.pts[e];
                for (var sd = 0; sd < sides.length; sd++) {
                    var nm = ent[sides[sd]];
                    if (!nm || !sameLayer(linkedLayer(item.layer, nm), layer)) { continue; }
                    removeEffect(item.layer, nm);
                    try { layer.remove(); } catch (e1) {}
                    delete ent[sides[sd]];
                    writeBack(item, man);
                    return true;
                }
            }
        }
        return false;
    }

    // Take every point a Pivot was holding directly out of the rigs that
    // name it. Returns how many stopped following it.
    function stripPivotEntries(comp, piv) {
        var idx = rigIndex(comp), gone = 0;
        for (var r = 0; r < idx.length; r++) {
            var item = idx[r].item, man = idx[r].man, e, nm;
            // One link serves every point a Pivot holds, so settle which links
            // name it before touching any: removing the first effect would
            // blind the lookup for all the points that shared it.
            var mine = {};
            for (e = 0; e < man.pts.length; e++) {
                nm = man.pts[e].fx;
                if (!man.pts[e].pp || mine[nm] !== undefined) { continue; }
                mine[nm] = sameLayer(linkedLayer(item.layer, nm), piv);
            }
            var keep = [], any = false;
            for (e = 0; e < man.pts.length; e++) {
                if (man.pts[e].pp && mine[man.pts[e].fx]) { gone++; any = true; }
                else { keep.push(man.pts[e]); }
            }
            if (!any) { continue; }
            man.pts = keep;
            for (nm in mine) {
                if (mine.hasOwnProperty(nm) && mine[nm]) { removeEffect(item.layer, nm); }
            }
            writeBack(item, man);
        }
        return gone;
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

    // The one way to take something off: points, their handles, a pivot, a
    // follower or an average rider - whatever is picked or selected.
    function actDelete(picks, selLayers, bake) {
        return run(bake ? "Delete with bake" : "Delete", function (comp) {
            var work = picks.slice(0);
            var rest = [], pivots = 0, riders = 0, hands = 0, i;
            for (i = 0; i < selLayers.length; i++) {
                var kind = kindOf(selLayers[i]);
                if (kind === K_PIVOT) {
                    releaseChildren(comp, selLayers[i]);
                    // Points it was holding directly would be left reading a
                    // layer that is gone, so they come out of the rig with it.
                    stripPivotEntries(comp, selLayers[i]);
                    try { selLayers[i].remove(); pivots++; } catch (e) {}
                } else if (kind === K_HANDLE) {
                    if (removeHandleLayer(comp, selLayers[i])) { hands++; }
                } else if (isFollower(selLayers[i])) {
                    detachFollower(comp, selLayers[i]);
                    riders++;
                } else {
                    rest.push(selLayers[i]);
                }
            }
            selLayers = rest;
            var extra = pivots + riders + hands;

            function tally() {
                var b = [];
                if (pivots) { b.push(pivots + " pivot" + (pivots === 1 ? "" : "s")); }
                if (riders) { b.push(riders + " follower" + (riders === 1 ? "" : "s")); }
                if (hands) { b.push(hands + " handle" + (hands === 1 ? "" : "s")); }
                return b.join(", ");
            }

            // Nothing picked and nothing selected used to mean every rig in the
            // composition, which is not a thing to do on one click from the
            // top row.
            if (!extra && !work.length && !selLayers.length) {
                return "Pick some points, or select the controls, pivot or follower to remove.";
            }
            if (extra && !work.length && !selLayers.length) {
                return "Removed " + tally() + ".";
            }
            var ctrlPicks = picksFromControls(comp, selLayers);
            for (i = 0; i < ctrlPicks.length; i++) { work.push(ctrlPicks[i]); }

            // Baking is a whole-path operation, and so is "nothing picked".
            var whole = bake || !work.length;
            if (whole) {
                var idx = rigIndex(comp);
                var scope = [];
                for (i = 0; i < idx.length; i++) {
                    var keep = false;
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
            // A rigged path's visible value already contains the Pivot's
            // tangent transform. Copy its underlying shape before installing
            // the expression, otherwise Merge applies that transform twice.
            var rawShape = sp.expressionEnabled &&
                           (sp.matchName === MN_SHAPE || sp.matchName === MN_MASKSHAPE);
            try {
                if (rawShape) { sp.expressionEnabled = false; }
                dp.setValue(sp.value);
            } catch (e3) {
                if (carriesData(sp)) { copyLost++; }
            } finally {
                if (rawShape) { sp.expressionEnabled = true; }
            }
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
                try { dp.name = sp.name; } catch (e1) {}
                copyLeaf(sp, dp);
            } else {
                var can = false;
                try { can = dst.canAddProperty(sp.matchName); } catch (e2) { can = false; }
                if (can) {
                    try { dp = dst.addProperty(sp.matchName); } catch (e3) { dp = null; }
                }
                if (!dp) { dp = childByMatch(dst, sp.matchName, sp.name); }
                if (!dp) { if (carriesData(sp)) { copyLost++; } continue; }
                try { dp.name = sp.name; } catch (e4) {}
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
                            pp: e.pp, tf: e.tf, bi: e.bi, bo: e.bo, ri: e.ri, ro: e.ro,
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
                    try { dp.name = sp.name; } catch (e3) {}
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
                        if (c2.pp) { ent.pp = c2.pp; }
                        if (c2.tf) { ent.tf = c2.tf; }
                        if (c2.bi) { ent.bi = c2.bi; }
                        if (c2.bo) { ent.bo = c2.bo; }
                        if (c2.ri) { ent.ri = c2.ri; }
                        if (c2.ro) { ent.ro = c2.ro; }
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

    // ---------------------------------------------------------------- icons
    // Drawn, never loaded. ScriptUI will not scale a bitmap for a retina
    // display, so a 28px PNG arrives upscaled and soft; these are paths in a
    // 28-unit box that the panel strokes itself at whatever size the screen
    // asks for, which costs no temp files and stays sharp at any density.
    //
    // An op is ["p", width, [x,y,...]] for a polyline, ["b", width, [8 numbers]]
    // for a cubic, ["x", width, x0,y0,x1,y1] for a rectangle, and "c" / "r" /
    // "d" with centre and radius for a circle, square or diamond. Width 0 means
    // filled. "Vertex Rig icons/mkicons.py" draws these and prints this block.
    // One height for everything the panel puts on a row - icon buttons, text
    // buttons, dropdowns - so a row reads as a row instead of as three
    // controls that happen to be next to each other.
    var UI_H = 32;
    var ICON_PX = UI_H;
    // The top row is the utility row - what the panel shows, what is picked,
    // and the things that act on whole layers. It runs smaller than the tabs,
    // which is what lets all four of its sections sit on one line.
    var HEAD_PX = 26;
    var ICON_UNITS = 28;

    var ICON_ART = {
        "create": [["b",2.4,[4,20,10,9,18,21,24,10]],["c",0,14,15.2,5.2]],
        "handles": [["p",2.0,[5,19,23,9]],["c",0,5,19,3.4],["c",0,23,9,3.4],["r",0,14,14,4.6]],
        "delete": [["x",2.2,6,6,22,22],["p",2.2,[10,10,18,18]],["p",2.2,[18,10,10,18]]],
        "bake": [["p",1.76,[3,14,25,14]],["d",0,6.5,14,3.6],["d",0,14,14,3.6],["d",0,21.5,14,3.6]],
        "apply": [["p",2.2,[4,9,20,9]],["p",2.2,[16,5.0,20,9,16,13.0]],["p",2.2,[24,19,8,19]],["p",2.2,[12,15,8,19,12,23]]],
        "pivot": [["c",2.2,14,14,5.0],["c",0,14,14,1.6],["p",2.2,[14,2.5,14,7]],["p",2.2,[14,21,14,25.5]],["p",2.2,[2.5,14,7,14]],["p",2.2,[21,14,25.5,14]]],
        "addpivot": [["c",2.2,12,12,4.4],["c",0,12,12,1.5],["p",2.2,[12,2.5,12,6]],["p",2.2,[2.5,12,6,12]],["p",2.2,[18,12,21.5,12]],["p",2.2,[12,18,12,21.5]],["p",2.2,[22,18,22,26]],["p",2.2,[18,22,26,22]]],
        "release": [["c",2.2,11,15,4.4],["c",0,11,15,1.5],["p",2.2,[11,5.5,11,9]],["p",2.2,[1.5,15,5,15]],["p",2.2,[11,21,11,24.5]],["p",2.2,[17,15,20.5,15]],["p",2.2,[19,10,25,4]],["p",2.2,[20.5,4,25,4,25,8.5]]],
        "follower": [["p",1.76,[4,14,24,14]],["c",0,10,14,3.4],["p",2.2,[19,10.0,23,14,19,18.0]]],
        "average": [["p",1.32,[14,13.5,7,8]],["p",1.32,[14,13.5,21,8]],["p",1.32,[14,13.5,14,22]],["r",1.98,7,8,2.8],["r",1.98,21,8,2.8],["r",1.98,14,22,2.8],["r",0,14,13.5,3.2]],
        "extract": [["p",2.2,[14,5,14,23]],["p",2.2,[10,14,4,14]],["p",2.2,[7,10,3,14,7,18]],["p",2.2,[18,14,24,14]],["p",2.2,[21,10.0,25,14,21,18.0]]],
        "merge": [["p",2.2,[14,5,14,23]],["p",2.2,[3,14,9,14]],["p",2.2,[6,10.0,10,14,6,18.0]],["p",2.2,[25,14,19,14]],["p",2.2,[22,10,18,14,22,18]]],
        "prefs": [["p",1.54,[4,8,24,8]],["r",0,18,8,2.9],["p",1.54,[4,14,24,14]],["r",0,10,14,2.9],["p",1.54,[4,20,24,20]],["r",0,21,20,2.9]],
        "refresh": [["p",2.2,[20.5,8.5,21.0,9.2,21.5,10.0,21.9,10.8,22.2,11.7,22.4,12.5,22.5,13.4,22.5,14.3,22.4,15.2,22.2,16.1,22.0,16.9,21.6,17.7,21.2,18.5,20.7,19.2,20.1,19.9,19.5,20.5,18.8,21.0,18.0,21.5,17.2,21.9,16.3,22.2,15.5,22.4,14.6,22.5,13.7,22.5,12.8,22.4,11.9,22.2,11.1,22.0,10.3,21.6,9.5,21.2,8.8,20.7,8.1,20.1,7.5,19.5,7.0,18.8,6.5,18.0,6.1,17.2,5.8,16.3,5.6,15.5,5.5,14.6,5.5,13.7,5.6,12.8,5.8,11.9,6.0,11.1,6.4,10.3,6.8,9.5,7.3,8.8,7.9,8.1,8.5,7.5,9.2,7.0,10.0,6.5,10.8,6.1]],["p",2.2,[20.5,8.5,24.5,9.8]],["p",2.2,[20.5,8.5,21.1,12.7]]],
        "points": [["b",1.65,[3,19,10,22,18,6,25,9]],["r",1.98,3,19,2.9],["r",1.98,14,14,2.9],["r",1.98,25,9,2.9]],
        "all": [["r",0,9,9,3.6],["r",0,19,9,3.6],["r",0,9,19,3.6],["r",0,19,19,3.6]],
        "none": [["r",1.98,9,9,3.6],["r",1.98,19,9,3.6],["r",1.98,9,19,3.6],["r",1.98,19,19,3.6]],
        "invert": [["r",0,9,9,3.6],["r",1.98,19,9,3.6],["r",1.98,9,19,3.6],["r",0,19,19,3.6]]
    };

    // After Effects' own buttons: a flat dark fill, a lighter hairline and a
    // small radius. These are drawn to match, so an icon button sits beside a
    // text button without looking like it came from somewhere else.
    var BTN_FILL = [0.192, 0.192, 0.192];
    var BTN_FILL_HOT = [0.255, 0.255, 0.255];
    var BTN_FILL_DOWN = [0.125, 0.125, 0.125];
    // Close to the fill on purpose: enough of an edge to read as a button,
    // not enough to draw a box around every icon.
    var BTN_LINE = [0.26, 0.26, 0.26];
    var BTN_LINE_HOT = [0.38, 0.38, 0.38];
    var BTN_RADIUS = 4;
    var ICON_COL = [0.82, 0.82, 0.82];

    // ScriptUI draws lines and rectangles but has no rounded rectangle, so the
    // corners are stepped round in short segments.
    function roundRectPath(g, x, y, w, h, r) {
        var corner = [[x + w - r, y + r, -90], [x + w - r, y + h - r, 0],
                      [x + r, y + h - r, 90], [x + r, y + r, 180]];
        var pts = [], c, i, a;
        for (c = 0; c < 4; c++) {
            for (i = 0; i <= 4; i++) {
                a = (corner[c][2] + i * 22.5) * Math.PI / 180;
                pts.push([corner[c][0] + Math.cos(a) * r, corner[c][1] + Math.sin(a) * r]);
            }
        }
        g.newPath();
        g.moveTo(pts[0][0], pts[0][1]);
        for (i = 1; i < pts.length; i++) { g.lineTo(pts[i][0], pts[i][1]); }
        g.closePath();
    }

    function drawArt(g, ops, ox, oy, size, col, alpha) {
        var k = size / ICON_UNITS;
        var rgba = [col[0], col[1], col[2], alpha];
        var brush = g.newBrush(g.BrushType.SOLID_COLOR, rgba);
        for (var i = 0; i < ops.length; i++) {
            var op = ops[i], w = op[1], n, t, u, x, y;
            var pen = g.newPen(g.PenType.SOLID_COLOR, rgba, Math.max(1, w * k));
            if (op[0] === "p") {
                var v = op[2];
                g.newPath();
                g.moveTo(ox + v[0] * k, oy + v[1] * k);
                for (n = 2; n < v.length; n += 2) {
                    g.lineTo(ox + v[n] * k, oy + v[n + 1] * k);
                }
                g.strokePath(pen);
            } else if (op[0] === "b") {
                var b = op[2];
                g.newPath();
                for (n = 0; n <= 16; n++) {
                    t = n / 16; u = 1 - t;
                    x = u*u*u*b[0] + 3*u*u*t*b[2] + 3*u*t*t*b[4] + t*t*t*b[6];
                    y = u*u*u*b[1] + 3*u*u*t*b[3] + 3*u*t*t*b[5] + t*t*t*b[7];
                    if (n === 0) { g.moveTo(ox + x * k, oy + y * k); }
                    else { g.lineTo(ox + x * k, oy + y * k); }
                }
                g.strokePath(pen);
            } else if (op[0] === "x") {
                g.newPath();
                g.rectPath(ox + op[2] * k, oy + op[3] * k,
                           (op[4] - op[2]) * k, (op[5] - op[3]) * k);
                g.strokePath(pen);
            } else {
                var cx = ox + op[2] * k, cy = oy + op[3] * k, r = op[4] * k;
                g.newPath();
                if (op[0] === "c") {
                    g.ellipsePath(cx - r, cy - r, r * 2, r * 2);
                } else if (op[0] === "r") {
                    g.rectPath(cx - r, cy - r, r * 2, r * 2);
                } else {
                    g.moveTo(cx, cy - r);
                    g.lineTo(cx + r, cy);
                    g.lineTo(cx, cy + r);
                    g.lineTo(cx - r, cy);
                    g.closePath();
                }
                if (w === 0) { g.fillPath(brush); } else { g.strokePath(pen); }
            }
        }
    }

    // Ask a control to paint itself again. ScriptUI repaints a custom-drawn
    // button when the pointer arrives and not reliably when it leaves, so the
    // hover shade stayed on the last button touched until something else
    // forced the window to redraw.
    function repaint(ctrl) {
        try { ctrl.notify("onDraw"); } catch (e) {}
    }

    // The draw state is only as current as the last repaint After Effects
    // decided to do, which is exactly what went wrong, so hover and press are
    // tracked on the control and the paint reads those.
    function paintIconButton(ctrl, ops, st) {
        var g = ctrl.graphics;
        var w = ctrl.size.width, h = ctrl.size.height;
        var hot = (ctrl.hot === true), down = (ctrl.down === true);
        var fill = down ? BTN_FILL_DOWN : (hot ? BTN_FILL_HOT : BTN_FILL);
        var edge = hot ? BTN_LINE_HOT : BTN_LINE;
        roundRectPath(g, 0.5, 0.5, w - 1, h - 1, BTN_RADIUS);
        g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, [fill[0], fill[1], fill[2], 1]));
        roundRectPath(g, 0.5, 0.5, w - 1, h - 1, BTN_RADIUS);
        g.strokePath(g.newPen(g.PenType.SOLID_COLOR, [edge[0], edge[1], edge[2], 1], 1));
        var size = Math.min(w, h) - 6;
        drawArt(g, ops, (w - size) / 2, (h - size) / 2, size, ICON_COL,
                ctrl.enabled ? 1 : 0.4);
    }

    var state = {
        items: [],
        geom: [],
        prims: [],
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

    function geomFor(item, t) {
        var sh;
        if (item.prim) {
            // A rectangle, ellipse or star is a handful of numbers rather
            // than a path. Draw the path it would make, so its points can be
            // seen and picked like any other.
            try { sh = parametricShape(item.prop, t); } catch (e0) { return null; }
            if (!sh) { return null; }
        } else {
            try { sh = item.prop.valueAtTime(t, false); } catch (e) { return null; }
        }
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
                 closed: sh.closed, prim: !!item.prim,
                 foreign: !item.prim && isForeignRig(item.prop) };
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
        // Shortened from "Selected layers": the row has seven icons and two
        // rules to fit beside it now, and 96 points is what it can spare.
        var scopeDd = head.add("dropdownlist", undefined,
                               ["Selected layers", "All layers"]);
        scopeDd.selection = 0;
        scopeDd.preferredSize = [104, HEAD_PX];

        // A hairline between the groups of the row: what it shows, what is
        // picked, what moves shapes between layers, and what the panel does to
        // the rig. 104 + 8*26 + 3 + 11*4 = 359 of the 368 points inside the
        // panel's margins.
        function headRule() {
            var sep = head.add("panel");
            sep.alignment = ["left", "center"];
            sep.minimumSize = [1, 8];
            sep.preferredSize = [1, HEAD_PX - 8];
            sep.maximumSize = [1, HEAD_PX];
            return sep;
        }

        var bRefresh = act(head, "refresh", "Refresh",
                           "Read the composition again and frame it", 62, HEAD_PX);
        var bPoints = act(head, "points", "Show points",
                          "Show the path's own points in the composition", 76, HEAD_PX);
        headRule();
        // One button for both: it offers All while nothing is picked and None
        // once something is, so the picture always shows what pressing it does.
        var bPick = act(head, "all", "All", "Pick every point in view", 40, HEAD_PX);
        bPick.onDraw = function (st) {
            paintIconButton(this, countSel() ? ICON_ART.none : ICON_ART.all, st);
        };
        var bInv = act(head, "invert", "Invert",
                       "Pick what is not picked, and let the rest go", 52, HEAD_PX);
        headRule();
        // These two move shapes between layers rather than rigging anything,
        // so they are their own group rather than a tab of their own.
        var bExtract = act(head, "extract", "Extract",
                           "Move the picked shapes into layers of their own", 62, HEAD_PX);
        var bMerge = act(head, "merge", "Merge",
                         "Fold the selected shape layers into the topmost one", 58, HEAD_PX);
        headRule();
        var bPrefs = act(head, "prefs", "Prefs",
                         "Colours, sizes and shapes of the controls", 54, HEAD_PX);
        // Delete takes off whatever the rig put on, whichever tab made it, so
        // it belongs up here rather than inside one of them. Last in the row,
        // away from the selection buttons.
        var bDel = act(head, "delete", "Delete",
                       "Remove the picked points, or the selected handles, pivot or follower",
                       58, HEAD_PX);

        var cv = win.add("group");
        cv.alignment = ["fill", "fill"];
        cv.minimumSize = [260, 180];
        cv.preferredSize = [320, 260];

        // One line, right under the preview, and the only one. It used to
        // take three labels to say less: a fixed hint here, a second line of
        // status at the foot of the panel, and a note drawn across the canvas
        // that still asked for a Refresh the panel now does by itself - all
        // three on screen at once, two of them wrong as often as not.
        var status = win.add("statictext", undefined,
            "                                                                      ");
        status.alignment = ["fill", "top"];
        status.preferredSize.height = 18;
        status.text = "Ready.";
        status.graphics.foregroundColor = status.graphics.newPen(
            status.graphics.PenType.SOLID_COLOR, [0.72, 0.72, 0.72, 1], 1);

        // ------------------------------------------------------- full rows
        var full = win.add("group");
        full.orientation = "column";
        full.alignChildren = ["fill", "top"];
        full.spacing = 3;

        // An icon button where the picture loaded and the old text button
        // where it did not, so a temp folder the script cannot write to costs
        // the icons and nothing else. A picture has to be able to say what it
        // is: hovering one names the action in the line above the tabs, and
        // the tooltip says it too for anyone who waits.
        function act(g, icon, label, tip, textWidth, size) {
            var art = ICON_ART[icon];
            var px = size || ICON_PX;
            var b;
            if (art) {
                b = g.add("iconbutton", undefined, undefined, { style: "toolbutton" });
                b.preferredSize = [px, px];
                b.onDraw = function (st) { paintIconButton(this, art, st); };
            } else {
                b = g.add("button", undefined, label);
                b.preferredSize = [textWidth || 66, px];
            }
            // Read at hover time, not captured, so a button whose job
            // changes can change what it says it does.
            b.says = label + " - " + tip;
            b.helpTip = b.says;
            b.hot = false;
            b.down = false;
            b.addEventListener("mouseover", function () {
                this.hot = true;
                repaint(this);
                setStatus(this.says);
            });
            b.addEventListener("mouseout", function () {
                this.hot = false;
                // A press that ends somewhere else must not leave this one
                // looking held down.
                this.down = false;
                repaint(this);
                reportSel();
            });
            b.addEventListener("mousedown", function () {
                this.down = true;
                repaint(this);
            });
            b.addEventListener("mouseup", function () {
                this.down = false;
                repaint(this);
            });
            return b;
        }

        function tabPage(name) {
            var t = tabs.add("tab", undefined, name);
            t.orientation = "column";
            t.alignChildren = ["left", "top"];
            t.spacing = 6;
            t.margins = 8;
            return t;
        }
        function tabRow(page) {
            var g = page.add("group");
            g.alignChildren = ["left", "center"];
            g.spacing = 6;
            return g;
        }

        var tabs = full.add("tabbedpanel");
        tabs.alignChildren = ["fill", "top"];
        // Left to itself it swells to whatever height is going, which opened a
        // hole between the actions and the two buttons under them.
        tabs.alignment = ["fill", "top"];

        var tPts = tabPage("Points");
        var pr1 = tabRow(tPts);
        var bCreate = act(pr1, "create", "Create", "Put a control on every picked point");
        var bHand = act(pr1, "handles", "Handles",
                        "Give the picked points bezier handles, rigging any that are not yet");
        // Bake is Delete that keeps the animation, so it belongs beside it.
        var bBake = act(pr1, "bake", "Bake", "Keep the animation as path keyframes, drop the rig");
        // All on one row: four icons, the handle style and the button that
        // applies it come to about 324 of the panel's 380 points.
        var modeDd = pr1.add("dropdownlist", undefined, ["Handles: masks", "Handles: layers"]);
        modeDd.preferredSize = [134, UI_H];
        modeDd.selection = (P.handleMode === "layers") ? 1 : 0;
        var bSwap = act(pr1, "apply", "Apply",
                        "Convert the picked points' handles to that style", 54);

        var tPiv = tabPage("Pivot");
        var gPiv = tabRow(tPiv);
        var bPivot = act(gPiv, "pivot", "Pivot",
                         "Drive the picked points from one layer");
        var bAddPiv = act(gPiv, "addpivot", "Add to Pivot",
                          "Select the Pivot too, then add more points to it", 84);
        var bRel = act(gPiv, "release", "Release", "Detach controls from their Pivot");
        var pivDd = gPiv.add("dropdownlist", undefined,
                             ["Pivot only", "Pivot + point controls"]);
        pivDd.preferredSize = [164, UI_H];
        pivDd.selection = (P.pivotMode === "points") ? 1 : 0;
        pivDd.helpTip = "Pivot only moves the points from one layer. " +
                        "Pivot + point controls gives each point its own, " +
                        "parented to the Pivot, so they can still be moved apart.";

        var tFol = tabPage("Follow");
        var gFol = tabRow(tFol);
        var bFol = act(gFol, "follower", "Follower", "Attach the selected layers to the picked path");
        var bAvg = act(gFol, "average", "Average", "One follower at the centre of the picked points");

        tabs.selection = 0;


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

            // A parametric shape is drawn in a dimmer, cooler line, but with
            // its points on show: they can be picked, and picking one asks for
            // the shape to become a path.
            var ghostPen = g.newPen(g.PenType.SOLID_COLOR, [0.42, 0.46, 0.56, 1], 1);
            var dotPrim = g.newBrush(g.BrushType.SOLID_COLOR, [0.52, 0.57, 0.68, 1]);

            for (i = 0; i < state.geom.length; i++) {
                var gm = state.geom[i];
                if (!gm) { continue; }
                var pen = gm.prim ? ghostPen : (gm.foreign ? foreignPen : pathPen);
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
                    var brush = gm.prim ? dotPrim : (gm.rigged[k] ? dotRig : dotFree);
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
        // Is any picked point on a shape that is still a handful of numbers?
        function pickedPrims(list) {
            var n = 0;
            for (var i = 0; i < list.length; i++) {
                if (list[i].item && list[i].item.prim) { n++; }
            }
            return n;
        }

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
            // Kept short: it shares its line with whatever else is in view.
            return bits.join(" and ") + " dimmed - rigging one turns it into a " +
                   "bezier path.";
        }


        function countOf(n, word) {
            return n + " " + word + (n === 1 ? "" : "s");
        }

        // Says the one thing that applies now: what is picked, or what is
        // there to pick and how, or why there is nothing to pick. Only one
        // line is on screen, so it never says two of those at once.
        function reportSel() {
            var n = countSel();
            if (bPick) {
                bPick.says = n ? "None - Let every picked point go"
                               : "All - Pick every point in view";
                bPick.helpTip = bPick.says;
                repaint(bPick);
            }
            if (!activeComp()) { setStatus("Open a composition to start."); return; }
            var note = primNote();
            if (n) {
                var list = currentPicks();
                var np = pickedPrims(list);
                var msg = countOf(n, "point") + " picked on " +
                          countOf(list.length, "path") + ".";
                if (np) {
                    // The point is on a rectangle, ellipse or star, which has
                    // no vertices of its own to rig. Say so before they press
                    // anything, not after.
                    msg += " " + countOf(np, "shape") + " will be turned into a " +
                           "bezier path when you rig " +
                           (np === 1 ? "it" : "them") + ".";
                } else if (note) {
                    msg += " " + note;
                }
                setStatus(msg);
                return;
            }
            if (state.items.length) {
                // Room for one thing after the count, and what is dimmed is
                // the news; how to pick can wait while the points sit there
                // waiting to be clicked.
                setStatus(countOf(state.items.length, "path") + " in view. " +
                          (note ? note
                                : "Click a point, shift-click to add, drag to marquee."));
                return;
            }
            setStatus(note ? ("Nothing to pick yet. " + note)
                           : "Select a shape or masked layer in the timeline.");
        }

        // -------------------------------------------------------- refresh
        function refresh() {
            var comp = activeComp();
            var keep = state.sel;
            state.items = [];
            state.geom = [];
            state.prims = [];
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
            // Primitives join the same list, so they are framed, drawn and
            // picked by the same code that handles real paths.
            var prims = scanPrimitives(comp, layers);
            for (i = 0; i < prims.length && state.items.length < cap * 2; i++) {
                var gp = geomFor(prims[i], comp.time);
                if (!gp) { continue; }
                state.items.push(prims[i]);
                state.geom.push(gp);
                state.prims.push(prims[i]);
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
            // Whatever the panel has just read is now what it is showing, so
            // the watcher below has nothing left to react to. Without this an
            // action that selects what it made - Pivot does - would be
            // followed by a poll that refreshed again and wiped its message.
            lastSeen = selectionSignature();
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

        bRefresh.helpTip = "Refresh - reload paths and update older rigs' tangent bindings in the current pose";
        bRefresh.onClick = function () {
            state.fitted = false;
            if (!actRepairTangents()) { refresh(); }
        };
        bPoints.onClick = function () {
            var list = [], p = picks(), i;
            for (i = 0; i < p.length; i++) {
                if (p[i].item) { list.push(p[i].item); }
            }
            // Nothing picked means every path the preview is showing.
            if (!list.length) { list = state.items.slice(0); }
            actShowPoints(list);
        };
        bPick.onClick = function () {
            var had = countSel();
            state.sel = {};
            if (!had) {
                for (var i = 0; i < state.items.length; i++) {
                    var a = [];
                    for (var k = 0; k < state.geom[i].verts.length; k++) { a.push(k); }
                    state.sel[state.items[i].key] = a;
                }
            }
            reportSel();
            redraw();
        };
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

        bCreate.onClick = function () { actCreate(picks(), false, sel()); };
        bHand.onClick = function () { actCreate(picks(), true, sel()); };
        bDel.onClick = function () { actDelete(picks(), sel(), false); };
        bBake.onClick = function () { actDelete(picks(), sel(), true); };
        bPivot.onClick = function () { actPivot(picks(), sel()); };
        bAddPiv.onClick = function () { actAddToPivot(picks(), sel()); };
        bRel.onClick = function () { actRelease(picks(), sel()); };
        bFol.onClick = function () { actFollower(picks(), sel()); };
        bAvg.onClick = function () { actAverageFollower(picks(), sel()); };
        bExtract.onClick = function () { actExtract(picks(), sel()); };
        bMerge.onClick = function () { actMerge(sel()); };
        modeDd.onChange = function () {
            P.handleMode = (modeDd.selection.index === 1) ? "layers" : "masks";
            savePrefs();
        };
        pivDd.onChange = function () {
            P.pivotMode = (pivDd.selection.index === 1) ? "points" : "pivot";
            savePrefs();
        };
        bSwap.onClick = function () { actSwitchHandleMode(picks(), P.handleMode); };

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

        // After Effects has no "selection changed" to listen for, so the panel
        // asks. Reading which layers are selected is cheap; a refresh walks
        // every layer in the composition, so it only happens when the answer
        // is different from last time.
        var WATCH_MS = 400;
        var lastSeen = "";

        function selectionSignature() {
            var comp = activeComp();
            if (!comp) { return "none"; }
            var out = [String(comp.id), String(comp.numLayers)];
            var sel = comp.selectedLayers;
            for (var i = 0; i < sel.length; i++) { out.push(String(sel[i].index)); }
            return out.join(",");
        }

        function watchSelection() {
            try {
                var sig = selectionSignature();
                if (sig === lastSeen) { return; }
                lastSeen = sig;
                refresh();
            } catch (e) {}
        }

        // scheduleTask evaluates a string, so the watcher is hung off the
        // global for it to find. Reopening the panel replaces the old one,
        // and the task it left behind is cancelled rather than left ticking.
        try {
            if ($.global.__vxrTask) { app.cancelTask($.global.__vxrTask); }
        } catch (eTask) {}
        try {
            $.global.__vxrWatch = watchSelection;
            $.global.__vxrTask = app.scheduleTask(
                "if ($.global.__vxrWatch) { $.global.__vxrWatch(); }", WATCH_MS, true);
        } catch (eTask2) {}

        // Coming back to the panel re-reads the comp as well, which catches
        // what the watcher cannot: a path edited in place, with the selection
        // never changing. refresh() keeps picks that still point at a path
        // that is still there, so this does not throw a selection away.
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
