// Run with AE > File > Scripts > Run Script File. Test compositions are removed.
(function () {
    var dir = File($.fileName).parent, original = app.project.activeItem;
    var log = [], folder = null, pass = 0, fail = 0, results = [];
    var savedSelection = original instanceof CompItem ? original.selectedLayers : [];
    function say(s) { log.push(s); }
    function check(ok, label, detail) {
        if (ok) { pass++; } else { fail++; }
        say((ok ? 'PASS ' : 'FAIL ') + label + (detail ? ' | ' + detail : ''));
    }
    function near(a, b) { return Math.abs(a[0]-b[0]) < 0.08 && Math.abs(a[1]-b[1]) < 0.08; }
    function fmt(p) { return '['+String(p[0])+','+String(p[1])+']'; }
    function plus(a,b) { return [a[0]+b[0],a[1]+b[1]]; }
    function vec(p, angle, sx, sy) {
        var r=angle*Math.PI/180,x=p[0]*sx,y=p[1]*sy;
        return [x*Math.cos(r)-y*Math.sin(r),x*Math.sin(r)+y*Math.cos(r)];
    }
    function shape() {
        var s=new Shape();s.closed=true;
        s.vertices=[[-40,-25],[55,-30],[45,38],[-35,30]];
        s.inTangents=[[0,0],[-18,-12],[0,-16],[-10,0]];
        s.outTangents=[[22,0],[8,15],[-16,9],[0,0]];return s;
    }
    function load(file) {
        file.open('r');var src=file.read();file.close();
        var marker='    loadPrefs();\n    buildUI(thisObj);';
        if(src.indexOf(marker)<0)throw new Error('Boot marker missing');
        src=src.replace(marker,'$.global.__VXR_PIVOT_TEST = {P:P,UI:UI,scan:scanPaths,create:actCreate,pivot:actPivot,merge:actMerge,switchMode:actSwitchHandleMode,manifest:readManifest,kind:kindOf,build:buildPathExpression,repair:typeof actRepairTangents === "function" ? actRepairTangents : null};');
        eval(src);var v=$.global.__VXR_PIVOT_TEST;v.UI.say=function(s){say('  '+s);};v.UI.refresh=function(){};return v;
    }
    function runCase(V, label, mode, handles, transformed, partial, migration, animated) {
        say('\nCASE '+label);
        var c=app.project.items.addComp('Pivot check '+label,960,540,1,1,24);c.parentFolder=folder;c.openInViewer();
        var L=c.layers.addShape();L.name='Curve';L.transform.anchorPoint.setValue([0,0]);L.transform.position.setValue([480,270]);
        var g=L.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group');g.name='Geometry';
        var h=g.property('ADBE Vectors Group');h.addProperty('ADBE Vector Shape - Group').property('ADBE Vector Shape').setValue(shape());h.addProperty('ADBE Vector Graphic - Fill');
        var gt=g.property('ADBE Vector Transform Group');
        var gs=transformed===2?[878.43,878.43]:[135,78];
        if(transformed){gt.property('ADBE Vector Position').setValue([25,-18]);gt.property('ADBE Vector Rotation').setValue(17);gt.property('ADBE Vector Scale').setValue(gs);L.transform.rotation.setValue(-9);L.transform.scale.setValue([110,92]);}
        function world(p) { return transformed ? plus([480,270],vec(plus([25,-18],vec(p,17,gs[0]/100,gs[1]/100)),-9,1.1,.92)) : plus([480,270],p); }
        var it=V.scan(c,[L])[0],base=shape(),ids=partial?[0,2]:[0,1,2,3],picks=[{item:it,idx:ids}];
        if(animated){var s2=shape();s2.inTangents=[[0,0],[-30,-6],[0,-25],[-20,0]];s2.outTangents=[[35,0],[16,25],[-25,15],[0,0]];it.prop.setValueAtTime(0,base);it.prop.setValueAtTime(.5,s2);}
        V.P.pivotMode=mode;V.P.handleMode=handles||'masks';
        if(handles)V.create(picks,true);
        V.pivot(picks,[]);
        var pivot=null;for(var i=1;i<=c.numLayers;i++){if(V.kind(c.layer(i))==='pivot')pivot=c.layer(i);}
        if(!pivot)throw new Error('No Pivot: '+label);
        if(migration){var m=V.manifest(it.prop);for(i=0;i<m.pts.length;i++)delete m.pts[i].tf;it.prop.expression=V.build(m,it.chain);if(V.repair)V.repair();}
        var center=pivot.transform.position.valueAtTime(0,true);
        var poses=[[100,100,0],[200,200,0],[100,100,65],[160,65,-37],[-120,80,23]];
        for(var k=0;k<poses.length;k++){
            var pose=poses[k];pivot.transform.scale.setValue([pose[0],pose[1]]);pivot.transform.rotation.setValue(pose[2]);
            // AE's Shape read can expose the evaluated path even with the
            // preExpression flag. Use our independent fixture data as oracle.
            var t=animated ? 0.5 : 0,raw=animated ? s2 : base,sh=it.prop.valueAtTime(t,false);
            var points=true,tangents=true,pointDetail='',tangentDetail='';
            for(i=0;i<raw.vertices.length;i++){
                var picked=false;for(var j=0;j<ids.length;j++)if(ids[j]===i)picked=true;
                var bp=world(raw.vertices[i]),ep=bp;
                if(picked)ep=plus(center,vec([bp[0]-center[0],bp[1]-center[1]],pose[2],pose[0]/100,pose[1]/100));
                if(!near(world(sh.vertices[i]),ep)){points=false;if(!pointDetail)pointDetail='expected '+fmt(ep)+' actual '+fmt(world(sh.vertices[i]))+' base '+fmt(raw.vertices[i])+' pivot '+fmt(center)+' scale '+fmt(pivot.transform.scale.value);}
                var sides=['inTangents','outTangents'];
                for(var z=0;z<sides.length;z++){
                    var name=sides[z],baseEnd=world(plus(raw.vertices[i],raw[name][i])),expected=[baseEnd[0]-bp[0],baseEnd[1]-bp[1]];
                    if(picked)expected=vec(expected,pose[2],pose[0]/100,pose[1]/100);
                    var actualEnd=world(plus(sh.vertices[i],sh[name][i])),actualStart=world(sh.vertices[i]);
                    if(!near([actualEnd[0]-actualStart[0],actualEnd[1]-actualStart[1]],expected)){tangents=false;if(!tangentDetail)tangentDetail='expected '+fmt(expected)+' actual '+fmt([actualEnd[0]-actualStart[0],actualEnd[1]-actualStart[1]]);}
                }
            }
            var desc=pose.join('/');check(!it.prop.expressionError,label+' expression '+desc,it.prop.expressionError);check(points,label+' vertices '+desc,pointDetail);check(tangents,label+' local handle geometry '+desc,tangentDetail);
        }
        if(handles){
            var old=it.prop.valueAtTime(0,false),other=handles==='masks'?'layers':'masks';V.switchMode(picks,other);var next=it.prop.valueAtTime(0,false),same=true;
            for(i=0;i<old.vertices.length;i++){if(!near(old.vertices[i],next.vertices[i])||!near(old.inTangents[i],next.inTangents[i])||!near(old.outTangents[i],next.outTangents[i]))same=false;}
            check(same,label+' handle conversion at transformed pose');
        }
        if(mode==='pivot'&&!transformed&&!partial&&!migration&&!animated){
            var target=c.layers.addShape();target.name='Merge target';target.transform.position.setValue([480,270]);V.merge([L,target]);
            var paths=V.scan(c,[target]),merged=null;
            for(i=0;i<paths.length;i++)if(V.manifest(paths[i].prop))merged=paths[i];
            check(!!merged,label+' merged Pivot rig is retained');
            if(merged){
                pivot.transform.scale.setValue([125,125]);pivot.transform.rotation.setValue(44);var msh=merged.prop.valueAtTime(0,false),curve=true;
                for(i=0;i<base.vertices.length;i++){
                    var start=world(base.vertices[i]),want=plus(center,vec([start[0]-center[0],start[1]-center[1]],44,1.25,1.25));
                    if(!near(world(msh.vertices[i]),want))curve=false;
                    var ends=['inTangents','outTangents'];for(var q=0;q<ends.length;q++)if(!near(msh[ends[q]][i],vec(base[ends[q]][i],44,1.25,1.25)))curve=false;
                }
                check(curve,label+' curve stays correct after Merge and another Pivot transform');
            }
        }
    }
    function suite(file,label){
        pass=0;fail=0;say('\nSOURCE '+label+' | '+file.fsName);var V=load(file);
        var cases=[['direct','pivot',null,false,false,false,false],['direct transformed','pivot',null,true,false,false,false],['large shape-group scale','pivot',null,2,false,false,false],['point controls','points',null,true,false,false,false],['mask handles','points','masks',true,false,false,false],['layer handles','points','layers',true,false,false,false],['partial selection','pivot',null,true,true,false,false],['animated tangents','pivot',null,true,false,false,true]];
        if(V.repair)cases.push(['existing rig upgrade','pivot',null,true,false,true,false]);
        for(var i=0;i<cases.length;i++){try{runCase.apply(null,[V].concat(cases[i]));}catch(e){fail++;say('ERROR '+cases[i][0]+' '+e.toString()+' line '+e.line);}}
        results.push(label+': '+pass+' passed, '+fail+' failed');say('\nTOTAL '+results[results.length-1]);
    }
    say('AE '+app.version+' | '+app.project.expressionEngine+' | '+new Date().toString());
    try{
        folder=app.project.items.addFolder('Vertex Rig Pivot regression temporary');
        var before=new File('/private/tmp/vxr-pivot-fix/Vertex-Rig-before.jsx');
        if(before.exists)suite(before,'Before fix');
        suite(new File(dir.parent.fsName+'/Vertex Rig.jsx'),'After fix');
    }catch(e){say('FATAL '+e.toString()+' line '+e.line);}
    finally{
        if(folder){app.beginUndoGroup('Remove temporary Pivot regression fixtures');folder.remove();app.endUndoGroup();}
        if(original instanceof CompItem){original.openInViewer();for(var k=0;k<savedSelection.length;k++)try{savedSelection[k].selected=true;}catch(ignored){}}
        var out=new File(dir.fsName+'/pivot-results.txt');out.encoding='UTF-8';out.lineFeed='Unix';out.open('w');out.write(log.join('\n'));out.close();
    }
    alert(results.join('\n')+'\nSee pivot-results.txt. Temporary test compositions removed.');
})();
