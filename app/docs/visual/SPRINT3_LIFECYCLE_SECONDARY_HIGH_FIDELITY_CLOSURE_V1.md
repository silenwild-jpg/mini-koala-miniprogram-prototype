# Sprint 3 — Lifecycle & Secondary Hi-Fi Closure

## Scope
基于 **Mini Koala Visual Baseline 1.0**，以纯视觉 PATCH 方式收口以下页面：

- M01 我的
- RN01 续租
- EX01 退租 / 到期处理
- DP01 押金处理
- OH01 历史订单
- IV01 发票
- 商家 / 企业存储单页

> 当前 Baseline 没有独立的“考拉E存”详情页。Sprint 3 不新增业务页面；E存继续沿用 Sprint 1C / 1D 已冻结的推荐卡视觉与既有演示入口。

## Frozen boundary
本轮只追加共享视觉层 `prototype/mini_storage_sprint3_lifecycle_hifi_v1.css`，不修改上述 7 页 `<body>`。

冻结不变：
- 页面结构与中文文案
- 生命周期状态机
- 续租申请 / 报价 / 支付逻辑
- 退租、验仓、押金状态
- 历史订单与付款数据
- 发票申请逻辑
- B2B 需求字段、租期折扣、顾问与自助入口
- 页面跳转与 localStorage / REPO 语义

## Visual closure
### M01
- “我的”由工具页收口为服务资产中心。
- 当前服务、预约 / 报价 / 订单 / 最近找仓统一卡片层级。
- 推荐有礼降为次级服务卡，不与当前租赁争抢视觉。
- 底部导航继续使用冻结品牌绿。

### RN01
- 当前仓位事实卡、续租月份选择、说明、续租状态分层。
- 租期 Chip 与自定义月份输入统一到 Visual Baseline。
- 续租为单独报价的现有业务口径保持不变。
- 报价确认 Sheet 继续突出本次续租报价。

### EX01
- 退租作为流程任务页处理，橙色只用于风险 / 退租状态提示。
- 日期、处理类型、说明、主行动形成单一路径。
- 处理进度卡使用稳定服务型视觉。

### DP01
- 押金金额使用 Price Orange 成为页面数字主视觉。
- 处理状态与规则说明降为事实/辅助层。

### OH01
- 历史订单统一为轻量订单卡。
- 租赁中 / 已结束状态改为低噪声状态胶囊。
- 日期、累计支付、押金状态继续作为辅助事实。

### IV01
- 付款记录、发票表单、已提交申请形成三段式结构。
- 付款金额使用价格橙；申请状态使用品牌绿状态胶囊。
- 表单控件、输入框、Select、CTA 统一到 Visual Baseline。

### B2B
- 企业页从强营销 Hero 收口为生活服务型品牌首屏。
- 用仓位置、空间、租期、物品类型、搬运、联系方式统一表单节奏。
- 租期折扣角标保留既有业务值并使用统一 Price/Promotion 语义。
- 原 `📍` 仅通过 CSS 隐藏并替换为线性定位图标；DOM 文本不改。
- “查看可选仓位 / 邀请顾问协助”保持双行动结构。

## Design system alignment
- Page background: `#FDFBF7`
- Brand green: `#2F6B4F`
- Price orange: `#D56A1C`
- Tertiary text: `#6D7671`
- Standard card radius: 14–16px
- Main CTA height: 46–48px
- 4px spacing grid / 16px mobile side padding

## Result
Sprint 3 页面已完成视觉收口，不创建新功能、不重新解释业务状态。
