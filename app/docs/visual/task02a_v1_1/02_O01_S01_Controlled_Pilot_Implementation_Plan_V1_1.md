# Mini Koala — O01 / S01 Controlled Pilot Implementation Plan

文档 2 / 4 · Task 02A **V1.1（02B-4 同步版）** · 2026-10-12 · 实施前修订 + 按 02B-1/02B-2/02B-3 实际落地同步
前置：文档 1 V1.1；技术机制见文档 3 V1.1；验收见文档 4 V1.1。六项决策已定（文档 1 §7），本版按决策落实。

## V1.1 变更记录

| # | 改动 |
|---|---|
| 1 | §1 判定：取消「S01 浏览态卡高 ≤176」硬门槛；<12px 目标改为两页均 0 |
| 2 | §2.1 文件清单按实际实施更新：S01 辅助脚本改名 `mk-v3-s01-runtime.js`（标签行移动 + 帮助入口停靠 + float 兜底三合一）；验收脚本改为 `qa/mk_v3_pilot_probe.py`（探针）、`qa/mk_v3_override_ledger.py`（账本生成与比对）、`qa/mk_v3_compare_shots.py`（对照图）、`qa/check_mk_v3_css_lint.py`（静态约束）；新增 `docs/visual/mk_v3_override_ledger.csv`、`mk_v3_pilot_baseline_hashes.json` |
| 3 | §3.1 G-8 / §3.3 S-10：S01 帮助入口由「浮动 + 碰撞隐藏」改为「顶栏停靠优先，float 兜底」；G-5/O-8 底栏按三控件重新验算宽度 |
| 4 | §3.3 S-3：确认真实 DOM 父子关系后，标签行跨列必须配合登记的节点移动（文档 1 §4.12 R-3） |
| 5 | §3.2 O-7 中文日期暂缓；S-12 占位角标 11→12px；G-6 促销字色改 `--koala-promo-text` |
| 6 | §5 实施顺序改为 02B 指令 §七 的 7 步，并补「每步先登记账本再改」 |
| 02B-4 | §2 文件清单改为实际文件（4 CSS + 1 帮助入口 CSS + 2 登记脚本 + 7 个只读验收脚本）；§2.2 两页 head 实际挂载顺序；§3.1 G-8 / §3.2 O-6、O-8 / §3.3 S-3、S-10 按实际：帮助入口两页**停靠顶栏**（不进底栏），底栏维持两按钮；S-3 脚本名 `mk-v3-s01-tags.js`；§5 实施顺序对应 02B-0 ～ 02B-4 实际分步 |

## 1. 试装目标与判定

| 试装要验证的问题（Task 02A 提示词 §六） | 判定方法 |
|---|---|
| 公共视觉变量能否稳定生效 | `mk-v3-tokens.css` 挂入后，O01/S01 计算样式中 `--koala-*` 与别名的解析值与文档 1 §1 一致；两尺寸一致 |
| 组件是否可以统一且不破坏原始页面结构 | O01/S01 源文件 `<body>` 字节不变（`mk_v3_pilot_baseline_hashes.json` 比对）；`<head>` 只新增 3 个 `<link data-ui-system="v3">` + 1 个 `<script defer>`；运行时节点移动逐项登记（文档 1 §4.12） |
| 新样式是否存在意外覆盖 | 文档 3 §4 的「覆盖账本」：每条新规则登记它取代的旧规则；账本之外的计算样式差异 = 意外覆盖，必须归零 |
| 信息密度、字号、价格视觉是否改善 | 文档 4 §E 的量化门槛：<12px 可见信息文本 S01 = 0 / O01 = 0；文字实际背景对比度达标；标签不裁切、无横向溢出、无无效留白（卡高由内容撑开，176 只作参考） |
| 能否在不改业务逻辑下形成可复用组件 | 业务 JS 文件哈希不变；组件 CSS 文件（`mk-v3-components.css`）在 O01 与 S01 共用，不含页面专属选择器 |

## 2. 文件改动清单（Task 02B 实际执行时的全部改动）

### 2.1 新增文件（实际：5 个 CSS + 2 个登记脚本 + 7 个只读验收脚本 + 3 个文档物）

| 文件 | 内容 | 作用域 |
|---|---|---|
| `prototype/mk-v3-tokens.css` | **不入层**：`body.koala-ui-v1.koala-o01, body.koala-ui-v1.koala-s01 { --koala-* 扩展 + 8 套旧前缀别名 }` | 试装两页 |
| `prototype/mk-v3-components.css` | `@layer mk-v3 { 页面壳 / Header / 卡壳 / Button / BottomBar / Tag / Chip / PriceBlock / FilterBar / TabBar / Sheet / Toast }`，选择器 `body.koala-ui-v1:is(.koala-o01,.koala-s01) + 现有类名` | 试装两页（挂到别页也不生效） |
| `prototype/mk-v3-page-o01.css` | O01 专属局部（§3.2 标 L 的条目 + 底栏两按钮宽度、`.order-rules` 换行） | `body.koala-ui-v1.koala-o01` |
| `prototype/mk-v3-page-s01.css` | S01 专属局部（§3.3 标 L 的条目） | `body.koala-ui-v1.koala-s01` |
| `prototype/mk-v3-help-entry.css` | 帮助入口停靠 / 下拉 / float 兜底 / 客服 sheet（层内） | 两页 |
| `prototype/mk-v3-s01-tags.js` | 登记脚本 A/B：标签行移到 `.store-head` 末尾；促销标签加 `.mk-promo-tag` | S01 |
| `prototype/mk-v3-help-entry.js` | 登记脚本 R1–R5：帮助入口停靠顶栏、可访问属性、外部点击 / Esc 关闭、float 兜底检测 | 两页 |
| `docs/visual/mk_v3_override_ledger.csv` | 覆盖账本（实施前登记 1,152 条新声明，实施后比对） | — |
| `docs/visual/mk_v3_pilot_baseline_hashes.json` | 改动前两页 head/body sha | — |
| `docs/visual/MK_V3_PILOT_O01_S01_README.md` | 候选包说明、HTTP 启动、回退、复跑 | — |
| `qa/mk_v3_pilot_probe.py` | 验收探针：六态 / 真实路径 / 交互 / 字号 / 对比度 / 溢出 / 帮助入口 / 业务文本 / H01·S5 指纹 | — |
| `qa/mk_v3_help_entry_probe.py` | 帮助入口专项：位置 / 命中 / 采样 / 展开 / 电话 / 客服 / 关闭 / float 兜底 | — |
| `qa/mk_v3_s01_card_check.py` | S01 门店卡 / 标签行局部检查 | — |
| `qa/mk_v3_override_ledger.py` | 账本生成（build）与 before/after 计算样式差异分类（check） | — |
| `qa/mk_v3_business_invariants.py` | 去掉样式 / 几何字段后的业务文本与交互结果比对 | — |
| `qa/mk_v3_compare_shots.py` | before/after 左右对照图 | — |
| `qa/check_mk_v3_css_lint.py` | 新 CSS 静态约束 + 页面 head/body 完整性（文档 3 §5） | — |

未新增 `mini_koala_visual_tokens_v3.json`（02A 计划物）：token 值已全部写在 `mk-v3-tokens.css` 与文档 1 §1，交接时从这两处导出即可；如团队需要 JSON 形式，留 Task 02C。

### 2.2 修改文件（只动 `<head>`，`<body>` 字节不变；02B-4 核对）

| 文件 | 改动 | 核对 |
|---|---|---|
| `mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html` | ui_system link 后追加 `<link data-ui-system="v3">` ×4（tokens / components / page-o01 / help-entry）+ `<script src="mk-v3-help-entry.js" defer>` | body sha `26361b600958` 与母版相同；`data-ui-system="v1"` 仍 1 次 |
| `mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html` | confirmed_ux link 后追加 `<link>` ×3（tokens / components / page-s01）+ `<script src="mk-v3-s01-tags.js" defer>` + `<link>`（help-entry）+ `<script src="mk-v3-help-entry.js" defer>` | body sha `c0eff0b3a6d5` 与母版相同；v1 仍 1 次 |
| `RELEASE_MANIFEST.json` | `tools/check_package.py --write-manifest` 重新生成（母版原有 1 Changed + 7 Unlisted 的漂移一并收口），`version` 字段改为本候选名，`release_gate` 仍 `HOLD` | — |
| `docs/CHANGELOG.md`、`docs/CURRENT_STATUS.md`、`README_CURRENT.md` | 登记 Task 02B 条目；Release Gate 保持 HOLD | — |
| `docs/visual/MK_V3_PILOT_O01_S01_REPORT.md` | 02B 试装与验收报告 | 新增 |

`data-ui-system="v1"` 保持只出现 1 次（`qa/test_miniprogram_ui_system_v1.cjs` 断言），新 link 用 `data-ui-system="v3"`。

### 2.3 不改的文件

全部 19 个现有 CSS、全部内联 `<style>` 块、全部业务 JS（`mini_storage_business_ssot_v274.js`、`mini_koala_data.js`、`mini_storage_price_gate_v1.js`、`mini_storage_coupon_benefit_v1.js`、`mini_koala_recommendation_policy_v2.js`、`mini_storage_requirement_recommendation_v274.js` 等）、`mini_storage_global_support_v274.js`、`qa/` 现有脚本、`docs/` 决策记录、数据母表。理由：S01 的 QA 脚本直接断言内联 CSS 字符串（如 `.location-unified-box{display:flex`、`.toolbar .inline-filter-sheet.show{display:block!important}`、`top:calc(100% + 5px)!important`），O01/Q01 有全文件 sha 断言（非活动）。

## 3. 修改清单

G = 全局组件升级（写在 `mk-v3-components.css`，O01 与 S01 共用）；L = 页面局部优化（写在 `mk-v3-page-*.css`）；J = 需要少量非业务 JS；B = 业务/文案建议，本轮不实施。

### 3.1 两页共用（G）

| 编号 | 项目 | 现状（实测） | 改法 | 取代的旧规则（账本） |
|---|---|---|---|---|
| G-1 | Token 与别名 | 9 套前缀、3 个墨色、3 个辅助灰、3 个橙 | 文档 1 §1.5 | ui_system `body.koala-ui-v1{--…}` 的 8 条别名（保留，被同名覆盖） |
| G-2 | 页面底与顶栏 | 底 #F8FAF9；顶栏暖色半透 + blur | 顶栏白底 1.0 + `--koala-line` 下描边，去 `backdrop-filter`；高 48 | controlled_rollout `body:has(#payableTotal) .header` / `body:has(#storeList) .header`；sprint2 `.header{height:52px}` |
| G-3 | 卡壳 | 圆角 20 / 0 / 22 三种；首卡 hero 阴影 | 圆角 14，1px `--koala-line`，阴影 card | controlled_rollout `.store`、`.store:first-child`、`.section`、`.order-card`、`.payable-hero` 的 border/radius/shadow |
| G-4 | Button 三档 + Sheet confirm | 见文档 1 §4.2 | 主 48/15/600、次 48 描边、小 36、文字按钮 13 | sprint2 `.bottombar button`、ui_system `.bottombar .primary/.secondary`、内联 `.sheet-confirm` |
| G-5 | BottomBar | 见文档 1 §4.3 | 68 + safe-area，白底 1.0，描边替代阴影，主按钮金额两段式 | sprint2 `.bottombar`、ui_system `.bottombar` |
| G-6 | Tag 三语义 + Chip 两变体 | 见文档 1 §4.5 | 字号 12、三套底色/字色（促销字色 `--koala-promo-text`）、圆角 999/6/8；行内 Chip 32、面板 Chip 36 | confirmed_ux `.store-demo-tags .tag*`、ui_system `.store-demo-tags .tag`、内联块 25 `.store-demo-tags .tag`、refinement `.estore-list-badge` |
| G-7 | PriceBlock L1/L3 + 明细行 | 见文档 1 §4.7 | 数字色 `--koala-price`，后缀 12 灰，L3 白卡 | v274 `.price…{color:var(--v274-orange)}`（别名吸收）、controlled_rollout `.payable-hero`、`#payableTotal{color:#F4C99F}`、ui_system `.price-number{color:var(--koala-price)}` |
| G-8 | 帮助入口 | 16px 文字三行溢出；浮动压住价格 / 标签 / 费用 | （02B-3 落地）启动钮纯图标 22px 线性 SVG + 既有 `aria-label`（文字 span 隐藏）；**两页停靠顶栏**（标题右侧、胶囊左侧）；电话 / 客服以顶栏下方胶囊下拉展开，18px 图标 + 13px 文字；尺寸 44；float 只作兜底。文件：`mk-v3-help-entry.css/.js` | global_support 注入样式 `.mini-global-support*`（含 `button{font-size:9px}`、fixed 定位）、`acceptance_fix_v1.js` 写入的 inline `visibility` |
| G-9 | 图标 | 字符 ⌕ ⌄ › ▾ 📍 ⌂ ▦ ◉ | mask SVG | 内联块 19/25 中对应字符的字号规则（保留字符，视觉替换） |

### 3.2 O01 订单确认页

当前真实路径（U01 → 继续租用）实测：标题「仓位 BJ0112S01A009」20px；meta 13px；费用块深绿渐变 + `#F4C99F` 32px；明细 13px；分区标题 18px；`.section` 透明无圆角（ui_system 的白卡被 controlled_rollout 取消）；底栏 73 高、按钮 13px；FAB 在 scrollTop 0 压「管理费 ¥50」；<12px 文本 4 处（11px）。

| 编号 | 类型 | 项目 | 改法 | 业务影响 |
|---|---|---|---|---|
| O-1 | G | 分区卡片化 | `.section` 恢复白卡（圆角 14、描边、阴影 card、padding 16、间距 12）；`.section:first-of-type` 上间距 12 | 无 |
| O-2 | L | 订单主标题区 | `.order-card .unit` 20→18/26；`.meta` 13→14/20 `--koala-text-2`；标题下 12px 分隔线 `--koala-divider` | 无（文案不动） |
| O-3 | G | 费用明细行 | `.row` 14/20，label `--koala-text-3`、值 600 `--koala-text`；行高 44；分隔线 `--koala-divider`；`.monthly-muted` 14/500 | 无 |
| O-4 | G | 本次应付 L3 | `.payable-hero` 白卡 + 32px `--koala-price` 金额（¥ 20px）；左标签 14 `--koala-text-2`；下方 8px 接明细 | 无（`#payableTotal` 文本由业务 JS 写入，不动） |
| O-5 | L | 分区标题 | `.section h2` 18→17/24；「支付后 / 存放须知 / 支付确认」三块的内卡（`.pay-after`、`.storage-notice`、`.agreement`）统一 `--koala-surface-2` 底、圆角 10、padding 12，不再三种底色 | 无 |
| O-6 | J | 帮助入口停靠（R1） | （02B-3 落地）`mk-v3-help-entry.js` 把 `#miniGlobalSupport` 移进 `.header`，停靠在标题右侧、胶囊占位左侧（375 下 x235–279）；**不进底栏**（验算见文档 1 §4.3：同排第三控件在 375 下只剩 2px 余量）。按钮 id、点击行为、遮罩 sheet 全部沿用；实测 O01 9 个采样可见碰撞 0、永不隐藏 | 无（帮助功能与导航不变） |
| O-7 | （暂缓） | 用仓时间显示中文 | **本轮不做**（02B 指令 §三-4）：保留原生 `input[type=date]` 及其原有行为（本机 Chromium 显示 `10/12/2026`，微信真机显示系统日期选择器），只样式化外框 36 高 / 圆角 8 / 描边。验收记录标「原生控件，待真机复核」 | 无 |
| O-8 | G | 底栏 | G-5；**两按钮**（帮助入口不进底栏）：次按钮 `flex:0 0 auto`（min 104；实测 375 下 108、390 下 112）、主按钮 `flex:1`（实测 229 / 238），不再用 38%/剩余；gap 10；≤380px 按钮内距 8。主按钮 15px/600，文本由业务 JS 写入，单行 `white-space:nowrap`、`overflow:visible`；实测「确认并支付 ¥113,863」159px 在内宽 227 / 236 内单行不裁切、不缩字、不压点击区。两段式金额需要改 DOM，不做 | 无 |
| O-9 | L | 协议勾选 | `#agreeContract` 原生 checkbox 20×20 `accent-color: var(--koala-brand)`；协议文字 14/20；「点击协议名称…」12 | 无 |
| O-10 | L | 顶栏 | G-2；返回箭头 SVG | 无 |
| O-11 | B | 标题文案 | 建议主标题改「惠新西街店 · 4.7m³ 仓位」、仓号降为副文。**不实施**，列入业务建议清单 | 文案变更需产品确认 |
| O-12 | B | 「结算价格快照（评审字段）」区 | `.review-only{display:none}` 现状保留 | — |

O01 直接 URL 打开时因缺 Price Snapshot 显示「报价待确认」（D-01 残留），视觉验收必须走 U01→继续租用（含优惠券行：实测有「优惠券 · 新客租仓券 -¥200」「优惠后租金 ¥3,240」）。

### 3.3 S01 附近门店页

当前实测（浏览态，已定位）：前置区 216px（定位搜索框 44 + 估算条 48 + 筛选条 38 + 快捷 Chip 40 + 间距）；卡 190 高；服务标签 10px；路线 11px；`.compact-filter-btn` 11px 无描边；Chip 40 高 16px 字；E存卡深绿 badge 9.5px、深绿胶囊链接 10.5px；FAB 碰撞 6 处；<12px 文本 123/194。

| 编号 | 类型 | 项目 | 改法 | 业务影响 |
|---|---|---|---|---|
| S-1 | G | StoreCard 卡壳 | G-3：圆角 14、描边、card 阴影、首卡不再 hero 阴影；padding 12 | 无 |
| S-2 | G | 卡内字号 | 名 16；仓型标签 12；地址 13；路线 13；label 12；数值 18；价格 20 + 后缀 12 | 无 |
| S-3 | L+J | 服务标签行布局（登记 A） | 真实 DOM：`.store-head(grid) > .store-main > .store-demo-tags`，嵌套节点设 `grid-column` 无效（02B-2 核实）。`mk-v3-s01-tags.js` 把该节点移到 `.store-head` 末尾，CSS `grid-column:1/-1`；标签 12px、圆角 6、允许换行（实测四标签一行 317px 放下、0 裁切、0 横滚）；列表重渲染后由 childList 观察器自动重做 | 无（标签文本、顺序、数量、aria-label、卡片点击不动；点击仍进入 S02，URL 与基线相同） |
| S-4 | G | 价格 L1 | `.browse-unit-price` / `.contract-price` 数字 20 `--koala-price`，后缀 12 灰；右对齐 | 无 |
| S-5 | G | FilterBar | 文档 1 §4.6：40 高、13px、竖分隔线、选中态 | 无（三项顺序、面板锚定、`aria-expanded` 逻辑不动） |
| S-6 | G | 快捷 Chip | 32 高、13px、选中态浅绿；`aria-pressed`/`.active` 驱动 | 无（交集逻辑不动） |
| S-7 | L | 前置区留白 | 定位搜索框 44→44（不变）、估算条 48→44（13px 标题 + 12px 说明合一行）、筛选条 38→40、Chip 40→32、间距 8；前置区 216→约 196 | 无 |
| S-8 | L | E存卡 | 去渐变与装饰弧线（refinement `.estore-list-card:after`），改白卡 + 左侧 `--koala-brand-tint` 色条或 48px 线性图标；标题 17；badge「不限门店」改事实标签 12；「了解考拉E存 ›」改文字按钮 13 `--koala-brand`；兜底首位 `.fallback-first` 用 1px `--koala-brand-200` 描边区分 | 无（插入位置与触发规则不动） |
| S-9 | G | TabBar | 文档 1 §4.8：56 + safe-area、SVG 图标、12px 文字 | 无 |
| S-10 | J | 帮助入口（R1–R5） | **优先位置避让**（02B-3 落地）：`mk-v3-help-entry.js` 把 `#miniGlobalSupport` 停靠在顶栏**标题右侧、胶囊左侧**（与 O01 一致，不用 02A 草稿的左槽），与列表内容永不重叠、永远可见，动作从顶栏下方弹出。**兜底 `float` 模式**：浮动 + 几何碰撞隐藏（目标集合含价格/标签/链接/箭头/Tab/按钮；首屏、`.page` 真实滚动容器、document 捕获滚动、resize、`#storeList` 重渲染、类变更、点击后、1.5s 定时重检；展开态不隐藏；连续隐藏 >3s 换位）。首页 D-11 只作参考实现，本轮独立验证（强制 float 实测 S01 隐藏 11–13/15 采样，故不作默认） | 无（电话/客服动作与遮罩 sheet 沿用） |
| S-11 | L | 定位搜索框 | 内层「搜索小区/门店」入口去掉灰底内框（实测与外框双层），改为单框 + 竖分隔线（参考图 B）；占位色 `#777F7A`；pin/搜索/chevron 图标 SVG | 无（`#locationBar`、`#locationSearchEntry` 两个独立点击区不动） |
| S-12 | L | 占位图 | 无实景门店统一 `--koala-surface-2` 底 + 24px 线性仓门图标；角标 12px（V1.1） | 无 |
| S-13 | L | 「继续加载更多门店」 | 13px 文字按钮、高 44、上下 12 | 无 |
| S-14 | G | 顶栏 | G-2 | 无 |
| S-15 | B | 单卡标签上限 | DS V1 写 3，演示池 2–4。不改数量；请团队确认是否修订 DS V1 | — |

S01 六个评审状态（unlocated / browse / estimated / nomatch / extended / far）与定位授权弹层（微信样式、`#07C160` 按钮）均不在改动范围；授权弹层保持微信样式。

## 4. 业务/文案建议清单（不实施，单独提交）

1. O01 主标题以「门店 · 容量」为主、仓号为副。
2. O01「结算价格快照（评审字段）」是否在演示包中彻底移除 DOM（当前只是 `display:none`）。
3. S01 单卡标签上限：DS V1 的 3 与演示池 2–4 二选一。
4. S01 搜索占位「搜索小区、商圈或门店」与参考图「搜索小区/门店」统一哪一个。
5. 首页统计数字口径（Task 01 遗留）。

## 5. 实施顺序（Task 02B 实际分步：02B-0 ～ 02B-4）

| 步 | 内容 | 产出 | 门槛 / 结果 |
|---|---|---|---|
| 02B-0 | 核对母版（文件名、manifest、zip sha256 `e3579ac9…0015741`），独立工作副本，改动前探针（S01 六态 / O01 真实路径 / H01·S5，两视口）、head/body/prototype 哈希、回归（shipped runner 23/11 + 6 个浏览器脚本 Playwright 重跑 3/3）、冻结口径 12 条 | `2026-10-12_Task02B0_Pilot_Prep_Baseline/` | 母版 diff 无差异；统计口径修正（02A 的 22/12、7 环境 → 23/11、6 环境） |
| 02B-1 | tokens + 公共组件 + O01 局部（白卡、应付白卡橙字、14px 明细、顶栏、协议、底栏两按钮）；账本预登记 | `2026-10-12_Task02B1_O01_Pilot/` | O01 <12px 4→0、对比度 17→0、长金额单行、业务文本逐字相同、账本 unexpected 0 |
| 02B-2 | S01 局部（卡壳、字号、标签 6px 矩形 + 登记脚本 A/B、价格、筛选条、Chip、Tab 图标、E存卡） | `2026-10-12_Task02B2_S01_Pilot/` | 浏览 / 需求 / 无匹配 <12px 54/50/12→0、对比度 5/5/4→0、业务差异 0 |
| 02B-3 | 两页帮助入口专项（顶栏停靠、图标化、可访问属性、float 兜底） | `2026-10-12_Task02B3_Help_Entry/` | 可见碰撞 S01 12–13→0、O01 5–7→0；电话 / 客服 / 关闭可用；账本 +123 unexpected 0 |
| 02B-4 | 联合验收（六态、筛选、分页、E存、授权、O01 真实路径→O02、帮助入口、字号、对比度、溢出、错误、H01/S5 不变、回归分类、账本核对）、四份文档 V1.1 同步、manifest、候选 ZIP、验收报告 | `2026-10-12_Task02B4_Joint_Acceptance/` + 候选 ZIP | 见文档 4 §G、§I 与验收报告 |

任一步出现业务变化或新失败，先定位修复再继续；账本出现意外差异先查原因，不得事后补登记掩盖。不扩大到 H01 / S5。

## 6. 不做的事

- 不改 H01、S5 任何文件。
- 不引入 TDesign / Vant / WeUI 任何代码；只对照其规格。
- 不改租期档位、折扣、推荐、价格门禁、优惠券、E存插入规则、筛选顺序、分页。
- 不改任何用户可见文案（含价格冻结词）。
- 不改 Release Gate（02B-4 按指令打包候选 ZIP，HOLD 不变）。
