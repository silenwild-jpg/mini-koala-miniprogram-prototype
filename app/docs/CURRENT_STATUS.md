> 2026-10-19 S5-01 + HOME-VIS-01 受控试装候选：S5 组合仓可信大件单句提示、北京全城容量接近兜底与不足差额，首页完整 2:1 Banner、单条搜索和五分类入口已试装。定向逻辑、双尺寸 Chrome 资源拦截浏览和 CAP-FIRST 52/52 通过；真实 HTTP `ERR_NETWORK_ACCESS_DENIED`，微信真机与专项矩阵未完成。`PENDING_REVIEW`，Release Gate `HOLD`。见 `S5_HOME_VIS_CONTROLLED_TRIAL_2026-10-19.md`。以下为历史记录。

> 2026-10-19 H01/S01/S5 推荐统一受控候选：用户确认统一 3 km 初始范围、逐步扩查、第二家须严格更便宜；没有更低价则展示第二近且不贴低价标签。S5 北京演示与 AI 估算冻结不变。纯逻辑定向检查通过；Chrome 双尺寸本地资源拦截核对通过，真实 HTTP 本机 `ERR_NETWORK_ACCESS_DENIED`，正式 Release Gate HOLD。见 `RECOMMENDATION_3KM_EXPANSION_2026-10-19_SPEC.md`。以下为历史记录。

> 2026-10-19 CAP-FIRST-ITEM-02 V2：用户指定优惠券 Candidate ZIP 为证实母版；首页「附近门店」已有确认需求自动匹配、无需求普通浏览；AI 估算暂冻结仅演示。真实 HTTP Chrome 双尺寸主路径 52/52、扩展 68/68，通过母版 S5 可见结果对比 6/6；22 例矩阵 13 PASS / 2 AI BLOCKED / 7 NOT TESTED。当前受控局部候选 PENDING_REVIEW，Release Gate HOLD。见 docs/CAP_FIRST_ITEM_02_V2_DECISION_2026-10-19.md。以下为历史记录。

> 2026-10-19 CAP-FIRST-ITEM-02：用户指定的优惠券候选 ZIP 已核 SHA/清单，是本轮证实母版；本目录为独立受控局部合并候选，容量优先与物品直达 S5 已试装。真实 AI、完整 22 项矩阵及 HTTP 全链路尚未完成；内部演示新候选 PENDING_REVIEW，Release Gate HOLD。见 `CAP_FIRST_ITEM_02_MERGE_DECISION_2026-10-19.md` 与 `CAP_FIRST_ITEM_02_VALIDATION_2026-10-19.md`。以下为历史记录。

> 2026-10-19 NEXT-STAGE 受控候选：以独立核验的 R5A ZIP 为起点，局部叠加 CAP09B 与 HOME02A，并补 U01 可见轻量对比/S5 临时内容流入口。Chrome 资源拦截双尺寸定向 16/16，通过范围不等于真实 HTTP；历史回归与原包同为 49 FAIL、新增失败 0。原 READY 未替换，本候选 PENDING_REVIEW，Release Gate HOLD。详见 `docs/NEXT_STAGE_2026_10_19_RESULT.md`。以下保留历史记录。

> 2026-10-15 DEMO-COUPON-ALL-NEW-01：新用户S5优惠卡片不再依赖需求快照、租期或估算次数；8/8展示与10/10定向流程通过。当前8769预览已更新，新候选待审，Release HOLD。详见docs/DEMO_COUPON_ALL_NEW_01.md。以下保留历史记录。

> 2026-10-15 最新独立COMPONENT-MERGE-01候选：合并BRAND-VIS-01C与NAV Scheme B；U01其他仓位移至保存方案下方；修复首次估算S5代金券缺失。真实双尺寸34/34流程与16/16首次估算状态通过。视觉整体PARTIAL，新候选待审，冻结演示READY、Release HOLD。详见docs/COMPONENT_MERGE_01_Result.md。以下历史记录保留。

> 2026-10-15 H01-CARD-01：首页标签最多2枚单行、社区名与店名同行、标签与价格底部齐平；区域低价/离您最近角标与店名同行，价格左右分区。独立候选待审，Release HOLD。详见H01_CARD_01_Result.md。以下历史记录保留。

> 2026-10-15 当前支付前异常验收候选：核心32/32真实HTTP双尺寸PASS，另A图异常状态双尺寸PASS；内部演示READY（受控原型数据），正式Release Gate HOLD，生产API/微信真机NOT TESTED。详见docs/PREPAY_EXCEPTION_RESULT_2026-10-15.md。以下为保留的历史记录。

> 2026-10-15 当前唯一支付前视觉合并候选：真实 HTTP Chromium 双尺寸彩排 28/32 PASS、4/32 NOT TESTED；演示 PENDING，正式 Release Gate HOLD，微信真机 NOT TESTED。详见 docs/CODEX_C4_RESULT_2026-10-15.md。以下为保留的历史记录。

> 当前：DEMO-PREPAY-02源码候选：统一S5/S01/S02/U01路由，按门店ID排除当前店，保留出行方式及排除上下文至报价与订单返回。真实双尺寸未执行，演示准入BLOCKED，Release Gate HOLD。 详见 docs/DEMO_PREPAY_02_SOURCE_REPORT.md。以下历史记录保留。

## 2026-10-14 · UX-PATCH D4-A 源码候选（真实浏览 BLOCKED / HOLD）

唯一输入为 UX-PATCH D 全站 ZIP，SHA-256 29571257a897f2897cec3d3a0d6c02165b1062e948a437a8ee03c97688e9df87。只处理 D3-P1-01/P1-02：S5 全入口隐藏步骤条、优惠信息折叠；演示台加载交易主数据并同步嵌套快照；index Q01 入口先生成合法演示快照。运行时6个文件修改，数据及实际交易保护未动。

D4-A 源码/VM 8/8、受保护内容20/20、JS5/5；两个视口真实浏览均BLOCKED（Chromium未安装成功）。D4-B未执行，5项P1都未关闭，11项P2未处理；D3的36截图/12交互实际重测0。Release Gate HOLD，微信真机NOT TESTED。详见 `UX_PATCH_D4_A_Source_Status.md` 与根目录 `README_D4_SOURCE_CANDIDATE.md`。以下保留历史记录，不代表本候选已验收。

> 当前独立接续候选：H01 推荐卡截图问题定向修复。处理备选卡路线/标签被挤压和需求态“起”换行；双尺寸真实浏览待核验，Release Gate HOLD，未覆盖母版。详见 `docs/H01_RECOMMENDATION_CARD_SCREENSHOT_REVIEW_FIX_2026-10-14.md`。

> 前一候选：H01 推荐卡定向修复。5 km 第二卡、需求匹配事实、整期租金标签与信息分层已落源码；详见 `docs/H01_RECOMMENDATION_CARD_TARGETED_FIX_2026-10-14.md`。

> VIS-04B 历史合并候选：以 H01-007-P1 浏览验收接续包为底，受控叠加 VIS-03C A1 品牌 Banner；业务运行时原有文件仅 H01 两处视觉 hunk，P1 修复和交易规则保持。视觉输入为 CORE_no_outputs（529 文件、SHA dbff4a…），原 74 MB 整包 SHA a4001456…未在本环境验证。Release Gate HOLD，微信真机未测；详见 docs/visual/VIS04B_MERGE_NOTE.md。

# 当前接续：H01-007-P1 最小修复候选（2026-10-13）

唯一输入：S5 候选 ZIP，SHA-256 `34cca316bbd353b8e573f058f3b127e82915569bcc1635a8fb8f47bee17bf5a1`。
两个运行文件已修复：C02 底栏 transform 重置；已支付订单优惠券核销与同订单未使用券清理。
逻辑检查通过；双尺寸浏览验收 BLOCKED（本次环境无 Chromium，下载失败）；微信真机 NOT TESTED。
Release Gate HOLD。未启动 VIS-04B，未替换统一母版。下一步在可运行 Chromium 的环境完成本包 HTTP 验收，再决定合并。
详情见 `docs/H01_007_P1_IMPLEMENTATION_REPORT.md`。

---

以下为 S5 及更早的历史记录。

## 2026-10-13 · H01-007 核心交易修复候选（S5 收口 / 待修复版本 / HOLD）

S1–S4 七项必修（D-03、D-04、D-05、D-06、D-07、D-12、D-01）与条件项 D-02 已全部实施并在 S5 全链路复跑通过：阶段逻辑测试 13/14/18/30，真实 HTTP 双视口 42/40/54/56，核心链路金额与订单号一致，页面错误 0。既有 34 项回归中 12 项为 H01-004B 原始树即存在的失败（已逐项分类，未删除测试、未放宽断言）；第 15 条契约按 D-01 新规格更新。S5-B 视觉核验：P0 0，P1 2（C02 底栏偏移、优惠券遗留锁，均为母版既有），P2 7。**候选以「待修复版本」交付，不宣称内部演示验收通过；统一项目母版未覆盖；微信真机 NOT TESTED；Release Gate 继续 HOLD。** 详见 `docs/H01_007_S5_FINAL_ACCEPTANCE_REPORT.md`、`docs/H01_007_CHANGE_MANIFEST.md`、`docs/H01_007_OPEN_ISSUES.md`。以下为历史记录。

## 2026-10-13 · H01-004B 帮助浮窗候选（双尺寸定向通过 / HOLD）

首页常驻帮助已由全宽白条恢复为右下角 44px 浮窗。375×812、390×844 的收起、展开、外部点击关闭、Escape关闭、客服提示层关闭均通过；六个滚动锚点下价格、资料入口与底部导航碰撞均为0。电话和微信咨询路径保持原实现。证据见 `outputs/h01_004b_20261013/`。本结果不覆盖首页其他状态、四核心页联合链路或微信真机，Release Gate 继续 HOLD。

## 2026-10-13 · H01 生活感第三步（源码工作稿 / HOLD）

接续Step02，流程、品牌统计、服务信息与品牌资料入口已改源码。H01-004A 已在本地 HTTP 真实浏览验证 375×812、390×844：资料展开/收起与 B01 跳转通过，目标区域无小字号、横向溢出或图片加载失败。帮助白条已由后续 H01-004B 修复为浮窗候选；首页其他状态、跨页联合验收与微信真机仍待完成。证据见 `outputs/h01_004a_20261013/` 与 `outputs/h01_004b_20261013/`，详见 `docs/visual/H01_LIFESTYLE_STEP03_REPORT.md`。Release Gate 保持 HOLD。

## 2026-10-13 · H01 生活感第二步（工作副本 / HOLD）

推荐三卡、六场景与企业入口完成局部实施；真实双视口检查，业务/数据/旧CSS/QA未改。详见 docs/visual/H01_LIFESTYLE_STEP02_REPORT.md。首页其他状态、帮助白条、微信真机与联合验收仍待完成。

## 2026-10-13 · H01 生活感首屏与双任务卡（工作副本 / HOLD）

仅新用户 hero 与双任务卡更新；依据 V1.1.1＋首页生活感表达补充。第三方最新完整 tokens 未收到，以 H01 独立桥接恢复收到的 CSS 基线。说明与验证边界见 docs/visual/H01_LIFESTYLE_FIRST_SCREEN_REPORT.md。

## 2026-10-12 · Visual V3 Pilot — O01 / S01 受控试装（当前候选 / HOLD）

在 Cross-Branch UX/UI Phase1 QA V1.2 母版上，O01 与 S01 两页叠加 Visual V3（Bright Commercial）试装样式与两个登记辅助脚本；H01 / S5 及其他页面未动。本机 Chromium 双视口验收：字号地板 12 与对比度门槛两页全部达标、帮助入口可见碰撞 0、业务不变量 0 差异、账本外差异 0、既有回归无新失败（24/10，仅 manifest 收口项转 PASS）。**微信真机未验证；Release Gate 继续 HOLD；未进入 Task 02C。** 见 `visual/MK_V3_PILOT_O01_S01_REPORT.md`。以下为历史记录。

## 2026-10-12 · Recommendation + External AI Repair PATCH V2（内部演示候选 / HOLD）

已合并用户确认的3公里内部推荐规则与第三方评审修复。见 `RECOMMENDATION_EXTERNAL_AI_MERGE_PATCH_V2_SPEC.md` 与 `EXTERNAL_AI_REPAIR_MERGE_PATCH_V2_REPORT.md`。本轮无新增截图，真实浏览器与微信真机待验。以下为历史记录。

## 2026-10-12 · China-Native UX — Targeted PATCH V1（当前演示候选，HOLD）

在最新首页状态与组合推荐合并视觉候选母版基础上，修正 S01 距离排序公里数口径、门店环境图可访问节点、U01 租期选中视觉与应付金额/帮助浮窗碰撞。保留「参考单价」等冻结术语，不改变首页架构、组合推荐或交易价格。双尺寸内联渲染专项 6/6。真实 URL E2E 与微信真机尚未验收，Release Gate HOLD。详见 `CHINA_NATIVE_UX_TARGETED_PATCH_V1.md`。

## 2026-10-12 · Homepage State + Combo UX V1.1 Visual Closeout（候选，HOLD）

- 统一母版：`Homepage State V1.1 + Combo UX V2.1 Merge PATCH V1`；本轮不覆盖 S01/S02/U01/估算/订单既有业务文件，只增加首页视觉补丁与验收证据。
- 已修复首页全局帮助悬浮入口与可见门店卡/品牌证据卡重叠：仅在几何碰撞期间暂时隐藏，离开碰撞区域后恢复；兼容 `.page` 内部滚动。
- 品牌荣誉区移除未经核验的示意证书图片，使用中性视觉占位并标记“资料待核验”，避免演示素材被误认作已核验的品牌证明。
- 首页视觉碰撞专项：375×812、390×844 共 2/2；核心主链 13 页 Chromium 源码内联运行烟测 26/26；路由引用 86 项无缺失；原回归套件保留。
- **真实 URL E2E 尚未通过**：已提供 `qa/real_url_e2e_smoke_v1.py` 可在本机复跑；当前直接访问 `http://127.0.0.1` 和 `file://` 均返回 `ERR_BLOCKED_BY_ADMINISTRATOR`。本轮 Chromium 源码内联运行和路由引用验证不能替代真实 HTTP 跨页、浏览器返回、微信 WebView/真机测试。Release Gate 继续 HOLD。
- 详细记录与截图：`HOMEPAGE_VISUAL_CLOSEOUT_AND_CROSS_PAGE_ACCEPTANCE_V1_1.md`、`outputs/home_visual_closeout_375_honors.png`、`outputs/home_visual_closeout_390_honors.png`。

## 2026-10-12 · Homepage State V1.1 + Combo UX V2.1 Merge PATCH V1（合并候选，HOLD）

当前候选已将首页轻量状态机 V1.1 合并进 Combo UX V2.1。首页保持原有品牌区、双入口、推荐门店、场景和信任模块；状态任务卡复用已有卡片，不堆叠多个主任务。待支付优先，业务资产验证后决定显示状态；旧 URL state 不可单独伪造订单/预约/报价；缺租期通过已知容量入口恢复且明确要求重新选择租期。组合匹配、容量门槛与售罄状态逻辑沿用 V2.1。正式 Release Gate HOLD。

## 2026-10-12 · Combo UX Regression PATCH V2（候选，HOLD）

在演示视觉收口版上修复组合超配、过小仓误入 U01、售罄返回条件丢失、底栏滚动遮挡、已留资的组合反馈及 S5 fitStatus 透传；实测仓体尺寸和多仓在线下单维持后续开发阶段。详见 `COMBO_UX_REGRESSION_PATCH_V2.md`。正式 Release Gate HOLD。

## 2026-10-12 · 组合仓位 Physical Fit P0 PATCH（候选，HOLD）

组合推荐物理适配门禁已增加可信尺寸拒绝、分仓容量计算、未知尺寸待核对和顾问上下文传递。正式仓型尺寸仍全部为模拟，不可对用户承诺物品已适配；多仓下单未开放。详见 `COMBO_RECOMMENDATION_PHYSICAL_FIT_P0_PATCH_V1.md`。

> 2026-10-12 新增大容量组合仓位推荐第一阶段候选：已恢复完整8标签池、稳定随机2–4项并移除“演示”标签；S5/S01识别组合，S02显示2–3仓方案及附近门店兜底。组合咨询承接，暂不开放多仓在线下单。见 `docs/COMBO_UNIT_RECOMMENDATION_V1_SPEC.md`。Release Gate：HOLD，微信真机及本地URL导航待验。

# 2026-10-12 · S01 UX Continuity PATCH V1

按用户反馈更新估算页、确认物品页、附近门店、仓位/订单/方案、身份验证和企业需求承接；详见 S01_UX_CONTINUITY_PATCH_V1_SPEC.md。当前源仅有容量方案与代表仓号，U01 选择首个可用代表仓号作具体演示仓位并贯穿订单；正式库存预占尚需后端。Release Gate：HOLD，双尺寸及微信真机未完成。

# 2026-10-12 · 独立评审七项 P1 修复候选

F01、F02、F03、F04、F05、F07、F08 已在完整 S01 V2 候选包中修复；详情见 S01_INDEPENDENT_REVIEW_P1_FIX_V1.md。Release Gate：HOLD；浏览器双尺寸与微信真机未完成。下方历史状态为版本档案。

# Phase 3A 候选状态（2026-10-10）

在 Phase 2 P1 CityScope 修复版基础上实施受控估算流程 PATCH 3A-01～05（S3 快捷预设、S7 已知容量、结果状态、历史返回、进度说明）；单业务运行时文件受控变更。静态及模拟 DOM 验收完成不等于浏览器或微信真机通过。**Release Gate 保持 HOLD**，未覆盖 Phase 2 母版。详见 PHASE3A_CONTROLLED_PATCH_IMPLEMENTATION_V1.md。

## 2026-10-10 · Phase 2 P1 City Scope Fix

修复 S01 北京望京按价格排序跨城市混入杭州彩虹城店。先按演示用仓城市筛选，再按价格/距离排序。原数据母表与业务链路不变。增加 `qa/test_phase2_city_scope.js` 行为回归。

用户明确要求跳过真实浏览器完整操作验证；微信真机也未验收。该 P1 逻辑修复不解除总 Release Gate HOLD。详见 PHASE2_P1_CITY_SCOPE_FIX_V1.md。

# 当前状态

Mini Koala Phase 2 PATCH V1，独立内部演示候选版，2026-10-10。基线为 V1.1 Lean Iteration 1。

已实施 M01–M05：用仓位置与推荐/下游联动；容量草稿确认与取消；E存介绍和咨询演示；按实际距离和整期租金生成推荐理由；估算完成保留距离、排序、服务筛选并实际过滤。

原母版未修改。首页、数据母表、定价、优惠券、押金管理费、交易与生命周期源文件保持基线。未恢复尺寸待确认区块。

M06 仓位交付保证尚待业务确认，未加入新承诺。

Release Gate：HOLD。源码/模拟DOM/本地HTTP检查不能证明真实浏览器与微信端体验。375×812、390×844截图、微信返回与软键盘验证待完成。

本轮改动和验证范围见 docs/PHASE2_PATCH_REPORT.md；验收场景见 docs/PHASE2_CORRECTIVE_SPEC_V1.html；本轮测试结果见 outputs/current_regression/results.json。旧文档中的PASS不能当作本轮视觉或真机验收。


> 2026-10-19 最新 H01 视觉受控候选：五个场景入口同排；搜索条跨在 Banner 底边，城市与搜索保留独立动作。新用户和已确认需求状态的 375/390 资源拦截 Chrome 视觉及入口检查通过；真实 HTTP 仍被本机策略阻断。PENDING_REVIEW、Release Gate HOLD。见 `HOME_VIS_ONE_ROW_BANNER_SEARCH_2026-10-19.md`。以下为历史记录。

