'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {rank} = require('../recommendation-policy');
let checks = 0;
function check(name, test) { test(); checks++; process.stdout.write('PASS ' + name + '\n'); }
const item = (id, distance, price) => ({store: {id, distance}, price, ids: [id + '_U01']});
const options = {distanceVerified: true, costOf: x => x.price};
check('verified nearest is first even when a distant store is cheaper', () => {
  const a = rank([item('C', 6, 70), item('A', 1, 120), item('B', 2, 110)], options);
  assert.deepEqual(a.items.slice(0, 2).map(x => x.store.id), ['A', 'B']);
  assert.equal(a.distanceRanked, true);
  assert.equal(a.cheaperSecond, true);
});
check('lower price expands radius before selecting far-away cheapest', () => {
  const a = rank([item('near', 1, 120), item('r4', 4, 100), item('r12', 12, 50)], options);
  assert.deepEqual(a.items.slice(0, 2).map(x => x.store.id), ['near', 'r4']);
});
check('no cheaper nearby expands to whole current city', () => {
  const a = rank([item('near', 1, 120), item('more', 2, 150), item('far', 12, 50)], options);
  assert.deepEqual(a.items.slice(0, 2).map(x => x.store.id), ['near', 'far']);
});
check('no verified location never claims nearest or reorders first fallback', () => {
  const a = rank([item('capacity', 20, 120), item('other', 1, 90), item('third', 2, 100)],
    {distanceVerified: false, costOf: x => x.price});
  assert.equal(a.items[0].store.id, 'capacity');
  assert.equal(a.items[1].store.id, 'other');
  assert.equal(a.distanceRanked, false);
});
check('partial or unknown distance cannot silently claim proximity', () => {
  const a = rank([item('first', undefined, 120), item('second', 1, 110)], options);
  assert.equal(a.distanceRanked, false);
  assert.equal(a.items[0].store.id, 'first');
});
check('duplicate price tie is deterministic and input is not mutated', () => {
  const list = [item('c', 2, 90), item('b', 4, 90), item('a', 1, 110)];
  const first = list[0];
  const a = rank(list, options);
  assert.equal(list[0], first);
  assert.deepEqual(a.items.slice(0, 2).map(x => x.store.id), ['a', 'c']);
});
check('single or empty candidates do not fabricate matches', () => {
  assert.equal(rank([], options).items.length, 0);
  assert.equal(rank([item('only', 1, 100)], options).items.length, 1);
});
const demo = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(demo, 'app.js'), 'utf8');
const s5 = fs.readFileSync(path.join(demo, 'br04', 'bridge.js'), 'utf8');
const entry = fs.readFileSync(path.join(demo, 'index.html'), 'utf8');
check('S01 and S5 share candidate order and the dependency is loaded', () => {
  assert(app.includes('REC.rank(matchingEntries,'));
  assert(app.includes('const ids=storeOffer(s);'));
  assert(app.includes('REC.rank(rows.sort('));
  assert(s5.includes('offerRows=candidates.slice(0,2)'));
  assert(entry.indexOf('recommendation-policy.js') >= 0);
  assert(entry.indexOf('recommendation-policy.js') < entry.indexOf('app.js?v='));
});
check('S02 review panel and review tab are not displayed', () => {
  assert(!app.includes("if(visual.tab==='用户评价')return"));
  assert(!app.includes('data-value="用户评价"'));
  assert(!app.includes("['可选仓位','服务设施','用户评价']"));
  assert(app.includes("if(visual.tab==='用户评价')visual.tab='可选仓位'"));
});
process.stdout.write(JSON.stringify({checks, result: 'PASS'}) + '\n');
