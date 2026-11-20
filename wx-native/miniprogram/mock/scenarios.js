// 演示场景：一键切到某类用户的完整状态（登录态、定位、需求、订单），用于逐状态核对界面。只在演示数据下生效。
// orders 为 null = 沿用默认 5 笔演示订单；[] = 没有订单；其余按 _db.mk 的参数造单（时间相对当前时刻）。
// 订单里的 after 把租后进度直接摆到某一步（services/mock-ext/_db.js applyAfter）：renew / exit / deposit / invoice / identity。
// 账户和留资（各模块第一次取数时按当前场景造，写法见各适配器文件头）：
//   leads[]    预约记录（mock-ext/lead.js seedLeads）：{ type, source?, agoHours, withdrawn?, store?, address?, cap?, band?, months?, note?, date?, slot? }
//   messages[] 消息（mock-ext/after.js seedMessages）：{ type, title（i18n/after messages.demo 的键）, agoHours, read?, order?（第几笔订单，从 0 起） }
//   favorites  收藏 { stores[], units[] }，写进本机状态（services/demo.js）
//   account    { claimed?: 已领新客券, cert?: 'reviewing'|'verified'|'failed' }（mock-ext/account.js init）
const C = require('../core/config');
const KEY = 'mk_demo_v1';
const NEED = { capacity_m3: 3.5, input_unit: 'm3', input_value: 3.5, term_months: 6, source: 'manual' };
// 3 家门店 8 笔订单，各阶段都有；「多门店多笔订单」「消息较多」两个场景共用
const MULTI = [
  { store: 'SIM_BJ02', units: ['SIM_BJ02_U01'], months: 3, agoDays: 0, stage: 'PENDING' },
  { store: 'SIM_BJ03', units: ['SIM_BJ03_U02'], months: 6, agoDays: 1, startInDays: 5, stage: 'PAID' },
  { store: 'SIM_BJ01', units: ['SIM_BJ01_U05'], months: 12, agoDays: 40, startInDays: -39, stage: 'ACTIVE', after: { invoice: 'issued' } },
  { store: 'SIM_BJ03', units: ['SIM_BJ03_U01'], months: 6, agoDays: 80, startInDays: -79, stage: 'ACTIVE', after: { renew: 'submitted', renewMonths: 3 } },
  { store: 'SIM_BJ01', units: ['SIM_BJ01_U03'], months: 12, agoDays: 350, startInDays: -349, stage: 'EXPIRING', factor: 0.6 },
  { store: 'SIM_BJ02', units: ['SIM_BJ02_U03'], months: 3, agoDays: 89, startInDays: -88, stage: 'EXPIRING', after: { exit: 'waiting' } },
  { store: 'SIM_BJ01', units: ['SIM_BJ01_U01'], months: 3, agoDays: 200, startInDays: -199, stage: 'ENDED', depositPartial: 40 },
  { store: 'SIM_BJ02', units: ['SIM_BJ02_U02'], months: 1, agoDays: 20, stage: 'CANCELLED' }
];
// 「消息较多」：订单与消息一一对应，且都停在不会自动推进的状态（FIX-01 D-05），消息数与未读数不会自己变
const INBOX = MULTI.map((o, i) => (i === 3 ? Object.assign({}, o, { after: { renew: 'quoted', renewMonths: 3 } }) : i === 4 ? Object.assign({}, o, { after: { invoice: 'failed' } }) : i === 5 ? Object.assign({}, o, { after: { exit: 'failed' } }) : o));
const LIST = [
  { id: 'first_visit', name: '首次访问', desc: '未登录 · 未定位 · 没有用仓需求', login: false, located: false, need: null, orders: null },
  { id: 'guest_browsing', name: '访客找仓中', desc: '未登录 · 已定位 · 需求 3.5m³ 租 6 个月', login: false, located: true, need: NEED, orders: null },
  { id: 'guest_area', name: '访客按面积找仓', desc: '未登录 · 已定位 · 需求 6㎡（约 15m³）租 12 个月', login: false, located: true, need: { capacity_m3: 15, input_unit: 'm2', input_value: 6, term_months: 12, source: 'manual' }, orders: null },
  { id: 'guest_large', name: '访客大容量需求', desc: '未登录 · 已定位 · 需求 35m³ 租 12 个月（提示顾问）', login: false, located: true, need: { capacity_m3: 35, input_unit: 'm3', input_value: 35, term_months: 12, source: 'manual' }, orders: null },
  { id: 'member_new', name: '新注册用户', desc: '已登录 · 没有订单 · 有用仓需求', login: true, located: true, need: NEED, orders: [] },
  { id: 'member_pending', name: '有待支付订单', desc: '已登录 · 1 笔待支付（3 小时内有效）', login: true, located: true, need: NEED, orders: [{ store: 'SIM_BJ02', units: ['SIM_BJ02_U01'], months: 3, agoDays: 0, stage: 'PENDING' }] },
  { id: 'member_failed', name: '支付失败', desc: '已登录 · 1 笔支付失败待重试', login: true, located: true, need: null, orders: [{ store: 'SIM_BJ02', units: ['SIM_BJ02_U01'], months: 3, agoDays: 0, stage: 'FAILED', failReason: '银行卡余额不足' }] },
  { id: 'member_before_start', name: '已支付待起租', desc: '已登录 · 3 天后起租 · 下单时未实名', login: true, located: true, need: null, orders: [{ store: 'SIM_BJ02', units: ['SIM_BJ02_U02'], months: 6, agoDays: 2, startInDays: 3, stage: 'PAID', identity: false }] },
  { id: 'member_active', name: '租用中（默认）', desc: '已登录 · 5 笔订单覆盖各阶段', login: true, located: true, need: null, orders: null },
  { id: 'member_expiring', name: '即将到期', desc: '已登录 · 1 笔临期订单，可续租或退仓', login: true, located: true, need: null, orders: [{ store: 'SIM_BJ01', units: ['SIM_BJ01_U03'], months: 12, agoDays: 350, startInDays: -349, stage: 'EXPIRING', factor: 0.6 }] },
  { id: 'member_overdue', name: '已逾期', desc: '已登录 · 1 笔逾期未续订单', login: true, located: true, need: null, orders: [{ store: 'SIM_BJ01', units: ['SIM_BJ01_U05'], months: 3, agoDays: 96, startInDays: -95, stage: 'OVERDUE' }] },
  { id: 'member_renew_quote', name: '续租报价待确认', desc: '已登录 · 临期订单的续租报价已出，24 小时内确认', login: true, located: true, need: null, orders: [{ store: 'SIM_BJ01', units: ['SIM_BJ01_U03'], months: 12, agoDays: 350, startInDays: -349, stage: 'EXPIRING', factor: 0.6, after: { renew: 'quoted', renewMonths: 6 } }] },
  { id: 'member_exit_clearing', name: '退仓待清空', desc: '已登录 · 已提交到期退仓，清空后申请验仓', login: true, located: true, need: null, orders: [{ store: 'SIM_BJ01', units: ['SIM_BJ01_U03'], months: 12, agoDays: 361, startInDays: -360, stage: 'EXPIRING', after: { exit: 'requested' } }] }, // 约 5 天后到期：到期退仓在到期前 7 天内才可提交（R-01）
  { id: 'member_inspect_failed', name: '验仓未通过', desc: '已登录 · 门店验仓未通过，需处理后重新申请', login: true, located: true, need: null, orders: [{ store: 'SIM_BJ01', units: ['SIM_BJ01_U05'], months: 3, agoDays: 96, startInDays: -95, stage: 'OVERDUE', after: { exit: 'failed' } }], messages: [{ type: 'exit', title: 'exitRequested', agoHours: 50, read: true, order: 0 }, { type: 'exit', title: 'inspectFailed', agoHours: 1, order: 0 }] },
  { id: 'member_refund_failed', name: '押金退款未成功', desc: '已登录 · 已退仓，押金退款未成功', login: true, located: true, need: null, orders: [{ store: 'SIM_BJ01', units: ['SIM_BJ01_U01'], months: 3, agoDays: 100, startInDays: -99, stage: 'ENDED', after: { exit: 'passed', deposit: 'failed' } }], messages: [{ type: 'deposit', title: 'depositFailed', agoHours: 20, order: 0 }] },
  { id: 'member_invoice_failed', name: '开票未成功', desc: '已登录 · 租用中，首笔付款的发票开具未成功', login: true, located: true, need: null, orders: [{ store: 'SIM_BJ01', units: ['SIM_BJ01_U05'], months: 12, agoDays: 40, startInDays: -39, stage: 'ACTIVE', after: { invoice: 'failed' } }], messages: [{ type: 'invoice', title: 'invoiceFailed', agoHours: 20, order: 0 }] },
  { id: 'member_identity_mismatch', name: '实名未通过', desc: '已登录 · 已支付待起租，付款后补的实名认证未通过', login: true, located: true, need: null, orders: [{ store: 'SIM_BJ02', units: ['SIM_BJ02_U02'], months: 6, agoDays: 2, startInDays: 3, stage: 'PAID', identity: false, after: { identity: 'mismatch' } }], messages: [{ type: 'identity', title: 'identityFail', agoHours: 1, order: 0 }] },
  { id: 'member_closed', name: '订单已取消和已超时', desc: '已登录 · 1 笔已取消、1 笔超时未支付，没有在租订单', login: true, located: true, need: NEED, orders: [{ store: 'SIM_BJ02', units: ['SIM_BJ02_U01'], months: 3, agoDays: 1, stage: 'EXPIRED' }, { store: 'SIM_BJ01', units: ['SIM_BJ01_U02'], months: 6, agoDays: 5, stage: 'CANCELLED' }] },
  { id: 'member_multi', name: '多门店多笔订单', desc: '已登录 · 3 家门店 8 笔订单，各阶段都有', login: true, located: true, need: null, orders: MULTI },
  { id: 'member_leads', name: '有预约记录', desc: '已登录 · 4 条记录：个人预约、企业需求、预约看仓、已撤回的咨询', login: true, located: true, need: NEED, orders: [], leads: [
    { type: 'advisor', agoHours: 96, withdrawn: true, cap: 8, months: 6, note: '想先了解大件家具怎么存' },
    { type: 'visit', agoHours: 30, store: 'SIM_BJ02', date: 2, slot: '下午', cap: 3.5 },
    { type: 'enterprise', agoHours: 5, address: '朝阳区望京 SOHO 附近', band: 0, months: 12, note: '电商备货，旺季前入仓' },
    { type: 'booking', agoHours: 1, store: 'SIM_BJ01', address: '朝阳区安贞西里三区', cap: 3.5, months: 6 }
  ] },
  { id: 'member_inbox', name: '消息较多', desc: '已登录 · 8 笔订单 · 7 条消息，其中 3 条未读', login: true, located: true, need: null, orders: INBOX, messages: [
    { type: 'deposit', title: 'depositRefunded', agoHours: 190 * 24, read: true, order: 6 },
    { type: 'identity', title: 'identityOk', agoHours: 38 * 24, read: true, order: 2 },
    { type: 'invoice', title: 'invoiceIssued', agoHours: 30, read: true, order: 2 },
    { type: 'exit', title: 'exitRequested', agoHours: 26, read: true, order: 5 },
    { type: 'renew', title: 'renewQuote', agoHours: 3, order: 3 },
    { type: 'invoice', title: 'invoiceFailed', agoHours: 2, order: 4 },
    { type: 'exit', title: 'inspectFailed', agoHours: 0.2, order: 5 }
  ] },
  { id: 'member_favorites', name: '有收藏（含已失效）', desc: '已登录 · 收藏 3 家门店、2 个仓位，其中 1 家暂停营业、1 个仓位已租出', login: true, located: true, need: NEED, orders: [], favorites: { stores: ['SIM_BJ01', 'SIM_BJ05', 'SIM_BJ03'], units: ['SIM_BJ01_U03', 'SIM_BJ01_U02'] } },
  { id: 'member_coupons', name: '已领新客券', desc: '已登录 · 没有订单 · 2 张券可用、1 项运输权益', login: true, located: true, need: NEED, orders: [], account: { claimed: true } },
  { id: 'ent_reviewing', name: '企业认证审核中', desc: '已登录 · 租用中 · 企业资料已提交（几秒后出结果，可用「审核暂不处理」停住）', login: true, located: true, need: null, orders: null, account: { cert: 'reviewing' } },
  { id: 'ent_verified', name: '企业已认证', desc: '已登录 · 租用中 · 企业认证通过，可批量开票', login: true, located: true, need: null, orders: null, account: { cert: 'verified' } },
  { id: 'ent_rejected', name: '企业认证未通过', desc: '已登录 · 租用中 · 企业认证未通过，可重新提交', login: true, located: true, need: null, orders: null, account: { cert: 'failed' } },
  { id: 'member_ended', name: '全部已结束', desc: '已登录 · 1 笔已结束订单（押金部分退还）', login: true, located: true, need: NEED, orders: [{ store: 'SIM_BJ01', units: ['SIM_BJ01_U01'], months: 3, agoDays: 200, startInDays: -199, stage: 'ENDED', depositPartial: 40 }] }
];
// 网络档位：instant 供自动化测试；realistic 是在微信里运行时的默认值，让加载态和骨架屏真实出现。
const NET = [
  { id: 'instant', name: '即时', desc: '不加延迟（自动化测试用）', min: 0, max: 0, fail: 0 },
  { id: 'realistic', name: '正常网络', desc: '每次请求 120–450 毫秒', min: 120, max: 450, fail: 0 },
  { id: 'slow', name: '慢速网络', desc: '每次请求 1.5–3 秒', min: 1500, max: 3000, fail: 0 },
  { id: 'flaky', name: '不稳定', desc: '约三成请求失败', min: 300, max: 1200, fail: 0.3 },
  { id: 'offline', name: '断网', desc: '全部请求失败', min: 400, max: 400, fail: 1 }
];
// 库存档位：只改各门店仓位的可租状态（services/mock-ext/_db.js stocked），用来看售罄、容量接近、扩大范围这几类找仓状态。
const STOCK = [
  { id: 'normal', name: '库存正常', desc: '沿用演示库存' },
  { id: 'tight', name: '库存紧张', desc: '每家门店只剩 1 个可租仓位' },
  { id: 'nearby_soldout', name: '附近门店满仓', desc: '最近 4 家门店没有可租仓位' },
  { id: 'city_soldout', name: '全城满仓', desc: '所有门店都没有可租仓位' }
];
// 交易事件与租后事件：在演示工具页打开后，由演示数据适配器在对应接口里触发；once = 触发一次后自动关闭。真实接口没有这些开关。
const EVENTS = [
  { id: 'price_changed', name: '下单时变价', desc: '签署时该仓位月基价上调，出现变价确认', once: true },
  { id: 'unit_gone', name: '仓位被别人租走', desc: '签署时所选仓位已租出', once: true },
  { id: 'pay_fail', name: '支付失败', desc: '下一次支付返回失败，订单进入支付未成功', once: true },
  { id: 'idv_mismatch', name: '实名信息不一致', desc: '下一次实名认证返回姓名与证件号不一致（下单时和付款后补认证都适用）', once: true },
  { id: 'quote_short', name: '报价 30 秒后失效', desc: '报价有效期从 3 小时缩到 30 秒', once: false },
  { id: 'pending_short', name: '待支付 60 秒后超时', desc: '新订单的支付时限从 3 小时缩到 60 秒', once: false },
  { id: 'coupon', name: '有一张可用券', desc: '确认订单时带一张 12 个月长租券', once: false },
  // 租后事件（group: 'after'）：在续租、退仓、押金、发票各页照常操作，到对应步骤时出现
  { id: 'renew_pay_fail', group: 'after', name: '续租支付失败', desc: '下一次续租付款返回失败', once: true },
  { id: 'inspect_fail', group: 'after', name: '验仓未通过', desc: '下一次申请验仓，门店返回未通过', once: true },
  { id: 'refund_fail', group: 'after', name: '押金退款未成功', desc: '下一笔押金退款返回未成功', once: true },
  { id: 'invoice_fail', group: 'after', name: '开票未成功', desc: '下一张发票开具返回未成功', once: true },
  { id: 'store_hold', group: 'after', name: '门店暂不处理', desc: '续租报价、验仓、退款、开票、实名审核都停在等待中，关闭后继续', once: false },
  // 留资与账户事件（group: 'lead'）：在预约、咨询、运输、看仓、企业认证、批量开票各页照常提交，到对应步骤时出现
  { id: 'lead_submit_fail', group: 'lead', name: '提交失败', desc: '下一次提交预约、咨询、运输或看仓需求返回失败，可重试', once: true },
  { id: 'lead_submit_timeout', group: 'lead', name: '提交结果未确认', desc: '下一次提交已受理但回执超时，页面提示核对结果，不重复建单', once: true },
  { id: 'lead_off_hours', group: 'lead', name: '按非服务时段受理', desc: '提交后一律显示非服务时段的受理文案', once: false },
  { id: 'sms_fail', group: 'lead', name: '验证码发送失败', desc: '下一次获取短信验证码返回失败', once: true },
  { id: 'cert_reject', group: 'lead', name: '企业认证未通过', desc: '下一次企业认证审核返回未通过', once: true },
  { id: 'batch_invoice_fail', group: 'lead', name: '批量开票未成功', desc: '下一次批量开票返回未成功', once: true },
  { id: 'review_hold', group: 'lead', name: '审核暂不处理', desc: '企业认证、批量开票都停在处理中，关闭后继续', once: false }
];
const SHORT = { quoteMs: 30000, pendingMs: 60000 };
const IN_WECHAT = typeof __wxConfig !== 'undefined'; // 只有真实小程序运行时才有这个全局量；Node 里的测试环境没有
// 演示工具关闭（DEMO_TOOLS=false 或非演示数据）时一律按「没存过」读：场景、网络、库存、事件都回默认值（FIX-01 D-15）。
// 否则用过演示工具的手机在关掉入口后会一直停在断网或某个场景，且无处改回。
const toolsOn = () => C.DATA_SOURCE === 'mock' && !!C.DEMO_TOOLS;
function read() { if (!toolsOn()) return {}; try { const v = wx.getStorageSync(KEY); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
function write(part) { const v = Object.assign(read(), part); try { wx.setStorageSync(KEY, v); } catch (e) { /* 存不上不影响本次使用 */ } return v; }
const scenario = () => LIST.find((x) => x.id === read().scenario) || null;
const net = () => NET.find((x) => x.id === read().net) || NET[IN_WECHAT ? 1 : 0];
const stock = () => STOCK.find((x) => x.id === read().stock) || STOCK[0];
const eventOn = (id) => !!(read().events || {})[id];
function setEvent(id, on) { if (!EVENTS.some((x) => x.id === id)) return; const ev = Object.assign({}, read().events); if (on) ev[id] = true; else delete ev[id]; write({ events: ev }); }
// 适配器里用：事件开着就返回 true；一次性事件同时关掉
function take(id) { if (!eventOn(id)) return false; if (EVENTS.find((x) => x.id === id).once) setEvent(id, false); return true; }
module.exports = { LIST, NET, STOCK, EVENTS, SHORT, read, write, scenario, net, stock, eventOn, setEvent, take };
