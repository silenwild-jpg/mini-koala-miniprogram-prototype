// IMPL-01 视觉升级批 · 账户与留资域：个人资料头部删除（M-35 / M-36）、信息行按用途分行、去卡片化、动效状态（收藏移除的淡出）。
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
const CA = R('core/config-account'), TA = R('i18n/account'), TL = R('i18n/lead');
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
const ACC = ['messages', 'needs', 'progress', 'favorites', 'coupons', 'profile', 'referral', 'brand', 'ent-cert', 'ent-titles', 'ent-batch'].map((n) => 'pkg-account/' + n + '/index');
const LEAD = ['booking', 'business', 'estore', 'support', 'transport'].map((n) => 'pkg-lead/' + n + '/index');

test('M-35：个人资料页头部（头像 + 标题 + 脱敏手机号）已删，页面数据不再带头部字段', async () => {
  fresh(true, false);
  const pg = await page('PROFILE');
  const wxml = read('pkg-account/profile/index.wxml'), wxss = read('pkg-account/profile/index.wxss');
  assert.ok(!/pf-head|pf-avatar|headTitle|headSub|user-sub\.svg/.test(wxml + wxss + read('pkg-account/profile/index.js')));
  assert.equal(pg.data.headTitle, undefined); assert.equal(pg.data.headSub, undefined);
  assert.equal(pg.data.loginPhone, '138****8000', '手机号只在「登录手机号」一行');
});

test('M-36：两个动作并入各自字段行行尾，提示句并入小节底部小字；动作仍能打开各自弹层', async () => {
  fresh(true, false);
  const pg = await page('PROFILE');
  const wxml = read('pkg-account/profile/index.wxml');
  assert.ok(!/<button[^>]*bind:?tap="on(EditContact|ChangePhone)"/.test(wxml), '卡底双按钮已去掉');
  assert.ok(!/<mk-notice/.test(wxml), '独立提示条已去掉');
  const row = (label) => { const i = wxml.indexOf('{{T.p.' + label + '}}'); return wxml.slice(i, wxml.indexOf('</view>\n      </view>', i)); };
  assert.match(row('loginPhone'), /bindtap="onChangePhone"[^>]*aria-label="\{\{T\.p\.changePhone\}\}"/); assert.match(row('loginPhone'), /T\.p\.changeShort/);
  assert.match(row('contactPhone'), /bindtap="onEditContact"[^>]*aria-label="\{\{T\.p\.editContact\}\}"/); assert.match(row('contactPhone'), /T\.p\.editShort/);
  assert.match(wxml, /class="ac-fine pf-fine">\{\{loggedIn \? T\.p\.noteSigned : T\.p\.noteGuest\}\}/);
  assert.deepEqual([TA.profile.changeShort, TA.profile.editShort], ['更换', '修改']);
  pg.onChangePhone(); assert.equal(pg.data.changeVisible, true); pg.onChangeClose();
  pg.onEditContact(); assert.equal(pg.data.contactVisible, true);
});

test('M-36：未登录时「登录手机号」行尾是「登录 / 注册」，点了打开登录层；「更换」不出现', async () => {
  fresh(false, false);
  const pg = await page('PROFILE');
  assert.match(read('pkg-account/profile/index.wxml'), /<view wx:else class="ac-tail"[^>]*bindtap="onLogin"/);
  pg.onLogin(); assert.equal(pg.data.loginVisible, true);
  pg.onChangePhone(); assert.equal(pg.data.changeVisible, false, '未登录不能更换登录手机号');
});

test('信息行：预约记录按用途分行——位置、规格（容量 · 租期）、联系电话各自成行，不再串成一行', async () => {
  fresh(true, false);
  await api.submitLead({ type: 'booking', address: '朝阳区安贞西里', capacity_m3: 3, term_months: 6, note: '周末搬入' });
  await api.submitLead({ type: 'visit', store_id: 'SIM_BJ01', time_slot: '下午', capacity_m3: 2 });
  const pg = await page('NEEDS');
  const b = pg.data.list.find((x) => !x.visit), v = pg.data.list.find((x) => x.visit);
  assert.deepEqual([b.loc, b.addr, b.detail, b.extra, b.phone, b.note], ['朝阳区安贞西里', '', '3m³ · 6个月', '', '138****8000', '备注：周末搬入']);
  assert.ok(v.addr && v.addr !== v.loc, '看仓记录：门店地址紧跟门店名'); assert.equal(v.extra, '意向容量 2m³'); assert.equal(v.phone, '138****8000');
  [b, v].forEach((c) => ['loc', 'addr', 'extra', 'phone', 'note'].forEach((k) => assert.ok(!/ · /.test(c[k]), k + ' 里不再有分隔符')));
  const wxml = read('pkg-account/needs/index.wxml');
  assert.match(wxml, /pin-ink\.svg[^]*item\.loc[^]*item\.addr[^]*item\.detail[^]*phone-ink\.svg[^]*item\.phone[^]*item\.note/);
});

test('信息行：收藏页门店卡按全站位置行写法（距离 · 区名 · 商圈，距离单独一个字段）；仓位编号成标签、尺寸另一行', async () => {
  fresh(true, false);
  state.patch('location', { status: 'granted', kind: 'point', city: '北京', noStoreCity: '' });
  state.set('favorites', { stores: ['SIM_BJ01', 'SIM_BJ05'], units: ['SIM_BJ01_U03'] });
  const pg = await page('FAVORITES');
  const s = pg.data.stores[0], u = pg.data.units[0];
  assert.match(s.kmText, /^\d+(\.\d)?km$/); assert.equal(s.place, '朝阳区 · 安贞'); assert.ok(!/km/.test(s.place), '距离不进区名串');
  assert.deepEqual([u.code, u.vol], ['A003', '3.5m³']); assert.match(u.dims, /^[\d.]+ × [\d.]+ × [\d.]+m$/);
  const wxml = read('pkg-account/favorites/index.wxml');
  assert.match(wxml, /class="mk-num fv-km">\{\{item\.kmText\}\}<\/text>\s*<text wx:if="\{\{item\.kmText && item\.place\}\}" class="fv-dot"> · <\/text>/);
  assert.match(wxml, /class="mk-unitno fv-no">\{\{item\.code\}\}/);
  assert.ok(!/item\.sub\b/.test(wxml)); assert.equal(TA.favorites.unitGoneSub, '可看同店其他仓位', '失效说明不再以分隔符开头');
  // 没有定位时只写区名 · 商圈
  state.patch('location', { status: '', kind: 'city', city: '北京', noStoreCity: '' });
  const p2 = await page('FAVORITES'); assert.equal(p2.data.stores[0].kmText, ''); assert.equal(p2.data.stores[0].place, '朝阳区 · 安贞');
});

test('动效：收藏页移除失效条目——收藏当场改掉，条目先标 leaving 再从列表拿掉；淡出中连点不重复处理', async () => {
  fresh(true, false);
  state.set('favorites', { stores: ['SIM_BJ01', 'SIM_BJ05'], units: [] });
  const pg = await page('FAVORITES');
  const first = pg.onRemove(tap({ kind: 'stores', id: 'SIM_BJ05' }));
  assert.deepEqual(state.get().favorites.stores, ['SIM_BJ01'], '收藏状态不等动画');
  assert.equal(pg.data.stores.find((x) => x.id === 'SIM_BJ05').leaving, true, '条目还在列表里，带淡出标记');
  const n = toasts.length;
  await pg.onRemove(tap({ kind: 'stores', id: 'SIM_BJ05' })); await pg.onRemove(tap({ kind: 'stores', id: 'SIM_BJ05' }));
  assert.equal(toasts.length, n, '淡出中再点不重复提示'); assert.deepEqual(state.get().favorites.stores, ['SIM_BJ01'], '也不会把别的收藏切掉');
  await first;
  assert.deepEqual(pg.data.stores.map((x) => x.id), ['SIM_BJ01']); assert.equal((pg._timers || []).length, 0);
  assert.match(read('pkg-account/favorites/index.wxml'), /item\.leaving \? 'ac-leave' : ''/);
  assert.match(read('pkg-account/acc.wxss'), /\.ac-leave \{[^}]*opacity: 0;[^}]*transition:[^}]*--mk-motion-base/);
  assert.ok(CA.removeFadeMs >= 100 && CA.removeFadeMs <= 300, '淡出时长在 100–300ms 内');
});

test('动效：收藏页淡出途中退出页面——定时器清掉，不再写数据；收藏已经移除', async () => {
  fresh(true, false);
  state.set('favorites', { stores: ['SIM_BJ05'], units: ['SIM_BJ01_U02'] });
  const pg = await page('FAVORITES');
  const p = pg.onRemove(tap({ kind: 'units', id: 'SIM_BJ01_U02' }));
  let writes = 0; const set = pg.setData.bind(pg); pg.setData = (d) => { writes += 1; return set(d); };
  pg.onUnload();
  await tick(CA.removeFadeMs + 60);
  assert.equal(writes, 0, '卸载后没有再 setData'); assert.deepEqual(state.get().favorites.units, []); assert.equal((pg._timers || []).length, 0);
  assert.equal(await Promise.race([p.then(() => 'done'), tick(20).then(() => 'pending')]), 'pending', '被清掉的那次不再回调');
});

test('信息行：「我的仓位」与订单卡同一写法（编号标签 + 容量；租期与日期拆开）；找仓进度的「容量 · 租期」保留分隔符', async () => {
  fresh(true, true);
  state.set('requirement', { capacity_m3: 3, input_unit: 'm3', input_value: 3, term_months: 6 });
  const pg = await page('MINE');
  assert.ok(pg.data.assets.length >= 1);
  pg.data.assets.forEach((a) => { assert.ok(a.codes.length >= 1); assert.match(a.vol, /^[\d.]+m³$/); assert.match(a.term, /^\d+个月$/); assert.ok(!/ · /.test(a.term + a.span)); assert.equal(a.line, undefined); });
  const progress = pg.data.groups.reduce((a, g) => a.concat(g.items), []).find((i) => i.k === 'PROGRESS');
  assert.equal(progress.s, '3m³ · 6个月');
  const wxml = read('pages/mine/index.wxml');
  assert.match(wxml, /class="mk-unitno mn-no">\{\{c\}\}/); assert.ok(!/item\.line\b/.test(wxml));
});

test('信息行：找仓进度已选仓位拆成编号标签 + 容量 + 租期；企业页摘要里物品类型另起一行；运输预约的日期与电话分行', async () => {
  fresh(false, false);
  state.set('selection', { store_id: 'SIM_BJ01', store_name: '安贞·富仁名苑店', unit_ids: ['SIM_BJ01_U03'], unit_name: 'A003 · 3.5m³', term_months: 6 });
  const pg = await page('PROGRESS');
  assert.deepEqual(pg.data.selected.unit, { code: 'A003', vol: '3.5m³', term: '6个月' });
  state.set('selection', { store_id: 'SIM_BJ01', store_name: '安贞·富仁名苑店', unit_ids: ['SIM_BJ01_U01', 'SIM_BJ01_U03'], unit_name: 'A001 + A003', term_months: 12 });
  const p2 = await page('PROGRESS');
  assert.deepEqual(p2.data.selected.unit, { code: '', vol: 'A001 + A003', term: '12个月' }, '组合仓整段显示，不拆标签');
  const w = read('pkg-account/progress/index.wxml');
  assert.ok(!/\.line\}\}/.test(w)); assert.match(w, /class="mk-unitno lpg-no">\{\{selected\.unit\.code\}\}/);
  assert.match(read('pkg-lead/business/index.wxml'), /\{\{sumText\}\}<\/text><text wx:if="\{\{typeSum\}\}"/);
  assert.match(read('pkg-lead/transport/index.wxml'), /saved\.address[^]*saved\.date[^]*saved\.phone/); assert.ok(!/saved\.sub/.test(read('pkg-lead/transport/index.wxml')));
});

test('信息行：预约页意向门店的距离与地址分两个字段，同一行、距离紧跟定位图标', async () => {
  fresh(true, false);
  state.patch('location', { status: 'granted', kind: 'point', city: '北京', noStoreCity: '' });
  const pg = await page('BOOKING', { store: 'SIM_BJ01' });
  assert.ok(pg.data.store && pg.data.store.addr && !/km/.test(pg.data.store.addr)); assert.equal(pg.data.store.sub, undefined);
  assert.match(read('pkg-lead/booking/index.wxml'), /pin-sub\.svg" \/><text wx:if="\{\{store\.km\}\}" class="mk-num lbk-km">\{\{store\.km\}\}<\/text><text class="mk-sub mk-ellipsis mk-grow">\{\{store\.addr\}\}/);
});

test('分隔符：账户与留资域的界面文字里没有 •；分享标题里的「 · 」保留', () => {
  const files = ACC.concat(LEAD, ['pages/mine/index']).reduce((a, b) => a.concat([b + '.wxml', b + '.js']), []).concat(['i18n/account.js', 'i18n/lead.js', 'pkg-lead/components/lead-ack/index.wxml', 'pkg-lead/components/lead-phone/index.wxml', 'components/mk-login-sheet/index.wxml']);
  files.forEach((f) => assert.ok(!/[•｜]/.test(read(f).replace(/^\s*\/\/.*$/gm, '')), f + ' 里还有 • 或 ｜'));
  assert.equal(TA.brand.shareTitle, '迷你考拉仓 · 关于我们'); assert.equal(TL.share.booking, '预约用仓 · 迷你考拉仓');
});

test('去卡片化：账户键值 / 说明 / 表单页与留资页用白底 + 通栏小节；以可点对象为主的列表页（收藏、预约记录、找仓进度）保留卡片', () => {
  ['profile', 'messages', 'coupons', 'referral', 'brand', 'ent-cert', 'ent-batch'].forEach((n) => assert.match(read('pkg-account/' + n + '/index.wxml'), /^<view class="mk-page mk-page--plain">/, n));
  ['booking', 'business', 'estore', 'support'].forEach((n) => assert.match(read('pkg-lead/' + n + '/index.wxml'), /^<view class="mk-page mk-page--plain\b/, n));
  assert.match(read('pages/mine/index.wxml'), /^<view class="mk-page mk-page--plain">/);
  ['profile', 'coupons', 'referral', 'brand', 'ent-cert', 'ent-batch'].forEach((n) => { const w = read('pkg-account/' + n + '/index.wxml'); assert.ok(!/class="mk-card\b/.test(w), n + ' 不再有描边卡'); assert.ok((w.match(/class="mk-sec\b/g) || []).length >= 2, n); });
  ['estore', 'support'].forEach((n) => assert.ok(!/class="mk-card\b/.test(read('pkg-lead/' + n + '/index.wxml')), n));
  assert.ok(!/class="mk-card\b/.test(read('pkg-account/messages/index.wxml')), '消息列表不再包卡');
  ['favorites', 'needs', 'progress'].forEach((n) => { const w = read('pkg-account/' + n + '/index.wxml'); assert.match(w, /^<view class="mk-page">/, n); assert.match(w, /class="mk-card\b/, n); });
  // 我的：四组入口是小节；任务卡 / 需求卡 / 「尚未用仓」卡保留
  const mine = read('pages/mine/index.wxml');
  assert.match(mine, /<view wx:for="\{\{groups\}\}" wx:key="key" class="mk-sec">/); assert.match(mine, /class="mk-card mn-card mn-new/);
  // 卡内不套描边小卡：表单里的摘要用浅灰底块
  assert.match(read('pkg-lead/lead.wxss'), /\.ldf-block \{[^}]*background: var\(--mk-color-canvas-sunken\)/); assert.ok(!/\.ldf-block \{[^}]*border:/.test(read('pkg-lead/lead.wxss')));
});

test('去卡片化：两行以内的行组不画发丝线；多于两行的保留并缩进到文字左缘（mk-cell 的 inset）', () => {
  const cell = env.newComponent('components/mk-cell/index', {});
  assert.equal(cell.data.inset, false, '默认不缩进，旧调用方不变');
  const w = read('components/mk-cell/index.wxml');
  assert.match(w, /divider \? \(inset && icon \? 'cel--inset' : 'cel--line'\) : ''/);
  assert.match(read('components/mk-cell/index.wxss'), /\.cel--inset::before \{[^}]*left: calc\(var\(--mk-size-iconMd\) \+ var\(--mk-space-3\)\)/);
  assert.match(read('pages/mine/index.wxml'), /divider="\{\{ix > 0 && item\.items\.length > 2\}\}" inset="\{\{true\}\}"/);
  assert.match(read('pkg-account/profile/index.wxml'), /title="\{\{T\.p\.deleteAccount\}\}" divider="\{\{false\}\}"/);
  assert.match(read('pkg-account/acc.wxss'), /\.ac-noline \.ac-kv \+ \.ac-kv \{ border-top: 0; \}/);
  assert.match(read('pkg-account/profile/index.wxml'), /class="mk-sec ac-noline"/);
});

test('动效：列表前几项进场渐显、未读点过渡、成功态淡入、居中确认框淡入都用全站底座类，不另起时长', () => {
  const fade = /index < 6 \? 'mk-fade-in mk-fade-in--d' \+ index : ''/;
  ['messages', 'needs', 'favorites', 'coupons', 'ent-titles'].forEach((n) => assert.match(read('pkg-account/' + n + '/index.wxml'), fade, n));
  assert.match(read('pkg-account/messages/index.wxml'), /class="ms-dot mk-ease /);
  assert.match(read('pkg-lead/booking/index.wxml'), /class="lbk-result mk-fade-in"/);
  assert.match(read('pkg-lead/components/lead-ack/index.wxml'), /class="lak-card mk-fade-in"/);
  assert.match(read('pkg-lead/business/index.wxml'), /class="lbz-mask mk-fade"[^]*class="lbz-dialog mk-fade-in"/);
  assert.match(read('pkg-account/acc-dialog/index.wxml'), /class="acd-scrim mk-fade"[^]*class="acd-box mk-fade-in"/);
  assert.match(read('components/mk-login-sheet/index.wxml'), /^<mk-sheet visible="\{\{visible\}\}"/, '登录弹层走 mk-sheet 的进出场');
  const css = ACC.concat(LEAD).map((f) => read(f + '.wxss')).join('\n') + read('pkg-account/acc.wxss') + read('pkg-lead/lead.wxss') + read('pages/mine/index.wxss');
  assert.ok(!/\b\d+m?s\b/.test(css.replace(/\/\*[^]*?\*\//g, '')), '域内样式不写裸时长，只用 --mk-motion-*');
});

test('动效：企业页成功弹窗快速连点「关闭」与卸载后状态正确', async () => {
  fresh(true, false);
  const pg = await page('BUSINESS');
  pg.setData({ dialog: { title: 't', ack: 'a', fine: '', hoursNote: 'h', no: 'n' } });
  pg.onDialogClose(); pg.onDialogClose(); pg.onDialogClose();
  assert.equal(pg.data.dialog, null);
  assert.doesNotThrow(() => { if (pg.onUnload) pg.onUnload(); });
});
