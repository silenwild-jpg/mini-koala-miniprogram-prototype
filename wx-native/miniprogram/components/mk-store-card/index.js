// 门店卡。数据由 services/finder 产出（storeCard / buildMatch），组件只负责显示与转发事件。
// variant：standard = 列表前 2 家的标准卡；compact = 第 4 家起的紧凑卡；plain = 无匹配页的浏览卡（不带可租容量）；
//          match = 仓位推荐页（「第一 / 第二推荐」+ 匹配仓 + 下一档更大的可租仓）。
// 无需求：价格行左「可租容量 a–b m³」，右「¥X/m³/月起」（D-139、D-140），不显示剩余数量。
// 有需求：仓位行（月均价主显 + 折扣标签，次行整期，D-162）+ 按钮；未登录只显示「/月起」和「查看报价」。
// 门店照片：card.photo（services/media.js 给路径，演示素材，没有逐店核验）。
const T = require('../../i18n/find');
Component({
  options: { addGlobalClass: true },
  properties: { card: { type: Object, value: {} }, variant: { type: String, value: 'standard' }, showLarger: { type: Boolean, value: false } },
  data: { T: { range: T.card.range, cubic: T.price.cubicFrom, none: T.price.none }, lines: [], visibleTags: [] },
  observers: { card() { this.build(); }, variant() { this.build(); }, showLarger() { this.build(); } },
  lifetimes: { attached() { this.build(); } },
  methods: {
    build() {
      const c = this.data.card || {}, d = this.data;
      let lines = [];
      if (d.variant === 'match') lines = c.lines || [];
      else if (c.row) lines = d.showLarger && c.larger ? [Object.assign({ nearText: c.nearText }, c.row), Object.assign({ secondary: true }, c.larger)] : [Object.assign({ nearText: c.nearText }, c.row)];
      // 列表只留两个标签位（包含推荐标记）；门店完整服务仍在 S02。
      const tags = (d.variant === 'compact' ? c.tagsCompact : c.tags) || [];
      const visibleTags = tags.slice(0, Math.max(0, 2 - (c.rankTag ? 1 : 0) - (c.lowText ? 1 : 0))); // 库存紧张提示占一个标签位
      this.setData({ lines, visibleTags });
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
