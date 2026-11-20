// 订单号、阶段、三个互相独立的计时（交接 v1.0 §4.6-5）。
const C = require('./config');
const H = 3600 * 1000;
const pad = (n, w) => String(n).padStart(w, '0');
// 订单号：MK + 下单日 8 位（北京时间）+ 4 位序号。全站一个函数。
function orderNo(createdAtMs, seq) {
  const d = new Date(createdAtMs + 8 * H);
  return 'MK' + d.getUTCFullYear() + pad(d.getUTCMonth() + 1, 2) + pad(d.getUTCDate(), 2) + pad(seq % 10000, 4);
}
const STAGE = { PENDING: 'pending_payment', FAILED: 'payment_failed', EXPIRED: 'expired', CANCELLED: 'cancelled', PAID: 'paid_before_start', ACTIVE: 'active', EXPIRING: 'expiring', OVERDUE: 'overdue', EXITING: 'exiting', ENDED: 'ended' };
const quoteExpiresAt = (quotedAtMs) => quotedAtMs + C.timers.quoteTtlHours * H;
// 待支付截止：自下单起算；支付失败不重新计时
const pendingExpiresAt = (createdAtMs) => createdAtMs + C.timers.pendingOrderTtlHours * H;
// 续租报价截止：报价 + 24 小时 与 租期到期 的较早者
const renewQuoteExpiresAt = (quotedAtMs, leaseEndMs) => Math.min(quotedAtMs + C.timers.renewQuoteTtlHours * H, leaseEndMs);
const isExpired = (deadlineMs, nowMs) => nowMs >= deadlineMs;
// 服务时段（北京时间每日 9:00–20:00，D-149）与线索受理文案
const inServiceHours = (nowMs) => { const h = new Date(nowMs + 8 * H).getUTCHours(); return h >= C.service.hourStart && h < C.service.hourEnd; };
module.exports = { orderNo, STAGE, quoteExpiresAt, pendingExpiresAt, renewQuoteExpiresAt, isExpired, inServiceHours };
