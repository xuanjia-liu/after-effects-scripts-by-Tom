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
const os = require("os");
const M = require("./ae-mock.js");

const SRC = path.join(__dirname, "..", "Vertex Rig.jsx");
const raw = fs.readFileSync(SRC, "utf8");
let src = raw;
const marker = "    loadPrefs();\n    buildUI(thisObj);";
if (src.indexOf(marker) < 0) { throw new Error("boot marker not found"); }
src = src.replace(marker, marker + `
    globalThis.__VXR = { scanPaths, actCreate, rigPoints, actSwitchHandleMode,
        actPivot, actAddToPivot, actRelease, actFollower, actAverageFollower, actDelete,
        actExtract, actMerge, toBezierOn, resolvePrimitives, readManifest, buildPathExpression, geomFor,
        itemMatrix, P, UI, state, kindOf, linkedLayer, findEffect, compOfExpression,
        allPathSignature, checkUnchanged, carriesData, childrenOf,
        scanPrimitives, actAddToPivot, nearestT,
        followPositionExpr, setupFollower, actShowPoints, ICON_ART, drawArt, paintIconButton,
        ICON_PX, HEAD_PX, ZOOM_PX, ICON_UNITS, roundRectPath,
        applyEdits, editsFor, editReport, boundsOfPicks, tipVec, tipKind, xformPt,
        actKeyPaths, hasKeyAt, pointedPaths, isPointedAt, revealKeyed, actRevealPaths,
        run, touched, countSel, countSelH, tipPicked, tipName, currentPicks,
        actMovePoints, actAlign, actTransform, actCurve,
        rawShape, cloneShape, geomFrom, snapAxis, inPolygon,
        layerMatrix, mInv, mVec, mPt, manEntry,
        actRelink, relinkOne, heldAt };`);

const names = ["app", "CompItem", "Shape", "PropertyType", "PropertyValueType",
  "KeyframeInterpolationType", "MaskMode", "Window", "Panel", "ScriptUI", "$",
  "File", "Folder"];
new Function(...names, src)(...names.map(n => M[n]));
const V = globalThis.__VXR;

// ------------------------------------------------------------------ helpers
let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log("  ok   " + label); }
  else { fail++; console.log("  FAIL " + label + (extra ? "  <- " + extra : "")); }
}
function section(s) { console.log("\n" + s); }

// Built as plain arrays and assigned once: pushing into sh.vertices pushes
// into a copy, in After Effects and now here too.
function star(n, r) {
  const sh = new M.Shape();
  const v = [], i0 = [], o = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    v.push([Math.cos(a) * r, Math.sin(a) * r]);
    i0.push([0, 0]);
    o.push([0, 0]);
  }
  sh.vertices = v;
  sh.inTangents = i0;
  sh.outTangents = o;
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

// A Shape's arrays read back as copies, in After Effects and in the mock, so
// an edit has to be assigned back. Same rule the script itself follows.
function setVert(sh, i, p) { const a = sh.vertices; a[i] = p; sh.vertices = a; }
function setIn(sh, i, p) { const a = sh.inTangents; a[i] = p; sh.inTangents = a; }
function setOut(sh, i, p) { const a = sh.outTangents; a[i] = p; sh.outTangents = a; }

// Scan one layer's paths without going through the panel's own refresh,
// which keeps a test's items its own.
function scanOn(c, L) { return globalThis.__VXR.scanPaths(c, [L]); }

function rulesInHead(head) {
  return head._kids.filter(c => c.type === "panel").length;
}

// ========================================================== source hygiene
section("source hygiene");
// applyOne used to declare "var touched" beside the run guard of that name,
// which shadowed it: the call that marks a manifest write threw instead, and
// the panel reported "nothing was changed" over an edit that had landed.
ok(!/\bvar\s[^;\n]*\btouched\b/.test(raw),
   "nothing declares a local named touched, which would quietly shadow the run guard",
   (raw.split("\n").filter(l => /\bvar\s[^;\n]*\btouched\b/.test(l))[0] || "").trim());
try { new vm.Script(raw); ok(true, "Vertex Rig.jsx parses"); }
catch (e) { ok(false, "Vertex Rig.jsx parses", e.message); }

const nonAscii = [];
raw.split("\n").forEach((line, i) => {
  if (/[^\x00-\x7F]/.test(line)) { nonAscii.push(i + 1); }
});
ok(nonAscii.length === 0, "pure ASCII (AE reads .jsx as Latin-1)",
   nonAscii.length ? "lines " + nonAscii.slice(0, 5).join(", ") : "");

// A reserved word as a bare object key is legal from ES5 on, so node parses it
// and After Effects answers "SyntaxError: Illegal use of reserved word" and
// refuses the whole script. "delete" as an icon name did exactly that.
{
  const RESERVED = ("break case catch continue default delete do else finally for " +
    "function if in instanceof new return switch this throw try typeof var void " +
    "while with abstract boolean byte char class const debugger double enum export " +
    "extends final float goto implements import int interface long native package " +
    "private protected public short static super synchronized throws transient " +
    "volatile null true false").split(" ");
  const bad = [];
  raw.split("\n").forEach((line, i) => {
    const m = line.match(/^\s*([A-Za-z_$][\w$]*)\s*:/);
    if (!m) { return; }
    // a switch's own default:, and a label, are statements rather than keys
    if (/^\s*(default|case)\s*:/.test(line)) { return; }
    if (RESERVED.indexOf(m[1]) >= 0) { bad.push((i + 1) + ":" + m[1]); }
  });
  ok(bad.length === 0, "no reserved word used as a bare object key",
     bad.slice(0, 5).join(", "));
}

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
setVert(keyed, 1, [20, -140]);
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
V.toBezierOn(comp, [rectL]);
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
try { V.toBezierOn(comp, [mixL]); } catch (e) { threw = e.message; }
ok(threw === null, "converting does not throw", threw);
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
  ok(e0.bi && e0.bo, "the stand-off is recorded on the point",
     JSON.stringify([e0.bi, e0.bo]));
  // it is kept in the control's own frame, so it is already in screen pixels
  const len = e0.bi ? Math.sqrt(e0.bi[0] ** 2 + e0.bi[1] ** 2) : 0;
  ok(Math.abs(len - 24) < 0.5, "24px, measured in the control's own frame",
     len.toFixed(2));
  const items = V.scanPaths(M.app.project.activeItem, null);
  let expr = "";
  for (const it of items) { if (V.readManifest(it.prop)) { expr = it.prop.expression; } }
  ok(/_w = _rp\(/.test(expr) && /_I\[\d+\] = _v - _w/.test(expr) &&
     /_O\[\d+\] = _v - _w/.test(expr),
     "the tangent is measured from it, read back through the control");
  // the whole point of the change: nothing in the subtraction is a constant
  ok(!/_I\[\d+\] = _v - _P\[\d+\] - \[/.test(expr),
     "and not from a constant that would stay put while the rig turns");
}

// ============================ the panel notices a selection change by itself
// After Effects raises no event for it, so the panel polls. The check has to
// be cheap, because a real refresh walks every layer in the composition.
section("the panel watches the selection");
{
  const task = M.app._tasks[M.app._tasks.length - 1];
  ok(!!task, "a task was scheduled");
  ok(task.repeat === true, "repeating", String(task.repeat));
  ok(task.ms >= 200 && task.ms <= 1000, "a few times a second, not constantly",
     task.ms + "ms");
  ok(/__vxrWatch/.test(task.src), "and it calls the panel's watcher", task.src);
  const watch = M.$.global.__vxrWatch;
  ok(typeof watch === "function", "which is there to be called");

  const c = newComp();
  const a = addShapeLayer(c, "A", "Group 1", star(5, 60), [0, 0], 0, [100, 100]);
  const b = addShapeLayer(c, "B", "Group 1", star(4, 40), [0, 0], 0, [100, 100]);
  a.selected = true;
  watch();                                   // settles on the current state

  V.UI.say("SENTINEL");
  watch();
  ok(V.state.status === "SENTINEL",
     "an unchanged selection costs nothing", V.state.status);

  a.selected = false;
  b.selected = true;
  watch();
  ok(V.state.status !== "SENTINEL", "a changed one refreshes", V.state.status);
  ok(V.state.items.length === 1 && V.state.items[0].layer.name === "B",
     "onto what is selected now", V.state.items.map(i => i.layer.name).join(","));

  // a layer appearing or going counts too
  V.UI.say("SENTINEL");
  addShapeLayer(c, "C", "Group 1", star(3, 30), [0, 0], 0, [100, 100]);
  watch();
  ok(V.state.status !== "SENTINEL", "so does the comp gaining a layer",
     V.state.status);

  // and a refresh of its own leaves the watcher nothing to react to
  V.UI.refresh();
  V.UI.say("SENTINEL");
  watch();
  ok(V.state.status === "SENTINEL",
     "a refresh settles the watcher, so it cannot wipe an action's message",
     V.state.status);
}

// ====================== a Pivot can carry the points without a control each
// The default is one layer for the whole group: each picked vertex is kept in
// the Pivot's own frame and read back through it, so there is nothing per
// point in the timeline.
section("pivot: one layer, no control per point");
{
  const c = newComp();
  const L = addShapeLayer(c, "Star", "Group 1", star(6, 70), [0, 0], 0, [100, 100]);
  let items = V.scanPaths(c, [L]);
  ok(V.P.pivotMode === "pivot", "one layer is the default", V.P.pivotMode);

  let said = "";
  const prev = V.UI.say;
  V.UI.say = m => { said = String(m); };
  V.actPivot([{ item: items[0], idx: [0, 1, 2, 3] }], []);
  V.UI.say = prev;

  const pivots = c._layers.filter(l => V.kindOf(l) === "pivot");
  ok(pivots.length === 1, "one pivot", pivots.length);
  ok(c._layers.filter(l => V.kindOf(l) === "point").length === 0,
     "and not one point control",
     c._layers.filter(l => V.kindOf(l) === "point").length);
  ok(c._layers.length === 2, "two layers in the comp, the artwork and the pivot",
     c._layers.length);
  ok(/driving 4 points/.test(said), "it says what it carries", said);

  items = V.scanPaths(c, [L]);
  const man = V.readManifest(items[0].prop);
  ok(man && man.pts.length === 4, "four points are rigged", man ? man.pts.length : "none");
  ok(man.pts.every(e => e.pp && e.pp.length === 2),
     "each one held as a point in the pivot's frame",
     JSON.stringify(man.pts[0]));
  ok(man.pts.every(e => e.fx === man.pts[0].fx),
     "all through the one link, not one each");
  const expr = items[0].prop.expression;
  ok(/_P\[\d+\] = _v/.test(expr) && /_rp\(/.test(expr),
     "and read back through the pivot", expr.split("\n").slice(-6)[0]);

  // the other mode still gives a control to each
  const c2 = newComp();
  const L2 = addShapeLayer(c2, "Star", "Group 1", star(6, 70), [0, 0], 0, [100, 100]);
  const i2 = V.scanPaths(c2, [L2]);
  V.P.pivotMode = "points";
  V.actPivot([{ item: i2[0], idx: [0, 1, 2] }], []);
  V.P.pivotMode = "pivot";
  ok(c2._layers.filter(l => V.kindOf(l) === "point").length === 3,
     "three point controls the other way",
     c2._layers.filter(l => V.kindOf(l) === "point").length);
  ok(c2._layers.filter(l => l.parent && V.kindOf(l.parent) === "pivot").length === 3,
     "all hung off the pivot");

  // pressing Pivot over points that already have controls groups those instead
  const c3 = newComp();
  const L3 = addShapeLayer(c3, "Star", "Group 1", star(6, 70), [0, 0], 0, [100, 100]);
  let i3 = V.scanPaths(c3, [L3]);
  V.actCreate([{ item: i3[0], idx: [0, 1] }], false);
  i3 = V.scanPaths(c3, [L3]);
  let said3 = "";
  const prev3 = V.UI.say;
  V.UI.say = m => { said3 = String(m); };
  V.actPivot([{ item: i3[0], idx: [0, 1, 2] }], []);
  V.UI.say = prev3;
  const piv3 = c3._layers.filter(l => V.kindOf(l) === "pivot")[0];
  ok(!!piv3, "a pivot was still made");
  ok(c3._layers.filter(l => l.parent === piv3).length === 2,
     "the two existing controls hang off it",
     c3._layers.filter(l => l.parent === piv3).length);
  ok(/carrying 2 controls/.test(said3) && /driving 1 point/.test(said3),
     "and it says it did both", said3);

  // deleting the pivot takes the points it held out of the rig
  M.app.project.activeItem = c;          // c2 and c3 above moved it
  let i4 = V.scanPaths(c, [L]);
  ok(V.readManifest(i4[0].prop).pts.length === 4, "four held before");
  V.actDelete([], [pivots[0]], false);
  i4 = V.scanPaths(c, [L]);
  const after = V.readManifest(i4[0].prop);
  ok(!after || after.pts.length === 0,
     "and none after, rather than reading a layer that is gone",
     after ? after.pts.length : "no manifest");
}

// ============== Handles works off a selection, not just a pick on the canvas
// Selecting a point's control, or one of its handles, is as good as picking
// the point in the preview: Handles can then fill in the side that is
// missing without hunting for the point again.
section("handles: a selected control counts as a pick");
{
  const c = newComp();
  const L = addShapeLayer(c, "Box", "Group 1", star(4, 60), [0, 0], 0, [100, 100]);
  V.P.handleMode = "layers";
  let items = V.scanPaths(c, [L]);

  // one point rigged, no handles yet
  V.actCreate([{ item: items[0], idx: [0] }], false);
  items = V.scanPaths(c, [L]);
  let man = V.readManifest(items[0].prop);
  const ctrl = V.linkedLayer(L, man.pts[0].fx);
  ok(!!ctrl && !man.pts[0]["if"] && !man.pts[0].of, "a control with no handles");

  // nothing picked on the canvas, the control selected in the timeline
  V.actCreate([], true, [ctrl]);
  items = V.scanPaths(c, [L]);
  man = V.readManifest(items[0].prop);
  ok(!!(man.pts[0]["if"] && man.pts[0].of),
     "selecting the control gives it both handles",
     JSON.stringify([man.pts[0]["if"], man.pts[0].of]));

  // and a selected handle names the point that owns it
  const c2 = newComp();
  const L2 = addShapeLayer(c2, "Box", "Group 1", star(4, 60), [0, 0], 0, [100, 100]);
  let i2 = V.scanPaths(c2, [L2]);
  V.actCreate([{ item: i2[0], idx: [0] }], true);
  i2 = V.scanPaths(c2, [L2]);
  let m2 = V.readManifest(i2[0].prop);
  const handle = V.linkedLayer(L2, m2.pts[0]["if"]);
  ok(V.kindOf(handle) === "handle", "that is a handle layer", V.kindOf(handle));
  // take one side away, then ask for handles with the other side selected
  V.actDelete([], [handle], false);
  i2 = V.scanPaths(c2, [L2]);
  m2 = V.readManifest(i2[0].prop);
  ok(!m2.pts[0]["if"] && !!m2.pts[0].of, "one side is gone");
  const other = V.linkedLayer(L2, m2.pts[0].of);
  V.actCreate([], true, [other]);
  i2 = V.scanPaths(c2, [L2]);
  m2 = V.readManifest(i2[0].prop);
  ok(!!m2.pts[0]["if"], "the missing side comes back from the handle's own selection",
     JSON.stringify(m2.pts[0]["if"]));

  // picked and selected do not count the point twice
  const c3 = newComp();
  const L3 = addShapeLayer(c3, "Box", "Group 1", star(4, 60), [0, 0], 0, [100, 100]);
  let i3 = V.scanPaths(c3, [L3]);
  V.actCreate([{ item: i3[0], idx: [0] }], false);
  i3 = V.scanPaths(c3, [L3]);
  const ctrl3 = V.linkedLayer(L3, V.readManifest(i3[0].prop).pts[0].fx);
  V.actCreate([{ item: i3[0], idx: [0] }], true, [ctrl3]);
  i3 = V.scanPaths(c3, [L3]);
  const m3 = V.readManifest(i3[0].prop);
  ok(m3.pts.length === 1, "one entry for the point, not two", m3.pts.length);
  ok(c3._layers.filter(l => V.kindOf(l) === "handle").length === 2,
     "and two handles, not four",
     c3._layers.filter(l => V.kindOf(l) === "handle").length);
}

// ====================== a rider can follow a shape that is not a path yet
// A rectangle has no path for a rider to run along, and the follower item
// carries no ref either, so the expression came out pointing at nothing.
// Picking one to follow is the same request as picking one to rig.
section("follow: a primitive becomes a path first");
{
  const c = newComp();
  const L = addPrimLayer(c, "Box", "Rectangle 1", "ADBE Vector Shape - Rect",
    p => { p.property("ADBE Vector Rect Size").setValue([200, 100]); }, [0, 0]);
  const rider = addShapeLayer(c, "Rider", "Group 1", star(4, 8), [0, 0], 0, [100, 100]);
  L.selected = true;
  V.UI.refresh();

  const prim = V.state.items.filter(i => i.prim)[0];
  ok(!!prim, "the rectangle is pickable");
  ok(prim.ref === undefined,
     "and carries no path reference, which is what broke the rider");

  let said = "";
  const prev = V.UI.say;
  V.UI.say = m => { said = String(m); };
  V.actFollower([{ item: prim, idx: [0] }], [rider]);
  V.UI.say = prev;

  const paths = V.scanPaths(c, [L]);
  ok(paths.length === 1, "it became a path", paths.length);
  ok(V.scanPrimitives(c, [L]).length === 0, "nothing parametric left");
  ok(/Turned 1 shape into a bezier path/.test(said), "and it says so", said);

  // the rider is driven by that path, not by nothing
  const expr = String(rider.transform.position.expression || "");
  ok(rider.transform.position.expressionEnabled, "the rider is driven");
  ok(expr.indexOf("undefined") < 0, "with no undefined reference in it",
     expr.split("\n").filter(l => /_p = /.test(l))[0]);
  ok(/pointOnPath/.test(expr), "it rides the path");
  ok(expr.indexOf(paths[0].ref) > 0, "naming the path that came out",
     paths[0].ref);
  ok(!!V.findEffect(rider, "VXR Path"), "and carries the link to its layer");
}

// ============================================ a dial for the follow angle
// Follow Rotation turns the rider to face along the path. A rider that should
// sit across the path, or lean, had to be nudged through the Rotation value
// hidden away in the Transform group - so the dial that does it now sits with
// the rest of the rig, in the Effect Controls.
//
// These run the generated expressions rather than reading them, because the
// claim is about degrees, not about text.
function runExpr(expr, effects, globals) {
  const lines = expr.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim()) { lines[i] = "return " + lines[i].trim(); break; }
  }
  const effect = name => {
    if (!(name in effects)) { throw new Error("no effect named " + name); }
    const v = effects[name];
    return () => v;
  };
  const g = Object.assign({
    value: 0, time: 0, hasParent: false,
    radiansToDegrees: r => r * 180 / Math.PI,
    degreesToRadians: d => d * Math.PI / 180,
    length: (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)
  }, globals || {});
  const names = ["effect"].concat(Object.keys(g));
  const args = [effect].concat(Object.keys(g).map(k => g[k]));
  return Function(names.join(","), lines.join("\n")).apply(null, args);
}

// A dead-straight horizontal path: its tangent angle is 0, so whatever comes
// out of the rotation expression is the offset and nothing else. It is used
// with a path that sits straight in the root group, so no group transform
// stands between the point and the comp - that chain has its own test above,
// and the arithmetic it does is AE's, not JavaScript's.
function flatPathLayer() {
  const node = {
    content: () => node,
    path: { pointOnPath: t => [t * 1000, 0] },
    toComp: v => v
  };
  return node;
}

section("follower: a Rotation Offset dial, in the effect controls");
{
  const c = newComp();
  const L = c.layers.addShape();
  L.name = "Road";
  L.transform.position.setValue([640, 360]);
  L.property("ADBE Root Vectors Group")
   .addProperty("ADBE Vector Shape - Group")
   .property("ADBE Vector Shape").setValue(star(5, 100));
  const rider = addShapeLayer(c, "Rider", "Group 1", star(4, 8), [0, 0], 0, [100, 100]);
  const item = V.scanPaths(c, [L])[0];
  V.actFollower([{ item: item, idx: [0] }], [rider]);
  ok(/function _fgl\(v\) \{ return v; \}/.test(rider.transform.rotation.expression),
     "no group transform in the way, so these degrees are the dial's");

  const dial = V.findEffect(rider, "VXR Rotation Offset");
  ok(!!dial, "the dial is there");
  ok(dial && dial.matchName === "ADBE Angle Control",
     "as an angle control, not another slider", dial && dial.matchName);
  ok(dial && dial.property(1).name === "Angle", "with an Angle to turn");

  // it sits last, under the checkbox it modifies, not loose among the others
  const names = [];
  const par = rider.property("ADBE Effect Parade");
  for (let i = 1; i <= par.numProperties; i++) { names.push(par.property(i).name); }
  ok(names.join("|") === "VXR Path|VXR Offset|VXR Follow Rotation|VXR Rotation Offset",
     "ordered under Follow Rotation", names.join(" / "));

  const rot = String(rider.transform.rotation.expression || "");
  const base = {
    "VXR Path": flatPathLayer(),
    "VXR Offset": 0,
    "VXR Follow Rotation": 1,
    "VXR Rotation Offset": 0
  };
  ok(Math.abs(runExpr(rot, base)) < 0.001,
     "a flat path with the dial at zero leaves the rider alone", runExpr(rot, base));

  const turned = Object.assign({}, base, { "VXR Rotation Offset": 90 });
  ok(Math.abs(runExpr(rot, turned) - 90) < 0.001,
     "90 on the dial turns the rider 90", runExpr(rot, turned));

  const leaning = Object.assign({}, base, { "VXR Rotation Offset": -37.5 });
  ok(Math.abs(runExpr(rot, leaning) + 37.5) < 0.001,
     "and it reads the real number, not a sign or a step", runExpr(rot, leaning));

  // the layer's own Rotation keeps working, so nobody's existing nudge is lost
  const both = Object.assign({}, base, { "VXR Rotation Offset": 30 });
  ok(Math.abs(runExpr(rot, both, { value: 12 }) - 42) < 0.001,
     "it adds to the layer's own rotation rather than replacing it",
     runExpr(rot, both, { value: 12 }));

  // off means off: the dial belongs to the follow, not to the layer
  const off = Object.assign({}, base, { "VXR Follow Rotation": 0, "VXR Rotation Offset": 90 });
  ok(runExpr(rot, off, { value: 7 }) === 7,
     "with Follow Rotation off the dial does nothing");

  // an older rig has no dial at all; reading one must not throw
  const older = Object.assign({}, base);
  delete older["VXR Rotation Offset"];
  ok(Math.abs(runExpr(rot, older, { value: 5 }) - 5) < 0.001,
     "a follower made before the dial existed still turns", runExpr(rot, older, { value: 5 }));

  // and letting the layer go takes the dial with it
  V.actDelete([], [rider], false);
  ok(V.findEffect(rider, "VXR Rotation Offset") === null, "release removes it again");
}

section("average follower: the same dial, the same degrees");
{
  const c = newComp();
  const L = addShapeLayer(c, "Road", "Group 1", star(5, 100), [0, 0]);
  L.selected = true;
  V.UI.refresh();
  V.actCreate(pickAll(V.state.items[0], [0, 2]), false, []);
  V.actAverageFollower(pickAll(V.state.items[0], [0, 2]), []);
  const avg = c._layers.filter(l => V.kindOf(l) === "avg")[0];
  ok(!!V.findEffect(avg, "VXR Rotation Offset"), "the average rider gets one too");

  const rot = String(avg.transform.rotation.expression || "");
  // Both points sit exactly where they rested, so the group has not turned and
  // every degree in the answer came from the dial.
  const held = {
    "VXR P1": { toComp: () => [0, 0] },
    "VXR P2": { toComp: () => [100, 0] },
    "VXR Follow Rotation": 1,
    "VXR Follow Scale": 0,
    "VXR Rotation Offset": 0
  };
  const still = runExpr(rot, held);
  const dialled = runExpr(rot, Object.assign({}, held, { "VXR Rotation Offset": 25 }));
  ok(Math.abs(dialled - still - 25) < 0.001,
     "25 on the dial is 25 degrees on top of the group's own turn", still, dialled);

  const noneAt = Object.assign({}, held);
  delete noneAt["VXR Rotation Offset"];
  ok(Math.abs(runExpr(rot, noneAt) - still) < 0.001,
     "and an older average rider is unaffected by its absence");
}

section("Handles is set in one place, not two");
{
  // The panel dropdown saves the moment it changes; the Preferences copy only
  // took effect on OK. One setting with two interaction models is a bug you
  // notice as a user before you notice it in the code.
  const writes = raw.split("\n")
    .filter(l => /P\.handleMode\s*=[^=]/.test(l));
  ok(writes.length === 1, "one control writes the setting", writes.length);
  ok(/modeDd/.test(writes[0]), "and it is the one on the panel", writes.join(" | "));
  ok(raw.indexOf("Masks inside the point control") < 0,
     "the Preferences copy is gone");
  ok(/dropdownlist", undefined, \["Handles: masks"/.test(raw),
     "the panel still offers both modes");
}

// ======================================= the preview pans and zooms by hand
// Until now every view came from a fit, so a crowded path could only be looked
// at from wherever the fit put it. Alt-drag pans, the wheel zooms about the
// pointer, and a double click on empty canvas is the way back.
section("preview: panning and zooming by hand");
{
  const c = newComp();
  const L = addShapeLayer(c, "Art", "Group 1", star(5, 90), [0, 0]);
  L.selected = true;
  V.UI.refresh();

  const cv = M.NODES.filter(n => n._on && n._on.mousewheel)[0];
  ok(!!cv, "the canvas listens for a wheel");
  ok(!!(cv && cv._on.mousedown && cv._on.mousemove && cv._on.mouseup),
     "and for the three mouse events a drag needs");

  // The gestures are invisible, so they have to be written down somewhere.
  // They used to be in this tooltip, which grew until it covered the artwork
  // it was explaining; Help holds them now, and the canvas points at it.
  ok(!!(cv.helpTip && cv.helpTip.length < 90 && /help/i.test(cv.helpTip)),
     "the canvas says one line and names where the rest is", cv.helpTip);
  const helpBtn = M.NODES.filter(n => /Every gesture/.test(n.says || ""))[0];
  ok(!!helpBtn && typeof helpBtn.onClick === "function", "there is a Help button");
  const helpSrc = raw.slice(raw.indexOf("var HELP = ["),
                            raw.indexOf("function helpDialog"));
  ok(/pan/i.test(helpSrc) && /zoom/i.test(helpSrc) && /frame everything/i.test(helpSrc),
     "and Help says how to pan, zoom and refit");
  ok(/arrow/i.test(helpSrc) && /lasso/i.test(helpSrc) && /align/i.test(helpSrc),
     "along with the keys, the lasso and the alignments");
  const helpRows = helpSrc.split("\n").filter(l => /^\s{8}\["/.test(l));
  ok(helpRows.length >= 14 && helpRows.length <= 26,
     "a page of it, not a manual", helpRows.length);
  ok(helpRows.every(l => l.length <= 86),
     "every line kept short enough to read across",
     (helpRows.filter(l => l.length > 86)[0] || "").trim());

  const start = Object.assign({}, V.state.view);
  ok(V.state.viewManual === false, "a fitted view is not a hand-set one");

  // --- pan ---------------------------------------------------------------
  cv.fire("mousedown", { clientX: 100, clientY: 100, altKey: true, detail: 1 });
  cv.fire("mousemove", { clientX: 140, clientY: 130, altKey: true });
  cv.fire("mouseup",   { clientX: 140, clientY: 130, altKey: true });
  ok(Math.abs(V.state.view.tx - start.tx - 40) < 1e-9 &&
     Math.abs(V.state.view.ty - start.ty - 30) < 1e-9,
     "alt-drag moves the view by exactly the drag",
     [V.state.view.tx - start.tx, V.state.view.ty - start.ty].join(","));
  ok(V.state.view.s === start.s, "and does not change the zoom");
  ok(V.state.viewManual === true, "the view is now hand-set");

  // a pan is not a pick: it must not land on a vertex and select it
  const pickedAfterPan = Object.keys(V.state.sel).length;
  ok(pickedAfterPan === 0, "panning selects nothing", pickedAfterPan);

  // the middle and right buttons pan too, for the devices that send them
  const beforeBtn = Object.assign({}, V.state.view);
  cv.fire("mousedown", { clientX: 10, clientY: 10, button: 2, detail: 1 });
  cv.fire("mousemove", { clientX: 25, clientY: 10, button: 2 });
  cv.fire("mouseup",   { clientX: 25, clientY: 10, button: 2 });
  ok(Math.abs(V.state.view.tx - beforeBtn.tx - 15) < 1e-9,
     "the right button pans as well", V.state.view.tx - beforeBtn.tx);

  // --- zoom ---------------------------------------------------------------
  // After Effects does not hand a wheel to a custom-drawn canvas, so zoom is
  // a drag on the same three events the pan and the marquee already use.
  // What sits under the press has to stay under the pointer, or the artwork
  // slides away from you as you lean in on it.
  const AT = [180, 120];
  const toComp = p => [(p[0] - V.state.view.tx) / V.state.view.s,
                       (p[1] - V.state.view.ty) / V.state.view.s];
  const zoomDrag = (keys, dy, steps) => {
    cv.fire("mousedown", Object.assign({ clientX: AT[0], clientY: AT[1], detail: 1 }, keys));
    for (let i = 1; i <= (steps || 1); i++) {
      cv.fire("mousemove", Object.assign(
        { clientX: AT[0], clientY: AT[1] - Math.round(dy * i / (steps || 1)) }, keys));
    }
    cv.fire("mouseup", Object.assign({ clientX: AT[0], clientY: AT[1] - dy }, keys));
  };

  const underBefore = toComp(AT);
  const sBefore = V.state.view.s;
  zoomDrag({ metaKey: true }, 60);
  ok(V.state.view.s > sBefore, "dragging up with Command zooms in",
     V.state.view.s / sBefore);
  const underAfter = toComp(AT);
  ok(Math.abs(underAfter[0] - underBefore[0]) < 1e-9 &&
     Math.abs(underAfter[1] - underBefore[1]) < 1e-9,
     "and what the drag started on is still under the pointer",
     underBefore.join(",") + " -> " + underAfter.join(","));

  const sIn = V.state.view.s;
  zoomDrag({ metaKey: true }, -60);
  ok(V.state.view.s < sIn, "dragging down comes back out", V.state.view.s);

  // Control does the same, for the platform where that is the free modifier
  const sCtl = V.state.view.s;
  zoomDrag({ ctrlKey: true }, 40);
  ok(V.state.view.s > sCtl, "Control drags the same way");

  // On macOS a Control-drag also arrives as the right button, which pans.
  // Zoom has to win, or that gesture would do the other thing.
  const beforeBoth = Object.assign({}, V.state.view);
  zoomDrag({ ctrlKey: true, button: 2 }, 40);
  ok(V.state.view.s !== beforeBoth.s,
     "a Control-drag reported as the right button zooms, not pans");

  // Every move is worked out from the press, not the move before it, so the
  // same drag in one step and in twenty lands in the same place.
  V.state.view.s = sBefore;
  V.state.view.tx = 0; V.state.view.ty = 0;
  zoomDrag({ metaKey: true }, 50, 1);
  const oneStep = JSON.stringify(V.state.view);
  V.state.view.s = sBefore;
  V.state.view.tx = 0; V.state.view.ty = 0;
  zoomDrag({ metaKey: true }, 50, 20);
  ok(JSON.stringify(V.state.view) === oneStep,
     "a dropped move cannot leave the zoom drifting", oneStep);

  // a zoom is not a pick either
  ok(Object.keys(V.state.sel).length === 0, "zooming selects nothing");

  // --- it cannot be zoomed into nothing -----------------------------------
  zoomDrag({ metaKey: true }, 4000);
  ok(V.state.view.s <= 64 + 1e-9, "zoom stops somewhere sane going in", V.state.view.s);
  zoomDrag({ metaKey: true }, -9000);
  ok(V.state.view.s >= 0.02 - 1e-9, "and going out", V.state.view.s);
  ok(isFinite(V.state.view.tx) && isFinite(V.state.view.ty),
     "and the view stays a real place either way");

  // the wheel listener is kept for hosts that do send one, but nothing rests
  // on it - After Effects is not one of them
  const sWheel = V.state.view.s;
  cv.fire("mousewheel", { clientX: AT[0], clientY: AT[1], wheelDelta: 120 });
  ok(V.state.view.s !== sWheel, "a host that does send a wheel still zooms");

  // --- the way back --------------------------------------------------------
  cv.fire("mousedown", { clientX: 4, clientY: 4, detail: 2 });
  ok(V.state.viewManual === false, "a double click on empty canvas fits again");
  const fitted = Object.assign({}, V.state.view);
  ok(Math.abs(fitted.s - start.s) < 1e-9 &&
     Math.abs(fitted.tx - start.tx) < 1e-9 &&
     Math.abs(fitted.ty - start.ty) < 1e-9,
     "landing back on the framing it had", JSON.stringify(fitted));
}

section("preview: the zoom strip is what a wheel can reach");
{
  const c = newComp();
  const L = addShapeLayer(c, "Art", "Group 1", star(5, 90), [0, 0]);
  L.selected = true;
  V.UI.refresh();

  const cv = M.NODES.filter(n => n._on && n._on.mousewheel)[0];
  const bar = M.NODES.filter(n => n.type === "scrollbar")[0];
  ok(!!bar, "there is a strip beside the canvas");
  ok(bar && bar.minimumSize[0] > bar.minimumSize[1],
     "lying flat under the preview, wider than it is tall",
     bar && bar.minimumSize.join("x"));
  ok(!!(bar && bar.onChanging), "and it reports while it is being turned");
  ok(!!(bar && bar.helpTip && /wheel/i.test(bar.helpTip)),
     "saying the wheel works here", bar && bar.helpTip);

  // Turning it zooms. Right is closer, left is wider, as a horizontal one reads.
  const fitted = V.state.view.s;
  const mid = bar.value;
  bar.turn(mid + 200);
  ok(V.state.view.s > fitted, "turning it right zooms in", V.state.view.s / fitted);
  bar.turn(mid - 200);
  ok(V.state.view.s < fitted, "and left zooms out", V.state.view.s / fitted);

  // the middle of the canvas is what stays put, since the pointer is on the
  // strip rather than on the artwork
  const CW = 320, CH = 260;
  const toComp = p => [(p[0] - V.state.view.tx) / V.state.view.s,
                       (p[1] - V.state.view.ty) / V.state.view.s];
  const before = toComp([CW / 2, CH / 2]);
  bar.turn(bar.value + 120);
  const after = toComp([CW / 2, CH / 2]);
  ok(Math.abs(before[0] - after[0]) < 1e-6 && Math.abs(before[1] - after[1]) < 1e-6,
     "about the middle of the view", before.join(",") + " -> " + after.join(","));

  // it cannot be turned past the ends
  bar.turn(bar.maxvalue);
  ok(V.state.view.s <= 64 + 1e-9 && V.state.view.s > 1,
     "hard right is as far in as it goes", V.state.view.s);
  bar.turn(bar.minvalue);
  ok(V.state.view.s >= 0.02 - 1e-9 && V.state.view.s < 1,
     "hard left as far out", V.state.view.s);

  // --- the strip follows the view, as well as leading it -------------------
  bar.turn(500);
  const zoomDragTo = dy => {
    cv.fire("mousedown", { clientX: 160, clientY: 130, metaKey: true, detail: 1 });
    cv.fire("mousemove", { clientX: 160, clientY: 130 - dy, metaKey: true });
    cv.fire("mouseup", { clientX: 160, clientY: 130 - dy, metaKey: true });
  };
  const wasBar = bar.value;
  zoomDragTo(70);
  ok(bar.value > wasBar, "a Command-drag in slides the strip right with it",
     wasBar + " -> " + bar.value);
  zoomDragTo(-140);
  ok(bar.value < wasBar, "and back left again", bar.value);

  // a double click refits, and the strip lands on the fitted zoom
  cv.fire("mousedown", { clientX: 3, clientY: 3, detail: 2 });
  ok(Math.abs(V.state.view.s - fitted) < 1e-9, "a double click refits", V.state.view.s);
  const expect = Math.round(Math.log(fitted / 0.02) / Math.log(64 / 0.02) * 1000);
  ok(Math.abs(bar.value - expect) <= 1, "with the strip where that zoom puts it",
     bar.value + " vs " + expect);

  // --- the arrows at each end -----------------------------------------
  const arrows = M.NODES.filter(n => n.type === "iconbutton" &&
                                     /zoom (in|out)/i.test(n.helpTip || ""));
  ok(arrows.length === 2, "an arrow at each end of the strip", arrows.length);
  ok(arrows.every(b => b.preferredSize[0] === V.ZOOM_PX &&
                       b.preferredSize[1] === V.ZOOM_PX),
     "both sized for the strip's own row",
     arrows.map(b => b.preferredSize.join("x")).join(" "));
  const out = arrows.filter(b => /out/i.test(b.helpTip))[0];
  const inn = arrows.filter(b => /in -/i.test(b.helpTip))[0];
  ok(!!out && !!inn, "one out, one in");

  bar.turn(500);
  const atMid = V.state.view.s;
  inn.onClick();
  ok(V.state.view.s > atMid && bar.value > 500, "the right arrow steps closer",
     bar.value + " / " + V.state.view.s.toFixed(3));
  out.onClick();
  ok(Math.abs(V.state.view.s - atMid) < 1e-6 && Math.abs(bar.value - 500) < 1,
     "and the left arrow steps straight back", bar.value);
  for (let i = 0; i < 30; i++) { out.onClick(); }
  ok(bar.value === bar.minvalue && V.state.view.s >= 0.02 - 1e-9,
     "stepping past the end stops at the end", bar.value);

  // writing the strip must not read back as the user turning it
  const settled = JSON.stringify(V.state.view);
  V.UI.refresh();
  V.UI.refresh();
  ok(JSON.stringify(V.state.view) === settled,
     "and echoing it back does not creep the view", V.state.view.s);
}

section("preview: a hand-set view is not thrown away by a refresh");
{
  const c = newComp();
  const L = addShapeLayer(c, "Art", "Group 1", star(5, 90), [0, 0]);
  L.selected = true;
  V.UI.refresh();
  const cv = M.NODES.filter(n => n._on && n._on.mousewheel)[0];

  // push the artwork clean off the canvas by hand
  cv.fire("mousedown", { clientX: 0, clientY: 0, altKey: true, detail: 1 });
  cv.fire("mousemove", { clientX: 4000, clientY: 3000, altKey: true });
  cv.fire("mouseup",   { clientX: 4000, clientY: 3000, altKey: true });
  const parked = JSON.stringify(V.state.view);
  ok(V.state.viewManual === true, "the view is hand-set and off the artwork");

  V.UI.refresh();
  ok(JSON.stringify(V.state.view) === parked,
     "a refresh over the same paths leaves it exactly where it was put");

  // but showing something else is a different picture, and reframes
  const other = addShapeLayer(c, "Other", "Group 1", star(3, 40), [500, 300]);
  L.selected = false;
  other.selected = true;
  V.UI.refresh();
  ok(JSON.stringify(V.state.view) !== parked, "showing other paths refits");
  ok(V.state.viewManual === false, "and the view is its own again");
}

section("show points: a primitive becomes a path first");
{
  const c = newComp();
  const L = addPrimLayer(c, "Box", "Rectangle 1", "ADBE Vector Shape - Rect",
    p => { p.property("ADBE Vector Rect Size").setValue([200, 100]); }, [0, 0]);
  L.selected = true;
  V.UI.refresh();

  const prim = V.state.items.filter(i => i.prim)[0];
  ok(!!prim, "the rectangle is pickable");
  ok(V.scanPaths(c, [L]).length === 0, "and there is no path on it to show");

  let said = "";
  const prev = V.UI.say;
  V.UI.say = m => { said = String(m); };
  V.actShowPoints([prim]);
  V.UI.say = prev;

  const paths = V.scanPaths(c, [L]);
  ok(paths.length === 1, "showing its points turns it into a path", paths.length);
  ok(V.scanPrimitives(c, [L]).length === 0, "nothing parametric left");
  ok(/Turned 1 shape into a bezier path/.test(said), "and it says so", said);
  ok(/Showing the points/.test(said), "as well as what it did", said);

  // One step on the undo stack, not one per shape. Settled by reading the
  // source, because the stack belongs to the user and pressing Undo to check
  // would walk into their own edits and cut their redo history short.
  const body = raw.slice(raw.indexOf("function actShowPoints"));
  const end = body.indexOf("\n    }\n");
  const inside = body.slice(0, end);
  ok((inside.match(/beginUndoGroup/g) || []).length === 1,
     "it opens one undo group");
  ok(/catch[\s\S]{0,80}endUndoGroup[\s\S]{0,40}undoLast/.test(inside),
     "and rolls its own group back if the conversion throws");

  // and the group round the new path is what carries the selection
  const holder = paths[0].prop.propertyGroup(1);
  ok(holder.selected === true, "the group round the path is selected");
  ok(paths[0].prop.selected !== true,
     "and the path itself is not, so its points are not all grabbed");
}

// ================================= the panel and the timeline pick together
// After Effects cannot say which vertices are selected - a path property's
// "selected" is all of them or none, and the Shape object carries no
// selection at all. What it can say is which layers are selected, and a
// rigged point has a layer standing for it. That is the channel.
section("selection sync: the timeline speaks to the panel");
{
  const c = newComp();
  const L = addShapeLayer(c, "Art", "Group 1", star(5, 90), [0, 0]);
  L.selected = true;
  V.UI.refresh();
  V.actCreate(pickAll(V.state.items[0], [0, 2]), false, []);
  V.UI.refresh();

  const item = V.state.items[0];
  const man = V.readManifest(item.prop);
  ok(man && man.pts.length === 2, "two points rigged", man && man.pts.length);
  const ctrl0 = V.linkedLayer(item.layer, man.pts[0].fx);
  const ctrl2 = V.linkedLayer(item.layer, man.pts[1].fx);
  ok(!!ctrl0 && !!ctrl2, "each has a control layer");

  // nothing picked in the panel to begin with
  V.state.sel = {};
  V.state.ctrlSig = null;

  // pick one point's control in the timeline
  for (const l of c._layers) { l.selected = false; }
  ctrl0.selected = true;
  V.UI.refresh();
  let picked = V.state.sel[V.state.items[0].key] || [];
  ok(picked.length === 1 && picked[0] === man.pts[0].i,
     "choosing a control in the timeline ticks its point here",
     JSON.stringify(picked));

  // and the artwork is still on show, though only a control is selected
  ok(V.state.items.length >= 1 && V.state.items[0].layer.name === "Art",
     "the layer it rigs comes into view with it", V.state.items.length);

  // both controls
  ctrl2.selected = true;
  V.UI.refresh();
  picked = (V.state.sel[V.state.items[0].key] || []).slice().sort((a, b) => a - b);
  ok(picked.length === 2, "two controls tick two points", JSON.stringify(picked));

  // a handle stands for its point too
  V.actCreate(pickAll(V.state.items[0], [0]), true, []);
  V.UI.refresh();
  const man2 = V.readManifest(V.state.items[0].prop);
  const ent = man2.pts.filter(e => e.i === man.pts[0].i)[0];
  const hName = ent["if"] || ent.of;
  const handle = hName ? V.linkedLayer(V.state.items[0].layer, hName) : null;
  if (handle) {
    for (const l of c._layers) { l.selected = false; }
    V.state.sel = {};
    V.state.ctrlSig = null;
    handle.selected = true;
    V.UI.refresh();
    picked = V.state.sel[V.state.items[0].key] || [];
    ok(picked.length === 1 && picked[0] === ent.i,
       "and picking a handle ticks the point it belongs to", JSON.stringify(picked));
  } else {
    ok(false, "the point got a handle to test with");
  }

  // a refresh with nothing new from the timeline must not undo a panel pick
  const held = JSON.stringify(V.state.sel);
  V.UI.refresh();
  V.UI.refresh();
  ok(JSON.stringify(V.state.sel) === held,
     "and a refresh that brings no news leaves the picks alone", V.state.sel);
}

section("selection sync: the panel speaks to the timeline");
{
  const c = newComp();
  const L = addShapeLayer(c, "Art", "Group 1", star(5, 90), [0, 0]);
  L.selected = true;
  V.UI.refresh();
  V.actCreate(pickAll(V.state.items[0], [0, 2]), false, []);
  V.UI.refresh();

  const item = V.state.items[0];
  const man = V.readManifest(item.prop);
  const ctrl0 = V.linkedLayer(item.layer, man.pts[0].fx);
  const ctrl2 = V.linkedLayer(item.layer, man.pts[1].fx);
  for (const l of c._layers) { l.selected = false; }
  L.selected = true;

  const cv = M.NODES.filter(n => n._on && n._on.mousewheel)[0];
  const at = k => {
    const pt = V.state.geom[0].verts[k];
    return [pt[0] * V.state.view.s + V.state.view.tx,
            pt[1] * V.state.view.s + V.state.view.ty];
  };
  const click = (k, shift) => {
    const p = at(k);
    cv.fire("mousedown", { clientX: p[0], clientY: p[1], detail: 1, shiftKey: !!shift });
    cv.fire("mouseup", { clientX: p[0], clientY: p[1], shiftKey: !!shift });
  };

  click(man.pts[0].i);
  ok(ctrl0.selected === true, "clicking a point here selects its control there");
  ok(ctrl2.selected === false, "and only that one");
  ok(L.selected === true, "the artwork layer's own selection is left alone");

  click(man.pts[1].i, true);
  ok(ctrl0.selected === true && ctrl2.selected === true,
     "shift-clicking a second point adds its control");

  // clicking empty canvas drops the picks, and the timeline follows
  cv.fire("mousedown", { clientX: 2, clientY: 2, detail: 1 });
  cv.fire("mouseup", { clientX: 2, clientY: 2 });
  ok(ctrl0.selected === false && ctrl2.selected === false,
     "letting the points go lets the controls go");

  // All/None works the same way
  const bPick = M.NODES.filter(n => n.type === "iconbutton" && /all|none/i.test(n.says || ""))[0];
  if (bPick && bPick.onClick) {
    bPick.onClick();
    ok(ctrl0.selected === true && ctrl2.selected === true,
       "and All picks every control with every point");
  } else {
    ok(false, "the All/None button was found");
  }

  // the round trip settles instead of fighting itself
  const after = JSON.stringify(V.state.sel);
  V.UI.refresh();
  ok(JSON.stringify(V.state.sel) === after,
     "a refresh straight after agrees with what the panel just said", V.state.sel);
}

// ============================ Refresh is gone; the repair lives in Preferences
// Everything Refresh re-read is already automatic - the selection watcher,
// panel activation, every action and a scope change all call refresh. The one
// thing nothing else did was rebuild every rig's tangent bindings at once, and
// that is maintenance you want once rather than a button you keep.
section("no Refresh button; the bulk repair is behind Preferences");
{
  ok(!/act\([^)]*"refresh"/.test(raw), "Refresh is off the row");
  ok(raw.indexOf("bRefresh") < 0, "with nothing left wired to it");
  ok(!/"refresh":/.test(raw), "and its icon is not carried either");

  // the repair is still reachable, and still only from one place
  ok(/Rebuild tangent bindings/.test(raw), "Preferences offers the rebuild");
  ok(/prefsWantRepair/.test(raw),
     "which runs after the dialog closes, not inside it");
  // the definition line matches too, so exclude it
  const calls = (raw.match(/(?<!function )actRepairTangents\(\)/g) || []).length;
  ok(calls === 1, "called from exactly one place", calls);

  // and the per-path repair that happens as you work is untouched
  ok((raw.match(/bindTangents\(/g) || []).length >= 4,
     "rigging a path still binds it on the way",
     (raw.match(/bindTangents\(/g) || []).length);

  // the row still fits, with more room than before
  const win = M.NODES.filter(n => n.type === "window")[0];
  const head = win._kids[0];
  const w = head._kids.reduce((n, c) => n + c.preferredSize[0], 0) +
            4 * (head._kids.length - 1);
  ok(w <= 368, "the top row fits", w + " of 368");
  ok(head._kids.filter(c => c.type === "iconbutton").length === 8,
     "eight icons on it now, Help among them",
     head._kids.filter(c => c.type === "iconbutton").length);
}

// ===================== showing a path's own points in the composition
// After Effects draws the vertices of whatever path property is selected,
// so the button selects the property rather than drawing anything itself.
section("show points selects the path property");
{
  const c = newComp();
  const A = addShapeLayer(c, "A", "Group 1", star(5, 60), [0, 0], 0, [100, 100]);
  const B = addShapeLayer(c, "B", "Group 1", star(4, 40), [0, 0], 0, [100, 100]);
  const items = V.scanPaths(c, null);
  ok(items.length === 2, "two paths", items.length);
  const holder = it => it.prop.propertyGroup(1);
  ok(!holder(items[0]).selected && !holder(items[1]).selected,
     "neither showing to start");

  let said = "";
  const prev = V.UI.say;
  V.UI.say = m => { said = String(m); };
  V.actShowPoints(items);
  V.UI.say = prev;

  ok(holder(items[0]).selected && holder(items[1]).selected,
     "the group round each path is selected, which draws the path");
  ok(!items[0].prop.selected && !items[1].prop.selected,
     "and the path itself is not, so its points are not all grabbed");
  // After Effects selects the layer itself when a property on it is selected,
  // and clearing the layer clears the property, so Show points does not touch
  // it. Scoped to that function: the reveal commands act on selected layers
  // and have to say so outright, which is a different job.
  const showSrc = raw.slice(raw.indexOf("function actShowPoints("),
                            raw.indexOf("function toBezierOn("));
  ok(!/\.layer\.selected = true/.test(showSrc) &&
     !/\.selected = (true|want)/.test(showSrc.replace(/holders\[i\]\.selected = want;/, "")),
     "Show points does not select the layer - After Effects does that itself");
  ok(/Showing the points of 2 paths/.test(said), "it says so", said);

  // pressing again puts them away
  V.UI.say = m => { said = String(m); };
  V.actShowPoints(items);
  V.UI.say = prev;
  ok(!holder(items[0]).selected && !holder(items[1]).selected,
     "pressing again hides them");
  ok(/Hid the points of 2 paths/.test(said), "and says that instead", said);

  // a half-showing set turns the rest on rather than toggling off
  holder(items[0]).selected = true;
  V.actShowPoints(items);
  ok(holder(items[0]).selected && holder(items[1]).selected,
     "one already showing means show the rest, not hide the one");

  // nothing to show is said, not thrown
  V.UI.say = m => { said = String(m); };
  const r = V.actShowPoints([]);
  V.UI.say = prev;
  ok(r === false && /Nothing in view/.test(said), "an empty list is refused", said);

  // the button takes the picks, and the whole view when nothing is picked
  ok(/if \(!list\.length\) \{ list = state\.items\.slice\(0\); \}/.test(raw),
     "the button falls back to everything in view");
}

// ================================== All and None are one button, not two
section("the pick toggle offers the opposite of what you have");
{
  const c = newComp();
  const L = addShapeLayer(c, "Box", "Group 1", star(5, 60), [0, 0], 0, [100, 100]);
  L.selected = true;
  V.UI.refresh();
  const win = M.NODES.filter(n => n.type === "window")[0];
  const toggle = win._kids[0]._kids.filter(
    c2 => /Pick every point|Let every picked point go/.test(c2.helpTip || ""))[0];
  ok(!!toggle, "there is one button for both");

  ok(/^All - /.test(toggle.says), "with nothing picked it offers All", toggle.says);
  toggle.onClick();
  ok(V.countSel ? true : true, "pressed");
  const picked = Object.keys(V.state.sel).length;
  ok(picked === 1 && V.state.sel[V.state.items[0].key].length === 5,
     "which picks every point in view",
     picked ? V.state.sel[V.state.items[0].key].length : 0);
  ok(/^None - /.test(toggle.says), "and now offers None", toggle.says);
  ok(toggle.helpTip === toggle.says, "the tooltip says the same");

  toggle.onClick();
  ok(Object.keys(V.state.sel).length === 0, "pressing it again lets them go");
  ok(/^All - /.test(toggle.says), "and it offers All again", toggle.says);

  // the picture follows, not just the words
  const seen = [];
  const rec = {
    BrushType: { SOLID_COLOR: 0 }, PenType: { SOLID_COLOR: 0 },
    newBrush: () => ({}), newPen: () => ({}),
    newPath() {}, moveTo() {}, lineTo() {}, closePath() {},
    rectPath() {}, ellipsePath() {},
    // All is four filled squares, None is four outlined ones: same count,
    // so it is the fills that tell them apart
    fillPath() { seen.push("fill"); }, strokePath() { seen.push("stroke"); },
    drawString() {}, foregroundColor: null
  };
  const real = toggle.graphics;
  toggle.graphics = rec;
  toggle.onDraw(undefined);
  const emptyFills = seen.filter(x => x === "fill").length;
  seen.length = 0;
  toggle.onClick();                    // pick everything again
  toggle.onDraw(undefined);
  const fullFills = seen.filter(x => x === "fill").length;
  toggle.graphics = real;
  ok(emptyFills > 0 && fullFills > 0, "it draws something either way",
     emptyFills + "/" + fullFills);
  ok(emptyFills !== fullFills, "and a different picture for each",
     "All filled " + emptyFills + ", None filled " + fullFills);
}

// ========================== a handle mask has to stay draggable, both ends
// The near end was briefly pinned to the point with an expression. After
// Effects will not let you drag a mask path that carries one, so that froze
// the far end as well - the end that actually sets the tangent. Nothing may
// put an expression on a handle mask.
section("handle masks: nothing holds them still");
{
  const c = newComp();
  const L = addShapeLayer(c, "Box", "Group 1", star(4, 60), [0, 0], 0, [100, 100]);
  V.P.handleMode = "masks";
  let items = V.scanPaths(c, [L]);
  V.actCreate([{ item: items[0], idx: [0] }], true);
  items = V.scanPaths(c, [L]);
  const man = V.readManifest(items[0].prop);
  const ctrl = V.linkedLayer(L, man.pts[0].fx);
  ok(!!ctrl && man.pts[0].im, "the handle is a mask on the control");

  const masks = ctrl.property("ADBE Mask Parade");
  const found = [];
  for (let i = 1; i <= masks.numProperties; i++) { found.push(masks.property(i)); }
  ok(found.length === 2, "both ends of the point have one", found.length);
  const driven = found.filter(mk => mk.property("ADBE Mask Shape").expressionEnabled);
  ok(driven.length === 0, "and neither carries an expression", driven.length);

  // one made while the pin existed is freed the next time the path is touched
  const pin = found[0].property("ADBE Mask Shape");
  const was = pin.value;
  try {
    pin.expression = [
      "var p = thisProperty.points();",
      "var i = thisProperty.inTangents();",
      "var o = thisProperty.outTangents();",
      "if (p.length) { p[0] = [0, 0]; i[0] = [0, 0]; o[0] = [0, 0]; }",
      "createPath(p, i, o, false);"
    ].join("\n");
  } catch (e) { /* a mock that will not hold one is fine */ }
  if (pin.expressionEnabled) {
    V.actCreate([{ item: items[0], idx: [0] }], true);
    ok(!pin.expressionEnabled, "an older pinned mask is let go");
    ok(pin.value.vertices[1][0] === was.vertices[1][0] &&
       pin.value.vertices[1][1] === was.vertices[1][1],
       "keeping the handle where it was",
       JSON.stringify(pin.value.vertices[1]));
  } else {
    ok(/function unpinMaskHandles/.test(raw) && /unpinMaskHandles\(item, man\)/.test(raw),
       "and an older pinned one would be let go when the path is touched");
  }

  ok(!/pinNearEnd/.test(raw), "nothing pins a mask any more");
}

// ================================= the pivot marker matches the pivot icon
section("the pivot in the comp looks like the pivot on the panel");
{
  const c = newComp();
  const L = addShapeLayer(c, "Star", "Group 1", star(5, 70), [0, 0], 0, [100, 100]);
  const items = V.scanPaths(c, [L]);
  V.actPivot([{ item: items[0], idx: [0, 1, 2] }], []);
  const piv = c._layers.filter(l => V.kindOf(l) === "pivot")[0];
  ok(!!piv, "a pivot was made");

  const marker = piv.property("ADBE Root Vectors Group").property("Marker")
                    .property("ADBE Vectors Group");
  const kids = [];
  for (let i = 1; i <= marker.numProperties; i++) { kids.push(marker.property(i)); }
  ok(kids.length === 2, "its marker is two groups, not one path", kids.length);
  ok(kids[0].name === "Ring" && kids[1].name === "Core",
     "a ring and a core", kids.map(k => k.name).join(","));

  const ring = kids[0].property("ADBE Vectors Group");
  const rNames = [];
  for (let i = 1; i <= ring.numProperties; i++) { rNames.push(ring.property(i).name); }
  ok(rNames.filter(n => /^Tick/.test(n)).length === 4, "four ticks",
     rNames.join(","));
  ok(rNames.indexOf("Ring Path") >= 0, "round a ring");
  const stroke = [];
  for (let i = 1; i <= ring.numProperties; i++) {
    if (ring.property(i).matchName === "ADBE Vector Graphic - Stroke") { stroke.push(i); }
  }
  ok(stroke.length === (V.P.outline ? 2 : 1),
     "stroked, not filled - a fill would close the ring up", stroke.length);
  // every other control gets a dark outline for light artwork; so does this
  if (V.P.outline) {
    const dark = ring.property(stroke[1]).property("ADBE Vector Stroke Color").value;
    ok(dark[0] === 0 && dark[1] === 0 && dark[2] === 0,
       "with a black outline behind the coloured line", dark.join(","));
    const wide = ring.property(stroke[1]).property("ADBE Vector Stroke Width").value;
    const thin = ring.property(stroke[0]).property("ADBE Vector Stroke Width").value;
    ok(wide > thin, "and wider, so it shows as an edge", thin + " -> " + wide);
  }

  // the proportions are the icon's: ring 0.435, ticks 0.609 to 1, core 0.139
  const r = Math.max(4, V.P.size) / 2;
  const ringPath = ring.property("Ring Path").property("ADBE Vector Shape").value;
  ok(Math.abs(Math.abs(ringPath.vertices[0][1]) - r * 0.435) < 0.1,
     "the ring is the icon's ring", Math.abs(ringPath.vertices[0][1]).toFixed(2));
  const tick = ring.property("Tick 1").property("ADBE Vector Shape").value;
  ok(Math.abs(Math.abs(tick.vertices[1][1]) - r) < 0.1 &&
     Math.abs(Math.abs(tick.vertices[0][1]) - r * 0.609) < 0.1,
     "and the ticks run from 0.609 out to the edge",
     tick.vertices.map(v => v[1].toFixed(1)).join(" -> "));

  // the other kinds are untouched
  V.actCreate([{ item: items[0], idx: [4] }], false);
  const pt = c._layers.filter(l => V.kindOf(l) === "point")[0];
  const pm = pt.property("ADBE Root Vectors Group").property("Marker")
               .property("ADBE Vectors Group");
  ok(pm.property(1).name === "Marker Path",
     "a point control is still one path", pm.property(1).name);
}

// ===================================== one Delete for everything the rig makes
section("delete: points, handles, pivots and followers alike");
{
  const say = () => { let m = ""; const prev = V.UI.say;
    V.UI.say = x => { m = String(x); }; return { get: () => m, done: () => { V.UI.say = prev; } }; };

  // nothing picked and nothing selected must not mean "every rig in the comp"
  {
    const c = newComp();
    const L = addShapeLayer(c, "Star", "Group 1", star(5, 70), [0, 0], 0, [100, 100]);
    let items = V.scanPaths(c, [L]);
    V.actCreate([{ item: items[0], idx: [0, 1, 2] }], false);
    const s1 = say();
    V.actDelete([], [], false);
    s1.done();
    ok(/Pick some points/.test(s1.get()), "it asks for a target", s1.get());
    items = V.scanPaths(c, [L]);
    ok(V.readManifest(items[0].prop).pts.length === 3,
       "and leaves the rig alone", V.readManifest(items[0].prop).pts.length);
  }

  // a selected handle costs its point nothing
  {
    const c = newComp();
    const L = addShapeLayer(c, "Hand", "Group 1", star(5, 70), [0, 0], 0, [100, 100]);
    V.P.handleMode = "layers";
    let items = V.scanPaths(c, [L]);
    V.actCreate([{ item: items[0], idx: [0] }], true);
    items = V.scanPaths(c, [L]);
    let man = V.readManifest(items[0].prop);
    const inName = man.pts[0]["if"];
    const handle = V.linkedLayer(L, inName);
    ok(!!handle && V.kindOf(handle) === "handle", "the in handle is a layer");
    const point = V.linkedLayer(L, man.pts[0].fx);

    const s2 = say();
    V.actDelete([], [handle], false);
    s2.done();
    items = V.scanPaths(c, [L]);
    man = V.readManifest(items[0].prop);
    ok(!!man && man.pts.length === 1, "the point is still rigged",
       man ? man.pts.length : "no manifest");
    ok(!man.pts[0]["if"], "without its in handle", man.pts[0]["if"]);
    ok(!!man.pts[0].of, "and keeping its out handle");
    ok(c._layers.indexOf(point) >= 0, "the point control is untouched");
    ok(c._layers.indexOf(handle) < 0, "the handle layer is gone");
    ok(/handle/.test(s2.get()), "and it says what went", s2.get());
  }

  // a pivot goes, its children stay where they were
  {
    V.P.pivotMode = "points";          // this one is about the children
    const c = newComp();
    const L = addShapeLayer(c, "Star", "Group 1", star(5, 70), [0, 0], 0, [100, 100]);
    const items = V.scanPaths(c, [L]);
    V.actPivot([{ item: items[0], idx: [0, 1, 2] }], []);
    const piv = c._layers.filter(l => V.kindOf(l) === "pivot")[0];
    const kids = c._layers.filter(l => l.parent === piv);
    ok(kids.length === 3, "three controls hang off it", kids.length);

    const s3 = say();
    V.actDelete([], [piv], false);
    s3.done();
    ok(c._layers.indexOf(piv) < 0, "the pivot is gone");
    ok(kids.every(k => c._layers.indexOf(k) >= 0), "its controls are not");
    ok(kids.every(k => !k.parent), "and were let go, not left pointing at nothing");
    ok(/pivot/.test(s3.get()), "and it says so", s3.get());
    V.P.pivotMode = "pivot";
  }

  // a follower on a layer of the user's own is detached, not deleted
  {
    const c = newComp();
    const L = addShapeLayer(c, "Path", "Group 1", star(5, 70), [0, 0], 0, [100, 100]);
    const rider = addShapeLayer(c, "Rider", "Group 1", star(4, 8), [0, 0], 0, [100, 100]);
    const items = V.scanPaths(c, [L]);
    V.actFollower([{ item: items[0], idx: [0] }], [rider]);
    ok(rider.transform.position.expressionEnabled, "the rider is driven");

    const s4 = say();
    V.actDelete([], [rider], false);
    s4.done();
    ok(c._layers.indexOf(rider) >= 0, "the user's own layer stays");
    ok(!rider.transform.position.expressionEnabled, "but is no longer driven");
    ok(!V.findEffect(rider, "VXR Path"), "and keeps none of the rig's effects");
    ok(/follower/.test(s4.get()), "and it says so", s4.get());
  }
}

// =========================================== icons on the buttons, in tabs
// The icons are vector paths the panel strokes itself. A bitmap would be
// upscaled on a retina display and look soft, and ScriptUI will not scale one
// for you - so nothing here is a picture file.
section("icons: drawn paths, not pictures");
{
  const names = Object.keys(V.ICON_ART);
  // no exact count: the set grows with the panel, and what matters is that
  // every icon is used and every use names one that exists
  ok(names.length >= 12, "a full set of icons is defined", names.length);
  ok(raw.indexOf("newImage") < 0 && raw.indexOf("b64") < 0,
     "no image is loaded and no base64 is decoded any more");

  // every op has a shape the drawing code knows, and stays inside the box
  const KINDS = { p: 1, b: 1, c: 1, r: 1, d: 1, x: 1 };
  const bad = [];
  for (const name of names) {
    const ops = V.ICON_ART[name];
    if (!ops.length) { bad.push(name + ":empty"); continue; }
    for (const op of ops) {
      if (!KINDS[op[0]]) { bad.push(name + ":kind " + op[0]); continue; }
      if (typeof op[1] !== "number" || op[1] < 0) { bad.push(name + ":width"); continue; }
      let nums;
      if (op[0] === "p" || op[0] === "b") {
        nums = op[2];
        if (!Array.isArray(nums) || nums.length < 4 || nums.length % 2) {
          bad.push(name + ":points"); continue;
        }
        if (op[0] === "b" && nums.length !== 8) { bad.push(name + ":cubic"); continue; }
      } else if (op[0] === "x") {
        nums = op.slice(2);
        if (nums.length !== 4) { bad.push(name + ":rect"); continue; }
      } else {
        nums = op.slice(2);
        if (nums.length !== 3) { bad.push(name + ":centre"); continue; }
      }
      for (const v of nums) {
        if (typeof v !== "number" || v < -1 || v > V.ICON_UNITS + 1) {
          bad.push(name + ":out of box " + v);
          break;
        }
      }
    }
  }
  ok(bad.length === 0, "every path is well formed and inside the 28 unit box",
     bad.slice(0, 4).join(", "));

  // and the drawing code actually runs over all of them
  function recorder() {
    const log = [];
    return {
      log,
      BrushType: { SOLID_COLOR: 0 }, PenType: { SOLID_COLOR: 0 },
      newBrush: () => ({}), newPen: (t, c, w) => ({ w }),
      newPath() { log.push("newPath"); },
      moveTo() { log.push("moveTo"); }, lineTo() { log.push("lineTo"); },
      closePath() { log.push("closePath"); },
      rectPath() { log.push("rectPath"); }, ellipsePath() { log.push("ellipsePath"); },
      fillPath() { log.push("fill"); }, strokePath() { log.push("stroke"); },
      drawString() {}, foregroundColor: null
    };
  }
  let drawFails = [], thin = [];
  for (const name of names) {
    const g = recorder();
    try { V.drawArt(g, V.ICON_ART[name], 0, 0, 28, [0.8, 0.8, 0.8], 1); }
    catch (e) { drawFails.push(name + ": " + e.message); continue; }
    const marks = g.log.filter(x => x === "fill" || x === "stroke").length;
    const arrow = (name === "zoomout" || name === "zoomin");
    if (marks < (arrow ? 1 : 2)) { thin.push(name + ":" + marks); }
  }
  ok(drawFails.length === 0, "drawing every icon runs clean", drawFails.slice(0, 3).join("; "));
  ok(thin.length === 0,
     "and each one puts down a mark - more than one unless it is just an arrow",
     thin.join(", "));

  // the whole button, chrome and all, including the pressed and hover states
  const states = [undefined, { mouseOver: true }, { leftButtonPressed: true }];
  let btnFails = [];
  for (const st of states) {
    const g = recorder();
    const ctrl = { graphics: g, size: { width: 40, height: 40 }, enabled: true };
    try { V.paintIconButton(ctrl, V.ICON_ART.create, st); }
    catch (e) { btnFails.push(String(st && Object.keys(st)) + ": " + e.message); continue; }
    if (g.log.indexOf("fill") < 0 || g.log.indexOf("stroke") < 0) {
      btnFails.push("no chrome drawn");
    }
  }
  ok(btnFails.length === 0, "the button paints itself in every state",
     btnFails.join("; "));

  // the rounded rectangle has to close, or the fill leaks
  const g2 = recorder();
  V.roundRectPath(g2, 0.5, 0.5, 39, 39, 4);
  ok(g2.log[0] === "newPath" && g2.log[g2.log.length - 1] === "closePath",
     "the rounded rectangle is a closed path", g2.log.slice(0, 2).join(","));
  ok(g2.log.filter(x => x === "lineTo").length >= 16,
     "stepped round in enough segments to read as a curve",
     g2.log.filter(x => x === "lineTo").length);

  // every act() names an icon that exists, and none is unused
  const used = [];
  const re = /\bact\(\s*\w+\s*,\s*"([a-z]+)"/g;
  let m;
  while ((m = re.exec(raw)) !== null) { used.push(m[1]); }
  ok(used.length >= 12, "and a button for each", used.length);
  // one more is reached by name, for the button that shows two pictures
  const byName = /ICON_ART\.([a-z]+)/g;
  while ((m = byName.exec(raw)) !== null) {
    if (used.indexOf(m[1]) < 0) { used.push(m[1]); }
  }
  ok(used.filter(n => !V.ICON_ART[n]).length === 0, "each names one that is defined",
     used.filter(n => !V.ICON_ART[n]).join(", "));
  ok(names.filter(n => used.indexOf(n) < 0).length === 0, "and nothing defined goes unused",
     names.filter(n => used.indexOf(n) < 0).join(", "));

  ok(/b = g\.add\("button", undefined, label\)/.test(raw),
     "a button with no icon defined still falls back to its text");
}

// ====================================== editing points in the preview
// Until now the preview could only be picked in. These check the other half:
// that what is dragged on screen lands in the right place in the project, and
// that it goes to whatever actually holds the point - the path's own value,
// the control layer the rig gave it, or the Pivot that gathered it up.

function geomMapOf() {
  const out = {};
  V.state.items.forEach((it, i) => { if (V.state.geom[i]) { out[it.key] = V.state.geom[i]; } });
  return out;
}

function snapshot(sh) {
  return {
    v: sh.vertices.map(p => p.slice()),
    i: sh.inTangents.map(p => p.slice()),
    o: sh.outTangents.map(p => p.slice())
  };
}

function sameShape(a, b, eps) {
  if (a.v.length !== b.v.length) { return false; }
  for (let n = 0; n < a.v.length; n++) {
    for (const f of ["v", "i", "o"]) {
      if (Math.abs(a[f][n][0] - b[f][n][0]) > eps) { return false; }
      if (Math.abs(a[f][n][1] - b[f][n][1]) > eps) { return false; }
    }
  }
  return true;
}

function curvy(r) {
  const sh = new M.Shape();
  const k = r * 0.5523;
  sh.vertices = [[0, -r], [r, 0], [0, r], [-r, 0]];
  sh.inTangents = [[-k, 0], [0, -k], [k, 0], [0, k]];
  sh.outTangents = [[k, 0], [0, k], [-k, 0], [0, -k]];
  sh.closed = true;
  return sh;
}

section("editing: a point moved in the preview lands in the path");
{
  const c = newComp();
  // A turned, unevenly scaled, offset group: the delta is stated in
  // composition pixels and has to arrive in the path's own units.
  const L = addShapeLayer(c, "Art", "Group 1", star(4, 100), [20, -30], 25, [150, 80]);
  L.selected = true;
  V.P.snap = false;
  V.UI.refresh();

  const item = V.state.items[0];
  const was = V.state.geom[0].verts.map(p => p.slice());
  const rawWas = snapshot(V.rawShape(c, item.prop));

  V.actMovePoints([{ item, idx: [1] }], geomMapOf(), [12, -7]);
  V.UI.refresh();

  const now = V.state.geom[0].verts;
  ok(Math.abs(now[1][0] - was[1][0] - 12) < 1e-6 &&
     Math.abs(now[1][1] - was[1][1] + 7) < 1e-6,
     "the point lands exactly where it was dragged, through a turned group",
     [now[1][0] - was[1][0], now[1][1] - was[1][1]].join(","));
  let others = true;
  for (let n = 0; n < was.length; n++) {
    if (n === 1) { continue; }
    if (Math.abs(now[n][0] - was[n][0]) > 1e-9 ||
        Math.abs(now[n][1] - was[n][1]) > 1e-9) { others = false; }
  }
  ok(others, "and nothing else on the path moved");

  const rawNow = snapshot(V.rawShape(c, item.prop));
  let tangentsHeld = true;
  for (let n = 0; n < rawWas.i.length; n++) {
    if (Math.abs(rawWas.i[n][0] - rawNow.i[n][0]) > 1e-9 ||
        Math.abs(rawWas.o[n][1] - rawNow.o[n][1]) > 1e-9) { tangentsHeld = false; }
  }
  ok(tangentsHeld, "the curve is left alone: a tangent is kept from its vertex");

  // several at once, from one delta
  const before = V.state.geom[0].verts.map(p => p.slice());
  V.actMovePoints([{ item, idx: [0, 2, 3] }], geomMapOf(), [-5, 9]);
  V.UI.refresh();
  const after = V.state.geom[0].verts;
  ok([0, 2, 3].every(n => Math.abs(after[n][0] - before[n][0] + 5) < 1e-6 &&
                          Math.abs(after[n][1] - before[n][1] - 9) < 1e-6),
     "three points move together by the one delta");
  ok(Math.abs(after[1][0] - before[1][0]) < 1e-9,
     "and the one that was not picked stays");
}

section("editing: a rigged point moves its control, not the path");
{
  const c = newComp();
  const L = addShapeLayer(c, "Art", "Group 1", star(4, 100), [0, 0]);
  L.selected = true;
  V.P.snap = false;
  V.UI.refresh();
  V.actCreate([{ item: V.state.items[0], idx: [0] }], false, []);
  V.UI.refresh();

  const item = V.state.items[0];
  const man = V.readManifest(item.prop);
  ok(!!man && man.pts.length === 1, "one point is rigged");
  const ctrl = V.linkedLayer(item.layer, man.pts[0].fx);
  ok(!!ctrl, "and its control is there");

  const rawWas = snapshot(V.rawShape(c, item.prop));
  const posWas = ctrl.transform.position.value.slice();

  V.actMovePoints([{ item, idx: [0] }], geomMapOf(), [14, -22]);

  ok(Math.abs(ctrl.transform.position.value[0] - posWas[0] - 14) < 1e-6 &&
     Math.abs(ctrl.transform.position.value[1] - posWas[1] + 22) < 1e-6,
     "the control layer moves by the drag",
     [ctrl.transform.position.value[0] - posWas[0],
      ctrl.transform.position.value[1] - posWas[1]].join(","));
  ok(sameShape(rawWas, snapshot(V.rawShape(c, item.prop)), 1e-9),
     "and the path's own value is not touched - the rig would overwrite it");
  const man2 = V.readManifest(item.prop);
  ok(man2.pts.length === 1 && man2.pts[0].fx === man.pts[0].fx,
     "the manifest is unchanged");
}

section("editing: a point held by a Pivot moves its place in the Pivot");
{
  const c = newComp();
  const L = addShapeLayer(c, "Art", "Group 1", star(5, 100), [0, 0]);
  L.selected = true;
  V.P.snap = false;
  V.UI.refresh();
  V.actPivot([{ item: V.state.items[0], idx: [0, 1, 2] }], []);
  V.UI.refresh();

  const item = V.state.items[0];
  const man = V.readManifest(item.prop);
  ok(man.pts.length === 3 && man.pts.every(e => !!e.pp),
     "three points are held in the Pivot's own frame");
  const piv = V.linkedLayer(item.layer, man.pts[0].fx);
  const pivWas = piv.transform.position.value.slice();
  const ppWas = man.pts.map(e => e.pp.slice());
  const rawWas = snapshot(V.rawShape(c, item.prop));

  let ppSaid = "";
  const ppPrevSay = V.UI.say;
  V.UI.say = m => { ppSaid = String(m); };
  V.actMovePoints([{ item, idx: [man.pts[1].i] }], geomMapOf(), [8, 5]);
  V.UI.say = ppPrevSay;
  ok(/1 point moved/.test(ppSaid),
     "and the move reports itself rather than falling over", ppSaid);

  const man2 = V.readManifest(item.prop);
  ok(Math.abs(man2.pts[1].pp[0] - ppWas[1][0] - 8) < 1e-5 &&
     Math.abs(man2.pts[1].pp[1] - ppWas[1][1] - 5) < 1e-5,
     "its place in the Pivot moves by the drag",
     [man2.pts[1].pp[0] - ppWas[1][0], man2.pts[1].pp[1] - ppWas[1][1]].join(","));
  ok(Math.abs(man2.pts[0].pp[0] - ppWas[0][0]) < 1e-9 &&
     Math.abs(man2.pts[2].pp[0] - ppWas[2][0]) < 1e-9,
     "the others riding on it stay where they are");
  ok(Math.abs(piv.transform.position.value[0] - pivWas[0]) < 1e-9 &&
     Math.abs(piv.transform.position.value[1] - pivWas[1]) < 1e-9,
     "and the Pivot itself does not move");
  ok(sameShape(rawWas, snapshot(V.rawShape(c, item.prop)), 1e-9),
     "the path's own value is left alone");
  try {
    new vm.Script(item.prop.expression);
    ok(true, "the rewritten expression still parses as JavaScript");
  } catch (e) { ok(false, "the rewritten expression still parses as JavaScript", e.message); }
}

section("editing: alignment lines points up and leaves their curves alone");
{
  const c = newComp();
  const L = addShapeLayer(c, "Art", "Group 1", curvy(100), [0, 0]);
  L.selected = true;
  V.UI.refresh();
  const item = V.state.items[0];
  const rawWas = snapshot(V.rawShape(c, item.prop));
  const bWas = V.boundsOfPicks([{ item, idx: [0, 1, 2] }], geomMapOf());

  V.actAlign([{ item, idx: [0, 1, 2] }], geomMapOf(), "l");
  V.UI.refresh();

  const v = V.state.geom[0].verts;
  ok(Math.abs(v[0][0] - v[1][0]) < 1e-6 && Math.abs(v[1][0] - v[2][0]) < 1e-6,
     "the three picked points share one x", [v[0][0], v[1][0], v[2][0]].join(","));
  ok(Math.abs(v[0][0] - bWas.minx) < 1e-6,
     "and it is the left edge of the three, not of the whole path",
     v[0][0] + " vs " + bWas.minx);

  const rawNow = snapshot(V.rawShape(c, item.prop));
  let held = true;
  for (let n = 0; n < rawWas.i.length; n++) {
    for (const f of ["i", "o"]) {
      if (Math.abs(rawWas[f][n][0] - rawNow[f][n][0]) > 1e-9 ||
          Math.abs(rawWas[f][n][1] - rawNow[f][n][1]) > 1e-9) { held = false; }
    }
  }
  ok(held, "every tangent comes out bit for bit the same");
  ok(Math.abs(rawWas.v[3][0] - rawNow.v[3][0]) < 1e-9,
     "the point that was not picked is where it was");

  const r = V.actAlign([{ item, idx: [0] }], geomMapOf(), "t");
  ok(r === false, "one point on its own has nothing to line up with");
}

section("editing: the transform box turns points and their curves together");
{
  const c = newComp();
  const L = addShapeLayer(c, "Art", "Group 1", curvy(100), [0, 0]);
  L.selected = true;
  V.UI.refresh();
  const item = V.state.items[0];
  const map = geomMapOf();
  const was = map[item.key].verts.map(p => p.slice());
  const tipWas = V.tipVec(map[item.key], 0, "out").slice();
  const b = V.boundsOfPicks([{ item, idx: [0, 1, 2, 3] }], map);
  const centre = [(b.minx + b.maxx) / 2, (b.miny + b.maxy) / 2];

  // a quarter turn, in the file's own matrix convention
  V.actTransform([{ item, idx: [0, 1, 2, 3] }], map, [0, 1, -1, 0, 0, 0], centre);
  V.UI.refresh();

  const now = V.state.geom[0].verts;
  let turned = true;
  for (let n = 0; n < was.length; n++) {
    const dx = was[n][0] - centre[0], dy = was[n][1] - centre[1];
    const wx = centre[0] - dy, wy = centre[1] + dx;
    if (Math.abs(now[n][0] - wx) > 1e-6 || Math.abs(now[n][1] - wy) > 1e-6) { turned = false; }
  }
  ok(turned, "every point lands on the quarter turn");
  const tipNow = V.tipVec(V.state.geom[0], 0, "out");
  ok(Math.abs(tipNow[0] + tipWas[1]) < 1e-6 && Math.abs(tipNow[1] - tipWas[0]) < 1e-6,
     "and the handle turns with it, so the curve keeps its shape",
     tipNow.join(",") + " from " + tipWas.join(","));

  // scaling about a corner
  const map2 = geomMapOf();
  const before = map2[item.key].verts.map(p => p.slice());
  const b2 = V.boundsOfPicks([{ item, idx: [0, 1, 2, 3] }], map2);
  V.actTransform([{ item, idx: [0, 1, 2, 3] }], map2, [2, 0, 0, 2, 0, 0],
                 [b2.minx, b2.miny]);
  V.UI.refresh();
  const after = V.state.geom[0].verts;
  ok(after.every((p, n) =>
       Math.abs(p[0] - (b2.minx + (before[n][0] - b2.minx) * 2)) < 1e-6 &&
       Math.abs(p[1] - (b2.miny + (before[n][1] - b2.miny) * 2)) < 1e-6),
     "doubling about the top left corner leaves that corner where it was");
}

section("editing: a handle dragged reshapes the curve");
{
  const c = newComp();
  const L = addShapeLayer(c, "Art", "Group 1", curvy(100), [0, 0], 0, [200, 200]);
  L.selected = true;
  V.UI.refresh();
  const item = V.state.items[0];
  const gm = V.state.geom[0];
  ok(gm.tips.length === 8, "a curved path offers a tip for every side",
     gm.tips.length);
  ok(gm.tips.every(t => t.ctl === "free"),
     "and on an unrigged path they are the path's own");

  const map = geomMapOf();
  const vertWas = gm.verts[0].slice();
  V.actCurve(item, map, 0, { out: [40, 10] });
  V.UI.refresh();

  const now = V.state.geom[0];
  const got = V.tipVec(now, 0, "out");
  ok(Math.abs(got[0] - 40) < 1e-6 && Math.abs(got[1] - 10) < 1e-6,
     "the tip lands where it was dragged, in composition pixels, through a scaled group",
     got.join(","));
  ok(Math.abs(now.verts[0][0] - vertWas[0]) < 1e-9 &&
     Math.abs(now.verts[0][1] - vertWas[1]) < 1e-9,
     "and the point it belongs to does not move");
  const inNow = V.tipVec(now, 0, "in");
  // a tip is reported in composition pixels, and this group runs at 200%
  ok(Math.abs(inNow[0] + 110.46) < 0.02, "the other side is untouched", inNow.join(","));
}

section("editing: a tangent bound to a control is written through the bind frame");
{
  // The expression does not run here, so the check is the forward maths the
  // expression itself does - _tv in buildPathExpression - applied to what was
  // written. A turned, unevenly scaled group is what makes that map bite.
  const c = newComp();
  const L = addShapeLayer(c, "Art", "Group 1", curvy(100), [0, 0], 35, [180, 60]);
  L.selected = true;
  V.UI.refresh();
  V.actCreate([{ item: V.state.items[0], idx: [0] }], false, []);
  V.UI.refresh();

  const item = V.state.items[0];
  const man = V.readManifest(item.prop);
  ok(!!man.pts[0].tf, "the rigged point carries a bind frame");
  ok(V.tipKind(man.pts[0], "out") === "bound",
     "so its handle is bound rather than free", V.tipKind(man.pts[0], "out"));
  const tf = man.pts[0].tf;
  ok(Math.abs(tf[0] - 1) > 1e-6 || Math.abs(tf[1]) > 1e-6,
     "and the frame is not the identity, so the inverse has work to do",
     tf.join(","));

  const want = [30, -18];
  V.actCurve(item, geomMapOf(), 0, { out: want });

  const ctrl = V.linkedLayer(item.layer, man.pts[0].fx);
  const m = V.itemMatrix(item, 0), minv = V.mInv(m);
  const v = V.rawShape(c, item.prop).outTangents[0];
  // _tv: the path's tangent through the bind frame, then out of the control's
  // own space into the path's - which is what the rig will hand back.
  const Lmat = [minv[0], minv[1], minv[2], minv[3], minv[4], minv[5]];
  const ctrlM = V.layerMatrix(ctrl, 0);
  const through = V.mVec(
    [Lmat[0] * ctrlM[0] + Lmat[2] * ctrlM[1], Lmat[1] * ctrlM[0] + Lmat[3] * ctrlM[1],
     Lmat[0] * ctrlM[2] + Lmat[2] * ctrlM[3], Lmat[1] * ctrlM[2] + Lmat[3] * ctrlM[3], 0, 0],
    V.mVec([tf[0], tf[1], tf[2], tf[3], 0, 0], v));
  const back = V.mVec(m, through);
  ok(Math.abs(back[0] - want[0]) < 1e-6 && Math.abs(back[1] - want[1]) < 1e-6,
     "what the rig will hand back is exactly what was dragged to",
     back.join(",") + " for " + want.join(","));
}

section("editing: a handle on a control is measured from where the point is now");
{
  // The trap: once a point is rigged, the path's own value is no longer where
  // the point is - the rig overwrites it with the control's place. A handle
  // dragged afterwards has to be measured from the control, not from the
  // value underneath it, or it lands off by however far the point has moved.
  for (const mode of ["masks", "layers"]) {
    const c = newComp();
    const L = addShapeLayer(c, "Art", "Group 1", curvy(100), [0, 0]);
    L.selected = true;
    V.P.snap = false;
    V.P.handleMode = mode;
    V.UI.refresh();
    V.actCreate([{ item: V.state.items[0], idx: [1] }], true, []);
    V.UI.refresh();

    let item = V.state.items[0];
    // Move the point well away, so the control and the stored value part ways
    V.actMovePoints([{ item, idx: [1] }], geomMapOf(), [60, -45]);
    V.UI.refresh();
    item = V.state.items[0];

    const man = V.readManifest(item.prop);
    const e = man.pts.filter(q2 => q2.i === 1)[0];
    ok(V.tipKind(e, "out") === (mode === "masks" ? "mask" : "layer"),
       mode + ": the out handle is on a control", V.tipKind(e, "out"));

    // The expression does not run here, so the canvas still draws the point
    // at the value underneath it. The control is where the point really is,
    // and it is the control the handle has to be measured from.
    const ctrlLayer = V.linkedLayer(item.layer, e.fx);
    const pointNow = V.mPt(V.layerMatrix(ctrlLayer, 0), [0, 0]);
    const rawComp = V.mPt(V.itemMatrix(item, 0), V.rawShape(c, item.prop).vertices[1]);
    ok(Math.abs(pointNow[0] - rawComp[0] - 60) < 1e-6 &&
       Math.abs(pointNow[1] - rawComp[1] + 45) < 1e-6,
       mode + ": the control has moved away from the value underneath it",
       [rawComp[0] - pointNow[0], rawComp[1] - pointNow[1]].join(","));

    const want = [52, 17];
    V.actCurve(item, geomMapOf(), 1, { out: want });

    const ctrl = V.linkedLayer(item.layer, e.fx);
    let tipComp;
    if (mode === "layers") {
      const hl = V.linkedLayer(item.layer, e.of);
      tipComp = V.mPt(V.layerMatrix(hl, 0), [0, 0]);
    } else {
      const masks = ctrl.property("ADBE Mask Parade");
      let shape = null;
      for (let n = 1; n <= masks.numProperties; n++) {
        if (masks.property(n).name === "VXR Out") {
          shape = masks.property(n).property("ADBE Mask Shape").value;
        }
      }
      tipComp = V.mPt(V.layerMatrix(ctrl, 0), shape.vertices[1]);
    }
    ok(Math.abs(tipComp[0] - pointNow[0] - want[0]) < 1e-5 &&
       Math.abs(tipComp[1] - pointNow[1] - want[1]) < 1e-5,
       mode + ": the handle lands that far from the point, not from the value",
       [tipComp[0] - pointNow[0], tipComp[1] - pointNow[1]].join(","));
  }
  V.P.handleMode = "masks";
}

section("editing: what it refuses, and says so");
{
  const c = newComp();
  const L = addShapeLayer(c, "Art", "Group 1", star(4, 100), [0, 0]);
  L.selected = true;
  V.UI.refresh();
  const item = V.state.items[0];
  const map = geomMapOf();

  // another tool's expression owns the path
  item.prop.expression = "value";
  const rawWas = snapshot(item.prop.value);
  let r = V.applyEdits(c, V.editsFor([{ item, idx: [0] }], map,
    at => ({ pt: [at[0] + 10, at[1]] })));
  ok(r.foreign === 1 && r.moved === 0, "a foreign expression is left alone",
     JSON.stringify(r));
  ok(sameShape(rawWas, snapshot(item.prop.value), 1e-9), "and its path is not written");
  ok(/another tool/.test(V.editReport(r)), "the message says why", V.editReport(r));
  item.prop.expression = "";

  // a shape group with Skew on it: the maths cannot undo it, so it refuses
  // rather than putting the point somewhere it was not dragged
  const grp = L.property("ADBE Root Vectors Group").property("Group 1");
  grp.property("ADBE Vector Transform Group").property("ADBE Vector Skew").setValue(20);
  r = V.applyEdits(c, V.editsFor([{ item, idx: [0] }], map,
    at => ({ pt: [at[0] + 10, at[1]] })));
  ok(r.skewed === 1 && r.moved === 0, "Skew is refused", JSON.stringify(r));
  ok(/Skew/.test(V.editReport(r)), "and named", V.editReport(r));
  grp.property("ADBE Vector Transform Group").property("ADBE Vector Skew").setValue(0);
}

section("editing: a path with keyframes gets one, rather than losing them");
{
  const c = newComp();
  const L = addShapeLayer(c, "Art", "Group 1", star(4, 100), [0, 0]);
  L.selected = true;
  const prop = L.property("ADBE Root Vectors Group").property("Group 1")
                .property("ADBE Vectors Group").property(1)
                .property("ADBE Vector Shape");
  prop.setValueAtTime(0, star(4, 100));
  prop.setValueAtTime(2, star(4, 140));
  c.time = 1;
  V.UI.refresh();
  const item = V.state.items[0];
  const keysWas = prop.numKeys;
  const was = V.state.geom[0].verts[0].slice();

  V.actMovePoints([{ item, idx: [0] }], geomMapOf(), [11, 0]);

  ok(prop.numKeys === keysWas + 1, "a key appears at the current time",
     prop.numKeys + " from " + keysWas);
  const at = prop.valueAtTime(1, false);
  ok(Math.abs(at.vertices[0][0] - (was[0] - 960) - 11) < 1e-6,
     "holding the move", at.vertices[0][0]);
  c.time = 0;
}

section("editing: a rectangle becomes a path before it is moved");
{
  const c = newComp();
  const L = c.layers.addShape();
  L.name = "Boxy";
  L.transform.position.setValue([960, 540]);
  const grp = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
  grp.name = "Group 1";
  const vecs = grp.property("ADBE Vectors Group");
  const rect = vecs.addProperty("ADBE Vector Shape - Rect");
  rect.property("ADBE Vector Rect Size").setValue([200, 120]);
  L.selected = true;
  V.P.snap = false;
  V.UI.refresh();

  const prim = V.state.items.filter(it => it.prim)[0];
  ok(!!prim, "the rectangle shows its points");
  const map = geomMapOf();
  const was = map[prim.key].verts[0].slice();

  V.actMovePoints([{ item: prim, idx: [0] }], map, [15, -9]);
  V.UI.refresh();

  const fresh = V.state.items.filter(it => !it.prim)[0];
  ok(!!fresh, "it is a path afterwards");
  const gm = V.state.geom[V.state.items.indexOf(fresh)];
  ok(Math.abs(gm.verts[0][0] - was[0] - 15) < 1e-6 &&
     Math.abs(gm.verts[0][1] - was[1] + 9) < 1e-6,
     "and the point moved by the drag that asked for it",
     [gm.verts[0][0] - was[0], gm.verts[0][1] - was[1]].join(","));
}

section("editing: a path keyframe, to edit this moment and not the whole thing");
{
  const c = newComp();
  const L = addShapeLayer(c, "Art", "Group 1", star(4, 100), [0, 0]);
  L.selected = true;
  V.UI.refresh();
  const item = V.state.items[0];
  ok(item.prop.numKeys === 0, "the path starts with none");

  c.time = 1.25;
  V.actKeyPaths([item]);
  ok(item.prop.numKeys === 1, "one goes down at the current time",
     item.prop.numKeys);
  ok(Math.abs(item.prop.keyTime(1) - 1.25) < 1e-9, "at the time it was pressed",
     item.prop.keyTime(1));
  const at = item.prop.valueAtTime(1.25, false);
  ok(Math.abs(at.vertices[0][1] + 100) < 1e-6,
     "holding the shape it already had", at.vertices[0][1]);

  // with one down, a move belongs to that moment rather than to all of time
  V.P.snap = false;
  V.UI.refresh();
  V.actMovePoints([{ item: V.state.items[0], idx: [0] }], geomMapOf(), [17, 0]);
  ok(item.prop.numKeys === 2, "moving a point adds a second, not a replacement",
     item.prop.numKeys);

  // a rectangle has no path to key, and is told so rather than ignored
  const L2 = c.layers.addShape();
  L2.name = "Boxy";
  const g2 = L2.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
  g2.name = "Group 1";
  g2.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Rect")
    .property("ADBE Vector Rect Size").setValue([200, 120]);
  L.selected = false;
  L2.selected = true;
  V.UI.refresh();
  const prim = V.state.items.filter(it => it.prim)[0];
  let said = "";
  const wasSay = V.UI.say;
  V.UI.say = s => { said = s; };
  V.actKeyPaths([prim]);
  V.UI.say = wasSay;
  ok(/no path to key/.test(said), "and says to make it a path first", said);
  c.time = 0;
}

section("editing: Keyframe follows the group picked out in the timeline");
{
  const c = newComp();
  const L = addShapeLayer(c, "Two", "Group 1", star(4, 100), [0, 0]);
  const root = L.property("ADBE Root Vectors Group");
  const g2 = root.addProperty("ADBE Vector Group");
  g2.name = "Group 2";
  const v2 = g2.property("ADBE Vectors Group");
  v2.addProperty("ADBE Vector Shape - Group")
    .property("ADBE Vector Shape").setValue(star(3, 60));
  v2.addProperty("ADBE Vector Graphic - Fill");
  L.selected = true;
  V.state.sel = {};
  V.UI.refresh();

  const items = V.state.items;
  ok(items.length === 2, "the layer offers two paths", items.length);
  const one = items.filter(it => it.chain[0] === "Group 1")[0];
  const two = items.filter(it => it.chain[0] === "Group 2")[0];
  ok(!!one && !!two, "one in each group");

  // Selecting a property selects its layer too, so the layer's own selection
  // cannot say which shape was meant - only the properties can.
  ok(V.pointedPaths(items).length === 2,
     "with only the layer selected, every path on it counts",
     V.pointedPaths(items).length);

  g2.selected = true;
  const pointed = V.pointedPaths(items);
  ok(pointed.length === 1 && pointed[0] === two,
     "a chosen shape group means that shape and not its neighbour",
     pointed.length);

  c.time = 0.5;
  M.app._commands.length = 0;
  const keyBtn = M.NODES.filter(n => /A path keyframe here/.test(n.says || ""))[0];
  ok(!!keyBtn, "the Keyframe button is there");
  keyBtn.onClick.call(keyBtn);

  ok(two.prop.numKeys === 1 && one.prop.numKeys === 0,
     "only the chosen group's path is keyed",
     two.prop.numKeys + " keyed, " + one.prop.numKeys + " left alone");

  // There is no way to twirl a property open from a script, so the key is
  // shown with the U command instead - see the reveal note in memory.
  ok(M.app._commands.indexOf(2387) >= 0,
     "and the keyframed properties are revealed, the way U does",
     M.app._commands.join(","));
  ok(L.selected === true,
     "with the layer selected, since that is what the command acts on");

  g2.selected = false;
  V.P.revealKeyed = false;
  M.app._commands.length = 0;
  c.time = 0.75;
  keyBtn.onClick.call(keyBtn);
  ok(M.app._commands.indexOf(2387) < 0, "the preference turns the reveal off",
     M.app._commands.join(","));
  ok(one.prop.numKeys === 1 && two.prop.numKeys === 2,
     "and with no group chosen it keys both",
     one.prop.numKeys + " / " + two.prop.numKeys);

  // picked points still win over whatever the timeline says
  V.P.revealKeyed = true;
  g2.selected = true;
  V.UI.refresh();
  V.state.sel = {};
  V.state.sel[V.state.items.filter(it => it.chain[0] === "Group 1")[0].key] = [0];
  c.time = 0.9;
  keyBtn.onClick.call(keyBtn);
  ok(one.prop.numKeys === 2 && two.prop.numKeys === 2,
     "a picked point keys its own path, not the chosen group's",
     one.prop.numKeys + " / " + two.prop.numKeys);
  V.state.sel = {};
  g2.selected = false;
  c.time = 0;
}

section("editing: Reveal opens paths without keying them");
{
  const c = newComp();
  const L = addShapeLayer(c, "Art", "Group 1", star(4, 100), [0, 0]);
  L.selected = false;
  V.state.sel = {};
  V.UI.refresh();
  const item = scanOn(c, L)[0];

  let said = "";
  const prev = V.UI.say;
  V.UI.say = m => { said = String(m); };

  // No keyframe of its own: the only command that reaches it is the one that
  // opens everything modified, and the message has to own up to that.
  M.app._commands.length = 0;
  V.actRevealPaths([item]);
  ok(M.app._commands.indexOf(2771) >= 0,
     "a path with no keyframes is opened with the modified-properties command",
     M.app._commands.join(","));
  ok(/everything else modified/.test(said),
     "and the message says what else came with it", said);
  ok(L.selected === true,
     "the layer is selected, since that is what the command acts on");
  ok(item.prop.numKeys === 0, "and nothing was keyed on the way");

  // Once it has a keyframe, the tidy command fits
  c.time = 0.4;
  V.actKeyPaths([item]);
  M.app._commands.length = 0;
  V.actRevealPaths([item]);
  ok(M.app._commands.indexOf(2387) >= 0,
     "a keyframed path is opened on its own", M.app._commands.join(","));
  ok(M.app._commands.indexOf(2771) < 0, "without dragging the rest of the layer in");
  ok(/Opened 1 path in the timeline\./.test(said), "and says just that", said);

  // Mixed: one keyed, one not, so the wider command is the only one that
  // reaches both
  const g2 = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
  g2.name = "Group 2";
  const v2 = g2.property("ADBE Vectors Group");
  v2.addProperty("ADBE Vector Shape - Group")
    .property("ADBE Vector Shape").setValue(star(3, 60));
  const both = scanOn(c, L);
  ok(both.length === 2, "two paths now", both.length);
  M.app._commands.length = 0;
  V.actRevealPaths(both);
  ok(M.app._commands.indexOf(2771) >= 0,
     "one of them unkeyed is enough to need the wider command",
     M.app._commands.join(","));

  // a rectangle has no path to open
  M.app._commands.length = 0;
  const L2 = c.layers.addShape();
  L2.name = "Boxy";
  const g3 = L2.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
  g3.name = "Group 1";
  g3.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Rect")
    .property("ADBE Vector Rect Size").setValue([200, 120]);
  L.selected = false;
  L2.selected = true;
  V.UI.refresh();
  const prim = V.state.items.filter(it => it.prim)[0];
  V.actRevealPaths([prim]);
  ok(M.app._commands.length === 0, "a rectangle asks for nothing to be run",
     M.app._commands.join(","));
  ok(/no path to open/.test(said), "and is told why", said);

  V.UI.say = prev;
  c.time = 0;
}

section("editing: a handle is picked for, and moves with what it is picked with");
{
  const c = newComp();
  const L = addShapeLayer(c, "Art", "Group 1", curvy(100), [0, 0]);
  L.selected = true;
  V.P.snap = false;
  V.P.handleView = "all";
  V.UI.refresh();
  V.state.view = { s: 1, tx: 0, ty: 0 };
  V.state.viewManual = true;

  const cv = M.NODES.filter(n => n._on && n._on.mousewheel)[0];
  const item = V.state.items[0];
  const key = item.key;
  const tipOf = (i, side) =>
    V.state.geom[0].tips.filter(t2 => t2.i === i && t2.side === side)[0];

  // --- clicking one ------------------------------------------------------
  let tip = tipOf(0, "out");
  ok(!!tip, "point 0 has an out handle");
  cv.fire("mousedown", { clientX: tip.b[0], clientY: tip.b[1], detail: 1 });
  cv.fire("mouseup", { clientX: tip.b[0], clientY: tip.b[1], detail: 1 });
  ok(V.tipPicked(key, 0, "out") === true, "clicking a handle picks it",
     JSON.stringify(V.state.selH));
  ok(V.countSel() === 0, "and picks no point with it", V.countSel());

  // --- shift-click adds a second ----------------------------------------
  tip = tipOf(2, "in");
  cv.fire("mousedown", { clientX: tip.b[0], clientY: tip.b[1], detail: 1, shiftKey: true });
  cv.fire("mouseup", { clientX: tip.b[0], clientY: tip.b[1], detail: 1, shiftKey: true });
  ok(V.countSelH() === 2 && V.tipPicked(key, 2, "in"),
     "shift-click adds another", V.countSelH());

  // --- a marquee takes in whatever was on screen inside it ---------------
  // With every handle on show, a box round the lot takes the handles too.
  cv.fire("mousedown", { clientX: 2, clientY: 2, detail: 1 });
  cv.fire("mousemove", { clientX: 1900, clientY: 1000 });
  cv.fire("mouseup", { clientX: 1900, clientY: 1000 });
  ok(V.countSel() === 4, "a marquee round everything takes the four points",
     V.countSel());
  ok(V.countSelH() === 8, "and the eight handles that were on show with them",
     V.countSelH());

  // A handle the Handles setting is hiding was not there to be swept up.
  V.P.handleView = "none";
  V.state.sel = {};
  V.state.selH = {};
  cv.fire("mousedown", { clientX: 2, clientY: 2, detail: 1 });
  cv.fire("mousemove", { clientX: 1900, clientY: 1000 });
  cv.fire("mouseup", { clientX: 1900, clientY: 1000 });
  ok(V.countSel() === 4, "with handles hidden the points still come", V.countSel());
  ok(V.countSelH() === 0, "and nothing invisible is picked behind your back",
     V.countSelH());

  // In "picked" mode the handles on show are the picked points', which is
  // nothing at all at the moment the box is drawn over a cleared selection.
  V.P.handleView = "selected";
  V.state.sel = {};
  V.state.selH = {};
  cv.fire("mousedown", { clientX: 2, clientY: 2, detail: 1 });
  cv.fire("mousemove", { clientX: 1900, clientY: 1000 });
  cv.fire("mouseup", { clientX: 1900, clientY: 1000 });
  ok(V.countSel() === 4 && V.countSelH() === 0,
     "and in picked mode a fresh box takes points only",
     V.countSel() + " / " + V.countSelH());
  V.P.handleView = "all";

  // --- the transform box is the points' bounds, never the handles' -------
  V.state.sel = {};
  V.state.selH = {};
  V.state.sel[key] = [0, 1];
  const bPts = V.boundsOfPicks([{ item, idx: [0, 1] }], geomMapOf());
  V.state.selH[key] = ["0:out", "2:in"];
  const bWith = V.boundsOfPicks(V.currentPicks(), geomMapOf());
  ok(bWith.minx === bPts.minx && bWith.maxx === bPts.maxx &&
     bWith.miny === bPts.miny && bWith.maxy === bPts.maxy,
     "picking handles does not stretch the bounds the box is drawn round",
     [bWith.minx, bWith.maxx, bWith.miny, bWith.maxy].join(","));

  // --- two points and a handle: the box transforms the points, and the
  //     handles ride along attached, exactly as with no handle picked -----
  const picks2 = [{ item, idx: [0, 1] }];
  const map2 = geomMapOf();
  const was2 = map2[key].verts.map(p => p.slice());
  const tipWas = V.tipVec(map2[key], 0, "out").slice();
  V.actTransform(picks2, map2, [0, 1, -1, 0, 0, 0], [bPts.minx, bPts.miny]);
  V.UI.refresh();
  const now2 = V.state.geom[0].verts;
  ok(Math.abs(now2[0][0] - (bPts.minx - (was2[0][1] - bPts.miny))) < 1e-6,
     "the picked points turn", now2[0].join(","));
  const tipNow = V.tipVec(V.state.geom[0], 0, "out");
  ok(Math.abs(tipNow[0] + tipWas[1]) < 1e-6 && Math.abs(tipNow[1] - tipWas[0]) < 1e-6,
     "and their handles stay attached, turning with them",
     tipNow.join(",") + " from " + tipWas.join(","));
}

section("the preview: a press inside the transform box moves what is in it");
{
  const c = newComp();
  const L = addShapeLayer(c, "Art", "Group 1", star(4, 120), [0, 0]);
  L.selected = true;
  V.P.snap = false;
  V.P.showBox = true;
  V.P.handleView = "selected";
  V.UI.refresh();
  V.state.view = { s: 1, tx: 0, ty: 0 };
  V.state.viewManual = true;
  const cv = M.NODES.filter(n => n._on && n._on.mousewheel)[0];
  const item = V.state.items[0];

  V.state.sel = {};
  V.state.selH = {};
  V.state.sel[item.key] = [0, 1, 2, 3];
  const b = V.boundsOfPicks(V.currentPicks(), geomMapOf());
  const mid = [(b.minx + b.maxx) / 2, (b.miny + b.maxy) / 2];
  const was = V.state.geom[0].verts.map(p => p.slice());

  // the middle of the box is not on any vertex of a four-point star
  const onPoint = was.some(p => Math.abs(p[0] - mid[0]) < 10 &&
                                Math.abs(p[1] - mid[1]) < 10);
  ok(!onPoint, "the centre of the box is clear of every point");

  cv.fire("mousedown", { clientX: mid[0], clientY: mid[1], detail: 1 });
  ok(!!V.state.edit && V.state.edit.kind === "move",
     "pressing inside the box arms a move, not a new marquee",
     V.state.edit ? V.state.edit.kind : "nothing");
  cv.fire("mousemove", { clientX: mid[0] + 25, clientY: mid[1] - 10 });
  cv.fire("mouseup", { clientX: mid[0] + 25, clientY: mid[1] - 10 });
  V.UI.refresh();
  const now = V.state.geom[0].verts;
  ok(now.every((p, n) => Math.abs(p[0] - was[n][0] - 25) < 1e-6 &&
                         Math.abs(p[1] - was[n][1] + 10) < 1e-6),
     "and the whole selection travels with it",
     [now[0][0] - was[0][0], now[0][1] - was[0][1]].join(","));
  ok(V.countSel() === 4, "the selection is still what it was", V.countSel());

  // shift keeps a way to add to a selection from inside its own box
  V.state.sel = {};
  V.state.selH = {};
  V.state.sel[item.key] = [0, 1];
  const b2 = V.boundsOfPicks(V.currentPicks(), geomMapOf());
  const mid2 = [(b2.minx + b2.maxx) / 2, (b2.miny + b2.maxy) / 2];
  cv.fire("mousedown", { clientX: mid2[0], clientY: mid2[1], detail: 1, shiftKey: true });
  ok(V.state.edit === null, "shift inside the box starts no move",
     V.state.edit ? V.state.edit.kind : "nothing");
  // down and to the left, over the two points that are not picked yet
  cv.fire("mousemove", { clientX: mid2[0] - 180, clientY: mid2[1] + 220, shiftKey: true });
  cv.fire("mouseup", { clientX: mid2[0] - 180, clientY: mid2[1] + 220, shiftKey: true });
  ok(V.countSel() === 4, "it draws a marquee that adds to the selection",
     V.countSel());

  // with the box turned off, the middle is empty canvas again
  V.P.showBox = false;
  V.state.sel = {};
  V.state.selH = {};
  V.state.sel[item.key] = [0, 1, 2, 3];
  cv.fire("mousedown", { clientX: mid[0], clientY: mid[1], detail: 1 });
  ok(V.state.edit === null,
     "no box means no inside to press, so a marquee starts as before");
  cv.fire("mouseup", { clientX: mid[0], clientY: mid[1] });
  V.P.showBox = true;
  V.state.sel = {};
  V.state.selH = {};
}

// ================================================================= relink
// Standing in for the pen tool: write the path's own value with the rig's
// expression stood down, which is exactly where an After Effects edit lands.
function putRaw(c, prop, parts) {
  const sh = new M.Shape();
  sh.closed = parts.closed !== false;
  sh.vertices = parts.v;
  sh.inTangents = parts.i;
  sh.outTangents = parts.o;
  const live = prop.expressionEnabled;
  if (live) { prop.expressionEnabled = false; }
  if (prop.numKeys > 0) { prop.setValueAtTime(c.time, sh); } else { prop.setValue(sh); }
  if (live) { prop.expressionEnabled = true; }
}

function rawOf(c, prop) {
  const sh = V.rawShape(c, prop);
  return { v: sh.vertices.map(p => p.slice()),
           i: sh.inTangents.map(p => p.slice()),
           o: sh.outTangents.map(p => p.slice()),
           closed: sh.closed };
}

function rigged(points) {
  const c = newComp();
  const L = addShapeLayer(c, "Art", "Group 1", star(5, 100), [0, 0]);
  L.selected = true;
  V.UI.refresh();
  V.actCreate(pickAll(V.state.items[0], points), false);
  V.UI.refresh();
  const item = V.state.items[0];
  return { c, L, item, man: V.readManifest(item.prop) };
}

function sayOf(fn) {
  let said = "";
  const prev = V.UI.say;
  V.UI.say = m => { said = String(m); };
  try { fn(); } finally { V.UI.say = prev; }
  return said;
}

section("relink: a vertex added in After Effects does not strand the rig");
{
  const { c, item, man } = rigged([1, 3]);
  ok(man.pts.length === 2 && man.pts.every(e => e.p && e.p.length === 2),
     "a new rig writes down where each of its points sat in the path",
     JSON.stringify(man.pts.map(e => e.p)));
  const placeWas = man.pts.map(e => e.p.slice());
  const ctrls = man.pts.map(e => V.linkedLayer(item.layer, e.fx));
  const ctrlWas = ctrls.map(l => l.transform.position.value.slice());

  // one more vertex, in front of both of them
  const was = rawOf(c, item.prop);
  putRaw(c, item.prop, { v: [[0, -150]].concat(was.v),
                         i: [[0, 0]].concat(was.i),
                         o: [[0, 0]].concat(was.o),
                         closed: was.closed });
  const brokenAt = V.readManifest(item.prop).pts.map(e => e.i).join(",");
  ok(brokenAt === "1,3", "until it is relinked the rig still names the old indices",
     brokenAt);

  const said = sayOf(() => V.actRelink([item]));

  const now = V.readManifest(item.prop);
  ok(now.pts.map(e => e.i).join(",") === "2,4",
     "both entries move on by the one vertex put in front of them",
     now.pts.map(e => e.i).join(","));
  const after = rawOf(c, item.prop);
  // The manifest rounds what it stores to a millionth, so a place read back
  // out of it is near the vertex it came from rather than identical to it.
  ok(now.pts.every((e, n) =>
       Math.abs(after.v[e.i][0] - placeWas[n][0]) < 1e-5 &&
       Math.abs(after.v[e.i][1] - placeWas[n][1]) < 1e-5),
     "each one now indexes the vertex it was given in the first place",
     JSON.stringify(now.pts.map((e, n) => [after.v[e.i], placeWas[n]])));
  ok(ctrls.every((l, n) =>
       Math.abs(l.transform.position.value[0] - ctrlWas[n][0]) < 1e-9 &&
       Math.abs(l.transform.position.value[1] - ctrlWas[n][1]) < 1e-9),
     "and nothing on the composition had to move for it");
  ok(/2 points put back/.test(said), "it says what it put right", said);

  // and the other way: a vertex taken away
  const back = rawOf(c, item.prop);
  putRaw(c, item.prop, { v: back.v.slice(1), i: back.i.slice(1),
                         o: back.o.slice(1), closed: back.closed });
  V.actRelink([item]);
  ok(V.readManifest(item.prop).pts.map(e => e.i).join(",") === "1,3",
     "taking it away again walks them back",
     V.readManifest(item.prop).pts.map(e => e.i).join(","));
}

section("relink: a control left behind by an edited curve is brought to it");
{
  const { c, item, man } = rigged([1, 3]);
  const stay = V.linkedLayer(item.layer, man.pts[0].fx);
  const stayWas = stay.transform.position.value.slice();
  const ctrl = V.linkedLayer(item.layer, man.pts[1].fx);

  // the user drags vertex 3 in the AE viewer: the value takes it, and the
  // rig puts the point straight back, so the edit looks ignored
  const was = rawOf(c, item.prop);
  const moved = [was.v[3][0] + 12, was.v[3][1] - 9];
  putRaw(c, item.prop, { v: was.v.map((p, n) => (n === 3 ? moved : p)),
                         i: was.i, o: was.o, closed: was.closed });

  const said = sayOf(() => V.actRelink([item]));

  const now = V.readManifest(item.prop);
  ok(now.pts[1].i === 3, "its index was right and stays right", now.pts[1].i);
  const want = V.mPt(V.itemMatrix(item, c.time), moved);
  const at = ctrl.transform.position.value;
  ok(Math.abs(at[0] - want[0]) < 1e-6 && Math.abs(at[1] - want[1]) < 1e-6,
     "the control has come to meet its point",
     at.join(",") + " wanted " + want.join(","));
  ok(Math.abs(now.pts[1].p[0] - moved[0]) < 1e-5 &&
     Math.abs(now.pts[1].p[1] - moved[1]) < 1e-5,
     "and the place written down is the new one",
     now.pts[1].p.join(",") + " wanted " + moved.join(","));
  ok(Math.abs(stay.transform.position.value[0] - stayWas[0]) < 1e-9 &&
     Math.abs(stay.transform.position.value[1] - stayWas[1]) < 1e-9,
     "the control whose point did not move is left alone");
  ok(/1 control brought to its point/.test(said), "it says so", said);
}

section("relink: a rig that is already right is left alone");
{
  const { c, item, man } = rigged([0, 2, 4]);
  const before = JSON.stringify(V.readManifest(item.prop));
  const shapeWas = snapshot(V.rawShape(c, item.prop));
  const said = sayOf(() => V.actRelink([item]));
  ok(JSON.stringify(V.readManifest(item.prop)) === before,
     "the manifest comes out of it unchanged");
  ok(sameShape(shapeWas, snapshot(V.rawShape(c, item.prop)), 1e-12),
     "and so does the path");
  ok(/already in place/.test(said), "and it says there was nothing to do", said);
  ok(man.pts.length === 3, "three points were rigged", man.pts.length);
}

section("relink: a rig made before places were written down");
{
  const { c, item } = rigged([1, 3]);
  // strip "p" from the manifest, which is every rig built by an older build
  const old = V.readManifest(item.prop);
  old.pts.forEach(e => { delete e.p; });
  item.prop.expression = V.buildPathExpression(old, item.chain);
  ok(V.readManifest(item.prop).pts.every(e => !e.p), "no place is written down");

  // its controls are still where they were put, so they can be matched on,
  // and relinking writes the places down for next time
  const said = sayOf(() => V.actRelink([item]));
  const now = V.readManifest(item.prop);
  ok(now.pts.every(e => !!e.p), "relink notes where each point sits", said);
  ok(now.pts.map(e => e.i).join(",") === "1,3", "without moving any of them",
     now.pts.map(e => e.i).join(","));
  ok(/Noted where 2 points/.test(said), "and says that is what it did", said);

  // but a control that has since been moved cannot be told from a point
  // that has, so an older rig in that state is left alone and said so
  const { c: c2, item: i2 } = rigged([1, 3]);
  const bare = V.readManifest(i2.prop);
  bare.pts.forEach(e => { delete e.p; });
  i2.prop.expression = V.buildPathExpression(bare, i2.chain);
  const drift = V.linkedLayer(i2.layer, bare.pts[1].fx);
  drift.transform.position.setValue([drift.transform.position.value[0] + 40,
                                     drift.transform.position.value[1] + 40]);
  const said2 = sayOf(() => V.actRelink([i2]));
  // Said as information, not as a failure: there was nothing to put right,
  // only nothing to put it right WITH.
  ok(/1 point was rigged before places were written down/.test(said2) &&
     !/left alone/.test(said2),
     "it says which one it would only have been guessing at", said2);
  ok(Math.abs(drift.transform.position.value[0] -
              (V.mPt(V.itemMatrix(i2, c2.time), rawOf(c2, i2.prop).v[3])[0] + 40)) < 1e-6,
     "and leaves that control exactly where it found it");
}

section("relink: a point held by a Pivot moves index without moving the Pivot");
{
  const c = newComp();
  const L = addShapeLayer(c, "Art", "Group 1", star(5, 100), [0, 0]);
  L.selected = true;
  V.UI.refresh();
  V.actPivot([{ item: V.state.items[0], idx: [1, 2, 3] }], []);
  V.UI.refresh();
  const item = V.state.items[0];
  const man = V.readManifest(item.prop);
  ok(man.pts.length === 3 && man.pts.every(e => e.pp && e.p),
     "the Pivot holds three points, each with its place written down");
  const piv = V.linkedLayer(item.layer, man.pts[0].fx);
  const pivWas = piv.transform.position.value.slice();
  const ppWas = man.pts.map(e => e.pp.slice());

  const was = rawOf(c, item.prop);
  putRaw(c, item.prop, { v: [[0, -150]].concat(was.v),
                         i: [[0, 0]].concat(was.i),
                         o: [[0, 0]].concat(was.o),
                         closed: was.closed });
  V.actRelink([item]);

  const now = V.readManifest(item.prop);
  ok(now.pts.map(e => e.i).join(",") === "2,3,4",
     "all three move on by one", now.pts.map(e => e.i).join(","));
  ok(now.pts.every((e, n) => Math.abs(e.pp[0] - ppWas[n][0]) < 1e-9 &&
                             Math.abs(e.pp[1] - ppWas[n][1]) < 1e-9),
     "their places in the Pivot's frame are untouched");
  ok(Math.abs(piv.transform.position.value[0] - pivWas[0]) < 1e-9 &&
     Math.abs(piv.transform.position.value[1] - pivWas[1]) < 1e-9,
     "and the Pivot itself does not move");
}

section("relink: an entry whose control layer is gone is reported, not guessed");
{
  const { c, item, man } = rigged([1, 3]);
  // After Effects sets a Layer Control to None when its layer goes away
  V.findEffect(item.layer, man.pts[1].fx).property(1).setValue(0);
  const said = sayOf(() => V.actRelink([item]));
  ok(/control layer is gone/.test(said),
     "it says which point has nothing holding it", said);
  ok(V.readManifest(item.prop).pts.length === 2,
     "and takes nothing out of the manifest on its own",
     V.readManifest(item.prop).pts.length);
}

section("relink: nothing rigged, nothing to do");
{
  const c = newComp();
  const L = addShapeLayer(c, "Art", "Group 1", star(5, 100), [0, 0]);
  L.selected = true;
  V.UI.refresh();
  const said = sayOf(() => V.actRelink([V.state.items[0]]));
  ok(/none of those paths is rigged/.test(said), "it says so plainly", said);
  const empty = sayOf(() => V.actRelink([]));
  ok(/Select a shape layer/.test(empty), "and asks for something to work on", empty);
}

section("relink: a rig whose expression was only switched off");
{
  const { item } = rigged([1, 3]);
  const exprWas = item.prop.expression;
  item.prop.expressionEnabled = false;
  ok(V.readManifest(item.prop) === null,
     "with the expression off the path reads as unrigged everywhere else");

  const said = sayOf(() => V.actRelink([item], []));
  ok(item.prop.expressionEnabled === true, "Relink turns it back on", said);
  ok(item.prop.expression === exprWas, "without rewriting a line of it");
  ok(/switched off/.test(said), "and says that is what was wrong", said);
  ok(V.readManifest(item.prop).pts.map(e => e.i).join(",") === "1,3",
     "the rig it had is the rig it has back");
}

section("relink: a rig rebuilt from the controls the expression left behind");
{
  const { item, man } = rigged([0, 1, 2]);
  const ctrls = man.pts.map(e => V.linkedLayer(item.layer, e.fx));
  ok(ctrls.every((L, i) => new RegExp("Pt " + (i + 1) + "$").test(L.name)),
     "the controls carry the index they were made for",
     ctrls.map(L => L.name).join(" | "));
  const ctrlAt = ctrls.map(L => L.transform.position.value.slice());

  // the expression goes; the link effects and the control layers stay
  item.prop.expression = "";
  ok(V.readManifest(item.prop) === null, "the path is not rigged any more");
  ok(V.findEffect(item.layer, man.pts[0].fx) !== null,
     "but the links the rig left are still on the layer");

  const said = sayOf(() => V.actRelink([item], []));
  const now = V.readManifest(item.prop);
  ok(!!now && now.pts.length === 3, "Relink builds it again from those", said);
  ok(now.pts.map(e => e.i).join(",") === "0,1,2", "on the right vertices",
     now ? now.pts.map(e => e.i).join(",") : "");
  ok(now.pts.every(e => !!e.p && !!e.tf),
     "with a place and a bind frame written, the same as Create makes");
  ok(now.pts.every((e, i) => e.fx === man.pts[i].fx),
     "reusing the links rather than piling new ones on");
  ok(ctrlAt.every((p, i) => {
       const at = V.linkedLayer(item.layer, now.pts[i].fx).transform.position.value;
       return Math.abs(at[0] - p[0]) < 1e-9 && Math.abs(at[1] - p[1]) < 1e-9;
     }), "and no control had to move for it");
  ok(/rebuilt the rig on 3 points/.test(said), "it says what it did", said);
  ok(/3 by where they stand/.test(said),
     "standing on their own points is the strongest evidence there is", said);
}

section("relink: a rebuilt rig falls back to the name when a control has moved");
{
  const { item, man } = rigged([0, 1, 2]);
  // animate every control away from its point, the way a working rig is
  man.pts.forEach(e => {
    const L = V.linkedLayer(item.layer, e.fx);
    const p = L.transform.position.value;
    L.transform.position.setValueAtTime(0, [p[0] + 120, p[1] - 90]);
  });
  item.prop.expression = "";

  const said = sayOf(() => V.actRelink([item], []));
  const now = V.readManifest(item.prop);
  ok(!!now && now.pts.map(e => e.i).join(",") === "0,1,2",
     "the name puts each control back on the vertex it was made for",
     now ? now.pts.map(e => e.i).join(",") : said);
  ok(/3 placed by name/.test(said), "and it says it went by name", said);
}

section("relink: controls picked in the timeline are adopted");
{
  const { item, man } = rigged([0, 2]);
  const ctrls = man.pts.map(e => V.linkedLayer(item.layer, e.fx));
  // the expression and the links both gone: all that is left is the layers
  item.prop.expression = "";
  man.pts.forEach(e => V.findEffect(item.layer, e.fx).remove());
  ok(V.findEffect(item.layer, man.pts[0].fx) === null,
     "nothing on the layer points at them any more");
  const blind = sayOf(() => V.actRelink([item], []));
  ok(/none of those paths is rigged/.test(blind),
     "with nothing picked there is nothing to go on", blind);
  ok(/Select the point controls/.test(blind), "and it says what would help", blind);

  const said = sayOf(() => V.actRelink([item], ctrls));
  const now = V.readManifest(item.prop);
  ok(!!now && now.pts.length === 2, "the two picked controls rebuild the rig", said);
  ok(now.pts.map(e => e.i).join(",") === "0,2",
     "on the vertices they are standing on",
     now ? now.pts.map(e => e.i).join(",") : "");
  ok(now.pts.every(e => V.linkedLayer(item.layer, e.fx) !== null),
     "and fresh links were made to hold them");
}

section("relink: a rebuild says what it could not take up again");
{
  const { item, man } = rigged([1]);
  // give the point handles, then take the expression away
  V.actCreate(pickAll(item, [1]), true);
  const withH = V.readManifest(item.prop);
  const e = withH.pts[0];
  ok(!!(e.im || e["if"]) && !!(e.om || e.of), "the point has both handles");
  item.prop.expression = "";

  const said = sayOf(() => V.actRelink([item], []));
  const now = V.readManifest(item.prop);
  ok(!!now && now.pts.length === 1, "the point itself is rebuilt", said);
  ok(!now.pts[0].im && !now.pts[0]["if"] && !now.pts[0].om && !now.pts[0].of,
     "without claiming handles it cannot place");
  ok(/2 handles could not be taken up again/.test(said),
     "and it says so rather than losing them quietly", said);
  ok(!/Pivot/.test(said), "a handle control is not mistaken for a Pivot", said);
}

section("relink: another tool's expression is never built over");
{
  const { item } = rigged([0, 1]);
  item.prop.expression = "// another tool\nthisProperty.value";
  item.prop.expressionEnabled = false;
  const said = sayOf(() => V.actRelink([item], []));
  ok(/another tool/.test(said), "it refuses, switched off or not", said);
  ok(/another tool/.test(item.prop.expression),
     "and leaves the expression exactly where it found it");
}

section("relink: a Pivot's points cannot be rebuilt, and it says so");
{
  const c = newComp();
  const L = addShapeLayer(c, "Art", "Group 1", star(5, 100), [0, 0]);
  L.selected = true;
  V.UI.refresh();
  V.actPivot([{ item: V.state.items[0], idx: [0, 1, 2] }], []);
  V.UI.refresh();
  const item = V.state.items[0];
  item.prop.expression = "";
  const said = sayOf(() => V.actRelink([item], []));
  ok(/Pivot/.test(said), "it says a Pivot's points are not recoverable", said);
  ok(V.readManifest(item.prop) === null,
     "and puts nothing back that it would be guessing at", said);
}

// A link effect names a control LAYER; nothing in it says which PATH that
// control serves. A layer with two paths is where that bites.
function addGroup(L, groupName, shape, gpos) {
  const grp = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
  grp.name = groupName;
  const vecs = grp.property("ADBE Vectors Group");
  vecs.addProperty("ADBE Vector Shape - Group")
      .property("ADBE Vector Shape").setValue(shape);
  vecs.addProperty("ADBE Vector Graphic - Fill");
  const tr = grp.property("ADBE Vector Transform Group");
  tr.property("ADBE Vector Position").setValue(gpos || [0, 0]);
  tr.property("ADBE Vector Rotation").setValue(0);
  tr.property("ADBE Vector Scale").setValue([100, 100]);
  return grp;
}

function twoPathLayer() {
  const c = newComp();
  const L = addShapeLayer(c, "Art", "Line", star(5, 100), [0, 0]);
  addGroup(L, "Fill", star(5, 100), [0, 0]);
  L.selected = true;
  V.UI.refresh();
  return { c, L };
}

function rigCount() {
  return V.state.items.filter(it => V.readManifest(it.prop) !== null).length;
}

section("relink: a bare path is never built out of its neighbour's controls");
{
  const { c, L } = twoPathLayer();
  ok(V.state.items.length === 2, "the layer shows two paths", V.state.items.length);
  V.actCreate(pickAll(V.state.items[0], [0, 1, 2]), false);
  V.UI.refresh();
  ok(rigCount() === 1, "one path is rigged, the other is not", rigCount());

  // the user selects the layer, picks nothing, and presses Relink. Both paths
  // are in scope, and every VXR link sits on the layer they share.
  const said = sayOf(() => V.actRelink(V.state.items, []));
  ok(rigCount() === 1,
     "the bare path is left bare: those controls belong to its neighbour",
     rigCount() + "  said: " + said);
}

section("relink: picked controls are not sprayed over every bare path in scope");
{
  const { c, L } = twoPathLayer();
  V.actCreate(pickAll(V.state.items[0], [0, 1, 2]), false);
  V.UI.refresh();
  const rigItem = V.state.items.filter(it => V.readManifest(it.prop))[0];
  const man = V.readManifest(rigItem.prop);
  const ctrls = man.pts.map(e => V.linkedLayer(rigItem.layer, e.fx));
  rigItem.prop.expression = "";
  ok(rigCount() === 0, "neither path is rigged now", rigCount());

  // exactly the gesture asked for: layer plus its controls, selected together
  const said = sayOf(() => V.actRelink(V.state.items, ctrls));
  ok(rigCount() <= 1,
     "at most one path is built, never both from the same controls",
     rigCount() + "  said: " + said);
}

section("relink: a rig that is only switched off still owns its links");
{
  const { c, L } = twoPathLayer();
  V.actCreate(pickAll(V.state.items[0], [0, 1]), false);
  V.UI.refresh();
  V.actCreate(pickAll(V.state.items[1], [2, 3]), false);
  V.UI.refresh();
  const a = V.state.items[0], b = V.state.items[1];
  const aFx = V.readManifest(a.prop).pts.map(e => e.fx);
  const bMan = V.readManifest(b.prop);
  ok(aFx.length === 2 && bMan.pts.length === 2, "both paths are rigged");

  a.prop.expressionEnabled = false;          // the state Relink exists to repair
  V.actDelete(pickAll(b, bMan.pts.map(e => e.i)), [], false);

  ok(aFx.every(nm => V.findEffect(a.layer, nm) !== null),
     "clearing one rig does not take the switched-off one's links with it",
     aFx.map(nm => nm + "=" + (V.findEffect(a.layer, nm) ? "kept" : "GONE")).join(" "));
}

section("relink: a rigged vertex that was deleted is reported, not swapped");
{
  const { c, item, man } = rigged([2]);
  const ctrl = V.linkedLayer(item.layer, man.pts[0].fx);
  const was = ctrl.transform.position.value.slice();
  const raw = rawOf(c, item.prop);
  putRaw(c, item.prop, { v: raw.v.filter((_, n) => n !== 2),
                         i: raw.i.filter((_, n) => n !== 2),
                         o: raw.o.filter((_, n) => n !== 2),
                         closed: raw.closed });

  const said = sayOf(() => V.actRelink([item], []));
  ok(/no vertex near enough/.test(said),
     "the point it was given is gone, and it says so", said);
  ok(Math.abs(ctrl.transform.position.value[0] - was[0]) < 1e-9 &&
     Math.abs(ctrl.transform.position.value[1] - was[1]) < 1e-9,
     "rather than dragging the control onto a vertex that was never its",
     ctrl.transform.position.value.join(",") + " was " + was.join(","));
}

section("the preview: the turn arcs are drawn where a turn is taken hold of");
{
  const c = newComp();
  const L = addShapeLayer(c, "Art", "Group 1", star(4, 120), [0, 0]);
  L.selected = true;
  V.P.snap = false;
  V.P.showBox = true;
  V.UI.refresh();
  V.state.view = { s: 1, tx: 0, ty: 0 };
  V.state.viewManual = true;
  const cv = M.NODES.filter(n => n._on && n._on.mousewheel)[0];
  const item = V.state.items[0];
  V.state.sel = {};
  V.state.selH = {};
  V.state.sel[item.key] = [0, 1, 2, 3];
  const b = V.boundsOfPicks(V.currentPicks(), geomMapOf());

  // The radius comes out of the panel's own source, so the drawing and the
  // hit-testing cannot drift apart without this noticing.
  const R = Number((raw.match(/ROT_ARC = (\d+)/) || [])[1]);
  ok(R > 0, "the arc has a radius of its own", R);

  const corners = [[b.minx, b.miny, -1, -1], [b.maxx, b.miny, 1, -1],
                   [b.maxx, b.maxy, 1, 1], [b.minx, b.maxy, -1, 1]];
  let armed = 0, tried = 0, missed = "";
  for (const [cx, cy, ox, oy] of corners) {
    for (let i = 0; i <= 8; i++) {
      const a = (Math.PI / 2) * (i / 8);
      const x = cx + ox * R * Math.cos(a), y = cy + oy * R * Math.sin(a);
      tried++;
      cv.fire("mousedown", { clientX: x, clientY: y, detail: 1 });
      if (V.state.edit && V.state.edit.kind === "rotate") { armed++; }
      else if (!missed) { missed = [x, y, V.state.edit ? V.state.edit.kind : "nothing"].join(" "); }
      cv.fire("mouseup", { clientX: x, clientY: y });
    }
  }
  ok(armed === tried, "every point along every arc takes hold of a turn",
     armed + " of " + tried + (missed ? "  first miss: " + missed : ""));
  ok(V.countSel() === 4, "and pressing there picks nothing new", V.countSel());

  // A corner square still scales: the arc is clear of it.
  cv.fire("mousedown", { clientX: b.minx, clientY: b.miny, detail: 1 });
  ok(!!V.state.edit && V.state.edit.kind === "scale",
     "the knob at the corner is still a scale",
     V.state.edit ? V.state.edit.kind : "nothing");
  cv.fire("mouseup", { clientX: b.minx, clientY: b.miny });

  // And a drag that starts on the arc really turns the selection.
  const was = V.state.geom[0].verts.map(p => p.slice());
  const mid = [(b.minx + b.maxx) / 2, (b.miny + b.maxy) / 2];
  const gx = b.minx - R * Math.SQRT1_2, gy = b.miny - R * Math.SQRT1_2;
  const quarter = (p) => [mid[0] - (p[1] - mid[1]), mid[1] + (p[0] - mid[0])];
  const to = quarter([gx, gy]);
  cv.fire("mousedown", { clientX: gx, clientY: gy, detail: 1 });
  cv.fire("mousemove", { clientX: to[0], clientY: to[1] });
  cv.fire("mouseup", { clientX: to[0], clientY: to[1] });
  V.UI.refresh();
  const now = V.state.geom[0].verts;
  const off = now.map((p, n) => {
    const q = quarter(was[n]);
    return Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]));
  });
  ok(Math.max.apply(null, off) < 1e-5,
     "a drag from the arc turns the selection a quarter of the way round",
     Math.max.apply(null, off));
}

section("editing: with fewer than two points, a move carries the handles too");
{
  const c = newComp();
  const L = addShapeLayer(c, "Art", "Group 1", curvy(100), [0, 0]);
  L.selected = true;
  V.P.snap = false;
  V.P.handleView = "all";
  V.UI.refresh();
  V.state.view = { s: 1, tx: 0, ty: 0 };
  V.state.viewManual = true;
  const cv = M.NODES.filter(n => n._on && n._on.mousewheel)[0];
  const item = V.state.items[0];
  const key = item.key;

  // one point, and a handle belonging to a different point
  V.state.sel = {};
  V.state.selH = {};
  V.state.sel[key] = [1];
  V.state.selH[key] = ["0:out"];
  let gm = V.state.geom[0];
  const pt1Was = gm.verts[1].slice();
  const pt0Was = gm.verts[0].slice();
  const outWas = V.tipVec(gm, 0, "out").slice();

  const grab = V.state.geom[0].verts[1];
  cv.fire("mousedown", { clientX: grab[0], clientY: grab[1], detail: 1 });
  cv.fire("mousemove", { clientX: grab[0] + 20, clientY: grab[1] });
  cv.fire("mouseup", { clientX: grab[0] + 20, clientY: grab[1] });
  V.UI.refresh();
  gm = V.state.geom[0];

  ok(Math.abs(gm.verts[1][0] - pt1Was[0] - 20) < 1e-6,
     "the picked point moves", gm.verts[1][0] - pt1Was[0]);
  ok(Math.abs(gm.verts[0][0] - pt0Was[0]) < 1e-9,
     "the point whose handle was picked stays put", gm.verts[0][0] - pt0Was[0]);
  const outNow = V.tipVec(gm, 0, "out");
  ok(Math.abs(outNow[0] - outWas[0] - 20) < 1e-6 &&
     Math.abs(outNow[1] - outWas[1]) < 1e-6,
     "and its handle travels the same distance, bending the curve",
     outNow.join(",") + " from " + outWas.join(","));

  // a point and its OWN handle: both ends travel together, so the tangent
  // between them is unchanged and the curve keeps its shape
  V.state.sel = {};
  V.state.selH = {};
  V.state.sel[key] = [2];
  V.state.selH[key] = ["2:in"];
  gm = V.state.geom[0];
  const inWas = V.tipVec(gm, 2, "in").slice();
  const pt2Was = gm.verts[2].slice();
  const grab2 = gm.verts[2];
  cv.fire("mousedown", { clientX: grab2[0], clientY: grab2[1], detail: 1 });
  cv.fire("mousemove", { clientX: grab2[0], clientY: grab2[1] + 15 });
  cv.fire("mouseup", { clientX: grab2[0], clientY: grab2[1] + 15 });
  V.UI.refresh();
  gm = V.state.geom[0];
  ok(Math.abs(gm.verts[2][1] - pt2Was[1] - 15) < 1e-6,
     "the point moves", gm.verts[2][1] - pt2Was[1]);
  const inNow = V.tipVec(gm, 2, "in");
  ok(Math.abs(inNow[0] - inWas[0]) < 1e-6 && Math.abs(inNow[1] - inWas[1]) < 1e-6,
     "and its own handle keeps its tangent: both ends went the same way",
     inNow.join(",") + " from " + inWas.join(","));

  // the arrows carry a handle on its own, with no point picked at all
  V.state.sel = {};
  V.state.selH = {};
  V.state.selH[key] = ["3:out"];
  V.P.nudge = 1;
  gm = V.state.geom[0];
  const o3Was = V.tipVec(gm, 3, "out");
  const sink = M.NODES.filter(n => n.type === "edittext" && n._on && n._on.keydown)[0];
  sink.fire("keydown", { keyName: "Right" });
  V.UI.refresh();
  const o3Now = V.tipVec(V.state.geom[0], 3, "out");
  ok(o3Now && Math.abs(o3Now[0] - o3Was[0] - 1) < 1e-6,
     "an arrow nudges a handle with no point picked",
     o3Now ? (o3Now[0] - o3Was[0]) : "gone");

  V.state.sel = {};
  V.state.selH = {};
  V.P.handleView = "selected";
  V.UI.refresh();
}

section("undo: a failure that changed nothing must not reach past the panel");
{
  // Measured in After Effects 27: an undo group that changed nothing takes
  // no undo step. Undoing anyway lands on whatever the user did before the
  // panel ran, and takes their redo history with it.
  const c = newComp();
  addShapeLayer(c, "Art", "Group 1", star(4, 100), [0, 0]);

  M.app._commands.length = 0;
  const failed = V.run("Test nothing", function () { throw new Error("boom"); }, true);
  ok(failed === false, "a throwing action reports failure");
  ok(M.app._commands.indexOf(16) < 0,
     "and issues no undo, because its group changed nothing",
     M.app._commands.join(","));

  M.app._commands.length = 0;
  V.run("Test something", function () { V.touched(); throw new Error("boom"); }, true);
  ok(M.app._commands.indexOf(16) >= 0,
     "but one that did change something is rolled back",
     M.app._commands.join(","));

  // The actions written before this guard existed keep what they had
  M.app._commands.length = 0;
  V.run("Test unguarded", function () { throw new Error("boom"); });
  ok(M.app._commands.indexOf(16) >= 0,
     "an action that does not claim the guard is rolled back as before");

  // and the flag does not leak from one action to the next
  M.app._commands.length = 0;
  V.run("Test clean slate", function () { throw new Error("boom"); }, true);
  ok(M.app._commands.indexOf(16) < 0,
     "the mark is cleared between actions", M.app._commands.join(","));
}

section("snapping: measured on screen, one axis at a time");
{
  // 6 screen pixels at 1:1 is 6 composition pixels of reach
  let s = V.snapAxis([100], [104], 0, 1, 6);
  ok(Math.abs(s.d - 4) < 1e-9 && s.at === 104, "inside the range it takes hold", s.d);
  s = V.snapAxis([100], [120], 0, 1, 6);
  ok(s.d === 0 && s.at === null, "outside it, nothing happens", s.d);

  // the whole point: zoom in and the same screen range is a finer one in the
  // artwork, so a close look is not a sticky one
  s = V.snapAxis([100], [104], 0, 4, 6);
  ok(s.d === 0 && s.at === null, "at 4x, four composition pixels is out of reach");
  s = V.snapAxis([100], [101], 0, 4, 6);
  ok(Math.abs(s.d - 1) < 1e-9, "but one is not", s.d);

  // and out again
  s = V.snapAxis([100], [110], 0, 0.25, 6);
  ok(Math.abs(s.d - 10) < 1e-9, "zoomed out, ten reach the same six pixels", s.d);

  s = V.snapAxis([100], [97, 103.5, 140], 0, 1, 6);
  ok(Math.abs(s.d + 3) < 1e-9 && s.at === 97, "the nearest candidate wins", s.d);

  s = V.snapAxis([100, 200], [203], 0, 1, 6);
  ok(Math.abs(s.d - 3) < 1e-9 && s.at === 203,
     "any of the probes may be the one that lines up", s.d);

  s = V.snapAxis([100], [108], 5, 1, 6);
  ok(Math.abs(s.d - 8) < 1e-9, "the delta asked for is what is measured from", s.d);

  s = V.snapAxis([100], [], 7, 1, 6);
  ok(s.d === 7 && s.at === null, "with nothing to line up with it passes through");
}

section("lasso: even-odd, so a shape that doubles back still reads right");
{
  const box = [[0, 0], [10, 0], [10, 10], [0, 10]];
  ok(V.inPolygon(box, 5, 5) === true, "inside a square");
  ok(V.inPolygon(box, 15, 5) === false, "outside it");
  // a C, open to the right: the mouth is outside even though it is between
  // the arms, which a bounding box would get wrong
  const cShape = [[0, 0], [10, 0], [10, 3], [3, 3], [3, 7], [10, 7], [10, 10], [0, 10]];
  ok(V.inPolygon(cShape, 1, 5) === true, "inside the back of a C");
  ok(V.inPolygon(cShape, 8, 5) === false, "and not in its mouth");
  ok(V.inPolygon(cShape, 8, 1) === true, "but inside its top arm");
}

section("the preview: dragging a point through the canvas's own events");
{
  const c = newComp();
  const L = addShapeLayer(c, "Art", "Group 1", star(4, 100), [0, 0]);
  L.selected = true;
  V.P.snap = false;
  V.UI.refresh();
  // one canvas pixel to one composition pixel, so the arithmetic is visible
  V.state.view = { s: 1, tx: 0, ty: 0 };
  V.state.viewManual = true;

  const cv = M.NODES.filter(n => n._on && n._on.mousewheel)[0];
  const item = V.state.items[0];
  const was = V.state.geom[0].verts.map(p => p.slice());

  cv.fire("mousedown", { clientX: was[0][0], clientY: was[0][1], detail: 1 });
  ok((V.state.sel[item.key] || []).join(",") === "0",
     "pressing on a point picks it there and then, ready to be dragged",
     JSON.stringify(V.state.sel));
  ok(!!V.state.edit && V.state.edit.kind === "move", "and arms a move");

  cv.fire("mousemove", { clientX: was[0][0] + 30, clientY: was[0][1] + 12 });
  ok(!!V.state.preview, "the canvas shows the move before it is written");
  ok(V.state.geom[0].verts[0][0] === was[0][0],
     "and the project is not touched while the button is down");

  cv.fire("mouseup", { clientX: was[0][0] + 30, clientY: was[0][1] + 12 });
  ok(V.state.edit === null && V.state.preview === null, "the edit is let go");
  V.UI.refresh();
  const now = V.state.geom[0].verts;
  ok(Math.abs(now[0][0] - was[0][0] - 30) < 1e-6 &&
     Math.abs(now[0][1] - was[0][1] - 12) < 1e-6,
     "and the point is where it was dropped",
     [now[0][0] - was[0][0], now[0][1] - was[0][1]].join(","));

  // shift, read as the drag runs rather than when it began, holds one axis
  V.state.view = { s: 1, tx: 0, ty: 0 };
  const at = V.state.geom[0].verts[1].slice();
  cv.fire("mousedown", { clientX: at[0], clientY: at[1], detail: 1 });
  cv.fire("mousemove", { clientX: at[0] + 40, clientY: at[1] + 6, shiftKey: true });
  cv.fire("mouseup", { clientX: at[0] + 40, clientY: at[1] + 6, shiftKey: true });
  V.UI.refresh();
  const held = V.state.geom[0].verts[1];
  ok(Math.abs(held[0] - at[0] - 40) < 1e-6 && Math.abs(held[1] - at[1]) < 1e-6,
     "the longer way wins and the other stays put",
     [held[0] - at[0], held[1] - at[1]].join(","));

  // a drag on empty canvas is still a marquee, and still only picks
  const beforeMarquee = V.state.geom[0].verts.map(p => p.slice());
  cv.fire("mousedown", { clientX: 2, clientY: 2, detail: 1 });
  cv.fire("mousemove", { clientX: 300, clientY: 250 });
  cv.fire("mouseup", { clientX: 300, clientY: 250 });
  ok(V.state.geom[0].verts.every((p, n) =>
       Math.abs(p[0] - beforeMarquee[n][0]) < 1e-9),
     "a marquee moves nothing");
}

section("the preview: the lasso, the snap and the box are flicked on from the Edit tab");
{
  const tabs = M.NODES.filter(n => n.type === "tab");
  const edit = tabs.filter(t => t.text === "Edit")[0];
  ok(!!edit, "there is an Edit tab");
  const rows = edit._kids;
  ok(rows.length === 2, "two rows of it", rows.length);
  const icons = rows[0]._kids.filter(k => k.type === "iconbutton");
  ok(icons.length === 5, "five buttons on the first", icons.length);
  ok(icons.filter(b => typeof b.on === "boolean").length === 3,
     "three of them hold a setting rather than do a thing",
     icons.filter(b => typeof b.on === "boolean").length);
  const dd = rows[0]._kids.filter(k => k.type === "dropdownlist");
  ok(dd.length === 1 && dd[0].items.length === 3,
     "and the handle setting beside them, with three ways to go");
  ok(rows[1]._kids.filter(k => k.type === "iconbutton").length === 6,
     "six alignments on the second");

  // a toggle has to look like what it is set to, or it is only a guess
  const lassoBtn = icons.filter(b => /freehand|Lasso/.test(b.says || ""))[0];
  ok(!!lassoBtn, "the lasso toggle is there");
  const wasLasso = V.P.lasso;
  lassoBtn.onClick.call(lassoBtn);
  ok(V.P.lasso === !wasLasso, "clicking it turns the setting over");
  ok(lassoBtn.on === V.P.lasso, "and the button goes on looking pressed while it is on");
  lassoBtn.onClick.call(lassoBtn);
  ok(V.P.lasso === wasLasso, "and back");

  const rowW = rows[0]._kids.reduce((n, k) => n + k.preferredSize[0], 0) +
               6 * (rows[0]._kids.length - 1);
  ok(rowW <= 380, "the first row fits the panel", rowW + " of 380");
  const rowW2 = rows[1]._kids.reduce((n, k) => n + k.preferredSize[0], 0) +
                6 * (rows[1]._kids.length - 1);
  ok(rowW2 <= 380, "and so does the second", rowW2 + " of 380");

  // The Points tab gained Relink, and that row was already the full one.
  const ptsRow = tabs[1]._kids.filter(k => k.type === "group")[0];
  const ptsW = ptsRow._kids.reduce((n, k) => n + k.preferredSize[0], 0) +
               6 * (ptsRow._kids.length - 1);
  ok(ptsW <= 380, "the Points row still fits the panel too", ptsW + " of 380");
  const relinkBtn = M.NODES.filter(b => /^Relink - /.test(b.says || ""))[0];
  ok(!!relinkBtn && typeof relinkBtn.onClick === "function",
     "and Relink is a button on it");
}

section("the preview: the keyboard has somewhere to live");
{
  const sinks = M.NODES.filter(n => n.type === "edittext" && n._on && n._on.keydown);
  ok(sinks.length === 1,
     "one field that can hold the focus listens for keys, since a group cannot",
     sinks.length);
  // Not a sliver: a control with no room to draw itself is not reliably
  // given the focus, and a field without the focus is sent no keys.
  ok(sinks[0].preferredSize[0] >= 12 && sinks[0].preferredSize[0] <= 24,
     "small, but big enough to be given the focus", sinks[0].preferredSize[0]);
  ok(/arrow/i.test(sinks[0].helpTip || ""), "and it says what it is for",
     sinks[0].helpTip);


  const c = newComp();
  const L = addShapeLayer(c, "Art", "Group 1", star(4, 100), [0, 0]);
  L.selected = true;
  V.P.snap = false;
  V.P.nudge = 1;
  V.P.nudgeBig = 8;
  V.UI.refresh();
  const item = V.state.items[0];
  V.state.sel = {};
  V.state.sel[item.key] = [0];
  const was = V.state.geom[0].verts[0].slice();

  sinks[0].fire("keydown", { keyName: "Right" });
  V.UI.refresh();
  ok(Math.abs(V.state.geom[0].verts[0][0] - was[0] - 1) < 1e-6,
     "an arrow moves the picked point by one composition pixel",
     V.state.geom[0].verts[0][0] - was[0]);

  V.state.sel = {};
  V.state.sel[item.key] = [0];
  const was2 = V.state.geom[0].verts[0].slice();
  sinks[0].fire("keydown", { keyName: "Up", shiftKey: true });
  V.UI.refresh();
  ok(Math.abs(V.state.geom[0].verts[0][1] - was2[1] + 8) < 1e-6,
     "and with shift by the longer step", V.state.geom[0].verts[0][1] - was2[1]);

  // Which of keyName and keyCode a host fills in for an arrow is not
  // something the panel can count on, so both are read.
  V.state.sel = {};
  V.state.sel[item.key] = [0];
  const wasCode = V.state.geom[0].verts[0].slice();
  sinks[0].fire("keydown", { keyCode: 39 });
  V.UI.refresh();
  ok(Math.abs(V.state.geom[0].verts[0][0] - wasCode[0] - 1) < 1e-6,
     "an arrow that arrives as a code and no name still nudges",
     V.state.geom[0].verts[0][0] - wasCode[0]);

  V.state.sel = {};
  V.state.sel[item.key] = [0];
  const was3 = V.state.geom[0].verts[0].slice();
  sinks[0].fire("keydown", { keyName: "Enter" });
  V.UI.refresh();
  ok(Math.abs(V.state.geom[0].verts[0][0] - was3[0]) < 1e-9,
     "a key that is not an arrow is left to the host");

  // One press, one nudge: the handler is hung off the field alone. Listening
  // on the window as well would double every press that bubbles.
  const keyListeners = M.NODES.filter(n => n._on && n._on.keydown);
  ok(keyListeners.length === 1,
     "exactly one control listens for a key, so a press cannot count twice",
     keyListeners.map(n => n.type).join(","));

  // --- the undo shortcut --------------------------------------------------
  // The panel keeps no stack of its own: its edits are already groups on
  // After Effects' stack, so the key is only passed on.
  M.app._commands.length = 0;
  sinks[0].fire("keydown", { keyName: "Z", metaKey: true });
  ok(M.app._commands.indexOf(16) >= 0,
     "command-Z asks After Effects to undo", M.app._commands.join(","));
  ok(M.app._commands.length === 1, "once, not twice", M.app._commands.join(","));

  M.app._commands.length = 0;
  sinks[0].fire("keydown", { keyCode: 90, ctrlKey: true });
  ok(M.app._commands.indexOf(16) >= 0,
     "and so does control-Z arriving as a code", M.app._commands.join(","));

  // Shift-Z is left alone on purpose: After Effects publishes no Redo
  // command id, and the id beside Undo's is Purge, so nothing is guessed.
  M.app._commands.length = 0;
  sinks[0].fire("keydown", { keyName: "Z", metaKey: true, shiftKey: true });
  ok(M.app._commands.length === 0,
     "shift-Z is not consumed, so After Effects can still have it",
     M.app._commands.join(","));
  ok(!/executeCommand\(\s*17\s*\)/.test(raw) && !/CMD_REDO/.test(raw),
     "and no redo id is guessed at anywhere in the source");

  M.app._commands.length = 0;
  sinks[0].fire("keydown", { keyName: "Z" });
  ok(M.app._commands.length === 0, "a bare Z does nothing");

  // an undo must not also nudge
  V.state.sel = {};
  V.state.sel[item.key] = [0];
  const wasZ = V.state.geom[0].verts[0].slice();
  sinks[0].fire("keydown", { keyName: "Z", metaKey: true });
  V.UI.refresh();
  ok(Math.abs(V.state.geom[0].verts[0][0] - wasZ[0]) < 1e-9,
     "and undo is not mistaken for an arrow");

  // Hand the panel back the way it was found: the All/None button renames
  // itself from the selection, and the checks below read what it says.
  V.state.sel = {};
  V.UI.refresh();
}

section("icons: four tabs, and hovering says what a picture does");
{
  const tabs = M.NODES.filter(n => n.type === "tab");
  ok(tabs.length === 4, "four tabs", tabs.length);
  // Edit first: the preview is somewhere to work now, not only to pick in,
  // and tabs.selection = 0 is what opens it.
  ok(tabs.map(t => t.text).join(" / ") === "Edit / Points / Pivot / Follow",
     "named for what they hold, Edit first",
     tabs.map(t => t.text).join(" / "));
  ok(M.NODES.filter(n => n.type === "tabbedpanel").length === 1, "in one tabbed panel");

  // the first row: scope, then six icons, settings among them
  const win = M.NODES.filter(n => n.type === "window")[0];
  const head = win._kids[0];
  ok(win._kids.length === 5, "header, preview, zoom strip, status, tabs",
     win._kids.length);
  ok(head._kids[0].type === "dropdownlist", "scope first", head._kids[0].type);
  const headIcons = head._kids.filter(c => c.type === "iconbutton");
  ok(headIcons.length === head._kids.length - 1 - rulesInHead(head),
     "then icons and rules, no text buttons", headIcons.length);
  ok(head._kids.filter(c => c.type === "button").length === 0, "none of them text");
  const prefs = head._kids.filter(c => /Colours, sizes/.test(c.helpTip || ""));
  ok(prefs.length === 1, "with the settings among them", prefs.length);
  const del = head._kids.filter(c => /Remove the picked points/.test(c.helpTip || ""));
  ok(del.length === 1 && head._kids[head._kids.length - 1] === del[0],
     "and Delete last, away from the selection buttons");

  // the selection trio is fenced off by a rule on each side
  const rules = head._kids.filter(c => c.type === "panel");
  ok(rules.length === 3, "three rules divide the row", rules.length);
  const at = c => head._kids.indexOf(c);
  const picks = ["Pick every point", "Pick what is not picked"]
    .map(t => head._kids.filter(c => (c.helpTip || "").indexOf(t) >= 0)[0]);
  ok(picks.every(Boolean), "the All/None toggle and Invert are there");
  ok(at(rules[0]) < at(picks[0]) && at(picks[1]) < at(rules[1]),
     "with both rules outside them", picks.map(at).join(","));
  ok(at(picks[0]) === at(rules[0]) + 1 && at(picks[1]) === at(rules[1]) - 1,
     "and nothing else inside");
  ok(!/act\([^)]*"fit"/.test(raw),
     "Fit is gone - Refresh already reframes, and repairs older rigs");

  const headW = head._kids.reduce((n, c) => n + c.preferredSize[0], 0) +
                4 * (head._kids.length - 1);
  ok(headW <= 368, "and the row fits the panel", headW + " of 368");

  const icons = M.NODES.filter(n => n.type === "iconbutton");
  // one button per act() call in the source, however many that is
  const actCalls = (raw.match(/\bact\(\s*\w+\s*,\s*"[a-z]+"/g) || []).length;
  ok(icons.length === actCalls, "one icon button per act() call",
     icons.length + " vs " + actCalls);
  ok(icons.every(b => typeof b.onDraw === "function"),
     "each draws itself, so it stays sharp on a retina display");
  ok(icons.every(b => b.preferredSize[0] === b.preferredSize[1]),
     "all square");
  // one height per row, rather than one height for the whole panel: the top
  // row runs smaller than the tabs so all four of its sections fit on a line
  const headKids = head._kids.filter(c => c.type !== "panel");
  ok(headKids.every(c => c.preferredSize[1] === V.HEAD_PX),
     "every control on the top row stands the same height",
     headKids.map(c => c.preferredSize[1]).join(","));
  const zoomKids = M.NODES.filter(n => /zoom (in|out)/i.test(n.helpTip || ""));
  ok(zoomKids.length === 2 &&
     zoomKids.every(c => c.preferredSize[1] === V.ZOOM_PX),
     "the zoom strip's own row stands at its own height",
     zoomKids.map(c => c.preferredSize[1]).join(","));
  const tabKids = M.NODES.filter(n =>
    (n.type === "iconbutton" || n.type === "dropdownlist") &&
    headKids.indexOf(n) < 0 && zoomKids.indexOf(n) < 0 &&
    n.preferredSize && n.preferredSize[1]);
  const offTab = tabKids.filter(n => n.preferredSize[1] !== V.ICON_PX);
  ok(offTab.length === 0, "and every control in a tab stands at the other",
     offTab.map(n => (n.text || n.type) + ":" + n.preferredSize[1]).join(", "));
  ok(V.HEAD_PX < V.ICON_PX, "with the top row the smaller of the two",
     V.HEAD_PX + " vs " + V.ICON_PX);
  const noTip = icons.filter(b => !b.helpTip || b.helpTip.indexOf(" - ") < 0);
  ok(noTip.length === 0, "every one has a tooltip that names it and explains it",
     noTip.length + " without");

  // hovering must put the name in the status line, since the button has no text
  const before = V.state.status;
  const fired = icons[0].fire("mouseover");
  ok(fired === 1, "a hover is wired up", fired);
  ok(V.state.status.indexOf(" - ") > 0 && V.state.status !== before,
     "and names the action in the line above", V.state.status);
  icons[0].fire("mouseout");
  ok(V.state.status !== undefined && V.state.status.indexOf(" - ") < 0,
     "leaving it puts the panel's own message back", V.state.status);
}

// =================================== the hover shade has to come back off
// ScriptUI repaints a custom-drawn button when the pointer arrives and not
// reliably when it leaves, so the lit shade stayed on the last button touched.
section("icons: hover and press wash out again");
{
  const b = M.NODES.filter(n => n.type === "iconbutton")[0];
  const realGraphics = b.graphics;

  // what colour does the body get painted, in whatever state the button is in?
  function bodyFill() {
    const seen = [];
    b.graphics = {
      BrushType: { SOLID_COLOR: 0 }, PenType: { SOLID_COLOR: 0 },
      newBrush: (t, c) => { seen.push(c.slice(0, 3).join(",")); return {}; },
      newPen: () => ({}),
      newPath() {}, moveTo() {}, lineTo() {}, closePath() {},
      rectPath() {}, ellipsePath() {}, fillPath() {}, strokePath() {},
      drawString() {}, foregroundColor: null
    };
    V.paintIconButton(b, V.ICON_ART.create, undefined);
    b.graphics = realGraphics;
    return seen[0];           // the body is filled before the icon is drawn
  }

  b.hot = false; b.down = false;
  const resting = bodyFill();

  const paintsBefore = b._repaints || 0;
  b.fire("mouseover");
  ok(b.hot === true, "the pointer arriving marks it hot");
  ok((b._repaints || 0) > paintsBefore, "and asks for a repaint",
     (b._repaints || 0) - paintsBefore);
  const lit = bodyFill();
  ok(lit !== resting, "which paints a lighter body", resting + " -> " + lit);

  const paintsAfterOver = b._repaints || 0;
  b.fire("mouseout");
  ok(b.hot === false, "the pointer leaving clears it");
  ok((b._repaints || 0) > paintsAfterOver, "and asks for another repaint");
  ok(bodyFill() === resting, "so the shade washes back off", bodyFill());

  b.fire("mousedown");
  ok(b.down === true, "pressing marks it down");
  const pressed = bodyFill();
  ok(pressed !== resting && pressed !== lit, "which paints darker still",
     pressed);
  b.fire("mouseup");
  ok(b.down === false, "releasing clears it");
  ok(bodyFill() === resting, "and it comes back to rest");

  // a press that wanders off the button must not leave it stuck held down
  b.fire("mousedown");
  b.fire("mouseout");
  ok(b.down === false && b.hot === false,
     "dragging off a pressed button leaves it at rest");
  ok(bodyFill() === resting, "and painted that way");

  ok(!/st\.mouseOver|st\.leftButtonPressed/.test(raw),
     "the paint does not trust the draw state for either");
}

// =================================== one line of instructions, not three
// The panel used to carry a fixed hint under the preview, a status line at
// the foot, and a note drawn across the canvas that still asked for a Refresh
// the panel now does by itself - all three visible at once, two usually wrong.
section("the panel speaks in one line");
{
  ok(raw.indexOf("setCompact") < 0 && raw.indexOf("Compact") < 0,
     "compact mode is gone, and so is the folding it needed");
  ok(!/win\.add\("group"\)[\s\S]{0,200}small/.test(raw),
     "no second set of buttons to keep in step with the first");
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
  // it is an item like any other now, so its points can be seen and picked
  ok(V.state.items.length === 1 && V.state.items[0].prim === true,
     "and it is in the pickable list", V.state.items.length);
  const pg = V.state.geom[0];
  ok(pg && pg.prim === true && pg.verts.length === 4,
     "with four points of its own", pg ? pg.verts.length : "none");
  ok(/1 rectangle/.test(V.state.status) && /bezier path/.test(V.state.status),
     "the status says what it is and what rigging will do", V.state.status);
  ok(!/^0 path/.test(V.state.status),
     "and does not just report nothing", V.state.status);

  // the dimmed outline has to be framed, or the view falls back to the whole
  // comp and a 200x100 rectangle comes up as a speck
  const CW = 320, CH = 260;
  let inside = 0, seen = 0;
  for (const pt of V.state.geom[0].poly) {
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
  V.toBezierOn(c, [L]);
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

  const gh = V.geomFor(prims[0], 0);
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
  ok(V.state.items.length === 3, "the path and both primitives are pickable",
     V.state.items.length);
  ok(V.state.prims.length === 2, "two of the three are primitives",
     V.state.prims.length);
  ok(/3 paths in view/.test(V.state.status) &&
     /1 rectangle and 1 star/.test(V.state.status),
     "the status covers both", V.state.status);

  // rigging a point on one of them converts it, with no button pressed
  const primItem = V.state.items.filter(i => i.prim)[0];
  const sname = primItem.sname;
  V.actCreate([{ item: primItem, idx: [0, 1] }], false);
  V.UI.refresh();
  ok(V.state.prims.length === 1, "the one that was rigged is a path now",
     V.state.prims.length);
  const asPath = V.scanPaths(c, [L]).filter(i => i.sname === sname)[0];
  ok(!!asPath, "it is a real path, under the name it had", sname);
  ok(V.readManifest(asPath.prop).pts.length === 2,
     "with its two picked points rigged",
     V.readManifest(asPath.prop) ? V.readManifest(asPath.prop).pts.length : "none");
}

// ======================================= the pivot offset is the real centre
// A child's comp point is position + rot*scale*(its own point - anchor), so a
// pivot turns and zooms about whatever world place the anchor lands on, which
// is the position. Moving the pivot means moving both by the same raw offset.
//
// Scaling that compensation by the pivot's own scale cancels it exactly, and
// the children go on zooming about the centre the offset was meant to leave -
// measured in After Effects at 120px adrift. Rotating it cancels the same way.
//
// These run the two expressions and put their answers through that transform,
// so what is tested is where a child lands, not how the text reads.
function perAxis(expr, value, offset, scale, rotation) {
  return [0, 1].map(i => runExpr(expr, { "VXR Pivot Offset": offset[i] },
    { value: value[i], scale: scale[i], rotation }));
}

function pivotChild(piv, v, { offset, scale = [100, 100], rotation = 0 }) {
  const pos = perAxis(piv.transform.position.expression,
                      piv.transform.position.value, offset, scale, rotation);
  const anc = perAxis(piv.transform.anchorPoint.expression,
                      piv.transform.anchorPoint.value, offset, scale, rotation);
  const k = [scale[0] / 100, scale[1] / 100];
  const d = [(v[0] - anc[0]) * k[0], (v[1] - anc[1]) * k[1]];
  const r = rotation * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r);
  return [pos[0] + d[0] * cs - d[1] * sn, pos[1] + d[0] * sn + d[1] * cs];
}

// The one point a transform leaves alone is its centre. Find it by sweeping a
// child across the plane and keeping the one that does not move.
function centreOf(piv, offset, pose) {
  const probe = [[0, 0], [100, 0], [0, 100], [250, -170]];
  for (const v of probe) {
    const rest = pivotChild(piv, v, { offset });
    const moved = pivotChild(piv, v, Object.assign({ offset }, pose));
    if (Math.abs(rest[0] - moved[0]) < 1e-6 && Math.abs(rest[1] - moved[1]) < 1e-6) {
      return rest;
    }
  }
  // not on the probe grid: solve it. w = C + M(w0 - C)  =>  (I-M)C = w - M w0
  const a = pivotChild(piv, [0, 0], { offset });
  const b = pivotChild(piv, [100, 0], { offset });
  const A = pivotChild(piv, [0, 0], Object.assign({ offset }, pose));
  const B = pivotChild(piv, [100, 0], Object.assign({ offset }, pose));
  // M maps (b-a) to (B-A); with uniform scale and rotation that is enough
  const u = [b[0] - a[0], b[1] - a[1]], U = [B[0] - A[0], B[1] - A[1]];
  const den = u[0] * u[0] + u[1] * u[1];
  const m00 = (U[0] * u[0] + U[1] * u[1]) / den;
  const m10 = (U[1] * u[0] - U[0] * u[1]) / den;
  // (I - M) C = A - M a, with M = [[m00,-m10],[m10,m00]]
  const rx = A[0] - (m00 * a[0] - m10 * a[1]);
  const ry = A[1] - (m10 * a[0] + m00 * a[1]);
  // (I-M) = [[p, q], [-q, p]], whose inverse is [[p, -q], [q, p]] / (p^2+q^2)
  const p = 1 - m00, q = m10, det = p * p + q * q;
  return [(p * rx - q * ry) / det, (q * rx + p * ry) / det];
}

section("pivot: the offset moves the pivot, so turning and zooming follow it");
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
  ok(!/scale/.test(anc),
     "and the anchor carries it raw, not divided by the pivot's own scale", anc);

  const home = piv.transform.position.value;
  const D = [120, -45];
  const marker = perAxis(pos, home, D, [100, 100], 0);
  ok(Math.abs(marker[0] - home[0] - D[0]) < 1e-6 &&
     Math.abs(marker[1] - home[1] - D[1]) < 1e-6,
     "the marker moves by the offset", marker.join(","));

  // at rest, moving the offset must not stir the artwork
  const still = [[0, 0], [100, 0], [-60, 220]].every(v => {
    const a = pivotChild(piv, v, { offset: [0, 0] });
    const b = pivotChild(piv, v, { offset: D });
    return Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
  });
  ok(still, "and at rest the children do not move with it");

  const turned = centreOf(piv, D, { rotation: 90 });
  ok(Math.abs(turned[0] - marker[0]) < 1e-6 && Math.abs(turned[1] - marker[1]) < 1e-6,
     "rotation turns about the marker", turned.join(",") + " vs " + marker.join(","));

  const zoomed = centreOf(piv, D, { scale: [200, 200] });
  ok(Math.abs(zoomed[0] - marker[0]) < 1e-6 && Math.abs(zoomed[1] - marker[1]) < 1e-6,
     "and scale zooms about it too - the bug this replaces",
     zoomed.join(",") + " vs " + marker.join(","));

  const bothWays = centreOf(piv, D, { rotation: 35, scale: [160, 160] });
  ok(Math.abs(bothWays[0] - marker[0]) < 1e-5 && Math.abs(bothWays[1] - marker[1]) < 1e-5,
     "turning and zooming at once still centre on the marker", bothWays.join(","));

  // The drawn marker is a point in the layer like any other, so it goes
  // through the same transform. Its group sits at the layer's origin until
  // the offset walks it over to the anchor.
  const mk = piv.property("ADBE Root Vectors Group").property("Marker")
                .property("ADBE Vector Transform Group").property("ADBE Vector Position");
  ok(!!mk && !!mk.expression, "the marker artwork is driven by the offset too");
  const drawnAt = pose => pivotChild(piv,
    perAxis(mk.expression, mk.value, D, pose.scale || [100, 100], pose.rotation || 0),
    Object.assign({ offset: D }, pose));

  const rest = drawnAt({});
  ok(Math.abs(rest[0] - marker[0]) < 1e-6 && Math.abs(rest[1] - marker[1]) < 1e-6,
     "so the pivot you see is where the pivot turns", rest.join(",") + " vs " + marker.join(","));
  for (const pose of [{ rotation: 90 }, { scale: [200, 200] }, { rotation: 35, scale: [160, 160] }]) {
    const w = drawnAt(pose);
    ok(Math.abs(w[0] - marker[0]) < 1e-5 && Math.abs(w[1] - marker[1]) < 1e-5,
       "and a turn or a zoom leaves it sitting there - " + JSON.stringify(pose), w.join(","));
  }

  // an old rig is repaired the next time it is touched
  piv.transform.position.expression = "value + [1,2] // old rotation form";
  V.actAddToPivot([], [piv]);
  ok(piv.transform.position.expression === pos,
     "Add to Pivot puts an old pivot's expression right",
     piv.transform.position.expression);
}

// ================== rigging a primitive turns it into a path, with no button
// To Bezier used to be a button you had to find and press first. Picking a
// point on a rectangle, ellipse or star is the same request, so the panel
// does it when the point is rigged - and says so before you press anything.
section("primitives: rigged on demand, converted on the way");
{
  const c = newComp();
  const L = addPrimLayer(c, "Box", "Rectangle 1", "ADBE Vector Shape - Rect",
    p => { p.property("ADBE Vector Rect Size").setValue([200, 100]); }, [0, 0]);
  L.selected = true;
  V.UI.refresh();

  const item = V.state.items[0];
  const hadName = item.sname;
  ok(item.prim === true, "the rectangle is pickable");
  ok(V.state.geom[0].verts.length === 4, "with its four corners on show",
     V.state.geom[0].verts.length);

  // picking a point says what rigging it will cost, before anything happens
  V.state.sel = {};
  V.state.sel[item.key] = [0, 2];
  V.UI.refresh();
  ok(/will be turned into a bezier path/.test(V.state.status),
     "picking one warns that rigging converts it", V.state.status);
  ok(V.scanPaths(c, [L]).length === 0, "and nothing is converted yet");

  // rigging does the conversion and the rig in one step
  let said = "";
  const prev = V.UI.say;
  V.UI.say = m => { said = String(m); };
  V.actCreate([{ item: item, idx: [0, 2] }], false);
  V.UI.say = prev;

  const paths = V.scanPaths(c, [L]);
  ok(paths.length === 1, "it is a real path now", paths.length);
  ok(paths[0].sname === hadName, "under the name it had",
     paths[0].sname + " vs " + hadName);
  const man = V.readManifest(paths[0].prop);
  ok(man && man.pts.length === 2, "with the two picked points rigged",
     man ? man.pts.length : "none");
  ok(man.pts[0].i === 0 && man.pts[1].i === 2,
     "the same two, in the same order",
     man.pts.map(e => e.i).join(","));
  ok(/Turned 1 shape into a bezier path/.test(said), "and it says so", said);
  ok(V.scanPrimitives(c, [L]).length === 0, "nothing parametric is left");

  // a neighbour on the same layer is left alone
  const c2 = newComp();
  const L2 = addPrimLayer(c2, "Two", "Group 1", "ADBE Vector Shape - Rect",
    p => { p.property("ADBE Vector Rect Size").setValue([120, 60]); }, [0, 0]);
  const vecs = L2.property("ADBE Root Vectors Group").property("Group 1")
                 .property("ADBE Vectors Group");
  const el = vecs.addProperty("ADBE Vector Shape - Ellipse");
  el.property("ADBE Vector Ellipse Size").setValue([80, 80]);
  L2.selected = true;
  V.UI.refresh();
  const two = V.state.items.filter(i => i.prim);
  ok(two.length === 2, "two primitives to start", two.length);
  V.actCreate([{ item: two[0], idx: [0] }], false);
  ok(V.scanPrimitives(c2, [L2]).length === 1,
     "rigging one leaves its neighbour parametric",
     V.scanPrimitives(c2, [L2]).length);

  ok(!/act\([^)]*"tobezier"/.test(raw), "and there is no To Bezier button any more");
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
  setIn(bent, 0, [-30, 0]);
  setOut(bent, 0, [30, 0]);
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
// with a control per point, which is now the second of the two ways
V.P.pivotMode = "points";
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
V.P.pivotMode = "pivot";

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
