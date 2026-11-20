// 线索域测试（W34）：线索字段、服务时段与受理文案、企业页容量区间与范围校验、联系电话与登录、订阅取消仍提交、
// 失败重试 / 回执超时不重复建单、预约记录的撤回与修改、运输与咨询校验、找仓进度。
// 在假的 wx 环境里跑，验证的是代码逻辑与跳转去向，不是微信真实行为。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), routes = R('services/routes'), api = R('services/api'), C = R('core/config'), L = R('core/config-lead');
const lead = R('core/lead'), order = R('core/order'), T = R('i18n/lead'), { db } = R('services/mock-ext/_db');
env.loadApp();
const NEED = { capacity_m3: 3.5, input_unit: 'm3', input_value: 3.5, term_months: 6 };
const login = () => state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
const fresh = (need, loggedIn) => {
  state.reset(); env.nav.length = 0; env.mode = 'ok'; db.leads.length = 0; db.kv.lead = { seq: 0, keys: {}, failNext: '' }; C.subscribeTemplates.booking = [];
  if (need) state.set('requirement', need); if (loggedIn) login();
};
const tick = () => new Promise((r) => setTimeout(r, 15));
const base = (r) => r.replace(/^\//, '');
const BJ = (h, m) => Date.UTC(2026, 10, 18, h - 8, m || 0); // 北京时间 2026-11-18 h:m
const input = (v) => ({ detail: { value: v } });
const tapI = (i) => ({ currentTarget: { dataset: { i } } });
const PAGES = ['BOOKING', 'BUSINESS', 'ESTORE', 'TRANSPORT', 'SUPPORT', 'NEEDS', 'PROGRESS'];

test('7 个页面都不再是占位页，WXML 里没有写死的中文', () => {
  for (const n of PAGES) {
    const b = path.join(root, base(routes[n]));
    assert.ok(!/AUTO-PLACEHOLDER/.test(fs.readFileSync(b + '.js', 'utf8')), n);
    const wxml = fs.readFileSync(b + '.wxml', 'utf8').replace(/\{\{.*?\}\}|aria-label="[^"]*"/g, '');
    assert.ok(!/mk-placeholder/.test(wxml), n); assert.ok(!/[一-鿿]/.test(wxml), n + ' 有写死的中文');
  }
});
test('服务时段每日 9:00–20:00（D-149）：受理文案按提交时刻取', () => {
  assert.equal(order.inServiceHours(BJ(9, 0)), true); assert.equal(order.inServiceHours(BJ(19, 59)), true);
  assert.equal(order.inServiceHours(BJ(20, 0)), false); assert.equal(order.inServiceHours(BJ(8, 59)), false); assert.equal(order.inServiceHours(BJ(23, 30)), false);
  assert.deepEqual(lead.ackAt(BJ(10)), { in_service_hours: true, key: 'inHours' }); assert.deepEqual(lead.ackAt(BJ(21)), { in_service_hours: false, key: 'offHours' });
  assert.equal(T.ack.inHours, '预计 10 分钟内与您联系'); assert.equal(T.ack.offHours, '已收到，顾问上班后将优先联系您'); assert.equal(T.ack.hoursNote, '服务时段：每日 9:00–20:00');
});
test('预约页结果：非服务时段显示「服务时段」一句，服务时段内不显示；预约带「不锁定仓位与价格」', () => {
  fresh(NEED, true); const pg = env.newPage(base(routes.BOOKING), {});
  const off = pg.resultOf({ type: 'booking', in_service_hours: false, no: '0001', phone_masked: '138****8000', address: 'x' });
  assert.equal(off.ack, T.ack.offHours); assert.equal(off.hoursNote, T.ack.hoursNote); assert.equal(off.notLock, T.ack.notLock); assert.equal(off.no, '需求编号 0001');
  const on = pg.resultOf({ type: 'advisor', in_service_hours: true, no: '0002', phone_masked: '138****8000' });
  assert.equal(on.ack, T.ack.inHours); assert.equal(on.hoursNote, ''); assert.equal(on.notLock, '');
});
test('线索字段：门店、类型、容量、对外编号、受理时间、是否在服务时段都落到 db.leads', async () => {
  fresh(NEED, true);
  const before = Date.now();
  const rec = await api.submitLead({ type: 'booking', store_id: 'SIM_BJ01', address: '北京市朝阳区安贞西里三区 12 号楼', start_hint: '尽快', items: '日常物品', capacity_hint: '3.5m³', capacity_m3: 3.5, term_hint: '6个月', term_months: 6, note: 'n' });
  assert.equal(db.leads.length, 1); const l = db.leads[0];
  assert.equal(l.type, 'booking'); assert.equal(l.store_id, 'SIM_BJ01'); assert.equal(l.store_name, '安贞·富仁名苑店'); assert.equal(l.status, 'submitted');
  assert.equal(l.no, '0001'); assert.ok(l.accepted_at >= before); assert.equal(l.in_service_hours, order.inServiceHours(l.accepted_at));
  assert.equal(l.capacity_m3, 3.5); assert.equal(l.term_months, 6); assert.equal(l.phone_masked, '138****8000'); assert.equal(rec.id, l.id);
  // 容量接受任意小数与「30m³ 及以上」
  const big = await api.submitLead({ type: 'advisor', capacity_hint: '30m³ 及以上', capacity_m3: null });
  assert.equal(big.type, 'advisor'); assert.equal(big.capacity_hint, '30m³ 及以上'); assert.equal(big.capacity_m3, null); assert.equal(big.address, ''); assert.equal(big.no, '0002');
  const odd = await api.submitLead({ type: 'advisor', capacity_hint: '31.25m³', capacity_m3: 31.25 }); assert.equal(odd.capacity_m3, 31.25);
});
test('线索校验：预约必须有用仓位置（不超过 120 字）；没有手机号不受理；顾问咨询的位置选填', async () => {
  fresh(null, true);
  await assert.rejects(api.submitLead({ type: 'booking', address: '' }), (e) => e.code === 'INVALID' && e.field === 'address');
  await assert.rejects(api.submitLead({ type: 'booking', address: 'x'.repeat(L.addressMax + 1) }), (e) => e.field === 'address');
  await api.submitLead({ type: 'advisor', address: '' });
  fresh(null, false);
  await assert.rejects(api.submitLead({ type: 'booking', address: 'a' }), (e) => e.code === 'INVALID' && e.field === 'phone');
  await assert.rejects(api.submitLead({ type: 'booking', address: 'a', phone: '123' }), (e) => e.field === 'phone');
  assert.equal(db.leads.length, 0);
  assert.deepEqual(await api.getLeads({}), [], '未登录看不到记录');
  for (const n of ['cancelLead', 'updateLead', 'verifyContactPhone']) await assert.rejects(api[n]({ id: 'x' }), (e) => e.code === 'UNAUTHENTICATED', n);
});
test('预约页：未登录点提交 → 报「请填写有效联系电话」，不提交；位置为空报位置句', async () => {
  fresh(NEED, false); const pg = env.newPage(base(routes.BOOKING), {}); await tick();
  assert.equal(pg.data.M.submit, '预约用仓'); assert.equal(pg.data.capHint, '3.5m³'); assert.equal(pg.data.termHint, '6个月');
  pg.onSubmit(); await tick();
  assert.equal(pg.data.errPhone, '请填写有效联系电话'); assert.equal(pg.data.errAddress, '请填写用仓位置（不超过120字）'); assert.equal(db.leads.length, 0); assert.equal(pg.data.status, 'editing');
});
test('预约页：按面积填的需求带入「2㎡ · 约4.8m³」；?cap=31 带入并提示 30m³ 及以上由顾问配仓', async () => {
  fresh({ capacity_m3: 4.8, input_unit: 'm2', input_value: 2, term_months: 12 }, true);
  let pg = env.newPage(base(routes.BOOKING), {}); await tick(); assert.equal(pg.data.capHint, '2㎡ · 约4.8m³'); assert.equal(pg.data.salesCap, false);
  fresh(null, true); pg = env.newPage(base(routes.BOOKING), { mode: 'advisor', cap: '31' }); await tick();
  assert.equal(pg.data.capHint, '31m³'); assert.equal(pg.data.salesCap, true); assert.equal(pg.data.termHint, '', '预约页不设默认租期');
  assert.equal(state.get().requirement, null, '30m³ 及以上不写入全局需求');
});
test('预约页意向容量弹层：m³ / ㎡ 用全站同一份校验；常用项「30m³ 及以上」', async () => {
  fresh(null, true); const pg = env.newPage(base(routes.BOOKING), {}); await tick();
  pg.onOpenCapacity(); assert.deepEqual(pg.data.capQuick.map((x) => x.t), ['1m³', '3m³', '8m³', '15m³', '30m³ 及以上', '暂不确定']);
  pg.onCapInput(input('0.3')); pg.onCapOk(); assert.equal(pg.data.sheet, 'capacity'); assert.ok(pg.data.capErr);
  pg.onCapInput(input('3.5')); pg.onCapOk(); assert.equal(pg.data.sheet, ''); assert.equal(pg.data.capHint, '3.5m³');
  pg.onOpenCapacity(); pg.onCapUnit({ currentTarget: { dataset: { u: 'm2' } } }); pg.onCapInput(input('201')); pg.onCapOk(); assert.ok(pg.data.capErr);
  pg.onCapInput(input('2')); pg.onCapOk(); assert.equal(pg.data.capHint, '2㎡ · 约' + (2 * C.requirement.areaLayerHeightM) + 'm³');
  pg.onOpenCapacity(); pg.onCapQuick(tapI(4)); pg.onCapOk(); assert.equal(pg.data.capHint, '30m³ 及以上'); assert.equal(pg.data.salesCap, true);
});
test('预约页：已登录提交成功 → 写入线索（带意向门店）；成功页两个去向', async () => {
  fresh(NEED, true); const pg = env.newPage(base(routes.BOOKING), { store: 'SIM_BJ01' }); await tick();
  assert.equal(pg.data.store.name, '安贞·富仁名苑店');
  pg.onAddress(input('北京市朝阳区安贞西里三区 12 号楼')); pg.onHint(tapI(0)); pg.onOpenItems(); pg.onPickItem(tapI(0));
  await pg.onSubmit(); await tick();
  assert.equal(pg.data.status, 'success'); assert.equal(db.leads.length, 1);
  const l = db.leads[0]; assert.equal(l.type, 'booking'); assert.equal(l.store_id, 'SIM_BJ01'); assert.equal(l.start_hint, '尽快'); assert.equal(l.items, '日常物品'); assert.equal(l.capacity_hint, '3.5m³');
  assert.equal(pg.data.sub, '', '没有配置订阅模板时不出现通知那一行'); assert.equal(pg.data.result.rows[0].k, '意向门店');
  pg.onSubmit(); await tick(); assert.equal(db.leads.length, 1, '成功后再点不重复提交');
  env.nav.length = 0; pg.onNeeds(); pg.onFind();
  assert.deepEqual(env.nav, [{ kind: 'navigateTo', url: routes.NEEDS }, { kind: 'switchTab', url: routes.STORES }]);
});
test('订阅消息（D-187）：点「预约用仓」时请求；取消后仍提交，结果页留「开启通知」；允许则写已开启', async () => {
  fresh(NEED, true); C.subscribeTemplates.booking = ['TPL_BOOKING']; env.mode = 'fail'; // 假环境：fail = 用户取消订阅
  let pg = env.newPage(base(routes.BOOKING), {}); await tick();
  pg.onAddress(input('北京市朝阳区')); await pg.onSubmit(); await tick();
  assert.equal(pg.data.status, 'success'); assert.equal(db.leads.length, 1, '取消订阅不拦提交'); assert.equal(pg.data.sub, 'declined');
  env.mode = 'ok'; pg.onSubAsk(); await tick(); assert.equal(pg.data.sub, 'accepted', '点「开启通知」再次请求');
  fresh(NEED, true); C.subscribeTemplates.booking = ['TPL_BOOKING'];
  pg = env.newPage(base(routes.BOOKING), {}); await tick(); pg.onAddress(input('北京市朝阳区')); await pg.onSubmit(); await tick();
  assert.equal(pg.data.sub, 'accepted'); assert.equal(db.leads.length, 1);
  // 顾问咨询不请求订阅
  fresh(NEED, true); C.subscribeTemplates.booking = ['TPL_BOOKING']; let asked = 0; const orig = wx.requestSubscribeMessage; wx.requestSubscribeMessage = (o) => { asked++; orig(o); };
  pg = env.newPage(base(routes.BOOKING), { mode: 'advisor' }); await tick(); await pg.onSubmit(); await tick();
  wx.requestSubscribeMessage = orig; C.subscribeTemplates.booking = [];
  assert.equal(asked, 0); assert.equal(pg.data.status, 'success'); assert.equal(db.leads[0].type, 'advisor');
});
test('顾问模式：按钮「提交咨询需求」不并名；位置选填；考拉E存入口带来源', async () => {
  fresh(null, true); let pg = env.newPage(base(routes.BOOKING), { mode: 'advisor', source: 'estore' }); await tick();
  assert.equal(pg.data.M.submit, '提交咨询需求'); assert.equal(pg.data.M.title, '顾问咨询'); assert.equal(pg.data.help, '联系电话必填；用仓位置和以下信息可选。');
  await pg.onSubmit(); await tick(); assert.equal(pg.data.status, 'success'); assert.equal(db.leads[0].type, 'advisor'); assert.equal(db.leads[0].source, 'estore');
  assert.equal(pg.data.result.notLock, '');
  pg = env.newPage(base(routes.BOOKING), { mode: 'business' }); assert.equal(pg.data.M.title, '企业用仓咨询'); assert.equal(pg.data.M.submit, '提交咨询需求');
  const es = env.newPage(base(routes.ESTORE), {}); env.nav.length = 0; es.onConsult(); es.onSelf();
  assert.deepEqual(env.nav, [{ kind: 'navigateTo', url: routes.BOOKING + '?mode=advisor&source=estore' }, { kind: 'switchTab', url: routes.STORES }]);
  assert.equal(es.data.T.lead, '不用自己到店：预约上门取件、入库保管，需要时再预约送回。');
});
test('提交失败可重试、回执超时可核对：同一个 request_key 只落一条线索', async () => {
  fresh(NEED, true); const pg = env.newPage(base(routes.BOOKING), {}); await tick(); pg.onAddress(input('北京市朝阳区'));
  db.kv.lead.failNext = 'network'; await pg.onSubmit(); await tick();
  assert.equal(pg.data.status, 'failed'); assert.equal(pg.data.statusBtn, '重试提交'); assert.equal(db.leads.length, 0);
  db.kv.lead.failNext = 'timeout'; await pg.onRetrySubmit(); await tick();
  assert.equal(pg.data.status, 'unknown'); assert.equal(pg.data.statusBtn, '核对提交结果'); assert.equal(db.leads.length, 1, '已落库但回执超时');
  await pg.onRetrySubmit(); await tick(); assert.equal(pg.data.status, 'success'); assert.equal(db.leads.length, 1, '核对不重复建单');
  const a = await api.submitLead({ type: 'advisor', request_key: 'K1' }), b = await api.submitLead({ type: 'advisor', request_key: 'K1' });
  assert.equal(a.id, b.id); assert.equal(db.leads.length, 2);
});
test('企业容量：按区间存，带入找仓取区间上限；30m³ 及以上不带入；自定义用全站校验', () => {
  assert.deepEqual(L.bizBands.map((b) => b.label), ['1–5m³', '5–15m³', '15–30m³', '30m³ 及以上']);
  assert.deepEqual(lead.bizCapacity({ custom: false, band: '5-15' }), { label: '5–15m³', sales: false, match: 15, error: '', capacity_m3: null, band: '5–15m³' });
  const s = lead.bizCapacity({ custom: false, band: '30+' }); assert.equal(s.sales, true); assert.equal(s.match, null);
  assert.equal(lead.bizCapacity({ custom: true, sizeRaw: '0.3' }).error, 'min'); assert.equal(lead.bizCapacity({ custom: true, sizeRaw: '3.555' }).error, 'decimals');
  assert.equal(lead.bizCapacity({ custom: true, sizeRaw: 'abc' }).error, 'format'); assert.equal(lead.bizCapacity({ custom: true, sizeRaw: '' }).error, 'empty');
  const c = lead.bizCapacity({ custom: true, sizeRaw: '8.5' }); assert.equal(c.match, 8.5); assert.equal(c.sales, false); assert.equal(c.capacity_m3, 8.5);
  const big = lead.bizCapacity({ custom: true, sizeRaw: '48' }); assert.equal(big.sales, true); assert.equal(big.match, null); assert.equal(big.error, '');
  assert.equal(T.business.err.size, '请填写0.5m³–200㎡，手填容量最多两位小数', '范围文字按 D-177 原话');
});
test('企业页：范围校验拦住下一步；区间带入找仓；30m³ 及以上不写入全局需求', async () => {
  fresh(null, true); const pg = env.newPage(base(routes.BUSINESS), {}); await tick();
  assert.equal(pg.data.step, 1); assert.deepEqual(pg.data.areaChips.map((x) => x.a), ['朝阳区', '西城区', '东城区', '丰台区', '海淀区', '昌平区', '通州区', '石景山区']);
  pg.onBand({ currentTarget: { dataset: { k: 'custom' } } }); pg.onSize(input('0.3')); pg.onNext();
  assert.equal(pg.data.step, 1); assert.equal(pg.data.sizeErr, '请填写0.5m³–200㎡，手填容量最多两位小数');
  pg.onSize(input('48')); assert.equal(pg.data.sizeErr, ''); assert.equal(pg.data.salesOnly, true); assert.equal(pg.data.sizeNote, '30m³ 及以上由顾问配仓。');
  env.nav.length = 0; pg.onBrowse(); assert.equal(env.nav.length, 0, '30m³ 及以上不能查看可选仓位'); assert.equal(state.get().requirement, null);
  pg.onBand({ currentTarget: { dataset: { k: '5-15' } } }); assert.equal(pg.data.sizeNote, '找仓时按 15m³ 匹配，可修改。'); assert.equal(pg.data.salesOnly, false);
  pg.onBrowse(); assert.equal(env.nav.length, 0, '没选租期不带入'); pg.onTerm({ detail: { months: 12 } }); pg.onBrowse();
  assert.deepEqual(env.nav, [{ kind: 'switchTab', url: routes.STORES }]); assert.equal(state.get().requirement.capacity_m3, 15); assert.equal(state.get().requirement.term_months, 12);
});
test('企业页：两步提交，线索存区间容量与其他用仓区域；成功后按钮变「保存企业需求更新」', async () => {
  fresh(null, true); const pg = env.newPage(base(routes.BUSINESS), {}); await tick();
  pg.onLocation(input('北京市朝阳区安贞西里三区 12 号楼')); pg.onAreasOpen(); pg.onArea(tapI(4)); pg.onArea(tapI(3));
  assert.equal(pg.data.areasNote, '已选 2 个区域，顾问会按这些区域一并安排方案。');
  pg.onBand({ currentTarget: { dataset: { k: '5-15' } } }); pg.onTerm({ detail: { months: 12 } }); pg.onType(tapI(0)); pg.onType(tapI(1)); pg.onNext();
  assert.equal(pg.data.step, 2); assert.equal(pg.data.sumText, '5–15m³ · 12个月 · 库存、样品'); assert.equal(pg.data.areaSum, '其他区域：海淀区、丰台区'); assert.equal(pg.data.primary, '邀请顾问协助');
  pg.onName(input('王经理')); pg.onCompany(input('安贞商贸有限公司')); await pg.onSubmit(); await tick();
  assert.equal(db.leads.length, 1); const l = db.leads[0];
  assert.equal(l.type, 'enterprise'); assert.equal(l.capacity_band, '5–15m³'); assert.equal(l.capacity_m3, null); assert.deepEqual(l.other_areas, ['海淀区', '丰台区']);
  assert.equal(l.address, '北京市朝阳区安贞西里三区 12 号楼；其他区域：海淀区、丰台区'); assert.deepEqual(l.storage_types, ['库存', '样品']); assert.equal(l.term_months, 12); assert.equal(l.company, '安贞商贸有限公司');
  assert.equal(pg.data.dialog.title, '已提交'); assert.equal(pg.data.dialog.no, '需求编号 0001'); assert.equal(pg.data.dialog.sales, false); assert.equal(pg.data.primary, '保存企业需求更新');
  assert.equal(state.get().requirement, null, '提交企业需求不写全局需求'); assert.equal(state.get().bizDraft, null, '提交后清掉草稿');
  pg.onDialogClose(); pg.onNotes(input('新增：需要周末入仓。')); await pg.onSubmit(); await tick();
  assert.equal(db.leads.length, 1, '再次保存是更新同一条'); assert.equal(db.leads[0].note, '新增：需要周末入仓。'); assert.equal(pg.data.dialog.title, '企业需求已更新');
});
test('企业页：未登录提交报联系电话；草稿恢复记住步骤；需求不存在时拦住', async () => {
  fresh(null, false); let pg = env.newPage(base(routes.BUSINESS), {}); await tick();
  pg.onLocation(input('北京')); pg.onBand({ currentTarget: { dataset: { k: '1-5' } } }); pg.onNext(); pg.onName(input('王经理'));
  await pg.onSubmit(); await tick(); assert.equal(pg.data.errPhone, '请填写有效的联系电话，国际号码请带国家区号'); assert.equal(db.leads.length, 0);
  pg = env.newPage(base(routes.BUSINESS), {}); await tick();
  assert.equal(pg.data.restored, true); assert.equal(pg.data.step, 2); assert.equal(pg.data.name, '王经理'); assert.equal(pg.data.location, '北京');
  login(); pg = env.newPage(base(routes.BUSINESS), { lead: 'LEAD9999' }); await tick();
  assert.equal(pg.data.blocked, true); await pg.onSubmit(); assert.equal(db.leads.length, 0);
  pg.onNewLead(); assert.equal(pg.data.blocked, false); assert.equal(pg.data.location, '');
});
test('预约记录：列表、修改地址与备注、撤回；撤回后不能再改；补充企业资料带线索 id', async () => {
  fresh(null, true);
  await api.submitLead({ type: 'booking', address: '北京市朝阳区富仁名苑胜古北里', capacity_hint: '3.5m³', term_hint: '6个月', note: '周末搬入，需协助搬运' });
  const ent = await api.submitLead({ type: 'enterprise', address: '北京市朝阳区安贞西里三区 12 号楼', capacity_band: '5-15', term_months: 12 });
  await api.submitLead({ type: 'support', text: '咨询' }); await api.submitLead({ type: 'transport', address: 'a', date: lead.dateStr(Date.now()) });
  const pg = env.newPage(base(routes.NEEDS), {}); await tick();
  assert.equal(pg.data.list.length, 2, '运输预约与咨询不进预约记录'); assert.equal(pg.data.active, true);
  const [e, p] = pg.data.list; // 新的在前
  assert.equal(e.title, '企业用仓需求'); assert.equal(e.detail, '5–15m³ · 12个月 · 138****8000'); assert.equal(e.status, '已提交，待顾问联系');
  assert.equal(p.title, '个人用仓需求'); assert.equal(p.detail, '3.5m³ · 6个月 · 138****8000'); assert.equal(p.note, '备注：周末搬入，需协助搬运');
  const on = (id) => ({ currentTarget: { dataset: { id } } });
  pg.onEdit(on(p.id)); assert.equal(pg.data.sheet, 'edit'); pg.onEditAddress(input('')); await pg.onSave(); await tick(); assert.equal(pg.data.editErr, '请填写用仓位置（不超过120字）');
  pg.onEditAddress(input('北京市朝阳区望京')); pg.onEditNote(input('改到周日')); await pg.onSave(); await tick();
  assert.equal(pg.data.sheet, ''); assert.equal(pg.data.list[1].loc, '北京市朝阳区望京'); assert.equal(pg.data.list[1].note, '备注：改到周日');
  env.nav.length = 0; pg.onFill(on(e.id)); assert.deepEqual(env.nav, [{ kind: 'navigateTo', url: routes.BUSINESS + '?lead=' + ent.id }]);
  pg.onWithdraw(on(p.id)); await tick(); await tick(); // 假环境的确认框直接点确认
  assert.equal(pg.data.list[1].off, true); assert.equal(pg.data.list[1].status, '已撤回');
  await assert.rejects(api.updateLead({ id: p.id, address: 'x' }), (er) => er.code === 'CONFLICT');
  pg.onMore(on(e.id)); assert.equal(pg.data.sheet, 'more'); pg.onMoreWithdraw(); await tick(); await tick();
  assert.equal(pg.data.active, false, '全部撤回后不显示受理说明');
  fresh(null, false); const empty = env.newPage(base(routes.NEEDS), {}); await tick(); assert.equal(empty.data.list.length, 0); assert.equal(empty.data.sys, '');
});
test('运输与搬运：下单前可预约；校验地址、日期、手机号；有已付款订单时先选订单', async () => {
  fresh(null, false); let pg = env.newPage(base(routes.TRANSPORT), {}); await tick();
  assert.equal(pg.data.view, 'pre'); assert.equal(pg.data.T.x.note, '下单前即可预约运输 / 搬运，由顾问确认方案与费用，不计入本次应付。');
  pg.onSubmit(); assert.equal(pg.data.errAddress, '请填写取送地址'); assert.equal(pg.data.errDate, '请选择有效的运输日期'); assert.equal(pg.data.errPhone, '请填写有效联系电话');
  pg.onAddress(input('北京市朝阳区望京西园四区')); pg.onDate(input('2020-01-01')); pg.onPhone(input('13800138000')); pg.onSubmit(); assert.equal(pg.data.errDate, '请选择有效的运输日期');
  const d = lead.dateStr(Date.now() + lead.DAY); pg.onDate(input(d)); await pg.onSubmit(); await tick();
  assert.equal(pg.data.view, 'saved'); assert.equal(pg.data.saved.sub, d + ' · 138****8000'); assert.equal(db.leads[0].type, 'transport'); assert.equal(db.leads[0].order_id, '');
  fresh(null, true); pg = env.newPage(base(routes.TRANSPORT), {}); await tick();
  if (C.DEMO_SEED_ORDERS) {
    assert.equal(pg.data.view, 'pick'); assert.ok(pg.data.orders.length >= 1);
    pg.onPick(tapI(0)); await tick(); assert.equal(pg.data.view, 'form');
    pg.onAddress(input('北京市朝阳区望京西园四区')); pg.onDate(input(d)); await pg.onSubmit(); await tick();
    assert.equal(pg.data.records.length, 1); assert.equal(db.leads[0].order_id, pg.data.order.id);
  }
});
test('联系顾问：空内容报错；未登录提交先登录；提交后给受理结果；拨号有失败分支', async () => {
  fresh(null, false); let pg = env.newPage(base(routes.SUPPORT), {}); await tick();
  assert.deepEqual(pg.data.types.map((x) => x.t), ['选仓与服务咨询', '订单与租后', '搬运服务']); assert.equal(pg.data.type, 'general');
  pg.onSubmit(); assert.equal(pg.data.errText, '请填写咨询内容');
  pg.onText(input('想了解朝阳区 3m³ 左右的仓位和月租')); pg.onSubmit(); assert.equal(pg.data.loginVisible, true); assert.equal(db.leads.length, 0);
  login(); pg.onLoginSuccess(); pg.onType({ currentTarget: { dataset: { k: 'moving' } } }); await pg.onSubmit(); await tick();
  assert.equal(pg.data.saved.typeText, '搬运服务'); assert.equal(db.leads[0].type, 'support'); assert.equal(db.leads[0].text, '想了解朝阳区 3m³ 左右的仓位和月租');
  env.mode = 'fail'; pg.onCall(); env.mode = 'ok'; pg.onCall(); // 两个分支都不抛错
  env.nav.length = 0; pg.onPersonal(); pg.onEnterprise(); pg.onNeeds(); pg.onMine();
  assert.deepEqual(env.nav.map((n) => n.url), [routes.BOOKING, routes.BUSINESS, routes.NEEDS, routes.MINE]);
});
test('改本次联系电话（D-126）：短信验证其他手机号，只用于这条线索，不换登录手机号', async () => {
  fresh(null, true);
  await assert.rejects(api.verifyContactPhone({ phone: '13900139000', code: '123456' }), (e) => e.code === 'INVALID');
  await api.sendSmsCode({ phone: '13900139000' });
  await assert.rejects(api.verifyContactPhone({ phone: '13900139000', code: '12' }), (e) => e.code === 'INVALID');
  const r = await api.verifyContactPhone({ phone: '139 0013 9000', code: '123456' }); assert.deepEqual(r, { phone: '13900139000', phoneMasked: '139****9000' });
  const rec = await api.submitLead({ type: 'advisor', phone: r.phone }); assert.equal(rec.phone_masked, '139****9000');
  assert.equal(state.get().session.phoneMasked, '138****8000');
  const c = env.newComponent('pkg-lead/components/lead-phone/index', { what: '预约' });
  assert.equal(c.data.loggedIn, true); assert.equal(c.data.masked, '138****8000'); assert.equal(c.data.sheetNote, '只修改本次预约的联系电话，不会更换您的登录手机号。');
  c.onPickOther(); c.onPhone(input('13900139000')); c.onCode(input('123456')); c.onVerify(); await tick();
  assert.equal(c.data.masked, '139****9000'); assert.deepEqual(c.events[c.events.length - 1], { name: 'change', detail: { phone: '13900139000', masked: '139****9000', ready: true } });
  c.onPickLogin(); assert.equal(c.data.masked, '138****8000'); c.__detach();
});
test('找仓进度：没有需求和订单是空态；有订单没有需求给「最近参考」；已选仓位未登录不出金额', async () => {
  fresh(null, false); let pg = env.newPage(base(routes.PROGRESS), {}); await tick();
  assert.equal(pg.data.empty, true); env.nav.length = 0; pg.onEstimate(); pg.onStores();
  assert.deepEqual(env.nav, [{ kind: 'navigateTo', url: routes.CAPACITY }, { kind: 'switchTab', url: routes.STORES }]);
  fresh(NEED, false); pg = env.newPage(base(routes.PROGRESS), {}); await tick(); assert.equal(pg.data.hasNeed, true); assert.equal(pg.data.empty, false); assert.equal(pg.data.reference, null);
  const sel = { store_id: 'SIM_BJ01', store_name: '安贞·富仁名苑店', unit_ids: ['SIM_BJ01_U03'], unit_name: 'A003 · 3.5m³', term_months: 6 };
  state.set('selection', sel); pg = env.newPage(base(routes.PROGRESS), {}); await tick();
  assert.equal(pg.data.quote, null, '未登录不显示金额'); assert.equal(pg.data.selected.line, '6个月 · A003 · 3.5m³');
  env.nav.length = 0; pg.onConfirm(); assert.equal(env.nav.length, 0, '未登录去确认订单 → 打开登录层'); assert.equal(pg.data.loginVisible, true);
  login(); pg = env.newPage(base(routes.PROGRESS), {}); await tick();
  assert.equal(pg.data.quote.valid, true); assert.equal(pg.data.quote.rent, '¥1,680'); assert.equal(pg.data.quote.cta, '去确认订单');
  state.set('selection', Object.assign({ quoted_at: Date.now() - (C.timers.quoteTtlHours * 3600e3 + 1000) }, sel)); pg = env.newPage(base(routes.PROGRESS), {}); await tick();
  assert.equal(pg.data.quote.valid, false); assert.equal(pg.data.quote.tag, '已过期'); assert.equal(pg.data.quote.cta, '重新报价');
  if (C.DEMO_SEED_ORDERS) {
    fresh(null, true); pg = env.newPage(base(routes.PROGRESS), {}); await tick();
    assert.ok(pg.data.reference); pg.onRefind(); assert.equal(state.get().requirement.capacity_m3, pg.data.reference.cap);
  }
});
