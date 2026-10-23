# Sprint 1E — S02 门店详情 High-Fidelity Visual Closure V1

## 范围

适用母版：Mini Koala Prototype Baseline 1.0，承接 Sprint 1A–1D 的视觉基线。

本轮为 **VISUAL PATCH**。仅在 S02 页面 `<head>` 末尾追加视觉覆盖层 `sprint1e-s02-high-fidelity-visual-closure-v1`；不修改 `<body>`、中文文案、数据、门店/仓位排序、租期折扣、跳转、推荐或状态逻辑。

## 视觉收口内容

### 1. 门店头部
- 门店环境示意从灰色线框占位收口成轻量“空间示意”视觉 surface。
- 门店名仍为第一层，所属小区/园区降一级显示。
- 详细地址保持主标题下方、单行省略；完整内容仍由现有 DOM 保留。
- 导航使用 Outline 次级按钮，不与成交 CTA 竞争。
- 路线 / 距离与门店服务说明拆出轻分隔层级。

### 2. 用仓上下文
- 普通浏览的“不确定用多大仓？”、已关联需求摘要、NOMATCH 提示均统一为 supporting surface。
- 不增加新的业务信息，不改变现有恢复路径。

### 3. 当前可租仓位
- Inventory Section 升级为页面主要决策 surface。
- 默认仓位卡统一 16px 圆角、轻描边和极浅阴影。
- 容量升级为卡片主标题；尺寸信息、仓号、说明保持辅助层级。
- 月租使用暖橙价格色；租期 / 折扣说明下沉一级。
- “查看仓位详情”使用 Secondary CTA。

### 4. 特价仓
- 普通浏览默认第二张仓位继续保持既有“特价”业务规则。
- 仅将视觉映射为 `price.100 + price.700`，强制单行，不改变仓位顺序或跳转参数。

### 5. 查看更多仓位
- 保持位于默认最后一个仓位下方居中。
- 收口为轻量胶囊 Text Action，不新增模块。

### 6. 租期工具
- 月数为主信息，折扣角标为次级信息。
- 选中态统一使用浅绿背景与绿色边框。
- 自定义月数、步进器与应用按钮全部映射回 Visual Design System V1。

### 7. 底部行动区
- 顾问协助 = Secondary。
- 查看可租/推荐仓位 = 唯一 Primary。
- 保留原始文案、按钮数量与行为。

## 冻结证明

S02 `<body>` SHA-256 在 Sprint 1E 前后均为：

`655ad9a5d8b64e4d2b2261b720ad30ceaf8c6237d6d7a057f6220cafc7e0d934`

因此本轮没有修改用户端 DOM、文案或 JS。

## 下一步

Sprint 1E PASS 后进入 `Sprint 1F — U01 仓位与价格 High-Fidelity Visual Closure`。
