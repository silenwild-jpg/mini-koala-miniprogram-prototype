// IMPL-01 find 域：门店卡位置行基准（距离 · 区名 · 商圈）、附近门店角标与小节标题、组合方案行字段、筛选数量角标、
// 用仓位置面板进出场状态机（快速开关、卸载）、价格变化反馈（连续触发、卸载）。
// 在假的 wx 环境里跑，验证的是代码逻辑，不是微信真实渲染；动画本身看不到，只验证状态与定时器。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), api = R('services/api'), scenarios = R('mock/scenarios');
const { db } = R('services/mock-ext/_db');
const finder = R('services/finder'), T = R('i18n/find'), motion = R('core/motion');
env.loadApp();
const NEED = { capacity_m3: 3.5, input_unit: 'm3', input_value: 3.5, term_months: 6, source: 'manual' };
function fresh(need, loggedIn, stock) {
  state.reset(); env.nav.length = 0; db.orders.length = 0; db.leads.length = 0; db.messages.length = 0; db.seq = 0; db.seeded = true; db.kv = {}; db.sms = {};
  scenarios.write({ scenario: '', stock: stock || 'normal', events: {}, net: 'instant' });
  if (loggedIn) state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
  if (need) state.set('requirement', need);
  state.patch('location', { status: 'granted' });
}
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 40));
const tap = (d) => ({ currentTarget: { dataset: d } });
const ctx = (need, loggedIn) => ({ loggedIn: !!loggedIn, location: state.get().location, requirement: need || null });
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('门店卡位置行：距离 · 区名 · 商圈（没有商圈写小区），不带省市门牌；没有距离时只写区名与商圈；仓位推荐卡同一写法', async () => {
  fresh(NEED, true);
  const stores = await api.getStores({ city: '北京' });
  const l = finder.buildList(stores, ctx(NEED, true), {});
  const by = (id) => l.cards.find((c) => c.id === id);
  assert.deepEqual([by('SIM_BJ01').placeText, by('SIM_BJ01').locText], ['朝阳区 · 安贞', '1.2km · 朝阳区 · 安贞']);
  assert.equal(by('SIM_BJ02').placeText, '朝阳区 · 芍药居北里', '没有商圈时写小区');
  assert.ok(l.cards.every((c) => !/北京市|号楼|¥/.test(c.locText)), '位置行不带省市门牌，也不混价格');
  const m = finder.buildMatch(stores, ctx(NEED, true));
  assert.deepEqual(m.cards.map((c) => c.placeText), m.cards.map((c) => by(c.id).placeText), '仓位推荐卡与列表卡位置写法一致');
  state.patch('location', { status: 'unasked' });
  const none = finder.buildList(stores, ctx(NEED, true), {});
  assert.ok(none.cards.every((c) => c.kmText === '' && c.locText === c.placeText));
  const c = env.newComponent('components/mk-store-card/index', { card: by('SIM_BJ01'), variant: 'standard' });
  assert.equal(c.data.place, '朝阳区 · 安贞');
  const old = env.newComponent('components/mk-store-card/index', { card: { id: 'x', name: 'x', address: '某地址' }, variant: 'plain' });
  assert.equal(old.data.place, '某地址', '没带 placeText 的旧数据退回地址');
});

test('附近门店角标：综合排序下第一张「距离最近」，第二张只有确实更便宜才标「区域低价」；手动排序不标；被分组挪走的不标', async () => {
  fresh(null, false);
  const stores = await api.getStores({ city: '北京' });
  const browse = finder.buildList(stores, ctx(null), {});
  assert.deepEqual(browse.cards.slice(0, 2).map((c) => [c.rankTag, c.rankKind]), [['距离最近', 'near'], ['区域低价', 'price']]);
  assert.ok(browse.cards[1].fromPrice < browse.cards[0].fromPrice, '第二张确实比第一张便宜');
  assert.ok(browse.cards.slice(2).every((c) => !c.rankTag));
  const need = finder.buildList(stores, ctx(NEED, true), {});
  assert.equal(need.cards[0].rankTag, '距离最近'); assert.equal(need.cards[1].rankTag, '', '第二张不比第一张便宜时不标');
  for (const sort of ['distance', 'price']) assert.ok(finder.buildList(stores, ctx(NEED, true), { sort }).cards.every((c) => !c.rankTag), sort);
  state.patch('location', { status: 'unasked' });
  assert.ok(finder.buildList(stores, ctx(NEED, true), {}).cards.every((c) => c.rankTag !== '距离最近'), '没有距离时不标「距离最近」');
  // 库存紧张：最近的门店只有接近方案，被排到有匹配的门店后面，角标不跟着出现在第三张
  fresh(NEED, true, 'tight');
  const tight = finder.buildList(await api.getStores({ city: '北京' }), ctx(NEED, true), {});
  tight.cards.forEach((c, i) => { if (c.rankTag) assert.equal(i, c.rankKind === 'price' ? 1 : 0, c.id); });
});

test('附近门店页：带角标时出「为您优先推荐」「更多门店」两个小节标题；手动排序、无匹配时不出；卡片模板里距离、价格、标签各在各的位置', async () => {
  fresh(NEED, true);
  const pg = env.newPage('pages/stores/index', {}); await tick();
  const st = () => pg.data.items.filter((x) => x.type === 'store');
  assert.equal(st()[0].hd, T.stores.topTitle); assert.equal(st()[1].hd, ''); assert.equal(st()[2].hd, T.stores.restTitle); assert.equal(st()[2].variant, 'compact');
  assert.equal(st().filter((x) => x.hd).length, 2);
  pg.onSheet(tap({ k: 'sort' })); pg.onOption(tap({ v: 'price' })); await tick();
  assert.ok(st().every((x) => !x.hd), '价格优先时没有推荐小节');
  pg.onClearFilters(); await tick(); assert.equal(st()[0].hd, T.stores.topTitle);
  const w = read('components/mk-store-card/index.wxml');
  assert.ok(/class="mk-corner \{\{card\.rankKind === 'price' \? 'mk-corner--price' : ''\}\}"/.test(w), '角标用全局类 mk-corner');
  assert.ok(!/compactText|card\.address/.test(w), '不再渲染拼出来的紧凑串与完整地址');
  assert.ok(/sc-km[\s\S]*sc-place[\s\S]*sc-tags[\s\S]*sc-foot/.test(w), '骨架顺序：距离与区名一组 → 标签 → 价格');
  fresh(Object.assign({}, NEED, { capacity_m3: 29.5, input_value: 29.5 }), true, 'city_soldout');
  const np = env.newPage('pages/stores/index', {}); await tick();
  assert.equal(np.data.noMatch, true); assert.ok(np.data.items.every((x) => !x.hd && !(x.card && x.card.rankTag)));
});

test('组合方案行：编号 + 容量与单仓同一写法，「N 间组合」单独成标签；整期金额单列，未登录没有', async () => {
  fresh(null, true);
  const stores = await api.getStores({ city: '北京' });
  const need9 = Object.assign({}, NEED, { capacity_m3: 9, input_value: 9 });
  const row = finder.buildMatch(stores, ctx(need9, true)).cards[0].lines[0];
  assert.equal(row.combo, true); assert.equal(row.codes, 'A003 + A005'); assert.equal(row.comboTag, '2 间组合'); assert.equal(row.volText, '11.5m³');
  assert.equal(row.name, '组合仓 A003 + A005', '原 name 字段不变，别的页面照用');
  assert.equal(row.totalText, '整期 ' + R('core/pricing').yuan(row.rentTotal));
  const single = finder.buildMatch(stores, ctx(NEED, true)).cards[0].lines[0];
  assert.deepEqual([single.combo, single.codes, single.comboTag], [false, 'A003', '']);
  const guest = finder.buildMatch(stores, ctx(NEED, false)).cards[0].lines[0];
  assert.equal(guest.totalText, '', '未登录不产出整期金额');
});

test('用仓位置面板进出场：打开先渲染再展开，关闭先收起再卸载；快速开关以最后一次为准；卸载后定时器不再写数据', async () => {
  fresh(NEED, true);
  const c = env.newComponent('components/mk-location-panel/index', {});
  assert.deepEqual([c.data.show, c.data.open], [false, false]);
  c.setData({ visible: true }); assert.deepEqual([c.data.show, c.data.open], [true, false]);
  await tick(60); assert.deepEqual([c.data.show, c.data.open], [true, true]);
  c.setData({ visible: false }); assert.deepEqual([c.data.show, c.data.open], [true, false], '关闭动画期间仍在渲染');
  await tick(320); assert.deepEqual([c.data.show, c.data.open], [false, false]);
  // 快速连点：开 → 关 → 开，最终是打开
  c.setData({ visible: true }); c.setData({ visible: false }); c.setData({ visible: true });
  await tick(320); assert.deepEqual([c.data.show, c.data.open], [true, true]);
  // 开 → 立刻关：最终卸载，不会停在半开
  c.setData({ visible: false }); c.setData({ visible: true }); c.setData({ visible: false });
  await tick(320); assert.deepEqual([c.data.show, c.data.open], [false, false]);
  // 中途退出：打开后立刻卸载组件，延时回调不再 setData
  c.setData({ visible: true }); c.__detach();
  await tick(80); assert.equal(c.data.open, false, '卸载后不再展开');
});

test('价格变化反馈：改需求后需求条与价格各重放一次；连续触发只留最后一次；页面卸载后不再写数据', async () => {
  fresh(NEED, true);
  const pg = env.newPage('pages/stores/index', {}); await tick();
  assert.deepEqual([pg.data.priceBump, pg.data.needBump], ['', '']);
  pg.onDemandChange(); pg.onDemandChange(); pg.onDemandChange();
  assert.equal(pg.data.priceBump, '', '重放前先清空类名');
  await tick(60); assert.deepEqual([pg.data.priceBump, pg.data.needBump], ['mk-bump', 'mk-bump']);
  pg.onDemandChange(); pg.onUnload(); await tick(60);
  assert.equal(pg.data.priceBump, '', '卸载后延时回调不再写类名');
  // 仓位推荐：首次进入不做；租期变了价格不同才做；同一结果再刷新不做
  fresh(NEED, true);
  const mp = env.newPage('pages/match/index', {}); mp.onShow(); await tick(80);
  assert.equal(mp.data.priceBump, '', '首次进入不做');
  await mp.refresh(); await tick(60); assert.equal(mp.data.priceBump, '', '价格没变不做');
  state.setTerm(12); await mp.refresh(); await tick(60); assert.equal(mp.data.priceBump, 'mk-bump');
  state.setTerm(3); mp.refresh(); mp.onUnload(); await tick(80);
  assert.ok(typeof motion.dispose === 'function');
});

test('筛选条与面板的呈现：已选数量是数字角标；下拉带展开动效类、箭头旋转类；面板里类型成标签、门店数成说明；费用明细里折扣成标签', async () => {
  fresh(NEED, true);
  const pg = env.newPage('pages/stores/index', {}); await tick();
  pg.onSheet(tap({ k: 'services' })); pg.onOfferOption(tap({ k: 'promo' })); pg.onSheetConfirm(); await tick();
  assert.deepEqual([pg.data.svcLabel, pg.data.svcN, pg.data.svcOn], ['服务', 1, true]);
  // 快速连点同一项：开 → 关 → 开，状态与点击次数一致
  pg.onSheet(tap({ k: 'sort' })); pg.onSheet(tap({ k: 'sort' })); pg.onSheet(tap({ k: 'sort' })); assert.equal(pg.data.sheet, 'sort');
  pg.onSheet(tap({ k: 'distance' })); assert.equal(pg.data.sheet, 'distance'); pg.onSheetClose(); assert.equal(pg.data.sheet, '');
  const w = read('pages/stores/index.wxml');
  assert.ok(/class="sl-drop mk-drop-in"/.test(w)); assert.ok(/mk-rot \{\{sheet === 'sort' \? 'mk-rot--on' : ''\}\}/.test(w)); assert.ok(/sl-mask mk-scrim-in/.test(w));
  assert.ok(/\.mk-scrim-in/.test(read('styles/motion.wxss')));
  const c = env.newComponent('components/mk-location-panel/index', {}); c.setData({ visible: true }); await tick();
  c.onInput({ detail: { value: '望京' } });
  assert.deepEqual(c.data.resAreas.map((x) => [x.name, x.tag, x.sub]), [['望京', '商圈', '2 家门店']]);
  assert.equal(c.data.byArea, '按商圈');
  const mp = env.newPage('pages/match/index', {}); mp.onShow(); await tick(80);
  mp.onFees({ detail: { unitId: mp.data.cards[0].lines[0].id } }); await tick();
  assert.deepEqual([mp.data.fees.rows[0].sub, mp.data.fees.rows[0].tag], ['6个月', '7折']);
});
