// 账户分包的居中确认框（退出登录、撤回授权、注销拦截、删除抬头、号码冲突）。
// 不用 wx.showModal：它的按钮文字最多 4 个字，冻结稿里有「换个手机号」这类 5 个字的按钮。
Component({
  options: { addGlobalClass: true },
  properties: {
    visible: { type: Boolean, value: false }, title: { type: String, value: '' }, desc: { type: String, value: '' },
    cancelText: { type: String, value: '' }, confirmText: { type: String, value: '' }, danger: { type: Boolean, value: false }
  },
  methods: {
    onCancel() { this.triggerEvent('cancel'); },
    onConfirm() { this.triggerEvent('confirm'); },
    noop() {}
  }
});
