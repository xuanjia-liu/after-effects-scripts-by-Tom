# Vertex Rig icons

The panel's fifteen button icons are **vector paths the script strokes itself**,
not image files. ScriptUI will not scale a bitmap for a retina display, so a
28px PNG arrives upscaled and soft; drawn paths stay sharp at any density, and
there are no temp files or base64 to go wrong.

`mkicons.py` is the source of truth. Each icon records drawing operations which
are both rendered here for review and written out as the literal the panel
reads.

```
python3 "Vertex Rig icons/mkicons.py"
```

It writes `sheet.png`, a contact sheet on the panel's own dark background at
the size the icons are actually drawn, and `icon-art.jsxinc`, the `ICON_ART`
block to paste into `Vertex Rig.jsx`.

The preview deliberately uses butt caps and no joint smoothing, because that is
what ScriptUI's own drawing does. It is meant to match the panel rather than to
flatter it.

## The op format

| Op | Meaning |
|---|---|
| `["p", width, [x,y, ...]]` | polyline |
| `["b", width, [8 numbers]]` | cubic bezier |
| `["x", width, x0,y0,x1,y1]` | rectangle by corners |
| `["c" / "r" / "d", width, cx,cy,r]` | circle, square, diamond |

Coordinates live in a 28-unit box. A width of `0` means filled rather than
stroked. Keys are quoted: ExtendScript is ES3, where a bare `delete:` is a
syntax error.

The harness checks that every op has a shape the drawing code knows, that the
coordinates stay inside the box, that drawing each icon runs clean, and that
every button names an icon that exists with none left unused.
