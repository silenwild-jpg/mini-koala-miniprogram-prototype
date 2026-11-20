// 探针工程的可填参数。拿到真实值后只改这个文件。
module.exports = {
  // 订阅消息模板 ID：在小程序后台「订阅消息」申请后填入，最多填 4 个。不填则订阅相关用例只能记录「未配置」。
  tmplIds: {
    booking: '',   // 预约受理
    renewal: '',   // 续租报价
    inspect: '',   // 验仓结果提醒
    expire: ''     // 租期到期提醒
  },
  // 微信支付参数：由后端统一下单后返回。不填则用无效参数调起，只能观察「调用是否被拦」，不能得出支付结论。
  // 注意：体验版支付是否真实扣款没有查到官方说明，请按真实扣款对待，用 ¥0.01 的测试单。
  payParams: null, // { timeStamp: '', nonceStr: '', package: '', signType: 'RSA', paySign: '' }
  // 电话与门店坐标：演示值，只用来验证能否调起拨号与内置地图。
  demoPhone: '4000000000',
  demoStore: { name: '演示门店（坐标为演示值）', address: '北京市', latitude: 39.9087, longitude: 116.3975 }
};
