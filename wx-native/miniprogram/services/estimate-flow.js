// 估算完成后回到哪里（FIX-01 R-19）。
// 附近门店、门店详情里点「估算大小」或在修改需求弹层里点「按物品估算」：估算完回到出发的那一页，不去仓位推荐。
// 做法：出发页调用 start() 记下自己的路由；填容量页、物品页提交时先调用 finish()，
// 出发页还在页面栈里就退回它（中间隔几页就退几页），不在了（用户已离开）就按原规则去仓位推荐。
const state = require('./state');
const norm = (r) => '/' + String(r || '').replace(/^\//, '').split('?')[0];
function start(originRoute) {
  let origin = originRoute;
  if (!origin) { const pages = getCurrentPages(); origin = pages.length ? pages[pages.length - 1].route : ''; }
  state.patch('flags', { estimateBack: origin ? norm(origin) : '' });
}
function finish() {
  const origin = state.get().flags.estimateBack;
  if (!origin) return false;
  state.patch('flags', { estimateBack: '' });
  const pages = getCurrentPages();
  for (let i = pages.length - 2; i >= 0; i--) if (norm(pages[i].route) === origin) { wx.navigateBack({ delta: pages.length - 1 - i }); return true; }
  return false;
}
const cancel = () => state.patch('flags', { estimateBack: '' });
module.exports = { start, finish, cancel };
