# 直接依赖的最小逻辑契约｜BRANCH-03 HIFI-03

本文件仅用于 PROTO-MERGE 隔离接收与接线，不表示中央已有这些同名 JS API。逻辑字段兼容 snake_case/camelCase 输入，输出使用 snake_case。

## 入口：CAP / H01 / S5 → S01或S02

| 中央来源字段（候选） | 分支桥接字段 | 处理 |
|---|---|---|
| `capacity_m3` / `capacityM3` | `requirement.capacity_m3` | 保留原始小数精度，如 3.53 |
| `source` / `entrySource` | `requirement.source` | `H01`、`CAP`、`S5` 等，供返回上下文 |
| `term_months` / `rentalMonths` | `requirement.term_months` | 仅接收合法 1/3/6/12/24/36/60 |
| `term_confirmed` / `termConfirmed` | `requirement.term_confirmed` | 仅显式 `true` 可视为确认；有月份≠已确认 |
| `entry_context` / `returnContext` | `requirement.entry_context` | 上游来路引用，不能清空返回来源 |
| `quote_snapshot_ref` / `quoteSnapshotRef` | `requirement.quote_snapshot_ref` | 仅引用，不包含任何应付金额 |
| `quoteStoreId` / `quote_store_id` | `requirement.quote_store_id` | 校验引用对应门店，中央需映射真实ID |
| `quoteUnitId` / `quote_unit_id` | `requirement.quote_unit_id` | 单仓引用只有在该仓匹配时透传；组合仓需重核价 |
| `store_id`/`storeId`（可选） | `openS02(demoStoreId)` | 当前只支持 4 个演示门店 ID，MERGE需映射 |

**最小调用顺序**：`mount({requirement,entry})` → `READY` → `setRequirement` → `openS01/openS02`。页面内部浏览/筛选/返回不写中央共享需求。

## S01 → S02

传入 `store_id`，保留 `sort`、`filters`、`scroll_position`、`capacity_m3`、租期确认状态。返回 S01 恢复本分支的筛选及滚动；从 S5 返回的中央跨页落点仍需 MERGE 统一确定。

## S02 → O01：只输出 OrderDraftIntent

```json
{
  "store_id": "jingan",
  "unit_id": "A-102",
  "units": [],
  "capacity_m3": 3.5,
  "area_m2": 1.75,
  "start_date": "DEMO_DATE",
  "term_months": 12,
  "term_confirmed": true,
  "quote_snapshot_ref": null,
  "return_context": {
    "origin": "S02",
    "from": "S5",
    "entry_context": {"origin": "S5"},
    "s1_sort": "推荐",
    "s1_filters": {"price": "不限", "service": "全部"},
    "s01_scroll_position": 0,
    "category": "全部"
  },
  "status": "INTENT_ONLY_PENDING_VALIDATION"
}
```

- 输出不含 `rent_total/deposit/management_fee/discount/coupon/payable`，这些只能由中央的统一报价／订单快照接口生成。
- 组合仓：`unit_id=null`、`units=['A-102','B-208']`，合为**一个整单意图**，不得拆成两个 O01。
- 没有租期：分支先打开租期补选，再产生意图；中央后续应按共享规则再验其有效性。
- `quote_snapshot_ref` 不是金额授权；**中央先校验其对应 selection+store+term+有效状态，否则失效重算**。
- U01 是可选详情，不能作为必经下单页；U01的 `goOrder/goQuote` 交易准备逻辑不可直接删除。

## 预约、收藏、辅助导航

- `BOOKING_INTENT`: `{type:'BOOKING_LEAD_INTENT',store_id,remark,status:'INTENT_ONLY'}`。中央应接 BRANCH-04 独立预约页和 `lead_id` 流程，不能记成订单。
- `FAVORITE_CHANGED`: `{unit_id,is_favorite}`；将其适配到已有收藏键，不触及 `mini_koala_unit_compare_r5a_v1`。
- `NAV_REQUEST`: 主底部导航意图；门店“地图导航”是外部导航，与删除的小程序内地图模式不同。
- `STATE_CHANGED`: 只供调试、恢复页内状态；跨分支共享状态归中央持有。

## 已发现的直接缺口

1. 演示门店/仓位 ID 不是中央真实ID：需提供明确映射；ID 无法映射时不可提交 O01。
2. S5 指定推荐仓位聚焦尚不支持页面级高亮滚动；中央接线时增加最小定位能力，不修改冻结视觉。
3. 中央 O01 的真实日期校验、可用性、优惠、组合仓金额、恢复/返回未在分支内验证。
4. 本地 `br03_demo_favs` 只做单分支演示；接入收藏共享键需要中央适配。
5. `entry_context` 的最终标准字段以中央 PROTO-MERGE-01D 为准；不由本分支重新定义全局协议。
