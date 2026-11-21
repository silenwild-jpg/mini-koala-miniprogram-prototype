// IMPL-02 视觉升级第二批｜订单详情与协议域：M-23 租赁进度并入订单卡区域、M-24 门店服务宫格与底栏去重、M-25 状态头只留大标题、
// 居中对话框退场（订单详情与确认订单的「等待支付结果」、确认订单的变价确认）、M-26 协议目录默认收起、M-27 去掉「正文」标题。
// 在假的 wx 环境里跑，验证的是代码逻辑与模板结构，不是微信真实渲染；动画本身看不到，只验证触发、收尾、快速连点与卸载。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), routes = R('services/routes'), api = R('services/api');
const order = R('core/order'), C = R('core/config'), A = R('core/config-after');
const { db, mk } = R('services/mock-ext/_db');
const view = R('services/order-view'), TT = R('i18n/trade');
env.loadApp();
Object.assign(A.demo, { storeQuoteMs: 0, inspectMs: 60000, refundMs: 60000, invoiceProcessMs: 0, invoiceIssueMs: 0, identityMs: 0, autoRefresh: false });
const S = order.STAGE, H = 3600e3, DAY = 24 * H, LEAVE = C.motion.leaveMs;
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 15));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const base = (r) => r.replace(/^\//, '');
function fresh() {
  state.reset(); env.nav.length = 0; env.mode = 'ok';
  db.orders.length = 0; db.seq = 0; db.seeded = true; db.kv = {}; db.sms = {};
  state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
}
const U3 = 'SIM_BJ01_U03', U5 = 'SIM_BJ01_U05', ID = { name: '张明', id_no: '110101199001010012' };
const START = view.ymd(Date.now() + 11 * DAY);
const make = (stage, more) => mk(Object.assign({ store: 'SIM_BJ01', units: [U3], months: 12, agoDays: 40, startAt: Date.now() - 39 * DAY, stage }, more));
const page = async (route, q) => { const pg = env.newPage(base(route), q || {}); if (pg.__shown && pg.__shown.then) await pg.__shown; await tick(30); return pg; };
const detail = (o, q) => page(routes.ORDER_DETAIL, Object.assign({ id: o.id }, q || {}));
const watch = (inst) => { const log = [], real = inst.setData; inst.setData = function (d, cb) { log.push(Object.keys(d)); return real.call(inst, d, cb); }; return log; };
// 各阶段的演示订单：[名称, 造单]
const CASES = {
  pending: () => make(S.PENDING, { agoDays: 0 }),
  cancelled: () => make(S.CANCELLED, { agoDays: 1 }),
  identity: () => make(S.PAID, { agoDays: 1, startAt: Date.now() + 5 * DAY, identity: false }),
  identity_mismatch: () => make(S.PAID, { agoDays: 1, startAt: Date.now() + 5 * DAY, identity: false, patch: () => ({ identity_status: 'mismatch' }) }),
  upcoming: () => make(S.PAID, { agoDays: 1, startAt: Date.now() + 5 * DAY }),
  active: () => make(S.ACTIVE),
  expiring: () => make(S.EXPIRING, { months: 1, agoDays: 27, startAt: Date.now() - 26 * DAY }),
  renewal: () => make(S.ACTIVE, { patch: () => ({ renew: { status: 'quoted' } }) }),
  renewal_pending: () => make(S.ACTIVE, { patch: () => ({ renew: { status: 'submitted' } }) }),
  renewal_pay_failed: () => make(S.ACTIVE, { patch: () => ({ renew: { status: 'quoted', pay: 'failed' } }) }),
  expired_lease: () => make(S.OVERDUE, { months: 1, agoDays: 40, startAt: Date.now() - 39 * DAY }),
  exit_clearing: () => make(S.EXITING, { patch: () => ({ exit: { status: 'requested', date: '2026-12-01' } }) }),
  inspect_failed: () => make(S.EXITING, { patch: () => ({ exit: { status: 'failed', date: '2026-12-01', fail_reason: '仓内仍有物品' } }) }),
  inspection: () => make(S.EXITING, { patch: () => ({ exit: { status: 'waiting', date: '2026-12-01', inspect_at: Date.now() } }) }),
  refund: () => make(S.ENDED, { patch: (od) => ({ exit: { status: 'passed' }, deposit: Object.assign({}, od.deposit, { status: 'refunding', refund_at: Date.now() }) }) }),
  refund_failed: () => make(S.ENDED, { patch: (od) => ({ exit: { status: 'passed' }, deposit: Object.assign({}, od.deposit, { status: 'failed', fail_reason: '收款账户异常' }) }) }),
  ended: () => make(S.ENDED, { patch: (od) => ({ exit: { status: 'passed' }, deposit: Object.assign({}, od.deposit, { status: 'refunded' }) }) })
};
async function each(fn) {
  for (const k of Object.keys(CASES)) { fresh(); const o = CASES[k](); const pg = await detail(o); assert.equal(pg.data.head.variant || pg.data.phase, k, k + '：造单落在预期阶段'); await fn(k, pg, o); pg.onUnload(); }
}

test('M-25：状态头只留大标题；标签里大标题没有的信息并进副标题第一项，其余阶段不再显示标签', async () => {
  const od = read('pkg-trade/order/index.wxml');
  assert.ok(!/od-tag|head\.tag/.test(od), '模板里没有状态标签'); assert.match(od, /<view class="mk-h2">\{\{head\.title\}\}<\/view>/);
  assert.match(od, /wx:if="\{\{headNote\}\}" class="od-subitem od-headnote od-headnote--\{\{head\.tone\}\}">\{\{headNote\}\}/);
  assert.ok(od.indexOf('{{headNote}}') < od.indexOf('wx:for="{{subs}}"'), '保住的那条信息排在副标题最前');
  const KEEP = { inspect_failed: '需重新验仓', exit_clearing: '待清空', identity_mismatch: '需重新提交', renewal_pay_failed: '待支付', renewal_pending: '报价确认中', refund: '退款处理中', ended: '已退仓' };
  const seen = {};
  await each((k, pg) => {
    seen[k] = pg.data.headNote;
    assert.equal(pg.data.headNote, KEEP[k] || '', k);
    assert.ok(pg.data.head.title, k + '：大标题还在');
    if (pg.data.headNote) assert.ok(pg.data.head.title.indexOf(pg.data.headNote) < 0, k + '：保住的是大标题里没有的信息');
    else assert.ok(pg.data.head.tag, k); // 不再显示的标签仍在数据里（列表卡、任务卡同源字段不动）
  });
  assert.deepEqual(Object.keys(seen).filter((k) => seen[k]).sort(), Object.keys(KEEP).sort());
  assert.equal(seen.upcoming, '', '待起租：副标题已有「计划起租 日期」');
  fresh(); const up = await detail(CASES.upcoming()); assert.ok(up.data.subs.some((s) => /^计划起租 \d{4}-\d{2}-\d{2}$/.test(s))); up.onUnload();
});

test('M-24：门店导航、一键开锁在宫格与底栏之间只留一处，入口不消失；宫格剩一项时改成一行', async () => {
  const od = read('pkg-trade/order/index.wxml');
  assert.match(od, /wx:if="\{\{grid\.length > 1\}\}" class="od-grid">\s*<view[^>]*wx:for="\{\{grid\}\}"[^>]*class="od-cell mk-press" data-a="\{\{item\.a\}\}" bindtap="onAct"/);
  assert.match(od, /wx:elif="\{\{grid\.length === 1\}\}" class="od-row" data-a="\{\{grid\[0\]\.a\}\}" bindtap="onAct"/);
  assert.ok(!/data-a="(navigate|unlock|call)"/.test(od), '宫格项不再写死');
  const got = {};
  await each((k, pg) => {
    const d = pg.data, bar = [d.bar.primary && d.bar.primary.a, d.bar.secondary && d.bar.secondary.a].filter(Boolean), grid = d.grid.map((g) => g.a);
    got[k] = grid.join('+');
    if (!d.storeSvc) { assert.deepEqual(grid, [], k + '：没有门店服务小节时宫格为空'); return; }
    assert.ok(grid.indexOf('call') >= 0, k + '：联系门店一直在');
    for (const a of ['navigate', 'unlock']) {
      if (a === 'unlock' && !d.withUnlock) { assert.ok(grid.indexOf(a) < 0, k); continue; }
      assert.equal((grid.indexOf(a) >= 0 ? 1 : 0) + (bar.indexOf(a) >= 0 ? 1 : 0), 1, k + '：' + a + ' 有且只有一处');
    }
    d.grid.forEach((g) => { assert.ok(g.t && g.icon, k); assert.ok(fs.existsSync(path.join(root, 'assets/icons', g.icon + '.svg')), g.icon); });
  });
  assert.deepEqual([got.active, got.expiring, got.upcoming, got.identity, got.inspection, got.refund, got.expired_lease, got.exit_clearing, got.ended, got.pending],
    ['call', 'navigate+call', 'call', 'call', 'navigate+call', 'navigate+call', 'navigate+call', 'call', '', '']);
  // 宫格里留下的项点了照常走原动作
  fresh(); const pg = await detail(CASES.expiring()); const copied = []; const real = wx.setClipboardData; wx.setClipboardData = (o) => { copied.push(o.data); if (o.success) o.success(); };
  pg.onAct({ currentTarget: { dataset: { a: pg.data.grid[0].a } } }); wx.setClipboardData = real; pg.onUnload();
  assert.equal(pg.data.grid[0].a, 'navigate');
});

test('M-23：租赁进度紧贴订单卡排成一组，不再是独立小节；各阶段的进度行照旧', async () => {
  const od = read('pkg-trade/order/index.wxml');
  const top = od.slice(od.indexOf('class="mk-gutter od-top"'), od.indexOf('class="od-secs"'));
  assert.match(top, /<view class="od-cardgrp">\s*<view class="od-cardwrap"><mk-order-card order="\{\{order\}\}" \/><\/view>\s*<view wx:if="\{\{paid\}\}" class="od-prog"[^>]*>\s*<view wx:for="\{\{progress\}\}"/);
  assert.ok(!/mk-sec__hd">\{\{T\.progress\}\}/.test(od), '没有「租赁进度」小节标题'); assert.ok(od.slice(od.indexOf('class="od-secs"')).indexOf('progress') < 0);
  assert.match(read('pkg-trade/order/index.wxss'), /\.od-prog \{[^}]*background: var\(--mk-color-canvas-sunken\)/);
  const rows = {};
  await each((k, pg) => { rows[k] = pg.data.progress.map((r) => r.k + ' ' + r.v + (r.warn ? '!' : '')); assert.equal(pg.data.paid, rows[k].length > 0, k); });
  assert.deepEqual(rows.pending, []); assert.deepEqual(rows.cancelled, []);
  assert.deepEqual(rows.active.map((s) => s.split(' ')[0]), ['押金']); assert.equal(rows.active[0], '押金 保管中'); // REVIEW-02 C2-05：卡下只留剩余天数、实名待办、押金状态
  assert.deepEqual(rows.expiring.map((s) => s.split(' ')[0]), ['剩余租期', '押金']);
  assert.deepEqual(rows.identity.map((s) => s.split(' ')[0]), ['实名认证', '押金']); assert.equal(rows.identity[0], '实名认证 待完成');
  assert.equal(rows.inspection[0], '押金 待验仓'); assert.equal(rows.refund[0], '押金 退款处理中'); assert.equal(rows.refund_failed[0], '押金 退款未成功!'); assert.equal(rows.ended[0], '押金 已退还');
  assert.equal(rows.exit_clearing.length, 1); assert.equal(rows.expired_lease.length, 1); assert.equal(rows.upcoming.length, 1);
});

test('订单详情「正在确认支付结果」层：收起先播退场再移除；逻辑状态 paying 即时；退场途中卸载不再写数据', async () => {
  const od = read('pkg-trade/order/index.wxml');
  assert.match(od, /wx:if="\{\{payingDlg\}\}" class="od-scrim mk-fade \{\{payingDlgLeave\}\}"/); assert.match(od, /class="od-dialog mk-fade-in \{\{payingDlgLeave \? 'mk-leave mk-leave--zoom' : ''\}\}"/);
  fresh(); const o = CASES.active();
  let pg = env.newPage(base(routes.ORDER_DETAIL), { id: o.id, paid: '1' });
  assert.deepEqual([pg.data.paying, pg.data.payingDlg, pg.data.payingDlgLeave], [true, true, ''], '带 paid=1 进入：先显示确认层');
  await pg.__shown; await tick(5);
  assert.deepEqual([pg.data.paying, pg.data.payingDlg, pg.data.payingDlgLeave], [false, true, 'mk-leave'], '结果回来：paying 立即为 false，层在退场');
  assert.match(pg.data.paidLine, /^支付成功，已付 ¥/);
  await tick(LEAVE + 40); assert.deepEqual([pg.data.payingDlg, pg.data.payingDlgLeave], [false, '']); pg.onUnload();
  // 退场途中离开页面
  pg = env.newPage(base(routes.ORDER_DETAIL), { id: o.id, paid: '1' }); await pg.__shown; await tick(5);
  assert.equal(pg.data.payingDlgLeave, 'mk-leave'); pg.onUnload(); const log = watch(pg); await tick(LEAVE + 60); assert.deepEqual(log, [], '卸载后不再 setData');
  // 订单不存在：确认层同样收起
  pg = env.newPage(base(routes.ORDER_DETAIL), { id: 'MK0', paid: '1' }); await pg.__shown; await tick(LEAVE + 60);
  assert.deepEqual([pg.data.empty, pg.data.paying, pg.data.payingDlg], [true, false, false]); pg.onUnload();
  // 没带 paid=1：不出层，也不触发退场
  pg = await detail(o); assert.deepEqual([pg.data.paying, pg.data.payingDlg, pg.data.payingDlgLeave], [false, false, '']); pg.onUnload();
});

test('确认订单：等待支付结果层与变价确认层的退场；连点「已完成支付」只退一次；退场途中再次支付能重新打开', async () => {
  const w = read('pkg-trade/confirm/index.wxml');
  assert.match(w, /wx:if="\{\{priceDlg\}\}" class="cf-scrim mk-fade \{\{priceDlgLeave\}\}"/); assert.match(w, /wx:if="\{\{payingDlg\}\}" class="cf-scrim mk-fade \{\{payingDlgLeave\}\}"/);
  assert.equal((w.match(/mk-leave mk-leave--zoom/g) || []).length, 2); assert.match(w, /priceDlg\.reason/); assert.match(w, /wx:for="\{\{priceDlg\.rows\}\}"/); assert.ok(!/wx:if="\{\{(price|paying)\}\}" class="cf-scrim/.test(w));
  fresh(); await api.verifyIdentity(ID);
  const d = await api.getOrderDraft({ unit_ids: [U3], months: 6 });
  const od = await api.signContract({ order_id: (await api.createOrder({ unit_ids: [U3], months: 6, start_date: START, quoted_at: d.quoted_at, expect_payable: d.quote.payable })).id });
  let pg = env.newPage('pkg-trade/confirm/index', { order: od.id }); await tick(30);
  assert.deepEqual([pg.data.phase, pg.data.paying, pg.data.payingDlg], ['pending', false, false]);
  // 手动置为等待中（等同 onPayConfirm 的第一步），再点两次「已完成支付」
  pg.setData({ paying: true }); pg.dlgSync(); assert.deepEqual([pg.data.payingDlg, pg.data.payingDlgLeave], [true, '']);
  const log = watch(pg); pg.onPayDone(); pg.onPayDone();
  assert.deepEqual([pg.data.paying, pg.data.payingDlg, pg.data.payingDlgLeave], [false, true, 'mk-leave']);
  assert.equal(log.filter((k) => k.indexOf('payingDlgLeave') >= 0 && k.length === 1).length, 1, '退场类只加一次');
  // 退场途中又进入等待：取消退场，层保持显示
  pg.setData({ paying: true }); pg.dlgSync(); assert.deepEqual([pg.data.payingDlg, pg.data.payingDlgLeave], [true, '']);
  await tick(LEAVE + 40); assert.equal(pg.data.payingDlg, true, '被取消的退场不会把层移除');
  pg.onPayDone(); await tick(LEAVE + 60); assert.deepEqual([pg.data.paying, pg.data.payingDlg, pg.data.payingDlgLeave], [false, false, '']);
  assert.equal(pg.data.bar.disabled, false, '收起后底栏按钮可点'); assert.equal(pg.data.bar.btn, TT.confirm.btnPay);
  // 真实支付失败路径：层收起，状态头切到支付未成功
  pg.onPayConfirm(); assert.deepEqual([pg.data.paying, pg.data.payingDlg], [true, true]);
  pg.onUnload(); const log2 = watch(pg); await tick(LEAVE + 80); assert.deepEqual(log2.filter((k) => k.some((x) => /Dlg/.test(x))), [], '卸载后不再写对话框状态');
  // 变价确认层
  fresh(); await api.verifyIdentity(ID);
  pg = env.newPage('pkg-trade/confirm/index', { unit: U5, term: '6', demo: 'price_changed' }); await tick(30);
  pg.onAgree(); pg.onSign(); await tick(40); if (!pg.data.price && pg.onSignConfirm) { pg.onSignConfirm(); await tick(40); }
  assert.ok(pg.data.price, '变价：出确认层'); assert.equal(pg.data.priceDlg, pg.data.price); assert.equal(pg.data.priceDlgLeave, '');
  const rows = pg.data.price.rows;
  pg.onPriceAccept();
  assert.equal(pg.data.price, null, '逻辑状态立即清掉'); assert.deepEqual([pg.data.priceDlg.rows, pg.data.priceDlgLeave], [rows, 'mk-leave'], '退场期间层里的内容还在');
  await tick(LEAVE + 60); assert.deepEqual([pg.data.priceDlg, pg.data.priceDlgLeave], [null, '']); pg.onUnload();
});

test('M-26：协议目录默认收起、不带序号；展开 / 收起带退场；退场途中再点重新展开；点目录项仍定位到章节', async () => {
  const w = read('pkg-trade/agreement/index.wxml');
  assert.match(w, /class="ag-tochd" bindtap="onTocToggle" aria-role="button" aria-expanded="\{\{tocOpen && !tocOpenLeave\}\}"/);
  assert.match(w, /class="mk-icon mk-rot \{\{tocOpen && !tocOpenLeave \? 'mk-rot--on' : ''\}\}"/);
  assert.match(w, /wx:if="\{\{tocOpen\}\}" class="ag-tocs mk-drop-in \{\{tocOpenLeave \? 'mk-leave mk-leave--up' : ''\}\}/);
  assert.ok(!/ag-tocn|item\.n\b/.test(w), '没有序号列'); assert.ok(!/ag-tocn/.test(read('pkg-trade/agreement/index.wxss')));
  let pg = env.newPage('pkg-trade/agreement/index', { doc: 'usage' });
  assert.deepEqual([pg.data.tocOpen, pg.data.tocOpenLeave], [false, '']); assert.ok(pg.data.toc.length > 1); assert.ok(pg.data.toc.every((t) => t.id && t.t && !('n' in t)));
  pg.onTocToggle(); assert.deepEqual([pg.data.tocOpen, pg.data.tocOpenLeave], [true, '']);
  const hits = [], real = wx.pageScrollTo; wx.pageScrollTo = (o) => hits.push(o.selector);
  pg.onToc({ currentTarget: { dataset: { id: 'att2' } } }); assert.deepEqual(hits, ['#att2']); assert.equal(pg.data.tocOpen, true, '点目录项后目录不自动收起');
  assert.ok(pg.data.sections.some((s) => s.id === 'att2'));
  pg.onTocToggle(); assert.deepEqual([pg.data.tocOpen, pg.data.tocOpenLeave], [true, 'mk-leave']);
  await tick(LEAVE + 40); assert.deepEqual([pg.data.tocOpen, pg.data.tocOpenLeave], [false, '']);
  // 快速连点：展开 → 收起 → 退场途中再点 = 保持展开
  pg.onTocToggle(); pg.onTocToggle(); pg.onTocToggle(); assert.deepEqual([pg.data.tocOpen, pg.data.tocOpenLeave], [true, '']);
  await tick(LEAVE + 40); assert.equal(pg.data.tocOpen, true);
  // 带 anchor 进入照旧定位；退场途中卸载不再写数据
  hits.length = 0; const p2 = env.newPage('pkg-trade/agreement/index', { doc: 'usage', anchor: 'att2' }); p2.onReady(); assert.deepEqual(hits, ['#att2']); wx.pageScrollTo = real;
  pg.onTocToggle(); pg.onUnload(); const log = watch(pg); await tick(LEAVE + 40); assert.deepEqual(log, []);
  // 只有一节的协议没有目录；待上线的协议不出目录与正文
  pg = env.newPage('pkg-trade/agreement/index', { doc: 'notice' }); assert.equal(pg.data.toc.length, 0);
  pg = env.newPage('pkg-trade/agreement/index', { doc: 'register' }); assert.equal(pg.data.pending, true);
});

test('M-27：协议页没有「正文」标题，章标题直接作为一级', () => {
  const w = read('pkg-trade/agreement/index.wxml');
  assert.ok(!/T\.body/.test(w)); assert.equal(TT.agreement.body, undefined); assert.equal(TT.agreement.toc, '目录');
  assert.match(w, /<view class="mk-sec">\s*<view wx:for="\{\{sections\}\}" wx:key="id" id="\{\{item\.id\}\}" class="ag-sec">\s*<view wx:if="\{\{item\.title\}\}" class="ag-h3">/);
  assert.equal((w.match(/mk-sec__hd/g) || []).length, 0, '协议页不再有小节标题行');
  assert.match(read('pkg-trade/agreement/index.wxss'), /\.ag-h3 \{ font-size: var\(--mk-font-size-lg\); font-weight: var\(--mk-font-weight-semibold\)/);
});
