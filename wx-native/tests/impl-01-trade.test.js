// IMPL-01 视觉升级批｜交易、订单与租后域：信息行拆分后的数据字段、确认订单与快速下单的模块调整（M-15 / M-16 / M-18 / M-21 / M-22）、
// 去卡片化后的结构、动效状态（数值回弹、状态切换淡入）在快速连点与页面卸载时的正确性。
// 在假的 wx 环境里跑，验证的是代码逻辑与模板结构，不是微信真实渲染；动画本身看不到，只验证触发与收尾。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), routes = R('services/routes'), api = R('services/api');
const order = R('core/order'), A = R('core/config-after'), motion = R('core/motion');
const { db, mk } = R('services/mock-ext/_db');
const view = R('services/order-view'), TT = R('i18n/trade'), TA = R('i18n/after');
env.loadApp();
Object.assign(A.demo, { storeQuoteMs: 0, inspectMs: 0, refundMs: 300, invoiceProcessMs: 0, invoiceIssueMs: 0, identityMs: 0, autoRefresh: false });
const S = order.STAGE, H = 3600e3, DAY = 24 * H;
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 15));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const base = (r) => r.replace(/^\//, '');
const login = () => state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
function fresh(loggedIn) {
  state.reset(); env.nav.length = 0; env.mode = 'ok';
  db.orders.length = 0; db.seq = 0; db.seeded = true; db.kv = {}; db.sms = {};
  if (loggedIn !== false) login();
}
const U3 = 'SIM_BJ01_U03', ID = { name: '张明', id_no: '110101199001010012' };
const START = view.ymd(Date.now() + 11 * DAY);
const active = (more) => mk(Object.assign({ store: 'SIM_BJ01', units: [U3], months: 12, agoDays: 40, startAt: Date.now() - 39 * DAY, stage: S.ACTIVE }, more));
const page = async (route, q) => { const pg = env.newPage(base(route), q || {}); if (pg.__shown && pg.__shown.then) await pg.__shown; await tick(30); return pg; };
// 记录卸载之后还有没有 setData（动效的延时回调不该再写数据）
const watch = (inst) => { const log = [], real = inst.setData; inst.setData = function (d, cb) { log.push(Object.keys(d)); return real.call(inst, d, cb); }; return log; };

test('订单卡：仓位编号是标签字段、容量单列、租期与起止日分开；详情形态不再放门店图与仓位图（M-18）', async () => {
  fresh();
  const o = active(), c = view.card(o, Date.now(), { showKm: true });
  assert.deepEqual([c.storeName, c.unitCodes, c.unitVol, c.termText, c.kmText], ['安贞·富仁名苑店', ['A003'], '3.5m³', '12个月', '1.2km']);
  assert.equal(c.spanText, view.ymd(o.lease.start) + ' 至 ' + view.ymd(o.lease.end)); assert.ok(!/·/.test(c.spanText + c.termText + c.payableText));
  const wxml = read('components/mk-order-card/index.wxml'), parts = wxml.split('<block wx:else>');
  assert.equal(parts.length, 2); const list = parts[0], detail = parts[1];
  assert.ok(!/<image[^>]*(storePhoto|unitThumb)/.test(detail), '详情形态没有门店图 / 仓位图');
  for (const part of [list, detail]) assert.match(part, /class="mk-unitno oc-no">\{\{item\}\}<\/text>\s*<text[^>]*>\{\{v\.(comboTag|unitSub)\}\}<\/text><text wx:else class="mk-num oc-vol[^"]*">\{\{v\.unitVol\}\}/, '编号标签与容量同一行');
  assert.match(list, /class="mk-num oc-amt">\{\{v\.payableText\}\}/); assert.ok(!/lineText/.test(wxml), '不再用「仓位 · 租期」拼串');
  assert.match(read('app.wxss'), /\.mk-unitno \{/);
  // 未付款订单只写起租日；待支付不写止日
  const pend = active({ stage: S.PENDING }); assert.match(view.card(pend, Date.now()).spanText, /^起租日 \d{4}-\d\d-\d\d$/);
});

test('费用明细：no-total 不出合计行（M-15）；合计金额变了才回弹，首次渲染与组件卸载后不动；说明拆成算式列与下一行', async () => {
  fresh(); await api.verifyIdentity(ID);
  const d6 = await api.getOrderDraft({ unit_ids: [U3], months: 6 }), d12 = await api.getOrderDraft({ unit_ids: [U3], months: 12 });
  const c = env.newComponent('components/mk-fee-detail/index', { order: { months: 6, quote: d6.quote }, noTotal: true });
  assert.equal(c.data.totalBump, '', '首次渲染不回弹'); assert.equal(c.data.total.amt, '¥2,010');
  assert.deepEqual([c.data.rows[0].mid, c.data.rows[0].below], ['¥280/月 × 6个月', ''], '算式已含月数，不再单列月数');
  assert.match(read('components/mk-fee-detail/index.wxml'), /wx:if="\{\{!noTotal\}\}" class="fd-total/);
  assert.match(read('pkg-trade/confirm/index.wxml'), /<mk-fee-detail order="\{\{cardOrder\}\}"[^>]*no-total="\{\{true\}\}"[^>]*bind:coupon/);
  c.setData({ order: { months: 12, quote: d12.quote } }); c.render(); c.setData({ order: { months: 6, quote: d6.quote } }); c.render(); // 快速连改两次
  await tick(40); assert.equal(c.data.totalBump, 'mk-bump'); assert.equal(c.data.total.amt, '¥2,010');
  c.setData({ order: { months: 12, quote: d12.quote } }); c.render(); const log = watch(c); c.__detach(); await tick(40);
  assert.deepEqual(log, [], '卸载后延时回调不再 setData'); assert.equal(c.data.totalBump, '');
  // 免费运输：权益与安排方式两行；用券：券名与券后金额两行
  const f = view.fees({ months: 12, quote: Object.assign({}, d12.quote, { coupon_discount: 300, rent_after_discount: 2820 }), free_transport: true }, Date.now(), { couponName: '12个月长租券' });
  const cp = f.rows.find((r) => r.id === 'coupon'), bf = f.rows.find((r) => r.id === 'benefit');
  assert.deepEqual([cp.sec, cp.extra], ['已使用 12个月长租券', '券后整期租金 ¥2,820']); assert.deepEqual([bf.amt, bf.note], ['免费运输 1 次', '顾问联系安排']);
});

test('确认订单：下单人卡（联系方式 + 实名）在费用明细之前（M-16）；保障与运输仍是两张入口卡（M-17）；底栏金额变化回弹，连改与卸载状态正确', async () => {
  fresh();
  const wxml = read('pkg-trade/confirm/index.wxml');
  const iPerson = wxml.indexOf('cf-person'), iFee = wxml.indexOf('<mk-fee-detail order="{{cardOrder}}" editable'), iCard = wxml.indexOf('<mk-order-card');
  assert.ok(iCard > 0 && iCard < iPerson && iPerson < iFee, '订单卡 → 下单人 → 费用明细');
  assert.match(wxml, /\{\{T\.personPhone\}\}[\s\S]*\{\{phoneText\}\}[\s\S]*\{\{T\.identity\}\}/); assert.ok(!/\{\{T\.contact\}\}|contactText/.test(wxml), '不再有单独的联系方式卡');
  assert.equal((wxml.match(/class="mk-card cf-card cf-entry mk-press"/g) || []).length, 2);
  assert.deepEqual([TT.confirm.person, TT.confirm.personPhone], ['下单人', '联系手机号']);
  const pg = env.newPage('pkg-trade/confirm/index', { unit: U3, term: '6', date: START }); await tick();
  assert.equal(pg.data.phoneText, '138****8000'); assert.equal(pg.data.idv.verified, false); assert.deepEqual([pg.data.bar.amount, pg.data.bar.saved, pg.data.amtBump], ['¥2,010', '已省 ¥720', '']);
  pg.onTerm({ detail: { months: 7 } }); pg.onTerm({ detail: { months: 12 } }); await tick(60); // 快速连改：只留最后一次的结果
  assert.equal(pg.data.cardOrder.months, 12); assert.equal(pg.data.bar.amount, '¥3,430'); assert.equal(pg.data.amtBump, 'mk-bump');
  pg.onTerm({ detail: { months: 6 } }); const log = watch(pg); pg.onUnload(); await tick(60);
  assert.ok(!log.some((k) => k.includes('amtBump')), '卸载后不再触发回弹');
});

test('确认订单：待支付 → 支付未成功，状态头淡入一次；订单详情带 paid=1 进入时结果态淡入', async () => {
  fresh(); await api.verifyIdentity(ID);
  const d = await api.getOrderDraft({ unit_ids: [U3], months: 6 });
  const od = await api.signContract({ order_id: (await api.createOrder({ unit_ids: [U3], months: 6, start_date: START, quoted_at: d.quoted_at, expect_payable: d.quote.payable })).id });
  const pg = env.newPage('pkg-trade/confirm/index', { order: od.id }); await tick(30);
  assert.deepEqual([pg.data.phase, pg.data.headFx], ['pending', '']);
  await api.payOrder({ order_id: od.id, simulate: 'fail' }); await pg.refresh(); await tick(40);
  assert.deepEqual([pg.data.phase, pg.data.headFx], ['payment_failed', 'mk-fade']); pg.onUnload();
  assert.match(read('pkg-trade/confirm/index.wxml'), /class="cf-scrim mk-fade"[\s\S]*class="cf-dialog cf-dialog--center mk-fade-in"/);
  const o = active(), dt = await page(routes.ORDER_DETAIL, { id: o.id, paid: '1' }); await tick(40);
  assert.deepEqual([dt.data.paying, dt.data.headFx], [false, 'mk-fade']); dt.onUnload();
  const plain = await page(routes.ORDER_DETAIL, { id: o.id }); await tick(40); assert.equal(plain.data.headFx, '', '普通进入不淡入'); plain.onUnload();
});

test('快速下单：门店与仓位一张卡、租期与日期一张卡（M-22）；预计费用只在底栏（M-21）；进出规则与单价算式在日期卡下方小字', async () => {
  fresh();
  const wxml = read('pkg-trade/quick/index.wxml');
  assert.equal((wxml.match(/<view class="mk-card">/g) || []).length, 2, '两张卡');
  assert.match(wxml, /\{\{T\.storeUnit\}\}[\s\S]*bindtap="onStoreSheet"[\s\S]*bindtap="onUnitSheet"[\s\S]*\{\{T\.termDate\}\}[\s\S]*<mk-term-seg[\s\S]*<picker mode="date"/);
  const iDate = wxml.indexOf('<picker mode="date"'), iNotes = wxml.indexOf('class="qk-notes"'), iBar = wxml.indexOf('mk-bottom-bar');
  assert.ok(iDate < iNotes && iNotes < iBar); assert.match(wxml.slice(iNotes, iBar), /\{\{est\.sub\}\}[\s\S]*\{\{access\}\}/);
  assert.match(wxml.slice(iBar), /\{\{barAmount\}\}[\s\S]*est\.tag[\s\S]*\{\{T\.fees\}\}/, '底栏：金额、折扣标签、费用明细入口'); assert.ok(!/est\.amount/.test(wxml.slice(0, iBar)), '正文不再有预计费用卡');
  const pg = env.newPage('pkg-trade/quick/index', { store: 'SIM_BJ01', unit: U3 }); await tick(30);
  assert.deepEqual([pg.data.store.kmText, pg.data.store.address, pg.data.unit.code, pg.data.unit.vol], ['1.2km', '北京市朝阳区富仁名苑胜古北里南28号楼', 'A003', '3.5m³']);
  assert.equal(pg.data.access, '存取时间 09:00-21:00'); assert.deepEqual([pg.data.est.amount, pg.data.est.sub, pg.data.amtBump], ['¥3,120', '¥260/月 × 12个月', '']);
  // 快速连点租期：只留最后一次的报价，金额回弹一次；费用明细层开合
  pg.onTerm({ detail: { months: 1 } }); pg.onTerm({ detail: { months: 3 } }); pg.onTerm({ detail: { months: 6 } }); await tick(60);
  assert.deepEqual([pg.data.term, pg.data.est.amount, pg.data.barAmount, pg.data.amtBump], [6, '¥1,680', '¥1,680', 'mk-bump']);
  pg.onFees(); assert.equal(pg.data.feeSheet, true); pg.onFeesClose(); assert.equal(pg.data.feeSheet, false);
  pg.onTerm({ detail: { months: 12 } }); const log = watch(pg); pg.onUnload(); await tick(60);
  assert.ok(!log.some((k) => k.includes('est') || k.includes('amtBump')), '离开后丢弃在路上的报价，不再回弹');
});

test('租期分段：选中滑块位置跟着值走，未选时隐藏；弹层里步进数字回弹，卸载后不再写数据', async () => {
  const c = env.newComponent('components/mk-term-seg/index', { value: 12 });
  assert.deepEqual([c.data.slide, c.data.count, c.data.onIndex], [true, 5, 3]);
  for (const [v, i] of [[1, 0], [3, 1], [6, 2], [18, 4], [null, -1]]) { c.setData({ value: v }); c.render(); assert.equal(c.data.onIndex, i, String(v)); }
  c.setData({ value: 'unsure', allowUnsure: true }); c.render(); assert.deepEqual([c.data.count, c.data.onIndex], [6, 5]);
  const wxml = read('components/mk-term-seg/index.wxml'), css = read('components/mk-term-seg/index.wxss');
  assert.match(wxml, /class="ts-thumb ts-thumb--n\{\{count\}\} ts-thumb--i\{\{onIndex < 0 \? 0 : onIndex\}\}/); assert.match(css, /\.ts-thumb \{[^}]*transition: transform var\(--mk-motion-base\)/);
  for (let i = 1; i <= 5; i++) assert.ok(css.includes('.ts-thumb--i' + i + ' {'));
  c.setData({ value: 12, allowUnsure: false }); c.render(); c.onOther(); assert.equal(c.data.sheet, true); assert.equal(c.data.draftBump, '');
  c.onPlus(); c.onPlus(); c.onMinus(); await tick(40); assert.deepEqual([c.data.draft, c.data.draftBump], [19, 'mk-bump mk-bump--center']);
  c.onPlus(); const log = watch(c); c.__detach(); await tick(40); assert.deepEqual(log, []);
});

test('订单列表：前几张卡错峰渐显、整卡按压；订单详情与租后各页去卡片化后用小节，不再每段包一张卡', () => {
  const ol = read('pages/orders/index.wxml');
  assert.match(ol, /hover-class="mk-press--hover"[^>]*class="mk-press ol-item \{\{index < 6 \? 'mk-fade-in mk-fade-in--d' \+ index : ''\}\}"/);
  const od = read('pkg-trade/order/index.wxml');
  assert.match(od, /class="mk-page mk-page--plain od-page"/); assert.equal((od.match(/class="mk-card/g) || []).length, 0); assert.ok((od.match(/class="mk-sec"/g) || []).length >= 4);
  for (const p of ['identity', 'access', 'econtract', 'deposit', 'renew', 'exit', 'invoice']) {
    const w = read('pkg-after/' + p + '/index.wxml');
    assert.match(w, /class="mk-page mk-page--plain /, p); assert.equal((w.match(/class="mk-card/g) || []).length, 0, p + ' 不再有描边卡'); assert.match(w, /class="af-secs/, p);
  }
  const ag = read('pkg-trade/agreement/index.wxml'); assert.equal((ag.match(/class="mk-card/g) || []).length, 0); assert.match(ag, /mk-page--plain/);
  // 键值行：多于 2 行才画行间线
  assert.match(read('components/mk-after-kv/index.wxml'), /rows\.length > 2 \? 'afk-list--lined'/); assert.match(read('components/mk-after-kv/index.wxss'), /\.afk-list--lined \.afk-row \+ \.afk-row \{ border-top/);
});

test('续租页：沿用折扣是底栏标签；报价有效期的剩余时间单独一行；改月数时步进数字与底栏金额回弹，连点与卸载状态正确', async () => {
  fresh();
  const o = active({ factor: 0.6, agoDays: 350, startAt: Date.now() - 349 * DAY, stage: S.EXPIRING });
  const pg = await page(routes.RENEW, { id: o.id });
  assert.deepEqual([pg.data.st, pg.data.bar.lab, pg.data.bar.tag, pg.data.bar.amt], ['form', '续租 12个月', '沿用 6 折', '约 ¥2,880']); assert.ok(!pg.data.amtBump && !pg.data.mBump && !pg.data.stFx, '首次渲染不动');
  pg.onMinus(); pg.onMinus(); pg.onPlus(); await tick(40); // 快速连点
  assert.deepEqual([pg.data.form.months, pg.data.bar.amt, pg.data.mBump, pg.data.amtBump], [11, '约 ¥2,640', 'mk-bump mk-bump--center', 'mk-bump']); assert.ok(!pg.data.stFx, '同一状态内不淡入');
  await pg.onSubmit(); await tick(40); assert.equal(pg.data.st, 'quote_pending'); assert.equal(pg.data.stFx, 'mk-fade', '状态切换淡入一次');
  await pg.refresh(); await tick(40); assert.equal(pg.data.st, 'quote_ready');
  const kv = pg.data.card.kv[0]; assert.match(kv.v, /^\d{4}-\d\d-\d\d \d\d:\d\d$/); assert.match(kv.sub, /^剩余 \d\d:\d\d:\d\d$/); assert.equal(kv.subWarn, true);
  const log = watch(pg); pg.onUnload(); await tick(1100);
  assert.deepEqual(log, [], '卸载后倒计时与动效回调都不再写数据');
  const w = read('pkg-after/renew/index.wxml'); assert.match(w, /wx:if="\{\{bar\.tag\}\}" class="mk-tag mk-tag--promo af-bar-tag"/); assert.match(w, /<text class="\{\{amtBump\}\}">\{\{bar\.amt\}\}/);
  assert.ok(!/·/.test(TA.renew.validLeft + TA.renew.barKeepTag + TA.deposit.amountLabel + TA.deposit.paidWith));
});

test('押金页切换订单行：店名一级、仓位编号标签与容量同一行；发票记录金额单列、类型成标签；查看更多说明淡入', async () => {
  fresh(); db.seeded = false;
  const pg = await page(routes.DEPOSIT, {});
  assert.ok(pg.data.picks.length > 1); const p0 = pg.data.picks[0];
  assert.ok(!/·\s*[A-Z]\d{3}/.test(p0.t), '店名里不再拼仓位'); assert.ok(p0.codes.length >= 1 && /^[A-Z]\d{3}$/.test(p0.codes[0])); assert.match(p0.vol, /m³$/); assert.match(p0.s, /^订单号 MK/);
  assert.match(read('pkg-after/deposit/index.wxml'), /class="mk-unitno dp-opt-no">\{\{c\}\}<\/text><text class="mk-num">\{\{item\.vol\}\}/);
  assert.match(pg.data.steps[0].s, /^\d{4}-\d\d-\d\d 随下单支付$/); assert.deepEqual([TA.deposit.amountLabel, TA.deposit.amountBasis], ['押金', '1个月月租']);
  if (pg.data.more) { pg.onMore(); await tick(40); assert.equal(pg.data.moreFx, 'mk-fade'); assert.equal(pg.data.more, false); }
  pg.onUnload();
  fresh(); const o = active(); const iv = await page(routes.INVOICE, { id: o.id });
  assert.ok(iv.data.opts.every((x) => /^¥/.test(x.amt) && !/¥|·/.test(x.label)), '付款项名称与金额分开');
  iv.onInput({ currentTarget: { dataset: { f: 'title' } }, detail: { value: '张三' } }); iv.onInput({ currentTarget: { dataset: { f: 'email' } }, detail: { value: 'a@b.cn' } });
  await iv.onSubmit(); await tick(40);
  const r = iv.data.records[0]; assert.deepEqual([r.t, r.kind, r.s, r.tax], ['下单支付', '个人', '张三', '']); assert.match(r.amt, /^¥[\d,]+$/); iv.onUnload();
});

test('动效底座的用法约束：本域页面与组件用到 motion 的，都在卸载时 dispose；本域 WXML / 界面文字里不再有 • 与 ｜', () => {
  const files = ['pkg-trade/confirm/index.js', 'pkg-trade/quick/index.js', 'pkg-trade/order/index.js', 'components/mk-order-card/index.js', 'components/mk-fee-detail/index.js', 'components/mk-term-seg/index.js'];
  for (const f of files) { const s = read(f); assert.match(s, /motion\.bump\(/, f); assert.match(s, /(onUnload|detached)\(\) \{[^}]*motion\.dispose\(this\)/, f); }
  for (const p of ['identity', 'deposit', 'renew', 'exit', 'invoice']) { const s = read('pkg-after/' + p + '/index.js'); assert.match(s, /cm\.fx\(page, /, p); assert.match(s, /onUnload\(\) \{[^}]*cm\.dispose\(this\)/, p); }
  assert.equal(typeof motion.bump, 'function');
  const dirs = ['pkg-trade/confirm', 'pkg-trade/quick', 'pkg-trade/order', 'pkg-trade/agreement', 'pages/orders', 'components/mk-order-card', 'components/mk-fee-detail', 'components/mk-term-seg', 'components/mk-after-kv', 'pkg-after/identity', 'pkg-after/access', 'pkg-after/econtract', 'pkg-after/deposit', 'pkg-after/renew', 'pkg-after/exit', 'pkg-after/invoice'];
  for (const d of dirs) assert.ok(!/[•｜]/.test(read(d + '/index.wxml')), d);
  assert.ok(!/[•｜]/.test(read('i18n/trade.js').replace(/\/\/.*$/gm, '')) && !/[•｜]/.test(read('i18n/after.js').replace(/\/\/.*$/gm, '')));
});
