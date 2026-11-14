# RC2-CLEAN-MIGRATION-02F｜375/390多状态截图复核与人工签收待办

2026-11-13。文档用途：**单一 RC2 候选的视觉审核证据与未关闭事项**。不是全站设计终签、内部 UAT 或上线放行文件。

## 证据及候选身份

- 源 PR：#176，已成功回归的运行时/QA SHA：`e275871918673559b88a4ff370e5bf41dd4fd16b`；Actions [#43371610581](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43371610581)，completed/success。
- 截图 Artifact [#14011599753](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43371610581/artifacts/14011599753)：已下载检查 ZIP 目录及部分实际像素。**335 个文件**；其中 **314 张 PNG**：375px 页面宽截图 **151张**、390px 页面宽截图 **151张**，另有 **12张为预期的卡片局部裁剪**（343/358 或 347/362px，不应误判为页面尺寸错误）。其余为 JSON/版本元数据。
- 项目数据属产品原型演示，允许虚构距离、价格、仓位和促销。本轮不核查实际库存、地图公里数或 CRM 真实性。
- 上次视觉规则结论：S02「交通路线」**保留**；S5 前两张推荐卡**小尺寸照片**；S01/S5 信息语言与标签/照片规格尽量统一，但两者保持不同任务结构。来源：[02E 规则冻结](RC2_CLEAN_MIGRATION_02E_VISUAL_DECISIONS_20261113.md)。

## 分状态核对记录

| 页面 | 已核对代表性证据 | 结论及边界 | 剩余需人工签收 |
|---|---|---|---|
| H01 | `rc2-single-candidate-03-h01/375-new.png`、`390-new.png`、`375-pending.png`、`390-pending.png`、`375-active.png`、`390-active.png`、`375-multi.png`、`390-multi.png`；报告 results.json 包含40条状态/尺寸记录 | 新用户营销型首页与待支付/在租/多订单任务型首页是不同状态，不得因头图在任务态缩减而自行判定母版回退；截图未见明显屏宽溢出 | 预约、续租、退租、支付失败/恢复的头部层级、CTA、NAV 视觉连贯性逐态人工审核 |
| S01 | `S01-375/390-full.png`、`matched.png`、`compact.png`、`scroll-third/fourth/last.png` 等；报告 status PASS | 搜索、三筛选、卡片与第三位考拉E存的结构证据齐全。长截图原高 1638/1866px，缩略拼图的字体小是缩放效应，不是产品原始字号证据 | 匹配态/无匹配态前两卡、第三位及以后紧凑卡的连续滚动、悬浮层、底栏遮挡需在原尺寸复核 |
| S02 | `rc2-s02-term-state-01/S02-browse-375/390.png`、`S02-confirmed-375/390.png`、`S02-order-term-gate-375/390.png` | 可选仓位/服务设施/**交通路线** 三tab可见；电话/地图入口、仓位选择和不同需求态有截图；保留交通路线，不再提出删除 | 交通路线面板实际展开、地图/路线文字在极端长地址下的排版，以及仓位列表长滚动人工复核 |
| S5 | `s5-final-vis-signoff-04c/two-stores-375/390-top.png`、`one-store-375/390-top.png`、`large-no-match-375/390-top.png`、`combo-375/390-top.png`；下半屏也有对应截图，results.json 16组场景 | 小照片已按本轮决议确认；两门店、单门店、无匹配、组合仓采用不同卡片数量与路径，不按双门店模板硬性判缺失 | 长文案、优惠极值、价格换行、双推荐卡/考拉E存连贯滚动和顾问 CTA 的人眼终签 |
| M01 | `m01-ia-03/01-new-top-375/390.png`、`04-two-active-assets-375/390.png`、`06-three-lead-types-375/390.png`、`08-closed-history-375/390.png` | 新客与多仓租约/三类需求/结束历史等状态均有截图；专项 11/11、浏览器双尺寸通过；平面列表存在 | 续租/退租/押金流程长内容、在租+待支付并存任务优先级和底栏图形逐态主观视觉终签 |
| O01/QUICK/BOOKING/续租 | `rc2-merge-ready-04/375/390-07-O01-confirmed-top.png`、`375/390-10-O01-payment-pending.png`、`rc2-final-vis-signoff-04/01-15*` | 自动化同 SHA SUCCESS，支付恢复/身份/续租等有双尺寸截图；不能将 QA 通过写成协议/隐私或真实支付上线通过 | 价格及费用层级、协议确认、底部按钮遮挡、状态提示与错误反馈的人眼终签 |

## 检查结论

- **FROZEN / 不应修改**：S02 保留交通路线；S5 小图；S01/S5 不强制同 DOM；M01 不恢复旧重复卡；不新增对比功能/U01。
- **自动化已验证**：完整统一回归 SUCCESS；本轮 314 PNG 中主页面标准宽各151张，另12张预期局部卡片图；抽查代表性双尺寸画面，没有发现足以授权立即重构的确定 P0/P1。
- **尚不能确认**：所有长页面多状态的视觉品质、像素级品牌图标、真实点击连续体验和人眼审美终签。当前 `human_visual_signoff=PENDING`；不是 PASS。
- 审核优先级建议：① H01 全任务状态及 NAV；② S01↔S5 双卡/单卡/无匹配；③ S02 tab 与长页；④ M01 多订单；⑤ QUICK/O01/支付恢复。
- 不新增不必要的卡片、阴影、边框，不继承历史原型视觉；发现 P0/P1 需给出源 PNG/尺寸/问题位置与可复测动作再修。

## UAT 与归并

现有私有 RC2 Netlify 站仍未发布此 SHA；SSO 配置可查但邀请账号登录与页面真实走查尚无证据。**不得因静态 ZIP 或旧站 ready 认为 #176 在线可用。**

`human_visual_signoff=false`, `online_uat_admitted=false`, `main_merge_allowed=false`, `deployment_allowed=false`, PR Draft/HOLD。

本文件提交使 PR HEAD 相比已通过的 `e275871` 只发生文档变化，严格同 SHA 声明须仍指向实际测试提交或另跑最新 HEAD。文件不是部署许可。

**下一步：RC2-CLEAN-MIGRATION-02G｜由人工对照原尺寸逐屏签核仍待确认项目；只有确认内部 UAT 专用部署授权后，才可复用独立 RC2 私站发布指定构建包。**
