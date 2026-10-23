> 历史快照：以下统计为 004B → S5，不代表当前 P1 全包统计。本次 S5 → P1 的逐文件差异见 H01_007_P1_CHANGE_MANIFEST.json。

# H01-007 Change Manifest（H01-004B → 最终候选，逐文件、不重复计数）

基线：H01-004B Help Float Candidate 2026-10-13 (zip sha256 ed87033141944066265d3984ee4e10411d8ea6af84288eb9daabffc1e87c29ca)  
最终：H01-007 Core Trade Fix Candidate 2026-10-13 (S5)  

| 004B 文件数 | 最终文件数 | 未变 | 修改（不同文件） | 其中 prototype 运行时 | 新增 | 删除 |
|---|---|---|---|---|---|---|
| 522 | 542 | 504 | 18 | 12 | 20 | 0 |

RELEASE_MANIFEST.json (recomputed in S5) and the two CHANGE_MANIFEST files are excluded from the rows to avoid self-reference; add 1 modified (RELEASE_MANIFEST.json) and 2 added (CHANGE_MANIFEST .json/.md) for the package total. Distinct files only; a file touched in several stages is counted once (S1 8 + S2 2 + S3 6 + S4 3 = 19 stage-touches collapse to 12 distinct prototype files).

## 修改的文件

| 文件 | 阶段 | 问题编号 | sha256 004B（前 12 位） | sha256 最终（前 12 位） |
|---|---|---|---|---|
| README_CURRENT.md | S5 | S5 | 8941188c9288 | 806adf5c8a6f |
| docs/CHANGELOG.md | S5 | S5 | 55e4b4a37e1c | 38ee3570ef5f |
| docs/CURRENT_STATUS.md | S5 | S5 | a1994f72ca77 | 09f18ec52cea |
| prototype/mini_koala_acceptance_v11_state_patch.js | S3 | D-07 (S3) | 7d272e28aa73 | 6b305f96b7b3 |
| prototype/mini_storage_business_ssot_v274.js | S1/S3 | D-03/D-04 (S1), D-07/D-12 helpers (S3) | 23cb0a4f09d1 | 6ddbca9e1271 |
| prototype/mini_storage_coupon_benefit_v1.js | S2 | D-05/D-06 (S2) | 4d429b97b277 | 5ab8c4e51e1d |
| prototype/mini_storage_coupon_select_c02_v1.html | S2 | D-06 (S2) | 21a7e82ecf2c | 8c60c47bfe3b |
| prototype/mini_storage_home_H01_Visual_V2_7_4_SSOT.html | S3/S4 | D-12 (S3), D-01 (S4) | f4f8c19bdb93 | 62d1dce4eade |
| prototype/mini_storage_mine_m01_v1_11_self_service_Visual_V2_7_4.html | S1/S3 | D-03 (S1), D-12 entry (S3) | 6567dc526f26 | 913ed2237b37 |
| prototype/mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html | S1/S3 | D-04 (S1), D-12 resume re-check (S3) | 5b90428049ef | 8fd5dc757754 |
| prototype/mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html | S1 | D-04 (S1), D-07 banner (S3 via acceptance patch) | 69bf0093f744 | 38d7d3be52c6 |
| prototype/mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html | S1/S4 | D-03 (S1), D-02 (S4) | 2c5a38129702 | d377ed1da229 |
| prototype/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html | S1/S4 | D-03 (S1), D-02 (S4) | dfac3aefca7d | 8bef96961028 |
| prototype/mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html | S1/S3 | D-03/D-04 (S1), D-07 re-check (S3) | a6a579f54b81 | 7520871a8437 |
| prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html | S1 | D-03 (S1) | 113e21ec370a | 397e84de948f |
| qa/test_home_state_integration_patch_v1.cjs | S5 | S5 contract update (D-01) | 3b2c494cd032 | f59b9b504b8a |
| tools/check_package.py | S5 | S5 manifest version/changes carry-over | 79cdb471a06e | ed65dfe6b305 |
| tools/run_regression.py | S5 | S5 registers S1-S4 logic tests | 9cab2cc03e26 | b89b6b0cc4d1 |

## 新增的文件

| 文件 | 阶段 | 用途 | sha256 最终（前 12 位） |
|---|---|---|---|
| docs/H01_007_OPEN_ISSUES.md | — | 阶段文档 | 37eda88fb80a |
| docs/H01_007_S1_Changed_Files.txt | — | 阶段文档 | 7c90a8079921 |
| docs/H01_007_S1_Diff_Report.md | — | 阶段文档 | 59da1d5a998b |
| docs/H01_007_S2_Changed_Files.txt | S2 | 阶段文档 | 7b8f7a73b891 |
| docs/H01_007_S2_Diff_Report.md | S2 | 阶段文档 | 7045ef0d04de |
| docs/H01_007_S2_State_Transitions.md | S2 | 阶段文档 | 27ab8a5d059a |
| docs/H01_007_S3_Changed_Files.txt | — | 阶段文档 | 06dca60a7ecd |
| docs/H01_007_S3_Diff_Report.md | — | 阶段文档 | 36d140458ab6 |
| docs/H01_007_S4_Changed_Files.txt | — | 阶段文档 | 0abcfbe63c75 |
| docs/H01_007_S4_Diff_Report.md | — | 阶段文档 | 23df37379365 |
| docs/H01_007_S4_Regression_Classification.md | — | 阶段文档 | 0b8c5331acdd |
| docs/H01_007_S5_FINAL_ACCEPTANCE_REPORT.md | — | 阶段文档 | 154e94329ba0 |
| qa/test_h01_007_s1_http_flows.py | S1 | 阶段测试 | 0a00f8e6e1e3 |
| qa/test_h01_007_s1_requirement_trade_snapshot.cjs | S1 | 阶段测试 | 9d0199d9c3d7 |
| qa/test_h01_007_s2_coupon_eligibility.cjs | S2 | 阶段测试 | 51f6804748a8 |
| qa/test_h01_007_s2_http_flows.py | S2 | 阶段测试 | 51e33d381a0c |
| qa/test_h01_007_s3_http_flows.py | S3 | 阶段测试 | 5d2b2136f00d |
| qa/test_h01_007_s3_trade_recheck.cjs | S3 | 阶段测试 | 1fa344c0661b |
| qa/test_h01_007_s4_entry_contracts.cjs | S4 | 阶段测试 | ba7a4f53a8a8 |
| qa/test_h01_007_s4_http_flows.py | S4 | 阶段测试 | 253127ecaf84 |

## 删除的文件

无

自引用排除：`RELEASE_MANIFEST.json`（S5 重算，修改）、`docs/H01_007_CHANGE_MANIFEST.json` 与 `.md`（S5 新增）不列入上表；包内合计 = 上表修改 +1、新增 +2。完整哈希见同目录 `H01_007_CHANGE_MANIFEST.json`；RELEASE_MANIFEST.json 为全量文件哈希。