// 列表行：前置图标 + 标题 + 右侧说明 + 插槽（标签等）+ 角标 + 箭头。行高 104rpx，可点的行带按压反馈。
// 点击直接在组件上绑 bindtap，data-* 也写在组件上。divider = 行上方画分隔线（同一卡片里第二行起传 true）。
// inset = 分隔线左侧缩进到与标题文字对齐（带图标的行用；IMPL-01 去卡片化后无外框的行列表）。不传时分隔线通栏，旧调用方不受影响。
// arrow = 可点并显示箭头；只读行传 arrow="{{false}}"，不显示箭头也没有按压反馈。
Component({
  options: { addGlobalClass: true },
  properties: { icon: { type: String, value: '' }, title: { type: String, value: '' }, value: { type: String, value: '' }, badge: { type: Number, value: 0 }, arrow: { type: Boolean, value: true }, divider: { type: Boolean, value: false }, inset: { type: Boolean, value: false }, strong: { type: Boolean, value: false } }
});
