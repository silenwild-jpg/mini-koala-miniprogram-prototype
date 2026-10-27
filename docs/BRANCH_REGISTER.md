# 四分支迁移登记（准备态，不代表代码已迁入）

2026-10-27补充：本轮MAIN-CHAIN-02已在feature/visual-consistency-01完成本地主链核验，见MAIN_CHAIN_02_HANDOFF_20261027.md。最新顾问去向为留资回执；本表是初始迁移台账，不据此推定全分支已归并或已冻结。

| Git 分支 | 页面归属 | 已知主要交付 | 当前归并结论 |
|---|---|---|---|
| `feature/br01-home` | H01首页、推荐、入口状态 | `BRANCH-01-HANDOFF-01B_定位确认语义修复与共享契约同步.zip` | VIS-11J为最高视觉依据；底栏P0-A双选入口接线待完整验收；HOLD |
| `feature/br02-capacity` | CAP/物品估算/AI/顾问 | `BRANCH_02_FREEZE_01_容量页视觉母版签收包.zip` + `BRANCH_02_FLOW_FREEZE_01_按物品估算工作台视觉母版签收包.zip`；另有FLOW-08A过程包 | CAP、物品页按各自获批视觉移植；AI仍为候选，顾问旧成功页不符合最新去S5链路；HOLD |
| `feature/br03-store-unit` | S01、S02，门店/仓位卡 | VIS-07视觉签收包 + HIFI-03 Portable Handoff（均已本地接收，见 `app/docs/BR03_GIT_MIGRATE_01_SOURCE_INTAKE.md`） | VIS-07演示视觉冻结；来源接收已提交；HIFI-03仅隔离候选；当前页面双尺寸/状态验收、中央门店/仓位ID映射及S02→O01真实路由待办；HOLD |
| `feature/br04-recommend` | S5、预约留资、快捷下单、O01 | `Mini_Koala_BRANCH_04_HANDOFF_01_2026-10-23.zip` | S5 FIX-02 附条件通过，价格/考拉E存素材/路由待中央验证；HOLD |
| `integration/proto-merge-01f` | 共享状态/报价/订单快照/导航、跨页回归 | 中央 01B、01F B4A 隔离候选 | 实际候选不是批准主线，不得整包覆盖。Release Gate HOLD |

## 迁移原则
- 所有初始分支均由受控历史基线创建；**工作分支建立≠源码成果已迁入**。
- 分支源ZIP保留在本地输入目录，仅使用受控差异移植到工作区，不上传混杂原件。
- CAP与S5共享源文件；中央 MERGE 唯一负责最终冲突裁定与状态接线。
- 已批准视觉不意味着浏览器功能 PASS；真实浏览需 HTTP + 375×812、390×844 双尺寸。
