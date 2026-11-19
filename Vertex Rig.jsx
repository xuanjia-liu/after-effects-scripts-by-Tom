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
 *   Pick vertices in the panel's preview (click, shift-click, drag a marquee
 *   or draw a lasso), or turn the second toggle over and pick whole paths
 *   instead, clicking the curve itself rather than any point on it. Then
 *   move what is picked there, or press a button. Everything
 *   else reads the After Effects selection: Follower attaches the selected
 *   layers, Merge folds the selected shape layers together, Delete
 *   understands a selected Pivot or follower.
 *
 *   What the preview shows is the control at the top left: the selected
 *   layers, the one shape group or mask chosen inside them, or every layer in
 *   the composition. A path carrying keyframes is drawn in a colour of its
 *   own, set by the swatch beside the Keyframe button, and Preferences can
 *   hold a mask's points back until that mask is chosen in the timeline -
 *   a shape layer that also carries masks otherwise shows two sets of points
 *   over one piece of artwork.
 *
 *   Edit      drag a point and the path follows; drag a handle and the curve
 *             does. Arrow keys nudge. Snapping lines a point up with the
 *             others and with their bounds, measured on screen so the range
 *             stays the same few pixels at any zoom. Two or more points get a
 *             box to scale them together, with an arc outside each corner to
 *             turn them by, and six buttons to line them up - points only,
 *             never their handles.
 *
 *             Keyframe  a path keyframe here, so a move belongs to this
 *                       moment rather than to the whole composition. It keys
 *                       the picked points' paths, or - with nothing picked -
 *                       whatever the timeline points at: one shape group if
 *                       that is what is selected there, the whole layer's
 *                       paths if the layer is. Then it opens them, the way
 *                       pressing U does, so the new key is on screen
 *             Reveal    open those same paths in the timeline without keying
 *                       anything. After Effects has no command that opens one
 *                       named property, so a path with keyframes opens on its
 *                       own and one without brings the layer's other modified
 *                       properties with it; the message says which happened.
 *                       Aimed by points picked in the preview, it narrows the
 *                       layer selection to those paths' layers and leaves the
 *                       paths themselves as the chosen properties, so little
 *                       else comes open beside them. Aimed from the timeline,
 *                       it takes nothing away: that selection is already an
 *                       answer to the question
 *
 *             Preferences can let a whole path moved take its shape group's
 *             anchor point with it. The group's position is put back by the
 *             same step, so nothing shifts and the anchor keeps its place on
 *             the artwork; reshaping a path leaves it alone, since nothing
 *             has gone anywhere for the anchor to follow.
 *
 *             A point the rig already holds moves whatever holds it: its own
 *             control layer, or its place in the Pivot that gathered it. A
 *             point nothing holds is written into the path itself.
 *
 *   Points    Create      a control layer on each picked vertex
 *             + Handles   the same, plus both bezier handles
 *             Handles     add the missing handles to points already rigged
 *             Relink      put a rig back. A path whose expression was switched
 *                         off reads as unrigged everywhere, and this turns it
 *                         on again. A vertex added or taken away in After
 *                         Effects leaves every control past it driving its
 *                         neighbour; a vertex dragged there leaves its own
 *                         control behind. And a rig whose expression is gone
 *                         altogether is built again from the controls that
 *                         are left - the links still on the layer, or the
 *                         control layers selected in the timeline
 *             Delete      remove the picked controls, or the whole rig
 *   Group     Pivot       one control that moves, turns and scales many points,
 *                         across layers; its Pivot Offset moves the pivot
 *                         itself, so turning and zooming follow it, and animates
 *             Add/Release join or leave an existing Pivot
 *             Bake        freeze the rig into path keyframes and drop it
 *   Follow    Follower    ride the path, with Offset to slide along it and
 *                         Follow Rotation to turn with it; Rotation Offset
 *                         holds the rider at a fixed angle to that turn
 *             Average     sit at the centre of a group of points
 *             Apply       swap those points' handles between masks and layers
 *   Layers    Extract     move the picked shapes into layers of their own
 *             Merge       fold the selected shape layers into the topmost one
 *             To Bezier   rectangles, ellipses and stars become editable paths
 *
 *   Help lists every gesture the preview knows, on one page.
 *
 * KNOWN LIMITS
 *   Vertices are picked in the panel, not in the After Effects viewer; AE does
 *   not expose the viewer's vertex selection to scripts. Group Skew is the one
 *   shape-group transform the generated expression cannot undo, and Create
 *   warns when it finds one; editing refuses such a group outright, rather
 *   than putting a point somewhere it did not ask to go. A corner with no
 *   tangent has no handle to take hold of in the preview - the Handles button
 *   is what gives it one. Relink matches on where each point sat when it was
 *   rigged, which the rig now writes down; a rig built before it did can only
 *   be matched while its controls are still where they were put, and says so
 *   rather than guessing. Merge is 2D only and refuses 3D layers.
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
    var MN_ANGLE = "ADBE Angle Control";

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
                        var mi = makeItem(L, mp, [], mk.name,
                                          "mask(" + estr(mk.name) + ").maskPath",
                                          L.name + " / " + mk.name);
                        mi.mask = true;
                        out.push(mi);
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
    //     p  where this point sat in the path's own value when it was rigged,
    //        which is what Relink matches on when the indices stop lining up

    function parseManifest(ex) {
        var m = String(ex || "").match(
            new RegExp("^//\\s*" + TAG + "\\s+(\\{[\\s\\S]*?\\})\\s*$", "m"));
        if (!m) { return null; }
        var obj = dec(m[1]);
        if (!obj || !obj.pts) { return null; }
        return obj;
    }

    function readManifest(prop) {
        if (!prop.expressionEnabled) { return null; }
        return parseManifest(prop.expression);
    }

    // The same question asked of a path whose expression may be switched off.
    // Everywhere else "rigged" rightly means "something is driving this" and
    // a switched-off expression drives nothing - but Relink has to tell a rig
    // that was turned off from one that was never made, and both from another
    // tool's expression, which must not be written over whether it is running
    // or not.
    function rigStateOf(prop) {
        var on = false, ex = "";
        try { on = !!prop.expressionEnabled; } catch (e0) {}
        try { ex = trim(String(prop.expression || "")); } catch (e1) {}
        var man = parseManifest(ex);
        return { man: man, on: on, foreign: !man && ex !== "" };
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
        colKeyed: [0.70, 0.56, 0.98],
        bakeWorkArea: true,
        // The preview's own editing settings. handleView, lasso and showBox
        // are set from the panel rather than the dialog, the way handleMode
        // and pivotMode already are; they are kept here to be remembered.
        handleView: "selected",   // selected | all | none
        lasso: false,
        pickPath: false,          // pick whole paths rather than points
        showBox: true,
        nudge: 1,                 // composition pixels per arrow key
        nudgeBig: 8,              // and with shift held
        snap: true,
        snapPx: 6,                // how near, on screen, before it takes hold
        revealKeyed: true,        // open the keyed path in the timeline after
        maskDirect: false,        // hide a mask's points unless it is chosen
        anchorFollows: false      // a whole path moved takes its group's anchor
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
        // A wider black stroke added after this one sits below it in the group,
        // so it draws first and shows as an edge round the coloured line -
        // the same dark outline every other control gets on light artwork.
        if (P.outline) {
            var ro = rv.addProperty(MN_STROKE);
            ro.property("ADBE Vector Stroke Color").setValue([0, 0, 0, 1]);
            ro.property("ADBE Vector Stroke Width")
              .setValue(Math.max(2, r * 0.191 + Math.max(1, r * 0.16)));
        }

        var gCore = vecs.addProperty(MN_GROUP);
        gCore.name = "Core";
        var cv = gCore.property(MN_VECTORS);
        var core = cv.addProperty(MN_SHAPEGRP);
        core.name = "Core Path";
        core.property(MN_SHAPE).setValue(circleShape(Math.max(1, r * 0.139)));
        if (P.outline) {
            var co = cv.addProperty(MN_STROKE);
            co.property("ADBE Vector Stroke Color").setValue([0, 0, 0, 1]);
            co.property("ADBE Vector Stroke Width").setValue(Math.max(1, r * 0.1));
        }
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
            // rigStateOf, not readManifest: a rig whose expression is merely
            // switched off still owns its controls, and pruning its links
            // would cut it from them with no way back - the layers stay, the
            // expression stays, and nothing joins them any more.
            var man = rigStateOf(items[i].prop).man;
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

    // True once something inside the current run() has actually changed the
    // project. Measured in After Effects 27: an undo group that changed
    // nothing takes no undo step at all, so undoing after a failure that
    // never got as far as writing lands on whatever the USER did before the
    // panel ran - and takes their redo history with it. A guarded action
    // says when it has written something, and only then is there anything
    // of ours to roll back.
    var runTouched = false;

    function touched() { runTouched = true; }

    // One undo per action: on any failure the whole action is rolled back.
    function run(title, fn, guarded) {
        var comp = activeComp();
        if (!comp) { UI.say("Open a composition first."); return false; }
        var outer = runTouched;
        runTouched = false;
        app.beginUndoGroup(NAME + ": " + title);
        var out;
        try {
            out = fn(comp);
        } catch (e) {
            try { app.endUndoGroup(); } catch (e2) {}
            var mine = (!guarded || runTouched);
            if (mine) { undoLast(); }
            runTouched = outer;
            UI.say((mine ? "Rolled back - " : "Stopped, nothing was changed - ") +
                   e.toString());
            UI.refresh();
            return false;
        }
        app.endUndoGroup();
        runTouched = outer;
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

        // A rectangle, ellipse or star has no points for After Effects to put
        // handles on - it is a handful of numbers, and the corners the panel
        // draws for it are worked out, not read. Asking to see them in the
        // composition asks for it to become a path, the same way picking one
        // to rig or to follow does.
        var i, made = 0, anyPrim = false;
        for (i = 0; i < items.length; i++) {
            if (items[i] && items[i].prim) { anyPrim = true; break; }
        }
        if (anyPrim) {
            var wrapped = [];
            for (i = 0; i < items.length; i++) { wrapped.push({ item: items[i], idx: [] }); }
            app.beginUndoGroup(NAME + ": Show points");
            var turned;
            try {
                turned = resolvePrimitives(comp, wrapped);
            } catch (eC) {
                try { app.endUndoGroup(); } catch (eC2) {}
                undoLast();
                UI.say("Rolled back - " + eC.toString());
                UI.refresh();
                return false;
            }
            app.endUndoGroup();
            made = turned.made;
            items = [];
            for (i = 0; i < turned.picks.length; i++) {
                if (turned.picks[i].item) { items.push(turned.picks[i].item); }
            }
            // Refresh before the selection, never after: refresh writes its
            // own line into the status, and the message below is the answer.
            UI.refresh();
            if (!items.length) { UI.say("Nothing in view to show."); return false; }
        }

        var showing = 0, holders = [];
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
        var msg = want ? "Showing the points of " + what + " in the composition."
                       : "Hid the points of " + what + ".";
        if (made) {
            msg += " Turned " + made + " shape" + (made === 1 ? "" : "s") +
                   " into a bezier path on the way.";
        }
        UI.say(msg);
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
            var wrote = (upgradeRests(comp, probe, item, man) > 0);
            if (bindTangents(probe, item, man, comp.time)) { wrote = true; }
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
                    wrote = true;
                    continue;
                }
                var vtx = sh.vertices[i];
                var cp = probe.at(item, vtx, comp.time);
                var fresh = makeControl(comp, item.layer.name + " Pt " + (i + 1), K_POINT, cp);
                entry = { i: i, fx: addLink(item.layer, fresh) };
                // Where this point sits in the path's own value, so Relink
                // can find it again after a vertex is added or taken away.
                entry.p = [vtx[0], vtx[1]];
                entry.tf = tangentFrame(probe, item, fresh, vtx, comp.time);
                man.pts.push(entry);
                r.made++;
                wrote = true;
                if (withHandles) {
                    addHandlesTo(comp, probe, item, sh, entry, fresh, upp);
                }
            }
            if (wrote) {
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
                    var wrote = false;
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
                                wrote = true;
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
                                wrote = true;
                            }
                        }
                    }
                    if (wrote) { item.prop.expression = buildPathExpression(man, item.chain); }
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
        // A child's comp point is position + rot*scale*(its own point -
        // anchor), so the pivot turns and zooms about whatever world place the
        // anchor lands on - which is the position. Moving the pivot therefore
        // means moving both: the same offset on each, raw.
        //
        // Raw is the whole of it. Scale the compensation by the pivot's own
        // scale and it cancels exactly - scale(d/k) is d at every k - so the
        // children go on zooming about the centre the offset was supposed to
        // leave. Rotate it and rotation cancels the same way. Either one buys
        // an offset you can drag at any pose without the artwork stirring, and
        // pays for it with an offset that does not move what it is named for.
        //
        // So the compensation is taken at the rest pose, which is what the
        // Pan-Behind tool does when it moves an anchor point by hand. At 100%
        // and 0 degrees nothing stirs, and that is when an offset is set.
        // Drag it while the pivot is already turned or zoomed and the artwork
        // does move - by exactly the part of the transform it now sits inside.
        var dExpr = "value + effect(" + estr(PIVOT_OFFSET) + ")(\"Point\");";
        piv.transform.anchorPoint.expression = dExpr;
        piv.transform.position.expression = dExpr;

        // The marker is drawn at the layer's origin, and the anchor - the one
        // place everything turns and zooms about - has just moved away from
        // it. Walk the artwork over to the anchor, so the pivot you can see is
        // the pivot you get. Sitting on the anchor, it is also the one thing a
        // turn or a zoom leaves alone, which is what a centre should look like.
        try {
            var mk = piv.property(MN_CONTENTS).property("Marker");
            if (mk) {
                mk.property("ADBE Vector Transform Group")
                  .property("ADBE Vector Position").expression = dExpr;
            }
        } catch (err) {}
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
                var wrote = bindTangents(probe, it, man, comp.time) > 0;
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
                    var bv = base.vertices[idx];
                    var cp = probe.at(it, bv, comp.time);
                    var loc = probe.intoLayer(piv, cp, comp.time);
                    man.pts.push({ i: idx, fx: fx, pp: [loc[0], loc[1]],
                                   p: [bv[0], bv[1]],
                                   tf: tangentFrame(probe, it, piv, bv, comp.time) });
                    done++;
                    wrote = true;
                    added = true;
                }
                if (!added) { removeEffect(it.layer, fx); }
                if (wrote) {
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
    var FX_ROTOFF = TAG + " Rotation Offset";
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
        // An older follower has no dial. Reading it has to survive that, or
        // adding one would stop every rig made before today from turning.
        L.push("  var _ro = 0;");
        L.push("  try { _ro = effect(" + estr(FX_ROTOFF) + ")(\"Angle\"); } catch (_e) { _ro = 0; }");
        L.push("  _r = value + _ang + _ro;");
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
        removeEffect(layer, FX_ROTOFF);

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

        var e4 = fx.addProperty(MN_ANGLE);
        e4.name = FX_ROTOFF;
        e4.property(1).setValue(0);

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
        removeEffect(L, FX_ROTOFF);
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
            // A rider runs along a real path, and a rectangle, ellipse or star
            // has none - it is a handful of numbers with no points of its own
            // to read. Picking one to follow asks for it to become a path, the
            // same way picking one to rig does.
            var turned = resolvePrimitives(comp, picks);
            picks = turned.picks;
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
            var msg = "Attached " + targets.length + " follower" +
                      (targets.length === 1 ? "" : "s") + " to " + item.label +
                      ". Drag " + FX_OFFSET + " to slide it along.";
            if (turned.made) {
                msg += " Turned " + turned.made + " shape" +
                       (turned.made === 1 ? "" : "s") + " into a bezier path on the way.";
            }
            return msg;
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
            "var _sum = 0, _cnt = 0, _ro = 0;",
            "if (effect(" + estr(FX_FOLLOWROT) + ")(\"Checkbox\") > 0) {",
            "  try { _ro = effect(" + estr(FX_ROTOFF) + ")(\"Angle\"); } catch (_e) { _ro = 0; }",
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
            "value + _ro + (_cnt > 0 ? radiansToDegrees(_sum / _cnt) : 0);"
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
            removeEffect(target, FX_ROTOFF);
            removeEffect(target, FX_FOLLOWSCL);
            var r = fx.addProperty(MN_CHECKBOX);
            r.name = FX_FOLLOWROT;
            r.property(1).setValue(0);
            var ro = fx.addProperty(MN_ANGLE);
            ro.name = FX_ROTOFF;
            ro.property(1).setValue(0);
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

    // After Effects has no way to say which VERTICES are selected - a path
    // property's "selected" is all of them or none, and the Shape object
    // carries no selection at all. What it can say is which LAYERS are
    // selected, and a rigged point has a layer standing for it. So the two
    // selections are kept in step through the controls.

    function selectedControls(comp) {
        var out = [], sel = comp.selectedLayers;
        for (var i = 0; i < sel.length; i++) {
            if (isControl(sel[i])) { out.push(sel[i]); }
        }
        return out;
    }

    // Enough to tell one selection of controls from the next, so a refresh
    // can see whether After Effects has something new to say.
    function controlSignature(comp) {
        var c = selectedControls(comp), ids = [], i;
        for (i = 0; i < c.length; i++) { ids.push(String(c[i].index)); }
        ids.sort();
        return ids.join(",");
    }

    // Picking a point's control in the timeline is a way of saying which
    // point you mean, so the layer it rigs has to come into view with it.
    // scanPaths skips controls, so without this the scope comes up empty and
    // there is nothing for that point to be ticked on.
    function widenScope(comp, layers) {
        var ctrls = [], i, j;
        for (i = 0; i < layers.length; i++) {
            if (isControl(layers[i])) { ctrls.push(layers[i]); }
        }
        if (!ctrls.length) { return layers; }
        var out = layers.slice(0), picks = picksFromControls(comp, ctrls);
        for (i = 0; i < picks.length; i++) {
            var L = picks[i].item.layer, seen = false;
            for (j = 0; j < out.length && !seen; j++) {
                if (sameLayer(out[j], L)) { seen = true; }
            }
            if (!seen) { out.push(L); }
        }
        return out;
    }

    // The other direction: say in the timeline what the panel has picked, by
    // selecting the controls that stand for those points. Only controls are
    // touched - the artwork layer's own selection is the user's, and moving
    // it would change what the panel is looking at.
    function selectControlsFor(comp, picks) {
        var want = {}, i, e;
        for (i = 0; i < picks.length; i++) {
            var item = picks[i].item;
            if (!item || item.prim) { continue; }
            var man = readManifest(item.prop);
            if (!man) { continue; }
            for (e = 0; e < man.pts.length; e++) {
                var ent = man.pts[e];
                if (!has(picks[i].idx, ent.i)) { continue; }
                var L = linkedLayer(item.layer, ent.fx);
                if (L) { want[L.index] = true; }
            }
        }
        var n = 0;
        for (i = 1; i <= comp.numLayers; i++) {
            var LL = comp.layer(i);
            if (!isControl(LL)) { continue; }
            var on = !!want[LL.index];
            try { if (LL.selected !== on) { LL.selected = on; } } catch (e2) {}
            if (on) { n++; }
        }
        return n;
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
        // Rewriting the expression is the moment a follower made before the
        // dial existed can quietly gain one, instead of reading a silent zero.
        if (!findEffect(L, FX_ROTOFF)) {
            try { effectsOf(L).addProperty(MN_ANGLE).name = FX_ROTOFF; } catch (err1) {}
        }
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

    // ----------------------------------------------------------- editing
    // An edit names one vertex of one path and where it should end up, said
    // in composition pixels: "pt" for the vertex, "ti" and "to" for its in
    // and out tangents as vectors measured from it. (ES3 will not take "in"
    // as a key, which is why they are not called that.)
    //
    //   { item: <path>, i: <vertex>, pt: [x,y], ti: [x,y], to: [x,y] }
    //
    // Every way of editing in the preview - a drag, an arrow key, an
    // alignment, the transform box - says what it wants in these, and this is
    // the one place that works out what has to move for it to happen. What
    // that is depends on who owns the point: an unrigged one lives in the
    // path's own value, a rigged one in its control layer, and one gathered
    // into a Pivot in the manifest the Pivot reads itself through.

    function plural(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }

    function tfMat(tf) { return [tf[0], tf[1], tf[2], tf[3], 0, 0]; }

    // The map a bound tangent passes through on its way out of the path: _tv
    // in the generated expression is exactly this. Inverting it is how a
    // curve dragged on screen is written into a path the rig already reads.
    function bindMat(minv, ctrl, entry, t) {
        return mMul(mMul(minv, layerMatrix(ctrl, t)), tfMat(entry.tf));
    }

    // A composition-space tangent in the units this path is written in.
    function tangentToPath(item, minv, entry, side, vComp, t) {
        if (entry && entry.tf && tipKind(entry, side) === "bound") {
            var ctrl = linkedLayer(item.layer, entry.fx);
            if (ctrl) {
                return mVec(mInv(bindMat(minv, ctrl, entry, t)), mVec(minv, vComp));
            }
        }
        return mVec(minv, vComp);
    }

    // After Effects hands back a fresh array every time a Shape's vertices,
    // inTangents or outTangents are read, so writing into one writes into a
    // copy and changes nothing: sh.vertices[2] = p is a silent no-op. Every
    // edit here therefore pulls the three arrays out once, works on those,
    // and builds a Shape at the end.
    function shapeParts(sh) {
        var v = [], a = [], b = [], k;
        var vs = sh.vertices, is = sh.inTangents, os = sh.outTangents;
        for (k = 0; k < vs.length; k++) {
            v.push([vs[k][0], vs[k][1]]);
            a.push([is[k][0], is[k][1]]);
            b.push([os[k][0], os[k][1]]);
        }
        return { v: v, i: a, o: b, closed: sh.closed };
    }

    function partsToShape(p) {
        var out = new Shape();
        out.closed = p.closed;
        out.vertices = p.v;
        out.inTangents = p.i;
        out.outTangents = p.o;
        return out;
    }

    function cloneShape(sh) { return partsToShape(shapeParts(sh)); }

    // The path's own shape, from under whatever the rig put on top. Reading
    // it live would hand back the rig's answer, and writing that answer back
    // would bake the rig into the value it is supposed to be reading.
    function rawShape(comp, prop) {
        var live = false, sh = null;
        try { live = !!prop.expressionEnabled; } catch (e0) {}
        try {
            if (live) { prop.expressionEnabled = false; }
            sh = prop.valueAtTime(comp.time, false);
        } catch (e1) {
            sh = null;
        } finally {
            if (live) { try { prop.expressionEnabled = true; } catch (e2) {} }
        }
        return sh;
    }

    // And the way back. After Effects will not take a setValue while an
    // expression is live, so it comes off for the one write - the same thing
    // Merge does when it copies a rigged path. A path that already carries
    // keyframes gets one at the current time, which is what After Effects
    // itself does when you drag a vertex in the viewer.
    function putShape(comp, prop, sh) {
        var live = false;
        try { live = !!prop.expressionEnabled; } catch (e0) {}
        try {
            if (live) { prop.expressionEnabled = false; }
            if (prop.numKeys > 0) { prop.setValueAtTime(comp.time, sh); }
            else { prop.setValue(sh); }
            touched();
        } finally {
            if (live) { try { prop.expressionEnabled = true; } catch (e1) {} }
        }
    }

    // Move a control layer by a delta in composition pixels. Its position is
    // written in whatever space its parent gives it, so the delta is taken
    // there first - a point control hung off a Pivot is the usual case.
    function nudgeLayer(comp, L, dComp) {
        var pos = L.transform.position;
        try {
            if (pos.expressionEnabled && trim(String(pos.expression || "")) !== "") {
                return false;
            }
        } catch (e0) {}
        var d = dComp;
        if (L.parent) { d = mVec(mInv(layerMatrix(L.parent, comp.time)), dComp); }
        var v;
        try { v = pos.valueAtTime(comp.time, false); } catch (e1) { return false; }
        var want = [Number(v[0]) + d[0], Number(v[1]) + d[1]];
        if (v.length > 2) { want.push(Number(v[2])); }
        try {
            if (pos.numKeys > 0) { pos.setValueAtTime(comp.time, want); }
            else { pos.setValue(want); }
        } catch (e2) { return false; }
        touched();
        return true;
    }

    // Where a layer's own origin lands in the composition. A control is built
    // with its anchor at the origin, so for a point control this is the point.
    function originOf(L, t) { return mPt(layerMatrix(L, t), [0, 0]); }

    // Put a handle mask's far vertex somewhere else. The rig reads points()[1]
    // and has never looked at the other end, so that is all that moves.
    function setMaskHandle(comp, ctrl, name, compPt) {
        var masks = null;
        try { masks = ctrl.property(MN_MASKS); } catch (e0) { return false; }
        for (var m = 1; masks && m <= masks.numProperties; m++) {
            if (masks.property(m).name !== name) { continue; }
            var sp = masks.property(m).property(MN_MASKSHAPE);
            var sh;
            try { sh = sp.valueAtTime(comp.time, false); } catch (e1) { return false; }
            if (!sh || sh.vertices.length < 2) { return false; }
            var loc = mPt(mInv(layerMatrix(ctrl, comp.time)), compPt);
            var parts = shapeParts(sh);
            parts.v[1] = [loc[0], loc[1]];
            var out = partsToShape(parts);
            try {
                if (sp.expressionEnabled) { sp.expression = ""; }
                if (sp.numKeys > 0) { sp.setValueAtTime(comp.time, out); }
                else { sp.setValue(out); }
            } catch (e2) { return false; }
            touched();
            return true;
        }
        return false;
    }

    // Where a vertex really is, in composition pixels. For a point the rig
    // holds, the path's own value is only what the expression starts from.
    function vertexAt(item, entry, parts, m, idx, t) {
        if (entry) {
            var ctrl = linkedLayer(item.layer, entry.fx);
            if (ctrl) {
                return entry.pp ? mPt(layerMatrix(ctrl, t), entry.pp)
                                : originOf(ctrl, t);
            }
        }
        return mPt(m, parts.v[idx]);
    }

    function tallyEdit() {
        return { moved: 0, curved: 0, foreign: 0, skewed: 0, prim: 0, stuck: 0 };
    }

    // One path's worth of edits. Vertices first, then the path value, then
    // the handles - a handle control is parented to the point control, so it
    // has already come along with the point by the time it is read.
    function applyOne(comp, item, list, r) {
        var t = comp.time, i;
        if (item.prim) { r.prim += list.length; return; }
        if (isForeignRig(item.prop)) { r.foreign += list.length; return; }
        if (chainSkewed(item, t)) { r.skewed += list.length; return; }

        var m = itemMatrix(item, t), minv = mInv(m);
        var man = readManifest(item.prop);
        var sh = rawShape(comp, item.prop);
        if (!sh) { r.stuck += list.length; return; }

        var out = shapeParts(sh);
        // Not "touched": that is the run guard, and a local of the same name
        // would shadow it exactly where the manifest write needs to call it.
        var wrote = false, manDirty = false, later = [];

        for (i = 0; i < list.length; i++) {
            var e = list[i], idx = e.i;
            if (idx < 0 || idx >= out.v.length) { r.stuck++; continue; }
            var entry = man ? manEntry(man, idx) : null;
            var here = null, did = false;

            if (e.pt) {
                if (!entry) {
                    var lp = mPt(minv, e.pt);
                    out.v[idx] = [lp[0], lp[1]];
                    wrote = true;
                    did = true;
                } else if (entry.pp) {
                    // Held in a Pivot's own frame. The Pivot does not move,
                    // so the other points riding on it stay where they are.
                    var piv = linkedLayer(item.layer, entry.fx);
                    if (piv) {
                        var pl = mPt(mInv(layerMatrix(piv, t)), e.pt);
                        entry.pp = [pl[0], pl[1]];
                        manDirty = true;
                        did = true;
                    }
                } else {
                    var ctrl = linkedLayer(item.layer, entry.fx);
                    if (ctrl) {
                        here = originOf(ctrl, t);
                        did = nudgeLayer(comp, ctrl,
                                         [e.pt[0] - here[0], e.pt[1] - here[1]]);
                    }
                }
                if (did) { r.moved++; } else { r.stuck++; }
            }

            // A tangent is stated as a vector from the vertex, so where the
            // vertex is now is where it is measured from. For a rigged point
            // that is not the path's own value - the rig overwrites it with
            // whatever holds the point.
            var at = e.pt || vertexAt(item, entry, out, m, idx, t);
            if (e.ti) { wrote = tangentEdit(item, man, entry, out, idx, "in", at, e.ti, minv, t, later, r) || wrote; }
            if (e.to) { wrote = tangentEdit(item, man, entry, out, idx, "out", at, e.to, minv, t, later, r) || wrote; }
        }

        if (wrote) { putShape(comp, item.prop, partsToShape(out)); }
        if (manDirty) { writeBack(item, man); touched(); }

        // The handles that live on layers of their own, read after the point
        // has moved so the delta is only what the curve asked for.
        for (i = 0; i < later.length; i++) {
            var job = later[i];
            if (job.kind === "mask") {
                if (setMaskHandle(comp, job.ctrl, job.name, job.at)) { r.curved++; }
                else { r.stuck++; }
            } else {
                var now = originOf(job.layer, t);
                if (nudgeLayer(comp, job.layer, [job.at[0] - now[0], job.at[1] - now[1]])) {
                    r.curved++;
                } else {
                    r.stuck++;
                }
            }
        }
    }

    // One side of one point's curve. Returns true when the path's own value
    // is what has to change; anything on a layer is queued for afterwards.
    function tangentEdit(item, man, entry, out, idx, side, at, vComp, minv, t, later, r) {
        var kind = tipKind(entry, side);
        var tip = [at[0] + vComp[0], at[1] + vComp[1]];
        if (kind === "mask") {
            var ctrl = linkedLayer(item.layer, entry.fx);
            if (ctrl) {
                later.push({ kind: "mask", ctrl: ctrl, at: tip,
                             name: (side === "in") ? MASK_IN : MASK_OUT });
            } else { r.stuck++; }
            return false;
        }
        if (kind === "layer") {
            var nm = (side === "in") ? entry["if"] : entry.of;
            var hl = nm ? linkedLayer(item.layer, nm) : null;
            if (hl) { later.push({ kind: "layer", layer: hl, at: tip }); }
            else { r.stuck++; }
            return false;
        }
        var v = tangentToPath(item, minv, entry, side, vComp, t);
        if (side === "in") { out.i[idx] = [v[0], v[1]]; }
        else { out.o[idx] = [v[0], v[1]]; }
        r.curved++;
        return true;
    }

    function applyEdits(comp, edits) {
        var r = tallyEdit(), keys = [], groups = {}, i, k;
        for (i = 0; i < edits.length; i++) {
            var e = edits[i];
            if (!e || !e.item) { continue; }
            k = e.item.key;
            if (!groups[k]) { groups[k] = { item: e.item, list: [] }; keys.push(k); }
            groups[k].list.push(e);
        }
        for (i = 0; i < keys.length; i++) {
            applyOne(comp, groups[keys[i]].item, groups[keys[i]].list, r);
        }
        return r;
    }

    function editReport(r) {
        var said = [];
        if (r.moved) { said.push(plural(r.moved, "point") + " moved"); }
        if (r.curved) { said.push(plural(r.curved, "handle") + " reshaped"); }
        if (!said.length) {
            if (r.prim) {
                return "Those are still rectangles, ellipses or stars - press Create to make them paths first.";
            }
            if (r.foreign) {
                return "Skipped - those paths already carry another tool's expression.";
            }
            if (r.skewed) {
                return "Skipped - a shape group with Skew on it cannot be edited from here.";
            }
            return "Nothing moved.";
        }
        var msg = said.join(", ") + ".";
        if (r.skewed) { msg += " " + plural(r.skewed, "point") + " left alone: Skew."; }
        if (r.foreign) { msg += " " + plural(r.foreign, "point") + " left alone: another tool's expression."; }
        if (r.stuck) { msg += " " + plural(r.stuck, "point") + " would not move."; }
        return msg;
    }

    // --------------------------------------------------------------- relink
    // A rig names its vertices by index, and an index is only as good as the
    // path it was written for. Add or take away a vertex in After Effects and
    // every control past it drives its neighbour, so the shape jumps. Drag a
    // rigged vertex there instead and the expression puts it straight back,
    // so the edit looks like it was ignored. Both are the same complaint -
    // the point and the thing holding it have come apart - and Relink is the
    // one button that puts either right.
    //
    // What makes it exact rather than a guess is "p": every entry writes down
    // where its point sat in the path's own value when it was rigged, and an
    // insertion does not disturb that - the other vertices are all still
    // precisely where they were, so they match to the pixel. Whatever is left
    // over has genuinely moved, which is the curve having been edited there,
    // and that control goes to meet its point.

    function relinkTally() {
        return { looked: 0, linked: 0, seated: 0, noted: 0,
                 lost: 0, blind: 0, stuck: 0,
                 woke: 0, built: 0, byName: 0, byPlace: 0,
                 unplaced: 0, pivots: 0, hands: 0, foreign: 0, bare: 0, many: 0 };
    }

    function dist2(a, b) {
        var dx = a[0] - b[0], dy = a[1] - b[1];
        return dx * dx + dy * dy;
    }

    // How far apart this path's vertices are, in composition pixels. It is
    // the only scale on which "near enough" means anything: a point dragged
    // less than one vertex apart can still be told from a vertex that was
    // deleted, and more than that it cannot.
    function medianSpan(W, closed) {
        var d = [], i, n = W.length;
        for (i = 1; i < n; i++) { d.push(Math.sqrt(dist2(W[i - 1], W[i]))); }
        if (closed && n > 2) { d.push(Math.sqrt(dist2(W[n - 1], W[0]))); }
        if (!d.length) { return 0; }
        d.sort(function (a, b) { return a - b; });
        return d[Math.floor(d.length / 2)];
    }

    // Where an entry's point is held now, in composition pixels: its own
    // control layer, or its place in the frame of the Pivot that gathered it.
    // Null when the control is gone, which is a different complaint.
    function heldAt(item, entry, t) {
        var ctrl = linkedLayer(item.layer, entry.fx);
        if (!ctrl) { return null; }
        return entry.pp ? mPt(layerMatrix(ctrl, t), entry.pp) : originOf(ctrl, t);
    }

    // The control layers that still say they belong to this path: the link
    // effects the rig left on the layer, which outlive the expression, and
    // any point controls picked in the timeline. Either is the user saying
    // "these go with this path".
    // A link effect records a control LAYER. Nothing in it says which PATH
    // that control serves, so on a layer carrying two paths every link looks
    // like it belongs to both. If another path still names one, it is spoken
    // for: taking it here would weld the two paths to one set of controls,
    // and the expression would drive the wrong one just as convincingly as
    // the right one. A control the user picks in the timeline is a different
    // matter - that is an instruction - and it comes in through selLayers
    // below, where it gets a fresh link of its own rather than sharing.
    function linksSpokenFor(item) {
        var used = {}, items = [], i, k, man, e;
        try { items = scanPaths(item.layer.containingComp, [item.layer]); }
        catch (e0) { return used; }
        for (i = 0; i < items.length; i++) {
            if (!items[i] || items[i].key === item.key) { continue; }
            man = rigStateOf(items[i].prop).man;
            if (!man || !man.pts) { continue; }
            for (k = 0; k < man.pts.length; k++) {
                e = man.pts[k];
                if (e.fx) { used[e.fx] = true; }
                if (e["if"]) { used[e["if"]] = true; }
                if (e.of) { used[e.of] = true; }
            }
        }
        return used;
    }

    function orphanControls(item, selLayers) {
        var pts = [], piv = 0, hands = 0, seen = {}, fx = null, i, L, nm;
        var taken = linksSpokenFor(item);
        try { fx = item.layer.property(MN_EFFECTS); } catch (e0) { fx = null; }
        for (i = 1; fx && i <= fx.numProperties; i++) {
            try { nm = String(fx.property(i).name); } catch (e1) { continue; }
            if (nm.indexOf(TAG + " L") !== 0) { continue; }
            if (taken[nm]) { continue; }
            L = linkedLayer(item.layer, nm);
            if (!L) { continue; }
            // A Pivot drives many points at once and keeps each one's place
            // in its own frame, none of which survives the expression. There
            // is nothing left to work out which vertices were its, so say so
            // rather than put them back somewhere they never were.
            var kind = kindOf(L);
            if (kind === K_HANDLE) { hands++; continue; }
            if (kind !== K_POINT) { piv++; continue; }
            if (seen[L.index]) { continue; }
            seen[L.index] = true;
            pts.push({ fx: nm, layer: L });
        }
        for (i = 0; selLayers && i < selLayers.length; i++) {
            L = selLayers[i];
            if (!L || seen[L.index]) { continue; }
            if (kindOf(L) !== K_POINT) { continue; }
            seen[L.index] = true;
            pts.push({ fx: null, layer: L });
        }
        // A handle kept as a mask lives on the point control rather than on a
        // link of its own, so the scan above never sees it. Count those too,
        // or a rebuilt rig loses them without a word.
        for (i = 0; i < pts.length; i++) {
            if (maskNamed(pts[i].layer, MASK_IN)) { hands++; }
            if (maskNamed(pts[i].layer, MASK_OUT)) { hands++; }
        }
        return { pts: pts, pivots: piv, hands: hands };
    }

    function maskNamed(layer, name) {
        var masks = null;
        try { masks = layer.property(MN_MASKS); } catch (e0) { return false; }
        for (var m = 1; masks && m <= masks.numProperties; m++) {
            try { if (masks.property(m).name === name) { return true; } } catch (e1) {}
        }
        return false;
    }

    function ptIndexFromName(nm) {
        var m = String(nm || "").match(/\bPt\s*(\d+)\s*$/);
        if (!m) { return -1; }
        var n = Number(m[1]);
        return (isFinite(n) && n >= 1) ? (n - 1) : -1;
    }

    // Put each control on a vertex, best evidence first. A control nobody has
    // moved is still standing on its own point, and that is as good as a
    // record gets. Otherwise the name the rig gave it carries the index it
    // was made for, which is the only durable thing left once the expression
    // has gone. Anything still unplaced takes the nearest vertex going.
    function placeControls(cands, V, W, t) {
        var claimed = {}, EPS = 0.25, k, c, j, at, best, bj, d;
        for (k = 0; k < cands.length; k++) {
            c = cands[k];
            c.j = -1;
            c.how = "";
            c.at = originOf(c.layer, t);
            var keyed = 0;
            try { keyed = c.layer.transform.position.numKeys; } catch (e0) {}
            if (keyed) { continue; }
            bj = -1; best = EPS * EPS;
            for (j = 0; j < W.length; j++) {
                if (claimed[j]) { continue; }
                d = dist2(c.at, W[j]);
                if (d <= best) { best = d; bj = j; }
            }
            if (bj >= 0) { c.j = bj; c.how = "place"; claimed[bj] = true; }
        }
        for (k = 0; k < cands.length; k++) {
            c = cands[k];
            if (c.j >= 0) { continue; }
            j = ptIndexFromName(c.layer.name);
            if (j >= 0 && j < V.length && !claimed[j]) {
                c.j = j; c.how = "name"; claimed[j] = true;
            }
        }
        for (k = 0; k < cands.length; k++) {
            c = cands[k];
            if (c.j >= 0) { continue; }
            at = c.at; bj = -1; best = -1;
            for (j = 0; j < W.length; j++) {
                if (claimed[j]) { continue; }
                d = dist2(at, W[j]);
                if (best < 0 || d < best) { best = d; bj = j; }
            }
            if (bj >= 0) { c.j = bj; c.how = "place"; claimed[bj] = true; }
        }
        return cands;
    }

    // A manifest made again out of the controls that are left. The entries
    // come out the same shape Create makes, bind frame and all, so what
    // follows cannot tell a rebuilt rig from one that was never broken.
    function rebuildFrom(comp, getProbe, item, selLayers, V, W, r) {
        var found = orphanControls(item, selLayers);
        r.pivots += found.pivots;
        r.hands += found.hands;
        var cands = found.pts;
        if (!cands.length) { return null; }
        placeControls(cands, V, W, comp.time);
        var man = { v: 1, pts: [] }, probe = null, k, c;
        for (k = 0; k < cands.length; k++) {
            c = cands[k];
            if (c.j < 0) { r.unplaced++; continue; }
            if (!probe) { probe = getProbe(); }
            man.pts.push({ i: c.j,
                           fx: c.fx || addLink(item.layer, c.layer),
                           p: [V[c.j][0], V[c.j][1]],
                           tf: tangentFrame(probe, item, c.layer, V[c.j], comp.time) });
            if (c.how === "name") { r.byName++; } else { r.byPlace++; }
        }
        if (!man.pts.length) { return null; }
        man.pts.sort(function (a, b) { return a.i - b.i; });
        r.built += man.pts.length;
        return man;
    }

    // One path. Puts the manifest right and hands back the control moves that
    // are still owed, for the caller to make through the ordinary edit path.
    function relinkOne(comp, getProbe, item, selLayers, r, mayBuild) {
        if (item.prim) { return []; }
        var t = comp.time;
        var st = rigStateOf(item.prop);
        if (st.foreign) { r.foreign++; return []; }
        var sh = rawShape(comp, item.prop);
        if (!sh) { return []; }

        // Everything is measured in composition pixels, so a tolerance means
        // the same thing whatever units the group this path sits in uses.
        var m = itemMatrix(item, t);
        var V = shapeParts(sh).v, n = V.length, W = [], i, k;
        if (!n) { return []; }
        for (i = 0; i < n; i++) { W.push(mPt(m, V[i])); }

        var man = st.man, fresh = false;
        if (!man) {
            if (!mayBuild) { r.many++; return []; }
            man = rebuildFrom(comp, getProbe, item, selLayers, V, W, r);
            if (!man) { r.bare++; return []; }
            fresh = true;
        } else if (!man.pts.length) {
            return [];
        }
        r.looked++;

        var EPS = 0.25, CAP = medianSpan(W, sh.closed) * 0.75;
        var probes = [], e, pr, held;
        for (k = 0; k < man.pts.length; k++) {
            e = man.pts[k];
            held = heldAt(item, e, t);
            // With no control layer the entry drives nothing, whatever index
            // it names. Putting that right is Delete's work or Create's, so
            // it is reported rather than quietly relinked to something dead.
            // Otherwise: the place written down, or - for a rig made before
            // places were written down - where the point is being held, which
            // is right for as long as nobody has moved the control.
            pr = (held === null) ? null : (e.p ? mPt(m, e.p) : held);
            probes.push({ e: e, at: pr, blind: !e.p, j: -1 });
        }

        var claimed = {}, best, bj, d, q;

        // Everything that has not moved, matched to the pixel. An insertion
        // or a deletion is wholly resolved here.
        for (k = 0; k < probes.length; k++) {
            q = probes[k];
            if (!q.at) { continue; }
            bj = -1; best = EPS * EPS;
            for (i = 0; i < n; i++) {
                if (claimed[i]) { continue; }
                d = dist2(q.at, W[i]);
                if (d <= best) { best = d; bj = i; }
            }
            if (bj >= 0) { q.j = bj; claimed[bj] = true; }
        }

        // What is left has moved. It still has to fall in path order between
        // the points that did match, and that window is what stops a guess
        // from wandering onto a neighbour. A rig with no place written down
        // is not guessed at at all: there would be no telling a point that
        // moved from a control that did.
        for (k = 0; k < probes.length; k++) {
            q = probes[k];
            if (q.j >= 0 || !q.at || q.blind) { continue; }
            var lo = -1, hi = n;
            for (i = k - 1; i >= 0; i--) { if (probes[i].j >= 0) { lo = probes[i].j; break; } }
            for (i = k + 1; i < probes.length; i++) { if (probes[i].j >= 0) { hi = probes[i].j; break; } }
            bj = -1; best = -1;
            for (i = lo + 1; i < hi; i++) {
                if (claimed[i]) { continue; }
                d = dist2(q.at, W[i]);
                if (best < 0 || d < best) { best = d; bj = i; }
            }
            // Within a vertex of where it was, this is the point having moved.
            // Further off, the point it was given has most likely been deleted
            // and the nearest thing going is a neighbour that was never
            // rigged - so say nothing was found rather than take it.
            if (bj >= 0 && best <= CAP * CAP) { q.j = bj; claimed[bj] = true; }
        }

        var edits = [], dirty = false;
        for (k = 0; k < probes.length; k++) {
            q = probes[k];
            e = q.e;
            if (!q.at) { r.lost++; continue; }
            if (q.j < 0) { if (q.blind) { r.blind++; } else { r.stuck++; } continue; }
            if (e.i !== q.j) { e.i = q.j; dirty = true; r.linked++; }
            if (!e.p) {
                // Note where it sits now, so the next time this path is
                // edited there is something exact to match on. Move nothing:
                // without a record there is nothing to say it is wrong.
                e.p = [V[q.j][0], V[q.j][1]];
                dirty = true;
                r.noted++;
            } else if (dist2(mPt(m, e.p), W[q.j]) > EPS * EPS) {
                // The point has moved out from under its control: the curve
                // was edited here. Send the control after it.
                edits.push({ item: item, i: q.j, pt: [W[q.j][0], W[q.j][1]] });
                e.p = [V[q.j][0], V[q.j][1]];
                dirty = true;
                r.seated++;
            }
        }

        if (dirty || fresh) {
            man.pts.sort(function (a, b) { return a.i - b.i; });
            writeBack(item, man);
            touched();
        }
        // Writing an expression turns it on, so this only has work to do when
        // nothing else was written - which is the whole repair for a rig that
        // was only ever switched off. A rebuilt one had no expression to be
        // switched off in the first place, so it is not reported as woken.
        if (st.man && !st.on) {
            try { item.prop.expressionEnabled = true; r.woke++; touched(); }
            catch (eOn) {}
        } else if (fresh) {
            try { item.prop.expressionEnabled = true; } catch (eOn2) {}
        }
        return edits;
    }

    function relinkReport(r, moves) {
        if (!r.looked) {
            var why = "Nothing to relink - none of those paths is rigged.";
            if (r.foreign) {
                why = "Skipped - those paths already carry another tool's expression.";
            } else if (r.pivots) {
                why = "Nothing to rebuild from: those controls belong to a Pivot, " +
                      "and which points were its is not written anywhere but the " +
                      "expression that has gone.";
            } else if (r.many > 1) {
                why = "More than one path here carries no rig, and a control does " +
                      "not say which path it belongs to. Choose the one shape group " +
                      "in the timeline, or pick its points, and press Relink again.";
            } else if (r.bare) {
                why += " Select the point controls too and it can rebuild from those.";
            }
            return why;
        }
        var said = [];
        if (r.woke) {
            said.push("the expression on " + plural(r.woke, "path") +
                      " was switched off, and is on again");
        }
        if (r.built) {
            said.push("rebuilt the rig on " + plural(r.built, "point") + " from the controls left behind");
        }
        if (r.linked) { said.push(plural(r.linked, "point") + " put back on its own vertex"); }
        if (r.seated) { said.push(plural(r.seated, "control") + " brought to its point"); }
        var msg;
        if (said.length) {
            msg = said.join(", ") + ".";
            if (r.built) {
                msg += " " + r.byName + " placed by name, " + r.byPlace +
                       " by where they stand - look over the shape before going on.";
            }
            if (moves && moves.stuck) {
                msg += " " + plural(moves.stuck, "control") + " would not move.";
            }
        } else if (r.noted) {
            msg = "Everything was already in place. Noted where " +
                  plural(r.noted, "point") + " sits, so a later edit can be put right exactly.";
        } else {
            msg = "Everything was already in place.";
        }
        if (r.unplaced) {
            msg += " " + plural(r.unplaced, "control") + " had no vertex left to go on.";
        }
        if (r.many) {
            msg += " " + plural(r.many, "path") + " here carries no rig and was left " +
                   "alone: choose one on its own to build it again.";
        }
        if (r.pivots) {
            msg += " A Pivot's points cannot be rebuilt: which were its is not written down.";
        }
        if (r.hands) {
            msg += " " + plural(r.hands, "handle") +
                   " could not be taken up again: the points have their own tangents back. " +
                   "Press Handles to give them handles once more.";
        }
        if (r.foreign) {
            msg += " " + plural(r.foreign, "path") + " left alone: another tool's expression.";
        }
        if (r.stuck) {
            msg += " " + plural(r.stuck, "point") + " left alone: no vertex near enough.";
        }
        if (r.blind) {
            // Not a failure, and it should not read like one: there was
            // nothing to put right, only nothing to put right WITH.
            msg += " " + plural(r.blind, "point") +
                   " was rigged before places were written down, so a vertex added or removed later cannot be matched exactly.";
        }
        if (r.lost) {
            msg += " " + plural(r.lost, "point") + " left alone: its control layer is gone.";
        }
        return msg;
    }

    function actRelink(items, selLayers) {
        if (!items || !items.length) {
            UI.say("Select a shape layer, or pick the points to put right.");
            return false;
        }
        return run("Relink points", function (comp) {
            var r = relinkTally(), edits = [], i, seen = {}, st;
            // Building a rig again has nothing to go on but the controls, and
            // a control names a layer, never a path. Handed several paths that
            // carry no rig it would pin every one of them to the same
            // controls, and a wrong pairing drives the shape every bit as
            // convincingly as a right one. So it only builds when the aim
            // comes down to a single path - which picking the points, or
            // choosing the shape group in the timeline, is enough to do.
            var bare = 0, counted = {};
            for (i = 0; i < items.length; i++) {
                if (!items[i] || items[i].prim || counted[items[i].key]) { continue; }
                counted[items[i].key] = true;
                st = rigStateOf(items[i].prop);
                if (!st.man && !st.foreign) { bare++; }
            }
            var mayBuild = (bare === 1);
            // The probe is a layer, and adding one is a change. Only a rebuild
            // needs it, so a Relink that finds nothing to do costs nothing.
            var probe = null;
            function getProbe() {
                if (!probe) { probe = new Probe(comp); }
                return probe;
            }
            try {
                for (i = 0; i < items.length; i++) {
                    var item = items[i];
                    if (!item || seen[item.key]) { continue; }
                    seen[item.key] = true;
                    edits = edits.concat(
                        relinkOne(comp, getProbe, item, selLayers, r, mayBuild));
                }
            } finally {
                if (probe) { probe.done(); }
            }
            // The manifests are written before this runs, so every move finds
            // the entry at the index it has just been given.
            var moves = edits.length ? applyEdits(comp, edits) : null;
            return relinkReport(r, moves);
        }, true);
    }

    // ------------------------------------------------- stating what to move

    // Picks come from the panel; geom is what it has drawn, keyed the same
    // way, so the editing layer can be driven without a panel to drive it.
    function editsFor(picks, geom, fn) {
        var out = [], i, k;
        for (i = 0; i < picks.length; i++) {
            var item = picks[i].item, idx = picks[i].idx;
            var gm = geom[item.key];
            if (!gm) { continue; }
            for (k = 0; k < idx.length; k++) {
                var at = gm.verts[idx[k]];
                if (!at) { continue; }
                var e = fn(at, gm, idx[k], item);
                if (!e) { continue; }
                e.item = item;
                e.i = idx[k];
                out.push(e);
            }
        }
        return out;
    }

    function boundsOfPicks(picks, geom) {
        var b = null, i, k;
        for (i = 0; i < picks.length; i++) {
            var gm = geom[picks[i].item.key];
            if (!gm) { continue; }
            for (k = 0; k < picks[i].idx.length; k++) {
                var p = gm.verts[picks[i].idx[k]];
                if (!p) { continue; }
                if (!b) { b = { minx: p[0], miny: p[1], maxx: p[0], maxy: p[1], n: 0 }; }
                if (p[0] < b.minx) { b.minx = p[0]; }
                if (p[1] < b.miny) { b.miny = p[1]; }
                if (p[0] > b.maxx) { b.maxx = p[0]; }
                if (p[1] > b.maxy) { b.maxy = p[1]; }
                b.n++;
            }
        }
        return b;
    }

    function tipVec(gm, idx, side) {
        for (var i = 0; i < gm.tips.length; i++) {
            var tp = gm.tips[i];
            if (tp.i === idx && tp.side === side) {
                return [tp.b[0] - tp.a[0], tp.b[1] - tp.a[1]];
            }
        }
        return null;
    }

    function xformPt(mat, c, p) {
        var v = mVec(mat, [p[0] - c[0], p[1] - c[1]]);
        return [c[0] + v[0], c[1] + v[1]];
    }

    // A parametric shape has no vertices to write, so it becomes a path
    // first - the same thing Create does - and the edits follow it over.
    function overPrimitives(comp, picks, edits) {
        var any = false, i;
        for (i = 0; i < picks.length && !any; i++) {
            if (picks[i].item && picks[i].item.prim) { any = true; }
        }
        if (!any) { return { edits: edits, made: 0 }; }
        var turned = resolvePrimitives(comp, picks);
        if (!turned.made) { return { edits: edits, made: 0 }; }
        touched();
        var byOld = {}, n;
        for (i = 0; i < picks.length; i++) {
            var was = picks[i].item;
            for (n = 0; n < turned.picks.length; n++) {
                var now = turned.picks[n].item;
                if (!sameLayer(was.layer, now.layer)) { continue; }
                if (was.sname !== now.sname) { continue; }
                if (was.chain.join("/") !== now.chain.join("/")) { continue; }
                byOld[was.key] = now;
                break;
            }
        }
        for (i = 0; i < edits.length; i++) {
            var fresh = byOld[edits[i].item.key];
            if (fresh) { edits[i].item = fresh; }
        }
        return { edits: edits, made: turned.made };
    }

    // The shape group a path sits in, and the two spaces either side of its
    // own transform. A group is drawn as position + R*S*(content - anchor),
    // so the vertices and the anchor share one space and the position lives
    // in the space outside it.
    function groupOf(item) {
        var holder, g = null, i;
        try { holder = item.layer.property(MN_CONTENTS); } catch (e0) { return null; }
        for (i = 0; i < item.chain.length; i++) {
            g = holder ? holder.property(item.chain[i]) : null;
            if (!g) { return null; }
            holder = g.property(MN_VECTORS);
        }
        return g;
    }

    function chainUpTo(item, t, upto) {
        return mMul(layerMatrix(item.layer, t),
                    chainMatrix({ layer: item.layer, chain: item.chain.slice(0, upto) }, t));
    }

    function ownedByExpression(prop) {
        try {
            return !!(prop.expressionEnabled && trim(String(prop.expression || "")) !== "");
        } catch (e) { return false; }
    }

    function addTo(comp, prop, d) {
        var v;
        try { v = prop.valueAtTime(comp.time, false); } catch (e0) { return false; }
        var want = [Number(v[0]) + d[0], Number(v[1]) + d[1]];
        try {
            if (prop.numKeys > 0) { prop.setValueAtTime(comp.time, want); }
            else { prop.setValue(want); }
        } catch (e1) { return false; }
        touched();
        return true;
    }

    // Moving the anchor on its own slides the artwork, because everything in
    // the group is drawn relative to it. So the position moves by the same
    // step in its own space, which cancels that exactly and leaves the move
    // looking as it would have - with the anchor having kept its place on
    // the artwork rather than staying behind.
    //
    // Only the group nearest the path is touched, and only when the whole of
    // what that group holds is moving: a path being reshaped has not gone
    // anywhere for the anchor to follow it to.
    function anchorsFollow(comp, picks, dComp, r) {
        if (!P.anchorFollows || !dComp || (!dComp[0] && !dComp[1])) { return; }
        var t = comp.time, whole = {}, i, k;
        for (i = 0; i < picks.length; i++) {
            var it = picks[i].item;
            if (!it || it.prim || !it.chain.length) { continue; }
            var sh = rawShape(comp, it.prop);
            if (!sh || picks[i].idx.length !== sh.vertices.length) { continue; }
            whole[it.key] = it;
        }
        var done = {};
        for (k in whole) {
            if (!whole.hasOwnProperty(k)) { continue; }
            var item = whole[k];
            var key = String(item.layer.id) + "/" + item.chain.join("\u0001");
            if (done[key]) { continue; }
            done[key] = true;
            // every path that group holds has to be moving, or the group is
            // changing shape rather than travelling
            var all = scanPaths(comp, [item.layer]), every = true;
            for (i = 0; i < all.length; i++) {
                if (all[i].chain.join("\u0001") !== item.chain.join("\u0001")) { continue; }
                if (!whole[all[i].key]) { every = false; break; }
            }
            if (!every) { continue; }
            var g = groupOf(item);
            var tr = g ? g.property(MN_GXFORM) : null;
            var aP = tr ? tr.property("ADBE Vector Anchor") : null;
            var pP = tr ? tr.property("ADBE Vector Position") : null;
            if (!aP || !pP) { continue; }
            // Keyframed or driven, the pair cannot be stepped by a constant
            // without breaking what it does at every other time.
            if (aP.numKeys > 0 || pP.numKeys > 0 ||
                ownedByExpression(aP) || ownedByExpression(pP)) {
                r.anchorHeld++;
                continue;
            }
            var dLocal = mVec(mInv(itemMatrix(item, t)), dComp);
            var dParent = mVec(mInv(chainUpTo(item, t, item.chain.length - 1)), dComp);
            if (addTo(comp, aP, dLocal) && addTo(comp, pP, dParent)) { r.anchors++; }
            else { r.anchorHeld++; }
        }
    }

    function runEdits(title, picks, edits, dMove) {
        if (!edits || !edits.length) { UI.say("Pick some points first."); return false; }
        return run(title, function (comp) {
            var over = overPrimitives(comp, picks, edits);
            var r = applyEdits(comp, over.edits);
            r.anchors = 0;
            r.anchorHeld = 0;
            anchorsFollow(comp, picks, dMove, r);
            var msg = editReport(r);
            if (r.anchors) {
                msg += " " + plural(r.anchors, "group") + " took its anchor point along.";
            }
            if (r.anchorHeld) {
                msg += " " + plural(r.anchorHeld, "group") +
                       " kept its anchor: it is keyframed or driven.";
            }
            if (over.made) {
                msg += " " + plural(over.made, "shape") + " became a path.";
            }
            return msg;
        }, true);
    }

    function editRun(title, picks, geom, fn, dMove) {
        return runEdits(title, picks, editsFor(picks, geom, fn), dMove);
    }

    function actMovePoints(picks, geom, d, title) {
        return editRun(title || "Move points", picks, geom, function (at) {
            return { pt: [at[0] + d[0], at[1] + d[1]] };
        }, d);
    }

    // Alignment moves the points and nothing else. A tangent is stored as a
    // vector from its vertex, so the curve rides along without being told to.
    function actAlign(picks, geom, mode) {
        var b = boundsOfPicks(picks, geom);
        if (!b || b.n < 2) { UI.say("Pick two or more points to align."); return false; }
        return editRun("Align points", picks, geom, function (at) {
            var x = at[0], y = at[1];
            if (mode === "l") { x = b.minx; }
            else if (mode === "cx") { x = (b.minx + b.maxx) / 2; }
            else if (mode === "r") { x = b.maxx; }
            else if (mode === "t") { y = b.miny; }
            else if (mode === "cy") { y = (b.miny + b.maxy) / 2; }
            else if (mode === "b") { y = b.maxy; }
            else { return null; }
            if (Math.abs(x - at[0]) < 1e-9 && Math.abs(y - at[1]) < 1e-9) { return null; }
            return { pt: [x, y] };
        });
    }

    // The transform box. Handles are carried through the same map as their
    // points, so a turned selection keeps the shape of its curve.
    function actTransform(picks, geom, mat, centre, title) {
        return editRun(title || "Transform points", picks, geom, function (at, gm, idx) {
            var e = { pt: xformPt(mat, centre, at) };
            var ti = tipVec(gm, idx, "in"), to = tipVec(gm, idx, "out");
            if (ti) { e.ti = mVec(mat, ti); }
            if (to) { e.to = mVec(mat, to); }
            return e;
        });
    }

    // ---------------------------------------------------------- keyframing
    // Somewhere to edit from. Without a keyframe already down, moving a point
    // changes the path for the whole composition; with one at this moment,
    // the move belongs to this moment.

    function hasKeyAt(prop, t) {
        for (var k = 1; k <= prop.numKeys; k++) {
            if (Math.abs(prop.keyTime(k) - t) < 1e-6) { return true; }
        }
        return false;
    }

    function putKey(comp, prop, sh) {
        var live = false;
        try { live = !!prop.expressionEnabled; } catch (e0) {}
        try {
            if (live) { prop.expressionEnabled = false; }
            prop.setValueAtTime(comp.time, sh);
            touched();
        } finally {
            if (live) { try { prop.expressionEnabled = true; } catch (e1) {} }
        }
    }

    // Is this path, or a group it sits inside, picked out in the timeline?
    // Selecting a shape group is how you say "this shape and not the others
    // on the layer", and After Effects cannot report that through the layer:
    // selecting a property selects its layer too, so the layer says only
    // that something on it was chosen. The climb stops below the layer for
    // that reason - going one step further would make every path on it match.
    function isPointedAt(prop) {
        var p = prop, guard = 0, mn;
        while (p && guard++ < 24) {
            try { if (p.selected) { return true; } } catch (e) {}
            try { mn = String(p.matchName || ""); } catch (e1) { return false; }
            if (mn === MN_CONTENTS || mn === MN_MASKS) { return false; }
            var up = null;
            try { up = p.propertyGroup(1); } catch (e2) { up = null; }
            if (!up || up === p) { return false; }
            p = up;
        }
        return false;
    }

    // The same question across several lists at once, answered as a set of
    // keys - or null when the timeline is pointing at no property in
    // particular, which is what selecting the bare layer means and leaves
    // the whole of it on show.
    function pointedKeys(lists) {
        var keys = {}, any = false, i, k, items;
        for (i = 0; i < lists.length; i++) {
            items = lists[i] || [];
            for (k = 0; k < items.length; k++) {
                if (items[k] && isPointedAt(items[k].prop)) {
                    keys[items[k].key] = true;
                    any = true;
                }
            }
        }
        return any ? keys : null;
    }

    function keepKeys(items, keys) {
        if (!keys) { return items; }
        var out = [], i;
        for (i = 0; i < items.length; i++) {
            if (keys[items[i].key]) { out.push(items[i]); }
        }
        return out;
    }

    // A shape layer can carry masks as well as shapes, and then the preview
    // shows two sets of points over one piece of artwork with nothing to say
    // which is which. This leaves out any mask the timeline is not pointing
    // at - the mask itself, not the layer it is on, which is what makes it
    // worth having.
    function onlyDirectMasks(items) {
        var out = [], i;
        for (i = 0; i < items.length; i++) {
            if (items[i].mask && !isPointedAt(items[i].prop)) { continue; }
            out.push(items[i]);
        }
        return out;
    }

    // Whichever of these the timeline is pointing at; all of them if it is
    // pointing at none, which is what selecting the bare layer means.
    function pointedPaths(items) {
        var out = [], i;
        for (i = 0; i < items.length; i++) {
            if (items[i] && isPointedAt(items[i].prop)) { out.push(items[i]); }
        }
        return out.length ? out : items;
    }

    // After Effects has no way to twirl a property open from a script, and
    // the menu command scripts reach for - "Reveal Selected Properties" -
    // is not one: the lookup returns 0 and executing 0 does nothing quietly.
    // What does work is the U key, which opens the keyframed properties of
    // whatever layers are selected. A path that was just keyed is exactly
    // that, so this shows the key that was made and little else.
    var CMD_REVEAL_KEYED = 2387;

    // The reveal commands act on every selected layer, and open every
    // keyframed - or modified - property on it. Neither can be told to open
    // one named property: After Effects has no such command, which is why
    // what is asked for has to be narrowed by the selection instead.
    //
    // So when the aim came from points picked in the preview, the selection
    // is made exactly those layers rather than added to, and exactly those
    // paths are left as the selected properties, so the rows asked for are
    // the ones highlighted among whatever else came open. When the aim came
    // from the timeline instead, nothing is taken away: the selection there
    // is already the user's answer to the question.
    function aimLayers(comp, items, only) {
        var want = {}, any = false, i, n, L;
        for (i = 0; i < items.length; i++) {
            if (items[i] && items[i].layer) { want[items[i].layer.id] = true; }
        }
        for (n = 1; n <= comp.numLayers; n++) {
            try {
                L = comp.layer(n);
                if (want[L.id]) {
                    if (!L.selected) { L.selected = true; }
                    any = true;
                } else if (only && L.selected) {
                    L.selected = false;
                }
            } catch (e) {}
        }
        return any;
    }

    // Deselecting a layer lets its properties go with it, so the paths are
    // chosen after the layers, never before.
    function aimPaths(items) {
        for (var i = 0; i < items.length; i++) {
            try {
                if (items[i] && items[i].prop && !items[i].prim) {
                    items[i].prop.selected = true;
                }
            } catch (e) {}
        }
    }

    function revealKeyed(items, only) {
        var comp = activeComp();
        if (!comp || !items || !items.length) { return false; }
        if (!aimLayers(comp, items, only)) { return false; }
        if (only) { aimPaths(items); }
        try { app.executeCommand(CMD_REVEAL_KEYED); } catch (e2) { return false; }
        return true;
    }

    // A keyframe on each path, at the current time, holding what it already
    // shows. The rig reads the path's own value, so a rigged path keys that
    // value - which is what its unrigged points are drawn from.
    function actKeyPaths(items) {
        if (!items || !items.length) {
            UI.say("Select a shape layer or a shape group first.");
            return false;
        }
        return run("Keyframe paths", function (comp) {
            var made = 0, again = 0, prim = 0, foreign = 0, rigged = 0, i;
            for (i = 0; i < items.length; i++) {
                var item = items[i];
                if (!item) { continue; }
                if (item.prim) { prim++; continue; }
                if (isForeignRig(item.prop)) { foreign++; continue; }
                var sh = rawShape(comp, item.prop);
                if (!sh) { continue; }
                if (readManifest(item.prop)) { rigged++; }
                if (hasKeyAt(item.prop, comp.time)) { again++; } else { made++; }
                putKey(comp, item.prop, sh);
            }
            if (!made && !again) {
                if (prim) {
                    return "A rectangle, ellipse or star has no path to key - press Create to make one.";
                }
                if (foreign) {
                    return "Skipped - those paths already carry another tool's expression.";
                }
                return "Nothing to key.";
            }
            var msg = made
                ? ("A keyframe on " + plural(made, "path") + ".")
                : (plural(again, "path") + " already had one here; it holds what they show now.");
            if (made && again) { msg += " " + plural(again, "path") + " already had one."; }
            if (rigged) {
                msg += " " + plural(rigged, "path") +
                       " is rigged: that keys the value the rig reads.";
            }
            if (prim) { msg += " " + plural(prim, "shape") + " has no path to key."; }
            if (foreign) { msg += " " + plural(foreign, "path") + " belongs to another tool."; }
            return msg;
        }, true);
    }

    // Open the paths in the timeline, without keying anything. After Effects
    // has no command that opens one named property, so the nearest fit is
    // chosen: U when every path asked for has keyframes of its own, and UU
    // otherwise - which opens whatever else on the layer is modified. That
    // is a good deal more than was asked for, so the message says so rather
    // than leaving a timeline full of unexplained rows.
    var CMD_REVEAL_MODIFIED = 2771;

    function actRevealPaths(items, only) {
        if (!items || !items.length) {
            UI.say("Select a shape layer or a shape group first.");
            return false;
        }
        var comp = activeComp();
        if (!comp) { UI.say("Open a composition first."); return false; }

        var paths = 0, keyed = 0, layers = 0, seen = {}, prim = 0, i;
        for (i = 0; i < items.length; i++) {
            var it = items[i];
            if (!it) { continue; }
            if (it.prim) { prim++; continue; }
            paths++;
            try { if (it.prop.numKeys > 0) { keyed++; } } catch (e) {}
            try {
                if (!seen[it.layer.id]) { seen[it.layer.id] = true; layers++; }
            } catch (e1) {}
        }
        aimLayers(comp, items, only);
        if (only) { aimPaths(items); }
        if (!paths) {
            UI.say(prim
                ? "A rectangle, ellipse or star has no path to open - press Create to make one."
                : "Nothing to open.");
            return false;
        }

        var clean = (keyed === paths);
        try {
            app.executeCommand(clean ? CMD_REVEAL_KEYED : CMD_REVEAL_MODIFIED);
        } catch (e2) {
            UI.say("After Effects would not run the reveal.");
            return false;
        }
        var msg = clean
            ? ("Opened " + plural(paths, "path") + " in the timeline.")
            : ("Opened " + plural(paths, "path") + ", and everything else modified on " +
               plural(layers, "layer") +
               ": only a keyframed property can be opened on its own. Press Keyframe first for just the path.");
        if (only) {
            msg += " " + plural(layers, "layer") + " is selected, and those paths with it.";
        }
        if (prim) { msg += " " + plural(prim, "shape") + " has no path to open."; }
        UI.say(msg);
        return true;
    }

    // ------------------------------------------------------------ snapping
    // Figma's trick, and the reason its snap never feels grabby: the range is
    // measured on screen rather than in the artwork, so it stays the same few
    // pixels however far in the view is zoomed, and the closer you look the
    // finer it lets you place a point. Each axis answers for itself, so a
    // point can line up across while it runs free down the way.
    //
    //   probes  where the moving thing would land on this axis, before snapping
    //   cands   what it could line up with
    //   d       the delta asked for
    //   s       canvas pixels to one composition pixel
    //   px      how near, on screen, before it takes hold
    function snapAxis(probes, cands, d, s, px) {
        var best = null, near = px / Math.max(1e-9, s), i, k;
        for (i = 0; i < probes.length; i++) {
            var want = probes[i] + d;
            for (k = 0; k < cands.length; k++) {
                var off = cands[k] - want;
                if (off < 0) { off = -off; }
                if (off > near) { continue; }
                near = off;
                best = { d: d + (cands[k] - want), at: cands[k] };
            }
        }
        return best || { d: d, at: null };
    }

    // How far a point lies off a line segment, squared. Picking a whole path
    // means asking about the curve itself rather than its vertices, and a
    // flattened path is a run of these.
    function segDist2(a, b, px, py) {
        var dx = b[0] - a[0], dy = b[1] - a[1];
        var len = dx * dx + dy * dy;
        var t = len > 0 ? (((px - a[0]) * dx + (py - a[1]) * dy) / len) : 0;
        if (t < 0) { t = 0; } else if (t > 1) { t = 1; }
        var qx = a[0] + t * dx - px, qy = a[1] + t * dy - py;
        return qx * qx + qy * qy;
    }

    function allIdxOf(gm) {
        var out = [], k;
        for (k = 0; gm && k < gm.verts.length; k++) { out.push(k); }
        return out;
    }

    // Even-odd, so a lasso that doubles back on itself still selects what it
    // drew round rather than everything it touched.
    function inPolygon(poly, x, y) {
        var inside = false, n = poly.length, i, j;
        for (i = 0, j = n - 1; i < n; j = i++) {
            var xi = poly[i][0], yi = poly[i][1];
            var xj = poly[j][0], yj = poly[j][1];
            if ((yi > y) === (yj > y)) { continue; }
            if (x < (xj - xi) * (y - yi) / (yj - yi) + xi) { inside = !inside; }
        }
        return inside;
    }

    // A single handle, dragged. The point it belongs to does not move.
    function actCurve(item, geom, idx, sides) {
        var picks = [{ item: item, idx: [idx] }];
        return editRun("Reshape the curve", picks, geom, function (at, gm, i2) {
            if (i2 !== idx) { return null; }
            var e = {};
            if (sides["in"]) { e.ti = sides["in"]; }
            if (sides.out) { e.to = sides.out; }
            return e;
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
    var ZOOM_PX = 18;
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
        "points": [["b",1.65,[3,19,10,22,18,6,25,9]],["r",1.98,3,19,2.9],["r",1.98,14,14,2.9],["r",1.98,25,9,2.9]],
        "all": [["r",0,9,9,3.6],["r",0,19,9,3.6],["r",0,9,19,3.6],["r",0,19,19,3.6]],
        "none": [["r",1.98,9,9,3.6],["r",1.98,19,9,3.6],["r",1.98,9,19,3.6],["r",1.98,19,19,3.6]],
        "invert": [["r",0,9,9,3.6],["r",1.98,19,9,3.6],["r",1.98,9,19,3.6],["r",0,19,19,3.6]],
        "zoomout": [["p",2.2,[17,8,10,14,17,20]]],
        "zoomin": [["p",2.2,[11,8,18,14,11,20]]],
        "marquee": [["x",1.76,4,7,24,21],["r",0,9,12,2.4],["r",0,15,17,2.4],["r",0,20,11,2.4]],
        "lasso": [["b",1.98,[14,5,24,5,24,19,14,19]],["b",1.98,[14,19,5,19,5,5,14,5]],["p",1.98,[11.5,18.2,9,25]]],
        "snap": [["p",1.54,[14,2.5,14,25.5]],["r",0,14,9,3.2],["r",0,14,19,3.2],["r",1.98,23,14,3.0],["p",2.2,[21,11,17,14,21,17]]],
        "box": [["x",1.76,7,7,21,21],["r",0,7,7,2.6],["r",0,21,7,2.6],["r",0,7,21,2.6],["r",0,21,21,2.6]],
        "alignleft": [["p",1.76,[4,3,4,25]],["p",3.6,[4,10,22,10]],["p",3.6,[4,18,16,18]]],
        "aligncx": [["p",1.76,[14,3,14,25]],["p",3.6,[5,10,23,10]],["p",3.6,[8,18,20,18]]],
        "alignright": [["p",1.76,[24,3,24,25]],["p",3.6,[6,10,24,10]],["p",3.6,[12,18,24,18]]],
        "aligntop": [["p",1.76,[3,4,25,4]],["p",3.6,[10,4,10,22]],["p",3.6,[18,4,18,16]]],
        "aligncy": [["p",1.76,[3,14,25,14]],["p",3.6,[10,5,10,23]],["p",3.6,[18,8,18,20]]],
        "alignbottom": [["p",1.76,[3,24,25,24]],["p",3.6,[10,6,10,24]],["p",3.6,[18,12,18,24]]],
        "help": [["c",1.76,14,14,10.5],["b",1.98,[10,10.5,10.5,6.3,18.2,6.6,17.6,11.0]],["p",1.98,[17.6,11.0,14,13.6,14,16.4]],["c",0,14,20.4,1.5]],
        "key": [["b",1.65,[2.5,16,8,17,14,8,20,8.5]],["d",0,11.1,12.4,3.1],["p",2.2,[20,19,20,27]],["p",2.2,[16,23,24,23]]],
        "reveal": [["p",1.98,[3.5,8.5,11,8.5,7.2,14.5,3.5,8.5]],["p",1.98,[14.5,8.5,25,8.5]],["p",3.6,[14.5,15,25,15]],["p",1.98,[14.5,21.5,21.5,21.5]]],
        "relink": [["b",1.65,[3,20,10,23,18,7,25,10]],["r",1.98,14,15,2.9],["r",0,14,3.8,2.6],["p",1.98,[11.4,8.2,14,11.2,16.6,8.2]]],
        "pickpt": [["p",1.65,[5,20,10,6,21,9,23,20,5,20]],["r",0,21,9,3.4]],
        "pickpath": [["p",1.65,[5,20,10,6,21,9,23,20,5,20]],["r",0,5,20,3.0],["r",0,10,6,3.0],["r",0,21,9,3.0],["r",0,23,20,3.0]],
        "handpick": [["p",1.76,[5,19,23,9]],["c",1.21,5,19,3.3],["c",0,23,9,3.3],["r",0,14,14,4.6]],
        "handall": [["p",1.76,[5,19,23,9]],["c",0,5,19,3.3],["c",0,23,9,3.3],["r",0,14,14,4.6]],
        "handnone": [["p",1.76,[5,19,23,9]],["c",1.21,5,19,3.3],["c",1.21,23,9,3.3],["r",0,14,14,4.6]],
        "scopelay": [["x",1.54,3,6,25,22],["r",0,14,14,4.0]],
        "scopegrp": [["x",1.54,3,6,25,22],["r",1.54,14,14,5.4],["r",0,14,14,2.2]],
        "scopeall": [["x",1.54,3,6,25,22],["r",0,8,14,2.6],["r",0,14,14,2.6],["r",0,20,14,2.6]],
        "handmask": [["p",1.76,[7,18,21,10]],["c",0,7,18,3.4],["d",0,21,10,4.4]],
        "handlayer": [["p",1.76,[7,18,21,10]],["c",0,7,18,3.4],["r",0,21,10,3.8]],
        "pivonly": [["c",1.98,14,14,4.6],["c",0,14,14,1.5],["c",1.32,6,6,1.8],["c",1.32,22,6,1.8],["c",1.32,14,23,1.8]],
        "pivpts": [["c",1.98,14,14,4.6],["c",0,14,14,1.5],["r",0,6,6,2.6],["r",0,22,6,2.6],["r",0,14,23,2.6]],
        "info": [["c",1.87,14,14,10.5],["c",0,14,8.8,1.6],["p",2.31,[14,12.8,14,20.2]]]
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
    // Round the preview. Quieter than a button's edge: that one has to read
    // against the button's own fill, while this sits between two darks and
    // only has to say where the preview stops.
    var CV_LINE = [0.22, 0.22, 0.23];
    var BTN_RADIUS = 8;
    // A tab row's buttons are taller than the top row's, and taking the same
    // margin off both left their pictures looking heavy beside it. The button
    // keeps its size; what is drawn inside it comes down to three quarters,
    // which lands the two rows on the same drawn size.
    function artSize(h) {
        var box = h - 6;
        return (h >= UI_H) ? Math.round(box * 0.75) : box;
    }
    var ICON_COL = [0.82, 0.82, 0.82];

    // A button that holds a setting, while that setting is on. It used to
    // borrow the pressed fill, which made a toggle that was on and a button
    // being pressed the same picture - there was no telling Snap was on
    // without turning it off. White can be mistaken for neither, and it
    // forces a dark icon: the ordinary light grey would vanish on it.
    var TOG_ON = [0.92, 0.92, 0.92];
    var TOG_ON_HOT = [1.00, 1.00, 1.00];
    var TOG_ON_LINE = [0.72, 0.72, 0.72];
    var TOG_ON_INK = [0.12, 0.12, 0.12];

    // ScriptUI draws lines and rectangles but has no rounded rectangle, so the
    // corners are stepped round in short segments.
    function roundRectPath(g, x, y, w, h, r) {
        // Past half the shorter side the corners would cross and the path
        // would come out inside out, so the radius is a wish, not an order.
        var lim = Math.min(w, h) / 2;
        if (r > lim) { r = lim; }
        if (r < 0) { r = 0; }
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
    // What a button is painted in, given what it is and what is happening to
    // it. Only a button that holds a setting carries "on" at all, so that is
    // what tells the two kinds apart. Kept out of the drawing so it can be
    // checked without a screen to look at.
    function buttonLook(ctrl) {
        var hot = (ctrl.hot === true);
        var down = (ctrl.down === true);
        // A press reads as a press whatever the setting is, so there is
        // always feedback under the finger.
        var on = (ctrl.on === true) && !down;
        if (on) {
            return { fill: hot ? TOG_ON_HOT : TOG_ON, edge: TOG_ON_LINE,
                     ink: TOG_ON_INK };
        }
        return { fill: down ? BTN_FILL_DOWN : (hot ? BTN_FILL_HOT : BTN_FILL),
                 edge: hot ? BTN_LINE_HOT : BTN_LINE,
                 ink: ICON_COL };
    }

    // A button wide enough to say what it is set to. After Effects draws a
    // dropdown itself, corners and all, so a setting that wants the same
    // rounded rectangle as everything else has to be a button we paint.
    var LABEL_FONT;
    function labelFont() {
        if (LABEL_FONT === undefined) {
            try { LABEL_FONT = ScriptUI.newFont("dialog", "REGULAR", 11); }
            catch (eF) { LABEL_FONT = null; }
        }
        return LABEL_FONT;
    }

    function paintLabelButton(ctrl, ops, label) {
        var g = ctrl.graphics;
        var w = ctrl.size.width, h = ctrl.size.height;
        var look = buttonLook(ctrl);
        var fill = look.fill, edge = look.edge, ink = look.ink;
        roundRectPath(g, 0.5, 0.5, w - 1, h - 1, BTN_RADIUS);
        g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, [fill[0], fill[1], fill[2], 1]));
        roundRectPath(g, 0.5, 0.5, w - 1, h - 1, BTN_RADIUS);
        g.strokePath(g.newPen(g.PenType.SOLID_COLOR, [edge[0], edge[1], edge[2], 1], 1));
        var size = artSize(h);
        drawArt(g, ops, 8, (h - size) / 2, size, ink, ctrl.enabled ? 1 : 0.4);
        try {
            g.drawString(String(label),
                         g.newPen(g.PenType.SOLID_COLOR, [ink[0], ink[1], ink[2], 1], 1),
                         size + 14, (h - 13) / 2, labelFont());
        } catch (eS) {}
    }

    function paintIconButton(ctrl, ops, st) {
        var g = ctrl.graphics;
        var w = ctrl.size.width, h = ctrl.size.height;
        var look = buttonLook(ctrl);
        var fill = look.fill, edge = look.edge;
        roundRectPath(g, 0.5, 0.5, w - 1, h - 1, BTN_RADIUS);
        g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, [fill[0], fill[1], fill[2], 1]));
        roundRectPath(g, 0.5, 0.5, w - 1, h - 1, BTN_RADIUS);
        g.strokePath(g.newPen(g.PenType.SOLID_COLOR, [edge[0], edge[1], edge[2], 1], 1));
        var size = artSize(Math.min(w, h));
        drawArt(g, ops, (w - size) / 2, (h - size) / 2, size, look.ink,
                ctrl.enabled ? 1 : 0.4);
    }

    var state = {
        items: [],
        geom: [],
        prims: [],
        status: "",
        // Points, and separately the bezier handle tips. A tip is named
        // "<vertex>:in" or "<vertex>:out". They are kept apart because the
        // transform box is drawn round the points and nothing else: a handle
        // sticking out of the selection must not stretch the box it is in.
        sel: {},
        selH: {},
        view: { s: 1, tx: 0, ty: 0 },
        // Set the moment the view is panned or zoomed by hand. A fit would
        // throw that away, so from then on only a change of what is on show -
        // or a double click on empty canvas - is allowed to reframe.
        viewManual: false,
        fitted: false,
        shown: null,
        // The selection of control layers the panel last acted on, so a
        // refresh can tell a new statement from After Effects apart from the
        // one the panel itself just made.
        ctrlSig: null,
        drag: null,
        // An edit in hand - a point being dragged, a curve reshaped, the
        // transform box pulled - and the geometry it would leave behind.
        // Nothing reaches the project until the button comes up.
        edit: null,
        preview: null
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

    // Which thing drives one side's tangent, and so what has to move for the
    // curve to change. A handle the rig drives is not editable by writing the
    // path: the expression would put it straight back.
    //   free   the path's own value, nothing rigged
    //   bound  the path's value, read through the control's bind frame
    //   mask   a VXR In / VXR Out mask on the point control
    //   layer  a handle control layer of its own
    function tipKind(entry, side) {
        if (!entry) { return "free"; }
        if (side === "in") {
            if (entry.im) { return "mask"; }
            if (entry["if"]) { return "layer"; }
        } else {
            if (entry.om) { return "mask"; }
            if (entry.of) { return "layer"; }
        }
        return entry.tf ? "bound" : "free";
    }

    function tangentOf(sh, i, side) {
        return (side === "in") ? sh.inTangents[i] : sh.outTangents[i];
    }

    // A tangent of no length has no tip to draw and nothing to take hold of.
    // Pulling a handle out of a corner is the Handles button's job.
    function addTip(out, verts, sh, m, i, side, entry) {
        var v = tangentOf(sh, i, side);
        if (!v) { return; }
        if (Math.abs(v[0]) < 1e-6 && Math.abs(v[1]) < 1e-6) { return; }
        out.push({ i: i, side: side, a: verts[i],
                   b: mPt(m, [sh.vertices[i][0] + v[0], sh.vertices[i][1] + v[1]]),
                   ctl: tipKind(entry, side) });
    }

    // Everything the preview draws for one path, and everything an edit of it
    // needs to find its way back into the project: the matrix it was drawn
    // through, its inverse, the shape as read, and the manifest that says
    // which points the rig already holds.
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

        var man = item.prim ? null : readManifest(item.prop);
        var rigged = {}, tips = [];
        if (man) {
            for (i = 0; i < man.pts.length; i++) { rigged[man.pts[i].i] = true; }
        }
        for (i = 0; i < n; i++) {
            var e = man ? manEntry(man, i) : null;
            addTip(tips, verts, sh, m, i, "in", e);
            addTip(tips, verts, sh, m, i, "out", e);
        }
        // A path that carries keyframes is drawn in a colour of its own, so
        // which paths are animated can be seen rather than remembered. A
        // parametric shape keeps its animation on its own numbers rather
        // than on a path, so there is nothing here to read.
        var keyed = false;
        if (!item.prim) {
            try { keyed = item.prop.numKeys > 0; } catch (eK) { keyed = false; }
        }
        return { verts: verts, poly: poly, rigged: rigged, tips: tips,
                 closed: sh.closed, prim: !!item.prim, keyed: keyed,
                 foreign: !item.prim && isForeignRig(item.prop),
                 m: m, minv: mInv(m), raw: sh, man: man,
                 skew: chainSkewed(item, t) };
    }

    // The same thing again for a shape held in hand during a drag: no project
    // reads at all, so a move costs nothing but arithmetic.
    function geomFrom(gm, sh) {
        // Everything geomFor worked out that a drag cannot change is carried
        // across below; keyed is one of them.

        var verts = [], i, n = sh.vertices.length;
        for (i = 0; i < n; i++) { verts.push(mPt(gm.m, sh.vertices[i])); }
        var tips = [];
        for (i = 0; i < n; i++) {
            var e = gm.man ? manEntry(gm.man, i) : null;
            addTip(tips, verts, sh, gm.m, i, "in", e);
            addTip(tips, verts, sh, gm.m, i, "out", e);
        }
        return { verts: verts, poly: flattenPath(sh, gm.m), rigged: gm.rigged,
                 tips: tips, closed: gm.closed, prim: gm.prim, keyed: gm.keyed,
                 foreign: gm.foreign,
                 m: gm.m, minv: gm.minv, raw: sh, man: gm.man, skew: gm.skew };
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
        // Back off from the tightest fit. The padding alone put the outermost
        // points right under the edge of the canvas, where a handle sticking
        // out of one of them had nowhere to be drawn and nowhere to be grabbed.
        s = Math.min(s, 8) * FIT_FILL;
        state.view.s = s;
        state.view.tx = w / 2 - ((minx + maxx) / 2) * s;
        state.view.ty = h / 2 - ((miny + maxy) / 2) * s;
        state.viewManual = false;
    }

    var ZOOM_MIN = 0.02, ZOOM_MAX = 64, ZOOM_STEPS = 1000;

    // How much of the room a fit is allowed to take, beyond the padding.
    var FIT_FILL = 0.85;

    // The strip runs left to right, wider to closer, the way a horizontal
    // zoom reads. Evenly in powers rather than in pixels, so a notch is the
    // same proportion of a step whether the view sits at 5% or at 40x.
    function zoomFromBar(v) {
        var t = Math.max(0, Math.min(ZOOM_STEPS, v)) / ZOOM_STEPS;
        return ZOOM_MIN * Math.pow(ZOOM_MAX / ZOOM_MIN, t);
    }

    function barFromZoom(s) {
        var t = Math.log(s / ZOOM_MIN) / Math.log(ZOOM_MAX / ZOOM_MIN);
        if (!isFinite(t)) { t = 0; }
        return Math.max(0, Math.min(ZOOM_STEPS, Math.round(t * ZOOM_STEPS)));
    }

    // Zoom about a point on the canvas, so whatever is under the pointer stays
    // under it. Without that the artwork slides away while you lean in on it.
    function zoomAt(cx, cy, factor) {
        var was = state.view.s;
        var now = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, was * factor));
        if (now === was) { return false; }
        var at = toComp([cx, cy]);
        state.view.s = now;
        state.view.tx = cx - at[0] * now;
        state.view.ty = cy - at[1] * now;
        state.viewManual = true;
        return true;
    }

    function panBy(dx, dy) {
        state.view.tx += dx;
        state.view.ty += dy;
        state.viewManual = true;
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
            if (!additive) { clearSel(); a = selOf(key); }
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

    function tipName(idx, side) { return idx + ":" + side; }

    function selHOf(key) {
        if (!state.selH[key]) { state.selH[key] = []; }
        return state.selH[key];
    }

    function toggleSelH(key, idx, side, additive) {
        var nm = tipName(idx, side);
        var a = selHOf(key);
        var at = indexOf(a, nm);
        if (at >= 0) {
            if (additive) { a.splice(at, 1); }
        } else {
            if (!additive) { clearSel(); a = selHOf(key); }
            a.push(nm);
        }
    }

    function tipPicked(key, idx, side) {
        var a = state.selH[key];
        return !!a && has(a, tipName(idx, side));
    }

    // Does this vertex have either of its handles picked?
    function anyTipPicked(key, idx) {
        return tipPicked(key, idx, "in") || tipPicked(key, idx, "out");
    }

    function countSelH() {
        var n = 0;
        for (var k in state.selH) {
            if (state.selH.hasOwnProperty(k)) { n += state.selH[k].length; }
        }
        return n;
    }

    // Points and handles go together: there is one selection, shown in two
    // parts, and clearing it has to clear both or a handle stays picked with
    // nothing on screen to say so.
    function clearSel() {
        state.sel = {};
        state.selH = {};
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
        // A tabbed panel insets its own pages, so a row sitting at the window
        // margin starts further out than the rows below it - measured at 8
        // points in the panel. Everything above the tabs goes in here, with
        // that difference as its margin, and the two line up.
        var TOP_PAD = 8;
        var top = win.add("group");
        top.orientation = "column";
        top.alignChildren = ["fill", "top"];
        top.alignment = ["fill", "fill"];
        top.spacing = 4;
        top.margins = [TOP_PAD, 0, TOP_PAD, 0];

        var head = top.add("group");
        head.alignChildren = ["left", "center"];
        head.spacing = 4;
        // Shortened from "Selected layers": the row has seven icons and two
        // rules to fit beside it now, and 96 points is what it can spare.
        // 0 the selected layers, 1 the group chosen inside them, 2 the lot.
        var scopeAt = 0;
        var scopeDd = cycler(head, 88, HEAD_PX, "Showing",
            "which paths the preview shows. Group narrows it to the shape group " +
            "or mask chosen in the timeline, and shows the whole layer while " +
            "nothing in it is chosen",
            [{ v: 0, art: "scopelay", word: "Layers" },
             { v: 1, art: "scopegrp", word: "Group" },
             { v: 2, art: "scopeall", word: "All" }],
            function () { return scopeAt; },
            function (v) { scopeAt = v; state.fitted = false; refresh(); });

        // A hairline between the groups of the row: what it shows, what is
        // picked, what moves shapes between layers, and what the panel does
        // to the rig. 104 + 9*26 + 3 + 12*4 = 389. The budget is 400, which
        // is what fits inside the width the preview asks for (460 less the
        // window's margins) with room to spare; the 368 it used to be came
        // from a 380-wide panel that has not existed since the preview was
        // given a size you can aim in.
        function headRule() {
            var sep = head.add("panel");
            sep.alignment = ["left", "center"];
            sep.minimumSize = [1, 8];
            sep.preferredSize = [1, HEAD_PX - 8];
            sep.maximumSize = [1, HEAD_PX];
            return sep;
        }

        var bPoints = act(head, "points", "Show points",
                          "Show the path's own points in the composition", 76, HEAD_PX);
        headRule();
        // What picking means, before the buttons that do it. Its art is a
        // closed path either way - one corner taken, or the whole outline -
        // which is deliberately not the Show points S-curve beside it.
        var bPathPick = act(head, "pickpt", "Pick points",
                            "Pick points one at a time, or a whole path at a time",
                            40, HEAD_PX);
        bPathPick.onDraw = function (st) {
            paintIconButton(this, P.pickPath ? ICON_ART.pickpath : ICON_ART.pickpt, st);
        };
        bPathPick.on = !!P.pickPath;

        // One button for both: it offers All while nothing is picked and None
        // once something is, so the picture always shows what pressing it does.
        var bPick = act(head, "all", "All", "Pick every point in view", 40, HEAD_PX);
        bPick.onDraw = function (st) {
            paintIconButton(this,
                (countSel() + countSelH()) ? ICON_ART.none : ICON_ART.all, st);
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
        var bHelp = act(head, "help", "Help",
                        "Every gesture the preview knows, on one page", 44, HEAD_PX);
        var bPrefs = act(head, "prefs", "Prefs",
                         "Colours, sizes and shapes of the controls", 54, HEAD_PX);
        // Delete takes off whatever the rig put on, whichever tab made it, so
        // it belongs up here rather than inside one of them. Last in the row,
        // away from the selection buttons.
        var bDel = act(head, "delete", "Delete",
                       "Remove the picked points, or the selected handles, pivot or follower",
                       58, HEAD_PX);

        var cv = top.add("group");
        cv.alignment = ["fill", "fill"];
        // Points are dragged here now, not only picked, so the preview opens
        // at a size you can aim in. A docked panel keeps whatever size it was
        // last given; this is the floating palette and the first dock.
        cv.minimumSize = [300, 220];
        cv.preferredSize = [460, 360];
        // A modifier nobody is told about is a modifier nobody uses, and the
        // canvas has no room to label itself.
        // One line. There are a dozen gestures here now, and a tooltip that
        // listed them all covered the artwork it was explaining; Help holds
        // them instead, laid out and readable.
        cv.helpTip = "Click to pick, drag to move. Help lists every gesture.";

        // ScriptUI has no wheel event - a listener for one never fires in
        // After Effects, on this canvas or on anything else. What a wheel
        // does reach is a native control that scrolls: measured in the app, a
        // scrollbar reports every notch as onChanging with a new value. So
        // the strip down the side of the preview is what the wheel turns, and
        // dragging it does the same thing.
        var zoomRow = top.add("group");
        zoomRow.orientation = "row";
        zoomRow.alignment = ["fill", "top"];
        zoomRow.alignChildren = ["fill", "center"];
        zoomRow.spacing = 3;
        zoomRow.margins = 0;

        var bZoomOut = act(zoomRow, "zoomout", "", "Zoom out - one step wider",
                           0, ZOOM_PX);
        bZoomOut.alignment = ["left", "center"];

        var zoomBar = zoomRow.add("scrollbar", undefined, 500, 0, 1000);
        zoomBar.alignment = ["fill", "center"];
        zoomBar.minimumSize = [80, 14];
        zoomBar.preferredSize = [240, 14];
        zoomBar.maximumSize = [4000, 16];
        zoomBar.helpTip = "Zoom. Scroll the wheel here, or drag it. " +
                          "Left is wider, right is closer.";

        var bZoomIn = act(zoomRow, "zoomin", "", "Zoom in - one step closer",
                          0, ZOOM_PX);
        bZoomIn.alignment = ["right", "center"];

        // Somewhere for the keyboard to be. A ScriptUI group cannot hold the
        // focus, so the canvas can never be sent a key; a field that can
        // holds it on the canvas's behalf, and a click on the canvas parks
        // the focus here.
        //
        // It was a sliver wide at first, on the grounds that there is nothing
        // to type into it. That is exactly why the arrows did nothing: a
        // control with no room to draw itself is not reliably given the
        // focus, and a field without the focus is sent no keys. It is small
        // now rather than invisible, and it can be clicked directly.
        var keySink = zoomRow.add("edittext", undefined, "");
        keySink.alignment = ["right", "center"];
        keySink.minimumSize = [16, ZOOM_PX];
        keySink.preferredSize = [16, ZOOM_PX];
        keySink.maximumSize = [16, ZOOM_PX];
        keySink.helpTip = "Where the preview's arrow keys are heard.\n" +
                          "Click the canvas, or this box, then use the arrows\n" +
                          "to nudge the picked points. Shift goes further.";

        // One line, right under the preview, and the only one. It used to
        // take three labels to say less: a fixed hint here, a second line of
        // status at the foot of the panel, and a note drawn across the canvas
        // that still asked for a Refresh the panel now does by itself - all
        // three on screen at once, two of them wrong as often as not.
        // ------------------------------------------------------- full rows
        var full = win.add("group");
        full.orientation = "column";
        full.alignChildren = ["fill", "top"];
        full.spacing = 3;

        // The status line goes under everything, where a status line goes. It
        // used to sit between the preview and the tabs, where it read as a
        // caption on the row below it rather than as the panel talking. The
        // mark in front of it says which it is.
        var statusRow = win.add("group");
        statusRow.orientation = "row";
        statusRow.alignChildren = ["left", "center"];
        statusRow.spacing = 5;
        statusRow.margins = [TOP_PAD, 0, TOP_PAD, 2];
        var statusMark = statusRow.add("group");
        statusMark.preferredSize = [13, 13];
        statusMark.onDraw = function () {
            drawArt(this.graphics, ICON_ART.info, 0, 0, 13, [0.56, 0.56, 0.58], 1);
        };
        var status = statusRow.add("statictext", undefined,
            "                                                                      ");
        status.alignment = ["fill", "center"];
        status.preferredSize.height = 18;
        status.text = "Ready.";
        status.graphics.foregroundColor = status.graphics.newPen(
            status.graphics.PenType.SOLID_COLOR, [0.72, 0.72, 0.72, 1], 1);

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
            // Less underneath than round the rest: the status line sits
            // directly below, and the page's own padding was most of the
            // gap between the last row of buttons and it.
            t.margins = [8, 8, 8, 2];
            return t;
        }
        function tabRow(page) {
            var g = page.add("group");
            g.alignChildren = ["left", "center"];
            g.spacing = 6;
            return g;
        }

        // One button that holds a setting of two or three states, drawn
        // rather than left to a dropdown. After Effects draws a dropdown
        // itself, corners and all, so one can never match the rest of a row
        // - and at the width the top row could spare, "Selected layers" did
        // not even fit in it. The states are shown as well as said.
        function cycler(parent, w, h, name, tip, states, read, write) {
            var b = act(parent, states[0].art, name, tip);
            b.preferredSize = [w, h];
            // -1 for a setting this build does not know, which an older
            // preferences file can hand us: the next click then starts again
            // at the first state rather than landing on nothing.
            function at() {
                var v = read(), i;
                for (i = 0; i < states.length; i++) {
                    if (states[i].v === v) { return i; }
                }
                return -1;
            }
            function now() { var i = at(); return states[i < 0 ? 0 : i]; }
            function tell() {
                b.says = name + ": " + now().word + " - " + tip;
                b.helpTip = b.says;
            }
            b.onDraw = function () {
                paintLabelButton(this, ICON_ART[now().art], now().word);
            };
            b.onClick = function () {
                write(states[(at() + 1) % states.length].v);
                tell();
                repaint(this);
            };
            tell();
            return b;
        }

        var tabs = full.add("tabbedpanel");
        tabs.alignChildren = ["fill", "top"];
        // Left to itself it swells to whatever height is going, which opened a
        // hole between the actions and the two buttons under them.
        tabs.alignment = ["fill", "top"];

        // The preview is somewhere to work now, not only somewhere to pick,
        // so what it is worked with comes first and opens first.
        var tEdit = tabPage("Edit");
        var er1 = tabRow(tEdit);
        var bLasso = act(er1, "marquee", "Lasso",
                         "Drag a box round points, or draw freehand round them");
        bLasso.onDraw = function (st) {
            paintIconButton(this, P.lasso ? ICON_ART.lasso : ICON_ART.marquee, st);
        };
        var bSnap = act(er1, "snap", "Snap",
                        "Line a dragged point up with the others, and with their bounds");
        var bBox = act(er1, "box", "Transform box",
                       "Turn and scale two or more picked points together");
        // Three states on one button, the way the Lasso toggle works, with
        // the state drawn and said both. It was a dropdown, which could not
        // be given the corner radius the rest of the row has.
        var bHand2 = cycler(er1, 92, UI_H, "Handles",
            "which bezier handles the preview draws, and a handle on show can be dragged",
            [{ v: "selected", art: "handpick", word: "Picked" },
             { v: "all", art: "handall", word: "All" },
             { v: "none", art: "handnone", word: "None" }],
            function () { return P.handleView; },
            function (v) {
                P.handleView = v;
                savePrefs();
                redraw();
                setStatus(v === "none"
                    ? "Handles hidden."
                    : (v === "all"
                        ? "Every handle on show, and every one of them draggable."
                        : "The picked points' handles are on show."));
            });
        var bKey = act(er1, "key", "Keyframe",
                       "A path keyframe here, on the picked paths or on every one in view");
        var bReveal = act(er1, "reveal", "Reveal",
                          "Open those paths in the timeline, without keying anything");
        // What a path that carries keyframes is drawn in, beside the two
        // buttons that make and open them: that is when it matters which
        // paths already have some. Set it to the grey the others use and the
        // distinction goes away, which is the off switch.
        var swKey = swatch(er1, function () { return P.colKeyed; },
                           function (c) {
                               P.colKeyed = c;
                               savePrefs();
                               redraw();
                           });
        swKey.says = "Keyframed paths - the colour a path with keyframes is drawn in";
        swKey.helpTip = swKey.says;
        swKey.addEventListener("mouseover", function () { setStatus(this.says); });
        swKey.addEventListener("mouseout", function () { reportSel(); });

        bLasso.on = !!P.lasso;
        bSnap.on = !!P.snap;
        bBox.on = !!P.showBox;

        // Points only. A tangent is kept as a vector from its vertex, so a
        // handle rides along with the point it belongs to and no alignment
        // ever straightens a curve by accident.
        var er2 = tabRow(tEdit);
        var bAlnL = act(er2, "alignleft", "Align left",
                        "Bring the picked points to their left edge");
        var bAlnCX = act(er2, "aligncx", "Align centre",
                         "Bring the picked points to their middle, across");
        var bAlnR = act(er2, "alignright", "Align right",
                        "Bring the picked points to their right edge");
        var bAlnT = act(er2, "aligntop", "Align top",
                        "Bring the picked points to their top edge");
        var bAlnCY = act(er2, "aligncy", "Align middle",
                         "Bring the picked points to their middle, down");
        var bAlnB = act(er2, "alignbottom", "Align bottom",
                        "Bring the picked points to their bottom edge");


        var tPts = tabPage("Points");
        var pr1 = tabRow(tPts);
        var bCreate = act(pr1, "create", "Create", "Put a control on every picked point");
        var bHand = act(pr1, "handles", "Handles",
                        "Give the picked points bezier handles, rigging any that are not yet");
        // Repair rather than rigging, but it belongs with the buttons that
        // made the rig: this is where you come when one stops lining up.
        var bRelink = act(pr1, "relink", "Relink",
                          "Put a rig back: an expression switched off, controls on the wrong points, or a lost rig rebuilt from the controls you select");
        // Bake is Delete that keeps the animation, so it belongs beside it.
        var bBake = act(pr1, "bake", "Bake", "Keep the animation as path keyframes, drop the rig");
        // All on one row: four icons, the handle style and the button that
        // applies it come to about 324 of the panel's 380 points.
        var modeDd = cycler(pr1, 88, UI_H, "Handle style",
            "whether a point's handles are kept as masks on its own control, or " +
            "as control layers of their own. Apply converts the picked points",
            [{ v: "masks", art: "handmask", word: "Masks" },
             { v: "layers", art: "handlayer", word: "Layers" }],
            function () { return P.handleMode; },
            function (v) { P.handleMode = v; savePrefs(); });
        var bSwap = act(pr1, "apply", "Apply",
                        "Convert the picked points' handles to that style", 54);

        var tPiv = tabPage("Pivot");
        var gPiv = tabRow(tPiv);
        var bPivot = act(gPiv, "pivot", "Pivot",
                         "Drive the picked points from one layer");
        var bAddPiv = act(gPiv, "addpivot", "Add to Pivot",
                          "Select the Pivot too, then add more points to it", 84);
        var bRel = act(gPiv, "release", "Release", "Detach controls from their Pivot");
        var pivDd = cycler(gPiv, 122, UI_H, "Pivot makes",
            "Pivot only moves the points from the one layer. With points gives " +
            "each point a control of its own as well, parented to the Pivot, so " +
            "they can still be moved apart",
            [{ v: "pivot", art: "pivonly", word: "Pivot only" },
             { v: "points", art: "pivpts", word: "With points" }],
            function () { return P.pivotMode; },
            function (v) { P.pivotMode = v; savePrefs(); });

        var tFol = tabPage("Follow");
        var gFol = tabRow(tFol);
        var bFol = act(gFol, "follower", "Follower", "Attach the selected layers to the picked path");
        var bAvg = act(gFol, "average", "Average", "One follower at the centre of the picked points");

        tabs.selection = 0;


        function setStatus(s) {
            state.status = String(s);
            try { status.text = s; } catch (e) {}
        }

        // Writing the strip's value must not read back as the user turning
        // it, or a fit would fight the zoom it just set.
        var barEcho = false;

        function syncZoomBar() {
            barEcho = true;
            try { zoomBar.value = barFromZoom(state.view.s); } catch (e) {}
            barEcho = false;
        }

        function zoomFromStrip() {
            if (barEcho) { return; }
            var want = zoomFromBar(zoomBar.value);
            if (!(want > 0)) { return; }
            // The pointer is on the strip, not on the artwork, so the middle
            // of the canvas is what stays put.
            var w = Math.max(60, cv.size.width), h = Math.max(60, cv.size.height);
            if (zoomAt(w / 2, h / 2, want / state.view.s)) { redraw(); }
        }

        zoomBar.onChanging = zoomFromStrip;
        zoomBar.onChange = zoomFromStrip;

        // One step is a tenth of the strip, which is a little under 3x.
        function stepZoom(by) {
            barEcho = true;
            try { zoomBar.value = Math.max(0, Math.min(ZOOM_STEPS, zoomBar.value + by)); }
            catch (e) {}
            barEcho = false;
            zoomFromStrip();
        }
        bZoomOut.onClick = function () { stepZoom(-ZOOM_STEPS / 10); };
        bZoomIn.onClick = function () { stepZoom(ZOOM_STEPS / 10); };

        function redraw() {
            try { cv.notify("onDraw"); } catch (e) {
                try { win.layout.layout(true); } catch (e2) {}
            }
        }

        // ------------------------------------------------------- rendering
        cv.onDraw = function () {
            var g = this.graphics;
            var w = this.size.width, h = this.size.height;
            // Outside the composition is darker than inside it, and the step
            // between the two is the whole of how the frame is shown. There
            // was a line round it as well, which read as a second border
            // inside the preview's own; the tones alone still say whether a
            // point has wandered off the comp or is simply near its edge.
            var outside = g.newBrush(g.BrushType.SOLID_COLOR, [0.095, 0.095, 0.1, 1]);
            // Square underneath, so nothing is left unpainted whatever the
            // host would otherwise show there, and rounded over it. The two
            // greys are close enough that the corners left behind do not
            // read; the border drawn last is what the eye follows.
            g.newPath();
            g.rectPath(0, 0, w, h);
            g.fillPath(outside);
            roundRectPath(g, 0.5, 0.5, w - 1, h - 1, BTN_RADIUS);
            g.fillPath(outside);

            var comp = activeComp();
            if (comp) {
                var a = toCanvas([0, 0]), b = toCanvas([comp.width, comp.height]);
                var cx = Math.min(a[0], b[0]), cy = Math.min(a[1], b[1]);
                var cw = Math.abs(b[0] - a[0]), chh = Math.abs(b[1] - a[1]);
                var inside = g.newBrush(g.BrushType.SOLID_COLOR, [0.165, 0.165, 0.172, 1]);
                g.newPath();
                g.rectPath(cx, cy, cw, chh);
                g.fillPath(inside);
            }

            var pathPen = g.newPen(g.PenType.SOLID_COLOR, [0.62, 0.62, 0.62, 1], 1);
            // A path with keyframes on it, in whatever colour the Edit tab
            // was given. Set it to the grey above and the distinction goes
            // away, which is the off switch.
            var keyPen = g.newPen(g.PenType.SOLID_COLOR,
                [P.colKeyed[0], P.colKeyed[1], P.colKeyed[2], 1], 1);
            var leashPen = g.newPen(g.PenType.SOLID_COLOR,
                [P.colHandle[0], P.colHandle[1], P.colHandle[2], 1], 1);
            var handBrush = g.newBrush(g.BrushType.SOLID_COLOR,
                [P.colHandle[0], P.colHandle[1], P.colHandle[2], 1]);
            var handRing = g.newPen(g.PenType.SOLID_COLOR,
                [P.colHandle[0], P.colHandle[1], P.colHandle[2], 1], 1.5);
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
                var gm = dispGeom(i);
                if (!gm) { continue; }
                var pen = gm.prim ? ghostPen
                        : (gm.foreign ? foreignPen
                        : (gm.keyed ? keyPen : pathPen));
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
                var ikey = state.items[i].key;
                var sel = state.sel[ikey] || [];

                // Handles: every one, only the picked points', or none at
                // all. A tip the rig drives is drawn hollow, so a handle that
                // answers to a control layer still reads as one. A handle
                // that has been picked itself is drawn like a picked point,
                // and stays on show even when its own point is let go - or
                // it would be picked with nothing to say so.
                if (P.handleView !== "none" && !gm.prim) {
                    for (k = 0; k < gm.tips.length; k++) {
                        var tp = gm.tips[k];
                        var tipOn = tipPicked(ikey, tp.i, tp.side);
                        if (!tipShown(ikey, sel, tp)) { continue; }
                        p = toCanvas(tp.a);
                        q = toCanvas(tp.b);
                        g.newPath();
                        g.moveTo(p[0], p[1]);
                        g.lineTo(q[0], q[1]);
                        g.strokePath(leashPen);
                        var tr = tipOn ? 4 : 2.5;
                        g.newPath();
                        g.ellipsePath(q[0] - tr, q[1] - tr, tr * 2, tr * 2);
                        if (tipOn) {
                            g.fillPath(dotSel);
                            g.newPath();
                            g.ellipsePath(q[0] - tr, q[1] - tr, tr * 2, tr * 2);
                            g.strokePath(edge);
                        } else if (tp.ctl === "free" || tp.ctl === "bound") {
                            g.fillPath(handBrush);
                        } else {
                            g.strokePath(handRing);
                        }
                    }
                }
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
                var mp = g.newPen(g.PenType.SOLID_COLOR, [1, 0.92, 0.25, 1], 1);
                if (d.lasso && d.lasso.length > 1) {
                    g.newPath();
                    g.moveTo(d.lasso[0][0], d.lasso[0][1]);
                    for (k = 1; k < d.lasso.length; k++) {
                        g.lineTo(d.lasso[k][0], d.lasso[k][1]);
                    }
                    // Closed on screen as well as in the test, so what it
                    // will take in is what it looks like it will take in.
                    g.lineTo(d.lasso[0][0], d.lasso[0][1]);
                    g.strokePath(mp);
                } else {
                    var x0 = Math.min(d.x0, d.x1), y0 = Math.min(d.y0, d.y1);
                    g.newPath();
                    g.rectPath(x0, y0, Math.abs(d.x1 - d.x0), Math.abs(d.y1 - d.y0));
                    g.strokePath(mp);
                }
            }

            // A line all the way across, through whatever the drag lined up
            // with: without it a snap is a mystery jump of a pixel or two.
            if (state.edit && (state.edit.snapX !== null || state.edit.snapY !== null)) {
                var gp = g.newPen(g.PenType.SOLID_COLOR, [0.95, 0.35, 0.45, 1], 1);
                if (state.edit.snapX !== null) {
                    var gx = toCanvas([state.edit.snapX, 0])[0];
                    g.newPath();
                    g.moveTo(gx, 0);
                    g.lineTo(gx, h);
                    g.strokePath(gp);
                }
                if (state.edit.snapY !== null) {
                    var gy = toCanvas([0, state.edit.snapY])[1];
                    g.newPath();
                    g.moveTo(0, gy);
                    g.lineTo(w, gy);
                    g.strokePath(gp);
                }
            }

            // The transform box, round the picked points and not their
            // handles - the bounds of what would turn, which is what the
            // reference it is modelled on draws too.
            var boxPen = g.newPen(g.PenType.SOLID_COLOR, [0.35, 0.62, 1, 1], 1);
            var turning = state.edit && state.edit.kind === "rotate" && state.edit.box;
            if (turning) {
                // Mid-turn the box goes round with the points. Its own
                // upright bounds would swell and shrink as they swing, which
                // reads as the selection changing size when it is only
                // turning.
                var tb = state.edit.box, tm = state.edit.mat, tc = state.edit.centre;
                var corner = [[tb.minx, tb.miny], [tb.maxx, tb.miny],
                              [tb.maxx, tb.maxy], [tb.minx, tb.maxy]];
                g.newPath();
                for (k = 0; k <= 4; k++) {
                    var cp = toCanvas(xformPt(tm, tc, corner[k % 4]));
                    if (k === 0) { g.moveTo(cp[0], cp[1]); } else { g.lineTo(cp[0], cp[1]); }
                }
                g.strokePath(boxPen);
            }
            var bx = turning ? null : boxOn();
            if (bx) {
                var turnPen = g.newPen(g.PenType.SOLID_COLOR, [0.3, 0.52, 0.86, 1], 1);
                var turnFill = g.newBrush(g.BrushType.SOLID_COLOR, [0.3, 0.52, 0.86, 1]);
                var cor = [[bx.x0, bx.y0, -1, -1], [bx.x1, bx.y0, 1, -1],
                           [bx.x1, bx.y1, 1, 1], [bx.x0, bx.y1, -1, 1]];
                for (k = 0; k < cor.length; k++) {
                    turnArc(g, turnPen, turnFill, cor[k][0], cor[k][1], cor[k][2], cor[k][3]);
                }
                g.newPath();
                g.rectPath(bx.x0, bx.y0, bx.x1 - bx.x0, bx.y1 - bx.y0);
                g.strokePath(boxPen);
                var knobs = boxKnobs(bx);
                var knobFill = g.newBrush(g.BrushType.SOLID_COLOR, [0.98, 0.98, 1, 1]);
                for (k = 0; k < knobs.length; k++) {
                    g.newPath();
                    g.rectPath(knobs[k].x - KNOB, knobs[k].y - KNOB, KNOB * 2, KNOB * 2);
                    g.fillPath(knobFill);
                    g.newPath();
                    g.rectPath(knobs[k].x - KNOB, knobs[k].y - KNOB, KNOB * 2, KNOB * 2);
                    g.strokePath(boxPen);
                }
            }

            // Last, so it sits over anything that reached the edge: the same
            // rounded rectangle the buttons are drawn with, round the whole
            // preview.
            roundRectPath(g, 0.5, 0.5, w - 1, h - 1, BTN_RADIUS);
            g.strokePath(g.newPen(g.PenType.SOLID_COLOR,
                [CV_LINE[0], CV_LINE[1], CV_LINE[2], 1], 1));
        };

        // --------------------------------------------------- point picking
        function nearestVertex(cx, cy, maxDist) {
            var best = null, bestD = maxDist * maxDist;
            for (var i = 0; i < state.geom.length; i++) {
                var gm = dispGeom(i);
                if (!gm) { continue; }
                for (var k = 0; k < gm.verts.length; k++) {
                    var p = toCanvas(gm.verts[k]);
                    var d = (p[0] - cx) * (p[0] - cx) + (p[1] - cy) * (p[1] - cy);
                    if (d <= bestD) { bestD = d; best = { key: state.items[i].key, idx: k }; }
                }
            }
            return best;
        }

        // The nearest path to the pointer, measured against the curve the
        // panel actually drew rather than its vertices - in whole-path mode
        // you aim at the line, not at a point on it. The flattened path is
        // stored one bezier segment at a time, so the joins between chunks
        // are not treated as line segments of their own.
        function pathDist2(gm, cx, cy) {
            var per = FLATTEN + 1, best = -1, seg, k, at, d;
            for (seg = 0; seg * per < gm.poly.length; seg++) {
                for (k = 0; k + 1 < per; k++) {
                    at = seg * per + k;
                    if (at + 1 >= gm.poly.length) { break; }
                    d = segDist2(toCanvas(gm.poly[at]), toCanvas(gm.poly[at + 1]), cx, cy);
                    if (best < 0 || d < best) { best = d; }
                }
            }
            return best;
        }

        function nearestPath(cx, cy, maxDist) {
            var best = null, bestD = maxDist * maxDist, i, gm, d;
            for (i = 0; i < state.geom.length; i++) {
                gm = dispGeom(i);
                if (!gm || !gm.poly || !gm.poly.length) { continue; }
                d = pathDist2(gm, cx, cy);
                if (d >= 0 && d <= bestD) { bestD = d; best = { key: state.items[i].key, i: i }; }
            }
            return best;
        }

        // A path is either wholly picked or not picked at all, so there is
        // never a half-picked path to reason about anywhere downstream.
        function wholePicked(key, gm) {
            var cur = state.sel[key] || [];
            return gm && gm.verts.length > 0 && cur.length === gm.verts.length;
        }

        function pickWholePath(hit, additive) {
            var gm = state.geom[hit.i];
            var full = wholePicked(hit.key, gm);
            if (!additive) { clearSel(); }
            if (additive && full) {
                delete state.sel[hit.key];
                delete state.selH[hit.key];
                return;
            }
            state.sel[hit.key] = allIdxOf(gm);
        }

        // What is on screen: the preview while a drag is in hand, otherwise
        // what was read from the composition.
        function dispGeom(i) {
            var it = state.items[i];
            if (it && state.preview && state.preview[it.key]) { return state.preview[it.key]; }
            return state.geom[i];
        }

        function geomMap() {
            var out = {}, i;
            for (i = 0; i < state.items.length; i++) {
                if (state.geom[i]) { out[state.items[i].key] = state.geom[i]; }
            }
            return out;
        }

        function dispMap() {
            var out = {}, i;
            for (i = 0; i < state.items.length; i++) {
                var gm = dispGeom(i);
                if (gm) { out[state.items[i].key] = gm; }
            }
            return out;
        }

        function itemByKey(key) {
            for (var i = 0; i < state.items.length; i++) {
                if (state.items[i].key === key) { return state.items[i]; }
            }
            return null;
        }

        // Whether a tip is on screen, and so whether it can be clicked or
        // swept up: what the Handles setting hides cannot be picked. Drawing,
        // hit-testing and the marquee all ask this one question, or they
        // would disagree about what is there.
        function tipWasShown(selPts, selTips, tp) {
            if (P.handleView === "none") { return false; }
            if (P.handleView === "all") { return true; }
            return has(selTips || [], tipName(tp.i, tp.side)) ||
                   has(selPts || [], tp.i);
        }

        function tipShown(key, sel, tp) {
            return tipWasShown(sel, state.selH[key], tp);
        }

        // A handle tip, if the setting has it on show. Tips are tried before
        // points: a tip sits further from the curve, so it is the one the
        // pointer meant when both are under it.
        function nearestTip(cx, cy, maxDist) {
            if (P.handleView === "none") { return null; }
            var best = null, bestD = maxDist * maxDist, i, k;
            for (i = 0; i < state.geom.length; i++) {
                var gm = dispGeom(i);
                if (!gm || gm.prim || gm.foreign) { continue; }
                var key = state.items[i].key;
                var sel = state.sel[key] || [];
                for (k = 0; k < gm.tips.length; k++) {
                    var tp = gm.tips[k];
                    if (!tipShown(key, sel, tp)) { continue; }
                    var p = toCanvas(tp.b);
                    var d = (p[0] - cx) * (p[0] - cx) + (p[1] - cy) * (p[1] - cy);
                    if (d <= bestD) { bestD = d; best = { key: key, gi: i, tip: tp }; }
                }
            }
            return best;
        }

        // ------------------------------------------------- the transform box
        var KNOB = 3.5, KNOB_HIT = 7, ROT_RING = 18, ROT_ARC = 14;

        function selBounds() { return boundsOfPicks(currentPicks(), dispMap()); }

        function boxOn() {
            if (!P.showBox) { return null; }
            var b = selBounds();
            if (!b || b.n < 2) { return null; }
            var a = toCanvas([b.minx, b.miny]), c = toCanvas([b.maxx, b.maxy]);
            b.x0 = Math.min(a[0], c[0]); b.y0 = Math.min(a[1], c[1]);
            b.x1 = Math.max(a[0], c[0]); b.y1 = Math.max(a[1], c[1]);
            // A selection on one line has no width or height to pull on, so
            // the knobs along that side are not offered.
            b.flatX = (b.x1 - b.x0) < 1.5;
            b.flatY = (b.y1 - b.y0) < 1.5;
            return b;
        }

        function boxKnobs(b) {
            var mx = (b.x0 + b.x1) / 2, my = (b.y0 + b.y1) / 2, out = [];
            function put(k, x, y) {
                if ((k === "n" || k === "s") && b.flatY) { return; }
                if ((k === "e" || k === "w") && b.flatX) { return; }
                if (k.length === 2 && (b.flatX || b.flatY)) { return; }
                out.push({ k: k, x: x, y: y });
            }
            put("nw", b.x0, b.y0); put("n", mx, b.y0); put("ne", b.x1, b.y0);
            put("e", b.x1, my); put("se", b.x1, b.y1); put("s", mx, b.y1);
            put("sw", b.x0, b.y1); put("w", b.x0, my);
            return out;
        }

        // The band that turns the box had nothing to show for itself, so each
        // corner wears a quarter arc drawn inside it: far enough out to clear
        // the rectangle knobAt refuses, well within the ring it accepts, so
        // what is drawn is what can be taken hold of. ox and oy point away
        // from the box; the head goes on whichever end makes all four read
        // the same way round.
        function turnArc(g, pen, brush, cx, cy, ox, oy) {
            var n = 8, i, a, px, py;
            g.newPath();
            for (i = 0; i <= n; i++) {
                a = (Math.PI / 2) * (i / n);
                px = cx + ox * ROT_ARC * Math.cos(a);
                py = cy + oy * ROT_ARC * Math.sin(a);
                if (i === 0) { g.moveTo(px, py); } else { g.lineTo(px, py); }
            }
            g.strokePath(pen);
            var hx, hy, dx, dy;
            if (ox * oy > 0) { hx = cx; hy = cy + oy * ROT_ARC; dx = -ox; dy = 0; }
            else { hx = cx + ox * ROT_ARC; hy = cy; dx = 0; dy = -oy; }
            var nx = -dy, ny = dx;
            g.newPath();
            g.moveTo(hx + dx * 4.5, hy + dy * 4.5);
            g.lineTo(hx - dx * 1.5 + nx * 3, hy - dy * 1.5 + ny * 3);
            g.lineTo(hx - dx * 1.5 - nx * 3, hy - dy * 1.5 - ny * 3);
            g.closePath();
            g.fillPath(brush);
        }

        // A knob under the pointer, or the ring just outside a corner, which
        // is where a turn is taken hold of.
        function knobAt(b, cx, cy) {
            var ks = boxKnobs(b), i, k, d;
            for (i = 0; i < ks.length; i++) {
                k = ks[i];
                if (Math.abs(k.x - cx) <= KNOB_HIT && Math.abs(k.y - cy) <= KNOB_HIT) {
                    return { k: k.k, turn: false };
                }
            }
            var pad = KNOB_HIT + 1;
            if (cx >= b.x0 - pad && cx <= b.x1 + pad && cy >= b.y0 - pad && cy <= b.y1 + pad) {
                return null;
            }
            var corners = [["nw", b.x0, b.y0], ["ne", b.x1, b.y0],
                           ["se", b.x1, b.y1], ["sw", b.x0, b.y1]];
            for (i = 0; i < corners.length; i++) {
                d = Math.sqrt((corners[i][1] - cx) * (corners[i][1] - cx) +
                              (corners[i][2] - cy) * (corners[i][2] - cy));
                if (d <= ROT_RING) { return { k: corners[i][0], turn: true }; }
            }
            return null;
        }

        // Which corner stays put while a knob is pulled, and which way each
        // axis is free to go.
        function scaleFrame(knob, b, fromCentre) {
            var east = knob.indexOf("e") >= 0, west = knob.indexOf("w") >= 0;
            var north = knob.indexOf("n") >= 0, south = knob.indexOf("s") >= 0;
            var f = { ax: (b.minx + b.maxx) / 2, ay: (b.miny + b.maxy) / 2,
                      gx: 0, gy: 0, doX: east || west, doY: north || south };
            f.gx = east ? b.maxx : (west ? b.minx : f.ax);
            f.gy = south ? b.maxy : (north ? b.miny : f.ay);
            if (!fromCentre) {
                f.ax = east ? b.minx : (west ? b.maxx : f.ax);
                f.ay = south ? b.miny : (north ? b.maxy : f.ay);
            }
            return f;
        }

        function scaleMat(f, cur, uniform) {
            var sx = 1, sy = 1, dx = f.gx - f.ax, dy = f.gy - f.ay;
            if (f.doX && Math.abs(dx) > 1e-6) { sx = (cur[0] - f.ax) / dx; }
            if (f.doY && Math.abs(dy) > 1e-6) { sy = (cur[1] - f.ay) / dy; }
            if (uniform && f.doX && f.doY) {
                var s = (Math.abs(sx) > Math.abs(sy)) ? sx : sy;
                sx = (sx < 0 ? -1 : 1) * Math.abs(s);
                sy = (sy < 0 ? -1 : 1) * Math.abs(s);
            }
            return [sx, 0, 0, sy, 0, 0];
        }

        function rotMat(a) {
            var c = Math.cos(a), s = Math.sin(a);
            return [c, s, -s, c, 0, 0];
        }

        // ------------------------------------------------------- snapping
        // Gathered once, from what is not moving. A path whose every point is
        // picked offers nothing: its bounds are going with the drag.
        function snapCands() {
            var xs = [], ys = [], i, k;
            for (i = 0; i < state.geom.length; i++) {
                var gm = state.geom[i];
                if (!gm) { continue; }
                var sel = state.sel[state.items[i].key] || [];
                var b = null, free = 0;
                for (k = 0; k < gm.verts.length; k++) {
                    var p = gm.verts[k];
                    if (!b) { b = [p[0], p[1], p[0], p[1]]; }
                    if (p[0] < b[0]) { b[0] = p[0]; }
                    if (p[1] < b[1]) { b[1] = p[1]; }
                    if (p[0] > b[2]) { b[2] = p[0]; }
                    if (p[1] > b[3]) { b[3] = p[1]; }
                    if (has(sel, k)) { continue; }
                    free++;
                    xs.push(p[0]);
                    ys.push(p[1]);
                }
                if (b && free) {
                    xs.push(b[0], (b[0] + b[2]) / 2, b[2]);
                    ys.push(b[1], (b[1] + b[3]) / 2, b[3]);
                }
            }
            return { xs: xs, ys: ys };
        }

        function snapProbes(b) {
            if (!b) { return { xs: [], ys: [] }; }
            if (b.n === 1) { return { xs: [b.minx], ys: [b.miny] }; }
            return { xs: [b.minx, (b.minx + b.maxx) / 2, b.maxx],
                     ys: [b.miny, (b.miny + b.maxy) / 2, b.maxy] };
        }

        // -------------------------------------------------------- dragging
        function wantsZoom(ev) { return !!ev.ctrlKey || !!ev.metaKey; }

        // Alt and the middle or right button all pan, because which of them
        // a tablet or a trackpad can send is not something the panel can know.
        function wantsPan(ev) {
            return !!ev.altKey || ev.button === 1 || ev.button === 2;
        }

        // Where the curve of one point sits now, as vectors in composition
        // pixels, and whether the two sides are in line - a point whose
        // handles are collinear is a smooth one, and dragging one side turns
        // the other with it the way every vector editor does.
        function tipPair(gm, idx) {
            var a = tipVec(gm, idx, "in"), b = tipVec(gm, idx, "out");
            var smooth = false;
            if (a && b) {
                var la = Math.sqrt(a[0] * a[0] + a[1] * a[1]);
                var lb = Math.sqrt(b[0] * b[0] + b[1] * b[1]);
                if (la > 1e-6 && lb > 1e-6) {
                    var cross = (a[0] * b[1] - a[1] * b[0]) / (la * lb);
                    var dot = (a[0] * b[0] + a[1] * b[1]) / (la * lb);
                    smooth = (Math.abs(cross) < 0.035 && dot < 0);
                }
            }
            return { "in": a, out: b, smooth: smooth };
        }

        function snapTo45(v) {
            var a = Math.atan2(v[1], v[0]);
            var step = Math.PI / 4;
            a = Math.round(a / step) * step;
            var len = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
            return [Math.cos(a) * len, Math.sin(a) * len];
        }

        // The per-vertex edit a drag in hand is asking for. The preview and
        // the commit both read it, so what is seen is what is written.
        // Everything picked, carried by one composition-space delta: the
        // points, and any handle tip picked in its own right.
        //
        // A tip whose own point is moving too needs no edit of its own. Both
        // ends travel the same distance, so the tangent between them is
        // unchanged - and saying nothing about it means a rigged handle's
        // control layer is left alone rather than written with the value it
        // already has. Only a tip left behind by its point bends the curve.
        function moveEdits(base, d) {
            var out = [], i, k;
            for (i = 0; i < state.items.length; i++) {
                var item = state.items[i];
                var gm = base[item.key];
                if (!gm) { continue; }
                var pts = state.sel[item.key] || [];
                var tips = state.selH[item.key] || [];
                var byIdx = {}, order = [];
                for (k = 0; k < pts.length; k++) {
                    var at = gm.verts[pts[k]];
                    if (!at) { continue; }
                    byIdx[pts[k]] = { item: item, i: pts[k],
                                      pt: [at[0] + d[0], at[1] + d[1]] };
                    order.push(pts[k]);
                }
                for (k = 0; k < tips.length; k++) {
                    var bits = String(tips[k]).split(":");
                    var ix = Number(bits[0]), side = bits[1];
                    if (has(pts, ix)) { continue; }
                    var v = tipVec(gm, ix, side);
                    if (!v) { continue; }
                    if (!byIdx[ix]) { byIdx[ix] = { item: item, i: ix }; order.push(ix); }
                    if (side === "in") { byIdx[ix].ti = [v[0] + d[0], v[1] + d[1]]; }
                    else { byIdx[ix].to = [v[0] + d[0], v[1] + d[1]]; }
                }
                for (k = 0; k < order.length; k++) { out.push(byIdx[order[k]]); }
            }
            return out;
        }

        // The transform box takes the points and brings their handles along
        // through the same map, so a turned selection keeps its curve. Which
        // handles happen to be picked makes no difference here, and nor does
        // a picked handle stretch the box: the bounds are the points'.
        function boxEdits(ed) {
            var m = ed.mat, c = ed.centre;
            return editsFor(ed.picks, ed.base, function (at, gm, i) {
                var e = { pt: xformPt(m, c, at) };
                var a = tipVec(gm, i, "in"), b = tipVec(gm, i, "out");
                if (a) { e.ti = mVec(m, a); }
                if (b) { e.to = mVec(m, b); }
                return e;
            });
        }

        function tipEdits(ed) {
            var e = { item: ed.tip.item, i: ed.tip.idx };
            if (ed.sides["in"]) { e.ti = ed.sides["in"]; }
            if (ed.sides.out) { e.to = ed.sides.out; }
            return [e];
        }

        function editsOf(ed) {
            if (ed.kind === "move") { return moveEdits(ed.base, ed.d); }
            if (ed.kind === "tip") { return tipEdits(ed); }
            if (ed.mat) { return boxEdits(ed); }
            return [];
        }

        function partsWith(gm, list) {
            var p = shapeParts(gm.raw), n, e, v;
            for (n = 0; n < list.length; n++) {
                e = list[n];
                if (e.i < 0 || e.i >= p.v.length) { continue; }
                if (e.pt) { v = mPt(gm.minv, e.pt); p.v[e.i] = [v[0], v[1]]; }
                if (e.ti) { v = mVec(gm.minv, e.ti); p.i[e.i] = [v[0], v[1]]; }
                if (e.to) { v = mVec(gm.minv, e.to); p.o[e.i] = [v[0], v[1]]; }
            }
            return partsToShape(p);
        }

        // Rebuild what the canvas shows from the shapes read at the press,
        // with the pending edit applied. Nothing is written to the project
        // until the button comes up, and the preview is built from the very
        // same edit list that will be written - so what is seen is what lands.
        function buildPreview(ed) {
            ed.edits = editsOf(ed);
            var byKey = {}, out = {}, i, k;
            for (i = 0; i < ed.edits.length; i++) {
                k = ed.edits[i].item.key;
                if (!byKey[k]) { byKey[k] = []; }
                byKey[k].push(ed.edits[i]);
            }
            for (i = 0; i < state.items.length; i++) {
                var item = state.items[i];
                var gm = ed.base[item.key];
                if (!gm || !byKey[item.key]) { continue; }
                out[item.key] = geomFrom(gm, partsWith(gm, byKey[item.key]));
            }
            state.preview = out;
        }

        function startEdit(kind, ev) {
            var picks = currentPicks();
            var base = geomMap();
            var ed = { kind: kind, x0: ev.clientX, y0: ev.clientY,
                       at: toComp([ev.clientX, ev.clientY]),
                       picks: picks, base: base, d: [0, 0], mat: null,
                       snapX: null, snapY: null, moved: false };
            if (kind !== "tip") {
                ed.box = boundsOfPicks(picks, base);
                ed.cands = P.snap ? snapCands() : { xs: [], ys: [] };
                ed.probes = snapProbes(ed.box);
            }
            return ed;
        }

        function dragMove(ed, ev) {
            var dx = (ev.clientX - ed.x0) / state.view.s;
            var dy = (ev.clientY - ed.y0) / state.view.s;
            // Shift is read as the drag runs, not when it began: at the
            // press it still means "add to the selection".
            if (ev.shiftKey) {
                if (Math.abs(dx) >= Math.abs(dy)) { dy = 0; } else { dx = 0; }
            }
            ed.snapX = null;
            ed.snapY = null;
            if (P.snap && !wantsZoom(ev)) {
                var sx = snapAxis(ed.probes.xs, ed.cands.xs, dx, state.view.s, P.snapPx);
                var sy = snapAxis(ed.probes.ys, ed.cands.ys, dy, state.view.s, P.snapPx);
                if (!ev.shiftKey || dx !== 0) { dx = sx.d; ed.snapX = sx.at; }
                if (!ev.shiftKey || dy !== 0) { dy = sy.d; ed.snapY = sy.at; }
            }
            ed.d = [dx, dy];
            ed.moved = true;
        }

        function dragBox(ed, ev) {
            var cur = toComp([ev.clientX, ev.clientY]);
            ed.snapX = null;
            ed.snapY = null;
            if (ed.kind === "rotate") {
                var a0 = Math.atan2(ed.at[1] - ed.centre[1], ed.at[0] - ed.centre[0]);
                var a1 = Math.atan2(cur[1] - ed.centre[1], cur[0] - ed.centre[0]);
                var da = a1 - a0;
                if (ev.shiftKey) {
                    var step = Math.PI / 12;
                    da = Math.round(da / step) * step;
                }
                ed.angle = da;
                ed.mat = rotMat(da);
            } else {
                var f = scaleFrame(ed.knob, ed.box, !!ev.altKey);
                // The edge being pulled lines up with the same things a
                // dragged point would, and on the axes it is free to move on.
                if (P.snap && !wantsZoom(ev)) {
                    var sx, sy;
                    if (f.doX) {
                        sx = snapAxis([cur[0]], ed.cands.xs, 0, state.view.s, P.snapPx);
                        cur[0] += sx.d;
                        ed.snapX = sx.at;
                    }
                    if (f.doY) {
                        sy = snapAxis([cur[1]], ed.cands.ys, 0, state.view.s, P.snapPx);
                        cur[1] += sy.d;
                        ed.snapY = sy.at;
                    }
                }
                ed.centre = [f.ax, f.ay];
                ed.mat = scaleMat(f, cur, !!ev.shiftKey);
            }
            ed.moved = true;
        }

        function dragTip(ed, ev) {
            var cur = toComp([ev.clientX, ev.clientY]);
            var t = ed.tip;
            var v = [cur[0] - t.at[0], cur[1] - t.at[1]];
            if (ev.shiftKey) { v = snapTo45(v); }
            var sides = {};
            sides[t.side] = v;
            // A smooth point keeps its sides opposite unless the drag says
            // otherwise. Command or Control, held as it runs, breaks them.
            var other = (t.side === "in") ? "out" : "in";
            if (ed.pair.smooth && ed.pair[other] && !wantsZoom(ev)) {
                var o = ed.pair[other];
                var lo = Math.sqrt(o[0] * o[0] + o[1] * o[1]);
                var lv = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
                if (lv > 1e-6) { sides[other] = [-v[0] / lv * lo, -v[1] / lv * lo]; }
            }
            ed.sides = sides;
            ed.moved = true;
        }

        function sayDrag(ed) {
            if (ed.kind === "rotate") {
                setStatus("Turn " + (Math.round(ed.angle * 1800 / Math.PI) / 10) +
                          " degrees. Shift steps by 15.");
                return;
            }
            if (ed.kind === "scale") {
                setStatus("Scale " + Math.round(ed.mat[0] * 100) + "% by " +
                          Math.round(ed.mat[3] * 100) + "%. Shift keeps it even, Alt works from the centre.");
                return;
            }
            if (ed.kind === "tip") {
                setStatus("Reshaping the curve. Shift holds the angle, Command or Control breaks the pair.");
                return;
            }
            var bits = "Move " + (Math.round(ed.d[0] * 10) / 10) + ", " +
                       (Math.round(ed.d[1] * 10) / 10) + " px";
            if (ed.snapX !== null || ed.snapY !== null) { bits += " - snapped"; }
            setStatus(bits + ". Shift holds one axis.");
        }

        function commitEdit(ed) {
            if (!ed.moved) {
                // A press on one of several picked points, let go without
                // moving, means that one and no longer the rest.
                if (ed.hit && countSel() + countSelH() > 1) {
                    clearSel();
                    selOf(ed.hit.key).push(ed.hit.idx);
                    pushPicks();
                    reportSel();
                }
                return;
            }
            if (ed.kind === "move" && !ed.d[0] && !ed.d[1]) { return; }
            var edits = ed.edits || editsOf(ed);
            if (!edits.length) { return; }
            runEdits(ed.title || "Move points", ed.picks, edits,
                     (ed.kind === "move") ? ed.d : null);
        }

        cv.addEventListener("mousedown", function (ev) {
            // Bring the keyboard with the pointer, so an arrow key nudges the
            // points that were just picked.
            try { keySink.active = true; } catch (eFocus) {}
            // A double click on empty canvas is the way back to a fit, now
            // that the view can be moved by hand. On a vertex it is left
            // alone, so two clicks there still just pick and unpick.
            if (ev.detail >= 2 && !nearestVertex(ev.clientX, ev.clientY, 10) &&
                !nearestTip(ev.clientX, ev.clientY, 8)) {
                state.drag = null;
                state.edit = null;
                state.preview = null;
                fitView(Math.max(60, cv.size.width), Math.max(60, cv.size.height));
                syncZoomBar();
                redraw();
                setStatus("Framed everything in view.");
                return;
            }
            var zoom = wantsZoom(ev);
            var pan = !zoom && wantsPan(ev);
            state.edit = null;
            state.preview = null;

            // Moving the view wins over everything, or Alt-dragging near
            // artwork would drag the artwork instead of the canvas.
            if (!zoom && !pan) {
                var ed = null;

                // Shift on a handle adds it or lets it go, and starts no
                // drag; that is settled on the way up, the way a point is.
                // Handles belong to a point, and whole-path picking has no
                // notion of one, so they are not in play while it is on.
                var hitTip = (ev.shiftKey || P.pickPath)
                    ? null : nearestTip(ev.clientX, ev.clientY, 8);
                if (hitTip) {
                    var tgm = state.geom[hitTip.gi];
                    var tI = hitTip.tip.i, tS = hitTip.tip.side;
                    if (!tipPicked(hitTip.key, tI, tS)) {
                        clearSel();
                        selHOf(hitTip.key).push(tipName(tI, tS));
                        reportSel();
                    }
                    // On its own, a handle is dragged for its own sake, with
                    // the pair kept opposite and the angle holdable. Picked
                    // alongside anything else, it travels with the rest
                    // instead - one delta, rigidly, points and handles alike.
                    if (countSel() + countSelH() > 1) {
                        ed = startEdit("move", ev);
                        ed.title = "Move points";
                    } else {
                        ed = startEdit("tip", ev);
                        ed.title = "Reshape the curve";
                        ed.tip = { key: hitTip.key, item: itemByKey(hitTip.key), gm: tgm,
                                   idx: tI, side: tS, at: tgm.verts[tI] };
                        ed.pair = tipPair(tgm, tI);
                        ed.sides = {};
                    }
                }

                var b = null;
                if (!ed) {
                    b = boxOn();
                    var kn = b ? knobAt(b, ev.clientX, ev.clientY) : null;
                    if (kn) {
                        ed = startEdit(kn.turn ? "rotate" : "scale", ev);
                        ed.title = kn.turn ? "Turn points" : "Scale points";
                        ed.knob = kn.k;
                        ed.centre = [(b.minx + b.maxx) / 2, (b.miny + b.maxy) / 2];
                        ed.mat = mId();
                        ed.angle = 0;
                    }
                }

                if (!ed && P.pickPath) {
                    // Aim at the curve rather than at a vertex: in this mode
                    // there is no vertex to aim at, and a long path can run
                    // a long way between two of them.
                    var hitP = nearestPath(ev.clientX, ev.clientY, 7);
                    if (hitP && !ev.shiftKey) {
                        if (!wholePicked(hitP.key, state.geom[hitP.i])) {
                            pickWholePath(hitP, false);
                            pushPicks();
                            reportSel();
                        }
                        ed = startEdit("move", ev);
                        ed.title = "Move path";
                    }
                }

                if (!ed && !P.pickPath) {
                    var hit = nearestVertex(ev.clientX, ev.clientY, 10);
                    // Shift on a point still means pick-and-unpick, and
                    // starts no drag; that is settled on the way up.
                    if (hit && !ev.shiftKey) {
                        var already = has(state.sel[hit.key] || [], hit.idx);
                        if (!already) {
                            clearSel();
                            selOf(hit.key).push(hit.idx);
                            pushPicks();
                            reportSel();
                        }
                        ed = startEdit("move", ev);
                        ed.title = "Move points";
                        ed.hit = hit;
                    }
                }

                // Inside the box, on nothing in particular: that is a press
                // on the selection itself, and it moves it. The knobs round
                // the edge scale and turn; the middle had been doing nothing
                // but starting a new marquee over the top of what was
                // already picked. Shift still draws a marquee, so there is
                // a way to add to a selection from inside its own box.
                if (!ed && b && !ev.shiftKey &&
                    ev.clientX > b.x0 && ev.clientX < b.x1 &&
                    ev.clientY > b.y0 && ev.clientY < b.y1) {
                    ed = startEdit("move", ev);
                    ed.title = "Move points";
                }

                if (ed) {
                    state.edit = ed;
                    state.drag = null;
                    redraw();
                    return;
                }
            }

            state.drag = { x0: ev.clientX, y0: ev.clientY, x1: ev.clientX, y1: ev.clientY,
                           marquee: false, shift: ev.shiftKey,
                           zoom: zoom, pan: pan,
                           lasso: (!zoom && !pan && P.lasso) ? [[ev.clientX, ev.clientY]] : null,
                           tx: state.view.tx, ty: state.view.ty,
                           // Where the press landed, in comp space, and the
                           // scale it landed at. Every move is worked out from
                           // these rather than from the move before it, so a
                           // dropped event cannot leave the zoom drifting.
                           at: toComp([ev.clientX, ev.clientY]), s0: state.view.s };
            if (zoom) { setStatus("Drag up to zoom in, down to zoom out."); }
        });

        cv.addEventListener("mousemove", function (ev) {
            var ed = state.edit;
            if (ed) {
                if (ed.kind === "move") { dragMove(ed, ev); }
                else if (ed.kind === "tip") { dragTip(ed, ev); }
                else { dragBox(ed, ev); }
                buildPreview(ed);
                sayDrag(ed);
                redraw();
                return;
            }
            if (!state.drag) { return; }
            state.drag.x1 = ev.clientX;
            state.drag.y1 = ev.clientY;
            if (state.drag.zoom) {
                // Keep the point the drag started on under the pointer, or the
                // artwork slides away while you lean in on it.
                var d0 = state.drag;
                var sc = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX,
                    d0.s0 * Math.pow(1.01, d0.y0 - d0.y1)));
                state.view.s = sc;
                state.view.tx = d0.x0 - d0.at[0] * sc;
                state.view.ty = d0.y0 - d0.at[1] * sc;
                state.viewManual = true;
                syncZoomBar();
                redraw();
                return;
            }
            if (state.drag.pan) {
                // From where the drag started, not from the last event, so a
                // dropped move does not leave the view short.
                state.view.tx = state.drag.tx + (state.drag.x1 - state.drag.x0);
                state.view.ty = state.drag.ty + (state.drag.y1 - state.drag.y0);
                state.viewManual = true;
                redraw();
                return;
            }
            if (Math.abs(state.drag.x1 - state.drag.x0) > 3 ||
                Math.abs(state.drag.y1 - state.drag.y0) > 3) {
                state.drag.marquee = true;
                if (state.drag.lasso) {
                    var L = state.drag.lasso, last = L[L.length - 1];
                    if (Math.abs(last[0] - ev.clientX) > 1.5 ||
                        Math.abs(last[1] - ev.clientY) > 1.5) {
                        L.push([ev.clientX, ev.clientY]);
                    }
                }
                redraw();
            }
        });

        // Kept because it costs nothing and some hosts do send it, but it is
        // not what zoom rests on: After Effects does not deliver a wheel here,
        // which is what Command-drag is for.
        cv.addEventListener("mousewheel", function (ev) {
            var d = 0;
            if (typeof ev.wheelDelta === "number") { d = ev.wheelDelta; }
            else if (typeof ev.detail === "number") { d = -ev.detail; }
            if (!d) { return; }
            if (zoomAt(ev.clientX, ev.clientY, d > 0 ? 1.15 : 1 / 1.15)) { redraw(); }
        });

        cv.addEventListener("mouseup", function (ev) {
            var ed = state.edit;
            if (ed) {
                state.edit = null;
                state.preview = null;
                commitEdit(ed);
                redraw();
                return;
            }
            var d = state.drag;
            state.drag = null;
            if (!d) { return; }
            d.x1 = ev.clientX;
            d.y1 = ev.clientY;
            // A pan or a zoom moved the view, not the picks: neither must
            // land on a vertex and select it on the way up.
            if (d.pan || d.zoom) { redraw(); return; }

            if (d.marquee) {
                var poly = d.lasso;
                var x0 = Math.min(d.x0, d.x1), x1 = Math.max(d.x0, d.x1);
                var y0 = Math.min(d.y0, d.y1), y1 = Math.max(d.y0, d.y1);
                var inBox = function (p) {
                    return poly
                        ? inPolygon(poly, p[0], p[1])
                        : (p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1);
                };
                // A marquee takes in what it was drawn round: every point,
                // and every handle that was on screen at the time. What the
                // Handles setting was hiding was not there to be swept up,
                // so the selection as it stood is read first - clearing it
                // is itself what would hide them.
                var shownP = {}, shownH = {}, si, sk;
                for (si = 0; si < state.items.length; si++) {
                    sk = state.items[si].key;
                    shownP[sk] = state.sel[sk] || [];
                    shownH[sk] = state.selH[sk] || [];
                }
                if (!d.shift) { clearSel(); }
                for (var i = 0; i < state.geom.length; i++) {
                    var gm = state.geom[i];
                    if (!gm) { continue; }
                    var mk = state.items[i].key;
                    if (P.pickPath) {
                        // Anything the marquee caught any part of comes in
                        // entire. The curve counts as well as the vertices,
                        // so a box drawn across a long span between two
                        // points still takes the path it crossed.
                        var got = false, w;
                        for (w = 0; w < gm.verts.length && !got; w++) {
                            if (inBox(toCanvas(gm.verts[w]))) { got = true; }
                        }
                        for (w = 0; w < gm.poly.length && !got; w++) {
                            if (inBox(toCanvas(gm.poly[w]))) { got = true; }
                        }
                        if (got) { state.sel[mk] = allIdxOf(gm); }
                        continue;
                    }
                    for (var k = 0; k < gm.verts.length; k++) {
                        if (!inBox(toCanvas(gm.verts[k]))) { continue; }
                        var a = selOf(mk);
                        if (!has(a, k)) { a.push(k); }
                    }
                    if (gm.prim) { continue; }
                    for (k = 0; k < gm.tips.length; k++) {
                        var tp = gm.tips[k];
                        if (!tipWasShown(shownP[mk], shownH[mk], tp)) { continue; }
                        if (!inBox(toCanvas(tp.b))) { continue; }
                        var ah = selHOf(mk);
                        var nm = tipName(tp.i, tp.side);
                        if (!has(ah, nm)) { ah.push(nm); }
                    }
                }
            } else {
                if (P.pickPath) {
                    var hitW = nearestPath(d.x1, d.y1, 7);
                    if (hitW) { pickWholePath(hitW, d.shift); }
                    else if (!d.shift) { clearSel(); }
                    pushPicks();
                    reportSel();
                    redraw();
                    return;
                }
                // A handle tip sits further from the curve than its point,
                // so when both are under the pointer the tip is the one that
                // was meant.
                var hitT = nearestTip(d.x1, d.y1, 8);
                if (hitT) {
                    toggleSelH(hitT.key, hitT.tip.i, hitT.tip.side, d.shift);
                } else {
                    var hit = nearestVertex(d.x1, d.y1, 10);
                    if (hit) {
                        toggleSel(hit.key, hit.idx, d.shift);
                    } else if (!d.shift) {
                        clearSel();
                    }
                }
            }
            pushPicks();
            reportSel();
            redraw();
        });

        // ------------------------------------------------------- keyboard
        // The arrows move whatever is picked, by whole composition pixels,
        // and with Shift by the longer step - both set in Preferences. The
        // window is listened to as well as the field, because which of them
        // has the focus depends on what was touched last; the event is marked
        // so the two listeners cannot act on the same press twice.
        function nudgeBy(kx, ky, big) {
            if (!countSel() && !countSelH()) {
                setStatus("Pick some points first.");
                return false;
            }
            var n = big ? (Number(P.nudgeBig) || 8) : (Number(P.nudge) || 1);
            if (!(n > 0)) { n = 1; }
            var base = geomMap();
            return runEdits("Nudge points", currentPicks(),
                            moveEdits(base, [kx * n, ky * n]), [kx * n, ky * n]);
        }

        // Read by name and by code both: which of the two a host fills in
        // for an arrow is not something the panel can count on.
        function arrowOf(ev) {
            var k = "";
            try { k = String(ev.keyName || ""); } catch (eN) {}
            if (k === "Left") { return [-1, 0]; }
            if (k === "Right") { return [1, 0]; }
            if (k === "Up") { return [0, -1]; }
            if (k === "Down") { return [0, 1]; }
            var c = 0;
            try { c = Number(ev.keyCode || 0); } catch (eC) {}
            if (c === 37) { return [-1, 0]; }
            if (c === 39) { return [1, 0]; }
            if (c === 38) { return [0, -1]; }
            if (c === 40) { return [0, 1]; }
            return null;
        }

        // Command or Control with Z, the way After Effects takes it. The
        // panel keeps no undo stack of its own and should not: its edits are
        // already groups on After Effects' stack, so this only passes the key
        // on. Without it the field holding the focus swallows Z as "undo
        // typing", and nothing happens at all.
        //
        // Shift-Z is deliberately left alone rather than handled. After
        // Effects publishes no menu command id for Redo - its Edit item is
        // named after the action it would put back, and a name lookup finds
        // nothing - and guessing an id is not on: the id next to Undo's 2371
        // is Purge. Leaving the key unconsumed at least gives After Effects
        // its chance at it.
        function wantsUndo(ev) {
            if (!ev.ctrlKey && !ev.metaKey) { return false; }
            if (ev.shiftKey) { return false; }
            var k = "";
            try { k = String(ev.keyName || ""); } catch (eN) {}
            if (k && k.toUpperCase() === "Z") { return true; }
            var c = 0;
            try { c = Number(ev.keyCode || 0); } catch (eC) {}
            return c === 90;
        }

        function onKey(ev) {
            if (ev.__vxrSeen) { return; }
            if (wantsUndo(ev)) {
                try { ev.__vxrSeen = true; } catch (eU) {}
                undoLast();
                // The project has changed underneath the preview, and the
                // watcher would not notice: an undo need not change which
                // layers are selected.
                try { refresh(); } catch (eR) {}
                setStatus("Undone. Redo is After Effects' own - its Edit menu, " +
                          "or the composition window.");
                try { ev.preventDefault(); } catch (eP) {}
                try { ev.stopPropagation(); } catch (eS) {}
                return;
            }
            var d = arrowOf(ev);
            if (!d) { return; }
            try { ev.__vxrSeen = true; } catch (e0) {}
            nudgeBy(d[0], d[1], !!ev.shiftKey);
            try { ev.preventDefault(); } catch (e1) {}
            try { ev.stopPropagation(); } catch (e2) {}
        }

        // One listener, on the one control whose whole job is to receive
        // these keys. Listening on the window as well looks like belt and
        // braces and is not: a key that bubbles arrives at both, and the
        // points move twice as far as the press asked for. Whether ScriptUI
        // bubbles, and whether it bubbles the same event object or a copy of
        // it, differs by host - so the panel does not rely on either.
        keySink.addEventListener("keydown", onKey);

        // Say in the timeline what was just picked here. The signature is
        // written back at the same time, so the watcher reads this as the
        // panel's own doing rather than as news to act on.
        function pushPicks() {
            var comp = activeComp();
            if (!comp) { return; }
            try {
                selectControlsFor(comp, currentPicks());
                state.ctrlSig = controlSignature(comp);
                lastSeen = selectionSignature();
            } catch (e) {}
        }

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
            var n = countSel(), nh = countSelH();
            if (bPick) {
                bPick.says = (n + nh) ? "None - Let every picked point go"
                                      : "All - Pick every point in view";
                bPick.helpTip = bPick.says;
                repaint(bPick);
            }
            if (!activeComp()) { setStatus("Open a composition to start."); return; }
            var note = primNote();
            // Handles on their own are worth saying out loud: with no point
            // picked there is nothing on screen to explain what an arrow key
            // or a drag is about to move.
            if (!n && nh) {
                setStatus(countOf(nh, "handle") + " picked. " +
                          "Drag one, or nudge it with the arrows.");
                return;
            }
            if (n) {
                var list = currentPicks();
                var np = pickedPrims(list);
                var msg = countOf(n, "point") + " picked on " +
                          countOf(list.length, "path") + ".";
                if (nh) { msg = countOf(n, "point") + " and " +
                                countOf(nh, "handle") + " picked on " +
                                countOf(list.length, "path") + "."; }
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
                                : (P.pickPath
                                    ? "Click a path to take it whole, shift-click to add."
                                    : "Click a point, shift-click to add, drag to marquee.")));
                return;
            }
            setStatus(note ? ("Nothing to pick yet. " + note)
                           : "Select a shape or masked layer in the timeline.");
        }

        // -------------------------------------------------------- refresh
        function refresh() {
            // Never while something is in hand: a rebuild would swap the
            // geometry out from under the pointer, and a refit would move it.
            if (state.edit || state.drag) { return; }
            var comp = activeComp();
            var keep = state.sel;
            state.items = [];
            state.geom = [];
            state.prims = [];
            if (!comp) {
                clearSel();
                setStatus("Open a composition to start.");
                redraw();
                return;
            }
            // 0 the selected layers, 1 the shape group chosen inside them,
            // 2 every layer in the composition.
            var mode = scopeAt;
            var layers = null;
            if (mode !== 2) {
                layers = selectedLayers(comp);
                layers = layers.length ? widenScope(comp, layers) : null;
            }
            var all = scanPaths(comp, layers);
            var prims = scanPrimitives(comp, layers);
            if (P.maskDirect) { all = onlyDirectMasks(all); }
            if (mode === 1) {
                // Both lists are narrowed on one answer. Asked of each on its
                // own, a list with nothing chosen in it would fall back to
                // showing all of itself, which is the opposite of the point.
                var aim = pointedKeys([all, prims]);
                all = keepKeys(all, aim);
                prims = keepKeys(prims, aim);
            }
            var cap = 120;
            for (var i = 0; i < all.length && state.items.length < cap; i++) {
                var g = geomFor(all[i], comp.time);
                if (!g) { continue; }
                state.items.push(all[i]);
                state.geom.push(g);
            }
            // Primitives join the same list, so they are framed, drawn and
            // picked by the same code that handles real paths.
            for (i = 0; i < prims.length && state.items.length < cap * 2; i++) {
                var gp = geomFor(prims[i], comp.time);
                if (!gp) { continue; }
                state.items.push(prims[i]);
                state.geom.push(gp);
                state.prims.push(prims[i]);
            }
            // Keep whatever picks still point at a path that is still here.
            // After Effects is the other half of this selection: choosing a
            // point's control there says the same thing as clicking the point
            // here. Only act when that choice has actually changed, or every
            // refresh would undo whatever was just picked in the panel.
            var csig = controlSignature(comp);
            if (csig !== state.ctrlSig) {
                state.ctrlSig = csig;
                if (csig) {
                    var fromAE = picksFromControls(comp, selectedControls(comp));
                    if (fromAE.length) {
                        keep = {};
                        for (i = 0; i < fromAE.length; i++) {
                            keep[fromAE[i].item.key] = fromAE[i].idx.slice(0);
                        }
                    }
                }
            }

            var keepH = state.selH;
            clearSel();
            for (i = 0; i < state.items.length; i++) {
                var k = state.items[i].key;
                if (keep[k]) {
                    var kept = [];
                    for (var n = 0; n < keep[k].length; n++) {
                        if (keep[k][n] < state.geom[i].verts.length) { kept.push(keep[k][n]); }
                    }
                    if (kept.length) { state.sel[k] = kept; }
                }
                if (keepH[k]) {
                    var keptH = [];
                    for (n = 0; n < keepH[k].length; n++) {
                        var at = Number(String(keepH[k][n]).split(":")[0]);
                        if (at < state.geom[i].verts.length) { keptH.push(keepH[k][n]); }
                    }
                    if (keptH.length) { state.selH[k] = keptH; }
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
            if (!state.fitted || shown !== state.shown ||
                (!state.viewManual && !anythingInView(cw, ch))) {
                fitView(cw, ch);
                state.fitted = true;
            }
            syncZoomBar();
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
            // All picks every point; None lets go of the handles too, since
            // one button saying "none" that leaves some of it picked is a
            // button that lies.
            var had = countSel() + countSelH();
            clearSel();
            if (!had) {
                for (var i = 0; i < state.items.length; i++) {
                    var a = [];
                    for (var k = 0; k < state.geom[i].verts.length; k++) { a.push(k); }
                    state.sel[state.items[i].key] = a;
                }
            }
            pushPicks();
            reportSel();
            redraw();
        };
        bInv.onClick = function () {
            // Points only, and the handles are let go: there is no sensible
            // opposite of a picked handle while its point changes hands.
            state.selH = {};
            for (var i = 0; i < state.items.length; i++) {
                var key = state.items[i].key;
                var cur = state.sel[key] || [], a = [];
                for (var k = 0; k < state.geom[i].verts.length; k++) {
                    if (!has(cur, k)) { a.push(k); }
                }
                if (a.length) { state.sel[key] = a; } else { delete state.sel[key]; }
            }
            pushPicks();
            reportSel();
            redraw();
        };

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
        bSwap.onClick = function () { actSwitchHandleMode(picks(), P.handleMode); };

        // ----------------------------------------------------- preferences
        bLasso.onClick = function () {
            P.lasso = !P.lasso;
            this.on = P.lasso;
            this.says = P.lasso
                ? "Lasso - draw freehand round the points you want"
                : "Marquee - drag a box round the points you want";
            this.helpTip = this.says;
            savePrefs();
            repaint(this);
            setStatus(this.says);
        };

        bPathPick.onClick = function () {
            P.pickPath = !P.pickPath;
            this.on = P.pickPath;
            this.says = P.pickPath
                ? "Pick paths - click a path to take it whole, points and all"
                : "Pick points - click a point to take just that one";
            this.helpTip = this.says;
            // The two kinds of selection do not mix: a path half picked is
            // not something either mode knows how to show or act on.
            clearSel();
            pushPicks();
            savePrefs();
            repaint(this);
            setStatus(this.says);
            redraw();
        };

        bSnap.onClick = function () {
            P.snap = !P.snap;
            this.on = P.snap;
            savePrefs();
            repaint(this);
            setStatus(P.snap
                ? "Snapping on - a dragged point lines up with the others."
                : "Snapping off.");
        };

        bBox.onClick = function () {
            P.showBox = !P.showBox;
            this.on = P.showBox;
            savePrefs();
            repaint(this);
            redraw();
            setStatus(P.showBox
                ? "Transform box on - pick two or more points to turn or scale them."
                : "Transform box off.");
        };

        // Picked points name the paths. With nothing picked it is whatever
        // the timeline is pointing at - one shape group inside a layer if
        // that is what is selected there, every path on the layer if the
        // layer itself is. Keyframe and Reveal both read it this way.
        function aimedPaths() {
            var list = [], i, picked = currentPicks();
            if (!picked.length) { return pointedPaths(state.items); }
            for (i = 0; i < picked.length; i++) { list.push(picked[i].item); }
            return list;
        }

        // Whether what is aimed at came from points picked here, rather than
        // from what the timeline happens to be pointing at.
        function aimedHere() { return currentPicks().length > 0; }

        bKey.onClick = function () {
            var list = aimedPaths(), mine = aimedHere();
            if (actKeyPaths(list) && P.revealKeyed) { revealKeyed(list, mine); }
        };

        bReveal.onClick = function () { actRevealPaths(aimedPaths(), aimedHere()); };

        bRelink.onClick = function () { actRelink(aimedPaths(), sel()); };

        function wireAlign(b, mode) {
            b.onClick = function () { actAlign(currentPicks(), geomMap(), mode); };
        }
        wireAlign(bAlnL, "l");
        wireAlign(bAlnCX, "cx");
        wireAlign(bAlnR, "r");
        wireAlign(bAlnT, "t");
        wireAlign(bAlnCY, "cy");
        wireAlign(bAlnB, "b");

        bHelp.onClick = function () { helpDialog(win); };

        bPrefs.onClick = function () {
            prefsWantRepair = false;
            if (!prefsDialog(win)) { return; }
            if (prefsWantRepair) {
                // actRepairTangents reports through UI.say itself when it finds
                // something, and says nothing at all when it does not.
                if (actRepairTangents()) { return; }
                refresh();
                setStatus("Nothing to rebuild - every rig is already up to date.");
                return;
            }
            refresh();
            setStatus("Preferences saved. New controls use them.");
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
            var sel = comp.selectedLayers, i;
            for (i = 0; i < sel.length; i++) { out.push(String(sel[i].index)); }

            // Which PROPERTY is chosen moves none of the above: clicking a
            // different shape group inside a layer that is already selected
            // leaves the layer selection exactly as it was. That only matters
            // where the preview is narrowed by it, so it is only asked there.
            var mode = scopeAt;
            if (mode === 1) {
                out.push("|g");
                // What is on show is enough to notice the change by: choosing
                // another group lets the old one go, and that is a difference
                // here whether or not the new one was being shown.
                for (i = 0; i < state.items.length; i++) {
                    try {
                        if (isPointedAt(state.items[i].prop)) {
                            out.push(state.items[i].key);
                        }
                    } catch (eG) {}
                }
            }
            if (P.maskDirect) {
                // A mask held back is not in state.items at all, so choosing
                // one would otherwise go unnoticed. There are only ever a
                // handful of masks on a layer to ask about.
                out.push("|m");
                for (i = 0; i < sel.length; i++) {
                    var masks = null;
                    try { masks = sel[i].property(MN_MASKS); } catch (eM) { masks = null; }
                    for (var k = 1; masks && k <= masks.numProperties; k++) {
                        try {
                            if (isPointedAt(masks.property(k))) {
                                out.push("m" + sel[i].index + ":" + k);
                            }
                        } catch (eM2) {}
                    }
                }
            }
            return out.join(",");
        }

        function watchSelection() {
            if (state.edit || state.drag) { return; }
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
            if (state.edit || state.drag) { return; }
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

    // -------------------------------------------------------- help dialog
    // Every gesture, in two columns and five short groups. This used to be a
    // tooltip, which grew until it covered the artwork it was explaining.
    //
    // A row is [gesture, what it does]; a lone string is a heading.
    var HELP = [
        "Pick",
        ["Click, or drag a box", "Pick a point, or several"],
        ["Shift-click", "Add one, or let it go"],
        ["Lasso", "Draw freehand round them instead"],
        ["Pick paths", "The top row's toggle takes a whole path - click the curve"],
        ["Double-click empty", "Frame everything again"],
        "Move",
        ["Drag a picked point", "Takes every picked point with it"],
        ["Arrow keys", "Nudge; shift-arrow goes further"],
        ["Command or Control Z", "Undo, the same step After Effects would"],
        ["Shift while dragging", "Hold one axis"],
        ["Command or Control", "Drop the snap for that drag"],
        "Curve",
        ["Click a handle", "Picks it; a marquee takes the ones on show"],
        ["Drag a handle", "Alone it reshapes; with more picked it moves"],
        ["Shift while dragging", "Hold the angle"],
        ["Command or Control", "Break the pair on a smooth point"],
        "Two or more points",
        ["Drag inside the box", "Moves everything picked"],
        ["Pull a knob", "Scale; Shift even, Alt from the centre"],
        ["The arc at a corner", "Turn; Shift steps by 15 degrees"],
        ["The six align buttons", "Line the points up - never their handles"],
        "Timeline",
        ["Keyframe", "A path keyframe here, before you move anything"],
        ["Reveal", "Open those paths in the timeline, keying nothing"],
        ["What they act on", "Picked points, or the group chosen in the timeline"],
        "Repair",
        ["Relink", "Puts a rig back after AE edits the path, or switches it on"],
        ["Relink, controls picked", "Builds a lost rig again from those controls"],
        "View",
        ["Alt-drag", "Pan"],
        ["Command or Control drag", "Up to zoom in, down to zoom out"],
        ["Wheel over the strip", "Zoom"]
    ];

    function helpDialog(parent) {
        var d = new Window("dialog", NAME + " " + VERSION);
        d.alignChildren = ["fill", "top"];
        d.spacing = 2;
        d.margins = 14;

        var head = ScriptUI.newFont("dialog", "BOLD", 12);
        var dim = [0.62, 0.62, 0.62, 1];

        for (var i = 0; i < HELP.length; i++) {
            var row = HELP[i];
            if (typeof row === "string") {
                var sp = d.add("statictext", undefined, " ");
                sp.preferredSize.height = (i ? 8 : 2);
                var h = d.add("statictext", undefined, row);
                try { h.graphics.font = head; } catch (eF) {}
                continue;
            }
            var g = d.add("group");
            g.alignChildren = ["left", "center"];
            g.spacing = 10;
            g.margins = 0;
            var a = g.add("statictext", undefined, row[0]);
            a.preferredSize.width = 150;
            var b = g.add("statictext", undefined, row[1]);
            b.preferredSize.width = 250;
            try {
                b.graphics.foregroundColor =
                    b.graphics.newPen(b.graphics.PenType.SOLID_COLOR, dim, 1);
            } catch (eC) {}
        }

        var foot = d.add("group");
        foot.alignment = ["right", "top"];
        foot.add("button", undefined, "Close", { name: "ok" });
        d.center(parent);
        d.show();
    }

    // Set by the maintenance button in Preferences, read by its caller once
    // the dialog has closed: a bulk rewrite of the comp does not belong inside
    // a modal window.
    var prefsWantRepair = false;

    // A typed number, or what was there before it was typed over.
    function numIn(txt, was, lo, hi) {
        var v = parseFloat(txt);
        if (isNaN(v) || !isFinite(v)) { return was; }
        return Math.max(lo, Math.min(hi, v));
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

        // What the preview's own editing runs on. The rest of its settings
        // are on the Edit tab, where they are flicked on and off mid-task.
        var gNudge = line("Nudge");
        var nTxt = gNudge.add("edittext", undefined, String(P.nudge));
        nTxt.characters = 4;
        gNudge.add("statictext", undefined, "px per arrow key, and with Shift");
        var nBigTxt = gNudge.add("edittext", undefined, String(P.nudgeBig));
        nBigTxt.characters = 4;

        var gSnap = line("Snapping");
        var cbSnap = gSnap.add("checkbox", undefined, "Snap to points and bounds");
        cbSnap.value = !!P.snap;
        cbSnap.helpTip = "Measured on screen, so it stays the same few pixels " +
                         "however far the preview is zoomed in.";
        var snapTxt = gSnap.add("edittext", undefined, String(P.snapPx));
        snapTxt.characters = 3;
        gSnap.add("statictext", undefined, "px");

        var gKey = line("Keyframe");
        var cbReveal = gKey.add("checkbox", undefined, "Open the path in the timeline after");
        cbReveal.value = !!P.revealKeyed;
        cbReveal.helpTip = "Reveals the keyframed properties of the layers that " +
                           "were keyed, the way pressing U does.";

        var gMask = line("Masks");
        var cbMask = gMask.add("checkbox", undefined, "Only when chosen in the timeline");
        cbMask.value = !!P.maskDirect;
        cbMask.helpTip = "A shape layer that also carries masks otherwise shows " +
                         "two sets of points over one piece of artwork. With this " +
                         "on, a mask has to be chosen in the timeline before its " +
                         "points appear - the mask itself, not the layer it is on.";

        var gAnchor = line("Anchor point");
        var cbAnchor = gAnchor.add("checkbox", undefined, "Move it with a whole path");
        cbAnchor.value = !!P.anchorFollows;
        cbAnchor.helpTip = "When every point of a shape group's path moves together, " +
                           "the group's anchor point moves with it and its position is " +
                           "put back by the same step, so nothing shifts and the anchor " +
                           "keeps its place on the artwork. Reshaping leaves it alone, " +
                           "and so does a group whose anchor or position is keyframed.";

        var gBox = line("Transform box");
        var cbBox = gBox.add("checkbox", undefined, "Show round two or more points");
        cbBox.value = !!P.showBox;

        var gBake = line("Bake range");
        var ddBake = gBake.add("dropdownlist", undefined, ["Work area", "Whole composition"]);
        ddBake.preferredSize.width = 160;
        ddBake.selection = P.bakeWorkArea ? 0 : 1;

        // Maintenance rather than a preference: once a rig written before
        // tangents turned with the rig has been rebuilt, there is no reason to
        // come back here. That is why it lives behind Preferences and not on
        // the panel.
        var gFix = d.add("group");
        gFix.alignment = ["left", "top"];
        var bFix = gFix.add("button", undefined, "Rebuild tangent bindings");
        bFix.preferredSize = [200, 24];
        bFix.helpTip = "For rigs made before tangents turned with the rig. " +
                       "Goes over every rig in the composition, in one step.";

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
            P.bakeWorkArea = (ddBake.selection.index === 0);
            P.nudge = numIn(nTxt.text, P.nudge, 0.01, 1000);
            P.nudgeBig = numIn(nBigTxt.text, P.nudgeBig, 0.01, 1000);
            P.snap = cbSnap.value;
            P.snapPx = numIn(snapTxt.text, P.snapPx, 1, 40);
            P.showBox = cbBox.value;
            P.revealKeyed = cbReveal.value;
            P.maskDirect = cbMask.value;
            P.anchorFollows = cbAnchor.value;
            savePrefs();
            saved = true;
            d.close();
        };
        bCancel.onClick = function () { d.close(); };
        bFix.onClick = function () {
            prefsWantRepair = true;
            bOk.onClick();
        };
        d.center(parent);
        d.show();
        return saved;
    }

    // ---------------------------------------------------------------- boot

    loadPrefs();
    buildUI(thisObj);

})(this);
