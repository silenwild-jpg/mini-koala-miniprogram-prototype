# Visual Elevation V2 — Refinement PATCH

## Scope
This is a visual-only refinement on top of `Visual Elevation V2 — Asset Direction + Controlled Rollout`.
No business copy, DOM body, recommendation logic, price calculation, state, route, inventory, order, payment, lifecycle, or CTA meaning was changed.

## 1. 租期与推荐 — 推荐卡布局修复
- 移除小屏下固定右侧价格列造成的挤压/错位。
- 推荐卡恢复单一移动端信息流：门店信息 → 匹配与路线 → 分隔 → 当前租期/整期总租金/月租。
- 价格区使用稳定两列 grid，仅在价格摘要内部使用，不再与门店正文争抢横向宽度。
- 375 / 390 下地址、门店名、总价和月租均不产生页面横向溢出。

## 2. S01 附近门店 — 考拉E存提高视觉权重
- 保持真实门店结果顺序与 EStore placement 业务规则不变。
- EStore 从弱米色辅助卡升级为“明确的第二种存储方案”：浅绿纸感渐变、轻描边、轻阴影、品牌拱门纹理。
- `不限门店` 变成深绿高识别 Badge；卡片行动入口提升为深绿胶囊按钮。
- 普通 Browse 仍为第 3 个存储选择；NOMATCH / >5km fallback 的既有优先级不变。

## 3. Q01 / O01 / O02 / O03 — Transaction De-card
- 减少“白底 + 圆角 + 白底 + 圆角”的连续嵌套。
- Q01：费用列表改为透明 editorial rows。
- O01：仓位确认和费用明细去内层白卡；保留“本次应付”深绿 Hero 作为唯一金额焦点。
- O02：订单事实去白卡；保留支付状态 Hero 和必要的验证/下一步辅助 Surface。
- O03：保留仓位身份主卡，重复的租赁/付款事实恢复为无卡片行列表。

## Visual boundary
- New stylesheet: `prototype/mini_koala_visual_elevation_v2_refinement_patch.css`
- HTML changes are `<head>` stylesheet references only.
- Six target `<body>` hashes remain byte-identical.
