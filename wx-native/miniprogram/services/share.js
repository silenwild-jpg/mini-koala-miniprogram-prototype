// 转发（FIX-01 R-15）：不经登录守卫的页面都可转发；受限页与纯账户页不定义转发。
// 用法：onShareAppMessage() { return share.message(routes.X, { title, query }); }
const T = require('../i18n/zh');
function message(route, o) {
  o = o || {};
  const q = o.query ? (String(o.query).charAt(0) === '?' ? o.query : '?' + o.query) : '';
  const m = { title: o.title || T.share.title, path: String(route) + q };
  if (o.imageUrl) m.imageUrl = o.imageUrl;
  return m;
}
module.exports = { message };
