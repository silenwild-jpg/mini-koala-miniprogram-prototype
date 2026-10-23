# V2.7.4.17.4 Regression Report

## Targeted checks

PASS:
- 共享需求推荐 helper 同时接入 Estimator 与 S01。
- 4.8m³ / 6个月演示需求下至少存在 2 家真实匹配门店，前两张 `matchedCount > 0`。
- Estimator 与 S01 前两张推荐门店顺序一致。
- 第一、第二张均以当前租期月租为主价格，并显示整期租金。
- “符合需求仓位区间 Xm³”已从用户可见推荐卡删除。
- 推荐卡详细地址 `nowrap + ellipsis`。
- 考拉E存卡片 375 / 390 逻辑宽渲染无 JS error；标签与价格区无叠层。
- 第二张推荐进入门店仓位列表后，仍为同一真实门店且显示真实匹配仓型。
- S01 已填需求状态展示 `匹配仓型 X个 · 可租 X个`，无 0 匹配出现在前两张。

## Runtime evidence

演示需求：4.8m³ / 6个月 / 北京国贸 Demo origin。

Estimator：
1. 惠新西街店 · 匹配仓型 1个 · ¥573/月 · 整期 ¥3,440
2. 广渠门店 · 匹配仓型 2个 · ¥378/月 · 整期 ¥2,270

S01 已填需求状态前两张与上述一致。

点击第二张后进入门店仓位列表：`广渠门店 / 当前匹配 2 个仓型`。

## Regression

现有 Node QA（除浏览器 Playwright smoke 脚本的 npm 模块环境项）均通过；需要路径参数的 SSOT / O01 / Viewing runtime 以正确参数运行并通过。

静态包检查：45 HTML、28 inline scripts、430 local references，missing reference = 0。

## Visual QA boundary

当前环境管理员策略仍阻止 Chromium 直接导航 localhost。为避免虚报，本轮使用 Chromium `page.set_content()` 将页面及本地依赖内联后做 375×812 / 390×844 DOM/视觉渲染检查；页面 JS error = 0。截图存放于 `verification_v27417_4/`。
