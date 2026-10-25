# 四分支迁移登记（准备态，不代表代码已迁入）

| Git 分支 | 页面归属 | 已知主要交付 | 当前归并结论 |
|---|---|---|---|
| `feature/br01-home` | H01首页、推荐、入口状态 | `BRANCH-01-HANDOFF-01B_定位确认语义修复与共享契约同步.zip` | VIS-11J为最高视觉依据；底栏P0-A双选入口接线待完整验收；HOLD |
| `feature/br02-capacity` | CAP/物品估算/AI/顾问 | `BRANCH_02_FREEZE_01_容量页视觉母版签收包.zip` + `BRANCH_02_FLOW_FREEZE_01_按物品估算工作台视觉母版签收包.zip`；另有FLOW-08A过程包 | CAP、物品页按各自获批视觉移植；AI仍为候选，顾问旧成功页不符合最新去S5链路；HOLD |
| `feature/br03-store-unit` | S01、S02，门店/仓位卡 | VIS-07视觉签收包 + HIFI-03 Portable Handoff（见 `app/docs/BR03_GIT_MIGRATE_01_SOURCE_INTAKE.md`）；中央目录隔离候选 `app/prototype/parallel/br03-central-catalog-demo/` | VIS-07演示视觉冻结；中央原生目录候选已产出；本地 HTTP 下 375×812 / 390×844 的 S01、S02、意图与未确认租期状态检查通过；中央真实 O01 路由/报价/订单、微信与真实库存未测；仍 HOLD，详见 `app/docs/BRANCH03_S01_S02_CENTRAL_CATALOG_DEMO_01.md` |
| `feature/br04-recommend` | S5、预约留资、快捷下单、O01 | `Mini_Koala_BRANCH_04_HANDOFF_01_2026-10-23.zip` | S5 FIX-02 附条件通过，价格/考拉E存素材/路由待中央验证；HOLD |
| `integration/proto-merge-01f` | 共享状态/报价/订单快照/导航、跨页回归 | 中央 01B、01F B4A 隔离候选 | 实际候选不是批准主线，不得整包覆盖。Release Gate HOLD |

## 迁移原则
- 所有初始分支均由受控历史基线创建；**工作分支建立≠源码成果已迁入**。
- 分支源ZIP保留在本地输入目录，仅使用受控差异移植到工作区，不上传混杂原件。
- CAP与S5共享源文件；中央 MERGE 唯一负责最终冲突裁定与状态接线。
- 已批准视觉不意味着浏览器功能 PASS；真实浏览需 HTTP + 375×812、390×844 双尺寸。
