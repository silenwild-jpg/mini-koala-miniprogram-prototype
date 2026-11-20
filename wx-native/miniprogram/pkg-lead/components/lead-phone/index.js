// 预约页 / 企业页的「联系电话」字段（交接 v1.0 §4.1-8，D-126）。
// 已做：未登录显示「使用微信手机号」，点击打开全站同一个登录层，登录成功即取得联系电话；已登录直接带出登录手机号 + 「已验证」；
//      「修改」只改本次联系电话：可改用其他手机号（短信验证），不更换登录手机号。
// 未做：冻结稿 bk_wx（微信原生手机号选择框，由微信提供）；bk_denied 的专用说明句（要登录层把「用户拒绝授权」事件传出来，登录层是共享组件）。
// 事件：change { phone（另填的完整号码，没有则 ''）, masked（显示用）, ready } ；login（登录成功）
const T = require('../../../i18n/lead');
const L = require('../../../core/config-lead');
const lead = require('../../../core/lead');
const state = require('../../../services/state');
const api = require('../../../services/api');
Component({
  options: { addGlobalClass: true },
  properties: { what: { type: String, value: T.phone.whatBooking }, error: { type: String, value: '' } },
  data: { T: T.phone, loggedIn: false, loginMasked: '', masked: '', other: '', otherMasked: '', loginVisible: false, sheet: false, sms: false, sheetNote: '', fine: '', phone: '', code: '', sendText: T.phone.send, countdown: 0, sendOff: false, hint: '', smsError: '', busy: false },
  lifetimes: {
    attached() { this._off = state.on((topic) => { if (topic === 'session' || topic === '*') this.sync(); }); this.sync(); },
    detached() { if (this._off) this._off(); this.stopTimer(); }
  },
  methods: {
    sync() {
      const s = state.get().session, loggedIn = !!s.loggedIn;
      const other = loggedIn ? this.data.other : ''; // 退出登录后另填的号码一并作废
      this.setData({ loggedIn, loginMasked: s.phoneMasked || '', other, otherMasked: other ? lead.maskPhone(other) : '', masked: other ? lead.maskPhone(other) : (loggedIn ? s.phoneMasked || '' : ''), sheetNote: T.fn.phoneSheetNote(this.data.what), fine: T.fn.phoneFine(this.data.what) });
      this.triggerEvent('change', { phone: other, masked: this.data.masked, ready: loggedIn });
    },
    onUseWechat() { this.setData({ loginVisible: true }); },
    onLoginClose() { this.setData({ loginVisible: false }); },
    onLoginSuccess() { this.sync(); this.triggerEvent('login'); },
    onModify() { this.setData({ sheet: true }); },
    onSheetClose() { this.setData({ sheet: false }); },
    onPickLogin() { this.setData({ other: '' }); this.sync(); },
    onPickOther() { this.setData({ sheet: false, sms: true, phone: '', code: '', hint: '', smsError: '' }); },
    onSmsClose() { this.setData({ sms: false }); this.stopTimer(); },
    onPhone(e) { this.setData({ phone: e.detail.value, smsError: '' }); },
    onCode(e) { this.setData({ code: e.detail.value, smsError: '' }); },
    onSend() {
      if (this.data.countdown > 0) return;
      api.sendSmsCode({ phone: lead.cleanPhone(this.data.phone) }).then((r) => { this.setData({ hint: T.phone.sent }); this.startTimer(r.resend_seconds || L.smsResendSeconds); })
        .catch((err) => this.setData({ hint: '', smsError: (err && err.message) || T.phone.sendFail }));
    },
    onVerify() {
      if (this.data.busy) return;
      this.setData({ busy: true, smsError: '' });
      api.verifyContactPhone({ phone: this.data.phone, code: this.data.code }).then((r) => { this.setData({ busy: false, sms: false, other: r.phone }); this.stopTimer(); this.sync(); })
        .catch((err) => this.setData({ busy: false, smsError: (err && err.message) || '' }));
    },
    startTimer(sec) {
      this.stopTimer(); this.setData({ countdown: sec, sendOff: sec > 0, sendText: T.fn.resend(sec) });
      this._t = setInterval(() => { const n = this.data.countdown - 1; this.setData({ countdown: Math.max(0, n), sendOff: n > 0, sendText: n > 0 ? T.fn.resend(n) : T.phone.send }); if (n <= 0) this.stopTimer(); }, 1000);
    },
    stopTimer() { if (this._t) { clearInterval(this._t); this._t = null; } }
  }
});
