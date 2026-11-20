// 页面取数的公共上下文：登录态 + 需求 + 位置，交给 finder 生成视图模型。另放找仓各页共用的小工具（收藏、文字表裁剪、提示）。
const state = require('./state');
const api = require('./api');
const auth = require('./auth');
function ctx() { const s = state.get(); return { requirement: s.requirement, location: s.location, loggedIn: !!s.session.loggedIn }; }
// 统一的三态包装：页面 data.sys = 'loading' | 'failed' | 'offline' | ''
// 登录态失效（err.expired，由 api 层标记）不当成「服务不可用」：交给 auth.sessionExpired 打开登录层；页面留在失败态，登录后点重试即可
function load(page, promise, apply) {
  page.setData({ sys: page.data.sys === '' ? '' : 'loading' });
  return promise.then((res) => { apply(res); page.setData({ sys: '' }); })
    .catch((err) => {
      console.error(err); page.setData({ sys: err && (err.code === 'NETWORK' || err.code === 'TIMEOUT') ? 'offline' : 'failed' }); // 取数超时与断网同样显示（真实适配器现在区分两者）
      if (err && err.code === 'UNAUTHENTICATED' && err.expired) auth.sessionExpired(page);
    });
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
