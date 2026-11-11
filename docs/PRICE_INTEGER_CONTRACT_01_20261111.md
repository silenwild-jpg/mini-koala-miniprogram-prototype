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

## 本轮同SHA验收结论（2026-11-11）
- **完整受测源码 SHA**：`3c83219380237897d58c450ec109a3a934aaeac3`。
- **CI**：[GitHub Actions #43025248298](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43025248298) `completed/success`；[原始证据 artifact #13856692605](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43025248298/artifacts/13856692605)。
- **Node**：1–60个月逐月单仓、同店不同规格组合仓、续租与押金/券/管理费/首次应付；`verify_price_integer_contract_01.cjs` PASS；既有`verify_rc2_business_rebuild_01.cjs` PASS。正式报价→中央证书→订单→支付成功与演示人工续租审核通过。
- **浏览器**：375×812/390×844 × 两店/一店/租期缺失/无匹配/37月 = **10/10 PASS**；S5整期租金、月租、首次应付、押金、管理费均按当前同源整数计算，月租公式与总价完全一致；页面无横向溢出和浏览器JS异常。
- **演示数值纠偏**（从旧费用引擎切换，不是经营售价承诺）：第二推荐仓位 12月原 `¥240.5/月×12=¥2,886` → 新 `¥240/月×12=¥2,880`；37月原 `¥203.5/月×37=¥7,529.5` → 新 `¥203/月×37=¥7,511`。第一推荐12月 `¥260×12=¥3,120`；37月 `¥220×37=¥8,140`。
- **来源校准**：最初工作流构建身份继承旧脚本的PR#96硬编码，补丁已使`build_rc2_isolated_demo.py`允许独立环境指定；本次GitHub Action生成manifest已核实 `source_sha=3c832193...`、`source_pr=117`、`source_branch=isolate/price-integer-contract-01-20261111`、`base_pr=101`。未借此完成线上UAT或真实数据核对。
- **独立评估结论**：`CENTRAL INTEGER PRICE CONTRACT = PASS (PR#117 isolated source)`；`S5 375/390 VISUAL + DATA QA = PASS (tested scenarios)`；`H01/S01/S02 latest candidates on SAME SHA = NOT YET INTEGRATED`；`USER PIXEL SIGNOFF = PENDING`；`PR#117 Draft/HOLD`；`main=NO MERGE`；`Netlify=NO DEPLOY`。
- **保持Issue #106不变**：现在虽有整数金额，36→37个月可能更便宜是既定折扣区间跃迁的业务决策问题；不能因技术测试通过而自动纠正或批准该业务政策。
- **建议下一阶段**：`PRICE-INTEGER-INTEGRATION-02` 源头摘取PR#117中央价格最小补丁至统一隔离候选，对H01#115、S01#99、S02#104、S5#101的页面权威来源做冲突裁定与同一SHA 375/390全站回归；同时在独立任务`VIS-SYSTEM-04B`处理促销/服务标签视觉语义，不要套用本分支旧页面CSS。
