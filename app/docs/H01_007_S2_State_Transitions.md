# H01-007-S2 · 优惠券状态迁移记录与数据对照（真实 HTTP，375×812；390×844 结果一致）

取自 `outputs/h01_007_s2/http_after_fix/results.json`（修复后）与 `http_before_fix/results.json`（S1 检查点，修复前）。门店/仓位：安贞店 BJ0498S01B001（订单 A）、双井店 BJ0494S01D003（订单 B）。

## OWN_LOCK（D-06）

| 步骤 | 页面/动作 | 订单 `mini_storage_order_current` | 钱包 CPN-001 | 修复前 | 修复后 |
|---|---|---|---|---|---|
| 1 | U01 6 个月，自动用券 | 无 | CLAIMED | 快照 CPN-001 −¥200，应付 ¥4,307 | 同 |
| 2 | O01 确认并支付（`simulatePayment=PENDING`） | `PENDING_PAYMENT` / `PAYING`，`coupon_id:CPN-001` | **LOCKED**，`locked_order_id` = 订单号 | 同 | 同 |
| 3 | O02「订单待支付」→ 浏览器返回 O01 | 不变 | LOCKED | 门禁 `COUPON_EXPIRED_OR_USED`，提示「当前方案价格需要重新确认」，金额「—」，按钮「报价待确认」禁用 | 门禁 OK，券行「新客租仓券 −¥200」，`确认并支付 ¥4,307` 可用 |
| 4 | O02「继续支付」→ O01?orderNo=… | 不变 | LOCKED | 同步骤 3（阻断） | 同步骤 3 修复后 |
| 5 | M01「待支付 · 订单未完成 · 查看订单」→ O01 | 不变 | LOCKED | 同步骤 3（阻断） | 同步骤 3 修复后 |
| 6 | C02 | 不变 | LOCKED | 「新客租仓券 · 优惠券状态不可用」 | 「新客租仓券 · 当前可用 · 使用中」 |
| 7 | O01 再次支付（真实结果 PAID） | 同一订单号 → `PAID` / `PAID`，`coupon_discount_amount:200`，`payable_total:4307`；历史仅 1 条 | **REDEEMED**，`redeemed_order_id` = 同一订单号；CPN-002/003 → INVALID | 无法到达（按钮禁用） | 到达 O02「支付成功，具体仓位已分配」 |

## OTHER_LOCK（D-06）

| 步骤 | 页面/动作 | 修复前 | 修复后 |
|---|---|---|---|
| 1 | 预置：订单 A `PENDING_PAYMENT`（安贞店），CPN-001 `LOCKED` 归 A，CPN-002/003 CLAIMED | — | — |
| 2 | U01 双井店 BJ0494S01D003 6 个月（整期 ¥2,940） | 不套券（LOCKED ≠ CLAIMED） | 不套券；`coupon_customer_first_purchase:true`（A 未支付，首购资格仍在） |
| 3 | C02 | 「新客租仓券 · 优惠券状态不可用」 | 「新客租仓券 · 优惠券正在其他订单中使用」 |
| 4 | O01（订单 B） | 门禁 OK，全价 ¥3,480 | 同；钱包 CPN-001 仍 LOCKED 归 A |
| 5 | 对照：同一钱包回到 A 的身份（安贞店 BJ0498S01B001） | 不套券（A 自己也被挡） | 套回 CPN-001 −¥200 |

## REPEAT / FRESH（D-05）

| 场景 | 预置 | 修复前 | 修复后 |
|---|---|---|---|
| FRESH | 空存储 | U01 CPN-001 −¥200 → O01 券行 → PAID ¥4,307；CPN-001 REDEEMED，CPN-002/003 INVALID | 同（真正新客不受影响） |
| REPEAT | 历史 `O-HIST-A-PAID`（PAID/PAID）+ 当前 `O-CUR-B-PENDING`（PENDING_PAYMENT）+ 三张 CLAIMED 券 | U01 套券 −¥200、`coupon_customer_first_purchase:true`、应付 ¥4,307；C02 新客券「使用中」；O01 带券 PAID；CPN-001 被 REDEEMED | U01「暂不使用」、`coupon_customer_first_purchase:false`、应付 ¥4,507；C02 两张新客券「仅限首次租仓」；O01 无券 PAID ¥4,507；三张券保持 CLAIMED |

## INVALID（规则守卫，修复前后一致）

- 1 个月整期 ¥680：U01 不套券；C02「整期租金满¥2,000可使用」「租满12个月可使用」。
- CPN-001 `expire_time` 已过：U01 不套券；C02「优惠券已过期」。
