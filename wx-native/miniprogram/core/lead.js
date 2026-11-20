// 线索规则（交接 v1.0 §4.9），纯函数，不依赖 wx。预约用仓只是线索：不锁仓位与价格。
const C = require('./config');
const L = require('./config-lead');
const req = require('./requirement');
const { salesOnly } = require('./matching');
const order = require('./order');
const H = 3600 * 1000, DAY = 24 * H;
const TYPES = { BOOKING: 'booking', ADVISOR: 'advisor', ENTERPRISE: 'enterprise', TRANSPORT: 'transport', SUPPORT: 'support' };
const STATUS = { SUBMITTED: 'submitted', WITHDRAWN: 'withdrawn' };

// 受理文案按提交时刻取：服务时段内 inHours，之外 offHours（D-149）。只返回键名，句子在 i18n/lead.js。
const ackKey = (inServiceHours) => (inServiceHours ? 'inHours' : 'offHours');
const ackAt = (nowMs) => { const inHours = order.inServiceHours(nowMs); return { in_service_hours: inHours, key: ackKey(inHours) }; };
// 对外编号：规则未定（待业务），暂用 4 位序号
const leadNo = (seq) => String(seq % Math.pow(10, L.leadNoDigits)).padStart(L.leadNoDigits, '0');

const cleanPhone = (p) => String(p === undefined || p === null ? '' : p).replace(/[\s-]/g, '');
const validPhone = (p) => /^1\d{10}$/.test(cleanPhone(p));
const maskPhone = (p) => cleanPhone(p).replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
const validAddress = (a, required) => { const s = String(a || '').trim(); return s.length <= L.addressMax && (!required || s.length > 0); };

// 日期一律按北京时间的「YYYY-MM-DD」
const dateStr = (ms) => new Date(ms + 8 * H).toISOString().slice(0, 10);
const dateOptions = (offsets, nowMs) => offsets.map((d) => dateStr(nowMs + d * DAY));
const validDate = (s, nowMs) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !isNaN(Date.parse(s + 'T00:00:00Z')) && String(s) >= dateStr(nowMs);

// 企业容量：按区间存；带入找仓取区间上限；30m³ 及以上不写入全局需求（D-88 / D-101）
const bandOf = (key) => L.bizBands.find((b) => b.key === key || b.label === key) || null;
// 自定义容量的校验用全站同一份（core/requirement.validate）；返回 { ok, error, capacity_m3, sales }
const customSize = (raw) => req.validate('m3', raw);
// v: { custom, sizeRaw, band } → { label, sales, match, error }；match = 带入找仓的容量（没有则 null）
function bizCapacity(v) {
  if (v.custom) {
    const raw = String(v.sizeRaw === undefined || v.sizeRaw === null ? '' : v.sizeRaw).trim();
    if (!raw) return { label: '', sales: false, match: null, error: 'empty', capacity_m3: null, band: '' };
    const r = customSize(raw);
    if (!r.ok) return { label: raw + 'm³', sales: false, match: null, error: r.error, capacity_m3: null, band: '' };
    return { label: req.pretty(r.capacity_m3) + 'm³', sales: r.sales, match: r.sales ? null : r.capacity_m3, error: '', capacity_m3: r.capacity_m3, band: '' };
  }
  const b = bandOf(v.band);
  if (!b) return { label: '', sales: false, match: null, error: 'empty', capacity_m3: null, band: '' };
  return { label: b.label, sales: !!b.sales, match: b.sales ? null : b.match, error: '', capacity_m3: null, band: b.label };
}
// 预约页意向容量：接受任意小数与「30m³ 及以上」。hint 是显示用文字，m3 是换算后的数（没有则 null）
function capacityHint(unit, raw) {
  const r = req.validate(unit, raw);
  if (!r.ok) return r;
  const text = unit === 'm2' ? req.demandText({ capacity_m3: r.capacity_m3, input_unit: 'm2', input_value: Number(raw) }) : req.pretty(r.capacity_m3) + 'm³';
  return { ok: true, hint: text, capacity_m3: r.capacity_m3, sales: r.sales };
}
const isSalesM3 = (m3) => Number(m3) > 0 && salesOnly(Number(m3));
const validTerm = (m) => req.validTerm(m);
module.exports = { TYPES, STATUS, ackKey, ackAt, leadNo, cleanPhone, validPhone, maskPhone, validAddress, dateStr, dateOptions, validDate, bandOf, customSize, bizCapacity, capacityHint, isSalesM3, validTerm, DAY };
