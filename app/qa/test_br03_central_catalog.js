'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..', 'prototype', 'parallel', 'br03-central-catalog-demo');
const source = fs.readFileSync(path.join(root, 'central-catalog.js'), 'utf8');
const context = { window: {} };
vm.runInNewContext(source, context, { filename: 'central-catalog.js' });
const catalog = context.window.BR03_CENTRAL_CATALOG;
const expectedIds = ['MK_SH_792BFEEE', 'MK_SH_D5AF3DE3', 'MK_SH_DD275356', 'MK_SH_1C44E2CD'];
const expectedCounts = [8, 21, 3, 3];
assert.equal(catalog.stores.length, 4, 'four central Shanghai stores');
assert.deepEqual(Array.from(catalog.stores, x => x.id), expectedIds, 'approved central store IDs and order');
assert.deepEqual(Array.from(catalog.stores, x => catalog.unitsByStore[x.id].length), expectedCounts, 'B4A option counts');
assert.deepEqual(Array.from(catalog.terms), [1, 3, 6, 12, 24, 36, 60], 'central term set');
const ids = new Set();
for (const store of catalog.stores) {
  assert.ok(store.address && store.name, 'central store address and name present');
  for (const unit of catalog.unitsByStore[store.id]) {
    assert.equal(unit.store_id, store.id, 'option remains same-source to store');
    assert.equal(unit.size_option_id, unit.id, 'central SIZE_OPTION identity preserved');
    assert.ok(unit.representative_unit_no, 'representative unit reference present');
    assert.ok(unit.volume > 0 && unit.month > 0 && unit.available_count > 0, 'option eligible for demo catalog');
    for (const term of catalog.terms) assert.ok(Number.isSafeInteger(unit.prices[term]) && unit.prices[term] > 0, `valid central contract rent for ${term} months`);
    assert.equal(ids.has(unit.id), false, 'size option IDs unique');
    ids.add(unit.id);
  }
}
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
assert.match(app, /window\.BR03_CENTRAL_CATALOG\.stores/);
assert.match(app, /unit_identity_type:'SIZE_OPTION'/);
assert.match(app, /br03:order_intent/);
assert.equal(app.includes('br03:orderIntent'), false, 'event uses underscored name');
assert.equal(app.includes("store:'jingan'"), false, 'no legacy demo default store');
assert.equal(app.includes("jumpStore(id||'jingan')"), false, 'no legacy demo test fallback');
assert.match(app, /combo-.*?组合仓需中央整单校验/s);
assert.doesNotMatch(app, /MK_SH_[^'"\s]+['"]\s*:\s*['"](jingan|xuhui|changning|pudong)/i, 'no legacy ID alias mapping');
const intent = app.slice(app.indexOf('function makeIntent('), app.indexOf('function order('));
for (const forbidden of ['rent_total', 'deposit', 'management_fee', 'payable', 'discount', 'coupon']) assert.equal(intent.includes(forbidden), false, `no monetary field ${forbidden} in intent`);
console.log(`PASS: ${catalog.stores.length} central stores, ${ids.size} central options, ${catalog.terms.length} terms; IDs, same-source bindings, price tiers and intent boundary verified.`);
