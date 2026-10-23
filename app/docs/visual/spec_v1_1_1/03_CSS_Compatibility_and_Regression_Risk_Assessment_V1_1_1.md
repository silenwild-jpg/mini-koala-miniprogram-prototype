# Mini Koala — CSS Compatibility & Regression Risk Assessment

文档 3 / 4 · Task 02A **V1.1.1（02B-5A 一致性收口版）** · 2026-10-12 · 只改文档，不改原型 / 脚本

## V1.1.1 变更记录（02B-5A）

| # | 位置 | 修正 |
|---|---|---|
| 1 | V1.1 记录第 3 行 / §3.3 | 交接物不再写「token JSON」：`mini_koala_visual_tokens_v3.json` 未生成、留 02C；当前交接物 = `mk-v3-tokens.css` + 文档 1 §1 对照表 + 组件规格 |
| 2 | §4 / §5 | 层文件数「三个」改为**四个**（components / page-o01 / page-s01 / help-entry），与 §3.2、lint 实际一致 |
| 3 | §6 R3 | 标注已由 S-3 标签行全宽方案解决 |

## V1.1 变更记录

| # | 改动 |
|---|---|
| 1 | §3.1 修正级联层机制表述：不再说「压过页面里全部 5,500 余处 !important」；改为「压过**未分层样式表**中的重要声明」，并列出实施前必须核对的三件事（其他级联层、元素 style 属性中的重要声明、动态写入样式）与核对结果 |
| 2 | §3.2 tokens 文件不入层（自定义属性靠特异度生效；入层反而需要给每个变量加 !important）；层内只对取代旧重要声明的属性加 !important，新增伪元素上的声明不加 |
| 3 | §3.3 明确：级联层与 mask-image 是 HTML 原型的过渡实现，不宣称新增 CSS 可直接迁移为 WXSS；交接物是 token 值（`mk-v3-tokens.css` + 文档 1 §1 对照表）+ 组件规格（V1.1.1：JSON 形式未生成，留 02C） |
| 4 | §4 账本改为「实施前登记预期变化，实施后比对」；比对分类加入继承、布局、换行、伪元素的连带影响；意外差异先查原因 |
| 5 | §5 静态检查改为解析选择器与声明，不再「禁止所有 # 字符」；字号归零只允许带 `icon-zero` 标记的纯图标替换 |
| 6 | §6 新增 R16（停靠态误隐）、R17（底栏三控件宽度）；R13 更新为已接受 |
| 7 | 基线口径修正见文档 4 V1.1 §B：12/34 → 实为 **23 PASS / 11 FAIL**，环境类 6 项不是 7 项 |
| 02B-4 | §3.2 层文件改为 4 个（含 `mk-v3-help-entry.css`），声明统计按最终账本：1,152 条新声明、1,061 条 `!important`、91 条普通、915 条有旧规则匹配；§4 账本比对改为对母版基线（02B-0）的一次性全量比对结果；§5 lint 约束第 6 条按实际挂载（4 link + 1–2 script）；§6 R13 / R16 / R17 按最终落地更新，新增 R18（tel: 导航探针竞态）、R19（S01 Escape 被旧键盘脚本拦截） |
范围：O01 / S01 试装涉及的样式层叠、`!important`、内联 CSS、多层覆盖、状态选择器；最小化修改方案；回归风险。

## 1. 两页的样式层现状（实测）

| 项 | O01 | S01 |
|---|---|---|
| 内联 `<style>` 块 | 9 块，`!important` 230 处（sprint2 两块各 66、h01-migration 53） | 27 块，`!important` 1,110 处（sprint1d 590、inline-filter-compact-location-v2 153、h01-migration 89、beike-filter 46） |
| 外链 CSS（按顺序） | controlled_rollout（438）→ refinement_patch（185）→ coupon_benefit（11）→ **ui_system_v1（98，最后）** | harmonization（48）→ controlled_rollout → refinement_patch → store_top_patch（130）→ phase2_ux（0）→ ui_system_v1 → **confirmed_ux_v1（21，最后）** |
| 内联与外链的顺序 | 全部内联在前，外链在后 | 内联块 0–19 在 harmonization 之前；块 20–26 夹在外链之间；ui_system 不是最后一个 |
| 作用域机制 | ui_system 用 `body.koala-ui-v1.koala-o01` 类作用域（特异度 0,3,x） | 同左 + `body.koala-ui-v1.koala-s01` |
| **ID 级特异度规则** | controlled_rollout / refinement_patch 用 `body:has(#payableTotal) …`（`:has()` 取参数特异度，= 1,1,x） | `body:has(#storeList) …`（1,1,x） |

括号内为该文件 `!important` 数量。

## 2. 核心问题：ui_system 的类作用域打不过 `:has(#id)`

### 2.1 现象

- O01：ui_system 写了 `.section` 白卡 14px 圆角、`.payable-hero` 浅绿 12px 圆角；实测 `.section` 透明、圆角 0、暖色上描边；`.payable-hero` 深绿渐变 22px 圆角 + `#F4C99F` 32px 米色字。全部来自 controlled_rollout 的 `body:has(#payableTotal) …` 规则。
- S01：E存 badge 9.5px 白字深绿底（refinement `body:has(#storeList) .estore-list-card .estore-list-badge`），首卡 `0 14px 38px` 大阴影（`body:has(#storeList) .store:first-child`）。

### 2.2 原因

同为 `!important` 时比特异度：`body:has(#payableTotal) .payable-hero` = (1,1,1)；`body.koala-ui-v1.koala-o01 .payable-hero` = (0,3,1)。ID 级永远赢，**与加载顺序无关**。所以「把新 CSS 挂在最后一个 link」对这些规则无效。

### 2.3 实证（`evidence/layer_probe.json`，真实页面注入，未改文件）

| 检查点 | 基线 | 同选择器、挂最后、`!important`（普通文件） | 同选择器放进 `@layer mk-v3` |
|---|---|---|---|
| O01 `.payable-hero` 背景 | 深绿渐变 | **仍是深绿渐变**（没生效） | 白 `#FFFFFF` ✓ |
| O01 `.payable-hero` 圆角 | 22px | 22px | 14px ✓ |
| O01 `#payableTotal` 颜色 | `#F4C99F` | `#F4C99F` | `#B85A16` ✓ |
| O01 `.section` 背景 / 圆角 | 透明 / 0 | 透明 / 0 | 白 / 14px ✓ |
| S01 `.estore-list-badge` 字号 / 底 | 9.5px / `#183E30` | 9.5px / `#183E30` | 12px / `#EAF3ED` ✓ |
| S01 `.store` 阴影 | `0 14px 38px` hero | 不变 | `0 4px 16px` ✓ |
| S01 `.store-demo-tags .tag` 字号 | 10px | 12px ✓（这条旧规则没有 ID 特异度） | 12px ✓ |

截图：`evidence/O01_layer_feasibility_375.png`、`evidence/S01_layer_feasibility_375.png`。

### 2.4 变量别名能解决一部分，不能解决全部

ui_system 已在 `body.koala-ui-v1` 上把 `--ve2-paper`、`--vb-bg` 等别名指向 `--koala-bg`，所以 controlled_rollout 的 `.page{background:var(--ve2-paper)}` 虽然赢了特异度，解析出来仍是 koala 的近白——这就是 O01/S01 页面底已经是 `#F8FAF9` 的原因。但 controlled_rollout 里深绿渐变 `#183E30→#245841`、`#F4C99F`、`#A9A299`、E存卡的 `#F3EFE7` 渐变都是**字面值**，别名对它们无效。两文件对 S01 的 `body:has(#storeList)` 规则共 51 条（controlled_rollout 39 + refinement 12），对 O01 的 `body:has(#payableTotal)` 规则共 17 条（12 + 5），合计 68 条；其中用字面色值的约 20 条（深绿渐变、`#F4C99F`、`#A9A299`、E存卡渐变、`rgba(255,255,255,.x)` 系列）别名无效，必须由组件层覆盖。

## 3. 推荐机制：`@layer mk-v3` 级联层 + 覆盖账本

### 3.1 为什么是级联层

CSS 级联顺序里，**带 `!important` 的声明：已命名层 > 未分层**；未分层样式表的 `!important` 在所有分层 `!important` 之后比较。因此把新规则放进一个明确命名的层 `@layer mk-v3 { … }`，其中的 `!important` 声明会压过**未分层样式表**（内联 `<style>` 块、补丁外链、ui_system、脚本注入的 `<style>`）里的 `!important`，**不比特异度、不比顺序**。

它**不是**无条件覆盖全部旧样式。按级联顺序，仍有三类东西可以赢过层内重要声明，实施前必须逐项核对（V1.1）：

| 核对项 | 为什么 | 02B 核对结果（两页） |
|---|---|---|
| 是否已存在其他级联层 | 多个命名层之间的重要声明按声明顺序**反向**比较，先声明的层赢 | 探针 `layers` 项：O01 / S01 / H01 / S5 的全部样式表中 `CSSLayerBlockRule` / `CSSLayerStatementRule` 为 **0**；mk-v3 是包内唯一的层 |
| 元素 `style=""` 属性里的 `!important` | 属性内重要声明高于任何样式表 | grep 两页源码与运行时 DOM：**0 处**。脚本写入的 `style` 属性都是普通声明（如 `acceptance_fix_v1.js` 对 `#miniGlobalSupport` 的 `visibility`），输给层内重要声明 |
| 动态写入的样式 | 脚本 `document.head.appendChild(style)` 的规则默认未分层 | `global_support_v274.js` 注入 `<style>`、`acceptance_fix_v1.css`、`acceptance_v11_*.css`、`coupon-v1-runtime-style`、language-patch 的 qa-visibility 规则：全部未分层 → 被层内重要声明覆盖 |

核对通过后，机制才成立。这意味着：

1. 新规则可以用最低特异度写（`body.koala-ui-v1 .tag`），不需要为了打赢旧补丁而堆类、堆 ID、堆 `:has()`。
2. 新文件挂在 head 任何位置都生效（仍建议挂最后，便于阅读）。
3. 旧规则一条不删、一字不改；QA 对内联 CSS 字符串的断言全部保持。
4. 后续「压平」（Task 03）时，账本里被取代的旧规则可以直接删除，删完后 `@layer` 包装也可以去掉——它是 **HTML 原型的过渡机制**，不是永久结构，也不是可迁移产物。

这不是「继续增加覆盖优先级」：特异度战争停止，新层内部回到正常的「低特异度 + 源顺序」写法。

### 3.2 层内约定

- **tokens 文件不入层**（V1.1）：`mk-v3-tokens.css` 只含自定义属性，选择器 `body.koala-ui-v1.koala-o01, body.koala-ui-v1.koala-s01`（0,3,1）按普通特异度就赢过 ui_system 的 `body.koala-ui-v1`（0,1,1）与内联 `:root`（0,1,0）。若把它放进层，层内普通声明反而输给任何未分层普通声明，就得给每个变量加 `!important`，没有必要。
- 单层 `@layer mk-v3`，**四个**样式文件按 components → page → help-entry 顺序挂入，层内后者覆盖前者（同层内按正常特异度与顺序比较）。
- **只对需要取代旧重要声明的属性加 `!important`**（V1.1），理由记在账本的 `important` 列；新增伪元素（`::before` 图标、分隔线）上的声明、以及旧样式没有碰过的属性保持普通声明。02B-4 最终账本：四个层文件 1,152 条声明中 1,061 条带 `!important`（915 条有旧规则匹配，其余为取代层内 / 旧脚本写入值或与旧重要声明同属性），91 条普通声明（新增伪元素与旧样式未碰过的属性）。
- 禁止：`:has()`、ID 选择器、`:root`、`backdrop-filter`、`@supports`、复杂 grid 子网格；允许：类、属性选择器（`[aria-pressed="true"]`、`[aria-expanded="true"]`）、`::before/::after`、`mask-image`。
- 不定义新的前缀；只用 `--koala-*`。
- 不针对 `.phone/.shell` 之外的页面外壳写规则。

### 3.3 浏览器支持与小程序边界

- `@layer`：Chrome/Edge 99+、Safari 15.4+、Firefox 97+（2022-03 起全平台可用；[caniuse](https://caniuse.com/css-cascade-layers)、[MDN](https://developer.mozilla.org/docs/Web/CSS/@layer)）。本机 Chromium 148 实测通过。微信内置 WebView（安卓 X5 / iOS WKWebView）在 2023 以后的版本均在此范围；演示若需在更老 WebView 运行，见 §3.4 备选。
- 微信小程序 WXSS **不支持** `@layer`、`:has()`、`mask-image` data-URI 与 `env()` 之外的部分写法。**本方案明确为 HTML 原型的过渡实现，不宣称 `mk-v3-*.css` 可直接迁移为 WXSS**（V1.1）。交接物是 token 值（当前以 `mk-v3-tokens.css` 与文档 1 §1 对照表为准；`mini_koala_visual_tokens_v3.json` **本轮未生成，留 Task 02C**，V1.1.1 统一口径）+ 文档 1 的组件规格 + 「HTML 类名 → 小程序组件」对照（MINIPROGRAM_COMPATIBLE_UI_SYSTEM_V1 同一原则）。值得记录的是：现有 controlled_rollout / refinement_patch 的 `:has(#id)` 本身就不可迁移，V3 账本会把它们登记为「HTML 专用，迁移时丢弃」。

### 3.4 备选方案（若团队不接受 `@layer`）

| 方案 | 做法 | 代价 |
|---|---|---|
| B. 页面级退出两份 elevation 文件 | O01/S01 的两条 `<link href="mini_koala_visual_elevation_v2_*">` 加 `media="not all"`（文件仍被引用，`qa/test_visual_elevation_v2_controlled_rollout.js` 的 `includes(cssName)` 断言仍通过） | 这两份文件对 O01/S01 的全部 68 条规则同时失效，其中有一部分是我们想保留的（如 S01 定位框的 pin 图标 mask）；需逐条补回；U01/Q01/M01 等页不受影响 |
| C. 特异度匹配 | 新规则写成 `body.koala-ui-v1.koala-o01:has(#payableTotal) .payable-hero`（1,3,1） | 等于把 `:has(#id)` 反模式再复制一遍；违反 ui_system 的无 `:has` 约定 |
| D. 修改旧文件 | 直接改 controlled_rollout 里的字面值 | 违反「只增不改」；影响 13 个页面；sha/字符串断言风险 |

推荐 A（`@layer`）；B 作为 WebView 兼容性兜底，仅在真机验证不通过时启用。

## 4. 覆盖账本（Task 02B 的核心交付物之一）

**口径（V1.1）**：账本在修改前登记预期变化（`qa/mk_v3_override_ledger.py build` 从**四个**层文件（components / page-o01 / page-s01 / help-entry；V1.1.1 修正，V1.1 写三个）生成，每条新声明查找两页内联块、外链 CSS、global_support 注入样式中同类名同属性的旧规则），实施后用 `check` 把 before / after 探针的计算样式逐选择器逐属性比对，并在真实页面上判定每处差异的来源：

| 分类 | 判定 | 账本内 |
|---|---|---|
| direct | 该元素命中了 mk-v3 层内某条规则，且该规则声明了这个属性 | 是 |
| inherited | 可继承属性（color / font-* / line-height / letter-spacing / white-space / visibility），祖先元素命中了层内规则 | 是（连带） |
| alias | 元素或祖先命中的**旧规则**引用了被 tokens 别名改写的变量（如 `color: var(--ve2-muted)`） | 是（连带） |
| layout | rect / 宽高 / min-height / 位置 的变化，且该属性不是层内直接设置 | 是（布局、换行连带） |
| consequence | 0 宽描边的 `border-*-color` 随 `color` 变化（`currentColor` 默认值）；以 em 写的旧 `letter-spacing` 随字号变化；旧规则写 `inherit` 的属性随父级变化 | 是（连带，02B 实测即为这三种） |
| unexpected | 以上都不是 | **否 → 先查原因**，不得事后补登记 |

格式（CSV，`docs/visual/mk_v3_override_ledger.csv`）：

| 列 | 含义 |
|---|---|
| new_file / new_selector / property | 新规则 |
| legacy_file / legacy_selector / legacy_value | 被取代的旧规则与值 |
| reason | 文档 1 的 token / 组件条目编号 |
| migration | `keep-visual`（迁移时保留视觉）/ `html-only`（如 `:has` 规则，迁移时丢弃） |
| retire_in_task03 | 是否可在压平时删除旧规则 |

Task 02A 已识别的账本条目（两页，按旧文件分组，Task 02B 实施时补齐属性级明细）：

**controlled_rollout.css `body:has(#payableTotal)`（O01）**：`.header`（底色/描边/blur）、`.section`（border/radius/bg/shadow/border-top）、`.order-card`、`.payment-section`（margin-top）、`.payable-hero`（全部）、`.payable-hero span`、`#payableTotal`（color/font-size/letter-spacing，含 380 媒体查询）、`.payment-rows`、`.pay-after/.storage-notice/.agreement`。
**refinement_patch.css `body:has(#payableTotal)`**：`.order-card`、`.order-card>.rows, .payment-rows`、`.agreement`、`.pay-after`、`.storage-notice`。
**sprint2 内联（O01）**：`.header{height:52px}`、`.section{margin/padding/border/radius/shadow}`、`.section h2{18px}`、`.row{13px}`、`.bottombar{…}`、`.bottombar button{14px}`、`.payable-hero b{34px}`（注意 `qa/test_sprint2_transaction_visual.js` 断言该字符串存在，不能删）。
**ui_system（O01）**：`.section`、`.payable-hero`、`.bottombar*`（被同名新规则取代，文件不动）。
**controlled_rollout.css `body:has(#storeList)`（S01）**：`.header*`、`.location-search-combined`（深绿渐变——当前已被内联块 25 的透明底在视觉上抵消，但规则仍在）、`.current-location*`、`.travel-pill`、`.location-search-entry*`、`.toolbar`、`.controls*`、`.coverage-strip/.estimate-strip`、`.store*`、`.store-facts`、`.estore-list-card*`。
**refinement_patch.css `body:has(#storeList)`**：`.estore-list-card*` 13 条（含 `:after` 装饰弧线）。
**confirmed_ux_v1.css**：`.store-demo-tags .tag*` 3 条、`.quick-store-filters*` 3 条。
**S01 内联块 19 sprint1d**：`.store*`、`.store-photo*`、`.fact*`、`.browse-unit-price*`、`.tabbar`、`.tab*`、`.estimate-strip*`、`.list`（约 38 条）。
**S01 内联块 24/25**：`.controls .compact-filter-btn*`、`.store-demo-tags*`、`.location-*`（字号、圆角、颜色部分）。
**S01 内联块 23**：`.contract-price*`、`.card-open-chevron`。

账本之外不得出现计算样式差异（文档 4 §E-4 自动比对）。

**02B-4 全量比对结果（母版基线 02B-0 → 最终候选，两页 × 两视口 × S01 六态 + O01 真实路径 / 直连）**：direct 2,552 / inherited 330 / alias 14 / layout 923 / consequence 256 / **unexpected 0** / appeared 0 / disappeared 0（`outputs/mk_v3_02b4/after/ledger_diff.json`）。alias 14 处是旧规则引用被别名改写的变量（如 `var(--ve2-muted)`）所致，均在账本「别名」范围内。

## 5. 最小化修改方案与静态约束（`qa/check_mk_v3_css_lint.py`）

1. **四个**层文件（components / page-o01 / page-s01 / help-entry；V1.1.1 修正）各自必须恰好一个顶层 `@layer mk-v3 { … }` 块，层外只允许注释；tokens 文件必须**不**入层，且只含两页 body 选择器下的自定义属性。
2. **解析选择器与声明后**再判（V1.1）：选择器里不含 `:has(`、ID 选择器（`#` 后接标识符且不在属性选择器内）、`:root`；`backdrop-filter` 只允许 `none`；`@media` 以外无其它 at-rule。颜色值里的 `#RRGGBB`、`url("data:image/svg+xml…")` 里的 `#` 不算 ID 选择器。
3. 非自定义属性的声明值不含十六进制字面色（SVG data-URI 内除外）；颜色只允许 `var(--koala-*)` 或阴影/遮罩的 `rgba()`。
4. `font-size` 不得小于 12px；`font-size: 0` 只允许出现在带 `icon-zero` 标记注释的声明上（纯图标替换：返回箭头、筛选 chevron、Tab 图标、FAB 图标、定位 pin、搜索、卡片箭头），lint 逐条核对，不能落在文字标签上。
5. 新选择器只能使用两页现有类名（白名单由脚本从两页 HTML + `makeCard()` / `makeEStoreListCard()` 模板提取）；出现白名单外类名即失败——保证「优先兼容现有 DOM 结构和类名」。
6. 两页 `<body>` 字节与基线相同；`<head>` 只允许新增 `<link data-ui-system="v3">`（实际 4 个）与登记脚本 `<script src="mk-v3-*.js" defer>`（O01 1 个、S01 2 个）。
7. 业务 JS、现有 CSS、内联块：sha256 不变（由 `tools/check_package.py` 的 manifest 比对兜底，Task 02B 结束时用 `--write-manifest` 重写一次）。

## 6. 具体风险清单

| # | 风险 | 等级 | 证据 | 缓解 |
|---|---|---|---|---|
| R1 | `:has(#id)` 规则让「最后一个 link」策略失效 | 高（已发生） | §2.3 | `@layer`；账本登记 |
| R2 | ui_system `body.koala-ui-v1 button{font:inherit}` 把 FAB 字号从 9px 变 16px，三行溢出 | 中（已发生，可见） | `evidence/O01_375x812.png` 右下 | G-8 图标化；账本登记 |
| R3 | S01 标签升到 12px 后 4 个标签在 215px 列内放不下（第 4 个被裁）——**已解决**（02B-2 S-3：登记脚本把标签行移到 `.store-head` 末尾占全宽，四标签一行 317px、裁切 0） | 中（已解决） | `evidence/S01_layer_feasibility_375.png` | S-3 标签行移到图下全宽；或横向滚动 |
| R4 | S01 `confirmed_ux_v1.css` 在 ui_system 之后加载，且 `.store-demo-tags{overflow:hidden}` | 低 | 文件顺序 | 层内规则统一处理 overflow |
| R5 | 内联 CSS 字符串被 QA 断言（S01 至少 6 处、O01 1 处） | 高（若误改） | `qa/test_s01_inline_filter_location_v2.cjs`、`test_sprint2_transaction_visual.js` | 一字不改旧文件 |
| R6 | S01 `<body>` sha 断言（`test_sprint1d_s01_visual.js`）与 O01 全文 sha（`test_sprint2_transaction_visual.js`） | 低 | 两脚本不在活动清单，且在未改动包上**已经失败**（本机实测），属现有失败 | body 不动；在 CHANGELOG 登记两脚本状态不变 |
| R7 | `RELEASE_MANIFEST.json` 漂移（当前包已有 1 个未登记文件） | 低 | `check_package.py` 基线 FAIL | 02B 结束时 `--write-manifest` |
| R8 | 380px 以下媒体查询（内联块 24/25、sprint2）改字号与边距 | 低 | 代码 | 层内同样提供 `@media (max-width:380px)` 分支；390/375 两尺寸都验证 |
| R9 | `100dvh`、`env(safe-area-inset-bottom)` 在桌面 Chromium 为 0，真机不同 | 中 | 代码 | 真机复核项（文档 4 §H） |
| R10 | 别名映射后 H01/S5 若共享某变量名会连带变色 | 低 | 作用域限定在两页 body class | 02B 顺带截 H01/S5 做无变化比对 |
| R11 | O01 直接 URL 打开显示「报价待确认」（D-01） | 低（已知） | Task 01 | 验收只走真实路径；直接 URL 只做不崩溃检查 |
| R12 | `mask-image` SVG 在旧 WebView 需要 `-webkit-mask` 前缀 | 低 | — | 同时写两个属性 |
| R13 | 帮助入口停靠 JS（R1）移动 DOM 节点进顶栏 | 中（02B 已接受，02B-3 落地） | `mk-v3-help-entry.js` | 节点 id / onclick / aria-label 不变；`qa/test_v27416_global_support_home_cards.js` 在母版上本就失败（现有失败），02B-4 前后结果相同 |
| R16 | 停靠态仍执行几何碰撞判定 → 列表内容从顶栏下滚过被当成遮挡，入口反复消失 | 中（早期试装实测 8/15 采样误隐，已修） | 02B-4：停靠态 `fabScan.hidden` 两页两视口全部 false | 停靠态不执行碰撞判定；只在 float 模式判定；几何相交但被不透明顶栏遮盖的采样按 elementFromPoint 判为非遮挡 |
| R17 | O01 底栏三控件挤压主按钮，长金额缩字或裁切 | 中（已规避） | 375 验算同排第三控件只剩 2px 余量 | **帮助入口不进底栏**，改停靠顶栏；底栏两按钮 108 + 229（375）；探针 `longAmount` 对 ¥13,863 / ¥113,863 断言 `fits:true`（两视口） |
| R18 | 电话动作 `location.href='tel:…'` 在 headless Chromium 记为 1 次失败请求，且导航尝试期间 `#miniGlobalSupport` 可短暂为 null，探针会偶发抛 `classList of null` | 低（探针侧） | 02B-4 两次运行各出现 1 次（390 / 375 各一次，页面状态本身无异常） | 探针改为等待入口回到 DOM 再读状态（最长 3 s）；真机上 tel: 直接拉起拨号，不存在此问题 |
| R19 | S01 上 Escape 不关闭帮助菜单 | 低（既有） | S01 旧捕获阶段键盘脚本先处理了 Escape | 触屏无影响；O01 正常；登记为既有问题，不在本轮修 |
| R14 | `@layer` 在老 WebView 不生效 → 回到基线视觉（不会更差） | 低 | §3.3 | 备选 B |
| R15 | 现有回归基线本身有失败项（见文档 4 §B），容易把旧失败当新失败 | 中 | `evidence/regression_baseline_*.log` | 文档 4 §F 分开登记 |

## 7. 不在本轮解决、留给 Task 03 的问题

- 5,500+ `!important` 与 9 套前缀的「压平」：导出两页最终计算样式 → 生成单一 CSS → 删除内联块与补丁文件。前提是先用账本证明新层已覆盖全部视觉面。
- `:has(#id)` 规则从 13 个页面移除。
- H01 156KB、S5 89KB 内联 CSS 的拆分。
- QA 脚本从「断言 CSS 字符串」改为「断言计算样式」。
