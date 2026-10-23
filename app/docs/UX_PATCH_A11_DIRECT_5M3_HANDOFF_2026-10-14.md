# UX-PATCH A1.1｜容量档位即点即跳、5m³ 路由修订

日期：2026-10-14。状态：源码与专项测试候选；Release Gate HOLD。

## 用户新增裁定（覆盖 A1）
- S3「大概有多少」不显示底部「下一步」，点击容量档位后**立即进入**下一页。
- 以当前预设真实计算结果的显示区间**上限**判断，`Number(fmt(max)) < 5` → S5 租期与推荐；`>= 5` → S4 确认物品。恰好 5m³ 归 S4。
- 对无效/空体积作安全阻断，允许选择其他档位或主动按物品估算。
- 跳过确认时继续保持 `itemsConfirmed=false`；返回 S3 后保留已选档位，可重新点选。
- 保留 A1 的用途卡和三个快捷入口，未来 A2/A3 页面修改不在本轮范围。

## 受控文件范围
运行时 HTML：删除 S3 `amountActionBar` 和 CTA，把有效性与 `go(5/4)` 移到档位 `onclick`。
运行时 CSS：删除已废弃的 CTA 样式；S2 场景和入口样式原封不动。
QA：保留旧 A1 测试原文用于历史契约对照；新增 `qa/test_ux_patch_a1b_direct_5m3.cjs` 测试新规则。

## 测试门槛
执行新增专项、EST45 映射、Phase3A 后继、S1/S2/S4/P1 与封包检查。旧 A1 和 Phase3A 原契约失败时明确标为 superseded，不删除或放宽。375/390 HTTP 浏览如环境受限标 BLOCKED。微信真机 NOT TESTED。Release Gate HOLD，母版不覆盖。
