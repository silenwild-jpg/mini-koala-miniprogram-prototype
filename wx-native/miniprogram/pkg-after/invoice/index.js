// 发票 IV01（第 3 批）。进入参数 ?id=<订单号>；没带时取第一笔已付款订单。
// 已做：空态、填写（个人 / 企业、已填、邮箱校验、提交中）、两笔付款（下单支付 + 续租费用，选择付款记录弹层）、付款记录按租金 / 押金 / 管理费拆分、
//   已提交、开具中、已开具（发票文件卡、发送到邮箱、下载发票）、开票未成功（保留原记录，更正后重新提交）；企业可进「管理开票抬头」「批量开票」；三态。
// 未做：发票是否含押金、处理时限业务未给口径，界面写「请咨询客服」/ 不显示（交接 §9）；演示环境没有发票文件，「下载发票」会提示暂时无法下载；
//   从开票抬头页带回已保存的抬头（开票抬头页属第 4 批，接口未约定）。
const T = require('../../i18n/after');
const zh = require('../../i18n/zh');
const api = require('../../services/api');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const A = require('../../core/config-after');
const after = require('../../core/after');
const pricing = require('../../core/pricing');
const cm = require('../common');
const I = T.invoice, CT = T.common, fill = after.fill, yuan = pricing.yuan;
const TONE = { submitted: 'warn', processing: 'warn', issued: 'ok', failed: 'err' };
const btn = (text, act, kind, more) => Object.assign({ text, act, kind: kind || 'primary' }, more);
const payLabel = (p) => I.payType[p.type] + ' · ' + yuan(p.amount);

function barOf(page, v) {
  if (v.state === 'form' || v.state === 'issue_failed') {
    if (!v.available.length && !v.failed) return null;
    if (page._busy) return { btns: [btn(CT.submitting, '', 'primary', { loading: true, off: true })] };
    const ready = after.validateInvoice(page._form).ready;
    return { btns: [btn(v.failed ? I.retry : I.submit, 'submit', 'primary', { off: !ready })] };
  }
  if (v.state === 'issued') return { btns: [btn(I.send, 'send', 'ghost'), btn(I.download, 'download')] };
  return { btns: [btn(CT.backOrder, 'back', 'neutral')] };
}
function render(page, o) {
  cm.cancelLater(page);
  const v = o ? after.invoiceView(o) : { state: 'empty' };
  page._view = v;
  if (v.state === 'empty') { page.setData({ empty: true, order: null, bar: null, st: 'empty', sheet: false }); return; }
  const now = Date.now(), last = v.last, failed = v.failed, formState = v.state === 'form' || !!failed, f = page._form;
  if (failed && page._prefilled !== failed.id) { page._prefilled = failed.id; Object.assign(f, { kind: failed.kind, title: failed.title, tax_id: failed.tax_id || '', email: failed.email }); page._touched = true; }
  if (!v.available.some((p) => p.id === page._pay)) page._pay = v.available.length ? v.available[0].id : '';
  const multi = v.available.length > 1, ent = f.kind === 'enterprise', check = after.validateInvoice(f);
  const d = {
    empty: false, st: v.state, order: o, fail: !!failed, reason: failed ? failed.fail_reason || '' : '', file: [], sheet: false,
    head: { title: failed ? I.head.issue_failed : formState ? I.head.form : I.head[last.status], tag: page._busy ? CT.submittingTag : last ? I.tag[last.status] : I.tag.none, tone: page._busy ? 'warn' : last ? TONE[last.status] : 'ok', subs: [fill(CT.orderNo, { no: o.no }), o.store.name] },
    records: v.records.map((r) => ({ id: r.id, t: I.payType[r.payment_type] + ' · ' + yuan(r.amount), s: I.kind[r.kind] + ' · ' + r.title + (r.tax_id ? ' · ' + r.tax_id : ''), email: r.email, tag: I.tag[r.status], tone: TONE[r.status] })),
    showPays: formState && (v.available.length > 0 || !failed),
    pays: formState ? v.available.map((p) => ({ id: p.id, label: I.payType[p.type], amt: yuan(p.amount), multi, on: p.id === page._pay, split: p.split.map((s) => ({ k: I.split[s[0]], a: yuan(s[1]) })) })) : [],
    notes: [{ k: I.amount, v: I.amountText, soft: true }, { k: I.includeDeposit, v: zh.common.contactService, soft: true }, { k: I.content, v: I.contentText, long: true }, { k: I.deadline, v: I.deadlineText, long: true }],
    form: formState && (v.available.length > 0 || failed) ? {
      kind: f.kind, ent, kinds: [{ v: 'personal', t: I.kind.personal, on: !ent }, { v: 'enterprise', t: I.kind.enterprise, on: ent }],
      title: f.title, tax: f.tax_id, email: f.email, titlePh: I.titlePh[f.kind], emailErr: page._touched && check.emailError
    } : null,
    opts: v.available.map((p) => ({ id: p.id, label: payLabel(p), on: p.id === page._pay })),
    bar: barOf(page, v)
  };
  if (v.state === 'issued') d.file = [{ k: I.form, v: I.formText }, { k: I.toEmail, v: last.email }];
  if (last && (last.status === 'submitted' || last.status === 'processing')) cm.later(page, (last.status === 'submitted' ? A.demo.invoiceProcessMs : A.demo.invoiceIssueMs) - (now - last.submitted_at));
  page.setData(d);
}
function done(page, o) { page._busy = false; page._order = o; render(page, o); return o; }
function failed(page, err) { page._busy = false; cm.opFail(err); return page.refresh(); }

Page(auth.guarded(routes.INVOICE, {
  data: { T: { c: CT, i: I, z: zh.common }, sys: 'loading', empty: false, st: '', head: null, order: null, fail: false, reason: '', records: [], showPays: false, pays: [], notes: [], form: null, file: [], bar: null, sheet: false, opts: [] },
  onLoad(q) { this._id = (q && q.id) || ''; this._form = { kind: 'personal', title: '', tax_id: '', email: '' }; this._pay = ''; this._busy = false; this._touched = false; this._prefilled = ''; },
  onShow() { this.refresh(); },
  onHide() { cm.cancelLater(this); },
  onUnload() { cm.cancelLater(this); },
  onPullDownRefresh() { this.refresh().then(() => wx.stopPullDownRefresh()); },
  refresh() { return cm.load(this, 'invoice', (o) => render(this, o)); },
  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },
  onBar(e) {
    const a = e && e.currentTarget && e.currentTarget.dataset.act;
    if (a === 'submit') this.onSubmit(); else if (a === 'send') this.onSend(); else if (a === 'download') this.onDownload(); else if (a === 'back') this.onBack();
  },
  onKind(e) { // 个人 / 企业
    if (!this.data.form || this._busy) return;
    this._form.kind = e.currentTarget.dataset.v === 'enterprise' ? 'enterprise' : 'personal';
    render(this, this._order);
  },
  // 输入时只更新按钮可用状态，不回写输入框的值（避免打字时光标跳动）
  onInput(e) {
    const k = { title: 'title', tax: 'tax_id', email: 'email' }[e.currentTarget.dataset.f];
    if (!k || !this._view || this._busy) return;
    this._form[k] = String((e.detail && e.detail.value) || '');
    this.setData({ bar: barOf(this, this._view) });
  },
  onEmailBlur() { if (!this.data.form) return; this._touched = true; this.setData({ 'form.emailErr': after.validateInvoice(this._form).emailError }); },
  onPickPay() { if (this.data.opts.length > 1 && !this._busy) { this._pick = this._pay; this.setData({ sheet: true }); } }, // 多笔付款时选择付款记录
  onOpt(e) { const id = e.currentTarget.dataset.id; this._pick = id; this.setData({ opts: this.data.opts.map((x) => Object.assign({}, x, { on: x.id === id })) }); },
  onSheetClose() { this.setData({ sheet: false }); if (this._order) render(this, this._order); },
  onSheetOk() { if (this._pick) this._pay = this._pick; this.setData({ sheet: false }); if (this._order) render(this, this._order); },
  onSubmit() { // 提交发票申请 / 更正资料后重新提交
    const o = this._order, v = this._view, f = this._form;
    if (!o || !v || this._busy || (v.state !== 'form' && v.state !== 'issue_failed')) return;
    this._touched = true;
    if (!after.validateInvoice(f).ready) { render(this, o); return; }
    this._busy = true; render(this, o);
    return api.submitInvoice({ id: o.id, payment_id: this._pay, kind: f.kind, title: f.title, tax_id: f.tax_id, email: f.email })
      .then((x) => { this._form = { kind: f.kind, title: '', tax_id: '', email: '' }; this._touched = false; done(this, x); }, (err) => failed(this, err));
  },
  onSend() { // 发送到邮箱
    const o = this._order, last = this._view && this._view.last;
    if (!o || !last || last.status !== 'issued') return;
    return api.sendInvoiceEmail({ id: o.id, record_id: last.id }).then((r) => cm.toast(fill(I.sent, { e: r.email })), () => cm.toast(I.sendFail));
  },
  onDownload() { // 下载发票：取文件地址 → 下载 → 打开；任何一步失败都提示
    const o = this._order, last = this._view && this._view.last;
    if (!o || !last || last.status !== 'issued') return;
    const no = () => cm.toast(I.downloadFail);
    return api.getInvoiceFile({ id: o.id, record_id: last.id }).then((r) => {
      if (!r || !r.url) return no();
      wx.downloadFile({ url: r.url, success: (res) => (res.statusCode === 200 ? wx.openDocument({ filePath: res.tempFilePath, showMenu: true, fail: no }) : no()), fail: no });
    }, no);
  },
  onTitles() { wx.navigateTo({ url: routes.ENT_TITLES }); },
  onBatch() { wx.navigateTo({ url: routes.ENT_BATCH }); },
  onBack() { cm.backToOrder(this); },
  onOrders() { cm.toOrders(); },
  onCall() { cm.callStore(this._order); }
}));
