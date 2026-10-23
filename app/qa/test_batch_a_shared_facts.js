const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const prototype = path.join(root, 'prototype');
const files = {
  ssot: path.join(prototype, 'mini_storage_business_ssot_v274.js'),
  est: path.join(prototype, 'space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html'),
  s01: path.join(prototype, 'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html'),
  s02: path.join(prototype, 'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html'),
  u01: path.join(prototype, 'mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html'),
  h01: path.join(prototype, 'mini_storage_home_H01_Visual_V2_7_4_SSOT.html')
};

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function parseInlineScripts(file) {
  const source = read(file);
  const pattern = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let match;
  let count = 0;
  while ((match = pattern.exec(source))) {
    if (!match[1].trim()) continue;
    count += 1;
    new Function(match[1]);
  }
  return count;
}

const context = {
  window: {},
  localStorage: { getItem: () => null, setItem: () => {} },
  console,
  Date,
  Math,
  JSON,
  String,
  Number,
  Array,
  Object,
  Boolean
};
vm.createContext(context);
vm.runInContext(read(files.ssot), context, { filename: files.ssot });

const master = context.window.MINI_STORAGE_MASTER_V242;
const helpers = context.window.MINI_STORAGE_BUSINESS_HELPERS_V274;
assert(master && helpers, 'SSOT and shared helpers must load');

assert.deepStrictEqual(
  ['jianguo', 'chaoyang', 'wangjing'].map(id => master.stores[id].name),
  ['安贞店', '芍药居店', '建国门外店']
);
assert.deepStrictEqual(Array.from(master.route_base.guomao.jianguo.drive), [8, 3.2]);
assert.deepStrictEqual(Array.from(master.route_base.guomao.jianguo.bike), [18, 3.2]);
assert.deepStrictEqual(Array.from(master.route_base.guomao.jianguo.walk), [42, 3.2]);
assert.strictEqual(helpers.inventorySummary().count, 8);
assert.strictEqual(helpers.inventorySummary().min_volume, 0.8);
assert.strictEqual(helpers.inventorySummary().max_volume, 12);

const c008 = master.unit_catalog.find(unit => unit.id === 'C008');
const expectedC008 = {
  1: [740, 740],
  3: [2210, 737],
  6: [4120, 687],
  12: [7640, 637],
  60: [32340, 539]
};
Object.entries(expectedC008).forEach(([term, expected]) => {
  assert.strictEqual(helpers.contractRent(c008.base, Number(term), 'jianguo'), expected[0]);
  assert.strictEqual(helpers.monthlyReference(c008.base, Number(term), 'jianguo'), expected[1]);
});
assert.strictEqual(helpers.monthlyReference(199, 60, 'chaoyang'), 94);
assert.strictEqual(helpers.monthlyReference(199, 1, 'chaoyang'), 130);
assert.strictEqual(helpers.contractRent(c008.base, 6, 'jianguo') + helpers.monthlyReference(c008.base, 6, 'jianguo') + master.fees.management_fee, 4857);

assert.strictEqual(helpers.advisorDecision({ expected_contract_rent: 1990 }).level, 'none');
assert.strictEqual(helpers.advisorDecision({ expected_contract_rent: 2000 }).reason, 'high_contract_rent');
assert.strictEqual(helpers.advisorDecision({ customer_type: 'enterprise' }).reason, 'enterprise');
assert.strictEqual(helpers.advisorDecision({ has_oversize: true }).reason, 'oversize');
assert.strictEqual(helpers.advisorDecision({ needs_multiple: true }).reason, 'multiple_units');

Object.values(files).filter(file => file.endsWith('.html')).forEach(file => {
  assert(parseInlineScripts(file) > 0, `${path.basename(file)} should contain parseable inline JavaScript`);
});

const est = read(files.est);
const s01 = read(files.s01);
const s02 = read(files.s02);
const u01 = read(files.u01);
const h01 = read(files.h01);
assert(est.includes('mini_storage_business_ssot_v274.js'));
assert(!est.includes('距用仓位置约870米 · 驾车2分钟'));
assert(s01.includes('storeBrowsePriceRange(id)'));
assert(s01.includes('仓体容量'));
assert(s02.includes('查看更多仓位'));
assert(!s02.includes('#priceBand,.inventory-summary,#s02LeadCard{display:none!important}'));
assert(u01.includes('priceText(v)'));
assert(u01.includes('leadReason:advisor.reason'));
assert(h01.includes('searchOriginKey:homeOriginKey'));
assert(h01.includes('/月/m³起'));

console.log('STATIC PASS: Batch A shared facts, pricing, advisor rules, and script syntax');
