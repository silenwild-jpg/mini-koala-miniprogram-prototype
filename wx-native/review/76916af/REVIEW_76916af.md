# 独立评审 REVIEW_76916af（2026-11-20，北京时间）

- 评审对象：`codex/inventory-display-density-20261120` @ `76916af`（运行时候选 `f125158`）
- 评审方：Claude（独立评审，不改运行时代码）
- 性质：01B 组件试点的**追溯评审**。01B 已改共享弹层 `mk-sheet`（Codex 自述影响 28 页），改动落地前没有经过独立评审。

## 1. 技术门禁独立复跑（Linux / Node 20，在 `76916af` 上）

| 项 | 结果 | 与 Codex 记录 |
|---|---|---|
| `node --test tests/` | 164 / 164 通过 | 一致 |
| `node tools/smoke_run.js miniprogram` | 35 页 / 22 组件 / 6618 次调用 / 0 异常 | 一致（Codex 是在父提交 `96692b8` 上跑的，我在最终提交上重跑了全量） |
| `node tools/smoke_orders.js miniprogram` | 6 单 / 54 次页面加载 / 960 次调用 / 0 异常 | Codex 的 01B G_TECH 没有这一项 |
| `python3 tools/static_check.py miniprogram` | **2 条错误** | Codex 的 01B G_TECH 没有这一项 |
| 微信开发者工具 WXML 编译 | 未跑（我没有开发者工具） | Codex 记 60 模板编译成功，我无法复核 |

结论：**G-TECH 不通过**，原因只有静态检查一项（R76-01）。

## 2. 视觉评审范围

- 看了最终候选 24 张图中的 16 张（拼图 `final-review-0.jpg`、`final-review-2.jpg`），并取 2 张原图裁切放大核对。`final-review-1.jpg` 的 8 张（none5、quick-fees、quick-member、store-combo31）**本轮没看**。
- **没有逐张对照冻结稿**：证据没有 `design_ref` 索引，截图也不是 1:1 像素（R76-05）。下面的视觉问题是可读性和排版问题，不是还原偏差结论。
- G-VIS 结论：**HOLD**。已看的 16 张里，容量差额、组合编号、价格、登录用途文字的可读性没有发现问题；问题见下表。

## 3. 问题单

见同目录 `review_issues.csv`，共 8 条：P1 × 1，P2 × 6，P3 × 1。

## 4. 没有覆盖的

真机、软键盘、系统字体放大、读屏、弹层关闭区的实际点击、页面下方滚动区域、35 页默认态的 70 张初轮图。
