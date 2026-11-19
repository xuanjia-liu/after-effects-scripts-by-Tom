// Which mouse buttons does After Effects hand to a ScriptUI canvas?
//
// Run it, then over the grey box: left-drag, right-drag, and middle-drag if
// your mouse has one. Each press, move and release is counted by the button
// it reports. Nothing here changes a project.
(function () {
    var LOG = "/private/tmp/claude-501/-Users-xuanjialiu--claude-spares-spare-Kgo9x4/19657aa2-78e3-44cc-baaa-f3d747745d76/scratchpad/button-probe.log";
    var seen = {}, order = [], lines = [], held = null, moves = 0;

    function bump(tag) {
        if (!seen[tag]) { seen[tag] = 0; order.push(tag); }
        seen[tag]++;
    }

    function note(type, ev) {
        var b;
        try { b = ev.button; } catch (e) { b = "threw"; }
        if (b === undefined) { b = "undefined"; }
        if (type === "mousedown") { held = b; moves = 0; }
        if (type === "mousemove" && held !== null) { moves++; }
        if (type === "mouseup") {
            bump("drag that began on button " + held + ": " + moves + " moves");
            held = null;
        }
        if (type !== "mousemove") {
            bump(type + " button=" + b);
            lines.push(type + " button=" + b +
                       " detail=" + ev.detail +
                       " x=" + ev.clientX + " y=" + ev.clientY +
                       " ctrl=" + ev.ctrlKey + " alt=" + ev.altKey);
            flush();
        }
        show();
    }

    function flush() {
        try { var f = new File(LOG); f.open("w"); f.write(lines.join("\r\n")); f.close(); }
        catch (e) {}
    }

    var win = new Window("palette", "Button probe", undefined, { resizeable: true });
    win.alignChildren = ["fill", "top"];
    win.margins = 10;
    win.spacing = 6;
    win.add("statictext", undefined, "Over the grey box: left-drag, then right-drag.");

    var box = win.add("group");
    box.minimumSize = [320, 160];
    box.alignment = ["fill", "fill"];
    box.onDraw = function () {
        var g = this.graphics;
        var br = g.newBrush(g.BrushType.SOLID_COLOR, [0.22, 0.22, 0.24, 1]);
        g.newPath(); g.rectPath(0, 0, this.size.width, this.size.height); g.fillPath(br);
    };

    var out = win.add("statictext", undefined, "", { multiline: true });
    out.preferredSize = [360, 170];
    var bClose = win.add("button", undefined, "Close");
    bClose.onClick = function () { flush(); win.close(); };

    function show() {
        var s = [];
        for (var i = 0; i < order.length; i++) { s.push(order[i] + ": " + seen[order[i]]); }
        out.text = s.length ? s.join("\n") : "nothing yet";
        try { win.layout.layout(true); } catch (e) {}
    }

    var types = ["mousedown", "mouseup", "mousemove", "click", "contextmenu"];
    for (var i = 0; i < types.length; i++) {
        (function (t) {
            try { box.addEventListener(t, function (ev) { note(t, ev); }); } catch (e1) {}
        })(types[i]);
    }

    show();
    win.center();
    win.show();
})();
