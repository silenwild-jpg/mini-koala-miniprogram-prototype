// 体积模型 MK-VOL v0.2（D-143）。建议容量 = 物品体积合计 ÷ 装载系数 k，向上取 0.1m³。
// k 由大件体积占比连续决定（锚点 0.80 / 0.65 / 0.55），商家与办公品类占比高时再减，下限 0.50。
// 系数是没有门店实测的初值。界面不出现「装载系数」，写「留出码放空隙后建议 Y m³」。
const C = require('./config');
const REGULAR = { box: 1, bin: 1, clothingBox: 1, quilt: 1, coat: 1, toybox: 1, luggage28: 1, luggage24: 1, luggage20: 1, bag: 1, shoebox: 1, figurebox: 1, winebox: 1, goodsbox: 1, turnover: 1, clothingPack: 1, archiveBox: 1, officeBox: 1 };
const FREQUENT = { business: 1, office: 1 };
const ceil1 = (v) => Math.ceil(v * 10 - 1e-9) / 10;
const ramp = (x, x0, x1, y0, y1) => (x <= x0 ? y0 : x >= x1 ? y1 : y0 + (y1 - y0) * (x - x0) / (x1 - x0));
const kBase = (b) => (b <= 0.3 ? ramp(b, 0.1, 0.3, 0.80, 0.65) : ramp(b, 0.7, 0.9, 0.65, 0.55));
const freqCut = (z) => 0.10 * ramp(z, 0.3, 0.7, 0, 1);
const sum = (lines) => lines.reduce((s, l) => s + l.volume_m3 * l.count, 0);

// lines: [{ id, category, volume_m3, count }]
function recommend(lines) {
  const net = sum(lines || []);
  if (!(net > 0)) return { net: 0, k: null, recommended: 0, bulkyShare: 0, count: 0 };
  const bulky = sum(lines.filter((l) => !REGULAR[l.id])) / net;
  const biz = sum(lines.filter((l) => FREQUENT[l.category])) / net;
  const k = Math.max(C.volumeModel.kFloor, kBase(bulky) - freqCut(biz));
  return { net: Number(net.toFixed(3)), bulkyShare: Number(bulky.toFixed(2)), bizShare: Number(biz.toFixed(2)), k: Number(k.toFixed(3)), recommended: ceil1(net / k), count: lines.reduce((n, l) => n + l.count, 0) };
}
module.exports = { recommend, kBase, freqCut };
