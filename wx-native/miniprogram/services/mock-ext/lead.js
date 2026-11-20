// 演示数据适配器的「lead」部分（W34）。methods 里的每个函数签名为 (params, session) => Promise，与真实接口同名同结构。
// 线索（交接 v1.0 §4.9、§6「线索」）：预约 / 顾问 / 企业 / 运输预约 / 咨询都记一条，写进 db.leads。
// 线索对象：
//   id, no（对外编号，规则未定，暂用 4 位序号）, type: booking|advisor|enterprise|transport|support, source: ''|'estore'|'business'
//   status: submitted|withdrawn, accepted_at（受理时间）, in_service_hours（是否在服务时段，D-149）
//   store_id, store_name（意向门店）, address（用仓位置 / 取送地址）, phone_masked, location（定位点，可空）
//   start_hint, preferred_date, items, capacity_hint, capacity_m3, capacity_band（区间容量）, term_hint, term_months, note
//   企业：other_areas[]（其他用仓区域）, contact_name, company, storage_types[], storage_type_other, moving_support, expected_start_date
//   运输：order_id, date；咨询：support_type, text, order_id
// 联系电话：已登录用登录手机号（接口侧凭登录态取号，演示数据只有脱敏号）；p.phone 是本次另填并验证过的号码。
// submitLead 覆盖 mock-adapter.js 里的同名基础方法。带 request_key 时同一个 key 只落一条（重试 / 核对提交结果不重复建单）。
const { db } = require('./_db');
const stores = require('../../mock/stores');
const L = require('../../core/config-lead');
const lead = require('../../core/lead');
const req = require('../../core/requirement');
const ok = (v) => new Promise((resolve) => setTimeout(() => resolve(JSON.parse(JSON.stringify(v))), 0));
const fail = (code, message, field) => Promise.reject({ code, message, field: field || '' });
const T = lead.TYPES;
const kv = () => { if (!db.kv.lead) db.kv.lead = { seq: 0, keys: {}, failNext: '' }; return db.kv.lead; };
const str = (v, max) => String(v === undefined || v === null ? '' : v).trim().slice(0, max);
const owned = (session) => (session && session.loggedIn ? db.leads : []);
const find = (id) => db.leads.find((x) => x.id === id);

function phoneOf(p, session) {
  if (p.phone) return lead.validPhone(p.phone) ? lead.maskPhone(p.phone) : '';
  return session && session.loggedIn ? session.phoneMasked || '' : '';
}
function build(p, session, now) {
  const type = p.type || T.BOOKING;
  if ([T.BOOKING, T.ADVISOR, T.ENTERPRISE, T.TRANSPORT, T.SUPPORT, T.VISIT].indexOf(type) < 0) return { err: ['INVALID', '线索类型不正确', 'type'] };
  const phone = phoneOf(p, session);
  if (!phone) return { err: ['INVALID', '请填写有效联系电话', 'phone'] };
  const address = str(p.address, 10 * L.addressMax);
  if (!lead.validAddress(address, type === T.BOOKING || type === T.TRANSPORT)) return { err: ['INVALID', '请填写用仓位置（不超过120字）', 'address'] };
  const store = p.store_id ? stores.find((s) => s.id === p.store_id) : null;
  const rec = { type, source: str(p.source, 20), store_id: store ? store.id : '', store_name: store ? store.name : '', address, phone_masked: phone, location: p.location || null, note: str(p.note, L.bizNotesMax) };
  if (type === T.VISIT) {
    if (!store || store.status !== 'open') return { err: ['INVALID', '请选择可预约的门店', 'store'] };
    if (p.preferred_date && !lead.validDate(p.preferred_date, now)) return { err: ['INVALID', '请选择有效看仓日期', 'date'] };
    const units = require('../../mock/inventory');
    const unit = p.unit_id ? units.find(u => u.id === p.unit_id && u.store_id === store.id && u.status === 'available') : null;
    if (p.unit_id && !unit) return { err: ['INVALID', '意向仓位已售出，请重新选择或留空', 'unit'] };
    const v = p.capacity_m3 === null || p.capacity_m3 === undefined || p.capacity_m3 === '' ? null : req.validate('m3', p.capacity_m3);
    if (v && !v.ok) return { err: ['INVALID', '请填写有效容量，或留空', 'capacity'] };
    if (!['待电话确认', '上午', '下午', '晚上'].includes(p.time_slot)) return { err: ['INVALID', '请选择有效时间段', 'time'] };
    Object.assign(rec, { address: store.address, preferred_date: str(p.preferred_date, 10), time_slot: p.time_slot, unit_id: unit ? unit.id : '', capacity_m3: v ? v.capacity_m3 : null });
  }
  if (type === T.BOOKING || type === T.ADVISOR) {
    Object.assign(rec, { start_hint: str(p.start_hint, 20), preferred_date: str(p.preferred_date, 10), items: str(p.items, 40), capacity_hint: str(p.capacity_hint, 40), term_hint: str(p.term_hint, 20) });
    rec.capacity_m3 = Number(p.capacity_m3) > 0 ? Number(p.capacity_m3) : null; // 接受任意小数；「30m³ 及以上」只有文字
    rec.term_months = lead.validTerm(p.term_months) ? p.term_months : null;
    if (rec.preferred_date && !lead.validDate(rec.preferred_date, now)) return { err: ['INVALID', '请选择有效的预计用仓日期', 'date'] };
  }
  if (type === T.ENTERPRISE) {
    const band = p.capacity_band ? lead.bandOf(p.capacity_band) : null;
    let m3 = null;
    if (p.capacity_m3 !== null && p.capacity_m3 !== undefined && p.capacity_m3 !== '') {
      const c = lead.customSize(p.capacity_m3);
      if (!c.ok) return { err: ['INVALID', '请填写0.5m³–200㎡的有效容量', 'capacity'] };
      m3 = c.capacity_m3;
    }
    if (p.term_months !== null && p.term_months !== undefined && !lead.validTerm(p.term_months)) return { err: ['INVALID', '租期请选择1–60个月的整数', 'term'] };
    if (p.expected_start_date && !lead.validDate(p.expected_start_date, now)) return { err: ['INVALID', '请选择有效的预计用仓日期', 'date'] };
    Object.assign(rec, {
      capacity_m3: m3, capacity_band: band ? band.label : '', capacity_hint: band ? band.label : '', term_months: p.term_months || null,
      other_areas: (p.other_areas || []).map((a) => str(a, 20)).filter(Boolean), contact_name: str(p.contact_name, L.nameMax), company: str(p.company, L.nameMax),
      storage_types: (p.storage_types || []).map((a) => str(a, 20)).filter(Boolean), storage_type_other: str(p.storage_type_other, 40),
      moving_support: str(p.moving_support, 10), expected_start_date: str(p.expected_start_date, 10)
    });
  }
  if (type === T.TRANSPORT) {
    if (!lead.validDate(p.date, now)) return { err: ['INVALID', '请选择有效的运输日期', 'date'] };
    if (p.order_id && !db.orders.find((o) => o.id === p.order_id)) return { err: ['NOT_FOUND', '未找到这笔订单，请从订单列表进入', 'order'] };
    Object.assign(rec, { date: p.date, order_id: p.order_id || '' });
  }
  if (type === T.SUPPORT) {
    const text = str(p.text, L.supportTextMax);
    if (!text) return { err: ['INVALID', '请填写咨询内容', 'text'] };
    if (p.order_id && !db.orders.find((o) => o.id === p.order_id)) return { err: ['NOT_FOUND', '未找到这笔订单，请从订单列表进入', 'order'] };
    Object.assign(rec, { text, support_type: str(p.support_type, 20) || 'general', order_id: p.order_id || '' });
  }
  return { rec };
}
const methods = {
  // { type, request_key?, lead_id?（企业：更新已有需求）, ...字段 } → 线索对象
  submitLead(p, session) {
    const k = kv(), now = Date.now();
    if (p.request_key && k.keys[p.request_key]) { const old = find(k.keys[p.request_key]); if (old) return ok(old); }
    const b = build(p, session, now);
    if (b.err) return fail(b.err[0], b.err[1], b.err[2]);
    // 仅供测试：failNext = 'network' 时本次不落库并失败；'timeout' 时已落库但回执超时（页面显示「提交结果暂未确认」）
    const sim = k.failNext; k.failNext = '';
    if (sim === 'network') return fail('NETWORK', '暂时无法提交，请重试或返回修改。');
    let rec;
    if (p.lead_id) {
      rec = find(p.lead_id);
      if (!rec || rec.type !== T.ENTERPRISE) return fail('NOT_FOUND', '这条需求已不存在，请从「预约用仓」重新打开，或重新提交');
      if (rec.status === lead.STATUS.WITHDRAWN) return fail('CONFLICT', '这条需求已撤回，可重新提交');
      Object.assign(rec, b.rec, { updated_at: now });
    } else {
      const ack = lead.ackAt(now);
      const seq = ++k.seq;
      rec = Object.assign({ id: 'LEAD' + lead.leadNo(seq), no: lead.leadNo(seq), status: lead.STATUS.SUBMITTED, accepted_at: now, in_service_hours: ack.in_service_hours }, b.rec);
      db.leads.push(rec);
    }
    if (p.request_key) k.keys[p.request_key] = rec.id;
    if (sim === 'timeout') return fail('TIMEOUT', '提交结果暂未确认，请勿重复提交。');
    return ok(rec);
  },
  // { types? } → 预约记录（新的在前）。默认只列预约 / 顾问 / 企业三类；未登录返回空表
  getLeads(p, session) {
    const types = p.types && p.types.length ? p.types : [T.BOOKING, T.ADVISOR, T.ENTERPRISE, T.VISIT];
    return ok(owned(session).filter((x) => types.indexOf(x.type) >= 0).slice().reverse());
  },
  getLead(p, session) { const x = owned(session).find((l) => l.id === p.id); return x ? ok(x) : fail('NOT_FOUND', '这条需求已不存在'); },
  // 撤回：撤回后不再作为有效需求展示，记录保留
  cancelLead(p) {
    const x = find(p.id);
    if (!x) return fail('NOT_FOUND', '这条需求已不存在');
    x.status = lead.STATUS.WITHDRAWN; x.withdrawn_at = Date.now();
    return ok(x);
  },
  // 修改地址与备注；容量、租期和联系方式保留
  updateLead(p) {
    const x = find(p.id);
    if (!x) return fail('NOT_FOUND', '这条需求已不存在');
    if (x.status === lead.STATUS.WITHDRAWN) return fail('CONFLICT', '该需求已撤回');
    const address = str(p.address, 10 * L.addressMax);
    if (!lead.validAddress(address, x.type !== T.ADVISOR)) return fail('INVALID', '请填写用仓位置（不超过120字）', 'address');
    x.address = address; x.note = str(p.note, L.noteMax); x.updated_at = Date.now();
    return ok(x);
  },
  // 某订单的运输预约记录（旧的在前）
  getTransportRecords(p, session) { return ok(owned(session).filter((x) => x.type === T.TRANSPORT && x.order_id === p.order_id)); },
  // 改本次联系电话：短信验证其他手机号，只用于本次线索，不更换登录手机号（D-126）。验证码用 sendSmsCode 发；演示环境任意 6 位数字通过。
  verifyContactPhone(p) {
    const phone = lead.cleanPhone(p.phone), rec = db.sms[phone];
    if (!lead.validPhone(phone)) return fail('INVALID', '请输入 11 位手机号');
    if (!rec) return fail('INVALID', '请先获取验证码');
    if (Date.now() - rec.at > 300000) return fail('EXPIRED', '验证码已过期，请重新获取');
    if (!/^\d{6}$/.test(String(p.code))) return fail('INVALID', '请输入 6 位验证码');
    return ok({ phone, phoneMasked: lead.maskPhone(phone) });
  }
};
module.exports = { needLogin: ['cancelLead', 'updateLead', 'verifyContactPhone'], methods };
