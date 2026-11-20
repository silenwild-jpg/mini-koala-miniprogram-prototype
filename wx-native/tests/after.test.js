// 租后域测试（第 3 批）：续租、退仓、押金、发票、实名兜底、入仓、消息的规则（core/after.js）、演示接口（services/mock-ext/after.js）与页面关键流程。
// 页面部分在假的 wx 环境里跑，验证的是代码逻辑与跳转去向，不是微信真实行为。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), routes = R('services/routes'), api = R('services/api'), subscribe = R('services/subscribe');
const C = R('core/config'), A = R('core/config-after'), after = R('core/after'), pricing = R('core/pricing'), O = R('core/order');
const T = R('i18n/after');
const { db, seed, mk } = R('services/mock-ext/_db');
const S = O.STAGE, H = 3600e3, DAY = 24 * H;
env.loadApp();
// 演示推进间隔调成 0：下一次取数就走到下一步（退款留 300ms，好分别看到「退款处理中」与「已退还」）；关掉页面的到点自动刷新
Object.assign(A.demo, { storeQuoteMs: 0, inspectMs: 0, refundMs: 300, invoiceProcessMs: 0, invoiceIssueMs: 0, identityMs: 0, autoRefresh: false });
const login = () => state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
const fresh = (loggedIn) => { state.reset(); env.nav.length = 0; env.mode = 'ok'; if (loggedIn !== false) login(); };
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 10));
const base = (r) => r.replace(/^\//, '');
const raw = (id) => db.orders.find((o) => o.id === id);
seed();
const now0 = Date.now();
// 自造订单：A003（月基价 400）
const order = (o) => mk(Object.assign({ store: 'SIM_BJ01', units: ['SIM_BJ01_U03'], months: 12, agoDays: 40, startAt: now0 - 39 * DAY, stage: S.ACTIVE }, o));
const page = async (route, query) => { const pg = env.newPage(base(route), query); if(pg.__shown) await pg.__shown; else await tick(40); return pg; };

// ---------- 规则：退仓（D-189） ----------
test('提前退仓预计结算：冻结稿示例 ¥632 = 违约金 ¥572 + 优惠重算补差 ¥60', () => {
  // A003 租 12 个月 6.5 折 ¥260/月，2026-10-18 起租，2026-11-18 退仓：已用 1 个月、剩余 11 个月
  const o = order({ startAt: Date.UTC(2026, 9, 18, 4), agoDays: 0 });
  assert.equal(o.quote.monthly_average, 260); assert.equal(after.ymd(o.lease.end), '2027-10-18');
  const e = after.earlyExitEstimate(o, '2026-11-18');
  assert.deepEqual({ used: e.used, left: e.left, penalty: e.penalty, redo: e.redo, fee: e.fee }, { used: 1, left: 11, penalty: 572, redo: 60, fee: 632 });
  assert.equal(A.exit.penaltyRatio, 0.2); assert.equal(A.exit.penaltyMinMonths, 1);
});
test('提前退仓预计结算：违约金不低于 1 个月服务费；已用月数对应的折扣档不更浅时不补差；特价仓不补差', () => {
  const o = order({ startAt: Date.UTC(2026, 9, 18, 4), agoDays: 0 });
  const last = after.earlyExitEstimate(o, '2027-09-20'); // 剩余不足 1 个月
  assert.equal(last.left, 0); assert.equal(last.penalty, 260); assert.equal(last.used, 12); assert.equal(last.redo, 0); assert.equal(last.fee, 260);
  const mid = after.earlyExitEstimate(o, '2027-04-18'); // 已用 6 个月（7 折档 ¥280）、剩余 6 个月
  assert.equal(mid.used, 6); assert.equal(mid.left, 6); assert.equal(mid.penalty, Math.round(260 * 6 * 0.2)); assert.equal(mid.redo, (280 - 260) * 6);
  const day1 = after.earlyExitEstimate(o, '2026-10-19'); // 不足 1 个月按 1 个月
  assert.equal(day1.used, 1); assert.equal(day1.left, 11);
  const sp = JSON.parse(JSON.stringify(o)); sp.quote.special = true; sp.deal_factor = null;
  assert.equal(after.earlyExitEstimate(sp, '2026-11-18').redo, 0);
});
test('退仓状态：已付未起租是「退订」不是退仓；到期未办是 form_expired；取空日期范围', () => {
  const now = Date.now();
  const act = order({}), up = order({ stage: S.PAID, startAt: now + 3 * DAY, agoDays: 1 }), over = order({ stage: S.OVERDUE, months: 3, agoDays: 100, startAt: now - 99 * DAY });
  assert.equal(after.exitState(act, now), 'form'); assert.equal(after.exitState(up, now), 'not_started'); assert.equal(after.exitState(over, now), 'form_expired');
  assert.equal(after.exitState(order({ stage: S.PENDING }), now), 'empty');
  const end = after.ymd(act.lease.end), today = after.ymd(now);
  assert.deepEqual(after.exitDateRange(act, 'expiry', now), { min: end, max: after.ymd(act.lease.end + A.exit.expiryClearMaxDays * DAY), def: end }, '到期退仓取空日 = 到期日至其后 2 天（R-09）');
  const early = after.exitDateRange(act, 'early', now);
  assert.equal(early.min, today); assert.equal(early.def, today); assert.ok(early.max < end);
  assert.equal(after.exitDateRange(over, 'expiry', now).min, today, '已到期：取空日期从今天起');
  assert.equal(after.exitDateRange(over, 'expiry', now).max, today, '已过到期日 + 2 天：只能选今天');
  assert.equal(after.canEarlyExit(over, now), false); assert.equal(after.canEarlyExit(act, now), true);
});

// ---------- 规则：续租（§4.8-1，D-186、D-192） ----------
test('续租报价截止：报价 + 24 小时与租期到期取较早者；租期已过时不再用到期时刻截断', () => {
  const q = Date.UTC(2026, 10, 18, 2);
  assert.equal(after.renewDeadline(q, q + 30 * DAY), q + 24 * H);
  assert.equal(after.renewDeadline(q, q + 5 * H), q + 14 * H, '到期日含当天（R-04）：截至到期日次日 0 点（北京时间 10 点报价，当天 15 点到期 → 次日 0 点）');
  assert.equal(after.renewDeadline(q, q - DAY), q + 24 * H);
  assert.equal(C.timers.renewQuoteTtlHours, 24);
});
test('首次续租沿用原折扣：原折扣更深才沿用，并带现行折扣价对照；第二次起按现行表', () => {
  const o = order({ factor: 0.6 });
  const a = after.renewQuote(o, 12);
  assert.deepEqual({ kept: a.kept, monthly: a.monthly, total: a.total, cur: a.currentTotal, less: a.lessMonthly, lessTotal: a.lessTotal, label: a.label, curLabel: a.currentLabel }, { kept: true, monthly: 240, total: 2880, cur: 3120, less: 20, lessTotal: 240, label: '6 折', curLabel: '6.5 折' });
  assert.equal(after.renewQuote(o, 24).total, 5760); // 冻结稿 form_keep：约 ¥5,760
  assert.equal(after.renewQuote(o, 3).kept, true); assert.equal(after.renewQuote(o, 3).currentMonthly, 300);
  const shallow = order({ months: 6 }); // 成交 7 折，续 12 个月现行 6.5 折更深 → 取现行
  const b = after.renewQuote(shallow, 12);
  assert.equal(b.kept, false); assert.equal(b.monthly, 260); assert.equal(b.lessTotal, 0);
  const second = order({ factor: 0.6 }); second.renewal_count = 1;
  assert.equal(after.renewQuote(second, 12).kept, false); assert.equal(after.renewQuote(second, 12).total, 3120);
  // 与 pricing.renewalFactor / pricing.quote 一致
  const rf = pricing.renewalFactor(o, 12);
  assert.equal(pricing.quote(after.unitsForPricing(o), 12, { renewal: true, factorOverride: rf.factor }).rent_total, a.total);
  assert.equal(pricing.quote(after.unitsForPricing(o), 12, { renewal: true }).deposit, 0, '续租无押金');
});
test('续租页状态：到期未退租也能办；退仓中不能办；累计 60 个月封顶；报价过期后仍沿用', () => {
  const now = Date.now();
  const over = order({ stage: S.OVERDUE, months: 3, agoDays: 100, startAt: now - 99 * DAY });
  assert.equal(after.renewView(over, now).state, 'form');
  assert.equal(after.renewView(order({ stage: S.PENDING }), now).state, 'empty');
  const ex = order({ stage: S.EXITING }); assert.deepEqual(after.renewView(ex, now), { state: 'unavailable', reason: 'exit' });
  const full = order({}); full.months = 60; assert.equal(after.renewView(full, now).reason, 'max');
  const o = order({ factor: 0.6 });
  assert.equal(after.renewView(o, now).max, 48); assert.equal(after.renewView(o, now).months, 12);
  o.renew = { months: 12, status: 'submitted', submitted_at: now };
  assert.equal(after.renewView(o, now).state, 'quote_pending');
  Object.assign(o.renew, { status: 'quoted', quoted_at: now, kept: true, amount: 2880, monthly: 240, factor: 0.6, pay: '' });
  const v = after.renewView(o, now);
  assert.equal(v.state, 'quote_ready'); assert.equal(v.kept, true); assert.equal(v.deadline, now + 24 * H); assert.equal(v.capped, false);
  for (const [pay, st] of [['pending', 'payment_pending'], ['failed', 'payment_failed'], ['cancelled', 'cancelled']]) { o.renew.pay = pay; assert.equal(after.renewView(o, now).state, st); }
  const late = after.renewView(o, now + 25 * H);
  assert.equal(late.state, 'quote_expired'); assert.equal(late.kept, true, '过期后重新提交仍沿用原折扣');
  o.renew.status = 'paid';
  assert.equal(after.renewView(o, now, { showCompleted: true }).state, 'completed');
  assert.equal(after.renewView(o, now).state, 'form', '付完再进来是新一次续租');
  const soon = order({ months: 12, agoDays: 365, startAt: now - 365 * DAY + 5 * H, stage: S.EXPIRING }); // 5 小时后到期
  soon.renew = { months: 6, status: 'quoted', quoted_at: now, pay: '' };
  soon.lease.end = now + 1000; // 今天到期：报价截至今天结束（到期日含当天，R-04）
  const c = after.renewView(soon, now); assert.equal(c.capped, true); assert.equal(c.deadline, R('core/order-model').overdueFrom(soon.lease.end)); assert.ok(c.deadline <= now + 24 * H);
});

// ---------- 规则：押金、发票、实名、入仓、消息 ----------
test('押金状态：保管中 / 待验仓 / 退款处理中 / 退款未成功 / 已退还 / 部分退还', () => {
  const o = order({});
  assert.equal(after.depositState(o), 'held');
  o.exit = { status: 'waiting' }; assert.equal(after.depositState(o), 'waiting');
  for (const [s, st] of [['refunding', 'refund_pending'], ['failed', 'refund_failed'], ['refunded', 'refunded'], ['partial', 'refunded_partial']]) { o.deposit.status = s; assert.equal(after.depositState(o), st); }
  assert.equal(after.depositState(order({ stage: S.PENDING })), 'empty');
  const ended = db.orders.find((x) => x.stage === S.ENDED && x.deposit.status === 'partial'); // 演示订单：押金部分退还
  assert.equal(after.depositState(ended), 'refunded_partial'); assert.equal(ended.deposit.refunded, ended.deposit.amount - ended.deposit.pending_fee);
});
test('发票：付款记录按租金 / 押金 / 管理费拆分，合计等于已付；续租付款单列', () => {
  const o = db.orders.find((x) => x.stage === S.ACTIVE && x.quote.full_reduction > 0); // 演示订单：含满额减
  const p = after.payments(o);
  assert.equal(p.length, 1); assert.equal(p[0].type, 'INITIAL'); assert.equal(p[0].amount, o.quote.payable);
  assert.deepEqual(p[0].split.map((s) => s[0]), ['rent', 'deposit', 'fee']);
  assert.equal(p[0].split.reduce((n, s) => n + s[1], 0), o.quote.payable);
  assert.equal(p[0].split[0][1], o.quote.rent_total - o.quote.full_reduction, '租金一行是满额减之后的整期租金');
  const two = JSON.parse(JSON.stringify(o)); two.renewals = [{ id: 'RENEWAL1', months: 6, amount: 1560 }];
  const p2 = after.payments(two); assert.equal(p2.length, 2); assert.deepEqual(p2[1].split, [['renew', 1560]]);
  assert.equal(after.invoiceView(two).state, 'form'); assert.equal(after.invoiceView(two).available.length, 2);
  two.invoice.records = [{ id: 'INV1', payment_id: 'INITIAL', status: 'issued' }, { id: 'INV2', payment_id: 'RENEWAL1', status: 'processing' }];
  assert.equal(after.invoiceView(two).state, 'processing');
  two.invoice.records[1].status = 'issued'; assert.equal(after.invoiceView(two).state, 'issued');
  two.invoice.records[0].status = 'failed'; assert.equal(after.invoiceView(two).state, 'issue_failed');
});
test('发票与实名表单校验', () => {
  assert.deepEqual(after.validateInvoice({ kind: 'personal', title: '张三', email: 'zhangsan@163.com' }), { emailError: false, ready: true });
  assert.deepEqual(after.validateInvoice({ kind: 'personal', title: '张三', email: 'zhangsan@example' }), { emailError: true, ready: false });
  assert.equal(after.validateInvoice({ kind: 'enterprise', title: '北京安贞科技有限公司', email: 'a@b.cn' }).ready, false, '企业要填税号');
  assert.equal(after.validateInvoice({ kind: 'enterprise', title: '北京安贞科技有限公司', email: 'a@b.cn', tax_id: '91110105MA01ABCD2X' }).ready, true);
  assert.equal(after.validateInvoice({ kind: 'personal', title: '', email: '' }).emailError, false, '没填时不报错，只是不能提交');
  assert.deepEqual(after.validateIdentity({ name: '王', id_no: '1101' }), { nameError: true, idError: true });
  assert.deepEqual(after.validateIdentity({ name: '王小明', id_no: '11010519900101001X' }), { nameError: false, idError: false });
});
test('入仓：未实名拦截、未起租、可入仓、退仓中清空前可入仓、已结束不可', () => {
  const now = Date.now();
  const un = db.orders.find((x) => x.identity_status === 'none'); // 演示订单：待起租且下单时未实名
  assert.equal(un.identity_at_order, false); assert.equal(after.accessView(un, now).state, 'identity_required'); assert.equal(after.identityState(un), 'none');
  assert.equal(after.accessView(order({ stage: S.PAID, startAt: now + 3 * DAY, agoDays: 1 }), now).state, 'before_start');
  assert.deepEqual(after.accessView(order({}), now), { state: 'allowed', lease: 'active' });
  assert.equal(after.accessView(order({ stage: S.EXPIRING }), now).state, 'allowed');
  const ex = order({ stage: S.EXITING }); ex.exit = { status: 'requested' };
  assert.equal(after.accessView(ex, now).state, 'allowed'); ex.exit.status = 'waiting'; assert.deepEqual(after.accessView(ex, now), { state: 'inactive', lease: 'returning' });
  assert.deepEqual(after.accessView(order({ stage: S.ENDED }), now), { state: 'inactive', lease: 'ended' });
  assert.equal(after.accessView(order({ stage: S.OVERDUE }), now).lease, 'expired');
  assert.equal(after.accessView(order({ stage: S.PENDING }), now).state, 'not_paid'); assert.equal(after.accessView(null, now).state, 'not_paid');
});
test('消息分类：先看类型，再按标题判断；没带订单号进入时的选单规则', () => {
  assert.equal(after.messageCategory({ type: 'renew', title: 'x' }), 'renew');
  assert.equal(after.messageCategory({ title: '付款完成，请完成实名认证' }), 'identity');
  assert.equal(after.messageCategory({ title: '运输预约已提交，预计 10 分钟内与您联系' }), 'transport');
  assert.equal(after.messageCategory({ title: '咨询已提交，预计 10 分钟内与您联系' }), 'lead');
  assert.equal(after.messageCategory({ type: 'booking' }), 'lead');
  assert.equal(after.messageCategory({ title: '验仓通过，押金进入退款处理' }), 'exit');
  assert.equal(after.messageCategory({ title: '你好', order_id: 'MK1' }), 'order'); assert.equal(after.messageCategory({ title: '你好' }), 'notice');
  const five = db.orders.slice(0, 5);
  assert.equal(after.pickOrder(five, 'renew').stage, S.EXPIRING); assert.equal(after.pickOrder(five, 'identity').identity_status, 'none');
  assert.equal(after.pickOrder(five, 'deposit').stage, S.EXPIRING, '押金：在租的排在已结清的前面（FIX-01 D-14）'); assert.equal(after.pickOrder(five, 'access').stage, S.ACTIVE);
  const moving = JSON.parse(JSON.stringify(five.find((x) => x.stage === S.ENDED))); moving.deposit.status = 'failed';
  assert.equal(after.pickOrder(five.concat([moving]), 'deposit').deposit.status, 'failed', '押金正在处理的排最前');
  assert.equal(after.pickOrder([{ stage: S.PENDING }], 'exit'), null);
});

// ---------- 接口（演示数据适配器） ----------
test('接口：租后接口都要登录', async () => {
  fresh(false);
  for (const n of ['getAfterOrder', 'requestRenewal', 'cancelRenewal', 'confirmRenewal', 'deferRenewalPay', 'payRenewal', 'requestExit', 'requestInspection', 'setAfterNotify', 'submitInvoice', 'sendInvoiceEmail', 'getInvoiceFile', 'submitOrderIdentity', 'getMessages', 'readMessages'])
    await assert.rejects(api[n]({ id: 'x' }), (e) => e.code === 'UNAUTHENTICATED', n);
  assert.equal((await api.getMessagesUnread()).unread, 0);
});
test('接口：首次续租沿用原折扣 → 报价过期重新提交仍沿用 → 支付后新租期顺延，第二次续租按现行表', async () => {
  fresh();
  const o = order({ factor: 0.6, months: 12, agoDays: 350, startAt: now0 - 349 * DAY, stage: S.EXPIRING }), id = o.id, end0 = o.lease.end;
  await assert.rejects(api.requestRenewal({ id, months: 49 }), (e) => e.code === 'INVALID');
  let x = await api.requestRenewal({ id, months: 12, notify: 'declined' });
  assert.equal(x.renew.status, 'submitted'); assert.equal(x.renew.notify, 'declined');
  x = await api.getAfterOrder({ id }); // 门店确认报价（演示自动）
  assert.deepEqual({ s: x.renew.status, kept: x.renew.kept, amount: x.renew.amount, monthly: x.renew.monthly, factor: x.renew.factor }, { s: 'quoted', kept: true, amount: 2880, monthly: 240, factor: 0.6 });
  await assert.rejects(api.payRenewal({ id }), (e) => e.code === 'CONFLICT', '未确认报价不能付款');
  raw(id).renew.quoted_at -= 25 * H; // 报价超过 24 小时
  await assert.rejects(api.confirmRenewal({ id }), (e) => e.code === 'EXPIRED');
  await assert.rejects(api.confirmRenewal({ id, regular: true }), (e) => e.code === 'EXPIRED', '仍可沿用时不走常规折扣');
  assert.equal(raw(id).renew.status, 'expired');
  x = await api.requestRenewal({ id, months: 12 }); x = await api.getAfterOrder({ id });
  assert.equal(x.renew.kept, true); assert.equal(x.renew.amount, 2880, '过期后重新提交仍沿用');
  x = await api.confirmRenewal({ id }); assert.equal(x.renew.pay, 'pending');
  await assert.rejects(api.payRenewal({ id, simulate: 'fail' }), (e) => e.code === 'PAY_FAILED'); assert.equal(raw(id).renew.pay, 'failed');
  x = await api.deferRenewalPay({ id }); assert.equal(x.renew.pay, 'cancelled');
  x = await api.payRenewal({ id });
  assert.equal(x.renew.status, 'paid'); assert.equal(x.months, 24); assert.equal(x.renewal_count, 1); assert.equal(x.lease.end, after.addMonths(end0, 12)); assert.equal(x.stage, S.ACTIVE);
  assert.deepEqual(x.renewals.map((r) => [r.id, r.months, r.amount]), [['RENEWAL1', 12, 2880]]);
  assert.equal(x.quote.rent_total, o.quote.rent_total, '原订单金额不重算');
  x = await api.requestRenewal({ id, months: 12 }); x = await api.getAfterOrder({ id });
  assert.equal(x.renew.kept, false); assert.equal(x.renew.amount, 3120, '第二次续租按现行表');
  x = await api.cancelRenewal({ id }); assert.equal(x.renew, null);
});
test('接口：报价过期且不沿用时可按常规折扣续租', async () => {
  fresh();
  const id = order({ months: 6 }).id;
  await api.requestRenewal({ id, months: 6 }); await api.getAfterOrder({ id });
  raw(id).renew.quoted_at -= 25 * H;
  const x = await api.confirmRenewal({ id, regular: true });
  assert.equal(x.renew.status, 'quoted'); assert.equal(x.renew.pay, 'pending'); assert.equal(x.renew.amount, 280 * 6);
});
test('接口：退仓 → 申请验仓 → 验仓通过 → 押金退款 → 已退还；未起租不能办退仓', async () => {
  fresh();
  const o = order({ startAt: now0 - 39 * DAY }), id = o.id, today = after.ymd(Date.now());
  const up = order({ stage: S.PAID, startAt: now0 + 3 * DAY, agoDays: 1 });
  await assert.rejects(api.requestExit({ id: up.id, type: 'expiry', date: after.ymd(up.lease.end) }), (e) => e.code === 'CONFLICT');
  await assert.rejects(api.requestExit({ id, type: 'expiry', date: today }), (e) => e.code === 'INVALID', '到期退仓不早于租期结束日');
  await assert.rejects(api.requestExit({ id, type: 'early', date: after.ymd(o.lease.end) }), (e) => e.code === 'INVALID');
  raw(id).renew = { months: 6, status: 'submitted', submitted_at: Date.now() + DAY };
  let x = await api.requestExit({ id, type: 'early', date: today });
  assert.equal(x.stage, S.EXITING); assert.equal(x.exit.status, 'requested'); assert.equal(x.exit.early, true); assert.equal(x.renew, null);
  assert.equal(x.exit.estimate.fee, after.earlyExitEstimate(o, today).fee); assert.ok(x.exit.estimate.fee >= o.quote.monthly_average);
  await assert.rejects(api.requestExit({ id, type: 'early', date: today }), (e) => e.code === 'CONFLICT');
  x = await api.requestInspection({ id, notify: 'accepted' });
  assert.equal(x.exit.status, 'waiting'); assert.equal(x.exit.notify, 'accepted'); assert.equal(after.depositState(x), 'waiting');
  x = await api.getAfterOrder({ id }); // 门店验仓通过（演示自动）
  assert.equal(x.exit.status, 'passed'); assert.equal(x.stage, S.ENDED); assert.equal(x.deposit.status, 'refunding');
  await tick(320); x = await api.getAfterOrder({ id });
  assert.equal(x.deposit.status, 'refunded'); assert.equal(x.deposit.refunded, o.quote.deposit);
  // 验仓未通过可重新申请
  // 到期退仓要到期前 7 天内才可提交（R-01）；验仓未通过可重新申请（租期结束前申请要先确认按提前退仓结算，见 fix-01-after.test.js）
  await assert.rejects(api.requestExit({ id: order({}).id, type: 'expiry', date: after.ymd(o.lease.end) }), (e) => e.code === 'INVALID');
  const f = order({ months: 12, agoDays: 362, startAt: now0 - 361 * DAY, stage: S.EXPIRING }); await api.requestExit({ id: f.id, type: 'expiry', date: after.ymd(f.lease.end) });
  raw(f.id).exit.status = 'failed';
  await assert.rejects(api.requestInspection({ id: f.id }), (e) => e.code === 'EARLY_CONFIRM');
  assert.equal((await api.requestInspection({ id: f.id, early_confirmed: true })).exit.status, 'waiting');
  // 有待结费用：部分退还
  const p = order({}); Object.assign(raw(p.id), { stage: S.ENDED }); Object.assign(raw(p.id).deposit, { status: 'refunding', refund_at: Date.now() - 1000, pending_fee: 40 });
  x = await api.getAfterOrder({ id: p.id }); assert.equal(x.deposit.status, 'partial'); assert.equal(x.deposit.refunded, p.quote.deposit - 40);
});
test('接口：发票申请 → 处理中 → 已开具；同一笔付款不能重复申请；开票未成功后更正重提', async () => {
  fresh();
  const o = order({}), id = o.id, f = { id, kind: 'personal', title: '张三', email: 'zhangsan@163.com' };
  await assert.rejects(api.submitInvoice(Object.assign({}, f, { email: 'zhangsan@example' })), (e) => e.code === 'INVALID');
  let x = await api.submitInvoice(f);
  assert.equal(x.invoice.status, 'applying'); assert.equal(x.invoice.title, '张三');
  assert.deepEqual([x.invoice.records[0].payment_id, x.invoice.records[0].amount, x.invoice.records[0].status], ['INITIAL', o.quote.payable - o.quote.deposit, 'submitted'], '发票金额不含押金（R-03）');
  await assert.rejects(api.submitInvoice(f), (e) => e.code === 'CONFLICT');
  await assert.rejects(api.sendInvoiceEmail({ id, record_id: 'INV9' }), (e) => e.code === 'NOT_FOUND');
  x = await api.getAfterOrder({ id });
  assert.equal(x.invoice.records[0].status, 'issued'); assert.equal(x.invoice.status, 'issued');
  assert.equal((await api.sendInvoiceEmail({ id, record_id: 'INV1' })).email, 'zhangsan@163.com'); assert.equal((await api.getInvoiceFile({ id, record_id: 'INV1' })).url, '');
  raw(id).invoice.records[0].status = 'failed';
  x = await api.submitInvoice({ id, kind: 'enterprise', title: '北京安贞科技有限公司', tax_id: '91110105MA01ABCD2X', email: 'a@b.cn' });
  assert.equal(x.invoice.records.length, 1); assert.equal(x.invoice.records[0].status, 'submitted'); assert.equal(x.invoice.records[0].kind, 'enterprise');
});
test('接口：付款后实名兜底（D-174）提交 → 认证中 → 认证通过；消息未读数与已读', async () => {
  fresh();
  const o = order({ identity: false, stage: S.PAID, startAt: now0 + 3 * DAY, agoDays: 1 }), id = o.id;
  assert.equal(o.identity_at_order, false);
  await assert.rejects(api.submitOrderIdentity({ id, name: '王', id_no: '1101' }), (e) => e.code === 'INVALID');
  let x = await api.submitOrderIdentity({ id, name: '王小明', id_no: '11010519900101001x' });
  assert.equal(x.identity_status, 'pending');
  x = await api.getAfterOrder({ id });
  assert.equal(x.identity_status, 'verified'); assert.equal(x.identity_at_order, false, '下单时未实名的事实不变'); assert.equal(after.accessView(x, Date.now()).state, 'before_start');
  const m = order({ identity: false, stage: S.PAID, startAt: now0 + 3 * DAY, agoDays: 1 });
  assert.equal((await api.submitOrderIdentity({ id: m.id, name: '王小明', id_no: '11010519900101001X', simulate: 'mismatch' })).identity_status, 'mismatch');
  const list = await api.getMessages();
  assert.ok(list.length > 0); assert.ok(list[0].created_at >= list[list.length - 1].created_at, '新消息在前');
  assert.ok(list.some((v) => v.title === T.messages.demo.identityTodo), '演示订单里未实名的那笔带一条待办消息');
  assert.ok(list.every((v) => v.type && v.created_at > 0 && v.read === false));
  assert.equal((await api.getMessagesUnread()).unread, list.length);
  await api.readMessages(); assert.equal((await api.getMessagesUnread()).unread, 0);
});

// ---------- 页面 ----------
test('页面：6 个受限页保留登录守卫；入仓指引与消息不受限，未登录显示空态', async () => {
  for (const n of ['IDENTITY', 'RENEW', 'EXIT', 'DEPOSIT', 'INVOICE', 'ECONTRACT']) {
    fresh(false); const pg = env.newPage(base(routes[n]), { id: 'MK1' });
    assert.equal(pg.__blocked, true, n); assert.deepEqual(env.nav, [{ kind: 'switchTab', url: routes.MINE }], n);
  }
  fresh(false);
  const acc = await page(routes.ACCESS, { id: 'MK1' }); assert.ok(!acc.__blocked); assert.equal(acc.data.sys, ''); assert.equal(acc.data.empty, true);
  const msg = await page(routes.MESSAGES, {}); assert.ok(!msg.__blocked); assert.equal(msg.data.guest, true); assert.equal(msg.data.empty, false); assert.equal(msg.data.sys, ''); // 未登录：登录后查看消息
  for (const n of ['IDENTITY', 'ACCESS', 'RENEW', 'EXIT', 'DEPOSIT', 'INVOICE', 'ECONTRACT', 'MESSAGES']) assert.ok(!/AUTO-PLACEHOLDER/.test(fs.readFileSync(path.join(root, base(routes[n]) + '.js'), 'utf8')), n);
});
test('页面：订单号不存在或订单未付款 → 空态；没带订单号时自动取一笔', async () => {
  fresh();
  for (const n of ['RENEW', 'EXIT', 'DEPOSIT', 'INVOICE', 'ECONTRACT', 'IDENTITY', 'ACCESS']) {
    const pg = await page(routes[n], { id: 'NOPE' }); assert.equal(pg.data.sys, '', n); assert.equal(pg.data.empty, true, n);
    const pend = db.orders.find((x) => x.stage === S.PENDING);
    const p2 = await page(routes[n], { id: pend.id }); assert.equal(p2.data.empty, true, n + ' 待支付订单');
  }
  const rn = await page(routes.RENEW, {}); assert.equal(rn.data.empty, false); assert.equal(rn.data.order.stage, S.EXPIRING); rn.onUnload();
  const none = await page(routes.DEPOSIT, {}); assert.equal(none.data.empty, false, '从「我的」进押金页不带订单号'); none.onUnload();
  const dp = await page(routes.DEPOSIT, { id: db.orders.find((x) => x.stage === S.ENDED && x.deposit.status === 'partial').id }); assert.equal(dp.data.st, 'refunded_partial');
  assert.deepEqual(dp.data.settle.map((r) => r.k), ['订单押金', '已扣费用', '实际退还']); assert.equal(dp.data.settle[1].v, '−¥40');
});
test('页面 续租：沿用原折扣的填写 → 提交（先请求订阅）→ 报价待确认 → 确认并支付 → 先支付后订阅到期提醒', async () => {
  fresh();
  const o = order({ factor: 0.6, months: 12, agoDays: 350, startAt: now0 - 349 * DAY, stage: S.EXPIRING }), id = o.id;
  const calls = []; const realSub = wx.requestSubscribeMessage;
  C.subscribeTemplates.renewQuote = ['TPL_RENEW']; C.subscribeTemplates.expire = ['TPL_EXPIRE'];
  wx.requestSubscribeMessage = (opt) => { calls.push(opt.tmplIds[0] + ':' + ((raw(id).renew && raw(id).renew.status) || 'none')); realSub(opt); };
  try {
    const pg = await page(routes.RENEW, { id });
    assert.equal(pg.data.st, 'form'); assert.equal(pg.data.head.title, '申请续租'); assert.equal(pg.data.head.tag, '可申请');
    assert.equal(pg.data.form.months, 12); assert.equal(pg.data.form.rule, '可续租 1–48个月，累计租期不超过 60 个月');
    assert.equal(pg.data.card.main.amt, '约 ¥2,880'); assert.equal(pg.data.card.main.tag, '6折');
    assert.equal(pg.data.card.keep, '首次续租沿用您原订单的 6 折，比现在 12 个月的 6.5 折每月少 ¥20。');
    assert.equal(pg.data.bar.lab, '续租 12个月 · 沿用 6 折'); assert.equal(pg.data.bar.amt, '约 ¥2,880'); assert.equal(pg.data.bar.btns[0].text, '提交续租需求');
    pg.onChip({ currentTarget: { dataset: { m: 6 } } }); assert.equal(pg.data.form.months, 6); pg.onPlus(); pg.onMinus(); pg.onMinus(); assert.equal(pg.data.form.months, 5);
    pg.onChip({ currentTarget: { dataset: { m: 12 } } });
    const p = pg.onSubmit(); assert.equal(pg.data.st, 'submitting'); assert.equal(pg.data.bar.btns[0].off, true); await p;
    assert.deepEqual(calls, ['TPL_RENEW:none'], '订阅在提交之前请求');
    assert.equal(pg.data.st, 'quote_pending'); assert.equal(pg.data.sub.text, '已开启微信通知。'); assert.equal(pg.data.note.text, '门店将在 3 天内确认报价，确认后会通知您。');
    await pg.refresh();
    assert.equal(pg.data.st, 'quote_ready'); assert.equal(pg.data.card.total.amt, '¥2,880'); assert.equal(pg.data.card.ref.k, '现行折扣价'); assert.equal(pg.data.card.ref.amt, '¥3,120');
    assert.equal(pg.data.card.keep, '首次续租沿用您原订单的 6 折，比现在 12 个月的 6.5 折每月少 ¥20，本次共少 ¥240。');
    assert.deepEqual(pg.data.alt.map((a) => a.text), ['暂不续租'], '沿用原折扣时不出「按常规折扣续租」');
    assert.equal(pg.data.card.rule, '报价 24 小时内有效。付款完成后新租期生效。'); assert.match(pg.data.card.kv[0].v, / · 剩余 2[34]:\d\d:\d\d$/);
    await pg.onConfirm(); assert.equal(pg.data.st, 'payment_pending'); assert.equal(pg.data.paySheet, true);
    assert.deepEqual(pg.data.bar.btns.map((b) => b.text), ['稍后支付', '立即付款']);
    await pg.onPayLater(); assert.equal(pg.data.st, 'cancelled'); assert.equal(pg.data.head.title, '续租付款已暂缓'); assert.equal(pg.data.bar.btns[0].text, '继续付款');
    pg.onPayNow(); assert.equal(pg.data.paySheet, true);
    await pg.onPayConfirm();
    assert.deepEqual(calls, ['TPL_RENEW:none', 'TPL_EXPIRE:paid'], '到期提醒订阅在支付成功之后请求');
    assert.equal(pg.data.st, 'completed'); assert.equal(pg.data.head.title, '续租已生效'); assert.equal(pg.data.card.total.k, '已付');
    assert.deepEqual(pg.data.bar.btns.map((b) => b.text), ['申请发票', '返回订单详情']); assert.equal(pg.data.steps.every((s) => s.cls === 'done'), true);
    env.nav.length = 0; pg.onInvoice(); assert.deepEqual(env.nav, [{ kind: 'navigateTo', url: routes.INVOICE + '?id=' + id }]);
    pg.onUnload();
    // 续租后发票页有两笔付款
    const iv = await page(routes.INVOICE, { id });
    assert.deepEqual(iv.data.pays.map((x) => [x.label, x.amt]), [['下单支付', pricing.yuan(o.quote.payable)], ['续租费用', '¥2,880']]);
    assert.deepEqual(iv.data.pays[0].split.map((s) => s.k), ['租金', '押金', '管理费']); assert.deepEqual(iv.data.pays[1].split.map((s) => s.k), ['续租租金']);
    iv.onPickPay(); assert.equal(iv.data.sheet, true); iv.onOpt({ currentTarget: { dataset: { id: 'RENEWAL1' } } }); iv.onSheetOk();
    assert.equal(iv.data.sheet, false); assert.equal(iv.data.pays[1].on, true);
  } finally { wx.requestSubscribeMessage = realSub; C.subscribeTemplates.renewQuote = []; C.subscribeTemplates.expire = []; }
});
test('页面 续租：取消订阅不拦提交；报价过期（沿用）主按钮是「重新提交续租需求」；付款失败态', async () => {
  fresh(); env.mode = 'fail'; // 假环境里 fail = 用户在订阅框点了取消
  C.subscribeTemplates.renewQuote = ['TPL_RENEW'];
  try {
    const id = order({ factor: 0.6, months: 12, agoDays: 350, startAt: now0 - 349 * DAY, stage: S.EXPIRING }).id;
    const pg = await page(routes.RENEW, { id });
    await pg.onSubmit();
    assert.equal(pg.data.st, 'quote_pending'); assert.equal(pg.data.sub.text, '未开启微信通知。'); assert.equal(pg.data.sub.ok, false); assert.equal(pg.data.note.text, '门店将在 3 天内确认报价，确认后可在「消息」查看。');
    env.mode = 'ok'; await pg.onSubAsk(); assert.equal(raw(id).renew.notify, 'accepted', '结果页的「开启通知」');
    await pg.refresh(); raw(id).renew.quoted_at -= 25 * H; await pg.refresh();
    assert.equal(pg.data.st, 'quote_expired'); assert.equal(pg.data.head.title, '续租报价已过期');
    assert.equal(pg.data.note.text, '续租报价已过期。首次续租仍可沿用原订单的 6 折，重新提交后由门店确认。');
    assert.equal(pg.data.bar.btns[0].text, '重新提交续租需求'); assert.equal(pg.data.bar.amt, '约 ¥2,880'); assert.equal(pg.data.card.ref.k, '原门店报价'); assert.equal(pg.data.card.ref.strike, true);
    await pg.onSubmit(); assert.equal(pg.data.st, 'quote_pending');
    await pg.refresh(); await pg.onConfirm(); Object.assign(raw(id).renew, { pay: 'failed' }); await pg.refresh();
    assert.equal(pg.data.st, 'payment_failed'); assert.equal(pg.data.fail, true); assert.equal(pg.data.steps[3].cls, 'fail'); assert.equal(pg.data.bar.btns[0].text, '重新支付'); assert.equal(pg.data.head.tone, 'err');
    pg.onUnload();
  } finally { C.subscribeTemplates.renewQuote = []; }
  // 普通续租：金额不显示，规则句照冻结稿；退仓中不能续租
  fresh();
  const n = await page(routes.RENEW, { id: order({ months: 6 }).id });
  assert.equal(n.data.card.main.amt, '提交后由门店报价'); assert.equal(n.data.card.rule, '续租价格以门店确认的报价为准。'); assert.equal(n.data.bar.amt, '报价待门店确认'); n.onUnload();
  const u = await page(routes.RENEW, { id: order({ stage: S.EXITING }).id });
  assert.equal(u.data.st, 'unavailable'); assert.equal(u.data.note.text, '退仓处理中的订单不能续租。'); assert.equal(u.data.bar.btns[0].text, '返回订单详情'); u.onUnload();
});
test('页面 退仓：提前退仓确认弹层三行、申请验仓时请求订阅、未起租是退订、已到期可办续租', async () => {
  fresh();
  const o = order({ startAt: now0 - 39 * DAY }), id = o.id, today = after.ymd(Date.now());
  const calls = []; const realSub = wx.requestSubscribeMessage; C.subscribeTemplates.inspect = ['TPL_INSPECT'];
  wx.requestSubscribeMessage = (opt) => { calls.push(opt.tmplIds[0] + ':' + raw(id).exit.status); realSub(opt); };
  try {
    const pg = await page(routes.EXIT, { id });
    // 离到期还有 10 个多月：到期退仓还不能提交，只有提前退仓（R-01）
    assert.equal(pg.data.st, 'form'); assert.equal(pg.data.form.type, 'early'); assert.equal(pg.data.form.canEarly, false, '只有一种类型时不出切换');
    assert.equal(pg.data.form.tip, '到期退仓自 ' + after.expiryExitFrom(o) + ' 起可提交（租期结束前 7 天内）。');
    pg.onType({ currentTarget: { dataset: { v: 'expiry' } } }); assert.equal(pg.data.form.type, 'early');
    assert.equal(pg.data.form.type, 'early'); assert.equal(pg.data.form.date, today);
    assert.deepEqual(pg.data.confirmRows.map((r) => r.k), ['退仓类型', '计划取空日期', '预计结算费用', '费用结算', '已享优惠']);
    assert.equal(pg.data.confirmRows[2].v, '约 ' + pricing.yuan(after.earlyExitEstimate(o, today).fee)); assert.equal(pg.data.confirmRows[3].link, '查看协议');
    pg.onDate({ detail: { value: 'bad' } }); assert.equal(pg.data.form.date, today);
    pg.onSubmit(); assert.equal(pg.data.confirm, true);
    env.nav.length = 0; pg.onAgreement(); assert.deepEqual(env.nav, [{ kind: 'navigateTo', url: routes.AGREEMENT + '?doc=usage' }]);
    await pg.onConfirm();
    assert.equal(pg.data.st, 'requested'); assert.equal(pg.data.head.title, '退仓已提交'); assert.equal(pg.data.steps[0].s, '提前退仓 · 计划取空 ' + today); assert.equal(pg.data.bar.btns[0].text, '确认清空并申请验仓');
    await pg.onInspect();
    assert.deepEqual(calls, ['TPL_INSPECT:requested']);
    assert.equal(pg.data.st, 'waiting'); assert.equal(pg.data.sub.text, '已开启微信通知，验仓有结果时会提醒您。'); assert.deepEqual(pg.data.bar.btns.map((b) => b.text), ['返回订单详情', '联系门店']);
    await pg.refresh(); assert.equal(pg.data.st, 'passed'); assert.equal(pg.data.steps[3].s, '退款处理中'); assert.equal(pg.data.bar.btns[0].text, '查看押金进度');
    env.nav.length = 0; pg.onDeposit(); assert.deepEqual(env.nav, [{ kind: 'navigateTo', url: routes.DEPOSIT + '?id=' + id }]);
    const dp = await page(routes.DEPOSIT, { id });
    assert.equal(dp.data.st, 'refund_pending'); assert.equal(dp.data.bar.btns[0].text, '查看处理进度'); dp.onProgress(); assert.equal(dp.data.sheet, true); assert.equal(dp.data.info.length, 3); dp.onUnload();
  } finally { wx.requestSubscribeMessage = realSub; C.subscribeTemplates.inspect = []; }
  const up = await page(routes.EXIT, { id: order({ stage: S.PAID, startAt: now0 + 3 * DAY, agoDays: 1 }).id });
  assert.equal(up.data.st, 'not_started'); assert.equal(up.data.head.title, '订单尚未起租'); assert.equal(up.data.form, null); assert.equal(up.data.steps.length, 0);
  assert.deepEqual(up.data.cancel.map((r) => r.k), ['退订说明', '已付租金', '押金', '办理方式']); assert.equal(up.data.cancel[2].v, '请咨询客服');
  const over = await page(routes.EXIT, { id: order({ stage: S.OVERDUE, months: 3, agoDays: 100, startAt: now0 - 99 * DAY }).id });
  assert.equal(over.data.st, 'form_expired'); assert.equal(over.data.note.title, ''); assert.match(over.data.note.text, /^租期已于 \d{4}-\d\d-\d\d 到期，超出的天数按协议另行计费。$/); assert.equal(over.data.form.canEarly, false);
  assert.deepEqual(over.data.bar.btns.map((b) => b.text), ['办理续租', '提交退仓安排']); assert.equal(over.data.form.rule, '租期已到期，取空日期为今天。');
});
test('页面 押金：保管中只显示「退还时限」一行，点开后展开', async () => {
  fresh();
  const pg = await page(routes.DEPOSIT, { id: order({}).id });
  assert.equal(pg.data.st, 'held'); assert.deepEqual(pg.data.info.map((r) => r.k), ['退还时限']); assert.equal(pg.data.more, true); assert.equal(pg.data.head.tag, '押金保管中');
  pg.onMore(); assert.deepEqual(pg.data.info.map((r) => r.k), ['退还时限', '退还方式', '结算说明']); assert.equal(pg.data.more, false);
  const f = order({}); f.stage = S.ENDED; f.deposit.status = 'failed';
  const pf = await page(routes.DEPOSIT, { id: f.id }); assert.equal(pf.data.fail, true); assert.equal(pf.data.steps[3].cls, 'fail'); assert.equal(pf.data.head.tag, '退款未成功');
});
test('页面 发票：填完才能提交 → 已提交 → 已开具（下载 / 发邮箱）；开票未成功保留原资料', async () => {
  fresh();
  const id = order({}).id, pg = await page(routes.INVOICE, { id });
  assert.equal(pg.data.head.title, '申请发票'); assert.equal(pg.data.bar.btns[0].off, true);
  assert.deepEqual([pg.data.notes[0].k, pg.data.notes[0].v], ['可开票金额', pricing.yuan(raw(id).quote.payable - raw(id).quote.deposit) + '（不含押金）']); assert.ok(!/请咨询客服/.test(JSON.stringify(pg.data.notes)));
  const input = (f, value) => pg.onInput({ currentTarget: { dataset: { f } }, detail: { value } });
  input('title', '张三'); input('email', 'zhangsan@example'); pg.onEmailBlur();
  assert.equal(pg.data.bar.btns[0].off, true);
  input('email', 'zhangsan@163.com'); assert.equal(pg.data.bar.btns[0].off, false);
  pg.onKind({ currentTarget: { dataset: { v: 'enterprise' } } }); assert.equal(pg.data.form.ent, true); assert.equal(pg.data.bar.btns[0].off, true, '企业要税号');
  env.nav.length = 0; pg.onTitles(); pg.onBatch(); assert.deepEqual(env.nav.map((n) => n.url), [routes.ENT_TITLES, routes.ENT_BATCH]);
  pg.onKind({ currentTarget: { dataset: { v: 'personal' } } });
  await pg.onSubmit();
  assert.equal(pg.data.head.title, '发票申请已提交'); assert.equal(pg.data.head.tag, '已提交'); assert.equal(pg.data.form, null); assert.equal(pg.data.records[0].s, '个人 · 张三');
  await pg.refresh();
  assert.equal(pg.data.head.title, '发票已开具'); assert.deepEqual(pg.data.bar.btns.map((b) => b.text), ['发送到邮箱', '下载发票']); assert.equal(pg.data.file[1].v, 'zhangsan@163.com');
  await pg.onSend(); await pg.onDownload();
  raw(id).invoice.records[0].status = 'failed'; await pg.refresh();
  assert.equal(pg.data.head.title, '开票未成功'); assert.equal(pg.data.fail, true); assert.equal(pg.data.form.title, '张三'); assert.equal(pg.data.bar.btns[0].text, '更正资料后重新提交'); assert.equal(pg.data.showPays, false);
  pg.onUnload();
});
test('页面 实名兜底与入仓指引：未实名拦截 → 提交资料 → 认证通过 → 入仓步骤 4 步变 3 步；开锁只提示', async () => {
  fresh();
  const id = order({ identity: false, stage: S.PAID, startAt: now0 + 3 * DAY, agoDays: 1 }).id;
  const acc = await page(routes.ACCESS, { id });
  assert.equal(acc.data.st, 'identity_required'); assert.equal(acc.data.steps.length, 4); assert.equal(acc.data.steps[1].cls, 'cur'); assert.equal(acc.data.bar.btns[0].text, '完成实名认证');
  assert.equal(acc.data.note, '这笔订单下单时未完成实名认证，完成后起租日起可入仓存取。');
  env.nav.length = 0; acc.onIdentity(); assert.deepEqual(env.nav, [{ kind: 'navigateTo', url: routes.IDENTITY + '?id=' + id }]);
  const pg = await page(routes.IDENTITY, { id });
  assert.equal(pg.data.st, 'none'); assert.equal(pg.data.tag, '待认证'); assert.equal(pg.data.bar.btns[0].text, '开始认证');
  pg.onOpen(); assert.equal(pg.data.sheet, true);
  pg.onName({ detail: { value: '王' } }); pg.onIdNo({ detail: { value: '1101' } }); pg.onSubmit();
  assert.equal(pg.data.nameErr, true); assert.equal(pg.data.idErr, true); assert.equal(raw(id).identity_status, 'none');
  pg.onName({ detail: { value: '王小明' } }); pg.onIdNo({ detail: { value: '11010519900101001X' } }); await pg.onSubmit();
  assert.equal(pg.data.st, 'pending'); assert.equal(pg.data.sheet, false); assert.equal(pg.data.bar, null); assert.equal(pg.data.steps[1].s, '资料已提交，请等待认证结果。');
  await pg.refresh(); assert.equal(pg.data.st, 'verified'); assert.equal(pg.data.bar.btns[0].text, '查看入仓指引');
  env.nav.length = 0; pg.onAccess(); assert.deepEqual(env.nav, [{ kind: 'navigateTo', url: routes.ACCESS + '?id=' + id }]); pg.onUnload();
  await acc.refresh(); assert.equal(acc.data.st, 'before_start'); assert.equal(acc.data.steps.length, 3, '认证通过后不再有实名这一步'); assert.equal(acc.data.before, true);
  raw(id).identity_status = 'mismatch'; const bad = await page(routes.IDENTITY, { id }); assert.equal(bad.data.bar.btns[0].text, '重新提交资料'); assert.equal(bad.data.steps[1].cls, 'fail'); bad.onUnload();
  // 下单时已实名、租用中：3 步，可查看开门信息（只提示）
  const act = db.orders.find((x) => x.stage === S.ACTIVE && x.identity_at_order);
  const ok = await page(routes.ACCESS, { id: act.id }); await tick();
  assert.equal(ok.data.st, 'allowed'); assert.equal(ok.data.steps.length, 3); assert.equal(ok.data.bar.btns[0].text, '查看仓位开门信息'); assert.equal(ok.data.steps[1].s, '可查看仓位开门信息');
  assert.ok(ok.data.arr && ok.data.arr.rows.length > 0, '「到店与进仓」卡有内容');
  let modal = null; const realModal = wx.showModal; wx.showModal = (m) => { modal = m; };
  ok.onOpen(); wx.showModal = realModal;
  assert.equal(modal.title, '仓位开锁'); assert.equal(modal.content, '当前仓门设备暂未接入。如需存取，请联系门店协助。'); assert.deepEqual([modal.cancelText, modal.confirmText], ['知道了', '联系门店'], '开门信息弹窗带联系门店（FIX-01 C-06）');
  env.nav.length = 0; ok.onStoreGuide(); assert.equal(env.nav[0].url.indexOf(routes.STORE_DETAIL + '?id=' + act.store.id), 0);
  env.mode = 'fail'; ok.onNavigate(); env.mode = 'ok'; ok.onNavigate();
  const ended = db.orders.find((x) => x.stage === S.ENDED);
  const off = await page(routes.ACCESS, { id: ended.id }); assert.equal(off.data.st, 'inactive'); assert.equal(off.data.lease.text, '已退仓'); assert.equal(off.data.bar, null);
});
test('页面 电子合同：已签署显示签署信息与三份协议入口；未签署是空态', async () => {
  fresh();
  const o = db.orders.find((x) => x.stage === S.ACTIVE), pg = await page(routes.ECONTRACT, { id: o.id });
  assert.equal(pg.data.empty, false); assert.equal(pg.data.head.title, '自助式设备设施使用协议'); assert.equal(pg.data.head.tag, '已签署');
  assert.deepEqual(pg.data.sign.map((r) => r.k), ['提供方（甲方）', '使用方（乙方）', '签署时间', '签署方式']);
  assert.deepEqual(pg.data.info.map((r) => r.k), ['订单号', '门店', '仓位', '租期', '起止日期']); assert.equal(pg.data.info[0].v, o.no);
  assert.equal(pg.data.foot, '如对合同内容有疑问，请联系客服 400-035-8885。');
  env.nav.length = 0;
  pg.data.docs.forEach((d) => pg.onDoc({ currentTarget: { dataset: { doc: d.doc, anchor: d.anchor } } })); pg.onBar();
  assert.deepEqual(env.nav.map((n) => n.url), [routes.AGREEMENT + '?doc=usage', routes.AGREEMENT + '?doc=notice', routes.AGREEMENT + '?doc=usage&anchor=att2', routes.AGREEMENT + '?doc=usage']);
  const un = order({}); un.contract = { signed: false, signed_at: 0, signer_masked: '' };
  assert.equal((await page(routes.ECONTRACT, { id: un.id })).data.empty, true);
});
test('页面 消息：未读红点，进入即已读；按类型落到对应页面', async () => {
  fresh();
  const o = order({ identity: false, stage: S.PAID, startAt: now0 + 3 * DAY, agoDays: 1 });
  db.messages.push({ id: 'T1', type: 'identity', title: '付款完成，请完成实名认证', text: '', order_id: o.id, created_at: Date.now() + 1000, read: false });
  db.messages.push({ id: 'T2', type: 'transport', title: '运输预约已提交，预计 10 分钟内与您联系', created_at: Date.now() + 2000, read: false });
  const pg = await page(routes.MESSAGES, {}); await tick();
  assert.equal(pg.data.empty, false); assert.equal(pg.data.list[0].id, 'T2'); assert.equal(pg.data.list[0].unread, true);
  assert.deepEqual([pg.data.list[0].tag, pg.data.list[0].link], ['运输', '查看运输预约']); assert.deepEqual([pg.data.list[1].tag, pg.data.list[1].link], ['实名认证', '查看认证进度']);
  assert.match(pg.data.list[0].time, /^\d\d-\d\d \d\d:\d\d$/);
  assert.equal((await api.getMessagesUnread()).unread, 0, '看过即已读');
  env.nav.length = 0; pg.onLink({ currentTarget: { dataset: { i: 1 } } }); pg.onLink({ currentTarget: { dataset: { i: 0 } } });
  assert.deepEqual(env.nav.map((n) => n.url), [routes.IDENTITY + '?id=' + o.id, routes.TRANSPORT]);
  await pg.refresh(); assert.equal(pg.data.list.every((r) => !r.unread), true);
  db.messages.length = 0; await pg.refresh(); assert.equal(pg.data.empty, true);
});

// ---------- 文案与约定 ----------
test('文案：用词遵守 §4.11；界面不出现违约金比例、倍数与占位字', () => {
  const text = JSON.stringify(T);
  for (const bad of ['退租', '验收', '身份验证', '工作人员', '待业务提供', '待财务确认', '20%', '1.2 倍', '演示', '示例']) assert.ok(text.indexOf(bad) < 0, bad);
  assert.equal(T.identity.note, '这笔订单下单时未完成实名认证，完成后起租日起可入仓存取。');
  assert.equal(T.exit.confirmText, '提交后进入退仓流程；如需继续用仓，请先办理续租。');
  assert.equal(T.renew.ruleNormal, '续租价格以门店确认的报价为准。');
  for (const p of ['pkg-after/identity', 'pkg-after/access', 'pkg-after/renew', 'pkg-after/exit', 'pkg-after/deposit', 'pkg-after/invoice', 'pkg-after/econtract', 'pkg-account/messages']) {
    const wxml = fs.readFileSync(path.join(root, p, 'index.wxml'), 'utf8').replace(/aria-label="[^"]*"/g, '');
    assert.ok(!/[\u4e00-\u9fff]/.test(wxml), p + ' 的 WXML 里不写死中文');
    assert.ok(!/requestPayment/.test(fs.readFileSync(path.join(root, p, 'index.js'), 'utf8')), p + ' 不直接调微信支付');
  }
});
