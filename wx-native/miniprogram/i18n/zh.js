// 界面文字集中在这里，页面与组件里不写死（改字不翻代码）。用词遵守交接 v1.0 §4.11。
// 完整文字表见开发包 03_UI_Text_Table.csv；每开发一页，把该页文案并进来。
module.exports = {
  brand: '迷你考拉仓',
  share: { title: '迷你考拉仓 · 储物有我，轻松无忧' } /* 转发默认标题：品牌口号取自品牌语气规范（voice-profile），FIX-01 R-15 */,
  auth: { expired: '登录已失效，请重新登录' }, // 自写（FIX-01 S-02）
  common: { retry: '重新加载', cancel: '取消', confirm: '确定', modify: '修改', contactService: '请咨询客服' },
  sys: {
    loading: '加载中',
    failed: { title: '加载失败', desc: '服务暂时不可用，请稍后重试。' },
    offline: { title: '网络未连接', desc: '请检查网络设置后重试。' }
  },
  term: { title: '租期', other: '其他', otherTitle: '其他租期', unit: '个月', unsure: '暂不确定', range: '可选 {min}–{max} 个月' },
  login: {
    title: '登录',
    wechat: '微信手机号快捷登录', other: '其他手机号登录',
    agreePrefix: '已阅读并同意', agreeTip: '请先阅读并勾选协议',
    phonePlaceholder: '手机号', codePlaceholder: '请输入 6 位验证码', sendCode: '获取验证码', resend: '重新获取',
    submit: '登录', gateTip: '请登录',
    wechatUnavailable: '微信快捷登录暂不可用，请用其他手机号登录',
    conflict: '该手机号已绑定其他账号'
  },
  mine: {
    welcome: '欢迎使用迷你考拉', loginRegister: '登录 / 注册', loggedIn: '已登录',
    groups: [
      { title: '我的记录', items: [{ k: 'NEEDS', t: '预约用仓', s: '查看已提交的预约' }, { k: 'PROGRESS', t: '找仓进度', s: '' }, { k: 'FAVORITES', t: '我的收藏', s: '门店和仓位' }, { k: 'MESSAGES', t: '消息', s: '查看业务通知' }] },
      { title: '服务与权益', items: [{ k: 'COUPONS', t: '优惠与权益', s: '查看可用权益' }, { k: 'TRANSPORT', t: '运输与搬运', s: '下单前可预约' }, { k: 'SUPPORT', t: '联系顾问', s: '' }, { k: 'REFERRAL', t: '推荐有礼', s: '' }] },
      { title: '账务与企业', items: [{ k: 'ENT_TITLES', t: '发票与抬头', s: '' }, { k: 'ENT_CERT', t: '企业认证', s: '' }] },
      { title: '', items: [{ k: 'PROFILE', t: '个人信息', s: '' }, { k: 'BRAND', t: '关于迷你考拉', s: '' }] }
    ]
  },
  orders: { all: '全部订单', empty: '暂无订单记录', emptySub: '先去附近门店看看可用仓位。', goStores: '去附近门店', loginTip: '登录后查看订单' },
  advisor: { cta: '预约顾问' },
  placeholder: { desc: '本页开发中', back: '返回' }
};
