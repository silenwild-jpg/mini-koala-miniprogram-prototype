# Coupon & Benefit System Spec V1

适用基线：`Mini_Koala_Current_Baseline_V1_6_Frozen`  
定位：优惠券不是第二套价格折扣，而是围绕获客、成交、再营销与续租的转化激励层。

## 1. 价格关系

正式顺序：`基准价 → 租期折扣 → 整期总租金 → Coupon / Benefit → 优惠后租金 → 押金 + 管理费 → 一次支付`。

- `total_rent` 始终表示租期折扣后的原始整期总租金。
- 普通租金券只减少租金，不减少押金与管理费。
- 服务权益（如搬运补贴）不伪装成租金优惠。
- 订单消费确定后的 Price Snapshot / Quote，不在下单页重新寻找优惠。

Canonical 6个月案例：

- 整期总租金：¥3,440
- CPN-001 新客租仓券：-¥200
- 优惠后租金：¥3,240
- 押金：¥573
- 管理费：¥50
- 预计一次支付：¥3,863

## 2. V1 优惠模板

| ID | 类型 | 展示 | 核心条件 |
|---|---|---:|---|
| CPN-001 | RENT_CASH | ¥200 新客租仓券 | 首次租仓；整期租金≥¥2,000 |
| CPN-002 | RENT_CASH | ¥300 12个月长租券 | 首次租仓；租期≥12个月 |
| CPN-003 | SERVICE_BENEFIT | ¥200搬运补贴 | 服务范围/租期等条件满足后使用 |
| CPN-004 | RENEWAL_CASH | ¥150续租券 | 续租≥6个月 |

## 3. 券生命周期

`CLAIMED → APPLIED → LOCKED → REDEEMED`

异常：
- 支付失败 / 库存变化：释放回 `CLAIMED`。
- 首次订单支付成功后，其他新客券置 `INVALID`。
- 已使用券不重复发放。

## 4. 自动最优优惠

V1 默认从当前可用 `RENT_CASH` 中选择实际优惠金额最高者：

- 6个月：CPN-001，减¥200。
- 12个月：CPN-002，减¥300。

用户可以在 C02：
- 手工选择可用券；
- 恢复“自动使用最优优惠”；
- 暂不使用优惠券。

## 5. 页面嵌入

- Estimator：有效估算完成后自动到账新客券，并提示12个月长租券。
- U01：正式应用优惠、展示优惠后租金与优惠后一次支付；可进入 C02。
- C01：我的优惠券；可使用 / 已使用 / 已失效。
- C02：选择优惠券；明确不可用原因。
- Q01：保存与 U01 完全一致的 Coupon Snapshot。
- O01：继续使用同一优惠金额；订单创建时优惠券进入 LOCKED。
- O02：支付成功核销；支付失败 / 库存变化释放。
- M01：增加“我的优惠券”入口。
- RN01：续租≥6个月自动应用 ¥150续租券（报价确认时）。

## 6. Snapshot 扩展字段

`coupon_id / user_coupon_id / coupon_name / coupon_type / coupon_discount_amount / rent_before_coupon / rent_after_coupon / total_benefit_amount / benefit_ids / coupon_applied / coupon_applied_at`。

## 7. 生产前仍需确认

- Manual Quote 与 Coupon 的正式叠加策略。
- 优惠券正式后台库存、预算、渠道范围与发放权限。
- 优惠券有效期和活动时间来源。
- 支付 pending 时的正式锁券超时与释放策略。
- 搬运补贴的正式服务结算对象。
- 新客用户 ID / 手机号去重规则。
- 正式退款后的返券策略。

V1 原型实现只负责产品语义和演示交易闭环，不替代生产营销/结算引擎。
