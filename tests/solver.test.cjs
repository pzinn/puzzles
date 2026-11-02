const assert = require('node:assert/strict');
const {test} = require('node:test');
const {createApp, prepareSolver, countPuzzles} = require('./helpers/app.cjs');

// Independent LR-tableau enumeration: fill the skew shape in reading order,
// checking row/column order, content, and the lattice-word condition.
function tableauxCount(lambda, mu, nu) {
  const area = p => p.reduce((sum, x) => sum+x, 0);
  if (area(lambda)+area(mu) !== area(nu) || lambda.some((x, r) => x > (nu[r] || 0))) return 0;
  const cells = [];
  for (let r = 0; r < nu.length; r++) {
    for (let c = nu[r]-1; c >= (lambda[r] || 0); c--) cells.push([r,c]);
  }
  const used = mu.map(() => 0), filled = new Map();
  function visit(i) {
    if (i === cells.length) return 1;
    const [r,c] = cells[i];
    let count = 0;
    for (let v = 1; v <= mu.length; v++) {
      if (used[v-1] === mu[v-1]) continue;
      if (v > 1 && used[v-1]+1 > used[v-2]) continue;
      if (filled.has(`${r},${c+1}`) && v > filled.get(`${r},${c+1}`)) continue;
      if (filled.has(`${r-1},${c}`) && v <= filled.get(`${r-1},${c}`)) continue;
      used[v-1]++;
      filled.set(`${r},${c}`, v);
      count += visit(i+1);
      filled.delete(`${r},${c}`);
      used[v-1]--;
    }
    return count;
  }
  return visit(0);
}

test('all 216 ordinary LR boundary choices in a 2x2 box match tableau enumeration', () => {
  const partitions = [[], [1], [2], [1,1], [2,1], [2,2]];
  const app = createApp('?y1=&y2=&y3=');
  prepareSolver(app);
  for (const lambda of partitions) for (const mu of partitions) for (const nu of partitions) {
    const dualNu = [2-(nu[1] || 0), 2-(nu[0] || 0)].filter(Boolean);
    for (const [i,p] of [lambda,mu,dualNu].entries()) assert.equal(app.context.y[i].set(p), true);
    assert.equal(countPuzzles(app), tableauxCount(lambda,mu,nu), JSON.stringify({lambda,mu,nu}));
  }
});
