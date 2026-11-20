// FIX-01 留资与全站横向：评审问题 E-01～E-21、S-01、S-02、S-09 与口径 R-15 的修复用例。
// 在假的 wx 环境里跑，验证的是代码逻辑与跳转去向，不是微信真实行为。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), routes = R('services/routes'), api = R('services/api'), C = R('core/config'), L = R('core/config-lead');
const lead = R('core/lead'), T = R('i18n/lead'), TT = R('i18n/trade'), scenarios = R('mock/scenarios'), { db } = R('services/mock-ext/_db');
const mock = R('services/mock-adapter');
env.loadApp();
const login = () => state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
function fresh(loggedIn) {
  state.reset(); env.nav.length = 0; env.mode = 'ok'; db.leads.length = 0; db.messages.length = 0; db.kv = {}; db.sms = {}; C.subscribeTemplates.booking = [];
  scenarios.write({ scenario: '', stock: 'normal', events: {}, net: 'instant' });
  if (loggedIn !== false) login();
}
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 15));
const base = (r) => r.replace(/^\//, '');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const input = (v) => ({ detail: { value: v } });
const tapI = (i) => ({ currentTarget: { dataset: { i } } });
const kv = () => { if (!db.kv.lead) db.kv.lead = { seq: 0, keys: {}, failNext: '' }; return db.kv.lead; };
const BJ = (h) => Date.UTC(2026, 10, 18, h - 8, 0); // 只用于纯函数的钟点判断
const page = async (route, q) => { const pg = env.newPage(base(route), q || {}); await tick(); return pg; };

test('E-01 企业用仓：未确认态提示条有「核对提交结果」，手动核对成功且不重复建单；未确认时锁定表单；成功或编辑后重置自动核对', async () => {
  fresh(); const keep = L.recheckMs; L.recheckMs = 60000; // 自动核对排得很远，这里只走手动核对
  let pg;
  try {
    pg = await page(routes.BUSINESS);
    pg.onLocation(input('北京市朝阳区')); pg.onBand({ currentTarget: { dataset: { k: '1-5' } } }); pg.onNext();
    kv().failNext = 'timeout'; await pg.onSubmit();
    assert.equal(pg.data.status, 'unknown'); assert.equal(db.leads.length, 1); assert.equal(pg._rechecked, true); assert.ok(pg._timer);
    pg.onName(input('改不了')); pg.onBand({ currentTarget: { dataset: { k: '5-15' } } }); pg.onPrev();
    assert.equal(pg.data.name, ''); assert.equal(pg._v.band, '1-5'); assert.equal(pg.data.step, 2, '未确认态锁定表单');
    await pg.onRetrySubmit(); await tick();
    assert.equal(pg._timer, null, '手动核对时取消排着的自动核对');
    assert.equal(pg.data.status, 'editing'); assert.equal(pg.data.saved, true); assert.ok(pg.data.dialog); assert.equal(db.leads.length, 1, '核对不重复建单');
    assert.equal(pg._rechecked, false, '成功后重置');
    pg._rechecked = true; pg.onDialogClose(); pg.onNotes(input('补充')); assert.equal(pg._rechecked, false, '编辑后重置');
  } finally { L.recheckMs = keep; if (pg) pg.onUnload(); }
  const w = read('pkg-lead/business/index.wxml');
  assert.match(w, /status === 'unknown'[^>]*link="\{\{T\.c\.recheck\}\}" bind:link="onRetrySubmit"/);
  assert.ok(!/salesOnly|gotIt|dialog\.sales/.test(w + read('pkg-lead/business/index.js')), '旧的 30m³ 拦截分支已清掉（E-10）');
});

test('E-01 企业用仓：自动核对只做一次；第二次仍超时后可手动再核对', async () => {
  fresh(); const keep = L.recheckMs; L.recheckMs = 5;
  const orig = mock.submitLead; let calls = 0;
  mock.submitLead = () => { calls++; return Promise.reject({ code: 'TIMEOUT', message: 'x' }); };
  try {
    const pg = await page(routes.BUSINESS);
    pg.onBand({ currentTarget: { dataset: { k: '1-5' } } }); pg.onNext();
    await pg.onSubmit(); await tick(60);
    assert.equal(calls, 2, '提交 1 次 + 自动核对 1 次'); assert.equal(pg.data.status, 'unknown');
    await pg.onRetrySubmit(); assert.equal(calls, 3); assert.equal(pg.data.status, 'unknown'); await tick(40); assert.equal(calls, 3, '手动核对后不再自动重复');
    mock.submitLead = orig; await pg.onRetrySubmit(); await tick();
    assert.equal(pg.data.saved, true); assert.equal(db.leads.length, 1);
  } finally { mock.submitLead = orig; L.recheckMs = keep; }
});

test('E-02 联系电话弹层：倒计时没走完就关闭，再打开能重新获取验证码；验证成功后也归零', async () => {
  fresh();
  const c = env.newComponent('pkg-lead/components/lead-phone/index', { what: '预约' });
  c.onPickOther(); c.onPhone(input('13900139000')); c.onSend(); await tick();
  assert.ok(c.data.countdown > 0); assert.equal(c.data.sendOff, true);
  c.onSmsClose(); assert.equal(c.data.countdown, 0); assert.equal(c.data.sendOff, false); assert.equal(c.data.sendText, T.phone.send);
  c.onPickOther(); c.onPhone(input('13900139001')); c.onSend(); await tick();
  assert.ok(c.data.countdown > 0, '再次打开可以发'); assert.equal(c.data.hint, T.phone.sent);
  c.onCode(input('123456')); c.onVerify(); await tick();
  assert.equal(c.data.other, '13900139001'); assert.equal(c.data.countdown, 0); assert.equal(c.data.sendText, T.phone.send);
  c.__detach();
});

test('E-02 登录层：关闭后倒计时继续走完并恢复「获取验证码」，不会停在半截；换号码时归零', async () => {
  fresh(false);
  const c = env.newComponent('components/mk-login-sheet/index', { visible: true });
  c.setData({ agreed: true, mode: 'sms' }); c.startTimer(1);
  assert.equal(c.data.countdown, 1);
  c.setData({ visible: false }); await tick(1150);
  assert.equal(c.data.countdown, 0); assert.equal(c.data.sendLabel, TT.login.sendCode);
  c.setData({ visible: true }); c.onPhone(input('13900139002')); c.onSend(); await tick();
  assert.ok(c.data.countdown > 0, '重新打开能发'); c.onConflictChange(); assert.equal(c.data.countdown, 0); assert.equal(c.data.sendLabel, TT.login.sendCode);
  c.__detach();
});

test('E-03 / E-14 顾问模式联系电话：未登录用手填号；登录后手填框收起并作废，提交的是登录号；弹层说明写「咨询」', async () => {
  fresh(false); const pg = await page(routes.BOOKING, { mode: 'advisor' });
  assert.equal(pg.data.what, T.phone.whatBusiness); assert.equal((await page(routes.BOOKING)).data.what, T.phone.whatBooking);
  pg.onPhoneChange({ detail: { phone: '', ready: false } });
  pg.onManualPhone(input('13900139000')); assert.equal(pg.contact(), '13900139000'); assert.equal(pg.data.phoneReady, false);
  login(); pg.onPhoneChange({ detail: { phone: '', masked: '138****8000', ready: true } });
  assert.equal(pg.data.phoneReady, true); assert.equal(pg.data.manualPhone, ''); assert.equal(pg.contact(), '');
  await pg.onSubmit(); await tick();
  assert.equal(pg.data.status, 'success'); assert.equal(db.leads[0].phone_masked, '138****8000', '生效的是界面上显示的登录号');
  assert.match(read('pkg-lead/booking/index.wxml'), /wx:if="\{\{advisor && !phoneReady\}\}"/);
  // 另行验证的号码优先于登录号
  const p2 = await page(routes.BOOKING, { mode: 'advisor' }); p2.onPhoneChange({ detail: { phone: '13700137000', ready: true } });
  await p2.onSubmit(); await tick(); assert.equal(db.leads[1].phone_masked, '137****7000');
  // 预约模式未登录不接受手填
  fresh(false); const p3 = await page(routes.BOOKING); p3.onManualPhone(input('13900139000')); assert.equal(p3.hasPhone(), false);
  // 组件：what 变了说明句跟着变
  const c = env.newComponent('pkg-lead/components/lead-phone/index', { what: '预约' }); c.setData({ what: '咨询' });
  assert.equal(c.data.sheetNote, T.fn.phoneSheetNote('咨询')); c.setData({ disabled: true }); c.onUseWechat(); assert.equal(c.data.loginVisible, false); c.__detach();
});

test('E-04 未登录手填电话提交成功：按钮写「登录后查看预约记录」；已登录仍是「查看预约记录」', async () => {
  fresh(false); let pg = await page(routes.BOOKING, { mode: 'advisor' });
  pg.onManualPhone(input('13900139000')); await pg.onSubmit(); await tick();
  assert.equal(pg.data.status, 'success'); assert.equal(db.leads.length, 1); assert.equal(pg.data.needsBtn, T.common.viewNeedsLogin);
  env.nav.length = 0; pg.onNeeds(); assert.deepEqual(env.nav, [{ kind: 'navigateTo', url: routes.NEEDS }]);
  fresh(); pg = await page(routes.BOOKING, { mode: 'advisor' }); await pg.onSubmit(); await tick();
  assert.equal(pg.data.needsBtn, T.common.viewNeeds);
  assert.match(read('pkg-lead/booking/index.wxml'), /bindtap="onNeeds">\{\{needsBtn\}\}/);
});

test('E-05 / E-18 联系顾问：?order= 进订单咨询，提交后给「查看订单」；没有订单时给「继续找仓」，都不给「查看预约记录」', async () => {
  fresh(); const orders = await api.getOrders();
  assert.ok(!/viewNeeds|onNeeds/.test(read('pkg-lead/support/index.wxml') + read('pkg-lead/support/index.js')));
  if (!orders.length) return;
  const o = orders[0], pg = await page(routes.SUPPORT, { order: o.id });
  assert.equal(pg.data.order.id, o.id); assert.equal(pg.data.type, 'order');
  pg.onText(input('想问一下续租')); await pg.onSubmit(); await tick();
  const rec = db.leads[db.leads.length - 1]; assert.equal(rec.type, 'support'); assert.equal(rec.order_id, o.id); assert.equal(rec.support_type, 'order');
  assert.equal(pg.data.nextBtn, T.common.viewOrder); env.nav.length = 0; pg.onNext();
  assert.deepEqual(env.nav, [{ kind: 'navigateTo', url: routes.ORDER_DETAIL + '?id=' + o.id }]);
  // 订单号不存在、或未登录：按普通咨询
  const p2 = await page(routes.SUPPORT, { order: 'NOPE' }); assert.equal(p2.data.sys, ''); assert.equal(p2.data.order, null); assert.equal(p2.data.type, 'general');
  fresh(false); const p3 = await page(routes.SUPPORT, { order: o.id }); assert.equal(p3.data.order, null); assert.equal(p3.data.type, 'general');
});

test('E-07 预约用仓：未确认态锁定表单，核对用原来那份内容；主按钮写「核对提交结果」', async () => {
  fresh(); const pg = await page(routes.BOOKING);
  pg.onAddress(input('朝阳区安贞西里')); kv().failNext = 'timeout'; await pg.onSubmit(); await tick();
  assert.equal(pg.data.status, 'unknown'); assert.equal(pg.data.locked, true); assert.equal(db.leads.length, 1);
  pg.onAddress(input('改成别的')); pg.onNote(input('x')); pg.onHint(tapI(0)); pg.onOpenCapacity(); pg.onOpenItems(); pg.onOpenDate(); pg.onOpenDuration();
  assert.equal(pg.data.address, '朝阳区安贞西里'); assert.equal(pg.data.note, ''); assert.equal(pg.data.startHint, ''); assert.equal(pg.data.sheet, '');
  await pg.onSubmit(); await tick();
  assert.equal(pg.data.status, 'success'); assert.equal(pg.data.locked, false); assert.equal(db.leads.length, 1); assert.equal(db.leads[0].address, '朝阳区安贞西里');
  const w = read('pkg-lead/booking/index.wxml');
  assert.match(w, /status === 'unknown' \? T\.c\.recheck : M\.submit/); assert.ok((w.match(/disabled="\{\{locked\}\}"/g) || []).length >= 4);
  // 失败态不锁，改完再点重试用的是新内容
  fresh(); const p2 = await page(routes.BOOKING); p2.onAddress(input('旧地址')); kv().failNext = 'network'; await p2.onSubmit(); await tick();
  assert.equal(p2.data.status, 'failed'); assert.equal(p2.data.locked, false);
  p2.setData({ address: '新地址' }); await p2.onRetrySubmit(); await tick(); assert.equal(db.leads[0].address, '新地址');
});

test('E-08 预约用仓：意向门店取不到时降级为不带门店的表单，照常提交', async () => {
  fresh(); let pg = await page(routes.BOOKING, { store: 'NO_SUCH_STORE' });
  assert.equal(pg.data.sys, ''); assert.equal(pg.data.store, null);
  pg.onAddress(input('朝阳区安贞西里')); await pg.onSubmit(); await tick();
  assert.equal(pg.data.status, 'success'); assert.equal(db.leads[0].store_id, '');
  const orig = mock.getStore; mock.getStore = () => Promise.reject({ code: 'NETWORK', message: 'x' });
  try { pg = await page(routes.BOOKING, { store: 'SIM_BJ01' }); assert.equal(pg.data.sys, ''); assert.equal(pg.data.store, null); } finally { mock.getStore = orig; }
  pg = await page(routes.BOOKING, { store: 'SIM_BJ01' }); assert.equal(pg.data.store.id, 'SIM_BJ01');
});

test('E-10 容量达到 30m³ 只提示：预约页手填 35m³ 出提示；企业页自定义 35m³ 与「30m³ 及以上」出提示且仍可带入找仓', async () => {
  fresh(); const pg = await page(routes.BOOKING);
  pg.onOpenCapacity(); pg.onCapInput(input('35')); pg.onCapOk(); assert.equal(pg.data.capHint, '35m³'); assert.equal(pg.data.salesCap, true);
  pg.onOpenCapacity(); pg.onCapInput(input('29.9')); pg.onCapOk(); assert.equal(pg.data.salesCap, false);
  pg.onOpenCapacity(); pg.onCapUnit({ currentTarget: { dataset: { u: 'm2' } } }); pg.onCapInput(input('20')); pg.onCapOk(); assert.equal(pg.data.salesCap, 20 * C.requirement.areaLayerHeightM >= C.matching.largeCapacityFromM3);
  assert.equal(lead.isLargeM3(30), true); assert.equal(lead.isLargeM3(29.99), false); assert.equal(lead.isLargeM3(null), false);
  const bz = await page(routes.BUSINESS);
  bz.onBand({ currentTarget: { dataset: { k: 'custom' } } }); bz.onSize(input('35')); assert.equal(bz.data.sizeNote, T.business.salesNote);
  bz.onSize(input('12')); assert.equal(bz.data.sizeNote, T.fn.matchNote('12'));
  bz.onBand({ currentTarget: { dataset: { k: '30+' } } }); assert.equal(bz.data.sizeNote, T.business.salesNote);
  bz.onTerm({ detail: { months: 12 } }); env.nav.length = 0; bz.onBrowse();
  assert.equal(state.get().requirement.capacity_m3, 30); assert.equal(env.nav[0].url, routes.STORES);
  assert.equal(T.business.err.browseSales, undefined); assert.equal(T.business.gotIt, undefined);
});

test('E-12 表单底部说明按当前时刻取句', async () => {
  fresh(); const inHours = lead.ackAt(Date.now()).in_service_hours;
  assert.equal((await page(routes.BOOKING)).data.payNote, inHours ? T.booking.payNote : T.booking.payNoteOff);
  assert.equal((await page(routes.BUSINESS)).data.payNote, inHours ? T.business.payNote : T.business.payNoteOff);
  assert.ok(!/10 分钟/.test(T.booking.payNoteOff + T.business.payNoteOff));
});

test('E-13 预约结果页：没填的可选项不列出，不出现「—」', async () => {
  fresh(); const pg = await page(routes.BOOKING, { mode: 'advisor' });
  const r = pg.resultOf({ type: 'advisor', in_service_hours: true, no: '0001', phone_masked: '138****8000', address: '', items: '', capacity_hint: '3m³' });
  assert.deepEqual(r.rows.map((x) => x.k), [T.phone.label, T.booking.capacity]); assert.equal(r.rows[1].last, true);
  assert.ok(r.rows.every((x) => x.v && x.v !== T.common.dash));
});

test('E-15 / E-16 / E-17 运输：已下单态换说明句；同一次填写不重复建单，成功后清空；订单不存在有提示；?store= 写进线索', async () => {
  const d = lead.dateStr(Date.now() + lead.DAY);
  assert.match(read('pkg-lead/transport/index.wxml'), /view === 'form' \? T\.x\.noteOrder : T\.x\.note/); assert.notEqual(T.transport.noteOrder, T.transport.note);
  fresh(false); let pg = await page(routes.TRANSPORT, { store: 'SIM_BJ01' });
  pg.onAddress(input('朝阳区望京西园四区')); pg.onDate(input(d)); pg.onPhone(input('13800138000'));
  kv().failNext = 'timeout'; await pg.onSubmit(); await tick();
  assert.equal(db.leads.length, 1); assert.equal(pg.data.view, 'pre', '回执超时留在表单');
  await pg.onSubmit(); await tick();
  assert.equal(db.leads.length, 1, '不改内容再点提交，同一个 request_key 不重复建单'); assert.equal(pg.data.view, 'saved');
  assert.equal(db.leads[0].store_id, 'SIM_BJ01'); assert.equal(db.leads[0].store_name, '安贞·富仁名苑店');
  assert.equal(pg.data.address, ''); assert.equal(pg.data.date, ''); assert.equal(pg.data.phone, '', '成功后清空');
  fresh(); const orders = (await api.getOrders()).filter((o) => ['paid', 'active', 'expiring', 'overdue'].indexOf(o.stage) >= 0);
  if (!orders.length) return;
  pg = await page(routes.TRANSPORT, { order: orders[0].id }); await tick();
  assert.equal(pg.data.view, 'form', '?order= 直接进这笔订单的表单'); assert.equal(pg.data.order.id, orders[0].id);
  pg.onAddress(input('朝阳区望京西园四区')); pg.onDate(input(d)); await pg.onSubmit(); await tick();
  assert.equal(pg.data.records.length, 1); assert.equal(pg.data.address, ''); assert.equal(pg.data.date, '');
  assert.equal(db.leads[db.leads.length - 1].store_id, '', '关联订单的预约不另记门店参数');
  const toasts = []; const st = wx.showToast; wx.showToast = (o) => toasts.push(o.title);
  try { pg._orderId = 'GONE'; pg.onAddress(input('a')); pg.onDate(input(d)); await pg.onSubmit(); await tick(); } finally { wx.showToast = st; }
  assert.deepEqual(toasts, [T.transport.errOrder]); assert.equal(pg.data.busy, false); assert.equal(pg.data.view, 'pick', '回到选择订单');
  const p2 = await page(routes.TRANSPORT, { order: 'NOT_PAID_OR_MISSING' }); await tick(); assert.equal(p2.data.view, 'pick');
});

test('E-19 看仓弹层：「待电话确认」只在时段里；日期可取消；今天已过的时段不能提交；失败句在按钮上方', async () => {
  fresh(); const store = await api.getStore({ id: 'SIM_BJ01' });
  const c = env.newComponent('components/mk-visit-sheet/index', { store }); c.open();
  assert.equal(c.data.dates.length, 3); assert.ok(c.data.dates.every((x) => x.date && x.label.indexOf(T.visit.slots[0]) < 0)); assert.equal(c.data.dateIndex, -1); assert.equal(c.data.date, '');
  c.onDateQuick(tapI(1)); assert.equal(c.data.date, c.data.dates[1].date); c.onDateQuick(tapI(1)); assert.equal(c.data.date, ''); assert.equal(c.data.dateIndex, -1);
  c.onDate(input(c.data.dates[2].date)); assert.equal(c.data.dateIndex, 2, '选择器选到快捷日期时高亮对应项');
  // 时段是否已过：纯函数，按北京时间
  const today = lead.dateStr(BJ(13));
  assert.equal(lead.slotPassed(today, 1, BJ(13)), true, '13 点选今天上午'); assert.equal(lead.slotPassed(today, 2, BJ(13)), false); assert.equal(lead.slotPassed(today, 2, BJ(18)), true);
  assert.equal(lead.slotPassed(today, 0, BJ(23)), false, '待电话确认不判'); assert.equal(lead.slotPassed(today, 3, BJ(23)), false, '晚上没有结束钟点');
  assert.equal(lead.slotPassed(lead.dateStr(BJ(13) + lead.DAY), 1, BJ(13)), false); assert.equal(lead.slotPassed('', 1, BJ(13)), false);
  assert.equal(L.visitSlotEndHour.length, T.visit.slots.length);
  const keep = L.visitSlotEndHour; L.visitSlotEndHour = [null, 0, 0, null]; // 让「上午」必然已过
  try { c.onDateQuick(tapI(0)); c.onDateQuick(tapI(0)); c.onDateQuick(tapI(0)); c.onSlot(input(1)); await c.onSubmit(); assert.equal(c.data.dateError, T.visit.errSlot); assert.equal(db.leads.length, 0); } finally { L.visitSlotEndHour = keep; }
  c.onSlot(input(0)); c.onCapacity(input('abc')); await c.onSubmit(); assert.equal(c.data.capError, T.visit.errCap); assert.equal(c.data.error, '');
  c.onCapacity(input('')); scenarios.setEvent('lead_submit_fail', true); await c.onSubmit();
  assert.ok(c.data.error); assert.equal(c.data.capError, ''); assert.equal(c.data.dateError, '');
  c.onDateQuick(tapI(0)); await c.onSubmit(); // 取消日期：日期、时段都待确认
  assert.equal(c.data.success.line, '138****8000 · ' + T.visit.slots[0], '只写一次「待电话确认」');
  const w = read('components/mk-visit-sheet/index.wxml');
  assert.match(w, /label="\{\{T\.intent\}\}" mark="\{\{T\.optional\}\}" error="\{\{capError\}\}"/); assert.match(w, /wx:if="\{\{error\}\}" class="mk-error vs-err"[\s\S]*vs-submit/);
  assert.ok(T.visit.unknown.indexOf('核对') < 0, 'R-21：说明句不重复按钮上的话');
});

test('E-21 考拉E存进入的表单：标题与说明带来源；流程说明不再写成地址必填', async () => {
  fresh(); const pg = await page(routes.BOOKING, { mode: 'advisor', source: 'estore' });
  assert.equal(pg.data.M.title, T.booking.estoreMode.title); assert.match(pg.data.M.p, /上门取送/); assert.equal(pg.data.advisor, true);
  assert.equal((await page(routes.BOOKING, { source: 'estore' })).data.M.title, T.booking.modes.booking.title, '只有顾问模式换标题');
  assert.match(T.estore.flow[0].s, /联系电话/);
});

test('S-01 登录层：有隐私保护指引入口（wx.openPrivacyContract），微信按钮写法不变', () => {
  const c = env.newComponent('components/mk-login-sheet/index', { visible: true });
  let opened = 0; const orig = wx.openPrivacyContract; wx.openPrivacyContract = (o) => { opened++; orig(o); };
  try { c.onPrivacy(); env.mode = 'fail'; c.onPrivacy(); } finally { wx.openPrivacyContract = orig; env.mode = 'ok'; }
  assert.equal(opened, 2);
  const w = read('components/mk-login-sheet/index.wxml');
  assert.match(w, /bindtap="onPrivacy"[^>]*>\{\{T\.privacy\}\}/); assert.match(w, /open-type="getPhoneNumber\|agreePrivacyAuthorization"/);
  assert.match(TT.login.privacy, /隐私保护指引/); c.__detach();
});

test('S-02 登录态失效：接口返回未登录时清本机登录态；没有登录层的页面去「我的」打开登录层，有登录层的就地打开；受限页走守卫落点', async () => {
  const auth = R('services/auth');
  const stub = (name) => { const o = mock[name]; mock[name] = () => Promise.reject({ code: 'UNAUTHENTICATED', message: '请先登录' }); return () => { mock[name] = o; }; };
  fresh(); let undo = stub('getStores');
  try {
    env.nav.length = 0; const pg = await page(routes.BUSINESS);
    assert.equal(state.get().session.loggedIn, false, '清登录态'); assert.equal(pg.data.sys, 'failed');
    assert.deepEqual(env.nav, [{ kind: 'switchTab', url: routes.MINE }]); assert.equal(state.get().flags.pendingLogin, 'mine');
  } finally { undo(); }
  fresh(); const orders = await api.getOrders(); undo = stub('getOrder');
  try {
    env.nav.length = 0; const pg = await page(routes.SUPPORT, { order: (orders[0] || {}).id || 'X' });
    assert.equal(state.get().session.loggedIn, false); assert.equal(pg.data.loginVisible, true, '就地打开登录层'); assert.equal(env.nav.length, 0);
    login(); undo(); undo = () => {}; pg.onRetry(); await tick(); assert.equal(pg.data.sys, '', '登录后重试可用');
  } finally { undo(); }
  // 受限页：按守卫去落点页
  fresh(); env.nav.length = 0; state.logout(); login();
  auth.sessionExpired({ route: base(routes.ORDER_DETAIL), data: {}, setData() {} });
  assert.equal(state.get().session.loggedIn, false); assert.deepEqual(env.nav, [{ kind: 'switchTab', url: routes.MINE }]); assert.equal(state.get().flags.pendingLogin, 'mine');
  // 本来就没登录时的 UNAUTHENTICATED 不算失效：不跳转、不标 expired
  fresh(false); env.nav.length = 0;
  await assert.rejects(api.getOrders(), (e) => e.code === 'UNAUTHENTICATED' && !e.expired); assert.equal(env.nav.length, 0);
  // 已登录时接口报未登录：错误带 expired
  fresh(); undo = stub('getStore');
  try { await assert.rejects(api.getStore({ id: 'SIM_BJ01' }), (e) => e.code === 'UNAUTHENTICATED' && e.expired === true); assert.equal(state.get().session.loggedIn, false); } finally { undo(); }
});

test('S-09 真实适配器：请求超时给 TIMEOUT，其余失败给 NETWORK；401 给 UNAUTHENTICATED', async () => {
  const http = R('services/http-adapter'); const orig = wx.request;
  try {
    wx.request = (o) => o.fail({ errMsg: 'request:fail timeout' });
    await assert.rejects(http.request('POST', '/leads', {}, null), (e) => e.code === 'TIMEOUT');
    wx.request = (o) => o.fail({ errMsg: 'request:fail time out' });
    await assert.rejects(http.request('POST', '/leads', {}, null), (e) => e.code === 'TIMEOUT');
    wx.request = (o) => o.fail({ errMsg: 'request:fail net::ERR_INTERNET_DISCONNECTED' });
    await assert.rejects(http.request('GET', '/stores', {}, null), (e) => e.code === 'NETWORK');
    wx.request = (o) => o.success({ statusCode: 401, data: {} });
    await assert.rejects(http.request('GET', '/orders', {}, { token: 't' }), (e) => e.code === 'UNAUTHENTICATED');
  } finally { wx.request = orig; }
  // 取数超时与断网同样显示
  const pd = R('services/page-data'); const pg = { data: { sys: 'loading' }, setData(p) { Object.assign(this.data, p); } };
  const ce = console.error; console.error = () => {};
  try { await pd.load(pg, Promise.reject({ code: 'TIMEOUT' }), () => {}); } finally { console.error = ce; }
  assert.equal(pg.data.sys, 'offline');
});

test('R-15 留资各页可转发：路径只带进入页面所需的参数，不带订单号、线索 id、电话', async () => {
  fresh(); const orders = await api.getOrders(); const oid = (orders[0] || {}).id || 'ORDER_X';
  let pg = await page(routes.BOOKING, { mode: 'advisor', source: 'estore', store: 'SIM_BJ01', cap: '31' });
  assert.deepEqual(pg.onShareAppMessage(), { title: T.share.estore, path: routes.BOOKING + '?mode=advisor&source=estore&store=SIM_BJ01' });
  pg = await page(routes.BOOKING); assert.deepEqual(pg.onShareAppMessage(), { title: T.share.booking, path: routes.BOOKING + '?mode=booking' });
  pg = await page(routes.BUSINESS, { lead: 'LEAD0001' }); assert.deepEqual(pg.onShareAppMessage(), { title: T.share.business, path: routes.BUSINESS });
  pg = await page(routes.ESTORE); assert.deepEqual(pg.onShareAppMessage(), { title: T.share.estore, path: routes.ESTORE });
  pg = await page(routes.TRANSPORT, { order: oid, store: 'SIM_BJ01' }); assert.deepEqual(pg.onShareAppMessage(), { title: T.share.transport, path: routes.TRANSPORT + '?store=SIM_BJ01' });
  pg = await page(routes.TRANSPORT, { order: oid }); assert.equal(pg.onShareAppMessage().path, routes.TRANSPORT);
  pg = await page(routes.SUPPORT, { order: oid }); assert.deepEqual(pg.onShareAppMessage(), { title: T.share.support, path: routes.SUPPORT });
  const auth = R('services/auth');
  ['BOOKING', 'BUSINESS', 'ESTORE', 'TRANSPORT', 'SUPPORT'].forEach((n) => { assert.equal(auth.isRestricted(routes[n]), false, n); assert.match(read(base(routes[n]) + '.js'), /share\.message\(/, n); });
});
