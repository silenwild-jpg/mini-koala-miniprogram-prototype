// 演示场景：一键切到某类用户的完整状态（登录态、定位、需求、订单），用于逐状态核对界面。只在演示数据下生效。
// orders 为 null = 沿用默认 5 笔演示订单；[] = 没有订单；其余按 _db.mk 的参数造单（时间相对当前时刻）。
const KEY = 'mk_demo_v1';
const NEED = { capacity_m3: 3.5, input_unit: 'm3', input_value: 3.5, term_months: 6, source: 'manual' };
const LIST = [
  { id: 'first_visit', name: '首次访问', desc: '未登录 · 未定位 · 没有用仓需求', login: false, located: false, need: null, orders: null },
  { id: 'guest_browsing', name: '访客找仓中', desc: '未登录 · 已定位 · 需求 3.5m³ 租 6 个月', login: false, located: true, need: NEED, orders: null },
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
const IN_WECHAT = typeof __wxConfig !== 'undefined'; // 只有真实小程序运行时才有这个全局量；Node 里的测试环境没有
function read() { try { const v = wx.getStorageSync(KEY); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
function write(part) { const v = Object.assign(read(), part); try { wx.setStorageSync(KEY, v); } catch (e) { /* 存不上不影响本次使用 */ } return v; }
const scenario = () => LIST.find((x) => x.id === read().scenario) || null;
const net = () => NET.find((x) => x.id === read().net) || NET[IN_WECHAT ? 1 : 0];
module.exports = { LIST, NET, read, write, scenario, net };
