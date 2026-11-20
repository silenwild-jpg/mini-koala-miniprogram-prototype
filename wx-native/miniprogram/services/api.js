// 接口层：页面只调这里，不直接读 mock、不直接 wx.request。
// 体验版用演示数据（config.DATA_SOURCE = 'mock'）；第 5 批把 http 适配器接上，页面不用改。
// 约定：全部返回 Promise；失败 reject({ code, message })。code：UNAUTHENTICATED | NOT_FOUND | NETWORK | TIMEOUT | INVALID | CONFLICT | RATE_LIMIT | EXPIRED | IDENTITY_REQUIRED | MISMATCH
const C = require('../core/config');
const state = require('./state');
const scenarios = require('../mock/scenarios');
const adapter = C.DATA_SOURCE === 'http' ? require('./http-adapter') : require('./mock-adapter');
// 登录态失效（FIX-01 S-02）：本机记着已登录、接口却说未登录 → 清掉本机登录态并在错误上标 expired，各页不用各自处理
function expired(err) {
  if (err && err.code === 'UNAUTHENTICATED' && state.get().session.loggedIn) { state.logout(); err.expired = true; }
  return Promise.reject(err);
}
const NEED_LOGIN = { getQuote: 1, createOrder: 1, getOrders: 1, getOrder: 1, payOrder: 1, cancelOrder: 1, signContract: 1, verifyIdentity: 1 };

function call(name, params) {
  if (NEED_LOGIN[name] && !state.get().session.loggedIn) return Promise.reject({ code: 'UNAUTHENTICATED', message: '请先登录' });
  if (typeof adapter[name] !== 'function') return Promise.reject({ code: 'INVALID', message: '接口未实现：' + name });
  if (C.DATA_SOURCE !== 'mock') return adapter[name](params || {}, state.get().session).catch(expired);
  const net = scenarios.net(); // 演示数据：按当前网络档位加延迟或失败，让加载态、失败态和真实环境一样出现
  if (!net.max && !net.fail) return adapter[name](params || {}, state.get().session).catch(expired);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < net.fail) reject({ code: 'NETWORK', message: '网络异常，请稍后重试' });
      else adapter[name](params || {}, state.get().session).catch(expired).then(resolve, reject);
    }, net.min + Math.random() * (net.max - net.min));
  });
}
(adapter.__needLogin || []).forEach((n) => { NEED_LOGIN[n] = 1; });
const api = {};
Object.keys(NEED_LOGIN).concat(Object.keys(adapter).filter((n) => typeof adapter[n] === 'function' && !NEED_LOGIN[n])).forEach((n) => { api[n] = (p) => call(n, p); });
module.exports = api;
