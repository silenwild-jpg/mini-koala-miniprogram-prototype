// 用仓需求卡（交接 v1.0 §3「同一组件同一数据」）：首页、「我的」、找仓进度三处共用，读全站唯一的一份需求（services/state）。
// 无属性即可用；没有需求时自己不渲染。mode="hidden"：首页的订单任务卡已在待办条带里列出找仓进度时不重复显示；mode="strip"：一行的紧凑形态。
// 按面积填的需求写「2㎡ / 预计面积 · 约4.8m³」（D-178，不写层高）。
// 未做：「已选仓位 · 继续完成选仓」态（选中但未下单的仓位属于交易域的草稿，本组件读不到）。
const T = require('../../i18n/find');
const state = require('../../services/state');
const routes = require('../../services/routes');
const req = require('../../core/requirement');
Component({
  options: { addGlobalClass: true },
  properties: { mode: { type: String, value: 'card' } }, // card | strip | hidden
  data: { T: { kicker: T.need.kicker, title: T.need.title, badge: T.need.badge, sub: T.need.sub, modify: T.need.modify, view: T.need.view, termLabel: T.need.termLabel }, has: false, capNum: '', capUnit: '', capLabel: '', termNum: '', termUnit: T.unit.month, stripText: '' },
  lifetimes: {
    attached() { this.sync(); this._off = state.on((topic) => { if (topic === 'requirement' || topic === '*') this.sync(); }); },
    detached() { if (this._off) { this._off(); this._off = null; } }
  },
  pageLifetimes: { show() { this.sync(); } },
  methods: {
    sync() {
      const r = state.get().requirement;
      if (!r || !(Number(r.capacity_m3) > 0)) { this.setData({ has: false }); return; }
      const m2 = r.input_unit === 'm2' && Number(r.input_value) > 0;
      this.setData({
        has: true,
        capNum: req.pretty(m2 ? r.input_value : r.capacity_m3), capUnit: m2 ? T.unit.m2 : T.unit.m3,
        capLabel: m2 ? T.need.areaLabel(req.pretty(r.capacity_m3)) : T.need.capLabel,
        termNum: String(r.term_months), 
        stripText: req.demandText(r) + ' · ' + r.term_months + T.unit.month + (m2 ? '' : T.need.stripTail) // ㎡ 需求多一段「约X m³」，尾句省略
      });
    },
    refresh() { this.sync(); },
    onView() { wx.navigateTo({ url: routes.MATCH }); },
    onModify() { wx.navigateTo({ url: routes.CAPACITY }); }
  }
});
