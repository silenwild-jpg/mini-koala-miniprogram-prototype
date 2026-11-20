// 企业认证 ENT_CERT（第 4 批）。企业资料是用户自己填的；演示环境里的「安贞商贸有限公司」等只出现在抬头的合成演示数据里。
// 已做：未填 / 已填 / 校验未过（18 位统一社会信用代码）/ 提交中；提交后的审核中、已认证（带开票抬头管理、批量开票入口）、未通过（原因 + 更正后重新提交 + 联系顾问）；
//       底栏「还需填写：…」；审核时限写「请咨询客服」（§9）。未登录时先登录（冻结稿没有画未登录，自定）。
// 未做：营业执照只在本机选图并记张数，文件上传接口在第 5 批接；审核结果的订阅消息（冻结稿没有画，§9）；
//       未通过后重新提交要重填联系人手机号（接口只返回掩码号码），营业执照也要重新上传（FIX-01 D-06）。
// FIX-01 D-07：审核结果写站内消息（演示接口）；本页可下拉刷新。
const TA = require('../../i18n/account');
const C = require('../../core/config-account');
const rules = require('../../core/account');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const api = require('../../services/api');
const pd = require('../../services/page-data');
const P = TA.ent.cert;
const EMPTY = { name: '', tax: '', licenseCount: 0, contact: '', phone: '' };
const TONE = { reviewing: 'warn', verified: 'ok', failed: 'err' };
function stepsOf(status) { // 审核中：第 2 步进行中；已认证：全部完成；未通过：第 2 步失败
  const cur = status === 'verified' ? 4 : 2, failAt = status === 'failed' ? 2 : 0;
  return P.steps.map((s, i) => { const n = i + 1; const cls = failAt === n ? 'fail' : n < cur ? 'done' : n === cur ? 'cur' : ''; return { t: s.t, s: s.s, cls, tcls: cls === 'fail' ? 'ac-step-t--fail' : cls ? '' : 'ac-step-t--mute' }; });
}
Page(auth.guarded(routes.ENT_CERT, {
  data: { T: { c: P, common: TA.common }, sys: 'loading', loggedIn: false, view: 'form', form: EMPTY, taxError: '', uploadText: P.upload, need: '', ready: false, busy: false, submitText: P.submit, status: '', head: null, tone: '', steps: [], reason: '', company: null, contactLine: '', loginVisible: false },
  onShow() { this.refresh(); },
  onPullDownRefresh() { Promise.resolve(this.refresh()).then(() => wx.stopPullDownRefresh()); },
  refresh() {
    const logged = auth.isLoggedIn();
    this.setData({ loggedIn: logged });
    if (!logged) { this.setData({ sys: '' }); return Promise.resolve(); }
    return pd.load(this, api.getEntCert(), (r) => this.apply(r));
  },
  apply(r) {
    r = r || {};
    if (!r.status || r.status === 'none' || !P.head[r.status]) { this.setData({ view: 'form', status: '' }); return this.setForm({}); }
    const c = r.company || {};
    this._company = c;
    if (this._fixing && r.status === 'failed') return; // 正在更正资料（选图会触发 onShow）：留在表单
    this.setData({ view: 'result', status: r.status, head: P.head[r.status], tone: TONE[r.status], steps: stepsOf(r.status), reason: P.reasonPrefix + (r.reason || P.reasonEmpty), company: c, contactLine: (c.contact || '') + ' ' + (c.phoneMasked || '') });
  },
  setForm(patch) {
    const f = Object.assign({}, this.data.form, patch && typeof patch === 'object' && !patch.currentTarget ? patch : {});
    const miss = rules.certMissing(f);
    this.setData({
      form: f, ready: !miss.length, need: miss.length ? P.needPrefix + miss.map((k) => P.needNames[k]).join(P.needJoin) : '',
      uploadText: f.licenseCount > 0 ? P.uploadedPrefix + f.licenseCount + P.uploadedSuffix : P.upload
    });
  },
  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },
  onField(e) {
    const k = e.currentTarget.dataset.f;
    if (!k || !(k in EMPTY)) return;
    const patch = {}; patch[k] = e.detail.value;
    if (k === 'tax') this.setData({ taxError: '' });
    this.setForm(patch);
  },
  onTaxBlur() { const t = this.data.form.tax; this.setData({ taxError: t && !rules.validCreditCode(t) ? P.taxError : '' }); },
  onUpload() {
    wx.chooseMedia({
      count: C.licenseMaxCount, mediaType: ['image'], sourceType: ['album', 'camera'],
      success: (r) => { const n = (r.tempFiles || []).length; if (n) { this._license = r.tempFiles[0].tempFilePath; this.setForm({ licenseCount: n }); } },
      fail: (e) => { if (!/cancel/i.test(String(e && e.errMsg))) wx.showToast({ title: P.uploadFailed, icon: 'none' }); }
    });
  },
  onSubmit() {
    if (!this.data.ready || this.data.busy) return;
    this.setData({ busy: true, submitText: TA.common.submitting });
    api.submitEntCert(this.data.form).then((r) => { this._fixing = false; this.setData({ busy: false, submitText: P.submit }); this.apply(r); })
      .catch((err) => {
        this.setData({ busy: false, submitText: P.submit, taxError: err && err.fields && err.fields.indexOf('tax') >= 0 ? P.taxError : '' });
        if (!(err && err.fields)) wx.showToast({ title: (err && err.message) || TA.common.saveFailed, icon: 'none' });
      });
  },
  // 未通过：带着原资料回到表单（手机号接口只给掩码，要重填；营业执照清空，要重新上传）
  onFix() { const c = this._company || {}; this._fixing = true; this.setData({ view: 'form', form: EMPTY, taxError: '' }); this.setForm({ name: c.name || '', tax: c.tax || '', contact: c.contact || '', licenseCount: 0, phone: '' }); },
  onAdvisor() { wx.navigateTo({ url: routes.SUPPORT }); },
  onTitles() { wx.navigateTo({ url: routes.ENT_TITLES }); },
  onBatch() { wx.navigateTo({ url: routes.ENT_BATCH }); },
  onLogin() { auth.openLogin(this); },
  onLoginClose() { this.setData({ loginVisible: false }); },
  onLoginSuccess() { this.refresh(); }
}));
