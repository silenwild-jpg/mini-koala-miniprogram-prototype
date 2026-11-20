// 入仓指引 ACC_ACCESS（第 3 批）。进入参数 ?id=<订单号>；没带时取租用中 / 待起租的一笔。本页不是受限页（未登录时显示「无法打开该服务」）。
// 已做：无法打开（没有已付款订单）、未实名拦截（主按钮「完成实名认证」，D-174）、尚未到起租时间、可入仓（「查看仓位开门信息」只提示开锁未接入，D-151）、
//   已结束 / 不可入仓（当前状态）；「到店与进仓」卡与门店详情读同一份到店资料（api.getStoreArrival，D-124），没有资料的字段整行不显示；
//   下单时已实名的订单入仓步骤 3 步，未实名的 4 步；三态。
// 未做：到店照片（没有核验过的门店实拍）；门店没有坐标或地图打不开时，「到店导航」改为复制地址。
// FIX-01 C-06：租期已到期时写明入仓信息暂不开放，给「联系门店」和「办理续租 / 办理退仓」两个去向；开门信息弹窗加「联系门店」，不再只有「知道了」。
const T = require('../../i18n/after');
const api = require('../../services/api');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const after = require('../../core/after');
const cm = require('../common');
const X = T.access, CT = T.common, fill = after.fill;
const LEASE_TONE = { upcoming: 'ok', active: 'ok', returning: 'warn', ended: 'info', expired: 'err' };

function render(page, o, now) {
  const v = after.accessView(o, now), st = v.state;
  page._st = st;
  if (st === 'not_paid') { page.setData({ empty: true, order: null, bar: null, st }); return; }
  const verified = o.identity_status === 'verified', hours = o.store.access_hours ? fill(X.stepHours, { h: o.store.access_hours }) : '';
  const titles = [X.stepArrive].concat(verified ? [] : [X.stepIdentity], [X.stepStart, X.stepClose]);
  const subs = [hours].concat(verified ? [] : [X.stepIdentitySub], [st === 'before_start' ? fill(X.stepStartDay, { d: after.ymd(o.lease.start) }) : st === 'allowed' ? X.stepOpen : '', '']);
  // 当前步：未实名停在「完成实名认证」；已实名且未起租 / 可入仓停在「起租后查看入仓信息」；其余停在最后一步（与冻结稿 w6-render.js 一致）
  const cur = !verified ? 2 : st === 'inactive' ? 3 : 2;
  const overdue = st === 'inactive' && v.lease === 'expired';
  page.setData({
    overdue: overdue ? X.overdueNote : '',
    empty: false, st, order: o, steps: cm.steps(titles, subs, cur, 0), showArrival: st !== 'inactive',
    note: st === 'identity_required' ? T.identity.note : '', before: st === 'before_start',
    lease: st === 'inactive' ? { text: X.lease[v.lease], tone: LEASE_TONE[v.lease] } : null,
    bar: st === 'allowed' ? { btns: [{ text: X.viewOpen, act: 'open' }] } : st === 'identity_required' ? { btns: [{ text: X.doIdentity, act: 'identity' }] } : overdue ? { btns: [{ text: X.exit, act: 'exit', kind: 'ghost' }, { text: X.renew, act: 'renew' }] } : null
  });
  if (st !== 'inactive') loadArrival(page, o);
}
// 到店资料：与门店详情同一个接口。取不到不影响本页其它内容，只显示地址与存取时间。
function loadArrival(page, o) {
  const fallback = () => page.setData({ arr: { rows: [{ k: X.address, v: o.store.address, key: false }].concat(o.store.access_hours ? [{ k: X.hours, v: o.store.access_hours, key: false }] : []), steps: [], path: '', facts: [] } });
  if (page._arrFor === o.store.id && page.data.arr) return;
  api.getStoreArrival({ id: o.store.id }).then((a) => {
    const p = (a && a.profile) || {};
    page._geo = (a && a.geo) || null; page._arrFor = o.store.id;
    if (!(p.entry || []).length && !(p.steps || []).length && !p.path) return fallback();
    page.setData({ arr: { rows: (p.entry || []).map((r) => ({ k: r[0], v: r[1], key: !!r[2] })), steps: (p.steps || []).map((t, i) => ({ n: i + 1, t })), path: p.path || '', facts: (p.facts || []).map((f) => ({ k: f[0], v: f[1] })) } });
  }, () => fallback());
}

Page(auth.guarded(routes.ACCESS, {
  data: { T: { c: CT, x: X }, sys: 'loading', empty: false, st: '', order: null, steps: [], showArrival: false, arr: null, note: '', overdue: '', before: false, lease: null, bar: null, loginVisible: false },
  onLoad(q) { this._id = (q && q.id) || ''; },
  onShow() { this.refresh(); },
  onPullDownRefresh() { this.refresh().then(() => wx.stopPullDownRefresh()); },
  refresh() { return cm.load(this, 'access', (o, now) => render(this, o, now)); },
  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },
  onBar(e) { const a = e && e.currentTarget && e.currentTarget.dataset.act; if (a === 'open') this.onOpen(); else if (a === 'identity') this.onIdentity(); else if (a === 'renew' || a === 'exit') this.onAfter(a); },
  onAfter(a) { if (this._id) auth.navigate(this, (a === 'renew' ? routes.RENEW : routes.EXIT) + '?id=' + this._id); },
  onCall() { cm.callStore(this._order); },
  // 查看仓位开门信息：开锁设备未接入，只提示（D-151、D-175）
  onOpen() { if (this._st === 'allowed') wx.showModal({ title: X.unlockTitle, content: X.unlockText, cancelText: CT.known, confirmText: CT.callStore, success: (res) => { if (res.confirm) this.onCall(); }, fail() {} }); },
  onIdentity() { if (this._id) auth.navigate(this, routes.IDENTITY + '?id=' + this._id); },
  onStoreGuide() { const o = this._order; if (o) wx.navigateTo({ url: routes.STORE_DETAIL + '?id=' + o.store.id + '&tab=2' }); }, // 门店到店指引
  onNavigate() { // 到店导航：有坐标打开地图；没有坐标或打开失败改为复制地址
    const o = this._order; if (!o) return;
    const copy = () => wx.setClipboardData({ data: o.store.address || o.store.name, success: () => cm.toast(X.copied), fail: () => {} });
    const g = this._geo;
    if (g && Number.isFinite(Number(g.latitude)) && Number.isFinite(Number(g.longitude))) wx.openLocation({ latitude: Number(g.latitude), longitude: Number(g.longitude), name: o.store.name, address: o.store.address, fail: copy });
    else copy();
  },
  onOrders() { cm.toOrders(); },
  onLoginClose() { this.setData({ loginVisible: false }); },
  onLoginSuccess() { this.refresh(); }
}));
