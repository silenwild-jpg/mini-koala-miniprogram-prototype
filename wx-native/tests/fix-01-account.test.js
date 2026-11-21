// FIX-01 账户域（我的与账户）：评审问题 D-02 ～ D-18、S-04 / S-07 / S-08 与口径 R-02 / R-14 / R-15 / R-21 的修复用例。
// 在假的 wx 环境里跑，验证的是代码逻辑，不是微信真实渲染。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), routes = R('services/routes'), api = R('services/api'), demo = R('services/demo'), scenarios = R('mock/scenarios');
const { db } = R('services/mock-ext/_db'), acct = R('services/mock-ext/account');
const C = R('core/config'), CA = R('core/config-account'), CF = R('core/config-after'), rules = R('core/account'), lead = R('core/lead'), order = R('core/order');
const TA = R('i18n/account'), TL = R('i18n/lead'), TF = R('i18n/after');
env.loadApp();
const toasts = [];
wx.showToast = (o) => toasts.push(o.title);
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 15));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const base = (r) => r.replace(/^\//, '');
const login = () => state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
const D0 = Object.assign({}, CA.demo), A0 = Object.assign({}, CF.demo);
// seedOrders = true：带 5 笔默认演示订单
function fresh(loggedIn, seedOrders) {
  state.reset(); env.nav.length = 0; env.mode = 'ok'; toasts.length = 0;
  db.orders.length = 0; db.leads.length = 0; db.messages.length = 0; db.seq = 0; db.seeded = !seedOrders; db.kv = {}; db.sms = {};
  scenarios.write({ scenario: '', stock: 'normal', events: {}, net: 'instant' });
  Object.assign(CA.demo, D0); Object.assign(CF.demo, A0);
  if (loggedIn) login();
}
test.after(() => { Object.assign(CA.demo, D0); Object.assign(CF.demo, A0); C.DEMO_TOOLS = true; });
const page = async (name, q) => { const pg = env.newPage(base(routes[name]), q || {}); await tick(30); return pg; };
const tap = (dataset) => ({ currentTarget: { dataset: dataset || {} }, detail: {} });
const pastReview = (obj) => { obj.submitted_at -= (CA.demo.reviewSeconds + 1) * 1000; };
const verifyCert = async () => { await api.submitEntCert({ name: '演示商贸有限公司', tax: '91110105MA01K7XQ3R', licenseCount: 1, contact: '王经理', phone: '13800000001' }); pastReview(db.kv.account.cert); await api.getEntCert(); };
const items = (pg) => pg.data.groups.reduce((a, g) => a.concat(g.items), (pg.data.quick || []).slice()); // IMPL-02 M-34：常用入口 5 格在 quick
const dayStr = (offset) => lead.dateStr(Date.now() + offset * 86400e3);

// 裁定 R-13 后，没通过认证的演示账户起始不带企业抬头；认证通过后先加一条企业抬头再批量开票
const coTitle = async () => { const has = (await api.getInvoiceTitles()).find((t) => t.type === 'company'); if (has) return has.id; const l = await api.saveInvoiceTitle({ type: 'company', name: '安贞商贸有限公司', tax: '91110105MA01K7XQ3R', email: 'caiwu@163.com' }); return l[l.length - 1].id; };
test('D-02 / E-04：未登录进预约记录页，显示「登录后查看预约记录」和登录按钮，不显示「暂无预约记录」；登录后列出记录', async () => {
  fresh(false, false);
  await api.submitLead({ type: 'booking', phone: '13800008000', address: '朝阳区安贞西里', capacity_m3: 3, term_months: 6 }); // 访客凭手机号提交
  const pg = await page('NEEDS');
  assert.equal(pg.data.sys, ''); assert.equal(pg.data.guest, true); assert.equal(pg.data.list.length, 0);
  assert.equal(pg.data.T.v.guestTitle, '登录后查看预约记录'); assert.equal(pg.data.T.login, '登录 / 注册');
  const wxml = read('pkg-account/needs/index.wxml');
  assert.ok(wxml.indexOf('wx:elif="{{guest}}"') < wxml.indexOf('T.n.emptyTitle'), '未登录分支排在「暂无预约记录」之前');
  assert.match(wxml, /<mk-login-sheet visible="\{\{loginVisible\}\}"/);
  pg.onLogin(); assert.equal(pg.data.loginVisible, true);
  login(); pg.onLoginSuccess(); await tick(30);
  assert.equal(pg.data.guest, false); assert.equal(pg.data.list.length, 1); assert.equal(pg.data.list[0].title, TL.needs.titles.booking);
});

test('D-08 / E-09：看仓记录单独一套 —— 门店名、看仓时间、门店地址，不出现「租期待补充」，操作只有撤回；接口不允许改看仓线索的地址', async () => {
  fresh(true, false);
  const rec = await api.submitLead({ type: 'visit', store_id: 'SIM_BJ02', preferred_date: dayStr(2), time_slot: '下午' });
  const tbd = await api.submitLead({ type: 'visit', store_id: 'SIM_BJ01', time_slot: '待电话确认', capacity_m3: 3.5 });
  const pg = await page('NEEDS');
  const v = pg.data.list.find((x) => x.id === rec.id), t = pg.data.list.find((x) => x.id === tbd.id);
  assert.equal(v.visit, true); assert.equal(v.title, '预约看仓'); assert.equal(v.status, '已提交，待门店电话确认');
  assert.equal(v.loc, rec.store_name, '第一行是门店名'); assert.equal(v.detail, '看仓时间 ' + dayStr(2) + ' · 下午');
  assert.equal(v.addr, rec.address, '门店地址紧跟在门店名下面（IMPL-01：不再和容量、手机号串成一行）'); assert.equal(v.phone, '138****8000'); assert.equal(v.note, '');
  assert.ok(!/待补充/.test(JSON.stringify(v)), '不显示「容量待补充 · 租期待补充」');
  assert.equal(t.detail, '看仓时间 待电话确认'); assert.equal(t.extra, '意向容量 3.5m³');
  assert.ok(!/预约看仓|待电话确认/.test(read('pkg-account/needs/index.js').replace(/^\/\/.*$/gm, '')), '标题和时段不再写死在页面代码里');
  // 操作：页面上只有撤回；点修改无效；接口也拒绝
  const wxml = read('pkg-account/needs/index.wxml');
  assert.match(wxml, /<button wx:if="\{\{item\.visit\}\}"[^>]*bindtap="onWithdraw"/);
  pg.onEdit(tap({ id: rec.id })); assert.equal(pg.data.sheet, '', '看仓记录不打开「修改需求」');
  await assert.rejects(api.updateLead({ id: rec.id, address: '别的地址', note: 'x' }), (e) => e.code === 'INVALID');
  assert.equal((await api.getLead({ id: rec.id })).address, rec.address, '门店地址没有被改掉');
  pg.onWithdraw(tap({ id: rec.id })); await tick(30);
  assert.equal(pg.data.list.find((x) => x.id === rec.id).off, true);
  assert.equal(pg.data.list.find((x) => x.id === rec.id).status, TL.needs.status.withdrawn);
});

test('D-18 / S-08：受理说明只在有近 24 小时内提交的未撤回记录时显示；有记录时可再预约；预约记录页可下拉刷新', async () => {
  fresh(true, false);
  await api.submitLead({ type: 'booking', address: '朝阳区安贞西里', capacity_m3: 3, term_months: 6 });
  let pg = await page('NEEDS');
  assert.equal(pg.data.active, true, '刚提交：显示「预计 10 分钟内与您联系」');
  db.leads[0].accepted_at = Date.now() - (CA.needsAckHours + 1) * 3600e3;
  pg = await page('NEEDS');
  assert.equal(pg.data.list.length, 1); assert.equal(pg.data.active, false, '几天前的记录不再显示受理时限');
  pg.onBook(); assert.deepEqual(env.nav.pop(), { kind: 'navigateTo', url: routes.BOOKING });
  assert.match(read('pkg-account/needs/index.wxml'), /bindtap="onBook">\{\{T\.v\.bookAgain\}\}/);
  assert.equal(JSON.parse(read('pkg-account/needs/index.json')).enablePullDownRefresh, true);
  let stopped = 0; const keep = wx.stopPullDownRefresh; wx.stopPullDownRefresh = () => { stopped++; };
  try { pg.onPullDownRefresh(); await tick(30); } finally { wx.stopPullDownRefresh = keep; }
  assert.equal(stopped, 1);
});

test('D-03：批量开票结果页 —— 处理中可「再开一批」，原申请照常出结果；未成功可「重新选择订单」', async () => {
  fresh(true, true); await verifyCert();
  const ids = rules.invoiceable(await api.getOrders()).map((o) => o.id);
  await api.submitBatchInvoice({ order_ids: ids.slice(0, 2), title_id: await coTitle() });
  let pg = await page('ENT_BATCH');
  assert.equal(pg.data.view, 'result'); assert.equal(pg.data.result.status, 'submitted'); assert.equal(pg.data.result.another, '再开一批');
  assert.match(read('pkg-account/ent-batch/index.wxml'), /<mk-cell title="\{\{result\.another\}\}" bindtap="onAnother" \/>/);
  await pg.onAnother(); await tick(30);
  assert.equal(pg.data.view, 'select'); assert.equal(pg.data.rows.length, 2, '已申请的两笔不再可选，其余两笔可以再开一批');
  // 点过「再开一批」的那笔照常推进到已开具，并写一条消息
  pastReview(db.kv.account.batches[0]); await api.getBatchInvoice();
  assert.equal(db.kv.account.batches[0].status, 'issued');
  assert.equal((await api.getOrders()).filter((o) => ids.slice(0, 2).indexOf(o.id) >= 0 && o.invoice.status === 'issued').length, 2);
  assert.ok(db.messages.some((m) => m.type === 'ent_batch' && m.title === TA.messages.demo.batchIssued));
  // 未成功：重新选择订单
  fresh(true, true); await verifyCert();
  scenarios.setEvent('batch_invoice_fail', true);
  const ids2 = rules.invoiceable(await api.getOrders()).map((o) => o.id);
  await api.submitBatchInvoice({ order_ids: ids2.slice(0, 1), title_id: await coTitle() }); pastReview(db.kv.account.batches[0]);
  pg = await page('ENT_BATCH');
  assert.equal(pg.data.result.status, 'failed'); assert.equal(pg.data.result.another, '重新选择订单');
  await pg.onAnother(); await tick(30);
  assert.equal(pg.data.view, 'select'); assert.equal(pg.data.rows.length, ids2.length, '未成功那笔的订单已放回，可以改选别的订单');
});

test('D-07：企业认证、批量开票出结果时写站内消息；消息页归到各自分类并跳到对应页面；审核中页可下拉刷新', async () => {
  fresh(true, true);
  await api.submitEntCert({ name: '演示商贸有限公司', tax: '91110105MA01K7XQ3R', licenseCount: 1, contact: '王经理', phone: '13800000001' });
  assert.equal(db.messages.filter((m) => m.type === 'ent_cert').length, 0, '审核中还没有结果消息');
  pastReview(db.kv.account.cert); await api.getEntCert(); await api.getEntCert();
  assert.deepEqual(db.messages.filter((m) => m.type === 'ent_cert').map((m) => m.title), [TA.messages.demo.certOk], '只写一条');
  await api.submitBatchInvoice({ order_ids: rules.invoiceable(await api.getOrders()).slice(0, 1).map((o) => o.id), title_id: await coTitle() });
  pastReview(db.kv.account.batches[0]); await api.getBatchInvoice(); await api.getBatchInvoice();
  assert.equal(db.messages.filter((m) => m.type === 'ent_batch').length, 1);
  const pg = await page('MESSAGES');
  const cert = pg.data.list.findIndex((x) => x.cat === 'entCert'), batch = pg.data.list.findIndex((x) => x.cat === 'entBatch');
  assert.deepEqual([pg.data.list[cert].tag, pg.data.list[cert].link], ['企业认证', '查看认证结果']);
  assert.deepEqual([pg.data.list[batch].tag, pg.data.list[batch].link], ['发票', '查看开票结果']);
  env.nav.length = 0; pg.onLink(tap({ i: cert })); assert.deepEqual(env.nav.pop(), { kind: 'navigateTo', url: routes.ENT_CERT });
  pg.onLink(tap({ i: batch })); assert.deepEqual(env.nav.pop(), { kind: 'navigateTo', url: routes.ENT_BATCH });
  // 未通过也写消息
  fresh(true, false);
  await api.submitEntCert({ name: '演示' + CA.demo.certRejectKeyword + '公司', tax: '91110105MA01K7XQ3R', licenseCount: 1, contact: '王经理', phone: '13800000001' });
  pastReview(db.kv.account.cert); await api.getEntCert();
  assert.equal(db.messages[0].title, TA.messages.demo.certFail);
  assert.equal(TA.ent.cert.head.reviewing.sub, '审核结果会通过消息通知您。');
  for (const p of ['ent-cert', 'ent-batch']) { assert.equal(JSON.parse(read('pkg-account/' + p + '/index.json')).enablePullDownRefresh, true, p); assert.match(read('pkg-account/' + p + '/index.js'), /onPullDownRefresh\(\)/, p); }
});

test('D-05：「消息较多」场景 —— 消息挂在状态相符的订单上；演示推进时间过了以后仍是 7 条 3 条未读，角标与消息页一致', async () => {
  fresh(false, false);
  Object.keys(CF.demo).forEach((k) => { if (typeof CF.demo[k] === 'number') CF.demo[k] = 1; }); // 让所有「等门店处理」的状态立刻到点
  assert.ok(demo.applyScenario('member_inbox'));
  assert.equal((await api.getMessagesUnread({})).unread, 3);
  await tick(30);
  let list = await api.getMessages();
  assert.equal(list.length, 7, '没有因为订单自动推进多出消息'); assert.equal(list.filter((m) => !m.read).length, 3);
  assert.equal((await api.getMessagesUnread({})).unread, 3);
  const of = (title) => db.orders.find((o) => o.id === list.find((m) => m.title === TF.messages.demo[title]).order_id);
  assert.equal(of('renewQuote').renew.status, 'quoted', '「续租报价已出」的订单有待确认的报价');
  assert.equal(of('invoiceFailed').invoice.records[0].status, 'failed', '「发票开具未成功」的订单有未成功的发票记录');
  assert.equal(of('inspectFailed').exit.status, 'failed', '「验仓未通过」的订单停在验仓未通过');
  assert.equal(of('exitRequested').id, of('inspectFailed').id);
  assert.equal(of('invoiceIssued').invoice.status, 'issued');
  assert.equal(of('depositRefunded').stage, order.STAGE.ENDED);
  // 角标接口与消息列表接口同步推进：「多门店多笔订单」里有等报价、等验仓的订单
  fresh(false, false);
  Object.keys(CF.demo).forEach((k) => { if (typeof CF.demo[k] === 'number') CF.demo[k] = 1; });
  assert.ok(demo.applyScenario('member_multi'));
  await api.getOrders(); await tick(30); // 先造单，再等到点
  assert.equal(db.messages.length, 0);
  const badge = (await api.getMessagesUnread({})).unread;
  assert.ok(badge > 0, '角标接口自己就推进订单并产生消息，不用等打开消息页');
  assert.equal(badge, db.messages.filter((m) => !m.read).length, '角标数 = 此刻的未读消息数');
});

test('D-09：收藏页的失效条目可以移除，角标跟着减；有效条目不能在本页移除', async () => {
  fresh(true, false);
  state.set('favorites', { stores: ['SIM_BJ01', 'SIM_BJ05'], units: ['SIM_BJ02_U03', 'SIM_BJ01_U02'] }); // SIM_BJ05 暂停营业；SIM_BJ01_U02 已租出
  const pg = await page('FAVORITES');
  assert.equal(rules.favCount(state.get().favorites), 4);
  await pg.onRemove(tap({ kind: 'stores', id: 'SIM_BJ01' }));
  assert.equal(state.get().favorites.stores.length, 2, '营业中的门店不在本页移除');
  await pg.onRemove(tap({ kind: 'stores', id: 'SIM_BJ05' })); // IMPL-01：条目先淡出再从列表拿掉，onRemove 返回的 Promise 在列表刷新后完成
  assert.deepEqual(state.get().favorites.stores, ['SIM_BJ01']); assert.deepEqual(pg.data.stores.map((s) => s.id), ['SIM_BJ01']);
  await pg.onRemove(tap({ kind: 'units', id: 'SIM_BJ01_U02' }));
  assert.deepEqual(state.get().favorites.units, ['SIM_BJ02_U03']); assert.equal(rules.favCount(state.get().favorites), 2);
  assert.ok(toasts.includes('已移除'));
  const wxml = read('pkg-account/favorites/index.wxml');
  assert.equal((wxml.match(/<button wx:if="\{\{item\.gone\}\}"[^>]*catchtap="onRemove"/g) || []).length, 2, '门店和仓位两组的失效条目都有「移除」，用 catchtap 不触发整行跳转');
});

test('R-14 / D-10：已有付款订单的用户可以领新客券，领到的券可用；使用条件不再写「首次租仓」', async () => {
  fresh(true, true);
  assert.ok((await api.getOrders()).some((o) => o.pay && o.pay.paid_at > 0), '前提：已有付款订单');
  const res = await api.claimCoupons();
  assert.deepEqual(res.coupons.map((c) => c.status), ['AVAILABLE', 'AVAILABLE']);
  assert.ok(res.coupons.every((c) => !/首次/.test(c.condition)));
  const pg = await page('COUPONS');
  assert.deepEqual(pg.data.coupons.map((c) => [c.tag, c.off, c.canUse]), [['可使用', false, true], ['可使用', false, true]]);
  assert.equal(rules.benefitCount(await api.getBenefits()), 3);
});

test('D-11：优惠券顶部说明补全免费运输条件，数值取自规则配置', async () => {
  fresh(true, false);
  const pg = await page('COUPONS'), ft = C.freeTransport;
  assert.ok(pg.data.notice.includes('距门店 ' + ft.minKm + 'km 及以上')); assert.ok(pg.data.notice.includes('租期满 ' + ft.minTerm + ' 个月'));
  assert.ok(pg.data.notice.includes('折扣不低于 ' + ft.minFactor * 10 + ' 折')); assert.ok(pg.data.notice.includes('特价仓不参与')); assert.ok(pg.data.notice.includes('搬运、拆装、楼梯费另计'));
  assert.ok(!/[{}]/.test(pg.data.notice), '占位符都已填入');
  assert.match(read('pkg-account/coupons/index.wxml'), /text="\{\{notice\}\}"/);
});

test('D-12 / S-04：推荐有礼 —— 未登录不能复制也不带邀请码；已登录显示邀请码、转发带 ref；App 落地读取 ref 并记下', async () => {
  fresh(false, false);
  let copied = null; const keep = wx.setClipboardData; wx.setClipboardData = (o) => { copied = o.data; o.success && o.success(); };
  try {
    let pg = await page('REFERRAL');
    pg.onCopy(); assert.equal(copied, null, '未登录点复制没有动作');
    assert.deepEqual(pg.onShareAppMessage(), { title: TA.referral.shareTitle, path: routes.HOME });
    fresh(true, false);
    pg = await page('REFERRAL');
    pg.onCopy(); assert.equal(copied, 'MK8000'); assert.ok(!/pages\//.test(copied), '复制的不是内部页面路径');
    assert.equal(pg.onShareAppMessage().path, routes.HOME + '?ref=MK8000');
  } finally { wx.setClipboardData = keep; }
  const wxml = read('pkg-account/referral/index.wxml');
  assert.match(wxml, /open-type="share">\{\{T\.r\.share\}\}/, '页面里有转发按钮');
  assert.match(wxml, /<block wx:else>\s*<button class="mk-btn mk-btn--md mk-btn--disabled[^>]*disabled="\{\{true\}\}">\{\{T\.r\.share\}\}/, '未登录时按钮是禁用态');
  assert.match(wxml, /wx:if="\{\{loggedIn && code\}\}" class="rf-box mk-row"[^>]*bindtap="onCopy"[^>]*>.*\{\{code\}\}/, '页面显示邀请码本身（REVIEW-02 D2-15：有邀请码时整框可点即复制）'); assert.match(wxml, /wx:else class="rf-box mk-row"><text class="mk-grow mk-ellipsis">\{\{T\.r\.codeGuest\}\}/);
  // 落地：带 ref 进入任何页面都记下；格式不对的不记
  fresh(false, false);
  const app = getApp();
  app.onShow({ path: 'pages/home/index', query: {} }); assert.equal(state.get().flags.inviteCode, undefined);
  app.onShow({ path: 'pages/home/index', query: { ref: '../../x?y=1' } }); assert.equal(state.get().flags.inviteCode, undefined);
  app.onShow({ path: 'pages/home/index', query: { ref: 'MK8000' } }); assert.equal(state.get().flags.inviteCode, 'MK8000');
  assert.equal(env.storage.mk_state_v1.flags.inviteCode, 'MK8000', '写进本机存储，重开不丢');
});

test('D-13 / S-07：「我的」有批量开票入口，企业认证一行显示状态；开票抬头三处名称一致；批量开票拦截页按认证状态换文案', async () => {
  for (const [sc, text] of [['ent_reviewing', '审核中'], ['ent_verified', '已认证'], ['ent_rejected', '未通过']]) {
    fresh(false, false); scenarios.setEvent('review_hold', true);
    assert.ok(demo.applyScenario(sc));
    const pg = await page('MINE');
    assert.equal(items(pg).find((i) => i.k === 'ENT_CERT').s, text, sc);
  }
  fresh(true, false);
  let pg = await page('MINE');
  assert.equal(items(pg).find((i) => i.k === 'ENT_CERT').s, '', '未提交认证时不显示状态');
  assert.equal(items(pg).find((i) => i.k === 'ENT_BATCH').t, '批量开票');
  env.nav.length = 0; pg.onItem(tap({ k: 'ENT_BATCH' })); assert.deepEqual(env.nav.pop(), { kind: 'navigateTo', url: routes.ENT_BATCH });
  // 三处名称
  const name = items(pg).find((i) => i.k === 'ENT_TITLES').t;
  assert.equal(name, '开票抬头');
  assert.equal(JSON.parse(read('pkg-account/ent-titles/index.json')).navigationBarTitleText, name);
  assert.equal(routes.TABLE.find((x) => x.name === 'ENT_TITLES').title, name);
  assert.equal(TA.ent.cert.toTitles, name);
  // 拦截页
  pg = await page('ENT_BATCH'); assert.deepEqual([pg.data.view, pg.data.gate.title, pg.data.gate.btn], ['gate', '批量开票需要先完成企业认证', '去企业认证']);
  fresh(false, false); scenarios.setEvent('review_hold', true); demo.applyScenario('ent_reviewing');
  pg = await page('ENT_BATCH'); assert.deepEqual([pg.data.view, pg.data.gate.title, pg.data.gate.btn], ['gate', '企业认证审核中', '查看认证进度']);
  fresh(false, false); demo.applyScenario('ent_rejected');
  pg = await page('ENT_BATCH'); assert.deepEqual([pg.data.view, pg.data.gate.title, pg.data.gate.btn], ['gate', '企业认证未通过', '查看未通过原因']);
  pg.onCert(); assert.deepEqual(env.nav.pop(), { kind: 'navigateTo', url: routes.ENT_CERT });
});

test('D-18：「我的」页未登录点需要登录的入口，登录成功后接着进那一页；没登录就关掉登录层则不记去向', async () => {
  for (const k of ['ENT_TITLES', 'ENT_BATCH', 'ENT_CERT', 'DEPOSIT']) {
    fresh(false, false);
    const pg = await page('MINE');
    env.nav.length = 0; pg.onItem(tap({ k })); assert.equal(pg.data.loginVisible, true, k); assert.equal(env.nav.length, 0, k);
    login(); pg.onLoginSuccess(); pg.onLoginClose(); await tick(30);
    assert.deepEqual(env.nav, [{ kind: 'navigateTo', url: routes[k] }], k);
  }
  fresh(false, false);
  const pg = await page('MINE');
  pg.onItem(tap({ k: 'ENT_CERT' })); pg.onLoginClose(); // 没登录就关掉
  pg.onHead(); login(); env.nav.length = 0; pg.onLoginSuccess(); await tick(30);
  assert.equal(env.nav.length, 0, '从头像登录的不跳到之前点过的入口');
});

test('D-15：演示开关关闭后，本机存过的场景 / 网络 / 库存 / 事件一律按默认值读；演示页直接打开回首页且不渲染内容', async () => {
  fresh(false, false);
  assert.ok(demo.applyScenario('member_inbox')); demo.setNet('offline'); demo.setStock('city_soldout'); demo.toggleEvent('store_hold'); demo.toggleEvent('pay_fail');
  assert.equal(scenarios.net().id, 'offline'); assert.equal(scenarios.eventOn('store_hold'), true);
  C.DEMO_TOOLS = false;
  try {
    assert.equal(demo.enabled(), false);
    assert.equal(scenarios.scenario(), null); assert.equal(scenarios.net().id, 'instant'); assert.equal(scenarios.stock().id, 'normal');
    assert.equal(scenarios.eventOn('store_hold'), false); assert.equal(scenarios.take('pay_fail'), false);
    assert.ok((await api.getStores({ city: C.defaultCity })).length > 0, '存着「断网」也能正常取数');
    assert.ok((await api.getStores({ city: C.defaultCity })).some((s) => s.units.some((u) => u.status === 'available')), '存着「全城满仓」也按正常库存');
    demo.setNet('slow'); demo.setStock('tight'); demo.toggleEvent('unit_gone'); assert.equal(demo.applyScenario('member_new'), null);
    assert.equal(env.storage.mk_demo_v1.net, 'offline', '关闭后不能再写');
    // 直接打开演示页（没有上一页）：回首页，页面不渲染
    env.nav.length = 0;
    const lab = env.newPage('pkg-dev/lab/index', {});
    assert.deepEqual(env.nav, [{ kind: 'reLaunch', url: routes.HOME }]); assert.equal(lab.data.ready, false); assert.equal(lab.data.scenes.length, 0);
    assert.match(read('pkg-dev/lab/index.wxml'), /^<view wx:if="\{\{ready\}\}"/);
    const mine = await page('MINE'); assert.equal(mine.data.demoLabel, undefined, '「我的」页没有演示入口');
  } finally { C.DEMO_TOOLS = true; }
  assert.equal(scenarios.net().id, 'offline', '重新打开开关后，原来存的值还在');
  const lab = env.newPage('pkg-dev/lab/index', {}); assert.equal(lab.data.ready, true); assert.ok(lab.data.scenes.length > 20);
});

test('D-16：演示工具页 —— 恢复默认、切场景提示仍开着的开关、未选场景有说明、分区可跳转；失败类场景带对应消息', async () => {
  fresh(false, false);
  const lab = env.newPage('pkg-dev/lab/index', {});
  assert.equal(lab.data.noScene, true); assert.ok(lab.data.scenes.every((x) => !x.on));
  demo.setNet('slow'); demo.setStock('tight'); demo.toggleEvent('pay_fail'); demo.toggleEvent('store_hold');
  assert.equal(demo.togglesOn(), 4);
  lab.onScene(tap({ id: 'member_new' }));
  assert.equal(toasts.pop(), '已切换：新注册用户；仍开着 4 项网络 / 库存 / 事件开关'); assert.equal(lab.data.noScene, false);
  assert.equal(scenarios.stock().id, 'tight', '切场景不重置库存档位');
  lab.onReset();
  assert.equal(demo.togglesOn(), 0); assert.equal(scenarios.stock().id, 'normal'); assert.equal(scenarios.eventOn('pay_fail'), false); assert.equal(scenarios.net().id, 'instant');
  assert.equal(scenarios.scenario().id, 'member_new', '恢复默认不动场景');
  assert.ok(lab.data.events.every((x) => !x.on)); assert.equal(toasts.pop(), '已恢复默认');
  lab.onScene(tap({ id: 'member_active' })); assert.equal(toasts.pop(), '已切换：租用中（默认）');
  const wxml = read('pkg-dev/lab/index.wxml');
  lab.data.L.jump.forEach((j) => assert.ok(wxml.includes('id="' + j.id + '"'), j.id + ' 有对应的分区'));
  // 失败类场景：消息页不再是空的
  for (const [sc, title] of [['member_identity_mismatch', 'identityFail'], ['member_inspect_failed', 'inspectFailed'], ['member_refund_failed', 'depositFailed'], ['member_invoice_failed', 'invoiceFailed']]) {
    fresh(false, false); assert.ok(demo.applyScenario(sc));
    const list = await api.getMessages();
    const m = list.find((x) => x.title === TF.messages.demo[title]);
    assert.ok(m, sc + ' 带「' + TF.messages.demo[title] + '」'); assert.equal(m.order_id, db.orders[0].id); assert.equal(m.read, false);
  }
});

test('R-02：批量开票处理中写「1 天内开具」，数值取租后配置的开票时限', async () => {
  fresh(true, true); await verifyCert();
  await api.submitBatchInvoice({ order_ids: rules.invoiceable(await api.getOrders()).slice(0, 1).map((o) => o.id), title_id: await coTitle() });
  const pg = await page('ENT_BATCH');
  assert.equal(CF.sla.invoiceDays, 1); assert.equal(pg.data.result.steps[1].s, CF.sla.invoiceDays + ' 天内开具');
  assert.ok(!/请咨询客服/.test(JSON.stringify(TA.ent.batch.steps)));
});

test('R-15：推荐好友、关于考拉定义转发；其余账户页与「我的」不定义转发', async () => {
  fresh(false, false);
  const brand = await page('BRAND');
  assert.deepEqual(brand.onShareAppMessage(), { title: TA.brand.shareTitle, path: routes.BRAND });
  const dirs = fs.readdirSync(path.join(root, 'pkg-account')).filter((d) => fs.existsSync(path.join(root, 'pkg-account', d, 'index.js')));
  const withShare = dirs.filter((d) => /onShareAppMessage/.test(read('pkg-account/' + d + '/index.js'))).sort();
  assert.deepEqual(withShare, ['brand', 'referral']);
  assert.ok(!/onShareAppMessage/.test(read('pages/mine/index.js')));
});

test('R-21：账户域里与紧邻按钮同义的说明句已删', () => {
  assert.equal(TA.mine.newCard.sub, undefined); assert.ok(!/newCard\.sub/.test(read('pages/mine/index.wxml')));
  assert.equal(TA.ent.cert.head.failed.sub, ''); assert.match(read('pkg-account/ent-cert/index.wxml'), /<text wx:if="\{\{head\.sub\}\}"/);
  assert.ok(!/T\.n\.emptySub/.test(read('pkg-account/needs/index.wxml')), '预约记录空态不再重复「预约用仓后…」');
});

test('D-06：企业认证未通过后重新提交，营业执照要重新上传', async () => {
  fresh(false, false); demo.applyScenario('ent_rejected');
  const pg = await page('ENT_CERT');
  assert.equal(pg.data.status, 'failed');
  pg.onFix();
  assert.equal(pg.data.form.licenseCount, 0); assert.equal(pg.data.uploadText, TA.ent.cert.upload); assert.equal(pg.data.ready, false);
  assert.ok(pg.data.need.includes(TA.ent.cert.needNames.license));
  pg.onField({ detail: { value: '13800000001' }, currentTarget: { dataset: { f: 'phone' } } });
  assert.equal(pg.data.ready, false, '不重传执照不能提交');
  pg.onUpload(); assert.equal(pg.data.ready, true);
});
