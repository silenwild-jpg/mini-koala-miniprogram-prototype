// 商家 / 企业存储 BUSINESS（第 4 批，交接 v1.0 §4.9-4）。两步表单：① 用仓需求 ② 联系方式。?lead=<线索 id> 是从预约记录「补充企业资料」进入的修改。
// 已做：步骤条；用仓位置 + 多选其他用仓区域（只列当前城市有营业门店的区域；提交时既拼进位置文字，也单独存 other_areas）；
//      容量按区间存（1–5 / 5–15 / 15–30 / 30m³ 及以上）或自定义（校验用 core/requirement，范围句「0.5m³–200㎡」D-177 原话）；
//      租期用统一组件（「其他」是底部弹层）；存储类型多选 +「其他」补充；搬入协助；「查看可选仓位」带入找仓取区间上限；
//      容量达到 30m³ 只在容量栏下提示可联系专属配仓顾问，仍可带入找仓（2026-11-20 规则）；
//      联系方式（称呼、公司、联系电话登录取号、预计用仓日期弹层、补充信息）；草稿存本机并记住步骤，回来时提示「已恢复上次填写的信息」；
//      修改已有需求 / 需求不存在或已撤回；提交中、失败重试、回执超时（锁定表单，稍后自动核对一次；仍未确认时提示条留「核对提交结果」可再核对，同一 request_key 不重复建单）；
//      提交成功弹窗（按提交时刻取受理文案，「继续找仓」「查看预约记录」，点弹窗外关闭）；加载 / 失败 / 断网。
// 未做：冻结稿 authorized 态的「已微信授权，无需重复填写手机号」输入框（已按 §4.1-8 改为登录取号 + 「修改」）；bk_wx 微信原生弹窗。
const T = require('../../i18n/lead');
const L = require('../../core/config-lead');
const lead = require('../../core/lead');
const req = require('../../core/requirement');
const fmt = require('../../core/format');
const state = require('../../services/state');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const api = require('../../services/api');
const pd = require('../../services/page-data');
const share = require('../../services/share');
const Z = T.business;
const TXT = { c: T.common, ack: T.ack, z: Z, phoneLabel: T.phone.label };
const DRAFT = 'bizDraft';
const key = () => 'LEAD_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
const blank = () => ({ location: '', areas: [], areasOpen: false, band: '', custom: false, sizeRaw: '', term: null, types: [], typeOther: '', move: Z.moveDefault, name: '', company: '', date: '', notes: '', step: 1 });
const hasContent = (v) => !!(v.location || v.areas.length || v.band || v.sizeRaw || v.types.length || v.name || v.company || v.notes || v.date);
Page(auth.guarded(routes.BUSINESS, {
  data: {
    T: TXT, sys: 'loading', step: 1, what: T.phone.whatBusiness,
    location: '', areasOpen: false, areaChips: [], areasNote: '', bandChips: [], custom: false, sizeRaw: '', sizeErr: '', sizeNote: '', term: null, termErr: '',
    typeChips: [], typeOtherOn: false, typeOther: '', moveChips: [], moveNeed: false,
    sumText: '', areaSum: '', name: '', company: '', date: '', notes: '', notesCount: '0/' + L.bizNotesMax, notesMax: L.bizNotesMax, nameMax: L.nameMax, addressMax: L.addressMax,
    errPhone: '', errDate: '', payNote: Z.payNote, blocked: false, editing: false, saved: false, restored: false, status: 'editing', locked: false, primary: Z.submit,
    sheet: '', dateOptions: [], dateDraft: '', dialog: null
  },
  onLoad(q) {
    q = q || {};
    this._v = blank(); this._districts = []; this._city = state.get().location.city; this._leadId = q.lead || ''; this._contact = ''; this._key = ''; this._timer = null; this._rechecked = false;
    this.setData({ payNote: lead.ackAt(Date.now()).in_service_hours ? Z.payNote : Z.payNoteOff });
    const draft = state.get()[DRAFT];
    if (!this._leadId && draft && hasContent(Object.assign(blank(), draft))) { this._v = Object.assign(blank(), draft); this._restored = true; }
    else if (!this._leadId) { // 新草稿带入全站需求的容量与租期
      const r = state.get().requirement;
      if (r && Number(r.capacity_m3) > 0) { this._v.custom = true; this._v.sizeRaw = req.pretty(r.capacity_m3); }
      if (r && lead.validTerm(r.term_months)) this._v.term = r.term_months;
    }
    this.load();
  },
  onUnload() { if (this._timer) { clearTimeout(this._timer); this._timer = null; } },
  load() {
    const jobs = [pd.cityStores(), this._leadId ? api.getLead({ id: this._leadId }).catch((e) => (e && (e.code === 'NOT_FOUND' || e.code === 'UNAUTHENTICATED') ? null : Promise.reject(e))) : Promise.resolve(undefined)];
    return pd.load(this, Promise.all(jobs), (res) => {
      const seen = {}; this._districts = [];
      (res[0] || []).forEach((s) => { if (s.district && !seen[s.district]) { seen[s.district] = 1; this._districts.push(s.district); } });
      const ex = res[1];
      let blocked = false, editing = false;
      if (this._leadId) {
        if (!ex || ex.type !== lead.TYPES.ENTERPRISE || ex.status === lead.STATUS.WITHDRAWN) blocked = true;
        else { editing = true; this._v = this.fromLead(ex); }
      }
      this.setData({ blocked, editing, restored: !!this._restored, step: this._v.step === 2 && !blocked ? 2 : 1 });
      this.render();
    });
  },
  fromLead(x) {
    const b = lead.bandOf(x.capacity_band);
    const base = String(x.address || '').split(Z.otherAreasJoin)[0];
    return Object.assign(blank(), { location: base, areas: x.other_areas || [], band: b ? b.key : '', custom: !b && x.capacity_m3 !== null && x.capacity_m3 !== undefined, sizeRaw: !b && x.capacity_m3 ? req.pretty(x.capacity_m3) : '', term: x.term_months || null, types: x.storage_types || [], typeOther: x.storage_type_other || '', move: x.moving_support || Z.moveDefault, name: x.contact_name || '', company: x.company || '', date: x.expected_start_date || '', notes: x.note || '' });
  },
  onRetry() { this.setData({ sys: 'loading' }); this.load(); },
  // 把 this._v 变成界面数据，并把草稿存本机
  render(extra) {
    const v = this._v, cap = lead.bizCapacity(v), open = v.areasOpen || v.areas.length > 0;
    const sizeText = v.custom ? (cap.capacity_m3 !== null ? cap.label : v.sizeRaw ? v.sizeRaw + 'm³' : Z.sizeEmpty) : (cap.label || Z.sizeNone);
    const sizeNote = cap.large ? Z.salesNote : cap.match && !this.data.sizeErr ? T.fn.matchNote(req.pretty(cap.match)) : '';
    this.setData(Object.assign({
      location: v.location, areasOpen: open, areaChips: this._districts.map((a) => ({ a, on: v.areas.indexOf(a) >= 0 })),
      areasNote: v.areas.length ? T.fn.areasPicked(v.areas.length) : T.fn.areasList(this._city),
      bandChips: L.bizBands.map((b) => ({ key: b.key, label: b.label, on: !v.custom && v.band === b.key })), custom: v.custom, sizeRaw: v.sizeRaw, sizeNote,
      term: v.term, typeChips: Z.typeOptions.map((t) => ({ t, on: v.types.indexOf(t) >= 0 })), typeOtherOn: v.types.indexOf(Z.typeOther) >= 0, typeOther: v.typeOther,
      moveChips: Z.moveOptions.map((t) => ({ t, on: v.move === t })), moveNeed: v.move === Z.moveYes,
      sumText: [sizeText, v.term ? fmt.termText(v.term) : Z.termNone].filter(Boolean).join(' · '), typeSum: v.types.join('、'), // IMPL-01：容量 · 租期是同级规格，保留分隔符；物品类型另起一行，不再接在后面
      areaSum: v.areas.length ? Z.otherAreas + v.areas.join('、') : '',
      name: v.name, company: v.company, date: v.date, notes: v.notes, notesCount: v.notes.length + '/' + L.bizNotesMax
    }, extra || {}));
    if (!this.data.editing && !this.data.saved) state.set(DRAFT, Object.assign({}, v, { step: this.data.step }));
  },
  locked() { return this.data.status === 'submitting' || this.data.status === 'unknown'; },
  touch() { this._rechecked = false; if (this.data.status === 'failed') { this._key = ''; this.setData({ status: 'editing' }); } if (this.data.restored) this.setData({ restored: false }); },
  // —— 第 1 步 ——
  onLocation(e) { if (this.locked()) return; this._v.location = e.detail.value; this.touch(); this.render(); },
  onAreasOpen() { this._v.areasOpen = true; this.render(); },
  onArea(e) {
    const a = (this.data.areaChips[Number(e.currentTarget.dataset.i)] || {}).a; if (!a || this.locked()) return;
    const i = this._v.areas.indexOf(a); if (i >= 0) this._v.areas.splice(i, 1); else this._v.areas.push(a);
    this.touch(); this.render();
  },
  onBand(e) {
    const k = e.currentTarget.dataset.k;
    if (this.locked()) return;
    if (k === 'custom') { this._v.custom = true; this._v.band = ''; }
    else if (lead.bandOf(k)) { this._v.custom = false; this._v.band = k; }
    this.touch(); this.render({ sizeErr: '' });
  },
  onSize(e) { if (this.locked()) return; this._v.sizeRaw = e.detail.value; this.touch(); this.setData({ sizeErr: '' }); this.render(); },
  onEstimate() { wx.navigateTo({ url: routes.CAPACITY }); },
  onTerm(e) { const m = e.detail && e.detail.months; if (lead.validTerm(m) && !this.locked()) { this._v.term = m; this.touch(); this.render({ termErr: '' }); } },
  onType(e) {
    const t = (this.data.typeChips[Number(e.currentTarget.dataset.i)] || {}).t; if (!t || this.locked()) return;
    const i = this._v.types.indexOf(t); if (i >= 0) this._v.types.splice(i, 1); else this._v.types.push(t);
    this.touch(); this.render();
  },
  onTypeOther(e) { if (this.locked()) return; this._v.typeOther = e.detail.value; this.touch(); this.render(); },
  onMove(e) { const t = (this.data.moveChips[Number(e.currentTarget.dataset.i)] || {}).t; if (t && !this.locked()) { this._v.move = t; this.touch(); this.render(); } },
  // 下一步 / 提交 / 查看仓位前的草稿校验：自定义容量填了就必须有效；租期选了就必须有效
  draftError() {
    const v = this._v;
    if (v.custom && String(v.sizeRaw).trim() && lead.bizCapacity(v).error) return 'size';
    if (v.term !== null && !lead.validTerm(v.term)) return 'term';
    return '';
  },
  showDraftError(code) {
    this.setData({ sizeErr: code === 'size' ? Z.err.size : '', termErr: code === 'term' ? Z.err.term : '' }); this.render();
    wx.showToast({ title: Z.err[code] || T.common.checkForm, icon: 'none' });
  },
  onBrowse() {
    if (this.locked()) return;
    const v = this._v, cap = lead.bizCapacity(v);
    let code = this.draftError();
    if (!code) code = !cap.match ? 'browseSize' : !lead.validTerm(v.term) ? 'browseTerm' : '';
    if (code) return this.showDraftError(code);
    // 带入找仓：区间取上限
    state.setRequirement({ capacity_m3: cap.match, input_unit: 'm3', input_value: cap.match, source: 'manual', term_months: v.term });
    wx.switchTab({ url: routes.STORES });
  },
  onNext() {
    if (this.data.blocked || this.locked()) return;
    const code = this.draftError(); if (code) return this.showDraftError(code);
    this._v.step = 2; this.setData({ step: 2, sizeErr: '', termErr: '' }); this.render(); wx.pageScrollTo({ scrollTop: 0, duration: 0 });
  },
  onPrev() { if (this.locked()) return; this._v.step = 1; this.setData({ step: 1 }); this.render(); wx.pageScrollTo({ scrollTop: 0, duration: 0 }); },
  onNeeds() { wx.navigateTo({ url: routes.NEEDS }); },
  onNewLead() { // 新建企业需求：丢开正在修改的那条，回到空表单
    this._leadId = ''; this._v = blank(); this._key = ''; this._rechecked = false;
    this.setData({ blocked: false, editing: false, saved: false, status: 'editing', locked: false, primary: Z.submit, step: 1, errPhone: '', errDate: '', sizeErr: '', termErr: '' }); this.render();
  },
  // —— 第 2 步 ——
  onName(e) { if (this.locked()) return; this._v.name = e.detail.value; this.touch(); this.render(); },
  onCompany(e) { if (this.locked()) return; this._v.company = e.detail.value; this.touch(); this.render(); },
  onNotes(e) { if (this.locked()) return; this._v.notes = String(e.detail.value || '').slice(0, L.bizNotesMax); this.touch(); this.render(); },
  onPhoneChange(e) { this._contact = (e.detail && e.detail.phone) || ''; if (e.detail && e.detail.ready) this.setData({ errPhone: '' }); },
  onPhoneLogin() { this.setData({ errPhone: '' }); },
  onOpenDate() { if (this.locked()) return; const opts = lead.dateOptions(L.bizDateOffsets, Date.now()); this.setData({ sheet: 'date', dateDraft: this._v.date, dateOptions: opts.map((d) => ({ d, on: d === this._v.date })) }); },
  onPickDate(e) { const d = (this.data.dateOptions[Number(e.currentTarget.dataset.i)] || {}).d || ''; this.setData({ dateDraft: d, dateOptions: this.data.dateOptions.map((x) => ({ d: x.d, on: x.d === d })) }); },
  onDateOk() { this._v.date = this.data.dateDraft; this.touch(); this.setData({ sheet: '', errDate: '' }); this.render(); },
  onSheetClose() { this.setData({ sheet: '' }); },
  input() {
    const v = this._v, cap = lead.bizCapacity(v);
    return {
      type: lead.TYPES.ENTERPRISE, request_key: this._key, lead_id: this._leadId || undefined, phone: this._contact,
      address: v.location + (v.areas.length ? Z.otherAreasJoin + v.areas.join('、') : ''), other_areas: v.areas.slice(),
      contact_name: v.name, company: v.company, capacity_m3: v.custom ? cap.capacity_m3 : null, capacity_band: v.custom ? '' : cap.band, term_months: v.term,
      storage_types: v.types.slice(), storage_type_other: v.types.indexOf(Z.typeOther) >= 0 ? v.typeOther : '', moving_support: v.move, expected_start_date: v.date, note: v.notes
    };
  },
  onSubmit() {
    if (this.data.blocked || this.locked() || this.data.status === 'submitting') return;
    const code = this.draftError(); if (code) { this._v.step = 1; this.setData({ step: 1 }); return this.showDraftError(code); }
    if (!(this._contact || auth.isLoggedIn())) { this.setData({ errPhone: Z.err.phone }); wx.showToast({ title: Z.err.phone, icon: 'none' }); return; }
    if (!this._key) this._key = key();
    return this.send();
  },
  send() {
    this.setData({ status: 'submitting', locked: true, primary: Z.saving });
    return api.submitLead(this.input()).then((rec) => {
      const updated = !!this._leadId, off = !rec.in_service_hours;
      this._key = ''; this._rechecked = false; this._leadId = rec.id; state.set(DRAFT, null);
      this.setData({
        status: 'editing', locked: false, saved: true, editing: true, restored: false, primary: Z.update,
        dialog: { title: updated ? Z.updatedTitle : T.ack.submitted, ack: off ? T.ack.offHours : T.ack.inHours, fine: off ? '' : Z.offPrefix + T.ack.offHours, hoursNote: T.ack.hoursNote, no: T.ack.leadNo + rec.no }
      });
    }).catch((err) => {
      const code = err && err.code, f = err && err.field;
      const back = { status: 'editing', locked: false, primary: this.data.editing ? Z.update : Z.submit };
      if (code === 'INVALID' && f === 'phone') return this.setData(Object.assign(back, { errPhone: Z.err.phone }));
      if (code === 'INVALID' && f === 'date') return this.setData(Object.assign(back, { errDate: Z.err.date }));
      if (code === 'INVALID' && (f === 'capacity' || f === 'term')) { this.setData(Object.assign(back, { step: 1, sizeErr: f === 'capacity' ? Z.err.capacity : '', termErr: f === 'term' ? Z.err.term : '' })); this._v.step = 1; return; }
      if (code === 'NOT_FOUND' || code === 'CONFLICT') { this.setData(Object.assign(back, { blocked: true, editing: false, step: 1 })); wx.showToast({ title: code === 'CONFLICT' ? Z.err.withdrawn : Z.err.notFound, icon: 'none' }); return; }
      if (code === 'TIMEOUT') { // 回执超时：锁定表单，稍后用同一个 request_key 自动核对一次；再超时就停在未确认态，由提示条上的「核对提交结果」手动再核对
        this.setData({ status: 'unknown', locked: true, primary: this.data.editing ? Z.update : Z.submit });
        if (!this._rechecked) { this._rechecked = true; this._timer = setTimeout(() => { this._timer = null; this.send(); }, L.recheckMs); }
        return;
      }
      this.setData(Object.assign(back, { status: 'failed' }));
    });
  },
  onRetrySubmit() {
    if (this.data.status === 'failed') return this.send();
    if (this.data.status === 'unknown') { if (this._timer) { clearTimeout(this._timer); this._timer = null; } return this.send(); } // 手动核对：同一个 request_key
  },
  onDialogFind() { this.setData({ dialog: null }); wx.switchTab({ url: routes.STORES }); },
  onDialogClose() { this.setData({ dialog: null }); },
  onDialogNeeds() { this.setData({ dialog: null }); wx.navigateTo({ url: routes.NEEDS }); },
  // 转发（R-15）：只转发空表单入口，不带正在修改的线索 id
  onShareAppMessage() { return share.message(routes.BUSINESS, { title: T.share.business }); },
  noop() {}
}));
