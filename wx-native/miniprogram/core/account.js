// 账户域的纯规则（不依赖 wx）：掩码、校验、可开票订单、注销条件、在租仓位、收藏 id。页面与演示接口共用，tests/account.test.js 覆盖。
const C = require('./config-account');
const order = require('./order');
const after = require('./after');
const S = order.STAGE;
const re = (k) => new RegExp(C[k]);
const money = (n) => '¥' + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const dateText = (ms) => (ms > 0 ? new Date(ms + 8 * 3600000).toISOString().slice(0, 10) : ''); // 北京时间

// 手机号一律掩码显示：保留前 3 后 4；带区号或位数不足 11 位时只保留后 4
function maskPhone(p) {
  const s = String(p || '').replace(/[^\d+]/g, '');
  if (!s) return '';
  if (/\*/.test(String(p))) return String(p);
  if (/^\d{11}$/.test(s)) return s.slice(0, 3) + '****' + s.slice(7);
  return s.length > 4 ? s.slice(0, Math.max(0, s.length - 8)) + '****' + s.slice(-4) : '****';
}
function maskEmail(e) { const m = String(e || '').match(/^(.)[^@]*(@.+)$/); return m ? m[1] + '***' + m[2] : ''; }
const normPhone = (p) => String(p || '').replace(/[\s-]/g, '');
const validContactPhone = (p) => re('contactPhonePattern').test(normPhone(p));
const validLoginPhone = (p) => re('loginPhonePattern').test(normPhone(p));
const validSmsCode = (c) => new RegExp('^\\d{' + C.smsCodeLength + '}$').test(String(c || ''));
const validCreditCode = (t) => re('creditCodePattern').test(String(t || '').trim().toUpperCase());
const validTaxId = (t) => re('taxIdPattern').test(String(t || '').trim().toUpperCase());
const validEmail = (e) => re('emailPattern').test(String(e || '').trim());

// 企业认证表单：返回还没填好的字段键（顺序即「还需填写」的顺序）
function certMissing(f) {
  f = f || {};
  const miss = [];
  if (!String(f.name || '').trim()) miss.push('name');
  if (!validCreditCode(f.tax)) miss.push('tax');
  if (!(Number(f.licenseCount) > 0)) miss.push('license');
  if (!String(f.contact || '').trim() || !validLoginPhone(f.phone)) miss.push('contact');
  return miss;
}
// 裁定 R-13（张坤 2026-11-21）：未认证企业不可新增企业抬头。只有企业认证已通过（verified）才能新增企业类型的抬头；审核中、未通过、未提交都不行。
const canAddCompanyTitle = (certStatus) => certStatus === 'verified';
// 开票抬头表单：企业要名称、税号、邮箱；个人要名称、邮箱。专票信息三项可选。
function titleErrors(f) {
  f = f || {};
  const e = {};
  if (!String(f.name || '').trim()) e.name = 1;
  if (f.type !== 'person' && !validTaxId(f.tax)) e.tax = 1;
  if (!validEmail(f.email)) e.email = 1;
  return e;
}

// 批量开票：只列已付款、且还有付款没申请过发票的订单；已取消 / 已过期的不列。
// 与订单的单笔发票页共用同一份开票记录 order.invoice.records（FIX-01 D-01）：单笔开过的付款这里不再列，批量开过的单笔页也不能再开。
function invoiceable(orders) {
  return (orders || []).filter((o) => o && o.pay && o.pay.paid_at > 0 && o.invoice && o.stage !== S.CANCELLED && o.stage !== S.EXPIRED && after.invoiceAvailable(o).length > 0);
}
// 一笔订单的开票行：还没开过票的各笔付款（下单支付、各次续租）的可开票金额之和，不含押金（R-03）。金额只读订单，不重算。
function invoiceLine(o) {
  const pays = after.invoiceAvailable(o), amount = pays.reduce((n, p) => n + (Number(p.invoice_amount) || 0), 0);
  const fee = pays.some((p) => p.type === 'INITIAL') ? Number((o.quote || {}).management_fee) || 0 : 0;
  return { id: o.id, no: o.no, store: o.store ? o.store.name : '', unit: o.unit_name, months: o.months, paidDate: dateText(o.pay && o.pay.paid_at), rent: amount - fee, fee, amount };
}
const sumAmount = (lines) => (lines || []).reduce((n, l) => n + l.amount, 0);

// 在租仓位（「我的」页的「我的仓位」）：已付款且还没结束的订单，按紧急程度排
const ASSET_PRIORITY = {};
ASSET_PRIORITY[S.EXPIRING] = 5; ASSET_PRIORITY[S.ACTIVE] = 4; ASSET_PRIORITY[S.PAID] = 3; ASSET_PRIORITY[S.EXITING] = 2; ASSET_PRIORITY[S.OVERDUE] = 1;
function activeAssets(orders) {
  return (orders || []).filter((o) => o && ASSET_PRIORITY[o.stage]).sort((a, b) => ASSET_PRIORITY[b.stage] - ASSET_PRIORITY[a.stage]);
}
// 注销条件（冻结稿初稿，法务未确认）：没有租用中或待支付的订单、押金已退还、没有处理中的发票或退款
function deletionBlockers(orders) {
  const list = orders || [];
  const active = activeAssets(list).length;
  const pending = list.filter((o) => o.stage === S.PENDING || o.stage === S.FAILED).length;
  const deposit = list.filter((o) => o.stage === S.ENDED && o.deposit && (o.deposit.status === 'holding' || o.deposit.status === 'refunding')).length;
  const invoice = list.filter((o) => o.invoice && o.invoice.status === 'applying').length;
  return { active, pending, deposit, invoice, blocked: active + pending + deposit + invoice > 0 };
}
// 收藏主题里可能是 id，也可能是带 id 的对象
const favIds = (arr) => (Array.isArray(arr) ? arr : []).map((x) => (x && typeof x === 'object' ? x.id : x)).filter(Boolean);
function favCount(fav) { fav = fav || {}; return favIds(fav.stores).length + favIds(fav.units).length; }
// 优惠与权益角标：可用的券 + 服务权益（未登录不计）
function benefitCount(res) {
  if (!res || !res.loggedIn) return 0;
  return (res.coupons || []).filter((c) => c.status === 'AVAILABLE' || c.status === 'SELECTED').length + (res.benefits || []).length;
}
// REVIEW-02 D2-14：ELIGIBILITY_PENDING（「下单时可用」）只是说明什么时候能用，不是要用户处理的事，归到信息色，不用警示橙
const TONE = { ok: ['REDEEMED', 'FULFILLED', 'AVAILABLE', 'ELIGIBLE'], warn: ['LOCKED', 'SELECTED', 'RESERVED'] };
const tone = (status) => (TONE.ok.indexOf(status) >= 0 ? 'ok' : TONE.warn.indexOf(status) >= 0 ? 'warn' : 'info');
const couponOff = (status) => ['REDEEMED', 'EXPIRED', 'INVALID'].indexOf(status) >= 0;

module.exports = { canAddCompanyTitle, money, dateText, maskPhone, maskEmail, normPhone, validContactPhone, validLoginPhone, validSmsCode, validCreditCode, validTaxId, validEmail, certMissing, titleErrors, invoiceable, invoiceLine, sumAmount, activeAssets, deletionBlockers, favIds, favCount, benefitCount, tone, couponOff };
