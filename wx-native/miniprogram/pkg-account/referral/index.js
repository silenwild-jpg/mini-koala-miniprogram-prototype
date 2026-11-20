// 推荐有礼 ACC_REFERRAL（第 4 批）。活动还在筹备：奖励金额与规则业务没给，页面只有邀请说明、分享链接和「活动筹备中」，不编数。
// 已做：未登录态（「登录 / 注册」）；已登录态；复制分享链接（成功提示「链接已复制」，失败有提示）；转发卡片带邀请码；加载 / 失败 / 断网。
// 未做：推荐记录列表（冻结稿没有画；接口 getReferral 已返回 records，现在是空数组）；正式分享链接的格式由后端定，现在复制的是首页路径 + 邀请码。
const TA = require('../../i18n/account');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const api = require('../../services/api');
const pd = require('../../services/page-data');
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
  sharePath() { return routes.HOME + (this.data.code ? '?ref=' + this.data.code : ''); },
  onCopy() {
    wx.setClipboardData({ data: this.sharePath(), success: () => wx.showToast({ title: P.copied, icon: 'none' }), fail: () => wx.showToast({ title: P.copyFailed, icon: 'none' }) });
  },
  onShareAppMessage() { return { title: P.shareTitle, path: this.sharePath() }; },
  onLogin() { auth.openLogin(this); },
  onLoginClose() { this.setData({ loginVisible: false }); },
  onLoginSuccess() { this.refresh(); }
}));
