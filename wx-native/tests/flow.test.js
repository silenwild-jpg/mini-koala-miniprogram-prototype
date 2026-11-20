// 流程测试：登录守卫（D-198）、未登录不出整期金额、登录层、填容量页、定位。在假的 wx 环境里跑，验证的是代码逻辑与跳转去向，不是微信真实行为。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), routes = R('services/routes'), auth = R('services/auth'), api = R('services/api'), finder = R('services/finder'), location = R('services/location');
env.loadApp();
R('services/mock-ext/_db').db.seeded = true; // 本文件测找仓流程，不带演示订单：演示订单占用的仓位（如 A003）在找仓页不可租（FIX-01 A-08）
const NEED = { capacity_m3: 3.5, input_unit: 'm3', input_value: 3.5, term_months: 6 };
const login = () => state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
const fresh = (need, loggedIn) => { state.reset(); env.nav.length = 0; env.mode = 'ok'; if (need) state.set('requirement', need); if (loggedIn) login(); };
const tick = () => new Promise((r) => setTimeout(r, 10));
const base = (r) => r.replace(/^\//, '');
const RESTRICTED = ['CONFIRM', 'ORDER_DETAIL', 'RENEW', 'EXIT', 'DEPOSIT', 'INVOICE', 'ECONTRACT', 'IDENTITY'];

test('D-198：受限页正好是 8 个，其余 27 个页面不受限', () => {
  const hit = routes.TABLE.filter((t) => auth.isRestricted(t.route)).map((t) => t.name).sort();
  assert.deepEqual(hit, RESTRICTED.slice().sort()); assert.equal(routes.TABLE.length, 35);
  assert.equal(auth.isRestricted(routes.CONFIRM + '?unit=x&term=6'), true); assert.equal(auth.isRestricted('pkg-trade/confirm/index'), true);
  assert.equal(auth.isRestricted(routes.QUICK), false); assert.equal(auth.isRestricted(routes.ORDERS), false);
});
test('D-198：未登录直接到达受限页 → 被带到落点页并打开登录层，用 redirectTo / switchTab（返回键回不到受限页）', () => {
  for (const name of RESTRICTED) for (const need of [NEED, null]) {
    fresh(need, false);
    const pg = env.newPage(base(routes[name]), { unit: 'SIM_BJ01_U03', term: '6', id: 'MK1' });
    assert.equal(pg.__blocked, true, name);
    assert.equal(env.nav.length, 1, name);
    const toMatch = name === 'CONFIRM' && need;
    assert.deepEqual(env.nav[0], toMatch ? { kind: 'redirectTo', url: routes.MATCH + '?login=1' } : { kind: 'switchTab', url: routes.MINE }, name);
    assert.ok(!env.nav.some((n) => n.kind === 'navigateTo'));
    const land = env.newPage(base(toMatch ? routes.MATCH : routes.MINE), toMatch ? { login: '1' } : {});
    assert.equal(land.data.loginVisible, true, name + ' 落点页应打开登录层');
    assert.equal(land.data.loginTip, '请登录');
    assert.equal(state.get().flags.pendingLogin, '', '登录层只自动打开一次');
  }
});
test('D-198：已登录进入受限页放行；非受限页任何状态都不拦', () => {
  for (const t of routes.TABLE) {
    fresh(NEED, true); const a = env.newPage(base(t.route), { id: 'SIM_BJ01' }); assert.ok(!a.__blocked, t.name);
    if (!auth.isRestricted(t.route)) { fresh(NEED, false); const b = env.newPage(base(t.route), { id: 'SIM_BJ01' }); assert.ok(!b.__blocked, t.name); }
  }
});
test('D-198：未登录点「查看报价」「立即下单」在当前页打开登录层，不跳转确认订单', async () => {
  for (const p of ['pages/stores/index', 'pages/match/index']) for (const cta of ['查看报价', '立即下单']) {
    fresh(NEED, false); const pg = env.newPage(p, {}); await tick(); env.nav.length = 0; pg.setData({ loginVisible: false });
    pg.onAction({ detail: { storeId: 'SIM_BJ01', unitId: 'SIM_BJ01_U03', cta } });
    assert.equal(pg.data.loginVisible, true, p + cta); assert.equal(env.nav.length, 0, p + cta);
  }
  fresh(NEED, true); const pg = env.newPage('pages/stores/index', {}); await tick(); env.nav.length = 0;
  pg.onAction({ detail: { storeId: 'SIM_BJ01', unitId: 'SIM_BJ01_U03', cta: '立即下单' } });
  assert.deepEqual(env.nav, [{ kind: 'navigateTo', url: routes.CONFIRM + '?unit=SIM_BJ01_U03&term=6' }]);
});
test('D-198：接口侧拒绝未登录请求', async () => {
  fresh(NEED, false);
  for (const n of ['getQuote', 'createOrder', 'getOrders', 'getOrder', 'payOrder', 'cancelOrder', 'signContract', 'verifyIdentity']) await assert.rejects(api[n]({ unit_ids: ['SIM_BJ01_U03'], months: 6 }), (e) => e.code === 'UNAUTHENTICATED', n);
  login(); const q = await api.getQuote({ unit_ids: ['SIM_BJ01_U03'], months: 6 });
  assert.equal(q.rent_total, 1680); assert.equal(q.expires_at - q.quoted_at, 3 * 3600e3);
});
test('未登录时视图模型里没有任何整期金额；登录后才有', async () => {
  fresh(NEED, false); const stores = await api.getStores({ city: '北京' });
  const out = JSON.stringify([finder.buildList(stores, { requirement: NEED, location: state.get().location, loggedIn: false }), finder.buildStoreDetail(stores[0], { requirement: NEED, location: state.get().location, loggedIn: false })]);
  assert.ok(!/整期|rentTotal|每月多/.test(out)); assert.ok(/月起/.test(out)); assert.ok(!/立即下单/.test(out));
  const inn = JSON.stringify(finder.buildList(stores, { requirement: NEED, location: state.get().location, loggedIn: true }));
  assert.ok(/整期 ¥1,680 · 6个月/.test(inn)); assert.ok(/立即下单/.test(inn));
});
test('门店列表：起价排序采用当前演示库存，登录前只显示参考价',async()=>{
 fresh(null,false);state.patch('location',{status:'granted'});const stores=await api.getStores({city:'北京'}),rec=finder.buildHomeRecommend(stores,{location:state.get().location}); // 已定位才按距离排（A-04）
 assert.equal(rec[0].id,'SIM_BJ01');assert.ok(rec.every(c=>c.fromPrice>0));assert.ok(rec[1].fromPrice<rec[0].fromPrice);
 fresh(NEED,true);const list=finder.buildList(stores,{requirement:NEED,location:state.get().location,loggedIn:true});
 assert.equal(list.cards[0].row.name,'A003 · 3.5m³');assert.equal(list.cards[0].row.price.amount,280);
 assert.equal(finder.buildList(stores,{requirement:{capacity_m3:30,term_months:12},location:state.get().location,loggedIn:true}).mode,'demand');
});

test('登录层：未勾协议提示；短信登录成功后写入登录态；重复发送被限频', async () => {
  fresh(null, false); const c = env.newComponent('components/mk-login-sheet/index', { visible: true });
  c.setData({ phone: '13800008000' }); c.onSend(); assert.equal(c.data.error, '请先阅读并勾选协议');
  c.onToggleAgree(); c.onSend(); await tick(); assert.ok(c.data.countdown > 0); c.__detach();
  c.setData({ code: '12' }); c.onSubmitSms(); await tick(); assert.equal(c.data.error, '请输入 6 位验证码'); assert.equal(auth.isLoggedIn(), false);
  c.setData({ code: '123456' }); c.onSubmitSms(); await tick();
  assert.equal(auth.isLoggedIn(), true); assert.equal(state.get().session.phoneMasked, '138****8000'); assert.ok(c.events.some((e) => e.name === 'success'));
  await assert.rejects(api.sendSmsCode({ phone: '13800008000' }), (e) => e.code === 'RATE_LIMIT');
  await assert.rejects(api.sendSmsCode({ phone: '123' }), (e) => e.code === 'INVALID');
});
test('登录层：微信取号失败或额度不足时隐藏微信按钮并引导短信；用户拒绝则留在原处', () => {
  fresh(null, false); const c = env.newComponent('components/mk-login-sheet/index', { visible: true });
  c.onGetPhone({ detail: { errMsg: 'getPhoneNumber:fail user deny' } }); assert.equal(c.data.wechatOk, true); assert.equal(c.data.mode, 'entry');
  c.onGetPhone({ detail: { errMsg: 'getPhoneNumber:fail', errno: 1400001 } }); assert.equal(c.data.wechatOk, false); assert.equal(c.data.mode, 'sms');
});
test('填容量页：归一容量与租期贯通推荐，大容量仍然自助',()=>{
 fresh(null,false);const pg=env.newPage('pages/estimate/capacity',{});
 pg.onInput({detail:{value:'3.01'}});pg.onTerm({detail:{months:6}});env.nav.length=0;pg.onSubmit();
 assert.equal(state.get().requirement.capacity_m3,3.1);assert.equal(state.get().requirement.term_months,6);assert.equal(state.get().requirement.input_raw,'3.01');
 assert.equal(env.nav[0].url,routes.MATCH);
 pg.onInput({detail:{value:'30'}});pg.onSubmit();assert.equal(state.get().requirement.capacity_m3,30);assert.equal(pg.data.sales,false);
 pg.onInput({detail:{value:'0.11'}});pg.onSubmit();assert.equal(state.get().requirement.capacity_m3,0.5);
 pg.onUnit({currentTarget:{dataset:{u:'m2'}}});pg.onInput({detail:{value:'2'}});assert.equal(pg.data.approx,'约 5 m³');
 pg.onInput({detail:{value:'201'}});assert.equal(pg.data.ok,false);
});

test('没有需求时进入仓位推荐页 → 带去填容量页', () => { fresh(null, false); env.newPage('pages/match/index', {}); assert.deepEqual(env.nav, [{ kind: 'redirectTo', url: routes.CAPACITY }]); });
test('定位：首页只自动申请一次；被拒后状态为 denied', async () => {
  fresh(null, false); env.mode = 'fail'; assert.equal(await location.requestOnce(), 'denied'); assert.equal(state.get().location.status, 'denied');
  env.mode = 'ok'; assert.equal(await location.requestOnce(), 'denied', '第二次不再自动申请');
  assert.equal(await location.enable(), 'granted', '用户主动开启：先去设置页，再取位置');
});
test('用仓位置：切换城市后全站读到同一份；最近使用最多 3 个', () => {
  fresh(null, false); state.setLocation({ city: '上海', kind: 'city', label: '' }); assert.equal(state.get().location.city, '上海'); assert.equal(state.get().recents.length, 0);
  ['a', 'b', 'c', 'd', 'b'].forEach((l) => state.setLocation({ kind: 'area', label: l })); assert.deepEqual(state.get().recents.map((x) => x.label), ['b', 'd', 'c']);
});
test('界面用词：代码与文案里不出现已废止的叫法', () => {
  const fs = require('fs'); const bad = /退租|验收|身份验证|用仓地址|预约与咨询|提交用仓需求|送搬运|仓号 A|30m³ 以上|租赁中|专属客服/; const hits = [];
  (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { if (f !== 'mock') walk(p); } else if (/\.(wxml|js)$/.test(f)) { fs.readFileSync(p, 'utf8').split('\n').forEach((line, i) => { if (bad.test(line.replace(/\/\/.*$/, ''))) hits.push(path.relative(root, p) + ':' + (i + 1)); }); } } })(root);
  assert.deepEqual(hits, []);
});
