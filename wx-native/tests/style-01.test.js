// STYLE-01：风格层。首页首图高度与顶栏实底切换、首页配图与文字表对应、卡片描边令牌、底部导航图标与令牌色一致。
// 在假的 wx 环境里跑，验证的是代码逻辑和文件约定，不是微信真实渲染。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), T = R('i18n/find'), CF = R('core/config-find');
env.loadApp();
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 15));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const home = async (layout) => { state.reset(); if (layout) Object.assign(getApp().globalData.layout, layout); const pg = env.newPage('pages/home/index', {}); await tick(40); return pg; };

test('首图高度：屏高 25%，夹在 190–230；顶栏加标语放不下时按内容撑高', async () => {
  const L0 = Object.assign({}, getApp().globalData.layout);
  try {
    assert.equal((await home({ statusBar: 20, navHeight: 44, windowHeight: 667 })).data.heroHeight, 190);
    assert.equal((await home({ statusBar: 47, navHeight: 44, windowHeight: 844 })).data.heroHeight, 211);
    assert.equal((await home({ statusBar: 47, navHeight: 44, windowHeight: 1000 })).data.heroHeight, 230);
    assert.equal((await home({ statusBar: 59, navHeight: 48, windowHeight: 667 })).data.heroHeight, 59 + 48 + CF.hero.sloganMin);
  } finally { Object.assign(getApp().globalData.layout, L0); }
});

test('顶栏：在首图上透明，滚过阈值变实底，滚回恢复；阈值内重复滚动不重复 setData', async () => {
  const pg = await home();
  assert.equal(pg.data.solid, false);
  let n = 0; const set = pg.setData; pg.setData = function (d) { if ('solid' in d) n++; return set.apply(this, arguments); };
  pg.onPageScroll({ scrollTop: CF.hero.solidAfter + 1 }); assert.equal(pg.data.solid, true);
  pg.onPageScroll({ scrollTop: 300 }); pg.onPageScroll({ scrollTop: 600 });
  pg.onPageScroll({ scrollTop: 0 }); assert.equal(pg.data.solid, false);
  assert.equal(n, 2);
  assert.match(read('pages/home/index.wxml'), /sys \|\| solid \? 'hm-top--solid'/); // 加载、失败、断网时不出首图，顶栏保持实底
});

test('场景图：与六个场景文案一一对应，文件都在包里', () => {
  assert.equal(T.home.sceneImages.length, T.home.sceneList.length);
  assert.equal(new Set(T.home.sceneImages).size, 6);
  for (const n of T.home.sceneImages) assert.ok(fs.existsSync(path.join(root, 'assets/images/home/scene-' + n + '.webp')), n);
  assert.equal(T.home.sceneList[CF.moveSceneIndex], '搬家过渡'); assert.equal(T.home.sceneImages[CF.moveSceneIndex], 'moving');
  for (const f of ['task-map.webp', 'task-calculator.webp']) assert.ok(fs.existsSync(path.join(root, 'assets/images/home', f)), f);
  assert.ok(fs.existsSync(path.join(root, 'assets/images/stores/SIM-BJ03/hero.webp')));
});

test('卡片：全站四周 1px 描边（投影画法，不占盒子宽度）；悬浮卡只在首页双入口用', () => {
  assert.match(read('styles/tokens.wxss'), /--mk-elevation-card: 0 0 0 1px #E3E8E5;/);
  assert.match(read('app.wxss'), /\.mk-card--float \{ box-shadow: var\(--mk-elevation-float\); \}/);
  const users = [];
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.wxml') && fs.readFileSync(p, 'utf8').includes('mk-card--float')) users.push(path.relative(root, p)); });
  walk(root);
  assert.deepEqual(users, ['pages/home/index.wxml']);
});

test('底部导航图标：由生成器产出且未被手改，文字颜色等于令牌', () => {
  const out = JSON.parse(execFileSync('python3', [path.join(__dirname, '../tools/gen_tabbar.py'), root, '--check'], { encoding: 'utf8' }));
  assert.deepEqual(out.errors, []); assert.equal(out.tabbar, 8);
});
