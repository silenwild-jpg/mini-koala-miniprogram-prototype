// 全站状态：一份登录态、一份用仓需求、一份用仓位置、一份估算草稿（交接 v1.0 §3）。
// 页面不各存一份，统一经这里读写；持久化用 wx 本机存储。
const C = require('../core/config');
const KEY = 'mk_state_v1';
const listeners = [];
const fresh = () => ({
  session: { loggedIn: false, phoneMasked: '', token: '' }, // 手机号绑定长期有效（D-116）
  requirement: null, // { capacity_m3, input_unit: 'm3'|'m2', input_value, source: 'manual'|'items', term_months }
  location: { city: C.defaultCity, kind: 'city', label: '', status: 'unasked', noStoreCity: '' }, // status: unasked|granted|denied|system_off|timeout
  recents: [],       // 最近使用的用仓位置，最多 3 个，存本机
  favorites: { stores: [], units: [] },
  draft: { items: [], capacity_raw: '', unit: 'm3' }, // 估算两页共用草稿
  flags: { locationAsked: false, pendingLogin: '' }  // pendingLogin：被登录守卫带到落点页后要打开登录层
});
let S = fresh();
function load() { try { const v = wx.getStorageSync(KEY); if (v && typeof v === 'object') S = Object.assign(fresh(), v); } catch (e) { S = fresh(); } return S; }
function save() { try { wx.setStorageSync(KEY, S); } catch (e) { /* 存储失败不影响本次使用 */ } }
function emit(topic) { listeners.slice().forEach((fn) => { try { fn(topic, S); } catch (e) { console.error(e); } }); }
function on(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; }
const get = () => S;
function patch(topic, part) { S[topic] = Object.assign({}, S[topic], part); save(); emit(topic); }
function set(topic, value) { S[topic] = value; save(); emit(topic); }

function setRequirement(r) { // 未选过租期时默认 12 个月并视为已选（D-158）
  set('requirement', r ? Object.assign({ term_months: C.requirement.termDefault, source: 'manual' }, r) : null);
}
function setTerm(m) { if (S.requirement) patch('requirement', { term_months: m }); }
function setSession(s) { patch('session', s); }
function logout() { set('session', fresh().session); }
function setLocation(loc) {
  patch('location', loc);
  if (loc.label && loc.kind !== 'city') {
    const rec = { city: S.location.city, kind: loc.kind, label: loc.label };
    set('recents', [rec].concat(S.recents.filter((x) => x.label !== rec.label)).slice(0, C.timers.recentLocationsKept));
  }
}
function reset() { S = fresh(); save(); emit('*'); }
module.exports = { load, get, on, patch, set, setRequirement, setTerm, setSession, logout, setLocation, reset };
