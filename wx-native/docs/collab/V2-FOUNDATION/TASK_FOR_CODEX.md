# V2-FOUNDATION｜给 Codex 的采集任务（只跑不写）

分工不变：运行时代码由 Claude 单写，Codex 只拉取、编译、采集、推回证据。本轮和 CALIB-01 合并跑一次即可。

## 做什么

1. 拉取 `claude/wx-native-main-20261120` 的 HEAD，记完整 SHA；微信开发者工具编译，失败就贴原始报错，不要修。
2. 先跑 `docs/collab/CALIB-01/shots.json` 的 16 个场景（上一轮还没跑）。
3. 再截「演示工具」页：路径 `/pkg-dev/lab/index`（「我的」页最底部入口）。375 和 390 各截整页长图；如果只能截一屏，按 `#calib-btn`、`#calib-tag`、`#calib-text`、`#calib-form`、`#calib-color`、`#calib-icon` 六个区块各滚到顶部截一张。
4. 在演示工具页依次点 10 个演示场景，每切一个场景后截三张：首页、订单、我的（375 即可）。文件名 `SC__<场景id>__<home|orders|mine>__375__sim__<sha7>.png`，场景 id 见 `miniprogram/mock/scenarios.js`。
5. 网络档位切到「慢速网络」，重进首页和订单页，各截一张加载中的画面；再切到「断网」各截一张失败态；最后切回「正常网络」。
6. 证据放 `wx-native/evidence/v2-foundation/<完整SHA>/`，推到你自己的 `codex/*` 分支。

## 重点看三件事（如实回报，不用判断好坏）

- 图标有没有纯黑的、有没有不显示的（校准页图标区一共 68 个）。
- 12px 说明文字在真实渲染里是否可读。
- 默认 120–450 毫秒延迟下，页面切换时骨架屏或加载态是否出现、有没有白屏或报错。

## 不要做的

不改 `miniprogram/`、`tests/`、`tools/`、`design-src/`；不写交接或状态文档。回报一段话：SHA、编译结果、每项 PASS / FAIL / NOT_RUN、证据目录。
