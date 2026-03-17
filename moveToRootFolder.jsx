(function() { 
//Type:JAVASCRIPT
main(); 

function main(){
        app.beginUndoGroup("move items to root folder");
        var proj = app.project;
        var comp = proj.activeItem;
        var myItems = app.project.selection;

        for (var i=0; i <myItems.length; i++){

           myItems[i].parentFolder=app.project.rootFolder;
        } 
        app.endUndoGroup();   
    }

    
})();  

