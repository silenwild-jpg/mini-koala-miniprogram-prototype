// 采集机型、微信版本、基础库、状态栏、胶囊、安全区、系统字号、授权开关。新旧接口都兼容。
function safe(fn) {
  try { return fn(); } catch (e) { return null; }
}

function collect() {
  const legacy = safe(() => wx.getSystemInfoSync()) || {};
  const win = (wx.getWindowInfo && safe(() => wx.getWindowInfo())) || legacy;
  const dev = (wx.getDeviceInfo && safe(() => wx.getDeviceInfo())) || legacy;
  const base = (wx.getAppBaseInfo && safe(() => wx.getAppBaseInfo())) || legacy;
  const auth = (wx.getAppAuthorizeSetting && safe(() => wx.getAppAuthorizeSetting())) || {};
  const sys = (wx.getSystemSetting && safe(() => wx.getSystemSetting())) || {};
  const menu = safe(() => wx.getMenuButtonBoundingClientRect()) || {};
  const account = (wx.getAccountInfoSync && safe(() => wx.getAccountInfoSync())) || {};
  const mp = account.miniProgram || {};
  const sa = win.safeArea || {};
  const screenHeight = win.screenHeight || 0;
  return {
    brand: dev.brand || '',
    model: dev.model || '',
    system: dev.system || '',
    platform: dev.platform || '',
    wechat: base.version || '',
    sdk: base.SDKVersion || '',
    fontSizeSetting: base.fontSizeSetting !== undefined ? base.fontSizeSetting : (legacy.fontSizeSetting || ''),
    envVersion: mp.envVersion || '',
    appId: mp.appId || '',
    pixelRatio: win.pixelRatio || 0,
    screen: (win.screenWidth || 0) + '×' + screenHeight,
    window: (win.windowWidth || 0) + '×' + (win.windowHeight || 0),
    windowWidth: win.windowWidth || 375,
    statusBarHeight: win.statusBarHeight || 0,
    safeTop: sa.top !== undefined ? sa.top : '',
    safeBottomInset: sa.bottom !== undefined && screenHeight ? screenHeight - sa.bottom : '',
    menu: { top: menu.top || 0, bottom: menu.bottom || 0, left: menu.left || 0, right: menu.right || 0, width: menu.width || 0, height: menu.height || 0 },
    locationEnabled: sys.locationEnabled !== undefined ? sys.locationEnabled : '',
    locationAuthorized: auth.locationAuthorized !== undefined ? auth.locationAuthorized : '',
    notificationAuthorized: auth.notificationAuthorized !== undefined ? auth.notificationAuthorized : ''
  };
}

// 比较基础库版本：a >= b 返回 true。
function sdkAtLeast(a, b) {
  const x = String(a || '0').split('.');
  const y = String(b).split('.');
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const m = parseInt(x[i] || '0', 10);
    const n = parseInt(y[i] || '0', 10);
    if (m > n) return true;
    if (m < n) return false;
  }
  return true;
}

// 自定义导航栏尺寸：按胶囊位置算，取不到胶囊时退回 44。
function navMetrics() {
  const e = collect();
  const ok = e.menu.height > 0 && e.menu.top > 0;
  const status = e.statusBarHeight || 20;
  const barHeight = ok ? (e.menu.top - status) * 2 + e.menu.height : 44;
  const rightInset = ok ? e.windowWidth - e.menu.left + 8 : 104;
  return { status: status, barHeight: barHeight, total: status + barHeight, rightInset: rightInset, menuOk: ok };
}

module.exports = { collect, sdkAtLeast, navMetrics };
