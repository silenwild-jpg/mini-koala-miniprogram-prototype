// 门店详情 S02（第 1 批）。
// 已做：头部（店名 + 导航 / 电话图标按钮、存取时间、属性标签、地址与距离；无需求且在「可选仓位」页签时店名右侧弱化显示门店起价，D-138）、
//       收藏（存本机）与分享、需求条与修改需求弹层、三个页签；
//       可选仓位：仓型筛选、匹配仓位、组合方案、容量接近的仓位（可直接下单并写明差额）、比需求小的仓位（按 X m³ 重新匹配）、
//                 已租出仓位折叠、本店无匹配 / 无可租 / 30m³ 及以上交顾问、其他匹配门店和仓位、顾问卡（一页一次）、所选仓位已不可租提示；
//       服务设施：存取与安防、仓内环境、到店与搬运、预约运输 / 搬运入口；
//       到店指引（D-122）：位置示意与到店导航、入口与停车卸货（通行限制在这里）、进仓路径、地铁与公交、导航入口选择、地图加载失败。
// 门店头图与仓位空间示意图（FIX-01）：路径由 services/media.js 给；头图是没有逐店核验的示意图，图上标「门店示意图」；仓位图按容量分 4 档，不是该仓位的照片。
// 未做：照片上的自定义导航栏（用原生导航栏）。
// IMPL-01（2026-11-21 视觉升级）：顶部多图横滑 + 点击放大；头部只留店名、标签、起价、地址与距离一组（右侧导航图标）；
//       三个页签改同页上下三段（页签吸顶，随滚动高亮，点页签滚到对应段）；需求与仓型筛选合成一行；仓位行去图，仓型分组标题处放空间示意；
//       服务设施改图标加文字的宫格（存取时间在这里）；到店指引加原生地图块（整块可点调起导航）；
//       底部固定底栏：收藏 / 分享 / 预约看仓 + 在线问 / 打电话（页面内原来的预约看仓、电话图标、收藏分享行取消）。
// 到店资料按字段显示，缺的行不显示、不推断；演示环境只有安贞·富仁名苑店带演示档案。
const T = require('../../i18n/find');
const CF = require('../../core/config-find');
const api = require('../../services/api');
const state = require('../../services/state');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const finder = require('../../services/finder');
const pd = require('../../services/page-data');
const req = require('../../core/requirement');
const matching = require('../../core/matching');
const media = require('../../services/media');
const share = require('../../services/share');
const flow = require('../../services/estimate-flow');
const motion = require('../../core/motion');
const fmt = require('../../core/format');
const D = T.detail, CATS = ['all'].concat(CF.unitCategories.map((c) => c.key));
// 服务设施：统一成图标加文字的宫格。第一格是存取时间；门店有补全档案（profile.fac，演示数据）时照档案列，没有时只写门店数据里有的项。
const FAC_ICON = { hours: 'clock-ink', lift: 'elev-ink', climate: 'temp-ink', security: 'cam-ink', lock: 'lock-ink', cart: 'cart-ink', dock: 'truck-ink', park: 'car-ink', metro: 'train-ink', other: 'check-ink' };
function facilityGrid(store, profile) {
  const tags = store.tags || [], S = D.svc, p = profile || {}, svc = p.svc || {}, out = [], seen = {};
  const add = (key, k, v) => { if (!k || seen[k]) return; seen[k] = 1; seen[key] = 1; out.push({ key, icon: FAC_ICON[key] || FAC_ICON.other, k, v: v || '' }); };
  if (store.access_hours) add('hours', S.hours, store.access_hours);
  if (p.fac && p.fac.length) p.fac.forEach((f) => add(f[0], f[1], f[2]));
  else {
    tags.forEach((t) => add(S.securityTags.indexOf(t) >= 0 ? 'security' : t === S.climateTag ? 'climate' : (S.tagKinds[t] || 'other'), t, ''));
    ['lift', 'cart', 'dock', 'park', 'metro'].forEach((x) => { if (svc[x] && !seen[x]) add(x, S[x], ''); });
    add('lock', S.lock, S.lockHint);
  }
  return out;
}
// 仓型分组标题：仓型名 + 容量范围 + 空间示意图（按容量分档的示意，不是尺寸图）
function catHead(cat, row) {
  const list = CF.unitCategories, i = list.findIndex((c) => c.key === cat), lo = i > 0 ? list[i - 1].maxM3 : null, hi = i >= 0 && Number.isFinite(list[i].maxM3) ? list[i].maxM3 : null;
  const range = lo === null ? T.cap.refWithin(hi) : hi === null ? T.cap.refOver(lo) : T.cap.refRange(lo, hi);
  return { cat, title: D.catHead(T.unitCategories[cat], range), usage: row.usage || '', thumb: (row.thumbs && row.thumbs[0]) || '' };
}
function routeModel(store, profile) {
  const p = profile || {}, pair = (r) => ({ k: r[0], v: r[1], key: !!r[2] });
  return {
    pins: (p.pins && p.pins.length ? p.pins : [D.route.storePin]), mapNote: p.mapNote || store.address,
    entry: (p.entry || []).map(pair), steps: p.steps || [], path: p.path || '', facts: (p.facts || []).map(pair),
    transit: (p.transit || []).map(pair), transitMore: (p.transitMore || []).map(pair),
    askText: p.ask ? D.route.askPartial : D.route.ask, dests: p.dests || []
  };
}
Page({
  data: {
    T: { d: pd.plain(D), cubic: T.price.cubicFrom, cta: T.cta, cats: T.unitCategories },
    visitVisible: false, visitStore: null, visitUnit: '', hero: '', gallery: [], heroIndex: 0, favBump: '', sys: 'loading', card: null, tab: 0, tabs: D.tabs, demandText: '', hasNeed: false, fav: false, gone: false,
    situation: '', cats: [], blocks: [], rows: [], near: [], smaller: [], over: [], showLow: true, sold: [], soldOpen: false, combos: [], comboMode: '', combosOpen: false, noSingleText: '', catEmpty: false,
    alternatives: [], showAlternatives: false, advisor: null, headPrice: null, salesSub: D.salesSub(T.lead.inHours),
    arrSys: 'loading', svc: [], route: null, geo: null, markers: [], mapScale: CF.detail.mapScale, transitOpen: false, destSheet: false, loginVisible: false, demandSheet: false
  },
  onLoad(q) {
    q = q || {};
    this._id = q.id; this._unit = q.unit || ''; this._gone = q.gone === '1'; this._cat = 'all';
    const tab = Number(q.tab); if (tab === 1 || tab === 2) { this.setData({ tab }); this._initTab = tab; } // 带页签进入：到店资料回来后滚到对应段
    if (wx.showShareMenu) wx.showShareMenu({ menus: ['shareAppMessage'] });
  },
  onShow() { this.refresh(); },
  onUnload() { this._unloaded = true; motion.dispose(this); },
  // 随滚动高亮对应页签：量三段的位置，最后一个已经滚到吸顶页签下沿的段就是当前段。上一次量完之前不重复量；点页签触发的滚动期间不改高亮。
  onPageScroll() {
    if (this._spying || this._unloaded || this.data.sys || Date.now() < (this._spyLock || 0)) return;
    this._spying = true;
    wx.createSelectorQuery().selectAll('.sd-anchor').boundingClientRect().exec((res) => {
      this._spying = false;
      const rects = (res && res[0]) || [];
      if (this._unloaded || !rects.length || Date.now() < (this._spyLock || 0)) return;
      let tab = 0; const line = this.tabsPx() + 4;
      rects.forEach((r, i) => { if (r && r.top <= line) tab = i; });
      if (tab !== this.data.tab) this.setData({ tab });
    });
  },
  tabsPx() {
    if (!this._tabsPx) { const w = ((wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()) || {}).windowWidth || 375; this._tabsPx = Math.round(CF.detail.tabBarRpx * w / 750); }
    return this._tabsPx;
  },
  scrollToTab(i, duration) { this._spyLock = Date.now() + CF.detail.tabLockMs; wx.pageScrollTo({ selector: '#sd-sec-' + i, offsetTop: -this.tabsPx(), duration }); },
  onShareAppMessage() { return share.message(routes.STORE_DETAIL, { title: (this.data.card && this.data.card.name) || '', query: 'id=' + (this._id || ''), imageUrl: this.data.hero }); },
  refresh() {
    return pd.load(this, api.getStore({ id: this._id }), (store) => {
      this._store = store;
      const gallery = media.storeGallery(store);
      this.setData({ visitStore: store, visitUnit: this._unit, hero: media.storeHero(store), gallery, heroIndex: Math.min(this.data.heroIndex, gallery.length - 1) });
      wx.setNavigationBarTitle({ title: store.name });
      this.paint();
      this.loadArrival();
    });
  },
  paint() {
    const store = this._store;
    if (!store) return;
    const ctx = pd.ctx(), d = finder.buildStoreDetail(store, ctx, { category: this._cat }), r = ctx.requirement;
    const fav = (rows) => rows.map((x) => Object.assign({}, x, { fav: pd.isFavorite('units', x.favId) }));
    const picked = this._unit ? store.units.find((u) => u.id === this._unit) : null;
    // 仓位区按顺序排成一列：匹配仓位 → 说明句 → 组合方案 → 容量接近 → 比需求小 → 更大的仓位（超过需求 130%，R-11）
    const blocks = [], unit = (list) => (x, i) => blocks.push({ key: list + i, type: list === 'combos' ? 'combo' : 'unit', list, i, row: x });
    const rows = fav(d.rows), near = fav(d.near), smaller = fav(d.smaller), over = fav(d.over);
    rows.forEach(unit('rows'));
    if (d.noSingleText) blocks.push({ key: 'note', type: 'note', text: d.noSingleText });
    if (d.comboMode === 'fold') blocks.push({ key: 'fold', type: 'fold', text: D.showCombos });
    if (d.comboMode === 'open' || (d.comboMode === 'fold' && this.data.combosOpen)) { blocks.push({ key: 'ct', type: 'title', text: D.comboTitle }); d.combos.forEach(unit('combos')); }
    if (near.length) { blocks.push({ key: 'nt', type: 'title', text: D.nearTitle }); near.forEach(unit('near')); }
    if (smaller.length) { blocks.push({ key: 'st', type: 'title', text: D.smallTitle }); smaller.forEach(unit('smaller')); }
    if (over.length) { blocks.push({ key: 'ot', type: 'title', text: D.overTitle }); over.forEach(unit('over')); }
    // 仓型分组标题（M-11）：每种仓型第一次出现的单仓行前面放一次仓型标题和空间示意（一页里同一仓型只出一次）
    const seenCat = {};
    blocks.forEach((b, i) => {
      b.first = i === 0 || blocks[i - 1].type === 'title' || blocks[i - 1].type === 'note' || blocks[i - 1].type === 'fold'; // 小标题后的第一行不画行间线
      if (b.type !== 'unit') return;
      const u = store.units.find((x) => x.id === b.row.id), cat = u ? finder.categoryOf(u.volume) : '';
      if (cat && !seenCat[cat]) { b.head = catHead(cat, b.row); seenCat[cat] = 1; }
    });
    this.setData({
      card: d.card, fav: pd.isFavorite('stores', store.id),
      hasNeed: !!r, demandText: r ? (r.input_unit === 'm2' && Number(r.input_value) > 0 ? '' : '约 ') + req.demandText(r) + ' · 租 ' + r.term_months + T.unit.month : '', // 按面积填的写「6㎡ · 约15m³」（A-11）
      situation: d.situation, cats: CATS.map((k) => ({ k, t: T.unitCategories[k], on: k === d.category })),
      rows, near, smaller, over, showLow: d.showLow, blocks,
      sold: d.sold.map((x) => { const u = store.units.find((y) => y.id === x.id); return Object.assign({}, x, u ? { code: u.code, volText: fmt.pretty(u.volume) + 'm³' } : { code: '', volText: x.name }); }), // 已租出的行同样把容量和仓号分开写
      combos: d.combos, comboMode: d.comboMode,
      noSingleText: d.noSingleText, catEmpty: d.catEmpty, advisor: d.advisor, headPrice: d.headPrice, showAlternatives: d.showAlternatives,
      gone: this._gone || (!!picked && !matching.isAvailable(picked))
    });
    if (d.showAlternatives && r) pd.cityStores().then((stores) => this.setData({ alternatives: finder.buildAlternatives(stores, pd.ctx(), store.id) })).catch(() => this.setData({ alternatives: [] }));
    else this.setData({ alternatives: [] });
    this.paintArrival();
  },
  // 到店资料（坐标、电话、到店档案）单独取：取不到不影响看仓位
  loadArrival() {
    this.setData({ arrSys: 'loading' });
    const after = () => { // 带页签进入（?tab=1/2）：三段都排好之后滚到对应段，只做一次
      this.paintArrival();
      if (this._initTab && !this._unloaded) { const t = this._initTab; this._initTab = 0; wx.nextTick(() => { if (!this._unloaded) this.scrollToTab(t, 0); }); }
    };
    return api.getStoreArrival({ id: this._id }).then((a) => { this._arrival = a; this.setData({ arrSys: '' }); after(); })
      .catch(() => { this._arrival = null; this.setData({ arrSys: 'failed' }); after(); });
  },
  paintArrival() {
    if (!this._store) return;
    const p = this._arrival && this._arrival.profile;
    const geo = (this._arrival && this._arrival.geo) || null, px = CF.detail.mapMarkerPx;
    this.setData({
      svc: facilityGrid(this._store, p), route: routeModel(this._store, p), geo,
      markers: geo ? [{ id: 1, latitude: geo.latitude, longitude: geo.longitude, iconPath: media.mapPin, width: px, height: px }] : []
    });
  },
  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },
  onRetryArrival() { this.loadArrival(); },
  onTab(e) { const i = Number(e.currentTarget.dataset.i); if (i === 0 || i === 1 || i === 2) { this.setData({ tab: i }); this.scrollToTab(i, CF.detail.tabScrollMs); } },
  onSeeRoute() { this.setData({ tab: 2 }); this.scrollToTab(2, CF.detail.tabScrollMs); },
  // ---- 顶部图片：横滑记页码，点击放大 ----
  onHeroChange(e) { const i = Number(e.detail && e.detail.current) || 0; if (i !== this.data.heroIndex) this.setData({ heroIndex: i }); },
  onHeroTap(e) {
    const urls = this.data.gallery || [], i = Number(e.currentTarget.dataset.i) || 0;
    if (urls.length) wx.previewImage({ current: urls[i] || urls[0], urls });
  },
  onCat(e) { const k = e.currentTarget.dataset.k; if (CATS.indexOf(k) >= 0) { this._cat = k; this.paint(); } },
  onAllCats() { this._cat = 'all'; this.paint(); },
  onToggleSold() { this.setData({ soldOpen: !this.data.soldOpen }); },
  onToggleCombos() { this.setData({ combosOpen: !this.data.combosOpen }); this.paint(); },
  onMoreTransit() { this.setData({ transitOpen: true }); },
  // ---- 仓位行 ----
  onAction(e) {
    const ds = e.currentTarget.dataset, list = ['rows', 'near', 'smaller', 'over', 'combos'].indexOf(ds.list) >= 0 ? ds.list : 'rows';
    const row = (this.data[list] || [])[Number(ds.i) || 0];
    if (!row) return;
    const r = state.get().requirement;
    if (row.act === 'rematch') { // 按这个仓位的容量重新匹配：改的是全站那一份需求
      state.setRequirement(Object.assign({ capacity_m3: row.volume, input_unit: 'm3', input_value: row.volume, source: 'manual' }, r && r.term_months ? { term_months: r.term_months } : {}));
      this._cat = 'all'; this.paint(); return;
    }
    if (row.cta !== T.cta.order) { auth.openLogin(this); return; } // 未登录「查看报价」：打开登录层，成功后回到本页显示整期价
    const url = routes.CONFIRM + '?unit=' + row.id + '&term=' + (r ? r.term_months : CF.detail.defaultOrderTerm);
    if (!auth.isLoggedIn()) { auth.navigate(this, url); return; } // 未登录点「立即下单」：在当前页打开登录层（D-198）
    // 下单前再取一次库存：仓位刚被租出时留在本页提示，不带着失效的仓位进确认订单
    api.getStore({ id: this._id }).then((store) => {
      const ok = row.id.split(',').every((id) => matching.isAvailable(store.units.find((u) => u.id === id)));
      if (ok) { auth.navigate(this, url); return; }
      this._store = store; this._gone = true; this.paint();
      wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    }).catch(() => auth.navigate(this, url)); // 库存没取到：照常进入，由确认订单页的报价接口把关
  },
  onFavStore() { const on = pd.toggleFavorite('stores', this._id); this.setData({ fav: on }); motion.bump(this, 'favBump', 'mk-bump mk-bump--center'); pd.toast(on ? D.favOn : D.favOff); },
  onFavUnit(e) { const id = e.currentTarget.dataset.id; if (!id) return; const on = pd.toggleFavorite('units', id); this.paint(); pd.toast(on ? D.favOn : D.favOff); },
  // ---- 导航与电话 ----
  onNavigate() { const dests = (this.data.route && this.data.route.dests) || []; if (dests.length > 1) this.setData({ destSheet: true }); else this.openMap(''); },
  onDest(e) { const d = ((this.data.route && this.data.route.dests) || [])[Number(e.currentTarget.dataset.i) || 0]; this.setData({ destSheet: false }); this.openMap(d ? d.title : ''); },
  onDestClose() { this.setData({ destSheet: false }); },
  openMap(entry) {
    const s = this._store, geo = this._arrival && this._arrival.geo;
    if (!s) return;
    const fallback = () => wx.setClipboardData({ data: s.address, success: () => pd.toast(D.route.navFail), fail: () => pd.toast(D.route.navFail) });
    if (!geo) { fallback(); return; } // 没有坐标：复制地址
    wx.openLocation({ latitude: geo.latitude, longitude: geo.longitude, name: s.name + (typeof entry === 'string' && entry ? ' · ' + entry : ''), address: s.address, scale: CF.detail.mapScale, fail: fallback });
  },
  onCall() {
    const a = this._arrival || {}, phone = String(a.phone || a.hotline || CF.hotline);
    wx.makePhoneCall({ phoneNumber: phone.replace(/-/g, ''), fail: (err) => { if (!/cancel/i.test(String((err && err.errMsg) || ''))) pd.toast(D.route.callFail + phone); } });
  },
  onCopyAddress() { if (this._store) wx.setClipboardData({ data: this._store.address, fail: () => {} }); },
  // ---- 需求与其它入口 ----
  // 已有需求：在本页弹层里改；还没有需求：去估算，完成后回到本页（FIX-01 R-19）
  onModify() { if (state.get().requirement) this.setData({ demandSheet: true }); else this.onEstimate(); },
  onEstimate() { flow.start(routes.STORE_DETAIL); wx.navigateTo({ url: routes.CAPACITY }); },
  onDemandClose() { this.setData({ demandSheet: false }); },
  onDemandChange() { this._cat = 'all'; this.paint(); },
  onDemandSales(e) { wx.navigateTo({ url: routes.BOOKING + '?mode=advisor&store=' + this._id + '&cap=' + ((e.detail && e.detail.capacity_m3) || '') }); },
  onAdvisorLead() { wx.navigateTo({ url: routes.BOOKING + '?mode=advisor&store=' + this._id }); },
  onBooking() { this.setData({ visitVisible: true }); },
  onVisitClose() { this.setData({ visitVisible: false }); },
  onTransport() { wx.navigateTo({ url: routes.TRANSPORT + '?store=' + this._id }); },
  onOtherStores() { wx.switchTab({ url: routes.STORES }); },
  onAlt(e) { const id = e.currentTarget.dataset.id; if (id) wx.redirectTo({ url: routes.STORE_DETAIL + '?id=' + id }); },
  onLoginClose() { this.setData({ loginVisible: false }); },
  onLoginSuccess() { this.paint(); }
});
