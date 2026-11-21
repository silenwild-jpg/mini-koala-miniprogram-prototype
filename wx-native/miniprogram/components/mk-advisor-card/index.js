// 顾问卡：并列入口，不拦截自助下单；一页只出现一次，放在仓位列表之后（D-97）。文案不提价格。
const T = require('../../i18n/zh');
const TL = require('../../i18n/lead');
const routes = require('../../services/routes');
Component({
  options: { addGlobalClass: true },
  properties: { title: { type: String, value: '' }, sub: { type: String, value: '' }, storeId: { type: String, value: '' } },
  data: { cta: T.advisor.cta, contact: TL.advisorCard.contact }, // contact：客服会话按钮文字（IMPL-02 PR-244 挪进 i18n/lead.js）
  methods: { onTap() { wx.navigateTo({ url: routes.BOOKING + '?mode=advisor' + (this.data.storeId ? '&store=' + this.data.storeId : '') }); } }
});
