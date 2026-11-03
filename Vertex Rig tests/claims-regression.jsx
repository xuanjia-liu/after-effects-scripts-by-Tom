// Does the rig survive renaming and reordering, and refuse another tool's path?
(function () {
    var LOG = "/private/tmp/claude-501/-Users-xuanjialiu-Desktop-AE-pulgins-motion-tools-scripts/3c97244f-ff65-4368-9179-09b2fc849ba0/scratchpad/vxr-claims.log";
    var out = [], pass = 0, fail = 0;
    function w(s) { out.push(String(s)); }
    function ok(c, l, x) { if (c) { pass++; w("PASS  " + l); } else { fail++; w("FAIL  " + l + (x ? "   <- " + x : "")); } }
    function n2(v) { return Math.round(v * 100) / 100; }
    var comp = null;
    try {
        var f = new File("/Users/xuanjialiu/Desktop/AE pulgins/motion tools scripts/Vertex Rig.jsx");
        f.open("r"); var src = f.read(); f.close();
        var marker = "    loadPrefs();\n    buildUI(thisObj);";
        src = src.replace(marker, "    loadPrefs();\n    $.global.__VXR = { scanPaths: scanPaths," +
            " actCreate: actCreate, readManifest: readManifest, linkedLayer: linkedLayer," +
            " isForeignRig: isForeignRig, kindOf: kindOf, P: P, UI: UI };");
        eval(src);
        var V = $.global.__VXR;
        var said = ""; V.UI.say = function (m) { said = String(m); };

        comp = app.project.items.addComp("VXR CLAIMS", 1280, 720, 1, 10, 30);
        comp.openInViewer();
        function box(name, px) {
            var L = comp.layers.addShape();
            L.name = name;
            L.transform.position.setValue([px, 360]);
            var g = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
            g.name = "Shape";
            var v = g.property("ADBE Vectors Group");
            var sg = v.addProperty("ADBE Vector Shape - Group");
            var sh = new Shape();
            sh.vertices = [[-50,-50],[50,-50],[50,50],[-50,50]];
            sh.inTangents = [[0,0],[0,0],[0,0],[0,0]];
            sh.outTangents = [[0,0],[0,0],[0,0],[0,0]];
            sh.closed = true;
            sg.property("ADBE Vector Shape").setValue(sh);
            v.addProperty("ADBE Vector Graphic - Fill");
            return L;
        }

        // ---- rename and reorder ------------------------------------------
        w("--- rename and reorder ---------------------------------");
        var L = box("Art", 400);
        var items = V.scanPaths(comp, [L]);
        V.actCreate([{ item: items[0], idx: [0] }], false);
        items = V.scanPaths(comp, [L]);
        var man = V.readManifest(items[0].prop);
        var ctrl = V.linkedLayer(L, man.pts[0].fx);
        ok(!!ctrl, "the control is found to start with");

        function vertex0() {
            var it = V.scanPaths(comp, [L])[0];
            return it.prop.valueAtTime(0, false).vertices[0];
        }
        var v0 = vertex0();
        ctrl.transform.position.setValue(
            [ctrl.transform.position.value[0] + 40, ctrl.transform.position.value[1] - 25]);
        var moved = vertex0();
        ok(Math.abs(moved[0] - v0[0]) > 20, "and it drives the vertex",
           n2(v0[0]) + " -> " + n2(moved[0]));

        ctrl.name = "something else entirely";
        L.name = "renamed too";
        ok(!!V.linkedLayer(L, man.pts[0].fx), "renaming both layers keeps the link");

        ctrl.moveToBeginning();
        var after = comp.layer(1);
        ok(after.name === "something else entirely", "the control is now layer 1",
           after.name);
        var relinked = V.linkedLayer(L, man.pts[0].fx);
        ok(relinked !== null && relinked.id === ctrl.id,
           "and the link still resolves to it after reordering",
           relinked ? relinked.name : "lost");
        var stillThere = vertex0();
        ok(Math.abs(stillThere[0] - moved[0]) < 0.5 &&
           Math.abs(stillThere[1] - moved[1]) < 0.5,
           "the vertex has not budged through any of it",
           n2(stillThere[0]) + "," + n2(stillThere[1]));

        // ---- another tool's expression ------------------------------------
        w("");
        w("--- somebody else's rig --------------------------------");
        var O = box("Theirs", 900);
        var oItems = V.scanPaths(comp, [O]);
        oItems[0].prop.expression = "// SomeOtherTool\ncreatePath(points(), inTangents(), outTangents(), isClosed());";
        oItems = V.scanPaths(comp, [O]);
        ok(V.isForeignRig(oItems[0].prop) === true, "it reads as another tool's");
        var wasExpr = String(oItems[0].prop.expression);

        said = "";
        V.actCreate([{ item: oItems[0], idx: [0, 1] }], false);
        w("Create on it -> " + said);
        oItems = V.scanPaths(comp, [O]);
        ok(String(oItems[0].prop.expression) === wasExpr,
           "its expression is untouched");
        ok(V.readManifest(oItems[0].prop) === null, "and no rig was written over it");
        ok(/another tool/.test(said), "and it says why", said);
    } catch (big) {
        w("ERR " + String(big) + (big.line ? " (line " + big.line + ")" : ""));
        fail++;
    }
    try { if (comp) { comp.remove(); } } catch (e9) {}
    w(""); w(pass + " passed, " + fail + " failed");
    var lf = new File(LOG); lf.open("w"); lf.write(out.join("\n")); lf.close();
})();
