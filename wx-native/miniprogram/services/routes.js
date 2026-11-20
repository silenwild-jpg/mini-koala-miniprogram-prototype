// 路由表：由 tools/gen_skeleton.py 按《页面索引》生成，页面里不要手写路径字符串。
const R = {
  HOME: '/pages/home/index',
  STORES: '/pages/stores/index',
  STORE_DETAIL: '/pages/store/detail',
  MATCH: '/pages/match/index',
  CAPACITY: '/pages/estimate/capacity',
  ITEMS: '/pkg-estimate/items/index',
  CONFIRM: '/pkg-trade/confirm/index',
  QUICK: '/pkg-trade/quick/index',
  ORDER_DETAIL: '/pkg-trade/order/index',
  ORDERS: '/pages/orders/index',
  AGREEMENT: '/pkg-trade/agreement/index',
  IDENTITY: '/pkg-after/identity/index',
  ACCESS: '/pkg-after/access/index',
  RENEW: '/pkg-after/renew/index',
  EXIT: '/pkg-after/exit/index',
  DEPOSIT: '/pkg-after/deposit/index',
  INVOICE: '/pkg-after/invoice/index',
  ECONTRACT: '/pkg-after/econtract/index',
  MESSAGES: '/pkg-account/messages/index',
  MINE: '/pages/mine/index',
  BOOKING: '/pkg-lead/booking/index',
  BUSINESS: '/pkg-lead/business/index',
  ESTORE: '/pkg-lead/estore/index',
  TRANSPORT: '/pkg-lead/transport/index',
  SUPPORT: '/pkg-lead/support/index',
  NEEDS: '/pkg-account/needs/index',
  PROGRESS: '/pkg-account/progress/index',
  FAVORITES: '/pkg-account/favorites/index',
  COUPONS: '/pkg-account/coupons/index',
  PROFILE: '/pkg-account/profile/index',
  REFERRAL: '/pkg-account/referral/index',
  BRAND: '/pkg-account/brand/index',
  ENT_CERT: '/pkg-account/ent-cert/index',
  ENT_TITLES: '/pkg-account/ent-titles/index',
  ENT_BATCH: '/pkg-account/ent-batch/index',
};
R.TABLE = [{"code": "H01", "name": "HOME", "title": "迷你考拉仓", "route": "/pages/home/index", "batch": 1, "states": 45}, {"code": "S01", "name": "STORES", "title": "附近门店", "route": "/pages/stores/index", "batch": 1, "states": 34}, {"code": "S02", "name": "STORE_DETAIL", "title": "门店详情", "route": "/pages/store/detail", "batch": 1, "states": 29}, {"code": "S5", "name": "MATCH", "title": "仓位推荐", "route": "/pages/match/index", "batch": 1, "states": 33}, {"code": "CAP", "name": "CAPACITY", "title": "估算存储空间", "route": "/pages/estimate/capacity", "batch": 1, "states": 21}, {"code": "ITEMS", "name": "ITEMS", "title": "按物品估算", "route": "/pkg-estimate/items/index", "batch": 1, "states": 22}, {"code": "O01", "name": "CONFIRM", "title": "确认订单", "route": "/pkg-trade/confirm/index", "batch": 2, "states": 35}, {"code": "QUICK", "name": "QUICK", "title": "快捷下单", "route": "/pkg-trade/quick/index", "batch": 2, "states": 18}, {"code": "O03", "name": "ORDER_DETAIL", "title": "订单详情", "route": "/pkg-trade/order/index", "batch": 2, "states": 27}, {"code": "OH01", "name": "ORDERS", "title": "订单", "route": "/pages/orders/index", "batch": 2, "states": 12}, {"code": "AGREEMENT", "name": "AGREEMENT", "title": "协议", "route": "/pkg-trade/agreement/index", "batch": 2, "states": 4}, {"code": "ACC_IDENTITY", "name": "IDENTITY", "title": "实名认证", "route": "/pkg-after/identity/index", "batch": 3, "states": 12}, {"code": "ACC_ACCESS", "name": "ACCESS", "title": "入仓指引", "route": "/pkg-after/access/index", "batch": 3, "states": 11}, {"code": "RN01", "name": "RENEW", "title": "续租", "route": "/pkg-after/renew/index", "batch": 3, "states": 21}, {"code": "EX01", "name": "EXIT", "title": "退仓", "route": "/pkg-after/exit/index", "batch": 3, "states": 19}, {"code": "DP01", "name": "DEPOSIT", "title": "押金", "route": "/pkg-after/deposit/index", "batch": 3, "states": 13}, {"code": "IV01", "name": "INVOICE", "title": "发票", "route": "/pkg-after/invoice/index", "batch": 3, "states": 16}, {"code": "ECONTRACT", "name": "ECONTRACT", "title": "电子合同", "route": "/pkg-after/econtract/index", "batch": 3, "states": 2}, {"code": "ACC_MESSAGES", "name": "MESSAGES", "title": "消息", "route": "/pkg-account/messages/index", "batch": 3, "states": 6}, {"code": "M01", "name": "MINE", "title": "我的", "route": "/pages/mine/index", "batch": 4, "states": 29}, {"code": "BOOKING", "name": "BOOKING", "title": "预约用仓", "route": "/pkg-lead/booking/index", "batch": 4, "states": 33}, {"code": "BUSINESS", "name": "BUSINESS", "title": "商家 / 企业存储", "route": "/pkg-lead/business/index", "batch": 4, "states": 35}, {"code": "ESTORE", "name": "ESTORE", "title": "考拉E存", "route": "/pkg-lead/estore/index", "batch": 4, "states": 1}, {"code": "ACC_TRANSPORT", "name": "TRANSPORT", "title": "运输与搬运", "route": "/pkg-lead/transport/index", "batch": 4, "states": 11}, {"code": "ACC_SUPPORT", "name": "SUPPORT", "title": "联系顾问", "route": "/pkg-lead/support/index", "batch": 4, "states": 8}, {"code": "ACC_NEEDS", "name": "NEEDS", "title": "预约用仓", "route": "/pkg-account/needs/index", "batch": 4, "states": 9}, {"code": "ACC_PROGRESS", "name": "PROGRESS", "title": "找仓进度", "route": "/pkg-account/progress/index", "batch": 4, "states": 10}, {"code": "ACC_FAVORITES", "name": "FAVORITES", "title": "我的收藏", "route": "/pkg-account/favorites/index", "batch": 4, "states": 6}, {"code": "ACC_COUPONS", "name": "COUPONS", "title": "优惠与权益", "route": "/pkg-account/coupons/index", "batch": 4, "states": 8}, {"code": "ACC_PROFILE", "name": "PROFILE", "title": "个人信息", "route": "/pkg-account/profile/index", "batch": 4, "states": 17}, {"code": "ACC_REFERRAL", "name": "REFERRAL", "title": "推荐有礼", "route": "/pkg-account/referral/index", "batch": 4, "states": 6}, {"code": "ACC_BRAND", "name": "BRAND", "title": "关于迷你考拉", "route": "/pkg-account/brand/index", "batch": 4, "states": 4}, {"code": "ENT_CERT", "name": "ENT_CERT", "title": "企业认证", "route": "/pkg-account/ent-cert/index", "batch": 4, "states": 7}, {"code": "ENT_TITLES", "name": "ENT_TITLES", "title": "开票抬头", "route": "/pkg-account/ent-titles/index", "batch": 4, "states": 6}, {"code": "ENT_BATCH", "name": "ENT_BATCH", "title": "批量开票", "route": "/pkg-account/ent-batch/index", "batch": 4, "states": 10}];
R.TABS = ['/pages/home/index', '/pages/stores/index', '/pages/orders/index', '/pages/mine/index'];
R.isTab = (url) => R.TABS.indexOf(String(url).split('?')[0]) >= 0;
// 跳转：tab 页用 switchTab，其余 navigateTo
R.go = (url) => (R.isTab(url) ? wx.switchTab({ url: String(url).split('?')[0] }) : wx.navigateTo({ url }));
module.exports = R;
