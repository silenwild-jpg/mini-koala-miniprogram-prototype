// 演示环境的内存数据（W34）：各 mock-ext 模块共用同一份。只在演示数据适配器里使用，接真实接口后不存在。
const C = require('../../core/config');
const stores = require('../../mock/stores');
const units = require('../../mock/inventory');
const model = require('../../core/order-model');
const order = require('../../core/order');
const scenarios = require('../../mock/scenarios');
const after = require('../../core/after');
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
  if ([S.PENDING, S.FAILED, S.EXPIRED, S.CANCELLED].indexOf(o.stage) < 0) { od.pay.paid_at = created + 600000; od.contract = { signed: true, signed_at: created + 300000, signer_masked: '张*' }; }
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
  const od = mk(p);
  if (S[o.stage] === S.EXPIRED) od.pay.expires_at = od.created_at + 1; // 超时未支付：截止时间已过
  if (o.after) applyAfter(od, o.after, now);
  return od;
}
// 演示用的失败原因。真实环境由后端给，页面原样显示；这里的措辞只是样例。
const REASON = { inspect: '仓内仍有物品未清空', refund: '原支付渠道退款未成功', invoice: '税号与发票抬头不一致' };
// 把一笔演示订单的租后进度直接摆到某一步。字段结构与 core/after.js 文件头的说明一致。
// 等门店处理的几种状态（续租已提交、待验仓、退款中、开票中、认证中）按「刚刚提交」造：打开页面先看到等待中，
// 几秒后按 config-after.demo 的间隔自动推进；演示工具页打开「门店暂不处理」则一直停住。
function applyAfter(od, a, now) {
  if (a.identity) { od.identity_status = a.identity; if (a.identity === 'pending') od.identity_submitted_at = now; }
  if (a.renew) {
    const months = a.renewMonths || 6, q = after.renewQuote(od, months);
    const quoted = { months, status: 'quoted', submitted_at: now - 3600e3, quoted_at: now - 600e3, factor: q.factor, kept: q.kept, amount: q.total, monthly: q.monthly, pay: '', notify: '' };
    if (a.renew === 'submitted') od.renew = { months, status: 'submitted', submitted_at: now, quoted_at: 0, factor: null, kept: false, amount: 0, monthly: 0, pay: '', notify: '' };
    else if (a.renew === 'expired') od.renew = Object.assign(quoted, { status: 'expired', quoted_at: now - 30 * 3600e3 });
    else if (a.renew === 'pay_failed') od.renew = Object.assign(quoted, { pay: 'failed' });
    else od.renew = quoted;
  }
  if (a.exit) {
    const date = after.ymd(Math.max(od.lease.end, now));
    od.exit = { applied_at: now - 2 * DAY, date, early: false, estimate: null, status: a.exit, inspect_at: a.exit === 'requested' ? 0 : now, notify: '', fail_reason: a.exit === 'failed' ? REASON.inspect : '', prev_stage: od.stage };
    if (a.exit === 'passed') { od.exit.passed_at = now - DAY; od.stage = S.ENDED; } else od.stage = S.EXITING;
  }
  if (a.deposit) Object.assign(od.deposit, a.deposit === 'failed' ? { status: 'failed', refund_at: now - DAY, fail_reason: REASON.refund } : { status: 'refunding', refund_at: now });
  if (a.invoice) {
    const pay = after.payments(od)[0], st = a.invoice;
    od.invoice.records = [{ id: 'INV1', payment_id: pay.id, payment_type: pay.type, amount: pay.amount, kind: 'enterprise', title: '北京示例科技有限公司', tax_id: '91110105MA00000000', email: 'finance@example.com', status: st, submitted_at: st === 'submitted' || st === 'processing' ? now : now - DAY, issued_at: st === 'issued' ? now - 3600e3 : 0, fail_reason: st === 'failed' ? REASON.invoice : '' }];
    od.invoice.status = st === 'issued' ? 'issued' : 'applying'; od.invoice.title = od.invoice.records[0].title;
  }
}
// 清空演示数据（切换演示场景时用）。原地清空，各模块手里的 db 引用不变。
function resetDb() { db.orders.length = 0; db.leads.length = 0; db.messages.length = 0; db.seq = 0; db.sms = {}; db.kv = {}; db.seeded = false; }
module.exports = { db, seed, store, unit, stocked, markGone, mk, resetDb, REASON };
