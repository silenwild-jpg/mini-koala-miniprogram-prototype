> 2026-10-19 最新受控增量试装：`S5_HOME_VIS_CONTROLLED_TRIAL_2026-10-19.md` 记录 S5 与首页变更、证据及未验收项；3 km 原规则见 `RECOMMENDATION_3KM_EXPANSION_2026-10-19_SPEC.md`。Release Gate HOLD。

> 2026-10-19 H01/S01/S5 推荐统一受控候选：`RECOMMENDATION_3KM_EXPANSION_2026-10-19_SPEC.md` 记录本轮用户直接确认的 3 km 扩查、严格低价及第二近兜底规则；Release Gate HOLD。

> 2026-10-15 DEMO-COUPON-ALL-NEW-01：新用户S5优惠卡片不再依赖需求快照、租期或估算次数；8/8展示与10/10定向流程通过。当前8769预览已更新，新候选待审，Release HOLD。详见docs/DEMO_COUPON_ALL_NEW_01.md。以下保留历史记录。

> 2026-10-15 最新独立COMPONENT-MERGE-01候选：合并BRAND-VIS-01C与NAV Scheme B；U01其他仓位移至保存方案下方；修复首次估算S5代金券缺失。真实双尺寸34/34流程与16/16首次估算状态通过。视觉整体PARTIAL，新候选待审，冻结演示READY、Release HOLD。详见docs/COMPONENT_MERGE_01_Result.md。以下历史记录保留。

> 2026-10-15 H01-CARD-01：首页标签最多2枚单行、社区名与店名同行、标签与价格底部齐平；区域低价/离您最近角标与店名同行，价格左右分区。独立候选待审，Release HOLD。详见H01_CARD_01_Result.md。以下历史记录保留。

> 2026-10-15 当前支付前异常验收候选：核心32/32真实HTTP双尺寸PASS，另A图异常状态双尺寸PASS；内部演示READY（受控原型数据），正式Release Gate HOLD，生产API/微信真机NOT TESTED。详见docs/PREPAY_EXCEPTION_RESULT_2026-10-15.md。以下为保留的历史记录。

> 2026-10-15 当前唯一支付前视觉合并候选：真实 HTTP Chromium 双尺寸彩排 28/32 PASS、4/32 NOT TESTED；演示 PENDING，正式 Release Gate HOLD，微信真机 NOT TESTED。详见 docs/CODEX_C4_RESULT_2026-10-15.md。以下为保留的历史记录。

> 当前接续：DEMO-PREPAY-02，见 DEMO_PREPAY_02_SOURCE_REPORT.md；仅源码候选，真实浏览BLOCKED，演示准入BLOCKED，Release Gate HOLD。

## 2026-10-14 · UX-PATCH D4-A 源码候选（真实浏览 BLOCKED / HOLD）

唯一输入为 UX-PATCH D 全站 ZIP，SHA-256 29571257a897f2897cec3d3a0d6c02165b1062e948a437a8ee03c97688e9df87。只处理 D3-P1-01/P1-02：S5 全入口隐藏步骤条、优惠信息折叠；演示台加载交易主数据并同步嵌套快照；index Q01 入口先生成合法演示快照。运行时6个文件修改，数据及实际交易保护未动。

D4-A 源码/VM 8/8、受保护内容20/20、JS5/5；两个视口真实浏览均BLOCKED（Chromium未安装成功）。D4-B未执行，5项P1都未关闭，11项P2未处理；D3的36截图/12交互实际重测0。Release Gate HOLD，微信真机NOT TESTED。详见 `UX_PATCH_D4_A_Source_Status.md` 与根目录 `README_D4_SOURCE_CANDIDATE.md`。以下保留历史记录，不代表本候选已验收。

## 2026-10-14 · H01 推荐卡定向修复候选（HOLD）

`H01_RECOMMENDATION_CARD_SCREENSHOT_REVIEW_FIX_2026-10-14.md`：两张截图暴露的折行问题及定向修复。`H01_RECOMMENDATION_CARD_TARGETED_FIX_2026-10-14.md`：5 km 候选、浏览/需求价格与匹配事实。`H01_RECOMMENDATION_CARD_BROWSER_RECHECK.md`：双尺寸真实浏览复核矩阵；`H01_RECOMMENDATION_CARD_CHANGE_MANIFEST.json`：逐文件 before/after 哈希。

## 2026-10-13 · H01 生活感第三步（源码工作稿 / HOLD）

接续Step02，流程、品牌统计、服务信息与品牌资料入口已改源码。本轮真实截图0张，浏览器验证受阻；帮助白条待修复。详见docs/visual/H01_LIFESTYLE_STEP03_REPORT.md。前序截图不作为本轮证据。

## 2026-10-12 · Recommendation + External AI Repair PATCH V2（内部演示候选 / HOLD）

已合并用户确认的3公里内部推荐规则与第三方评审修复。见 `RECOMMENDATION_EXTERNAL_AI_MERGE_PATCH_V2_SPEC.md` 与 `EXTERNAL_AI_REPAIR_MERGE_PATCH_V2_REPORT.md`。本轮无新增截图，真实浏览器与微信真机待验。以下为历史记录。

- **当前补丁/验收**：`CHINA_NATIVE_UX_TARGETED_PATCH_V1.md` — 中国用户适配性定向修复范围、排序语义、素材可信边界、双屏宽离线审计证据及 Release Gate 状态。
- 2026-10-12 最新视觉收口与跨页验收边界：`HOMEPAGE_VISUAL_CLOSEOUT_AND_CROSS_PAGE_ACCEPTANCE_V1_1.md`（首页重叠修复、荣誉占位、26 页视口烟测及真实 URL E2E 阻断说明）。
- 2026-10-12 首页状态机与组合 UX 合并：`HOMEPAGE_STATE_AND_COMBO_UX_MERGE_PATCH_V1.md`（当前合并候选，Release Gate HOLD）。
- 2026-10-12 当前组合体验修复：`COMBO_UX_REGRESSION_PATCH_V2.md`（最新候选，Release Gate HOLD）。
- 2026-10-12 组合仓位物理适配 P0：`COMBO_RECOMMENDATION_PHYSICAL_FIT_P0_PATCH_V1.md`（最新候选，Release Gate HOLD）。
> 最新方案：`COMBO_UNIT_RECOMMENDATION_V1_SPEC.md`（大容量组合仓位及门店标签第一阶段，2026-10-12）。

## Phase 3A 当前候选（2026-10-10）

- `PHASE3A_CONTROLLED_PATCH_IMPLEMENTATION_V1.md`：实施范围、行为及验收说明。
- `PHASE3A_DELTA_HASHES.json`：唯一业务页的 Phase 2 与 Phase 3A 哈希对照。

# 当前文档索引与权威范围

- 当前版本/发布状态：README_CURRENT.md、CURRENT_STATUS.md、CHANGELOG.md、RELEASE_MANIFEST.json。
- 当前迭代过程：ITERATION_GUIDE.md。
- 最新问题清单：V1_1_All_Page_Bottom_Actions_Source_Review.md；帮助与售罄规则：V1_1_Help_Term_Soldout_Review.md。
- A/B/C/D：同目录ACCEPTANCE_FIX_V11开头的批次记录。它们是分批实施证据，不能覆盖后续授权回滚。
- 业务规范：根目录PRICE_SEMANTICS_DISPLAY_SPEC_V1.md、COUPON_BENEFIT_SYSTEM_SPEC_V1.md及docs/PATCH_DECISIONS.md等现有策略/决策文件。
- 视觉参考：根目录MINI_KOALA_VISUAL_BASELINE_1_0.md、docs/visual/Mini_Koala_Visual_Design_System_V1.md。
- 演示讲解：根目录DEMO_PRESENTER_GUIDE_V1.md、DEMO_STORY_MATRIX_V1.csv；功能边界按CURRENT_STATUS为准。

保留的其他docs/与visual/文档是研究、策略或阶段记录，并不全部代表当前事实。出现旧“Frozen/Accepted/当前最新”时必须结合版本读取，不能覆盖当前HOLD。

历史根目录报告、截图及日志分流至历史档案包。PACKAGE_MIGRATION_MAP记录原文件去向；不得把静态未引用视为删除依据。
> 2026-10-19 最新 H01 布局候选：`HOME_VIS_ONE_ROW_BANNER_SEARCH_2026-10-19.md` 记录五入口单行、搜索与 Banner 融合、双尺寸证据及验收边界。Release Gate HOLD。

