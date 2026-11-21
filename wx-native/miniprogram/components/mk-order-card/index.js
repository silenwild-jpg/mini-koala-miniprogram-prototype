// 订单摘要卡（W34 交易域）：门店、仓位名、第二行尺寸、租期、起止日。确认订单、订单详情、订单列表、租后各页用同一个组件读同一份订单。
// 属性：
//   order     订单对象（core/order-model 的结构）。确认订单页下单前传「草稿」{ store, units, months, lease:{start} }，同样可用。
//   variant   'detail'（默认：门店 + 仓位 + 租期 + 起止日）| 'list'（订单列表卡：门店、订单号、下单日或到期日、阶段标签、仓位 · 租期、金额）
//             续租过的订单：租期写累计并带「（含续租）」，金额为累计已付（FIX-01 C-01）
//   show-km   门店行带公里数（确认订单页）
//   swap      仓位行右侧的文字按钮（如「更换」「更换仓位」）；空 = 不显示。点击触发 swap 事件
//   editable  租期显示为 − / + 步进、日期可选（下单前）。触发 term { months }、date { value: 'YYYY-MM-DD' }
//   hint      租期行下方的引导句（一处只出一句，由页面用 core/pricing.nudge 算好传入）
//   dead      已超时 / 已取消：标题「原订单仓位」，整卡减淡
// IMPL-01：详情形态去掉门店图与仓位图（M-18）；仓位编号用标签、与容量同一行；租期步进数字变化时轻微回弹（core/motion）。
const C = require('../../core/config');
const CT = require('../../core/config-trade');
const T = require('../../i18n/trade');
const view = require('../../services/order-view');
const motion = require('../../core/motion');
Component({
  options: { addGlobalClass: true },
  properties: {
    order: { type: Object, value: null },
    variant: { type: String, value: 'detail' },
    showKm: { type: Boolean, value: false },
    swap: { type: String, value: '' },
    editable: { type: Boolean, value: false },
    hint: { type: String, value: '' },
    dead: { type: Boolean, value: false },
    dateNote: { type: String, value: '' } // 日期行下方的小字（确认订单：预计用仓时间即起租日）
  },
  data: { T: T.card, v: null, canMinus: false, canPlus: false, startMin: '', startMax: '', termBump: '' },
  observers: { 'order, showKm': function () { this.render(); } },
  lifetimes: { attached() { this.render(); }, detached() { motion.dispose(this); } },
  methods: {
    render() {
      const o = this.data.order, now = Date.now();
      const v = view.card(o, now, { showKm: this.data.showKm });
      const R = C.requirement, m = v ? Number(v.months) : 0;
      const prev = this.data.v ? Number(this.data.v.months) : 0;
      this.setData({ v, canMinus: m > R.termMin, canPlus: m < R.termMax, startMin: view.ymd(now + CT.startDate.minDays * view.DAY), startMax: view.ymd(now + CT.startDate.maxDays * view.DAY) });
      if (this.data.editable && prev && m && prev !== m) motion.bump(this, 'termBump', 'mk-bump mk-bump--center'); // 只在用户改了租期时回弹，首次渲染不动
    },
    onSwap() { this.triggerEvent('swap'); },
    onMinus() { if (this.data.v && this.data.canMinus) this.triggerEvent('term', { months: Number(this.data.v.months) - 1 }); },
    onPlus() { if (this.data.v && this.data.canPlus) this.triggerEvent('term', { months: Number(this.data.v.months) + 1 }); },
    onDate(e) { const value = e && e.detail ? String(e.detail.value || '') : ''; if (/^\d{4}-\d{2}-\d{2}$/.test(value)) this.triggerEvent('date', { value }); }
  }
});
