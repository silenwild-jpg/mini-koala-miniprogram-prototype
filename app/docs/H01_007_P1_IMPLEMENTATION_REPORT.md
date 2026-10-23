# H01-007-P1 最小修复实施报告

日期：2026-10-13（北京时间）。输入：S5 最终候选 `34cca316bbd353b8e573f058f3b127e82915569bcc1635a8fb8f47bee17bf5a1`。Release Gate：HOLD。

## 结果与边界

P1-1 与 P1-2 已完成代码修复及逻辑验证，交付为待真实浏览验收候选。原始 S5 ZIP 和统一母版未覆盖。未启动 VIS-04B、P2 视觉优化、生命周期重构。

- C02：内联 `.coupon-bottom` 仅增加 `transform:none!important`，修正 left:0 与 translateX(-50%) 的冲突。
- 优惠券：仅调整 `syncPaymentResult`。有效已支付订单无券也执行未使用新客券失效与本单锁清理；换券支付后实际使用券核销，旧新客券失效。本单未使用非新客券恢复 CLAIMED，原有效期不变。其他订单 LOCKED、已核销/失效/过期券保持。实际使用券清空本单锁，重复打开保持核销时间。缺失订单号或支付状态冲突不核销。
- 不修改租金、押金、管理费、折扣、券门槛、订单号与价格门禁；不新增锁券超时、退款、跨账号或跨订单释放规则。已有成功支付明细金额逻辑保留。

## 验证

| 检查 | 结果 | 状态 |
|---|---|---|
| 新券状态测试（12 项） | 冻结版 S5 4/12 → 修复版 12/12（最终测试强制时间变化核对重复核销） | PASS |
| 首页契约 | 17/17 | PASS |
| S1 / S2 / S3 / S4 逻辑 | 13/13、14/14、18/18、30/30 | PASS |
| 既有优惠券测试 | PASS | PASS |
| 双尺寸 C02 与支付浏览 | 无 Chromium，Playwright 下载返回无效压缩数据，无法启动 | BLOCKED |
| 新 HTTP 测试脚本 | Python 语法通过，尚未运行 | NOT TESTED |
| S1–S4 HTTP 重跑 | 本环境无 Python Playwright / Chromium | BLOCKED |
| 微信真机与原生组件 | 未测 | NOT TESTED |

S3 的历史整文件哈希保护与本次授权修改冲突：不回滚修复，不移除测试。改为对 `syncPaymentResult` 之外的整个券模块执行冻结哈希校验，C02 则去掉唯一授权 transform 属性后比对原 S2 完整哈希。原首购资格、本单恢复、价格校验等代码继续受到严格保护。新增 P1 逻辑测试已登记总回归；HTTP 套件单独运行。

本次没有生成真实浏览截图，不以逻辑通过代替视觉或支付浏览验收。包内 S5 历史 HTTP 成绩只证明补丁前输入状态。

## 跨会话复验

使用本候选包，先运行 `node qa/test_h01_007_p1_coupon_settlement.cjs` 与 `python3 tools/run_regression.py`。
在安装 Python Playwright / Chromium 的环境运行：

```
python3 qa/test_h01_007_p1_http_flows.py --out outputs/p1_http
python3 qa/test_h01_007_s1_http_flows.py --out outputs/p1_s1_http
python3 qa/test_h01_007_s2_http_flows.py --out outputs/p1_s2_http
python3 qa/test_h01_007_s3_http_flows.py --out outputs/p1_s3_http
python3 qa/test_h01_007_s4_http_flows.py --out outputs/p1_s4_http
```

新 HTTP 脚本通过真实点击覆盖：375×812 与 390×844 的 C02 底栏/按钮完整边界；已有待支付订单从 CPN-001 改无券或 CPN-002 后成功支付；同订单号、旧券清理、新客券状态及 O02 重入。该新脚本尚未运行，任何失败应提供实际日志后定向修正，不得提前标为 PASS。

需确认 C02 实际点击、金额与订单号一致、无新增 console/pageerror，再更新 P1 关闭状态。之后才接续 VIS-04B。其他订单锁券与退款问题仍按既有待确认事项保留。

## 总回归与封包说明

本次全套回归：28/39。11 项失败与 S5 的历史失败集合相同（旧文案 2、vm 抽取缺函数 3、浏览环境相关 6）；没有新增失败。原 S5 树在本环境首次 26/38，其中路径测试因干净目录无 outputs 额外失败；单独复跑确认 13 页 / 88 路径无错误，等价 27/38。P1 总回归入口已在运行前创建 outputs，避免该环境依赖。详细逐项输出见 H01_007_P1_VALIDATION.json。

S5 报告的 26/38 是 Manifest 重算前，封版日志 27/38；本次首次基线的 26/38 则是缺 outputs，来源不同，均已明确区分。旧测试失败不代表通过，真实浏览 BLOCKED 不伪装成环境通过。

Manifest 写入器保留版本与接续元数据，路径使用 POSIX 分隔符；当前版本和 P1 输入哈希完整保留。S5 Change Manifest 标为历史快照，本次新清单按 S5 → P1 逐字节比较；P1 不声称独立重新核对未提供的 004B 原始树。

修复证据为冻结 S5 的失败逻辑日志、修复后逻辑输出、两个独立源码 diff、完整文件哈希及总回归日志。运行源码仅 C02 / 优惠券模块两个文件改变，其余 prototype 字节相同。原始 S5 ZIP 本身不包含在候选中；其标识和哈希作为回滚指针保留，用户已有原包未覆盖。

## 后续双尺寸浏览验收（已完成）

375×812、390×844 的 C02 位置与真实点击、无券/换券支付、订单号、金额、其他订单锁保护、O02 幂等均经第三方实际 Chromium HTTP 验证。独立核验 33/33、控制台错误 0；S1–S4 HTTP 分别 42/42、40/40、54/54、56/56；历史总回归 28/39，11 项失败与 S5 一致。具体证据和截图见 `docs/P1_BROWSER_ACCEPTANCE_EVIDENCE/`。

验收发现包内 P1 HTTP 脚本缺少模拟待支付所需的 `review=1`。本接续包只补该参数，断言不变；原型运行文件均沿用 P1 候选。C02 帮助入口在底栏归位后因既有碰撞规则被隐藏，列为 P2，视觉合并时复核。微信真机和原生组件仍未测试。Release Gate HOLD。
