// 考拉E存 ESTORE（第 4 批，交接 v1.0 §4.9-6，D-80）。纯说明页，只有 1 个状态。
// 已做：页头句、与自助仓怎么选、服务流程、服务说明（合同文本的界面短句）、「查看禁存清单」、底部「咨询考拉E存」进预约表单顾问模式（来源 E存）。
// 未做：页头配图（冻结稿用 mini_split.jpg，工程里没有这张图，正式环境应来自线上地址）；套餐与价格待业务，写「请咨询客服」。
const T = require('../../i18n/lead');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const share = require('../../services/share');
const E = T.estore;
Page(auth.guarded(routes.ESTORE, {
  data: { T: E, flow: E.flow.map((x, i) => ({ t: x.t, s: x.s, last: i === E.flow.length - 1 })) },
  onLoad() {},
  onSelf() { wx.switchTab({ url: routes.STORES }); },
  onBanList() { wx.navigateTo({ url: routes.AGREEMENT + '?doc=usage&anchor=att2' }); },
  onConsult() { wx.navigateTo({ url: routes.BOOKING + '?mode=advisor&source=estore' }); },
  onShareAppMessage() { return share.message(routes.ESTORE, { title: T.share.estore }); } // 转发（R-15）
}));
