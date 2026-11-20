// 登录守卫（D-198）。确认订单及其后的页面未登录不能进入：
// 受限页在 onLoad 先判断，未登录就 redirectTo 到落点页并打开登录层；返回键回不到受限页。
// 「立即下单」「下一步」未登录时在当前页打开登录层，不 navigateTo 受限页（见 requireLogin）。
// 接口侧同样拒绝未登录请求（services/api.js）。
const state = require('./state');
const routes = require('./routes');

const RESTRICTED = [ // 落点：confirm → 仓位推荐页；其余 → 「我的」
  { prefix: routes.CONFIRM, land: 'match' },
  { prefix: routes.ORDER_DETAIL, land: 'mine' },
  { prefix: routes.RENEW, land: 'mine' },
  { prefix: routes.EXIT, land: 'mine' },
  { prefix: routes.DEPOSIT, land: 'mine' },
  { prefix: routes.INVOICE, land: 'mine' },
  { prefix: routes.ECONTRACT, land: 'mine' },
  { prefix: routes.IDENTITY, land: 'mine' }
];
const norm = (r) => '/' + String(r || '').replace(/^\//, '').split('?')[0];
const rule = (route) => RESTRICTED.find((x) => norm(route) === x.prefix) || null;
const isRestricted = (route) => !!rule(route);
const isLoggedIn = () => !!state.get().session.loggedIn;

// 受限页 onLoad 调用。返回 true 表示放行。
function enter(route) {
  const r = rule(route);
  if (!r || isLoggedIn()) return true;
  // 确认订单的落点是仓位推荐页；但没有用仓需求时仓位推荐页无法显示，改落到「我的」
  const land = r.land === 'match' && state.get().requirement ? 'match' : 'mine';
  state.patch('flags', { pendingLogin: land });
  if (land === 'match') wx.redirectTo({ url: routes.MATCH + '?login=1' });
  else wx.switchTab({ url: routes.MINE }); // tab 页不能带参数，用 flags.pendingLogin 传递
  return false;
}
// 页面跳转统一入口：目标是受限页且未登录时，不跳转，由调用页打开登录层。
function navigate(page, url) {
  if (isRestricted(url) && !isLoggedIn()) { openLogin(page); return false; }
  wx.navigateTo({ url });
  return true;
}
function openLogin(page) { if (page && page.setData) page.setData({ loginVisible: true }); }
// 落点页 onShow 调用：若是被守卫带过来的，打开登录层一次。
function consumePending(page, land) {
  const f = state.get().flags;
  if (f.pendingLogin === land) {
    state.patch('flags', { pendingLogin: '' });
    if (!isLoggedIn()) { openLogin(page); return true; }
  }
  return false;
}
// 包一层 Page 选项：受限页自动加守卫。
function guarded(route, options) {
  const onLoad = options.onLoad;
  options.onLoad = function (q) {
    this.__blocked = !enter(route);
    if (this.__blocked) return;
    if (onLoad) onLoad.call(this, q);
  };
  return options;
}
module.exports = { RESTRICTED, isRestricted, isLoggedIn, enter, navigate, openLogin, consumePending, guarded };
