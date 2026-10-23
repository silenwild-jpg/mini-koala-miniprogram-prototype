# VIS-06A/B｜统一工作基线与 H01/M01 冲突定向收口

日期：2026-10-14；性质：受控集成候选，不是正式母版；Release Gate：**HOLD**。

## 1. 唯一事实输入

- 基底：`Mini_Koala_EST_VIS_09_Full45_Actual_Merge_Candidate_2026-10-14.zip`，SHA `96d868ca47e0f767e6e33f82583a3dbbfca0a9fc6cf7f4e9543d039170910e22`（由用户上传 EST-VIS-10 中内嵌取得）。
- M01 差异参考：`Mini_Koala_VIS05_Batch1_M01_Uploaded_Branch_Candidate_2026-10-14.zip`，SHA `fa815dc375a913f42d2d6a7d7950d63e9fdb41669cb3d68aeecc915f5a14c5bb`；作为只读来源，不整包叠加。
- H01 更早参考：SHA `66d766faf6d90c72c321de0c7ca9cb4da265bad81f48d64e659d2bf91eb499c8`；EST09 H01 具有后续截图布局修复，**不回退**。
- `5046f30c…` 的后续截图布局版原始 ZIP 未单独取得，不把它当作本次亲自验收输入；只以 EST09 实际源码为准。

## 2. 冲突核对与裁定

| 文件/范围 | 比较事实 | 实施裁定 | 验证口径 |
|---|---|---|---|
| M01 HTML | 两分支只差一个外部 CSS 引用的位置及文件名 | **保留 EST09 HTML 不变**，仍引用 `mk-v3-page-m01-shell-trial.css` | before/after SHA 必须相同 |
| M01 CSS | EST09 单一作用域 CSS；旧试装 CSS 有 17px 标题、找仓放大镜、抽屉安全区等细节 | 仅改 EST09 的既有 CSS：17/24px 标题、放大镜、底导最小高度/点击行为、服务抽屉滚动与安全区、48px 关闭按钮、Toast 底导避让 | CSS 解析无错；不能复制第二套 CSS 或旧 CSS 原文件 |
| H01 首页 | EST09 已有 `@layer mk-v3` 下推荐卡价格行、单位、`起` 对齐与布局修复 | **H01 全文件原样保持**，不带入 66d 旧实现 | H01 文件 SHA 不变；原 H01 推荐卡专项逻辑测试通过 |
| EST/ITEM 估算链 | S2–S5 视觉、45图 40 ID 51规格和映射已在 EST09 | 保持全部原文件不变 | EST45 204 用例通过；无新增重复资源 |
| 全站外壳 | 29 页 + 6 核心页样式已接入 | 不二次挂载、不整包替换 | 源码逐文件 SHA 与 EST09 对照，仅 M01 CSS 为运行时变更 |
| Q01/C02 帮助 P2-3 | 已裁定延期 | 不变更任何帮助入口/业务脚本 | OPEN_ISSUES 继续标延期 |

## 3. 本次修改白名单

唯一运行时文件：`prototype/mk-v3-page-m01-shell-trial.css`，SHA `5a895086a9d4d3b04c4edb498bd640c31de8387c332a0bba1788783d97d5665d` → `84930d23f70a9b4f98fc28c085156d2e78953dd98995d0ddeda84c83a0601939`。M01 HTML、H01 HTML、所有脚本、45图素材、29页外壳及 6 核心页 CSS 均未修改。未新增第二套 M01 样式。其余新增文件是本次任务的来源、差异、遗留文档，Manifest 按候选重新计算。

## 4. 静态/逻辑验收

- CSS 语法 `tinycss2`：0 条顶层解析错误（不等同浏览器计算样式）。
- 运行时仅上述 M01 CSS 不同：源码哈希对照通过，H01/M01 HTML 字节未变。
- S1 13/13、S2 14/14、S4 30/30、P1 12/12 PASS；H01 推荐卡专项 PASS；EST45 40 ID、51 规格、45 图、204 用例 PASS。
- S3 为 **17/18 FAIL**：旧的“S2 keep outside P1 settlement function/C02 transform reset”静态 SHA 契约不符；在 EST09 输入上单独复现同样失败，属于继承问题。本次不放宽断言。
- 包内 `check_package.py`、重新解包校验及 ZIP SHA 结果在任务交接证据中登记。
- 按用户已批准的 VIS-06 阶段顺序，**不运行真实 HTTP/Chromium 双尺寸验收**，亦未执行微信真机/原生组件测试；本候选不能标记视觉 E2E PASS。

## 5. 下一阶段入口

`VIS-06C｜全站内容与组件视觉收口`：先 S01/S02/U01，后交易 Q01/C02/O01–O03，再 M01 资产与生命周期，最后辅助业务。以此候选为输入、独立分支受控改动。正式 E2E 在 VIS-06F 统一进行；到那时重新检查 M01 两尺寸和 H01 三卡。Release Gate 继续 HOLD。
