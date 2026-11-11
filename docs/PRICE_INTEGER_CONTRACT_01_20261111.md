# PRICE-INTEGER-CONTRACT-01｜中央演示计价整元契约
**2026-11-11；隔离候选基于PR#101，NO DEPLOY / NO MAIN MERGE / NO AUTOMATIC CROSS-BRANCH REBASE。**

- 每仓先以原月租乘当期折扣并截断至整数元；组合仓分别截断再加总。
- 月租 × 1–60个月 = 整期租金，押金为折后1个月月租，管理费首次仅¥50。
- 优惠券独立减少整期租金，不改变月租；首次应付=券后整期+押金+管理费。续租押金与管理费均为0。
- 旧 `monthly_after_coupon` 保留为只供分析的内部派生数值，可包含小数；**不是月租，也不得用于用户价格展示或合同付款**。资金实际支付字段整数化。
- 演示人工审核的续租月租也截断为整元，乘租期计算金额。
- 不变更现有租期系数及 Issue #106 的36→37个月价差；不验证真实性价目、库存、地理位置或微信支付。
- S5旧文本已于VIS-SYSTEM-04A移除；本轮清理当前基线`app.js`及`presentation-policy.js`残余“月均约”，只改文字、不回灌旧版S01/S02结构。
- 本分支自测需1–60月单仓/组合/续租、券、中央订单同源及375/390 S5浏览器回归；四页面独立PR的最终归并与终签仍保留门禁。

**源码**：`demo-core.js`、`presentation-policy.js`、`app.js`、`lifecycle-ui.js`；测试：`scripts/verify_price_integer_contract_01.cjs`、既有RC2业务校验与S5浏览器脚本。
