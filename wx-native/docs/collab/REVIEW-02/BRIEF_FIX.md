# REVIEW-02 修复批：公共任务书（所有执行者先读完）

迷你考拉仓微信原生小程序刚做完一轮独立回归评审（5 条旅程，89 条发现，无 P0 / P1）。你负责修其中一个域。同时有 5 个执行者在**同一个工作目录**里各改各的域，边界要守严。

## 先读
1. `/srv/dt/product/tmp/vu4/BRIEF_COMMON.md` 里的这几节仍然有效，照做：「工作目录」「范围红线」「代码与样式约定」「测试与出图」「出图命令」。其中临时目录改为 `/srv/dt/product/tmp/rv2/fix/<你的域>/`，出图前缀改为 `r2_<域>`，其余「贯穿全批的三条要求」等任务内容本批不适用。
2. 评审任务书 `/srv/dt/product/tmp/rv2/BRIEF.md`（了解评审员的标准与材料位置）。
3. 分给你的评审报告（见你的专属任务）。评审图在 `/srv/dt/product/tmp/rv2/w375/<状态名>.png`。

## 怎么处置每一条
评审员的结论不是定论。**每条先回到源码核实**，再四选一：
- **已修**：确属缺陷（回归、不一致、文案错、状态缺操作、裁定没落地、版面问题），而且不需要新的业务口径——直接修。
- **部分修**：能修的修掉，剩下的说明原因。
- **待裁**：要业务或产品负责人给口径的（类型是「规则待定」、涉及匹配 / 价格 / 流程规则、两份裁定互相冲突、合规文本），**不要自己定规则**；如果有不改规则也成立的显示层改进，可以做，并登记成小口径。
- **不成立 / 不修**：核实后不是问题，或属于近似渲染瑕疵、已登记的待裁项，写明理由。
不改业务规则、流程节点、路由、价格与匹配逻辑；不编造门店事实。大范围版式重排不要做（登记待裁）。

## 交付（写在 `/srv/dt/product/tmp/rv2/fix/` 下）
- `disposition_<域>.csv`（UTF-8，全字段加双引号）：`编号,严重度,处置,核实结论,改了什么,涉及文件`。分给你的每一条都要有一行。
- `pending_<域>.csv`（全字段加双引号）：`类别,我先按什么做了,影响范围,怎么撤回,状态`，状态写「待最终裁定」或「待业务裁定」。没有就不建。
- 测试：行为类的修复在 `tests/review-02-<域>.test.js` 里补测试（写法参照 `tests/impl-02-*.test.js`）；只跑自己域相关的测试文件，保证你动过的页面原有测试不坏（跑 `node --test tests/` 下与你域相关的文件）。别的域的失败不归你管。
- `python3 tools/static_check.py miniprogram` errors 为空。不要跑 `tools/smoke_run.js`、`smoke_orders.js`。
- 改完出图自查（看过图再交）。
- 不要 git 提交。最后回复我：不超过 250 字的摘要（已修 / 部分修 / 待裁 / 不修各几条，动了哪些共享文件，没验证到的地方）。

## 文件归属（防止互相覆盖）
- find：`pages/home` `pages/stores` `pages/store` `pages/estimate` `pages/match`、`services/finder.js`、`core/matching.js`、`i18n/find.js`、首页任务卡组件（首页与「我的」共用的任务卡也归 find）。
- trade：`pkg-trade/confirm` `pkg-trade/quick` `pkg-trade/agreement`、`i18n/trade.js`、交易相关 core。
- order：`pages/orders`、`pkg-trade/order`、`pkg-after/*`、`services/order-view.js`、`components/mk-order-card`、`i18n/after.js`。
- account：`pages/mine`（不含任务卡组件）、`pkg-account/*`、`i18n/account.js`。
- lead：`pkg-lead/*`、`pkg-dev/*`、`i18n/lead.js`，以及**公共组件与公共样式**（`components/mk-notice` 等公共组件、`app.wxss`、`styles/`）。
要改不归你的文件时：只做小范围定点 Edit（编辑前重读那几行），并在摘要里列出；公共组件的问题（例如通知条里的操作文字颜色）统一由 lead 修，其它域不要各修各的。
