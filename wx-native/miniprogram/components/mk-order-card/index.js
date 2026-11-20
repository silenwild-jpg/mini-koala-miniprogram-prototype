// 订单摘要卡（W34 交易域）：门店、仓位名、第二行尺寸、租期、起止日。确认订单、订单详情、订单列表、租后各页用同一个组件读同一份订单。
// 属性：
//   order     订单对象（core/order-model 的结构）。确认订单页下单前传「草稿」{ store, units, months, lease:{start} }，同样可用。
//   variant   'detail'（默认：门店 + 仓位 + 租期 + 起止日）| 'list'（订单列表卡：门店、订单号、阶段标签、仓位 · 租期、金额）
//   show-km   门店行带公里数（确认订单页）
//   swap      仓位行右侧的文字按钮（如「更换」「更换仓位」）；空 = 不显示。点击触发 swap 事件
//   editable  租期显示为 − / + 步进、日期可选（下单前）。触发 term { months }、date { value: 'YYYY-MM-DD' }
//   hint      租期行下方的引导句（一处只出一句，由页面用 core/pricing.nudge 算好传入）
//   dead      已超时 / 已取消：标题「原订单仓位」，整卡减淡
// 没有门店实拍与仓位图数据，照片位用图标占位。
const C = require('../../core/config');
const CT = require('../../core/config-trade');
const T = require('../../i18n/trade');
const view = require('../../services/order-view');
Component({
  options: { addGlobalClass: true },
  properties: {
    order: { type: Object, value: null },
    variant: { type: String, value: 'detail' },
    showKm: { type: Boolean, value: false },
    swap: { type: String, value: '' },
    editable: { type: Boolean, value: false },
    hint: { type: String, value: '' },
    dead: { type: Boolean, value: false }
  },
  data: { T: T.card, v: null, canMinus: false, canPlus: false, startMin: '', startMax: '' },
  observers: { 'order, showKm': function () { this.render(); } },
  lifetimes: { attached() { this.render(); } },
  methods: {
    render() {
      const o = this.data.order, now = Date.now();
      const v = view.card(o, now, { showKm: this.data.showKm });
      const R = C.requirement, m = v ? Number(v.months) : 0;
      this.setData({ v, canMinus: m > R.termMin, canPlus: m < R.termMax, startMin: view.ymd(now + CT.startDate.minDays * view.DAY), startMax: view.ymd(now + CT.startDate.maxDays * view.DAY) });
    },
    onSwap() { this.triggerEvent('swap'); },
    onMinus() { if (this.data.v && this.data.canMinus) this.triggerEvent('term', { months: Number(this.data.v.months) - 1 }); },
    onPlus() { if (this.data.v && this.data.canPlus) this.triggerEvent('term', { months: Number(this.data.v.months) + 1 }); },
    onDate(e) { const value = e && e.detail ? String(e.detail.value || '') : ''; if (/^\d{4}-\d{2}-\d{2}$/.test(value)) this.triggerEvent('date', { value }); }
  }
});
