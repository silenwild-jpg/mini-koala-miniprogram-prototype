// REVIEW-02 回归评审修复｜交易域（确认订单、快速下单、协议页）。编号见 /tmp/rv2/out/B_trade.md 的 B2-xx 与 E_lead_sys.md 的 E2-xx。
// 在假的 wx 环境里跑，验证的是代码逻辑与模板结构，不是微信真实渲染。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), api = R('services/api'), order = R('core/order');
const { db } = R('services/mock-ext/_db');
const view = R('services/order-view'), TT = R('i18n/trade');
env.loadApp();
const S = order.STAGE, H = 3600e3;
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 15));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
function fresh() {
  state.reset(); env.nav.length = 0; env.mode = 'ok';
  db.orders.length = 0; db.seq = 0; db.seeded = true; db.kv = {}; db.sms = {};
  state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
}
const ID = { name: '张明', id_no: '110101199001010012' };
const U3 = 'SIM_BJ01_U03';
const confirm = async (q) => { const pg = env.newPage('pkg-trade/confirm/index', q); await tick(30); return pg; };

test('B2-04：变价后点「查看其他方案」再返回，页面是新报价，不再留着旧价可提交', async () => {
  fresh(); await api.verifyIdentity(ID);
  const pg = await confirm({ unit: U3, term: '6', demo: 'price_changed' });
  assert.equal(pg.data.bar.amount, '¥2,010');
  pg.onAgree(); pg.onSign(); pg.onSignConfirm(); await tick(30);
  assert.ok(pg.data.price, '下单时变价：出确认层');
  const n = env.nav.length;
  pg.onPriceOther(); await tick(30);
  assert.equal(pg.data.price, null); assert.match(env.nav[env.nav.length - 1].url, /pages\/store\/detail\?id=SIM_BJ01/); assert.equal(env.nav.length, n + 1);
  pg.onHide(); pg.onShow(); await tick(30); // 从门店详情返回
  assert.equal(pg.data.cardOrder.quote.payable, 2206, '返回后费用明细按新价');
  assert.equal(pg.data.bar.amount, '¥2,206', '底栏按新价');
  pg.onSign();
  assert.equal(pg.data.signRows[pg.data.signRows.length - 1].v, '¥2,206', '签署弹层按新价');
  pg.onSignConfirm(); await tick(30);
  assert.equal(pg.data.price, null, '按新价提交不再弹第二次变价确认');
  assert.equal(db.orders.filter((o) => o.stage === S.PENDING && o.quote.payable === 2206).length, 1);
  pg.onUnload();
});

test('B2-01 / B2-05 / B2-06 / B2-17：变价原因写「月基价」；支付未成功标签用全站阶段色；已超时一个说法；倒计时写「支付剩余」', async () => {
  fresh(); await api.verifyIdentity(ID);
  let pg = await confirm({ unit: U3, term: '6', demo: 'price_changed' });
  pg.onAgree(); pg.onSign(); pg.onSignConfirm(); await tick(30);
  assert.equal(pg.data.price.reason, '该仓位月基价由 ¥400 调整为 ¥440'); assert.equal(pg.data.price.rows[1].k, '月租'); pg.onUnload();
  // 支付未成功：色调与订单列表、任务卡同一来源
  fresh(); await api.verifyIdentity(ID);
  pg = await confirm({ unit: U3, term: '6', demo: 'pay_fail' });
  pg.onAgree(); pg.onSign(); pg.onSignConfirm(); await tick(30); pg.onPayConfirm(); await tick(60);
  assert.equal(pg.data.phase, 'payment_failed'); assert.equal(pg.data.head.tag, '支付未成功');
  assert.equal(pg.data.head.tone, view.stageLabel(pg.data.cardOrder, Date.now()).tone); assert.equal(pg.data.head.tone, 'warn');
  assert.match(pg.data.clock, /^0[23]:\d\d:\d\d$/); assert.equal(TT.confirm.left, TT.order.payLeft);
  pg.onUnload();
  // 已超时：标签、合计行与订单详情同一个词
  assert.equal(TT.confirm.expiredTag, TT.stage.expired); assert.equal(TT.fee.originExpired, '原订单金额（已超时）');
  assert.ok(!/已失效/.test(JSON.stringify([TT.confirm, TT.fee, TT.order, TT.card])));
  const w = read('pkg-trade/confirm/index.wxml'), css = read('pkg-trade/confirm/index.wxss');
  assert.match(w, /class="cf-subitem mk-num cf-clock">\{\{T\.left\}\}\{\{clock\}\}</, '倒计时整句一个颜色');
  // E2-09：状态标签用全站 mk-tag，不再自带 cf-tag
  assert.ok(!/cf-tag/.test(w)); assert.ok(!/\.cf-tag/.test(css)); assert.match(w, /class="mk-tag mk-tag--\{\{head\.tone\}\} mk-tag--end">\{\{head\.tag\}\}/);
});

test('B2-02 / B2-08：没有任何券时券行不出「选择」入口；有券时入口文字不带「›」、箭头是图标', async () => {
  fresh(); await api.verifyIdentity(ID);
  let pg = await confirm({ unit: U3, term: '6' });
  assert.equal(pg.data.couponEditable, false); assert.equal(pg.data.couponRows.length, 2, '只有两项固定项，没有券');
  pg.onCoupon(); assert.equal(pg.data.sheet, '', '没有券时点券行不开弹层');
  let f = view.fees(pg.data.cardOrder, Date.now(), { editable: pg.data.couponEditable, showCoupon: true });
  assert.deepEqual([f.rows.find((r) => r.id === 'coupon').link, f.rows.find((r) => r.id === 'coupon').amt], ['', '暂无适用优惠']); pg.onUnload();
  fresh(); await api.verifyIdentity(ID);
  pg = await confirm({ unit: U3, term: '12', demo: 'coupon' });
  assert.equal(pg.data.couponEditable, true); assert.ok(pg.data.couponRows.length > 2);
  pg.onCoupon(); assert.equal(pg.data.sheet, 'coupon'); pg.onSheetClose();
  f = view.fees(pg.data.cardOrder, Date.now(), { editable: true, showCoupon: true });
  assert.match(f.rows.find((r) => r.id === 'coupon').link, /^(选择|更换)$/); pg.onUnload();
  assert.ok(!/›/.test(TT.fee.couponPick + TT.fee.couponSwap));
  assert.match(read('components/mk-fee-detail/index.wxml'), /\{\{item\.link\}\}<image class="mk-icon fd-chev" src="\/assets\/icons\/chev-brand\.svg" \/>/);
});

test('B2-09：未实名时原因句只在下单人卡出现一次，底栏主按钮照常打开实名弹层', async () => {
  fresh();
  const pg = await confirm({ unit: U3, term: '6' });
  assert.equal(pg.data.idv.verified, false);
  assert.deepEqual([pg.data.bar.btn, pg.data.bar.action, pg.data.bar.hint, pg.data.bar.disabled], ['实名认证', 'idv', '', false]);
  const w = read('pkg-trade/confirm/index.wxml');
  assert.match(w, /wx:if="\{\{!idv\.verified && !locked\}\}" class="cf-ptip">/, '卡内提示仍在');
  pg.onBar(); assert.equal(pg.data.sheet, 'idv', '底栏主按钮仍打开实名弹层'); pg.onUnload();
});

test('B2-13 / B2-16：协议正文不在任意字符处折行；快速下单日期卡下的算式带「月租」', async () => {
  const css = read('pkg-trade/agreement/index.wxss');
  assert.ok(!/break-all/.test(css)); assert.match(css, /\.ag-p \{[^}]*overflow-wrap: break-word/);
  fresh();
  const pg = env.newPage('pkg-trade/quick/index', { store: 'SIM_BJ01', unit: U3, term: '6' }); await tick(40);
  assert.ok(pg.data.est, '选齐后有预计费用'); assert.match(pg.data.est.sub, /^月租 ¥[\d,]+\/月 × \d+个月$/);
  pg.onUnload();
});
