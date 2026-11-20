// 显示口径（交接 v1.0 §4.4-1～3、§4.11）。命名类口径只在这里写一次。
const pretty = (v) => String(Number(Number(v).toFixed(2)));
// 仓位名「A003 · 3.5m³」（D-172）：编号三位，不带「仓号」
const unitName = (u) => u.code + ' · ' + pretty(u.volume) + 'm³';
const comboName = (units) => '组合仓 ' + units.map((u) => u.code).join(' + ');
// 层标签（D-123、D-169）：「上层 2/2」「下层 1/2」「中层 2/3」；独立单仓不显示
function tierLabel(u) {
  const i = Number(u.tier_index), t = Number(u.tier_total);
  if (!(t > 1) || !(i >= 1)) return '';
  return (i === t ? '上层' : i === 1 ? '下层' : '中层') + ' ' + i + '/' + t;
}
// 仓位卡第二行（D-181）：尺寸「1.4 × 1 × 2.5m」；组合仓「合计 X m³」
const dimsText = (u) => (u.dims && u.dims.length === 3 ? u.dims.map(pretty).join(' × ') + 'm' : '');
const comboVolumeText = (units) => '合计 ' + pretty(units.reduce((n, u) => n + u.volume, 0)) + ' m³';
const areaText = (u) => (u.area ? '约' + pretty(u.area) + '㎡' : '');
const kmText = (km) => (km === null || km === undefined ? '' : pretty(Number(km).toFixed(1)) + 'km');
const termText = (m) => m + '个月';
module.exports = { pretty, unitName, comboName, tierLabel, dimsText, comboVolumeText, areaText, kmText, termText };
