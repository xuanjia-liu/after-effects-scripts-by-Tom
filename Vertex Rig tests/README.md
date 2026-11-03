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
- **Generated expressions** — every expression the script writes into the
  project is parsed as JavaScript.

### Two things the mock gets deliberately right

- A **Layer Control** effect holds a live layer reference, not the index passed
  to `setValue`. Rigs depend on this to survive renaming and reordering, and an
  index-based mock makes them appear to attach to the wrong layer.
- Expressions **cannot** be evaluated, so `valueAtTime` throws on the scratch
  null the script probes with. That exercises the fallback maths rather than
  hiding it.

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
