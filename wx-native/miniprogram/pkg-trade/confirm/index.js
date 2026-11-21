// 确认订单 O01（第 2 批，含实名、签署、支付弹层）。受限页（D-198）：未登录直达会被带回落点页并打开登录层。
// 入口：?unit=仓位[,仓位]&term=月数[&date=YYYY-MM-DD] 新下单；?order=订单号 回到该订单的待支付 / 支付失败 / 已超时 / 已取消态（同一订单号）。
// 流程顺序（D-148）：登录 → 实名认证 → 勾选确认告知书并承诺不存违禁物品 → 签署使用协议 → 生成电子合同 → 支付。
// 已做（35 态里 34 个）：订单摘要卡（租期步进、预计用仓时间、更换）、费用明细（已省、满额减、优惠券、免费运输行 D-173、预付说明）、下一档 / 满额 / 免费运输引导句、
//   联系方式、实名信息卡与实名弹层（未填 / 已填 / 信息不一致 / 认证中）、告知书勾选、签署弹层、「正在生成电子合同…」、支付弹层、等待支付结果、
//   订单待支付（剩余时间）、支付未成功与继续支付前四项核对（D-42）、取消订单确认、已超时 / 已取消（原订单仓位 + 其他可租门店）、
//   报价超过 3 小时（只刷新报价，不触发登录）、变价确认、所选仓位已不可租、物品保障说明弹层、预约运输 / 搬运入口、优惠券弹层、费用明细弹层、
//   未选仓位空态、未登录态（费用行「登录后显示」，主按钮「查看报价」）、加载 / 失败 / 断网。
// 未做：w7__expired__alternatives 的「其他可租门店」底部抽屉（§4.6-10：过期订单不自动弹替代门店抽屉），改为页内列表 +「预约顾问」按钮；门店与仓位照片用图标占位。
// 两个计时互相独立：报价 3 小时（自报价生成）只影响下单前；待支付 3 小时（自下单）在订单生成后计时，支付失败不重新计时。
// 支付是演示：不调 wx.requestPayment。不出现在界面上的演示参数：&demo=pay_fail（首次支付失败）、&demo=price_changed（下单时变价）、
//   &demo=coupon（发一张演示券）、&demo=idv_mismatch（实名信息不一致）。
// FIX-01：到期日含当天、预计用仓时间即起租日与计费起点（R-04，签署弹层写明）；支付未成功显示原因（R-07）；「更换仓位」确认后自动取消原订单（R-05）；
//   从协议 / 运输 / 个人信息页返回不重取报价（B-14）；下单与签署一次提交（B-16）；报价过期时明细同步换占位（B-07）；仓位被本人待支付订单占用时指向那笔订单（B-06）。
const TT = require('../../i18n/trade');
const api = require('../../services/api');
const state = require('../../services/state');
const auth = require('../../services/auth');
const routes = require('../../services/routes');
const pd = require('../../services/page-data');
const identity = require('../../services/identity');
const view = require('../../services/order-view');
const actions = require('../../services/order-actions');
const subscribe = require('../../services/subscribe');
const order = require('../../core/order');
const model = require('../../core/order-model');
const pricing = require('../../core/pricing');
const fmt = require('../../core/format');
const C = require('../../core/config');
const CT = require('../../core/config-trade');
const motion = require('../../core/motion');
const T = TT.confirm, F = TT.fee;
const yuan = pricing.yuan;
const BAR0 = { label: T.payable, saved: '', amount: '', muted: false, btn: '', action: '', disabled: false, hint: '', showAgree: false, solo: false };
const sumBase = (q) => (q.unit_pricing || []).reduce((n, x) => n + Number(x.base_month || 0), 0);
Page(auth.guarded(routes.CONFIRM, {
  data: {
    T, TC: TT.common, TO: { emptyTitle: TT.order.emptyTitle, backOrders: TT.order.backOrders }, docNotice: TT.docName.notice, docUsage: TT.docName.usage, feesTitle: TT.fee.title,
    emptyKind: '', held: '', couponText: '', idvNameError: '', // emptyKind: ''（没带仓位）| order（订单查不到）；held: 占着所选仓位的本人待支付订单号
    sys: 'loading', mode: 'compose', phase: '', // mode: empty | compose | order；phase: pending | payment_failed | expired | cancelled
    loggedIn: true, cardOrder: null, editable: false, swapText: '', hint: '', dead: false, locked: false,
    gone: false, quoteExpired: false, feePlaceholder: '', feeTotalPlaceholder: '', feeNote: '', couponEditable: false,
    contactText: '', phoneText: '', amtBump: '', headFx: '', idv: { verified: false, text: '' },
    agreed: false, submitting: false,
    head: null, headSubs: [], clock: '', recheck: null, alts: [], cancelable: false,
    bar: BAR0, showBar: false,
    sheet: '', // idv | sign | fees | pay | protect | coupon
    idvName: '', idvNo: '', idvError: '', idvChecking: false, idvReady: false,
    signRows: [], payText: '', couponRows: [], couponChoice: 'auto',
    price: null, paying: false, priceDlg: null, priceDlgLeave: '', payingDlg: false, payingDlgLeave: '', loginVisible: false, loginTip: ''
  },
  onLoad(q) {
    q = q || {};
    this._unitIds = String(q.unit || '').split(',').filter(Boolean);
    this._months = Number(q.term) || C.requirement.termDefault;
    if (!pricing.isTerm(this._months)) this._months = C.requirement.termDefault;
    // 预计用仓时间：链接带入的日期要落在选择器同一范围内（config-trade.startDate），范围外或格式不对一律按最早可选日
    const dMin = view.ymd(Date.now() + CT.startDate.minDays * view.DAY), dMax = view.ymd(Date.now() + CT.startDate.maxDays * view.DAY);
    this._date = /^\d{4}-\d{2}-\d{2}$/.test(String(q.date || '')) && q.date >= dMin && q.date <= dMax ? q.date : dMin;
    this._orderId = q.order || '';
    this._demo = q.demo || ''; this._coupon = 'auto'; this._quote = null; this._priceReason = '';
  },
  onShow() {
    if (!auth.enter(routes.CONFIRM)) { this.stop(); this.setData({ sys: 'loading', showBar: false, cardOrder: null }); return; }
    // 已有报价时（从协议页、运输页、个人信息页返回）不重取报价，3 小时计时不重置，签署弹层里的金额与提交用的是同一份（B-14）；只同步联系方式与实名
    if (this._quote && this.data.mode === 'compose' && !this.data.sys && this.data.cardOrder && !this._orderId) this.softRefresh(); else this.refresh();
    if (!this._t) this._t = actions.every(() => this.tick(), 1000);
  },
  softRefresh() {
    if (this.data.mode !== 'compose' || !auth.isLoggedIn()) return Promise.resolve();
    return api.getIdentity().catch(() => null).then((res) => {
      if (res) identity.save(res);
      const idv = identity.get();
      this.setData({ contactText: T.contactPhone + state.get().session.phoneMasked, phoneText: state.get().session.phoneMasked, idv: { verified: idv.verified, text: idv.text } });
      if (this.data.sheet === 'sign') this.setData(idv.verified ? { signRows: this.signRows() } : { sheet: '' });
      this.syncBar();
    });
  },
  onHide() { this.stop(); },
  // IMPL-02：两个居中对话框（变价确认、等待支付结果）的显示跟着 price / paying 走，关闭时先播退场再移除。
  // price / paying 仍是即时的逻辑状态（底栏、防重复点按都读它们），priceDlg / payingDlg 只管界面上那一层。
  dlgSync() {
    const d = this.data;
    if (d.price) { motion.cancelLeave(this, 'priceDlg'); if (d.priceDlg !== d.price) this.setData({ priceDlg: d.price }); }
    else if (d.priceDlg) motion.leave(this, 'priceDlg', null);
    if (d.paying) { motion.cancelLeave(this, 'payingDlg'); if (!d.payingDlg) this.setData({ payingDlg: true }); }
    else if (d.payingDlg) motion.leave(this, 'payingDlg');
  },
  onUnload() { this.stop(); this._tk = (this._tk || 0) + 1; motion.dispose(this); },
  stop() { if (this._t) { clearInterval(this._t); this._t = null; } },
  refresh() {
    if (this._orderId) return this.loadOrder();
    if (!this._unitIds || !this._unitIds.length) { this.setData({ sys: '', mode: 'empty', emptyKind: '', showBar: false }); return Promise.resolve(); }
    return this.loadDraft(false);
  },
  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },

  /* ---------- 下单前 ---------- */
  loadDraft(requote) {
    const loggedIn = auth.isLoggedIn();
    const p = { unit_ids: this._unitIds, months: this._months, coupon: this._coupon };
    if (this._demo === 'coupon') p.simulate = 'coupon';
    const req = Promise.all([requote && loggedIn ? api.refreshQuote(p) : api.getOrderDraft(p), loggedIn ? api.getIdentity().catch(() => null) : Promise.resolve(null)]);
    const tk = this._tk = (this._tk || 0) + 1; // 快速连改租期 / 换券时只用最后一次的报价；离开页面后在路上的结果丢弃（IMPL-01）
    return pd.load(this, req, (res) => { if (res[1]) identity.save(res[1]); if (tk !== this._tk) return; this.applyDraft(res[0]); });
  },
  applyDraft(r) {
    if (!auth.isLoggedIn() || !r || !r.store || !r.units) return;
    const loggedIn = auth.isLoggedIn(), s = state.get(), months = r.months, q = r.quote;
    const km = view.kmOf(r.store, s.location);
    this._km = km; this._store = r.store; this._units = r.units;
    this._quote = q ? { quoted_at: r.quoted_at, expires_at: r.expires_at, quote: q } : null;
    // 已选仓位（找仓进度、需求卡读同一份）：进入确认订单即记下，下单成功后清掉
    state.set('selection', { store_id: r.store.id, store_name: r.store.name, unit_ids: r.units.map((u) => u.id), unit_name: r.units.length > 1 ? fmt.comboName(r.units) : fmt.unitName(r.units[0]), term_months: months, quoted_at: r.quoted_at || 0 });
    const draft = { store: r.store, units: r.units, months, lease: { start: view.parseYmd(this._date) }, quote: q, free_transport: q ? pricing.freeTransportFor(km, months, q.special) : false, coupon_name: r.coupon_name || '' };
    let hint = '';
    // 满额减引导句只在这笔订单参与满额减时出（单个特价仓不参与；组合里含特价仓时整单参与，R-12）
    if (q) hint = pricing.nudge(months, { km: q.special ? null : km, baseMonth: sumBase(q), rentAt: pricing.fullEligible(r.units) ? (m) => pricing.quote(r.units, m).rent_total : null, couponOff: q.coupon_discount });
    const cur = q && q.coupon_id ? q.coupon_id : '';
    // 券行与券弹层（B-03 / B-12）：不可用的券写明差什么；没用券时分开写「有 N 张可用」「满 N 个月可用」
    const cs = r.coupons || [], usable = cs.filter((c) => c.eligible), needM = cs.filter((c) => c.reason === 'months').map((c) => c.min_months);
    const why = (c) => (c.eligible ? '' : c.reason === 'special' ? F.couponSpecial : c.reason === 'months' ? F.couponNeedMonths[0] + c.min_months + F.couponNeedMonths[1] : T.couponNotFit);
    let couponText = '';
    if (q && !q.coupon_id && !q.coupon_skipped && !q.special) couponText = usable.length ? F.couponAvail[0] + usable.length + F.couponAvail[1] : needM.length ? F.couponNeedMonths[0] + Math.min.apply(null, needM) + F.couponNeedMonths[1] : '';
    const idv = identity.get();
    this.setData({
      mode: 'compose', loggedIn, cardOrder: draft, editable: true, swapText: T.swap, hint, dead: false, locked: false,
      gone: !r.available, held: r.available ? '' : r.held_order_id || '', quoteExpired: false, couponText,
      feePlaceholder: !q ? TT.fee.requote : '', feeTotalPlaceholder: '', feeNote: q ? T.prepayNote : '', couponEditable: !!q,
      contactText: T.contactPhone + s.session.phoneMasked, phoneText: s.session.phoneMasked, idv: { verified: idv.verified, text: idv.text },
      head: null, headSubs: [], clock: '', recheck: null, alts: [], cancelable: false, submitting: false,
      couponRows: [{ id: 'auto', name: T.couponAuto, sub: '', amount: '', off: false }, { id: 'none', name: T.couponNoUse, sub: '', amount: '', off: false }]
        .concat((r.coupons || []).map((c) => ({ id: c.id, name: c.name, sub: why(c), amount: '−' + yuan(c.amount), off: !c.eligible, cur: c.id === cur }))),
      couponChoice: this._coupon
    });
    this.syncBar();
  },
  // 底栏：主按钮按「缺哪一步」变化；金额未显示或变价待确认时不出现「已省」（D-164）
  syncBar() {
    const d = this.data, b = Object.assign({}, BAR0), o = d.cardOrder, q = o && o.quote;
    const saved = q && q.saved > 0 ? T.savedPrefix + yuan(q.saved) : '';
    if (d.mode === 'order') {
      const p = d.phase;
      if (d.dead) Object.assign(b, { solo: true, btn: T.btnRestart, action: 'restart' });
      else if (p === 'pending') Object.assign(b, { amount: yuan(q.payable), saved, btn: d.paying ? T.btnPaying : T.btnPay, action: 'pay', disabled: !!d.paying });
      else Object.assign(b, { amount: yuan(q.payable), saved, btn: T.btnPay, action: 'resume', disabled: !!(d.recheck && !d.recheck.unitOk), hint: d.recheck && !d.recheck.unitOk ? T.hintUnitSold : '' });
    }
    else if (d.held) Object.assign(b, { solo: true, btn: T.btnPay, action: 'held' }); // 仓位被本人的待支付订单占着：直接去那笔订单（B-06）
    else if (d.gone) Object.assign(b, { amount: q ? yuan(q.payable) : T.unavailable, muted: true, btn: T.goneBtn, action: 'swap' }); // 主按钮可点，回门店详情重选；金额置灰（B-11）
    else if (d.quoteExpired) Object.assign(b, { amount: T.refreshToShow, muted: true, btn: T.refreshQuote, action: 'refresh' });
    else if (d.price) Object.assign(b, { amount: T.quotePending, muted: true, btn: T.btnConfirm, disabled: true, hint: T.hintPrice });
    else if (!q) Object.assign(b, { amount: T.unavailable, muted: true, btn: T.refreshQuote, action: 'refresh' });
    else if (!d.idv.verified) Object.assign(b, { amount: yuan(q.payable), saved, btn: T.btnIdentity, action: 'idv', hint: T.hintIdentity });
    else if (d.submitting) Object.assign(b, { amount: yuan(q.payable), saved, btn: T.btnSubmitting, disabled: true, showAgree: true });
    else Object.assign(b, { amount: yuan(q.payable), saved, btn: T.btnSign, action: 'sign', disabled: !d.agreed, hint: d.agreed ? '' : T.hintAgree, showAgree: true });
    const prev = d.bar && !d.bar.muted ? d.bar.amount : '';
    this.setData({ bar: b, showBar: d.mode !== 'empty' });
    if (prev && !b.muted && b.amount && prev !== b.amount) motion.bump(this, 'amtBump'); // 底栏金额变了（改租期、换券）轻微回弹；首次出现与占位文字不动
  },
  // 每秒一次：报价是否超过 3 小时；待支付 / 支付失败的剩余时间。两者互不影响
  tick() {
    const d = this.data, now = Date.now();
    if (d.mode === 'compose' && this._quote && !d.quoteExpired && order.isExpired(this._quote.expires_at, now)) this.expireQuote();
    if (d.mode === 'order' && d.cancelable && d.cardOrder) {
      const exp = d.cardOrder.pay.expires_at;
      if (order.isExpired(exp, now)) { this.setData({ cancelable: false, sheet: '', paying: false }); this.dlgSync(); this.loadOrder(); return; }
      this.setData({ clock: view.countdown(exp, now) });
    }
  },
  // 报价过期：底栏与费用明细一起换成「刷新后显示」，不能再打开旧报价的明细、券、签署弹层（B-07）
  expireQuote() {
    if (this.data.mode !== 'compose') return;
    const sh = this.data.sheet;
    this.setData({ quoteExpired: true, feePlaceholder: F.refreshToShow, couponEditable: false, sheet: sh === 'sign' || sh === 'fees' || sh === 'coupon' ? '' : sh });
    this.syncBar();
  },
  onBar() {
    const b = this.data.bar;
    if (b.disabled || !b.action) return;
    const fn = { login: this.onLogin, refresh: this.onRefreshQuote, idv: this.onIdv, sign: this.onSign, pay: this.onPay, resume: this.onResume, restart: this.onRestart, swap: this.onSwap, held: this.onHeld }[b.action];
    if (fn) fn.call(this);
  },
  onLogin() { this.setData({ loginTip: '' }); auth.openLogin(this); },
  onLoginClose() { this.setData({ loginVisible: false }); },
  onLoginSuccess() { this.refresh(); },
  onRefreshQuote() { if (this._orderId) return; this.loadDraft(true); },
  onTerm(e) { const m = e && e.detail ? e.detail.months : null; if (!pricing.isTerm(m) || this.data.locked || this._orderId) return; this._months = m; this.loadDraft(false); },
  onDate(e) {
    const v = e && e.detail ? String(e.detail.value || '') : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || this.data.locked || !this.data.cardOrder) return;
    if (v < view.ymd(Date.now() + CT.startDate.minDays * view.DAY) || v > view.ymd(Date.now() + CT.startDate.maxDays * view.DAY)) return;
    this._date = v;
    this.setData({ cardOrder: Object.assign({}, this.data.cardOrder, { lease: { start: view.parseYmd(v) } }) });
  },
  // 更换（下单前）：回原门店的门店详情。
  // 更换仓位（支付失败，R-05）：先确认，确认后自动取消原订单并释放仓位，再去门店详情
  onSwap() {
    const d = this.data, o = d.cardOrder;
    if (!o || !o.store) return;
    const go = () => wx.navigateTo({ url: routes.STORE_DETAIL + '?id=' + o.store.id });
    if (d.mode !== 'order' || d.phase !== 'payment_failed') return go();
    if (this._busy || !this._orderId) return;
    wx.showModal({
      title: T.swapTitle, content: T.swapDesc, cancelText: T.swapKeep, confirmText: T.swapYes,
      success: (res) => {
        if (!res.confirm) return;
        this._busy = true;
        api.cancelOrder({ order_id: this._orderId }).then((od) => { this._busy = false; this.setData({ recheck: null, sheet: '', price: null }); this.dlgSync(); this.applyOrder(od); go(); })
          .catch((err) => { this._busy = false; actions.toast((err && err.message) || T.toastFail); this.loadOrder(); });
      },
      fail() {}
    });
  },
  onHeld() { if (this.data.held) wx.redirectTo({ url: routes.CONFIRM + '?order=' + this.data.held }); },
  onContact() { if (!auth.isLoggedIn()) return this.onLogin(); wx.navigateTo({ url: routes.PROFILE }); },
  onProtect() { this.setData({ sheet: 'protect' }); },
  onTransport() { wx.navigateTo({ url: routes.TRANSPORT }); },
  onService() { actions.callService(); },
  onSheetClose() { if (this.data.idvChecking) return; this.setData({ sheet: '' }); },
  onFees() { const o = this.data.cardOrder; if (o && o.quote && !this.data.feePlaceholder) this.setData({ sheet: 'fees' }); },
  onAgree() { if (this.data.submitting) return; this.setData({ agreed: !this.data.agreed }); this.syncBar(); },
  onNotice() { wx.navigateTo({ url: routes.AGREEMENT + '?doc=notice' }); },
  onProhibited() { wx.navigateTo({ url: routes.AGREEMENT + '?doc=usage&anchor=att2' }); },
  onUsage() { wx.navigateTo({ url: routes.AGREEMENT + '?doc=usage' }); },

  /* ---------- 优惠券 ---------- */
  onCoupon() { if (this.data.couponEditable && !this.data.locked) this.setData({ sheet: 'coupon', couponChoice: this._coupon }); },
  onPickCoupon(e) { const row = this.data.couponRows[Number(e.currentTarget.dataset.i)]; if (row && !row.off) this.setData({ couponChoice: row.id }); },
  onCouponConfirm() { this._coupon = this.data.couponChoice || 'auto'; this.setData({ sheet: '' }); if (!this._orderId) this.loadDraft(false); },

  /* ---------- 实名认证（只支持身份证） ---------- */
  onIdv() { if (!auth.isLoggedIn()) return this.onLogin(); this.setData({ sheet: 'idv', idvError: '', idvNameError: '' }); },
  idvSync(part) { const d = Object.assign({ idvName: this.data.idvName, idvNo: this.data.idvNo }, part); d.idvError = ''; d.idvNameError = ''; d.idvReady = String(d.idvName).trim().length >= CT.identity.nameMin && String(d.idvNo).trim().length === CT.identity.idLength; this.setData(d); },
  onIdvName(e) { this.idvSync({ idvName: e.detail.value }); },
  onIdvNo(e) { this.idvSync({ idvNo: e.detail.value }); },
  onIdvSubmit() {
    const d = this.data;
    if (!d.idvReady || d.idvChecking) return;
    this.setData({ idvChecking: true, idvError: '', idvNameError: '' });
    const p = { name: d.idvName, id_no: d.idvNo };
    if (this._demo === 'idv_mismatch') { p.simulate = 'mismatch'; this._demo = ''; }
    api.verifyIdentity(p).then((res) => {
      const idv = identity.save(res);
      this.setData({ idvChecking: false, sheet: '', idv: { verified: idv.verified, text: idv.text }, idvName: '', idvNo: '', idvReady: false });
      this.syncBar();
    }).catch((err) => {
      // 姓名不合格的提示放在姓名输入框下，其余放在身份证号下（B-17）
      const code = err && err.code, onName = code === 'INVALID' && err.data && err.data.field === 'name';
      if (onName) this.setData({ idvChecking: false, idvNameError: TT.idv.nameInvalid });
      else this.setData({ idvChecking: false, idvError: code === 'MISMATCH' ? T.idvMismatch : code === 'INVALID' ? TT.idv.noInvalid : T.idvFail });
    });
  },

  /* ---------- 签署 → 生成电子合同 → 支付 ---------- */
  onSign() {
    const d = this.data, o = d.cardOrder;
    if (!o || !o.quote || !d.agreed || !d.idv.verified || d.submitting) return;
    if (this._quote && order.isExpired(this._quote.expires_at, Date.now())) { this.expireQuote(); return; }
    this.setData({ sheet: 'sign', signRows: this.signRows() });
  },
  // 签署弹层各行：写明预计用仓时间就是起租日、计费起点；到期日含当天（R-04）
  signRows() {
    const d = this.data, o = d.cardOrder;
    if (!o || !o.quote || !o.store || !this._date) return [];
    const end = view.ymd(model.leaseEnd(view.parseYmd(this._date), o.months));
    return [{ k: T.signSigner, v: d.idv.text }, { k: T.signStore, v: o.store.name }, { k: T.signUnit, v: view.unitLines(o).name }, { k: T.signTerm, v: fmt.termText(o.months) },
      { k: T.signStart, v: this._date + T.signStartTail }, { k: T.signEnd, v: end + T.signEndTail }, { k: T.signPayable, v: yuan(o.quote.payable), strong: true }];
  },
  onSignConfirm() {
    const d = this.data, o = d.cardOrder;
    if (!o || !o.quote || d.submitting || !this._quote) return;
    this.setData({ sheet: '', submitting: true }); this.syncBar();
    // 下单与签署一次提交（sign: true，B-16）：签署不成功时不会生成订单，订单列表里不会多出一笔用户没见过的「已取消」
    const p = { unit_ids: this._unitIds, months: this._months, start_date: this._date, quoted_at: this._quote.quoted_at, expect_payable: o.quote.payable, coupon: this._coupon, km: this._km === undefined ? null : this._km, sign: true };
    if (this._priceReason) { p.accept_price_change = true; p.price_change_reason = this._priceReason; }
    if (this._demo === 'price_changed') { p.simulate = 'price_changed'; this._demo = ''; }
    api.createOrder(p).then((od) => {
      this._orderId = od.id;
      state.set('selection', null); state.patch('draft', { items: [] });
      this.setData({ submitting: false, agreed: false });
      this.applyOrder(od);
      this.onPay(); // 电子合同生成后直接进入支付
    }).catch((err) => {
      const code = err && err.code;
      this.setData({ submitting: false });
      if (code === 'NOT_FOUND') this.setData({ gone: true });
      else if (code === 'EXPIRED') { this.expireQuote(); return; }
      else if (code === 'CONFLICT' && err.data && err.data.quote) this.showPrice(o.quote, err.data.quote, 'draft');
      else if (code === 'IDENTITY_REQUIRED') { identity.save(null); this.setData({ idv: { verified: false, text: '' } }); actions.toast(T.hintIdentity); }
      else actions.toast((err && err.message) || T.toastFail);
      this.syncBar();
    });
  },
  // 变价确认：写明原因，列出前后金额；不显示「已省」
  showPrice(oldQ, newQ, from) {
    if (!oldQ || !newQ || !oldQ.unit_pricing || !newQ.unit_pricing) return;
    const bo = sumBase(oldQ), bn = sumBase(newQ);
    const reason = bo !== bn ? T.priceReasonBase[0] + yuan(bo) + T.priceReasonBase[1] + yuan(bn) : (Number(oldQ.coupon_discount) || 0) !== (Number(newQ.coupon_discount) || 0) ? T.priceReasonCoupon : T.priceReasonOther;
    const row = (k, a, b, suffix) => ({ k, old: yuan(a) + (suffix || ''), cur: yuan(b) + (suffix || ''), same: a === b });
    this.setData({ price: { from, reason, rows: [row(T.priceRent, oldQ.rent_total, newQ.rent_total), row(T.priceMonthly, oldQ.monthly_average, newQ.monthly_average, TT.common.perMonth), row(T.priceDeposit, oldQ.deposit, newQ.deposit), row(T.pricePayable, oldQ.payable, newQ.payable)] } }); this.dlgSync();
    this.syncBar();
  },
  onPriceOther() { this.setData({ price: null }); this.dlgSync(); this.syncBar(); this.onSwap(); },
  onPriceAccept() {
    const pr = this.data.price;
    if (!pr) return;
    this._priceReason = pr.reason;
    this.setData({ price: null }); this.dlgSync();
    if (pr.from === 'order') return this.onResume(true);
    this.loadDraft(true); // 确认新报价：按新价重新报价，用户再签署
  },

  /* ---------- 订单已生成：待支付 / 支付失败 / 已超时 / 已取消 ---------- */
  loadOrder() {
    const p = api.getOrder({ id: this._orderId }).catch((err) => (err && err.code === 'NOT_FOUND' ? null : Promise.reject(err)));
    return pd.load(this, p, (od) => {
      if (!od) { this._orderId = ''; this.setData({ mode: 'empty', emptyKind: 'order', showBar: false }); return; } // 订单查不到：用订单那套空态，回订单列表（B-05）
      this.applyOrder(od);
    });
  },
  applyOrder(od) {
    if (!od || !od.id || !od.quote) return;
    const now = Date.now(), p = view.phase(od, now), s = state.get();
    if (view.isPaid(p)) { wx.redirectTo({ url: routes.ORDER_DETAIL + '?id=' + od.id }); return; } // 已支付的订单在订单详情看
    const dead = p === 'expired' || p === 'cancelled', failed = p === 'payment_failed';
    const HEAD = { pending: [T.pendingTitle, T.pendingTag, 'warn', T.pendingNote], payment_failed: [T.failedTitle, T.failedTag, 'err', T.failedNote], expired: [T.expiredTitle, T.expiredTag, 'info', T.expiredNote], cancelled: [T.cancelledTitle, T.cancelledTag, 'info', T.cancelledNote] }[p];
    this._store = od.store; this._quote = null;
    const idv = identity.get();
    // 支付未成功的原因与建议（R-07）：有原因时建议句替代通用说明句
    const why = failed ? TT.payFail[(od.pay && od.pay.fail_reason) || 'unknown'] || TT.payFail.unknown : ['', ''];
    this.setData({
      mode: 'order', phase: p, loggedIn: true, cardOrder: od, editable: false, swapText: failed ? T.swapUnit : '', hint: '', dead, locked: true,
      gone: false, held: '', quoteExpired: false, feePlaceholder: '', feeNote: '', couponEditable: false, couponText: '',
      contactText: T.contactPhone + s.session.phoneMasked, phoneText: s.session.phoneMasked, idv: { verified: idv.verified || od.identity_status === 'verified', text: idv.text || (od.contract && od.contract.signer_masked) || '' },
      head: { title: HEAD[0], tag: HEAD[1], tone: HEAD[2], reason: why[0], note: why[1] || HEAD[3] }, headSubs: [T.orderNo + od.no],
      clock: dead ? '' : view.countdown(od.pay.expires_at, now), cancelable: !dead, recheck: failed ? this.data.recheck : null, alts: dead ? this.data.alts : [],
      payText: T.payWechat + yuan(od.quote.payable), sheet: this.data.sheet === 'pay' && p !== 'pending' ? '' : this.data.sheet
    });
    if (this._fxPhase && this._fxPhase !== p) motion.bump(this, 'headFx', 'mk-fade'); this._fxPhase = p; // 支付中 → 结果态（待支付 / 支付未成功 / 已取消）切换时状态头淡入一次
    this.syncBar();
    if (failed) this.recheck(true);
    if (dead) this.loadAlts(od);
  },
  // 支付失败后的四项核对（D-42）：订单状态、仓位、价格、优惠资格。dry = 只核对，不改订单
  recheck(dry) {
    const p = { order_id: this._orderId, dry_run: !!dry };
    return api.resumeFailedOrder(p).then((r) => { this.applyRecheck(r); return r; }).catch(() => null);
  },
  applyRecheck(r) {
    if (!r || !r.checks || !r.order) return;
    const c = r.checks, od = r.order, code = od.units.map((u) => u.code).join(' + ');
    const row = (k, good, a, b) => ({ k, ok: !!good, v: good ? a : b });
    this.setData({ recheck: { ok: r.ok, unitOk: c.unit, title: r.ok ? T.recheckOk : T.recheckChanged, rows: [row(T.recheckStatus, c.status, T.statusOk, T.statusBad), row(T.recheckUnit + code, c.unit, T.unitOk, T.unitBad), row(T.recheckPrice, c.price, T.priceOk, T.priceBad), row(T.recheckCoupon, c.coupon, T.couponOk, T.couponBad)] } });
    this.syncBar();
  },
  // 继续支付（支付失败）：四项一致 → 订单回到待支付（同一订单号、同一截止时间）并打开支付弹层；有变化 → 先让用户确认
  onResume(accept) {
    if (this._busy || !this._orderId) return;
    this._busy = true;
    const p = { order_id: this._orderId };
    if (accept === true) { p.accept_price_change = true; p.price_change_reason = this._priceReason; }
    api.resumeFailedOrder(p).then((r) => {
      this._busy = false;
      if (r.ok) { this.setData({ recheck: null }); this.applyOrder(r.order); if (view.phase(r.order, Date.now()) === 'pending') this.onPay(); return; }
      if (!r.checks.status) { this.loadOrder(); return; }
      this.applyRecheck(r);
      if (r.checks.unit && r.new_quote) this.showPrice(r.order.quote, r.new_quote, 'order');
    }).catch((err) => { this._busy = false; actions.toast((err && err.message) || T.toastFail); this.loadOrder(); });
  },
  onPay() { const d = this.data; if (d.mode === 'order' && d.phase === 'pending' && !d.paying) this.setData({ sheet: 'pay' }); },
  // 「微信支付 ¥X」：同一次点按里先请求到期提醒订阅（允许或取消都继续），再走演示支付
  onPayConfirm() {
    const d = this.data;
    if (d.paying || d.mode !== 'order' || d.phase !== 'pending') return;
    this.setData({ sheet: '', paying: true }); this.dlgSync(); this.syncBar();
    const p = { order_id: this._orderId };
    if (this._demo === 'pay_fail') { p.simulate = 'fail'; this._demo = ''; }
    subscribe.request(subscribe.SCENES.EXPIRE).then((sub) => api.payOrder(p).then((od) => {
      this.setData({ paying: false }); this.dlgSync();
      if (view.isPaid(view.phase(od, Date.now()))) {
        this.stop();
        wx.redirectTo({ url: routes.ORDER_DETAIL + '?id=' + od.id + '&paid=1' + (sub.asked ? '&sub=' + (sub.accepted ? 'accepted' : 'declined') : '') });
        return;
      }
      actions.toast(T.toastPayFail); // 支付失败：不释放仓位，沿用原截止时间
      this.applyOrder(od);
    })).catch((err) => { this.setData({ paying: false }); this.dlgSync(); actions.toast((err && err.message) || T.toastFail); this.loadOrder(); });
  },
  onPayLater() { this.setData({ sheet: '' }); },
  // 「支付遇到问题」（B-15）：停止等待并重新取订单，同时说明订单仍保留、可联系客服；「已完成支付」只重新取订单
  onPayProblem() {
    this.setData({ paying: false }); this.dlgSync(); this.loadOrder();
    wx.showModal({ title: T.payProblem, content: T.payProblemDesc[0] + CT.hotline + T.payProblemDesc[1], cancelText: TT.common.know, confirmText: TT.common.contactService, success: (res) => { if (res.confirm) actions.callService(); }, fail() {} });
  },
  onPayDone() { this.setData({ paying: false }); this.dlgSync(); this.loadOrder(); },
  onCancel() {
    if (!this.data.cancelable || this._busy || !this._orderId) return;
    wx.showModal({
      title: T.cancelTitle, content: T.cancelDesc, cancelText: T.cancelKeep, confirmText: T.cancelYes,
      success: (res) => {
        if (!res.confirm) return;
        this._busy = true;
        api.cancelOrder({ order_id: this._orderId }).then((od) => { this._busy = false; this.setData({ recheck: null, sheet: '' }); this.applyOrder(od); })
          .catch((err) => { this._busy = false; actions.toast((err && err.message) || T.toastFail); this.loadOrder(); });
      },
      fail() {}
    });
  },
  // 已超时 / 已取消：页内列其他可租门店（按距离由近到远，带同租期整期价），不自动弹抽屉（§4.6-10）
  loadAlts(od) {
    const need = view.unitsVolume(od.units), loc = state.get().location;
    return pd.cityStores().then((stores) => {
      const rows = stores.filter((s) => s.id !== od.store.id).map((s) => {
        const u = (s.units || []).filter((x) => x.status === 'available' && Number(x.volume) >= need).sort((a, b) => a.volume - b.volume || a.base_month - b.base_month)[0];
        if (!u) return null;
        const km = view.kmOf(s, loc);
        return { id: s.id, name: s.name, km: km === null ? Infinity : km, kmText: km === null ? '' : fmt.kmText(km), vol: fmt.pretty(u.volume) + 'm³', price: yuan(pricing.quote([u], od.months).rent_total), term: fmt.termText(od.months) };
      }).filter(Boolean).sort((a, b) => a.km - b.km).slice(0, CT.alternatives.max);
      if (this.data.dead) this.setData({ alts: rows });
    }).catch(() => {});
  },
  onAlt(e) { wx.navigateTo({ url: routes.STORE_DETAIL + '?id=' + e.currentTarget.dataset.id }); },
  onRestart() { wx.switchTab({ url: routes.STORES }); },
  onAdvisor() { wx.navigateTo({ url: routes.BOOKING + '?mode=advisor' }); },
  onEmptyBtn() { wx.switchTab({ url: this.data.emptyKind === 'order' ? routes.ORDERS : routes.STORES }); },
  noop() {}
}));
