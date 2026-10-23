# 迷你考拉仓 — 跨分支任务合并续作入口

本压缩包是以 `Mini_Koala_Confirmed_UX_Merge_PATCH_V1_1.zip` 为源的**完整候选母版**，不是单独 CSS 补丁；以 2026-10-12 的 A/B/C/D 参考图作为视觉对照材料。

**演示入口**：使用原包 `START_HERE.html`／`START_DEMO.cmd`。

**本次新增资料**：

- `docs/CROSS_BRANCH_UI_PHASE1_MERGE_V1_2.md`：合并内容、结果和下一步。
- `docs/INDEPENDENT_DEMO_ACCEPTANCE_PROMPT_V1_2.md`：给其他 AI 的独立验收提示词（不局限于工程审计）。
- `assets/reference/mini_koala_components_ABCD_reference.png`：用户提供的参考图。
- `RUN_FOUR_PAGE_QA.cmd` 与 `qa/run_four_page_http_visual_acceptance.py`：本地 HTTP 浏览器真实截图工具。
- `outputs/four_page_http_acceptance/results.json`：当前环境实际执行失败证据（0/8，管理员限制）。
- `docs/SOURCE_INTEGRITY_V1_2.json`：源包文件差异和业务代码未修改校验。

**在可用 Windows 电脑验收**：安装 Python 3、`pip install playwright`、`python -m playwright install chromium`，双击 `RUN_FOUR_PAGE_QA.cmd`，按报告进行真实点击和人工截图评审。如果提示浏览器被策略阻止，换可访问本地 HTTP 的环境；不要生成离线假截图代替。

当前版本状态：**内部演示候选 / Release Gate = HOLD**。尚未实现全站 CSS 扩展、真实 URL 四页截图验收、微信开发者工具与真机验收。
