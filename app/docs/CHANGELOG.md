## 2026-10-19 · S5-01 + HOME-VIS-01 受控试装候选

- 组合仓仅对可信大件记录显示唯一短句；北京全城无匹配时可列容量略不足的真实备选并展示差额，保持门店核对路径。
- 首页试装完整 2:1 Banner、复用单条搜索和五个分类焦点入口；确认需求与购物车不由快捷入口改写。
- 双尺寸资源拦截浏览与 CAP-FIRST 52/52 通过；真实 HTTP 和专项矩阵未完成。`PENDING_REVIEW`、Release Gate `HOLD`。见 `S5_HOME_VIS_CONTROLLED_TRIAL_2026-10-19.md`。

## 2026-10-19 · H01/S01/S5 3 km 推荐统一受控候选

- 统一从 3 km 开始逐步扩查严格低于最近匹配门店整期价的不同门店；全城无更低价则展示第二近并移除低价标签。
- H01 改为 3 km 口径，未选租期时不按暗含 1 个月价排序；S01 保留用户设定的距离上限和手动排序；S5 显示扩查说明。
- 纯逻辑及双尺寸资源拦截浏览已核，真实 HTTP 因 `ERR_NETWORK_ACCESS_DENIED` 未完成；Release Gate HOLD。详见 `RECOMMENDATION_3KM_EXPANSION_2026-10-19_SPEC.md`。

## 2026-10-19 · CAP-FIRST-ITEM-02 受控局部合并

- 以用户证实的优惠券候选 ZIP 为本轮母版；隔离复用 R5A/CAP09B/HOME02A，并以最新业务冻结规则裁决 ITEM01/EST-CART-04 的冲突路径。
- H01 估算默认进容量空态；S01/S02 估算入口保留返回参数；物品分类/购物车复用母版 40 项与 `calc()`，一次显式提交直达 S5，保留范围、来源与租期状态。
- S5 未选租期不代填 12 月；固定 AI 示例不再写确认需求。母版原包及交易核心文件未覆盖。
- 新候选 PENDING_REVIEW，Release Gate HOLD；证据/剩余项见 `CAP_FIRST_ITEM_02_VALIDATION_2026-10-19.md`。

> 2026-10-19 NEXT-STAGE 受控候选：R5A 对比面板及 S5 临时入口、CAP 六档容量参考、HOME A 搜索联动；原 READY 不覆盖，正式 Release HOLD。见 `docs/NEXT_STAGE_2026_10_19_RESULT.md`。

> 2026-10-15 DEMO-COUPON-ALL-NEW-01：新用户S5优惠卡片不再依赖需求快照、租期或估算次数；8/8展示与10/10定向流程通过。当前8769预览已更新，新候选待审，Release HOLD。详见docs/DEMO_COUPON_ALL_NEW_01.md。以下保留历史记录。

> 2026-10-15 最新独立COMPONENT-MERGE-01候选：合并BRAND-VIS-01C与NAV Scheme B；U01其他仓位移至保存方案下方；修复首次估算S5代金券缺失。真实双尺寸34/34流程与16/16首次估算状态通过。视觉整体PARTIAL，新候选待审，冻结演示READY、Release HOLD。详见docs/COMPONENT_MERGE_01_Result.md。以下历史记录保留。

> 2026-10-15 H01-CARD-01：首页标签最多2枚单行、社区名与店名同行、标签与价格底部齐平；区域低价/离您最近角标与店名同行，价格左右分区。独立候选待审，Release HOLD。详见H01_CARD_01_Result.md。以下历史记录保留。

> 2026-10-15 当前支付前异常验收候选：核心32/32真实HTTP双尺寸PASS，另A图异常状态双尺寸PASS；内部演示READY（受控原型数据），正式Release Gate HOLD，生产API/微信真机NOT TESTED。详见docs/PREPAY_EXCEPTION_RESULT_2026-10-15.md。以下为保留的历史记录。

> 2026-10-15 当前唯一支付前视觉合并候选：真实 HTTP Chromium 双尺寸彩排 28/32 PASS、4/32 NOT TESTED；演示 PENDING，正式 Release Gate HOLD，微信真机 NOT TESTED。详见 docs/CODEX_C4_RESULT_2026-10-15.md。以下为保留的历史记录。

> 当前：DEMO-PREPAY-02源码候选：统一S5/S01/S02/U01路由，按门店ID排除当前店，保留出行方式及排除上下文至报价与订单返回。真实双尺寸未执行，演示准入BLOCKED，Release Gate HOLD。 详见 docs/DEMO_PREPAY_02_SOURCE_REPORT.md。以下历史记录保留。

## 2026-10-14 · UX-PATCH D4-A 源码候选（真实浏览 BLOCKED / HOLD）

唯一输入为 UX-PATCH D 全站 ZIP，SHA-256 29571257a897f2897cec3d3a0d6c02165b1062e948a437a8ee03c97688e9df87。只处理 D3-P1-01/P1-02：S5 全入口隐藏步骤条、优惠信息折叠；演示台加载交易主数据并同步嵌套快照；index Q01 入口先生成合法演示快照。运行时6个文件修改，数据及实际交易保护未动。

D4-A 源码/VM 8/8、受保护内容20/20、JS5/5；两个视口真实浏览均BLOCKED（Chromium未安装成功）。D4-B未执行，5项P1都未关闭，11项P2未处理；D3的36截图/12交互实际重测0。Release Gate HOLD，微信真机NOT TESTED。详见 `UX_PATCH_D4_A_Source_Status.md` 与根目录 `README_D4_SOURCE_CANDIDATE.md`。以下保留历史记录，不代表本候选已验收。

## 2026-10-14 · H01 推荐卡截图问题定向修复候选（HOLD）

- 根据普通浏览与 3 个月需求态的实测截图，去掉 H01 推荐区价格块重复预留的 56px，使备选卡事实列恢复宽度；需求态金额与“起”同行。真实双尺寸复核待完成，详见 `docs/H01_RECOMMENDATION_CARD_SCREENSHOT_REVIEW_FIX_2026-10-14.md`。

## 2026-10-14 · H01 推荐卡定向修复候选（HOLD）

- 仅调整 H01 推荐三卡：第二卡显式采用 5 km 候选，按实际显示价格决定“稍远更省”；需求态用匹配仓位/容量和整期租金起价，浏览态保持参考单价。
- 门店名、社区、路线与价格分层；新增定向行为回归。共享推荐、数据、券和交易计算不变；真实双尺寸浏览及微信真机未验，详见 `docs/H01_RECOMMENDATION_CARD_TARGETED_FIX_2026-10-14.md`。

> VIS-04B 历史合并候选：以 H01-007-P1 浏览验收接续包为底，受控叠加 VIS-03C A1 品牌 Banner；业务运行时原有文件仅 H01 两处视觉 hunk，P1 修复和交易规则保持。视觉输入为 CORE_no_outputs（529 文件、SHA dbff4a…），原 74 MB 整包 SHA a4001456…未在本环境验证。Release Gate HOLD，微信真机未测；详见 docs/visual/VIS04B_MERGE_NOTE.md。

# 当前接续：H01-007-P1 最小修复候选（2026-10-13）

唯一输入：S5 候选 ZIP，SHA-256 `34cca316bbd353b8e573f058f3b127e82915569bcc1635a8fb8f47bee17bf5a1`。
两个运行文件已修复：C02 底栏 transform 重置；已支付订单优惠券核销与同订单未使用券清理。
逻辑检查通过；双尺寸浏览验收 BLOCKED（本次环境无 Chromium，下载失败）；微信真机 NOT TESTED。
Release Gate HOLD。未启动 VIS-04B，未替换统一母版。下一步在可运行 Chromium 的环境完成本包 HTTP 验收，再决定合并。
详情见 `docs/H01_007_P1_IMPLEMENTATION_REPORT.md`。

---

以下为 S5 及更早的历史记录。

## 2026-10-13 · H01-007 核心交易修复候选（S1–S5 收口 / HOLD / 待修复版本）

- 以 H01-004B 帮助浮窗候选（zip sha256 ed870331…c29ca）为唯一母版，S1–S4 依次修复 D-03/D-04（租期与交易快照）、D-05/D-06（首购资格与锁券恢复）、D-07/D-12（过期报价保护与支付失败恢复）、D-01/D-02（普通浏览与需求恢复分离、门店返回状态恢复）；S5 只做回归、视觉核验与收口，未新增业务规则。
- 与 004B 逐文件比较：prototype 运行时修改 12 个（不重复计数），CSS / 资源 / 数据母表 0 改动；新增 8 个阶段测试与阶段文档；删除 0。价格、押金=折后月均、管理费 ¥50、折扣与优惠门槛计算规则未动。
- S5 契约更新：`qa/test_home_state_integration_patch_v1.cjs` 第 15 条由「有历史容量即自动匹配」改为「门店卡只在显式 matched 时进入匹配态」（D-01 新规格），未回滚 D-01；S1–S4 的 4 个逻辑测试登记进 `tools/run_regression.py`，4 个 HTTP 流程套件因运行时长超过单项 100 s 预算，单独运行（见 README_CURRENT）。
- RELEASE_MANIFEST 重算（POSIX 路径分隔符；004B 的反斜杠路径在非 Windows 环境会使 check_package 全部报 Missing/Unlisted），版本串改为 H01-007 Core Trade Fix Candidate，`changes` 记录随写。
- 真实 HTTP + Chromium 375×812 / 390×844：S1 42/42、S2 40/40、S3 54/54、S4 56/56，核心链路需求→报价→订单→支付→我的→首页一致，页面错误 0。既有 34 项回归：H01-004B 原始树与 S4 树同为 12 项既有失败（历史断言 2、vm 沙盒缺函数 3、硬编码 chromium 路径 5、定位演示层拦截夹具 1、manifest 1）；本机修正 chromium 路径后复跑另记。
- 视觉核验发现 P0 0、P1 2（C02 底部操作栏向左偏移半屏；优惠券换券/无券支付后旧券仍 LOCKED，均为 004B 母版既有，未实施修复，待批准）、P2 7，详见 `docs/H01_007_OPEN_ISSUES.md`。**本候选作为待修复版本交付，不宣称演示验收通过；微信真机未测；Release Gate 继续 HOLD。**

## 2026-10-13 · H01-004B 首页帮助浮窗候选（HOLD）

- 删除旧收口脚本写入的 48px 全宽白条、白底、顶边和额外 132px 页底留白，恢复右下角 44px 浮窗。
- 展开态为电话／客服纵列；支持再次点击、外部点击、Escape关闭及焦点回返；原电话与微信客服路径保留。
- 价格和“查看资料”预留 56px 右侧安全区，同时保留内层 `.page` 滚动的动态碰撞避让。
- 375×812、390×844 真实 HTTP 定向验证：两状态×六锚点，价格/资料入口/底部导航碰撞均为0；证据见 `outputs/h01_004b_20261013/`。
- 未覆盖其他首页状态、联合链路或微信真机；Release Gate 继续 HOLD。

## 2026-10-13 · H01 生活感第三步（源码工作稿 / HOLD）

接续Step02，流程、品牌统计、服务信息与品牌资料入口已改源码。该步骤最初无真实截图且帮助白条待修复；后续 H01-004A 已补双尺寸浏览，H01-004B 已修复帮助浮窗。详见docs/visual/H01_LIFESTYLE_STEP03_REPORT.md。

## 2026-10-13 · H01 生活感第二步（工作副本 / HOLD）

推荐三卡、六场景与企业入口完成局部实施；真实双视口检查，业务/数据/旧CSS/QA未改。详见 docs/visual/H01_LIFESTYLE_STEP02_REPORT.md。首页其他状态、帮助白条、微信真机与联合验收仍待完成。

## 2026-10-13 · H01 生活感首屏与双任务卡（工作副本 / HOLD）

仅新用户 hero 与双任务卡更新；依据 V1.1.1＋首页生活感表达补充。第三方最新完整 tokens 未收到，以 H01 独立桥接恢复收到的 CSS 基线。说明与验证边界见 docs/visual/H01_LIFESTYLE_FIRST_SCREEN_REPORT.md。

## 2026-10-12 · Visual V3 Pilot — O01 / S01 受控试装（Task 02B，候选 / HOLD）

母版：Cross-Branch UX/UI Phase1 QA V1.2 Candidate（sha256 e3579ac9…0015741）。只在 O01 订单确认页与 S01 附近门店页叠加 Visual V3 — Bright Commercial 试装：新增 `prototype/mk-v3-tokens.css`（复用并扩展 `--koala-*`，8 套旧前缀别名，不入层）、`mk-v3-components.css` / `mk-v3-page-o01.css` / `mk-v3-page-s01.css` / `mk-v3-help-entry.css`（唯一命名层 `@layer mk-v3`，低特异度、无 `:has()` / ID，只用现有类名）与两个登记的非业务脚本 `mk-v3-s01-tags.js`（S01 服务标签行移到 `.store-head` 末尾、促销标签语义类）/ `mk-v3-help-entry.js`（帮助入口停靠顶栏、可访问属性、float 兜底）。两页只改 `<head>` 挂载，`<body>` 字节、全部业务 JS、数据母表、19 个旧 CSS、内联样式与现有 QA 脚本未改；H01 / S5 文件与计算样式指纹不变。

落实决策：可见信息文字 ≥12px（两页六态全部 0 处 <12px）；普通文字含占位对比度 ≥4.5:1、≥20px/700 价格 ≥3:1（不达标 0）；服务 / 促销标签 6px 圆角矩形、仓型标签胶囊；新增中性色 #F3F6F4 / #EEF1EF；O01「本次应付」白卡 + 32px 橙色金额；帮助入口图标化并两页停靠顶栏（标题右侧、胶囊左侧，可见碰撞 S01 12–13 → 0、O01 5–7 → 0，永不隐藏）；门店卡不设固定高度；主绿沿用 #2F6B4F。暂缓：中文日期覆盖、金额运行时拆分、O01「门店 + 容量」标题（业务建议）。

验收（本机 Playwright Chromium 148，本地 HTTP，375×812 / 390×844，DPR 2，微信 UA）：S01 六态 + 三面板 + 多选 / 快捷 / 翻页 + E存位置 + 定位授权；O01 U01→继续租用真实路径（¥3,863、券 −¥200、押金、管理费、价格门禁）、协议校验、授权→O02；业务不变量 2,606 字段 0 差异；覆盖账本 1,152 条预登记，计算样式差异 4,075 处全部归类、unexpected 0；既有回归 23/11 → 24/10（仅 `check_package` 因 manifest 收口转 PASS），新引入失败 0。**微信真机未验证。Release Gate 保持 HOLD。** 详见 `docs/visual/MK_V3_PILOT_O01_S01_REPORT.md`、`docs/visual/MK_V3_PILOT_O01_S01_README.md`、`docs/visual/task02a_v1_1/`。

## 2026-10-12 · Recommendation + External AI Repair PATCH V2（内部演示候选 / HOLD）

已合并用户确认的3公里内部推荐规则与第三方评审修复。见 `RECOMMENDATION_EXTERNAL_AI_MERGE_PATCH_V2_SPEC.md` 与 `EXTERNAL_AI_REPAIR_MERGE_PATCH_V2_REPORT.md`。本轮无新增截图，真实浏览器与微信真机待验。以下为历史记录。

## 2026-10-12 · China-Native UX — Targeted PATCH V1

- S01「距离最近」和最近门店锚点改按公里数升序，分钟仅作为同距离排序时的辅助条件。
- S01 五个已映射仓储环境照片新增可访问的真实图片元素及中性标签，未知门店继续占位；首页图片替代说明同步修正。
- U01 选中租期视觉强化，帮助悬浮入口只在遮挡应付金额时暂时隐藏。
- 完整保留冻结价格口径、首页主结构、业务数据、组合推荐及订单逻辑；当前仍为内部演示候选，HOLD。

## 2026-10-12 · Homepage Visual Closeout & Cross-page Acceptance V1.1

- 统一母版沿用 Homepage State V1.1 + Combo UX V2.1 Merge PATCH V1；新增首页专属视觉 CSS/JS 补丁，不覆盖交易链业务源文件。
- 全局帮助 FAB 依据实际几何重叠状态避让门店、信任和品牌证据卡；修复监听 `.page` 内部滚动导致的状态不刷新。
- 品牌荣誉图片替换为中性、清楚标注“资料待核验”的占位，不将示意素材作为真实凭证展示。
- 新增 3 项回归：视觉碰撞（2/2）、主链路由目标（13 页/86 项）、Chromium 源码内联运行烟测（13 页×2 视口=26/26）。
- 新增 `qa/real_url_e2e_smoke_v1.py` 尝试真实 HTTP 页面访问和首页→S01点击；当前直接 HTTP/file 浏览器导航被 `ERR_BLOCKED_BY_ADMINISTRATOR` 拦截，因此不宣称真实 URL E2E 完成，Release Gate 继续 HOLD。

## 2026-10-12 · Homepage State V1.1 + Combo UX V2.1 Merge PATCH V1

- 将首页状态机 V1.1 合入当前组合推荐 V2.1 候选，不用旧首页包覆盖新版门店/仓位/组合逻辑。
- 首页完整底座持续可见；状态卡紧凑呈现且只显示一项主任务；待支付优先；同一找仓旅程去重；普通首页门店卡仍为浏览入口。
- URL 历史参数不再伪造业务状态；无租期不默认 1/6 个月；过期报价重新获取报价；过期预约不再置顶；已知容量恢复明确要求选择租期。
- 44px 触控热区；新增首页状态静态与离线浏览器回归。正式发布门禁保持 HOLD。

## 2026-10-12 · Combo UX Regression PATCH V2

- 推荐组合容量上限 130%；无匹配小仓不再直接进入 U01。
- 售罄返回保留需求与筛选；组合定位及咨询反馈完成收口。
- S5 适配状态一致性修正；新增 11 项专项行为检查与双尺寸离线界面复核。
- 内部演示候选，正式验收 HOLD。

## 2026-10-12 · Combo Recommendation Physical Fit P0 PATCH

修复按组合总体积误判可正常存放风险，补物品/仓体尺寸可信状态、可信不可拆分物品硬拒绝、逐仓估算体积分配、S5/S01/S02安全文案、二次咨询上下文更新。真机验收仍 HOLD。

> 2026-10-12 新增大容量组合仓位推荐第一阶段候选：已恢复完整8标签池、稳定随机2–4项并移除“演示”标签；S5/S01识别组合，S02显示2–3仓方案及附近门店兜底。组合咨询承接，暂不开放多仓在线下单。见 `docs/COMBO_UNIT_RECOMMENDATION_V1_SPEC.md`。Release Gate：HOLD，微信真机及本地URL导航待验。

## 2026-10-12 · VNext U01 Price / S5 Capacity / S02 Route PATCH

基于当日最新 S01 UX Continuity 候选包，修复 U01 价格合并样式闭合与窄屏金额对齐、S5 容量按钮 148px/120px 冲突；删除调整容量的长说明。推荐门店单仓与多仓统一进入携带需求的 S02，移除 S9 门店仓位列表中间页。专项测试 + 375/390 静态布局截图已完成；真机和浏览器 E2E 仍 HOLD。

# 2026-10-12 · S01 UX Continuity PATCH V1

租期推荐容量就地输入并重算；确认物品去掉搜索输入、保留分类和自定义尺寸；S01 门店 2–4 个稳定演示标签、位置/搜索/到店方式和筛选统一就地下拉；U01 显示具体演示仓号且合并压缩租期与费用，传递到 Q01/O01/O02；ID01 一键模拟验证，保留专用失败测试入口；B2B 需求形成有效容量范围并保留企业字段。未改变价格、押金、母表和正式库存事实。HOLD。

# 2026-10-12 · S01 独立评审 P1 修复候选 V1

修复续租再次申请、退租日期类型、看仓时段、母表门店名称搜索、AI/S01 估算返回及就地下拉语义。保留母表与交易价格规则，发布门禁 HOLD。详见 docs/S01_INDEPENDENT_REVIEW_P1_FIX_V1.md。

## 2026-10-10 · Phase 3A Controlled PATCH V1

从 Phase 2 P1 CityScope 修复候选版复制后，实现五项受控估算效率优化；新旧估算页面哈希分离记录，保留全部其他业务模块及门店数据；加入专项测试；不宣称真机或完整浏览器验收通过，HOLD。

## 2026-10-10 · Phase 2 P1 City Scope Fix

修复 S01 北京场景下价格排序混入其他城市门店；统一先按城市限定候选再排序和筛选；新增回归测试并更新 S01 精确哈希守卫。不修改数据母表及其他页面，保留发布 HOLD。

## 2026-10-10 · Phase 2 PATCH V1

M01–M05独立候选实施；M06待业务确认；HOLD。详见 PHASE2_PATCH_REPORT.md。

# 版本日志

## V1.1 Lean Iteration 1｜2026-10-08

基线：A+B+C+D完整包版本4。

- 151份运行时源码、数据、资源及启动工具保持字节一致，30个状态入口完整保留。
- 历史截图、日志、一次性脚本及旧根报告分流。
- 统一根入口、README和HOLD说明。
- 保留当前回归依赖与路径，提供一键回归和文件完整性检查。
- 可选布局脚本使用可配置浏览器路径；历史对比目录改为显式可选配置。
- Release Gate仍HOLD，未将打包回归视为浏览器E2E通过。

## 2026-10-19 · H01 场景单行与 Banner 搜索融合

- 五个分类入口改为无卡片底色的等宽单行；原分类焦点及确认需求保护沿用。
- 唯一搜索条移到 Banner 底边；城市入口复用原位置选择，搜索仍进入 S01。
- 375/390 资源拦截 Chrome 布局和路由通过；真实 HTTP、微信真机未验，Release Gate HOLD。见 `HOME_VIS_ONE_ROW_BANNER_SEARCH_2026-10-19.md`。

