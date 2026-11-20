// 订单详情 O03（第 2 批）。?id=订单号；从确认订单支付成功跳来时带 &paid=1（先显示「正在确认支付结果」）和 &sub=accepted|declined（到期提醒订阅结果）。
// 已做（27 态里 25 个）：状态头（标题 + 标签 + 订单号 / 下单日 / 支付剩余 / 剩余天数 / 计划起租）、各阶段说明句、订单摘要卡、门店服务（导航 / 联系门店 / 一键开锁）、
//   租赁进度、订单服务列表（电子合同 · 已签署 → 电子合同页；入仓指引 / 实名认证；续租；退仓 / 退订；押金进度；申请发票）、费用明细（含满额减）、
//   待支付与支付失败的取消订单确认、各阶段底栏、下单时未实名的兜底态（D-174）、到期提醒已开启 / 未开启两句、空态、加载 / 失败 / 断网、支付确认中。
// 「一键开锁」点击只提示暂未开通（D-151、D-175）。
// 未做：sub=ask（微信订阅授权框是微信原生界面）；arrival=simple 里的到店资料摘要两行（门店到店资料未入库，只保留「到店与进仓指引」入口行）。
// 门店导航：演示门店数据没有坐标，现在是复制地址（services/order-actions.js）。
const TT = require('../../i18n/trade');
const C = require('../../core/config');
const api = require('../../services/api');
const auth = require('../../services/auth');
const routes = require('../../services/routes');
const pd = require('../../services/page-data');
const view = require('../../services/order-view');
const actions = require('../../services/order-actions');
const subscribe = require('../../services/subscribe');
const order = require('../../core/order');
const fmt = require('../../core/format');
const T = TT.order, S = order.STAGE;
const LEASE = { [S.PAID]: 'upcoming', [S.ACTIVE]: 'active', [S.EXPIRING]: 'active', [S.OVERDUE]: 'expired', [S.EXITING]: 'returning', [S.ENDED]: 'ended' };
const BAR = { // 阶段 → [主按钮文字键, 动作, 次按钮文字键, 动作]
  identity: ['btnIdentity', 'identity', 'navigate', 'navigate'], upcoming: ['navigate', 'navigate', 'access', 'access'], active: ['unlock', 'unlock', 'navigate', 'navigate'],
  expiring: ['btnRenew', 'renew', 'unlock', 'unlock'], renewal: ['btnRenewQuote', 'renew', 'unlock', 'unlock'], renewal_pending: ['btnRenewProgress', 'renew', 'unlock', 'unlock'],
  returning: ['btnExitProgress', 'exit', 'navigate', 'navigate'], inspection: ['btnInspect', 'exit', '', ''], refund: ['btnDeposit', 'deposit', '', ''],
  expired_lease: ['btnRenew', 'renew', 'btnExit', 'exit'], ended: ['btnAgain', 'restart', '', ''], expired: ['btnRestart', 'restart', '', ''], cancelled: ['btnRestart', 'restart', '', '']
};
function depositLabel(o, p) {
  const st = o.deposit && o.deposit.status, L = T.depositLabel;
  if (p === 'inspection') return L.inspect;
  return L[st] || '';
}
function build(o, now, sub) {
  const h = view.head(o, now), p = h.phase, paid = view.isPaid(p), lk = LEASE[o.stage] || '';
  const idv = o.identity_status === 'verified', left = view.daysLeft(o, now);
  const subs = [T.orderNo + o.no, T.orderedAt + view.ymd(o.created_at)];
  if (p === 'expiring' && left !== null) subs.push(T.leftPrefix + left + T.leftSuffix);
  if (p === 'upcoming' || p === 'identity') subs.push(T.startPlan + view.ymd(o.lease.start));
  const NOTE = {
    payment_failed: { title: '', text: T.noteFailed[0] + view.ymdhm(o.pay.expires_at) + T.noteFailed[1], tone: 'err' },
    expired: { title: '', text: T.noteExpired, tone: '' }, cancelled: { title: '', text: T.noteCancelled, tone: '' },
    identity: { title: '', text: T.noteIdentity, tone: 'warn' }, expired_lease: { title: T.noteOverdueTitle, text: T.noteOverdue, tone: 'warn' },
    renewal: { title: '', text: T.noteRenewal, tone: 'warn' }
  };
  const d = { head: h, subs, note: NOTE[p] || null, order: o, paid, phase: p, clock: '', subLine: paid && (sub === 'accepted' || sub === 'declined') ? sub : '' };
  d.storeSvc = paid && p !== 'ended'; d.withUnlock = ['active', 'expiring', 'renewal', 'renewal_pending'].indexOf(p) >= 0;
  d.progress = []; d.services = [];
  if (paid) {
    d.progress.push({ k: T.totalTerm, v: fmt.termText(o.months) }, { k: T.leaseEnd, v: view.ymd(o.lease.end) });
    if (p === 'expiring' && left !== null) d.progress.push({ k: T.leftTerm, v: left + T.leftSuffix });
    if (!idv) d.progress.push({ k: T.identity, v: T.todo, soft: true });
    d.progress.push({ k: T.deposit, v: depositLabel(o, p) || T.depositLabel.holding });
    const rows = d.services, row = (a, icon, k, v, on) => rows.push({ a, icon, k, v: v || '', on: !!on });
    row('contract', 'ic-shield', T.econtract, o.contract && o.contract.signed ? T.signed : '');
    if (lk === 'active' || lk === 'upcoming') { if (idv) row('access', 'ic-door', T.access, ''); else row('identity', 'ic-id', T.identity, T.todo, true); }
    const ren = o.renew && (o.renew.status === 'submitted' || o.renew.status === 'quoted') ? o.renew : null;
    if ((lk === 'active' || lk === 'upcoming') && o.months < C.requirement.termMax) row('renew', 'ic-renew', ren ? T.renewProgress : T.renew, ren ? (ren.status === 'quoted' ? T.renewQuoted : T.renewSubmitted) : T.canApply, !!ren);
    if (lk === 'expired') row('renew', 'ic-renew', T.renew, T.canApply, true);
    if (lk === 'active' || lk === 'expired' || lk === 'returning') row('exit', 'ic-cal', lk === 'returning' ? T.exitProgress : T.exit, o.exit ? (p === 'inspection' ? T.exitInspect : T.exitSubmitted) : '', !!o.exit);
    if (lk === 'upcoming') row('exit', 'ic-cal', T.unsubscribe, '');
    row('deposit', 'ic-ticket', T.depositProgress, p === 'inspection' ? T.depositLabel.inspect : (o.deposit.status !== 'holding' ? depositLabel(o, p) : ''), o.deposit.status === 'refunding');
    row('invoice', 'ic-note', T.invoice, o.invoice.status === 'issued' ? T.invoiceIssued : o.invoice.status === 'applying' ? T.invoiceApplying : T.canApply);
  }
  d.cancelable = p === 'pending' || p === 'payment_failed';
  const b = BAR[p], txt = (k) => T[k] || '';
  if (d.cancelable) d.bar = { mode: 'pay', amount: view.yuan(o.quote.payable), primary: { t: T.btnPay, a: 'pay' }, secondary: null };
  else if (b) d.bar = { mode: b[2] ? 'two' : 'one', amount: '', primary: { t: txt(b[0]), a: b[1] }, secondary: b[2] ? { t: txt(b[2]), a: b[3] } : null };
  else d.bar = { mode: 'none', amount: '', primary: null, secondary: null };
  d.showBar = d.bar.mode !== 'none';
  return d;
}
Page(auth.guarded(routes.ORDER_DETAIL, {
  data: { T, sys: 'loading', empty: false, paying: false, head: null, subs: [], clock: '', note: null, subLine: '', order: null, paid: false, phase: '', storeSvc: false, withUnlock: false, progress: [], services: [], cancelable: false, bar: { mode: 'none', amount: '', primary: null, secondary: null }, showBar: false, busy: false, loginVisible: false },
  onLoad(q) { this._id = (q && q.id) || ''; this._sub = (q && q.sub) || ''; if (q && q.paid === '1') this.setData({ paying: true }); },
  onShow() { this.refresh(); },
  onHide() { this.stop(); },
  onUnload() { this.stop(); },
  refresh() {
    if (!this._id) { this.setData({ sys: '', empty: true, paying: false, showBar: false }); return Promise.resolve(); }
    const p = api.getOrder({ id: this._id }).catch((err) => (err && err.code === 'NOT_FOUND' ? null : Promise.reject(err)));
    return pd.load(this, p, (o) => {
      if (!o) { this.stop(); this.setData({ empty: true, paying: false, order: null, showBar: false }); return; }
      this.setData(Object.assign({ empty: false, paying: false }, build(o, Date.now(), this._sub)));
      this.tick();
      if (this.data.cancelable && !this._t) this._t = actions.every(() => this.tick(), 1000);
      if (!this.data.cancelable) this.stop();
    }).then(() => { if (this.data.sys && this.data.paying) this.setData({ paying: false }); }); // 取数失败时收起「正在确认支付结果」
  },
  // 待支付 / 支付失败的剩余时间：自下单起 3 小时，支付失败不重新计时
  tick() {
    const o = this.data.order;
    if (!o || !this.data.cancelable) return;
    const now = Date.now();
    if (order.isExpired(o.pay.expires_at, now)) { this.stop(); this.refresh(); return; }
    this.setData({ clock: T.payLeft + view.countdown(o.pay.expires_at, now) });
  },
  stop() { if (this._t) { clearInterval(this._t); this._t = null; } },
  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },
  onBackOrders() { wx.switchTab({ url: routes.ORDERS }); },
  onAct(e) {
    const a = e.currentTarget.dataset.a, o = this.data.order;
    if (!o) return;
    const id = '?id=' + o.id;
    if (a === 'pay') return auth.navigate(this, routes.CONFIRM + '?order=' + o.id); // 继续支付：回确认订单的待支付态，同一订单号
    if (a === 'restart') return wx.switchTab({ url: routes.STORES });
    if (a === 'identity') return auth.navigate(this, routes.IDENTITY + id);
    if (a === 'access' || a === 'arrival') return wx.navigateTo({ url: routes.ACCESS + id });
    if (a === 'renew') return auth.navigate(this, routes.RENEW + id);
    if (a === 'exit') return auth.navigate(this, routes.EXIT + id);
    if (a === 'deposit') return auth.navigate(this, routes.DEPOSIT + id);
    if (a === 'invoice') return auth.navigate(this, routes.INVOICE + id);
    if (a === 'contract') return auth.navigate(this, routes.ECONTRACT + id);
    if (a === 'navigate') return actions.navigate(o.store);
    if (a === 'call') return actions.call(o.store);
    if (a === 'unlock') return actions.unlock();
  },
  onCancel() {
    const o = this.data.order;
    if (!o || !this.data.cancelable || this.data.busy) return;
    wx.showModal({
      title: TT.confirm.cancelTitle, content: TT.confirm.cancelDesc, cancelText: TT.confirm.cancelKeep, confirmText: TT.confirm.cancelYes,
      success: (res) => {
        if (!res.confirm) return;
        this.setData({ busy: true });
        api.cancelOrder({ order_id: o.id }).then(() => { this.setData({ busy: false }); this.refresh(); })
          .catch((err) => { this.setData({ busy: false }); actions.toast((err && err.message) || TT.confirm.toastFail); this.refresh(); });
      },
      fail() {}
    });
  },
  // 「开启通知」：一次性订阅，必须由点按触发；允许或取消都不影响订单
  onSubAsk() { subscribe.request(subscribe.SCENES.EXPIRE).then((r) => { this._sub = r.accepted ? 'accepted' : 'declined'; this.setData({ subLine: this._sub }); }); },
  onLoginClose() { this.setData({ loginVisible: false }); },
  noop() {}
}));
