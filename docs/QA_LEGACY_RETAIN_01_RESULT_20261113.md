# QA-LEGACY-RETAIN-01｜已签收RC2历史高风险断言补证

**结果：PASS（19项独立可执行检查）**  
日期：2026-11-13。该结论仅适用于下面明确的QA SHA和冻结运行时，不代表生产后端、真实支付或正式上线通过。

| 对象 | 精确证据 |
|---|---|
| 签收的演示原型 | [PR #176](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/176)，SHA `41a8a079eb48049e1060512bddf71c226bfd3738` |
| 独立QA工作分支 | `qa/legacy-retain-01-20261113` |
| QA分支HEAD | `55154bd0d59333fd2664e49c218d74d2f324464c` |
| QA代码 | [PR #182](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/182)（Draft / HOLD，不合并进签收的业务原型） |
| 实际执行 | [Actions Run #43426100394](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43426100394)：Success |
| 产物 | [QA-LEGACY-RETAIN-01-BOUNDARY-EVIDENCE](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43426100394/artifacts/14037605987) |

## 验证内容

| 边界 | 本次补证 |
|---|---|
| 原订单恢复 | 返回待支付订单继续使用原ID、原报价；不会因多次恢复额外新建订单 |
| 支付幂等 | 待支付订单支付成功后，重复成功回调不会新增订单 |
| 续租流程 | 取消付款及重新确认保持原续租请求ID；付款成功前不会新增已付款记录、不会提前延长租期 |
| 续租成功 | 成功后只增加一笔续租付款；相同请求不能二次确认付款成功 |
| 发票 | 同一已成功付款只能申请一次；重复申请明确拒绝 `INVOICE_EXISTS` |
| 租期边界 | 当前9月时申请52月拒绝，申请51月允许达到60月，达到60月后再申请1月拒绝 |
| 获批母版 | VIS-11J原始文件 SHA256、Git Blob及 `RC2_MERGE_PREP_02_SOURCE_GATE.json` 的批准来源完全一致 |

CI的源代码保护步骤还逐个确认：QA分支从冻结SHA派生，`demo-core.js`、`fixtures.js`、`lifecycle-contract.js`、VIS-11J原件及签收来源门禁的Git Blob全部与签收SHA一致。该QA分支只有测试和工作流文件增量，没有运行时或页面变更。

## 约束与后续

1. **不更改正式演示版。** PR #176继续保持Draft、MAIN MERGE HOLD；没有本轮新视觉签收、未部署。
2. **不把新QA提交并进签收SHA。** PR #182保留为专项QA证据入口，后续正式开发可由WorkBuddy按需要提取测试方法。
3. **不以历史QA PASS证明生产行为。** 本测试使用可复现演示数据，真实支付的幂等事务、发票服务、长期租期规则仍由后端/业务另行确认。
4. **继续归档门禁。** PR #50/#30/#28的历史规则/部署知识以及旧上海门店素材已在P1-A3/P1-B3保全；下一步只整理逐条可关闭/可保留/待后端交接的证据清单。不经用户针对具体清单授权不关闭PR或删除分支。

关联：[PROJECT-OPS-RESET-01 #177](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/issues/177)、[P1-A3 QA覆盖差异](PROJECT_OPS_P1A3_LEGACY_RULE_DEPLOY_QA_HANDOFF_20261113.md)。
