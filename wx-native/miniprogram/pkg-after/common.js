// 租后分包各页共用的页面辅助（只在 pkg-after 内引用）：取订单与三态 / 空态、步骤条数据、联系门店、返回订单、演示环境的到点刷新。
const api = require('../services/api');
const routes = require('../services/routes');
const after = require('../core/after');
const A = require('../core/config-after');
const T = require('../i18n/after');

/**
 * 取订单。页面进入参数 ?id=<订单号>；没带时取最可能要办这项服务的一笔（core/after.pickOrder）。
 * apply(order, now)：order 为 null 表示没有可办理的订单（空态）。data.sys = 'loading' | 'failed' | 'offline' | ''
 */
function load(page, kind, apply) {
  page.setData({ sys: page.data.sys === '' ? '' : 'loading' });
  const p = page._id
    ? api.getAfterOrder({ id: page._id })
    : api.getOrders().then((os) => { const o = after.pickOrder(os, kind); if (!o) return null; page._id = o.id; return api.getAfterOrder({ id: o.id }); });
  return p.then((o) => { page._order = o; apply(o, Date.now()); page.setData({ sys: '' }); })
    .catch((err) => {
      if (err && (err.code === 'NOT_FOUND' || err.code === 'UNAUTHENTICATED')) { page._order = null; apply(null, Date.now()); page.setData({ sys: '' }); return; }
      console.error(err); page.setData({ sys: err && err.code === 'NETWORK' ? 'offline' : 'failed' });
    });
}
// 步骤条：cur 为当前步（从 1 起），之前的算完成；fail 为失败的那一步
function steps(titles, subs, cur, fail) {
  return titles.map((t, i) => { const n = i + 1; return { t, s: (subs && subs[i]) || '', cls: fail === n ? 'fail' : n < cur ? 'done' : n === cur ? 'cur' : '' }; });
}
const toast = (title) => wx.showToast({ title, icon: 'none' });
function callStore(order) {
  const phone = (order && order.store && order.store.phone) || A.hotline; // 门店没有电话时拨客服热线
  wx.makePhoneCall({ phoneNumber: String(phone).replace(/-/g, ''), fail: (e) => { if (!/cancel/.test((e && e.errMsg) || '')) toast(T.common.callFail); } });
}
// 返回订单详情：从订单详情进来的直接返回；否则换到这笔订单的详情页
function backToOrder(page) {
  const stack = getCurrentPages(), prev = stack.length > 1 ? stack[stack.length - 2] : null;
  if (prev && ('/' + prev.route) === routes.ORDER_DETAIL) return wx.navigateBack();
  if (page._id) return wx.redirectTo({ url: routes.ORDER_DETAIL + '?id=' + page._id });
  return wx.switchTab({ url: routes.ORDERS });
}
const toOrders = () => wx.switchTab({ url: routes.ORDERS });
const toAgreement = (doc, anchor) => wx.navigateTo({ url: routes.AGREEMENT + '?doc=' + doc + (anchor ? '&anchor=' + anchor : '') });
// 等门店处理的状态：演示环境到点自动重新取一次（真实环境靠订阅消息、下拉刷新、再次进入）
function later(page, ms) {
  cancelLater(page);
  if (!A.demo.autoRefresh || !(ms > 0)) return; // 已经过点还没变化的不再重复取，避免空转
  page._later = setTimeout(() => { page._later = null; if (page.refresh) page.refresh(); }, ms + 300);
  if (page._later && page._later.unref) page._later.unref(); // 只在 Node 测试环境有 unref：不让计时器拖住进程
}
function cancelLater(page) { if (page._later) { clearTimeout(page._later); page._later = null; } }
// 接口失败的统一提示
function opFail(err) { console.error(err); toast((err && err.message) || T.common.opFail); }
module.exports = { load, steps, toast, callStore, backToOrder, toOrders, toAgreement, later, cancelLater, opFail };
