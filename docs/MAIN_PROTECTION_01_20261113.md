# MAIN-PROTECTION-01｜main分支保护配置清单

2026-11-13用户已授权启用main保护并允许治理PR合并。PR #68已由GitHub Actions实际门禁通过，并通过Squash归并main，合并SHA：`0c78de7720451692bbd44be8854259b8b6a20dbd`。

## 当前状态

- main治理文件：已合并。
- 分支保护：**未生效**。GitHub分支查询返回 `protected=false`，Rulesets列表为空。
- 当前使用的GitHub App集成缺少仓库Administration配置权限，无可用的创建/修改Ruleset动作。不得把“用户已授权”误写成“已启用”。
- 本任务需要GitHub仓库管理员在网页完成一次设置，设置后由AI读取状态核验。

## 管理员操作

打开 [仓库Rulesets设置](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/settings/rules)，按GitHub官方[创建仓库Rulesets文档](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)：

1. `New ruleset` → `New branch ruleset`。
2. 名称：`main-protection-demo-first`。Enforcement：`Active`。
3. Target branches：仅 `main`（或`Include default branch`，确保当前默认分支即main）。
4. 选择：
   - `Require a pull request before merging`；
   - `Require status checks to pass`，添加精确检查名称 `Visual contract and evidence guard`（最近通过的证据：[Run #43411296824](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43411296824)）；
   - `Block force pushes`；
   - `Restrict deletions`；
   - 视情况启用`Require conversation resolution before merging`。
5. 首阶段建议`Require branches to be up to date before merging`不勾选，以减少当前高频多分支工作流的重复CI成本；最终运行时同SHA验收仍由项目控制中心维护。若之后并行协作者增加，再评估严格更新基线。
6. 如只有一名维护者，审批人数先设为0（要求PR但不强制另一个GitHub账户Approve），避免无法审核自己的PR而锁死；如已有独立评审者，建议设置1位审批。
7. Bypass默认不授予宽泛的管理员`Always allow`；如确有紧急修复流程，单独审批并优先选择`For pull requests only`。
8. `Create`保存，确认Enforcement为Active。

## 不要错误设置的检查

- 不把已退役的`s5-isolated-regression`（RC1-only历史白名单）设为main必需检查；它已改为仅手动运行。
- 不把旧Netlify RC1部署状态当作当前RC2必需检查。
- 不把仅存在于PR #176分支的`RC2 CLEAN MIGRATION 01`设为所有main PR的必需检查；需要先让该工作流以正确触发方式存在于main并确认所需分支都能产生此检查。
- 技术门禁PASS不等于视觉签收；业务PR仍须独立记录视觉批准与部署身份。

## 配置完成后的验证

1. GitHub仓库主页面 → Branches → main，显示受保护状态；GitHub API `branches/main` 的`protected`应为`true`。
2. `Settings → Rulesets`列出`main-protection-demo-first`，Enforcement为Active，目标仅main。
3. 后续新建文档治理PR，确认`Visual contract and evidence guard`正常触发且未通过时不能合并。
4. 记录设置日期/负责人/截图或GitHub链接于[PROJECT-OPS-RESET-01 #177](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/issues/177)；再更新项目控制中心状态。

## 授权边界

此保护规则属于仓库治理。用户已授权将治理PR归并main，**不等于**授权业务原型PR #176合并main或部署。PR #176的正式演示签收冻结在`41a8a079eb48049e1060512bddf71c226bfd3738`，即使后续main保护生效，该签收也不会自动覆盖新代码或生产版本。
