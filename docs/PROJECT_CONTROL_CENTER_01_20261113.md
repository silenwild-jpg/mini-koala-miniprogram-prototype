# 迷你考拉仓｜项目控制中心

**版本日期：2026-11-13**  
**用途：** 本文件是项目任务、版本、规则与验收状态的唯一入口；详细页面规则和历史证据保留在专业子文档中，不在多个清单重复维护。  
**当前阶段：** Web/HTML 产品原型验证、功能演示与视觉签收；不是微信原生生产上线验收。

## 1. 当前唯一 RC2 候选

| 项目 | 当前事实 |
|---|---|
| 主候选 PR | [#176 RC2-CLEAN-MIGRATION-01](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/176) |
| 候选分支 | `integration/rc2-clean-migration-01-20261113` |
| 已通过自动化验收的 SHA | `41a8a079eb48049e1060512bddf71c226bfd3738` |
| main当前治理SHA（2026-11-13审计） | `165e521cca6e9453a691c6660d04110538f7fdec`（PR #68及#178均已归并；实际main以GitHub实时为准） |
| PR API 当前报告的 base SHA | `274c5110aa18af7ed71d92533ab126ebbbd11f75` |
| PR 状态 | Draft / MAIN MERGE HOLD，演示版本已签收但未合并 |
| 自动化门禁 | PASS（375/390、浏览器、促销/生命周期、预约/快捷下单/O01） |
| 正式演示准入 | DEMO READY（仅限SHA `41a8a079...`） |
| 在线演示部署 | NOT VERIFIED；未核实可访问的对应版本站点 |
| 生产小程序准入 | HOLD；微信原生/后端/真实支付与法务尚未验收 |
| 人工视觉/UAT | PASS（用户于2026-11-13明确签收此SHA） |
| 主线合并/正式部署 | 未授权、未执行 |

**重要：** PR #176 的自动化 PASS 只对 SHA `41a8a079...` 有效。任何新提交都会使该验收证据不再代表最新 HEAD，必须重新运行同 SHA 门禁。当前候选不可在验收冻结期间被其他开发端继续推送。

## 2. 最新验收证据

- [RC2 Actions Run #43405346410](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43405346410)：Success，head SHA 与候选分支一致。
- [375/390 QA Artifact](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43405346410/artifacts/14026423639)：374项证据文件所在包。
- [Review Bundle Artifact](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43405346410/artifacts/14027316228)：隔离评审构建包。

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
- P1-A审计快照：Open PR **130**，全部Draft；以main为base 11条；[130条PR全量分类](PROJECT_OPS_P1A_PR_INVENTORY_20261113.md)。
- Open Issue：8（含本项目总控#177；原有9个产品/技术Issue中，#148普通用户路径文案未复现、#93历史Runner故障不再复现，已关闭，剩余7个）。
- P1-B审计快照：Branch **180**（其中1条本次审计新增分支）；`isolate/*` **101**；[180条分支全量分类](PROJECT_OPS_P1B_BRANCH_INVENTORY_20261113.md)。
- 其中48条历史分支未被当前Open PR引用（不含本次新建审计分支）；逐条与main比较：21条无独有提交、27条存在独有历史。比较结果不等于可删除，须独立核查原始用途和授权。
- 以main为base的11条Open PR：#176、#50、#47、#36、#35、#33、#30、#28、#26、#24、#22；均为Draft。
- **main保护已实际生效**：`protected=true`，Ruleset [`main-protection-demo-first`](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/rules/27195923) `active`，仅保护main，要求PR、禁止强推/删除、要求视觉契约检查。仍有两个配置优化：同名检查存在重复项、`strict_required_status_checks_policy=true`造成main更新后重复回归；当前GitHub连接器无法写Ruleset，详见[#177](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/issues/177)。

### 主线PR分类
- #176：当前RC2候选，保留。
- #68：**已合并main**，Squash commit `0c78de7720451692bbd44be8854259b8b6a20dbd`。其中项目控制中心、README、AGENTS、VIS-GUARD机器检查与PR模板已生效；旧RC1专用自动工作流改为仅手动触发。
- #50：旧PRD文档候选；与11月13日PRD/决策/验收材料比对后归档。
- #47：旧私有预览候选；只保留访问/部署历史证据。
- #36/#35/#33：旧RC2/生命周期/S01来源链；只核查未迁移的独有变更，不整PR合并。
- #30/#28：CloudBase迁移与旧Git CD预检；后续部署架构专题。
- #26/#24/#22：旧S01视觉探索；历史决策证据，不作为当前母版。

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

### 当前下一步
1. 视觉/UAT签收已完成；保留后续精修清单，不改变本SHA批准状态。
2. 复核#171、#132、#148、#152、#164等Issue在当前候选中的实际状态并更新证据。
3. P1-A/P1-B全量分类已形成；下一步核实旧PR/分支的独有增量和部署依赖，随后提出逐项可归档/可关闭清单；当前不批量关闭或删除。
4. main保护已生效；管理员可对重复必需检查和严格基线更新做低成本优化，不影响现有保护有效性。
5. 最后才进行PR归并准入评审；不自动合并、不部署。
