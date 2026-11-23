# Puzzles 3.0.0

A static JavaScript app for enumerating and visualizing Littlewood–Richardson
puzzles and related tableaux, mosaics, and honeycombs. It also supports double
puzzles and optional equivariant and K-theory tiles.

The viewer requires a browser with WebGL and ResizeObserver support.

## On github

Open <https://pzinn.github.io/puzzles/>.

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
  the boundary conditions. The **View** picker contains all ten preset views;
  **Display** controls paths, arrows, numbering, and labels.
- Open **Share** to copy a link to the current settings, preset view, annotations, and
  active partitions. An empty partition can be shared as `?y1=` or `?y1=0`.
- Open **Manual editor**, enable **Build a puzzle by hand**, then **Start editing**.
  Select a tile from the bottom of the canvas before placing it.
  Right-click deselects it; middle-click undoes the last placement. Choose
  **Complete puzzle** to enumerate completions of the edited puzzle.

Right-drag to rotate the canvas. Touch uses the same pointer actions; enable
**Swap pointer actions** under **Interaction options** to rotate by dragging on
a touch screen. Display and view shortcuts also work while menu headings,
buttons, or checkboxes have focus; the **View** picker accepts **0–9** directly.
Typing fields keep their normal behavior. Space, Enter, and arrow keys retain
their normal control actions; canvas shortcuts work with the page or canvas
focused, and arrow navigation works on result buttons. Open **Help** for the
shortcut list.

The desktop layout keeps the calculation inspector beside the canvas, with its
settings scrolling above a persistent compute action. On narrow
screens the inspector stacks below the viewer. Canvas drawing resolution follows
the display's pixel density (capped at 2×), while hit testing uses CSS pixels.
Opening inspector sections does not resize the canvas. Computation settings are
locked during enumeration and manual editing to preserve the active boundaries.

Invalid numeric URL settings fall back to their defaults. Invalid partitions
leave the previous partition unchanged and display a validation message.

## Open a double puzzle in assoc

Compute a double puzzle, select a numbered result, then choose **Open in assoc ↗**
beside the Results heading to explore that exact result in 3D in a new tab.
The action works with a mouse, keyboard, or touch. It explains when a result
cannot be opened; from Template or Overview, select a numbered puzzle first.
You can also **middle-click a numbered result button** as a shortcut.

The destination is the sibling `../assoc/` site: when this viewer is served at
`https://pzinn.github.io/puzzles/`, links open `https://pzinn.github.io/assoc/`.
For local use, serve the assoc WebGL build at `/assoc/` beside `/puzzles/`.

Links use `model=1&n=...&H=...&V=...`. `H` has `n+1` rows of `n` labels and
`V` has `n` rows of `n+1` labels, flattened in row-major order without a
trailing comma. Both grids use traditional labels `0`, `1`, and `10` on both
halves of the puzzle. The retired `hcol`/`vcol` strand-colour parameters are
not used. Export requires a complete double puzzle using those labels and a
common seam labelled only `0` or `1`; extra edge states are not supported.

## Tests

With Node.js 18 or newer:

```sh
npm test
```

The tests use Node's built-in test runner and a small DOM/canvas adapter; there
are no package dependencies. They exercise URL validation and round-tripping,
partition validation and input synchronization, native controls, pixel-density
and pointer-coordinate handling, manual editing, and known puzzle
counts. Actual WebGL rendering and native browser interactions also need browser
verification after UI or rendering changes.

## Branch scope

`main` starts from `master`. The separate `experimental` branch's rectangular
double-puzzle and symmetry extensions have not been ported. Its stale second-size
state and mismatched parameter defaults must be addressed during that port;
`main` now keys defaults by parameter name to avoid positional mismatches.

The interface is buildless and uses native form controls and disclosure panels;
there is no framework or external font dependency.

Line and edge numbering for partial and double puzzles retains the legacy
behavior and still needs mathematical validation.
