// 门店详情 S02（第 1 批）。
// 已做：头部（店名 + 导航 / 电话图标按钮、存取时间、属性标签、地址与距离；无需求且在「可选仓位」页签时店名右侧弱化显示门店起价，D-138）、
//       收藏（存本机）与分享、需求条与修改需求弹层、三个页签；
//       可选仓位：仓型筛选、匹配仓位、组合方案、容量接近的仓位（可直接下单并写明差额）、比需求小的仓位（按 X m³ 重新匹配）、
//                 已租出仓位折叠、本店无匹配 / 无可租 / 30m³ 及以上交顾问、其他匹配门店和仓位、顾问卡（一页一次）、所选仓位已不可租提示；
//       服务设施：存取与安防、仓内环境、到店与搬运、预约运输 / 搬运入口；
//       到店指引（D-122）：位置示意与到店导航、入口与停车卸货（通行限制在这里）、进仓路径、地铁与公交、导航入口选择、地图加载失败。
// 未做：照片上的自定义导航栏与门店实拍照片位（没有核验过的门店实拍，按交接 §4.4-9 不渲染，用原生导航栏）；位置示意只列入口名，不画地图（地图服务未接入）。
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
const D = T.detail, CATS = ['all'].concat(CF.unitCategories.map((c) => c.key));
// 服务设施页签：只写门店数据里有的项
function serviceSections(store, profile) {
  const tags = store.tags || [], S = D.svc, svc = (profile && profile.svc) || {};
  const access = [{ icon: 'ic-clock', k: S.hours, v: store.access_hours ? store.access_hours + S.daily : '' }, { icon: 'ic-shield', k: S.entry, v: S.entryText }];
  if (tags.some((t) => S.securityTags.indexOf(t) >= 0)) access.push({ icon: 'ic-cam', k: S.security, v: S.securityText });
  const out = [{ title: S.access, link: false, rows: access.filter((r) => r.v) }];
  if (tags.indexOf(S.climateTag) >= 0) out.push({ title: S.env, link: false, rows: [{ icon: 'ic-temp', k: S.climate, v: S.climateText }] });
  let move = [['lift', 'ic-elev'], ['cart', 'ic-cart'], ['dock', 'ic-truck'], ['park', 'ic-car'], ['metro', 'ic-train']].filter((x) => svc[x[0]]).map((x) => ({ icon: x[1], k: S[x[0]], v: svc[x[0]] }));
  if (!move.length) move = tags.filter((t) => S.securityTags.indexOf(t) < 0 && t !== S.climateTag).map((t) => ({ icon: 'ic-check', k: t, v: '' })); // 没有到店档案：只列门店标签
  if (move.length) out.push({ title: S.move, link: true, rows: move });
  return out;
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
    visitVisible: false, visitStore: null, visitUnit: '', hero: '', sys: 'loading', card: null, hoursText: '', tab: 0, tabs: D.tabs, demandText: '', hasNeed: false, fav: false, gone: false,
    situation: '', cats: [], blocks: [], rows: [], near: [], smaller: [], sold: [], soldOpen: false, combos: [], comboMode: '', combosOpen: false, noSingleText: '', catEmpty: false,
    alternatives: [], showAlternatives: false, advisor: null, headPrice: null, salesSub: D.salesSub(T.lead.inHours),
    arrSys: 'loading', svc: [], route: null, transitOpen: false, destSheet: false, loginVisible: false, demandSheet: false
  },
  onLoad(q) {
    q = q || {};
    this._id = q.id; this._unit = q.unit || ''; this._gone = q.gone === '1'; this._cat = 'all';
    const tab = Number(q.tab); if (tab === 1 || tab === 2) this.setData({ tab });
    if (wx.showShareMenu) wx.showShareMenu({ menus: ['shareAppMessage'] });
  },
  onShow() { this.refresh(); },
  onShareAppMessage() { return { title: (this.data.card && this.data.card.name) || '', path: routes.STORE_DETAIL + '?id=' + (this._id || '') }; },
  refresh() {
    return pd.load(this, api.getStore({ id: this._id }), (store) => {
      this._store = store;
      this.setData({ visitStore: store, visitUnit: this._unit, hero: '/assets/images/stores/' + (require('../../mock/media').includes(store.id) ? store.id : 'SIM_BJ01').replace('_','-') + '/hero.webp' });
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
    // 仓位区按顺序排成一列：匹配仓位 → 说明句 → 组合方案 → 容量接近 → 比需求小
    const blocks = [], unit = (list) => (x, i) => blocks.push({ key: list + i, type: list === 'combos' ? 'combo' : 'unit', list, i, row: x });
    const rows = fav(d.rows), near = fav(d.near), smaller = fav(d.smaller);
    rows.forEach(unit('rows'));
    if (d.noSingleText) blocks.push({ key: 'note', type: 'note', text: d.noSingleText });
    if (d.comboMode === 'fold') blocks.push({ key: 'fold', type: 'fold', text: D.showCombos });
    if (d.comboMode === 'open' || (d.comboMode === 'fold' && this.data.combosOpen)) { blocks.push({ key: 'ct', type: 'title', text: D.comboTitle }); d.combos.forEach(unit('combos')); }
    if (near.length) { blocks.push({ key: 'nt', type: 'title', text: D.nearTitle }); near.forEach(unit('near')); }
    if (smaller.length) { blocks.push({ key: 'st', type: 'title', text: D.smallTitle }); smaller.forEach(unit('smaller')); }
    this.setData({
      card: d.card, hoursText: store.access_hours ? D.hours + store.access_hours : '', fav: pd.isFavorite('stores', store.id),
      hasNeed: !!r, demandText: r ? '约 ' + req.pretty(r.capacity_m3) + 'm³ · 租 ' + r.term_months + T.unit.month : '',
      situation: d.situation, cats: CATS.map((k) => ({ k, t: T.unitCategories[k], on: k === d.category })),
      rows, near, smaller, blocks, sold: d.sold, combos: d.combos, comboMode: d.comboMode,
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
    return api.getStoreArrival({ id: this._id }).then((a) => { this._arrival = a; this.setData({ arrSys: '' }); this.paintArrival(); })
      .catch(() => { this._arrival = null; this.setData({ arrSys: 'failed' }); this.paintArrival(); });
  },
  paintArrival() {
    if (!this._store) return;
    const p = this._arrival && this._arrival.profile;
    this.setData({ svc: serviceSections(this._store, p), route: routeModel(this._store, p) });
  },
  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },
  onRetryArrival() { this.loadArrival(); },
  onTab(e) { const i = Number(e.currentTarget.dataset.i); if (i === 0 || i === 1 || i === 2) this.setData({ tab: i }); },
  onSeeRoute() { this.setData({ tab: 2 }); },
  onCat(e) { const k = e.currentTarget.dataset.k; if (CATS.indexOf(k) >= 0) { this._cat = k; this.paint(); } },
  onAllCats() { this._cat = 'all'; this.paint(); },
  onToggleSold() { this.setData({ soldOpen: !this.data.soldOpen }); },
  onToggleCombos() { this.setData({ combosOpen: !this.data.combosOpen }); this.paint(); },
  onMoreTransit() { this.setData({ transitOpen: true }); },
  // ---- 仓位行 ----
  onAction(e) {
    const ds = e.currentTarget.dataset, list = ['rows', 'near', 'smaller', 'combos'].indexOf(ds.list) >= 0 ? ds.list : 'rows';
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
  onFavStore() { const on = pd.toggleFavorite('stores', this._id); this.setData({ fav: on }); pd.toast(on ? D.favOn : D.favOff); },
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
    wx.openLocation({ latitude: geo.latitude, longitude: geo.longitude, name: s.name + (typeof entry === 'string' && entry ? ' · ' + entry : ''), address: s.address, scale: 16, fail: fallback });
  },
  onCall() {
    const a = this._arrival || {}, phone = String(a.phone || a.hotline || CF.hotline);
    wx.makePhoneCall({ phoneNumber: phone.replace(/-/g, ''), fail: (err) => { if (!/cancel/i.test(String((err && err.errMsg) || ''))) pd.toast(D.route.callFail + phone); } });
  },
  onCopyAddress() { if (this._store) wx.setClipboardData({ data: this._store.address, fail: () => {} }); },
  // ---- 需求与其它入口 ----
  onModify() { if (state.get().requirement) this.setData({ demandSheet: true }); else wx.navigateTo({ url: routes.CAPACITY }); },
  onEstimate() { wx.navigateTo({ url: routes.CAPACITY }); },
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
