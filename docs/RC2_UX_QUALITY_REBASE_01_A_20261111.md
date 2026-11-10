# RC2-UX-QUALITY-REBASE-01｜批次A 全站独立审计记录（2026-11-11）

**阶段结论：批次A已执行；页面构建可运行，系统性视觉及决策体验不予终签。保留PR#96 Draft和Netlify当前发布。**

## 证据身份

- 当前业务集成候选 PR#96 SHA：`e435bb25eddc8a8ad4c84427ca9883d4ec3e9c16`。
- GitHub预发布/Netlify UAT发布代码的相同`app/` tree：`4fbf5eefccbc9ee3e05a969b88334314263a3e79`。
- UAT deploy：`6af3442d0a6cc685b78ebe74`，ready，团队SSO不变。
- 独立审计分支：`audit/rc2-ux-quality-rebase-01-20261111`。GitHub [Actions Run #42922971801](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/42922971801) **completed/success**；[artifact #13812422054](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/42922971801/artifacts/13812422054) 保存36张全新离线同源Chromium截图与DOM测量JSON。
- 375×812与390×844各18个状态，覆盖 H01、S01筛选/无结果、S02、CAP未选/已选、ITEMS、S5无容量/匹配、BOOKING未填/回执、QUICK、O01协议/支付弹层/结果、M01。36/36取证成功，本轮未触发水平溢出。
- GitHub差异审计确认**只新增独立脚本及工作流两文件，没有修改任何app代码**。本报告不是Netlify登录后的真人截图或真机验收。

## 双视角交叉判断

- **用户决策视角**：S5两家推荐不便首屏比较；S5租金`¥3,120`→O01首次应付`¥3,430`的押金管理费需要更早解释（两者金额按现有口径并不冲突）；ITEMS默认空态使首次选物多一步；BOOKING本机保存尚未形成真实销售闭环。
- **视觉与工程视角**：页面视觉体系在H01/S01/S5/CAP/ITEMS/BOOKING/QUICK间差异明显；S01标签10.5px、地址/距离11.5px，H01多处9–9.5px标签；375px S02有14个、S5匹配有10个可见控件任一轴小于40px（启发式测量，不等于已发生误触）；多个历史CSS覆盖及预约页面使用比例缩放存在技术维护风险。
- **积极确认**：S01平面化改版比旧大图卡更便于快速浏览；九个主要页面均有可用视觉结果；O01不会真实扣款，结果也未再外露内部订单ID；无新P0级全屏空白/横向溢出证据。

## 问题优先级（建议，需结合高保真方案裁定）

| 编号 | 级别 | 主题 | 直接证据 |
|---|---|---|---|
| UX-A-01 | P1 | S5比较效率不足，首屏几乎仅一家 | 10/28 S5-matched |
| UX-A-02 | P1 | S5整期租金到O01首次应付的费用信息衔接 | 10 S5、14 O01 |
| UX-A-03 | P1 | S02/S5操作热区偏小 | 05 S02、10 S5及JSON |
| UX-A-04 | P1 | ITEMS首次选物路径多一步 | 08 ITEMS |
| UX-A-05 | P1 | 全站跨页面视觉规范不统一 | 01/02/08/10/11/13等 |
| UX-A-06 | P1（正式业务） | BOOKING仅本机保存，没有真实CRM交付 | 12 BOOKING |
| UX-A-07/08 | P2 | S01/H01小字号及标签辨识度 | 01/02 S01/H01 |
| UX-A-09 | P2 | QUICK缺必填时CTA仍显示强可点击态 | 13 QUICK和bridge代码 |
| UX-A-10/11 | P2 | CAP、M01空态信息密度 | 06 CAP、18 M01 |
| UX-A-12 | P2 | 历史CSS/缩放可维护性风险 | styles/visual-align/bridge |

**已确认事实**：页面截图、字体和控件尺寸、代码行为、价格差异与CRM仅本机状态。**设计判断**：比较成本、视觉统一性、内容理解负担。**未验证**：用户流失、真机误触、弱网性能、微信真实支付、CRM与库存。

## 批次B执行边界

**下一编号：`RC2-UX-QUALITY-REBASE-02`。**

1. S01/S02/S5统一门店与仓位决策系统：减少S5过大横幅占比，使两家门店可快速比较；保留真实门店照片、排名、库存、组合仓规则和整期租金主价。
2. 统一报价信息层级：主价整期租金，月均次级；将押金（折后月均）及管理费50元的影响在下单前清晰表达，不写冗余说明。
3. CAP/ITEMS统一输入和需求回流，ITEMS常见物品可直接选；统一H01、S01、S5、预约和下单页面的字体/间距/按钮/弹层视觉契约。
4. 设计评审允许推翻历史页面布局，但不无证据修改已裁定业务价格、导航及演示状态。先完成2个高保真方向和375/390对照，再实施单候选集中整改，严禁低保真重建或继续堆叠覆盖层。
5. 本审计期间不改线上UAT，不修改main，不替换实际当前发布。

## 原始检查入口

- [全部36张截图和JSON的GitHub Artifact](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/42922971801/artifacts/13812422054)
- GitHub流水线：[`rc2-ux-quality-rebase-01-a.yml`](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/blob/audit/rc2-ux-quality-rebase-01-20261111/.github/workflows/rc2-ux-quality-rebase-01-a.yml)
- 采集脚本：[`audit_rc2_ux_quality_rebase_01_capture.cjs`](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/blob/audit/rc2-ux-quality-rebase-01-20261111/scripts/audit_rc2_ux_quality_rebase_01_capture.cjs)

> 附件中的中文详细审计报告逐项对应36张截图、两种尺寸和DOM检测结果。不得将技术动作的PASS等同于整体视觉签收。
