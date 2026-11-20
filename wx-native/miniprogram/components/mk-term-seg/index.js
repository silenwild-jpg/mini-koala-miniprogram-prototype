// 统一租期组件（D-141）：一行 1 / 3 / 6 / 12 个月 +「其他」，折扣写在右上角标；
//「其他」打开底部弹层（步进 1–60，快捷 18 / 24 / 36）。全站只有这一个租期组件。
// inline：组件本身已经放在弹层里时（修改需求弹层、物品页租期层），「其他」在原处展开步进器，不再叠第二个弹层。
// allowUnsure 只有预约页用（「暂不确定」）。hint 是租期下方的引导句，由页面按 core/pricing.nudge 计算后传入。
const C = require('../../core/config');
const pricing = require('../../core/pricing');
const T = require('../../i18n/zh');
const R = C.requirement;
Component({
  options: { addGlobalClass: true },
  properties: {
    value: { type: null, value: null }, // 整数月数；'unsure'；null = 未选
    allowUnsure: { type: Boolean, value: false },
    hint: { type: String, value: '' },
    inline: { type: Boolean, value: false }
  },
  data: { T: T.term, confirmText: T.common.confirm, rangeText: T.term.range.replace('{min}', R.termMin).replace('{max}', R.termMax), cells: [], otherOn: false, otherLabel: T.term.other, otherBadge: '', sheet: false, expand: false, draft: 18, draftBadge: '', quick: R.termOtherQuick, canMinus: true, canPlus: true },
  observers: { value() { this.render(); } },
  lifetimes: { attached() { this.render(); } },
  methods: {
    render() {
      const v = this.data.value;
      const otherOn = Number.isInteger(v) && R.termPresets.indexOf(v) < 0;
      this.setData({
        cells: R.termPresets.map((m) => ({ m, label: m + T.term.unit, badge: pricing.termDiscountLabel(m), on: v === m })),
        otherOn, otherLabel: otherOn ? v + T.term.unit : T.term.other, otherBadge: otherOn ? pricing.termDiscountLabel(v) : ''
      });
    },
    onPick(e) { if (this.data.expand) this.setData({ expand: false }); this.emit(Number(e.currentTarget.dataset.m)); },
    onUnsure() { this.triggerEvent('change', { months: null, unsure: true }); },
    onOther() {
      const v = this.data.value, other = Number.isInteger(v) && R.termPresets.indexOf(v) < 0;
      this.setDraft(other ? v : R.termOtherQuick[0]);
      if (!this.data.inline) { this.setData({ sheet: true }); return; }
      this.setData({ expand: true }); if (!other) this.emit(this.data.draft); // 原处展开：选中即生效
    },
    setDraft(n) { const d = Math.min(R.termMax, Math.max(R.termMin, Math.round(Number(n)) || R.termMin)); this.setData({ draft: d, draftBadge: pricing.termDiscountLabel(d), canMinus: d > R.termMin, canPlus: d < R.termMax }); },
    onMinus() { this.setDraft(this.data.draft - 1); this.live(); },
    onPlus() { this.setDraft(this.data.draft + 1); this.live(); },
    onQuick(e) { this.setDraft(e.currentTarget.dataset.m); this.live(); },
    live() { if (this.data.inline && this.data.expand) this.emit(this.data.draft); },
    onCloseSheet() { this.setData({ sheet: false }); },
    onConfirm() { this.setData({ sheet: false }); this.emit(this.data.draft); },
    emit(m) { if (pricing.isTerm(m)) this.triggerEvent('change', { months: m, unsure: false }); }
  }
});
