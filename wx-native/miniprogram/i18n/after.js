// 租后域界面文字（第 3 批）。照冻结稿 W27 原文（pages/w4-render.js、w6-render.js、w7f-render.js、w14.js、w26-sub.js 与 03_UI_Text_Table.csv）。
// 带 {x} 的句子由 core/after.js 的 fill() 代入。合同口径短句取自冻结稿 model/mk-contract-text.json 的 ui 字段（界面不写比例、倍数与处置后果，D-113）。
// 标「自写」的是冻结稿没有、本批补的句子，待确认。
module.exports = {
  common: {
    orderNo: '订单号 {no}', leaseTo: '租期至 {d}', curLeaseTo: '当前租期至 {d}', totalMonths: '累计 {m}个月', planStart: '计划起租 {d}',
    backOrder: '返回订单详情', backOrders: '返回订单', callStore: '联系门店', viewAgreement: '查看协议', known: '知道了',
    submitting: '提交中…', submittingTag: '提交中', months: '{m}个月', perMonth: '{a}/月', calc: '{a}/月 × {m}个月', about: '约 {a}',
    emptyTitle: '没有可办理租后服务的订单', emptySub: '请从「订单」进入。',
    fail: { reason: '原因', note: '说明', noteText: '以门店 / 顾问告知为准', can: '您可以' },
    callFail: '拨号未成功，请稍后再试',          // 自写
    opFail: '操作未成功，请稍后再试',            // 自写
    subOn: '开启通知'
  },
  renew: {
    head: { form: '申请续租', submitting: '申请续租', quote_pending: '门店正在确认报价', quote_ready: '续租报价待确认', quote_expired: '续租报价已过期', payment_pending: '续租费用待支付', payment_failed: '续租付款未成功', cancelled: '续租付款已暂缓', completed: '续租已生效', unavailable: '暂不能续租' },
    tag: { form: '可申请', submitting: '提交中', quote_pending: '报价确认中', quote_ready: '待确认', quote_expired: '报价已过期', payment_pending: '待支付', payment_failed: '待支付', cancelled: '待支付', completed: '已完成', unavailable: '不可办理' },
    steps: ['提交续租需求', '门店确认报价', '确认续租方案', '支付续租费用', '新租期生效'],
    progress: '续租进度', stepMonths: '续租 {m}个月', stepExpired: '报价已过期', stepDone: '新租期至 {d} · 累计 {m}个月',
    monthsTitle: '续租月数', monthsLabel: '续租', monthsRule: '可续租 1–{max}个月，累计租期不超过 {cap} 个月',
    feeTitle: '续租费用', quoteTitle: '续租报价', rent: '续租租金', storeQuote: '门店报价', regular: '常规折扣价', current: '现行折扣价', oldQuote: '原门店报价', expiredSub: '已过期',
    pendingAmount: '提交后由门店报价', barPending: '报价待门店确认', barLabel: '续租 {m}个月', barKeep: '续租 {m}个月 · 沿用 {z}',
    ruleNormal: '续租价格以门店确认的报价为准。', ruleKeep: '金额以门店确认的报价为准。',
    keepForm: '首次续租沿用您原订单的 {z}，比现在 {m} 个月的 {p}每月少 {less}。',
    keepQuote: '首次续租沿用您原订单的 {z}，比现在 {m} 个月的 {p}每月少 {less}，本次共少 {total}。',
    payable: '续租应付', paid: '已付',
    validTo: '报价有效至', validLeft: '{t} · 剩余 {c}', payDeadline: '付款截止', sameAsQuote: '与报价有效期相同', newEnd: '新租期至', joint: '租期衔接', jointText: '自当前租期截止日 {d} 顺延 {m}个月，不中断',
    ttl: '报价 {h} 小时内有效。', ttlCapped: '距当前租期到期不足 {h} 小时，报价有效期截至租期到期。', afterExpire: '过期后按常规折扣价续租。', effect: '付款完成后新租期生效。',
    expiredNote: '续租报价已过期，可按常规折扣价续租。', expiredKeepNote: '续租报价已过期。首次续租仍可沿用原订单的 {z}，重新提交后由门店确认。',
    pendingNote: '门店确认报价后会通知您。', pendingNoteMsg: '门店确认报价后可在「消息」查看。', subOk: '已开启微信通知。', subNo: '未开启微信通知。',
    unavailableExit: '退仓处理中的订单不能续租。',
    unavailableEnded: '租赁已结束的订单不能续租。',            // 自写
    unavailableMax: '累计租期已满 {cap} 个月，不能再续租。',   // 自写
    failTitle: '续租付款未成功', failFixes: '重新支付 · 更换支付方式',
    submit: '提交续租需求', resubmit: '重新提交续租需求', confirmPay: '确认并支付', renewRegular: '按常规折扣续租', skip: '暂不续租', payLater: '稍后支付', payNow: '立即付款', repay: '重新支付', continuePay: '继续付款', invoice: '申请发票',
    paySheet: '支付流程', payConfirm: '确认付款',
    expiredToast: '报价已过期，请重新确认'                     // 自写
  },
  exit: {
    head: { form: '办理退仓', form_expired: '租期已到期', submitting: '办理退仓', requested: '退仓已提交', waiting: '等待门店验仓', failed: '验仓未通过', passed: '验仓通过', not_started: '订单尚未起租' },
    tag: { form: '可办理', form_expired: '待办理', submitting: '提交中', requested: '已提交', waiting: '待验仓', failed: '需重新验仓', passed: '验仓通过', not_started: '待起租' },
    steps: ['提交退仓安排', '清空仓位并申请验仓', '门店验仓', '押金退款处理'], progress: '退仓进度',
    type: { expiry: '到期退仓', early: '提前退仓' }, stepPlan: '{t} · 计划取空 {d}',
    overdueTitle: '请办理续租或退仓', overdueText: '租期已到，超出的天数按协议约定计费。',
    arrange: '退仓安排', typeLabel: '退仓类型', dateLabel: '计划取空日期', datePlaceholder: '选择日期',
    ruleExpiry: '到期退仓的取空日期不早于租期结束日 {d}。', ruleExpired: '租期已到期，取空日期从今天起选。', ruleEarly: '提前退仓按实际使用时间结算，已享优惠按实际使用周期重新核算，具体以协议约定为准。',
    deposit: '订单押金', depositBack: '押金退还', depositBackText: '验仓通过后进入退款处理',
    submit: '提交退仓安排', renew: '办理续租',
    confirmTitle: '确认提交退仓？', estimate: '预计结算费用', settle: '费用结算', settleText: '提前退仓请先与门店确认，费用按实际使用时间及协议约定结算。', promo: '已享优惠', promoText: '已享优惠按实际使用周期重新核算',
    confirmText: '提交后进入退仓流程；如需继续用仓，请先办理续租。', think: '再想想', confirm: '确认提交',
    beforeInspect: '申请验仓前', beforeInspectText: '请确认物品全部取出、仓位清空并锁好。', inspect: '确认清空并申请验仓', reinspect: '重新申请验仓',
    waitingNote: '验仓由门店完成，通过后押金进入退款处理。', subOk: '已开启微信通知，验仓有结果时会提醒您。', subNo: '未开启微信通知，可在「消息」查看验仓结果。',
    failTitle: '验仓未通过', failFixes: '重新清空仓位 · 再次申请验仓', viewDeposit: '查看押金进度',
    cancelTitle: '起租前退订', cancelRule: '退订说明', cancelRuleText: '签署后 7 日内且未使用仓位的，可联系门店办理退订', cancelPaid: '已付租金', cancelPaidText: '按协议结算后退还', cancelDeposit: '押金', cancelWay: '办理方式', cancelWayText: '联系门店办理', cancelFoot: '起租后可在本页办理退仓。'
  },
  deposit: {
    head: '订单押金', tag: { held: '押金保管中', waiting: '待验仓', refund_pending: '退款处理中', refund_failed: '退款未成功', refunded: '已退还', refunded_partial: '已退还' },
    amountLabel: '押金 · 1个月月租', progress: '押金进度', steps: ['支付押金', '押金保管中', '验仓', '退款处理', '退还完成'], paidWith: '随下单支付 · {d}',
    exitTag: { requested: '已提交', waiting: '待验仓', failed: '需重新验仓', passed: '验仓通过' },
    settle: '押金结算', orderDeposit: '订单押金', due: '待结费用', back: '实际退还', dueNote: '待结费用明细可向门店查询。',
    info: '退还说明', time: '退还时限', timeText: '验仓通过后 15 个工作日内', method: '退还方式', methodText: '退至您指定的银行账户或原路退回；信用卡付款原路退回约需 1 个月',
    deduct: '结算说明', deductText: '验仓时仓位与配件完好、物品已取空的，押金按约定退还；如有待结费用，结算后退还余额', more: '查看退还方式与结算说明 ›',
    failTitle: '退款未成功', failFixes: '核对收款账户 · 联系门店重新发起',
    viewProgress: '查看处理进度', sheet: '处理进度', sheetSteps: ['验仓通过', '退款处理中', '退还完成'], storeHandling: '门店处理中'
  },
  invoice: {
    head: { form: '申请发票', submitted: '发票申请已提交', processing: '发票开具中', issued: '发票已开具', issue_failed: '开票未成功' },
    tag: { none: '可申请', submitted: '已提交', processing: '申请处理中', issued: '已开具', failed: '开票未成功' },
    payType: { INITIAL: '下单支付', RENEWAL: '续租费用' }, split: { rent: '租金', deposit: '押金', fee: '管理费', renew: '续租租金' },
    kind: { personal: '个人', enterprise: '企业' },
    records: '申请记录', payments: '付款记录', noPayments: '暂无可申请的付款记录。',
    amount: '可开票金额', amountText: '以开票结果为准', includeDeposit: '是否含押金', content: '开票内容', contentText: '可选择开具技术服务费发票或仓储服务费发票', deadline: '申请期限', deadlineText: '建议在合同结束后 30 个自然日内申请',
    info: '发票信息', kindLabel: '发票类型', title: '抬头', titlePh: { personal: '请输入姓名', enterprise: '请输入企业名称' }, tax: '企业税号', taxPh: '请输入纳税人识别号', email: '邮箱', emailPh: '请输入邮箱', emailErr: '请输入有效的邮箱地址',
    titles: '管理开票抬头', batch: '批量开票', batchSub: '多笔付款合并申请',
    submit: '提交发票申请', retry: '更正资料后重新提交',
    failTitle: '开票未成功', failFixes: '抬头 · 企业税号 · 邮箱', failKeep: '原申请记录已保留，更正后可重新提交。',
    file: '发票文件', form: '发票形式', formText: '电子发票', toEmail: '接收邮箱', send: '发送到邮箱', download: '下载发票',
    pickPayment: '选择付款记录',
    sent: '已发送到 {e}',                                   // 自写
    sendFail: '发送未成功，请稍后再试',                     // 自写
    downloadFail: '发票文件暂时无法下载，请稍后再试'        // 自写
  },
  econtract: {
    title: '自助式设备设施使用协议', signed: '已签署', sub: '签署后生成，内容以签署时的协议为准。',
    signInfo: '签署信息', partyA: '提供方（甲方）', partyB: '使用方（乙方）', idNo: '证件号码', signedAt: '签署时间', way: '签署方式', wayText: '线上签署',
    orderInfo: '订单与仓位', orderNo: '订单号', store: '门店', unit: '仓位', term: '租期', period: '起止日期', periodText: '{a} 至 {b}',
    docs: '协议文件', docUsage: '《迷你考拉自助式设备设施使用协议》', docNotice: '《迷你考拉用户使用告知书》', docList: '违法违规违禁物品清单', confirmed: '已确认', attach: '附件',
    foot: '如对合同内容有疑问，请联系客服 {tel}。', full: '查看协议全文',
    emptyTitle: '暂无电子合同', emptySub: '签署使用协议并完成下单后，可在这里查看。'
  },
  identity: {
    title: '实名认证', tag: { none: '待认证', pending: '认证中', verified: '已通过', mismatch: '未通过，可重试' },
    steps: ['提交身份资料', '认证中', '认证通过'], sub: { none: '下单时未完成的，请在起租前完成', pending: '资料已提交，请等待认证结果。', mismatch: '未通过，可重试', verified: '可查看入仓指引' },
    note: '这笔订单下单时未完成实名认证，完成后起租日起可入仓存取。', // 交接 v1.0 §4.6-13 统一说明句
    start: '开始认证', retry: '重新提交资料', viewAccess: '查看入仓指引',
    sheet: '提交身份资料', name: '姓名', namePh: '请填写姓名', nameErr: '请填写有效姓名', idNo: '证件号码', idPh: '请填写身份证号码', idErr: '请填写18位证件号码', submit: '提交认证',
    emptyTitle: '无法打开该服务', emptySub: '需要已付款订单才能办理此项服务', viewOrders: '查看我的订单'
  },
  access: {
    arrival: '到店与进仓', storeGuide: '门店到店指引', path: '进仓路径', navigate: '到店导航',
    address: '门店地址', hours: '存取时间',                 // 自写：门店没有到店资料时只显示这两行
    stepsTitle: '入仓步骤', stepArrive: '到达门店', stepHours: '存取时间 {h}', stepIdentity: '完成实名认证', stepIdentitySub: '下单时未完成的，请在起租前完成',
    stepStart: '起租后查看入仓信息', stepStartDay: '起租日 {d}', stepOpen: '可查看仓位开门信息', stepClose: '存取后检查仓门关闭',
    viewOpen: '查看仓位开门信息', doIdentity: '完成实名认证',
    beforeTitle: '尚未到起租时间', beforeText: '入仓信息将在起租后开放。',
    status: '当前状态', lease: { upcoming: '待起租', active: '租用中', returning: '退仓处理中', ended: '已退仓', expired: '租期已到期' },
    unlockTitle: '仓位开锁', unlockText: '当前仓门设备暂未接入。如需存取，请联系门店协助。',
    copied: '门店地址已复制，可在地图中搜索',               // 自写：门店没有坐标或地图打不开时
    emptyTitle: '无法打开该服务', emptySub: '需要已付款订单才能办理此项服务', viewOrders: '查看我的订单'
  },
  messages: {
    empty: '暂无消息', fallback: '消息',
    cat: {
      renew: { tag: '续租', link: '查看续租' }, exit: { tag: '退仓', link: '查看退仓进度' }, deposit: { tag: '押金', link: '查看押金进度' }, invoice: { tag: '发票', link: '查看开票进度' },
      identity: { tag: '实名认证', link: '查看认证进度' }, access: { tag: '入仓', link: '查看入仓指引' }, transport: { tag: '运输', link: '查看运输预约' }, lead: { tag: '咨询', link: '查看预约记录' },
      order: { tag: '订单', link: '查看订单' }, notice: { tag: '通知', link: '' }
    },
    // 演示数据适配器写入的消息标题。第一句照冻结稿；其余冻结稿没有样例，自写。
    demo: {
      identityTodo: '付款完成，请完成实名认证',
      identityOk: '实名认证已通过，起租日起可入仓存取',
      identityFail: '实名认证未通过，请重新提交资料',
      renewQuote: '续租报价已出，请在有效期内确认',
      renewPaid: '续租已生效',
      exitRequested: '退仓已提交，清空仓位后请申请验仓',
      inspectPassed: '验仓通过，押金进入退款处理',
      inspectFailed: '验仓未通过，请重新清空仓位后再次申请',
      depositRefunded: '押金已退还',
      depositFailed: '押金退款未成功，门店正在处理',
      invoiceIssued: '发票已开具',
      invoiceFailed: '发票开具未成功，请核对开票信息后重新提交'
    }
  }
};
