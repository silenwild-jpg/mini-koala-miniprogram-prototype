// S02看仓线索：独立于预约用仓，不锁仓、不创建订单。手填电话不创建登录态。
// 看仓时间：日期快捷项只有今天 / 明天 / 后天（再点一次取消，或用日期选择器选其他日期）；「待电话确认」只在时段里出现一次。
// 选「今天」加已过去的时段不能提交（时段结束钟点在 core/config-lead.js，自定）。
// 报错位置：电话、看仓时间、容量各在自己的字段下；提交失败 / 结果未确认的句子在提交按钮上方。
const state = require('../../services/state');
const api = require('../../services/api');
const lead = require('../../core/lead');
const requirement = require('../../core/requirement');
const matching = require('../../core/matching');
const T = require('../../i18n/lead').visit;
Component({
  options: { addGlobalClass: true },
  properties: { visible: Boolean, store: Object, unitId: String },
  data: { T, phone: '', phoneMasked: '', phoneError: '', phoneFocus: false, capacity: '', unitIndex: 0, units: [], dates: [], dateIndex: 0, date: '', dateMin: '', slots: T.slots, slotIndex: 0, dateError: '', capError: '', error: '', busy: false, success: null, loginVisible: false, unknown: false },
  observers: { visible(v) { if (v) this.open(); } },
  methods: {
    open() {
      if (this._busy) return;
      const r = state.get().requirement, s = state.get().session, store = this.data.store;
      if (!store) return;
      const units = [{ id: '', label: T.noUnit }].concat((store.units || []).filter(matching.isAvailable).map(u => ({ id: u.id, label: u.code + ' · ' + u.volume + 'm³' })));
      const dates = lead.dateOptions([0,1,2], Date.now()).map((date, i) => ({ date, label: T.days[i] + ' ' + date.slice(5) }));
      this._key = 'VISIT_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      this._payload = null;
      this.setData({ phone: '', phoneMasked: s.loggedIn ? s.phoneMasked : '', phoneError: '', phoneFocus: false, capacity: r ? String(r.capacity_m3) : '', units, unitIndex: Math.max(0, units.findIndex(u => u.id === this.data.unitId)), dates, dateIndex: -1, date: '', dateMin: lead.dateStr(Date.now()), slotIndex: 0, dateError: '', capError: '', error: '', success: null, unknown: false });
    },
    onPhone(e) { this.setData({ phone: e.detail.value, phoneError: '', error: '' }); },
    onPhoneBlur() { this.setData({ phoneFocus: false }); },
    onCapacity(e) { this.setData({ capacity: e.detail.value, capError: '', error: '' }); },
    onUnit(e) { this.setData({ unitIndex: Number(e.detail.value) }); },
    onDateQuick(e) {
      const i = Number(e.currentTarget.dataset.i), d = this.data;
      if (!d.dates[i] || d.busy || d.unknown) return;
      const off = d.dateIndex === i; // 再点一次已选的日期 = 不指定日期
      this.setData({ dateIndex: off ? -1 : i, date: off ? '' : d.dates[i].date, dateError: '', error: '' });
    },
    onDate(e) { const v = e.detail.value; this.setData({ dateIndex: this.data.dates.findIndex((x) => x.date === v), date: v, dateError: '', error: '' }); },
    onSlot(e) { this.setData({ slotIndex: Number(e.detail.value), dateError: '', error: '' }); },
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
        if (v && !v.ok) { this.setData({ capError: T.errCap, error: '' }); return Promise.resolve(); }
        if (d.date && !lead.validDate(d.date, Date.now())) { this.setData({ dateError: T.errDate, error: '' }); return Promise.resolve(); }
        if (lead.slotPassed(d.date, d.slotIndex, Date.now())) { this.setData({ dateError: T.errSlot, error: '' }); return Promise.resolve(); }
        this._payload = { type: lead.TYPES.VISIT, source: 'S02', request_key: this._key, store_id: d.store.id, phone: d.phone, preferred_date: d.date, time_slot: d.slots[d.slotIndex], unit_id: (d.units[d.unitIndex] || {}).id || '', capacity_m3: v ? v.capacity_m3 : null };
      }
      this._busy = true; this.setData({ busy: true, phoneError: '', phoneFocus: false, dateError: '', capError: '', error: '' });
      return api.submitLead(this._payload).then(rec => {
        // 日期和时段都没指定时只写一次「待电话确认」
        this.setData({ success: { no: rec.no, line: [rec.phone_masked, rec.preferred_date, rec.time_slot].filter(Boolean).join(' · ') }, unknown: false });
        this.triggerEvent('success', { id: rec.id });
      }).catch(err => {
        const unknown = err && err.code === 'TIMEOUT';
        if (!unknown) this._payload = null;
        this.setData({ unknown, error: unknown ? T.unknown : (err && err.message) || T.failed });
      }).then(() => { this._busy = false; this.setData({ busy: false }); });
    }
  }
});
