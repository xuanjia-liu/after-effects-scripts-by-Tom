// Editing points in the preview, checked against After Effects' own
// expression evaluator.
//
// Run with AE > File > Scripts > Run Script File. It builds its own
// compositions in a clearly named folder, removes them, restores the
// composition and selection that were open, and writes edit-results.txt
// beside this file. The project is not saved.
//
// What only After Effects can answer: whether a point dragged on screen
// really arrives there once the rig's expression has had its say. The node
// harness cannot evaluate an expression, so for a rigged point it can only
// check that the right thing was written. This runs the expression.
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
            '$.global.__VXR_EDIT = { P: P, UI: UI, scan: scanPaths, geomFor: geomFor,' +
            ' create: actCreate, pivot: actPivot, manifest: readManifest, kind: kindOf,' +
            ' move: actMovePoints, align: actAlign, xform: actTransform, curve: actCurve,' +
            ' linkedLayer: linkedLayer, itemMatrix: itemMatrix, mPt: mPt, mVec: mVec,' +
            ' mInv: mInv, rawShape: rawShape, tipVec: tipVec, tipKind: tipKind,' +
            ' bounds: boundsOfPicks, applyEdits: applyEdits, editsFor: editsFor,' +
            ' key: actKeyPaths, pointed: pointedPaths, reveal: revealKeyed,' +
            ' revealPaths: actRevealPaths };');
        eval(src);
        var V = $.global.__VXR_EDIT;
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

    // A layer whose group is turned and unevenly scaled, so every conversion
    // between composition pixels and the path's own units has work to do.
    // In an undo group of its own. Built outside one, After Effects
    // decides for itself which group these changes belong to, and that
    // decision depends on what ran before - so a later undo of a single
    // edit could take the whole composition with it.
    function makeComp(name, turned) {
        app.beginUndoGroup("VXR test fixture");
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
        if (turned) {
            var gt = g.property("ADBE Vector Transform Group");
            gt.property("ADBE Vector Position").setValue([25, -18]);
            gt.property("ADBE Vector Rotation").setValue(17);
            gt.property("ADBE Vector Scale").setValue([175, 68]);
            L.transform.rotation.setValue(-9);
            L.transform.scale.setValue([110, 92]);
        }
        app.endUndoGroup();
        return { comp: c, layer: L };
    }

    // Where the path's points actually are, after the rig has run: read the
    // evaluated value and push it out through the same matrices the panel
    // draws with.
    function evalVerts(V, item, t) {
        var sh = item.prop.valueAtTime(t, false);
        var m = V.itemMatrix(item, t), out = [];
        for (var i = 0; i < sh.vertices.length; i++) {
            out.push(V.mPt(m, sh.vertices[i]));
        }
        return out;
    }

    function evalTangent(V, item, i, side, t) {
        var sh = item.prop.valueAtTime(t, false);
        var m = V.itemMatrix(item, t);
        var v = (side === "in") ? sh.inTangents[i] : sh.outTangents[i];
        var a = V.mPt(m, sh.vertices[i]);
        var b = V.mPt(m, [sh.vertices[i][0] + v[0], sh.vertices[i][1] + v[1]]);
        return [b[0] - a[0], b[1] - a[1]];
    }

    function mapOf(V, item, t) {
        var out = {};
        out[item.key] = V.geomFor(item, t);
        return out;
    }

    function snap(sh) {
        var out = { v: [], i: [], o: [] };
        for (var n = 0; n < sh.vertices.length; n++) {
            out.v.push([sh.vertices[n][0], sh.vertices[n][1]]);
            out.i.push([sh.inTangents[n][0], sh.inTangents[n][1]]);
            out.o.push([sh.outTangents[n][0], sh.outTangents[n][1]]);
        }
        return out;
    }

    function sameSnap(a, b) {
        for (var n = 0; n < a.v.length; n++) {
            if (!near(a.v[n], b.v[n], 0.0005)) { return false; }
            if (!near(a.i[n], b.i[n], 0.0005)) { return false; }
            if (!near(a.o[n], b.o[n], 0.0005)) { return false; }
        }
        return true;
    }

    // ----------------------------------------------------------- the cases

    // An unrigged path: the move is written into the path's own value.
    function casePlain(V) {
        say("\nCASE plain path, turned and unevenly scaled group");
        var made = makeComp("VXR edit - plain", true);
        var item = V.scan(made.comp, [made.layer])[0];
        var was = evalVerts(V, item, 0);
        var d = [23, -14];
        V.move([{ item: item, idx: [1] }], mapOf(V, item, 0), d);

        item = V.scan(made.comp, [made.layer])[0];
        var now = evalVerts(V, item, 0);
        check(near(now[1], [was[1][0] + d[0], was[1][1] + d[1]]),
              "the point lands exactly where it was dragged",
              "expected " + fmt([was[1][0] + d[0], was[1][1] + d[1]]) +
              " actual " + fmt(now[1]));
        var still = true;
        for (var i = 0; i < was.length; i++) {
            if (i === 1) { continue; }
            if (!near(now[i], was[i], 0.0005)) { still = false; }
        }
        check(still, "and nothing else on the path moved");
    }

    // A rigged point: the control moves, and the path's own value is left
    // for the expression to go on reading.
    function caseRigged(V) {
        say("\nCASE rigged point, its own control layer");
        var made = makeComp("VXR edit - rigged", true);
        var item = V.scan(made.comp, [made.layer])[0];
        V.create([{ item: item, idx: [0, 2] }], false, []);
        item = V.scan(made.comp, [made.layer])[0];

        var man = V.manifest(item.prop);
        check(!!man && man.pts.length === 2, "two points are rigged");
        var ctrl = V.linkedLayer(item.layer, man.pts[0].fx);
        var posWas = ctrl.transform.position.valueAtTime(0, true);
        var rawWas = snap(V.rawShape(made.comp, item.prop));
        var was = evalVerts(V, item, 0);
        var d = [-17, 31];

        V.move([{ item: item, idx: [man.pts[0].i] }], mapOf(V, item, 0), d);
        item = V.scan(made.comp, [made.layer])[0];
        var now = evalVerts(V, item, 0);
        var at = man.pts[0].i;

        check(!item.prop.expressionError,
              "the expression still runs", item.prop.expressionError);
        check(near(now[at], [was[at][0] + d[0], was[at][1] + d[1]]),
              "the rigged point lands where it was dragged, once the rig has run",
              "expected " + fmt([was[at][0] + d[0], was[at][1] + d[1]]) +
              " actual " + fmt(now[at]));
        var posNow = ctrl.transform.position.valueAtTime(0, true);
        check(near([posNow[0] - posWas[0], posNow[1] - posWas[1]], d),
              "its control layer moved by the drag and no more",
              fmt([posNow[0] - posWas[0], posNow[1] - posWas[1]]));
        check(sameSnap(rawWas, snap(V.rawShape(made.comp, item.prop))),
              "and the path's own value was not written");
    }

    // A point gathered into a Pivot: its place in the Pivot's frame moves,
    // the Pivot does not, and the points riding with it stay put.
    function casePivot(V) {
        say("\nCASE point held in a Pivot's frame");
        var made = makeComp("VXR edit - pivot", true);
        var item = V.scan(made.comp, [made.layer])[0];
        V.P.pivotMode = "pivot";
        V.pivot([{ item: item, idx: [0, 1, 2, 3] }], []);
        item = V.scan(made.comp, [made.layer])[0];

        var piv = null, i;
        for (i = 1; i <= made.comp.numLayers; i++) {
            if (V.kind(made.comp.layer(i)) === "pivot") { piv = made.comp.layer(i); }
        }
        check(!!piv, "a Pivot was made");
        if (!piv) { return; }

        // Turned and scaled, so the Pivot's own frame is not the comp's.
        piv.transform.rotation.setValue(23);
        piv.transform.scale.setValue([160, 70]);

        var pivWas = piv.transform.position.valueAtTime(0, true);
        var was = evalVerts(V, item, 0);
        var d = [19, 12];
        V.move([{ item: item, idx: [2] }], mapOf(V, item, 0), d);
        item = V.scan(made.comp, [made.layer])[0];
        var now = evalVerts(V, item, 0);

        check(!item.prop.expressionError,
              "the rewritten expression runs", item.prop.expressionError);
        check(near(now[2], [was[2][0] + d[0], was[2][1] + d[1]]),
              "the point lands where it was dragged, through a turned Pivot",
              "expected " + fmt([was[2][0] + d[0], was[2][1] + d[1]]) +
              " actual " + fmt(now[2]));
        var others = true;
        for (i = 0; i < was.length; i++) {
            if (i === 2) { continue; }
            if (!near(now[i], was[i], 0.002)) { others = false; }
        }
        check(others, "the other points riding on it stayed where they were");
        var pivNow = piv.transform.position.valueAtTime(0, true);
        check(near(pivNow, pivWas, 0.0005), "and the Pivot itself did not move");
    }

    // A handle, dragged. Every way a tangent can be driven, in turn.
    function caseHandles(V, mode) {
        say("\nCASE handles as " + mode);
        var made = makeComp("VXR edit - handles " + mode, true);
        var item = V.scan(made.comp, [made.layer])[0];

        // Point 1 is bound only: it has a control but no handle controls.
        V.create([{ item: item, idx: [1] }], false, []);
        item = V.scan(made.comp, [made.layer])[0];
        var man = V.manifest(item.prop);
        check(V.tipKind(man.pts[0], "out") === "bound",
              "a rigged point with no handle controls is bound",
              V.tipKind(man.pts[0], "out"));
        var want = [46, -21];
        V.curve(item, mapOf(V, item, 0), 1, { out: want });
        item = V.scan(made.comp, [made.layer])[0];
        check(!item.prop.expressionError, "the expression runs",
              item.prop.expressionError);
        var got = evalTangent(V, item, 1, "out", 0);
        check(near(got, want, 0.08),
              "a bound tangent comes out where it was dragged",
              "expected " + fmt(want) + " actual " + fmt(got));

        // Point 3 gets handle controls, of the mode under test.
        V.P.handleMode = mode;
        V.create([{ item: item, idx: [3] }], true, []);
        item = V.scan(made.comp, [made.layer])[0];
        man = V.manifest(item.prop);
        var e3 = null, n;
        for (n = 0; n < man.pts.length; n++) { if (man.pts[n].i === 3) { e3 = man.pts[n]; } }
        check(!!e3 && V.tipKind(e3, "in") === (mode === "masks" ? "mask" : "layer"),
              "its in handle is a " + mode.substring(0, mode.length - 1),
              e3 ? V.tipKind(e3, "in") : "no entry");

        var want2 = [-38, 27];
        V.curve(item, mapOf(V, item, 0), 3, { "in": want2 });
        item = V.scan(made.comp, [made.layer])[0];
        check(!item.prop.expressionError, "the expression still runs",
              item.prop.expressionError);
        var got2 = evalTangent(V, item, 3, "in", 0);
        check(near(got2, want2, 0.08),
              "a handle on a " + mode.substring(0, mode.length - 1) +
              " comes out where it was dragged",
              "expected " + fmt(want2) + " actual " + fmt(got2));
    }

    // Alignment moves points and leaves curves alone; the transform box
    // carries both.
    function caseAlignAndBox(V) {
        say("\nCASE alignment and the transform box");
        var made = makeComp("VXR edit - align", true);
        var item = V.scan(made.comp, [made.layer])[0];
        var picks = [{ item: item, idx: [0, 1, 2] }];
        var map = mapOf(V, item, 0);
        var b = V.bounds(picks, map);
        var rawWas = snap(V.rawShape(made.comp, item.prop));

        V.align(picks, map, "t");
        item = V.scan(made.comp, [made.layer])[0];
        var now = evalVerts(V, item, 0);
        check(Math.abs(now[0][1] - b.miny) < 0.05 &&
              Math.abs(now[1][1] - b.miny) < 0.05 &&
              Math.abs(now[2][1] - b.miny) < 0.05,
              "the three picked points share their top edge",
              [now[0][1], now[1][1], now[2][1]].join(" ") + " for " + b.miny);
        var rawNow = snap(V.rawShape(made.comp, item.prop));
        var held = true;
        for (var n = 0; n < rawWas.i.length; n++) {
            if (!near(rawWas.i[n], rawNow.i[n], 0.0005)) { held = false; }
            if (!near(rawWas.o[n], rawNow.o[n], 0.0005)) { held = false; }
        }
        check(held, "and every tangent came out untouched");

        // A quarter turn about the middle of the selection.
        var made2 = makeComp("VXR edit - box", true);
        var item2 = V.scan(made2.comp, [made2.layer])[0];
        var picks2 = [{ item: item2, idx: [0, 1, 2, 3] }];
        var map2 = mapOf(V, item2, 0);
        var b2 = V.bounds(picks2, map2);
        var c2 = [(b2.minx + b2.maxx) / 2, (b2.miny + b2.maxy) / 2];
        var was2 = evalVerts(V, item2, 0);
        var tipWas = V.tipVec(map2[item2.key], 1, "out");

        V.xform(picks2, map2, [0, 1, -1, 0, 0, 0], c2);
        item2 = V.scan(made2.comp, [made2.layer])[0];
        var now2 = evalVerts(V, item2, 0);
        var turned = true;
        for (n = 0; n < was2.length; n++) {
            var dx = was2[n][0] - c2[0], dy = was2[n][1] - c2[1];
            if (!near(now2[n], [c2[0] - dy, c2[1] + dx], 0.05)) { turned = false; }
        }
        check(turned, "every point lands on the quarter turn");
        var tipNow = evalTangent(V, item2, 1, "out", 0);
        check(near(tipNow, [-tipWas[1], tipWas[0]], 0.08),
              "and its handle turned with it, so the curve kept its shape",
              "expected " + fmt([-tipWas[1], tipWas[0]]) + " actual " + fmt(tipNow));
    }

    // A path that already carries keyframes gets one at the current time.
    function caseKeys(V) {
        say("\nCASE a path with keyframes");
        var made = makeComp("VXR edit - keys", false);
        var item = V.scan(made.comp, [made.layer])[0];
        var wide = curvy();
        wide.vertices = [[-60, -35], [75, -40], [65, 48], [-55, 40]];
        item.prop.setValueAtTime(0, curvy());
        item.prop.setValueAtTime(1, wide);
        made.comp.time = 0.5;
        var keysWas = item.prop.numKeys;
        var was = evalVerts(V, item, 0.5);

        V.move([{ item: item, idx: [0] }], mapOf(V, item, 0.5), [21, 0]);
        item = V.scan(made.comp, [made.layer])[0];

        check(item.prop.numKeys === keysWas + 1,
              "a key appears at the current time",
              item.prop.numKeys + " from " + keysWas);
        var now = evalVerts(V, item, 0.5);
        check(near(now[0], [was[0][0] + 21, was[0][1]]),
              "holding the move", fmt(now[0]));
        var ends = evalVerts(V, item, 1);
        check(near(ends[0], [480 - 60, 270 - 35], 0.05),
              "and the keyframes that were there still say what they said",
              fmt(ends[0]));
    }

    // Keying, and which paths a selected shape group means. Only After
    // Effects can say whether its own selection behaves this way.
    function caseKeyScope(V) {
        say("\nCASE Keyframe, scoped by what the timeline points at");
        var made = makeComp("VXR edit - key scope", false);
        var root = made.layer.property("ADBE Root Vectors Group");
        var g2 = root.addProperty("ADBE Vector Group");
        g2.name = "Second";
        var v2 = g2.property("ADBE Vectors Group");
        v2.addProperty("ADBE Vector Shape - Group")
          .property("ADBE Vector Shape").setValue(curvy());
        v2.addProperty("ADBE Vector Graphic - Fill");

        var items = V.scan(made.comp, [made.layer]);
        check(items.length === 2, "the layer offers two paths", items.length);
        var one = null, two = null, i;
        for (i = 0; i < items.length; i++) {
            if (items[i].chain[0] === "Geometry") { one = items[i]; }
            if (items[i].chain[0] === "Second") { two = items[i]; }
        }
        if (!one || !two) { check(false, "one path in each group"); return; }

        made.layer.selected = true;
        check(V.pointed(items).length === 2,
              "with the layer alone selected, both paths count",
              V.pointed(items).length);

        // Selecting the group also selects the layer - After Effects cannot
        // keep them apart - so the group is the only thing that can narrow it.
        g2.selected = true;
        var pointed = V.pointed(items);
        check(pointed.length === 1 && pointed[0].chain[0] === "Second",
              "a selected shape group narrows it to that shape",
              pointed.length + " path(s)");

        made.comp.time = 0.5;
        V.key(pointed);
        check(two.prop.numKeys === 1 && one.prop.numKeys === 0,
              "and only that one is keyed",
              two.prop.numKeys + " keyed, " + one.prop.numKeys + " left alone");

        var threw = "";
        try { V.reveal(pointed); } catch (eR) { threw = eR.toString(); }
        check(threw === "",
              "the reveal after keying runs without complaint (its effect is on screen)",
              threw);

        // Reveal on its own, both ways round. The keyed path takes the tidy
        // command; the one with no key of its own needs the wider one.
        var said = "";
        var prev = V.UI.say;
        V.UI.say = function (m) { said = String(m); };
        threw = "";
        try { V.revealPaths([two]); } catch (eR2) { threw = eR2.toString(); }
        check(threw === "" && /Opened 1 path in the timeline/.test(said),
              "Reveal opens a keyframed path on its own",
              threw || said);
        threw = "";
        said = "";
        try { V.revealPaths([one]); } catch (eR3) { threw = eR3.toString(); }
        check(threw === "" && /everything else modified/.test(said),
              "and says so when an unkeyed one brings the layer's others with it",
              threw || said);
        V.UI.say = prev;
        check(one.prop.numKeys === 0, "Reveal keyed nothing on the way",
              one.prop.numKeys);
        made.comp.time = 0;
    }

    // Things it must refuse rather than get wrong.
    function caseRefusals(V) {
        say("\nCASE what it refuses");
        var made = makeComp("VXR edit - refusals", false);
        var item = V.scan(made.comp, [made.layer])[0];
        var map = mapOf(V, item, 0);

        item.prop.expression = "value";
        var rawWas = snap(item.prop.value);
        var r = V.applyEdits(made.comp, V.editsFor([{ item: item, idx: [0] }], map,
            function (at) { return { pt: [at[0] + 20, at[1]] }; }));
        check(r.foreign === 1 && r.moved === 0,
              "another tool's expression is left alone",
              r.foreign + " foreign, " + r.moved + " moved");
        check(sameSnap(rawWas, snap(item.prop.value)),
              "and its path is not written");
        item.prop.expression = "";

        var g = made.layer.property("ADBE Root Vectors Group").property("Geometry");
        g.property("ADBE Vector Transform Group")
         .property("ADBE Vector Skew").setValue(22);
        r = V.applyEdits(made.comp, V.editsFor([{ item: item, idx: [0] }], map,
            function (at) { return { pt: [at[0] + 20, at[1]] }; }));
        check(r.skewed === 1 && r.moved === 0,
              "a group with Skew on it is refused, not guessed at",
              r.skewed + " skewed, " + r.moved + " moved");
    }

    // ---------------------------------------------------------------- run
    // No undo group around the whole run. Every action under test opens and
    // closes one of its own, and wrapping those in an outer group leaves the
    // begin/end calls unbalanced - which hands the NEXT script to run a
    // grouping state where one undo swallows far more than it should. That
    // cost a confusing hour: this suite passed alone and failed when it ran
    // second.
    var err = null;
    try {
        app.beginUndoGroup("VXR edit QA folder");
        folder = app.project.items.addFolder("VXR edit QA");
        app.endUndoGroup();
        var V = load();
        casePlain(V);
        caseRigged(V);
        casePivot(V);
        caseHandles(V, "masks");
        caseHandles(V, "layers");
        caseAlignAndBox(V);
        caseKeys(V);
        caseKeyScope(V);
        caseRefusals(V);
    } catch (e) {
        err = e;
        say("\nTHREW " + e.toString() + (e.line ? " at line " + e.line : ""));
        fail++;
    }

    // Take the test compositions away again, whatever happened.
    try {
        if (folder) {
            app.beginUndoGroup("VXR edit QA cleanup");
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

    var head = "Vertex Rig - editing points in the preview\n" +
               new Date().toString() + "\n" +
               "After Effects " + app.version + "\n" +
               "expression engine: " + String(app.project.expressionEngine) + "\n";
    var tail = "\n" + pass + " passed, " + fail + " failed\n";
    var out = new File(dir.fsName + "/edit-results.txt");
    out.open("w");
    out.write(head + log.join("\n") + tail);
    out.close();
    // Set $.global.VXR_QUIET before running this to get the file and no
    // dialog, which is what a run driven from outside After Effects wants.
    if (!$.global.VXR_QUIET) {
        alert(pass + " passed, " + fail + " failed.\nWritten to edit-results.txt" +
              (err ? "\n\n" + err.toString() : ""));
    }

})();
