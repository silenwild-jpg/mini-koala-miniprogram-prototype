// 预约用仓 BOOKING（第 4 批，交接 v1.0 §4.9、§4.10、§4.1-8）。一个线索表单三种预设：?mode=booking（默认）| advisor | business；
// 另收 ?store=<门店 id>（意向门店）、?cap=<m³>（估算页 30m³ 及以上带来的容量）、?source=estore（考拉E存入口）。
// 已做：三种预设的标题与提交按钮（预约 =「预约用仓」，顾问 / 企业咨询 =「提交咨询需求」，不并名）；意向门店卡；用仓位置、联系电话（登录即取号，可改本次联系电话）、
//      预计用仓时间（四个快捷项 + 日期弹层）、存放物品 / 意向容量（m³ / ㎡，常用项，30m³ 及以上）/ 预计租期（统一租期组件 +「暂不确定」）三个弹层、备注；
//      带入全站用仓需求（按面积填的写「2㎡ · 约4.8m³」）；校验与错误句；提交中、失败可重试、回执超时可核对（同一 request_key 不重复建单）；
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
const B = T.booking;
const TXT = { manualPhone: '直接填写联系电话', c: T.common, ack: T.ack, b: { toBusinessTip: B.toBusinessTip, toBusiness: B.toBusiness, storeTag: B.storeTag, address: B.address, addressPh: B.addressPh, locate: B.locate, when: B.when, need: B.need, items: B.items, capacity: B.capacity, duration: B.duration, capPh: B.capPh, capNote: B.capNote, salesNote: B.salesNote, note: B.note, notePh: B.notePh, payNote: B.payNote, submitting: B.submitting, infoTitle: B.infoTitle, subOk: B.subOk, subNo: B.subNo, subAsk: B.subAsk }, phoneLabel: T.phone.label };
const key = () => 'LEAD_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
Page(auth.guarded(routes.BOOKING, {
  data: {
    T: TXT, sys: 'loading', mode: 'booking', M: B.modes.booking, advisor: false, help: B.helpBooking, what: T.phone.whatBooking,
    store: null, address: '', startHint: '', date: '', items: '', capHint: '', termHint: '', note: '', noteCount: '0/' + L.noteMax, noteMax: L.noteMax, addressMax: L.addressMax,
    manualPhone: '', hints: [], salesCap: false, errAddress: '', errPhone: '', status: 'editing', statusTitle: '', statusMsg: '', statusBtn: '',
    sheet: '', itemOptions: [], dateOptions: [], dateDraft: '', capUnit: 'm3', capRaw: '', capQuick: [], capPick: '', capErr: '', termDraft: null,
    result: null, sub: ''
  },
  onLoad(q) {
    q = q || {};
    const mode = B.modes[q.mode] ? q.mode : 'booking', advisor = mode !== 'booking';
    this._kind = advisor ? lead.TYPES.ADVISOR : lead.TYPES.BOOKING;
    this._source = q.source === 'estore' ? 'estore' : mode === 'business' ? 'business' : '';
    this._storeId = q.store || '';
    this._contact = ''; this._capM3 = null; this._term = null; this._loc = null; this._key = '';
    wx.setNavigationBarTitle({ title: B.modes[mode].title });
    // 带入全站用仓需求；?cap 来自估算页（30m³ 及以上不写入全局需求，只带到这里）
    const r = state.get().requirement, patch = {};
    const cap = Number(q.cap);
    if (cap > 0) { patch.capHint = req.pretty(cap) + 'm³'; this._capM3 = cap; }
    else if (r && Number(r.capacity_m3) > 0) { patch.capHint = req.demandText(r); this._capM3 = Number(r.capacity_m3); }
    if (r && lead.validTerm(r.term_months) && !(cap > 0)) { patch.termHint = fmt.termText(r.term_months); this._term = r.term_months; }
    this.setData(Object.assign(patch, {
      mode, M: B.modes[mode], advisor, help: advisor ? B.helpAdvisor : B.helpBooking, what: T.phone.whatBooking,
      hints: B.hints.map((t) => ({ t, on: false })), salesCap: lead.isSalesM3(this._capM3)
    }));
    this.load();
  },
  load() { // 有意向门店时取门店；没有也走同一套三态
    return pd.load(this, this._storeId ? api.getStore({ id: this._storeId }) : Promise.resolve(null), (s) => {
      this.setData({ store: s ? { id: s.id, name: s.name, sub: (s.distance_km !== null && s.distance_km !== undefined && state.get().location.noStoreCity === '' ? fmt.kmText(s.distance_km) + ' · ' : '') + s.address } : null });
    });
  },
  onRetry() { this.setData({ sys: 'loading' }); this.load(); },
  // —— 字段 ——
  onAddress(e) { this.setData({ address: e.detail.value, errAddress: '' }); this.edited(); },
  onNote(e) { const v = String(e.detail.value || '').slice(0, L.noteMax); this.setData({ note: v, noteCount: v.length + '/' + L.noteMax }); this.edited(); },
  onPhoneChange(e) { this._contact = (e.detail && e.detail.phone) || ''; if (e.detail && e.detail.ready) this.setData({ errPhone: '' }); },
  onPhoneLogin() { this.setData({ errPhone: '' }); },
  onLocate() {
    location.enable().then((st) => {
      const loc = state.get().location;
      if (st === 'granted') { this._loc = { latitude: loc.latitude, longitude: loc.longitude }; wx.showToast({ title: B.located, icon: 'none' }); }
      else wx.showToast({ title: B.locateFail, icon: 'none' });
    });
  },
  onHint(e) {
    const t = B.hints[Number(e.currentTarget.dataset.i)] || '';
    const next = this.data.startHint === t && !this.data.date ? '' : t;
    this.setData({ startHint: next, date: '', hints: B.hints.map((x) => ({ t: x, on: x === next })) }); this.edited();
  },
  onToBusiness() { wx.navigateTo({ url: routes.BUSINESS }); },
  // —— 弹层 ——
  onOpenDate() { const opts = lead.dateOptions(L.bookingDateOffsets, Date.now()); this.setData({ sheet: 'date', dateDraft: this.data.date, dateOptions: opts.map((d) => ({ d, on: d === this.data.date })) }); },
  onPickDate(e) { const d = (this.data.dateOptions[Number(e.currentTarget.dataset.i)] || {}).d || ''; this.setData({ dateDraft: d, dateOptions: this.data.dateOptions.map((x) => ({ d: x.d, on: x.d === d })) }); },
  onDateOk() { const d = this.data.dateDraft; this.setData({ sheet: '', date: d, startHint: d ? '' : this.data.startHint, hints: B.hints.map((x) => ({ t: x, on: !d && x === this.data.startHint })) }); this.edited(); },
  onOpenItems() { this.setData({ sheet: 'items', itemOptions: B.itemOptions.map((t) => ({ t, on: t === this.data.items })) }); },
  onPickItem(e) { const t = B.itemOptions[Number(e.currentTarget.dataset.i)] || ''; this.setData({ items: t, sheet: '' }); this.edited(); },
  capQuick(pick) { return L.bookingCapacityQuickM3.map((n) => n + 'm³').concat([T.common.salesLabel, T.common.unsure]).map((t) => ({ t, on: t === pick })); },
  onOpenCapacity() {
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
      this.setData({ sheet: '', capHint: r.hint, salesCap: r.sales });
    }
    this.edited();
  },
  onOpenDuration() { this.setData({ sheet: 'duration', termDraft: this.data.termHint === T.common.unsure ? 'unsure' : this._term }); },
  onTermDraft(e) { const d = e.detail || {}; this.setData({ termDraft: d.unsure ? 'unsure' : lead.validTerm(d.months) ? d.months : null }); },
  onDurationOk() {
    const v = this.data.termDraft;
    this._term = lead.validTerm(v) ? v : null;
    this.setData({ sheet: '', termHint: v === 'unsure' ? T.common.unsure : this._term ? fmt.termText(this._term) : '' }); this.edited();
  },
  onSheetClose() { this.setData({ sheet: '' }); },
  edited() { if (this.data.status === 'failed') { this.setData({ status: 'editing' }); this._key = ''; } },
  // —— 提交 ——
  onManualPhone(e) { this._contact = lead.cleanPhone(e.detail.value); this.setData({ manualPhone: e.detail.value, errPhone: '' }); },
  hasPhone() { return lead.validPhone(this._contact) || (!this._contact && auth.isLoggedIn()); },
  input() {
    const d = this.data;
    return {
      type: this._kind, source: this._source, request_key: this._key, store_id: d.store ? d.store.id : '', address: d.address, phone: this._contact, location: this._loc,
      start_hint: d.date ? '' : d.startHint, preferred_date: d.date, items: d.items, capacity_hint: d.capHint, capacity_m3: this._capM3, term_hint: d.termHint, term_months: this._term, note: d.note
    };
  },
  onSubmit() {
    const d = this.data;
    if (d.status === 'submitting' || d.status === 'success') return;
    if (d.status === 'unknown') return this.send({ accepted: false, asked: false }); // 核对提交结果：同一个 request_key，不重复建单
    const errPhone = this.hasPhone() ? '' : B.errPhone;
    const errAddress = lead.validAddress(d.address, !d.advisor) ? '' : B.errAddress;
    this.setData({ errPhone, errAddress });
    if (errPhone || errAddress) { wx.showToast({ title: errPhone || errAddress, icon: 'none' }); return; }
    if (!this._key) this._key = key();
    this.setData({ status: 'submitting' });
    // 订阅消息必须在点按回调里请求；允许或取消都继续提交（§4.10）。只有「预约用仓」按钮带订阅
    return this.send({ accepted: false, asked: false });
  },
  send(sub) {
    this.setData({ status: 'submitting' });
    return api.submitLead(this.input()).then((rec) => {
      this._key = '';
      this.setData({ status: 'success', result: this.resultOf(rec), sub: sub.accepted ? 'accepted' : sub.asked ? 'declined' : '' });
      wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    }).catch((err) => {
      const code = err && err.code;
      if (code === 'INVALID' && err.field === 'phone') return this.setData({ status: 'editing', errPhone: B.errPhone });
      if (code === 'INVALID' && err.field === 'address') return this.setData({ status: 'editing', errAddress: B.errAddress });
      if (code === 'TIMEOUT') return this.setData({ status: 'unknown', statusTitle: T.common.unknownTitle, statusMsg: T.common.unknownMsg, statusBtn: T.common.recheck });
      this.setData({ status: 'failed', statusTitle: T.common.failedTitle, statusMsg: T.common.failedMsg, statusBtn: T.common.retry });
    });
  },
  resultOf(rec) {
    const dash = T.common.dash, off = !rec.in_service_hours, booking = rec.type === lead.TYPES.BOOKING;
    const rows = (rec.store_name ? [{ k: B.storeTag, v: rec.store_name }] : []).concat([
      { k: B.address, v: rec.address || dash }, { k: T.phone.label, v: rec.phone_masked }, { k: B.when, v: rec.preferred_date || rec.start_hint || dash },
      { k: B.items, v: rec.items || dash }, { k: B.capacity, v: rec.capacity_hint || dash }, { k: B.duration, v: rec.term_hint || dash }
    ]);
    return { ack: off ? T.ack.offHours : T.ack.inHours, hoursNote: off ? T.ack.hoursNote : '', notLock: booking ? T.ack.notLock : '', no: T.ack.leadNo + rec.no, rows: rows.map((r, i) => ({ k: r.k, v: r.v, last: i === rows.length - 1 })) };
  },
  onRetrySubmit() { if (this.data.status === 'failed' || this.data.status === 'unknown') this.send({ accepted: false, asked: false }); },
  // 结果页「开启通知」：再请求一次订阅（用户点按触发）
  onSubAsk() { subscribe.request(subscribe.SCENES.BOOKING).then((sub) => { if (sub.accepted) this.setData({ sub: 'accepted' }); }); },
  onNeeds() { wx.navigateTo({ url: routes.NEEDS }); },
  onFind() { wx.switchTab({ url: routes.STORES }); }
}));
