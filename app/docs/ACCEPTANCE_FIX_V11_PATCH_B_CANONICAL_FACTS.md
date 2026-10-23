# Mini Koala — Acceptance Fix V1.1 / PATCH B · Canonical Facts & Journey Continuity

日期：2026-10-08
来源基线：Mini_Koala_Acceptance_Fix_V1_1_PATCH_A_FULL.zip
目标：以最小非侵入性代码变更消除内部演示中同一场景的事实漂移，保护已批准的价格业务规则与核心页面 HTML 主体。

## 本次执行内容

| 编号 | 本次处理 | 来源语义 / 业务边界 |
|---|---|---|
| AF-03-A | 统一内部故事场景的容量需求区间为 canonical `4.3–5.5 m³`（目标 `4.8 m³`），避免 Demo Hub 的 `4.5–5.0` 与 fixture 冲突 | 改的是演示 fixture 传参；不改匹配算法或真实仓型 |
| AF-03-B | 门店详情 S02 在真实门店 ID 缺少路线表时不再错误地拿 `jianguo` 的路线作为默认值；改为与 S01 相同的门店 ID、位置、出行方式算法 | 演示路线仍非实时地图导航值；不同找仓位置应允许不同距离 |
| AF-03-C | 固定演示仓位的精确容量 `4.72 m³`；`4.7/4.8 m³` 分别只作展示精度和用户目标，不得回写精确仓位事实 | 不改变 m³ / ㎡ 计费业务规则 |
| AF-03-D | 五类生命周期 fixture 的起止日期与 `term_months=6` 进行合同月数计算校验；特殊状态仍维持待使用/到期/退租/已结束语义 | 只改变内部演示时间快照，不新增正式业务期限与到期政策 |
| AF-04-A | 增加内部 Quick State “有券报价/无券报价”和“有券订单/无券订单”，分别使用 canonical ¥3,863 / ¥4,063 场景 | 仅内部 Demo Hub 有场景标记，用户交易页不显示 Demo 数据标签 |
| AF-04-B | 进入 Quick State 时重置上一场景的优惠券钱包及选券状态；Guided Story 内按原逻辑保留用户已选的优惠券 | 避免跨场景污染，同时不破坏原先的故事连续性 |
| AF-04-C | 报价与订单的统一字段增加 scenario_id、voucher 金额、精确容量、start/end 日期，并且 `initialPayable` 与价格快照来自同一场景 | `¥3,440 ÷ 6 ≈ ¥573`，“月均约”允许舍入差，不改变 ¥3,440 整期租金 |

## 固定口径

- 门店：惠新西街店；仓位：BJ0112S01A009；精确体积：4.72m³；目标 4.8m³；需求范围：4.3–5.5m³。
- 租期 6 个月；整期租金 ¥3,440，展示月均约 ¥573；押金 ¥573；管理费 ¥50。
- 不使用优惠券：¥3,440 + ¥573 + ¥50 = **¥4,063**。
- 使用内部演示新客券：¥3,440 − ¥200 + ¥573 + ¥50 = **¥3,863**。
- 演示优惠券不是已生效的生产营销政策；这次未修改券种、适用门槛、抵扣规则。
- 路线距离仅在相同位置、相同出行方式、相同门店的上下文中要求一致；不同位置不强制相同。

## 变更文件（在 PATCH A 基线之上）

- `prototype/mini_storage_demo_fixture_v2.js`：场景事实、优惠券隔离、月均展示标识、生命周期日期校验。
- `prototype/mini_koala_internal_demo_v1.js`：故事演示参数按 canonical 需求区间；Q01/O01 链接保留精确仓位体积与起租日期。
- `prototype/mini_koala_acceptance_v11_facts_patch.js`（新增）：统一 S02 退化路线计算和展示；价格合计诊断函数。
- `prototype/mini_storage_global_support_v274.js`：按页面可控加载事实补丁层。
- `prototype/product_demo_hub_v1.html`：四个有券/无券事实核对快捷入口（仅内部）。
- `qa/test_acceptance_v11_patch_b.cjs`（新增）：专项断言。

## 本次未改变

- 五份核心业务 HTML（S01、S02、U01、Q01、O01）与 PATCH A **逐字节一致**。
- 不改订单计费算法、折扣档位、实际仓位主表、优惠券规则、库存锁定时效、退款或发票 SLA。
- 未清理全部研发术语或制作全站视觉优化（分别属于 PATCH C / D）。

## 验证结果和缺口

- `python qa/run_acceptance_static.py`：68/68 通过。
- `node qa/test_acceptance_v11_patch.cjs`：PATCH A 6/6 通过。
- `node qa/test_acceptance_v11_patch_b.cjs`：PATCH B 9/9 通过，覆盖路线回退、S02 页面路线显示、场景隔离、数值与日期。
- Python Playwright 使用系统 Chromium 访问本地 `file://` 入口返回 `ERR_BLOCKED_BY_ADMINISTRATOR`；375×812 与 390×844 的运行截图及动态端到端验收**未完成**。

## 后续必要验收

在具备正常浏览器导航的环境中，分别运行：内部 Demo Hub → 有券报价 → O01；内部 Demo Hub → 无券报价 → O01；S01 匹配 → S02 详情切换出行方式；租后即将到期/退租/历史订单。检查 375×812/390×844 截图中的价格、日期、路线、操作及可见性，并记录失败证据。

**状态：PATCH B 源码修复候选 / 静态及契约测试通过；待动态验收。**
