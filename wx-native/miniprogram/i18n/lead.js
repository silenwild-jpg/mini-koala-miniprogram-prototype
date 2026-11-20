// 线索域界面文字（预约用仓、顾问咨询、企业、考拉E存、运输与搬运、联系顾问、预约记录、找仓进度）。
// 照冻结稿原文；标「自写」的是冻结稿没有、开发补的句子。用词遵守交接 v1.0 §4.11。
const C = require('../core/config');
const SALES = C.matching.salesOnlyFromM3;
const HOURS = C.service.hourStart + ':00–' + C.service.hourEnd + ':00';
const ack = { // D-95 / D-106 张坤给定原句
  inHours: '预计 10 分钟内与您联系',
  offHours: '已收到，顾问上班后将优先联系您',
  hoursNote: '服务时段：每日 ' + HOURS,
  notLock: '提交后由顾问电话确认，不锁定仓位与价格',
  both: '预计 10 分钟内与您联系；非服务时段提交的，顾问上班后将优先联系您。',
  submitted: '已提交', leadNo: '需求编号 '
};
// 带参数的句子单独放在 fn 里：页面 data 只放纯字符串（函数不能进 setData）
const fn = {
  phoneSheetNote: (what) => '只修改本次' + what + '的联系电话，不会更换您的登录手机号。',
  phoneFine: (what) => '该号码仅作为本次' + what + '的联系电话，不会更换您的登录手机号。',
  resend: (n) => n + 's 后重发',
  areasPicked: (n) => '已选 ' + n + ' 个区域，顾问会按这些区域一并安排方案。',
  areasList: (city) => '列出的是' + city + '已有门店的区域。',
  matchNote: (v) => '找仓时按 ' + v + 'm³ 匹配，可修改。'
};
module.exports = {
  ack, fn,
  common: {
    viewNeeds: '查看预约记录', goFind: '继续找仓', backMine: '返回我的', cancel: '取消', confirm: '确定', modify: '修改', done: '完成',
    optional: '（可选）', optionalFill: '（选填）', multi: '（可多选）', required: '*', pick: '请选择', pickDate: '选择日期', unsure: '暂不确定', dash: '—',
    m3: 'm³', m2: '㎡', months: '个月', salesLabel: SALES + 'm³ 及以上',
    retry: '重试提交', recheck: '核对提交结果',
    failedTitle: '暂时无法提交', failedMsg: '暂时无法提交，请重试或返回修改。',
    unknownTitle: '提交结果暂未确认', unknownMsg: '提交结果暂未确认，请勿重复提交。',
    checkForm: '请检查已填写的信息', dateSheet: '选择预计用仓日期'
  },
  phone: {
    label: '联系电话', useWechat: '使用微信手机号', hint: '授权后同时完成登录，用于顾问电话联系您。', verified: '已验证',
    sheetTitle: '修改联系电话',
    wechatPhone: '微信手机号', other: '使用其他手机号', otherSub: '需短信验证', otherPhone: '其他手机号',
    smsTitle: '验证其他手机号', phoneLabel: '手机号', phonePh: '请输入手机号', codeLabel: '验证码', codePh: '请输入 6 位验证码',
    send: '获取验证码', sent: '验证码已发送，5 分钟内有效', ok: '确认',
    whatBooking: '预约', whatBusiness: '咨询'
  },
  booking: {
    modes: {
      booking: { title: '预约用仓', h1: '告诉我们您的用仓需求', p: ack.notLock, submit: '预约用仓' },
      advisor: { title: '顾问咨询', h1: '告诉我们您的用仓需求', p: '留下联系电话，顾问来电了解需求并给出方案', submit: '提交咨询需求' },
      business: { title: '企业用仓咨询', h1: '告诉我们企业的用仓需求', p: '多仓、长期或需要开票，由顾问按企业需求配仓', submit: '提交咨询需求' }
    },
    toBusinessTip: '需要填写完整企业资料？', toBusiness: '前往企业用仓需求',
    storeTag: '意向门店',
    address: '用仓位置', addressPh: '填写用仓位置，如：小区、街道和楼栋',
    helpBooking: '用仓位置、联系电话必填；其他信息可选。', helpAdvisor: '联系电话必填；用仓位置和以下信息可选。',
    locate: '使用当前位置',
    located: '已获取当前位置，请补充小区、街道和楼栋', // 自写：地点联想属 B 期，现在只能记录定位点
    locateFail: '未获取位置，请手动填写用仓位置',   // 自写
    when: '预计用仓时间', hints: ['尽快', '明天', '近一周', '暂不确定'],
    need: '用仓需求', items: '存放物品', capacity: '意向容量', duration: '预计租期',
    itemOptions: ['日常物品', '搬家家具', '文件资料', '暂不确定'],
    capPh: '输入容量，如 3.5', capNote: '估算值，以实际仓位为准；' + SALES + 'm³ 及以上由顾问配仓。',
    salesNote: SALES + 'm³ 及以上由顾问为您配仓。',
    capErrM3: '请填写0.5m³–200㎡，手填容量最多两位小数', // 与企业页同句（D-177 原话）
    capErrM2: '请填写 ' + C.requirement.areaMinM2 + '–' + C.requirement.areaMaxM2 + '㎡，最多一位小数', // 自写
    note: '其他需求或备注', notePh: '例如：搬运需求、特殊物品、预算范围等...',
    payNote: '提交后' + ack.inHours + '，暂不产生订单',
    submitting: '正在提交',
    errPhone: '请填写有效联系电话', errAddress: '请填写用仓位置（不超过120字）',
    infoTitle: '已提交的信息',
    subOk: '已开启微信通知，预约有进展时会提醒您。', subNo: '未开启微信通知，可在「消息」查看预约进度。', subAsk: '开启通知'
  },
  business: {
    steps: ['用仓需求', '联系方式'],
    title: '商家 / 企业用仓', intro: '多仓、长期或用量较大的商家与企业用仓，由顾问为您配仓。',
    benefits: ['可开发票', '专属顾问', '长期 / 多仓可协助', '搬运方案可确认'],
    location: '用仓位置', locationPh: '城市、区域或详细地址',
    addArea: '多个区域都需要仓位？添加区域', areas: '还需要用仓的区域',
    otherAreas: '其他区域：', otherAreasJoin: '；其他区域：',
    size: '大概需要多大空间', custom: '自定义', sizePh: '请输入预计体积',
    salesNote: SALES + 'm³ 及以上由顾问配仓。',
    estimate: '不知道多大？使用空间估算',
    term: '租用时长', types: '主要存储类型', typeOptions: ['库存', '样品', '文件', '设备', '项目物料', '其他'], typeOther: '其他', typeOtherPh: '请补充存储类型',
    move: '搬入时是否需要协助', moveOptions: ['需要', '待确认', '不需要'], moveDefault: '待确认', moveYes: '需要',
    moveNoteTitle: '搬运方案待确认', moveNote: '将结合物品、用仓位置及门店条件确认搬运方案。',
    sumLabel: '用仓需求', sizeNone: '容量未选', sizeEmpty: '容量未填', termNone: '租期未选',
    name: '您的称呼', namePh: '请输入您的称呼', company: '公司 / 商家名称', companyPh: '请输入名称',
    phonePh: '用于顾问联系', when: '预计用仓时间',
    notes: '补充信息', notesPh: '补充用仓信息，方便我们更准确的理解您的需求，高效协助配仓',
    payNote: '提交后' + ack.inHours,
    browse: '查看可选仓位', next: '下一步：联系方式', prev: '上一步', submit: '邀请顾问协助', update: '保存企业需求更新', saving: '正在保存…',
    blockedTitle: '这条需求已不存在或已撤回', blockedMsg: '可以重新提交一条需求。', newLead: '新建企业需求',
    editTitle: '正在补充已有企业需求', editMsg: '保存后将更新这条需求。',
    restoredTitle: '已恢复上次填写的信息', restoredMsg: '请核对后继续。',
    failedTitle: '暂时无法保存',
    updatedTitle: '企业需求已更新', offPrefix: '非服务时段提交的：', gotIt: '知道了',
    err: {
      size: '请填写0.5m³–200㎡，手填容量最多两位小数', // D-177：范围文字原话照写
      term: '租期请选择1–60个月的整数', browseSize: '请填写或选择所需空间', browseTerm: '请选择租期', browseSales: SALES + 'm³ 及以上由顾问配仓，请直接提交需求',
      phone: '请填写有效的联系电话，国际号码请带国家区号', date: '请选择有效的预计用仓日期', capacity: '请填写0.5m³–200㎡的有效容量',
      notFound: '这条需求已不存在，请从「预约用仓」重新打开，或重新提交', withdrawn: '这条需求已撤回，可重新提交'
    }
  },
  estore: {
    kicker: '上门取送', title: '考拉E存', lead: '不用自己到店：预约上门取件、入库保管，需要时再预约送回。',
    cmpTitle: '与自助仓怎么选', self: '自助仓', selfList: ['自己到店存取', '按仓位容量和租期计费', '线上选仓、下单、付款'], goSelf: '去找自助仓',
    estoreList: ['上门取件与送回', '方案与费用由顾问确认', '提交需求后电话沟通'],
    flowTitle: '服务流程',
    flow: [{ t: '提交需求', s: '填写地址、物品和预计存放时间' }, { t: '顾问确认', s: ack.inHours + '，确认方案与费用' }, { t: '上门取件', s: '' }, { t: '入库保管', s: '' }, { t: '预约送回', s: '' }],
    infoTitle: '服务说明',
    info: [ // 合同文本 estore.*（界面短句）
      { k: '服务范围', v: '上门取送、便捷寄存、灵活召回：可按需召回部分或全部物品，最小 1 个包裹起，送达同城指定地址。物品由仓库集中保管，取用通过召回配送完成' },
      { k: '收费方式', v: '仓储服务费 + 运输费，按套餐下单；搬运、拆装、包装等按需另计，超出套餐的部分可升级套餐' },
      { k: '物品限制', v: '请自行打包；易损物品请提前告知并在外包装标注', link: '查看禁存清单' },
      { k: '运输', v: '由合作承运方上门取送（目前合作：顺丰、蓝犀牛、闪送、京东）' },
      { k: '套餐与价格', v: '请咨询客服', mute: true } // 待业务：E存套餐价格
    ],
    fine: '完整条款见《迷你考拉自助式设备设施使用协议》，具体方案以顾问确认为准。' + ack.hoursNote + '。',
    cta: '咨询考拉E存'
  },
  transport: {
    note: '下单前即可预约运输 / 搬运，由顾问确认方案与费用，不计入本次应付。',
    address: '取送地址', addressPh: '请填写取送地址', date: '期望运输日期', datePh: '请选择日期', phone: '联系电话', phonePh: '请填写手机号',
    submit: '提交运输预约', pickTitle: '选择关联订单', records: '运输记录', preTitle: '运输预约', pending: '待顾问确认', goFind: '去找仓',
    orderNo: '订单号 ',
    toastIn: '已提交，' + ack.inHours, toastOff: '已提交，顾问上班后将优先联系您',
    errAddress: '请填写取送地址', errDate: '请选择有效的运输日期', errPhone: '请填写有效联系电话',
    freeTitle: '免费运输 1 次', freeScope: '含 1 次车辆运输费；搬运、拆装、楼梯费另计', freeArrange: '顾问联系安排', // D-173
    // 自写（由 D-173 条件与冻结稿范围句拼成）：下单前预约时说明免费运输的条件
    freeRule: '用仓位置距门店 ' + C.freeTransport.minKm + 'km 及以上、租期满 ' + C.freeTransport.minTerm + ' 个月的订单可免费运输 1 次（含 1 次车辆运输费；搬运、拆装、楼梯费另计）。'
  },
  support: {
    orderTitle: '订单咨询', direct: '直接联系', tel: '电话咨询', call: '拨打电话',
    callFail: '未能拨出电话，请稍后再试', // 自写
    formTitle: '留言给顾问', type: '咨询类型', types: [{ k: 'general', t: '选仓与服务咨询' }, { k: 'order', t: '订单与租后' }, { k: 'moving', t: '搬运服务' }],
    text: '咨询内容', textPh: '请填写咨询内容', errText: '请填写咨询内容',
    others: '预约用仓', personal: '个人用仓需求', enterprise: '企业用仓需求', submit: '提交咨询', savedTitle: '已提交内容',
    loginTip: '授权后同时完成登录，用于顾问电话联系您。'
  },
  needs: {
    emptyTitle: '暂无预约记录', emptySub: '预约用仓后，可在这里查看受理进度。', book: '预约用仓',
    titles: { enterprise: '企业用仓需求', estore: '考拉E存咨询', advisor: '顾问咨询需求', booking: '个人用仓需求' },
    status: { submitted: '已提交，待顾问联系', withdrawn: '已撤回' },
    capNone: '容量待补充', termNone: '租期待补充', addrNone: '地址待补充', addrOptional: '未填写用仓位置（选填）', notePrefix: '备注：',
    edit: '修改地址与备注', fill: '补充企业资料', more: '更多', withdraw: '撤回',
    moreTitle: '更多操作', withdrawNeed: '撤回需求', contact: '联系顾问',
    editTitle: '修改需求', address: '用仓位置', addressPh: '请填写用仓位置', note: '备注', notePh: '补充说明（可选）',
    editRule: '容量、租期和联系方式保留；企业资料可在「补充企业资料」里修改。', save: '保存修改',
    withdrawTitle: '撤回需求', withdrawMsg: '撤回后不再作为有效需求展示。', withdrawNo: '暂不撤回', withdrawYes: '确认撤回',
    errAddress: '请填写用仓位置（不超过120字）', errWithdrawn: '该需求已撤回',
    saveFail: '暂时无法保存，请稍后重试' // 自写
  },
  progress: {
    kicker: '找仓进度', emptyTitle: '尚无保存的找仓需求', estimate: '估大小算价格', findStores: '找附近门店',
    reference: '最近参考', refind: '按此需求重新找仓',
    selected: '已选仓位', quoteTitle: '报价方案', quoteValid: '当前报价', quoteExpired: '已过期',
    rent: '整期租金', coupon: '优惠券', payable: '本次应付', toConfirm: '去确认订单', requote: '重新报价'
  }
};
