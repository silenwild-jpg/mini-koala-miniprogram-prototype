// 公共组件层（COMPONENTS-01）：空态、列表行、提示条、表单项的属性默认值；全站迁移后的约定（空态不再手写、可点元素有按压反馈）。
const test = require('node:test'), assert = require('node:assert'), path = require('path'), fs = require('fs');
const root = path.join(__dirname, '..', 'miniprogram');
const env = require('../tools/fake_wx').install(root);
const walk = (d, ext, out = []) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p, ext, out); else if (p.endsWith(ext)) out.push(p); } return out; };
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));

test('四个公共组件已全局注册且文件齐全', () => {
  for (const n of ['mk-empty', 'mk-cell', 'mk-notice', 'mk-field']) {
    assert.strictEqual(app.usingComponents[n], '/components/' + n + '/index');
    for (const e of ['js', 'json', 'wxml', 'wxss']) assert.ok(fs.existsSync(path.join(root, 'components', n, 'index.' + e)), n + '.' + e);
  }
});
test('mk-empty 默认整页空态、带操作区；mk-cell 默认可点带箭头、无分隔线', () => {
  const e = env.newComponent('components/mk-empty/index', { title: '暂无订单' });
  assert.deepStrictEqual([e.data.card, e.data.hasAction, e.data.sub, e.data.icon], [false, true, '', '']);
  const c = env.newComponent('components/mk-cell/index', { title: '隐私' });
  assert.deepStrictEqual([c.data.arrow, c.data.divider, c.data.badge, c.data.value], [true, false, 0, '']);
});
test('mk-notice 点链接抛出 link 事件；mk-field 报错优先于提示（模板里 error 在 wx:if，hint 在 wx:elif）', () => {
  const n = env.newComponent('components/mk-notice/index', { text: 'x', link: '查看' });
  n.onLink(); assert.strictEqual(n.events[0].name, 'link');
  const w = fs.readFileSync(path.join(root, 'components/mk-field/index.wxml'), 'utf8');
  assert.ok(w.indexOf('wx:if="{{error}}"') < w.indexOf('wx:elif="{{hint}}"'));
});
test('原售后说明条已并入 mk-notice，没有残留引用', () => {
  assert.ok(!fs.existsSync(path.join(root, 'components/mk-after-note')));
  for (const p of walk(root, '.wxml').concat(walk(root, '.json'))) assert.ok(!/mk-after-note/.test(fs.readFileSync(p, 'utf8')), p);
});
test('mk-empty 的调用都给了标题；没有操作区的调用显式声明 has-action', () => {
  let n = 0;
  for (const p of walk(root, '.wxml')) for (const m of fs.readFileSync(p, 'utf8').matchAll(/<mk-empty\b([^>]*?)(\/?)>/gs)) {
    n++; assert.match(m[1], /title="\{\{[^"]+\}\}"/, p);
    if (m[2] === '/') assert.match(m[1], /has-action="\{\{false\}\}"/, p);
  }
  assert.ok(n >= 18, '迁移后的调用点数量 ' + n);
});
test('同一卡片里连续的 mk-cell：第二行起带 divider', () => {
  for (const p of walk(root, '.wxml')) {
    const s = fs.readFileSync(p, 'utf8');
    for (const m of s.matchAll(/(<mk-cell\b[^>]*?\/>|<\/mk-cell>)\s*<mk-cell\b([^>]*)>/gs)) assert.match(m[2], /divider=/, p);
  }
});
test('按压态样式类在 app.wxss 都有定义，且页面里用到的 hover-class 都在其中', () => {
  const css = fs.readFileSync(path.join(root, 'app.wxss'), 'utf8') + fs.readFileSync(path.join(root, 'styles/motion.wxss'), 'utf8'); // IMPL-01：按压缩小类 mk-press--hover 定义在 styles/motion.wxss（app.wxss 引入）
  const used = new Set();
  for (const p of walk(root, '.wxml')) for (const m of fs.readFileSync(p, 'utf8').matchAll(/hover-class="([^"{]+)"/g)) m[1].split(/\s+/).filter(Boolean).forEach((k) => used.add(k)); // 可并用两个按压类
  used.delete('none');
  for (const k of used) assert.ok(css.includes('.' + k), k + ' 未定义');
});
