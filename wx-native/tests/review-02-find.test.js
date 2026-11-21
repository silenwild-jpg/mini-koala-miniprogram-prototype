// REVIEW-02 find 域（找仓五页 + 首页任务卡）：回归评审 A2-01 ～ A2-12、E2-01 / E2-12 ～ E2-15、D2-01 / D2-17 的修复用例。
// 在假的 wx 环境里跑，验证的是代码逻辑与文件约定，不是微信真实渲染。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), api = R('services/api'), scenarios = R('mock/scenarios'), demo = R('services/demo'), routes = R('services/routes');
const { db } = R('services/mock-ext/_db');
const finder = R('services/finder'), matching = R('core/matching'), T = R('i18n/find'), TT = R('i18n/trade'), CA = R('core/config-account'), rules = R('core/account');
const SI = R('core/config-size-illus');
env.loadApp();
const N = (c, x) => Object.assign({ capacity_m3: c, input_unit: 'm3', input_value: c, term_months: 6, source: 'manual' }, x || {});
function fresh(need, loggedIn, stock) {
  state.reset(); env.nav.length = 0; db.orders.length = 0; db.leads.length = 0; db.messages.length = 0; db.seq = 0; db.seeded = true; db.kv = {}; db.sms = {};
  scenarios.write({ scenario: '', stock: stock || 'normal', events: {}, net: 'instant' }); getApp().globalData.find = null;
  if (loggedIn) state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
  if (need) state.set('requirement', need);
  state.patch('location', { status: 'granted' });
}
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 30));
const ctx = (need, loggedIn) => ({ loggedIn: !!loggedIn, location: state.get().location, requirement: need || null });
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const page = async (p, q) => { const pg = env.newPage(p, q || {}); if (pg.__shown && pg.__shown.then) await pg.__shown; await tick(); return pg; };
const taskCard = async () => { const c = env.newComponent('components/mk-task-card/index', {}); await c.refresh(); return c; };
const CASES = [['normal', 1], ['normal', 3.5], ['normal', 9], ['normal', 15.5], ['normal', 19], ['normal', 29], ['tight', 1], ['tight', 3.5], ['tight', 9], ['tight', 15.5], ['tight', 19]];

test('A2-01：有需求时角标在排在前面的那一组里判——首位是有匹配的最近门店就带「距离最近」，不因更近的门店只有接近方案而丢', async () => {
  for (const [stock, cap] of CASES) {
    const need = N(cap); fresh(need, true, stock);
    const all = await api.getStores({ city: '北京' });
    const l = finder.buildList(all, ctx(need, true), {}), tag = stock + ' ' + cap;
    const lead = l.cards.filter((c) => c.listState === l.cards[0].listState);
    assert.ok(l.cards[0].row, tag);
    // 分组顺序不变：有匹配 → 接近 → 无匹配
    const g = { matched: 0, near: 1, none: 2 }; l.cards.forEach((c, i) => { if (i) assert.ok(g[l.cards[i - 1].listState] <= g[c.listState], tag + ' 分组'); });
    // 首位 = 首组里最近的一家，带「距离最近」
    assert.equal(l.cards[0].km, Math.min.apply(null, lead.map((c) => c.km)), tag + ' 首位最近');
    assert.deepEqual([l.cards[0].rankTag, l.cards[0].rankKind], [T.card.first, 'near'], tag);
    assert.equal(l.topRanked, true, tag);
    // 「区域低价」只会在第二位，且确实比首位便宜；其它位置没有角标
    l.cards.forEach((c, i) => { if (i > 1) assert.equal(c.rankTag, '', tag + ' 第 ' + (i + 1) + ' 张不带角标'); });
    if (l.cards[1].rankTag) { assert.equal(l.cards[1].rankTag, T.card.second); assert.equal(l.cards[1].listState, l.cards[0].listState); assert.ok(l.cards[1].row.monthly < l.cards[0].row.monthly, tag + ' 第二家更便宜'); }
    // 仓位推荐页同一规则、同样的前两家
    const m = finder.buildMatch(all, ctx(need, true));
    assert.deepEqual(m.cards.map((c) => [c.id, c.rankTag]), l.cards.slice(0, 2).map((c) => [c.id, c.rankTag]), tag + ' 推荐页与列表一致');
    assert.equal(m.cards[0].rankTag, T.card.first, tag);
    // 接近方案排在足额方案后面
    const nearAt = m.cards.map((c) => !!c.lines[0].secondary), firstNear = nearAt.indexOf(true);
    if (firstNear >= 0) assert.ok(nearAt.slice(firstNear).every(Boolean), tag);
  }
  // 评审员点名的情形：默认库存 15.5m³，第二家更便宜，应带「区域低价」
  const need = N(15.5); fresh(need, true);
  const all = await api.getStores({ city: '北京' });
  assert.deepEqual(finder.buildMatch(all, ctx(need, true)).cards.map((c) => c.rankTag), [T.card.first, T.card.second]);
  // 手动排序不标角标、不算「按推荐规则排出」
  ['distance', 'price'].forEach((sort) => { const l = finder.buildList(all, ctx(need, true), { sort }); assert.equal(l.topRanked, false); assert.ok(l.cards.every((c) => !c.rankTag)); });
  // 无需求（浏览）不受影响：首位最近带角标
  fresh(null, true); const b = finder.buildList(all, ctx(null, true), {});
  assert.deepEqual([b.cards[0].rankTag, b.topRanked], [T.card.first, true]);
});

test('A2-01：附近门店的小节标题不依赖角标文字——库存紧张 + 有需求时照样出「为您优先推荐 / 更多门店」', async () => {
  fresh(N(3.5), true, 'tight');
  const pg = await page('pages/stores/index');
  const st = pg.data.items.filter((x) => x.type === 'store');
  assert.equal(st[0].hd, T.stores.topTitle); assert.equal(st[0].card.rankTag, T.card.first);
  assert.equal(st.find((x) => x.variant === 'compact').hd, T.stores.restTitle);
  assert.match(read('pages/stores/index.js'), /stores\.length && l\.topRanked && stores\[0\]\.variant === 'standard'/);
  assert.doesNotMatch(read('pages/stores/index.js'), /stores\[0\]\.card\.rankTag/);
  // 按距离排序：不出小节标题
  await pg.apply({ sort: 'distance' }); await tick();
  assert.ok(pg.data.items.every((x) => !x.hd));
  pg.onUnload();
});

test('A2-02：「特价仓」筛选与卡片「特价仓」标签同一口径，筛出来的每张卡都带标签', async () => {
  for (const [need, stock] of [[N(3.5), 'normal'], [N(9), 'normal'], [N(3.5), 'tight'], [null, 'normal']]) {
    fresh(need, true, stock);
    const all = await api.getStores({ city: '北京' });
    const base = finder.buildList(all, ctx(need, true), {}), l = finder.buildList(all, ctx(need, true), { promo: true });
    assert.ok(l.cards.length > 0 && l.cards.length < base.cards.length, '筛选确实收窄了列表');
    assert.equal(l.cards.length, base.cards.filter((c) => c.promo).length);
    l.cards.forEach((c) => {
      assert.equal(c.promo, true);
      assert.ok(c.tags.some((t) => t.t === T.price.special && t.promo), c.name + ' 带「特价仓」标签');
      if (c.row) assert.equal(c.row.special, true, c.name + ' 展示的仓位是特价仓');
    });
    assert.equal(l.filtered, true);
  }
  // 页面上走一遍：服务面板勾「特价仓」→ 确定
  fresh(N(3.5), true);
  const pg = await page('pages/stores/index');
  const before = pg.data.total;
  pg.onSheet({ currentTarget: { dataset: { k: 'services' } } }); pg.onOfferOption({ currentTarget: { dataset: { k: 'promo' } } }); await pg.onSheetConfirm(); await tick();
  assert.ok(pg.data.total < before); assert.equal(pg.data.svcN, 1);
  pg.data.items.filter((x) => x.type === 'store').forEach((x) => assert.equal(x.card.promo, true));
  pg.onUnload();
});

test('A2-03 / A2-06：门店详情无匹配写明本店可租容量范围（规则不变）；合计只够接近的组合用线框「立即下单」', async () => {
  const need = N(25); fresh(need, true);
  const all = await api.getStores({ city: '北京' }), bj01 = all.find((s) => s.id === 'SIM_BJ01');
  const d = finder.buildStoreDetail(bj01, ctx(need, true), { category: 'all' });
  assert.equal(d.situation, 'nomatch'); assert.deepEqual([d.rows.length, d.near.length, d.smaller.length], [0, 0, 0], '无匹配仍不列更小的仓位（规则待裁，未改）');
  assert.match(d.card.rangeText, /^[\d.]+–[\d.]+m³$/);
  const wxml = read('pages/store/detail.wxml');
  assert.match(wxml, /wx:if="\{\{situation === 'nomatch' && card\.rangeText\}\}"[^>]*>\{\{T\.d\.rangeLine\}\}<text class="mk-num">\{\{card\.rangeText\}\}<\/text>/);
  assert.equal(T.detail.rangeLine, '本店可租容量 ');
  // 接近的组合：线框；足额的组合：实心
  let nearCombo = 0, fullCombo = 0;
  for (const cap of [9, 15, 29]) {
    const n = N(cap);
    all.forEach((s) => finder.buildStoreDetail(s, ctx(n, true), { category: 'all' }).combos.forEach((c) => {
      const vol = c.id.split(',').reduce((a, id) => a + s.units.find((u) => u.id === id).volume, 0), st = matching.fit(vol, cap).state;
      assert.equal(c.cta, T.cta.order);
      if (st === 'near') { nearCombo++; assert.equal(c.secondary, true); assert.ok(c.nearText); } else { fullCombo++; assert.ok(!c.secondary); }
    }));
  }
  assert.ok(nearCombo > 0 && fullCombo > 0);
  // 仓位推荐页的接近方案同样是线框「立即下单」
  const m = finder.buildMatch(all, ctx(N(29), true));
  assert.equal(m.mode, 'near'); m.cards.forEach((c) => assert.deepEqual([c.lines[0].cta, c.lines[0].secondary], [T.cta.order, true]));
});

test('A2-05 / A2-07：容量差额标签用警示语义类；无匹配页的浏览卡也写可租容量', async () => {
  const card = read('components/mk-store-card/index.wxml'), det = read('pages/store/detail.wxml');
  assert.equal((card.match(/class="mk-tag mk-tag--warn sc-tier">\{\{(card|item)\.nearText\}\}/g) || []).length, 2);
  assert.match(det, /class="mk-tag mk-tag--warn sd-tier">\{\{item\.row\.nearText\}\}/);
  assert.doesNotMatch(card + det, /mk-tag--promo s[cd]-tier/);
  assert.match(card, /<view wx:elif="\{\{card\.rangeText\}\}" class="sc-spec"><text class="mk-sub sc-lab">\{\{T\.range\}\}<\/text>/);
  fresh(N(35), true);
  const pg = await page('pages/stores/index');
  assert.equal(pg.data.noMatch, true);
  const st = pg.data.items.filter((x) => x.type === 'store');
  assert.deepEqual(st.slice(0, 3).map((x) => x.variant), ['plain', 'plain', 'compact']);
  st.slice(0, 3).forEach((x) => { assert.equal(x.card.row, null); if (x.card.hasStock) assert.ok(x.card.rangeText); });
  pg.onUnload();
});

test('A2-10：容量填写——所填容量大于图上代表仓位时，示意图下注明「图为 X m³ 仓位示意」', async () => {
  fresh(null, true);
  const pg = await page('pages/estimate/capacity');
  const big = SI.tiers.large.volume, set = (v) => { pg.onInput({ detail: { value: String(v) } }); };
  set(30); await tick();
  assert.equal(pg.data.illusNote, '图为 ' + big + 'm³ 仓位示意');
  set(big); await tick(); assert.equal(pg.data.illusNote, '', '正好等于代表仓位时不写');
  set(1); await tick(); assert.equal(pg.data.illusNote, '', '不大于代表仓位时不写');
  set(''); await tick(); assert.equal(pg.data.illusNote, '');
  assert.match(read('pages/estimate/capacity.wxml'), /<text wx:if="\{\{illusNote\}\}" class="mk-t-hint cp-illnote">\{\{illusNote\}\}<\/text>/);
  pg.onUnload();
});

test('A2-11 / A2-12：无匹配空态次按钮统一「修改需求」；全城售罄换一句说明，售罄门店不出免费运输标签', async () => {
  assert.equal(T.match.modifyCap, T.stores.modifyNeed); assert.equal(T.detail.modifyCap, T.stores.modifyNeed);
  const need = N(3.5); fresh(need, true, 'city_soldout');
  const all = await api.getStores({ city: '北京' });
  const l = finder.buildList(all, ctx(need, true), {}), m = finder.buildMatch(all, ctx(need, true));
  assert.deepEqual([l.noMatch, l.soldOut, m.mode, m.soldOut], [true, true, 'none', true]);
  l.cards.forEach((c) => { assert.equal(c.hasStock, false); assert.equal(c.freeTransportTag, ''); assert.ok(!c.tags.some((t) => t.t === T.card.freeTransport), c.name); });
  const sl = await page('pages/stores/index'); assert.equal(sl.data.emptySub, T.stores.emptySoldOut); sl.onUnload();
  const mt = await page('pages/match/index'); assert.equal(mt.data.noneSub, T.match.noneSoldOut); mt.onUnload();
  // 有库存、只是容量对不上：原句不变；有库存的远店照常出免费运输标签
  const big = N(35); fresh(big, true);
  const all2 = await api.getStores({ city: '北京' }), l2 = finder.buildList(all2, ctx(big, true), {});
  assert.deepEqual([l2.noMatch, l2.soldOut, finder.buildMatch(all2, ctx(big, true)).soldOut], [true, false, false]);
  const sl2 = await page('pages/stores/index'); assert.equal(sl2.data.emptySub, T.stores.emptySub); sl2.onUnload();
  const n35 = N(3.5); fresh(n35, true); const b = finder.buildList(all2, ctx(n35, true), {});
  assert.ok(b.cards.some((c) => c.freeTransportTag === T.card.freeTransport && c.hasStock));
  b.cards.filter((c) => !c.hasStock).forEach((c) => assert.equal(c.freeTransportTag, ''));
});

test('E2-01 / D2-01：任务卡「另有 N 处在租仓位」与「我的仓位」同一口径；在「我的」页不出这一句', async () => {
  for (const id of ['member_multi', 'member_inbox']) {
    fresh(null, true); assert.ok(demo.applyScenario(id));
    const orders = await api.getOrders({}), assets = rules.activeAssets(orders);
    const c = await taskCard();
    const n = assets.filter((o) => o.id !== c.data.main.orderId).length;
    assert.ok(n >= 3, id + '：除主卡外至少 3 处（原先只数出 2 处）');
    assert.equal(c.data.main.othersText, '另有 ' + n + ' 处在租仓位，请在订单中查看。');
    assert.equal(n + 1, assets.length, id + '：主卡 1 处 + 另有 N 处 = 我的仓位总数');
    c.__detach();
  }
  assert.deepEqual(TT.task.others, ['另有 ', ' 处在租仓位，请在订单中查看。']);
  // 在「我的」页：紧接着就是「我的仓位」列表，任务卡不重复说
  fresh(null, true); assert.ok(demo.applyScenario('member_multi'));
  const raw = global.getCurrentPages;
  global.getCurrentPages = () => [{ route: routes.MINE.replace(/^\//, '') }];
  try { const c = await taskCard(); assert.equal(c.data.show, true); assert.equal(c.data.main.othersText, ''); c.__detach(); } finally { global.getCurrentPages = raw; }
  // 只有一处在租：不出
  fresh(null, true); assert.ok(demo.applyScenario('member_expiring'));
  const one = await taskCard(); assert.equal(one.data.show, true); assert.equal(one.data.main.othersText, ''); one.__detach();
});

test('E2-12 / E2-13 / E2-14：验仓未通过不重复写结果；押金退款未成功的标题与标签一致；租期已到期的小标题不再写「退仓服务」', async () => {
  fresh(null, true); assert.ok(demo.applyScenario('member_inspect_failed'));
  let c = await taskCard();
  assert.deepEqual([c.data.main.title, c.data.main.badge], ['验仓未通过', '需重新验仓']);
  assert.deepEqual(c.data.main.facts.map((x) => x.l), ['计划取空']);
  assert.ok(!c.data.main.facts.some((x) => x.v === c.data.main.badge)); c.__detach();
  fresh(null, true); assert.ok(demo.applyScenario('member_refund_failed'));
  c = await taskCard();
  assert.deepEqual([c.data.main.title, c.data.main.badge, c.data.main.badgeTone], ['押金退款未成功', '退款未成功', 'err']);
  assert.equal(c.data.main.title, TT.head.refund_failed[0], '与订单详情状态头同一句'); c.__detach();
  fresh(null, true); assert.ok(demo.applyScenario('member_overdue'));
  c = await taskCard();
  assert.deepEqual([c.data.main.key, c.data.main.kicker, c.data.main.primary.t, c.data.main.secondary.t], ['expired_lease', '我的仓位', '办理续租', '办理退仓']); c.__detach();
  // 状态标签改用全站 mk-tag，组件不再自带 tk-badge（E2-09）；提示条垂直居中（D2-17）
  const wxml = read('components/mk-task-card/index.wxml'), wxss = read('components/mk-task-card/index.wxss');
  assert.match(wxml, /class="mk-tag mk-tag--\{\{main\.badgeTone\}\} mk-tag--end mk-num tk-tag"/);
  assert.doesNotMatch(wxml + wxss, /tk-badge(?!；)/);
  ['ok', 'warn', 'err'].forEach((t) => assert.match(read('app.wxss'), new RegExp('\\.mk-tag--' + t + '\\b')));
  assert.match(wxss, /\.tk-note \{ display: flex; align-items: center;/);
});

test('E2-15：预约记录一句话——受理后超过 needsAckHours 改成中性句，窗口内仍写承诺句', async () => {
  fresh(null, true); assert.ok(demo.applyScenario('member_leads'));
  let c = await taskCard();
  const strip = () => c.data.todos.find((t) => t.id === 'lead');
  // 场景里最近一条是 1 小时前的预约（另有 30 小时前的看仓、已撤回的咨询）：取最近一条，仍在窗口内
  assert.ok(strip()); assert.ok([TT.task.todoLeadIn, TT.task.todoLeadOff].includes(strip().t), '1 小时前提交：窗口内');
  assert.equal(c.latestLead().type, 'booking');
  c.__detach();
  db.leads.forEach((l) => { l.accepted_at = Date.now() - (CA.needsAckHours + 1) * 3600e3; });
  c = await taskCard();
  assert.equal(strip().t, '已提交，待顾问联系');
  c.__detach();
  // 没有需求、只有预约记录时主卡的副句同样处理
  state.set('requirement', null);
  c = await taskCard();
  assert.deepEqual([c.data.main.key, c.data.main.sub], ['booking', TT.task.todoLeadWait]); c.__detach();
});

test('首页首屏：轮播容器裁切溢出，「找附近门店」一行在轮播下方（评审图里被盖住是预览工具把 swiper 竖排造成的）', () => {
  const wxml = read('pages/home/index.wxml'), wxss = read('pages/home/index.wxss');
  assert.ok(wxml.indexOf('class="hm-banner"') < wxml.indexOf('class="hm-findrow"'));
  assert.match(wxml, /<view wx:if="\{\{banners\.length\}\}" class="hm-banner">\s*<swiper class="hm-swiper"/);
  assert.match(wxss, /\.hm-banner \{ position: relative; height: 300rpx; overflow: hidden;/);
  assert.match(wxss, /\.hm-find \{ padding: 0; overflow: hidden; \}/);
});
