// 账户域测试（W34）：规则、演示接口、9 个页面的关键流程。在假的 wx 环境里跑，验证的是代码逻辑与跳转去向，不是微信真实行为。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), routes = R('services/routes'), api = R('services/api'), rules = R('core/account'), C = R('core/config-account'), TA = R('i18n/account');
const { db } = R('services/mock-ext/_db'), acct = R('services/mock-ext/account'), order = R('core/order');
env.loadApp();
const toasts = [];
wx.showToast = (o) => toasts.push(o.title);
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 15));
const base = (r) => r.replace(/^\//, '');
const login = () => state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
// seedOrders = true：带 5 笔演示订单（在租、即将到期、待起租、待支付、已结束）；false：没有订单的新账户
function fresh(loggedIn, seedOrders) {
  state.reset(); env.nav.length = 0; env.mode = 'ok'; toasts.length = 0;
  db.orders.length = 0; db.seq = 0; db.seeded = !seedOrders; db.sms = {}; acct._reset();
  if (loggedIn) login();
}
const page = async (name, q) => { const pg = env.newPage(base(routes[name]), q || {}); await tick(); return pg; };
const tap = (dataset) => ({ currentTarget: { dataset: dataset || {} }, detail: {} });
const input = (value, f) => ({ detail: { value }, currentTarget: { dataset: { f } } });
const pastReview = (obj) => { obj.submitted_at -= (C.demo.reviewSeconds + 1) * 1000; };

test('规则：手机号与邮箱掩码；联系电话、信用代码、税号、邮箱校验', () => {
  assert.equal(rules.maskPhone('13912345678'), '139****5678');
  assert.equal(rules.maskPhone('+8613912345678'), '+86139****5678');
  assert.equal(rules.maskPhone('138****8000'), '138****8000');
  assert.equal(rules.maskPhone(''), '');
  assert.equal(rules.maskEmail('wang@163.com'), 'w***@163.com');
  assert.equal(rules.validContactPhone('12'), false); assert.equal(rules.validContactPhone('139 1234 5678'), true); assert.equal(rules.validContactPhone('+85261234567'), true);
  assert.equal(rules.validCreditCode('91110105MA01K7XQ3R'), true); assert.equal(rules.validCreditCode('9111010'), false);
  assert.equal(rules.validTaxId('9111'), false); assert.equal(rules.validEmail('caiwu@163.com'), true); assert.equal(rules.validEmail('caiwu@'), false);
  assert.equal(rules.money(3170), '¥3,170'); assert.equal(rules.money(0), '¥0');
  assert.deepEqual(rules.certMissing({}), ['name', 'tax', 'license', 'contact']);
  assert.deepEqual(rules.certMissing({ name: 'a', tax: '9111010', licenseCount: 1, contact: 'b', phone: '13800001111' }), ['tax']);
  assert.deepEqual(Object.keys(rules.titleErrors({ type: 'person', name: '王', email: 'a@b.cn' })), []);
  assert.deepEqual(Object.keys(rules.titleErrors({ type: 'company', name: 'x', tax: '9111', email: 'a@b.cn' })), ['tax']);
});

test('接口：涉及个人数据的接口未登录一律拒绝；未登录取权益不返回金额', async () => {
  fresh(false, true);
  assert.ok(acct.needLogin.length >= 18);
  for (const n of acct.needLogin) await assert.rejects(api[n]({ id: 'T1', phone: '13800001111' }), (e) => e.code === 'UNAUTHENTICATED', n);
  const g = await api.getBenefits();
  assert.equal(g.loggedIn, false); assert.ok(g.coupons.length === 2 && g.coupons.every((c) => c.amount === null)); assert.ok(!/"amount":\d/.test(JSON.stringify(g)), '未登录不返回面额');
  assert.deepEqual(await api.getBrandInfo(), { proof_images: [] });
});

test('优惠与权益：空态 → 领取 → 可使用；券随订单变为已锁定 / 已使用；已有付款订单不影响其他券（R-14）', async () => {
  fresh(true, false);
  let pg = await page('COUPONS');
  assert.equal(pg.data.empty, true); assert.equal(pg.data.notice, '租金券不抵扣押金和管理费。免费运输：用仓位置距门店 5km 及以上、租期满 6 个月、折扣不低于 6 折的订单可用，特价仓不参与；含 1 次车辆运输费，搬运、拆装、楼梯费另计。');
  pg.onClaim(); await tick();
  assert.deepEqual(pg.data.coupons.map((c) => [c.name, c.amount, c.tag, c.canUse, c.condition, c.valid]), [['新客租仓券', '¥200', '可使用', true, '整期租金满2000元', ''], ['12个月长租券', '¥300', '可使用', true, '租期满12个月', '']]);
  assert.deepEqual(pg.data.benefits.map((b) => [b.name, b.tag]), [['免费运输 1 次', '下单时可用']]);
  assert.equal(rules.benefitCount(await api.getBenefits()), 3);
  pg.onUse(); assert.deepEqual(env.nav.pop(), { kind: 'switchTab', url: routes.STORES });
  // 订单用了券：待支付 → 已锁定；付款后 → 已使用，另一张券仍可使用（FIX-01 R-14：不因已有付款订单变不可用）
  db.orders.push({ id: 'MK1', stage: order.STAGE.PENDING, quote: { coupon_id: 'CPN-002' }, pay: { paid_at: 0 } });
  pg = await page('COUPONS'); assert.deepEqual(pg.data.coupons.map((c) => c.tag), ['可使用', '已锁定']);
  db.orders[0].stage = order.STAGE.ACTIVE; db.orders[0].pay.paid_at = Date.now();
  pg = await page('COUPONS'); assert.deepEqual(pg.data.coupons.map((c) => [c.tag, c.off, c.canUse]), [['可使用', false, true], ['已使用', true, false]]);
});

test('优惠与权益：未登录不显示金额，「登录后查看金额」「领取」都打开登录层', async () => {
  fresh(false, false);
  const pg = await page('COUPONS');
  assert.equal(pg.data.loggedIn, false); assert.ok(pg.data.coupons.every((c) => c.amount === '' && !c.canUse)); assert.ok(!/¥/.test(JSON.stringify(pg.data.coupons)));
  pg.onLogin(); assert.equal(pg.data.loginVisible, true);
  pg.setData({ loginVisible: false }); pg.onClaim(); assert.equal(pg.data.loginVisible, true);
});

test('我的收藏：空态；列表；失效态（仓位已租出、门店暂停营业）各带去向，条目不自动删除', async () => {
  fresh(false, false);
  let pg = await page('FAVORITES'); assert.equal(pg.data.empty, true);
  pg.onFindStores(); assert.deepEqual(env.nav.pop(), { kind: 'switchTab', url: routes.STORES });
  state.set('favorites', { stores: ['SIM_BJ01', 'SIM_BJ05'], units: ['SIM_BJ02_U03', 'SIM_BJ01_U02'] }); // SIM_BJ05 暂停营业；SIM_BJ01_U02 已租出
  pg = await page('FAVORITES');
  assert.deepEqual(pg.data.stores.map((s) => [s.id, s.gone, s.sub]), [['SIM_BJ01', false, '北京市朝阳区富仁名苑胜古北里南28号楼'], ['SIM_BJ05', true, '可查看附近其他门店']]);
  assert.deepEqual(pg.data.units.map((u) => [u.name, u.gone, u.sub]), [['芍药居北里店', false, pg.data.units[0].sub], ['安贞·富仁名苑店', true, 'A002 · 2m³ · 1 × 1 × 2m · 可看同店其他仓位']]);
  assert.ok(/^B003 · 4m³/.test(pg.data.units[0].sub)); assert.equal(pg.data.T.unitGone, '已租出'); assert.equal(pg.data.T.storeGone, '暂停营业');
  pg.onStore(tap({ id: 'SIM_BJ05', gone: true })); assert.deepEqual(env.nav.pop(), { kind: 'switchTab', url: routes.STORES });
  pg.onStore(tap({ id: 'SIM_BJ01', gone: false })); assert.deepEqual(env.nav.pop(), { kind: 'navigateTo', url: routes.STORE_DETAIL + '?id=SIM_BJ01' });
  pg.onUnit(tap({ store: 'SIM_BJ01' })); assert.deepEqual(env.nav.pop(), { kind: 'navigateTo', url: routes.STORE_DETAIL + '?id=SIM_BJ01' });
  assert.equal(state.get().favorites.units.length, 2); assert.equal(rules.favCount(state.get().favorites), 4);
});

test('个人信息：未登录态；联系电话校验；未登录保存 → 先登录再保存；显示一律掩码', async () => {
  fresh(false, false);
  const pg = await page('PROFILE');
  assert.equal(pg.data.sys, ''); assert.equal(pg.data.loggedIn, false); assert.equal(pg.data.loginPhone, ''); assert.equal(pg.data.headTitle, '欢迎使用迷你考拉');
  pg.onEditContact(); pg.onContactInput(input('12')); pg.onSaveContact();
  assert.equal(pg.data.contactError, '请填写有效联系电话'); assert.equal(pg.data.contactVisible, true);
  pg.onContactInput(input('13912345678')); assert.equal(pg.data.contactError, ''); pg.onSaveContact();
  assert.equal(pg.data.loginVisible, true); assert.equal(pg.data.contactVisible, false);
  login(); pg.onLoginSuccess(); await tick(40);
  assert.equal(pg.data.contact, '139****5678'); assert.equal(pg.data.loginPhone, '138****8000'); assert.ok(toasts.includes('联系方式已保存'));
  assert.ok(!/13912345678"/.test(JSON.stringify([pg.data.contact, pg.data.loginPhone, pg.data.headSub])));
  assert.equal((await api.getProfile()).contactMasked, '139****5678');
});

test('个人信息：更换登录手机号 —— 发码倒计时、冲突不覆盖、成功后登录态换成新号码（掩码）', async () => {
  fresh(true, false);
  const pg = await page('PROFILE');
  pg.onChangePhone(); assert.equal(pg.data.changeVisible, true);
  pg.onChPhone(input('13900139000')); pg.onChSend(); await tick();
  assert.ok(pg.data.chCountdown > 0); assert.equal(pg.data.chHint, '验证码已发送，5 分钟内有效'); assert.match(pg.data.chSendText, /^\d+s 后重发$/);
  pg.onChCode(input('12')); assert.equal(pg.data.chReady, false); pg.onChSubmit(); await tick(); assert.equal(state.get().session.phoneMasked, '138****8000');
  pg.onChCode(input('123456')); assert.equal(pg.data.chReady, true); pg.onChSubmit(); await tick(40);
  assert.equal(state.get().session.phoneMasked, '139****9000'); assert.equal(pg.data.changeVisible, false); assert.ok(toasts.includes('登录手机号已更换')); assert.equal(pg.data.loginPhone, '139****9000');
  // 冲突：新号码已绑定其他账号（演示：尾号 0000）
  pg.onChangePhone(); pg.onChPhone(input('13900010000')); pg.onChSend(); await tick(); pg.onChCode(input('123456')); pg.onChSubmit(); await tick();
  assert.equal(pg.data.dialog.kind, 'conflict'); assert.equal(pg.data.dialog.title, '该手机号已绑定其他微信账号');
  assert.equal(pg.data.dialog.desc, '为保护账户和订单安全，不会自动合并账户。您可以换一个手机号，或联系客服 400-035-8885 处理。');
  assert.deepEqual([pg.data.dialog.cancelText, pg.data.dialog.confirmText], ['联系客服', '换个手机号']);
  assert.equal(state.get().session.phoneMasked, '139****9000', '冲突时不覆盖');
  pg.onDialogConfirm(); assert.equal(pg.data.chPhone, ''); assert.equal(pg.data.changeVisible, true);
  await assert.rejects(api.changeLoginPhone({ phone: '13700137000', code: '123456' }), (e) => e.code === 'INVALID', '没发过验证码');
  pg.onUnload();
});

test('个人信息：退出登录用 state.logout()；撤回隐私授权二次确认后退出；隐私接口失败有提示', async () => {
  fresh(true, false);
  let pg = await page('PROFILE');
  pg.onLogout(); assert.deepEqual([pg.data.dialog.title, pg.data.dialog.desc, pg.data.dialog.confirmText], ['退出登录？', '退出后仍可浏览门店；查看报价、订单和下单时需要重新登录。', '退出登录']);
  pg.onDialogCancel(); assert.equal(state.get().session.loggedIn, true);
  pg.onLogout(); pg.onDialogConfirm();
  assert.equal(state.get().session.loggedIn, false); assert.equal(state.get().session.phoneMasked, ''); assert.deepEqual(env.nav.pop(), { kind: 'switchTab', url: routes.MINE });
  fresh(true, false); state.patch('flags', { locationAsked: true });
  pg = await page('PROFILE');
  pg.onPrivacy(); assert.equal(pg.data.privacyVisible, true); assert.equal(pg.data.locationText, '未授权');
  pg.onToSetting(); assert.equal(pg.data.locationText, '已授权');
  env.mode = 'fail'; pg.onToSetting(); pg.onPrivacyContract(); env.mode = 'ok';
  assert.ok(toasts.includes(TA.profile.privacySheet.settingFailed)); assert.ok(toasts.includes(TA.profile.privacySheet.contractFailed));
  pg.onWithdraw(); assert.deepEqual([pg.data.dialog.title, pg.data.dialog.desc, pg.data.dialog.confirmText], ['撤回隐私授权？', '撤回后将退出登录。已签署的协议和租用中的订单不受影响。', '确认撤回']);
  pg.onDialogConfirm(); await tick();
  assert.equal(state.get().session.loggedIn, false); assert.equal(state.get().flags.locationAsked, false); assert.deepEqual(env.nav.pop(), { kind: 'switchTab', url: routes.MINE });
});

test('个人信息：注销 —— 有租用中的订单时拦截并给出笔数；没有订单时可提交申请', async () => {
  fresh(true, true);
  let pg = await page('PROFILE');
  pg.onDelete(); assert.equal(pg.data.deleteVisible, true);
  assert.deepEqual(pg.data.T.p.deleteSheet.conditions, ['没有租用中或待支付的订单', '押金已退还', '没有处理中的发票或退款']);
  pg.onDeleteConfirm(); await tick();
  assert.equal(pg.data.dialog.kind, 'blocked'); assert.equal(pg.data.dialog.title, '暂时不能注销'); assert.equal(pg.data.dialog.desc, '您有 3 个租用中的订单，退仓并结清后可申请注销。');
  pg.onDialogConfirm(); assert.deepEqual(env.nav.pop(), { kind: 'switchTab', url: routes.ORDERS });
  const b = rules.deletionBlockers(db.orders); assert.deepEqual([b.active, b.pending, b.blocked], [3, 1, true]);
  fresh(true, false); pg = await page('PROFILE');
  pg.onDelete(); pg.onDeleteConfirm(); await tick();
  assert.ok(toasts.includes('已提交注销申请')); assert.equal(pg.data.deleteVisible, false); assert.equal(pg.data.dialog.visible, false);
});

test('我的：未登录各入口的行为；登录守卫落点逻辑保留', async () => {
  fresh(false, false);
  const pg = await page('MINE');
  assert.equal(pg.data.headTitle, '欢迎使用迷你考拉'); assert.equal(pg.data.headSub, '查看订单与用仓服务'); assert.equal(pg.data.showNew, true); assert.equal(pg.data.sys, '');
  assert.deepEqual(pg.data.groups.map((g) => [g.title, g.items.map((i) => i.t)]), [['我的记录', ['预约用仓', '找仓进度']], ['服务与权益', ['我的收藏', '优惠与权益', '消息']], ['账务与企业', ['开票抬头', '批量开票', '押金', '企业认证']], ['更多服务', ['运输与搬运', '推荐有礼', '联系顾问', '关于迷你考拉']]]);
  assert.equal(pg.data.groups[0].items[1].s, '尚无保存的需求'); assert.ok(pg.data.groups.every((g) => g.items.every((i) => i.count === 0)));
  for (const k of ['ENT_TITLES', 'ENT_BATCH', 'DEPOSIT', 'ENT_CERT']) { pg.setData({ loginVisible: false }); env.nav.length = 0; pg.onItem(tap({ k })); assert.equal(pg.data.loginVisible, true, k); assert.equal(env.nav.length, 0, k); }
  for (const k of ['NEEDS', 'PROGRESS', 'FAVORITES', 'COUPONS', 'MESSAGES', 'TRANSPORT', 'REFERRAL', 'SUPPORT', 'BRAND']) { env.nav.length = 0; pg.onItem(tap({ k })); assert.deepEqual(env.nav, [{ kind: 'navigateTo', url: routes[k] }], k); }
  pg.setData({ loginVisible: false }); pg.onHead(); assert.equal(pg.data.loginVisible, true);
  pg.onNewCta(); assert.deepEqual(env.nav.pop(), { kind: 'switchTab', url: routes.STORES });
  // 落点：被受限页带过来时打开登录层一次并带提示
  fresh(false, false); state.patch('flags', { pendingLogin: 'mine' });
  const land = await page('MINE'); assert.equal(land.data.loginVisible, true); assert.equal(land.data.loginTip, '请登录'); assert.equal(state.get().flags.pendingLogin, '');
});

test('我的：已登录 —— 掩码手机号、角标、多处在租时的「我的仓位」、找仓进度按原单位', async () => {
  fresh(true, true);
  state.set('requirement', { capacity_m3: 4.8, input_unit: 'm2', input_value: 2, term_months: 6 });
  state.set('favorites', { stores: ['SIM_BJ01'], units: ['SIM_BJ02_U03'] });
  await api.claimCoupons();
  const pg = await page('MINE');
  assert.equal(pg.data.headTitle, '我的迷你考拉'); assert.equal(pg.data.headSub, '138****8000'); assert.equal(pg.data.showNew, false);
  const row = (k) => pg.data.groups.reduce((a, g) => a.concat(g.items), []).find((i) => i.k === k);
  assert.equal(row('PROGRESS').s, '2㎡ · 约4.8m³ · 6个月'); assert.equal(row('FAVORITES').count, 2);
  assert.equal(row('COUPONS').count, 3, 'FIX-01 R-14：有付款订单时两张新客券仍可用，加 1 项服务权益'); assert.equal(row('MESSAGES').count, (await api.getMessagesUnread()).unread);
  assert.equal(pg.data.assets.length, 2); assert.equal(pg.data.assetsAll, '查看全部 3处');
  assert.deepEqual(pg.data.assets.map((a) => a.tag), ['即将到期', '租用中']); assert.match(pg.data.assets[1].line, /^12个月 · 至 \d{4}-\d{2}-\d{2}$/);
  env.nav.length = 0; pg.onAsset(tap({ id: pg.data.assets[0].id })); assert.deepEqual(env.nav.pop(), { kind: 'navigateTo', url: routes.ORDER_DETAIL + '?id=' + pg.data.assets[0].id });
  pg.onAssetsAll(); assert.deepEqual(env.nav.pop(), { kind: 'switchTab', url: routes.ORDERS });
  pg.onItem(tap({ k: 'DEPOSIT' })); assert.deepEqual(env.nav.pop(), { kind: 'navigateTo', url: routes.DEPOSIT });
  pg.onHead(); assert.deepEqual(env.nav.pop(), { kind: 'navigateTo', url: routes.PROFILE });
  assert.ok(!JSON.stringify(pg.data).match(/1[3-9]\d{9}/), '页面数据里没有未掩码的手机号');
});

test('企业认证：还需填写 → 校验 → 提交 → 审核中 → 已认证；含驳回词 → 未通过 → 更正后重新提交', async () => {
  fresh(true, false);
  const pg = await page('ENT_CERT');
  assert.equal(pg.data.view, 'form'); assert.equal(pg.data.need, '还需填写：企业名称、统一社会信用代码、营业执照、联系人'); assert.equal(pg.data.ready, false);
  pg.onSubmit(); await tick(); assert.equal((await api.getEntCert()).status, 'none');
  pg.onField(input('演示商贸有限公司', 'name')); pg.onField(input('9111010', 'tax')); pg.onTaxBlur(); assert.equal(pg.data.taxError, '请填写 18 位统一社会信用代码');
  pg.onUpload(); assert.equal(pg.data.uploadText, '已上传 1 张');
  pg.onField(input('王经理', 'contact')); pg.onField(input('13800000001', 'phone'));
  assert.equal(pg.data.need, '还需填写：统一社会信用代码'); assert.equal(pg.data.ready, false);
  pg.onField(input('91110105MA01K7XQ3R', 'tax')); assert.equal(pg.data.taxError, ''); assert.equal(pg.data.ready, true); assert.equal(pg.data.need, '');
  pg.onSubmit(); assert.equal(pg.data.submitText, '提交中…'); await tick();
  assert.equal(pg.data.view, 'result'); assert.deepEqual([pg.data.head.title, pg.data.head.tag, pg.data.head.sub], ['资料审核中', '审核中', '审核结果会通过消息通知您。']);
  assert.deepEqual(pg.data.steps.map((s) => s.cls), ['done', 'cur', '']); assert.equal(pg.data.steps[1].s, '审核时限请咨询客服');
  assert.equal(pg.data.contactLine, '王经理 138****0001'); assert.ok(!JSON.stringify(pg.data.company).includes('13800000001'));
  pastReview(db.kv.account.cert); pg.onShow(); await tick();
  assert.equal(pg.data.status, 'verified'); assert.equal(pg.data.head.title, '企业认证已完成'); assert.deepEqual(pg.data.steps.map((s) => s.cls), ['done', 'done', 'done']);
  pg.onTitles(); assert.deepEqual(env.nav.pop(), { kind: 'navigateTo', url: routes.ENT_TITLES }); pg.onBatch(); assert.deepEqual(env.nav.pop(), { kind: 'navigateTo', url: routes.ENT_BATCH });
  // 未通过
  fresh(true, false);
  await api.submitEntCert({ name: '演示' + C.demo.certRejectKeyword + '公司', tax: '91110105MA01K7XQ3R', licenseCount: 1, contact: '王经理', phone: '13800000001' });
  pastReview(db.kv.account.cert);
  const p2 = await page('ENT_CERT');
  assert.equal(p2.data.status, 'failed'); assert.equal(p2.data.head.title, '认证未通过'); assert.deepEqual(p2.data.steps.map((s) => s.cls), ['done', 'fail', '']); assert.equal(p2.data.reason, '原因：营业执照照片不清晰'); // 演示环境给一条样例原因（_db.REASON.cert）
  p2.onFix(); assert.equal(p2.data.view, 'form'); assert.equal(p2.data.form.tax, '91110105MA01K7XQ3R'); assert.equal(p2.data.need, '还需填写：营业执照、联系人', 'FIX-01 D-06：未通过后要重新上传营业执照'); assert.equal(p2.data.form.licenseCount, 0);
  p2.onShow(); await tick(); assert.equal(p2.data.view, 'form', '选图返回触发 onShow 时不跳回结果页');
  p2.onAdvisor(); assert.deepEqual(env.nav.pop(), { kind: 'navigateTo', url: routes.SUPPORT });
  await assert.rejects(api.submitEntCert({ name: 'x', tax: '123', licenseCount: 1, contact: 'a', phone: '13800000001' }), (e) => e.code === 'INVALID' && e.fields[0] === 'tax');
});

test('开票抬头：演示列表（个人邮箱掩码）→ 设为默认 → 新增校验 → 编辑 → 删除确认 → 空态', async () => {
  fresh(true, false);
  let pg = await page('ENT_TITLES');
  assert.equal(pg.data.mode, 'list');
  assert.deepEqual(pg.data.rows.map((r) => [r.name, r.isDefault, r.line, r.email]), [['安贞商贸有限公司', true, '企业 · 税号 91110105MA01K7XQ3R', '接收邮箱 caiwu@163.com'], ['王**', false, '个人', '接收邮箱 w***@163.com']]);
  pg.onSetDefault(tap({ id: 'T2' })); await tick(); assert.deepEqual(pg.data.rows.map((r) => r.isDefault), [false, true]);
  pg.onAdd(); assert.deepEqual(env.nav.pop(), { kind: 'navigateTo', url: routes.ENT_TITLES + '?mode=add' });
  pg.onEdit(tap({ id: 'T1' })); assert.deepEqual(env.nav.pop(), { kind: 'navigateTo', url: routes.ENT_TITLES + '?id=T1' });
  // 新增
  let f = await page('ENT_TITLES', { mode: 'add' });
  assert.equal(f.data.mode, 'form'); assert.equal(f.data.isEdit, false); assert.equal(f.data.ready, false);
  f.onField(input('演示科技有限公司', 'name')); f.onField(input('9111', 'tax')); f.onTaxBlur(); assert.equal(f.data.taxError, '请填写有效的纳税人识别号');
  f.onField(input('fapiao@', 'email')); f.onEmailBlur(); assert.equal(f.data.emailError, '请填写有效的邮箱'); f.onSave(); await tick(); assert.equal((await api.getInvoiceTitles()).length, 2);
  f.onField(input('91110108MA00000000', 'tax')); f.onField(input('fapiao@example.com', 'email')); assert.equal(f.data.ready, true);
  f.onDefault({ detail: { value: true } }); f.onSave(); await tick();
  assert.deepEqual(env.nav.pop(), { kind: 'navigateBack', url: undefined });
  let list = await api.getInvoiceTitles(); assert.deepEqual(list.map((t) => [t.id, t.isDefault]), [['T1', false], ['T2', false], ['T3', true]]);
  // 个人抬头不要税号
  f = await page('ENT_TITLES', { mode: 'add' }); f.onType(tap({ v: 'person' })); f.onField(input('王**', 'name')); f.onField(input('wang@example.com', 'email')); assert.equal(f.data.ready, true);
  // 编辑 + 删除
  f = await page('ENT_TITLES', { id: 'T3' });
  assert.equal(f.data.isEdit, true); assert.equal(f.data.form.name, '演示科技有限公司');
  f.onRemove(); assert.equal(f.data.dialog.visible, true); assert.deepEqual([f.data.T.t.deleteDialog.title, f.data.T.t.deleteDialog.desc], ['删除这个抬头？', '删除后不影响已开具的发票。']);
  f.onDialogCancel(); assert.equal((await api.getInvoiceTitles()).length, 3);
  f.onRemove(); f.onDialogConfirm(); await tick();
  list = await api.getInvoiceTitles(); assert.deepEqual(list.map((t) => [t.id, t.isDefault]), [['T1', true], ['T2', false]], '删掉默认抬头后第一条成为默认');
  await api.deleteInvoiceTitle({ id: 'T1' }); await api.deleteInvoiceTitle({ id: 'T2' });
  pg = await page('ENT_TITLES'); assert.equal(pg.data.rows.length, 0); assert.equal(pg.data.T.t.emptyTitle, '还没有开票抬头');
});

const verifyCert = async () => { await api.submitEntCert({ name: '演示商贸有限公司', tax: '91110105MA01K7XQ3R', licenseCount: 1, contact: '王经理', phone: '13800000001' }); pastReview(db.kv.account.cert); await api.getEntCert(); };
test('批量开票：未认证拦截；暂无可开票订单；选择 → 确认 → 提交 → 已提交 → 已开具', async () => {
  fresh(true, true);
  let pg = await page('ENT_BATCH');
  assert.equal(pg.data.view, 'gate'); pg.onCert(); assert.deepEqual(env.nav.pop(), { kind: 'navigateTo', url: routes.ENT_CERT });
  fresh(true, false); await verifyCert();
  pg = await page('ENT_BATCH'); assert.equal(pg.data.view, 'empty'); pg.onOrders(); assert.deepEqual(env.nav.pop(), { kind: 'switchTab', url: routes.ORDERS });
  fresh(true, true); await verifyCert();
  const orders = await api.getOrders();
  pg = await page('ENT_BATCH');
  assert.equal(pg.data.view, 'select'); assert.equal(pg.data.rows.length, 4, '5 笔演示订单里待支付的不列'); assert.equal(pg.data.allText, '全选（4 笔）');
  assert.equal(pg.data.hasSel, false); assert.equal(pg.data.selText, '已选 0 笔'); assert.equal(pg.data.sumText, '¥0');
  env.nav.length = 0; pg.onNext(); assert.equal(env.nav.length, 0, '没选订单不能下一步');
  // 金额只读 order.quote：减后整期租金 + 管理费，不含押金
  const o0 = orders.find((o) => o.id === pg.data.rows[0].id), o1 = orders.find((o) => o.id === pg.data.rows[1].id);
  const amt = (o) => o.quote.rent_after_discount + o.quote.management_fee;
  assert.equal(pg.data.rows[0].amount, rules.money(amt(o0))); assert.match(pg.data.rows[0].line2, /^MK\d{12} · 付款 \d{4}-\d{2}-\d{2}$/);
  pg.onToggle(tap({ id: o0.id })); pg.onToggle(tap({ id: o1.id }));
  assert.equal(pg.data.selText, '已选 2 笔'); assert.equal(pg.data.sumText, rules.money(amt(o0) + amt(o1))); assert.equal(pg.data.allOn, false);
  pg.onToggleAll(); assert.equal(pg.data.allOn, true); assert.equal(pg.data.selText, '已选 4 笔'); pg.onToggleAll(); assert.equal(pg.data.hasSel, false);
  pg.onToggle(tap({ id: o0.id })); pg.onToggle(tap({ id: o1.id })); pg.onNext();
  const url = routes.ENT_BATCH + '?ids=' + o0.id + ',' + o1.id; assert.deepEqual(env.nav.pop(), { kind: 'navigateTo', url });
  // 确认页
  const cf = await page('ENT_BATCH', { ids: o0.id + ',' + o1.id });
  assert.equal(cf.data.view, 'confirm'); assert.deepEqual(cf.data.title, { name: '安贞商贸有限公司', tax: '91110105MA01K7XQ3R', email: 'caiwu@163.com' });
  assert.equal(cf.data.contentTitle, '开票内容（2 笔）'); assert.equal(cf.data.lines[0].line2, '租金 ' + rules.money(o0.quote.rent_after_discount) + ' · 管理费 ¥50'); assert.equal(cf.data.sumText, rules.money(amt(o0) + amt(o1)));
  assert.equal(cf.data.T.b.contentFine, '本页列出租金与管理费；押金开票事宜请咨询客服。');
  cf.onChangeTitle(); assert.equal(cf.data.title.name, '安贞商贸有限公司', '演示环境的选择框默认选第一项');
  cf.onSubmit(); assert.equal(cf.data.submitText, '提交中…'); cf.onSubmit(); await tick();
  assert.equal(cf.data.view, 'result'); assert.deepEqual([cf.data.result.title, cf.data.result.tag, cf.data.result.sub], ['开票申请已提交', '处理中', '开具后发送到 caiwu@163.com']);
  assert.deepEqual(cf.data.result.steps.map((s) => s.cls), ['done', 'cur', '']); assert.equal(cf.data.result.steps[1].s, '1 天内开具', 'FIX-01 R-02');
  assert.equal(cf.data.result.count, '2 笔'); assert.equal(cf.data.result.amount, rules.money(amt(o0) + amt(o1))); assert.equal(db.kv.account.batches.length, 1, '连点两次只提交一笔');
  assert.equal(rules.invoiceable(await api.getOrders()).length, 2, '已申请的订单不再可选');
  cf.onOrders(); assert.deepEqual(env.nav.pop(), { kind: 'switchTab', url: routes.ORDERS });
  // 财务开具后
  pastReview(db.kv.account.batches[0]);
  const done = await page('ENT_BATCH');
  assert.equal(done.data.view, 'result'); assert.deepEqual([done.data.result.title, done.data.result.sub], ['发票已开具', '已发送到 caiwu@163.com']); assert.deepEqual(done.data.result.steps.map((s) => s.cls), ['done', 'done', 'done']);
  done.onDownload(); done.onResend(); await tick();
  assert.ok(toasts.includes(TA.ent.batch.downloadFailed), '演示环境没有发票文件：给提示，不报错'); assert.ok(toasts.includes('已重新发送到 caiwu@163.com'));
  assert.equal((await api.getOrders()).filter((o) => o.invoice.status === 'issued').length, 2);
  done.onUnload(); await tick();
  const again = await page('ENT_BATCH'); assert.equal(again.data.view, 'select'); assert.equal(again.data.rows.length, 2);
});

test('批量开票：未成功 → 订单放回可开票 → 修改后重新提交', async () => {
  fresh(true, true); await verifyCert();
  await api.saveInvoiceTitle({ id: 'T1', type: 'company', name: '安贞商贸有限公司', tax: '91110105MA01K7XQ3R', email: C.demo.invoiceFailEmailPrefix + '@example.com', isDefault: true });
  const ids = rules.invoiceable(await api.getOrders()).slice(0, 2).map((o) => o.id);
  await api.submitBatchInvoice({ order_ids: ids, title_id: 'T1' });
  await assert.rejects(api.submitBatchInvoice({ order_ids: ids, title_id: 'T1' }), (e) => e.code === 'CONFLICT');
  pastReview(db.kv.account.batches[0]);
  const pg = await page('ENT_BATCH');
  assert.deepEqual([pg.data.result.title, pg.data.result.tag, pg.data.result.sub, pg.data.result.reason], ['开票未成功', '未成功', '', '原因：接收邮箱无法送达']); assert.deepEqual(pg.data.result.steps.map((s) => s.cls), ['done', 'fail', '']);
  assert.equal(rules.invoiceable(await api.getOrders()).length, 4);
  pg.onResubmit(); assert.deepEqual(env.nav.pop(), { kind: 'redirectTo', url: routes.ENT_BATCH + '?ids=' + ids.join(',') });
  pg.onAdvisor(); assert.deepEqual(env.nav.pop(), { kind: 'navigateTo', url: routes.SUPPORT });
});

test('企业三页与推荐有礼：未登录时不取个人数据，先登录', async () => {
  for (const n of ['ENT_CERT', 'ENT_TITLES', 'ENT_BATCH']) {
    fresh(false, true); const pg = await page(n);
    assert.equal(pg.data.sys, '', n); assert.equal(pg.data.loggedIn, false, n); pg.onLogin(); assert.equal(pg.data.loginVisible, true, n);
  }
  fresh(false, false);
  const pg = await page('REFERRAL');
  assert.equal(pg.data.loggedIn, false); assert.equal(pg.data.code, ''); assert.deepEqual(pg.onShareAppMessage(), { title: '迷你考拉仓', path: routes.HOME });
  pg.onLogin(); assert.equal(pg.data.loginVisible, true);
});

test('推荐有礼：已登录转发带邀请码、复制邀请码；失败有提示；不出现奖励金额', async () => {
  fresh(true, false);
  const pg = await page('REFERRAL');
  assert.equal(pg.data.code, 'MK8000'); assert.deepEqual(pg.onShareAppMessage(), { title: '迷你考拉仓', path: routes.HOME + '?ref=MK8000' });
  let copied = ''; wx.setClipboardData = (o) => { if (env.mode === 'ok') { copied = o.data; o.success(); } else o.fail({ errMsg: 'fail' }); };
  pg.onCopy(); assert.equal(copied, 'MK8000', 'FIX-01 D-12：复制的是邀请码，不是页面路径'); assert.ok(toasts.includes('邀请码已复制'));
  env.mode = 'fail'; pg.onCopy(); env.mode = 'ok'; assert.ok(toasts.includes(TA.referral.copyFailed));
  assert.deepEqual([TA.referral.noticeTitle, TA.referral.noticeSub], ['活动筹备中', '活动开始后，规则与奖励会在这里更新。']);
  assert.ok(!/¥|元|\d+\s*%/.test(JSON.stringify(TA.referral)));
  assert.deepEqual((await api.getReferral()).records, []);
});

test('关于迷你考拉：三态与按钮去向', async () => {
  fresh(false, false);
  const pg = await page('BRAND');
  assert.equal(pg.data.sys, ''); assert.deepEqual(pg.data.metrics.map((m) => m.n), ['14年', '590+', '30万+']); assert.equal(pg.data.pillars.length, 4);
  pg.onStores(); assert.deepEqual(env.nav.pop(), { kind: 'switchTab', url: routes.STORES }); pg.onContact(); assert.deepEqual(env.nav.pop(), { kind: 'navigateTo', url: routes.SUPPORT });
  const real = api.getBrandInfo;
  api.getBrandInfo = () => Promise.reject({ code: 'NETWORK', message: '' }); const off = await page('BRAND'); assert.equal(off.data.sys, 'offline');
  api.getBrandInfo = () => Promise.reject({ code: 'INVALID', message: '' }); const bad = await page('BRAND'); assert.equal(bad.data.sys, 'failed');
  api.getBrandInfo = real; bad.onRetry(); await tick(); assert.equal(bad.data.sys, '');
});

test('静态：账户域 9 页的 WXML 不写死中文、不带占位标记；文案不出现禁用字样与违约金比例', () => {
  const dirs = ['pages/mine', 'pkg-account/favorites', 'pkg-account/coupons', 'pkg-account/profile', 'pkg-account/referral', 'pkg-account/brand', 'pkg-account/ent-cert', 'pkg-account/ent-titles', 'pkg-account/ent-batch', 'pkg-account/acc-dialog'];
  for (const d of dirs) {
    const wxml = fs.readFileSync(path.join(root, d, 'index.wxml'), 'utf8').replace(/\{\{.*?\}\}|aria-label="[^"]*"/g, '');
    assert.ok(!/[一-鿿]/.test(wxml), d + ' 的 WXML 里有写死的中文');
    assert.ok(!/AUTO-PLACEHOLDER/.test(fs.readFileSync(path.join(root, d, 'index.js'), 'utf8')), d);
  }
  const all = JSON.stringify(TA);
  assert.ok(!/待业务提供|待财务确认|演示占位|示例|违约金|\d+\s*倍/.test(all));
  assert.ok(!/退租|验收|身份验证|用仓地址|专属客服|租赁中/.test(all));
  assert.ok(!/1[3-9]\d{9}/.test(all), '文案里没有完整手机号');
});
