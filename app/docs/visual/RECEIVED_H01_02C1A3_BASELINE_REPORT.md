# Mini Koala — Task 02C-1A-3：首页新用户状态整页检查

日期：2026-10-12 ｜ 对象：H01 首页，仅 `?state=new&loc=precise` 新用户默认状态 ｜ 基准：02C-1A-1 + 02C-1A-2 工作副本（`/tmp/mk_02c1a2/work`）
结论范围：**只说明「首页新用户状态的本机检查结果」**。首页其他状态未检查；微信真机待验证；Release Gate 保持 HOLD；未打完整 ZIP。

## 0. 环境

| 项 | 值 |
|---|---|
| 浏览器 | Playwright Chromium 148（headless），DPR 2，`is_mobile` + 触屏，locale zh-CN，微信 UA |
| 视口 | 375×812、390×844 |
| 运行方式 | 本地 `python3 -m http.server`：8801 = 修改前（02B-4 候选态，首页未改）、8803 = 02C-1A-2 态、8802 = 本轮最终 |
| 字体 | 本机 Noto Sans CJK SC 回退，非 PingFang / 微信字体 |
| 截图 | 全部来自实际运行的原型，未用生成图 |

## 1. 本轮改动（只增不改）

| 文件 | 改动 |
|---|---|
| `prototype/mk-v3-page-h01.css` | 末尾新增「帮助入口」块（8 条规则 / 38 条声明，全在同一个 `@layer mk-v3` 内，作用域 `body.koala-ui-v1.koala-h01`）；四步卡 `.section + .home-proof-stack` 上间距 16 → 20px（1 条值变更）；头注更新 |
| `docs/visual/mk_v3_override_ledger_h01.csv` | 重建：500 → 538 行（+38 新增、1 行值变更、0 删除），新增 38 行全部有旧规则候选（global_support 注入样式 / home_approved_v2.css），`retire_in_task03` 仍只是候选标记 |
| 未动 | H01 HTML（`<body>` sha `9a0c90bebd805876`、429,305 字节，与 02B-4 候选相同；`<head>` 仍只多 2 个 link）、`mk-v3-tokens.css`（与 02C-1A-2 字节相同）、业务 JS、旧 CSS、global_support / acceptance_fix / closeout 脚本、O01 / S01 / S5 文件 |

无新增 JS，无节点移动、无类名或 aria 变化。lint PASS（作用域、无 `:has()` / ID / `:root`、无色值字面量、字号地板 12、icon-zero 已登记）。
最终 `mk-v3-page-h01.css`：117 条规则 / 507 条声明 / 415 行。

### 1.1 帮助入口（沿用母版位置，未复制 O01/S01 顶栏停靠）

母版位置 = 首页 closeout 补丁把 `#miniGlobalSupport` 以内联样式停靠成底部导航上方的 48px 全宽白条（右侧一个 44px「帮助」钮）。本轮**保留该位置与 DOM**，只用 CSS 修了三处实测问题：

| 实测问题（修改前，375/390） | 修复 | 修后实测 |
|---|---|---|
| 展开态：电话 / 客服两钮竖排塞进 48px 条，`justify-content:center` 把「帮助」钮向下挤 7px **压住底部导航「我的」**；电话 / 客服悬浮在主推卡 / 企业横幅（可点）之上 | 展开态改为**在同一条内横排**（电话 · 客服 · 帮助），钮不离开白条 | 展开态入口位置不变（375 下 y=699），与 `#navMine` 重叠 0；三钮 elementFromPoint 命中 100%；展开后滚动菜单不消失；外部内容无悬浮覆盖 |
| 「帮助」「电话」「客服」文字 11px（`#miniGlobalSupport button{font-size:11px!important}`，home_approved_v2.css） | 12px / 500 | 12px，深绿 on 白 6.5:1 |
| 收起态整条被 acceptance_fix 的 `avoidSupportOverlap` 内联 `visibility:hidden`：375 下 15 个滚动采样 **8 个隐藏，含首屏**，入口约一半时间不存在；closeout 补丁本身是要它常驻的（清除 `.home-support-obstructed` / `aria-hidden`） | 层内 `visibility:visible!important` 中和（与 02B-3 停靠态同一做法）；白条加 `pointer-events:auto`，点到白条不会穿透到被盖住的卡片 | 15 采样 + resize 全部可见；白条不透明、页面保留 nav+64px 底部留白，被条盖住的内容都能继续上滚（最底采样 covered=0） |

顺带：「帮助」钮由半胶囊（`22px 0 0 22px`，但它并不贴边，条内有 12px 内边距）改为整圆，与 O01/S01 的圆形入口一致；白条上边线改 `--koala-line`，与底部导航同色。

**登记的运行时相关中和**：acceptance_fix 内联 `visibility:hidden` 在 H01 停靠态被层内规则覆盖（见 CSS 头注与账本 `.mini-global-support / visibility`）。电话（`tel:4000358805` 请求发出、菜单收起）、客服（弹层打开 / 关闭）两动作两视口均可触发。

## 2. 整页检查结果（375×812 / 390×844）

| 检查项 | 结果 |
|---|---|
| 1. 上下半部分一致性 | 卡片：任务副卡 / 四步卡 / 主推卡 / 场景格 / 品牌证据 / 服务信息 / 品牌荣誉 全部 `14px` 圆角 + `1px #E4EBE6` 描边 + `0 2px 8px rgba(31,41,35,.05)` 阴影 + 白底；企业横幅为品牌浅底 + brand-200 描边（有意区分）；备选卡为主推卡内分隔行（无独立边框，设计如此）。标题两级：页面级 h2 18/700，卡内标题 17/700，同色。正文 13px / 辅助 12px 统一 `#59645E`；标签 12px（仓型胶囊、其余 6px）；价格 24 / 20 px `#D56A1C`，单位 12px。模块间距：hero→任务区 10（配对），模块间 20（本轮把四步卡 16 → 20 对齐），底部卡组内 14。 |
| 2. 文案 / 顺序 / 三卡 | 9 个模块顺序相同；每模块 innerText、整页 innerText、三张推荐卡文本与可见字段结构、底部导航文字，与修改前（02B-4 候选）逐字相同。第二、三卡仍无剩余仓位 / 容量。 |
| 3. 入口可用 | 18 个入口（估大小算价格 → S5、查看附近门店 → S01、位置条 → 弹层、全部门店、三张门店卡 → S02、6 个场景 / 其他用途 → S5、企业横幅 → B2B01、了解更多 → B01、四个导航）两视口点击结果与修改前相同。 |
| 4. 裁切 / 溢出 / 错误 | 可见文字 <12px：0（含伪元素）；对比度不达标：0；横向溢出 0；pageerror / console error / 资源加载失败 0。（修改前整页 <12px 23 处、对比度不达标 12 处。） |
| 5. O01 / S01 未受影响 | O01 直连、O01 真实路径（U01 → 继续租用）、S5 两视口计算样式指纹与修改前相同；S01 512 行指纹仅图片 URL 端口号差异（非端口差异 0）。`mk-v3-page-h01.css` 只挂在 H01，tokens 本轮未动。 |
| 6. 本轮范围控制 | 02C-1A-2 态 → 最终：400 个元素里样式变化只在 `#miniGlobalSupport` 内 11 个元素 + 四步卡 margin-top 一处；其余只有四步卡以下 70 个元素整体下移 4px（间距 16 → 20 的连带）。 |

## 3. 剩余问题清单（未处理，供下一步决定）

1. **帮助白条常驻占 48px 视口**：收起态只有右侧一个钮，左侧为空白条。这是母版 closeout 补丁的形态，本轮只让它不再消失；若团队更想要浮动圆钮，需另做避让方案（S01 式）并重新验碰撞。回退方式：删 `.mini-global-support` 规则里的 `visibility / pointer-events` 两条即可恢复 acceptance_fix 的隐藏逻辑。
2. **首屏被白条盖住主推卡价格行**（375 下「参考单价 / 65元」正好落在条后，需上滚一屏才见）：修改前此处入口隐藏时该行可见。是常驻带来的代价，未改首页模块高度。
3. **电话动作在 headless 下记为一次 tel: 导航请求**（环境限制，非页面错误）；Esc 关闭在首页由 home_approved_v2.js 处理，可用。
4. 首页**其他状态**（已定位 / 已有需求 / 老用户等）未检查；顶栏、位置条、底部导航、帮助条是各状态共用壳，本轮规则会对它们生效，需在其他状态任务里核。
5. **微信真机未验证**：`@layer`、`env(safe-area-inset-bottom)` 下白条与 nav 的真实高度、胶囊、字体断行。
6. 账本 `retire_in_task03` 列仍为脚本自动候选，不是删除证明（02B-5B 结论未变）。
7. 34 项包内回归本轮未跑（未触及被测脚本），留到首页整体验收。
8. 02C-1A-2 已列的两个判断仍待团队确认：备选卡价格竖排变体、企业横幅由深绿实心改浅底。

## 4. 交付清单

- `changed_files/prototype/`：`mk-v3-page-h01.css`（最终）、`mk-v3-tokens.css`（未变，随附）、H01 HTML（未变，随附）；`changed_files/docs_visual/mk_v3_override_ledger_h01.csv`
- `compare/`：首屏 / 滚动中段 / 完整长图 / 帮助底部 / 帮助展开，各 375 与 390 修改前后对照；`H01_help_entry_detail_375_4up.png`
- `shots_before/`、`shots_after/`：原始截图（first / mid / bottom / help_expanded / long × 两视口）
- `evidence/`：`help_probe_pre02c.json`、`help_probe_before_fix.json`、`help_probe_after_fix.json`（碰撞 / 命中 / 展开 / 功能）、`audit_pre02c.*`、`audit_after.*`、`text_order_before_after.json`、`consistency_after.json`、`scope_diff_02c1a2_vs_final.json`、`mk_v3_override_ledger_h01_02C1A3_increment.csv`、三个 patch
- `tools/`：本轮所用只读探针脚本
- `work_snapshot_02C1A3_work_only.tar.gz`：可接续工作副本（= `/tmp/mk_02c1a3/work`，不是候选包）
