# PROJECT-OPS-RESET-01 / P1-B｜全量分支审计与安全归档候选

审计日期：2026-11-13。来源：GitHub Branches第1/2/3页、Open PR两页，以及对48条非引用历史分支逐条执行的 GitHub Compare Commit API。此处的每项ahead/behind均相对下述main审计SHA。

- main基线：`165e521cca6e9453a691c6660d04110538f7fdec`，保护状态：`true`。
- 已签收RC2候选：PR #176，冻结SHA `41a8a079eb48049e1060512bddf71c226bfd3738`。
- 分支总数 **180**；开放PR head/base引用的分支 **131**；本次审计新分支 **1**；另外 **48** 条未被当前开放PR引用。
- 48条中，与main的提交祖先关系：**21** 条ahead=0；**27**条ahead>0。

**证据边界：** `ahead=0`只证明该分支没有领先main的独有提交，不等于没有备份/版本身份价值；`ahead>0`只是Git提交关系，不代表内容一定没有进入PR #176（可能已经cherry-pick或定向移植）。GitHub Squash合并PR后的源分支仍可`diverged`。此报告不执行任何删除。

## 分组数量

| 分组 | 数量 |
|---|---:|
| ANCESTOR-NO-UNIQUE | 18 |
| AUDIT-ACTIVE | 1 |
| DIVERGED-UNIQUE | 25 |
| HISTORICAL-SNAPSHOT | 3 |
| MAIN-LOCK | 1 |
| MERGED-GOVERNANCE | 2 |
| OPEN-PR-REFERENCE | 130 |

## 未被开放PR引用的48条分支：提交比较与处理建议

| 分支名 | SHA | ahead/behind | 与main差异文件数 | 分类 | 后续处理 |
|---|---|---|---:|---|---|
| `audit/rc2-p1-demo-close-02-20261110` | `310a3c2e9a` | 513/6 | 206 | DIVERGED-UNIQUE | 与main存在独有提交，必须做文件/来源验收再评估 |
| `audit/rc2-uat-user-01-20261110` | `19ed539fdb` | 516/6 | 207 | DIVERGED-UNIQUE | 与main存在独有提交，必须做文件/来源验收再评估 |
| `audit/rc2-ux-quality-rebase-01-20261111` | `c7bc61902c` | 532/6 | 214 | DIVERGED-UNIQUE | 与main存在独有提交，必须做文件/来源验收再评估 |
| `backup/main-pre-02n-review-config-20261027` | `285ff1529a` | 0/15 | 0 | HISTORICAL-SNAPSHOT | 备份/发布来源，默认保留 |
| `backup/main-pre-demo-mk-rc1-20261027` | `97ecfe97df` | 0/127 | 0 | HISTORICAL-SNAPSHOT | 备份/发布来源，默认保留 |
| `br01-h01-connect-03-isolated` | `e7d0da04c2` | 3/6 | 3 | DIVERGED-UNIQUE | 与main存在独有提交，必须做文件/来源验收再评估 |
| `feat/h01-task-space-explore-03-20261111` | `c9941ba22d` | 650/6 | 225 | DIVERGED-UNIQUE | 与main存在独有提交，必须做文件/来源验收再评估 |
| `feature/br01-home` | `739f524376` | 0/126 | 0 | ANCESTOR-NO-UNIQUE | 没有领先main的独有提交，潜在归档对象；仍需核对历史用途 |
| `feature/br02-capacity` | `fddbe355c5` | 0/126 | 0 | ANCESTOR-NO-UNIQUE | 没有领先main的独有提交，潜在归档对象；仍需核对历史用途 |
| `feature/br03-promo-copy-01` | `8a0003d11b` | 0/124 | 0 | ANCESTOR-NO-UNIQUE | 没有领先main的独有提交，潜在归档对象；仍需核对历史用途 |
| `feature/br03-s01-s02` | `e0761bd710` | 1/125 | 25 | DIVERGED-UNIQUE | 与main存在独有提交，必须做文件/来源验收再评估 |
| `feature/br03-store-unit` | `c5056fe478` | 0/125 | 0 | ANCESTOR-NO-UNIQUE | 没有领先main的独有提交，潜在归档对象；仍需核对历史用途 |
| `feature/core-journey-fix-01` | `6015b9a787` | 0/126 | 0 | ANCESTOR-NO-UNIQUE | 没有领先main的独有提交，潜在归档对象；仍需核对历史用途 |
| `feature/git-merge-02c-targeted-20261027` | `91e6ef3178` | 0/99 | 0 | ANCESTOR-NO-UNIQUE | 没有领先main的独有提交，潜在归档对象；仍需核对历史用途 |
| `feature/git-merge-02e-visual-e2e-20261027` | `6584b5202d` | 0/92 | 0 | ANCESTOR-NO-UNIQUE | 没有领先main的独有提交，潜在归档对象；仍需核对历史用途 |
| `feature/git-merge-02f-premerge-gates-20261027` | `2d72a3d2f4` | 0/82 | 0 | ANCESTOR-NO-UNIQUE | 没有领先main的独有提交，潜在归档对象；仍需核对历史用途 |
| `feature/git-merge-02g-central-ssot-20261027` | `f6ffcb29fd` | 0/68 | 0 | ANCESTOR-NO-UNIQUE | 没有领先main的独有提交，潜在归档对象；仍需核对历史用途 |
| `feature/git-merge-02h-source-and-visual-20261027` | `c141bec6b3` | 0/64 | 0 | ANCESTOR-NO-UNIQUE | 没有领先main的独有提交，潜在归档对象；仍需核对历史用途 |
| `feature/git-merge-02i-demo-admission-20261027` | `a6c828476e` | 0/44 | 0 | ANCESTOR-NO-UNIQUE | 没有领先main的独有提交，潜在归档对象；仍需核对历史用途 |
| `feature/git-merge-02j-legacy-store-intake-20261027` | `fd4babb615` | 0/28 | 0 | ANCESTOR-NO-UNIQUE | 没有领先main的独有提交，潜在归档对象；仍需核对历史用途 |
| `feature/git-merge-02k-legacy-visual-gate-20261027` | `e863dead43` | 0/20 | 0 | ANCESTOR-NO-UNIQUE | 没有领先main的独有提交，潜在归档对象；仍需核对历史用途 |
| `feature/git-merge-02n-protected-review-package-20261027` | `ecb5e10888` | 0/9 | 0 | ANCESTOR-NO-UNIQUE | 没有领先main的独有提交，潜在归档对象；仍需核对历史用途 |
| `feature/visual-consistency-01` | `157e512606` | 0/120 | 0 | ANCESTOR-NO-UNIQUE | 没有领先main的独有提交，潜在归档对象；仍需核对历史用途 |
| `feature/wx-native-01e` | `963b350974` | 0/125 | 0 | ANCESTOR-NO-UNIQUE | 没有领先main的独有提交，潜在归档对象；仍需核对历史用途 |
| `fix/rc2-p1-demo-close-01-20261110` | `5cd12af243` | 514/6 | 205 | DIVERGED-UNIQUE | 与main存在独有提交，必须做文件/来源验收再评估 |
| `fix/rc2-single-candidate-04-20261112` | `7b7a929d25` | 690/6 | 295 | DIVERGED-UNIQUE | 与main存在独有提交，必须做文件/来源验收再评估 |
| `fix/site-access-03c-s5-iframe-route-20261029` | `403f3b59ab` | 9/8 | 5 | DIVERGED-UNIQUE | 与main存在独有提交，必须做文件/来源验收再评估 |
| `governance/ops-postmerge-status-01-20261113` | `41ce65e209` | 3/1 | 3 | MERGED-GOVERNANCE | 治理PR已Squash合并；需要复核独有历史后方可归档 |
| `governance/proto-vis-exec-01-20261103` | `6cd9c6d98e` | 20/6 | 11 | MERGED-GOVERNANCE | 治理PR已Squash合并；需要复核独有历史后方可归档 |
| `integration/git-merge-02b-seven-pr-isolated-20261027` | `8bd1ad9a34` | 0/113 | 0 | ANCESTOR-NO-UNIQUE | 没有领先main的独有提交，潜在归档对象；仍需核对历史用途 |
| `integration/proto-merge-01f` | `97ecfe97df` | 0/127 | 0 | ANCESTOR-NO-UNIQUE | 没有领先main的独有提交，潜在归档对象；仍需核对历史用途 |
| `isolate/rc2-cap-h01-integration-gate-01-20261112` | `9eec773091` | 683/6 | 290 | DIVERGED-UNIQUE | 与main存在独有提交，必须做文件/来源验收再评估 |
| `isolate/rc2-gate-ready-02-main-candidate-20261102` | `56e6ad917c` | 166/6 | 70 | DIVERGED-UNIQUE | 与main存在独有提交，必须做文件/来源验收再评估 |
| `isolate/rc2-h01-active-no-photo-03-20261112` | `0346a0ec21` | 665/6 | 288 | DIVERGED-UNIQUE | 与main存在独有提交，必须做文件/来源验收再评估 |
| `isolate/rc2-h01-task-vis-adapt-01-20261112` | `5182f5eb88` | 661/6 | 285 | DIVERGED-UNIQUE | 与main存在独有提交，必须做文件/来源验收再评估 |
| `isolate/rc2-merge-prep-01-three-source-20261102` | `212a9dde17` | 32/6 | 15 | DIVERGED-UNIQUE | 与main存在独有提交，必须做文件/来源验收再评估 |
| `isolate/rc2-merge-prep-03-h01-receipt-gate-20261102` | `c768cdd8d9` | 54/6 | 49 | DIVERGED-UNIQUE | 与main存在独有提交，必须做文件/来源验收再评估 |
| `isolate/rc2-s02-term-state-01-20261112` | `a6bcfafe18` | 641/6 | 280 | DIVERGED-UNIQUE | 与main存在独有提交，必须做文件/来源验收再评估 |
| `isolate/rc2-s5-source-reconcile-01-20261112` | `cffe000a30` | 631/6 | 277 | DIVERGED-UNIQUE | 与main存在独有提交，必须做文件/来源验收再评估 |
| `isolate/ux-quality-01-r2-audit-20261102` | `b82955890f` | 171/6 | 72 | DIVERGED-UNIQUE | 与main存在独有提交，必须做文件/来源验收再评估 |
| `isolate/ux-quality-01-r2-close-20261102` | `c5195f1af8` | 171/6 | 71 | DIVERGED-UNIQUE | 与main存在独有提交，必须做文件/来源验收再评估 |
| `ops/git-cost-opt-01a-review-gate` | `4716ed5f8e` | 430/6 | 181 | DIVERGED-UNIQUE | 与main存在独有提交，必须做文件/来源验收再评估 |
| `ops/rc2-uat-package-gate-20261105` | `276e2100d7` | 427/6 | 182 | DIVERGED-UNIQUE | 与main存在独有提交，必须做文件/来源验收再评估 |
| `ops/site-connect-03a-rc1-p1-cd-20261029` | `02fa039c77` | 2/7 | 2 | DIVERGED-UNIQUE | 与main存在独有提交，必须做文件/来源验收再评估 |
| `release/demo-mk-rc1-20261027` | `05b283f845` | 0/16 | 0 | HISTORICAL-SNAPSHOT | 备份/发布来源，默认保留 |
| `stage/rc2-pr96-p1-uat-20261110` | `be4b8d1aee` | 507/6 | 206 | DIVERGED-UNIQUE | 与main存在独有提交，必须做文件/来源验收再评估 |
| `uat/rc2-pr96-20261110` | `be4b8d1aee` | 507/6 | 206 | DIVERGED-UNIQUE | 与main存在独有提交，必须做文件/来源验收再评估 |
| `visual/vis-rebuild-03a-s01-approved-a-white-distance-20261028` | `d63574fdc3` | 11/8 | 7 | DIVERGED-UNIQUE | 与main存在独有提交，必须做文件/来源验收再评估 |

## 全部180条分支索引

| 分支 | SHA | Open PR 引用 | 分类 |
|---|---|---|---|
| `audit/h01-state-vis-restore-01-20261111` | `b245db72c5d1` | head+base | OPEN-PR-REFERENCE |
| `audit/rc2-final-gate-01-20261104` | `b77a57dbd74d` | head | OPEN-PR-REFERENCE |
| `audit/rc2-final-integration-01-20261104` | `40935d98192f` | head+base | OPEN-PR-REFERENCE |
| `audit/rc2-final-merge-02-visual-gate-20261103` | `6249e07bf195` | head | OPEN-PR-REFERENCE |
| `audit/rc2-final-vis-signoff-01-20261104` | `8c4adec391f5` | head | OPEN-PR-REFERENCE |
| `audit/rc2-p1-demo-close-02-20261110` | `310a3c2e9ac3` | 无 | DIVERGED-UNIQUE |
| `audit/rc2-rule-fix-01a-lifecycle-isolated` | `212a9dde17e7` | head | OPEN-PR-REFERENCE |
| `audit/rc2-single-candidate-02-20261104` | `ffaef7547cbf` | head | OPEN-PR-REFERENCE |
| `audit/rc2-uat-release-ready-01-20261104` | `3d862d3ad56f` | head | OPEN-PR-REFERENCE |
| `audit/rc2-uat-user-01-20261110` | `19ed539fdbca` | 无 | DIVERGED-UNIQUE |
| `audit/rc2-ux-quality-rebase-01-20261111` | `c7bc61902ca6` | 无 | DIVERGED-UNIQUE |
| `backup/main-pre-02n-review-config-20261027` | `285ff1529a0f` | 无 | HISTORICAL-SNAPSHOT |
| `backup/main-pre-demo-mk-rc1-20261027` | `97ecfe97df9a` | 无 | HISTORICAL-SNAPSHOT |
| `br01-h01-connect-03-isolated` | `e7d0da04c283` | 无 | DIVERGED-UNIQUE |
| `design/vis-rebuild-01-exploration-20261028` | `4818a4e58043` | head | OPEN-PR-REFERENCE |
| `design/vis-system-01-s01-layout-20261111` | `da63f54ee113` | head | OPEN-PR-REFERENCE |
| `docs/prd-baseline-01-v1-20261103` | `df09a340fc2f` | head | OPEN-PR-REFERENCE |
| `explore/s01-ux-refine-05-20261111` | `2241dc3ab461` | head | OPEN-PR-REFERENCE |
| `feat/h01-afterpay-ble-deposit-help-20261111` | `31a3948b1720` | head+base | OPEN-PR-REFERENCE |
| `feat/h01-identity-lock-gate-05-20261111` | `778c1dd6e706` | head+base | OPEN-PR-REFERENCE |
| `feat/h01-order-payment-3h-20261111` | `6891a6ebd38d` | head+base | OPEN-PR-REFERENCE |
| `feat/h01-state-implement-01-20261111` | `14b09dbbec16` | head+base | OPEN-PR-REFERENCE |
| `feat/h01-state-vis-restore-02-20261111` | `dee30e7468b3` | head+base | OPEN-PR-REFERENCE |
| `feat/h01-state-vis-restore-03-20261111` | `abe8981c5740` | head+base | OPEN-PR-REFERENCE |
| `feat/h01-task-space-explore-03-20261111` | `c9941ba22d47` | 无 | DIVERGED-UNIQUE |
| `feat/h01-vis-gate-07-20261111` | `116e3947b098` | head | OPEN-PR-REFERENCE |
| `feature/br01-home` | `739f524376ae` | 无 | ANCESTOR-NO-UNIQUE |
| `feature/br02-capacity` | `fddbe355c5d8` | 无 | ANCESTOR-NO-UNIQUE |
| `feature/br03-promo-copy-01` | `8a0003d11b96` | 无 | ANCESTOR-NO-UNIQUE |
| `feature/br03-s01-s02` | `e0761bd71031` | 无 | DIVERGED-UNIQUE |
| `feature/br03-store-unit` | `c5056fe47809` | 无 | ANCESTOR-NO-UNIQUE |
| `feature/cap-unit-dual-01-20261112` | `92e0cd855b9f` | head+base | OPEN-PR-REFERENCE |
| `feature/core-journey-fix-01` | `6015b9a787ab` | 无 | ANCESTOR-NO-UNIQUE |
| `feature/git-merge-02c-targeted-20261027` | `91e6ef31785a` | 无 | ANCESTOR-NO-UNIQUE |
| `feature/git-merge-02e-visual-e2e-20261027` | `6584b5202db4` | 无 | ANCESTOR-NO-UNIQUE |
| `feature/git-merge-02f-premerge-gates-20261027` | `2d72a3d2f4ec` | 无 | ANCESTOR-NO-UNIQUE |
| `feature/git-merge-02g-central-ssot-20261027` | `f6ffcb29fd4c` | 无 | ANCESTOR-NO-UNIQUE |
| `feature/git-merge-02h-source-and-visual-20261027` | `c141bec6b35b` | 无 | ANCESTOR-NO-UNIQUE |
| `feature/git-merge-02i-demo-admission-20261027` | `a6c828476e52` | 无 | ANCESTOR-NO-UNIQUE |
| `feature/git-merge-02j-legacy-store-intake-20261027` | `fd4babb615b5` | 无 | ANCESTOR-NO-UNIQUE |
| `feature/git-merge-02k-legacy-visual-gate-20261027` | `e863dead4391` | 无 | ANCESTOR-NO-UNIQUE |
| `feature/git-merge-02n-protected-review-package-20261027` | `ecb5e108885c` | 无 | ANCESTOR-NO-UNIQUE |
| `feature/m01-rebaseline-01-20261111` | `f8ed24579d8a` | head+base | OPEN-PR-REFERENCE |
| `feature/m01-rebaseline-02-20261111` | `5914e865bfd9` | head | OPEN-PR-REFERENCE |
| `feature/s01-vis-decision-02-20261111` | `bf44d2afa1e2` | head+base | OPEN-PR-REFERENCE |
| `feature/visual-consistency-01` | `157e512606b1` | 无 | ANCESTOR-NO-UNIQUE |
| `feature/wx-native-01e` | `963b35097489` | 无 | ANCESTOR-NO-UNIQUE |
| `fix/rc2-p1-demo-close-01-20261110` | `5cd12af243f2` | 无 | DIVERGED-UNIQUE |
| `fix/rc2-s02-photo-source-01-20261112` | `1b90d8d85fef` | head+base | OPEN-PR-REFERENCE |
| `fix/rc2-single-candidate-04-20261112` | `7b7a929d25ca` | 无 | DIVERGED-UNIQUE |
| `fix/s02-final-review-01-20261111` | `742e2269943a` | head | OPEN-PR-REFERENCE |
| `fix/site-access-03c-s5-iframe-route-20261029` | `403f3b59ab83` | 无 | DIVERGED-UNIQUE |
| `governance/ops-postmerge-status-01-20261113` | `41ce65e2093a` | 无 | MERGED-GOVERNANCE |
| `governance/project-ops-p1a-p1b-audit-20261113` | `f1d1235974f0` | 无 | AUDIT-ACTIVE |
| `governance/proto-vis-exec-01-20261103` | `6cd9c6d98e87` | 无 | MERGED-GOVERNANCE |
| `integration/git-merge-02b-seven-pr-isolated-20261027` | `8bd1ad9a3409` | 无 | ANCESTOR-NO-UNIQUE |
| `integration/h01-single-candidate-01-20261111` | `f08bafb95dcc` | head+base | OPEN-PR-REFERENCE |
| `integration/proto-merge-01f` | `97ecfe97df9a` | 无 | ANCESTOR-NO-UNIQUE |
| `integration/rc2-clean-migration-01-20261113` | `41a8a079eb48` | head | OPEN-PR-REFERENCE |
| `integration/rc2-h01-order-s5-isolated-20261111` | `9722caab0704` | head | OPEN-PR-REFERENCE |
| `integration/rc2-rebaseline-01-20261110` | `e435bb25eddc` | head+base | OPEN-PR-REFERENCE |
| `isolate/h01-baseline-vis-check-01-20261112` | `1391fa3152fb` | head | OPEN-PR-REFERENCE |
| `isolate/h01-m01-contract-01-20261112` | `3b74fa502a12` | head+base | OPEN-PR-REFERENCE |
| `isolate/h01-m01-flow-qa-01-20261112` | `a20023f9e9d8` | head | OPEN-PR-REFERENCE |
| `isolate/h01-ux-review-02-fivecity-state-photo-20261104` | `d5fef72e0380` | head+base | OPEN-PR-REFERENCE |
| `isolate/h01-ux-review-03a-headline-375390-20261104` | `b5169f92350f` | head+base | OPEN-PR-REFERENCE |
| `isolate/m01-ia-03-20261112` | `8a4e7127954f` | head+base | OPEN-PR-REFERENCE |
| `isolate/motion-s01-s5-01b-20261112` | `2f56fbb43ee1` | head+base | OPEN-PR-REFERENCE |
| `isolate/motion-s01-s5-01c-20261113` | `74279a5cfb6f` | head+base | OPEN-PR-REFERENCE |
| `isolate/motion-s01-s5-01d-20261113` | `bd0f58526b89` | head+base | OPEN-PR-REFERENCE |
| `isolate/motion-s01-s5-01e-20261113` | `0055c1f04981` | head+base | OPEN-PR-REFERENCE |
| `isolate/motion-s01-s5-01g-20261113` | `725add5970fb` | head+base | OPEN-PR-REFERENCE |
| `isolate/nav-vis-unify-01-20261112` | `c237e0eabe1c` | head+base | OPEN-PR-REFERENCE |
| `isolate/nav-vis-unify-01b-20261112` | `d514578c413b` | head+base | OPEN-PR-REFERENCE |
| `isolate/nav-vis-unify-01c-20261112` | `e8ea4bd82777` | head+base | OPEN-PR-REFERENCE |
| `isolate/nav-vis-unify-01d-20261112` | `5eaafd635818` | head+base | OPEN-PR-REFERENCE |
| `isolate/nav-vis-unify-01e-20261112` | `a706bd5ca37b` | head+base | OPEN-PR-REFERENCE |
| `isolate/nav-vis-unify-01f-20261112` | `831d95f0cd93` | head+base | OPEN-PR-REFERENCE |
| `isolate/nav-vis-unify-01g-20261112` | `e0e0a2f9cfa9` | head | OPEN-PR-REFERENCE |
| `isolate/price-integer-contract-01-20261111` | `255dad521f6a` | head+base | OPEN-PR-REFERENCE |
| `isolate/price-integer-integration-02-20261111` | `d9f945cc1515` | head+base | OPEN-PR-REFERENCE |
| `isolate/proto-merge-02b-s01-r2-rc1p1-20261030` | `2fcb80928943` | head | OPEN-PR-REFERENCE |
| `isolate/proto-rule-restore-03-three-filters-no-u01-20261103` | `4293e86a8697` | head+base | OPEN-PR-REFERENCE |
| `isolate/proto-rule-restore-04-legacy-u01-and-audit-20261103` | `f33d0a1323aa` | head+base | OPEN-PR-REFERENCE |
| `isolate/proto-rule-restore-05-audit-20261103` | `c7f61f159f4f` | head+base | OPEN-PR-REFERENCE |
| `isolate/proto-rule-restore-06-single-s01-hifi-20261103` | `3ffc3d8f8abc` | head+base | OPEN-PR-REFERENCE |
| `isolate/proto-rule-restore-07-visual-uat-gate-20261103` | `baae5c3424b1` | head+base | OPEN-PR-REFERENCE |
| `isolate/proto-rule-restore-08-same-state-private-uat-20261103` | `ac83603dc20b` | head+base | OPEN-PR-REFERENCE |
| `isolate/proto-rule-restore-09-private-rc2-review-candidate-20261103` | `8038039cc74d` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-candidate-delta-02-s5-native-20261105` | `a04c9a5a8190` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-cap-h01-integration-gate-01-20261112` | `9eec773091de` | 无 | DIVERGED-UNIQUE |
| `isolate/rc2-final-admission-01-20261103` | `d3adbf172d00` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-final-gate-04-20261112` | `f53e5fd89644` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-final-gate-05-20261112` | `f456eb7177a7` | head | OPEN-PR-REFERENCE |
| `isolate/rc2-final-integration-02-h01-s01-s5-20261104` | `3e4841d99b22` | head | OPEN-PR-REFERENCE |
| `isolate/rc2-final-vis-delta-01-20261104` | `30fb55847968` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-final-vis-signoff-02-20261112` | `c0c7bab56ed1` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-final-vis-signoff-03-20261112` | `501d05b31b15` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-final-vis-signoff-04-20261112` | `f6de38bc281d` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-final-visual-review-03-20261112` | `152a61a17829` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-gate-ready-02-main-candidate-20261102` | `56e6ad917c7c` | 无 | DIVERGED-UNIQUE |
| `isolate/rc2-h01-active-no-photo-03-20261112` | `0346a0ec2175` | 无 | DIVERGED-UNIQUE |
| `isolate/rc2-h01-m01-integration-01-20261112` | `fafe40c685b8` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-h01-task-vis-adapt-01-20261112` | `5182f5eb88cb` | 无 | DIVERGED-UNIQUE |
| `isolate/rc2-merge-prep-01-three-source-20261102` | `212a9dde17e7` | 无 | DIVERGED-UNIQUE |
| `isolate/rc2-merge-prep-01-visual-plus-lifecycle-20261102` | `33174a2d35e3` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-merge-prep-02-s01-fourfilters-h01-gate-20261102` | `370eba5ec704` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-merge-prep-03-h01-receipt-gate-20261102` | `c768cdd8d9dc` | 无 | DIVERGED-UNIQUE |
| `isolate/rc2-merge-prep-04-without-hifi06-20261102` | `2c0eeed791bc` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-merge-prep-05-items-scenes-return-20261102` | `e0bb05634223` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-merge-prep-06-return-spec-edge-visual-20261102` | `6897057f73ad` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-merge-prep-07-s01-price-distance-gate-20261102` | `83f3c072820a` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-merge-prep-08-distance-sort-visual-gate-20261102` | `26d066479f70` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-merge-prep-09-unified-rc2-demo-20261102` | `225b781070c5` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-merge-prep-10-order-review-hifi-gate-20261102` | `da815749d884` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-merge-prep-14-s01-hit-targets-20261102` | `5f22fca8cb06` | head | OPEN-PR-REFERENCE |
| `isolate/rc2-merge-ready-04-evidence-20261113` | `64a2a53e41dc` | head | OPEN-PR-REFERENCE |
| `isolate/rc2-merge-ready-05-integration-20261113` | `23b58f200b8e` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-merge-ready-07-nav-h01-align-20261113` | `190fb3bff3ea` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-merge-ready-08-nav-raster-20261113` | `e7e60f110f13` | head | OPEN-PR-REFERENCE |
| `isolate/rc2-motion-merge-gate-01-20261113` | `fd7836cb4140` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-public-price-01-20261112` | `97b7c04e4e79` | base | OPEN-PR-REFERENCE |
| `isolate/rc2-quick-cap-term-01-20261113` | `66ec15f5d222` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-s01-recommend-03-20261104` | `172cd5ce45b3` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-s02-term-state-01-20261112` | `a6bcfafe1836` | 无 | DIVERGED-UNIQUE |
| `isolate/rc2-s5-final-01-20261103` | `c2c6fdfaea82` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-s5-layout-close-01-20261104` | `c550057711db` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-s5-source-reconcile-01-20261112` | `cffe000a30ec` | 无 | DIVERGED-UNIQUE |
| `isolate/rc2-single-candidate-01-20261104` | `2c6d7ef9d40e` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-single-candidate-03-20261112` | `be47f9aac21f` | head | OPEN-PR-REFERENCE |
| `isolate/rc2-single-candidate-03b-20261112` | `b9f28bcd332e` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-single-candidate-04-20261112` | `b7f5fcdc7c47` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-single-candidate-05-20261112` | `b7d84f6dcdf3` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-store-image-map-01-20261103` | `61f3ca45e025` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-structure-restore-s01-20261103` | `f6c8a15ffffa` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-uat-baseline-01-20261103` | `5ba4975737e2` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-ux-copy-03-20261112` | `aed3de90df25` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-ux-demo-copy-02-20261112` | `12aa87649ed4` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-vis-integration-01-gate-20261103` | `1b1a8ee56200` | head+base | OPEN-PR-REFERENCE |
| `isolate/rc2-vis-p1-close-01-20261104` | `4bd2365daace` | head+base | OPEN-PR-REFERENCE |
| `isolate/s01-card-layout-estore-slot-20261104` | `8bc106b777cc` | head+base | OPEN-PR-REFERENCE |
| `isolate/s01-ux-review-02-compact-state-20261103` | `42a59f2e0cb3` | head+base | OPEN-PR-REFERENCE |
| `isolate/s01-ux-review-03-nine-state-visual-mergeprep-20261104` | `7c6cb17001e7` | head+base | OPEN-PR-REFERENCE |
| `isolate/s01-vis-restore-01-native-clean-20261104` | `01e2726150f0` | head | OPEN-PR-REFERENCE |
| `isolate/s02-central-integration-01-20261103` | `8f41605d5b32` | head | OPEN-PR-REFERENCE |
| `isolate/s02-ux-review-03-hours-routes-copy-20261103` | `3732483fe5f3` | head | OPEN-PR-REFERENCE |
| `isolate/s5-final-rebase-01-20261111` | `3f683422fa8c` | head+base | OPEN-PR-REFERENCE |
| `isolate/s5-final-vis-signoff-04-20261112` | `7ebb80ae83a1` | head | OPEN-PR-REFERENCE |
| `isolate/s5-layout-cleanup-02-20261104` | `6e4ebcad20df` | head | OPEN-PR-REFERENCE |
| `isolate/s5-store-card-align-01-20261104` | `7b2d5ad130c1` | head+base | OPEN-PR-REFERENCE |
| `isolate/s5-store-card-align-02-20261104` | `2bcceb18d3d2` | head+base | OPEN-PR-REFERENCE |
| `isolate/s5-ux-close-01-20261103` | `5516e862851a` | head+base | OPEN-PR-REFERENCE |
| `isolate/s5-ux-review-02-20261103` | `99c62206a229` | head+base | OPEN-PR-REFERENCE |
| `isolate/s5-ux-review-03-20261103` | `424248611247` | head+base | OPEN-PR-REFERENCE |
| `isolate/unit-image-rebuild-01-r3-20261103` | `3952238c77cf` | head+base | OPEN-PR-REFERENCE |
| `isolate/unit-image-rebuild-01-r4c-gate-20261105` | `84541d3daee1` | head | OPEN-PR-REFERENCE |
| `isolate/ux-audit-gate-03-nav-decision-20261109` | `5a25adca5502` | head+base | OPEN-PR-REFERENCE |
| `isolate/ux-quality-01-r2-audit-20261102` | `b82955890f9a` | 无 | DIVERGED-UNIQUE |
| `isolate/ux-quality-01-r2-close-20261102` | `c5195f1af8e1` | 无 | DIVERGED-UNIQUE |
| `isolate/vis-system-04b1-20261111` | `24bb0f2bfae6` | head+base | OPEN-PR-REFERENCE |
| `isolate/vis-system-04b2-20261111` | `adc7e800e9e3` | head+base | OPEN-PR-REFERENCE |
| `isolate/vis-system-04b-20261111` | `f14490c12eae` | head+base | OPEN-PR-REFERENCE |
| `main` | `165e521cca6e` | base | MAIN-LOCK |
| `ops/deploy-migrate-01-cloudbase-pilot-20261029` | `307b5c8b51b1` | head | OPEN-PR-REFERENCE |
| `ops/git-cost-opt-01a-review-gate` | `4716ed5f8e76` | 无 | DIVERGED-UNIQUE |
| `ops/rc2-uat-package-gate-20261105` | `276e2100d793` | 无 | DIVERGED-UNIQUE |
| `ops/site-connect-01-protected-cd-20261029` | `6c31de5c6653` | head+base | OPEN-PR-REFERENCE |
| `ops/site-connect-02-live-access-qa-20261029` | `6ce163b7707f` | head | OPEN-PR-REFERENCE |
| `ops/site-connect-03a-rc1-p1-cd-20261029` | `02fa039c770c` | 无 | DIVERGED-UNIQUE |
| `preview/rc2-r2-private-20261103` | `eb1d8cfde92f` | head+base | OPEN-PR-REFERENCE |
| `refactor/rc2-ux-quality-rebase-03-20261111` | `8e28c140d277` | head+base | OPEN-PR-REFERENCE |
| `release/demo-mk-rc1-20261027` | `05b283f845f6` | 无 | HISTORICAL-SNAPSHOT |
| `stage/rc2-pr96-p1-uat-20261110` | `be4b8d1aee72` | 无 | DIVERGED-UNIQUE |
| `tool/vis-editor-01a-s01-20261112` | `4c68b01ea58c` | head | OPEN-PR-REFERENCE |
| `uat/rc2-pr96-20261110` | `be4b8d1aee72` | 无 | DIVERGED-UNIQUE |
| `visual/vis-rebuild-03a-r1-pixel-faithful-20261028` | `de147ad81d90` | head+base | OPEN-PR-REFERENCE |
| `visual/vis-rebuild-03a-r2-fidelity-20261028` | `6fdfe8852487` | head | OPEN-PR-REFERENCE |
| `visual/vis-rebuild-03a-s01-approved-a-white-distance-20261028` | `d63574fdc3c8` | 无 | DIVERGED-UNIQUE |
| `visual/vis-rebuild-03b-r2-isolated-binding-20261028` | `f67505dcf27d` | head+base | OPEN-PR-REFERENCE |
| `visual/vis-rebuild-03c-r2-completeness-20261028` | `8cd440bb5d50` | head | OPEN-PR-REFERENCE |

## 分支清理建议（尚未授权执行）

1. **第一组仅建议复核**：非backup/release且ahead=0的分支。这些分支无独有提交，但删除前仍须核对已关闭PR、历史部署、回滚、站点、Actions、Tags及已签收母版关联。
2. **重点保留**：所有开放PR head/base、main、已签收RC2的代码/证据来源、backup/与release/历史快照。
3. **独有历史优先查漏**：ahead>0的分支必须与已签收RC2 manifest和后端未来任务核对；优先关注`feature/br03-s01-s02`、`br01-h01-connect-03-isolated`、`ops/site-connect-03a-rc1-p1-cd-20261029`等少量增量，也应保留大型RC2链式分支直到差异分类结束。
4. **治理已合并源分支**：#68和#178使用Squash合并，所以原来源分支可能仍显ahead>0；属于后续可归档候选，但本次绝不删除。
5. 后续拟删表必须列出具体分支、准确SHA、对应PR、提交/内容差异、备份策略、授权人及操作日志，获得明确删除授权后才允许执行。

_本报告对应main `165e521cca6e9453a691c6660d04110538f7fdec`；如main/源分支移动须重跑比较。_
