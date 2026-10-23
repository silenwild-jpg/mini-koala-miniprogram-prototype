# Sprint 1G — Core Visual Harmonization QA Report

## 验证范围
核心六页：
1. H01 首页
2. Estimator
3. 租期与推荐
4. S01 附近门店
5. S02 门店详情
6. U01 仓位与价格

设备：
- 375×812
- 390×844

## 运行时结果
12 个页面/设备组合均满足：
- JS error = 0
- 页面横向 overflow = 0
- 用户可见 `📍 / 🚗 / 🚲 / 🚶` = 0
- 特价标签保持单行

特价语义抽查：
- H01 `特价仓`：`#FFF0E2 / #B85A16`
- H01 `限时特价`：`#FFF0E2 / #B85A16`
- S02 `特价`：`#FFF0E2 / #B85A16`
- U01 `特价`：`#FFF0E2 / #B85A16`

Tertiary 抽查的 computed color 为 `rgb(109, 118, 113)`，即 `#6D7671`。

## 结构冻结
五个承载六页的核心 HTML 文件 `<body>` SHA-256 与 Sprint 1F 完全一致：
- H01: `75427254dc6a1517f8036139eb2c2e1452d0ee673082fd1982c6a869ab82f959`
- Estimator / Recommendation: `a03ecf6584e245eb0fc0b8a6771429bd306b79acfe80d835e6d5687a7fe85db1`
- S01: `c5b82a1fa414591e3c9a5a40622758865ac0e7f87cb6794a468ef87f6c35a695`
- S02: `c734a3f041f8afd4665bd1a3d03c7efa4077ff00fede7f97bc9a62b0dac30ae3`
- U01: `0eb9d05b9e98ea76ce5977c8fb2b674d2bb40c2f85b298c20efae76ff7e6696b`

## 自动回归
`node qa/run_baseline_v27418.js`：**37 / 37 authoritative JS tests PASS**。

静态包完整性：
- 45 HTML
- 28 inline scripts
- 445 local references
- missing local reference = 0

## 结论
**PASS — 可冻结 Mini Koala Visual Baseline 1.0。**
