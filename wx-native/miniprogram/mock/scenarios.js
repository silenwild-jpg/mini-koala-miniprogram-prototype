// 演示场景：一键切到某类用户的完整状态（登录态、定位、需求、订单），用于逐状态核对界面。只在演示数据下生效。
// orders 为 null = 沿用默认 5 笔演示订单；[] = 没有订单；其余按 _db.mk 的参数造单（时间相对当前时刻）。
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
// 交易事件：在演示工具页打开后，由演示数据适配器在对应接口里触发；once = 触发一次后自动关闭。真实接口没有这些开关。
const EVENTS = [
  { id: 'price_changed', name: '下单时变价', desc: '签署时该仓位月基价上调，出现变价确认', once: true },
  { id: 'unit_gone', name: '仓位被别人租走', desc: '签署时所选仓位已租出', once: true },
  { id: 'pay_fail', name: '支付失败', desc: '下一次支付返回失败，订单进入支付未成功', once: true },
  { id: 'idv_mismatch', name: '实名信息不一致', desc: '下一次实名认证返回姓名与证件号不一致', once: true },
  { id: 'quote_short', name: '报价 30 秒后失效', desc: '报价有效期从 3 小时缩到 30 秒', once: false },
  { id: 'pending_short', name: '待支付 60 秒后超时', desc: '新订单的支付时限从 3 小时缩到 60 秒', once: false },
  { id: 'coupon', name: '有一张可用券', desc: '确认订单时带一张 12 个月长租券', once: false }
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
