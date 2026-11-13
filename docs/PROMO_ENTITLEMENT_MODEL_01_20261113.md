# PROMO-02｜统一促销权益模型与跨页面契约
日期：2026-11-13
分支：integration/rc2-clean-migration-01-20261113
状态：模型草案 / 规则边界冻结；不是正式财务规则，不授权生产活动配置。

## 1. 目标与边界
建立统一促销事实源，使H01、S01、S02、S5、O01、M01使用同一活动、资格判断、报价快照和权益状态。当前只服务Web演示原型；演示样本允许虚构，不调用真实营销、CRM、支付或库存系统。
本模型不自行批准折扣数字、特价仓叠加、赠期的财务含义、押金基数或搬运成本承担方。凡尚未确认的规则，必须以待确认状态表达，不得静默推导。

## 2. 促销权益分类（不同类型，不折成一个discount）
| 类型 | 类型码 | 计价影响 | 页面表达 |
|---|---|---|---|
| 仓位特价 | UNIT_SPECIAL_PRICE | 改变指定仓位计价基数/活动价；与租期折扣的顺序待批准 | 特价仓 |
| 常规租期折扣 | TERM_DISCOUNT | 按租期档位计算租金 | 长租优惠 |
| 租金优惠券 | RENT_CASH_COUPON | 从租金扣减，受金额上限及资格限制 | 租金优惠 |
| 固定活动赠送租期 | CAMPAIGN_FREE_TERM | 增加赠送月份权益；是否延长合同期限、改变付费月份待确认 | 赠送X个月 |
| 销售个案赠送租期 | SALES_FREE_TERM | 独立于公开活动，须有授权与审批记录 | 专属赠期 |
| 基础搬运权益 | MOVING_SERVICE | 服务权益，不扣租金、不改变首次应付 | 基础搬运权益 / 资格待确认 |

## 3. 统一数据对象建议
### Campaign（活动事实）
id、name、type、status；city_ids、store_ids、unit_ids；channel_scope、customer_scope；starts_at、ends_at、timezone；eligible_term_min/max；stack_policy_id；priority、display_label；source、revision、updated_at。
活动范围必须显式绑定。特价仓绑定仓位，不能把单仓促销解释成整店全部仓位特价。活动过期、停用、仓位版本变化或仓位不可用时，不得继续输出有效促销标签。

### Benefit（权益实例）
id、type、source_type（campaign/coupon/sales_case）、source_id、name、description；value_type（fixed_amount/percentage/free_months/service）、value、currency；eligibility_snapshot、status；issued_at、expires_at；approval_id、approved_by（销售个案必需）；consumed_by_order_id、consumed_at。
活动是可重复配置的规则；权益实例是某次用户可获得、锁定或已使用的具体权益。

### QuoteSnapshot（报价快照）
quote_id、revision、created_at、expires_at；unit_ids、store_ids、capacity_m3、term_months；campaign_ids、benefit_ids；base_rent、unit_special_price、term_discount、rent_before_coupon、coupon_discount、rent_after_coupon；paid_months、gift_months、contract_months（赠期规则批准前不得伪造计算值）；deposit_basis、deposit_amount、management_fee；service_benefits[]；payable_amount；eligibility_result、calculation_trace。
同一报价快照贯穿S5→O01→订单。容量、租期、仓位、活动版本、优惠券状态或资格变化时旧报价失效并重算。

## 4. 资格与状态机
### 活动状态
DRAFT → SCHEDULED → ACTIVE → ENDED。未结束状态允许停用为PAUSED。停用/结束不代表已发放权益自动失效；已发权益按自身有效期与规则判断。

### 优惠券状态
AVAILABLE（已领取可用）→ SELECTED（本次报价选中）→ LOCKED（订单提交占用）→ REDEEMED（支付成功核销）。
- 报价刷新/更换选择：SELECTED释放回AVAILABLE。
- 下单失败、取消、超时：LOCKED按规则释放回AVAILABLE。
- 支付成功：LOCKED转REDEEMED。
- 到期：AVAILABLE/SELECTED转EXPIRED。
- 不符合条件：结果为INELIGIBLE，不伪装成已领取或已使用。
- 已核销权益不可被新订单重复使用。
这是建议规范状态机。当前实现APPLIED与LOCKED边界不清，迁移前需兼容处理，不能直接重命名造成旧订单状态丢失。

### 服务权益状态
ELIGIBILITY_PENDING → ELIGIBLE → RESERVED → FULFILLED；资格不符进入INELIGIBLE；订单取消/超时按规则释放RESERVED。服务履约与租金核销分离。

### 销售个案赠期
DRAFT → SUBMITTED → APPROVED/REJECTED → ATTACHED_TO_QUOTE → LOCKED_TO_ORDER → GRANTED。
必须记录提出人、审批人、审批范围、适用门店/仓位、赠送月数、原因和有效期。未审批不得进入正式报价。

## 5. 已批准的叠加关系与未决关系
| 组合 | 当前裁定 |
|---|---|
| 常规租期折扣 + 租金优惠券 | 允许叠加 |
| 常规租期折扣 + 基础搬运权益 | 允许叠加 |
| 租金优惠券 + 基础搬运权益 | 允许叠加 |
| 特价仓 + 常规租期折扣 | 待业务确认 |
| 特价仓 + 租金优惠券 | 待业务确认 |
| 固定活动赠期 + 常规租期折扣 | 待业务确认 |
| 固定活动赠期 + 租金优惠券 | 待业务确认 |
| 销售个案赠期 + 其他优惠 | 待审批政策确认 |
| 多张租金现金券 | 当前不批准叠加；建议单笔最多一张，最终需业务确认 |

已确认搬运为服务权益，不能作为租金现金折扣。满6个月送一次基础搬运是已提出的当前活动规则；距离、服务范围、成本方和特殊仓型附加门槛仍待确认。不得仅因租期满足就声称搬运服务已无条件兑现。

## 6. 计算顺序（冻结结构，不擅自确定未决公式）
1. 校验仓位、门店、城市、租期、活动时间与资格。
2. 得到仓位计价基数；如命中特价活动，读取该活动计价规则。
3. 应用常规租期折扣或经批准的特价叠加政策。
4. 得到优惠前整期租金。
5. 选择并校验一张租金现金券，计算现金抵扣。
6. 单独挂载赠期和搬运服务权益，不将服务权益折成现金抵扣。
7. 计算押金、管理费和首次应付金额。
8. 输出报价快照及逐项计算轨迹。

**不可自行冻结的财务口径：**
- 特价活动价是替代基础月租，还是先特价再叠租期折扣。
- 押金按优惠前月租、优惠后月租还是活动月租计算。
- 赠送租期是“付N赠M”（合同期N+M）还是另有总使用期限约定。
- 赠期是否影响押金、搬运资格、提前退租退款、续租起算及租期上限。
- 37→36个月折扣档位与整期总价连续性；当前0.60→0.55可能导致37个月整期总价低于36个月，不能通过代码自行改折扣率解决。

## 7. 跨页面展示契约
- H01：仅展示有效活动主促销标签；不显示用户尚未获得的券金额或个案赠期。
- S01：特价仓筛选与卡片标签使用同一活动事实源；门店有一间特价仓不代表当前用户需求必然匹配。
- S02：仓位卡按具体仓位资格展示特价；不得把店级标签套给全部仓位。
- S5：按已选容量、租期、仓位重算；只显示当前推荐仓位实际可享权益。
- O01：费用明细分别显示租金优惠、赠送租期、服务权益；首次应付只汇总真实计价项。搬运不扣租金。
- M01：订单详情保存下单时权益快照；显示已获赠、已锁定、待履约或已核销状态，不按当前活动配置反算历史订单。
页面不增加冗长解释文本；用简洁标签、金额行和权益状态表达。

## 8. 当前代码证据与缺口
- br03-demo-snapshots.js：存在SIM_BJ01_U04、SIM_BJ02_U04仓位级特价活动配置。
- br03-policy.js：门店特价标签读取显式campaign配置。
- demo-core.js：discountedMonth()当前只读取unit基础月租、租期档位和本地价格覆盖；amounts()尚未将仓位campaign的baseMonth纳入统一报价计算，存在标签/报价事实分离风险。
- demo-core.js：现金券在quote()阶段写为APPLIED，在submit()阶段写为LOCKED；取消/超时释放仅处理LOCKED，状态语义需统一。
- demo-core.js：搬运权益当前通过CPN-003及租期≥6个月判断，amount字段仍保留旧的200数值；任何展示和计算都不得把该数值作为租金抵扣。
- fixtures.js：现有促销样本仅覆盖特价仓、长租折扣、租金券、搬运达标/不达标；未覆盖赠期和优惠券生命周期。
- 当前未有可确认的销售赠期授权/审批数据结构。

## 9. 建议实施顺序
1. 建立独立promotion-policy.js：活动有效性、适用范围、资格结果、叠加决策；不直接修改页面。
2. 建立统一报价计算接口：特价仓与租期折扣接入同一计算轨迹；未决叠加策略采用显式BLOCKED/NEEDS_CONFIRMATION，不默认叠加。
3. 规范优惠券状态机：报价选择、订单锁定、取消释放、支付成功核销。
4. 建立赠期活动与销售个案赠期演示模型；财务语义未批准前仅展示“赠送X个月（规则待确认）”，不虚构付款与合同总期限。
5. 建立跨页面QuoteSnapshot及M01订单权益快照。
6. 新增场景：特价单仓/非匹配仓、特价与租期冲突、券可用/不适用/锁定/释放/核销/过期、固定赠期、销售个案赠期未审批/已审批、搬运达标/不达标、多权益组合。
7. 375/390浏览器回归与人工视觉签收。

## 10. 本轮裁定
本文冻结数据分类、状态术语、页面展示边界及已批准的通用叠加关系；不冻结折扣表、特价叠加公式、押金口径、赠期财务定义、搬运距离和服务范围。
不修改main，不合并PR #176，不部署。未决规则保留为待确认状态，不通过假数据掩盖规则空缺。
