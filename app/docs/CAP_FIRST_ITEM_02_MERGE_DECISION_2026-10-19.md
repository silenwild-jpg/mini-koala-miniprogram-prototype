> 历史记录：本文件记录 V1 阶段判断；HTTP 阻断、U01 缺入口和旧矩阵数字均已被 V2 实测与实现更新。当前裁定以 CAP_FIRST_ITEM_02_V2_DECISION_2026-10-19.md 及 CAP_FIRST_ITEM_02_VALIDATION_2026-10-19.md 为准。

# CAP-FIRST-ITEM-02｜周期分支汇总、版本裁定与受控合并

## 版本裁定

本轮唯一经用户指认为母版的输入是 `Mini_Koala_DEMO_COUPON_ALL_NEW_01_Candidate_2026-10-15.zip`，SHA-256 为 `e8e60ee4d00abf2e640054ab430dd68b7ddb1d49e46fab71ef7113f8495d480a`。它是**本轮证实的合并母版**；包内自称 Candidate，`demo_gate=ORIGINAL_READY_NEW_PENDING`、`release_gate=HOLD`，故不能据文件名将其宣布为正式 READY 或发布版。母包 854 条 ZIP 项无重复、越界路径或 CRC 错误，解包后 `check_package.py` 核对 853 个清单文件与 803 个字面资源链接，错误 0。母包原字节、母版解包目录 `m/` 均未覆盖。

本目录 `c2/` 是隔离的 **CAP-FIRST-ITEM-02 Controlled Partial Candidate**，接在该母版之后。R5A/CAP09B/HOME02A 既有受控候选作为逐文件可追溯的功能输入，不替代母版身份。既有候选 ZIP SHA-256 `d13b04833bea7fd2672140cb49b1f5e4b30ecb4f79a3fca7f30b3a4e44fdd172`。本次交接 ZIP SHA-256 `a3bfd60f076592aa740c3524121f514e7d1513669850e762dfe9a72deb469315`，其内六份文本与同名外置文件逐字节一致。

## 各输入的取舍

| 输入 | 采用 | 不采用或限制 |
|---|---|---|
| R5A 受控比较 | U01 轻量对比与 S5 暂放入口 | 原 R4/R5A 浅色浮窗源码未收到，不能称为原位合并 |
| CAP09B / VIS10C | 六档历史参考图与容量优先结构 | 六档图片不等于真实需求容量；VIS10C 独立图包不是可运行母版。VIS10C SHA `b3435d52ba7b1396a16093346ad75e64694d1db84e6cdacd2fd320fd18e2496a`，六张场景图与现有 CAP09B 相同 |
| HOME02A | 首页搜索联动与原找仓路径 | Banner 未定稿，未替换母版素材 |
| ITEM01 | 类别、购物车、草稿交互参考 | 先回 10C 再确认的旧流程按最新冻结规则废止；参考包 SHA `5ac6fe530f26b23e8817f562e06ed74b57a416d15474a0dfc7578b0ed6976a68` |
| EST-CART-04 | 物品交互及估算能力对照 | 不整体覆盖更新的 R5A/HOME 页面；参考包 SHA `88d07d9ddb4eedd5246fba2904d7be94d5d12a97ab0d3f68661d9c9128715227` |
| 2026-10-19 六份交接文本 | 采用最新业务冻结规则和 22 例验收矩阵作为本轮判断依据 | 文档中的实施建议是规范/证据，不自动覆盖用户指定的母版与当前授权 |

## 实际合并范围

在既有 R5A/CAP09B/HOME02A 受控候选的隔离副本上，新增 `prototype/cap_first_item_02.js/.css`，调整 H01 估算入口、估算页容量优先默认态、物品分类/购物车、一次点击提交直达 S5、S5 租期补选与来源返回，并把固定 AI 演示结果改为只可进入按物品估算。容量与物品提交均只在显式「查看适合仓位」时写 `mini_storage_requirement_current`；草稿编辑或取消不覆盖旧确认需求。已知容量 4.9/5/5.1/50m³ 不再按旧 5m³ 门槛跳另一页。物品量使用母版的 `calc()` 和原 40 项物品数据，不把展示图档位或示例 AI 数字写为需求。

母版到本候选的具体文件差异以 `outputs/cap_first_item_02/diff_audit.json` 为准。受保护数据、价格、库存、优惠、订单、物理匹配等 25 个核对文件保持与母版逐字节相同；不等于全链路业务回归通过。完整映射见 `CAP_FIRST_ITEM_02_SOURCE_AND_STATE.md`。

## 阶段结论与下一动作

本候选属于**受控局部合并**，不是统一正式母版、正式 READY 或发布候选。AI 页只有固定演示结果，缺少可核验的真实 AI 结果契约，因此 `ai_assisted` 直达 S5 的 P0 路径仍 BLOCKED。U01 无独立「估算」按钮；正常浏览与直购保留。真实本地 HTTP 访问在该环境触发 `ERR_NETWORK_ACCESS_DENIED`，双尺寸 Chrome 资源拦截测试不代替 HTTP 验收。旧全量回归含母版固有失败与新规则冲突断言，结果见 `CAP_FIRST_ITEM_02_VALIDATION_2026-10-19.md`。Release Gate 维持 **HOLD**。

下一批依次完成：取得可验证的真实 AI 结果或确认仅保留演示回退；在可访问本地 HTTP 的环境按 22 例矩阵跑双尺寸全链路与订单/支付回归；核实 S01/S02/U01/O01 返回上下文及价格/库存/物理适配；更新与最新冻结规则冲突的旧 QA 预期；取得 R4/R5A 原浮窗源码与最终 Banner 后再处理原位视觉归并。全部证据齐全后才审议新母版与准入。
