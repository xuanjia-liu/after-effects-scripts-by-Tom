/*-------------------------------------
Select MatteLayers

Version History
1.0.0  -  Sep 08, 2021
    Initial release
-------------------------------------*/

//______Files Path______
var thisFile = new File(this);
var thisFolderPath = thisFile.path;
//______Build Main Panel______
function buildUI(thisObj){
    if(thisObj instanceof Panel){
        var win = thisObj;
    }else{
        selectMatte();
    }       
    return win;
}

try{
    var win = buildUI(this);
    var buttonRect = [0, 0, 100, 30];
    var panelButtonSpace = [5, 5, 5, 5];
    var buttonSpace = [55, 0, 55, 0];
    var buttonA = win.add("Button", panelButtonSpace + buttonRect, "Select TrackMatte");

    function selectMatte(){
        app.beginUndoGroup("selectMatte");
        var comp = app.project.activeItem;
        if(comp.selectedLayers.length<1){
            app.executeCommand(23); //Select All
        }
        var slLayers = comp.selectedLayers;
        for(i=0; i<slLayers.length; i++){
            if(slLayers[i].isTrackMatte && !slLayers[i].locked){
                slLayers[i].selected = true;
            }else{
                slLayers[i].selected = false;
            }
        }
        app.endUndoGroup();
    }
    
    buttonA.onClick = function(){
        selectMatte();
    }

}catch (e){
}
//try catch <-- To make it work even if you don't have it in ScriptUI Panels.