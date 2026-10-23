# DEMO-VIS-01｜候选专项验收记录与限制

2026-10-14｜相对于 D4-A 源码候选的独立视觉试装；Release Gate HOLD。

| 检查 | D4-A输入 | DEMO-VIS-01候选 | 解释 |
|---|---|---|---|
| 输入ZIP SHA256 | 347c71e99fa3af2368481afbc88070dccdbc6f25e623942703e4cec714c19e5d | 原输入相同 | 已核对来源 |
| Manifest完整性 | D4报告755受管文件 | 761受管文件 | 源码新增与文档追加 |
| 包内字面资源链接 | — | 740引用/0断链 | 只证实静态链接，不证实运行时 |
| DEMO_VIS01源码专项 | 不适用 | 8/8 PASS | 不代表页面视觉 PASS |
| UX-PATCH A3原专项 | PASS | PASS | 前后同为PASS |
| D4-A原专项 | FAIL | FAIL | 基线同样失败，未将其登记成新回归 |
| 历史价格语义检查 | FAIL | FAIL | 旧源码断言不适配现有A3模板；未证明任何计价错误 |
| 历史价格租期布局检查 | FAIL | FAIL | 旧标签字符串断言失败，基线同样存在 |
| 当前环境Chromium本地HTTP导航 | BLOCKED | BLOCKED | `ERR_BLOCKED_BY_ADMINISTRATOR`，非DOM/截图证据 |
| S5 375×812、390×844真实截图 | 未在本轮复验 | BLOCKED | 不把旧图当新图 |
| 优惠券A原图定向移植 | D4-A无批准原图 | BLOCKED_INPUT | 保留当前收起态，不制作仿制券图 |
| 真实U01→Q01/O01支付回归 | D4 gate HOLD | NOT TESTED | D4 原有5 P1保留OPEN |

**实际源码更改只有估算器HTML插入一个CSS引用；新增CSS仅作用于S5金额/辅助展示。** 原版其他运行时文件均逐字节不变；Manifest与文档/QA新文件单独登记。浏览器Blocked不能被写成PASS。
