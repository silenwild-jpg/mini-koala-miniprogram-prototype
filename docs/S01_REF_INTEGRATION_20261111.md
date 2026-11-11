# VIS-SYSTEM-02-REF-INTEGRATE｜S01 已选信息布局定向归并 PR #99（2026-11-11）

> **归并范围：仅 PR #99 隔离业务候选内部的代码接入，尚未合并主分支，也未部署评审站。** 用户选定了提供的截图所示的匹配门店卡信息布局；本次正式替换 S01 前两家匹配实体门店卡的排列。像素级全站视觉、复杂状态及人工最终终签仍保留独立门禁。

## 1. 源与边界

- 原业务候选：PR [#99](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/99)；接入前业务分支 SHA `7d3ef935815ad5bc0ecda1afe6cb802006d2d339`。
- 选定布局的隔离探索：PR [#111](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/111)；已通过参考图 Chromium QA 的源码 SHA `a5fd6d24aeb034657d46f956f99f0aa307d77a16`。
- PR #99 本次 **最新业务代码同 SHA 验证点**：`765b312a7ee0135ee60cd49dd558d4b27733d2d5`，CI [#43005017677](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43005017677) **SUCCESS**，截图/结果 JSON [artifact #13848041552](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43005017677/artifacts/13848041552)。
- 未直接合并 PR #111：没有复制实验用 `balanced`/`flow`/`compact` 三种旧布局、视觉 token 全量文件、其他页面重构，也没有变更 S01 推荐规则、登录/手机号/订单或支付状态。

## 2. 用户已选版式的信息位置

| 模块 | PR #99 当前接入布局 | 信息/规则状态 |
| --- | --- | --- |
| 门店头部 | 左图、右店名／促销+服务+属性有序标签／**地址单行**／距离独立行；右上轻箭头进入 S02 | 字段与排序规则不变；旧 CSS 地址/距离压缩冲突已纠正 |
| 仓位下部左 | **容量大字**，用途文案辅助小字 | 保留同一个匹配仓位 `unit.id`，不添加新仓位 |
| 仓位下部中 | **整期整数主价**+轻折扣；下一行 `¥整数月租/月 × N个月` | 保留原经营公式、不写「月均」，不在匹配态显示立方单价 |
| 仓位下部右 | 浅灰「仓号 A001–D030」；下方**48px立即下单** | 点击继续选中准确仓位，仓号继承 S02/S5/O01 |
| 其他门店 | 浏览态全部实体店同一种紧凑卡；匹配态第3服务位考拉E存；第4家起紧凑店卡 | 推荐和转化路径不变 |

**批准的是信息布局，不是所有像素固定不变。** 字体精修、颜色系统、标签触达和卡片整体质感仍可在 `VIS-SYSTEM-02` 与最终视觉门禁中优化；不能擅自改变字段、状态或推荐顺序。

## 3. 改动文件与意图

- `app/prototype/parallel/core-journey-fix-01/demo/s01-reference-layout-02.css`：仅移入 PR #111 的**已选中 reference 版式**，选择器严格限定为 `html[data-vis-system=reference]` 的 S01 展开实体门店卡；兼容既有共享标签暖色/弱灰色语义；不引入全局设计 token 重构。
- `app/prototype/parallel/core-journey-fix-01/demo/s01-r2-bind.js`：仅增加该 CSS 的加载，默认在当前 PR #99 使用参考布局；调试 URL `?vis_system=baseline` 可临时对照旧布局，实际业务逻辑保持原样。
- `scripts/verify_s01_user_reference_layout_02_browser.cjs`：移入参考布局原型测试，并扩充浏览态紧凑门店、固定第3位考拉E存、第4位紧凑、成交仓位ID不变等断言。
- `scripts/verify_s01_price_discount_06_browser.cjs`：将旧强制「价格与按钮垂直居中」替换为**新布局真实位置**检验，仍完整检查租期折扣标签、整元租金、公式、无划线原价与48px CTA。
- `scripts/verify_s01_cabin_number_08_browser.cjs`：将旧强制「仓号在容量左侧」替换为新布局的**仓号右上/按钮右下、容量左侧/用途下方**检测，原跨 S02/S5/O01/O03仓号身份测试没有删除。
- `.github/workflows/s01-vis-decision-02.yml`：新增同一 PR #99 源的原生375/390浏览器回归与截图归档；无 Netlify 或 main 部署。

## 4. 真实运行的验收结果

| 验证维度 | 本次结果 |
| --- | --- |
| 375×812、390×844 | **PASS** |
| 浏览态紧凑、匹配前两家展开、第三考拉E存、第四紧凑 | **PASS** |
| 1、12、37、60个月参考布局单独场景；折扣广泛档位 | **PASS** |
| 仓号、容量、用途、整数整期价、租期折扣与完整月租公式 | **PASS** |
| 无金额、折扣、辅助价格互相覆盖/横向溢出 | **PASS（已测场景）** |
| 已确认仓位直接下单选择 `unit_id` | **PASS** |
| 跨 S02/S5/O01/O03 等仓号同源 | **PASS** |
| H01/S01/S02/S5 标签同源同序与整元展示 | **PASS** |
| S5推荐及O01交易/支付失败/取消等回归 | **PASS** |
| JavaScript页面错误 | **本次浏览器测试无错误** |

**独立截图统计（常规3m³/12个月）**：第一、第二张匹配卡在375px均为211px高；390px均为214px高。地址、距离分行可见，按钮高48px。

## 5. 仍未解除的门禁

1. 本次**技术/布局完整性 PASS**，不等于**全站人工视觉终签**。须以本次PR #99截图逐区审查视觉质感、实际首屏、页面密度、长地址和长价格极值以及不同城市的排版。
2. 新布局已是PR #99当前默认方案，但PR #99仍是 Draft/HOLD；**未合并 main、未部署评审站、未产生微信真机或真实库存付款证据**。
3. 经营折扣跨档与定价策略的 [Issue #106](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/issues/106) 保持独立待审；本任务没有改变任何费率因子和经营策略。
4. 后续 `S01-REF-VIS-SIGNOFF-03`：基于同一代码提交的真实截图进行375/390逐区人工验收、极值和五城视觉状态补证，再裁定是否允许合并到业务主集成分支。
