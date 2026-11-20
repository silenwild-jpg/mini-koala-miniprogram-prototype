// 演示数据适配器的「trade」部分（W34）。methods 里的每个函数签名为 (params, session) => Promise，与真实接口同名同结构。
// 规则来源：交接 v1.0 §4.6（下单、实名、签署、支付）、refs/D42_resumeFailedOrder_code_spec.md（支付失败后继续支付的四项核对）。
//
// 流程（D-148）：登录 → verifyIdentity → createOrder（按 core/order-model.build 生成待支付订单并占住仓位）→ signContract → payOrder。
// 三个计时互相独立：报价 3 小时只在 createOrder 时校验（params.quoted_at）；待支付 3 小时自下单起算，支付失败不重新计时。
//
// 演示环境里不出现在界面上的触发方式（真实接口没有这些参数）：
//   payOrder({ simulate: 'fail' })                支付失败
//   createOrder / resumeFailedOrder({ simulate: 'price_changed' })   该仓位月基价上调（config-trade.demo.priceBump），触发变价确认
//   verifyIdentity({ simulate: 'mismatch' })      姓名与身份证号不一致
//   getOrderDraft({ simulate: 'coupon' })         发一张演示租金券
// 仓位占用记在 db.kv.trade.holds（仓位 → 订单号）；不改 mock/units 的库存字段，所以找仓各页看不到这里的占用。
const { db, seed, store, unit } = require('./_db');
const model = require('../../core/order-model');
const order = require('../../core/order');
const pricing = require('../../core/pricing');
const CT = require('../../core/config-trade');
const S = order.STAGE;
const ok = (v) => new Promise((resolve) => setTimeout(() => resolve(JSON.parse(JSON.stringify(v))), 0));
const fail = (code, message, data) => Promise.reject(data ? { code, message, data } : { code, message });
const K = () => { if (!db.kv.trade) db.kv.trade = { holds: {}, identity: {}, prices: {}, coupons: [] }; return db.kv.trade; };
const priced = (u) => (K().prices[u.id] ? Object.assign({}, u, { base_month: K().prices[u.id] }) : u);
const find = (id) => db.orders.find((o) => o.id === id);
const idOf = (session) => K().identity[(session && session.phoneMasked) || ''] || null;
const verified = (session) => { const r = idOf(session); return !!(r && r.status === 'verified'); };
function release(od) { const h = K().holds; od.units.forEach((u) => { if (h[u.id] === od.id) delete h[u.id]; }); }
// 待支付 / 支付失败超过截止时间：订单失效、仓位释放
function sweep(now) {
  db.orders.forEach((o) => { if ((o.stage === S.PENDING || o.stage === S.FAILED) && order.isExpired(o.pay.expires_at, now)) { o.stage = S.EXPIRED; release(o); } });
}
function unitsOf(ids) { const us = (ids || []).map(unit); return us.length && us.every(Boolean) ? us : null; }
const available = (us, exceptOrderId) => us.every((u) => u.status === 'available' && (!K().holds[u.id] || K().holds[u.id] === exceptOrderId));
function bump(us) { const u = us[0]; if (!K().prices[u.id]) K().prices[u.id] = Number(u.base_month) + CT.demo.priceBump; }
// 券：只抵租金。choice：'auto'（默认，取优惠最大的可用券）| 'none' | 券 id
function couponList(months) { return K().coupons.map((c) => ({ id: c.id, name: c.name, amount: c.amount, eligible: months >= (c.min_months || 0) })); }
function pickCoupon(choice, months) {
  if (choice === 'none') return null;
  const list = couponList(months).filter((c) => c.eligible);
  if (choice && choice !== 'auto') return list.find((c) => c.id === choice) || null;
  return list.sort((a, b) => b.amount - a.amount)[0] || null;
}
function quoteOf(us, months, choice) { const c = pickCoupon(choice, months); const q = pricing.quote(us.map(priced), months, c ? { coupon: c } : undefined); return { q, coupon: q.coupon_id ? c : null }; }
function draft(p, session) {
  const us = unitsOf(p.unit_ids);
  if (!us) return fail('NOT_FOUND', '仓位不存在');
  if (p.simulate === 'coupon' && !K().coupons.length) K().coupons.push({ id: 'DEMO_COUPON_1', name: CT.demo.couponName, amount: CT.demo.couponAmount, min_months: CT.demo.couponMinMonths });
  const now = Date.now(); sweep(now);
  const st = store(us[0].store_id), can = available(us, p.order_id), months = Number(p.months);
  const out = { store: st, units: us, months, available: can, quote: null, quoted_at: 0, expires_at: 0, coupons: [], coupon_name: '' };
  // 未登录不计算、不返回整期金额（交接 v1.0 §4.1-2）
  if (session && session.loggedIn && can && pricing.isTerm(months)) {
    const r = quoteOf(us, months, p.coupon);
    Object.assign(out, { quote: r.q, quoted_at: now, expires_at: order.quoteExpiresAt(now), coupons: couponList(months), coupon_name: r.coupon ? r.coupon.name : '' });
  }
  return ok(out);
}
const methods = {
  // 已有的订单列表 / 详情：读之前先处理超时订单
  getOrders() { seed(); sweep(Date.now()); return ok(db.orders); },
  getOrder(p) { seed(); sweep(Date.now()); const o = find(p.id); return o ? ok(o) : fail('NOT_FOUND', '订单不存在'); },
  // 下单前的草稿：门店、仓位、是否可租；已登录时带报价（报价时刻与 3 小时截止）。{ unit_ids, months, coupon }
  getOrderDraft(p, session) { return draft(p, session); },
  // 刷新报价（需登录）：返回结构同 getOrderDraft
  refreshQuote(p, session) { return draft(p, session); },
  getIdentity(p, session) { return ok(idOf(session) || { status: 'none', name_masked: '', id_masked: '' }); },
  // 实名认证：只支持身份证。演示环境里任意合法格式的姓名 + 18 位身份证号通过。
  verifyIdentity(p, session) {
    const name = String(p.name || '').trim(), no = String(p.id_no || '').trim().toUpperCase();
    if (name.length < CT.identity.nameMin || name.length > CT.identity.nameMax || !/^[一-龥·A-Za-z]+$/.test(name)) return fail('INVALID', '请填写证件上的姓名');
    if (no.length !== CT.identity.idLength || !/^\d{17}[\dX]$/.test(no)) return fail('INVALID', '请填写 18 位身份证号');
    if (p.simulate === 'mismatch') return fail('MISMATCH', '姓名与身份证号不一致，请核对后重试');
    const rec = { status: 'verified', name_masked: '*'.repeat(name.length - 1) + name.slice(-1), id_masked: no.slice(0, 3) + '*'.repeat(11) + no.slice(-4), verified_at: Date.now() };
    K().identity[session.phoneMasked || ''] = rec;
    // 下单时未实名的订单（D-174）：补完实名后订单的实名状态同步为已认证，identity_at_order 保持下单时的事实
    db.orders.forEach((o) => { if (o.identity_status !== 'verified') o.identity_status = 'verified'; });
    return ok(rec);
  },
  // 下单。{ unit_ids, months, start_date:'YYYY-MM-DD', quoted_at, expect_payable, coupon, km, accept_price_change }
  createOrder(p, session) {
    seed();
    const now = Date.now(); sweep(now);
    const us = unitsOf(p.unit_ids), months = Number(p.months);
    if (!us) return fail('NOT_FOUND', '仓位不存在');
    if (!pricing.isTerm(months)) return fail('INVALID', '请选择租期');
    if (!available(us)) return fail('NOT_FOUND', '仓位已租出');
    if (p.quoted_at && order.isExpired(order.quoteExpiresAt(Number(p.quoted_at)), now)) return fail('EXPIRED', '报价已超过 3 小时');
    if (p.simulate === 'price_changed') bump(us);
    const r = quoteOf(us, months, p.coupon);
    // 变价：金额与用户看到的不一致时不下单，带回新报价让用户确认（§4.6-9）
    if (p.expect_payable !== undefined && p.expect_payable !== null && Number(p.expect_payable) !== r.q.payable && !p.accept_price_change) {
      return fail('CONFLICT', '价格刚刚发生变化', { quote: JSON.parse(JSON.stringify(r.q)), quoted_at: now, expires_at: order.quoteExpiresAt(now), base_month: us.map(priced).reduce((n, u) => n + Number(u.base_month), 0) });
    }
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(p.start_date || ''));
    const startAt = m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - 8 * 3600000 : now + model.DAY;
    const args = { store: store(us[0].store_id), units: us.map(priced), months, createdAt: now, seq: ++db.seq, identityVerified: verified(session), quotedAt: Number(p.quoted_at) || now, startAt };
    if (p.km !== undefined) args.km = p.km;
    const od = model.build(args);
    if (r.coupon) { od.quote = r.q; od.coupon_name = r.coupon.name; } // order-model.build 没有券参数：用同一个 pricing.quote 带券的结果替换
    if (p.accept_price_change) od.price_change_reason = String(p.price_change_reason || '');
    db.orders.push(od);
    us.forEach((u) => { K().holds[u.id] = od.id; });
    return ok(od);
  },
  // 签署使用协议并生成电子合同。未实名不能签署。
  signContract(p, session) {
    sweep(Date.now());
    const od = find(p.order_id);
    if (!od) return fail('NOT_FOUND', '订单不存在');
    if (od.stage !== S.PENDING) return fail(od.stage === S.EXPIRED ? 'EXPIRED' : 'CONFLICT', '订单当前状态不能签署');
    if (!verified(session)) return fail('IDENTITY_REQUIRED', '签署协议前需完成实名认证');
    od.identity_status = 'verified';
    od.contract = { signed: true, signed_at: Date.now(), signer_masked: idOf(session).name_masked };
    return ok(od);
  },
  // 演示支付：默认成功。支付失败不释放仓位、不改截止时间。
  payOrder(p) {
    const now = Date.now(); sweep(now);
    const od = find(p.order_id);
    if (!od) return fail('NOT_FOUND', '订单不存在');
    if (od.stage === S.EXPIRED) return fail('EXPIRED', '订单已超时');
    if (od.stage === S.FAILED) return fail('CONFLICT', '请先核对订单后继续支付');
    if (od.stage !== S.PENDING) return fail('CONFLICT', '订单当前状态不能支付');
    if (!od.contract.signed) return fail('INVALID', '请先签署协议');
    if (p.simulate === 'fail') { od.stage = S.FAILED; od.pay.fail_reason = p.fail_reason || 'network'; return ok(od); }
    od.pay.paid_at = now; od.pay.fail_reason = '';
    od.stage = od.lease.start <= now ? S.ACTIVE : S.PAID;
    return ok(od);
  },
  // 支付失败后继续支付前的四项核对（D-42）：订单状态、仓位、价格、优惠资格。
  // { order_id, dry_run（只核对不改状态）, accept_price_change（用户已确认新报价）}
  // 返回 { ok, order, checks: { status, unit, price, coupon }, new_quote }；四项一致且非 dry_run 时订单回到待支付（同一订单号、同一截止时间）。
  resumeFailedOrder(p) {
    const now = Date.now(); sweep(now);
    const od = find(p.order_id);
    if (!od) return fail('NOT_FOUND', '订单不存在');
    if (od.stage !== S.FAILED && od.stage !== S.EXPIRED && od.stage !== S.PENDING) return fail('CONFLICT', '订单当前状态不能继续支付');
    const us = unitsOf(od.units.map((u) => u.id));
    if (us && p.simulate === 'price_changed') bump(us);
    const checks = { status: od.stage !== S.EXPIRED, unit: !!us && us.every((u) => u.status === 'available' && K().holds[u.id] === od.id), price: true, coupon: true };
    let cur = null;
    if (us) {
      cur = quoteOf(us, od.months, od.quote.coupon_id || 'none').q;
      checks.coupon = (cur.coupon_id || null) === (od.quote.coupon_id || null) && Number(cur.coupon_discount) === Number(od.quote.coupon_discount);
      checks.price = cur.unit_pricing.every((x, i) => Number(x.base_month) === Number(od.quote.unit_pricing[i].base_month)) && (cur.payable === od.quote.payable || !checks.coupon);
    }
    const priceOnly = checks.status && checks.unit && checks.coupon && !checks.price;
    if (priceOnly && p.accept_price_change && !p.dry_run) { // 用户确认新报价：订单金额按新价更新
      od.quote = cur; od.deposit.amount = cur.deposit; od.price_change_reason = String(p.price_change_reason || ''); checks.price = true;
    }
    const all = checks.status && checks.unit && checks.price && checks.coupon;
    if (all && !p.dry_run && od.stage === S.FAILED) od.stage = S.PENDING;
    return ok({ ok: all, order: od, checks, new_quote: checks.price ? null : cur });
  },
  // 取消订单：待支付与支付失败都可取消，仓位释放。
  cancelOrder(p) {
    sweep(Date.now());
    const od = find(p.order_id);
    if (!od) return fail('NOT_FOUND', '订单不存在');
    if (od.stage !== S.PENDING && od.stage !== S.FAILED) return fail('CONFLICT', '订单当前状态不能取消');
    od.stage = S.CANCELLED; release(od);
    return ok(od);
  }
};
module.exports = { needLogin: ['refreshQuote', 'resumeFailedOrder', 'getIdentity'], methods };
