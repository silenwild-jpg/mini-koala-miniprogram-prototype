// IMPL-02 视觉升级第二批 · 我的、账户与留资域：M-34 常用入口 5 格、M-36 核对、M-37 推荐有礼主卡、M-38 企业页标题区、M-39 运输页订单摘要、
// 确认框与企业页成功弹窗的退场（PR-243）、顾问卡按钮文字进 i18n（PR-244）。
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
const TA = R('i18n/account'), TL = R('i18n/lead'), LEAVE = R('core/config').motion.leaveMs;
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
const tap = (dataset) => ({ currentTarget: { dataset: dataset || {} }, detail: {} });
const QUICK = ['NEEDS', 'PROGRESS', 'FAVORITES', 'COUPONS', 'MESSAGES'];

test('M-34：「我的」常用入口一行 5 格（图标 + 名称），原两组列表不再出现；游客态 5 格都能进，徽标为 0', async () => {
  fresh(false, false);
  const pg = await page('MINE');
  assert.deepEqual(pg.data.quick.map((i) => i.k), QUICK);
  assert.deepEqual(pg.data.quick.map((i) => i.t), ['预约用仓', '找仓进度', '我的收藏', '优惠与权益', '消息']);
  pg.data.quick.forEach((i) => { assert.match(i.icon, /^\/assets\/icons\/[a-z]+-ink\.svg$/); assert.ok(fs.existsSync(path.join(root, i.icon)), i.icon); assert.equal(i.badge, 0); });
  assert.deepEqual(pg.data.groups.map((g) => g.key), ['finance', 'more'], '「账务与企业」「更多服务」两组不动');
  assert.deepEqual(pg.data.groups.map((g) => g.items.length), [4, 4]);
  assert.ok(!JSON.stringify(pg.data.groups).match(/我的记录|服务与权益/));
  for (const k of QUICK) { env.nav.length = 0; pg.onItem(tap({ k })); assert.deepEqual(env.nav, [{ kind: 'navigateTo', url: routes[k] }], k); }
  const wxml = read('pages/mine/index.wxml'), wxss = read('pages/mine/index.wxss');
  assert.match(wxml, /wx:for="\{\{quick\}\}" wx:key="k" class="mn-q mk-press" hover-class="mk-tap--hover mk-press--hover" hover-stop-propagation="\{\{true\}\}" data-k="\{\{item\.k\}\}" bindtap="onItem"/);
  assert.match(wxml, /wx:if="\{\{item\.badge > 0\}\}" class="mk-num mn-qbadge">\{\{item\.badge\}\}/);
  assert.ok(wxml.indexOf('wx:for="{{quick}}"') < wxml.indexOf('wx:for="{{groups}}"'), '常用入口排在两组列表之前');
  assert.ok(wxml.indexOf('wx:for="{{quick}}"') > wxml.indexOf('<mk-sys-state'), '加载 / 失败 / 断网时与两组列表一起让位给整页状态');
  assert.match(wxss, /\.mn-quick \{ display: flex; \}/); assert.match(wxss, /\.mn-q \{ flex: 1; min-width: 0;/);
});

test('M-34：会员态 —— 只有消息带未读徽标；收藏数、权益数、预约条数、找仓进度仍在数据里（朗读用），多仓时「我的仓位」不受影响', async () => {
  fresh(true, true);
  state.set('requirement', { capacity_m3: 3, input_unit: 'm3', input_value: 3, term_months: 6 });
  state.set('favorites', { stores: ['SIM_BJ01'], units: ['SIM_BJ02_U03'] });
  await api.submitLead({ type: 'booking', address: '朝阳区安贞西里', capacity_m3: 3, term_months: 6 });
  const pg = await page('MINE');
  const q = (k) => pg.data.quick.find((i) => i.k === k);
  const unread = (await api.getMessagesUnread()).unread;
  assert.ok(unread > 0, '演示数据里有未读消息');
  assert.equal(q('MESSAGES').badge, unread); assert.equal(q('MESSAGES').label, '消息 ' + unread + '条未读');
  assert.equal(q('FAVORITES').count, 2); assert.equal(q('FAVORITES').badge, 0, '收藏数不画成红徽标');
  assert.equal(q('COUPONS').badge, 0); assert.equal(q('PROGRESS').s, '3m³ · 6个月'); assert.equal(q('PROGRESS').label, '找仓进度 3m³ · 6个月');
  assert.equal(q('NEEDS').s, '1条记录');
  assert.ok(pg.data.assets.length >= 1, '多处在租：「我的仓位」照旧');
  // 断网：整页状态代替入口区；恢复后重试，5 格与徽标回来
  scenarios.write({ net: 'offline' }); pg.onRetry(); await tick(520);
  assert.ok(pg.data.sys, '断网时是整页状态'); assert.equal(pg.data.quick.length, 5, '数据保留');
  scenarios.write({ net: 'instant' }); pg.onRetry(); await tick(40); assert.equal(pg.data.sys, '');
  assert.equal(pg.data.quick.find((i) => i.k === 'MESSAGES').badge, unread);
  assert.equal(pg.data.quick.length, 5);
});

test('M-34：快速连点同一格与登录后回流不出错；未登录点受限入口仍走登录', async () => {
  fresh(false, false);
  const pg = await page('MINE');
  env.nav.length = 0; pg.onItem(tap({ k: 'MESSAGES' })); pg.onItem(tap({ k: 'MESSAGES' }));
  assert.ok(env.nav.every((n) => n.url === routes.MESSAGES));
  pg.onItem(tap({ k: 'NOPE' })); // 不存在的键不跳转不报错
  pg.setData({ loginVisible: false }); env.nav.length = 0; pg.onItem(tap({ k: 'ENT_CERT' })); assert.equal(pg.data.loginVisible, true); assert.equal(env.nav.length, 0);
  login(); pg.onLoginSuccess(); await tick(30);
  assert.equal(pg.data.quick.length, 5); assert.equal(pg.data.loggedIn, true);
});

test('M-35 / M-36 核对：个人资料无头部；两个动作在各自字段行行尾，提示句是小节底部小字；未登录态与两个流程不变', async () => {
  const wxml = read('pkg-account/profile/index.wxml');
  assert.ok(!/pf-head|pf-avatar|headTitle/.test(wxml));
  assert.match(wxml, /T\.p\.loginPhone[^]*?bindtap="onChangePhone"[^]*?T\.p\.contactPhone[^]*?bindtap="onEditContact"[^]*?class="ac-fine pf-fine">\{\{loggedIn \? T\.p\.noteSigned : T\.p\.noteGuest\}\}/);
  assert.ok(!/<mk-notice/.test(wxml), '卡下不再有独立提示条'); assert.equal((wxml.match(/<button/g) || []).filter(Boolean).length, 6, '账户小节里没有按钮：只剩弹层里的 5 个和退出登录');
  fresh(true, false);
  let pg = await page('PROFILE');
  pg.onChangePhone(); assert.equal(pg.data.changeVisible, true); pg.onChangeClose();
  pg.onEditContact(); assert.equal(pg.data.contactVisible, true); pg.onContactClose();
  fresh(false, false); pg = await page('PROFILE');
  assert.equal(pg.data.loggedIn, false); assert.equal(pg.data.loginPhone, '');
  pg.onChangePhone(); assert.equal(pg.data.changeVisible, false); assert.equal(pg.data.loginVisible, true, '未登录点更换：先登录');
});

test('M-37：推荐有礼一张主卡 —— 状态在上，标题与说明、邀请码、两个按钮依次排；筹备说明是卡下小字；未登录态保留', async () => {
  const wxml = read('pkg-account/referral/index.wxml');
  assert.equal((wxml.match(/class="mk-card\b/g) || []).length, 1); assert.ok(!/mk-sec\b|<mk-notice/.test(wxml), '不再是三块');
  const order = ['T.r.noticeTitle', 'T.r.section', 'T.r.para', 'T.r.codeLabel', 'T.r.codeGuest', 'open-type="share"', 'bindtap="onCopy"', '</view>\n    <text class="ac-fine rf-fine">{{T.r.noticeSub}}'];
  order.reduce((at, k) => { const i = wxml.indexOf(k, at); assert.ok(i > at, k + ' 的位置'); return i; }, -1);
  assert.match(wxml, /class="mk-tag mk-tag--warn rf-state">\{\{T\.r\.noticeTitle\}\}/);
  assert.match(wxml, /wx:if="\{\{!loggedIn\}\}"[^>]*bindtap="onLogin"/); assert.equal((wxml.match(/mk-btn--disabled/g) || []).length, 2, '没有邀请码时两个按钮置灰');
  fresh(true, false);
  let pg = await page('REFERRAL');
  assert.equal(pg.data.sys, ''); assert.ok(pg.data.code); assert.equal(pg.data.T.r.noticeTitle, '活动筹备中'); assert.equal(pg.data.T.r.noticeSub, TA.referral.noticeSub);
  let copied = ''; wx.setClipboardData = (o) => { copied = o.data; o.success && o.success(); };
  pg.onCopy(); assert.equal(copied, pg.data.code); assert.ok(toasts.includes('邀请码已复制'));
  assert.match(pg.onShareAppMessage().path, new RegExp('ref=' + pg.data.code));
  fresh(false, false); pg = await page('REFERRAL');
  assert.equal(pg.data.loggedIn, false); assert.equal(pg.data.code, ''); copied = ''; pg.onCopy(); assert.equal(copied, '');
  pg.onLogin(); assert.equal(pg.data.loginVisible, true);
});

test('M-38：企业页一个标题区（两步共用），「查看预约记录」在标题行右侧，权益一行；两步切换不变', async () => {
  const wxml = read('pkg-lead/business/index.wxml');
  assert.equal((wxml.match(/bindtap="onNeeds"/g) || []).length, 1, '「查看预约记录」只在标题行出现一次');
  assert.match(wxml, /class="ldf-ptitle lbz-head">\s*<view class="mk-between">\s*<text class="\{\{step === 1 \? 'ldf-h1' : 'mk-h2'\}\} mk-grow lbz-ht">\{\{step === 1 \? T\.z\.title : T\.z\.steps\[1\]\}\}<\/text>\s*<view [^>]*bindtap="onNeeds"/);
  assert.ok(!/class="mk-h2">\{\{T\.z\.steps\[[01]\]\}\}/.test(wxml), '表单里不再有单独的小节标题行');
  assert.ok(!/lbz-tags|lbz-tag\b/.test(wxml + read('pkg-lead/business/index.wxss')), '权益不再是会折行的一组标签');
  assert.match(wxml, /<block wx:if="\{\{step === 1\}\}">\s*<text class="ldf-p">\{\{T\.z\.intro\}\}<\/text>\s*<text class="lbz-perks mk-ellipsis">\{\{benefitLine\}\}<\/text>/);
  assert.ok(wxml.indexOf('lbz-head') < wxml.indexOf('ldf-ntc') && wxml.indexOf('lbz-steps') < wxml.indexOf('lbz-head'), '步骤条 → 标题区 → 提示条 → 表单');
  fresh(true, false);
  const pg = await page('BUSINESS');
  assert.equal(pg.data.benefitLine, '可开发票 · 专属顾问 · 长期 / 多仓可协助 · 搬运方案可确认'); assert.equal(pg.data.benefitLine, TL.business.benefits.join(' · '));
  assert.equal(pg.data.step, 1);
  env.nav.length = 0; pg.onNeeds(); assert.deepEqual(env.nav.pop(), { kind: 'navigateTo', url: routes.NEEDS });
  pg.setData({ step: 2 }); pg.onPrev(); assert.equal(pg.data.step, 1, '第二步「修改 / 上一步」回第一步');
  if (pg.onUnload) pg.onUnload();
});

test('PR-243：企业页成功弹窗关闭先退场再移除；退场中重复点不重复跳转；退场途中再次提交成功不被清掉；卸载后不再写数据', async () => {
  const DLG = { title: 't', ack: 'a', fine: '', hoursNote: 'h', no: 'n' };
  const wxml = read('pkg-lead/business/index.wxml');
  assert.match(wxml, /class="lbz-mask mk-fade \{\{dialogLeave\}\}"[^>]*bindtap="onDialogClose">\s*<view class="lbz-dialog mk-fade-in \{\{dialogLeave\}\} mk-leave--zoom"/);
  fresh(true, false);
  let pg = await page('BUSINESS');
  pg.setData({ dialog: DLG });
  pg.onDialogClose(); pg.onDialogClose();
  assert.deepEqual(pg.data.dialog, DLG, '退场期间内容还在'); assert.equal(pg.data.dialogLeave, 'mk-leave');
  await tick(LEAVE + 40); assert.equal(pg.data.dialog, null); assert.equal(pg.data.dialogLeave, '');
  pg.onDialogClose(); assert.equal(pg.data.dialogLeave, '', '没有弹窗时点关闭不起退场');
  // 两个按钮：立即跳转，连点只跳一次
  pg.setData({ dialog: DLG }); env.nav.length = 0; pg.onDialogNeeds(); pg.onDialogNeeds(); pg.onDialogFind();
  assert.deepEqual(env.nav, [{ kind: 'navigateTo', url: routes.NEEDS }]); await tick(LEAVE + 40); assert.equal(pg.data.dialog, null);
  pg.setData({ dialog: DLG }); env.nav.length = 0; pg.onDialogFind(); pg.onDialogFind();
  assert.deepEqual(env.nav, [{ kind: 'switchTab', url: routes.STORES }]); await tick(LEAVE + 40); assert.equal(pg.data.dialog, null);
  // 退场途中打开新的弹窗（再次提交成功走的就是 cancelLeave + setData）
  pg.setData({ dialog: DLG }); pg.onDialogClose();
  R('core/motion').cancelLeave(pg, 'dialog'); pg.setData({ dialog: Object.assign({}, DLG, { title: 'new' }) });
  await tick(LEAVE + 40); assert.equal(pg.data.dialog.title, 'new'); assert.equal(pg.data.dialogLeave, '');
  assert.match(read('pkg-lead/business/index.js'), /motion\.cancelLeave\(this, 'dialog'\);[^\n]*\n\s*this\.setData\(\{\s*status: 'editing'/);
  // 卸载：计时器清掉，之后不再 setData
  pg.onDialogClose(); pg.onUnload(); let wrote = 0; const sd = pg.setData; pg.setData = function (p) { wrote++; return sd.call(pg, p); };
  await tick(LEAVE + 40); assert.equal(wrote, 0); assert.ok(pg.data.dialog, '卸载后的回调没有再写数据');
});

test('PR-243：账户确认框关闭带退场 —— 退场期间文字保留、不再响应点击；退场途中重新打开；卸载后不写数据', async () => {
  const wxml = read('pkg-account/acc-dialog/index.wxml');
  assert.match(wxml, /^<view wx:if="\{\{show\}\}" class="acd-root"/); assert.match(wxml, /class="acd-scrim mk-fade \{\{showLeave\}\}"/); assert.match(wxml, /class="acd-box mk-fade-in \{\{showLeave\}\} mk-leave--zoom"/);
  const P = { visible: true, title: '退出登录？', desc: '说明', cancelText: '取消', confirmText: '退出登录' };
  const c = env.newComponent('pkg-account/acc-dialog/index', P);
  assert.equal(c.data.show, true, '挂载时已是打开'); assert.deepEqual(c.data.snap, { title: '退出登录？', desc: '说明', cancelText: '取消', confirmText: '退出登录', danger: false });
  c.onConfirm(); assert.deepEqual(c.events.map((e) => e.name), ['confirm']);
  // 调用方关闭：visible 变 false 且文字一起清空
  c.setData({ visible: false, title: '', desc: '', cancelText: '', confirmText: '' });
  assert.equal(c.data.show, true); assert.equal(c.data.showLeave, 'mk-leave'); assert.equal(c.data.snap.title, '退出登录？', '退场期间画的还是原来的文字');
  c.onConfirm(); c.onCancel(); assert.equal(c.events.length, 1, '退场中的按钮不再触发事件');
  c.setData({ visible: false }); // 重复关闭不重复计时
  await tick(LEAVE + 40); assert.equal(c.data.show, false); assert.equal(c.data.showLeave, '');
  // 退场途中重新打开（如号码冲突框 → 取消后马上又弹）
  c.setData({ visible: true, title: 'A', desc: '', cancelText: '', confirmText: '好' }); c.setData({ visible: false });
  c.setData({ title: 'B', desc: '', cancelText: '', confirmText: '好' }); c.setData({ visible: true });
  assert.equal(c.data.showLeave, ''); await tick(LEAVE + 40); assert.equal(c.data.show, true, '没有被上一次退场的计时器关掉'); assert.equal(c.data.snap.title, 'B');
  // 卸载
  c.setData({ visible: false }); c.__detach(); await tick(LEAVE + 40); assert.equal(c.data.show, true, '卸载后回调不再写数据');
  const d = env.newComponent('pkg-account/acc-dialog/index', { visible: false }); assert.equal(d.data.show, false);
});

test('PR-243：个人资料页走确认框的各动作结果不变（退出登录、注销拦截、号码冲突）', async () => {
  fresh(true, false);
  const pg = await page('PROFILE');
  pg.onLogout(); assert.equal(pg.data.dialog.visible, true); assert.equal(pg.data.dialog.kind, 'logout');
  pg.onDialogCancel(); assert.equal(pg.data.dialog.visible, false); assert.equal(state.get().session.loggedIn, true);
  pg.onLogout(); pg.onDialogConfirm(); assert.equal(state.get().session.loggedIn, false); assert.deepEqual(env.nav.pop(), { kind: 'switchTab', url: routes.MINE });
});

test('M-39：运输页带订单的表单顶部是订单卡紧凑摘要（保留起止日期），选单列表仍是完整订单卡；不带订单时没有摘要', async () => {
  const wxml = read('pkg-lead/transport/index.wxml');
  assert.match(wxml, /<view wx:if="\{\{view === 'form'\}\}" class="mk-gutter ltr-top ltr-brief"><mk-order-card order="\{\{order\}\}" mode="brief" \/><\/view>/);
  assert.match(wxml, /<mk-order-card order="\{\{item\}\}" variant="list" \/>/);
  assert.equal((wxml.match(/<mk-order-card/g) || []).length, 2);
  fresh(true, true);
  let pg = await page('TRANSPORT');
  assert.equal(pg.data.view, 'pick'); assert.ok(pg.data.orders.length >= 1);
  pg.onPick(tap({ i: 0 })); await tick(30);
  assert.equal(pg.data.view, 'form'); const o = pg.data.order; assert.ok(o && o.store && o.store.name);
  const card = env.newComponent('components/mk-order-card/index', { order: o, mode: 'brief' }); card.setData({ order: o, mode: 'brief' });
  assert.ok(card.data.v && card.data.v.storeName === o.store.name);
  if (o.lease && o.lease.start && o.lease.end) assert.match(card.data.briefSpan, /^\d{4}-\d{2}-\d{2} 至 \d{4}-\d{2}-\d{2}$/, '起止日期都在');
  else assert.match(card.data.briefSpan, /^\d{4}-\d{2}-\d{2}/);
  // 带订单提交流程不变
  pg.onAddress({ detail: { value: '朝阳区安贞西里三区 12 号楼' } }); pg.onDate({ detail: { value: R('core/lead').dateStr(Date.now() + 3 * 86400e3) } });
  await pg.onSubmit(); await tick(30);
  assert.equal(pg.data.view, 'form'); assert.equal(pg.data.records.length, 1); assert.equal(pg.data.address, '');
  fresh(true, false); pg = await page('TRANSPORT');
  assert.equal(pg.data.view, 'pre'); assert.equal(pg.data.order, null);
});

test('PR-244：顾问卡按钮文字从 i18n 取，模板里不写死中文', () => {
  const wxml = read('components/mk-advisor-card/index.wxml');
  assert.ok(!/[一-龥]/.test(wxml)); assert.match(wxml, /open-type="contact">\{\{contact\}\}<\/button>/);
  const c = env.newComponent('components/mk-advisor-card/index', { title: 't' });
  assert.equal(c.data.contact, '立即咨询'); assert.equal(TL.advisorCard.contact, '立即咨询');
});

test('样式：本批新增样式不写裸时长与裸色值', () => {
  const css = ['pages/mine/index', 'pkg-account/referral/index', 'pkg-account/acc-dialog/index', 'pkg-lead/business/index', 'pkg-lead/transport/index'].map((f) => read(f + '.wxss').replace(/\/\*[^]*?\*\//g, '')).join('\n');
  assert.ok(!/\b\d+m?s\b/.test(css)); assert.ok(!/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(css));
});
