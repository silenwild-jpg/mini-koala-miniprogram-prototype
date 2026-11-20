// 实名认证 ACC_IDENTITY（第 3 批）：下单时未实名的订单在付款后补认证的兜底页（D-174）。进入参数 ?id=<订单号>；没带时取还没实名的一笔。
// 已做：无法打开（没有已付款订单）、待认证、提交身份资料弹层（含校验错误）、认证中、认证通过（→ 入仓指引）、未通过（重新提交资料）；
//   统一说明句「这笔订单下单时未完成实名认证，完成后起租日起可入仓存取。」；三态。
// 未做：冻结稿的「审核认证结果」入口与「认证结果审核」对话框（result、reviewing__review 两态）是评审用的演示开关，不实现；
//   只支持身份证（非身份证证件等电子签工具接入，D-176）。认证结果由接口返回，演示环境提交后几秒自动通过。
const T = require('../../i18n/after');
const api = require('../../services/api');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const A = require('../../core/config-after');
const after = require('../../core/after');
const cm = require('../common');
const I = T.identity, CT = T.common;
const TONE = { none: 'warn', pending: 'warn', verified: 'ok', mismatch: 'err' };

function render(page, o, now) {
  cm.cancelLater(page);
  const st = o ? after.identityState(o) : 'not_paid';
  page._st = st;
  if (st === 'not_paid') { page.setData({ empty: true, order: null, bar: null, st, sheet: false }); return; }
  const cur = st === 'none' ? 1 : st === 'pending' ? 2 : st === 'mismatch' ? 2 : 4;
  page.setData({
    empty: false, st, order: o, tag: I.tag[st], tone: TONE[st], note: st === 'verified' ? '' : I.note,
    steps: cm.steps(I.steps, [st === 'none' ? I.sub.none : '', st === 'pending' ? I.sub.pending : st === 'mismatch' ? I.sub.mismatch : '', st === 'verified' ? I.sub.verified : ''], cur, st === 'mismatch' ? 2 : 0),
    bar: st === 'none' ? { btns: [{ text: I.start, act: 'open' }] } : st === 'mismatch' ? { btns: [{ text: I.retry, act: 'open' }] } : st === 'verified' ? { btns: [{ text: I.viewAccess, act: 'access' }] } : null
  });
  if (st === 'pending' && o.identity_submitted_at) cm.later(page, A.demo.identityMs - (now - o.identity_submitted_at));
}

Page(auth.guarded(routes.IDENTITY, {
  data: { T: { c: CT, i: I }, sys: 'loading', empty: false, st: '', order: null, tag: '', tone: 'warn', note: '', steps: [], bar: null, sheet: false, name: '', idNo: '', nameErr: false, idErr: false, busy: false },
  onLoad(q) { this._id = (q && q.id) || ''; this._f = { name: '', id_no: '' }; },
  onShow() { this.refresh(); },
  onHide() { cm.cancelLater(this); },
  onUnload() { cm.cancelLater(this); },
  onPullDownRefresh() { this.refresh().then(() => wx.stopPullDownRefresh()); },
  refresh() { return cm.load(this, 'identity', (o, now) => render(this, o, now)); },
  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },
  onBar(e) { const a = e && e.currentTarget && e.currentTarget.dataset.act; if (a === 'open') this.onOpen(); else if (a === 'access') this.onAccess(); },
  onOpen() { if (this._st === 'none' || this._st === 'mismatch') this.setData({ sheet: true, nameErr: false, idErr: false }); }, // 开始认证 / 重新提交资料
  onSheetClose() { this.setData({ sheet: false }); },
  onName(e) { this._f.name = String((e.detail && e.detail.value) || ''); if (this.data.nameErr) this.setData({ nameErr: false }); },
  onIdNo(e) { this._f.id_no = String((e.detail && e.detail.value) || ''); if (this.data.idErr) this.setData({ idErr: false }); },
  onSubmit() { // 提交认证
    const o = this._order; if (!o || this.data.busy || !this.data.sheet) return;
    const v = after.validateIdentity(this._f);
    if (v.nameError || v.idError) { this.setData({ nameErr: v.nameError, idErr: v.idError, name: this._f.name, idNo: this._f.id_no }); return; }
    this.setData({ busy: true });
    return api.submitOrderIdentity({ id: o.id, name: this._f.name, id_no: this._f.id_no }).then((x) => {
      this._order = x; this._f = { name: '', id_no: '' };
      this.setData({ busy: false, sheet: false, name: '', idNo: '' }); render(this, x, Date.now());
    }, (err) => { this.setData({ busy: false }); cm.opFail(err); });
  },
  onAccess() { if (this._id) wx.navigateTo({ url: routes.ACCESS + '?id=' + this._id }); },
  onOrders() { cm.toOrders(); }
}));
