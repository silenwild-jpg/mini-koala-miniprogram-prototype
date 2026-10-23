# Mini Koala — Visual V3 Design Tokens & Component Specification

文档 1 / 4 · Task 02A **V1.1（02B-4 同步版）** · 2026-10-12 · 实施前修订（02B-0）+ 按 02B-1/02B-2/02B-3 实际落地结果同步（02B-4）
对象包：`Mini_Koala_CrossBranch_UX_UI_Phase1_QA_V1_2_Candidate.zip`（RELEASE_MANIFEST「Confirmed UX Merge PATCH V1.1」，Release Gate HOLD，本阶段不改变）
性质：规范与实施准备；V1.1 是 Task 02B 实际试装所依据的版本。

## V1.1 变更记录（只处理 Task 02B 指令 §三 的 5 项，其余内容不变）

| # | 02B 指令 | 本文档改动 |
|---|---|---|
| 1 | 级联层表述 | §4.1 补充：tokens 文件**不入层**（自定义属性靠特异度生效）；层内只对取代旧重要声明的属性加 `!important`；明确为 HTML 过渡实现，不宣称可迁移 WXSS。机制细节见文档 3 V1.1 |
| 2 | 文字对比度 | §1.3 / §1.4 改：普通信息文字（含占位）≥4.5:1、≥20px/700 价格 ≥3:1，取消「占位 ≥4:1」；`#777F7A` 退出；`#B85A16` 只许白底；浅橙底促销小字新增 `--koala-promo-text #A04E12`（5.236:1）；`#6D7671` 只许白底，灰底/页底改 `#59645E`。对比度不四舍五入 |
| 3 | 门店卡高 | §4.4：≤176 改为探索参考；正式要求改为字号达标、信息完整、标签不裁切、无横向溢出、无无效留白，高度由内容撑开 |
| 4 | 组件尺寸与结构约束 | §4.2 Sheet confirm 统一 48；§4.5 Chip 分「行内 32」「面板 36」两个变体；新增 §4.12 运行时调整登记表（节点移动逐项登记）；O-7 中文日期暂缓 |
| 5 | 账本与基线 | 见文档 3 §4、文档 4 §B V1.1 |
| — | 02B 六项决策 | §7 由「待确认」改为「已定决策」，不再提交确认 |
| 02B-4 | 按实际落地同步 | §4.3 BottomBar：O01 底栏**不放第三控件**（375 验算只剩 2px 余量，七位金额裁切），维持两按钮 108 + 229；§4.9 帮助入口：两页统一**停靠顶栏**（标题右侧、微信胶囊占位左侧，`right:96px`），float 只作兜底；§4.12 运行时登记表改为实际脚本 `mk-v3-s01-tags.js`（A/B）与 `mk-v3-help-entry.js`（R1–R5）；§4.4 占位图角标由 `::after` 12px 绘制，源 `<small>` 10px 文字由旧规则 `opacity:0` 隐藏（不可见，不计入字号地板）；§4.5 各值以 02B-4 计算样式为准（无改动） |

## 0. 口径与依据

| 项 | 口径 |
|---|---|
| 视觉方向 | **Mini Koala Visual V3 — Bright Commercial（候选）**：以《Visual Baseline 1.0》（2026-09-29 冻结）和《Design System V1》为基础，向近白底、轻卡片、绿色限面积、橙色价格层级清晰的本地商业小程序风格调整 |
| 品牌绿 | 官方品牌色与考拉 IP 尚未确认。**本规范不定义新的绿色**，主绿沿用 DS V1 `brand.600 #2F6B4F`，次绿用 DS V1 既有梯度（700/500/200/100）。现网截图取色（约 #33B24A）只作参考，不写入 token |
| 公共前缀 | **复用 `--koala-*`**（`mini_koala_miniprogram_ui_system_v1.css` 已定义 10 个），扩展为约 40 个；**不新建第 10 套前缀**。其余 8 套前缀（`--ms-* --v274-* --s01-* --vb-* --ve2-* --s3-* --hc-* --mk-*`）通过别名指向 `--koala-*`（ui_system 已对 8 个变量这样做，本规范补齐） |
| 视觉参考 | 包内 `assets/reference/mini_koala_components_ABCD_reference.png`（A 首页推荐门店 / B 附近门店 / C 定位授权 / D 定位中），团队在 CROSS_BRANCH_UI_PHASE1_MERGE_V1_2 中已指定为版式示例 |
| 现值来源 | 本机 Playwright Chromium 148，375×812 与 390×844，DPR 2，微信 UA，真实 HTTP 运行后读取计算样式（`evidence/probe.json`）。O01 走 U01→「继续租用」真实路径 |
| 设计尺寸 | 375 CSS px 为第一尺寸（= 750rpx），390×844 为第二验证尺寸；px→rpx 换算 ×2 |

本规范中每个值标注三种状态：**沿用**（DS V1 / Baseline 1.0 已有，不变）、**调整**（沿用既有色板但改用法或改档位）、**新增**（既有体系没有、V3 必须补的值，需团队确认）。

## 1. 色彩 Token（新旧对照）

### 1.1 背景与表面

| Token | 当前生效值（实测） | V3 值 | 状态 | 依据 | 适用组件 |
|---|---|---|---|---|---|
| `--koala-bg` 页面底 | `#F8FAF9`（四页 ui_system 已生效；O01/S01 `.page` 实测 #F8FAF9） | `#F8FAF9` | 沿用 | 近白冷灰，已通过 UI System V1 QA；V3 要求「近白、极浅灰白」 | 所有页面 `.page/.shell` |
| `--koala-surface` 卡片 | `#FFFFFF` | `#FFFFFF` | 沿用 | DS V1 bg.surface | StoreCard / UnitCard / O01 section / PriceBlock L3 |
| `--koala-surface-2` 次级分区 | 无（DS V1 `bg.subtle #F7F5F0` 是暖沙色，配米黄纸底） | `#F3F6F4` | **新增** | 纸底换冷近白后，暖沙次级面与底色打架；需要一个冷调次级面。候选值与 `#F8FAF9` 同色相 | 费用明细块、筛选面板分隔区、占位图底 |
| `--koala-brand-soft` 浅绿面 | `#EDF6EF`（ui_system） | `#EAF3ED` | 调整 | 统一到 DS V1 brand.100，减少一套近似值 | 事实标签底、选中态 Chip 底、支付后提示块 |
| `--koala-brand-tint` 极浅绿 | 无 | `#F1F7F3` | 沿用 | DS V1 bg.mutedGreen | 筛选选中态、推荐态卡片底 |
| `--koala-price-soft` 浅橙 | `#FFF0E2`（harmonization 已用） | `#FFF0E2` | 沿用 | DS V1 price.100 / promotion.background | 促销标签底 |
| 深绿实心面 `#183E30→#245841` 渐变 | O01 `.payable-hero`、S01 E存 badge/link、U01/Q01 多处（controlled_rollout `--ve2-deep`） | **退出表面用途** | 调整 | V3「降低深绿大面积实心区块的压迫感」；DS V1「绿色负责品牌与行动，不负责填满页面」 | 仅允许作深色文字（`--koala-brand-700`）或主按钮；不再做卡片/区块底 |

### 1.2 品牌绿

| Token | 值 | 状态 | 用途 | 对比度（白底） |
|---|---|---|---|---|
| `--koala-brand-700` | `#214F3A` | 沿用（DS brand.700） | 深绿标题、事实标签文字、Chip 选中态文字 | 11.9:1（文字） |
| `--koala-brand` (600) | `#2F6B4F` | 沿用（DS brand.600） | 主按钮底、链接、Tab 选中、FAB 底 | 白字在其上 6.29:1 ✓ |
| `--koala-brand-500` | `#3F7D5D` | 沿用（DS brand.500） | 次强调、图标线色 | 4.88:1 ✓ |
| `--koala-brand-200` | `#CFE1D6` | 沿用 | 次按钮描边、选中态描边 | 非文字 |
| `--koala-brand-100` | `#EAF3ED` | 沿用 | 浅绿底 | 700 在其上 8.26:1 ✓ |

**单屏实心绿预算**：主按钮 1 处 + 其它实心绿面 ≤1 处（Tab 选中态、FAB 不计）。O01 现状 2 处（深绿应付块 + 主按钮）→ V3 为 1 处。

### 1.3 价格橙

| Token | 当前生效值 | V3 值 | 状态 | 依据 |
|---|---|---|---|---|
| `--koala-price` 主价格（≥20px） | `#CE6826`（ui_system，白底 3.73:1） | `#D56A1C` | 调整 | 回到 DS V1 price.600，去掉第三个橙；≥20px/700 的大数字按 WCAG 大文本 3:1 可接受（3.55:1） |
| `--koala-price-strong` 小字价格（≤14px） | 无（小字直接用主橙，S01「起」等已改灰） | `#B85A16` | 调整 | DS V1 price.700；白底 4.654:1 ✓。**只许白底**：页底 `#F8FAF9` 4.44、浅橙底 `#FFF0E2` 4.17 均不达 4.5，不得使用（V1.1） |
| `--koala-promo-text` 促销小字（浅橙底） | 无 | `#A04E12` | **新增（V1.1）** | DS price.700 在 `#FFF0E2` 上只有 4.17:1；取同色相加深一档，`#FFF0E2` 上 5.236:1、白底 5.844:1。用于促销标签文字（`.mk-promo-tag`）与任何浅橙底上的 ≤14px 文字 |
| `--koala-price-soft` | `#FFF0E2` | 同上 | 沿用 | 促销标签底 |
| O01 应付金额 `#F4C99F` 米色字 | controlled_rollout 字面值 | **退出** | 调整 | 与 U01「预计下单一次支付」橙色不是一套语言；V3 应付金额 = `--koala-price` 32px 白卡上 |

**价格色规则**：一屏只有一个最高价格层级用 `--koala-price`（≥20px/700，白底 3.555:1，按大文本 ≥3:1 判定）；其它金额用 `--koala-text`（墨色）；「元/月/m³/起」后缀用 `--koala-text-3`（白底），不用橙。

**对比度判定口径（V1.1）**：WCAG 2.x 公式按实际合成背景精确计算，不四舍五入；普通信息文字（含占位文字）≥4.5:1；≥20px/700 或 ≥24px 的价格数字 ≥3:1。不再保留「占位文字只需 4:1」。

### 1.4 中性色

| Token | 当前生效值 | V3 值 | 状态 | 对比度 |
|---|---|---|---|---|
| `--koala-text` | `#202C26`（ui_system）/ `#1F2923`（DS） | `#1F2923` | 调整（二合一） | 15.0:1 |
| `--koala-text-2` | `#59645E`（部分块） | `#59645E` | 沿用 DS text.secondary | 6.16:1 |
| `--koala-text-3` (`--koala-muted`) | `#66746B`（ui_system）/ `#6D7671`（DS）/ `#68716C`（ve2） | `#6D7671` | 调整（三合一） | 白底 4.687:1 ✓；页底 `#F8FAF9` 4.472、`#F3F6F4` 4.308 **不达标**。**只许用在白色表面**（卡内 label / 后缀 / 说明）；页底、`surface-2`、浅绿底上的辅助文字一律用 `--koala-text-2`（V1.1） |
| `--koala-text-disabled` | — | `#B6BCB8` | 沿用 | 仅禁用态 |
| `--koala-line` | `#E4EBE6`（ui_system）/ `#E7E2D9`（ve2 暖线，O01 section 实测） | `#E4EBE6` | 调整 | 冷线配冷底；暖线 `#E7E2D9` 退出 |
| `--koala-divider` | — | `#EEF1EF` | **新增** | 卡内分隔线比外框更浅一档（冷调）；DS `#ECEDE9` 偏暖 |
| 占位文字 `#9AA39D`（S01 搜索占位，2.59:1） | 内联块 25 | `--koala-text-2 #59645E`（白底 6.16、`#F3F6F4` 5.661） | 调整（V1.1） | 占位文字按普通信息文字 ≥4.5:1；`#777F7A`（白底 4.12）退出 |

### 1.5 别名映射（写入 `mk-v3-tokens.css`，不新建 `:root`）

作用域先限定在 `body.koala-ui-v1.koala-o01, body.koala-ui-v1.koala-s01`（试装页），试装通过后提升到 `body.koala-ui-v1`。

```
--bg, --ms-bg, --s01-bg, --vb-bg, --ve2-paper, --v274-bg        → var(--koala-bg)
--card, --ms-surface, --vb-surface, --v274-surface, --s01-paper → var(--koala-surface)
--ve2-paper-2, --ms-sand, --vb-sand                              → var(--koala-surface-2)
--text, --ms-text, --vb-text, --ve2-ink, --v274-text             → var(--koala-text)
--muted, --ms-muted, --vb-tertiary, --ve2-muted, --v274-muted, --s01-muted → var(--koala-text-3)
--vb-secondary                                                   → var(--koala-text-2)
--line, --ms-line, --vb-line, --ve2-line, --v274-line, --s01-line → var(--koala-line)
--primary, --ms-green, --vb-green, --ve2-green, --v274-green, --s01-green → var(--koala-brand)
--vb-green-deep, --ve2-deep, --ms-green-deep, --s01-green-deep  → var(--koala-brand-700)
--soft, --ms-green-soft, --vb-green-soft, --ve2-green-soft, --v274-green-soft, --s01-soft → var(--koala-brand-100)
--ms-orange, --vb-orange, --ve2-copper, --v274-orange            → var(--koala-price)
--vb-orange-deep                                                 → var(--koala-price-strong)
--vb-orange-soft, --ve2-copper-soft                              → var(--koala-price-soft)
```

限制（见文档 3 §2.3）：别名只能改写**通过变量引用**的旧规则；controlled_rollout / refinement_patch 里用**字面十六进制**写死的深绿渐变、`#F4C99F`、`#A9A299` 等不会跟着变，必须由组件层覆盖。

## 2. 字号层级

| 层级 | 当前（实测，375） | V3（px / 行高 / 字重） | 状态 | 适用 |
|---|---|---|---|---|
| display | H01 用，不在试装 | 28 / 36 / 700 | 沿用 | 首页标题 |
| title | O01 `.section h2` 18/26/700；S01 `.header h1` 16/24/700 | 页面标题 17 / 24 / 700；模块标题 17 / 24 / 700 | 调整 | O01 四个分区标题从 18 降到 17，减少与仓位标题（20）的竞争；页面顶栏标题 16→17 |
| card-title | S01 `.store .name` 16/23/700；O01 `.order-card .unit` 20/28/700 | 门店名 16 / 23 / 700；订单主标题 18 / 26 / 700 | 调整 | O01 主标题 20→18，给价格让层级 |
| body | O01 `.row` 13/20 | 14 / 20 / 400 | 调整 | 费用明细行、协议文字（13→14，中国用户小程序常见正文 14） |
| secondary | S01 `.store .area/.route` 11/17 | 13 / 18 / 400 | 调整 | 地址、路线、说明 |
| caption（**地板**） | S01 标签 10/13、`.fact .label` 10/16、`.price-unit` 10/16 | 12 / 16 / 400–500 | 调整 | 标签、价格后缀、事实标签说明、Tab 文字 |
| ~~micro~~（V1.1 取消） | 门店环境角标 9/10；FAB「帮助」9→16 | **12 / 16** | 调整 | 02B 决策：所有可见信息文字 ≥12px，含「门店环境」角标与帮助入口文字。**唯一例外是纯图标替换**：字符图标（⌂ ⌕ ▦ ◉ ⌄ › ‹ 📍 ☎ ◉ ＋）保留在 DOM 中、字号归零并以 mask SVG 显示，每处在 CSS 里带 `icon-zero` 标记注释并由 lint 逐条登记；FAB 启动器改为纯图标 + `aria-label`，电话/客服两个动作按钮文字 12px |

实测 <12px 文本节点：S01 浏览态 123 / 194（标签 28、路线 16、角标 8、仓型 badge 8、地址 8、label 8、后缀 16……），O01 4 / 51。字号地板 12 落地后两页目标均为 **0**（V1.1；02B 探针 `textAudit.lt12` 验证）。

地板定 12 后，S01 门店卡 4 个服务标签在 215px 文字列里放不下（实测第 4 个被裁，`evidence/S01_layer_feasibility_375.png`），因此标签行需要移到图片行下方占全宽。**真实 DOM 是 `.store > .store-head(grid) > .store-main > .store-demo-tags`，标签行是嵌套子节点，给它设 `grid-column` 无效**；V1.1 改为由已登记的非业务脚本把该节点移到 `.store-head` 末尾（见 §4.12 R-3），CSS 再让它跨两列。

## 3. 间距、圆角、阴影

| 项 | 当前（实测） | V3 | 状态 |
|---|---|---|---|
| 页面左右边距 | 16（S01/O01 已是） | 16 | 沿用 |
| 卡片内边距 | S01 `.store` 13；O01 `.section` 16 | 列表卡 12；O01 分区 16 | 调整（4 网格） |
| 卡片间距 | S01 12；O01 分区 margin-top 12 | 12 | 沿用 |
| 卡内分组间距 | 不一 | 8 / 12 两档 | 调整 |
| 圆角 | S01 `.store` 20；O01 `.section` 0（被 ve2 覆盖）；`.payable-hero` 22；按钮 12；Chip 8；标签 5 / 999 | 列表卡 14；O01 分区 14；主卡 16；按钮 12；Chip 8；事实标签 999；服务/促销标签 6 | 调整。同页 ≤3 种圆角（14 / 12 / 6，加 999 胶囊） |
| 阴影 | `.store:first-child` `0 14px 38px rgba(24,62,48,.09)`（ve2 hero），其余 none；O01 `.payable-hero` 同 hero 阴影 | 卡片统一 `0 2px 8px rgba(31,41,35,.05)`；浮层 `0 8px 24px rgba(31,41,35,.12)`；取消「首卡大阴影」 | 调整。V3「清晰、轻盈」，用描边 + 极轻阴影，不用首卡 hero 阴影区分权重 |
| 描边 | 卡片 0 或 1px `#E7E2D9` 暖 | 卡片 1px `--koala-line`；选中态 1px `--koala-brand` | 调整 |

**标签圆角与 DS V1 §8「标签全部胶囊化」的差异**：参考图 B 与 TDesign Tag 默认形态都是圆角矩形；V3 建议仓型事实标签保持胶囊（与现状一致），服务/促销标签用 6px 圆角矩形以区分语义。此条是对 DS V1 的修订，需团队确认。

## 4. 组件规范

每个组件给出：语义与变体 → 当前实现（文件 / 选择器 / 实测值）→ V3 规格 → 依据。实现位置以 O01/S01 为准（试装范围），其它页只标注。

### 4.1 Design Tokens 文件

- 新增 `prototype/mk-v3-tokens.css`：只含 `@layer mk-v3` 内的 `body.koala-ui-v1.koala-o01, body.koala-ui-v1.koala-s01 { --koala-* 定义 + 别名映射 }`。不含任何选择器样式。
- 同步产出 `docs/visual/mini_koala_visual_tokens_v3.json`（在 v1 JSON 结构上增加 `surface2 / divider / priceStrong / textDisabled`，更新 `price` 与 `typography`），作为未来 WXSS 转写的交接物。v1 JSON 保留不改。

### 4.2 Button

| 变体 | 当前实现 | V3 规格 |
|---|---|---|
| Primary | O01 `.bottombar .primary`：48 高、12 圆角、13px/700、`#2F6B4F` 底白字（ui_system + sprint2 共同作用） | 高 48、圆角 12、**15px/600**、`--koala-brand` 底白字；带金额时金额 16px/700 同色；按下 `opacity .9` |
| Secondary（描边） | O01 `.bottombar .secondary`：48 高、白底、`#CFE1D3` 描边、`#2F6B4F` 字 13px | 高 48、白底、`--koala-brand-200` 描边、`--koala-brand-700` 字 15px/500 |
| Small | S01 `.quick-store-filters button` 40 高（confirmed_ux 36 + ui_system 影响）；`.demand .edit` 44 | 高 36、圆角 8、13px/500 |
| Text | O01 `.order-rules button` 11px、`#prohibitedOpen` 11px | 13px/500 `--koala-brand`，行高 20，右侧「›」 |
| Sheet confirm | O01 `.sheet-confirm` 44 高 | **48 高，同 Primary**（V1.1 统一：本规范内凡 48/44 并列处一律取 48；44 只保留给筛选面板里的距离选项 `.quick-distance-option`，作为面板内选项高度，不是按钮规格） |
| Secondary sheet（「暂不授权」） | O01 `#phoneAuthSheet .sheet-confirm + .sheet-confirm` | 48 高，同 Secondary 描边样式 |

依据：DS V1 §7 主按钮 48/12/16-600；中国小程序底栏按钮常见 15–16px；TDesign 小程序按钮 large 为 96rpx（48px）。

### 4.3 BottomBar

| 变体 | 当前实现（母版） | V3 规格（02B 实际落地） |
|---|---|---|
| 单按钮 | S02/U01 `.bottombar`（不在试装） | 内边距 10 16 + safe-area；按钮占满 |
| 双按钮 | O01 `.bottombar`：grid 112px/1fr 被 ui_system 改为 flex 40/60，高 73（实测），白底 .984，上描边 `#E4EBE6`，阴影 `0 -4px 18px` | flex；次按钮 `flex:0 0 auto`（min-width 104，375 下实测 108、390 下 112）、主按钮 `flex:1`（375 下 229、390 下 238）；gap 10；内边距 10 16 max(10, safe-area)；实测总高 69（68 + 1px 描边）；白底 1.0；上描边 `--koala-line`；去阴影 |
| 双按钮带金额 | O01 主按钮文字「确认并支付 ¥3,863」13px 单行 | 主按钮 15px/600 单行（动作 + 金额同一文本节点，由业务 JS 写入，**不拆分**）；`white-space:nowrap; overflow:visible`；≤380px 分支按钮内距 8。实测「确认并支付 ¥113,863」需 159px，主按钮内宽 227（375）/ 236（390），单行不裁切 |
| 第三控件（帮助入口） | — | **不放进底栏**。375 验算：帮助 44 + 间距 8 + 次按钮 106 + 间距 8 后主按钮内宽 161，七位金额只剩 2px 余量、八位金额放不下；且 44 圆钮夹在两个 48 矩形按钮间易与「返回查看仓位」混淆。帮助入口改停靠顶栏（§4.9） |
| 页面底部留白 | O01 `.page` padding-bottom 96（sprint2 媒体查询） | 80px（实测）；滚到底时最后分区底边距底栏顶 11px，内容不被遮挡 |

### 4.4 StoreCard（S01 列表卡）

当前实现（S01 内联 JS `makeCard()` 模板，样式来自内联块 0/1/12/19/23/25 + ui_system + confirmed_ux + controlled_rollout `body:has(#storeList) .store*`）：

| 元素 | 选择器 | 实测（375） |
|---|---|---|
| 卡 | `.store` / `.store.demand-card` | 343×190（浏览）/188（需求），padding 13（需求态 12），圆角 20，白底，首卡阴影 `0 14px 38px` |
| 图 | `.store-photo` / `.cn-store-photo img` | 92×82，圆角 13；5 家有实景，其余米色渐变占位 + 「仓储环境」角标 9px |
| 名 | `.store .name` | 16/23/700 `#202C26` |
| 仓型标签 | `.store .badge` | 10/17/600，胶囊，`#EAF3ED` 底 `#214F3A` 字，高 21 |
| 地址 | `.store .area` | 11/17 `#66746B` |
| 路线 | `.store .route` | 11/18 `#59645E`，SVG 车图标（mk-icon-drive） |
| 服务标签 | `.store-demo-tags .tag` | 10/13/600，`#F0F6F1` 底 `#406E52` 字，1px `#DFE3E1` 描边，圆角 5，高 22；2–4 个，容器 overflow hidden |
| 事实区 | `.store-facts` + `.fact` | 两栏，上描边 1px `#E7E2D9`（暖）；`.fact .label` 10/16；`.browse-stock-line strong` 18/24/700 |
| 价格 | `.browse-unit-price .price-number` / `.contract-price .price-number` | 20/26/700 `#CE6826`；后缀 10/16 `#6D7671` |
| 箭头 | `.card-open-chevron` | 21px `#688573` 字符 › |

V3 规格（两种信息密度，**同一 DOM**，只改 CSS）：

| 元素 | 列表密度（S01 浏览态 / 需求态） | 变体差异 |
|---|---|---|
| 卡 | padding 12，圆角 14，1px `--koala-line`，阴影 card，首卡不再特殊阴影；**高度由内容自然撑开，不设上限**。176px 只是 02A 的探索参考值，不是验收项（V1.1）。正式要求：字号全部 ≥12、信息完整（名/仓型/地址/路线/标签/事实/价格逐字与基线相同）、标签不裁切、无页面横向溢出、无无效留白 | 需求态首卡「推荐」badge 保留（现有 DOM） |
| 图 | 96×84（≤380px 时 92×82），圆角 10，`object-fit: cover`；占位 = `--koala-surface-2` 底 + 24px 线性仓门图标；角标「门店环境」由 `.store-photo::after` 绘制 **12px/500**（白底 .92 胶片，`--koala-text-2`）；源 `<small>门店环境</small>` 10px 文字被旧规则 `opacity:0!important` 隐藏，不可见，不计入字号地板（02B-4 核实） | — |
| 标题行 | 名 16/23/700 `--koala-text` + 仓型事实标签（胶囊，12/16，`--koala-brand-100` 底 `--koala-brand-700` 字，高 22，padding 2 8）+ 箭头 20px SVG `--koala-text-3` | — |
| 地址 | 13/18 `--koala-text-3`，单行省略 | — |
| 路线 | 13/18 `--koala-text-2`，分钟数 700 | 未定位态文案不变 |
| 服务标签行 | **移到图片行下方、占卡片全宽**：由登记脚本 `mk-v3-s01-tags.js`（A）把 `.store-demo-tags` 从 `.store-main` 移到 `.store-head` 末尾（§4.12；文本、顺序、数量、aria-label、卡片点击处理器不变，列表重渲染后自动重做），CSS `grid-column: 1 / -1`；标签 12/16/500，圆角 6，`--koala-surface-2` 底 1px `--koala-line` 描边 `--koala-text-2` 字（5.661:1）；高 24；最多显示 4 个（现有演示池规则不动），行允许换行（02B-2 实测四标签一行放下，0 裁切、0 横滚） | 促销语义标签（`.mk-promo-tag`）：`--koala-price-soft` 底 + `--koala-promo-text` 字（5.236:1，V1.1）。演示池里的「特价仓 / 送搬运」两个文本由 `mk-v3-s01-tags.js`（B）加 `.mk-promo-tag`（文本、顺序、数量不变） |
| 事实区 | 上分隔线 `--koala-divider`，两栏；label 12/16 `--koala-text-3`；数值 18/24/700 `--koala-text`；sub 12/16 | 需求态「匹配仓位 / 可选组合」「相近仓体容量」文案与逻辑不动 |
| 价格 | PriceBlock L1（§4.7）：数字 20/26/700 `--koala-price`，后缀 12/16 `--koala-text-3`，右对齐 | 浏览态「参考单价 65元/月/m³起」、需求态「整期租金 · 6个月 6,590元起」口径不动 |

第二张卡（无实景图）与首卡视觉一致，占位图不比实景图抢眼。

### 4.5 Tag / Chip

| 语义 | 当前类名 | V3 规格 |
|---|---|---|
| 事实标签（仓型：社区仓/超级仓/混合仓、推荐） | S01 `.store .badge`；H01 `.store-tags span:first-child` | 胶囊 999，12/16/500，`--koala-brand-100` / `--koala-brand-700`，高 22 |
| 服务标签（近地铁/24小时/电梯直达…） | S01 `.store-demo-tags .tag`；H01 `.store-tags span` | 圆角 6，12/16/500，`--koala-surface-2` 底 + 1px `--koala-line`，`--koala-text-2` 字，高 24 |
| 促销标签（特价仓/送搬运/限时特价/7折） | `.mk-promo-tag`、`.card-corner-badge`、S01 term `small` | 圆角 6，12/16/600，`--koala-price-soft` 底 / `--koala-promo-text` 字（V1.1：`#B85A16` 在浅橙底只有 4.17，不用），高 24 |
| 筛选 Chip — **行内变体**（快捷筛选：特价仓/送搬运/只看单仓） | S01 `.quick-store-filters button`（实测 40 高，16px 字，`#F7F8F7` 底） | **高 32**，圆角 8，13/18/500；默认白底 1px `--koala-line` `--koala-text-2` 字；选中 `--koala-brand-tint` 底 1px `--koala-brand-200` `--koala-brand-700` 字 600；`aria-pressed` 驱动（现有 JS 已写 `aria-pressed`，选中类名 `.active` 保留） |
| 筛选 Chip — **面板变体**（服务筛选面板内的多选 pill） | S01 `#filterSheet .pill` | **高 36**，胶囊 999，13/18/500，颜色同行内变体；面板内触控目标比行内大一档。V1.1 明确：32 与 36 是两个变体，不是矛盾 |
| 位置 Chip（最近搜索/热门位置） | S01 `.location-chip` | 同筛选 Chip |
| E存 badge「不限门店」 | S01 `.estore-list-badge`（实测 9.5px 白字深绿胶囊） | 事实标签规格（12px，浅绿底深绿字 8.262:1） |
| E存卖点（上门取送 / 按箱计费…） | S01 `.estore-list-points span` | 服务标签规格（12px，圆角 6，去掉原来的「·」分隔伪元素，改 6px gap 换行排列） |
| 快捷 Chip 实测（02B-4，375） | — | `.quick-store-filters button` 高 32、圆角 8、13/18/500、白底 1px `--koala-line`、`--koala-text-2` 字 |

规则：标签内禁止换行（`white-space: nowrap`）；同卡标签高度统一；单卡可见标签上限按团队口径（DS V1 为 3，S01 演示池为 2–4，**本规范不改数量规则**，只保证 4 个也放得下）。

### 4.6 FilterBar（S01 排序 / 距离 / 服务）

当前：`.controls.compact-filters` 三等分 grid，`.compact-filter-btn` 实测 38 高、11px/650 `#68716C` 字、透明底无描边（controlled_rollout `body:has(#storeList) .controls button` 把描边和底去掉了），展开态 `#F1F7F3` 底 `#24563D` 字；面板 `.inline-filter-sheet` 锚定在条下方（内联块 25，QA 断言字符串，不得改）。

V3：高 40；三格文字 13/18/500 `--koala-text`，当前值非默认时 600 `--koala-brand-700`；chevron 12px SVG；格间 1px `--koala-line` 竖分隔线（`.compact-filter-btn + .compact-filter-btn::before`，伪元素，DOM 不动）；展开态文字 `--koala-brand` + chevron 旋转 180°；条底白、下描边 `--koala-line`。面板样式（圆角 14、阴影 float）沿用。

依据：参考图 B 第二行「推荐排序 / 不限距离 / 服务筛选」即此形态；TDesign DropdownMenu 同构。

### 4.7 PriceBlock

| 层级 | 场景 | 当前实测 | V3 |
|---|---|---|---|
| L1 列表价 | S01 参考单价 / 整期租金；H01 推荐卡 | 20/26/700 `#CE6826`，后缀 10 | 数字 20/26/700 `--koala-price`；「元」随数字同字号；后缀「/月/m³ 起」「起」12/16 `--koala-text-3`；基线对齐；label 12/16 在上 |
| L2 详情价 | U01「预计下单一次支付」、S5 整期总租金（不在试装） | 27–28 | 28/34/700 `--koala-price`，月均 14 `--koala-text-2` |
| L3 应付 | O01 `.payable-hero b` | 32/38/700 `#F4C99F` 米色字，深绿渐变块 | **白卡**（`--koala-surface`，圆角 14，1px `--koala-line`，padding 14 16）：左「本次应付」14/20 `--koala-text-2`，右金额 32/38/700 `--koala-price`，`¥` 20px；块下 8px 接费用明细 |
| 明细行 | O01 `.payment-rows .row` 13/20，金额 650 | label 14/20 `--koala-text-3`，金额 14/20/600 `--koala-text`，右对齐 tabular-nums；折扣行金额 `--koala-brand`（负数）；「月均约」`.monthly-muted` 14/500 `--koala-text-2` |

价格冻结词（参考单价 / 整期总租金 / 月均约 / 预计下单一次支付 / ¥X起）不动。

### 4.8 TabBar（S01 / H01 / M01）

当前：S01 `.tabbar` 62 高，白底 .98，上描边 `#ECEDE9`；`.tab` 10px 字，图标为 Unicode 字符 ⌂ ⌕ ▦ ◉ 16px；选中 `#2F6B4F` 650。H01 用 lucide SVG，M01 用字符。

V3：高 56 + safe-area；图标 22×22 线性 SVG（一套四枚：首页 / 找仓 / 门店 / 我的，2px 描边，圆角端点），文字 12/16/500 `--koala-text-3`，选中态图标与文字 `--koala-brand` 600；白底 1.0；上描边 `--koala-line`；**字符图标用 CSS `mask-image` 的 data-URI SVG 替换**（`.tab .ico { font-size:0; mask:… }`，DOM 不动；S01 内联块 19 路线图标已用同一手法）。H01 的 lucide 图标在 Task 02C 对齐。

### 4.9 Help Entry（全局帮助入口；02B-3 实际落地）

当前（母版）：`mini_storage_global_support_v274.js` 注入 `#miniGlobalSupport.mini-global-support`，fixed `right:10px; bottom:calc(82px + safe)`，44×44 圆，`#2F6B4F` 底白字；注入样式写 `font-size:9px`，但 ui_system 的 `body.koala-ui-v1 button{font:inherit}` 使其变成 16px，「＋帮助」在圆内折三行溢出。碰撞实测（02B-0 基线）：S01 浏览态 15 个滚动采样 12–13 次压住 E存「不限门店」、服务标签、卡片箭头、「继续加载更多门店」；O01 9 个采样 5–7 次压住「管理费 ¥50」「查看重要说明 ›」「支付确认」标题、协议正文。

V3 规格（保留功能与导航，不删除；全部由 `mk-v3-help-entry.css` + 登记脚本 `mk-v3-help-entry.js` 实现，`global_support` 与 `acceptance_fix` 旧脚本不改）：

| 项 | 规格 |
|---|---|
| 位置（两页统一，默认 `header` 模式） | **停靠在顶栏内**：标题右侧、微信胶囊占位左侧，`position:absolute; right:96px; top:2px`，44×44。实测 375 下 x235–279（胶囊从 x290 起，间距 11；标题文字止于 x200），390 下 x250–294（间距 6）。这是小程序自定义导航栏放自定义操作的常规位置。入口在不透明白底顶栏内，列表 / 费用内容从其下方滚过不构成遮挡；永不隐藏 |
| 外观 | 44×44 圆，`--koala-brand-tint` 底 + 1px `--koala-brand-200` 描边 + `--koala-brand` 22px 线性「耳机」图标（mask SVG）；展开时实心 `--koala-brand` + 白色「×」图标。启动钮文字 `span`（「帮助」）隐藏，**可访问名称 = 原 aria-label「展开电话和在线客服」**；字符「＋ ☎ ◉」保留在 DOM 中字号归零（icon-zero 登记 3 处） |
| 展开态 | 两项「电话 / 在线客服」以胶囊下拉形式在顶栏下方展开（`#miniSupportActions`，`role="group" aria-label="客服联系方式"`）；每项 40 高、白底描边、18px 线性图标 + 13px 文字；原 id / onclick / aria-label 不变；展开时顶栏加 `.mk-v3-help-open` 抬高 z-index；外部点击与 Escape 收起（O01 生效；S01 上 Escape 被旧捕获键盘脚本拦截，触屏无影响，登记为既有问题） |
| 旧脚本中和 | `mini_koala_acceptance_fix_v1.js` 仍运行并向入口写 inline `visibility`；停靠态由层内 `visibility:visible !important` 中和（账本登记） |
| 兜底 `float` 模式 | `window.MK_V3_HELP_MODE='float'`、`<html data-mk-v3-help="float">` 或 `?mkv3help=float`；页面无 `.header` 时自动退到 float。浮在 Tab 栏 / 底栏上方右侧，只在与价格 / 标签 / 链接 / 箭头 / 按钮几何相交时加 `.mk-v3-support-obstructed`，离开即恢复；首屏、`.page` 真实滚动容器、document 捕获滚动、resize、orientationchange、`#storeList` 子节点变更（筛选 / 快捷 / 翻页）、body 与 `#locatedContent` 类变更、点击后、1.5s 保险间隔均重检；展开态绝不隐藏；连续隐藏 >3s 切到第二位置（`.mk-v3-help-nudged`）重检。02B-3 强制开启实测：S01 列表上隐藏 11–13/15 采样、最长连续 11 个采样——所以**只作兜底、不作默认** |
| 禁区 | 任何页面入口不得覆盖：主价格、CTA、带语义的标签 / 胶囊、页面底部「加载更多」。停靠态实测两页两视口可见碰撞 0 |

### 4.12 运行时调整登记表（V1.1 新增；02B 指令 §三-4；02B-4 按实际脚本同步）

源文件 `<body>` 字节保持不变；以下由已登记的非业务脚本在运行时做最小视觉调整。每项保留节点标识、事件、焦点操作与业务更新行为；去掉对应 `<script>`（及配套 link）即完全回退。

| # | 页面 | 脚本 | 动作 | 保留 | 不做 |
|---|---|---|---|---|---|
| A | S01 | `mk-v3-s01-tags.js` | 每张 `.store` 的 `.store-main > .store-demo-tags` 移为 `.store-head` 最后一个子节点（直接网格子项，CSS 跨两列并允许换行）；`#storeList` childList 观察器在每次重渲染（筛选 / 快捷 / 翻页 / 状态切换）后重做 | 标签文本、顺序、数量、`aria-label`、`.store` 上的点击 / 键盘处理器（`render()` 绑定在卡片上；实测点击仍进入 S02 门店详情，URL 与基线相同） | 不改 `makeCard()` 模板 |
| B | S01 | `mk-v3-s01-tags.js` | 演示池里文本为「特价仓」「送搬运」的 `.tag` 加 `.mk-promo-tag`（已登记的语义类，见 `mini_storage_visual_harmonization_v1.css`） | 文本、顺序、数量 | 不改标签池 |
| R1 | O01 + S01 | `mk-v3-help-entry.js` | `#miniGlobalSupport` 一次 `appendChild` 进入 `.header`（header 模式） | 元素身份、`#miniSupportLauncher/#miniSupportPhone/#miniSupportChat` 的旧 onclick（绑定在节点上）、aria-label、`#miniSupportMask` 留在 body；焦点顺序 返回(O01) → 标题 → 帮助 → 页面内容 | 不改 global_support 脚本，不改按钮文案 |
| R2 | 同上 | 同上 | 入口加 `mk-v3-help-docked` + `data-mk-v3-help="header"`（float 模式 `mk-v3-help-float`）；`.header` 加 `mk-v3-help-host`，展开时加 `mk-v3-help-open`；float 模式用 `mk-v3-support-obstructed` / `mk-v3-help-nudged` | — | — |
| R3 | 同上 | 同上 | 启动钮 `aria-haspopup="true"`、`aria-controls="miniSupportActions"`、`aria-expanded` 同步；动作容器 `role="group" aria-label="客服联系方式"` | 不新增、不改任何可见文字 | — |
| R4 | 同上 | 同上 | 菜单在入口外点击与 Escape 时收起 | 启动钮原 toggle 不变 | — |
| R5 | 同上 | 同上 | 仅 float 模式的碰撞隐藏与重检（§4.9） | 不改任何业务状态 | 停靠态不执行 |
| — | O01 | （暂缓） | O-7 中文日期覆盖：**本轮不做**，保留原生 `input[type=date]` 及其原有行为；仅样式化外框（36 高 / 圆角 8 / 描边） | — | — |
| — | O01 | （不做） | 金额运行时拆分（动作 / 金额两段式）：**不做**，主按钮保持单一文本节点，避免与业务 JS 写入的金额失去同步 | — | — |

### 4.10 UnitCard（S02，不在试装）

只登记：`.unit-card`（S02 内联）与 harmonization 的 `.unit-card .role.mk-promo-tag`。V3 复用 StoreCard 的卡壳 token（圆角 14、描边、阴影）与 PriceBlock L1；容量、剩余数量、状态标签三要素对应事实标签/促销标签规格。Task 02C 再细化。

### 4.11 页面顶栏（Header）

当前：O01 52 高（sprint2）、S01 48；底 `rgba(250,248,243,.94)` 暖色半透 + `backdrop-filter`（controlled_rollout）。V3：48 高，白底 1.0，下描边 `--koala-line`，标题 17/24/700 `--koala-text`，返回箭头 20px SVG；胶囊占位 `.wx-capsule-space` 不动。

## 5. 图标

- 一套线性 SVG（2px 描边、圆角端点），色随 `currentColor`；以 data-URI + `mask-image` 方式用在 CSS 里，不改 DOM。
- 试装需要的图标：定位 pin、搜索、chevron-down、chevron-right、车/骑行/步行（S01 已有）、首页/找仓/门店/我的、客服/电话、日历、信息 i。
- 不引入 Emoji、不混用实心；S01 `📍 🚗 ⌕ ⌄ ›` 等字符在试装中全部以 mask 替换（字符仍在 DOM 里，`font-size:0` + 伪元素/mask 显示）。

## 6. 对 Task 01 建议的修正落实

| Task 01 建议 | Task 02A 处理 |
|---|---|
| 首页三张推荐卡统一结构 | 不采用。母版三卡差异化规则保留；只统一公共样式、价格排版、图片比例与间距（Task 02C） |
| S01 门店卡压到固定高度 | 不采用。V3 不固定高度，用字号、留白、标签行布局把浏览态卡从 190 降到约 176，首屏露出 2 张整卡（前置区 216 + 2×176 + 间距 < 750 可用高） |
| E存横幅移到列表末尾 | 不采用。保留「推荐排序时插在第 2 卡后 / 兜底时首位」规则，只改样式并解决 FAB 碰撞 |
| 减少服务标签 | 不采用。演示标签池与 2–4 个规则不动 |
| S5 折扣角标并入 chip | 本轮不动 S5 |
| O01 标题改为门店 + 仓型 | 列为业务文案建议（文档 2 §4），不作为视觉修改实施 |
| 删除帮助 FAB | 不采用。改为停靠 + 碰撞隐藏 |

## 7. 已定决策（Task 02B 指令 §二，不再提交确认）

| 项目 | 执行口径（本规范已按此落实） |
|---|---|
| 字号地板 | 所有可见信息文字 ≥12px，含「门店环境」角标与帮助入口文字；纯图标替换为唯一例外（§2，逐条登记） |
| 标签形态 | 服务/促销标签 6px 圆角矩形；仓型事实标签保留胶囊；标签文字与数量不变（§4.5） |
| 中性色 | `--koala-surface-2 #F3F6F4`、`--koala-divider #EEF1EF` 纳入 `--koala-*`（§1.1 / §1.4） |
| O01 应付区 | 白卡 + 橙色大金额 32/38/700 `#D56A1C`，报价逻辑与文案不变（§4.7 L3） |
| 帮助入口 | 图标化；O01 固定停靠底栏；S01 位置避让优先（顶栏停靠），碰撞隐藏为 `float` 模式兜底（§4.9） |
| 品牌资源 | 官方品牌色与 IP 不阻塞；主绿沿用 `#2F6B4F`，使用现有资产（§0） |
