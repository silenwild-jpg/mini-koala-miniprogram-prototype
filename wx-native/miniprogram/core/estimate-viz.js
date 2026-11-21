// 估算两页的示意换算（IMPL-01）：容量 ↔ 滑杆位置、仓库示意的缩放比例。只做展示换算，不参与匹配与报价。
// 滑杆是分段线性的：左端 = 最小值，快捷档（config.requirement.capacityQuickPicks）落在 config-find.estimate.sliderStops 给的位置上，
// 这样小容量段更细、每一档间距相等，标签不挤。超过最后一档的容量停在最右端。
const C = require('./config');
const CF = require('./config-find');
const E = CF.estimate;
// 刻度点 [[值, 位置], …]，min = 当前单位的最小值
function points(min) {
  const pts = [[min, 0]];
  C.requirement.capacityQuickPicks.forEach((v, i) => { if (v > min && E.sliderStops[i] !== undefined) pts.push([v, E.sliderStops[i]]); });
  return pts;
}
// 值 → 位置（0–1）
function posOf(value, min) {
  const v = Number(value), pts = points(min);
  if (!Number.isFinite(v) || v <= pts[0][0]) return 0;
  for (let i = 1; i < pts.length; i++) if (v <= pts[i][0]) { const a = pts[i - 1], b = pts[i]; return a[1] + (b[1] - a[1]) * (v - a[0]) / (b[0] - a[0]); }
  return 1;
}
// 位置 → 值：按 step 取整，不小于 min、不大于最后一档
function valueOf(pos, min, step) {
  const p = Math.max(0, Math.min(1, Number(pos) || 0)), pts = points(min);
  let v = pts[pts.length - 1][0];
  for (let i = 1; i < pts.length; i++) if (p <= pts[i][1]) { const a = pts[i - 1], b = pts[i]; v = a[0] + (b[0] - a[0]) * (p - a[1]) / (b[1] - a[1]); break; }
  const s = Number(step) > 0 ? Number(step) : 1;
  return Math.max(min, Math.min(pts[pts.length - 1][0], Number((Math.round(v / s) * s).toFixed(2))));
}
// 仓库示意的缩放：容量越大越接近 1，最小 stageScaleMin
const scaleOf = (m3) => Number((E.stageScaleMin + (1 - E.stageScaleMin) * posOf(m3, C.requirement.capacityMinM3)).toFixed(3));
// 容量页示意区累计停留的箱子只数（IMPL-02，自定口径）：不大于当前容量的 stageBoxStepsM3 项数，至少 1 只；无效容量为 0。
// 与 tools/gen_size_illus.py 的 box_count 同一口径（它据此决定每档画几个箱位）。
const boxCount = (m3) => { const v = Number(m3); if (!Number.isFinite(v) || v <= 0) return 0; return Math.max(1, E.stageBoxStepsM3.filter((s) => s <= v + 1e-9).length); };
module.exports = { points, posOf, valueOf, scaleOf, boxCount };
