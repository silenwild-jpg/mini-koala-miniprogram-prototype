// FIND-TRADE-01：库存档位、交易事件（演示工具页的开关）、预计用仓时间范围校验、找仓与交易两域的空态 / 提示条迁移。
// 在假的 wx 环境里跑，验证的是代码逻辑，不是微信真实渲染。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), api = R('services/api'), demo = R('services/demo'), scenarios = R('mock/scenarios'), order = R('core/order');
const { db } = R('services/mock-ext/_db');
const view = R('services/order-view'), CT = R('core/config-trade'), finder = R('services/finder'), pd = R('services/page-data');
env.loadApp();
const S = order.STAGE, DAY = 86400e3;
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 15));
const rejects = (p, code) => assert.rejects(p, (e) => e.code === code, code);
const ID = { name: '张明', id_no: '110101199001010012' };
const U3 = 'SIM_BJ01_U03';
const START = view.ymd(Date.now() + 11 * DAY);
function fresh() {
  state.reset(); env.nav.length = 0; db.orders.length = 0; db.seq = 0; db.seeded = true; db.kv = {}; db.sms = {};
  scenarios.write({ stock: 'normal', events: {}, net: 'instant' });
  state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
}
const avail = (s) => s.units.filter((u) => u.status === 'available').length;
async function draft() { await api.verifyIdentity(ID); return api.getOrderDraft({ unit_ids: [U3], months: 6 }); }
const create = (d, extra) => api.createOrder(Object.assign({ unit_ids: [U3], months: 6, start_date: START, quoted_at: d.quoted_at, expect_payable: d.quote.payable }, extra));

test('库存档位：紧张 = 每店最多 1 个可租；附近满仓 = 最近 4 家为 0；全城满仓 = 全部为 0；切回正常后恢复', async () => {
  fresh();
  const base = await api.getStores({ city: '北京' }), total = base.reduce((n, s) => n + avail(s), 0);
  demo.setStock('tight');
  const tight = await api.getStores({ city: '北京' });
  tight.forEach((s, i) => assert.equal(avail(s), avail(base[i]) > 0 ? 1 : 0, s.id));
  assert.ok(new Set(tight.map((s) => (s.units.find((u) => u.status === 'available') || {}).volume)).size > 3, '各店留下的仓位大小应不同');
  demo.setStock('nearby_soldout');
  const near = await api.getStores({ city: '北京' });
  const n4 = near.slice().sort((a, b) => a.distance_km - b.distance_km).slice(0, 4);
  n4.forEach((s) => assert.equal(avail(s), 0, s.id));
  assert.ok(near.some((s) => avail(s) > 0));
  demo.setStock('city_soldout');
  (await api.getStores({ city: '北京' })).forEach((s) => assert.equal(avail(s), 0));
  await rejects(api.getQuote({ unit_ids: [U3], months: 6 }), 'NOT_FOUND');
  assert.equal((await api.getOrderDraft({ unit_ids: [U3], months: 6 })).available, false);
  demo.setStock('normal');
  assert.equal((await api.getStores({ city: '北京' })).reduce((n, s) => n + avail(s), 0), total);
});

test('库存档位下找仓各状态都能生成：全城满仓时仓位推荐为「无匹配」，附近满仓时仍有推荐', async () => {
  fresh(); state.patch('location', { status: 'granted' });
  state.setRequirement({ capacity_m3: 3.5, input_unit: 'm3', input_value: 3.5, term_months: 6 });
  for (const id of ['normal', 'tight', 'nearby_soldout', 'city_soldout']) {
    demo.setStock(id);
    const res = finder.buildMatch(await pd.cityStores(), pd.ctx());
    if (id === 'city_soldout') { assert.equal(res.cards.length, 0); assert.equal(res.mode, 'none'); }
    else assert.ok(res.cards.length > 0, id);
  }
  demo.setStock('normal');
});

test('交易事件·下单时变价：签署时返回 CONFLICT 并带新报价；只触发一次', async () => {
  fresh(); const d = await draft();
  demo.toggleEvent('price_changed'); assert.equal(demo.current().events.price_changed, true);
  await assert.rejects(create(d), (e) => e.code === 'CONFLICT' && e.data.quote.payable > d.quote.payable);
  assert.equal(scenarios.eventOn('price_changed'), false);
  const d2 = await api.getOrderDraft({ unit_ids: [U3], months: 6 });
  assert.equal((await create(d2)).stage, S.PENDING);
});

test('交易事件·仓位被别人租走：下单返回 NOT_FOUND，之后门店里该仓位不可租，草稿标记不可租', async () => {
  fresh(); const d = await draft();
  demo.toggleEvent('unit_gone');
  await rejects(create(d), 'NOT_FOUND');
  assert.equal(scenarios.eventOn('unit_gone'), false);
  const st = await api.getStore({ id: 'SIM_BJ01' });
  assert.notEqual(st.units.find((u) => u.id === U3).status, 'available');
  assert.equal((await api.getOrderDraft({ unit_ids: [U3], months: 6 })).available, false);
});

test('交易事件·支付失败与实名不一致：各触发一次后恢复正常', async () => {
  fresh();
  demo.toggleEvent('idv_mismatch');
  await rejects(api.verifyIdentity(ID), 'MISMATCH');
  const d = await draft();
  const od = await api.signContract({ order_id: (await create(d)).id });
  demo.toggleEvent('pay_fail');
  assert.equal((await api.payOrder({ order_id: od.id })).stage, S.FAILED);
  const r = await api.resumeFailedOrder({ order_id: od.id }); assert.equal(r.ok, true);
  assert.ok([S.PAID, S.ACTIVE].includes((await api.payOrder({ order_id: od.id })).stage));
});

test('交易事件·报价 30 秒失效、待支付 60 秒超时、有一张可用券：打开期间一直生效', async () => {
  fresh(); await api.verifyIdentity(ID);
  ['quote_short', 'pending_short', 'coupon'].forEach((id) => demo.toggleEvent(id));
  const d = await api.getOrderDraft({ unit_ids: [U3], months: 12 });
  assert.equal(d.expires_at - d.quoted_at, scenarios.SHORT.quoteMs);
  assert.equal(d.coupons.length, 1); assert.ok(d.quote.coupon_discount > 0);
  const q = await api.getQuote({ unit_ids: [U3], months: 12 }); assert.equal(q.expires_at - q.quoted_at, scenarios.SHORT.quoteMs);
  const od = await api.createOrder({ unit_ids: [U3], months: 12, start_date: START, quoted_at: d.quoted_at, expect_payable: d.quote.payable });
  assert.ok(od.pay.expires_at - Date.now() <= scenarios.SHORT.pendingMs);
  assert.equal(scenarios.eventOn('quote_short'), true);
  await rejects(api.createOrder({ unit_ids: ['SIM_BJ01_U05'], months: 12, start_date: START, quoted_at: Date.now() - scenarios.SHORT.quoteMs - 1 }), 'EXPIRED');
  scenarios.write({ events: {} });
  const e = await api.getOrderDraft({ unit_ids: ['SIM_BJ01_U05'], months: 12 }); assert.equal(e.expires_at - e.quoted_at, 3 * 3600e3);
});

test('演示工具页：库存档位单选、交易事件开关，状态显示跟着变', async () => {
  fresh();
  const pg = env.newPage('pkg-dev/lab/index', {}); await tick();
  assert.equal(pg.data.stocks.length, 4); assert.equal(pg.data.events.length + pg.data.afterEvents.length + pg.data.leadEvents.length, demo.EVENTS.length); assert.equal(pg.data.events.length, 7);
  pg.onStock({ currentTarget: { dataset: { id: 'tight' } } });
  assert.deepEqual(pg.data.stocks.filter((x) => x.on).map((x) => x.id), ['tight']);
  pg.onEvent({ currentTarget: { dataset: { id: 'pay_fail' } } });
  assert.equal(pg.data.events.find((x) => x.id === 'pay_fail').on, true);
  pg.onEvent({ currentTarget: { dataset: { id: 'pay_fail' } } });
  assert.equal(pg.data.events.find((x) => x.id === 'pay_fail').on, false);
  demo.setStock('normal');
});

test('预计用仓时间：接口不收范围外的日期；确认订单页把链接带入的范围外日期改成最早可选日', async () => {
  fresh(); const d = await draft();
  const min = view.ymd(Date.now() + CT.startDate.minDays * DAY), max = view.ymd(Date.now() + CT.startDate.maxDays * DAY);
  for (const bad of ['2020-01-01', view.ymd(Date.now()), view.ymd(Date.now() + (CT.startDate.maxDays + 1) * DAY)]) await rejects(create(d, { start_date: bad }), 'INVALID');
  assert.equal(db.orders.length, 0);
  let pg = env.newPage('pkg-trade/confirm/index', { unit: U3, term: '6', date: '2020-01-01' }); await tick();
  assert.equal(view.ymd(pg.data.cardOrder.lease.start), min);
  pg.onDate({ detail: { value: '2020-01-01' } }); assert.equal(view.ymd(pg.data.cardOrder.lease.start), min);
  pg.onDate({ detail: { value: max } }); assert.equal(view.ymd(pg.data.cardOrder.lease.start), max);
  pg.onHide();
  pg = env.newPage('pkg-trade/confirm/index', { unit: U3, term: '6', date: max }); await tick();
  assert.equal(view.ymd(pg.data.cardOrder.lease.start), max); pg.onHide();
  assert.equal((await create(d, { start_date: max })).stage, S.PENDING);
});

test('确认订单页：演示工具页打开「仓位被别人租走」后，签署时页面进入「所选仓位已不可租」', async () => {
  fresh(); await api.verifyIdentity(ID);
  const pg = env.newPage('pkg-trade/confirm/index', { unit: U3, term: '6' }); await tick();
  demo.toggleEvent('unit_gone');
  pg.onAgree(); pg.onSign(); pg.onSignConfirm(); await tick(40);
  assert.equal(pg.data.gone, true); assert.equal(pg.data.bar.disabled, true); assert.equal(db.orders.length, 0);
  pg.onHide();
});

test('找仓与交易两域不再手写空态和提示条：统一用 mk-empty / mk-notice', () => {
  const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
  const files = ['pages/match/index', 'pages/stores/index', 'pages/store/detail', 'pkg-trade/confirm/index', 'pkg-trade/quick/index', 'pkg-trade/order/index', 'pkg-trade/agreement/index'];
  for (const f of files) {
    assert.ok(!/class="[^"]*\b(mt-empty|sd-empty|sl-empty|cf-notice|ag-notice|cf-banner|cf-gone|qk-gone|mt-gone|sd-gone|od-note)\b/.test(read(f + '.wxml')), f);
    assert.ok(!/\.(mt-empty|sd-empty|sl-empty|cf-notice|ag-notice|cf-banner|cf-gone|qk-gone|mt-gone|sd-gone|od-note)\b/.test(read(f + '.wxss')), f + '.wxss');
  }
  assert.equal((read('pages/store/detail.wxml').match(/<mk-empty/g) || []).length, 3);
  assert.equal((read('pkg-trade/confirm/index.wxml').match(/<mk-notice/g) || []).length, 3);
});
