// 按钮宽度校准（近似）：把每页默认状态渲染成 HTML，用 <wx-button> 自定义标签加上基础库 style v2 的 button 默认规则，
// 供 tools/calib_buttons_measure.py 在 375/390 宽度下量每个按钮的宽度。
// 它模拟的是「选择器权重」这一件事：v2 的 width:184px / 左右 auto 外边距挂在 wx-button:not([size=mini])（权重 0,1,1）上，
// 单个类名（0,1,0）压不过。默认规则是按公开资料手写的近似，不是微信渲染；结论须以开发者工具截图为准。
// 用法：node tools/calib_buttons.js <miniprogram> <ast.json> <输出目录>
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
const comps = (base) => Object.assign({}, app.usingComponents, JSON.parse(fs.readFileSync(path.join(root, base + '.json'), 'utf8')).usingComponents || {});
const TAG = { view: 'div', text: 'span', block: null, image: 'img', button: 'wx-button', input: 'input', 'scroll-view': 'div' };
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
        const cbase = map[n.tag].replace(/^\//, '').replace(/^(\.\.?\/)+/, (m) => path.posix.normalize(path.posix.join(path.posix.dirname(base), m)) + '/').replace(/\/\//g, '/'); used.add(cbase);
        const props = {}; for (const k of Object.keys(a)) if (!/^(wx:|bind|catch|class|style)/.test(k)) props[camel(k)] = interp(a[k], sc);
        let inst; try { inst = env.newComponent(cbase, props); inst.setData(props); } catch (e) { return ''; }
        return '<div class="' + esc(n.tag) + ' ' + esc(a.class ? interp(a.class, sc) : '') + '" style="display:block">' + render(AST[cbase] || [], inst.data, cbase, render(n.c, sc, base, slot)) + '</div>';
      }
      const tag = n.tag in TAG ? TAG[n.tag] : 'div';
      const inner = render(n.c, sc, base, slot);
      if (tag === null) return inner;
      let attrs = ' class="' + esc([(a.class ? interp(a.class, sc) : ''), 'wx-' + n.tag].join(' ').trim()) + '"';
      if (a.style) attrs += ' style="' + esc(interp(a.style, sc)) + '"';
      if (n.tag === 'button') attrs += ' data-src="' + esc(base) + '" data-cls="' + esc(a.class || '') + '"' + (a.size ? ' size="' + esc(a.size) + '"' : '');
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
// rpx 换成 calc(vw)，同一份 HTML 可在 375 / 390 两个视口下量
const rpx = (s) => String(s).replace(/(-?\d*\.?\d+)rpx/g, (_, n) => 'calc(' + n + ' * 100vw / 750)');
const css = (rel) => fs.existsSync(path.join(root, rel)) ? rpx(fs.readFileSync(path.join(root, rel), 'utf8').replace(/@import[^;]+;/g, '')).replace(/(^|[},\s])page(\s*[{,])/g, '$1.wx-page$2').replace(/(^|[},\s>+~])button(?=[\s.:{,\[])/g, '$1wx-button') : '';
const V2 = 'wx-button{position:relative;display:block;padding:8px 24px;box-sizing:border-box;font-weight:700;font-size:17px;text-align:center;line-height:1.41176471;border-radius:4px;overflow:hidden}wx-button:not([size=mini]){width:184px;margin-left:auto;margin-right:auto}wx-button[size=mini]{display:inline-block;width:auto;padding:0 .75em;font-size:13px;line-height:2.3}';
const BASE = 'html,body{margin:0}*{box-sizing:border-box}.wx-page{width:100vw;min-height:100vh;position:relative;display:block}.wx-view{display:block}.wx-text{display:inline}input{border:0;outline:0;background:transparent;font-family:inherit}' + V2;
async function shot(name, base, opts) {
  state.reset(); used.clear(); env.mode = 'ok';
  if (opts.login) state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
  if (opts.need) state.set('requirement', opts.need);
  if (opts.located) state.patch('flags', { locationAsked: true }), state.patch('location', { status: 'granted' });
  let pg; try { pg = env.newPage(base, opts.query || {}); } catch (e) { return { name, base, error: String(e.message || e) }; }
  await new Promise((r) => setTimeout(r, 40));
  if (opts.after) { try { opts.after(pg); } catch (e) {} await new Promise((r) => setTimeout(r, 40)); }
  const body = render(AST[base], pg.data, base, '');
  const sub = (app.subpackages || []).find((s) => base.startsWith(s.root + '/'));
  const shared = sub ? fs.readdirSync(path.join(root, sub.root)).filter((f) => f.endsWith('.wxss')).map((f) => sub.root + '/' + f) : [];
  const styles = [css('styles/tokens.wxss'), css('app.wxss')].concat(shared.map(css), [css(base + '.wxss')], [...used].map((c) => css(c + '.wxss'))).join('\n');
  fs.writeFileSync(path.join(out, name + '.html'), '<!doctype html><meta charset="utf-8"><style>' + BASE + styles + '</style><div class="wx-page">' + body + '</div>');
  return { name, base };
}
const NEED = { capacity_m3: 3.5, input_unit: 'm3', input_value: 3.5, term_months: 6, source: 'manual' };
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const pages = app.pages.concat(...(app.subpackages || []).map((s) => s.pages.map((p) => s.root + '/' + p)));
  const done = [];
  for (const p of pages) {
    const n = p.replace(/\//g, '_');
    done.push(await shot(n + '__guest', p, { located: true }));
    done.push(await shot(n + '__member', p, { need: NEED, located: true, login: true, query: { id: 'SIM_BJ01' } }));
  }
  done.push(await shot('pages_match_index__login_gate', 'pages/match/index', { need: NEED, located: true, query: { login: '1' } }));
  fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify(done, null, 1));
  console.log(done.length + ' states, errors: ' + done.filter((d) => d.error).length);
})();
