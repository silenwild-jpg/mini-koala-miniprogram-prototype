# 迷你考拉仓｜小程序原型项目

**当前定位：** 产品验证、真实用户路径演示与视觉探索；当前仓库包含 HTML/Web 原型，不等同于微信原生小程序生产代码。

## 唯一项目入口

开始任何项目任务前，先阅读：

- [项目控制中心｜当前版本、验收、规则、待办与治理状态](docs/PROJECT_CONTROL_CENTER_01_20261113.md)
- [AI/WorkBuddy/Codex执行规则](AGENTS.md)
- [项目总控任务 PROJECT-OPS-RESET-01](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/issues/177)
- [WorkBuddy交接、页面代码入口与开发流程](docs/RC2_MAINLINE_HANDOFF_01_20261114.md)
- [后端待确认/原生接入决策登记表](docs/BACKEND_DECISION_REGISTER_01_20261114.md)
- [main保护设置清单（需仓库管理员执行）](docs/MAIN_PROTECTION_01_20261113.md)

控制中心记录当前唯一候选、精确 SHA、技术/视觉门禁、页面规则来源、待业务/后端确认事项和下一任务。历史登记表保留追溯用途；如与最新用户批准结论或控制中心冲突，不得直接沿用旧记录。

## 当前业务基线（2026-11-14，已核验）

- **正式演示代码主线：** `main` 的 `7f4231826cb9b86ee62d2b8337d609d194f42c4a`；[业务PR #203](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/203) 已合并。
- **main自身375/390回归：** [Actions #43541417405](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43541417405) **SUCCESS**；[375/390证据包](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43541417405/artifacts/14091129750)。
- **人工视觉/UAT签收源：** `d5a4ff63e2b0cdcffb2e5be4c4e710b61497ae95`；原签收备用PR #176保留，不回退覆盖。
- **版本属性：** Web/HTML演示原型，**非微信原生小程序上线代码**；本轮合并**未部署**；生产身份/交易/支付/后端未验收。
- **main分支治理：** GitHub必需检查`Visual contract and evidence guard`有效；`strict_required_status_checks_policy=false`；不能绕过受控归并。
- **下一工作包：** [WorkBuddy接手交接及迁移入口](docs/RC2_MAINLINE_HANDOFF_01_20261114.md) → WB-BASELINE-01；[后端确认清单](docs/BACKEND_DECISION_REGISTER_01_20261114.md)。

旧版快照、历史PR和构建包可能保留过时的main合并或生产门禁字段；以当前main精确SHA、最新PR/Actions证据以及项目控制中心顶部最新状态为准。

## 工作原则

1. 综合任务按任务包批量执行：盘点→规则裁定→实施→测试→回归→文档和证据。
2. 只在产品决策冲突、冻结视觉方向变更、必要权限缺失或不可逆操作时请求人工确认；一个阻断项不停止无关任务。
3. 所有测试绑定精确 SHA；新提交后需重新验证。G-TECH PASS 不等于 G-VIS 人工签收。
4. 不自动合并 main、不部署、不批量关闭 PR 或删除分支；这些操作须有明确授权。
5. 演示数据可使用稳定、可替换的受控配置；不得将临时规则描述为正式生产政策。

详细历史基线、页面证据、来源链与迁移记录保留在 `docs/` 下，以控制中心标注的当前有效来源为准。
