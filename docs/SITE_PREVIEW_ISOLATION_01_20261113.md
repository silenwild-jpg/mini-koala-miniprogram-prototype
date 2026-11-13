# SITE-PREVIEW-ISOLATION-01｜旧Netlify RC1预览失败的静态根因核对与隔离方案

**审计日期：** 2026-11-13。此文件仅诊断，不修改任何Netlify站点、GitHub检查/Ruleset或正式演示候选。

## 已核实的事实

| 项目 | 证据 |
|---|---|
| 当前GitHub main | 审计开始SHA `ad6413c9d86d2c6a8142a010684129cf9d748d62`，main受保护 |
| 正式演示候选 | [PR #176](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/176) SHA `41a8a079eb48049e1060512bddf71c226bfd3738`，已签收，但**未确认任何线上站点正在发布该SHA** |
| 旧RC1站 | `mini-koala-internal-rc1-review`，Netlify Site ID `e8bba69f-09d5-4866-842d-43c30411114e`，Site Access要求Team SSO访问所有部署 |
| 旧RC1现行已发布部署 | ID `6af6a3a5250e46c6f9f4eff7`，状态`ready`，2026-11-13 UTC发布；commit `9b0f07d563777e37d736551a176fe814134454fa`，**不是PR#176签收SHA** |
| 旧RC1治理PR #184失败的预览 | ID `6af70a159edf1182f4dcb672`，`error`、`published_at=null`、build exit 2，指向治理PR SHA `95b4e37cdf635929f9a919f1ae747585201e02b7`；GitHub历史Netlify三项检查因此显示FAILURE |
| 旧RC2 PR96 UAT站 | `mini-koala-rc2-uat-pr96-20261110`，部署ID `6af3442d0a6cc685b78ebe74`，`ready`，`branch=uat/rc2-pr96-20261110`，commit `be4b8d1aee72357cb38c2e6d61ad2adf90dfc6cf`，亦**不是PR#176签收SHA**。该来源分支具有明确外部部署依赖，不得删除。 |

## 导致旧RC1预览不适应当前main的静态证据

仓库根目录 [`netlify.toml`](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/blob/main/netlify.toml) 当前全局构建命令：

```toml
[build]
command = "node scripts/verify_demo_rc1_p1.cjs && python3 scripts/build_rc1_private_site.py"
publish = "release-evidence/merge02n/site"
```

[`scripts/verify_demo_rc1_p1.cjs`](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/blob/main/scripts/verify_demo_rc1_p1.cjs) 被设计为**历史冻结RC1-P1专用审计**。它固定冻结RC1提交 `46cfdc8e8026098e20f988b8007c96b8f2be4789`，并对该提交至构建HEAD的`app/`变更路径执行严格`assert.deepEqual`，只允许：
- `app/prototype/parallel/core-journey-fix-01/demo/app.js`
- `app/prototype/parallel/core-journey-fix-01/qa/test_site_access_03c_browser.cjs`

本轮已实际通过Git Trees递归对照冻结RC1与main `ad6413c9...`，两棵树均未截断，**共有3个发生变化的app路径**：上述2个加上`app/prototype/parallel/core-journey-fix-01/demo/promotion-policy.js`。

所以：**如果旧Netlify预览使用当前仓库的全局netlify.toml命令及当前main/治理PR源码，该RC1两文件白名单断言就必然不满足**。这一点已有代码和树差异支持；但尚未获取对应Netlify完整构建日志，因此不能单凭此认定具体失败日志的唯一触发断言，也不能声称已经修复Netlify。

## 推荐的低成本隔离方式（待单独授权/管理员权限）

1. **优先保持当前发布的历史RC1演示快照不变。** 将旧RC1网站的自动Deploy Preview/Git来源触发范围缩窄到明确保留的历史分支，或停用该旧站对新治理PR的Preview检查。目标是旧RC1站不再参与所有main治理PR的状态检查；注意只处理历史站点，不影响当前RC2正式演示候选。
2. **保留可追溯的历史RC1校验器。** 不去放宽`verify_demo_rc1_p1.cjs`对历史冻结版本的精确白名单，也不因旧Netlify失败而删除关键安全校验。不要为追求“全部绿”而直接改变RC1冻结源码或禁用当前`Visual contract and evidence guard`。
3. **若未来需要线上正式演示**，为签收RC2 SHA `41a8a079...`另建独立站点/构建来源，部署完成后记录Netlify Site ID、Deploy ID、commit SHA、构建manifest、访问身份、375/390和移动端UAT；**旧PR96或RC1站不能冒充正式演示版本**。
4. **main规则仍应保留GitHub Actions的必需Visual guard。** 目前Ruleset重复配置同名检查和严格分支更新要求的问题与旧RC1 Netlify是不同事项；需在GitHub管理员配置界面单独处理，且不能未经验证宣称已经调整。
5. 本轮读取Netlify项目显示旧RC1与旧PR96站均启用**Team SSO（all）**。SSO实际成员访问体验与国内访问可达性仍需真实身份/设备测试；不能仅凭SSO字段断言通过UAT。

## 不执行的操作

- 不修改Netlify站点访问权限、构建设置、环境变量或部署；
- 不修改`netlify.toml`或历史RC1脚本以强行掩盖错误；
- 不删除被旧Netlify部署引用的UAT/历史分支；
- 不改变main Ruleset、签收PR#176或合并业务原型。

下一步若确认可以修改旧站Deploy Preview策略，由Netlify管理员在旧站Git/Deploy Preview设置中精准调整，并用一个docs-only PR证明不再生成误报；更新项目总控的证据与回滚说明。
