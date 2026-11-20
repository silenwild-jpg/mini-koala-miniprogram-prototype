# W7 共用契约（各工作流必须一致；2026-11-17）

规则取数一律用 `model/w7-rules.js`（`window.MK_W7`），在每个页面 `runtime/*.js` 之后、`w*-render.js` 之前加一行 `<script src="../model/w7-rules.js"></script>`。

## 1. 任务卡两层（D-81，H01 与 M01 同结构同数据）
- 主卡恒显 1 张，按服务阶段取（高 → 低）：refund / returning / lease_expired / renewal / expiring / active > identity / upcoming > pending / payment_failed > selected > estimated > booking（仅当没有以上任何一项时预约线索才做主卡）> new 营销位。expired / cancelled / invalidated 只有在没有更高阶段时做主卡。
- 待办条带：主卡下方，最多 2 条，超出一行「还有 N 项待办」进「我的」。进入条带：预约与咨询线索（booking）、未完成的找仓（estimated / selected，含已付款用户的新需求）、主卡被租后阶段占用时的待支付订单。
- 条带 markup（两处逐字一致）：
  `<div class="todo-strip" aria-label="待办"><a class="todo-row" data-action="…" href="…"><span class="todo-k">用仓预约</span><span class="todo-t">已提交，预计 10 分钟内与您联系</span><svg class="ico sm">chev</svg></a>…<a class="todo-more">还有 N 项待办</a></div>`
  CSS 在 `design-system/w7-partials/_shared.css`（已写好，直接用，不要各写一份）。每行高 44，kicker 12px 次级色，标题 14px 主文字色单行省略。
- 主卡按钮（取代运行时 policy 的按钮，设计侧在 render 层改写）：

| 状态 | 标题 | 主按钮 | 次按钮 |
|---|---|---|---|
| pending | 订单待支付 | 继续支付 | 费用明细 |
| payment_failed | 支付未成功，订单为您保留 | 继续支付（事实格：本次应付 / 支付剩余时间，沿用下单起 3 小时） | 更换仓位 |
| expired | 订单已超时 | 重新找仓 | — |
| cancelled | 订单已取消 | 重新找仓 | — |
| invalidated | 报价已失效 | 重新找仓 | — |
| identity | 入仓前需完成验证 | 完成身份验证 | 门店导航（无开锁） |
| upcoming | 入仓准备 | 门店导航 | 入仓指引（无开锁） |
| active | （在租）| 一键开锁（演示占位，点后 toast「开锁功能演示占位，后续接入」）| 门店导航；服务操作行含「加租仓位」→ quick.html?store=<当前门店>（R-B-02）|
| expiring | 租期即将到期 | 办理续租 | 一键开锁 |
| renewal（报价已出 QUOTE_READY）| 续租报价待确认 | 确认续租报价（事实格：报价剩余时间，24 小时）| 一键开锁 |
| renewal（QUOTE_PENDING）| 续租申请处理中 | 查看续租进度 | 一键开锁 |
| returning | 退租处理中 | 查看退租进度 | 门店导航 |
| lease_expired | 租期已到期 | 办理续租 | 办理退租（逾期后果不写数字）|
| refund | 押金处理中 | 查看押金进度 | 查看订单 |
- 事实格只放事实（日期 / 金额 / 时间 / 仓号），不放「以订单记录为准」「待确认」这类套话（R-A-28）；没有事实就少一格。

## 2. 门店卡价格（D-90 / D-98 / D-92 / D-100）
- 无需求：`均价 ¥75/m³/月`（`MK_W7.storeAvgText(store)`，不带「起」）。H01 推荐卡、S01 标准卡与紧凑卡、S5 冷启动同此。
- 有需求：匹配仓位整期价为主、月租为次（现行）。S01 每卡 1 行仓位 +「另有 N 个可租」；S5 每卡 2 行（匹配仓 + 下一档更大的可租仓，没有第二个就只 1 行）。S01 与 S5 用同一卡结构（S01 standardCard 的头部 + 仓位行）。
- 起价型「¥X/月起」只出现在单个仓位未选租期时（S02 浏览态仓位行、QUICK 未选租期）。
- 紧凑卡（S01 第 4 位起）也显示价格：无需求 = 均价；有需求 = 匹配仓整期价。
- 接近：`MK_W7.fit()`，文案「比需求小 0.5m³」；<80% 不推荐。
- 顾问卡：`MK_W7.advisorNeeded(capacity, rentTotal)`，一页一次、放在仓位 / 门店列表之后、不拦截下单。文案「需要顾问帮您确认方案？」+「预约顾问」。
- ≥30m³（`MK_W7.salesOnly`）：不出自助匹配列表，直接给「提交给顾问」主操作（个人 / 企业同）。取消 50m³「大容量」。

## 3. 统一租期 / 容量输入（R-B-21 / R-B-29）
- 租期：chips `1个月 3个月 6个月 12个月 24个月` +「其他」（步进器 1–60 个月整数）。一律写「N个月」，不写「2年」。冷启动不预选。折扣标签用 `MK_W7.termDiscount(m)`（如「6.5折」），不写「优惠」。class：`.termpick` > `.chip`（现有 chip 组件）。
- 容量：数字输入（0.5–200，步进 0.1）+ 单位切换 m³ / ㎡；选 ㎡ 时输入框下显示「约 X m³（按层高 2.4m）」；下方一行「估算值，以实际仓位为准」。线索表单（预约 / 咨询）可加「暂不确定」。企业表单用 `MK_W7.BIZ_BANDS` 区间 chips + 「自定义」。class：`.cappick`。

## 4. 线索与受理（D-73 / D-89 / D-95 / D-106）
- 提交成功统一：标题「已提交」；正文 `MK_W7.LEAD_COPY.inHours`；次行「非服务时段提交的：已收到，工作人员上班后将优先联系您」+「服务时段：每日 9:00–20:00」。演示截图状态统一用服务时段内文案，另给一个 `&offhours=1` 变体。
- 任何页面不得再出现「未发送至顾问服务」「尚未连接」「尽快」等说法（评审模式 review=1 的内部说明除外）。
- 预约用仓表单写明「提交后由顾问电话确认，不锁定仓位与价格」。
- 运输 / 搬运（D-76）：下单前可预约，按线索处理，不计价、不进应付金额。

## 5. 文案统一
- 「本次应付」；「预约与咨询」（原「我的需求」）；「找仓进度」不变；Tab3「订单」。
- 业务未给口径的（退订、提前退租预付租金、逾期费用、押金退还时限与扣除、发票是否含押金、失败原因枚举、券有效期与门槛）：只留显示位，写「以合同约定为准」或「—」，**不写任何数字**。
- 待支付 / 支付失败：保留 3 小时自下单起算；续租报价 24 小时，过期恢复折扣表价格。

## 6. 工程约束
- 每个工作流只改自己名下的文件。新增 CSS 写到 `design-system/w7-partials/<自己>.css`，并在自己的页面里 components.css 之后加 `<link rel="stylesheet" href="../design-system/w7-partials/_shared.css">` 与自己的 partial；**不要编辑 components.css / tokens.css / base.css / runtime/**（收口时统一并入）。新 CSS 必须带页面作用域（`body[data-page="…"]` 或专属 class），不用 !important。
- 门禁：字号 ≥12px；可点区 ≥32px；375 无横向溢出；控制台 0 错误；主按钮 `.btn.primary`（#0B7A48）；页面左右 16；卡片圆角 12；按钮圆角 4；不新增色值（用 tokens）。
- 新增状态要在页面 STATES 表里登记，并把「页面 → 新增 / 改名状态键」写进自己的交付说明。原有状态键不删、不改名（回归脚本依赖）。
- 自测：`python3 -m http.server <端口> --directory <工作树>` 后用 playwright 跑自己页面全部状态 375/390，`tools/metrics.js` 四项为 0（对比度只允许占位灰）。服务器用完关掉（`pkill -f "http.server <端口>"` 单独一条命令，端口写成 `88[3]1` 这类括号形式避免杀到自己）。
- 临时文件放 /srv/dt/product/tmp/w7/<自己>/。
