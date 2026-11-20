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
const T = require('../../i18n/trade');
const view = require('../../services/order-view');
Component({
  options: { addGlobalClass: true },
  properties: {
    order: { type: Object, value: null },
    plain: { type: Boolean, value: false },
    editable: { type: Boolean, value: false },
    showCoupon: { type: Boolean, value: false },
    locked: { type: Boolean, value: false },
    noSaved: { type: Boolean, value: false },
    totalLabel: { type: String, value: '' },
    couponName: { type: String, value: '' },
    placeholder: { type: String, value: '' },
    totalPlaceholder: { type: String, value: '' },
    note: { type: String, value: '' }
  },
  data: { T: T.fee, rows: [], total: null },
  observers: { 'order, editable, showCoupon, locked, noSaved, totalLabel, couponName, placeholder, totalPlaceholder': function () { this.render(); } },
  lifetimes: { attached() { this.render(); } },
  methods: {
    render() {
      const d = this.data;
      let f = null;
      if (!d.placeholder) f = view.fees(d.order, Date.now(), { editable: d.editable, showCoupon: d.showCoupon || d.editable, locked: d.locked, noSaved: d.noSaved, totalLabel: d.totalLabel, couponName: d.couponName || (d.order && d.order.coupon_name) || '' });
      if (!f) f = d.placeholder ? view.feesPlaceholder(d.placeholder, d.totalPlaceholder) : null;
      this.setData({ rows: f ? f.rows : [], total: f ? f.total : null });
    },
    onCoupon() { this.triggerEvent('coupon'); }
  }
});
