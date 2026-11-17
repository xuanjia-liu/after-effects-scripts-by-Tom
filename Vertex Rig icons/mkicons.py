# The chosen set: Grid throughout, Solid for Create and Handles.
#
# Grid is one weight on a four unit grid, right angles and forty-fives.
# Solid is a filled body with the detail knocked back out of it, which is
# why those two carry a -1 alpha op: the panel paints that in the button's
# own fill so it stays right when the button lightens under the pointer.
import math, json, os

U = 28.0
W = 2.2                      # the grid weight, used by everything but the two solids
HERE = os.path.dirname(os.path.abspath(__file__))

def arc(cx, cy, r, a0, a1, step=6):
    out, a = [], a0
    while (a <= a1 if a1 > a0 else a >= a1):
        out.append((cx + math.cos(math.radians(a)) * r, cy + math.sin(math.radians(a)) * r))
        a += step if a1 > a0 else -step
    return out

class I(object):
    def __init__(self): self.ops = []
    def knock(self, on): self.ops.append(["A", -1 if on else 1])
    def p(self, pts, w=W): self.ops.append(["p", round(w,2), [round(c,1) for xy in pts for c in xy]])
    def b(self, p0,p1,p2,p3,w=W): self.ops.append(["b", round(w,2), [round(c,1) for q in (p0,p1,p2,p3) for c in q]])
    def c(self, x,y,r,w=W): self.ops.append(["c", round(w,2), round(x,1), round(y,1), round(r,1)])
    def s(self, x,y,r,w=W): self.ops.append(["r", round(w,2), round(x,1), round(y,1), round(r,1)])
    def d(self, x,y,r,w=W): self.ops.append(["d", round(w,2), round(x,1), round(y,1), round(r,1)])
    def box(self, x0,y0,x1,y1,w=W): self.ops.append(["x", round(w,2), round(x0,1), round(y0,1), round(x1,1), round(y1,1)])
    def chev(self, x, y, dx, h=4.0, w=W):
        self.p([(x-dx, y-h), (x, y), (x-dx, y+h)], w)

GRID4 = ((9,9),(19,9),(9,19),(19,19))
CROSS = (((14,2.5),(14,7)), ((14,21),(14,25.5)), ((2.5,14),(7,14)), ((21,14),(25.5,14)))

def target(i, ring=5.0, core=1.6):
    i.c(14,14, ring, W)
    i.c(14,14, core, 0)
    for a, b_ in CROSS: i.p([a, b_])

# ---- the two solids ------------------------------------------------------
def create(i):
    i.b((4,20),(10,9),(18,21),(24,10), 2.4)
    i.c(14,15.2, 5.2, 0)
def handles(i):
    i.p([(5,19),(23,9)], 2.0)
    i.c(5,19, 3.4, 0); i.c(23,9, 3.4, 0); i.s(14,14, 4.6, 0)

# ---- grid ----------------------------------------------------------------
def delete(i):
    i.box(6,6,22,22); i.p([(10,10),(18,18)]); i.p([(18,10),(10,18)])
def pivot(i):
    target(i)
def follower(i):
    i.p([(4,14),(24,14)], W*0.8); i.c(10,14, 3.4, 0); i.chev(23,14,4)
def merge(i):
    i.p([(14,5),(14,23)])
    i.p([(3,14),(9,14)]); i.chev(10,14,4)
    i.p([(25,14),(19,14)]); i.p([(22,10),(18,14),(22,18)])
def allpts(i):
    for (x,y) in GRID4: i.s(x,y, 3.6, 0)
def nonepts(i):
    for (x,y) in GRID4: i.s(x,y, 3.6, W*0.9)
def invert(i):
    for n,(x,y) in enumerate(GRID4): i.s(x,y, 3.6, 0 if n in (0,3) else W*0.9)
# The two ends of the zoom strip: one step out, one step in. Chevrons rather
# than a minus and a plus, because what they do is move along the strip.
def zoomout(i):
    i.chev(10, 14, -7, 6)
def zoomin(i):
    i.chev(18, 14, 7, 6)
def bake(i):
    i.p([(3,14),(25,14)], W*0.8)
    for x in (6.5,14,21.5): i.d(x,14, 3.6, 0)
def apply(i):
    i.p([(4,9),(20,9)]); i.chev(20,9,4)
    i.p([(24,19),(8,19)]); i.p([(12,15),(8,19),(12,23)])
def addpivot(i):
    i.c(12,12, 4.4, W); i.c(12,12, 1.5, 0)
    for a,b_ in (((12,2.5),(12,6)),((2.5,12),(6,12)),((18,12),(21.5,12)),((12,18),(12,21.5))):
        i.p([a,b_])
    i.p([(22,18),(22,26)]); i.p([(18,22),(26,22)])
def release(i):
    i.c(11,15, 4.4, W); i.c(11,15, 1.5, 0)
    for a,b_ in (((11,5.5),(11,9)),((1.5,15),(5,15)),((11,21),(11,24.5)),((17,15),(20.5,15))):
        i.p([a,b_])
    i.p([(19,10),(25,4)]); i.p([(20.5,4),(25,4),(25,8.5)])
def average(i):
    pts = [(7,8),(21,8),(14,22)]
    for p_ in pts: i.p([(14,13.5), p_], W*0.6)
    for p_ in pts: i.s(p_[0], p_[1], 2.8, W*0.9)
    i.s(14,13.5, 3.2, 0)
# The mirror of merge: one bar, arrows leaving it instead of meeting at it.
def extract(i):
    i.p([(14,5),(14,23)])
    i.p([(10,14),(4,14)]); i.p([(7,10),(3,14),(7,18)])
    i.p([(18,14),(24,14)]); i.chev(25,14,4)
# A path with its vertices showing, which is what the button turns on.
def points(i):
    i.b((3,19),(10,22),(18,6),(25,9), W*0.75)
    for (x, y) in ((3,19), (14,14), (25,9)):
        i.s(x, y, 2.9, W*0.9)

def prefs(i):
    for y,kx in ((8,18),(14,10),(20,21)):
        i.p([(4,y),(24,y)], W*0.7)
        i.s(kx,y, 2.9, 0)


# ---- the preview's own editing row ---------------------------------------
# A bar is a thick polyline rather than a filled box: the panel's "x" op only
# ever strokes, and an icon has to draw the same here as it does there.
BAR = 3.6

def marquee(i):
    i.box(4,7,24,21, W*0.8)
    for (x,y) in ((9,12),(15,17),(20,11)): i.s(x,y, 2.4, 0)
def lasso(i):
    i.b((14,5),(24,5),(24,19),(14,19), W*0.9)
    i.b((14,19),(5,19),(5,5),(14,5), W*0.9)
    i.p([(11.5,18.2),(9,25)], W*0.9)
def snap(i):
    i.p([(14,2.5),(14,25.5)], W*0.7)
    i.s(14,9, 3.2, 0); i.s(14,19, 3.2, 0)
    i.s(23,14, 3.0, W*0.9)
    i.chev(17,14,-4,3)
def boundbox(i):
    i.box(7,7,21,21, W*0.8)
    for (x,y) in ((7,7),(21,7),(7,21),(21,21)): i.s(x,y, 2.6, 0)

def _rule(i, a, b_): i.p([a,b_], W*0.8)
def alignleft(i):
    _rule(i, (4,3), (4,25))
    i.p([(4,10),(22,10)], BAR); i.p([(4,18),(16,18)], BAR)
def aligncx(i):
    _rule(i, (14,3), (14,25))
    i.p([(5,10),(23,10)], BAR); i.p([(8,18),(20,18)], BAR)
def alignright(i):
    _rule(i, (24,3), (24,25))
    i.p([(6,10),(24,10)], BAR); i.p([(12,18),(24,18)], BAR)
def aligntop(i):
    _rule(i, (3,4), (25,4))
    i.p([(10,4),(10,22)], BAR); i.p([(18,4),(18,16)], BAR)
def aligncy(i):
    _rule(i, (3,14), (25,14))
    i.p([(10,5),(10,23)], BAR); i.p([(18,8),(18,20)], BAR)
def alignbottom(i):
    _rule(i, (3,24), (25,24))
    i.p([(10,6),(10,24)], BAR); i.p([(18,12),(18,24)], BAR)

def helpmark(i):
    i.c(14,14, 10.5, W*0.8)
    i.b((10,10.5),(10.5,6.3),(18.2,6.6),(17.6,11.0), W*0.9)
    i.p([(17.6,11.0),(14,13.6),(14,16.4)], W*0.9)
    i.c(14,20.4, 1.5, 0)

def keypath(i):
    i.b((2.5,16),(8,17),(14,8),(20,8.5), W*0.75)
    i.d(11.1,12.4, 3.1, 0)
    i.p([(20,19),(20,27)]); i.p([(16,23),(24,23)])

def reveal(i):
    # a twirl-down, open, and the rows it opened - the middle one the point
    i.p([(3.5,8.5),(11,8.5),(7.2,14.5),(3.5,8.5)], W*0.9)
    i.p([(14.5,8.5),(25,8.5)], W*0.9)
    i.p([(14.5,15),(25,15)], BAR)
    i.p([(14.5,21.5),(21.5,21.5)], W*0.9)

# A control that has come away from the point it was given, going back on.
# The hollow square is the vertex waiting on the path; the solid one is the
# control adrift above it.
def relink(i):
    i.b((3,20),(10,23),(18,7),(25,10), W*0.75)
    i.s(14,15, 2.9, W*0.9)
    i.s(14,3.8, 2.6, 0)
    i.p([(11.4,8.2),(14,11.2),(16.6,8.2)], W*0.9)

ORDER = [("create",create),("handles",handles),("delete",delete),("bake",bake),
         ("apply",apply),("pivot",pivot),("addpivot",addpivot),("release",release),
         ("follower",follower),("average",average),("extract",extract),("merge",merge),
         ("prefs",prefs),("points",points),
         ("all",allpts),("none",nonepts),("invert",invert),
         ("zoomout",zoomout),("zoomin",zoomin),
         ("marquee",marquee),("lasso",lasso),("snap",snap),("box",boundbox),
         ("alignleft",alignleft),("aligncx",aligncx),("alignright",alignright),
         ("aligntop",aligntop),("aligncy",aligncy),("alignbottom",alignbottom),
         ("help",helpmark),("key",keypath),("reveal",reveal),
         ("relink",relink)]

art = {}
for name, fn in ORDER:
    ic = I(); fn(ic); art[name] = ic.ops
json.dump(art, open(os.path.join(HERE, "icon-art.json"), "w"))

# ---- contact sheet, on the panel's own background, at the size they are drawn
from PIL import Image, ImageDraw
S, BTN = 6, (49, 49, 49, 255)

def _bez(p0, p1, p2, p3, t):
    u = 1 - t
    return (u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
            u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1])

def render(ops, px):
    im = Image.new("RGBA", (int(px*S), int(px*S)), (0, 0, 0, 0))
    dr = ImageDraw.Draw(im)
    k, a = px*S/U, 1.0
    def pw(w): return max(1, int(round(w*k)))
    for op in ops:
        if op[0] == "A":
            a = "K" if op[1] == -1 else op[1]
            continue
        w = op[1]
        c = BTN if a == "K" else (210, 210, 210, 255)
        if op[0] == "p":
            dr.line([(op[2][n]*k, op[2][n+1]*k) for n in range(0, len(op[2]), 2)],
                    fill=c, width=pw(w))
        elif op[0] == "b":
            v = op[2]
            pts = [_bez((v[0],v[1]), (v[2],v[3]), (v[4],v[5]), (v[6],v[7]), n/28.0)
                   for n in range(29)]
            dr.line([(x*k, y*k) for x, y in pts], fill=c, width=pw(w))
        elif op[0] == "x":
            dr.rectangle([op[2]*k, op[3]*k, op[4]*k, op[5]*k],
                         fill=c if w == 0 else None,
                         outline=None if w == 0 else c, width=pw(w))
        else:
            cx, cy, r = op[2]*k, op[3]*k, op[4]*k
            box = [cx-r, cy-r, cx+r, cy+r]
            if op[0] == "c":
                dr.ellipse(box, fill=c) if w == 0 else dr.ellipse(box, outline=c, width=pw(w))
            elif op[0] == "r":
                dr.rectangle(box, fill=c) if w == 0 else dr.rectangle(box, outline=c, width=pw(w))
            else:
                poly = [(cx, cy-r), (cx+r, cy), (cx, cy+r), (cx-r, cy)]
                dr.polygon(poly, fill=c) if w == 0 else dr.polygon(poly, outline=c, width=pw(w))
    return im.resize((px, px), Image.LANCZOS)

cols, cell, pad = 7, 72, 12
rows = (len(ORDER) + cols - 1) // cols
sheet = Image.new("RGB", (cols*(cell+pad)+pad, rows*(cell+pad)+pad+14), (30, 30, 30))
dr = ImageDraw.Draw(sheet)
for n, (name, _) in enumerate(ORDER):
    x = pad + (n % cols)*(cell+pad)
    y = pad + 14 + (n // cols)*(cell+pad)
    dr.rounded_rectangle([x-5, y-5, x+cell+5, y+cell+5], radius=9,
                         fill=BTN[:3], outline=(66, 66, 66), width=2)
    im = render(art[name], cell)
    sheet.paste(im, (x, y), im)
    dr.text((x, y-16), name[:9], fill=(140, 140, 140))
sheet.save(os.path.join(HERE, "sheet.png"))

def lit(ops):
    parts = []
    for op in ops:
        if op[0] in ("p","b"):
            parts.append('["%s",%s,[%s]]' % (op[0], op[1], ",".join(str(v) for v in op[2])))
        else:
            parts.append('["%s",%s]' % (op[0], ",".join(str(v) for v in op[1:])))
    return "[" + ",".join(parts) + "]"

lines = ['        "%s": %s' % (n, lit(art[n])) for n, _ in ORDER]
open(os.path.join(HERE, "icon-art.jsxinc"), "w").write(
    "    var ICON_ART = {\n" + ",\n".join(lines) + "\n    };\n")
print("icons:", len(art), " literal bytes:", sum(len(l) for l in lines))
