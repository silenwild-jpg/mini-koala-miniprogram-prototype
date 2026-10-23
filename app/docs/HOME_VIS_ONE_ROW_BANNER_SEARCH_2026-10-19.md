# H01 场景单行与 Banner 搜索融合受控候选

日期：2026-10-19。接续 `Mini_Koala_S5_HOME_VIS_Controlled_Trial_2026-10-19.zip`（SHA-256 `72f60dca997d875710eb542943f25c383e1638da980446a190e98b80f47df420`）。用户证实母版仍为 `Mini_Koala_DEMO_COUPON_ALL_NEW_01_Candidate_2026-10-15.zip`（SHA-256 `e8e60ee4d00abf2e640054ab430dd68b7ddb1d49e46fab71ef7113f8495d480a`）。本轮为新受控视觉候选，`demo_gate=PENDING_REVIEW`、`release_gate=HOLD`。

## 本轮变更

- H01 的五个场景入口整理为等宽单行，移除卡片边框和底色，缩小图标及说明文字；每个入口继续聚焦原物品目录分类，不自动选择物品。
- 复用 HOME-SEARCH-02A 的唯一搜索入口，将其移到 Banner 后并与底边重叠。左段“北京”调用既有位置选择入口，右段继续进入 S01；确认需求存在时沿用匹配态，无需求时沿用普通浏览。
- Banner 保持原 2:1 完整图片及图内顾问演示入口；原估算、附近门店、继续找仓和下游推荐规则未改。图内“北京 200 家门店”仍是用户冻结的演示文案，不代表真实统计。
- AI 估算仍为固定演示，不写入确认需求。

## 核验与证据

- `MINI_KOALA_INTERCEPT=1 node qa/test_home_vis_trial_browser.cjs`：375×812、390×844 均通过。断言搜索条跨过 Banner 底边、五入口同一行、无水平溢出、城市/搜索分别跳转、五分类均正确打开且不预选物品、确认需求标识保留。
- `node qa/test_cap_first_item_02_browser.cjs`：双尺寸 52/52 PASS；`node qa/test_recommendation_3km_expansion.cjs`：PASS；配置本机 bundled Playwright `NODE_PATH` 后，`MINI_KOALA_INTERCEPT=1 node qa/test_recommendation_3km_http.cjs`：H01/S01/S5 双尺寸 PASS。未改相关业务规则。
- 截图：`outputs/home_vis_trial_browser/H01_NEW_375x812.png`、`H01_NEW_390x844.png` 为无确认需求状态；`H01_375x812.png`、`H01_390x844.png` 为已确认需求状态。两种状态均完成目视检查。
- 上述 Chrome 页面通过本地资源拦截渲染；当前环境的真实 localhost HTTP 被 `ERR_NETWORK_ACCESS_DENIED` 拒绝。未进行微信真机或发布验收。

## 回退与下一步

旧 S5/HOME ZIP 不覆盖。新 ZIP 仅作本轮审阅；如需恢复，直接使用旧 ZIP。下一步在允许本地 HTTP 的环境复核 H01 两种状态和入口返回，再结合尚未完成的 S5 专项矩阵决定是否提升演示候选；正式 Release Gate 继续 HOLD。
