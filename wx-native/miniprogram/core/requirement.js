// 用仓需求：容量 / 面积输入校验与显示（交接 v1.0 §4.3）。全站只有一份需求，结构见 services/state.js。
const C = require('./config');
const R = C.requirement;
const { salesOnly } = require('./matching');

const pretty = (v) => String(Number(Number(v).toFixed(2)));
const decimalsOf = (s) => { const m = String(s).match(/\.(\d+)$/); return m ? m[1].length : 0; };
const areaToM3 = (a) => Number((Number(a) * R.areaLayerHeightM).toFixed(2));

// 返回 { ok, error, capacity_m3, sales }；error: 'empty' | 'format' | 'decimals' | 'min' | 'range'
function validate(unit, raw) {
  const s = String(raw === undefined || raw === null ? '' : raw).trim();
  if (!s) return { ok: false, error: 'empty' };
  if (!/^\d+(\.\d+)?$/.test(s)) return { ok: false, error: 'format' };
  const v = Number(s);
  if (unit === 'm2') {
    if (decimalsOf(s) > R.areaDecimals) return { ok: false, error: 'decimals' };
    if (v < R.areaMinM2 || v > R.areaMaxM2) return { ok: false, error: 'range' };
    const m3 = areaToM3(v);
    return { ok: true, capacity_m3: m3, sales: salesOnly(m3) };
  }
  if (decimalsOf(s) > R.capacityDecimals) return { ok: false, error: 'decimals' };
  if (v < R.capacityMinM3) return { ok: false, error: 'min' };
  return { ok: true, capacity_m3: v, sales: salesOnly(v) }; // 达到 30m³（含超过 200m³）不报错，交顾问
}

// 需求显示：按面积填的写「2㎡ · 约4.8m³」，否则「3.5m³」
function demandText(req) {
  if (!req) return '';
  const v = Number(req.capacity_m3);
  if (!(v > 0)) return '';
  if (req.input_unit === 'm2' && Number(req.input_value) > 0) return pretty(req.input_value) + '㎡ · 约' + pretty(v) + 'm³';
  return pretty(v) + 'm³';
}
// 「全放标准纸箱约 N 箱」
const cartonCount = (capacityM3) => Math.floor(Number(capacityM3) * R.cartonFillRatio / R.cartonVolumeM3 + 1e-9);
const validTerm = (m) => Number.isInteger(m) && m >= R.termMin && m <= R.termMax;

module.exports = { validate, demandText, cartonCount, areaToM3, validTerm, pretty };
