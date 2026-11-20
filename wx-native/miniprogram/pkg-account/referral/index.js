// 推荐有礼 ACC_REFERRAL（第 4 批）。活动还在筹备：奖励金额与规则业务没给，页面只有邀请说明、分享链接和「活动筹备中」，不编数。
// 已做：未登录态（「登录 / 注册」，转发和复制都不可用）；已登录态显示邀请码本身；「转发给好友」（卡片落到首页并带 ref=邀请码，app.js 落地读取）；
//       「复制邀请码」（复制的是邀请码文字，不再是打不开的页面路径，FIX-01 D-12 / S-04）；加载 / 失败 / 断网。
// 未做：推荐记录列表（冻结稿没有画；接口 getReferral 已返回 records，现在是空数组）；正式分享链接的格式由后端定，定了以后再放「复制链接」。
const TA = require('../../i18n/account');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const api = require('../../services/api');
const pd = require('../../services/page-data');
const share = require('../../services/share');
const P = TA.referral;
Page(auth.guarded(routes.REFERRAL, {
  data: { T: { r: P, common: TA.common }, sys: 'loading', loggedIn: false, code: '', loginVisible: false },
  onShow() { this.refresh(); },
  refresh() {
    const logged = auth.isLoggedIn();
    this.setData({ loggedIn: logged });
    if (!logged) { this.setData({ sys: '', code: '' }); return Promise.resolve(); }
    return pd.load(this, api.getReferral(), (r) => this.setData({ code: (r && r.code) || '' }));
  },
  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },
  onCopy() {
    if (!this.data.loggedIn || !this.data.code) return; // 未登录没有邀请码，不复制
    wx.setClipboardData({ data: this.data.code, success: () => wx.showToast({ title: P.copied, icon: 'none' }), fail: () => wx.showToast({ title: P.copyFailed, icon: 'none' }) });
  },
  // 未登录（右上角菜单转发）不带邀请码
  onShareAppMessage() { return share.message(routes.HOME, { title: P.shareTitle, query: this.data.loggedIn && this.data.code ? 'ref=' + this.data.code : '' }); },
  onLogin() { auth.openLogin(this); },
  onLoginClose() { this.setData({ loginVisible: false }); },
  onLoginSuccess() { this.refresh(); }
}));
