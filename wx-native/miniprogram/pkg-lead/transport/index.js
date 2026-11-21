// 运输与搬运 ACC_TRANSPORT（第 4 批，交接 v1.0 §4.9-5、§4.5-7）。下单前即可预约，由顾问确认方案与费用，不计入本次应付。可带 ?order=<订单号>（直接进这笔已付款订单的表单）、?store=<门店 id>（门店详情带来，写进下单前预约的线索）。
// 已做：没有已付款订单（或未登录）时直接预约（取送地址、期望运输日期、联系电话），提交后显示受理结果卡与本次预约；
//      有已付款订单时先「选择关联订单」，选定后是订单卡 + 表单 + 运输记录，提交后轻提示受理文案（按提交时刻，D-149）；
//      订单带「免费运输 1 次」时显示权益名与范围（D-173）；下单前预约时显示免费运输的条件句；校验错误句；加载 / 失败 / 断网；
//      同一次填写带同一个 request_key（连点或重试不重复建单），提交成功后清空表单；订单已不存在时提示并回到选择订单。
// 待业务：期望运输日期没有上限、也不校验是否在租期内（没有口径）；有已付款订单时从确认订单页进来也先选订单（E-06）。
// 未做：运输费用、承运方、时间段选择（冻结稿没有，由顾问确认）。
// 自定：已登录时联系电话直接用登录手机号（只读显示）；未登录时手填 11 位手机号。
const T = require('../../i18n/lead');
const L = require('../../core/config-lead');
const lead = require('../../core/lead');
const order = require('../../core/order');
const state = require('../../services/state');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const api = require('../../services/api');
const pd = require('../../services/page-data');
const share = require('../../services/share');
const X = T.transport, S = order.STAGE;
const PAID = [S.PAID, S.ACTIVE, S.EXPIRING, S.OVERDUE];
const key = () => 'LEAD_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
Page(auth.guarded(routes.TRANSPORT, {
  data: {
    T: { x: X, c: T.common }, sys: 'loading', view: 'pre', orders: [], order: null, free: false, records: [],
    address: '', addressMax: L.addressMax, date: '', phone: '', phoneMasked: '', today: '', errAddress: '', errDate: '', errPhone: '', busy: false,
    saved: null, inHours: true
  },
  onLoad(q) { this._orderId = (q && q.order) || ''; this._storeId = (q && q.store) || ''; this._key = ''; },
  onShow() { this.load(); },
  load() {
    const loggedIn = auth.isLoggedIn();
    this.setData({ today: lead.dateStr(Date.now()), phoneMasked: loggedIn ? state.get().session.phoneMasked : '' });
    return pd.load(this, loggedIn ? api.getOrders() : Promise.resolve([]), (list) => {
      const paid = (list || []).filter((o) => PAID.indexOf(o.stage) >= 0);
      this.setData({ orders: paid });
      if (this.data.view === 'saved') return; // 已提交的结果不被刷新冲掉
      const cur = this._orderId ? paid.find((o) => o.id === this._orderId) : null;
      if (cur) return this.openOrder(cur);
      this.setData({ view: paid.length ? 'pick' : 'pre', order: null, records: [] });
    });
  },
  onRetry() { this.setData({ sys: 'loading' }); this.load(); },
  openOrder(o) {
    this._orderId = o.id;
    this.setData({ view: 'form', order: o, free: !!o.free_transport, errAddress: '', errDate: '', errPhone: '' });
    return this.loadRecords();
  },
  loadRecords() {
    return api.getTransportRecords({ order_id: this._orderId }).then((list) => this.setData({ records: (list || []).map((r) => ({ id: r.id, address: r.address, date: r.date })) })).catch(() => this.setData({ records: [] }));
  },
  onPick(e) { const o = this.data.orders[Number(e.currentTarget.dataset.i)]; if (o) this.openOrder(o); },
  // 改了内容就是一次新的填写，换新的 request_key
  onAddress(e) { this._key = ''; this.setData({ address: e.detail.value, errAddress: '' }); },
  onDate(e) { this._key = ''; this.setData({ date: String((e.detail && e.detail.value) || ''), errDate: '' }); },
  onPhone(e) { this._key = ''; this.setData({ phone: e.detail.value, errPhone: '' }); },
  onSubmit() {
    const d = this.data, pre = d.view === 'pre';
    if (d.busy || (d.view !== 'pre' && d.view !== 'form')) return;
    const needPhone = !auth.isLoggedIn();
    const errAddress = lead.validAddress(d.address, true) ? '' : X.errAddress;
    const errDate = lead.validDate(d.date, Date.now()) ? '' : X.errDate;
    const errPhone = needPhone && !lead.validPhone(d.phone) ? X.errPhone : '';
    this.setData({ errAddress, errDate, errPhone });
    if (errAddress || errDate || errPhone) return;
    if (!this._key) this._key = key();
    this.setData({ busy: true });
    return api.submitLead({ type: lead.TYPES.TRANSPORT, request_key: this._key, address: d.address, date: d.date, phone: needPhone ? d.phone : '', order_id: pre ? '' : this._orderId, store_id: pre ? this._storeId : '' }).then((rec) => {
      this._key = '';
      if (pre) return this.setData({ busy: false, address: '', date: '', phone: '', view: 'saved', inHours: !!rec.in_service_hours, saved: { address: rec.address, date: rec.date, phone: rec.phone_masked } }); // IMPL-01：日期与联系电话分两行，不再拼成一串
      this.setData({ busy: false, address: '', date: '' });
      wx.showToast({ title: rec.in_service_hours ? X.toastIn : X.toastOff, icon: 'none' });
      return this.loadRecords();
    }).catch((err) => {
      const f = err && err.field;
      if (f === 'order') { // 订单已不存在：说明原因，回到选择订单（没有可选订单时是下单前预约）
        this._orderId = ''; this._key = ''; this.setData({ busy: false }); wx.showToast({ title: X.errOrder, icon: 'none' });
        return this.load();
      }
      this.setData({ busy: false, errAddress: f === 'address' ? X.errAddress : '', errDate: f === 'date' ? X.errDate : '', errPhone: f === 'phone' ? X.errPhone : '' });
      if (!f) wx.showToast({ title: T.common.failedMsg, icon: 'none' });
    });
  },
  onMine() { wx.switchTab({ url: routes.MINE }); },
  onFind() { wx.switchTab({ url: routes.STORES }); },
  // 转发（R-15）：不带订单号；有门店参数时带上
  onShareAppMessage() { return share.message(routes.TRANSPORT, { title: T.share.transport, query: this._storeId ? 'store=' + this._storeId : '' }); }
}));
