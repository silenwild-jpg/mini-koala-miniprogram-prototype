// 找仓匹配（交接 v1.0 §4.4）。纯函数。
const C = require('./config');
const M = C.matching;

const isAvailable = (u) => !!u && u.status === 'available' && Number(u.volume) > 0;
const salesOnly = (capacityM3) => Number(capacityM3) >= M.salesOnlyFromM3; // 达到 30m³ 交顾问（D-101）

// D-99：不小于需求 = 匹配；小且差额不超过 20% = 接近；更小不推荐
function fit(unitVolume, needM3) {
  const v = Number(unitVolume), n = Number(needM3);
  if (!(n > 0)) return { state: 'browse' };
  if (v >= n) return { state: 'matched', diff: +(v - n).toFixed(2) };
  if (v >= n * M.nearRatio) return { state: 'near', diff: +(n - v).toFixed(2), text: '比需求小 ' + (+(n - v).toFixed(1)) + 'm³' };
  return { state: 'small' };
}

const byVolumeThenPrice = (a, b) => a.volume - b.volume || a.base_month - b.base_month || String(a.id).localeCompare(String(b.id));

/**
 * 一家门店对一个需求的匹配结果。
 * best：不小于需求里体积最小的；larger：下一档更大的可租仓；near：接近方案里最大的；
 * combos：两仓组合（都比需求小、合计不小于需求），按合计体积取前 3。
 */
function matchStore(storeUnits, needM3) {
  const avail = (storeUnits || []).filter(isAvailable).sort(byVolumeThenPrice);
  const n = Number(needM3);
  if (!(n > 0)) return { state: 'browse', available: avail, best: null, larger: null, near: null, combos: [], others: avail.length };
  if (salesOnly(n)) return { state: 'sales', available: avail, best: null, larger: null, near: null, combos: [], others: 0 };
  const matched = avail.filter((u) => u.volume >= n);
  const best = matched[0] || null;
  const larger = best ? (matched.find((u) => u.volume > best.volume) || null) : null;
  const smaller = avail.filter((u) => u.volume < n);
  const nearList = smaller.filter((u) => u.volume >= n * M.nearRatio);
  const near = nearList.length ? nearList[nearList.length - 1] : null;
  const combos = [];
  for (let i = 0; i < smaller.length; i++) for (let j = i + 1; j < smaller.length; j++) {
    const vol = Number((smaller[i].volume + smaller[j].volume).toFixed(3));
    if (vol >= n) combos.push({ units: [smaller[i], smaller[j]], volume: vol });
  }
  combos.sort((a, b) => a.volume - b.volume);
  const state = best ? 'matched' : combos.length ? 'combo' : near ? 'near' : 'none';
  return { state, available: avail, best, larger, near, combos: combos.slice(0, 3), others: Math.max(0, matched.length - 1) };
}

// 门店可租容量范围「a–b m³」
function capacityRange(storeUnits) {
  const v = (storeUnits || []).filter(isAvailable).map((u) => u.volume);
  return v.length ? { min: Math.min.apply(null, v), max: Math.max.apply(null, v) } : null;
}

module.exports = { isAvailable, salesOnly, fit, matchStore, capacityRange };
