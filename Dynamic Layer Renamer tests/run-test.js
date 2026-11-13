// Headless test run for ../Dynamic Layer Renamer.jsx
//
//   node "Dynamic Layer Renamer tests/run-test.js"
//
// ae-mock.js stands in for the After Effects and ScriptUI object model, so the
// real .jsx is loaded and driven as AE would. Exits non-zero if anything fails.

const fs = require("fs");
const path = require("path");
const M = require("./ae-mock.js");

const SRC = path.join(__dirname, "..", "Dynamic Layer Renamer.jsx");

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log("  ok   " + label); }
  else { fail++; console.log("  FAIL " + label + (extra !== undefined ? "  <- " + extra : "")); }
}
function eq(a, b, label) { ok(a === b, label, JSON.stringify(a) + " != " + JSON.stringify(b)); }
function section(t) { console.log("\n" + t); }

// ------------------------------------------------------------------ boot
function boot() {
  M.LOG.undo.length = 0; M.LOG.alerts.length = 0; M.LOG.confirms.length = 0;
  M.LOG.tasks.length = 0; M.LOG.cancelled.length = 0; M.ALL.length = 0;

  let src = fs.readFileSync(SRC, "utf8").replace(/^#target.*$/m, "// target");
  const marker = "  win.center();";
  if (src.indexOf(marker) < 0) throw new Error("boot marker not found");
  src = src.replace(marker, `
  globalThis.__DLR = {
    buildName: buildName, replaceToken: replaceToken, escRepl: escRepl,
    replText: replText, startNum: startNum, buildRegexFromUI: buildRegexFromUI,
    processNameTemplate: processNameTemplate, canRenameProperty: canRenameProperty,
    collectShapeProps: collectShapeProps, numberShapeProps: numberShapeProps,
    shapeLayersFrom: shapeLayersFrom, replacePaddedNumberTokens: replacePaddedNumberTokens,
    renameMasks: renameMasks, renamePuppetPins: renamePuppetPins,
    renameShapeProperties: renameShapeProperties, renameAll: renameAll,
    updateMarkers: updateMarkers, updateTextContent: updateTextContent,
    renameLayersSequential: renameLayersSequential, renameProjectItems: renameProjectItems,
    renameProperties: renameProperties, updateExpressions: updateExpressions,
    renameSourceComp: renameSourceComp, renameLayers: renameLayers, layerName: layerName,
    updatePreview: updatePreview, win: win,
    ui: { findText: findText, renameText: renameText, targetDropdown: targetDropdown,
          startNumber: startNumber, regexCheck: regexCheck, matchCaseCheck: matchCaseCheck,
          wholeWordCheck: wholeWordCheck, globalShapeNumberingCheck: globalShapeNumberingCheck,
          renameBtn: renameBtn, previewPanel: previewPanel, autoDetectCheck: autoDetectCheck }
  };
` + marker);

  const names = ["app", "CompItem", "Window", "Panel", "ScriptUI", "$", "File", "Folder",
    "PropertyType", "Layer", "AVLayer", "TextLayer", "ShapeLayer", "CameraLayer", "LightLayer",
    "FootageItem", "SolidSource", "FileSource", "alert", "confirm", "ViewerType",
    "MarkerValue", "TextDocument", "Item"];
  new Function(...names, src)(...names.map(n => M[n]));
  return globalThis.__DLR;
}

// ------------------------------------------------------------- scene helpers
function newComp(name) {
  const c = new M.CompItem(name || "Main", 1920, 1080, 10, 25);
  M.app.project.activeItem = c;
  M.app.project.selection = [];
  return c;
}
// Mirrors the real AE tree, verified by probe against AE 2027:
//   Contents          INDEXED
//     Group 1         NAMED    <- renameable (parent is indexed)
//       Contents      INDEXED
//         Path 1      NAMED    <- renameable
//       Transform     NAMED    <- NOT renameable (parent is named)
//         Position    PROPERTY
function shapeLayerWith(comp, name, groupNames) {
  const l = new M.ShapeLayer(name, comp);
  const contents = l.addGroup("Contents", M.PropertyType.INDEXED_GROUP);
  groupNames.forEach(gn => {
    const g = new M.Group(gn, M.PropertyType.NAMED_GROUP);
    contents.add(g);
    const inner = new M.Group("Contents", M.PropertyType.INDEXED_GROUP);
    g.add(inner);
    inner.add(new M.Group("Path 1", M.PropertyType.NAMED_GROUP));
    const xf = new M.Group("Transform", M.PropertyType.NAMED_GROUP);
    g.add(xf);
    xf.add(new M.Prop("Position", [0, 0]));
  });
  comp.addLayer(l);
  l.selected = true;
  return l;
}
function setFields(D, match, rename) {
  D.ui.findText.text = match === null ? "Match (optional)" : match;
  D.ui.renameText.text = rename === null ? "Rename to" : rename;
}
function pickTarget(D, label) {
  const items = D.ui.targetDropdown.items;
  for (let i = 0; i < items.length; i++) if (items[i].text === label) { D.ui.targetDropdown.selection = i; return; }
  throw new Error("no target " + label);
}

const U = "[#↑]", DOWN = "[#↓]";

// ============================================================== 1. helpers
section("Helpers");
let D = boot();
ok(D && typeof D.buildName === "function", "script boots and exposes internals");

eq(D.startNum.call(null), 1, "startNum defaults to 1");
D.ui.startNumber.text = "010";
eq(D.startNum(), 10, "finding 15: startNum('010') is 10, not octal 8");
D.ui.startNumber.text = "0";
eq(D.startNum(), 0, "startNum allows 0");
D.ui.startNumber.text = "abc";
eq(D.startNum(), 1, "startNum falls back to 1 on junk");
D.ui.startNumber.text = "1";

eq(D.escRepl("Cost $5"), "Cost $$5", "escRepl doubles $");
eq(D.replaceToken("a[N]b", "[N]", "x"), "axb", "replaceToken substitutes");
eq(D.replaceToken("[N]", "[N]", "a[N]b"), "a[N]b",
   "finding 6: replaceToken is single-pass when the value contains the token");

// ============================================================== 2. $ handling
section("Finding 13 - $ in the replacement");
D = boot();
eq(D.buildName("b", "Cost $5", "abc", 0, 1), "aCost $5c",
   "plain-text mode keeps a literal $5");
D.ui.regexCheck.value = true;
eq(D.buildName("(b)", "[$1]", "abc", 0, 1), "a[b]c",
   "regex mode keeps $1 backreferences live");
D.ui.regexCheck.value = false;

// ============================================================ 3. regex toggle
section("Finding 14 - Match is literal unless Regex is on");
D = boot();
eq(D.buildName("a.c", "X", "a.c", 0, 1), "X", "literal 'a.c' matches 'a.c'");
eq(D.buildName("a.c", "X", "abc", 0, 1), "abc", "literal 'a.c' does NOT match 'abc'");
D.ui.regexCheck.value = true;
eq(D.buildName("a.c", "X", "abc", 0, 1), "X", "with Regex on, 'a.c' matches 'abc'");
D.ui.regexCheck.value = false;
eq(D.buildName("Shot (1)", "X", "Shot (1)", 0, 1), "X",
   "literal parens match instead of grouping");

section("Finding 9 - Case / Word reach every target");
D = boot();
D.ui.matchCaseCheck.value = true;
eq(D.buildName("abc", "X", "ABC", 0, 1), "ABC", "Match Case on: ABC not matched");
D.ui.matchCaseCheck.value = false;
eq(D.buildName("abc", "X", "ABC", 0, 1), "X", "Match Case off: ABC matched");
D.ui.matchCaseCheck.value = true;
D.ui.wholeWordCheck.value = true;
eq(D.buildName("cat", "X", "cathode", 0, 1), "cathode", "Whole Word on: 'cat' misses 'cathode'");
eq(D.buildName("cat", "X", "the cat sat", 0, 1), "the X sat", "Whole Word on: standalone matches");
D.ui.wholeWordCheck.value = false;

// ===================================================== 4. infinite-loop hang
section("Finding 6 - a layer named [N] no longer hangs");
D = boot();
const t0 = Date.now();
const res = D.processNameTemplate("[N]", "a[N]b", 0, 1, null);
ok(Date.now() - t0 < 500, "processNameTemplate returns promptly");
eq(res, "a[N]b", "[N] expands once and stops");

// ================================================= 5. undo groups in Rename All
section("Findings 1 & 2 - Rename All counts and one undo group");
D = boot();
let comp = newComp();
const la = new M.Layer("alpha", comp); comp.addLayer(la); la.selected = true;
const lb = new M.Layer("beta", comp); comp.addLayer(lb); lb.selected = true;
M.LOG.undo.length = 0;
D.renameAll("a", "Z");
const begins = M.LOG.undo.filter(u => u.op === "begin");
eq(begins.length, 1, "finding 2: exactly one beginUndoGroup for Rename All");
eq(Math.max(...M.LOG.undo.map(u => u.depth)), 1, "undo groups never nest");
eq(la.name, "ZlphZ", "every 'a' in 'alpha' is replaced");
eq(lb.name, "betZ", "and in 'beta'");

// recheck names directly
D = boot(); comp = newComp();
const l1 = new M.Layer("alpha", comp); comp.addLayer(l1); l1.selected = true;
M.LOG.alerts.length = 0;
D.renameAll("alpha", "shot");
eq(l1.name, "shot", "Rename All renames the layer");
eq(M.LOG.alerts.length, 0, "finding 1: no spurious 'nothing found' alerts during Rename All");

// ========================================== 6. nested renamers return counts
section("Finding 1 - nested renamers report what they did");
D = boot(); comp = newComp();
const sl = shapeLayerWith(comp, "shapes", ["Rect 1"]);
const mk = new M.Layer("masky", comp); comp.addLayer(mk); mk.selected = true;
const maskGroup = mk.addGroup("Masks", M.PropertyType.INDEXED_GROUP);
maskGroup.add(new M.Group("Mask 1", M.PropertyType.NAMED_GROUP));
mk.mask = maskGroup;
ok(typeof D.renameMasks("Mask", "Edge", true) === "number", "renameMasks returns a number in nested mode");
M.LOG.undo.length = 0;
D.renameMasks("Mask", "Edge", true);
eq(M.LOG.undo.length, 0, "nested renameMasks opens no undo group of its own");

// ==================================================== 7. masks scope guard
section("Finding 4 - unselected masks are not renamed silently");
D = boot(); comp = newComp();
const ml = new M.Layer("L", comp); comp.addLayer(ml); ml.selected = true;
const mg = ml.addGroup("Masks", M.PropertyType.INDEXED_GROUP);
const m1 = mg.add(new M.Group("Mask 1", M.PropertyType.NAMED_GROUP));
const m2 = mg.add(new M.Group("Mask 2", M.PropertyType.NAMED_GROUP));
ml.mask = mg;
M.setConfirmAnswer(false);
M.LOG.confirms.length = 0;
D.renameMasks(null, "Edge");
eq(M.LOG.confirms.length, 1, "it asks before touching unselected masks");
eq(m1.name, "Mask 1", "declining leaves masks alone");
M.setConfirmAnswer(true);
D.renameMasks(null, "Edge");
eq(m1.name, "Edge", "accepting renames them");
M.setConfirmAnswer(true);

// selected masks need no prompt
D = boot(); comp = newComp();
const ml2 = new M.Layer("L", comp); comp.addLayer(ml2); ml2.selected = true;
const mg2 = ml2.addGroup("Masks", M.PropertyType.INDEXED_GROUP);
const ms1 = mg2.add(new M.Group("Mask 1", M.PropertyType.NAMED_GROUP));
mg2.add(new M.Group("Mask 2", M.PropertyType.NAMED_GROUP));
ms1.selected = true; ml2.mask = mg2;
M.LOG.confirms.length = 0;
D.renameMasks(null, "Edge");
eq(M.LOG.confirms.length, 0, "a selected mask renames with no prompt");
eq(ms1.name, "Edge", "the selected mask was renamed");
eq(mg2.property(2).name, "Mask 2", "the unselected mask was left alone");

// ================================================= 8. markers stay in scope
section("Finding 3 - comp markers are not rewritten by the Markers target");
D = boot(); comp = newComp();
comp.markerProperty.addKey("comp marker A", 1).addKey("comp marker B", 2);
const lm = new M.Layer("L", comp); comp.addLayer(lm); lm.selected = true;
lm.marker.addKey("layer marker", 0.5);
D.updateMarkers(null, "TAG");
eq(comp.markerProperty.keyValue(1).comment, "comp marker A", "comp marker 1 untouched");
eq(comp.markerProperty.keyValue(2).comment, "comp marker B", "comp marker 2 untouched");
eq(lm.marker.keyValue(1).comment, "TAG", "the layer marker was updated");

// ============================================ 9. sequential source guard
section("Finding 5 - a shared source is not renamed");
D = boot(); comp = newComp();
const other = new M.CompItem("Other");
const shared = new M.FootageItem("shared.mov");
shared.usedIn = [comp, other];               // used in two comps
const sv = new M.AVLayer("v1", comp); sv.source = shared; comp.addLayer(sv); sv.selected = true;
setFields(D, null, "Shot");
D.ui.startNumber.text = "1";
D.renameLayersSequential(true);
eq(shared.name, "shared.mov", "a source used by another comp keeps its name");
eq(sv.name, "Shot 1", "the layer itself is renamed");

D = boot(); comp = newComp();
const lone = new M.FootageItem("lone.mov");
lone.usedIn = [comp];
const lv = new M.AVLayer("v1", comp); lv.source = lone; comp.addLayer(lv); lv.selected = true;
setFields(D, null, "Shot");
D.renameLayersSequential(true);
eq(lone.name, "Shot 1", "an exclusively used source still follows the layer");

// ============================================== 10. puppet pin numbering
section("Finding 11 - puppet pins number and count down properly");
D = boot(); comp = newComp();
const pl = new M.Layer("puppet", comp); comp.addLayer(pl); pl.selected = true;
const fx = pl.addGroup("Effects", M.PropertyType.INDEXED_GROUP);
const puppet = new M.Group("Puppet", M.PropertyType.NAMED_GROUP);
puppet.matchName = "ADBE FreePin3 ARAP Group";
fx.add(puppet);
const mesh = new M.Group("Mesh", M.PropertyType.INDEXED_GROUP);
puppet.add(mesh);
for (let i = 1; i <= 3; i++) {
  const pin = new M.Group("Puppet Pin " + i, M.PropertyType.INDEXED_GROUP);
  pin.matchName = "ADBE FreePin3 PosPin Atom";
  mesh.add(pin);
}
D.ui.startNumber.text = "1";
D.renamePuppetPins(null, "Pin " + U);
eq(mesh.property(1).name, "Pin 1", "pin 1 numbered 1");
eq(mesh.property(2).name, "Pin 2", "pin 2 numbered 2 (was all the same before)");
eq(mesh.property(3).name, "Pin 3", "pin 3 numbered 3");

D = boot(); comp = newComp();
const pl2 = new M.Layer("puppet", comp); comp.addLayer(pl2); pl2.selected = true;
const fx2 = pl2.addGroup("Effects", M.PropertyType.INDEXED_GROUP);
const pup2 = new M.Group("Puppet", M.PropertyType.NAMED_GROUP);
pup2.matchName = "ADBE FreePin3 ARAP Group"; fx2.add(pup2);
const mesh2 = new M.Group("Mesh", M.PropertyType.INDEXED_GROUP); pup2.add(mesh2);
for (let i = 1; i <= 3; i++) {
  const pin = new M.Group("Puppet Pin " + i, M.PropertyType.INDEXED_GROUP);
  pin.matchName = "ADBE FreePin3 PosPin Atom"; mesh2.add(pin);
}
D.ui.startNumber.text = "1";
D.renamePuppetPins(null, "Pin " + DOWN);
eq(mesh2.property(1).name, "Pin 3", "descending really descends");
eq(mesh2.property(3).name, "Pin 1", "descending reaches 1 at the end");

// ========================================= 11. canRenameProperty is read-only
section("Finding 7 - canRenameProperty does not write");
D = boot(); comp = newComp();
const cl = shapeLayerWith(comp, "s", ["Rect 1"]);
const contents = cl.property("Contents");
const grp = contents.property(1);          // Group 1   (parent Contents = INDEXED)
const innerContents = grp.property(1);     // Contents  (parent Group  = NAMED)
const path1 = innerContents.property(1);   // Path 1    (parent Contents = INDEXED)
const xform = grp.property(2);             // Transform (parent Group  = NAMED)
const pos = xform.property(1);             // Position  (parent Transform = NAMED)
ok(D.canRenameProperty(grp) === true, "a shape group is renameable");
ok(D.canRenameProperty(path1) === true, "a path inside a group is renameable");
ok(D.canRenameProperty(xform) === false, "Transform is not renameable");
ok(D.canRenameProperty(pos) === false, "a leaf property is not renameable");
ok(D.canRenameProperty(contents) === false, "Contents itself is not");
// prove it is read-only: a property whose setter throws must not be touched
let wrote = false;
const probe = new M.Group("probe", M.PropertyType.INDEXED_GROUP);
probe.parentProperty = null;
Object.defineProperty(probe, "name", {
  get() { return "probe"; }, set() { wrote = true; throw new Error("nope"); }, configurable: true
});
D.canRenameProperty(probe);
ok(wrote === false, "canRenameProperty never assigns .name");

// ================================== 12. shape numbering: preview == apply
section("Finding 10 - shape numbering matches between preview and apply");
D = boot(); comp = newComp();
const s1 = shapeLayerWith(comp, "s1", ["Rect 1", "Rect 2"]);
const s2 = shapeLayerWith(comp, "s2", ["Ellipse 1"]);
let entries = D.numberShapeProps(D.collectShapeProps(D.shapeLayersFrom(comp.selectedLayers), null), true);
eq(entries.length, 6, "six renameable shape props found (3 groups + 3 paths)");
eq(entries[0].index, 0, "global seq: first index 0");
eq(entries[5].index, 5, "global seq: sixth index 5");
eq(entries[0].total, 6, "global seq: total counts only renameable props");

entries = D.numberShapeProps(D.collectShapeProps(D.shapeLayersFrom(comp.selectedLayers), null), false);
eq(entries[0].index, 0, "per-group: s1 first is 0");
eq(entries[1].index, 0, "per-group: a path restarts inside its own group");
eq(entries[2].index, 1, "per-group: the second group is 1");
eq(entries[2].total, 2, "per-group: total is that parent group own size");

D.ui.startNumber.text = "1";
D.ui.globalShapeNumberingCheck.value = true;
D.renameShapeProperties(null, "G" + U);
eq(comp.selectedLayers[0].property("Contents").property(1).name, "G1", "apply writes G1");
eq(comp.selectedLayers[0].property("Contents").property(2).name, "G3", "apply numbers the second group after its path");
eq(comp.selectedLayers[1].property("Contents").property(1).name, "G5", "apply continues across layers");

// ================================= 13. [#up] alone respects the target
section("Finding 8 - a bare number token respects the Target dropdown");
D = boot(); comp = newComp();
const tl = new M.Layer("layerA", comp); comp.addLayer(tl); tl.selected = true;
const pitem = new M.FootageItem("itemA"); pitem.selected = true;
M.app.project.selection = [pitem];
pickTarget(D, "Project Items");
setFields(D, null, U);
D.ui.startNumber.text = "1";
D.ui.renameBtn.onClick();
eq(pitem.name, "1", "Project Items target renames the project item");
eq(tl.name, "layerA", "the layer was left alone");

// ============================================ 14. text content guard
section("Finding 16 - animated Source Text is skipped, not mangled");
D = boot(); comp = newComp();
const txt = new M.TextLayer("t1", comp, "hello"); comp.addLayer(txt); txt.selected = true;
const txt2 = new M.TextLayer("t2", comp, "hello"); comp.addLayer(txt2); txt2.selected = true;
txt2.property("Source Text").expressionEnabled = true;
M.LOG.alerts.length = 0;
D.updateTextContent("hello", "world");
eq(txt.property("Source Text").value.text, "world", "plain text layer updated");
eq(txt2.property("Source Text").value.text, "hello", "expression-driven text left alone");
ok(M.LOG.alerts.length > 0, "and it says so");

// ================================================ 15. lifecycle
section("Finding 12 - polling stops when the palette closes");
D = boot();
const scheduledBefore = M.LOG.tasks.length;
ok(scheduledBefore > 0, "a poll task was scheduled at startup");
M.LOG.cancelled.length = 0;
D.win.close();
ok(M.LOG.cancelled.length > 0, "closing the window cancels the poll task");

// ================================================ 16. preview pool
section("Finding 18 - preview reuses its rows");
D = boot(); comp = newComp();
for (let i = 0; i < 4; i++) { const l = new M.Layer("L" + i, comp); comp.addLayer(l); l.selected = true; }
pickTarget(D, "Layers");
setFields(D, null, "X" + U);
D.updatePreview();
const after1 = D.ui.previewPanel.children.length;
for (let i = 0; i < 25; i++) D.updatePreview();
const after2 = D.ui.previewPanel.children.length;
eq(after1, after2, "26 preview refreshes create no extra controls");
ok(after1 <= 11, "the pool is bounded (" + after1 + " rows)");

// ================================================ 17. padded tokens
section("Padded number tokens still work everywhere");
D = boot();
D.ui.startNumber.text = "1";
eq(D.replacePaddedNumberTokens("A[##↑]", 0, 3, 1), "A01", "[##up] pads to 2");
eq(D.replacePaddedNumberTokens("A[###↓]", 0, 3, 1), "A003", "[###down] pads to 3");
eq(D.buildName(null, "P[##↑]", "x", 4, 10), "P05", "buildName honours padded tokens");

// ================================================ 18. ASCII / encoding
section("Finding 20 - source is pure ASCII");
const bytes = fs.readFileSync(SRC);
ok(bytes[0] !== 0xEF, "no UTF-8 BOM");
let nonAscii = 0;
for (const b of bytes) if (b > 127) nonAscii++;
eq(nonAscii, 0, "no non-ASCII bytes in the source");
eq(D.buildName(null, "N" + U, "x", 0, 1), "N1",
   "the up-arrow token still works when written as an escape");

// =========================================== 19. preview == apply (parity)
section("Preview and Apply agree");

function previewLines(D) {
  D.updatePreview();
  return D.ui.previewPanel.children.filter(c => c.visible).map(c => c.text);
}

// -- layers, plain text replace
let Dp = boot(); let cp = newComp();
["alpha", "beta", "gamma"].forEach(n => { const l = new M.Layer(n, cp); cp.addLayer(l); l.selected = true; });
pickTarget(Dp, "Layers");
setFields(Dp, "a", "X");
let shown = previewLines(Dp);
Dp.renameLayers("a", "X");
let actual = cp.selectedLayers.map(l => l.name);
eq(JSON.stringify(shown), JSON.stringify(actual), "layers / find-replace: preview matches result");

// -- layers, token template with a Match pattern (the old mismatch)
Dp = boot(); cp = newComp();
["shot_a", "shot_b"].forEach(n => { const l = new M.Layer(n, cp); cp.addLayer(l); l.selected = true; });
pickTarget(Dp, "Layers");
setFields(Dp, "shot", "[N]_v" + U);
Dp.ui.startNumber.text = "1";
shown = previewLines(Dp);
Dp.renameLayers("shot", "[N]_v" + U);
actual = cp.selectedLayers.map(l => l.name);
eq(JSON.stringify(shown), JSON.stringify(actual), "layers / template + match: preview matches result");

// -- shape properties, global sequence
Dp = boot(); cp = newComp();
shapeLayerWith(cp, "s1", ["Rect 1", "Rect 2"]);
shapeLayerWith(cp, "s2", ["Ellipse 1"]);
pickTarget(Dp, "Shape Properties");
Dp.ui.globalShapeNumberingCheck.value = true;
Dp.ui.startNumber.text = "1";
setFields(Dp, null, "G" + U);
shown = previewLines(Dp);
Dp.renameShapeProperties(null, "G" + U);
const names = [];
cp.selectedLayers.forEach(l => {
  const c = l.property("Contents");
  for (let i = 1; i <= c.numProperties; i++) {
    const g = c.property(i);
    names.push(g.name);
    const inner = g.property(1);
    for (let j = 1; j <= inner.numProperties; j++) names.push(inner.property(j).name);
  }
});
eq(JSON.stringify(shown), JSON.stringify(names.slice(0, shown.length)),
   "shape props / global seq: preview matches result");

// -- project items with a comp token
Dp = boot(); cp = newComp();
const ci = new M.CompItem("scene", 1920, 1080, 4, 25); ci.selected = true;
M.app.project.activeItem = null;
M.app.project.selection = [ci];
pickTarget(Dp, "Project Items");
setFields(Dp, null, "[N]_[Res]");
shown = previewLines(Dp);
Dp.renameProjectItems(null, "[N]_[Res]");
eq(shown[0], ci.name, "project items / [Res]: preview matches result");
eq(ci.name, "scene_1920x1080", "and the token expanded");

// -- markers
Dp = boot(); cp = newComp();
const lmk = new M.Layer("L", cp); cp.addLayer(lmk); lmk.selected = true;
lmk.marker.addKey("intro", 0).addKey("outro", 2);
pickTarget(Dp, "Markers");
setFields(Dp, null, "M" + U);
Dp.ui.startNumber.text = "1";
shown = previewLines(Dp);
Dp.updateMarkers(null, "M" + U);
eq(JSON.stringify(shown),
   JSON.stringify([lmk.marker.keyValue(1).comment, lmk.marker.keyValue(2).comment]),
   "markers: preview matches result");

// ===================================== 20. find with no rename deletes matches
section("Match with an empty Rename deletes the matched text");
Dp = boot(); cp = newComp();
const dl = new M.Layer("PRE_name", cp); cp.addLayer(dl); dl.selected = true;
Dp.renameLayers("PRE_", "");
eq(dl.name, "name", "an empty replacement strips the match");

// ------------------------------------------------------------------ summary
console.log("\n" + "=".repeat(52));
console.log("  " + pass + " passed, " + fail + " failed");
console.log("=".repeat(52));
process.exit(fail ? 1 : 0);
