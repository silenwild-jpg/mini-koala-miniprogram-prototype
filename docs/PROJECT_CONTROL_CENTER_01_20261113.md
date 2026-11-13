# 迷你考拉仓｜项目控制中心

**版本日期：2026-11-13**  
**用途：** 本文件是项目任务、版本、规则与验收状态的唯一入口；详细页面规则和历史证据保留在专业子文档中，不在多个清单重复维护。  
**当前阶段：** Web/HTML 产品原型验证、功能演示与视觉签收；不是微信原生生产上线验收。

## 1. 原RC2签收来源与当前主线整合候选

| 项目 | 当前事实 |
|---|---|
| 主候选 PR | [#176 RC2-CLEAN-MIGRATION-01](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/176) |
| 候选分支 | `integration/rc2-clean-migration-01-20261113` |
| 已通过自动化验收的 SHA | `41a8a079eb48049e1060512bddf71c226bfd3738` |
| 本轮审计前main治理SHA（2026-11-13） | `bc6f577d827ae4257370c763625f52e0e2fd02c9`（PR #198已归并；后续以GitHub实时main为准） |
| PR API 当前报告的 base SHA | `274c5110aa18af7ed71d92533ab126ebbbd11f75` |
| PR 状态 | Draft / MAIN MERGE HOLD，演示版本已签收但未合并 |
| 自动化门禁 | PASS（375/390、浏览器、促销/生命周期、预约/快捷下单/O01） |
| 正式演示准入 | DEMO READY（仅限SHA `41a8a079...`） |
| 在线演示部署 | NOT VERIFIED；未核实可访问的对应版本站点 |
| 生产小程序准入 | HOLD；微信原生/后端/真实支付与法务尚未验收 |
| 人工视觉/UAT | PASS（用户于2026-11-13明确签收此SHA） |
| 新整合候选分支 | `integration/rc2-mainline-integration-01-20261113` |
| 新整合候选SHA | `d5a4ff63e2b0cdcffb2e5be4c4e710b61497ae95`（PR #200 QA稳定性修复） |
| 新整合候选自动化验收 | PASS；[Run #43452015757](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43452015757)；QUICK图片18/18、S01滚动双尺寸0偏移 |
| 新整合候选人工视觉/UAT | **PASS / USER SIGNED**：2026-11-13用户明确签收 `d5a4ff63e2b0cdcffb2e5be4c4e710b61497ae95`；仅限演示用途 |
| 主线合并/正式部署 | **合并准备已授权，实际业务合并和部署仍未授权、未执行**；Netlify旧RC1预览隔离待核实 |

**重要：** PR #176 的自动化与人工签收只对 SHA `41a8a079...` 有效。新整合候选SHA `d5a4ff63...` 已有独立Actions PASS，用户于2026-11-13对该精确SHA明确人工签收；原RC2的旧SHA签收记录仍保留。任何后续新SHA均需独立处理签收范围。原PR #176及原分支保持冻结。

## 2. 最新验收证据

- [原RC2 Actions Run #43405346410](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43405346410)：原签收SHA `41a8a079...` 的历史验收。
- [新整合候选 Actions Run #43446189232](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43446189232)：Success，head SHA `281b3de...`，覆盖375/390与促销/生命周期回归。
- [新整合候选审计记录](RC2_MAINLINE_INTEGRATION_01_AUDIT_20261113.md)：main治理并入、促销策略单一事实源、冲突处理和新SHA验收边界。
- [RC2-UAT-P1-FIX-01截图稳定性审计](RC2_UAT_P1_FIX_01_EVIDENCE_20261113.md)：已下载真实ZIP，18/18 QUICK图片、S01滚动归零、修复前后11张重点截图一致。
- [RC2-MAINLINE-MERGE-PREP-01](RC2_MAINLINE_MERGE_PREP_01_20261113.md)：新SHA用户签收、main分叉171路径分类、旧RC1 Netlify预览隔离阻断与Draft业务PR准入条件。
- [375/390 QA Artifact](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43405346410/artifacts/14026423639)：374项证据文件所在包。
- [Review Bundle Artifact](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43405346410/artifacts/14027316228)：隔离评审构建包。
- [上阶段整合候选375/390 QA Artifact（ID 14048525517）](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43446189232/artifacts/14048525517)：历史整合SHA `281b3de...`。
- [当前新整合候选375/390 QA Artifact（ID 14052280343）](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43452015757/artifacts/14052280343)：当前SHA `d5a4ff63...`，全流程PASS。
- [新整合候选Review Bundle（ID 14048590522）](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43446189232/artifacts/14048590522)：新SHA构建包，未部署。

覆盖范围：H01、CAP、ITEMS、S01、S02、S5、M01、BOOKING、QUICK、O01、促销资格/权益、订单生命周期、375×812与390×844。

已验证要点：
- QUICK冷启动选仓、容量自动推导、租期主动确认、门店/城市切换、组合仓进入O01通过。
- BOOKING地址/手机号必填状态、预约日期和本地保存状态通过。
- O01费用、主动协议勾选、待支付状态通过。
- 促销特价仓、租期折扣、现金券、搬运权益、赠送租期在两种视口均通过。
- S5 16种有效状态、6种不完整入口及6条流程检查通过。
- 导航几何、375/390像素曲线检查通过。用户已认可当前候选为正式演示版本；后续底栏活动态图标进一步视觉精修可另起下一版，不反向推翻本SHA整体签收。

2026-11-13用户随后明确批准本SHA作为正式演示版本（[PR #176 签收记录](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/176)）；当前准确状态为 **AUTOMATED QA PASS / VIS-UAT PASS / DEMO READY**。早于签收生成的构建身份文件仍带有 `human_uat_signed_off=false`，这是构建时历史快照，不能覆写原Artifact；以用户后续签收记录作为补充证据。`backend_crm_wechat_verified=false`、`main_merge_allowed=false`、`deployment_allowed=false` 仍有效：未验证线上演示站部署，未完成生产/微信原生条件，也未授权将业务PR #176合并main。

## 3. 当前阶段门禁

### 新整合候选当前状态
- `AUTOMATED QA PASS`：新SHA `d5a4ff63...` 已通过Run #43452015757；QA截图稳定性P1修复并核验通过。
- `MERGE_PREPARATION`：已批准，main业务合并仍HOLD，Netlify旧RC1部署预览隔离尚未核实。
- `HUMAN VISUAL`：新SHA仍待人工签收；旧SHA截图与新版存在11项拍摄状态差异，不作为视觉回退的事实证据。
- `VIS_SIGNED`：**PASS**，用户2026-11-13明确签收完整SHA `d5a4ff63e2b0cdcffb2e5be4c4e710b61497ae95`。
- `MERGED`：仅PR #195合入整合分支；尚未合入main。
- `DEPLOYED`：未部署。

### DEMO READY
需要：
1. 最新候选 SHA 的自动化技术门禁 PASS；
2. 375/390关键页面与流程人工视觉签收；
3. 核心用户任务人工走查并确认无阻断；
4. 演示入口与构建版本身份可追踪。

### PRODUCTION READY
另需真实微信原生能力、后端库存/价格/订单、CRM、真实支付/身份、法务协议、隐私与安全等正式条件。不得与 DEMO READY 混为一谈。

## 4. 演示版本签收后的后续视觉优化清单（不阻断已批准SHA）

1. H01获批母版及首页多状态：检查主视觉、双任务卡、推荐卡、底栏活动态。
2. S01：三筛选、快捷标签、门店卡排序、考拉E存固定运营位、长列表。
3. S02：门店实拍、导航/电话、三选项卡、仓位卡与服务标签。
4. S5：两家推荐门店、仓位卡、考拉E存、无匹配/组合仓/顾问条件、价格极值。
5. M01：新用户、需求/订单/收藏、租后记录。
6. BOOKING/QUICK/O01：预约、快捷下单、主动租期、手机号、协议、支付状态和返回修改。
7. 底栏：H01母版与S01/M01导航图标的活动态最终人工裁定。

## 5. 业务与后端待确认（不阻断原型演示）

| Issue | 内容 | 阶段/责任 |
|---|---|---|
| [#155](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/issues/155) | 正式仓储服务协议与隐私政策正文 | 上线前 P1；业务/法务提供 |
| [#106](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/issues/106) | 36→37个月价格边界、折扣比较价依据 | 业务定价/市场/法务确认 |
| [#132](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/issues/132) | 续租支付契约、身份审核权限 | 以候选当前实现复核；真实服务后端后置 |
| [#137](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/issues/137) | 12/14m³独立房间素材 | 用户已暂缓，不进入当前执行队列 |

## 6. PR / 分支治理快照

截至2026-11-13 GitHub API：
- 最新实查快照（2026-11-13、main SHA `11afd40a005933ff4a48d8b8f89dbb66ef995103`）：**Open PR 125，全部Draft，以main为base 8条**。此前用户分别批准关闭#22/#24/#50和#67/#84/#86/#89（共7条），全部Not merged、原分支保留。[最初130条PR分类](PROJECT_OPS_P1A_PR_INVENTORY_20261113.md)仍保留当时快照，不反向篡改。
- Open Issue：8（含本项目总控#177；原有9个产品/技术Issue中，#148普通用户路径文案未复现、#93历史Runner故障不再复现，已关闭，剩余7个）。
- 最新实查快照：**194条分支**，其中**67条**未被当前Open PR的head/base引用；closed PR、Tag、Actions手动运行和外部部署依赖仍须逐条复核，不能据此删除。这不是可删除名单。[最初180条分支全量分类](PROJECT_OPS_P1B_BRANCH_INVENTORY_20261113.md)仍供历史对照。
- 原48条历史未引用分支的ahead/behind比较属于旧main快照；最新67条未被Open PR直接引用，其中包括近期QA/治理工作包完成后不再被开放PR直接引用的来源分支，**尚不得继承旧48条的可删判断**。见[清理资格第三批](PROJECT_OPS_CLEAN_ELIGIBILITY_03_20261113.md)。
- P1-A2已对10条main目标历史PR与签收RC2和main做**同路径blob SHA**对照；10条均有独有历史资产/内容差异，**目前未裁定任何可不经资料保全即直接关闭的PR**。详见[P1-A2主线PR差异](PROJECT_OPS_P1A2_MAIN_PR_DELTA_20261113.md)。
- P1-B2对49条历史非开放PR引用分支复核closed PR/文件路径及Netlify依赖，其中35条关联已关闭PR；`uat/rc2-pr96-20261110`仍对应Netlify已发布部署，不能误删。详见[P1-B2分支风险](PROJECT_OPS_P1B2_BRANCH_RISK_20261113.md)。
- P1-A3已完成旧PR #50规则冲突标注、#30 CloudBase、#28 Netlify旧站安全知识提取及#35/#36/#47旧QA与当前RC2断言覆盖差异审查，详见[P1-A3知识保全](PROJECT_OPS_P1A3_LEGACY_RULE_DEPLOY_QA_HANDOFF_20261113.md)。
- P1-B3已对`feature/br03-s01-s02`的23份独立资产及`br01-h01-connect-03-isolated`的3份旧桥接文件留存精确blob SHA；旧上海4门店、35容量选项仅为历史演示数据，不直接接入签收RC2，详见[P1-B3旧门店与素材保全](PROJECT_OPS_P1B3_LEGACY_STORE_ASSET_HANDOFF_20261113.md)。
- 当前以main为base的8条Open PR：#176、#47、#36、#35、#33、#30、#28、#26；均为Draft。#22/#24/#50已按用户逐条授权Close（未Merge、源分支保留）。
- **main保护已实际生效**：`protected=true`，Ruleset [`main-protection-demo-first`](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/rules/27195923) `active`，仅保护main，要求PR、禁止强推/删除；必需检查只保留绑定GitHub Actions（`integration_id=15368`）的 `Visual contract and evidence guard`，`strict_required_status_checks_policy=false`。管理员已于2026-11-13修改并经API复读确认。

### 主线PR分类
- #176：当前RC2候选，保留。
- #68：**已合并main**，Squash commit `0c78de7720451692bbd44be8854259b8b6a20dbd`。其中项目控制中心、README、AGENTS、VIS-GUARD机器检查与PR模板已生效。
- #189：**已合并main**，旧RC1预检工作流改为仅手动触发。
- #190：**已合并main**，02D～02K、02N共9条旧Git-Merge工作流移除push自动触发，保留workflow_dispatch、测试脚本和Artifact上传。
- #191：**已合并main**，P1-A4/P1-B4实时增量盘点和控制中心状态同步。
- #192：**已合并main**，P1-D批量工作包协议及Issue模板升级。
- #50：旧PRD文档已完成差异审计和历史知识保全；2026-11-13经用户明确确认已Close，未Merge、原分支保留。
- #47：旧私有预览候选；只保留访问/部署历史证据。
- #36/#35/#33：旧RC2/生命周期/S01来源链；只核查未迁移的独有变更，不整PR合并。
- #30/#28：CloudBase迁移与旧Git CD预检；后续部署架构专题。
- #26：旧S01视觉/业务接线仍保留开放、待独有增量复核。#24/#22：旧视觉纯探索已按用户确认Close、保留源分支，不作为当前母版。

### 当前候选来源链（以构建manifest为准）
来源PR：#156、#157、#158、#159、#160、#161、#163、#165、#166、#167、#168、#169、#172、#173、#174、#175。  
运行时代码来源：#158、#161、#163、#165、#167、#172、#173、#174、#175。  
QA-only来源：#156、#159、#166、#168、#169；附加QA：#162、#170。  
历史RC1来源：#33、#36、#37、#39–#46；#35经人工定向核对；#34/#38已标记退役。  
以上仅是来源追踪，不代表所有PR均需独立合并。

## 7. 项目执行标准

- 默认“综合任务批量执行、阻断项定点确认”：一个任务包内连续完成盘点、裁定、实施、测试、回归、文档与状态更新，不再逐个子任务等待用户发送“继续”。
- 一个阻断项只暂停其直接依赖工作；无关任务继续。
- 已批准规则和冻结视觉母版优先；可替换演示数据用于完整用户路径，不因真实数据缺失阻断前端。
- 真实业务规则未确认时，登记责任方和影响，不伪装为生产政策。
- 删除历史成果、批量关闭PR/删除分支、修改仓库权限/保护、合并main、正式部署必须单独确认。
- 所有验收绑定精确SHA；测试期间禁止并行推送。代码PASS不等于视觉签收。
- 任务状态严格区分：`APPROVED → IMPLEMENTED → TESTED → VIS_SIGNED → MERGED → DEPLOYED`。

## 8. 关键入口

- 项目总控：[PROJECT-OPS-RESET-01 #177](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/issues/177)
- 当前候选：[PR #176](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/176)
- 治理归并：[PR #68（已合并）](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/68)
- main保护：[Ruleset已生效](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/rules/27195923)；[管理员配置与核验](MAIN_PROTECTION_01_20261113.md)
- 当前自动化验收：[Run #43405346410](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43405346410)
- P1-A PR全量审计：[130条PR分类清单](PROJECT_OPS_P1A_PR_INVENTORY_20261113.md)
- P1-B 分支全量审计：[180条分支分类清单](PROJECT_OPS_P1B_BRANCH_INVENTORY_20261113.md)
- P1-A2历史main目标PR独有内容：[10条逐项核对报告](PROJECT_OPS_P1A2_MAIN_PR_DELTA_20261113.md)
- P1-B2未被Open PR引用分支：[49条风险与部署依赖清单](PROJECT_OPS_P1B2_BRANCH_RISK_20261113.md)
- P1-A3旧规则/部署/QA知识保全：[规则与测试覆盖差异](PROJECT_OPS_P1A3_LEGACY_RULE_DEPLOY_QA_HANDOFF_20261113.md)
- P1-B3独立门店/素材源：[BR03旧上海门店与23份资产](PROJECT_OPS_P1B3_LEGACY_STORE_ASSET_HANDOFF_20261113.md)
- QA-LEGACY-RETAIN-01：[19项历史高风险断言独立PASS](QA_LEGACY_RETAIN_01_RESULT_20261113.md)（同签收运行时、仅QA分支追加脚本）
- 清理资格第二批：[历史审计PR #67/#84/#86/#89](PROJECT_OPS_CLEAN_ELIGIBILITY_02_20261113.md)（用户已批准，4条均Closed/Not merged，原分支保留）
- 清理资格第三批：[当前125条开放PR、67条未引用分支与下游依赖及部署核查](PROJECT_OPS_CLEAN_ELIGIBILITY_03_20261113.md)（本次仅审计，不额外关闭或删除）
- 历史QA覆盖对照：[QA-LEGACY-COVERAGE-02](QA_LEGACY_COVERAGE_02_20261113.md)（#124/#135/#145/#122/#109，已覆盖与待补证分离，不重新冻结历史视觉参数）
- QA-S5-DEEPLINK-01：[S5首次/部分/完整需求375/390共6条浏览器PASS](QA_S5_DEEPLINK_01_RESULT_20261113.md)（独立QA [PR #187](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/187)，签收业务运行时未变）
- 旧Netlify RC1预览隔离：[SITE-PREVIEW-ISOLATION-01](SITE_PREVIEW_ISOLATION_01_20261113.md)（旧RC1严格白名单与当前main多出promotion-policy.js不相容；外部站点配置未更改）

### 当前下一步
- 批量工作包协议：[PROJECT-WORK-PACKAGE-PROTOCOL-01](PROJECT_WORK_PACKAGE_PROTOCOL_01_20261113.md)；Issue模板已同步，PR #192已合并，作为后续任务包默认模板。
1. 视觉/UAT签收已完成；保留后续精修清单，不改变本SHA批准状态。
2. Issue #148/#93此前已按证据关闭；#171/#132/#152/#164保留原签收/来源证据与后端待确认项，针对关闭或代码迁移仍须独立裁定。
3. P1-A2/B2、A3/B3、QA-LEGACY-RETAIN-01及P1-E-02已归档；CLEAN-ELIGIBILITY-01/02两批7条历史PR已按用户明确名单Close，原分支保留。[CLEAN-ELIGIBILITY-03](PROJECT_OPS_CLEAN_ELIGIBILITY_03_20261113.md)已确认**已关闭PR #24的head仍被开放PR #25用作base**、已合并PR #140的head仍被开放PR #141用作base，故禁止按已关闭/已合并状态删除来源分支。下一步优先补旧QA脚本覆盖、历史站点依赖/部署版本核验；没有新PR关闭授权不扩展清理范围。
4. `QA-LEGACY-COVERAGE-02`五项历史QA来源对照已完成；后续独立`QA-S5-DEEPLINK-01`已针对**签收SHA不变的运行时**执行6/6真实375/390浏览器测试并生成截图（Run #43435644089 PASS）。旧Netlify RC1仍对治理PR触发不适用的冻结RC1白名单（当前main多出promotion-policy.js），仅记录静态证据与隔离方案，Netlify站点配置未修改。
5. main保护已生效；重复检查已去重、严格分支更新要求已关闭，必需Visual guard仍保留。旧RC1 Netlify预览的失败/待处理状态与GitHub Actions必需检查分开记录，未修改站点配置。
6. 所有业务代码PR#176归并、历史PR批量关闭/分支删除、Netlify部署设置修改均保持独立准入，不自动执行。

