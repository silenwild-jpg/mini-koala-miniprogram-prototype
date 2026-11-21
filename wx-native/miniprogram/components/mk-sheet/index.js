// 底部弹层：遮罩 + 面板，底部加安全区。全站弹层都用它。
// MOTION-01：打开时面板上滑、遮罩渐暗；关闭时反向，动画结束后才卸载。
// show = 是否渲染，open = 是否处于展开位置。快速开关以最后一次 visible 为准。
const LEAVE_MS = 260; // 与 --mk-motion-sheet 一致
Component({
  options: { addGlobalClass: true, multipleSlots: true },
  properties: { visible: { type: Boolean, value: false }, title: { type: String, value: '' }, maskClosable: { type: Boolean, value: true } },
  data: { show: false, open: false },
  observers: {
    visible(v) {
      if (this._t) { clearTimeout(this._t); this._t = null; }
      if (v) {
        if (!this.data.show) this.setData({ show: true });
        this._t = setTimeout(() => { this._t = null; if (!this._gone) this.setData({ open: true }); }, 30);
      } else if (this.data.show) {
        this.setData({ open: false });
        this._t = setTimeout(() => { this._t = null; if (!this._gone) this.setData({ show: false }); }, LEAVE_MS);
      }
    }
  },
  lifetimes: { detached() { this._gone = true; if (this._t) { clearTimeout(this._t); this._t = null; } } },
  methods: {
    onMask() { if (this.data.maskClosable && this.data.open) this.triggerEvent('close'); },
    onClose() { this.triggerEvent('close'); },
    noop() {}
  }
});
