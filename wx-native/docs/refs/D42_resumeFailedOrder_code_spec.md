# D-42｜demo-core 增加「失败订单继续支付」路径（代码侧规格 · 2026-11-17）

裁定（张坤 2026-11-17）：本仓库 demo-core `pay(orderId,'failed')` 直接释放仓位、只能重新下单；**增加「继续支付」路径，代码侧补 `resumeFailedOrder`**，与 H01-007 S3 的 D-12 口径对齐。本文件只定义行为，不改仓库（本阶段不改 main / 不改 PR）。

## 1. 现状（PR #220 HEAD `1d0dc7f` · demo-core.js）
- `pay(id,'failed')`：订单 `status='payment_failed'`，`stock[unit]='available'`，优惠券/赠期解锁；O01 再次进入时 `selectionValid()` 为真则按新订单重新 quote → submit（**新订单号**）。
- `resumePendingOrder(id)` 只处理 `pending`：超时 → `expired` 并释放；仓位或价格变化 → `invalidated`；否则原样返回。

## 2. 目标行为（与 S3 D-12 一致）
`resumeFailedOrder(orderId)`：
1. 找到 `status==='payment_failed'` 的订单；不存在 → `fail('ORDER_NOT_FOUND')`。
2. 失败订单保留 **原订单号**；`pay('failed')` 时不再把仓位置回 `available`，改为 `stock[unit]='held_after_failure'`（或保留 `reserved`）并记录 `failedAt`；保留期 = 待支付 TTL（3 小时，`expiresAt` 沿用）。
3. 恢复时逐项核对并返回核对结果 `{status, unit, price, coupon}`：
   - 订单状态：`failedAt + TTL > now` → `已保留`，否则置 `expired` 并释放（走现有 expired 分支）。
   - 仓位：`stock[unit]` 仍为本单持有 → `可租`；否则 `已售出` → 置 `invalidated`。
   - 价格：`prices[unit] ?? base_month` 与 `price_bases[i]` 逐项相等 → `与原订单一致`；否则 `已变化` → 重新 `amounts()`，订单金额字段更新，`priceChanged=true`。
   - 优惠资格：`coupon_id` 仍 `LOCKED_TO_ORDER` 且 `locked_order_id===orderId`、快照门店/规格/仓位一致 → `无变化`；否则 `已变化`（S2 D-06：他单锁定返回 `COUPON_LOCKED_BY_OTHER_ORDER`）。
4. 四项全部一致 → 订单回到 `pending`（同一订单号），返回订单供 `paymentSheet`；任一项变化 → 返回核对结果，O01 禁用「继续支付」直到用户确认（与 D-07 OVL-5 同一弹窗）。
5. `invalidate()` 不得清除 `payment_failed` 订单（当前 `invalidate()` 只清 selected/quote，确认无副作用）。

## 3. 界面契约（W2 o01.html `payment_failed` 态已按此渲染）
- 结果态「支付未完成 / 上次支付未完成，订单已保留。继续支付前会再次确认仓位、价格和优惠。/ 订单号 X」
- 核对块四行：订单状态 · 仓位 · 价格 · 优惠资格（✓ / ✗），全部 ✓ 时标题「已重新核对，与原订单一致，可以继续支付」，否则「已重新核对，有变化，请确认后继续」。
- 底栏「首次应付 ¥X」+「继续支付」（协议勾选后启用）。

## 4. 测试建议（新增 2 个逻辑测试）
- `resumeFailedOrder` 四项一致 → 同一订单号回到 pending，`payable` 不变。
- 价格变化 → `priceChanged=true`，金额按新价；仓位被他人占用 → `invalidated` 且 `alternatives` 可用。
