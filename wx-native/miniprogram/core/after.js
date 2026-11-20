// 租后规则（交接 v1.0 §4.6-13、§4.8、§4.10）。纯函数，不依赖 wx；tests/after.test.js 覆盖。
// 订单金额只读 order.quote；续租金额用 pricing.quote 按订单里保存的月基价与成交折扣算。
// 订单上由租后接口推进的字段（在 core/order-model.js 注释的基础上细化，接真实接口时后端按同样字段返回）：
//   renew    { months, status: 'submitted'|'quoted'|'expired'|'paid', submitted_at, quoted_at, factor, kept, amount, monthly,
//              pay: ''|'pending'|'failed'|'cancelled', notify: ''|'accepted'|'declined', paid_at }
//   renewals [{ id, months, amount, factor, paid_at }]   已完成的续租付款；订单 months、lease.end 同步累加
//   exit     { applied_at, date:'YYYY-MM-DD', early, estimate, status: 'requested'|'waiting'|'failed'|'passed', inspect_at, notify, fail_reason }
//   deposit  { status: 'holding'|'refunding'|'refunded'|'partial'|'failed', amount, pending_fee, refunded, refund_at, fail_reason }
//   invoice  { status: 'none'|'applying'|'issued', title, records: [{ id, payment_id, payment_type, amount, kind, title, tax_id, email, status: 'submitted'|'processing'|'issued'|'failed', submitted_at }] }
const C = require('./config');
const A = require('./config-after');
const pricing = require('./pricing');
const O = require('./order');
const S = O.STAGE;
const H = 3600000, DAY = 24 * H, TZ = 8 * H, EPS = 1e-9;
const PAID = [S.PAID, S.ACTIVE, S.EXPIRING, S.OVERDUE, S.EXITING, S.ENDED];
const isPaid = (o) => !!o && PAID.indexOf(o.stage) >= 0;

// ---- 显示用的小工具（时间一律按北京时间） ----
const iso = (ms) => new Date(Number(ms) + TZ).toISOString();
const ymd = (ms) => iso(ms).slice(0, 10);
const ymdhm = (ms) => { const t = iso(ms); return t.slice(0, 10) + ' ' + t.slice(11, 16); };
const mdhm = (ms) => { const t = iso(ms); return t.slice(5, 10) + ' ' + t.slice(11, 16); };
const dayStart = (d) => Date.parse(d + 'T00:00:00Z') - TZ; // 'YYYY-MM-DD'（北京时间）当天 0 点的毫秒
const p2 = (n) => String(n).padStart(2, '0');
function countdown(deadlineMs, nowMs) {
  const r = Math.max(0, Math.ceil((Number(deadlineMs) - nowMs) / 1000));
  return p2(Math.floor(r / 3600)) + ':' + p2(Math.floor(r % 3600 / 60)) + ':' + p2(r % 60);
}
const fill = (tpl, o) => String(tpl).replace(/\{(\w+)\}/g, (m, k) => (o && o[k] !== undefined && o[k] !== null ? o[k] : ''));
const zhe = (f) => Number((Number(f) * 10).toFixed(1)) + ' 折'; // 「6 折」「6.5 折」
const addMonths = (ms, n) => { const d = new Date(ms); d.setMonth(d.getMonth() + n); return d.getTime(); }; // 与 order-model 算到期日同一写法

// 没带订单号进入时取哪一笔：按各服务最可能要办的阶段排
const PICK = {
  renew: [S.EXPIRING, S.OVERDUE, S.ACTIVE, S.PAID],
  exit: [S.EXITING, S.OVERDUE, S.EXPIRING, S.ACTIVE, S.PAID],
  deposit: [S.EXITING, S.ENDED, S.ACTIVE, S.EXPIRING, S.OVERDUE, S.PAID],
  access: [S.ACTIVE, S.EXPIRING, S.PAID, S.EXITING, S.OVERDUE, S.ENDED]
};
function pickOrder(orders, kind) {
  const paid = (orders || []).filter(isPaid);
  if (kind === 'identity') return paid.find((o) => o.identity_status !== 'verified') || paid[0] || null;
  const pri = PICK[kind];
  if (!pri) return paid[0] || null;
  for (let i = 0; i < pri.length; i++) { const o = paid.find((x) => x.stage === pri[i]); if (o) return o; }
  return null;
}

// ---- 续租（§4.8-1；D-186、D-192） ----
// 由订单里保存的月基价还原定价用的仓位（特价仓保持特价）
const unitsForPricing = (order) => order.quote.unit_pricing.map((r) => ({ id: r.unit_id, base_month: r.base_month, special_month: r.special ? r.monthly_rent : null }));
const renewMaxMonths = (order) => C.requirement.termMax - Number(order.months);
const renewDefaultMonths = (order) => Math.max(1, Math.min(renewMaxMonths(order), Number(order.quote.months) || 6));
// 首次续租：原折扣更深时沿用，并带现行折扣价对照；否则取现行。第二次起按现行表。
function renewQuote(order, months) {
  const rf = pricing.renewalFactor(order, months), us = unitsForPricing(order);
  const q = pricing.quote(us, months, { renewal: true, factorOverride: rf.factor });
  const cur = rf.kept ? pricing.quote(us, months, { renewal: true }) : q;
  const kept = rf.kept && !q.special && cur.rent_total > q.rent_total;
  return {
    months, kept, special: q.special, factor: kept ? rf.factor : rf.current, label: zhe(kept ? rf.factor : rf.current),
    monthly: kept ? q.monthly_average : cur.monthly_average, total: kept ? q.rent_total : cur.rent_total,
    currentFactor: rf.current, currentLabel: zhe(rf.current), currentMonthly: cur.monthly_average, currentTotal: cur.rent_total,
    lessMonthly: kept ? cur.monthly_average - q.monthly_average : 0, lessTotal: kept ? cur.rent_total - q.rent_total : 0
  };
}
// 报价截止：「报价 + 24 小时」与租期到期的较早者。到期未退租也能办续租：报价时租期已过的，不再用到期时刻截断（自定）。
function renewDeadline(quotedAtMs, leaseEndMs) {
  return leaseEndMs > quotedAtMs ? O.renewQuoteExpiresAt(quotedAtMs, leaseEndMs) : quotedAtMs + C.timers.renewQuoteTtlHours * H;
}
/**
 * 续租页状态。opts.showCompleted：刚付完款的结果页；之后再进入视为新一次续租。
 * 返回 { state, reason?, r?, months?, kept?, deadline?, capped?, max? }
 * state: empty | unavailable | form | quote_pending | quote_ready | quote_expired | payment_pending | payment_failed | cancelled | completed
 */
function renewView(order, nowMs, opts) {
  if (!isPaid(order)) return { state: 'empty' };
  const r = order.renew || null, max = renewMaxMonths(order);
  if (r && r.status === 'paid' && opts && opts.showCompleted) return { state: 'completed', r, months: r.months, kept: !!r.kept, max };
  if (order.stage === S.EXITING) return { state: 'unavailable', reason: 'exit' };
  if (order.stage === S.ENDED) return { state: 'unavailable', reason: 'ended' };
  if (!r || r.status === 'paid') return max < 1 ? { state: 'unavailable', reason: 'max' } : { state: 'form', max, months: renewDefaultMonths(order) };
  if (r.status === 'submitted') return { state: 'quote_pending', r, months: r.months, max };
  const deadline = renewDeadline(r.quoted_at, order.lease.end), capped = deadline === order.lease.end;
  const base = { r, months: r.months, deadline, capped, max };
  if (r.status === 'expired' || O.isExpired(deadline, nowMs)) return Object.assign(base, { state: 'quote_expired', kept: renewQuote(order, r.months).kept }); // 过期后重新提交仍沿用
  base.kept = !!r.kept;
  base.state = r.pay === 'pending' ? 'payment_pending' : r.pay === 'failed' ? 'payment_failed' : r.pay === 'cancelled' ? 'cancelled' : 'quote_ready';
  return base;
}

// ---- 退仓（§4.8-2；D-189，按协议） ----
// state: empty | not_started（已付未起租 = 退订，不是退仓）| form | form_expired | requested | waiting | failed | passed
function exitState(order, nowMs) {
  if (!isPaid(order)) return 'empty';
  const x = order.exit;
  if (x && x.status) return x.status;
  if (order.stage === S.PAID) return 'not_started';
  if (order.stage === S.ENDED) return 'passed';
  return order.stage === S.OVERDUE || nowMs >= order.lease.end ? 'form_expired' : 'form';
}
// 取空日期可选范围。到期退仓：不早于租期结束日（已到期则从今天起）；提前退仓：今天至租期结束前一天。
function exitDateRange(order, type, nowMs) {
  const today = ymd(nowMs), end = ymd(order.lease.end);
  if (type === 'early') { const last = ymd(dayStart(end) - DAY); return end > today ? { min: today, max: last, def: today } : null; }
  const min = end >= today ? end : today;
  return { min, max: '', def: min };
}
const canEarlyExit = (order, nowMs) => !!exitDateRange(order, 'early', nowMs) && (order.stage === S.ACTIVE || order.stage === S.EXPIRING);
/**
 * 提前退仓预计结算费用。照冻结稿 pages/w4-render.js 的 earlyCalc 移植：
 *   已用月数不足 1 个月按 1 个月；剩余月数 = 租期 − 已用月数（按日历整月）；
 *   违约金 = max(1 个月仓储服务费, 剩余合同金额 × 比例)，剩余合同金额按折后月租算；
 *   优惠重算补差 = （已用月数对应的公开折扣档月租 − 成交月租）× 已用月数，原折扣更浅时不补。
 * 其中剩余月数、补差口径、按折后月租三处是设计侧自定，正式结算以后端为准（D-189）。界面只显示 fee 一个数并带「约」。
 * date：计划取空日期 'YYYY-MM-DD'。
 */
function earlyExitEstimate(order, date) {
  const E = A.exit, T = Number(order.months), q = order.quote, mon = Number(q.monthly_average);
  const e = ymd(order.lease.end).split('-').map(Number), d = String(date).split('-').map(Number);
  const cal = (e[0] - d[0]) * 12 + (e[1] - d[1]) - (e[2] < d[2] ? 1 : 0);
  const left = Math.min(Math.max(0, T - E.minUsedMonths), Math.max(0, cal));
  const used = Math.max(E.minUsedMonths, T - left);
  const f0 = Number(order.deal_factor) || Number(q.term_factor) || pricing.termFactor(T);
  const f1 = Math.max(f0, pricing.termFactor(used));
  const penalty = Math.round(Math.max(mon * E.penaltyMinMonths, mon * left * E.penaltyRatio));
  const redoMonthly = q.special ? 0 : q.unit_pricing.reduce((n, r) => n + Math.max(0, Math.trunc(Number(r.base_month) * f1 + EPS) - Number(r.monthly_rent)), 0);
  const redo = redoMonthly * used;
  return { used, left, monthly: mon, f0, f1, penalty, redo, fee: penalty + redo };
}

// ---- 押金（§4.8-3） ----
// state: empty | held | waiting | refund_pending | refund_failed | refunded | refunded_partial
function depositState(order) {
  if (!isPaid(order)) return 'empty';
  const s = order.deposit && order.deposit.status;
  if (s === 'refunding') return 'refund_pending';
  if (s === 'failed') return 'refund_failed';
  if (s === 'refunded') return 'refunded';
  if (s === 'partial') return 'refunded_partial';
  return order.exit && order.exit.status === 'waiting' ? 'waiting' : 'held';
}

// ---- 发票（§4.8-4） ----
// 付款记录按租金 / 押金 / 管理费拆分；续租付款只有续租租金
function payments(order) {
  const q = order.quote;
  const list = [{ id: 'INITIAL', type: 'INITIAL', amount: q.payable, split: [['rent', q.rent_after_discount], ['deposit', q.deposit], ['fee', q.management_fee]] }];
  (order.renewals || []).forEach((r) => list.push({ id: r.id, type: 'RENEWAL', amount: r.amount, split: [['renew', r.amount]] }));
  return list;
}
// state: empty | form（还有可申请的付款）| issue_failed | submitted | processing | issued
function invoiceView(order) {
  if (!isPaid(order)) return { state: 'empty', records: [], available: [], failed: null, last: null };
  const records = (order.invoice && order.invoice.records) || [];
  const available = payments(order).filter((p) => !records.some((r) => r.payment_id === p.id));
  const failed = records.find((r) => r.status === 'failed') || null, last = records[records.length - 1] || null;
  const state = failed ? 'issue_failed' : available.length || !last ? 'form' : last.status;
  return { state, records, available, failed, last };
}
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function validateInvoice(f) {
  const title = String(f.title || '').trim(), email = String(f.email || '').trim(), tax = String(f.tax_id || '').trim();
  const emailOk = EMAIL.test(email);
  return { emailError: !!email && !emailOk, ready: !!(title && emailOk && (f.kind !== 'enterprise' || tax)) };
}

// ---- 实名兜底（§4.6-13，D-174）与入仓指引（§4.8-5、6） ----
// 'not_paid' | 'none'（待认证）| 'pending'（认证中）| 'verified' | 'mismatch'（未通过）
const identityState = (order) => (isPaid(order) ? order.identity_status || 'none' : 'not_paid');
function validateIdentity(f) {
  const name = String(f.name || '').trim(), idNo = String(f.id_no || '').trim();
  return { nameError: !/^[一-龥·A-Za-z]{2,20}$/.test(name), idError: !/^\d{17}[\dXx]$/.test(idNo) }; // 与确认订单页的实名校验同一口径（只支持身份证）
}
// state: not_paid | identity_required | before_start | allowed | inactive；lease 是当前租用状态的键
function accessView(order, nowMs) {
  if (!isPaid(order)) return { state: 'not_paid', lease: '' };
  const st = order.stage, x = order.exit;
  const lease = st === S.PAID ? 'upcoming' : st === S.ENDED ? 'ended' : st === S.EXITING ? 'returning' : st === S.OVERDUE ? 'expired' : 'active';
  if (order.identity_status !== 'verified') return { state: st === S.ENDED ? 'inactive' : 'identity_required', lease };
  if (st === S.PAID || nowMs < order.lease.start) return { state: 'before_start', lease };
  const allowed = st === S.ACTIVE || st === S.EXPIRING || (st === S.EXITING && x && (x.status === 'requested' || x.status === 'failed')); // 与冻结稿 demo-core 的 access_allowed 一致
  return { state: allowed ? 'allowed' : 'inactive', lease };
}

// ---- 消息 ----
const MSG_TYPE = { renew: 'renew', exit: 'exit', inspect: 'exit', deposit: 'deposit', invoice: 'invoice', identity: 'identity', access: 'access', transport: 'transport', lead: 'lead', booking: 'lead', advisor: 'lead', consult: 'lead', support: 'lead', enterprise: 'lead', business: 'lead', order: 'order', pay: 'order' };
const MSG_RE = [[/续租/, 'renew'], [/退仓|验仓/, 'exit'], [/押金/, 'deposit'], [/发票|开票/, 'invoice'], [/实名|身份/, 'identity'], [/入仓/, 'access'], [/运输|搬运/, 'transport'], [/咨询|预约|需求/, 'lead'], [/支付|付款|订单/, 'order']];
// 消息分类：先看 type，没有再按标题判断（与冻结稿 w6-render.js 的 CAT 同一顺序）
function messageCategory(m) {
  const t = m && MSG_TYPE[String(m.type || '').toLowerCase()];
  if (t) return t;
  const hit = MSG_RE.find((x) => x[0].test(String((m && m.title) || '')));
  return hit ? hit[1] : m && m.order_id ? 'order' : 'notice';
}

module.exports = {
  PAID, isPaid, ymd, ymdhm, mdhm, dayStart, countdown, fill, zhe, addMonths, pickOrder,
  unitsForPricing, renewMaxMonths, renewDefaultMonths, renewQuote, renewDeadline, renewView,
  exitState, exitDateRange, canEarlyExit, earlyExitEstimate, depositState,
  payments, invoiceView, validateInvoice, identityState, validateIdentity, accessView, messageCategory
};
