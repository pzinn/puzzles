# Puzzles 3.0.0

A static JavaScript app for enumerating and visualizing Littlewood–Richardson
puzzles and related tableaux, mosaics, and honeycombs. It also supports double
puzzles and optional equivariant and K-theory tiles.

The viewer requires a browser with WebGL and ResizeObserver support.

## Try it online

[Open Puzzles on GitHub Pages](https://pzinn.github.io/puzzles/).

## Run locally

Serve this directory with a static web server and open `index.html`. For example:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000/`. No dependency installation or build is needed.

## Use the viewer

- Use the inspector to set the bounding box (height and width are each between
  1 and 10). Enable at least one boundary partition and enter its nonincreasing,
  nonnegative integer rows or edit its diagram. **Binary notation** exposes the
  equivalent binary inputs.
- Choose **Allowed tiles**, then **Compute puzzles**. Use the result buttons
  below the canvas, including **Overview** for the panorama and **Template** for
  the boundary conditions. The **View** picker contains all ten preset views.
  Use **Display** to toggle paths, arrows, numbering, and labels.
- Open **Share** to copy a link to the current settings, preset view, annotations,
  and active partitions.
- Open **Manual editor**, enable **Build a puzzle by hand**, then **Start editing**.
  Select a tile from the bottom of the canvas before placing it.
  Right-click to deselect it or middle-click to undo the last placement. Choose
  **Complete puzzle** to enumerate completions of the edited puzzle.

Right-drag to rotate the canvas. On a touch screen, enable **Swap pointer
actions** under **Interaction options** to rotate by dragging. Press **0–9**
to switch views, or use the arrow keys to navigate result buttons. Open **Help**
for the full shortcut list.

On narrow screens, scroll below the viewer to find the calculation inspector.
Settings are locked while the viewer is computing or you are editing a puzzle
by hand. If a partition is invalid, the viewer keeps its previous value and
shows a message.

## Open a double puzzle in assoc

Compute a double puzzle, select a numbered result, then choose **Open in assoc ↗**
beside the Results heading to explore that exact result in 3D in a new tab.
If you are viewing Template or Overview, select a numbered puzzle first. You
can also **middle-click a result number** as a shortcut.

The action explains why a result is unavailable. It requires a complete double
puzzle with labels `0`, `1`, and `10`, and a shared boundary of `0`s and `1`s.

## Development

See the [developer notes](DEVELOPMENT.md) for tests, browser behavior, and the
`assoc` link format.
