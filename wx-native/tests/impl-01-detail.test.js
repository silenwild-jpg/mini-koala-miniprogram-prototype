// IMPL-01 门店详情视觉升级：顶部多图横滑与放大、三段同页与页签跟随、仓型分组标题、服务设施宫格、地图块、底栏入口、收藏动效的连点与卸载。
// 在假的 wx 环境里跑，验证的是代码逻辑，不是微信真实渲染。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), scenarios = R('mock/scenarios'), media = R('services/media'), CF = R('core/config-find'), T = R('i18n/find');
const { db } = R('services/mock-ext/_db');
env.loadApp();
const NEED = { capacity_m3: 3.5, input_unit: 'm3', input_value: 3.5, term_months: 6, source: 'manual' };
function fresh(need, loggedIn) {
  state.reset(); env.nav.length = 0; env.mode = 'ok'; db.orders.length = 0; db.leads.length = 0; db.seq = 0; db.seeded = true; db.kv = {};
  scenarios.write({ scenario: '', stock: 'normal', events: {}, net: 'instant' });
  if (loggedIn) state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
  if (need) state.setRequirement(need);
}
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 20));
const tap = (dataset, detail) => ({ currentTarget: { dataset: dataset || {} }, detail: detail || {} });
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const open = async (q) => { const pg = env.newPage('pages/store/detail', q || { id: 'SIM_BJ01' }); await pg.__shown; await tick(); return pg; };
function swap(name, fn) { const old = wx[name]; wx[name] = fn; return () => { wx[name] = old; }; }

test('顶部图片：每家门店至少 3 张且不重复、文件都在；横滑记页码；点击放大传全部图片与当前张', async () => {
  const stores = R('mock/stores');
  stores.forEach((s) => {
    const g = media.storeGallery(s);
    assert.ok(g.length >= CF.detail.galleryMin, s.id); assert.equal(new Set(g).size, g.length, s.id); assert.equal(g[0], media.storeHero(s));
    g.forEach((f) => assert.ok(fs.existsSync(path.join(root, f)), f));
  });
  assert.deepEqual(media.storeGallery({ id: 'X', photos: ['a', 'b'] }), ['a', 'b'], '接口给了照片就原样用，不补共用图');
  fresh(null, false); const pg = await open();
  assert.equal(pg.data.gallery.length, 3); assert.equal(pg.data.heroIndex, 0); assert.equal(pg.data.hero, pg.data.gallery[0]);
  pg.onHeroChange({ detail: { current: 2 } }); assert.equal(pg.data.heroIndex, 2);
  const seen = []; const back = swap('previewImage', (o) => seen.push(o));
  try { pg.onHeroTap(tap({ i: 1 })); pg.onHeroTap(tap({})); } finally { back(); }
  assert.deepEqual(seen, [{ current: pg.data.gallery[1], urls: pg.data.gallery }, { current: pg.data.gallery[0], urls: pg.data.gallery }]);
  await pg.refresh(); assert.equal(pg.data.heroIndex, 2, '回到页面重新取数不重置当前张');
});

test('三段同页：点页签滚到对应段并扣掉吸顶页签高度；随滚动高亮；点页签后的锁定期内不被滚动改回；卸载后不再写数据', async () => {
  fresh(null, false); const pg = await open();
  const scrolls = []; let rects = []; let pending = null;
  const back1 = swap('pageScrollTo', (o) => scrolls.push(o));
  const back2 = swap('createSelectorQuery', () => { const q = { selectAll: () => q, boundingClientRect: () => q, exec: (cb) => { pending = () => cb([rects]); } }; return q; });
  const flush = () => { const f = pending; pending = null; if (f) f(); };
  try {
    pg.onTab(tap({ i: 1 })); assert.equal(pg.data.tab, 1);
    assert.deepEqual(scrolls.pop(), { selector: '#sd-sec-1', offsetTop: -44, duration: CF.detail.tabScrollMs });
    pg.onTab(tap({ i: 7 })); assert.equal(pg.data.tab, 1, '非法下标不动'); assert.equal(scrolls.length, 0);
    // 锁定期内：滚动事件不量位置
    pg.onPageScroll({ scrollTop: 10 }); assert.equal(pending, null);
    pg._spyLock = 0;
    rects = [{ top: -900 }, { top: -200 }, { top: 300 }]; pg.onPageScroll({}); pg.onPageScroll({}); flush(); assert.equal(pg.data.tab, 1);
    rects = [{ top: -1500 }, { top: -800 }, { top: 46 }]; pg.onPageScroll({}); flush(); assert.equal(pg.data.tab, 2, '第三段滚到页签下沿');
    rects = [{ top: 300 }, { top: 900 }, { top: 1500 }]; pg.onPageScroll({}); flush(); assert.equal(pg.data.tab, 0, '回到顶部');
    // 量位置的回调晚于点页签：以点的为准
    pg.onPageScroll({}); pg.onTab(tap({ i: 2 })); rects = [{ top: 0 }, { top: 500 }, { top: 900 }]; flush(); assert.equal(pg.data.tab, 2);
    // 量位置的回调晚于卸载：不写数据
    pg._spyLock = 0; pg.onPageScroll({}); pg.onUnload(); rects = [{ top: 0 }, { top: 500 }, { top: 900 }]; flush(); assert.equal(pg.data.tab, 2);
    pg.onPageScroll({}); assert.equal(pending, null, '卸载后不再量');
  } finally { back1(); back2(); }
});

test('带页签进入（?tab=2）：到店资料回来后滚到对应段，只滚一次；地址行点一下滚到到店指引', async () => {
  fresh(null, false);
  const scrolls = []; const back = swap('pageScrollTo', (o) => scrolls.push(o));
  try {
    const pg = await open({ id: 'SIM_BJ01', tab: '2' }); await pg.loadArrival(); await tick();
    assert.equal(pg.data.tab, 2); assert.deepEqual(scrolls, [{ selector: '#sd-sec-2', offsetTop: -44, duration: 0 }]);
    await pg.loadArrival(); await tick(); assert.equal(scrolls.length, 1);
    pg.onSeeRoute(); assert.equal(scrolls[1].selector, '#sd-sec-2');
  } finally { back(); }
});

test('仓位区：仓号与容量分开给，仓型分组标题每种仓型只出一次并带空间示意；已租出的行同样分开；需求与仓型筛选同一行', async () => {
  fresh(null, true); let pg = await open();
  const units = pg.data.blocks.filter((b) => b.type === 'unit');
  units.forEach((b) => { assert.match(b.row.code, /^[A-Z]\d{3}$/); assert.match(b.row.volText, /m³$/); });
  const heads = units.filter((b) => b.head).map((b) => b.head);
  assert.deepEqual(heads.map((h) => h.title), ['迷你仓 · 1.5m³ 以内', '小型仓 · 1.5–5m³', '中型仓 · 5–10m³']);
  heads.forEach((h) => { assert.ok(/\/units\/(mini|small|medium|large)\.webp$/.test(h.thumb)); assert.ok(h.usage.indexOf('适合') === 0); });
  assert.equal(pg.data.blocks[0].first, true);
  fresh(NEED, true); pg = await open();
  const cats = pg.data.blocks.filter((b) => b.head).map((b) => b.head.cat); assert.equal(new Set(cats).size, cats.length, '有需求分组时同一仓型也只出一次');
  pg.data.blocks.forEach((b, i) => { if (i && pg.data.blocks[i - 1].type === 'title') assert.equal(b.first, true); });
  assert.ok(pg.data.sold.length > 0); pg.data.sold.forEach((x) => { assert.ok(x.code); assert.match(x.volText, /m³$/); });
  const wxml = read('pages/store/detail.wxml');
  assert.match(wxml, /class="sd-filter">[\s\S]*class="sd-need"[\s\S]*class="mk-grow sd-cats"/); assert.ok(!/sd-demand/.test(wxml));
  assert.match(wxml, /class="mk-unitno sd-code">\{\{item\.row\.code\}\}/);
});

test('无匹配：一行提示加文字链（进入时渐显），点文字链去门店列表', async () => {
  fresh(Object.assign({}, NEED, { capacity_m3: 20, input_value: 20 }), true); const pg = await open();
  assert.equal(pg.data.situation, 'nomatch');
  const wxml = read('pages/store/detail.wxml');
  assert.match(wxml, /wx:if="\{\{situation === 'nomatch'\}\}" class="sd-nomatch mk-fade-in"/); assert.match(wxml, /bindtap="onOtherStores"[^>]*>\{\{T\.d\.otherStoresLink\}\}/);
  env.nav.length = 0; pg.onOtherStores(); assert.equal(env.nav[0].kind, 'switchTab');
});

test('服务设施宫格与地图块：有档案的门店照档案列，存取时间在第一格；地图只在有坐标时出，标记用位图；到店资料取不到时不出地图', async () => {
  fresh(null, false); let pg = await open(); await pg.loadArrival();
  assert.equal(pg.data.svc[0].k, T.detail.svc.hours); assert.equal(pg.data.svc[0].icon, 'clock-ink');
  pg.data.svc.forEach((c) => assert.ok(fs.existsSync(path.join(root, 'assets/icons', c.icon + '.svg')), c.icon));
  assert.equal(new Set(pg.data.svc.map((c) => c.k)).size, pg.data.svc.length);
  assert.ok(pg.data.geo && pg.data.markers.length === 1); assert.equal(pg.data.markers[0].iconPath, media.mapPin); assert.ok(fs.existsSync(path.join(root, media.mapPin)));
  assert.equal(pg.data.markers[0].latitude, pg.data.geo.latitude); assert.equal(pg.data.mapScale, CF.detail.mapScale);
  const wxml = read('pages/store/detail.wxml');
  assert.match(wxml, /<map [^>]*enable-scroll="\{\{false\}\}"[^>]*enable-zoom="\{\{false\}\}"[^>]*bindtap="onNavigate"/);
  assert.ok(!/hoursText/.test(wxml), '存取时间不在头部'); assert.ok(!/T\.d\.hours\b/.test(wxml));
  // 多入口门店点地图先选入口，单入口直接开地图
  pg.onNavigate(); assert.equal(pg.data.destSheet, true); pg.onDestClose();
  const calls = []; const back = swap('openLocation', (o) => calls.push(o));
  try { pg.onDest(tap({ i: 0 })); } finally { back(); }
  assert.equal(calls.length, 1); assert.equal(calls[0].scale, CF.detail.mapScale); assert.equal(calls[0].latitude, pg.data.geo.latitude);
  scenarios.write({ net: 'offline' }); pg = env.newPage('pages/store/detail', { id: 'SIM_BJ01' }); await tick(); pg._store = pg._store || { id: 'SIM_BJ01', name: 'x', address: 'y', tags: [], units: [] };
  await pg.loadArrival(); if (pg.data.arrSys === 'failed') { assert.equal(pg.data.geo, null); assert.deepEqual(pg.data.markers, []); }
  scenarios.write({ net: 'instant' });
});

test('底栏：收藏 / 分享 / 预约看仓 + 在线问 / 打电话；页面内原来的预约看仓与电话图标取消', async () => {
  const wxml = read('pages/store/detail.wxml');
  const bar = wxml.slice(wxml.indexOf('class="mk-bottom-bar sd-bar"'));
  const order = ['bindtap="onFavStore"', 'open-type="share"', 'bindtap="onBooking"', 'open-type="contact"', 'bindtap="onCall"'].map((k) => bar.indexOf(k));
  assert.ok(order.every((i) => i > 0) && order.every((v, i) => i === 0 || v > order[i - 1]), '顺序：收藏、分享、预约看仓、在线问、打电话');
  const body = wxml.slice(0, wxml.indexOf('class="mk-bottom-bar sd-bar"'));
  assert.ok(!/onBooking/.test(body)); assert.ok(!/phone-brand/.test(body)); assert.ok(!/open-type="share"/.test(body)); assert.ok(!/onFavStore/.test(body));
  assert.equal((wxml.match(/bindtap="onBooking"/g) || []).length, 1);
  fresh(NEED, true); const pg = await open();
  pg.onBooking(); assert.equal(pg.data.visitVisible, true); pg.onVisitClose(); assert.equal(pg.data.visitVisible, false);
  const tel = []; const back = swap('makePhoneCall', (o) => tel.push(o.phoneNumber));
  try { pg.onCall(); } finally { back(); }
  assert.deepEqual(tel, ['4000358885']);
  const msg = pg.onShareAppMessage(); assert.ok(/id=SIM_BJ01/.test(msg.path || msg.query || JSON.stringify(msg)));
});

test('收藏动效：快速连点每次都重放且状态与本机收藏一致；动画回调前卸载不再写数据', async () => {
  fresh(null, true); const pg = await open();
  pg.onFavStore(); pg.onFavStore(); pg.onFavStore();
  assert.equal(pg.data.fav, true); assert.deepEqual(state.get().favorites.stores, ['SIM_BJ01']); assert.equal(pg.data.favBump, '');
  await tick(40); assert.equal(pg.data.favBump, 'mk-bump mk-bump--center');
  pg.onFavStore(); assert.equal(pg.data.fav, false); assert.equal(pg.data.favBump, '');
  pg.onUnload(); await tick(40); assert.equal(pg.data.favBump, '', '卸载后回调不写数据');
  assert.deepEqual(state.get().favorites.stores, []);
});

test('组合方案：页面数据里有 combos（与 blocks 里的组合行一一对应），点组合行按钮能走到下单', async () => {
  let pg = null, cap = 0;
  for (const c of [9, 10, 12, 14, 16, 18, 20, 24]) { // 找一个本店出组合方案的容量
    fresh(Object.assign({}, NEED, { capacity_m3: c, input_value: c }), true); pg = await open();
    if (pg.data.comboMode === 'fold') { pg.onToggleCombos(); }
    if (pg.data.blocks.some((b) => b.type === 'combo')) { cap = c; break; }
  }
  assert.ok(cap > 0, '演示数据里应有出组合方案的容量');
  const rows = pg.data.blocks.filter((b) => b.type === 'combo');
  assert.equal(pg.data.combos.length, rows.length); assert.ok(pg.data.comboMode);
  rows.forEach((b) => assert.equal(pg.data.combos[b.i].id, b.row.id));
  env.nav.length = 0; pg.onAction(tap({ list: 'combos', i: rows[0].i })); await tick();
  assert.ok(env.nav.some((n) => String(n.url || '').indexOf('unit=' + rows[0].row.id) >= 0), '带组合仓位进确认订单');
});
