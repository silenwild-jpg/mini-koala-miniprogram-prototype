// 关于迷你考拉 ACC_BRAND（第 4 批）。品牌区与首页同一组数字（i18n/zh.js 的 home.proof，口径待业务确认）。
// 已做：品牌数字、四项服务、介绍、如何选择、存放说明、门店与服务、「查看门店」「联系顾问」；加载 / 失败 / 断网。
// 未做：冻结稿里三张资质图（高新技术企业、媒体报道、国标起草单位）是演示图，没有放进代码包；接口 getBrandInfo 返回线上图片地址时才显示。
const T = require('../../i18n/zh');
const TA = require('../../i18n/account');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const api = require('../../services/api');
const pd = require('../../services/page-data');
const B = TA.brand;
Page(auth.guarded(routes.BRAND, {
  data: {
    T: B, sys: 'loading', proofs: [],
    metrics: T.home.proof,
    pillars: B.pillars.map((p) => ({ icon: '/assets/icons/' + p.icon + '.svg', t: p.t, s: p.s }))
  },
  onLoad() { this.refresh(); },
  refresh() { return pd.load(this, api.getBrandInfo(), (r) => this.setData({ proofs: (r && r.proof_images) || [] })); },
  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },
  onStores() { wx.switchTab({ url: routes.STORES }); },
  onContact() { wx.navigateTo({ url: routes.SUPPORT }); }
}));
