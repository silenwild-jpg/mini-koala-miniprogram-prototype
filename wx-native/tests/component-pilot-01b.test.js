const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const root = path.resolve(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = name => require(path.join(root, name));
const finder = R('services/finder'), state = R('services/state');
const base = R('mock/stores')[0], sample = R('mock/inventory').find(u => u.store_id === base.id);
env.loadApp();
const context = (capacity, loggedIn = false) => ({ requirement: { capacity_m3: capacity, input_value: capacity, input_unit: 'm3', term_months: 12, source: 'manual' }, location: { city: base.city, kind: 'city' }, loggedIn });
const storeWith = volumes => ({ ...base, units: volumes.map((volume, i) => ({ ...sample, id: 'FIXTURE_' + i, code: 'T00' + i, volume, status: 'available', special_month: null })) });

test('D05：10m³需求仅有8m³时，S5保留偏小提示与游客报价门槛，S02仍能识别近似', () => {
  const store = storeWith([8]), ctx = context(10), match = finder.buildMatch([store], ctx);
  assert.equal(match.mode, 'near');
  const row = match.cards[0].lines[0];
  assert.equal(row.volText, '8m³'); assert.match(row.nearText, /小\s*2m³/);
  assert.equal(row.cta, '查看报价'); assert.equal(row.price.unit, '/月起'); assert.equal(row.rentTotal, undefined);
  const detail = finder.buildStoreDetail(store, ctx);
  assert.equal(detail.situation, 'near'); assert.equal(detail.near[0].id, row.id); assert.equal(detail.near[0].nearText, row.nearText);
});
test('D09：10m³需求只有单个5m³，S5诚实无匹配，不把更小仓伪装近似或组合', () => {
  const store = storeWith([5]), ctx = context(10), match = finder.buildMatch([store], ctx);
  assert.equal(match.mode, 'none'); assert.deepEqual(match.cards, []);
  const detail = finder.buildStoreDetail(store, ctx);
  assert.equal(detail.situation, 'nomatch'); assert.deepEqual(detail.near, []); assert.deepEqual(detail.combos, []);
});
test('D08/D12：30m³需求的16+15m³组合保留合计、各仓编号和游客门槛；登录后报价同源', () => {
  const store = storeWith([16,15]);
  for (const loggedIn of [false,true]) {
    const ctx = context(30,loggedIn), match = finder.buildMatch([store],ctx), detail = finder.buildStoreDetail(store,ctx);
    assert.equal(match.mode,'combo'); assert.equal(detail.situation,'combo');
    const row = match.cards[0].lines[0], combo = detail.combos[0];
    assert.equal(row.volText,'31m³'); assert.equal(combo.volText,'31m³');
    assert.deepEqual(new Set(row.id.split(',')), new Set(store.units.map(u=>u.id)));
    for (const u of store.units) { assert.ok(row.name.includes(u.code)); assert.ok(combo.sub.includes(u.code)); }
    assert.deepEqual(row.price,combo.price);
    assert.equal(row.cta,loggedIn?'立即下单':'查看报价');
  }
});
test('D04/D14：长地址从已有路线入口完整保留，滚动到页签且复制全文，不改变选仓需求', async () => {
  state.reset(); state.setRequirement(context(3.1).requirement);
  const page = env.newPage('pages/store/detail',{id:base.id}); await page.refresh();
  const fullAddress = '北京市朝阳区' + '长地址核验楼栋与单元'.repeat(10) + '28号楼地下B1层西侧入口';
  page._store = { ...page._store, address:fullAddress }; page.paint();
  const before = JSON.stringify(state.get().requirement), scrolls=[], copies=[];
  const oldScroll=wx.pageScrollTo,oldCopy=wx.setClipboardData;
  wx.pageScrollTo = options=>scrolls.push(options); wx.setClipboardData = options=>copies.push(options.data);
  try {
    page.onSeeRoute(); assert.equal(page.data.tab,2); assert.equal(page.data.card.address,fullAddress);
    assert.deepEqual(scrolls,[{selector:'.sd-tabs',duration:0}]);
    page.onCopyAddress(); assert.deepEqual(copies,[fullAddress]);
    assert.equal(JSON.stringify(state.get().requirement),before);
  } finally { wx.pageScrollTo=oldScroll;wx.setClipboardData=oldCopy; }
});
