# Matrix Plane Lab

Matrix Plane Lab is a static, responsive 2D linear algebra visualizer for exploring how editable `2x2` matrices transform user-created shapes on a Cartesian plane.

## Features

- Cartesian grid with x/y axes, zoom, pan, and fit-to-shape controls.
- Manual point entry with live polygon drawing and editable point list.
- Shape presets for square, rectangle, triangle, and pentagon.
- Editable matrix:

  ```text
  [ a  b ]
  [ c  d ]
  ```

- Matrix presets for identity, rotations, flips, scaling, and shearing.
- Original and transformed polygons rendered together with distinct colors.
- Transformed coordinate table.
- Keyboard-friendly controls and responsive layouts for desktop, tablet, and mobile.

## How The Transformation Works

Each point `(x, y)` is treated as a column vector. The matrix:

```text
[ a  b ]
[ c  d ]
```

is applied with:

```text
x' = ax + by
y' = cx + dy
```

The original polygon and transformed polygon are then plotted on the same coordinate plane for comparison.
