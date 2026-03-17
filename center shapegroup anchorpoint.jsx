function recenterShapeGroupAnchor() {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) {
        alert("Please select a composition.");
        return;
    }
    
    if (comp.selectedLayers.length === 0) {
        alert("Please select at least one shape layer.");
        return;
    }
    
    app.beginUndoGroup("Recenter Shape Group Anchor Points");
    
    // Process all selected layers
    for (var l = 0; l < comp.selectedLayers.length; l++) {
        var layer = comp.selectedLayers[l];
        
        // Skip non-shape layers
        if (!(layer instanceof ShapeLayer)) {
            continue;
        }
        
        var contents = layer.property("Contents");
        if (!contents) continue;
        
        for (var i = 1; i <= contents.numProperties; i++) {
            var group = contents.property(i);
            if (group.matchName === "ADBE Vector Group") {
                var transform = group.property("Transform");
                var anchor = transform.property("Anchor Point");
                var position = transform.property("Position");
                
                var path = null;
                for (var j = 1; j <= group.property("Contents").numProperties; j++) {
                    var item = group.property("Contents").property(j);
                    if (item.matchName === "ADBE Vector Shape - Group") {
                        path = item.property("Path");
                        break;
                    }
                }
                
                if (path && path.isModified) {
                    var pathValue = path.value;
                    var oldAnchor = anchor.value;
                    var oldPosition = position.value;
                    var newAnchor = getBoundingBoxCenter(pathValue.vertices);
                    var offsetX = newAnchor[0] - oldAnchor[0];
                    var offsetY = newAnchor[1] - oldAnchor[1];
                    anchor.setValue(newAnchor);
                    position.setValue([oldPosition[0] + offsetX, oldPosition[1] + offsetY]);
                }
            }
        }
    }
    
    app.endUndoGroup();
    
    function getBoundingBoxCenter(vertices) {
        var minX = vertices[0][0], maxX = vertices[0][0];
        var minY = vertices[0][1], maxY = vertices[0][1];
        
        for (var k = 1; k < vertices.length; k++) {
            var v = vertices[k];
            if (v[0] < minX) minX = v[0];
            if (v[0] > maxX) maxX = v[0];
            if (v[1] < minY) minY = v[1];
            if (v[1] > maxY) maxY = v[1];
        }
        
        return [(minX + maxX) / 2, (minY + maxY) / 2];
    }
}

recenterShapeGroupAnchor();