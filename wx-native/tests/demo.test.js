// 演示场景与网络档位（V2-FOUNDATION）：每个场景切换后登录态、订单数与阶段符合描述；默认网络档位在测试环境是「即时」。
const test = require('node:test'), assert = require('node:assert'), path = require('path');
const root = path.join(__dirname, '..', 'miniprogram');
require('../tools/fake_wx').install(root);
const demo = require(path.join(root, 'services/demo'));
const api = require(path.join(root, 'services/api'));
const state = require(path.join(root, 'services/state'));
const scenarios = require(path.join(root, 'mock/scenarios'));
const STAGE = require(path.join(root, 'core/order')).STAGE;

test('测试环境默认不加网络延迟', () => { assert.strictEqual(scenarios.net().id, 'instant'); });

for (const sc of demo.LIST) {
  test('演示场景 ' + sc.id + '：状态与订单符合描述', async () => {
    assert.ok(demo.applyScenario(sc.id));
    const s = state.get();
    assert.strictEqual(s.session.loggedIn, sc.login);
    assert.strictEqual(!!s.requirement, !!sc.need);
    assert.strictEqual(s.location.status, sc.located ? 'granted' : 'unasked');
    if (!sc.login) { await assert.rejects(api.getOrders({}), (e) => e.code === 'UNAUTHENTICATED'); return; }
    const res = await api.getOrders({});
    const list = Array.isArray(res) ? res : res.list || res.orders || [];
    if (sc.orders) {
      assert.strictEqual(list.length, sc.orders.length);
      sc.orders.forEach((o) => { // 带退仓进度的订单：验仓通过 = 已结束，其余 = 退仓中
        const want = o.after && o.after.exit ? (o.after.exit === 'passed' ? STAGE.ENDED : STAGE.EXITING) : STAGE[o.stage];
        assert.ok(list.some((x) => x.stage === want), '缺少阶段 ' + o.stage);
      });
    } else assert.strictEqual(list.length, 5);
  });
}

test('断网档位：请求以 NETWORK 失败；切回即时后恢复', async () => {
  demo.applyScenario('member_active'); demo.setNet('offline');
  await assert.rejects(api.getOrders({}), (e) => e.code === 'NETWORK');
  demo.setNet('instant');
  assert.ok(await api.getOrders({}));
});

test('切换场景会清掉上一个场景的订单', async () => {
  demo.applyScenario('member_active'); await api.getOrders({});
  demo.applyScenario('member_new');
  const res = await api.getOrders({}); const list = Array.isArray(res) ? res : res.list || res.orders || [];
  assert.strictEqual(list.length, 0);
});
