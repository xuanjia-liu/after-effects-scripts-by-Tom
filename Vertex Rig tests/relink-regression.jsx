// Relink, checked against After Effects' own expression evaluator.
//
// Run with AE > File > Scripts > Run Script File. It builds its own
// compositions in a clearly named folder, removes them, restores the
// composition and selection that were open, and writes relink-results.txt
// beside this file. The project is not saved.
//
// What only After Effects can answer: whether the rig drives the right
// vertices again afterwards. The node harness never runs an expression, so
// headlessly all that can be checked is what was written into the manifest.
// Here the manifest is read back by the evaluator that actually uses it.
//
// Nothing is wrapped in an outer undo group. Undo groups do not nest, and
// bracketing actions that open their own leaves After Effects' grouping
// state broken for whatever runs next.
//
// File must stay pure ASCII: After Effects reads .jsx as Latin-1.
(function () {

    var dir = File($.fileName).parent;
    var original = app.project.activeItem;
    var savedSel = (original instanceof CompItem) ? original.selectedLayers : [];
    var log = [], pass = 0, fail = 0, folder = null;

    function say(s) { log.push(String(s)); }
    function check(ok, label, detail) {
        if (ok) { pass++; } else { fail++; }
        say((ok ? "PASS " : "FAIL ") + label + (detail ? "  | " + detail : ""));
    }
    function fmt(p) { return "[" + Math.round(p[0] * 1000) / 1000 + "," +
                             Math.round(p[1] * 1000) / 1000 + "]"; }
    function near(a, b, eps) {
        eps = eps || 0.05;
        return Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps;
    }
    function idxOf(man) {
        var out = [];
        for (var i = 0; i < man.pts.length; i++) { out.push(man.pts[i].i); }
        return out.join(",");
    }

    // ---------------------------------------------------------- the script
    function load() {
        var file = new File(dir.fsName + "/../Vertex Rig.jsx");
        if (!file.exists) { throw new Error("Vertex Rig.jsx not found beside the tests"); }
        file.open("r");
        var src = file.read();
        file.close();
        var marker = "    loadPrefs();\n    buildUI(thisObj);";
        if (src.indexOf(marker) < 0) { throw new Error("boot marker missing"); }
        src = src.replace(marker,
            '$.global.__VXR_RELINK = { P: P, UI: UI, scan: scanPaths, geomFor: geomFor,' +
            ' create: actCreate, pivot: actPivot, manifest: readManifest,' +
            ' relink: actRelink, linkedLayer: linkedLayer, itemMatrix: itemMatrix,' +
            ' mPt: mPt, mInv: mInv, rawShape: rawShape, originOf: originOf,' +
            ' removeEffect: removeEffect, findEffect: findEffect,' +
            ' del: actDelete };');
        eval(src);
        var V = $.global.__VXR_RELINK;
        V.UI.say = function (s) { say("    " + s); };
        V.UI.refresh = function () {};
        return V;
    }

    // ------------------------------------------------------------- fixtures
    function curvy() {
        var s = new Shape();
        s.closed = true;
        s.vertices = [[-40, -25], [55, -30], [45, 38], [-35, 30]];
        s.inTangents = [[0, 0], [-18, -12], [0, -16], [-10, 0]];
        s.outTangents = [[22, 0], [8, 15], [-16, 9], [0, 0]];
        return s;
    }

    // A group that is turned and unevenly scaled, so every conversion between
    // composition pixels and the path's own units has work to do. The fixture
    // gets an undo group of its own: built outside one, After Effects decides
    // for itself which group these changes belong to.
    function makeComp(name) {
        app.beginUndoGroup("VXR relink fixture");
        var c = app.project.items.addComp(name, 960, 540, 1, 2, 24);
        c.parentFolder = folder;
        c.openInViewer();
        var L = c.layers.addShape();
        L.name = "Curve";
        L.transform.anchorPoint.setValue([0, 0]);
        L.transform.position.setValue([480, 270]);
        var g = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        g.name = "Geometry";
        var h = g.property("ADBE Vectors Group");
        h.addProperty("ADBE Vector Shape - Group")
         .property("ADBE Vector Shape").setValue(curvy());
        h.addProperty("ADBE Vector Graphic - Fill");
        var gt = g.property("ADBE Vector Transform Group");
        gt.property("ADBE Vector Position").setValue([25, -18]);
        gt.property("ADBE Vector Rotation").setValue(17);
        gt.property("ADBE Vector Scale").setValue([175, 68]);
        L.transform.rotation.setValue(-9);
        L.transform.scale.setValue([110, 92]);
        app.endUndoGroup();
        return { comp: c, layer: L };
    }

    // Where the path's points actually are once the rig has had its say.
    function evalVerts(V, item, t) {
        var sh = item.prop.valueAtTime(t, false);
        var m = V.itemMatrix(item, t), out = [];
        for (var i = 0; i < sh.vertices.length; i++) {
            out.push(V.mPt(m, sh.vertices[i]));
        }
        return out;
    }

    // The path's own value, as plain arrays.
    function rawParts(V, c, prop) {
        var sh = V.rawShape(c, prop), out = { v: [], i: [], o: [], closed: sh.closed };
        for (var n = 0; n < sh.vertices.length; n++) {
            out.v.push([sh.vertices[n][0], sh.vertices[n][1]]);
            out.i.push([sh.inTangents[n][0], sh.inTangents[n][1]]);
            out.o.push([sh.outTangents[n][0], sh.outTangents[n][1]]);
        }
        return out;
    }

    // Standing in for the pen tool: an After Effects edit lands in the path's
    // own value, under whatever the rig has put on top of it.
    function putRaw(c, prop, parts) {
        var sh = new Shape();
        sh.closed = parts.closed;
        sh.vertices = parts.v;
        sh.inTangents = parts.i;
        sh.outTangents = parts.o;
        var live = prop.expressionEnabled;
        app.beginUndoGroup("VXR relink fixture edit");
        try {
            if (live) { prop.expressionEnabled = false; }
            if (prop.numKeys > 0) { prop.setValueAtTime(c.time, sh); }
            else { prop.setValue(sh); }
        } finally {
            if (live) { try { prop.expressionEnabled = true; } catch (e) {} }
            app.endUndoGroup();
        }
    }

    function insertFront(parts, at) {
        return { v: [at].concat(parts.v),
                 i: [[0, 0]].concat(parts.i),
                 o: [[0, 0]].concat(parts.o),
                 closed: parts.closed };
    }

    function picks(item, idx) { return [{ item: item, idx: idx }]; }

    // A second path on the SAME layer, under the same group transform, so its
    // vertices land exactly where the first one's do. Every VXR link sits on
    // the layer they share, and nothing in a link says which path it serves,
    // so this is where one path can be built out of the other's controls.
    function addSecondGroup(L, name) {
        app.beginUndoGroup("VXR relink fixture group");
        var g = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        g.name = name;
        var h = g.property("ADBE Vectors Group");
        h.addProperty("ADBE Vector Shape - Group")
         .property("ADBE Vector Shape").setValue(curvy());
        h.addProperty("ADBE Vector Graphic - Fill");
        var gt = g.property("ADBE Vector Transform Group");
        gt.property("ADBE Vector Position").setValue([25, -18]);
        gt.property("ADBE Vector Rotation").setValue(17);
        gt.property("ADBE Vector Scale").setValue([175, 68]);
        app.endUndoGroup();
        return g;
    }

    // ------------------------------------------------- 1. a vertex added
    function caseAdded(V) {
        say("\n1. a vertex added in After Effects");
        var f = makeComp("VXR relink - added");
        var c = f.comp, t = c.time;
        var item = V.scan(c, [f.layer])[0];
        V.create(picks(item, [1, 2]), false);

        var man = V.manifest(item.prop);
        check(man && man.pts.length === 2, "two points rigged", idxOf(man));
        check(!!(man.pts[0].p && man.pts[1].p),
              "each entry wrote down where its point sat",
              fmt(man.pts[0].p) + " " + fmt(man.pts[1].p));

        var ctrlA = V.linkedLayer(item.layer, man.pts[0].fx);
        var ctrlB = V.linkedLayer(item.layer, man.pts[1].fx);
        var ctrlAwas = V.originOf(ctrlA, t), ctrlBwas = V.originOf(ctrlB, t);
        var before = evalVerts(V, item, t);
        check(near(before[1], ctrlAwas) && near(before[2], ctrlBwas),
              "the rig is driving vertices 1 and 2 to start with",
              fmt(before[1]) + " " + fmt(before[2]));

        // one more vertex, in front of them both
        putRaw(c, item.prop, insertFront(rawParts(V, c, item.prop), [-60, -5]));

        // The expression pins whatever indices it names straight to the
        // controls, so the driven vertices always look right however stale
        // the indices are. What gives a stale one away is the vertex it has
        // taken hold of by mistake, and the one it was given, left to the
        // path. Checking the driven vertices here would pass on a rig that
        // is wholly broken.
        var broken = evalVerts(V, item, t);
        var brokenRaw = rawParts(V, c, item.prop);
        var mNow = V.itemMatrix(item, t);
        // Nor is "is this vertex at a control?" any use on its own: a control
        // that has not been moved since it was made is still sitting on its
        // own point, so the answer is yes either way. These two are not:
        // a vertex nothing ever rigged has been dragged onto a control, and
        // the vertex that control was given is off somewhere else.
        check(!near(broken[1], V.mPt(mNow, brokenRaw.v[1])) &&
              !near(broken[2], ctrlAwas),
              "until it is relinked a control drags a vertex that is not its own",
              fmt(broken[1]) + " should be at " + fmt(V.mPt(mNow, brokenRaw.v[1])) +
              ", and " + fmt(broken[2]) + " should be at " + fmt(ctrlAwas));

        V.relink([item]);

        var now = V.manifest(item.prop);
        check(idxOf(now) === "2,3", "the entries move on by one", idxOf(now));
        var after = evalVerts(V, item, t);
        check(near(after[2], ctrlAwas) && near(after[3], ctrlBwas),
              "and the rig drives the points it was given again",
              fmt(after[2]) + " " + fmt(after[3]));
        check(near(V.originOf(ctrlA, t), ctrlAwas) &&
              near(V.originOf(ctrlB, t), ctrlBwas),
              "with neither control having had to move");

        // the vertex that was put in, and the ones the rig never held, are
        // where the path itself says
        var raw = rawParts(V, c, item.prop);
        var m = V.itemMatrix(item, t);
        check(near(after[0], V.mPt(m, raw.v[0])) &&
              near(after[1], V.mPt(m, raw.v[1])),
              "the new vertex and its neighbour are left to the path");
    }

    // ----------------------------------------------- 2. a vertex taken away
    function caseRemoved(V) {
        say("\n2. a vertex taken away in After Effects");
        var f = makeComp("VXR relink - removed");
        var c = f.comp, t = c.time;
        var item = V.scan(c, [f.layer])[0];
        V.create(picks(item, [2, 3]), false);

        var man = V.manifest(item.prop);
        var ctrlA = V.linkedLayer(item.layer, man.pts[0].fx);
        var ctrlB = V.linkedLayer(item.layer, man.pts[1].fx);
        var ctrlAwas = V.originOf(ctrlA, t), ctrlBwas = V.originOf(ctrlB, t);

        var raw = rawParts(V, c, item.prop);
        putRaw(c, item.prop, { v: raw.v.slice(1), i: raw.i.slice(1),
                               o: raw.o.slice(1), closed: raw.closed });

        V.relink([item]);
        var now = V.manifest(item.prop);
        check(idxOf(now) === "1,2", "both entries step back by one", idxOf(now));
        var after = evalVerts(V, item, t);
        check(near(after[1], ctrlAwas) && near(after[2], ctrlBwas),
              "and the rig drives the points it was given again",
              fmt(after[1]) + " " + fmt(after[2]));
    }

    // ------------------------------------------- 3. the curve edited instead
    function caseEdited(V) {
        say("\n3. a rigged vertex dragged in After Effects");
        var f = makeComp("VXR relink - edited");
        var c = f.comp, t = c.time;
        var item = V.scan(c, [f.layer])[0];
        V.create(picks(item, [1, 3]), false);

        var man = V.manifest(item.prop);
        var ctrlA = V.linkedLayer(item.layer, man.pts[0].fx);
        var ctrlB = V.linkedLayer(item.layer, man.pts[1].fx);
        var ctrlBwas = V.originOf(ctrlB, t);

        var raw = rawParts(V, c, item.prop);
        var want = [raw.v[1][0] + 14, raw.v[1][1] - 11];
        var edited = { v: [], i: raw.i, o: raw.o, closed: raw.closed };
        for (var n = 0; n < raw.v.length; n++) {
            edited.v.push(n === 1 ? want : raw.v[n]);
        }
        putRaw(c, item.prop, edited);

        var m = V.itemMatrix(item, t);
        var wantComp = V.mPt(m, want);
        var stubborn = evalVerts(V, item, t);
        check(!near(stubborn[1], wantComp),
              "the rig puts the point straight back, so the edit looks ignored",
              fmt(stubborn[1]) + " wanted " + fmt(wantComp));

        V.relink([item]);

        check(idxOf(V.manifest(item.prop)) === "1,3",
              "nothing was reindexed - the indices were never wrong",
              idxOf(V.manifest(item.prop)));
        check(near(V.originOf(ctrlA, t), wantComp),
              "the control has come to meet its point",
              fmt(V.originOf(ctrlA, t)) + " wanted " + fmt(wantComp));
        var after = evalVerts(V, item, t);
        check(near(after[1], wantComp),
              "so the edit holds once the rig has run", fmt(after[1]));
        check(near(V.originOf(ctrlB, t), ctrlBwas),
              "and the control whose point did not move is left alone");
    }

    // ---------------------------------------------- 4. points held by a Pivot
    function casePivot(V) {
        say("\n4. a vertex added under a Pivot");
        var f = makeComp("VXR relink - pivot");
        var c = f.comp, t = c.time;
        var item = V.scan(c, [f.layer])[0];
        V.pivot(picks(item, [1, 2, 3]), []);

        var man = V.manifest(item.prop);
        check(man.pts.length === 3 && !!man.pts[0].pp,
              "three points held in the Pivot's own frame", idxOf(man));
        var piv = V.linkedLayer(item.layer, man.pts[0].fx);
        var pivWas = V.originOf(piv, t);
        var before = evalVerts(V, item, t);

        putRaw(c, item.prop, insertFront(rawParts(V, c, item.prop), [-70, 12]));
        V.relink([item]);

        var now = V.manifest(item.prop);
        check(idxOf(now) === "2,3,4", "all three move on by one", idxOf(now));
        check(near(V.originOf(piv, t), pivWas), "the Pivot itself does not move",
              fmt(V.originOf(piv, t)) + " was " + fmt(pivWas));
        var after = evalVerts(V, item, t);
        check(near(after[2], before[1]) && near(after[3], before[2]) &&
              near(after[4], before[3]),
              "and every point it holds is back where it was",
              fmt(after[2]) + " " + fmt(after[3]) + " " + fmt(after[4]));
    }

    // -------------------------------------------- 5. handles come along too
    function caseHandles(V) {
        say("\n5. a point with handles keeps them through a relink");
        var f = makeComp("VXR relink - handles");
        var c = f.comp, t = c.time;
        var item = V.scan(c, [f.layer])[0];
        V.create(picks(item, [2]), true);

        var man = V.manifest(item.prop);
        var e = man.pts[0];
        check(!!(e.im || e["if"]) && !!(e.om || e.of),
              "the point was rigged with both handles");
        var before = item.prop.valueAtTime(t, false);
        var inWas = [before.inTangents[2][0], before.inTangents[2][1]];
        var outWas = [before.outTangents[2][0], before.outTangents[2][1]];

        putRaw(c, item.prop, insertFront(rawParts(V, c, item.prop), [-66, -40]));
        V.relink([item]);

        check(idxOf(V.manifest(item.prop)) === "3", "the entry moves on by one",
              idxOf(V.manifest(item.prop)));
        var after = item.prop.valueAtTime(t, false);
        check(near([after.inTangents[3][0], after.inTangents[3][1]], inWas, 0.2) &&
              near([after.outTangents[3][0], after.outTangents[3][1]], outWas, 0.2),
              "and both handles shape the vertex it moved to",
              fmt([after.inTangents[3][0], after.inTangents[3][1]]) + " was " + fmt(inWas));
    }

    // ------------------------------------------------ 6. a rig already right
    function caseHealthy(V) {
        say("\n6. a rig that is already right");
        var f = makeComp("VXR relink - healthy");
        var c = f.comp, t = c.time;
        var item = V.scan(c, [f.layer])[0];
        V.create(picks(item, [0, 2]), false);

        var manWas = V.manifest(item.prop);
        var before = evalVerts(V, item, t);
        V.relink([item]);
        var now = V.manifest(item.prop);
        check(idxOf(now) === idxOf(manWas), "the indices are left alone", idxOf(now));
        var after = evalVerts(V, item, t);
        var same = after.length === before.length;
        for (var i = 0; same && i < after.length; i++) {
            if (!near(after[i], before[i], 0.001)) { same = false; }
        }
        check(same, "and the shape it draws is exactly what it was");
    }

    // ------------------------------------------ 7. the expression switched off
    function caseSwitchedOff(V) {
        say("\n7. a rig whose expression was only switched off");
        var f = makeComp("VXR relink - switched off");
        var c = f.comp, t = c.time;
        var item = V.scan(c, [f.layer])[0];
        V.create(picks(item, [1, 2]), false);

        var man = V.manifest(item.prop);
        var ctrl = V.linkedLayer(item.layer, man.pts[0].fx);

        // move the control, so on and off look different
        app.beginUndoGroup("VXR relink fixture move");
        var pv = ctrl.transform.position.value;
        ctrl.transform.position.setValue([pv[0] + 30, pv[1] - 20]);
        app.endUndoGroup();
        var want = V.originOf(ctrl, t);
        check(near(evalVerts(V, item, t)[1], want),
              "the rig is driving its point to the control");

        app.beginUndoGroup("VXR relink fixture off");
        item.prop.expressionEnabled = false;
        app.endUndoGroup();
        check(V.manifest(item.prop) === null,
              "switched off, the path reads as unrigged");
        check(!near(evalVerts(V, item, t)[1], want),
              "and the point falls back to the path's own value",
              fmt(evalVerts(V, item, t)[1]));

        V.relink([item]);

        check(item.prop.expressionEnabled === true, "Relink switches it back on");
        check(idxOf(V.manifest(item.prop)) === "1,2",
              "the rig it had is the rig it has back", idxOf(V.manifest(item.prop)));
        check(near(evalVerts(V, item, t)[1], want),
              "and it is driving the point again",
              fmt(evalVerts(V, item, t)[1]) + " wanted " + fmt(want));
    }

    // ----------------------------------- 8. built again from the links left
    function caseRebuilt(V) {
        say("\n8. a rig built again from the links left on the layer");
        var f = makeComp("VXR relink - rebuilt");
        var c = f.comp, t = c.time;
        var item = V.scan(c, [f.layer])[0];
        V.create(picks(item, [0, 1, 2]), false);

        var man = V.manifest(item.prop), ctrls = [], want = [], k, pv;
        for (k = 0; k < man.pts.length; k++) {
            ctrls.push(V.linkedLayer(item.layer, man.pts[k].fx));
        }
        // carry every control off its point, so a rebuild cannot simply look
        // at where they are standing and has to go by the name instead
        app.beginUndoGroup("VXR relink fixture move");
        for (k = 0; k < ctrls.length; k++) {
            pv = ctrls[k].transform.position.value;
            ctrls[k].transform.position.setValue([pv[0] + 40 + k * 6, pv[1] - 25]);
        }
        app.endUndoGroup();
        for (k = 0; k < ctrls.length; k++) { want.push(V.originOf(ctrls[k], t)); }

        app.beginUndoGroup("VXR relink fixture wipe");
        item.prop.expression = "";
        app.endUndoGroup();
        check(V.manifest(item.prop) === null, "with the expression gone it is not rigged");

        V.relink([item]);

        var now = V.manifest(item.prop);
        check(!!now && now.pts.length === 3, "Relink builds it again",
              now ? String(now.pts.length) : "nothing");
        check(idxOf(now) === "0,1,2", "on the vertices the names name", idxOf(now));
        var after = evalVerts(V, item, t);
        check(near(after[0], want[0]) && near(after[1], want[1]) &&
              near(after[2], want[2]),
              "and the rebuilt expression drives every point to its control",
              fmt(after[0]) + " " + fmt(after[1]) + " " + fmt(after[2]));
    }

    // --------------------------------- 9. built again from controls picked
    function casePicked(V) {
        say("\n9. a rig built again from the controls picked in the timeline");
        var f = makeComp("VXR relink - picked");
        var c = f.comp, t = c.time;
        var item = V.scan(c, [f.layer])[0];
        V.create(picks(item, [0, 2]), false);

        var man = V.manifest(item.prop), ctrls = [], want = [], k;
        for (k = 0; k < man.pts.length; k++) {
            ctrls.push(V.linkedLayer(item.layer, man.pts[k].fx));
        }
        for (k = 0; k < ctrls.length; k++) { want.push(V.originOf(ctrls[k], t)); }

        // the expression and the links both go: only the layers are left
        app.beginUndoGroup("VXR relink fixture strip");
        item.prop.expression = "";
        for (k = 0; k < man.pts.length; k++) {
            V.removeEffect(item.layer, man.pts[k].fx);
        }
        app.endUndoGroup();
        check(V.linkedLayer(item.layer, man.pts[0].fx) === null,
              "nothing on the layer points at them any more");

        V.relink([item], ctrls);

        var now = V.manifest(item.prop);
        check(!!now && now.pts.length === 2, "the picked controls rebuild it",
              now ? String(now.pts.length) : "nothing");
        check(idxOf(now) === "0,2", "on the vertices they are standing on", idxOf(now));
        var after = evalVerts(V, item, t);
        check(near(after[0], want[0]) && near(after[2], want[1]),
              "and the fresh links drive those points",
              fmt(after[0]) + " " + fmt(after[2]));
    }

    // ------------------------------------- 10. another tool keeps its work
    function caseForeign(V) {
        say("\n10. another tool's expression, switched off");
        var f = makeComp("VXR relink - foreign");
        var c = f.comp;
        var item = V.scan(c, [f.layer])[0];
        app.beginUndoGroup("VXR relink fixture foreign");
        item.prop.expression = "// another tool\nthisProperty.value";
        item.prop.expressionEnabled = false;
        app.endUndoGroup();

        V.relink([item]);

        check(String(item.prop.expression).indexOf("another tool") >= 0,
              "the expression is left exactly as it was found",
              String(item.prop.expression).substring(0, 40));
        check(item.prop.expressionEnabled === false,
              "and is not switched on behind their back");
    }

    // ------------------------------- 11. a bare path beside a rigged one
    function caseSibling(V) {
        say("\n11. a bare path on the same layer as a rigged one");
        var f = makeComp("VXR relink - sibling");
        var c = f.comp;
        addSecondGroup(f.layer, "Spare");
        var items = V.scan(c, [f.layer]);
        check(items.length === 2, "the layer carries two paths", String(items.length));
        V.create(picks(items[0], [0, 1, 2]), false);
        check(idxOf(V.manifest(items[0].prop)) === "0,1,2", "one of them is rigged");
        check(V.manifest(items[1].prop) === null, "and the other is not");

        // the user selects the layer, picks nothing, presses Relink: both
        // paths are in scope and every link is on the layer they share
        V.relink(items);

        check(V.manifest(items[1].prop) === null,
              "it is still not: those controls belong to its neighbour",
              V.manifest(items[1].prop) ? "BUILT OVER" : "left alone");
        check(idxOf(V.manifest(items[0].prop)) === "0,1,2",
              "and the rigged one came through untouched",
              idxOf(V.manifest(items[0].prop)));
    }

    // -------------------------- 12. a switched-off rig keeps hold of its links
    function casePrune(V) {
        say("\n12. a switched-off rig keeps its links when its neighbour's goes");
        var f = makeComp("VXR relink - prune");
        var c = f.comp;
        addSecondGroup(f.layer, "Spare");
        var items = V.scan(c, [f.layer]);
        V.create(picks(items[0], [0, 1]), false);
        V.create(picks(items[1], [2, 3]), false);
        var aMan = V.manifest(items[0].prop), bMan = V.manifest(items[1].prop);
        check(!!aMan && !!bMan, "both paths are rigged");
        var aFx = [], bIdx = [], k;
        for (k = 0; k < aMan.pts.length; k++) { aFx.push(aMan.pts[k].fx); }
        for (k = 0; k < bMan.pts.length; k++) { bIdx.push(bMan.pts[k].i); }

        app.beginUndoGroup("VXR relink fixture off");
        items[0].prop.expressionEnabled = false;
        app.endUndoGroup();

        // taking the other rig off prunes the layer's unused links
        V.del(picks(items[1], bIdx), [], false);

        var kept = 0;
        for (k = 0; k < aFx.length; k++) {
            if (V.findEffect(f.layer, aFx[k])) { kept++; }
        }
        check(kept === aFx.length,
              "the switched-off rig still has every link it had",
              kept + " of " + aFx.length);

        V.relink([items[0]]);
        check(items[0].prop.expressionEnabled === true,
              "so Relink can still switch it back on");
        check(idxOf(V.manifest(items[0].prop)) === "0,1",
              "with its points intact", idxOf(V.manifest(items[0].prop)));
    }

    // ------------------------------------------------------------------ run
    var err = null;
    try {
        folder = app.project.items.addFolder("VXR relink QA");
        var V = load();
        V.P.snap = false;
        caseAdded(V);
        caseRemoved(V);
        caseEdited(V);
        casePivot(V);
        caseHandles(V);
        caseHealthy(V);
        caseSwitchedOff(V);
        caseRebuilt(V);
        casePicked(V);
        caseForeign(V);
        caseSibling(V);
        casePrune(V);
    } catch (e) {
        err = e;
        say("\nTHREW " + e.toString() + (e.line ? " at line " + e.line : ""));
        fail++;
    }

    // Take the test compositions away again, whatever happened.
    try {
        if (folder) {
            app.beginUndoGroup("VXR relink QA cleanup");
            while (folder.numItems > 0) { folder.item(1).remove(); }
            folder.remove();
            app.endUndoGroup();
        }
    } catch (e2) { say("cleanup: " + e2.toString()); }
    try {
        if (original) {
            original.openInViewer();
            if (original instanceof CompItem) {
                for (var s = 0; s < savedSel.length; s++) { savedSel[s].selected = true; }
            }
        }
    } catch (e3) {}

    var head = "Vertex Rig - relink\n" +
               new Date().toString() + "\n" +
               "After Effects " + app.version + "\n" +
               "expression engine: " + String(app.project.expressionEngine) + "\n";
    var tail = "\n" + pass + " passed, " + fail + " failed\n";
    var out = new File(dir.fsName + "/relink-results.txt");
    out.lineFeed = "Unix";
    out.open("w");
    out.write(head + log.join("\n") + tail);
    out.close();
    // Set $.global.VXR_QUIET before running this to get the file and no
    // dialog, which is what a run driven from outside After Effects wants.
    if (!$.global.VXR_QUIET) {
        alert(pass + " passed, " + fail + " failed.\nWritten to relink-results.txt" +
              (err ? "\n\n" + err.toString() : ""));
    }

})();
