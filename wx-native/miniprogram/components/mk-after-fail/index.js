// 失败态统一结构（冻结稿 R-C-06）：标题 → 原因 → 说明 → 可改项 → 联系门店。
// 原因由后端给；没有时该行不显示（交接 v1.0 §9：不编数、不留占位字）。点「联系门店」触发 call 事件。
const T = require('../../i18n/after').common;
Component({
  options: { addGlobalClass: true },
  properties: { title: { type: String, value: '' }, reason: { type: String, value: '' }, fixes: { type: String, value: '' }, extra: { type: String, value: '' } },
  data: { T: { fail: T.fail, callStore: T.callStore } },
  methods: { onCall() { this.triggerEvent('call'); } }
});
