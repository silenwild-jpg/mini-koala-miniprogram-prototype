// 订单对象的唯一构造处（W34）。下单接口、演示订单种子、租后各页都读这一种结构；接真实接口时后端按同样字段返回。
// 字段来源：交接 v1.0 §6「订单」各行。金额一律来自 pricing.quote，不在别处重算。
const pricing = require('./pricing');
const order = require('./order');
const fmt = require('./format');
const DAY = 86400000, BJ = 8 * 3600000;
// 加整月（按北京时间的年月日算，与运行环境时区无关）：目标月没有这一天时收到当月最后一天（B-01），
// 如 11-30 起租 3 个月 → 02-28，01-31 起租 1 个月 → 02-28（闰年 02-29）。
function addMonths(ms, n) {
  const d = new Date(Number(ms) + BJ), day = d.getUTCDate();
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + Number(n), 1, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(day, last));
  return first.getTime() - BJ;
}
// 到期日（R-04）：起租日（= 预计用仓时间 = 计费起点）加整月，日期不变；到期日当天仍在租期内，次日起才算逾期。
const leaseEnd = (startMs, months) => addMonths(startMs, months);
// 租期内的最后一刻之后：到期日次日 0 点（北京时间）。判断是否逾期用它，不直接用 lease.end。
function overdueFrom(endMs) { const d = new Date(Number(endMs) + BJ); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - BJ; }
/**
 * p: { store, units[], months, createdAt, seq, identityVerified, km, startAt?, stage?, quotedAt?, factorOverride? }
 * 返回的订单：
 *  id / no                订单号（order.orderNo）
 *  created_at, quoted_at  毫秒时间戳
 *  store                  { id, name, district, address, access_hours, phone, distance_km }
 *  units                  [{ id, code, volume, area, dims, tier_index, tier_total }]
 *  unit_name              「A003 · 3.5m³」；组合仓「组合仓 A001 + A002」
 *  months                 租期
 *  quote                  pricing.quote 的完整结果（rent_total / full_reduction / deposit / management_fee / payable / saved ...）
 *  deal_factor            成交折扣系数（首次续租沿用，D-186）；特价仓为 null
 *  renewal_count          已续租次数
 *  free_transport         是否送免费运输 1 次（D-173）
 *  identity_at_order      下单时是否已实名（D-174）
 *  identity_status        'verified' | 'none' | 'pending' | 'mismatch'
 *  contract               { signed, signed_at, signer_masked }
 *  stage                  order.STAGE 之一
 *  pay                    { expires_at, paid_at, fail_reason }  fail_reason: '' | 'balance' | 'cancelled' | 'network' | 'risk'
 *  price_change_reason    下单时变价的原因，没有为 ''
 *  lease                  { start, end }  起租日与到期日（毫秒）。起租日就是预计用仓时间、计费起点；到期日含当天（R-04）
 *  deposit                { status: 'holding'|'refunding'|'refunded'|'partial', amount, pending_fee, refunded }
 *  invoice                { status: 'none'|'applying'|'issued', title }
 *  exit                   null | { applied_at, date, early, estimate }
 *  （租后域扩展）renewals[] 已完成的续租；renew.pay、exit.status、deposit.status='failed'、invoice.records[]，见 services/mock-ext/after.js
 *  renew                  null | { months, status: 'submitted'|'quoted'|'expired'|'paid', quoted_at, factor, kept, amount }
 */
function build(p) {
  const q = pricing.quote(p.units, p.months, p.factorOverride ? { factorOverride: p.factorOverride } : undefined);
  const created = p.createdAt, start = p.startAt || created + DAY;
  const s = p.store, no = order.orderNo(created, p.seq);
  return {
    id: no, no, created_at: created, quoted_at: p.quotedAt || created,
    store: { id: s.id, name: s.name, district: s.district, address: s.address, access_hours: s.access_hours, phone: s.phone, distance_km: s.distance_km },
    units: p.units.map((u) => ({ id: u.id, code: u.code, volume: u.volume, area: u.area, dims: u.dims, tier_index: u.tier_index, tier_total: u.tier_total })),
    unit_name: p.units.length > 1 ? '组合仓 ' + p.units.map((u) => u.code).join(' + ') : fmt.unitName(p.units[0]),
    months: p.months, quote: q, deal_factor: q.term_factor, renewal_count: 0,
    free_transport: pricing.freeTransportFor(p.km === undefined ? s.distance_km : p.km, p.months, q.special),
    identity_at_order: !!p.identityVerified, identity_status: p.identityVerified ? 'verified' : 'none',
    contract: { signed: false, signed_at: 0, signer_masked: '' },
    stage: p.stage || order.STAGE.PENDING,
    pay: { expires_at: order.pendingExpiresAt(created), paid_at: 0, fail_reason: '' },
    price_change_reason: '',
    lease: { start, end: leaseEnd(start, p.months) },
    deposit: { status: 'holding', amount: q.deposit, pending_fee: 0, refunded: 0 },
    invoice: { status: 'none', title: '' },
    exit: null, renew: null
  };
}
module.exports = { build, addMonths, leaseEnd, overdueFrom, DAY };
