# H01-007-S4 回归结果与 34 项既有回归分类

## 1. S1–S3 关键 Smoke（S4 树，2026-10-13 10:24–10:29 UTC，`evidence/smoke_after_s4/`）

| 测试 | 结果 |
|---|---|
| S1 逻辑 `test_h01_007_s1_requirement_trade_snapshot.cjs` | 13/13 PASS |
| S1 HTTP `test_h01_007_s1_http_flows.py`（375×812 + 390×844） | 42/42 PASS，MODE fixed ALL_OK |
| S2 逻辑 `test_h01_007_s2_coupon_eligibility.cjs` | 14/14 PASS |
| S2 HTTP `test_h01_007_s2_http_flows.py` | 40/40 PASS，MODE fixed ALL_OK |
| S3 逻辑 `test_h01_007_s3_trade_recheck.cjs` | 18/18 PASS |
| S3 HTTP `test_h01_007_s3_http_flows.py` | 54/54 PASS（27 × 2 视口），控制台错误 0 |
| 既有 `test_coupon_benefit_system_v1.js` | PASS |
| S4 逻辑 `test_h01_007_s4_entry_contracts.cjs` | 30/30 PASS（S3 树 22/30） |
| S4 HTTP `test_h01_007_s4_http_flows.py` | 56/56 PASS（28 × 2 视口，S3 树 14/28 × 2），控制台错误 0 |

同一套 smoke 在 10:14 已跑过一次，结果相同（`smoke_after_s4/status_first_run_10-14.txt`）。

## 2. `tools/run_regression.py` 34 项：S3 22/34 → S4 21/34

逐项比对 `evidence/regression_after_s3_for_comparison.log` 与 `evidence/regression_after_s4.log`：只有一项变化。

| 项 | S3 | S4 | 分类 |
|---|---|---|---|
| test_home_state_integration_patch_v1.cjs | PASS 16/16 | FAIL 15/16 | **历史断言冲突**：第 15 条「home store cards carry associated requirement」要求源码含 `const matched=mode==='matched'||Number(r.target_volume)>0;`，这正是 D-01 要求移除的「门店卡自动携带历史需求」行为。其余 15 条（待支付优先级、估算优先于在租、主 CTA 等）仍通过。详见 `evidence/regression_home_state_integration_detail_s4.log` |

其余 12 项失败与 S1 / S2 / S3 交付逐项相同，原因未变：

| 项 | 分类 | 原因 |
|---|---|---|
| test_ux_simplification_v1.cjs | 历史断言 | 旧文案 / 旧结构断言，自 S1 起失败 |
| test_s01_filter_sort_refinement_v1.cjs | 历史断言 | 同上 |
| test_s01_ux_continuity_patch_v1.js | 环境（vm 沙盒） | `demoActivityFor is not defined`，沙盒缺函数，自 S1 起失败 |
| test_combo_recommendation_v1.cjs | 历史断言 | 自 S1 起失败 |
| test_combo_full_journey_recovery_v21.cjs | 历史断言 | 自 S1 起失败 |
| test_home_state_recovery_browser_v11.py | 环境 | 硬编码 `/usr/bin/chromium` |
| test_home_visual_closeout_patch_v1.py | 环境 | 同上 |
| test_cross_page_runtime_smoke_v1.py | 环境 | 同上 |
| visual_check_combo_recovery_v21.py | 环境 | 同上 |
| visual_check_demo_price_closeout.py | 环境 | 同上 |
| visual_check_combo_ux_v2.py | 环境 | 同上 |
| tools/check_package.py | 登记缺口 | S1–S4 新增的 8 个测试未登记，Release Manifest 留 S5 |

真实产品缺陷：0 项新增。

## 3. 分级结论

- PASS：源码边界、S4 逻辑与 HTTP、S1 / S2 / S3 smoke、U01 / Q01 / O01 未回归、控制台 0 错误。
- FAIL：既有回归 1 项（历史断言与 D-01 新规格冲突，需 S5 裁定断言去留）。
- BLOCKED：无。
- NOT TESTED：微信真机。
