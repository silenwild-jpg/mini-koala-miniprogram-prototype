# RC2-CLEAN-MIGRATION-02I｜统一回归通过与 S5 极值压力补测

日期：2026-11-13  
PR：#176（Draft / HOLD）  
本轮已验证代码 SHA：`0ca9914d76a1c42a74ce7508167000d18d6dc4f0`（随后仅有文档更新提交；未改动被测运行时代码）

## 1. 统一回归结果

GitHub Actions：[RC2 CLEAN MIGRATION 01 #43376661491](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43376661491)

- workflow conclusion：`success`
- job：`integrated-375-390` — `success`
- 375×812 与 390×844：PASS
- 构建包来源与源文件 SHA 一致性：PASS
- H01 首页多状态、底部导航、图片曲线像素与导航触达：PASS
- CAP / 按物品估算 / S01 / S02：PASS
- S02 交通路线 tab、地图占位、四种出行方式选中态、高德 URL 生成：PASS
- S5 推荐状态、排序、定位来源、修改需求返回：PASS
- M01 资产、历史订单、续租、支付状态、发票、身份与退租流程：PASS
- BOOKING、QUICK、O01 费用、协议阻断、待支付流程：PASS
- JavaScript 错误与页面横向溢出断言：PASS（以各脚本报告为准）

## 2. S5 极值压力补测

新增脚本：`scripts/verify_s5_extreme_content_01_browser.cjs`，纳入统一 workflow，触发路径也已登记。

测试仅修改隔离浏览器中的演示 fixture，不改产品运行代码、正式价格规则或库存数据。

| 测试 | 375px | 390px |
|---|---|---|
| 超长门店名称保留完整 DOM 文本 | PASS | PASS |
| 超长服务标签保留完整 DOM 文本并视觉省略 | PASS | PASS |
| 促销标签优先于服务标签、标签总数不超过 2 | PASS | PASS |
| 极大整期价格触发 extreme 自适应字号 | PASS | PASS |
| 价格无裁切 | PASS | PASS |
| 价格与购买 CTA 不重叠 | PASS | PASS |
| 月租公式留在价格列 | PASS | PASS |
| CTA 保持至少 48px 高度 | PASS | PASS |
| 页面横向溢出 | 0px | 0px |

运行日志明确输出：
- `S5_EXTREME_CONTENT_PASS {"width":375,...}`
- `S5_EXTREME_CONTENT_PASS {"width":390,...}`
- `S5_EXTREME_CONTENT_375_390_PASS`（包含长门店名、长服务标签与极大整期价格）

说明：已补充长服务标签与促销标签排序/数量组合；长促销标签本身并非现行运营标签类型（当前促销标签为固定短枚举），因此没有构造不存在的长促销文案。此结论不外推为所有其他页面文案均通过。

## 3. 测试异常与处置

- 前一版极值测试因原型清理机制从测试字符串中移除了“测试”二字，导致测试期望值与实际 DOM 文本不一致。该异常是 fixture 文本被清理，不是产品布局缺陷。
- 将 fixture 改为不含清理保留词的长名称后，375/390 极值测试通过。后续再加入长服务标签、促销标签优先级与两标签上限断言，并在 #43376661491 中通过。
- 另一次测试代码将 `window.open` stub 放在外层页面，未覆盖应用 iframe；已将 stub 和 URL 读取移入正确的 app iframe，S02 路线交互在本轮统一回归通过。
- 较早的失败/取消 run 不作为本轮候选结论；以本文件所列成功 SHA 与 run 为准。

## 4. 产物

本轮生成且未过期：
- `RC2-CLEAN-MIGRATION-01-UNIFIED-375-390`（约 30.7 MB）
- `RC2-CLEAN-MIGRATION-01-REVIEW-BUNDLE`（约 35.7 MB）

可从 [Actions run #43376187856](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43376187856) 的 Artifacts 区下载。构建包仍是内部评审候选，不等于线上部署版本。

## 5. 当前门禁裁定

- 自动化 375/390 回归：`PASS`
- S5 长门店名/长服务标签/大额价格极值测试：`PASS`
- 全站人工视觉终签：`NOT_SIGNED`
- 内部 UAT：`NOT_ADMITTED`
- 部署授权：`NOT_GRANTED`
- main 合并：`HOLD`
- PR #176：`OPEN / DRAFT`

不自动部署、不切换 Netlify alias、不调整访问权限、不合并 main。

## 6. 下一步

1. 人工逐屏复核统一评审包，重点检查 S02 交通路线区域、S5 超长标题与价格、M01 续租/退租详情、O01 费用和协议区域。
2. 当前 S5 极值样本已覆盖长服务标签、促销优先级及双标签上限；如后续运营引入新的促销标签类型，再按真实标签词表补测。
3. 由产品负责人明确是否授权内部 UAT。授权前不发布候选包。
4. UAT 应核验线上 `rc2-uat-version.json` 的 SHA/manifest 与本候选完全一致，且确认受邀用户登录及未授权访问阻断。
