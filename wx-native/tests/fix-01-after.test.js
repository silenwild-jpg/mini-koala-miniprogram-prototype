// FIX-01 订单与租后域：评审问题 C-01 ～ C-21、A-02 / A-03 / A-05 ～ A-08、D-01 / D-14 / D-17、B-09 / B-15 / B-17 / B-20、S-08
// 与口径 R-01 / R-02 / R-03 / R-04 / R-07 / R-08 / R-09 / R-21 的修复用例。
// 在假的 wx 环境里跑，验证的是代码逻辑，不是微信真实渲染。日期一律相对今天。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), routes = R('services/routes'), api = R('services/api'), demo = R('services/demo'), scenarios = R('mock/scenarios');
const order = R('core/order'), model = R('core/order-model'), after = R('core/after'), A = R('core/config-after'), CA = R('core/config-account'), rules = R('core/account'), pricing = R('core/pricing');
const { db, mk } = R('services/mock-ext/_db');
const view = R('services/order-view'), TT = R('i18n/trade'), TA = R('i18n/after');
env.loadApp();
const S = order.STAGE, H = 3600e3, DAY = 24 * H, yuan = pricing.yuan;
const toasts = []; wx.showToast = (o) => toasts.push(o.title);
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 15));
const rejects = (p, code) => assert.rejects(p, (e) => e.code === code, code);
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const base = (r) => r.replace(/^\//, '');
const D0 = Object.assign({}, A.demo);
function fresh() {
  state.reset(); env.nav.length = 0; env.mode = 'ok'; toasts.length = 0;
  db.orders.length = 0; db.leads.length = 0; db.messages.length = 0; db.seq = 0; db.seeded = true; db.kv = {}; db.sms = {};
  scenarios.write({ scenario: '', stock: 'normal', events: {}, net: 'instant' });
  state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
  Object.assign(A.demo, { storeQuoteMs: 0, inspectMs: 0, refundMs: 0, invoiceProcessMs: 0, invoiceIssueMs: 0, identityMs: 0, autoRefresh: false });
}
test.after(() => Object.assign(A.demo, D0));
const now = () => Date.now();
// A003（月基价 400）。active：租 12 个月、已用 40 天；near：3 天后到期（已进到期退仓窗口）；over：已到期 5 天
const active = (more) => mk(Object.assign({ store: 'SIM_BJ01', units: ['SIM_BJ01_U03'], months: 12, agoDays: 40, startAt: now() - 39 * DAY, stage: S.ACTIVE }, more));
const endingIn = (days, more) => { const o = active(Object.assign({ stage: S.EXPIRING, factor: 0.6 }, more)); o.lease.end = now() + days * DAY; return o; };
const raw = (id) => db.orders.find((o) => o.id === id);
const page = async (name, q) => { const pg = env.newPage(base(routes[name]), q || {}); if (pg.__shown && pg.__shown.then) await pg.__shown; await tick(30); return pg; };
const first = async (id) => { assert.ok(demo.applyScenario(id)); return (await api.getOrders({}))[0]; };
const taskCard = async () => { const c = env.newComponent('components/mk-task-card/index', {}); await c.refresh(); return c; };
const listCard = (o) => env.newComponent('components/mk-order-card/index', { order: o, variant: 'list' }).data.v;
async function renewOnce(id, months) { await api.requestRenewal({ id, months }); await api.getAfterOrder({ id }); await api.confirmRenewal({ id }); return api.payRenewal({ id }); }

// ---------- P0 ----------
test('C-01：续租后费用明细按付款分段，「已付」是累计、「已省」跟下单那一段走；列表卡的租期与金额同一口径', async () => {
  fresh();
  const o = endingIn(10), id = o.id, end0 = o.lease.end; // 12 个月 6 折：¥240/月 × 12 = ¥2,880，押金 ¥240，管理费 ¥50，下单已付 ¥3,170
  assert.deepEqual([o.quote.rent_total, o.quote.payable], [2880, 3170]);
  let f = view.fees(o, now());
  assert.deepEqual(f.total, { label: '已付', amt: '¥3,170' }); assert.ok(!f.rows.some((r) => r.id === 'paid0'), '没续租过：不分段');
  assert.deepEqual([listCard(o).lineText, listCard(o).payableText], ['A003 · 3.5m³ · 12个月', '¥3,170']);
  const x = await renewOnce(id, 6); // 首次续租沿用 6 折：¥240 × 6 = ¥1,440
  assert.equal(x.months, 18); assert.deepEqual(x.renewals.map((r) => [r.months, r.amount, r.monthly, r.from, r.to]), [[6, 1440, 240, end0, x.lease.end]]);
  f = view.fees(x, now());
  const rent = f.rows.find((r) => r.id === 'rent');
  assert.deepEqual([rent.sub, rent.amt, rent.sec], ['12个月', '¥2,880', '¥240/月 × 12个月'], '整期租金一行是下单时的租期与金额，不再拿累计租期配原金额');
  assert.deepEqual([f.rows.find((r) => r.id === 'saved').amt, f.rows.find((r) => r.id === 'saved').sub], ['¥1,920', '较月基价 ¥400/月'], '已省 = (400 − 240) × 12，与上面 12 个月同一段');
  assert.deepEqual(f.rows.slice(-2).map((r) => [r.k, r.sub, r.amt]), [['下单支付小计', '12个月', '¥3,170'], ['续租租金', '6个月', '¥1,440']]);
  assert.equal(f.rows[f.rows.length - 1].sec, '¥240/月 × 6个月 · ' + view.ymd(now()) + ' 支付'); assert.equal(f.rows[f.rows.length - 1].tag, '6折');
  assert.deepEqual(f.total, { label: '累计已付', amt: '¥4,610' }, '3,170 + 1,440');
  assert.equal(after.paidTotal(x), 4610);
  const c = listCard(x);
  assert.deepEqual([c.lineText, c.payableText, c.termText], ['A003 · 3.5m³ · 18个月（含续租）', '¥4,610', '18个月（含续租）']);
  assert.equal(env.newComponent('components/mk-fee-detail/index', { order: x, locked: true }).data.total.amt, '¥4,610');
  const pg = await page('ORDER_DETAIL', { id });
  assert.ok(pg.data.progress.some((r) => r.k === '累计租期' && r.v === '18个月')); pg.onHide();
  // 第二次续租：再加一段，合计继续累加
  const y = await renewOnce(id, 3);
  f = view.fees(y, now());
  assert.deepEqual(f.rows.filter((r) => /^renew/.test(r.id)).map((r) => [r.sub, r.amt]), [['6个月', '¥1,440'], ['3个月', yuan(y.renewals[1].amount)]]);
  assert.equal(f.total.amt, yuan(3170 + 1440 + y.renewals[1].amount)); assert.equal(listCard(y).lineText, 'A003 · 3.5m³ · 21个月（含续租）');
});

// ---------- P1 ----------
test('C-02 / A-02：押金退款未成功归入押金处理阶段；列表、详情、首页任务卡都写明「退款未成功」，不做恢复入口（PR-42 待裁）', async () => {
  const o = await first('member_refund_failed');
  assert.equal(o.deposit.status, 'failed'); assert.equal(view.phase(o, now()), 'refund'); assert.equal(view.variant(o, 'refund'), 'refund_failed');
  assert.deepEqual([listCard(o).stageLabel, listCard(o).stageTone], ['退款未成功', 'err']);
  const pg = await page('ORDER_DETAIL', { id: o.id });
  assert.deepEqual([pg.data.head.title, pg.data.head.tag, pg.data.head.tone], ['押金退款未成功', '退款未成功', 'err']);
  assert.deepEqual(pg.data.progress.find((r) => r.k === '押金'), { k: '押金', v: '退款未成功', warn: true });
  const row = pg.data.services.find((r) => r.k === '押金进度'); assert.deepEqual([row.v, row.on], ['退款未成功', true]);
  assert.ok(pg.data.services.some((r) => r.k === '退仓进度' && r.v === '验仓通过'));
  assert.equal(pg.data.note.text, '原因：' + o.deposit.fail_reason);
  assert.deepEqual([pg.data.bar.primary.t, pg.data.bar.primary.a, pg.data.bar.secondary.t, pg.data.bar.secondary.a], ['查看押金进度', 'deposit', '联系门店', 'call']);
  assert.equal(pg.data.storeSvc, true, '有门店服务卡，可联系门店'); pg.onHide();
  const c = await taskCard();
  assert.equal(c.data.show, true, '首页任务卡出现');
  assert.deepEqual([c.data.main.key, c.data.main.title, c.data.main.badge, c.data.main.badgeTone, c.data.main.primary.t], ['refund', '押金处理中', '退款未成功', 'err', '查看押金进度']);
  assert.deepEqual(c.data.main.facts, [{ v: '处理异常', l: '押金进度' }]);
  env.nav.length = 0; c.onAction({ currentTarget: { dataset: { a: 'deposit' } } }); assert.equal(env.nav[0].url, routes.DEPOSIT + '?id=' + o.id); c.__detach();
  // 退款处理中：同一阶段，文字是「退款处理中」
  o.deposit.status = 'refunding';
  assert.equal(view.stageLabel(o, now()).label, '押金处理中'); assert.equal(view.head(o, now()).tag, '退款处理中');
});

test('C-03 / A-03：验仓未通过、退仓待清空各有标签、状态头、主按钮；订单服务「退仓进度」四种文字', async () => {
  let o = await first('member_inspect_failed');
  assert.equal(view.phase(o, now()), 'returning'); assert.deepEqual([listCard(o).stageLabel, listCard(o).stageTone], ['验仓未通过', 'err']);
  let pg = await page('ORDER_DETAIL', { id: o.id });
  assert.deepEqual([pg.data.head.title, pg.data.head.tag, pg.data.bar.primary.t, pg.data.bar.primary.a], ['验仓未通过', '需重新验仓', '重新申请验仓', 'exit']);
  assert.deepEqual(pg.data.services.find((r) => r.a === 'exit'), { a: 'exit', icon: 'cal-ink', k: '退仓进度', v: '需重新验仓', on: true });
  assert.equal(pg.data.note.text, '原因：' + o.exit.fail_reason); assert.ok(pg.data.subs.includes('计划取空 ' + o.exit.date)); pg.onHide();
  let c = await taskCard();
  assert.deepEqual([c.data.main.title, c.data.main.badge, c.data.main.badgeTone, c.data.main.primary.t, c.data.main.helpText], ['验仓未通过', '需重新验仓', 'err', '重新申请验仓', o.exit.fail_reason]);
  assert.deepEqual(c.data.main.facts.map((x) => [x.v, x.l]), [['需重新验仓', '验仓结果'], [o.exit.date, '计划取空']]);
  env.nav.length = 0; c.onAction({ currentTarget: { dataset: { a: 'reinspect' } } }); assert.equal(env.nav[0].url, routes.EXIT + '?id=' + o.id); c.__detach();

  o = await first('member_exit_clearing');
  assert.equal(listCard(o).stageLabel, '退仓待清空');
  pg = await page('ORDER_DETAIL', { id: o.id });
  assert.deepEqual([pg.data.head.title, pg.data.head.tag, pg.data.bar.primary.t, pg.data.services.find((r) => r.a === 'exit').v], ['退仓已提交', '待清空', '去申请验仓', '已提交']); pg.onHide();
  c = await taskCard();
  assert.deepEqual([c.data.main.title, c.data.main.badge, c.data.main.primary.t, c.data.main.facts[0].l], ['退仓已提交', '待清空', '去申请验仓', '计划取空']); c.__detach();
  // 等门店验仓（C-13）：列表与详情都叫「待验仓」；主按钮「查看验仓进度」，次按钮「联系门店」
  raw(o.id).exit.status = 'waiting'; raw(o.id).exit.inspect_at = now(); Object.assign(A.demo, { inspectMs: 60000 });
  pg = await page('ORDER_DETAIL', { id: o.id });
  assert.deepEqual([pg.data.head.title, pg.data.head.tag, pg.data.bar.primary.t, pg.data.bar.secondary.t, pg.data.services.find((r) => r.a === 'exit').v], ['等待门店验仓', '待验仓', '查看验仓进度', '联系门店', '待验仓']);
  assert.equal(view.stageLabel(pg.data.order, now()).label, '待验仓'); pg.onHide();
  c = await taskCard();
  assert.deepEqual([c.data.main.title, c.data.main.badge, c.data.main.helpText], ['等待门店验仓', '待验仓', '门店将在 1 天内完成验仓，押金以验仓结果为准。']); c.__detach();
});

test('C-04 / R-01：到期退仓在到期日前 7 天起才可提交，更早只有提前退仓', async () => {
  fresh();
  assert.equal(A.exit.expiryAdvanceDays, 7);
  const far = active(), t = now();
  assert.equal(after.canExpiryExit(far, t), false); assert.equal(after.expiryExitFrom(far), after.ymd(far.lease.end - 7 * DAY));
  await rejects(api.requestExit({ id: far.id, type: 'expiry', date: after.ymd(far.lease.end) }), 'INVALID');
  assert.equal(raw(far.id).stage, S.ACTIVE, '没有进入退仓流程，仍可续租'); assert.equal(after.renewView(raw(far.id), t).state, 'form');
  let pg = await page('EXIT', { id: far.id });
  assert.deepEqual([pg.data.form.type, pg.data.form.canEarly, pg.data.form.typeText], ['early', false, '提前退仓']); assert.match(pg.data.form.tip, /^到期退仓自 \d{4}-\d\d-\d\d 起可提交/);
  pg.onUnload();
  const edge = endingIn(7), out = endingIn(8); // 正好提前 7 天：可以；提前 8 天：不可以
  assert.equal(after.canExpiryExit(edge, t), true); assert.equal(after.canExpiryExit(out, t), false);
  pg = await page('EXIT', { id: edge.id });
  assert.deepEqual([pg.data.form.type, pg.data.form.canEarly, pg.data.form.tip], ['expiry', true, '']);
  const x = await api.requestExit({ id: edge.id, type: 'expiry', date: after.ymd(edge.lease.end) });
  assert.deepEqual([x.stage, x.exit.status, x.exit.early, x.exit.prev_stage], [S.EXITING, 'requested', false, S.EXPIRING]); pg.onUnload();
});

test('C-04 / R-01：到期退仓提交后、门店验仓完成前可撤回，订单回到原阶段；验仓通过后和提前退仓不能撤回', async () => {
  fresh();
  const o = endingIn(3), id = o.id, end = after.ymd(o.lease.end);
  await api.requestExit({ id, type: 'expiry', date: end });
  assert.equal(after.canWithdrawExit(raw(id)), true);
  const pg = await page('EXIT', { id });
  assert.equal(pg.data.st, 'requested'); assert.equal(pg.data.canWithdraw, true); assert.match(read('pkg-after/exit/index.wxml'), /wx:if="\{\{canWithdraw\}\}"[\s\S]*bindtap="onWithdraw"/);
  let modal = null; const keep = wx.showModal; wx.showModal = (m) => { modal = m; m.success({ confirm: true }); };
  try { pg.onWithdraw(); await tick(30); } finally { wx.showModal = keep; }
  assert.deepEqual([modal.title, modal.confirmText, modal.cancelText], ['确认撤回退仓申请？', '确认撤回', '暂不撤回']);
  assert.deepEqual([raw(id).stage, raw(id).exit], [S.EXPIRING, null], '回到提交前的阶段');
  assert.equal(pg.data.st, 'form'); assert.ok(toasts.includes('退仓申请已撤回')); assert.ok(db.messages.some((m) => m.title === TA.messages.demo.exitWithdrawn));
  assert.equal(after.renewView(raw(id), now()).state, 'form', '撤回后又可以续租'); pg.onUnload();
  // 已申请验仓、门店还没验：仍可撤回；验仓未通过：可撤回；验仓通过：不可
  Object.assign(A.demo, { inspectMs: 60000 });
  await api.requestExit({ id, type: 'expiry', date: end }); await api.requestInspection({ id, early_confirmed: true });
  assert.equal(raw(id).exit.status, 'waiting'); assert.equal((await api.cancelExit({ id })).exit, null);
  await api.requestExit({ id, type: 'expiry', date: end }); raw(id).exit.status = 'failed'; assert.equal((await api.cancelExit({ id })).stage, S.EXPIRING);
  await api.requestExit({ id, type: 'expiry', date: end }); Object.assign(raw(id).exit, { status: 'passed' }); raw(id).stage = S.ENDED;
  await rejects(api.cancelExit({ id }), 'CONFLICT');
  // 撤回时已过到期日：记为已逾期
  const late = endingIn(1); await api.requestExit({ id: late.id, type: 'expiry', date: after.ymd(late.lease.end) }); raw(late.id).lease.end = now() - 2 * DAY;
  assert.equal((await api.cancelExit({ id: late.id })).stage, S.OVERDUE);
  // 提前退仓：没有口径，不提供撤回
  const e = active(); await api.requestExit({ id: e.id, type: 'early', date: after.ymd(now()) });
  assert.equal(after.canWithdrawExit(raw(e.id)), false); await rejects(api.cancelExit({ id: e.id }), 'CONFLICT');
  await rejects(api.cancelExit({ id: 'NOPE' }), 'NOT_FOUND'); state.reset(); await rejects(api.cancelExit({ id }), 'UNAUTHENTICATED');
});

test('C-04 / R-01：租期结束日之前申请验仓，先提示按提前退仓结算，确认后按提前退仓走；到期日当天起照常', async () => {
  fresh(); Object.assign(A.demo, { inspectMs: 60000 });
  const o = endingIn(3), id = o.id, end = after.ymd(o.lease.end), today = after.ymd(now());
  await api.requestExit({ id, type: 'expiry', date: end });
  assert.equal(after.inspectionIsEarly(raw(id), now()), true);
  await rejects(api.requestInspection({ id }), 'EARLY_CONFIRM'); assert.equal(raw(id).exit.status, 'requested', '没确认前状态不变');
  const pg = await page('EXIT', { id });
  const fee = after.earlyExitEstimate(raw(id), today).fee;
  assert.equal(pg.data.earlyText, '现在申请验仓早于计划取空日期 ' + end + '，将按提前退仓结算。');
  assert.deepEqual(pg.data.earlyRows.map((r) => [r.k, r.v]).slice(0, 3), [['计划取空日期', end], ['实际取空日期', today], ['预计结算费用', '约 ' + yuan(fee)]]);
  await pg.onInspect(); assert.equal(pg.data.early, true, '先出「按提前退仓结算」弹层'); assert.equal(raw(id).exit.status, 'requested');
  pg.onEarlyClose(); assert.equal(pg.data.early, false); assert.equal(raw(id).exit.status, 'requested', '「再想想」不提交');
  await pg.onInspect(); await pg.onEarlyConfirm();
  const x = raw(id).exit;
  assert.deepEqual([x.status, x.early, x.converted, x.date, x.planned_date, x.estimate.fee], ['waiting', true, true, today, end, fee]);
  assert.equal(pg.data.st, 'waiting'); assert.equal(pg.data.plan[0].v, '提前退仓'); assert.equal(pg.data.canWithdraw, true, '原本是到期退仓，验仓完成前仍可撤回'); pg.onUnload();
  // 到期日当天申请：不算提前，不用确认
  const d0 = endingIn(0); await api.requestExit({ id: d0.id, type: 'expiry', date: after.ymd(d0.lease.end + DAY) });
  assert.equal(after.inspectionIsEarly(raw(d0.id), now()), false);
  const y = await api.requestInspection({ id: d0.id }); assert.deepEqual([y.exit.status, y.exit.early], ['waiting', false]);
});

test('C-05 / R-02：续租报价 3 天内、验仓 1 天内、开票 1 天内写在等待页上；等报价页和发票处理中有联系入口', async () => {
  fresh(); Object.assign(A.demo, { storeQuoteMs: 60000, inspectMs: 60000, invoiceProcessMs: 60000, invoiceIssueMs: 120000 });
  assert.deepEqual(A.sla, { renewQuoteDays: 3, inspectDays: 1, invoiceDays: 1 });
  const o = endingIn(3), id = o.id;
  await api.requestRenewal({ id, months: 6 });
  let pg = await page('RENEW', { id });
  assert.equal(pg.data.st, 'quote_pending'); assert.equal(pg.data.note.text, '门店将在 3 天内确认报价，确认后可在「消息」查看。');
  assert.deepEqual(pg.data.bar.btns.map((b) => [b.text, b.act]), [['返回订单详情', 'back'], ['联系门店', 'call']]);
  let called = 0; const keep = wx.makePhoneCall; wx.makePhoneCall = () => { called++; };
  try {
    pg.onBar({ currentTarget: { dataset: { act: 'call' } } }); assert.equal(called, 1); pg.onUnload();
    await api.cancelRenewal({ id }); await api.requestExit({ id, type: 'expiry', date: after.ymd(o.lease.end) }); await api.requestInspection({ id, early_confirmed: true });
    pg = await page('EXIT', { id });
    assert.equal(pg.data.st, 'waiting'); assert.equal(pg.data.waitNote, '门店将在 1 天内完成验仓，通过后押金进入退款处理。'); pg.onUnload();
    const i = active(); await api.submitInvoice({ id: i.id, kind: 'personal', title: '张三', email: 'zhangsan@163.com' });
    pg = await page('INVOICE', { id: i.id });
    assert.equal(pg.data.st, 'submitted'); assert.equal(pg.data.sla, '发票将在 1 天内开具。'); assert.deepEqual(pg.data.bar.btns.map((b) => b.text), ['返回订单详情', '联系门店']);
    pg.onBar({ currentTarget: { dataset: { act: 'call' } } }); assert.equal(called, 2); pg.onUnload();
  } finally { wx.makePhoneCall = keep; }
  for (const s of [TA.renew.pendingNote, TA.exit.waitingNote, TA.invoice.slaNote]) assert.ok(/\{n\} 天内/.test(s) && !/工作日|自然日/.test(s), s);
});

test('D-01 / R-03：批量与单笔共用一份开票记录，开过的不能重复开；两处金额都不含押金', async () => {
  fresh();
  const o = active(), id = o.id, amount = o.quote.payable - o.quote.deposit;
  assert.ok(o.quote.deposit > 0); assert.equal(after.payments(o)[0].invoice_amount, amount); assert.equal(rules.invoiceLine(o).amount, amount, '批量与单笔同一个数');
  assert.equal(rules.invoiceLine(o).rent + rules.invoiceLine(o).fee, amount);
  // 批量开票 → 单笔页看到同一条记录，不能再申请
  await api.submitEntCert({ name: '北京安贞商贸有限公司', tax: '91110105MA01K7XQ3R', licenseCount: 1, contact: '王经理', phone: '13800000001' });
  db.kv.account.cert.submitted_at -= (CA.demo.reviewSeconds + 1) * 1000; await api.getEntCert();
  const b = await api.submitBatchInvoice({ order_ids: [id], title_id: 'T1' });
  assert.equal(b.amount, amount);
  let rs = raw(id).invoice.records;
  assert.deepEqual(rs.map((r) => [r.payment_id, r.amount, r.status, r.batch_id, r.kind]), [['INITIAL', amount, 'submitted', b.id, 'enterprise']]);
  assert.equal(after.invoiceView(raw(id)).available.length, 0); assert.equal(rules.invoiceable(db.orders).length, 0, '已申请的不再出现在批量列表');
  await rejects(api.submitInvoice({ id, kind: 'personal', title: '张三', email: 'a@b.cn' }), 'CONFLICT');
  await api.getAfterOrder({ id }); assert.equal(raw(id).invoice.records[0].status, 'submitted', '批量写入的记录由批量申请推进，单笔页的演示推进不动它');
  db.kv.account.batches[0].submitted_at -= (CA.demo.reviewSeconds + 1) * 1000; await api.getBatchInvoice();
  assert.deepEqual([raw(id).invoice.records[0].status, raw(id).invoice.status], ['issued', 'issued']);
  let pg = await page('INVOICE', { id });
  assert.deepEqual([pg.data.st, pg.data.head.title, pg.data.form, pg.data.records.length], ['issued', '发票已开具', null, 1], '批量开过后，单笔页是已开具，不再是可申请');
  assert.equal(pg.data.records[0].t, '下单支付 · ' + yuan(amount)); pg.onUnload();
  await rejects(api.submitInvoice({ id, kind: 'personal', title: '张三', email: 'a@b.cn' }), 'CONFLICT');
  // 单笔开过 → 批量列表不再列；批量未成功 → 记录撤掉，付款放回可申请
  const o2 = active({ units: ['SIM_BJ01_U05'] }), o3 = active({ units: ['SIM_BJ01_U02'] });
  await api.submitInvoice({ id: o2.id, kind: 'personal', title: '张三', email: 'a@b.cn' });
  assert.equal(raw(o2.id).invoice.records[0].amount, o2.quote.payable - o2.quote.deposit);
  assert.deepEqual(rules.invoiceable(db.orders).map((x) => x.id), [o3.id]);
  scenarios.setEvent('batch_invoice_fail', true);
  await api.submitBatchInvoice({ order_ids: [o3.id], title_id: 'T1' }); assert.equal(raw(o3.id).invoice.status, 'applying');
  db.kv.account.batches[1].submitted_at -= (CA.demo.reviewSeconds + 1) * 1000; await api.getBatchInvoice();
  assert.deepEqual([raw(o3.id).invoice.records.length, raw(o3.id).invoice.status], [0, 'none']); assert.equal(after.invoiceView(raw(o3.id)).state, 'form');
  // 单笔页：押金一行标「不开票」，可开票金额写出具体数
  pg = await page('INVOICE', { id: o3.id });
  assert.deepEqual(pg.data.pays[0].split.map((s) => [s.k, s.no]), [['租金', ''], ['押金', '不开票'], ['管理费', '']]);
  assert.deepEqual([pg.data.notes[0].k, pg.data.notes[0].v], ['可开票金额', yuan(o3.quote.payable - o3.quote.deposit) + '（不含押金）']); pg.onUnload();
  // 续租过的订单：批量金额 = 下单支付（不含押金）+ 续租
  const r = endingIn(5, { units: ['SIM_BJ02_U01'] }); const rr = await renewOnce(r.id, 6);
  assert.equal(rules.invoiceLine(rr).amount, rr.quote.payable - rr.quote.deposit + rr.renewals[0].amount);
});

// ---------- P2 ----------
test('C-06：已到期的入仓指引写明原因并给去向；开门信息弹窗带「联系门店」；一键开锁提示不再指回入仓指引', async () => {
  const o = await first('member_overdue');
  let pg = await page('ACCESS', { id: o.id });
  assert.deepEqual([pg.data.st, pg.data.overdue, pg.data.lease.text], ['inactive', '租期已到期，入仓信息暂不开放。', '租期已到期']);
  assert.deepEqual(pg.data.bar.btns.map((b) => [b.text, b.act]), [['办理退仓', 'exit'], ['办理续租', 'renew']]);
  env.nav.length = 0; pg.onBar({ currentTarget: { dataset: { act: 'renew' } } }); pg.onBar({ currentTarget: { dataset: { act: 'exit' } } });
  assert.deepEqual(env.nav.map((n) => n.url), [routes.RENEW + '?id=' + o.id, routes.EXIT + '?id=' + o.id]);
  assert.match(read('pkg-after/access/index.wxml'), /wx:if="\{\{overdue\}\}"[^>]*link="\{\{T\.c\.callStore\}\}" bind:link="onCall"/);
  fresh(); const a = active(); pg = await page('ACCESS', { id: a.id });
  let called = 0; const keep = wx.makePhoneCall; wx.makePhoneCall = () => { called++; };
  try { pg.onOpen(); } finally { wx.makePhoneCall = keep; } // 假环境的弹窗默认点「确定」= 联系门店
  assert.equal(called, 1);
  assert.ok(!/入仓指引/.test(TT.order.unlockToast) && /联系门店/.test(TT.order.unlockToast)); assert.ok(!/入仓指引/.test(TT.order.unlockRule));
});

test('C-07：订单有多条开票记录时，每条已开具的记录各自能发送和下载', async () => {
  fresh();
  const o = endingIn(5), id = o.id; await renewOnce(id, 6);
  await api.submitInvoice({ id, payment_id: 'INITIAL', kind: 'personal', title: '张三', email: 'one@163.com' }); await api.getAfterOrder({ id });
  let pg = await page('INVOICE', { id });
  assert.equal(pg.data.st, 'form', '还有一笔续租付款可申请'); assert.deepEqual(pg.data.records.map((r) => [r.tag, r.acts]), [['已开具', true]]);
  let sent = null; const keep = api.sendInvoiceEmail; api.sendInvoiceEmail = (p) => { sent = p; return keep(p); };
  try {
    await pg.onSend({ currentTarget: { dataset: { id: 'INV1' } } }); assert.deepEqual(sent, { id, record_id: 'INV1' }); assert.ok(toasts.includes('已发送到 one@163.com'));
    await pg.onDownload({ currentTarget: { dataset: { id: 'INV1' } } }); await tick(); assert.ok(toasts.includes('发票文件暂时无法下载，请稍后再试'));
    pg.onUnload();
    await api.submitInvoice({ id, payment_id: 'RENEWAL1', kind: 'personal', title: '张三', email: 'two@163.com' }); await api.getAfterOrder({ id });
    pg = await page('INVOICE', { id });
    assert.equal(pg.data.st, 'issued'); assert.deepEqual(pg.data.records.map((r) => r.acts), [true, true]); assert.deepEqual(pg.data.bar.btns.map((b) => b.text), ['返回订单详情'], '多条记录时操作在各条记录上');
    await pg.onSend({ currentTarget: { dataset: { id: 'INV1' } } }); assert.equal(sent.record_id, 'INV1', '第一张也能再发');
    await pg.onSend({ currentTarget: { dataset: { id: 'INV2' } } }); assert.equal(sent.record_id, 'INV2'); pg.onUnload();
  } finally { api.sendInvoiceEmail = keep; }
  assert.match(read('pkg-after/invoice/index.wxml'), /wx:if="\{\{item\.acts\}\}"[\s\S]*data-id="\{\{item\.id\}\}" bindtap="onSend"[\s\S]*data-id="\{\{item\.id\}\}" bindtap="onDownload"/);
});

test('C-08 / C-09 / C-17：开票未成功高亮；续租待确认、待支付、付款未成功各有说法；已到期也显示续租进度', async () => {
  let o = await first('member_invoice_failed');
  let pg = await page('ORDER_DETAIL', { id: o.id });
  assert.deepEqual([pg.data.services.find((r) => r.a === 'invoice').v, pg.data.services.find((r) => r.a === 'invoice').on], ['开票未成功', true]); pg.onHide();
  o = await first('member_renew_quote');
  assert.equal(listCard(o).stageLabel, '续租待确认'); assert.notEqual(TT.stage.renewal, TT.stage.renewal_pending);
  pg = await page('ORDER_DETAIL', { id: o.id }); assert.deepEqual([pg.data.head.title, pg.data.head.tag, pg.data.bar.primary.t], ['续租报价待确认', '待确认', '确认续租报价']); pg.onHide();
  raw(o.id).renew.pay = 'failed';
  pg = await page('ORDER_DETAIL', { id: o.id });
  assert.deepEqual([pg.data.head.title, pg.data.head.tag, pg.data.head.tone, pg.data.bar.primary.t, pg.data.note.text], ['续租付款未成功', '待支付', 'err', '继续支付续租费用', TT.order.noteRenewPayFailed]);
  assert.equal(listCard(pg.data.order).stageLabel, '续租付款未成功'); pg.onHide();
  const rn = await page('RENEW', { id: o.id }); assert.equal(rn.data.head.title, '续租付款未成功', '订单详情与续租页同一个说法'); rn.onUnload();
  let c = await taskCard(); assert.deepEqual([c.data.main.title, c.data.main.primary.t, c.data.main.badge], ['续租付款未成功', '支付续租费用', '待支付']); c.__detach();
  raw(o.id).renew.pay = 'pending';
  assert.deepEqual([view.head(raw(o.id), now()).title, view.stageLabel(raw(o.id), now()).label], ['续租费用待支付', '续租待支付']);
  // 已到期且续租在办
  raw(o.id).stage = S.OVERDUE; raw(o.id).lease.end = now() - 3 * DAY; raw(o.id).renew.pay = '';
  pg = await page('ORDER_DETAIL', { id: o.id });
  assert.deepEqual([pg.data.head.title, pg.data.bar.primary.t, pg.data.bar.secondary.t], ['租期已到期', '确认续租报价', '办理退仓']);
  assert.deepEqual([pg.data.services.find((r) => r.a === 'renew').k, pg.data.services.find((r) => r.a === 'renew').v], ['续租进度', '待确认续租']); pg.onHide();
});

test('R-04 / C-14：到期日当天仍在租期内，次日起算已到期；阶段滞后时前端按日期判，不显示负数', async () => {
  fresh();
  const o = active({ stage: S.EXPIRING }), t = now();
  o.lease.end = t - 1000; // 今天到期，到期时刻已过
  assert.equal(view.daysLeft(o, t), 0); assert.equal(view.phase(o, t), 'expiring', '到期日当天不算逾期');
  assert.equal(after.leaseOver(o, t), false); assert.equal(after.exitState(o, t), 'form'); assert.equal(after.accessView(o, t).state, 'allowed');
  let pg = await page('ORDER_DETAIL', { id: o.id });
  assert.ok(pg.data.subs.includes('今天到期')); assert.deepEqual(pg.data.progress.find((r) => r.k === '剩余租期'), { k: '剩余租期', v: '今天到期' }); pg.onHide();
  o.lease.end = t - 3 * DAY; // 阶段还是「即将到期」，到期日已过 3 天
  assert.equal(view.phase(o, t), 'expired_lease'); assert.equal(after.leaseOver(o, t), true); assert.equal(after.exitState(o, t), 'form_expired'); assert.deepEqual(after.accessView(o, t), { state: 'inactive', lease: 'expired' });
  pg = await page('ORDER_DETAIL', { id: o.id });
  assert.deepEqual([pg.data.head.title, pg.data.bar.primary.t, pg.data.bar.secondary.t], ['租期已到期', '办理续租', '办理退仓']);
  assert.ok(pg.data.subs.includes('已超出 3 天')); assert.ok(!JSON.stringify([pg.data.subs, pg.data.progress]).includes('-3'));
  assert.ok(pg.data.services.some((r) => r.a === 'renew' && r.on)); pg.onHide();
  const c = await taskCard(); assert.deepEqual(c.data.main.facts.map((x) => [x.v, x.l])[1], ['3天', '已超出']); c.__detach();
  // 次日 0 点（北京时间）整为界
  const end = Date.UTC(2026, 10, 30, 2); // 北京时间 11-30 10:00 到期
  assert.equal(model.overdueFrom(end), Date.UTC(2026, 10, 30, 16)); o.lease.end = end;
  assert.equal(after.leaseOver(o, Date.UTC(2026, 10, 30, 15, 59)), false); assert.equal(after.leaseOver(o, Date.UTC(2026, 10, 30, 16)), true);
});

test('R-08 / C-10：逾期后续租，续租期自原到期日起算、超出天数另计，续租页和订单详情各写清楚', async () => {
  const o = await first('member_overdue'), end = after.ymd(o.lease.end);
  let pg = await page('RENEW', { id: o.id });
  assert.equal(pg.data.st, 'form'); assert.equal(pg.data.over, '续租期自原到期日 ' + end + ' 起算。到期后超出的天数按协议另行计费，与续租租金分开结算。');
  assert.match(read('pkg-after/renew/index.wxml'), /<mk-notice wx:if="\{\{over\}\}" text="\{\{over\}\}"/); pg.onUnload();
  pg = await page('ORDER_DETAIL', { id: o.id });
  assert.equal(pg.data.note.text, '租期已于 ' + end + ' 到期，超出的天数按协议另行计费，与续租租金分开结算。办理续租的，续租期自原到期日起算。'); assert.equal(pg.data.note.title, '');
  assert.ok(!/¥/.test(pg.data.note.text), '逾期费金额待业务，不造数'); pg.onHide();
  const x = await renewOnce(o.id, 3);
  assert.equal(x.lease.end, after.addMonths(o.lease.end, 3), '自原到期日顺延'); assert.deepEqual([x.renewals[0].from, x.renewals[0].to], [o.lease.end, x.lease.end]);
  fresh(); const a = active(); pg = await page('RENEW', { id: a.id }); assert.equal(pg.data.over, '', '没到期不出这一句'); pg.onUnload();
});

test('R-09 / C-11：到期退仓取空日期 = 到期日至其后 2 天；超出范围接口不收', async () => {
  fresh();
  const o = endingIn(3), end = after.ymd(o.lease.end), cap = after.ymd(o.lease.end + 2 * DAY);
  assert.equal(A.exit.expiryClearMaxDays, 2); assert.deepEqual(after.exitDateRange(o, 'expiry', now()), { min: end, max: cap, def: end });
  const pg = await page('EXIT', { id: o.id });
  assert.deepEqual([pg.data.form.min, pg.data.form.max, pg.data.form.rule], [end, cap, '到期退仓的取空日期可选 ' + end + ' 至 ' + cap + '。']);
  pg.onDate({ detail: { value: after.ymd(o.lease.end + 3 * DAY) } }); assert.equal(pg.data.form.date, end, '超出上限的日期不收'); pg.onUnload();
  await rejects(api.requestExit({ id: o.id, type: 'expiry', date: after.ymd(o.lease.end + 3 * DAY) }), 'INVALID');
  await rejects(api.requestExit({ id: o.id, type: 'expiry', date: after.ymd(o.lease.end - DAY) }), 'INVALID');
  assert.equal((await api.requestExit({ id: o.id, type: 'expiry', date: cap })).exit.date, cap);
  // 已到期 1 天：今天至到期日 + 2 天
  const late = endingIn(-1), t = after.ymd(now());
  assert.deepEqual(after.exitDateRange(late, 'expiry', now()), { min: t, max: after.ymd(late.lease.end + 2 * DAY), def: t });
});

test('C-12 / D-14：押金页部分退还与订单详情同名、可联系门店；不带订单号进入时能切换订单，默认不再落到已结清那笔', async () => {
  fresh(); db.seeded = false; // 默认 5 笔演示订单：2 笔在租 + 1 笔待起租 + 1 笔已结束（部分退还）
  const os = await api.getOrders({}), ended = os.find((o) => o.stage === S.ENDED);
  let pg = await page('DEPOSIT', { id: ended.id });
  assert.deepEqual([pg.data.st, pg.data.head.tag], ['refunded_partial', '部分退还']); assert.equal(TT.order.depositLabel.partial, pg.data.head.tag);
  assert.deepEqual(pg.data.settle.map((r) => r.k), ['订单押金', '已扣费用', '实际退还']); assert.equal(TA.deposit.dueNote, '已扣费用明细可向门店查询。');
  assert.deepEqual(pg.data.bar.btns.map((b) => [b.text, b.act]), [['返回订单详情', 'back'], ['联系门店', 'call']]);
  assert.equal(pg.data.picks.length, 0, '带订单号进入不出切换'); pg.onUnload();
  pg = await page('DEPOSIT', {});
  assert.notEqual(pg.data.order.stage, S.ENDED, '默认取在租的一笔'); assert.equal(pg.data.st, 'held');
  assert.equal(pg.data.picks.length, 4); assert.equal(pg.data.pickCount, '共 4 笔订单'); assert.equal(pg.data.picks.filter((p) => p.on).length, 1);
  assert.ok(pg.data.picks.some((p) => p.tag === '部分退还') && pg.data.picks.some((p) => p.tag === '押金保管中'));
  pg.onPick(); assert.equal(pg.data.pickSheet, true);
  await pg.onPickOrder({ currentTarget: { dataset: { id: ended.id } } }); await tick(30);
  assert.deepEqual([pg.data.pickSheet, pg.data.order.id, pg.data.st], [false, ended.id, 'refunded_partial']); assert.equal(pg.data.picks.find((p) => p.on).id, ended.id); pg.onUnload();
  assert.match(read('pkg-after/deposit/index.wxml'), /wx:if="\{\{picks\.length\}\}"[^>]*bindtap="onPick"/);
  // 只有一笔时不出切换
  fresh(); const one = active(); pg = await page('DEPOSIT', {}); assert.equal(pg.data.order.id, one.id); assert.equal(pg.data.picks.length, 0); pg.onUnload();
});

test('C-15 / A-06 / B-17：实名未通过与「还没认证」分得开；付款后补实名的弹层文案与确认订单同一套', async () => {
  const before = await first('member_before_start'), cb = listCard(before);
  const o = await first('member_identity_mismatch');
  assert.equal(cb.stageLabel, '待实名认证'); assert.deepEqual([listCard(o).stageLabel, listCard(o).stageTone], ['实名未通过', 'err']);
  let pg = await page('ORDER_DETAIL', { id: o.id });
  assert.deepEqual([pg.data.head.title, pg.data.head.tag, pg.data.bar.primary.t, pg.data.note.text], ['实名认证未通过', '需重新提交', '重新提交实名认证', '上次提交的实名认证未通过，姓名与身份证号需与证件一致。']); pg.onHide();
  const c = await taskCard();
  assert.deepEqual([c.data.main.title, c.data.main.badge, c.data.main.badgeTone, c.data.main.primary.t, c.data.main.helpText], ['实名认证未通过', '需重新提交', 'err', '重新提交认证', '上次提交的实名认证未通过，姓名与身份证号需与证件一致。']);
  env.nav.length = 0; c.onAction({ currentTarget: { dataset: { a: 'identityRetry' } } }); assert.equal(env.nav[0].url, routes.IDENTITY + '?id=' + o.id); c.__detach();
  pg = await page('IDENTITY', { id: o.id });
  assert.deepEqual([pg.data.st, pg.data.tag, pg.data.noteTone, pg.data.steps[1].t, pg.data.steps[1].s, pg.data.steps[1].cls], ['mismatch', '未通过', 'err', '认证未通过', '姓名与身份证号不一致，请核对后重试', 'fail']);
  assert.deepEqual(pg.data.T.v, TT.idv, '弹层文案取确认订单同一组');
  const wxml = read('pkg-after/identity/index.wxml');
  for (const k of ['T.v.title', 'T.v.name', 'T.v.namePh', 'T.v.no', 'T.v.noPh', 'T.v.fine', 'T.v.submit', 'T.v.noInvalid']) assert.ok(wxml.includes(k), k);
  assert.deepEqual([TT.idv.title, TT.idv.no, TT.idv.noPh], ['实名认证', '身份证号', '请填写 18 位身份证号']); assert.equal(TA.identity.sheet, undefined);
  await rejects(api.submitOrderIdentity({ id: o.id, name: '王小明', id_no: '1101' }), 'INVALID');
  await api.submitOrderIdentity({ id: o.id, name: '王小明', id_no: '1101' }).catch((e) => assert.equal(e.message, '请填写 18 位身份证号'));
  pg.onUnload();
});

test('A-05 / A-07 / D-17：没有订单时，有需求不出「继续找仓」简化卡；预约记录进条带；「我的」页任务卡不重复出找仓进度', async () => {
  fresh();
  state.setRequirement({ capacity_m3: 3.5, input_unit: 'm3', input_value: 3.5, term_months: 6 });
  let c = await taskCard();
  assert.deepEqual([c.data.show, c.data.main, c.data.todos.length], [false, null, 0], '只有需求：任务卡不渲染，首页显示需求卡'); c.__detach();
  db.leads.push({ id: 'L1', type: 'booking', status: 'submitted', store_name: '安贞·富仁名苑店', in_service_hours: true });
  c = await taskCard();
  assert.deepEqual([c.data.show, c.data.main], [true, null]); assert.deepEqual(c.data.todos.map((t) => [t.k, t.a]), [['预约用仓', 'lead']]);
  env.nav.length = 0; c.onTodo({ currentTarget: { dataset: { i: 0 } } }); assert.equal(env.nav[0].url, routes.NEEDS); c.__detach();
  assert.equal(R('services/finder').layoutOf('').hasMain, false, '主卡为空时首页需求卡照常显示');
  assert.match(read('components/mk-task-card/index.wxml'), /<view wx:if="\{\{main\}\}" class="mk-card tk-card/);
  state.setRequirement(null); c = await taskCard(); assert.equal(c.data.main.key, 'booking', '没有需求、只有预约：仍出「已收到您的用仓需求」'); c.__detach();
  // 有订单 + 有需求：首页条带有「找仓进度」，「我的」页没有（那页需求卡一直在）
  fresh(); db.seeded = false; state.setRequirement({ capacity_m3: 3.5, input_unit: 'm3', input_value: 3.5, term_months: 6 });
  env.stack = [{ route: 'pages/home/index' }]; c = await taskCard(); assert.ok(c.data.todos.some((t) => t.a === 'find')); c.__detach();
  env.stack = [{ route: 'pages/mine/index' }]; c = await taskCard(); assert.ok(!c.data.todos.some((t) => t.a === 'find')); assert.ok(c.data.todos.some((t) => t.a === 'pay')); c.__detach();
  env.stack = [];
});

test('A-08：演示订单占用的仓位在找仓页不可租；已结束、已取消、已超时的释放；自己的待支付订单仍可继续支付', async () => {
  fresh(); db.seeded = false;
  const os = await api.getOrders({});
  const stores = await api.getStores({ city: '北京' }), status = (id) => stores.reduce((a, s) => a.concat(s.units), []).find((u) => u.id === id).status;
  for (const o of os) for (const u of o.units) assert.equal(status(u.id) === 'available', o.stage === S.ENDED, o.stage + ' ' + u.id);
  await rejects(api.getQuote({ unit_ids: ['SIM_BJ01_U03'], months: 6 }), 'NOT_FOUND'); // A003 被即将到期的订单占着
  const m = R('services/finder').buildMatch(stores, { loggedIn: true, location: null, requirement: { capacity_m3: 3.5, term_months: 6 } });
  assert.ok(!JSON.stringify(m.cards).includes('A003 · 3.5m³'), '仓位推荐不再推在租的 A003');
  // 取消 / 超时后释放
  const pend = os.find((o) => o.stage === S.PENDING);
  assert.equal((await api.resumeFailedOrder({ order_id: pend.id, dry_run: true })).checks.status, true);
  await api.cancelOrder({ order_id: pend.id });
  const again = await api.getStores({ city: '北京' });
  assert.equal(again.reduce((a, s) => a.concat(s.units), []).find((u) => u.id === pend.units[0].id).status, 'available');
  for (const sc of ['member_closed', 'member_ended']) {
    assert.ok(demo.applyScenario(sc)); const list = await api.getOrders({}), ss = await api.getStores({ city: '北京' });
    for (const o of list) for (const u of o.units) assert.equal(ss.reduce((a, s) => a.concat(s.units), []).find((x) => x.id === u.id).status, R('mock/inventory').find((x) => x.id === u.id).status, sc + ' ' + u.id + ' 不被已结束 / 已取消 / 已超时的订单占用');
  }
});

// ---------- P3 与横向 ----------
test('C-16 / B-09 / C-20：列表与详情用同一套词；支付失败统一叫「支付未成功」；列表卡带下单日或到期日，未登录标题是「登录后查看订单」', async () => {
  assert.deepEqual([TT.stage.upcoming, TT.head.upcoming[1], TA.access.lease.upcoming], ['待起租', '待起租', '待起租']);
  assert.deepEqual([TT.stage.expired, TT.head.expired[1]], ['已超时', '已超时']);
  assert.deepEqual([TT.stage.payment_failed, TT.head.payment_failed[1], TT.task.badge.payment_failed], ['支付未成功', '支付未成功', '支付未成功']);
  assert.deepEqual([TT.stage.inspection, TT.head.inspection[1]], ['待验仓', '待验仓']);
  const f = await first('member_failed');
  const pg = await page('ORDER_DETAIL', { id: f.id }); assert.equal(pg.data.head.tag, '支付未成功'); pg.onHide();
  const c = await taskCard(); assert.equal(c.data.main.badge, '支付未成功'); c.__detach();
  assert.equal(listCard(f).dateText, '下单 ' + view.ymd(f.created_at));
  const e = await first('member_expiring'); assert.equal(listCard(e).dateText, '租期至 ' + view.ymd(e.lease.end));
  const o = await first('member_overdue'); assert.equal(listCard(o).dateText, '租期至 ' + view.ymd(o.lease.end));
  assert.match(read('components/mk-order-card/index.wxml'), /wx:if="\{\{v\.dateText\}\}"/);
  state.reset(); const guest = env.newPage('pages/orders/index', {}); await tick();
  assert.equal(guest.data.loggedIn, false); assert.match(read('pages/orders/index.wxml'), /title="\{\{loggedIn \? T\.empty : T\.loginTip\}\}"/); assert.equal(TT.orders.loginTip, '登录后查看订单');
});

test('R-07 / B-15 / S-08：订单详情支付失败态显示失败原因；带 paid=1 进入显示「支付成功，已付 ¥X」；可下拉刷新', async () => {
  fresh();
  const o = mk({ store: 'SIM_BJ02', units: ['SIM_BJ02_U01'], months: 3, agoDays: 0, stage: S.FAILED, failReason: 'balance' });
  let pg = await page('ORDER_DETAIL', { id: o.id });
  assert.equal(pg.data.note.text.indexOf(TT.payFail.balance[0] + '。'), 0); assert.match(pg.data.note.text, /订单保留至 /); pg.onHide();
  raw(o.id).pay.fail_reason = ''; pg = await page('ORDER_DETAIL', { id: o.id }); assert.equal(pg.data.note.text.indexOf('订单保留至 '), 0, '没有原因时不出原因句'); pg.onHide();
  const p = mk({ store: 'SIM_BJ02', units: ['SIM_BJ02_U02'], months: 6, agoDays: 0, startAt: now() + 3 * DAY, stage: S.PAID });
  pg = await page('ORDER_DETAIL', { id: p.id, paid: '1' });
  assert.equal(pg.data.paidLine, '支付成功，已付 ' + yuan(p.quote.payable)); assert.equal(pg.data.paying, false);
  assert.match(read('pkg-trade/order/index.wxml'), /<mk-notice wx:if="\{\{paidLine\}\}" text="\{\{paidLine\}\}" \/>/); pg.onHide();
  pg = await page('ORDER_DETAIL', { id: p.id }); assert.equal(pg.data.paidLine, '', '平时进入不出这一句');
  assert.equal(JSON.parse(read('pkg-trade/order/index.json')).enablePullDownRefresh, true);
  let stopped = 0; const keep = wx.stopPullDownRefresh; wx.stopPullDownRefresh = () => { stopped++; };
  try { pg.onPullDownRefresh(); await tick(30); } finally { wx.stopPullDownRefresh = keep; }
  assert.equal(stopped, 1); pg.onHide();
});

test('C-18 / C-19 / C-21 / B-20：续租付款未成功可放弃并换说明句；验仓未通过场景确实已到期；合同页写签署时的租期；未实名订单不造签署人', async () => {
  fresh();
  const o = endingIn(5), id = o.id;
  await api.requestRenewal({ id, months: 6 }); await api.getAfterOrder({ id }); await api.confirmRenewal({ id }); await api.payRenewal({ id, simulate: 'fail' }).catch(() => {});
  let pg = await page('RENEW', { id });
  assert.equal(pg.data.st, 'payment_failed'); assert.deepEqual(pg.data.alt.map((a) => a.text), ['暂不续租']);
  assert.match(read('pkg-after/renew/index.wxml'), /<mk-after-fail[^>]*note="\{\{T\.r\.failNote\}\}"/); assert.equal(TA.renew.failNote, '本次付款未完成，续租尚未生效。');
  const fail = env.newComponent('components/mk-after-fail/index', { note: TA.renew.failNote }); assert.equal(fail.data.note, TA.renew.failNote);
  await pg.onSkip(); assert.equal(raw(id).renew, null); pg.onUnload();
  // C-19：演示场景「验仓未通过」的订单租期确实已过
  const bad = scenarios.LIST.find((x) => x.id === 'member_inspect_failed').orders[0];
  assert.ok(now() + bad.startInDays * DAY + 93 * DAY < now(), '起租日往前推得够多，3 个月（最长 92 天）后一定已到期');
  const sc = await first('member_inspect_failed'); assert.ok(after.leaseOver(sc, now()));
  const cl = scenarios.LIST.find((x) => x.id === 'member_exit_clearing').orders[0];
  assert.ok(365 + cl.startInDays <= A.exit.expiryAdvanceDays, '「退仓待清空」的订单在到期前 7 天内');
  // C-21：续租后，合同页的租期和起止日期仍是签署时的；续租另列
  fresh(); const c = endingIn(5), end0 = c.lease.end; const x = await renewOnce(c.id, 6);
  assert.deepEqual(after.signedLease(x), { months: 12, end: end0 });
  pg = await page('ECONTRACT', { id: c.id });
  assert.deepEqual(pg.data.info.slice(-2).map((r) => r.v), ['12个月', after.ymd(c.lease.start) + ' 至 ' + after.ymd(end0)]);
  assert.deepEqual(pg.data.renewals, [{ k: '续租 6个月', v: '租期至 ' + after.ymd(x.lease.end) }]);
  // B-20：下单时未实名的演示订单不造签署人姓名，合同页不出「使用方（乙方）」一行
  const un = mk({ store: 'SIM_BJ02', units: ['SIM_BJ02_U02'], months: 6, agoDays: 2, startAt: now() + 3 * DAY, stage: S.PAID, identity: false });
  assert.equal(un.contract.signer_masked, ''); pg = await page('ECONTRACT', { id: un.id }); assert.ok(!pg.data.sign.some((r) => r.k === '使用方（乙方）'));
  assert.equal(active().contract.signer_masked, '张*');
});

test('R-21：本域说明句与紧邻按钮同义的已删；界面文字不写死在组件里', () => {
  assert.equal(TT.orders.emptySub, ''); assert.equal(TT.order.emptyDesc, ''); assert.equal(TA.common.emptySub, '');
  assert.equal(TT.order.noteCancelled, '仓位已释放。'); assert.equal(TT.order.noteOverdueTitle, undefined); assert.equal(TA.exit.overdueTitle, undefined);
  assert.equal(TT.task.help.expired, undefined); assert.equal(TT.task.help.refund, undefined); assert.equal(TT.task.help.upcoming[1], '起租日开放存取。');
  assert.ok(!/[一-鿿]/.test(read('components/mk-task-card/index.js').replace(/\/\/.*$/gm, '')), '任务卡组件里不写死中文');
  for (const p of ['pkg-trade/order/index.wxml', 'pages/orders/index.wxml', 'components/mk-order-card/index.wxml', 'components/mk-task-card/index.wxml', 'pkg-after/exit/index.wxml', 'pkg-after/deposit/index.wxml', 'pkg-after/invoice/index.wxml'])
    assert.ok(!/[一-鿿]/.test(read(p).replace(/aria-label="[^"]*"/g, '')), p);
});
