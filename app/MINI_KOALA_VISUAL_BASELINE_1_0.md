# Mini Koala Visual Baseline 1.0

**状态：FROZEN**  
**冻结日期：2026-09-29**  
**产品母版：Mini Koala Prototype Baseline 1.0 / V2.7.4.18**

## 冻结范围
Visual Baseline 1.0 由以下阶段累计形成：
- Sprint 0 — Visual Foundation Freeze
- Sprint 1A — H01
- Sprint 1B — Estimator
- Sprint 1C — 租期与推荐
- Sprint 1D — S01
- Sprint 1E — S02
- Sprint 1F — U01
- Sprint 1G — Core Visual Harmonization

## 当前视觉基线
- 背景：`#FDFBF7`
- 品牌主绿：`#2F6B4F`
- 主价格橙：`#D56A1C`
- 促销浅底 / 文字：`#FFF0E2 / #B85A16`
- 主文字：`#1F2923`
- 次文字：`#59645E`
- 辅助文字：`#6D7671`
- 4px spacing grid
- 标准卡片 14px / 主卡片 16px
- 主按钮 48px
- 线性圆角图标体系

## 核心页面冻结
H01 → Estimator → 租期与推荐 → S01 → S02 → U01 已完成高保真收口。

之后的新页面和交易链页面必须复用本基线，不允许自行新增：
- 品牌色
- 价格色
- 圆角体系
- 阴影体系
- 标签语义
- 价格层级
- 图标风格

## 业务边界
Visual Baseline 不修改 Prototype Baseline 1.0 的业务事实、状态机、推荐、价格和交易规则。

## 回归状态
冻结时：**37 / 37 authoritative JS tests PASS**。

## 下一阶段
进入 **Sprint 2 — Transaction Hi-Fi Closure**：
Q01 → O01 → O02 → O03。
