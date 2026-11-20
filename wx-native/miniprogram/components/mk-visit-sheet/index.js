// S02看仓线索：独立于预约用仓，不锁仓、不创建订单。手填电话不创建登录态。
const state = require('../../services/state');
const api = require('../../services/api');
const lead = require('../../core/lead');
const requirement = require('../../core/requirement');
const matching = require('../../core/matching');
const T = require('../../i18n/lead').visit;
Component({
  options: { addGlobalClass: true },
  properties: { visible: Boolean, store: Object, unitId: String },
  data: { T, phone: '', phoneMasked: '', phoneError: '', phoneFocus: false, capacity: '', unitIndex: 0, units: [], dates: [], dateIndex: 0, date: '', dateMin: '', slots: T.slots, slotIndex: 0, error: '', busy: false, success: null, loginVisible: false, unknown: false },
  observers: { visible(v) { if (v) this.open(); } },
  methods: {
    open() {
      if (this._busy) return;
      const r = state.get().requirement, s = state.get().session, store = this.data.store;
      if (!store) return;
      const units = [{ id: '', label: T.noUnit }].concat((store.units || []).filter(matching.isAvailable).map(u => ({ id: u.id, label: u.code + ' · ' + u.volume + 'm³' })));
      const dates = [{ date: '', label: T.slots[0] }].concat(lead.dateOptions([0,1,2], Date.now()).map((date, i) => ({ date, label: T.days[i] + ' ' + date.slice(5) })));
      this._key = 'VISIT_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      this._payload = null;
      this.setData({ phone: '', phoneMasked: s.loggedIn ? s.phoneMasked : '', phoneError: '', phoneFocus: false, capacity: r ? String(r.capacity_m3) : '', units, unitIndex: Math.max(0, units.findIndex(u => u.id === this.data.unitId)), dates, dateIndex: 0, date: '', dateMin: lead.dateStr(Date.now()), slotIndex: 0, error: '', success: null, unknown: false });
    },
    onPhone(e) { this.setData({ phone: e.detail.value, phoneError: '', error: '' }); },
    onPhoneBlur() { this.setData({ phoneFocus: false }); },
    onCapacity(e) { this.setData({ capacity: e.detail.value, error: '' }); },
    onUnit(e) { this.setData({ unitIndex: Number(e.detail.value) }); },
    onDateQuick(e) { const i = Number(e.currentTarget.dataset.i); if (this.data.dates[i]) this.setData({ dateIndex: i, date: this.data.dates[i].date }); },
    onDate(e) { this.setData({ dateIndex: -1, date: e.detail.value, error: '' }); },
    onSlot(e) { this.setData({ slotIndex: Number(e.detail.value) }); },
    onWechat() { this.setData({ loginVisible: true }); },
    onLoginClose() { this.setData({ loginVisible: false }); },
    onLoginSuccess() { this.setData({ loginVisible: false, phoneMasked: state.get().session.phoneMasked, phoneError: '', phoneFocus: false, error: '' }); },
    onClose() { if (!this._busy) this.triggerEvent('close'); },
    onSubmit() {
      if (this._busy || this.data.success) return Promise.resolve();
      const d = this.data, session = state.get().session;
      // 回执超时复用同一幂等键和原始载荷，避免重复销售线索。
      // 已登录时报错不再提「使用微信手机号」，那个按钮此时不显示
      if (!this._payload) {
        if ((!d.phone && !(session.loggedIn && d.phoneMasked)) || (d.phone && !lead.validPhone(d.phone))) { this.setData({ phoneError: session.loggedIn && d.phoneMasked ? T.errPhoneVerified : T.errPhone, phoneFocus: true, error: '' }); return Promise.resolve(); }
        const v = d.capacity ? requirement.validate('m3', d.capacity) : null;
        if (v && !v.ok) { this.setData({ error: T.errCap }); return Promise.resolve(); }
        if (d.date && !lead.validDate(d.date, Date.now())) { this.setData({ error: T.errDate }); return Promise.resolve(); }
        this._payload = { type: lead.TYPES.VISIT, source: 'S02', request_key: this._key, store_id: d.store.id, phone: d.phone, preferred_date: d.date, time_slot: d.slots[d.slotIndex], unit_id: (d.units[d.unitIndex] || {}).id || '', capacity_m3: v ? v.capacity_m3 : null };
      }
      this._busy = true; this.setData({ busy: true, phoneError: '', phoneFocus: false, error: '' });
      return api.submitLead(this._payload).then(rec => {
        this.setData({ success: { no: rec.no, phone: rec.phone_masked, date: rec.preferred_date || T.slots[0], slot: rec.time_slot }, unknown: false });
        this.triggerEvent('success', { id: rec.id });
      }).catch(err => {
        const unknown = err && err.code === 'TIMEOUT';
        if (!unknown) this._payload = null;
        this.setData({ unknown, error: unknown ? T.unknown : (err && err.message) || T.failed });
      }).then(() => { this._busy = false; this.setData({ busy: false }); });
    }
  }
});
