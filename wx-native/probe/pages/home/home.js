const log = require('../../utils/log');
const app = getApp();

const ENTRIES = [
  { url: '/pages/env/env', t: '1. 设备与版本', d: '机型、微信版本、基础库、状态栏、胶囊、安全区' },
  { url: '/pages/location/location', t: '2. 隐私与定位', d: 'C1–C4：弹窗样式、拒绝后再申请、超时' },
  { url: '/pages/phone/phone', t: '3. 微信手机号', d: 'D1、D2：同意、拒绝、失败；未勾协议时拦截' },
  { url: '/pages/subscribe/subscribe', t: '4. 订阅消息与支付', d: 'E1、E2、D8：授权框；与支付的先后顺序' },
  { url: '/pages/keyboard/keyboard', t: '5. 弹层与键盘', d: 'B6、C7、C10、D5：键盘类型、顶起、滚动穿透' },
  { url: '/pages/layout/layout', t: '6. 字号、描边与版式', d: 'B4、B5、B8、C6、C8、D10' },
  { url: '/pages/misc/misc', t: '7. 地图、拨号、分享、选图、计时', d: 'C9、C14、D4、E7、F5' },
  { url: '/pages/results/results', t: '结果汇总', d: '全部记录一键复制，发回群里' }
];

Page({
  data: { entries: ENTRIES, nav: null, locText: '尚未申请', locDot: false, auto: '' },

  onLoad() {
    // C1：与设计一致——首页首次进入直接调用定位接口，不自建隐私弹窗，由微信出官方弹窗。
    if (!app.globalData.autoLocateDone) {
      app.globalData.autoLocateDone = true;
      this.locate('首页自动申请');
    }
  },

  onShow() { this.renderLoc(); },

  onNavMeasure(e) {
    this.setData({ nav: e.detail });
    log.record('B2', '导航栏尺寸', e.detail);
  },

  locate(action) {
    const t0 = Date.now();
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        app.globalData.locState = 'ok';
        log.record('C1', action + '：成功', { ms: Date.now() - t0, lat: Math.round(res.latitude * 100) / 100, lng: Math.round(res.longitude * 100) / 100 });
      },
      fail: (err) => {
        app.globalData.locState = 'denied';
        log.record('C1', action + '：失败', Object.assign({ ms: Date.now() - t0 }, log.brief(err)));
        this.setData({ auto: JSON.stringify(log.brief(err)) });
      },
      complete: () => this.renderLoc()
    });
  },

  renderLoc() {
    const s = app.globalData.locState;
    const text = s === 'ok' ? '已获取位置' : s === 'denied' ? '未获取位置（本次启动不再自动申请）' : '申请中或尚未申请';
    this.setData({ locText: text, locDot: s === 'denied' });
  },

  go(e) { wx.navigateTo({ url: e.currentTarget.dataset.url }); }
});
