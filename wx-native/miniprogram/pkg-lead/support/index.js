// 联系顾问 ACC_SUPPORT（第 4 批，交接 v1.0 §4.9）。带 ?order=<订单号> 时是「订单咨询」：顶部订单卡，咨询类型默认「订单与租后」。
// 已做：直接联系（400 客服电话 + 服务时段）、留言（咨询类型三选一、咨询内容 500 字、空内容报错）、其他入口（个人 / 企业用仓需求）、
//      提交后的受理结果卡（按提交时刻取文案，D-149）+ 已提交内容 + 直接联系；加载 / 失败 / 断网。
//      结果卡的去向：留言不进「预约记录」，所以不给「查看预约记录」；订单咨询给「查看订单」，其余给「继续找仓」（FIX-01 E-05，待业务裁定留言是否进记录页）。
// 自定：留言需要一个可联系的手机号，未登录点「提交咨询」时打开全站登录层，登录后再点一次提交（冻结稿这一页没有画联系电话）。
const T = require('../../i18n/lead');
const L = require('../../core/config-lead');
const lead = require('../../core/lead');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const api = require('../../services/api');
const pd = require('../../services/page-data');
const share = require('../../services/share');
const P = T.support;
Page(auth.guarded(routes.SUPPORT, {
  data: {
    T: { p: P, c: T.common, ack: T.ack }, sys: 'loading', order: null, types: [], type: 'general', text: '', count: '0/' + L.supportTextMax, max: L.supportTextMax, errText: '', busy: false,
    saved: null, nextBtn: T.common.goFind, inHours: true, loginVisible: false, loginTip: ''
  },
  onLoad(q) {
    this._orderId = (q && q.order) || '';
    this.setType(this._orderId ? 'order' : 'general');
    this.load();
  },
  load() { // 订单咨询要先取订单；未登录或订单不存在时按普通咨询显示
    const job = this._orderId && auth.isLoggedIn() ? api.getOrder({ id: this._orderId }).catch((e) => (e && e.code === 'NOT_FOUND' ? null : Promise.reject(e))) : Promise.resolve(null);
    return pd.load(this, job, (o) => {
      this.setData({ order: o });
      if (o) wx.setNavigationBarTitle({ title: P.orderTitle }); else if (this._orderId) { this._orderId = ''; this.setType('general'); }
    });
  },
  onRetry() { this.setData({ sys: 'loading' }); this.load(); },
  setType(k) { const ok = P.types.some((x) => x.k === k) ? k : 'general'; this.setData({ type: ok, types: P.types.map((x) => ({ k: x.k, t: x.t, on: x.k === ok })) }); },
  onType(e) { this.setType(e.currentTarget.dataset.k); },
  onText(e) { const v = String(e.detail.value || '').slice(0, L.supportTextMax); this.setData({ text: v, count: v.length + '/' + L.supportTextMax, errText: '' }); },
  onCall() { wx.makePhoneCall({ phoneNumber: L.hotline, fail: (err) => { if (!/cancel/i.test(String((err && err.errMsg) || ''))) wx.showToast({ title: P.callFail, icon: 'none' }); } }); },
  onSubmit() {
    const d = this.data;
    if (d.busy) return;
    if (!String(d.text).trim()) { this.setData({ errText: P.errText }); return; }
    if (!auth.isLoggedIn()) { this.setData({ loginVisible: true, loginTip: P.loginTip }); return; }
    this.setData({ busy: true });
    return api.submitLead({ type: lead.TYPES.SUPPORT, text: d.text, support_type: d.type, order_id: d.order ? d.order.id : '' }).then((rec) => {
      const t = P.types.find((x) => x.k === rec.support_type) || P.types[0];
      this.setData({ busy: false, saved: { typeText: t.t, text: rec.text }, nextBtn: d.order ? T.common.viewOrder : T.common.goFind, inHours: !!rec.in_service_hours });
      wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    }).catch((err) => {
      this.setData({ busy: false, errText: err && err.field === 'text' ? P.errText : '' });
      if (!(err && err.field === 'text')) wx.showToast({ title: T.common.failedMsg, icon: 'none' });
    });
  },
  onLoginClose() { this.setData({ loginVisible: false }); },
  onLoginSuccess() { this.setData({ loginVisible: false }); },
  onPersonal() { wx.navigateTo({ url: routes.BOOKING }); },
  onEnterprise() { wx.navigateTo({ url: routes.BUSINESS }); },
  onMine() { wx.switchTab({ url: routes.MINE }); },
  onNext() { if (this.data.order) auth.navigate(this, routes.ORDER_DETAIL + '?id=' + this.data.order.id); else wx.switchTab({ url: routes.STORES }); },
  // 转发（R-15）：不带订单号
  onShareAppMessage() { return share.message(routes.SUPPORT, { title: T.share.support }); }
}));
