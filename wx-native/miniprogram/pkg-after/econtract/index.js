// 电子合同 ECONTRACT（第 3 批）。进入参数 ?id=<订单号>；没带时取第一笔已付款订单。
// 已做：已签署（签署信息、订单与仓位、三份协议文件入口 → 协议文本页）、暂无电子合同；另加了加载 / 失败 / 断网（冻结稿没画）。
// 未做：合同编号、下载、发邮箱（等第三方电子签接入，D-176）；证件号码订单上没有时该行不显示；
//   提供方（甲方）现在是北京地区的主体（core/config-after.js），其它城市待业务。
const T = require('../../i18n/after');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const A = require('../../core/config-after');
const after = require('../../core/after');
const cm = require('../common');
const E = T.econtract, CT = T.common, fill = after.fill;

function render(page, o) {
  const c = o && o.contract;
  if (!o || !c || !c.signed) { page.setData({ empty: true, order: null, bar: null }); return; }
  page.setData({
    empty: false, order: o,
    head: { title: E.title, tag: E.signed, tone: 'ok', subs: [E.sub] },
    sign: [{ k: E.partyA, v: A.partyA, long: true }, { k: E.partyB, v: c.signer_masked || '' }].concat(c.signer_id_masked ? [{ k: E.idNo, v: c.signer_id_masked }] : [])
      .concat(c.signed_at ? [{ k: E.signedAt, v: after.ymdhm(c.signed_at) }] : [], [{ k: E.way, v: E.wayText }]),
    info: [{ k: E.orderNo, v: o.no }, { k: E.store, v: o.store.name, long: true }, { k: E.unit, v: o.unit_name }, { k: E.term, v: fill(CT.months, { m: o.months }) }, { k: E.period, v: fill(E.periodText, { a: after.ymd(o.lease.start), b: after.ymd(o.lease.end) }) }],
    docs: [{ k: E.docUsage, v: E.signed, doc: 'usage', anchor: '' }, { k: E.docNotice, v: E.confirmed, doc: 'notice', anchor: '' }, { k: E.docList, v: E.attach, doc: 'usage', anchor: 'att2' }],
    foot: fill(E.foot, { tel: A.hotlineText }),
    bar: { btns: [{ text: E.full, act: 'full', kind: 'primary' }] }
  });
}

Page(auth.guarded(routes.ECONTRACT, {
  data: { T: { c: CT, e: E }, sys: 'loading', empty: false, head: null, order: null, sign: [], info: [], docs: [], foot: '', bar: null },
  onLoad(q) { this._id = (q && q.id) || ''; },
  onShow() { this.refresh(); },
  refresh() { return cm.load(this, 'econtract', (o) => render(this, o)); },
  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },
  onBar() { cm.toAgreement('usage'); },                      // 查看协议全文
  onDoc(e) { const d = e.currentTarget.dataset; if (d.doc) cm.toAgreement(d.doc, d.anchor); },
  onOrders() { cm.toOrders(); }
}));
