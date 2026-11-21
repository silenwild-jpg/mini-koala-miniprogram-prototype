// 预约用仓 BOOKING（第 4 批，交接 v1.0 §4.9、§4.10、§4.1-8）。一个线索表单三种预设：?mode=booking（默认）| advisor | business；
// 另收 ?store=<门店 id>（意向门店）、?cap=<m³>（估算页 30m³ 及以上带来的容量）、?source=estore（考拉E存入口）。
// 已做：三种预设的标题与提交按钮（预约 =「预约用仓」，顾问 / 企业咨询 =「提交咨询需求」，不并名）；意向门店卡；用仓位置、联系电话（登录即取号，可改本次联系电话）、
//      预计用仓时间（四个快捷项 + 日期弹层）、存放物品 / 意向容量（m³ / ㎡，常用项，30m³ 及以上）/ 预计租期（统一租期组件 +「暂不确定」）三个弹层、备注；
//      带入全站用仓需求（按面积填的写「2㎡ · 约4.8m³」）；校验与错误句；提交中、失败可重试、回执超时可核对（同一 request_key、同一份提交内容，不重复建单；未确认时锁定表单）；
//      意向门店取不到时按不带门店的表单继续；容量达到 30m³ 只提示可联系顾问；顾问模式未登录可手填电话，登录后只用登录取号那一栏；
//      预约模式点提交时请求订阅消息，允许或取消都继续提交，取消后结果页留「开启通知」（D-187）；结果页按提交时刻取受理文案（D-149）；加载 / 失败 / 断网。
// 未做：冻结稿 bk_wx（微信原生手机号弹窗）、sub=ask（微信原生订阅弹窗）由微信提供；「使用当前位置」只记录定位点，不能反查地址（地点联想属 B 期，§4.2-9）。
const T = require('../../i18n/lead');
const C = require('../../core/config');
const L = require('../../core/config-lead');
const lead = require('../../core/lead');
const req = require('../../core/requirement');
const fmt = require('../../core/format');
const state = require('../../services/state');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const api = require('../../services/api');
const pd = require('../../services/page-data');
const location = require('../../services/location');
const subscribe = require('../../services/subscribe');
const share = require('../../services/share');
const B = T.booking;
const TXT = { manualPhone: '直接填写联系电话', c: T.common, ack: T.ack, b: { toBusinessTip: B.toBusinessTip, toBusiness: B.toBusiness, storeTag: B.storeTag, address: B.address, addressPh: B.addressPh, locate: B.locate, when: B.when, need: B.need, items: B.items, capacity: B.capacity, duration: B.duration, capPh: B.capPh, capNote: B.capNote, salesNote: B.salesNote, note: B.note, notePh: B.notePh, submitting: B.submitting, infoTitle: B.infoTitle, subOk: B.subOk, subNo: B.subNo, subAsk: B.subAsk }, phoneLabel: T.phone.label };
const key = () => 'LEAD_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
Page(auth.guarded(routes.BOOKING, {
  data: {
    T: TXT, sys: 'loading', mode: 'booking', M: B.modes.booking, advisor: false, help: B.helpBooking, what: T.phone.whatBooking,
    store: null, address: '', startHint: '', date: '', items: '', capHint: '', termHint: '', note: '', noteCount: '0/' + L.noteMax, noteMax: L.noteMax, addressMax: L.addressMax,
    manualPhone: '', phoneReady: false, locked: false, payNote: B.payNote, needsBtn: T.common.viewNeeds, hints: [], salesCap: false, errAddress: '', errPhone: '', status: 'editing', statusTitle: '', statusMsg: '', statusBtn: '',
    sheet: '', itemOptions: [], dateOptions: [], dateDraft: '', capUnit: 'm3', capRaw: '', capQuick: [], capPick: '', capErr: '', termDraft: null,
    result: null, sub: ''
  },
  onLoad(q) {
    q = q || {};
    const mode = B.modes[q.mode] ? q.mode : 'booking', advisor = mode !== 'booking';
    this._kind = advisor ? lead.TYPES.ADVISOR : lead.TYPES.BOOKING;
    this._source = q.source === 'estore' ? 'estore' : mode === 'business' ? 'business' : '';
    this._storeId = q.store || '';
    this._other = ''; this._manual = ''; this._capM3 = null; this._term = null; this._loc = null; this._key = ''; this._payload = null; this._sub = null;
    const M = this._source === 'estore' && mode === 'advisor' ? B.estoreMode : B.modes[mode];
    wx.setNavigationBarTitle({ title: M.title });
    // 带入全站用仓需求；?cap 来自找仓各页的顾问入口
    const r = state.get().requirement, patch = {};
    const cap = Number(q.cap);
    if (cap > 0) { patch.capHint = req.pretty(cap) + 'm³'; this._capM3 = cap; }
    else if (r && Number(r.capacity_m3) > 0) { patch.capHint = req.demandText(r); this._capM3 = Number(r.capacity_m3); }
    if (r && lead.validTerm(r.term_months) && !(cap > 0)) { patch.termHint = fmt.termText(r.term_months); this._term = r.term_months; }
    this.setData(Object.assign(patch, {
      mode, M, advisor, help: advisor ? B.helpAdvisor : B.helpBooking, what: advisor ? T.phone.whatBusiness : T.phone.whatBooking,
      payNote: lead.ackAt(Date.now()).in_service_hours ? B.payNote : B.payNoteOff,
      hints: B.hints.map((t) => ({ t, on: false })), salesCap: lead.isLargeM3(this._capM3)
    }));
    this.load();
  },
  load() { // 有意向门店时取门店；取不到（门店不存在、接口失败、断网）就按不带门店的表单继续，不挡留资
    return pd.load(this, this._storeId ? api.getStore({ id: this._storeId }).catch(() => null) : Promise.resolve(null), (s) => {
      this.setData({ store: s ? { id: s.id, name: s.name, km: s.distance_km !== null && s.distance_km !== undefined && state.get().location.noStoreCity === '' ? fmt.kmText(s.distance_km) : '', addr: s.address } : null }); // IMPL-01：距离与地址分两个字段，界面上同一行、距离紧跟定位图标，不再拼成「1.2km · 地址」
    });
  },
  onRetry() { this.setData({ sys: 'loading' }); this.load(); },
  // —— 字段 ——
  locked() { return this.data.status === 'submitting' || this.data.status === 'unknown'; },
  onAddress(e) { if (this.locked()) return; this.setData({ address: e.detail.value, errAddress: '' }); this.edited(); },
  onNote(e) { if (this.locked()) return; const v = String(e.detail.value || '').slice(0, L.noteMax); this.setData({ note: v, noteCount: v.length + '/' + L.noteMax }); this.edited(); },
  // 联系电话两个来源分开存：已登录用登录取号那一栏（_other = 另行验证的号码，空 = 登录手机号）；未登录的顾问模式用手填号（_manual）。登录后手填框收起并作废
  onPhoneChange(e) {
    const d = e.detail || {}, ready = !!d.ready;
    this._other = ready ? d.phone || '' : '';
    if (ready) { this._manual = ''; this.setData({ phoneReady: true, manualPhone: '', errPhone: '' }); }
    else if (this.data.phoneReady) this.setData({ phoneReady: false });
  },
  onPhoneLogin() { this.setData({ errPhone: '' }); },
  onLocate() {
    if (this.locked()) return;
    location.enable().then((st) => {
      const loc = state.get().location;
      if (st === 'granted') { this._loc = { latitude: loc.latitude, longitude: loc.longitude }; wx.showToast({ title: B.located, icon: 'none' }); }
      else wx.showToast({ title: B.locateFail, icon: 'none' });
    });
  },
  onHint(e) {
    if (this.locked()) return;
    const t = B.hints[Number(e.currentTarget.dataset.i)] || '';
    const next = this.data.startHint === t && !this.data.date ? '' : t;
    this.setData({ startHint: next, date: '', hints: B.hints.map((x) => ({ t: x, on: x === next })) }); this.edited();
  },
  onToBusiness() { wx.navigateTo({ url: routes.BUSINESS }); },
  // —— 弹层 ——
  onOpenDate() { if (this.locked()) return; const opts = lead.dateOptions(L.bookingDateOffsets, Date.now()); this.setData({ sheet: 'date', dateDraft: this.data.date, dateOptions: opts.map((d) => ({ d, on: d === this.data.date })) }); },
  onPickDate(e) { const d = (this.data.dateOptions[Number(e.currentTarget.dataset.i)] || {}).d || ''; this.setData({ dateDraft: d, dateOptions: this.data.dateOptions.map((x) => ({ d: x.d, on: x.d === d })) }); },
  onDateOk() { const d = this.data.dateDraft; this.setData({ sheet: '', date: d, startHint: d ? '' : this.data.startHint, hints: B.hints.map((x) => ({ t: x, on: !d && x === this.data.startHint })) }); this.edited(); },
  onOpenItems() { if (this.locked()) return; this.setData({ sheet: 'items', itemOptions: B.itemOptions.map((t) => ({ t, on: t === this.data.items })) }); },
  onPickItem(e) { const t = B.itemOptions[Number(e.currentTarget.dataset.i)] || ''; this.setData({ items: t, sheet: '' }); this.edited(); },
  capQuick(pick) { return L.bookingCapacityQuickM3.map((n) => n + 'm³').concat([T.common.salesLabel, T.common.unsure]).map((t) => ({ t, on: t === pick })); },
  onOpenCapacity() {
    if (this.locked()) return;
    const h = this.data.capHint, quick = this.capQuick(h), hit = quick.some((x) => x.on);
    const area = /^([\d.]+)㎡/.exec(h), num = /^([\d.]+)m³$/.exec(h);
    this.setData({ sheet: 'capacity', capQuick: quick, capPick: hit ? h : '', capUnit: area ? 'm2' : 'm3', capRaw: hit ? '' : area ? area[1] : num ? num[1] : '', capErr: '' });
  },
  onCapUnit(e) { const u = e.currentTarget.dataset.u === 'm2' ? 'm2' : 'm3'; this.setData({ capUnit: u, capErr: '', capPick: '', capQuick: this.capQuick('') }); },
  onCapInput(e) { this.setData({ capRaw: e.detail.value, capErr: '', capPick: '', capQuick: this.capQuick('') }); },
  onCapQuick(e) { const t = (this.data.capQuick[Number(e.currentTarget.dataset.i)] || {}).t || ''; this.setData({ capPick: t, capRaw: '', capErr: '', capQuick: this.capQuick(t) }); },
  onCapOk() {
    const d = this.data;
    if (d.capPick) {
      const n = /^([\d.]+)m³$/.exec(d.capPick);
      this._capM3 = n ? Number(n[1]) : null;
      this.setData({ sheet: '', capHint: d.capPick, salesCap: d.capPick === T.common.salesLabel });
    } else if (!String(d.capRaw).trim()) { this._capM3 = null; this.setData({ sheet: '', capHint: '', salesCap: false }); }
    else {
      const r = lead.capacityHint(d.capUnit, d.capRaw);
      if (!r.ok) { this.setData({ capErr: d.capUnit === 'm2' ? B.capErrM2 : B.capErrM3 }); return; }
      this._capM3 = r.capacity_m3;
      this.setData({ sheet: '', capHint: r.hint, salesCap: r.large });
    }
    this.edited();
  },
  onOpenDuration() { if (this.locked()) return; this.setData({ sheet: 'duration', termDraft: this.data.termHint === T.common.unsure ? 'unsure' : this._term }); },
  onTermDraft(e) { const d = e.detail || {}; this.setData({ termDraft: d.unsure ? 'unsure' : lead.validTerm(d.months) ? d.months : null }); },
  onDurationOk() {
    const v = this.data.termDraft;
    this._term = lead.validTerm(v) ? v : null;
    this.setData({ sheet: '', termHint: v === 'unsure' ? T.common.unsure : this._term ? fmt.termText(this._term) : '' }); this.edited();
  },
  onSheetClose() { this.setData({ sheet: '' }); },
  edited() { if (this.data.status === 'failed') { this.setData({ status: 'editing' }); this._key = ''; } },
  // —— 提交 ——
  onManualPhone(e) { if (this.locked()) return; this._manual = lead.cleanPhone(e.detail.value); this.setData({ manualPhone: e.detail.value, errPhone: '' }); },
  contact() { return auth.isLoggedIn() ? this._other : this.data.advisor ? this._manual : ''; },
  hasPhone() { const p = this.contact(); return lead.validPhone(p) || (!p && auth.isLoggedIn()); },
  input() {
    const d = this.data;
    return {
      type: this._kind, source: this._source, request_key: this._key, store_id: d.store ? d.store.id : '', address: d.address, phone: this.contact(), location: this._loc,
      start_hint: d.date ? '' : d.startHint, preferred_date: d.date, items: d.items, capacity_hint: d.capHint, capacity_m3: this._capM3, term_hint: d.termHint, term_months: this._term, note: d.note
    };
  },
  onSubmit() {
    const d = this.data;
    if (d.status === 'submitting' || d.status === 'success') return;
    if (d.status === 'unknown') return this.send(); // 核对提交结果：同一个 request_key、同一份内容，不重复建单
    const errPhone = this.hasPhone() ? '' : B.errPhone;
    const errAddress = lead.validAddress(d.address, !d.advisor) ? '' : B.errAddress;
    this.setData({ errPhone, errAddress });
    if (errPhone || errAddress) { wx.showToast({ title: errPhone || errAddress, icon: 'none' }); return; }
    if (!this._key) this._key = key();
    this._payload = this.input();
    this.setData({ status: 'submitting', locked: true });
    // 订阅消息必须在点按回调里请求；允许或取消都继续提交（§4.10，D-187）。只有「预约用仓」按钮带订阅；没配模板时不弹框
    if (d.advisor) { this._sub = null; return this.send(); }
    return subscribe.request(subscribe.SCENES.BOOKING).then((sub) => { this._sub = sub; return this.send(); });
  },
  send() {
    const sub = this._sub || { accepted: false, asked: false };
    this.setData({ status: 'submitting', locked: true });
    return api.submitLead(this._payload || this.input()).then((rec) => {
      this._key = ''; this._payload = null;
      // 未登录（顾问模式手填电话）提交的记录要登录后才看得到，按钮照实写
      this.setData({ status: 'success', locked: false, result: this.resultOf(rec), sub: sub.accepted ? 'accepted' : sub.asked ? 'declined' : '', needsBtn: auth.isLoggedIn() ? T.common.viewNeeds : T.common.viewNeedsLogin });
      wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    }).catch((err) => {
      const code = err && err.code;
      if (code === 'INVALID' && err.field === 'phone') return this.setData({ status: 'editing', locked: false, errPhone: B.errPhone });
      if (code === 'INVALID' && err.field === 'address') return this.setData({ status: 'editing', locked: false, errAddress: B.errAddress });
      if (code === 'TIMEOUT') return this.setData({ status: 'unknown', locked: true, statusTitle: T.common.unknownTitle, statusMsg: T.common.unknownMsg, statusBtn: T.common.recheck });
      this.setData({ status: 'failed', locked: false, statusTitle: T.common.failedTitle, statusMsg: T.common.failedMsg, statusBtn: T.common.retry });
    });
  },
  resultOf(rec) {
    const off = !rec.in_service_hours, booking = rec.type === lead.TYPES.BOOKING;
    // 没填的可选项不列出来
    const rows = [
      { k: B.storeTag, v: rec.store_name }, { k: B.address, v: rec.address }, { k: T.phone.label, v: rec.phone_masked }, { k: B.when, v: rec.preferred_date || rec.start_hint },
      { k: B.items, v: rec.items }, { k: B.capacity, v: rec.capacity_hint }, { k: B.duration, v: rec.term_hint }
    ].filter((r) => !!r.v);
    return { ack: off ? T.ack.offHours : T.ack.inHours, hoursNote: off ? T.ack.hoursNote : '', notLock: booking ? T.ack.notLock : '', no: T.ack.leadNo + rec.no, rows: rows.map((r, i) => ({ k: r.k, v: r.v, last: i === rows.length - 1 })) };
  },
  // 失败重试：按当前表单重新取一份内容（上次没有落库）；未确认核对：用原来那份
  onRetrySubmit() {
    if (this.data.status === 'failed') { this._payload = this.input(); return this.send(); }
    if (this.data.status === 'unknown') return this.send();
  },
  // 结果页「开启通知」：再请求一次订阅（用户点按触发）
  onSubAsk() { subscribe.request(subscribe.SCENES.BOOKING).then((sub) => { if (sub.accepted) this.setData({ sub: 'accepted' }); }); },
  onNeeds() { wx.navigateTo({ url: routes.NEEDS }); },
  onFind() { wx.switchTab({ url: routes.STORES }); },
  // 转发（R-15）：只带进入表单所需的模式、来源与意向门店，不带容量、电话等填写内容
  onShareAppMessage() {
    const q = ['mode=' + this.data.mode].concat(this._source === 'estore' ? ['source=estore'] : [], this._storeId ? ['store=' + this._storeId] : []);
    return share.message(routes.BOOKING, { title: this._source === 'estore' ? T.share.estore : this.data.advisor ? T.share.advisor : T.share.booking, query: q.join('&') });
  }
}));
