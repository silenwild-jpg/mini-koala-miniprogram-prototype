# GIT-SETUP-01 物理接收核验

检查时间(UTC)：2026-10-23T15:24:59+00:00

本表来自本地原件的实际ZIP字节校验；仅做物理验证，不证明页面视觉或跨页路由通过。

| 输入项 | 文件 | 字节 | SHA256 | 条目/CRC | 状态 |
|---|---|---:|---|---|---|
| BASELINE | CURRENT_CANDIDATE.zip | 27631053 | `bb04999dda292983780d9d627a7afb546b6f610917a2aca35fd225c3b1d384fe` | 909 / PASS | PASS |
| CENTRAL_01B | Mini_Koala_PROTO_MERGE_01B_Isolated_Integration_2026-10-23(3).zip | 27655522 | `4c715c4a03df856cda7cb3e4d6526f2ae067c11590ebf664cc2dcdd6aa6a2490` | 914 / PASS | PHYSICAL_PASS / NOT_MERGED |
| CENTRAL_01F_BR03_B4A | NOT_FOUND | 0 | `—` | — / — | MISSING_LOCAL |
| BRANCH_01 | NOT_FOUND | 0 | `—` | — / — | MISSING_LOCAL |
| BRANCH_02_CAP | BRANCH_02_FREEZE_01_%E5%AE%B9%E9%87%8F%E9%A1%B5%E8%A7%86%E8%A7%89%E6%AF%8D%E7%89%88%E7%AD%BE%E6%94%B6%E5%8C%85 (1).zip | 12098393 | `2c17cc2d05c614eaecf7c536afc4d3a4260b5e95fd3a723dbc3ef457751bae64` | 4 / PASS | PHYSICAL_PASS / NOT_MERGED |
| BRANCH_02_ITEMS | NOT_FOUND | 0 | `—` | — / — | MISSING_LOCAL |
| BRANCH_02_FLOW_PROCESS_ONLY | BRANCH_02_FLOW_08A_高保真视觉对齐与防漂移精修包(1).zip | 3094294 | `8088886225928a3e7ba7eb46a05e579011fe75ed6feca2a118008b520808cbad` | 33 / PASS | PHYSICAL_PASS / NOT_MERGED |
| BRANCH_03 | Mini_Koala_BRANCH03_HIFI03_Portable_Handoff_2026-10-23(1).zip | 2307850 | `3cfca68e6c614ec68959ff74c1f8b327433336f7519f7d1819007f578c2da400` | 30 / PASS | PHYSICAL_PASS / NOT_MERGED |
| BRANCH_04 | NOT_FOUND | 0 | `—` | — / — | MISSING_LOCAL |

**历史基线来源：** `CURRENT_CANDIDATE.zip [direct]`
**历史基线结论：** PASS

注意：候选 01B/01F 只进入核验清单，不自动进入 Git 代码树。
注意：四分支 Git 工作分支初始相同，源码迁移必须另起 PR、对比视觉并测试。
