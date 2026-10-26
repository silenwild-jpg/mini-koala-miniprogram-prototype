# Codex 真实母版定向接线任务与门禁

## 0. 前置（不允许跳过）

1. 启用 `GIT-SETUP-02` 本地仓库，检查 `git status`、首次 Commit、五个 Worktree 和私有远端。**没有上述证据时不得声称已接线**。
2. 从本机取得：冻结的 `CURRENT_CANDIDATE.zip` / 中央01B，BRANCH-01、02、03、04 最终源码 ZIP，配套获批视觉图。执行实际 ZIP SHA/CRC 与主入口核验。
3. 建立专用分支 `feature/wx-native-01e-authgate`，以 `integration/proto-merge-01f` 为基础；若尚不存在中央集成底座，停止变更，先完成 GIT-SETUP-02。
4. 备份原始 DOM/HTML 与函数入口清单。所有版本名称和时间戳写 `SOURCE_RECEIPT.md`。

## 1. 精确入口搜索

在真实仓库全文搜索 `getQuote`, `quote`, `S5`, `立即下单`, `确认订单`, `submitOrder`, `O01`, `orderSnapshot`, `renderPrice`, `showPrice` 等；**搜索结果不等于真实函数名**，人工归类只改调用入口，拒绝大范围整页替换。

## 2. 共享层接线

- 把 `src/auth-gate.mjs` 适配到当前母版的真实 JS 加载形式（ES module 或现有全局模块）；保持一个 AuthGate 实例和共享会话，不在每个页面重复写登录逻辑。
- 对接真实登录态 `provider.isVerified`，以服务端已验证的手机号会话为准；未接后端的演示要显示显著 `模拟`，禁止混用虚假手机号验证与线上接口。
- 原生授权界面使用微信内建方式；不实现自定义系统手机号选择框。
- 统一自定义底部登录弹层使用获批 A 极简方案，保留短信备用入口、协议默认未勾选和关闭浏览路径。
- 业务 `QUOTE`/`ORDER` handler 只有在门槛成功后执行；前端不可先加载受保护报价再用遮罩隐藏。
- O01 深链/刷新进入时调用 `onEnterOrder()`，返回 `executed` 才展示受保护订单信息；O01 服务端/数据层再校验会话；订单提交需要后端幂等和同源快照，不得重算或覆盖已签发价格。

## 3. 定向分支接线

| 分支 | 要改的节点 | 禁止误改 |
|---|---|---|
| BR01 | H01 快捷下单动作 | 首页视觉母版、四步流程、推荐规则 |
| BR02 | CAP/物品估算/AI 流向 S5 的正式报价触发 | 估算页示意、容量档位、默认租期 |
| BR03 | S01、S02、U01 的“立即下单”动作 | 两店默认展开、缩略图、详细地址、卡片文案 |
| BR04 | S5 自动报价、快捷单、O01 交接 | 租期推荐视觉、共享容量、同源 O01 快照 |
| CENTRAL | O01 刷新/深链/提交与订单恢复 | 真实订单报价、支付恢复、续租链路 |

## 4. 回归矩阵（真实仓库才可签收）

- 两设备 CSS 视口 375×812 / 390×844，Chromium 同一提交 SHA，实际运行 HTTP 页面。
- 每节点覆盖未登录、已登录、拒绝、错误、短信成功、会话过期；S5 自动报价还验证 UI 与受保护接口均不泄漏正式金额。
- 核对返回、切页、刷新、弹层关闭后原用户条件保存；成功后仅回放一次；优惠/仓位/租期变化不带旧报价跳 O01。
- 必须保存 `git diff --stat`、截图路径、JS/Console 错误、测试日志、浏览器网络记录。不得用本包 demo 截图冒充真实页面截图。
- 微信真机可单列 `NOT TESTED`，但上线门禁继续 HOLD。

## 5. Git 提交建议

只在真源码通过定向测试后执行：

```
git status --short
git diff --check
node --test tests/auth-gate.test.mjs
# 真页面 Chromium 截图、跨页订单 QA 完成后
git add [精确指定的共享 JS、适配器、测试、必要模板]
git commit -m "feat(auth): gate official quotes and orders behind verified phone"
```

不要直接 `git add .`；不要自行 push 到 main，不替用户覆盖远端已有成果。
