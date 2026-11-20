// 订单的显示口径（W34 交易域）：阶段判定、状态头、订单摘要卡、费用明细行。
// 订单摘要卡 mk-order-card、费用明细 mk-fee-detail、任务卡 mk-task-card、订单详情、订单列表、确认订单都读这里，保证同一订单全站一个阶段、一套写法。
// 金额一律取 order.quote，不在这里重算。判定逻辑对照冻结稿 pages/w4-render.js 的 o03Stage 与 runtime/h01-state-policy-01.js。
const C = require('../core/config');
const CT = require('../core/config-trade');
const order = require('../core/order');
const pricing = require('../core/pricing');
const fmt = require('../core/format');
const T = require('../i18n/trade');
const S = order.STAGE, H = 3600000, DAY = 86400000;
const pad = (n) => String(n).padStart(2, '0');
const yuan = pricing.yuan;

// 日期与时间一律按北京时间显示
function ymd(ms) { if (!ms) return ''; const d = new Date(Number(ms) + 8 * H); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
function ymdhm(ms) { if (!ms) return ''; const d = new Date(Number(ms) + 8 * H); return ymd(ms) + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()); }
// 「2026-11-19」→ 当天北京时间 0 点的毫秒
function parseYmd(s) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - 8 * H : 0; }
function countdown(deadlineMs, nowMs) {
  const r = Math.max(0, Math.ceil((Number(deadlineMs) - nowMs) / 1000));
  return pad(Math.floor(r / 3600)) + ':' + pad(Math.floor(r % 3600 / 60)) + ':' + pad(r % 60);
}
const daysLeft = (o, nowMs) => (o && o.lease ? Math.round((parseYmd(ymd(o.lease.end)) - parseYmd(ymd(nowMs))) / DAY) : null);

// 待支付 / 支付失败超过截止时间即视为已超时（接口侧同样会改写，见 services/mock-ext/trade.js 的 sweep）
function effStage(o, nowMs) {
  if (!o) return '';
  if ((o.stage === S.PENDING || o.stage === S.FAILED) && o.pay && order.isExpired(o.pay.expires_at, nowMs)) return S.EXPIRED;
  return o.stage;
}
// 订单阶段（订单详情、任务卡、订单列表同源）
function phase(o, nowMs) {
  const st = effStage(o, nowMs);
  if (st === S.PENDING) return 'pending';
  if (st === S.FAILED) return 'payment_failed';
  if (st === S.EXPIRED) return 'expired';
  if (st === S.CANCELLED) return 'cancelled';
  const dep = o.deposit && o.deposit.status, exitStatus = String((o.exit && o.exit.status) || '');
  if (dep === 'refunding') return 'refund';
  if (st === S.ENDED) return 'ended';
  if (st === S.EXITING) return /inspect/i.test(exitStatus) ? 'inspection' : 'returning';
  if (st === S.OVERDUE) return 'expired_lease';
  if (o.identity_status !== 'verified') return 'identity';
  if (o.renew && o.renew.status === 'quoted') return 'renewal';
  if (o.renew && o.renew.status === 'submitted') return 'renewal_pending';
  if (st === S.PAID) return 'upcoming';
  const n = daysLeft(o, nowMs);
  if (st === S.EXPIRING || (n !== null && n >= 0 && n <= CT.expiringDays)) return 'expiring';
  return 'active';
}
const TONE = { pending: 'warn', payment_failed: 'warn', expired: 'info', cancelled: 'info', identity: 'warn', upcoming: 'ok', active: 'ok', expiring: 'warn', renewal: 'warn', renewal_pending: 'warn', returning: 'warn', inspection: 'warn', refund: 'warn', expired_lease: 'warn', ended: 'info' };
function head(o, nowMs) { const p = phase(o, nowMs), h = T.head[p] || ['', '']; return { phase: p, title: h[0], tag: h[1], tone: TONE[p] || 'info' }; }
function stageLabel(o, nowMs) { const p = phase(o, nowMs); return { key: p, label: T.stage[p] || '', tone: TONE[p] || 'info' }; }
const isPaid = (p) => ['pending', 'payment_failed', 'expired', 'cancelled'].indexOf(p) < 0;

const unitsVolume = (units) => (units || []).reduce((n, u) => n + Number(u.volume || 0), 0);
// 仓位名与第二行（D-172、D-181）
function unitLines(o) {
  const us = (o && o.units) || [];
  if (!us.length) return { name: (o && o.unit_name) || '', sub: '', combo: '' };
  if (us.length > 1) return { name: o.unit_name || fmt.comboName(us), sub: fmt.comboVolumeText(us), combo: us.length + T.card.comboTag };
  return { name: o.unit_name || fmt.unitName(us[0]), sub: fmt.dimsText(us[0]), combo: '' };
}
// 订单摘要卡。o 可以是订单，也可以是确认订单页拼出来的「草稿」（没有 stage，只有 store / units / months / lease）
function card(o, nowMs, opts) {
  opts = opts || {};
  if (!o || !o.store) return null;
  const p = o.stage ? phase(o, nowMs) : '', lines = unitLines(o), paid = !!p && isPaid(p);
  const start = o.lease && o.lease.start ? ymd(o.lease.start) : '', end = o.lease && o.lease.end ? ymd(o.lease.end) : '';
  const st = p ? stageLabel(o, nowMs) : { label: '', tone: '' };
  return {
    storeName: o.store.name, address: o.store.address || '', kmText: opts.showKm ? fmt.kmText(o.store.distance_km) : '',
    unitName: lines.name, unitSub: lines.sub, comboTag: lines.combo,
    months: o.months, termText: fmt.termText(o.months),
    periodLabel: paid ? T.card.period : (p ? T.card.startDay : T.card.startPlan),
    periodText: paid ? start + T.common.to + end : start, startDate: start,
    noText: o.no ? T.card.orderNo + o.no : '', stageLabel: st.label, stageTone: st.tone,
    lineText: lines.name + T.common.sep + fmt.termText(o.months),
    payableText: o.quote ? yuan(o.quote.payable) : ''
  };
}
// 费用明细行。opts: { editable（可选券）, showCoupon（始终显示券行）, locked（订单已生成）, noSaved（变价待确认时不显示已省）, totalLabel, couponName }
function fees(o, nowMs, opts) {
  opts = opts || {};
  const q = o && o.quote;
  if (!q) return null;
  const months = o.months || q.months, rows = [];
  const baseSum = (q.unit_pricing || []).reduce((n, x) => n + Number(x.base_month || 0), 0);
  rows.push({ id: 'rent', k: T.fee.rent, sub: fmt.termText(months), tag: q.special ? T.fee.special : pricing.factorLabel(Number(q.term_factor) || 1), amt: yuan(q.rent_total), sec: yuan(q.monthly_average) + T.common.perMonth + ' × ' + fmt.termText(months) });
  if (Number(q.term_discount_total) > 0 && !q.special && !opts.noSaved) rows.push({ id: 'saved', k: T.fee.saved, sub: T.fee.savedBase + yuan(baseSum) + T.common.perMonth, amt: yuan(q.term_discount_total), good: true });
  if (Number(q.full_reduction) > 0) rows.push({ id: 'full', k: T.fee.full, sub: T.fee.fullMin + yuan(q.full_min), amt: '−' + yuan(q.full_reduction), sec: T.fee.rentAfter + yuan(q.rent_after_discount) });
  if (q.special) rows.push({ id: 'special', k: T.fee.special, amt: (q.unit_pricing || []).filter((x) => x.special).map((x) => yuan(x.monthly_rent) + T.common.perMonth).join('、') });
  const off = Number(q.coupon_discount) || 0;
  if (off > 0 || opts.editable || opts.showCoupon) {
    const row = { id: 'coupon', k: T.fee.coupon, link: opts.editable ? (off > 0 ? T.fee.couponSwap : T.fee.couponPick) : '', amt: off > 0 ? '−' + yuan(off) : opts.locked ? T.fee.couponUnused : q.coupon_skipped ? T.fee.couponSkipped : T.fee.couponNone, muted: !(off > 0) };
    if (off > 0 && opts.couponName) row.sec = T.fee.couponUsed + opts.couponName + T.fee.couponAfter + yuan(q.rent_after_discount);
    rows.push(row);
  }
  if (o.free_transport) rows.push({ id: 'benefit', k: T.fee.benefit, amt: T.fee.freeTransport, muted: true });
  rows.push({ id: 'deposit', k: T.fee.deposit, sub: (q.unit_pricing || []).length > 1 ? T.fee.depositCombo : T.fee.depositOne, amt: yuan(q.deposit) });
  rows.push({ id: 'fee', k: T.fee.management, amt: yuan(q.management_fee) });
  let label = opts.totalLabel;
  if (!label) { const p = o.stage ? phase(o, nowMs) : ''; label = p === 'cancelled' ? T.fee.originCancelled : p === 'expired' ? T.fee.originExpired : p && isPaid(p) ? T.fee.paid : T.fee.payable; }
  return { rows, total: { label, amt: yuan(q.payable) } };
}
// 未登录或报价不可用时的占位行：不出任何金额
function feesPlaceholder(text, totalText) {
  return { rows: [T.fee.rent, T.fee.coupon, T.fee.deposit, T.fee.management].map((k, i) => ({ id: 'p' + i, k, amt: text, muted: true })), total: { label: T.fee.payable, amt: totalText || text, muted: true } };
}
// 用仓位置到门店的距离：定位城市没有门店或跨城时不给公里数（D-184）
function kmOf(store, location) { if (!store || !location || location.noStoreCity || location.city !== store.city) return null; return typeof store.distance_km === 'number' ? store.distance_km : null; }
module.exports = { ymd, ymdhm, parseYmd, countdown, daysLeft, effStage, phase, head, stageLabel, isPaid, unitLines, unitsVolume, card, fees, feesPlaceholder, kmOf, yuan, DAY, TTL_HOURS: C.timers.pendingOrderTtlHours };
