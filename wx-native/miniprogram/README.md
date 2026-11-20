# 迷你考拉仓小程序（微信原生）

体验版开发工程（W34）。35 个页面全部写过第一遍，没有占位页；数据是演示数据。各页做了哪些状态、哪些没做，见交接包 `docs/W34_Status.md` 和每个页面 js 的页头注释。

## 打开
微信开发者工具 → 导入项目 → 选本目录。`project.config.json` 里的 `appid` 现在是 `touristappid`（游客模式，手机号、支付等接口不可用），拿到正式 AppID 后替换。
**这份代码还没有在微信开发者工具里编译过。** 首次导入如有报错，把报错原文发回来。

## 目录
| 目录 | 内容 |
|---|---|
| `core/` | 业务规则，纯函数，不依赖 wx：`config`（全部可调数值）、`pricing`、`matching`、`volume`、`requirement`、`format`、`order` |
| `services/` | `state`（全站一份登录 / 需求 / 位置）、`auth`（登录守卫 D-198）、`api`（接口层）、`mock-adapter`、`http-adapter`、`finder`（找仓视图模型）、`location`、`routes`（生成）|
| `i18n/` | 界面文字：`zh.js`（公共与找仓）、`find.js`、`trade.js`、`after.js`、`lead.js`、`account.js` |
| `components/` | 通用组件，类名带各自前缀 |
| `pages/`、`pkg-*/` | 主包 7 页与 5 个分包 |
| `mock/` | 演示数据，由 `tools/export_demo_data.js` 从冻结稿导出，不要手改 |

## 约定
- 数值只写在 `core/config.js` 与各域的 `core/config-*.js`；文字只写在 `i18n/`；路径只用 `services/routes.js` 的常量；样式只用 `styles/tokens.wxss` 的变量。
- 页面不直接读 `mock/`、不直接 `wx.request`，一律走 `services/api.js`。
- 跳转到受限页用 `auth.navigate(page, url)`；受限页用 `Page(auth.guarded(routes.X, {...}))`。
- 未登录时不计算、不显示整期金额（`services/finder.js`）。

## 检查（在上一级目录运行）
```
node --test tests/                                  # 单元测试 + 流程测试
node tools/smoke_orders.js miniprogram              # 用演示订单联调订单与租后各页
python3 tools/static_check.py miniprogram           # 静态检查
node tools/smoke_run.js miniprogram                 # 模拟运行
```
演示环境登录后自带 5 笔覆盖各阶段的演示订单（`core/config.js` 的 `DEMO_SEED_ORDERS`）；支付是演示，不调用微信支付、不扣款。
演示环境登录：点「其他手机号登录」，任意 11 位手机号，获取验证码后输入任意 6 位数字。
