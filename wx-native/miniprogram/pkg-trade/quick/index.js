// 快捷下单 QUICK（第 2 批）。不是受限页，未登录可打开；?store=门店 带入门店（任务卡「加租仓位」另带 &carried=1）、?unit=仓位 带入仓位。
// 已做（18 态）：步骤条、选择门店（用仓位置行与全站共用同一个面板、更换门店抽屉、带入在租门店的提示）、选择仓位（抽屉、未选门店时提示）、
//   租期（统一组件，默认 12 个月，「其他」弹层在组件内）、预计用仓时间、预计整期租金卡与费用明细弹层、底栏「还需 X」与主按钮禁用、
//   未登录只显示「/月起」且主按钮为「查看报价」（打开登录层，登录后停在本页显示金额）、所选仓位已不可租、加载 / 失败 / 断网。
// 未做：组合仓方案行（演示数据没有组合方案）；门店与仓位照片（用图标占位）。
// 本页不改全站那份用仓需求；门店、仓位、租期、日期通过参数带给确认订单页。未登录不计算整期金额。
const TT = require('../../i18n/trade');
const C = require('../../core/config');
const CT = require('../../core/config-trade');
const api = require('../../services/api');
const state = require('../../services/state');
const auth = require('../../services/auth');
const routes = require('../../services/routes');
const pd = require('../../services/page-data');
const view = require('../../services/order-view');
const actions = require('../../services/order-actions');
const pricing = require('../../core/pricing');
const fmt = require('../../core/format');
const T = TT.quick, T_SEP = TT.common.sep;
const inf = (v) => (v === null || v === undefined ? Infinity : v);
Page({
  data: {
    T, TC: TT.common, sys: 'loading', locText: '', carried: false,
    store: null, storeHint: '', unit: null, unitHint: '', fromText: '', gone: false,
    term: C.requirement.termDefault, hint: '', startDate: '', startMin: '', startMax: '',
    est: null, access: '', draft: null,
    barLabel: T.need, barAmount: '', barMuted: true, barNeed: '', btnText: T.next, btnDisabled: true,
    storeSheet: false, storeRows: [], unitSheet: false, unitRows: [], feeSheet: false,
    loginTip: '请登录', loginVisible: false, panel: false
  },
  onLoad(q) {
    q = q || {}; this._openLogin = q.login === '1';
    state.patch('flags', { orderSource: 'quick' });
    this._storeId = q.store || ''; this._unitId = q.unit || ''; this._carried = q.carried === '1';
    const r = state.get().requirement, now = Date.now();
    this.setData({ term: r && pricing.isTerm(r.term_months) ? r.term_months : C.requirement.termDefault, startMin: view.ymd(now + CT.startDate.minDays * view.DAY), startMax: view.ymd(now + CT.startDate.maxDays * view.DAY) });
  },
  onShow() { this.refresh(); if (auth.consumePending(this, 'quick') || (this._openLogin && !auth.isLoggedIn())) { this._openLogin = false; auth.openLogin(this); } },
  refresh() { return pd.load(this, pd.cityStores(), (stores) => { this._stores = stores; this.apply(); }); },
  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },
  current() {
    const stores = this._stores || [];
    const st = stores.find((s) => s.id === this._storeId) || null;
    const u = st ? (st.units || []).find((x) => x.id === this._unitId) || null : null;
    return { stores, st, u };
  },
  // 把当前选择变成页面数据；选了仓位就去接口核对是否可租（已登录时带回报价）
  apply() {
    const { stores, st, u } = this.current(), loc = state.get().location, d = this.data;
    if (!st) { this._storeId = ''; this._unitId = ''; } else if (!u) this._unitId = '';
    const km = view.kmOf(st, loc);
    const base = {
      locText: loc.city + T_SEP + (loc.label || T.allCity), carried: !!(this._carried && st),
      store: st ? { id: st.id, name: st.name, sub: (km !== null ? fmt.kmText(km) + T_SEP : '') + st.address } : null,
      storeHint: stores.length ? T.storeAddrHint : T.noStore,
      unit: u ? view.unitLines({ units: [u] }) : null, unitHint: st ? T.unitHint : T.unitNeedStore,
      fromText: u ? pricing.yuan(pricing.unitFromMonthly(u)) : '', access: st && st.access_hours ? T.access + st.access_hours : '',
      hint: pricing.termHint(d.term), est: null, draft: null, gone: false
    };
    this.setData(base); this.bar();
    if (!u) return Promise.resolve();
    const token = this._token = (this._token || 0) + 1, months = d.term;
    return api.getOrderDraft({ unit_ids: [u.id], months }).then((r) => {
      if (token !== this._token) return; // 期间又改了选择：丢弃旧结果
      if (!r.available) { this.setData({ gone: true, est: null, draft: null }); this.bar(); return; }
      if (r.quote) {
        const q = r.quote, free = pricing.freeTransportFor(km, months, q.special);
        this.setData({
          est: { label: T.estimate, term: '/ ' + fmt.termText(months), amount: pricing.yuan(q.rent_total), tag: q.special ? TT.fee.special : pricing.factorLabel(Number(q.term_factor) || 1), sub: pricing.yuan(q.monthly_average) + TT.common.perMonth + ' × ' + fmt.termText(months) },
          draft: { months, quote: q, free_transport: free },
          hint: pricing.nudge(months, { km, baseMonth: u.base_month, rentAt: (m) => pricing.quote([u], m).rent_total })
        });
      }
      this.bar();
    }).catch(() => { if (token === this._token) this.bar(); }); // 核对失败不拦页面；下一步进确认订单时还会再核对
  },
  bar() {
    const d = this.data, loggedIn = auth.isLoggedIn();
    const miss = !d.store ? T.missStore : !d.unit ? T.missUnit : d.gone ? T.missSwap : !d.startDate ? T.missDate : '';
    const quote = !miss && !loggedIn; // 未登录且已选齐：主按钮是「查看报价」，点击打开登录层
    this.setData({
      barLabel: d.est ? T.estimate : T.need, barAmount: d.est ? d.est.amount : miss, barMuted: !d.est, barNeed: d.est && miss ? T.need + miss : '',
      btnText: quote ? T.quote : T.next, btnDisabled: !!miss
    });
  },
  onLocation() { this.setData({ panel: true }); },
  onPanelClose() { this.setData({ panel: false }); },
  onLocationChange() { this.refresh(); },
  onStoreSheet() {
    const { stores } = this.current(), loc = state.get().location;
    const rows = stores.slice().sort((a, b) => inf(view.kmOf(a, loc)) - inf(view.kmOf(b, loc))).slice(0, CT.quickStoreSheetMax).map((s) => {
      const av = (s.units || []).filter((u) => u.status === 'available'), km = view.kmOf(s, loc), from = pricing.storeFromCubic(av);
      return { id: s.id, name: s.name, sub: [km !== null ? fmt.kmText(km) : '', s.access_hours ? T.accessShort + s.access_hours : '', av.length ? T.stockN[0] + av.length + T.stockN[1] : T.stockNone].filter(Boolean).join(T_SEP), price: from === null ? '' : pricing.yuan(from), on: s.id === this._storeId };
    });
    this.setData({ storeRows: rows, storeSheet: true });
  },
  onStoreSheetClose() { this.setData({ storeSheet: false }); },
  onPickStore(e) {
    const id = e.currentTarget.dataset.id;
    if (id !== this._storeId) { this._storeId = id; this._unitId = ''; this._carried = false; }
    this.setData({ storeSheet: false }); this.apply();
  },
  onStoreDetail() { if (this._storeId) wx.navigateTo({ url: routes.STORE_DETAIL + '?id=' + this._storeId }); },
  onUnitSheet() {
    const { st } = this.current();
    if (!st) { actions.toast(T.unitNeedStore); return; }
    const rows = (st.units || []).filter((u) => u.status === 'available').map((u) => ({ id: u.id, name: fmt.unitName(u), tier: fmt.tierLabel(u), sub: fmt.dimsText(u), price: pricing.yuan(pricing.unitFromMonthly(u)), on: u.id === this._unitId }));
    this.setData({ unitRows: rows, unitSheet: true });
  },
  onUnitSheetClose() { this.setData({ unitSheet: false }); },
  onPickUnit(e) { this._unitId = e.currentTarget.dataset.id; this.setData({ unitSheet: false }); this.apply(); },
  onTerm(e) { const m = e && e.detail ? e.detail.months : null; if (!pricing.isTerm(m)) return; this.setData({ term: m }); this.apply(); },
  onDate(e) { const v = e && e.detail ? String(e.detail.value || '') : ''; if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return; this.setData({ startDate: v }); this.bar(); },
  onFees() { if (this.data.draft) this.setData({ feeSheet: true }); },
  onFeesClose() { this.setData({ feeSheet: false }); },
  onNext() {
    const d = this.data;
    if (d.btnDisabled) return;
    if (!auth.isLoggedIn()) { auth.openLogin(this); return; } // 查看报价：登录后停在本页显示金额
    auth.navigate(this, routes.CONFIRM + '?unit=' + this._unitId + '&term=' + d.term + '&date=' + d.startDate);
  },
  onLoginClose() { this.setData({ loginVisible: false }); },
  onLoginSuccess() { this.apply(); }
});
