// 我的收藏 ACC_FAVORITES（第 4 批）。收藏存本机（state 的 favorites 主题 { stores, units }），本页按 id 取门店 / 仓位的现状。
// 已做：门店与仓位两组列表；空态「找附近门店」；失效态（门店「暂停营业 · 可查看附近其他门店」、仓位「已租出 · 可看同店其他仓位」，条目不自动删除，§4.4-13）；加载 / 失败 / 断网。
// FIX-01 D-09：失效条目（暂停营业的门店、已租出的仓位）带「移除」——暂停营业的门店进不了详情，否则这条收藏删不掉。
// 未做：有效条目本页不提供取消收藏（冻结稿没有画，在门店详情里取消）；门店照片 / 仓位示意图（演示数据没有图，有 photo 时才显示）。
const TA = require('../../i18n/account');
const state = require('../../services/state');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const api = require('../../services/api');
const pd = require('../../services/page-data');
const media = require('../../services/media');
const F = TA.favorites;
Page(auth.guarded(routes.FAVORITES, {
  data: { T: F, sys: 'loading', empty: false, stores: [], units: [] },
  onShow() { this.refresh(); },
  refresh() {
    const fav = state.get().favorites || {};
    return pd.load(this, api.getFavoriteItems({ stores: fav.stores || [], units: fav.units || [] }), (res) => {
      const stores = (res.stores || []).map((s) => ({ id: s.id, name: s.name, photo: media.storeCard(s), gone: !!s.gone, sub: s.gone ? F.storeGoneSub : s.address }));
      const units = (res.units || []).map((u) => ({ id: u.id, storeId: u.store_id, name: u.store_name, thumb: media.unitThumb(u), gone: !!u.gone, sub: u.name + (u.dims ? ' · ' + u.dims : '') + (u.gone ? F.unitGoneSub : '') }));
      this.setData({ stores, units, empty: !stores.length && !units.length });
    });
  },
  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },
  // 移除失效条目（catchtap，不触发整行的跳转）
  onRemove(e) {
    const d = e.currentTarget.dataset, kind = d.kind === 'units' ? 'units' : 'stores';
    const row = this.data[kind].find((x) => x.id === d.id);
    if (!row || !row.gone) return;
    if (pd.isFavorite(kind, d.id)) pd.toggleFavorite(kind, d.id);
    wx.showToast({ title: F.removed, icon: 'none' });
    return this.refresh();
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
