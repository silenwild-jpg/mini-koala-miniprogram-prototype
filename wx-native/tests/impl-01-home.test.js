// IMPL-01 首页域：首屏轮播主卡、入口卡、推荐卡角标、场景圆形图标、品牌区地标与资质配图、任务卡（M-05 与待办条带拆串）、跳转防连点。
// 在假的 wx 环境里跑，验证的是代码逻辑、文件约定与跳转去向，不是微信真实渲染（swiper 自动轮播、按压与渐显动效看不到）。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), routes = R('services/routes'), api = R('services/api'), finder = R('services/finder'), demo = R('services/demo'), scenarios = R('mock/scenarios');
const CF = R('core/config-find'), T = R('i18n/find'), TT = R('i18n/trade');
env.loadApp();
const NEED = { capacity_m3: 3.5, input_unit: 'm3', input_value: 3.5, term_months: 6 };
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 15));
const tap = (dataset) => ({ currentTarget: { dataset } });
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p.replace(/^\//, '')));
function fresh(need) {
  scenarios.write({ scenario: '', stock: 'normal', events: {}, net: 'instant' });
  state.reset(); env.nav.length = 0; env.mode = 'ok'; getApp().globalData.find = null;
  if (need) state.set('requirement', need);
}
const home = async () => { const pg = env.newPage('pages/home/index', {}); await tick(40); return pg; };
const BJ = { city: '北京', kind: 'city', label: '', status: 'granted', noStoreCity: '' };
let BJS;
test.before(async () => { BJS = (await api.getStores({ city: '北京' })).map((s) => Object.assign({}, s, { units: R('mock/units').filter((u) => u.store_id === s.id) })); });

test('轮播配置：三张，图在包里且每张不超过 60KB，跳转是 routes 里的常量；标题叠在图上不烧进图里', () => {
  const bs = CF.home.banners;
  assert.deepEqual(bs.map((b) => b.key), ['brand', 'estimate', 'estore']);
  for (const b of bs) {
    assert.ok(exists(b.image), b.image); assert.ok(fs.statSync(path.join(root, b.image)).size < 60 * 1024, b.key + ' 超过 60KB');
    assert.ok(/^\/assets\/images\/home\/banner\//.test(b.image)); assert.ok(routes[b.route], b.route); assert.ok(b.title && b.sub); assert.ok(b.tone === 'light' || b.tone === 'dark');
  }
  assert.equal(bs[0].title, '让城市生活更轻松'); assert.equal(bs[1].hideWithNeed, true);
  assert.ok(CF.home.bannerDurationMs >= 100 && CF.home.bannerDurationMs <= 300);
  const wxml = read('pages/home/index.wxml');
  assert.match(wxml, /<swiper class="hm-swiper" autoplay="\{\{bannerAuto\}\}" circular="\{\{true\}\}"/);
  assert.match(wxml, /hm-slide__t">\{\{item\.title\}\}/); assert.match(wxml, /class="hm-dots"/);
  assert.match(wxml, /class="mk-btn hm-findbtn"[^>]*>\{\{T\.home\.findBtn\}\}/, '下半部分是「找附近门店」+「查看门店」主按钮');
});

test('首页轮播：没有需求出三张；有需求时不出「估大小算价格」那一张和入口卡（M-04）；指示点跟随；点图跳转', async () => {
  fresh(); let pg = await home();
  assert.deepEqual(pg.data.banners.map((b) => b.key), ['brand', 'estimate', 'estore']); assert.equal(pg.data.estimated, false); assert.equal(pg.data.bannerIdx, 0);
  pg.onBannerChange({ detail: { current: 2 } }); assert.equal(pg.data.bannerIdx, 2);
  pg.onBannerChange({ detail: { current: 9 } }); assert.equal(pg.data.bannerIdx, 2, '越界不动');
  await pg.refresh(); assert.equal(pg.data.bannerIdx, 2, '张数没变时回到首页不跳回第一张');
  env.nav.length = 0; pg.onBanner(tap({ i: 0 })); assert.deepEqual(env.nav.map((x) => x.url), [routes.BRAND]);
  pg.onHide(); pg.onShow(); env.nav.length = 0; pg.onBanner(tap({ i: 2 })); assert.deepEqual(env.nav.map((x) => x.url), [routes.ESTORE]);
  pg.onUnload();
  fresh(NEED); pg = await home();
  assert.deepEqual(pg.data.banners.map((b) => b.key), ['brand', 'estore']); assert.equal(pg.data.estimated, true);
  assert.match(read('pages/home/index.wxml'), /wx:if="\{\{!estimated\}\}"[^>]*bindtap="onEstimate"/);
  env.nav.length = 0; pg.onBanner(tap({ i: 1 })); assert.equal(env.nav[0].url, routes.ESTORE, '下标按当前显示的几张算');
  pg.onUnload();
  // 中途加了需求再回到首页：轮播重设并回到第一张
  fresh(); pg = await home(); pg.onBannerChange({ detail: { current: 2 } }); state.set('requirement', NEED); pg.onHide(); pg.onShow(); await tick(30);
  assert.deepEqual([pg.data.banners.length, pg.data.bannerIdx], [2, 0]); pg.onUnload();
});

test('自动轮播只在首页显示时开；隐藏即停', async () => {
  fresh(); const pg = await home();
  assert.equal(pg.data.bannerAuto, true); pg.onHide(); assert.equal(pg.data.bannerAuto, false); pg.onShow(); assert.equal(pg.data.bannerAuto, true);
  assert.equal(pg.data.bannerInterval, CF.home.bannerIntervalMs); assert.equal(pg.data.bannerDuration, CF.home.bannerDurationMs);
  pg.onUnload();
});

test('入口与跳转：查看门店、估大小算价格、立即下单（快捷下单页）；快速连点只跳一次，隐藏 / 再显示后解锁，卸载后不再跳', async () => {
  fresh(); const pg = await home();
  env.nav.length = 0; pg.onQuick(); pg.onQuick(); pg.onEstimate(); pg.onFindStores();
  assert.deepEqual(env.nav.map((x) => x.url), [routes.QUICK], '锁定期内的重复点击与点别的入口都不再跳');
  pg.onHide(); pg.onShow(); env.nav.length = 0; pg.onEstimate(); assert.deepEqual(env.nav.map((x) => x.url), [routes.CAPACITY]);
  pg.onHide(); pg.onShow(); env.nav.length = 0; pg.onFindStores(); assert.deepEqual(env.nav.map((x) => [x.kind, x.url]), [['switchTab', routes.STORES]]);
  await tick(CF.home.navLockMs + 30); env.nav.length = 0; pg.onStore(tap({ id: 'SIM_BJ01' })); assert.equal(env.nav[0].url, routes.STORE_DETAIL + '?id=SIM_BJ01', '锁到时自动解开');
  pg.onUnload(); assert.equal(pg._navLock, null, '卸载时清掉定时器');
  env.nav.length = 0; pg.onQuick(); pg.onBusiness(); assert.equal(env.nav.length, 0, '页面卸载后不再跳转');
  const wxml = read('pages/home/index.wxml'), css = read('pages/home/index.wxss');
  assert.match(wxml, /bindtap="onQuick"/); assert.equal(T.home.quick, '立即下单');
  assert.match(css, /\.hm-entry \{[^}]*background: var\(--mk-color-canvas-sunken\)/, '入口卡是浅灰底块');
  assert.ok(!/\.hm-entry[^{]*\{[^}]*brand-tint/.test(css), '入口卡不用浅绿底');
});

test('推荐卡角标：第一张「距离最近」；第二张只有按「半径内更低价」选出来才标「区域低价」；运营位与距离不全时不标', async () => {
  const ctx = (loc) => ({ requirement: null, location: loc || BJ, loggedIn: false });
  const base = finder.buildHomeRecommend(BJS, ctx());
  // 基准数据：半径内没有比最近那家更便宜的，第二位退回取次近 → 不标「区域低价」；第三位是运营位，不标
  assert.deepEqual(base.map((c) => [c.id, c.rankKind, c.rankTag]), [['SIM_BJ01', 'near', T.card.first], ['SIM_BJ02', '', ''], ['SIM_BJ03', '', '']]);
  // 把 4.5km 的门店改成全城最便宜：按「半径内更低价」提前到第二位 → 标「区域低价」
  const cheap = BJS.map((s) => (s.id === 'SIM_BJ03' ? Object.assign({}, s, { units: s.units.map((u) => Object.assign({}, u, { base_month: 10 * u.volume })) }) : s));
  const r2 = finder.buildHomeRecommend(cheap, ctx());
  assert.deepEqual(r2.map((c) => [c.id, c.rankKind, c.rankTag]).slice(0, 2), [['SIM_BJ01', 'near', T.card.first], ['SIM_BJ03', 'price', T.card.second]]); assert.equal(r2[2].rankTag, '');
  // 没有用仓位置（距离不全）：都不标
  const none = finder.buildHomeRecommend(BJS, ctx(Object.assign({}, BJ, { status: 'unasked' })));
  assert.ok(none.length >= 2 && none.every((c) => c.rankTag === '' && c.rankKind === '' && c.kmText === ''));
  // 页面：角标贴在图片容器里，样式走全局类；卡内店名、位置组、标签、价格各一行
  const wxml = read('pages/home/index.wxml');
  assert.match(wxml, /<view class="hm-rphoto">\s*<image[^>]*\/>\s*<text wx:if="\{\{item\.rankTag\}\}" class="mk-corner \{\{item\.rankKind === 'price' \? 'mk-corner--price' : ''\}\}">/);
  assert.match(read('app.wxss'), /\.mk-corner--price \{/);
  assert.match(wxml, /mk-press mk-fade-in mk-fade-in--d\{\{index \+ 1\}\}/, '推荐卡按压与错峰渐显');
  fresh(); state.patch('location', { status: 'granted' }); const pg = await home();
  assert.equal(pg.data.cards[0].rankTag, T.card.first); assert.ok(pg.data.cards[1].rankTag === '' || (pg.data.cards[1].rankKind === 'price' && pg.data.cards[1].fromPrice < pg.data.cards[0].fromPrice)); assert.equal(pg.data.cards[2].rankTag, '');
  assert.ok(pg.data.cards.every((c) => c.kmText && c.district && c.name && c.fromPrice > 0));
  pg.onUnload();
});

test('常见存储场景：六个圆形图标一行横滑，没有「左右滑动」字样；品牌区：三组数字、五城地标线条画、三张资质配图，没有配图提醒', () => {
  const wxml = read('pages/home/index.wxml'), all = wxml + JSON.stringify(T.home);
  assert.ok(!/左右滑动|配图提醒|覆盖 ?5 ?城/.test(all));
  assert.equal(T.home.swipeHint, undefined); assert.equal(T.home.sceneImages, undefined);
  assert.match(wxml, /<scroll-view class="hm-scroll" scroll-x="\{\{true\}\}"/); assert.match(wxml, /class="hm-sround"/);
  assert.equal(CF.home.sceneIcons.length, 6);
  const icons = JSON.parse(fs.readFileSync(path.join(root, '../design-src/icons.json'), 'utf8'));
  for (const n of CF.home.sceneIcons) { assert.ok(exists('assets/icons/' + n + '.svg'), n); assert.ok(icons.icons[n.split('-')[0]], n + ' 不在 icons.json'); assert.ok(!/currentColor/.test(read('assets/icons/' + n + '.svg'))); }
  // 右侧不留页边距，一屏露出半个：每格 160rpx、左边距 32rpx → 750 宽里是 4.5 格
  assert.match(read('pages/home/index.wxss'), /\.hm-scene \{[^}]*width: 160rpx/);
  assert.deepEqual(T.home.proof.map((x) => x.n), ['14年', '590+', '30万+']);
  assert.deepEqual(T.home.cities, ['北京', '上海', '深圳', '杭州', '广州']);
  assert.equal(CF.home.cityImages.length, 5); assert.equal(CF.home.proofImages.length, T.home.proofCaptions.length);
  const strokes = new Set();
  for (const p of CF.home.cityImages) { assert.ok(exists(p), p); const svg = read(p.replace(/^\//, '')); assert.ok(!/currentColor|<text/.test(svg)); (svg.match(/stroke-width="[^"]+"/g) || []).forEach((x) => strokes.add(x)); }
  assert.equal(strokes.size, 1, '五张地标同一描边粗细');
  for (const p of CF.home.proofImages) { assert.ok(exists(p), p); assert.ok(fs.statSync(path.join(root, p)).size < 60 * 1024); }
  assert.ok(!fs.readdirSync(path.join(root, 'assets/images/home')).some((f) => /^(scene|task)-/.test(f)), '旧场景切图与任务配图已删');
});

test('首页各状态：未定位、有需求、待支付（推荐收起可展开）、服务中（不出推荐）、临期', async () => {
  const open = async (sc) => { assert.ok(demo.applyScenario(sc), sc); env.nav.length = 0; getApp().globalData.find = null; const pg = env.newPage('pages/home/index', {}); await tick(60); return pg; };
  try {
    // 游客未定位：定位被拒，城市位带圆点，推荐卡不写公里数、不出角标
    const real = wx.getLocation; wx.getLocation = (o) => { if (o && o.fail) o.fail({ errMsg: 'getLocation:fail auth deny', errno: 103 }); };
    let pg;
    try { pg = await open('first_visit'); } finally { wx.getLocation = real; }
    assert.deepEqual([pg.data.sys, pg.data.located, pg.data.weak, pg.data.noRec, pg.data.showRail, pg.data.needMode, pg.data.estimated], ['', false, false, false, true, 'card', false]);
    assert.ok(pg.data.cards.length >= 2 && pg.data.cards.every((c) => c.rankTag === '' && c.kmText === '' && c.placeText), '未定位不出角标，位置行写区名与商圈'); pg.onUnload();
    pg = await open('first_visit'); // 首次进入自动申请定位并成功
    assert.deepEqual([pg.data.located, pg.data.cards[0].rankTag], [true, T.card.first]); pg.onUnload();
    pg = await open('guest_browsing');
    assert.deepEqual([pg.data.located, pg.data.estimated, pg.data.needMode, pg.data.banners.length], [true, true, 'card', 2]); pg.onUnload();
    pg = await open('member_pending');
    assert.deepEqual([pg.data.weak, pg.data.collapse, pg.data.showRail, pg.data.needMode], [true, true, false, 'hidden']);
    pg.onToggleRec(); assert.deepEqual([pg.data.recOpen, pg.data.showRail], [true, true]); pg.onToggleRec(); pg.onToggleRec(); pg.onToggleRec(); assert.deepEqual([pg.data.recOpen, pg.data.showRail], [false, false], '连点四次回到收起'); pg.onUnload();
    pg = await open('member_active');
    assert.deepEqual([pg.data.weak, pg.data.noRec, pg.data.showRail], [true, true, false]); pg.onUnload();
    pg = await open('member_expiring');
    assert.deepEqual([pg.data.weak, pg.data.noRec], [true, true]); pg.onUnload();
  } finally { fresh(); R('services/mock-ext/_db').resetDb(); }
});

test('任务卡：临期且主按钮已是「办理续租」时四宫格不出「续租」（M-05），服务中照常；待支付待办的门店、金额、剩余时间分开', async () => {
  const card = async (sc) => { assert.ok(demo.applyScenario(sc), sc); const c = env.newComponent('components/mk-task-card/index', {}); await c.refresh(); return c; };
  try {
    let c = await card('member_expiring');
    assert.deepEqual([c.data.main.key, c.data.main.primary.a, c.data.main.svc, c.data.main.svcRenew], ['expiring', 'renew', true, false]); c.__detach();
    c = await card('member_invoice_failed');
    assert.deepEqual([c.data.main.key, c.data.main.svc, c.data.main.svcRenew], ['active', true, true]); c.__detach();
    c = await card('member_active');
    const pay = c.data.todos.find((t) => t.a === 'pay');
    assert.ok(pay, '演示订单里有待支付'); assert.ok(pay.t && !/[·•¥]/.test(pay.t.replace(/^[^店]*·/, '')), '门店名里不再拼金额'); assert.match(pay.amt, /^¥[\d,]+$/); assert.match(pay.note, new RegExp('^' + TT.task.left + '\\d\\d:\\d\\d:\\d\\d$'));
    c.__detach();
    const wxml = read('components/mk-task-card/index.wxml'), css = read('components/mk-task-card/index.wxss');
    assert.match(wxml, /<view wx:if="\{\{main\.svcRenew\}\}"[^>]*data-a="renew"/);
    assert.match(wxml, /class="mk-num tk-todoamt">\{\{item\.amt\}\}/);
    assert.ok(!/border-top/.test(css), '卡内与待办条带不再画分隔线'); assert.ok(!/class="mk-card tk-strip"/.test(wxml), '待办条带不再是描边卡');
  } finally { fresh(); R('services/mock-ext/_db').resetDb(); }
});

test('首页结构：白底页、分段靠留白；骨架按新结构；界面文字都在 i18n 里', () => {
  const wxml = read('pages/home/index.wxml'), css = read('pages/home/index.wxss');
  assert.match(wxml, /^<view class="mk-page mk-page--plain hm-page">/);
  assert.ok(!/border-(top|bottom):/.test(css), '首页不画分割线');
  assert.ok(!/[•｜]/.test(wxml + css));
  for (const k of ['hm-sk__find', 'hm-sk__entry', 'hm-sk__bar', 'hm-sk__rec']) { assert.ok(wxml.includes(k), k); assert.ok(css.includes('.' + k), k); }
  for (const k of ['findStores', 'findSub', 'findBtn', 'estimate', 'estimateSub', 'quick', 'quickSub', 'recommend', 'allStores', 'scenes', 'brandName', 'about']) assert.equal(typeof T.home[k], 'string', k);
  for (const k of ['heroTitle', 'heroSub', 'findLink', 'estimateLink', 'estimatedLink', 'estimatedSub', 'heroAlt']) assert.equal(T.home[k], undefined, k + ' 已撤');
  // WXML 里用到的 T.home.* 键都存在
  for (const m of wxml.matchAll(/T\.home\.([a-zA-Z]+)(?:\.([a-zA-Z]+))?/g)) { const v = T.home[m[1]]; assert.ok(v !== undefined, m[0]); if (m[2] && !Array.isArray(v)) assert.ok(v[m[2]] !== undefined, m[0]); }
});
