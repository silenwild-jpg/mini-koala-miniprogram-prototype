# 迷你考拉仓 V1.1｜全页面底部按钮源码评审

日期：2026-10-08。基线：A+B+C+D 完整原型，帮助浮窗回滚后的版本3；本轮另包含租期推荐底栏样式修复。

## 结论与证据边界

底部操作区尚未形成统一规范。交易主链相对收敛，门店详情、协议、自助入仓、估算其他步骤、AI、预约及租后操作仍存在字号、字重、圆角、按钮高度和安全区处理差异。问题不能只靠继续覆盖单个按钮解决，需要以主次语义为前提，收口专用底部操作组件。

已逐文件检查 prototype 下79个HTML：49个顶层文件及30个状态跳转文件；同时查看实际引入的共享样式、运行时补丁、底部动作生成和事件绑定。附录逐项登记全部文件。导航Tab、弹层操作、卡片内表单提交和固定页底CTA分别检查，不因为CSS里出现.bottom就认定页面有底栏。

当前附图路径不存在，本环境没有可启动的Chromium。本报告是全量源码与样式规则评审，不是已完成的全页面视觉或动态验收。未采用旧截图替代本次截图；没有视觉评分或“全量通过”结论。跨样式文件的规则已核对，但没有浏览器computed style证据，字体最终映射、换行、滚动遮挡和真实设备表现仍需验证。

## 一、优先问题清单

| 编号 | 优先级 | 证据与页面 | 用户影响 | 建议 | 本轮状态 |
| --- | --- | --- | --- | --- | --- |
| BA-01 | P1 | 租期推荐原内联底栏 width:min(100%,430px)，桌面.phone宽390px且有10px边框 | 桌面底栏超过手机内容区域；手机状态下也缺少统一按钮边界约束 | 让底栏宽度等于预览内容宽度，清理历史边界与字体覆盖 | 已修改；实际截图待验 |
| BA-02 | P1 | S02底栏height:74px，U01 height:80px，padding-bottom:calc(10px + safe-area)，按钮min-height:48px | 安全区为34px时，S02可用高度约19px、U01约25px，均不足48px；按钮可能超出或侵入安全区 | 用auto高度+按钮高度+安全区自然撑开，不锁死总高 | 未修改 |
| BA-03 | P1 | Q01正常态edit为.secondary、位于110px左列；save为.primary、位于右侧宽列 | “继续下单”被弱化，“保存方案”成为最强CTA | 左侧保存方案，右侧继续下单；改布局时保持ID与原事件绑定对应 | 未修改 |
| BA-04 | P1 | Q01过期补丁隐藏save，将edit设width:100%;flex:1，但底栏仍为grid-template-columns:110px 1fr | 重新获取报价可能只占左侧窄列，右边留空；flex在grid里不能跨列 | 过期态明确一列，恢复按钮grid-column:1/-1 | 未修改 |
| BA-05 | P1 | 多页button未统一font-family:inherit，body字体并不保证原生button继承 | 浏览器可能选择不同默认字体，字宽及字重跨页面漂移 | 专用CTA组件明确font-family:inherit及line-height | 租期推荐已修改；其他页待收口 |
| BA-06 | P2 | C01协议按钮11px/900/11px圆角；A01入仓13px/900/11px圆角；S02 13px/650；O01/O02/O03 14px/700/12px圆角 | 同一交易体验中控件视觉密度和强调程度不同 | 以现有O01/O02/O03的14px/700/12px/48px为基准 | 未全局修改 |
| BA-07 | P2 | 估算s4/s7为16px/650/12px圆角；其余步骤.cta仍可继承24px圆角和900字重 | 同一估算流程出现胶囊与矩形两种按钮语言 | 逐步骤统一规格，步骤主CTA可保留16px作为明确例外 | 未修改 |
| BA-08 | P2 | AI拍照按钮15px/800/24px圆角，AI结果13px/800/24px圆角、高47px | AI支线与主估算、交易页差异明显，结果页长文案需重点验证 | 主CTA统一高度与圆角；结果页至少14px，长文案单独核验 | 未修改 |
| BA-09 | P2 | REF01主按钮24px圆角/15px/800，底栏padding-bottom固定18px，没有env安全区 | 与交易页外观差异；底部系统手势区可能压缩或遮挡 | 动态安全区、统一12px圆角；弹层44px作为次级操作例外 | 未修改 |
| BA-10 | P2 | V01主按钮15px/850/13px圆角、padding撑高；V02三按钮14px/820，取消预约也使用.secondary | 预约前后字体不一致，取消与修改/继续并列突出 | 统一字体；继续为主、修改为次、取消采用低强调文本并保留确认流程 | 未修改 |
| BA-11 | P2 | RN01/EX01共享.btn为46px，sprint3字重650；IV01提交按钮单独48px | 租后服务与交易主链按钮高度/字重不一致 | 页级主提交48px/700，表单辅助按钮可44px | 未修改 |
| BA-12 | P2 | 固定CTA栏padding左右10/12/14/16px，列宽104/106/108/110/112px或1:1.45，阴影各异 | 视觉位置跳动，主按钮大小不连续 | 优先左右16px、间距10–12px；按文案选择一列或主次两列 | 未修改 |
| BA-13 | 待动态核验 | 原帮助浮窗已恢复，原Acceptance Fix脚本按元素重叠隐藏浮窗 | 页面滚动时是否挡住按钮、金额或安全区不能由静态检查证明 | 在展开/收起、滚动顶部/中部/底部及弹层状态截图 | 未验证 |
| BA-14 | 待动态核验 | disabled、aria-disabled、鼠标/键盘焦点由不同来源控制 | 外观与真实不可点击行为是否一致、焦点是否可见需实际操作 | 检查禁用后不执行动作、启用恢复、Enter/Space及返回恢复 | 未验证 |

P1表示应优先修复或验证；安全区和过期态布局是由源码可证明的约束冲突，实际可见表现尚未截图复现。本次未发现可凭现有证据新定为P0的底部视觉问题。

## 二、按业务页面评审

| 页面/步骤 | 实际操作形态 | 源码评审结论 | 建议 |
| --- | --- | --- | --- |
| H01首页 | 底部导航Tab；帮助弹层双按钮 | 不属于交易CTA。弹层按钮44px/13px/900，与CTA基准不同但可作为弹层例外 | 统一Tab标签与触控反馈，独立验证浮窗；不要把Tab改成48px交易按钮 |
| 估算s1–s3 | 以内容选项及卡片为主，无统一固定CTA | 不需要为统一而强加底栏 | 保留原结构，只统一可点击反馈 |
| 估算s4确认物品 | 单主按钮“下一步：选择租期” | 已有48px/12px圆角；字号16px/650，与交易页不同 | 16px可作为步骤主按钮例外，字重和安全区统一 |
| 估算s5租期推荐 | 未选租期单按钮；匹配/无匹配主次双按钮 | 上轮状态覆盖已修；本轮样式收口 | 三种状态均需真实截图，不合并顾问与推荐语义 |
| 估算s6推荐空间 | 修改需求 / 查看附近可租仓位 | 可能继承旧24px圆角与900字重 | 与s5统一主次外观 |
| 估算s7按大小找仓 | 单主按钮 | 48px/16px/650/12px圆角 | 与s4一致，再统一字体继承 |
| 估算s8附近门店 | 返回首页 / 不确定大小？帮我估算 | 文案长，沿用旧.cta规则 | 统一边界，390及375下检查长文本，不能仅设置overflow:hidden掩盖 |
| 估算s9门店仓位列表 | JS生成finalActions | 需覆盖匹配/候补/顾问的生成状态 | 外观统一；点击动作与生成文案逐态验证 |
| S01附近门店 | 底部Tab；卡片内找仓操作 | 卡片CTA42px/12px/11px圆角，不应混同固定交易CTA | 作为卡片操作例外登记；导航和浮窗单独测 |
| S02门店详情 | 顾问协助 / 帮我选合适空间，随状态切换 | 13px/650；底栏锁高74px，有安全区冲突 | 字号/字重统一，底栏自然撑高，保留状态语义 |
| U01仓位方案 | 需要帮助 / 继续租用 | 14px/700/12px/48px接近基准，80px锁高仍冲突 | 优先修安全区；未选租期、对比租期、售出状态复核 |
| Q01方案报价 | 继续下单 / 保存方案；过期恢复 | 正常主次反向；过期单按钮未跨列 | 正常态右侧下单，过期态满宽恢复 |
| O01确认订单 | 返回查看仓位 / 确认并支付 | 48px/14px/700/12px；auto底栏，适合作为基准 | 验证协议未勾选、支付中及重复点击状态 |
| C01合同协议 | 返回订单 / 同意协议并支付 | 11px/900/11px圆角，固定76px底栏 | 提升字号，改自然高度，统一禁用态 |
| O02支付结果 | 返回首页 / 查看订单详情 | 已接近基准 | 成功、失败、取消等状态核验，不只看默认HTML |
| O03订单详情 | 联系客服 / 主状态操作 | 已接近基准；主操作由生命周期状态生成 | 待使用、使用中、即将到期、退租中、结束分别检查 |
| A01自助入仓 | 联系门店 / 导航到店 | 13px/900/11px，固定72px栏 | 统一规格，验证资格受限和安全区 |
| ID01实名验证 | 返回订单 / 开始验证，随验证状态变化 | 48px/14px/800/11px | 字重700、圆角12px；pending/failed/verified复核 |
| RN01续租 | 卡片提交及支付弹层，非固定页底栏 | 46px/650/12px；不是“底栏缺失”问题 | 按提交/报价/支付状态统一按钮，弹层独立测 |
| EX01退租 | 卡片提交退租/申请验仓，非固定页底栏 | 46px/650；actions还被全局赋予底栏阴影 | 主提交48px；卡片内.actions不应无差别加页底阴影 |
| DP01押金 | 信息状态页，没有固定底部CTA | 不认定缺少CTA。源码残留.bottom规则没有对应节点 | 可清理无效CSS，不增加无意义按钮 |
| OH01历史订单 | 订单卡片操作，没有固定底部CTA | 同上；需观察列表长内容与帮助浮窗 | 保留内容内操作，不强加底栏 |
| IV01发票 | 表单内48px提交按钮，没有固定底部CTA | 高度已48px，继承字重650；表单键盘遮挡待验 | 统一字重，检查键盘弹起及邮箱错误后的操作可见性 |
| B2B企业 | 固定双按钮 | 与430px.app容器相匹配；字号14px，共享字重650，主色可被深绿覆盖 | 不把430px误判为本页溢出；统一主次颜色与触控高 |
| V01预约看仓 | 固定单按钮 | 15px/850/13px圆角，未明确48px高度 | 明确48px、字重与圆角；验证日期未选状态 |
| V02预约结果 | 内容内三按钮 | 14px/820；取消和修改均为描边 | 继续为主、修改为次、取消降低强调 |
| B01品牌介绍 | 查看附近门店 / 帮我找合适空间 | 13px/900/11px圆角，固定76px底栏 | 同主CTA基准，复核长文案及安全区 |
| AI01照片 | 内容内拍照/相册双按钮 | 48px/15px/800/24px圆角 | 统一圆角与字体，示例状态保留真实性说明 |
| AI loading | 加载页无固定底部CTA | 无需强加CTA，加载异常恢复需行为验收 | 只检查退出/失败恢复入口 |
| AI02识别结果 | 固定顾问确认 / 查看附近合适门店 | 47px/13px/800/24px圆角 | 统一48px/14px/700/12px，检查长文案 |
| C01优惠券钱包/C02选券 | 券卡内操作，无固定交易栏 | 优惠券按钮40–44px属局部操作；搬运券不能租金抵扣 | 维持卡片操作例外，避免全局.primary污染 |
| REF01推荐有礼 | 固定邀请按钮+分享弹层 | 48px/15px/800/24px，底栏没有动态安全区 | 优先补安全区；统一页级按钮，弹层44px例外 |
| 运输状态 | 内容内联系客服/查看订单 | 48px/14px/700/12px，接近基准 | 保留主次区分与关联订单语义 |
| Q02/Q03/T01/T02 | 当前未开放提示页 | 非真实业务流程底栏 | 不按生产CTA强行重构，暂不支持文案保持 |
| 入口、销售分享、演示控制台 | 链接/内部工具footer | 不是普通用户底部CTA | 登记覆盖，保留内部工具样式 |
| 历史HTML与state_demos | 历史参考/状态跳转入口 | 不把每个跳转文件算作独立可见按钮页 | 验收实际目标页及其状态 |

## 三、统一规范建议

此规范是建议；除租期推荐页已执行的修复外，本轮未全局应用。

| 项目 | 默认规范 | 允许例外 |
| --- | --- | --- |
| 字体 | 继承页面中文字体栈，button显式font-family:inherit | 无需增加单页特殊字体 |
| 页级按钮字号/行高 | 14px / 20px | 估算单个“下一步”可16px，但步骤内一致 |
| 字重 | 700 | 次级文字链接600；不混用850/900 |
| 触控尺寸 | 主/次CTA48px高 | 卡片辅助、弹层次操作≥44px；导航独立规范 |
| 圆角 | 12px | 24px胶囊用于标签，不用于本批页级CTA |
| 主按钮 | #2F6B4F底、白字 | 不因不同页面混入#183E30主CTA |
| 次按钮 | 白底、#2F6B4F字、#CFE1D6描边 | 未选租期定位按钮保持低强调、仍可点击 |
| 双按钮布局 | 次左主右，间距10–12px；次按钮104–112px，主按钮剩余宽 | 次文案较长时用比例布局；不可硬裁文字 |
| 单按钮布局 | 一列满宽 | 隐藏另一按钮时同步改grid模板或跨列 |
| 底栏 | 左右16px，白色/近白背景、细上边线、轻统一阴影 | 手机框与移动端宽度不同须适配容器 |
| 安全区 | auto总高度，底部基础间距+env(safe-area-inset-bottom) | 不给含安全区的栏锁死72/74/80px高度 |
| 状态 | 默认、按下、焦点、禁用、处理中分别有语义和视觉反馈 | 浅色可点击按钮不等于disabled |
| 风险/取消操作 | 文本或低强调按钮，必要时确认 | 不与提交/支付使用同等绿色主按钮 |

不要对所有button或.actions一次性覆盖。现有.actions同时用于固定页底、卡片表单和支付弹层；建议引入专用page-action-bar与action-button角色，限定作用域后迁移。否则会误改导航、加减按钮、优惠券和内部工具。

## 四、当前实施与后续批次

本轮已修改mini_koala_term_actions_patch_v1.css：移动端宽度不超过390px；桌面390px手机框的370px内容宽；right:auto消除旧定位约束；单按钮明确一列；双按钮使用104px/minmax(0,1fr)；按钮明确字体继承、14px/20px/700、48px、12px圆角及主次颜色；上下文提示min-width:0及省略；统一底栏背景和阴影。

源码几何检查：375px时按钮列宽104/227px；390px时104/242px；桌面手机内容370px时104/222px。此为声明与算术检查，不是浏览器测量。68项基础回归、按钮状态与动作绑定检查、租期模型检查、几何规则检查通过。

建议下一批先改Q01主次/过期满宽、S02/U01/C01/A01安全区，再统一字体与页级按钮；之后处理AI/预约/品牌/推荐有礼；最后验证表单卡片、弹层和Tab例外。任何修改都保留业务动作、ID、数据与金额规则。

## 五、必须补齐的视觉和行为验收

1. 375×812、390×844，每页顶部与滚动末尾截图；桌面手机框补一组。
2. 安全区0与34px；按钮矩形位于内容宽内；48px触控高度完整。
3. 未选租期/匹配/无匹配；正常报价/过期；售罄/仓位售出；订单五种生命周期。
4. 长按钮文案、长门店名、系统字体变化及较大文字，检查无截断与遮挡。
5. 表单键盘弹起、协议错误定位、按钮禁用/恢复、提交中、重复点击。
6. 帮助浮窗展开/收起与弹层打开，检查按钮/价格/日期不被覆盖。
7. 导航Tab与页底CTA区分；状态跳转入口必须验实际目标页。

上述步骤当前均未获得本轮截图证据。按产品评审技能“Do not claim an audit if the actual flow could not be accessed and captured”，完整视觉评审仍受阻；本报告提供可执行的源码问题清单及79文件覆盖表。发布裁决仍HOLD。

## 附录：全部79个HTML覆盖登记

该表记录源码扫描覆盖，不表示每个状态已经动态验收。动态生成的按钮需结合上方页面矩阵；无固定CTA不等于缺陷。

| 序号 | 文件 | 覆盖类型与源码观察 |
| --- | --- | --- |
| 1 | `home_original_reference.html` | 历史参考文件，不作为当前交易组件基准 |
| 2 | `index.html` | 内部入口/控制台；footer或入口链接单独登记 |
| 3 | `index_state_machine_demo.html` | 内部入口/控制台；footer或入口链接单独登记 |
| 4 | `index_visual_v2_4_1.html` | 内部入口/控制台；footer或入口链接单独登记 |
| 5 | `index_visual_v2_7_4.html` | 内部入口/控制台；footer或入口链接单独登记 |
| 6 | `index_visual_v2_7_4_4.html` | 内部入口/控制台；footer或入口链接单独登记 |
| 7 | `index_visual_v2_7_4_5.html` | 内部入口/控制台；footer或入口链接单独登记 |
| 8 | `index_visual_v2_7_4_6.html` | 内部入口/控制台；footer或入口链接单独登记 |
| 9 | `index_visual_v2_7_4_7.html` | 内部入口/控制台；footer或入口链接单独登记 |
| 10 | `index_visual_v2_7_4_8.html` | 内部入口/控制台；footer或入口链接单独登记 |
| 11 | `mini_storage_access_a01_v2_self_service_Visual_V2_7_4.html` | bottombar：联系门店 / 导航到店 |
| 12 | `mini_storage_ai_loading_ai01_l_v1_demo_patch.html` | 加载状态，无固定CTA；失败恢复需动态验证 |
| 13 | `mini_storage_ai_photo_ai01_v1_demo_patch.html` | actions：拍照估算 / 从相册选择 |
| 14 | `mini_storage_ai_result_ai02_v1_demo_patch.html` | bottom：顾问确认 / 查看附近合适门店 |
| 15 | `mini_storage_brand_b01_v1_10_self_service_synced_Visual_V2_7_4.html` | bottom：查看附近门店 / 帮我找合适空间 |
| 16 | `mini_storage_business_b2b01_r113_Visual_V2_7_4.html` | actions：查看可选仓位 / 邀请顾问协助 |
| 17 | `mini_storage_contract_c01_v1_agreement_confirm_Visual_V2_7_4.html` | bottombar：返回订单 / 同意协议并支付 |
| 18 | `mini_storage_coupon_select_c02_v1.html` | 券卡局部操作，无固定CTA；运行时列表与共享券样式已检查 |
| 19 | `mini_storage_coupon_wallet_c01_v1.html` | 券卡局部操作，无固定CTA；运行时列表与共享券样式已检查 |
| 20 | `mini_storage_demo_d01_v5_entry_clarity_review.html` | 内部入口/控制台；footer或入口链接单独登记 |
| 21 | `mini_storage_deposit_dp01_v2_7_4.html` | 信息/列表页，无固定底栏；残留.bottom CSS没有对应节点 |
| 22 | `mini_storage_exit_ex01_v2_7_4.html` | actions：提交退租安排 |
| 23 | `mini_storage_home_H01_Visual_V2_7_4_SSOT.html` | bottomnav：导航或动态生成操作；actions：暂时不用 / 进入在线咨询 |
| 24 | `mini_storage_home_h01_vi_ready_wireframe_v1.html` | 历史参考文件，不作为当前交易组件基准 |
| 25 | `mini_storage_identity_id01_v2_7_4_5.html` | bottombar：返回订单 / 开始验证 |
| 26 | `mini_storage_invoice_iv01_v2_7_4.html` | 表单内提交开票申请，无固定底栏；48px按钮 |
| 27 | `mini_storage_mine_m01_v1_11_self_service_Visual_V2_7_4.html` | tabbar：导航或动态生成操作 |
| 28 | `mini_storage_order_history_oh01_v2_7_4.html` | 信息/列表页，无固定底栏；残留.bottom CSS没有对应节点 |
| 29 | `mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html` | bottombar：返回查看仓位 / 确认并支付 |
| 30 | `mini_storage_order_o01_v1_2_contract_linked.html` | 历史参考文件，不作为当前交易组件基准 |
| 31 | `mini_storage_order_o02_v1_17_self_service_Visual_V2_7_4.html` | bottombar：返回首页 / 查看订单详情 |
| 32 | `mini_storage_order_o02_v1_1_contract_linked.html` | 历史参考文件，不作为当前交易组件基准 |
| 33 | `mini_storage_order_o03_v1_17_self_service_Visual_V2_7_4.html` | bottombar：联系客服 / 查看入仓指引；sheet-actions：如何开锁 / 复制密码 |
| 34 | `mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html` | bottombar：继续下单 / 保存方案 |
| 35 | `mini_storage_quote_q02_v4_self_service.html` | 未开放服务提示；不按真实流程CTA改造 |
| 36 | `mini_storage_quote_q03_v4_self_service.html` | 未开放服务提示；不按真实流程CTA改造 |
| 37 | `mini_storage_referral_ref01_v1.html` | bottom：邀请好友；actions：暂不分享 / 复制邀请信息 |
| 38 | `mini_storage_renew_rn01_v2_7_4.html` | actions：提交续租需求；actions：确认并支付 / 返回报价 |
| 39 | `mini_storage_sales_share_demo.html` | 内部入口/控制台；footer或入口链接单独登记 |
| 40 | `mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html` | bottombar：顾问协助 / 帮我选合适空间 |
| 41 | `mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html` | tabbar：导航或动态生成操作 |
| 42 | `mini_storage_transport_status_v1.html` | actions：联系客服确认安排 / 查看关联订单 |
| 43 | `mini_storage_transport_t01_v4_self_service.html` | 未开放服务提示；不按真实流程CTA改造 |
| 44 | `mini_storage_transport_t02_v4_self_service.html` | 未开放服务提示；不按真实流程CTA改造 |
| 45 | `mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html` | lead-actions：暂不保留 / 演示支付并保留方案；bottombar：需要帮助 / 继续租用 |
| 46 | `mini_storage_viewing_v01_v1_14_self_service_synced.html` | bottom：确认预约 |
| 47 | `mini_storage_viewing_v02_v1_14_self_service_synced.html` | actions：继续查看仓位 / 修改预约时间 / 取消预约 |
| 48 | `product_demo_hub_v1.html` | 内部入口/控制台；footer或入口链接单独登记 |
| 49 | `space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html` | bottom：下一步：选择租期；usageActions：导航或动态生成操作；leadActions：顾问协助；bottom：修改需求 / 查看附近可租仓位；bottom：查看附近可租空间；bottom：返回首页 / 不确定大小？帮我估算；finalActions：导航或动态生成操作 |
| 50 | `state_demos/H01_ACTIVE.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 51 | `state_demos/H01_ENDING.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 52 | `state_demos/H01_ESTIMATED.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 53 | `state_demos/H01_NEW.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 54 | `state_demos/H01_PENDING.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 55 | `state_demos/H01_QUOTED.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 56 | `state_demos/H01_REFERRAL_FRIEND.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 57 | `state_demos/H01_RETURNING.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 58 | `state_demos/H01_VIEWING.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 59 | `state_demos/ID01_FAILED.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 60 | `state_demos/ID01_NOT_STARTED.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 61 | `state_demos/ID01_PENDING.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 62 | `state_demos/ID01_VERIFIED.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 63 | `state_demos/M01_ACTIVE.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 64 | `state_demos/M01_ENDED.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 65 | `state_demos/M01_ENDING.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 66 | `state_demos/M01_RETURNING.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 67 | `state_demos/O01_CONFIRM.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 68 | `state_demos/O03_ACTIVE.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 69 | `state_demos/O03_ENDED.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 70 | `state_demos/O03_ENDING.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 71 | `state_demos/O03_RETURNING.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 72 | `state_demos/Q01_SAVED_OPTIONAL.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 73 | `state_demos/S02_BROWSE.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 74 | `state_demos/S02_HIGHVALUE.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 75 | `state_demos/S02_MATCHED.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 76 | `state_demos/S02_NOMATCH.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 77 | `state_demos/U01_LONGTERM_COMPARE.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 78 | `state_demos/U01_NO_TERM.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
| 79 | `state_demos/U01_STANDARD_6M.html` | 状态跳转入口；检查目标引用，实际目标页需逐状态截图 |
