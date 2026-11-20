// 空态：圆底图标 + 标题 + 一句说明 + 操作区（插槽放按钮）。全站空态统一用它，不再逐页写。
// card = 放在卡片里（列表页内的空态）；不传 = 整页空态，上下留白更大。没有按钮时传 has-action="{{false}}"。
Component({
  options: { addGlobalClass: true },
  properties: { icon: { type: String, value: '' }, title: { type: String, value: '' }, sub: { type: String, value: '' }, card: { type: Boolean, value: false }, hasAction: { type: Boolean, value: true } }
});
