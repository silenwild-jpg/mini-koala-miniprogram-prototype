// GAPS-01：库存紧张提示（门店可租仓位总数不超过阈值）、预约类线索提交后生成站内消息。
// 在假的 wx 环境里跑，验证的是代码逻辑，不是微信真实渲染。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), api = R('services/api'), demo = R('services/demo'), scenarios = R('mock/scenarios');
const { db } = R('services/mock-ext/_db');
const finder = R('services/finder'), CF = R('core/config-find'), T = R('i18n/find'), M = R('i18n/after').messages;
env.loadApp();
function fresh(loggedIn) {
  state.reset(); env.nav.length = 0; db.orders.length = 0; db.leads.length = 0; db.messages.length = 0; db.seq = 0; db.seeded = true; db.kv = {}; db.sms = {};
  scenarios.write({ scenario: '', stock: 'normal', events: {}, net: 'instant' });
  if (loggedIn !== false) state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
}
const ctx = (need) => ({ loggedIn: true, location: null, requirement: need ? { capacity_m3: need, term_months: 6 } : null });
const avail = (s) => s.units.filter((u) => u.status === 'available').length;
const BOOK = { type: 'booking', address: '朝阳区芍药居北里 101 号', capacity_m3: 3, term_months: 6 };

test('库存紧张提示：门店可租总数不超过阈值才提示；库存正常和满仓都不提示；开关关掉后不提示', async () => {
  fresh();
  let stores = await api.getStores({ city: '北京' });
  stores.forEach((s) => { const c = finder.buildStoreDetail(s, ctx(0)).card; assert.equal(c.lowText, avail(s) >= 1 && avail(s) <= CF.lowStock.maxLeft ? T.stock.low(avail(s)) : '', s.id); });
  demo.setStock('tight');
  stores = await api.getStores({ city: '北京' });
  const open = stores.filter((s) => avail(s) === 1);
  assert.ok(open.length >= 4);
  open.forEach((s) => assert.equal(finder.buildStoreDetail(s, ctx(0)).card.lowText, '仅剩 1 个可租'));
  demo.setStock('city_soldout');
  stores = await api.getStores({ city: '北京' });
  stores.forEach((s) => assert.equal(finder.buildStoreDetail(s, ctx(0)).card.lowText, ''));
  demo.setStock('tight');
  stores = await api.getStores({ city: '北京' });
  const keep = CF.lowStock.show; CF.lowStock.show = false;
  try { stores.forEach((s) => assert.equal(finder.buildStoreDetail(s, ctx(0)).card.lowText, '')); } finally { CF.lowStock.show = keep; }
});

test('库存紧张提示：仓位推荐卡同样带提示；门店卡提示占一个标签位，标签行不超过两个', async () => {
  fresh(); demo.setStock('tight');
  const stores = await api.getStores({ city: '北京' });
  const one = stores.find((s) => avail(s) === 1), v = one.units.find((u) => u.status === 'available').volume;
  const m = finder.buildMatch(stores, ctx(v));
  assert.ok(m.cards.length); m.cards.forEach((c) => assert.equal(c.lowText, '仅剩 1 个可租'));
  const wxml = fs.readFileSync(path.join(root, 'components/mk-store-card/index.wxml'), 'utf8'), js = fs.readFileSync(path.join(root, 'components/mk-store-card/index.js'), 'utf8');
  assert.match(wxml, /card\.lowText/); assert.match(js, /c\.lowText \? 1 : 0/);
  assert.match(fs.readFileSync(path.join(root, 'pages/store/detail.wxml'), 'utf8'), /card\.lowText/);
});

test('预约提交后生成消息：预约、咨询、企业、看仓各一条未读「咨询」类消息；重复提交同一 request_key 不重复生成', async () => {
  fresh();
  await api.submitLead(Object.assign({ request_key: 'K1' }, BOOK));
  await api.submitLead(Object.assign({ request_key: 'K1' }, BOOK));
  assert.equal(db.leads.length, 1);
  let msgs = await api.getMessages();
  const mine = msgs.filter((x) => x.type === 'lead');
  assert.equal(mine.length, 1); assert.equal(mine[0].title, M.demo.leadBooking); assert.equal(mine[0].read, false);
  assert.equal((await api.getMessagesUnread()).unread >= 1, true);
  await api.submitLead({ type: 'advisor', address: '海淀区' });
  msgs = await api.getMessages();
  assert.deepEqual(msgs.filter((x) => x.type === 'lead').map((x) => x.title).sort(), [M.demo.leadAdvisor, M.demo.leadBooking].sort());
});

test('预约提交后生成消息：提交失败不生成；提交结果未确认（已受理）生成一条；客服留言不生成', async () => {
  fresh();
  scenarios.setEvent('lead_submit_fail', true);
  await assert.rejects(api.submitLead(BOOK)); assert.equal(db.messages.filter((x) => x.type === 'lead').length, 0);
  scenarios.setEvent('lead_submit_timeout', true);
  await assert.rejects(api.submitLead(Object.assign({ request_key: 'K2' }, BOOK))); assert.equal(db.messages.filter((x) => x.type === 'lead').length, 1);
  await api.submitLead({ type: 'support', text: '想问一下搬运', support_type: 'general' }).catch(() => {});
  assert.equal(db.messages.filter((x) => x.type === 'lead').length, 1);
});

test('消息页：预约消息显示「咨询」标签，点「查看预约记录」进预约记录页', async () => {
  fresh();
  await api.submitLead(BOOK);
  // 页面跳转由 account-lead-01 的消息页用例覆盖；这里只核对分类和去向文字
  const after = R('core/after');
  const m = db.messages.find((x) => x.type === 'lead');
  assert.equal(after.messageCategory(m), 'lead'); assert.equal(M.cat.lead.link, '查看预约记录');
});
