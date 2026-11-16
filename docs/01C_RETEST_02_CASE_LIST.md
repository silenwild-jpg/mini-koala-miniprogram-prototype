# 01C-RETEST-02｜正式回归用例集与执行说明

- 状态：已完成真实 Chromium 浏览器执行；本轮门禁 FAIL，结果见 [01C_RETEST_02_RESULTS.md](./01C_RETEST_02_RESULTS.md)
- 基线：`f2fccf9301a54f00be9ab089a6426fae8f848242`
- 分支：`qa/01c-retest-02-runner-20261116`
- 产品代码：不修改
- 目标：H-T26–T30 两种赠期来源 × 两个视口（20次）；G1-01–G1-07 × 两个视口（14次）；合计34次独立运行。

## 1. 用例矩阵

| ID | CAM | SALES | 375 | 390 | 本轮断言 |
|---|---:|---:|---:|---:|---|
| H-T26 | ✓ | ✓ | ✓ | ✓ | 3个月门槛以下隐藏赠期；恢复6个月后重现；押金行不串位 |
| H-T27 | ✓ | ✓ | ✓ | ✓ | 失败/终止后报价失效、赠期释放；新报价重新关联 |
| H-T28 | ✓ | ✓ | ✓ | ✓ | O03 待支付状态与倒计时；仅记录普通用户界面是否出现取消入口 |
| H-T29 | ✓ | ✓ | ✓ | ✓ | 通过浏览器可控时钟触发自然巡检；订单过期、仓位释放、报价失效、赠期释放 |
| H-T30 | ✓ | ✓ | ✓ | ✓ | 支付失败后释放；新订单成功支付后只发放一次 |
| G1-01 | — | — | ✓ | ✓ | 收藏遗留视图与正式路由边界 |
| G1-02 | — | — | ✓ | ✓ | 优惠券旧视图与优惠权益统一视图差异 |
| G1-03A | — | — | ✓ | ✓ | 已付款订单关联运输需求、保存及 awaiting_advisor |
| G1-03B | — | — | ✓ | ✓ | TRANSPORT 不属于16项正式路由，标记 NOT IN SCOPE |
| G1-04 | — | — | ✓ | ✓ | 中央壳无旧手机号层；统一授权组件无重复实例 |
| G1-05 | — | — | ✓ | ✓ | r2-region 无触发点，历史状态复位 all |
| G1-06 | — | — | ✓ | ✓ | r2-capacity 无触发点，历史状态复位 all |
| G1-07 | — | — | ✓ | ✓ | 正式路由16项；中央 RESULT 不允许作为正式路由；直接结果页为空状态且无支付操作 |

说明：G1-03A 与 G1-03B 是同一次视口运行中的两个独立断言，不增加运行次数。G1-07 分别验证中央路由契约拒绝 RESULT，以及应用直接访问 RESULT 时返回空状态且无支付操作；不将内部临时结果页当作正式路由。

## 2. 测试数据

- 活动赠期：`promoCampaignGift`
- 销售赠期：`promoSalesGiftApproved`
- 固定测试仓位：`SIM_BJ01_U04`
- 模拟手机号：`13800000000`
- 所有数据均来自该 SHA 的演示 fixtures。
- 不连接真实支付、客户、库存、CRM 或仓储服务。

## 3. 执行命令

在仓库根目录：

```bash
npm install --no-save --no-package-lock playwright@1.56.1
npx playwright install chromium
node scripts/01c_retest_02_runner.cjs
```

运行器使用本机静态 HTTP 服务端口 4726；输出至：

`release-evidence/01c-retest-02/`

- `RETEST02_SUMMARY.json`：34次运行汇总及逐项断言
- `RETEST02_RUNS.csv`：逐次运行索引
- `shots/`：页面截图
- `traces/`：每次运行独立 Playwright Trace ZIP

## 4. 运行隔离与证据

每次运行独立 BrowserContext，使用独立 viewport、Asia/Shanghai 时区和本地可控时钟。赠期来源及视口不合并。H 组通过真实页面按钮完成租期修改、建单、支付模拟；测试场景通过应用公开演示 fixture 初始化，不直接改写订单状态或赠期状态。

T29 仅推进浏览器时钟，并触发页面自身巡检；不直接把订单 status 改成 expired。

T28 只以 O03 普通用户界面是否存在取消入口判定；不得使用 debug 深链、内部审核按钮或 `core.cancelOrder()` 作为用户路径通过证据。

## 5. 缺陷预期与判定

| 编号 | 级别 | 关联用例 | 预期关注点 |
|---|---|---|---|
| X-01 | P1 | T27–T30 | `APPROVAL_METADATA_REQUIRED` 导致订单终止部分提交 |
| X-02 | P1 | T26 | `hidden` 被 `.fee-row{display:flex}` 覆盖；固定索引导致押金标签错位 |
| X-03 | 待裁定 | T28 | 当前 O03 未显示普通用户取消入口；是否需要此操作缺少已批准业务规则，本轮只记录、不判缺陷 |
| X-04 | P3 | 范围外 | 15分钟文案与180分钟实际值不一致 |
| X-05 | P3 | G1-02 | 旧券视图不展示赠期，与新版优惠权益视图口径不同 |

原 D-01、D-02、O-01、T-01 本轮不复测，维持原状态。

## 6. 首次真实执行结果

- Actions 运行：[43829076579](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43829076579)
- 测试基线：`f2fccf9301a54f00be9ab089a6426fae8f848242`
- 测试脚本 HEAD：`868647d54270bcfcbdb955a272e76be9268f14d3`
- 结果：34次运行，18 PASS、16 FAIL、0 BLOCKED。
- 证据：34张截图、34份 Trace、JSON 汇总和 CSV 索引，均归档在该 Actions artifact。
- X-01、X-02 的复现细节与源代码定位见 [01C_RETEST_02_RESULTS.md](./01C_RETEST_02_RESULTS.md)。

本分支只增加测试运行器、用例文档、测试工作流和结果报告；不修复产品代码、不改变演示规则、不合并 PR #210、不更新 main、不部署。首次运行的 Ubuntu 26.04 / Playwright 1.56.1 兼容问题已通过固定 Ubuntu 24.04 解决；后续真实浏览器测试正常执行。

## 7. 通过门槛

- 34次运行全部有明确结果：PASS / FAIL / BLOCKED。
- 每次运行必须有对应截图和独立 Playwright Trace ZIP；Trace 使用 `context.tracing.start/stop` 记录 DOM snapshot、截图和源码。
- 任何异常均保留完整错误信息，不得将 toast 当作业务成功。
- 375与390业务状态一致。
- G1-03 的遗留能力与正式路由边界分别报告。
- 产品修复后，X-01、X-02 关联用例全部通过，并复跑全量34项；修复前证据不得覆盖。
