# V2.7.4.17.1 Regression Report

## Targeted new QA

`qa/test_v27417_1_baseline_blocking_hotfix.js` passed all checks:

- removed H01 undefined-index blocker;
- unified all three H01 card fact renderers;
- low-price recommendation uses `display_price_min`;
- default roles resolve to 三元桥 / 酒仙桥 / 安贞;
- O01 no longer claims pre-payment representative unit is physically locked;
- O02 allocates `actual_unit_id` only after successful payment;
- O03 / ID01 / A01 prefer the actual physical unit;
- V01/V02 preserve size-option identity fields.

## Full relevant regression

Passed:

- `test_ai_space_estimator_patch.js`
- `test_batch_a_shared_facts.js`
- `test_c_state_d_page_cleanup.js`
- `test_flow_action_cleanup.js`
- `test_identity_flow.js`
- `test_renew_payment_confirmation.js`
- `test_sales_share_mode.js`
- `test_static_package_integrity.js`
- `test_store_data_integration.js`
- `test_store_unit_match.js`
- `test_term_handoff.js`
- `test_term_selector_consistency.js`
- `test_u01_context.js`
- `test_v27411_requirement_patch.js`
- `test_v27412_runtime_regressions.js`
- `test_v27413_store_list_and_back.js`
- `test_v27415_recommendation_pricing.js`
- `test_v27416_global_support_home_cards.js`
- `test_v27417_data_semantics_home_integrity.js`
- `test_v27417_1_baseline_blocking_hotfix.js`
- `test_ssot.js` (with SSOT path)
- `test_o01_runtime.js` (with SSOT + O01 paths)
- `test_viewing_runtime.js` (with SSOT + V01/V02 paths)

Static package integrity after hotfix:

- HTML: 45
- inline script blocks: 28
- local references: 426
- missing local references: 0

## Visual verification boundary

A new Chromium 390×844 capture was attempted through a local HTTP server, but the headless Chromium command did not complete in this environment. Therefore this delivery does not claim a fresh 375×812 / 390×844 screenshot pass. The prior visual baseline remains useful for unchanged layout, while V2.7.4.17.1 is verified through source, syntax, data, and runtime harness regression.
