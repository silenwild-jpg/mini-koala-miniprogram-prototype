// 用仓位置面板（D-127、D-130，A 期不接地图）。全站四处（首页与门店列表城市位、仓位推荐、快捷下单）打开同一个面板、读写同一份位置。
// 已做：搜索（门店名 / 小区 / 地址 / 商圈 / 区域，结果分「商圈与区域」「门店」两组）、当前位置行、最近使用（最近 3 个，存本机，可清除）、
//       城市、按区域、按商圈（带门店数，商圈默认 8 个其余展开）、无结果三个出口（商圈标签 / 考拉E存 / 留下用仓需求）、
//       搬家提示（属性 move，或从首页「搬家过渡」场景进入后自动带出）、「免费运输」带来的说明句（note）。
// 定位不可用时（服务类目未开通、被拒、超时）下面的城市 / 区域 / 商圈照常可选，不依赖定位。
// 未做：B 期的地点联想、距离带参照物（等地图服务）。
// 属性 safeTop：自定义导航栏的页面（首页）传状态栏高度，避开状态栏。
const T = require('../../i18n/find');
const CF = require('../../core/config-find');
const state = require('../../services/state');
const api = require('../../services/api');
const location = require('../../services/location');
const routes = require('../../services/routes');
const P = T.panel;
const EMPTY = { cities: [], districts: [], areas: [], stores: [] };
const LEAVE_MS = 260; // 与 --mk-motion-sheet、mk-sheet 一致
Component({
  options: { addGlobalClass: true },
  properties: { visible: { type: Boolean, value: false }, note: { type: String, value: '' }, move: { type: Boolean, value: false }, safeTop: { type: Number, value: 0 }, focus: { type: Boolean, value: false } },
  data: {
    T: { placeholder: P.placeholder, cancel: P.cancel, useCurrent: P.useCurrent, useCurrentSub: P.useCurrentSub, current: P.current, relocate: P.relocate, recents: P.recents, clear: P.clear, city: P.city, groupArea: P.groupArea, groupStore: P.groupStore, noneSub: P.noneSub, other: P.other, estore: T.estore.name, estoreSub: P.estoreSub, leave: P.leave, leaveSub: P.leaveSub, moveNote: P.moveNote },
    show: false, open: false, // show = 是否渲染，open = 是否处于展开位置（进出场，写法同 mk-sheet）
    showMove: false, query: '', city: '', cities: [], recents: [], located: false, pointLabel: '', locateAction: P.enable, sel: '',
    districts: [], areas: [], areaMore: '', byDistrict: '', byArea: '', showAll: false,
    searching: false, resAreas: [], resStores: [], none: false, noneTitle: '', noneAreasTitle: '', noneAreas: []
  },
  observers: {
    visible(v) {
      // 进出场：快速开关以最后一次 visible 为准；组件卸载后延时回调不再写数据
      if (this._t) { clearTimeout(this._t); this._t = null; }
      if (v) {
        this.setData({ show: true, query: '', searching: false, showAll: false }); this.refresh();
        this._t = setTimeout(() => { this._t = null; if (!this._gone) this.setData({ open: true }); }, 30);
      } else if (this.data.show) {
        this.setData({ open: false });
        this._t = setTimeout(() => { this._t = null; if (!this._gone) this.setData({ show: false }); }, LEAVE_MS);
      }
    }
  },
  lifetimes: { detached() { this._gone = true; if (this._t) { clearTimeout(this._t); this._t = null; } } },
  methods: {
    noop() {},
    refresh() {
      const s = state.get(), loc = s.location, h = location.hint();
      this.setData({ showMove: !!this.data.move || !!(s.flags && s.flags.moving), city: loc.city, recents: s.recents || [], located: loc.status === 'granted', pointLabel: loc.pointLabel || P.current, locateAction: h ? h.action : P.relocate, sel: loc.kind === 'district' || loc.kind === 'area' ? loc.label : '' });
      this._hint = h;
      return api.getLocationIndex({ city: loc.city }).then((idx) => { this._idx = idx; this.render(); }).catch(() => { this._idx = EMPTY; this.render(); });
    },
    render() {
      const idx = this._idx || EMPTY, d = this.data, n = d.showAll ? idx.areas.length : CF.panel.areaChipsDefault;
      const cities = idx.cities.length ? idx.cities : [{ name: d.city }];
      this.setData({
        cities: cities.map((c) => ({ name: c.name, on: c.name === d.city && !d.sel })),
        districts: idx.districts.map((x) => ({ name: x.name, count: x.count, on: x.name === d.sel })),
        areas: idx.areas.slice(0, n).map((x) => ({ name: x.name, count: x.count, on: x.name === d.sel })),
        areaMore: idx.areas.length > n ? P.allAreas(idx.areas.length) : '',
        byDistrict: P.byDistrict(d.city), byArea: P.byArea(d.city)
      });
      this.search();
    },
    search() {
      const idx = this._idx || EMPTY, k = String(this.data.query || '').trim();
      if (!k) { this.setData({ searching: false, resAreas: [], resStores: [], none: false }); return; }
      const has = (v) => String(v || '').indexOf(k) >= 0;
      const resAreas = idx.areas.filter((a) => has(a.name)).map((a) => ({ key: 'a-' + a.name, kind: 'area', name: a.name, tag: P.kindArea, sub: P.storeCount(a.count) }))
        .concat(idx.districts.filter((a) => has(a.name)).map((a) => ({ key: 'd-' + a.name, kind: 'district', name: a.name, tag: P.kindDistrict, sub: P.storeCount(a.count) })));
      const resStores = idx.stores.filter((s) => has(s.name) || has(s.community) || has(s.address)).slice(0, CF.panel.searchStoreMax)
        .map((s) => ({ id: s.id, name: s.name, sub: [s.district, s.community].filter(Boolean).join(' · ') }));
      const none = !resAreas.length && !resStores.length;
      this.setData({
        searching: true, resAreas, resStores, none, noneTitle: none ? P.noneTitle(k) : '', noneAreasTitle: P.areasWithStores(this.data.city),
        noneAreas: none ? idx.areas.slice(0, CF.panel.areaChipsDefault).map((x) => ({ name: x.name, count: x.count })) : []
      });
    },
    onInput(e) { this.setData({ query: String((e.detail && e.detail.value) || '') }); this.search(); },
    onClearQuery() { this.setData({ query: '' }); this.search(); },
    onAllAreas() { this.setData({ showAll: true }); this.render(); },
    onClose() { this.triggerEvent('close'); },
    onCity(e) { const city = e.currentTarget.dataset.city; if (!city) return; state.setLocation({ city, kind: 'city', label: '', noStoreCity: '' }); this.done(); },
    // 区域 / 商圈：用仓位置 = 城市 + 该范围
    onPick(e) { const d = e.currentTarget.dataset; if (!d.name || (d.kind !== 'district' && d.kind !== 'area')) return; state.setLocation({ kind: d.kind, label: String(d.name), noStoreCity: '' }); this.done(); },
    onStorePick(e) {
      const s = ((this._idx || EMPTY).stores || []).find((x) => x.id === e.currentTarget.dataset.id);
      if (!s) return;
      state.setLocation({ kind: 'store', label: s.name, storeId: s.id, noStoreCity: '' }); this.done();
    },
    onRecent(e) { const r = this.data.recents[Number(e.currentTarget.dataset.i) || 0]; if (r) { state.setLocation({ city: r.city, kind: r.kind, label: r.label, noStoreCity: '' }); this.done(); } },
    onClearRecents() { state.set('recents', []); this.setData({ recents: [] }); },
    // 当前位置行：未定位 → 开启（被拒后只引导去设置页）；已定位 → 重新定位
    onLocate() { location.act(this._hint ? this._hint.kind : 'retry').then((st) => { if (st === 'granted') this.done(); else this.refresh(); }); },
    onUsePoint() { // 已定位时点整行：用仓位置切回定位点
      const loc = state.get().location;
      if (loc.status !== 'granted') { this.onLocate(); return; }
      if (loc.noStoreCity || !loc.pointLabel) { this.onLocate(); return; }
      state.patch('location', { kind: 'point', label: loc.pointLabel }); this.done();
    },
    onEstore() { this.triggerEvent('close'); wx.navigateTo({ url: routes.ESTORE }); },
    onLeave() { this.triggerEvent('close'); wx.navigateTo({ url: routes.BOOKING + '?mode=advisor' }); },
    done() { this.triggerEvent('change', { location: state.get().location }); this.triggerEvent('close'); }
  }
});
