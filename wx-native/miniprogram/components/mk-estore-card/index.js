// 考拉E存卡：门店列表第 3 位（list）、仓位推荐页底部（match）、5km 内无门店兜底（far）三处共用。点击进入考拉E存页。
const T = require('../../i18n/find');
const routes = require('../../services/routes');
Component({
  options: { addGlobalClass: true },
  properties: { variant: { type: String, value: 'list' } }, // list | match | far
  data: { name: T.estore.name, kicker: T.estore.list.kicker, sub: T.estore.list.sub, link: T.estore.list.link },
  observers: { variant(v) { const t = T.estore[v] || T.estore.list; this.setData({ kicker: t.kicker, sub: t.sub, link: t.link }); } },
  methods: { onTap() { wx.navigateTo({ url: routes.ESTORE }); } }
});
