# PRICE-INTEGER-INTEGRATION-02｜四页隔离归并
2026-11-11。PR#118 Draft/HOLD。中央价格基线PR#117；H01源PR#115、S01源PR#99、S02源PR#104、S5源PR#101。禁止main合并和Netlify部署。

## 阶段A｜S01源码局部归并（非终签）
- S01来自PR#99：完整需求两店单仓、仓号＋容量＋适用文案、公开价可排序、搜索筛选、固定考拉E存、375/390参考布局、全局促销服务标签语义；保留原唯一unit_id，不将展示仓号当正式SKU。
- 核心PR#117金额计算不覆盖；新增 atomic requirementReady API；H01推荐的展示价整数、排序数值保留两位精度。S02待后续函数级归并，暂不称最终通过。

## 阶段B／C／D｜跨页代码定向归并记录

- **S01 来源PR#99**：`s01-r2-bind.js`、`s01-reference-layout-02.css`、`s01-vis-decision-02.css`、`br03-policy.js`、`fixtures.js`（仅新增展示仓号）、局部`app.js`、统一标签基础样式、`presentation-policy.js`语义分类。S01完整需求前两家单仓、第三E存、第四位紧凑、三筛选、报价整数等保持。
- **S02 来源PR#104**：将其`unitRow—renderS02`函数段摘取到S01 app，不覆盖S01推荐与匹配函数；仓位行补上S01同源展示仓号。保留导航右侧400拨号、图片左下存取时间、地址前公里数、最多5个标签、容量不足改入口和组合仓提醒。清除重复促销标签。
- **H01 来源PR#115**：首页营销母版HTML、状态策略/实现JS/CSS、待支付订单3小时续接、到期退租及访问资格边界；保留H01第三卡灵活运营位（不同于S01固定E存）及已有布局。价格数值排序保持原精度、用户显示整数。
- **S5 来源PR#101＋#117**：完整双店单仓、E存独立位、无对比，仍按中央整元折后月租×N个月、押金1月、首次¥50管理费；同源标签类和A003等展示仓号就地复用，未改卡片结构、价格费率或CTA。
- **共享关键点**：整个候选只有一份`demo-core.js`和`presentation-policy.js`，不是每页套不同旧基线。核心在整数价基础上合并“容量+租期原子确认”及H01 3小时待支付恢复。没有把仓号替换成商品ID。

## 缺陷发现与修复（证据与来源）
1. 初测 [GitHub Actions #43027869766](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43027869766)：S01/S02/S5、H01多数状态通过，**H01到期租约2个尺寸失败**：`lifecycle-ui.js`旧EX01表单仅支持active，首页到期任务导航实际需要expired。按PR#115有效规则修正`['active','expired'].includes(v.lease_status)`，没有放宽断言。
2. [#43028392968](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43028392968) **completed/success**：S01/S02/S5及H01 20态×375/390 **40/40 PASS**。
3. 人工对照截图发现S02重复「特价仓」及S5仍写「独立仓」。函数级消除重复促销，S5单仓使用与S01/S02相同仓号，补充各自浏览器断言。[#43028861159](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43028861159) **completed/success**。
4. 新增S01→S02→S5→O01跨页共享状态与真实S5下单点击测试；最终成功版本如下。

## 最终同SHA QA（2026-11-11）

- **受测代码SHA** `5533d1aea3194ae06714fe76830d8e8a858840c9`
- **GitHub Actions** [#43029827278](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43029827278) **completed/success**
- **浏览器证据** [artifact #13859173520](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43029827278/artifacts/13859173520)，含4页面375×812／390×844独立状态截图、H01 20状态×双尺寸、2个跨页流程的四阶段截图、JSON和SHA manifest。
- **H01** 20态×2宽度＝**40/40 PASS**；正常营销、新需求、待支付、身份核验、在租、退租、押金等状态；原有3小时订单、门禁及按钮任务回放。
- **S01** 375/390、1／12／37／60个月、五城与大额价格压力、匹配前两店单仓、固定E存、第四位紧凑、仓号/容量/完整用途/金额与按钮布局，两尺寸PASS。
- **S02** 默认、已选需求、服务设施、地图、组合仓与小仓容量不足，两尺寸PASS；44/48px热区，标签稳定5个且无重复，地图右侧400拨号保持。
- **S5** 两店、一店、未确认租期、无匹配、37个月 × 375/390 = **10/10 PASS**；整期整数价／月租×月份／押金／券后金额、S5展示仓号、CTA与无对比回归。
- **跨页共享状态** 两尺寸 **2/2 PASS**：在同源候选中从S01设置3m³×12个月，走公共`openStore`路由检查S02，再走公共`navigate('S5')`路由，最后**实际点击S5「立即下单」进入O01**；具体单仓 `SIM_BJ01_U03`（展示仓号A003、3.5m³），各页同源整期 `¥3,120`，月租 `¥260`，押金 `¥260`，管理费 `¥50`，首次应付 `¥3,430`；O01正确继承仓位ID、3m³需求及12个月租期。**此测试中S01→S02和S02→S5使用公开导航API，不宣称这两跳均由真实界面按钮点击**。
- H01、S01、S02、S5、O01截图经过人工并排查看，没有发现跨页金额或展示仓号冲突。门店图裁剪、首页视觉基调仍按各页面批准母版，并无本轮强制统一卡型。

## 继续HOLD
- Issue [#106](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/issues/106)：36→37个月折扣边界下整期可能倒挂，本任务未调整折扣档位。
- S02「交通路线」页签的历史保留/删除决策仍待专门裁定，不借本次归并擅自删改。
- H01当前9px标签相对S01 11px、S02 12px，及主价强调色等仍需`VIS-SYSTEM-04B`跨页字体/色义验证；不得破坏首页母版或为一致性新增冗余容器。
- 上线环境真实地图、支付、库存、促销及手机号接口**不在本次演示原型的验证范围**，不应作为原型完成的阻塞项。
- 真实微信真机与用户最终像素级视觉签收尚未发生。**PR#118仍Draft/HOLD；未合并main、未部署Netlify**。
