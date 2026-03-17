(function() {
    function addZeroPositionToLayer(comp, layer) {
        var positionValue = layer.transform.position.value;
        var zeroLayer = comp.layers.addShape();
        zeroLayer.name = "z_" + layer.name;
        zeroLayer.transform.position.setValue(positionValue);
        zeroLayer.moveToEnd();
        zeroLayer.enabled = false;
        zeroLayer.guideLayer = true;
        zeroLayer.label = 0;
        zeroLayer.shy = true;
        zeroLayer.threeDLayer = layer.threeDLayer;
        zeroLayer.locked = true;
        layer.parent = zeroLayer;
    }
  
    function addZeroPositionToLayers(comp, selectedIndices) {
        app.beginUndoGroup("Add Zero Position");
        var numIndices = selectedIndices.length;
        for (var i = 0; i < numIndices; i++) {
            var index = selectedIndices[i];
            var layer = comp.layer(index);
            addZeroPositionToLayer(comp, layer);
        }
        comp.hideShyLayers = true;
        app.endUndoGroup();
    }
  
    function saveSelectedLayerIndices(comp) {
        var selectedIndices = [];
        var layers = comp.selectedLayers;
        var numLayers = layers.length;
        for (var l = 0; l < numLayers; l++) {
            var layer = layers[l];
            selectedIndices.push(layer.index);
            layer.selected = false;
        }
        addZeroPositionToLayers(comp, selectedIndices);
    }
  
    function roundProps() {
        var proj = app.project;
        var thisComp = proj.activeItem;
        var selLayers = thisComp.selectedLayers;
  
        for (var currentLayer = 0; currentLayer < selLayers.length; currentLayer++) {
            var activeLayer = selLayers[currentLayer];
            var roundedValue = [];
            var layerPos = activeLayer.transform.position;
  
            for (var index = 0; index < layerPos.value.length; index++) {
                var changedValue = Math.floor(layerPos.value[index]);
                roundedValue.push(changedValue);
            }
            layerPos.setValue(roundedValue);
            layerPos.expression = "";
        }
    }
  
    var comp = app.project.activeItem;
    if (comp !== null && (comp instanceof CompItem)) {
        // Check if the Option (Alt) key is pressed
        if (ScriptUI.environment.keyboardState.altKey) {
            app.beginUndoGroup("Round Position");
            roundProps();
            app.endUndoGroup();
        } else {
            saveSelectedLayerIndices(comp);
        }
    }
  })();
  