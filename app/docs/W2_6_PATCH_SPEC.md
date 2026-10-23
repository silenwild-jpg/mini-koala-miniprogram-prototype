## 01\_PATCH\_Decision\_Gate

以下决策只决定对应 PATCH 的实施口径；在确认前，不以某个历史版本或当前代码值作为默认答案。

|需要确认的问题当前实现可选口径各自影响||||
|-|-|-|-|
|**G01／PATCH-01：H01 冻结主标题以哪版为准？**|R10 首屏为“一站式自助储物仓”；此前确认过“附近租个独立小仓库”。|① 以此前冻结稿为准；② 确认 R10 为新冻结稿。|① 需恢复有证据的漂移；② 保留当前标题，仅核对双入口说明。两者都涉及冻结文案，不能自动取舍。|
|**G02／PATCH-03：门店“可租 X 个”统计什么？**|S01 各店配置为 8／6／10／7／9 个；S02 按共享目录展示 8 个仓位。|① 表示详情页当前展示的可租仓位数；② 表示门店总体可租数，详情页只展示其中一部分。|① 两页数量须对应；② 两页须明确标注不同统计范围，且不能把详情页 8 个称为门店全部。|
|**G03／PATCH-03：Estimator 与门店页的路线是否从同一位置计算？**|Estimator 的安贞店推荐写约 870 米／驾车 2 分钟；共享路线数据在国贸出发条件下为 3.2 公里／驾车 8 分钟。|① 同一找仓位置；② 不同找仓位置。|① 须统一展示值；② 各页须标明出发位置，避免把两条路线解释为同一行程。|
|**G04／PATCH-04：浏览态“起价”的商品和租期口径是什么？**|S01 使用页面内门店 `base`、`baseSize`；S02 使用共享仓位目录、门店系数和租期计算。|① 起价对应当前可点开的实际仓位及明确租期；② 起价是独立的门店宣传价。|① 须能追溯到同一仓位和租期；② 须标明宣传价适用条件，不能暗示它就是详情页最低实际月租。|
|**G05／PATCH-02：组合方案和 `nomatch` 如何定义？**|Estimator 可展示组合建议；S02 没有同 ID 的组合商品。S01 的 `nomatch` 提示在部分需求下仍会出现范围内仓位。|① 组合仅为估算建议、进入 S02 后重新选实际仓位；`nomatch` 指当前演示范围确无完全匹配。② 如需维持其他含义，分别确认组合身份与“无匹配”的判定范围。|① 须明确方案转换并校正状态提示；② 须先定义用户在各页看到的是同一商品、相近方案还是不同搜索范围。|
|**G06／PATCH-07：大仓、长租是否单独触发顾问优先？**|Estimator 与 U01 均考虑企业、复杂需求及预计总租金等条件，但 S02 主要依赖传入的 `lead`；各页判断不一致。|① 仅沿用已确认的企业／复杂需求／预计总租金条件；② 大仓、长租本身也触发建议，并确认其阈值。|① 提示范围较窄；② 更多用户看到顾问建议。两者都须保留自行选仓和下单路径。|
|**G07／PATCH-08：“48 小时”约束什么？**|Q01 保存报价时写入 48 小时后的时间；首页显示“方案有效至”，但返回下单未执行真实到期判断。|① 仅是保存方案的参考期限；② 是特定报价条件的有效期。|① 文案不得暗示保价或保仓；② 须明确有效条件与到期后的用户动作，真实失效机制另留开发阶段。|

**母版文件索引**：以下代号均指 ZIP `/workspace/scratch/53d5b8456bcc/upload/Mini\\\_Koala\\\_V2\\\_7\\\_4\\\_7\\\_Complete\\\_Flow\\\_R10.zip` 内的精确文件名。

|代号ZIP 内文件||
|-|-|
|SSOT|`prototype\\\\mini\\\_storage\\\_business\\\_ssot\\\_v274.js`|
|H01|`prototype\\\\mini\\\_storage\\\_home\\\_H01\\\_Visual\\\_V2\\\_7\\\_4\\\_SSOT.html`|
|EST|`prototype\\\\space\\\_decision\\\_assistant\\\_v4\\\_5\\\_23\\\_self\\\_service\\\_synced\\\_Visual\\\_V2\\\_7\\\_4.html`|
|S01|`prototype\\\\mini\\\_storage\\\_store\\\_list\\\_s01\\\_v1\\\_27\\\_self\\\_service\\\_Visual\\\_V2\\\_7\\\_4.html`|
|S02|`prototype\\\\mini\\\_storage\\\_store\\\_detail\\\_s02\\\_v1\\\_23\\\_self\\\_service\\\_Visual\\\_V2\\\_7\\\_4.html`|
|U01|`prototype\\\\mini\\\_storage\\\_unit\\\_detail\\\_u01\\\_v1\\\_21\\\_self\\\_service\\\_Visual\\\_V2\\\_7\\\_4.html`|
|Q01|`prototype\\\\mini\\\_storage\\\_quote\\\_q01\\\_v1\\\_20\\\_self\\\_service\\\_Visual\\\_V2\\\_7\\\_4.html`|

## 02\_Batch\_A\_Implementation\_Spec

### PATCH-03｜门店事实

1. **Current State**：SSOT 定义门店名称与 `route\\\_base`；S01 另有 `stores`，EST 另有路线文字及 `planMap`；S02 浏览态固定写“8 个仓位”。
2. **Target State**：同一门店 ID 对应同一名称；相同出发位置、出行方式对应同一路线；数量按 G02 确认的口径跨页可解释。
3. **Exact Files**：SSOT、EST、S01、S02；H01 仅检查门店卡及已保存状态卡的名称、路线展示是否受影响。
4. **Exact Components / Functions / Data**：`SSOT.stores`、`route\\\_base`、`unit\\\_catalog`；EST `renderUsage()`、`renderUnits()`／`planMap`；S01 `stores`、`routeFor()`、`makeCard()`、`openStoreDetail()`；S02 `STORE\\\_PROFILES`、`renderInventory()`、路线初始化；H01 `goStoreDetail()`、`routeData`、`renderSavedAssets()`。
5. **Required Change**：在 G02、G03 确认后，减少页面内重复的门店名称与路线展示值；明确数量统计范围，并使跳转携带的门店和路线条件与页面标签一致。
6. **Must Not Change**：不改门店 ID 的既有映射，不引入实时地图或生产库存，不自行重命名业务门店。
7. **Dependency**：G02、G03；先于 PATCH-02 和 PATCH-04 的跨页验收。
8. **Acceptance Criteria**：从 EST／H01 经 S01 到 S02，同一门店名称不变；相同路线条件下数值一致；数量差异若保留，页面能说明原因。
9. **Regression Cases**：安贞店、芍药居店、建国门外店；驾车／骑行／步行切换；H01 门店卡与保存方案返回。
10. **Visual QA Cases**：375×812、390×844 检查长门店名、路线单位、数量说明在卡片及 S02 首屏的换行和遮挡。
11. **Risk**：若门店总库存与展示目录本来不是同一口径，直接统一数字会制造新的业务误解。
12. **是否涉及已冻结内容**：**是**，门店卡可见字段及部分静态名称；只允许按确认口径做局部 PATCH。

### PATCH-04｜价格表达

1. **Current State**：S01 浏览态用 `stores.base/baseSize` 生成价格范围；S02 用 `unit\\\_catalog`、门店系数和租期计算；U01 整期租金取整后再显示整数月租，二者可能无法直接相乘还原。
2. **Target State**：用户能从每个价格读出它对应的仓位、租期及金额性质；跨页查看同一实际仓位时采用同一演示计价口径。
3. **Exact Files**：SSOT、EST、S01、S02、U01；H01 仅限其门店价格展示与已确认口径冲突时。
4. **Exact Components / Functions / Data**：`SSOT.unit\\\_catalog`、`fees.management\\\_fee`；EST `pricingContractFromBase()`、`pricingMonthlyFromBase()`；S01 `storeBrowsePriceRange()`、`matchedDataFor()`、`makeCard()`；S02 `priceAtTerm()`、`browsePriceRange()`、`renderPriceBand()`、`unitCard()`；U01 `contractRent()`、`priceAt()`、`#contractTotal`、`#selectedTermPrice`、`#initialPayable`；H01 `renderHomeStorePrices()`。
5. **Required Change**：按 G04 确定浏览态起价的对应对象；统一用户可见的价格标签及来源。U01 明确月租展示值与整期租金的取整关系，使费用合计以同一整期金额为依据。
6. **Must Not Change**：不改 1–60 月范围、折扣档位、押金一个月租金、50 元管理费；不实施服务端核价。
7. **Dependency**：G04；PATCH-03 的门店身份与 PATCH-02 的实际仓位身份。
8. **Acceptance Criteria**：S01 起价可追溯到已确认的商品／租期或明确标注为另一口径；S02→U01 同仓位同租期金额可解释；用户不必用取整后的月租反推整期应付。
9. **Regression Cases**：芍药居浏览态起价；C008 6 个月；1、3、6、12、60 个月；U01→Q01→O01 与 U01→O01 的展示金额对照。
10. **Visual QA Cases**：两种手机尺寸检查价格单位、适用租期、优惠说明及总费用是否同时可读，避免价格数字压过其条件。
11. **Risk**：只替换价格数字而不处理“起价／月租／整期”语义，会保留跨页误解。
12. **是否涉及已冻结内容**：**是**，门店卡和费用字段的用户可见表达；不得顺带调整其他营销内容。

### PATCH-07｜顾问状态

1. **Current State**：EST 的 `needsAdvisor()` 使用客户与预计金额等条件；S02 `renderS02Lead()` 主要检查 `leadRoute==='strong'`；U01 `transactionRoute()` 又根据所选仓位总租金独立判断。
2. **Target State**：同一需求在 EST、S01、S02、U01 的顾问建议有连续的理由；选定实际仓位导致判断变化时，用户能理解变化原因。
3. **Exact Files**：EST、S01、S02、U01；SSOT 仅用于存放经 G06 确认的共享演示判定数据。
4. **Exact Components / Functions / Data**：EST `needsAdvisor()`、`leadLevelFor()`、`advisorReason()`、`openEstimateResult()`；S01 `leadRoute`、`openStoreDetail()`；S02 `renderS02Lead()`、`gotoU01()`、`#s02LeadCard`；U01 `transactionRoute()`、`#advisorBtn`、`goOrder()`、`goQuote()`。
5. **Required Change**：按 G06 确定的条件减少各页重复判断；展示触发顾问建议的具体原因，并在需求估算值变为实际仓位价格时同步状态说明。
6. **Must Not Change**：不强制留资，不取消自行选仓／下单，不改变已确认的销售政策。
7. **Dependency**：G06；PATCH-04 的价格展示口径，以及 PATCH-02 的需求传递。
8. **Acceptance Criteria**：不带 `lead` 直接浏览并选高总租金仓位时，S02 与 U01 的提示不产生无解释矛盾；普通需求仍可直接办理；顾问提示均说明理由。
9. **Regression Cases**：低客单短租、预计总租金跨越 2,000 元、企业／复杂需求；EST 带 `lead` 与 H01 直接浏览不带 `lead` 两种入口。
10. **Visual QA Cases**：两种手机尺寸检查顾问说明不挤占主要仓位信息，顾问按钮不与主行动形成同等视觉权重。
11. **Risk**：用估算金额替代实际仓位金额，或把“顾问优先”误写成“必须找顾问”。
12. **是否涉及已冻结内容**：**部分涉及**顾问提示与 CTA；不触及首页其他冻结模块。

## 03\_Batch\_B\_Implementation\_Spec

### PATCH-02｜需求与实际方案连续性

1. **Current State**：EST 保存需求快照，同时存在 `mockInventory()`、单仓推荐及组合展示；S01 重新匹配共享目录；S02 再推荐实际仓位；U01 通过 URL 与 `localStorage` 判断需求上下文。组合及 `nomatch` 的语义尚不连续。
2. **Target State**：需求、范围、租期、选定门店持续可见；EST 建议与 S02 实际商品的关系明确；U01 展示的仓位 ID、容量和门店来自用户实际点选。
3. **Exact Files**：EST、S01、S02、U01；引用 SSOT 现有门店及仓位目录。
4. **Exact Components / Functions / Data**：EST `saveRequirementSnapshot()`、`mockInventory()`、`renderUnits()`、`renderStoreDetail()`、`openEstimateResult()`；S01 `saveCurrentRequirement()`、`matchedDataFor()`、`nomatchDataFor()`、`openStoreDetail()`；S02 `range()`、`renderRequirement()`、`idealUnits()`、`recommendedUnit()`、`gotoU01()`；U01 `requirementContext`、`contextMatches`、`render()` 的匹配区。
5. **Required Change**：保留已建立的需求字段与来源说明；按 G05 标识估算建议和真实仓位之间的转换；使 `nomatch` 提示与当页实际匹配结果使用同一判定范围。
6. **Must Not Change**：不把 `C006+C019` 等建议组合直接写成共享目录中的可租单仓；不新增商品或改变真实仓位容量；不扩展非法参数防御。
7. **Dependency**：G05；Batch A 的门店、价格、顾问口径先锁定。
8. **Acceptance Criteria**：EST 输入 4.8m³／6 个月，经过 S01、S02 到 U01，需求和租期连续；实际选择 C008 时门店、`unit\\\_id`、4.8m³ 一致；若从组合建议转为单仓选择，页面明确说明是重新选择。
9. **Regression Cases**：标准 4.8m³ 路径、EST 大空间组合、`state=nomatch\\\&target=5\\\&term=6`、已知空间快捷入口、从 S02 返回 EST 后再继续。
10. **Visual QA Cases**：两种手机尺寸检查需求摘要、方案身份说明、仓位卡和主 CTA 的阅读顺序；状态说明不可盖过实际仓位信息。
11. **Risk**：仅传递同一个 `target`，却把不同推荐商品说成“同一方案”。
12. **是否涉及已冻结内容**：**部分涉及**页面说明及状态文案；不得调整 EST 流程结构或额外增加页面。

## 04\_Batch\_C\_Implementation\_Spec

### PATCH-01｜H01 价值表达与冻结文案

1. **Current State**：`#newHero h1` 为“一站式自助储物仓”；`#estimateBtn`、`#storeLink` 分别进入估算与找店。标题与此前冻结口径存在差异。
2. **Target State**：首屏清楚表达当前服务价值，两个入口的点击结果与说明一致；冻结文本有可核对的依据。
3. **Exact Files**：H01。
4. **Exact Components / Functions / Data**：`#newHero .hero-copy`、`#estimateBtn`、`#storeLink`；入口事件及 `goStores()` 仅作目标核对。
5. **Required Change**：先完成 G01；仅对确认存在漂移的文字和与入口结果不符的辅助说明作局部修正。
6. **Must Not Change**：双任务卡关系、模块顺序、三张门店卡、品牌证据、底部导航及现有入口目标；不自行选用历史标题。
7. **Dependency**：G01；PATCH-05 的直接找店下一步须能承接首页入口。
8. **Acceptance Criteria**：用户能从首屏区分先估空间与直接找店；冻结标题与批准稿一致；点击结果符合入口说明。
9. **Regression Cases**：新用户首页→EST；新用户首页→S01；已保存方案、已支付订单状态的首页卡片仍能使用。
10. **Visual QA Cases**：375×812、390×844 检查标题换行、双卡首屏可见性、文字与按钮点击区域。
11. **Risk**：以“优化价值表达”为由重写冻结内容或改变首页结构。
12. **是否涉及已冻结内容**：**是**；G01 未确认前不实施标题变更。

### PATCH-05｜S02 浏览态主 CTA

1. **Current State**：`renderState()` 在 `browse` 态将 `#primaryBtn` 设为“帮我估算需要多大”；点击后返回 EST。仓位卡本身可进入 U01。
2. **Target State**：直接浏览门店的用户可由主 CTA 继续查看本店实际仓位；估算仍是辅助入口。
3. **Exact Files**：S02。
4. **Exact Components / Functions / Data**：`#primaryBtn`、`#consultBtn`、`#browseEstimator`、`#inventorySection`、`#allUnits`；`renderState()` 与 `#primaryBtn` 点击处理。
5. **Required Change**：只调整 `browse` 分支的按钮文案、主次关系及目标，使其指向本店仓位区／选择动作；估算入口另有清楚的可见位置。
6. **Must Not Change**：`matched`、`nomatch`、`highvalue` 分支及仓位卡进入 U01 的现有能力。
7. **Dependency**：PATCH-03 的门店事实、PATCH-02 的仓位身份；与 PATCH-06 的下一页主行动衔接。
8. **Acceptance Criteria**：H01→S01→S02 直接浏览时，点击主 CTA 后可继续选择仓位，不会被迫返回估算；仍可主动选择估算。
9. **Regression Cases**：S02 浏览态、匹配态、无匹配态、高价值态各点击一次主 CTA；仓位卡直达 U01。
10. **Visual QA Cases**：两种手机尺寸检查底部主按钮与辅助入口可见、文案不截断，点击后定位的仓位区不被底栏遮挡。
11. **Risk**：只改按钮文字而保留回 EST 的跳转。
12. **是否涉及已冻结内容**：**是**，限 S02 浏览态 CTA；其他状态冻结交互不得顺带修改。

### PATCH-06｜U01 行动层级

1. **Current State**：`.bottombar` 同时提供 `#advisorBtn`、`#viewingBtn`、`#confirm`；正文另有 `#saveQuote`。租期未选时，“立即租用”点击后才提示先选租期。
2. **Target State**：已确认仓位与租期的用户能立即识别主要下一步；看仓、顾问、保存方案仍可找到。
3. **Exact Files**：U01。
4. **Exact Components / Functions / Data**：`.bottombar`、`#advisorBtn`、`#viewingBtn`、`#confirm`、`#saveQuote`、`#termSection`；`render()` 及四个按钮的事件处理。
5. **Required Change**：调整行动区的视觉主次与必要说明；未选租期时明确指出先选租期；保持实际行动目标与按钮文案一致。
6. **Must Not Change**：`goOrder()`、`goQuote()` 的业务去向；预约看仓和顾问能力；金额与租期规则。
7. **Dependency**：PATCH-07 的顾问提示语义、PATCH-08 的保存方案语义。
8. **Acceptance Criteria**：用户能指出一个主要下一步，并能找到另外三种行动；未选租期时知道为何不能继续；各按钮到达其承诺的页面。
9. **Regression Cases**：未选租期、已选 6 个月、普通需求、高价值需求；分别点击下单、保存方案、预约看仓、顾问。
10. **Visual QA Cases**：375×812、390×844 检查底栏按钮可点性、文案换行、价格与费用不被遮挡，以及滚动时辅助行动仍可找到。
11. **Risk**：弱化辅助行动时使看仓或顾问入口事实上不可发现。
12. **是否涉及已冻结内容**：**是**，限 U01 行动区的布局与必要文案；不重排仓位详情主体。

### PATCH-08｜Q01 保存方案与 48 小时

1. **Current State**：Q01 `#quoteValidity` 显示“48小时”；`persistQuote()` 保存 `valid\\\_until`；H01 已保存方案卡显示“方案有效至”，但现有下单路径未体现真实到期阻断。
2. **Target State**：用户知道保存了什么、48 小时作用于什么、继续下单会发生什么；页面不承诺未实现的保价或保仓。
3. **Exact Files**：Q01、H01。
4. **Exact Components / Functions / Data**：Q01 `#quoteValidity`、`.quote-trust`、`#contactHint`、`persistQuote()`、`goOrder()`；H01 `#quotedDesc`、`#quotedStatusLabel`、`#quotedValid`、`renderSavedAssets()`。
5. **Required Change**：按 G07 确认的含义同步 Q01 与 H01 的用户可见说明；保存、找回、继续下单三处使用同一口径。
6. **Must Not Change**：不新增真实到期拦截、锁价、锁仓或生产报价机制；不改变当前保存与下单跳转。
7. **Dependency**：G07；PATCH-04 的价格术语与 PATCH-06 的“保存方案”行动说明。
8. **Acceptance Criteria**：用户能回答“保存了哪些内容、48 小时约束什么、保存是否占仓、之后如何下单”；Q01 与 H01 不给出相反答案。
9. **Regression Cases**：U01→Q01→保存→H01→找回；U01→Q01→O01；U01→O01 直达路径仍可用。
10. **Visual QA Cases**：两种手机尺寸检查有效期解释在费用与按钮附近可读；首页已保存卡片的期限与状态说明不拥挤。
11. **Risk**：文案单方面把 48 小时解释为保价、保仓或真实失效承诺。
12. **是否涉及已冻结内容**：**是**，Q01 和 H01 的现有用户可见文案；G07 未确认前不改有效期含义。

## 05\_Regression\_Matrix

下表是**实施后的验收用例**，本轮没有执行运行态或视觉 QA。

|用例路径／条件重点核对对应 PATCH||||
|-|-|-|-|
|R01 标准主链|H01→EST，4.8m³／6 个月→S01→S02→C008 U01→Q01→O01|需求、门店、仓位、租期、价格、顾问状态逐页连续；保存方案可继续下单。|01–08|
|R02 直接找店|H01→S01→S02 浏览态→选仓→U01|主 CTA 推进选仓；估算入口仍可选；门店名称和路线连续。|01、03、05、06|
|R03 浏览态价格|S01 芍药居店→S02→最低价仓位 U01|起价对应对象、租期及详情价格能解释。|03、04|
|R04 组合建议|EST 大空间组合→S02→U01|清楚区分估算组合与实际点选商品；不冒称同一仓位 ID。|02、04|
|R05 无完全匹配|`state=nomatch\\\&target=5\\\&term=6`→S01→S02|提示与实际候选及匹配范围一致。|02|
|R06 顾问变化|无 `lead` 进入 S02，选择预计总租金较高的仓位进入 U01|顾问建议的出现及理由连续，同时可自行继续。|07、06|
|R07 报价找回|U01→Q01 保存→H01 找回→Q01／O01|48 小时含义、保存内容及下一步说法一致。|08、04|
|R08 行动分支|U01 分别选下单、保存、看仓、顾问；含未选租期状态|主次清楚，每个按钮的结果与文案一致。|06、07、08|
|R09 费用对照|同仓同租期分别走 U01→O01、U01→Q01→O01|月租、整期租金、押金、管理费和本次应付的展示口径一致。|04、08|
|R10 页面状态保护|S02 的 `matched`／`nomatch`／`highvalue`；H01 已保存／已租状态|非本轮目标的状态与入口继续可用，无范围外文案或结构漂移。|01、03、05、08|

**范围锁定**：以上规格不包含非法 `unit\\\_id`、服务端核价、并发库存、支付或身份安全、真实报价失效、生产锁仓及订金会计闭环。本轮未修改母版。



