// 迷你考拉仓小程序入口。
// 不自建隐私弹窗、不注册 wx.onNeedPrivacyAuthorization：隐私与定位由微信官方弹窗承担（D-109、D-114）。
const state = require('./services/state');
App({
  onLaunch() {
    state.load();
    const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const menu = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
    // 自定义导航栏（首页、门店详情）的避让尺寸：运行时取，不写死设计稿的 44px
    const statusBar = win.statusBarHeight || 20;
    const navHeight = menu && menu.height ? (menu.top - statusBar) * 2 + menu.height : 44;
    this.globalData.layout = { statusBar, navHeight, capsuleLeft: menu && menu.left ? menu.left : win.windowWidth - 96, windowWidth: win.windowWidth };
  },
  globalData: { layout: { statusBar: 20, navHeight: 44, capsuleLeft: 279, windowWidth: 375 } }
});
