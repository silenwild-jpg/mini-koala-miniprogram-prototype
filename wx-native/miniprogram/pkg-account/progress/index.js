// 找仓进度 ACC_PROGRESS（第 4 批，交接 v1.0 §4.7、§3「同一组件同一数据」）。顶部用找仓域的 <mk-need-card />（与首页、「我的」同一张需求卡）。
// 已做：有用仓需求时显示需求卡（按容量 / 按面积两种写法由需求卡自己处理）；没有需求但有订单时显示「最近参考」卡，可「按此需求重新找仓」；
//      都没有时显示空态（估大小算价格 / 找附近门店）；已选仓位但还没有报价时显示「已选仓位」卡；有报价时显示报价方案卡
//      （当前报价 →「去确认订单」，超过 3 小时 → 已过期「重新报价」，D-120）；未登录不显示任何金额；加载 / 失败 / 断网。
// 数据来源：已选仓位读全站状态的 selection 主题 { store_id, store_name, unit_ids[], unit_name, term_months }。金额不在本页算，登录后调 getQuote 取（过期判断用接口返回的 expires_at
//      与 selection.quoted_at 起算的时效中较早的一个）。selection 由确认订单页写入。
// 未做：冻结稿需求卡副文案里的「当前方案有效 / 需重新报价」「租期待确认」（需求卡是找仓域组件，已登记待裁）。
const T = require('../../i18n/lead');
const order = require('../../core/order');
const fmt = require('../../core/format');
const req = require('../../core/requirement');
const state = require('../../services/state');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const api = require('../../services/api');
const pd = require('../../services/page-data');
const G = T.progress;
const money = (n) => '¥' + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
Page(auth.guarded(routes.PROGRESS, {
  data: { T: G, sys: 'loading', hasNeed: false, reference: null, selected: null, quote: null, empty: false, loginVisible: false },
  onLoad() {},
  onShow() { this.load(); const c = this.selectComponent && this.selectComponent('#need'); if (c && c.refresh) c.refresh(); },
  load() {
    const s = state.get(), loggedIn = auth.isLoggedIn(), sel = s.selection && s.selection.unit_ids && s.selection.unit_ids.length ? s.selection : null;
    const jobs = [
      !s.requirement && loggedIn ? api.getOrders() : Promise.resolve([]),
      sel && loggedIn ? api.getQuote({ unit_ids: sel.unit_ids, months: sel.term_months }).catch((e) => (e && e.code === 'NOT_FOUND' ? null : Promise.reject(e))) : Promise.resolve(null)
    ];
    return pd.load(this, Promise.all(jobs), (res) => {
      const hasNeed = !!s.requirement, now = Date.now();
      // 最近参考：没有当前需求时，取最近一笔订单的容量与租期
      const last = (res[0] || []).slice().sort((a, b) => b.created_at - a.created_at)[0];
      let reference = null;
      if (!hasNeed && last) {
        const cap = Number(last.units.reduce((n, u) => n + Number(u.volume || 0), 0).toFixed(2));
        if (cap > 0) reference = { cap, months: last.months, title: req.pretty(cap) + 'm³', sub: s.location.city + ' · ' + fmt.termText(last.months) };
      }
      let selected = null, quote = null;
      if (sel) {
        const line = fmt.termText(sel.term_months) + (sel.unit_name ? ' · ' + sel.unit_name : '');
        const q = res[1];
        if (q) {
          const deadline = sel.quoted_at ? Math.min(order.quoteExpiresAt(sel.quoted_at), q.expires_at) : q.expires_at;
          const valid = !order.isExpired(deadline, now);
          const off = Number(q.coupon_discount) || 0;
          quote = { store: sel.store_name || '', line, valid, tag: valid ? G.quoteValid : G.quoteExpired, rent: money(q.rent_total), coupon: off > 0 ? '−' + money(off) : '', payable: money(q.payable), cta: valid ? G.toConfirm : G.requote };
        } else selected = { store: sel.store_name || '', line };
      }
      this._sel = sel; this._ref = reference;
      this.setData({ hasNeed, reference, selected, quote, empty: !hasNeed && !reference && !selected && !quote });
    });
  },
  onRetry() { this.setData({ sys: 'loading' }); this.load(); },
  onEstimate() { wx.navigateTo({ url: routes.CAPACITY }); },
  onStores() { wx.switchTab({ url: routes.STORES }); },
  onRefind() {
    const r = this._ref; if (!r) return;
    state.setRequirement({ capacity_m3: r.cap, input_unit: 'm3', input_value: r.cap, source: 'manual', term_months: r.months });
    wx.switchTab({ url: routes.STORES });
  },
  onConfirm() { const s = this._sel; if (s) auth.navigate(this, routes.CONFIRM + '?unit=' + s.unit_ids.join(',') + '&term=' + s.term_months); },
  onLoginClose() { this.setData({ loginVisible: false }); },
  onLoginSuccess() { this.load(); }
}));
