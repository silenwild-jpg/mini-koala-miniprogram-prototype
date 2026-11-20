const log = require('../../utils/log');
const config = require('../../config');

Page({
  data: { o1: '', o2: '', o3: '', o4: '', left: 0, running: false },
  timer: null,
  endAt: 0,
  ticks: 0,
  hiddenAt: 0,

  out(key, obj) { const d = {}; d[key] = JSON.stringify(obj, null, 1); this.setData(d); },

  // C9
  onMap() {
    const s = config.demoStore;
    wx.openLocation({
      latitude: s.latitude, longitude: s.longitude, name: s.name, address: s.address, scale: 16,
      success: () => { log.record('C9', '内置地图：已打开', null); this.out('o1', { 地图: '已打开' }); },
      fail: (err) => { log.record('C9', '内置地图：失败', log.brief(err)); this.out('o1', log.brief(err)); }
    });
  },
  onCall() {
    wx.makePhoneCall({
      phoneNumber: config.demoPhone,
      success: () => { log.record('C9', '拨号：已调起', null); this.out('o1', { 拨号: '已调起' }); },
      fail: (err) => { log.record('C9', '拨号：未拨出', log.brief(err)); this.out('o1', log.brief(err)); }
    });
  },

  // C14：发一个请求，看断网、弱网时多久返回、返回什么
  onRequest() {
    const t0 = Date.now();
    wx.getNetworkType({
      success: (n) => {
        wx.request({
          url: 'https://servicewechat.com/', timeout: 8000,
          complete: (res) => {
            const r = { 网络: n.networkType, 耗时ms: Date.now() - t0, 状态码: res.statusCode, errMsg: res.errMsg };
            log.record('C14', '网络请求', r); this.out('o2', r);
          }
        });
      }
    });
  },

  // E7
  onMedia() {
    wx.chooseMedia({
      count: 1, mediaType: ['image'], sourceType: ['album', 'camera'],
      success: (res) => {
        const f = res.tempFiles[0] || {};
        const r = { 结果: '已选择', 大小KB: Math.round((f.size || 0) / 1024) };
        log.record('E7', '选图', r); this.out('o3', r);
      },
      fail: (err) => { log.record('E7', '选图未完成', log.brief(err)); this.out('o3', log.brief(err)); }
    });
  },

  // D4：60 秒倒计时。显示值按「截止时刻 − 现在」算；同时数定时器实际跳了几次，用来看切后台时定时器是否暂停。
  onStart() {
    this.stop();
    this.endAt = Date.now() + 60000;
    this.ticks = 0;
    this.setData({ left: 60, running: true, o4: '' });
    this.timer = setInterval(() => {
      this.ticks += 1;
      const left = Math.max(0, Math.ceil((this.endAt - Date.now()) / 1000));
      this.setData({ left: left });
      if (left === 0) {
        const r = { 定时器跳动次数: this.ticks, 应为: 60, 说明: this.ticks < 58 ? '切后台期间定时器暂停过；按截止时刻计算的显示值仍然准确' : '定时器没有明显暂停' };
        log.record('D4', '倒计时结束', r); this.out('o4', r);
        this.stop();
      }
    }, 1000);
  },
  stop() { if (this.timer) { clearInterval(this.timer); this.timer = null; } this.setData({ running: false }); },
  onHide() { this.hiddenAt = Date.now(); },
  onShow() {
    if (this.hiddenAt && this.timer) {
      log.record('D4', '从后台回来', { 离开秒数: Math.round((Date.now() - this.hiddenAt) / 1000), 回来时已跳动: this.ticks });
    }
    this.hiddenAt = 0;
  },
  onUnload() { this.stop(); },

  // F5
  onShareAppMessage() {
    log.record('F5', '发起分享', null);
    return { title: '安贞·富仁名苑店 · 迷你考拉仓', path: '/pages/stores/stores?from=share' };
  }
});
