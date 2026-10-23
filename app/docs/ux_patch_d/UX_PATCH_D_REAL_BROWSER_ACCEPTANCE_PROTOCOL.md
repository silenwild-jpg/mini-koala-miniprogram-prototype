# UX-PATCH D｜第三方 Chromium 双尺寸真实验收操作指引

## 唯一输入与门禁
- **以本 ZIP `RELEASE_MANIFEST.json` 与完整 ZIP SHA 为准**，禁止使用早期截图、旧母版或网页生成图代替真实渲染。
- 启动 `python3 -m http.server 4173 --bind 127.0.0.1`（在 `Mini_Koala_H01_Lifestyle_Step03` 目录执行）。
- 浏览器访问 `http://127.0.0.1:4173/prototype/index_visual_v2_7_4_7.html`，或由测试脚本直接访问各 HTML。不要用 `file://`。
- 双视口：375×812 / 390×844，DPR 2、移动触摸仿真、设备语言 zh-CN；优先 Playwright Chromium，也可本地 Chrome 配合开发者工具。
- 截图须包含完整页面与关键弹层；保存 console / network 错误、URL、query 参数和复现步骤。

## 快速启动抓图
可选 `python qa/ux_patch_d_browser_acceptance.py`（需要 `pip install playwright` 与可用 Chromium），生成 `outputs/ux_patch_d_browser/*` 静态页截图/错误日志。**该脚本只是初筛，不自动证明跨页流转 PASS**，需要人工执行 `UX_PATCH_D_REAL_BROWSER_FLOW_MATRIX.csv` 中 12 条旅程。

## 首要 P0 / P1 复核
- H01：左侧定位、中央品牌、微信胶囊互不碰撞；导航图标、活跃态与点击可用。
- S2：8 场景文案单行；三个辅助入口移动到八场景之后且可操作；下移入口不被底栏遮挡。
- S3：24 档位点击即跳转；按**显示的区间上限**分流： `<5.0m³`→S5，`≥5.0m³`→S4，无下一步按钮。
- S4：清空所有数量后仍保留场景/规格，可继续添加；显示的是**单件体积**而不是数量合计；空清单不生成有效推荐。
- S5：首次12个月，返回保留用户指定租期；无四步进度；首屏展示完整第一张有效仓位卡；免费运输权益卡带车辆图标，问号打开轻量弹窗；单仓卡和底部查看推荐直达 U01，组合仓仍走组合方案。
- S01/S02：推荐/距离/服务顶部下拉统一，最近与3km(或用户指定范围)区域低价角标可信；门店标签促销优先，其他弱灰；组合仓显示候选数量和物理间数区别；售罄状态保留。
- U01：返回来源 S5，查看门店详情、同店其他仓位、附近其他门店；移除容量比较冗余；明细尺寸轻量且售价快照不变。
- 全站：正文外边距目标12px，48px高业务CTA、12px圆角、14px起字号、底部安全区；**不应把业务CTA误当作四栏导航**；屏幕不横向溢出、点击范围不重叠、软键盘不遮按钮。
- O01/O02/O03/M01/生命周期：真实价格/押金/管理费/优惠券/锁券/支付状态、续租退租、发票历史正常，展示和实际报价一致。

## 发布门禁/问题表
必须填写 `UX_PATCH_D_REAL_BROWSER_ACCEPTANCE_MATRIX.csv` 的 36 条截图核验与 `UX_PATCH_D_REAL_BROWSER_FLOW_MATRIX.csv` 的 12 条人工联动；屏宽各 18 个页面情景。标注 PASS/FAIL/BLOCKED、截图文件名、复现步骤和问题号。对 P0/P1 先修复再双视口复测；延期 P2-3 单独留档。无完整真实证明则 `release_gate = HOLD`。

当前运行环境在 HTTP 200 下两视口都报 `ERR_BLOCKED_BY_ADMINISTRATOR`，这不是页面运行成功的证据。
