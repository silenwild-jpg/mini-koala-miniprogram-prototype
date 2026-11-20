// 底部弹层：遮罩 + 面板，底部加安全区。全站弹层都用它。
Component({
  options: { addGlobalClass: true, multipleSlots: true },
  properties: { visible: { type: Boolean, value: false }, title: { type: String, value: '' }, maskClosable: { type: Boolean, value: true } },
  methods: {
    onMask() { if (this.data.maskClosable) this.triggerEvent('close'); },
    onClose() { this.triggerEvent('close'); },
    noop() {}
  }
});
