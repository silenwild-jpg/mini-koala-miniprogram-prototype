// 底部弹层：遮罩拦截滚动（B6），内容区加底部安全区（B3）。
Component({
  options: { multipleSlots: false },
  properties: {
    show: { type: Boolean, value: false },
    title: { type: String, value: '' },
    lift: { type: Number, value: 0 } // 键盘高度（px），由页面传入，用来把弹层顶起
  },
  methods: {
    noop() {},
    onClose() { this.triggerEvent('close'); }
  }
});
