# Visual Elevation V2.1 — Density QA Report

## Runtime coverage
- Estimator 场景页（选中态）
- U01 4.8m³ / 6个月价格方案
- RN01 当前仓位 / 6个月续租
- IV01 已支付订单开票
- B2B 默认企业需求表单
- 375×812 / 390×844

## Result
- JS page error: 0
- document horizontal overflow: 0
- abnormal visible internal overflow: 0（全局帮助 launcher 的既有折叠文字宽度除外）
- B2B 租期折扣悬浮角标 overflow: 已消除
- 5 / 5 target body SHA-256 frozen
- Baseline Runner: 44 / 44 authoritative JS tests PASS

## Measured density deltas @ 375
- Estimator：白色场景 Surface 7 → 1（仅选中项）
- RN01 `#renewForm`：white / 18px card → transparent / 0px
- IV01 `#formCard`：white / 18px card → transparent / 0px
- B2B 首个未选 Chip：#FFFFFF → #F1EEE7，选中态继续深绿
- U01：身份卡从纯白强阴影改为 88% 半透明浮层；价格区升级为唯一深绿强 Surface

## Regression
新增 `test_visual_elevation_v2_1_density.js`，冻结五个 body hash 并验证 V2.1 CSS 规则存在。全量 44 项权威 JS 回归通过。
