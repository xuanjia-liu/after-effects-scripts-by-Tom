// Stand-in for the After Effects / ScriptUI object model, enough to run
// "Dynamic Layer Renamer.jsx" headlessly and inspect what it does.
//
// It deliberately mimics AE's failures: .name throws unless the property's
// parent is an indexed group, setValue throws on expression-driven Source
// Text, and nested beginUndoGroup calls are recorded so tests can see them.

// Values verified against After Effects 2027
const PropertyType = { PROPERTY: 6212, NAMED_GROUP: 6213, INDEXED_GROUP: 6214 };

const LOG = { undo: [], alerts: [], confirms: [], tasks: [], cancelled: [] };
let CONFIRM_ANSWER = true;
function setConfirmAnswer(v) { CONFIRM_ANSWER = v; }

// ---------------------------------------------------------------- properties
class PropertyBase {
  constructor(name, propertyType) {
    this._name = name;
    this.propertyType = propertyType;
    this.parentProperty = null;
    this.selected = false;
    this.matchName = "ADBE " + name;
    this.enabled = true;
  }
  get name() { return this._name; }
  set name(v) {
    // AE only allows renaming a child of an indexed group
    const p = this.parentProperty;
    if (!p || p.propertyType !== PropertyType.INDEXED_GROUP) {
      throw new Error("Unable to set name on this property");
    }
    this._name = v;
  }
}

class Prop extends PropertyBase {
  constructor(name, value) {
    super(name, PropertyType.PROPERTY);
    this.value = value === undefined ? 0 : value;
    this.expression = "";
    this.expressionEnabled = false;
    this.canSetExpression = true;
    this.numKeys = 0;
    this.numProperties = 0;
  }
  property() { return null; }
}

class Group extends PropertyBase {
  constructor(name, propertyType) {
    super(name, propertyType || PropertyType.INDEXED_GROUP);
    this._kids = [];
    this.canSetExpression = false;
    this.expression = "";
  }
  get numProperties() { return this._kids.length; }
  property(k) {
    if (typeof k === "number") return this._kids[k - 1] || null;
    for (const c of this._kids) if (c.name === k) return c;
    return null;
  }
  add(child) { child.parentProperty = this; this._kids.push(child); return child; }
}

// ------------------------------------------------------------------- markers
class MarkerValue {
  constructor(comment, duration) { this.comment = comment; this.duration = duration || 0; }
}
class MarkerProperty {
  constructor() { this._keys = []; }
  get numKeys() { return this._keys.length; }
  keyValue(i) { const k = this._keys[i - 1]; return new MarkerValue(k.comment, k.duration); }
  keyTime(i) { return this._keys[i - 1].time; }
  setValueAtKey(i, mv) { this._keys[i - 1].comment = mv.comment; this._keys[i - 1].duration = mv.duration; }
  addKey(comment, time, duration) { this._keys.push({ comment, time: time || 0, duration: duration || 0 }); return this; }
}

// -------------------------------------------------------------------- layers
class Layer {
  constructor(name, comp) {
    this.name = name;
    this.comp = comp;
    this.selected = false;
    this.shy = false;
    this.parent = null;
    this.adjustmentLayer = false;
    this.inPoint = 0;
    this.outPoint = 5;
    this.index = 0;
    this.trackMatteType = 0;
    this.trackMatteLayer = null;
    this.propertyType = PropertyType.NAMED_GROUP;
    this.parentProperty = null;
    this.marker = new MarkerProperty();
    this._groups = {};
    this._order = [];
    this.source = null;
  }
  get numProperties() { return this._order.length; }
  property(k) {
    if (typeof k === "number") return this._groups[this._order[k - 1]] || null;
    return this._groups[k] || null;
  }
  addGroup(name, type) {
    const g = new Group(name, type || PropertyType.INDEXED_GROUP);
    g.parentProperty = null;           // a layer's top groups are not renameable
    this._groups[name] = g;
    this._order.push(name);
    return g;
  }
}
class AVLayer extends Layer {}
class TextLayer extends AVLayer {
  constructor(name, comp, text) {
    super(name, comp);
    const g = this.addGroup("Text", PropertyType.NAMED_GROUP);
    const st = new Prop("Source Text", new TextDocument(text || "hello"));
    g.add(st);
    this._groups["Source Text"] = st;
    this._order.push("Source Text");
  }
}
class ShapeLayer extends AVLayer {}
class CameraLayer extends Layer {}
class LightLayer extends Layer {}

class TextDocument {
  constructor(text) { this.text = text; this.font = "Helvetica"; this.fontSize = 36; this.fillColor = [1, 0, 0]; }
}

// --------------------------------------------------------------------- items
class Item {
  constructor(name) { this.name = name; this.selected = false; this.id = Item._id = (Item._id || 0) + 1; }
}
class FootageItem extends Item {
  constructor(name) { super(name); this.mainSource = null; this.usedIn = []; this.width = 100; this.height = 100; }
}
class SolidSource {}
class FileSource { constructor(n) { this.file = { name: n || "clip.mov" }; } }

class CompItem extends Item {
  constructor(name, w, h, dur, fps) {
    super(name);
    this.width = w || 1920; this.height = h || 1080;
    this.duration = dur || 10; this.frameRate = fps || 25;
    this._layers = [];
    this.markerProperty = new MarkerProperty();
    this.usedIn = [];
  }
  get numLayers() { return this._layers.length; }
  layer(i) { return this._layers[i - 1]; }
  get selectedLayers() { return this._layers.filter(l => l.selected); }
  addLayer(l) { this._layers.push(l); l.index = this._layers.length; l.comp = this; return l; }
}

// ----------------------------------------------------------------------- app
const app = {
  version: "27.0",
  project: { activeItem: null, selection: [], numItems: 0, dirty: false },
  _undoDepth: 0,
  beginUndoGroup(name) { app._undoDepth++; LOG.undo.push({ op: "begin", name, depth: app._undoDepth }); },
  endUndoGroup() { LOG.undo.push({ op: "end", depth: app._undoDepth }); app._undoDepth--; },
  scheduleTask(fn, ms) { const id = LOG.tasks.length + 1; LOG.tasks.push({ id, fn, ms }); return id; },
  cancelTask(id) { LOG.cancelled.push(id); },
  activeViewer: null
};
const ViewerType = { VIEWER_EFFECT: 1, VIEWER_COMPOSITION: 2 };

function alert(msg) { LOG.alerts.push(String(msg)); }
function confirm(msg) { LOG.confirms.push(String(msg)); return CONFIRM_ANSWER; }

// -------------------------------------------------------------------- script
const $ = { writeln() {}, engineName: "main", version: "4.5.6" };
function File() { this.open = () => true; this.write = () => true; this.close = () => true; }
function Folder() {}

// ------------------------------------------------------------------ ScriptUI
const ALL = [];
function uiNode(type, text) {
  const n = {
    type, text: text === undefined ? "" : text, children: [], items: [],
    value: false, enabled: true, visible: true, justify: "left", characters: 0,
    preferredSize: { width: 0, height: 0 }, minimumSize: [0, 0], maximumSize: [0, 0],
    alignment: null, alignChildren: null, orientation: null, spacing: 0, margins: 0,
    textSelection: [0, 0], active: false, helpTip: "",
    graphics: { font: { name: "x", style: 0, size: 12 }, measureString: s => [String(s).length * 6, 12] },
    layout: { layout() {}, resize() {} },
    add(t, bounds, label, opts) {
      const c = uiNode(t, typeof label === "string" ? label : "");
      c.opts = opts || {};
      if (t === "dropdownlist" && Array.isArray(label)) {
        label.forEach(s => c.items.push({ text: s, index: c.items.length }));
      }
      this.children.push(c); ALL.push(c);
      return c;
    },
    remove(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); },
    removeAll() { this.items = []; this._sel = null; },
    addEventListener() {}, notify(ev) { if (this[ev]) this[ev](); },
    center() {}, show() { this.shown = true; }, close() { if (this.onClose) this.onClose(); this.shown = false; },
    update() {}, hide() {}
  };
  Object.defineProperty(n, "selection", {
    get() { return this._sel === null || this._sel === undefined ? null : this.items[this._sel]; },
    set(v) {
      if (v === null) { this._sel = null; return; }
      this._sel = (typeof v === "number") ? v : this.items.indexOf(v);
    },
    configurable: true
  });
  n._sel = null;
  Object.defineProperty(n, "add_item", { value: (t, s) => n.items.push({ text: s, index: n.items.length }) });
  const origAdd = n.add;
  n.add = function (t, bounds, label, opts) {
    if (t === "item") { this.items.push({ text: bounds === undefined ? label : (typeof bounds === "string" ? bounds : label), index: this.items.length }); return this.items[this.items.length - 1]; }
    return origAdd.call(this, t, bounds, label, opts);
  };
  return n;
}
function Window(kind, title) { const w = uiNode("window", title); w.kind = kind; ALL.push(w); return w; }
Window.prototype = {};
function Panel() {}
const ScriptUI = { newFont: (n, s, sz) => ({ name: n, style: s, size: sz }) };

module.exports = {
  PropertyType, PropertyBase, Prop, Group, MarkerValue, MarkerProperty,
  Layer, AVLayer, TextLayer, ShapeLayer, CameraLayer, LightLayer, TextDocument,
  Item, CompItem, FootageItem, SolidSource, FileSource,
  app, ViewerType, alert, confirm, $, File, Folder, Window, Panel, ScriptUI,
  LOG, ALL, setConfirmAnswer
};
