# CAP-FIRST-ITEM-02｜源码映射与状态契约

## 路由与代码位置

| 页面或模块 | 本轮作用 |
|---|---|
| `prototype/mini_storage_home_H01_Visual_V2_7_4_SSOT.html` `goEstimator` | H01 估算入口默认 `entry=capacity`；普通找仓继续走 `goStores` |
| `prototype/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html` `estimateStrip` | 既有 S01 估算入口带 `returnTo=S01` 与位置、排序、过滤、加载数、滚动参数 |
| `prototype/mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html` `browseEstimator` | 既有 S02 浏览态估算入口带 `returnTo=S02`、门店及搜索参数 |
| `prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html` | `s7` 容量、`s4` 物品、`s5` 推荐；保留原 `items` 40 项、`calc()`、S5 推荐/计价；更新 `saveRequirementSnapshot`、`effectiveRequirement`、`renderUsage`、`initFromHomepage` 和返回逻辑 |
| `prototype/cap_first_item_02.js` | 类别/场景、选品、规格/数量与购物车；手动/物品校验；显式单次提交及导航 S5 |
| `prototype/cap_first_item_02.css` | 容量辅助入口、确认摘要、物品分类和购物车样式 |
| `prototype/mini_storage_ai_result_ai02_v1_demo_patch.html` | 固定示例结果只通往按物品估算，不提交伪 `ai_assisted` 需求 |
| `prototype/mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html` | 继承上一轮 R5A 比较功能，本轮未新增 U01 估算入口 |

## 需求事实来源

母版的已确认需求键仍为 `localStorage.mini_storage_requirement_current`。本轮不创建第二份已确认需求数据库。容量输入、物品数量及未提交租期留在页面状态/草稿，只有显式提交后写原键。页面重新进入时从该键读取最近确认快照；无确认需求时容量框为空，URL 中旧 `returnTarget` 仅作返回上下文而不自动变成新需求。

| 语义 | 实际字段及规则 |
|---|---|
| 精确容量与区间 | `target_volume`, `min_volume`, `max_volume`；容量手输用原档位上下界策略，物品使用原 `calc()` 输出，S5 接收原数值 |
| 来源与一次提交标识 | `source=manual/item_estimate`；`cap_first_submission_id` 标识一次提交，双击锁防重复写入及导航；无真实 AI 时不产生 `ai_assisted` |
| 物品 | `item_snapshot` 保存 `item_id`, `variant_id`, `quantity`, `unit_volume_m3`；`item_constraints`、`has_oversize`、`fit_status`、`item_summary`、`calculation_model` 保留来源语义 |
| 租期 | `term_months`；若此前没有有效租期，保存 0，S5 再选择 1–60 月；未选择时 `pricing_preview=null`，不造 12 个月价格 |
| 上下文 | `entry_context` 加原 URL 返回参数；原 `customer_type`, `travel_mode`, `search_origin_key`, `usage_location` 等沿用母版机制 |
| S5 显式改容量 | 改为 `source=manual`, `calculation_model=S5_MANUAL_ADJUSTMENT` 并清除旧物品快照/约束，防止旧物品事实继续影响新容量 |

S5 自动渲染不应因本轮提交再覆写来源、范围或无租期状态。固定 AI 演示不具备可审计的模型结果标识、有效区间及失败契约，因此只能保留页面与回退；真实 AI 提交属于未完成项。详情以实际源码及浏览器证据为准。
