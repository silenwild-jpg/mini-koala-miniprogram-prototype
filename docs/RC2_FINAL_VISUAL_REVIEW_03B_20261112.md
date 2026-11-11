# RC2-FINAL-VISUAL-REVIEW-03B｜用户最新页面规则与审计证据

2026-11-12，基线PR#121，隔离审核PR#122。

**最新裁定：S02「交通路线」页签保留**，与「可选仓位」「服务设施」共用三页签。地图示意、公交地铁/驾车/步行/骑行及导航入口保留。此裁定覆盖此前可能删除页签的历史讨论，不因原型数据未核实而移除内容。

**37个月需求变化暂停审查**，包括36→37月折扣边界。原型计价逻辑不修改，也不作为本轮通过门禁。

本轮仅补齐S02与S5在375×812、390×844真实中文浏览器中的首/中/底长滚动、S02三页签实际点击与公交地铁模式、返回仓位、S5两店各一个匹配仓位及考拉E存，随后从第一张推荐卡实际点击「立即下单」进入O01并核对既定12个月身份和整期/押金/管理费。任何真实支付和演示数据真实性验证不在范围。

上一轮RUN#43056450138已通过S02/S5首中底滚动。H01/S01长列表已另有正式截图，不重复执行。生产原型JS/CSS/DOM均不改，审计仅增加运行证据。PR保留Draft/HOLD，不合并main、不部署Netlify。中文Chrome通过不等于微信真机最终像素签收。

## 2026-11-12｜03B 同源最终运行证据

- **受测运行/提交**：[GitHub Actions #43060809344](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43060809344) = completed/success。真实受测原型和审计脚本SHA：`ab0cbba597a0de2815de7b0bee9dcd41eb8c83df`；[同源浏览器JSON/PNG artifact #13873976208](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43060809344/artifacts/13873976208)，[隔离原型包 artifact #13872868237](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43060809344/artifacts/13872868237)。
- **S02滚动**：375×812：#scroll最大滚动567px，顶0／中284／底567；390×844：540px，顶0／中270／底540。两个尺寸都无水平溢出或可见图片失效；5枚服务标签和400电话仍在。
- **S02交通路线页签**：两个尺寸都**实际点击**`交通路线`使其`aria-selected=true`；地图宽度分别343、358px，4个出行方式存在，按钮`导航到门店`可见；单击`公交地铁`后激活态和地图保留，再单击`可选仓位`回到仓位列表。PNG：`AUDIT-S02-{375,390}-traffic-route.png`、`...-traffic-transit.png`。地图为原型示意画面，**未声称第三方实时路线数据或真实导航插件接通**。
- **S5滚动**：375：#app-viewport最大滚动526px，顶0／中263／底526；390：494px，顶0／中247／底494。两个尺寸都无水平溢出或可见图片失效；S5实测为2张门店推荐卡、各1间仓位、2个下单按钮，考拉E存入口存在。
- **真实点击S5首卡「立即下单」到O01**：两个尺寸均抵达`body[data-page=o01].bridge-ready`。受测用仓需求3m³×12个月，仓位`SIM_BJ01_U03`（展示仓号A003、3.5m³）；整期租金¥3,120、月租¥260、押金¥260、管理费¥50、首次应付¥3,430，金额在同源浏览器DOM及O01截图一致。没有创建真实订单或执行支付。
- **首次交互QA失败已定位并消除**：[Run #43059959091](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43059959091)只因测试初始化未完成验证手机号而在下单前遭正常门禁拦截，不是生产UI故障；此后在测试中按规则走`requestPhone()`与`resolvePhone('success')`、设定用仓日期，重测通过。**手机号门禁在产品源码中未删除或放宽。**
- **37个月需求变化**：最终脚本**未调用37个月状态**，没有调整价格折扣档位。暂缓事项独立保留但不属于03B准入失败。
- **产物与归并**：仅改QA/文档，不改原型生产页面JS/DOM/CSS；PR#122保持Draft/HOLD，main未合并、Netlify未部署。Noto CJK Chrome截图技术验证已完成；**微信真机与全部异常态仍未终签**。

裁定：`S02/S5 NORMAL LONG-SCROLL AND NAMED INTERACTIONS = PASS`；`WECHAT DEVICE PIXEL VISUAL SIGNOFF = HOLD`；`37 MONTH BEHAVIOR = DEFERRED`。
