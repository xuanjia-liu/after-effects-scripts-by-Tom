// Does After Effects dispatch a wheel or a pinch into the ScriptUI tree?
//
// Run it, then scroll, two-finger scroll, command-scroll and pinch over the
// grey box. Every event the panel is given is counted on screen and written
// to the log named at the foot of the window. Nothing here changes a project.
//
// The box is a group with an onDraw, which is exactly what Vertex Rig's
// preview is. The scrollbar underneath is the control a wheel is known to
// reach, and it is there to prove the gesture is arriving at After Effects
// at all.
(function () {
    var LOG = Folder.temp.fsName + "/vxr-wheel-probe.log";
    var seen = {}, order = [], lines = [];

    function note(where, type, ev) {
        var tag = where + " " + type;
        if (!seen[tag]) { seen[tag] = 0; order.push(tag); }
        seen[tag]++;
        var bits = [tag, "#" + seen[tag]];
        var names = ["wheelDelta", "detail", "deltaX", "deltaY", "deltaMode",
                     "clientX", "clientY", "screenX", "screenY", "eventPhase",
                     "ctrlKey", "metaKey", "altKey", "shiftKey", "button"];
        for (var i = 0; i < names.length; i++) {
            var v;
            try { v = ev[names[i]]; } catch (e) { v = "?"; }
            if (v !== undefined && v !== null) { bits.push(names[i] + "=" + v); }
        }
        lines.push(bits.join(" "));
        show();
        flush();
    }

    function flush() {
        try {
            var f = new File(LOG);
            f.open("w"); f.write(lines.join("\n")); f.close();
        } catch (e) {}
    }

    var win = new Window("palette", "Wheel probe", undefined, { resizeable: true });
    win.alignChildren = ["fill", "top"];
    win.margins = 10;
    win.spacing = 6;

    win.add("statictext", undefined,
            "Scroll, command-scroll and pinch over the grey box.");

    var box = win.add("group");
    box.minimumSize = [320, 180];
    box.alignment = ["fill", "fill"];
    box.onDraw = function () {
        var g = this.graphics;
        var b = g.newBrush(g.BrushType.SOLID_COLOR, [0.22, 0.22, 0.24, 1]);
        g.newPath(); g.rectPath(0, 0, this.size.width, this.size.height); g.fillPath(b);
        var p = g.newPen(g.PenType.SOLID_COLOR, [0.6, 0.6, 0.65, 1], 1);
        g.newPath(); g.rectPath(0.5, 0.5, this.size.width - 1, this.size.height - 1);
        g.strokePath(p);
    };

    var bar = win.add("scrollbar", undefined, 50, 0, 100);
    bar.preferredSize = [300, 14];
    bar.helpTip = "The control a wheel is known to reach, for comparison.";

    var out = win.add("statictext", undefined, "", { multiline: true });
    out.preferredSize = [340, 150];

    var pathTxt = win.add("statictext", undefined, LOG);
    var bClose = win.add("button", undefined, "Close");
    bClose.onClick = function () { flush(); win.close(); };

    function show() {
        var s = [];
        for (var i = 0; i < order.length; i++) { s.push(order[i] + ": " + seen[order[i]]); }
        out.text = s.length ? s.join("\n") : "nothing yet";
        try { win.layout.layout(true); } catch (e) {}
    }

    // Every spelling a host might use, at the window on the way down and at
    // the box itself. If the window's capture listener stays silent too, the
    // gesture is never put into the ScriptUI tree at all.
    var types = ["mousewheel", "wheel", "DOMMouseScroll", "mousemove",
                 "mousedown", "magnify", "gesturechange"];
    for (var i = 0; i < types.length; i++) {
        (function (t) {
            try {
                win.addEventListener(t, function (ev) { note("window-capture", t, ev); }, true);
            } catch (e1) {}
            try {
                box.addEventListener(t, function (ev) { note("box", t, ev); });
            } catch (e2) {}
        })(types[i]);
    }

    bar.onChanging = function () { note("scrollbar", "onChanging", { detail: bar.value }); };

    show();
    win.center();
    win.show();
})();
