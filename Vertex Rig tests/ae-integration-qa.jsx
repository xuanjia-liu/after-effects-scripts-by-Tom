(function () {
    var log = [], passed = 0, failed = 0, last = '', old = app.project.activeItem;
    var f = new File(File($.fileName).parent.parent.fsName + '/Vertex Rig.jsx');
    f.open('r'); var src = f.read(); f.close();
    var boot = '    loadPrefs();\n    buildUI(thisObj);';
    if (src.indexOf(boot) < 0) { alert('QA boot marker missing'); return; }
    src = src.replace(boot, '$.global.VXR_QA_API = {scanPaths:scanPaths, actCreate:actCreate, actAddHandles:actAddHandles, actSwitchHandleMode:actSwitchHandleMode, actPivot:actPivot, actRelease:actRelease, actFollower:actFollower, actAverageFollower:actAverageFollower, actDelete:actDelete, actExtract:actExtract, actMerge:actMerge, actToBezier:actToBezier, readManifest:readManifest, linkedLayer:linkedLayer, kindOf:kindOf, findEffect:findEffect, geomFor:geomFor, P:P, UI:UI};');
    eval(src);
    var V = $.global.VXR_QA_API;
    V.UI.say = function (s) { last = s; log.push('  STATUS ' + s); };
    V.UI.refresh = function () {};
    var folder = app.project.items.addFolder('Vertex Rig QA 2026-11-03');
    function note(s) { log.push(s); }
    function check(c, s, detail) { if(c){passed++;}else{failed++;} log.push((c?'PASS ':'FAIL ')+s+(detail?' | '+detail:'')); }
    function close(a,b,tol) { return Math.abs(a-b)<(tol||0.05); }
    function pt(a,b,tol) { return a && b && close(a[0],b[0],tol) && close(a[1],b[1],tol); }
    function show(v) { return v && v.toSource ? v.toSource() : String(v); }
    function scenario(name, fn) { note('\nSCENARIO '+name); try{fn();}catch(e){failed++;note('ERROR '+e.toString()+' line '+e.line);} }
    function comp(name) { var c=app.project.items.addComp('VXR QA - '+name,960,540,1,1,24); c.parentFolder=folder; c.openInViewer(); return c; }
    function shape(verts, curved) { var s=new Shape(); s.vertices=verts||[[-100,-60],[100,-60],[100,60],[-100,60]]; var ins=[],outs=[]; for(var i=0;i<s.vertices.length;i++){ins.push(curved?[-15,10]:[0,0]);outs.push(curved?[20,-5]:[0,0]);}s.inTangents=ins;s.outTangents=outs;s.closed=true;return s; }
    function addGroup(L,name,s,pos,rot,scl) { var g=L.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group');g.name=name;var v=g.property('ADBE Vectors Group');v.addProperty('ADBE Vector Shape - Group').property('ADBE Vector Shape').setValue(s);v.addProperty('ADBE Vector Graphic - Fill'); var t=g.property('ADBE Vector Transform Group');t.property('ADBE Vector Position').setValue(pos||[0,0]);t.property('ADBE Vector Rotation').setValue(rot||0);t.property('ADBE Vector Scale').setValue(scl||[100,100]);return g; }
    function layer(c,name,s,pos,rot,scl) {var L=c.layers.addShape();L.name=name;L.transform.position.setValue([480,270]);addGroup(L,'Geometry',s||shape(),pos,rot,scl);return L;}
    function item(c,L,n) { return V.scanPaths(c,[L])[n||0]; }
    function picks(it,idx) {return [{item:it,idx:idx}];}
    function control(it,n) {var m=V.readManifest(it.prop);return V.linkedLayer(it.layer,m.pts[n||0].fx);}
    function value(it,t) {var s=it.prop.valueAtTime(t||0,false);check(!it.prop.expressionError,'path expression evaluates',it.prop.expressionError);return s;}
    function findKind(c,k) {for(var i=1;i<=c.numLayers;i++){if(V.kindOf(c.layer(i))===k)return c.layer(i);}return null;}
    function move(L,dx,dy) {var p=L.transform.position.valueAtTime(L.containingComp.time,true);L.transform.position.setValue([p[0]+dx,p[1]+dy]);}
    function snapshot(it,t) {var s=value(it,t); return {v:s.vertices,i:s.inTangents,o:s.outTangents};}
    function same(a,b) {if(a.v.length!==b.v.length)return false;for(var i=0;i<a.v.length;i++){if(!pt(a.v[i],b.v[i])||!pt(a.i[i],b.i[i])||!pt(a.o[i],b.o[i]))return false;}return true;}
    note('AE '+app.version+' | OS '+$.os+' | '+new Date().toString());
    note('Source '+f.fsName+' | source length '+src.length);
    scenario('Point placement, deformation and duplicate guard',function(){
        var c=comp('Points'),L=layer(c,'Shape'),it=item(c,L),base=it.prop.value;
        V.actCreate(picks(it,[0,2]),false);var A=control(it),B=control(it,1);
        check(pt(A.transform.position.value,[380,210]),'controller matches comp-space vertex',show(A.transform.position.value));
        check(same({v:base.vertices,i:base.inTangents,o:base.outTangents},snapshot(it)),'Create preserves geometry');
        move(A,50,25);var s=value(it);check(pt(s.vertices[0],[-50,-35]),'moving control deforms selected vertex',show(s.vertices[0]));check(pt(s.vertices[1],[100,-60]),'unrigged vertex stays fixed');
        var count=c.numLayers;V.actCreate(picks(it,[0]),false);check(c.numLayers===count,'Create is idempotent');
        A.name='Renamed controller';A.moveToEnd();check(pt(value(it).vertices[0],[-50,-35]),'controller rename/reorder keeps link');
        L.name='Renamed shape';check(pt(value(it).vertices[0],[-50,-35]),'shape layer rename keeps rig');
        V.actDelete(picks(it,[0,2]),[],false);check(!it.prop.expressionEnabled && c.numLayers===1,'Delete removes rig and links');check(pt(it.prop.value.vertices[0],[-100,-60]),'Delete restores original geometry');
    });
    scenario('Transformed shape group',function(){
        var c=comp('Group transforms'),L=layer(c,'Transformed',shape(),[30,-20],25,[120,80]),it=item(c,L),base=it.prop.value;
        V.actCreate(picks(it,[0,1,2,3]),false);check(same({v:base.vertices,i:base.inTangents,o:base.outTangents},snapshot(it)),'rotated/nonuniform group does not jump');
        var A=control(it);move(A,24,0);var gm=V.geomFor(it,0);check(pt(gm.verts[0],A.transform.position.value),'transformed point matches controller',show(gm.verts[0])+' vs '+show(A.transform.position.value));
    });
    scenario('Bezier handles and roundtrip',function(){
        var c=comp('Handles'),L=layer(c,'Curve',shape(null,true)),it=item(c,L);V.P.handleMode='masks';var base=it.prop.value;
        V.actCreate(picks(it,[0]),true);check(same({v:base.vertices,i:base.inTangents,o:base.outTangents},snapshot(it)),'curved handles preserve original path');var A=control(it);check(A.mask.numProperties===2,'two handle masks exist');
        var before=snapshot(it);V.actSwitchHandleMode(picks(it,[0]),'layers');check(same(before,snapshot(it)),'masks-to-layers preserves curve');check(c.numLayers===4,'one point plus two handle layers');
        V.actSwitchHandleMode(picks(it,[0]),'masks');check(same(before,snapshot(it)),'layers-to-masks preserves curve');check(c.numLayers===2,'converted handle layers removed');
    });
    scenario('Corner handles preserve silhouette',function(){
        var c=comp('Corner handles'),L=layer(c,'Rectangle'),it=item(c,L),base=snapshot(it);V.P.handleMode='masks';V.actCreate(picks(it,[0,1,2,3]),true);check(same(base,snapshot(it)),'adding handles to zero tangents preserves corners');
    });
    scenario('Pivot translation, rotation, offset and release',function(){
        var c=comp('Pivot'),L=layer(c,'Pivot shape'),it=item(c,L);V.actCreate(picks(it,[0,1]),false);V.actPivot(picks(it,[0,1]),[]);var piv=findKind(c,'pivot');check(!!piv,'Pivot created');var before=snapshot(it);V.findEffect(piv,'VXR Pivot Offset').property(1).setValue([35,-20]);check(same(before,snapshot(it)),'Pivot Offset does not move artwork');move(piv,40,20);check(pt(value(it).vertices[0],[-60,-40]),'Pivot moves both points',show(value(it).vertices[0]));
        var before2=snapshot(it);V.actRelease(picks(it,[0,1]),[]);check(!control(it).parent && same(before2,snapshot(it)),'Release preserves point positions');
    });
    scenario('Path follower and average',function(){
        var c=comp('Followers'),L=layer(c,'Track'),it=item(c,L);V.actCreate(picks(it,[0,1]),false);V.actFollower(picks(it,[0]),[]);var fol=findKind(c,'follow');V.findEffect(fol,'VXR Offset').property(1).setValue(0);var p0=fol.transform.position.valueAtTime(0,false);check(pt(p0,[380,210]),'follower at 0 percent matches start',show(p0));V.findEffect(fol,'VXR Offset').property(1).setValue(50);var p1=fol.transform.position.valueAtTime(0,false);check(!pt(p0,p1),'offset moves follower');check(!fol.transform.position.expressionError,'follower position expression evaluates',fol.transform.position.expressionError);
        V.actAverageFollower(picks(it,[0,1]),[]);var avg=findKind(c,'avg');check(pt(avg.transform.position.valueAtTime(0,false),[480,210]),'Average at point centroid',show(avg.transform.position.value));move(control(it),40,20);check(pt(avg.transform.position.valueAtTime(0,false),[500,220]),'Average follows moved point');
    });
    scenario('Animated bake',function(){
        var c=comp('Bake'),L=layer(c,'Animated'),it=item(c,L);c.workAreaStart=0;c.workAreaDuration=0.5;V.actCreate(picks(it,[0]),false);var A=control(it);A.transform.position.setValueAtTime(0,[380,210]);A.transform.position.setValueAtTime(0.5,[440,240]);var before0=snapshot(it,0),before1=snapshot(it,0.25),before2=snapshot(it,0.5);V.P.bakeWorkArea=true;V.actDelete(picks(it,[0]),[],true);check(!it.prop.expressionEnabled,'Bake removes expression');check(it.prop.numKeys>1,'Bake writes animated keys',it.prop.numKeys);check(same(before0,snapshot(it,0))&&same(before1,snapshot(it,0.25))&&same(before2,snapshot(it,0.5)),'Bake preserves sampled deformation');check(c.numLayers===1,'Bake removes controls');
    });
    scenario('Extract and merge',function(){
        var c=comp('Restructure'),L=layer(c,'Two groups');addGroup(L,'Other',shape(),[250,0]);var it=item(c,L);V.actCreate(picks(it,[0]),false);var before=V.geomFor(it,0).verts[0];V.actExtract(picks(it,[0]),[L]);var layers=[];for(var i=1;i<=c.numLayers;i++){if(c.layer(i) instanceof ShapeLayer && !V.kindOf(c.layer(i)))layers.push(c.layer(i));}check(layers.length===2,'Extract makes two shape layers',last);var paths=V.scanPaths(c,layers),rigged=null;for(i=0;i<paths.length;i++){if(V.readManifest(paths[i].prop))rigged=paths[i];}check(!!rigged && pt(V.geomFor(rigged,0).verts[0],before),'Extract preserves rig position');V.actMerge(layers);var after=[];for(i=1;i<=c.numLayers;i++){if(c.layer(i) instanceof ShapeLayer && !V.kindOf(c.layer(i)))after.push(c.layer(i));}check(after.length===1,'Merge leaves one shape layer',last);check(V.scanPaths(c,after).length===2,'Merge keeps both paths');
    });
    scenario('Parametric conversion and foreign expression',function(){
        var c=comp('Parametric'),L=c.layers.addShape(),g=L.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group'),v=g.property('ADBE Vectors Group');v.addProperty('ADBE Vector Shape - Rect');v.addProperty('ADBE Vector Graphic - Fill');V.actToBezier([L]);var paths=V.scanPaths(c,[L]);check(paths.length===1,'parametric rectangle becomes editable Bezier',last);var it=paths[0];it.prop.expression='value';V.actCreate(picks(it,[0]),false);check(it.prop.expression==='value'&&c.numLayers===1,'foreign expression is left untouched');
    });
    scenario('Mask path',function(){
        var c=comp('Mask'),L=c.layers.addSolid([1,1,1],'Masked solid',960,540,1),m=L.mask.addProperty('ADBE Mask Atom');m.property('ADBE Mask Shape').setValue(shape([[100,100],[300,100],[300,250],[100,250]]));var it=item(c,L);V.actCreate(picks(it,[0]),false);var A=control(it);check(pt(A.transform.position.value,[100,100]),'mask controller placement');move(A,25,15);check(pt(value(it).vertices[0],[125,115]),'mask path follows controller');
    });
    scenario('Moving the source layer after rigging',function(){
        var c=comp('Source movement'),L=layer(c,'Source'),it=item(c,L);V.actCreate(picks(it,[0]),false);var before=V.geomFor(it,0).verts[0];move(L,50,0);var after=V.geomFor(it,0).verts[0];check(pt(after,[before[0]+50,before[1]]),'rigged point travels with source layer',show(before)+' -> '+show(after));note('  INFO point parent = '+(control(it).parent?control(it).parent.name:'none'));
    });
    scenario('Merge preserves animated layer transforms',function(){
        var c=comp('Animated merge'),A=layer(c,'Animated source'),B=layer(c,'Target');A.transform.position.setValueAtTime(0,[300,200]);A.transform.position.setValueAtTime(0.5,[400,200]);var before=V.geomFor(item(c,A),0.5).verts[0];V.actMerge([A,B]);var paths=V.scanPaths(c,[B]),moved=null;for(var i=0;i<paths.length;i++){if(paths[i].chain.length>1)moved=paths[i];}var after=moved?V.geomFor(moved,0.5).verts[0]:null;check(pt(before,after),'Merge preserves future source animation',show(before)+' -> '+show(after));
    });
    scenario('Merge preserves source opacity',function(){
        var c=comp('Opacity merge'),A=layer(c,'Opacity source'),B=layer(c,'Target');A.transform.opacity.setValue(25);V.actMerge([A,B]);var root=B.property('ADBE Root Vectors Group'),wrap=root.property('Opacity source'),opacity=wrap?wrap.property('ADBE Vector Transform Group').property('ADBE Vector Group Opacity').value:null;check(opacity===25,'Merge keeps source layer opacity',opacity);
    });
    scenario('Detaching borrowed follower preserves unrelated expressions',function(){
        var c=comp('Detach follower'),L=layer(c,'Path'),T=c.layers.addNull();T.name='Borrowed target';T.transform.scale.expression='value * 2';var it=item(c,L);V.actFollower(picks(it,[0]),[T]);V.actDelete([], [T],false);check(T.transform.scale.expression==='value * 2' && T.transform.scale.expressionEnabled,'Delete follower keeps unrelated Scale expression',show(T.transform.scale.expression));
    });
    scenario('Work-area bake preserves animation outside selected range',function(){
        var c=comp('Bake outside range'),L=layer(c,'Animated original path'),it=item(c,L);var s1=shape(),s2=shape([[-60,-60],[140,-60],[140,60],[-60,60]]);it.prop.setValueAtTime(0,s1);it.prop.setValueAtTime(0.75,s2);c.workAreaStart=0.25;c.workAreaDuration=0.25;V.actCreate(picks(it,[0]),false);var before=value(it,0.75).vertices[1];V.P.bakeWorkArea=true;V.actDelete(picks(it,[0]),[],true);var after=it.prop.valueAtTime(0.75,false).vertices[1];check(pt(before,after),'Work-area bake retains later path animation',show(before)+' -> '+show(after));
    });
    note('\nTOTAL '+passed+' passed, '+failed+' failed');
    var output=new File(File($.fileName).parent.fsName + '/ae-results.txt');output.encoding='UTF-8';if(output.open('w')){output.write(log.join('\n'));output.close();}
    if(old instanceof CompItem)old.openInViewer();
    alert('Vertex Rig QA complete: '+passed+' passed, '+failed+' failed.\nReport: ae-results.txt next to this test script\nFixtures are in the Vertex Rig QA folder.');
})();
