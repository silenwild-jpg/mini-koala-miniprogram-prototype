> **V2.7.4.17.3 业务口径覆盖说明：** 源月租现已确认属于折扣前基准价；本文件中相关 `BUSINESS_TBD` 表述仅保留为当时历史状态。

# V2.7.4.17.2 · Home Recommendation Card Pricing & Tags PATCH

## Scope
This PATCH only changes the H01 three-store recommendation cards. It does not change discount rules, checkout, order, lifecycle, S01/S02/U01 structure, or store/inventory source data.

## Confirmed homepage roles
1. **距离最近**：按当前 H01 统一 Demo Route SSOT 的距离排序。
2. **稍远更省**：排除第一家后，优先在 5km 候选中选择“门店正价可租仓型最低每立方米月租”更低的门店；若没有比最近门店更低的候选，则在 5km 候选中取最低单位立方米月租；5km 无候选时再使用其余门店兜底。
3. **促销配置位**：保持独立可配置，不写回正式门店事实源。默认模拟门店仍为安贞店，默认角标 `限时特价`。

## Price display
H01 three recommendation cards now use one price basis:

`门店最低正价每立方米月租`

Display format:

`XX元/月/m³起`

- `XX元` uses the warm-orange primary price treatment.
- `/月/m³起` is smaller, lighter and visually secondary.
- This homepage comparison price is independent from the unresolved business question of whether source monthly rent is a pre-discount list price. Discount logic remains unchanged.

Default Guomao demo result:
- 三元桥店：135元/月/m³起（距离最近）
- 大山子店：100元/月/m³起（稍远更省）
- 安贞店：157元/月/m³起（模拟促销位）

## Store tags
H01 now renders 1–3 factual tags from existing formal store data only. No unsupported claims such as metro proximity, elevator access, parking or 24-hour access are invented.

Possible derived tags:
- storage type: `社区仓 / 超级仓 / 混合仓`
- `仓型丰富` when the store has at least 8 positive-price size options
- `多尺寸可选` when the store has at least 3 size options
- `大仓可选` when positive-price capacity reaches at least 10m³
- `小仓可选` when positive-price minimum capacity is at most 1.5m³
- `可租充足` when current visible inventory is at least 10

Default demo tags:
- 三元桥店：混合仓 / 多尺寸可选
- 大山子店：社区仓 / 多尺寸可选 / 大仓可选
- 安贞店：混合仓 / 仓型丰富 / 可租充足

## Fact integrity
All three cards continue to use the unified `renderHomeStoreCard(card, profile, index)` path, so visible store name, district, address, inventory, price source, route source, badge, tags and click target stay aligned with the same store ID.
