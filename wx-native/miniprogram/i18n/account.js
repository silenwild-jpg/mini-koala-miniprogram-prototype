// 账户域界面文字（我的、收藏、优惠与权益、个人信息、推荐有礼、关于、企业认证、开票抬头、批量开票）。
// 文案照冻结稿 W27 原文（pages/w6-render.js、w7f-render.js、w9-auth.js）；行尾标「自写」的是冻结稿没有、本批补的。
module.exports = {
  common: {
    loginRegister: '登录 / 注册', loginFirst: '登录后查看', // 自写：loginFirst
    cancel: '取消', gotIt: '知道了', contactAdvisor: '联系顾问', viewOrders: '查看订单', backOrders: '返回订单',
    optional: '（可选）', submitting: '提交中…', saveFailed: '保存失败，请稍后重试', // 自写：saveFailed
    callFailed: '暂时无法拨号，请手动拨打 ' // 自写
  },
  mine: {
    signedTitle: '我的迷你考拉', guestTitle: '欢迎使用迷你考拉', guestSub: '查看订单与用仓服务', signedSub: '已登录', profile: '个人信息',
    newCard: { kicker: '尚未用仓', title: '找一个合适的仓位', sub: '可从附近门店开始', cta: '找附近门店' },
    assets: { title: '我的仓位', allPrefix: '查看全部 ', allSuffix: '处', until: '至 ', start: '起租 ', monthUnit: '个月' },
    stage: { paid_before_start: '待入仓', active: '租用中', expiring: '即将到期', exiting: '退仓处理中', overdue: '租期已到期' },
    progressNone: '尚无保存的需求', monthUnit: '个月', leadsSuffix: '条记录',
    groups: [
      { key: 'records', title: '我的记录', items: [{ k: 'NEEDS', icon: 'note-ink', t: '预约用仓', s: '查看已提交的预约' }, { k: 'PROGRESS', icon: 'flag-ink', t: '找仓进度', s: '' }] },
      { key: 'benefit', title: '服务与权益', items: [{ k: 'FAVORITES', icon: 'heart-ink', t: '我的收藏', s: '门店和仓位' }, { k: 'COUPONS', icon: 'ticket-ink', t: '优惠与权益', s: '查看可用权益' }, { k: 'MESSAGES', icon: 'msg-ink', t: '消息', s: '查看业务通知' }] },
      { key: 'finance', title: '账务与企业', items: [{ k: 'ENT_TITLES', icon: 'order-ink', t: '发票与抬头', s: '' }, { k: 'DEPOSIT', icon: 'shield-ink', t: '押金', s: '' }, { k: 'ENT_CERT', icon: 'building-ink', t: '企业认证', s: '' }] },
      { key: 'more', title: '更多服务', items: [{ k: 'TRANSPORT', icon: 'truck-ink', t: '运输与搬运', s: '下单前可预约' }, { k: 'REFERRAL', icon: 'gift-ink', t: '推荐有礼', s: '' }, { k: 'SUPPORT', icon: 'headset-ink', t: '联系顾问', s: '' }, { k: 'BRAND', icon: 'info-ink', t: '关于迷你考拉', s: '' }] }
    ]
  },
  favorites: {
    empty: '暂无收藏，可在门店详情收藏', findStores: '找附近门店', stores: '门店', units: '仓位',
    storeGone: '暂停营业', storeGoneSub: '可查看附近其他门店', unitGone: '已租出', unitGoneSub: ' · 可看同店其他仓位'
  },
  coupons: {
    notice: '租金券不抵扣押金和管理费；免费运输限用仓位置距门店 5km 及以上、租期满 6 个月的订单，含 1 次车辆运输费。',
    empty: '暂无可查看的优惠与权益', claim: '领取新客券', coupons: '优惠券', benefits: '服务权益',
    gateAmount: '登录后查看金额', validPrefix: '有效期 ', use: '去使用',
    couponStatus: { AVAILABLE: '可使用', SELECTED: '已选择', REDEEMED: '已使用', LOCKED: '已锁定', EXPIRED: '已过期', INVALID: '不可用' },
    benefitStatus: { ELIGIBILITY_PENDING: '下单时可用', ELIGIBLE: '可使用', RESERVED: '已锁定', FULFILLED: '已履约', INELIGIBLE: '不适用' },
    statusFallback: '办理中'
  },
  profile: {
    signedTitle: '我的迷你考拉', guestTitle: '欢迎使用迷你考拉', guestSub: '查看订单与用仓服务', signedSub: '已登录',
    section: '账户与联系方式', loginPhone: '登录手机号', notLoggedIn: '未登录', contactPhone: '联系手机号', contactEmpty: '未填写',
    editContact: '修改联系电话', changePhone: '更换登录手机号',
    noteSigned: '登录手机号验证一次后长期有效，更换时需短信验证。', noteGuest: '浏览门店无需登录；查看报价、预约和下单时登录即可。',
    privacySection: '账户与隐私', privacy: '隐私授权管理', deleteAccount: '注销账号', logout: '退出登录',
    contactSheet: { title: '填写联系电话', label: '手机号（支持国际区号）', placeholder: '请填写手机号', error: '请填写有效联系电话', save: '保存联系方式', saved: '联系方式已保存' }, // 自写：saved
    logoutDialog: { title: '退出登录？', desc: '退出后仍可浏览门店；查看报价、订单和下单时需要重新登录。', confirm: '退出登录' },
    privacySheet: {
      title: '隐私授权管理', location: '位置信息', phone: '手机号', identity: '实名信息',
      granted: '已授权', notGranted: '未授权', verified: '已认证', notVerified: '未认证', // 自写：notGranted、notVerified（冻结稿只画了已授权 / 已认证）
      toSetting: '去设置', settingFailed: '暂时无法打开设置，请在微信右上角「···」-「设置」里修改', // 自写：settingFailed
      contract: '查看隐私保护指引', contractFailed: '暂时无法打开隐私保护指引，请稍后重试', // 自写：两句
      // 以下两句是冻结稿初稿，法务未确认
      fine: '位置权限在微信「设置」里开关。撤回隐私授权后将退出登录，再次使用相关功能时会重新征得您的同意。',
      withdraw: '撤回隐私授权'
    },
    // 冻结稿初稿，法务未确认
    withdrawDialog: { title: '撤回隐私授权？', desc: '撤回后将退出登录。已签署的协议和租用中的订单不受影响。', confirm: '确认撤回' },
    // 冻结稿初稿，法务未确认
    deleteSheet: {
      title: '注销账号', lead: '满足以下条件后可申请注销：',
      conditions: ['没有租用中或待支付的订单', '押金已退还', '没有处理中的发票或退款'],
      fine: '注销后，登录手机号、优惠券、预约与收藏记录将被删除。', cancel: '暂不注销', confirm: '申请注销', done: '已提交注销申请'
    },
    // 冻结稿初稿，法务未确认（第二句为自写：冻结稿只画了「有租用中的订单」这一种拦截）
    deleteBlocked: { title: '暂时不能注销', activePrefix: '您有 ', activeSuffix: ' 个租用中的订单，退仓并结清后可申请注销。', other: '您有未结清的订单、押金或发票，结清后可申请注销。' },
    change: {
      title: '更换登录手机号', phoneLabel: '手机号', phonePlaceholder: '请输入手机号', codeLabel: '验证码', codePlaceholder: '请输入 6 位验证码',
      send: '获取验证码', resendSuffix: 's 后重发', sentHint: '验证码已发送，5 分钟内有效', submit: '确认更换',
      fine: '更换后使用新手机号登录，订单、优惠券和预约记录保留在当前账户。', done: '登录手机号已更换'
    },
    conflict: { title: '该手机号已绑定其他微信账号', descPrefix: '为保护账户和订单安全，不会自动合并账户。您可以换一个手机号，或联系客服 ', descSuffix: ' 处理。', service: '联系客服', retry: '换个手机号' }
  },
  referral: {
    section: '邀请好友', para: '邀请好友了解迷你考拉仓的仓储服务。', linkLabel: '分享链接', linkText: '小程序首页 · 我的邀请码', copy: '复制分享链接', copied: '链接已复制',
    copyFailed: '复制失败，请稍后重试', // 自写
    noticeTitle: '活动筹备中', noticeSub: '活动开始后，规则与奖励会在这里更新。', shareTitle: '迷你考拉仓' // 自写：shareTitle（转发卡片标题，用品牌名）
  },
  brand: {
    logo: '迷你考拉仓',
    pillars: [{ icon: 'shield-ink', t: '安全防护', s: '24小时监控' }, { icon: 'temp-ink', t: '恒温防潮', s: '智能除湿' }, { icon: 'headset-ink', t: '专属服务', s: '用仓问题协助' }, { icon: 'truck-ink', t: '上门搬运', s: '考拉E存服务' }],
    para: '为个人和企业提供自助仓储及用仓方案咨询。',
    howTitle: '如何选择', how: [{ n: '1', t: '填写容量或按物品估算' }, { n: '2', t: '主动选择租期并查看可用方案' }, { n: '3', t: '核对门店地址、设施和费用' }, { n: '4', t: '确认订单，付款后按指引办理入仓' }],
    storeTitle: '存放说明', storePara: '存放物品、承重、存取条件与服务范围，请在签约前向门店确认。易燃易爆、危险及法律禁止存储的物品不得入仓。',
    serviceTitle: '门店与服务', servicePara: '支持查看北京、上海、深圳、杭州、广州的门店资料；具体库存和服务以门店确认为准。',
    viewStores: '查看门店', contact: '联系顾问'
  },
  ent: {
    pending: '请咨询客服',
    cert: {
      noticeTitle: '认证后可使用', noticeSub: '企业开票抬头、多笔订单批量开票。认证不影响找仓和下单。',
      section: '企业资料', name: '企业名称', namePh: '请输入营业执照上的企业名称', tax: '统一社会信用代码', taxPh: '18 位代码', taxError: '请填写 18 位统一社会信用代码',
      license: '营业执照', upload: '上传营业执照照片', uploadedPrefix: '已上传 ', uploadedSuffix: ' 张', uploadFailed: '未能读取图片，请重试', // 自写：uploadFailed
      contactSection: '联系人', contact: '姓名', contactPh: '请输入联系人姓名', phone: '手机号', phonePh: '请输入手机号',
      needPrefix: '还需填写：', needNames: { name: '企业名称', tax: '统一社会信用代码', license: '营业执照', contact: '联系人' }, needJoin: '、',
      submit: '提交认证',
      head: {
        reviewing: { title: '资料审核中', tag: '审核中', sub: '审核结果会通过消息通知您。' },
        verified: { title: '企业认证已完成', tag: '已认证', sub: '可使用企业开票抬头与批量开票。' },
        failed: { title: '认证未通过', tag: '未通过', sub: '请按原因更正后重新提交。' }
      },
      progress: '认证进度', steps: [{ t: '提交资料', s: '' }, { t: '资料审核', s: '审核时限请咨询客服' }, { t: '认证完成', s: '' }],
      reasonPrefix: '原因：', reasonEmpty: '—', reasonSub: '以审核反馈为准。可修改企业名称、统一社会信用代码或重新上传营业执照。',
      info: '企业信息', infoContact: '联系人', services: '企业服务', toTitles: '开票抬头管理', toBatch: '批量开票',
      retry: '更正资料后重新提交'
    },
    titles: {
      emptyTitle: '还没有开票抬头', emptySub: '添加后，申请发票和批量开票时可直接选择。', add: '添加抬头',
      typeCompany: '企业', typePerson: '个人', defaultTag: '默认', taxPrefix: ' · 税号 ', emailPrefix: '接收邮箱 ', edit: '编辑', setDefault: '设为默认',
      formSection: '抬头信息', type: '抬头类型', name: '企业名称', namePh: '请输入企业名称', personName: '姓名', personNamePh: '请输入姓名', // 自写：个人抬头的「姓名」两项（冻结稿只画了企业类型的表单）
      tax: '纳税人识别号', taxPh: '请输入纳税人识别号', taxError: '请填写有效的纳税人识别号', email: '接收邮箱', emailPh: '用于接收电子发票', emailError: '请填写有效的邮箱', // 自写：emailError
      vatSection: '专票信息', bank: '开户银行', bankPh: '请输入开户银行', account: '银行账号', accountPh: '请输入银行账号', addr: '注册地址与电话', addrPh: '请输入注册地址与电话', vatFine: '需要专用发票时请填写本段。',
      asDefault: '设为默认抬头', save: '保存抬头', remove: '删除抬头',
      deleteDialog: { title: '删除这个抬头？', desc: '删除后不影响已开具的发票。', cancel: '暂不删除', confirm: '确认删除' }
    },
    batch: {
      gateTitle: '批量开票需要先完成企业认证', gateSub: '认证通过后，可把多笔订单合并申请发票。', toCert: '去企业认证', gateFine: '单笔订单开票不需要企业认证，可在订单详情里申请。',
      emptyTitle: '暂无可开票的订单', emptySub: '已付款且未开票的订单会出现在这里。',
      noticeTitle: '选择要合并开票的订单', noticeSub: '只列出已付款且未开票的订单。',
      allPrefix: '全选（', allSuffix: ' 笔）', paidPrefix: ' · 付款 ', monthUnit: '个月',
      selectedPrefix: '已选 ', selectedSuffix: ' 笔', needOne: '请至少选择 1 笔订单', next: '下一步：确认开票信息',
      titleSection: '开票抬头', change: '更换', noTitle: '添加开票抬头', taxId: '纳税人识别号', email: '接收邮箱', // 自写：noTitle（还没有抬头时这一行的文字）
      contentPrefix: '开票内容（', contentSuffix: ' 笔）', rent: '租金 ', fee: ' · 管理费 ', contentFine: '本页列出租金与管理费；押金开票事宜请咨询客服。',
      amount: '开票金额', submit: '提交开票申请',
      head: {
        submitted: { title: '开票申请已提交', tag: '处理中', subPrefix: '开具后发送到 ' },
        issued: { title: '发票已开具', tag: '已开具', subPrefix: '已发送到 ' },
        failed: { title: '开票未成功', tag: '未成功', subPrefix: '' }
      },
      progress: '开票进度', steps: [{ t: '提交申请', s: '' }, { t: '开票处理', s: '处理时限请咨询客服' }, { t: '已开具', s: '发送到接收邮箱' }],
      reasonPrefix: '原因：', reasonEmpty: '—', reasonSub: '以财务反馈为准。可更换抬头或接收邮箱后重新提交。',
      content: '开票内容', contentTitle: '抬头', contentOrders: '订单', ordersSuffix: ' 笔',
      retry: '修改后重新提交', download: '下载发票', resend: '重新发送到邮箱',
      resent: '已重新发送到 ', downloadFailed: '发票文件暂时无法下载，请查收接收邮箱' // 自写：两句
    }
  }
};
