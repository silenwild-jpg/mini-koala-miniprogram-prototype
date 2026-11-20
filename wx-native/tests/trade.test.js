// 交易域（第 2 批）测试：下单规则、接口、关键流程。在假的 wx 环境里跑，验证的是代码逻辑与跳转去向，不是微信真实行为。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), routes = R('services/routes'), api = R('services/api'), pricing = R('core/pricing'), order = R('core/order');
const { db, unit } = R('services/mock-ext/_db');
const view = R('services/order-view'), identity = R('services/identity'), T = R('i18n/trade');
env.loadApp();
const H = 3600e3, S = order.STAGE;
// 预计用仓时间必须落在「明天起 90 天内」（config-trade.startDate），所以用相对今天的日期，不写死
const START = view.ymd(Date.now() + 11 * 24 * H), START2 = view.ymd(Date.now() + 34 * 24 * H);
const realNow = Date.now; let offset = 0; Date.now = () => realNow() + offset;
const toasts = []; wx.showToast = (o) => toasts.push(o.title);
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 15));
const login = () => state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
function fresh(loggedIn) {
  offset = 0; state.reset(); env.nav.length = 0; env.mode = 'ok'; toasts.length = 0;
  db.orders.length = 0; db.seq = 0; db.seeded = false; db.kv = {}; db.sms = {};
  if (loggedIn) login();
}
const noSeed = () => { db.seeded = true; }; // 不要 5 笔演示订单，从空订单开始
const ID = { name: '张明', id_no: '110101199001010012' };
const U3 = 'SIM_BJ01_U03', U5 = 'SIM_BJ01_U05';
const rejects = (p, code) => assert.rejects(p, (e) => e.code === code, code);
async function placed(unitId, months) { // 实名 → 下单 → 签署，得到一笔待支付订单
  await api.verifyIdentity(ID);
  const d = await api.getOrderDraft({ unit_ids: [unitId], months });
  const od = await api.createOrder({ unit_ids: [unitId], months, start_date: START, quoted_at: d.quoted_at, expect_payable: d.quote.payable });
  return api.signContract({ order_id: od.id });
}

test('下单金额与 pricing.quote 一致；订单号 MK + 下单日 8 位 + 4 位序号；满额减字段落在订单上', async () => {
  fresh(true); noSeed();
  const a = await placed(U3, 6), q = pricing.quote([unit(U3)], 6);
  assert.deepEqual(a.quote, q); assert.equal(a.quote.payable, 2010); assert.equal(a.quote.rent_total, 1680); assert.equal(a.deposit.amount, 280);
  assert.match(a.no, /^MK\d{8}\d{4}$/); assert.equal(a.no, order.orderNo(a.created_at, 1)); assert.equal(a.stage, S.PENDING);
  assert.equal(a.unit_name, 'A003 · 3.5m³'); assert.equal(a.identity_at_order, true); assert.equal(a.contract.signed, true); assert.equal(a.contract.signer_masked, '*明');
  assert.equal(view.ymd(a.lease.start), START); assert.equal(a.deal_factor, 0.7);
  const b = await placed(U5, 24);
  assert.deepEqual(b.quote, pricing.quote([unit(U5)], 24)); assert.equal(b.quote.full_reduction, 400); assert.equal(b.quote.full_min, 10000); assert.equal(b.quote.rent_after_discount, 11600); assert.equal(b.quote.payable, 12150);
  assert.equal((await api.getOrders()).length, 2);
});
test('未登录：接口拒绝；下单草稿不带任何金额', async () => {
  fresh(false);
  for (const n of ['createOrder', 'payOrder', 'cancelOrder', 'signContract', 'verifyIdentity', 'refreshQuote', 'resumeFailedOrder', 'getIdentity', 'getOrders', 'getOrder']) await rejects(api[n]({ unit_ids: [U3], months: 6, order_id: 'x', id: 'x' }), 'UNAUTHENTICATED');
  const d = await api.getOrderDraft({ unit_ids: [U3], months: 6 });
  assert.equal(d.quote, null); assert.equal(d.available, true); assert.equal(d.store.name, '安贞·富仁名苑店');
  assert.ok(!/rent_total|payable/.test(JSON.stringify(d)));
  login(); const e = await api.getOrderDraft({ unit_ids: [U3], months: 6 });
  assert.equal(e.quote.payable, 2010); assert.equal(e.expires_at - e.quoted_at, 3 * H);
});
test('流程顺序 D-148：未实名不能签署；未签署不能支付；实名只支持合法格式的身份证', async () => {
  fresh(true); noSeed();
  const od = await api.createOrder({ unit_ids: [U3], months: 6 });
  assert.equal(od.identity_at_order, false);
  await rejects(api.signContract({ order_id: od.id }), 'IDENTITY_REQUIRED');
  await rejects(api.payOrder({ order_id: od.id }), 'INVALID');
  await rejects(api.verifyIdentity({ name: '张', id_no: ID.id_no }), 'INVALID');
  await rejects(api.verifyIdentity({ name: '张明', id_no: '1101011990' }), 'INVALID');
  await rejects(api.verifyIdentity(Object.assign({ simulate: 'mismatch' }, ID)), 'MISMATCH');
  assert.equal((await api.getIdentity()).status, 'none');
  const rec = await api.verifyIdentity(ID);
  assert.deepEqual([rec.status, rec.name_masked, rec.id_masked], ['verified', '*明', '110***********0012']);
  const signed = await api.signContract({ order_id: od.id });
  assert.equal(signed.contract.signed, true); assert.equal(signed.identity_at_order, false, '下单时未实名的事实保留（D-174）'); assert.equal(signed.identity_status, 'verified');
  assert.equal((await api.payOrder({ order_id: od.id })).stage, S.PAID);
});
test('两个计时互不影响：报价 3 小时只管下单前，待支付 3 小时自下单起算', async () => {
  fresh(true); noSeed(); await api.verifyIdentity(ID);
  const d = await api.getOrderDraft({ unit_ids: [U3], months: 6 }), t0 = d.quoted_at;
  offset = 2 * H; // 报价 2 小时后才下单
  const od = await api.signContract({ order_id: (await api.createOrder({ unit_ids: [U3], months: 6, quoted_at: t0, expect_payable: d.quote.payable })).id });
  assert.equal(od.quoted_at, t0); assert.equal(od.pay.expires_at, od.created_at + 3 * H);
  assert.ok(od.pay.expires_at - t0 >= 5 * H - 1000, '待支付截止不随报价时刻提前');
  offset = 3.5 * H; // 报价已过期：新下单被拒，但已有订单仍是待支付
  await rejects(api.createOrder({ unit_ids: [U5], months: 6, quoted_at: t0 }), 'EXPIRED');
  assert.equal((await api.getOrder({ id: od.id })).stage, S.PENDING);
  const fresh2 = await api.refreshQuote({ unit_ids: [U5], months: 6 }); // 刷新报价不需要重新登录
  assert.equal(fresh2.expires_at - fresh2.quoted_at, 3 * H); assert.equal(state.get().session.loggedIn, true);
  offset = 5 * H + 5000; // 待支付超过 3 小时：订单失效、仓位释放
  assert.equal((await api.getOrder({ id: od.id })).stage, S.EXPIRED);
  await rejects(api.payOrder({ order_id: od.id }), 'EXPIRED');
  assert.equal((await api.getOrderDraft({ unit_ids: [U3], months: 6 })).available, true);
});
test('支付失败：不释放仓位、不重新计时；四项核对一致后同一订单号回到待支付', async () => {
  fresh(true); noSeed();
  const od = await placed(U3, 6);
  offset = 1 * H;
  const failed = await api.payOrder({ order_id: od.id, simulate: 'fail' });
  assert.equal(failed.stage, S.FAILED); assert.equal(failed.pay.expires_at, od.pay.expires_at, '沿用原截止时间'); assert.equal(failed.pay.fail_reason, 'network');
  assert.equal((await api.getOrderDraft({ unit_ids: [U3], months: 6 })).available, false, '仓位仍被这笔订单占住');
  await rejects(api.createOrder({ unit_ids: [U3], months: 6 }), 'NOT_FOUND');
  await rejects(api.payOrder({ order_id: od.id }), 'CONFLICT');
  const dry = await api.resumeFailedOrder({ order_id: od.id, dry_run: true });
  assert.deepEqual(dry.checks, { status: true, unit: true, price: true, coupon: true }); assert.equal(dry.ok, true); assert.equal(dry.order.stage, S.FAILED, '只核对不改状态');
  const res = await api.resumeFailedOrder({ order_id: od.id });
  assert.equal(res.order.id, od.id); assert.equal(res.order.stage, S.PENDING); assert.equal(res.order.pay.expires_at, od.pay.expires_at); assert.equal(res.order.quote.payable, od.quote.payable);
  offset = 3 * H + 5000; // 自下单起 3 小时到点：即使中途失败过也不延长
  assert.equal((await api.getOrder({ id: od.id })).stage, S.EXPIRED);
  const late = await api.resumeFailedOrder({ order_id: od.id });
  assert.equal(late.ok, false); assert.equal(late.checks.status, false);
});
test('支付失败后价格变了：核对结果为已变化，用户确认新报价后金额更新', async () => {
  fresh(true); noSeed();
  const od = await placed(U3, 6);
  await api.payOrder({ order_id: od.id, simulate: 'fail' });
  const r = await api.resumeFailedOrder({ order_id: od.id, simulate: 'price_changed' });
  assert.equal(r.ok, false); assert.deepEqual(r.checks, { status: true, unit: true, price: false, coupon: true }); assert.equal(r.order.stage, S.FAILED);
  assert.equal(r.new_quote.unit_pricing[0].base_month, 440); assert.equal(r.new_quote.payable, 2206);
  const ok = await api.resumeFailedOrder({ order_id: od.id, accept_price_change: true, price_change_reason: '该仓位月租由 ¥400 调整为 ¥440' });
  assert.equal(ok.ok, true); assert.equal(ok.order.stage, S.PENDING); assert.equal(ok.order.quote.payable, 2206); assert.equal(ok.order.deposit.amount, 308); assert.equal(ok.order.id, od.id);
});
test('取消订单释放仓位；待支付与支付失败都可取消，其它阶段不行', async () => {
  fresh(true); noSeed();
  const a = await placed(U3, 6);
  assert.equal((await api.getOrderDraft({ unit_ids: [U3], months: 6 })).available, false);
  assert.equal((await api.cancelOrder({ order_id: a.id })).stage, S.CANCELLED);
  assert.equal((await api.getOrderDraft({ unit_ids: [U3], months: 6 })).available, true);
  const b = await placed(U3, 6); assert.notEqual(b.id, a.id);
  await api.payOrder({ order_id: b.id, simulate: 'fail' });
  assert.equal((await api.cancelOrder({ order_id: b.id })).stage, S.CANCELLED);
  const c = await placed(U3, 6); await api.payOrder({ order_id: c.id });
  await rejects(api.cancelOrder({ order_id: c.id }), 'CONFLICT'); await rejects(api.cancelOrder({ order_id: a.id }), 'CONFLICT');
  assert.equal((await api.getOrderDraft({ unit_ids: [U3], months: 6 })).available, false, '已支付的订单继续占住仓位');
});
test('下单时变价：不下单，带回新报价与差异；确认后按新价下单并记录原因', async () => {
  fresh(true); noSeed(); await api.verifyIdentity(ID);
  const d = await api.getOrderDraft({ unit_ids: [U3], months: 6 });
  await assert.rejects(api.createOrder({ unit_ids: [U3], months: 6, quoted_at: d.quoted_at, expect_payable: d.quote.payable, simulate: 'price_changed' }), (e) => e.code === 'CONFLICT' && e.data.quote.payable === 2206 && e.data.quote.rent_total === 1848);
  assert.equal(db.orders.length, 0);
  const n = await api.refreshQuote({ unit_ids: [U3], months: 6 }); assert.equal(n.quote.payable, 2206);
  const od = await api.createOrder({ unit_ids: [U3], months: 6, quoted_at: n.quoted_at, expect_payable: n.quote.payable, accept_price_change: true, price_change_reason: 'x' });
  assert.equal(od.quote.payable, 2206); assert.equal(od.price_change_reason, 'x');
});
test('免费运输（D-173）落在订单上：5km 及以上且满 6 个月；优惠券只抵租金', async () => {
  fresh(true); noSeed(); await api.verifyIdentity(ID);
  assert.equal((await api.createOrder({ unit_ids: [U3], months: 6, km: 6.2 })).free_transport, true);
  await api.cancelOrder({ order_id: db.orders[0].id });
  assert.equal((await api.createOrder({ unit_ids: [U3], months: 5, km: 6.2 })).free_transport, false);
  await api.cancelOrder({ order_id: db.orders[1].id });
  assert.equal((await api.createOrder({ unit_ids: [U3], months: 6, km: null })).free_transport, false);
  await api.cancelOrder({ order_id: db.orders[2].id });
  const d = await api.getOrderDraft({ unit_ids: [U3], months: 12, simulate: 'coupon' });
  assert.equal(d.quote.coupon_discount, 300); assert.equal(d.quote.deposit, 260); assert.equal(d.quote.payable, 3120 - 300 + 260 + 50); assert.equal(d.coupon_name, '12个月长租券');
  assert.equal((await api.getOrderDraft({ unit_ids: [U3], months: 12, coupon: 'none' })).quote.coupon_discount, 0);
  const od = await api.createOrder({ unit_ids: [U3], months: 12, expect_payable: d.quote.payable });
  assert.equal(od.quote.payable, d.quote.payable); assert.equal(od.coupon_name, '12个月长租券');
});
test('订单阶段判定：5 笔演示订单各落在不同阶段；下单时未实名的订单补实名后转为待入仓', async () => {
  fresh(true);
  const os = await api.getOrders(), now = Date.now();
  assert.deepEqual(os.map((o) => view.phase(o, now)), ['active', 'expiring', 'identity', 'pending', 'ended']);
  assert.deepEqual(os.map((o) => view.stageLabel(o, now).label), ['租用中', '即将到期', '待实名认证', '待支付', '已退仓']);
  assert.deepEqual(view.head(os[2], now), { phase: 'identity', variant: '', title: '入仓前需完成实名认证', tag: '待认证', tone: 'warn' });
  await api.verifyIdentity(ID);
  const o3 = await api.getOrder({ id: os[2].id });
  assert.equal(view.phase(o3, now), 'upcoming'); assert.equal(o3.identity_at_order, false);
  assert.equal(view.phase(os[3], now + 4 * H), 'expired', '待支付超过截止时间即显示已超时');
});
test('订单摘要卡与费用明细：同一份订单数据；满额减、已省、合计的写法与冻结稿一致', async () => {
  fresh(true); noSeed();
  const od = await placed(U5, 24), now = Date.now();
  const c = view.card(od, now, { showKm: true });
  assert.deepEqual([c.storeName, c.kmText, c.unitName, c.unitSub, c.termText, c.periodLabel, c.periodText], ['安贞·富仁名苑店', '1.2km', 'A005 · 8m³', '2 × 1.6 × 2.5m', '24个月', '起租日', START]);
  const f = view.fees(od, now, { showCoupon: true, locked: true });
  assert.deepEqual(f.rows.map((r) => [r.k, r.sub || '', r.amt, r.sec || '']), [
    ['整期租金', '24个月', '¥12,000', '¥500/月 × 24个月'], ['已省', '较月基价 ¥770/月', '¥6,480', ''], ['满额减', '整期满 ¥10,000', '−¥400', '减后整期租金 ¥11,600'],
    ['优惠券', '', '未使用', ''], ['押金', '1个月月租', '¥500', ''], ['整单管理费', '', '¥50', '']]);
  assert.equal(f.rows[0].tag, '6.5折'); assert.deepEqual(f.total, { label: '本次应付', amt: '¥12,150' });
  const paid = await api.payOrder({ order_id: od.id });
  assert.equal(view.fees(paid, now).total.label, '已付'); assert.equal(view.card(paid, now).periodLabel, '起止日期'); assert.equal(view.card(paid, now).periodText, START + ' 至 ' + view.ymd(R('core/order-model').addMonths(view.parseYmd(START), 24)));
  const ph = view.feesPlaceholder('登录后显示'); assert.ok(!/¥/.test(JSON.stringify(ph))); assert.equal(ph.rows.length, 4);
  const fc = env.newComponent('components/mk-fee-detail/index', { order: paid }); assert.equal(fc.data.total.amt, '¥12,150');
  const oc = env.newComponent('components/mk-order-card/index', { order: paid, variant: 'list' }); assert.equal(oc.data.v.stageLabel, '待起租', '列表与详情用同一个词（FIX-01 C-16）'); assert.equal(oc.data.v.lineText, 'A005 · 8m³ · 24个月');
});
test('任务卡：未登录或没有订单不渲染；按阶段取主卡，待支付订单进待办条带', async () => {
  fresh(false);
  let c = env.newComponent('components/mk-task-card/index', {}); await c.refresh(); assert.equal(c.data.show, false); c.__detach();
  fresh(true); noSeed();
  c = env.newComponent('components/mk-task-card/index', {}); await c.refresh(); assert.equal(c.data.show, false); c.__detach();
  fresh(true); state.set('requirement', { capacity_m3: 3.5, input_unit: 'm3', input_value: 3.5, term_months: 6 });
  c = env.newComponent('components/mk-task-card/index', {}); await c.refresh();
  assert.equal(c.data.show, true); assert.equal(c.data.main.key, 'expiring'); assert.equal(c.data.main.title, '租期即将到期'); assert.equal(c.data.main.primary.t, '办理续租'); assert.equal(c.data.main.secondary.t, '一键开锁');
  assert.equal(c.data.main.othersText, '另有 1 间在租仓位，请在订单中查看。');
  assert.deepEqual(c.data.todos.map((t) => t.k), ['待支付订单', '找仓进度']); assert.match(c.data.todos[0].t, /^芍药居北里店 · 本次应付 ¥\d+，剩余 0[23]:\d\d:\d\d$/); assert.equal(c.data.todos[1].t, '3.5m³ · 6个月，查看推荐仓位');
  env.nav.length = 0; c.onAction({ currentTarget: { dataset: { a: 'renew' } } }); assert.equal(env.nav[0].url, routes.RENEW + '?id=' + c.data.main.orderId);
  toasts.length = 0; c.onAction({ currentTarget: { dataset: { a: 'unlock' } } }); assert.deepEqual(toasts, ['一键开锁暂未开通，存取时请联系门店协助开门']); assert.equal(env.nav.length, 1, '一键开锁只提示，不跳转');
  env.nav.length = 0; c.onTodo({ currentTarget: { dataset: { i: 0 } } }); assert.match(env.nav[0].url, /^\/pkg-trade\/confirm\/index\?order=MK/);
  c.__detach();
  // 只剩待支付：主卡就是待支付，按钮「继续支付 / 费用明细」
  fresh(true); noSeed(); const od = await placed(U3, 6);
  c = env.newComponent('components/mk-task-card/index', {}); await c.refresh();
  assert.deepEqual([c.data.main.key, c.data.main.primary.t, c.data.main.secondary.t, c.data.main.facts[0].v, c.data.todos.length], ['pending', '继续支付', '费用明细', '¥2,010', 0]);
  await api.payOrder({ order_id: od.id, simulate: 'fail' }); await c.refresh();
  assert.deepEqual([c.data.main.key, c.data.main.title, c.data.main.secondary.t], ['payment_failed', '支付未成功，订单为您保留', '更换仓位']);
  env.nav.length = 0; c.onAction({ currentTarget: { dataset: { a: 'swapUnit' } } }); assert.equal(env.nav[0].url, routes.STORE_DETAIL + '?id=SIM_BJ01');
  c.__detach();
});
test('确认订单页：实名 → 勾选告知书 → 签署 → 生成电子合同 → 支付 → 订单详情', async () => {
  fresh(true); noSeed();
  const pg = env.newPage('pkg-trade/confirm/index', { unit: U3, term: '6', date: START }); await tick();
  assert.equal(pg.data.mode, 'compose'); assert.equal(pg.data.cardOrder.quote.payable, 2010); assert.equal(pg.data.feeNote, '租期折扣按预付整期计算，提前退仓时按协议重新核算 · 报价 3 小时内有效');
  assert.deepEqual([pg.data.bar.btn, pg.data.bar.hint, pg.data.bar.amount, pg.data.bar.saved], ['实名认证', '签署协议前需完成实名认证', '¥2,010', ' · 已省 ¥720']);
  pg.onBar(); assert.equal(pg.data.sheet, 'idv');
  pg.onIdvName({ detail: { value: '张明' } }); pg.onIdvNo({ detail: { value: '11010119900101' } }); assert.equal(pg.data.idvReady, false);
  pg.onIdvNo({ detail: { value: ID.id_no } }); assert.equal(pg.data.idvReady, true); pg.onIdvSubmit(); assert.equal(pg.data.idvChecking, true); await tick();
  assert.equal(pg.data.sheet, ''); assert.equal(pg.data.idv.text, '*明 · 110***********0012'); assert.equal(identity.get().verified, true);
  assert.deepEqual([pg.data.bar.btn, pg.data.bar.disabled, pg.data.bar.hint, pg.data.bar.showAgree], ['签署并提交', true, '请先勾选确认', true]);
  pg.onBar(); assert.equal(pg.data.sheet, '', '未勾选时点不动');
  pg.onAgree(); assert.equal(pg.data.bar.disabled, false); pg.onBar(); assert.equal(pg.data.sheet, 'sign');
  assert.deepEqual(pg.data.signRows.map((r) => r.v), ['*明 · 110***********0012', '安贞·富仁名苑店', 'A003 · 3.5m³', '6个月', START + ' 起计费', view.ymd(R('core/order-model').leaseEnd(view.parseYmd(START), 6)) + '（含当天）', '¥2,010']);
  pg.onSignConfirm(); assert.equal(pg.data.bar.btn, '正在生成电子合同…'); assert.equal(pg.data.bar.disabled, true); await tick(30);
  assert.equal(pg.data.mode, 'order'); assert.equal(pg.data.phase, 'pending'); assert.equal(pg.data.head.title, '订单待支付'); assert.equal(pg.data.sheet, 'pay'); assert.equal(pg.data.payText, '微信支付 ¥2,010');
  assert.equal(db.orders.length, 1); assert.equal(db.orders[0].contract.signed, true); assert.match(pg.data.clock, /^0[23]:\d\d:\d\d$/);
  env.nav.length = 0; pg.onPayConfirm(); await tick(30);
  assert.deepEqual(env.nav, [{ kind: 'redirectTo', url: routes.ORDER_DETAIL + '?id=' + db.orders[0].id + '&paid=1' }]); assert.equal(db.orders[0].stage, S.PAID);
  pg.onHide();
});
test('确认订单页：支付失败 → 四项核对 → 继续支付；取消订单；报价过期只刷新报价；变价确认；仓位已不可租', async () => {
  fresh(true); noSeed(); await api.verifyIdentity(ID); identity.save(await api.getIdentity());
  let pg = env.newPage('pkg-trade/confirm/index', { unit: U3, term: '6', demo: 'pay_fail' }); await tick();
  pg.onAgree(); pg.onSign(); pg.onSignConfirm(); await tick(30); pg.onPayConfirm(); await tick(40);
  const od = db.orders[0];
  assert.equal(od.stage, S.FAILED); assert.equal(pg.data.phase, 'payment_failed'); assert.equal(pg.data.head.title, '支付未成功，订单为您保留'); assert.equal(pg.data.head.tag, '支付未成功'); assert.equal(pg.data.swapText, '更换仓位');
  assert.equal(pg.data.recheck.title, '已重新核对，与原订单一致，可以继续支付');
  assert.deepEqual(pg.data.recheck.rows.map((r) => [r.k, r.v, r.ok]), [['订单状态', '已保留', true], ['仓位 A003', '可租', true], ['价格', '与原订单一致', true], ['优惠资格', '无变化', true]]);
  pg.onBar(); await tick(30); assert.equal(pg.data.phase, 'pending'); assert.equal(pg.data.sheet, 'pay'); assert.equal(pg.data.cardOrder.id, od.id, '同一订单号');
  pg.onPayLater(); assert.equal(pg.data.sheet, ''); pg.onCancel(); await tick(30);
  assert.equal(od.stage, S.CANCELLED); assert.equal(pg.data.phase, 'cancelled'); assert.equal(pg.data.bar.btn, '重新找仓'); assert.equal(pg.data.dead, true); assert.ok(pg.data.alts.length > 0 && pg.data.alts.length <= 3);
  env.nav.length = 0; pg.onBar(); assert.deepEqual(env.nav, [{ kind: 'switchTab', url: routes.STORES }]); pg.onHide();
  // 回到同一订单号（任务卡「继续支付」的去向）
  const b = await placed(U3, 6);
  pg = env.newPage('pkg-trade/confirm/index', { order: b.id }); await tick();
  assert.deepEqual([pg.data.mode, pg.data.phase, pg.data.bar.btn, pg.data.editable, pg.data.locked], ['order', 'pending', '继续支付', false, true]); pg.onHide();
  await api.cancelOrder({ order_id: b.id });
  // 报价超过 3 小时：只出现「刷新报价」，不打开登录层
  pg = env.newPage('pkg-trade/confirm/index', { unit: U3, term: '6' }); await tick();
  offset = 3 * H + 2000; pg.tick();
  assert.equal(pg.data.quoteExpired, true); assert.deepEqual([pg.data.bar.btn, pg.data.bar.amount], ['刷新报价', '刷新后显示']); assert.equal(pg.data.loginVisible, false);
  pg.onBar(); await tick(); assert.equal(pg.data.quoteExpired, false); assert.equal(pg.data.bar.btn, '签署并提交'); pg.onHide();
  // 变价
  offset = 0;
  pg = env.newPage('pkg-trade/confirm/index', { unit: U3, term: '6', demo: 'price_changed' }); await tick();
  pg.onAgree(); pg.onSign(); pg.onSignConfirm(); await tick(30);
  assert.equal(pg.data.price.reason, '该仓位月租由 ¥400 调整为 ¥440'); assert.deepEqual(pg.data.price.rows.map((r) => [r.k, r.old, r.cur]), [['整期租金', '¥1,680', '¥1,848'], ['月租', '¥280/月', '¥308/月'], ['押金', '¥280', '¥308'], ['本次应付', '¥2,010', '¥2,206']]);
  assert.deepEqual([pg.data.bar.btn, pg.data.bar.disabled, pg.data.bar.hint, pg.data.bar.saved], ['确认订单', true, '请先确认新报价', '']); assert.equal(db.orders.filter((o) => o.stage === S.PENDING).length, 0);
  pg.onPriceAccept(); await tick(); assert.equal(pg.data.price, null); assert.equal(pg.data.cardOrder.quote.payable, 2206); pg.onHide();
  // 所选仓位已不可租
  await placed(U5, 6);
  pg = env.newPage('pkg-trade/confirm/index', { unit: U5, term: '6' }); await tick();
  assert.equal(pg.data.gone, true); assert.equal(pg.data.held, db.orders[db.orders.length - 1].id); assert.deepEqual([pg.data.bar.btn, pg.data.bar.disabled, pg.data.bar.action], ['继续支付', false, 'held']); pg.onHide(); // FIX-01 B-06：占用方是本人的待支付订单
  // 没带仓位：空态
  pg = env.newPage('pkg-trade/confirm/index', {}); await tick(); assert.equal(pg.data.mode, 'empty'); pg.onHide();
});
test('确认订单页：租期变化时出下一档 / 满额减 / 免费运输引导句（一处只出一句）；满 6 个月且 5km 以上费用明细带免费运输', async () => {
  fresh(true); noSeed();
  const pg = env.newPage('pkg-trade/confirm/index', { unit: U3, term: '11' }); await tick();
  assert.equal(pg.data.hint, '再租 1 个月享 6.5 折，月均少 ¥20');
  pg.onTerm({ detail: { months: 6 } }); await tick(); assert.equal(pg.data.hint, ''); assert.equal(pg.data.cardOrder.free_transport, false, '安贞店 1.2km，不送');
  pg.onDate({ detail: { value: START2 } }); assert.equal(view.ymd(pg.data.cardOrder.lease.start), START2);
  pg.onHide();
  const far = env.newPage('pkg-trade/confirm/index', { unit: 'SIM_BJ04_U02', term: '5' }); await tick();
  assert.match(far.data.hint, /^再租 1 个月享 7 折，还可免费运输 1 次$/);
  far.onTerm({ detail: { months: 6 } }); await tick(); assert.equal(far.data.cardOrder.free_transport, true);
  assert.ok(view.fees(far.data.cardOrder, Date.now(), {}).rows.some((r) => r.k === '服务权益' && r.amt === '免费运输 1 次 · 顾问联系安排'));
  far.onHide();
});
test('快捷下单：未登录不出整期金额，主按钮「查看报价」打开登录层；登录后显示预计整期租金并可进确认订单', async () => {
  fresh(false);
  const pg = env.newPage('pkg-trade/quick/index', { store: 'SIM_BJ01' }); await tick();
  assert.equal(pg.data.store.name, '安贞·富仁名苑店'); assert.equal(pg.data.term, 12); assert.deepEqual([pg.data.barAmount, pg.data.btnDisabled], ['选择仓位', true]);
  pg.onUnitSheet(); assert.ok(pg.data.unitRows.length >= 3 && pg.data.unitRows.every((r) => /^¥\d+$/.test(r.price)));
  pg.onPickUnit({ currentTarget: { dataset: { id: U3 } } }); await tick();
  assert.equal(pg.data.unit.name, 'A003 · 3.5m³'); assert.equal(pg.data.est, null); assert.equal(pg.data.fromText, '¥260'); assert.equal(pg.data.barAmount, '选择用仓日期');
  pg.onTerm({ detail: { months: 6 } }); pg.onDate({ detail: { value: START } }); await tick();
  assert.ok(!/整期 ¥|rent_total|payable/.test(JSON.stringify(pg.data).replace(/预计整期租金/g, '')), '未登录的页面数据里没有整期金额');
  assert.deepEqual([pg.data.btnText, pg.data.btnDisabled], ['查看报价', false]);
  env.nav.length = 0; pg.onNext(); assert.equal(pg.data.loginVisible, true); assert.equal(env.nav.length, 0);
  login(); pg.onLoginSuccess(); await tick();
  assert.deepEqual([pg.data.est.amount, pg.data.est.tag, pg.data.barAmount, pg.data.btnText], ['¥1,680', '7折', '¥1,680', '下一步：确认订单']);
  pg.onNext(); assert.deepEqual(env.nav, [{ kind: 'navigateTo', url: routes.CONFIRM + '?unit=' + U3 + '&term=6&date=' + START }]);
  pg.onStoreSheet(); assert.ok(pg.data.storeRows.length <= 8 && pg.data.storeRows[0].on);
  assert.equal(pg.data.storeRows[0].sub, '1.2km · ' + pg._stores.find(s => s.id === 'SIM_BJ01').address);
  const stores = pg._stores;
  pg._stores = stores.map(s => ({ ...s, units: s.units.map(u => ({ ...u, status: 'reserved' })) }));
  pg.onStoreSheet(); assert.ok(pg.data.storeRows.every(r => r.sub.endsWith('暂无可租') && r.price === ''), '被占用的库存不能显示可租起价');
  pg._stores = stores;
  // 加租仓位：带入在租门店
  const add = env.newPage('pkg-trade/quick/index', { store: 'SIM_BJ01', carried: '1' }); await tick(); assert.equal(add.data.carried, true);
});
test('订单详情：各阶段的标题、底栏与服务行；一键开锁只提示；电子合同行进电子合同页；未实名兜底（D-174）', async () => {
  fresh(true);
  const os = await api.getOrders();
  const open = async (o, q) => { const pg = env.newPage('pkg-trade/order/index', Object.assign({ id: o.id }, q || {})); await tick(); return pg; };
  const act = (pg, a) => pg.onAct({ currentTarget: { dataset: { a } } });
  let pg = await open(os[0]);
  assert.deepEqual([pg.data.head.title, pg.data.head.tag, pg.data.bar.primary.t, pg.data.bar.secondary.t, pg.data.withUnlock], ['仓位租用中', '租用中', '一键开锁', '门店导航', true]);
  assert.deepEqual(pg.data.services.map((r) => r.k + (r.v ? ' ' + r.v : '')), ['电子合同 已签署', '入仓指引', '续租 可申请', '退仓', '押金进度', '申请发票 可申请']);
  toasts.length = 0; env.nav.length = 0; act(pg, 'unlock'); assert.deepEqual(toasts, ['一键开锁暂未开通，存取时请联系门店协助开门']); assert.equal(env.nav.length, 0);
  for (const [a, r] of [['contract', 'ECONTRACT'], ['renew', 'RENEW'], ['exit', 'EXIT'], ['deposit', 'DEPOSIT'], ['invoice', 'INVOICE'], ['access', 'ACCESS']]) { env.nav.length = 0; act(pg, a); assert.deepEqual(env.nav, [{ kind: 'navigateTo', url: routes[r] + '?id=' + os[0].id }], a); }
  pg.onHide();
  pg = await open(os[1]); assert.deepEqual([pg.data.head.title, pg.data.bar.primary.t, pg.data.bar.secondary.t], ['租期即将到期', '办理续租', '一键开锁']); assert.ok(pg.data.subs.some((s) => /^剩余 \d+ 天$/.test(s))); pg.onHide();
  pg = await open(os[2]);
  assert.deepEqual([pg.data.head.title, pg.data.note.text, pg.data.bar.primary.t, pg.data.bar.secondary.t], ['入仓前需完成实名认证', '这笔订单下单时未完成实名认证，完成后起租日起可入仓存取。', '完成实名认证', '门店导航']);
  assert.ok(pg.data.services.some((r) => r.k === '实名认证' && r.v === '待完成')); assert.ok(pg.data.progress.some((r) => r.k === '实名认证' && r.v === '待完成'));
  env.nav.length = 0; act(pg, 'identity'); assert.equal(env.nav[0].url, routes.IDENTITY + '?id=' + os[2].id); pg.onHide();
  pg = await open(os[3]);
  assert.deepEqual([pg.data.head.title, pg.data.bar.mode, pg.data.bar.primary.t, pg.data.cancelable, pg.data.paid], ['订单待支付', 'pay', '继续支付', true, false]); assert.match(pg.data.clock, /^支付剩余 0[23]:\d\d:\d\d$/);
  env.nav.length = 0; act(pg, 'pay'); assert.deepEqual(env.nav, [{ kind: 'navigateTo', url: routes.CONFIRM + '?order=' + os[3].id }]);
  pg.onCancel(); await tick(30); assert.deepEqual([pg.data.head.title, pg.data.bar.primary.t, pg.data.cancelable], ['订单已取消', '重新找仓', false]); pg.onHide();
  pg = await open(os[4]); assert.deepEqual([pg.data.head.title, pg.data.head.tag, pg.data.bar.primary.t, pg.data.storeSvc], ['租赁已结束', '已退仓', '再次找仓', false]);
  assert.ok(pg.data.services.some((r) => r.k === '押金进度' && r.v === '部分退还')); pg.onHide();
  pg = await open({ id: 'MK0' }); assert.equal(pg.data.empty, true); assert.equal(pg.data.showBar, false);
  pg = await open(os[0], { paid: '1', sub: 'declined' }); assert.equal(pg.data.paying, false); assert.equal(pg.data.subLine, 'declined'); pg.onHide();
});
test('订单列表：未登录显示空态和登录入口；登录后按最近订单排序，点卡进订单详情', async () => {
  fresh(false);
  let pg = env.newPage('pages/orders/index', {}); await tick();
  assert.deepEqual([pg.data.sys, pg.data.loggedIn, pg.data.orders.length], ['', false, 0]); pg.onLogin(); assert.equal(pg.data.loginVisible, true);
  env.nav.length = 0; pg.onOrder({ currentTarget: { dataset: { id: 'MK1' } } }); assert.equal(env.nav.length, 0, '未登录不进订单详情');
  login(); pg.onLoginSuccess(); await tick();
  assert.equal(pg.data.orders.length, 5); assert.deepEqual(pg.data.orders.map((o) => o.created_at), pg.data.orders.map((o) => o.created_at).sort((a, b) => b - a));
  pg.onOrder({ currentTarget: { dataset: { id: pg.data.orders[0].id } } }); assert.deepEqual(env.nav, [{ kind: 'navigateTo', url: routes.ORDER_DETAIL + '?id=' + pg.data.orders[0].id }]);
  fresh(true); noSeed(); pg = env.newPage('pages/orders/index', {}); await tick(); assert.equal(pg.data.orders.length, 0); assert.equal(pg.data.T.empty, '暂无订单记录');
});
test('登录层：验证码错误 / 过期 / 发送过频 / 发送失败 / 号码冲突 / 微信取号中，各有对应状态', async () => {
  fresh(false);
  const keep = { loginBySms: api.loginBySms, sendSmsCode: api.sendSmsCode, loginByWechatPhone: api.loginByWechatPhone };
  const c = env.newComponent('components/mk-login-sheet/index', { visible: true });
  assert.equal(c.data.sheetTitle, '手机号快捷登录'); assert.equal(c.data.agreement, '《迷你考拉用户注册协议和个人信息保护政策》');
  c.onGetPhone({ detail: { errMsg: 'getPhoneNumber:fail user deny' } }); assert.equal(c.data.note, 'denied'); assert.equal(c.data.mode, 'entry');
  c.onOther(); assert.equal(c.data.mode, 'sms'); assert.equal(c.data.sheetTitle, '其他手机号登录'); c.onToggleAgree();
  c.onPhone({ detail: { value: '13800138000' } }); c.onCode({ detail: { value: '482913' } }); assert.equal(c.data.ready, true);
  api.loginBySms = () => Promise.reject({ code: 'WRONG_CODE' }); c.onSubmitSms(); await tick();
  assert.deepEqual([c.data.error, c.data.codeErr], ['验证码不正确，请重新输入', true]); assert.equal(state.get().session.loggedIn, false);
  api.loginBySms = () => Promise.reject({ code: 'EXPIRED', message: 'x' }); c.onSubmitSms(); await tick();
  assert.deepEqual([c.data.error, c.data.resend, c.data.sendLabel, c.data.countdown], ['验证码已过期，请重新获取', true, '重新获取', 0]);
  api.sendSmsCode = () => Promise.reject({ code: 'RATE_LIMIT' }); c.onSend(); await tick(); assert.equal(c.data.error, '发送过于频繁，请稍后再试');
  api.sendSmsCode = () => Promise.reject({ code: 'NETWORK' }); c.onSend(); await tick(); assert.equal(c.data.error, '验证码发送失败，请稍后重试');
  api.sendSmsCode = keep.sendSmsCode; c.onSend(); await tick(); assert.equal(c.data.hint, '验证码已发送，5 分钟内有效'); assert.match(c.data.sendLabel, /^\d+s 后重发$/); c.__detach();
  api.loginBySms = () => Promise.reject({ code: 'CONFLICT' }); c.onSubmitSms(); await tick();
  assert.deepEqual([c.data.mode, c.data.sheetTitle], ['conflict', '该手机号已绑定其他微信账号']); assert.match(c.data.conflictDesc, /不会自动合并账户.*400-035-8885/); assert.equal(state.get().session.loggedIn, false, '不覆盖、不合并');
  c.onConflictChange(); assert.deepEqual([c.data.mode, c.data.phone], ['sms', '']);
  c.onUseWechat(); let release; api.loginByWechatPhone = () => new Promise((r) => { release = r; });
  c.onGetPhone({ detail: { code: 'c' } }); assert.equal(c.data.wxLoading, true);
  release({ loggedIn: true, phoneMasked: '138****8000', token: 't' }); await tick();
  assert.equal(c.data.wxLoading, false); assert.equal(state.get().session.loggedIn, true); assert.ok(toasts.includes('登录成功')); assert.ok(c.events.some((e) => e.name === 'success') && c.events.some((e) => e.name === 'close'));
  Object.assign(api, keep);
});
test('协议页：合同原文逐字取自冻结稿；告知书与使用协议有正文，注册协议与私人定制协议为「暂未上线」', () => {
  const mine = R('pkg-trade/agreement/contract-text');
  const ref = path.join(__dirname, '../../2026-11-18_W28_Design_Closeout_Dev_Handoff/design/model/mk-contract-text.json');
  if (fs.existsSync(ref)) { const j = JSON.parse(fs.readFileSync(ref, 'utf8')); for (const k of Object.keys(j.docs)) { assert.deepEqual(mine.docs[k].sections, j.docs[k].sections, k); assert.equal(mine.docs[k].title, j.docs[k].title); } }
  assert.deepEqual(Object.keys(mine.docs), ['notice', 'usage', 'register', 'custom']);
  for (const k of Object.keys(mine.docs)) assert.equal(T.doc[k].title, mine.docs[k].title, '界面上的协议名与合同原名一致');
  let pg = env.newPage('pkg-trade/agreement/index', { doc: 'usage', anchor: 'att2' });
  assert.equal(pg.data.title, '迷你考拉自助式设备设施使用协议'); assert.equal(pg.data.sections.length, 13); assert.equal(pg.data.pending, false); assert.ok(pg.data.toc.some((t) => t.id === 'att2')); assert.equal(pg.data.version, '', '版本号未提供时不显示');
  pg = env.newPage('pkg-trade/agreement/index', { doc: 'notice' }); assert.equal(pg.data.sections[0].paras.length, 34); assert.equal(pg.data.toc.length, 0);
  for (const d of ['register', 'custom', 'privacy']) { pg = env.newPage('pkg-trade/agreement/index', { doc: d }); assert.equal(pg.data.pending, true, d); }
  assert.ok(fs.statSync(path.join(root, 'pkg-trade/agreement/contract-text.js')).size > 90000, '协议文本在分包内');
});
test('界面文字：不写违约金比例、倍数（D-113）；不出现占位字样', () => {
  const s = JSON.stringify(T);
  assert.ok(!/违约金|\d+\s*%|％|\d倍|1\.2 ?倍/.test(s)); assert.ok(!/待业务提供|待财务确认|演示占位|示例/.test(s));
  for (const f of ['pkg-trade/confirm/index.wxml', 'pkg-trade/quick/index.wxml', 'pkg-trade/order/index.wxml', 'pkg-trade/agreement/index.wxml', 'pages/orders/index.wxml', 'components/mk-login-sheet/index.wxml', 'components/mk-order-card/index.wxml', 'components/mk-fee-detail/index.wxml', 'components/mk-task-card/index.wxml']) {
    const x = fs.readFileSync(path.join(root, f), 'utf8').replace(/aria-label="[^"]*"/g, '').replace(/\{\{.*?\}\}/g, '');
    assert.ok(!/[\u4e00-\u9fa5]/.test(x), f + ' 的 WXML 里不写死中文');
  }
});
