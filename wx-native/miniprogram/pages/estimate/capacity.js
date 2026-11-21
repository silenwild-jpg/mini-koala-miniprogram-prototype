// 估算存储空间 · 填容量 CAP（第 1 批）。
// 已做：m³ / ㎡ 输入与校验、加减按钮、快捷项 1 / 3 / 8 / 15 / 20m³（面积模式隐藏）、㎡ 只写「约 X m³」（D-178）、
//       「全放标准纸箱约 N 箱 · 看示意」、租期组件与下一档提示、30m³ 及以上交顾问（隐藏租期，主按钮「提交给顾问」）、
//       超过 15m³ 的顾问提示卡、顾问协助与 AI 估算占位（D-133，只给一句提示）、空间参考卡（按容量取档，数据经接口取）、
//       与物品页共用草稿的两行：「按物品估算 3.4m³ · 3 种 6 件 · 修改清单」「已改为手动填写 · 物品估算为 3.4m³ · 恢复」（D-142）、
//       底栏摘要（写明还缺什么）、加载 / 失败 / 断网。
// IMPL-01（张坤 2026-11-21）：AI 估算入口按 config-find.estimate.aiEnabled 整个隐藏；快捷档改成带刻度的滑杆（每档写仓型名）；
//       空间参考上移到滑杆下方，配 4 档仓位空间示意图（主包已有的 assets/images/units），随容量平滑缩放；
//       容量变大时箱子从上方飘入示意区、变小时飘出（最多同时 flyMax 个，一个定时器收尾，离开页面即清）；数字与底栏容量变化时轻微弹一下。
// IMPL-02（M-14）：示意图换成程序画的尺寸示意插画（仓体长宽高 + 1.7m 人形参照，services/media.sizeIllusSet，4 档淡入切换与缩放照旧）；
//       箱子不再飘过就消失，改为在示意区累计停留：只数由容量决定（core/estimate-viz.boxCount，规则在 config-find.estimate.stageBoxStepsM3），
//       箱位由 core/config-size-illus.js 给出；变多时新箱子落到位后留下，变少时最上面的先飘出再移除（一个收尾定时器，离开页面即清）。
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
const flow = require('../../services/estimate-flow');
const share = require('../../services/share');
const media = require('../../services/media');
const motion = require('../../core/motion');
const viz = require('../../core/estimate-viz');
const SI = require('../../core/config-size-illus');
const R = C.requirement, K = T.cap, ERR = K.err;
const round2 = (n) => Number(Number(n).toFixed(2));
const E = CF.estimate, BUMP = 'mk-bump mk-bump--center';
// 大数字输入框的宽度（rpx）：按字符数估，数字与单位才能作为一组居中；空着时按占位文字的宽度
const numWidth = (raw) => { const t = String(raw || ''); if (!t) return E.numEmptyRpx; let w = E.numPadRpx; for (let i = 0; i < t.length; i++) w += /\d/.test(t[i]) ? E.numDigitRpx : E.numDigitRpx / 2; return Math.min(E.numMaxRpx, w); };
const minOf = (unit) => (unit === 'm2' ? R.areaMinM2 : R.capacityMinM3);
const catName = (m3) => { const c = CF.unitCategories.find((x) => m3 <= x.maxM3) || CF.unitCategories[CF.unitCategories.length - 1]; return T.unitCategories[c.key] || ''; };
// 滑杆刻度：快捷档的值、单位、位置（百分比）、对应仓型名（㎡ 模式按折算后的 m³ 取）
const ticksOf = (unit, v) => R.capacityQuickPicks.map((q, i) => {
  const m3 = unit === 'm2' ? req.validate('m2', String(q)).capacity_m3 : q;
  return { v: q, t: q + (unit === 'm2' ? '㎡' : 'm³'), on: !!(v && v.ok && v.input_value === q), left: Number((E.sliderStops[i] * 100).toFixed(2)), sub: catName(m3) };
});
Page({
  data: {
    T: { cap: pd.plain(K), m3: T.unit.m3, m2: T.unit.m2, hintSub: T.advisor.capHint(C.matching.advisorCapacityM3), advisorCta: T.cta.advisor },
    sys: 'loading', unit: 'm3', raw: '', quick: ticksOf('m3', null), ai: !!E.aiEnabled, numW: E.numEmptyRpx,
    pos: 0, sliding: false, stage: { on: false, s: E.stageScaleMin, key: '', carton: '', bw: 0, bh: 0, imgs: media.sizeIllusSet().map((x) => ({ key: x.key, src: x.base, front: x.front, carton: x.carton, on: false })) }, boxes: [], capBump: '', sumBump: '', term: R.termDefault, hint: '', error: '', approx: '', cartons: '', sales: false, ok: false, ack: '',
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
  onReady() { this.measure(); },
  onUnload() { this._gone = true; if (this._boxTimer) { clearTimeout(this._boxTimer); this._boxTimer = null; } motion.dispose(this); },
  onShareAppMessage() { return share.message(routes.CAPACITY); },
  onRetry() { this.setData({ sys: 'loading' }); pd.load(this, api.getSpaceReference(), (res) => { this._bands = (res && res.bands) || []; this.evaluate(); }); },
  evaluate() {
    const d = this.data, v = req.validate(d.unit, d.raw), est = (state.get().draft || {}).est;
    const error = v.ok || v.error === 'empty' ? '' : (ERR[v.error + '_' + d.unit] || ERR[v.error] || ERR.format);
    const cap = v.ok ? v.capacity_m3 : null, sales = false;
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
    // 尺寸示意：按容量取档；没填或填错时显示最小档的淡图、不放箱子
    const key = v.ok ? media.unitThumbKey(cap) : '', tier = SI.tiers[key], on = (x) => (v.ok ? x.key === key : x.key === d.stage.imgs[0].key);
    const cur = d.stage.imgs.find(on) || d.stage.imgs[0];
    this.setData({
      boxes: this.planBoxes(key, v.ok ? viz.boxCount(cap) : 0),
      ok: v.ok, sales, error,
      approx: v.ok ? (d.unit === 'm2' ? K.approx(req.pretty(v.capacity_m3)) : '') : '', // 只写「约 X m³」，不显示层高（D-178）
      cartons: v.ok ? (sales ? '' : K.cartons(req.cartonCount(v.capacity_m3))) : '',
      hint: v.ok ? (sales ? '' : pricing.nudge(d.term)) : '',
      ack: sales ? (order.inServiceHours(Date.now()) ? K.salesIn : K.salesOff) : '',
      advise: v.ok && cap >= C.matching.largeCapacityFromM3,
      quick: ticksOf(d.unit, v), numW: numWidth(d.raw),
      pos: v.ok ? Number(viz.posOf(v.input_value, minOf(d.unit)).toFixed(4)) : 0,
      stage: { on: v.ok, s: v.ok ? viz.scaleOf(cap) : E.stageScaleMin, key, carton: cur.carton, bw: tier ? tier.boxW : 0, bh: tier ? tier.boxH : 0, imgs: d.stage.imgs.map((x) => Object.assign({}, x, { on: on(x) })) },
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
  onBlur() { const v = req.validate(this.data.unit, this.data.raw); if (v.ok) { this.setData({ raw: String(v.input_value) }); this.evaluate(); } },
  onInput(e) { const raw = String((e.detail && e.detail.value) || ''); this.setData({ raw }); this.touch(raw, this.data.unit); this.evaluate(); },
  onQuick(e) { const raw = String(e.currentTarget.dataset.v), prev = this.capNow(); this.setData({ raw }); this.touch(raw, this.data.unit); this.evaluate(); this.react(prev); },
  // ---- 动效 ----
  capNow() { return this._v && this._v.ok ? this._v.capacity_m3 : 0; },
  // 容量变了：数字与底栏弹一下。prev 是变化前的容量（m³，无效时为 0）。箱子的增减不在这里，由 evaluate 里的 planBoxes 按容量算
  react(prev) { if (this.capNow() !== prev) { motion.bump(this, 'capBump', BUMP); motion.bump(this, 'sumBump'); } },
  // 累计箱子层：返回这一刻该渲染的箱子 [{ i, l, t, cls }]（i = 箱位序号，也是渲染顺序与 wx:key）。n = 目标只数。
  // 只数始终等于 n：正在飘出的排在后面、带 cp-box--out，由唯一的收尾定时器移除；连点时定时器顺延，不叠加。
  // 同一档里已经在位的箱子原样保留（类名不变就不会重播动画）；换档时箱位整体变了，已有的直接换到新箱位，不播动画，上一档正在飘出的直接丢掉。
  planBoxes(key, n) {
    const tier = SI.tiers[key], prev = this.data.boxes || [], same = key === this._boxKey, was = this._boxN || 0;
    const stop = () => { if (this._boxTimer) { clearTimeout(this._boxTimer); this._boxTimer = null; } };
    if (this._gone) return prev;
    if (!tier || !(n > 0)) { stop(); this._boxKey = key; this._boxN = 0; return []; }
    const N = Math.min(n, tier.slots.length), list = [];
    let fresh = 0;
    for (let i = 0; i < N; i++) {
      const old = same ? prev[i] : null, stay = old ? !old.out : (!same && i < was);
      list.push({ i, l: tier.slots[i][0], t: tier.slots[i][1], cls: stay ? (old ? old.cls : '') : 'cp-box--in cp-box--d' + Math.min(fresh++, E.flyBurst - 1) });
    }
    let leaving = 0;
    if (same) for (let i = N; i < prev.length; i++) { list.push(Object.assign({}, prev[i], { out: true, cls: 'cp-box--out' })); leaving++; }
    this._boxKey = key; this._boxN = N;
    stop();
    if (leaving) this._boxTimer = setTimeout(() => { this._boxTimer = null; if (!this._gone) this.setData({ boxes: (this.data.boxes || []).filter((x) => !x.out) }); }, E.flyMs + E.flyStaggerMs);
    return list;
  },
  // ---- 滑杆 ----
  // 轨道的左边界与宽度（px）。量不到时（节点还没渲染）按页边距推算
  measure() {
    const w = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).windowWidth || 375;
    if (!this._rect) this._rect = { left: w * 80 / 750, width: w * (750 - 160) / 750 };
    wx.createSelectorQuery().select('#cp-track').boundingClientRect().exec((res) => { const r = res && res[0]; if (r && r.width > 0) this._rect = { left: r.left, width: r.width }; });
  },
  slideTo(e) {
    const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]); if (!t || !this._rect) return;
    const unit = this.data.unit, next = viz.valueOf((t.clientX - this._rect.left) / this._rect.width, minOf(unit), E.capStepM3), raw = String(next);
    if (raw === this.data.raw) return;
    this.setData({ raw }); this.touch(raw, unit); this.evaluate(); // 箱子只数随容量走（planBoxes），拖多快都不会多出来；数字的弹动留到松手
  },
  onSlideStart(e) { this.measure(); this._slidePrev = this.capNow(); this.setData({ sliding: true }); this.slideTo(e); },
  onSlideMove(e) { if (this.data.sliding) this.slideTo(e); },
  onSlideEnd() {
    if (!this.data.sliding) return;
    this.setData({ sliding: false });
    if (this.capNow() !== this._slidePrev) { motion.bump(this, 'capBump', BUMP); motion.bump(this, 'sumBump'); }
  },
  onStep(e) {
    const dir = e.currentTarget.dataset.dir === 'minus' ? -1 : 1, n = Number(this.data.raw), step = CF.estimate.capStepM3;
    const min = this.data.unit === 'm2' ? R.areaMinM2 : R.capacityMinM3;
    const next = Number.isFinite(n) && this.data.raw !== '' ? Math.max(min, round2(n + dir * step)) : (dir > 0 ? Math.max(min, step) : min);
    const prev = this.capNow();
    this.setData({ raw: String(next) }); this.touch(String(next), this.data.unit); this.evaluate(); this.react(prev);
  },
  onRestore() { // 恢复为物品估算值
    const d = state.get().draft || {};
    if (!d.est) return;
    const raw = String(Math.max(R.capacityMinM3, d.est.rec));
    this._stamp = Date.now();
    state.patch('draft', { source: 'items', capacity_raw: raw, unit: 'm3', stamp: this._stamp });
    const prev = this.capNow();
    this.setData({ unit: 'm3', raw, src: 'items' }); this.evaluate(); this.react(prev);
  },
  onTerm(e) { this.setData({ term: e.detail.months }); state.patch('draft', { term: e.detail.months }); this.evaluate(); },
  onItems() { const pages = getCurrentPages(); if (pages.length > 1 && '/' + pages[pages.length - 2].route === routes.ITEMS) wx.navigateBack(); else wx.navigateTo({ url: routes.ITEMS }); },
  onAdvisor() { wx.navigateTo({ url: routes.BOOKING + '?mode=advisor' }); },
  onAi() { pd.toast(K.aiToast); }, // AI 估算不实现（D-133）；入口只在 aiEnabled 打开时渲染
  onSeeRef() { wx.pageScrollTo({ selector: '#cp-ref', duration: 200, fail: () => {} }); },
  onSubmit() {
    if (!this.data.ok) return;
    const d = this.data, v = this._v;
    const est = (state.get().draft || {}).est;
    const need = { capacity_m3: v.capacity_m3, input_unit: d.unit, input_value: v.input_value, input_raw: String((state.get().draft || {}).capacity_raw || v.input_raw), source: 'manual', term_months: d.term };
    if (d.src === 'items' && est) { need.source = 'items'; need.est = est; } // 仍是物品估算值：仓位推荐页写明估算关系
    state.setRequirement(need);
    this.setData({ raw: String(v.input_value) });
    if (flow.finish()) return; // 从附近门店 / 门店详情来估算：回到出发页（FIX-01 R-19）
    const pages = getCurrentPages();
    if (pages.length > 1 && '/' + pages[pages.length - 2].route === routes.MATCH) wx.navigateBack(); else wx.redirectTo({ url: routes.MATCH });
  }
});
