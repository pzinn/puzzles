const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const scripts = ['partition.js', 'matrix.js', 'young.js', 'puzzle.js', 'toggle.js']
  .map(name => new vm.Script(fs.readFileSync(path.join(root, name), 'utf8'), {filename:name}));

// A small DOM/canvas adapter for exercising the legacy scripts without a GPU.
// Browser verification covers actual rendering and native input behavior.
function createApp(search = '') {
  const elements = new Map();
  const htmlWrites = [];
  const alerts = [];
  const drawing = new Proxy({}, {get:(_, name) => name === 'createRadialGradient'
    ? () => ({addColorStop(){}}) : () => {}});

  class Element {
    constructor(tagName) {
      this.tagName = tagName.toUpperCase();
      this.style = {};
      this.children = [];
      this.className = '';
      this.attributes = new Map();
      this._text = this._value = '';
      this.width = this.height = 300;
    }
    set id(id) {this._id = id; elements.set(id, this);}
    get id() {return this._id;}
    set value(value) {this._value = String(value);}
    get value() {return this._value;}
    set textContent(value) {this._text = String(value);}
    get textContent() {return this._text;}
    set innerHTML(value) {htmlWrites.push({id:this.id, value:String(value)}); this._text = String(value);}
    get innerHTML() {return this._text;}
    get classList() {return this.className.split(/\s+/);}
    get firstChild() {return this.children[0] || null;}
    get firstElementChild() {return this.firstChild;}
    get lastElementChild() {return this.children.at(-1) || null;}
    appendChild(child) {return this.insertBefore(child, null);}
    insertBefore(child, before) {
      if (child.parentElement) child.parentElement.removeChild(child);
      this.children.splice(before ? this.children.indexOf(before) : this.children.length, 0, child);
      child.parentElement = this;
      if (child.id) elements.set(child.id, child);
      return child;
    }
    removeChild(child) {
      this.children.splice(this.children.indexOf(child), 1);
      elements.delete(child.id);
      child.parentElement = null;
      return child;
    }
    getAttribute(name) {return this.attributes.get(name) ?? null;}
    removeAttribute(name) {this.attributes.delete(name); if (name === 'disabled') this.disabled = false;}
    getContext() {return drawing;}
    getBoundingClientRect() {return {left:0, top:0};}
    blur() {}
  }

  const location = new URL('http://localhost/puzzles/' + search);
  const document = {
    location,
    createElement:tag => new Element(tag),
    getElementById:id => elements.get(id) || null,
    getElementsByClassName(name) {
      const result = [...elements.values()].filter(el => el.classList.includes(name));
      result.item = i => result[i];
      return result;
    },
  };
  function add(id, tag = 'span', className = '') {
    const el = new Element(tag);
    el.id = id;
    el.className = className;
    return el;
  }
  document.body = add('body', 'body');
  document.activeElement = document.body;
  const context = vm.createContext({document, window:{location}, URL, URLSearchParams,
    alert:message => alerts.push(message), setTimeout:() => {}});
  for (const script of scripts) script.runInContext(context);
  for (const id of ['height', 'width']) add(id).textContent = 2;
  for (const id of ['heightrange', 'widthrange']) add(id, 'input').value = 2;
  add('speed', 'input').value = 4;
  add('intens', 'input').value = 1;
  for (const id of ['speedtext', 'url', 'puzzles', 'submit']) add(id);
  add('updateparts', 'input').checked = true;
  add('double', 'span', 'toggle-button').onchange = function() {context.toggleDouble(this.checked);};
  for (const id of ['K', 'Kinv', 'equiv', 'equiv2', 'equiv3', 'nondeg', 'editortoggle']) add(id, 'span', 'toggle-button');
  for (let i = 1; i <= 4; i++) {
    const id = 'y' + i;
    add(id, 'div');
    add(id + 'toggle', 'span', 'toggle-button').onchange = function() {context.togglePartition(id, this.checked);};
    add(id + 'comp', 'span', 'complement').onchange = () => context.toggleComp(id);
  }
  context.initToggle();
  htmlWrites.length = 0;
  context.parseURL();
  return {context, alerts, htmlWrites, add, el:id => document.getElementById(id),
    run:code => vm.runInContext(code, context, {timeout:10000})};
}

function prepareSolver(app) {
  // Keep the real boundary encoding and backtracking; only skip GPU/button work.
  app.run('buildScene = graph => graph; createButton = () => ({}); startAnim = () => {};');
}

function countPuzzles(app) {
  app.context.process();
  return app.run(`(() => {
    let count = 0, steps = 0, result;
    while ((result = makePuzzle()) !== -2) {
      if (++steps > 1000000) throw Error('Solver did not finish');
      if (result === -1) count++;
    }
    return count;
  })()`);
}

module.exports = {createApp, prepareSolver, countPuzzles};
