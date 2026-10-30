# DEPLOY-MIGRATE-01｜CloudBase 国内私有评审站迁移可行性与最小部署门禁

日期：2026-10-29  
状态：**仓库侧最小验证候选；正式 CloudBase 创建、远程发布、身份认证、国内测速均未执行。**

## 1. 已核事实

- GitHub 私有仓库 `silenwild-jpg/mini-koala-miniprogram-prototype`；现有 `main` 冻结版本是 `DEMO-MK-RC1-20261027`。
- 已有 `scripts/verify_demo_rc1_lock.cjs` 和 `scripts/build_rc1_private_site.py` 将 RC1 打包到 `release-evidence/merge02n/site`，带 allowlist、manifest 和摘要。可作为 CloudBase 迁移候选，**不是已验证私有托管**。
- Netlify 站点原有手动 Drop 部署，Team SSO 保护；不能因迁移方案而放开或删除。
- CloudBase 官方确认 GitHub 个人授权仓库、CLI `tcb hosting deploy`、静态文件托管；GitHub Actions 可用 `tcb login --apiKeyId / --apiKey` 完成非交互登录。
- CloudBase 静态托管防盗链、IP 白名单和限频是安全控制，但**不能当作按人员的登录认证**；HTTP 网关支持托管路由与身份认证，但还必须检查直接访问静态默认域名、CDN 原域名、深链及原始 JS/图片是否存在绕过。
- CloudBase 默认域名仅宜开发/测试；2025-10-09 后创建的环境可能出现中间提示及使用限制。长期国内访问应使用自有已备案域名（以账号资源、区域、备案及服务设置为准）。

官方参考：
- https://docs.cloudbase.net/hosting/web-hosting
- https://docs.cloudbase.net/hosting/cli-devops
- https://docs.cloudbase.net/cli-v1/hosting
- https://docs.cloudbase.net/hosting/security
- https://docs.cloudbase.net/service/authentication
- https://docs.cloudbase.net/service/routes
- https://docs.cloudbase.net/authentication-v2/auth/auth-gateway
- https://docs.cloudbase.net/service/introduce
- https://docs.cloudbase.net/service/custom-domain

## 2. 方案与执行边界

采用 **GitHub 唯一源码 → GitHub Actions 门禁/构建 → CloudBase 国内托管**。不要在 CloudBase 再建立第二套未经校验的视觉母版或编辑源。

本仓库本轮包含：
1. `deploy/cloudbase/neutral-probe/`：完全不含项目业务资料的通用、3 文件静态连通性探针。
2. `scripts/verify_cloudbase_migration.py`：离线检查通用探针与候选 RC1 发布包，确认完整性、允许清单、禁止工程与私有文件。
3. `.github/workflows/deploy-migrate-01-cloudbase.yml`：PR 上仅执行冻结校验、allowlist 构建、375/390 旧业务浏览器测试，产出私有 Actions 证据。**绝不在 PR 中发布 RC1 到公网。**
4. 未来仅当该工作流合并至主分支且人为触发 `workflow_dispatch`、布尔 `publish_generic_probe=true` 时，才可能运行通用探针上传 Job。需配置受保护 GitHub Environment `cloudbase-neutral-probe` 及腾讯云 Secret，上传到 `/mk-connectivity-01` 子目录。Job 只上传中性 3 文件，不上传 RC1。
5. 此 PR 不绑定正式域名、不创建云开发环境、不修改 `app/`、不调整 Netlify、不合并视觉 Draft。PR CI PASS 不代表已部署 CloudBase。

## 3. 需要腾讯云 Owner 完成的一次性准备（尚未执行）

- 腾讯云主站账号、实名认证以及专用测试 CloudBase 环境（记录 `EnvId`、地域、产品套餐与费用限制）；先核实是否已经有可用环境，避免重复创建。
- 确认是否已有符合中国大陆 CDN/HTTP 网关要求的备案域名，以及可用于测试的独立子域名，和域名所有权/DNS/SSL 证书权限。
- 确认内部评审账户身份方案：可用企业/组织成员账户、有效期、账号撤销及审核责任人。**不要使用可绕过的纯前端密码弹层或仅 JS 登录遮罩。**
- GitHub `Settings → Environments → cloudbase-neutral-probe` 设置 Required reviewers，并将 `TCB_SECRET_ID`、`TCB_SECRET_KEY`、`TCB_ENV_ID` 放入该受保护环境的 Secrets。建议使用最小权限 CAM 专用子账号，密钥不得提交仓库或发送聊天。设置环境只允许 `main` 部署。
- 本轮没有与腾讯云账号连接的 ChatGPT 可用部署接口，也未取得合法腾讯云环境 ID/密钥；**未执行远程 API 或 CLI 部署**。

## 4. 两级最小验证流程

### Gate A：通用连通性探针（允许独立、小范围部署）

- 在完成上述专用环境、审批与密钥设置以后，从 GitHub Actions UI 手动选择 `DEPLOY-MIGRATE-01 CloudBase feasibility and neutral probe`，默认分支 `main`，勾选 `publish_generic_probe=true`。若 GitHub 不显示该工作流，说明 PR 未入主分支，不要绕过门禁。
- CLI 使用 `tcb hosting deploy deploy/cloudbase/neutral-probe /mk-connectivity-01 -e "$TCB_ENV_ID" --safe --verify` 上传通用探针并校验；**不得自行改路径为 `release-evidence/merge02n/site`**。
- 测试 `/mk-connectivity-01/`、`health.json` 页面在北京/上海/深圳不同运营商的实际可达性，记录 HTTPS、HTTP 状态、首字节时间、完整加载时间及控制台错误；不假设默认域名长期可用。
- 失败先检查实名/环境开通、CLI 授权、服务默认域名警示和证书备案，不以放开私有业务资料解决。
- Gate A 的通用探针本身**无任何私有原型资料**，允许用于连通性测试，但仍需经账号 Owner 同意。

### Gate B：私有 RC1 的正式发布门禁（当前 HOLD）

以下条件均满足后才能设计/执行 RC1 上传 Job：
1. 经认证入口 `/`、`/central-review-02g.html?catalog=mk`、`/prototype/.../demo/app.js`、所有图片/JS 深链在匿名或退出登录时返回 401/403 或可信登录跳转，不能返回 200 原始内容。
2. **直接 CloudBase 静态默认域名、旧 CDN 域名、网关根路径与 CDN 回源访问均不可绕过该认证。** 仅在自定义域名的页面加登录不能满足。
3. 合法授权人员登录后能取回完整业务资源；退出/失效后不可用；权限撤销可验证。
4. 实际部署版本有 Commit SHA、EnvId、部署回执及回滚版本。测试脚本及截图只能保存在私有仓库/Actions，不能传入公网静态目录。
5. 375×812、390×844 的 H01/CAP/ITEMS/S01/S02/S5/QUICK/O01 线上浏览器完整回归通过，明确区分演示微信/短信/支付与真实平台能力。
6. 产品测试截图与已批准母版做同状态对照；VIS-GUARD 不自动因 CI 通过而签收。
7. 需验证自有域名ICP备案、站点安全设置及大陆实际网络速度；当前无任何可信地区测速结果。

若 Gateway + static routing 无法对默认域名做全路径防护，应该转为 **CloudBase 私有对象存储 + 认证后的云函数/云托管代理**，或能在边缘层执行强制鉴权的方案；不直接把 RC1 文件上传为公共静态资源。

## 5. 完成判据与进度

| 检查点 | 状态 |
| --- | --- |
| 静态托管/CLI/GitHub 工作流理论适配 | 官方文档支持 |
| 仓库侧中性探针与离线包验证 | 已提交，CI 结果待核实 |
| CloudBase EnvId/凭证与资源区域 | 未获得，NOT VERIFIED |
| CloudBase 远程通用探针发布 | NOT DONE |
| 大陆三地测速 | NOT TESTED |
| 网关认证 + 默认域名绕过测试 | NOT TESTED |
| 线上 RC1 私有部署 | HOLD / NOT DONE |
| main 及 VIS-GUARD | 未改动 |

下一任务：`DEPLOY-MIGRATE-02｜腾讯云环境与已备案域名准入、通用探针远程部署及匿名/登录通道安全验证`。
