// Where does a Pivot actually turn and zoom about, once Pivot Offset is moved?
// Solve for the implied centre from where a child lands, rather than trusting
// the expressions: rotation about C gives w = C + R(w0-C), scale k about C
// gives w = C + k(w0-C), and both invert for C.
(function () {
    var LOG = "/private/tmp/claude-501/-Users-xuanjialiu-Desktop-AE-pulgins-motion-tools-scripts/3c97244f-ff65-4368-9179-09b2fc849ba0/scratchpad/vxr-pivctr.log";
    var out = [], pass = 0, fail = 0;
    function w(s) { out.push(String(s)); }
    function ok(c, l, x) { if (c) { pass++; w("PASS  " + l); } else { fail++; w("FAIL  " + l + (x !== undefined ? "   <- " + x : "")); } }
    function n2(v) { return Math.round(v * 100) / 100; }
    function pt(p) { return "[" + n2(p[0]) + ", " + n2(p[1]) + "]"; }
    var comp = null;
    try {
        var f = new File("/Users/xuanjialiu/Desktop/AE pulgins/motion tools scripts/Vertex Rig.jsx");
        f.encoding = "UTF-8"; f.open("r"); var src = f.read(); f.close();
        src = src.replace("    loadPrefs();\n    buildUI(thisObj);",
            "    loadPrefs();\n    $.global.__VXR = { scanPaths: scanPaths, actCreate: actCreate," +
            " actPivot: actPivot, kindOf: kindOf, P: P, findEffect: findEffect," +
            " childrenOf: childrenOf, UI: UI, mPt: mPt, layerMatrix: layerMatrix };");
        eval(src);
        var V = $.global.__VXR;
        V.UI.say = function () {};
        V.P.pivotMode = "points";   // per-point controls, so there are children to watch

        comp = app.project.items.addComp("VXR PIVCTR", 1280, 720, 1, 10, 30);
        comp.openInViewer();

        var L = comp.layers.addShape();
        L.name = "Art";
        L.transform.position.setValue([640, 360]);
        var g = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        g.name = "Group 1";
        var vg = g.property("ADBE Vectors Group");
        var sg = vg.addProperty("ADBE Vector Shape - Group");
        var sh = new Shape();
        sh.vertices = [[-100, -100], [100, -100], [100, 100], [-100, 100]];
        sh.inTangents = [[0,0],[0,0],[0,0],[0,0]];
        sh.outTangents = [[0,0],[0,0],[0,0],[0,0]];
        sh.closed = true;
        sg.property("ADBE Vector Shape").setValue(sh);
        vg.addProperty("ADBE Vector Graphic - Stroke");

        var items = V.scanPaths(comp, [L]);
        V.actPivot([{ item: items[0], idx: [0, 1, 2, 3] }], []);

        var piv = null;
        for (var i = 1; i <= comp.numLayers; i++) {
            if (V.kindOf(comp.layer(i)) === "pivot") { piv = comp.layer(i); }
        }
        ok(piv !== null, "a pivot was made");
        var kids = V.childrenOf(comp, piv);
        ok(kids.length >= 1, "with children to watch", kids.length);
        var kid = kids[0];

        function kidAt() { return V.mPt(V.layerMatrix(kid, comp.time), [0, 0]); }
        function pivPos() { return piv.transform.position.valueAtTime(comp.time, false); }

        var off = V.findEffect(piv, "VXR Pivot Offset");
        ok(off !== null, "and a Pivot Offset control");

        var D = [120, 0];
        w("");
        w("rest pivot position (no offset): " + pt(pivPos()));
        var kid0 = kidAt();
        off.property(1).setValue(D);
        var marker = pivPos();
        var kid1 = kidAt();
        w("offset " + pt(D) + " -> marker at " + pt(marker));
        ok(Math.abs(kid1[0]-kid0[0]) < 0.01 && Math.abs(kid1[1]-kid0[1]) < 0.01,
           "dragging the offset leaves the artwork where it was", pt(kid0) + " -> " + pt(kid1));

        // --- where does it TURN about? -------------------------------------
        var w0 = kidAt();
        piv.transform.rotation.setValue(90);
        var w1 = kidAt();
        piv.transform.rotation.setValue(0);
        // C = (I-R)^-1 (w1 - R w0); for 90 deg, R = [[0,-1],[1,0]]
        var Rw0 = [-w0[1], w0[0]];
        var a = [w1[0] - Rw0[0], w1[1] - Rw0[1]];
        // (I-R) = [[1,1],[-1,1]]; inverse = 1/2 [[1,-1],[1,1]]
        var Crot = [(a[0] - a[1]) / 2, (a[0] + a[1]) / 2];
        w("");
        w("turning 90 deg puts the child at " + pt(w1) + "  => it turned about " + pt(Crot));

        // --- where does it ZOOM about? -------------------------------------
        piv.transform.scale.setValue([200, 200]);
        var w2 = kidAt();
        piv.transform.scale.setValue([100, 100]);
        var k = 2;
        var Cscl = [(w2[0] - k * w0[0]) / (1 - k), (w2[1] - k * w0[1]) / (1 - k)];
        w("zooming to 200% puts it at " + pt(w2) + "  => it zoomed about " + pt(Cscl));
        w("");

        ok(Math.abs(Crot[0] - marker[0]) < 0.5 && Math.abs(Crot[1] - marker[1]) < 0.5,
           "rotation turns about the offset marker", "turned about " + pt(Crot) + ", marker " + pt(marker));
        ok(Math.abs(Cscl[0] - marker[0]) < 0.5 && Math.abs(Cscl[1] - marker[1]) < 0.5,
           "scale zooms about the offset marker", "zoomed about " + pt(Cscl) + ", marker " + pt(marker));

        // --- turning and zooming together ----------------------------------
        piv.transform.rotation.setValue(90);
        piv.transform.scale.setValue([200, 200]);
        var w3 = kidAt();
        piv.transform.rotation.setValue(0);
        piv.transform.scale.setValue([100, 100]);
        // M = 2 * R90 = [[0,-2],[2,0]];  C = (I-M)^-1 (w3 - M w0)
        var Mw0 = [-2 * w0[1], 2 * w0[0]];
        var r3 = [w3[0] - Mw0[0], w3[1] - Mw0[1]];
        // (I-M) = [[1,2],[-2,1]]; inverse = 1/5 [[1,-2],[2,1]]
        var Cboth = [(r3[0] - 2 * r3[1]) / 5, (2 * r3[0] + r3[1]) / 5];
        w("90 deg at 200% puts it at " + pt(w3) + "  => centred on " + pt(Cboth));
        ok(Math.abs(Cboth[0] - marker[0]) < 0.5 && Math.abs(Cboth[1] - marker[1]) < 0.5,
           "both at once still centre on the marker", pt(Cboth));

        // --- where is the marker actually DRAWN? ---------------------------
        // Not the position property - the artwork. It is a point in the layer
        // like any other, so push it through the layer's own matrix.
        function drawnAt() {
            var gp = piv.property("ADBE Root Vectors Group").property("Marker")
                        .property("ADBE Vector Transform Group")
                        .property("ADBE Vector Position").valueAtTime(comp.time, false);
            return V.mPt(V.layerMatrix(piv, comp.time), [gp[0], gp[1]]);
        }
        w("");
        w("the marker is drawn at " + pt(drawnAt()) + ", and it turns about " + pt(marker));
        ok(Math.abs(drawnAt()[0] - marker[0]) < 0.5 && Math.abs(drawnAt()[1] - marker[1]) < 0.5,
           "the pivot you can see is the pivot you get", pt(drawnAt()));

        piv.transform.rotation.setValue(90);
        var dR = drawnAt();
        piv.transform.rotation.setValue(0);
        piv.transform.scale.setValue([200, 200]);
        var dS = drawnAt();
        piv.transform.scale.setValue([100, 100]);
        ok(Math.abs(dR[0]-marker[0]) < 0.5 && Math.abs(dR[1]-marker[1]) < 0.5,
           "turning the pivot leaves the marker sitting on the centre", pt(dR));
        ok(Math.abs(dS[0]-marker[0]) < 0.5 && Math.abs(dS[1]-marker[1]) < 0.5,
           "and so does zooming it", pt(dS));

        // with no offset at all it must still sit where it always did
        off.property(1).setValue([0, 0]);
        ok(Math.abs(drawnAt()[0] - 640) < 0.5 && Math.abs(drawnAt()[1] - 360) < 0.5,
           "with the offset back at zero it is home again", pt(drawnAt()));
        off.property(1).setValue(D);

        // --- the cost, stated plainly --------------------------------------
        // At the rest pose nothing stirs when the offset moves - that is the
        // case above. Drag it while the pivot is already zoomed and the
        // artwork does move, by the part of the transform it now sits inside.
        w("");
        piv.transform.scale.setValue([200, 200]);
        var before = kidAt();
        off.property(1).setValue([D[0] + 50, D[1]]);
        var after = kidAt();
        off.property(1).setValue(D);
        piv.transform.scale.setValue([100, 100]);
        var drift = Math.sqrt(Math.pow(after[0]-before[0], 2) + Math.pow(after[1]-before[1], 2));
        w("the cost: nudging the offset 50px while the pivot sits at 200%");
        w("          moves the artwork " + n2(drift) + "px (50 * |1 - 2| = 50)");
        ok(Math.abs(drift - 50) < 0.5,
           "and it is exactly the scale it now sits inside, not a surprise", drift);

        // --- an older pivot is put right when touched ----------------------
        piv.transform.anchorPoint.expression =
            'var d = effect("VXR Pivot Offset")("Point");\n' +
            'var k = scale / 100;\n' +
            'value + [k[0] == 0 ? 0 : d[0] / k[0], k[1] == 0 ? 0 : d[1] / k[1]];';
        piv.transform.scale.setValue([200, 200]);
        var stale = kidAt();
        piv.transform.scale.setValue([100, 100]);
        var staleC = [(stale[0] - 2*w0[0]) / -1, (stale[1] - 2*w0[1]) / -1];
        w("");
        w("the form this replaces zoomed about " + pt(staleC) + " - the untouched centre");
        ok(Math.abs(staleC[0] - 640) < 0.5,
           "which is why zoom ignored the offset before", pt(staleC));

        comp.remove(); comp = null;
    } catch (e) {
        fail++;
        w("THREW  " + e.toString() + " @ line " + e.line);
        if (comp) { try { comp.remove(); } catch (e2) {} }
    }
    out.push("");
    out.push(pass + " passed, " + fail + " failed");
    var p = new File(LOG); p.open("w"); p.write(out.join("\n")); p.close();
})();
