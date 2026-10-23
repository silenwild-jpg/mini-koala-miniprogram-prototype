# H01-007-S4 差异与验收报告｜D-01 普通浏览与历史需求恢复分离 · D-02 门店返回状态恢复

日期：2026-10-13 ｜ 基线：S3 正式检查点工作区（检查点 sha256 `b124973a9fe85c2cb8f7eb37387f241f6f840e1dc331ebffc0fb75c08b4cd39c`，f89a89 血统）｜ Release Gate：**HOLD（未改）** ｜ 原始母版 H01-004B：未覆盖 ｜ 本阶段只做 D-01、D-02，**未进入 S5**。

> 交付说明：S4 实施运行在 10:29 写完改动清单、Change Manifest、统一 diff 与全部测试证据后中断，没有写出报告、对照表和检查点 ZIP。本报告与 `H01_007_S4_Before_After.md`、`H01_007_S4_Regression_Classification.md`、检查点 ZIP 由后续运行在**同一工作区、代码零改动**的前提下补齐；补齐前逐项核对了 Changed_Files / Change Manifest / 统一 diff 与工作区实际文件哈希，全部一致，并重新执行了 S4 逻辑测试（30/30）与既有回归中新失败的那一项以确认原因。

## 0. 启动前核验（任务书 §1）

| 项 | 结果 |
|---|---|
| 唯一输入 | `/tmp/mk_h01_007_s3f/work/Mini_Koala_H01_Lifestyle_Step03`（S3 交付声明的权威工作区，= S3 检查点 b124973a… 内同名目录）。在同一目录继续修改，未从 H01-004B、S1、S2 重新分叉，未合并 51bf33 等已作废的并行运行。修改前的 S3 树另存一份只读副本 `/tmp/mk_h01_007_s4/baseline_tree` 作为「修复前」对照。 |
| 血统核对（按文件哈希） | `evidence/inherited_hashes.json`：S1/S2/S3 累计改动的受管理文件（SSOT、U01、Q01、O01、M01、估算器、优惠券模块、C02、验收状态补丁）9 个 + 冻结参照 2 个（价格门禁、O02）+ RELEASE_MANIFEST + S1/S2/S3 的 6 个阶段测试 = 18 项，全部与 S3 交付的 Changed_Files 哈希一致；S4 将改的 H01 / S01 / S02 在打补丁前核对为 S3 值（见 `H01_007_S4_Changed_Files.txt` 的 before 哈希，副本在 `evidence/files_before_s4/`）。 |
| S1 / S2 / S3 修复是否保留 | 租期与交易快照（S1）：SSOT、U01、Q01、O01 哈希未变；优惠券逻辑（S2）：优惠券模块、C02 哈希未变；过期报价与支付失败恢复（S3）：SSOT、验收状态补丁、U01、O01、M01 哈希未变，H01 中 S3 的 `hsiValidPending` 与两段待支付文案原样保留（逻辑测试第 15 条）。 |
| 先复现后修复 | 先写 `qa/test_h01_007_s4_http_flows.py` 与 `qa/test_h01_007_s4_entry_contracts.cjs`，在未修改的 S3 树上以 `--expect baseline` 运行（`evidence/http_before_fix/`、`evidence/logic_before_fix.log`），再打补丁。 |
| 不改价格 / 优惠 / 订单 / 支付核心 | SSOT 无 `H01-007-S4` 标记（逻辑测试第 29 条）；价格门禁、优惠券模块、O01、O02、U01、Q01 哈希与 S3 相同。 |

## 1. 修复前的实际行为（真实 HTTP + Chromium，375×812 与 390×844 结果相同）

**D-01**
- 用户保存了 5.0m³ / 6 个月需求后，首页「查看附近门店」与底部「门店」页签进入 S01 时带 `state=estimated&target=5&term=6&min=4.5&max=5.8`，列表直接是需求匹配态（chip=estimated，body=demand-state），不是普通浏览；S01 的「按我的需求匹配」切换条因此没有机会出现。
- 首页推荐门店卡进入 S02 时 `state=matched` 并携带 target / term，用户没有点过任何「继续找仓」。
- 只有容量没有租期（term_months=0）时，门店卡仍把 S02 建成 `state=matched&target=5`（无 term）的匹配态。
- 从 S02 返回落在 `state=estimated` 的列表，而不是用户来时的浏览列表。
- 首页有支付失败订单或过期方案时，「查看附近门店」同样被历史需求劫持。
- 已经正确、S4 必须保持的部分：「继续找仓」卡恢复 5.0m³ / 6 个月进入匹配列表；无租期时「继续找仓」去 S5 选租期（`requireTerm=1`），不代默认月份；浏览从不删除已保存需求；S3 的支付失败任务卡优先级与「继续支付」入口正常。

**D-02**
- 用户在浏览列表设了低价优先、10 公里内、电梯服务、特价快捷标签，加载到 16 家并滚到 scrollTop 428 后点开门店；返回 S01 时排序回到推荐、距离回到不限、服务筛选清空、加载数回到 8、scrollTop 为 0（点开的那张卡从 256px 跑到 1956px）。S01 发给 S02 的 URL 已带 sort / distance / services，但 S02 返回时没有带回；`loaded` 与 `scroll` 根本没发。
- 快捷标签（special）在修复前就能保留：它走 sessionStorage，母版既有。

## 2. 改动内容（3 个受管理文件，共 77 行 diff，全部带 `H01-007-S4` 注释）

### 2.1 D-01（H01，2 处）
1. `goStores(opts)`：把 `nearbyShortcut` 分支提到「携带已保存需求」分支之前。「查看附近门店」「底部门店页签」「企业入口的门店链接」「全部附近门店」四个入口都走 `nearbyShortcut:true`，因此永远得到 `state=browse&entry=browse_nearby`（未定位时 `state=unlocated`）。已保存需求分支原样保留，只是顺序后移，供其他调用方（无快捷标记、当前任务是 estimated）继续使用。不删除、不改写 `REQUIREMENT_KEY`。
2. `goStoreDetail(storeId, mode)`：`matched` 只在调用方显式传 `mode==='matched'` 时成立，删去 `||Number(r.target_volume)>0`。首页门店卡的 `data-mode` 默认是 browse，markup 中没有任何一张卡声明 matched。
- 明确恢复需求的两条路径都没有动：首页「继续找仓」卡（`goFind`，保留 S1 的 `hsiValidTerm` / `validTerm` 守卫，无租期进 S5 选租期）；S01 浏览列表上方「您已有找仓需求：约 5.0m³ · 6 个月 / 按我的需求匹配 ›」切换条（H01-004B 母版既有，S4 未新增、未改）。
- 首页布局、双任务卡、Banner、推荐门店卡片、视觉规范未动；S3 的 `hsiValidPending`（含 PAYMENT_FAILED）与待支付文案未动。

### 2.2 D-02（S01 3 处 + S02 1 处，按局部 URL 参数实现，未重构列表状态）
- S01 `openStoreDetail`：在既有 sort / distance / services 之外，追加 `loaded=<当前已加载门店数>` 与 `scroll=<#page.scrollTop>`。
- S01 入口解析：`loaded` 的恢复从「仅 browse_nearby」改为所有列表状态；`sort / distance / services` 的恢复逻辑本来就有，未改。
- S01 滚动恢复：原来只在 `setTimeout(…,0)` 恢复一次，`mk-v3-s01-tags.js` 等延后布局脚本会把偏移顶走；现在在 `load` 事件后再用 `requestAnimationFrame` 重设一次（`{once:true}`）。
- S02 返回按钮：把来时 URL 里的 `sort / distance / services / loaded / scroll` 原样写回 S01 地址；`returnState==='browse'` 时附 `entry=browse_nearby`，让 S01 按浏览列表恢复而不是重新推导。estimated / extended / far 的返回仍按既有 `fromS01State` 处理。
- 任务书 §3 的条件判断：五项（排序、距离、服务标签、加载数量、滚动位置）都能用 URL 参数完成，**条件满足，已执行**，没有触及列表状态系统。

### 2.3 没有做的事
不改 SSOT、价格门禁、优惠券模块、C02、O01、O02、U01、Q01、M01、估算器；不改 RELEASE_MANIFEST；不改首页视觉；不动优惠券遗留锁（P1 待决策项）；不处理 Q01 可读性、异常提示长度、U01 浮窗遮挡（留 S5 视觉验收）。

## 3. 改动文件（相对 S3 工作区）

| 文件 | 类型 | 问题编号 | 受管理 | 上次改动阶段 |
|---|---|---|---|---|
| prototype/mini_storage_home_H01_Visual_V2_7_4_SSOT.html | 修改（2 处） | D-01 | 是 | S3 |
| prototype/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html | 修改（3 处） | D-02 | 是 | S1 |
| prototype/mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html | 修改（1 处） | D-02 | 是 | S1 |
| qa/test_h01_007_s4_entry_contracts.cjs | 新增（源码契约测试，30 条） | — | 否 | — |
| qa/test_h01_007_s4_http_flows.py | 新增（HTTP 双视口流程，8 个用例 28 项检查） | — | 否 | — |

删除 0。哈希见 `H01_007_S4_Changed_Files.txt`；逐行 diff 见 `evidence/diff/H01_007_S4_unified.diff`；修改前副本在 `evidence/files_before_s4/`。RELEASE_MANIFEST 未改（sha256 `b1d93457…`），S4 没有把新文件加进「自 H01-004B 起已变」的受管理文件集合（H01 自 S3、S01/S02 自 S1 已在集合内），累计集合留 S5 重算。

## 4. 验收层级（分别记录，不互相替代）

| 层级 | 结果 | 分级 |
|---|---|---|
| 源码修复 | 3 个受管理文件修改、2 个测试新增、0 删除；S1 / S2 / S3 全部文件哈希不变（§0） | PASS |
| 逻辑测试 `qa/test_h01_007_s4_entry_contracts.cjs` | S4 树 **30/30**；同一测试指向 S3 树 22/30（8 项复现缺陷，`evidence/logic_before_fix.log`） | PASS |
| HTTP 真实浏览 `qa/test_h01_007_s4_http_flows.py`（375×812、390×844，DPR 2） | S4 树 **28/28 × 2 视口 = 56/56**；S3 树 14/28 × 2（14 项 invariant 全部通过、14 项 defect 全部失败）；浏览器控制台与 pageerror **0**（两次运行 `console.log` 均为空） | PASS |
| 覆盖用例 | FRESH_BROWSE、HISTORY_BROWSE、CONTINUE_REQUIREMENT、NO_TERM、STORE_CARD、FILTER_RETURN、PAYMENT_FAILED_HOME、QUOTE_EXPIRED_HOME，8/8 | PASS |
| S1 关键回归 | 逻辑 13/13；HTTP 42/42（`evidence/smoke_after_s4/s1_*`） | PASS |
| S2 关键回归 | 逻辑 14/14；HTTP 40/40；既有 `test_coupon_benefit_system_v1.js` PASS | PASS |
| S3 关键回归 | 逻辑 18/18；HTTP 27/27 × 2 = 54/54（含 PAY_FAIL、QUOTE_49H、CROSS_S2） | PASS |
| U01 / Q01 / O01 交易逻辑 | 三个文件哈希与 S3 相同；S1/S2/S3 的 HTTP 流程全部通过 | PASS |
| 既有回归 `tools/run_regression.py`（34 项） | **21/34**；与 S3 的 22/34 相比，12 项既有失败集合完全相同，**新增 1 项 `test_home_state_integration_patch_v1.cjs`（15/16）**，失败断言是字符串匹配 `const matched=mode==='matched'||Number(r.target_volume)>0;`，即 D-01 任务书要求去掉的那一行。属**历史断言与新规格冲突**，不是功能回归；分类见 `H01_007_S4_Regression_Classification.md` | FAIL（历史断言） |
| 微信真机 | 未测 | NOT TESTED |
| 阻塞项 | 无 | — |

既有回归在 10:14 与 10:24 各跑了一次（补丁完成后），两次结果一致；实施者日志把 10:24 与 10:14 比较得出「集合一致」，这个参照不对，正确参照是 S3 交付的 `regression_after_s3.log`，本报告已按后者重新比对。

## 5. 与 S1–S3 的交叉核验

- S3 的支付失败任务卡：PAYMENT_FAILED_HOME 用例里，失败订单仍以「有一笔订单支付未完成」卡片成为首页聚焦任务，「继续支付」回到 O01 同一订单号，S3 恢复核对给出 ok、支付按钮可用；同页「查看附近门店」现在是普通浏览。
- S3 的过期方案：QUOTE_EXPIRED_HOME 用例里首页任务卡「原方案已过参考期」→ Q01 显示 48 小时提示、保存禁用、「重新获取报价」→ U01 `requote=1` 核对一致 ¥4,307，全部与 S3 交付相同。
- S1 的 validTerm：NO_TERM 用例里「继续找仓」去 S5 `requireTerm=1`，term_months 保持 0；S01 切换条同样走 `s01ValidTerm`。
- S2 的优惠券：未触碰；S2 的 OWN_LOCK / OTHER_LOCK / REPEAT 流程 40/40。
- 优惠券遗留锁（同订单换券旧券仍 LOCKED，P1）：未修改，未扩大。

## 6. 任务书 §5 的其他问题
Q01 过期报价可读性、异常提示较长、U01 帮助浮窗可能遮挡费用：本轮未处理，列入 S5 视觉验收。

## 7. 遗留问题与 S5 接续说明

1. RELEASE_MANIFEST 累计已变的受管理文件集合与 S3 相同（S4 未新增成员，只是 H01 / S01 / S02 的哈希再次变化），留 S5 统一重算；S1–S4 共 8 个新测试未登记进 `tools/run_regression.py` 与 `check_package.py`。
2. `qa/test_home_state_integration_patch_v1.cjs` 第 15 条断言锁定的是 D-01 之前的行为，S5 需要决定：把断言改成新行（`const matched=mode==='matched';`）或退役该条。本轮按「不改既有测试」处理。
3. 滚动恢复依赖 `load` + rAF 二次设置；若 S5 的视觉改动再引入延后布局脚本，需复跑 FILTER_RETURN 的 scroll 检查。
4. 快捷标签走 sessionStorage、其余五项走 URL，两套机制并存是母版既有设计，S4 未统一。
5. 首页「企业需求」入口与「全部附近门店」链接同样走 `goStores({nearbyShortcut:true})`，行为随 D-01 一起变为普通浏览，已在逻辑测试里锁定；如业务希望企业入口带需求，需另行提出。
6. 微信真机未测。

## 8. 回滚

- 方式一：用 S3 检查点 ZIP（sha256 `b124973a…`）内的 `Mini_Koala_H01_Lifestyle_Step03/` 整目录替换本检查点的同名目录。
- 方式二：把 `evidence/files_before_s4/prototype/` 下 3 个文件覆盖回 `prototype/`，删除 `qa/test_h01_007_s4_entry_contracts.cjs`、`qa/test_h01_007_s4_http_flows.py`，即回到 S3 树（哈希见 Changed_Files 的 before 列与 `files_before_s4/sha256.txt`）。
- 回到 H01-004B：检查点内 `source_zip/` 的只读原始 ZIP（sha256 `ed870331…c29ca`）。

**Release Gate 保持 HOLD。S4 到此停止，不进入 S5。**
