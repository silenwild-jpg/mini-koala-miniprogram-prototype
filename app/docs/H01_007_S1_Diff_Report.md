# H01-007-S1｜需求有效性与最终交易快照 · 阶段差异报告

## 基本信息

- 任务 ID：H01-007-S1（仅 D-03、D-04）
- 阶段执行工具/模型：Claude Code（Fable 5.1）+ 本地 Chromium 148 / Playwright（真实 HTTP）+ Node 20
- 实际输入文件：`source_zip/Mini_Koala_H01_004B_Help_Float_Candidate_2026-10-13.zip`（来自第三方交接包，只读未改）
- 原始 H01-004B SHA-256：`ed87033141944066265d3984ee4e10411d8ea6af84288eb9daabffc1e87c29ca`（实测一致）
- 解压：ZIP 内 706 个条目均为 Windows 反斜杠路径，已规范化为相对目录，703 个文件字节内容原样；Release Manifest 受管理文件 522 个，哈希核对 0 异常
- 输出工作区：`Mini_Koala_H01_Lifestyle_Step03/`（即本检查点 ZIP 内目录）
- Release Gate：**HOLD（未变）**；`RELEASE_MANIFEST.json` 本阶段未改写，待 S5 统一重算

## 修改概要

| 问题 ID | 原缺陷与复现证据（修复前，真实 HTTP，375×812 与 390×844 结果一致） | 改动文件和原因 | 修复后验证 | 结论 |
|---|---|---|---|---|
| D-03 | 保存需求只有容量、`term_months=0` 时：① M01「继续找仓」卡片和「最近找仓」显示 **1个月**，点击后跳 S01 `term=1` 并把需求写成 `term_months:1`；② S01 普通浏览条显示「约5.0m³ · 1个月」，点「按我的需求匹配」同样带 `term=1`；③ S01 以 `state=estimated&target=5.0` 进入且无 term 时静默按 6 个月定价并写回需求 `term_months:6`；④ U01 收到 `term=0` 时 `clampTerm` 变成 1 个月，可直接生成 1 个月价格快照并进入 O01。H01 自身（`hsiValidTerm`）已正确，无需修改。 | `mini_storage_business_ssot_v274.js`：新增共享 `validTerm()`（1–60 整数，否则 null，绝不代入默认值）。`M01`、`S01`、`S02`、`U01`、估算器 `S5` 的需求恢复/URL 解析改用该规则；缺失或非法租期时 M01、S01 三个入口统一跳转估算器已有的 `entry=known&requireTerm=1` 租期选择流程（与 H01 现有做法一致）；M01/S01 文案改为「租期待选择」；S01 在跳转前不再 `saveCurrentRequirement()`。`clampTerm` 本身与所有定价算法未动。 | M01 卡片与徽标显示「租期待选择」，点击落在估算器 `requireTerm=1` 且 URL 无 `term`，需求仍 `term_months:0`；S01 浏览条同上；S01 无租期 estimated 入口 `location.replace` 到租期选择，需求未被写成 6；U01 `term=0` 时租期保持未选、`#confirm` 提示「先选择实际租期」、不产生价格快照。HAS_TERM：6 个月需求恢复后 S01/U01 仍为 6。 | **PASS**（源码 / 函数 / HTTP 真实浏览）· 微信真机 NOT TESTED |
| D-04 | 需求 6 个月 → U01 改 12 → 保存方案 → Q01 → 继续下单 → O01 → 支付：订单 `term_months=12`、`price_snapshot.term_months=12`，但 `requirement_snapshot.term_months=6`，且 `mini_storage_requirement_current` 仍为 6；已保存报价 `quote_current.requirement_snapshot.term_months=6`；快照内无门店/仓位标识（`selected_store_id`/`selected_unit_id` 为空）。 | `mini_storage_business_ssot_v274.js`：新增 `MINI_STORAGE_TRADE_SNAPSHOT_V1.confirm(requirement, trade)`，以最终确认的门店/仓位/容量/租期覆盖需求快照的交易字段，首次估算原样保存在 `original_estimate`（只写一次），不计算任何价格字段。`U01`：在「立即下单」「保存方案」两个提交点调用 `commitTradeRequirement()`（仅当上下文需求与当前容量匹配）。`Q01`：`quoteRequirementContext()` 返回值经 `confirm()` 叠加最终交易（仅在价格门禁通过时）。`O01`：订单 `requirement_snapshot` 同样经 `confirm()`；重试同一订单时以订单自带快照为基础。价格、押金、管理费、优惠仍由原 `price_snapshot` 与 `pricingGate.validate` 决定，未改。 | 同一流程：U01 提交后需求 `term_months:12`、`original_estimate.term_months:6`；已保存报价 `term_months:12` 且 `requirement_snapshot.term_months:12`；订单 `term_months=12`、`price_snapshot.term_months=12`、`requirement_snapshot.term_months=12`，`selected_store_id=jianguo`、`selected_unit_id=BJ0498S01B001` 与订单一致；`payable_total(7442)==price_snapshot.upfront_payable(7442)`。DIRECT_ORDER（U01 直达 O01，6 个月）正常到达 O02 PAID，三处租期均为 6，合法交易未被阻断。 | **PASS**（源码 / 函数 / HTTP 真实浏览）· 微信真机 NOT TESTED |

金额对照（jianguo · BJ0498S01B001 · 12 个月，修复前后完全相同）：整期租金 ¥7,100，长租券 −¥300，押金 ¥592（=折后月均），管理费 ¥50，本次应付 ¥7,442。

## 防回归

- **本阶段目标场景**：NO_TERM（M01 / S01 浏览条 / S01 无租期 estimated / U01 term=0）、HAS_TERM、TERM_CHANGE（6→12，报价保存 + 继续下单两条支线）、DIRECT_ORDER，以及 H01「继续找仓」卡片无租期/有租期两态。共 21 项检查 × 2 视口 = 42/42 PASS（修复前同一脚本 `--expect baseline` 下 26/42 失败，即缺陷复现）。
- **上阶段必要回归**：无上阶段（S1 为首阶段）。本阶段回归了 U01 直接下单、U01→Q01→O01、押金/管理费/优惠/首次应付、H01 任务卡两态。
- **改动前后字段/URL/存储对照**：见 `outputs/h01_007_s1/http_before_baseline/results.json` 与 `outputs/h01_007_s1/http_after_fix/results.json`（每个用例的落地页、query、`mini_storage_requirement_current`、`mini_storage_price_snapshot_current`、`mini_storage_quote_current`、`mini_storage_order_current` 关键字段）。
- **实际运行环境与视口**：Linux，`python3 -m http.server`（127.0.0.1 随机端口）真实 URL 导航；Chromium 148（Playwright）；375×812 与 390×844，DPR 2，移动端触控上下文。浏览器控制台：0 条 error / pageerror（修复前后均为 0）。
- **逻辑测试与真实 HTTP 分开记录**：
  - 源码/函数级：`node qa/test_h01_007_s1_requirement_trade_snapshot.cjs` → 13/13 PASS。
  - 真实 HTTP：`python3 qa/test_h01_007_s1_http_flows.py --out outputs/h01_007_s1/http_after_fix --expect fixed` → 42/42 PASS；截图 34 张（17 个节点 × 2 视口）。
  - 既有回归 `python3 tools/run_regression.py`：修复前 22/34，修复后 22/34，34 项 PASS/FAIL 状态逐项一致，其中 33 项输出逐字相同（路径前缀除外），唯一输出差异是 `check_package` 多列出本阶段新增的 2 个 qa 文件。12 项既有失败在未修改的 H01-004B 基线上同样失败，与本阶段无关，原因已逐项核实：5 项 Python 浏览器脚本硬编码 `/usr/bin/chromium`（本机 Chromium 148 由 Playwright 管理，不在该路径）；1 项 `test_home_visual_closeout_patch_v1.py` 点击超时（修复前后相同）；1 项 `tools/check_package.py` 因 Manifest 以 Windows 反斜杠记录路径，在 Linux 下 495 个子目录文件被同时判为 Missing/Unlisted（用规范化路径复核：522 个受管理文件全部存在，其中 8 个为本阶段改动，其余 514 个哈希与 Manifest 一致）；5 项 Node 测试在母版自身即失败（`test_s01_filter_sort_refinement_v1`、`test_s01_ux_continuity_patch_v1`、`test_combo_full_journey_recovery_v21` 为 ReferenceError，`test_ux_simplification_v1`、`test_combo_recommendation_v1` 为内容断言不匹配）。日志见 `outputs/h01_007_s1/regression/`。
- **微信真机**：NOT TESTED。

## 改动文件清单

新增：
- `qa/test_h01_007_s1_http_flows.py`（真实 HTTP 双视口流程测试，`--expect baseline|fixed`）
- `qa/test_h01_007_s1_requirement_trade_snapshot.cjs`（源码 + 共享函数测试）
- `docs/H01_007_S1_Diff_Report.md`（本文）、`docs/H01_007_S1_Changed_Files.txt`
- `outputs/h01_007_s1/`（证据：修复前/后 results.json、截图、控制台日志、回归日志、Change Manifest 与 unified diff）

修改（8 个，全部为 Manifest 受管理文件，前后 SHA-256 见 `outputs/h01_007_s1/diff/H01_007_S1_Change_Manifest.json`）：
- `prototype/mini_storage_business_ssot_v274.js`（D-03 `validTerm`；D-04 `MINI_STORAGE_TRADE_SNAPSHOT_V1`）
- `prototype/mini_storage_mine_m01_v1_11_self_service_Visual_V2_7_4.html`（D-03）
- `prototype/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html`（D-03）
- `prototype/mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html`（D-03，仅 URL 租期严格解析 1 处）
- `prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html`（D-03，恢复入口 2 处）
- `prototype/mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html`（D-03 + D-04）
- `prototype/mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html`（D-04）
- `prototype/mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html`（D-04）

删除：无（原 ZIP 内 `qa/__pycache__` 下的 Python 缓存文件未带入工作区；Manifest 本身排除该目录，不影响受管理文件）

未授权改动：无。未触碰首页结构/视觉、推荐门店、H01-004A 资料入口、H01-004B 帮助浮窗、租金/折扣/押金/管理费/优惠规则、价格门禁、优惠券、报价有效期、支付失败、普通浏览语义（D-01/D-02/D-05～D-13 均未动）。`tools/run_regression.py` 未修改，新测试未登记（留给 S5 统一处理）。

## 遗留风险与只读发现（未修改）

1. 估算器 `openEstimateResult(r.target,state.term||6,lead)`（估算流程内部，非恢复入口）仍有 `||6` 兜底；该路径前置有「请先选择租期」拦截，实际不可达，本阶段未动，建议 S5 复核。
2. `pricing_preview`（需求内的参考价预览）在 U01 提交后仍是首次估算时的值；它不参与交易，只作历史参考，已随 `original_estimate` 语义保留。
3. Q01 在价格门禁未通过（`gateResult.valid=false`）时不叠加交易快照，直接返回原需求——这是有意为之（无效报价不应生成成交快照）。
4. 既有 12 项回归失败为母版/环境问题，非本阶段引入（明细见上「防回归」）；本机 Chromium 不在 `/usr/bin/chromium`，相关旧脚本需改路径才能跑，本阶段未改旧脚本，也未修改 `check_package.py` 的路径分隔符处理。
5. `RELEASE_MANIFEST.json` 中 8 个受管理文件哈希已变化，本阶段按约定不改写 Manifest；S5 打包前必须重算。
6. 微信真机未测试。

## 下阶段接续材料

1. 当前工作区检查点 ZIP：`Mini_Koala_H01_007_S1_Checkpoint_2026-10-13.zip`（内含 `source_zip/` 原始 H01-004B ZIP 只读副本 + 已修改工作区 `Mini_Koala_H01_Lifestyle_Step03/` + 本报告副本），SHA-256 见包内 `README_S1_CHECKPOINT.md` 与交付说明。本机工作区 `/tmp/mk_h01_007_s1/work/` 同步保留，同一环境接续 S2 时可直接使用。
2. 差异报告：本文；逐行 diff：`outputs/h01_007_s1/diff/H01_007_S1_unified.diff`（272 行）。
3. 测试证据与失败项：`outputs/h01_007_s1/`（修复前 26 项失败 = 缺陷复现；修复后 0 失败）。
4. 下一阶段（S2：D-05/D-06）需注意的文件冲突：`mini_storage_business_ssot_v274.js`（本阶段追加了两段导出，请在其后追加而不要重排）、`U01` 的 `goOrder/goQuote`（已插入 `commitTradeRequirement()`）、`O01` 的 `order` 对象构造（`requirement_snapshot` 已改为 `requirementSnapshot` 变量）、`Q01` 的 `quoteRequirementContext()`。S2 若改 `mini_storage_coupon_benefit_v1.js` 与 O01 首购判断，与本阶段无直接重叠。
5. 不可擅自解除的 BLOCKED / 未确认规则：微信真机 NOT TESTED；Release Gate HOLD；Manifest 待 S5 重算。

### 停步声明

本阶段 **完成**（D-03、D-04 源码修复完成，逻辑测试通过，HTTP 真实浏览通过，微信真机未测试）。不声明 S2–S5 完成，未进入 S2。Release Gate 继续 HOLD，原始母版未覆盖。
