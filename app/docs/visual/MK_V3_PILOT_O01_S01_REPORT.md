# Mini Koala — Task 02B O01 / S01 Pilot Implementation & Acceptance Report（包内版）

日期：2026-10-12 ｜ 母版：`Mini_Koala_CrossBranch_UX_UI_Phase1_QA_V1_2_Candidate.zip`（sha256 `e3579ac9a285a0533133e17e5efdcca85904abf7eac0d0bacf7ccae1a0015741`）｜ 候选：`…_V1_2_MKV3_Pilot_O01_S01_Candidate` ｜ Release Gate：**HOLD** ｜ 结论：**本机 Chromium 双视口验收门槛全部通过；微信真机未验证（待验证）；未进入 Task 02C。**

分步记录（02B-0 基线、02B-1 O01、02B-2 S01、02B-3 帮助入口）与本轮联合验收的完整版报告在交付目录 `2026-10-12_Task02B4_Joint_Acceptance/`；本文件是随包的摘要。

## 1. 实际改动（只增不改）

| 范围 | 内容 |
|---|---|
| 新增 CSS（5） | `mk-v3-tokens.css`（不入层，`--koala-*` 扩展 + 8 套旧前缀别名，仅 `.koala-o01/.koala-s01`）、`mk-v3-components.css`、`mk-v3-page-o01.css`、`mk-v3-page-s01.css`、`mk-v3-help-entry.css`（四者在唯一命名层 `@layer mk-v3`；无 `:has()`、无 ID、无色值字面量；`!important` 只用于取代已登记的旧重要声明） |
| 新增登记脚本（2） | `mk-v3-s01-tags.js`（S01 标签行移到 `.store-head` 末尾、促销标签 `.mk-promo-tag`）、`mk-v3-help-entry.js`（帮助入口停靠顶栏、aria 属性、外部点击 / Esc 关闭、float 兜底） |
| 修改 HTML（2） | O01 / S01 仅 `<head>` 追加 4 个 `<link data-ui-system="v3">` + 1 / 2 个 `<script defer>`；`<body>` 字节与母版相同（O01 `26361b600958`、S01 `c0eff0b3a6d5`） |
| 新增验收脚本（7，只读） | `qa/check_mk_v3_css_lint.py`、`mk_v3_pilot_probe.py`、`mk_v3_help_entry_probe.py`、`mk_v3_s01_card_check.py`、`mk_v3_override_ledger.py`、`mk_v3_business_invariants.py`、`mk_v3_compare_shots.py` |
| 文档 | `docs/visual/task02a_v1_1/`（四份规范 V1.1 02B-4 同步版）、`MK_V3_PILOT_O01_S01_README.md`、`mk_v3_override_ledger.csv`、`mk_v3_pilot_baseline_hashes.json`；`CHANGELOG` / `CURRENT_STATUS` / `README_CURRENT` 登记；`RELEASE_MANIFEST.json` 重写（HOLD 不变） |
| 未改 | 全部业务 JS、数据母表、19 个旧 CSS、两页内联 `<style>`、`mini_storage_global_support_v274.js`、`mini_koala_acceptance_fix_v1.js`、现有 QA 脚本、H01 / S5 与其他页面 |

## 2. 视觉改善（375×812 实测；390×844 同）

| 项 | 母版 | 候选 |
|---|---|---|
| 可见文字 <12px | S01 浏览 54 / 需求 50 / 无匹配 12；O01 4 | 两页六态 + 三面板 **0** |
| 对比度不达标（普通文字 ≥4.5、大价格 ≥3，不四舍五入） | S01 5 / O01 17 | **0 / 0** |
| 帮助入口 | 「＋帮助」16px 三行溢出；滚动采样可见碰撞 S01 12–13/15、O01 5–7/9 | 图标化 44px，两页停靠顶栏（标题右侧、胶囊左侧）；可见碰撞 **0**、隐藏 **0**、命中失败 0；电话 / 客服 / 外部点击关闭可用 |
| S01 门店卡 | 190px，标签 10px 右列横向裁切，首卡大阴影 | 205px（内容撑开，不设上限）：名 16 / 地址路线 13 / 标签 12px 6px 矩形占全宽（四标签一行、0 裁切）/ 仓型胶囊 / 价格 20px `#D56A1C` + 后缀 12；卡壳白底 14 圆角 1px 描边 `0 2px 8px` 阴影统一 |
| S01 筛选条 / Chip / Tab / E存 | 38 高 11px 无描边 / 40 高 16px / 字符图标 10px 文字 / 深绿渐变 badge 9.5px | 40 高 13px 竖分隔线 / 32 高 13px / 线性 SVG 12px 文字 / 白卡 badge 12px（位置仍索引 2） |
| O01 应付与明细 | 深绿渐变块 + `#F4C99F` 32px；明细 13px；分区透明 | 白卡内 32/38/700 `#D56A1C`；明细 14px 行高 44；五个分区白卡 14 圆角描边 |
| O01 底栏 | 73 高、13px | 69 高、两按钮 108 + 229、15px；「确认并支付 ¥113,863」单行不裁切（两视口） |

对照图 70 张：`outputs/mk_v3_02b4/compare/`；六态与真实路径拼图：`outputs/mk_v3_02b4/contact/`。

## 3. 业务保护

- `qa/mk_v3_business_invariants.py`：母版基线 → 候选，去掉样式 / 几何 / 帮助入口采样字段后 **2,606 个字段 0 差异**（S01 六态每卡 kind / id / 名 / 仓型 / 地址 / 路线 / 标签 / 事实 / 价格、筛选头文本、三面板选项、多选应用 / 取消、快捷 Chip、翻页 9→17、E存索引 2、定位授权弹层；O01 标题 / 租期 / 日期 / ¥3,863 / 券 −¥200 / 优惠后 ¥3,240 / 押金 ¥573 / 管理费 ¥50 / 门禁 valid / 未勾选提示 / 授权按钮 / 进入 O02；直连「报价待确认」）。
- 卡片点击仍进入 S02 门店详情，URL 与基线相同。
- H01 / S5：文件哈希与母版相同；两视口计算样式 / 变量 / 样式表 / 层 / 文本审计指纹与基线相同。

## 4. 账本与层机制

实施前核对：包内无其它级联层；两页元素 `style` 属性无 `!important`；5 处动态写入样式均未分层。账本 1,152 条预登记（`!important` 1,061 / 普通 91；915 条有旧规则匹配）。母版 → 候选计算样式差异：direct 2,552 / inherited 330 / alias 14 / layout 923 / consequence 256 / **unexpected 0**。静态约束 PASS。

## 5. 回归与失败登记（分类见 `docs/visual/task02a_v1_1/04_…_V1_1.md` §G）

- shipped runner：母版 23 PASS / 11 FAIL → 候选（manifest 重写前）23 / 11 逐项相同 → （重写后）**24 / 10**，唯一变化是 `check_package` 转 PASS。10 项现有失败 = 4 夹具过期 + 6 硬编码 `/usr/bin/chromium`。
- 6 个浏览器脚本 Playwright 重跑：3 PASS / 3 FAIL，与基线逐条相同（`active_new_quote` 用例、首页 D-11 碰撞隐藏 0/2、`demoActivityFor` 夹具）。
- 6 个非活动脚本：3 PASS / 3 FAIL，与母版相同。
- **新引入失败 0；已修复 1（manifest）。**

## 6. 既有问题（未修，供团队复核）

首页 D-11 帮助碰撞隐藏本机未触发（0/2）；首页 `active_new_quote` 用例 375 失败；4 个夹具过期测试；S01 上 Escape 不关闭帮助菜单（旧捕获键盘脚本）；母版 manifest 原有 1 Changed + 7 Unlisted 漂移（本轮重写收口）；H01 自身 <12px 21 处 / 对比度 18 处（不在本轮范围）。

## 7. 本轮发现并处理的问题

- 帮助入口若进 O01 底栏同排，375 下主按钮内宽只剩 161px，「¥113,863」只余 2px、八位金额放不下 → 改停靠顶栏。
- 停靠态被几何碰撞判定误隐（早期试装 8/15）→ 停靠态不执行判定；旧 `acceptance_fix` 的 inline 隐藏由层内规则中和。
- 帮助探针在电话动作（`tel:` 导航尝试）后偶发读到空节点（2 次运行各 1 例）→ 探针改为等待入口回到 DOM；第 3 次运行全部通过，页面本身无异常。
- `mk_v3_s01_card_check.py` 的「点击进 U01」预期写错（母版与候选都进 S02）→ 以 URL 相同为准。

## 8. 未完成验证

微信真机（iOS / 安卓 WebView）：`@layer`、`mask-image`、safe-area、原生日期控件、字体断行（本机为 Noto Sans CJK 回退）、顶栏胶囊真实位置与入口 `right:96px` 的关系。中文日期覆盖与金额运行时拆分按指令暂缓。

## 9. 回退方式

删除两页 `<head>` 中的 `data-ui-system="v3"` link 与 `mk-v3-*.js` script，或用母版覆盖两个 HTML；无其它残留。

## 10. 运行环境

本地 `python3 -m http.server`（包根目录）+ Playwright Chromium 148.0.7778.96 headless；视口 375×812 与 390×844；DPR 2；微信 iOS UA；locale zh-CN；字体 Noto Sans CJK 回退（`fc-match "PingFang SC"` → DejaVu Sans，CJK 由 Noto 渲染）；探针时间 2026-10-12 14:07（主探针）。
