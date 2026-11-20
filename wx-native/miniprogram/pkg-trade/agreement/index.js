// 协议文本页 AGREEMENT（第 2 批）。?doc=notice | usage | register | custom（旧链接 storage / privacy / user 仍可用），可带 &anchor=att2 定位到某一节。
// 已做（4 态）：《用户使用告知书》《自助式设备设施使用协议》正文逐字显示（取自冻结稿 model/mk-contract-text.json，见同目录 contract-text.js）、
//   目录（多于一节时）与点击定位、注册协议与私人定制协议的「正文暂未上线」态、版本号与生效日期（业务未提供时整张卡不显示）。
// 未做：无。协议正文不做用词替换（交接 v1.0 §4.11）。
const TT = require('../../i18n/trade');
const contract = require('./contract-text');
const actions = require('../../services/order-actions');
const ALIAS = { storage: 'usage', privacy: 'register', user: 'register' };
const has = (v) => !!v && !/^待/.test(v);
Page({
  data: { T: TT.agreement, title: '', pending: false, version: '', effective: '', toc: [], sections: [] },
  onLoad(q) {
    let key = (q && (q.doc || q.state)) || 'usage';
    key = ALIAS[key] || key;
    const d = contract.docs[key] || contract.docs.usage;
    wx.setNavigationBarTitle({ title: d.short });
    const sections = (d.sections || []).map((s, i) => {
      const m = /^附件\s?(\d)/.exec(s.title || '');
      return { id: m ? 'att' + m[1] : 'sec' + (i + 1), title: s.title || '', paras: s.paras.map((p, k) => (p.indexOf('### ') === 0 ? { k, h: true, t: p.slice(4) } : { k, h: false, t: p })) };
    });
    const toc = sections.filter((s) => s.title).map((s, n) => ({ id: s.id, n: n + 1, t: s.title }));
    this.setData({ title: d.title, pending: d.status === 'pending', version: has(contract.meta.version) ? contract.meta.version : '', effective: has(contract.meta.effectiveDate) ? contract.meta.effectiveDate : '', toc: toc.length > 1 ? toc : [], sections });
    this._anchor = (q && q.anchor) || '';
  },
  onReady() { if (this._anchor) this.scrollTo(this._anchor); },
  scrollTo(id) { if (typeof id === 'string' && id) wx.pageScrollTo({ selector: '#' + id, duration: 200, fail() {} }); },
  onToc(e) { this.scrollTo(e.currentTarget.dataset.id); },
  onService() { actions.callService(); }
});
