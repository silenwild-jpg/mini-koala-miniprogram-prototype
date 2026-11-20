// 页面取数的公共上下文：登录态 + 需求 + 位置，交给 finder 生成视图模型。另放找仓各页共用的小工具（收藏、文字表裁剪、提示）。
const state = require('./state');
const api = require('./api');
function ctx() { const s = state.get(); return { requirement: s.requirement, location: s.location, loggedIn: !!s.session.loggedIn }; }
// 统一的三态包装：页面 data.sys = 'loading' | 'failed' | 'offline' | ''
function load(page, promise, apply) {
  page.setData({ sys: page.data.sys === '' ? '' : 'loading' });
  return promise.then((res) => { apply(res); page.setData({ sys: '' }); })
    .catch((err) => { console.error(err); page.setData({ sys: err && err.code === 'NETWORK' ? 'offline' : 'failed' }); });
}
const cityStores = () => api.getStores({ city: state.get().location.city });
// 文字表里带参数的句子是函数，不能放进 data；页面用 plain() 取出其中的纯文字部分
const plain = (t) => JSON.parse(JSON.stringify(t));
// 收藏：存本机（交接 v1.0 §4.4-13）。kind: 'stores' | 'units'；条目不自动删除
function favorites() { const f = state.get().favorites || {}; return { stores: f.stores || [], units: f.units || [] }; }
const isFavorite = (kind, id) => favorites()[kind].indexOf(id) >= 0;
function toggleFavorite(kind, id) {
  if (!id || (kind !== 'stores' && kind !== 'units')) return false;
  const f = favorites(), on = f[kind].indexOf(id) < 0;
  f[kind] = on ? f[kind].concat([id]) : f[kind].filter((x) => x !== id);
  state.set('favorites', f);
  return on;
}
const toast = (title) => { if (title) wx.showToast({ title: String(title), icon: 'none' }); };
module.exports = { ctx, load, cityStores, plain, favorites, isFavorite, toggleFavorite, toast };
