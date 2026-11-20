// 实名状态：全站一份，存在 state 的 identity 主题里（W34 交易域新增）。
// 结构：{ status: 'verified', nameMasked: '*明', idMasked: '110***********0012', phone: '138****8000' }；没有认证过时主题为 undefined。
// phone 记录的是认证时的登录手机号：换了账号登录后，旧的实名信息不再生效（state.logout 不会清这个主题，所以读的时候比对）。
const state = require('./state');
function get() {
  const s = state.get(), v = s.identity;
  const ok = !!(v && v.status === 'verified' && s.session.loggedIn && v.phone === s.session.phoneMasked);
  return { verified: ok, nameMasked: ok ? v.nameMasked : '', idMasked: ok ? v.idMasked : '', text: ok ? v.nameMasked + ' · ' + v.idMasked : '' };
}
// 接口 verifyIdentity / getIdentity 的返回 { status, name_masked, id_masked } 写入本机
function save(res) {
  if (!res || res.status !== 'verified') { state.set('identity', undefined); return get(); }
  state.set('identity', { status: 'verified', nameMasked: res.name_masked, idMasked: res.id_masked, phone: state.get().session.phoneMasked });
  return get();
}
module.exports = { get, save };
