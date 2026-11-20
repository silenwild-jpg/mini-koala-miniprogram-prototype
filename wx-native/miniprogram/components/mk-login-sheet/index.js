// 全站唯一的登录层（交接 v1.0 §4.1）。手机号验证通过即登录，未注册自动注册；界面只说「登录」。
// 登录成功后停在原页（不自动跳进确认订单，让用户先看到整期价）。对外：属性 visible / tip，事件 close / success。
// 已做（冻结稿 s5 的 auth=phone* / sms* 13 个状态）：
//   入口（未勾协议）、未勾协议就点登录的提示、微信取号中（验证中…）、微信取号失败或额度不足（隐藏微信按钮、引导短信）、用户不允许（留在入口，可暂不登录）、
//   短信登录、已发送倒计时、验证码错误、验证码过期、发送失败 / 过频、号码已绑定其他账号（不覆盖、不合并）、登录成功提示。
// 未做：微信手机号授权弹窗本身（phone_wx）由微信原生提供，不自己画。
// 隐私保护指引（FIX-01 S-01）：底部单独一行入口，走 wx.openPrivacyContract，与《注册协议》的勾选分开。微信按钮仍是 getPhoneNumber|agreePrivacyAuthorization，
//   点按时微信是否还弹官方隐私框、同意是否随点按同步，需真机确认。
// 短信倒计时（FIX-01 E-02）：关闭登录层不停表（号码保留着，重新打开看到的是真实剩余秒数），走完自动恢复「获取验证码」；换号码时归零。
// 与冻结稿的一处差别：微信取号失败后直接切到短信登录表单并在顶部写明原因（冻结稿停在入口、只留「其他手机号登录」），少一步点按。
const api = require('../../services/api');
const state = require('../../services/state');
const routes = require('../../services/routes');
const CT = require('../../core/config-trade');
const TT = require('../../i18n/trade');
const T = TT.login;
Component({
  options: { addGlobalClass: true },
  properties: { visible: { type: Boolean, value: false }, tip: { type: String, value: '请登录' } },
  data: {
    T, agreement: TT.docName.register, conflictDesc: T.conflictDesc[0] + CT.hotline + T.conflictDesc[1],
    sheetTitle: T.title, agreed: false, mode: 'entry', // entry | sms | conflict
    wechatOk: true, wxLoading: false, note: '', // note: '' | 'fail' | 'denied'
    phone: '', code: '', error: '', codeErr: false, hint: '', countdown: 0, sendLabel: T.sendCode, resend: false, ready: false, busy: false
  },
  observers: {
    visible(v) { if (v) this.setData({ mode: 'entry', sheetTitle: T.title, error: '', codeErr: false, hint: '', note: '', code: '', busy: false, wxLoading: false, ready: false }); }
  },
  lifetimes: { detached() { this.stopTimer(); } },
  methods: {
    onClose() { this.triggerEvent('close'); },
    onToggleAgree() { this.setData({ agreed: !this.data.agreed, error: '' }); },
    onAgreement() { wx.navigateTo({ url: routes.AGREEMENT + '?doc=register' }); },
    onNeedAgree() { this.setData({ error: T.agreeTip }); },
    onAgreePrivacy() {},
    onPrivacy() {
      if (!wx.openPrivacyContract) return wx.showToast({ title: T.privacyFail, icon: 'none' });
      wx.openPrivacyContract({ fail: () => wx.showToast({ title: T.privacyFail, icon: 'none' }) });
    },
    syncReady() { const d = this.data; this.setData({ ready: String(d.phone).length === CT.sms.phoneLength && String(d.code).length === CT.sms.codeLength }); },
    toSms(note) { this.setData({ mode: 'sms', sheetTitle: T.smsTitle, error: '', codeErr: false, hint: '', note: note || '' }); },
    // 微信手机号快捷登录：拿到 code 交给后端换手机号。取号失败或额度不足（errno 1400001）时隐藏微信按钮，引导短信登录。
    onGetPhone(e) {
      let d = (e && e.detail) || {};
      const sim = state.get().flags.demoPhone;
      if (sim) { state.patch('flags', { demoPhone: '' }); d = sim === 'denied' ? { errMsg: 'getPhoneNumber:fail user deny' } : { errMsg: 'getPhoneNumber:fail', errno: 1400001 }; }
      if (!d.code) {
        const msg = String(d.errMsg || '');
        if (/deny|cancel/i.test(msg) && d.errno !== 1400001) { this.setData({ note: 'denied', error: '' }); return; } // 用户不允许：留在登录层，可改用其他手机号或先继续浏览
        this.setData({ wechatOk: false });
        this.toSms('fail');
        return;
      }
      this.setData({ wxLoading: true });
      this.finish(api.loginByWechatPhone({ code: d.code }));
    },
    onOther() { this.toSms(''); },
    onUseWechat() { this.setData({ mode: 'entry', sheetTitle: T.title, error: '', codeErr: false, hint: '', note: '' }); },
    onPhone(e) { this.setData({ phone: e.detail.value, error: '', codeErr: false }); this.syncReady(); },
    onCode(e) { this.setData({ code: e.detail.value, error: '', codeErr: false }); this.syncReady(); },
    onSend() {
      if (this.data.countdown > 0 || this.data.busy) return;
      if (!this.data.agreed) return this.onNeedAgree();
      api.sendSmsCode({ phone: this.data.phone }).then((r) => { this.setData({ error: '', codeErr: false, hint: T.sentHint, resend: false }); this.startTimer(r.resend_seconds || 60); })
        .catch((err) => {
          const code = err && err.code;
          if (code === 'INVALID') return this.setData({ error: err.message, hint: '' });
          this.setData({ error: code === 'RATE_LIMIT' ? T.rateLimit : T.sendFail, hint: '', resend: true, sendLabel: T.resend }); // 发送过频 / 发送失败：可重新获取
        });
    },
    onSubmitSms() {
      if (!this.data.agreed) return this.onNeedAgree();
      this.finish(api.loginBySms({ phone: this.data.phone, code: this.data.code }));
    },
    onConflictService() { wx.makePhoneCall({ phoneNumber: CT.hotline.replace(/-/g, ''), fail() {} }); },
    onConflictChange() { this.stopTimer(); this.setData({ phone: '', code: '', ready: false, countdown: 0, sendLabel: T.sendCode, resend: false }); this.toSms(''); },
    finish(p) {
      if (this.data.busy) return;
      this.setData({ busy: true, error: '', codeErr: false });
      p.then((session) => {
        state.setSession(session); this.setData({ busy: false, wxLoading: false });
        wx.showToast({ title: T.ok, icon: 'none' });
        this.triggerEvent('success', { phoneMasked: session.phoneMasked }); this.triggerEvent('close');
      }).catch((err) => {
        const code = err && err.code, base = { busy: false, wxLoading: false };
        if (code === 'CONFLICT') return this.setData(Object.assign(base, { mode: 'conflict', sheetTitle: T.conflictTitle })); // 号码冲突：不覆盖、不合并
        if (code === 'WRONG_CODE') return this.setData(Object.assign(base, { error: T.codeWrong, codeErr: true, hint: '' }));
        if (code === 'EXPIRED') { this.stopTimer(); return this.setData(Object.assign(base, { error: T.codeExpired, codeErr: true, hint: '', countdown: 0, resend: true, sendLabel: T.resend })); }
        this.setData(Object.assign(base, { error: (err && err.message) || T.loginFail }));
      });
    },
    startTimer(sec) {
      this.stopTimer(); this.setData({ countdown: sec, sendLabel: sec + T.waitSuffix });
      this._t = setInterval(() => { const n = Math.max(0, this.data.countdown - 1); this.setData({ countdown: n, sendLabel: n > 0 ? n + T.waitSuffix : (this.data.resend ? T.resend : T.sendCode) }); if (n <= 0) this.stopTimer(); }, 1000);
    },
    stopTimer() { if (this._t) { clearInterval(this._t); this._t = null; } }
  }
});
