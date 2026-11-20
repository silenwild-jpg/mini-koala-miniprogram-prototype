// 定价规则（交接 v1.0 §4.5）。纯函数，不依赖 wx；tests/ 里与冻结稿规则脚本逐仓位对照。
const C = require('./config');
const P = C.pricing;
const EPS = 1e-9;

const yuan = (n) => '¥' + String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const isTerm = (m) => Number.isInteger(m) && m >= C.requirement.termMin && m <= C.requirement.termMax;

function termRule(m) { return P.termRules.find((r) => m >= r.min && m <= r.max) || null; }
function termFactor(m) { const r = termRule(m); return r ? r.factor : 1; }
function factorLabel(f) { return f < 1 ? (Math.round(f * 100) / 10) + '折' : ''; }
function termDiscountLabel(m) { return factorLabel(termFactor(m)); }
// 折扣表最低档（D-140 / D-146）：折扣最深、月数最小的一档
function bestRule() { return P.termRules.slice().sort((a, b) => a.factor - b.factor || a.min - b.min)[0]; }

const isSpecial = (u) => Number(u.special_month) > 0 && Number(u.base_month) > Number(u.special_month);

// 单个仓位在给定租期（或指定折扣系数）下的月租。月租舍去小数。
function unitPricing(u, months, factorOverride) {
  const base = Number(u.base_month);
  const special = isSpecial(u), effective = special ? base * 0.9 : base;
  const f = typeof factorOverride === 'number' ? factorOverride : termFactor(months);
  const monthly = Math.trunc(effective * f + EPS);
  return { unit_id: u.id, base_month: base, monthly_rent: monthly, term_factor: f, term_discount_monthly: Math.max(0, effective - monthly), special_discount_monthly: special ? base - effective : 0, special };
}

// 仓位「¥X/月起」：最低档下的月租，小数进位（D-146、D-147）
function unitFromMonthly(u) { return Math.ceil(unitPricing(u, bestRule().min).monthly_rent - EPS); }
// 门店「¥X/m³/月起」：可租仓位在最低档下「月租 ÷ 容量」的最小值，小数进位。没有可租仓位返回 null。
function storeFromCubic(availableUnits) {
  const us = (availableUnits || []).filter((u) => Number(u.volume) > 0);
  if (!us.length) return null;
  const m = bestRule().min;
  return Math.ceil(Math.min.apply(null, us.map((u) => unitPricing(u, m).monthly_rent / Number(u.volume))) - EPS);
}

function fullTier(rentTotal) {
  const hit = P.fullReductionTiers.filter((t) => Number(rentTotal) >= t.min);
  return hit.length ? hit[hit.length - 1] : null;
}

/**
 * 报价。units：一个或两个（组合仓）仓位；months：整数租期。
 * opts.coupon：{ id, amount } 已判定可用的租金券（只抵租金）；
 * opts.renewal：续租（无押金、无管理费、不参与满额减）；
 * opts.factorOverride：首次续租沿用原折扣时传入成交折扣系数。
 */
function quote(units, months, opts) {
  opts = opts || {};
  if (!units || !units.length) throw new Error('INVALID_SELECTION');
  if (!isTerm(months)) throw new Error('SELECT_TERM');
  const rows = units.map((u) => unitPricing(u, months, opts.factorOverride));
  const monthly = rows.reduce((n, r) => n + r.monthly_rent, 0);
  const rentTotal = monthly * months;
  const special = rows.some((r) => r.special);
  const termSaved = rows.reduce((n, r) => n + r.term_discount_monthly, 0) * months;
  let couponId = null, couponOff = 0, couponSkipped = false;
  if (opts.coupon && !special) { couponId = opts.coupon.id; couponOff = Math.min(Number(opts.coupon.amount) || 0, rentTotal); }
  // 满额减：按券前整期租金取档；与券不同享，取优惠大的一项；特价仓、续租不参与
  let fullOff = 0, fullMin = null;
  if (!opts.renewal && !special) {
    const t = fullTier(rentTotal);
    if (t && t.off > couponOff) { fullOff = t.off; fullMin = t.min; couponSkipped = couponOff > 0; couponId = null; couponOff = 0; }
  }
  const deposit = opts.renewal ? 0 : monthly * P.depositMonths;
  const fee = opts.renewal ? 0 : P.managementFee;
  const rentAfter = rentTotal - couponOff - fullOff;
  return {
    months, unit_pricing: rows, special,
    term_factor: rows[0].term_factor,
    monthly_average: monthly, rent_total: rentTotal,
    full_reduction: fullOff, full_min: fullMin,
    coupon_id: couponId, coupon_discount: couponOff, coupon_skipped: couponSkipped,
    rent_after_discount: rentAfter,
    deposit, management_fee: fee,
    payable: rentAfter + deposit + fee,
    term_discount_total: termSaved,
    saved: rows.reduce((n, r) => n + r.base_month - r.monthly_rent, 0) * months + fullOff + couponOff
  };
}

// 下一折扣档（D-159）：距下一档 nudgeMonths 个月以内才提示
function nextTier(m) {
  const cur = termFactor(m);
  const r = P.termRules.filter((x) => x.min > m && x.factor < cur).sort((a, b) => a.min - b.min)[0];
  return r && r.min - m <= P.nudgeMonths ? { add: r.min - m, months: r.min, factor: r.factor, label: (Math.round(r.factor * 100) / 10) + ' 折' } : null;
}
function termHint(m, baseMonth) {
  if (!Number.isInteger(m)) return '';
  const n = nextTier(m); if (!n) return '';
  const less = baseMonth ? Math.trunc(baseMonth * termFactor(m) + EPS) - Math.trunc(baseMonth * n.factor + EPS) : 0;
  return '再租 ' + n.add + ' 个月享 ' + n.label + (less > 0 ? '，月均少 ' + yuan(less) : '');
}
function fullHint(m, rentAt, couponOff) {
  const cur = rentAt(m);
  const next = P.fullReductionTiers.find((x) => x.min > cur && x.off > (Number(couponOff) || 0));
  if (!next) return '';
  for (let k = 1; k <= P.nudgeMonths && m + k <= C.requirement.termMax; k++) {
    if (rentAt(m + k) >= next.min) return '再租 ' + k + ' 个月，整期满 ' + yuan(next.min) + ' 减 ' + yuan(next.off);
  }
  return '';
}

// 免费运输（D-173）：距离 + 租期 + 租期折扣档；与券、满额减无关；特价仓不参与
const FT = C.freeTransport;
const isFar = (km) => km !== null && km !== undefined && km !== '' && Number.isFinite(Number(km)) && Number(km) >= FT.minKm;
function freeTransportFor(km, months, special) {
  return !special && isFar(km) && Number.isInteger(months) && months >= FT.minTerm && termFactor(months) >= FT.minFactor - EPS;
}
// 一处只出一句：先折扣档（远距离且下一档正好满足免费运输时合成一句），再满额减，最后单独的免费运输句
function nudge(m, opts) {
  opts = opts || {};
  if (!Number.isInteger(m)) return '';
  const far = isFar(opts.km) && m < FT.minTerm;
  const n = nextTier(m);
  if (far && n && n.months === FT.minTerm) return '再租 ' + n.add + ' 个月享 ' + n.label + '，还可免费运输 1 次';
  return termHint(m, opts.baseMonth) || (opts.rentAt ? fullHint(m, opts.rentAt, opts.couponOff) : '') || (far ? '租满 ' + FT.minTerm + ' 个月可免费运输 1 次' : '');
}

// 顾问卡（D-97、D-182、D-163）
const M = C.matching;
function advisorNeeded(capacityM3, rentTotal) { return Number(capacityM3) > M.advisorCapacityM3 || Number(rentTotal) >= M.advisorRentTotal; }
function bigDealTotal() { return P.fullReductionTiers[P.fullReductionTiers.length - 1].min; }
function bigDeal(capacityM3, rentTotal) { return Number(capacityM3) > M.advisorCapacityM3 || Number(rentTotal) >= bigDealTotal(); }

// 首次续租沿用原折扣（D-186、D-192）：原折扣更深时沿用，否则取现行
function renewalFactor(order, months) {
  const cur = termFactor(months);
  const deal = Number(order && order.deal_factor);
  const first = !(order && order.renewal_count > 0);
  const kept = first && deal > 0 && deal < cur - EPS;
  return { factor: kept ? deal : cur, kept, current: cur };
}

module.exports = { yuan, isTerm, termRule, termFactor, factorLabel, termDiscountLabel, bestRule, isSpecial, unitPricing, unitFromMonthly, storeFromCubic, fullTier, quote, nextTier, termHint, fullHint, isFar, freeTransportFor, nudge, advisorNeeded, bigDeal, bigDealTotal, renewalFactor };
