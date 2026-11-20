// 找仓域测试（W34）：排序规则、门店列表 / 仓位推荐 / 门店详情的视图模型、物品估算、修改需求、收藏、定位与无门店城市、用仓位置面板。
// 在假的 wx 环境里跑，验证的是代码逻辑与跳转去向，不是微信真实行为。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), routes = R('services/routes'), api = R('services/api'), finder = R('services/finder'), location = R('services/location'), pd = R('services/page-data');
const C = R('core/config'), CF = R('core/config-find'), T = R('i18n/find');
const { db } = R('services/mock-ext/_db');
env.loadApp();
const NEED = { capacity_m3: 3.5, input_unit: 'm3', input_value: 3.5, term_months: 6 };
const login = () => state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
const fresh = (need, loggedIn) => { state.reset(); env.nav.length = 0; env.mode = 'ok'; getApp().globalData.find = null; if (need) state.set('requirement', need); if (loggedIn) login(); };
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 15));
const BJ = { city: '北京', kind: 'city', label: '', status: 'unasked', noStoreCity: '' };
const ctx = (need, loggedIn, loc) => ({ requirement: need, location: loc || BJ, loggedIn: !!loggedIn });
const tap = (dataset) => ({ currentTarget: { dataset } });
const realGetLocation = wx.getLocation;
const withLocation = (impl, fn) => { wx.getLocation = impl; return Promise.resolve().then(fn).finally(() => { wx.getLocation = realGetLocation; }); };
let BJS;
test.before(async () => { BJS = await api.getStores({ city: '北京' }); });
const unit = (id, volume, base, extra) => Object.assign({ id, store_id: id.split('_U')[0], code: id.slice(-4), volume, area: 1, dims: [1, 1, volume], base_month: base, status: 'available', special_month: null, tier_index: null, tier_total: null }, extra || {});
const store = (id, km, units, extra) => Object.assign({ id, city: '北京', name: id + '店', district: '朝阳区', area: '', community: '', address: '地址' + id, distance_km: km, status: 'open', access_hours: '09:00-21:00', tags: [], phone: '', operating_tag: '', photo: '', units }, extra || {});

// ---------- 排序规则（冻结稿 recommendation-policy / home-recommend-policy）----------
test('排序 rank：最近的第一；第二位在 3 → 5 → 10km 内找更便宜的，没有就取下一个最近的；其余按距离', () => {
  const o = { distOf: (r) => r.km, costOf: (r) => r.cost, idOf: (r) => r.id };
  const ids = (rows) => finder.rank(rows, o).items.map((r) => r.id).join('');
  assert.equal(ids([{ id: 'A', km: 1, cost: 100 }, { id: 'B', km: 2, cost: 120 }, { id: 'C', km: 4, cost: 90 }, { id: 'D', km: 9, cost: 50 }]), 'ACBD', '3km 内没有更便宜的，扩到 5km 取 C');
  assert.equal(ids([{ id: 'A', km: 1, cost: 100 }, { id: 'B', km: 2.5, cost: 95 }, { id: 'C', km: 4, cost: 60 }]), 'ABC', '3km 内已有更便宜的，不再往外找');
  assert.equal(ids([{ id: 'A', km: 1, cost: 100 }, { id: 'B', km: 2, cost: 120 }, { id: 'C', km: 12, cost: 50 }]), 'ABC', '10km 外的低价不提前');
  assert.equal(ids([{ id: 'B', km: 2, cost: 1 }, { id: 'A', km: 1, cost: 9 }]), 'AB');
  const noKm = finder.rank([{ id: 'X', km: null, cost: 9 }, { id: 'Y', km: null, cost: 5 }, { id: 'Z', km: null, cost: 3 }], o);
  assert.equal(noKm.distanceRanked, false); assert.deepEqual(noKm.items.map((r) => r.id), ['X', 'Z', 'Y'], '距离不全：保持首位，第二位取最便宜的');
  assert.deepEqual(CF.recommend.cheaperRadiiKm, [3, 5, 10]);
});
test('首页推荐：最近 → 半径内更低价 → 运营位（特价仓优先）；距离不全时不按距离排', () => {
  const base = finder.buildHomeRecommend(BJS, ctx(null, false));
  assert.deepEqual(base.map((c) => c.id), ['SIM_BJ01', 'SIM_BJ02', 'SIM_BJ03']);
  assert.ok(base.every((c) => c.tags.length <= 2 && c.locText.indexOf('km · ') > 0));
  // 把 4.5km 的门店改成全城最便宜：应提前到第二位
  const cheap = BJS.map((s) => (s.id === 'SIM_BJ03' ? Object.assign({}, s, { units: s.units.map((u) => Object.assign({}, u, { base_month: 10 * u.volume })) }) : s));
  assert.deepEqual(finder.buildHomeRecommend(cheap, ctx(null, false)).slice(0, 2).map((c) => c.id), ['SIM_BJ01', 'SIM_BJ03']);
  // 运营位：带「特价仓」运营标记的门店排第三
  const op = BJS.map((s) => (s.id === 'SIM_BJ10' ? Object.assign({}, s, { operating_tag: '特价仓' }) : s));
  assert.equal(finder.buildHomeRecommend(op, ctx(null, false))[2].id, 'SIM_BJ10');
  // 仓位有特价时同样算运营位，并且卡上的「特价仓」标签来自仓位本身
  const sp = BJS.map((s) => (s.id === 'SIM_BJ12' ? Object.assign({}, s, { units: s.units.map((u, i) => (i === 0 ? Object.assign({}, u, { status: 'available', special_month: 1 }) : u)) }) : s));
  const third = finder.buildHomeRecommend(sp, ctx(null, false))[2];
  assert.equal(third.id, 'SIM_BJ12'); assert.deepEqual(third.tags[0], { t: '特价仓', promo: true });
  // 定位城市没有门店（D-184）：不显示公里数，卡上写区名与小区
  const none = finder.buildHomeRecommend(BJS, ctx(null, false, Object.assign({}, BJ, { noStoreCity: '成都' })));
  assert.ok(none.every((c) => c.kmText === '' && c.locText.indexOf('km') < 0)); assert.deepEqual(none.slice(0, 2).map((c) => c.id), ['SIM_BJ01', 'SIM_BJ02']);
});

// ---------- 门店列表 ----------
test('门店列表：综合排序用同一个距离值；有需求时 有匹配 → 接近 → 无匹配；排序条与筛选', () => {
  const l = finder.buildList(BJS, ctx(NEED, true));
  assert.equal(l.mode, 'demand'); assert.equal(l.total, BJS.length, '有需求时全部营业门店都在列表里');
  assert.deepEqual(l.cards.slice(0, 2).map((c) => c.id), ['SIM_BJ01', 'SIM_BJ02']);
  const g = { matched: 0, near: 1, none: 2 }, order = l.cards.map((c) => g[c.listState]);
  assert.deepEqual(order, order.slice().sort((a, b) => a - b));
  const matched = l.cards.filter((c) => c.listState === 'matched');
  assert.ok(matched.slice(2).every((c, i, a) => i === 0 || a[i - 1].km <= c.km), '第三位起按距离');
  // 第二位在半径内更便宜：造三家店
  const mk = [store('SIM_T1', 1, [unit('SIM_T1_U001', 4, 500)]), store('SIM_T2', 2, [unit('SIM_T2_U001', 4, 600)]), store('SIM_T3', 4, [unit('SIM_T3_U001', 4, 300)])];
  assert.deepEqual(finder.buildList(mk, ctx(NEED, true)).cards.map((c) => c.id), ['SIM_T1', 'SIM_T3', 'SIM_T2']);
  assert.deepEqual(finder.buildList(mk, ctx(null, false)).cards.map((c) => c.id), ['SIM_T1', 'SIM_T3', 'SIM_T2'], '无需求按门店起价同样处理');
  assert.deepEqual(finder.buildList(mk, ctx(NEED, true), { sort: 'distance' }).cards.map((c) => c.id), ['SIM_T1', 'SIM_T2', 'SIM_T3']);
  assert.deepEqual(finder.buildList(mk, ctx(NEED, true), { sort: 'price' }).cards.map((c) => c.id), ['SIM_T3', 'SIM_T1', 'SIM_T2']);
  // 筛选
  assert.ok(finder.buildList(BJS, ctx(null, false), { maxKm: 3 }).cards.every((c) => c.km <= 3));
  const svc = finder.serviceOptions(BJS); assert.ok(svc.length > 0 && svc.length <= CF.list.serviceOptionsMax);
  const withSvc = finder.buildList(BJS, ctx(null, false), { services: [svc[0]] });
  assert.ok(withSvc.total > 0 && withSvc.total < BJS.length && withSvc.filtered === true);
  assert.equal(finder.buildList(BJS, ctx(null, false), { promo: true }).total, 0, '演示数据里没有特价仓');
  assert.equal(finder.buildList(BJS, ctx(null, false)).filtered, false);
});
test('门店列表：接近方案、无匹配页、30m³ 及以上、区域范围、5km 内无门店兜底', () => {
  const stores = [store('SIM_T1', 1, [unit('SIM_T1_U001', 3, 300), unit('SIM_T1_U002', 2.9, 290)]), store('SIM_T2', 2, [unit('SIM_T2_U001', 5, 500)]), store('SIM_T3', 3, [unit('SIM_T3_U001', 1, 100)], { district: '海淀区', area: '万柳' })];
  const l = finder.buildList(stores, ctx(NEED, true));
  assert.deepEqual(l.cards.map((c) => [c.id, c.listState]), [['SIM_T2', 'matched'], ['SIM_T1', 'near'], ['SIM_T3', 'none']]);
  const near = l.cards[1];
  assert.equal(near.nearText, '比需求小 0.5m³'); assert.equal(near.row.cta, '查看仓位'); assert.equal(near.moreText, '另有 1 个可租 · 查看门店');
  assert.equal(near.compactText, '3m³ · 6个月 ¥1,260 · 比需求小 0.5m³');
  assert.equal(l.cards[2].emptyText, '该店暂无匹配仓位'); assert.equal(l.noMatch, false);
  const none = finder.buildList(stores, ctx({ capacity_m3: 20, term_months: 6 }, true));
  assert.equal(none.noMatch, true); assert.equal(none.advisor, null);
  const sales = finder.buildList(stores, ctx({ capacity_m3: 30, term_months: 12 }, true));
  assert.equal(sales.mode, 'sales'); assert.equal(sales.total, 0);
  // 用仓位置选了区域 / 商圈：只看该范围
  assert.deepEqual(finder.buildList(stores, ctx(null, false, Object.assign({}, BJ, { kind: 'district', label: '海淀区' }))).cards.map((c) => c.id), ['SIM_T3']);
  assert.equal(finder.buildList(stores, ctx(null, false, Object.assign({}, BJ, { kind: 'area', label: '万柳' }))).scopeText, '万柳');
  const pin = finder.buildList(stores, ctx(null, false, Object.assign({}, BJ, { kind: 'store', label: 'SIM_T2店' })));
  assert.equal(pin.cards[0].id, 'SIM_T2'); assert.ok(pin.cards.every((c) => c.district === '朝阳区'));
  // 5km 内无门店（D-128）：只在用仓位置是定位点时判断
  const farStores = [store('SIM_T1', 9.1, [unit('SIM_T1_U001', 3, 300)]), store('SIM_T2', 6.3, [unit('SIM_T2_U001', 5, 500)]), store('SIM_T3', 7.8, [unit('SIM_T3_U001', 1, 100)]), store('SIM_T4', 12, [unit('SIM_T4_U001', 1, 100)])];
  const point = Object.assign({}, BJ, { kind: 'point', label: '朝阳区 安贞附近', status: 'granted' });
  const far = finder.buildList(farStores, ctx(null, false, point));
  assert.equal(far.far, true); assert.deepEqual(far.cards.map((c) => c.id), ['SIM_T2', 'SIM_T3', 'SIM_T1', 'SIM_T4']);
  assert.equal(finder.buildList(farStores, ctx(null, false)).far, false, '手动选城市时不算');
  assert.equal(finder.buildList(BJS, ctx(null, false, point)).far, false);
  assert.equal(C.matching.nearbyFallbackStores, 3);
});
test('门店卡标签：优惠 → 服务 → 属性；远距离门店带「满6个月免费运输」；无门店城市不带', () => {
  const s = store('SIM_T1', 6, [unit('SIM_T1_U001', 4, 400, { special_month: 200 })], { tags: ['控温防潮', '近地铁', '小推车', '全天监控'] });
  const c = finder.storeCard(s, ctx(NEED, true));
  assert.deepEqual(c.tags.map((t) => t.t), ['满6个月免费运输', '特价仓']);
  assert.equal(c.row.price.discount, '特价仓'); assert.equal(c.promo, true);
  const near = finder.storeCard(Object.assign({}, s, { distance_km: 2 }), ctx(null, false));
  assert.deepEqual(near.tags.map((t) => t.t), ['特价仓', '近地铁', '小推车'], '无需求时按本店可租仓位判断特价');
  const plain = finder.storeCard(store('SIM_T2', 2, [unit('SIM_T2_U001', 4, 400)], { tags: ['控温防潮', '近地铁'] }), ctx(null, false));
  assert.deepEqual(plain.tags.map((t) => t.t), ['近地铁', '控温防潮']);
  const noCity = finder.storeCard(s, ctx(NEED, true, Object.assign({}, BJ, { noStoreCity: '成都' })));
  assert.equal(noCity.kmText, ''); assert.equal(noCity.freeTransportTag, ''); assert.ok(noCity.tags.every((t) => t.t !== '满6个月免费运输'));
});
test('未登录：列表、仓位推荐、门店详情的视图模型里没有整期金额与「每月多」', () => {
  const out = JSON.stringify([finder.buildList(BJS, ctx(NEED, false)), finder.buildMatch(BJS, ctx(NEED, false)), finder.buildMatch(BJS, ctx({ capacity_m3: 9, term_months: 6 }, false)), finder.buildStoreDetail(BJS[0], ctx({ capacity_m3: 9, term_months: 6 }, false))]);
  assert.ok(!/整期|rentTotal|每月多|立即下单|"monthly"/.test(out)); assert.ok(/月起/.test(out) && /查看报价/.test(out));
  const guest = finder.buildMatch(BJS, ctx(NEED, false));
  assert.equal(guest.cards[0].lines[1].diffText, '大 1.5m³'); assert.equal(guest.advisor, null, '未登录顾问卡只按容量判断');
  assert.equal(finder.buildStoreDetail(BJS[0], ctx({ capacity_m3: 9, term_months: 6 }, false)).combos[0].price.unit, '/月起');
});

// ---------- 仓位推荐 ----------
test('仓位推荐：前 2 家、匹配仓 + 大一档与理由、组合方案、接近、无匹配、30m³ 及以上', () => {
  const m = finder.buildMatch(BJS, ctx(NEED, true));
  assert.equal(m.mode, 'matched'); assert.equal(m.cards.length, 2);
  assert.deepEqual(m.cards.map((c) => [c.id, c.rankTag]), [['SIM_BJ01', '第一推荐'], ['SIM_BJ02', '第二推荐']]);
  const a = m.cards[0].lines;
  assert.equal(a[0].name, 'A003 · 3.5m³'); assert.equal(a[0].area, '约1.4㎡'); assert.equal(a[0].usage, '适合纸箱、小件家具'); assert.equal(a[0].price.sub, '整期 ¥1,680 · 6个月');
  assert.equal(a[1].diffText, '大 1.5m³，每月多 ¥154'); assert.equal(a[1].reason, '需求与 3.5m³ 仓相当，大一档更好放'); assert.equal(a[1].secondary, true);
  assert.equal(m.cards[1].lines[1].reason, '需求约占 4m³ 仓的 88%，大一档更好放');
  assert.equal(m.cards[0].moreText, '另有 2 个可租 · 查看门店');
  const combo = finder.buildMatch(BJS, ctx({ capacity_m3: 9, term_months: 6 }, true));
  assert.equal(combo.mode, 'combo'); assert.equal(combo.sub, '支持组合仓位');
  assert.equal(combo.cards[0].lines[0].name, '组合仓 A003 + A005'); assert.equal(combo.cards[0].lines[0].volText, '11.5m³'); assert.equal(combo.cards[0].lines[0].id, 'SIM_BJ01_U03,SIM_BJ01_U05');
  assert.equal(combo.cards[0].lines[0].price.amount, 819); assert.equal(combo.cards[0].lines[0].price.sub, '整期 ¥4,914 · 6个月');
  assert.equal(combo.cards[0].lines.length, 1, '组合方案后面没有更大的可租仓时只有一行');
  assert.equal(combo.advisor.title, '需要顾问帮您确认方案？', '整期 ≥ ¥3,000 出顾问卡');
  const near = finder.buildMatch(BJS, ctx({ capacity_m3: 29, term_months: 6 }, true));
  assert.equal(near.mode, 'near'); assert.equal(near.sub, '没有不小于 29m³ 的仓位，以下容量接近');
  assert.equal(near.cards[0].lines[0].nearText, '比需求小 3m³'); assert.equal(near.cards[0].lines[0].price.sub, '整期 ¥10,878 · 6个月 · 满额减 ¥400');
  assert.equal(near.advisor.title, '可申请专属方案');
  const tiny = [store('SIM_T1', 1, [unit('SIM_T1_U001', 1, 100)])];
  const none = finder.buildMatch(tiny, ctx({ capacity_m3: 22, term_months: 6 }, true));
  assert.equal(none.mode, 'none'); assert.equal(none.cards.length, 0); assert.ok(none.advisor);
  assert.equal(finder.buildMatch(BJS, ctx({ capacity_m3: 30, term_months: 6 }, true)).mode, 'sales', '30m³（含）交顾问');
  // 已扩大范围：候选都在 3km 外
  const farOnly = BJS.filter((s) => s.distance_km > 3);
  assert.equal(finder.buildMatch(farOnly, ctx(NEED, true)).mode, 'expanded'); assert.equal(finder.buildMatch(farOnly, ctx(NEED, true)).sub, '已扩大范围');
  // 用仓位置选了区域：先推本区域
  const hd = finder.buildMatch(BJS, ctx(NEED, true, Object.assign({}, BJ, { kind: 'district', label: '海淀区' })));
  assert.equal(BJS.find((s) => s.id === hd.cards[0].id).district, '海淀区');
  // 含长件：需求占比不到 85% 时也给出大一档的理由
  const long = finder.buildMatch(BJS, ctx({ capacity_m3: 2.6, term_months: 6, source: 'items', est: { long: ['三人位沙发'] } }, true));
  assert.equal(long.cards[0].lines[1].reason, '清单含长件，大一档更好放');
});

// ---------- 门店详情 ----------
test('门店详情：各种情形（浏览 / 匹配 / 组合 / 无匹配 / 交顾问 / 仓型筛选 / 已租出）', () => {
  const s = BJS[0];
  const browse = finder.buildStoreDetail(s, ctx(null, true));
  assert.equal(browse.situation, 'browse'); assert.equal(browse.headPrice, 63); assert.equal(browse.rows.length, 4);
  assert.deepEqual(browse.rows[0].price, { mode: 'from', amount: 117, unit: '/月起', discount: '', sub: '' }); assert.equal(browse.rows[0].tier, '上层 2/2');
  assert.equal(browse.rows[0].cta, '立即下单', '无需求时按默认租期下单');
  assert.equal(browse.sold.length, 1); assert.equal(browse.advisor, null);
  const matched = finder.buildStoreDetail(s, ctx(NEED, true));
  assert.equal(matched.situation, 'matched'); assert.equal(matched.headPrice, null);
  assert.deepEqual(matched.rows.map((r) => r.name), ['A003 · 3.5m³', 'A004 · 5m³', 'A005 · 8m³']);
  assert.deepEqual(matched.smaller.map((r) => [r.cta, r.act, r.volume]), [['按 0.8m³ 重新匹配', 'rematch', 0.8]]);
  const combo = finder.buildStoreDetail(s, ctx({ capacity_m3: 9, term_months: 6 }, true));
  assert.equal(combo.situation, 'combo'); assert.equal(combo.comboMode, 'open');
  assert.deepEqual(combo.combos.map((c) => [c.volText, c.tag, c.sub, c.price.amount]), [['11.5m³', '2 间组合', '一笔订单 · 同一门店 · A003 + A005', 819], ['13m³', '2 间组合', '一笔订单 · 同一门店 · A004 + A005', 973]]);
  assert.deepEqual(combo.near.map((r) => [r.name, r.nearText, r.cta]), [['A005 · 8m³', '比需求小 1m³', '立即下单']]);
  assert.equal(combo.advisor.title, '需要顾问帮您确认方案？');
  const sales = finder.buildStoreDetail(s, ctx({ capacity_m3: 35, term_months: 6 }, true));
  assert.equal(sales.situation, 'sales'); assert.equal(sales.rows.length + sales.near.length + sales.smaller.length + sales.combos.length, 0); assert.equal(sales.advisor, null);
  const nomatch = finder.buildStoreDetail(s, ctx({ capacity_m3: 25, term_months: 6 }, true));
  assert.equal(nomatch.situation, 'nomatch'); assert.ok(nomatch.advisor); assert.equal(nomatch.rows.length + nomatch.smaller.length, 0);
  const cat = finder.buildStoreDetail(s, ctx(null, true), { category: 'mini' });
  assert.deepEqual(cat.rows.map((r) => r.name), ['A001 · 0.8m³']);
  assert.equal(finder.buildStoreDetail(s, ctx(null, true), { category: 'large' }).catEmpty, true);
  const soldout = finder.buildStoreDetail(Object.assign({}, s, { units: s.units.map((u) => Object.assign({}, u, { status: 'soldout' })) }), ctx(NEED, true));
  assert.equal(soldout.situation, 'soldout'); assert.equal(soldout.showAlternatives, true); assert.equal(soldout.sold.length, CF.detail.soldFoldMax);
  const alt = finder.buildAlternatives(BJS, ctx({ capacity_m3: 9, term_months: 6 }, true), 'SIM_BJ01');
  assert.ok(alt.length > 0 && alt.length <= 3 && alt.every((x) => x.id !== 'SIM_BJ01' && /m³/.test(x.text)));
});
test('门店详情页：页签、收藏、重新匹配、导航与电话、仓位已租出、到店资料缺失不推断', async () => {
  fresh(NEED, true); let pg = env.newPage('pages/store/detail', { id: 'SIM_BJ01' }); await tick();
  assert.equal(pg.data.sys, ''); assert.equal(pg.data.situation, 'matched'); assert.equal(pg.data.gone, false);
  assert.deepEqual(pg.data.blocks.map((b) => b.type), ['unit', 'unit', 'unit', 'title', 'unit']);
  // 收藏：存本机
  pg.onFavStore(); assert.equal(pg.data.fav, true); assert.deepEqual(state.get().favorites.stores, ['SIM_BJ01']);
  pg.onFavUnit(tap({ id: 'SIM_BJ01_U03' })); assert.equal(pg.data.blocks[0].row.fav, true); assert.deepEqual(state.get().favorites.units, ['SIM_BJ01_U03']);
  assert.deepEqual(JSON.parse(JSON.stringify(env.storage.mk_state_v1.favorites)), { stores: ['SIM_BJ01'], units: ['SIM_BJ01_U03'] });
  pg.onFavStore(); assert.deepEqual(state.get().favorites.stores, []);
  assert.deepEqual(pg.onShareAppMessage(), { title: '安贞·富仁名苑店', path: routes.STORE_DETAIL + '?id=SIM_BJ01' });
  // 服务设施与到店指引：安贞店带演示档案
  pg.onTab(tap({ i: 1 })); assert.equal(pg.data.tab, 1);
  assert.deepEqual(pg.data.svc.map((x) => x.title), ['存取与安防', '仓内环境', '到店与搬运']);
  assert.equal(pg.data.svc[0].rows[1].v, '一键开锁（暂未开通），租后在「我的仓位」操作');
  pg.onSeeRoute(); assert.equal(pg.data.tab, 2);
  assert.equal(pg.data.route.mapNote, '仓区在 28 号楼 B1 层，步行与车辆入口不同'); assert.equal(pg.data.route.entry[3].key, true, '通行限制在到店指引里');
  // 导航：两个入口 → 先选入口，再打开地图（gcj02 坐标）
  const calls = []; const ol = wx.openLocation, mp = wx.makePhoneCall;
  wx.openLocation = (o) => calls.push(['map', o.latitude, o.longitude, o.name]); wx.makePhoneCall = (o) => calls.push(['tel', o.phoneNumber]);
  pg.onNavigate(); assert.equal(pg.data.destSheet, true); pg.onDest(tap({ i: 1 }));
  assert.deepEqual(calls[0], ['map', 39.975974, 116.420697, '安贞·富仁名苑店 · 车辆入口']); assert.equal(pg.data.destSheet, false);
  pg.onCall(); assert.deepEqual(calls[1], ['tel', '4000358885'], '门店没有电话时拨 400 客服');
  wx.openLocation = ol; wx.makePhoneCall = mp;
  // 按 0.8m³ 重新匹配：改的是全站那一份需求，租期不变
  pg.onTab(tap({ i: 0 })); pg.onAction(tap({ list: 'smaller', i: 0 }));
  assert.deepEqual([state.get().requirement.capacity_m3, state.get().requirement.term_months], [0.8, 6]); assert.equal(pg.data.rows[0].name, 'A001 · 0.8m³');
  // 已登录下单：复查库存后进入确认订单
  env.nav.length = 0; pg.onAction(tap({ list: 'rows', i: 0 })); await tick();
  assert.deepEqual(env.nav, [{ kind: 'navigateTo', url: routes.CONFIRM + '?unit=SIM_BJ01_U01&term=6' }]);
  // 带着已租出的仓位进来：提示所选仓位已不可租
  fresh(NEED, true); pg = env.newPage('pages/store/detail', { id: 'SIM_BJ01', unit: 'SIM_BJ01_U02' }); await tick(); assert.equal(pg.data.gone, true);
  // 未登录：「查看报价」打开登录层，不跳转
  fresh(NEED, false); pg = env.newPage('pages/store/detail', { id: 'SIM_BJ01' }); await tick(); env.nav.length = 0;
  assert.equal(pg.data.rows[0].cta, '查看报价'); pg.onAction(tap({ list: 'rows', i: 0 })); assert.equal(pg.data.loginVisible, true); assert.equal(env.nav.length, 0);
  // 没有到店档案的门店：不出入口 / 路径 / 交通，只给导航与「向门店确认」；标签只列门店数据里有的
  fresh(null, false); pg = env.newPage('pages/store/detail', { id: 'SIM_BJ02', tab: '2' }); await tick();
  assert.equal(pg.data.tab, 2); assert.equal(pg.data.route.entry.length + pg.data.route.steps.length + pg.data.route.transit.length, 0);
  assert.equal(pg.data.route.askText, '停车、卸货和进仓路径可向门店确认'); assert.deepEqual(pg.data.route.pins, ['门店位置']);
  assert.deepEqual(pg.data.svc.map((x) => x.title), ['存取与安防', '到店与搬运']); assert.deepEqual(pg.data.svc[1].rows.map((r) => [r.k, r.v]), [['停车便利', ''], ['小推车', '']]);
  assert.equal(pg.data.headPrice, 73); assert.equal(pg.data.rows[0].cta, '立即下单');
  env.nav.length = 0; pg.onAction(tap({ list: 'rows', i: 0 })); assert.equal(pg.data.loginVisible, true, '未登录点立即下单在当前页打开登录层'); assert.equal(env.nav.length, 0);
  // 其它演示档案：字段缺的行不显示
  db.kv.find = { arrivalOf: { SIM_BJ02: 'partial' } }; pg.loadArrival(); await tick();
  assert.deepEqual(pg.data.route.entry.map((r) => r.k), ['入口']); assert.equal(pg.data.route.path, '');
  db.kv.find = { arrivalOf: {} };
  // 门店不存在：失败态
  pg = env.newPage('pages/store/detail', { id: 'NOPE' }); await tick(); assert.equal(pg.data.sys, 'failed');
});

// ---------- 附近门店页 ----------
test('附近门店页：前 2 家标准卡、第 3 位考拉E存卡、其余紧凑卡；分页；排序条；免费运输筛选', async () => {
  fresh(NEED, true); const pg = env.newPage('pages/stores/index', {}); await tick();
  assert.deepEqual(pg.data.items.slice(0, 5).map((x) => x.type + ':' + (x.variant || '')), ['store:standard', 'store:standard', 'estore:', 'store:compact', 'store:compact']);
  assert.equal(pg.data.items.filter((x) => x.type === 'store').length, 10); assert.equal(pg.data.resultText, '共28家门店 · 已显示前10家'); assert.equal(pg.data.hasMore, true);
  pg.onMore(); assert.equal(pg.data.shown, 20); pg.onMore(); assert.equal(pg.data.shown, 28); assert.equal(pg.data.hasMore, false); assert.equal(pg.data.resultText, '共28家门店');
  // 排序：先选中，确定后生效
  pg.onSheet(tap({ k: 'sort' })); assert.deepEqual(pg.data.sortOptions.map((o) => [o.t, o.on]), [['综合排序', true], ['距离优先', false], ['价格优先', false]]);
  pg.onOption(tap({ v: 'price' })); assert.equal(pg.data.sort, 'recommended'); pg.onSheetConfirm(); await tick();
  assert.equal(pg.data.sort, 'price'); assert.equal(pg.data.sortLabel, '价格优先'); assert.equal(pg.data.sheet, '');
  const amounts = pg.data.items.filter((x) => x.type === 'store' && x.card.row).map((x) => x.card.row.price.amount);
  assert.deepEqual(amounts, amounts.slice().sort((a, b) => a - b));
  pg.onSheet(tap({ k: 'distance' })); pg.onOption(tap({ v: 3 })); pg.onSheetConfirm(); await tick();
  assert.equal(pg.data.distLabel, '3km内'); assert.equal(pg.data.total, 2); assert.equal(pg.data.items[pg.data.items.length - 1].type, 'estore', '不足 3 家时 E存卡放在最后');
  pg.onClearFilters(); await tick(); assert.equal(pg.data.total, 28); assert.equal(pg.data.sortLabel, '排序');
  // 免费运输：没有用仓位置时不置为选中，打开面板并说明；选定后自动应用
  pg.onFilterFree(); assert.equal(pg.data.freeTransport, false); assert.equal(pg.data.panel, true); assert.equal(pg.data.panelNote, '免费运输按用仓位置到门店的距离判断，请先选择用仓位置。');
  state.setLocation({ kind: 'district', label: '朝阳区' }); pg.onLocationChange(); await tick();
  assert.equal(pg.data.freeTransport, true); assert.equal(pg.data.cityText, '朝阳区'); assert.ok(pg.data.resultText.indexOf('朝阳区 · 共') === 0);
  assert.ok(pg.data.items.filter((x) => x.type === 'store').every((x) => x.card.km >= 5 && x.card.district === '朝阳区'));
  // 30m³ 及以上：不出列表
  fresh({ capacity_m3: 31, input_unit: 'm3', input_value: 31, term_months: 12 }, true); const sp = env.newPage('pages/stores/index', {}); await tick();
  assert.equal(sp.data.mode, 'sales'); assert.equal(sp.data.items.length, 0);
  // 无匹配页：门店按浏览卡显示
  fresh({ capacity_m3: 29.5, input_unit: 'm3', input_value: 29.5, term_months: 6 }, true); const np = env.newPage('pages/stores/index', {}); await tick();
  assert.equal(np.data.noMatch, true); assert.equal(np.data.resultText, '可先浏览附近门店'); assert.ok(np.data.items.every((x) => x.type === 'store' && !x.card.row));
  assert.deepEqual(np.data.items.slice(0, 3).map((x) => x.variant), ['plain', 'plain', 'compact']);
});

// ---------- 修改需求 ----------
test('修改需求弹层：按原单位打开；更新写回全站需求；非法输入报错；30m³ 及以上交顾问不写入', () => {
  fresh({ capacity_m3: 4.8, input_unit: 'm2', input_value: 2, term_months: 6, source: 'manual' }, false);
  const c = env.newComponent('components/mk-demand-sheet/index', {}); c.setData({ visible: true });
  assert.deepEqual([c.data.unit, c.data.raw, c.data.term, c.data.approx, c.data.title, c.data.submitText], ['m2', '2', 6, '约 4.8 m³', '修改需求', '更新推荐']);
  c.onUnit(tap({ u: 'm3' })); assert.equal(c.data.raw, ''); c.onSubmit(); assert.equal(c.data.error, '请填写不小于 0.5m³ 的容量，最多两位小数'); assert.equal(state.get().requirement.capacity_m3, 4.8);
  c.onInput({ detail: { value: '5' } }); c.onTerm({ detail: { months: 12 } }); c.onSubmit();
  assert.deepEqual(state.get().requirement, { term_months: 12, source: 'manual', capacity_m3: 5, input_unit: 'm3', input_value: 5 });
  assert.deepEqual(c.events.map((e) => e.name), ['change', 'close']);
  c.events.length = 0; c.onInput({ detail: { value: '30' } }); c.onSubmit();
  assert.deepEqual(c.events.map((e) => [e.name, e.detail && e.detail.capacity_m3]), [['sales', 30], ['close', undefined]]); assert.equal(state.get().requirement.capacity_m3, 5);
  c.onUnit(tap({ u: 'm2' })); c.onInput({ detail: { value: '201' } }); c.onSubmit(); assert.equal(c.data.error, '请填写 0.2–200㎡ 的面积，最多一位小数');
  // 没有需求时是「填写需求」
  fresh(null, false); const cold = env.newComponent('components/mk-demand-sheet/index', { cold: true, rangeNote: true }); cold.setData({ visible: true });
  assert.deepEqual([cold.data.title, cold.data.submitText, cold.data.raw, cold.data.term, cold.data.note], ['填写需求', '查看推荐', '', 12, '可填 0.5m³–200㎡，估算值，以实际仓位为准']);
});
test('仓位推荐页：修改需求后刷新；物品估算的说明句与长件句；费用明细取报价接口', async () => {
  fresh({ capacity_m3: 3.4, input_unit: 'm3', input_value: 3.4, term_months: 6, source: 'items', est: { rec: 3.4, netText: '2.1', kinds: 3, count: 6, long: ['三人位沙发'], tiny: false } }, true);
  const pg = env.newPage('pages/match/index', {}); await tick();
  assert.equal(pg.data.estText, '按物品估算：物品约 2.1m³，留出码放空隙后建议 3.4m³。下方是不小于 3.4m³ 的仓位。'); assert.equal(pg.data.longText, '清单含长件（三人位沙发），请对照仓位的长宽高。');
  assert.equal(pg.data.title, '为您推荐 2 家门店'); assert.equal(pg.data.cards[0].lines[1].reason, '需求约占 3.5m³ 仓的 97%，大一档更好放');
  assert.equal(pg.data.locText, '北京 · 全城门店');
  pg.onFees({ detail: { storeId: 'SIM_BJ01', unitId: 'SIM_BJ01_U03' } }); await tick();
  assert.equal(pg.data.feesVisible, true); assert.equal(pg.data.fees.payable, '¥2,010');
  assert.deepEqual(pg.data.fees.rows.map((r) => [r.k, r.v]), [['整期租金', '¥1,680'], ['已省', '¥720'], ['优惠券', '暂无适用优惠'], ['押金', '¥280'], ['整单管理费', '¥50']]);
  assert.equal(pg.data.fees.rows[0].note, '¥280/月 × 6个月'); assert.equal(pg.data.fees.rows[1].sub, '较月基价 ¥400/月');
  state.setRequirement({ capacity_m3: 4.8, input_unit: 'm2', input_value: 2, source: 'manual', term_months: 6 }); pg.onDemandChange(); await tick();
  assert.deepEqual([pg.data.capNum, pg.data.capUnit, pg.data.capApprox, pg.data.estText], ['2', '㎡', '约4.8m³', '']);
  // 未登录不取费用明细
  fresh(NEED, false); const g = env.newPage('pages/match/index', {}); await tick(); g.onFees({ detail: { storeId: 'SIM_BJ01', unitId: 'SIM_BJ01_U03' } }); await tick(); assert.equal(g.data.feesVisible, false);
  assert.equal(g.data.cards[0].lines[0].cta, '查看报价');
});

// ---------- 按物品估算 ----------
test('物品目录：39 项、七个分类、六个场景；目录清理落在数据上', async () => {
  const cat = await api.getItemCatalog();
  assert.equal(cat.items.length, 39); assert.deepEqual(cat.categories.map((c) => c.name), ['箱包', '家具', '家电', '纸箱收纳', '收藏乐器', '商家货品', '办公物资']);
  assert.deepEqual(cat.scenes.map((s) => s.name), ['搬家装修', '家庭闲置', '行李寄存', '爱好收藏', '商家备货', '办公存储']);
  const by = {}; cat.items.forEach((x) => { by[x.id] = x; });
  assert.ok(!by.winebox); assert.equal(by.chair.name, '餐椅'); assert.equal(by.dining.name, '餐桌 / 小桌'); assert.ok(!by.chair.variants.some((v) => v.id === 'office'));
  assert.equal(by.stroller.category, 'furniture'); assert.equal(by.box.description, '约 60×40×40cm'); assert.equal(by.box.unit, 'box'); assert.equal(by.sofa3.unit, 'piece');
  assert.equal(cat.items.filter((x) => x.long).length, 8, '目录里 8 种长件');
  assert.ok(cat.scenes.every((s) => s.items.every((id) => by[id])));
});
test('按物品估算页：数量、规格、清单、长件、租期、提交；不足 0.5m³ 与达到 30m³', async () => {
  fresh(null, false); const pg = env.newPage('pkg-estimate/items/index', {}); await tick();
  assert.equal(pg.data.sys, ''); assert.equal(pg.data.listCount, '39项'); assert.equal(pg.data.btnOff, true); assert.equal(pg.data.btnText, '请先选物品'); assert.equal(pg.data.footTop, '还没有选择物品');
  assert.deepEqual(pg.data.rail.map((x) => x.name), ['全部物品', '箱包', '家具', '家电', '纸箱收纳', '收藏乐器', '商家货品', '办公物资']);
  const step = (id, d) => pg.onStep(tap({ id, d }));
  step('box', 'plus'); assert.equal(pg.data.footBig, '按 0.5m³ 匹配'); assert.equal(pg.data.estNote, '物品约 0.1m³，小于最小仓位，按 0.5m³ 为您匹配。');
  step('box', 'plus'); step('box', 'plus'); step('luggage28', 'plus'); step('luggage28', 'plus'); step('sofa3', 'plus');
  assert.equal(pg.data.footTop, '物品约 2.1m³ · 6 件'); assert.equal(pg.data.footBig, '建议 3.4m³'); assert.equal(pg.data.selectedText, '已选 3 种、6 件 · 查看清单 ›');
  assert.equal(pg.data.longHint, '含长件：三人位沙发。选仓时请对照仓位的长宽高。'); assert.equal(pg.data.estNote, '物品约 2.1m³，留出码放空隙后建议 3.4m³。估算值，以实际仓位为准。');
  assert.ok(!/装载系数/.test(JSON.stringify(pg.data)));
  const sofa = pg.data.rows.find((r) => r.id === 'sofa3'); assert.deepEqual([sofa.variantText, sofa.per, sofa.sub, sofa.n], ['规格 · 三人位', '约 1.6m³/件', '小计 1.6m³', 1]);
  assert.equal(pg.data.rows.find((r) => r.id === 'box').per, '约 0.1m³/箱');
  // 清单抽屉
  assert.equal(pg.data.cartTitle, '已选物品（3种，共6件）'); assert.equal(pg.data.cartTotal, '3.4m³'); assert.equal(pg.data.cartTotalSub, '物品合计约 2.1m³，留出码放空隙后的建议值');
  assert.deepEqual(pg.data.cartRows.map((r) => r.line).sort(), ['28寸 · 2件 · 约0.2m³', '三人位 · 1件 · 约1.6m³', '标准箱 · 3件 · 约0.3m³'].sort());
  // 规格：换规格数量不变
  pg.onVariant(tap({ id: 'sofa3' })); assert.equal(pg.data.variantVisible, true); assert.deepEqual(pg.data.variantOptions.map((o) => [o.name, o.per, o.on]), [['三人位', '约 1.6m³/件', true], ['双人位', '约 1.15m³/件', false], ['单人', '约 0.6m³/件', false]]);
  pg.onPickVariant(tap({ v: 'single' })); assert.equal(pg.data.rows.find((r) => r.id === 'sofa3').n, 1); assert.equal(pg.data.rows.find((r) => r.id === 'sofa3').sub, '小计 0.6m³');
  pg.onVariant(tap({ id: 'sofa3' })); pg.onPickVariant(tap({ v: 'std' }));
  // 数量：点数字直接输入，上限 999，超限「确定」不可点
  pg.onQty(tap({ id: 'box' })); assert.deepEqual([pg.data.qtyVisible, pg.data.qtyName, pg.data.qtyRaw], [true, '标准纸箱', '3']);
  pg.onQtyInput({ detail: { value: '1200' } }); assert.equal(pg.data.qtyBad, true); assert.equal(pg.data.qtyErr, '单种物品最多填 999 件，更多请交给顾问配仓'); pg.onQtyOk(); assert.equal(pg.data.qtyVisible, true);
  pg.onQtyQuick(tap({ n: 20 })); assert.equal(pg.data.qtyBad, false); pg.onQtyOk(); assert.equal(pg.data.qtyVisible, false); assert.equal(pg.data.rows.find((r) => r.id === 'box').n, 20);
  pg.onQty(tap({ id: 'box' })); pg.onQtyInput({ detail: { value: '3' } }); pg.onQtyOk();
  // 分类、场景、搜索
  pg.onCat(tap({ id: 'business' })); assert.deepEqual([pg.data.listTitle, pg.data.listCount, pg.data.bizGuide], ['商家货品', '6项', true]);
  pg.onMode(tap({ m: 'scenes' })); assert.deepEqual([pg.data.listTitle, pg.data.listCount, pg.data.sceneDesc, pg.data.bizGuide], ['搬家装修', '12项', '搬家或装修时常见的家具、家电与收纳用品', false]);
  pg.onMode(tap({ m: 'items' })); pg.onSearchInput({ detail: { value: '沙发' } }); assert.equal(pg.data.listTitle, '搜索结果'); assert.ok(pg.data.rows.length >= 1 && pg.data.rows.every((r) => /沙发/.test(r.name + r.variantText)));
  pg.onSearchInput({ detail: { value: '钢琴' } }); assert.equal(pg.data.emptySearch, true); assert.equal(pg.data.rows.length, 0);
  pg.onResetSearch(); assert.equal(pg.data.listCount, '39项');
  // 租期与提交
  pg.onTerm({ detail: { months: 6 } }); assert.equal(pg.data.term, 6);
  env.nav.length = 0; pg.onSubmit();
  const r = state.get().requirement;
  assert.deepEqual([r.capacity_m3, r.input_unit, r.source, r.term_months, r.est.netText, r.est.kinds, r.est.count], [3.4, 'm3', 'items', 6, '2.1', 3, 6]); assert.deepEqual(r.est.long, ['三人位沙发']);
  assert.deepEqual(env.nav, [{ kind: 'navigateTo', url: routes.MATCH }]);
  // 草稿两页共用：填容量页带出「按物品估算 3.4m³ · 3 种 6 件」；手改后可恢复
  const cap = env.newPage('pages/estimate/capacity', {}); await tick();
  assert.deepEqual([cap.data.raw, cap.data.src, cap.data.srcText, cap.data.term], ['3.4', 'items', '按物品估算 3.4m³ · 3 种 6 件', 6]);
  cap.onInput({ detail: { value: '5' } }); assert.deepEqual([cap.data.src, cap.data.srcText], ['edited', '已改为手动填写 · 物品估算为 3.4m³']); assert.equal(state.get().draft.items.length, 3, '清单保留');
  cap.onRestore(); assert.deepEqual([cap.data.raw, cap.data.src], ['3.4', 'items']);
  // 回到物品页：清单带回
  const again = env.newPage('pkg-estimate/items/index', {}); await tick(); assert.equal(again.data.footTop, '物品约 2.1m³ · 6 件'); assert.equal(again.data.term, 6);
  // 清空
  again.onClear(); assert.equal(again.data.btnOff, true); assert.deepEqual(state.get().draft.items, []); assert.equal(state.get().draft.source, 'manual');
  // 不足 0.5m³：按 0.5m³ 匹配，不拦截
  again.onStep(tap({ id: 'box', d: 'plus' })); assert.equal(again.data.btnOff, false); env.nav.length = 0; again.onSubmit(); assert.equal(state.get().requirement.capacity_m3, 0.5); assert.equal(state.get().requirement.est.tiny, true);
  // 超过 15m³：清单抽屉加顾问提示；达到 30m³（含超过 200m³）：主按钮「提交给顾问」，不写入自助需求
  const big = env.newPage('pkg-estimate/items/index', {}); await tick(); big.onClear();
  big.setCount('sofa3', 2); big.setCount('bed180', 2); big.setCount('wardrobe', 2); big.setCount('fridge', 1); big.setCount('washer', 1); big.setCount('box', 40);
  assert.equal(big.data.footBig, '建议 19.6m³'); assert.equal(big.data.cartAdvHint, true); assert.equal(big.data.btnText, '查看仓位报价');
  big.setCount('pallet', 90); big.setCount('goodsbox', 200);
  assert.equal(big.data.btnText, '提交给顾问'); assert.equal(big.data.showTerm, false); assert.equal(big.data.cartAdvHint, false);
  state.set('requirement', null); env.nav.length = 0; big.onSubmit(); assert.equal(state.get().requirement, null); assert.ok(env.nav[0].url.indexOf(routes.BOOKING + '?mode=advisor&cap=') === 0);
});
test('填容量页：空间参考卡、顾问提示、AI 占位、加减、底栏摘要', async () => {
  fresh(null, false); const pg = env.newPage('pages/estimate/capacity', {}); await tick();
  assert.equal(pg.data.sys, ''); assert.equal(pg.data.ref, null); assert.deepEqual([pg.data.sumCap, pg.data.sumTerm, pg.data.needText], ['—', ' · 12个月', '还需填写容量']);
  pg.onQuick(tap({ v: 3 })); assert.equal(pg.data.ref.range, '1.5–5m³ 大致能放'); assert.equal(pg.data.ref.title, '适合日常闲置与小件家具'); assert.equal(pg.data.cartons, '全放标准纸箱约 25 箱');
  assert.equal(pg.data.quick.find((q) => q.v === 3).on, true); assert.deepEqual([pg.data.sumCap, pg.data.needText, pg.data.submitText], ['3m³', '', '查看仓位报价']);
  pg.onStep(tap({ dir: 'plus' })); assert.equal(pg.data.raw, '3.5'); pg.onStep(tap({ dir: 'minus' })); pg.onStep(tap({ dir: 'minus' })); assert.equal(pg.data.raw, '2.5');
  pg.onInput({ detail: { value: '0.5' } }); assert.equal(pg.data.canMinus, false); pg.onStep(tap({ dir: 'minus' })); assert.equal(pg.data.raw, '0.5');
  pg.onInput({ detail: { value: '1' } }); assert.equal(pg.data.ref.range, '1.5m³ 以内 大致能放');
  pg.onInput({ detail: { value: '20' } }); assert.equal(pg.data.advise, true); assert.equal(pg.data.sales, false);
  pg.onInput({ detail: { value: '60' } }); assert.deepEqual([pg.data.sales, pg.data.advise, pg.data.ref.range, pg.data.sumTerm, pg.data.submitText], [true, false, '50m³ 以上 大致能放', ' · 由顾问配仓', '提交给顾问']);
  pg.onInput({ detail: { value: '260' } }); assert.equal(pg.data.sales, true); assert.equal(pg.data.error, '', '超过 200m³ 不报错，交顾问');
  pg.onInput({ detail: { value: '0.3' } }); assert.deepEqual([pg.data.needText, pg.data.needErr], ['还需修改容量', true]);
  pg.onUnit(tap({ u: 'm2' })); pg.onInput({ detail: { value: '0.1' } }); assert.equal(pg.data.needText, '还需修改面积');
  pg.onInput({ detail: { value: '120' } }); assert.equal(pg.data.sales, true); assert.equal(pg.data.approx, '约 288 m³');
  const toasts = []; const st = wx.showToast; wx.showToast = (o) => toasts.push(o.title); pg.onAi(); wx.showToast = st;
  assert.deepEqual(toasts, ['AI 估算暂未开放，可按物品估算或直接填写容量']);
});

// ---------- 定位、无门店城市、用仓位置面板 ----------
test('定位：成功后解析城市与区域；定位城市没有门店时保持北京并记下原城市（D-184）', async () => {
  fresh(null, false);
  assert.equal(await location.request(), 'granted');
  let loc = state.get().location;
  assert.deepEqual([loc.city, loc.kind, loc.label, loc.noStoreCity, loc.status], ['北京', 'point', '朝阳区 安贞附近', '', 'granted']); assert.equal(state.get().recents.length, 0, '定位点不进「最近使用」');
  fresh(null, false);
  await withLocation((o) => o.success({ latitude: 30.57, longitude: 104.07 }), async () => {
    assert.equal(await location.request(), 'granted'); loc = state.get().location;
    assert.deepEqual([loc.city, loc.kind, loc.noStoreCity], ['北京', 'city', '成都']);
    const home = env.newPage('pages/home/index', {}); await tick();
    assert.equal(home.data.nocity, '成都暂无门店，已为您显示北京门店'); assert.equal(home.data.city, '北京');
    assert.ok(home.data.cards.length === 3 && home.data.cards.every((c) => c.kmText === ''), '无门店城市：推荐卡不显示公里数');
    const list = finder.buildList(BJS, pd.ctx()); assert.ok(list.cards.every((c) => c.kmText === '' && c.freeTransportTag === ''));
    home.onCloseNocity(); assert.equal(home.data.nocity, '');
    const again = env.newPage('pages/home/index', {}); await tick(); assert.equal(again.data.nocity, '', '关闭后本次启动不再出现');
    getApp().globalData.find = null; const sp = env.newPage('pages/stores/index', {}); await tick(); assert.equal(sp.data.nocity, '成都暂无门店，已为您显示北京门店');
    sp.onSwitchCity(); assert.equal(sp.data.panel, true); assert.equal(sp.data.nocity, '');
    state.setLocation({ city: '上海', kind: 'city', label: '', noStoreCity: '' }); sp.onLocationChange(); await tick(); assert.equal(state.get().location.noStoreCity, ''); assert.equal(sp.data.cityText, '上海');
  });
});
test('定位被拒：位置授权被拒后不再调用 wx.getLocation，只引导去设置页；隐私弹窗被拒可再点一次；系统关闭与超时各有文案', async () => {
  let n = 0;
  fresh(null, false);
  await withLocation((o) => { n++; o.fail({ errMsg: 'getLocation:fail auth deny' }); }, async () => {
    assert.equal(await location.requestOnce(), 'denied'); assert.equal(n, 1);
    assert.deepEqual(location.hint(), { text: '开启定位，查看离您近的门店', action: '去开启', kind: 'setting' }); assert.equal(location.needSetting(), true);
    const modals = []; const sm = wx.showModal; wx.showModal = (o) => { modals.push(o.title + '|' + o.confirmText); o.success({ confirm: false }); };
    assert.equal(await location.act('setting'), 'denied'); assert.equal(n, 1, '「暂不开启」：不调定位、不去设置页');
    wx.showModal = sm; assert.deepEqual(modals, ['开启位置权限|去设置']);
    env.mode = 'fail'; assert.equal(await location.act('setting'), 'denied'); assert.equal(n, 1, '设置页里没有打开授权：仍不调用定位');
    env.mode = 'ok'; assert.equal(await location.requestOnce(), 'denied'); assert.equal(n, 1, '首页不再自动申请');
  });
  fresh(null, false);
  await withLocation((o) => o.fail({ errMsg: 'getLocation:fail privacy permission is not authorized', errno: 104 }), async () => {
    assert.equal(await location.request(), 'denied'); assert.deepEqual([location.hint().action, location.hint().kind], ['开启', 'retry']); assert.equal(location.needSetting(), false);
  });
  await withLocation((o) => o.fail({ errMsg: 'getLocation:fail system permission denied' }), async () => { assert.equal(await location.request(), 'system_off'); assert.deepEqual(location.hint(), { text: '手机定位未开启', action: '查看方法', kind: 'system' }); });
  await withLocation((o) => o.fail({ errMsg: 'getLocation:fail timeout' }), async () => { assert.equal(await location.request(), 'timeout'); assert.deepEqual(location.hint(), { text: '暂未获取到位置', action: '重试', kind: 'retry' }); });
  // 首页：未定位时城市位有圆点，气泡每次启动最多一次
  fresh(null, false); env.mode = 'fail';
  const home = env.newPage('pages/home/index', {}); await tick();
  assert.equal(home.data.located, false); assert.equal(home.data.bubble.action, '去开启'); home.hideBubble(); assert.equal(home.data.bubble, null);
  const sp = env.newPage('pages/stores/index', {}); await tick(); assert.equal(sp.data.bubble, null, '同一次启动里门店列表不再弹'); assert.equal(sp.data.located, false);
  assert.equal(sp.data.items.length > 0, true, '定位不可用时列表照常');
  env.mode = 'ok';
});
test('用仓位置面板：城市 / 区域 / 商圈带门店数；搜索分两组；无结果三个出口；选定后全站同一份', async () => {
  fresh(null, false); const c = env.newComponent('components/mk-location-panel/index', {}); c.setData({ visible: true }); await tick();
  assert.deepEqual(c.data.cities.map((x) => x.name), ['北京', '上海', '杭州', '广州', '深圳']); assert.equal(c.data.cities[0].on, true);
  assert.deepEqual(c.data.districts.slice(0, 2), [{ name: '朝阳区', count: 9, on: false }, { name: '西城区', count: 4, on: false }]);
  assert.equal(c.data.areas.length, CF.panel.areaChipsDefault); assert.equal(c.data.areaMore, '全部 24 个商圈'); assert.equal(c.data.byDistrict, '北京 · 按区域');
  c.onAllAreas(); assert.equal(c.data.areas.length, 24); assert.equal(c.data.areaMore, '');
  assert.deepEqual([c.data.located, c.data.locateAction], [false, '开启']);
  c.onInput({ detail: { value: '望京' } });
  assert.deepEqual(c.data.resAreas.map((x) => [x.name, x.sub]), [['望京', '商圈 · 2 家门店']]); assert.deepEqual(c.data.resStores.map((x) => x.name).sort(), ['望京·朝庭公寓店', '望京3号院店'].sort());
  c.onInput({ detail: { value: '朝阳' } }); assert.deepEqual(c.data.resAreas.map((x) => [x.kind, x.sub]), [['district', '区域 · 9 家门店']]); assert.equal(c.data.resStores.length, CF.panel.searchStoreMax);
  c.onInput({ detail: { value: '天通苑' } });
  assert.deepEqual([c.data.none, c.data.noneTitle, c.data.noneAreas.length, c.data.noneAreasTitle], [true, '没有找到「天通苑」相关的门店或商圈', 8, '北京 · 有门店的商圈']);
  env.nav.length = 0; c.onEstore(); c.onLeave(); assert.deepEqual(env.nav.map((x) => x.url), [routes.ESTORE, routes.BOOKING + '?mode=advisor']);
  c.onClearQuery(); assert.equal(c.data.searching, false);
  c.events.length = 0; c.onPick(tap({ kind: 'area', name: '望京' }));
  assert.deepEqual([state.get().location.kind, state.get().location.label, state.get().location.city], ['area', '望京', '北京']); assert.deepEqual(c.events.map((e) => e.name), ['change', 'close']);
  assert.deepEqual(state.get().recents, [{ city: '北京', kind: 'area', label: '望京' }]);
  c.setData({ visible: true }); await tick(); assert.equal(c.data.areas.find((x) => x.name === '望京').on, true); assert.equal(c.data.cities[0].on, false);
  c.onInput({ detail: { value: '富仁' } }); c.onStorePick(tap({ id: 'SIM_BJ01' })); assert.deepEqual([state.get().location.kind, state.get().location.label], ['store', '安贞·富仁名苑店']);
  assert.equal(finder.buildList(BJS, pd.ctx()).cards[0].id, 'SIM_BJ01');
  c.setData({ visible: true }); await tick(); assert.deepEqual(c.data.recents.map((x) => x.label), ['安贞·富仁名苑店', '望京']);
  c.onRecent(tap({ i: 1 })); assert.equal(state.get().location.label, '望京');
  c.onCity(tap({ city: '上海' })); assert.deepEqual([state.get().location.city, state.get().location.kind, state.get().location.label], ['上海', 'city', '']);
  c.onClearRecents(); assert.deepEqual(state.get().recents, []);
  // 开启定位成功：用仓位置切到定位点
  c.setData({ visible: true }); await tick(); c.onLocate(); await tick(); assert.deepEqual([state.get().location.kind, state.get().location.label, state.get().location.city], ['point', '朝阳区 安贞附近', '北京']);
});

// ---------- 首页与需求卡 ----------
test('需求卡：没有需求不渲染；按面积填的需求写「预计面积 · 约X m³」；首页版式跟随订单任务卡', async () => {
  fresh(null, false); const c = env.newComponent('components/mk-need-card/index', {}); assert.equal(c.data.has, false);
  state.setRequirement({ capacity_m3: 3.5, input_unit: 'm3', input_value: 3.5, term_months: 6 });
  assert.deepEqual([c.data.has, c.data.capNum, c.data.capUnit, c.data.capLabel, c.data.termNum, c.data.stripText], [true, '3.5', 'm³', '预计容量', '6', '3.5m³ · 6个月，查看推荐仓位'], '需求变化时自己刷新');
  state.setRequirement({ capacity_m3: 4.8, input_unit: 'm2', input_value: 2, term_months: 6 });
  assert.deepEqual([c.data.capNum, c.data.capUnit, c.data.capLabel, c.data.stripText], ['2', '㎡', '预计面积 · 约4.8m³', '2㎡ · 约4.8m³ · 6个月']);
  assert.ok(!/2\.4|层高/.test(JSON.stringify(c.data)));
  env.nav.length = 0; c.onView(); c.onModify(); assert.deepEqual(env.nav.map((x) => x.url), [routes.MATCH, routes.CAPACITY]);
  state.set('requirement', null); assert.equal(c.data.has, false); c.__detach();
  assert.deepEqual(finder.layoutOf(''), { hasMain: false, weak: false, noRec: false, collapse: false });
  assert.deepEqual(finder.layoutOf('pending'), { hasMain: true, weak: true, noRec: false, collapse: true });
  assert.deepEqual(finder.layoutOf('active'), { hasMain: true, weak: true, noRec: true, collapse: false });
  assert.deepEqual(finder.layoutOf('refund'), { hasMain: true, weak: false, noRec: false, collapse: false });
  // 首页：未登录时需求卡照常；登录且有服务中的订单时由任务卡的待办条带承担，需求卡不重复
  fresh(NEED, false); let home = env.newPage('pages/home/index', {}); await tick(30);
  assert.deepEqual([home.data.needMode, home.data.weak, home.data.showRail, home.data.estimated], ['card', false, true, true]);
  fresh(NEED, true); home = env.newPage('pages/home/index', {}); await tick(30);
  assert.deepEqual([home.data.needMode, home.data.weak, home.data.noRec, home.data.showRail], ['hidden', true, true, false], '演示订单里有租用中的订单');
  assert.equal(home.data.sys, ''); assert.equal(typeof home.data.unread, 'number');
  env.nav.length = 0; home.onSearch(); assert.deepEqual([home.data.panel, home.data.panelFocus], [true, true]); home.onScene(tap({ i: 2 })); assert.equal(env.nav[0].url, routes.CAPACITY + '?scene=2');
  // 从「搬家过渡」场景进入后，用仓位置面板带搬家提示
  const p0 = env.newComponent('components/mk-location-panel/index', {}); p0.setData({ visible: true }); await tick(); assert.equal(p0.data.showMove, false);
  home.onScene(tap({ i: 0 })); p0.setData({ visible: true }); await tick(); assert.equal(p0.data.showMove, true);
  state.setLocation({ kind: 'district', label: '朝阳区' }); home.onLocationChange(); await tick(); assert.equal(home.data.city, '朝阳区', '选了区域后城市位显示该区域');
});
