// 交易域（第 2 批）的可调数值。全站通用的数值仍在 core/config.js；这里只放交易域新增的。
// 来源标注：裁定编号 / 合同 / 示例 / 自定 / 待业务。
module.exports = {
  hotline: '400-035-8885',          // 合同：使用协议 附件3（客服电话）
  startDate: { minDays: 1, maxDays: 90 }, // 自定：预计用仓时间可选「明天起 90 天内」；冻结稿默认填明天
  expiringDays: 30,                 // 冻结稿 runtime/h01-state-policy-01.js：距到期 30 天内算「即将到期」
  identity: {
    nameMin: 2, nameMax: 20,        // 自定：姓名长度（演示校验）
    idLength: 18                    // 交接 v1.0 §4.6-2：只支持身份证
  },
  sms: { codeLength: 6, phoneLength: 11 }, // 与 services/mock-adapter.js 的校验一致
  alternatives: { max: 3 },         // 冻结稿 w2-render.js altRows：过期 / 取消后页内列最近 3 家
  quickStoreSheetMax: 8,            // 冻结稿 w3-render.js：更换门店抽屉列 8 家
  taskTodoMax: 2,                   // 冻结稿 docs/W7_Shared_Contracts.md §1：待办条带最多 2 条
  // 演示环境专用（不出现在界面上）：模拟变价时月基价上调的金额。冻结稿 price_changed 态为 ¥400 → ¥440
  demo: { priceBump: 40, couponName: '12个月长租券', couponAmount: 300, couponMinMonths: 12 } // 示例：冻结稿 coupon 态
};
