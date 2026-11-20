// 门店图与仓位图的路径。现在都是随包的演示素材；正式环境由接口返回线上地址（store.photo / store.photo_hero / unit.photo），有就优先用。
// 门店图：12 家有专属图（mock/media.js，来自冻结稿 store-curated）；其余门店从 6 套共用实景图里按门店编号固定取一套（FIX-01，
//         素材来自 2026-10 的 real_store_demo，是迷你考拉仓真实仓区照片，但没有逐店核验，不代表该门店实景）。同一家门店的卡片图与头图取同一套。
// 仓位图：按容量分 4 档的空间示意图（冻结稿 unit-r3），不是该仓位的照片。
const OWN = require('../mock/media');
const CF = require('../core/config-find');
const POOL = ['POOL-01', 'POOL-02', 'POOL-03', 'POOL-04', 'POOL-05', 'POOL-06'];
const BASE = '/assets/images/';
function storeDir(id) {
  const s = String(id || '');
  if (OWN.indexOf(s) >= 0) return s.replace('_', '-');
  let n = 0; for (let i = 0; i < s.length; i++) n += s.charCodeAt(i);
  return POOL[n % POOL.length];
}
const storeCard = (store) => (store && store.photo) || BASE + 'stores/' + storeDir(store && store.id) + '/card.webp';
const storeHero = (store) => (store && (store.photo_hero || store.photo)) || BASE + 'stores/' + storeDir(store && store.id) + '/hero.webp';
// 是否专属图（演示工具与测试用）
const storeOwn = (id) => OWN.indexOf(String(id)) >= 0;
function unitThumb(unit) {
  if (unit && unit.photo) return unit.photo;
  const v = Number(unit && unit.volume) || 0;
  const b = CF.unitThumbBands.find((x) => v <= x.maxM3) || CF.unitThumbBands[CF.unitThumbBands.length - 1];
  return BASE + 'units/' + b.key + '.webp';
}
module.exports = { storeDir, storeCard, storeHero, storeOwn, unitThumb, POOL };
