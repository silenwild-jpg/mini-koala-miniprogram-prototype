// 费用明细（W34 交易域）：整期租金、已省、满额减、优惠券、服务权益（免费运输）、押金、整单管理费、合计。
// 确认订单、订单详情、支付弹层、快捷下单、租后各页用同一个组件；金额只读 order.quote，不重算。
// 属性：
//   order         订单对象；下单前传「草稿」{ months, quote, free_transport }
//   plain         只渲染各行与合计（放进弹层或别的卡片里）；默认带卡片外框和「费用明细」标题
//   editable      下单前：优惠券行带「选择 ›」，点击触发 coupon 事件
//   show-coupon   始终显示优惠券行（确认订单页）；默认只在用了券时显示
//   locked        订单已生成：未用券时写「未使用」
//   no-saved      变价待确认时不显示「已省」
//   total-label   合计行的名称；默认按订单阶段取「本次应付 / 已付 / 原订单金额（已取消 / 已失效）」
//   coupon-name   已用券的名称（显示「已使用 X · 券后整期租金」）
//   placeholder   没有金额时各行显示的文字（如「登录后显示」）。未登录不显示任何金额（交接 v1.0 §4.1）
//   total-placeholder  合计行的占位文字（默认同 placeholder）
//   note          明细下方的小字（如预付说明）
//   no-total      不出合计行（确认订单页：合计只留底栏，M-15）
//   coupon-text   没用券时券行右侧的文字（确认订单页按「没有券 / 有 N 张可用 / 满 N 个月可用」给，B-12）；不传按默认
// FIX-01：行由 services/order-view.fees 给出，这里只做三处补充（adjust）——
//   R-06 含特价仓时列出「原价 / 特价仓优惠 / 租期折扣」，三行相减正好等于整期租金，与底栏「已省」对得上，并去掉重复的「特价仓 ¥X/月」行；
//   B-03 特价仓的券行写「特价仓不可用券」；B-12 券比满额减大时在券行下说明满额减不同享。
const T = require('../../i18n/trade');
const view = require('../../services/order-view');
const pricing = require('../../core/pricing');
const fmt = require('../../core/format');
const motion = require('../../core/motion');
const yuan = pricing.yuan;
function adjust(f, d) {
  const o = d.order, q = o && o.quote, F = T.fee;
  if (!f || !q) return f;
  let rows = f.rows.slice();
  if (q.special) {
    rows = rows.filter((r) => r.id !== 'special');
    const months = o.months || q.months, ups = q.unit_pricing || [];
    const bd = q.base_total === undefined ? pricing.breakdown(ups, months, q.rent_total) : { base_total: q.base_total, special_discount_total: q.special_discount_total, term_saved_total: q.term_saved_total };
    const i = rows.findIndex((r) => r.id === 'rent');
    if (!d.noSaved && i >= 0 && bd.base_total > Number(q.rent_total)) {
      const baseSum = ups.reduce((n, x) => n + Number(x.base_month || 0), 0);
      const add = [{ id: 'origin', k: F.origin, sub: fmt.termText(months), amt: yuan(bd.base_total), sec: yuan(baseSum) + T.common.perMonth + ' × ' + fmt.termText(months), muted: true }];
      if (bd.special_discount_total > 0) add.push({ id: 'specialOff', k: F.specialOff, amt: '−' + yuan(bd.special_discount_total), good: true });
      if (bd.term_saved_total > 0) add.push({ id: 'termOff', k: F.termOff, tag: pricing.factorLabel(Number(q.term_factor) || 1), amt: '−' + yuan(bd.term_saved_total), good: true });
      rows.splice.apply(rows, [i, 0].concat(add));
    }
  }
  const off = Number(q.coupon_discount) || 0;
  rows = rows.map((r) => {
    if (r.id !== 'coupon') return r;
    const c = Object.assign({}, r);
    if (off > 0) { if (Number(q.full_skipped) > 0) c.note = F.fullSkipped[0] + yuan(q.full_skipped) + F.fullSkipped[1]; }
    else if (!d.locked && !q.coupon_skipped) { if (q.special) { c.amt = F.couponSpecial; c.link = ''; } else if (d.couponText) c.amt = d.couponText; }
    return c;
  });
  return { rows, total: f.total };
}
Component({
  options: { addGlobalClass: true },
  properties: {
    order: { type: Object, value: null },
    plain: { type: Boolean, value: false },
    editable: { type: Boolean, value: false },
    showCoupon: { type: Boolean, value: false },
    locked: { type: Boolean, value: false },
    noSaved: { type: Boolean, value: false },
    noTotal: { type: Boolean, value: false },
    totalLabel: { type: String, value: '' },
    couponName: { type: String, value: '' },
    placeholder: { type: String, value: '' },
    totalPlaceholder: { type: String, value: '' },
    note: { type: String, value: '' },
    couponText: { type: String, value: '' }
  },
  data: { T: T.fee, rows: [], total: null, totalBump: '' },
  observers: { 'order, editable, showCoupon, locked, noSaved, totalLabel, couponName, placeholder, totalPlaceholder, couponText': function () { this.render(); } },
  lifetimes: { attached() { this.render(); }, detached() { motion.dispose(this); } },
  methods: {
    render() {
      const d = this.data;
      let f = null;
      if (!d.placeholder) f = view.fees(d.order, Date.now(), { editable: d.editable, showCoupon: d.showCoupon || d.editable, locked: d.locked, noSaved: d.noSaved, totalLabel: d.totalLabel, couponName: d.couponName || (d.order && d.order.coupon_name) || '' });
      if (f) f = adjust(f, d);
      if (!f) f = d.placeholder ? view.feesPlaceholder(d.placeholder, d.totalPlaceholder) : null;
      // 版式（IMPL-01）：说明列 mid 放「单价 × 月数」这类算式（已含月数时不再单列月数），放不进一行的说明落到下一行 below
      const rows = (f ? f.rows : []).map((r) => { const inSec = !!(r.sec && r.sub && r.sec.indexOf(r.sub) >= 0); return Object.assign({}, r, { mid: inSec ? r.sec : r.sub || '', below: inSec ? '' : r.sec || '' }); });
      const prev = this.data.total ? this.data.total.amt : '', cur = f && f.total ? f.total.amt : '';
      this.setData({ rows, total: f ? f.total : null });
      if (prev && cur && prev !== cur && /\d/.test(prev) && /\d/.test(cur)) motion.bump(this, 'totalBump'); // 合计金额变了才回弹
    },
    onCoupon() { this.triggerEvent('coupon'); }
  }
});
