# E · 留资旅程 + 全站系统状态 / 登录 / 隐私 横向检查（独立评审）

评审日期：2026-11-20。只读评审，未改任何工程文件。路径均相对 `/srv/dt/product/tmp/wx_main/wx-native/miniprogram/`。

## 1. 覆盖情况

**预览图**：`/srv/dt/product/tmp/pv/rv/E_lead_sys/` 共 15 张，全部看过：al14_booking_form、al15_booking_errors、al16_booking_failed、al17_booking_unknown、al18_booking_done_offhours、al19_booking_advisor、al20_business_step1、al21_business_step2、al22_business_failed、al23_transport_pre、al24_transport_form、al25_support、al26_store_visit_sheet、al28_booking_offline、rv29_estore。

**没有图、只能靠源码判断的状态**：修改联系电话弹层、短信验证弹层、登录层全部状态、企业页成功弹窗 / 结果未确认 / 已撤回 / 草稿恢复、运输「选择关联订单」「已提交」、联系顾问「已提交」「订单咨询」、看仓弹层成功 / 失败 / 未确认、预约记录页、消息页。这些条目的结论都来自读代码，没有渲染证据。

**读过的源码**（全文）：
- pkg-lead：booking、business、estore、transport、support 的 js / wxml / json；components/lead-phone、lead-ack
- components：mk-visit-sheet、mk-login-sheet、mk-sys-state
- services：auth、routes、api、page-data、subscribe、state、identity、mock-adapter、http-adapter、mock-ext/lead
- core：config、config-lead、lead、requirement、matching（前 30 行）、config-account
- i18n/lead 全文；i18n/trade 的 login 段；i18n/account 的 mine.groups
- pkg-account/needs（js + wxml 前 40 行）、messages/index.js、referral/index.js、pages/mine/index.js、pkg-after/common.js、app.js、app.json

**横向检查的做法**：用脚本对 36 个页面逐页统计 json 标题、下拉刷新、onShareAppMessage、mk-sys-state、onRetry、登录守卫、登录层，并核对 routes.js 与 app.json、所有跳转 URL 与目标页 onLoad 读取的参数。其余 30 个页面的 js 只读了与这些项相关的片段（onLoad / onShow / refresh / 登录处理），**没有逐行通读**。

**规则与冻结稿**：AUTH-PRIVACY-01、微信平台规则核对两份全文；开发交接 v1.0 的 §4.1、§4.9–4.12；PENDING_RULINGS.csv 全部 45 条；冻结稿 w3 / w5 / w6 / w7f / w9-auth / w26-sub 里与留资相关的段落（按关键句检索，不是全文）。

**辅助**：`python3 tools/static_check.py miniprogram` 结果 `errors: []`（36 页、28 组件、670 个事件处理函数、占位符 0）。

**没做的**：没有在微信开发者工具或真机运行；逻辑类结论是读代码推出来的，没有执行验证。

## 2. 走查结论

| 步骤 | 能否走通 | 说明 |
|---|---|---|
| 预约用仓表单 | 能 | 位置、电话必填，其余可选；带入全站需求的容量与租期（al14） |
| 校验报错 | 能 | 位置、电话各有行内报错加轻提示（al15） |
| 提交失败 | 能 | 色条卡「重试提交」，底部主按钮也可再提交（al16） |
| 结果未确认 | 能，有瑕疵 | 同一 request_key 核对不重复建单；但此时表单仍可编辑，改动不会生效（E-07） |
| 非服务时段受理 | 能 | 结果页文案、服务时段句、需求编号与规则一致（al18） |
| 断网 | 能 | 整页断网态加「重新加载」（al28）；仅带意向门店时才会出现，见 E-08 |
| 顾问咨询模式 | 能，有缺陷 | 手填电话与「使用微信手机号」并存，取值有覆盖问题（E-03）；未登录提交后看不到记录（E-04） |
| 企业用仓两步表单 | 能 | 步骤、摘要卡、草稿恢复、修改已有需求都有（al20、al21） |
| 企业提交失败 | 能 | 「重试提交」可用（al22） |
| 企业结果未确认 | 第二次仍超时会卡死 | 自动核对只做一次，之后无任何可点操作（E-01） |
| 考拉E存介绍 | 能 | 纯说明页，底部进顾问表单并带来源（rv29） |
| 运输（下单前） | 能 | 地址、日期、电话校验齐全（al23）；提交后记录无处再看（E-05） |
| 运输（已下单） | 能，有缺口 | 有已付款订单时只能选旧订单，无法为正在下的新订单预约（E-06） |
| 联系顾问 | 能 | 空内容报错（al25）；提交后「查看预约记录」里没有这条（E-05） |
| 门店详情看仓弹层 | 能 | 已登录可留空用登录号（al26）；成功、失败、未确认三态在代码里都有 |
| 联系电话短信验证 | 能，有缺陷 | 发过验证码后关掉再开，发送按钮卡死（E-02） |
| 生成预约记录和消息 | 能，有缺陷 | 预约 / 顾问 / 企业 / 看仓各落一条记录和一条消息；看仓记录套用了预约卡的字段与操作（E-09） |

## 3. 发现列表

### 3.1 留资旅程

| 编号 | 严重度 | 类型 | 页面 / 状态 | 问题 | 证据 | 置信度 | 建议 |
|---|---|---|---|---|---|---|---|
| E-01 | P1 | 缺陷 | 企业用仓 · 结果未确认 | 回执超时后只自动核对一次（`_rechecked` 置真后不再重置）。第二次仍超时，页面停在「提交结果暂未确认」：提示条没有链接，「上一步」「下一步」「提交」全部禁用，`onRetrySubmit` 只认 failed。用户只能退出页面；草稿没清，回来后用新 key 再提交可能重复建单。演示数据的超时是一次性的，所以演示里不会出现 | 无图；pkg-lead/business/index.js:85、163、185–189、193；index.wxml:17、80–81 | 高（读代码） | 给未确认态加「核对提交结果」链接（预约页已有同样做法），并在成功或编辑后重置 `_rechecked` |
| E-02 | P2 | 缺陷 | 修改联系电话 · 短信验证；登录层 · 短信登录 | 倒计时没走完就关闭弹层（或验证成功），只停了计时器，`countdown` 和按钮文字不归零。再次打开时按钮停在「NNs 后重发」，`onSend` 因 `countdown > 0` 直接返回，本页内再也发不出验证码。登录层是同一写法，属全站问题 | 无图；pkg-lead/components/lead-phone/index.js:32–33、37、44、51；components/mk-login-sheet/index.js:24、55、89 | 高（读代码） | 打开弹层时把倒计时清零，或关闭时不停计时器 |
| E-03 | P2 | 缺陷 | 预约用仓 · 顾问模式 | 手填框和「使用微信手机号 / 已验证号码」同时出现（al19），两者写同一个 `_contact`，后写的覆盖先写的。未登录时先手填号码、再点微信登录：登录组件发 `change{phone:''}` 把手填号清掉，输入框里仍显示手填号，实际提交的是登录号 | al19_booking_advisor；pkg-lead/booking/index.js:61、116–117；index.wxml:37–38；lead-phone/index.js:24 | 中（读代码，未运行） | 两个来源分开存，明确优先级，并在界面上只显示一个生效号码 |
| E-04 | P2 | 缺陷 | 顾问模式 / 看仓弹层 · 未登录手填电话提交 | 未登录用手填号可以提交成功，结果页给「查看预约记录」，但记录接口对未登录返回空表，预约记录页显示「暂无预约记录」，也没有登录提示；对应消息同样看不到 | 无图；services/mock-ext/lead.js:25、45–48、139；pkg-account/needs/index.js:6、34；components/mk-visit-sheet/index.js:1、41 | 中 | 未登录提交成功后不给「查看预约记录」，或在记录页给登录入口并说明 |
| E-05 | P2 | 缺陷 | 联系顾问 · 已提交；运输 · 下单前已提交 | 联系顾问提交后主按钮是「查看预约记录」，但预约记录只列预约 / 顾问 / 企业 / 看仓四类，留言不在其中。下单前的运输预约不关联订单，离开结果页后没有任何页面能再看到它。冻结稿也是这个按钮，所以是沿袭下来的缺口 | 无图；pkg-lead/support/index.wxml:7；pkg-lead/transport/index.js:61–62；services/mock-ext/lead.js:128、138、160 | 高（读代码） | 让记录页收这两类，或把按钮换成去得了的去向 |
| E-06 | P2 | 规则待定 | 运输 · 从确认订单页进入 | 确认订单页的运输入口不带参数。只要用户有任意一笔已付款订单，页面就进「选择关联订单」，只列旧订单，没有「不关联订单 / 为新订单预约」。老客户下第二单时无法做下单前预约。冻结稿同样如此 | 无图；pkg-trade/confirm/index.js:153；pkg-lead/transport/index.js:33–35；index.wxml:16–21 | 中 | 请业务确认：下单流程里进入时是否应直接进下单前表单 |
| E-07 | P2 | 缺陷 | 预约用仓 · 结果未确认 | 未确认态下字段仍可编辑（al17），但「核对提交结果」用旧 key 取回的是原记录，改动被静默丢弃。企业页此态是锁表单的，两页不一致 | al17_booking_unknown；pkg-lead/booking/index.js:114、128；services/mock-ext/lead.js:110 | 高（读代码） | 未确认态锁定表单，与企业页一致 |
| E-08 | P2 | 缺陷 | 预约用仓 · 带意向门店 | 取意向门店失败（门店不存在或接口失败）时整页进失败 / 断网态，表单不可用；门店不存在时重试永远失败。意向门店只是表单上的一张卡，不该挡住留资 | al28_booking_offline；pkg-lead/booking/index.js:52–56；services/mock-adapter.js:26–29 | 中 | 取不到门店时降级为不带门店的表单 |
| E-09 | P2 | 缺陷 | 预约记录 · 看仓记录 | 看仓线索套用预约卡：明细行显示「容量待补充 · 租期待补充」（看仓不问租期）；操作是「撤回 / 修改地址与备注」，而它的地址是门店地址，改了就把门店地址改掉；备注改了也不显示（该行被日期时段占用）。卡片上没有门店名 | 无图；pkg-account/needs/index.js:17–27、44、51；services/mock-ext/lead.js:67、150–157 | 中（读代码，无图） | 看仓卡单独一套字段与操作，显示门店名、日期、时段 |
| E-10 | P2 | 缺陷 | 预约用仓 / 企业用仓 · 容量 30m³ 及以上 | `matching.salesOnly` 已改为恒返回 false（11-20 规则：达到 30m³ 只提示）。连带结果：预约页手填 35m³ 不出「大容量需求建议联系专属配仓顾问」（al19），只有点「30m³ 及以上」快捷项才出；企业页自定义 35m³ 显示「找仓时按 35m³ 匹配」，`salesOnly`、`browseSales`「30m³ 及以上由顾问配仓，请直接提交需求」、成功弹窗的「知道了」分支都成了走不到的代码。企业页头部注释也还是旧规则 | al19_booking_advisor；core/matching.js:7–8；core/lead.js:51；pkg-lead/booking/index.js:48、96、102；pkg-lead/business/index.js:9、73、123–126、172 | 高（读代码） | 提示改用 `largeCapacity`；清掉旧分支与旧文案 |
| E-11 | P2 | 缺陷 | 预约用仓 · 订阅消息 | 文件头写「预约模式点提交时请求订阅消息」，实际 `onSubmit` 没有调用 `subscribe.request`，直接传 `{accepted:false, asked:false}`。结果页的「已开启微信通知」「开启通知」两句永远不出现。模板 ID 现在为空，所以当前没有可见差别；模板填上后就与 §4.10 和冻结稿 w26-sub 不符 | 无图；pkg-lead/booking/index.js:6、135–136、142；core/config.js:57；交接 v1.0 §4.10 | 高（读代码） | 在点按回调里先请求订阅再提交 |
| E-12 | P3 | 建议 | 预约 / 企业 · 表单底部说明 | 表单底部固定写「提交后预计 10 分钟内与您联系」，非服务时段也这样写，提交后结果页却是「顾问上班后将优先联系您」。冻结稿原文如此；联系顾问页用的是两种情况都说的那句 | al14、al21；i18n/lead.js:63、86 | 中 | 改用 `ack.both`，或按当前时刻取句 |
| E-13 | P3 | 建议 | 预约用仓 · 结果页 | 没填的可选项显示「—」（al18 的预计用仓时间、存放物品） | al18_booking_done_offhours；pkg-lead/booking/index.js:153–157 | 高 | 隐藏空行或写「未填写」 |
| E-14 | P3 | 缺陷 | 预约用仓 · 顾问模式 · 修改联系电话 | 顾问模式下弹层说明仍写「只修改本次预约的联系电话」，应为「咨询」 | 无图；pkg-lead/booking/index.js:26、47；i18n/lead.js:16–17、40 | 高（读代码） | 顾问模式传 `whatBusiness` |
| E-15 | P3 | 建议 | 运输 · 已下单 | 已付款订单的表单上方仍是「下单前即可预约运输 / 搬运……不计入本次应付」（al24），与当前场景不符。冻结稿原文如此 | al24_transport_form；pkg-lead/transport/index.wxml:24；i18n/lead.js:118 | 高 | 已下单态换一句 |
| E-16 | P3 | 缺陷 | 运输 · 提交 | 接口返回订单不存在（field=order）时既不提示也不标错，按钮恢复后无任何反馈；成功后表单不清空、无幂等 key，可重复提交同一条；日期不限上限，也不校验是否在租期内 | 无图；pkg-lead/transport/index.js:61、66–69；index.wxml:34 | 中 | 补提示；成功后清空 |
| E-17 | P3 | 缺陷 | 门店详情 → 运输 | 跳转带 `?store=`，运输页只读 `order`，门店信息丢失，线索不带门店 | 无图；pages/store/detail.js:162；pkg-lead/transport/index.js:24 | 高 | 读取并写入线索 |
| E-18 | P3 | 缺陷 | 联系顾问 · 订单咨询；运输 · 指定订单 | 两页都支持 `?order=`，但全工程没有任何入口带这个参数（订单详情、任务卡都没有去这两页的链接）；消息里的「查看运输预约」也不带订单号。「订单咨询」态实际到不了 | 无图；pkg-lead/support/index.js:19；pkg-account/messages/index.js:43；全工程检索 routes.SUPPORT / routes.TRANSPORT | 高 | 订单详情加入口，或删掉该态 |
| E-19 | P3 | 建议 | 看仓弹层 | 「待电话确认」同时出现在日期快捷项和时段选择里（al26）；可选「今天」加已过去的时段；通用提交失败句显示在「意向仓位与容量」的报错位 | al26_store_visit_sheet；components/mk-visit-sheet/index.js:19、54；index.wxml:24 | 中 | 合并一处；失败句放按钮上方 |
| E-20 | P3 | 建议 | 企业用仓 · 成功弹窗；考拉E存 | 服务时段内的成功弹窗也显示「服务时段：每日 9:00–20:00」，E存页底部小字也带这句；§4.9-2 写这句只在非服务时段结果、30m³ 顾问卡、联系顾问页出现。冻结稿的弹窗与此实现一致，属规则与冻结稿之间的出入 | rv29_estore；pkg-lead/business/index.js:176；i18n/lead.js:114；交接 v1.0 §4.9-2 | 中 | 请业务定以哪份为准 |
| E-21 | P3 | 建议 | 考拉E存 → 顾问表单 | 进入的表单标题是「顾问咨询」，没有任何 E存 标识；流程说明写「填写地址、物品和预计存放时间」，表单里位置是选填 | rv29_estore、al19；pkg-lead/estore/index.js:13；i18n/lead.js:105 | 中 | 表单带一行来源说明 |

### 3.2 全站系统状态、登录、隐私、路由

| 编号 | 严重度 | 类型 | 页面 / 状态 | 问题 | 证据 | 置信度 | 建议 |
|---|---|---|---|---|---|---|---|
| S-01 | P2 | 规则待定 | 登录层 · 微信手机号按钮 | 按钮用 `getPhoneNumber\|agreePrivacyAuthorization`，点一下就同时向微信同步「已同意隐私指引」。登录层里只有《注册协议》的勾选和链接，没有隐私保护指引的名称或入口（全工程只有个人信息页调用 `wx.openPrivacyContract`）。与 AUTH-PRIVACY P03（提供可阅读的完整隐私指引）、P06（隐私同意与注册协议分别表达）不符 | 无图；components/mk-login-sheet/index.wxml:16、37–41；pkg-account/profile/index.js:94–95；AUTH-PRIVACY-01 §3.1 | 中，需真机确认微信此时是否仍弹官方隐私框 | 登录层加隐私指引链接，或去掉耦合写法交给官方弹窗 |
| S-02 | P2 | 缺陷 | 全站 · 登录态失效 | 真实接口返回 401 时适配器给 `UNAUTHENTICATED`，但 `pd.load` 只区分 NETWORK 与其他，页面显示「加载失败 · 服务暂时不可用」加无用的重试；本机 `session.loggedIn` 不清。只有消息页和租后公共取数单独处理了这个码。AUTH-PRIVACY M07、验收用例「会话过期」没有覆盖。演示数据下不会出现 | 无图；services/page-data.js:6–10；services/http-adapter.js:9；pkg-account/messages/index.js:34；pkg-after/common.js:19 | 中（接真实接口后才触发） | 统一处理：清登录态并打开登录层 |
| S-03 | P2 | 规则待定 | 全站 · 转发 | 36 页里只有门店详情和推荐有礼定义了 `onShareAppMessage`；首页、附近门店、考拉E存、企业用仓等都不能转发。交接文档没有写哪些页应可转发 | 脚本统计；pages/store/detail.js:57；pkg-account/referral/index.js:24 | 高（事实），是否算缺陷待定 | 请业务定可转发页清单，至少首页 |
| S-04 | P2 | 缺陷 | 推荐有礼 · 转发与复制 | 转发路径是首页加 `?ref=<邀请码>`，首页和 app.js 都不读 `ref`，邀请关系丢失；「复制分享链接」复制的是 `/pages/home/index?ref=…` 这样的内部路径 | 无图；pkg-account/referral/index.js:20–24；全工程检索 `ref` 无读取处 | 高（读代码） | 活动上线前补落地读取；复制内容换成用户可用的东西 |
| S-05 | P3 | 建议 | 登录守卫 · 回到原目标 | 未登录直达受限页会被带到「我的」或仓位推荐并打开登录层，登录成功后停在落点页，不回原目标。这符合 D-198 的写法；但从订阅消息、分享卡片直达订单详情等页的用户，登录后要自己再找一次 | services/auth.js:24–34、44–51；交接 v1.0 §4.1-3 | 高 | 记下原目标，登录后跳回 |
| S-06 | P3 | 缺陷 | 首页 · 场景卡 → 估算页 | 跳转带 `?scene=<序号>`，估算页 `onLoad` 不收参数，六个场景卡进去结果一样 | pages/home/index.js:92；pages/estimate/capacity.js:27 | 高 | 读取参数或去掉 |
| S-07 | P3 | 缺陷 | 开票抬头页 · 标题 | 页面 json 标题「开票抬头管理」，routes.js 的页面索引写「开票抬头」，「我的」入口叫「发票与抬头」，三处不一致 | pkg-account/ent-titles/index.json；services/routes.js:39；i18n/account.js:19 | 高 | 统一一个名字 |
| S-08 | P3 | 建议 | 全站 · 下拉刷新 | 开了下拉刷新的 10 页：首页、附近门店、订单、消息、实名、入仓指引、续租、退仓、押金、发票。订单详情、预约记录、我的、电子合同、找仓进度没有，靠 onShow 重取。订单详情是会等状态变化的页，停在页内时没有手动刷新手段 | 脚本统计（各页 json 与 js） | 高 | 订单详情、预约记录补下拉刷新 |
| S-09 | P3 | 建议 | 全站 · 断网与超时 | 断网只靠接口返回 NETWORK 判断，没有监听网络变化；`TIMEOUT` 只有演示适配器会给，真实适配器把超时也归为 NETWORK，留资页的「结果未确认」分支接真实接口后走不到 | services/http-adapter.js:13；services/mock-ext/lead.js:133；services/api.js:3 | 中 | 真实适配器区分超时 |

**核对后没有问题的项**（如实记录）：
- routes.js 的 35 条路径全部存在于 app.json；app.json 多出的 `pkg-dev/lab/index` 由 services/demo.js 引用，属演示工具。全工程没有手写路径字符串，没有指向不存在页面的跳转。
- 受限页清单（确认订单、订单详情、续租、退仓、押金、发票、电子合同、实名）与 §4.1-3 的八项逐一对应；接口层同样拒绝未登录请求（services/api.js:8–11）。其余账户页（消息、优惠、个人信息、企业三页、推荐、找仓进度、订单列表）都有各自的未登录态和登录层。
- 三态：除考拉E存、协议页、演示工具三个不取数的页面外，33 页都有 mk-sys-state 和 onRetry。
- 各页 json 标题除 S-07 外与页面索引一致；首页用自定义导航栏，没有标题属正常。预约记录页标题「预约用仓」符合 §4.9-7。
- app.json 已声明 `__usePrivacyCheck__`、`requiredPrivateInfos: getLocation`、位置用途说明；没有自建隐私弹窗；协议勾选默认不勾；微信取号失败与额度不足（1400001）隐藏微信按钮转短信；用户拒绝留在登录层可「暂不登录」；号码冲突不合并。这些与两份规则文档一致。

## 4. 做得对、不需要改的

1. 预约页用同一个 request_key 做重试和核对，回执超时不会重复建单；看仓弹层连原始载荷一起复用，做法更稳（booking/index.js:128、133；mk-visit-sheet/index.js:38–46）。
2. 受理文案按提交时刻取，服务时段内外两句、服务时段句的出现位置在预约结果页上与 D-149 一致（al18）。
3. 「修改联系电话」只改本次线索、不换登录手机号，弹层里写明了这一点，与 D-126 和 AUTH-PRIVACY M09 一致。
4. 企业页草稿存本机并记住步骤，修改已有需求、需求已撤回或不存在都有对应提示和出路（business/index.js:39、56、185）。
5. 路由统一走 routes.js，登录守卫清单与规则逐项对应，接口层再拦一道，结构清楚。
