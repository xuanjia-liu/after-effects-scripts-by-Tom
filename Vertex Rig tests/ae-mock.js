// Small stand-in for the After Effects / ScriptUI object model, enough to run
// Vertex Rig.jsx headlessly and inspect what it builds.

const EXPRS = [];           // every expression string the script assigns

const PropertyType = { PROPERTY: 6012, INDEXED_GROUP: 6013, NAMED_GROUP: 6014 };
const PropertyValueType = { NO_VALUE: 6613, TwoD: 6614, ThreeD: 6615, COLOR: 6618, SHAPE: 6173 };
const KeyframeInterpolationType = { LINEAR: 6612, BEZIER: 6613, HOLD: 6614 };
const MaskMode = { NONE: 6612, ADD: 6613 };

class Shape {
  constructor() { this.vertices = []; this.inTangents = []; this.outTangents = []; this.closed = true; }
  clone() {
    const s = new Shape();
    s.vertices = this.vertices.map(p => [p[0], p[1]]);
    s.inTangents = this.inTangents.map(p => [p[0], p[1]]);
    s.outTangents = this.outTangents.map(p => [p[0], p[1]]);
    s.closed = this.closed;
    return s;
  }
}

const cloneVal = v => (v instanceof Shape) ? v.clone() : (Array.isArray(v) ? v.slice() : v);

// leaf definitions per container matchName
const LEAF = (mn, name, value) => ({ mn, name, value, leaf: true });
const SUB = (mn, name, kids) => ({ mn, name, kids, leaf: false });

const XFORM2D = [
  LEAF("ADBE Vector Anchor", "Anchor Point", [0, 0]),
  LEAF("ADBE Vector Position", "Position", [0, 0]),
  LEAF("ADBE Vector Scale", "Scale", [100, 100]),
  LEAF("ADBE Vector Skew", "Skew", 0),
  LEAF("ADBE Vector Skew Axis", "Skew Axis", 0),
  LEAF("ADBE Vector Rotation", "Rotation", 0),
  LEAF("ADBE Vector Group Opacity", "Opacity", 100)
];

const SCHEMA = {
  "ADBE Vector Group": { name: "Group", kids: [SUB("ADBE Vectors Group", "Contents", []), SUB("ADBE Vector Transform Group", "Transform", XFORM2D)] },
  "ADBE Vector Transform Group": { name: "Transform", kids: XFORM2D },
  "ADBE Vectors Group": { name: "Contents", kids: [], open: true },
  "ADBE Root Vectors Group": { name: "Contents", kids: [], open: true },
  "ADBE Effect Parade": { name: "Effects", kids: [], open: true },
  "ADBE Mask Parade": { name: "Masks", kids: [], open: true },
  "ADBE Vector Shape - Group": { name: "Path", kids: [LEAF("ADBE Vector Shape", "Path", new Shape())] },
  "ADBE Vector Shape - Rect": { name: "Rectangle Path", kids: [
      LEAF("ADBE Vector Rect Size", "Size", [200, 120]),
      LEAF("ADBE Vector Rect Position", "Position", [0, 0]),
      LEAF("ADBE Vector Rect Roundness", "Roundness", 0)] },
  "ADBE Vector Shape - Ellipse": { name: "Ellipse Path", kids: [
      LEAF("ADBE Vector Ellipse Size", "Size", [100, 100]),
      LEAF("ADBE Vector Ellipse Position", "Position", [0, 0])] },
  "ADBE Vector Shape - Star": { name: "Polystar Path", kids: [
      LEAF("ADBE Vector Star Type", "Type", 1),
      LEAF("ADBE Vector Star Points", "Points", 5),
      LEAF("ADBE Vector Star Position", "Position", [0, 0]),
      LEAF("ADBE Vector Star Rotation", "Rotation", 0),
      LEAF("ADBE Vector Star Inner Radius", "Inner Radius", 50),
      LEAF("ADBE Vector Star Outer Radius", "Outer Radius", 100),
      LEAF("ADBE Vector Star Inner Roundess", "Inner Roundness", 0),
      LEAF("ADBE Vector Star Outer Roundess", "Outer Roundness", 0)] },
  "ADBE Vector Graphic - Fill": { name: "Fill", kids: [
      LEAF("ADBE Vector Fill Color", "Color", [1, 1, 1, 1]),
      LEAF("ADBE Vector Fill Opacity", "Opacity", 100)] },
  "ADBE Vector Graphic - Stroke": { name: "Stroke", kids: [
      LEAF("ADBE Vector Stroke Color", "Color", [0, 0, 0, 1]),
      LEAF("ADBE Vector Stroke Opacity", "Opacity", 100),
      LEAF("ADBE Vector Stroke Width", "Stroke Width", 2)] },
  "ADBE Mask Atom": { name: "Mask", kids: [LEAF("ADBE Mask Shape", "Mask Path", new Shape())] },
  "ADBE Layer Control": { name: "Layer Control", kids: [LEAF("ADBE Layer Control-0001", "Layer", 0)] },
  "ADBE Slider Control": { name: "Slider Control", kids: [LEAF("ADBE Slider Control-0001", "Slider", 0)] },
  "ADBE Checkbox Control": { name: "Checkbox Control", kids: [LEAF("ADBE Checkbox Control-0001", "Checkbox", 0)] },
  "ADBE Point Control": { name: "Point Control", kids: [LEAF("ADBE Point Control-0001", "Point", [0, 0])] },
  "ADBE Angle Control": { name: "Angle Control", kids: [LEAF("ADBE Angle Control-0001", "Angle", 0)] }
};

let UID = 0;

class Prop {
  constructor(mn, name, value, parent) {
    this.matchName = mn; this.name = name; this._value = cloneVal(value);
    this.parentGroup = parent; this.propertyType = PropertyType.PROPERTY;
    this.canSetName = true; this.enabled = true; this.canSetEnabled = true;
    this._expr = ""; this._keys = []; this._noEval = false;
  }
  get value() {
    // A Layer Control holds a real reference in AE, not a frozen index.
    if (this.matchName === "ADBE Layer Control-0001") {
      if (!this._ref) { return 0; }
      const c = app.project.activeItem;
      const i = c ? c._layers.indexOf(this._ref) : -1;
      return i < 0 ? 0 : i + 1;
    }
    return this._value;
  }
  get numKeys() { return this._keys.length; }
  get expressionEnabled() { return this._expr !== ""; }
  get expression() { return this._expr; }
  set expression(s) {
    if (s) { EXPRS.push({ where: this.name, src: s }); }
    this._expr = s || "";
    if (this._noEval && s) { throw new Error("mock cannot evaluate expressions"); }
  }
  setValue(v) {
    if (v === undefined) { throw new Error("no value"); }
    if (this.matchName === "ADBE Layer Control-0001") {
      const c = app.project.activeItem;
      this._ref = (c && v >= 1 && v <= c._layers.length) ? c._layers[v - 1] : null;
      this._value = v;
      return;
    }
    this._value = cloneVal(v);
  }
  setValueAtTime(t, v) { this._keys.push({ t, v: cloneVal(v) }); this._keys.sort((a, b) => a.t - b.t); }
  valueAtTime(t) {
    if (this._noEval && this._expr) { throw new Error("mock cannot evaluate expressions"); }
    if (this._keys.length) {
      let best = this._keys[0];
      for (const k of this._keys) { if (k.t <= t + 1e-9) { best = k; } }
      return cloneVal(best.v);
    }
    return cloneVal(this._value);
  }
  keyTime(i) { return this._keys[i - 1].t; }
  keyValue(i) { return cloneVal(this._keys[i - 1].v); }
  keyInInterpolationType() { return KeyframeInterpolationType.LINEAR; }
  keyOutInterpolationType() { return KeyframeInterpolationType.LINEAR; }
  setInterpolationTypeAtKey() {}
  setTemporalEaseAtKey() {}
  keyInTemporalEase() { return []; }
  keyOutTemporalEase() { return []; }
  removeKey(i) { this._keys.splice(i - 1, 1); }
  get propertyIndex() { return this.parentGroup ? this.parentGroup._kids.indexOf(this) + 1 : 1; }
  propertyGroup() { return this.parentGroup; }
  remove() { const a = this.parentGroup._kids; a.splice(a.indexOf(this), 1); }
  moveTo(i) {
    const a = this.parentGroup._kids;
    a.splice(a.indexOf(this), 1);
    a.splice(i - 1, 0, this);
  }
  clone(parent) {
    const p = new Prop(this.matchName, this.name, this._value, parent);
    p._expr = this._expr; p._keys = this._keys.map(k => ({ t: k.t, v: cloneVal(k.v) }));
    p._ref = this._ref;
    return p;
  }
}

class Group {
  constructor(mn, name, parent) {
    this.matchName = mn; this.name = name; this.parentGroup = parent;
    this._kids = []; this.canSetName = true; this.enabled = true; this.canSetEnabled = true;
    const sc = SCHEMA[mn];
    this.propertyType = (sc && sc.open) ? PropertyType.INDEXED_GROUP : PropertyType.NAMED_GROUP;
    this._open = !!(sc && sc.open);
    if (sc) { for (const k of sc.kids) { this._kids.push(mk(k, this)); } }
  }
  get numProperties() { return this._kids.length; }
  property(q) {
    if (typeof q === "number") { return this._kids[q - 1]; }
    for (const k of this._kids) { if (k.name === q) { return k; } }
    for (const k of this._kids) { if (k.matchName === q) { return k; } }
    return null;
  }
  canAddProperty(mn) { return this._open && !!SCHEMA[mn]; }
  addProperty(mn) {
    if (!SCHEMA[mn]) { throw new Error("unknown matchName " + mn); }
    if (!this._open) {
      const have = this.property(mn);
      if (have) { return have; }
      throw new Error("cannot add " + mn + " to " + this.matchName);
    }
    const base = SCHEMA[mn].name;
    let n = 1, nm = base + " 1";
    const taken = new Set(this._kids.map(k => k.name));
    while (taken.has(nm)) { n++; nm = base + " " + n; }
    const g = SCHEMA[mn].kids !== undefined && SCHEMA[mn].kids.length >= 0 && !isLeafMatch(mn)
      ? new Group(mn, nm, this) : new Prop(mn, nm, null, this);
    this._kids.push(g);
    return g;
  }
  get propertyIndex() { return this.parentGroup ? this.parentGroup._kids.indexOf(this) + 1 : 1; }
  propertyGroup() { return this.parentGroup; }
  remove() { const a = this.parentGroup._kids; a.splice(a.indexOf(this), 1); }
  moveTo(i) {
    const a = this.parentGroup._kids;
    a.splice(a.indexOf(this), 1);
    a.splice(i - 1, 0, this);
  }
  clone(parent) {
    const g = Object.create(Group.prototype);
    g.matchName = this.matchName; g.name = this.name; g.parentGroup = parent;
    g.canSetName = true; g.enabled = this.enabled; g.canSetEnabled = true;
    g.propertyType = this.propertyType; g._open = this._open;
    g._kids = this._kids.map(k => k.clone(g));
    return g;
  }
}

function isLeafMatch() { return false; }
function mk(def, parent) {
  return def.leaf ? new Prop(def.mn, def.name, def.value, parent)
                  : (() => { const g = new Group(def.mn, def.name, parent); 
                             if (def.kids && def.kids.length && g._kids.length === 0) {
                               for (const k of def.kids) { g._kids.push(mk(k, g)); } }
                             return g; })();
}

class LayerTransform extends Group {
  constructor(layer) {
    super("ADBE Transform Group", "Transform", null);
    this._kids = [
      new Prop("ADBE Anchor Point", "Anchor Point", [0, 0], this),
      new Prop("ADBE Position", "Position", [0, 0], this),
      new Prop("ADBE Scale", "Scale", [100, 100], this),
      new Prop("ADBE Rotate Z", "Rotation", 0, this),
      new Prop("ADBE Opacity", "Opacity", 100, this)
    ];
    this.layer = layer;
  }
  get anchorPoint() { return this.property("ADBE Anchor Point"); }
  get position() { return this.property("ADBE Position"); }
  get scale() { return this.property("ADBE Scale"); }
  get rotation() { return this.property("ADBE Rotate Z"); }
}

class Layer {
  constructor(comp, name, kind) {
    this.containingComp = comp; this.name = name; this.id = ++UID;
    this.comment = ""; this.parent = null; this.selected = false;
    this.guideLayer = false; this.label = 0; this.enabled = true; this.shy = false;
    this.threeDLayer = false; this.kind = kind;
    this.transform = new LayerTransform(this);
    this._groups = { "ADBE Effect Parade": new Group("ADBE Effect Parade", "Effects", null) };
    if (kind === "shape") { this._groups["ADBE Root Vectors Group"] = new Group("ADBE Root Vectors Group", "Contents", null); }
    if (kind !== "null") { this._groups["ADBE Mask Parade"] = new Group("ADBE Mask Parade", "Masks", null); }
  }
  property(q) {
    if (q === "ADBE Transform Group" || q === "Transform") { return this.transform; }
    return this._groups[q] || null;
  }
  get index() { return this.containingComp._layers.indexOf(this) + 1; }
  remove() { const a = this.containingComp._layers; a.splice(a.indexOf(this), 1); }
  moveAfter(other) {
    const a = this.containingComp._layers;
    a.splice(a.indexOf(this), 1);
    a.splice(a.indexOf(other) + 1, 0, this);
  }
  duplicate() {
    const d = new Layer(this.containingComp, this.name + " 2", this.kind);
    d.comment = this.comment; d.parent = this.parent; d.guideLayer = this.guideLayer;
    d.label = this.label; d.threeDLayer = this.threeDLayer;
    for (const k of Object.keys(this._groups)) { d._groups[k] = this._groups[k].clone(null); }
    d.transform = new LayerTransform(d);
    for (let i = 0; i < this.transform._kids.length; i++) {
      d.transform._kids[i] = this.transform._kids[i].clone(d.transform);
    }
    const a = this.containingComp._layers;
    a.splice(a.indexOf(this), 0, d);
    return d;
  }
}

class CompItem {
  constructor(w, h, dur, fps) {
    this.width = w; this.height = h; this.duration = dur; this.frameRate = fps;
    this.time = 0; this.workAreaStart = 0; this.workAreaDuration = dur;
    this._layers = [];
    const self = this;
    this.layers = {
      addShape() { const l = new Layer(self, "Shape Layer " + (self._layers.length + 1), "shape"); self._layers.unshift(l); return l; },
      addNull() { const l = new Layer(self, "Null " + (self._layers.length + 1), "null"); self._layers.unshift(l); l.transform.position._noEval = true; return l; }
    };
  }
  get numLayers() { return this._layers.length; }
  layer(i) { return this._layers[i - 1]; }
  get selectedLayers() { return this._layers.filter(l => l.selected); }
}

const settings = {};
const app = {
  // After Effects' own polling timer, recorded rather than run
  _tasks: [],
  scheduleTask(src, ms, repeat) {
    app._tasks.push({ src, ms, repeat, id: app._tasks.length + 1 });
    return app._tasks.length;
  },
  cancelTask(id) { app._cancelled = (app._cancelled || []).concat([id]); },
  project: { activeItem: null },
  settings: {
    haveSetting: (s, k) => (s + "/" + k) in settings,
    getSetting: (s, k) => settings[s + "/" + k],
    saveSetting: (s, k, v) => { settings[s + "/" + k] = String(v); }
  },
  beginUndoGroup() {}, endUndoGroup() {},
  executeCommand() {}, findMenuCommandId() { return 16; }
};

// ---- ScriptUI stubs -------------------------------------------------------
const gfx = () => ({
  BrushType: { SOLID_COLOR: 0 }, PenType: { SOLID_COLOR: 0 },
  newBrush: () => ({}), newPen: () => ({}), newPath() {}, rectPath() {},
  ellipsePath() {}, moveTo() {}, lineTo() {}, closePath() {}, fillPath() {},
  strokePath() {}, drawString() {}, foregroundColor: null
});
const NODES = [];               // every widget the panel builds, for the tests

function uiNode(type) {
  const n = {
    type, _kids: [], _sel: null, _on: {}, items: [], text: "", value: 0, visible: true,
    enabled: true,
    size: { width: 320, height: 260 }, preferredSize: [0, 0], minimumSize: [0, 0],
    maximumSize: [0, 0], alignChildren: [], alignment: [], margins: 0, spacing: 0,
    orientation: "", characters: 0, helpTip: "", graphics: gfx(),
    layout: { layout() {}, resize() {} },
    // ScriptUI takes an index on the way in and hands back the list item, so
    // `dd.selection = 0` then `dd.selection.index` is the normal round trip.
    get selection() { return this._sel; },
    set selection(v) {
      if (v === null || v === undefined) { this._sel = null; }
      else if (typeof v === "number") { this._sel = this.items[v] || { index: v, text: "" }; }
      else { this._sel = v; }
    },
    add(t, b, txt) {
      const c = uiNode(t);
      if (Array.isArray(txt)) { c.items = txt.map((s, i) => ({ index: i, text: s })); }
      else { c.text = txt; }
      n._kids.push(c);
      return c;
    },
    // listeners are kept so a test can fire one, the way a pointer would
    addEventListener(type, fn) { (this._on[type] = this._on[type] || []).push(fn); },
    fire(type, ev) {
      const l = this._on[type] || [];
      for (const fn of l) { fn.call(this, Object.assign({ type }, ev || {})); }
      return l.length;
    },
    notify(type) { this._repaints = (this._repaints || 0) + 1; return type; },
    hide() {}, show() {}, center() {}, close() {}
  };
  NODES.push(n);
  return n;
}
function Window(kind, title) { const w = uiNode("window"); w.kind = kind; w.title = title; return w; }
Window.prototype = {};
function Panel() {}
const ScriptUI = {
  newFont: () => ({}),
  // After Effects builds a ScriptUI image from a file on disk; the panel's
  // icons are decoded into one first, so this hands back whatever it is given.
  newImage: (a) => ({ path: a })
};
const $ = { colorPicker: () => -1, global: {} };

// ---- File / Folder --------------------------------------------------------
// Backed by the real filesystem in a scratch directory, so a BINARY write of
// a decoded PNG can be read back and compared byte for byte.
const fs = require("fs");
const os = require("os");
const nodePath = require("path");
const TEMP = fs.mkdtempSync(nodePath.join(os.tmpdir(), "vxr-mock-"));
const Folder = { temp: { fsName: TEMP } };

function File(p) {
  this.fsName = String(p);
  this.encoding = "";
  this._buf = null;
}
Object.defineProperty(File.prototype, "exists", {
  get() { return fs.existsSync(this.fsName); }
});
Object.defineProperty(File.prototype, "length", {
  get() { try { return fs.statSync(this.fsName).size; } catch (e) { return 0; } }
});
File.prototype.open = function () { this._buf = []; return true; };
File.prototype.write = function (s) { this._buf.push(String(s)); return true; };
File.prototype.close = function () {
  // "BINARY" in ExtendScript means one character is one byte, which is what
  // latin1 does here.
  fs.writeFileSync(this.fsName, Buffer.from(this._buf.join(""), "latin1"));
  this._buf = null;
  return true;
};
File.prototype.read = function () { return fs.readFileSync(this.fsName, "latin1"); };

module.exports = { app, CompItem, Shape, PropertyType, PropertyValueType,
  KeyframeInterpolationType, MaskMode, Window, Panel, ScriptUI, $, EXPRS, Layer, Group,
  Prop, File, Folder, TEMP, NODES };
