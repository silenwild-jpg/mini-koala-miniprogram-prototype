// 顾问卡：并列入口，不拦截自助下单；一页只出现一次，放在仓位列表之后（D-97）。文案不提价格。
const T = require('../../i18n/zh');
const routes = require('../../services/routes');
Component({
  options: { addGlobalClass: true },
  properties: { title: { type: String, value: '' }, sub: { type: String, value: '' }, storeId: { type: String, value: '' } },
  data: { cta: T.advisor.cta },
  methods: { onTap() { wx.navigateTo({ url: routes.BOOKING + '?mode=advisor' + (this.data.storeId ? '&store=' + this.data.storeId : '') }); } }
});
