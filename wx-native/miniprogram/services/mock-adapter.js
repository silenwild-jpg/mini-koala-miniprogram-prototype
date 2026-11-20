// 演示数据适配器。数据来自 mock/（由冻结稿导出），价格和库存不是真实报价。
// 与真实接口保持同一组方法名和返回结构；未登录时不返回整期金额（交接 v1.0 §4.1-2）。
const stores = require('../mock/stores');
const units = require('../mock/inventory');
const pricing = require('../core/pricing');
const order = require('../core/order');
const ok = (v) => new Promise((resolve) => setTimeout(() => resolve(JSON.parse(JSON.stringify(v))), 0));
const fail = (code, message) => Promise.reject({ code, message });
const unitsOf = (storeId) => units.filter((u) => u.store_id === storeId).map(stocked).map((u) => {
  const hold = db.kv.trade && db.kv.trade.holds[u.id];
  const held = hold && db.orders.find(o => o.id === hold);
  const active = held && ![order.STAGE.CANCELLED, order.STAGE.EXPIRED].includes(held.stage) &&
    (![order.STAGE.PENDING, order.STAGE.FAILED].includes(held.stage) || !order.isExpired(held.pay.expires_at, Date.now()));
  const price = db.kv.trade && db.kv.trade.prices[u.id];
  return Object.assign({}, u, price ? { base_month: price } : {}, active ? { status: 'reserved' } : {});
});
const { db, seed, stocked } = require('./mock-ext/_db');
const scenarios = require('../mock/scenarios');
const mask = (p) => String(p).replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');

const base = {
  getStores(p) { // { city }
    const list = stores.filter((s) => s.city === p.city && s.status === 'open').map((s) => Object.assign({}, s, { units: unitsOf(s.id) }));
    return ok(list);
  },
  getStore(p) {
    const s = stores.find((x) => x.id === p.id);
    return s ? ok(Object.assign({}, s, { units: unitsOf(s.id) })) : fail('NOT_FOUND', '门店不存在');
  },
  // 微信手机号快捷登录：正式环境把 code 发给后端换手机号。演示环境没有后端，任何 code 都视为取号成功。
  loginByWechatPhone(p) {
    if (!p.code) return fail('INVALID', '未取得手机号');
    return ok({ loggedIn: true, phoneMasked: '138****8000', token: 'demo-token' });
  },
  sendSmsCode(p) {
    if (!/^1\d{10}$/.test(String(p.phone))) return fail('INVALID', '请输入 11 位手机号');
    const now = Date.now(), last = db.sms[p.phone];
    if (last && now - last.at < 60000) return fail('RATE_LIMIT', '发送过于频繁，请稍后再试');
    db.sms[p.phone] = { at: now };
    return ok({ ttl_seconds: 300, resend_seconds: 60 });
  },
  // 演示环境没有短信通道：已发送过验证码的手机号，任意 6 位数字都通过。
  loginBySms(p) {
    const rec = db.sms[p.phone];
    if (!rec) return fail('INVALID', '请先获取验证码');
    if (Date.now() - rec.at > 300000) return fail('EXPIRED', '验证码已过期，请重新获取');
    if (!/^\d{6}$/.test(String(p.code))) return fail('INVALID', '请输入 6 位验证码');
    return ok({ loggedIn: true, phoneMasked: mask(p.phone), token: 'demo-token' });
  },
  getQuote(p) { // { unit_ids, months }
    const us = (p.unit_ids || []).map((id) => { const u = units.find((u) => u.id === id); return u && unitsOf(u.store_id).find(row => row.id === id); });
    if (!us.length || us.some((u) => !u || u.status !== 'available')) return fail('NOT_FOUND', '仓位已租出');
    const now = Date.now();
    return ok(Object.assign(pricing.quote(us, p.months), { quoted_at: now, expires_at: scenarios.eventOn('quote_short') ? now + scenarios.SHORT.quoteMs : order.quoteExpiresAt(now) }));
  },
  getOrders() { seed(); return ok(db.orders); },
  getOrder(p) { seed(); const o = db.orders.find((x) => x.id === p.id); return o ? ok(o) : fail('NOT_FOUND', '订单不存在'); },
  getMessagesUnread() { return ok({ unread: 0 }); },
  submitLead(p) { return ok({ accepted_at: Date.now(), in_service_hours: order.inServiceHours(Date.now()), type: p.type || 'booking' }); }
};
// 各业务域的扩展（小程序的 require 必须是静态路径，所以逐个列出）
const exts = [require('./mock-ext/find'), require('./mock-ext/trade'), require('./mock-ext/after'), require('./mock-ext/account'), require('./mock-ext/lead')];
const needLogin = [];
exts.forEach((e) => { Object.assign(base, e.methods); (e.needLogin || []).forEach((n) => needLogin.push(n)); });
base.__needLogin = needLogin;
module.exports = base;
