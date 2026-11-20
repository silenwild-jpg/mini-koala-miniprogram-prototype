// 演示数据适配器的「account」部分（W34）。methods 里的每个函数签名为 (params, session) => Promise，与真实接口同名同结构。
// 数据放 db.kv.account（内存，重启即清空）。企业 / 抬头 / 券是冻结稿的合成演示数据，不是真实主体。
// 演示环境没有审核后台与财务系统：企业认证、批量开票提交后超过 demo.reviewSeconds 秒再取数即进入终态（见 core/config-account.js 的 demo）。
// 原始手机号只存在这里，返回给页面的一律是掩码。
const { db, seed } = require('./_db');
const C = require('../../core/config-account');
const rules = require('../../core/account');
const fmt = require('../../core/format');
const order = require('../../core/order');
const stores = require('../../mock/stores');
const units = require('../../mock/units');
const S = order.STAGE;
const ok = (v) => new Promise((resolve) => setTimeout(() => resolve(JSON.parse(JSON.stringify(v))), 0));
const fail = (code, message, extra) => Promise.reject(Object.assign({ code, message }, extra || {}));

// 新客券（冻结稿演示值：名称、面额、使用条件）；有效期业务未给，留空 → 页面该行不显示
const NEW_COUPONS = [
  { id: 'CPN-001', name: '新客租仓券', amount: 200, type: 'RENT_CASH', condition: '首次租仓，整期租金满2000元', valid_until: '' },
  { id: 'CPN-002', name: '12个月长租券', amount: 300, type: 'RENT_CASH', condition: '首次租仓，租期满12个月', valid_until: '' }
];
const TRANSPORT_BENEFIT = { id: 'CPN-003', name: '免费运输 1 次', type: 'FREE_TRANSPORT', status: 'ELIGIBILITY_PENDING' };
// 冻结稿的两条演示抬头（合成数据）
const DEMO_TITLES = [
  { id: 'T1', type: 'company', name: '安贞商贸有限公司', tax: '91110105MA01K7XQ3R', email: 'caiwu@163.com', bank: '招商银行北京安贞支行', account: '6222 **** **** 0000', addr: '北京市朝阳区安贞西里三区 12 号楼', isDefault: true },
  { id: 'T2', type: 'person', name: '王**', tax: '', email: 'wang@163.com', bank: '', account: '', addr: '', isDefault: false }
];
const init = () => ({
  claimed: false, coupons: [], benefits: [],
  contact: '',
  cert: { status: 'none', company: null, reason: '', submitted_at: 0 }, // none | reviewing | verified | failed
  titles: JSON.parse(JSON.stringify(DEMO_TITLES)), titleSeq: 2,
  batches: [], batchSeq: 0,
  deletion: null, privacyWithdrawnAt: 0
});
function A() { if (!db.kv.account) db.kv.account = init(); return db.kv.account; }
const reset = () => { db.kv.account = init(); };
const due = (at) => Date.now() - at >= C.demo.reviewSeconds * 1000;
const paid = (o) => !!(o.pay && o.pay.paid_at > 0);

// 券状态随订单走：订单待支付 / 支付失败 → 已锁定；已付款 → 已使用；首次租仓券在已有付款订单后 → 不可用（冻结稿 runtime/demo-core.js 的规则）
function syncCoupons(a) {
  seed();
  const anyPaid = db.orders.some(paid);
  a.coupons.forEach((c) => {
    const used = db.orders.filter((o) => o.quote && o.quote.coupon_id === c.id);
    if (used.some(paid)) c.status = 'REDEEMED';
    else if (used.some((o) => o.stage === S.PENDING || o.stage === S.FAILED)) c.status = 'LOCKED';
    else if (anyPaid) c.status = 'INVALID';
    else if (c.status === 'LOCKED') c.status = 'AVAILABLE';
  });
}
const titleView = (t) => Object.assign({}, t, { displayName: t.name, displayEmail: t.type === 'person' ? rules.maskEmail(t.email) : t.email });
const titlesView = (a) => a.titles.map(titleView);
const certView = (a) => {
  const c = a.cert.company;
  return { status: a.cert.status, reason: a.cert.reason, company: c ? { name: c.name, tax: c.tax, contact: c.contact, phoneMasked: rules.maskPhone(c.phone), licenseCount: c.licenseCount } : null };
};
function advanceCert(a) {
  if (a.cert.status === 'reviewing' && due(a.cert.submitted_at)) a.cert.status = a.cert.company.name.indexOf(C.demo.certRejectKeyword) >= 0 ? 'failed' : 'verified';
}
const setInvoice = (ids, inv) => db.orders.forEach((o) => { if (ids.indexOf(o.id) >= 0) o.invoice = Object.assign({}, o.invoice, inv); });
function advanceBatch(b) {
  if (b.status !== 'submitted' || !due(b.submitted_at)) return;
  if (b.email.indexOf(C.demo.invoiceFailEmailPrefix) === 0) { b.status = 'failed'; setInvoice(b.order_ids, { status: 'none', title: '' }); }
  else { b.status = 'issued'; setInvoice(b.order_ids, { status: 'issued' }); }
}
const latestBatch = (a) => a.batches.filter((b) => !b.acked).slice(-1)[0] || null;
const findBatch = (a, id) => a.batches.find((b) => b.id === id);

const methods = {
  // ---- 收藏（收藏的 id 存本机 state.favorites；这里只取门店 / 仓位的现状）----
  getFavoriteItems(p) {
    const sIds = rules.favIds(p.stores), uIds = rules.favIds(p.units);
    const ss = sIds.map((id) => stores.find((x) => x.id === id)).filter(Boolean).map((s) => ({ id: s.id, name: s.name, address: s.address, photo: s.photo || '', gone: s.status !== 'open' }));
    const us = uIds.map((id) => units.find((x) => x.id === id)).filter(Boolean).map((u) => {
      const s = stores.find((x) => x.id === u.store_id) || {};
      return { id: u.id, store_id: u.store_id, store_name: s.name || '', name: fmt.unitName(u), dims: fmt.dimsText(u), gone: u.status !== 'available' };
    });
    return ok({ stores: ss, units: us });
  },
  // ---- 优惠与权益 ----
  // 未登录：只返回可领的新客券名称与条件，不返回金额（页面写「登录后查看金额」）
  getBenefits(p, session) {
    if (!session || !session.loggedIn) return ok({ loggedIn: false, coupons: NEW_COUPONS.map((c) => ({ id: c.id, name: c.name, condition: c.condition, valid_until: c.valid_until, status: 'AVAILABLE', amount: null })), benefits: [] });
    const a = A(); syncCoupons(a);
    return ok({ loggedIn: true, claimed: a.claimed, coupons: a.coupons, benefits: a.benefits });
  },
  claimCoupons() {
    const a = A();
    NEW_COUPONS.forEach((c) => { if (!a.coupons.some((x) => x.id === c.id)) a.coupons.push(Object.assign({ status: 'AVAILABLE' }, c)); });
    if (!a.benefits.some((b) => b.id === TRANSPORT_BENEFIT.id)) a.benefits.push(Object.assign({}, TRANSPORT_BENEFIT));
    a.claimed = true; syncCoupons(a);
    return ok({ loggedIn: true, claimed: true, coupons: a.coupons, benefits: a.benefits });
  },
  // ---- 个人信息 ----
  getProfile(p, session) {
    const a = A(); seed();
    return ok({ phoneMasked: session.phoneMasked, contactMasked: a.contact ? rules.maskPhone(a.contact) : session.phoneMasked, identityVerified: db.orders.some((o) => o.identity_status === 'verified') });
  },
  saveContactPhone(p) {
    if (!rules.validContactPhone(p.phone)) return fail('INVALID', '请填写有效联系电话');
    const a = A(); a.contact = rules.normPhone(p.phone);
    return ok({ contactMasked: rules.maskPhone(a.contact) });
  },
  // 更换登录手机号：先用 sendSmsCode 给新号码发验证码。号码已绑定其他账号 → CONFLICT，不覆盖、不合并（交接 v1.0 §4.1-7）
  changeLoginPhone(p) {
    const phone = rules.normPhone(p.phone), rec = db.sms[phone];
    if (!rules.validLoginPhone(phone)) return fail('INVALID', '请输入 11 位手机号');
    if (!rec) return fail('INVALID', '请先获取验证码');
    if (Date.now() - rec.at > 300000) return fail('EXPIRED', '验证码已过期，请重新获取');
    if (!rules.validSmsCode(p.code)) return fail('INVALID', '请输入 6 位验证码');
    if (phone.slice(-C.demo.phoneConflictSuffix.length) === C.demo.phoneConflictSuffix) return fail('CONFLICT', '该手机号已绑定其他账号');
    return ok({ phoneMasked: rules.maskPhone(phone) });
  },
  // 注销：条件不满足时 CONFLICT，并带上拦截原因的计数
  requestAccountDeletion() {
    seed();
    const b = rules.deletionBlockers(db.orders);
    if (b.blocked) return fail('CONFLICT', '暂时不能注销', { blockers: b });
    A().deletion = { requested_at: Date.now() };
    return ok({ submitted: true });
  },
  withdrawPrivacy() { A().privacyWithdrawnAt = Date.now(); return ok({ withdrawn: true }); },
  // ---- 企业认证 ----
  getEntCert() { const a = A(); advanceCert(a); return ok(certView(a)); },
  submitEntCert(p) {
    const f = { name: String(p.name || '').trim(), tax: String(p.tax || '').trim().toUpperCase(), licenseCount: Number(p.licenseCount) || 0, contact: String(p.contact || '').trim(), phone: rules.normPhone(p.phone) };
    const miss = rules.certMissing(f);
    if (miss.length) return fail('INVALID', miss[0] === 'tax' ? '请填写 18 位统一社会信用代码' : '资料不完整', { fields: miss });
    const a = A(); a.cert = { status: 'reviewing', company: f, reason: '', submitted_at: Date.now() };
    return ok(certView(a));
  },
  // ---- 开票抬头 ----
  getInvoiceTitles() { return ok(titlesView(A())); },
  saveInvoiceTitle(p) {
    const a = A();
    const t = { type: p.type === 'person' ? 'person' : 'company', name: String(p.name || '').trim(), tax: p.type === 'person' ? '' : String(p.tax || '').trim().toUpperCase(), email: String(p.email || '').trim(), bank: String(p.bank || '').trim(), account: String(p.account || '').trim(), addr: String(p.addr || '').trim(), isDefault: !!p.isDefault };
    const errs = rules.titleErrors(t);
    if (Object.keys(errs).length) return fail('INVALID', errs.tax ? '请填写有效的纳税人识别号' : '抬头信息不完整', { fields: Object.keys(errs) });
    if (p.id) { const i = a.titles.findIndex((x) => x.id === p.id); if (i < 0) return fail('NOT_FOUND', '抬头不存在'); t.id = p.id; a.titles[i] = t; }
    else { t.id = 'T' + (++a.titleSeq); a.titles.push(t); }
    if (t.isDefault) a.titles.forEach((x) => { x.isDefault = x.id === t.id; });
    if (!a.titles.some((x) => x.isDefault)) a.titles[0].isDefault = true;
    return ok(titlesView(a));
  },
  deleteInvoiceTitle(p) {
    const a = A(), i = a.titles.findIndex((x) => x.id === p.id);
    if (i < 0) return fail('NOT_FOUND', '抬头不存在');
    a.titles.splice(i, 1);
    if (a.titles.length && !a.titles.some((x) => x.isDefault)) a.titles[0].isDefault = true;
    return ok(titlesView(a));
  },
  setDefaultInvoiceTitle(p) {
    const a = A();
    if (!a.titles.some((x) => x.id === p.id)) return fail('NOT_FOUND', '抬头不存在');
    a.titles.forEach((x) => { x.isDefault = x.id === p.id; });
    return ok(titlesView(a));
  },
  // ---- 批量开票 ----
  // 最近一笔还没看过终态的申请；没有返回 null
  getBatchInvoice() { const b = latestBatch(A()); if (b) advanceBatch(b); return ok(b); },
  submitBatchInvoice(p) {
    seed();
    const a = A(), ids = p.order_ids || [], title = a.titles.find((x) => x.id === p.title_id);
    if (a.cert.status !== 'verified') return fail('INVALID', '请先完成企业认证');
    if (!title) return fail('INVALID', '请选择开票抬头');
    const able = rules.invoiceable(db.orders).filter((o) => ids.indexOf(o.id) >= 0);
    if (!ids.length || able.length !== ids.length) return fail('CONFLICT', '所选订单已不可开票，请重新选择');
    const lines = able.map(rules.invoiceLine);
    a.batches.forEach((b) => { b.acked = true; });
    const b = { id: 'BI' + (++a.batchSeq), status: 'submitted', submitted_at: Date.now(), order_ids: ids.slice(), lines: lines.map((l) => ({ no: l.no, amount: l.amount })), amount: rules.sumAmount(lines), title_id: title.id, title_name: title.name, email: title.email, reason: '', acked: false };
    a.batches.push(b);
    setInvoice(ids, { status: 'applying', title: title.name });
    return ok(b);
  },
  ackBatchInvoice(p) { const b = findBatch(A(), p.id); if (b) b.acked = true; return ok({ acked: !!b }); },
  resendBatchInvoice(p) { const b = findBatch(A(), p.id); return b && b.status === 'issued' ? ok({ email: b.email }) : fail('NOT_FOUND', '发票不存在'); },
  getBatchInvoiceFile() { return fail('NOT_FOUND', '演示环境没有发票文件'); }, // 正式环境返回 { url }
  // ---- 推荐有礼（活动筹备中：只有邀请码与空的推荐记录，奖励规则业务未给）----
  getReferral(p, session) { return ok({ code: 'MK' + String(session.phoneMasked || '').slice(-4), records: [] }); },
  // ---- 关于迷你考拉（资质图片由线上地址返回；演示环境没有图）----
  getBrandInfo() { return ok({ proof_images: [] }); }
};
module.exports = {
  needLogin: ['claimCoupons', 'getProfile', 'saveContactPhone', 'changeLoginPhone', 'requestAccountDeletion', 'withdrawPrivacy', 'getEntCert', 'submitEntCert', 'getInvoiceTitles', 'saveInvoiceTitle', 'deleteInvoiceTitle', 'setDefaultInvoiceTitle', 'getBatchInvoice', 'submitBatchInvoice', 'ackBatchInvoice', 'resendBatchInvoice', 'getBatchInvoiceFile', 'getReferral'],
  methods,
  _reset: reset // 只给测试用
};
