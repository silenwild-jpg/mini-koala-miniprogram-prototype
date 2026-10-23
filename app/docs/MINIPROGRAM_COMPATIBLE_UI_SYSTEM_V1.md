# Mini Koala — MiniProgram-Compatible UI System & CSS Upgrade V1

日期：2026-10-12。基线：Recommendation + External AI Repair PATCH V2。演示候选，Release Gate = HOLD。

## 改造范围

- 共用样式：`prototype/mini_koala_miniprogram_ui_system_v1.css`。所有选择器通过 `.koala-ui-v1` 命名空间约束；不修改定价、门店算法、库存、路由、优惠券或客户数据。
- H01：首页双任务卡、推荐门店、导航与背景轻量规范化。保留冻结模块顺序与所有用户文案。
- S01：保留现有定位 + 搜索分区、即时下拉筛选、推荐规则和供需状态；规范化按钮、卡片、标签、价格强调与选中状态。没有生成用户可见“3公里最低价”角标。
- S5：只规范租期与推荐步骤，不重绘估算其他步骤；保留总租金、自动匹配和跨页行为。
- O01：白底分区、金额强调、48px 底部操作按钮与安全区；延续身份和支付原流程。
- 将 Near-White 四页旧试装提案整合进最新代码基线的 CSS token，未直接复制旧 ZIP，保留较新业务修复。

## UI 组件约定（HTML → 未来 WXML/WXSS）

| HTML 原型结构 | 目标小程序组件策略 | 语义/动作 |
|---|---|---|
| `.location-unified-box` / `.current-location` | `view` + `button` + `input` | 位置与搜索同框，独立点击区域 |
| `.compact-filter-btn` + `.inline-filter-sheet` | TDesign DropdownMenu 或自定义下拉 | 排序/距离/服务三列，就地展开 |
| `.store`, `.demand-store` | 自定义 StoreCard | 未携带需求展示月度单位起价，携带需求展示整期租金起 |
| `.store-demo-tags` | 横向 `scroll-view` + `view` | 标签不折行，2–4个按现有演示数据 |
| `#s5 .term-choice` | `view` + `button` 或自定义单选 | 选择租期、折扣状态跟随订单价格 |
| `#s5 .rplan` | 自定义 RecommendCard | 单仓优先，组合顾问承接 |
| `.bottombar` | `view` + `button`, fixed + safe-area | 主次 CTA 与底部安全区一致 |
| `.sheet` | TDesign Popup / WeUI confirm | 保留现有必要确认操作 |

尺寸：375 CSS px 映射 750rpx 设计基准；16px 边距→32rpx，48px CTA→96rpx。WXSS 对 CSS 功能兼容性需开发阶段单独验证；本轮 HTML 样式**不等于**原生小程序代码。

## 风险与限制

- 改造为视觉/UI 状态补丁，未将原型整体迁移至 WXML。
- 双宽离线 DOM/CSS 检查不能替代真实浏览器 URL E2E、微信开发者工具、真机交互。
- 新 CSS 无复杂 `:has()` 等高级选择器；通过页面 BODY class 做样式作用域，避免跨页覆盖。
- 保持既有真实业务流程和推荐计算；如线下业务计算回归发现差异应停版，不能以视觉验收掩盖。
