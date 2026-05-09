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

## Run Locally

Because this app uses plain HTML, CSS, and JavaScript, you can open `index.html` directly in a browser.

For a local server, run one of these from the project folder:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Build

No build step is required. The deployable files are:

- `index.html`
- `styles.css`
- `app.js`

## Deploy To GitHub Pages

1. Commit this project to a GitHub repository.
2. In GitHub, open the repository settings.
3. Go to **Pages**.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
5. Choose the branch that contains these files, usually `main`.
6. Choose the root folder `/`.
7. Save. GitHub Pages will publish the static site.

If the app is inside a subfolder of a larger repository, choose that folder as the Pages source or move these files to the repository root.

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
