// 预约记录 ACC_NEEDS（第 4 批，交接 v1.0 §4.7-7、§4.9-7）。标题「预约用仓」，这是记录页，不是表单。
// 已做：空态（「预约用仓」进表单）；记录列表（企业 / 个人 / 顾问咨询 / 考拉E存咨询四种标题，状态标签，位置、容量 · 租期 · 手机号、备注）；
//      顶部受理说明（有未撤回的记录才显示）；个人需求「撤回」「修改地址与备注」，企业需求「修改地址与备注」「补充企业资料」「更多」；
//      更多操作弹层（撤回需求 / 联系顾问 / 取消）；修改需求弹层（用仓位置、备注）；撤回确认；已撤回的记录不再有操作；加载 / 失败 / 断网。
// 未做：受理进度的后续状态（已联系、已成交等）—— 冻结稿只有「已提交，待顾问联系」「已撤回」两种，其余等后端状态。
// 未登录时没有记录可看，显示空态。
const T = require('../../i18n/lead');
const L = require('../../core/config-lead');
const lead = require('../../core/lead');
const fmt = require('../../core/format');
const req = require('../../core/requirement');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const api = require('../../services/api');
const pd = require('../../services/page-data');
const N = T.needs;
const titleOf = (l) => (l.type === lead.TYPES.ENTERPRISE ? N.titles.enterprise : l.source === 'estore' ? N.titles.estore : l.type === lead.TYPES.ADVISOR ? N.titles.advisor : N.titles.booking);
function card(l) {
  const ent = l.type === lead.TYPES.ENTERPRISE, off = l.status === lead.STATUS.WITHDRAWN;
  const cap = l.capacity_hint || (l.capacity_m3 ? req.pretty(l.capacity_m3) + 'm³' : N.capNone);
  const term = l.term_hint || (l.term_months ? fmt.termText(l.term_months) : N.termNone);
  return {
    id: l.id, ent, off, title: titleOf(l), status: off ? N.status.withdrawn : N.status.submitted,
    loc: l.address || (l.type === lead.TYPES.ADVISOR ? N.addrOptional : N.addrNone),
    detail: [cap, term].concat(l.phone_masked ? [l.phone_masked] : []).join(' · '), note: l.note ? N.notePrefix + l.note : '',
    address: l.address || '', rawNote: l.note || ''
  };
}
Page(auth.guarded(routes.NEEDS, {
  data: { T: { n: N, ack: T.ack, c: T.common }, sys: 'loading', list: [], active: false, sheet: '', curId: '', editAddress: '', editNote: '', editErr: '', busy: false, addressMax: L.addressMax, noteMax: L.noteMax },
  onLoad() {},
  onShow() { this.load(); },
  load() {
    return pd.load(this, api.getLeads({}), (leads) => {
      const list = (leads || []).map(card);
      this.setData({ list, active: list.some((x) => !x.off) });
    });
  },
  onRetry() { this.setData({ sys: 'loading' }); this.load(); },
  cur(e) { const id = e && e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.id : ''; return this.data.list.find((x) => x.id === id) || null; },
  onBook() { wx.navigateTo({ url: routes.BOOKING }); },
  onFill(e) { const c = this.cur(e); if (c) wx.navigateTo({ url: routes.BUSINESS + '?lead=' + c.id }); },
  onMore(e) { const c = this.cur(e); if (c) this.setData({ sheet: 'more', curId: c.id }); },
  onEdit(e) { const c = this.cur(e); if (c) this.setData({ sheet: 'edit', curId: c.id, editAddress: c.address, editNote: c.rawNote, editErr: '' }); },
  onEditAddress(e) { this.setData({ editAddress: e.detail.value, editErr: '' }); },
  onEditNote(e) { this.setData({ editNote: e.detail.value }); },
  onSave() {
    const d = this.data;
    if (d.busy || !d.curId) return;
    this.setData({ busy: true });
    return api.updateLead({ id: d.curId, address: d.editAddress, note: d.editNote }).then(() => { this.setData({ busy: false, sheet: '' }); return this.load(); })
      .catch((err) => {
        this.setData({ busy: false, editErr: err && err.field === 'address' ? N.errAddress : err && err.code === 'CONFLICT' ? N.errWithdrawn : N.saveFail });
        if (err && err.code === 'UNAUTHENTICATED') this.setData({ sheet: '' });
      });
  },
  onWithdraw(e) { const c = this.cur(e); if (c) this.askWithdraw(c.id); },
  onMoreWithdraw() { const id = this.data.curId; this.setData({ sheet: '' }); if (id) this.askWithdraw(id); },
  askWithdraw(id) {
    wx.showModal({
      title: N.withdrawTitle, content: N.withdrawMsg, cancelText: N.withdrawNo, confirmText: N.withdrawYes,
      success: (r) => { if (r && r.confirm) api.cancelLead({ id }).then(() => this.load()).catch(() => wx.showToast({ title: N.saveFail, icon: 'none' })); },
      fail: () => {}
    });
  },
  onMoreContact() { this.setData({ sheet: '' }); wx.navigateTo({ url: routes.SUPPORT }); },
  onSheetClose() { this.setData({ sheet: '' }); }
}));
