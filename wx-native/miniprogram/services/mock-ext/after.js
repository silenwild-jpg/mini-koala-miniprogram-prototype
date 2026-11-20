// 演示数据适配器的「after」部分（W34）：续租、退仓、押金、发票、实名兜底、消息。
// methods 里的每个函数签名为 (params, session) => Promise，与真实接口同名同结构；直接改 db.orders 里的订单对象。
// 演示环境没有门店后台：门店报价、验仓、退款、开票、实名审核由 advance() 按 core/config-after.js 的 demo 间隔自动推进。
// 失败态在演示环境不会自动出现，页面按数据渲染。不出现在界面上的触发方式（真实接口没有这些参数，与 mock-ext/trade.js 同一约定）：
//   payRenewal({ simulate: 'fail' }) 续租付款失败；submitOrderIdentity({ simulate: 'mismatch' }) 实名未通过。
// 同一组失败也可以在演示工具页打开（mock/scenarios.js EVENTS 的租后事件），由这里在对应步骤触发，页面不用带参数：
//   renew_pay_fail 续租付款失败；idv_mismatch 实名未通过；inspect_fail 验仓未通过；refund_fail 押金退款未成功；invoice_fail 开票未成功；
//   store_hold 门店暂不处理（下面 advance 里的自动推进全部停住，关闭后从停住的地方继续）。
const { db, seed, REASON } = require('./_db');
const scenarios = require('../../mock/scenarios');
const A = require('../../core/config-after');
const after = require('../../core/after');
const O = require('../../core/order');
const pricing = require('../../core/pricing');
const T = require('../../i18n/after').messages.demo;
const S = O.STAGE;
const ok = (v) => new Promise((resolve) => setTimeout(() => resolve(JSON.parse(JSON.stringify(v))), 0));
const fail = (code, message) => Promise.reject({ code, message });
const kv = () => db.kv.after || (db.kv.after = { msgSeq: 0, seeded: false });

function notify(type, title, o) {
  const k = kv();
  db.messages.push({ id: 'MA' + (++k.msgSeq), type, title, text: '', order_id: o ? o.id : '', created_at: Date.now(), read: false });
}
function find(p) { seed(); return db.orders.find((x) => x.id === (p && p.id)) || null; }
// 取一笔已付款订单并做前置检查；返回 [order, 错误 Promise]
function paid(p) {
  const o = find(p);
  if (!o) return [null, fail('NOT_FOUND', '订单不存在')];
  if (!after.isPaid(o)) return [null, fail('INVALID', '需要已付款订单才能办理此项服务')];
  advance(o, Date.now());
  return [o, null];
}
function invoiceSummary(o) {
  const rs = o.invoice.records || [], last = rs[rs.length - 1];
  o.invoice.status = !rs.length ? 'none' : rs.every((r) => r.status === 'issued') ? 'issued' : 'applying';
  o.invoice.title = last ? last.title : '';
}
function finishRefund(o) {
  const d = o.deposit, fee = Number(d.pending_fee) || 0;
  d.refunded = Math.max(0, Number(d.amount) - fee); d.status = fee > 0 ? 'partial' : 'refunded';
  notify('deposit', T.depositRefunded, o);
}
// 演示推进：把「等门店 / 等后台」的状态按时间走到下一步
function advance(o, now) {
  const D = A.demo, r = o.renew, x = o.exit, d = o.deposit;
  if (r && r.status === 'quoted' && O.isExpired(after.renewDeadline(r.quoted_at, o.lease.end), now)) { r.status = 'expired'; r.pay = ''; } // 报价过期与门店无关，照常发生
  if (scenarios.eventOn('store_hold')) return o;
  if (o.identity_status === 'pending' && o.identity_submitted_at && now - o.identity_submitted_at >= D.identityMs) {
    o.identity_status = 'verified'; notify('identity', T.identityOk, o);
    // 实名是账号级的：同步到交易域的实名记录（mock-ext/trade.js 的 db.kv.trade.identity，同一结构），之后下单不用再认证
    const rec = o.identity_record, t = db.kv.trade;
    if (rec && t && t.identity) t.identity[rec.key] = { status: 'verified', name_masked: rec.name_masked, id_masked: rec.id_masked, verified_at: now };
    delete o.identity_record;
  }
  if (r && r.status === 'submitted' && now - r.submitted_at >= D.storeQuoteMs) {
    const q = after.renewQuote(o, r.months); // 门店报价：首次续租原折扣更深时沿用，否则现行折扣
    Object.assign(r, { status: 'quoted', quoted_at: now, factor: q.factor, kept: q.kept, amount: q.total, monthly: q.monthly, pay: '' });
    notify('renew', T.renewQuote, o);
  }
  if (x && x.status === 'waiting' && now - x.inspect_at >= D.inspectMs) {
    if (scenarios.take('inspect_fail')) { x.status = 'failed'; x.fail_reason = REASON.inspect; notify('exit', T.inspectFailed, o); }
    else {
      x.status = 'passed'; x.passed_at = now; o.stage = S.ENDED;
      d.status = 'refunding'; d.refund_at = now;
      notify('exit', T.inspectPassed, o);
    }
  }
  if (d && d.status === 'refunding' && d.refund_at && now - d.refund_at >= D.refundMs) {
    if (scenarios.take('refund_fail')) { d.status = 'failed'; d.fail_reason = REASON.refund; notify('deposit', T.depositFailed, o); }
    else finishRefund(o);
  }
  const rs = (o.invoice && o.invoice.records) || [];
  rs.forEach((v) => {
    if (v.status === 'submitted' && now - v.submitted_at >= D.invoiceProcessMs) v.status = 'processing';
    if (v.status === 'processing' && now - v.submitted_at >= D.invoiceIssueMs) {
      if (scenarios.take('invoice_fail')) { v.status = 'failed'; v.fail_reason = REASON.invoice; notify('invoice', T.invoiceFailed, o); }
      else { v.status = 'issued'; v.issued_at = now; notify('invoice', T.invoiceIssued, o); }
    }
  });
  if (rs.length) invoiceSummary(o);
  return o;
}
function seedMessages() { // 演示订单里下单时未实名的那笔，带一条待办消息（冻结稿 acc messages 的样例）
  const k = kv(); if (k.seeded) return; k.seeded = true; seed();
  db.orders.filter((o) => after.isPaid(o) && o.identity_status === 'none').forEach((o) => notify('identity', T.identityTodo, o));
  // 演示场景自带的消息（mock/scenarios.js 的 messages）：标题取 i18n 里已有的句子，时间相对当前时刻
  const sc = scenarios.scenario(), now = Date.now();
  ((sc && sc.messages) || []).forEach((m) => { const o = db.orders[m.order]; db.messages.push({ id: 'MA' + (++k.msgSeq), type: m.type, title: T[m.title] || m.title, text: '', order_id: o ? o.id : '', created_at: now - (m.agoHours || 0) * 3600e3, read: !!m.read }); });
}

const methods = {
  // 租后页取订单：与 getOrder 同结构，演示环境顺带推进一次进度
  getAfterOrder(p) { const o = find(p); return o ? ok(advance(o, Date.now())) : fail('NOT_FOUND', '订单不存在'); },

  // ---- 续租 ----
  requestRenewal(p) { // { id, months, notify }
    const [o, e] = paid(p); if (e) return e;
    const v = after.renewView(o, Date.now()), m = Number(p.months);
    if (v.state !== 'form' && v.state !== 'quote_expired') return fail('CONFLICT', '当前不能提交续租需求');
    if (!Number.isInteger(m) || m < 1 || m > after.renewMaxMonths(o)) return fail('INVALID', '续租月数超出范围');
    o.renew = { months: m, status: 'submitted', submitted_at: Date.now(), quoted_at: 0, factor: null, kept: false, amount: 0, monthly: 0, pay: '', notify: p.notify || '' };
    return ok(o);
  },
  cancelRenewal(p) { // 暂不续租：撤掉未付款的续租申请
    const [o, e] = paid(p); if (e) return e;
    if (o.renew && o.renew.status !== 'paid') o.renew = null;
    return ok(o);
  },
  confirmRenewal(p) { // { id, regular }：确认报价进入待支付；regular = 按常规折扣续租（报价过期后也可）
    const [o, e] = paid(p); if (e) return e;
    const now = Date.now(), v = after.renewView(o, now), r = o.renew;
    if (p.regular && (v.state === 'quote_ready' || (v.state === 'quote_expired' && !v.kept))) {
      const us = after.unitsForPricing(o), q = pricing.quote(us, r.months, { renewal: true });
      Object.assign(r, { status: 'quoted', quoted_at: now, factor: q.term_factor, kept: false, amount: q.rent_total, monthly: q.monthly_average, pay: 'pending' });
      return ok(o);
    }
    if (v.state === 'quote_expired') return fail('EXPIRED', '续租报价已过期');
    if (['quote_ready', 'payment_pending', 'payment_failed', 'cancelled'].indexOf(v.state) < 0) return fail('CONFLICT', '当前没有待确认的续租报价');
    r.pay = 'pending';
    return ok(o);
  },
  deferRenewalPay(p) { // 稍后支付
    const [o, e] = paid(p); if (e) return e;
    if (o.renew && o.renew.status === 'quoted' && o.renew.pay) o.renew.pay = 'cancelled';
    return ok(o);
  },
  payRenewal(p) { // 演示支付：不调微信支付，直接成功。新租期自当前租期截止日顺延，不中断
    const [o, e] = paid(p); if (e) return e;
    const now = Date.now(), v = after.renewView(o, now), r = o.renew;
    if (v.state === 'quote_expired') return fail('EXPIRED', '续租报价已过期');
    if (['payment_pending', 'payment_failed', 'cancelled'].indexOf(v.state) < 0) return fail('CONFLICT', '当前没有待支付的续租费用');
    if (p.simulate === 'fail' || scenarios.take('renew_pay_fail')) { r.pay = 'failed'; return fail('PAY_FAILED', '支付未成功'); }
    o.renewals = o.renewals || [];
    o.renewals.push({ id: 'RENEWAL' + (o.renewals.length + 1), months: r.months, amount: r.amount, factor: r.factor, paid_at: now });
    o.months = Number(o.months) + r.months; o.lease.end = after.addMonths(o.lease.end, r.months); o.renewal_count = (Number(o.renewal_count) || 0) + 1;
    Object.assign(r, { status: 'paid', pay: '', paid_at: now });
    if (o.stage === S.EXPIRING || o.stage === S.OVERDUE) o.stage = o.lease.end - now > A.expiringDays * 86400000 ? S.ACTIVE : S.EXPIRING;
    notify('renew', T.renewPaid, o);
    return ok(o);
  },

  // ---- 退仓 ----
  requestExit(p) { // { id, type: 'expiry'|'early', date }
    const [o, e] = paid(p); if (e) return e;
    const now = Date.now(), st = after.exitState(o, now), early = p.type === 'early';
    if (st !== 'form' && st !== 'form_expired') return fail('CONFLICT', st === 'not_started' ? '订单尚未起租，请联系门店办理退订' : '当前不能提交退仓安排');
    if (early && !after.canEarlyExit(o, now)) return fail('INVALID', '当前不能办理提前退仓');
    const rg = after.exitDateRange(o, early ? 'early' : 'expiry', now), d = String(p.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d < rg.min || (rg.max && d > rg.max)) return fail('INVALID', '请选择有效的取空日期');
    o.exit = { applied_at: now, date: d, early, estimate: early ? after.earlyExitEstimate(o, d) : null, status: 'requested', inspect_at: 0, notify: '', fail_reason: '', prev_stage: o.stage };
    if (o.renew && o.renew.status !== 'paid') o.renew = null; // 进入退仓流程后，未完成的续租申请作废
    o.stage = S.EXITING;
    notify('exit', T.exitRequested, o);
    return ok(o);
  },
  requestInspection(p) { // { id, notify }：确认清空并申请验仓 / 重新申请验仓
    const [o, e] = paid(p); if (e) return e;
    const x = o.exit;
    if (!x || (x.status !== 'requested' && x.status !== 'failed')) return fail('CONFLICT', '当前不能申请验仓');
    Object.assign(x, { status: 'waiting', inspect_at: Date.now(), notify: p.notify || '', fail_reason: '' });
    return ok(o);
  },

  // ---- 订阅结果回写（只影响结果页的一句话） ----
  setAfterNotify(p) { // { id, scene: 'renew'|'exit', notify: 'accepted'|'declined' }
    const [o, e] = paid(p); if (e) return e;
    const t = p.scene === 'renew' ? o.renew : o.exit;
    if (t) t.notify = p.notify || '';
    return ok(o);
  },

  // ---- 发票 ----
  submitInvoice(p) { // { id, payment_id, kind, title, tax_id, email }；有开票未成功的记录时视为更正后重新提交
    const [o, e] = paid(p); if (e) return e;
    if (!after.validateInvoice(p).ready) return fail('INVALID', '请填写完整的发票信息');
    const v = after.invoiceView(o), now = Date.now();
    o.invoice.records = v.records;
    const data = { kind: p.kind === 'enterprise' ? 'enterprise' : 'personal', title: String(p.title).trim(), tax_id: p.kind === 'enterprise' ? String(p.tax_id).trim() : '', email: String(p.email).trim(), status: 'submitted', submitted_at: now, fail_reason: '' };
    if (v.failed) Object.assign(v.failed, data);
    else {
      const pay = v.available.find((x) => x.id === p.payment_id) || (p.payment_id ? null : v.available[0]);
      if (!pay) return fail('CONFLICT', '这笔付款已申请过发票');
      v.records.push(Object.assign({ id: 'INV' + (v.records.length + 1), payment_id: pay.id, payment_type: pay.type, amount: pay.amount }, data));
    }
    invoiceSummary(o);
    return ok(o);
  },
  sendInvoiceEmail(p) { // { id, record_id }
    const [o, e] = paid(p); if (e) return e;
    const r = (o.invoice.records || []).find((x) => x.id === p.record_id && x.status === 'issued');
    return r ? ok({ email: r.email }) : fail('NOT_FOUND', '发票尚未开具');
  },
  getInvoiceFile(p) { // { id, record_id } → { url }。演示环境没有发票文件，url 为空
    const [o, e] = paid(p); if (e) return e;
    const r = (o.invoice.records || []).find((x) => x.id === p.record_id && x.status === 'issued');
    return r ? ok({ url: '' }) : fail('NOT_FOUND', '发票尚未开具');
  },

  // ---- 实名兜底（D-174）：下单时未实名的订单在付款后补认证 ----
  submitOrderIdentity(p, session) { // { id, name, id_no }：提交后先是「认证中」，结果稍后返回
    const [o, e] = paid(p); if (e) return e;
    if (o.identity_status === 'verified') return ok(o);
    const v = after.validateIdentity(p);
    if (v.nameError || v.idError) return fail('INVALID', v.nameError ? '请填写有效姓名' : '请填写18位证件号码');
    if (p.simulate === 'mismatch' || scenarios.take('idv_mismatch')) { o.identity_status = 'mismatch'; notify('identity', T.identityFail, o); return ok(o); }
    const name = String(p.name).trim(), no = String(p.id_no).trim().toUpperCase();
    o.identity_status = 'pending'; o.identity_submitted_at = Date.now();
    o.identity_record = { key: (session && session.phoneMasked) || '', name_masked: '*'.repeat(name.length - 1) + name.slice(-1), id_masked: no.slice(0, 3) + '*'.repeat(11) + no.slice(-4) };
    return ok(o);
  },

  // ---- 消息 ----
  getMessages() { seedMessages(); db.orders.forEach((o) => { if (after.isPaid(o)) advance(o, Date.now()); }); return ok(db.messages.slice().reverse().sort((a, b) => (Number(b.created_at) || 0) - (Number(a.created_at) || 0))); }, // 新消息在前
  readMessages() { db.messages.forEach((m) => { m.read = true; }); return ok({ unread: 0 }); },
  getMessagesUnread(p, session) { // 「我的」消息角标是未读数（§4.7-6）；未登录为 0
    if (!session || !session.loggedIn) return ok({ unread: 0 });
    seedMessages();
    return ok({ unread: db.messages.filter((m) => !m.read).length });
  }
};
module.exports = {
  needLogin: ['getAfterOrder', 'requestRenewal', 'cancelRenewal', 'confirmRenewal', 'deferRenewalPay', 'payRenewal', 'requestExit', 'requestInspection', 'setAfterNotify', 'submitInvoice', 'sendInvoiceEmail', 'getInvoiceFile', 'submitOrderIdentity', 'getMessages', 'readMessages'],
  methods
};
