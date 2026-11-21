// 我的收藏 ACC_FAVORITES（第 4 批）。收藏存本机（state 的 favorites 主题 { stores, units }），本页按 id 取门店 / 仓位的现状。
// 已做：门店与仓位两组列表；空态「找附近门店」；失效态（门店「暂停营业 · 可查看附近其他门店」、仓位「已租出 · 可看同店其他仓位」，条目不自动删除，§4.4-13）；加载 / 失败 / 断网。
// FIX-01 D-09：失效条目（暂停营业的门店、已租出的仓位）带「移除」——暂停营业的门店进不了详情，否则这条收藏删不掉。
// IMPL-01：门店卡对齐全站门店卡写法（位置行、标签行）；仓位编号成标签；移除失效条目带淡出。
// 未做：有效条目本页不提供取消收藏（冻结稿没有画，在门店详情里取消）；门店照片 / 仓位示意图（演示数据没有图，有 photo 时才显示）。
const TA = require('../../i18n/account');
const state = require('../../services/state');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const api = require('../../services/api');
const pd = require('../../services/page-data');
const media = require('../../services/media');
const C = require('../../core/config-account');
const fmt = require('../../core/format');
const finder = require('../../services/finder');
const F = TA.favorites;
// IMPL-01：门店位置行按全站基准写「距离 · 区名 · 商圈」（距离单独加重，区名与商圈同一行）；仓位规格拆成编号标签 + 容量，尺寸另一行。
function storeRow(s, location) {
  const km = finder.distanceOf(s, location);
  return { id: s.id, name: s.name, photo: media.storeCard(s), gone: !!s.gone, kmText: fmt.kmText(km), place: [s.district, s.area || s.community || ''].filter(Boolean).join(' · ') || s.address || '' };
}
function unitRow(u) {
  const parts = String(u.name || '').split(' · ');
  const code = u.code || (parts.length === 2 ? parts[0] : '');
  const vol = u.volume !== undefined && u.volume !== null && u.volume !== '' ? fmt.pretty(u.volume) + 'm³' : (parts.length === 2 ? parts[1] : u.name || '');
  return { id: u.id, storeId: u.store_id, name: u.store_name, thumb: media.unitThumb(u), gone: !!u.gone, code, vol, dims: u.dims || '' };
}
Page(auth.guarded(routes.FAVORITES, {
  data: { T: F, sys: 'loading', empty: false, stores: [], units: [] },
  onShow() { this.refresh(); },
  onUnload() { this._gone = true; (this._timers || []).forEach((t) => clearTimeout(t)); this._timers = []; },
  refresh() {
    const fav = state.get().favorites || {}, location = state.get().location;
    return pd.load(this, api.getFavoriteItems({ stores: fav.stores || [], units: fav.units || [] }), (res) => {
      const stores = (res.stores || []).map((s) => storeRow(s, location));
      const units = (res.units || []).map(unitRow);
      this.setData({ stores, units, empty: !stores.length && !units.length });
    });
  },
  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },
  // 移除失效条目（catchtap，不触发整行的跳转）。收藏状态当场改掉（中途退出也算数），条目先淡出（C.removeFadeMs）再从列表里拿掉；
  // 淡出中的条目再点不重复处理；页面卸载后定时器清掉，不再写数据。
  onRemove(e) {
    const d = e.currentTarget.dataset, kind = d.kind === 'units' ? 'units' : 'stores';
    const row = this.data[kind].find((x) => x.id === d.id);
    if (!row || !row.gone || row.leaving) return Promise.resolve();
    if (pd.isFavorite(kind, d.id)) pd.toggleFavorite(kind, d.id);
    wx.showToast({ title: F.removed, icon: 'none' });
    this.setData({ [kind]: this.data[kind].map((x) => (x.id === d.id ? Object.assign({}, x, { leaving: true }) : x)) });
    this._timers = this._timers || [];
    return new Promise((resolve) => {
      const t = setTimeout(() => {
        this._timers = (this._timers || []).filter((x) => x !== t);
        if (this._gone) return resolve();
        resolve(this.refresh());
      }, C.removeFadeMs);
      this._timers.push(t);
    });
  },
  onFindStores() { wx.switchTab({ url: routes.STORES }); },
  // 暂停营业的门店：去附近门店；其余进门店详情
  onStore(e) {
    const d = e.currentTarget.dataset;
    if (d.gone) return wx.switchTab({ url: routes.STORES });
    wx.navigateTo({ url: routes.STORE_DETAIL + '?id=' + d.id });
  },
  // 仓位（含已租出的）都进所在门店的详情，看同店其他仓位
  onUnit(e) { wx.navigateTo({ url: routes.STORE_DETAIL + '?id=' + e.currentTarget.dataset.store }); }
}));
