// 演示数据适配器的「account」部分（W34）。methods 里的每个函数签名为 (params, session) => Promise，与真实接口同名同结构。
// 数据放 db.kv.account（内存，重启即清空）。企业 / 抬头 / 券是冻结稿的合成演示数据，不是真实主体。
// 演示环境没有审核后台与财务系统：企业认证、批量开票提交后超过 demo.reviewSeconds 秒再取数即进入终态（见 core/config-account.js 的 demo）。
// 原始手机号只存在这里，返回给页面的一律是掩码。
const { db, seed, REASON, pushMessage } = require('./_db');
const MSG = require('../../i18n/account').messages.demo;
const scenarios = require('../../mock/scenarios');
const C = require('../../core/config-account');
const rules = require('../../core/account');
const afterRules = require('../../core/after');
const fmt = require('../../core/format');
const order = require('../../core/order');
const stores = require('../../mock/stores');
const units = require('../../mock/inventory');
const S = order.STAGE;
const ok = (v) => new Promise((resolve) => setTimeout(() => resolve(JSON.parse(JSON.stringify(v))), 0));
const fail = (code, message, extra) => Promise.reject(Object.assign({ code, message }, extra || {}));

// 新客券（冻结稿演示值：名称、面额、使用条件）；有效期业务未给，留空 → 页面该行不显示
// 裁定 R-14（张坤 2026-11-20）：已有付款订单的用户也可以领、领到可用，所以使用条件里不再写「首次租仓」
const NEW_COUPONS = [
  { id: 'CPN-001', name: '新客租仓券', amount: 200, type: 'RENT_CASH', condition: '整期租金满2000元', valid_until: '' },
  { id: 'CPN-002', name: '12个月长租券', amount: 300, type: 'RENT_CASH', condition: '租期满12个月', valid_until: '' }
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
// 演示场景里的账户状态（mock/scenarios.js 的 account）：已领新客券、企业认证停在哪一步。企业名称等是合成数据。
const DEMO_COMPANY = { name: '北京示例科技有限公司', tax: '91110105MA00000000', licenseCount: 1, contact: '王经理', phone: '13800008000' };
function fromScenario(a) {
  const sc = scenarios.scenario(), s = sc && sc.account; if (!s) return a;
  if (s.claimed) { NEW_COUPONS.forEach((c) => a.coupons.push(Object.assign({ status: 'AVAILABLE' }, c))); a.benefits.push(Object.assign({}, TRANSPORT_BENEFIT)); a.claimed = true; }
  if (s.cert) a.cert = { status: s.cert, company: Object.assign({}, DEMO_COMPANY), reason: s.cert === 'failed' ? REASON.cert : '', submitted_at: s.cert === 'reviewing' ? Date.now() : Date.now() - 86400e3 };
  return a;
}
// 裁定 R-13：未认证企业不可新增企业抬头，所以没有通过企业认证的演示账户起始不带企业抬头（只留个人抬头并设为默认）；「企业已认证」场景保留两条。
function seedTitles(a) {
  if (rules.canAddCompanyTitle(a.cert.status)) return a;
  a.titles = a.titles.filter((t) => t.type === 'person');
  if (a.titles.length && !a.titles.some((t) => t.isDefault)) a.titles[0].isDefault = true;
  return a;
}
function A() { if (!db.kv.account) db.kv.account = seedTitles(fromScenario(init())); return db.kv.account; }
const reset = () => { db.kv.account = init(); };
const due = (at) => !scenarios.eventOn('review_hold') && Date.now() - at >= C.demo.reviewSeconds * 1000; // 「审核暂不处理」打开时一直停在处理中
const paid = (o) => !!(o.pay && o.pay.paid_at > 0);

// 券状态随订单走：用了这张券的订单待支付 / 支付失败 → 已锁定；已付款 → 已使用。
// 裁定 R-14：不再因为「已有付款订单」把券变成不可用（冻结稿 runtime/demo-core.js 原有这条，已按裁定去掉）
function syncCoupons(a) {
  seed();
  a.coupons.forEach((c) => {
    const used = db.orders.filter((o) => o.quote && o.quote.coupon_id === c.id);
    if (used.some(paid)) c.status = 'REDEEMED';
    else if (used.some((o) => o.stage === S.PENDING || o.stage === S.FAILED)) c.status = 'LOCKED';
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
  if (a.cert.status !== 'reviewing' || !due(a.cert.submitted_at)) return;
  const reject = a.cert.company.name.indexOf(C.demo.certRejectKeyword) >= 0 || scenarios.take('cert_reject');
  a.cert.status = reject ? 'failed' : 'verified'; a.cert.reason = reject ? REASON.cert : '';
  pushMessage('ent_cert', reject ? MSG.certFail : MSG.certOk, ''); // 审核结果写一条站内消息（FIX-01 D-07）
}
// 批量开票与订单的单笔发票页共用同一份开票记录 order.invoice.records（FIX-01 D-01）：批量申请给所选订单里每笔还没开过票的付款各写一条记录（带 batch_id），
// 金额不含押金（R-03）；已开具后单笔页不能再对同一笔付款申请；未成功时撤掉这批记录，付款放回可申请。记录结构见 core/after.js 文件头。
const batchOrders = (b) => db.orders.filter((o) => b.order_ids.indexOf(o.id) >= 0);
function syncInvoice(o) { const rs = o.invoice.records || []; o.invoice.status = afterRules.invoiceStatus(rs); o.invoice.title = rs.length ? rs[rs.length - 1].title : ''; }
function writeBatchRecords(b, title) {
  batchOrders(b).forEach((o) => {
    const rs = o.invoice.records || (o.invoice.records = []);
    afterRules.invoiceAvailable(o).forEach((p) => rs.push({ id: 'INV' + (rs.length + 1), payment_id: p.id, payment_type: p.type, amount: p.invoice_amount, batch_id: b.id, kind: title.type === 'person' ? 'personal' : 'enterprise', title: title.name, tax_id: title.tax || '', email: title.email, status: 'submitted', submitted_at: b.submitted_at, issued_at: 0, fail_reason: '' }));
    syncInvoice(o);
  });
}
function settleBatchRecords(b, issued) {
  batchOrders(b).forEach((o) => {
    const rs = o.invoice.records || [];
    if (issued) rs.forEach((r) => { if (r.batch_id === b.id) { r.status = 'issued'; r.issued_at = Date.now(); } });
    else o.invoice.records = rs.filter((r) => r.batch_id !== b.id);
    syncInvoice(o);
  });
}
function advanceBatch(b) {
  if (b.status !== 'submitted' || !due(b.submitted_at)) return;
  if (b.email.indexOf(C.demo.invoiceFailEmailPrefix) === 0 || scenarios.take('batch_invoice_fail')) { b.status = 'failed'; b.reason = b.reason || REASON.batch; settleBatchRecords(b, false); }
  else { b.status = 'issued'; settleBatchRecords(b, true); }
}
const latestBatch = (a) => a.batches.filter((b) => !b.acked).slice(-1)[0] || null;
const findBatch = (a, id) => a.batches.find((b) => b.id === id);

const methods = {
  // ---- 收藏（收藏的 id 存本机 state.favorites；这里只取门店 / 仓位的现状）----
  getFavoriteItems(p) {
    const sIds = rules.favIds(p.stores), uIds = rules.favIds(p.units);
    const ss = sIds.map((id) => stores.find((x) => x.id === id)).filter(Boolean).map((s) => ({ id: s.id, name: s.name, address: s.address, photo: s.photo || '', gone: s.status !== 'open', city: s.city, district: s.district || '', area: s.area || '', community: s.community || '', distance_km: s.distance_km })); // IMPL-01：带上区名、商圈、距离，收藏页门店卡按全站位置行写法显示
    const us = uIds.map((id) => units.find((x) => x.id === id)).filter(Boolean).map((u) => {
      const s = stores.find((x) => x.id === u.store_id) || {};
      return { id: u.id, store_id: u.store_id, store_name: s.name || '', name: fmt.unitName(u), code: u.code || '', dims: fmt.dimsText(u), volume: u.volume, gone: u.status !== 'available' };
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
    const prev = p.id ? a.titles.find((x) => x.id === p.id) : null;
    if (p.id && !prev) return fail('NOT_FOUND', '抬头不存在');
    // 裁定 R-13：未认证企业不可新增企业抬头。已有的企业抬头仍可编辑（自定）；把个人抬头改成企业类型等同新增，一样拦。
    if (t.type === 'company' && !rules.canAddCompanyTitle(a.cert.status) && !(prev && prev.type === 'company')) return fail('FORBIDDEN', '完成企业认证后可添加企业抬头', { reason: 'CERT_REQUIRED' });
    if (p.id) { const i = a.titles.indexOf(prev); t.id = p.id; a.titles[i] = t; }
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
  // 每一笔处理中的申请都推进（点过「再开一批」的那笔也要出结果）；出结果时写一条站内消息（FIX-01 D-03 / D-07）
  getBatchInvoice() {
    const a = A();
    a.batches.forEach((b) => { const was = b.status; advanceBatch(b); if (was === 'submitted' && b.status !== was) pushMessage('ent_batch', b.status === 'issued' ? MSG.batchIssued : MSG.batchFail, ''); });
    return ok(latestBatch(a));
  },
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
    writeBatchRecords(b, title);
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
