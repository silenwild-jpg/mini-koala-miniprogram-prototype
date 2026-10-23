> 2026-10-19 S5-01 + HOME-VIS-01 受控试装候选：在 3 km 工作候选上补可信大件组合仓唯一提示、全北京无匹配时容量略不足的备选与差额；首页试装完整 2:1 Banner、现有搜索和五个分类入口。Chrome 双尺寸资源拦截浏览通过，CAP-FIRST 52/52；真实 HTTP 被本机网络策略拒绝，候选 PENDING_REVIEW、Release Gate HOLD。见 docs/S5_HOME_VIS_CONTROLLED_TRIAL_2026-10-19.md。以下为历史记录。

> 2026-10-19 H01/S01/S5 推荐统一受控候选：从 3 km 开始扩查严格更便宜的第二门店，无更低价时展示第二近且不贴低价标签；保留 S01 手动筛选和北京演示冻结。定向逻辑及双尺寸资源拦截浏览通过；真实 HTTP 被本机网络策略拒绝，Release Gate HOLD。见 docs/RECOMMENDATION_3KM_EXPANSION_2026-10-19_SPEC.md。以下为历史记录。

> 2026-10-19 CAP-FIRST-ITEM-02 V2：用户指定优惠券 Candidate ZIP 为证实母版；首页「附近门店」已有确认需求自动匹配、无需求普通浏览；AI 估算暂冻结仅演示。真实 HTTP Chrome 双尺寸主路径 52/52、扩展 68/68，通过母版 S5 可见结果对比 6/6；22 例矩阵 13 PASS / 2 AI BLOCKED / 7 NOT TESTED。当前受控局部候选 PENDING_REVIEW，Release Gate HOLD。见 docs/CAP_FIRST_ITEM_02_V2_DECISION_2026-10-19.md。以下为历史记录。

> 2026-10-19 CAP-FIRST-ITEM-02 受控局部合并候选：用户证实的 `DEMO-COUPON-ALL-NEW-01 Candidate` ZIP（SHA-256 `e8e60ee4d00abf2e640054ab430dd68b7ddb1d49e46fab71ef7113f8495d480a`）为本轮母版。隔离候选在 R5A/CAP09B/HOME02A 受控成果上加入容量优先、物品一次提交直达 S5 和确认需求保护。固定 AI 不当真实结果；真实 HTTP 与完整 P0 未验收。新候选 PENDING_REVIEW、Release Gate HOLD。裁定见 `docs/CAP_FIRST_ITEM_02_MERGE_DECISION_2026-10-19.md`，逐例结果见 `docs/CAP_FIRST_ITEM_02_ACCEPTANCE_RESULT.csv`。以下为历史记录。

> 2026-10-19 NEXT-STAGE 受控候选：以已核验 R5A ZIP 为基线整合 CAP09B 与 HOME02A，补可见轻量对比。Chrome 资源拦截双尺寸 16/16 定向通过，真实 HTTP 在当前环境被拒；原内部演示 READY 未替换，本候选 PENDING_REVIEW，Release Gate HOLD。启动预览用 `START_DEMO.cmd`，完整范围与限制见 `docs/NEXT_STAGE_2026_10_19_RESULT.md`。以下为历史记录。

> 2026-10-15 REQUIREMENT-CONTINUITY-01 独立候选：完成估算即保存；所有找仓浏览默认继承；修改后返回读取最新需求；25/25真实HTTP链路通过。原演示未替换，新候选待审，Release HOLD。详见docs/REQUIREMENT_CONTINUITY_01.md。以下历史记录保留。

> 2026-10-15 DEMO-COUPON-ALL-NEW-01：新用户S5优惠卡片不再依赖需求快照、租期或估算次数；8/8展示与10/10定向流程通过。当前8769预览已更新，新候选待审，Release HOLD。详见docs/DEMO_COUPON_ALL_NEW_01.md。以下保留历史记录。

> 2026-10-15 最新独立COMPONENT-MERGE-01候选：合并BRAND-VIS-01C与NAV Scheme B；U01其他仓位移至保存方案下方；修复首次估算S5代金券缺失。真实双尺寸34/34流程与16/16首次估算状态通过。视觉整体PARTIAL，新候选待审，冻结演示READY、Release HOLD。详见docs/COMPONENT_MERGE_01_Result.md。以下历史记录保留。

> 2026-10-15 当前支付前异常验收候选：核心32/32真实HTTP双尺寸PASS，另A图异常状态双尺寸PASS；内部演示READY（受控原型数据），正式Release Gate HOLD，生产API/微信真机NOT TESTED。详见docs/PREPAY_EXCEPTION_RESULT_2026-10-15.md。以下为保留的历史记录。

> 2026-10-15 当前唯一支付前视觉合并候选：真实 HTTP Chromium 双尺寸彩排 28/32 PASS、4/32 NOT TESTED；演示 PENDING，正式 Release Gate HOLD，微信真机 NOT TESTED。详见 docs/CODEX_C4_RESULT_2026-10-15.md。以下为保留的历史记录。

> 当前：DEMO-PREPAY-02源码候选：统一S5/S01/S02/U01路由，按门店ID排除当前店，保留出行方式及排除上下文至报价与订单返回。真实双尺寸未执行，演示准入BLOCKED，Release Gate HOLD。 详见 docs/DEMO_PREPAY_02_SOURCE_REPORT.md。以下历史记录保留。

> 当前：UX-PATCH D4-A 源码候选。双尺寸真实浏览 BLOCKED，D4-B 未执行；Gate HOLD。请先读 README_D4_SOURCE_CANDIDATE.md。以下为保留的历史记录。

> VIS-05 全站视觉源码实施中检查点：M01 外壳＋其他 29 页全站外壳＋六页核心卡片作用域；真实浏览和验收按用户指示延至整体完成后由第三方执行。仍非全量验收候选，Release Gate HOLD。详见 `docs/visual/VIS05_FULL_ROLLOUT_IN_PROGRESS_2026-10-14.md`。

> VIS-05 批次 1 M01 全站外壳独立试装：只变更 M01 HTML 和新增局部 CSS；真实浏览未验，Release Gate HOLD。详见 `docs/visual/VIS05_BATCH1_M01_TRIAL_REPORT_2026-10-14.md`。

> 当前独立接续候选：H01 推荐卡截图问题定向修复，以 H01 推荐卡修复候选（SHA 66d766fa…99c8）为输入。消除备选卡左列挤压及“起”独占一行；真实双尺寸浏览仍待复核，Release Gate HOLD。详见 `docs/H01_RECOMMENDATION_CARD_SCREENSHOT_REVIEW_FIX_2026-10-14.md`。

> 前一候选：H01 推荐卡定向修复，以 VIS-04B 合并包（SHA a76d18da…e1）为输入。首页第二卡改用 5 km 候选；需求态展示匹配仓位、容量与整期租金，卡片信息分层。`node qa/test_h01_recommendation_card_fix.cjs`；详见 `docs/H01_RECOMMENDATION_CARD_TARGETED_FIX_2026-10-14.md`。

> VIS-04B 历史合并候选：以 H01-007-P1 浏览验收接续包为底，受控叠加 VIS-03C A1 品牌 Banner；业务运行时原有文件仅 H01 两处视觉 hunk，P1 修复和交易规则保持。视觉输入为 CORE_no_outputs（529 文件、SHA dbff4a…），原 74 MB 整包 SHA a4001456…未在本环境验证。Release Gate HOLD，微信真机未测；详见 docs/visual/VIS04B_MERGE_NOTE.md。

> H01-007-P1 浏览验收接续包：业务原型与 P1 候选完全相同；QA 脚本补充 `review=1`。双尺寸真实浏览 PASS，C02 帮助入口 P2 待 VIS-04B 复核；微信真机未测，Release Gate HOLD。证据见 docs/P1_BROWSER_ACCEPTANCE_EVIDENCE/。

# 当前接续：H01-007-P1 最小修复候选（2026-10-13）

唯一输入：S5 候选 ZIP，SHA-256 `34cca316bbd353b8e573f058f3b127e82915569bcc1635a8fb8f47bee17bf5a1`。
两个运行文件已修复：C02 底栏 transform 重置；已支付订单优惠券核销与同订单未使用券清理。
逻辑检查通过；双尺寸浏览验收 BLOCKED（本次环境无 Chromium，下载失败）；微信真机 NOT TESTED。
Release Gate HOLD。未启动 VIS-04B，未替换统一母版。下一步在可运行 Chromium 的环境完成本包 HTTP 验收，再决定合并。
详情见 `docs/H01_007_P1_IMPLEMENTATION_REPORT.md`。

新增检查：`node qa/test_h01_007_p1_coupon_settlement.cjs`；`python3 qa/test_h01_007_p1_http_flows.py --out outputs/p1_http`。HTTP 检查需 Python Playwright 与 Chromium。另复跑 S1–S4 的四个 HTTP 套件。

---

以下为 S5 及更早的历史记录。

## 2026-10-13 · H01-007 核心交易修复候选（S5 收口 / 待修复版本 / HOLD）

母版 H01-004B（zip sha256 `ed87033141944066265d3984ee4e10411d8ea6af84288eb9daabffc1e87c29ca`），S1–S4 修复 D-03/04/05/06/07/12/01/02，S5 只做回归与收口。启动与回归方式不变（`python3 -m http.server`、`python3 tools/run_regression.py`）。H01-007 新增测试：逻辑测试 `qa/test_h01_007_s1_requirement_trade_snapshot.cjs`、`qa/test_h01_007_s2_coupon_eligibility.cjs`、`qa/test_h01_007_s3_trade_recheck.cjs`、`qa/test_h01_007_s4_entry_contracts.cjs` 已登记进 `tools/run_regression.py`；HTTP 流程套件 `qa/test_h01_007_s{1,2,3,4}_http_flows.py --out outputs/h01_007/<label> --port 41xx` 各需数分钟，单独运行（需本机 Chromium + playwright）。回退到 004B：用原始 ZIP 整目录替换本目录。详见 `docs/H01_007_S5_FINAL_ACCEPTANCE_REPORT.md`、`docs/H01_007_CHANGE_MANIFEST.md`、`docs/H01_007_OPEN_ISSUES.md`。本候选为待修复版本（P1 ×2 为母版既有缺陷，待批准修复），微信真机未测，Release Gate HOLD。

## 2026-10-13 · H01-004B 帮助浮窗候选（双尺寸定向通过 / HOLD）

首页原常驻全宽帮助白条已改为右下角 44px 浮窗；展开显示电话／客服，支持再次点击、外部点击与 Escape 关闭，原电话和微信客服路径保留。375×812、390×844 在六个滚动锚点验证收起/展开，价格、资料入口、底部导航碰撞均为0。证据见 `outputs/h01_004b_20261013/`，详情见 `docs/visual/H01_LIFESTYLE_STEP03_REPORT.md`。首页其他状态、跨页联合验收与微信真机仍待完成，Release Gate 保持 HOLD。

## 2026-10-13 · H01 生活感第三步（源码工作稿 / HOLD）

接续Step02，流程、品牌统计、服务信息与品牌资料入口已改源码。H01-004A 已在本地 HTTP 真实浏览验证 375×812、390×844：资料展开/收起与 B01 跳转通过，目标区域无小字号、横向溢出或图片加载失败。帮助白条已由后续 H01-004B 修复为浮窗候选；首页其他状态、跨页联合验收与微信真机仍待完成。证据见 `outputs/h01_004a_20261013/` 与 `outputs/h01_004b_20261013/`，详见 `docs/visual/H01_LIFESTYLE_STEP03_REPORT.md`。Release Gate 保持 HOLD。

## 2026-10-13 · H01 生活感第二步（工作副本 / HOLD）

推荐三卡、六场景与企业入口完成局部实施；真实双视口检查，业务/数据/旧CSS/QA未改。详见 docs/visual/H01_LIFESTYLE_STEP02_REPORT.md。首页其他状态、帮助白条、微信真机与联合验收仍待完成。

## 2026-10-13 · H01 生活感首屏与双任务卡（工作副本 / HOLD）

仅新用户 hero 与双任务卡更新；依据 V1.1.1＋首页生活感表达补充。第三方最新完整 tokens 未收到，以 H01 独立桥接恢复收到的 CSS 基线。说明与验证边界见 docs/visual/H01_LIFESTYLE_FIRST_SCREEN_REPORT.md。

# 当前版本：Visual V3 Pilot — O01 / S01 受控试装候选（2026-10-12，HOLD）

以「合并修改 V1.1 / Cross-Branch UX/UI Phase1 QA V1.2」为母版，仅在 O01 订单确认页与 S01 附近门店页叠加 Visual V3 试装（`prototype/mk-v3-*.css/js`，两页只改 `<head>` 挂载）。启动方式、文件清单、回退与复跑见 `docs/visual/MK_V3_PILOT_O01_S01_README.md`；验收报告见 `docs/visual/MK_V3_PILOT_O01_S01_REPORT.md`。微信真机未验证，Release Gate 保持 HOLD。

# 当前版本：合并修改 V1.1

已删除门店详情新增的送搬运活动说明区块。其余V1改动保留。说明见 docs/CONFIRMED_UX_MERGE_V1_1.md。

# 当前版本：卡片、筛选、定位与估算流程合并修改 V1

2026-10-12。详细变更和验收限制见 docs/CONFIRMED_UX_MERGE_V1.md。本轮真实浏览器截图未完成，仍为内部演示候选。

## 2026-10-12 · MiniProgram-Compatible UI System & CSS Upgrade V1（视觉演示候选 / HOLD）

以 Recommendation + External AI Repair PATCH V2 为母版，规范四页 H01/S01/S5/O01 共享视觉 tokens、定位筛选态、StoreCard 视觉、租期推荐与订单操作栏；未修改门店推荐、报价、状态机与订单支付逻辑。详情见 `docs/MINIPROGRAM_COMPATIBLE_UI_SYSTEM_V1.md`。Release Gate 继续 HOLD，微信真机与真实 URL E2E 未验收。

## 2026-10-12 · Recommendation + External AI Repair PATCH V2（内部演示候选 / HOLD）

已合并用户确认的3公里内部推荐规则与第三方评审修复。见 `docs/RECOMMENDATION_EXTERNAL_AI_MERGE_PATCH_V2_SPEC.md` 与 `docs/EXTERNAL_AI_REPAIR_MERGE_PATCH_V2_REPORT.md`。本轮无新增截图，真实浏览器与微信真机待验。以下为历史记录。

> 2026-10-12 **China-Native UX — Targeted PATCH V1（当前演示候选）**：基于 Homepage State + Combo UX Merge PATCH V1.1 视觉收口母版，小范围修正 S01「距离最近」按公里升序（到店分钟保留作辅助展示）、五门店仓储环境图库节点与图片替代文本、U01 快捷租期选中视觉与帮助浮窗遮挡应付金额。冻结价格语义、首页主结构、业务数据、组合推荐和订单逻辑均不改。双屏宽离线 Chromium 定向回归 6/6；HTTP 真实跨页/微信真机仍未验收，Release Gate HOLD。详见 `docs/CHINA_NATIVE_UX_TARGETED_PATCH_V1.md`。

> 2026-10-12 当前视觉收口候选为 **Homepage State V1.1 + Combo UX V2.1 Merge PATCH V1.1 — Visual Closeout & Cross-page Acceptance**：以统一合并母版为基线，修复首页客服悬浮入口与可见卡片重叠；品牌荣誉区不再展示未经核验的证书/媒体示意图，改为明确的“资料待核验”视觉占位。375×812、390×844 首页碰撞专项 2/2；主链 13 页 Chromium 源码内联运行烟测 26/26；13 页 86 个路由引用均解析到现存本地页面。**直接 HTTP/file URL 浏览器导航仍被当前托管 Chromium 的 `ERR_BLOCKED_BY_ADMINISTRATOR` 阻断，故不将模拟 DOM 验收宣称为真实 URL E2E；正式 Release Gate 仍 HOLD。** 详见 `docs/HOMEPAGE_VISUAL_CLOSEOUT_AND_CROSS_PAGE_ACCEPTANCE_V1_1.md`。

> 2026-10-12 当前合并候选为 **Homepage State V1.1 + Combo UX V2.1 Merge PATCH V1**：在当前组合体验最新版中合入首页轻量状态卡、业务资产校验、真实任务优先级、多任务合并、无租期恢复及44px触控热区；保留 V2.1 的组合容量门槛、售罄跨页状态与附近门店兜底。首页品牌/双入口/门店推荐/信任模块顺序不重做。Release Gate HOLD；微信真机与真实 URL E2E 待验。见 `docs/HOMEPAGE_STATE_AND_COMBO_UX_MERGE_PATCH_V1.md`。

> 2026-10-12 当前验收恢复候选为 **Combo UX V2 — Full Journey Acceptance Recovery PATCH V2.1**：修复大需求时过小仓位被错误称为“相近容量”并显示租金，以及售罄演示门店从 S02 返回 S01 后重新变为可租的问题。仅演示状态，数据母表和订单链未改；Release Gate HOLD，微信真机与 URL E2E 待验。见 `docs/COMBO_UX_V21_FULL_JOURNEY_ACCEPTANCE_RECOVERY.md`。

> 2026-10-12 当前演示候选更新为 **Combo UX Regression PATCH V2**：限制组合超配、移除过小仓直达路径、售罄保留需求、统一卡内咨询定位、已留资组合确认和 S5 fitStatus 透传。见 `docs/COMBO_UX_REGRESSION_PATCH_V2.md`；Release Gate 保持 HOLD。

> 2026-10-12 新增 `Combo Demo Readiness & U01 Price Visual Repair V1`：组合方案去除多余的尺寸/费用警告，保留内部物理适配安全状态；U01 修复全局覆盖导致的浅底白字、金额低对比度。仅演示界面准备，不补实测尺寸。见 `docs/COMBO_DEMO_READINESS_AND_U01_PRICE_V1.md`。正式验收仍 HOLD。

> 2026-10-12 新增 `Combo Recommendation — Physical Fit P0 PATCH` 内部演示候选：组合推荐先做物品尺寸可信度、单件硬拦截和分仓容量验证；尺寸模拟/未知统一为“容量候选 · 尺寸待核对”，不会声称物理适配已通过。S5/S01/S02 已连通适配状态与顾问上下文。见 `docs/COMBO_RECOMMENDATION_PHYSICAL_FIT_P0_PATCH_V1.md`。正式发布仍 HOLD。

> 2026-10-12 新增大容量组合仓位推荐第一阶段候选：已恢复完整8标签池、稳定随机2–4项并移除“演示”标签；S5/S01识别组合，S02显示2–3仓方案及附近门店兜底。组合咨询承接，暂不开放多仓在线下单。见 `docs/COMBO_UNIT_RECOMMENDATION_V1_SPEC.md`。Release Gate：HOLD，微信真机及本地URL导航待验。

> 2026-10-12 最新候选：`Mini_Koala_U01_S5_S02_UX_Route_Fix_VNext_Candidate.zip`。修复 U01 价格卡、S5 容量输入、删除冗余说明；推荐卡单仓/多仓统一经 S02，移除 S9 中间页。详见 `docs/VNEXT_U01_PRICE_S5_CAPACITY_S02_ROUTING_PATCH_REPORT.md`。完整验收状态仍 HOLD。

# 2026-10-12 · S01 UX Continuity PATCH V1（当前候选）

基于独立评审 P1 修复候选包：租期页就地调整容量、确认物品页按类别补充、S01 演示标签与统一下拉、U01 具体演示仓号和紧凑租期费用、身份验证一键演示、企业需求推荐承接。详见 docs/S01_UX_CONTINUITY_PATCH_V1_SPEC.md。原业务数据与定价不变；浏览器与微信真机尚未验收，Release Gate HOLD。

# 2026-10-12 · S01 独立评审 P1 修复候选 V1

基于下述完整候选，修复七项已确认 P1；见 docs/S01_INDEPENDENT_REVIEW_P1_FIX_V1.md。仍为内部演示候选，Release Gate HOLD。

# 迷你考拉仓 · S01 Inline Filter & Compact Location V2（当前演示候选）

以前序《S01 Filter & Sort UX Refinement V1》完整原型为基线，本轮只修改 S01 页面布局及交互，不修改门店数据、库存和成交计算。

- 顶部位置、搜索和到店方式合并为44px高的一行。位置和搜索是两个独立点击目标，共用同一个视觉容器。
- 筛选栏固定为**排序（左）—距离（中）—服务（右）**；已携带需求默认推荐排序，普通浏览仍默认距离最近。
- 三类选项改为直接在筛选栏下方展开。距离/排序单选即生效；服务多选后“查看门店”生效，退出或点击别处取消草稿。
- 保留筛选无结果时补充可租门店及真实距离说明；沿用统一图文门店卡、容量/库存/整期租金和价格排序规则。

执行 `python tools/run_regression.py`，运行时页 S01 的相对定位布局与筛选互动还通过了离线 Chromium 375、390屏宽测试。离线内联预览不等于完整 URL 加载及微信真机验收，发布门禁保持 HOLD。

> 2026-10-19 H01 场景单行与 Banner 搜索融合受控候选：五入口等宽单行，唯一搜索条叠在 Banner 底边，左侧城市调用既有位置选择；分类、确认需求与找仓跳转不变。375/390 资源拦截 Chrome 布局与路由通过，真实 HTTP 仍受本机策略阻断。PENDING_REVIEW、Release Gate HOLD。见 docs/HOME_VIS_ONE_ROW_BANNER_SEARCH_2026-10-19.md。以下为历史记录。

