# RC2-MAINLINE-HANDOFF-01｜WorkBuddy 与微信原生迁移交接

**交接日期：** 2026-11-14  
**唯一可依赖的已验收业务基线：** `main` 的 `7f4231826cb9b86ee62d2b8337d609d194f42c4a`。本交接文档属于其后的治理变更，不改变上述验收事实。  
**项目性质：** Web/HTML 交互原型；尚非微信原生小程序，不是线上生产或真实订单系统。  
**交接目标：** 使用 WorkBuddy 在受控开发分支持续迭代前端演示，并为后续原生小程序迁移准备可执行任务，不在交接阶段直接移植全部旧Web DOM/CSS。

## 1. 精确版本、签收和回归证据

| 事项 | 经 GitHub / QA 核实的事实 |
|---|---|
| 业务main合并 | [PR #203](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/203) **Merged** |
| 合并后main SHA | `7f4231826cb9b86ee62d2b8337d609d194f42c4a` |
| 用户签收源SHA | `d5a4ff63e2b0cdcffb2e5be4c4e710b61497ae95`（保留） |
| 原版备用签收SHA | `41a8a079eb48049e1060512bddf71c226bfd3738`（PR #176 Draft/历史保留） |
| main原位375/390回归 | [Actions #43541417405](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43541417405) **SUCCESS**，head_sha精确匹配main |
| 主线QA证据 | [375/390证据包 #14091129750](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43541417405/artifacts/14091129750)，374文件/352张PNG |
| 主线评审构建包 | [Review Bundle #14091733330](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43541417405/artifacts/14091733330)，source_sha=main SHA、source_branch=main |
| 演示站点部署 | **本轮未部署**；三个已连接Netlify站点最近记录未发现此merge产生的新部署 |
| 微信原生/后端/真实支付 | **未实施／未做生产验收** |

本次main合并与已签收源SHA相比较，仅多 **1个main专用QA工作流和5个治理文档路径**；未增加应用运行时、视觉素材或业务脚本差异。后续改动一律基于当前main新分支，不在签收的旧整合分支上继续开发。

> 注意：部分旧构建summary携带静态 `main_merge_allowed=false`、`human_uat_signed_off=false` 等历史字段，只是生成时的冻结配置。主线真实合并及用户签收以GitHub PR #203、精确SHA、最新验收与本交接为准；`deployment_allowed=false` 的**不部署**禁令继续有效。

## 2. 从哪里打开、哪里开始改

仓库：<https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype>

| 用途 | 代码/资料入口 |
|---|---|
| 项目总控 | `docs/PROJECT_CONTROL_CENTER_01_20261113.md`（顶部2026-11-14状态覆盖下方历史快照） |
| 演示优先规范 | `docs/DEMO_FIRST_DEVELOPMENT_STANDARD_01_20261113.md` |
| WorkBuddy执行约束 | `AGENTS.md` + 本文件 |
| Web统一外层入口 | `app/central-review-02g.html?catalog=sim&page=H01` |
| 内层业务应用 | `app/prototype/parallel/core-journey-fix-01/demo/index.html?page=H01`（路由也包括S01/S02/S5/M01等） |
| 业务状态/价格/订单/模拟支付 | `app/prototype/parallel/core-journey-fix-01/demo/demo-core.js` |
| 页面渲染/统一路由 | `app/prototype/parallel/core-journey-fix-01/demo/app.js`、`central-contract.js` |
| 演示门店/仓位/场景 | `app/prototype/parallel/core-journey-fix-01/demo/fixtures.js` |
| H01 | `home.html`、`home-bridge.js`、`home-recommend-policy.js` |
| CAP / ITEMS / 双单位 | `cap.html`、`cap-bridge.js`、`items.html`、`items-bridge.js`、`space-unit.js` |
| S01 / S02 | `s01-r2-live.html`、`s01-r2-bind.js`、`app.js`中S02，`s02-central.css` |
| S5 / BOOKING / QUICK / O01 | `br04/bridge.js`、`br04/s5/index.html`、`br04/reserve/index.html`、`br04/quick/index.html`、`br04/o01/index.html` |
| M01、订单和售后 | `m01-rebaseline-01.js`、`lifecycle-contract.js`、`lifecycle-ui.js`、`demo-core.js` |
| 促销权益 | `promotion-policy.js`、`gift-term-policy.js`、`br03-policy.js`；规则参照 `docs/PROMO_ENTITLEMENT_MODEL_01_20261113.md` |
| 本地QA脚本 | `scripts/verify_rc2_*.cjs`、`scripts/verify_s5_*.cjs`、`scripts/test_promo_*.js` |
| main合并后全站QA定义 | `.github/workflows/rc2-mainline-postmerge-qa.yml` |
| 独立视觉必需检查 | `.github/workflows/proto-vis-exec-01.yml`，检查名 `Visual contract and evidence guard` |

**只读本地预览（Windows/WorkBuddy终端具备Python时）：** 在仓库根目录运行 `python -m http.server 8000 -d app`，访问 `http://localhost:8000/central-review-02g.html?catalog=sim&page=H01`。若端口/静态资源受限，修改本地预览方法，不把本地预览成功冒充GitHub Actions验收。不要从磁盘双击HTML使用 `file://` 代替HTTP。

## 3. 当前已批准的演示规则（不可自行推翻）

| 页面/领域 | 有效规则与边界 |
|---|---|
| H01 | 已批准母版B为基础；推荐第一距离最近、第二附近低价、第三**灵活运营位**；双任务入口和完整门店卡；首页与S01第三位的排序逻辑不同。 |
| CAP / ITEMS | 用户确认容量和租期后才能进入有效S5推荐；m³业务标准容量，支持㎡辅助理解；估算完成跨页保留用户输入；主按钮“查看仓位报价”。 |
| S01 | 保留搜索与底部导航；顶部仅“排序/距离/服务”三筛选；第三位置固定“考拉E存”，第四门店起紧凑展示；不提供独立价格筛选、只看单仓或顶部多余返回。 |
| S02 | “可选仓位/服务设施/交通路线”三Tab；地图导航旁电话400入口，距离在地址旁；存取时间在图片左下，服务标签与S01语义一致；符合条件可直接进入O01。 |
| S5 | 容量+租期已确定；两家推荐门店各1个匹配仓位 + E存独立运营位；前两张卡为小尺寸门店照片；需求合并编辑入口、地址可修正；**不恢复仓位对比**。 |
| BOOKING / QUICK / O01 | BOOKING创建**销售线索**而非订单；QUICK选门店/仓位、租期后进入O01；O01协议主动勾选、手机号验证门禁、整期租金主视觉/月租次级；支付成功/失败/取消/恢复均需可演示。 |
| M01 | 展示订单/资产/续租/退租/押金/发票等演示生命周期；不恢复用户否决的独立“A待支付进度”和“C待入仓/在租门店环境图”，但订单内必要的继续支付操作可以保留。 |
| 促销 | 特价仓按**仓位**生效；长租折扣、搬运、赠送租期、优惠券与销售个案赠期是不同权益类型；不自行确定未经批准的互斥/叠加财务口径。 |
| 视觉全局 | 375×812为母版、390×844并行回归；遵守VIS-GUARD，少装饰、少解释性文本；未经批准不得更改布局母版或套用历史ZIP/CSS。 |
| 明确删除 | U01独立仓位详情、仓位对比、S01独立价格筛选和只看单仓，以及M01两项否决模块不得在新设计探索中自动恢复。 |

**权威优先级：** 用户最新明确裁定 ＞ 当前已冻结文档/视觉签收 ＞ 同SHA实现/QA证据（证明事实不代表业务批准）＞ 历史文件和旧PR。遇到冲突记录来源及影响，不由执行Agent自行猜测新规则。

## 4. 重要的当前代码事实与交接风险

1. **㎡/m³口径存在业务原则与演示实现差距。** `space-unit.js` 当前使用常量 `HEIGHT=2.5` 来做输入换算，而 `AREA_VOLUME_UNIT_RULES_20261113.md` 要求实际仓高，且用户选择仓位之前不能唯一确定真实仓高。不能仅改常量就宣称完成双单位产品规则；WorkBuddy应先做只读流转审计、示意文案方案及需求定义，再定向改动。
2. **演示日期可能陈旧。** `fixtures.js` 当前可见 `demoToday='2026-10-25'`、`defaultStart='2026-11-01'`；2026-11-14时属于过去日期。先检查哪些真实界面状态受影响，再决定只更新fixture层的安全方案，绝不能散落改多页日期或破坏演示用冻结SHA。
3. **促销生产规则未封板。** 36/37个月价差、特价仓与长租折扣叠加、赠期/押金基数/退款口径等是历史审计已提出的风险；不应把当前固定演示配置宣称为真实成交政策。当前促销模型已能服务演示；工作重点是前后端边界和状态正确性。
4. **历史文档有旧状态。** 多个`20261113`审计文件仍记录“main未合并/PR #176 Draft”等当时事实。2026-11-14已合并与QA PASS的唯一当前事实以上述main SHA为准；不要因旧表格将当前状态自动回滚为HOLD。
5. **当前仓库不是微信原生工程。** HTML/iframe、`sessionStorage`、浏览器DOM及静态HTTP预览不能直接等同于微信小程序的 WXML/WXSS、原生页面栈、登录授权、地图组件、真实支付和后端订单接口。

## 5. WorkBuddy接手后优先批量执行的任务

### WB-BASELINE-01（P0，第一工作包）
**只读核验和开发环境启动**：检出main并记录精确SHA；确认统一入口、10类主要页面、统一状态源、fixtures、QA入口；本地跑一遍核心旅程；把“代码已实现/浏览器可复现/截图可比对/待后端接入”分别标注，不得从旧ZIP生成新母版。交付《WorkBuddy接手基线报告》。

### WB-DEMO-P1-01（P1，非阻塞批量改进）
在独立开发分支处理明确的用户演示风险：过期演示日期与预约路径，㎡/m³显示与返回状态，S01/S02地图和联系电话，S5两门店+E存状态，促销多权益展示与M01混合订单/支付恢复。**先出证据化差异清单，再按已批准规则做最小改动**；涉及冻结视觉的改动必须人工签收，不得以修历史审计文档为理由重构整个页面。

### WB-NATIVE-ARCH-01（P1，原生迁移设计，不等于立即上线）
拆分成：展示层(WXML/WXSS/原生组件)、导航与生命周期、需求/门店/仓位/报价的共享状态层、统一活动/权益契约、接口适配层、可替换mock数据；定义微信位置授权/拒绝/切城、手机号授权/手填+验证、地图路线、订单确认、微信支付成功/失败/取消/恢复。先完成原生工程方案与接口草案；在真实后端开发前保留mock适配器，保证产品演示连续性。

### WB-HANDOFF-BE-01（后端开发前）
按 [后端决策登记表](BACKEND_DECISION_REGISTER_01_20261114.md) 分工确认真实商品/仓位库存、有效高度、价格/活动/赠期、销售授权、订单、支付、押金、续租、退租、地图、用户隐私与客服。仅影响生产真实逻辑的缺口，不阻断已经完成的Web演示。

## 6. 交付纪律与验收

- **分支：** 新任务从最新`main`创建`workbuddy/<task-id>`或同等受控分支，且不得修改/删除原签收源或PR #176；先单任务包或同领域合并批次，不建大量空PR。
- **文件：** 应用视觉冻结、工具脚本、产品规则和后端待确认材料分开；每PR列出实际改动路径、规则来源、回滚方案、演示状态、375/390两尺寸真实截图。
- **质量：** `Visual contract and evidence guard`为main必需CI。main合并后全流程QA工作流`rc2-mainline-postmerge-qa.yml`只在打标`[RC2-MAINLINE-QA]`的main提交或手动调度时运行；普通文档改动不应重复跑浏览器测试。
- **门禁：** 自动化PASS不等于人工视觉签收；用户尚未授权部署、微信原生生产发布或真实支付。所有分支合并、权限、Netlify设置和上线需要与当时授权相符；对主线业务改动须先获明确批准。
- **成本：** 能用单个完整工作包完成的事项按“盘点→差异修复→自动化→截图→PR→验收”批量完成；只在真正的产品阻断项请用户裁定。

## 7. 可直接提供给WorkBuddy的启动指令

> 接手仓库 `silenwild-jpg/mini-koala-miniprogram-prototype` 的迷你考拉仓项目。先读取`README.md`、`AGENTS.md`、`docs/PROJECT_CONTROL_CENTER_01_20261113.md`、`docs/RC2_MAINLINE_HANDOFF_01_20261114.md`、`docs/BACKEND_DECISION_REGISTER_01_20261114.md`和`docs/DEMO_FIRST_DEVELOPMENT_STANDARD_01_20261113.md`。以当前main已验收业务SHA `7f4231826cb9b86ee62d2b8337d609d194f42c4a` 为参考，先确认HEAD是否有后续纯治理提交；**禁止把HTML原型误认为微信原生代码**。先执行 WB-BASELINE-01 只读核验、页面与状态契约盘点、375/390证据对照，输出具有精确Git SHA的报告和P0/P1差异清单。不要擅改冻结视觉、不要删除历史分支、不要直接合并main、不要部署。涉及真实库存、折扣、促销叠加、赠期、押金、支付和接口的未确定事项纳入后端清单，不因此削减前端演示路径。未经要求，不启动大规模原生重写；后续以独立开发分支小批量实施。

---

**当前裁定：** Web Demo主线已合并、同SHA全站自动化通过；本文件为WorkBuddy交接入口。后续任何新SHA的业务改动均需重新验证其对应范围。