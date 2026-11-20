// 开发期占位：尚未开发的页面先显示页名。提交体验版评审前，所有占位页必须清零（任务书 DoD）。
const T = require('../../i18n/zh');
Component({
  options: { addGlobalClass: true },
  properties: { title: { type: String, value: '' }, batch: { type: Number, value: 0 } },
  data: { T: T.placeholder },
  methods: { onBack() { if (getCurrentPages().length > 1) wx.navigateBack(); else wx.switchTab({ url: '/pages/home/index' }); } }
});
