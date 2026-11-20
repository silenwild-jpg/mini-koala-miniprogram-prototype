// 仓位推荐 S5（第 1 批）。
// 已做：需求摘要（按原单位：「2㎡ 约4.8m³」）、修改需求弹层、从物品页进入的说明句与长件句、用仓位置行（打开全站同一个面板）、
//       前 2 家推荐（「第一 / 第二推荐」；匹配仓 + 下一档更大的可租仓，差额与理由；组合方案；容量接近方案；已扩大范围）、
//       全城无匹配、30m³ 及以上交顾问、考拉E存卡、顾问卡、「查看更多仓位」、费用明细弹层（登录后点价格打开，金额来自报价接口）、
//       未登录「查看报价」/ 登录后「立即下单」、登录守卫落点（?login=1）、仓位已租出（下单前复查库存，已租出则刷新推荐并提示）、加载骨架与失败 / 断网。
// 未做：冷启动的「填写需求」弹层 —— 没有需求时本页沿用原规则直接带去填容量页（tests/flow.test.js 锁定了这一跳转）。
//       门店卡照片不渲染（没有核验过的门店实拍）。
// 未登录进入本页不自动弹登录层，点「查看报价」才弹（交接 v1.0 §8 第 1 项的建议，张坤尚未单独确认）。
const T = require('../../i18n/find');
const Z = require('../../i18n/zh');
const state = require('../../services/state');
const api = require('../../services/api');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const finder = require('../../services/finder');
const pricing = require('../../core/pricing');
const req = require('../../core/requirement');
const matching = require('../../core/matching');
const pd = require('../../services/page-data');
const share = require('../../services/share');
const M = T.match, F = M.fees;
Page({
  data: {
    T: { m: pd.plain(M), login: Z.login, cta: T.cta, month: T.unit.month },
    sys: 'loading', has: false, capNum: '', capUnit: '', capApprox: '', term: null, hint: '', locText: '', estText: '', longText: '',
    mode: '', title: '', sub: '', cards: [], total: 0, advisor: null, noneSub: '', goneTip: false,
    fees: null, feesVisible: false, loginVisible: false, loginTip: '', panel: false, demandSheet: false
  },
  onLoad(q) { this._openLogin = !!(q && q.login === '1'); },
  onShow() {
    if (!state.get().requirement) { wx.redirectTo({ url: routes.CAPACITY }); return; } // 没有需求先去填
    this.refresh();
    const pending = auth.consumePending(this, 'match');
    if (pending || (this._openLogin && !auth.isLoggedIn())) { this._openLogin = false; this.setData({ loginVisible: true, loginTip: Z.login.gateTip }); }
  },
  refresh() {
    const s = state.get(), r = s.requirement, loc = s.location;
    if (!r) return Promise.resolve(); // 需求被清空：onShow 会带去填容量页
    const m2 = r.input_unit === 'm2' && Number(r.input_value) > 0, est = r.source === 'items' && r.est ? r.est : null;
    this.setData({
      has: true, capNum: req.pretty(m2 ? r.input_value : r.capacity_m3), capUnit: m2 ? T.unit.m2 : T.unit.m3, capApprox: m2 ? M.approx(req.pretty(r.capacity_m3)) : '',
      term: r.term_months, locText: loc.city + ' · ' + (loc.label || T.panel.allCity),
      estText: est ? (est.tiny ? M.fromItemsTiny(est.netText) : M.fromItems(est.netText, req.pretty(r.capacity_m3))) : '',
      longText: est && est.long && est.long.length ? M.longNote(est.long.join('、')) : ''
    });
    return pd.load(this, pd.cityStores(), (stores) => {
      this._stores = stores;
      const res = finder.buildMatch(stores, pd.ctx());
      // 引导句（一处只出一句）：以第一推荐的方案为基准
      const first = res.cards[0];
      let hint = '';
      if (first) {
        const st = stores.find((x) => x.id === first.id), ids = first.lines[0].id.split(',');
        const us = ids.map((id) => st.units.find((u) => u.id === id)).filter(Boolean);
        const base = us.reduce((n, u) => n + Number(u.base_month), 0);
        hint = us.length ? pricing.nudge(r.term_months, { km: first.km, baseMonth: us.some(pricing.isSpecial) ? 0 : base, rentAt: pd.ctx().loggedIn ? (m) => pricing.quote(us, m).rent_total : null }) : '';
      }
      this.setData({
        mode: res.mode, cards: res.cards, total: res.total, advisor: res.advisor, hint, sub: res.sub,
        title: res.cards.length ? M.recommendN(res.cards.length) : '', noneSub: M.noneSub(req.pretty(r.capacity_m3))
      });
    });
  },
  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },
  onShareAppMessage() { return share.message(routes.MATCH); }, // 对方打开时没有需求，会先被带去填容量
  onTerm(e) { state.setTerm(e.detail.months); this.refresh(); },
  onModify() { const r = state.get().requirement; wx.navigateTo({ url: r && r.source === 'items' ? routes.ITEMS : routes.CAPACITY }); },
  onDemandClose() { this.setData({ demandSheet: false }); },
  onDemandChange() { this.setData({ goneTip: false }); this.refresh(); },
  onDemandSales(e) { wx.navigateTo({ url: routes.BOOKING + '?mode=advisor&cap=' + ((e.detail && e.detail.capacity_m3) || '') }); },
  onLocation() { this.setData({ panel: true }); },
  onPanelClose() { this.setData({ panel: false }); },
  onLocationChange() { this.refresh(); },
  onStore(e) { wx.navigateTo({ url: routes.STORE_DETAIL + '?id=' + e.detail.id }); },
  onAction(e) {
    const d = e.detail || {};
    if (d.cta !== T.cta.order) { this.setData({ loginTip: '请登录' }); auth.openLogin(this); return; } // 未登录「查看报价」
    const url = routes.CONFIRM + '?unit=' + d.unitId + '&term=' + this.data.term;
    if (!auth.isLoggedIn()) { auth.navigate(this, url); return; } // 未登录点「立即下单」：在当前页打开登录层（D-198）
    auth.navigate(this, url);
    // 仓位已租出：进入确认订单的同时复查库存，已租出则回来时本页已刷新并提示
    api.getStore({ id: d.storeId }).then((store) => {
      const gone = String(d.unitId).split(',').some((id) => !matching.isAvailable(store.units.find((u) => u.id === id)));
      if (gone) { this.setData({ goneTip: true }); this.refresh(); }
    }).catch(() => {});
  },
  // 费用明细：登录后点仓位行的价格打开；金额取报价接口，不在页面里重算
  onFees(e) {
    const d = e.detail || {};
    const ids = String(d.unitId || '').split(','), months = this.data.term;
    if (!auth.isLoggedIn() || !d.unitId || !pricing.isTerm(months)) return;
    api.getQuote({ unit_ids: ids, months }).then((q) => {
      const y = pricing.yuan, base = q.unit_pricing.reduce((n, x) => n + Number(x.base_month || 0), 0);
      const rows = [{ k: F.rent, sub: months + T.unit.month + (q.special ? ' · ' + T.price.special : q.term_factor ? ' · ' + pricing.factorLabel(q.term_factor) : ''), v: y(q.rent_total), note: F.formula(y(q.monthly_average), months) }];
      if (q.term_discount_total > 0 && !q.special) rows.push({ k: F.saved, sub: F.savedSub(y(base)), v: y(q.term_discount_total), note: '' });
      if (q.full_reduction > 0) rows.push({ k: F.full, sub: F.fullSub(y(q.full_min)), v: '−' + y(q.full_reduction), note: F.afterFull(y(q.rent_after_discount)) });
      rows.push({ k: F.coupon, sub: '', v: q.coupon_discount > 0 ? '−' + y(q.coupon_discount) : F.couponNone, note: '', muted: !(q.coupon_discount > 0) });
      rows.push({ k: F.deposit, sub: ids.length > 1 ? F.depositSubCombo : F.depositSub, v: y(q.deposit), note: '' });
      rows.push({ k: F.fee, sub: '', v: y(q.management_fee), note: '' });
      this.setData({ fees: { rows, payable: y(q.payable) }, feesVisible: true });
    }).catch((err) => {
      if (err && err.code === 'NOT_FOUND') { this.setData({ goneTip: true }); this.refresh(); return; } // 仓位已租出
      pd.toast(F.failed);
    });
  },
  onFeesClose() { this.setData({ feesVisible: false }); },
  onMoreStores() { wx.switchTab({ url: routes.STORES }); },
  onAdvisorLead() { wx.navigateTo({ url: routes.BOOKING + '?mode=advisor' }); },
  onLoginClose() { this.setData({ loginVisible: false }); },
  onLoginSuccess() { this.refresh(); } // 登录成功停在本页，显示整期价
});
