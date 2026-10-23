# Sprint 1G — Core Visual Harmonization PATCH

**母版：** Sprint 1F 累计高保真母版  
**执行性质：** VISUAL PATCH  
**结构边界：** H01 / Estimator / Recommendation / S01 / S02 / U01 的 `<body>` 源码字节保持不变。

## 本轮只处理 3 项

### 1. 路线与定位图标统一
- 清除核心页面用户可见的系统 Emoji：`📍 / 🚗 / 🚲 / 🚶`。
- 统一为 16–18px、约 1.8–1.9px stroke 的品牌绿线性图标。
- 不改变路线数据、交通方式、排序和交互。

### 2. 特价语义统一
所有 `特价 / 特价仓 / 限时特价` 统一：
- 背景：`#FFF0E2`
- 文字：`#B85A16`
- 单行胶囊显示

绿色继续只承担品牌 / 推荐 / 行动语义。

### 3. Tertiary 可读性收口
- 原：`#8A938E`
- 冻结：`#6D7671`
- 在 `#FDFBF7` 页面底约 4.54:1
- 在 `#FFFFFF` 卡片底约 4.69:1

主要用于 11–12px 地址、说明和弱辅助信息。

## 实现方式
新增共享纯视觉资产：
- `prototype/mini_storage_visual_harmonization_v1.css`
- `prototype/mini_storage_visual_harmonization_v1.js`

共享脚本只负责去除装饰性 Emoji 并添加视觉 class；不改变业务状态、数据或导航。

## 冻结结果
通过后，本轮与 Sprint 0–1F 一并冻结为 **Mini Koala Visual Baseline 1.0**。
