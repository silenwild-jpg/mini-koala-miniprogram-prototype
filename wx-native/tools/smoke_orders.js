// 订单联调冒烟（W34）：用演示订单的真实订单号加载订单详情、确认订单（待支付单）和租后各页，把每个处理函数调一遍；
// 再走一遍「下单 → 签署 → 支付」后重复。只抓 JS 运行时错误和「页面停在失败态」，不能证明界面正确。
// 用法：node tools/smoke_orders.js <miniprogram 目录>
const path = require('path');
const root = path.resolve(process.argv[2]);
const env = require('./fake_wx').install(root);
const state = require(path.join(root, 'services/state'));
const api = require(path.join(root, 'services/api'));
const errors = []; let calls = 0, loads = 0;
process.on('unhandledRejection', (e) => errors.push('unhandledRejection: ' + (e && e.stack || JSON.stringify(e))));
env.loadApp();
const PAGES = ['pkg-trade/order/index', 'pkg-trade/confirm/index', 'pkg-after/identity/index', 'pkg-after/access/index', 'pkg-after/renew/index', 'pkg-after/exit/index', 'pkg-after/deposit/index', 'pkg-after/invoice/index', 'pkg-after/econtract/index'];
const LIFE = ['onLoad', 'onShow', 'onReady', 'onHide', 'onUnload', 'data', 'options', 'route', 'setData'];
const wait = (ms) => new Promise((r) => setTimeout(r, ms || 15));
const ev = () => ({ detail: { value: '6', months: 6, id: 'x', code: 'c' }, currentTarget: { dataset: { i: 0, m: 6, v: 3, k: 'a', a: 'detail', id: 'x' } } });
async function run(o) {
  for (const p of PAGES) {
    const tag = p + ' [' + o.no + ' ' + o.stage + ']';
    try {
      const q = p.indexOf('confirm') >= 0 ? { order: o.id } : { id: o.id };
      const inst = env.newPage(p, q); await wait(40); loads++;
      if (inst.__blocked) { errors.push(tag + ' 已登录却被守卫拦截'); continue; }
      if (inst.data.sys === 'failed' || inst.data.sys === 'offline') errors.push(tag + ' 停在失败态');
      for (const k of Object.keys(inst)) { if (typeof inst[k] !== 'function' || LIFE.includes(k)) continue; try { inst[k](ev()); calls++; await wait(); } catch (e) { errors.push(tag + ' ' + k + ': ' + e.stack.split('\n').slice(0, 2).join(' ')); } }
      if (inst.onHide) inst.onHide(); if (inst.onUnload) inst.onUnload();
    } catch (e) { errors.push(tag + ' 加载: ' + e.stack.split('\n').slice(0, 3).join(' ')); }
  }
}
(async () => {
  state.reset(); state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' }); env.mode = 'ok';
  const seeded = await api.getOrders();
  for (const o of seeded) await run(o);
  // 新下一单并走到已支付
  let made = null;
  try {
    await api.verifyIdentity({ name: '张三', id_no: '11010519491231002X' }).catch((e) => errors.push('verifyIdentity: ' + JSON.stringify(e)));
    const od = await api.createOrder({ unit_ids: ['SIM_BJ01_U04'], months: 6 });
    await api.signContract({ order_id: od.id });
    made = await api.payOrder({ order_id: od.id });
  } catch (e) { errors.push('下单流程: ' + JSON.stringify(e && e.message ? { code: e.code, message: e.message } : e)); }
  if (made) await run(made);
  await wait(50);
  console.log(JSON.stringify({ orders: seeded.length + (made ? 1 : 0), page_loads: loads, handler_calls: calls, new_order: made ? [made.no, made.stage, made.quote.payable] : null, errors: errors.length }));
  errors.slice(0, 60).forEach((e) => console.log(' -', e));
  process.exit(errors.length ? 1 : 0);
})();
