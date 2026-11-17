// Does editing in the preview undo cleanly?
//
// Run with AE > File > Scripts > Run Script File. Writes undo-results.txt
// beside this file. Set $.global.VXR_QUIET first for no dialog.
//
// WHY THIS IS CAREFUL ABOUT UNDO
//   The panel shares one undo stack with whatever the user was doing before
//   it ran. An Undo that fires when the action under test changed nothing
//   would reach past this script and into their work, and truncate their
//   redo history on the way. So the protocol here is strict:
//
//     1. record the state
//     2. do the action
//     3. if nothing changed, DO NOT undo - report it and move on
//     4. otherwise undo exactly once, and check the state came back
//     5. if it did not come back, STOP undoing - never a second guess
//
//   Nothing here undoes speculatively, and nothing undoes twice.
//
// File must stay pure ASCII: After Effects reads .jsx as Latin-1.
(function () {

    var dir = File($.fileName).parent;
    var original = app.project.activeItem;
    var savedSel = (original instanceof CompItem) ? original.selectedLayers : [];
    var log = [], pass = 0, fail = 0, folder = null, halted = false;

    function say(s) { log.push(String(s)); }
    function check(ok, label, detail) {
        if (ok) { pass++; } else { fail++; }
        say((ok ? "PASS " : "FAIL ") + label + (detail ? "  | " + detail : ""));
    }

    function undoOnce() {
        try { app.executeCommand(16); return; } catch (e) {}
        try { app.executeCommand(app.findMenuCommandId("Undo")); } catch (e2) {}
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
            '$.global.__VXR_UNDO = { P: P, UI: UI, scan: scanPaths, geomFor: geomFor,' +
            ' create: actCreate, pivot: actPivot, manifest: readManifest,' +
            ' move: actMovePoints, align: actAlign, xform: actTransform, curve: actCurve,' +
            ' key: actKeyPaths, reveal: revealKeyed, revealPaths: actRevealPaths,' +
            ' bounds: boundsOfPicks, linkedLayer: linkedLayer };');
        eval(src);
        var V = $.global.__VXR_UNDO;
        V.UI.say = function () {};
        V.UI.refresh = function () {};
        return V;
    }

    function curvy() {
        var s = new Shape();
        s.closed = true;
        s.vertices = [[-40, -25], [55, -30], [45, 38], [-35, 30]];
        s.inTangents = [[0, 0], [-18, -12], [0, -16], [-10, 0]];
        s.outTangents = [[22, 0], [8, 15], [-16, 9], [0, 0]];
        return s;
    }

    // In an undo group of its own. Built outside one, After Effects
    // decides for itself which group these changes belong to, and that
    // decision depends on what ran before - so a later undo of a single
    // edit could take the whole composition with it.
    function makeComp(name) {
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
        var gt = g.property("ADBE Vector Transform Group");
        gt.property("ADBE Vector Rotation").setValue(17);
        gt.property("ADBE Vector Scale").setValue([175, 68]);
        app.endUndoGroup();
        return { comp: c, layer: L };
    }

    // Everything an edit could have touched, as one string: the path value,
    // the expression on it, its keyframes, and where the rig's layers stand.
    function stateOf(comp, item) {
        var bits = [], i, k;
        var sh;
        try { sh = item.prop.valueAtTime(0, false); } catch (e) { return "unreadable"; }
        for (i = 0; i < sh.vertices.length; i++) {
            bits.push(Math.round(sh.vertices[i][0] * 1000) + "," +
                      Math.round(sh.vertices[i][1] * 1000) + ";" +
                      Math.round(sh.inTangents[i][0] * 1000) + "," +
                      Math.round(sh.inTangents[i][1] * 1000) + ";" +
                      Math.round(sh.outTangents[i][0] * 1000) + "," +
                      Math.round(sh.outTangents[i][1] * 1000));
        }
        bits.push("keys=" + item.prop.numKeys);
        bits.push("expOn=" + (item.prop.expressionEnabled ? 1 : 0));
        bits.push("exp=" + String(item.prop.expression || "").length);
        bits.push("layers=" + comp.numLayers);
        for (k = 1; k <= comp.numLayers; k++) {
            var L = comp.layer(k);
            var p = L.transform.position.valueAtTime(0, false);
            bits.push(L.name + "@" + Math.round(p[0] * 100) + "," + Math.round(p[1] * 100));
        }
        return bits.join("|");
    }

    function mapOf(V, item) {
        var out = {};
        out[item.key] = V.geomFor(item, 0);
        return out;
    }

    // The whole protocol, in one place. Returns the item again, since an
    // action that restructures the layer makes the old reference stale.
    function cycle(V, name, made, getItem, doIt) {
        if (halted) { say("  (skipped " + name + ": undo stopped being trustworthy)"); return getItem(); }
        var item = getItem();
        var before = stateOf(made.comp, item);
        doIt(item);
        item = getItem();
        var after = stateOf(made.comp, item);
        if (before === after) {
            check(false, name + ": the action changed nothing, so undo was not tried");
            return item;
        }
        check(true, name + ": the action changed something to undo");
        undoOnce();
        item = getItem();
        var back = stateOf(made.comp, item);
        if (back !== before) {
            check(false, name + ": one undo puts it back exactly",
                  "still differs - no second undo attempted, that would reach past this script");
            halted = true;
        } else {
            check(true, name + ": one undo puts it back exactly");
        }
        return item;
    }

    function firstItem(V, made) {
        return function () { return V.scan(made.comp, [made.layer])[0]; };
    }

    // ----------------------------------------------------------- the cases
    function caseEdits(V) {
        say("\nCASE one undo per edit");
        var made = makeComp("VXR undo - edits");
        var get = firstItem(V, made);

        cycle(V, "move a point", made, get, function (item) {
            V.move([{ item: item, idx: [1] }], mapOf(V, item), [23, -14]);
        });

        cycle(V, "align three points", made, get, function (item) {
            V.align([{ item: item, idx: [0, 1, 2] }], mapOf(V, item), "t");
        });

        cycle(V, "turn with the transform box", made, get, function (item) {
            var picks = [{ item: item, idx: [0, 1, 2, 3] }];
            var map = mapOf(V, item);
            var b = V.bounds(picks, map);
            V.xform(picks, map, [0, 1, -1, 0, 0, 0],
                    [(b.minx + b.maxx) / 2, (b.miny + b.maxy) / 2]);
        });

        cycle(V, "reshape a curve", made, get, function (item) {
            V.curve(item, mapOf(V, item), 1, { out: [46, -21] });
        });

        cycle(V, "a path keyframe", made, get, function (item) {
            made.comp.time = 0.5;
            V.key([item]);
            made.comp.time = 0;
        });
    }

    // The one that worries: a rigged path has its expression switched off for
    // the single write and back on after. An undo must not leave it off.
    function caseRigged(V) {
        say("\nCASE a rigged path keeps its expression across an undo");
        var made = makeComp("VXR undo - rigged");
        var get = firstItem(V, made);
        var item = get();
        V.create([{ item: item, idx: [0, 2] }], false, []);
        item = get();

        check(item.prop.expressionEnabled === true, "the rig is live to start with");
        var expWas = String(item.prop.expression || "");

        cycle(V, "move an unrigged point on a rigged path", made, get, function (it) {
            V.move([{ item: it, idx: [1] }], mapOf(V, it), [18, 9]);
        });
        item = get();
        check(item.prop.expressionEnabled === true,
              "the expression is still switched on after the undo");
        check(String(item.prop.expression || "") === expWas,
              "and reads exactly as it did");
        check(!item.prop.expressionError,
              "and still runs", item.prop.expressionError);

        cycle(V, "move a rigged point, which moves its control", made, get, function (it) {
            V.move([{ item: it, idx: [0] }], mapOf(V, it), [-17, 31]);
        });
        item = get();
        check(String(item.prop.expression || "") === expWas,
              "the manifest is unchanged by that round trip too");
    }

    // A Pivot point rewrites the expression rather than the path.
    function casePivot(V) {
        say("\nCASE a Pivot point, where the expression is what changes");
        var made = makeComp("VXR undo - pivot");
        var get = firstItem(V, made);
        var item = get();
        V.P.pivotMode = "pivot";
        V.pivot([{ item: item, idx: [0, 1, 2, 3] }], []);

        cycle(V, "move a point held in a Pivot", made, get, function (it) {
            V.move([{ item: it, idx: [2] }], mapOf(V, it), [19, 12]);
        });
        item = get();
        check(!item.prop.expressionError,
              "the expression still runs after the undo", item.prop.expressionError);
        var man = V.manifest(item.prop);
        check(!!man && man.pts.length === 4,
              "and the manifest still holds all four points",
              man ? man.pts.length : "none");
    }

    // Reveal must cost nothing: it only selects and twirls. If it quietly
    // took an undo step, the next Undo a user pressed would appear to do
    // nothing and they would press again - into their own work.
    function caseReveal(V) {
        say("\nCASE Reveal and the keyframe reveal cost no undo step");
        var made = makeComp("VXR undo - reveal");
        var get = firstItem(V, made);
        var item = get();

        var before = stateOf(made.comp, item);
        V.revealPaths([item]);
        item = get();
        check(stateOf(made.comp, item) === before,
              "Reveal changes nothing in the document, so there is nothing to undo");

        // Key it, then reveal: one undo must take the keyframe off, which it
        // can only do if the reveal did not land on top of it.
        made.comp.time = 0.5;
        var keyed = cycle(V, "Keyframe with the reveal that follows it", made, get,
            function (it) {
                V.key([it]);
                V.reveal([it]);
            });
        made.comp.time = 0;
        check(keyed.prop.numKeys === 0,
              "the keyframe is gone after that one undo", keyed.prop.numKeys);
    }

    // ---------------------------------------------------------------- run
    var err = null;
    try {
        app.beginUndoGroup("Vertex Rig undo regression setup");
        folder = app.project.items.addFolder("VXR undo QA");
        app.endUndoGroup();
        var V = load();
        caseEdits(V);
        caseRigged(V);
        casePivot(V);
        caseReveal(V);
    } catch (e) {
        err = e;
        say("\nTHREW " + e.toString() + (e.line ? " at line " + e.line : ""));
        fail++;
    }

    // Removed outright rather than undone: undoing the setup would mean
    // guessing how many steps to take back, which is the thing this file
    // exists to avoid doing.
    try {
        if (folder) {
            app.beginUndoGroup("Vertex Rig undo regression cleanup");
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

    var head = "Vertex Rig - undo behaviour of editing in the preview\n" +
               new Date().toString() + "\nAfter Effects " + app.version + "\n";
    var tail = "\n" + pass + " passed, " + fail + " failed" +
               (halted ? "\nSTOPPED EARLY: an undo did not restore, and no second was tried.\n" : "\n");
    var out = new File(dir.fsName + "/undo-results.txt");
    out.open("w");
    out.write(head + log.join("\n") + tail);
    out.close();
    if (!$.global.VXR_QUIET) {
        alert(pass + " passed, " + fail + " failed.\nWritten to undo-results.txt" +
              (err ? "\n\n" + err.toString() : ""));
    }

})();
