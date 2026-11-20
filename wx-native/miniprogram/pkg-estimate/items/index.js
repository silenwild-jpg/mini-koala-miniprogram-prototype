// 按物品估算 ITEMS（第 1 批，分包 estimate）。
// 已做：进页就是物品列表（39 项，经接口取）；按物品分类 / 按场景分类两种左栏；搜索与搜不到的三个出路（查看全部物品 / 直接填写容量 / 顾问协助）；
//       数量加减、点数字直接输入（10 / 20 / 50 快捷量，上限 999，超限「确定」不可点）；规格底部弹层（换规格数量不变）；
//       已选清单抽屉（增减、删除、清空确认、长件提示、超过 15m³ 的顾问提示、建议容量）；
//       长件提示（只提示对照仓位长宽高，不判断能否放入）；估算说明句（不出现「装载系数」）；不足 0.5m³ 按 0.5m³ 匹配；
//       底栏常驻「物品约 X m³ · N 件 / 建议 Y m³」+ 租期 + 主按钮；达到 30m³（含超过 200m³）主按钮「提交给顾问」；
//       商家 / 办公分类下的企业用仓引导；顾问协助；AI 估算占位（D-133）；「直接填容量」；
//       与填容量页共用草稿（清单、容量来源、租期），回来时提示「已保留上次选择的物品，可继续增减」；加载 / 失败 / 断网。
// 未做：物品图片（素材没有随包，用分类字块代替，冻结稿对无图物品也是这样处理）。
// 体积算法在 core/volume.js（MK-VOL v0.2，D-143）；物品目录经 services/api 的 getItemCatalog 取。
// 清单保留到手动清空；「提交订单成功后清空」要由交易域在下单成功时清 state.draft.items（见交付报告）。
const C = require('../../core/config');
const T = require('../../i18n/find');
const Z = require('../../i18n/zh');
const volume = require('../../core/volume');
const requirement = require('../../core/requirement');
const matching = require('../../core/matching');
const pricing = require('../../core/pricing');
const state = require('../../services/state');
const api = require('../../services/api');
const auth = require('../../services/auth');
const routes = require('../../services/routes');
const pd = require('../../services/page-data');
const R = C.requirement, I = T.items;
const CAT_ICON = { all: 'grid-ink', suitcase: 'bag-ink', furniture: 'sofa-ink', electric: 'plug-ink', organize: 'box-ink', hobby: 'star-ink', business: 'store-ink', office: 'office-ink', other: 'tag-ink' };
const SCENE_ICON = { moving: 'sofa-ink', home: 'box-ink', luggage: 'bag-ink', hobby: 'star-ink', business: 'store-ink', office: 'office-ink' };
const BIZ = { business: 1, office: 1, scene_business: 1, scene_office: 1 };
const group = (s) => String(s).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fix = (v, n) => { const p = String(Number((Math.round((v + Number.EPSILON) * Math.pow(10, n)) / Math.pow(10, n)).toFixed(n))).split('.'); return group(p[0]) + (p[1] ? '.' + p[1] : ''); };
const disp2 = (v) => fix(v, 2);                              // 单品体积最多两位小数
const disp1 = (v) => (v > 0 && v < 0.1 ? disp2(v) : fix(v, 1)); // 小计 / 合计 / 建议容量精度 0.1
Page(auth.guarded(routes.ITEMS, {
  data: {
    T: { i: pd.plain(I), month: T.unit.month, piece: T.unit.piece, advHint: T.advisor.capHint(C.matching.advisorCapacityM3), termTitle: I.termTitle, confirm: Z.common.confirm },
    sys: 'loading', mode: 'items', rail: [], listTitle: I.all, listCount: '', sceneDesc: '', bizGuide: false, search: '', rows: [], emptySearch: false,
    selectedText: '', longHint: '', estNote: '', footTop: I.footNone, footBig: I.zero, term: R.termDefault, showTerm: false, btnText: I.pickFirst, btnOff: true,
    cartVisible: false, cartTitle: '', cartRows: [], cartAdvHint: false, cartTotal: '', cartTotalSub: '',
    variantVisible: false, variantNote: '', variantOptions: [],
    qtyVisible: false, qtyName: '', qtyRaw: '', qtyBad: false, qtyErr: I.qtyMax(R.itemQtyMax), qtyQuick: R.itemQtyQuick.map((n) => ({ n, t: I.qtyQuick(n) })),
    advisoryVisible: false, termVisible: false
  },
  onLoad() {
    this._count = {}; this._var = {}; this._by = {}; this._items = []; this._category = 'all';
    this.load();
  },
  load() {
    return pd.load(this, api.getItemCatalog(), (cat) => {
      this._cat = cat; this._items = cat.items || []; this._by = {};
      this._items.forEach((x) => { this._by[x.id] = x; if (!this._var[x.id]) this._var[x.id] = x.defaultVariant; });
      // 两页共用的草稿：清单与租期带回
      const s = state.get(), d = s.draft || {};
      let restored = false;
      (d.items || []).forEach((l) => { const x = this._by[l.id]; if (!x || !(l.count > 0)) return; this._count[l.id] = Math.min(R.itemQtyMax, Math.round(l.count)); if (x.variants.some((v) => v.id === l.variant)) this._var[l.id] = l.variant; restored = true; });
      const term = d.term || (s.requirement && s.requirement.term_months) || R.termDefault;
      this.setData({ term });
      this.paint();
      if (restored && !this._told) { this._told = true; pd.toast(I.restored); }
    });
  },
  onRetry() { this.setData({ sys: 'loading' }); this.load(); },
  // ---- 计算 ----
  variantOf(x) { const vs = (x && x.variants) || []; return vs.find((v) => v.id === this._var[x.id]) || vs[0] || { id: '', name: '', volume_m3: 0 }; },
  summary() {
    const sel = (this._items || []).filter((x) => this._count[x.id] > 0);
    const rec = volume.recommend(sel.map((x) => ({ id: x.id, category: x.category, volume_m3: this.variantOf(x).volume_m3, count: this._count[x.id] })));
    const net = sel.reduce((n, x) => n + this._count[x.id] * this.variantOf(x).volume_m3, 0);
    const v = rec.recommended;
    return { sel, net, rec: v, kinds: sel.length, count: sel.reduce((n, x) => n + this._count[x.id], 0), long: sel.filter((x) => x.long).map((x) => x.name), tiny: v > 0 && v < R.capacityMinM3, sales: v > 0 && matching.salesOnly(v), valid: v > 0 };
  },
  paint() {
    const cat = this._cat;
    if (!cat) return;
    const d = this.data, scenes = d.mode === 'scenes', s = this.summary();
    const nav = scenes ? cat.scenes.map((x) => ({ id: 'scene_' + x.id, name: x.name, icon: SCENE_ICON[x.id] || 'box-ink' })) : [{ id: 'all', name: I.all, icon: CAT_ICON.all }].concat(cat.categories.map((c) => ({ id: c.id, name: c.name, icon: CAT_ICON[c.id] || 'box-ink' })));
    if (!nav.some((n) => n.id === this._category)) this._category = nav[0].id;
    const cur = nav.find((n) => n.id === this._category), scene = scenes ? cat.scenes.find((x) => 'scene_' + x.id === this._category) : null;
    let arr = scene ? scene.items.map((id) => this._by[id]).filter(Boolean) : this._category === 'all' ? this._items : this._items.filter((x) => x.category === this._category);
    const k = String(d.search || '').trim().toLowerCase();
    if (k) arr = arr.filter((x) => (x.name + ' ' + x.description + ' ' + x.variants.map((v) => v.name).join(' ')).toLowerCase().indexOf(k) >= 0);
    const rows = arr.map((x) => {
      const n = this._count[x.id] || 0, v = this.variantOf(x), multi = x.variants.length > 1;
      return { id: x.id, name: x.name, abbr: I.abbr[x.category] || I.abbr.other, multi, variantText: multi ? I.variant(v.name) : '', desc: multi ? '' : x.description, per: I.per(disp2(v.volume_m3), x.unit === 'box' ? T.unit.box : T.unit.piece), sub: n ? I.subtotal(disp1(n * v.volume_m3)) : '', n };
    });
    const est = { rec: s.rec, net: Number(s.net.toFixed(3)), netText: disp1(s.net), recText: disp1(s.rec), kinds: s.kinds, count: s.count, long: s.long, tiny: s.tiny };
    this._est = est;
    this.setData({
      rail: nav.map((n) => Object.assign({ on: n.id === this._category }, n)),
      listTitle: k ? I.result : cur.name, listCount: I.count(rows.length), sceneDesc: scene ? scene.description : '', bizGuide: !!BIZ[this._category],
      rows, emptySearch: rows.length === 0,
      selectedText: s.kinds ? I.selected(s.kinds, s.count) : '', longHint: s.long.length ? I.longHint(s.long.join('、')) : '',
      estNote: rows.length && s.kinds ? (s.tiny ? I.tinyNote(disp1(s.net)) : I.estNote(disp1(s.net), disp1(s.rec))) : '',
      footTop: s.kinds ? I.footNet(disp1(s.net), s.count) : I.footNone, footBig: s.tiny ? I.tiny : s.valid ? I.suggest(disp1(s.rec)) : I.zero,
      showTerm: s.valid && !s.sales, btnText: !s.valid ? I.pickFirst : s.sales ? I.toAdvisor : I.submit, btnOff: !s.valid,
      cartTitle: I.cart.title(s.kinds, s.count), cartAdvHint: s.rec > C.matching.advisorCapacityM3 && !s.sales, cartTotal: disp1(s.rec) + 'm³', cartTotalSub: I.cart.totalSub(disp1(s.net)),
      cartRows: s.sel.map((x) => { const v = this.variantOf(x), n = this._count[x.id]; return { id: x.id, name: x.name, abbr: I.abbr[x.category] || I.abbr.other, line: I.cart.line(v.name, n, disp1(n * v.volume_m3)), n }; })
    });
  },
  // 清单变了：写回共用草稿，容量来源记为「物品估算」（最后一次修改生效，D-142）
  commit() {
    this.paint();
    const e = this._est || {};
    state.patch('draft', { items: Object.keys(this._count).filter((id) => this._count[id] > 0).map((id) => ({ id, variant: this._var[id], count: this._count[id] })), source: e.rec > 0 ? 'items' : 'manual', est: e.rec > 0 ? e : null, term: this.data.term, stamp: Date.now() });
  },
  setCount(id, n) { if (!this._by || !this._by[id]) return false; this._count[id] = Math.max(0, Math.min(R.itemQtyMax, Math.round(Number(n) || 0))); this.commit(); return true; },
  // ---- 列表 ----
  onMode(e) { const m = e.currentTarget.dataset.m === 'scenes' ? 'scenes' : 'items'; if (m !== this.data.mode) { this.setData({ mode: m, search: '' }); this._category = ''; this.paint(); } },
  onCat(e) { const id = e.currentTarget.dataset.id; if (!this.data.rail.some((x) => x.id === id)) return; this._category = id; this.paint(); wx.pageScrollTo({ scrollTop: 0, duration: 0 }); },
  onSearchInput(e) { this.setData({ search: String((e.detail && e.detail.value) || '') }); this.paint(); },
  onSearchClear() { this.setData({ search: '' }); this.paint(); },
  onResetSearch() { this.setData({ search: '', mode: 'items' }); this._category = 'all'; this.paint(); },
  onStep(e) { const ds = e.currentTarget.dataset, id = ds.id; this.setCount(id, (this._count[id] || 0) + (ds.d === 'minus' ? -1 : 1)); },
  // ---- 数量：点数字直接输入 ----
  onQty(e) { const x = this._by && this._by[e.currentTarget.dataset.id]; if (!x) return; this._qtyId = x.id; this.setData({ qtyVisible: true, qtyName: x.name, qtyRaw: String(this._count[x.id] || 0), qtyBad: false }); },
  onQtyInput(e) { const raw = String((e.detail && e.detail.value) || ''); this.setData({ qtyRaw: raw, qtyBad: !/^\d*$/.test(raw) || Number(raw) > R.itemQtyMax }); },
  onQtyQuick(e) { const n = Number(e.currentTarget.dataset.n) || 0; this.setData({ qtyRaw: String(n), qtyBad: n > R.itemQtyMax }); },
  onQtyCancel() { this.setData({ qtyVisible: false }); },
  onQtyOk() { if (this.data.qtyBad) return; if (this._qtyId) this.setCount(this._qtyId, Number(this.data.qtyRaw) || 0); this.setData({ qtyVisible: false }); },
  // ---- 规格 ----
  onVariant(e) {
    const x = this._by && this._by[e.currentTarget.dataset.id]; if (!x || x.variants.length < 2) return;
    this._variantId = x.id;
    this.setData({ variantVisible: true, variantNote: I.variantNote(x.name), variantOptions: x.variants.map((v) => ({ id: v.id, name: v.name, per: I.variantPer(disp2(v.volume_m3)), on: v.id === this._var[x.id] })) });
  },
  onPickVariant(e) { const x = this._by && this._by[this._variantId], v = e.currentTarget.dataset.v; if (x && x.variants.some((y) => y.id === v)) { this._var[x.id] = v; this.commit(); } this.setData({ variantVisible: false }); }, // 换规格数量不变
  onVariantClose() { this.setData({ variantVisible: false }); },
  // ---- 清单抽屉 ----
  onCart() { this.setData({ cartVisible: true }); },
  onCartClose() { this.setData({ cartVisible: false }); },
  onDel(e) { this.setCount(e.currentTarget.dataset.id, 0); },
  onClear() {
    if (!this.data.cartRows.length) return;
    wx.showModal({ title: I.clearTitle, content: I.clearBody, confirmText: I.clearYes, cancelText: I.cancel, success: (r) => { if (r && r.confirm) { this._count = {}; this.commit(); } } });
  },
  // ---- 租期（底栏）----
  onTermOpen() { this.setData({ termVisible: true }); },
  onTermClose() { this.setData({ termVisible: false }); },
  onTerm(e) { const m = e.detail && e.detail.months; if (!pricing.isTerm(m)) return; this.setData({ term: m }); state.patch('draft', { term: m }); },
  // ---- 出口 ----
  onToCap() { const pages = getCurrentPages(); if (pages.length > 1 && '/' + pages[pages.length - 2].route === routes.CAPACITY) wx.navigateBack(); else wx.navigateTo({ url: routes.CAPACITY }); },
  onAdvisor() { wx.navigateTo({ url: routes.BOOKING + '?mode=advisor' }); },
  onAi() { pd.toast(I.aiToast); }, // AI 估算保留占位，不实现（D-133）
  onBusiness() { wx.navigateTo({ url: routes.BUSINESS }); },
  onSubmit() {
    const s = this.summary();
    if (!s.valid) return;
    const bulky = s.sel.filter(x => x.bulky || x.long || R.bulkyItemIds.includes(x.id)).map(x => x.id);
    const noticeKey = JSON.stringify([s.rec, bulky]);
    if (requirement.itemsReminder(s.rec, bulky.length > 0) && this._noticeKey !== noticeKey) { this._noticeKey = noticeKey; this.setData({ advisoryVisible: true }); return; }
    const cap = Math.max(R.capacityMinM3, s.rec); // 不足 0.5m³ 按 0.5m³ 匹配，不拦截
    state.setRequirement({ capacity_m3: cap, input_unit: 'm3', input_value: cap, source: 'items', term_months: this.data.term, est: this._est });
    const pages = getCurrentPages();
    if (pages.length > 1 && '/' + pages[pages.length - 2].route === routes.MATCH) wx.navigateBack(); else wx.navigateTo({ url: routes.MATCH });
  },
  onAdvisoryClose() { this.setData({ advisoryVisible: false }); },
  onAdvisoryContinue() { this.setData({ advisoryVisible: false }); this.onSubmit(); },
  onLongInfo() { wx.showModal({ title: '长件尺寸', content: this.data.longHint, showCancel: false }); },
  noop() {}
}));
