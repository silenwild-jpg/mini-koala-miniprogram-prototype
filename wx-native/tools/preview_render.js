// 浏览器近似预览：在 Node 里用假的 wx 跑页面逻辑拿到数据，再把 WXML 模板渲染成 HTML（rpx 按 375 宽换算成 px）。
// 用途：开发者工具编译之前先看版式有没有大问题、出预览图。它不是微信渲染，原生导航栏、tabBar、系统弹窗、字体都只是示意，不能当验收依据。
// 用法：node tools/preview_render.js <miniprogram> <ast.json> <输出目录>
const fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2]), AST = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')), out = process.argv[4];
const env = require('./fake_wx').install(root);
const state = require(path.join(root, 'services/state'));
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
env.loadApp();
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const ev = (expr, scope) => { try { return new Function('s', 'with(s){return (' + expr + ')}')(scope); } catch (e) { return undefined; } };
const interp = (str, scope) => { const m = /^\{\{(.*)\}\}$/s.exec(str); if (m && !/\{\{/.test(m[1])) return ev(m[1], scope); return String(str).replace(/\{\{(.*?)\}\}/gs, (_, e) => { const v = ev(e, scope); return v === undefined || v === null ? '' : v; }); };
const camel = (k) => k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const rpx = (s) => String(s).replace(/(-?\d*\.?\d+)rpx/g, (_, n) => (Number(n) / 2) + 'px');
const comps = (base) => Object.assign({}, app.usingComponents, JSON.parse(fs.readFileSync(path.join(root, base + '.json'), 'utf8')).usingComponents || {});
const TAG = { view: 'div', text: 'span', block: null, image: 'img', button: 'div', input: 'input', 'scroll-view': 'div' };
const used = new Set();
function render(nodes, scope, base, slot) {
  let html = '', prevIf = null;
  for (const n of nodes) {
    if (n.t !== undefined) { html += esc(interp(n.t, scope)).replace(/^\s*\n\s*|\n\s*$/g, ''); continue; }
    const a = n.a;
    if ('wx:if' in a) { prevIf = !!interp(a['wx:if'], scope); if (!prevIf) continue; }
    else if ('wx:elif' in a) { if (prevIf) continue; prevIf = !!interp(a['wx:elif'], scope); if (!prevIf) continue; }
    else if ('wx:else' in a) { if (prevIf) continue; }
    const one = (sc) => {
      if (n.tag === 'slot') return slot || '';
      const map = comps(base);
      if (map[n.tag]) {
        const cbase = map[n.tag][0] === '/' ? map[n.tag].slice(1) : path.join(path.dirname(base), map[n.tag]); used.add(cbase); // 相对路径的分包内组件按引用方目录解析
        const props = {}; for (const k of Object.keys(a)) if (!/^(wx:|bind|catch|class|style)/.test(k)) props[camel(k)] = interp(a[k], sc);
        const inst = env.newComponent(cbase, props); inst.setData(props);
        return '<div class="' + esc(n.tag) + '" style="display:block">' + render(AST[cbase], inst.data, cbase, render(n.c, sc, base, slot)) + '</div>';
      }
      const tag = n.tag in TAG ? TAG[n.tag] : 'div';
      const inner = render(n.c, sc, base, slot);
      if (tag === null) return inner;
      let attrs = '';
      const cls = [(a.class ? interp(a.class, sc) : ''), 'wx-' + n.tag].join(' ').trim();
      attrs += ' class="' + esc(cls) + '"';
      if (a.style) attrs += ' style="' + esc(rpx(interp(a.style, sc))) + '"';
      if (n.tag === 'image') { const fit = { aspectFill: 'cover', aspectFit: 'contain' }[a.mode]; if (fit) attrs = / style="/.test(attrs) ? attrs.replace(' style="', ' style="object-fit:' + fit + ';') : attrs + ' style="object-fit:' + fit + '"'; }
      if (n.tag === 'image') return '<img' + attrs + ' src="' + esc(path.join(root, String(interp(a.src || '', sc)))) + '">';
      if (n.tag === 'input') return '<input' + attrs + ' placeholder="' + esc(interp(a.placeholder || '', sc)) + '" value="' + esc(interp(a.value || '', sc) || '') + '">';
      return '<' + tag + attrs + '>' + inner + '</' + tag + '>';
    };
    if ('wx:for' in a) {
      const list = interp(a['wx:for'], scope) || [], item = a['wx:for-item'] || 'item', idx = a['wx:for-index'] || 'index';
      list.forEach((v, i) => { html += one(Object.assign(Object.create(scope), { [item]: v, [idx]: i })); });
    } else html += one(scope);
  }
  return html;
}
// 读样式并把 @import 展开（相对路径按引用方目录解析；/ 开头按工程根）
const inline = (rel) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/@import\s+["']([^"']+)["']\s*;/g, (_, f) => { const r = f[0] === '/' ? f.slice(1) : path.join(path.dirname(rel), f); return fs.existsSync(path.join(root, r)) ? inline(r) : ''; });
const css = (rel) => fs.existsSync(path.join(root, rel)) ? rpx(inline(rel)).replace(/(^|[},\s])page(\s*[{,])/g, '$1.wx-page$2') : '';
const BASE = 'html,body{margin:0;background:#888}*{box-sizing:border-box}.wx-page{width:375px;min-height:667px;margin:0 auto;position:relative;overflow:hidden;display:block}.wx-view{display:block}.wx-text{display:inline}.wx-button{border:0}input{border:0;outline:0;background:transparent;font-family:inherit}.navbar{height:44px;display:flex;align-items:center;justify-content:center;background:#fff;font-weight:600;font-size:17px;border-bottom:1px solid #eee}.tabbar{position:absolute;left:0;right:0;bottom:0;height:50px;background:#fff;border-top:1px solid #eee;display:flex}.tabbar div{flex:1;text-align:center;font-size:10px;padding-top:6px;color:#5F6B65}.tabbar img{width:24px;height:24px;display:block;margin:0 auto 2px}.tabbar .on{color:#0B7A48}.note{position:absolute;right:4px;top:2px;font-size:9px;color:#b00;z-index:999;background:#fff8}';
const tabs = app.tabBar.list;
async function shot(name, base, opts) {
  if (process.env.PV_ONLY && !process.env.PV_ONLY.split(',').some((p) => name.indexOf(p) === 0)) return ''; // 只出指定前缀的图
  state.reset(); used.clear(); env.mode = 'ok';
  require(path.join(root, 'mock/scenarios')).write({ scenario: '', net: 'instant', stock: 'normal', events: {} }); require(path.join(root, 'services/mock-ext/_db')).resetDb();
  if (opts.scenario) require(path.join(root, 'services/demo')).applyScenario(opts.scenario); // 演示场景：登录态、定位、需求、订单一起就位
  if (opts.stock || opts.events) require(path.join(root, 'mock/scenarios')).write({ stock: opts.stock || 'normal', events: opts.events || {} }); // 库存档位、交易事件
  if (opts.login) state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
  if (opts.need) state.set('requirement', opts.need);
  if (opts.located) state.patch('flags', { locationAsked: true }), state.patch('location', { status: 'granted' });
  if (opts.before) await opts.before();
  const pg = env.newPage(base, opts.query || {}); if (typeof pg.onShow === 'function' && opts.scenario) pg.onShow(); await new Promise((r) => setTimeout(r, 60));
  if (opts.after) { await opts.after(pg); await new Promise((r) => setTimeout(r, 60)); }
  const conf = JSON.parse(fs.readFileSync(path.join(root, base + '.json'), 'utf8'));
  const body = render(AST[base], pg.data, base, '');
  const isTab = tabs.findIndex((t) => t.pagePath === base);
  const nav = conf.navigationStyle === 'custom' ? '' : '<div class="navbar">' + esc(conf.navigationBarTitleText || app.window.navigationBarTitleText) + '</div>';
  const tab = isTab < 0 ? '' : '<div class="tabbar">' + tabs.map((t, i) => '<div class="' + (i === isTab ? 'on' : '') + '"><img src="' + path.join(root, i === isTab ? t.selectedIconPath : t.iconPath) + '">' + t.text + '</div>').join('') + '</div>';
  const styles = [css('styles/tokens.wxss'), css('app.wxss'), css(base + '.wxss')].concat([...used].map((c) => css(c + '.wxss'))).join('\n');
  fs.writeFileSync(path.join(out, name + '.html'), '<!doctype html><meta charset="utf-8"><style>' + BASE + styles + (isTab < 0 ? '' : '.mk-page{padding-bottom:70px!important}') + '</style><div class="wx-page"><div class="note">近似预览 · 非微信渲染</div>' + nav + body + tab + '</div>');
  return name;
}
const NEED = { capacity_m3: 3.5, input_unit: 'm3', input_value: 3.5, term_months: 6, source: 'manual' };
const ft = {}; // 需要先查到订单号再开页的预览用
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const done = [];
  done.push(await shot('01_home_new', 'pages/home/index', {}));
  done.push(await shot('02_home_demand', 'pages/home/index', { need: NEED, located: true, login: true }));
  done.push(await shot('03_stores_browse', 'pages/stores/index', { located: true }));
  done.push(await shot('04_stores_demand_guest', 'pages/stores/index', { need: NEED, located: true }));
  done.push(await shot('05_stores_demand_member', 'pages/stores/index', { need: NEED, located: true, login: true }));
  done.push(await shot('06_capacity', 'pages/estimate/capacity', { need: Object.assign({}, NEED, { term_months: 5 }) }));
  done.push(await shot('07_capacity_sales', 'pages/estimate/capacity', { after: (p) => p.onInput({ detail: { value: '30' } }) }));
  done.push(await shot('08_match_guest', 'pages/match/index', { need: NEED, located: true }));
  done.push(await shot('09_match_member', 'pages/match/index', { need: NEED, located: true, login: true }));
  done.push(await shot('10_match_login_gate', 'pages/match/index', { need: NEED, located: true, query: { login: '1' } }));
  done.push(await shot('11_store_detail_member', 'pages/store/detail', { need: NEED, located: true, login: true, query: { id: 'SIM_BJ01' } }));
  done.push(await shot('12_mine_guest', 'pages/mine/index', {}));
  done.push(await shot('13_orders_guest', 'pages/orders/index', {}));
  done.push(await shot('14_term_other_sheet', 'pages/estimate/capacity', { need: NEED }));
  // 演示场景 × 关键页面：每个场景看首页任务卡、订单列表、我的
  const SC = require(path.join(root, 'mock/scenarios')).LIST.map((x) => x.id);
  for (const id of SC) for (const pg of [['home', 'pages/home/index'], ['orders', 'pages/orders/index'], ['mine', 'pages/mine/index']]) done.push(await shot('sc_' + id + '__' + pg[0], pg[1], { scenario: id }));
  done.push(await shot('20_demo_lab', 'pkg-dev/lab/index', { scenario: 'member_active' }));
  // 公共组件层迁移后的页面：空态、列表行、提示条、表单项
  for (const pg of [['c01_orders_empty', 'pages/orders/index', { login: true, scenario: 'member_new' }], ['c02_order_missing', 'pkg-trade/order/index', { login: true, query: { id: 'NOPE' } }], ['c03_messages', 'pkg-account/messages/index', { scenario: 'member_new' }],
    ['c04_favorites', 'pkg-account/favorites/index', { scenario: 'member_new' }], ['c05_coupons', 'pkg-account/coupons/index', { scenario: 'member_active' }], ['c06_profile', 'pkg-account/profile/index', { scenario: 'member_active' }],
    ['c07_ent_cert', 'pkg-account/ent-cert/index', { scenario: 'member_active' }], ['c08_ent_titles', 'pkg-account/ent-titles/index', { scenario: 'member_active' }], ['c09_invoice', 'pkg-after/invoice/index', { scenario: 'member_active' }],
    ['c10_renew_empty', 'pkg-after/renew/index', { login: true, query: { id: 'NOPE' } }], ['c11_progress', 'pkg-account/progress/index', { scenario: 'member_new' }], ['c12_needs', 'pkg-account/needs/index', { scenario: 'member_new' }], ['c13_access', 'pkg-after/access/index', { scenario: 'member_active' }]]) done.push(await shot(pg[0], pg[1], pg[2]));
  // FIND-TRADE-01：库存档位下的找仓状态、交易各事件下的确认订单
  const api = require(path.join(root, 'services/api')), wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const idv = () => api.verifyIdentity({ name: '张明', id_no: '110101199001010012' });
  const BIG = Object.assign({}, NEED, { capacity_m3: 35, input_value: 35, term_months: 12 });
  const sign = async (p) => { p.onAgree(); p.onSign(); p.onSignConfirm(); await wait(60); };
  const CF = 'pkg-trade/confirm/index', Q = { unit: 'SIM_BJ01_U03', term: '6' };
  for (const x of [
    ['ft01_match_tight', 'pages/match/index', { need: NEED, located: true, login: true, stock: 'tight' }],
    ['ft02_match_city_soldout', 'pages/match/index', { need: NEED, located: true, stock: 'city_soldout' }],
    ['ft03_match_large', 'pages/match/index', { scenario: 'guest_large' }],
    ['ft04_stores_city_soldout', 'pages/stores/index', { need: NEED, located: true, stock: 'city_soldout' }],
    ['ft05_stores_large', 'pages/stores/index', { need: BIG, located: true }],
    ['ft06_detail_soldout', 'pages/store/detail', { need: NEED, located: true, login: true, stock: 'city_soldout', query: { id: 'SIM_BJ01' } }],
    ['ft07_detail_tight', 'pages/store/detail', { need: NEED, located: true, login: true, stock: 'tight', query: { id: 'SIM_BJ01' } }],
    ['ft08_confirm_ready', CF, { login: true, located: true, before: idv, query: Q, after: (p) => p.onAgree() }],
    ['ft09_confirm_idv_error', CF, { login: true, located: true, query: Q, events: { idv_mismatch: true }, after: async (p) => { p.onIdv(); p.onIdvName({ detail: { value: '张明' } }); p.onIdvNo({ detail: { value: '110101199001010012' } }); p.onIdvSubmit(); await wait(40); } }],
    ['ft10_confirm_price_changed', CF, { login: true, located: true, before: idv, query: Q, events: { price_changed: true }, after: sign }],
    ['ft11_confirm_unit_gone', CF, { login: true, located: true, before: idv, query: Q, events: { unit_gone: true }, after: sign }],
    ['ft12_confirm_quote_expired', CF, { login: true, located: true, before: idv, query: Q, after: (p) => { p._quote.expires_at = 1; p.tick(); } }],
    ['ft13_confirm_pay_failed', CF, { login: true, located: true, before: idv, query: Q, events: { pay_fail: true }, after: async (p) => { await sign(p); p.onPayConfirm(); await wait(80); } }],
    ['ft14_confirm_coupon', CF, { login: true, located: true, before: idv, query: { unit: 'SIM_BJ01_U03', term: '12' }, events: { coupon: true } }],
    ['ft15_quick', 'pkg-trade/quick/index', { login: true, located: true, need: NEED, query: { store: 'SIM_BJ01', unit: 'SIM_BJ01_U03' } }],
    ['ft16_order_failed', 'pkg-trade/order/index', { scenario: 'member_failed', before: async () => { ft.id = (await api.getOrders({}))[0].id; }, query: ft }],
    ['ft17_agreement_pending', 'pkg-trade/agreement/index', { query: { doc: 'register' } }],
    ['ft18_lab_stock_events', 'pkg-dev/lab/index', { scenario: 'member_active', stock: 'tight', events: { pay_fail: true, coupon: true } }]
  ]) done.push(await shot(x[0], x[1], x[2]));
  // ORDERS-AFTER-01：租后演示场景与租后事件下的订单列表、续租、退仓、押金、发票、实名
  const pick = (fn) => async () => { const os = await api.getOrders({}); ft.id = (fn ? os.find(fn) : os[0]).id; };
  const AF = (p) => 'pkg-after/' + p + '/index';
  for (const x of [
    ['oa01_orders_multi', 'pages/orders/index', { scenario: 'member_multi' }],
    ['oa02_orders_closed', 'pages/orders/index', { scenario: 'member_closed' }],
    ['oa03_home_multi', 'pages/home/index', { scenario: 'member_multi' }],
    ['oa04_renew_quote', AF('renew'), { scenario: 'member_renew_quote', before: pick(), query: ft }],
    ['oa05_renew_pay_failed', AF('renew'), { scenario: 'member_renew_quote', events: { renew_pay_fail: true }, before: async () => { await pick()(); await api.confirmRenewal({ id: ft.id }); await api.payRenewal({ id: ft.id }).catch(() => {}); }, query: ft }],
    ['oa06_exit_clearing', AF('exit'), { scenario: 'member_exit_clearing', before: pick(), query: ft }],
    ['oa07_exit_waiting', AF('exit'), { scenario: 'member_multi', events: { store_hold: true }, before: pick((o) => o.exit && o.exit.status === 'waiting'), query: ft }],
    ['oa08_exit_inspect_failed', AF('exit'), { scenario: 'member_inspect_failed', before: pick(), query: ft }],
    ['oa09_deposit_refund_failed', AF('deposit'), { scenario: 'member_refund_failed', before: pick(), query: ft }],
    ['oa10_invoice_failed', AF('invoice'), { scenario: 'member_invoice_failed', before: pick(), query: ft }],
    ['oa11_identity_mismatch', AF('identity'), { scenario: 'member_identity_mismatch', before: pick(), query: ft }],
    ['oa12_identity_sheet_error', AF('identity'), { scenario: 'member_identity_mismatch', before: pick(), query: ft, after: (p) => { p.onOpen(); p.onName({ detail: { value: '' } }); p.onIdNo({ detail: { value: '1101' } }); p.onSubmit(); } }],
    ['oa13_order_inspection', 'pkg-trade/order/index', { scenario: 'member_multi', events: { store_hold: true }, before: pick((o) => o.exit && o.exit.status === 'waiting'), query: ft }],
    ['oa14_renew_loading', AF('renew'), { scenario: 'member_renew_quote', before: pick(), query: ft, after: (p) => p.setData({ sys: 'loading' }) }],
    ['oa15_orders_loading', 'pages/orders/index', { scenario: 'member_multi', after: (p) => p.setData({ sys: 'loading' }) }],
    ['oa16_lab_after_events', 'pkg-dev/lab/index', { scenario: 'member_renew_quote', events: { store_hold: true, inspect_fail: true } }]
  ]) done.push(await shot(x[0], x[1], x[2]));
  // ACCOUNT-LEAD-01：账户和留资域
  const AC = (n) => 'pkg-account/' + n + '/index', LD = (n) => 'pkg-lead/' + n + '/index';
  const fill = (p) => { p.onAddress({ detail: { value: '朝阳区安贞西里三区' } }); };
  for (const x of [
    ['al01_needs_records', AC('needs'), { scenario: 'member_leads' }],
    ['al02_needs_edit_sheet', AC('needs'), { scenario: 'member_leads', after: (p) => { p.onEdit({ currentTarget: { dataset: { id: p.data.list[0].id } } }); p.setData({ editAddress: '', editErr: '请填写用仓位置（不超过120字）' }); } }],
    ['al03_needs_more_sheet', AC('needs'), { scenario: 'member_leads', after: (p) => p.onMore({ currentTarget: { dataset: { id: p.data.list[1].id } } }) }],
    ['al04_messages_inbox', AC('messages'), { scenario: 'member_inbox' }],
    ['al05_messages_guest', AC('messages'), { scenario: 'guest_browsing' }],
    ['al06_messages_empty', AC('messages'), { scenario: 'member_new' }],
    ['al07_mine_inbox', 'pages/mine/index', { scenario: 'member_inbox' }],
    ['al08_favorites_gone', AC('favorites'), { scenario: 'member_favorites' }],
    ['al09_coupons_claimed', AC('coupons'), { scenario: 'member_coupons' }],
    ['al10_ent_reviewing', AC('ent-cert'), { scenario: 'ent_reviewing', events: { review_hold: true } }],
    ['al11_ent_rejected', AC('ent-cert'), { scenario: 'ent_rejected' }],
    ['al12_ent_verified', AC('ent-cert'), { scenario: 'ent_verified' }],
    ['al13_progress', AC('progress'), { scenario: 'member_active' }],
    ['al14_booking_form', LD('booking'), { scenario: 'member_new', query: { store: 'SIM_BJ01' } }],
    ['al15_booking_errors', LD('booking'), { scenario: 'guest_browsing', after: (p) => p.onSubmit() }],
    ['al16_booking_failed', LD('booking'), { scenario: 'member_new', events: { lead_submit_fail: true }, after: async (p) => { fill(p); await p.onSubmit(); } }],
    ['al17_booking_unknown', LD('booking'), { scenario: 'member_new', events: { lead_submit_timeout: true }, after: async (p) => { fill(p); await p.onSubmit(); } }],
    ['al18_booking_done_offhours', LD('booking'), { scenario: 'member_new', events: { lead_off_hours: true }, after: async (p) => { fill(p); await p.onSubmit(); } }],
    ['al19_booking_advisor', LD('booking'), { scenario: 'guest_large', query: { mode: 'advisor', cap: '35' } }],
    ['al20_business_step1', LD('business'), { scenario: 'member_new' }],
    ['al21_business_step2', LD('business'), { scenario: 'member_new', after: (p) => p.setData({ step: 2 }) }],
    ['al22_business_failed', LD('business'), { scenario: 'member_new', after: (p) => p.setData({ step: 2, status: 'failed' }) }],
    ['al23_transport_pre', LD('transport'), { scenario: 'member_new', after: (p) => p.onSubmit() }],
    ['al24_transport_form', LD('transport'), { scenario: 'member_before_start', after: (p) => p.onPick({ currentTarget: { dataset: { i: 0 } } }) }],
    ['al25_support', LD('support'), { scenario: 'member_active', after: (p) => p.onSubmit() }],
    ['al26_store_visit_sheet', 'pages/store/detail', { scenario: 'member_new', query: { id: 'SIM_BJ01' }, after: (p) => p.onBooking() }],
    ['al27_needs_loading', AC('needs'), { scenario: 'member_leads', after: (p) => p.setData({ sys: 'loading' }) }],
    ['al28_booking_offline', LD('booking'), { scenario: 'member_new', after: (p) => p.setData({ sys: 'offline' }) }],
    ['al29_lab_lead_events', 'pkg-dev/lab/index', { scenario: 'member_leads', events: { lead_submit_fail: true, review_hold: true } }]
  ]) done.push(await shot(x[0], x[1], x[2]));
  // GAPS-01：库存紧张提示、预约提交后的消息
  for (const x of [
    ['gp01_stores_tight', 'pages/stores/index', { located: true, stock: 'tight' }],
    ['gp02_stores_tight_need', 'pages/stores/index', { need: NEED, located: true, login: true, stock: 'tight' }],
    ['gp03_match_tight', 'pages/match/index', { need: NEED, located: true, login: true, stock: 'tight' }],
    ['gp04_detail_tight', 'pages/store/detail', { located: true, login: true, stock: 'tight', query: { id: 'SIM_BJ01' } }],
    ['gp05_messages_after_booking', AC('messages'), { scenario: 'member_new', before: () => api.submitLead({ type: 'booking', address: '朝阳区芍药居北里 101 号', capacity_m3: 3, term_months: 6 }).then(() => api.submitLead({ type: 'visit', store_id: 'SIM_BJ01', time_slot: '待电话确认' })).catch((e) => console.error(e)) }]
  ]) done.push(await shot(x[0], x[1], x[2]));
  console.log(done.join(' '));
})();
