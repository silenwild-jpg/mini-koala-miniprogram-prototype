// 用仓需求：容量 / 面积输入校验与显示（交接 v1.0 §4.3）。全站只有一份需求，结构见 services/state.js。
const C = require('./config');
const R = C.requirement;
const { salesOnly } = require('./matching');

const pretty = (v) => String(Number(Number(v).toFixed(2)));
// 用十进制字符串进位，避免 3.1000000000000001 被浮点数吞成 3.1。
function ceilTenth(raw) {
  const parts = String(raw).split('.'), whole = Number(parts[0]), tail = parts[1] || '';
  const tenth = Number(tail[0] || 0), carry = /[1-9]/.test(tail.slice(1)) ? 1 : 0;
  return (whole * 10 + tenth + carry) / 10;
}
const areaToM3 = (a) => Number((Number(a) * R.areaLayerHeightM).toFixed(2));

// 返回 { ok, error, capacity_m3, sales }；error: 'empty' | 'format' | 'decimals' | 'min' | 'range'
function validate(unit, raw) {
  const s = String(raw === undefined || raw === null ? '' : raw).trim();
  if (!s) return { ok: false, error: 'empty' };
  if (!/^\d+(\.\d+)?$/.test(s)) return { ok: false, error: 'format' };
  const v = Number(s);
  if (!Number.isFinite(v) || v > Number.MAX_SAFE_INTEGER / 10) return { ok: false, error: 'format' };
  if (unit !== 'm2' && unit !== 'm3') return { ok: false, error: 'format' };
  if (unit === 'm2') {
    if (v > R.areaMaxM2) return { ok: false, error: 'range' };
    const normalized = Math.max(R.areaMinM2, ceilTenth(s));
    if (normalized > R.areaMaxM2) return { ok: false, error: 'range' };
    const m3 = ceilTenth(areaToM3(normalized));
    return { ok: true, input_value: normalized, input_raw: s, suggested: v < R.areaMinM2, capacity_m3: m3, sales: salesOnly(m3) };
  }
  const normalized = Math.max(R.capacityMinM3, ceilTenth(s));
  return { ok: true, input_value: normalized, input_raw: s, suggested: v < R.capacityMinM3, capacity_m3: normalized, sales: salesOnly(normalized) };
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
const itemsReminder = (capacityM3, hasBulky) => Number(capacityM3) > R.itemsAdvisorHintFromM3 || !!hasBulky;

module.exports = { validate, ceilTenth, demandText, cartonCount, areaToM3, validTerm, itemsReminder, pretty };
