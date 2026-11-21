// REVIEW-02 回归评审修复 · 留资域与公共组件：提示条操作文字（E2-03 / B2-07 / D2-06）、企业页失败标题（E2-04）、提示条正文不重复标题（E2-19）、
// 可选标记统一（E2-18）、运输页必填标记与只读电话（E2-06）、成功图标统一（E2-07）、按钮写法（E2-21）、选择关联订单说明（E2-22）、状态标签公共写法（E2-09）。
// 在假的 wx 环境里跑，验证的是代码逻辑与模板结构，不是微信真实渲染。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), routes = R('services/routes'), scenarios = R('mock/scenarios');
const { db } = R('services/mock-ext/_db');
const TL = R('i18n/lead');
env.loadApp();
const toasts = [];
wx.showToast = (o) => toasts.push(o.title);
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 15));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const base = (r) => r.replace(/^\//, '');
const NEED = { capacity_m3: 3.5, input_unit: 'm3', input_value: 3.5, term_months: 6, source: 'manual' };
function fresh(loggedIn, events) {
  state.reset(); env.nav.length = 0; env.mode = 'ok'; toasts.length = 0;
  db.orders.length = 0; db.leads.length = 0; db.messages.length = 0; db.seq = 0; db.seeded = true; db.kv = {}; db.sms = {};
  scenarios.write({ scenario: '', stock: 'normal', events: events || {}, net: 'instant' });
  state.set('requirement', NEED);
  if (loggedIn) state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
}
const page = async (name, q) => { const pg = env.newPage(base(routes[name]), q || {}); await tick(30); return pg; };

test('E2-03：提示条的操作文字用链接色、带图标箭头，仍触发 link 事件；全部带 link 的调用方都绑了 bind:link', () => {
  const wxml = read('components/mk-notice/index.wxml'), wxss = read('components/mk-notice/index.wxss');
  assert.match(wxml, /class="ntc-link"[^>]*bindtap="onLink"[^>]*aria-role="link"/);
  assert.match(wxml, /class="ntc-link"[^>]*hover-class="mk-tap--hover"/);
  assert.match(wxml, /ntc-chev" src="\/assets\/icons\/chev-brand\.svg"/);
  assert.ok(fs.existsSync(path.join(root, 'assets/icons/chev-brand.svg')));
  const rule = wxss.split('\n').find((l) => l.indexOf('.ntc-link {') === 0);
  assert.match(rule, /color: var\(--mk-color-brand-text\)/); assert.doesNotMatch(rule, /ink-primary/);
  const tokens = read('app.wxss');
  assert.match(tokens, /\.mk-link \{ color: var\(--mk-color-brand-text\)/, '与 mk-link 同色');
  // 调用方：传了 link 就必须接 bind:link（演示工具页的样例除外）
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.wxml') ? [path.join(d, e.name)] : []);
  let n = 0;
  walk(root).forEach((f) => (fs.readFileSync(f, 'utf8').match(/<mk-notice[^>]*\slink="[^"]+"[^>]*>/g) || []).forEach((tag) => { n++; if (f.indexOf('pkg-dev') < 0) assert.match(tag, /bind:link="\w+"/, f); }));
  assert.ok(n >= 9, '带操作文字的提示条调用方 ' + n + ' 处');
});

test('E2-19：预约页提交失败 / 未确认时，提示条正文不再重复标题；轻提示仍用整句', async () => {
  fresh(true, { lead_submit_fail: true });
  let pg = await page('BOOKING'); pg.onAddress({ detail: { value: '朝阳区安贞西里三区' } }); await pg.onSubmit(); await tick(30);
  assert.equal(pg.data.status, 'failed'); assert.equal(pg.data.statusTitle, '暂时无法提交'); assert.equal(pg.data.statusMsg, '请重试或返回修改。'); assert.equal(pg.data.statusBtn, '重试提交');
  fresh(true, { lead_submit_timeout: true });
  pg = await page('BOOKING'); pg.onAddress({ detail: { value: '朝阳区安贞西里三区' } }); await pg.onSubmit(); await tick(30);
  assert.equal(pg.data.status, 'unknown'); assert.equal(pg.data.statusTitle, '提交结果暂未确认'); assert.equal(pg.data.statusMsg, '请勿重复提交。'); assert.equal(pg.data.statusBtn, '核对提交结果');
  [[TL.common.failedTitle, TL.common.failedHint], [TL.common.unknownTitle, TL.common.unknownHint]].forEach(([t, h]) => assert.ok(h.indexOf(t) < 0));
  assert.equal(TL.common.failedMsg, '暂时无法提交，请重试或返回修改。', '运输 / 联系顾问的轻提示仍是整句');
});

test('E2-04：企业页新提交失败标题是「暂时无法提交」，补充已有需求时才是「暂时无法保存」', () => {
  const wxml = read('pkg-lead/business/index.wxml');
  assert.match(wxml, /status === 'failed'[^>]*title="\{\{editing \? T\.z\.failedTitle : T\.c\.failedTitle\}\}" text="\{\{T\.c\.failedHint\}\}"/);
  assert.match(wxml, /status === 'unknown'[^>]*title="\{\{T\.c\.unknownTitle\}\}" text="\{\{T\.c\.unknownHint\}\}"/);
  assert.equal(TL.common.failedTitle, '暂时无法提交'); assert.equal(TL.business.failedTitle, '暂时无法保存');
});

test('E2-18：可选标记只有「（选填）」一种写法；企业第二步「预计用仓时间」带标记', () => {
  assert.equal(TL.common.optional, '（选填）'); assert.equal(TL.common.optionalFill, '（选填）'); assert.equal(TL.visit.optional, '（选填）');
  assert.ok(JSON.stringify(TL).indexOf('（可选）') < 0);
  assert.match(read('pkg-lead/business/index.wxml'), /label="\{\{T\.z\.when\}\}" mark="\{\{T\.c\.optionalFill\}\}"/);
});

test('E2-05 / E2-07：「存放物品」不用人像图标；预约结果页与企业成功弹窗用同一种成功图标', () => {
  const bk = read('pkg-lead/booking/index.wxml'), bz = read('pkg-lead/business/index.wxml');
  const row = bk.split('\n').find((l) => l.indexOf('bindtap="onOpenItems"') >= 0);
  assert.match(row, /bag-ink\.svg/); assert.ok(bk.indexOf('user-ink.svg') < 0);
  assert.ok(fs.existsSync(path.join(root, 'assets/icons/bag-ink.svg')));
  [bk, bz].forEach((s) => assert.match(s, /class="ldf-okic"><image class="mk-icon mk-icon--md" src="\/assets\/icons\/check-brand\.svg"/));
  assert.ok(bk.indexOf('lbk-ic') < 0 && read('pkg-lead/booking/index.wxss').indexOf('lbk-ic') < 0);
  const ok = read('pkg-lead/lead.wxss').split('\n').find((l) => l.indexOf('.ldf-okic {') === 0), ack = read('pkg-lead/components/lead-ack/index.wxss');
  assert.match(ok, /width: 112rpx; height: 112rpx/); assert.match(ok, /brand-tint/); assert.match(ack, /width: 112rpx; height: 112rpx/);
});

test('E2-06：运输页三项带必填标记；日期行日历在左、箭头在右；已登录时电话是只读样式加「已验证」，提交不带手填号', async () => {
  const wxml = read('pkg-lead/transport/index.wxml');
  assert.equal((wxml.match(/mark="\{\{T\.c\.required\}\}" mark-tone="req"/g) || []).length, 3);
  assert.match(wxml, /<picker mode="date"[^>]*>\s*<view class="ldf-input[^>]*><image class="mk-icon ltr-lead" src="\/assets\/icons\/cal-ink\.svg" \/>.*chev-mute\.svg/);
  assert.match(wxml, /wx:if="\{\{phoneMasked\}\}" class="ldf-input ldf-input--ro">.*mk-tag mk-tag--end mk-tag--ok">\{\{T\.verified\}\}/);
  fresh(true);
  const pg = await page('TRANSPORT');
  assert.equal(pg.data.view, 'pre'); assert.equal(pg.data.phoneMasked, '138****8000'); assert.equal(pg.data.T.verified, '已验证');
  pg.onAddress({ detail: { value: '朝阳区安贞西里三区' } }); pg.onDate({ detail: { value: '2099-01-01' } });
  await pg.onSubmit(); await tick(30);
  assert.equal(pg.data.view, 'saved'); assert.equal(db.leads.length, 1, '只读电话不影响提交');
  fresh(false);
  const g = await page('TRANSPORT'); g.onSubmit(); await tick();
  assert.equal(g.data.phoneMasked, ''); assert.equal(g.data.errPhone, '请填写有效联系电话', '未登录仍是手填并校验');
});

test('E2-22：选择关联订单的标题下有一句说明', () => {
  assert.ok(TL.transport.pickSub && TL.transport.pickSub.indexOf('顾问确认') > 0);
  assert.match(read('pkg-lead/transport/index.wxml'), /\{\{T\.x\.pickTitle\}\}<\/text><text class="mk-sub ltr-picks">\{\{T\.x\.pickSub\}\}/);
});

test('E2-21：「使用微信手机号」用公共中性按钮；估算页顾问弹层两个按钮带按压类', () => {
  const w = read('pkg-lead/components/lead-phone/index.wxml'), s = read('pkg-lead/components/lead-phone/index.wxss');
  assert.match(w, /<button class="mk-btn mk-btn--plain lph-wx \{\{error \? 'lph-wx--err' : ''\}\}" hover-class="mk-btn--plainHover"/);
  assert.doesNotMatch(s, /^\.lph-wx \{/m); assert.match(s, /^\.mk-btn\.mk-btn\.lph-wx--err \{ border: var\(--mk-border-error\); \}/m);
  const it = read('pkg-estimate/items/index.wxml').split('\n').find((l) => l.indexOf('advisoryVisible') >= 0);
  assert.match(it, /class="mk-bare mk-link" hover-class="mk-bare--hover" open-type="contact"/); assert.match(it, /class="mk-btn" hover-class="mk-btn--hover" bindtap="onAdvisoryContinue"/);
});

test('E2-09：留资与演示工具页不自定义状态标签，只用公共 mk-tag；公共层有页头用的大一号 mk-tag--lg', () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.wxss') ? [path.join(d, e.name)] : []);
  ['pkg-lead', 'pkg-dev'].forEach((d) => walk(path.join(root, d)).forEach((f) => assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /^\.[a-z]+-(tag|badge)\b/m, f)));
  assert.match(read('app.wxss'), /^\.mk-tag--lg \{ height: 48rpx; font-size: var\(--mk-font-size-sm\); \}/m);
});
