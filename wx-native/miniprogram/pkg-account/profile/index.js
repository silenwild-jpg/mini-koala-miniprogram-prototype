// 个人信息 ACC_PROFILE（第 4 批）：账户与联系方式、账户与隐私（隐私授权管理、注销账号）、退出登录（D-153）。
// 已做：未登录态（「登录 / 注册」打开登录层）；已登录态；修改联系电话弹层与校验（只改联系电话，不换登录手机号，D-126）；
//       更换登录手机号（短信验证、倒计时、号码已绑定其他账号时提示冲突，不覆盖不合并，§4.1-7）；
//       隐私授权管理（位置授权读 wx.getSetting，「去设置」走 wx.openSetting，隐私保护指引走 wx.openPrivacyContract，撤回授权二次确认）；
//       注销账号（条件说明、申请、条件不满足时拦截）；退出登录确认（state.logout()）；加载 / 失败 / 断网。
// 注意：注销条件、撤回授权后果的文案是冻结稿初稿，法务未确认（见 i18n/account.js 的标注）。
// 未做：微信没有「由小程序代用户撤回隐私授权」的接口，「确认撤回」现在做的是：通知后端、退出登录、清掉本机的定位申请标记；真正撤回要用户在微信设置里操作，需真机确认说法。
const TA = require('../../i18n/account');
const C = require('../../core/config-account');
const rules = require('../../core/account');
const state = require('../../services/state');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const api = require('../../services/api');
const pd = require('../../services/page-data');
const P = TA.profile;
const toast = (title) => wx.showToast({ title, icon: 'none' });
const NO_DIALOG = { visible: false, kind: '', title: '', desc: '', cancelText: '', confirmText: '' };
Page(auth.guarded(routes.PROFILE, {
  data: {
    T: { p: P, common: TA.common }, sys: 'loading', loggedIn: false, headTitle: P.guestTitle, headSub: P.guestSub, loginPhone: '', contact: '', identityVerified: false,
    contactVisible: false, contactValue: '', contactError: '', contactBusy: false,
    changeVisible: false, chPhone: '', chCode: '', chCountdown: 0, chSendText: P.change.send, chHint: '', chError: '', chReady: false, chBusy: false,
    privacyVisible: false, locationText: P.privacySheet.notGranted, identityText: P.privacySheet.notVerified,
    deleteVisible: false, deleteBusy: false, dialog: NO_DIALOG, loginVisible: false
  },
  onShow() { this.refresh(); },
  onHide() { this.stopTimer(); },
  onUnload() { this.stopTimer(); },
  refresh() {
    const s = state.get().session, logged = !!s.loggedIn;
    this.setData({ loggedIn: logged, headTitle: logged ? P.signedTitle : P.guestTitle, headSub: logged ? (s.phoneMasked || P.signedSub) : P.guestSub, loginPhone: logged ? s.phoneMasked : '' });
    if (!logged) { this.setData({ sys: '', contact: '', identityVerified: false }); return Promise.resolve(); } // 未登录不取个人数据
    return pd.load(this, api.getProfile(), (r) => this.setData({ loginPhone: r.phoneMasked, headSub: r.phoneMasked || P.signedSub, contact: r.contactMasked || '', identityVerified: !!r.identityVerified, identityText: r.identityVerified ? P.privacySheet.verified : P.privacySheet.notVerified }));
  },
  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },
  // ---- 联系电话 ----
  onEditContact() { this.setData({ contactVisible: true, contactValue: '', contactError: '' }); },
  onContactClose() { this.setData({ contactVisible: false }); },
  onContactInput(e) { this.setData({ contactValue: e.detail.value, contactError: '' }); },
  onSaveContact() {
    const v = this.data.contactValue;
    if (this.data.contactBusy) return;
    if (!rules.validContactPhone(v)) return this.setData({ contactError: P.contactSheet.error });
    if (!auth.isLoggedIn()) { this._pendingContact = v; this.setData({ contactVisible: false }); return auth.openLogin(this); } // 联系电话存在账户里：先登录，登录成功后接着保存
    this.setData({ contactBusy: true });
    api.saveContactPhone({ phone: v }).then((r) => { this.setData({ contactBusy: false, contactVisible: false, contact: r.contactMasked }); toast(P.contactSheet.saved); })
      .catch((err) => { this.setData({ contactBusy: false, contactVisible: true, contactError: err && err.code === 'INVALID' ? P.contactSheet.error : TA.common.saveFailed }); });
  },
  // ---- 更换登录手机号 ----
  onChangePhone() { if (!this.data.loggedIn) return auth.openLogin(this); this.setData({ changeVisible: true, chPhone: '', chCode: '', chHint: '', chError: '', chReady: false }); },
  onChangeClose() { this.setData({ changeVisible: false }); },
  syncChange(patch) { const d = Object.assign({}, this.data, patch); patch.chReady = rules.validLoginPhone(d.chPhone) && rules.validSmsCode(d.chCode); patch.chError = ''; this.setData(patch); },
  onChPhone(e) { this.syncChange({ chPhone: e.detail.value }); },
  onChCode(e) { this.syncChange({ chCode: e.detail.value }); },
  onChSend() {
    if (this.data.chCountdown > 0) return;
    api.sendSmsCode({ phone: rules.normPhone(this.data.chPhone) }).then((r) => { this.setData({ chHint: P.change.sentHint, chError: '' }); this.startTimer(r.resend_seconds || 60); })
      .catch((err) => this.setData({ chError: (err && err.message) || TA.common.saveFailed, chHint: '' }));
  },
  onChSubmit() {
    if (!this.data.chReady || this.data.chBusy) return;
    this.setData({ chBusy: true });
    api.changeLoginPhone({ phone: this.data.chPhone, code: this.data.chCode }).then((r) => {
      state.setSession({ phoneMasked: r.phoneMasked });
      this.stopTimer(); this.setData({ chBusy: false, changeVisible: false, chCountdown: 0, chSendText: P.change.send }); toast(P.change.done); this.refresh();
    }).catch((err) => {
      this.setData({ chBusy: false });
      if (err && err.code === 'CONFLICT') return this.openDialog('conflict', P.conflict.title, P.conflict.descPrefix + C.serviceHotline + P.conflict.descSuffix, P.conflict.service, P.conflict.retry);
      this.setData({ chError: (err && err.message) || TA.common.saveFailed, chHint: '' });
    });
  },
  startTimer(sec) {
    this.stopTimer();
    const tick = (n) => this.setData({ chCountdown: n, chSendText: n > 0 ? n + P.change.resendSuffix : P.change.send });
    tick(Number(sec) > 0 ? Number(sec) : 60);
    this._t = setInterval(() => { const n = Math.max(0, this.data.chCountdown - 1); tick(n); if (n <= 0) this.stopTimer(); }, 1000);
  },
  stopTimer() { if (this._t) { clearInterval(this._t); this._t = null; } },
  // ---- 隐私授权管理 ----
  onPrivacy() {
    if (!this.data.loggedIn) return;
    const S = P.privacySheet, set = (ok) => this.setData({ locationText: ok ? S.granted : S.notGranted });
    this.setData({ privacyVisible: true });
    wx.getSetting({ success: (r) => set(!!(r.authSetting && r.authSetting['scope.userLocation'])), fail: () => set(state.get().location.status === 'granted') });
  },
  onPrivacyClose() { this.setData({ privacyVisible: false }); },
  onToSetting() {
    const S = P.privacySheet;
    wx.openSetting({ success: (r) => this.setData({ locationText: r.authSetting && r.authSetting['scope.userLocation'] ? S.granted : S.notGranted }), fail: () => toast(S.settingFailed) });
  },
  onPrivacyContract() {
    const S = P.privacySheet;
    if (!wx.openPrivacyContract) return toast(S.contractFailed);
    wx.openPrivacyContract({ fail: () => toast(S.contractFailed) });
  },
  onWithdraw() { this.openDialog('withdraw', P.withdrawDialog.title, P.withdrawDialog.desc, TA.common.cancel, P.withdrawDialog.confirm); },
  // ---- 注销账号 ----
  onDelete() { if (this.data.loggedIn) this.setData({ deleteVisible: true }); },
  onDeleteClose() { this.setData({ deleteVisible: false }); },
  onDeleteConfirm() {
    if (this.data.deleteBusy) return;
    this.setData({ deleteBusy: true });
    api.requestAccountDeletion().then(() => { this.setData({ deleteBusy: false, deleteVisible: false }); toast(P.deleteSheet.done); })
      .catch((err) => {
        this.setData({ deleteBusy: false, deleteVisible: false });
        const b = err && err.blockers;
        if (!b) return toast((err && err.message) || TA.common.saveFailed);
        this.openDialog('blocked', P.deleteBlocked.title, b.active > 0 ? P.deleteBlocked.activePrefix + b.active + P.deleteBlocked.activeSuffix : P.deleteBlocked.other, TA.common.gotIt, TA.common.viewOrders);
      });
  },
  // ---- 退出登录 ----
  onLogout() { this.openDialog('logout', P.logoutDialog.title, P.logoutDialog.desc, TA.common.cancel, P.logoutDialog.confirm); },
  leave() { this.stopTimer(); this.setData({ privacyVisible: false, deleteVisible: false, changeVisible: false, contactVisible: false }); wx.switchTab({ url: routes.MINE }); },
  // ---- 确认框 ----
  openDialog(kind, title, desc, cancelText, confirmText) { this.setData({ dialog: { visible: true, kind: String(kind || ''), title: String(title || ''), desc: String(desc || ''), cancelText: String(cancelText || ''), confirmText: String(confirmText || '') } }); },
  onDialogCancel() {
    const kind = this.data.dialog.kind;
    this.setData({ dialog: NO_DIALOG });
    if (kind === 'conflict') wx.makePhoneCall({ phoneNumber: C.serviceHotline.replace(/-/g, ''), fail: (e) => { if (!/cancel/i.test(String(e && e.errMsg))) toast(TA.common.callFailed + C.serviceHotline); } });
  },
  onDialogConfirm() {
    const kind = this.data.dialog.kind;
    this.setData({ dialog: NO_DIALOG });
    if (kind === 'logout') { state.logout(); this.leave(); }
    else if (kind === 'withdraw') {
      const done = () => { state.logout(); state.patch('flags', { locationAsked: false }); this.leave(); };
      api.withdrawPrivacy().then(done).catch(done); // 后端记录失败也不拦用户：本机照常退出
    }
    else if (kind === 'blocked') wx.switchTab({ url: routes.ORDERS });
    else if (kind === 'conflict') this.setData({ chPhone: '', chCode: '', chReady: false, chError: '', chHint: '' }); // 换个手机号：留在弹层里重填
  },
  onLogin() { auth.openLogin(this); },
  onLoginClose() { this.setData({ loginVisible: false }); },
  onLoginSuccess() {
    const pending = this._pendingContact; this._pendingContact = '';
    const p = this.refresh();
    if (pending) p.then(() => { this.setData({ contactValue: pending }); this.onSaveContact(); });
  }
}));
