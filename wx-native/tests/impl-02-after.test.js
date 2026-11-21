// IMPL-02 租后域：订单卡紧凑摘要（M-28）、续租单行费用合并（M-29）、退仓安排并入进度第一步（M-30）、申请验仓前改提示条（M-31）、
// 押金部分退还并入顶部金额区（M-32）、单条已开具记录并入发票文件（M-33）。
// 在假的 wx 环境里跑，验证的是代码逻辑与模板结构，不是微信真实渲染。日期一律相对今天。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), routes = R('services/routes'), api = R('services/api'), scenarios = R('mock/scenarios');
const order = R('core/order'), after = R('core/after'), A = R('core/config-after'), pricing = R('core/pricing');
const { db, mk } = R('services/mock-ext/_db');
const view = R('services/order-view'), TA = R('i18n/after');
env.loadApp();
const S = order.STAGE, H = 3600e3, DAY = 24 * H, yuan = pricing.yuan;
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
const raw = (id) => db.orders.find((o) => o.id === id);
const page = async (name, q) => { const pg = env.newPage(base(routes[name]), q || {}); if (pg.__shown && pg.__shown.then) await pg.__shown; await tick(30); return pg; };
const card = (o, props) => env.newComponent('components/mk-order-card/index', Object.assign({ order: o }, props));

test('M-28 订单卡 mode="brief"：店名、编号标签加容量、起止日期三行；原有形态的数据与模板分支不变', () => {
  fresh();
  const o = active(), b = card(o, { mode: 'brief' }), d = card(o), l = card(o, { variant: 'list' });
  assert.equal(b.data.briefSpan, view.ymd(o.lease.start) + ' 至 ' + view.ymd(o.lease.end)); assert.match(b.data.briefSpan, /^\d{4}-\d\d-\d\d 至 \d{4}-\d\d-\d\d$/);
  assert.deepEqual(b.data.v, d.data.v, 'brief 不改 v'); assert.deepEqual(d.data.v, view.card(o, now(), { showKm: false })); assert.equal(l.data.v.lineText, 'A003 · 3.5m³ · 12个月');
  assert.deepEqual([b.data.v.storeName, b.data.v.unitCodes, b.data.v.unitVol], [o.store.name, ['A003'], '3.5m³']);
  // 组合仓：多个编号标签并排，容量是合计
  const combo = active({ units: ['SIM_BJ01_U03', 'SIM_BJ01_U05'] }), cb = card(combo, { mode: 'brief' });
  assert.equal(cb.data.v.unitCodes.length, 2); assert.equal(cb.data.v.unitVol, view.card(combo, now()).unitVol);
  // 下单前的草稿只有起租日；没有日期时不出第三行
  assert.equal(card({ store: o.store, units: o.units, months: 6, lease: { start: o.lease.start } }, { mode: 'brief' }).data.briefSpan, view.ymd(o.lease.start));
  assert.equal(card({ store: o.store, units: o.units, months: 6 }, { mode: 'brief' }).data.briefSpan, '');
  assert.equal(card(null, { mode: 'brief' }).data.v, null);
  const w = read('components/mk-order-card/index.wxml'), i = w.indexOf('<view wx:elif="{{v}}" class="mk-card oc-card {{dead ? \'oc-off\' : \'\'}}">');
  assert.ok(i > 0, '原有形态整块保留在 wx:elif 分支');
  const brief = w.slice(0, i);
  assert.match(brief, /^<view wx:if="\{\{v && mode === 'brief'\}\}" class="oc-brief">/);
  assert.match(brief, /wx:for="\{\{v\.unitCodes\}\}" wx:key="\*this" class="mk-unitno oc-no"/); assert.match(brief, /\{\{v\.unitVol\}\}/); assert.match(brief, /\{\{briefSpan\}\}/);
  assert.ok(!/<image|bindtap|stageLabel|payableText|address/.test(brief), '不带图、状态、金额、地址，不可点');
  for (const p of ['identity', 'access', 'renew', 'exit']) assert.match(read('pkg-after/' + p + '/index.wxml'), /<mk-order-card order="\{\{order\}\}" mode="brief" \/>/, p);
});

test('M-29 续租：只有一行费用时与合计合并成一行；有对照行、没有合计时保持原样；底栏金额保留', async () => {
  fresh();
  // 不沿用原折扣、门店报价与常规价相同：报价待确认只有一行费用
  const o = endingIn(10), id = o.id;
  const pg = await page('RENEW', { id });
  assert.equal(pg.data.st, 'form'); assert.ok(!pg.data.card.total && !pg.data.card.one, '填写态没有合计行，不合并');
  await pg.onSubmit(); await pg.refresh();
  assert.equal(pg.data.st, 'quote_ready'); assert.equal(pg.data.card.ref, null);
  const amt = yuan(raw(id).renew.amount);
  assert.deepEqual(pg.data.card.one, { k: '续租应付', sub: pg.data.card.main.sub, tag: '', amt }); assert.equal(pg.data.card.total.amt, amt);
  assert.deepEqual([pg.data.bar.lab, pg.data.bar.amt], ['续租应付', amt], '底栏金额保留'); assert.ok(pg.data.card.sec, '算式还在');
  await pg.onConfirm(); assert.equal(pg.data.st, 'payment_pending'); assert.equal(pg.data.card.one.k, '续租应付');
  await pg.onPayLater(); assert.equal(pg.data.st, 'cancelled'); assert.equal(pg.data.card.one.amt, amt); assert.equal(pg.data.bar.amt, amt);
  await pg.onPayConfirm(); assert.equal(pg.data.st, 'completed'); assert.deepEqual([pg.data.card.one.k, pg.data.card.one.amt], ['已付', amt]);
  pg.onUnload();
  // 沿用原折扣：报价带「现行折扣价」对照行 → 多行，保持原样
  const k = endingIn(10, { factor: 0.6 }), kp = await page('RENEW', { id: k.id });
  await kp.onSubmit(); await kp.refresh();
  assert.equal(kp.data.st, 'quote_ready'); assert.equal(kp.data.card.ref.k, '现行折扣价'); assert.equal(kp.data.card.one, undefined); assert.equal(kp.data.card.total.k, '续租应付'); assert.equal(kp.data.card.main.tag, '6折');
  kp.onUnload();
  const w = read('pkg-after/renew/index.wxml');
  assert.match(w, /<view wx:if="\{\{card\.one\}\}" class="af-total af-total--one">/); assert.match(w, /<view wx:else class="af-fee-row">/); assert.match(w, /wx:if="\{\{card\.total && !card\.one\}\}" class="af-total"/);
});

test('M-30 / M-31 退仓：已提交后不再单列「退仓安排」，类型与计划取空日期在进度第一步；申请验仓前是提示条', async () => {
  fresh();
  const o = endingIn(3), id = o.id, pg = await page('EXIT', { id });
  assert.equal(pg.data.st, 'form'); assert.equal(pg.data.form.type, 'expiry'); assert.equal(pg.data.before, false);
  const date = pg.data.form.date;
  pg.onSubmit(); await pg.onConfirm();
  assert.equal(pg.data.st, 'requested'); assert.equal(pg.data.plan, undefined);
  assert.equal(pg.data.steps[0].s, '到期退仓 · 计划取空 ' + date, '原「退仓类型」「计划取空日期」两行的内容都在'); assert.equal(pg.data.before, true); assert.equal(pg.data.form, null);
  raw(id).lease.end = now() - DAY; await pg.refresh(); // 租期已结束：申请验仓不再弹提前结算层
  assert.equal(pg.data.before, true); await pg.onInspect();
  assert.equal(pg.data.st, 'waiting'); assert.equal(pg.data.before, false); assert.ok(pg.data.waitNote); assert.ok(pg.data.steps[0].s.indexOf('到期退仓') === 0);
  await pg.refresh(); assert.equal(pg.data.st, 'passed'); assert.ok(pg.data.steps[0].s.indexOf(date) > 0, '验仓通过后第一步仍写着类型与日期');
  pg.onUnload();
  // 验仓未通过：失败说明与提示条都在
  fresh(); scenarios.write({ scenario: '', stock: 'normal', events: { inspect_fail: true }, net: 'instant' });
  const f = endingIn(3), fp = await page('EXIT', { id: f.id });
  fp.onSubmit(); await fp.onConfirm(); raw(f.id).lease.end = now() - DAY; await fp.refresh(); await fp.onInspect(); await fp.refresh();
  assert.equal(fp.data.st, 'failed'); assert.equal(fp.data.fail, true); assert.equal(fp.data.before, true); assert.ok(fp.data.steps[0].s.indexOf('到期退仓') === 0);
  fp.onUnload();
  const w = read('pkg-after/exit/index.wxml');
  assert.ok(!/plan/.test(w)); assert.equal((w.match(/T\.x\.arrange/g) || []).length, 1, '只剩填写态的小节标题');
  assert.match(w, /<view wx:if="\{\{before\}\}" class="mk-sec"><mk-notice text="\{\{T\.x\.beforeInspectNote\}\}" \/><\/view>/); assert.ok(!/T\.x\.beforeInspectText/.test(w));
  assert.equal(TA.exit.beforeInspectNote, TA.exit.beforeInspect + '，' + TA.exit.beforeInspectText, '提示条单句 = 原标题 + 原句');
});

test('M-32 押金：部分退还态顶部是实际退还大数字 + 订单押金、已扣费用两行；其它状态顶部不变', async () => {
  fresh();
  const o = active(); o.stage = S.ENDED; Object.assign(o.deposit, { status: 'partial', pending_fee: 40, refunded: o.deposit.amount - 40 });
  let pg = await page('DEPOSIT', { id: o.id });
  assert.equal(pg.data.st, 'refunded_partial');
  {
    assert.deepEqual(pg.data.part, { label: '实际退还', amt: yuan(o.deposit.amount - 40), rows: [{ k: '订单押金', v: yuan(o.deposit.amount) }, { k: '已扣费用', v: '−¥40' }], note: '已扣费用明细可向门店查询。' });
    assert.equal(pg.data.settle, undefined); assert.equal(pg.data.amount, yuan(o.deposit.amount)); assert.deepEqual(pg.data.bar.btns.map((b) => b.act), ['back', 'call']);
  }
  pg.onUnload();
  const full = active(); full.stage = S.ENDED; Object.assign(full.deposit, { status: 'refunded', pending_fee: 0, refunded: full.deposit.amount });
  pg = await page('DEPOSIT', { id: full.id });
  assert.equal(pg.data.st, 'refunded'); assert.equal(pg.data.part, null); assert.equal(pg.data.amount, yuan(full.deposit.amount)); pg.onUnload();
  const held = await page('DEPOSIT', { id: active().id }); assert.equal(held.data.st, 'held'); assert.equal(held.data.part, null); held.onUnload();
  const bad = active(); bad.stage = S.ENDED; bad.deposit.status = 'failed';
  const bp = await page('DEPOSIT', { id: bad.id }); assert.equal(bp.data.st, 'refund_failed'); assert.equal(bp.data.part, null); assert.equal(bp.data.fail, true); bp.onUnload();
  const w = read('pkg-after/deposit/index.wxml');
  assert.ok(!/settle/.test(w)); assert.match(w, /<view wx:if="\{\{part\}\}" class="dp-amtbox">/); assert.match(w, /<view wx:else class="dp-amtbox">\s*<view class="mk-row"><text class="mk-sub">\{\{T\.d\.amountLabel\}\}<\/text>/);
});

test('M-33 发票：已开具且只有一条记录时发票形式并入这条记录、不再单列发票文件；多条记录保持原样', async () => {
  fresh();
  const o = endingIn(5), id = o.id;
  A.demo.invoiceProcessMs = 1e7; // 先停在已提交
  await api.submitInvoice({ id, payment_id: 'INITIAL', kind: 'personal', title: '张三', email: 'one@163.com' });
  let pg = await page('INVOICE', { id });
  assert.equal(pg.data.st, 'submitted'); assert.equal(pg.data.records[0].form, undefined); assert.deepEqual(pg.data.file, []); assert.ok(pg.data.sla);
  A.demo.invoiceProcessMs = 0; await pg.refresh(); if (pg.data.st !== 'issued') await pg.refresh();
  assert.equal(pg.data.st, 'issued'); assert.equal(pg.data.records.length, 1);
  assert.deepEqual(pg.data.records[0].form, { k: '发票形式', v: '电子发票' }); assert.equal(pg.data.records[0].email, 'one@163.com', '接收邮箱在记录里'); assert.deepEqual(pg.data.file, []);
  assert.deepEqual(pg.data.bar.btns.map((b) => b.text), ['发送到邮箱', '下载发票']); assert.equal(pg.data.records[0].acts, false);
  pg.onUnload();
  // 再续租一次并给续租付款开票：两条记录都已开具 → 发票文件一节保持原样
  await api.requestRenewal({ id, months: 6 }); await api.getAfterOrder({ id }); await api.confirmRenewal({ id }); await api.payRenewal({ id });
  await api.submitInvoice({ id, payment_id: 'RENEWAL1', kind: 'personal', title: '张三', email: 'two@163.com' }); await api.getAfterOrder({ id }); await api.getAfterOrder({ id });
  pg = await page('INVOICE', { id }); if (pg.data.st !== 'issued') await pg.refresh();
  assert.equal(pg.data.st, 'issued'); assert.equal(pg.data.records.length, 2);
  assert.deepEqual(pg.data.file, [{ k: '发票形式', v: '电子发票' }, { k: '接收邮箱', v: 'two@163.com' }]); assert.ok(pg.data.records.every((r) => r.form === undefined && r.acts === true));
  assert.deepEqual(pg.data.bar.btns.map((b) => b.act), ['back']);
  pg.onUnload();
  const w = read('pkg-after/invoice/index.wxml');
  assert.match(w, /<view wx:if="\{\{item\.form\}\}" class="mk-sub iv-rec-s iv-rec-form">/); assert.match(w, /<view wx:if="\{\{file\.length\}\}" class="mk-sec">/);
});
