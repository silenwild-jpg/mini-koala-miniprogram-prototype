// 交易域（第 2 批）界面文字：登录层、确认订单、快捷下单、订单详情、订单列表、协议页，以及订单摘要卡 / 费用明细 / 任务卡三个公共组件。
// 文案取自冻结稿（pages/w2-render.js、w3-render.js、w4-render.js、w6-render.js、w1-render.js、w9-auth.js、w26-sub.js、w7-sys.js）。
// 标「自写」的是冻结稿没有、本批补的句子。用词遵守交接 v1.0 §4.11；界面不写违约金比例、倍数（D-113）。
const DOC = {
  notice: { title: '迷你考拉用户使用告知书', short: '用户使用告知书' },
  usage: { title: '迷你考拉自助式设备设施使用协议', short: '自助式设备设施使用协议' },
  register: { title: '迷你考拉用户注册协议和个人信息保护政策', short: '用户注册协议和个人信息保护政策' },
  custom: { title: '私人定制专项服务协议', short: '私人定制专项服务协议' }
};
const book = (k) => '《' + DOC[k].title + '》';
// 报价 / 待支付的有效小时数取自配置（FIX-01 B-21），文案不写死
const TIMERS = require('../core/config').timers, QUOTE_H = TIMERS.quoteTtlHours, PENDING_H = TIMERS.pendingOrderTtlHours;
// 实名认证弹层：确认订单与付款后补实名共用这一套标签和说明（FIX-01 B-17）
const IDV = {
  title: '实名认证', name: '姓名', namePh: '请填写证件上的姓名', no: '身份证号', noPh: '请填写 18 位身份证号',
  fine: '用于核实签约人身份并签署协议，由依法设立的第三方机构认证。', submit: '提交认证', checking: '认证中…',
  nameInvalid: '请填写证件上的姓名', noInvalid: '请填写 18 位身份证号',
  mismatch: '姓名与身份证号不一致，请核对后重试', fail: '认证未完成，请稍后重试'
};
module.exports = {
  doc: DOC,
  docName: { notice: book('notice'), usage: book('usage'), register: book('register'), custom: book('custom') },
  common: { know: '知道了', cancel: '取消', confirm: '确定', contactService: '联系客服', consult: '请咨询客服', yuan: '¥', monthUnit: '个月', perMonth: '/月', perMonthFrom: '/月起', perCubicFrom: '/m³/月起', sep: ' · ', to: ' 至 ', dayUnit: '天' },
  idv: IDV,
  // 支付未成功的原因（FIX-01 R-07）：键 = order.pay.fail_reason；[原因, 建议]。四类枚举与文案待业务提供，先按演示用的四类自拟。确认订单与订单详情共用。
  payFail: {
    balance: ['支付账户余额不足', '请更换支付方式后继续支付'],
    cancelled: ['您已取消支付', '需要时可继续支付'],
    network: ['网络不稳定，支付未完成', '请检查网络后继续支付'],
    risk: ['本次支付未通过支付安全校验', '请更换支付方式，或联系客服'],
    unknown: ['', '']
  },
  login: {
    title: '手机号快捷登录', smsTitle: '其他手机号登录',
    wechat: '微信手机号快捷登录', other: '其他手机号登录', loading: '验证中…', skip: '暂不登录，继续浏览',
    agreePrefix: '我已阅读并同意 ', agreeTip: '请先阅读并勾选协议',
    purpose: '手机号用于登录、查看报价、预约联系和订单通知，未注册的手机号将自动注册。',
    failTitle: '微信手机号暂时无法获取', failDesc: '请使用其他手机号，通过短信验证码登录。',
    deniedTitle: '未取得微信手机号', deniedDesc: '可以改用其他手机号，或先继续浏览。',
    phoneLabel: '手机号', phonePlaceholder: '请输入手机号', codeLabel: '验证码', codePlaceholder: '请输入验证码',
    sendCode: '获取验证码', resend: '重新获取', waitSuffix: 's 后重发', submit: '登录', useWechat: '使用微信手机号',
    sentHint: '验证码已发送，5 分钟内有效',
    codeWrong: '验证码不正确，请重新输入', codeExpired: '验证码已过期，请重新获取', rateLimit: '发送过于频繁，请稍后再试',
    sendFail: '验证码发送失败，请稍后重试', // 自写：冻结稿的发送失败态只画了「发送过于频繁」这一种原因
    loginFail: '登录未成功，请稍后重试',     // 自写
    // 自写（FIX-01 S-01，待真机确认）：登录层的隐私保护指引入口，与注册协议的勾选分开写
    privacyPrefix: '个人信息的处理规则见 ', privacy: '《隐私保护指引》', privacyFail: '暂时无法打开，请稍后重试',
    conflictTitle: '该手机号已绑定其他微信账号',
    conflictDesc: ['为保护账户和订单安全，不会自动合并账户。您可以换一个手机号，或联系客服 ', ' 处理。'], // 中间是客服电话（core/config-trade.js）
    conflictService: '联系客服', conflictChange: '换个手机号',
    ok: '登录成功'
  },
  card: { // mk-order-card
    term: '租期', period: '起止日期', startDay: '起租日', startPlan: '预计用仓时间', pickDate: '请选择日期', withRenew: '（含续租）',
    origin: '原订单仓位', orderNo: '订单号 ', orderedAt: '下单 ', comboTag: '项组合',
    leaseTo: '租期至 ' // FIX-01 C-20：列表卡第三行，临期 / 已到期订单写到期日
  },
  fee: { // mk-fee-detail
    title: '费用明细', rent: '整期租金', special: '特价仓', saved: '已省', savedBase: '较月基价 ',
    full: '满额减', fullMin: '整期满 ', rentAfter: '减后整期租金 ',
    coupon: '优惠券', couponPick: '选择 ›', couponSwap: '更换 ›', couponNone: '暂无适用优惠', couponSkipped: '不与满额减同享', couponUnused: '未使用',
    couponSpecial: '特价仓不可用券', couponNeedMonths: ['满 ', ' 个月可用'], couponAvail: ['有 ', ' 张可用'], // FIX-01 B-03 / B-12
    fullSkipped: ['已选优惠更大的一项，满额减（−', '）不同享'], // FIX-01 B-12：券比满额减大时满额减让位
    origin: '原价', specialOff: '特价仓优惠', termOff: '租期折扣', // FIX-01 R-06：原价 − 特价仓优惠 − 租期折扣 = 整期租金
    couponUsed: '已使用 ', couponAfter: '券后整期租金 ',
    benefit: '服务权益', freeTransport: '免费运输 1 次', freeTransportNote: '顾问联系安排', // IMPL-01：权益一项、安排方式是说明，分两行不用分隔符
    deposit: '押金', depositOne: '1个月月租', depositCombo: '各仓月租合计', management: '整单管理费',
    payable: '本次应付', paid: '已付', originCancelled: '原订单金额（已取消）', originExpired: '原订单金额（已失效）',
    loginToShow: '登录后显示', requote: '待重新报价', refreshToShow: '刷新后显示'
  },
  feeSeg: { // FIX-01 C-01：续租过的订单，费用明细按付款分段（services/order-view.js fees）
    initial: '下单支付小计', renew: '续租租金', paidAt: ' 支付', total: '累计已付'
  },
  // 订单列表与「我的仓位」用的阶段标签。FIX-01 C-16 / B-09：与订单详情状态头的标签用同一套词；
  // 后一行是阶段内单列的几种情况（services/order-view.js variant，C-02 / C-03 / C-09 / C-15）
  stage: {
    pending: '待支付', payment_failed: '支付未成功', expired: '已超时', cancelled: '已取消',
    identity: '待实名认证', upcoming: '待起租', active: '租用中', expiring: '即将到期', renewal: '续租待确认', renewal_pending: '续租报价确认中',
    returning: '退仓处理中', inspection: '待验仓', expired_lease: '租期已到期', refund: '押金处理中', ended: '已退仓',
    refund_failed: '退款未成功', inspect_failed: '验仓未通过', exit_clearing: '退仓待清空', identity_mismatch: '实名未通过', renewal_pay: '续租待支付', renewal_pay_failed: '续租付款未成功'
  },
  head: { // 订单详情状态头：[大标题, 标签]
    refund_failed: ['押金退款未成功', '退款未成功'], inspect_failed: ['验仓未通过', '需重新验仓'], exit_clearing: ['退仓已提交', '待清空'],
    identity_mismatch: ['实名认证未通过', '需重新提交'], renewal_pay: ['续租费用待支付', '待支付'], renewal_pay_failed: ['续租付款未成功', '待支付'],
    pending: ['订单待支付', '待支付'], payment_failed: ['支付未成功，订单为您保留', '支付未成功'], expired: ['订单已超时', '已超时'], cancelled: ['订单已取消', '已取消'],
    identity: ['入仓前需完成实名认证', '待认证'], upcoming: ['入仓准备', '待起租'], active: ['仓位租用中', '租用中'], expiring: ['租期即将到期', '需关注'],
    renewal: ['续租报价待确认', '待确认'], renewal_pending: ['续租申请处理中', '报价确认中'],
    returning: ['退仓处理中', '办理中'], inspection: ['等待门店验仓', '待验仓'], refund: ['押金处理中', '退款处理中'], expired_lease: ['租期已到期', '待办理'], ended: ['租赁已结束', '已退仓']
  },
  confirm: {
    emptyTitle: '请先选择仓位', emptyDesc: '', backHome: '返回首页', emptyBtn: '去附近门店', // FIX-01 B-05 / R-21：说明句与按钮同义，删说明句；按钮去附近门店
    heldTitle: '您有一笔待支付订单', heldDesc: '该仓位已由这笔订单为您保留。', // FIX-01 B-06
    swapTitle: '确认更换仓位？', swapDesc: '更换后这笔订单将自动取消，仓位随即释放。', swapYes: '确认更换', swapKeep: '暂不更换', // FIX-01 R-05
    startNote: '预计用仓时间即起租日，租金自当日起计', // FIX-01 R-04
    swap: '更换', swapUnit: '更换仓位',
    goneTitle: '所选仓位已不可租', goneDesc: '该仓位刚被租出或已下架。', goneBtn: '重新选择仓位',
    quoteExpired: '报价已超过 ' + QUOTE_H + ' 小时', quoteExpiredSub: '', refreshQuote: '刷新报价',
    prepayNote: '租期折扣按预付整期计算，提前退仓时按协议重新核算。报价 ' + QUOTE_H + ' 小时内有效', // IMPL-01：两句话用句号，不用分隔符
    person: '下单人', personPhone: '联系手机号', personTip: '签署协议前需完成实名认证，认证后回到本页继续', // IMPL-01 M-16：联系方式卡与实名信息卡合并为「下单人」（提示句取方向稿 06_confirm_B）
    contact: '联系方式', contactPhone: '登录手机号 ', contactSwap: '更换', notLoggedIn: '未登录', goLogin: '去登录',
    identity: '实名信息', identityDone: '已认证', identityTodo: '未认证', identityGo: '去认证', identityLogin: '登录后填写',
    protect: '物品保障', protectSub: '已含基础保障，可了解增值保障',
    transport: '预约运输 / 搬运', transportSub: '下单前可预约，由顾问电话确认，不计入本次应付',
    cancelOrder: '取消订单', cancelTitle: '确认取消订单？', cancelDesc: '取消后仓位将释放；如仍需用仓，可重新下单。', cancelKeep: '暂不取消', cancelYes: '确认取消',
    agreePrefix: '我已阅读并确认 ', agreeMid: '，并承诺不存放', agreeProhibited: '违规违禁物品',
    payable: '本次应付', savedPrefix: '已省 ', loginToShow: '登录后显示', refreshToShow: '刷新后显示', quotePending: '报价待确认', unavailable: '当前方案不可用',
    btnQuote: '查看报价', btnIdentity: '实名认证', btnSign: '签署并提交', btnSubmitting: '正在生成电子合同…', btnPay: '继续支付', btnPaying: '支付处理中…', btnRestart: '重新找仓', btnConfirm: '确认订单', btnAdvisor: '预约顾问',
    hintIdentity: '签署协议前需完成实名认证', hintAgree: '请先勾选确认', hintPrice: '请先确认新报价', hintUnitSold: '仓位已售出，请更换仓位',
    hintDate: '请选择预计用仓时间', // 自写
    idvTitle: IDV.title, idvName: IDV.name, idvNamePh: IDV.namePh, idvNo: IDV.no, idvNoPh: IDV.noPh,
    idvFine: IDV.fine, idvSubmit: IDV.submit, idvChecking: IDV.checking,
    idvMismatch: IDV.mismatch,
    idvFail: IDV.fail, // 自写：接口失败（非信息不一致）时的提示
    signTitle: '签署使用协议', signSigner: '签署人', signStore: '门店', signUnit: '仓位', signTerm: '租期', signFrom: ' 起', signPayable: '本次应付', signView: '查看',
    signStart: '起租日（预计用仓时间）', signStartTail: ' 起计费', signEnd: '到期日', signEndTail: '（含当天）', // FIX-01 R-04
    signFine: '点击「签署」即确认以上订单信息准确、完整。签署后生成电子合同，并进入支付。', signBack: '返回修改', signGo: '签署',
    payTitle: '确认支付', payWechat: '微信支付 ', payLater: '暂不支付',
    payingTitle: '正在等待支付结果', payingDesc: '请在微信支付窗口完成付款，完成后本页自动更新。', payProblem: '支付遇到问题', payDone: '已完成支付',
    payProblemDesc: ['订单与仓位仍为您保留，可在剩余时间内继续支付。如已扣款但订单未更新，请联系客服 ', '。'], // FIX-01 B-15：中间是客服电话
    pendingTitle: '订单待支付', payingHead: '等待支付结果', pendingTag: '待支付', pendingNote: '协议已签署，仓位已为您保留；关闭支付窗口不会取消订单',
    failedTitle: '支付未成功，订单为您保留', failedTag: '支付未成功', failedNote: '可在剩余时间内继续支付', // FIX-01 B-09：标签全站统一「支付未成功」
    expiredTitle: '订单已超时', expiredTag: '已失效', expiredNote: '超过 ' + PENDING_H + ' 小时付款有效期，仓位已释放',
    cancelledTitle: '订单已取消', cancelledTag: '已取消', cancelledNote: '仓位已释放',
    orderNo: '订单号 ', left: '剩余 ',
    recheckOk: '已重新核对，与原订单一致，可以继续支付', recheckChanged: '已重新核对，有变化，请确认后继续',
    recheckStatus: '订单状态', recheckUnit: '仓位 ', recheckPrice: '价格', recheckCoupon: '优惠资格',
    statusOk: '已保留', statusBad: '已超时', unitOk: '可租', unitBad: '已售出', priceOk: '与原订单一致', priceBad: '已变化', couponOk: '无变化', couponBad: '已变化',
    priceTitle: '价格刚刚发生变化', priceDesc: '请核对新的金额后重新确认。已保留您的容量、租期和仓位。', priceReason: '变化原因',
    priceReasonBase: ['该仓位月租由 ', ' 调整为 '], priceReasonCoupon: '优惠资格发生变化', priceReasonOther: '报价已更新',
    priceRent: '整期租金', priceMonthly: '月租', priceDeposit: '押金', pricePayable: '本次应付', priceOther: '查看其他方案', priceAccept: '确认新报价',
    protectTitle: '物品保障', protectBasic: '基础保障', protectBasicTag: '已含', protectPlus: '增值保障', protectPlusTag: '可选',
    protectBasicDesc: '存放物品价值不超过 ¥5,000 的，附赠累计不超过 ¥5,000 的基础保障',
    protectPlusDesc: '物品价值超过 ¥5,000 的，可购买增值保障，赔付上限提升至累计不超过 ¥15,000；与基础保障不叠加',
    protectPrice: '价格与办理：请咨询客服', protectClaim: '如有物品损失，请在 48 小时内联系我们，并保留相关凭证',
    couponTitle: '选择优惠券', couponAuto: '自动使用最优优惠', couponNoUse: '暂不使用优惠', couponNotFit: '不适用于当前订单',
    altTitle: '其他可租门店', altBy: '按距离由近到远',
    toastFail: '操作未成功，请稍后重试', // 自写
    toastPayFail: '支付未成功，订单已为您保留' // 自写：演示支付失败后的轻提示
  },
  quick: {
    steps: ['选择信息', '确认订单', '支付'],
    storeUnit: '门店与仓位', termDate: '租期与用仓时间', // IMPL-01 M-22：门店卡与仓位卡合并、租期卡与日期卡合并后的卡标题
    store: '选择门店', location: '用仓位置', change: '更改', allCity: '全城门店', pickStore: '请选择门店', storeAddrHint: '选择门店后显示地址', noStore: '暂无可展示门店',
    viewStore: '查看详情', carried: '已带入您在租的门店，可更换。',
    unit: '选择仓位', pickUnit: '请选择仓位', unitHint: '选仓后显示容量与尺寸', unitNeedStore: '请先选择门店', unitGone: '当前不可用', choose: '选择', swap: '更换',
    term: '选择租期', date: '预计用仓时间', pickDate: '请选择用仓日期',
    estimate: '预计整期租金', access: '存取时间 ', fees: '费用明细',
    need: '还需', missStore: '选择门店', missUnit: '选择仓位', missSwap: '更换仓位', missDate: '选择用仓日期',
    next: '下一步：确认订单', quote: '查看报价', loginToQuote: '登录后查看整期报价', loginToShow: '登录后显示', // FIX-01 B-13：未登录且选齐时金额位写「登录后显示」
    dateNote: '预计用仓时间即起租日，租金自当日起计', // FIX-01 R-04
    heldTitle: '您有一笔待支付订单', heldDesc: '该仓位已由这笔订单为您保留。', heldLink: '继续支付', // FIX-01 B-06
    storeSheet: '更换门店', unitSheet: '选择仓位', accessShort: '存取 ', stockN: ['可租 ', ' 个'], stockNone: '暂无可租',
    noUnit: '本店暂无可用仓位。', // 自写（冻结稿原句「本店暂无满足容量的可用仓位」指向按需求筛选，快捷下单不带需求）
    goneTitle: '所选仓位已不可租', goneDesc: '该仓位刚被租出或已下架。'
  },
  order: {
    emptyTitle: '暂无可查看的订单', emptyDesc: '', backOrders: '返回订单', // FIX-01 R-21：说明句与「返回订单」按钮同义，删
    orderNo: '订单号 ', orderedAt: '下单 ', payLeft: '支付剩余 ', leftPrefix: '剩余 ', leftSuffix: ' 天', startPlan: '计划起租 ',
    leftToday: '今天到期', overduePrefix: '已超出 ', clearPlan: '计划取空 ', // FIX-01 R-04 / C-10 / C-03
    paidOk: '支付成功，已付 ', // FIX-01 B-15：从确认订单支付成功跳来时的确认句
    noteRefundFailed: '押金退款未成功', noteInspectFailed: '验仓未通过', reasonPrefix: '原因：', // FIX-01 C-02 / C-03（原因由后端给，没有时不出原因行）
    noteIdentityMismatch: '上次提交的实名认证未通过，姓名与身份证号需与证件一致。', // FIX-01 C-15
    noteRenewPay: '续租报价已确认，付款完成后新租期生效。', noteRenewPayFailed: '续租付款未成功，续租尚未生效；报价有效期内可继续支付。', // FIX-01 C-09
    noteFailed: ['订单保留至 ', '。继续支付前会再次确认仓位、价格和优惠。'],
    noteExpired: '原订单不可继续支付，需重新确认仓位和当前价格。',
    noteCancelled: '仓位已释放。', // FIX-01 R-21：后半句与「重新找仓」按钮同义，删
    noteIdentity: '这笔订单下单时未完成实名认证，完成后起租日起可入仓存取。',
    // FIX-01 R-08 / R-21：原标题「请办理续租或退仓」与底栏两个按钮同义，删；两句话写清续租从哪天起算、超出天数另计
    noteOverdue: ['租期已于 ', ' 到期，超出的天数按协议另行计费，与续租租金分开结算。办理续租的，续租期自原到期日起算。'],
    noteRenewal: '门店已给出续租报价，报价 24 小时内有效，过期后按常规折扣价续租。',
    subOk: '已开启到期提醒，租期到期前会通过微信提醒您。', subNo: '未开启到期提醒，可在「消息」查看到期通知。', subAsk: '开启通知',
    feeTitle: '费用明细', // IMPL-01：订单详情去卡片后小节标题由页面给
    storeSvc: '门店服务', navigate: '门店导航', callStore: '联系门店', unlock: '一键开锁', arrival: '到店与进仓指引',
    unlockRule: '一键开锁暂未开通，存取时请联系门店协助开门。', unlockToast: '一键开锁暂未开通，存取时请联系门店协助开门', // FIX-01 C-06：不再指回入仓指引
    navCopied: '已复制门店地址，可在地图中搜索', // 自写：门店坐标数据未提供时的替代
    progress: '租赁进度', totalTerm: '累计租期', leaseEnd: '租期至', leftTerm: '剩余租期', identity: '实名认证', todo: '待完成', deposit: '押金',
    depositLabel: { holding: '保管中', refunding: '退款处理中', refunded: '已退还', partial: '部分退还', inspect: '待验仓', failed: '退款未成功' },
    services: '订单服务', econtract: '电子合同', signed: '已签署', access: '入仓指引', renew: '续租', renewProgress: '续租进度', canApply: '可申请',
    renewQuoted: '待确认续租', renewSubmitted: '报价确认中',
    exit: '退仓', exitProgress: '退仓进度', exitSubmitted: '已提交', exitInspect: '待验仓', exitFailed: '需重新验仓', exitPassed: '验仓通过', unsubscribe: '退订 / 退仓',
    depositProgress: '押金进度', invoice: '申请发票', invoiceApplying: '已提交', invoiceIssued: '已开具', invoiceFailed: '开票未成功',
    cancelOrder: '取消订单', payable: '本次应付',
    btnPay: '继续支付', btnPaying: '支付确认中', btnRestart: '重新找仓', btnIdentity: '完成实名认证', btnRenew: '办理续租', btnRenewQuote: '确认续租报价', btnRenewProgress: '查看续租进度',
    btnExitProgress: '查看退仓进度', btnInspect: '查看验仓进度', btnDeposit: '查看押金进度', btnExit: '办理退仓', btnAgain: '再次找仓',
    btnReinspect: '重新申请验仓', btnToInspect: '去申请验仓', btnIdentityRetry: '重新提交实名认证', btnRenewPay: '继续支付续租费用', btnCall: '联系门店',
    payingTitle: '正在确认支付结果', payingDesc: '请勿关闭页面，确认后自动更新订单状态。'
  },
  orders: { all: '全部订单', sort: '按最近订单排序', empty: '暂无订单记录', emptySub: '', goStores: '去附近门店', loginTip: '登录后查看订单', login: '登录' }, // FIX-01 R-21：空态说明句与「去附近门店」按钮同义，删；未登录时标题直接写「登录后查看订单」（C-20）
  agreement: {
    pendingTitle: '协议正文暂未上线', pendingDesc: '需要了解协议内容？', contact: '联系客服', toc: '目录', fine: '如对协议内容有疑问，请联系客服。',
    version: '版本', effective: '生效日期'
  },
  task: { // mk-task-card
    kicker: { pending: '当前订单', payment_failed: '当前订单', expired: '订单状态', cancelled: '订单状态', identity: '入仓服务', upcoming: '入仓服务', active: '我的仓位', expiring: '我的仓位', renewal: '我的仓位', renewal_pending: '我的仓位', returning: '退仓服务', inspection: '退仓服务', expired_lease: '退仓服务', refund: '押金服务' },
    title: { pending: '订单待支付', payment_failed: '支付未成功，订单为您保留', expired: '订单已超时', cancelled: '订单已取消', identity: '入仓前需完成实名认证', upcoming: '入仓准备', active: '我的在租仓位', expiring: '租期即将到期', renewal: '续租报价待确认', renewal_pending: '续租申请处理中', returning: '退仓处理中', inspection: '等待门店验仓', expired_lease: '租期已到期', refund: '押金处理中',
      // FIX-01 A-02 / A-03 / A-06 / C-09：阶段内单列的几种情况（键同 services/order-view.js variant）
      refund_failed: '押金处理中', inspect_failed: '验仓未通过', exit_clearing: '退仓已提交', identity_mismatch: '实名认证未通过', renewal_pay: '续租费用待支付', renewal_pay_failed: '续租付款未成功' },
    badge: { payment_failed: '支付未成功', identity: '待办理', upcoming: '已支付', active: '租用中', expiring: '需关注', renewal: '待确认', renewal_pending: '报价确认中', returning: '办理中', inspection: '待验仓', expired_lease: '待办理', refund: '退款处理中',
      refund_failed: '退款未成功', inspect_failed: '需重新验仓', exit_clearing: '待清空', identity_mismatch: '需重新提交', renewal_pay: '待支付', renewal_pay_failed: '待支付' },
    left: '剩余 ',
    fact: { payable: '本次应付', payLeft: '支付剩余时间', startPlan: '计划起租', access: '存取时间', leaseEnd: '租期至', leftTerm: '剩余租期', curEnd: '当前租期至', renewQuote: '续租报价', quoteLeft: '报价剩余时间', leaseDeadline: '租期截止',
      clearPlan: '计划取空', inspectResult: '验仓结果', depositState: '押金进度', depositAbnormal: '处理异常', depositRefunding: '退款处理中', overdue: '已超出', renewPayable: '续租应付' },
    btn: { pay: '继续支付', fees: '费用明细', swapUnit: '更换仓位', restart: '重新找仓', identity: '完成实名认证', navigate: '门店导航', access: '入仓指引', unlock: '一键开锁', renew: '办理续租', renewQuote: '确认续租报价', renewProgress: '查看续租进度', exitProgress: '查看退仓进度', exit: '办理退仓', deposit: '查看押金进度', order: '查看订单',
      reinspect: '重新申请验仓', toInspect: '去申请验仓', identityRetry: '重新提交认证', renewPay: '支付续租费用', call: '联系门店' },
    svc: { renew: '续租', add: '加租仓位', more: '更多服务', notice: '门店使用须知' },
    help: {
      pending: ['付款帮助', '关闭支付窗口不会取消订单；请在付款有效期内继续支付。'],
      payment_failed: ['付款帮助', '订单与仓位保留至支付截止时间，截止前可继续支付。'],
      identity: ['入仓前准备', '这笔订单下单时未完成实名认证，完成后起租日起可入仓存取。'],
      upcoming: ['首次入仓须知', '起租日开放存取。'], // FIX-01 R-21：后半句与「门店导航」「入仓指引」按钮同义，删
      expiring: ['到期办理提醒', '到期前可办理续租；退仓时需清空并申请验仓。'],
      renewal: ['续租办理提醒', '续租报价 24 小时内有效，过期后按常规折扣价续租。'],
      renewal_pending: ['续租办理提醒', '续租报价 24 小时内有效，过期后按常规折扣价续租。'],
      returning: ['退仓与验仓', '仓内物品清空后申请验仓，押金以审核结果为准。'],
      inspection: ['退仓与验仓', '门店将在 {n} 天内完成验仓，押金以验仓结果为准。'], // {n} = core/config-after.js sla.inspectDays（R-02）
      expired_lease: ['退押金办理', '先完成退仓和门店验仓，再办理押金退还。'],
      // FIX-01 R-21：原 expired「原订单已失效，重新选择仓位后再付款。」、refund「押金退还进度可在订单详情查看。」与紧邻按钮同义，删
      identity_mismatch: ['认证未通过', '上次提交的实名认证未通过，姓名与身份证号需与证件一致。'],
      inspect_failed: ['未通过原因', ''], // 原因由后端给，没有时不显示这一行
      renewal_pay: ['续租办理提醒', '付款完成后新租期生效。'], renewal_pay_failed: ['续租办理提醒', '续租尚未生效，报价有效期内可继续支付。']
    },
    noOrder: { selected: '继续确认用仓', selectedBtn: '查看已选仓位', booking: '已收到您的用仓需求', bookingBtn: '查看预约' }, // 没有订单时的简化卡（原先写死在组件里）
    viewNotice: '查看须知 ›', others: ['另有 ', ' 间在租仓位，请在订单中查看。'],
    todoPending: '待支付订单', todoPayable: '本次应付 ', todoLeft: '，剩余 ', todoFailed: '支付未成功，订单保留中',
    todoLead: '预约用仓', todoLeadIn: '已提交，预计 10 分钟内与您联系', todoLeadOff: '已收到，顾问上班后将优先联系您',
    todoFind: '找仓进度', todoFindTail: '，查看推荐仓位', todoMore: ['还有 ', ' 项待办']
  }
};
