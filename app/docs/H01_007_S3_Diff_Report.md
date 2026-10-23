# H01-007-S3 差异与验收报告｜D-07 过期报价保护 · D-12 支付失败恢复

日期：2026-10-13 ｜ 基线：S2 已完成工作区（检查点 sha256 `f89a89380aee6ca926d8621b962873c411e7190f2205aee36b561caf7288006e`）｜ Release Gate：**HOLD（未改）** ｜ 原始母版 H01-004B：未覆盖 ｜ 本阶段只做 D-07、D-12，**未进入 S4 / S5**。

## 0. 启动前核验（任务书 §0）

| 项 | 结果 |
|---|---|
| 血统 | 以 `/tmp/mk_h01_007_s1/work`（S2 交付时声明的权威工作区）为唯一输入复制到 `/tmp/mk_h01_007_s3f/{pre,work}`。按**文件哈希**核对：S1 的 8 个修改文件 + 2 个新测试、S2 的 2 个修改文件 + 2 个新测试，14/14 与 S1 / S2 交付的 Changed_Files 记录一致（`evidence/lineage_check.log`）。未从 H01-004B 或 S1 重新分叉。 |
| S1 检查点哈希不一致问题 | 不以 ZIP 名称或哈希判定，改以上述逐文件哈希判定；S1 两版检查点的代码文件哈希相同，差别只在证据目录。 |
| 并行运行提示 | 「进入 S3」在群里发了两次，系统启动了多条运行。本报告对应的运行建立在 f89a89 血统上；另一条运行（09:03 启动）复制的是 S2 早先那份、已宣布作废的 51bf33 血统（`/tmp/mk_h01_007_s2`，coupon 模块哈希 51f8bd28…）。两份若同时出现，**以本报告（f89a89 血统）为准**，协调记录见 `/tmp/mk_h01_007_s3/COORDINATION_PARALLEL_RUNS.md` 的副本 `evidence/COORDINATION_PARALLEL_RUNS.md`。 |
| 已读文件 | S2 差异报告 §6/§7（S3 接续注意事项）、S1 差异报告、本次 S3 任务书、`PRICE_SEMANTICS_DISPLAY_SPEC_V1.md`、`COUPON_BENEFIT_SYSTEM_SPEC_V1.md`。 |
| 修复前失败样本 | 先写 `qa/test_h01_007_s3_http_flows.py`，在**未修改的 S2 树**上以 `--expect baseline` 运行（`evidence/http_before_fix/`），再实施修改。 |

## 1. 修复前的实际行为（真实 HTTP + Chromium，375×812 与 390×844 结果相同）

**D-07**
- 母版（Acceptance Fix V1.1 的 `mini_koala_acceptance_v11_state_patch.js`）**已经**做了一部分：Q01 在 `quoteStatus=expired` 或 `valid_until` 已过时加「方案已超过参考窗口」横幅、禁用「保存方案」、把「继续下单」改成「重新获取报价」并跳到 U01、清掉共享价格快照。因此**过期报价不会把旧快照直接带进 O01 付款**，这一点基线上就是通过的（修复前基线里 3 项 defect 类检查已通过，已如实计入）。
- 缺的部分：U01 重新定价后**没有任何核对结果**。QUOTE_CHANGED 样本（保存时应付 ¥4,657，现价 ¥4,307）在 U01 静默显示 ¥4,307，「立即下单」直接进 O01，用户没有被告知价格变了、也没有确认动作；QUOTE_49H 同样没有「已核对、一致」的反馈。横幅没有 DOM id、没有提到 48 小时，M01 入口与 H01 入口文案不一致。
- 48 小时内（QUOTE_24H）：H01「已保存方案」→ Q01 无提示 → 「继续下单」直接进 O01，门禁 OK、可支付。**这是要保持的行为。**

**D-12**
- 网关失败结果处理后订单变为 `PAYMENT_FAILED`，订单号保留，O02 显示「支付未完成 / 重新支付」（基线正确）。
- 但从首页回来：`hsiValidPending` 只认 `PENDING / PENDING_PAYMENT`，待支付卡片隐藏，首页聚焦到「已估算」卡；「我的」页没有任何订单卡片，角标显示「查看订单记录」，`goOrder` 会把失败订单送到已支付订单详情页 O03。
- 浏览过另一个仓位（共享价格快照被覆盖）后，O02「重新支付」进入 O01：门禁 `IDENTITY_MISMATCH`，金额变「—」、按钮「报价待确认」禁用，**原订单无法继续**（基线 ORDER_ID_PRESERVED 失败的原因）。
- NO_FALSE_SUCCESS 三种情况（重开 O02、他单 PAID 结果、未知订单号）基线上都不会显示成功，S3 未改 O02。

**与 S2 的交叉（CROSS_S2）**
- 待支付订单 A 锁了 ¥200 新客券，历史出现已支付订单 B 后，O01 门禁返回 `CUSTOMER_NOT_ELIGIBLE`，支付被拦（S2 保护有效），但提示是通用的「当前方案价格需要重新确认，请返回仓位方案查看最新费用」，没有说明原因，也没有在保留订单号的前提下重新核价的路径。

## 2. 改动内容

### 2.1 共享 SSOT（`mini_storage_business_ssot_v274.js`，S1 已改过，本次只追加）
新增 `window.MINI_STORAGE_TRADE_RECHECK_V1`：`quoteExpired(quote, now)`（status=active 且 valid_until ≤ now，或 status=expired）、`resumableOrder(order)`（有 order_no + unit_id 且状态为 PENDING_PAYMENT / PAYMENT_FAILED）、`amountDiff(saved, fresh)`（逐项比较整期租金、月均、押金、管理费、优惠金额、首次应付、优惠券）、`describeChanges`、`quoteAmounts / orderAmounts`（记录自带 price_snapshot 优先，否则按旧字段映射）、`money`。**纯函数，不计算任何价格**；`contractRent / monthlyReference / termFactor / validTerm / confirm()` 均未动。

### 2.2 D-07
- `mini_koala_acceptance_v11_state_patch.js`（Q01 过期分支）：横幅加 `id="quoteExpiredNotice"`，文案改为「方案已超过 48 小时参考期 · 原方案金额仅供查看。请重新获取当前报价：系统会按当前价格、优惠和可租情况重新核对，如有变化，需要您确认后才会继续下单」；跳转 U01 时追加 `requote=1&quoteId=<quote_id>`。原有「金额仍可查看、保存禁用、清除旧快照」逻辑保留；既有测试 `test_acceptance_v11_patch.cjs` 断言的「重新获取当前报价」措辞保留。
- `U01` 末尾新增核对块：当 `requote=1`（或 D-12 的 `resumeOrder=`）时，用 U01 自己的 `currentPriceSnapshot()` + 优惠券模块 `applyToSnapshot()` 得到当前价，和保存的报价/订单逐项比较，在价格面板上方插入 `#requoteNotice`：一致 → 「已重新核对，与原方案一致，首次应付 ¥x，可以继续」；有变化 → 列出每项「原 → 现」，并要求点「我已了解，按当前价格继续」（`#requoteAck`），**未确认前「立即下单」「保存方案」被拦**（toast「价格或优惠已变化，请先确认」）；售罄 → 提示并沿用 U01 既有的按钮禁用；租期变化会自动重算并重新要求确认。
- 不改价格门禁（`mini_storage_price_gate_v1.js` 哈希与 H01-004B 相同），不在门禁里发明 48 小时过期。

### 2.3 D-12
- `H01`：`hsiValidPending` 增加 `PAYMENT_FAILED`，待支付卡片对失败订单显示「有一笔订单支付未完成 / 上次支付未完成，订单已保留。继续支付前会再次确认仓位、价格和优惠」。只改判定与文案，双任务结构、推荐门店、视觉未动（`pendingCard` 仍是唯一一张）。
- `M01`：失败订单显示「支付未完成 · 上次支付未完成 / 继续处理订单 ›」卡片，角标「1个支付未完成」，`goOrder` 送到 O01（不再送到 O03）。
- `O01`：
  1. 带 `orderNo=` 进入且该订单可恢复时，若共享价格快照身份不符而**订单自带的快照**身份相符，则用订单自己的快照（解决浏览其他仓位后无法恢复）；
  2. 页面底部新增 `#orderResumeNotice` 恢复核对：订单状态（找不到可恢复订单 → 明确说明并禁用支付，不代生成新订单）、演示库存（同容量 `available_count` ≤ 0 → 已售出，禁用支付）、当前价格（用 `MINI_KOALA_DATA.positivePrice` + SSOT `contractRent / monthlyReference`，与 U01 同一套权威算法）、优惠资格（优惠券模块 `applyToSnapshot` + 价格门禁结果）。全部一致 → 「已重新核对…可以继续支付；支付成功前不会显示成功状态」；任一变化或门禁失败 → 列出原因与差额、禁用支付、提供「按当前价格重新核价 ›」（跳 U01，带 `resumeOrder=<订单号>`）。
  3. 门禁 `CUSTOMER_NOT_ELIGIBLE` 时明确写「您已有成交订单，原订单中的新客优惠不再适用」。
- 订单号复用规则（O01 既有：同门店 + 同容量选项/仓位 + 状态 PENDING_PAYMENT/PAYMENT_FAILED 则沿用 order_no）未动，因此重新核价后再下单仍是同一订单；O02 未改，成功状态仍只来自匹配订单号的 PAID 网关结果或已 PAID 的订单。
- 支付前的 `liveCheck`（原有）保留，继续再次核价与核券。

### 2.4 没有做的事
不改 O02 / Q01 HTML / 优惠券模块 / C02 / 价格门禁 / RELEASE_MANIFEST；没有新增优惠券锁定超时、自动释放时长或退款资格规则；没有改商业价格、折扣、押金 = 1 个月月均、管理费 50。

## 3. 改动文件（相对 S2 工作区）

| 文件 | 类型 | 问题编号 | 受管理 |
|---|---|---|---|
| prototype/mini_storage_business_ssot_v274.js | 修改（追加 RECHECK 助手） | D-07 / D-12 | 是 |
| prototype/mini_koala_acceptance_v11_state_patch.js | 修改（Q01 过期分支 2 处） | D-07 | 是 |
| prototype/mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html | 修改（末尾核对块） | D-07 / D-12 | 是 |
| prototype/mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html | 修改（3 处） | D-12 | 是 |
| prototype/mini_storage_home_H01_Visual_V2_7_4_SSOT.html | 修改（3 处：判定 + 2 段文案） | D-12 | 是 |
| prototype/mini_storage_mine_m01_v1_11_self_service_Visual_V2_7_4.html | 修改（3 处） | D-12 | 是 |
| qa/test_h01_007_s3_trade_recheck.cjs | 新增（逻辑/源码测试） | — | 否 |
| qa/test_h01_007_s3_http_flows.py | 新增（HTTP 双视口流程） | — | 否 |

哈希见 `H01_007_S3_Changed_Files.txt`；逐行 diff 见 `evidence/diff/H01_007_S3_unified.diff`；修改前副本在 `evidence/files_before_s3/`；补丁脚本 `evidence/apply_s3_patch_script.py` 可在 S2 树上重放得到完全相同的文件。所有改动处带 `H01-007-S3` 注释。

## 4. 验收层级（分别记录，不互相替代）

| 层级 | 结果 |
|---|---|
| 源码修复 | 完成：6 个受管理文件修改、2 个测试新增、0 删除；S1 的 validTerm / confirm() / commitTradeRequirement / Q01-O01 快照结构、S2 的优惠券模块与 C02（哈希不变）全部保留 |
| 逻辑测试 `qa/test_h01_007_s3_trade_recheck.cjs` | S3 树 **18/18**；同一测试指向 S2 树 6/18（缺陷复现） |
| HTTP 真实浏览 `qa/test_h01_007_s3_http_flows.py`（375×812、390×844，DPR 2） | S3 树 **27/27 × 2 视口 = 54/54**；S2 树 10/27 × 2（7 项 invariant 通过 + 3 项母版已处理的 defect 检查通过，其余 17 项复现缺陷）；浏览器控制台与 pageerror **0** |
| S1 关键回归 | S1 HTTP 42/42，S1 逻辑 13/13 |
| S2 关键回归 | S2 HTTP 40/40，S2 逻辑 14/14，既有 `test_coupon_benefit_system_v1.js` PASS |
| 既有回归 `tools/run_regression.py`（34 项） | **22/34，通过/失败集合与 S2 逐项相同**；12 项既有失败原因同 S1/S2 报告（Chromium 路径硬编码、check_package 未登记新测试、Node 版本等）。两项既有源码测试（`test_acceptance_v11_patch.cjs`、`test_external_review_merge_v2.cjs`）在第一版补丁上曾失败，已按它们的契约调整实现（保留「重新获取当前报价」措辞；O01 恢复块改用内联 localStorage 读取），而不是改测试 |
| 微信真机 | **NOT TESTED** |

独立核验运行（只读）对本工作区的最终复核：D-07/D-12 专用检查 24/24 × 2 视口、S1 smoke 21/21 × 2、S2 smoke 20/20 × 2，复核前后 6 个文件哈希不变；对账见 `H01_007_S3_Verification_Reconciliation.md`。

覆盖的流程：QUOTE_24H、QUOTE_49H（H01 入口 + M01 入口）、QUOTE_CHANGED、PAY_FAIL、ORDER_ID_PRESERVED、NO_FALSE_SUCCESS、CROSS_S2。订单号、报价时间、金额与优惠状态的修复前后对照见 `H01_007_S3_Before_After.md`。

关于 PAY_FAIL 的触发方式：O01 的 `review=1&simulatePayment=PAYMENT_FAILED` 只影响 O02 的评审展示、不落盘；测试因此把网关结果记录（`mini_storage_payment_result_current`）留给**非评审模式的 O02** 去处理，这是母版里网关回调的真实数据路径，不是 DOM 注入。

## 5. 与 S2 的交叉风险核验

- **已支付订单 B 使 A 丧失首购资格**：A 从首页继续支付 → O01 禁用支付并明确说明「您已有成交订单，原订单中的新客优惠不再适用」，列出「优惠金额 ¥200 → ¥0；首次应付 ¥4,307 → ¥4,507；优惠券 CPN-001 → 无」，「按当前价格重新核价」→ U01 再次要求确认 → 下单后仍是订单 A 的订单号（历史 2 单：B + A），应付 ¥4,507、无券。**没有按旧优惠支付。**
- **同订单切换优惠券后旧券仍 LOCKED（S2 已登记，只读核验）**：本次 CROSS_S2 复现了一个相邻变体——A 最终以无券方式支付成功后，钱包里 CPN-001 仍是 `LOCKED → A`（`evidence/http_after_fix/results.json` → CROSS_S2.final.wallet_after）。它**不阻塞**本阶段主路径（支付成功、订单号保留），但会让这张券既不能被本人再用、也不会按「NEW_CUSTOMER_COMPLETED」失效。最小修复建议（未实施）：`syncPaymentResult` 在订单 PAID 时，把 `locked_order_id === 该订单号` 且 `user_coupon_id !== 订单实际使用券` 的 LOCKED 行按既有规则置为 INVALID（新客券）或回到 CLAIMED（非新客券）。需要业务确认后在 S5 或单独任务做。
- 未新增任何锁券超时、自动释放时长或退款资格规则。

## 6. 遗留问题与 S4 接续说明

1. RELEASE_MANIFEST 累计 16 个文件哈希已变（S1 8 + S2 2 + S3 6），按约定留 S5 统一重算；新测试（S1/S2/S3 共 6 个）未登记进 `tools/run_regression.py` 与 `check_package.py`。
2. 母版 Acceptance V1.1 对 Q01 过期的处理与本次 S3 共存于同一文件，S5 做 Change Manifest 时注意该文件同时承载两期改动。
3. D-12 的「演示库存」用 `MINI_KOALA_DATA.getLegacyUnits().available_count`（U01 选实际仓位时用的同一字段）；U01 自身的售罄判断还叠加了 `MINI_STORAGE_UNIT_MASTER_V1.getCapacitySummary`，O01 没有加载该模块，二者在当前演示数据下一致，若 S5 要完全统一可让 O01 也加载 unit_master。
4. O01 恢复核对块位于 `if(!gateResult.valid)` 之后，**S4 若改 O01 的通知区域或 `#pay` 文案要注意顺序**；S4 的 D-01（普通浏览 vs 继续找仓）会改 H01 的入口逻辑，本次 H01 只动了 `hsiValidPending` 与两段待支付文案（约第 1720、2087-2089、2278 行），S4 必须从本检查点工作区 `/tmp/mk_h01_007_s3f/work` 起步。
5. 修复前基线里 3 项 defect 类检查已经通过（母版已有的 Q01 过期重定向），报告与 results.json 已如实标注；S3 在其上补的是显式核对、确认门槛与两端入口一致。
6. 微信真机未测；三元桥/安贞店等门店名称按数据文件原样显示，未核对门店主数据。

## 7. 回滚

- 方式一：用 S2 检查点 ZIP（sha256 `f89a89380aee6ca926d8621b962873c411e7190f2205aee36b561caf7288006e`）内的 `Mini_Koala_H01_Lifestyle_Step03/` 整目录替换本检查点的同名目录，即回到 S2 工作区。
- 方式二：把 `evidence/files_before_s3/` 下 6 个文件覆盖回 `prototype/`，删除 `qa/test_h01_007_s3_http_flows.py`、`qa/test_h01_007_s3_trade_recheck.cjs`、`docs/H01_007_S3_*`，即回到 S2 树（哈希见 Changed_Files）。
- 回到 H01-004B：S1 检查点内的只读原始 ZIP（sha256 `ed87033141944066265d3984ee4e10411d8ea6af84288eb9daabffc1e87c29ca`）。

**Release Gate 保持 HOLD。S3 到此停止，不进入 S4。**
