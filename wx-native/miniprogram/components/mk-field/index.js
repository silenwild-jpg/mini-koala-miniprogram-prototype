// 表单项：标签（右侧可带「必填 / 选填」）+ 插槽放输入控件 + 报错或提示一行。报错优先于提示。
// mark = 标签右侧的小字；markTone：'' 次级色 | req 报错色。输入框本身的样式仍由页面写（各分包输入框高度一致，用 inputHeight 令牌）。
Component({
  options: { addGlobalClass: true },
  properties: { label: { type: String, value: '' }, mark: { type: String, value: '' }, markTone: { type: String, value: '' }, error: { type: String, value: '' }, hint: { type: String, value: '' } }
});
