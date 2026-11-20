// 开票抬头管理 ENT_TITLES（第 4 批）。同一个页面两种打开方式：不带参数是列表；?mode=add 新增、?id=抬头编号 编辑（系统返回键回到列表）。
// 已做：空态、列表（默认标签、设为默认）、新增、编辑、校验未过（纳税人识别号、邮箱）、删除确认；个人抬头不填税号与专票信息；加载 / 失败 / 断网；未登录先登录（自定）。
// 演示数据：列表里预置的「安贞商贸有限公司」「王**」是冻结稿的合成演示抬头，可编辑、可删除。
// 未做：从微信发票助手导入抬头（wx.chooseInvoiceTitle，冻结稿没有画）。
const TA = require('../../i18n/account');
const rules = require('../../core/account');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const api = require('../../services/api');
const pd = require('../../services/page-data');
const P = TA.ent.titles;
const EMPTY = { id: '', type: 'company', name: '', tax: '', email: '', bank: '', account: '', addr: '', isDefault: false };
const NO_DIALOG = { visible: false, id: '' };
Page(auth.guarded(routes.ENT_TITLES, {
  data: { T: { t: P, common: TA.common }, sys: 'loading', loggedIn: false, mode: 'list', rows: [], form: EMPTY, isEdit: false, taxError: '', emailError: '', ready: false, busy: false, dialog: NO_DIALOG, loginVisible: false },
  onLoad(q) {
    q = q || {};
    this._editId = q.mode === 'add' ? '' : (q.id && /^T\d+$/.test(String(q.id)) ? String(q.id) : '');
    this._form = q.mode === 'add' || !!this._editId;
    this.setData({ mode: this._form ? 'form' : 'list', isEdit: !!this._editId });
  },
  onShow() { this.refresh(); },
  refresh() {
    const logged = auth.isLoggedIn();
    this.setData({ loggedIn: logged });
    if (!logged) { this.setData({ sys: '' }); return Promise.resolve(); }
    return pd.load(this, api.getInvoiceTitles(), (list) => this.apply(list));
  },
  apply(list) {
    list = Array.isArray(list) ? list : [];
    this.setData({ rows: list.map((t) => ({ id: t.id, name: t.displayName || t.name, isDefault: !!t.isDefault, line: (t.type === 'person' ? P.typePerson : P.typeCompany) + (t.tax ? P.taxPrefix + t.tax : ''), email: P.emailPrefix + (t.displayEmail || t.email || '') })) });
    if (this._form && !this._loaded) { // 表单只在第一次取数时填入，之后保留用户正在改的内容
      this._loaded = true;
      const t = list.find((x) => x.id === this._editId);
      this.setForm(t ? { id: t.id, type: t.type, name: t.name, tax: t.tax, email: t.email, bank: t.bank, account: t.account, addr: t.addr, isDefault: !!t.isDefault } : { isDefault: !list.length });
    }
  },
  setForm(patch) {
    const f = Object.assign({}, this.data.form, patch && typeof patch === 'object' && !patch.currentTarget ? patch : {});
    this.setData({ form: f, ready: !Object.keys(rules.titleErrors(f)).length });
  },
  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },
  // ---- 列表 ----
  onAdd() { wx.navigateTo({ url: routes.ENT_TITLES + '?mode=add' }); },
  onEdit(e) { wx.navigateTo({ url: routes.ENT_TITLES + '?id=' + e.currentTarget.dataset.id }); },
  onSetDefault(e) {
    api.setDefaultInvoiceTitle({ id: e.currentTarget.dataset.id }).then((list) => this.apply(list)).catch((err) => wx.showToast({ title: (err && err.message) || TA.common.saveFailed, icon: 'none' }));
  },
  // ---- 表单 ----
  onType(e) { const v = e.currentTarget.dataset.v; if (v === 'company' || v === 'person') { this.setData({ taxError: '' }); this.setForm({ type: v }); } },
  onField(e) {
    const k = e.currentTarget.dataset.f;
    if (!k || !(k in EMPTY) || k === 'id' || k === 'type' || k === 'isDefault') return;
    const patch = {}; patch[k] = e.detail.value;
    if (k === 'tax') this.setData({ taxError: '' });
    if (k === 'email') this.setData({ emailError: '' });
    this.setForm(patch);
  },
  onTaxBlur() { const f = this.data.form; this.setData({ taxError: f.type !== 'person' && f.tax && !rules.validTaxId(f.tax) ? P.taxError : '' }); },
  onEmailBlur() { const f = this.data.form; this.setData({ emailError: f.email && !rules.validEmail(f.email) ? P.emailError : '' }); },
  onDefault(e) { this.setForm({ isDefault: !!(e.detail && e.detail.value === true) }); },
  onSave() {
    if (!this.data.ready || this.data.busy) return;
    this.setData({ busy: true });
    api.saveInvoiceTitle(this.data.form).then(() => { this.setData({ busy: false }); wx.navigateBack({ delta: 1 }); })
      .catch((err) => {
        const fields = (err && err.fields) || [];
        this.setData({ busy: false, taxError: fields.indexOf('tax') >= 0 ? P.taxError : '', emailError: fields.indexOf('email') >= 0 ? P.emailError : '' });
        if (!fields.length) wx.showToast({ title: (err && err.message) || TA.common.saveFailed, icon: 'none' });
      });
  },
  onRemove() { if (this.data.form.id) this.setData({ dialog: { visible: true, id: this.data.form.id } }); },
  onDialogCancel() { this.setData({ dialog: NO_DIALOG }); },
  onDialogConfirm() {
    const id = this.data.dialog.id;
    this.setData({ dialog: NO_DIALOG });
    if (!id) return;
    api.deleteInvoiceTitle({ id }).then(() => wx.navigateBack({ delta: 1 })).catch((err) => wx.showToast({ title: (err && err.message) || TA.common.saveFailed, icon: 'none' }));
  },
  onLogin() { auth.openLogin(this); },
  onLoginClose() { this.setData({ loginVisible: false }); },
  onLoginSuccess() { this.refresh(); }
}));
