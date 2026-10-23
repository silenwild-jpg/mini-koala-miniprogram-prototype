# VIS-BG-01 QA Result

**Visual QA = PARTIAL**；背景专项 PASS。**Business Regression = NO_NEW_FAILURE**。**Internal Demo Gate = ORIGINAL READY, NEW CANDIDATE PENDING**。**Formal Release Gate = HOLD**。

| ID | 375 | 390 | 证据与结论 |
|---|---|---|---|
| BG01 | PASS | PASS | before/after_inventory；states_*_final：首页初始和已估算任务；照片与双任务保留 |
| BG02 | PASS | PASS | H01 top/middle/bottom PNG，底导和露白无旧暖色 |
| BG03 | PASS | PASS | flow P01/P08的普通列表、三类筛选展开；before/after_valid_routes |
| BG04 | PASS | PASS | S01真实estimated入口及列表底端，需求/整期金额保持 |
| BG05 | PASS | PASS | P05四入口；返回态卡/底栏间距2.25和29.0625px前后相等；S5三滚动位置 |
| BG06 | PARTIAL | PARTIAL | 券图/说明/语义色PASS；展开首卡与底栏既有重叠51.75/24.9375px，未恶化，独立布局任务待处理 |
| BG07 | PASS | PASS | P09/P11多仓、更多仓、售罄、组合，S02真实matched路由及展开截图 |
| BG08 | PASS | PASS | U01合法仓位/租期、费用、底栏；P12/P15价格与门禁 |
| BG09 | PASS | PASS | O01有券合法订单、P15原价变/库存阻断，不提交支付 |
| BG10 | PASS | PASS | M01 active paid-fixture，top/middle/bottom/expanded，品牌profile已保留 |
| BG11 | PASS | PASS | Q01合法报价/C01钱包/C02选券；P13锁券、A01图状态 |
| BG12 | PASS | PASS | 29现行业务页枚举；其他服务/生命周期通过现有Hub受控paid fixture，仅读页面及说明，不提交后续交易 |
| REG01 | 16/16 PASS | 16/16 PASS | 原版和候选各自完整执行P01–P16；Final_34_Browser_Results.json |
| REG02 | 1/1 PASS | 1/1 PASS | A01：claimed/locked/expired/used/old/no-wallet，含刷新 |
| REG03 | NO NEW FAIL | NO NEW FAIL | 同环境默认40命令：19PASS/21历史FAIL；comparison.json与完整stdout；隔离专项9/9 |
| PACK | G4 | G4 | Manifest与CRC/逐文件SHA/完整ZIP解包重核见外部Packaging.json；最终交付前必须通过 |

Chrome真实HTTP移动触摸环境；375×812/390×844，DPR2，zh-CN，Asia/Shanghai。所有33入口×双尺寸最终采集均有DOM/bbox、背景色/图、样式链、console/network；29业务页是本轮色阶范围，4旧兼容承接页只核对不修改。最终页面清单与来源目录见before/after_inventory.json。核心状态另由完整34流程及states三滚动位置补全。

新增背景专项是实际computedStyle对照，包含透明合成和语义例外登记。G1先只读扫描并出清单，G2之后重采同状态。截图总览只作索引，原始DPR2 PNG均保留。初次脚本误定位隐藏details、ID01缺少orderNo、随机端口6000被Chrome拒绝的日志在attempt_logs中保留；重新选择正常HTTP端口并改用合法路由和可见summary后复测，未使用安全绕过参数。平滑滚动引发的2–3px瞬态偏差在P15延时稳定复测后消除；无测试断言修改。

保留风险：S5展开态既有遮挡；D3-P1-03/P1-05及历史P2；微信真机、生产API、并发库存、真实支付NOT TESTED。不得将34PASS解释为生产验收或全视觉无缺陷。
