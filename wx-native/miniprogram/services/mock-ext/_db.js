// 演示环境的内存数据（W34）：各 mock-ext 模块共用同一份。只在演示数据适配器里使用，接真实接口后不存在。
const C = require('../../core/config');
const stores = require('../../mock/stores');
const units = require('../../mock/units');
const model = require('../../core/order-model');
const order = require('../../core/order');
const DAY = model.DAY, S = order.STAGE;
const db = { orders: [], seq: 0, sms: {}, leads: [], messages: [], seeded: false, kv: {} };
const store = (id) => stores.find((s) => s.id === id);
const unit = (id) => units.find((u) => u.id === id);
function mk(o) { // 造一笔演示订单并推进到指定阶段
  const now = Date.now();
  const created = now - (o.agoDays || 0) * DAY;
  const od = model.build({ store: store(o.store), units: o.units.map(unit), months: o.months, createdAt: created, seq: ++db.seq, identityVerified: o.identity !== false, startAt: o.startAt, factorOverride: o.factor });
  if (o.factor) od.deal_factor = o.factor;
  if (o.stage !== S.PENDING && o.stage !== S.FAILED) { od.pay.paid_at = created + 600000; od.contract = { signed: true, signed_at: created + 300000, signer_masked: '张*' }; }
  od.stage = o.stage;
  if (o.failReason) od.pay.fail_reason = o.failReason;
  if (o.patch) Object.assign(od, o.patch(od, now));
  db.orders.push(od);
  return od;
}
// 演示订单：覆盖待支付、待起租、租用中（含满额减 D-185）、即将到期（首次续租沿用原折扣 D-186）、下单时未实名（D-174）、已结束（押金部分退还）
function seed() {
  if (db.seeded || !C.DEMO_SEED_ORDERS) return;
  db.seeded = true;
  const now = Date.now();
  mk({ store: 'SIM_BJ01', units: ['SIM_BJ01_U05'], months: 12, agoDays: 40, startAt: now - 39 * DAY, stage: S.ACTIVE });
  mk({ store: 'SIM_BJ01', units: ['SIM_BJ01_U03'], months: 12, agoDays: 350, startAt: now - 349 * DAY, stage: S.EXPIRING, factor: 0.6 });
  mk({ store: 'SIM_BJ02', units: ['SIM_BJ02_U02'], months: 6, agoDays: 2, startAt: now + 3 * DAY, stage: S.PAID, identity: false });
  mk({ store: 'SIM_BJ02', units: ['SIM_BJ02_U01'], months: 3, agoDays: 0, stage: S.PENDING });
  mk({ store: 'SIM_BJ01', units: ['SIM_BJ01_U01'], months: 3, agoDays: 200, startAt: now - 199 * DAY, stage: S.ENDED, patch: (od) => ({ deposit: { status: 'partial', amount: od.quote.deposit, pending_fee: 40, refunded: od.quote.deposit - 40 } }) });
}
module.exports = { db, seed, store, unit, mk };
