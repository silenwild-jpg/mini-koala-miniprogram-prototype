> **V2.7.4.17.3 业务口径覆盖说明：** 源月租现已确认属于折扣前基准价；本文件中相关 `BUSINESS_TBD` 表述仅保留为当时历史状态。

# V2.7.4.17 静态与运行时回归报告

## 变更范围

- H01：推荐规则改为“距离最近 / 5km 内更省 / 可配置促销”。
- H01：门店图片统一为环境示意，标签仅保留数据源可证明的仓储类型。
- 数据适配：补充 `size_option_id / representative_unit_no / actual_unit_id / inventory_identity_type`。
- S01 / S02 / U01 / Q01 / O01：非破坏式传递容量档位身份；旧 `unit_id` 仅作兼容代表仓号。
- U01 review-only 锁仓演示改为容量方案保留演示。
- Pricing：不改价格逻辑，源月租是否为折扣前基准价继续 `BUSINESS_TBD`。

## 默认首页推荐验证（国贸 Demo Route）

- 第一张：三元桥店，3.2km，按距离最近选取。
- 第二张：大山子店，4.8km，在 5km 候选中按当前正价每 m³ 月租最低选取。
- 第三张：默认促销配置酒仙桥店；可通过全局配置或查询参数替换，不写回正式门店数据。

## 回归结果

通过：

- `test_v27417_data_semantics_home_integrity.js`
- `test_v27416_global_support_home_cards.js`（已移除废止的高价优先断言）
- `test_store_data_integration.js`
- `test_store_unit_match.js`
- `test_v27415_recommendation_pricing.js`
- `test_v27412_runtime_regressions.js`
- `test_term_handoff.js`
- `test_term_selector_consistency.js`
- `test_static_package_integrity.js`
- `test_ssot.js`（带参数运行）
- `test_o01_runtime.js`（带参数运行）
- `test_viewing_runtime.js`（带参数运行）

静态包：45 个 HTML、28 个内联脚本、426 个本地引用，检查通过。

## 视觉验证边界

当前执行环境对 `localhost` 与 `file://` Chromium 导航均返回 `ERR_BLOCKED_BY_ADMINISTRATOR`，因此本轮不能声称完成新的浏览器截图/真机视觉验收。静态语法、引用和业务回归已完成；375×812 / 390×844 需要在允许本地导航的设备上继续确认。
