# V2.7.4.17.3 Static Regression Report

## Result
PASS for code/static regression. Fresh Chromium visual navigation remains blocked by the current environment policy (`ERR_BLOCKED_BY_ADMINISTRATOR`), so no new browser screenshot is claimed.

## Business rules verified
- Source monthly rent basis: `pre_discount_base_price` (confirmed).
- Home default display discount factor: `0.65`.
- Default H01 prices: 三元桥 88 / 大山子 65 / 安贞 102 元/月/m³起 (rounded display).
- Frozen demo tags:
  - 三元桥：近地铁 / 搬运方便 / 电梯直达
  - 大山子：社区仓 / 多尺寸可选 / 24小时存取
  - 安贞：混合仓 / 仓型丰富 / 停车方便
- Global support: phone `4000358805`; WeChat calls `wx.openCustomerServiceChat` when injected service config is available; browser fallback remains available.

## Regression suites passed
- `test_v27417_3_home_discount_tags_global_support.js`
- `test_v27417_2_home_pricing_tags.js`
- `test_v27417_1_baseline_blocking_hotfix.js`
- `test_v27417_data_semantics_home_integrity.js`
- `test_v27416_global_support_home_cards.js`
- `test_store_data_integration.js`
- `test_store_unit_match.js`
- `test_v27415_recommendation_pricing.js`
- `test_v27412_runtime_regressions.js`
- `test_term_handoff.js`
- `test_term_selector_consistency.js`
- `test_o01_runtime.js` (with SSOT + O01 path args)
- `test_identity_flow.js`
- `test_viewing_runtime.js` (with SSOT + V01/V02 path args)
- `test_renew_payment_confirmation.js`
- `test_sales_share_mode.js`
- `test_static_package_integrity.js`
- `test_ssot.js` (with SSOT path arg)

## Package integrity
- Canonical prototype static check: 45 HTML, 28 inline scripts, 426 local references, 0 missing.
- Recursive package HTML check: 77 HTML pages/entry wrappers, global support hook present on all, 0 missing local refs.
