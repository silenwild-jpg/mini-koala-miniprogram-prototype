// 真实接口适配器（第 5 批）。现在只有统一的请求封装，各接口的路径与字段等接口契约定稿后补。
// 请求没发出去或没收到回执时分两种：超时给 TIMEOUT（请求可能已被受理，留资页据此进「提交结果暂未确认」）；其余给 NETWORK。
const C = require('../core/config');
function request(method, path, data, session) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: C.API_BASE + path, method, data,
      header: session && session.token ? { Authorization: 'Bearer ' + session.token } : {},
      success: (res) => {
        if (res.statusCode === 401) return reject({ code: 'UNAUTHENTICATED', message: '请先登录' });
        if (res.statusCode >= 200 && res.statusCode < 300) return resolve(res.data);
        reject({ code: (res.data && res.data.code) || 'INVALID', message: (res.data && res.data.message) || '服务暂时不可用，请稍后重试。' });
      },
      fail: (e) => reject(/time\s?out/i.test(String((e && e.errMsg) || '')) ? { code: 'TIMEOUT', message: '请求超时，结果暂未确认' } : { code: 'NETWORK', message: '网络未连接' })
    });
  });
}
module.exports = { request };
