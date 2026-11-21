// 演示数据适配器的「find」部分（W34）。methods 里的每个函数签名为 (params, session) => Promise，与真实接口同名同结构。
// 这里的数据都来自冻结稿（W27）的规则脚本与演示数据，不是核实过的门店资料；接真实接口后整个文件不存在。
const { db } = require('./_db');
const C = require('../../core/config');
const CF = require('../../core/config-find');
const stores = require('../../mock/stores');
const catalog = require('../../mock/items');
const ok = (v) => new Promise((resolve) => setTimeout(() => resolve(JSON.parse(JSON.stringify(v))), 0));
const fail = (code, message) => Promise.reject({ code, message });
const kv = () => { if (!db.kv.find) db.kv.find = { arrivalOf: {} }; return db.kv.find; };

// ---- 门店坐标：冻结稿 runtime/store-geo.js（门店导出列表_地址标准化_2026-08-16，WGS84，定位到小区 / 楼宇，不保证是仓区入口）----
const GEO_WGS = { SIM_BJ01: [116.41445, 39.97457], SIM_BJ02: [116.432207, 39.983798], SIM_BJ03: [116.45071, 39.90468], SIM_BJ04: [116.448885, 39.966974], SIM_BJ05: [116.464516, 40.010883], SIM_SH01: [121.42755, 31.210717], SIM_SH02: [121.35605, 31.22658], SIM_SZ01: [113.865184, 22.586251], SIM_BJ06: [116.38918, 39.86996], SIM_BJ07: [116.437814, 39.893233], SIM_BJ08: [116.484657, 39.989365], SIM_BJ09: [116.290931, 39.815977], SIM_BJ10: [116.46665, 39.89614], SIM_BJ11: [116.30055, 39.96342], SIM_BJ12: [116.337634, 40.072996], SIM_BJ13: [116.694507, 39.890919], SIM_BJ14: [116.222359, 39.911865], SIM_BJ15: [116.332665, 39.894335], SIM_BJ16: [116.398294, 39.880482], SIM_BJ17: [116.497948, 39.918102], SIM_BJ18: [116.320515, 39.871181], SIM_BJ19: [116.469395, 39.991312], SIM_BJ20: [116.35167, 40.01131], SIM_BJ21: [116.243893, 40.154298], SIM_BJ22: [116.68263, 39.93153], SIM_BJ23: [116.360054, 39.886392], SIM_BJ24: [116.432096, 39.897725], SIM_BJ25: [116.45241, 39.83928], SIM_BJ26: [116.300133, 39.842473], SIM_BJ27: [116.313557, 40.057248], SIM_BJ28: [116.34857, 40.067764], SIM_BJ29: [116.658288, 39.921983], SIM_BJ30: [116.332022, 39.89545] };
// WGS84 → GCJ-02（wx.openLocation 用 gcj02）。算法与冻结稿 store-geo.js 相同。
const PI = Math.PI, A = 6378245, EE = 0.00669342162296594323;
function tLat(x, y) { let r = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x)); r += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3; r += (20 * Math.sin(y * PI) + 40 * Math.sin(y / 3 * PI)) * 2 / 3; r += (160 * Math.sin(y / 12 * PI) + 320 * Math.sin(y * PI / 30)) * 2 / 3; return r; }
function tLon(x, y) { let r = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x)); r += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3; r += (20 * Math.sin(x * PI) + 40 * Math.sin(x / 3 * PI)) * 2 / 3; r += (150 * Math.sin(x / 12 * PI) + 300 * Math.sin(x / 30 * PI)) * 2 / 3; return r; }
function gcj(lon, lat) {
  const dLat = tLat(lon - 105, lat - 35), dLon = tLon(lon - 105, lat - 35), rad = lat / 180 * PI;
  const magic = 1 - EE * Math.pow(Math.sin(rad), 2), sq = Math.sqrt(magic);
  return { longitude: Number((lon + dLon * 180 / (A / sq * Math.cos(rad) * PI)).toFixed(6)), latitude: Number((lat + dLat * 180 / ((A * (1 - EE)) / (magic * sq) * PI)).toFixed(6)) };
}
const geoOf = (id) => (GEO_WGS[id] ? gcj(GEO_WGS[id][0], GEO_WGS[id][1]) : null);
function haversineKm(lat1, lon1, lat2, lon2) {
  const r = (d) => d * PI / 180, dLat = r(lat2 - lat1), dLon = r(lon2 - lon1);
  const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
// 没有门店的城市（只用于演示「定位城市暂无门店」D-184；正式环境由后端做逆地理编码）
const DEMO_CITY_CENTERS = [['成都', 30.5728, 104.0668], ['武汉', 30.5928, 114.3055], ['西安', 34.3416, 108.9398], ['南京', 32.0603, 118.7969], ['重庆', 29.563, 106.5516], ['天津', 39.0842, 117.2009], ['苏州', 31.2989, 120.5853]];

// ---- 到店档案：冻结稿 model/arrival-demo.js（演示数据，用来验证版式；上线前按《门店到店资料采集模板》逐店替换）----
// 字段缺失时界面整行不显示，不推断。photos 没有核验过的门店实拍，不下发。
const ARRIVAL = {
  complex: {
    mapNote: '仓区在 28 号楼 B1 层，步行与车辆入口不同',
    pins: ['步行入口', '车辆入口'],
    dests: [{ kind: 'walk', title: '步行入口', sub: '小区南门进，28 号楼北侧单元门' }, { kind: 'car', title: '车辆入口', sub: '胜古北里路一侧地库入口，限高 2.0 米' }],
    entry: [['步行入口', '小区南门进，28 号楼北侧单元门，下一层到仓区'], ['车辆入口', '胜古北里路一侧地库入口，与步行入口不在同一处'], ['停车卸货', '地库 B1 设临时卸货位，紧邻货梯；停车前 30 分钟免费，之后按小区标准收费'], ['通行限制', '地库限高 2.0 米。厢式货车请停地面卸货点，经 28 号楼北门进入', true]],
    steps: ['在 B1 临时卸货位卸货，推车在货梯口自取', '乘货梯到 B1 仓区层，出梯右转', '直行约 20 米到仓区门，沿途无台阶'], path: '',
    facts: [['电梯', '货梯 1 部'], ['台阶', '无'], ['推车', '货梯口自取']],
    transit: [['地铁', '10 号线安贞门站 A 口，沿所示路线步行约 650 米到步行入口']], transitMore: [['公交', '安贞里站，步行约 300 米']],
    svc: { lift: '货梯直达 B1 仓区层', cart: '货梯口自取，用后归还', dock: '地库 B1 临时卸货位', park: '前 30 分钟免费，之后按小区标准', metro: '10 号线安贞门站 A 口' }, ask: false,
    // IMPL-01 服务设施宫格的演示数据（按「信息完整」假设补全，未核实；[类型, 名称, 短说明]）。存取时间取门店的 access_hours，由页面放在第一格。
    fac: [['lift', '电梯直达', '货梯到 B1'], ['climate', '控温防潮', '恒温除湿'], ['security', '全天监控', '独立门锁'], ['lock', '一键开锁', '暂未开通'], ['cart', '免费推车', '货梯口自取'], ['dock', '停车卸货', 'B1 卸货位'], ['metro', '近地铁', '10 号线']]
  },
  simple: {
    mapNote: '仓区在 28 号楼 1 层，门口可临时停车', pins: ['门店入口'], dests: [],
    entry: [['入口', '小区南门进，28 号楼 1 层临街门，步行和车辆同一入口'], ['停车卸货', '门口可临时停车卸货，不收费']],
    steps: [], path: '从门口平层进入仓区，沿途无台阶，推车在入口处自取。', facts: [],
    transit: [['公交', '安贞里站，步行约 300 米']], transitMore: [],
    svc: { cart: '入口处自取，用后归还', dock: '门口临时停车位', park: '门口临时停车，不收费' }, ask: false
  },
  transit: {
    mapNote: '仓区在 28 号楼 2 层，从商场东门进入', pins: ['门店入口'], dests: [],
    entry: [['入口', '商场东门进，乘客梯到 2 层，出梯左转'], ['停车卸货', '门店无停车位。车辆可在东门路边临时停靠卸货，请勿长时间停留', true]],
    steps: [], path: '东门进入后乘客梯到 2 层，出梯左转约 10 米到仓区门，沿途无台阶。',
    facts: [['电梯', '客梯 2 部'], ['台阶', '无'], ['推车', '仓区门口自取']],
    transit: [['地铁', '10 号线安贞门站 A 口，出站右转步行约 200 米']], transitMore: [['公交', '安贞里站，步行约 150 米'], ['共享单车', '东门外设停放区']],
    svc: { lift: '客梯到 2 层', cart: '仓区门口自取，用后归还', metro: '10 号线安贞门站 A 口，步行约 200 米' }, ask: false
  },
  partial: { mapNote: '', pins: ['门店位置'], dests: [], entry: [['入口', '小区南门进，28 号楼北侧单元门']], steps: [], path: '', facts: [], transit: [], transitMore: [], svc: {}, ask: true },
  // 还没有采集到店资料的门店：只给导航与「向门店确认」
  none: { mapNote: '', pins: ['门店位置'], dests: [], entry: [], steps: [], path: '', facts: [], transit: [], transitMore: [], svc: {}, ask: true }
};
const ARRIVAL_OF = { SIM_BJ01: 'complex' }; // 冻结稿只给安贞·富仁名苑店配了演示档案；其余门店没有到店资料

// ---- 物品目录：mock/items.js 是冻结稿 runtime/items-catalog.js 的原件；冻结稿 pages/w3-render.js（W17）在显示前做的目录清理在这里落到数据上 ----
const DESC = { box: '约 60×40×40cm', goodsbox: '约 60×40×50cm', pallet: '含货物的满载托盘', printer: '按中型设备估算，大型复印机请选顾问协助' };
const BOXLIKE = { box: 1, bin: 1, clothingBox: 1, toybox: 1, shoebox: 1, figurebox: 1, goodsbox: 1, turnover: 1, archiveBox: 1, officeBox: 1 };
// 场景目录：冻结稿 runtime/items-catalog.js MK_ITEMS_SCENES（红酒箱已按 D-152 拿掉）
const SCENES = [
  { id: 'moving', name: '搬家装修', description: '搬家或装修时常见的家具、家电与收纳用品', items: ['sofa3', 'bed180', 'wardrobe', 'dining', 'chair', 'coffee', 'tvcab', 'fridge', 'washer', 'box', 'bin', 'luggage28'] },
  { id: 'home', name: '家庭闲置', description: '换季收纳、闲置家居及儿童用品', items: ['box', 'bin', 'clothingBox', 'quilt', 'coat', 'appliance', 'stroller', 'toybox', 'crib', 'tvcab', 'bookcase', 'shoebox'] },
  { id: 'luggage', name: '行李寄存', description: '箱包杂物等短期或临时存储需求', items: ['luggage20', 'luggage24', 'luggage28', 'bag', 'box', 'bin'] },
  { id: 'hobby', name: '爱好收藏', description: '收藏品、乐器与兴趣运动用品', items: ['shoebox', 'figurebox', 'guitar', 'bicycle', 'box'] },
  { id: 'business', name: '商家备货', description: '商家存货、包装周转及货架', items: ['goodsbox', 'turnover', 'clothingPack', 'pallet', 'displayRack', 'shelf', 'box'] },
  { id: 'office', name: '办公存储', description: '文件归档、办公家具及设备', items: ['archiveBox', 'fileCab', 'officeChair', 'officeDesk', 'officeBox', 'printer', 'bookcase', 'box'] }
];
function itemCatalog() {
  const order = catalog.categories.map((c) => c[0]);
  const items = catalog.items.map((x) => {
    let it = Object.assign({}, x);
    if (x.id === 'chair') it = Object.assign(it, { name: '餐椅', variants: x.variants.filter((v) => v.id !== 'office') });   // 办公椅只保留办公物资里的单品
    if (x.id === 'dining') it = Object.assign(it, { name: '餐桌 / 小桌', variants: x.variants.filter((v) => v.id !== 'office') });
    if (x.id === 'stroller') it.category = 'furniture';                                                                      // 「其他物品」只有 1 项，并入家具
    if (DESC[x.id]) it.description = DESC[x.id];
    it.unit = BOXLIKE[x.id] ? 'box' : 'piece';
    if (!it.variants.some((v) => v.id === it.defaultVariant)) it.defaultVariant = it.variants[0].id;
    delete it.photo; // 物品图没有随包下发；正式环境返回线上地址
    return it;
  }).sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));
  const used = {}; items.forEach((x) => { used[x.category] = 1; });
  return { categories: catalog.categories.filter((c) => used[c[0]]).map((c) => ({ id: c[0], name: c[1] })), scenes: SCENES, items };
}

// ---- 空间参考卡：冻结稿 runtime/cap-bands.js（示意图没有随包下发，只下发文字）----
const CAP_BANDS = [
  { max: 1.5, title: '适合存放少量闲置物品', note: '行李、换季衣物及箱包收纳', things: [['标准纸箱', '3个'], ['行李箱', '1个'], ['收纳箱', '1个'], ['收纳袋', '1个']] },
  { max: 5, title: '适合日常闲置与小件家具', note: '箱包、收纳用品及少量小家具', things: [['标准纸箱', '8个'], ['行李箱', '2个'], ['折叠椅', '1件'], ['收纳箱', '2个']] },
  { max: 10, title: '适合部分家具与搬家物品', note: '单人沙发、小柜、行李与装箱物品', things: [['标准纸箱', '12个'], ['单人沙发', '1件'], ['矮柜', '1件'], ['行李箱', '1个']] },
  { max: 25, title: '适合搬家装修期间存放', note: '沙发、拆装床具、家电及纸箱', things: [['标准纸箱', '18个'], ['双人沙发', '1件'], ['洗衣机', '1台'], ['床垫', '1张']] },
  { max: 50, title: '适合全屋家具与大件存放', note: '沙发、床具、衣柜、冰箱等家庭物品', things: [['标准纸箱', '30个'], ['三人沙发', '1件'], ['床垫', '2张'], ['冰箱', '1台']] },
  { max: 200, title: '适合大容量复杂存放', note: '多组家庭家具、大件家电及大量装箱物品', things: [['标准纸箱', '60个'], ['三人沙发', '2件'], ['冰箱', '2台'], ['拆装衣柜', '4组']] }
];

const openIn = (city) => stores.filter((s) => s.city === city && s.status === 'open');
const tally = (list, key) => { const m = {}; list.forEach((s) => { if (s[key]) m[s[key]] = (m[s[key]] || 0) + 1; }); return Object.keys(m).map((k) => ({ name: k, count: m[k] })).sort((a, b) => b.count - a.count); };

const methods = {
  // 用仓位置面板的数据：有营业门店的城市、当前城市的区域 / 商圈（带门店数，按门店数排序）、可搜索的门店字段
  getLocationIndex(p) {
    const city = p.city || C.defaultCity, open = openIn(city);
    return ok({
      city, cities: tally(stores.filter((s) => s.status === 'open'), 'city').sort((a, b) => b.count - a.count),
      districts: tally(open, 'district'), areas: tally(open, 'area'),
      stores: open.map((s) => ({ id: s.id, name: s.name, district: s.district, area: s.area, community: s.community, address: s.address }))
    });
  },
  // 经纬度 → 城市 / 区域。演示环境没有地图服务：取最近的有坐标的门店，在 locateResolveKm 内算作该城市；否则按演示城市中心表判定为无门店城市。
  resolveCity(p) {
    const lat = Number(p.latitude), lon = Number(p.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return fail('INVALID', '缺少经纬度');
    let best = null;
    stores.forEach((s) => { const g = geoOf(s.id); if (!g || s.status !== 'open') return; const d = haversineKm(lat, lon, g.latitude, g.longitude); if (!best || d < best.d) best = { s, d }; });
    if (best && best.d <= CF.locateResolveKm) return ok({ city: best.s.city, district: best.s.district, area: best.s.area, hasStores: true });
    let near = null;
    DEMO_CITY_CENTERS.forEach((c) => { const d = haversineKm(lat, lon, c[1], c[2]); if (!near || d < near.d) near = { name: c[0], d }; });
    return ok({ city: near && near.d <= CF.locateResolveKm ? near.name : '', district: '', area: '', hasStores: false });
  },
  // 门店到店资料：坐标（gcj02）、400 电话、到店档案。没有采集资料的门店 profile 各字段为空。
  getStoreArrival(p) {
    const s = stores.find((x) => x.id === p.id);
    if (!s) return fail('NOT_FOUND', '门店不存在');
    const key = kv().arrivalOf[p.id] || ARRIVAL_OF[p.id] || 'none';
    return ok({ store_id: s.id, geo: geoOf(s.id), phone: s.phone || '', hotline: CF.hotline, profile: ARRIVAL[key] || ARRIVAL.none });
  },
  getItemCatalog() { return ok(itemCatalog()); },
  getSpaceReference() { return ok({ bands: CAP_BANDS }); }
};
module.exports = { needLogin: [], methods, __demo: { ARRIVAL_KEYS: Object.keys(ARRIVAL) } };
