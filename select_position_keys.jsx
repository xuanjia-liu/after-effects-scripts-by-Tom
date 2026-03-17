(function() { 
    select_position();	
    //--------------------------------------//
    function select_position(){
        app.beginUndoGroup("Select position keys");
        
        var myComp = app.project.activeItem;
        var layers=myComp.layers;
        var seLayers=myComp.selectedLayers;

        if(seLayers.length !=0 ){
           for(var i=0,l=seLayers.length ; i<l ; i++){
               var curLayer = seLayers[i];
               var pos=curLayer.property("Transform").property("Position");
              
               if(pos.numKeys !=0){
                   
                   for(var j=1,k=pos.numKeys ; j<=k;j++){
                    
                       pos.setSelectedAtKey(j,true);
                   }
                   
                }
            }
        }

        app.endUndoGroup();

    }//emd function
})();  