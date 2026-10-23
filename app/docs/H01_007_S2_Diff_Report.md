# H01-007-S2｜首购资格与优惠券占用恢复 · 阶段差异报告

## 基本信息

- 任务 ID：H01-007-S2（仅 D-05、D-06；未进入 S3/S4/S5）
- 阶段执行工具/模型：Claude Code（Fable 5.1）+ 本地 Chromium 148 / Playwright（真实 HTTP）+ Node 20
- 实际输入：**S1 已修改工作区**（与 `Mini_Koala_H01_007_S1_Checkpoint_2026-10-13.zip` 内目录逐字节一致，S1 检查点 SHA-256 `2f7e568e8651016499b3ad579113f6ff68310091a21b92514d6c375d050456ee`）。未从 H01-004B 重新分叉；S1 的 `validTerm()` / `MINI_STORAGE_TRADE_SNAPSHOT_V1.confirm()` 及 U01/Q01/O01 改动原样保留，本阶段未触碰这些文件。
- 原始 H01-004B SHA-256：`ed87033141944066265d3984ee4e10411d8ea6af84288eb9daabffc1e87c29ca`（只读未改）
- Release Gate：**HOLD（未变）**；`RELEASE_MANIFEST.json` 与 H01-004B 逐字节相同（本阶段未改写，待 S5 统一重算）

## 修改概要

| 问题 ID | 原缺陷与复现证据（修复前，真实 HTTP，375×812 与 390×844 结果一致） | 改动文件和原因 | 修复后验证 | 结论 |
|---|---|---|---|---|
| D-05 | `isNewCustomer()` 只看 `mini_storage_order_current` 是否 PAID。一旦已支付订单 A 因新订单成为当前订单而被移入 `mini_storage_order_history_v242`，用户立刻重新成为"新客"。REPEAT 复现：历史 PAID 订单 A + 当前待支付订单 B → U01（安贞店 BJ0498S01B001，6 个月）自动套用新客租仓券：快照 `coupon_applied:true`、`coupon_customer_first_purchase:true`、优惠 −¥200，应付 ¥4,307（应为 ¥4,507）；C02 把「新客租仓券」列在"当前可用·使用中"；O01 带券支付成功，钱包 CPN-001 被复购用户 REDEEMED。 | `prototype/mini_storage_coupon_benefit_v1.js`：新增 `isPaidRental()`、`paidRentalHistory()`，`isNewCustomer()` 改为"当前订单 ∪ 订单历史（与 `MINI_STORAGE_REPO_V242.keys.history` 同一存储键）中不存在任何 `status==='PAID'`（且 `payment_status` 为 PAID 或缺省）的订单"，按 `order_no` 去重，无 `order_no` 的记录忽略。未支付（PENDING_PAYMENT / PAYMENT_FAILED）的历史不计。**未建立任何手机号 / 微信账户跨身份规则**（待业务确认），仍以本机订单记录为准。`ensureAcquisitionWallet()`、`isFirstPurchaseContext()`、`validateSnapshotCoupon()` 的 `CUSTOMER_NOT_ELIGIBLE` 分支、续租券 CPN-004 逻辑均未改，自动沿用新判断。 | 同一 REPEAT 流程：U01 面板「优惠券 · 暂不使用」，快照 `coupon_applied:false`、`coupon_customer_first_purchase:false`、应付 ¥4,507；C02 两张新客券均列为"暂不可用 · 仅限首次租仓"；O01 价格门禁通过、无券行、`确认并支付 ¥4,507`，订单 PAID 且 `coupon_id:null`；预置的三张 CLAIMED 券未被核销。FRESH（无历史）：CPN-001 −¥200 照常，支付后 CPN-001 REDEEMED、CPN-002/003 INVALID（既有规则不变）。续租券不受影响（逻辑测试）。 | **PASS**（源码 / 函数 / HTTP 真实浏览）· 微信真机 NOT TESTED |
| D-06 | `reason()` 与 `validateSnapshotCoupon()` 只接受 `CLAIMED`。O01「确认并支付」把券写成 `LOCKED{locked_order_id}` 后，若支付结果为待处理（`simulatePayment=PENDING`），用户从 O02 浏览器返回、点「继续支付」或从 M01「待支付订单」回到 O01 时，价格门禁返回 `COUPON_EXPIRED_OR_USED`：页面提示「当前方案价格需要重新确认」，租金/应付显示「—」，按钮变为灰色「报价待确认」，原订单无法继续；C02 把自己锁定的券显示为「优惠券状态不可用」。 | `prototype/mini_storage_coupon_benefit_v1.js`：新增 `recoverableLockOrder(base)`（当前订单状态为 PENDING_PAYMENT / PAYMENT_FAILED，且待校验快照的门店 + 规格选项（或仓位号）+ 实际仓位与该订单一致 —— 与 O01 复用 `order_no` 的同一身份规则 —— 才返回其 `order_no`）和 `lockOwnedBy(row, orderNo)`（`LOCKED` 且 `locked_order_id` 相等）。`reason()`、`validateSnapshotCoupon()` 仅在"自己订单锁定"时放行 LOCKED 券，其他订单得到 `COUPON_LOCKED_BY_OTHER_ORDER` / 文案「优惠券正在其他订单中使用」；`applyToSnapshot()`、`couponContextFromSnapshot()` 把 `recover_order_no` 带进上下文。**不把所有 LOCKED 视为可用；未新增任何锁券时长、释放时间或折扣门槛；过期、已核销、规则不符、金额不符、选择变更、首购资格等既有检查全部保留。** `prototype/mini_storage_coupon_select_c02_v1.html`：上下文改由 `API.couponContextFromSnapshot(s)` 构造（字段与原来完全相同，仅多 `recover_order_no`），让 C02 对自己订单锁定的券显示为可用。 | OWN_LOCK：支付待处理后券为 `LOCKED`、`locked_order_id` = 订单号；三条回路（浏览器返回 / O02「继续支付」/ M01「待支付订单 › 查看订单」）回到 O01 均 `gate.valid:true`，券行「新客租仓券 −¥200」、`确认并支付 ¥4,307`，按钮可用；C02 把该券列在"当前可用 · 使用中"；再次支付后订单号不变（历史仅 1 条），券 REDEEMED 且 `redeemed_order_id` = 同一订单号。OTHER_LOCK：A 待支付锁券时，双井店 BJ0494S01D003（6 个月整期 ¥2,940 ≥ ¥2,000 门槛）的订单 B：U01 不套券、C02 显示「优惠券正在其他订单中使用」、O01 以 ¥3,480 全价通过门禁，钱包锁状态未被改动；对照组 A 自身身份仍能恢复该券。 | **PASS**（源码 / 函数 / HTTP 真实浏览）· 微信真机 NOT TESTED |

金额对照（安贞店 · BJ0498S01B001 · 6 个月，修复前后计算公式完全相同）：整期租金 ¥3,820，折后月均 ¥637 = 押金，管理费 ¥50；用 CPN-001 时应付 ¥3,620 + ¥637 + ¥50 = ¥4,307，不用券时 ¥4,507。修复只改变"谁有资格用券"和"锁定后谁能恢复"，不改变任何金额规则。

## 防回归

- **本阶段目标场景（真实 HTTP）**：FRESH、REPEAT、OWN_LOCK（三条恢复回路 + 最终支付）、OTHER_LOCK（含对照）、INVALID（1 个月整期 ¥680 低于 ¥2,000 门槛；长租券租期不足；CPN-001 过期）。20 项检查 × 2 视口 = **40/40 PASS**；同一脚本在 S1 检查点树上 `--expect baseline` 运行 **18/40**，22 项失败全部是 D-05/D-06 的缺陷复现（11 项 × 2 视口），FRESH / INVALID 修复前后均通过。
- **逻辑/函数级**：`node qa/test_h01_007_s2_coupon_eligibility.cjs` → **14/14 PASS**；指向 S1 检查点的 `mini_storage_coupon_benefit_v1.js` 运行 → 5/14（9 项失败即缺陷复现）。覆盖：FRESH、未支付历史不影响首购、REPEAT（历史 + 当前待支付 / 当前即 PAID / 仅历史 / 已结束生命周期）、续租券不受影响、OWN_LOCK（PENDING_PAYMENT 与 PAYMENT_FAILED 两种状态；恢复时仍执行租期/租金/金额/选择校验）、OTHER_LOCK（不同门店；同门店同规格但订单号不同；当前订单已 PAID；无当前订单；LOCKED 无归属；规格选项不同）、INVALID（过期/已核销/INVALID/租金门槛/租期门槛/券不存在）、状态迁移（PAID→REDEEMED + 其他新客券 INVALID；PAYMENT_FAILED→CLAIMED）、源码守卫（无锁券时长常量；C02 使用共享上下文）。
- **S1_SMOKE**：`python3 qa/test_h01_007_s1_http_flows.py --expect fixed` 在 S2 工作区 → **42/42 PASS**（无租期恢复、6→12 月快照、直接下单、H01 卡片两态）；`node qa/test_h01_007_s1_requirement_trade_snapshot.cjs` → 13/13 PASS。
- **既有券测试**：`node qa/test_coupon_benefit_system_v1.js` → PASS（6 个月 canonical 用例 ¥3,440 → CPN-001 −¥200 → 应付 ¥3,863 不变）。
- **既有回归** `python3 tools/run_regression.py`：22/34，34 项 PASS/FAIL 状态与 S1 修复后逐项一致（12 项既有失败均为母版/环境问题，原因见 S1 报告，本阶段未变）。
- **改动前后字段/存储对照**：`outputs/h01_007_s2/http_before_fix/results.json` 与 `outputs/h01_007_s2/http_after_fix/results.json`（每个用例的 U01 面板文本、价格快照券字段、C02 可用/不可用卡片与原因、O01 门禁状态/券行/应付/按钮、订单关键字段、钱包各券 `status / locked_order_id / redeemed_order_id`）。状态迁移逐步记录见 `docs/H01_007_S2_State_Transitions.md`。
- **实际运行环境与视口**：Linux，`python3 -m http.server` 真实 URL 导航；Chromium 148（Playwright）；375×812 与 390×844，DPR 2，移动端触控上下文；仅 localStorage 预置 + 用户式点击，无 DOM 注入业务逻辑。浏览器控制台：0 条 error / pageerror。
- **微信真机**：NOT TESTED。

## 改动文件清单

新增：
- `qa/test_h01_007_s2_coupon_eligibility.cjs`（沙箱内函数级测试，可指向任一版本的券模块做前后对照）
- `qa/test_h01_007_s2_http_flows.py`（真实 HTTP 双视口流程测试，`--root` 可指向其他包、`--expect baseline|fixed`）
- `docs/H01_007_S2_Diff_Report.md`（本文）、`docs/H01_007_S2_Changed_Files.txt`、`docs/H01_007_S2_State_Transitions.md`
- `outputs/h01_007_s2/`（证据：修复前/后 results.json、截图、控制台日志、逻辑测试日志、S1 回归日志、既有回归日志、Change Manifest、unified diff、修改前文件副本）

修改（均为 Manifest 受管理文件，带 `H01-007-S2` 注释）：
- `prototype/mini_storage_coupon_benefit_v1.js`（D-05 + D-06）
- `prototype/mini_storage_coupon_select_c02_v1.html`（D-06，仅一处上下文构造）

删除：无

未授权改动：无。`mini_storage_business_ssot_v274.js`、`mini_storage_price_gate_v1.js`、O01/O02/U01/Q01/M01 页面本阶段未动（已 diff 确认与 S1 检查点逐字节一致）。`outputs/current_regression/results.json` 为运行既有回归产生的工件，非源码。

## 遗留与待确认（未自行决定）

1. **"有效已支付订单"的边界**：本阶段把任何 `status==='PAID'` 的订单（含生命周期已结束 / 已退租的）都视为已成交历史，即"首次租仓"按字面理解。退款后是否返还首购资格、已结束租约是否仍算"有效"，业务未定义，报告为待确认；逻辑测试中以"已结束仍算历史"作为显式假设标注。
2. **跨身份识别**：换设备 / 清除本地存储后无法识别历史成交，这是原型本地存储的固有边界；手机号 / 微信账户层面的规则按任务要求未自建。
3. **锁券释放时点**：待支付（PENDING）状态下券一直 LOCKED，没有超时；任务明确不允许自行设定释放时间，维持现状。
4. **多笔待支付订单并存**（D-13，暂缓）：另一笔待支付订单 B 支付成功时，被 A 锁定的新客券仍保持 LOCKED（既有规则只把 CLAIMED 的新客券置为 INVALID）。只读观察，未改。
5. **C01「我的优惠券」不展示 LOCKED 券**（可使用 = CLAIMED、已使用 = REDEEMED、已失效 = EXPIRED/INVALID/REVOKED），锁定中的券在三个页签都不出现。既有展示缺口，与 D-06 恢复无关，未动。
6. **首单搬运权益**（`transport_promo_status` / `first_order_transport_v1`）的"首单"判断在 O01/Q01 内，与券模块无关，本阶段未检查其历史订单逻辑，S3/S4 若涉及再看。
7. `RELEASE_MANIFEST.json` 中 2 个受管理文件哈希已变（连同 S1 的 8 个共 10 个），按约定留到 S5 重算；新测试未登记进 `tools/run_regression.py`。

## 下阶段接续材料

1. 当前工作区：`/tmp/mk_h01_007_s1/work/Mini_Koala_H01_Lifestyle_Step03/`（S1 + S2 叠加）；跨会话用 `Mini_Koala_H01_007_S2_Checkpoint_2026-10-13.zip`（含 H01-004B 原始 ZIP 只读副本，可直接回滚）。
2. 差异报告：本文；逐行差异 `outputs/h01_007_s2/H01_007_S2_unified.diff`；Change Manifest `outputs/h01_007_s2/H01_007_S2_Change_Manifest.json`（含 H01-004B / S1 检查点 / S2 三版哈希）。
3. 测试证据：`outputs/h01_007_s2/`；失败项：无（修复后）。
4. S3（D-07 报价过期、D-12 支付失败恢复）需要注意的冲突点：`validateSnapshotCoupon()` 现在依赖 `currentOrder()` 的状态与身份来判断可恢复锁券，D-12 若改动 O02 失败路径或 O01 订单复用规则，须保持 `recoverableLockOrder()` 的身份规则同步；D-07 的再核价应继续通过 `pricingGate.validate(..., couponVerifier)` 走券校验，不要绕开。`syncPaymentResult()` 的 PAYMENT_FAILED → CLAIMED 释放规则未动。
5. 不可擅自解除的 BLOCKED / 未确认规则：上节 1–3。

### 停步声明

本阶段 **完成**（D-05、D-06 源码修复完成；逻辑测试通过；HTTP 真实浏览通过；微信真机 NOT TESTED）。不声明 S3 及之后任何阶段完成。Release Gate 继续 HOLD，原始母版与统一项目母版均未覆盖。
