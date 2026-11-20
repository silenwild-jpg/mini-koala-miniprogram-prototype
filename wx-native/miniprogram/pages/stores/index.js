// 附近门店 S01（第 1 批）。
// 已做：城市位（圆点 + 轻气泡、无门店城市气泡，同首页）与搜索入口（打开用仓位置面板）；
//       筛选条（FIX-01 R-17 / R-18）：排序、距离、服务三项，点开后在筛选条正下方原位下拉；排序与距离单选即生效，
//       服务面板分「优惠」（特价仓、免费运输）与「服务设施」两组，多选后点「确定」生效；
//       「免费运输」没有用仓位置时先打开面板并说明，选定后自动应用；
//       需求条与修改需求弹层；浏览卡 / 标准卡（前 2 家）/ 第 3 位考拉E存卡 / 紧凑卡（第 4 家起）；接近方案卡；该店暂无匹配；
//       无匹配页（空态 + E存 + 附近门店浏览）、30m³ 及以上交顾问、5km 内无门店兜底（最近 3 家 + E存 + 留下用仓需求，D-128）、
//       用仓位置选了区域 / 商圈时只看该范围；未登录「查看报价」/ 登录后「立即下单」走登录守卫；顾问卡；分页；加载骨架与失败 / 断网。
// 未做：门店卡照片（没有核验过的门店实拍）；「暂停营业」卡（接口只返回营业门店）。距离筛选的三档选项冻结稿没有画，本轮自定。
const T = require('../../i18n/find');
const Z = require('../../i18n/zh');
const C = require('../../core/config');
const CF = require('../../core/config-find');
const state = require('../../services/state');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const finder = require('../../services/finder');
const location = require('../../services/location');
const pd = require('../../services/page-data');
const share = require('../../services/share');
const flow = require('../../services/estimate-flow');
const S = T.stores, PAGE = CF.list.pageSize;
const flags = () => { const g = getApp().globalData; if (!g.find) g.find = { bubbleShown: false, nocityClosed: false }; return g.find; };
Page({
  data: {
    T: { stores: pd.plain(S), login: Z.login, leave: T.advisor.leave, hours: S.salesHours(T.lead.hoursNote, T.lead.offHours), salesSub: S.salesSub(T.lead.inHours), switchCity: T.locate.switchCity, search: T.panel.placeholder },
    sys: 'loading', mode: 'browse', cityText: '', located: true, bubble: null, nocity: '', demandText: '', items: [], total: 0, shown: 0, resultText: '', advisor: null,
    noMatch: false, far: false, farTitle: S.farTitle(C.matching.nearbyRadiusKm), farSub: '', filtered: false, hasMore: false,
    sort: 'recommended', maxKm: null, services: [], promo: false, freeTransport: false, sortLabel: S.sort, distLabel: S.distance, svcLabel: S.services,
    sheet: '', sortOptions: [], distOptions: [], svcOptions: [], offerOptions: [], svcOn: false, largeNote: false,
    loginVisible: false, panel: false, panelNote: '', panelFocus: false, demandSheet: false
  },
  onShow() {
    this.refresh();
    const loc = state.get().location, f = flags();
    if (loc.status !== 'granted' && !f.bubbleShown) { // 气泡每次启动最多出现一次（与首页共用一个标记）
      f.bubbleShown = true; this.setData({ bubble: location.hint() });
      this._bt = setTimeout(() => this.hideBubble(), C.timers.locationBubbleSeconds * 1000);
    }
  },
  onHide() { this.hideBubble(); },
  onPageScroll() { if (this.data.bubble) this.hideBubble(); },
  onPullDownRefresh() { this.refresh().then(() => wx.stopPullDownRefresh()); },
  onShareAppMessage() { return share.message(routes.STORES); },
  hideBubble() { if (this._bt) { clearTimeout(this._bt); this._bt = null; } if (this.data.bubble) this.setData({ bubble: null }); },
  filter() { const d = this.data; return { sort: d.sort, maxKm: d.maxKm, services: d.services, promo: d.promo, freeTransport: d.freeTransport }; },
  refresh() {
    const loc = state.get().location;
    this._hasPoint = loc.kind !== 'city' || loc.status === 'granted';
    this.setData({
      cityText: loc.label && loc.kind !== 'point' ? loc.label : loc.city, located: loc.status === 'granted',
      nocity: loc.noStoreCity && !flags().nocityClosed ? T.locate.noStoreCity(loc.noStoreCity, loc.city) : ''
    });
    return pd.load(this, pd.cityStores(), (stores) => {
      this._svc = finder.serviceOptions(stores);
      this._list = finder.buildList(stores, pd.ctx(), this.filter());
      this.paint(Math.max(this.data.shown, PAGE));
    });
  },
  // 把列表切成要显示的条目：前 2 家标准卡、第 3 位考拉E存卡、其余紧凑卡
  paint(want) {
    const l = this._list;
    if (!l) return;
    const d = this.data, farMode = l.far && !this._showAll;
    const n = Math.min(farMode ? C.matching.nearbyFallbackStores : Math.max(PAGE, Number(want) || PAGE), l.total);
    const items = [];
    l.cards.slice(0, n).forEach((c, i) => {
      if (i === CF.list.estoreSlot && !l.noMatch && !farMode) items.push({ key: 'estore', type: 'estore' });
      const browse = l.noMatch ? Object.assign({}, c, { row: null, emptyText: c.hasStock ? '' : T.card.noStock }) : c; // 无匹配页的门店按浏览卡显示；满仓的仍写「暂无可租仓位」（A-12）
      items.push({ key: c.id, type: 'store', variant: i < CF.list.standardCards ? (l.noMatch ? 'plain' : 'standard') : 'compact', card: browse });
    });
    if (!l.noMatch && !farMode && n <= CF.list.estoreSlot && l.mode !== 'sales') items.push({ key: 'estore', type: 'estore' });
    const picked = d.services.length + (d.promo ? 1 : 0) + (d.freeTransport ? 1 : 0);
    this.setData({
      mode: l.mode, demandText: l.demandText, total: l.total, shown: n, items, advisor: farMode ? null : l.advisor, noMatch: l.noMatch, far: farMode, filtered: l.filtered,
      farSub: S.farSub(n), hasMore: l.total > n, // 无匹配页也可翻页（A-12）
      resultText: l.expanded && !farMode ? S.expanded : '', // 「共 N 家门店 · 已显示前 N 家」已删（FIX-01 R-22）
      largeNote: !!l.large && l.mode !== 'sales' && !l.noMatch, // 无匹配时空态卡已有「立即咨询」，不重复 // 30m³ 及以上：给一句建议联系顾问（W37 #22，A-14），不拦自助找仓
      sortLabel: d.sort === 'recommended' ? S.sort : S.sortOptions[d.sort], distLabel: d.maxKm === null ? S.distance : S.within(d.maxKm),
      svcLabel: picked ? S.svcCount(picked) : S.services, svcOn: picked > 0
    });
  },
  apply(part) { this.setData(Object.assign({ shown: 0, sheet: '' }, part)); this._showAll = false; return this.refresh(); },
  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },
  onMore() { if (this.data.far) { this._showAll = true; this.paint(PAGE); return; } this.paint(this.data.shown + PAGE); },
  // ---- 用仓位置 ----
  onCity() { this.hideBubble(); this.setData({ panel: true, panelNote: '', panelFocus: false }); },
  onSearch() { this.hideBubble(); this.setData({ panel: true, panelNote: '', panelFocus: true }); },
  onPanelClose() { this.setData({ panel: false }); this._wantFree = false; this._wantPart = null; },
  onLocationChange() { flags().nocityClosed = true; const want = this._wantFree, part = this._wantPart; this._wantFree = false; this._wantPart = null; this.apply(Object.assign({}, part || {}, want ? { freeTransport: true } : {})); },
  onBubbleAction() { const b = this.data.bubble; this.hideBubble(); location.act(b ? b.kind : 'retry').then(() => this.refresh()); },
  onCloseNocity() { flags().nocityClosed = true; this.setData({ nocity: '' }); },
  onSwitchCity() { flags().nocityClosed = true; this.setData({ nocity: '', panel: true, panelNote: '', panelFocus: false }); },
  // ---- 排序与筛选（原位下拉：点筛选条的一项，在它正下方展开；再点同一项或点遮罩收起）----
  onSheet(e) {
    const k = e.currentTarget.dataset.k, d = this.data;
    this.hideBubble();
    if (d.sheet === k) { this.setData({ sheet: '' }); return; }
    if (k === 'sort') this.setData({ sheet: 'sort', sortOptions: ['recommended', 'distance', 'price'].map((v) => ({ v, t: S.sortOptions[v], on: v === d.sort })) });
    else if (k === 'distance') this.setData({ sheet: 'distance', distOptions: [{ v: -1, t: S.anyDistance, on: d.maxKm === null }].concat(CF.list.distanceOptionsKm.map((v) => ({ v, t: S.within(v), on: v === d.maxKm }))) });
    else if (k === 'services') this.setData({
      sheet: 'services', svcOptions: (this._svc || []).filter((t) => t !== T.price.special).map((t) => ({ t, on: d.services.indexOf(t) >= 0 })),
      offerOptions: [{ k: 'promo', t: S.promo, on: !!d.promo }, { k: 'freeTransport', t: S.freeTransport, on: !!d.freeTransport }]
    });
  },
  onSheetClose() { this.setData({ sheet: '' }); },
  noop() {},
  onOption(e) { // 排序、距离：单选，点了就生效并收起
    const v = e.currentTarget.dataset.v;
    const part = this.data.sheet === 'sort' ? { sort: ['distance', 'price'].indexOf(v) >= 0 ? v : 'recommended' } : this.data.sheet === 'distance' ? { maxKm: Number(v) > 0 ? Number(v) : null } : null;
    if (!part) return;
    // 按距离排序 / 筛选需要一个起点：没有用仓位置时先打开面板并说明，选定后自动应用（与「免费运输」同一做法，A-04）
    if (!this._hasPoint && (part.sort === 'distance' || part.maxKm)) { this._wantPart = part; this.setData({ sheet: '', panel: true, panelNote: T.panel.distanceNote, panelFocus: false }); return; }
    return this.apply(part);
  },
  onSvcOption(e) { const t = e.currentTarget.dataset.t; this.setData({ svcOptions: this.data.svcOptions.map((o) => (o.t === t ? { t: o.t, on: !o.on } : o)) }); },
  onOfferOption(e) { const k = e.currentTarget.dataset.k; this.setData({ offerOptions: this.data.offerOptions.map((o) => (o.k === k ? Object.assign({}, o, { on: !o.on }) : o)) }); },
  onSvcClear() { this.setData({ svcOptions: this.data.svcOptions.map((o) => ({ t: o.t, on: false })), offerOptions: this.data.offerOptions.map((o) => Object.assign({}, o, { on: false })) }); },
  // 服务面板「确定」：服务设施多选 + 特价仓 + 免费运输一起生效。
  // 「免费运输」没有用仓位置时先不置为选中，其余照常生效，然后打开用仓位置面板并说明，选定后自动应用（交接 v1.0 §4.5-7）
  onSheetConfirm() {
    const d = this.data;
    if (d.sheet !== 'services') { this.setData({ sheet: '' }); return; }
    const on = (k) => !!(d.offerOptions.find((x) => x.k === k) || {}).on;
    const wantFree = on('freeTransport'), needPoint = wantFree && !d.freeTransport && !this._hasPoint;
    const done = this.apply({ services: d.svcOptions.filter((x) => x.on).map((x) => x.t), promo: on('promo'), freeTransport: wantFree && !needPoint });
    if (needPoint) { this._wantFree = true; this.setData({ panel: true, panelNote: T.panel.transportNote, panelFocus: false }); }
    return done;
  },
  // 下面两个不再有界面入口（原快捷项已并入服务面板），保留给脚本与测试直接切换
  onFilterPromo() { return this.apply({ promo: !this.data.promo }); },
  onFilterFree() {
    if (!this.data.freeTransport && !this._hasPoint) { this._wantFree = true; this.setData({ panel: true, panelNote: T.panel.transportNote, panelFocus: false }); return; }
    return this.apply({ freeTransport: !this.data.freeTransport });
  },
  onClearFilters() { this.apply({ sort: 'recommended', maxKm: null, services: [], promo: false, freeTransport: false }); },
  // ---- 需求 ----
  // 已有需求：在本页弹层里改（弹层里保留「按物品估算」「AI 估算」入口）；还没有需求：去估算，完成后回到本页（FIX-01 R-19）
  onModify() { if (state.get().requirement) this.setData({ demandSheet: true, sheet: '' }); else this.onEstimate(); },
  onDemandClose() { this.setData({ demandSheet: false }); },
  onDemandChange() { this.apply({}); },
  onDemandSales(e) { wx.navigateTo({ url: routes.BOOKING + '?mode=advisor&cap=' + ((e.detail && e.detail.capacity_m3) || '') }); },
  onEstimate() { flow.start(routes.STORES); wx.navigateTo({ url: routes.CAPACITY }); },
  onAdvisorLead() { wx.navigateTo({ url: routes.BOOKING + '?mode=advisor' }); },
  onStore(e) { wx.navigateTo({ url: routes.STORE_DETAIL + '?id=' + e.detail.id }); },
  onAction(e) {
    const d = e.detail || {};
    if (d.cta === T.cta.quote) return auth.openLogin(this); // 未登录：打开登录层，成功后回到本页显示整期价
    const r = state.get().requirement;
    if (d.cta === T.cta.order && r) return auth.navigate(this, routes.CONFIRM + '?unit=' + d.unitId + '&term=' + r.term_months);
    wx.navigateTo({ url: routes.STORE_DETAIL + '?id=' + d.storeId });
  },
  onLoginClose() { this.setData({ loginVisible: false }); },
  onLoginSuccess() { this.refresh(); }
});
