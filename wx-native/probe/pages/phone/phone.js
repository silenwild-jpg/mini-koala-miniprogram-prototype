const log = require('../../utils/log');

Page({
  data: { agreed: false, out: '', count: 0 },

  onToggle() { this.setData({ agreed: !this.data.agreed }); },

  // 未勾协议：这是一个普通按钮，不带 open-type，所以不会调起微信的手机号面板，也不消耗额度。
  onBlocked() {
    wx.showToast({ title: '请先阅读并同意协议', icon: 'none' });
    log.record('D2', '未勾协议点击：已拦截，未调起手机号面板', null);
  },

  onPhone(e) {
    const d = e.detail || {};
    // code 是一次性动态令牌，不记录内容，只记录有没有拿到。
    const r = { errMsg: d.errMsg, errno: d.errno, 拿到code: !!d.code, code长度: d.code ? d.code.length : 0 };
    log.record('D1', '手机号按钮回调（' + e.currentTarget.dataset.kind + '）', r);
    this.setData({ out: JSON.stringify(r, null, 1), count: this.data.count + (d.code ? 1 : 0) });
  }
});
