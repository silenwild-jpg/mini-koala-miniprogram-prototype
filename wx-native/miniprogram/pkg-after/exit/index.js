// 退仓 EX01（第 3 批）。进入参数 ?id=<订单号>；没带时取退仓中 / 已到期 / 租用中的一笔。
// 已做：空态、到期退仓与提前退仓的填写（含提交中）、租期已到期、确认弹层（提前退仓三行：预计结算费用带「约」、费用结算含「查看协议」、已享优惠）、
//   已提交、等待验仓、验仓未通过、验仓通过、订单尚未起租（退订说明，与退仓是两件事）；申请验仓时请求「验仓结果」订阅并在等待页显示结果一行；三态。
// 未做：冻结稿的确认弹窗是居中对话框，这里用全站统一的底部弹层 mk-sheet；租期已到期时不提供「提前退仓」选项（已到期无从提前）。
// 预计结算费用是估算（core/after.earlyExitEstimate，照冻结稿 earlyCalc），界面不显示违约金比例（D-113），正式结算以后端为准（D-189）。
// FIX-01（R-01 / R-02 / R-09）：到期退仓在到期日前 7 天起才可提交，更早只有提前退仓；取空日期 = 租期结束日至其后 2 天；
//   到期退仓提交后、门店验仓完成前可「撤回退仓申请」；租期结束日之前申请验仓的，先弹层提示按提前退仓结算（带预计结算费用），确认后才提交；
//   等待验仓页写明门店验仓时限。
const T = require('../../i18n/after');
const zh = require('../../i18n/zh');
const api = require('../../services/api');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const subscribe = require('../../services/subscribe');
const A = require('../../core/config-after');
const after = require('../../core/after');
const pricing = require('../../core/pricing');
const cm = require('../common');
const X = T.exit, CT = T.common, fill = after.fill, yuan = pricing.yuan;
const TONE = { form: 'ok', form_expired: 'warn', submitting: 'warn', requested: 'warn', waiting: 'warn', failed: 'err', passed: 'ok', not_started: 'info' };
const CUR = { form: 1, form_expired: 1, requested: 2, waiting: 3, failed: 3, passed: 4 };
const ACT = { submit: 'onSubmit', inspect: 'onInspect', renew: 'onRenew', deposit: 'onDeposit', back: 'onBack', call: 'onCall' };
const btn = (text, act, kind, more) => Object.assign({ text, act, kind: kind || 'primary' }, more);

function render(page, o, now) {
  cm.cancelLater(page);
  const st0 = o ? after.exitState(o, now) : 'empty';
  page._st = st0;
  if (st0 === 'empty') { page.setData({ empty: true, order: null, bar: null, st: 'empty', confirm: false }); return; }
  const x = o.exit, end = after.ymd(o.lease.end), isForm = st0 === 'form' || st0 === 'form_expired';
  const d = { empty: false, st: st0, order: o, note: null, cancel: null, form: null, depositRows: [], fail: false, before: false, waitNote: '', sub: null, bar: null, steps: [], confirmRows: [], canWithdraw: false, early: false, earlyRows: [], earlyText: '' };
  d.head = { title: X.head[st0], tag: page._busy && isForm ? CT.submittingTag : X.tag[st0], tone: page._busy && isForm ? 'warn' : TONE[st0], subs: [fill(CT.orderNo, { no: o.no }), st0 === 'not_started' ? fill(CT.planStart, { d: after.ymd(o.lease.start) }) : fill(CT.leaseTo, { d: end })] };
  if (st0 === 'not_started') { // 已付未起租：退订，由门店办理
    d.cancel = [{ k: X.cancelRule, v: X.cancelRuleText, long: true }, { k: X.cancelPaid, v: X.cancelPaidText, long: true }, { k: X.cancelDeposit, v: zh.common.contactService, soft: true }, { k: X.cancelWay, v: X.cancelWayText }];
    d.bar = { btns: [btn(CT.backOrder, 'back', 'neutral'), btn(CT.callStore, 'call')] };
    page.setData(d); cm.fx(page, st0); return;
  }
  const typeText = x ? X.type[x.early ? 'early' : 'expiry'] : '';
  d.steps = cm.steps(X.steps, [x ? fill(X.stepPlan, { t: typeText, d: x.date }) : '', '', '', st0 === 'passed' ? T.deposit.tag[after.depositState(o)] || '' : ''], CUR[st0], st0 === 'failed' ? 3 : 0);
  if (isForm) {
    const expired = st0 === 'form_expired', canEarly = !expired && after.canEarlyExit(o, now);
    const canExpiry = expired || after.canExpiryExit(o, now) || !canEarly; // 到期日前 7 天起才可提交到期退仓（R-01）
    const type = canEarly && (page._type === 'early' || !canExpiry) ? 'early' : 'expiry', rg = after.exitDateRange(o, type, now);
    const date = page._date && page._date >= rg.min && (!rg.max || page._date <= rg.max) ? page._date : rg.def;
    page._type = type; page._date = date;
    if (expired) d.note = { tone: 'warn', title: '', text: fill(X.overdueText, { d: end }), link: CT.viewAgreement };
    d.form = { type, typeText: X.type[type], canEarly: canEarly && canExpiry, types: [{ v: 'expiry', t: X.type.expiry, on: type === 'expiry' }, { v: 'early', t: X.type.early, on: type === 'early' }], date, min: rg.min, max: rg.max,
      rule: type === 'early' ? X.ruleEarly : expired ? (rg.min === rg.max ? X.ruleExpiredToday : fill(X.ruleExpired, { d: rg.min, e: rg.max })) : fill(X.ruleExpiry, { d: rg.min, e: rg.max }),
      tip: canExpiry ? '' : fill(X.expiryFrom, { d: after.expiryExitFrom(o), n: A.exit.expiryAdvanceDays }) };
    d.depositRows = [{ k: X.deposit, v: yuan(o.deposit.amount) }, { k: X.depositBack, v: X.depositBackText, soft: true }];
    d.confirmRows = [{ k: X.typeLabel, v: X.type[type] }, { k: X.dateLabel, v: date }];
    if (type === 'early') d.confirmRows.push({ k: X.estimate, v: fill(CT.about, { a: yuan(after.earlyExitEstimate(o, date).fee) }) }, { k: X.settle, v: X.settleText, long: true, link: CT.viewAgreement, key: 'agreement' }, { k: X.promo, v: X.promoText, long: true });
    d.bar = page._busy ? { btns: [btn(CT.submitting, '', 'primary', { loading: true, off: true })] }
      : { btns: (expired ? [btn(X.renew, 'renew', 'ghost')] : []).concat([btn(X.submit, 'submit', 'danger')]) };
  } else {
    // IMPL-02 M-30：已提交后的「退仓安排」两行（退仓类型、计划取空日期）并入进度第一步的副文案（X.stepPlan 已含这两项），不再单列一节
    if (st0 === 'requested' || st0 === 'failed') { d.fail = st0 === 'failed'; d.before = true; d.bar = { btns: [btn(st0 === 'failed' ? X.reinspect : X.inspect, 'inspect')] }; }
    d.canWithdraw = after.canWithdrawExit(o);
    if (d.before && after.inspectionIsEarly(o, now)) { // 租期结束日之前申请验仓：按提前退仓结算，先让用户看到预计结算费用（R-01）
      const today = after.ymd(now);
      d.earlyText = fill(X.earlyText, { d: x.date });
      d.earlyRows = [{ k: X.dateLabel, v: x.date }, { k: X.earlyDate, v: today }, { k: X.estimate, v: fill(CT.about, { a: yuan(after.earlyExitEstimate(o, today).fee) }) }, { k: X.settle, v: X.settleText, long: true, link: CT.viewAgreement, key: 'agreement' }, { k: X.promo, v: X.promoText, long: true }];
    }
    if (st0 === 'waiting') {
      d.waitNote = fill(X.waitingNote, { n: A.sla.inspectDays });
      d.sub = x.notify === 'accepted' ? { ok: true, text: X.subOk } : x.notify === 'declined' ? { ok: false, text: X.subNo } : null;
      d.bar = { btns: [btn(CT.backOrder, 'back', 'neutral'), btn(CT.callStore, 'call', 'ghost')] };
      cm.later(page, A.demo.inspectMs - (now - x.inspect_at));
    }
    if (st0 === 'passed') d.bar = { btns: [btn(X.viewDeposit, 'deposit')] };
  }
  page.setData(d); cm.fx(page, st0);
}
function done(page, o) { page._busy = false; page._order = o; render(page, o, Date.now()); return o; }
function failed(page, err) { page._busy = false; page.setData({ confirm: false, early: false }); cm.opFail(err); return page.refresh(); }
const isForm = (page) => page._st === 'form' || page._st === 'form_expired';

Page(auth.guarded(routes.EXIT, {
  data: { T: { c: CT, x: X }, sys: 'loading', empty: false, st: '', head: null, order: null, steps: [], note: null, cancel: null, form: null, depositRows: [], fail: false, before: false, waitNote: '', sub: null, bar: null, confirm: false, confirmRows: [], canWithdraw: false, early: false, earlyRows: [], earlyText: '' },
  onLoad(q) { this._id = (q && q.id) || ''; this._type = q && q.type === 'early' ? 'early' : 'expiry'; this._date = ''; this._busy = false; },
  onShow() { this.refresh(); },
  onHide() { cm.cancelLater(this); },
  onUnload() { cm.cancelLater(this); cm.dispose(this); },
  onPullDownRefresh() { this.refresh().then(() => wx.stopPullDownRefresh()); },
  refresh() { return cm.load(this, 'exit', (o, now) => render(this, o, now)); },
  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },
  onBar(e) { const h = ACT[e && e.currentTarget && e.currentTarget.dataset.act]; if (h && this[h]) this[h](e); },
  onType(e) { // 到期退仓 / 提前退仓
    if (!isForm(this) || this._busy) return;
    this._type = e.currentTarget.dataset.v === 'early' ? 'early' : 'expiry'; this._date = '';
    render(this, this._order, Date.now());
  },
  onDate(e) {
    const v = e && e.detail ? String(e.detail.value || '') : '';
    if (!isForm(this) || this._busy || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
    this._date = v; render(this, this._order, Date.now());
  },
  onSubmit() { if (isForm(this) && !this._busy) this.setData({ confirm: true }); }, // 提交退仓安排 → 确认弹层
  onConfirmClose() { this.setData({ confirm: false }); },
  onConfirm() {
    const o = this._order; if (!o || !isForm(this) || this._busy) return;
    this._busy = true; this.setData({ confirm: false }); render(this, o, Date.now());
    return api.requestExit({ id: o.id, type: this._type, date: this._date }).then((x) => done(this, x), (err) => failed(this, err));
  },
  // 确认清空并申请验仓 / 重新申请验仓：先请求「验仓结果」订阅（点按回调里），允许或取消都继续（§4.10）
  // 租期结束日之前申请的，先打开「按提前退仓结算」弹层，确认后才提交（R-01）
  onInspect() {
    const o = this._order; if (!o || this._busy || (this._st !== 'requested' && this._st !== 'failed')) return;
    if (after.inspectionIsEarly(o, Date.now())) { this.setData({ early: true }); return; }
    return this.inspect(false);
  },
  onEarlyClose() { this.setData({ early: false }); },
  onEarlyConfirm() { if (!this.data.early || this._busy) return; this.setData({ early: false }); return this.inspect(true); },
  inspect(early) {
    const o = this._order; if (!o || this._busy) return;
    this._busy = true;
    return subscribe.request(subscribe.SCENES.INSPECT)
      .then((res) => api.requestInspection({ id: o.id, early_confirmed: !!early, notify: res.asked ? (res.accepted ? 'accepted' : 'declined') : '' }))
      .then((x) => done(this, x), (err) => failed(this, err));
  },
  // 撤回退仓申请：二次确认后撤回，订单回到提交前的阶段，页面回到填写态
  onWithdraw() {
    const o = this._order; if (!o || this._busy || !this.data.canWithdraw) return;
    wx.showModal({
      title: X.withdrawTitle, content: X.withdrawText, cancelText: X.withdrawNo, confirmText: X.withdrawYes,
      success: (res) => {
        if (!res.confirm || this._busy) return;
        this._busy = true; this._type = 'expiry'; this._date = '';
        api.cancelExit({ id: o.id }).then((x) => { done(this, x); cm.toast(X.withdrawn); }, (err) => failed(this, err));
      },
      fail() {}
    });
  },
  onSubAsk() { // 等待页的「开启通知」
    const o = this._order; if (!o) return;
    return subscribe.request(subscribe.SCENES.INSPECT).then((res) => (res.accepted ? api.setAfterNotify({ id: o.id, scene: 'exit', notify: 'accepted' }).then((x) => done(this, x), (err) => failed(this, err)) : null));
  },
  onAgreement() { cm.toAgreement('usage'); },
  onRenew() { if (this._id) auth.navigate(this, routes.RENEW + '?id=' + this._id); },
  onDeposit() { if (this._id) auth.navigate(this, routes.DEPOSIT + '?id=' + this._id); },
  onBack() { cm.backToOrder(this); },
  onOrders() { cm.toOrders(); },
  onCall() { cm.callStore(this._order); }
}));
