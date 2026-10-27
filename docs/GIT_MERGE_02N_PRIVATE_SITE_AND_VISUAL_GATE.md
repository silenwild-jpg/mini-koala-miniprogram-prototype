# GIT-MERGE-02N｜统一 RC1 私有评审站交付与视觉差异门禁

日期：2026-10-27。已归并主线版本：`DEMO-MK-RC1-20261027`；`main` 的原始合并提交 `285ff1529a0f756662d3f57a7f29ddab3afb07ee`；被冻结的 `app/` tree 为 `75914cf716c891b43e05b1c17675bfbbdefefcb0`。

## 1. Netlify 私有项目与访问状态（已从连接账户实际读取）

- Netlify 项目名称：`mini-koala-internal-rc1-review`
- 站点 ID：`e8bba69f-09d5-4866-842d-43c30411114e`
- 管理面板：https://app.netlify.com/projects/mini-koala-internal-rc1-review
- **访问门禁**：`requiresSSOTeamLogin=true`，`whichProjectsRequireSSOTeamLogin=all`，即所有部署需团队账号登录。现有 Netlify 团队用户数为 1；如需同事评审，须经批准添加相应团队成员或另行明确批准密码访问方案。
- **发布状态：尚未创建首个实际部署。** 项目域名可能已分配，但不能将其宣传为可访问的已上线演示站。创建 Netlify 空项目不等于上传应用文件。
- **隐私底线**：不能为了方便分享而取消所有访问控制。robots/noindex、`_headers` 只是辅助指令，**不能替代** Netlify 的 SSO/密码访问门禁。

## 2. 受控发布内容

- 使用 `scripts/build_rc1_private_site.py` 从冻结的 `app/` 目录生成净化的静态站点目录。
- 自动打包 `central-review-02g.html`、H01/CAP/ITEMS/S01/S02/S5/BOOKING/QUICK/O01 的当前运行 HTML/CSS/JS、所需视觉图片。
- **不打包**私人 QA 日志、source ZIP、Markdown 文档、源码调试工程、`.netlify` 等非浏览器运行材料。
- 新的私有评审入口 `index.html` 提供页面和状态导航：旧 MK 数据主态、备用 SIM 场景，以及 H01、CAP、物品估算、S01、S02 示例、S5、预约、快捷下单。O01 必须完成真实交互及模拟手机验证后进入，不开放绕过验证的直达按钮。
- 受控部署文件带 `X-Robots-Tag: noindex,nofollow,noarchive`、`robots.txt`、禁止跨域 frame 及 no-cache 指令；这些均不是实际安全认证。
- 本轮**完全不修改**获批产品母版、图片原件和业务逻辑；私有评审入口是外围导航页，而不是取代小程序设计。

## 3. 自动打包与真实浏览器回归

- Netlify Git 构建配置：仓库根部 `netlify.toml`；构建命令 `python3 scripts/build_rc1_private_site.py`，发布目录 `release-evidence/merge02n/site`。
- GitHub Actions `.github/workflows/git-merge-02n-protected-review-package.yml` 先核验 RC1 Git Tree 冻结，再打包运行目录，再启动静态文件 HTTP 服务，用 Playwright 真实加载**打包后**的 375×812、390×844 页面。
- 目标：MK 旧目录入口/H01→CAP→S5→O01 的模拟支付 **8/8 PASS**，五城市 S01/S02/S5 + SIM 退路 **12/12 PASS**；截图和测试回执保存在私有 GitHub Actions Artifact。不得仅用“原仓库测试通过”代替发布包测试。
- 无法通过当前 Netlify 连接的可用操作直接执行 `deploy` 或 GitHub 仓库绑定。需要由 Netlify 项目 Owner 在管理 UI 完成一次动作；不能将“部署包存在”伪装成“站点已上线”。

## 4. 首次实际部署操作（仅限已有的私有项目）

推荐 **Git 持续部署**：打开上文管理面板，在项目设置的 Continuous Deployment / Git repository 下关联**私有** GitHub 仓库 `silenwild-jpg/mini-koala-miniprogram-prototype` 的 `main` 分支。确认构建读取根 `netlify.toml`，发布目录为 `release-evidence/merge02n/site`。在执行第一轮部署之前、之后，都要确认访客控制的团队登录要求适用于 **all deployments**。Netlify 连接 private repository 可能要求向 Netlify GitHub App 授予该仓库权限；仅授权目标私有仓库，避免扩大到所有仓库。

备选 **手动一次性上传**：从本次 GitHub Actions 的 Artifact 下载 `DEMO_MK_RC1_Protected_Internal_Site_20261027.zip`，并在**已创建的同一个 Netlify 私有站点**的 Deploys 页面选择上传静态部署包。ZIP 顶层有 `index.html`，不是包含一层额外目录。不得上传到其他未启用访问控制的站点或公共 Drop 项目。手动上传后，后续 Git 推送不会自动更新站点。

**发布后验收**：Netlify deploy `ready`；在未登录团队账号的无痕浏览器中，网站内容受到登录拦截；团队成员登录后进入首页、126 店 MK 入口与 S01/S02/S5/O01；不存在缺图、404、错误脚本或数据混源。

## 5. 对照签收图的视觉差异（截图已人工查看）

- **H01 首页（VIS-11J）**：深绿色长廊首屏结构、找门店主入口、容量次入口保留，但当前历史 MK 门店卡的标签、参考价格、距离信息与签收图的演示状态不一致；当前截图仅 812 高度，无法据此宣布企业区和品牌三图缺失。需要全长 375/390 同状态人工确认。
- **S01（VIS-07）**：旧母版是紧凑门店列表，当前页面前两店默认展开具体仓型预览；这是后续批准的业务结构变更，不能为了旧图强制撤回双店展开。价格是否满足“整期主价/月租次级”最新语义仍需核对。
- **S02（VIS-07）**：新 MK 数据复用示意照片，当前头图局部裁切过重；历史照片不代表新旧门店的真实摄影，需按实际素材与最近母版做受控视觉修复。旧原图含已批准取消的评价区，不能恢复该区。
- **S5**：旧来源图为 5m³、12个月、不同门店与 3 方案；当前 MK 实测为 3.5m³、6个月、2 个候选，不能做像素级相同比较。新仓型“仓型选项 / N 项仓型组合”已根据来源身份正确标示。
- **O01**：模拟支付与报价快照同源已实测，历史价格与仓型选项不得作为正式订单报价或实物仓号，仍需多异常态视觉人工检查。

**结论**：静态打包与运行质量可自动验收；完整冻结视觉人工签收继续 HOLD。不可将该报告误写为全部视觉差异已完成。

## 6. 下一步最小验收

1. 首次部署到受控 Netlify 项目并确认未登录者访问被 SSO 阻断；若无法在现有 Netlify 连接中执行部署，则由项目 Owner 在 UI 完成链接/上传后再复测，绝不能凭推测给出可访问链接。
2. 选择真实获批 H01、S01、S02、S5 的 **同门店/同仓型/同容量/同租期**状态比较，优先处理复用照片过度裁切和 S01 价格层级，而不触动已冻结布局。
3. 以内部评审为唯一发布范围；真实微信小程序、线上库存、正式支付和客户个人信息采集不在本轮范围。

**状态：Netlify 私有项目已创建；部署包生成与双尺寸回归成功；受控网页第一次发布待执行；视觉最终签收 HOLD。**
