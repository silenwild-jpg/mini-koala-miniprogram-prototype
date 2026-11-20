# D-28 · RESULT 遗留页退役规格（设计侧 + 代码侧）· VIS-REDESIGN-01A W5 · 2026-11-17

裁定来源：WP05 §8 D-28「RESULT 遗留页不在 allowedRoutes，仅直链可达 → 退役，功能由 ResultState 组件承接」，张坤 2026-11-17 批准 WP05 时按建议执行。本文件把「退役」写成可核对的映射表与代码侧改动清单；**本阶段不改仓库代码**。

## 1. 现状事实（PR #220 HEAD `1d0dc7f`，只读核对）

| 项 | 事实 | 出处 |
|---|---|---|
| 路由 | `RESULT` 不在 `central-contract.js allowedRoutes`（16 个中央路由）；只能由 `index.html?page=RESULT` 直链或 app.js 内部 `go('RESULT')` 到达 | central-contract.js L75–82 |
| 进入方式 | ① `submit()`：提交订单后 `resultKind='order'` → `go('RESULT')`；② `lead()`：旧版预约提交 `core.saveLead` 后 `resultKind='lead'` → `go('RESULT')`；③ 直链冷开 `sessionStorage.mk_sim_result_kind` 缺省为 `order` | app.js L68 / L706–707 |
| 渲染 | `renderResult()` 三个分支：**order**（状态标题 6 种：订单待支付 / 付款流程已记录 / 支付未完成 / 支付已取消 / 订单已取消 / 订单已过期 + 订单号 + 门店·仓号·租期 + 金额行（已授权时）+「查看订单详情」）；**lead**（「用仓需求已保存」+「资料已保存在本机，尚未发送给顾问。」）；**none**（「暂无可查看的提交记录」）；三者共用「继续浏览门店」 | app.js L408–430 |
| 源码注释 | `// Legacy RESULT may still be opened by a direct link. Never imply a lead was submitted or permit payment state changes without a matching record.` | app.js L408 |
| 当前实际使用 | BOOKING / 顾问 / 企业线索已全部走 `MK_LEAD_FLOW` 内嵌结果（不经 RESULT）；只有 O01 `submit()` 仍经 RESULT 过渡到支付 | br04/bridge.js、business-bridge.js |
| WP02 审计 | 冷加载 375/390：<12px 0、对比 0、错误 0，但顶栏 / 字号 / 按钮与其他页面不同族（五个视觉家族之一的 app.js 原生样式） | WP02 报告 §4.6 |

## 2. 退役映射（RESULT 的每个分支 → 已设计的组件化状态）

| RESULT 分支 | 触发 | 承接页 / 状态（已交付 Wave） | 承接方式 |
|---|---|---|---|
| order · 订单待支付 | O01 提交订单成功 | **O01 `pending`**（W2）：状态头倒计时 + 摘要卡 + 费用明细 + 底栏「应付 ¥X · 立即支付」 | 提交后**停留在 O01**，页面切换为待支付态，不再跳转中间页 |
| order · 付款流程已记录 | 支付成功 | **O03 `identity`**（W4）：状态头「待完成身份验证 · 已支付」+ 订单服务行「身份验证（待完成）」+ 底栏「完成身份验证」 | 支付成功 → `go('O03', orderId)` |
| order · 支付未完成 | 支付失败 | **O01 `payment_failed`**（W2，D-42 口径：订单保留 + 四项核对 + 继续支付） | 停留 O01；代码侧依赖 `resumeFailedOrder`（D42 规格） |
| order · 支付已取消 | 用户取消支付 | **O01 `pending`**（倒计时继续）+ toast「支付已取消」 | 停留 O01 |
| order · 订单已取消 | 取消待支付订单 | **O03 `empty`** 或 **H01 `cancelled`**（W1 需求卡「订单已取消」） | 取消后返回 M01/H01，不再出结果页 |
| order · 订单已过期 | 待支付超时 | **O03 `expired`**（W4：原订单金额（已失效）+「重新选择仓位」）/ **O01 `expired`**（W2） | 从订单列表进入 O03；从 O01 恢复进入 O01 expired |
| lead · 用仓需求已保存 | 旧版 `lead()`（已无 UI 入口） | **BOOKING `success`**（W3）：ResultState 组件「预约需求已保存」+ 需求编号 + 已记录信息 kv | BOOKING 已走 MK_LEAD_FLOW 内嵌结果，`lead()` 分支无调用者 |
| none · 暂无可查看的提交记录 | 直链冷开 | **O03 `empty`**（W4 EmptyState「暂无可查看的订单」+「去附近门店」） | 直链 `page=RESULT` → 重定向 O03（无订单时即空态） |

全部八个分支都已有组件化承接，**无需新设计页面**。「继续浏览门店」= 各承接态既有的「去附近门店 / 重新选择仓位」按钮。

## 3. 代码侧改动清单（实施阶段，不在本阶段执行）

1. `app.js submit()`：`go('RESULT')` → 保持在 O01 并 `render()` 待支付态（`pending=order.id`）；支付成功回调 → `go('O03')`。
2. `app.js lead()`：删除（无调用者；BOOKING 走 `MK_LEAD_FLOW`）。
3. `app.js functions` 映射：移除 `RESULT:renderResult`；`renderResult` 函数删除；`resultKind` / `sessionStorage.mk_sim_result_kind` 两处读写删除。
4. 直链兼容：`page==='RESULT'` → `page='O03'`（已有的 `if(!functions[page]&&!framed[page])page='S01'` 兜底会把它导到 S01，建议显式导到 O03 以保留「查看提交记录」语义）。
5. 测试：`qa/` 回归脚本中若有 RESULT 入口（WP02 冷入口清单第 18 项 `index.html?page=RESULT`），改为断言重定向到 O03。
6. 文档：`DEMO_PRESENTER_GUIDE_V1.md` / `DEMO_STORY_MATRIX_V1.csv` 若引用「处理结果」页，改为 O01 待支付态。

## 4. 风险与保留项
- 源码注释的两条约束（不暗示线索已提交、无记录不允许改支付状态）在承接态中仍成立：O01 `pending` 只渲染已存在的订单；BOOKING success 只在 `packet.status==='SUCCESS'` 时渲染。
- 评审模式（`?review=1`）下「付款流程结果已保存在当前设备，未发生实际扣款」这句演示免责按 D-54 规则：不出现在用户界面，只在 review=1 显示。
- 证据：`evidence/RESULT_retirement_map_375.jpg`（左 = WP02 冷加载的遗留 RESULT 页；右 = 承接态 O01 pending / O01 payment_failed / O03 identity / O03 expired / BOOKING success / O03 empty）。
