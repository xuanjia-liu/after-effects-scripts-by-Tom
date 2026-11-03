(function () {
    var V=$.global.VXR_QA_API, out=[], folders=[];
    if(!V){alert('QA API unavailable. No changes made.');return;}
    for(var i=1;i<=app.project.numItems;i++){
        var x=app.project.item(i);
        if(x instanceof FolderItem && x.name==='Vertex Rig QA 2026-11-03')folders.push(x);
    }
    // Remove only the earlier duplicate set created by this QA session.
    if(folders.length===2){app.beginUndoGroup('Remove earlier Vertex Rig QA fixtures');folders[0].remove();app.endUndoGroup();out.push('Removed first duplicate QA fixture folder. Kept latest fixtures.');}
    for(i=1;i<=app.project.numItems;i++){
        var c=app.project.item(i);if(!(c instanceof CompItem)||c.name!=='Comp 1')continue;
        var paths=V.scanPaths(c,null);
        for(var n=0;n<paths.length;n++){
            var it=paths[n],m=V.readManifest(it.prop);if(!m||m.pts.length!==14||it.layer.name!=='test')continue;
            var safe=true,idx=[];
            for(var k=0;k<m.pts.length;k++){
                var ctrl=V.linkedLayer(it.layer,m.pts[k].fx);
                if(!ctrl||V.kindOf(ctrl)!=='point'||ctrl.name!==('test Pt '+(m.pts[k].i+1)))safe=false;
                idx.push(m.pts[k].i);
            }
            if(safe){c.openInViewer();V.actDelete([{item:it,idx:idx}],[],false);out.push('Removed the 14 temporary point controls created during the UI test.');}
        }
    }
    var f=new File(File($.fileName).parent.fsName+'/qa-cleanup-log.txt');f.open('w');f.write(out.join('\n'));f.close();
    alert(out.length?out.join('\n'):'No matching temporary changes were removed.');
})();
