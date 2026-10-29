# SITE-CONNECT-02｜Git 自动部署、私有访问与双尺寸验收（2026-10-29）

## 实际证据与限制

- Netlify 项目 ID：`e8bba69f-09d5-4866-842d-43c30411114e`。
- 2026-10-29 本轮读取的 Netlify 项目显示 `requiresSSOTeamLogin=true`、`whichProjectsRequireSSOTeamLogin=all`。
- 已发布 deploy 仍为 `6ae2d21c2256217ab4a2fef5`，此前接口确认其来源为 manual/drop，`commit_ref=null`、`branch=null`。**没有取得首次 Git deploy 成功证据。**
- GitHub `main` 中的 `netlify.toml` 仍是原构建命令。PR #28（SITE-CONNECT-01）仍为 Draft / Open，尚未合并。
- Netlify 请求日志在 2026-10-29 04:57–05:04 UTC 对根路径 `GET /` 记录了六次 HTTP 401。这支持「匿名或未授权请求受到限制」，但**不能**证明所有深链均拒绝，也不能证明任一授权登录后的页面成功打开。
- 当前连接的 Browser 读取工具要求从原浏览器上下文启动；本任务调用未获原浏览器上下文。公开 URL 的网页读取也未成功。故实际线上登录/375/390 逐页检查 **NOT TESTED**。
- 本次仅在独立分支增设针对 **与 Netlify 发布目录相同的静态包** 的 GitHub Actions Playwright 回归测试。测试运行在临时 `http://127.0.0.1:4270`，**不是**受 SSO 保护的线上地址。既有测试覆盖 375×812 与 390×844、MK 旧门店、五城 S01/S02/S5、CAP→S5→O01 订单快照及 SIM 隔离。结果必须以此分支工作流真实运行状态为准，不能提前宣布 PASS。
- `app/` 产品源码未修改；冻结视觉及历史 Draft PR #24–27 均未归并。

## Netlify 项目 Owner 必须执行的动作

1. 打开 https://app.netlify.com/projects/mini-koala-internal-rc1-review ，在 Project configuration → Developer settings → Continuous deployment → Repository 中检查是否已绑定现有 GitHub 仓库。如未绑定，选择 Link repository；如果显示已绑定，则核验所连仓库、分支、自动构建状态。
2. GitHub 授权只选择 `silenwild-jpg/mini-koala-miniprogram-prototype`。部署的 production branch 只能为 `main`；base directory 为仓库根目录；输出目录为 `release-evidence/merge02n/site`，遵循 `netlify.toml`。
3. **先完成 PR #28 的审核与明确批准**，再合并工程设置；不要借本任务合并其它视觉 Draft 候选。首次 Git 构建须记录有效的 `commit_ref` 和 `branch=main`、日志、发布 ID。
4. Visitor access **Team login protection / All deploys** 必须保持；不可以临时切 Public 验证。授权成员登录后分别检查 `/` 与 `/central-review-02g.html?catalog=mk`、SIM，以及 S01/S02/S5/O01 受限路径。
5. 用独立无痕浏览器对首页及深链验证未登录访问被拒绝；用已授权账号在 375×812 和 390×844 实际浏览 H01、CAP、S01、S02、S5、QUICK、手机号取消/通过、O01，记录当前版本、截图与结果。
6. 若 Git 构建出错，保留旧手动 deploy 做回滚基准；先看构建日志与冻结检查，不删除 SSO、不删除冻结门禁。

## 验收状态表

| 门禁 | 状态 |
| --- | --- |
| Netlify 现有站点存在且部署 ready | VERIFIED（旧手动部署） |
| 项目级 SSO 所有上下文启用 | VERIFIED（接口配置） |
| 根路径部分未授权请求返回 401 | VERIFIED（日志 6 次） |
| 深链未授权访问完全阻断 | NOT TESTED |
| PR #28 合并与 GitHub 项目绑定 | NOT DONE / NOT VERIFIED |
| 首次 Git 持续部署，commit_ref/branch 对应 main | NOT VERIFIED |
| 375/390 **发布包本地浏览器**测试 | RUN PENDING（读取工作流结果后再更新） |
| 375/390 **线上授权登录浏览器**测试 | NOT TESTED |
| 用户视觉签收 / main 正式视觉归并 | HOLD |

本任务的仓库 QA 分支仅用于生成可核验的截图和机器测试回执，不修改主站发布内容；后续是否归并由用户审批。

参考：Netlify 官方现有站点仓库绑定说明 https://docs.netlify.com/build/git-workflows/repo-permissions-linking/ 。
