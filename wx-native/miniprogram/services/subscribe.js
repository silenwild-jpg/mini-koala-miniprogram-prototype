// 订阅消息（交接 v1.0 §4.10、W30 规则核对）。一次性订阅：必须由用户点按触发；一次最多 5 个模板。
// 模板 ID 等后台申请后填入 core/config.js 的 subscribeTemplates；没填时直接视为未订阅，不弹框、不报错。
// request(scene) 永不 reject：允许或取消都让业务流程继续（D-187）。返回 { accepted, asked }。
const C = require('../core/config');
function request(scene) {
  const ids = ((C.subscribeTemplates || {})[scene] || []).filter(Boolean).slice(0, 5);
  return new Promise((resolve) => {
    if (!ids.length || !wx.requestSubscribeMessage) return resolve({ accepted: false, asked: false });
    wx.requestSubscribeMessage({
      tmplIds: ids,
      success: (res) => resolve({ accepted: ids.some((id) => res[id] === 'accept'), asked: true }),
      fail: () => resolve({ accepted: false, asked: true })
    });
  });
}
module.exports = { request, SCENES: { BOOKING: 'booking', RENEW_QUOTE: 'renewQuote', INSPECT: 'inspect', EXPIRE: 'expire' } };
