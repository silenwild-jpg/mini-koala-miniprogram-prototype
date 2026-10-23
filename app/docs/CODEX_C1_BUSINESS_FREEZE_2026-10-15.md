# C1 业务冻结检查点

日期：2026-10-15，Asia/Shanghai。输入 PREPAY-02 ZIP SHA-256：cb0be0ebde787f5c4c8ac39f7e51ecfe6f9c7d2f96824116dccf6da2c346fc4c。Release Gate HOLD。

真实 HTTP / Chrome 152.0.7977.64，375×812、390×844、DPR2、mobile/touch、zh-CN、Asia/Shanghai。
P05 的 S3/S4/U01/S02 四路 S5 首卡、P10 距离与其他店排除及返回、P16 两主路径均通过两尺寸；P12 快速报价/订单、Story04、index 报价与真实 U01 保存报价/订单亦通过两尺寸。
证据在交付证据树 c1_frozen、c1_final；测试器最初的导航竞态与页面切换取消请求保留在早期日志中，不能当作产品缺陷。ERR_ABORTED 导航取消单列保存，实际缺资源/pageerror 仍使结果失败。

可复现修复：
1. 快速有券种子明确 canonical 新客首购上下文，使现有优惠资格验证通过；无放宽门禁。
2. Story04 从 C02 继续时先加载当前 SSOT 模型，避免 price_semantics_v1_1 与 unit_master_v221 不一致。
3. U01 保存报价补传仓位实际体积；U01/Q01 订单路由保留精确体积，不用需求体积覆盖仓位体积。
4. 工具兼容：回归器可使用 NODE_EXECUTABLE/固定随附 Node；Manifest 比较路径统一使用 POSIX 分隔符。测试断言未改。

当前演示整体待 C2–C4；支付恢复 P1-03、退租 P1-05 继续 OPEN/DEFERRED。微信真机 NOT TESTED。
