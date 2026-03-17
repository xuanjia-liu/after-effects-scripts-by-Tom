var mySelectedLayers = app.project.activeItem.selectedLayers;
if (mySelectedLayers.length > 0) {
    var myLayer = app.project.activeItem.selectedLayers [0];
    var myProp = myLayer.property ("Position");
    var curVal;
    if (myProp.numKeys > 0) {
        for (var i = 1; i <= myProp.numKeys; i++) {
            curVal = myProp.keyValue (i);
            myProp.setValueAtKey (i, [Math.ceil(curVal[0]), Math.ceil(curVal[1])]);
        }
    } else {
        curVal = myProp.value;
        myProp.setValue([Math.ceil(curVal[0]), Math.ceil(curVal[1])]);
    }
}
