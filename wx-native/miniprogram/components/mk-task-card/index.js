// 订单任务卡（W34 交易域，交接 v1.0 §4.7）：按阶段取一张主卡 + 待办条带。首页与「我的」用同一个组件、同一份数据。
// 无属性，自取数据；未登录或没有可显示的订单时自己不渲染（只有已退仓订单时也不渲染）。
// 页面 onShow 可调用 this.selectComponent('#task').refresh()；组件自己也会在所在页面显示时刷新。
// 主卡取法（冻结稿 docs/W7_Shared_Contracts.md §1、pages/w1-render.js twoLayer）：
//   押金处理 / 退仓 / 已到期 / 续租 / 即将到期 / 租用中 ＞ 未实名兜底 / 待起租 ＞ 待支付 / 支付失败 ＞ 已超时 / 已取消。
// 待办条带：主卡被租后阶段占用时的待支付订单、预约记录（接口提供 getLeads 时）、未完成的找仓需求；最多 2 条，其余并成「还有 N 项待办」。
const CT = require('../../core/config-trade');
const T = require('../../i18n/trade');
const api = require('../../services/api');
const state = require('../../services/state');
const routes = require('../../services/routes');
const view = require('../../services/order-view');
const actions = require('../../services/order-actions');
const req = require('../../core/requirement');
const fmt = require('../../core/format');
const order = require('../../core/order');
const TK = T.task;
const GROUP = { refund: 0, returning: 0, inspection: 0, expired_lease: 0, renewal: 0, renewal_pending: 0, expiring: 0, active: 0, identity: 1, upcoming: 1, pending: 2, payment_failed: 2, expired: 6, cancelled: 6 };
const SCORE = { pending: 95, payment_failed: 94, refund: 91, returning: 90, inspection: 90, expired_lease: 89, identity: 87, renewal: 86, renewal_pending: 86, expiring: 82, upcoming: 77, active: 20, expired: 17, cancelled: 17 };
const URGENT = ['expired', 'payment_failed', 'refund', 'returning', 'inspection', 'identity', 'expiring', 'expired_lease', 'cancelled'];
const BTN = { // 阶段 → [主按钮, 次按钮]（动作名见 onAction）
  pending: ['pay', 'fees'], payment_failed: ['pay', 'swapUnit'], expired: ['restart', ''], cancelled: ['restart', ''],
  identity: ['identity', 'navigate'], upcoming: ['navigate', 'access'], active: ['unlock', 'navigate'], expiring: ['renew', 'unlock'],
  renewal: ['renewQuote', 'unlock'], renewal_pending: ['renewProgress', 'unlock'], returning: ['exitProgress', 'navigate'], inspection: ['exitProgress', 'navigate'],
  expired_lease: ['renew', 'exit'], refund: ['deposit', 'order']
};
function facts(o, p, now) {
  const F = TK.fact, hours = o.store.access_hours || '', end = view.ymd(o.lease.end), start = view.ymd(o.lease.start), out = [];
  const add = (v, l) => { if (v) out.push({ v: String(v), l }); };
  if (p === 'pending') add(view.yuan(o.quote.payable), F.payable);
  else if (p === 'payment_failed') { add(view.yuan(o.quote.payable), F.payable); add(view.countdown(o.pay.expires_at, now), F.payLeft); }
  else if (p === 'identity') add(start, F.startPlan);
  else if (p === 'upcoming') { add(start, F.startPlan); add(hours, F.access); }
  else if (p === 'active') { add(end, F.leaseEnd); add(hours, F.access); }
  else if (p === 'expiring') { add(end, F.leaseEnd); const n = view.daysLeft(o, now); if (n !== null && n >= 0) add(n + T.common.dayUnit, F.leftTerm); }
  else if (p === 'renewal') {
    add(end, F.curEnd);
    if (o.renew && o.renew.amount) add(view.yuan(o.renew.amount), F.renewQuote);
    if (o.renew && o.renew.quoted_at) add(view.countdown(order.renewQuoteExpiresAt(o.renew.quoted_at, o.lease.end), now), F.quoteLeft);
  } else if (p === 'renewal_pending') add(end, F.curEnd);
  else if (p === 'expired_lease') add(end, F.leaseDeadline);
  return out;
}
function mainCard(rec, others, now) {
  const o = rec.o, p = rec.p, b = BTN[p] || ['order', ''];
  const help = TK.help[p] || null, svc = p === 'active' || p === 'expiring';
  return {
    key: p, orderId: o.id, storeId: o.store.id, kicker: TK.kicker[p] || '', title: TK.title[p] || '', strong: p === 'pending' || p === 'payment_failed',
    badge: p === 'pending' ? TK.left + view.countdown(o.pay.expires_at, now) : (TK.badge[p] || ''), badgeTone: p === 'pending' ? 'err' : URGENT.indexOf(p) >= 0 ? 'warn' : 'ok',
    store: o.store.name, sub: view.unitLines(o).name + T.common.sep + fmt.termText(o.months),
    address: ['identity', 'upcoming', 'active', 'expiring', 'renewal', 'renewal_pending', 'returning', 'inspection', 'expired_lease'].indexOf(p) >= 0 ? (o.store.address || '') : '',
    facts: facts(o, p, now).slice(0, 3),
    primary: { t: TK.btn[b[0]], a: b[0] }, secondary: b[1] ? { t: TK.btn[b[1]], a: b[1] } : null,
    svc, helpTitle: help ? help[0] : '', helpText: help ? help[1] : '',
    othersText: others > 0 ? TK.others[0] + others + TK.others[1] : ''
  };
}
Component({
  options: { addGlobalClass: true },
  data: { T: TK, show: false, main: null, todos: [], moreText: '' },
  lifetimes: {
    attached() { this._off = state.on((topic) => { if (topic === 'session' || topic === '*' || topic === 'requirement') this.refresh(); }); this.refresh(); },
    detached() { this.stop(); if (this._off) this._off(); this._off = null; }
  },
  pageLifetimes: { show() { this.refresh(); }, hide() { this.stop(); } },
  methods: {
    refresh() {
      if (!state.get().session.loggedIn) { this.stop(); this._orders = []; this.setData({ show: false, main: null, todos: [], moreText: '' }); return Promise.resolve(); }
      const leads = typeof api.getLeads === 'function' ? api.getLeads().catch(() => []) : Promise.resolve([]);
      return Promise.all([api.getOrders(), leads]).then((res) => {
        this._orders = Array.isArray(res[0]) ? res[0] : []; this._leads = Array.isArray(res[1]) ? res[1] : [];
        this.render();
      }).catch(() => { this.stop(); this.setData({ show: false, main: null, todos: [], moreText: '' }); }); // 取数失败不占版面，页面其余部分照常
    },
    render() {
      const now = Date.now();
      const recs = (this._orders || []).map((o) => ({ o, p: view.phase(o, now) })).filter((r) => r.p !== 'ended' && GROUP[r.p] !== undefined)
        .sort((a, b) => GROUP[a.p] - GROUP[b.p] || SCORE[b.p] - SCORE[a.p] || b.o.created_at - a.o.created_at);
      if (!recs.length) {
        this.stop();
        const lead = (this._leads || []).find(x => x.status !== 'withdrawn');
        const need = state.get().requirement, sel = state.get().selection;
        const key = sel ? 'selected' : need ? 'searching' : lead ? 'booking' : '';
        const copy = { selected: ['继续确认用仓', sel && sel.store_name, '查看已选仓位', 'find'], searching: ['继续找仓', need ? req.demandText(need) + ' · ' + fmt.termText(need.term_months) : '', '查看推荐', 'find'], booking: ['已收到您的用仓需求', lead && lead.store_name, '查看预约', 'lead'] }[key];
        this.setData({ show: !!copy, main: copy ? { key, title: copy[0], store: copy[1] || '', sub: key === 'booking' ? TK.todoLeadIn : '', primary: { t: copy[2], a: copy[3] }, facts: [], badge: '', secondary: null } : null, todos: [], moreText: '' }); return;
      }
      const m = recs[0];
      const others = recs.filter((r) => (r.p === 'active' || r.p === 'expiring') && r.o.id !== m.o.id).length;
      const todos = [];
      // 待支付：主卡被租后或入仓阶段占用时进条带
      recs.slice(1).forEach((r) => {
        if ((r.p !== 'pending' && r.p !== 'payment_failed') || GROUP[m.p] >= 2) return;
        const txt = r.p === 'pending' ? r.o.store.name + T.common.sep + TK.todoPayable + view.yuan(r.o.quote.payable) + TK.todoLeft + view.countdown(r.o.pay.expires_at, now) : r.o.store.name + T.common.sep + TK.todoFailed;
        todos.push({ id: 'o' + r.o.id, k: TK.todoPending, t: txt, a: 'pay', orderId: r.o.id });
      });
      const lead = (this._leads || []).filter((x) => x && x.status !== 'withdrawn').slice(-1)[0];
      if (lead) todos.push({ id: 'lead', k: TK.todoLead, t: lead.in_service_hours === false ? TK.todoLeadOff : TK.todoLeadIn, a: 'lead', orderId: '' });
      const r = state.get().requirement; // 需求晚于订单时仍显示找仓进度（§4.7-3）
      if (r && Number(r.capacity_m3) > 0) todos.push({ id: 'find', k: TK.todoFind, t: req.demandText(r) + T.common.sep + fmt.termText(r.term_months) + TK.todoFindTail, a: 'find', orderId: '' });
      const shown = todos.slice(0, CT.taskTodoMax), more = todos.length - shown.length;
      this.setData({ show: true, main: mainCard(m, others, now), todos: shown, moreText: more > 0 ? TK.todoMore[0] + more + TK.todoMore[1] : '' });
      // 有倒计时（待支付、支付失败、续租报价）时每秒刷新一次显示
      const ticking = recs.some((x) => x.p === 'pending' || x.p === 'payment_failed' || x.p === 'renewal');
      if (ticking && !this._t) this._t = actions.every(() => this.render(), 1000);
      if (!ticking) this.stop();
    },
    stop() { if (this._t) { clearInterval(this._t); this._t = null; } },
    go(a, orderId, storeId) {
      const id = '?id=' + orderId;
      if (a === 'pay') return wx.navigateTo({ url: routes.CONFIRM + '?order=' + orderId });
      if (a === 'fees' || a === 'order' || a === 'more') return wx.navigateTo({ url: routes.ORDER_DETAIL + id });
      if (a === 'swapUnit') return wx.navigateTo({ url: routes.STORE_DETAIL + '?id=' + storeId });
      if (a === 'restart') return wx.switchTab({ url: routes.STORES });
      if (a === 'identity') return wx.navigateTo({ url: routes.IDENTITY + id });
      if (a === 'access') return wx.navigateTo({ url: routes.ACCESS + id });
      if (a === 'renew' || a === 'renewQuote' || a === 'renewProgress') return wx.navigateTo({ url: routes.RENEW + id });
      if (a === 'exit' || a === 'exitProgress') return wx.navigateTo({ url: routes.EXIT + id });
      if (a === 'deposit') return wx.navigateTo({ url: routes.DEPOSIT + id });
      if (a === 'add') return wx.navigateTo({ url: routes.QUICK + '?store=' + storeId + '&carried=1' });
      if (a === 'notice') return wx.navigateTo({ url: routes.AGREEMENT + '?doc=notice' });
      if (a === 'lead') return wx.navigateTo({ url: routes.NEEDS });
      if (a === 'find') return wx.navigateTo({ url: routes.MATCH });
      if (a === 'unlock') return actions.unlock();
      if (a === 'navigate') { const o = (this._orders || []).find((x) => x.id === orderId); return actions.navigate(o && o.store); }
    },
    onAction(e) { const m = this.data.main; if (m) this.go(e.currentTarget.dataset.a, m.orderId, m.storeId); },
    onTodo(e) { const t = this.data.todos[Number(e.currentTarget.dataset.i)]; if (t) this.go(t.a, t.orderId, ''); },
    onMore() { wx.switchTab({ url: routes.MINE }); }
  }
});
