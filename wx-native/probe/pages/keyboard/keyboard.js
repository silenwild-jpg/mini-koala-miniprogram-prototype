const log = require('../../utils/log');

const filler = [];
for (let i = 1; i <= 30; i++) filler.push(i);

Page({
  data: {
    filler: filler, sheet: '', lift: 0, kb: 0,
    cap: '', idno: '', sms: '', kw: '', searchLog: [], inputCount: 0
  },

  open(e) { this.setData({ sheet: e.currentTarget.dataset.s, lift: 0 }); },
  close() { this.setData({ sheet: '', lift: 0 }); },

  // 键盘高度变化：弹层里的输入框关掉了 adjust-position，由页面自己把弹层顶起
  onKb(e) {
    const h = e.detail.height || 0;
    this.setData({ lift: h, kb: h });
    if (h > 0) log.record('D5', '键盘高度', { px: h, 弹层: this.data.sheet });
  },

  onCap(e) { this.setData({ cap: e.detail.value }); },
  onCapBlur() { log.record('C10', '容量输入结果', { 值: this.data.cap, 含小数点: this.data.cap.indexOf('.') >= 0 }); },
  onId(e) { this.setData({ idno: e.detail.value }); },
  onIdBlur() {
    const v = this.data.idno;
    // 不记录证件号本身，只记录长度和是否输入了 X
    log.record('D5', '证件号输入结果', { 长度: v.length, 含X: /x/i.test(v) });
  },
  onSms(e) { this.setData({ sms: e.detail.value }); },

  // C7：每次 input 事件都记一笔，用来看拼音联想阶段会不会触发
  onKw(e) {
    const v = e.detail.value;
    const list = this.data.searchLog.concat(['「' + v + '」']).slice(-8);
    this.setData({ kw: v, searchLog: list, inputCount: this.data.inputCount + 1 });
  },
  onKwConfirm() { log.record('C7', '搜索输入', { 最终值长度: this.data.kw.length, input事件次数: this.data.inputCount, 最近: this.data.searchLog }); }
});
