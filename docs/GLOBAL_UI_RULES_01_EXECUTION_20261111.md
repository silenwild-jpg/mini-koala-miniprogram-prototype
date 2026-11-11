# GLOBAL-UI-RULES-01｜全站整数报价、标签同源与容量短句接线报告

- 日期：2026-11-11
- **实际验收源代码 SHA**：`474e64b096d88379742ae9090026a1ea66b96ad2`
- PR：[Draft #99](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/99)，基于PR #98的隔离分支，**未合并main、未部署、非微信真机证据**。
- 同SHA隔离 Chromium：[GitHub Actions #42991434545](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/42991434545) **SUCCESS**；[截图和JSON证据 artifact #13842305943](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/42991434545/artifacts/13842305943)。

## 技术实现（已接线并通过上述隔离测试）

| 全局规则 | 修改源 | 验证结论 |
| --- | --- | --- |
| 人民币金额整数元，直接截断 | `demo-core.js` 的统一 `currency`；`presentation-policy.js` 与 `app.js` / `br04/bridge.js` 货币格式 | **PASS**；37家门店/146仓位×1–60个月，单仓金额8,760组复算均为整数；折后月租 × 租期 = 整期租金；押金、应付整元 |
| 用户可见不再写“月均 / 月均约” | `presentation-policy.js`、`app.js`、`br04/bridge.js` | **PASS（被测主要路径）**；O01费用区/QUICK/S5展示为`月租`及`¥X/月 × N个月`，旧浏览器回归PASS |
| 浏览态门店最低立方单价只显示整数 | `presentation-policy.js` 的 `cubicReference()` | **PASS**；统一截断为整数元；固定公示参考期不代表默认租期 |
| 相同门店标签同源同序 | `presentation-policy.js` `tags(store,limit)` 和 `home-bridge.js`、`app.js`、`s01-r2-bind.js`、`br04/bridge.js` | **PASS**；H01/S01/S02/S5均取相同标签数组，各页面按数量切片。促销第1，服务第2，属性第3 |
| 跨页标签视觉层级 | `global-store-tags.css` + 各页引入；语义`mk-tag-promotion/service/attribute` | **PASS（布局与类型）**；促销暖橙浅底，其余浅灰描边；不更改首页卡结构 |
| 仓位适用短句 | `br03-policy.js` `generic/describe`；`app.js` 的 S01/S02/S5 应用 | **PASS（源与主要可见页面）**；相同容量使用同一短文案；S5仓位短句可在对应模型中读取，**现有S5母版原本隐藏该句，尚未强制增加显示行** |
| S5月租×月份完整显示 | `br04/s5/s5-native-flow.css` 调整既有网格内月租副行宽度 | **PASS**；375px、390px下不再省略`¥260/月 × 12个月`，未新增卡片容器 |
| 老版业务单测和跨页订单回归 | `scripts/verify_rc2_business_rebuild_01.cjs`、`scripts/verify_s01_price_discount_06_browser.cjs`、`scripts/audit_s01_discount_signoff_07.cjs` 和原S5/O01测试 | **PASS**；旧断言由按分精度更新为整元计算，不修改容量精度和仓位身份 |

**真实截图**：`release-evidence/global-ui-rules-01/{H01,S01,S02,S5}-integer-tags-{375,390}.png`；同时保留S01两状态、折扣十档、跨S02/S5/O01仓号继承与订单支付/取消/失败场景。

## 仍未完成 / 独立门禁

1. **正式经营折扣档位与边界**仍存在 Issue [#106](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/issues/106)。整数取整是已批准的定价方式，但**不意味着** 5.5–7.5折档位及36→37个月整期价变化已获得经营负责人签字。需在最终业务发布前用新整元公式重新审查边界。
2. **全站视觉 tokens** 仍为 PROVISIONAL。此项只实现促销/服务/属性标签的基础一致性；字号、间距、色板与S01两层仓位区最终人工审美签收进入 `VIS-SYSTEM-01`。
3. **S5仓位用途短句**源数据已统一，但当前已批准视觉母版中这行尚未直接显示；后续若确需露出，须在视觉规范阶段审查卡高/首屏密度，不能擅自增加无意义说明。
4. **CAP与按物品估算的高保真视觉表现**没有在本次运行中逐页确认全部标签/文案；本轮代码没有新增真实仓位/地点/支付数据。
5. 本次属于产品原型演示，不要求真实库存、授权定位、促销有效性或线下成交校验。隔离技术PASS不代表上线或微信运行PASS。

## 下一阶段建议

`VIS-SYSTEM-01`：统一 H01/S01/S02/S5 全站字体、标签、价格、间距、状态交互；在不改变S01已冻结卡片结构前提下，人工复审S01前两家匹配仓位卡内部密度，补全375/390极值、五城和异常态截图。
