# Sprint 3 Visual QA Report

## Test matrix
运行时覆盖：
- M01 当前租赁
- RN01 默认续租 / 报价已生成
- EX01 默认 / 退租处理中
- DP01 押金持有 / 退款处理中
- OH01 当前 + 已结束历史订单
- IV01 已支付记录 + 已提交发票申请
- B2B 默认企业需求

设备：
- 375×812
- 390×844

共 20 个运行时组合。

## Results
- JavaScript page errors: **0**
- Page horizontal overflow: **0**
- Unexpected internal overflow: **0**
- Global support launcher ↔ primary CTA collision: **0**
- Visible `📍 / 🚗 / 🚲 / 🚶` Emoji in tested pages: **0**
- Target-page BODY drift: **0**（7/7 SHA-256 identical）
- Authoritative JS regression: **39 / 39 PASS**

## Notes
- QA 对全局折叠帮助组件自身的内部 `scrollWidth` 不作为页面异常溢出处理；该组件沿用 Baseline 已验证的折叠实现。
- B2B 租期折扣角标使用绝对定位，其视觉超出 Chip 内容盒属于设计行为，不作为异常 overflow。
- 考拉E存在当前 Baseline 中没有独立详情页；本轮没有为视觉完整性而虚构新页面。

## Exit gate
**PASS** — Sprint 3 lifecycle & secondary visual closure can be packaged on top of Mini Koala Visual Baseline 1.0.
