# QA-LEGACY-COVERAGE-02｜五条历史QA来源与已签收RC2覆盖差异

**审计日期：** 2026-11-13。对象是已签收的[PR #176](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/176)，冻结SHA `41a8a079eb48049e1060512bddf71c226bfd3738`，及其同SHA [RC2 Actions #43405346410](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43405346410)（SUCCESS）。补充的[QA-LEGACY-RETAIN-01](QA_LEGACY_RETAIN_01_RESULT_20261113.md)已独立完成19/19 PASS。  
**审计方法：** 逐一对照#124/#135/#145/#122/#109的原始脚本路径、精确Git Blob SHA与RC2冻结树；检查现有同SHA工作流中实际执行的同类断言。**路径缺失/Blob不同不等于功能缺失；旧视觉断言也不能自动成为当前母版。**

| 历史PR及脚本 | 当前候选源码状况 | 实质覆盖与建议 |
|---|---|---|
| [#124](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/124) `verify_rc2_final_gate_04.cjs`，Blob `4574edc320a7e63710c72f7e4c501ae812222b21` | 原脚本在签收树中不存在 | 旧脚本主要检查H01文案、S02三选项卡/四交通模式/400、S5下单入口、手机号报价门禁与禁对比。当前RC2的S02交通路线浏览器检查、S5 no-compare及手机号/订单路径已有实际运行证据。旧脚本包含对过时来源分支的强绑定，**不直接移植**。 |
| [#135](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/135) `verify_rc2_final_gate_05_browser.cjs`，Blob `461c2928ff8389d19a740dca27bdf320c7cc085a` | 原脚本在签收树中不存在 | 四档R3缩略图尺寸/哈希、S5缺容量/租期时的深链拦截及历史`incomplete`状态判定。已签收`app.js`包含S5初次渲染与进入时均检查`requirementReady()`，不足则跳回CAP；但是**独立冷启动S5深链的同SHA浏览器断言在本次审计中尚未确认**。列为下一版可选补证；中大型仓物理图重建此前已由用户暂缓，不能重新设为当前演示P0阻断。 |
| [#145](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/145) `verify_h01_baseline_vis_check_01_browser.cjs`，Blob `e6e273695c71b00328597225ef431aaa710d7356` | 原文件名不存在，但签收版有`verify_rc2_single_candidate_03_h01_browser.cjs`，457行，Blob `929fcdc51e3ef35e5455eaa87fb46d7d5008850b` | **已有强替代覆盖**：20种H01页面状态，375/390、中文字体/裁剪、底栏遮挡、O03倒计时与租后主任务等均有针对性断言；且该脚本在RC2同SHA Actions中执行。旧脚本硬编码的历史站点来源身份不要回灌。 |
| [#122](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/122) `verify_rc2_final_visual_review_03_browser.py`，Blob `58a2923dbea98f3109bc20f8e78e7c0a43d29a14` | 原Python文件不存在 | 当前同SHA有S02四交通方式、S5双门店与下单、全站375/390和独立S01滚动证据；**但旧脚本对四页精确11px标签字号/颜色和各页长滚动底部的同态断言，不能认定已逐项完全等价**。旧11px色值属于历史视觉实现，不应强加给用户已签收版本。下一次视觉改版可复用“检查可见文本、完整滚动触达、图片加载”的方法，不复用硬编码旧母版色值。 |
| [#109](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/109) `audit_h01_state_visual_01.cjs`与`qa/test_h01_state_implement_01.cjs` | 审计脚本名不存在；共享策略QA原路径存在但Blob不同 | 签收版`qa/test_h01_state_implement_01.cjs`及`verify_rc2_single_candidate_03_h01_browser.cjs`均在同SHA工作流运行，覆盖新用户、已估算、支付中/超时、身份核验、在租与退租等状态；20状态主视觉断言比历史17状态更全。**不得单凭Blob不同称为缺失**。 |

## 本轮判定

- **可直接纳入已验证覆盖的旧问题：** H01多状态、O03待支付倒计时、S01搜索/三筛选与卡片滚动、S02交通路线四方式及价格状态、S5禁对比和推荐、订单/生命周期基础路径；以RC2同SHA的实际脚本/Actions证据为准。
- **未确认完全等价但不阻断当前演示：** S5冷启动缺需求直链的独立浏览器专项测试，以及四页逐区长滚动底部/完整汉字标签溢出的跨页统一断言。这些属于**QA覆盖待补证**，不等于已确认产品缺陷。
- **明确延后：** 仓型中大型真实图重建和精确图像物理归属；历史11px标签色值不继承为新母版。
- **已有19项加强补证：** 订单恢复身份、重复付款幂等、取消续租/恢复、重复开票及累计60个月限制、VIS-11J母版SHA哈希均由独立QA分支实跑通过。

## 下一步最小成本方案

1. 如果继续代码迭代，优先在**独立QA-only分支**增加S5冷启动/不完整需求跳CAP的双尺寸浏览器用例；测试可以失败并生成缺陷，不得直接修改已签收PR#176的代码。
2. 视觉版型发生新批准变更后，再将完整长屏滚动可见/截断检测统一挂入375/390主门禁；旧标签尺寸、颜色不得作为新签收的唯一判断。
3. 对#124/#135/#145/#122/#109保持历史QA来源追溯，不因旧脚本没有原路径而自动Close这些PR。关闭建议须明确证明业务/测试需求已被覆盖且用户对具体名单批准。
4. 本报告和下一步属于治理审计，不构成PR#176的重新签收、main业务合并或正式部署批准。
