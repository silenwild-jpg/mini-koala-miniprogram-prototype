// 批量开票 ENT_BATCH（第 4 批）。同一个页面两步：不带参数是选择订单；?ids=订单号,订单号 是确认开票信息（系统返回键回到选择）。
// 已做：未完成企业认证的拦截（去企业认证）；暂无可开票订单；选择（单选 / 全选 / 合计）；确认（抬头、纳税人识别号、接收邮箱、逐笔租金与管理费）；提交中；
//       已提交（处理中）、已开具（下载发票、重新发送到邮箱）、未成功（原因、修改后重新提交、联系顾问）；加载 / 失败 / 断网；未登录先登录（自定）。
// 口径：可开票订单来自 api.getOrders()，只列已付款且未开票的；金额只读 order.quote（减后整期租金 + 管理费），不重算；押金不列，页面写「押金开票事宜请咨询客服」；处理时限写「请咨询客服」。
// 未做：开票结果的订阅消息（冻结稿没有画，§9）；历史批量开票记录列表（冻结稿没有画）——最近一笔申请在看到「已开具」之前会一直显示在本页。
const TA = require('../../i18n/account');
const rules = require('../../core/account');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const api = require('../../services/api');
const pd = require('../../services/page-data');
const P = TA.ent.batch;
const TONE = { submitted: 'warn', issued: 'ok', failed: 'err' };
const toast = (title) => wx.showToast({ title, icon: 'none' });
function stepsOf(status) { // 已提交：第 2 步进行中；已开具：全部完成；未成功：第 2 步失败
  const cur = status === 'issued' ? 4 : 2, failAt = status === 'failed' ? 2 : 0;
  return P.steps.map((s, i) => { const n = i + 1; const cls = failAt === n ? 'fail' : n < cur ? 'done' : n === cur ? 'cur' : ''; return { t: s.t, s: s.s, cls, tcls: cls === 'fail' ? 'ac-step-t--fail' : cls ? '' : 'ac-step-t--mute' }; });
}
Page(auth.guarded(routes.ENT_BATCH, {
  data: {
    T: { b: P, common: TA.common }, sys: 'loading', loggedIn: false, view: 'select', // gate | empty | select | confirm | result
    rows: [], allOn: false, allText: '', selText: '', sumText: rules.money(0), hasSel: false,
    title: null, lines: [], contentTitle: '', busy: false, submitText: P.submit,
    result: null, loginVisible: false
  },
  onLoad(q) {
    const ids = String((q && q.ids) || '').split(',').filter((x) => /^MK\d+$/.test(x));
    this._confirmIds = ids; this._sel = {}; this._titles = []; this._titleId = '';
  },
  onShow() { this.refresh(); },
  onUnload() { if (this._ackId && auth.isLoggedIn()) api.ackBatchInvoice({ id: this._ackId }).catch(() => {}); }, // 已开具的结果看过一次后，下次进来回到选择订单
  refresh() {
    const logged = auth.isLoggedIn();
    this.setData({ loggedIn: logged });
    if (!logged) { this.setData({ sys: '' }); return Promise.resolve(); }
    return pd.load(this, Promise.all([api.getEntCert(), api.getOrders(), api.getInvoiceTitles(), api.getBatchInvoice()]), (res) => this.apply(res[0], res[1], res[2], res[3]));
  },
  apply(cert, orders, titles, batch) {
    if (!cert || cert.status !== 'verified') return this.setData({ view: 'gate' });
    this._titles = Array.isArray(titles) ? titles : [];
    if (batch && batch.id && P.head[batch.status]) return this.showResult(batch);
    const all = rules.invoiceable(Array.isArray(orders) ? orders : []).map(rules.invoiceLine);
    this._lines = all;
    const picked = (this._confirmIds || []).length ? all.filter((l) => this._confirmIds.indexOf(l.id) >= 0) : [];
    if (picked.length) return this.showConfirm(picked);
    if (!all.length) return this.setData({ view: 'empty' });
    this.setData({ view: 'select' }); this.renderRows();
  },
  // ---- 选择订单 ----
  renderRows() {
    const all = this._lines || [], sel = this._sel || {};
    const on = all.filter((l) => sel[l.id]);
    this.setData({
      rows: all.map((l) => ({ id: l.id, store: l.store, line1: l.unit + ' · ' + l.months + P.monthUnit, line2: l.no + P.paidPrefix + l.paidDate, amount: rules.money(l.amount), on: !!sel[l.id] })),
      allOn: all.length > 0 && on.length === all.length, allText: P.allPrefix + all.length + P.allSuffix,
      selText: P.selectedPrefix + on.length + P.selectedSuffix, sumText: rules.money(rules.sumAmount(on)), hasSel: on.length > 0
    });
  },
  onToggle(e) { const id = e.currentTarget.dataset.id; if (!id) return; this._sel = this._sel || {}; this._sel[id] = !this._sel[id]; this.renderRows(); },
  onToggleAll() {
    const all = this._lines || [], next = !this.data.allOn;
    this._sel = {}; all.forEach((l) => { this._sel[l.id] = next; });
    this.renderRows();
  },
  onNext() {
    const ids = (this._lines || []).filter((l) => (this._sel || {})[l.id]).map((l) => l.id);
    if (!ids.length) return;
    wx.navigateTo({ url: routes.ENT_BATCH + '?ids=' + ids.join(',') });
  },
  // ---- 确认开票信息 ----
  showConfirm(picked) {
    if (!Array.isArray(picked)) return;
    const ts = this._titles || [];
    const t = ts.find((x) => x.id === this._titleId) || ts.find((x) => x.isDefault) || ts[0] || null;
    this._titleId = t ? t.id : ''; this._picked = picked;
    this.setData({
      view: 'confirm', title: t ? { name: t.displayName || t.name, tax: t.tax || '', email: t.displayEmail || t.email || '' } : null,
      lines: picked.map((l) => ({ id: l.id, store: l.store, line1: l.unit + ' · ' + l.months + P.monthUnit + ' · ' + l.no, line2: P.rent + rules.money(l.rent) + P.fee + rules.money(l.fee), amount: rules.money(l.amount) })),
      contentTitle: P.contentPrefix + picked.length + P.contentSuffix, sumText: rules.money(rules.sumAmount(picked))
    });
  },
  onChangeTitle() {
    const ts = this._titles || [];
    if (ts.length < 2) return wx.navigateTo({ url: ts.length ? routes.ENT_TITLES : routes.ENT_TITLES + '?mode=add' }); // 只有一个或没有：去抬头管理
    wx.showActionSheet({
      itemList: ts.slice(0, 6).map((t) => t.displayName || t.name),
      success: (r) => { const t = ts[r.tapIndex]; if (t) { this._titleId = t.id; this.showConfirm(this._picked || []); } },
      fail: () => {} // 用户取消：保持原抬头
    });
  },
  onSubmit() {
    if (this.data.busy || this.data.view !== 'confirm') return;
    if (!this._titleId) return this.onChangeTitle();
    this.setData({ busy: true, submitText: TA.common.submitting });
    api.submitBatchInvoice({ order_ids: (this._picked || []).map((l) => l.id), title_id: this._titleId })
      .then((b) => { this._confirmIds = []; this.setData({ busy: false, submitText: P.submit }); this.showResult(b); })
      .catch((err) => { this.setData({ busy: false, submitText: P.submit }); toast((err && err.message) || TA.common.saveFailed); if (err && err.code === 'CONFLICT') { this._confirmIds = []; this.refresh(); } });
  },
  // ---- 结果 ----
  showResult(b) {
    const h = b ? P.head[b.status] : null;
    if (!h) return;
    this._batch = b; this._ackId = b.status === 'issued' ? b.id : '';
    this.setData({
      view: 'result',
      result: {
        status: b.status, title: h.title, tag: h.tag, tone: TONE[b.status], sub: h.subPrefix ? h.subPrefix + b.email : '', steps: stepsOf(b.status),
        reason: P.reasonPrefix + (b.reason || P.reasonEmpty), titleName: b.title_name, count: (b.order_ids || []).length + P.ordersSuffix, amount: rules.money(b.amount),
        lines: (b.lines || []).map((l) => ({ no: l.no, amount: rules.money(l.amount) }))
      }
    });
  },
  onResubmit() { const b = this._batch; if (b && b.order_ids) wx.redirectTo({ url: routes.ENT_BATCH + '?ids=' + b.order_ids.join(',') }); },
  onDownload() {
    const b = this._batch;
    if (!b) return;
    const failed = () => toast(P.downloadFailed);
    api.getBatchInvoiceFile({ id: b.id }).then((f) => {
      if (!f || !f.url) return failed();
      wx.downloadFile({ url: f.url, success: (r) => { if (r.statusCode === 200) wx.openDocument({ filePath: r.tempFilePath, fail: failed }); else failed(); }, fail: failed });
    }).catch(failed);
  },
  onResend() {
    const b = this._batch;
    if (!b) return;
    api.resendBatchInvoice({ id: b.id }).then((r) => toast(P.resent + r.email)).catch((err) => toast((err && err.message) || TA.common.saveFailed));
  },
  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },
  onCert() { wx.navigateTo({ url: routes.ENT_CERT }); },
  onOrders() { wx.switchTab({ url: routes.ORDERS }); },
  onAdvisor() { wx.navigateTo({ url: routes.SUPPORT }); },
  onLogin() { auth.openLogin(this); },
  onLoginClose() { this.setData({ loginVisible: false }); },
  onLoginSuccess() { this.refresh(); }
}));
