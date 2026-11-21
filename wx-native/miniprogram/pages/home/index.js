// 首页 H01（第 1 批）。
// 已做：自定义顶栏（城市位 + 搜索框 + 消息角标，避让状态栏与胶囊）、定位圆点与轻气泡（未申请 / 被拒 / 系统定位关闭 / 超时四种文案，
//       每次启动最多一次、5 秒收起、滚动即收起，D-119）、定位城市无门店气泡（D-184，可关闭、可切换城市）、定位成功提示、
//       订单任务卡位（mk-task-card，交易域）、用仓需求卡（mk-need-card；任务卡显示时需求在它的待办条带里，需求卡不重复出现）、
//       入口卡（标准 / 弱化两种）、为您推荐（最近 → 半径内更低价 → 运营位；待支付时收起可展开；服务中不出）、
//       常见存储场景、企业横幅、品牌区、加载骨架与失败 / 断网（保留顶栏）。
// IMPL-01（张坤 2026-11-21 第 3 段，M-01～M-05）：首屏第一块改成「上半轮播图、下半找附近门店」的主卡（轮播内容在 core/config-find.js home.banners，
//       图不带字、标题叠在图上，可点跳转；页面隐藏时停止自动轮播）；原首图与标语区撤掉，标语进第一张轮播；顶部留一条浅绿底带，顶栏叠在上面，滚动后变实底。
//       入口卡「估大小算价格」「立即下单」（进快捷下单页）白页浅灰底块；已有找仓需求时不出「估大小算价格」（入口卡与轮播里的那一张都不出）。
//       推荐卡带角标（finder 带出的选中原因）、场景改一行横滑的圆形图标、品牌区加五城地标线条画与三张资质配图。
//       跳转加了防连点：一次跳转发起后 navLockMs 内的重复点击不再跳，页面隐藏 / 再次显示时解锁，定时器在 onUnload 清掉。
// 订单各阶段主卡由 mk-task-card 负责，不在本页。
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
const share = require('../../services/share');
// 定位气泡每次启动最多出现一次、无门店城市气泡关闭后本次启动不再出现：标记放在 App 上，与门店列表页共用
const flags = () => { const g = getApp().globalData; if (!g.find) g.find = { bubbleShown: false, nocityClosed: false }; return g.find; };
Page({
  data: {
    T: { home: pd.plain(T.home), brand: Z.brand, cubic: T.price.cubicFrom, switchCity: T.locate.switchCity },
    banners: [], bannerIdx: 0, bannerAuto: false, bannerInterval: CF.home.bannerIntervalMs, bannerDuration: CF.home.bannerDurationMs,
    sceneIcons: CF.home.sceneIcons, cityImages: CF.home.cityImages, proofImages: CF.home.proofImages,
    layout: null, heroHeight: 0, solid: false, panelTop: 0, sys: 'loading', city: '', located: false, bubble: null, nocity: '', cards: [], panel: false, panelFocus: false,
    unread: 0, unreadText: '', weak: false, noRec: false, collapse: false, recOpen: false, showRail: true, needMode: 'card', estimated: false
  },
  onLoad() {
    const layout = getApp().globalData.layout;
    // 顶部浅绿底带：状态栏 + 顶栏，再往下延伸一段，首屏卡压在它上面
    const top = layout.statusBar + layout.navHeight;
    const heroHeight = top + CF.hero.backdrop;
    this.setData({ layout, heroHeight, panelTop: top });
    const asked = state.get().flags.locationAsked;
    location.requestOnce().then((st) => { // 首次进入自动申请一次；之后不再自动申请
      this.showLocation(true);
      if (!asked && st === 'granted') { const loc = state.get().location; if (!loc.noStoreCity && loc.pointDistrict) pd.toast(T.locate.located(loc.pointDistrict)); this.refresh(); }
    });
  },
  onShow() { this.unlockNav(); this.setData({ bannerAuto: true }); this.refresh(); },
  onHide() { this.hideBubble(); this.unlockNav(); this.setData({ bannerAuto: false }); }, // 离开首页时停掉自动轮播
  onUnload() { this.hideBubble(); this.unlockNav(); this._gone = true; },
  onPageScroll(e) {
    if (this.data.bubble) this.hideBubble();
    const solid = ((e && e.scrollTop) || 0) > CF.hero.solidAfter; // 顶栏离开顶部底带后变实底，只在跨过阈值时 setData
    if (solid !== this.data.solid) this.setData({ solid });
  },
  onPullDownRefresh() { this.refresh().then(() => wx.stopPullDownRefresh()); },
  onShareAppMessage() { return share.message(routes.HOME); },
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
    const s = state.get(), hasNeed = !!s.requirement;
    const banners = CF.home.banners.filter((b) => !(hasNeed && b.hideWithNeed));
    const same = banners.length === this.data.banners.length && banners.every((b, i) => b.key === this.data.banners[i].key);
    this.setData(same ? { estimated: hasNeed } : { estimated: hasNeed, banners, bannerIdx: 0 }); // 轮播张数变了才重设，避免每次回到首页都跳回第一张
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
  // 跳转防连点：发起后 navLockMs 内不再重复跳；页面隐藏、再次显示、卸载时解锁并清定时器
  go(url) {
    if (this._navLock || this._gone || !url) return false;
    this._navLock = setTimeout(() => { this._navLock = null; }, CF.home.navLockMs);
    if (routes.isTab(url)) wx.switchTab({ url }); else wx.navigateTo({ url });
    return true;
  },
  unlockNav() { if (this._navLock) { clearTimeout(this._navLock); this._navLock = null; } },
  // 轮播：只记当前张给指示点用，不回写 swiper 的 current（回写会和手势抢位置）
  onBannerChange(e) { const i = Number(e && e.detail && e.detail.current); if (i >= 0 && i < this.data.banners.length && i !== this.data.bannerIdx) this.setData({ bannerIdx: i }); },
  onBanner(e) { const b = this.data.banners[Number(e.currentTarget.dataset.i)]; if (b) this.go(routes[b.route]); },
  onFindStores() { this.go(routes.STORES); },
  onEstimate() { this.go(routes.CAPACITY); },
  onQuick() { this.go(routes.QUICK); }, // M-01：立即下单 → 快捷下单页（不带门店，页内自己选）
  onScene(e) {
    const i = Number(e.currentTarget.dataset.i) || 0;
    if (i === CF.moveSceneIndex) state.patch('flags', { moving: true }); // 从搬家场景进入：之后打开用仓位置面板时带搬家提示
    this.go(routes.CAPACITY); // 六个场景进同一个填容量页；估算页不按场景区分，不再带没人读的 scene 参数（S-06）
  },
  onStore(e) { this.go(routes.STORE_DETAIL + '?id=' + e.currentTarget.dataset.id); },
  onBusiness() { this.go(routes.BUSINESS); },
  onAbout() { this.go(routes.BRAND); },
  onMessages() { this.go(routes.MESSAGES); }
});
