# CALIB-01｜给 Codex 的采集任务（只跑不写）

分工已由张坤在 2026-11-20 晚改定：**运行时代码改由 Claude 单写；Codex 只做拉取、编译、按清单采集、推回证据。** 以本文件和仓库根 `AGENTS.md` 顶部的「分工变更」为准，旧的单写者表作废。

## 这一轮做什么

1. 拉取分支 `claude/wx-native-main-20261120`，以它的 HEAD 作为运行时版本（记完整 SHA）。
2. 微信开发者工具编译；编译失败就把原始报错贴回，不要修。
3. 按同目录 `shots.json` 的 16 个场景、375 和 390 两个宽度截图，文件名按其中的 `file_name`。
4. 每个场景截图前执行一次 `shots.json` 里的 `measure_fn`，返回值原样存成 `<scene>__<width>.measure.json`。
5. 证据放 `wx-native/evidence/calib-01/<运行时完整SHA>/`，附 `shots.csv`（沿用 COLLAB-SETUP-01 的列）和 WXML 编译输出。
6. 推到你自己的 `codex/*` 分支，不要推 `claude/*`。

## 不要做的

- 不改 `wx-native/miniprogram/`、`tests/`、`tools/` 里的任何文件。跑不通需要改时，写明原因和建议改法，由 Claude 改。
- 不写交接文档、状态文档、处置表。回报只要一段话：运行时 SHA、编译是否通过、每个场景 PASS / FAIL / NOT_RUN、证据目录。
- 不做视觉判断。截图和测量值如实交回即可。

## 这一轮改了什么（供核对）

- `app.wxss`：公共复位 `.mk-btn.mk-btn, .mk-bare.mk-bare { width:auto; margin-left:0; margin-right:0 }`，对付 style v2 的 `button:not([size=mini])` 184px 默认宽度。
- 7 个没有 `mk-btn` 的文字型按钮加了 `mk-bare`。
- 页面和组件里给按钮写宽度、左右外边距的规则统一提到三个类名的权重（`.mk-btn.mk-btn.xx`）。
- 删掉 `pages/mine/index.wxss` 和 `pkg-account/acc.wxss` 的两处页面级复位。
- `tools/static_check.py` 增加两条按钮约定检查；新增 `tools/calib_buttons.js` 和 `tools/calib_buttons_measure.py`（Linux 上的近似量宽工具）。

## 预期值的来历

`expected_button_widths.csv` 是 Claude 在 Linux 上用近似渲染量出来的（把 v2 的默认规则按权重模拟），不是微信渲染。它在修复前复现了你们实测的 184 锁宽，以及门店页分享 56/58、预约看仓 64/66，所以可以当参照；**与你的 measure 结果不一致时，以你的为准**，差异原样交回。
