// 租后页状态头：大标题 + 状态标签 + 一行说明（订单号、租期至…）。原生导航栏之下、页面最上方。
Component({
  options: { addGlobalClass: true },
  properties: { title: { type: String, value: '' }, tag: { type: String, value: '' }, tone: { type: String, value: 'info' }, subs: { type: Array, value: [] } }
});
