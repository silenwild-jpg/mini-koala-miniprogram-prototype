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

test('顶部底带高度：状态栏 + 顶栏 + 往下延伸一段（IMPL-01：原首图与标语区撤掉，标语进第一张轮播）', async () => {
  const L0 = Object.assign({}, getApp().globalData.layout);
  try {
    assert.equal((await home({ statusBar: 20, navHeight: 44, windowHeight: 667 })).data.heroHeight, 20 + 44 + CF.hero.backdrop);
    assert.equal((await home({ statusBar: 59, navHeight: 48, windowHeight: 1000 })).data.heroHeight, 59 + 48 + CF.hero.backdrop, '不再随屏高变化');
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

test('场景图标：与六个场景文案一一对应，文件都在包里（IMPL-01：场景切图换成圆底线性图标，原 scene-*.webp / task-*.webp 已删）', () => {
  assert.equal(CF.home.sceneIcons.length, T.home.sceneList.length);
  assert.equal(new Set(CF.home.sceneIcons).size, 6);
  for (const n of CF.home.sceneIcons) assert.ok(fs.existsSync(path.join(root, 'assets/icons/' + n + '.svg')), n);
  assert.equal(T.home.sceneList[CF.moveSceneIndex], '搬家过渡'); assert.equal(CF.home.sceneIcons[CF.moveSceneIndex], 'scenemove-brand');
  assert.ok(!fs.readdirSync(path.join(root, 'assets/images/home')).some((f) => /^(scene|task)-/.test(f)));
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
