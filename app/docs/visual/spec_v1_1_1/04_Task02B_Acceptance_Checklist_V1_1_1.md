# Mini Koala — Task 02B Acceptance Checklist

文档 4 / 4 · Task 02A **V1.1.1（02B-5A 一致性收口版，已填写结果）** · 2026-10-12 · 只改文档，未重跑验收

## V1.1.1 变更记录（02B-5A）

| # | 位置 | 修正 |
|---|---|---|
| 1 | C-2 | `<head>` 新增 link 为每页 **4 个**（V1.1 写 ×3）+ 登记脚本实际名；「可选 `mk-v3-support-*.js`」标为已废止 |
| 2 | §A | 硬编码 `/usr/bin/chromium` 的脚本为 **6 个**（V1.1 §A 写 7，与 §B 的 6 矛盾） |
| 3 | §B 第 11 行 | `check_package` 母版失败按实际 8 条（1 Changed + 7 Unlisted）登记，不只列 1 个文件 |
| 4 | F-11 | O-7 中文日期覆盖已暂缓，本项标 N/A，不再写「若实施」 |

## V1.1 变更记录

| # | 改动 |
|---|---|
| 1 | §B 基线口径修正：shipped runner 实为 **23 PASS / 11 FAIL**（02A 文档写 22/12 有误；「7 个环境失败」实为 6 个脚本，与「6 个重跑脚本」一致）。11 项按具体断言与根因逐条列出，不再只比数量 |
| 2 | E-1：S01 <12px 目标由 ≤8 改为 **0**（「门店环境」角标也 ≥12）；E-2 取消「占位 ≥4:1」，普通文字含占位 ≥4.5:1、≥20px/700 价格 ≥3:1，不四舍五入 |
| 3 | E-8：取消「卡高 ≤176」硬验收；改为字号达标、信息完整、标签不裁切、无横向溢出、无无效留白 |
| 4 | E-3：FAB 检查除滚动采样外加首屏、底部、展开态、筛选/分页更新；停靠态按「结构上不重叠 + 永不隐藏」判定，不以「隐藏后碰撞为零」充数 |
| 5 | E-4：账本比对改用 `qa/mk_v3_override_ledger.py check` 的五分类；E-5：Chip 32/36 两变体、Sheet 按钮 48 |
| 6 | §G 表脚本名按实际：`qa/mk_v3_pilot_probe.py`（取代 `check_mk_v3_visual_floor.py`）、`qa/mk_v3_override_ledger.py`；非活动脚本基线按母版实测补齐 |
| 7 | §H 证据路径按实际目录；真机复核项保留并明确「未验证即不宣称通过」 |
| 02B-4 | E-3 / E-6 按最终落地：帮助入口两页停靠**顶栏**（不进底栏），O01 底栏两按钮；E-5 Chip 行内 32 / 面板 36、Sheet 48 保持；§G 表填入 02B-4 实际结果（现有失败 / 新引入 / 已修复分开）；§H 路径改为 `outputs/mk_v3_02b4/`；§I 填入判定 |
用途：Task 02B（O01 / S01 试装）完成后的验收表。每项写明执行方式、通过门槛、记录格式。现有失败项与新引入失败项分开登记（§F）。Release Gate 全程 HOLD。

## A. 验收环境

| 项 | 要求 |
|---|---|
| 运行方式 | 本地 HTTP：`python3 -m http.server <port>`（包根目录），URL 前缀 `/prototype/`。不用 file://（可运行，但为统一口径只用 HTTP） |
| 浏览器 | Playwright Chromium（本机 148）；两视口 375×812 与 390×844，DPR 2，`is_mobile`，微信 UA，`locale zh-CN` |
| 页面路径 | S01：`mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html`（+ `?state=estimated&target=16&term=6` 等六态）；O01：先开 `mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html?store=MK_BJ_2CDB7BEE&unit=BJ0112S01A009&sizeOption=MK_BJ_2CDB7BEE__4.72&target=4.8&term=6`，点「继续租用」 |
| 字体 | 本机 Noto Sans CJK；与 iOS PingFang / 安卓字体的断行差异列入 §H 真机复核 |
| 已知环境问题 | 包内 **6 个** Python 浏览器脚本（V1.1.1 修正，V1.1 写 7；与 §B #5–#10 一致）硬编码 `executable_path='/usr/bin/chromium'`，本机无此路径。基线用临时副本去掉该参数后以 Playwright 自带 Chromium 运行（不改包内脚本）。02B 验收同法，或在验收机安装 `/usr/bin/chromium` |

## B. 回归基线（改动前，已跑，`evidence/`）

`tools/run_regression.py`（34 项）在本机对未改动母版的结果：**23 PASS / 11 FAIL**（V1.1 修正；02A 文档误记为 22/12，环境类误记为 7）。11 项失败全部为**现有失败**，按具体断言与根因：

| # | 脚本 | 失败断言 / 错误 | 根因 | 02B 处理 |
|---|---|---|---|---|
| 1 | `test_s01_filter_sort_refinement_v1.cjs` | `ReferenceError: passesQuickFilters is not defined` | 快捷筛选上线后夹具未同步 | 现有失败，不在 02B 修 |
| 2 | `test_s01_ux_continuity_patch_v1.js` | `ReferenceError: demoActivityFor is not defined` | 同上 | 同上 |
| 3 | `test_combo_recommendation_v1.cjs` | `AssertionError` 断言旧 8 标签池含「免押金」 | 标签池已改 | 同上 |
| 4 | `test_combo_full_journey_recovery_v21.cjs` | `quickStoreFilters` 未定义 | 同上 | 同上 |
| 5–10 | `test_home_state_recovery_browser_v11.py`、`test_home_visual_closeout_patch_v1.py`、`test_cross_page_runtime_smoke_v1.py`、`visual_check_combo_recovery_v21.py`、`visual_check_demo_price_closeout.py`、`visual_check_combo_ux_v2.py` | `BrowserType.launch: executable doesn't exist at /usr/bin/chromium` | 脚本硬编码 Chromium 路径 | 用 Playwright 自带 Chromium 跑临时副本（结果见下） |
| 11 | `tools/check_package.py` | 8 条：1 Changed（`qa/test_store_card_unification_v1.cjs`）+ 7 Unlisted（`qa/run_four_page_http_visual_acceptance.py`、`README_CROSS_BRANCH_CONTINUE.md`、`RUN_FOUR_PAGE_QA.cmd`、`docs/*_V1_2.*` 等；V1.1.1 按 02B-0 §1 补全，V1.1 只列了最后一行） | 母版 manifest 漂移 | 02B-4 末尾 `--write-manifest` 重写，已转 PASS |

6 个浏览器脚本用 Playwright Chromium 重跑：

| 脚本 | 结果 | 性质 |
|---|---|---|
| `test_cross_page_runtime_smoke_v1.py` | PASS 26/26 | — |
| `visual_check_combo_ux_v2.py` | PASS | — |
| `visual_check_demo_price_closeout.py` | PASS | — |
| `test_home_state_recovery_browser_v11.py` | 37/38 FAIL | **现有失败**：1 项「active_new_estimated」用例断言首页 CTA 文案（首页状态恢复），与两页无关 |
| `test_home_visual_closeout_patch_v1.py` | 0/2 FAIL（`store_zone.overlap:true, hidden:false`） | **现有失败**：首页 FAB 碰撞隐藏在本机内联运行下未触发（D-11 在本机不生效，与 Task 01「首页已修」相悖，需团队复核）。这也是 02B 不直接采信 D-11 实现的原因 |
| `visual_check_combo_recovery_v21.py` | FAIL（`demoActivityFor` 未定义） | 现有失败（夹具） |

**02B 通过门槛：以上 PASS 项保持 PASS；以上 FAIL 项状态不变；不得出现新的 FAIL。** 任何新 FAIL 必须在 §F 表中标「新引入」并修复或说明。

## C. 结构与文件完整性

| # | 检查 | 方法 | 门槛 |
|---|---|---|---|
| C-1 | O01 / S01 `<body>…</body>` 字节不变 | sha256 比对基线 | 相同 |
| C-2 | `<head>` 差异只含新增 `<link data-ui-system="v3">` **×4**（tokens / components / page-* / help-entry）+ 登记脚本 `<script defer>`（O01：`mk-v3-help-entry.js` 1 个；S01：`mk-v3-s01-tags.js`、`mk-v3-help-entry.js` 2 个）。〔已废止〕V1.1「×3 + 可选 `mk-v3-support-*.js`」 | `diff` head 段（`evidence/O01_head_diff_final.patch`、`S01_head_diff_final.patch`） | 无其它差异（02B-4 实测通过） |
| C-3 | `data-ui-system="v1"` 每页仍恰好 1 次 | grep | 1 |
| C-4 | 19 个现有 CSS、全部业务 JS、`mini_storage_global_support_v274.js`、`qa/`、`docs/` 决策记录 sha256 不变 | manifest 比对 | 相同（manifest 本身在 02B 末重写） |
| C-5 | 新 CSS 通过 `qa/check_mk_v3_css_lint.py`（文档 3 §5 的 7 条） | 脚本 | 0 违规 |
| C-6 | H01、S5 计算样式与基线逐项相同（别名作用域未泄漏） | 探针 | 0 差异 |
| C-7 | `tools/check_package.py` | 脚本 | PASS |

## D. 公共变量生效

| # | 检查 | 方法 | 门槛（两视口） |
|---|---|---|---|
| D-1 | `--koala-*` 全部变量在 O01/S01 `body` 上可读 | `getComputedStyle(body).getPropertyValue()` | 与文档 1 §1 值一致 |
| D-2 | 别名变量（`--ve2-paper --vb-green --ms-orange …`）解析值 = 对应 koala 值 | 同上 | 一致 |
| D-3 | `.page` 背景 `#F8FAF9`；`.section`/`.store` 背景 `#FFFFFF`；主按钮背景 `#2F6B4F`；价格 L1/L3 颜色 `#D56A1C`；≤14px 价格文字 `#B85A16`；辅助文字 `#6D7671`；描边 `#E4EBE6` | 计算样式 | 全部一致 |
| D-4 | 不再出现的值：`#183E30`/`#245841` 作背景、`#F4C99F`、`#CE6826`、`#E7E2D9`、`#A9A299`、`#9AA39D` | 遍历两页所有可见元素的 color / background | 0 命中（S01 定位授权弹层的 `#07C160` 除外） |

## E. 组件实例与量化门槛

每个组件列出两页全部实例，逐实例记录计算样式（字号、行高、字重、颜色、背景、圆角、高度）。门槛：

| # | 项 | 门槛 |
|---|---|---|
| E-1 | 字号地板 | O01、S01 六态、三个筛选面板展开态：<12px 可见信息文本节点 **= 0**（含「门店环境」角标与帮助入口文字）；`font-size:0` 只允许出现在 lint 登记的纯图标替换节点上（探针 `textAudit.zeroFont` 列出，逐条核对为字符图标） |
| E-2 | 对比度 | 所有可见信息文字（含占位文字）在**实际合成背景**上 ≥4.5:1；≥24px 或 ≥18.66px/700 的文字（价格数字）≥3:1；白字按钮 ≥4.5:1。精确计算不四舍五入（探针 `textAudit.contrast`）。目标：两页 `contrastFail = 0` |
| E-3 | 帮助入口 | 首屏、每 120px 滚动采样、底部、展开态、筛选应用后、分页后、窗口 ±15px 后：(a) 停靠态（默认，两页均停靠**顶栏**标题右侧 / 胶囊左侧）——入口在顶栏内，与标题文字 / 胶囊 / 返回键不重叠，`fabScan.hidden` 全为 false（永不消失），入口中心 elementFromPoint 命中自身，几何相交的内容全部被不透明顶栏遮盖（可见碰撞 0），展开后两个动作按钮在视口内且可点、电话 `onclick` 与客服遮罩可触发、外部点击可关；(b) float 兜底态——可见相交 = 0，且隐藏只在相交期间、离开即恢复，不得以「隐藏后相交为零」作为体验合格的证明。启动器文字不溢出按钮（纯图标 + 原 aria-label） |
| E-4 | 覆盖账本比对 | `qa/mk_v3_override_ledger.py check`：两页（S01 浏览/需求/未定位 + O01）× 两视口探针样式逐属性比对，差异分类 direct / inherited / alias / layout / unexpected；**unexpected = 0** |
| E-5 | Button / Chip | 主/次/Sheet 确认按钮 48；小按钮 36；文字按钮 13px；行内 Chip 32、面板 Chip 36；圆角 ∈ {12, 8, 999}；字号 ≥13 |
| E-6 | BottomBar（O01） | 高 68 + safe-area（实测 69 含描边）；**两控件**：次按钮 auto（≥104）+ 主按钮填满（帮助入口不在底栏）；主按钮 15px/600 文本含金额且单行、不缩字、不裁切；探针 `longAmount` 对「¥13,863」「¥113,863」均 `fits:true`（375 与 390）；`.page` padding-bottom ≥ 底栏高 + 8（实测 80）；滚到底时最后分区底边距底栏 ≥ 8（实测 11） |
| E-7 | Tag / Chip（S01） | 服务标签 12px 高 24 不换行、`tagsClipped=false`；仓型标签胶囊 12px；促销标签 `#FFF0E2` / `--koala-promo-text`；快捷 Chip 32 高，`aria-pressed=true` 时浅绿底；标签数量与文本与基线逐卡相同 |
| E-8 | StoreCard（S01） | **不设卡高上限**（176 仅参考）：字号达标、信息完整（E-1 / F-5）、标签不裁切、无横向溢出、无无效留白；首卡与第二卡阴影/圆角/描边相同；无实景卡占位为 `--koala-surface-2`；图 96×84（≤380px 92×82）；标签行位于图片行下方占全宽（`tagsRowRect` 左缘 = 卡内边距） |
| E-9 | PriceBlock | S01 数字 20/26/700 橙、后缀 12 灰；O01 应付 32/38/700 橙于白卡；明细行 14；一屏只有一个橙色价格层级（S01 每卡一个） |
| E-10 | FilterBar（S01） | 40 高；三格等宽；竖分隔线；展开态与基线相同的面板锚定位置（`top: calc(100% + 5px)`） |
| E-11 | TabBar（S01） | 56 + safe-area；四 Tab 图标 22px SVG；文字 12；选中态颜色 `#2F6B4F` |
| E-12 | 顶栏 | 48 高、白底、下描边；标题 17/700 |
| E-13 | 横向溢出 | `document.documentElement.scrollWidth == innerWidth`；无元素 `getBoundingClientRect().right > innerWidth`（现有横向滚动容器除外：`.store-demo-tags`） |
| E-14 | 控制台 | `pageerror` 0、`console.error` 0、`requestfailed` 0 |

## F. 页面状态与业务不变量

| # | 页面 / 状态 | 检查 | 门槛 |
|---|---|---|---|
| F-1 | S01 六态（unlocated / browse / estimated / nomatch / extended / far）× 2 视口 | 截图 + E-1～E-14 | 全部通过 |
| F-2 | S01 定位授权弹层（允许 / 拒绝 / 定位中 / 手动选择） | 截图 | 弹层样式与基线相同（微信样式，不在改动范围） |
| F-3 | S01 三个下拉面板展开 + 服务多选应用/取消 + 快捷 Chip 三种组合 | 点击 + 截图 | 行为与基线相同；门店顺序、数量相同 |
| F-4 | S01 E存卡位置：推荐排序第 2 卡后；>5km 无门店时首位 `fallback-first` | DOM 位置 | 与基线相同 |
| F-5 | S01 每卡文本快照（名、仓型、地址、路线、标签、剩余/匹配、价格） | 文本比对 | 与基线逐字相同 |
| F-6 | O01 真实路径（U01→继续租用），含优惠券行 | 文本比对：`#unitTitle` `.meta` `#termText` `#endDateText` `#payableTotal` `#rentFee` `#monthlyText` `#depositFee` `#managementFee` `#pay` 文本及优惠券行 | 与基线逐字相同（`¥3,863` 等） |
| F-7 | O01 直接 URL（无快照） | 不崩溃；显示「报价待确认」行为与基线一致 | 相同 |
| F-8 | O01 支付前校验：未勾选协议 → 提示；勾选 → 手机号授权 sheet → 跳 O02 | 点击流 | 与基线相同 |
| F-9 | O01 四个 sheet（协议 / 禁存 / 重要说明 / 押金）开关 | 点击 | 正常；sheet 样式按 G-4 |
| F-10 | O-6 帮助入口停靠顶栏后：电话 / 客服两个动作可触发；遮罩 sheet 可关；外部点击关闭 | 点击 | 正常 |
| F-11 | O-7 中文日期覆盖：**已暂缓、未实施，本项 N/A**（V1.1.1；〔已废止〕「若实施」）。原生 `input[type=date]` 及其行为未动，日期文本不变量已由 F-6 覆盖 | — | N/A |

## G. 回归与失败登记表（02B-4 已填写；本机 Chromium 148，母版基线 = 02B-0）

| 脚本 | 基线结果（02B-0，母版） | 02B-4 结果（最终候选） | 分类 | 说明 |
|---|---|---|---|---|
| `tools/run_regression.py` 34 项（manifest 重写前） | 23 PASS / 11 FAIL | 23 PASS / 11 FAIL，**逐项相同** | 现有失败 11 | 4 夹具过期（#1–#4）+ 6 硬编码 `/usr/bin/chromium`（#5–#10）+ 1 `check_package`（#11，Unlisted 增至 17：母版漂移 8 + 本轮新增文件 9） |
| `tools/run_regression.py` 34 项（manifest 重写后） | — | 24 PASS / 10 FAIL | 已修复 1 | `check_package` 转 PASS（manifest 收口）；其余 10 项失败断言与基线逐字相同 |
| `qa/test_cross_page_runtime_smoke_v1.py`（Playwright Chromium 重跑） | PASS 26/26 | PASS 26/26 | — | — |
| `qa/visual_check_combo_ux_v2.py`（重跑） | PASS | PASS | — | — |
| `qa/visual_check_demo_price_closeout.py`（重跑） | PASS | PASS | — | — |
| `qa/test_home_state_recovery_browser_v11.py`（重跑） | 37/38，FAIL `375 active_new_quote quoted 查看方案 None` | 37/38，同一条 FAIL | 现有失败 | 首页状态恢复用例，与两页无关 |
| `qa/test_home_visual_closeout_patch_v1.py`（重跑） | 0/2 `store_zone overlap:true hidden:false` | 0/2，同一断言 | 现有失败 | 首页 D-11 碰撞隐藏本机未触发，仍待团队复核 |
| `qa/visual_check_combo_recovery_v21.py`（重跑） | FAIL `demoActivityFor is not defined` | FAIL，同一错误 | 现有失败 | 夹具 |
| `qa/test_miniprogram_ui_system_v1.cjs` | PASS | PASS | — | 非活动，继续 PASS（`data-ui-system="v1"` 仍 1 次） |
| `qa/test_confirmed_ux_v1.cjs` | PASS 59 | PASS 59 | — | 非活动 |
| `qa/test_visual_elevation_v2_controlled_rollout.js` | PASS | PASS | — | 非活动；两份 elevation 文件的 link 未动 |
| `qa/test_sprint2_transaction_visual.js` | FAIL（O01 全文 sha 断言，母版即失败） | FAIL，同一断言 | 现有失败 | 非活动脚本 |
| `qa/test_sprint1d_s01_visual.js` | FAIL「S01 body matches…baseline」 | FAIL，同一断言 | 现有失败 | 非活动脚本（body 本轮未改，母版上已不匹配） |
| `qa/test_v27416_global_support_home_cards.js` | FAIL `AssertionError` | FAIL，同一断言 | 现有失败 | 非活动脚本 |
| `qa/mk_v3_pilot_probe.py`（新） | — | 两视口 S01 六态 + 三面板 + O01 真实路径 / 直连：<12px 0、对比度不达标 0、横向溢出 0、帮助入口可见碰撞 0 / 隐藏 0、pageerror / console error / requestfailed 0 | — | H01 / S5 指纹与基线相同（H01 自身 <12px 21、对比度 18 为母版既有，未变） |
| `qa/mk_v3_help_entry_probe.py`（新） | — | 停靠态两页两视口：隐藏 0、可见碰撞 0、命中失败 0、电话 / 客服 / 外部点击关闭可用；S01 Escape 不关闭（既有）；float 兜底逻辑按设计工作但 S01 隐藏 11–13/15，故不作默认 | — | 第 1、2 次运行各有 1 例因 tel: 导航竞态抛出的探针异常（R18），改探针等待后第 3 次运行通过 |
| `qa/mk_v3_s01_card_check.py`（新） | — | 浏览 / 需求 / 无匹配 × 两视口：标签行父节点 = `.store-head`、裁切 0、横滚 0、标签 12px / 6px、仓型 999px、促销对比度 5.24、E存索引 2、卡片点击 URL 与基线相同（进入 S02） | — | 脚本里「点击进 U01」的预期写错，实际基线与改后都进 S02，以 URL 相同为准 |
| `qa/mk_v3_override_ledger.py check`（新） | — | direct 2,552 / inherited 330 / alias 14 / layout 923 / consequence 256 / **unexpected 0** | — | 母版基线 → 最终候选全量比对 |
| `qa/mk_v3_business_invariants.py`（新） | — | 2,606 个业务字段 **0 差异** | — | 去掉样式 / 几何 / 帮助入口采样字段后比对 |
| `qa/check_mk_v3_css_lint.py`（新） | — | PASS | — | 4 个层文件、tokens 不入层、body 字节不变 |

「新引入」项 = **0**；「已修复」= 1（`check_package`）。

## H. 截图与证据包（02B-4 实际路径）

| 文件 | 内容 |
|---|---|
| `outputs/mk_v3_02b4/after/*.png` + `probe.json` | 最终候选：S01 六态 ×2 视口（视口 + 长图）、三面板 / 多选 / 快捷 / 翻页 / 展开 / 客服、定位授权弹层、O01 真实路径 / 直连 / 四 sheet / 校验 / 授权 / O02、U01、H01 / S5 |
| 02B-0 基线 `baseline_shots/` + `probe.json`（交付目录） | 母版同名截图与探针（改前） |
| `outputs/mk_v3_02b4/compare/*_compare.png` | 70 张左右拼接对照图（左母版右候选） |
| `outputs/mk_v3_02b4/help_after*/` | 帮助入口专项截图与 `help_probe.json`（3 次运行） |
| `outputs/mk_v3_02b4/card_check/` | S01 门店卡 / 标签行检查 |
| `outputs/mk_v3_02b4/after/ledger_diff.json` | E-4 账本比对结果 |
| `outputs/mk_v3_02b4/business_invariants_diff.json` | F-5 / F-6 业务不变量比对 |
| `outputs/mk_v3_02b4/h01_s5_fingerprint_compare.json` | C-6 H01 / S5 指纹比对 |
| `outputs/mk_v3_02b4/regression/` | shipped runner 日志（manifest 重写前后）、6 个浏览器脚本重跑日志、6 个非活动脚本日志 |
| `docs/visual/mk_v3_override_ledger.csv` | 覆盖账本 |
| `docs/visual/MK_V3_PILOT_O01_S01_REPORT.md` | 02B 验收报告 |

真机复核（本机无法替代，列为 02B 之后的待办）：iOS 微信 WebView 与安卓微信 WebView 各一台，检查 `@layer` 生效、`mask-image`、safe-area、原生日期控件、字体断行、Tab 栏高度、顶栏胶囊真实位置与帮助入口 `right:96px` 的关系。

## I. 退出判定（02B-4）

- C、D、E、F：本机 Chromium 两视口全部达标；G 表「新引入」= 0。**试装在本机验收口径下通过；微信真机未验证，标为待验证。**
- Release Gate 保持 HOLD；本表通过不等于演示验收，真机复核与微信开发者工具仍是进入 Task 02C 的前提。
