// 押金 DP01（第 3 批）。进入参数 ?id=<订单号>；没带时（如从「我的」进入）取退仓中 / 已结束 / 租用中的一笔。
// 已做：空态、保管中（只显示「退还时限」一行和「查看退还方式与结算说明 ›」，点开后展开）、待验仓、退款处理中（含处理进度弹层）、
//   退款未成功、已退还、部分退还（订单押金 / 待结费用 / 实际退还）；三态。
// 未做：待结费用的明细（来源待业务，界面写「待结费用明细可向门店查询。」）；退款未成功的原因由后端给，没有时该行不显示。
const T = require('../../i18n/after');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const A = require('../../core/config-after');
const after = require('../../core/after');
const pricing = require('../../core/pricing');
const cm = require('../common');
const D = T.deposit, CT = T.common, fill = after.fill, yuan = pricing.yuan;
const TONE = { held: 'ok', waiting: 'warn', refund_pending: 'warn', refund_failed: 'err', refunded: 'ok', refunded_partial: 'ok' };
const CUR = { held: 2, waiting: 3, refund_pending: 4, refund_failed: 4, refunded: 6, refunded_partial: 6 };

function render(page, o, now) {
  cm.cancelLater(page);
  const st = o ? after.depositState(o) : 'empty';
  if (st === 'empty') { page.setData({ empty: true, order: null, bar: null, st, sheet: false }); return; }
  const dp = o.deposit, x = o.exit, failed = st === 'refund_failed', moving = st === 'refund_pending' || failed;
  const full = st !== 'held' || page._open;
  const d = {
    empty: false, st, order: o, fail: failed, reason: dp.fail_reason || '', amount: yuan(dp.amount), settle: [], more: !full,
    head: { title: D.head, tag: D.tag[st], tone: TONE[st], subs: [fill(CT.orderNo, { no: o.no }), fill(CT.leaseTo, { d: after.ymd(o.lease.end) })] },
    steps: cm.steps(D.steps, [fill(D.paidWith, { d: after.ymd(o.pay.paid_at || o.created_at) }), '', x && x.status ? D.exitTag[x.status] || '' : ''], CUR[st], failed ? 4 : 0),
    info: [{ k: D.time, v: D.timeText }].concat(full ? [{ k: D.method, v: D.methodText, long: true }, { k: D.deduct, v: D.deductText, long: true }] : []),
    bar: { btns: [moving ? { text: D.viewProgress, act: 'progress', kind: 'ghost' } : { text: CT.backOrder, act: 'back', kind: 'neutral' }] },
    sheetSteps: moving ? cm.steps(D.sheetSteps, [x && x.passed_at ? after.ymd(x.passed_at) : '', failed ? D.tag.refund_failed : D.storeHandling, ''], 2, failed ? 2 : 0) : []
  };
  if (st === 'refunded_partial') d.settle = [{ k: D.orderDeposit, v: yuan(dp.amount) }, { k: D.due, v: '−' + yuan(dp.pending_fee) }, { k: D.back, v: yuan(dp.refunded), strong: true }];
  if (!moving) d.sheet = false;
  if (st === 'refund_pending' && dp.refund_at) cm.later(page, A.demo.refundMs - (now - dp.refund_at));
  if (st === 'waiting' && x && x.inspect_at) cm.later(page, A.demo.inspectMs - (now - x.inspect_at));
  page.setData(d);
}

Page(auth.guarded(routes.DEPOSIT, {
  data: { T: { c: CT, d: D }, sys: 'loading', empty: false, st: '', head: null, order: null, amount: '', fail: false, reason: '', steps: [], settle: [], info: [], more: false, bar: null, sheet: false, sheetSteps: [] },
  onLoad(q) { this._id = (q && q.id) || ''; this._open = !!(q && q.info === 'open'); },
  onShow() { this.refresh(); },
  onHide() { cm.cancelLater(this); },
  onUnload() { cm.cancelLater(this); },
  onPullDownRefresh() { this.refresh().then(() => wx.stopPullDownRefresh()); },
  refresh() { return cm.load(this, 'deposit', (o, now) => render(this, o, now)); },
  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },
  onBar(e) { const a = e && e.currentTarget && e.currentTarget.dataset.act; if (a === 'progress') this.onProgress(); else if (a === 'back') this.onBack(); },
  onMore() { this._open = true; if (this._order) render(this, this._order, Date.now()); }, // 查看退还方式与结算说明
  onProgress() { if (this.data.sheetSteps.length) this.setData({ sheet: true }); },
  onSheetClose() { this.setData({ sheet: false }); },
  onBack() { cm.backToOrder(this); },
  onOrders() { cm.toOrders(); },
  onCall() { cm.callStore(this._order); }
}));
