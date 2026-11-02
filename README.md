# Puzzles

A static JavaScript app for enumerating and visualizing Littlewood–Richardson
puzzles and related tableaux, mosaics, and honeycombs. It also supports double
puzzles and optional equivariant and K-theory tiles.

## Run locally

Serve this directory with a static web server and open `index.html`. For example:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000/`. No dependency installation or build is needed.
The viewer requires a browser with WebGL and ResizeObserver support.

## Use the viewer

- Enable at least one partition and enter its nonincreasing, nonnegative integer
  rows, edit its diagram, or enter its binary string. Set the bounding box in
  **Sizes** first (height and width are each between 1 and 10).
- Choose tiles, then press **Process** to enumerate puzzles. Select a numbered
  result or **S** for the panorama. **Controls** contains the preset views.
- Click the URL field to generate and select a link to the current settings and
  active partitions. An empty partition can be shared as `?y1=` or `?y1=0`.
- In manual mode, select a tile from the bottom of the canvas before placing it.
  Right-click deselects it; middle-click undoes the last placement.

Invalid numeric URL settings fall back to their defaults. Invalid partitions
leave the previous partition unchanged and display a validation message.

## Tests

With Node.js 18 or newer:

```sh
npm test
```

The tests use Node's built-in test runner and a small DOM/canvas adapter; there
are no package dependencies. They exercise URL validation and round-tripping,
partition validation and input synchronization, manual editing, and known puzzle
counts. Actual WebGL rendering and native browser interactions also need browser
verification after UI or rendering changes.

## Branch scope

`main` starts from `master`. The separate `experimental` branch's rectangular
double-puzzle and symmetry extensions have not been ported. Its stale second-size
state and mismatched parameter defaults must be addressed during that port;
`main` now keys defaults by parameter name to avoid positional mismatches.

Responsive layout and horizontal overflow are deferred for a separate review.
