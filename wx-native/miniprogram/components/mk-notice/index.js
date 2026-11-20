// 提示条：左侧色条 + 可选标题 + 一句说明 + 可选链接；插槽放附加内容（如订阅结果一行）。全站一套，取代原售后说明条和账户分包的 ac-notice。
// tone：''（品牌色）| warn | err；plain = 不带卡片底和投影，直接放在页面底色上。
Component({
  options: { addGlobalClass: true },
  properties: { title: { type: String, value: '' }, text: { type: String, value: '' }, tone: { type: String, value: '' }, link: { type: String, value: '' }, plain: { type: Boolean, value: false } },
  methods: { onLink() { this.triggerEvent('link'); } }
});
