// REVIEW-02 回归评审修复｜订单与租后域：C2-01 入仓指引固定带门店地址、C2-02 当前状态并入页顶状态头、C2-03 续租进度副文案在费用小节已展示时省略、
// C2-04 有对照行也合并费用行与合计行、C2-05 订单详情卡下只留三行、C2-07 入仓指引入口一屏只留一处、C2-08 订单列表空态按钮、C2-09 接收邮箱带名称、
// C2-12 退仓类型只读行、C2-13 已取消 / 已超时金额减淡、C2-14 / E2-09 列表卡店名两行与公共标签类、C2-17 押金页副标题带店名、C2-18 渐显顺序。
// 在假的 wx 环境里跑，验证的是代码逻辑与模板结构，不是微信真实渲染。日期一律相对今天。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), routes = R('services/routes'), api = R('services/api'), scenarios = R('mock/scenarios');
const order = R('core/order'), A = R('core/config-after');
const { db, mk } = R('services/mock-ext/_db');
const view = R('services/order-view'), TA = R('i18n/after'), TT = R('i18n/trade');
env.loadApp();
const S = order.STAGE, H = 3600e3, DAY = 24 * H;
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 15));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const base = (r) => r.replace(/^\//, '');
const D0 = Object.assign({}, A.demo);
function fresh() {
  state.reset(); env.nav.length = 0; env.mode = 'ok';
  db.orders.length = 0; db.leads.length = 0; db.messages.length = 0; db.seq = 0; db.seeded = true; db.kv = {}; db.sms = {};
  scenarios.write({ scenario: '', stock: 'normal', events: {}, net: 'instant' });
  state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
  Object.assign(A.demo, { storeQuoteMs: 0, inspectMs: 0, refundMs: 0, invoiceProcessMs: 0, invoiceIssueMs: 0, identityMs: 0, autoRefresh: false });
}
test.after(() => Object.assign(A.demo, D0));
const now = () => Date.now();
const active = (more) => mk(Object.assign({ store: 'SIM_BJ01', units: ['SIM_BJ01_U03'], months: 12, agoDays: 40, startAt: now() - 39 * DAY, stage: S.ACTIVE }, more));
const endingIn = (days, more) => { const o = active(Object.assign({ stage: S.EXPIRING }, more)); o.lease.end = now() + days * DAY; return o; };
const page = async (name, q) => { const pg = env.newPage(base(routes[name]), q || {}); if (pg.__shown && pg.__shown.then) await pg.__shown; await tick(30); return pg; };

test('C2-01 / C2-02 入仓指引：「门店地址」固定是到店与进仓第一行；租用状态在页顶状态头，页面末尾不再有「当前状态」一节', async () => {
  fresh();
  const o = active(), pg = await page('ACCESS', { id: o.id });
  assert.equal(pg.data.st, 'allowed');
  assert.deepEqual([pg.data.arr.rows[0].k, pg.data.arr.rows[0].v], ['门店地址', o.store.address], '有到店资料时也带地址');
  assert.equal(pg.data.arr.rows.filter((r) => r.k === '门店地址').length, 1, '地址只出一行');
  assert.deepEqual([pg.data.head.title, pg.data.head.tag, pg.data.head.tone], ['入仓指引', '租用中', 'ok']); assert.deepEqual(pg.data.head.subs, ['订单号 ' + o.no]);
  assert.equal(pg.data.lease, undefined);
  // 没有到店资料的门店走兜底，同样第一行是地址
  const real = api.getStoreArrival; api.getStoreArrival = () => Promise.resolve({ profile: {} });
  const fb = await page('ACCESS', { id: o.id }); api.getStoreArrival = real;
  assert.equal(fb.data.arr.rows[0].k, '门店地址'); assert.equal(fb.data.arr.rows[0].v, o.store.address);
  // 各租用状态的标签
  const tags = {};
  for (const [k, more] of [['upcoming', { stage: S.PAID, agoDays: 1, startAt: now() + 5 * DAY }], ['expired', { stage: S.OVERDUE, months: 1 }], ['returning', { stage: S.EXITING, patch: () => ({ exit: { status: 'waiting', date: '2026-12-01' } }) }], ['ended', { stage: S.ENDED }]]) {
    fresh(); const x = active(more), p = await page('ACCESS', { id: x.id }); tags[k] = [p.data.head.tag, p.data.head.tone];
  }
  assert.deepEqual(tags, { upcoming: ['待起租', 'ok'], expired: ['租期已到期', 'err'], returning: ['退仓处理中', 'warn'], ended: ['已退仓', 'info'] });
  const w = read('pkg-after/access/index.wxml');
  assert.match(w, /<mk-after-head title="\{\{head\.title\}\}" tag="\{\{head\.tag\}\}" tone="\{\{head\.tone\}\}" subs="\{\{head\.subs\}\}" \/>/);
  assert.ok(!/T\.x\.status|mk-after-tag/.test(w), '末尾的「当前状态」单行已并入状态头');
  assert.ok(w.indexOf('<mk-after-head') < w.indexOf('<mk-order-card'));
  assert.match(read('pkg-after/access/index.json'), /"mk-after-head"/);
});

test('C2-03 / C2-04 续租：有费用小节时进度第 1、2 步不重复月数与月价；等报价态照写；有对照行时费用行与合计行也合并', async () => {
  fresh();
  const hold = A.demo.storeQuoteMs; A.demo.storeQuoteMs = 3600e3; // 先停在等报价
  const o = endingIn(10, { factor: 0.6 }), pg = await page('RENEW', { id: o.id });
  assert.equal(pg.data.st, 'form'); assert.deepEqual(pg.data.steps.map((s) => s.s), ['', '', '', '', '']);
  assert.equal(pg.data.form.rule.indexOf(' 个月'), -1, 'C2-16：数字与「个月」之间不空格'); assert.match(pg.data.form.rule, /^可续租 1–\d+个月，累计租期不超过 \d+个月$/);
  await pg.onSubmit(); await pg.refresh();
  assert.equal(pg.data.st, 'quote_pending'); assert.equal(pg.data.card, null); assert.equal(pg.data.steps[0].s, '续租 12个月', '没有费用小节：第 1 步保留月数');
  A.demo.storeQuoteMs = hold; await pg.refresh(); if (pg.data.st !== 'quote_ready') await pg.refresh();
  assert.equal(pg.data.st, 'quote_ready'); assert.ok(pg.data.card);
  assert.deepEqual(pg.data.steps.slice(0, 2).map((s) => s.s), ['', ''], '费用小节已写月数与算式，进度里不再重复');
  assert.deepEqual(pg.data.steps.map((s) => s.cls).slice(0, 3), ['done', 'done', 'cur'], '步骤状态不变');
  const c = pg.data.card;
  assert.equal(c.ref.k, '现行折扣价'); assert.deepEqual(c.one, { k: '续租应付', sub: c.main.sub, tag: '6折', amt: c.total.amt }); assert.equal(pg.data.bar.amt, c.total.amt);
  assert.ok(c.sec && c.keep, '算式与沿用折扣说明仍在');
  await pg.onConfirm(); await pg.onPayConfirm();
  assert.equal(pg.data.st, 'completed'); assert.deepEqual(pg.data.steps.slice(0, 2).map((s) => s.s), ['', '']); assert.match(pg.data.steps[4].s, /^新租期至 /, '生效步的新租期保留');
  pg.onUnload();
  const w = read('pkg-after/renew/index.wxml');
  assert.ok(w.indexOf('wx:if="{{card.one}}"') < w.indexOf('wx:if="{{card.ref}}"'), '对照行跟在合并行之后');
});

test('C2-05 / C2-07 订单详情：卡下不再重复租期两行；入仓指引入口一屏只留一处', async () => {
  const open = async (o) => page('ORDER_DETAIL', { id: o.id });
  fresh();
  let pg = await open(active());
  assert.deepEqual(pg.data.progress.map((r) => r.k), ['押金']);
  assert.ok(pg.data.services.every((r) => r.a !== 'access'), '订单服务不再有「入仓指引」行');
  assert.equal(pg.data.arrivalRow, true, '租用中：入口在门店服务「到店与进仓指引」');
  env.nav.length = 0; pg.onAct({ currentTarget: { dataset: { a: 'arrival' } } }); assert.equal(env.nav[0].url, routes.ACCESS + '?id=' + pg.data.order.id); pg.onUnload();
  fresh(); pg = await open(active({ stage: S.PAID, agoDays: 1, startAt: now() + 5 * DAY }));
  assert.equal(pg.data.phase, 'upcoming'); assert.equal(pg.data.bar.secondary.a, 'access'); assert.equal(pg.data.arrivalRow, false, '待起租：底栏已有入仓指引，门店服务那行不出');
  assert.ok(pg.data.services.every((r) => r.a !== 'access')); assert.ok(pg.data.grid.some((g) => g.a === 'call'), '联系门店仍在'); pg.onUnload();
  fresh(); pg = await open(endingIn(10));
  assert.deepEqual(pg.data.progress.map((r) => r.k), ['剩余租期', '押金']); pg.onUnload();
  fresh(); pg = await open(active({ stage: S.PAID, agoDays: 1, startAt: now() + 5 * DAY, identity: false }));
  assert.deepEqual(pg.data.progress.map((r) => r.k), ['实名认证', '押金']); assert.ok(pg.data.services.some((r) => r.a === 'identity'), '未实名的实名认证行不受影响'); assert.equal(pg.data.arrivalRow, true); pg.onUnload();
  fresh(); pg = await open(active({ stage: S.PENDING, agoDays: 0 }));
  assert.equal(pg.data.arrivalRow, false); assert.deepEqual(pg.data.progress, []); pg.onUnload();
  assert.match(read('pkg-trade/order/index.wxml'), /<view wx:if="\{\{arrivalRow\}\}"[^>]*data-a="arrival"/);
});

test('C2-08 / C2-13 / C2-14 / C2-18 / E2-09 订单列表与列表卡', () => {
  fresh();
  const ol = read('pages/orders/index.wxml');
  assert.equal((ol.match(/class="mk-btn mk-btn--md mk-empty-btn"/g) || []).length, 2, '两个空态按钮都带最小宽');
  assert.match(ol, /class="mk-press ol-item mk-fade-in mk-fade-in--d\{\{index < 5 \? index : 5\}\}"/, '第 6 张起沿用末档延时，不会先于前面的卡出现');
  const dead = active({ stage: S.CANCELLED, agoDays: 1 }), live = active();
  assert.equal(view.card(dead, now()).amtOff, true); assert.equal(view.card(live, now()).amtOff, false); assert.equal(view.card({ store: live.store, units: live.units, months: 6 }, now()).amtOff, false);
  const w = read('components/mk-order-card/index.wxml'), css = read('components/mk-order-card/index.wxss');
  assert.match(w, /class="mk-num oc-amt \{\{v\.amtOff \? 'oc-amt--off' : ''\}\}"/);
  assert.match(w, /class="mk-tag mk-tag--\{\{v\.stageTone\}\} mk-tag--end oc-tag">\{\{v\.stageLabel\}\}/); assert.ok(!/oc-tag--/.test(w + css), '不再自带一套标签色');
  for (const t of ['ok', 'warn', 'err', 'info', 'end']) assert.match(read('app.wxss'), new RegExp('\\.mk-tag--' + t + '\\b'), t);
  assert.match(w, /<text class="mk-title mk-grow oc-name2">\{\{v\.storeName\}\}<\/text>/); assert.match(css, /\.oc-name2 \{[^}]*-webkit-line-clamp: 2/);
});

test('C2-09 / C2-10 发票：单条已开具记录的邮箱行带「接收邮箱」；开票未成功的「您可以」是动作短语', async () => {
  fresh();
  const o = active(), id = o.id;
  await api.submitInvoice({ id, payment_id: 'INITIAL', kind: 'personal', title: '张三', email: 'one@163.com' });
  let pg = await page('INVOICE', { id });
  for (let i = 0; i < 3 && pg.data.st !== 'issued'; i++) await pg.refresh();
  assert.equal(pg.data.st, 'issued'); assert.deepEqual([pg.data.records[0].emailK, pg.data.records[0].email], ['接收邮箱', 'one@163.com']);
  assert.match(read('pkg-after/invoice/index.wxml'), /wx:if="\{\{item\.emailK\}\}"[^>]*>\s*<text class="iv-rec-formk">\{\{item\.emailK\}\}<\/text><text class="iv-rec-formv">\{\{item\.email\}\}<\/text>/);
  assert.equal(TA.invoice.failFixes, '更正抬头、企业税号或邮箱后重新提交'); assert.ok(!/ · /.test(TA.invoice.failFixes));
});

test('C2-12 / C2-17 / E2-17 退仓类型只读行、押金页副标题带店名、文字链箭头用图标', async () => {
  fresh();
  const x = read('pkg-after/exit/index.wxml');
  assert.match(x, /<view wx:if="\{\{!form\.canEarly\}\}" class="mk-between ex-ro"><text class="mk-sub">\{\{T\.x\.typeLabel\}\}<\/text><text class="ex-ro-v">\{\{form\.typeText\}\}<\/text><\/view>/);
  assert.ok(!/class="af-input"><text>\{\{form\.typeText\}\}/.test(x), '只读时不用输入框外观');
  const o = active(), ex = await page('EXIT', { id: o.id });
  assert.ok(ex.data.form && ex.data.form.typeText, '只读行的文字仍由页面给');
  const dp = await page('DEPOSIT', { id: o.id });
  assert.deepEqual(dp.data.head.subs.slice(0, 2), [o.store.name, '订单号 ' + o.no]);
  assert.ok(!/›/.test(TA.deposit.more)); assert.match(read('pkg-after/deposit/index.wxml'), /class="dp-more"[^>]*bindtap="onMore"[^>]*><text class="mk-link">\{\{T\.d\.more\}\}<\/text><image class="mk-icon" src="\/assets\/icons\/chev-brand\.svg" \/>/);
  assert.ok(TT.order.arrival && TT.order.access);
});
