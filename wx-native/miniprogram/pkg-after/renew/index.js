// 续租 RN01（第 3 批）。进入参数 ?id=<订单号>；没带时取即将到期 / 租用中的一笔。
// 已做：空态、填写（含提交中）、门店确认报价、报价待确认、报价过期、待支付、支付弹层、付款未成功、付款暂缓、已生效、不可办理；
//   首次续租沿用原折扣（D-186、D-192）的填写 / 报价 / 过期三态（金额带「约」、现行折扣价对照、过期后「重新提交续租需求」）；
//   报价 24 小时计时（与租期到期取较早者）；提交时请求「续租报价」订阅，支付成功后请求「租期到期」订阅（先支付、后订阅）；三态。
// 未做：真实微信支付（演示支付，走接口层）；门店报价与「常规折扣价」不同时的对照行只有数据不同时才出现（演示数据里两者相同）。
// 说明：门店报价、付款结果由接口推进；演示环境几秒后自动出报价（core/config-after.js demo）。
// FIX-01：等报价页写明门店确认时限（R-02）并加「联系门店」；已到期订单各态写明续租期自原到期日起算、超出天数另计（R-08）；
//   待支付 / 付款未成功 / 付款暂缓也可「暂不续租」，付款未成功的说明句换成支付相关的一句（C-18）。
const T = require('../../i18n/after');
const api = require('../../services/api');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const subscribe = require('../../services/subscribe');
const C = require('../../core/config');
const A = require('../../core/config-after');
const after = require('../../core/after');
const pricing = require('../../core/pricing');
const cm = require('../common');
const R = T.renew, CT = T.common, fill = after.fill, yuan = pricing.yuan;
const TONE = { form: 'ok', submitting: 'warn', quote_pending: 'warn', quote_ready: 'warn', quote_expired: 'info', payment_pending: 'warn', payment_failed: 'err', cancelled: 'warn', completed: 'ok', unavailable: 'info' };
const CUR = { form: 1, submitting: 1, quote_pending: 2, quote_ready: 3, quote_expired: 3, payment_pending: 4, payment_failed: 4, cancelled: 4, completed: 6, unavailable: 1 };
const ACT = { submit: 'onSubmit', confirm: 'onConfirm', regular: 'onRegular', payNow: 'onPayNow', payLater: 'onPayLater', invoice: 'onInvoice', back: 'onBack', call: 'onCall' };
const tagOf = (f) => after.zhe(f).replace(' ', ''); // 标签里不带空格：「6折」
const btn = (text, act, kind, more) => Object.assign({ text, act, kind: kind || 'primary' }, more);

function render(page, o, now) {
    page.stopTimers();
    const v = o ? after.renewView(o, now, { showCompleted: page._done }) : { state: 'empty' };
    page._view = v;
    if (v.state === 'empty') { page.setData({ empty: true, order: null, bar: null, st: 'empty' }); return; }
    const st = v.state === 'form' && page._busy ? 'submitting' : v.state, r = v.r || null;
    const end = after.ymd(o.lease.end);
    const d = {
      empty: false, st, order: o, note: null, sub: null, form: null,
      over: st !== 'completed' && st !== 'unavailable' && after.leaseOver(o, now) ? fill(R.overdueNote, { d: end }) : '', card: null, alt: [], fail: st === 'payment_failed', bar: null, pay: null,
      head: { title: R.head[st], tag: R.tag[st], tone: TONE[st], subs: [fill(CT.orderNo, { no: o.no }), fill(CT.curLeaseTo, { d: end }), fill(CT.totalMonths, { m: o.months })] }
    };
    const quoted = r && r.status !== 'submitted';
    d.steps = st === 'unavailable' ? [] : cm.steps(R.steps, [
      r ? fill(R.stepMonths, { m: r.months }) : '',
      quoted ? (st === 'quote_expired' ? R.stepExpired : fill(CT.perMonth, { a: yuan(r.monthly) })) : '',
      '', '', st === 'completed' ? fill(R.stepDone, { d: end, m: o.months }) : ''
    ], CUR[st], st === 'payment_failed' ? 4 : 0);

    if (st === 'unavailable') {
      d.note = { tone: 'warn', text: v.reason === 'exit' ? R.unavailableExit : v.reason === 'ended' ? R.unavailableEnded : fill(R.unavailableMax, { cap: C.requirement.termMax }) };
      d.bar = { btns: [btn(CT.backOrder, 'back', 'neutral')] };
    } else if (st === 'form' || st === 'submitting') {
      const m = Math.max(1, Math.min(v.max, page._months || v.months)), q = after.renewQuote(o, m), mt = fill(CT.months, { m });
      page._months = m;
      d.form = {
        months: m, monthsText: mt, canMinus: m > 1, canPlus: m < v.max,
        chips: A.renew.quickMonths.filter((x) => x <= v.max).map((x) => ({ m: x, label: fill(CT.months, { m: x }), on: x === m })),
        hint: q.kept || q.special ? '' : pricing.termHint(m), rule: fill(R.monthsRule, { max: v.max, cap: C.requirement.termMax })
      };
      d.card = q.kept
        ? { title: R.feeTitle, main: { k: R.rent, sub: mt, tag: tagOf(q.factor), amt: fill(CT.about, { a: yuan(q.total) }) }, sec: fill(CT.calc, { a: yuan(q.monthly), m }), keep: fill(R.keepForm, { z: q.label, m, p: q.currentLabel, less: yuan(q.lessMonthly) }), rule: R.ruleKeep }
        : { title: R.feeTitle, main: { k: R.rent, sub: mt, amt: R.pendingAmount, muted: true }, rule: R.ruleNormal };
      const info = q.kept ? { lab: fill(R.barLabel, { m }), tag: fill(R.barKeepTag, { z: q.label }), amt: fill(CT.about, { a: yuan(q.total) }) } : { lab: fill(R.barLabel, { m }), amt: R.barPending, muted: true };
      d.bar = st === 'submitting' ? { btns: [btn(CT.submitting, '', 'primary', { loading: true, off: true })] } : Object.assign(info, { btns: [btn(R.submit, 'submit')] });
    } else if (st === 'quote_pending') {
      d.note = { tone: '', text: fill(r.notify === 'accepted' ? R.pendingNote : R.pendingNoteMsg, { n: A.sla.renewQuoteDays }) };
      d.sub = r.notify === 'accepted' ? { ok: true, text: R.subOk } : r.notify === 'declined' ? { ok: false, text: R.subNo } : null;
      d.bar = { btns: [btn(CT.backOrder, 'back', 'neutral'), btn(CT.callStore, 'call', 'ghost')] };
      cm.later(page, A.demo.storeQuoteMs - (now - r.submitted_at));
    } else {
      const m = r.months, mt = fill(CT.months, { m }), q = after.renewQuote(o, m), newEnd = after.ymd(st === 'completed' ? o.lease.end : after.addMonths(o.lease.end, m));
      const period = st === 'completed' ? [] : [{ k: R.newEnd, v: newEnd }, { k: R.joint, v: fill(R.jointText, { d: end, m }), soft: true, long: true }];
      const valid = { k: R.validTo, v: v.deadline ? after.ymdhm(v.deadline) : '', sub: v.deadline ? leftText(v.deadline, now) : '', subWarn: true }; // 截止时间是值，剩余时间单独一行（IMPL-01）
      const ttl = fill(v.capped ? R.ttlCapped : R.ttl, { h: C.timers.renewQuoteTtlHours });
      const regular = q.currentTotal, differs = regular !== r.amount;
      if (st === 'quote_ready') {
        d.card = v.kept
          ? { title: R.quoteTitle, main: { k: R.rent, sub: mt, tag: tagOf(r.factor), amt: yuan(r.amount) }, sec: fill(CT.calc, { a: yuan(r.monthly), m }), ref: { k: R.current, sub: tagOf(q.currentFactor), amt: yuan(regular) }, total: { k: R.payable, amt: yuan(r.amount) },
              keep: fill(R.keepQuote, { z: after.zhe(r.factor), m, p: q.currentLabel, less: yuan(q.currentMonthly - r.monthly), total: yuan(regular - r.amount) }), kv: [valid, { k: R.payDeadline, v: R.sameAsQuote, soft: true }].concat(period), rule: ttl + R.effect }
          : { title: R.quoteTitle, main: { k: R.storeQuote, sub: mt, amt: yuan(r.amount) }, sec: fill(CT.calc, { a: yuan(r.monthly), m }), ref: differs ? { k: R.regular, sub: q.special ? '' : tagOf(q.currentFactor), amt: yuan(regular) } : null, total: { k: R.payable, amt: yuan(r.amount) },
              kv: [valid, { k: R.payDeadline, v: R.sameAsQuote, soft: true }].concat(period), rule: ttl + R.afterExpire + R.effect };
        d.alt = (!v.kept && differs ? [{ text: R.renewRegular, act: 'regular' }] : []).concat([{ text: R.skip, act: 'skip' }]); // 沿用原折扣时不出「按常规折扣续租」（D-186）
        d.bar = { lab: R.payable, amt: yuan(r.amount), btns: [btn(R.confirmPay, 'confirm')] };
      } else if (st === 'quote_expired') {
        const old = r.amount > 0 ? { k: R.oldQuote, sub: R.expiredSub, amt: yuan(r.amount), strike: true } : null;
        if (v.kept) {
          d.note = { tone: '', text: fill(R.expiredKeepNote, { z: q.label }) };
          d.card = { title: R.feeTitle, main: { k: R.rent, sub: mt, tag: tagOf(q.factor), amt: fill(CT.about, { a: yuan(q.total) }) }, sec: fill(CT.calc, { a: yuan(q.monthly), m }), ref: old, kv: period, rule: R.ruleNormal };
          d.bar = { lab: fill(R.barLabel, { m }), tag: fill(R.barKeepTag, { z: q.label }), amt: fill(CT.about, { a: yuan(q.total) }), btns: [btn(R.resubmit, 'submit')] };
        } else {
          d.note = { tone: '', text: R.expiredNote };
          d.card = { title: R.feeTitle, main: { k: R.regular, sub: mt, tag: q.special ? '' : tagOf(q.currentFactor), amt: yuan(regular) }, sec: fill(CT.calc, { a: yuan(q.currentMonthly), m }), ref: old, total: { k: R.payable, amt: yuan(regular) }, kv: period, rule: R.effect };
          d.bar = { lab: R.payable, amt: yuan(regular), btns: [btn(R.renewRegular, 'regular')] };
        }
        d.alt = [{ text: R.skip, act: 'skip' }];
      } else {
        const done = st === 'completed';
        d.card = { title: R.feeTitle, main: { k: R.rent, sub: mt, tag: r.kept ? tagOf(r.factor) : '', amt: yuan(r.amount) }, sec: fill(CT.calc, { a: yuan(r.monthly), m }), total: { k: done ? R.paid : R.payable, amt: yuan(r.amount) }, kv: done ? [] : [valid].concat(period), rule: done ? '' : R.effect };
        d.pay = { k: R.rent, sub: mt, amt: yuan(r.amount) };
        if (st === 'payment_pending') d.bar = { btns: [btn(R.payLater, 'payLater', 'neutral'), btn(R.payNow, 'payNow')] };
        else if (done) d.bar = { btns: [btn(R.invoice, 'invoice', 'ghost'), btn(CT.backOrder, 'back')] };
        else d.bar = { lab: R.payable, amt: yuan(r.amount), btns: [btn(st === 'payment_failed' ? R.repay : R.continuePay, 'payNow')] };
        if (!done) d.alt = [{ text: R.skip, act: 'skip' }]; // 待支付 / 付款未成功 / 付款暂缓也能放弃这次续租，不用等报价过期
      }
      if (v.deadline && st !== 'completed' && st !== 'quote_expired') startTick(page, v.deadline);
    }
    // IMPL-01 动效：改续租月数后步进数字与底栏金额轻微回弹（首次渲染、占位文字不动）；状态切换时正文淡入
    const prevAmt = page.data.bar && !page.data.bar.muted ? page.data.bar.amt : '', prevM = page.data.form ? page.data.form.months : 0;
    page.setData(d);
    if (d.form && prevM && prevM !== d.form.months) cm.bump(page, 'mBump', 'mk-bump mk-bump--center');
    if (prevAmt && d.bar && !d.bar.muted && d.bar.amt && /\d/.test(d.bar.amt) && prevAmt !== d.bar.amt && page._fxSt === st) cm.bump(page, 'amtBump');
    cm.fx(page, st);
}
function leftText(deadline, now) { return fill(R.validLeft, { c: after.countdown(deadline, now) }); }
// 报价有效期倒计时：每秒更新一行文字；到点重新取数（进入「报价已过期」）
function startTick(page, deadline) {
  page._tick = setInterval(() => {
      const now = Date.now(), card = page.data.card;
      if (now >= deadline) { page.stopTimers(); page.setData({ paySheet: false }); page.refresh(); return; }
      if (card && card.kv && card.kv.length && card.kv[0].k === R.validTo) page.setData({ 'card.kv[0].sub': leftText(deadline, now) });
  }, 1000);
  if (page._tick && page._tick.unref) page._tick.unref(); // 只在 Node 测试环境有 unref：不让计时器拖住进程
}

function setMonths(page, m) { const v = page._view; if (!v || v.state !== 'form' || page._busy || !(m >= 1 && m <= v.max)) return; page._months = m; render(page, page._order, Date.now()); }
// 接口成功 / 失败后的统一收尾
function done(page, o) { page._busy = false; page._order = o; render(page, o, Date.now()); return o; }
function failed(page, err) { page._busy = false; page.setData({ paySheet: false }); cm.opFail(err); return page.refresh(); }
function confirm(page, regular) {
  const o = page._order; if (!o || page._busy || !o.renew) return null;
  page._busy = true;
  return api.confirmRenewal({ id: o.id, regular: !!regular }).then((x) => { done(page, x); page.setData({ paySheet: true }); }, (err) => failed(page, err));
}

Page(auth.guarded(routes.RENEW, {
  data: { T: { c: CT, r: R }, sys: 'loading', empty: false, st: '', head: null, order: null, steps: [], over: '', note: null, sub: null, form: null, card: null, alt: [], fail: false, bar: null, paySheet: false, pay: null },
  onLoad(q) { this._id = (q && q.id) || ''; this._months = 0; this._done = false; this._busy = false; },
  onShow() { return this.refresh(); },
  onHide() { this.stopTimers(); },
  onUnload() { this.stopTimers(); cm.dispose(this); },
  onPullDownRefresh() { this.refresh().then(() => wx.stopPullDownRefresh()); },
  refresh() { return cm.load(this, 'renew', (o, now) => render(this, o, now)); },
  stopTimers() { cm.cancelLater(this); if (this._tick) { clearInterval(this._tick); this._tick = null; } },

  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },
  onBar(e) { const h = ACT[e && e.currentTarget && e.currentTarget.dataset.act]; if (h && this[h]) this[h](e); },
  onAlt(e) { const a = e.currentTarget.dataset.act; if (a === 'regular') this.onRegular(); else if (a === 'skip') this.onSkip(); },
  onMinus() { setMonths(this, this._months - 1); },
  onPlus() { setMonths(this, this._months + 1); },
  onChip(e) { setMonths(this, Number(e.currentTarget.dataset.m)); },
  // 提交续租需求 / 重新提交（报价过期且仍沿用原折扣）：先请求订阅（点按回调里），允许或取消都继续提交（§4.10）
  onSubmit() {
    const v = this._view, o = this._order;
    if (!o || !v || this._busy || (v.state !== 'form' && v.state !== 'quote_expired')) return;
    const months = v.state === 'form' ? this._months : v.months;
    this._busy = true; render(this, o, Date.now());
    return subscribe.request(subscribe.SCENES.RENEW_QUOTE)
      .then((res) => api.requestRenewal({ id: o.id, months, notify: res.asked ? (res.accepted ? 'accepted' : 'declined') : '' }))
      .then((x) => done(this, x), (err) => failed(this, err));
  },
  onSubAsk() { // 结果页的「开启通知」
    const o = this._order; if (!o) return;
    return subscribe.request(subscribe.SCENES.RENEW_QUOTE).then((res) => (res.accepted ? api.setAfterNotify({ id: o.id, scene: 'renew', notify: 'accepted' }).then((x) => done(this, x), (err) => failed(this, err)) : null));
  },
  onConfirm() { return confirm(this, false); },   // 确认并支付
  onRegular() { return confirm(this, true); },    // 按常规折扣续租
  onSkip() { // 暂不续租：撤掉这次申请，回订单详情
    const o = this._order; if (!o || this._busy) return;
    this._busy = true;
    return api.cancelRenewal({ id: o.id }).then(() => { this._busy = false; this._months = 0; cm.backToOrder(this); }, (err) => failed(this, err));
  },
  onPayNow() { if (this._order && this.data.pay) this.setData({ paySheet: true }); },
  onSheetClose() { this.setData({ paySheet: false }); },
  onPayLater() {
    const o = this._order; if (!o || this._busy) return;
    this._busy = true; this.setData({ paySheet: false });
    return api.deferRenewalPay({ id: o.id }).then((x) => done(this, x), (err) => failed(this, err));
  },
  // 确认付款（演示支付）。成功后再请求「租期到期」订阅：先支付、后订阅
  onPayConfirm() {
    const o = this._order; if (!o || this._busy || !this.data.pay) return;
    this._busy = true;
    return api.payRenewal({ id: o.id }).then((x) => {
      this._done = true; this.setData({ paySheet: false }); done(this, x);
      return subscribe.request(subscribe.SCENES.EXPIRE);
    }, (err) => failed(this, err));
  },
  onInvoice() { if (this._id) auth.navigate(this, routes.INVOICE + '?id=' + this._id); },
  onBack() { cm.backToOrder(this); },
  onOrders() { cm.toOrders(); },
  onCall() { cm.callStore(this._order); }
}));
