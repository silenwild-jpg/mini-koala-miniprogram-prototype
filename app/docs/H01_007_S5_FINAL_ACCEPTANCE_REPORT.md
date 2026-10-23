> 本文件记录 S5 历史交付；当前版本为 H01-007-P1，见 P1 实施报告。S5 Manifest 重算前 26/38，封版日志为 27/38，勿将两次结果混用。

# H01-007-S5 最终验收报告｜全链路回归、视觉核验与最终候选包收口

日期：2026-10-13 ｜ 唯一代码基线：S4 正式完成工作区（S4 检查点 sha256 `5cc533d320ffc2c5e6b61e1d0c170c9d442f265c9257a0ce36d63020e770f040`，f89a89 血统）｜ 原始母版：H01-004B Help Float Candidate（zip sha256 `ed87033141944066265d3984ee4e10411d8ea6af84288eb9daabffc1e87c29ca`，只读保留）｜ Release Gate：**HOLD（未改）** ｜ 统一项目母版：未覆盖 ｜ 本阶段只做 S5-A / S5-B / S5-C，未启动视觉优化、生命周期重构或优惠券专项修复。

**结论：候选包以「待修复版本」交付，不宣称内部演示验收通过。** S1–S4 八项修复全部在同一工作区完成并复跑通过，源码边界符合冻结规则；S5-B 发现 2 项 P1（C02 底部操作栏偏移、优惠券遗留锁），均为 H01-004B 母版既有缺陷而非本项目引入，按任务书只报告不修改，待批准后单独实施。微信真机 NOT TESTED。

## 0. 启动前核验

| 项 | 结果 | 分级 |
|---|---|---|
| 唯一输入 | 在 `/tmp/mk_h01_007_s3f/work/Mini_Koala_H01_Lifestyle_Step03` 原地继续；S4 交付声明的 H01 / S01 / S02 / 2 个 S4 测试 / RELEASE_MANIFEST 哈希与工作区逐一相同（62d1dce4… / 8bef9696… / d377ed1d… / 253127ec… / ba7a4f53… / b1d93457…）；S4 检查点 ZIP 实测 sha256 与声明一致 | PASS |
| 未重新分叉 | 未从 H01-004B、S1、S2 或作废并行工作区建立分支；S5 改动前的 6 个文件副本在交付目录 `evidence/files_before_s5/` | PASS |
| 原始母版保留 | S4 检查点内 `source_zip/` 的 004B 原始 ZIP 实测 sha256 `ed870331…c29ca`，解包为只读参照树用于逐文件比较 | PASS |

## 1. S5-A 最终回归

### 1.1 S1–S4 累计源码差异（H01-004B → S4 树，S5 改动前）

| 项 | 结果 |
|---|---|
| 文件总数 | 004B 523 → S4 536（不含 outputs / __pycache__） |
| 逐字节相同 | 511 |
| 修改（不同文件，不重复计数） | **12**，全部在 `prototype/`：SSOT、验收状态补丁、优惠券模块、C02、H01、M01、O01、Q01、S01、S02、U01、估算器。S1 8 + S2 2 + S3 6 + S4 3 = 19 次阶段触碰收敛为 12 个文件 |
| 新增 | 13：8 个阶段测试（`qa/test_h01_007_s{1..4}_*`）+ 5 份阶段文档（docs/） |
| 删除 | 0 |
| CSS / 图片 / 数据母表 / tools | 0 改动（19 个旧 CSS、mk-v3-*、assets、data 全部与 004B 相同） |
| H01 改动位置 | 6 处替换全部位于 `<script>` 内（004B 第 1720、1780–1781、1785、1801、2087–2088、2278 行），首页标记、Banner、双任务卡、推荐门店、CSS 未动 |
| 价格 / 优惠冻结规则 | 累计 diff 的删除行中不含 management_fee / deposit / discount / monthly_price / base_monthly / PRICE_GATE / face_value / min_rent 任何一项；租金算法、押金 = 折后月均、管理费 ¥50、折扣表、¥2,000 券门槛均未改。S4 逻辑测试第 29 条确认 SSOT 无 S4 标记；S3 新增 SSOT 助手为纯函数、不计算价格 |
| 视觉冻结规则 | 帮助浮窗三文件、生活感 CSS、H01 标记与 004B 相同（VIS-04A 台账同一结论） |

统一 diff：交付目录 `evidence/diff/H01_007_cumulative_004B_to_S4_unified.diff`（636 行，12 文件）；逐文件哈希：`evidence/cumulative_004B_vs_S4.json`。

### 1.2 S1–S4 全部新增逻辑测试与真实 HTTP 测试（S5 树，本地 HTTP + Chromium，375×812 / 390×844，DPR 2）

| 套件 | 结果 | 分级 |
|---|---|---|
| S1 逻辑 `test_h01_007_s1_requirement_trade_snapshot.cjs` | 13/13 | PASS |
| S2 逻辑 `test_h01_007_s2_coupon_eligibility.cjs` | 14/14 | PASS |
| S3 逻辑 `test_h01_007_s3_trade_recheck.cjs` | 18/18 | PASS |
| S4 逻辑 `test_h01_007_s4_entry_contracts.cjs` | 30/30 | PASS |
| 既有 `test_coupon_benefit_system_v1.js` | PASS | PASS |
| S1 HTTP（NO_TERM ×4、TERM_CHANGE、SNAPSHOT 等） | 42/42，MODE fixed ALL_OK | PASS |
| S2 HTTP（FRESH、REPEAT、OWN_LOCK、OTHER_LOCK、INVALID） | 40/40，MODE fixed ALL_OK | PASS |
| S3 HTTP（QUOTE_24H / 49H / CHANGED、PAY_FAIL、ORDER_ID_PRESERVED、NO_FALSE_SUCCESS、CROSS_S2） | 54/54（27 × 2 视口） | PASS |
| S4 HTTP（FRESH_BROWSE、HISTORY_BROWSE、CONTINUE_REQUIREMENT、NO_TERM、STORE_CARD、FILTER_RETURN、PAYMENT_FAILED_HOME、QUOTE_EXPIRED_HOME） | 56/56（28 × 2 视口） | PASS |
| 浏览器 console / pageerror（上述全部 + S5-B 全部流程） | 0 | PASS |

日志与截图：交付目录 `evidence/smoke_s5a/`。

### 1.3 核心链路与状态恢复一致性（375×812 与 390×844 结果相同）

新客 5.0m³ / 6 个月 → U01（三元桥店 BJ0498S01B001）→ 保存方案 Q01 → 首页「已保存方案」卡 → Q01「继续下单」→ O01 → 支付 → O02 → M01 → H01：

| 节点 | 门店 / 仓位 / 租期 | 整期租金 | 优惠 | 首次应付 | 订单号 |
|---|---|---|---|---|---|
| 需求 | — / — / 6 个月（5.0m³） | — | — | — | — |
| U01 价格快照 | jianguo / BJ0498S01B001 / 6 | ¥3,820 | CPN-001 −¥200 | ¥4,307 | — |
| Q01 已保存方案 | 同上 | ¥3,820 | CPN-001 −¥200 | ¥4,307（有效至 48 h 后） | Q-JIANGUO-BJ0498S01B001-6M |
| O01 | 同上 | ¥3,820 | 新客租仓券 −¥200 | ¥4,307，支付按钮可用，价格门禁 OK | 支付时生成 |
| O02 已支付 | 同上 | ¥3,820 | CPN-001 −¥200，优惠后 ¥3,620 | ¥4,307 | O02 URL orderNo = 订单记录 order_no；历史 1 单 |
| 钱包 | — | — | CPN-001 REDEEMED → 该订单；CPN-002 / CPN-003 INVALID（NEW_CUSTOMER_COMPLETED） | — | — |
| M01 | 当前租赁 · 三元桥店 · 仓位 BJ0498S01B001 · 5.0m³ · 6 个月 · 月均约 ¥637 | — | — | — | — |
| H01 | 聚焦 activeCard「三元桥店 · BJ0498S01B001」，无待支付卡 | — | — | — | — |

超期报价（49 h）、价格变化、支付失败、失去首购资格四条恢复链路由 S3 / S4 HTTP 套件复跑覆盖（§1.2），订单号、报价时间、金额与优惠状态与 S3 / S4 交付的对照表一致。证据：`evidence/s5b_followup/results.json → A4_CORE_CHAIN` 与截图 `*_A4_*.png`。

### 1.4 旧版 34 项回归脚本的分类

三棵树各跑一次 `tools/run_regression.py`（原始 34 项）：

| 树 | 通过 | 失败 |
|---|---|---|
| H01-004B 原始树（只读参照） | 22/34 | 12 |
| S4 树（S5 契约更新前） | 21/34 | 13 = 同样 12 项 + `test_home_state_integration_patch_v1.cjs` |
| S5 树（契约更新 + 4 项登记后，manifest 重算前） | 26/38 ｜ 失败 12 = 既有 12 项（含 manifest 项，重算前）；`test_home_state_integration_patch_v1.cjs` 转 PASS（17/17），新登记 4 项 S1–S4 逻辑测试全部 PASS |

12 项既有失败在 004B 原始树上逐项相同，分类如下（未删除任何测试、未放宽任何有效业务断言）：

| 类别 | 项 | 原因（本机实测） |
|---|---|---|
| 历史测试契约（旧文案 / 旧结构） | `test_ux_simplification_v1.cjs`、`test_combo_recommendation_v1.cjs` | 断言 004B 之前的文案 `30秒快速报价 →` 与旧 8 标签字面量，生活感首页与标签池改造时已不存在 |
| vm 沙盒缺函数（测试基建） | `test_s01_filter_sort_refinement_v1.cjs`（passesQuickFilters）、`test_s01_ux_continuity_patch_v1.js`（demoActivityFor）、`test_combo_full_journey_recovery_v21.cjs`（quickStoreFilters） | 测试用正则抽取源码片段到 vm 执行，被引用的函数在 004B 之前已改名 / 移位 |
| 环境（硬编码浏览器路径） | `test_home_state_recovery_browser_v11.py`、`test_cross_page_runtime_smoke_v1.py`、`visual_check_combo_recovery_v21.py`、`visual_check_demo_price_closeout.py`、`visual_check_combo_ux_v2.py` | 写死 `/usr/bin/chromium`，本机无此路径；在只替换路径的临时副本上复跑结果见 §1.6 |
| QA 夹具 | `test_home_visual_closeout_patch_v1.py` | 以不带 `loc` 参数打开首页，定位权限演示层拦截帮助按钮点击，30 s 超时；VIS-03B.1 已在视觉分支把夹具改为 `state=new&loc=precise`，属 VIS-04 合并白名单 |
| 包清单 | `tools/check_package.py` | 004B 的 RELEASE_MANIFEST 以 Windows 反斜杠记录 495 条路径，在非 Windows 环境即使原始树也报 495 Missing + 495 Unlisted；另有 S1–S4 新增 13 个文件未登记。S5 重算后见 §3 |

### 1.5 契约更新（任务书 S5-A §6）

`qa/test_home_state_integration_patch_v1.cjs` 第 15 条「home store cards carry associated requirement」（断言源码含 `||Number(r.target_volume)>0`）替换为两条：① 门店卡只在调用方显式传 matched 时进入匹配态（断言含 `const matched=mode==='matched';` 且不含旧行）；② `goStoreDetail(storeId,mode='browse')` 与 `state:matched?'matched':'browse'` 仍存在，显式 matched 场景继续有效。其余 15 条原样保留，结果 17/17。D-01 未回滚（S4 逻辑 30/30、HTTP 56/56 复跑通过）。

### 1.6 环境修正复跑（只替换浏览器路径的临时副本，不入包）

把 11 个写死 `/usr/bin/chromium` 的脚本只替换为本机 Chromium 路径后复跑 38 项：29/38。原 5 项「环境」失败中 3 项转 PASS（`test_cross_page_runtime_smoke_v1.py` 26/26、`visual_check_demo_price_closeout.py`、`visual_check_combo_ux_v2.py` 两视口 passed）；`test_home_state_recovery_browser_v11.py` 37/38（唯一失败：FAIL 375 active_new_quote quoted 查看方案 None  []，VIS-03D 在视觉树上同样记录为既有）；`visual_check_combo_recovery_v21.py` 实为 vm 沙盒缺函数 `demoActivityFor`，归入基建类。`test_home_visual_closeout_patch_v1.py` 仍因定位演示层拦截超时（夹具）。环境修正副本不入包，日志在交付目录 `evidence/regression_envfix.log`。

## 2. S5-B 视觉验收与遗留问题（本地 HTTP + Chromium，375×812 / 390×844，DPR 2，脚本见交付目录 `tools/s5b_visual_checks.py`、`tools/s5b_followup.py`）

| 检查项 | 结果 | 分级 |
|---|---|---|
| H01 与 S01 底部导航图标 | 不一致：「找仓」放大镜 vs 立方体、「门店」地图钉 vs 店铺；栏高 68 vs 56；004B 既有 | FAIL（P2-1） |
| S01 普通浏览态历史需求切换条 | 标题折成 1.9 行且第二行与说明文字相连，80px 内 4 行文字；004B 原始树相同 | FAIL（P2-2） |
| 估算页帮助浮窗 vs 租期选择 / 操作说明 | 收起与展开均不覆盖租期片与「预计租多久」说明；展开列位于第 5 片右侧 | PASS |
| U01 / Q01 帮助浮窗 vs 费用 | U01 展开列覆盖押金 / 管理费 / 更换优惠券；Q01 收起态在部分滚动位置覆盖明细右列金额；U01 上 Escape 不关闭 | FAIL（P2-3） |
| 无租期时底部主按钮视觉 vs 校验 | U01 一致（按钮改标「选择租期」，点击 toast 并展开租期）；估算页校验正确但按钮无事先视觉提示 | PASS / P2-4 |
| Q01 过期报价金额可读性 | 金额 30px/800 可读；同卡行标签与徽标被压暗近不可见；提示 74 字 | PASS / P2-5 |
| U01 / O01 价格变化提示长度 | U01 158 字 9.5 行（占视口 24%）、O01 143 字 12.5 行（32% / 28%） | P2-6 |
| C02 在 390×844 底部按钮 | 无纵向裁切（底栏下沿贴视口底），但底栏整体向左偏移半屏，两按钮只剩右半截；375 相同；004B 原始树相同 | **FAIL（P1-1）** |
| H01-004A 品牌资料入口 | 默认收起 → 点击展开（3 项待核验材料）→ Enter 收起；「了解更多」进入 B01 | PASS |
| H01-004B 帮助浮窗 | 44×44 收起、44×96 展开（电话 / 客服）、外部点击关闭、Escape 关闭且焦点回到按钮、客服提示层开关、与底部导航碰撞 0 | PASS |
| 优惠券遗留锁（只读） | 换为无券支付后 CPN-001 仍 LOCKED 且其他新客券未失效；CPN-001→CPN-002 换券支付后 CPN-001 仍 LOCKED | **FAIL（P1-2，母版既有，未修改）** |
| 页面脚本错误 | 全部流程 0 | PASS |

严重程度、复现、最小修改文件与方案见 `docs/H01_007_OPEN_ISSUES.md`。P0：无。P1 两项均为 004B 母版既有，不是 H01-007 引入；按任务书未实施，需批准。

## 3. S5-C 最终候选包整理

| 项 | 结果 |
|---|---|
| 逐文件比较 | `docs/H01_007_CHANGE_MANIFEST.md` / `.json`（004B → 最终候选，不重复计数） |
| 8 个新增测试登记方案 | 4 个逻辑测试（.cjs，秒级）登记进 `tools/run_regression.py`（原 34 项 → 38 项）；4 个 HTTP 流程套件每套数分钟、超过 run_regression 单项 100 s 预算，作为第二梯队单独运行（命令见 README_CURRENT H01-007 段），全部文件登记进 RELEASE_MANIFEST |
| RELEASE_MANIFEST | `tools/check_package.py --write-manifest` 重算全量哈希；版本串 `H01-007 Core Trade Fix Candidate 2026-10-13`，baseline 记 004B 哈希，`changes` 记 S1–S5 五条，`distinct_files_vs_004B` 记逐文件统计；路径改为 POSIX 分隔符；release_gate 仍 HOLD。`check_package.py` 改动 2 行：版本串与保留既有 `changes` |
| 原型入口 / 资源引用 / 必要文件 | `check_package.py`：文件哈希全部一致、字面 HTML/CSS 链接 0 断链（结果见交付目录 `evidence/check_package_final.json`）；`check_http.py` PASS |
| 原 004B 母版与回滚 | 原始 ZIP 只读保留于 S1 检查点与本交付目录 `source_zip/`；回滚 = 用其整目录替换本候选目录。S5 改动前 6 个文件副本在 `evidence/files_before_s5/` |
| 候选 ZIP | 唯一最终候选 `Mini_Koala_H01_007_Core_Trade_Fix_Candidate_2026-10-13.zip`，sha256 见交付目录 `candidate_sha256.txt` |

## 4. 分级汇总

- **PASS**：S1–S4 源码边界与冻结规则、阶段逻辑 / HTTP 测试、核心链路一致性、契约更新、004A 资料入口、004B 帮助浮窗、估算页浮窗、页面错误 0、包完整性。
- **FAIL（真实缺陷，母版既有，未修改）**：P1-1 C02 底栏偏移、P1-2 优惠券遗留锁；P2 ×7（导航图标、切换条换行、浮窗遮金额、估算页无租期按钮提示、Q01 过期行标签压暗、提示过长、浮窗跨页样式）。
- **FAIL（历史测试契约 / 基建）**：旧回归 5 项（文案 2、vm 缺函数 3）保留原样未改。
- **BLOCKED**：无。
- **NOT TESTED**：微信真机、原生小程序组件适配；5 项硬编码路径测试在原路径下不可运行（已在临时副本复跑）。

## 5. 正式开发待确认

见 `docs/H01_007_OPEN_ISSUES.md` 末节（已结束 / 退款订单的首购判定、PENDING 锁券超时、多笔待支付、赠运输首单、企业入口是否带需求）。

**Release Gate 保持 HOLD。S5 到此停止；是否接收本候选包由 ChatGPT 项目评审确认。**
