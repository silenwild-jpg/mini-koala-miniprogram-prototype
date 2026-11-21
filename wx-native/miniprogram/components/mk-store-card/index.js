// 门店卡。数据由 services/finder 产出（storeCard / buildMatch），组件只负责显示与转发事件。
// variant：standard = 列表前 2 家的标准卡；compact = 第 4 家起的紧凑卡；plain = 无匹配页的浏览卡（不带可租容量）；
//          match = 仓位推荐页（「第一 / 第二推荐」+ 匹配仓 + 下一档更大的可租仓）。
// 无需求：价格行左「可租容量 a–b m³」，右「¥X/m³/月起」（D-139、D-140），不显示剩余数量。
// 有需求：仓位行（月均价主显 + 折扣标签，次行整期，D-162）+ 按钮；未登录只显示「/月起」和「查看报价」。
// 门店照片：card.photo（services/media.js 给路径，演示素材，没有逐店核验）。
const T = require('../../i18n/find');
const ENTER_MAX = 5; // 与 styles/motion.wxss 的 mk-fade-in--d1…d5 对应
Component({
  options: { addGlobalClass: true },
  // enter：进场渐显的错峰序号（0 起；-1 不做）。只给列表前几张用，页面传 index。bump：价格数字的反馈类名（core/motion.bump 写入页面数据后透传）。
  properties: { card: { type: Object, value: {} }, variant: { type: String, value: 'standard' }, showLarger: { type: Boolean, value: false }, enter: { type: Number, value: -1 }, bump: { type: String, value: '' } },
  data: { T: { range: T.card.range, cubic: T.price.cubicFrom, none: T.price.none, matched: T.card.matched }, lines: [], visibleTags: [], place: '', enterCls: '' },
  observers: { card() { this.build(); }, variant() { this.build(); }, showLarger() { this.build(); }, enter() { this.build(); } },
  lifetimes: { attached() { this.build(); } },
  methods: {
    build() {
      const c = this.data.card || {}, d = this.data;
      let lines = [];
      if (d.variant === 'match') lines = c.lines || [];
      else if (c.row) lines = d.showLarger && c.larger ? [Object.assign({ nearText: c.nearText }, c.row), Object.assign({ secondary: true }, c.larger)] : [Object.assign({ nearText: c.nearText }, c.row)];
      // 列表只留两个标签位（包含推荐标记）；门店完整服务仍在 S02。
      const tags = (d.variant === 'compact' ? c.tagsCompact : c.tags) || [];
      // 「距离最近 / 区域低价」改为压在图上的角标（IMPL-01 M-06），不再占标签位；没有图时退回成标签
      const visibleTags = tags.slice(0, Math.max(0, 2 - (c.rankTag && !c.photo ? 1 : 0) - (c.lowText ? 1 : 0))); // 库存紧张提示占一个标签位
      // 位置行（M-08）：距离 · 区名 · 商圈。数据没带 placeText 的旧调用方退回地址
      const place = c.placeText !== undefined ? c.placeText : (c.address || '');
      const n = Number(d.enter), enterCls = n >= 0 && n <= ENTER_MAX ? 'mk-fade-in' + (n > 0 ? ' mk-fade-in--d' + n : '') : '';
      this.setData({ lines, visibleTags, place, enterCls });
    },
    onStore() { this.triggerEvent('store', { id: (this.data.card || {}).id }); },
    onAction(e) {
      const row = this.data.lines[Number(e.currentTarget.dataset.i) || 0];
      if (row) this.triggerEvent('action', { storeId: this.data.card.id, unitId: row.id, cta: row.cta });
    },
    onPrice(e) {
      const row = this.data.lines[Number(e.currentTarget.dataset.i) || 0];
      if (row) this.triggerEvent('fees', { storeId: this.data.card.id, unitId: row.id });
    }
  }
});
