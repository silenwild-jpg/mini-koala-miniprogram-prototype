// 演示环境的内存数据（W34）：各 mock-ext 模块共用同一份。只在演示数据适配器里使用，接真实接口后不存在。
const C = require('../../core/config');
const stores = require('../../mock/stores');
const units = require('../../mock/inventory');
const model = require('../../core/order-model');
const order = require('../../core/order');
const scenarios = require('../../mock/scenarios');
const DAY = model.DAY, S = order.STAGE;
const db = { orders: [], seq: 0, sms: {}, leads: [], messages: [], seeded: false, kv: {} };
const store = (id) => stores.find((s) => s.id === id);
const rawUnit = (id) => units.find((u) => u.id === id);
// 演示库存档位（mock/scenarios.js STOCK）与「仓位被别人租走」事件：只改可租状态，不改 mock/inventory。找仓各页和下单接口读同一个结果。
const NEAR4 = stores.filter((s) => s.city === C.defaultCity && s.status === 'open').slice().sort((a, b) => a.distance_km - b.distance_km).slice(0, 4).map((s) => s.id);
function stocked(u) {
  if (!u || u.status !== 'available') return u;
  const off = () => Object.assign({}, u, { status: 'soldout' });
  if (db.kv.gone && db.kv.gone[u.id]) return off();
  const p = scenarios.stock().id;
  if (p === 'city_soldout') return off();
  if (p === 'nearby_soldout') return NEAR4.indexOf(u.store_id) >= 0 ? off() : u;
  if (p === 'tight') { // 每店留 1 个，留哪个按门店序号轮换，容量大小各店不同
    const sib = units.filter((x) => x.store_id === u.store_id && x.status === 'available');
    const keep = sib[stores.findIndex((s) => s.id === u.store_id) % sib.length];
    return keep.id === u.id ? u : off();
  }
  return u;
}
const unit = (id) => stocked(rawUnit(id));
function markGone(ids) { if (!db.kv.gone) db.kv.gone = {}; ids.forEach((id) => { db.kv.gone[id] = 1; }); }
function mk(o) { // 造一笔演示订单并推进到指定阶段
  const now = Date.now();
  const created = now - (o.agoDays || 0) * DAY;
  const od = model.build({ store: store(o.store), units: o.units.map(rawUnit), months: o.months, createdAt: created, seq: ++db.seq, identityVerified: o.identity !== false, startAt: o.startAt, factorOverride: o.factor });
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
  if (db.seeded) return;
  const sc = scenarios.scenario();
  if (sc && sc.orders) { db.seeded = true; sc.orders.forEach(fromSpec); return; }
  if (!C.DEMO_SEED_ORDERS) return;
  db.seeded = true;
  const now = Date.now();
  mk({ store: 'SIM_BJ01', units: ['SIM_BJ01_U05'], months: 12, agoDays: 40, startAt: now - 39 * DAY, stage: S.ACTIVE });
  mk({ store: 'SIM_BJ01', units: ['SIM_BJ01_U03'], months: 12, agoDays: 350, startAt: now - 349 * DAY, stage: S.EXPIRING, factor: 0.6 });
  mk({ store: 'SIM_BJ02', units: ['SIM_BJ02_U02'], months: 6, agoDays: 2, startAt: now + 3 * DAY, stage: S.PAID, identity: false });
  mk({ store: 'SIM_BJ02', units: ['SIM_BJ02_U01'], months: 3, agoDays: 0, stage: S.PENDING });
  mk({ store: 'SIM_BJ01', units: ['SIM_BJ01_U01'], months: 3, agoDays: 200, startAt: now - 199 * DAY, stage: S.ENDED, patch: (od) => ({ deposit: { status: 'partial', amount: od.quote.deposit, pending_fee: 40, refunded: od.quote.deposit - 40 } }) });
}
// 演示场景里的订单描述（mock/scenarios.js）→ 造单参数
function fromSpec(o) {
  const now = Date.now();
  const p = { store: o.store, units: o.units, months: o.months, agoDays: o.agoDays, stage: S[o.stage], identity: o.identity, factor: o.factor, failReason: o.failReason };
  if (typeof o.startInDays === 'number') p.startAt = now + o.startInDays * DAY;
  if (o.depositPartial) p.patch = (od) => ({ deposit: { status: 'partial', amount: od.quote.deposit, pending_fee: o.depositPartial, refunded: od.quote.deposit - o.depositPartial } });
  return mk(p);
}
// 清空演示数据（切换演示场景时用）。原地清空，各模块手里的 db 引用不变。
function resetDb() { db.orders.length = 0; db.leads.length = 0; db.messages.length = 0; db.seq = 0; db.sms = {}; db.kv = {}; db.seeded = false; }
module.exports = { db, seed, store, unit, stocked, markGone, mk, resetDb };
