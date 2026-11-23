const assert = require('node:assert/strict');
const {test} = require('node:test');
const {createApp, prepareSolver} = require('./helpers/app.cjs');

// The documented size-two input from assoc, including a 10-10-10 triangle.
// These are ordinary labels on BOTH facets, rather than strand colours.
function example() {
  const app = createApp();
  app.run(`size=2; doublePuzzle=true; edge=nestedArray(2,5,[0,0,0]);`);
  const H = [[1,2],[1,3],[2,1]];
  const V = [[2,2,1],[1,3,2]];
  const D = [[3,2],[1,3]];
  for (const [i,row] of H.entries())
    for (const [j,value] of row.entries()) app.context.edge[i+1][j+1][0] = value;
  for (const [i,row] of V.entries())
    for (const [j,value] of row.entries()) app.context.edge[i+1][j+1][1] = value;
  for (const [i,row] of D.entries())
    for (const [j,value] of row.entries()) app.context.edge[i+1][j+1][2] = value;
  return app;
}

test('assoc URLs match its documented traditional-label input and preserve grid order', () => {
  const app = example();
  const link = app.context.buildUrl();
  assert.equal(link, '../assoc/?model=1&n=2&H=0,1,0,10,1,0&V=1,1,0,0,10,1');
  const url = new URL(link, 'https://pzinn.github.io/puzzles/');
  assert.equal(url.origin + url.pathname, 'https://pzinn.github.io/assoc/');
  assert.equal(url.searchParams.has('hcol'), false);
  assert.equal(url.searchParams.has('vcol'), false);
});

test('triangular, incomplete, and unsupported double puzzles do not export invalid assoc inputs', () => {
  const triangle = example();
  triangle.context.doublePuzzle = false;
  assert.equal(triangle.context.buildUrl(), '');
  for (const [i,j,k,value] of [
    [1,1,0,0], [1,1,1,4], [2,2,2,5], [2,2,0,6], [1,2,2,3]
  ]) {
    const app = example();
    app.context.edge[i][j][k] = value;
    assert.equal(app.context.buildUrl(), '', JSON.stringify({i,j,k,value}));
  }
});

test('computed double results keep their own assoc link after enumeration continues', () => {
  const app = createApp('?height=2&width=2&y1=1&y2=1&y3=1&y4=1');
  const createButton = app.context.createButton;
  prepareSolver(app);
  app.context.process();
  const buttons = [];
  let result, steps = 0;
  while ((result = app.context.makePuzzle()) !== -2) {
    assert.ok(++steps < 100000);
    if (result !== -1) continue;
    const url = app.context.buildUrl();
    assert.ok(url);
    buttons.push(createButton(buttons.length+1, {}, null, url));
  }
  assert.equal(buttons.length, 2);
  assert.notEqual(buttons[0].url, buttons[1].url);
  app.context.doublePuzzle = false; // Later UI changes must not change either link.
  const opened = [];
  app.context.window.open = url => opened.push(url);
  for (const button of buttons) {
    let prevented = false;
    assert.match(button.title, /Middle-click/);
    button.onauxclick({button:1, preventDefault() {prevented = true;}});
    assert.equal(prevented, true);
  }
  assert.deepEqual(opened, buttons.map(button => button.url));
});

test('only middle-clicking a linked result opens assoc; templates and right-clicks do not', () => {
  const app = example();
  app.add('currentpara', 'p');
  const button = app.context.createButton(1, {}, null, app.context.buildUrl());
  const template = app.context.createButton('&empty;', {});
  const overview = app.context.createButton('S', []);
  const unlinkedResult = app.context.createButton(2, {});
  const opened = [];
  app.context.window.open = url => opened.push(url);
  const unexpected = () => {throw Error('Unrelated click was intercepted');};
  button.onauxclick({button:2, preventDefault:unexpected});
  button.onauxclick({button:0, preventDefault:unexpected});
  for (const control of [template, overview, unlinkedResult]) {
    assert.equal(control.onauxclick, undefined);
    app.context.openAssoc.call(control, {button:1, preventDefault:unexpected});
  }
  assert.deepEqual(opened, []);
});
