# PROJECT-OPS-RESET-01｜P1-A4 / P1-B4 实时增量盘点

**审计时间：** 2026-11-13（以本次 GitHub API 实时读取为准）  
**main SHA：** `6ee8f014436965ccbd24513d634d55e2347439c2`  
**范围：** 当前开放 PR、分支引用关系、P1-E-02 旧工作流退役后的历史来源保全。  
**边界：** 本报告只分类和登记风险；不关闭PR、不删除分支、不修改业务候选 #176、不部署。

## 1. 实时仓库快照

| 指标 | 实时结果 |
|---|---:|
| PR记录总量（本次接口返回） | 179 |
| Open PR | 125 |
| Open Draft PR | 125 |
| Open non-Draft PR | 0 |
| 分支总量 | 192 |
| 被当前Open PR head/base直接引用的不同分支数 | 127 |
| 未被当前Open PR head/base直接引用的分支数 | 65 |
| Open PR以main为base | 8 |

**口径说明：** “未被Open PR引用”仅代表当前开放PR没有直接使用该分支作为head或base。它不代表分支无价值、无祖先/后代依赖、无Tag/Release引用、无Actions手动测试价值，也不代表无Netlify或其他外部部署依赖。

## 2. 当前以main为base的开放PR

| PR | 标题 | 分类/处理 |
|---|---|---|
| [#26](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/26) | [Draft] VIS-REBUILD-03B｜R2 获批 S01 母版与 MK/SIM 真实业务隔离接线 | 旧页面/业务/QA来源，需按文件和消费者逐项审计 |
| [#28](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/28) | [Draft] SITE-CONNECT-01｜私有评审站 Git CD 预检与 SSO 访问门禁 | 部署/站点历史来源，保留并隔离评估 |
| [#30](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/30) | [Draft] DEPLOY-MIGRATE-01｜CloudBase 国内私有评审迁移审计与安全最小探针 | 部署/站点历史来源，保留并隔离评估 |
| [#33](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/33) | [Draft] PROTO-MERGE-02B｜S01 A/R2 隔离接收、RC1-P1 S5 兼容与 375/390 主链回归 | 旧页面/业务/QA来源，需按文件和消费者逐项审计 |
| [#35](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/35) | [Draft] RC2-RULE-FIX-01D｜375/390 全链路隔离回归 PASS · 正式归并 HOLD | 旧页面/业务/QA来源，需按文件和消费者逐项审计 |
| [#36](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/36) | [Draft/HOLD] RC2-MERGE-PREP-01｜PR33 S01 A/R2 + PR34 路由参考 + PR35 租后隔离集成 | 旧页面/业务/QA来源，需按文件和消费者逐项审计 |
| [#47](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/47) | [Draft / Preview only] RC2+UX-R2 私有在线评审（保留 RC1，不合并） | 部署/站点历史来源，保留并隔离评估 |
| [#176](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/176) | [DEMO READY / MAIN HOLD] RC2-CLEAN-MIGRATION-01｜375/390已签收演示版本 | A0：已签收演示候选，Draft/HOLD，不得合并 |

截至本次快照，以上8条均为Draft；当前没有任何以main为base的非Draft业务PR。

## 3. P1-E-02 对分支清理判断的影响

已合并治理PR [#190](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/190)，合并SHA `6ee8f014436965ccbd24513d634d55e2347439c2`。02D～02K、02N九条历史工作流：
- 已从旧分支限定的 `push` 自动触发改为仅 `workflow_dispatch`；
- 所有测试、浏览器脚本、断言和Artifact上传步骤保留；
- 未删除工作流文件和历史分支。

下列九个旧来源分支目前仍应作为**手动QA来源保留**，即使它们不再被push触发器引用：
- `feature/git-merge-02c-targeted-20261027`
- `feature/git-merge-02e-visual-e2e-20261027`
- `feature/git-merge-02f-premerge-gates-20261027`
- `feature/git-merge-02g-central-ssot-20261027`
- `feature/git-merge-02h-source-and-visual-20261027`
- `feature/git-merge-02i-demo-admission-20261027`
- `feature/git-merge-02j-legacy-store-intake-20261027`
- `feature/git-merge-02k-legacy-visual-gate-20261027`
- `feature/git-merge-02n-protected-review-package-20261027`

此外，以下分支有既有审计记录明确要求保留：
- `uat/rc2-pr96-20261110`：Netlify旧PR96 UAT部署来源，不是当前签收SHA。
- `visual/vis-rebuild-03a-r1-pixel-faithful-20261028`：仍被开放PR #25作为base引用（如当前PR图变化，需重新核实）。
- `isolate/rc2-public-price-01-20261112`：曾被开放PR #141作为base引用（如当前PR图变化，需重新核实）。
- `backup/main-pre-02n-review-config-20261027`、`backup/main-pre-demo-mk-rc1-20261027`：备份分支，不能因无Open PR引用而清除。

## 4. 当前未被Open PR直接引用的分支清单（65条）

以下仅为待核查队列，不是删除名单：

- `audit/rc2-final-gate-01-20261104`
- `audit/rc2-final-merge-02-visual-gate-20261103`
- `audit/rc2-final-vis-signoff-01-20261104`
- `audit/rc2-p1-demo-close-02-20261110`
- `audit/rc2-single-candidate-02-20261104`
- `audit/rc2-uat-user-01-20261110`
- `audit/rc2-ux-quality-rebase-01-20261111`
- `backup/main-pre-02n-review-config-20261027`
- `backup/main-pre-demo-mk-rc1-20261027`
- `br01-h01-connect-03-isolated`
- `design/vis-rebuild-01-exploration-20261028`
- `docs/prd-baseline-01-v1-20261103`
- `feat/h01-task-space-explore-03-20261111`
- `feature/br01-home`
- `feature/br02-capacity`
- `feature/br03-promo-copy-01`
- `feature/br03-s01-s02`
- `feature/br03-store-unit`
- `feature/core-journey-fix-01`
- `feature/git-merge-02c-targeted-20261027`
- `feature/git-merge-02e-visual-e2e-20261027`
- `feature/git-merge-02f-premerge-gates-20261027`
- `feature/git-merge-02g-central-ssot-20261027`
- `feature/git-merge-02h-source-and-visual-20261027`
- `feature/git-merge-02i-demo-admission-20261027`
- `feature/git-merge-02j-legacy-store-intake-20261027`
- `feature/git-merge-02k-legacy-visual-gate-20261027`
- `feature/git-merge-02n-protected-review-package-20261027`
- `feature/visual-consistency-01`
- `feature/wx-native-01e`
- `fix/rc2-p1-demo-close-01-20261110`
- `fix/rc2-single-candidate-04-20261112`
- `fix/site-access-03c-s5-iframe-route-20261029`
- `governance/legacy-git-merge-workflows-manual-only-20261113`
- `governance/legacy-rc1-preflight-manual-20261113`
- `governance/legacy-workflows-manual-only-20261113`
- `governance/ops-postmerge-status-01-20261113`
- `governance/project-ops-clean-eligibility-02-20261113`
- `governance/project-ops-clean-eligibility-03-20261113`
- `governance/project-ops-p1a-p1b-audit-20261113`
- `governance/project-ops-p1a2-p1b2-20261113`
- `governance/project-ops-p1a3-p1b3-knowledge-20261113`
- `governance/proto-vis-exec-01-20261103`
- `governance/qa-legacy-retain-evidence-20261113`
- `governance/qa-preview-legacy-audit-20261113`
- `governance/qa-s5-deeplink-proof-20261113`
- `integration/git-merge-02b-seven-pr-isolated-20261027`
- `integration/proto-merge-01f`
- `isolate/rc2-cap-h01-integration-gate-01-20261112`
- `isolate/rc2-gate-ready-02-main-candidate-20261102`
- `isolate/rc2-h01-active-no-photo-03-20261112`
- `isolate/rc2-h01-task-vis-adapt-01-20261112`
- `isolate/rc2-merge-prep-01-three-source-20261102`
- `isolate/rc2-merge-prep-03-h01-receipt-gate-20261102`
- `isolate/rc2-s02-term-state-01-20261112`
- `isolate/rc2-s5-source-reconcile-01-20261112`
- `isolate/ux-quality-01-r2-audit-20261102`
- `isolate/ux-quality-01-r2-close-20261102`
- `ops/git-cost-opt-01a-review-gate`
- `ops/rc2-uat-package-gate-20261105`
- `ops/site-connect-03a-rc1-p1-cd-20261029`
- `release/demo-mk-rc1-20261027`
- `stage/rc2-pr96-p1-uat-20261110`
- `uat/rc2-pr96-20261110`
- `visual/vis-rebuild-03a-s01-approved-a-white-distance-20261028`

## 5. 本轮裁定

1. **不新增PR关闭候选。** 现有清理资格报告已证明多个旧PR有独有QA、部署、素材或下游base依赖；没有足够证据把“未被引用/历史Draft”直接转成可关闭名单。
2. **不新增分支删除候选。** 65条未被Open PR直接引用分支仍需逐项核对closed PR、祖先链、Tags、工作流、Netlify部署和恢复路径。
3. P1-E-02改变了九条旧工作流的自动触发方式，但没有消除它们作为手动QA源的价值；对应九条分支保留。
4. 旧Netlify RC1站的Pages changed失败与main必需的GitHub Actions Visual guard是不同状态来源；不通过关闭必需CI或修改RC1安全校验来追求全绿。
5. #176继续锁定已签收SHA `41a8a079eb48049e1060512bddf71c226bfd3738`，保持Draft / MAIN MERGE HOLD；本轮没有更改其head或base。

## 6. 后续任务

| 编号 | 任务 | 状态/动作 |
|---|---|---|
| P1-A4 | 剩余Open PR逐项消费者与独有资产核验 | 当前主线8条已盘点；不具备新增批量关闭依据 |
| P1-B4 | 65条未引用分支逐项依赖核验 | 作为分阶段只读审计继续；不删除 |
| P1-C | 项目控制中心单一入口更新 | 本轮同步main SHA、Ruleset和PR/分支实时快照 |
| P1-D | 批量任务协议与交付模板固化 | 下一工作包：把固定字段/阻断原则落为可复用模板 |
| P1-E | 旧CI触发治理 | #189、#190均已合并；后续只核查手动触发可用性，不批量运行历史重型QA |

**签收边界：** 本文不构成历史PR关闭、分支删除、业务PR #176合并、Netlify站点修改或生产部署授权。


---

## 7. 后续实时快照｜P1-D归并后（2026-11-13）

本节更新本报告之后发生的治理归并，不覆盖第1节的原始审计快照。

| 指标 | 原始快照 | 当前复核 |
|---|---:|---:|
| main SHA | `6ee8f014436965ccbd24513d634d55e2347439c2` | `11afd40a005933ff4a48d8b8f89dbb66ef995103` |
| Open PR | 125 | 125 |
| Open Draft PR | 125 | 125 |
| 分支总量 | 192 | 194 |
| 未被Open PR head/base直接引用 | 65 | 67 |

增量原因：
- PR #191（P1-A4/P1-B4实时盘点与控制中心同步）已合并main，合并SHA `da0dd6f89cf8952719ffe546a8a49b4f9d448f8d`。
- PR #192（P1-D批量工作包协议与Issue模板）已合并main，合并SHA `11afd40a005933ff4a48d8b8f89dbb66ef995103`。
- 两个治理工作包的来源分支均保留，因当前没有Open PR直接引用而计入未引用分支；不因此删除。
- 当前main-base Open PR仍为 #176、#47、#36、#35、#33、#30、#28、#26，均Draft。
- #176 PR描述已补充当前main漂移：从原base到当前main为17 commits / 37 paths；两个同路径历史RC1 workflow差异已定位；候选SHA仍冻结，未rebase、未cherry-pick、未改代码。

P1-D状态：协议文档 `PROJECT_WORK_PACKAGE_PROTOCOL_01_20261113.md` 与升级后的 `.github/ISSUE_TEMPLATE/implementation.md` 已通过PR #192合并。后续新工作包默认使用该模板，聊天中的“继续”不再作为每个子任务的人工启动信号。

**执行边界保持不变：** 仍不批量关闭PR、不删除分支、不合并业务候选 #176、不修改Netlify站点、不正式部署。
