# Mini Koala — Task 02B O01／S01 Pilot Implementation & Acceptance Report（02B-4 联合验收版 · 02B-5A 文档一致性修订 V1.1.1）

> 02B-5A 修订说明：本版只修正文档表述，验收数据、截图、账本、回归结果均为 02B-4 原始结果，未重跑；原型文件、验收脚本与候选 ZIP 未动。结论不变：**本机 Chromium 双视口通过、微信真机待验证、Release Gate HOLD**。

日期：2026-10-12 ｜ 母版：`Mini_Koala_CrossBranch_UX_UI_Phase1_QA_V1_2_Candidate.zip`（sha256 `e3579ac9a285a0533133e17e5efdcca85904abf7eac0d0bacf7ccae1a0015741`，与 Task 01 / 预检 / 02A / 02B-0 同一包）｜ 候选：`Mini_Koala_CrossBranch_UX_UI_Phase1_QA_V1_2_MKV3_Pilot_O01_S01_Candidate.zip`（843 文件，80MB；LITE 版 11MB 不含 PNG）｜ 工作副本：`/tmp/mk_02b4/work`（从 02B-3 副本复制）

## 0. 判定

| 项 | 结果 |
|---|---|
| 本机验收（Playwright Chromium 148，本地 HTTP，375×812 / 390×844，DPR 2，微信 iOS UA，zh-CN，Noto Sans CJK 回退字体） | **通过**：文档 4 V1.1 §C–§F 全部达标，新引入失败 0 |
| 微信真机（iOS / 安卓 WebView） | **未验证，标为待验证**（`@layer`、`mask-image`、safe-area、原生日期控件、字体断行、胶囊真实位置） |
| Release Gate | **HOLD（未变）** |
| 范围 | O01 + S01；H01 / S5 文件与计算样式指纹不变；未进入 Task 02C |

## 1. 实际改动（相对母版，`diff -rq` 核对；只增不改）

| 文件 | 性质 |
|---|---|
| `prototype/mk-v3-tokens.css` | 新增，不入层；`body.koala-ui-v1.koala-o01 / .koala-s01` 下复用并扩展 `--koala-*`（含 `#F3F6F4` / `#EEF1EF` / `--koala-promo-text #A04E12`），8 套旧前缀映射为别名；不建第 10 套前缀 |
| `prototype/mk-v3-components.css`、`mk-v3-page-o01.css`、`mk-v3-page-s01.css`、`mk-v3-help-entry.css` | 新增，唯一命名层 `@layer mk-v3`；低特异度、只用现有类名、无 `:has()` / ID / `:root` / 色值字面量；`!important` 只用于取代已登记的旧重要声明。四文件共 1,152 条声明（1,061 重要 / 91 普通） |
| `prototype/mk-v3-s01-tags.js` | 新增登记脚本：A. 每张 `.store` 的 `.store-demo-tags` 移为 `.store-head` 末尾子节点（真实 DOM 是 `.store-head > .store-main > .store-demo-tags`，嵌套设跨列无效）；B. 「特价仓 / 送搬运」加 `.mk-promo-tag`。文本 / 顺序 / 数量 / aria-label / 卡片点击不变，`#storeList` childList 观察器重渲染后重做 |
| `prototype/mk-v3-help-entry.js` | 新增登记脚本：R1 `#miniGlobalSupport` 一次 `appendChild` 进 `.header`；R2 类名；R3 `aria-haspopup / aria-controls / aria-expanded`、`role="group"`；R4 外部点击 / Esc 收起；R5 仅 float 模式的碰撞隐藏与重检 |
| `prototype/mini_storage_order_o01_…html` | `<head>` 追加 4 link + 1 script；`<body>` sha `26361b600958` 与母版相同；`data-ui-system="v1"` 仍 1 次 |
| `prototype/mini_storage_store_list_s01_…html` | `<head>` 追加 4 link + 2 script；`<body>` sha `c0eff0b3a6d5` 与母版相同 |
| `qa/check_mk_v3_css_lint.py`、`mk_v3_pilot_probe.py`、`mk_v3_help_entry_probe.py`、`mk_v3_s01_card_check.py`、`mk_v3_override_ledger.py`、`mk_v3_business_invariants.py`、`mk_v3_compare_shots.py` | 新增只读验收脚本 |
| `docs/visual/mk_v3_override_ledger.csv`、`mk_v3_pilot_baseline_hashes.json`、`task02a_v1_1/*.md`（4）、`MK_V3_PILOT_O01_S01_README.md`、`MK_V3_PILOT_O01_S01_REPORT.md` | 新增文档物 |
| `docs/CHANGELOG.md`、`docs/CURRENT_STATUS.md`、`README_CURRENT.md`、`RELEASE_MANIFEST.json` | 更新（manifest 475 文件重写，`release_gate: HOLD`，母版原有 1 Changed + 7 Unlisted 漂移一并收口） |

未改：全部业务 JS、数据母表、19 个旧 CSS、两页内联 `<style>`、`mini_storage_global_support_v274.js`、`mini_koala_acceptance_fix_v1.js`、现有 QA 脚本、H01 / S5 及其他页面（`diff -rq` 仅上述文件）。

## 2. 视觉改善（375×812；390×844 同）

| 项 | 母版 | 候选 |
|---|---|---|
| 可见文字 <12px | S01 浏览 54 / 需求 50 / 无匹配 12；O01 4 | 两页六态 + 三面板 + 直连 **全部 0** |
| 对比度不达标（普通 ≥4.5:1，≥20px/700 价格 ≥3:1，不四舍五入） | S01 5、O01 17 | **0 / 0** |
| S01 门店卡 | 190px；标签 10px 在右列横向裁切；首卡 `0 14px 38px` 阴影；圆角 20 | 205px（内容撑开，不设上限）：名 16/700、仓型胶囊 12、地址 / 路线 13、标签 12px 6px 矩形占全宽（四标签一行、裁切 0、横滚 0）、事实 label 12、价格 20/700 `#D56A1C` + 后缀 12 灰；卡壳白底 14 圆角 1px `#E4EBE6` 描边 `0 2px 8px` 阴影统一 |
| S01 促销小字 | `#B85A16` 在 `#FFF0E2` 4.17:1 | `#A04E12` 在 `#FFF0E2` 5.24:1 |
| S01 筛选条 / Chip / Tab / E存 / 占位 | 38 高 11px 无描边 / 40 高 16px / 字符图标 + 10px 文字 / 深绿渐变 + 9.5px badge / 12px | 40 高 13px 竖分隔线 / 32 高 13px 圆角 8 / 线性 SVG + 12px / 白卡 + 12px 浅绿 badge（位置仍索引 2）/ 13px `#59645E` |
| O01 分区 / 应付 / 明细 | 分区透明无卡；深绿渐变 + `#F4C99F` 32px；明细 13px | 五个分区白卡 14 圆角描边；应付白卡 32/38/700 `#D56A1C`、左标签 14 灰；明细 14px 行高 44、金额 600 墨色、券行负数 |
| O01 顶栏 / 标题 / 协议 / 底栏 | 52 高暖色半透；标题 20 / 分区 18；底栏 73、13px | 48 高白底；标题 18 / 分区 17；协议 `#F3F6F4` 底 20px 品牌绿勾选框 14px 正文；底栏 69（68 + 描边）两按钮 108 + 229、15px，「确认并支付 ¥113,863」内宽 227 单行不裁切 |
| 帮助入口 | 「＋帮助」16px 三行溢出；可见碰撞 S01 12–13/15、O01 5–7/9 | 44px 图标圆钮停靠顶栏（标题右侧、胶囊左侧）；可见碰撞 **0**、隐藏 **0**；展开为顶栏下方胶囊下拉 13px |
| 图标 | ⌂ ⌕ ▦ ◉ ⌄ › ‹ ＋ ☎ ◉ 字符 | 线性 SVG（mask），字符保留在 DOM 字号归零（icon-zero 登记 11 处，lint 逐条核对非文字标签） |

说明：S01 占位图里源 `<small>门店环境</small>` 是 10px，但被旧规则 `opacity:0!important` 隐藏不可见，可见角标由 `::after` 12px 绘制（本轮核实，不计入地板）。

证据：`compare/`（70 张左母版右候选对照）、`contact/`（S01 六态与 O01 真实路径拼图，两视口）、`screenshots_after/`（候选原图 71 张）。

## 3. 验收项逐条（指令 §八）

| # | 项目 | 结果 |
|---|---|---|
| 1 | S01 六态 unlocated / browse / estimated / nomatch / extended / far × 两视口 | 全部截图；<12px 0、对比度 0、横向溢出 0、JS / console / 失败请求 0；每卡文本与基线逐字相同；E存卡位置索引 2（兜底态索引 0）不变 |
| 2 | 三个筛选面板展开、多选应用 / 取消、快捷 Chip、分页、E存位置、定位授权 | 面板选项与基线相同（面板内文字 <12px 0）；服务多选应用后「服务 (2)」、取消恢复列表 true；快捷「特价仓」「送搬运」应用与清除恢复 true；翻页 9 → 17，「继续加载更多门店（还有 25 家）›」，E存仍索引 2；定位授权弹层微信样式（`#07C160` 允许 / 灰底拒绝，16px）未碰 |
| 3 | O01 真实路径 U01 →「继续租用」→ O01 | 标题「仓位 BJ0112S01A009」、惠新西街店 · 4.7m³、6 个月、2026-10-12 → 2027年4月11日、¥3,863、租金 ¥3,440、券 −¥200、优惠后 ¥3,240、押金 ¥573、管理费 ¥50、门禁 valid；未勾选 → 「请先阅读并勾选租赁服务协议」；勾选 → 授权 sheet（48px 两按钮）→ O02 `reachedO02: true`；四个 sheet 开关正常（确认钮 48/15px）；直连显示「报价待确认」 |
| 4 | 两页帮助入口展开、电话 / 客服、滚动避让 | 第 3 次运行（探针修正后）：两页两视口隐藏 0/15、0/9、0/15、0/8；未被顶栏遮盖的碰撞 0；中心命中失败 0；与标题 / 胶囊 / 返回键重叠否；resize、服务筛选、快捷 Chip、翻页后重扫、预估态、协议 sheet 开关后入口位置不变；展开两动作可见可命中、展开后滚动菜单不消失；电话触发旧 handler（菜单收起，`tel:4000358805`）、客服 sheet 打开 / 「知道了」关闭、外部点击关闭均可用；S01 Escape 不关闭（既有，O01 正常） |
| 5 | 字号、对比度、裁切、溢出、控制台、本地资源 | 全部 0（仅电话动作在 headless 记 1 次 `tel:` 失败请求，环境预期） |
| 6 | H01 / S5 | 文件哈希与母版相同；两视口 styles / vars / stylesheets / layers / textAudit / errors 指纹与 02B-0 基线相同（H01 自身 <12px 21、对比度 18 为母版既有） |
| 7 | 既有回归 | 见 §5 |
| 8 | 覆盖账本 | 母版 → 候选全量比对 direct 2,552 / inherited 330 / alias 14 / layout 923 / consequence 256 / **unexpected 0**；账本重建与 02B-3 预登记逐字节相同 |
| 9 | 四份 02A 文档 | V1.1「02B-4 同步版」随包交付（`docs/visual/task02a_v1_1/`）；**02B-5A 修订为 V1.1.1**（`2026-10-12_Task02B5A_Doc_Consistency/spec_v1_1_1/`），修正了 V1.1 残留的 5 处与实现不一致的表述（tokens 入层、O01 帮助停靠底栏、金额两段式、每页 3 个 link、token JSON 产出）及另 10 余处（见该目录「原表述→修正表述清单」）。**候选 ZIP 内仍是 V1.1，下次打包同步** |
| 10 | 变更记录与 manifest | CHANGELOG / CURRENT_STATUS / README_CURRENT 登记；manifest 重写，`check_package` PASS，HOLD |

## 4. 业务保护结果

`qa/mk_v3_business_invariants.py`（母版基线 02B-0 探针 → 候选探针，去掉样式 / 几何 / 帮助入口采样字段）：**2,606 个字段 0 差异**。覆盖 S01 六态每卡 kind / id / 名 / 仓型 / 地址 / 路线 / 标签 / 事实 / 价格 / 后缀 / 图片类型 / E存，筛选头 25 项文本，三面板选项、多选 / 快捷 / 翻页结果，定位授权弹层；O01 37 项文本、4 个 sheet 标题 / 确认文案 / 关闭、未勾选提示、授权按钮、进入 O02；电话 handler 源码、客服遮罩开关；错误计数。卡片点击仍进入 S02 门店详情（URL 与基线相同）。

## 5. 回归与失败登记（分类，不只比数量）

| 套件 | 母版（02B-0） | 候选 | 分类 |
|---|---|---|---|
| `tools/run_regression.py` 34 项，manifest 重写前 | 23 PASS / 11 FAIL | 23 / 11，**逐项相同** | 现有失败 11 |
| 同上，manifest 重写后 | — | **24 / 10** | 已修复 1（`check_package`：母版 1 Changed + 7 Unlisted，本轮收口） |
| 10 项现有失败 | `test_s01_filter_sort_refinement_v1.cjs`（`passesQuickFilters` 未定义）、`test_s01_ux_continuity_patch_v1.js`（`demoActivityFor`）、`test_combo_recommendation_v1.cjs`（旧 8 标签池含「免押金」）、`test_combo_full_journey_recovery_v21.cjs`（`quickStoreFilters`）= 夹具过期 4；6 个 Python 浏览器脚本硬编码 `/usr/bin/chromium` = 环境 6 | 同一断言 / 同一错误 | 现有失败 |
| 6 个浏览器脚本 Playwright Chromium 重跑 | `cross_page_runtime_smoke` 26/26、`combo_ux_v2` PASS、`demo_price_closeout` PASS；`home_state_recovery_browser` 37/38（`375 active_new_quote quoted 查看方案 None`）、`home_visual_closeout` 0/2（`store_zone overlap:true hidden:false`）、`combo_recovery_v21`（`demoActivityFor`） | 3 PASS / 3 FAIL，断言逐字相同 | 现有失败 3 |
| 6 个非活动脚本 | `miniprogram_ui_system_v1` PASS、`confirmed_ux_v1` PASS 59、`visual_elevation_v2_controlled_rollout` PASS；`sprint2_transaction_visual`、`sprint1d_s01_visual`、`v27416_global_support_home_cards` FAIL | 相同 | 现有失败 3 |
| 新增脚本 | — | lint PASS；探针全部门槛通过；账本 unexpected 0；业务不变量 0 差异；门店卡检查 0 裁切 | — |

**新引入失败 0。** 日志：`regression/`（shipped runner 前后、6 个重跑、12 个非活动脚本日志）。

## 6. 既有问题（本轮不修，供团队复核）

1. 首页 D-11 帮助碰撞隐藏本机未触发（`test_home_visual_closeout_patch_v1.py` 0/2）；与 Task 01「首页已修」相悖。
2. 首页 `active_new_quote` 用例 375 下按钮目标 None（390 通过）。
3. 4 个夹具过期测试；6 个脚本硬编码 Chromium 路径；两个非活动 body/全文 sha 断言早已过期。
4. S01 上 Escape 不关闭帮助菜单（旧捕获阶段键盘脚本先处理）；触屏无影响。
5. H01 <12px 21 处、对比度不达标 18 处（母版既有，02C 范围）。
6. 包内自带 `outputs/current_regression/results.json`（对方环境）与本机结果不一致（02B-0 §4.3），本轮已被本机结果覆盖。

## 7. 本轮发现并处理的问题

- 帮助入口若按早期方案塞进 O01 底栏同排：375 验算主按钮内宽 161，「¥113,863」只余 2px、八位金额放不下 → 改停靠顶栏（02B-3），底栏维持两按钮。
- 帮助探针在电话动作后偶发 `classList of null`（第 1、2 次运行各 1 例，分别在 390 与 375）：`location.href='tel:…'` 的导航尝试期间节点短暂不可查，属探针竞态；探针改为等待入口回到 DOM（最长 3s），第 3 次运行全部通过；页面本身在两次运行中其余项目均正常。
- `mk_v3_s01_card_check.py` 的「点击进 U01」预期写错：母版与候选都进 S02，以 URL 相同为准。
- lint 输出文案「3 layered files」改为 4（代码本就检查 4 个）。

## 8. 未完成验证

- 微信真机（iOS / 安卓 WebView）：`@layer`、`mask-image`、safe-area、原生日期控件（本机显示 `10/12/2026`）、字体断行、顶栏胶囊真实位置与入口 `right:96px` 的关系。
- 中文日期覆盖与金额运行时拆分按指令暂缓；O01「门店 + 容量」标题列为业务建议未实施。
- `docs/visual/mini_koala_visual_tokens_v3.json` 未生成（02A 计划物），留 Task 02C；别名作用域提升到 `body.koala-ui-v1` 未做，留 Task 02C。
- float 兜底模式只做逻辑自检（02B-3 强制开启：S01 隐藏 11–13/15、O01 6/9；展开不隐藏；各触发点重检），本轮未重跑，默认两页不会进入。

## 9. 回退方式

删除两页 `<head>` 中 `data-ui-system="v3"` 的 link 与 `mk-v3-*.js` 的 script（或用母版覆盖两个 HTML）即回到母版视觉；`<body>` 未改，无其它残留；新增文件可整目录删除。

## 10. 交付清单

| 路径 | 内容 |
|---|---|
| `Mini_Koala_CrossBranch_UX_UI_Phase1_QA_V1_2_MKV3_Pilot_O01_S01_Candidate.zip` | 完整候选（含 `outputs/mk_v3_02b4/` 全部截图与证据），入口 `START_HERE.html`，启动说明 `docs/visual/MK_V3_PILOT_O01_S01_README.md` |
| `Mini_Koala_MKV3_Pilot_O01_S01_Candidate_LITE_no_screenshots.zip` | 同一候选，不含证据 PNG |
| `spec_v1_1/` | 四份 Task 02A 文档 V1.1（02B-4 同步版；已被 `2026-10-12_Task02B5A_Doc_Consistency/spec_v1_1_1/` 的 V1.1.1 取代，候选 ZIP 内尚未同步） |
| `contact/`、`compare/`、`screenshots_after/`、`help_entry/` | 两视口拼图、70 张前后对照、候选原图、帮助入口专项截图 |
| `evidence/` | `probe_before_master.json`、`probe_after_final.json`、`ledger_diff.json`、`business_invariants_diff.json`、`h01_s5_fingerprint_compare.json`、`mk_v3_override_ledger.csv`、`card_check_after.json`、`help_probe_r1/r2.json`、两页 head diff patch、manifest |
| `regression/` | shipped runner 前后日志与 results.json、6 个重跑日志、12 个非活动脚本日志 |
| `MK_V3_PILOT_O01_S01_REPORT.md`、`MK_V3_PILOT_O01_S01_README.md` | 包内报告与说明的副本 |
