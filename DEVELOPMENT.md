# Developer notes

The viewer runs as static HTML, CSS, and JavaScript with no build step or
package dependencies. See the [README](README.md#run-locally) for local serving
instructions. The interface uses native form controls and disclosure panels,
with no framework or external fonts.

## Layout and controls

The calculation inspector sits beside the canvas on desktop. Its settings can
scroll while the Compute button stays visible. The inspector stacks below the
viewer on narrow screens. Opening inspector sections does not resize the
canvas.

A `ResizeObserver` watches the puzzle canvas container. The drawing buffer
uses the device pixel ratio, capped at 2×. Hit testing uses CSS pixels, so the
same pointer position works at different display densities.

Display and view shortcuts work from menu headings, buttons, and checkboxes.
The View picker accepts digits directly. Editable fields keep their normal
typing behavior. Space and Enter act on the canvas when the page or canvas has
focus and retain their usual behavior on focused controls. Arrow keys also
navigate result buttons.

## URLs

Invalid numeric settings in shared URLs fall back to their defaults. An empty
partition can be encoded as `?y1=` or `?y1=0`.

### assoc integration

Serve the assoc WebGL build on the same origin as the viewer. The relative URL
`../assoc/` resolves from `/puzzles/` to `/assoc/`, both locally and on GitHub
Pages.

Exports use `model=1&n=...&H=...&V=...`. `H` has `n+1` rows of `n` labels and
`V` has `n` rows of `n+1` labels. Both arrays are flattened in row order and
joined with commas. The grids use traditional labels `0`, `1`, and `10` on both
halves, and the shared boundary uses only `0` and `1`.

Each compatible result stores its own URL when the solver finds it. The
**Open in assoc** action and the middle-click shortcut both use that saved
URL, so changing the inspector settings does not change a result's destination.

## Tests

Run `npm test` with Node.js 18 or newer. The suite uses Node's built-in test
runner and a small DOM and canvas adapter. It covers URL validation and sharing,
partition input synchronization, shortcuts and native controls, drawing buffer
sizing and pointer coordinates, manual editing, assoc export, and known puzzle
counts. The ordinary solver is also checked against independent tableau
enumeration for every boundary choice in a 2 × 2 box.

Verify UI and rendering changes in a browser too. The test adapter does not
exercise actual WebGL rendering or browser focus and input behavior.
