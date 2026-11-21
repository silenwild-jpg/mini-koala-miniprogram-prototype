// 订单任务卡（W34 交易域，交接 v1.0 §4.7）：按阶段取一张主卡 + 待办条带。首页与「我的」用同一个组件、同一份数据。
// 无属性，自取数据；未登录或没有可显示的订单时自己不渲染（只有已退仓订单时也不渲染）。
// 页面 onShow 可调用 this.selectComponent('#task').refresh()；组件自己也会在所在页面显示时刷新。
// 主卡取法（冻结稿 docs/W7_Shared_Contracts.md §1、pages/w1-render.js twoLayer）：
//   押金处理 / 退仓 / 已到期 / 续租 / 即将到期 / 租用中 ＞ 未实名兜底 / 待起租 ＞ 待支付 / 支付失败 ＞ 已超时 / 已取消。
// 待办条带：主卡被租后阶段占用时的待支付订单、预约记录（接口提供 getLeads 时）、未完成的找仓需求；最多 2 条，其余并成「还有 N 项待办」。
// FIX-01：
//   阶段内单列的情况（order-view.variant：押金退款未成功、验仓未通过、退仓待清空、实名未通过、续租待支付 / 付款未成功）各有标题、角标、事实格和主按钮（A-02、A-03、A-06）；
//   没有订单时：有找仓需求的不再出「继续找仓」简化卡，交给需求卡 mk-need-card（A-05）；有预约记录的进待办条带（A-07）；
//   在「我的」页不出「找仓进度」待办，那一页的需求卡一直显示，避免两处说同一件事（D-17）。
// IMPL-01（2026-11-21）：临期且主按钮已是「办理续租」时四宫格去掉「续租」（M-05）；待支付待办的门店、金额、剩余时间分开呈现；
//   卡内不再画分隔线，说明用不描边的浅灰底块，待办条带从描边卡改成浅灰底块。
const CT = require('../../core/config-trade');
const CA = require('../../core/config-after');
const CAC = require('../../core/config-account');
const account = require('../../core/account');
const after = require('../../core/after');
const T = require('../../i18n/trade');
const api = require('../../services/api');
const state = require('../../services/state');
const routes = require('../../services/routes');
const view = require('../../services/order-view');
const actions = require('../../services/order-actions');
const req = require('../../core/requirement');
const fmt = require('../../core/format');
const TK = T.task;
const GROUP = { refund: 0, returning: 0, inspection: 0, expired_lease: 0, renewal: 0, renewal_pending: 0, expiring: 0, active: 0, identity: 1, upcoming: 1, pending: 2, payment_failed: 2, expired: 6, cancelled: 6 };
const SCORE = { pending: 95, payment_failed: 94, refund: 91, returning: 90, inspection: 90, expired_lease: 89, identity: 87, renewal: 86, renewal_pending: 86, expiring: 82, upcoming: 77, active: 20, expired: 17, cancelled: 17 };
const URGENT = ['expired', 'payment_failed', 'refund', 'returning', 'inspection', 'identity', 'expiring', 'expired_lease', 'cancelled'];
const BTN = { // 阶段 → [主按钮, 次按钮]（动作名见 onAction）
  pending: ['pay', 'fees'], payment_failed: ['pay', 'swapUnit'], expired: ['restart', ''], cancelled: ['restart', ''],
  identity: ['identity', 'navigate'], upcoming: ['navigate', 'access'], active: ['unlock', 'navigate'], expiring: ['renew', 'unlock'],
  renewal: ['renewQuote', 'unlock'], renewal_pending: ['renewProgress', 'unlock'], returning: ['exitProgress', 'navigate'], inspection: ['exitProgress', 'navigate'],
  expired_lease: ['renew', 'exit'], refund: ['deposit', 'order'],
  // 阶段内单列的情况
  refund_failed: ['deposit', 'call'], inspect_failed: ['reinspect', 'navigate'], exit_clearing: ['toInspect', 'navigate'], identity_mismatch: ['identityRetry', 'navigate'],
  renewal_pay: ['renewPay', 'unlock'], renewal_pay_failed: ['renewPay', 'unlock']
};
const ERR = ['refund_failed', 'inspect_failed', 'identity_mismatch', 'renewal_pay_failed'];
function facts(o, p, now, key) {
  const F = TK.fact, hours = o.store.access_hours || '', end = view.ymd(o.lease.end), start = view.ymd(o.lease.start), out = [];
  const add = (v, l) => { if (v) out.push({ v: String(v), l }); };
  if (p === 'pending') add(view.yuan(o.quote.payable), F.payable);
  else if (p === 'payment_failed') { add(view.yuan(o.quote.payable), F.payable); add(view.countdown(o.pay.expires_at, now), F.payLeft); }
  else if (p === 'identity') add(start, F.startPlan);
  else if (p === 'upcoming') { add(start, F.startPlan); add(hours, F.access); }
  else if (p === 'active') { add(end, F.leaseEnd); add(hours, F.access); }
  else if (p === 'expiring') { add(end, F.leaseEnd); const n = view.daysLeft(o, now); if (n !== null && n >= 0) add(n === 0 ? T.order.leftToday : n + T.common.dayUnit, F.leftTerm); }
  else if (p === 'renewal') {
    add(end, F.curEnd);
    if (o.renew && o.renew.amount) add(view.yuan(o.renew.amount), key === 'renewal' ? F.renewQuote : F.renewPayable);
    if (o.renew && o.renew.quoted_at) add(view.countdown(after.renewDeadline(o.renew.quoted_at, o.lease.end), now), F.quoteLeft);
  } else if (p === 'renewal_pending') add(end, F.curEnd);
  else if (p === 'expired_lease') { add(end, F.leaseDeadline); const n = view.daysLeft(o, now); if (n !== null && n < 0) add((-n) + T.common.dayUnit, F.overdue); }
  else if (p === 'returning' || p === 'inspection') { // 退仓：计划取空日
    // REVIEW-02 E2-12：验仓未通过不再单列「需重新验仓 / 验仓结果」一格——标题与右上标签已经说了两遍，这一格只是把标签文字再抄一次
    add(o.exit && o.exit.date, F.clearPlan);
  } else if (p === 'refund') add(key === 'refund_failed' ? F.depositAbnormal : F.depositRefunding, F.depositState); // 冻结稿 REFUND_FAILED：事实格「处理异常」（A-02）
  return out;
}
function mainCard(rec, others, now) {
  const o = rec.o, p = rec.p, key = view.variant(o, p) || p, b = BTN[key] || BTN[p] || ['order', ''];
  let help = TK.help[key] || (key === p ? null : TK.help[p]) || null;
  if (key === 'inspection' && help) help = [help[0], help[1].replace('{n}', CA.sla.inspectDays)];
  if (key === 'inspect_failed') help = o.exit && o.exit.fail_reason ? [TK.help.inspect_failed[0], o.exit.fail_reason] : null;
  const svc = p === 'active' || p === 'expiring';
  return {
    key: p, variant: key === p ? '' : key, orderId: o.id, storeId: o.store.id, kicker: TK.kicker[p] || '', title: TK.title[key] || TK.title[p] || '', strong: p === 'pending' || p === 'payment_failed',
    badge: p === 'pending' ? TK.left + view.countdown(o.pay.expires_at, now) : (TK.badge[key] || ''), badgeTone: p === 'pending' || ERR.indexOf(key) >= 0 ? 'err' : URGENT.indexOf(p) >= 0 ? 'warn' : 'ok',
    store: o.store.name, sub: view.unitLines(o).name + T.common.sep + fmt.termText(o.months), // sub 只在订单没带仓位编号时兜底显示
    // IMPL-02：仓位编号用 mk-unitno 标签（组合仓每个编号一个），容量与租期跟在后面，与订单卡同一写法
    codes: (o.units || []).map((u) => u.code).filter(Boolean), vol: (o.units || []).length ? fmt.pretty(view.unitsVolume(o.units)) + 'm³' : '', term: fmt.termText(o.months),
    address: ['identity', 'upcoming', 'active', 'expiring', 'renewal', 'renewal_pending', 'returning', 'inspection', 'expired_lease'].indexOf(p) >= 0 ? (o.store.address || '') : '',
    facts: facts(o, p, now, key).slice(0, 3),
    primary: { t: TK.btn[b[0]], a: b[0] }, secondary: b[1] ? { t: TK.btn[b[1]], a: b[1] } : null,
    svc, svcRenew: !(p === 'expiring' && b[0] === 'renew'), // M-05：临期且主按钮已是「办理续租」时，四宫格不再重复出「续租」
    helpTitle: help ? help[0] : '', helpText: help ? help[1] : '',
    othersText: others > 0 ? TK.others[0] + others + TK.others[1] : '', others
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
        // 没有订单：已选仓位 → 「继续确认用仓」；只有预约记录 → 「已收到您的用仓需求」；有找仓需求 → 不出主卡，由需求卡显示（A-05），预约记录进条带（A-07）
        const lead = this.latestLead();
        const need = state.get().requirement, sel = state.get().selection;
        const key = sel ? 'selected' : need ? '' : lead ? 'booking' : '';
        const copy = { selected: [TK.noOrder.selected, sel && sel.store_name, TK.noOrder.selectedBtn, 'find'], booking: [TK.noOrder.booking, lead && lead.store_name, TK.noOrder.bookingBtn, 'lead'] }[key];
        const strip = lead && key !== 'booking' ? [{ id: 'lead', k: TK.todoLead, t: this.leadText(lead, now), a: 'lead', orderId: '' }] : [];
        this.setData({ show: !!copy || strip.length > 0, main: copy ? { key, title: copy[0], store: copy[1] || '', sub: key === 'booking' ? this.leadText(lead, now) : '', primary: { t: copy[2], a: copy[3] }, facts: [], badge: '', secondary: null } : null, todos: strip, moreText: '' }); return;
      }
      const m = recs[0];
      // 「另有 N 处在租仓位」（REVIEW-02 E2-01 / D2-01）：与「我的」页「我的仓位」同一口径（core/account.js activeAssets：已付款且还没结束的订单），
      // 原先只数租用中 / 即将到期，续租处理中、退仓中、待入仓、已到期的都漏了，和「我的仓位 全部 N 处」对不上。
      // 在「我的」页不出这一句：那一页紧接着就是「我的仓位」列表，不重复说。
      const others = this.onMine() ? 0 : account.activeAssets(this._orders).filter((o) => o.id !== m.o.id).length;
      const todos = [];
      // 待支付：主卡被租后或入仓阶段占用时进条带
      recs.slice(1).forEach((r) => {
        if ((r.p !== 'pending' && r.p !== 'payment_failed') || GROUP[m.p] >= 2) return;
        // IMPL-01：门店名、金额、剩余时间不再拼成一串。门店名是正文，金额单列在行尾用数字字体，剩余时间 / 支付未成功是下一行小字
        todos.push({ id: 'o' + r.o.id, k: TK.todoPending, t: r.o.store.name, amt: view.yuan(r.o.quote.payable), note: r.p === 'pending' ? TK.left + view.countdown(r.o.pay.expires_at, now) : TK.todoFailed, a: 'pay', orderId: r.o.id });
      });
      const lead = this.latestLead();
      if (lead) todos.push({ id: 'lead', k: TK.todoLead, t: this.leadText(lead, now), a: 'lead', orderId: '' });
      const r = state.get().requirement; // 需求晚于订单时仍显示找仓进度（§4.7-3）
      if (r && Number(r.capacity_m3) > 0 && !this.onMine()) todos.push({ id: 'find', k: TK.todoFind, t: req.demandText(r) + T.common.sep + fmt.termText(r.term_months) + TK.todoFindTail, a: 'find', orderId: '' });
      const shown = todos.slice(0, CT.taskTodoMax), more = todos.length - shown.length;
      this.setData({ show: true, main: mainCard(m, others, now), todos: shown, moreText: more > 0 ? TK.todoMore[0] + more + TK.todoMore[1] : '' });
      // 有倒计时（待支付、支付失败、续租报价）时每秒刷新一次显示
      const ticking = recs.some((x) => x.p === 'pending' || x.p === 'payment_failed' || x.p === 'renewal');
      if (ticking && !this._t) this._t = actions.every(() => this.render(), 1000);
      if (!ticking) this.stop();
    },
    // 预约记录一句话（REVIEW-02 E2-15）：承诺句「预计 10 分钟内与您联系 / 顾问上班后将优先联系您」只在受理后 needsAckHours 小时内写，
    // 过了改成中性的「已提交，待顾问联系」——与预约记录页同一个窗口（core/config-account.js needsAckHours，PR-120）。没有受理时间的按刚提交算。
    // 最近一条未撤回的预约记录：按受理时间取最新的。接口按新到旧返回，原先取数组最后一条，拿到的其实是最早的那条（REVIEW-02 E2-15 核实时发现）
    latestLead() {
      const live = (this._leads || []).filter((x) => x && x.status !== 'withdrawn');
      return live.reduce((best, x) => (!best || (Number(x.accepted_at) || 0) > (Number(best.accepted_at) || 0) ? x : best), null) || undefined;
    },
    leadText(lead, now) {
      const at = Number(lead && lead.accepted_at) || 0;
      if (at > 0 && now - at >= CAC.needsAckHours * 3600e3) return TK.todoLeadWait;
      return lead.in_service_hours === false ? TK.todoLeadOff : TK.todoLeadIn;
    },
    stop() { if (this._t) { clearInterval(this._t); this._t = null; } },
    // 所在页面是不是「我的」：那一页的需求卡一直显示，任务卡不再重复出「找仓进度」（D-17）
    onMine() { const ps = typeof getCurrentPages === 'function' ? getCurrentPages() : [], cur = ps[ps.length - 1]; return !!cur && '/' + cur.route === routes.MINE; },
    go(a, orderId, storeId) {
      const id = '?id=' + orderId;
      if (a === 'pay') return wx.navigateTo({ url: routes.CONFIRM + '?order=' + orderId });
      if (a === 'fees' || a === 'order' || a === 'more') return wx.navigateTo({ url: routes.ORDER_DETAIL + id });
      if (a === 'swapUnit') return wx.navigateTo({ url: routes.STORE_DETAIL + '?id=' + storeId });
      if (a === 'restart') return wx.switchTab({ url: routes.STORES });
      if (a === 'identity' || a === 'identityRetry') return wx.navigateTo({ url: routes.IDENTITY + id });
      if (a === 'access') return wx.navigateTo({ url: routes.ACCESS + id });
      if (a === 'renew' || a === 'renewQuote' || a === 'renewProgress' || a === 'renewPay') return wx.navigateTo({ url: routes.RENEW + id });
      if (a === 'exit' || a === 'exitProgress' || a === 'reinspect' || a === 'toInspect') return wx.navigateTo({ url: routes.EXIT + id });
      if (a === 'deposit') return wx.navigateTo({ url: routes.DEPOSIT + id });
      if (a === 'add') return wx.navigateTo({ url: routes.QUICK + '?store=' + storeId + '&carried=1' });
      if (a === 'notice') return wx.navigateTo({ url: routes.AGREEMENT + '?doc=notice' });
      if (a === 'lead') return wx.navigateTo({ url: routes.NEEDS });
      if (a === 'find') return wx.navigateTo({ url: routes.MATCH });
      if (a === 'unlock') return actions.unlock();
      if (a === 'call') { const o = (this._orders || []).find((x) => x.id === orderId); return actions.call(o && o.store); }
      if (a === 'navigate') { const o = (this._orders || []).find((x) => x.id === orderId); return actions.navigate(o && o.store); }
    },
    onAction(e) { const m = this.data.main; if (m) this.go(e.currentTarget.dataset.a, m.orderId, m.storeId); },
    onTodo(e) { const t = this.data.todos[Number(e.currentTarget.dataset.i)]; if (t) this.go(t.a, t.orderId, ''); },
    onMore() { wx.switchTab({ url: routes.MINE }); }
  }
});
