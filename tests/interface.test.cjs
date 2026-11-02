const assert = require('node:assert/strict');
const {test} = require('node:test');
const {createApp} = require('./helpers/app.cjs');

test('native checkbox state restores from a URL and serializes as a boolean', () => {
  const app = createApp('?K&equiv=false&double');
  assert.equal(app.el('K').tagName, 'INPUT');
  assert.equal(app.el('K').checked, true);
  assert.equal(app.el('equiv').checked, false);
  assert.equal(app.el('y4').hidden, false);
  app.el('K').update(false);
  app.context.updateURL();
  assert.equal(new URL(app.el('url').value).searchParams.has('K'), false);
  assert.equal(new URL(app.el('url').value).searchParams.get('double'), 'true');
});

test('complement buttons toggle once and expose their pressed state', () => {
  const app = createApp('?y1=1');
  app.el('y1comp').onclick();
  assert.deepEqual(Array.from(app.context.y[0].get()), [2,1]);
  assert.equal(app.el('y1comp').getAttribute('aria-pressed'), 'true');
  app.el('y1comp').onclick();
  assert.deepEqual(Array.from(app.context.y[0].get()), [1]);
  assert.equal(app.el('y1comp').getAttribute('aria-pressed'), 'false');
});

test('scaled partition diagrams map pointer coordinates into logical cells at high DPI', () => {
  const app = createApp('?y1=1');
  app.context.window.devicePixelRatio = 2;
  app.context.destroyyoung('y1');
  const p = app.context.inityoung('y1',2,2,20,5,true,true);
  p.set([1]);
  const canvas = app.el('y1canvas');
  canvas.getBoundingClientRect = () => ({left:10,top:20,width:25,height:25});
  assert.equal(canvas.width, 100);
  canvas.onclick({button:0,clientX:27.5,clientY:27.5});
  assert.deepEqual(Array.from(p.get()), [2]);
  assert.equal(app.el('y1src2').value, '0110');
});

test('partition diagram editing respects the computation settings lock', () => {
  const app = createApp('?y1=1');
  app.add('calculation-settings','fieldset').disabled = true;
  app.el('y1canvas').onclick({button:0,clientX:35,clientY:15});
  assert.deepEqual(Array.from(app.context.y[0].get()), [1]);
});

test('WebGL projection, trackball, and pointer coordinates use CSS pixels', () => {
  const app = createApp();
  app.add('current','button').state = {scale:1};
  app.run(`canvas={width:800,height:600,clientWidth:400,clientHeight:300,
    getBoundingClientRect:()=>({left:30,top:40})}; mrot=new Matrix(1);`);
  assert.deepEqual(Array.from(app.context.conv4d2d([0,0,0,0])), [200,150]);
  assert.deepEqual(Array.from(app.context.screen2sphere(200,150)), [0,0,1]);
  assert.deepEqual(JSON.parse(JSON.stringify(app.context.canvasMousePosition({clientX:230,clientY:190}))), {x:200,y:150});
});

test('redrawing at high DPI does not feed buffer dimensions back into layout', () => {
  const app = createApp();
  app.context.window.devicePixelRatio = 2;
  app.run(`canvas={width:300,height:150,clientWidth:400,clientHeight:300};
    gl={viewport(){},depthMask(){},clear(){},COLOR_BUFFER_BIT:1,DEPTH_BUFFER_BIT:2};`);
  app.context.drawScene();
  app.context.drawScene();
  assert.equal(app.context.canvas.width, 800);
  assert.equal(app.context.canvas.height, 600);
  assert.equal(app.context.canvas.clientWidth, 400);
});

test('sharing keeps view and display choices, including an empty display mask', () => {
  const app = createApp('?y1=1');
  app.add('view-preset','select').value = '5';
  for (let flag = 1; flag <= 1024; flag *= 2) app.add('check'+flag,'input').checked = false;
  app.context.updateURL();
  const query = new URL(app.el('url').value).searchParams;
  assert.equal(query.get('view'), '5');
  assert.equal(query.get('mask'), '0');
  assert.equal(query.get('y1'), '1');
});

test('validation messages appear inline when the inspector is mounted', () => {
  const app = createApp('?y1=1');
  const error = app.add('input-error','p');
  app.el('y1src').value = '-1';
  app.el('y1src').onchange();
  assert.equal(error.hidden, false);
  assert.match(error.textContent, /nonnegative integer/);
  assert.equal(app.alerts.length, 0);
  app.el('y1src').value = '2';
  app.el('y1src').onchange();
  assert.equal(error.hidden, true);
});

test('full-speed enumeration yields between batches so Abort remains available', () => {
  const app = createApp('?y1=1&speed=10');
  let scheduled = 0;
  app.context.setTimeout = () => ++scheduled;
  app.run(`icon={parentElement:null}; processAnimFlag=true; shortenAnimFlag=false;
    var clock=0, solverCalls=0; Date.now=()=>clock++;
    makePuzzle=()=>{solverCalls++; return 1;};`);
  app.context.processAnimFunc();
  assert.ok(app.context.solverCalls > 0 && app.context.solverCalls < 100);
  assert.equal(scheduled, 1);
  assert.equal(app.el('submit').textContent, 'Abort');
  assert.equal(app.context.processAnimFlag, true);
});

test('the primary action follows computation state even when selection refreshes the interface', () => {
  const app = createApp('?y1=1&speed=1');
  for (const id of ['workspace-summary','calculation-settings','canvas-empty','results-placeholder','result-count','calculation-status','rotation-toggle']) app.add(id);
  app.context.processAnimFlag = true;
  app.context.npuzzles = 0;
  app.context.shortenAnimFlag = false;
  app.context.syncInterface();
  assert.equal(app.el('submit').textContent, 'Finish');
  assert.equal(app.el('submit').onclick, app.context.shortenAnim);
  assert.equal(app.el('calculation-settings').disabled, true);
  app.context.shortenAnimFlag = true;
  app.context.syncInterface();
  assert.equal(app.el('submit').textContent, 'Abort');
  assert.equal(app.el('submit').onclick, app.context.endAnim);
  app.context.processAnimFlag = false;
  app.context.syncInterface();
  assert.equal(app.el('submit').textContent, 'Compute puzzles');
  assert.equal(app.el('submit').onclick, app.context.process);
  assert.equal(app.el('calculation-settings').disabled, false);
});
