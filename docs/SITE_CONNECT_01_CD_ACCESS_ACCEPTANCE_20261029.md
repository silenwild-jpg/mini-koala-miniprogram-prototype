# SITE-CONNECT-01｜私有评审站 GitHub 持续部署与访问验收

日期：2026-10-29  
状态：**仓库侧准备完成；Netlify 仓库绑定与登录后实测待站点管理员操作。**  
此记录是工程交接与待验收清单，不代表站点已成功完成 Git CD。

## 1. 本任务冻结对象

- Netlify 现有站点：`mini-koala-internal-rc1-review`
- Site ID：`e8bba69f-09d5-4866-842d-43c30411114e`
- URL：`https://mini-koala-internal-rc1-review.netlify.app/`
- GitHub 私有仓库：`silenwild-jpg/mini-koala-miniprogram-prototype`
- **唯一生产部署分支：`main`**；视觉探索/BRANCH 独立候选只走 PR 或隔离预览，不自动归并。
- 业务基线：`DEMO-MK-RC1-20261027`。产品界面 `app/` 保持冻结，尚无新的人工视觉签收。
- 访问保护：必须维持 Netlify **Team login / SSO protection for all deploys**，包括 production、PR preview 和 branch deploy。静态 `robots.txt` 或 `_headers` 不能代替认证。

## 2. 已核对的外部证据（2026-10-29）

- Netlify 项目返回 `requiresSSOTeamLogin=true`、`whichProjectsRequireSSOTeamLogin=all`。
- 最新已发布部署 `6ae2d21c2256217ab4a2fef5`：`ready`、`manual_deploy=true`、`deploy_source=drop`、`commit_ref=null`、`branch=null`；2026-10-29 04:57 UTC 发布。**因此不能据此断言 GitHub CD 已接通。**
- 当前账号的 GitHub 连接对该私有仓库有写权限，默认分支是 `main`。
- 仓库已有 `netlify.toml`、`scripts/build_rc1_private_site.py`、`scripts/verify_demo_rc1_lock.cjs`。
- 无法在当前 ChatGPT 的 Netlify 项目管理接口内执行 Link repository；浏览器登录后读页也未在此轮取得成功，故不能声称用户浏览器已能打开页面。

## 3. 本分支的仓库侧改动（尚未合并）

- `netlify.toml`：构建前执行 `node scripts/verify_demo_rc1_lock.cjs`，只允许冻结 RC1 应用树被构建；随后用既有 allowlist 脚本生成静态站。明确 Node 22 与 Python 3.13。
- `.github/workflows/site-connect-01-rc1-preflight.yml`：在有关的 `main` PR / `main` push 上检查冻结源、生成站点，并审计输出文件、noindex、robots 与禁止发布的工程资料。
- **没有改动** `app/`、母版图片、页面结构、业务算法、门店 ID 或订单路由。
- 原 `main` 与手动部署均未被本分支覆盖。

## 4. Netlify Owner 必须进行的一次性绑定（尚未执行）

1. 以站点所属 Netlify 团队的 Owner / 有权限成员登录 [Netlify 项目](https://app.netlify.com/projects/mini-koala-internal-rc1-review)。
2. 打开 **Project configuration → Developer settings → Continuous deployment → Repository → Link repository**。
3. 选择 **GitHub**，授权 Netlify GitHub App **仅访问** `silenwild-jpg/mini-koala-miniprogram-prototype`（如已安装，只补该仓库访问，不扩大到所有仓库）。
4. 选定仓库及 `main` 作为 production branch；确保项目目录为仓库根目录，使用根目录 `netlify.toml`：`publish = release-evidence/merge02n/site`。不要选 `app/` 为 publish，也不要将含 QA/证据的整个仓库发布。
5. **连接前再次核实** Project configuration → General → Visitor access → Password Protection：保持 **Team login protection / All deploys**。不要改为 public，不要取消防护。
6. 保存并执行由 Git 触发的首次构建；确认 Netlify 构建日志含 `RC1_FREEZE_PASS`、`REVIEW_SITE_BUILD_OK`，且部署结果为 `ready`。
7. 在部署详情检查 `commit_ref` 有值、`branch=main`，来源不再是 `drop`。若只看见原手动发布，CD 仍是 **HOLD**。

官方操作入口：[Netlify repository linking 文档](https://docs.netlify.com/build/git-workflows/repo-permissions-linking/)。

## 5. 验收门禁（必须实际执行，未执行不得标 PASS）

- **A / 发布来源**：新的 Git 触发生产部署成功；记录 deploy ID、commit SHA 和构建日志。
- **B / 匿名拒绝**：未登录浏览器访问首页与直接深链，必须先进入团队登录，不可泄露评审资源。
- **C / 授权通过**：团队成员完成 Netlify 登录后，可进入首页和 MK、SIM 入口（含移动端 375×812、390×844）。
- **D / 功能路径**：H01→S01→S02→S5/QUICK→手机号验证→O01 的授权流程及异常态，以实际浏览器测试记录为准。
- **E / 安全发布内容**：验证站点无历史 ZIP、内部文档、QA 证据、凭证文件；robots 和安全头均在有效站点返回。
- **F / 视觉防漂移**：页面未与新的未签收 Draft 候选合并；冻结母版同状态截图需另行验收。
- **G / CD 变更验证**：以后从经批准的 `main` 新提交触发新部署，且不用再次手动 Drop；不要为验证而提交不必要的产品页面修改。

## 6. 回滚和限制

- 若新 Git 部署失败，先保留当前 `ready` 手动 deploy `6ae2d21c2256217ab4a2fef5`，可在 Netlify UI 使用历史 deploy 的恢复/发布操作（以 UI 实际提供选项为准）。
- 若冻结树检查阻止新候选部署，**不得简单删除校验**；需单独完成视觉签收、更新冻结来源与适配验证，再放行新的版本。
- 未经进一步授权不得自动合并 PR、修改 SSO、创建第二个公开站点或扩展评审人范围。
- 本任务**不负责**正式生产微信小程序发布，不代表真实短信/支付/库存服务已接入。

## 7. 状态结论

| 项目 | 状态 |
| --- | --- |
| Netlify 已有部署 | 已核实 ready，手动 Drop |
| 私有仓库及代码读写 | 已核实 |
| 仓库侧 CD 预检配置 | 此 PR 已提交，待 CI/代码评审 |
| Netlify Link repository | **NOT DONE：需要控制台授权/交互** |
| Git 触发生产部署 | **NOT TESTED** |
| 受保护页面登录后真机/浏览器测试 | **NOT TESTED** |
| 冻结页面改动/自动归并 | 未执行 |

下一任务：`SITE-CONNECT-02｜控制台仓库绑定、首次 Git deploy 与 375/390 登录后验收`。
