// 估算存储空间 · 填容量 CAP（第 1 批）。
// 已做：m³ / ㎡ 输入与校验、加减按钮、快捷项 1 / 3 / 8 / 15 / 20m³（面积模式隐藏）、㎡ 只写「约 X m³」（D-178）、
//       「全放标准纸箱约 N 箱 · 看示意」、租期组件与下一档提示、30m³ 及以上交顾问（隐藏租期，主按钮「提交给顾问」）、
//       超过 15m³ 的顾问提示卡、顾问协助与 AI 估算占位（D-133，只给一句提示）、空间参考卡（按容量取档，数据经接口取）、
//       与物品页共用草稿的两行：「按物品估算 3.4m³ · 3 种 6 件 · 修改清单」「已改为手动填写 · 物品估算为 3.4m³ · 恢复」（D-142）、
//       底栏摘要（写明还缺什么）、加载 / 失败 / 断网。
// 未做：空间参考卡的示意图与物品图（素材没有随包）。
// 容量错误句现在仍是旧句（tests/flow.test.js 锁定），冻结稿原文见 i18n/find.js cap.err 上方的说明。
const C = require('../../core/config');
const CF = require('../../core/config-find');
const T = require('../../i18n/find');
const req = require('../../core/requirement');
const pricing = require('../../core/pricing');
const state = require('../../services/state');
const api = require('../../services/api');
const routes = require('../../services/routes');
const order = require('../../core/order');
const pd = require('../../services/page-data');
const R = C.requirement, K = T.cap, ERR = K.err;
const round2 = (n) => Number(Number(n).toFixed(2));
Page({
  data: {
    T: { cap: pd.plain(K), m3: T.unit.m3, m2: T.unit.m2, hintSub: T.advisor.capHint(C.matching.advisorCapacityM3), advisorCta: T.cta.advisor },
    sys: 'loading', unit: 'm3', raw: '', quick: R.capacityQuickPicks.map((v) => ({ v, t: v + 'm³', on: false })), term: R.termDefault, hint: '', error: '', approx: '', cartons: '', sales: false, ok: false, ack: '',
    advise: false, src: 'manual', srcText: '', canMinus: false, ref: null, sumCap: K.dash, sumTerm: '', needText: '', needErr: false, submitText: K.submit
  },
  onLoad() {
    const s = state.get(), r = s.requirement, d = s.draft || {};
    if (r) this.setData({ unit: r.input_unit || 'm3', raw: String(r.input_value || r.capacity_m3), term: r.term_months || R.termDefault });
    else if (d.term) this.setData({ term: d.term });
    this.evaluate();
    pd.load(this, api.getSpaceReference(), (res) => { this._bands = (res && res.bands) || []; this.evaluate(); });
  },
  // 从物品页回来：草稿里的容量来源是「物品估算」且有新的估算值时带回（最后一次修改生效，D-142）
  onShow() {
    const d = state.get().draft || {};
    if (d.source === 'items' && d.est && d.est.rec > 0 && d.stamp !== this._stamp) {
      this._stamp = d.stamp;
      this.setData({ unit: 'm3', raw: String(Math.max(R.capacityMinM3, d.est.rec)), src: 'items', term: d.term || this.data.term });
      this.evaluate();
    } else if (d.source === 'edited' && d.est && this.data.src === 'manual' && d.stamp !== this._stamp) {
      this._stamp = d.stamp;
      if (d.capacity_raw) this.setData({ unit: d.unit || 'm3', raw: String(d.capacity_raw) });
      this.setData({ src: 'edited' }); this.evaluate();
    }
  },
  onRetry() { this.setData({ sys: 'loading' }); pd.load(this, api.getSpaceReference(), (res) => { this._bands = (res && res.bands) || []; this.evaluate(); }); },
  evaluate() {
    const d = this.data, v = req.validate(d.unit, d.raw), est = (state.get().draft || {}).est;
    const error = v.ok || v.error === 'empty' ? '' : (ERR[v.error + '_' + d.unit] || ERR[v.error] || ERR.format);
    const cap = v.ok ? v.capacity_m3 : null, sales = !!v.sales;
    // 空间参考：按容量取档（档位表经接口取）
    let ref = null;
    const bands = this._bands || [];
    if (v.ok && bands.length) {
      let i = bands.findIndex((b) => cap <= b.max); if (i < 0) i = bands.length - 1;
      const b = bands[i], lo = i > 0 ? bands[i - 1].max : null;
      ref = { range: (lo === null ? K.refWithin(b.max) : i === bands.length - 1 ? K.refOver(lo) : K.refRange(lo, b.max)) + K.refFits, title: b.title, note: b.note, things: (b.things || []).map((x) => ({ n: x[0], c: x[1] })) };
    }
    const src = d.src !== 'manual' && est && est.rec > 0 ? d.src : 'manual';
    const empty = v.error === 'empty';
    this.setData({
      ok: v.ok, sales, error,
      approx: v.ok ? (d.unit === 'm2' ? K.approx(req.pretty(v.capacity_m3)) : '') : '', // 只写「约 X m³」，不显示层高（D-178）
      cartons: v.ok ? (sales ? '' : K.cartons(req.cartonCount(v.capacity_m3))) : '',
      hint: v.ok ? (sales ? '' : pricing.nudge(d.term)) : '',
      ack: sales ? (order.inServiceHours(Date.now()) ? K.salesIn : K.salesOff) : '',
      advise: v.ok && !sales && cap > C.matching.advisorCapacityM3,
      quick: R.capacityQuickPicks.map((q) => ({ v: q, t: q + 'm³', on: v.ok && d.unit === 'm3' && cap === q })),
      canMinus: v.ok && Number(d.raw) > CF.estimate.capStepM3,
      src, srcText: src === 'items' ? K.fromItems(req.pretty(est.rec), est.kinds, est.count) : src === 'edited' ? K.edited(req.pretty(est.rec)) : '',
      ref,
      sumCap: v.ok ? req.pretty(cap) + 'm³' : K.dash, sumTerm: sales ? K.sumSales : ' · ' + d.term + T.unit.month,
      needText: v.ok ? '' : empty ? K.needFill : d.unit === 'm2' ? K.needFixArea : K.needFixCap, needErr: !v.ok && !empty,
      submitText: sales ? K.toAdvisor : K.submit
    });
    this._v = v;
  },
  // 手改容量：来源从「物品估算」变成「已改为手动填写」，清单保留
  touch(raw, unit) {
    const d = state.get().draft || {}, part = { capacity_raw: raw, unit, stamp: Date.now() };
    if (this.data.src === 'items' && d.est && String(raw) !== String(Math.max(R.capacityMinM3, d.est.rec))) { part.source = 'edited'; this.setData({ src: 'edited' }); }
    else if (this.data.src === 'manual') part.source = d.source === 'items' ? 'edited' : (d.source || 'manual');
    this._stamp = part.stamp;
    state.patch('draft', part);
  },
  onUnit(e) { const unit = e.currentTarget.dataset.u === 'm2' ? 'm2' : 'm3'; if (unit !== this.data.unit) { this.setData({ unit, raw: '' }); this.touch('', unit); this.evaluate(); } },
  onInput(e) { const raw = String((e.detail && e.detail.value) || ''); this.setData({ raw }); this.touch(raw, this.data.unit); this.evaluate(); },
  onQuick(e) { const raw = String(e.currentTarget.dataset.v); this.setData({ raw }); this.touch(raw, this.data.unit); this.evaluate(); },
  onStep(e) {
    const dir = e.currentTarget.dataset.dir === 'minus' ? -1 : 1, n = Number(this.data.raw), step = CF.estimate.capStepM3;
    const min = this.data.unit === 'm2' ? R.areaMinM2 : R.capacityMinM3;
    const next = Number.isFinite(n) && this.data.raw !== '' ? Math.max(min, round2(n + dir * step)) : (dir > 0 ? Math.max(min, step) : min);
    this.setData({ raw: String(next) }); this.touch(String(next), this.data.unit); this.evaluate();
  },
  onRestore() { // 恢复为物品估算值
    const d = state.get().draft || {};
    if (!d.est) return;
    const raw = String(Math.max(R.capacityMinM3, d.est.rec));
    this._stamp = Date.now();
    state.patch('draft', { source: 'items', capacity_raw: raw, unit: 'm3', stamp: this._stamp });
    this.setData({ unit: 'm3', raw, src: 'items' }); this.evaluate();
  },
  onTerm(e) { this.setData({ term: e.detail.months }); state.patch('draft', { term: e.detail.months }); this.evaluate(); },
  onItems() { const pages = getCurrentPages(); if (pages.length > 1 && '/' + pages[pages.length - 2].route === routes.ITEMS) wx.navigateBack(); else wx.navigateTo({ url: routes.ITEMS }); },
  onAdvisor() { wx.navigateTo({ url: routes.BOOKING + '?mode=advisor' }); },
  onAi() { pd.toast(K.aiToast); }, // AI 估算保留占位，不实现（D-133）
  onSeeRef() { wx.pageScrollTo({ selector: '#cp-ref', duration: 200, fail: () => {} }); },
  onSubmit() {
    if (!this.data.ok) return;
    const d = this.data, v = this._v;
    if (v.sales) { wx.navigateTo({ url: routes.BOOKING + '?mode=advisor&cap=' + v.capacity_m3 }); return; } // 30m³ 及以上不写入自助需求
    const est = (state.get().draft || {}).est;
    const need = { capacity_m3: v.capacity_m3, input_unit: d.unit, input_value: Number(d.raw), source: 'manual', term_months: d.term };
    if (d.src === 'items' && est) { need.source = 'items'; need.est = est; } // 仍是物品估算值：仓位推荐页写明估算关系
    state.setRequirement(need);
    const pages = getCurrentPages();
    if (pages.length > 1 && '/' + pages[pages.length - 2].route === routes.MATCH) wx.navigateBack(); else wx.redirectTo({ url: routes.MATCH });
  }
});
