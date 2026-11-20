// 定位（交接 v1.0 §4.2）。首页只自动申请一次；拒绝后不再自动申请。
// 直接调用 wx.getLocation，由微信出官方隐私 / 授权弹窗；不自建隐私弹窗。
// 位置授权被拒后微信不再弹窗，只能引导去设置页（wx.openSetting）；隐私弹窗被拒（errno 103 / 104）可以由用户主动再点一次。
// wx.getLocation 可能因服务类目开不通：所有入口都保留手动选城市 / 区域 / 商圈的路径，定位失败只是少了「当前位置」。
// 经纬度 → 城市 / 区域由接口 resolveCity 完成（正式环境是后端逆地理编码；演示环境见 services/mock-ext/find.js）。公里数仍是演示值（D-111）。
const C = require('../core/config');
const T = require('../i18n/find');
const state = require('./state');
const api = require('./api');
// 定位成功后的落点：城市有门店 → 用仓位置 = 定位点；城市没有门店 → 保持默认城市并记下原城市（D-184）
function applyFix(res) {
  const point = { status: 'granted', deniedBy: '', latitude: res.latitude, longitude: res.longitude };
  return api.resolveCity({ latitude: res.latitude, longitude: res.longitude }).then((r) => {
    if (r && r.hasStores) {
      const label = T.panel.near(r.district || r.city, r.area);
      state.patch('location', Object.assign(point, { city: r.city, kind: 'point', label, pointLabel: label, pointDistrict: r.district || '', noStoreCity: '' }));
    } else if (r && r.city) {
      state.patch('location', Object.assign(point, { city: C.defaultCity, kind: 'city', label: '', pointLabel: '', pointDistrict: '', noStoreCity: r.city }));
    } else state.patch('location', Object.assign(point, { pointLabel: T.panel.current, noStoreCity: '' }));
    return 'granted';
  }).catch(() => { state.patch('location', Object.assign(point, { pointLabel: T.panel.current })); return 'granted'; }); // 城市解析失败不影响已取得的定位状态
}
function request() {
  return new Promise((resolve) => {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => { applyFix(res || {}).then(resolve); },
      fail: (err) => {
        const msg = String((err && err.errMsg) || '');
        // 103 / 104：隐私弹窗被拒（耦合 / 直接样式）；auth deny：位置授权被拒；其余按超时或系统定位关闭处理
        const authDeny = /auth deny/i.test(msg);
        const privacy = !!err && (err.errno === 103 || err.errno === 104) && !authDeny;
        const status = privacy || authDeny || /authorize/i.test(msg) ? 'denied' : /timeout/i.test(msg) ? 'timeout' : 'system_off';
        state.patch('location', { status, deniedBy: status === 'denied' ? (privacy ? 'privacy' : 'auth') : '' });
        resolve(status);
      }
    });
  });
}
function requestOnce() {
  const s = state.get();
  if (s.flags.locationAsked) return Promise.resolve(s.location.status);
  state.patch('flags', { locationAsked: true });
  return request();
}
// 位置授权是否被拒（被拒后再调 wx.getLocation 不会弹窗，要先去设置页）
const needSetting = () => { const l = state.get().location; return l.status === 'denied' && l.deniedBy !== 'privacy'; };
// 用户主动点「开启 / 重新定位 / 重试」
function enable() {
  if (!needSetting()) return request();
  return new Promise((resolve) => wx.openSetting({ success: (r) => (r && r.authSetting && r.authSetting['scope.userLocation'] ? request().then(resolve) : resolve('denied')), fail: () => resolve('denied') }));
}
// 未定位时城市位气泡的文案与操作（D-119）：status → { text, action, kind }
function hint() {
  const l = state.get().location;
  if (l.status === 'granted') return null;
  if (l.status === 'system_off') return { text: T.locate.systemOff, action: T.locate.howTo, kind: 'system' };
  if (l.status === 'timeout') return { text: T.locate.timeout, action: T.locate.retry, kind: 'retry' };
  if (needSetting()) return { text: T.locate.tip, action: T.locate.goEnable, kind: 'setting' };
  return { text: T.locate.tip, action: T.locate.enable, kind: 'retry' };
}
// 气泡 / 面板上的操作：被拒 → 先说明再去设置页；系统定位关闭 → 说明方法；其余直接再取一次
function act(kind) {
  if (kind === 'setting') {
    return new Promise((resolve) => wx.showModal({ title: T.locate.settingsTitle, content: T.locate.settingsBody, cancelText: T.locate.settingsNo, confirmText: T.locate.settingsYes, success: (r) => (r && r.confirm ? enable().then(resolve) : resolve(state.get().location.status)), fail: () => resolve(state.get().location.status) }));
  }
  if (kind === 'system') {
    return new Promise((resolve) => wx.showModal({ title: T.locate.systemOff, content: T.locate.systemBody, showCancel: false, confirmText: T.locate.known, success: () => resolve(state.get().location.status), fail: () => resolve(state.get().location.status) }));
  }
  return enable();
}
module.exports = { request, requestOnce, enable, needSetting, hint, act };
