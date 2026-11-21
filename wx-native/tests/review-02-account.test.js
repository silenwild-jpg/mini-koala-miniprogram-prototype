// REVIEW-02 回归评审修复批 · 我的与账户域（D2-01～D2-20 里本域动手的条目）。
// 在假的 wx 环境里跑，验证的是代码逻辑与模板结构，不是微信真实渲染。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), routes = R('services/routes'), api = R('services/api'), scenarios = R('mock/scenarios');
const { db } = R('services/mock-ext/_db');
const TA = R('i18n/account'), TF = R('i18n/find'), C = R('core/config-account'), rules = R('core/account');
env.loadApp();
const toasts = [];
wx.showToast = (o) => toasts.push(o.title);
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 15));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const base = (r) => r.replace(/^\//, '');
const login = () => state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
function fresh(loggedIn, seedOrders) {
  state.reset(); env.nav.length = 0; env.mode = 'ok'; toasts.length = 0;
  db.orders.length = 0; db.leads.length = 0; db.messages.length = 0; db.seq = 0; db.seeded = !seedOrders; db.kv = {}; db.sms = {};
  scenarios.write({ scenario: '', stock: 'normal', events: {}, net: 'instant' });
  if (loggedIn) login();
}
const page = async (name, q) => { const pg = env.newPage(base(routes[name]), q || {}); await tick(30); return pg; };
const CERT = { name: '演示商贸有限公司', tax: '91110105MA01K7XQ3R', licenseCount: 1, contact: '王经理', phone: '13800000001' };
const pastReview = () => { db.kv.account.cert.submitted_at -= (C.demo.reviewSeconds + 1) * 1000; };

test('D2-01：「我的仓位」不再重复列任务卡主卡那一笔；量词与任务卡同为「处」；「查看全部」只在还有没列出的仓位时出现', async () => {
  fresh(true, true);
  const pg = await page('MINE');
  // 假环境里页面拿不到任务卡组件：不去重，行为与原来一致
  assert.equal(pg.data.assets.length, 2); assert.equal(pg.data.assetsAll, '查看全部 3处');
  const all = rules.activeAssets(await api.getOrders()).map((o) => o.id);
  assert.equal(all.length, 3); assert.deepEqual(pg.data.assets.map((a) => a.id), all.slice(0, 2));
  // 垫一个任务卡实例：主卡是排第一的那一笔 → 列表列其余两笔，三笔都已在页面上，不再出「查看全部」
  let refreshed = 0;
  pg.selectComponent = (sel) => (sel === '#task' ? { refresh: () => { refreshed += 1; return Promise.resolve(); }, data: { main: { orderId: all[0] } } } : null);
  pg.onShow(); await tick(30);
  assert.ok(refreshed >= 1, 'onShow 仍会刷新任务卡');
  assert.deepEqual(pg.data.assets.map((a) => a.id), all.slice(1)); assert.equal(pg.data.assetsAll, '');
  // 主卡不在在租仓位里（例如待支付订单）：不去重
  pg.selectComponent = () => ({ refresh: () => Promise.resolve(), data: { main: { orderId: 'NOT_AN_ASSET' } } });
  pg.onShow(); await tick(30);
  assert.deepEqual(pg.data.assets.map((a) => a.id), all.slice(0, 2)); assert.equal(pg.data.assetsAll, '查看全部 3处');
  // 任务卡刷新失败或没有主卡：照常显示，不报错
  pg.selectComponent = () => ({ refresh: () => Promise.reject(new Error('x')), data: { main: null } });
  pg.onShow(); await tick(30);
  assert.equal(pg.data.sys, ''); assert.equal(pg.data.assets.length, 2);
  assert.equal(TA.mine.assets.allSuffix, '处'); assert.match(R('i18n/trade').task.others[1], /^ 处在租仓位/, '任务卡（find 域）与本页同一量词');
});

test('D2-02 / D2-16：任务卡与需求卡之间留一个卡间距（flow-root 阻断外边距折叠）；五格名称放不下时省略', () => {
  const wxss = read('pages/mine/index.wxss');
  assert.match(wxss, /\.mn-task \{ display: flow-root; padding-top: var\(--mk-space-cardGap\); margin-bottom: calc\(0rpx - var\(--mk-space-cardGap\)\); \}/);
  assert.match(wxss, /\.mn-qt \{[^}]*max-width: 100%;[^}]*white-space: nowrap; overflow: hidden; text-overflow: ellipsis; \}/);
});

test('D2-03：常用入口「预约记录」与页面标题一致，仍进预约记录页；D2-10：批量开票不再与「优惠与权益」同用票券图标', async () => {
  fresh(false, false);
  const pg = await page('MINE');
  const needs = pg.data.quick.find((i) => i.k === 'NEEDS');
  assert.equal(needs.t, '预约记录');
  assert.equal(JSON.parse(read('pkg-account/needs/index.json')).navigationBarTitleText, '预约记录');
  env.nav.length = 0; pg.onItem({ currentTarget: { dataset: { k: 'NEEDS' } }, detail: {} }); assert.deepEqual(env.nav, [{ kind: 'navigateTo', url: routes.NEEDS }]);
  const rows = pg.data.groups.reduce((a, g) => a.concat(g.items), pg.data.quick.slice());
  const icons = rows.map((i) => i.icon);
  assert.equal(new Set(icons).size, icons.length, '「我的」页同屏入口图标互不重复');
  rows.forEach((i) => assert.ok(fs.existsSync(path.join(root, i.icon)), i.icon));
  assert.equal(rows.find((i) => i.k === 'ENT_BATCH').icon, '/assets/icons/docs-ink.svg');
  assert.match(read('pkg-account/ent-titles/index.wxml'), /icon="\/assets\/icons\/order-ink\.svg" title="\{\{T\.t\.emptyTitle\}\}"/, '开票抬头空态图标与入口一致');
  assert.match(read('pkg-account/ent-batch/index.wxml'), /icon="\/assets\/icons\/docs-ink\.svg" title="\{\{T\.b\.emptyTitle\}\}"/);
});

test('D2-04 / D2-05 / D2-20：企业认证 —— 「审核时限请咨询客服」只在审核中显示并带联系顾问入口；未通过原因紧跟页头', async () => {
  fresh(true, false);
  await api.submitEntCert(CERT);
  let pg = await page('ENT_CERT');
  assert.equal(pg.data.status, 'reviewing');
  assert.deepEqual(pg.data.steps.map((s) => s.s), ['', '审核时限请咨询客服', '']);
  env.nav.length = 0; pg.onAdvisor(); assert.deepEqual(env.nav.pop(), { kind: 'navigateTo', url: routes.SUPPORT });
  pastReview(); pg.onShow(); await tick();
  assert.equal(pg.data.status, 'verified'); assert.deepEqual(pg.data.steps.map((s) => s.s), ['', '', ''], '已认证不再写审核时限');
  fresh(true, false);
  await api.submitEntCert(Object.assign({}, CERT, { name: '演示' + C.demo.certRejectKeyword + '公司' }));
  pastReview(); pg = await page('ENT_CERT');
  assert.equal(pg.data.status, 'failed'); assert.deepEqual(pg.data.steps.map((s) => [s.cls, s.s]), [['done', ''], ['fail', ''], ['', '']]);
  assert.match(pg.data.reason, /^原因：/);
  const wxml = read('pkg-account/ent-cert/index.wxml');
  assert.equal(wxml.split('class="ec-reason"').length, 2, '原因条只有一处');
  assert.ok(wxml.indexOf('class="ec-reason"') < wxml.indexOf('{{T.c.progress}}'), '原因条在页头，排在认证进度之前');
  assert.match(wxml, /<view wx:if="\{\{item\.s\}\}" class="ec-adv"[^>]*bindtap="onAdvisor"/, '联系顾问入口跟着步骤说明出现（只有审核中那一步有说明）');
  const bw = read('pkg-account/ent-batch/index.wxml');
  assert.equal(bw.split('class="eb-reason"').length, 2); assert.ok(bw.indexOf('class="eb-reason"') < bw.indexOf('{{T.b.progress}}'), '批量开票结果页同一位置');
});

test('D2-12：企业认证 / 开票抬头 / 批量开票的未登录态用统一空态，各有标题与说明，按钮打开登录层', async () => {
  for (const [name, dir, key] of [['ENT_CERT', 'ent-cert', 'cert'], ['ENT_TITLES', 'ent-titles', 'titles'], ['ENT_BATCH', 'ent-batch', 'batch']]) {
    fresh(false, false);
    const pg = await page(name);
    assert.equal(pg.data.loggedIn, false); assert.equal(pg.data.sys, '');
    assert.deepEqual(pg.data.T.guest, TA.ent.guest[key]); assert.ok(pg.data.T.guest.title && pg.data.T.guest.sub, name);
    const wxml = read('pkg-account/' + dir + '/index.wxml');
    assert.match(wxml, /<mk-empty wx:elif="\{\{!loggedIn\}\}" icon="\/assets\/icons\/[a-z]+-ink\.svg" title="\{\{T\.guest\.title\}\}" sub="\{\{T\.guest\.sub\}\}">\s*<button class="mk-btn mk-btn--md mk-empty-btn" hover-class="mk-btn--hover" bindtap="onLogin">/);
    assert.ok(!/ac-login/.test(wxml), name + ' 不再用单行「登录后查看」');
    pg.onLogin(); assert.equal(pg.data.loginVisible, true);
  }
});

test('D2-07：找仓进度「最近参考」卡用需求卡同一套双数字写法（容量 + 租期各带标签），城市是说明行', async () => {
  if (!R('core/config').DEMO_SEED_ORDERS) return;
  fresh(true, true);
  const pg = await page('PROGRESS');
  const r = pg.data.reference; assert.ok(r, '没有当前需求、有订单时出最近参考');
  assert.equal(r.capNum + r.capUnit, r.title); assert.equal(r.termNum, String(r.months)); assert.equal(r.termUnit, TF.unit.month); assert.equal(r.city, state.get().location.city);
  assert.deepEqual(pg.data.F, { capLabel: TF.need.capLabel, termLabel: TF.need.termLabel });
  const wxml = read('pkg-account/progress/index.wxml');
  assert.match(wxml, /class="mk-num lpg-num">\{\{reference\.capNum\}\}<\/text><text class="lpg-u">\{\{reference\.capUnit\}\}<\/text><\/view><text class="mk-sub">\{\{F\.capLabel\}\}/);
  assert.match(wxml, /class="mk-num lpg-num">\{\{reference\.termNum\}\}<\/text><text class="lpg-u">\{\{reference\.termUnit\}\}<\/text><\/view><text class="mk-sub">\{\{F\.termLabel\}\}/);
  assert.ok(!/reference\.(title|sub)\b/.test(wxml));
  pg.onRefind(); assert.equal(state.get().requirement.capacity_m3, r.cap); assert.equal(state.get().requirement.term_months, r.months);
});

test('D2-08 / D2-11 / D2-14：批量开票行订单号与付款日各占一行；收藏空态用线性图标；「下单时可用」不用警示色', () => {
  const bw = read('pkg-account/ent-batch/index.wxml');
  assert.match(bw, /<text class="mk-mute mk-num eb-s eb-blk">\{\{item\.noText\}\}<\/text>\s*<text class="mk-mute mk-num eb-s eb-blk">\{\{item\.paidText\}\}<\/text>/);
  assert.match(read('pkg-account/favorites/index.wxml'), /<mk-empty wx:if="\{\{empty\}\}" icon="\/assets\/icons\/heart-ink\.svg"/);
  assert.equal(rules.tone('ELIGIBILITY_PENDING'), 'info');
  assert.equal(TA.common.optional, '（选填）', 'E2-18：与留资域同一写法'); assert.ok(JSON.stringify(TA).indexOf('（可选）') < 0);
  assert.deepEqual(['ELIGIBLE', 'RESERVED', 'LOCKED', 'AVAILABLE'].map(rules.tone), ['ok', 'warn', 'warn', 'ok'], '其余状态色调不变');
});

test('D2-15：推荐有礼 —— 有邀请码时整框可点即复制；未登录时不出复制图标、点了也不复制', async () => {
  fresh(true, false);
  const copied = []; wx.setClipboardData = (o) => { copied.push(o.data); if (o.success) o.success(); };
  let pg = await page('REFERRAL');
  assert.ok(pg.data.code); pg.onCopy(); pg.onCopy();
  assert.deepEqual(copied, [pg.data.code, pg.data.code]); assert.equal(toasts.pop(), TA.referral.copied);
  const wxml = read('pkg-account/referral/index.wxml');
  assert.match(wxml, /<view wx:if="\{\{loggedIn && code\}\}" class="rf-box mk-row" hover-class="mk-tap--hover" hover-stop-propagation="\{\{true\}\}" bindtap="onCopy" aria-role="button"/);
  const guestBox = wxml.split('<view wx:else class="rf-box mk-row">')[1].split('</view>')[0];
  assert.ok(!/copy-ink|bindtap/.test(guestBox), '未登录的框没有图标也不可点');
  fresh(false, false); copied.length = 0;
  pg = await page('REFERRAL'); pg.onCopy(); assert.equal(copied.length, 0);
});
