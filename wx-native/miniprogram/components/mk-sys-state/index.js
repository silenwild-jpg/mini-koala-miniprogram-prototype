// 系统状态：加载 / 失败 / 断网，全站一套（交接 v1.0 §4.12）。
// skeleton > 0 时，加载态用骨架卡代替转圈（首页、门店列表、仓位推荐用）。
const T = require('../../i18n/zh');
Component({
  options: { addGlobalClass: true },
  properties: { type: { type: String, value: 'loading' }, skeleton: { type: Number, value: 0 } }, // type: loading | failed | offline
  data: { T: { sys: T.sys, retry: T.common.retry }, bones: [] },
  observers: { skeleton(n) { this.setData({ bones: Array.from({ length: Math.max(0, Math.min(6, Number(n) || 0)) }, (_, i) => i) }); } },
  methods: { onRetry() { this.triggerEvent('retry'); } }
});
