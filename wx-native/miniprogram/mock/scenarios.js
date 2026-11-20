// 演示场景：一键切到某类用户的完整状态（登录态、定位、需求、订单），用于逐状态核对界面。只在演示数据下生效。
// orders 为 null = 沿用默认 5 笔演示订单；[] = 没有订单；其余按 _db.mk 的参数造单（时间相对当前时刻）。
// 订单里的 after 把租后进度直接摆到某一步（services/mock-ext/_db.js applyAfter）：renew / exit / deposit / invoice / identity。
const KEY = 'mk_demo_v1';
const NEED = { capacity_m3: 3.5, input_unit: 'm3', input_value: 3.5, term_months: 6, source: 'manual' };
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
  { id: 'member_exit_clearing', name: '退仓待清空', desc: '已登录 · 已提交到期退仓，清空后申请验仓', login: true, located: true, need: null, orders: [{ store: 'SIM_BJ01', units: ['SIM_BJ01_U03'], months: 12, agoDays: 350, startInDays: -349, stage: 'EXPIRING', after: { exit: 'requested' } }] },
  { id: 'member_inspect_failed', name: '验仓未通过', desc: '已登录 · 门店验仓未通过，需处理后重新申请', login: true, located: true, need: null, orders: [{ store: 'SIM_BJ01', units: ['SIM_BJ01_U05'], months: 3, agoDays: 92, startInDays: -91, stage: 'OVERDUE', after: { exit: 'failed' } }] },
  { id: 'member_refund_failed', name: '押金退款未成功', desc: '已登录 · 已退仓，押金退款未成功', login: true, located: true, need: null, orders: [{ store: 'SIM_BJ01', units: ['SIM_BJ01_U01'], months: 3, agoDays: 100, startInDays: -99, stage: 'ENDED', after: { exit: 'passed', deposit: 'failed' } }] },
  { id: 'member_invoice_failed', name: '开票未成功', desc: '已登录 · 租用中，首笔付款的发票开具未成功', login: true, located: true, need: null, orders: [{ store: 'SIM_BJ01', units: ['SIM_BJ01_U05'], months: 12, agoDays: 40, startInDays: -39, stage: 'ACTIVE', after: { invoice: 'failed' } }] },
  { id: 'member_identity_mismatch', name: '实名未通过', desc: '已登录 · 已支付待起租，付款后补的实名认证未通过', login: true, located: true, need: null, orders: [{ store: 'SIM_BJ02', units: ['SIM_BJ02_U02'], months: 6, agoDays: 2, startInDays: 3, stage: 'PAID', identity: false, after: { identity: 'mismatch' } }] },
  { id: 'member_closed', name: '订单已取消和已超时', desc: '已登录 · 1 笔已取消、1 笔超时未支付，没有在租订单', login: true, located: true, need: NEED, orders: [{ store: 'SIM_BJ02', units: ['SIM_BJ02_U01'], months: 3, agoDays: 1, stage: 'EXPIRED' }, { store: 'SIM_BJ01', units: ['SIM_BJ01_U02'], months: 6, agoDays: 5, stage: 'CANCELLED' }] },
  { id: 'member_multi', name: '多门店多笔订单', desc: '已登录 · 3 家门店 8 笔订单，各阶段都有', login: true, located: true, need: null, orders: [
    { store: 'SIM_BJ02', units: ['SIM_BJ02_U01'], months: 3, agoDays: 0, stage: 'PENDING' },
    { store: 'SIM_BJ03', units: ['SIM_BJ03_U02'], months: 6, agoDays: 1, startInDays: 5, stage: 'PAID' },
    { store: 'SIM_BJ01', units: ['SIM_BJ01_U05'], months: 12, agoDays: 40, startInDays: -39, stage: 'ACTIVE', after: { invoice: 'issued' } },
    { store: 'SIM_BJ03', units: ['SIM_BJ03_U01'], months: 6, agoDays: 80, startInDays: -79, stage: 'ACTIVE', after: { renew: 'submitted', renewMonths: 3 } },
    { store: 'SIM_BJ01', units: ['SIM_BJ01_U03'], months: 12, agoDays: 350, startInDays: -349, stage: 'EXPIRING', factor: 0.6 },
    { store: 'SIM_BJ02', units: ['SIM_BJ02_U03'], months: 3, agoDays: 89, startInDays: -88, stage: 'EXPIRING', after: { exit: 'waiting' } },
    { store: 'SIM_BJ01', units: ['SIM_BJ01_U01'], months: 3, agoDays: 200, startInDays: -199, stage: 'ENDED', depositPartial: 40 },
    { store: 'SIM_BJ02', units: ['SIM_BJ02_U02'], months: 1, agoDays: 20, stage: 'CANCELLED' }
  ] },
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
  { id: 'store_hold', group: 'after', name: '门店暂不处理', desc: '续租报价、验仓、退款、开票、实名审核都停在等待中，关闭后继续', once: false }
];
const SHORT = { quoteMs: 30000, pendingMs: 60000 };
const IN_WECHAT = typeof __wxConfig !== 'undefined'; // 只有真实小程序运行时才有这个全局量；Node 里的测试环境没有
function read() { try { const v = wx.getStorageSync(KEY); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
function write(part) { const v = Object.assign(read(), part); try { wx.setStorageSync(KEY, v); } catch (e) { /* 存不上不影响本次使用 */ } return v; }
const scenario = () => LIST.find((x) => x.id === read().scenario) || null;
const net = () => NET.find((x) => x.id === read().net) || NET[IN_WECHAT ? 1 : 0];
const stock = () => STOCK.find((x) => x.id === read().stock) || STOCK[0];
const eventOn = (id) => !!(read().events || {})[id];
function setEvent(id, on) { if (!EVENTS.some((x) => x.id === id)) return; const ev = Object.assign({}, read().events); if (on) ev[id] = true; else delete ev[id]; write({ events: ev }); }
// 适配器里用：事件开着就返回 true；一次性事件同时关掉
function take(id) { if (!eventOn(id)) return false; if (EVENTS.find((x) => x.id === id).once) setEvent(id, false); return true; }
module.exports = { LIST, NET, STOCK, EVENTS, SHORT, read, write, scenario, net, stock, eventOn, setEvent, take };
