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

118 checks across the behaviours that were fixed, and the Translate table,: scope guards (markers, masks,
shared sources), undo grouping, `$` in replacements, literal vs regex matching,
number-token padding and direction, the read-only renameable test, lifecycle
(polling stops on close), the preview control pool, source encoding, and
**preview-equals-apply parity** for layers, shape properties, project items and
markers.

## Translate: the term table

`TRANSLATION_TERMS` in the script is written as `\u` escapes so the `.jsx`
stays pure ASCII. This is the same table in readable form - keep the two in
step if you add a term.

Matching is **longest term first**, so a compound name wins over the parts
inside it (`グラデーションの塗り` must beat `塗り`). `translateName` tries the whole name first,
then falls back to swapping any known term found inside a name you have
customised. A trailing index is preserved, so `グループ 1` becomes `Group 1`.
A name it does not recognise returns `null` and is left untouched, which is
what makes the button safe to press twice.

### Japanese

| term | English |
|---|---|
| グループ | Group |
| コンテンツ | Contents |
| 長方形パス | Rectangle Path |
| 長方形 | Rectangle |
| 楕円形パス | Ellipse Path |
| 楕円 | Ellipse |
| 多角形パス | Polystar Path |
| 多角形 | Polystar |
| パスの結合 | Merge Paths |
| パスのトリミング | Trim Paths |
| オフセットパス | Offset Paths |
| パス | Path |
| グラデーションの塗り | Gradient Fill |
| グラデーションの線 | Gradient Stroke |
| 塗りの規則 | Fill Rule |
| 塗り | Fill |
| 線幅 | Stroke Width |
| 線の結合 | Line Join |
| 線端 | Line Cap |
| 線 | Stroke |
| マイター制限 | Miter Limit |
| パンク・膨張 | Pucker & Bloat |
| リピーター | Repeater |
| 角を丸くする | Round Corners |
| ウィグルパス | Wiggle Paths |
| ウィグルトランスフォーム | Wiggle Transform |
| ジグザグ | Zig Zag |
| ツイスト | Twist |
| トランスフォーム | Transform |
| マスク | Mask |
| エフェクト | Effects |
| マーカー | Marker |
| ソーステキスト | Source Text |
| テキスト | Text |
| マテリアルオプション | Material Options |
| アンカーポイント | Anchor Point |
| 位置 | Position |
| スケール | Scale |
| 回転 | Rotation |
| 不透明度 | Opacity |
| 傾斜軸 | Skew Axis |
| 傾斜 | Skew |
| カラー | Color |
| 描画モード | Blend Mode |
| 合成 | Composite |
| サイズ | Size |
| 丸み | Roundness |
| 頂点の数 | Points |
| 内半径 | Inner Radius |
| 外半径 | Outer Radius |
| 開始点 | Start Point |
| 終了点 | End Point |
| コピー数 | Copies |
| オフセット | Offset |
| 種類 | Type |
| 方向 | Direction |

### Chinese (Simplified)

| term | English |
|---|---|
| 组 | Group |
| 内容 | Contents |
| 矩形路径 | Rectangle Path |
| 矩形 | Rectangle |
| 椭圆路径 | Ellipse Path |
| 椭圆 | Ellipse |
| 多边星形路径 | Polystar Path |
| 多边星形 | Polystar |
| 合并路径 | Merge Paths |
| 修剪路径 | Trim Paths |
| 位移路径 | Offset Paths |
| 图形方向 | Shape Direction |
| 路径 | Path |
| 渐变填充 | Gradient Fill |
| 渐变描边 | Gradient Stroke |
| 填充规则 | Fill Rule |
| 填充 | Fill |
| 描边宽度 | Stroke Width |
| 描边 | Stroke |
| 线段端点 | Line Cap |
| 线段连接 | Line Join |
| 尖角限制 | Miter Limit |
| 收缩和膨胀 | Pucker & Bloat |
| 中继器 | Repeater |
| 圆角 | Round Corners |
| 摆动路径 | Wiggle Paths |
| 摆动变换 | Wiggle Transform |
| 锯齿 | Zig Zag |
| 扭转 | Twist |
| 变换 | Transform |
| 蒙版 | Mask |
| 效果 | Effects |
| 标记 | Marker |
| 源文本 | Source Text |
| 文本 | Text |
| 材质选项 | Material Options |
| 锚点 | Anchor Point |
| 位置 | Position |
| 缩放 | Scale |
| 旋转 | Rotation |
| 不透明度 | Opacity |
| 倾斜轴 | Skew Axis |
| 倾斜 | Skew |
| 颜色 | Color |
| 混合模式 | Blend Mode |
| 合成 | Composite |
| 大小 | Size |
| 圆度 | Roundness |
| 内径 | Inner Radius |
| 外径 | Outer Radius |
| 起始点 | Start Point |
| 结束点 | End Point |
| 副本 | Copies |
| 偏移 | Offset |
| 类型 | Type |
| 方向 | Direction |
| 点 | Points |

### Chinese (Traditional)

| term | English |
|---|---|
| 群組 | Group |
| 內容 | Contents |
| 路徑 | Path |
| 填滿 | Fill |
| 筆畫 | Stroke |
| 漸層填滿 | Gradient Fill |
| 漸層筆畫 | Gradient Stroke |
| 遮色片 | Mask |
| 變形 | Transform |
| 錯點 | Anchor Point |
| 縮放 | Scale |
| 旋轉 | Rotation |
| 顏色 | Color |
| 橢圓 | Ellipse |

Always confirm in After Effects afterwards: the mock is a model of AE, not AE.
