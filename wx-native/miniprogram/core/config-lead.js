// 线索域（预约用仓 / 顾问 / 企业 / 运输 / 联系顾问）的可调数值。全站通用的数值仍在 core/config.js（服务时段、容量与面积范围、租期范围、免费运输门槛）。
// 每项注明来源：裁定编号 / 冻结稿 / 自定 / 待业务。
module.exports = {
  addressMax: 120,        // 冻结稿：「请填写用仓位置（不超过120字）」
  noteMax: 200,           // 冻结稿：预约页备注 0/200
  bizNotesMax: 500,       // 冻结稿：企业页补充信息 0/500
  supportTextMax: 500,    // 冻结稿：咨询内容 0/500
  nameMax: 40,            // 自定：称呼、公司名称长度上限
  bookingDateOffsets: [0, 1, 2, 3, 6],      // 冻结稿：预约页日期弹层列今天起第 0/1/2/3/6 天
  bizDateOffsets: [0, 1, 2, 3, 6, 14],      // 冻结稿：企业页日期弹层
  bookingCapacityQuickM3: [1, 3, 8, 15],    // 冻结稿：意向容量常用项（其后固定接「30m³ 及以上」「暂不确定」）
  bizBands: [ // D-88：企业容量按区间存；带入找仓取区间上限
    { key: '1-5', label: '1–5m³', min: 1, max: 5, match: 5 },
    { key: '5-15', label: '5–15m³', min: 5, max: 15, match: 15 },
    { key: '15-30', label: '15–30m³', min: 15, max: 30, match: 30 },
    { key: '30+', label: '30m³ 及以上', min: 30, max: null, match: 30 }
  ],
  hotline: '4000358885',  // 使用协议 附件3：400-035-8885（400 客服电话）
  leadNoDigits: 4,        // 待业务：线索对外编号规则未定，暂用 4 位序号（冻结稿「需求编号 0001」）
  recheckMs: 3000,        // 自定：企业页「提交结果暂未确认」后自动核对一次的等待时间
  visitSlotEndHour: [null, 12, 18, null], // 自定（FIX-01 E-19，待业务裁定）：看仓时段的结束钟点，与 i18n visit.slots 一一对应；选「今天」且已过结束钟点的时段不能提交
  smsResendSeconds: 60    // 自定：修改联系电话的短信重发间隔（与登录层一致）
};
