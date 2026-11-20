// 状态标签（租后各页、消息页共用）。tone：ok | warn | err | info | plain（描边）
Component({
  options: { addGlobalClass: true },
  properties: { text: { type: String, value: '' }, tone: { type: String, value: 'info' } }
});
