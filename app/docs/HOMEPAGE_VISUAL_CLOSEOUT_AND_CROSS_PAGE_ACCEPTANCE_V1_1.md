# Homepage Visual Closeout & Cross-page Acceptance V1.1

**日期：** 2026-10-12  
**统一母版：** `Homepage State V1.1 + Combo UX V2.1 Merge PATCH V1`  
**候选版本：** `Homepage State V1.1 + Combo UX V2.1 Merge PATCH V1.1 — Visual Closeout & Cross-page Acceptance`  
**Release Gate：HOLD**

## 1. 本轮 PATCH 范围

只针对统一母版的遗留视觉问题和验收证据做增量修改；没有以旧版页面覆盖组合体验 V2.1，也没有改写 S01/S02/U01、估算、报价、订单、支付及身份状态业务规则。

### 已完成

1. **全局帮助悬浮入口避让。** 新增 `prototype/mini_koala_home_visual_closeout_patch_v1.js/.css`。入口与首页可见门店卡、品牌信任卡、服务卡、品牌荣誉卡或任务卡发生实际几何重叠时，暂时隐藏并移出键盘焦点；离开碰撞区域后恢复。监听窗口滚动和原型 `.page` 内部滚动，避免只监听 `window.scroll` 导致下滑后不更新。
2. **品牌荣誉区证据状态清晰化。** 当前素材是示意参考而非已核验的迷你考拉凭证，已停止展示示意证书/媒体图片，改用中性视觉占位；三个项目统一标记“资料待核验”，标题也不再把示意图片呈现成已核验的实际证据。正式材料经业务/法务确认后再替换。
3. **增加自动回归。** 新增首页视觉碰撞专项、主链路由目标检查、13 个关键页面的 Chromium 源码内联运行烟测，并纳入 `tools/run_regression.py`。

## 2. 验收结果

| 检查项 | 结果 | 说明 |
|---|---:|---|
| 原有完整回归套件 | 30 项既有命令保留 | 含组合 V2.1、首页状态机、身份流、价格与包完整性检查 |
| 首页视觉避让专项 | 2/2 通过 | 375×812、390×844；门店推荐区碰撞时隐藏，离开后按碰撞状态恢复；荣誉卡不被悬浮入口覆盖 |
| 主链页面运行烟测 | 26/26 通过 | 13 个关键页面分别在 375×812、390×844 执行；无未处理 JS 页面错误、无水平溢出 |
| 路由目标解析 | 86 项通过 | 13 个关键页面中的 HTML 路由引用均指向存在的本地页面，主要路由引用齐备 |
| 真实 URL E2E | **未完成** | 已加入可在本机复跑的 `qa/real_url_e2e_smoke_v1.py`；当前托管 Chromium 访问真实本地 HTTP URL 返回 `ERR_BLOCKED_BY_ADMINISTRATOR` |
| 微信 WebView / 真机 | **未完成** | 当前运行环境无法代表微信端返回栈、软键盘、触控和真实支付/身份/库存接口 |

## 3. 验收边界与发布结论

本轮的“13 页运行烟测”是在 Chromium 中把原型页面的本地 CSS/JS 内联后运行；路由检查确认目标页面存在。新增 `qa/real_url_e2e_smoke_v1.py` 用于在不拦截 localhost 的开发环境中直接访问真实 HTTP URL，并尝试 H01 → S01 实际点击；本轮运行时被浏览器策略阻断，未伪造通过结果。这些检查有助于发现页面脚本初始化错误、布局溢出和缺失路由，但**不是原始 HTTP 页面间真实跳转的完整 E2E**。没有把被拦截的浏览器导航说成通过，也没有把演示支付、模拟库存或身份验证当成真实后端验证。

因此本候选可用于内部评审和下一步真实环境验收准备，但正式 Release Gate 仍为 **HOLD**。解除 HOLD 前至少需要：

- 在允许访问本地 HTTP 或可控测试域名的浏览器环境执行实际 URL 点击、参数、返回/前进、状态持久化和刷新恢复；
- 覆盖 H01 → Estimator → S01 → S02 → U01 → O01 → O02 → O03，以及预约、过期报价、售罄、组合无匹配和身份验证分支；
- 在微信开发者工具/真机核对安全区、滚动容器、底部导航、悬浮客服、系统返回、软键盘和小程序客服调用；
- 由业务确认品牌荣誉的正式材料后替换“资料待核验”占位。

## 4. 回归执行说明

当前活动回归命令共 33 项：30 项既有检查 + 3 项新增视觉/路由/运行烟测。各命令均在本轮完整执行序列或单独复跑中观察到 PASS；但组合运行在容器总时限内未能完成到末尾并生成新的集中汇总日志，末尾的视觉检查、包校验和 HTTP 资源检查已单独复跑通过。此限制不改变真实 URL E2E 的 HOLD 结论。

## 5. 新增文件

- `prototype/mini_koala_home_visual_closeout_patch_v1.css`
- `prototype/mini_koala_home_visual_closeout_patch_v1.js`
- `qa/test_home_visual_closeout_patch_v1.py`
- `qa/test_cross_page_route_targets_v1.py`
- `qa/test_cross_page_runtime_smoke_v1.py`
- `qa/real_url_e2e_smoke_v1.py`（真实 HTTP E2E 尝试脚本；当前环境预期因浏览器策略被阻断）
- `outputs/home_visual_closeout_results.json`
- `outputs/cross_page_route_targets_v1.json`
- `outputs/cross_page_runtime_smoke_v1.json`
