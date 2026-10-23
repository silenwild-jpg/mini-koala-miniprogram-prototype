> **V2.7.4.17.3 业务口径覆盖说明：** 源月租现已确认属于折扣前基准价；本文件中相关 `BUSINESS_TBD` 表述仅保留为当时历史状态。

# V2.7.4.17.2 · Regression Report

## Targeted QA
PASS:
- V17.2 homepage pricing/tags test
- V17 data semantics/home integrity regression
- V17.1 baseline blocking hotfix regression
- V16 global support/home card compatibility
- store data integration
- S01/S02 store-unit match
- V17.4.15 recommendation pricing
- term handoff and 1–60 month selector consistency
- repository/lifecycle SSOT
- static package integrity
- O01 runtime amount snapshot and lifecycle isolation
- viewing lifecycle runtime
- identity flow
- renewal payment confirmation
- Sales Share Mode

## Static package
- HTML: 45
- inline scripts: 28
- local references: 426
- missing local references: 0

## H01 runtime render check
Because direct localhost navigation is blocked by browser administrator policy in the QA environment, H01 was rendered using the exact HTML with its local scripts inlined into a browser page. This validates DOM/runtime/CSS behavior without claiming full navigation integration.

375×812 and 390×844 both passed:
- page JS errors: 0
- horizontal overflow: 0
- cards: 3
- badges: `距离最近 / 稍远更省 / 限时特价`
- visible stores: `三元桥店 / 大山子店 / 安贞店`
- prices: `135元/月/m³起 / 100元/月/m³起 / 157元/月/m³起`
- factual tags render on all three cards

Screenshots:
- `verification_v27417_2/H01_375x812.png`
- `verification_v27417_2/H01_390x844.png`

## Unchanged business gate
`源月租是否属于折扣前基准价` remains `BUSINESS_TBD`. No discount algorithm was changed in this PATCH.
