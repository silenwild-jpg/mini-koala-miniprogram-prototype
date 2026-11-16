# 迷你考拉仓｜当前任务上下文索引

本文件是**现有权威文件的导航**，不新增产品决策、视觉签收或正式生产政策。文内固定SHA仅为历史快照，任何执行先核验GitHub实时状态。当前仓库是Web/HTML原型，不等于微信原生工程。

## L0｜每次任务

1. 核验`git status --short`、`git branch --show-current`、`git rev-parse HEAD`、GitHub main、相关PR、Actions及精确SHA。
2. 区分`main HEAD`、`用户签收业务SHA`、`开发候选HEAD`、`实际部署SHA`。
3. 读取[根README](../../README.md)、[根AGENTS](../../AGENTS.md)、[项目控制中心当前有效部分](../PROJECT_CONTROL_CENTER_01_20261113.md)。不要把过时标题与旧SHA看成实时状态。

## L1–L2｜按任务阅读

| 任务 | 所需规则与源码 |
|---|---|
| 页面结构与状态 | [RC2页面规则和状态索引](../RC2_POSTMERGE_RULE_BASELINE_01_20261114.md)、[工作包协议](../PROJECT_WORK_PACKAGE_PROTOCOL_01_20261113.md)，只读涉及的页面章节 |
| H01首页 | H01规则、[已批准视觉依据](../VISUAL_MANIFEST.md)及同SHA截图；`app/prototype/parallel/core-journey-fix-01/demo/home.html`、`home-bridge.js` |
| CAP/ITEMS | CAP/ITEMS规则；`cap.html`、`items.html`、`space-unit.js`、桥接脚本、对应测试 |
| S01/S02 | 页面规则；`s01-r2-live.html`、`s01-r2-bind.js`、`app.js`、`s02-central.css` |
| S5/O01/预约/快捷下单 | 页面规则；`br04/`、`demo-core.js`、`gift-term-policy.js`、促销与订单状态测试 |
| M01与售后 | 页面规则；`m01-rebaseline-01.js`、`lifecycle-contract.js`、`lifecycle-ui.js`及对应测试 |
| 代码开发与本地预览 | [WorkBuddy当前源码交接](../RC2_MAINLINE_HANDOFF_01_20261114.md)；统一Web入口`app/central-review-02g.html?catalog=sim&page=H01` |
| CI与视觉门禁 | [视觉契约JSON](../PROTO_VIS_EXEC_01_CONTRACT.json)、[RC2迁移清单](../RC2_CLEAN_MIGRATION_01_MANIFEST_20261113.md)、相关`.github/workflows/`与`scripts/` |
| 原生、后端与真实业务 | [后端待确认清单](../BACKEND_DECISION_REGISTER_01_20261114.md)、[演示优先标准](../DEMO_FIRST_DEVELOPMENT_STANDARD_01_20261113.md) |

## L3｜历史资料按需检索

`app/README_CURRENT.md`、`app/docs/ITERATION_GUIDE.md`、`docs/CURRENT_RULES.md`、`docs/BRANCH_REGISTER.md`、`docs/BASELINE_REGISTER.md`、`app/docs/`、`app/source-reference/`、`app/prototype/parallel/core-journey-fix-01/evidence/`是历史追溯和签收证据来源，**非默认阅读集**。仅在规则冲突、图片来源或缺陷溯源时打开；历史视觉母版不得因位于旧目录而失效。

## 授权与版本边界

- 本次E1文档修改输入：`main@0fbe02be51b9c07af644fa09b9d7036ac6212ab4`（2026-11-16，仅快照）。
- [PR #210](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/210)、[PR #215](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/215)、[PR #213](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/213)按GitHub实时状态单独处理。Draft不等于已归并或已签收。
- `G-TECH`、人工`VIS_SIGNED`、业务批准、实际合并与部署属于不同结论。禁止无授权合并main、部署、删除PR/分支/证据或修改Ruleset。
