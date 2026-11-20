// 消息 ACC_MESSAGES（第 3 批）。本页不是受限页；未登录或没有消息时显示「暂无消息」。
// 已做：空态、未读（红点）、已读（进入本页即标为已读，下次进入红点变灰）、分类标签 + 时间 + 按类型落到对应页面；三态。
// 未做：消息由各业务接口写入（创建时间、类型、已读），本页只读；微信订阅消息的下发属于后端。
const T = require('../../i18n/after');
const api = require('../../services/api');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const after = require('../../core/after');
const M = T.messages;
// 分类 → 去向。带订单号的进对应订单的页面；受限页走登录守卫
const DEST = { renew: 'RENEW', exit: 'EXIT', deposit: 'DEPOSIT', invoice: 'INVOICE', identity: 'IDENTITY', access: 'ACCESS', transport: 'TRANSPORT', lead: 'NEEDS', order: 'ORDER_DETAIL' };

function build(list) {
  return (list || []).map((m, i) => {
    const cat = after.messageCategory(m), c = M.cat[cat] || M.cat.notice, t = Number(m.created_at || m.createdAt || 0);
    const noTarget = cat === 'notice' || (cat === 'order' && !m.order_id);
    return { id: String(m.id || i), unread: !m.read, cat, tag: c.tag, time: t > 0 ? after.mdhm(t) : '', title: m.title || M.fallback, text: m.text || '', link: noTarget ? '' : c.link, orderId: m.order_id || '' };
  });
}

Page(auth.guarded(routes.MESSAGES, {
  data: { T: { m: M }, sys: 'loading', empty: false, list: [], loginVisible: false },
  onLoad() {},
  onShow() { this.refresh(); },
  onPullDownRefresh() { this.refresh().then(() => wx.stopPullDownRefresh()); },
  refresh() {
    this.setData({ sys: this.data.sys === '' ? '' : 'loading' });
    return api.getMessages().then((list) => {
      const rows = build(list);
      this.setData({ sys: '', empty: !rows.length, list: rows });
      if (rows.some((r) => r.unread)) api.readMessages().catch(() => {}); // 看过即已读；本次仍显示红点
    }).catch((err) => {
      if (err && err.code === 'UNAUTHENTICATED') { this.setData({ sys: '', empty: true, list: [] }); return; }
      console.error(err); this.setData({ sys: err && err.code === 'NETWORK' ? 'offline' : 'failed' });
    });
  },
  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },
  onLink(e) {
    const row = this.data.list[e.currentTarget.dataset.i];
    if (!row || !row.link) return;
    const name = DEST[row.cat]; if (!name) return;
    const url = routes[name] + (row.orderId && name !== 'TRANSPORT' && name !== 'NEEDS' ? '?id=' + row.orderId : '');
    auth.navigate(this, url);
  },
  onLoginClose() { this.setData({ loginVisible: false }); },
  onLoginSuccess() { this.refresh(); }
}));
