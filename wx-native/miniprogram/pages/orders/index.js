// 订单列表 OH01（第 2 批）。未登录可打开，显示空态和登录入口（D-198）。
// 已做（12 态）：空态、单笔 / 多笔 / 已结束、各租用阶段的订单卡（待支付、支付未成功、已超时、已取消、待实名认证、待入仓、租用中、即将到期、
//   续租办理中、退仓处理中、租期已到期、押金处理中、已退仓）、加载 / 失败 / 断网三态、按最近订单排序、点卡进订单详情对应阶段。
// 未做：订单卡上的门店照片（没有核验过的门店实拍，用图标占位）。
// 订单卡用公共组件 mk-order-card（variant="list"），阶段判定与订单详情、任务卡同源（services/order-view.js）。
const T = require('../../i18n/trade');
const api = require('../../services/api');
const auth = require('../../services/auth');
const routes = require('../../services/routes');
const pd = require('../../services/page-data');
Page({
  data: { T: T.orders, sys: 'loading', loggedIn: false, orders: [], loginVisible: false },
  onShow() { this.refresh(); },
  refresh() {
    const loggedIn = auth.isLoggedIn();
    this.setData({ loggedIn });
    if (!loggedIn) { this.setData({ sys: '', orders: [] }); return Promise.resolve(); }
    return pd.load(this, api.getOrders(), (orders) => this.setData({ orders: orders.slice().sort((a, b) => b.created_at - a.created_at) }));
  },
  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },
  onPullDownRefresh() { this.refresh().then(() => wx.stopPullDownRefresh()); },
  onLogin() { auth.openLogin(this); },
  onLoginClose() { this.setData({ loginVisible: false }); },
  onLoginSuccess() { this.refresh(); },
  onGoStores() { wx.switchTab({ url: routes.STORES }); },
  onOrder(e) { auth.navigate(this, routes.ORDER_DETAIL + '?id=' + e.currentTarget.dataset.id); }
});
