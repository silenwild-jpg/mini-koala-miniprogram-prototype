> **V2.7.4.17.3 业务口径覆盖说明：** 源月租现已确认属于折扣前基准价；本文件中相关 `BUSINESS_TBD` 表述仅保留为当时历史状态。

# V2.7.4.17 · Data Semantics & Home Fact Integrity PATCH

## Scope lock

本轮仅处理首页推荐事实完整性与仓位身份语义，不重构冻结页面结构，不新增地图/支付/库存后端，不改变源价格或折扣规则。

## 首页三类推荐

1. **距离最近**：在北京、当前有正价可租库存且容量可展示的门店中，按当前首页统一 Demo Route SSOT 的距离排序；距离相同再按到店时间、可租量排序。
2. **5km 内更省**：排除第一家后，在 5km 内按当前正价每 m³ 月租从低到高选择；若 5km 内没有候选，则退化为其余候选中的低价门店，保证推荐区不中断。
3. **特价促销门店**：独立于正式门店事实源的可配置推荐位。默认演示配置为 `MK_BJ_FAB578DE`，支持 `window.MINI_KOALA_HOME_PROMO` / `window.__MINI_KOALA_HOME_PROMO__` 或 `promoStore` 查询参数覆盖。当前促销仅为内部演示，不写回 `store_master` / `size_options`。

首页门店图片统一改为“门店环境示意”，功能标签只展示数据源可证明的仓储类型，避免动态门店名称与旧静态图片/功能标签错配。

## 仓位身份语义

当前正式库存源是“门店 × 容量档位”聚合数据，`representative_unit_no` 只是代表仓号，不等于已锁定的具体物理仓位。V2.7.4.17 新增并沿主链传递：

- `size_option_id`：用户实际选择的容量档位 ID；
- `representative_unit_no`：仅作页面参考展示；
- `actual_unit_id`：真实物理仓位 ID，当前原型保持 `null`；
- `unit_identity_type=SIZE_OPTION`；
- `unit_id_semantics=LEGACY_REPRESENTATIVE_DISPLAY`：旧 `unit_id` 暂保留用于历史原型兼容，不得解释为真实库存锁定。

S01/S02 requirement context、U01、Q01、O01 均补充上述字段。U01 的 review-only“锁仓”演示改为“保留容量方案”演示，明确不代表锁定具体物理仓位。

## Price business gate

**BUSINESS_TBD：源月租价格是否属于“折扣前基准价”尚未确认。**

因此 V2.7.4.17：

- 不修改 `display_price_min` / `positivePrice()`；
- 不新增、删除或调整租期折扣；
- 不把源价格重新解释为挂牌价、成交价或活动价；
- 后续在业务确认源价格口径后，再单独决定是否需要 Pricing PATCH。

## Non-goals

- 不接真实地图；
- 不接真实库存锁定；
- 不接真实促销后台；
- 不改 H01/S01/S02/U01/Q01/O01 冻结模块顺序；
- 不进行新的视觉重设计。
