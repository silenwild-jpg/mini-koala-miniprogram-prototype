// IMPL-02 find 域：仓位编号标签（门店卡、任务卡、门店详情组合方案）、满额减拆成优惠标签（PR-201）、
// 筛选下拉 / 定位气泡 / 已租出折叠的退场状态机（切换、快速连点、选中后收起、点遮罩、卸载）、M-12 无匹配提示。
// 在假的 wx 环境里跑，验证的是代码逻辑与文件约定，不是微信真实渲染；动画本身看不到，只验证状态与定时器。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), api = R('services/api'), scenarios = R('mock/scenarios'), demo = R('services/demo');
const { db } = R('services/mock-ext/_db');
const finder = R('services/finder'), C = R('core/config'), T = R('i18n/find'), fmt = R('core/format');
env.loadApp();
const LEAVE = C.motion.leaveMs;
const N = (c, x) => Object.assign({ capacity_m3: c, input_unit: 'm3', input_value: c, term_months: 6, source: 'manual' }, x || {});
function fresh(need, loggedIn, located) {
  state.reset(); env.nav.length = 0; db.orders.length = 0; db.leads.length = 0; db.messages.length = 0; db.seq = 0; db.seeded = true; db.kv = {}; db.sms = {};
  scenarios.write({ scenario: '', stock: 'normal', events: {}, net: 'instant' }); getApp().globalData.find = null;
  if (loggedIn) state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
  if (need) state.set('requirement', need);
  if (located !== false) state.patch('location', { status: 'granted' });
}
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 30));
const tap = (d) => ({ currentTarget: { dataset: d } });
const ctx = (need, loggedIn) => ({ loggedIn: !!loggedIn, location: state.get().location, requirement: need || null });
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const stores = async () => { const pg = env.newPage('pages/stores/index', {}); await pg.__shown; await tick(); return pg; };
// 记下某一时刻之后的 setData 次数：卸载后不应再写
const spy = (pg) => { const raw = pg.setData; const log = []; pg.setData = function (p) { log.push(Object.keys(p)); return raw.apply(this, arguments); }; return log; };

test('PR-201：满额减不再拼进价格次行，单独成优惠标签字段；附近门店、仓位推荐、门店详情三处同一份数据', async () => {
  const need = N(15, { term_months: 12 }); fresh(need, true);
  const all = await api.getStores({ city: '北京' });
  const lines = [];
  finder.buildMatch(all, ctx(need, true)).cards.forEach((c) => c.lines.forEach((l) => lines.push(l)));
  finder.buildList(all, ctx(need, true), {}).cards.forEach((c) => { if (c.row) lines.push(c.row); });
  all.forEach((s) => { const d = finder.buildStoreDetail(s, ctx(need, true), { category: 'all' }); d.rows.concat(d.near, d.smaller, d.over, d.combos).forEach((l) => lines.push(l)); });
  assert.ok(lines.length > 10);
  lines.forEach((l) => {
    assert.match(l.price.sub, /^整期 ¥[\d,]+ · 12个月$/, '次行只留「整期 ¥X · N个月」');
    assert.ok(l.price.off === '' || /^满额减 ¥[\d,]+$/.test(l.price.off), l.price.off);
  });
  assert.ok(lines.some((l) => l.price.off) && lines.some((l) => !l.price.off), '有满额减与没有满额减的都覆盖到');
  // 满额减金额与报价一致：标签只是呈现方式，不改金额
  const pricing = R('core/pricing'), st = all.find((s) => s.units.some((u) => u.volume === 16 && u.status !== 'rented')) || all[0];
  const d = finder.buildStoreDetail(st, ctx(need, true), { category: 'all' });
  d.rows.forEach((l) => { const us = l.id.split(',').map((id) => st.units.find((u) => u.id === id)), q = pricing.quote(us, 12); assert.equal(l.price.off, q.full_reduction > 0 ? T.price.fullOffTag(pricing.yuan(q.full_reduction)) : ''); });
  // 未登录 / 无需求：只有「/月起」，没有次行也没有标签
  const guest = finder.buildMatch(all, ctx(need, false)).cards[0].lines[0];
  assert.deepEqual([guest.price.sub, guest.price.off], ['', '']);
  // 三处 WXML 同一写法：次行文字 + mk-tag--promo 标签
  const card = read('components/mk-store-card/index.wxml'), det = read('pages/store/detail.wxml');
  assert.match(card, /class="sc-subline"><text wx:if="\{\{item\.price\.sub\}\}" class="mk-sub sc-sub">\{\{item\.price\.sub\}\}<\/text><text wx:if="\{\{item\.price\.off\}\}" class="mk-tag mk-tag--promo mk-num sc-off">\{\{item\.price\.off\}\}<\/text>/);
  assert.match(det, /class="sd-subline"><text wx:if="\{\{item\.row\.price\.sub\}\}" class="mk-t-hint sd-sub">\{\{item\.row\.price\.sub\}\}<\/text><text wx:if="\{\{item\.row\.price\.off\}\}" class="mk-tag mk-tag--promo mk-num sd-off">\{\{item\.row\.price\.off\}\}<\/text>/);
  assert.match(read('pages/match/index.wxml'), /<mk-store-card wx:for="\{\{cards\}\}"/, '仓位推荐用同一个门店卡组件');
});

test('仓位编号标签：门店卡仓位行编号在前、容量在后，组合仓每个编号一个标签；门店详情容量在前、编号在后（PR-245 未改顺序），组合方案同样逐个成标签', async () => {
  const need = N(9); fresh(need, true);
  const all = await api.getStores({ city: '北京' });
  const m = finder.buildMatch(all, ctx(need, true));
  const lines = m.cards.reduce((a, c) => a.concat(c.lines), []);
  lines.forEach((l) => { assert.ok(l.codeList.length >= 1); l.codeList.forEach((c) => assert.match(c, /^[A-Z]\d{3}$/)); assert.match(l.volText, /^[\d.]+m³$/); assert.equal(l.codeList.join(' + '), l.codes); assert.equal(l.combo, l.codeList.length > 1); });
  assert.ok(lines.some((l) => l.combo), '9m³ 有组合方案');
  const one = finder.buildMatch(all, ctx(N(3.5), true)).cards[0].lines[0];
  assert.equal(one.codeList.length, 1); assert.equal(one.name, fmt.unitName({ code: one.codeList[0], volume: parseFloat(one.volText) }), 'format.unitName 的返回值没动（别的域在用）');
  const card = read('components/mk-store-card/index.wxml');
  assert.match(card, /<text wx:for="\{\{item\.codeList\}\}" wx:for-item="c" wx:key="\*this" class="mk-unitno sc-no">\{\{c\}\}<\/text><text class="mk-num sc-vol">\{\{item\.volText\}\}<\/text>/);
  assert.ok(!/item\.codes \+ ' · '/.test(card), '不再用「编号 · 容量」拼串');
  // 门店详情：组合方案行与已租出行
  const st = all.find((s) => s.id === 'SIM_BJ01'), d = finder.buildStoreDetail(st, ctx(need, true), { category: 'all' });
  assert.ok(d.combos.length > 0); d.combos.forEach((c) => assert.equal(c.codeList.length, 2));
  d.sold.forEach((x) => { assert.match(x.code, /^[A-Z]\d{3}$/); assert.match(x.volText, /m³$/); });
  const det = read('pages/store/detail.wxml');
  const vol = det.indexOf('class="sd-vol mk-num">{{item.row.volText}}'), no = det.indexOf('class="mk-unitno sd-code">{{c}}');
  assert.ok(vol > 0 && no > vol, '详情仓位行：容量在前、编号标签在后');
  const soldRow = det.slice(det.indexOf('wx:for="{{sold}}"'));
  assert.ok(soldRow.indexOf('sd-vol mk-num">{{item.volText}}') < soldRow.indexOf('mk-unitno sd-code">{{item.code}}'), '已租出行同一顺序');
  assert.ok(!/组合仓/.test(det));
});

test('任务卡：仓位编号成标签，容量与租期跟在后面；订单没带编号时退回原来的一行', async () => {
  const card = async (sc) => { assert.ok(demo.applyScenario(sc), sc); const c = env.newComponent('components/mk-task-card/index', {}); await c.refresh(); return c; };
  try {
    const c = await card('member_active'), m = c.data.main;
    assert.ok(m && m.codes.length >= 1); m.codes.forEach((x) => assert.match(x, /^[A-Z]\d{3}$/)); assert.match(m.vol, /^[\d.]+m³$/); assert.match(m.term, /^\d+个月$/);
    c.__detach();
  } finally { fresh(); }
  const w = read('components/mk-task-card/index.wxml');
  assert.match(w, /<view wx:if="\{\{main\.codes\.length\}\}" class="tk-unit"><text wx:for="\{\{main\.codes\}\}" wx:key="\*this" class="mk-unitno tk-no">\{\{item\}\}<\/text><text class="mk-num tk-vol">\{\{main\.vol\}\}<\/text><text class="mk-sub tk-term">\{\{main\.term\}\}<\/text><\/view>/);
  assert.match(w, /<view wx:else class="mk-sub mk-ellipsis">\{\{main\.sub\}\}<\/view>/);
  // 没有订单时的简化主卡（继续确认用仓 / 已收到需求）没有 codes，走兜底行，不报错
  fresh(null, true); state.set('selection', { store_name: '安贞·富仁名苑店' });
  const c2 = env.newComponent('components/mk-task-card/index', {}); await c2.refresh();
  if (c2.data.main) assert.equal(c2.data.main.codes, undefined);
  c2.__detach(); fresh();
});

test('筛选下拉退场：再点同一项 / 点遮罩先挂退场类、播完才移除；退场中箭头与高亮已复位', async () => {
  fresh(N(3.5), true); const pg = await stores();
  pg.onSheet(tap({ k: 'sort' })); assert.deepEqual([pg.data.sheet, pg.data.sheetLeave], ['sort', '']);
  const p = pg.onSheet(tap({ k: 'sort' }));
  assert.deepEqual([pg.data.sheet, pg.data.sheetLeave], ['sort', 'mk-leave'], '退场中面板还在');
  assert.equal(await p, true); assert.deepEqual([pg.data.sheet, pg.data.sheetLeave], ['', '']);
  pg.onSheet(tap({ k: 'distance' })); const q = pg.onSheetClose(); assert.equal(pg.data.sheetLeave, 'mk-leave'); await q; assert.equal(pg.data.sheet, '');
  assert.equal(await pg.onSheetClose(), false, '已经收起时再点遮罩不做事'); assert.equal(pg.data.sheetLeave, '');
  const w = read('pages/stores/index.wxml');
  assert.match(w, /class="sl-drop mk-drop-in \{\{sheetLeave \? 'mk-leave mk-leave--up' : ''\}\}"/);
  assert.match(w, /class="sl-mask mk-scrim-in \{\{sheetLeave\}\}"/);
  ['sort', 'distance', 'services'].forEach((k) => assert.ok(!new RegExp("[^(]sheet === '" + k + "' [?|]").test(w), k + '：箭头与高亮都把退场中当作已收起'));
  assert.match(read('styles/motion.wxss'), /\.mk-leave\.mk-leave--up/);
  pg.onUnload();
});

test('筛选下拉：切到另一项直接换内容不退场；退场途中点另一项 / 同一项都取消退场；快速连点后状态与最后一次点击一致', async () => {
  fresh(N(3.5), true); const pg = await stores();
  pg.onSheet(tap({ k: 'sort' })); pg.onSheet(tap({ k: 'distance' }));
  assert.deepEqual([pg.data.sheet, pg.data.sheetLeave], ['distance', ''], '切换时没有经过退场'); assert.ok(pg.data.distOptions.length > 1);
  // 退场途中点另一项
  pg.onSheet(tap({ k: 'distance' })); assert.equal(pg.data.sheetLeave, 'mk-leave');
  pg.onSheet(tap({ k: 'services' })); assert.deepEqual([pg.data.sheet, pg.data.sheetLeave], ['services', '']);
  await tick(LEAVE + 40); assert.equal(pg.data.sheet, 'services', '被取消的退场定时器不会再把面板关掉');
  // 退场途中再点同一项 = 重新展开
  pg.onSheet(tap({ k: 'services' })); assert.equal(pg.data.sheetLeave, 'mk-leave'); pg.onSheet(tap({ k: 'services' }));
  assert.deepEqual([pg.data.sheet, pg.data.sheetLeave], ['services', '']); await tick(LEAVE + 40); assert.equal(pg.data.sheet, 'services');
  // 连点 4 次同一项：开着 → 关 → 开 → 关 → 开……偶数次回到原状态
  for (let i = 0; i < 4; i++) pg.onSheet(tap({ k: 'services' }));
  await tick(LEAVE + 40); assert.deepEqual([pg.data.sheet, pg.data.sheetLeave], ['services', '']);
  for (let i = 0; i < 3; i++) pg.onSheet(tap({ k: 'services' }));
  await tick(LEAVE + 40); assert.deepEqual([pg.data.sheet, pg.data.sheetLeave], ['', '']);
  pg.onUnload();
});

test('筛选下拉：选中后筛选立即生效、面板走退场；服务「确定」同样；没有用仓位置时选距离，面板退场并打开位置面板；打开修改需求时收起', async () => {
  fresh(N(3.5), true); let pg = await stores();
  pg.onSheet(tap({ k: 'sort' })); const p = pg.onOption(tap({ v: 'price' }));
  assert.equal(pg.data.sort, 'price', '排序立即生效'); assert.deepEqual([pg.data.sheet, pg.data.sheetLeave], ['sort', 'mk-leave']);
  await p; assert.deepEqual([pg.data.sheet, pg.data.sheetLeave, pg.data.sortLabel], ['', '', '价格优先']);
  const amounts = pg.data.items.filter((x) => x.type === 'store' && x.card.row).map((x) => x.card.row.price.amount);
  assert.ok(amounts.length > 1); assert.deepEqual(amounts, amounts.slice().sort((a, b) => a - b));
  pg.onSheet(tap({ k: 'services' })); pg.onOfferOption(tap({ k: 'promo' })); const c = pg.onSheetConfirm();
  assert.equal(pg.data.promo, true); assert.equal(pg.data.sheetLeave, 'mk-leave'); await c; assert.deepEqual([pg.data.sheet, pg.data.svcN], ['', 1]);
  pg.onSheet(tap({ k: 'sort' })); pg.onModify(); assert.equal(pg.data.demandSheet, true); assert.equal(pg.data.sheetLeave, 'mk-leave'); await tick(LEAVE + 40); assert.equal(pg.data.sheet, '');
  pg.onUnload();
  fresh(N(3.5), true, false); pg = await stores();
  pg.onSheet(tap({ k: 'distance' })); pg.onOption(tap({ v: 5 }));
  assert.deepEqual([pg.data.maxKm, pg.data.panel, pg.data.sheetLeave], [null, true, 'mk-leave']); await tick(LEAVE + 40); assert.equal(pg.data.sheet, '');
  pg.onUnload();
});

test('退场途中卸载页面：定时器清掉，之后不再 setData（筛选下拉、气泡、已租出折叠）', async () => {
  fresh(N(3.5), true, false); const pg = await stores();
  assert.ok(pg.data.bubble, '未定位时有气泡');
  pg.onSheet(tap({ k: 'sort' })); pg.onSheet(tap({ k: 'sort' })); assert.equal(pg.data.sheetLeave, 'mk-leave');
  pg.onUnload(); assert.equal(pg.data.bubble, null, '卸载时气泡直接移除');
  const log = spy(pg); await tick(LEAVE + 60); assert.deepEqual(log, []);
  assert.equal(await pg.onSheetClose(), false); assert.equal(await pg.hideBubble(), false); assert.deepEqual(log, []);
  fresh(N(3.5), true); const sd = env.newPage('pages/store/detail', { id: 'SIM_BJ01' }); await sd.__shown; await tick();
  sd.onToggleSold(); assert.equal(sd.data.soldOpen, true); sd.onToggleSold(); assert.equal(sd.data.soldOpenLeave, 'mk-leave');
  sd.onUnload(); const log2 = spy(sd); await tick(LEAVE + 60); assert.deepEqual(log2, []);
});

test('定位气泡与无门店城市气泡：收起先退场；页面隐藏、打开位置面板时直接移除；退场中重新出现会取消退场（首页与附近门店同一做法）', async () => {
  for (const route of ['pages/home/index', 'pages/stores/index']) {
    fresh(null, false, false); env.mode = 'fail'; // 定位失败：首页首次进入会出气泡
    const pg = env.newPage(route, {}); await tick(40); env.mode = 'ok';
    assert.ok(pg.data.bubble, route + ' 有定位气泡');
    const p = pg.hideBubble(); assert.ok(pg.data.bubble, '退场中还在'); assert.equal(pg.data.bubbleLeave, 'mk-leave');
    pg.hideBubble(); pg.onPageScroll({ scrollTop: 10 }); // 退场中重复触发不重新计时、不报错
    assert.equal(await p, true); assert.deepEqual([pg.data.bubble, pg.data.bubbleLeave], [null, '']);
    pg.setData({ bubble: { text: 'x', action: 'y', kind: 'retry' } }); pg.hideBubble(); assert.equal(pg.data.bubbleLeave, 'mk-leave');
    pg.onHide(); assert.deepEqual([pg.data.bubble, pg.data.bubbleLeave], [null, ''], '隐藏时直接移除');
    await tick(LEAVE + 40); assert.equal(pg.data.bubble, null);
    pg.setData({ bubble: { text: 'x', action: 'y', kind: 'retry' } }); pg.onCity(); assert.equal(pg.data.bubble, null); assert.equal(pg.data.panel, true);
    // 无门店城市气泡
    pg.setData({ nocity: '成都暂无门店，已为您显示北京门店' });
    const q = pg.onCloseNocity(); assert.equal(pg.data.nocityLeave, 'mk-leave'); assert.ok(pg.data.nocity); assert.equal(getApp().globalData.find.nocityClosed, true);
    await q; assert.deepEqual([pg.data.nocity, pg.data.nocityLeave], ['', '']);
    assert.equal(await pg.onCloseNocity(), false);
    pg.setData({ nocity: 'x' }); pg.onCloseNocity(); pg.onSwitchCity(); assert.deepEqual([pg.data.nocity, pg.data.nocityLeave, pg.data.panel], ['', '', true]);
    await tick(LEAVE + 40); assert.equal(pg.data.nocity, '');
    pg.onUnload();
    const w = read(route + '.wxml');
    assert.match(w, /wx:if="\{\{nocity\}\}" class="\w+-bubble mk-row mk-fade \{\{nocityLeave\}\}"/); assert.match(w, /wx:elif="\{\{bubble\}\}" class="\w+-bubble mk-row mk-fade \{\{bubbleLeave\}\}"/);
  }
});

test('门店详情：已租出折叠收起走退场，快速连点状态正确；M-12 无匹配是一行提示加文字链并带进场渐显', async () => {
  fresh(N(25), true); const sd = env.newPage('pages/store/detail', { id: 'SIM_BJ01' }); await sd.__shown; await tick();
  assert.equal(sd.data.situation, 'nomatch');
  const w = read('pages/store/detail.wxml');
  assert.match(w, /<view wx:if="\{\{situation === 'nomatch'\}\}" class="sd-nomatch mk-fade-in" aria-role="alert">/);
  assert.match(w, /class="mk-link sd-nomatch-a" bindtap="onOtherStores"/); assert.ok(!/<mk-empty wx:(el)?if="\{\{situation === 'nomatch'\}\}"/.test(w), '无匹配不再用整块空态');
  assert.equal(T.detail.noMatchLine, '本店暂无匹配仓位');
  sd.onOtherStores(); assert.ok(env.nav.some((n) => /stores/.test(JSON.stringify(n))));
  assert.match(w, /wx:if="\{\{soldOpen\}\}" class="mk-drop-in \{\{soldOpenLeave \? 'mk-leave mk-leave--up' : ''\}\}"/);
  await sd.onToggleSold(); assert.equal(sd.data.soldOpen, true);
  const p = sd.onToggleSold(); assert.deepEqual([sd.data.soldOpen, sd.data.soldOpenLeave], [true, 'mk-leave']);
  assert.equal(await p, true); assert.deepEqual([sd.data.soldOpen, sd.data.soldOpenLeave], [false, '']);
  sd.onToggleSold(); sd.onToggleSold(); sd.onToggleSold(); // 开 → 关（退场中）→ 开
  assert.deepEqual([sd.data.soldOpen, sd.data.soldOpenLeave], [true, '']); await tick(LEAVE + 40); assert.equal(sd.data.soldOpen, true);
  sd.onUnload();
});
