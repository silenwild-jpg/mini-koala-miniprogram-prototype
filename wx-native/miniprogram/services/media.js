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
// 门店详情顶部横滑图（IMPL-01）：接口给了 store.photos 就原样用；否则第一张是本店头图，再从共用图池顺次补到 min 张（默认 core/config-find.js detail.galleryMin）。
// 补进来的共用图同样没有逐店核验，页面上每张都标「门店示意图」。
function storeGallery(store, min) {
  if (store && Array.isArray(store.photos) && store.photos.length) return store.photos.slice();
  const own = storeDir(store && store.id), out = [storeHero(store)], n = Math.max(1, Number(min) || CF.detail.galleryMin || 1);
  const s = String((store && store.id) || ''); let seed = 0; for (let i = 0; i < s.length; i++) seed += s.charCodeAt(i);
  for (let k = 1; out.length < n && k <= POOL.length; k++) { const d = POOL[(seed + k) % POOL.length]; if (d !== own) out.push(BASE + 'stores/' + d + '/hero.webp'); }
  return out;
}
// 是否专属图（演示工具与测试用）
const storeOwn = (id) => OWN.indexOf(String(id)) >= 0;
function unitThumb(unit) {
  if (unit && unit.photo) return unit.photo;
  const v = Number(unit && unit.volume) || 0;
  const b = CF.unitThumbBands.find((x) => v <= x.maxM3) || CF.unitThumbBands[CF.unitThumbBands.length - 1];
  return BASE + 'units/' + b.key + '.webp';
}
// 物品缩略图（IMPL-01 M-20）：随 pkg-estimate 分包的 39 张小图，按物品编号取；正式环境接口返回 item.photo 时优先用。
const itemThumb = (item) => (item && item.photo) || '/pkg-estimate/assets/items/' + ((item && item.id) || 'box') + '.webp';
// 仓位空间示意图的 4 档（IMPL-01，估算两页的仓库示意共用）：全部档位 [{ key, src }]，与某个容量落在哪一档
const unitThumbSet = () => CF.unitThumbBands.map((b) => ({ key: b.key, src: BASE + 'units/' + b.key + '.webp' }));
const unitThumbKey = (m3) => { const v = Number(m3) || 0; return (CF.unitThumbBands.find((x) => v <= x.maxM3) || CF.unitThumbBands[CF.unitThumbBands.length - 1]).key; };
// 到店指引地图上的门店标记（IMPL-01；地图标记只认位图）
const mapPin = BASE + 'map/pin.png';
module.exports = { storeDir, storeCard, storeHero, storeGallery, storeOwn, unitThumb, mapPin, POOL };
Object.assign(module.exports, { itemThumb, unitThumbSet, unitThumbKey }); // IMPL-01 估算域
