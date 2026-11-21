// FIX-01 找仓域：匹配容差与容量上限、门店列表认组合方案、没有起点不给距离、估算完回出发页、修改需求弹层的估算入口、
// 顾问卡文案、冗余说明句清理、门店图与仓位图、转发。
// 在假的 wx 环境里跑，验证的是代码逻辑与跳转去向，不是微信真实渲染。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), routes = R('services/routes'), api = R('services/api'), finder = R('services/finder'), media = R('services/media'), flow = R('services/estimate-flow'), share = R('services/share');
const scenarios = R('mock/scenarios'), demo = R('services/demo');
const T = R('i18n/find'), Z = R('i18n/zh'), C = R('core/config'), CF = R('core/config-find'), auth = R('services/auth');
env.loadApp();
const NEED = { capacity_m3: 3.5, input_unit: 'm3', input_value: 3.5, term_months: 6 };
const need = (cap, extra) => Object.assign({}, NEED, { capacity_m3: cap, input_value: cap }, extra || {});
const fresh = (n, loggedIn, located) => {
  state.reset(); env.nav.length = 0; env.stack.length = 0; env.mode = 'ok'; getApp().globalData.find = null;
  scenarios.write({ scenario: '', stock: 'normal', events: {}, net: 'instant' });
  if (n) state.set('requirement', n);
  if (loggedIn) state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
  if (located !== false) state.patch('location', { status: 'granted' });
};
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 15));
const tap = (dataset) => ({ currentTarget: { dataset } });
const LOC = { city: '北京', kind: 'city', label: '', status: 'granted', noStoreCity: '' };
const ctx = (n, loggedIn, loc) => ({ requirement: n, location: loc || LOC, loggedIn: !!loggedIn });
let BJS;
test.before(async () => { fresh(); BJS = await api.getStores({ city: '北京' }); });

test('R-10 门店列表认组合方案：同一需求下，列表前两家与仓位推荐前两家是同一批门店、同一个方案', () => {
  for (const cap of [3.5, 3.8, 9, 15]) {
    const l = finder.buildList(BJS, ctx(need(cap), true)), m = finder.buildMatch(BJS, ctx(need(cap), true));
    assert.deepEqual(l.cards.slice(0, 2).map((c) => [c.id, c.row.id]), m.cards.map((c) => [c.id, c.lines[0].id]), 'cap=' + cap);
  }
  const l9 = finder.buildList(BJS, ctx(need(9), true));
  assert.equal(l9.cards[0].row.combo, true); assert.equal(l9.cards[0].listState, 'matched'); assert.equal(l9.cards[0].row.cta, '立即下单'); assert.equal(l9.cards[0].row.name, '组合仓 A003 + A005');
  // 全城只有「接近」的组合时，列表与推荐同样一致（都写明差额）
  const l29 = finder.buildList(BJS, ctx(need(29), true)), m29 = finder.buildMatch(BJS, ctx(need(29), true));
  assert.equal(m29.mode, 'near'); assert.equal(l29.noMatch, false); assert.equal(l29.cards[0].listState, 'near'); assert.equal(l29.cards[0].nearText, '小 3m³'); assert.equal(l29.cards[0].row.cta, '查看仓位');
  assert.equal(l29.cards[0].id, m29.cards[0].id);
});

test('R-11 容量上限 130%：库存紧张时不再把大几倍的仓放进推荐；超上限的仓在门店详情单列「更大的仓位」', async () => {
  fresh(NEED, true); demo.setStock('tight');
  const stores = await api.getStores({ city: '北京' });
  const rows = (x) => x.cards.map((c) => (c.lines ? c.lines[0] : c.row)).filter(Boolean);
  const vol = (r) => Number(String(r.volText).replace('m³', ''));
  const m = finder.buildMatch(stores, ctx(NEED, true)), l = finder.buildList(stores, ctx(NEED, true));
  assert.ok(rows(m).length > 0); assert.ok(rows(m).concat(rows(l)).every((r) => vol(r) <= 3.5 * (1 + C.matching.maxOverRatio) + 1e-9), '推荐位里没有超过 4.55m³ 的仓');
  const d4 = stores.find((s) => s.id === 'SIM_BJ04'), only = d4.units.filter((u) => u.status === 'available');
  assert.deepEqual(only.map((u) => u.volume), [16]);
  const d = finder.buildStoreDetail(d4, ctx(NEED, true));
  assert.equal(d.situation, 'nomatch'); assert.equal(d.rows.length, 0); assert.deepEqual(d.over.map((r) => [r.name, r.cta, r.secondary]), [['D004 · 16m³', '立即下单', true]]);
  assert.equal(d.showLow, false, '无匹配时不出「仅剩 N 个可租」（A-21）'); assert.ok(d.card.lowText);
  assert.equal(finder.storeCard(d4, ctx(NEED, true)).emptyText, '该店暂无匹配仓位');
  demo.setStock('normal');
});

test('A-04 没有起点（未定位、只到城市）：不给公里数、不出免费运输标签、不标「距离最近」；选了区域或已定位才给', () => {
  const un = Object.assign({}, LOC, { status: 'unasked' });
  const l = finder.buildList(BJS, ctx(NEED, true, un)), m = finder.buildMatch(BJS, ctx(NEED, true, un));
  assert.ok(l.cards.every((c) => c.km === null && c.kmText === '' && c.freeTransportTag === '' && c.tags.every((t) => t.t !== T.card.freeTransport)));
  assert.ok(m.cards.every((c) => c.kmText === '' && c.rankTag !== T.card.first)); assert.equal(l.expanded, false);
  assert.ok(finder.buildList(BJS, ctx(NEED, true)).cards.some((c) => c.kmText));
  assert.ok(finder.buildList(BJS, ctx(NEED, true, Object.assign({}, un, { kind: 'district', label: '朝阳区' }))).cards.every((c) => c.kmText));
});

test('R-19 估算完回到出发页：附近门店、门店详情首次估算；出发页不在页面栈里时照旧去仓位推荐', async () => {
  // 附近门店（没有需求）→ 填容量 → 提交：退回附近门店，不去仓位推荐
  fresh(null, false); const sl = env.newPage('pages/stores/index', {}); await tick();
  sl.onEstimate(); assert.deepEqual(env.nav.pop(), { kind: 'navigateTo', url: routes.CAPACITY }); assert.equal(state.get().flags.estimateBack, routes.STORES);
  const cap = env.newPage('pages/estimate/capacity', {}); await tick(30); env.stack.length = 0; env.stack.push({ route: 'pages/stores/index' }, { route: 'pages/estimate/capacity' });
  cap.onInput({ detail: { value: '4' } }); env.nav.length = 0; cap.onSubmit();
  assert.equal(state.get().requirement.capacity_m3, 4); assert.equal(env.nav.length, 1); assert.equal(env.nav[0].kind, 'navigateBack'); assert.equal(state.get().flags.estimateBack, '');
  // 门店详情 → 填容量 → 按物品估算 → 物品页提交：一次退两页回门店详情
  fresh(null, false); const sd = env.newPage('pages/store/detail', { id: 'SIM_BJ01' }); await tick();
  sd.onEstimate(); assert.equal(state.get().flags.estimateBack, routes.STORE_DETAIL);
  env.stack.length = 0; env.stack.push({ route: 'pages/store/detail' }, { route: 'pages/estimate/capacity' }, { route: 'pkg-estimate/items/index' });
  let back = null; const nb = wx.navigateBack; wx.navigateBack = (o) => { back = o || {}; };
  assert.equal(flow.finish(), true); assert.equal(back.delta, 2); wx.navigateBack = nb;
  // 出发页已不在栈里（用户中途离开）：不拦，照旧去仓位推荐
  fresh(null, false); flow.start(routes.STORES); const c2 = env.newPage('pages/estimate/capacity', {}); await tick(30);
  env.stack.length = 0; env.stack.push({ route: 'pages/home/index' }, { route: 'pages/estimate/capacity' });
  c2.onInput({ detail: { value: '4' } }); env.nav.length = 0; c2.onSubmit(); assert.deepEqual(env.nav[0], { kind: 'redirectTo', url: routes.MATCH }); assert.equal(state.get().flags.estimateBack, '');
  // 已有需求：两页都在当前页开弹层改，不跳走
  fresh(NEED, false); const s2 = env.newPage('pages/stores/index', {}); await tick(); env.nav.length = 0; s2.onModify(); assert.equal(s2.data.demandSheet, true); assert.equal(env.nav.length, 0);
  const d2 = env.newPage('pages/store/detail', { id: 'SIM_BJ01' }); await tick(); env.nav.length = 0; d2.onModify(); assert.equal(d2.data.demandSheet, true); assert.equal(env.nav.length, 0);
  env.stack.length = 0;
});

test('R-19 修改需求弹层保留「按物品估算」「AI 估算」入口：物品估算完回到打开弹层的那一页', () => {
  fresh(NEED, false); env.stack.length = 0; env.stack.push({ route: 'pages/store/detail' });
  const c = env.newComponent('components/mk-demand-sheet/index', { visible: true }); c.open();
  const wxml = fs.readFileSync(path.join(root, 'components/mk-demand-sheet/index.wxml'), 'utf8'); assert.ok(/bindtap="onItems"/.test(wxml) && /bindtap="onAi"/.test(wxml));
  assert.deepEqual([c.data.T.byItems, c.data.T.ai, c.data.T.aiOff], ['按物品估算', 'AI 估算', '暂未开放']);
  env.nav.length = 0; c.onItems(); assert.deepEqual(env.nav[0], { kind: 'navigateTo', url: routes.ITEMS }); assert.equal(state.get().flags.estimateBack, routes.STORE_DETAIL); assert.ok(c.events.some((e) => e.name === 'close'));
  let toast = ''; const st = wx.showToast; wx.showToast = (o) => { toast = o.title; }; c.onAi(); wx.showToast = st; assert.equal(toast, T.demand.aiToast);
  env.stack.length = 0; flow.cancel();
});

test('R-20 / R-21 顾问卡与冗余说明：标题换新句、条件说明句删除；「可查看其他门店的仓位」等与按钮同义的句子删除', () => {
  assert.equal(T.advisor.big.title, '您的用仓需求有专属配仓方案哦');
  const big = finder.advisorFor(20, 0); assert.deepEqual(big, { title: '您的用仓需求有专属配仓方案哦', sub: '' });
  assert.ok(!/以上或整期满|可申请专属方案/.test(JSON.stringify(require('util').inspect(T, { depth: 6 })) + JSON.stringify(finder.buildList(BJS, ctx(need(20), true)).advisor)));
  assert.ok(/wx:if="\{\{sub\}\}"/.test(fs.readFileSync(path.join(root, 'components/mk-advisor-card/index.wxml'), 'utf8')), '说明句为空时不占位');
  assert.equal(T.detail.otherSub, undefined);
  const sd = fs.readFileSync(path.join(root, 'pages/store/detail.wxml'), 'utf8'); assert.ok(!/otherSub/.test(sd));
  assert.ok(!/可联系顾问协助|可先浏览附近门店|可调整容量或租期/.test(require('util').inspect(T, { depth: 6 })));
  // R-22：附近门店不再有「共 N 家门店 · 已显示前 N 家」
  assert.equal(T.stores.total, undefined); assert.equal(T.stores.shown, undefined);
});

test('门店图与仓位图：每家演示门店都有卡片图和头图文件；专属图 12 家，其余固定取共用实景图里的一套；仓位图按容量分 4 档', async () => {
  const all = R('mock/stores'), own = R('mock/media');
  assert.equal(own.length, 12); assert.equal(media.POOL.length, 6);
  const ex = (p) => fs.existsSync(path.join(root, p.replace(/^\//, '')));
  all.forEach((s) => { assert.ok(ex(media.storeCard(s)), s.id + ' card'); assert.ok(ex(media.storeHero(s)), s.id + ' hero'); assert.equal(path.dirname(media.storeCard(s)), path.dirname(media.storeHero(s)), '同一家店卡片图与头图同一套'); });
  assert.equal(media.storeCard({ id: 'SIM_BJ03' }), '/assets/images/stores/SIM-BJ03/card.webp');
  const pooled = all.filter((s) => !media.storeOwn(s.id)); assert.equal(pooled.length, all.length - 12);
  assert.ok(pooled.every((s) => /\/POOL-0[1-6]\//.test(media.storeCard(s)))); assert.ok(new Set(pooled.map((s) => media.storeDir(s.id))).size >= 5, '共用图轮着用，不是同一张');
  assert.equal(media.storeCard({ id: 'SIM_BJ10' }), media.storeCard({ id: 'SIM_BJ10' }));
  assert.equal(media.storeCard({ id: 'X', photo: 'https://cdn.example/x.jpg' }), 'https://cdn.example/x.jpg', '接口给了线上地址就用接口的');
  assert.deepEqual([0.8, 1.5, 1.6, 5, 5.1, 15, 15.1, 40].map((v) => path.basename(media.unitThumb({ volume: v }), '.webp')), ['mini', 'mini', 'small', 'small', 'medium', 'medium', 'large', 'large']);
  ['mini', 'small', 'medium', 'large'].forEach((k) => assert.ok(ex('/assets/images/units/' + k + '.webp')));
  // 门店详情：头图、仓位行与组合卡都带图；收藏、快捷下单同样
  fresh(need(9), true); const pg = env.newPage('pages/store/detail', { id: 'SIM_BJ10' }); await tick();
  assert.ok(/\/POOL-0[1-6]\/hero\.webp$/.test(pg.data.hero)); assert.ok(pg.data.blocks.filter((b) => b.type !== 'title' && b.type !== 'note' && b.type !== 'fold').every((b) => b.row.thumbs.length >= 1));
  const wxml = fs.readFileSync(path.join(root, 'pages/store/detail.wxml'), 'utf8'); assert.ok(/class="sd-uph"/.test(wxml) && !/sd-upic/.test(wxml)); // IMPL-01 M-11：空间示意图移到仓型分组标题，仓位行与组合行内不再放图
  state.set('favorites', { stores: ['SIM_BJ10'], units: ['SIM_BJ01_U03'] }); const fv = env.newPage('pkg-account/favorites/index', {}); await tick(30);
  assert.ok(ex(fv.data.stores[0].photo)); assert.equal(fv.data.units[0].thumb, '/assets/images/units/small.webp');
});

test('R-15 转发：找仓各页都定义了转发，路径不带个人信息；受限页与订单页不定义', () => {
  assert.deepEqual(share.message(routes.HOME), { title: Z.share.title, path: routes.HOME });
  assert.deepEqual(share.message(routes.STORE_DETAIL, { title: 'X店', query: 'id=1' }), { title: 'X店', path: routes.STORE_DETAIL + '?id=1' });
  const has = (p) => /onShareAppMessage\s*\(/.test(fs.readFileSync(path.join(root, p + '.js'), 'utf8'));
  ['pages/home/index', 'pages/stores/index', 'pages/store/detail', 'pages/match/index', 'pages/estimate/capacity', 'pkg-estimate/items/index'].forEach((p) => assert.ok(has(p), p));
  // 全工程：经登录守卫的页面一律不定义转发
  const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
  const pages = app.pages.concat(...(app.subpackages || []).map((sp) => sp.pages.map((p) => sp.root + '/' + p)));
  pages.filter((p) => auth.isRestricted('/' + p)).forEach((p) => assert.ok(!has(p), p + ' 是受限页，不应可转发'));
  assert.ok(pages.filter(has).length >= 12, '可转发页不少于 12 个');
});

test('附近门店：无匹配页满仓门店仍写「暂无可租仓位」；按面积填的需求条写「6㎡ · 约15m³」；首位门店离得远时写「已扩大范围」', async () => {
  fresh(need(35), true); demo.setStock('city_soldout'); let pg = env.newPage('pages/stores/index', {}); await tick(30);
  assert.equal(pg.data.noMatch, true); assert.ok(pg.data.items.filter((x) => x.type === 'store').every((x) => x.card.emptyText === '暂无可租仓位')); assert.equal(pg.data.largeNote, false, '空态卡已有「立即咨询」');
  demo.setStock('normal');
  fresh(need(15, { input_unit: 'm2', input_value: 6 }), true); pg = env.newPage('pages/stores/index', {}); await tick(30); assert.equal(pg.data.demandText, '6㎡ · 约15m³ · 租 6个月');
  const dp = env.newPage('pages/store/detail', { id: 'SIM_BJ01' }); await tick(); assert.equal(dp.data.demandText, '6㎡ · 约15m³ · 租 6个月');
  fresh(NEED, true); demo.setStock('nearby_soldout'); pg = env.newPage('pages/stores/index', {}); await tick(30);
  assert.equal(pg.data.resultText, T.stores.expanded); assert.ok(pg.data.items[0].card.km > CF.list.expandedKm);
  demo.setStock('normal');
});
