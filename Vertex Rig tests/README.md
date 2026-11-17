# Vertex Rig tests

Runs `../Vertex Rig.jsx` headlessly, with no After Effects involved:

```
node "Vertex Rig tests/run-test.js"
```

Exits non-zero on any failure.

### How it works

`ae-mock.js` is a stand-in for the After Effects and ScriptUI object model —
comps, layers, property groups, shape/mask paths, effects, keyframes and enough
of a window stub for the panel to build itself. `run-test.js` reads the real
`.jsx`, appends one line exposing its internal functions, and runs it. Nothing
in the shipped script knows about the tests.

### What it checks

- **Source hygiene** — the file parses, is pure ASCII (After Effects reads
  `.jsx` as Latin-1), and uses no ES5+ syntax that ExtendScript would reject.
  Strings, comments and regex literals are blanked out before that scan, and the
  stripper has its own self-tests so it cannot rot into a no-op.
- **Behaviour** — scanning paths, creating point controls, handles as masks and
  as layers plus conversion between them, pivots, followers, average followers,
  parametric-to-bezier, extract, merge, deleting points / pivots / followers,
  and delete-with-bake.
- **Editing in the preview** - a point moved through a turned, unevenly scaled
  group; a rigged point moving its control rather than the path; a point held
  in a Pivot moving its place in that Pivot and nothing else; a handle written
  through its bind frame; alignment that leaves every tangent bit-identical;
  the transform box carrying curves round with their points; path keyframes
  scoped by the shape group chosen in the timeline, and revealed after;
  snapping measured in screen pixels; the lasso's even-odd test; and a whole
  drag driven through the canvas's own mouse events.
- **Generated expressions** — every expression the script writes into the
  project is parsed as JavaScript.

### Three things the mock gets deliberately right

- A **Layer Control** effect holds a live layer reference, not the index passed
  to `setValue`. Rigs depend on this to survive renaming and reordering, and an
  index-based mock makes them appear to attach to the wrong layer.
- Expressions **cannot** be evaluated, so `valueAtTime` throws on the scratch
  null the script probes with. That exercises the fallback maths rather than
  hiding it.
- A **Shape's arrays read back as copies**, exactly as they do in After
  Effects, so `sh.vertices[2] = p` is a silent no-op here too. With plain
  properties the mock was kinder than the host, and every path edit passed
  headlessly while moving nothing at all in After Effects.

### What it cannot tell you

Whether the generated expressions produce the right numbers inside After
Effects' own evaluator. Only After Effects can answer that.

### Actual After Effects integration checks

In AE, choose File > Scripts > Run Script File and open
`ae-integration-qa.jsx`. It loads the adjacent real Vertex Rig script, exposes
its internal actions in memory, and evaluates their results with AE's actual
expression engine. The panel-building boot call is replaced for this run;
the production file is not edited.

The runner creates a clearly named QA folder and separate compositions in the
open project. It does not save the project. Results are written to
`ae-results.txt` beside the runner. It checks numeric geometry, transforms,
handles, followers, masks, conversion, restructuring, baking, and preservation
edge cases. Some assertions express desired preservation behavior and currently
fail; see `QA report.txt` for the observed failures and reproduction steps.

The 2026-11-03 AE 26.5 run produced 63 passing assertions and 6 failures.
These are assertion counts, including expression-evaluation checks, rather
than counts of independent workflows. `qa-cleanup.jsx` is a narrowly scoped
cleanup helper for this recorded session, not a general cleanup command.

### Editing regression

Run `edit-regression.jsx` from AE's script runner. It is the other half of the
headless editing checks: the node harness cannot evaluate an expression, so for
a rigged point it can only confirm that the right thing was written. This runs
the expression. It checks a point dragged through a turned, unevenly scaled
group; a rigged point whose control moves while the path's own value is left
alone; a point held in a turned, scaled Pivot; a bound tangent and handles as
both masks and layers; alignment and the transform box; path keyframes; and the
two refusals (another tool's expression, and a group with Skew on it). It also
checks that selecting a shape group really does narrow Keyframe to that shape,
which only After Effects' own selection can answer. It removes its
compositions, restores the original, and writes `edit-results.txt`.

### Relink regression

Run `relink-regression.jsx` from AE's script runner. Relink's whole claim is
that the rig drives the right vertices again afterwards, and nothing headless
can answer that: the node mock never runs an expression, so it can only check
what went into the manifest. This runs it.

It adds a vertex in front of a rigged pair and checks the controls drag the
wrong points until Relink, then the right ones again with neither control
having moved; takes one away and walks the indices back; drags a rigged vertex
in the path's own value and checks the control comes to meet it so the edit
finally holds; does the added vertex again under a Pivot, which must not itself
move; carries a point's two handles across an index change; and confirms a rig
that is already right comes out of it drawing exactly what it drew.

Then the three repairs that are not about indices at all: a rig whose
expression was only **switched off** (which reads as unrigged everywhere else,
so Relink has to tell it from one that was never made); a rig whose expression
is **gone**, rebuilt from the `VXR L*` links still on the layer, with the
controls carried off their points first so the rebuild has to go by name; the
same rebuilt from control layers **picked in the timeline** once even the links
have been stripped; and another tool's expression, switched off, left exactly
as it was found. It removes its compositions, restores the original, and writes
`relink-results.txt`.

It also covers the two defects an adversarial review turned up, both of which
come from the same fact: **a `VXR L*` link effect records a control LAYER, and
nothing in it says which PATH that control serves.** On a layer carrying two
paths every link looks like it belongs to both, so a bare path beside a rigged
one could be built out of its neighbour's controls - silently, because the
expression drives whatever index it is given just as convincingly as the right
one. And `pruneLinks` asked `readManifest`, which answers null for a rig whose
expression is switched off, so clearing one path's rig deleted the other's
links outright.

Note on the before-state assertions in there: do **not** check that a stale rig
drives the wrong vertices by looking at the vertices it drives. The expression
pins whatever index it names straight to the control, so those always look
right - and a control nobody has moved is still standing on its own point, so
"is this vertex at a control?" answers yes either way. The two signals that do
work are a vertex nothing ever rigged being dragged onto a control, and the
vertex a control was given sitting somewhere else.

### Undo regression

Run `undo-regression.jsx` from AE's script runner. Every edit in the preview
should cost exactly one undo step and give back exactly what was there before,
including a rigged path whose expression is switched off for the single write
and back on after. Reveal should cost no step at all.

It is deliberately careful about how it undoes. The panel shares one undo stack
with whatever the user was doing before it ran, so the script records the state,
does the action, and **only undoes when the action actually changed something** -
and if one undo does not restore the state, it stops rather than guessing again.
Nothing here undoes speculatively or twice.

That care is the point: an undo group that changed nothing takes **no undo step
at all** in After Effects, so rolling back a failure that never got as far as
writing lands on the user's own last action. `run()` now only rolls back a
group that says it wrote something.

### Pivot scale and rotation regression

Run `pivot-regression.jsx` from AE's script runner. It checks the evaluated
vertices and both tangent vectors against independent affine-transform maths:
direct Pivot and point controls, rotated/nonuniform shape groups, 878.43% group
scale, mirrored scaling, partial selections, animated tangents, mask/layer
handles, conversion, Merge, and old-rig migration. It removes its temporary
compositions, restores the original comp, and writes `pivot-results.txt`.
The recorded AE 26.5 JavaScript-engine run has 139 passing assertions and
zero failures; the captured pre-fix source reproduces the tangent defects.

New rigs bind tangents when created. For an existing rig, reopen the updated
panel, put its Pivot in the intended rest pose (normally 100% scale and 0-degree
rotation), and click Refresh once. Refresh upgrades old Vertex Rig expressions
in one undo step, preserving the pose used for binding. Subsequent transforms
carry the tangents with their points. Existing keyframes are not replaced.
