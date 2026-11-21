// 订单的显示口径（W34 交易域）：阶段判定、状态头、订单摘要卡、费用明细行。
// 订单摘要卡 mk-order-card、费用明细 mk-fee-detail、任务卡 mk-task-card、订单详情、订单列表、确认订单都读这里，保证同一订单全站一个阶段、一套写法。
// 金额一律取 order.quote，不在这里重算。判定逻辑对照冻结稿 pages/w4-render.js 的 o03Stage 与 runtime/h01-state-policy-01.js。
const media = require('./media');
const C = require('../core/config');
const CT = require('../core/config-trade');
const order = require('../core/order');
const pricing = require('../core/pricing');
const fmt = require('../core/format');
const after = require('../core/after');
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
  if (dep === 'refunding' || dep === 'failed') return 'refund'; // 退款未成功同样归入押金处理阶段（C-02，对照冻结稿 o03Stage）
  if (st === S.ENDED) return 'ended';
  if (st === S.EXITING) return exitStatus === 'waiting' || /inspect/i.test(exitStatus) ? 'inspection' : 'returning'; // waiting = 已申请验仓、等门店（core/after.js exit.status）
  if (st === S.OVERDUE) return 'expired_lease';
  const n = daysLeft(o, nowMs);
  if ((st === S.ACTIVE || st === S.EXPIRING) && n !== null && n < 0) return 'expired_lease'; // 后端阶段滞后时按日期判：到期日当天仍在租期内，次日起算已到期（R-04、C-14）
  if (o.identity_status !== 'verified') return 'identity';
  if (o.renew && o.renew.status === 'quoted') return 'renewal';
  if (o.renew && o.renew.status === 'submitted') return 'renewal_pending';
  if (st === S.PAID) return 'upcoming';
  if (st === S.EXPIRING || (n !== null && n >= 0 && n <= CT.expiringDays)) return 'expiring';
  return 'active';
}
// 阶段内需要单独写明的几种情况（FIX-01）：同一阶段、不同的标题 / 标签 / 按钮。没有则返回 ''。
//   refund_failed 押金退款未成功；inspect_failed 验仓未通过；exit_clearing 退仓已提交、等用户清空并申请验仓；
//   identity_mismatch 付款后补的实名认证未通过；renewal_pay 续租报价已确认待支付；renewal_pay_failed 续租付款未成功
function variant(o, p) {
  if (!o) return '';
  if (p === 'refund') return o.deposit && o.deposit.status === 'failed' ? 'refund_failed' : '';
  if (p === 'returning') { const x = o.exit && o.exit.status; return x === 'failed' ? 'inspect_failed' : x === 'requested' ? 'exit_clearing' : ''; }
  if (p === 'identity') return o.identity_status === 'mismatch' ? 'identity_mismatch' : '';
  if (p === 'renewal') { const pay = o.renew && o.renew.pay; return pay === 'failed' ? 'renewal_pay_failed' : pay === 'pending' || pay === 'cancelled' ? 'renewal_pay' : ''; }
  return '';
}
const TONE = { pending: 'warn', payment_failed: 'warn', expired: 'info', cancelled: 'info', identity: 'warn', upcoming: 'ok', active: 'ok', expiring: 'warn', renewal: 'warn', renewal_pending: 'warn', returning: 'warn', inspection: 'warn', refund: 'warn', expired_lease: 'warn', ended: 'info',
  refund_failed: 'err', inspect_failed: 'err', exit_clearing: 'warn', identity_mismatch: 'err', renewal_pay: 'warn', renewal_pay_failed: 'err' };
function head(o, nowMs) { const p = phase(o, nowMs), v = variant(o, p), h = T.head[v || p] || ['', '']; return { phase: p, variant: v, title: h[0], tag: h[1], tone: TONE[v || p] || 'info' }; }
function stageLabel(o, nowMs) { const p = phase(o, nowMs), v = variant(o, p); return { key: p, variant: v, label: T.stage[v || p] || '', tone: TONE[v || p] || 'info' }; }
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
  // 续租过的订单：租期是累计租期，金额是累计已付（下单支付 + 各次续租），两个数同一口径（C-01）
  const renewed = paid && (o.renewals || []).length > 0, term = fmt.termText(o.months) + (renewed ? T.card.withRenew : '');
  const dueSoon = ['expiring', 'renewal', 'renewal_pending', 'expired_lease'].indexOf(p) >= 0;
  return {
    storeName: o.store.name, address: o.store.address || '', kmText: opts.showKm ? fmt.kmText(o.store.distance_km) : '',
    unitName: lines.name, unitSub: lines.sub, comboTag: lines.combo,
    // IMPL-01：仓位编号单独成标签、与容量同一行；租期与起止日拆开，不再用分隔符串成一行
    unitCodes: (o.units || []).map((u) => u.code).filter(Boolean), unitVol: (o.units || []).length ? fmt.pretty(unitsVolume(o.units)) + 'm³' : '', unitDims: (o.units || []).length === 1 ? fmt.dimsText(o.units[0]) : '',
    spanText: paid ? start + T.common.to + end : start ? T.card.startDay + ' ' + start : '',
    storePhoto: media.storeCard(o.store), unitThumb: media.unitThumb((o.units || [])[0]), // 演示素材，路径见 services/media.js
    months: o.months, termText: term,
    periodLabel: paid ? T.card.period : (p ? T.card.startDay : T.card.startPlan),
    periodText: paid ? start + T.common.to + end : start, startDate: start,
    noText: o.no ? T.card.orderNo + o.no : '', stageLabel: st.label, stageTone: st.tone,
    dateText: !p ? '' : dueSoon && end ? T.card.leaseTo + end : o.created_at ? T.card.orderedAt + ymd(o.created_at) : '', // 列表卡第三行：临期 / 已到期写到期日，其余写下单日（C-20）
    lineText: lines.name + T.common.sep + term,
    payableText: o.quote ? yuan(renewed ? after.paidTotal(o) : o.quote.payable) : ''
  };
}
// 费用明细行。opts: { editable（可选券）, showCoupon（始终显示券行）, locked（订单已生成）, noSaved（变价待确认时不显示已省）, totalLabel, couponName }
function fees(o, nowMs, opts) {
  opts = opts || {};
  const q = o && o.quote;
  if (!q) return null;
  const rens = (o.stage && isPaid(phase(o, nowMs)) && o.renewals) || []; // 已完成的续租付款：费用明细按付款分段（C-01）
  const months = rens.length ? after.signedLease(o).months : (o.months || q.months), rows = [];
  const baseSum = (q.unit_pricing || []).reduce((n, x) => n + Number(x.base_month || 0), 0);
  rows.push({ id: 'rent', k: T.fee.rent, sub: fmt.termText(months), tag: q.special ? T.fee.special : pricing.factorLabel(Number(q.term_factor) || 1), amt: yuan(q.rent_total), sec: yuan(q.monthly_average) + T.common.perMonth + ' × ' + fmt.termText(months) });
  if (Number(q.term_discount_total) > 0 && !q.special && !opts.noSaved) rows.push({ id: 'saved', k: T.fee.saved, sub: T.fee.savedBase + yuan(baseSum) + T.common.perMonth, amt: yuan(q.term_discount_total), good: true });
  if (Number(q.full_reduction) > 0) rows.push({ id: 'full', k: T.fee.full, sub: T.fee.fullMin + yuan(q.full_min), amt: '−' + yuan(q.full_reduction), sec: T.fee.rentAfter + yuan(q.rent_after_discount) });
  if (q.special) rows.push({ id: 'special', k: T.fee.special, amt: (q.unit_pricing || []).filter((x) => x.special).map((x) => yuan(x.monthly_rent) + T.common.perMonth).join('、') });
  const off = Number(q.coupon_discount) || 0;
  if (off > 0 || opts.editable || opts.showCoupon) {
    const row = { id: 'coupon', k: T.fee.coupon, link: opts.editable ? (off > 0 ? T.fee.couponSwap : T.fee.couponPick) : '', amt: off > 0 ? '−' + yuan(off) : opts.locked ? T.fee.couponUnused : q.coupon_skipped ? T.fee.couponSkipped : T.fee.couponNone, muted: !(off > 0) };
    if (off > 0 && opts.couponName) { row.sec = T.fee.couponUsed + opts.couponName; row.extra = T.fee.couponAfter + yuan(q.rent_after_discount); } // 券名一行、券后金额另一行，不用分隔符串（IMPL-01）
    rows.push(row);
  }
  if (o.free_transport) rows.push({ id: 'benefit', k: T.fee.benefit, amt: T.fee.freeTransport, note: T.fee.freeTransportNote, muted: true });
  const gift = Number(o.gift_months || q.gift_months);
  if (Number.isFinite(gift) && gift > 0) rows.push({ id: 'gift', k: '赠送租期', amt: gift + '个月', muted: true });
  rows.push({ id: 'deposit', k: T.fee.deposit, sub: (q.unit_pricing || []).length > 1 ? T.fee.depositCombo : T.fee.depositOne, amt: yuan(q.deposit) });
  rows.push({ id: 'fee', k: T.fee.management, amt: yuan(q.management_fee) });
  let label = opts.totalLabel;
  if (!label) { const p = o.stage ? phase(o, nowMs) : ''; label = p === 'cancelled' ? T.fee.originCancelled : p === 'expired' ? T.fee.originExpired : p && isPaid(p) ? T.fee.paid : T.fee.payable; }
  if (!rens.length) return { rows, total: { label, amt: yuan(q.payable) } };
  // 续租过：上面各行是下单支付那一段（原租期、原金额），先出小计；每次续租一行；合计为累计已付
  const G = T.feeSeg;
  rows.push({ id: 'paid0', k: G.initial, sub: fmt.termText(months), amt: yuan(q.payable) });
  rens.forEach((r, i) => {
    const mon = Number(r.monthly) || (Number(r.amount) % Number(r.months) === 0 ? Number(r.amount) / Number(r.months) : 0);
    rows.push({ id: 'renew' + (i + 1), k: G.renew, sub: fmt.termText(r.months), tag: q.special || !r.factor ? '' : pricing.factorLabel(Number(r.factor)), amt: yuan(r.amount),
      sec: mon ? yuan(mon) + T.common.perMonth + ' × ' + fmt.termText(r.months) : '', note: ymd(r.paid_at) + G.paidAt }); // 算式进说明列，支付日期另起一行（IMPL-01）
  });
  return { rows, total: { label: opts.totalLabel || G.total, amt: yuan(after.paidTotal(o)) } };
}
// 未登录或报价不可用时的占位行：不出任何金额
function feesPlaceholder(text, totalText) {
  return { rows: [T.fee.rent, T.fee.coupon, T.fee.deposit, T.fee.management].map((k, i) => ({ id: 'p' + i, k, amt: text, muted: true })), total: { label: T.fee.payable, amt: totalText || text, muted: true } };
}
// 用仓位置到门店的距离：定位城市没有门店或跨城时不给公里数（D-184）
function kmOf(store, location) { if (!store || !location || location.noStoreCity || location.city !== store.city) return null; return typeof store.distance_km === 'number' ? store.distance_km : null; }
module.exports = { ymd, ymdhm, parseYmd, countdown, daysLeft, effStage, phase, variant, head, stageLabel, isPaid, unitLines, unitsVolume, card, fees, feesPlaceholder, kmOf, yuan, DAY, TTL_HOURS: C.timers.pendingOrderTtlHours };
