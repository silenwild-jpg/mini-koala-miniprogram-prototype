// FIX-01 交易域修复：到期日（B-01 / R-04）、满额减与特价仓（R-12 / R-06 / B-03）、确认订单各状态（B-02 / B-05～B-17）、快捷下单与协议页（B-13 / R-15）。
// 在假的 wx 环境里跑，验证的是代码逻辑与跳转去向，不是微信真实渲染。日期一律相对今天。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), routes = R('services/routes'), api = R('services/api'), pricing = R('core/pricing'), order = R('core/order'), model = R('core/order-model');
const { db, unit, store, markGone } = R('services/mock-ext/_db');
const scenarios = R('mock/scenarios');
const view = R('services/order-view'), identity = R('services/identity'), T = R('i18n/trade'), C = R('core/config'), CT = R('core/config-trade');
env.loadApp();
const H = 3600e3, DAY = 24 * H, S = order.STAGE;
const START = view.ymd(Date.now() + 11 * DAY);
const realNow = Date.now; let offset = 0; Date.now = () => realNow() + offset;
const toasts = []; wx.showToast = (o) => toasts.push(o.title);
const modals = []; let confirmModal = true;
wx.showModal = (o) => { modals.push(o); if (o && o.success) o.success({ confirm: confirmModal }); };
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 15));
const login = () => state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
function fresh(loggedIn) {
  offset = 0; state.reset(); env.nav.length = 0; env.mode = 'ok'; toasts.length = 0; modals.length = 0; confirmModal = true;
  db.orders.length = 0; db.seq = 0; db.seeded = true; db.kv = {}; db.sms = {};
  scenarios.write({ scenario: '', stock: 'normal', events: {}, net: 'instant' });
  if (loggedIn !== false) login();
}
const ID = { name: '张明', id_no: '110101199001010012' };
const U3 = 'SIM_BJ01_U03', U4 = 'SIM_BJ01_U04', U5 = 'SIM_BJ01_U05'; // U4 是特价仓
const bj = (s) => Date.parse(s + 'T00:00:00+08:00');
async function verify() { await api.verifyIdentity(ID); identity.save(await api.getIdentity()); }
async function failedPage(unitId, months, extra) { // 实名 → 签署 → 支付失败，停在「支付未成功」
  await verify();
  const pg = env.newPage('pkg-trade/confirm/index', Object.assign({ unit: unitId, term: String(months), date: START, demo: 'pay_fail' }, extra)); await tick();
  pg.onAgree(); pg.onSign(); pg.onSignConfirm(); await tick(30); pg.onPayConfirm(); await tick(40);
  assert.equal(pg.data.phase, 'payment_failed');
  return pg;
}

test('B-01 到期日：加月后溢出收到当月最后一天；与运行环境时区无关；普通日期不变', () => {
  const end = (s, n) => view.ymd(model.addMonths(bj(s), n));
  assert.equal(end('2026-11-30', 3), '2027-02-28');
  assert.equal(end('2027-01-30', 1), '2027-02-28');
  assert.equal(end('2027-01-31', 3), '2027-04-30');
  assert.equal(end('2028-01-31', 1), '2028-02-29', '闰年');
  assert.equal(end('2026-11-23', 6), '2027-05-23', 'R-04：日期本身不变');
  assert.equal(end('2026-12-31', 12), '2027-12-31');
  const od = model.build({ store: store('SIM_BJ01'), units: [unit(U3)], months: 3, createdAt: bj('2026-11-29'), seq: 1, startAt: bj('2026-11-30') });
  assert.equal(view.ymd(od.lease.end), '2027-02-28'); assert.equal(view.ymd(od.lease.start), '2026-11-30');
});

test('R-04 到期日含当天：租期到「到期日次日 0 点」才结束；确认订单页与签署弹层写明预计用仓时间即起租日、计费起点', async () => {
  const endMs = bj('2027-05-23');
  assert.equal(model.overdueFrom(endMs), bj('2027-05-24'));
  assert.equal(model.overdueFrom(endMs + 13 * H), bj('2027-05-24'), '到期日当天任意时刻都还在租期内');
  fresh(); await verify();
  const pg = env.newPage('pkg-trade/confirm/index', { unit: U3, term: '6', date: START }); await tick();
  pg.onAgree(); pg.onSign();
  const rows = pg.data.signRows.map((r) => [r.k, r.v]);
  assert.deepEqual(rows[4], ['起租日（预计用仓时间）', START + ' 起计费']);
  assert.deepEqual(rows[5], ['到期日', view.ymd(model.leaseEnd(view.parseYmd(START), 6)) + '（含当天）']);
  pg.onHide();
  assert.match(fs.readFileSync(path.join(root, 'pkg-trade/confirm/index.wxml'), 'utf8'), /T\.startNote/);
  assert.match(fs.readFileSync(path.join(root, 'pkg-trade/quick/index.wxml'), 'utf8'), /T\.dateNote/);
  assert.match(T.confirm.startNote, /起租日.*起计/);
});

test('R-12 / A-24 满额减：组合里含特价仓时整单参与；单个特价仓、续租仍不参与', () => {
  const sp = { id: 's', base_month: 2000, special_month: 1800 }, nm = { id: 'n', base_month: 1000, special_month: null };
  const one = pricing.quote([sp], 6);
  assert.equal(one.special, true); assert.equal(one.full_eligible, false); assert.equal(one.full_reduction, 0, '单个特价仓：现行为不变');
  assert.ok(one.rent_total >= 5000);
  const combo = pricing.quote([sp, nm], 6);
  assert.equal(combo.special, true); assert.equal(combo.full_eligible, true);
  assert.equal(combo.full_reduction, pricing.fullTier(combo.rent_total).off); assert.equal(combo.payable, combo.rent_total - combo.full_reduction + combo.deposit + combo.management_fee);
  assert.equal(pricing.quote([sp, nm], 6, { renewal: true }).full_reduction, 0);
  assert.equal(pricing.quote([sp, nm], 6, { coupon: { id: 'c', amount: 9999 } }).coupon_discount, 0, '含特价仓不能用券的现行为不变');
  assert.equal(pricing.fullEligible([sp]), false); assert.equal(pricing.fullEligible([sp, nm]), true); assert.equal(pricing.fullEligible([nm]), true); assert.equal(pricing.fullEligible([nm], true), false);
});

test('R-06 / B-04 特价仓「已省」= 原价整期 − 实付租金；费用明细有能对上的行，不再重复「特价仓 ¥X/月」', async () => {
  const q = pricing.quote([unit(U4)], 6);
  assert.equal(q.special, true);
  assert.equal(q.base_total, 620 * 6);
  assert.equal(q.base_total - q.special_discount_total - q.term_saved_total, q.rent_total, '原价 − 特价仓优惠 − 租期折扣 = 整期租金');
  assert.equal(q.saved, q.base_total - q.rent_after_discount, '已省 = 原价整期 − 实付租金');
  assert.equal(q.saved, 1380);
  const fc = env.newComponent('components/mk-fee-detail/index', { order: { months: 6, quote: q }, showCoupon: true });
  const rows = fc.data.rows.map((r) => [r.k, r.amt]);
  assert.deepEqual(rows.slice(0, 4), [['原价', '¥3,720'], ['特价仓优惠', '−¥372'], ['租期折扣', '−¥1,008'], ['整期租金', '¥2,340']]);
  assert.equal(fc.data.rows.filter((r) => r.k === '特价仓').length, 0, '去掉与整期租金行重复的「特价仓 ¥390/月」');
  assert.equal(fc.data.rows.find((r) => r.id === 'coupon').amt, '特价仓不可用券');
  // 接真实接口时报价里没有这三个字段：按 unit_pricing 现算，结果一样
  const bare = Object.assign({}, q); delete bare.base_total; delete bare.special_discount_total; delete bare.term_saved_total;
  const fc2 = env.newComponent('components/mk-fee-detail/index', { order: { months: 6, quote: bare } });
  assert.deepEqual(fc2.data.rows.slice(0, 3).map((r) => r.amt), ['¥3,720', '−¥372', '−¥1,008']);
  // 普通仓不受影响
  const n = env.newComponent('components/mk-fee-detail/index', { order: { months: 6, quote: pricing.quote([unit(U3)], 6) } });
  assert.deepEqual(n.data.rows.slice(0, 2).map((r) => r.k), ['整期租金', '已省']);
  // 确认订单页底栏的「已省」与明细对得上
  fresh(); await verify();
  const pg = env.newPage('pkg-trade/confirm/index', { unit: U4, term: '6', date: START }); await tick();
  assert.equal(pg.data.bar.saved, '已省 ¥1,380'); assert.equal(372 + 1008, 1380); pg.onHide();
});

test('B-03 特价仓 + 有券：券弹层里置灰并写「特价仓不可用券」，金额不变（特价仓能否用券待业务裁定）', async () => {
  fresh(); await verify();
  const pg = env.newPage('pkg-trade/confirm/index', { unit: U4, term: '12', date: START, demo: 'coupon' }); await tick();
  const row = pg.data.couponRows.find((r) => r.id === 'DEMO_COUPON_1');
  assert.deepEqual([row.off, row.sub], [true, '特价仓不可用券']);
  const before = pg.data.cardOrder.quote.payable;
  pg.onCoupon(); assert.equal(pg.data.sheet, 'coupon');
  pg.onPickCoupon({ currentTarget: { dataset: { i: pg.data.couponRows.indexOf(row) } } }); assert.equal(pg.data.couponChoice, 'auto', '置灰的券点不动');
  pg.onSheetClose();
  assert.equal(pg.data.cardOrder.quote.coupon_discount, 0); assert.equal(pg.data.cardOrder.quote.payable, before);
  const d = await api.getOrderDraft({ unit_ids: [U4], months: 12 });
  assert.deepEqual(d.coupons.map((c) => [c.eligible, c.reason]), [[false, 'special']]);
  pg.onHide();
});

test('B-12 券行分开写：租期不够「满 N 个月可用」、有券没用「未使用 · 有 N 张可用」；券比满额减大时说明满额减不同享', async () => {
  fresh(); await verify();
  let pg = env.newPage('pkg-trade/confirm/index', { unit: U3, term: '6', date: START, demo: 'coupon' }); await tick();
  assert.equal(pg.data.couponText, '满 ' + CT.demo.couponMinMonths + ' 个月可用');
  assert.equal(pg.data.couponRows.find((r) => r.id === 'DEMO_COUPON_1').sub, '满 ' + CT.demo.couponMinMonths + ' 个月可用');
  let fc = env.newComponent('components/mk-fee-detail/index', { order: pg.data.cardOrder, showCoupon: true, editable: true, couponText: pg.data.couponText });
  assert.equal(fc.data.rows.find((r) => r.id === 'coupon').amt, '满 12 个月可用');
  pg.onTerm({ detail: { months: 12 } }); await tick();
  assert.equal(pg.data.cardOrder.quote.coupon_discount, 300); assert.equal(pg.data.couponText, '');
  pg.onCoupon(); pg.onPickCoupon({ currentTarget: { dataset: { i: 1 } } }); pg.onCouponConfirm(); await tick();
  assert.equal(pg.data.cardOrder.quote.coupon_discount, 0); assert.equal(pg.data.couponText, '有 1 张可用'); // IMPL-01：券行右侧只写可用数量，不再用分隔符拼「未使用」
  pg.onHide();
  // 没有券：仍是「暂无适用优惠」
  fresh(); await verify();
  pg = env.newPage('pkg-trade/confirm/index', { unit: U3, term: '6', date: START }); await tick();
  assert.equal(pg.data.couponText, '');
  fc = env.newComponent('components/mk-fee-detail/index', { order: pg.data.cardOrder, showCoupon: true, editable: true, couponText: '' });
  assert.equal(fc.data.rows.find((r) => r.id === 'coupon').amt, '暂无适用优惠'); pg.onHide();
  // 券（¥300）大于满额减（¥150）：用券，满额减让位并说明
  const u = { id: 'x', base_month: 1200, special_month: null };
  const q = pricing.quote([u], 6, { coupon: { id: 'c', amount: 300 } });
  assert.deepEqual([q.coupon_discount, q.full_reduction, q.full_skipped, q.full_skipped_min], [300, 0, 150, 5000]);
  fc = env.newComponent('components/mk-fee-detail/index', { order: { months: 6, quote: q }, showCoupon: true });
  assert.equal(fc.data.rows.find((r) => r.id === 'coupon').note, '已选优惠更大的一项，满额减（−¥150）不同享');
  assert.equal(pricing.quote([u], 6).full_skipped, 0);
});

test('B-02 支付失败后券失效：核对结果「优惠资格 已变化」，继续支付弹出新报价确认，原因写明优惠资格变化', async () => {
  fresh(); await verify();
  db.kv.trade.coupons.push({ id: 'DEMO_COUPON_1', name: CT.demo.couponName, amount: CT.demo.couponAmount, min_months: CT.demo.couponMinMonths });
  const pg = env.newPage('pkg-trade/confirm/index', { unit: U3, term: '12', date: START }); await tick();
  assert.equal(pg.data.cardOrder.quote.coupon_discount, 300);
  pg.onAgree(); pg.onSign(); pg.onSignConfirm(); await tick(30);
  const od = db.orders[0]; assert.equal(od.quote.coupon_id, 'DEMO_COUPON_1'); assert.equal(od.coupon_name, CT.demo.couponName);
  await api.payOrder({ order_id: od.id, simulate: 'fail' });
  db.kv.trade.coupons.length = 0; // 券过期 / 被别的订单占用
  const dry = await api.resumeFailedOrder({ order_id: od.id, dry_run: true });
  assert.equal(dry.ok, false); assert.equal(dry.checks.coupon, false); assert.ok(dry.new_quote, '优惠资格变化也带回新报价'); assert.equal(dry.new_quote.payable, od.quote.payable + 300);
  await pg.loadOrder(); await tick(30);
  assert.equal(pg.data.phase, 'payment_failed'); assert.deepEqual(pg.data.recheck.rows[3].v, '已变化');
  pg.onBar(); await tick(30);
  assert.ok(pg.data.price, '弹出新报价确认'); assert.equal(pg.data.price.reason, '优惠资格发生变化'); assert.equal(pg.data.price.from, 'order');
  pg.onPriceAccept(); await tick(40);
  assert.equal(od.stage, S.PENDING); assert.equal(od.quote.coupon_discount, 0); assert.equal(od.coupon_name, undefined); assert.equal(od.price_change_reason, '优惠资格发生变化');
  assert.equal(pg.data.phase, 'pending'); assert.equal(pg.data.sheet, 'pay'); pg.onHide();
});

test('B-05 订单号查不到：显示订单空态并回订单列表；没带仓位：去附近门店（说明句已删）', async () => {
  fresh();
  let pg = env.newPage('pkg-trade/confirm/index', { order: 'MK000000000000' }); await tick(30);
  assert.deepEqual([pg.data.mode, pg.data.emptyKind], ['empty', 'order']); assert.equal(pg.data.TO.emptyTitle, '暂无可查看的订单');
  env.nav.length = 0; pg.onEmptyBtn(); assert.deepEqual(env.nav, [{ kind: 'switchTab', url: routes.ORDERS }]); pg.onHide();
  pg = env.newPage('pkg-trade/confirm/index', {}); await tick();
  assert.deepEqual([pg.data.mode, pg.data.emptyKind], ['empty', '']);
  env.nav.length = 0; pg.onEmptyBtn(); assert.deepEqual(env.nav, [{ kind: 'switchTab', url: routes.STORES }]); pg.onHide();
  assert.equal(T.confirm.emptyDesc, ''); assert.equal(T.confirm.emptyBtn, '去附近门店');
});

test('B-06 再次选中自己待支付订单占着的仓位：提示有一笔待支付订单，主按钮去那笔订单；快捷下单同样指向', async () => {
  fresh(); await verify();
  const d = await api.getOrderDraft({ unit_ids: [U5], months: 6 });
  const od = await api.createOrder({ unit_ids: [U5], months: 6, start_date: START, quoted_at: d.quoted_at, expect_payable: d.quote.payable, sign: true });
  const pg = env.newPage('pkg-trade/confirm/index', { unit: U5, term: '6' }); await tick();
  assert.equal(pg.data.held, od.id); assert.deepEqual([pg.data.bar.btn, pg.data.bar.solo, pg.data.bar.disabled], ['继续支付', true, false]);
  env.nav.length = 0; pg.onBar(); assert.deepEqual(env.nav, [{ kind: 'redirectTo', url: routes.CONFIRM + '?order=' + od.id }]); pg.onHide();
  const qk = env.newPage('pkg-trade/quick/index', { store: 'SIM_BJ01', unit: U5 }); await tick(30);
  assert.deepEqual([qk.data.gone, qk.data.held], [true, od.id]);
  env.nav.length = 0; qk.onHeld(); assert.equal(env.nav[0].url, routes.CONFIRM + '?order=' + od.id);
  // 订单取消后仓位释放，不再提示
  await api.cancelOrder({ order_id: od.id });
  assert.equal((await api.getOrderDraft({ unit_ids: [U5], months: 6 })).held_order_id, '');
});

test('B-11 仓位被别人租走：主按钮「重新选择仓位」可点并回门店详情，金额置灰；签署时才发现也一样', async () => {
  fresh(); await verify();
  markGone([U5]);
  let pg = env.newPage('pkg-trade/confirm/index', { unit: U5, term: '6' }); await tick();
  assert.deepEqual([pg.data.gone, pg.data.held], [true, '']);
  assert.deepEqual([pg.data.bar.btn, pg.data.bar.disabled, pg.data.bar.muted], ['重新选择仓位', false, true]);
  env.nav.length = 0; pg.onBar(); assert.deepEqual(env.nav, [{ kind: 'navigateTo', url: routes.STORE_DETAIL + '?id=SIM_BJ01' }]); assert.equal(modals.length, 0, '下单前更换不弹确认'); pg.onHide();
  fresh(); await verify(); scenarios.setEvent('unit_gone', true);
  pg = env.newPage('pkg-trade/confirm/index', { unit: U3, term: '6', date: START }); await tick();
  pg.onAgree(); pg.onSign(); pg.onSignConfirm(); await tick(30);
  assert.equal(pg.data.gone, true); assert.deepEqual([pg.data.bar.amount, pg.data.bar.muted, pg.data.bar.disabled, pg.data.bar.action], ['¥2,010', true, false, 'swap']);
  assert.equal(db.orders.length, 0); pg.onHide();
});

test('B-07 报价过期：费用明细各行与底栏一起换成「刷新后显示」，不能打开旧报价的明细 / 券 / 签署弹层；刷新后恢复', async () => {
  fresh(); await verify();
  const pg = env.newPage('pkg-trade/confirm/index', { unit: U3, term: '6', date: START }); await tick();
  pg.onFees(); assert.equal(pg.data.sheet, 'fees');
  offset = C.timers.quoteTtlHours * H + 2000; pg.tick();
  assert.equal(pg.data.quoteExpired, true); assert.equal(pg.data.sheet, '', '已打开的旧明细弹层关掉');
  assert.equal(pg.data.feePlaceholder, '刷新后显示'); assert.equal(pg.data.bar.amount, '刷新后显示'); assert.equal(pg.data.couponEditable, false);
  const fc = env.newComponent('components/mk-fee-detail/index', { order: pg.data.cardOrder, placeholder: pg.data.feePlaceholder });
  assert.ok(!/¥/.test(JSON.stringify([fc.data.rows, fc.data.total])), '过期后明细里没有任何旧金额');
  pg.onFees(); assert.equal(pg.data.sheet, ''); pg.onCoupon(); assert.equal(pg.data.sheet, '');
  pg.onBar(); await tick();
  assert.deepEqual([pg.data.quoteExpired, pg.data.feePlaceholder], [false, '']); pg.onHide();
});

test('R-07 / B-08 支付未成功：按失败原因显示一句原因和建议；四类都有文案；标签统一「支付未成功」（B-09）', async () => {
  fresh();
  const pg = await failedPage(U3, 6);
  const od = db.orders[0];
  assert.equal(od.pay.fail_reason, 'network');
  assert.deepEqual([pg.data.head.title, pg.data.head.tag, pg.data.head.reason, pg.data.head.note], ['支付未成功，订单为您保留', '支付未成功', T.payFail.network[0], T.payFail.network[1]]);
  for (const k of ['balance', 'cancelled', 'network', 'risk']) {
    assert.ok(T.payFail[k][0] && T.payFail[k][1], k);
    od.pay.fail_reason = k; await pg.loadOrder(); await tick(20);
    assert.deepEqual([pg.data.head.reason, pg.data.head.note], T.payFail[k]);
  }
  od.pay.fail_reason = ''; await pg.loadOrder(); await tick(20);
  assert.deepEqual([pg.data.head.reason, pg.data.head.note], ['', T.confirm.failedNote], '没有原因时退回通用说明');
  assert.equal(T.confirm.failedTag, T.stage.payment_failed);
  // 接口可指定失败原因；继续支付成功后清掉
  await api.resumeFailedOrder({ order_id: od.id });
  await api.payOrder({ order_id: od.id, simulate: 'fail', fail_reason: 'balance' }); assert.equal(od.pay.fail_reason, 'balance');
  await api.resumeFailedOrder({ order_id: od.id }); await api.payOrder({ order_id: od.id }); assert.equal(od.pay.fail_reason, '');
  pg.onHide();
});

test('R-05 / B-10 支付失败后「更换仓位」：先确认；确认后自动取消原订单、释放仓位，再去门店详情；不确认则什么都不变', async () => {
  fresh();
  const pg = await failedPage(U3, 6);
  const od = db.orders[0];
  confirmModal = false; env.nav.length = 0; modals.length = 0;
  pg.onSwap(); await tick(30);
  assert.equal(modals.length, 1); assert.deepEqual([modals[0].title, modals[0].content, modals[0].confirmText, modals[0].cancelText], ['确认更换仓位？', '更换后这笔订单将自动取消，仓位随即释放。', '确认更换', '暂不更换']);
  assert.equal(od.stage, S.FAILED); assert.equal(env.nav.length, 0); assert.equal(db.kv.trade.holds[U3], od.id);
  confirmModal = true; pg.onSwap(); await tick(40);
  assert.equal(od.stage, S.CANCELLED); assert.equal(db.kv.trade.holds[U3], undefined, '仓位已释放');
  assert.deepEqual(env.nav, [{ kind: 'navigateTo', url: routes.STORE_DETAIL + '?id=SIM_BJ01' }]);
  assert.equal(pg.data.phase, 'cancelled');
  assert.equal((await api.getOrderDraft({ unit_ids: [U3], months: 6 })).available, true, '原仓位可重新下单');
  assert.ok(modals.every((m) => m.confirmText.length <= 4 && m.cancelText.length <= 4), '微信弹窗按钮不超过 4 个字');
  pg.onHide();
});

test('B-14 从协议页等返回：不重取报价，计时不重置，签署弹层与提交用同一份报价', async () => {
  fresh(); await verify();
  const pg = env.newPage('pkg-trade/confirm/index', { unit: U3, term: '6', date: START }); await tick();
  const q0 = pg._quote.quoted_at;
  pg.onAgree(); pg.onSign(); assert.equal(pg.data.sheet, 'sign');
  pg.onUsage(); pg.onHide(); offset = 5 * 60000; pg.onShow(); await tick(30);
  assert.equal(pg._quote.quoted_at, q0, '报价时刻不变'); assert.equal(pg.data.sheet, 'sign'); assert.equal(pg.data.agreed, true);
  pg.onSignConfirm(); await tick(30);
  assert.equal(db.orders.length, 1); assert.equal(db.orders[0].quoted_at, q0); assert.equal(db.orders[0].quote.payable, 2010);
  pg.onHide();
  // 返回时报价已过期：照常提示刷新
  fresh(); await verify();
  const p2 = env.newPage('pkg-trade/confirm/index', { unit: U3, term: '6', date: START }); await tick();
  p2.onHide(); offset = C.timers.quoteTtlHours * H + 1000; p2.onShow(); await tick(30); p2.tick();
  assert.equal(p2.data.quoteExpired, true); p2.onHide();
});

test('B-15 等待支付结果：「支付遇到问题」给出说明和客服电话；「已完成支付」只重新取订单', async () => {
  fresh(); await verify();
  const pg = env.newPage('pkg-trade/confirm/index', { unit: U3, term: '6', date: START }); await tick();
  pg.onAgree(); pg.onSign(); pg.onSignConfirm(); await tick(30);
  modals.length = 0; pg.setData({ paying: true });
  pg.onPayDone(); await tick(20); assert.equal(modals.length, 0); assert.equal(pg.data.paying, false);
  pg.setData({ paying: true }); pg.onPayProblem(); await tick(20);
  assert.equal(pg.data.paying, false); assert.equal(modals.length, 1);
  assert.equal(modals[0].title, '支付遇到问题'); assert.ok(modals[0].content.includes(CT.hotline)); assert.deepEqual([modals[0].confirmText, modals[0].cancelText], ['联系客服', '知道了']);
  assert.equal(pg.data.phase, 'pending', '订单仍保留'); pg.onHide();
});

test('B-16 签署不成功不留订单：下单与签署一次提交，实名不通过时不生成订单', async () => {
  fresh(); await verify();
  const pg = env.newPage('pkg-trade/confirm/index', { unit: U3, term: '6', date: START }); await tick();
  db.kv.trade.identity = {}; // 服务端的实名记录失效，本机还以为已认证
  pg.onAgree(); pg.onSign(); pg.onSignConfirm(); await tick(30);
  assert.equal(db.orders.length, 0, '订单列表里不会多出一笔已取消'); assert.equal(db.kv.trade.holds[U3], undefined);
  assert.equal(pg.data.idv.verified, false); assert.equal(pg.data.bar.btn, '实名认证'); assert.ok(toasts.includes(T.confirm.hintIdentity));
  pg.onHide();
  // 接口：sign: true 一步得到已签署的待支付订单；不带 sign 的旧调用方式仍可用
  await verify();
  const d = await api.getOrderDraft({ unit_ids: [U3], months: 6 });
  const od = await api.createOrder({ unit_ids: [U3], months: 6, start_date: START, quoted_at: d.quoted_at, expect_payable: d.quote.payable, sign: true });
  assert.equal(od.contract.signed, true); assert.equal(od.contract.signer_masked, '*明'); assert.equal(od.stage, S.PENDING);
});

test('B-17 实名弹层：两处共用一套标签（T.idv）；姓名不合格的提示在姓名框下，身份证号的在身份证号框下', async () => {
  assert.deepEqual([T.confirm.idvTitle, T.confirm.idvNo, T.confirm.idvNoPh, T.confirm.idvFine], [T.idv.title, T.idv.no, T.idv.noPh, T.idv.fine]);
  fresh();
  const pg = env.newPage('pkg-trade/confirm/index', { unit: U3, term: '6', date: START }); await tick();
  pg.onIdv(); pg.onIdvName({ detail: { value: '张3' } }); pg.onIdvNo({ detail: { value: ID.id_no } });
  pg.onIdvSubmit(); await tick(20);
  assert.deepEqual([pg.data.idvNameError, pg.data.idvError], ['请填写证件上的姓名', '']);
  pg.onIdvName({ detail: { value: '张明' } }); assert.equal(pg.data.idvNameError, '');
  pg.onIdvNo({ detail: { value: '11010119900101001A' } }); pg.onIdvSubmit(); await tick(20);
  assert.deepEqual([pg.data.idvNameError, pg.data.idvError], ['', '请填写 18 位身份证号']);
  pg.onHide();
  assert.match(fs.readFileSync(path.join(root, 'pkg-trade/confirm/index.wxml'), 'utf8'), /error="\{\{idvNameError\}\}"/);
});

test('B-13 快捷下单未登录且已选齐：金额位写「登录后显示」，不留空行', async () => {
  fresh(false);
  const pg = env.newPage('pkg-trade/quick/index', { store: 'SIM_BJ01', unit: U3 }); await tick(30);
  pg.onDate({ detail: { value: START } }); await tick();
  assert.deepEqual([pg.data.barLabel, pg.data.barAmount, pg.data.btnText, pg.data.btnDisabled], ['预计整期租金', '登录后显示', '查看报价', false]);
  assert.ok(!/¥\d/.test(pg.data.barAmount));
});

test('B-21 文案里的小时数取自配置；R-21 本域冗余说明句已清理', () => {
  assert.equal(T.confirm.quoteExpired, '报价已超过 ' + C.timers.quoteTtlHours + ' 小时');
  assert.ok(T.confirm.prepayNote.endsWith('报价 ' + C.timers.quoteTtlHours + ' 小时内有效'));
  assert.equal(T.confirm.expiredNote, '超过 ' + C.timers.pendingOrderTtlHours + ' 小时付款有效期，仓位已释放');
  const src = fs.readFileSync(path.join(root, 'i18n/trade.js'), 'utf8');
  for (const k of ['quoteExpired:', 'prepayNote:', 'expiredNote:']) assert.ok(!/\d 小时/.test(src.split('\n').find((l) => l.includes(k)).split(k)[1].split(',')[0]), k);
  assert.equal(T.confirm.goneDesc, '该仓位刚被租出或已下架。'); assert.equal(T.quick.goneDesc, '该仓位刚被租出或已下架。');
  assert.equal(T.confirm.quoteExpiredSub, ''); assert.equal(T.confirm.cancelledNote, '仓位已释放');
  assert.ok(!/请联系客服/.test(T.agreement.pendingDesc));
});

test('R-15 转发：快捷下单、协议页定义转发；确认订单是受限页，不转发', async () => {
  fresh(false);
  const qk = env.newPage('pkg-trade/quick/index', { store: 'SIM_BJ01', unit: U3 }); await tick(30);
  assert.deepEqual(qk.onShareAppMessage().path, routes.QUICK + '?store=SIM_BJ01&unit=' + U3); assert.ok(qk.onShareAppMessage().title);
  const q0 = env.newPage('pkg-trade/quick/index', {}); await tick(30); assert.equal(q0.onShareAppMessage().path, routes.QUICK);
  const ag = env.newPage('pkg-trade/agreement/index', { doc: 'notice' });
  assert.deepEqual(ag.onShareAppMessage(), { title: T.doc.notice.title, path: routes.AGREEMENT + '?doc=notice' });
  const old = env.newPage('pkg-trade/agreement/index', { doc: 'privacy' }); assert.equal(old.onShareAppMessage().path, routes.AGREEMENT + '?doc=register');
  fresh();
  const cf = env.newPage('pkg-trade/confirm/index', { unit: U3, term: '6' }); await tick();
  assert.equal(typeof cf.onShareAppMessage, 'undefined'); cf.onHide();
});
