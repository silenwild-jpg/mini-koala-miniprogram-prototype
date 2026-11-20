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
        const cbase = map[n.tag].replace(/^\//, ''); used.add(cbase);
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
const css = (rel) => fs.existsSync(path.join(root, rel)) ? rpx(fs.readFileSync(path.join(root, rel), 'utf8').replace(/@import[^;]+;/g, '')).replace(/(^|[},\s])page(\s*[{,])/g, '$1.wx-page$2') : '';
const BASE = 'html,body{margin:0;background:#888}*{box-sizing:border-box}.wx-page{width:375px;min-height:667px;margin:0 auto;position:relative;overflow:hidden;display:block}.wx-view{display:block}.wx-text{display:inline}.wx-button{border:0}input{border:0;outline:0;background:transparent;font-family:inherit}.navbar{height:44px;display:flex;align-items:center;justify-content:center;background:#fff;font-weight:600;font-size:17px;border-bottom:1px solid #eee}.tabbar{position:absolute;left:0;right:0;bottom:0;height:50px;background:#fff;border-top:1px solid #eee;display:flex}.tabbar div{flex:1;text-align:center;font-size:10px;padding-top:6px;color:#5F6B65}.tabbar img{width:24px;height:24px;display:block;margin:0 auto 2px}.tabbar .on{color:#0B7A48}.note{position:absolute;right:4px;top:2px;font-size:9px;color:#b00;z-index:999;background:#fff8}';
const tabs = app.tabBar.list;
async function shot(name, base, opts) {
  state.reset(); used.clear(); env.mode = 'ok';
  if (opts.login) state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
  if (opts.need) state.set('requirement', opts.need);
  if (opts.located) state.patch('flags', { locationAsked: true }), state.patch('location', { status: 'granted' });
  const pg = env.newPage(base, opts.query || {}); await new Promise((r) => setTimeout(r, 30));
  if (opts.after) { opts.after(pg); await new Promise((r) => setTimeout(r, 30)); }
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
  console.log(done.join(' '));
})();
