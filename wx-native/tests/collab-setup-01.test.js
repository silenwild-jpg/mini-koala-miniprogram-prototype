const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
env.loadApp();
const state = require(path.join(root, 'services/state'));
const api = require(path.join(root, 'services/api'));
const { db } = require(path.join(root, 'services/mock-ext/_db'));
function reset(loggedIn = false) {
  state.reset(); db.orders = []; db.leads = []; db.kv = {}; db.seeded = true; db.seq = 0;
  if (loggedIn) state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 'demo' });
}
test('错误联系电话定位到字段；修正保留看仓意向且只创建一条线索', async () => {
  reset();
  const store = await api.getStore({ id: 'SIM_BJ01' });
  const c = env.newComponent('components/mk-visit-sheet/index', { store }); c.open();
  c.onCapacity({ detail: { value: '8' } }); c.onSlot({ detail: { value: '2' } });
  c.onPhone({ detail: { value: '123' } }); await c.onSubmit();
  assert.match(c.data.phoneError, /有效手机号/); assert.equal(c.data.phoneFocus, true);
  assert.equal(c.data.error, ''); assert.equal(db.leads.length, 0); assert.equal(db.orders.length, 0);
  c.onPhoneBlur(); assert.equal(c.data.phoneFocus, false);
  c.onPhone({ detail: { value: '13800008000' } });
  assert.equal(c.data.phoneError, ''); assert.equal(c.data.capacity, '8'); assert.equal(c.data.slotIndex, 2);
  await c.onSubmit(); await c.onSubmit();
  assert.equal(db.leads.length, 1); assert.equal(db.leads[0].capacity_m3, 8);
  assert.equal(db.leads[0].time_slot, '下午'); assert.equal(state.get().session.loggedIn, false);
});
test('已验证用户错误的另填电话仍校验；清空后可沿用已验证号码', async () => {
  reset(true);
  const store = await api.getStore({ id: 'SIM_BJ01' });
  const c = env.newComponent('components/mk-visit-sheet/index', { store }); c.open();
  c.onPhone({ detail: { value: '123' } }); await c.onSubmit();
  assert.ok(c.data.phoneError); assert.equal(db.leads.length, 0);
  c.onPhone({ detail: { value: '' } }); await c.onSubmit();
  assert.equal(c.data.phoneError, ''); assert.ok(c.data.success);
  assert.equal(db.leads.length, 1); assert.equal(db.orders.length, 0);
});
