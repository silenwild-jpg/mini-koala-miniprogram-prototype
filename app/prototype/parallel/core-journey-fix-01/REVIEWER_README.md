# WX-NATIVE-01E 统一手机号验证候选

本候选基于 PR #4 的 CORE-JOURNEY-FIX-01 提交 `6015b9a787ab5045c82aaa209ac626ce9d923a79`，接入已接收的 WX-NATIVE-01E-R1 共享守卫。原三项修复继续保留。阶段为独立演示候选已实现及已测试，视觉待用户评审，中央未合并，Release Gate HOLD。

## 打开

运行本目录的 `START_AUTH.cmd`，或 `python serve.py --no-browser`。

- 评审入口：http://127.0.0.1:4240/auth-review.html
- 完整原型：http://127.0.0.1:4240/demo/home.html
- 原三项修复说明：`fix.html`

## 本批行为

- 未验证用户可浏览首页三家门店立方参考单价，以及公开门店信息和月租参考价。
- 容量/物品估算的“查看报价”、正式整期价格、选仓到 O01、O01 深链和提交统一检查有效手机号验证。
- 手填联系方式不解锁正式报价或订单；微信快捷授权和短信验证码是本地模拟的验证路径。
- 关闭、拒绝、错误码或接口失败不执行受限动作，不清除容量、租期、门店和仓位；条件变化后不恢复旧操作。
- 会话有效时不重复打扰；预约用仓仍是地址留资，不生成订单。

“验证设置”是本地测试控制：微信结果可选成功/拒绝/失败；短信测试码为123456，不发送短信。真实微信、短信服务端会话、价格/库存和交易接口尚未接入。正式协议全文也仍待提供；当前协议说明只描述原型用途。

## 来源和检查

原模块完整保存在 `app/source-reference/wx-native-01e-r1/`，来源图在 `app/source-reference/wx-native-01e-visual/`。包SHA及当前变更清单见 `WX_NATIVE_01E_MANIFEST.json`。

本轮重新执行：原模块19项测试、既有业务94组、21项JS语法检查、375/390各14条页面流程，以及页面异常/HTTP资源检查。结果与截图位于 `evidence/auth01e/`。`qa_auth_browser.cjs`检查行为，`qa_auth_visual.cjs`提供 PR #4 与本候选的同尺寸对照。

`GIT_INTAKE.json`和`PROJECT_MANIFEST_SHA256.json`描述的是PR #4原始接收快照，保留作历史来源；当前候选请使用新增的WX清单。

## 分支范围

`feature/wx-native-01e`基于`feature/core-journey-fix-01`。评审PR以该来源分支为目标，便于只评审本批实际运行改动。原BR01–04工作树和中央分支没有被覆盖。S01展开、PROMO-VIS-01E、UNIT-COPY-MATCH-01B和仓位图片仍是后续独立批次。
