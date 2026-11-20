// 假的 wx 运行环境：只用于在 Node 里加载页面与组件代码、抓 JS 运行时错误、验证跳转去向。它不是微信环境。
const path = require('path');
function install(root) {
  const env = { mode: 'ok', storage: {}, nav: [], pages: [], comps: [], stack: [] };
  const api = (name, okRes, failRes) => (opt) => { opt = opt || {}; const ok = env.mode === 'ok'; if (ok && opt.success) opt.success(okRes); if (!ok && opt.fail) opt.fail(failRes); if (opt.complete) opt.complete(); };
  const nav = (kind) => (o) => { env.nav.push({ kind, url: o && o.url }); if (o && o.success) o.success({}); };
  global.wx = {
    getStorageSync: (k) => env.storage[k], setStorageSync: (k, v) => { env.storage[k] = JSON.parse(JSON.stringify(v)); }, removeStorageSync: (k) => { delete env.storage[k]; },
    getWindowInfo: () => ({ windowWidth: 375, windowHeight: 667, statusBarHeight: 47, pixelRatio: 3 }), getSystemInfoSync: () => ({ windowWidth: 375, statusBarHeight: 47 }),
    getMenuButtonBoundingClientRect: () => ({ top: 51, bottom: 83, left: 281, right: 368, width: 87, height: 32 }),
    getLocation: api('getLocation', { latitude: 39.97, longitude: 116.41 }, { errMsg: 'getLocation:fail auth deny', errno: 103 }),
    openSetting: api('openSetting', { authSetting: { 'scope.userLocation': true } }, { errMsg: 'fail' }),
    navigateTo: nav('navigateTo'), redirectTo: nav('redirectTo'), switchTab: nav('switchTab'), navigateBack: nav('navigateBack'), reLaunch: nav('reLaunch'),
    setNavigationBarTitle: () => {}, stopPullDownRefresh: () => {}, showToast: () => {}, setClipboardData: () => {}, showModal: (o) => o && o.success && o.success({ confirm: true }),
    requestSubscribeMessage: (o) => { o = o || {}; const r = {}; (o.tmplIds || []).forEach((id) => { r[id] = env.mode === 'ok' ? 'accept' : 'reject'; }); if (o.success) o.success(r); if (o.complete) o.complete(); },
    requestPayment: api('requestPayment', {}, { errMsg: 'requestPayment:fail cancel' }),
    makePhoneCall: api('makePhoneCall', {}, { errMsg: 'makePhoneCall:fail cancel' }), openLocation: api('openLocation', {}, { errMsg: 'fail' }), chooseLocation: api('chooseLocation', { name: '安贞门', address: '北京市朝阳区', latitude: 39.97, longitude: 116.41 }, { errMsg: 'chooseLocation:fail cancel' }),
    getSetting: api('getSetting', { authSetting: {} }, { errMsg: 'fail' }), openPrivacyContract: api('openPrivacyContract', {}, { errMsg: 'fail' }), getPrivacySetting: api('getPrivacySetting', { needAuthorization: false }, { errMsg: 'fail' }),
    chooseMedia: api('chooseMedia', { tempFiles: [{ tempFilePath: '/tmp/a.jpg', size: 1000 }] }, { errMsg: 'chooseMedia:fail cancel' }), previewImage: () => {}, downloadFile: api('downloadFile', { statusCode: 200, tempFilePath: '/tmp/a.pdf' }, { errMsg: 'fail' }), openDocument: api('openDocument', {}, { errMsg: 'fail' }),
    showLoading: () => {}, hideLoading: () => {}, showActionSheet: (o) => { if (env.mode === 'ok') { o && o.success && o.success({ tapIndex: 0 }); } else if (o && o.fail) o.fail({ errMsg: 'showActionSheet:fail cancel' }); },
    pageScrollTo: () => {}, vibrateShort: () => {}, getNetworkType: api('getNetworkType', { networkType: 'wifi' }, { errMsg: 'fail' }), onNetworkStatusChange: () => {}, offNetworkStatusChange: () => {},
    nextTick: (fn) => setTimeout(fn, 0), createSelectorQuery: () => { const q = { in: () => q, select: () => q, selectAll: () => q, boundingClientRect: () => q, scrollOffset: () => q, exec: (cb) => cb && cb([]) }; return q; },
    showShareMenu: () => {}, hideShareMenu: () => {}, getStorageInfoSync: () => ({ keys: [] }), clearStorageSync: () => { env.storage = {}; }, canIUse: () => true, hideKeyboard: () => {}, setStorage: (o) => { env.storage[o.key] = o.data; }, getStorage: (o) => o && o.success && o.success({ data: env.storage[o.key] }),
    request: api('request', { statusCode: 200, data: {} }, { errMsg: 'request:fail' })
  };
  const mkSetData = (inst) => function (patch, cb) { Object.keys(patch).forEach((k) => { inst.data[k] = patch[k]; }); if (cb) cb(); };
  let current = null;
  global.App = (o) => { env.app = o; };
  global.getApp = () => env.app;
  global.getCurrentPages = () => env.stack;
  global.Page = (o) => { current.options = o; };
  global.Component = (o) => { current.options = o; };
  env.loadApp = () => { require(path.join(root, 'app.js')); env.app.onLaunch && env.app.onLaunch(); };
  env.load = (base) => { current = { base }; const f = path.join(root, base + '.js'); delete require.cache[require.resolve(f)]; require(f); return current.options; };
  env.newPage = (base, query) => {
    const o = env.load(base); const inst = Object.assign({}, o, { data: JSON.parse(JSON.stringify(o.data || {})), route: base });
    inst.setData = mkSetData(inst); env.stack = [inst];
    if (inst.onLoad) inst.onLoad(query || {}); if (inst.onShow && !inst.__blocked) inst.__shown = inst.onShow();
    return inst;
  };
  env.newComponent = (base, props) => {
    const o = env.load(base); const data = JSON.parse(JSON.stringify(o.data || {}));
    Object.keys(o.properties || {}).forEach((k) => { const p = o.properties[k]; data[k] = props && k in props ? props[k] : (p && typeof p === 'object' && 'value' in p ? p.value : null); });
    const inst = Object.assign({ data, events: [] }, o.methods || {});
    inst.setData = function (patch) { Object.keys(patch).forEach((k) => { inst.data[k] = patch[k]; }); const obs = o.observers || {}; Object.keys(obs).forEach((k) => { if (k in patch) obs[k].call(inst, patch[k]); }); };
    inst.triggerEvent = (name, detail) => inst.events.push({ name, detail });
    if (o.lifetimes && o.lifetimes.attached) o.lifetimes.attached.call(inst);
    inst.__detach = () => o.lifetimes && o.lifetimes.detached && o.lifetimes.detached.call(inst);
    return inst;
  };
  return env;
}
module.exports = { install };
