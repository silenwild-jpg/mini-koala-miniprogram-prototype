// 账户域（我的、收藏、优惠与权益、个人信息、推荐有礼、关于、企业认证、开票抬头、批量开票）的可调数值。
// 来源标注：冻结稿 = W27 冻结稿显示值；合同 = 合同文本模块；自定 = 本批开发自定，待业务确认；演示 = 只在演示数据里生效。
module.exports = {
  serviceHotline: '400-035-8885',            // 合同：model/mk-contract-text 的 service.hotline
  mineAssetRows: 2,                           // 冻结稿：「我的仓位」最多列 2 处，其余「查看全部」
  contactPhonePattern: '^\\+?\\d{7,15}$',     // 自定：联系电话支持国际区号（冻结稿只写「支持国际区号」，没有给格式）
  loginPhonePattern: '^1\\d{10}$',            // 与登录层同口径（services/mock-adapter.js sendSmsCode）
  smsCodeLength: 6,                           // 冻结稿：「请输入 6 位验证码」
  creditCodePattern: '^[0-9A-Z]{18}$',        // 冻结稿：「18 位统一社会信用代码」；字符集为自定
  taxIdPattern: '^[0-9A-Z]{15,20}$',          // 自定：纳税人识别号 15–20 位数字或大写字母
  emailPattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', // 自定
  licenseMaxCount: 1,                         // 冻结稿：「已上传 1 张」
  needsAckHours: 24,                          // 自定（FIX-01 D-18）：预约记录顶部「预计 10 分钟内与您联系」只在有这个小时数以内提交的未撤回记录时显示
  inviteCodePattern: '^[0-9A-Za-z]{4,16}$',   // 自定（FIX-01 S-04）：转发落地时读取的邀请码格式；正式格式由后端定
  demo: {                                     // 演示：没有审核后台，用时间推进状态；接真实接口后整段不用
    reviewSeconds: 3,                         // 提交后超过这个秒数再取数，企业认证 / 批量开票进入终态
    certRejectKeyword: '驳回',                // 企业名称含这个词 → 认证未通过
    invoiceFailEmailPrefix: 'fail',           // 接收邮箱以它开头 → 开票未成功
    phoneConflictSuffix: '0000'               // 更换登录手机号：新号码以它结尾 → 已绑定其他账号
  }
};
