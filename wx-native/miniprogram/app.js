// 迷你考拉仓小程序入口。
// 不自建隐私弹窗、不注册 wx.onNeedPrivacyAuthorization：隐私与定位由微信官方弹窗承担（D-109、D-114）。
const state = require('./services/state');
const CA = require('./core/config-account');
App({
  onLaunch() {
    state.load();
    const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const menu = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
    // 自定义导航栏（首页、门店详情）的避让尺寸：运行时取，不写死设计稿的 44px
    const statusBar = win.statusBarHeight || 20;
    const navHeight = menu && menu.height ? (menu.top - statusBar) * 2 + menu.height : 44;
    this.globalData.layout = { statusBar, navHeight, capsuleLeft: menu && menu.left ? menu.left : win.windowWidth - 96, windowWidth: win.windowWidth, windowHeight: win.screenHeight || win.windowHeight || 667 };
  },
  // 从推荐好友的转发卡片进来（任何页面，query 带 ref=邀请码）：记到本机状态 flags.inviteCode，供注册 / 留资 / 下单接口带给后端（FIX-01 S-04）。
  // 已登录用户自己的邀请关系由后端判定，这里只负责不丢。
  onShow(o) {
    const ref = String((o && o.query && o.query.ref) || '');
    if (ref && new RegExp(CA.inviteCodePattern).test(ref) && state.get().flags.inviteCode !== ref) state.patch('flags', { inviteCode: ref });
  },
  globalData: { layout: { statusBar: 20, navHeight: 44, capsuleLeft: 279, windowWidth: 375, windowHeight: 667 } }
});
