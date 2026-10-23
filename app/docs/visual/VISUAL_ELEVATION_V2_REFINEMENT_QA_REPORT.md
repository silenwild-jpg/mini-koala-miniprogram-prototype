# Visual Elevation V2 — Refinement QA Report

## Automated regression
- `node qa/run_baseline_v27418.js`: **43 / 43 PASS**
- Includes the new `test_visual_elevation_v2_refinement.js` guard.

## Body integrity
Byte-identical before/after for:
1. 租期与推荐
2. S01 附近门店
3. Q01 保存当前方案
4. O01 确认订单
5. O02 订单结果
6. O03 订单详情

## Runtime visual QA
Tested at **375×812** and **390×844** with stylesheets and scripts inlined for reliable local rendering.

Across Recommendation / S01 / Q01 / O01 / O02 / O03:
- JS page errors: **0**
- document horizontal overflow: **0**
- abnormal visible internal overflow: only the known collapsed global support launcher measurement; no content overflow blocker
- global support vs primary CTA collision: **0**

### Recommendation
- price container position: `static`
- stable internal grid: enabled
- 375 card width: 347px; price area width: 319px
- 390 card width: 358px; price area width: 326px
- former mobile side-column layout no longer controls the card

### S01 EStore
- normal browse placement remains index 2 (third storage option)
- EStore gets premium secondary-choice Surface and deep-green action treatment
- business placement rules unchanged

### Transactions
Q01 / O01 / O02 / O03 recurring `.rows` are now transparent with `0px` radius; O01/O02 nested order cards are flattened. Payment/status hero Surfaces remain intentionally emphasized.
