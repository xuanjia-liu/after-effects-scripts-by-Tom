# Dynamic Layer Renamer tests

Headless tests for `../Dynamic Layer Renamer.jsx`.

```bash
node "Dynamic Layer Renamer tests/run-test.js"
```

Exits non-zero if anything fails. No After Effects needed.

## How it works

`ae-mock.js` stands in for the After Effects and ScriptUI object model. The real
`.jsx` is loaded with `new Function`, a small export hook is spliced in just
before `win.center()`, and the tests then call the script's own internals and
click its real widgets.

The mock mimics AE's *failures*, which is what gives it teeth:

- `.name` throws unless the property's parent is an indexed group
- `beginUndoGroup` / `endUndoGroup` calls are recorded with their nesting depth
- `confirm()` returns a scripted answer so scope prompts can be tested
- expression-driven Source Text is flagged so `setValue` guards can be tested

## Property types, verified against After Effects 2027

The mock uses AE's real constants, confirmed by probing a live project:

| constant | value |
|---|---|
| `PropertyType.PROPERTY` | 6212 |
| `PropertyType.NAMED_GROUP` | 6213 |
| `PropertyType.INDEXED_GROUP` | 6214 |

A property can be renamed exactly when its **parent** is an `INDEXED_GROUP`.
Confirmed against the real tree:

```
Contents           INDEXED            <- not renameable
  Group 1          NAMED   parent INDEXED   <- renameable
    Contents       INDEXED
      Path 1       NAMED   parent INDEXED   <- renameable
      Stroke 1     NAMED   parent INDEXED   <- renameable
    Transform      NAMED   parent NAMED     <- NOT renameable
      Position     PROPERTY parent NAMED    <- NOT renameable
Masks (parade)     INDEXED
  Mask 1           NAMED   parent INDEXED   <- renameable
Effects (parade)   INDEXED
  Effect 1         NAMED   parent INDEXED   <- renameable
    param          PROPERTY parent NAMED    <- NOT renameable
```

The mock's `shapeLayerWith()` helper mirrors that shape exactly. If you change
it, keep it faithful, or the tests will pass on a tree AE never produces.

## What is covered

84 checks across the behaviours that were fixed: scope guards (markers, masks,
shared sources), undo grouping, `$` in replacements, literal vs regex matching,
number-token padding and direction, the read-only renameable test, lifecycle
(polling stops on close), the preview control pool, source encoding, and
**preview-equals-apply parity** for layers, shape properties, project items and
markers.

Always confirm in After Effects afterwards: the mock is a model of AE, not AE.
