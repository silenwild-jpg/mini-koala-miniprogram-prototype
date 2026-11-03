# PROTO-RULE-RESTORE-09｜RC2私有评审候选交付与发布前门禁
截至：2026-11-03；基线 PR #54 / `ac83603dc20be2de53f7e27a3b428ee674d54637`；新分支独立制作**不发布的RC2评审ZIP**。

## 版本依赖（实际GitHub核实）
`main@274c5110` → Draft #47 → Draft #48 → Draft #49 → Draft #51 → Draft #52 → Draft #53 → Draft #54。上列均未归并main。Draft #50 是独立PRD分支，不处于该运行源码链；不得未经批准将其当作当前发布文件。RESTORE-09在#54之上增加审计脚本、CI和交付门禁文档；无产品页面、门店/价格模型和H01母版修改。

## 候选工件（待本PR同SHA CI成功后填写）
- 源：GitHub本PR隔离分支，完整40字符SHA以 `release-evidence/proto-rule-restore-09/private-candidate-preflight.json` 中 `review_candidate_sha` 为准。
- 生成：`python3 scripts/build_rc2_isolated_demo.py`（沿用同源、隔离版已验证构建器）。
- 内部评审ZIP：`MiniKoala_RC2_RESTORE_09_Private_Review_Candidate_20261103.zip`；包含入口 `index.html`、`central-review-02g.html`、活动运行时和必要图片。ZIP本身**不含密码/SSO保护**，仅限授权人员存放。
- SHA-256：以CI中的 `private-candidate-preflight.json` 和 `build-summary.json` 为准；不得编造。
- 核心固定入口：`/central-review-02g.html?catalog=sim&page=H01`、`/central-review-02g.html?catalog=sim&page=S01&s01_r2=1`。从页面内选仓进入O01；直接构造O01 URL应被业务门禁拒绝。
- 旧U01页面仍不进活动ZIP；历史兼容302仅在本地/候选包准备，尚未在RC1现网生效。

## Netlify现有站点（实际读取）
- 项目 `mini-koala-internal-rc1-review` / id `e8bba69f-09d5-4866-842d-43c30411114e`，当前published deploy `6ae3eecbe34f877c27632485`。
- published实际Commit为 `main@274c5110aa18af7ed71d92533ab126ebbbd11f75`，2026-10-30，状态ready。**此站不是本RC2，不作为评审地址发放**。
- 已返回项目级 `requiresSSOTeamLogin=true`（all deploy contexts）、`requiresPassword=false`。Netlify团队 `silenwild` 是 Free 方案、当前成员数仅1、当前用户为 Owner；**尚无已核验的其他内部试用成员身份**。这表明现有站点设置要求团队SSO，不表示所有拟邀请的试用用户拥有该团队访问权限；也未证明新候选实际部署及手机端访问成功。
- 当前浏览器旧S02深链曾显示“未能打开此演示入口”；只代表RC1旧版本该链接，不判定RC2核心链路失效。
- Netlify站点与部署设置**保持原样，不创建站、不上传ZIP、不更改SSO、不合并main**。

## 后续如获批准部署，须先满足
1. 明确指定**独立RC2评审站**的站点管理账号/团队与参与者访问范围。先建独立站并配置团队SSO全上下文，再允许任何上传发布；不能先发布再补访问控制。不得覆盖RC1。
2. 使用工件的ZIP SHA-256与源码SHA核对部署字节；验证SSO匿名未授权返回登录/拒绝、团队授权后才打开；复制链接到未登录浏览器和两部真实手机分别测试。
3. 在真实手机验375/390画布和安全区、首屏加载、横向滑动、弹层点击、S5回流、O01授权/取消模拟、历史U01重定向，报告可见错误截图及实际网络环境。国内访问须有**中国大陆实际网络参与者**检查，不能以当前境外连接推断国内可达。
4. 只使用模拟手机号与演示支付；禁止使用真实交易、实收金额、客户CRM私有数据或真实个人信息作为试用夹具。
5. S01最新三筛选完整批准原图**仍未收到**，所以本轮可以准备“受控业务试用”，不允许以此项目标记最终视觉签收。

## STOP条件
SSO未实际阻断匿名、候选SHA与部署不符、手机无法进入核心链路、出现个人数据/真实支付/未经批准公开分享 → 立即停用链接并按权限流程处理。GitHub Actions的成功是本地模拟浏览器和源码门禁成功，不代替手机/网络验证。
