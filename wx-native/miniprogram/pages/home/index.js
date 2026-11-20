// 首页 H01（第 1 批）。
// 已做：自定义顶栏（城市位 + 搜索框 + 消息角标，避让状态栏与胶囊）、定位圆点与轻气泡（未申请 / 被拒 / 系统定位关闭 / 超时四种文案，
//       每次启动最多一次、5 秒收起、滚动即收起，D-119）、定位城市无门店气泡（D-184，可关闭、可切换城市）、定位成功提示、
//       订单任务卡位（mk-task-card，交易域）、用仓需求卡（mk-need-card；任务卡显示时需求在它的待办条带里，需求卡不重复出现）、
//       双入口（标准 / 弱化两种）、为您推荐（最近 → 半径内更低价 → 运营位；待支付时收起可展开；服务中不出）、
//       常见存储场景、企业横幅、品牌区、加载骨架与失败 / 断网（保留顶栏）。
// 未做：首屏品牌大图、推荐卡与场景的图片（素材没有随包，门店图也不是核验过的实拍）；订单各阶段主卡由 mk-task-card 负责，不在本页。
// 定位：只在首次进入自动申请一次；拿不到定位（含服务类目未开通）时城市位仍可手动选城市 / 区域 / 商圈。
const T = require('../../i18n/find');
const Z = require('../../i18n/zh');
const C = require('../../core/config');
const CF = require('../../core/config-find');
const state = require('../../services/state');
const api = require('../../services/api');
const routes = require('../../services/routes');
const finder = require('../../services/finder');
const location = require('../../services/location');
const pd = require('../../services/page-data');
// 定位气泡每次启动最多出现一次、无门店城市气泡关闭后本次启动不再出现：标记放在 App 上，与门店列表页共用
const flags = () => { const g = getApp().globalData; if (!g.find) g.find = { bubbleShown: false, nocityClosed: false }; return g.find; };
Page({
  data: {
    T: { home: pd.plain(T.home), brand: Z.brand, cubic: T.price.cubicFrom, switchCity: T.locate.switchCity },
    layout: null, panelTop: 0, sys: 'loading', city: '', located: false, bubble: null, nocity: '', cards: [], panel: false, panelFocus: false,
    unread: 0, unreadText: '', weak: false, noRec: false, collapse: false, recOpen: false, showRail: true, needMode: 'card', estimated: false
  },
  onLoad() {
    const layout = getApp().globalData.layout;
    this.setData({ layout, panelTop: layout.statusBar + layout.navHeight });
    const asked = state.get().flags.locationAsked;
    location.requestOnce().then((st) => { // 首次进入自动申请一次；之后不再自动申请
      this.showLocation(true);
      if (!asked && st === 'granted') { const loc = state.get().location; if (!loc.noStoreCity && loc.pointDistrict) pd.toast(T.locate.located(loc.pointDistrict)); this.refresh(); }
    });
  },
  onShow() { this.refresh(); },
  onHide() { this.hideBubble(); },
  onPageScroll() { if (this.data.bubble) this.hideBubble(); },
  onPullDownRefresh() { this.refresh().then(() => wx.stopPullDownRefresh()); },
  // 城市位：城市名、未定位圆点、气泡
  showLocation(mayBubble) {
    const loc = state.get().location, located = loc.status === 'granted';
    this.setData({ city: loc.label && loc.kind !== 'point' ? loc.label : loc.city, located, nocity: loc.noStoreCity && !flags().nocityClosed ? T.locate.noStoreCity(loc.noStoreCity, loc.city) : '' });
    if (located && this.data.bubble) this.hideBubble();
    if (mayBubble === true && !located && !flags().bubbleShown) {
      flags().bubbleShown = true;
      this.setData({ bubble: location.hint() });
      this._bt = setTimeout(() => this.hideBubble(), C.timers.locationBubbleSeconds * 1000);
    }
  },
  hideBubble() { if (this._bt) { clearTimeout(this._bt); this._bt = null; } if (this.data.bubble) this.setData({ bubble: null }); },
  refresh() {
    this.showLocation(false);
    const s = state.get();
    this.setData({ estimated: !!s.requirement });
    api.getMessagesUnread().then((r) => { const n = Number(r && r.unread) || 0; this.setData({ unread: n, unreadText: n > 99 ? '99+' : String(n) }); }).catch(() => {});
    this.syncTask();
    return pd.load(this, pd.cityStores(), (stores) => this.setData({ cards: finder.buildHomeRecommend(stores, pd.ctx()) }));
  },
  // 首页版式跟随订单任务卡：任务卡显示时，找仓需求已在它的待办条带里，需求卡不再重复；双入口与推荐按主卡阶段调整。
  // 取不到任务卡组件（或它没有返回）时，按订单阶段兜底。
  syncTask() {
    const apply = (l) => this.setData({ weak: l.weak, noRec: l.noRec, collapse: l.collapse, showRail: !l.noRec && (!l.collapse || this.data.recOpen), needMode: l.hasMain ? 'hidden' : 'card' });
    const byOrders = () => { if (state.get().session.loggedIn) api.getOrders().then((o) => apply(finder.homeLayout(o))).catch(() => apply(finder.layoutOf(''))); else apply(finder.layoutOf('')); };
    const t = this.selectComponent ? this.selectComponent('#task') : null;
    if (!t || typeof t.refresh !== 'function') { byOrders(); return; }
    Promise.resolve(t.refresh()).then(() => { const d = t.data || {}; apply(finder.layoutOf(d.show && d.main ? d.main.key : '')); }).catch(byOrders);
  },
  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },
  onCity() { this.hideBubble(); this.setData({ panel: true, panelFocus: false }); },
  onSearch() { this.hideBubble(); this.setData({ panel: true, panelFocus: true }); },
  onPanelClose() { this.setData({ panel: false }); },
  onLocationChange() { flags().nocityClosed = true; this.refresh(); },
  onBubbleAction() { const b = this.data.bubble; this.hideBubble(); location.act(b ? b.kind : 'retry').then(() => this.refresh()); },
  onCloseNocity() { flags().nocityClosed = true; this.setData({ nocity: '' }); },
  onSwitchCity() { flags().nocityClosed = true; this.setData({ nocity: '', panel: true, panelFocus: false }); },
  onToggleRec() { const open = !this.data.recOpen; this.setData({ recOpen: open, showRail: !this.data.noRec && (!this.data.collapse || open) }); },
  onFindStores() { wx.switchTab({ url: routes.STORES }); },
  onEstimate() { wx.navigateTo({ url: routes.CAPACITY }); },
  onScene(e) {
    const i = Number(e.currentTarget.dataset.i) || 0;
    if (i === CF.moveSceneIndex) state.patch('flags', { moving: true }); // 从搬家场景进入：之后打开用仓位置面板时带搬家提示
    wx.navigateTo({ url: routes.CAPACITY + '?scene=' + i });
  },
  onStore(e) { wx.navigateTo({ url: routes.STORE_DETAIL + '?id=' + e.currentTarget.dataset.id }); },
  onBusiness() { wx.navigateTo({ url: routes.BUSINESS }); },
  onAbout() { wx.navigateTo({ url: routes.BRAND }); },
  onMessages() { wx.navigateTo({ url: routes.MESSAGES }); }
});
