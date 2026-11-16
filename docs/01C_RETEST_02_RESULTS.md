# 01C-RETEST-02｜浏览器实测结果与缺陷报告

## 1. 执行结论

- 执行状态：真实 Chromium 浏览器运行完成；回归门禁 FAIL（由产品断言失败导致，不是环境安装失败）。
- 基线版本：`f2fccf9301a54f00be9ab089a6426fae8f848242`
- 测试分支：`qa/01c-retest-02-runner-20261116`
- 本轮测试脚本 HEAD：`868647d54270bcfcbdb955a272e76be9268f14d3`
- 视口：375×812、390×844
- 运行环境：GitHub Actions / Ubuntu 24.04 / Node.js 22 / Chromium（Playwright 1.56.1）
- 运行记录：[GitHub Actions #9](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43829076579)
- 证据包：[34次运行截图、Trace、JSON、CSV](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43829076579/artifacts/14207712017)

| 结果 | 数量 |
|---|---:|
| PASS | 18 |
| FAIL | 16 |
| BLOCKED | 0 |
| 合计 | 34 |

证据完整性：34张截图、34份独立 Playwright Trace ZIP、1份 JSON 汇总、1份 CSV 索引。所有用例均有明确结果。

## 2. 缺陷裁定

### X-01｜赠期权益释放状态转换失败（P1）

**复现：H-T27、H-T29、H-T30；CAM / SALES 两种赠期来源；375 / 390 两个视口，合计12次失败断言。**

基线代码证据：
- [demo-core.js L260–L265](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/blob/f2fccf9301a54f00be9ab089a6426fae8f848242/app/prototype/parallel/core-journey-fix-01/demo/demo-core.js#L260-L265)
- [gift-term-policy.js L25–L29](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/blob/f2fccf9301a54f00be9ab089a6426fae8f848242/app/prototype/parallel/core-journey-fix-01/demo/gift-term-policy.js#L25-L29)

**已确认事实**
1. `releaseOrder()` 先改变订单状态、释放仓位，再执行 `giftPolicy.transition(g,'APPROVED')`。
2. `transition()` 对所有转入 `APPROVED` 的动作要求调用参数 `meta.approval_id` 与 `meta.approved_by`。
3. `releaseOrder()` 调用没有传入这两个字段，因此抛出 `APPROVAL_METADATA_REQUIRED`。
4. SALES_CASE 测试数据本身已有审批字段，但转换函数检查的是本次调用的 `meta`，而调用方没有传入；CAMPAIGN 场景也没有销售审批字段。
5. 错误发生在库存与订单部分状态已改变之后，导致后续赠期释放、报价失效和快照更新未完成。

**实测结果**
- T27 支付失败：订单已成为 `payment_failed`，赠期仍为 `LOCKED_TO_ORDER`；重新报价后赠期仍未重新关联。
- T29 订单过期：订单已成为 `expired`，仓位已释放，但赠期仍锁定，旧报价仍存在；浏览器页面刷新过程中抛出上述错误。
- T30 失败后重试：新订单可完成模拟支付，但赠期没有进入 `GRANTED`。

**影响**
订单、库存、报价和赠期权益状态不一致。用户可能看到失败提示，但后台演示状态已部分变化；再次操作可能丢失赠期或保留旧报价。

**建议修复方向**
- 明确 CAMPAIGN 与 SALES_CASE 的审批元数据要求，不能把销售审批字段无条件套用于活动赠期。
- 释放流程应先验证所有状态转换条件，再原子性更新订单、库存、优惠与赠期；转换失败时不得留下部分提交。
- 失败支付、过期、取消和重新支付均需覆盖回归。

### X-02｜不符合租期门槛的赠期仍然显示（P1）

**复现：H-T26；CAM / SALES 两种赠期来源；375 / 390 两个视口，合计4次失败运行。**

基线代码证据：
- [o01/styles.css L5–L6](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/blob/f2fccf9301a54f00be9ab089a6426fae8f848242/app/prototype/parallel/core-journey-fix-01/demo/br04/o01/styles.css#L5-L6)
- [bridge.js L258、L273–L280](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/blob/f2fccf9301a54f00be9ab089a6426fae8f848242/app/prototype/parallel/core-journey-fix-01/demo/br04/bridge.js#L258-L280)

**已确认事实**
1. 从6个月切换到3个月后，赠期行的 DOM `hidden` 属性为 `true`，但计算后的 `display` 仍为 `flex`。
2. 费用区仍可见“赠送1个月 · 期限规则待确认”，不满足租期门槛时未能从视觉上隐藏。
3. 恢复6个月后，赠期行可重新显示；押金金额本身在两个视口中保持一致。
4. 当前样式仅对 `.scrim[hidden]` 和 `.toast[hidden]` 设置隐藏规则，普通 `.fee-row` 仍声明 `display:flex`，没有覆盖该费用行的隐藏状态。

**影响**
用户在不满足赠期门槛的租期下仍能看到赠期文案，容易误判活动资格及订单权益。

**建议修复方向**
- 为所有需要隐藏的费用行提供可靠的通用隐藏样式，避免 `display:flex` 覆盖 `hidden`。
- 赠期行仅在资格成立时参与费用区展示；不满足门槛时不应留有可见文案。
- 保留独立语义标识，不通过费用行数组下标定位或改写押金标签。

## 3. 其他用例结果

| 用例 | 结果 | 证据结论 |
|---|---|---|
| H-T28 | 4 PASS | O03 展示待支付状态及倒计时；当前界面未显示普通用户取消入口。该行为是否符合业务规则尚无已批准依据，本轮仅记录事实，不判为缺陷。 |
| G1-01 | 2 PASS | 收藏旧视图可打开；不属于16项中央正式路由。 |
| G1-02 | 2 PASS | 优惠券旧视图可打开；不属于16项中央正式路由。 |
| G1-03 | 2 PASS | 已付款订单可进入运输需求页，提交后保存 `awaiting_advisor` 状态；TRANSPORT 不属于16项中央正式路由。 |
| G1-04 | 2 PASS | 未发现中央壳重复手机号验证层；统一授权组件存在。 |
| G1-05 | 2 PASS | r2-region 无旧筛选触发点，历史筛选状态进入页面后复位。 |
| G1-06 | 2 PASS | r2-capacity 无旧筛选触发点，历史筛选状态进入页面后复位。 |
| G1-07 | 2 PASS | 中央正式路由共16项；RESULT 不属于正式路由；直接访问结果页显示空状态且无支付操作。 |

## 4. 范围与隔离

- 本轮仅执行演示 fixtures 和本地模拟状态，不接入真实支付、库存、客户、CRM 或仓储服务。
- 未修改产品 HTML、CSS、JS 或业务规则。
- 本分支只包含测试运行器、用例文档、测试工作流及结果记录。
- 未合并 PR #210；未更新 main；未部署。
- H-T28 的取消入口是否需要增加，需业务规则确认，不从当前缺少入口推导出必须新增。
- 原 D-01、D-02、O-01、T-01 不在本轮复测范围内。

## 5. 下一步建议

建立独立产品修复任务 `01C-DEFECT-FIX-01`，只处理 X-01、X-02；修复后在新的隔离分支复跑本报告的34项用例。当前测试分支与本轮证据保留为修复前基线，不覆盖、不合并。
