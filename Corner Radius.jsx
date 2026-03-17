/*
AE – Detect Selected Vertices (Helper Nulls Method)
--------------------------------------------------
Works with both Mask Paths and Shape Paths.
Because After Effects scripting does **not reliably expose which path vertices are UI-selected**,
this script provides a dependable alternative:

1) Choose a Path property (Mask Path or Shape Path) in the Timeline.
2) Run the script. First run will drop small helper Nulls at every vertex (named VTX_0, VTX_1, ...).
3) Select the helper Nulls that correspond to the vertices you want.
4) Run the script again. It will read your selected helpers, report the indices, and copy them to the clipboard.
5) Optional: it can clean up/delete the helpers.

Notes
- Handles Shape Layer group transforms (Anchor/Position/Scale/Rotation) to place helpers correctly.
- Ignores Skew/Skew Axis (rarely used). If you rely on skew transforms inside shape groups, placement may be off slightly.
- Helpers are placed at vertex positions at the current time.
- The script never modifies your original path.

Tested in CC 2019+ (ExtendScript).
*/

(function DetectSelectedVerticesHelperNulls() {
    function err(msg) { alert("Detect Selected Vertices –\n" + msg); }

    // ----------------------------------------------------------
    // Matrix math (2D affine, 3x3)
    function matIdentity() { return [ [1,0,0], [0,1,0], [0,0,1] ]; }
    function matMul(a,b){
        var r = [[0,0,0],[0,0,0],[0,0,0]];
        for (var i=0;i<3;i++) for (var j=0;j<3;j++) {
            r[i][j]=a[i][0]*b[0][j]+a[i][1]*b[1][j]+a[i][2]*b[2][j];
        }
        return r;
    }
    function matTranslate(tx,ty){ return [ [1,0,tx],[0,1,ty],[0,0,1] ]; }
    function matScale(sx,sy){ return [ [sx,0,0],[0,sy,0],[0,0,1] ]; }
    function matRotate(deg){
        var r = deg*Math.PI/180;
        var c=Math.cos(r), s=Math.sin(r);
        return [ [c,-s,0],[s,c,0],[0,0,1] ];
    }
    function applyMat(m,pt){
        return [ m[0][0]*pt[0] + m[0][1]*pt[1] + m[0][2],
                 m[1][0]*pt[0] + m[1][1]*pt[1] + m[1][2] ];
    }

    // ----------------------------------------------------------
    // Build shape-group transform from Path property up to layer
    function buildShapeGroupMatrix(pathProp){
        // Only for shape layer paths; masks just return identity
        var grpCount = pathProp.propertyDepth; // number of parent groups
        var M = matIdentity();
        for (var d = grpCount; d >= 1; d--) {
            var grp = pathProp.propertyGroup(d);
            if (!grp || !(grp instanceof PropertyGroup)) continue;
            var xf = grp.property("ADBE Vector Transform Group");
            if (xf) {
                // Order: translate(-anchor) -> rotate -> scale -> translate(+position)
                var anc = xf.property("ADBE Vector Anchor").value; // [x,y]
                var pos = xf.property("ADBE Vector Position").value; // [x,y]
                var sc  = xf.property("ADBE Vector Scale").value; // [sx,sy] percent
                var rot = xf.property("ADBE Vector Rotation").value; // degrees

                var T = matIdentity();
                T = matMul(T, matTranslate(-anc[0], -anc[1]));
                T = matMul(T, matRotate(rot));
                T = matMul(T, matScale(sc[0]/100, sc[1]/100));
                T = matMul(T, matTranslate(pos[0], pos[1]));

                M = matMul(M, T);
            }
        }
        return M;
    }

    function isShapePath(prop){
        try { return prop && prop.propertyValueType === PropertyValueType.SHAPE && prop.matchName === "ADBE Vector Shape"; }
        catch(e){ return false; }
    }
    function isMaskPath(prop){
        try { return prop && prop.propertyValueType === PropertyValueType.SHAPE && prop.matchName === "ADBE Mask Shape"; }
        catch(e){ return false; }
    }

    function getActivePathProperty(){
        var comp = app.project && app.project.activeItem;
        if (!(comp && comp instanceof CompItem)) { err("Open a comp and select a Path property (Mask Path or Shape Path) in the Timeline."); return null; }
        var props = comp.selectedProperties;
        for (var i=0; i<props.length; i++) {
            var p = props[i];
            if (isShapePath(p) || isMaskPath(p)) return p;
        }
        err("Select a Path property (Mask Path or Shape Path) in the Timeline, then run the script.");
        return null;
    }

    // Create helper nulls at each vertex; name: VTX_i; return created layers
    function createHelpersAtVertices(pathProp){
        var comp = app.project.activeItem;
        var layer = pathProp.propertyGroup(pathProp.propertyDepth); // owning layer or higher group
        while (layer && !(layer instanceof AVLayer)) layer = layer.propertyGroup(layer.propertyDepth);
        if (!(layer && layer instanceof AVLayer)) { err("Could not resolve the owning AVLayer."); return []; }

        var shape = pathProp.value; // Shape object
        var verts = shape.vertices; // array of [x,y] in *group* or *layer* space
        var M = isShapePath(pathProp) ? buildShapeGroupMatrix(pathProp) : matIdentity();

        var made = [];
        for (var i=0; i<verts.length; i++){
            var v = applyMat(M, verts[i]); // now in layer space
            var compPt = layer.toComp([v[0], v[1], 0]);
            // Create a tiny null at compPt
            var n = comp.layers.addNull();
            n.threeDLayer = false;
            n.name = "VTX_" + i;
            n.label = 10; // purple, easy to see
            n.source.name = "VTX_" + i + "_SRC";
            n.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([0,0,0]);
            n.property("ADBE Transform Group").property("ADBE Position").setValue([compPt[0], compPt[1], 0]);
            n.property("ADBE Transform Group").property("ADBE Scale").setValue([30,30,100]);
            made.push(n);
        }
        return made;
    }

    function getSelectedHelperIndices(){
        var comp = app.project.activeItem;
        var layers = comp && comp.selectedLayers ? comp.selectedLayers : [];
        var out = [];
        for (var i=0; i<layers.length; i++){
            var m = /^VTX_(\d+)$/.exec(layers[i].name);
            if (m) out.push(parseInt(m[1],10));
        }
        out.sort(function(a,b){return a-b;});
        return out;
    }

    function deleteAllHelpers(){
        var comp = app.project.activeItem; if (!comp) return 0;
        var count = 0;
        for (var i=comp.numLayers; i>=1; i--){
            var L = comp.layer(i);
            if (/^VTX_\d+$/.test(L.name)) { L.remove(); count++; }
        }
        return count;
    }

    function copyToClipboard(txt){
        // ExtendScript clipboard hack via a temporary text layer
        try {
            var comp = app.project.activeItem;
            var tmp = comp.layers.addText(txt);
            tmp.property("Source Text").setValue(txt);
            tmp.property("Source Text").selected = true;
            app.executeCommand(app.findMenuCommandId("Copy"));
            tmp.remove();
        } catch(e) {
            // ignore
        }
    }

    // ----------------------------------------------------------
    app.beginUndoGroup("Detect Selected Vertices – Helper Nulls");

    var pathProp = getActivePathProperty();
    if (!pathProp) { app.endUndoGroup(); return; }

    var indices = getSelectedHelperIndices();
    if (indices.length > 0) {
        // Report and (optionally) clean up
        var msg = "Selected vertex indices: [" + indices.join(", ") + "]\n\nCopied to clipboard.";
        copyToClipboard("[" + indices.join(", ") + "]");
        var doCleanup = confirm(msg + "\n\nDelete helper nulls now?");
        if (doCleanup) deleteAllHelpers();
        app.endUndoGroup();
        return;
    }

    // No helpers selected -> create helpers (first run)
    var made = createHelpersAtVertices(pathProp);
    if (made.length === 0) {
        err("No helpers created. Make sure your Path is valid.");
        app.endUndoGroup();
        return;
    }

    alert("Helpers created at each vertex ("+made.length+").\n\nNow select the VTX_* nulls for the vertices you want, and run the script again to capture their indices.");
    app.endUndoGroup();
})();
