const log = require('../../utils/log');
const env = require('../../utils/env');
const app = getApp();

function show(page, key, obj) {
  const d = {};
  d[key] = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 1);
  page.setData(d);
}

Page({
  data: { o1: '', o2: '', o3: '', o4: '', o5: '' },

  // 1 隐私：是否还有待同意的隐私协议、后台填写的指引名称
  onPrivacy() {
    if (!wx.getPrivacySetting) { show(this, 'o1', '当前基础库没有 wx.getPrivacySetting'); return; }
    wx.getPrivacySetting({
      success: (res) => {
        const r = { needAuthorization: res.needAuthorization, privacyContractName: res.privacyContractName };
        log.record('P2', '查询隐私状态', r);
        show(this, 'o1', r);
      },
      fail: (err) => { log.record('P2', '查询隐私状态失败', log.brief(err)); show(this, 'o1', log.brief(err)); }
    });
  },
  onOpenContract() {
    if (!wx.openPrivacyContract) { show(this, 'o1', '当前基础库没有 wx.openPrivacyContract'); return; }
    wx.openPrivacyContract({
      success: () => log.record('P2', '打开隐私保护指引：成功', null),
      fail: (err) => { log.record('P2', '打开隐私保护指引：失败', log.brief(err)); show(this, 'o1', log.brief(err)); }
    });
  },

  // 2 再次申请定位：拒绝过之后，这里是再弹窗还是直接失败
  onLocate() { this.locate('C3', '再次申请定位', {}, 'o2'); },

  // 3 授权状态与设置页
  onSetting() {
    wx.getSetting({
      success: (res) => {
        const e = env.collect();
        const r = { 'scope.userLocation': res.authSetting['scope.userLocation'], 系统定位开关: e.locationEnabled, 微信的定位权限: e.locationAuthorized };
        log.record('C3', '授权状态', r);
        show(this, 'o3', r);
      }
    });
  },
  onOpenSetting() {
    wx.openSetting({
      success: (res) => {
        const r = { 'scope.userLocation': res.authSetting['scope.userLocation'] };
        log.record('C3', '从设置页返回', r);
        show(this, 'o3', r);
      },
      fail: (err) => { log.record('C3', '打开设置页失败', log.brief(err)); show(this, 'o3', log.brief(err)); }
    });
  },

  // 4 超时：高精度定位并把超时设为 3 秒，记录实际等待时长
  onTimeout() { this.locate('C4', '高精度定位（超时 3 秒）', { isHighAccuracy: true, highAccuracyExpireTime: 3000 }, 'o4'); },
  onPlain() { this.locate('C4', '普通定位（不设超时）', {}, 'o4'); },

  locate(caseId, action, extra, key) {
    const t0 = Date.now();
    show(this, key, '请求中…');
    wx.getLocation(Object.assign({
      type: 'gcj02',
      success: (res) => {
        app.globalData.locState = 'ok';
        const r = { 结果: '成功', 耗时ms: Date.now() - t0, 精度m: res.accuracy, lat: Math.round(res.latitude * 100) / 100, lng: Math.round(res.longitude * 100) / 100 };
        log.record(caseId, action, r);
        show(this, key, r);
      },
      fail: (err) => {
        const r = Object.assign({ 结果: '失败', 耗时ms: Date.now() - t0 }, log.brief(err));
        log.record(caseId, action, r);
        show(this, key, r);
      }
    }, extra));
  }
});
