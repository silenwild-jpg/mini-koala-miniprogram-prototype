# UX-PATCH D｜A5+B+C+D1+D2 全站统一回归与真实视觉验收准备（2026-10-14）

## 裁定
**源码级可追溯、候选可供第三方真实验收；不能发布。Release Gate = HOLD。**

### 唯一运行时输入
`Mini_Koala_UX_PATCH_D2_Global_Layout_Actions_Candidate_2026-10-14.zip`，SHA-256 `d23b2da54dafd6b115d1ddec9b4bebb6a0f22436c2c8fa2c2d10bea8446dc27c`。本轮没有修改 D2 原型运行时文件、历史 QA 源码、图片或计价 JS。

## 已实际执行的结果
- ZIP CRC PASS，D2 Manifest 检查 PASS，739 个受管理文件、736 个资源字面引用，0 错误。
- **137 项登记的旧/新测试脚本：127 项无浏览器可执行，46 PASS、81 FAIL；10 项需要浏览器未执行。** D1 对照相同127项：45 PASS、82 FAIL；D2 出现1项 D2 新专项转PASS，且没有 D1 PASS→D2 FAIL。
- 新规则相关已执行脚本：A1.1(7/7)、A2(8/8)、A3(10/10)、A4(11/11)、A5(12/12)、C(10/10)、D1(20/20)、D2(23/23) 均通过。B 旧断言与 D1 共用角标函数冲突仍失败，**不宣称 B 旧脚本 PASS**。
- 90 项其他程序与样式基础检查：JavaScript/CSS 语法检查及包核验89 PASS；旧静态跨页扫描1 FAIL，因把 `window.MINI_KOALA_UXB_TAGS.html()` 误判为 URL；这属于该脚本的解析口径，需修测试。
- 本机 HTTP 服务能返回首页200，但 Chromium 375×812和390×844 **均 `ERR_BLOCKED_BY_ADMINISTRATOR`**，页面真实截图、跨页点击、弹窗、滚动、首卡完整性不能验收。微信真机 **NOT TESTED**。

## 81项失败处理
见 `D_legacy_failures_triage.csv`，初步分组为：旧冻结/字节指纹契约20、与新版文案流程明显冲突9、测试入参和目录问题5、VM/DOM 模拟依赖14、静态扫描误报1、其他尚需独立业务定位32。**这一分类不是81项均已关闭的证明**。保持其历史失败来源，同时对32项未归因和涉及库存、交易、找仓、价格的异常继续列 OPEN；不改业务代码迎合旧断言。

## 第三方验收交接
- `UX_PATCH_D_REAL_BROWSER_ACCEPTANCE_MATRIX.csv`：18个页面/场景×2尺寸，共36项，全部 `PENDING_REAL_BROWSER`。
- `UX_PATCH_D_REAL_BROWSER_FLOW_MATRIX.csv`：12项真实点击跨页验收，全部 `PENDING_REAL_BROWSER`。
- `qa/ux_patch_d_browser_acceptance.py`：HTTP + Chromium 截图初筛，不自动宣称人工 E2E。
- 重点是 S5 首屏完整卡、S2 下移入口、D2 全站底部按钮、H01 左侧定位/居中品牌/右胶囊、S5↔U01↔S02/附近门店返回、价格快照和优惠券核销链路。

## 后续准入条件
1. 第三方在真实 Chromium 双尺寸输出截图/控制台/交互证据；对 P0、P1 修复后复测。
2. 将历史旧断言按用户已批准需求进行契约修订，但保留旧结果，不以绕过报错替代通过。
3. 微信真机/小程序规范单独验收；若只用于演示，也须明确标注未验证能力。
4. Release Gate 持续 HOLD；P2-3 帮助入口延后，不在本轮修复。
