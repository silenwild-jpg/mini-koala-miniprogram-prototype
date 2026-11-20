// 说明条：左侧色条 + 可选标题 + 一句说明 + 可选链接；插槽放附加内容（如订阅结果一行）。tone：''（品牌色）| warn | err
Component({
  options: { addGlobalClass: true },
  properties: { title: { type: String, value: '' }, text: { type: String, value: '' }, tone: { type: String, value: '' }, link: { type: String, value: '' } },
  methods: { onLink() { this.triggerEvent('link'); } }
});
