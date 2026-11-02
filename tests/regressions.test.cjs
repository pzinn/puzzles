const assert = require('node:assert/strict');
const {test} = require('node:test');
const {createApp, prepareSolver, countPuzzles} = require('./helpers/app.cjs');

test('URL defaults preserve sizes, speed, color intensity, and complements', () => {
  const app = createApp();
  for (const [id, expected] of Object.entries({height:'2', width:'2', speed:'4', intens:'1'})) {
    const el = app.el(id);
    assert.equal(el.tagName === 'INPUT' ? el.value : el.textContent, expected);
  }
  for (let i = 1; i <= 4; i++) assert.equal(app.el(`y${i}comp`).checked, false);
  app.context.updateURL();
  assert.equal(app.el('url').value, 'http://localhost/puzzles/');
});

test('query sizes reject markup and values outside the supported integer range', () => {
  for (const value of ['<img src=x onerror=alert(1)>', '-1', '0', '1.5', 'Infinity', '100000', '', 'abc']) {
    const app = createApp('?height=' + encodeURIComponent(value) + '&width=' + encodeURIComponent(value));
    assert.equal(app.el('height').textContent, '2', value);
    assert.equal(app.el('width').textContent, '2', value);
    assert.equal(app.el('heightrange').value, '2');
    assert.equal(app.el('widthrange').value, '2');
    assert.equal(app.context.y[0].xmax, 2);
    assert.equal(app.context.y[0].ymax, 2);
    assert.deepEqual(app.htmlWrites, [], 'URL settings must not be inserted as HTML');
  }
  const app = createApp('?height=10&width=1&speed=10&intens=0');
  assert.equal(app.context.y[0].ymax, 10);
  assert.equal(app.context.y[0].xmax, 1);
  assert.equal(app.el('speed').value, '10');
  assert.equal(app.el('intens').value, '0');
});

test('malformed URL escapes do not abort startup', () => {
  assert.doesNotThrow(() => createApp('?height=%E0%A4%A'));
});

test('partition validation rejects negative, fractional, and unordered rows without changing state', () => {
  const app = createApp('?y1=1');
  const p = app.context.y[0];
  for (const invalid of [[1,-100], [-1], [1.5], [Infinity], [NaN], [1,2], [3], [1,1,1]]) {
    assert.equal(p.set(invalid), false);
    assert.deepEqual(Array.from(p.get()), [1]);
  }
  const input = ['2', '1', '0'];
  const p2 = new app.context.partition([], 3, 3);
  assert.equal(p2.set(input), true);
  assert.deepEqual(Array.from(p2.get()), [2,1]);
  assert.deepEqual(input, ['2', '1', '0']);
});

test('active partitions produce a query string even when every setting is default', () => {
  const app = createApp('?y1=1');
  app.context.updateURL();
  assert.equal(app.el('url').value, 'http://localhost/puzzles/?y1=1');
  const restored = createApp(new URL(app.el('url').value).search);
  assert.equal(restored.el('y1toggle').checked, true);
  assert.deepEqual(Array.from(restored.context.y[0].get()), [1]);
});

test('both empty-partition URL forms remain active across sharing and reload', () => {
  for (const search of ['?y1=', '?y1=0']) {
    const app = createApp(search);
    assert.equal(app.el('y1toggle').checked, true);
    assert.deepEqual(Array.from(app.context.y[0].get()), []);
    app.context.updateURL();
    assert.equal(app.el('url').value, 'http://localhost/puzzles/?y1=');
    assert.equal(createApp(new URL(app.el('url').value).search).el('y1toggle').checked, true);
  }
});

test('nondefault settings, complements, partitions, and double mode round-trip together', () => {
  const app = createApp('?height=3&width=4&speed=7&intens=0.25&K&equiv&y1=3,1&y1comp&y4=0');
  app.context.updateURL();
  const restored = createApp(new URL(app.el('url').value).search);
  for (const name of app.context.params) assert.equal(restored.context.getparam(name), app.context.getparam(name), name);
  for (let i = 0; i < 4; i++) {
    assert.deepEqual(Array.from(restored.context.y[i].get()), Array.from(app.context.y[i].get()));
    assert.equal(restored.el(`y${i+1}toggle`).checked, app.el(`y${i+1}toggle`).checked);
  }
  assert.equal(restored.el('double').checked, true);
  assert.equal(restored.el('y4').hidden, false);
});

test('diagram clicks synchronize the row and binary inputs', () => {
  const app = createApp('?y1=1');
  const click = {which:1, clientX:35, clientY:15};
  app.el('y1canvas').onclick(click);
  assert.equal(app.el('y1src').value, '2');
  assert.equal(app.el('y1src2').value, '0110');
  app.el('y1canvas').onclick(click);
  assert.equal(app.el('y1src').value, '1');
  assert.equal(app.el('y1src2').value, '0101');
  const empty = createApp('?y1=');
  assert.equal(empty.el('y1src2').value, '0011');
});

test('invalid row text restores both inputs and reports validation', () => {
  const app = createApp('?y1=1');
  app.el('y1src').value = '1,-100';
  app.el('y1src').onchange();
  assert.equal(app.el('y1src').value, '1');
  assert.equal(app.el('y1src2').value, '0101');
  assert.deepEqual(Array.from(app.context.y[0].get()), [1]);
  assert.equal(app.alerts.length, 1);
});

test('manual clicks with no tile selected do not enter the placement logic', () => {
  const app = createApp('?y1=1');
  const current = app.add('current', 'button');
  current.state = {manual:true, select:-1};
  app.run(`canvas={width:400,height:400}; tiles=new Array(10); size=4;
    edge=nestedArray(2,7,[0,0,0]); edge[1][1][0]=1;
    tileable=[[1,1,0,0,[0,0,0,0]]];
    conv4d2d=()=>{throw Error('Unexpected attempt to place a tile')};`);
  const before = app.run('JSON.stringify(edge)');
  assert.equal(app.context.handleMouseDown({layerX:100, layerY:100, button:0}), false);
  assert.equal(app.run('JSON.stringify(edge)'), before);
  app.context.handleMouseDown({layerX:100, layerY:100, button:2});
  assert.equal(app.context.handleMouseDown({layerX:100, layerY:100, button:0}), false);
});

test('the four-line intersection example still has two solutions', () => {
  const app = createApp('?height=2&width=2&y1=1&y2=1&y3=1&y4=1');
  prepareSolver(app);
  assert.equal(countPuzzles(app), 2);
});

test('a nontrivial ordinary LR coefficient still has multiplicity two', () => {
  const app = createApp('?height=3&width=3&y1=2,1&y2=2,1&y3=2,1');
  prepareSolver(app);
  assert.equal(countPuzzles(app), 2);
});
