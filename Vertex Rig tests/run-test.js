// Headless test run for ../Vertex Rig.jsx
//
//   node "Vertex Rig tests/run-test.js"
//
// ae-mock.js stands in for the After Effects and ScriptUI object model, so the
// real .jsx is loaded and driven exactly as After Effects would, with no AE
// running. Exits non-zero if anything fails.

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const M = require("./ae-mock.js");

const SRC = path.join(__dirname, "..", "Vertex Rig.jsx");
const raw = fs.readFileSync(SRC, "utf8");
let src = raw;
const marker = "    loadPrefs();\n    buildUI(thisObj);";
if (src.indexOf(marker) < 0) { throw new Error("boot marker not found"); }
src = src.replace(marker, marker + `
    globalThis.__VXR = { scanPaths, actCreate, rigPoints, actSwitchHandleMode,
        actPivot, actAddToPivot, actRelease, actFollower, actAverageFollower, actDelete,
        actExtract, actMerge, actToBezier, readManifest, buildPathExpression, geomFor,
        itemMatrix, P, UI, state, kindOf, linkedLayer, findEffect, compOfExpression,
        allPathSignature, checkUnchanged, carriesData, childrenOf,
        scanPrimitives, ghostFor, actAddToPivot, actToBezier, nearestT,
        followPositionExpr, setupFollower };`);

const names = ["app", "CompItem", "Shape", "PropertyType", "PropertyValueType",
  "KeyframeInterpolationType", "MaskMode", "Window", "Panel", "ScriptUI", "$"];
new Function(...names, src)(...names.map(n => M[n]));
const V = globalThis.__VXR;

// ------------------------------------------------------------------ helpers
let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log("  ok   " + label); }
  else { fail++; console.log("  FAIL " + label + (extra ? "  <- " + extra : "")); }
}
function section(s) { console.log("\n" + s); }

function star(n, r) {
  const sh = new M.Shape();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    sh.vertices.push([Math.cos(a) * r, Math.sin(a) * r]);
    sh.inTangents.push([0, 0]);
    sh.outTangents.push([0, 0]);
  }
  sh.closed = true;
  return sh;
}

function newComp() {
  const comp = new M.CompItem(1920, 1080, 1.0, 24);
  M.app.project.activeItem = comp;
  return comp;
}

function addShapeLayer(comp, name, groupName, shape, gpos, grot, gscl) {
  const L = comp.layers.addShape();
  L.name = name;
  L.transform.position.setValue([960, 540]);
  const grp = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
  grp.name = groupName;
  const vecs = grp.property("ADBE Vectors Group");
  const sg = vecs.addProperty("ADBE Vector Shape - Group");
  sg.property("ADBE Vector Shape").setValue(shape);
  vecs.addProperty("ADBE Vector Graphic - Fill");
  const tr = grp.property("ADBE Vector Transform Group");
  tr.property("ADBE Vector Position").setValue(gpos || [0, 0]);
  tr.property("ADBE Vector Rotation").setValue(grot || 0);
  tr.property("ADBE Vector Scale").setValue(gscl || [100, 100]);
  return L;
}

function pickAll(item, idx) { return [{ item, idx }]; }

// ========================================================== source hygiene
section("source hygiene");
try { new vm.Script(raw); ok(true, "Vertex Rig.jsx parses"); }
catch (e) { ok(false, "Vertex Rig.jsx parses", e.message); }

const nonAscii = [];
raw.split("\n").forEach((line, i) => {
  if (/[^\x00-\x7F]/.test(line)) { nonAscii.push(i + 1); }
});
ok(nonAscii.length === 0, "pure ASCII (AE reads .jsx as Latin-1)",
   nonAscii.length ? "lines " + nonAscii.slice(0, 5).join(", ") : "");

// ExtendScript is ES3. These all parse in node and then fail inside AE.
// Scan code only: strings, comments and regex literals are blanked out first,
// so prose like "to let it turn" does not trip the `let` check.
function stripLiterals(text) {
  let out = "", mode = "code", prev = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (mode === "code") {
      if (c === "/" && n === "/") { mode = "line"; out += "  "; i++; continue; }
      if (c === "/" && n === "*") { mode = "block"; out += "  "; i++; continue; }
      if (c === "\"" || c === "'") { mode = c; out += " "; continue; }
      if (c === "/" && /[(,=:[!&|?{};+\-*%~^]/.test(prev)) { mode = "regex"; out += " "; continue; }
      out += c;
      if (!/\s/.test(c)) { prev = c; }
      continue;
    }
    if (mode === "line") {
      if (c === "\n") { mode = "code"; out += c; } else { out += " "; }
      continue;
    }
    if (mode === "block") {
      if (c === "*" && n === "/") { mode = "code"; out += "  "; i++; }
      else { out += (c === "\n") ? c : " "; }
      continue;
    }
    if (mode === "regex") {
      if (c === "\\") { out += "  "; i++; continue; }
      if (c === "/") { mode = "code"; prev = "/"; }
      out += " ";
      continue;
    }
    // inside a string literal
    if (c === "\\") { out += "  "; i++; continue; }
    if (c === mode) { mode = "code"; prev = "\""; }
    out += (c === "\n") ? c : " ";
  }
  return out;
}

// The stripper must not quietly turn into a no-op, or every check below
// would pass by seeing nothing at all.
const probe = stripLiterals('var a = "let x"; // let y\nlet z = 1;');
ok(/\blet\s+\w/.test(probe), "stripper keeps real code");
ok(probe.indexOf("let x") < 0 && probe.indexOf("let y") < 0,
   "stripper drops strings and comments");
ok(/\blet\s+\w/.test(stripLiterals('s.match(/^content\\("(.*)"\\)/); let q = 1;')),
   "stripper survives a regex literal containing quotes");
ok(stripLiterals('a / b; let c = 1;').indexOf("a / b") >= 0,
   "stripper does not mistake division for a regex");

const code = stripLiterals(raw);
const codeLines = code.split("\n");
ok(codeLines.length === raw.split("\n").length, "stripper preserves line numbering");

const ES5 = [
  [/=>/, "arrow function"],
  [/\bconst\s+\w/, "const"],
  [/\blet\s+\w/, "let"],
  [/\bJSON\s*\./, "JSON"],
  [/\.forEach\s*\(/, "Array#forEach"],
  [/\.map\s*\(/, "Array#map"],
  [/\.filter\s*\(/, "Array#filter"],
  [/\.trim\s*\(\s*\)/, "String#trim"],
  [/\bObject\s*\.\s*keys\s*\(/, "Object.keys"],
  [/\bArray\s*\.\s*isArray\s*\(/, "Array.isArray"]
];
for (const [re, label] of ES5) {
  const lines = [];
  codeLines.forEach((line, i) => { if (re.test(line)) { lines.push(i + 1); } });
  ok(lines.length === 0, "no " + label, lines.length ? "line " + lines[0] : "");
}

// =============================================================== scan + rig
section("scan");
let comp = newComp();
const shapeL = addShapeLayer(comp, "Star", "Group 1", star(5, 100), [40, -20], 15, [120, 80]);
let items = V.scanPaths(comp, [shapeL]);
ok(items.length === 1, "one path found", "got " + items.length);
ok(items[0].chain.length === 1 && items[0].chain[0] === "Group 1", "chain is Group 1");
ok(items[0].ref === 'content("Group 1").content("Path 1").path', "expression ref", items[0].ref);
ok(items[0].sname === "Path 1", "shape group name");

section("create point controls");
V.actCreate(pickAll(items[0], [0, 2]), false);
let man = V.readManifest(items[0].prop);
ok(!!man && man.pts.length === 2, "manifest has 2 points", man && man.pts.length);
ok(man && man.pts[0].i === 0 && man.pts[1].i === 2, "indices kept");
const ctrls = comp._layers.filter(l => V.kindOf(l) === "point");
ok(ctrls.length === 2, "two control layers", ctrls.length);
ok(ctrls[0].guideLayer === true, "controls are guide layers");
const fxCount = shapeL.property("ADBE Effect Parade").numProperties;
ok(fxCount === 2, "two Layer Control links on the rigged layer", fxCount);
ok(V.linkedLayer(shapeL, man.pts[0].fx) !== null, "link resolves to a layer");
const expr = items[0].prop.expression;
ok(/createPath\(_P, _I, _O, _C\);\s*$/.test(expr), "expression ends with createPath");
ok(expr.indexOf("_ig(v, content(\"Group 1\").transform)") > 0, "group transform is inverted live");

section("re-running does not duplicate");
V.actCreate(pickAll(items[0], [0]), false);
man = V.readManifest(items[0].prop);
ok(man.pts.length === 2, "still 2 points", man.pts.length);

section("bezier handles as masks");
V.P.handleMode = "masks";
// One Handles button now covers both cases, so this is actCreate(.., true) on
// a point that already has a control.
V.actCreate(pickAll(items[0], [0]), true);
man = V.readManifest(items[0].prop);
let e0 = man.pts.filter(p => p.i === 0)[0];
ok(e0.im === 1 && e0.om === 1, "in/out marked as masks");
const pc = V.linkedLayer(shapeL, e0.fx);
ok(pc.property("ADBE Mask Parade").numProperties === 2, "two masks on the point control");
ok(items[0].prop.expression.indexOf("_mp(") > 0, "expression reads the mask handles");

section("switch handles to separate layers");
V.actSwitchHandleMode(pickAll(items[0], [0]), "layers");
man = V.readManifest(items[0].prop);
e0 = man.pts.filter(p => p.i === 0)[0];
ok(!e0.im && !e0.om, "mask flags cleared");
ok(!!e0["if"] && !!e0.of, "handle link effects recorded");
const handles = comp._layers.filter(l => V.kindOf(l) === "handle");
ok(handles.length === 2, "two handle layers", handles.length);
ok(handles[0].parent !== null, "handle rides its point control");
ok(pc.property("ADBE Mask Parade").numProperties === 0, "masks removed");

section("pivot");
V.actPivot(pickAll(items[0], [0, 2]), []);
const pivots = comp._layers.filter(l => V.kindOf(l) === "pivot");
ok(pivots.length === 1, "pivot created");
ok(V.findEffect(pivots[0], "VXR Pivot Offset") !== null, "pivot offset control added");
ok(pivots[0].transform.position.expressionEnabled, "pivot position compensates the offset");
const parented = comp._layers.filter(l => l.parent && l.parent.id === pivots[0].id);
ok(parented.length === 2, "two point controls parented to the pivot", parented.length);

section("follower");
const txt = comp.layers.addShape();
txt.name = "Rider";
txt.selected = true;
V.actFollower(pickAll(items[0], [0]), [txt]);
ok(V.findEffect(txt, "VXR Path") !== null, "path link");
ok(V.findEffect(txt, "VXR Offset") !== null, "offset slider");
ok(V.findEffect(txt, "VXR Follow Rotation") !== null, "follow rotation checkbox");
ok(txt.transform.position.expression.indexOf("pointOnPath") > 0, "position rides the path");
ok(txt.transform.rotation.expression.indexOf("Math.atan2") > 0, "rotation follows the tangent");
txt.selected = false;

section("average follower");
V.actAverageFollower(pickAll(items[0], [0, 2]), []);
const avg = comp._layers.filter(l => V.kindOf(l) === "avg");
ok(avg.length === 1, "average follower created");
ok(V.findEffect(avg[0], "VXR P1") && V.findEffect(avg[0], "VXR P2"), "links to both points");
ok(avg[0].transform.scale.expressionEnabled, "can scale with the group");

section("delete one point");
const beforeLayers = comp.numLayers;
V.actDelete(pickAll(items[0], [2]), [], false);
man = V.readManifest(items[0].prop);
ok(man.pts.length === 1, "one point left in the manifest", man.pts.length);
ok(comp.numLayers === beforeLayers - 1, "its control layer is gone");

section("delete with bake");
items = V.scanPaths(comp, [shapeL]);
const keyed = star(5, 100);
keyed.vertices[1] = [20, -140];
items[0].prop.setValueAtTime(0, star(5, 100));
items[0].prop.setValueAtTime(0.5, keyed);
V.actDelete([], [shapeL], true);
ok(!items[0].prop.expressionEnabled, "expression removed");
ok(items[0].prop.numKeys > 20, "path baked to keyframes", items[0].prop.numKeys);
ok(shapeL.property("ADBE Effect Parade").numProperties === 0, "link effects pruned");
ok(comp._layers.filter(l => V.kindOf(l) === "point").length === 0, "point controls removed");

// ============================================================ parametrics
section("parametric to bezier");
comp = newComp();
const rectL = comp.layers.addShape();
rectL.name = "Rect";
const rg = rectL.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
const rv = rg.property("ADBE Vectors Group");
const rp = rv.addProperty("ADBE Vector Shape - Rect");
rp.property("ADBE Vector Rect Size").setValue([200, 100]);
rp.property("ADBE Vector Rect Roundness").setValue(20);
V.actToBezier([rectL]);
const conv = V.scanPaths(comp, [rectL]);
ok(conv.length === 1, "rectangle is now a bezier path");
ok(conv.length === 1 && conv[0].prop.value.vertices.length === 8, "rounded rect has 8 vertices",
   conv.length && conv[0].prop.value.vertices.length);

// ================================================================= extract
section("extract");
comp = newComp();
const multi = addShapeLayer(comp, "Face", "Eye", star(4, 40), [-80, 0], 0, [100, 100]);
const g2 = multi.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
g2.name = "Mouth";
const v2 = g2.property("ADBE Vectors Group");
v2.addProperty("ADBE Vector Shape - Group").property("ADBE Vector Shape").setValue(star(6, 55));
let mitems = V.scanPaths(comp, [multi]);
ok(mitems.length === 2, "two paths on the layer", mitems.length);
V.actCreate([{ item: mitems[0], idx: [0] }], false);
mitems = V.scanPaths(comp, [multi]);
const eyeItem = mitems.filter(i => i.chain[0] === "Eye")[0];
V.actExtract([{ item: eyeItem, idx: [0] }], []);
const faceLayers = comp._layers.filter(l => !V.kindOf(l) && l.kind === "shape");
ok(faceLayers.length === 2, "split into two layers", faceLayers.length);
const eyeLayer = faceLayers.filter(l => l.name.indexOf("Eye") >= 0)[0];
ok(!!eyeLayer, "extracted layer named after the shape");
if (eyeLayer) {
  const ei = V.scanPaths(comp, [eyeLayer]);
  ok(ei.length === 1 && !!V.readManifest(ei[0].prop), "the rig travelled with it");
  ok(eyeLayer.property("ADBE Effect Parade").numProperties === 1, "unused links pruned on the copy",
     eyeLayer.property("ADBE Effect Parade").numProperties);
  const other = faceLayers.filter(l => l.id !== eyeLayer.id)[0];
  ok(other.property("ADBE Effect Parade").numProperties === 0, "and on the original",
     other.property("ADBE Effect Parade").numProperties);
}

// =================================================================== merge
// A is the lower layer, so it becomes the source; B is topmost and is the target.
// Both carry a rig, and both must still work afterwards.
section("merge");
comp = newComp();
const a1 = addShapeLayer(comp, "A", "Group 1", star(4, 50), [0, 0], 0, [100, 100]);
const b1 = addShapeLayer(comp, "B", "Group 1", star(3, 60), [0, 0], 0, [100, 100]);
b1.transform.position.setValue([1100, 600]);
b1.transform.rotation.setValue(30);
V.actCreate([{ item: V.scanPaths(comp, [a1])[0], idx: [0, 1] }], false);
V.actCreate([{ item: V.scanPaths(comp, [b1])[0], idx: [2] }], false);
ok(b1.index < a1.index, "B is the topmost selected layer, so it is the target");
V.actMerge([a1, b1]);

const left = comp._layers.filter(l => !V.kindOf(l) && l.kind === "shape");
ok(left.length === 1, "one shape layer left", left.length);
if (left.length === 1) {
  ok(left[0].name === "B", "merged into the topmost layer", left[0].name);
  const groups = left[0].property("ADBE Root Vectors Group");
  ok(groups.numProperties === 2, "the source arrived as a wrapper group", groups.numProperties);
  const wrap = groups.property(2);
  ok(wrap.name === "A", "wrapper is named after the source layer", wrap.name);
  const wtr = wrap.property("ADBE Vector Transform Group");
  const wrot = wtr.property("ADBE Vector Rotation").value;
  ok(Math.abs(wrot - (-30)) < 0.001, "wrapper cancels the layer rotation difference", wrot);

  const merged = V.scanPaths(comp, [left[0]]);
  const rigged = merged.filter(i => !!V.readManifest(i.prop));
  ok(rigged.length === 2, "both rigs survived the merge", rigged.length);
  const fromSrc = rigged.filter(i => i.chain.length === 2)[0];
  const own = rigged.filter(i => i.chain.length === 1)[0];
  ok(!!fromSrc, "the moved rig gained the wrapper in its chain");
  ok(!!own, "the target's own rig kept its chain");
  if (fromSrc) {
    const m2 = V.readManifest(fromSrc.prop);
    ok(m2.pts.length === 2, "moved rig kept both points", m2.pts.length);
    ok(V.linkedLayer(left[0], m2.pts[0].fx) !== null &&
       V.linkedLayer(left[0], m2.pts[1].fx) !== null, "its links were rebuilt on the target");
    ok(fromSrc.prop.expression.indexOf('content("A").transform') > 0,
       "its expression inverts the wrapper transform too");
  }
  if (own) {
    const m3 = V.readManifest(own.prop);
    ok(V.linkedLayer(left[0], m3.pts[0].fx) !== null, "the target's own link was not pruned");
  }
  const fx = left[0].property("ADBE Effect Parade");
  const linkNames = {};
  for (let i = 1; i <= fx.numProperties; i++) { linkNames[fx.property(i).name] = true; }
  ok(Object.keys(linkNames).length === fx.numProperties, "link effect names are unique");
  ok(fx.numProperties === 3, "three links in total", fx.numProperties);
}

// ================================================ deleting pivots/followers
section("delete a pivot");
comp = newComp();
const dl = addShapeLayer(comp, "Blob", "Group 1", star(4, 70), [0, 0], 0, [100, 100]);
let dItems = V.scanPaths(comp, [dl]);
V.actCreate([{ item: dItems[0], idx: [0, 1, 2] }], false);
dItems = V.scanPaths(comp, [dl]);
V.actPivot([{ item: dItems[0], idx: [0, 1, 2] }], []);
let piv = comp._layers.filter(l => V.kindOf(l) === "pivot")[0];
ok(!!piv, "pivot there to delete");
V.actDelete([], [piv], false);
ok(comp._layers.filter(l => V.kindOf(l) === "pivot").length === 0, "pivot removed");
const stillPts = comp._layers.filter(l => V.kindOf(l) === "point");
ok(stillPts.length === 3, "its point controls stayed", stillPts.length);
ok(stillPts.every(l => l.parent === null), "and were released, not orphaned");
ok(!!V.readManifest(dItems[0].prop), "the rig itself is untouched");

section("detach a follower from a layer we did not create");
const rider = comp.layers.addShape();
rider.name = "Rider";
dItems = V.scanPaths(comp, [dl]);
V.actFollower([{ item: dItems[0], idx: [0] }], [rider]);
ok(rider.transform.position.expressionEnabled, "follower wired up");
ok(rider.comment === "", "a borrowed layer keeps its own comment");
const ridersBefore = comp.numLayers;
V.actDelete([], [rider], false);
ok(comp.numLayers === ridersBefore, "the layer itself survives", comp.numLayers - ridersBefore);
ok(!rider.transform.position.expressionEnabled, "its position expression is gone");
ok(V.findEffect(rider, "VXR Path") === null, "and so are the rig effects");

section("delete a follower we created ourselves");
dItems = V.scanPaths(comp, [dl]);
V.actFollower([{ item: dItems[0], idx: [0] }], []);
const own = comp._layers.filter(l => V.kindOf(l) === "follow")[0];
ok(!!own, "own follower created");
V.actDelete([], [own], false);
ok(comp._layers.filter(l => V.kindOf(l) === "follow").length === 0, "own follower deleted outright");

// ============================================ regressions found in live AE
// Each of these passed the mock before it was written and failed in After
// Effects, so they are here to stop the fix rotting.

// 1. To Bezier threw "Object is invalid" and silently rolled the whole action
//    back: adding the replacement renumbered the group, which killed the
//    Property object still held for the parametric path being replaced.
section("to bezier: a parametric path with siblings in its group");
comp = newComp();
const mixL = comp.layers.addShape();
mixL.name = "Mixed";
const mg = mixL.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
mg.name = "Badge";
const mv = mg.property("ADBE Vectors Group");
const mrect = mv.addProperty("ADBE Vector Shape - Rect");
mrect.property("ADBE Vector Rect Size").setValue([120, 60]);
mv.addProperty("ADBE Vector Graphic - Stroke");
mv.addProperty("ADBE Vector Graphic - Fill");
ok(mv.numProperties === 3, "group starts with path, stroke and fill", mv.numProperties);
let threw = null;
try { V.actToBezier([mixL]); } catch (e) { threw = e.message; }
ok(threw === null, "actToBezier does not throw", threw);
ok(mv.numProperties === 3, "still three children afterwards", mv.numProperties);
const mnames = [];
for (let i = 1; i <= mv.numProperties; i++) { mnames.push(mv.property(i).matchName); }
ok(mnames.indexOf("ADBE Vector Shape - Rect") < 0, "the parametric rectangle is gone");
ok(mnames.indexOf("ADBE Vector Shape - Group") === 0,
   "a bezier path took its slot at the top", mnames.join(", "));
ok(mnames.indexOf("ADBE Vector Graphic - Stroke") >= 0 &&
   mnames.indexOf("ADBE Vector Graphic - Fill") >= 0, "stroke and fill survived");
ok(V.scanPaths(comp, [mixL]).length === 1, "the converted path is now riggable");

// 2. Release did nothing when the user selected the Pivot: it unparented the
//    Pivot, which is never parented, instead of freeing what hangs off it.
section("release: with the pivot selected rather than the points");
comp = newComp();
const relL = addShapeLayer(comp, "Rel", "Group 1", star(5, 60), [0, 0], 0, [100, 100]);
let relItems = V.scanPaths(comp, [relL]);
V.actCreate([{ item: relItems[0], idx: [0, 1, 2] }], false);
relItems = V.scanPaths(comp, [relL]);
V.actPivot([{ item: relItems[0], idx: [0, 1, 2] }], []);
const relPiv = comp._layers.filter(l => V.kindOf(l) === "pivot")[0];
ok(!!relPiv, "pivot created");
ok(V.childrenOf(comp, relPiv).length === 3, "three controls hang off it",
   relPiv && V.childrenOf(comp, relPiv).length);
V.actRelease([], [relPiv]);
ok(V.childrenOf(comp, relPiv).length === 0,
   "selecting the pivot and pressing Release frees them",
   relPiv && V.childrenOf(comp, relPiv).length);

// 3. Merge warned "116 properties could not be copied - check gradients" on a
//    clean merge. Every one was a property AE refuses to write because it or a
//    parent is hidden, all still at their defaults.
section("copy losses: only count a property that carries data");
ok(V.carriesData({ isModified: true }) === true, "a changed property counts");
ok(V.carriesData({ isModified: false }) === false, "an untouched one does not");
ok(V.carriesData({}) === true, "an unknown property counts, so nothing is hidden by accident");
ok(V.carriesData({ get isModified() { throw new Error("hidden"); } }) === true,
   "so does one that throws when asked");

// 4. The "did the artwork move" guard compared Math.round(x * 10) for equality,
//    so it refused a millionth of a pixel that straddled a rounding boundary
//    and waved through a drift of almost a tenth.
section("moved-artwork guard: compares distance, not rounding");
comp = newComp();
const sigL = addShapeLayer(comp, "Sig", "Group 1", star(5, 70), [0, 0], 0, [100, 100]);
const baseSig = V.allPathSignature(comp);
ok(!!baseSig && baseSig.length === 1, "one path in the signature",
   baseSig && baseSig.length);

function nudge(dx) {
  const it = V.scanPaths(comp, [sigL])[0];
  const sh = it.prop.value;
  const moved = new M.Shape();
  moved.closed = sh.closed;
  moved.vertices = sh.vertices.map((v, i) => (i === 0 ? [v[0] + dx, v[1]] : [v[0], v[1]]));
  moved.inTangents = sh.inTangents.map(t => [t[0], t[1]]);
  moved.outTangents = sh.outTangents.map(t => [t[0], t[1]]);
  it.prop.setValue(moved);
}

// A sub-nanopixel difference straddling a .05 boundary used to be refused.
nudge(0.0000002);
let guard = null;
try { V.checkUnchanged(comp, baseSig, "Test"); } catch (e) { guard = e.message; }
ok(guard === null, "a difference far below a pixel is accepted", guard);

// Half of one pixel is the line, and it is still quiet just under it.
nudge(0.4);
guard = null;
try { V.checkUnchanged(comp, baseSig, "Test"); } catch (e) { guard = e.message; }
ok(guard === null, "four tenths of a pixel is still accepted", guard);

// A move anyone could see is refused.
nudge(6);
guard = null;
try { V.checkUnchanged(comp, baseSig, "Test"); } catch (e) { guard = e.message; }
ok(guard !== null && guard.indexOf("would have moved the artwork") >= 0,
   "a visible move is refused", guard);

// Losing a path entirely is refused too.
comp = newComp();
guard = null;
try { V.checkUnchanged(comp, baseSig, "Test"); } catch (e) { guard = e.message; }
ok(guard !== null, "a path that vanished is refused");

// 5. Extract declining a single-group layer used to report the generic "pick
//    some points" message, which is wrong when the user did pick points.
section("extract: says why it declined");
comp = newComp();
const oneL = addShapeLayer(comp, "Solo", "Only Group", star(5, 50), [0, 0], 0, [100, 100]);
const oneItems = V.scanPaths(comp, [oneL]);
let saidMsg = "";
const prevSay = V.UI.say;
V.UI.say = (m) => { saidMsg = String(m); };
V.actExtract([{ item: oneItems[0], idx: [0] }], [oneL]);
V.UI.say = prevSay;
ok(saidMsg.indexOf("only") >= 0 && saidMsg.indexOf("group on its layer") >= 0,
   "it explains that the shape is the layer's only group", saidMsg);
ok(comp._layers.filter(l => l.kind === "shape").length === 1,
   "and nothing was extracted");

// ======================================================== panel auto-refresh
// The panel re-reads the comp when it is activated, so the preview is never
// stale. This is a source check: the mock has no window manager to activate.
section("panel refreshes itself when activated");
{
  const clean = stripLiterals(raw);
  ok(/win\.onActivate\s*=\s*autoRefresh/.test(clean),
     "onActivate calls autoRefresh");
  ok(/cv\.addEventListener\(\s*STR\s*,\s*autoRefresh\s*\)/.test(
       clean.replace(/\(\s*\s*,/, "( STR ,")) ||
     raw.indexOf('cv.addEventListener("mouseover", autoRefresh)') >= 0,
     "the canvas mouseover is a fallback for a docked panel");
  // and the guard that stops a burst of activations re-scanning every layer
  ok(/now\s*-\s*lastAuto\s*<\s*\d+/.test(clean),
     "repeated activations are throttled");
  ok(raw.indexOf("var keep = state.sel;") > 0,
     "refresh keeps the picks, so auto-refresh cannot wipe a selection");
}

// ============================= auto-refresh reframes when the preview changes
// Picking another layer in After Effects and coming back to the panel used to
// redraw the new paths through the view fitted to the old ones, so they landed
// off-centre or off the canvas entirely.
section("auto-refresh refits when the preview changes");
{
  const c = newComp();
  const near = addShapeLayer(c, "Near", "Group 1", star(5, 60), [0, 0], 0, [100, 100]);
  const far = addShapeLayer(c, "Far", "Group 1", star(5, 60), [0, 0], 0, [100, 100]);
  near.transform.position.setValue([200, 180]);
  far.transform.position.setValue([1700, 900]);

  // where the points the panel is showing actually land, in canvas pixels
  const CW = 320, CH = 260;            // uiNode's size in ae-mock
  function framing() {
    let seen = 0, inside = 0;
    for (const g of V.state.geom) {
      for (const pt of g.verts) {
        seen++;
        const x = pt[0] * V.state.view.s + V.state.view.tx;
        const y = pt[1] * V.state.view.s + V.state.view.ty;
        if (x >= 0 && x <= CW && y >= 0 && y <= CH) { inside++; }
      }
    }
    return { seen, inside };
  }

  near.selected = true;
  V.UI.refresh();                      // the auto path: no explicit re-fit
  ok(V.state.items.length === 1 && V.state.items[0].layer.name === "Near",
     "the panel shows the layer picked in AE", V.state.items.length);
  let r = framing();
  ok(r.seen > 0 && r.inside === r.seen,
     "its points are on the canvas", JSON.stringify(r));
  const viewA = JSON.stringify(V.state.view);

  // nothing changed, so the framing must stay put - otherwise the artwork
  // jumps every time the pointer enters the canvas, mid-click
  V.UI.refresh();
  ok(JSON.stringify(V.state.view) === viewA,
     "a second refresh over the same paths leaves the view alone");

  // now pick the other layer in AE and come back
  near.selected = false;
  far.selected = true;
  V.UI.refresh();
  ok(V.state.items.length === 1 && V.state.items[0].layer.name === "Far",
     "the panel follows the new selection", V.state.items.length);
  ok(JSON.stringify(V.state.view) !== viewA, "the view was refitted");
  r = framing();
  ok(r.seen > 0 && r.inside === r.seen,
     "and the new points are on the canvas, not off in the corner",
     JSON.stringify(r));

  // same path, dragged out of frame in AE
  far.transform.position.setValue([-4000, -4000]);
  V.UI.refresh();
  r = framing();
  ok(r.seen > 0 && r.inside === r.seen,
     "artwork moved out of frame is framed again", JSON.stringify(r));
}

// ======================= handles must leave corners, and the artwork, alone
// The hand from the user's comp: fourteen points, six of them corners with no
// tangent at all, inside a shape group scaled to 878%.  Handles used to invent
// a 20-unit tangent for every corner, which at that scale stands 176 pixels
// off the vertex - it rounded the corners off and visibly deformed the hand.
function handPath() {
  const sh = new M.Shape();
  sh.vertices = [[-16.2, -22.05], [9.02, -23.51], [18.37, -26.04], [25.19, -35.58],
    [27.14, -27.98], [38.82, -27.01], [33.95, -22.92], [39.4, -20], [33.36, -17.66],
    [38.03, -13.57], [31.41, -13.38], [33.55, -8.51], [19.72, -12.6], [-8.71, -12.02]];
  sh.inTangents = [[0, 0], [-11.59, 1.57], [-0.78, 0.97], [-4.87, -0.39], [0, 0],
    [-0.77, -3.31], [0, 0], [-0.39, -2.92], [0, 0], [1.17, -2.34], [0, 0],
    [2.92, -2.14], [0, 0], [11.29, 2.54]];
  sh.outTangents = [[0, 0], [6.22, -0.84], [0.78, -0.97], [4.87, 0.39], [0, 0],
    [0.77, 3.31], [0, 0], [0.39, 2.92], [0, 0], [-1.17, 2.34], [0, 0],
    [-2.92, 2.14], [0, 0], [0, 0]];
  sh.closed = true;
  return sh;
}

function cornersOf(sh) {
  const out = [];
  for (let i = 0; i < sh.vertices.length; i++) {
    if (!sh.inTangents[i][0] && !sh.inTangents[i][1] &&
        !sh.outTangents[i][0] && !sh.outTangents[i][1]) { out.push(i); }
  }
  return out;
}

// the stand-off is a screen distance, so it must come out the same whatever
// units the path itself is drawn in
function standOffAt(groupScale) {
  const c = newComp();
  const hand = handPath();
  const L = addShapeLayer(c, "Hand", "Shape", hand, [0.64, 1.5], 0,
                          [groupScale, groupScale]);
  V.P.handleMode = "layers";
  let items = V.scanPaths(c, [L]);
  const corners = cornersOf(hand);
  V.actCreate([{ item: items[0], idx: corners }], true);
  items = V.scanPaths(c, [L]);
  const man = V.readManifest(items[0].prop);
  const out = [];
  for (const e of man.pts) {
    const ctrl = V.linkedLayer(L, e.fx);
    for (const k of ["if", "of"]) {
      const h = V.linkedLayer(L, e[k]);
      if (!h || !ctrl) { continue; }
      const a = ctrl.transform.position.value, b = h.transform.position.value;
      out.push(Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2));
    }
  }
  return { man, corners, dists: out };
}

section("handles: a corner keeps its corner, whatever the group scale");
{
  const big = standOffAt(878.43);
  ok(big.corners.length === 6, "six corner points in the artwork", big.corners.length);
  ok(big.man.pts.length === 6, "all six were rigged", big.man.pts.length);
  ok(big.dists.length === 12, "twelve handles", big.dists.length);
  const worst = Math.max(...big.dists.map(d => Math.abs(d - 24)));
  ok(worst < 0.5,
     "each handle stands ~24px off on screen, not 176", "worst off by " + worst.toFixed(1));

  const small = standOffAt(100);
  const worst2 = Math.max(...small.dists.map(d => Math.abs(d - 24)));
  ok(worst2 < 0.5,
     "and the same ~24px at 100% group scale", "worst off by " + worst2.toFixed(1));

  // the stand-off is recorded and taken back out, so the corner stays a corner
  const e0 = big.man.pts[0];
  ok(e0.ri && e0.ro, "the stand-off is recorded on the point",
     JSON.stringify([e0.ri, e0.ro]));
  const len = e0.ri ? Math.sqrt(e0.ri[0] ** 2 + e0.ri[1] ** 2) * 8.7843 : 0;
  ok(Math.abs(len - 24) < 0.5, "and it is a 24px stand-off in group units", len.toFixed(2));
  const items = V.scanPaths(M.app.project.activeItem, null);
  let expr = "";
  for (const it of items) { if (V.readManifest(it.prop)) { expr = it.prop.expression; } }
  ok(/_I\[\d+\] = _v - _P\[\d+\] - \[/.test(expr) && /_O\[\d+\] = _v - _P\[\d+\] - \[/.test(expr),
     "the expression subtracts it, so the tangent reads as zero");
}

// =================================== one line of instructions, not three
// The panel used to carry a fixed hint under the preview, a status line at
// the foot, and a note drawn across the canvas that still asked for a Refresh
// the panel now does by itself - all three visible at once, two usually wrong.
section("the panel speaks in one line");
{
  const clean = stripLiterals(raw);
  ok(raw.indexOf("press Refresh") < 0,
     "the stale Refresh instruction is gone");
  ok(raw.indexOf("Click a point to pick it. Shift-click adds.") < 0,
     "and so is the fixed hint under the preview");
  ok(!/g\.drawString\(\s*"/.test(raw),
     "nothing writes instructions across the canvas any more");
  ok((clean.match(/win\.add\(\s*STR\s*,\s*undefined\s*,\s*STR\s*\)/g) || []).length <= 1,
     "one message widget on the window, not two");

  // and it says the thing that applies
  const c = newComp();
  V.UI.refresh();
  ok(/Select a shape or masked layer/.test(V.state.status),
     "an empty comp asks for a layer", V.state.status);

  const L = addShapeLayer(c, "Star", "Group 1", star(5, 70), [0, 0], 0, [100, 100]);
  L.selected = true;
  V.UI.refresh();
  ok(/1 path in view/.test(V.state.status) && /Click a point/.test(V.state.status),
     "with something to pick, it says how", V.state.status);
  ok(V.state.status.length < 80, "and it fits on one line",
     V.state.status.length + " chars");

  // picking replaces the how-to with what is picked
  const items = V.scanPaths(c, [L]);
  V.state.sel = {};
  V.state.sel[items[0].key] = [0, 1];
  V.UI.refresh();
  ok(/2 points picked on 1 path/.test(V.state.status),
     "and once points are picked, what is picked", V.state.status);
  ok(!/Click a point/.test(V.state.status),
     "without repeating the instructions", V.state.status);

  M.app.project.activeItem = null;
  V.UI.refresh();
  ok(/Open a composition/.test(V.state.status),
     "no comp, no mystery", V.state.status);
  M.app.project.activeItem = c;
}

// ============================== a follower has to travel the artwork's path
// A point read off a path is in the shape group's units, and the expression
// handed it straight to toComp, which wants layer units. Inside a group scaled
// to 878% the rider crawled round a path a ninth of the size of the drawing,
// so it looked like it was barely moving.
section("follower: the group transform is in the expression");
{
  const c = newComp();
  const L = addShapeLayer(c, "Big", "Shape", star(4, 25), [0, 0], 0, [878.43, 878.43]);
  const items = V.scanPaths(c, [L]);
  const rider = addShapeLayer(c, "Rider", "Group 1", star(4, 6), [0, 0], 0, [100, 100]);
  V.actFollower([{ item: items[0], idx: [0] }], [rider]);

  const pos = rider.transform.position.expression;
  ok(/pointOnPath/.test(pos), "the rider rides the path");
  ok(/_fgl\(_p\.pointOnPath/.test(pos),
     "and the point goes through the group transform before toComp", pos);
  ok(/content\("Shape"\)\.transform/.test(pos),
     "naming the group it is actually in", pos);
  const rot = rider.transform.rotation.expression;
  ok(/_fgl\(_p\.pointOnPath/.test(rot) && (rot.match(/_fgl\(/g) || []).length >= 3,
     "Follow Rotation reads both samples the same way", rot);

  // the chain is recorded, so a merge can rebuild the expression
  const m = pos.match(/^\/\/\s*VXR\s+(\{.*\})\s*$/m);
  ok(!!m, "the follower records what it is following");
  const info = m ? eval("(" + m[1] + ")") : {};
  ok(info.chain && info.chain.join("/") === "Shape",
     "including the group chain", JSON.stringify(info.chain));

  // a path at the top of contents needs no transform, and must not get one
  const c2 = newComp();
  const flat = c2.layers.addShape();
  flat.name = "Flat";
  flat.transform.position.setValue([640, 360]);
  const fv = flat.property("ADBE Root Vectors Group");
  const fsg = fv.addProperty("ADBE Vector Shape - Group");
  fsg.property("ADBE Vector Shape").setValue(star(4, 40));
  const fitems = V.scanPaths(c2, [flat]);
  const r2 = addShapeLayer(c2, "Rider2", "Group 1", star(4, 6), [0, 0], 0, [100, 100]);
  V.actFollower([{ item: fitems[0], idx: [0] }], [r2]);
  ok(/function _fgl\(v\) \{ return v; \}/.test(r2.transform.position.expression),
     "a path with no group above it passes the point straight through");
}

section("follower: Offset starts where the layer already is, by arc length");
{
  // two segments, one ten times the other: the middle vertex is halfway by
  // segment count and a tenth of the way along by distance, which is how
  // After Effects measures pointOnPath
  const c = newComp();
  const sh = new M.Shape();
  sh.vertices = [[0, 0], [10, 0], [110, 0]];
  sh.inTangents = [[0, 0], [0, 0], [0, 0]];
  sh.outTangents = [[0, 0], [0, 0], [0, 0]];
  sh.closed = false;
  const L = addShapeLayer(c, "Uneven", "Group 1", sh, [0, 0], 0, [100, 100]);
  const item = V.scanPaths(c, [L])[0];

  // addShapeLayer puts the layer at [960, 540], so that is where vertex 0 is
  const atMiddle = V.nearestT(item, [970, 540], 0);
  ok(Math.abs(atMiddle - 10 / 110) < 0.02,
     "the short segment's end is a tenth along, not half", atMiddle.toFixed(3));
  ok(Math.abs(V.nearestT(item, [960, 540], 0)) < 0.02,
     "the start is the start", V.nearestT(item, [960, 540], 0).toFixed(3));
  ok(Math.abs(V.nearestT(item, [1070, 540], 0) - 1) < 0.02,
     "and the end is the end", V.nearestT(item, [1070, 540], 0).toFixed(3));
}

// ================================= primitives are shown, not silently dropped
// A rectangle is not a path - After Effects keeps it as a few numbers - so the
// panel found nothing on such a layer and came up blank, leaving the user
// hunting for artwork that was plainly there in the comp.
function addPrimLayer(comp, name, groupName, matchName, setUp, gpos, gscl) {
  const L = comp.layers.addShape();
  L.name = name;
  L.transform.position.setValue([640, 360]);
  const grp = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
  grp.name = groupName;
  const vecs = grp.property("ADBE Vectors Group");
  const prim = vecs.addProperty(matchName);
  if (setUp) { setUp(prim); }
  vecs.addProperty("ADBE Vector Graphic - Fill");
  const tr = grp.property("ADBE Vector Transform Group");
  tr.property("ADBE Vector Position").setValue(gpos || [0, 0]);
  tr.property("ADBE Vector Scale").setValue(gscl || [100, 100]);
  return L;
}

section("primitive shapes are shown dimmed, and named");
{
  const c = newComp();
  const L = addPrimLayer(c, "Box", "Rectangle 1", "ADBE Vector Shape - Rect",
    p => { p.property("ADBE Vector Rect Size").setValue([200, 100]); }, [0, 0]);
  L.selected = true;

  ok(V.scanPaths(c, [L]).length === 0, "there is no path on it to find");
  const prims = V.scanPrimitives(c, [L]);
  ok(prims.length === 1, "but the rectangle is found", prims.length);
  ok(prims[0].kind === "rectangle", "and named by kind", prims[0].kind);

  V.UI.refresh();
  ok(V.state.prims.length === 1, "the panel is holding it", V.state.prims.length);
  ok(V.state.ghosts.length === 1 && V.state.ghosts[0].poly.length > 0,
     "with an outline to draw");
  ok(/1 rectangle/.test(V.state.status) && /To Bezier/.test(V.state.status),
     "the status line says what it is and what to do", V.state.status);
  ok(!/^0 path/.test(V.state.status),
     "and does not just report nothing", V.state.status);

  // the dimmed outline has to be framed, or the view falls back to the whole
  // comp and a 200x100 rectangle comes up as a speck
  const CW = 320, CH = 260;
  let inside = 0, seen = 0;
  for (const pt of V.state.ghosts[0].poly) {
    seen++;
    const x = pt[0] * V.state.view.s + V.state.view.tx;
    const y = pt[1] * V.state.view.s + V.state.view.ty;
    if (x >= 0 && x <= CW && y >= 0 && y <= CH) { inside++; }
  }
  ok(seen > 0 && inside === seen, "the fit frames it", inside + "/" + seen);
  ok(V.state.view.s > 1, "and fills the canvas rather than the whole comp",
     V.state.view.s.toFixed(2));
}

section("to bezier: two primitives in one group");
{
  // Converting the first renumbered the group's children, so the second
  // Property object went stale and the whole conversion rolled back.
  const c = newComp();
  const L = addPrimLayer(c, "Pair", "Group 1", "ADBE Vector Shape - Rect",
    p => { p.property("ADBE Vector Rect Size").setValue([200, 100]); }, [0, 0]);
  const vecs = L.property("ADBE Root Vectors Group").property("Group 1")
                .property("ADBE Vectors Group");
  const el = vecs.addProperty("ADBE Vector Shape - Ellipse");
  el.property("ADBE Vector Ellipse Size").setValue([90, 90]);
  const st = vecs.addProperty("ADBE Vector Shape - Star");
  st.property("ADBE Vector Star Outer Radius").setValue(40);

  ok(V.scanPrimitives(c, [L]).length === 3, "three primitives in one group",
     V.scanPrimitives(c, [L]).length);
  let saidMsg = "";
  const prevSay = V.UI.say;
  V.UI.say = m => { saidMsg = String(m); };
  V.actToBezier([L]);
  V.UI.say = prevSay;
  ok(saidMsg.indexOf("Rolled back") < 0, "it does not roll back", saidMsg);
  ok(V.scanPrimitives(c, [L]).length === 0, "none left parametric",
     V.scanPrimitives(c, [L]).length);
  ok(V.scanPaths(c, [L]).length === 3, "all three are paths now",
     V.scanPaths(c, [L]).length);
}

section("primitives inside a shape group count too");
{
  const c = newComp();
  const L = c.layers.addShape();
  L.name = "Nested";
  L.transform.position.setValue([640, 360]);
  const outer = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
  outer.name = "Outer";
  const ov = outer.property("ADBE Vectors Group");
  const inner = ov.addProperty("ADBE Vector Group");
  inner.name = "Inner";
  const iv = inner.property("ADBE Vectors Group");
  const el = iv.addProperty("ADBE Vector Shape - Ellipse");
  el.property("ADBE Vector Ellipse Size").setValue([80, 80]);
  // a group transform the ghost has to go through
  inner.property("ADBE Vector Transform Group")
       .property("ADBE Vector Position").setValue([150, 0]);
  L.selected = true;

  const prims = V.scanPrimitives(c, [L]);
  ok(prims.length === 1, "the nested ellipse is found", prims.length);
  ok(prims[0].kind === "ellipse" && prims[0].chain.join("/") === "Outer/Inner",
     "with the group chain that places it", prims[0].chain.join("/"));

  const gh = V.ghostFor(prims[0], 0);
  let cx = 0;
  for (const pt of gh.poly) { cx += pt[0]; }
  cx /= gh.poly.length;
  ok(Math.abs(cx - (640 + 150)) < 2,
     "and its outline lands where the group puts it", cx.toFixed(1));

  V.UI.refresh();
  ok(/1 ellipse/.test(V.state.status), "the status names it", V.state.status);
}

section("a path and a primitive on one layer: both are reported");
{
  const c = newComp();
  const L = addShapeLayer(c, "Mixed", "Group 1", star(5, 60), [0, 0], 0, [100, 100]);
  const vecs = L.property("ADBE Root Vectors Group").property("Group 1")
                .property("ADBE Vectors Group");
  const r = vecs.addProperty("ADBE Vector Shape - Rect");
  r.property("ADBE Vector Rect Size").setValue([120, 60]);
  const st = vecs.addProperty("ADBE Vector Shape - Star");
  st.property("ADBE Vector Star Outer Radius").setValue(40);
  L.selected = true;

  V.UI.refresh();
  ok(V.state.items.length === 1, "the bezier path is still pickable",
     V.state.items.length);
  ok(V.state.prims.length === 2, "and both primitives are shown",
     V.state.prims.length);
  ok(/1 path in view/.test(V.state.status) &&
     /1 rectangle and 1 star/.test(V.state.status),
     "the status covers both", V.state.status);

  // and To Bezier turns them into something pickable
  V.actToBezier([L]);
  V.UI.refresh();
  ok(V.state.prims.length === 0, "after To Bezier nothing is dimmed",
     V.state.prims.length);
  ok(V.state.items.length === 3, "all three are paths now", V.state.items.length);
  ok(V.state.status.indexOf("dimmed") < 0, "and the note is gone", V.state.status);
}

// ======================================= the pivot offset is the real centre
// A child's comp point is position + rot*scale*(its own point - anchor), so it
// turns about wherever position puts the anchor.  Rolling rotation into the
// position - as this once did - put the offset on both sides of that sum, they
// cancelled, and every child went on turning about the untouched centre.
// Only After Effects can evaluate the expression, so this guards its shape;
// "Vertex Rig tests/live" covers the geometry in the app itself.
section("pivot: the offset lands on the position, not through the rotation");
{
  const c = newComp();
  const L = addShapeLayer(c, "Star", "Group 1", star(5, 70), [0, 0], 0, [100, 100]);
  let items = V.scanPaths(c, [L]);
  V.actPivot([{ item: items[0], idx: [0, 1, 2] }], []);
  const piv = c._layers.filter(l => V.kindOf(l) === "pivot")[0];
  ok(!!piv, "a pivot was created");
  const pos = piv.transform.position.expression;
  const anc = piv.transform.anchorPoint.expression;
  ok(/effect\(/.test(pos) && !/rotation/.test(pos),
     "the position carries the offset and nothing about rotation", pos);
  ok(/scale/.test(anc) && /\//.test(anc),
     "the anchor takes it back out in the layer's own units", anc);

  // an old rig is repaired the next time it is touched
  piv.transform.position.expression = "value + [1,2] // old rotation form";
  V.actAddToPivot([], [piv]);
  ok(piv.transform.position.expression === pos,
     "Add to Pivot puts an old pivot's expression right",
     piv.transform.position.expression);
}

// ================================= the moved-artwork guard has to see tangents
section("the artwork guard compares tangents, not just points");
{
  const c = newComp();
  const sh = star(5, 70);
  const L = addShapeLayer(c, "Corner", "Group 1", sh, [0, 0], 0, [100, 100]);
  const items = V.scanPaths(c, [L]);
  const before = V.allPathSignature(c);
  // round a corner off without moving a single vertex
  const bent = star(5, 70);
  bent.inTangents[0] = [-30, 0];
  bent.outTangents[0] = [30, 0];
  items[0].prop.setValue(bent);
  let threw = false;
  try { V.checkUnchanged(c, before, "Test"); } catch (e) { threw = true; }
  ok(threw, "a tangent-only change counts as the artwork moving");
}

// ==================================== one Handles button, and Pivot that rigs
section("handles: one button covers rigged and unrigged points");
comp = newComp();
const hL = addShapeLayer(comp, "Hands", "Group 1", star(6, 70), [0, 0], 0, [100, 100]);
V.P.handleMode = "layers";
let hItems = V.scanPaths(comp, [hL]);
// point 0 gets a control but no handles; points 1 and 2 have nothing at all
V.actCreate([{ item: hItems[0], idx: [0] }], false);
hItems = V.scanPaths(comp, [hL]);
let hMan = V.readManifest(hItems[0].prop);
ok(hMan.pts.length === 1, "one point rigged to begin with", hMan.pts.length);
ok(!hMan.pts[0]["if"] && !hMan.pts[0].of, "and it has no handles yet");

// now press Handles over all three
V.actCreate([{ item: hItems[0], idx: [0, 1, 2] }], true);
hItems = V.scanPaths(comp, [hL]);
hMan = V.readManifest(hItems[0].prop);
ok(hMan.pts.length === 3, "all three points are rigged now", hMan.pts.length);
let withHandles = hMan.pts.filter(e => (e["if"] || e.im) && (e.of || e.om));
ok(withHandles.length === 3, "and all three have handles", withHandles.length);
ok(comp._layers.filter(l => V.kindOf(l) === "point").length === 3,
   "three point controls", comp._layers.filter(l => V.kindOf(l) === "point").length);
ok(comp._layers.filter(l => V.kindOf(l) === "handle").length === 6,
   "six handle layers", comp._layers.filter(l => V.kindOf(l) === "handle").length);

// pressing it again must not pile up duplicates
const beforeAgain = comp._layers.length;
V.actCreate([{ item: hItems[0], idx: [0, 1, 2] }], true);
ok(comp._layers.length === beforeAgain, "pressing Handles again changes nothing",
   comp._layers.length + " vs " + beforeAgain);

section("pivot: picking points that are not rigged yet still works");
comp = newComp();
const pL = addShapeLayer(comp, "Pv", "Group 1", star(5, 60), [0, 0], 0, [100, 100]);
const pItems = V.scanPaths(comp, [pL]);
ok(!V.readManifest(pItems[0].prop), "nothing is rigged to start with");
let pivMsg = "";
const sayWas = V.UI.say;
V.UI.say = (m) => { pivMsg = String(m); };
V.actPivot([{ item: pItems[0], idx: [0, 1, 2] }], []);
V.UI.say = sayWas;
const madePivots = comp._layers.filter(l => V.kindOf(l) === "pivot");
ok(madePivots.length === 1, "a pivot was created from bare picked points",
   madePivots.length + "  msg: " + pivMsg);
ok(comp._layers.filter(l => V.kindOf(l) === "point").length === 3,
   "it rigged the three points on the way",
   comp._layers.filter(l => V.kindOf(l) === "point").length);
if (madePivots.length) {
  ok(V.childrenOf(comp, madePivots[0]).length === 3, "and parented all three",
     V.childrenOf(comp, madePivots[0]).length);
}
ok(pivMsg.indexOf("Rigged 3 new points") >= 0, "the message says so", pivMsg);

// and it still works the old way, on points that are already rigged
comp = newComp();
const pL2 = addShapeLayer(comp, "Pv2", "Group 1", star(5, 60), [0, 0], 0, [100, 100]);
let p2 = V.scanPaths(comp, [pL2]);
V.actCreate([{ item: p2[0], idx: [0, 1] }], false);
p2 = V.scanPaths(comp, [pL2]);
V.actPivot([{ item: p2[0], idx: [0, 1] }], []);
const piv2 = comp._layers.filter(l => V.kindOf(l) === "pivot");
ok(piv2.length === 1 && V.childrenOf(comp, piv2[0]).length === 2,
   "pivot over already-rigged points is unchanged");
ok(comp._layers.filter(l => V.kindOf(l) === "point").length === 2,
   "and it did not rig anything extra",
   comp._layers.filter(l => V.kindOf(l) === "point").length);

// picking nothing must still refuse rather than make an empty pivot
comp = newComp();
addShapeLayer(comp, "Empty", "Group 1", star(5, 60), [0, 0], 0, [100, 100]);
let emptyMsg = "";
V.UI.say = (m) => { emptyMsg = String(m); };
V.actPivot([], []);
V.UI.say = sayWas;
ok(comp._layers.filter(l => V.kindOf(l) === "pivot").length === 0,
   "no pivot from an empty pick");
ok(emptyMsg.indexOf("Pick some points") >= 0, "and it says what to do", emptyMsg);

// ================================================= generated expression JS
section("every generated expression is valid JavaScript");
let bad = 0, checked = 0;
for (const e of M.EXPRS) {
  checked++;
  try { new vm.Script("(function(){\n" + e.src + "\n})"); }
  catch (err) { bad++; console.log("  FAIL " + e.where + ": " + err.message); }
}
ok(bad === 0, checked + " expressions parse as JavaScript");
ok(checked > 15, "a decent number were generated", checked);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
