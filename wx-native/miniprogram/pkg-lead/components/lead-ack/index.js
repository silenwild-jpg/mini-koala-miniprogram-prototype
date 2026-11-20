// 线索受理结果卡（交接 v1.0 §4.9-2）：「已提交」+ 按提交时刻的受理文案；非服务时段加「服务时段：每日 9:00–20:00」。
// 操作按钮由页面经 slot 放进来。预约页的结果区排版不同（大图标、需求编号），在预约页里单独写。
const T = require('../../../i18n/lead');
Component({
  options: { addGlobalClass: true },
  properties: { inHours: { type: Boolean, value: true } },
  data: { T: T.ack }
});
