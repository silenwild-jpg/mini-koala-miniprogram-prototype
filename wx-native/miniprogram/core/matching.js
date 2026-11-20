// 找仓匹配（交接 v1.0 §4.4；D-230 匹配容差；FIX-01 R-11 容量上限）。纯函数。
const C = require('./config');
const M = C.matching;
const EPS = 1e-9;

const isAvailable = (u) => !!u && u.status === 'available' && Number(u.volume) > 0;
// 兼容旧调用名；大容量不再产生销售专用阻断态。
const salesOnly = () => false;
const largeCapacity = (capacityM3) => Number(capacityM3) >= M.largeCapacityFromM3;
// 匹配区间：[需求 × (1 − 容差), 需求 × (1 + 上限)]，两端都含
const lowerOf = (needM3) => Number(needM3) * (1 - M.tolerance);
const upperOf = (needM3) => Number(needM3) * (1 + M.maxOverRatio);
const r2 = (v) => +Number(v).toFixed(2);

/**
 * 一个容量对一个需求的关系：
 * matched = 在匹配区间内（比需求小 10% 以内的也算，text 写明小多少）；near = 小 10%–20%；small = 更小，不推荐；
 * over = 超过需求的 130%，不进推荐位（门店详情里单列为「更大的仓位」）。
 */
function fit(unitVolume, needM3) {
  const v = Number(unitVolume), n = Number(needM3);
  if (!(n > 0)) return { state: 'browse' };
  if (v > upperOf(n) + EPS) return { state: 'over', diff: r2(v - n) };
  if (v + EPS >= n) return { state: 'matched', diff: r2(v - n), text: '' };
  if (v + EPS >= lowerOf(n)) return { state: 'matched', diff: r2(v - n), text: '小 ' + r2(n - v) + 'm³' };
  if (v + EPS >= n * M.nearRatio) return { state: 'near', diff: r2(n - v), text: '小 ' + r2(n - v) + 'm³' };
  return { state: 'small' };
}

const byVolumeThenPrice = (a, b) => a.volume - b.volume || a.base_month - b.base_month || String(a.id).localeCompare(String(b.id));

/**
 * 一家门店对一个需求的匹配结果。
 * best：匹配区间内不小于需求的最小仓；没有时取区间内比需求略小（10% 以内）的最大仓。
 * larger：区间内比 best 更大的下一档；near：接近方案里最大的；over：超过上限的可租仓；
 * combos：两仓组合（单个都够不上匹配、合计落在匹配区间内），按合计体积取前 3。
 * nearCombos：合计只够「接近」的两仓组合（没有匹配仓也没有匹配组合时才用得上），合计大的在前，取前 3。
 * nearOffer：本店最接近的方案（接近的单仓或接近的组合里合计最大的那个），没有则为 null。
 */
function matchStore(storeUnits, needM3) {
  const avail = (storeUnits || []).filter(isAvailable).sort(byVolumeThenPrice);
  const n = Number(needM3);
  if (!(n > 0)) return { state: 'browse', available: avail, best: null, larger: null, near: null, nearOffer: null, over: [], combos: [], nearCombos: [], others: avail.length };
  if (salesOnly(n)) return { state: 'sales', available: avail, best: null, larger: null, near: null, nearOffer: null, over: [], combos: [], nearCombos: [], others: 0 };
  const st = (u) => fit(u.volume, n).state;
  const matched = avail.filter((u) => st(u) === 'matched');
  const enough = matched.filter((u) => u.volume + EPS >= n), slight = matched.filter((u) => u.volume + EPS < n);
  const best = enough[0] || slight[slight.length - 1] || null;
  const larger = best ? (matched.find((u) => u.volume > best.volume) || null) : null;
  const over = avail.filter((u) => st(u) === 'over');
  const smaller = avail.filter((u) => u.volume + EPS < lowerOf(n));
  const nearList = smaller.filter((u) => st(u) === 'near');
  const near = nearList.length ? nearList[nearList.length - 1] : null;
  const combos = [];
  for (let i = 0; i < smaller.length; i++) for (let j = i + 1; j < smaller.length; j++) {
    const vol = Number((smaller[i].volume + smaller[j].volume).toFixed(3));
    if (fit(vol, n).state === 'matched') combos.push({ units: [smaller[i], smaller[j]], volume: vol });
  }
  // 合计不小于需求的排前面，其次才是略小的
  combos.sort((a, b) => (a.volume + EPS >= n ? 0 : 1) - (b.volume + EPS >= n ? 0 : 1) || Math.abs(a.volume - n) - Math.abs(b.volume - n));
  const nearCombos = [];
  if (!best && !combos.length) {
    for (let i = 0; i < smaller.length; i++) for (let j = i + 1; j < smaller.length; j++) {
      const vol = Number((smaller[i].volume + smaller[j].volume).toFixed(3));
      if (fit(vol, n).state === 'near') nearCombos.push({ units: [smaller[i], smaller[j]], volume: vol });
    }
    nearCombos.sort((a, b) => b.volume - a.volume);
  }
  const nc = nearCombos[0] || null;
  const nearOffer = best || combos.length ? null : (near && (!nc || near.volume >= nc.volume) ? [near] : nc ? nc.units : null);
  const state = best ? 'matched' : combos.length ? 'combo' : nearOffer ? 'near' : 'none';
  return { state, available: avail, best, larger, near, nearOffer, over, combos: combos.slice(0, 3), nearCombos: nearCombos.slice(0, 3), others: Math.max(0, matched.length - 1) };
}

// 门店可租容量范围「a–b m³」
function capacityRange(storeUnits) {
  const v = (storeUnits || []).filter(isAvailable).map((u) => u.volume);
  return v.length ? { min: Math.min.apply(null, v), max: Math.max.apply(null, v) } : null;
}

module.exports = { isAvailable, salesOnly, largeCapacity, fit, matchStore, capacityRange, lowerOf, upperOf };
