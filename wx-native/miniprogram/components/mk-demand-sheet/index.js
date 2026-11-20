// 修改需求弹层（冻结稿 S01 / S02 / S5 的 overlay=demand）：容量或面积 + 租期，写回全站唯一的一份需求。
// 按原单位打开（按面积填的需求以 ㎡ 打开，D-178 只写「约 X m³」不写层高）。租期用全站统一组件。
// 达到 30m³ 不写入自助需求，抛 sales 事件由页面带去顾问表单（与填容量页同一规则，D-101）。
// cold = 还没有需求时的「填写需求」形态（带「不确定大小？去估算」）。
const T = require('../../i18n/find');
const C = require('../../core/config');
const req = require('../../core/requirement');
const pricing = require('../../core/pricing');
const state = require('../../services/state');
const routes = require('../../services/routes');
const D = T.demand;
Component({
  options: { addGlobalClass: true },
  properties: { visible: { type: Boolean, value: false }, cold: { type: Boolean, value: false }, rangeNote: { type: Boolean, value: false } },
  data: { T: { capLabel: D.capLabel, termLabel: D.termLabel, toEstimate: D.toEstimate, cancel: D.cancel, m3: T.unit.m3, m2: T.unit.m2 }, title: D.title, note: D.note, submitText: D.update, unit: 'm3', raw: '', term: C.requirement.termDefault, approx: '', error: '', hint: '' },
  observers: { visible(v) { if (v) this.open(); } },
  methods: {
    open() {
      const r = state.get().requirement, cold = this.data.cold || !r;
      const unit = !cold && r.input_unit === 'm2' ? 'm2' : 'm3';
      this.setData({
        title: cold ? D.coldTitle : D.title, note: '', submitText: cold ? D.view : D.update,
        unit, raw: cold ? '' : String(unit === 'm2' ? r.input_value : r.capacity_m3), term: cold ? C.requirement.termDefault : (r.term_months || C.requirement.termDefault), error: ''
      });
      this.evaluate();
    },
    evaluate() {
      const d = this.data, v = req.validate(d.unit, d.raw);
      this._v = v;
      this.setData({ approx: v.ok && d.unit === 'm2' ? D.approx(req.pretty(v.capacity_m3)) : '', hint: v.ok && !v.sales ? pricing.nudge(d.term) : '' });
    },
    onInput(e) { this.setData({ raw: String((e.detail && e.detail.value) || ''), error: '' }); this.evaluate(); },
    onUnit(e) { const unit = e.currentTarget.dataset.u === 'm2' ? 'm2' : 'm3'; if (unit !== this.data.unit) { this.setData({ unit, raw: '', error: '' }); this.evaluate(); } },
    onTerm(e) { const m = e.detail && e.detail.months; if (pricing.isTerm(m)) { this.setData({ term: m }); this.evaluate(); } },
    onEstimate() { this.triggerEvent('close'); wx.navigateTo({ url: routes.CAPACITY }); },
    onClose() { this.triggerEvent('close'); },
    onSubmit() {
      const d = this.data, v = req.validate(d.unit, d.raw);
      if (!v.ok) { this.setData({ error: d.unit === 'm2' ? D.errArea : D.errCap }); return; }
      const draft = state.get().draft || {};
      if (draft.source === 'items') state.patch('draft', { source: 'edited', capacity_raw: d.raw, unit: d.unit }); // 物品估算带来的容量被手改：清单保留
      state.setRequirement({ capacity_m3: v.capacity_m3, input_unit: d.unit, input_value: v.input_value, input_raw: v.input_raw, source: 'manual', term_months: d.term });
      this.triggerEvent('change', { requirement: state.get().requirement });
      this.triggerEvent('close');
    }
  }
});
