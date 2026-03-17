/*-------------------------------------
Select Parents N Children

Version History
1.0.1 [Current version]  -  Aug 16, 2021
    Change file name.

1.0.0  -  Aug 13, 2021
    Initial release
-------------------------------------*/

//______Files Path______
var thisFile = new File(this);
var thisFolderPath = thisFile.path;
var resourcePath = thisFolderPath + "/Remove Expressions Resources"
//______Build Main Panel______
function buildUI(thisObj){
    if(thisObj instanceof Panel){
        var win = thisObj;
    }else{
        /*
        var win = new Window("palette", "Remove Expressions", [0, 0, 116, 236], {resizeable:true})
        win.center();
        win.show();
        */
        removeExpressions();
    }       
    return win;
}

try{
    var win = buildUI(this);
    var buttonRect = [0, 0, 100, 30];
    var panelButtonSpace = [5, 5, 5, 5];
    var buttonSpace = [55, 0, 55, 0];
    var buttonA = win.add("Button", panelButtonSpace + buttonRect, "Remove!");

    function removeExpressions(){
        app.beginUndoGroup("Remove all Expressions");

        var comp = app.project.activeItem;
        var layerNumber = comp.selectedLayers.length;
        var slLayers = comp.selectedLayers;
        var slProp;
        var propNumber;

        if(layerNumber >= 1){
            for(var i = 0; i < layerNumber; i++){
                if(slLayers[i].selectedProperties.length >= 1){
                    deleteAllExpMenuCmd();
                }else{
                    var layerNames = slLayers[i].index;
                    recurse_children(comp.layers[layerNames]);
                }
            }
        }else{    
            alert('no layer selected');
        }

        function deleteAllExpMenuCmd(){
            slProp;
            for(var i = 0; i < layerNumber; i++){
                for(var k = 0; k < slLayers[i].selectedProperties.length; k++){
                    slProp = slLayers[i].selectedProperties[k];
                    if(slProp.canSetExpression && slProp.expression) slProp.expression = '';
                }
            }
        }


        function recurse_children(propParent){
            if(propParent != null){
                var prop;
                for(var i=1; i<=propParent.numProperties; i++){
                    prop = propParent.property(i);
                    switch(prop.propertyType)
                    {
                    case PropertyType.PROPERTY:
                        // do action
                        if(prop.canSetExpression && prop.expression) prop.expression = '';
                        break;
                    case PropertyType.INDEXED_GROUP:
                        recurse_children(prop);
                        break;
                    case PropertyType.NAMED_GROUP:
                        recurse_children(prop);
                        break;
                    default:
                        break;
                    }
                }
            }
        }
        app.endUndoGroup();
    }


    buttonA.onClick = function(){
        removeExpressions();
    }

}catch (e){
}
//try catch <-- To make it work even if you don't have it in ScriptUI Panels.
