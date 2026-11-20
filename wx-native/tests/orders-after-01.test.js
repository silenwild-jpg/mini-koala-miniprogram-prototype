// ORDERS-AFTER-01：租后演示场景与租后事件（演示工具页的开关）、待验仓阶段判定、租后页的加载骨架与公共样式。
// 在假的 wx 环境里跑，验证的是代码逻辑，不是微信真实渲染。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), api = R('services/api'), demo = R('services/demo'), scenarios = R('mock/scenarios'), order = R('core/order');
const { db, mk, REASON } = R('services/mock-ext/_db');
const view = R('services/order-view'), after = R('core/after'), A = R('core/config-after');
env.loadApp();
const S = order.STAGE, DAY = 86400e3;
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 15));
const rejects = (p, code) => assert.rejects(p, (e) => e.code === code, code);
const D0 = Object.assign({}, A.demo);
function fresh() {
  state.reset(); env.nav.length = 0; db.orders.length = 0; db.seq = 0; db.seeded = true; db.kv = {}; db.sms = {}; db.messages.length = 0;
  scenarios.write({ scenario: '', stock: 'normal', events: {}, net: 'instant' });
  state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
  Object.assign(A.demo, { storeQuoteMs: 20, inspectMs: 20, refundMs: 20, invoiceProcessMs: 10, invoiceIssueMs: 20, identityMs: 20, autoRefresh: false });
}
test.after(() => Object.assign(A.demo, D0));
const active = (more) => mk(Object.assign({ store: 'SIM_BJ01', units: ['SIM_BJ01_U05'], months: 12, agoDays: 40, startAt: Date.now() - 39 * DAY, stage: S.ACTIVE }, more));
const get = (o) => api.getAfterOrder({ id: o.id });
const first = async (id) => { assert.ok(demo.applyScenario(id)); return (await api.getOrders({}))[0]; };

test('租后演示场景：每个场景打开对应页面就是描述的那一步', async () => {
  let o = await first('member_renew_quote');
  let v = after.renewView(o, Date.now());
  assert.equal(v.state, 'quote_ready'); assert.equal(v.months, 6); assert.ok(o.renew.amount > 0); assert.equal(view.phase(o, Date.now()), 'renewal');
  o = await first('member_exit_clearing');
  assert.equal(o.stage, S.EXITING); assert.equal(after.exitState(o, Date.now()), 'requested'); assert.equal(view.phase(o, Date.now()), 'returning');
  o = await first('member_inspect_failed');
  assert.equal(after.exitState(o, Date.now()), 'failed'); assert.equal(o.exit.fail_reason, REASON.inspect);
  o = await first('member_refund_failed');
  assert.equal(o.stage, S.ENDED); assert.equal(after.depositState(o), 'refund_failed'); assert.equal(o.deposit.fail_reason, REASON.refund);
  o = await first('member_invoice_failed');
  const iv = after.invoiceView(o); assert.equal(iv.state, 'issue_failed'); assert.equal(iv.failed.fail_reason, REASON.invoice);
  o = await first('member_identity_mismatch');
  assert.equal(after.identityState(o), 'mismatch'); assert.equal(view.phase(o, Date.now()), 'identity');
});

test('已取消、已超时的演示订单没有付款和签署记录，不能办理租后服务', async () => {
  assert.ok(demo.applyScenario('member_closed'));
  const os = await api.getOrders({});
  assert.deepEqual(os.map((o) => o.stage).sort(), [S.CANCELLED, S.EXPIRED].sort());
  os.forEach((o) => { assert.equal(o.pay.paid_at, 0); assert.equal(o.contract.signed, false); assert.equal(after.isPaid(o), false); });
  assert.deepEqual(os.map((o) => view.phase(o, Date.now())).sort(), ['cancelled', 'expired']);
});

test('多门店多笔订单：8 笔、3 家门店，订单列表各阶段都能出现', async () => {
  assert.ok(demo.applyScenario('member_multi'));
  const pg = env.newPage('pages/orders/index', {}); pg.onShow(); await tick(40);
  assert.equal(pg.data.orders.length, 8); assert.equal(new Set(pg.data.orders.map((o) => o.store.id)).size, 3);
  const ph = pg.data.orders.map((o) => view.phase(o, Date.now()));
  ['pending', 'upcoming', 'active', 'renewal_pending', 'expiring', 'inspection', 'ended', 'cancelled'].forEach((p) => assert.ok(ph.includes(p), p + ' 不在 ' + ph.join(',')));
  for (let i = 1; i < pg.data.orders.length; i++) assert.ok(pg.data.orders[i - 1].created_at >= pg.data.orders[i].created_at, '按下单时间倒序');
});

test('待验仓：已申请验仓的订单阶段是「等待门店验仓」，不再并进「退仓处理中」', async () => {
  fresh();
  const o = active();
  await api.requestExit({ id: o.id, type: 'early', date: after.exitDateRange(o, 'early', Date.now()).def });
  assert.equal(view.phase(o, Date.now()), 'returning');
  scenarios.setEvent('store_hold', true);
  await api.requestInspection({ id: o.id });
  assert.equal(view.phase(o, Date.now()), 'inspection'); assert.equal(view.head(o, Date.now()).title, '等待门店验仓');
});

test('事件·续租支付失败：下一次续租付款失败并自动关闭，再付成功', async () => {
  fresh();
  const o = active();
  await api.requestRenewal({ id: o.id, months: 3 }); await tick(40); await get(o);
  await api.confirmRenewal({ id: o.id });
  scenarios.setEvent('renew_pay_fail', true);
  await rejects(api.payRenewal({ id: o.id }), 'PAY_FAILED');
  assert.equal(after.renewView(o, Date.now()).state, 'payment_failed'); assert.equal(scenarios.eventOn('renew_pay_fail'), false);
  await api.payRenewal({ id: o.id });
  assert.equal(o.renew.status, 'paid'); assert.equal(o.months, 15);
});

test('事件·验仓未通过：门店返回未通过并带原因，重新申请后通过，押金进入退款', async () => {
  fresh();
  const o = active();
  await api.requestExit({ id: o.id, type: 'early', date: after.exitDateRange(o, 'early', Date.now()).def });
  scenarios.setEvent('inspect_fail', true);
  await api.requestInspection({ id: o.id }); await tick(40); await get(o);
  assert.equal(o.exit.status, 'failed'); assert.equal(o.exit.fail_reason, REASON.inspect); assert.equal(o.stage, S.EXITING); assert.equal(scenarios.eventOn('inspect_fail'), false);
  assert.ok(db.messages.some((m) => m.type === 'exit' && /未通过/.test(m.title)));
  await api.requestInspection({ id: o.id }); assert.equal(o.exit.fail_reason, ''); await tick(40); await get(o);
  assert.equal(o.exit.status, 'passed'); assert.equal(o.stage, S.ENDED); assert.equal(o.deposit.status, 'refunding');
});

test('事件·押金退款未成功：退款到点返回未成功，押金页进入失败态', async () => {
  fresh();
  const o = active();
  await api.requestExit({ id: o.id, type: 'early', date: after.exitDateRange(o, 'early', Date.now()).def });
  await api.requestInspection({ id: o.id }); await tick(40); await get(o);
  scenarios.setEvent('refund_fail', true); await tick(40); await get(o);
  assert.equal(after.depositState(o), 'refund_failed'); assert.equal(o.deposit.fail_reason, REASON.refund); assert.equal(o.deposit.refunded, 0);
  const pg = env.newPage('pkg-after/deposit/index', { id: o.id }); pg.onShow(); await tick(40);
  assert.equal(pg.data.fail, true); assert.equal(pg.data.reason, REASON.refund); assert.equal(pg.data.head.tone, 'err');
});

test('事件·开票未成功：开具到点返回未成功，更正后重新提交能开出', async () => {
  fresh();
  const o = active(), form = { id: o.id, kind: 'personal', title: '张明', email: 'a@example.com' };
  scenarios.setEvent('invoice_fail', true);
  await api.submitInvoice(form); await tick(40); await get(o);
  let v = after.invoiceView(o); assert.equal(v.state, 'issue_failed'); assert.equal(v.failed.fail_reason, REASON.invoice);
  await api.submitInvoice(Object.assign({}, form, { title: '张明明' })); await tick(40); await get(o);
  v = after.invoiceView(o); assert.equal(v.records.length, 1); assert.equal(v.records[0].status, 'issued'); assert.equal(v.records[0].title, '张明明');
});

test('事件·实名信息不一致：付款后补认证也适用', async () => {
  fresh();
  const o = mk({ store: 'SIM_BJ02', units: ['SIM_BJ02_U02'], months: 6, agoDays: 2, startAt: Date.now() + 3 * DAY, stage: S.PAID, identity: false });
  scenarios.setEvent('idv_mismatch', true);
  await api.submitOrderIdentity({ id: o.id, name: '张明', id_no: '110101199001010012' });
  assert.equal(o.identity_status, 'mismatch'); assert.equal(scenarios.eventOn('idv_mismatch'), false);
  await api.submitOrderIdentity({ id: o.id, name: '张明', id_no: '110101199001010012' }); await tick(40); await get(o);
  assert.equal(o.identity_status, 'verified');
});

test('事件·门店暂不处理：报价、验仓、开票、实名都停在等待中，关闭后继续；续租报价过期不受影响', async () => {
  fresh();
  scenarios.setEvent('store_hold', true);
  const a = active(), b = active({ units: ['SIM_BJ01_U03'] }), c = mk({ store: 'SIM_BJ02', units: ['SIM_BJ02_U02'], months: 6, agoDays: 2, startAt: Date.now() + 3 * DAY, stage: S.PAID, identity: false });
  await api.requestRenewal({ id: a.id, months: 3 });
  await api.submitInvoice({ id: a.id, kind: 'personal', title: '张明', email: 'a@example.com' });
  await api.requestExit({ id: b.id, type: 'early', date: after.exitDateRange(b, 'early', Date.now()).def }); await api.requestInspection({ id: b.id });
  await api.submitOrderIdentity({ id: c.id, name: '张明', id_no: '110101199001010012' });
  await tick(60); await get(a); await get(b); await get(c);
  assert.equal(a.renew.status, 'submitted'); assert.equal(a.invoice.records[0].status, 'submitted'); assert.equal(b.exit.status, 'waiting'); assert.equal(c.identity_status, 'pending');
  scenarios.setEvent('store_hold', false); await get(a); await get(b); await get(c);
  assert.equal(a.renew.status, 'quoted'); assert.equal(a.invoice.records[0].status, 'issued'); assert.equal(b.exit.status, 'passed'); assert.equal(c.identity_status, 'verified');
  scenarios.setEvent('store_hold', true); a.renew.quoted_at = Date.now() - 30 * 3600e3; await get(a);
  assert.equal(a.renew.status, 'expired');
});

test('租后各页：场景直达的失败态渲染出原因；底栏按钮按种类给按压样式', async () => {
  let o = await first('member_inspect_failed');
  let pg = env.newPage('pkg-after/exit/index', { id: o.id }); pg.onShow(); await tick(40);
  assert.equal(pg.data.fail, true); assert.equal(pg.data.order.exit.fail_reason, REASON.inspect); assert.equal(pg.data.bar.btns[0].act, 'inspect');
  o = await first('member_invoice_failed');
  pg = env.newPage('pkg-after/invoice/index', { id: o.id }); pg.onShow(); await tick(40);
  assert.equal(pg.data.fail, true); assert.equal(pg.data.reason, REASON.invoice); assert.equal(pg.data.form.title, '北京示例科技有限公司');
  o = await first('member_renew_quote');
  pg = env.newPage('pkg-after/renew/index', { id: o.id }); pg.onShow(); await tick(40);
  assert.equal(pg.data.st, 'quote_ready'); assert.ok(pg.data.card && pg.data.bar);
  for (const p of ['renew', 'exit', 'deposit', 'invoice']) {
    const w = fs.readFileSync(path.join(root, 'pkg-after', p, 'index.wxml'), 'utf8');
    assert.ok(/af-btn--\{\{item\.kind\}\}" hover-class="\{\{item\.off \? 'none'/.test(w), p + ' 底栏按钮按压样式应随种类变化');
  }
});

test('演示工具页：租后事件单独一节，开关状态跟着变', async () => {
  fresh();
  const pg = env.newPage('pkg-dev/lab/index', {}); await tick();
  assert.deepEqual(pg.data.afterEvents.map((x) => x.id), ['renew_pay_fail', 'inspect_fail', 'refund_fail', 'invoice_fail', 'store_hold']);
  pg.onEvent({ currentTarget: { dataset: { id: 'store_hold' } } });
  assert.equal(pg.data.afterEvents.find((x) => x.id === 'store_hold').on, true); assert.equal(pg.data.events.some((x) => x.on), false);
});

test('租后七页：公共样式只有一份，加载态用骨架屏', () => {
  const shared = fs.readFileSync(path.join(root, 'pkg-after/after.wxss'), 'utf8');
  ['af-body', 'af-bar-btn', 'af-btn--danger', 'af-input', 'af-seg-item'].forEach((c) => assert.ok(shared.includes('.' + c), c));
  for (const p of ['renew', 'exit', 'deposit', 'invoice', 'identity', 'access', 'econtract']) {
    const css = fs.readFileSync(path.join(root, 'pkg-after', p, 'index.wxss'), 'utf8'), w = fs.readFileSync(path.join(root, 'pkg-after', p, 'index.wxml'), 'utf8');
    assert.ok(css.startsWith('@import "../after.wxss";'), p); assert.ok(!/\.af-(body|bar-btn|acts|input)\b/.test(css), p + ' 不应再带公共样式');
    assert.ok(w.includes('skeleton="{{3}}"'), p);
  }
  assert.ok(fs.readFileSync(path.join(root, 'pages/orders/index.wxml'), 'utf8').includes('skeleton="{{3}}"'));
});
