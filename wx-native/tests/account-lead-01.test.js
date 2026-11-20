// ACCOUNT-LEAD-01：账户和留资域的演示场景与事件（演示工具页的开关）、消息页未登录态、看仓弹层报错、公共组件迁移后的样式清理。
// 在假的 wx 环境里跑，验证的是代码逻辑，不是微信真实渲染。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), api = R('services/api'), demo = R('services/demo'), scenarios = R('mock/scenarios');
const { db, REASON } = R('services/mock-ext/_db');
const lead = R('core/lead'), CA = R('core/config-account'), TL = R('i18n/lead'), TA = R('i18n/after');
env.loadApp();
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 15));
const rejects = (p, code) => assert.rejects(p, (e) => e.code === code, code);
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const D0 = Object.assign({}, CA.demo);
function fresh(loggedIn) {
  state.reset(); env.nav.length = 0; db.orders.length = 0; db.leads.length = 0; db.messages.length = 0; db.seq = 0; db.seeded = true; db.kv = {}; db.sms = {};
  scenarios.write({ scenario: '', stock: 'normal', events: {}, net: 'instant' });
  if (loggedIn !== false) state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
  CA.demo.reviewSeconds = 0.02;
}
test.after(() => Object.assign(CA.demo, D0));
const page = async (base, q) => { const pg = env.newPage(base, q || {}); await tick(40); return pg; };
const BOOK = { type: 'booking', address: '朝阳区安贞西里', capacity_m3: 3.5, term_months: 6 };

test('演示场景「有预约记录」：4 条记录，四种类型和已撤回都有，预约记录页照常显示', async () => {
  assert.ok(demo.applyScenario('member_leads'));
  const list = await api.getLeads({});
  assert.equal(list.length, 4);
  assert.deepEqual(list.map((x) => x.type), ['booking', 'enterprise', 'visit', 'advisor'], '新的在前');
  assert.equal(list.filter((x) => x.status === lead.STATUS.WITHDRAWN).length, 1);
  list.forEach((x) => { assert.match(x.id, /^LEAD\d+$/); assert.equal(x.phone_masked, '138****8000'); assert.ok(x.accepted_at <= Date.now()); });
  const v = list.find((x) => x.type === 'visit'); assert.equal(v.store_id, 'SIM_BJ02'); assert.ok(lead.validDate(v.preferred_date, Date.now())); assert.equal(v.time_slot, '下午');
  const e = list.find((x) => x.type === 'enterprise'); assert.ok(e.capacity_band); assert.equal(e.capacity_hint, e.capacity_band);
  assert.equal((await api.getLeads({})).length, 4, '再取一次不重复造');
  const pg = await page('pkg-account/needs/index');
  assert.equal(pg.data.sys, ''); assert.equal(pg.data.list.length, 4); assert.equal(pg.data.active, true);
  assert.deepEqual(pg.data.list.map((x) => x.title), [TL.needs.titles.booking, TL.needs.titles.enterprise, '预约看仓', TL.needs.titles.advisor]);
  assert.equal(pg.data.list[3].off, true); assert.equal(pg.data.list[1].ent, true);
  // 在场景数据上继续提交，编号接着往下排
  const rec = await api.submitLead(BOOK); assert.equal(rec.no, lead.leadNo(5)); assert.equal((await api.getLeads({})).length, 5);
});

test('演示场景「消息较多」：7 条消息 3 条未读，按时间倒序，带订单的能进对应页面', async () => {
  assert.ok(demo.applyScenario('member_inbox'));
  assert.equal((await api.getMessagesUnread({})).unread, 3);
  const pg = await page('pkg-account/messages/index');
  assert.equal(pg.data.guest, false); assert.equal(pg.data.empty, false); assert.equal(pg.data.list.length, 7);
  assert.equal(pg.data.list.filter((x) => x.unread).length, 3);
  assert.deepEqual(pg.data.list.slice(0, 3).map((x) => x.title), [TA.messages.demo.inspectFailed, TA.messages.demo.invoiceFailed, TA.messages.demo.renewQuote]);
  pg.data.list.forEach((x) => { assert.ok(x.orderId, x.title + ' 带订单号'); assert.ok(x.link); assert.ok(db.orders.some((o) => o.id === x.orderId)); });
  env.nav.length = 0; pg.onLink({ currentTarget: { dataset: { i: 0 } } });
  assert.match(env.nav[0].url, /pkg-after\/exit\/index\?id=/);
  await tick(); assert.equal((await api.getMessagesUnread({})).unread, 0, '看过即已读');
});

test('消息页：未登录显示「登录后查看消息」和登录按钮，不发请求；已登录没有消息显示「暂无消息」', async () => {
  fresh(false);
  let pg = await page('pkg-account/messages/index');
  assert.equal(pg.data.guest, true); assert.equal(pg.data.empty, false); assert.equal(pg.data.sys, ''); assert.equal(pg.data.T.m.guestTitle, '登录后查看消息');
  pg.onLogin(); assert.equal(pg.data.loginVisible, true);
  state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' }); pg.onLoginSuccess(); await tick(40);
  assert.equal(pg.data.guest, false); assert.equal(pg.data.empty, true);
  const w = read('pkg-account/messages/index.wxml');
  assert.match(w, /wx:elif="\{\{guest\}\}"[^>]*title="\{\{T\.m\.guestTitle\}\}"/); assert.match(w, /hover-class="\{\{item\.link \? 'mk-tap--hover' : 'none'\}\}"/);
});

test('演示场景「有收藏（含已失效）」：3 家门店 2 个仓位，暂停营业和已租出各 1 个', async () => {
  assert.ok(demo.applyScenario('member_favorites'));
  const pg = await page('pkg-account/favorites/index');
  assert.equal(pg.data.empty, false); assert.equal(pg.data.stores.length, 3); assert.equal(pg.data.units.length, 2);
  assert.deepEqual(pg.data.stores.filter((x) => x.gone).map((x) => x.id), ['SIM_BJ05']);
  assert.deepEqual(pg.data.units.filter((x) => x.gone).map((x) => x.id), ['SIM_BJ01_U02']);
  env.nav.length = 0; pg.onStore({ currentTarget: { dataset: { id: 'SIM_BJ05', gone: true } } });
  assert.equal(env.nav[0].kind, 'switchTab', '暂停营业的门店去附近门店');
});

test('演示场景「已领新客券」与三种企业认证状态', async () => {
  assert.ok(demo.applyScenario('member_coupons'));
  let pg = await page('pkg-account/coupons/index');
  assert.equal(pg.data.empty, false); assert.equal(pg.data.coupons.length, 2); assert.ok(pg.data.coupons.every((c) => c.canUse && c.amount)); assert.equal(pg.data.benefits.length, 1);
  for (const [id, st] of [['ent_reviewing', 'reviewing'], ['ent_verified', 'verified'], ['ent_rejected', 'failed']]) {
    assert.ok(demo.applyScenario(id)); scenarios.setEvent('review_hold', true);
    const c = await api.getEntCert({});
    assert.equal(c.status, st, id); assert.ok(c.company.name); assert.equal(c.reason, st === 'failed' ? REASON.cert : '');
    scenarios.setEvent('review_hold', false);
  }
  assert.ok(demo.applyScenario('ent_verified'));
  pg = await page('pkg-account/ent-cert/index'); assert.equal(pg.data.view, 'result'); assert.equal(pg.data.status, 'verified');
  assert.ok((await api.getOrders({})).length >= 5, '企业场景沿用默认演示订单');
});

test('留资事件：提交失败不落库可重试；提交结果未确认已落库且核对不重复建单；两者触发一次后自动关闭', async () => {
  fresh();
  scenarios.setEvent('lead_submit_fail', true);
  await rejects(api.submitLead(Object.assign({ request_key: 'K1' }, BOOK)), 'NETWORK');
  assert.equal(db.leads.length, 0); assert.equal(scenarios.eventOn('lead_submit_fail'), false);
  assert.ok((await api.submitLead(Object.assign({ request_key: 'K1' }, BOOK))).id); assert.equal(db.leads.length, 1);
  scenarios.setEvent('lead_submit_timeout', true);
  await rejects(api.submitLead(Object.assign({ request_key: 'K2' }, BOOK)), 'TIMEOUT');
  assert.equal(db.leads.length, 2); assert.equal(scenarios.eventOn('lead_submit_timeout'), false);
  const again = await api.submitLead(Object.assign({ request_key: 'K2' }, BOOK)); assert.equal(again.id, db.leads[1].id); assert.equal(db.leads.length, 2);
  // 校验没过时不消耗事件
  scenarios.setEvent('lead_submit_fail', true);
  await rejects(api.submitLead({ type: 'booking', address: '' }), 'INVALID'); assert.equal(scenarios.eventOn('lead_submit_fail'), true);
});

test('预约页接上留资事件：失败态提示可重试，未确认态核对后进结果页；「按非服务时段受理」走非服务时段文案', async () => {
  fresh();
  const pg = await page('pkg-lead/booking/index', {});
  pg.onAddress({ detail: { value: '朝阳区安贞西里' } });
  scenarios.setEvent('lead_submit_fail', true);
  await pg.onSubmit();
  assert.equal(pg.data.status, 'failed'); assert.equal(pg.data.statusTitle, TL.common.failedTitle); assert.equal(pg.data.statusBtn, TL.common.retry); assert.equal(db.leads.length, 0);
  scenarios.setEvent('lead_submit_timeout', true);
  pg.onRetrySubmit(); await tick(40);
  assert.equal(pg.data.status, 'unknown'); assert.equal(pg.data.statusBtn, TL.common.recheck); assert.equal(db.leads.length, 1);
  scenarios.setEvent('lead_off_hours', true);
  pg.onRetrySubmit(); await tick(40);
  assert.equal(pg.data.status, 'success'); assert.equal(db.leads.length, 1, '核对同一请求不重复建单');
  const p2 = await page('pkg-lead/booking/index', {});
  p2.onAddress({ detail: { value: '朝阳区望京' } }); await p2.onSubmit();
  assert.equal(p2.data.status, 'success'); assert.equal(p2.data.result.ack, TL.ack.offHours); assert.equal(p2.data.result.hoursNote, TL.ack.hoursNote);
  assert.equal(scenarios.eventOn('lead_off_hours'), true, '持续生效');
});

test('账户事件：验证码发送失败、企业认证未通过、批量开票未成功、审核暂不处理', async () => {
  fresh();
  scenarios.setEvent('sms_fail', true);
  await rejects(api.sendSmsCode({ phone: '13900001111' }), 'NETWORK'); assert.equal(db.sms['13900001111'], undefined);
  assert.ok((await api.sendSmsCode({ phone: '13900001111' })).resend_seconds);
  const cert = { name: '北京示例科技有限公司', tax: '91110105MA01K7XQ3R', licenseCount: 1, contact: '王经理', phone: '13800000001' };
  scenarios.setEvent('review_hold', true);
  await api.submitEntCert(cert); await tick(40);
  assert.equal((await api.getEntCert({})).status, 'reviewing', '审核暂不处理：一直停在审核中');
  scenarios.setEvent('review_hold', false); scenarios.setEvent('cert_reject', true);
  let c = await api.getEntCert({}); assert.equal(c.status, 'failed'); assert.equal(c.reason, REASON.cert); assert.equal(scenarios.eventOn('cert_reject'), false);
  await api.submitEntCert(cert); await tick(40);
  c = await api.getEntCert({}); assert.equal(c.status, 'verified'); assert.equal(c.reason, '');
  // 批量开票
  const { mk } = R('services/mock-ext/_db'), S = R('core/order').STAGE;
  const o = mk({ store: 'SIM_BJ01', units: ['SIM_BJ01_U05'], months: 12, agoDays: 40, startAt: Date.now() - 39 * 86400e3, stage: S.ACTIVE });
  const title = (await api.getInvoiceTitles({}))[0];
  scenarios.setEvent('batch_invoice_fail', true);
  await api.submitBatchInvoice({ order_ids: [o.id], title_id: title.id }); await tick(40);
  const b = await api.getBatchInvoice({}); assert.equal(b.status, 'failed'); assert.equal(b.reason, REASON.batch); assert.equal(scenarios.eventOn('batch_invoice_fail'), false);
});

test('看仓弹层：已登录时手机号报错不再提「使用微信手机号」；未登录仍提示可用微信手机号', async () => {
  fresh();
  const store = await api.getStore({ id: 'SIM_BJ01' });
  let c = env.newComponent('components/mk-visit-sheet/index', { store }); c.open();
  c.onPhone({ detail: { value: '123' } }); await c.onSubmit();
  assert.equal(c.data.phoneError, TL.visit.errPhoneVerified); assert.ok(!/微信手机号/.test(c.data.phoneError)); assert.equal(c.data.phoneFocus, true);
  fresh(false);
  c = env.newComponent('components/mk-visit-sheet/index', { store }); c.open();
  await c.onSubmit();
  assert.equal(c.data.phoneError, TL.visit.errPhone); assert.match(c.data.phoneError, /微信手机号/);
  scenarios.setEvent('lead_submit_fail', true);
  c.onPhone({ detail: { value: '13800008000' } }); await c.onSubmit();
  assert.ok(c.data.error); assert.equal(c.data.success, null); assert.equal(db.leads.length, 0);
  await c.onSubmit(); assert.ok(c.data.success); assert.equal(db.leads.length, 1);
  const w = read('components/mk-visit-sheet/index.wxml');
  assert.ok(!/[一-龥]/.test(w.replace(/'，'/g, '')), '弹层文字全部走文字表');
  assert.match(w, /<mk-field label="\{\{T\.phone\}\}" error="\{\{phoneError\}\}"/);
});

test('演示工具页：留资与账户事件单独一节，三节合起来等于全部事件', async () => {
  fresh();
  const pg = await page('pkg-dev/lab/index', {});
  assert.equal(pg.data.leadEvents.length, 7); assert.equal(pg.data.events.length, 7); assert.equal(pg.data.afterEvents.length, 5);
  assert.equal(pg.data.events.length + pg.data.afterEvents.length + pg.data.leadEvents.length, demo.EVENTS.length);
  pg.onEvent({ currentTarget: { dataset: { id: 'review_hold' } } });
  assert.equal(pg.data.leadEvents.find((x) => x.id === 'review_hold').on, true);
  assert.equal(pg.data.scenes.length, 27);
});

test('公共组件迁移：两域不再有手写提示条、分包自带标签和中性按钮；整页加载统一为骨架屏', () => {
  const files = [];
  (function walk(d) { fs.readdirSync(d).forEach((f) => { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.(wxml|wxss)$/.test(f)) files.push(p); }); })(path.join(root, 'pkg-lead'));
  (function walk(d) { fs.readdirSync(d).forEach((f) => { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.(wxml|wxss)$/.test(f)) files.push(p); }); })(path.join(root, 'pkg-account'));
  const gone = /\b(ldf-notice|lnd-notice|ldf-status|ldf-label|ldf-field|ldf-err|ldf-neutral|lnd-neutral|lpg-neutral|ldf-tag|lnd-tag|lpg-tag|ac-tag|ac-notice)\b/;
  files.forEach((p) => { const m = gone.exec(fs.readFileSync(p, 'utf8')); assert.equal(m, null, path.relative(root, p) + ' 仍有 ' + (m && m[0])); });
  assert.ok(!/mn-tag/.test(read('pages/mine/index.wxml') + read('pages/mine/index.wxss')));
  const app = read('app.wxss');
  ['.mk-tag--ok', '.mk-tag--warn', '.mk-tag--info', '.mk-tag--end', '.mk-btn--plain {', '.mk-sys-wrap'].forEach((c) => assert.ok(app.includes(c), c));
  const pages = ['messages', 'needs', 'progress', 'favorites', 'coupons', 'profile', 'referral', 'brand', 'ent-cert', 'ent-titles', 'ent-batch'].map((n) => 'pkg-account/' + n + '/index.wxml').concat(['booking', 'business', 'transport', 'support'].map((n) => 'pkg-lead/' + n + '/index.wxml'));
  pages.forEach((p) => { const w = read(p); if (/mk-sys-state/.test(w)) assert.match(w, /class="mk-sys-wrap"><mk-sys-state type="\{\{sys\}\}" skeleton="\{\{3\}\}"/, p); });
  assert.ok(pages.filter((p) => /mk-sys-wrap/.test(read(p))).length >= 13);
  // 留资表单项统一用 mk-field
  [['booking', 5], ['business', 10], ['transport', 3], ['support', 2]].forEach(([n, min]) => assert.ok((read('pkg-lead/' + n + '/index.wxml').match(/<mk-field\b/g) || []).length >= min, n));
  assert.match(fs.readFileSync(path.join(__dirname, '../tools/static_check.py'), 'utf8'), /PENDING_HANDWRITTEN = set\(\)/);
});
