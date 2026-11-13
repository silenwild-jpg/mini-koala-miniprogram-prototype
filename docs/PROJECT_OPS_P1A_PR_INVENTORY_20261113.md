# PROJECT-OPS-RESET-01 / P1-A｜开放 PR 全量分类审计

- 审计日期：2026-11-13；来源：GitHub REST 开放PR完整分页（第1/2页）、[当前项目控制中心](PROJECT_CONTROL_CENTER_01_20261113.md)、PR #176 的 `RC2_CLEAN_MIGRATION_01_MANIFEST`。
- main 审计SHA：`165e521cca6e9453a691c6660d04110538f7fdec`；已签收RC2业务原型PR #176的冻结SHA：`41a8a079eb48049e1060512bddf71c226bfd3738`。
- 开放PR：**130**，Draft：**130**；以main为base：**11**。
- **注意：分类不等于代码已迁移，也不等于PR可直接关闭。** 仅标为`MANIFEST`的来源关系有移植清单的直接支持；`TITLE`为按标题进行的初筛推测。关闭前必须再核对独有变更/证据及其消费者。
- **不得自动处理：** 所有PR保持开放；不得以本报告替代归并或删除授权。

## 分类数量

| 类别 | 数量 |
|---|---:|
| A0-冻结演示版本 | 1 |
| A1-候选运行时来源 | 9 |
| A2-候选QA/门禁来源 | 7 |
| A3-候选中间探索来源 | 2 |
| B1-旧RC1/RC2来源 | 12 |
| C1-部署/站点专题 | 8 |
| C2-文档/规则专题 | 1 |
| D1-页面/视觉/业务迭代 | 85 |
| D2-集成/QA历史记录 | 5 |

## main目标PR（重点复核）

| PR | 本次判断 | 文件级范围 / 建议 |
|---|---|---|
| [#176](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/176) | A0-冻结演示版本 | 当前正式演示候选，禁止动HEAD；保持Draft/禁止归并 |
| [#50](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/50) | C2-文档/规则专题 | 5 docs；旧PRD，优先对照11/13基线；对照主线当前PRD/决策日志后归档 |
| [#47](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/47) | C1-部署/站点专题 | 71 files；含 app、workflow、Netlify；旧预览专用，不整PR归并；保留历史部署证据；后端/部署阶段评估 |
| [#36](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/36) | B1-旧RC1/RC2来源 | 40 files；旧RC2/S01/生命周期；可能有独有脚本；对照独有代码、图源/CI后提归档 |
| [#35](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/35) | B1-旧RC1/RC2来源 | 15 files；生命周期回归；旧RC2 QA；对照独有代码、图源/CI后提归档 |
| [#33](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/33) | B1-旧RC1/RC2来源 | 21 files；S01 R2与RC1兼容；对照独有代码、图源/CI后提归档 |
| [#30](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/30) | C1-部署/站点专题 | 6 files；CloudBase独立部署评估；保留历史部署证据；后端/部署阶段评估 |
| [#28](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/28) | C1-部署/站点专题 | 3 files；旧私有站CD/SSO；保留历史部署证据；后端/部署阶段评估 |
| [#26](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/26) | D1-页面/视觉/业务迭代 | 8 files；旧S01 R2接线；对照已签收RC2及未迁移需求，禁止整PR搬入 |
| [#24](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/24) | D1-页面/视觉/业务迭代 | 3 files；S01独立视觉探索；对照已签收RC2及未迁移需求，禁止整PR搬入 |
| [#22](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/22) | D1-页面/视觉/业务迭代 | 2 docs；S01方向对照；对照已签收RC2及未迁移需求，禁止整PR搬入 |

## 关闭/归档门禁（逐PR）

1. 确认该PR独有功能、测试、文档与素材是否已经存在于已签收RC2 SHA、main或仍需单独迁移。**仅有相似页面/标题不够。**
2. 若为链式PR（base是另一条功能分支），先保留上下游来源图；关闭上游PR前必须确认下游引用依赖及构建来源，禁止批量关闭时破坏追溯关系。
3. 核对来源PR是否还有未来部署、业务协议、原图、手机授权、业务运营配置等尚需后端接手的独有内容。
4. 在PR讨论中记录`保留/已吸收/仅归档/后端待迁移`的证据路径、来源/目标SHA、核查人；获准后方可关闭。关闭不等于删除分支，分支删除另评。

## 全部开放PR登记（按PR号降序）

| PR | 标题 | 目标分支 | 分类 | 后续动作 | 证据 |
|---|---|---|---|---|---|
| [#176](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/176) | [DEMO READY / MAIN HOLD] RC2-CLEAN-MIGRATION-01｜375/390已签收演示版本 | `main` | A0-冻结演示版本 | 保持Draft/禁止归并 | SIGNED+QA |
| [#175](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/175) | [Draft/HOLD] RC2-MERGE-READY-08｜原H01底栏贴图复用于S01/M01的图标与圆角视觉实验 | `isolate/rc2-merge-ready-07-nav-h01-align-20261113` | A1-候选运行时来源 | 已列入RC2来源链；保留对照，不单独归并 | MANIFEST |
| [#174](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/174) | [Draft/HOLD] RC2-MERGE-READY-07｜S01/M01底栏按H01母版对齐、无障碍与375/390门禁 | `isolate/rc2-merge-ready-05-integration-20261113` | A1-候选运行时来源 | 已列入RC2来源链；保留对照，不单独归并 | MANIFEST |
| [#173](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/173) | [Draft/HOLD] RC2-MERGE-READY-05｜BOOKING快捷时间更新与统一候选全站回归 | `isolate/rc2-quick-cap-term-01-20261113` | A1-候选运行时来源 | 已列入RC2来源链；保留对照，不单独归并 | MANIFEST |
| [#172](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/172) | [Draft/P0-HOLD] QUICK-CAP-TERM-01｜选仓自动确认容量、租期仍须主动选择 | `isolate/rc2-motion-merge-gate-01-20261113` | A1-候选运行时来源 | 已列入RC2来源链；保留对照，不单独归并 | MANIFEST |
| [#170](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/170) | [Draft/HOLD] RC2-MERGE-READY-04｜O01/预约/快捷下单双宽证据与WorkBuddy最小移植包 | `isolate/rc2-motion-merge-gate-01-20261113` | A2-候选QA/门禁来源 | 已列入RC2来源链；检查独有QA再归档 | MANIFEST |
| [#169](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/169) | [Draft/HOLD] RC2-MOTION-MERGE-GATE-01｜NAV与MOTION唯一运行时来源及同SHA全站回归 | `isolate/motion-s01-s5-01g-20261113` | A2-候选QA/门禁来源 | 已列入RC2来源链；检查独有QA再归档 | MANIFEST |
| [#168](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/168) | [Draft/HOLD] MOTION-S01-S5-01G｜考拉E存整卡、单门店与无匹配双尺寸补证 | `isolate/motion-s01-s5-01e-20261113` | A2-候选QA/门禁来源 | 已列入RC2来源链；检查独有QA再归档 | MANIFEST |
| [#167](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/167) | [Draft/HOLD] MOTION-S01-S5-01E｜修复地图缺失坐标造成的异常距离与跨页误排序 | `isolate/motion-s01-s5-01d-20261113` | A1-候选运行时来源 | 已列入RC2来源链；保留对照，不单独归并 | MANIFEST |
| [#166](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/166) | [Draft/HOLD] MOTION-S01-S5-01D｜同SHA 375/390 双尺寸交互与视觉验收 | `isolate/motion-s01-s5-01c-20261113` | A2-候选QA/门禁来源 | 已列入RC2来源链；检查独有QA再归档 | MANIFEST |
| [#165](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/165) | [Draft/HOLD] MOTION-S01-S5-01C｜S5地图选点跨页继承与S01距离同源 | `isolate/motion-s01-s5-01b-20261112` | A1-候选运行时来源 | 已列入RC2来源链；保留对照，不单独归并 | MANIFEST |
| [#163](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/163) | [Draft/HOLD] MOTION-S01-S5-01B｜S5地图位置联动与S01微交互隔离修复 | `isolate/nav-vis-unify-01f-20261112` | A1-候选运行时来源 | 已列入RC2来源链；保留对照，不单独归并 | MANIFEST |
| [#162](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/162) | [Draft/HOLD] NAV-VIS-UNIFY-01G｜双尺寸独立视觉终验与778提交归并门禁 | `isolate/nav-vis-unify-01f-20261112` | A2-候选QA/门禁来源 | 已列入RC2来源链；检查独有QA再归档 | MANIFEST |
| [#161](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/161) | [Draft/HOLD] NAV-VIS-UNIFY-01F｜图标比例实际修复与H01三标签B档可读性接线 | `isolate/nav-vis-unify-01e-20261112` | A1-候选运行时来源 | 已列入RC2来源链；保留对照，不单独归并 | MANIFEST |
| [#160](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/160) | [Draft/HOLD] NAV-VIS-UNIFY-01E｜图标视觉比例与H01三标签对比度双档候选 | `isolate/nav-vis-unify-01d-20261112` | A3-候选中间探索来源 | 曾参与RC2来源链；仅留存，不整PR归并 | MANIFEST |
| [#159](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/159) | [Draft/HOLD] NAV-VIS-UNIFY-01D｜底栏双尺寸独立视觉审计及归并门禁 | `isolate/nav-vis-unify-01c-20261112` | A2-候选QA/门禁来源 | 已列入RC2来源链；检查独有QA再归档 | MANIFEST |
| [#158](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/158) | [Draft/HOLD] NAV-VIS-UNIFY-01C｜四入口图标实际接入与H01单槽文字修复 | `isolate/nav-vis-unify-01b-20261112` | A1-候选运行时来源 | 已列入RC2来源链；保留对照，不单独归并 | MANIFEST |
| [#157](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/157) | [Draft/HOLD] NAV-VIS-UNIFY-01B｜四入口双状态SVG候选与H01文字纠偏预览 | `isolate/nav-vis-unify-01-20261112` | A3-候选中间探索来源 | 曾参与RC2来源链；仅留存，不整PR归并 | MANIFEST |
| [#156](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/156) | [Draft/HOLD] NAV-VIS-UNIFY-01｜核对批准底栏与历史图标方案并生成375/390证据 | `isolate/rc2-ux-copy-03-20261112` | A2-候选QA/门禁来源 | 已列入RC2来源链；检查独有QA再归档 | MANIFEST |
| [#154](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/154) | [Draft/HOLD] RC2-UX-COPY-03｜旧RESULT只读状态及协议核验 | `isolate/rc2-ux-demo-copy-02-20261112` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#153](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/153) | [Draft/HOLD] RC2-UX-DEMO-COPY-02｜S5/快捷下单/预约菜单空转修复、仓型素材暂缓 | `isolate/rc2-single-candidate-05-20261112` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#151](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/151) | [Draft/HOLD] RC2-SINGLE-CANDIDATE-05｜导航多源与仓型图片审计、预约弹层去冗余 | `isolate/rc2-single-candidate-04-20261112` | D2-集成/QA历史记录 | 核查未迁移独有门禁，后续归档候选 | TITLE |
| [#150](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/150) | [Draft/HOLD] RC2-SINGLE-CANDIDATE-04｜H01 48px 与取消支付提示定向修复 | `isolate/rc2-single-candidate-03b-20261112` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#149](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/149) | [Draft/HOLD] RC2-SINGLE-CANDIDATE-03B｜S02图源修复后全站同SHA回归 | `fix/rc2-s02-photo-source-01-20261112` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#147](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/147) | [Draft/HOLD] RC2-S02-PHOTO-SOURCE-01｜修复详情页误用门店卡缩略图 | `feature/cap-unit-dual-01-20261112` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#146](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/146) | [Draft/HOLD] RC2-SINGLE-CANDIDATE-03｜无 A/C 的全站规则与375/390隔离验收 | `feature/cap-unit-dual-01-20261112` | D2-集成/QA历史记录 | 核查未迁移独有门禁，后续归档候选 | TITLE |
| [#145](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/145) | [Draft/HOLD] H01-BASELINE-VIS-CHECK-01｜原母版20状态视觉与H01/M01职责审计 | `isolate/rc2-final-vis-signoff-04-20261112` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#141](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/141) | [Draft/HOLD] CAP-UNIT-DUAL-01｜容量㎡/m³输入与S01/S02/S5跨页继承 | `isolate/rc2-public-price-01-20261112` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#135](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/135) | [Draft/NO-GO] RC2-FINAL-GATE-05｜唯一来源门禁、S5必选规则遗漏与S02四档素材审计 | `isolate/rc2-final-vis-signoff-04-20261112` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#134](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/134) | [Draft/HOLD] RC2-FINAL-VIS-SIGNOFF-04｜续租付款结果与客户身份核验隔离 P1 修复 | `isolate/rc2-final-vis-signoff-03-20261112` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#133](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/133) | [Draft/HOLD] VIS-EDITOR-01B｜S01统一候选可视化编辑工作台与真实浏览器验收 | `isolate/vis-system-04b2-20261111` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#131](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/131) | [Draft/HOLD] RC2-FINAL-VIS-SIGNOFF-03｜O03与租后多状态375/390终验、表单及订单一致性 | `isolate/rc2-final-vis-signoff-02-20261112` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#130](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/130) | [Draft/HOLD] RC2-FINAL-VIS-SIGNOFF-02｜375/390长滚动视觉终查、S02仓高2.5m纠偏 | `isolate/rc2-h01-m01-integration-01-20261112` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#129](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/129) | [Draft/HOLD] RC2-H01-M01-INTEGRATION-01｜保留 S01/S02/S5 母版并接入 M01 与 H01 跨页契约 | `isolate/rc2-final-gate-04-20261112` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#128](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/128) | [Draft/HOLD] H01-M01-FLOW-QA-01｜多订单深链、返回恢复与租后全流程门禁 | `isolate/m01-ia-03-20261112` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#127](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/127) | [Draft/HOLD] S5-FINAL-VIS-SIGNOFF-04｜参照S01统一门店/仓位信息层级与首屏密度 | `isolate/rc2-final-visual-review-03-20261112` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#126](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/126) | [Draft/HOLD] M01-IA-03｜我的仓位资产列表、预约需求统一与信息架构收敛 | `isolate/h01-m01-contract-01-20261112` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#125](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/125) | [Draft/HOLD] H01-M01-CONTRACT-01｜统一待办状态、三小时支付恢复与租后契约 | `integration/h01-single-candidate-01-20261111` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#124](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/124) | [Draft/NO-GO] RC2-FINAL-GATE-04｜统一候选正式归并门禁与未签收源归属清单 | `isolate/rc2-final-visual-review-03-20261112` | D2-集成/QA历史记录 | 核查未迁移独有门禁，后续归档候选 | TITLE |
| [#122](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/122) | [Draft/HOLD] RC2-FINAL-VISUAL-REVIEW-03｜H01/S01/S02/S5完整滚动与多状态中文视觉审计 | `isolate/vis-system-04b2-20261111` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#121](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/121) | [Draft/HOLD] VIS-SYSTEM-04B2｜中文字体375/390实际页面验收与布局防回退 | `isolate/vis-system-04b1-20261111` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#120](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/120) | [Draft/HOLD] VIS-SYSTEM-04B1｜四页同名标签中央分类归一及五城回归 | `isolate/vis-system-04b-20261111` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#119](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/119) | [Draft/HOLD] VIS-SYSTEM-04B｜四页标签与价格语义统一（保留视觉母版） | `isolate/price-integer-integration-02-20261111` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#118](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/118) | [Draft/HOLD] PRICE-INTEGER-INTEGRATION-02｜H01/S01/S02/S5四页权威源集成与同SHA回归 | `isolate/price-integer-contract-01-20261111` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#117](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/117) | [Draft/HOLD] PRICE-INTEGER-CONTRACT-01｜整元折后月租×租期、组合仓、优惠券与首次应付同源 | `isolate/s5-final-rebase-01-20261111` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#116](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/116) | [Draft/HOLD][H01 ONLY] H01-SINGLE-CANDIDATE-01｜首页多状态唯一候选与最终视觉门禁 | `feat/h01-order-payment-3h-20261111` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#115](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/115) | [Draft/HOLD][H01 ONLY] H01-VIS-GATE-07｜阶段文案、入口收敛与留白终审 | `feat/h01-identity-lock-gate-05-20261111` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#114](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/114) | [Draft/HOLD][H01 ONLY] H01-STATE-VIS-RESTORE-05｜身份演示与一键开锁入口（不开发蓝牙） | `feat/h01-afterpay-ble-deposit-help-20261111` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#113](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/113) | [Draft/HOLD][H01] H01-STATE-VIS-RESTORE-04｜蓝牙开锁资格、门店导航、退押金与阶段帮助 | `feat/h01-state-vis-restore-03-20261111` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#112](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/112) | [Draft/HOLD][H01 ONLY] H01-STATE-VIS-RESTORE-03｜租后服务直达与18状态双尺寸验收 | `feat/h01-state-vis-restore-02-20261111` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#111](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/111) | [Draft][VIS-SYSTEM-01] S01采用用户参考图三分区布局｜375/390已回归 | `feature/s01-vis-decision-02-20261111` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#110](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/110) | [Draft/HOLD][H01 ONLY] H01-STATE-VIS-RESTORE-02｜任务态视觉收敛与字段修复 | `audit/h01-state-vis-restore-01-20261111` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#109](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/109) | [Draft/HOLD] H01-STATE-VIS-RESTORE-01｜首页母版与17状态真实截图审计（不涉及S5） | `feat/h01-order-payment-3h-20261111` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#108](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/108) | [Draft/HOLD] M01-REBASELINE-02｜租后子页统一、订单状态门禁及375/390多状态回归 | `feature/m01-rebaseline-01-20261111` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#107](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/107) | [Draft/HOLD] RC2-H01-ORDER-S5-INTEGRATION-01｜三模式首页、3小时支付与最新S5隔离整合 | `refactor/rc2-ux-quality-rebase-03-20261111` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#105](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/105) | [Draft/HOLD] H01-ORDER-TIMER-01｜待支付订单三小时倒计时及超时重下单 | `feat/h01-state-implement-01-20261111` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#104](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/104) | [Draft/HOLD] S02-FIX-01｜服务默认可见、容量不足改入口、44/48px触控与组合仓分层 | `integration/rc2-rebaseline-01-20261110` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#103](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/103) | [Draft/HOLD] M01-REBASELINE-01｜我的页面业务恢复、状态主任务与375/390隔离审查 | `integration/rc2-rebaseline-01-20261110` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#102](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/102) | [EXPERIMENT / HOLD] S01-UX-REFINE-05｜需求状态栏与匹配仓位双方案视觉探索 | `feature/s01-vis-decision-02-20261111` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#101](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/101) | [Draft/S5-FINAL-REBASE-01] S5需求合并、双门店单仓推荐与E存固定服务位 | `integration/rc2-rebaseline-01-20261110` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#100](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/100) | [Draft/HOLD] H01-STATE-IMPLEMENT-01｜首页三模式共享状态接线与租后入口 | `integration/rc2-rebaseline-01-20261110` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#99](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/99) | [Draft/HOLD] S01-VIS-DECISION-02｜平面门店卡、公开价排序、吸顶筛选与无结果双兜底 | `refactor/rc2-ux-quality-rebase-03-20261111` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#98](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/98) | [Draft/HOLD] S5已集中重构｜单行需求＋两店单仓＋考拉E存，无任何对比 | `integration/rc2-rebaseline-01-20261110` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#96](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/96) | [Draft/HOLD] RC2 P1集中修复已归并候选并发布UAT｜新版SHA核验PASS，视觉终签仍待定 | `isolate/ux-audit-gate-03-nav-decision-20261109` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#95](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/95) | [Draft/UX-GATE] UX-AUDIT-GATE-03｜一级导航、S01回流与S5缺需求顺序 | `isolate/rc2-candidate-delta-02-s5-native-20261105` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#92](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/92) | [Draft/ASSET-HOLD] UNIT-IMAGE-REBUILD-01-R4C｜独立房间图片交付门禁与物理校验 | `isolate/rc2-single-candidate-01-20261104` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#91](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/91) | [Draft/HOLD] RC2-CANDIDATE-DELTA-02｜S5原生自然流、旧DOM清理及375/390七态回归 | `isolate/rc2-final-vis-delta-01-20261104` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#90](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/90) | [Draft/视觉纠偏] RC2-FINAL-VIS-DELTA-01｜H01次入口可见文案和S01未选需求提示375/390 | `isolate/rc2-single-candidate-01-20261104` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#89](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/89) | [Audit/NO-GO] RC2-SINGLE-CANDIDATE-02｜四页375/390终审与归并门禁 | `isolate/rc2-single-candidate-01-20261104` | D2-集成/QA历史记录 | 核查未迁移独有门禁，后续归档候选 | TITLE |
| [#88](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/88) | [Draft/Integrated QA HOLD] RC2-SINGLE-CANDIDATE-01｜H01 #77 · S01 #81 · S02 #64 · S5 #85 统一源码候选 | `isolate/rc2-vis-p1-close-01-20261104` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#87](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/87) | [Audit/准入HOLD] RC2-UAT-RELEASE-READY-01｜候选SHA锁定、Netlify SSO与版本差异、内部试用矩阵 | `isolate/rc2-vis-p1-close-01-20261104` | C1-部署/站点专题 | 保留历史部署证据；后端/部署阶段评估 | TITLE+FILES |
| [#86](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/86) | [Audit/NO-GO] RC2-FINAL-GATE-01｜视觉终签、私有站UAT准入与main归并门禁 | `isolate/rc2-vis-p1-close-01-20261104` | C1-部署/站点专题 | 保留历史部署证据；后端/部署阶段评估 | TITLE+FILES |
| [#85](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/85) | [Draft/技术PASS·全站视觉HOLD] RC2-VIS-P1-CLOSE-01｜S01滚动补证＋S5租期/单卡留白 | `isolate/rc2-s01-recommend-03-20261104` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#84](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/84) | [Audit/NO-GO] RC2-FINAL-VIS-SIGNOFF-01｜四页375/390人工视觉与异常态终验门禁 | `isolate/rc2-s01-recommend-03-20261104` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#83](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/83) | [Draft/HOLD] S5-LAYOUT-CLEANUP-02｜双卡同构、原生宽度与旧节点清理 | `isolate/rc2-s5-layout-close-01-20261104` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#82](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/82) | [Draft/HOLD] RC2-FINAL-INTEGRATION-02｜H01+S01+S5单一候选与双尺寸归并门禁 | `isolate/h01-ux-review-03a-headline-375390-20261104` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#81](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/81) | [Draft/HOLD] S01-VIS-RESTORE-01｜原生375/390高保真重建、旧缩放清理与视觉/业务双门禁 | `isolate/s01-card-layout-estore-slot-20261104` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#80](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/80) | [Draft/技术PASS·视觉HOLD] RC2-S01-RECOMMEND-03｜第三位E存与第四位紧凑卡双尺寸终验 | `audit/rc2-final-integration-01-20261104` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#79](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/79) | [Draft/NO-GO] RC2-FINAL-INTEGRATION-01｜统一候选四页双尺寸核验与历史规则回退修复 | `isolate/s5-store-card-align-02-20261104` | D2-集成/QA历史记录 | 核查未迁移独有门禁，后续归档候选 | TITLE |
| [#78](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/78) | [Draft/HOLD] RC2-S5-LAYOUT-CLOSE-01｜租期摘要、双横图推荐与视觉残余收口 | `preview/rc2-r2-private-20261103` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#77](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/77) | [Draft/HOLD] H01-UX-REVIEW-03A｜精简推荐标题行、距离最近角标及375/390截图终验 | `isolate/h01-ux-review-02-fivecity-state-photo-20261104` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#76](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/76) | [Draft/HOLD] S01-STORE-CARD-SLOT-04｜第三位固定考拉E存、四位后横图紧凑卡及红框精简 | `isolate/s01-ux-review-03-nine-state-visual-mergeprep-20261104` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#75](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/75) | [Draft/HOLD] S5-STORE-CARD-ALIGN-02｜S01/S02共享字段、区域推荐回流、双店对比与375/390终验 | `isolate/s5-store-card-align-01-20261104` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#74](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/74) | [Draft/HOLD] RC2-S5-LAYOUT-CLOSE-01｜租期摘要、双实拍横幅、价格同行及全站文案收口 | `isolate/rc2-final-admission-01-20261103` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#73](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/73) | [Draft/HOLD] H01-UX-REVIEW-02｜五城推荐、门店实拍映射与双尺寸状态回归 | `isolate/rc2-final-admission-01-20261103` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#72](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/72) | [Draft/HOLD] S01-UX-REVIEW-03｜九态边界回归、紧凑卡真实视觉与RC2归并清单 | `isolate/s01-ux-review-02-compact-state-20261103` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#71](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/71) | [Draft/HOLD] S5-STORE-CARD-ALIGN-01｜两店同构S01门店卡、每店双仓位与双尺寸7状态验收 | `isolate/rc2-s5-final-01-20261103` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#70](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/70) | [Draft/HOLD] S01-UX-REVIEW-02｜前两家完整、第三家起紧凑直达S02与多状态回归 | `isolate/rc2-s5-final-01-20261103` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#69](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/69) | [Draft/HOLD] RC2-FINAL-ADMISSION-01｜统一可追踪构建、S02视觉对照与全链路准入 | `preview/rc2-r2-private-20261103` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#67](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/67) | [Audit/HOLD] RC2-FINAL-MERGE-02｜S01视觉母版差异与全站人工准入裁决 | `isolate/rc2-s5-final-01-20261103` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#66](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/66) | [Draft/HOLD] RC2 S5唯一候选｜#61/#62/#65依赖归并前终验＋视觉门禁 | `isolate/s5-ux-close-01-20261103` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#65](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/65) | [Draft/HOLD] S5-UX-CLOSE-01｜真实目录状态适配、顾问去重与双尺寸归并门禁 | `isolate/s5-ux-review-03-20261103` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#64](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/64) | [Draft/HOLD] S02-CENTRAL-INTEGRATION-01｜历史评审功能接入中央真实页面 | `isolate/rc2-uat-baseline-01-20261103` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#63](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/63) | [HOLD] RC2-UAT-BASELINE-01｜中央S5入口核验、四档容量资源与全站视觉分段验收 | `preview/rc2-r2-private-20261103` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#62](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/62) | [Draft/HOLD] S5-UX-REVIEW-03｜七状态真实浏览器回归与双尺寸视觉防漂移门禁 | `isolate/s5-ux-review-02-20261103` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#61](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/61) | [Draft/HOLD] S5-UX-REVIEW-02｜条件顾问区、七状态展示与双尺寸回归 | `isolate/unit-image-rebuild-01-r3-20261103` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#60](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/60) | [Draft/HOLD] S02-UX-REVIEW-05｜六场景375/390浏览器验收与定向修复 | `preview/rc2-r2-private-20261103` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#59](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/59) | [Draft/HOLD] UNIT-IMAGE-REBUILD-01-R3｜四档仓位图片接入、2.5米高度规格与双尺寸待验 | `isolate/rc2-vis-integration-01-gate-20261103` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#58](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/58) | [QA PASS / VIS HOLD] RC2-VIS-INTEGRATION-04｜32组真实回归通过、P1定向修复与视觉待终签 | `isolate/rc2-store-image-map-01-20261103` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#57](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/57) | [Draft] RC2-STORE-IMAGE-MAP-01｜12组用户实拍精修与H01/S01/S02同ID映射 | `isolate/rc2-structure-restore-s01-20261103` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#56](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/56) | [Draft/HOLD] RC2 S01缺失搜索/底栏/筛选/门店列表基础结构恢复 | `isolate/proto-rule-restore-09-private-rc2-review-candidate-20261103` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#55](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/55) | [Draft/HOLD] PROTO-RULE-RESTORE-09｜RC2私有评审候选与访问门禁 | `isolate/proto-rule-restore-08-same-state-private-uat-20261103` | C1-部署/站点专题 | 保留历史部署证据；后端/部署阶段评估 | TITLE+FILES |
| [#54](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/54) | [Draft/HOLD] PROTO-RULE-RESTORE-08｜S01原图登记、H01/S01同城视觉与私有站验收 | `isolate/proto-rule-restore-07-visual-uat-gate-20261103` | C1-部署/站点专题 | 保留历史部署证据；后端/部署阶段评估 | TITLE+FILES |
| [#53](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/53) | [Draft/HOLD] PROTO-RULE-RESTORE-07｜H01/S01逐区视觉审计及内部试用准入 | `isolate/proto-rule-restore-06-single-s01-hifi-20261103` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#52](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/52) | [Draft/HOLD] PROTO-RULE-RESTORE-06｜H01同源与S01唯一高保真入口 | `isolate/proto-rule-restore-05-audit-20261103` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#51](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/51) | [Draft/HOLD] PROTO-RULE-RESTORE-05｜全站规则一致性与高保真视觉验收门禁 | `isolate/proto-rule-restore-04-legacy-u01-and-audit-20261103` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#50](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/50) | [Draft / Docs only] PRD-BASELINE-01｜迷你考拉仓产品需求基准 V1.0 | `main` | C2-文档/规则专题 | 对照主线当前PRD/决策日志后归档 | TITLE |
| [#49](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/49) | [Draft/HOLD] PROTO-RULE-RESTORE-04｜三筛选视觉复核、U01外链与体验差异收口 | `isolate/proto-rule-restore-03-three-filters-no-u01-20261103` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#48](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/48) | [Draft/HOLD] PROTO-RULE-RESTORE-03｜S01三筛选恢复与U01删除收口 | `preview/rc2-r2-private-20261103` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#47](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/47) | [Draft / Preview only] RC2+UX-R2 私有在线评审（保留 RC1，不合并） | `main` | C1-部署/站点专题 | 保留历史部署证据；后端/部署阶段评估 | TITLE+FILES |
| [#46](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/46) | [Draft/HOLD] RC2-MERGE-PREP-14｜S01 导航触达区域定向修复与双尺寸验证 | `isolate/rc2-merge-prep-10-order-review-hifi-gate-20261102` | B1-旧RC1/RC2来源 | 对照独有代码、图源/CI后提归档 | MANIFEST |
| [#45](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/45) | [Draft/HOLD] RC2-MERGE-PREP-10｜O03/M01 用户界面双尺寸 PASS · 候选10 ZIP交付 | `isolate/rc2-merge-prep-09-unified-rc2-demo-20261102` | B1-旧RC1/RC2来源 | 对照独有代码、图源/CI后提归档 | MANIFEST |
| [#44](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/44) | [Draft/HOLD] RC2-MERGE-PREP-09｜单一 RC2 隔离演示 ZIP 实际验收 PASS · 正式归并 HOLD | `isolate/rc2-merge-prep-08-distance-sort-visual-gate-20261102` | B1-旧RC1/RC2来源 | 对照独有代码、图源/CI后提归档 | MANIFEST |
| [#43](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/43) | [Draft/HOLD] RC2-MERGE-PREP-08｜距离排序 375/390 PASS · RC2 归并准入 HOLD | `isolate/rc2-merge-prep-07-s01-price-distance-gate-20261102` | B1-旧RC1/RC2来源 | 对照独有代码、图源/CI后提归档 | MANIFEST |
| [#42](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/42) | [Draft/HOLD] RC2-MERGE-PREP-07｜S01 整期价+演示公里数 · 双尺寸与业务回归 PASS | `isolate/rc2-merge-prep-06-return-spec-edge-visual-20261102` | B1-旧RC1/RC2来源 | 对照独有代码、图源/CI后提归档 | MANIFEST |
| [#41](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/41) | [Draft/HOLD] RC2-MERGE-PREP-06｜S01/S02 需求回流、物品规格与极值、双尺寸视觉诊断 | `isolate/rc2-merge-prep-05-items-scenes-return-20261102` | B1-旧RC1/RC2来源 | 对照独有代码、图源/CI后提归档 | MANIFEST |
| [#40](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/40) | [Draft/HOLD] RC2-MERGE-PREP-05｜物品、场景与返回修改 375/390 全链路回归 | `isolate/rc2-merge-prep-04-without-hifi06-20261102` | B1-旧RC1/RC2来源 | 对照独有代码、图源/CI后提归档 | MANIFEST |
| [#39](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/39) | [Draft/HOLD] RC2-MERGE-PREP-04｜废弃 HIFI-06，CAP/ITEMS→S5 双尺寸回归 PASS | `isolate/rc2-merge-prep-02-s01-fourfilters-h01-gate-20261102` | B1-旧RC1/RC2来源 | 对照独有代码、图源/CI后提归档 | MANIFEST |
| [#37](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/37) | [Draft/HOLD] RC2-MERGE-PREP-02｜S01 四筛选双尺寸 PASS · H01 原件及发布 HOLD | `isolate/rc2-merge-prep-01-visual-plus-lifecycle-20261102` | B1-旧RC1/RC2来源 | 对照独有代码、图源/CI后提归档 | MANIFEST |
| [#36](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/36) | [Draft/HOLD] RC2-MERGE-PREP-01｜PR33 S01 A/R2 + PR34 路由参考 + PR35 租后隔离集成 | `main` | B1-旧RC1/RC2来源 | 对照独有代码、图源/CI后提归档 | MANIFEST |
| [#35](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/35) | [Draft] RC2-RULE-FIX-01D｜375/390 全链路隔离回归 PASS · 正式归并 HOLD | `main` | B1-旧RC1/RC2来源 | 对照独有代码、图源/CI后提归档 | MANIFEST |
| [#33](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/33) | [Draft] PROTO-MERGE-02B｜S01 A/R2 隔离接收、RC1-P1 S5 兼容与 375/390 主链回归 | `main` | B1-旧RC1/RC2来源 | 对照独有代码、图源/CI后提归档 | MANIFEST |
| [#30](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/30) | [Draft] DEPLOY-MIGRATE-01｜CloudBase 国内私有评审迁移审计与安全最小探针 | `main` | C1-部署/站点专题 | 保留历史部署证据；后端/部署阶段评估 | TITLE+FILES |
| [#29](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/29) | [Draft] SITE-CONNECT-02｜私有访问诊断与375/390静态部署包浏览器验收 | `ops/site-connect-01-protected-cd-20261029` | C1-部署/站点专题 | 保留历史部署证据；后端/部署阶段评估 | TITLE+FILES |
| [#28](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/28) | [Draft] SITE-CONNECT-01｜私有评审站 Git CD 预检与 SSO 访问门禁 | `main` | C1-部署/站点专题 | 保留历史部署证据；后端/部署阶段评估 | TITLE+FILES |
| [#27](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/27) | [Draft] VIS-REBUILD-03C｜R2 A 母版内容完整性、三栏筛选与双尺寸回归 | `visual/vis-rebuild-03b-r2-isolated-binding-20261028` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#26](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/26) | [Draft] VIS-REBUILD-03B｜R2 获批 S01 母版与 MK/SIM 真实业务隔离接线 | `main` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#25](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/25) | [Draft] VIS-REBUILD-03A-R2｜S01 方案 A 逐元素静态视觉精修及量化验收 | `visual/vis-rebuild-03a-r1-pixel-faithful-20261028` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#24](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/24) | [Draft] VIS-REBUILD-03A-R1｜S01 按获批 A 原图重建独立静态页面（白底/演示公里数） | `main` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
| [#22](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/22) | [Draft] VIS-REBUILD-01/02｜RC1业务冻结及S01三方向同状态视觉候选 | `main` | D1-页面/视觉/业务迭代 | 对照已签收RC2及未迁移需求，禁止整PR搬入 | TITLE |
