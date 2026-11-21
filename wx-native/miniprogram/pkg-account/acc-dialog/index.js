// 账户分包的居中确认框（退出登录、撤回授权、注销拦截、删除抬头、号码冲突）。
// 不用 wx.showModal：它的按钮文字最多 4 个字，冻结稿里有「换个手机号」这类 5 个字的按钮。
// IMPL-02（PR-243）：关闭带退场。调用方照旧只改 visible；组件内部用 show 控制节点，visible 变 false 时先播 mk-leave 再移除。
// 调用方关闭时通常把标题、说明一起清空，所以打开时把文字存一份（snap），退场期间画的是这份，不会塌成空框。
const motion = require('../../core/motion');
Component({
  options: { addGlobalClass: true },
  properties: {
    visible: { type: Boolean, value: false }, title: { type: String, value: '' }, desc: { type: String, value: '' },
    cancelText: { type: String, value: '' }, confirmText: { type: String, value: '' }, danger: { type: Boolean, value: false }
  },
  data: { show: false, showLeave: '', snap: { title: '', desc: '', cancelText: '', confirmText: '', danger: false } },
  observers: {
    visible(v) {
      if (v) {
        const d = this.data;
        motion.cancelLeave(this, 'show'); // 退场途中又打开：取消退场
        this.setData({ show: true, snap: { title: d.title, desc: d.desc, cancelText: d.cancelText, confirmText: d.confirmText, danger: !!d.danger } });
      } else if (this.data.show) motion.leave(this, 'show');
    }
  },
  lifetimes: { attached() { if (this.data.visible && !this.data.show) this.setData({ visible: true }); }, detached() { motion.dispose(this); } },
  methods: {
    // 退场中的框不再响应点击（样式上 mk-leave 也带 pointer-events: none）
    onCancel() { if (this.data.visible) this.triggerEvent('cancel'); },
    onConfirm() { if (this.data.visible) this.triggerEvent('confirm'); },
    noop() {}
  }
});
