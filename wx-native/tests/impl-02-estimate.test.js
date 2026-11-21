// IMPL-02 估算域：尺寸示意插画（程序生成的矢量图）、容量页示意区累计停留的箱子、门店详情仓型分组标题的图、物品页物品图核对。
// 在假的 wx 环境里跑：验证的是数据与状态机（只数始终与容量对应、连点与拖动不残留不重复、卸载后不再写数据），不是微信里的真实渲染与动画。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), scenarios = R('mock/scenarios'), media = R('services/media'), viz = R('core/estimate-viz');
const { db } = R('services/mock-ext/_db');
const C = R('core/config'), CF = R('core/config-find'), SI = R('core/config-size-illus'), units = R('mock/units'), items = R('mock/items');
const E = CF.estimate, BANDS = CF.unitThumbBands;
env.loadApp();
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 0));
function fresh() {
  state.reset(); env.nav.length = 0; db.orders.length = 0; db.leads.length = 0; db.messages.length = 0; db.seq = 0; db.seeded = true; db.kv = {}; db.sms = {};
  scenarios.write({ scenario: '', stock: 'normal', events: {}, net: 'instant' });
  state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
}
const tap = (ds) => ({ currentTarget: { dataset: ds || {} }, changedTouches: [{ clientX: 300, clientY: 300 }], detail: {} });
const touch = (x) => ({ touches: [{ clientX: x, clientY: 200 }], changedTouches: [{ clientX: x, clientY: 200 }] });
function spy(pg) { let n = 0; const raw = pg.setData; pg.setData = function (d, cb) { n++; return raw.call(this, d, cb); }; return () => n; }
async function cap() { const pg = env.newPage('pages/estimate/capacity', {}); await tick(30); if (pg.onReady) pg.onReady(); return pg; }
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const shown = (pg) => pg.data.boxes.filter((x) => !x.out);
const bandOf = (v) => (BANDS.find((b) => v <= b.maxM3) || BANDS[BANDS.length - 1]).key;
const settle = () => tick(E.flyMs + E.flyStaggerMs + 60);
const input = (pg, v) => pg.onInput({ detail: { value: String(v) } });
// 页面此刻应有的箱子只数：容量有效时按规则，否则 0
const want = (pg) => (pg.data.ok ? Math.min(viz.boxCount(pg._v.capacity_m3), SI.tiers[bandOf(pg._v.capacity_m3)].slots.length) : 0);

test('尺寸示意插画：生成物与来源一致（--check），四档各有底图 / 前景 / 纸箱 / 合成图，单个不超过 6KB，只用令牌里的颜色，不含微信不支持的写法与中文', () => {
  const r = spawnSync('python3', [path.join(__dirname, '../tools/gen_size_illus.py'), root, '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr); assert.deepEqual(JSON.parse(r.stdout).errors, []);
  const tokens = new Set((read('styles/tokens.wxss').match(/#[0-9A-Fa-f]{6}\b/g) || []).map((x) => x.toUpperCase()));
  const dir = path.join(root, 'assets/images/units'), svgs = fs.readdirSync(dir).filter((f) => /^size-.*\.svg$/.test(f));
  assert.equal(svgs.length, BANDS.length * 4, '没有多余的图');
  BANDS.forEach((b) => ['', '-front', '-carton', '-box'].forEach((x) => assert.ok(svgs.includes('size-' + b.key + x + '.svg'), b.key + x)));
  svgs.forEach((f) => {
    const s = fs.readFileSync(path.join(dir, f), 'utf8');
    assert.ok(Buffer.byteLength(s) <= 6 * 1024, f + ' ' + Buffer.byteLength(s));
    assert.ok(!/filter|foreignObject|currentColor|href|<style|@font-face|<image|[一-龥]/.test(s), f);
    (s.match(/#[0-9A-Fa-f]{6}\b/g) || []).forEach((c) => assert.ok(tokens.has(c.toUpperCase()), f + ' 用了令牌之外的颜色 ' + c));
    assert.match(s, /stroke-linecap="round" stroke-linejoin="round"/);
  });
  // 底图不画箱子（箱子全由累计层画）；合成图画了 boxes 只；底图与合成图标了长宽高与 1.7m 参照
  BANDS.forEach((b) => {
    const t = SI.tiers[b.key], base = fs.readFileSync(path.join(dir, 'size-' + b.key + '.svg'), 'utf8'), full = fs.readFileSync(path.join(dir, 'size-' + b.key + '-box.svg'), 'utf8');
    const boxLine = /--mk-color-brand-text:\s*(#[0-9A-Fa-f]{6})/.exec(read('styles/tokens.wxss'))[1].toUpperCase();
    assert.ok(!base.includes(boxLine), b.key + ' 底图不带箱'); assert.ok(full.includes(boxLine));
    const labels = (s) => (s.match(/>([\d.]+m)</g) || []).map((x) => x.slice(1, -1)).sort();
    const expect = t.dims.map((d) => d + 'm').concat([SI.personM + 'm']).sort();
    assert.deepEqual(labels(base), expect); assert.deepEqual(labels(full), expect);
    assert.equal((full.match(/<path d="[^"]+" fill="[^"]+"\/>/g) || []).length - (base.match(/<path d="[^"]+" fill="[^"]+"\/>/g) || []).length, t.boxes * 3, '每只箱子三个面');
  });
});

test('尺寸示意插画的数据都有出处：档位沿用 unitThumbBands；每档仓体尺寸取自演示仓位且该仓位落在本档；纸箱三边取自物品目录；箱位够用且都在画面内', () => {
  assert.deepEqual(Object.keys(SI.tiers), BANDS.map((b) => b.key));
  const m = /(\d+)×(\d+)×(\d+)cm/.exec(items.items.find((x) => x.id === 'box').description);
  assert.deepEqual(SI.cartonM, [m[1] / 100, m[2] / 100, m[3] / 100]);
  assert.ok(Math.abs(SI.cartonM[0] * SI.cartonM[1] * SI.cartonM[2] - C.requirement.cartonVolumeM3) < 1e-9, '与「全放标准纸箱约 N 箱」用的箱体积一致');
  BANDS.forEach((b, i) => {
    const t = SI.tiers[b.key], u = units.find((x) => x.id === t.unit);
    assert.ok(u, t.unit + ' 是演示数据里真实存在的仓位'); assert.deepEqual(t.dims, u.dims); assert.equal(t.volume, u.volume); assert.equal(bandOf(u.volume), b.key);
    const top = Number.isFinite(b.maxM3) ? viz.boxCount(b.maxM3) : E.stageBoxStepsM3.length;
    assert.equal(t.slots.length, top, b.key + ' 箱位数 = 本档最多会出现的只数');
    assert.equal(t.boxes, viz.boxCount(u.volume), '合成图画的是代表仓位自身容量对应的只数');
    t.slots.forEach((s) => { assert.ok(s[0] >= 0 && s[1] >= 0 && s[0] + t.boxW <= 100 && s[1] + t.boxH <= 100, b.key + ' 箱位在画面内'); });
    assert.equal(new Set(t.slots.map(String)).size, t.slots.length, '箱位不重叠');
    if (i) assert.ok(t.dims[0] * t.dims[1] * t.dims[2] > SI.tiers[BANDS[i - 1].key].dims.reduce((a, c) => a * c, 1), '越往后的档仓体越大');
  });
});

test('箱子只数规则：写在 config，随容量只增不减，跨档也不回落；无效容量为 0', () => {
  const S = E.stageBoxStepsM3;
  assert.ok(S.length >= 4); S.forEach((v, i) => { if (i) assert.ok(v > S[i - 1]); });
  assert.equal(S[0], C.requirement.capacityMinM3, '最小容量就有 1 只');
  [0, -1, NaN, 'x', null, undefined].forEach((v) => assert.equal(viz.boxCount(v), 0));
  let last = 0;
  for (let v = C.requirement.capacityMinM3; v <= 40; v = Number((v + 0.1).toFixed(1))) { const n = viz.boxCount(v); assert.ok(n >= last && n >= 1); last = n; }
  S.forEach((v, i) => { assert.equal(viz.boxCount(v), i + 1); assert.equal(viz.boxCount(v - 0.01), Math.max(1, i)); });
  assert.equal(viz.boxCount(999), S.length);
});

test('容量页示意区：四档各用自己的底图、前景与纸箱；箱子叠在底图与前景之间；只数、箱位与规则一致', async () => {
  fresh(); const pg = await cap();
  const wxml = read('pages/estimate/capacity.wxml'), stage = wxml.slice(wxml.indexOf('class="cp-stage"'), wxml.indexOf('class="cp-rb"'));
  const a = stage.indexOf('src="{{item.src}}"'), b = stage.indexOf('wx:for="{{boxes}}"'), c = stage.indexOf('src="{{item.front}}"');
  assert.ok(a > 0 && a < b && b < c, '三层顺序：底图 → 箱子 → 前景'); assert.ok(!/cp-fly|cube-brand/.test(wxml), '旧的飘过即消失的箱子图标已去掉');
  assert.equal(pg.data.stage.on, false); assert.deepEqual(pg.data.boxes, []); assert.equal(pg.data.stage.imgs.filter((x) => x.on).length, 1);
  pg.data.stage.imgs.forEach((x) => { ['src', 'front', 'carton'].forEach((k) => { assert.match(x[k], /^\/assets\/images\/units\/size-[a-z]+(-front|-carton)?\.svg$/); assert.ok(fs.existsSync(path.join(root, x[k])), x[k]); }); });
  for (const v of [0.5, 1.5, 2, 5, 5.5, 15, 15.5, 20, 30]) {
    input(pg, v); const key = bandOf(v), t = SI.tiers[key];
    assert.deepEqual(pg.data.stage.imgs.filter((x) => x.on).map((x) => x.key), [key]); assert.equal(pg.data.stage.key, key);
    assert.equal(pg.data.stage.carton, '/assets/images/units/size-' + key + '-carton.svg'); assert.equal(pg.data.stage.bw, t.boxW); assert.equal(pg.data.stage.bh, t.boxH);
    assert.equal(shown(pg).length, viz.boxCount(v), v + 'm³');
    shown(pg).forEach((x, i) => { assert.equal(x.i, i); assert.deepEqual([x.l, x.t], t.slots[i]); });
    assert.ok(pg.data.stage.s >= E.stageScaleMin && pg.data.stage.s <= 1);
  }
  // 面积模式按折算后的容量取
  pg.onUnit(tap({ u: 'm2' })); assert.deepEqual(pg.data.boxes, []);
  input(pg, 4); assert.equal(shown(pg).length, viz.boxCount(pg._v.capacity_m3)); assert.equal(pg.data.stage.key, bandOf(pg._v.capacity_m3));
  pg.onUnload();
});

test('累计停留：变多时只有新来的带落入动画，已在位的原样不动；变少时多出来的先飘出、到点移除；飘出途中又变多，原位重新落入', async () => {
  fresh(); const pg = await cap();
  input(pg, 2); await tick(10);
  const n2 = viz.boxCount(2); assert.equal(pg.data.boxes.length, n2); pg.data.boxes.forEach((x) => assert.match(x.cls, /^cp-box--in cp-box--d[0-2]$/));
  const before = pg.data.boxes.map((x) => x.cls);
  pg.onStep(tap({ dir: 'plus' })); pg.onStep(tap({ dir: 'plus' })); // 3m³
  const n3 = viz.boxCount(3); assert.equal(n3, n2 + 1); assert.equal(pg.data.boxes.length, n3);
  assert.deepEqual(pg.data.boxes.slice(0, n2).map((x) => x.cls), before, '已在位的类名不变，不会重播');
  assert.equal(pg.data.boxes[n3 - 1].cls, 'cp-box--in cp-box--d0'); assert.ok(!pg._boxTimer, '只增不减时不需要定时器');
  // 变少
  input(pg, 2);
  assert.equal(pg.data.boxes.length, n3); assert.equal(shown(pg).length, n2); assert.equal(pg.data.boxes[n3 - 1].out, true); assert.equal(pg.data.boxes[n3 - 1].cls, 'cp-box--out'); assert.ok(pg._boxTimer);
  // 飘出途中又变多：同一个箱位重新落入，定时器撤掉，到点后不会被误删
  input(pg, 3);
  assert.equal(pg.data.boxes.length, n3); assert.ok(!pg.data.boxes[n3 - 1].out); assert.match(pg.data.boxes[n3 - 1].cls, /cp-box--in/); assert.equal(pg._boxTimer, null);
  await settle(); assert.equal(pg.data.boxes.length, n3);
  // 再变少并等到点
  input(pg, 2); await settle();
  assert.equal(pg.data.boxes.length, n2); assert.equal(pg._boxTimer, null); assert.ok(pg.data.boxes.every((x) => !x.out));
  pg.onUnload();
});

test('换档：箱位随新图整体更换，已有的箱子不重播动画，上一档正在飘出的直接丢掉；清空或填错时立刻清空', async () => {
  fresh(); const pg = await cap();
  input(pg, 5); const small = shown(pg).length; assert.equal(pg.data.stage.key, 'small');
  input(pg, 4); assert.ok(pg._boxTimer); assert.ok(pg.data.boxes.some((x) => x.out));
  input(pg, 6); // 进中型档
  assert.equal(pg.data.stage.key, 'medium'); assert.ok(pg.data.boxes.every((x) => !x.out)); assert.equal(pg._boxTimer, null);
  const n = viz.boxCount(6), kept = viz.boxCount(4); assert.equal(pg.data.boxes.length, n); assert.ok(n > kept && small > kept);
  pg.data.boxes.forEach((x, i) => { assert.deepEqual([x.l, x.t], SI.tiers.medium.slots[i]); if (i < kept) assert.equal(x.cls, ''); else assert.match(x.cls, /cp-box--in/); });
  input(pg, ''); assert.deepEqual(pg.data.boxes, []); assert.equal(pg.data.stage.on, false);
  input(pg, 8); assert.equal(shown(pg).length, viz.boxCount(8)); pg.data.boxes.forEach((x) => assert.match(x.cls, /cp-box--in/));
  input(pg, 4); input(pg, 'abc'); assert.deepEqual(pg.data.boxes, []); assert.equal(pg._boxTimer, null, '清空时连同飘出的定时器一起撤');
  await settle(); assert.deepEqual(pg.data.boxes, []);
  pg.onUnload();
});

test('快速连点、拖动滑杆、换单位混着来 400 步：每一步箱子只数都等于规则值，序号连续不重复；停手后没有残留的飘出项和定时器', async () => {
  fresh(); const pg = await cap();
  pg._rect = { left: 0, width: 1000 }; pg.measure = () => {};
  let seed = 20261121; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const picks = C.requirement.capacityQuickPicks;
  for (let k = 0; k < 400; k++) {
    const r = rnd();
    if (r < 0.3) pg.onStep(tap({ dir: 'plus' }));
    else if (r < 0.55) pg.onStep(tap({ dir: 'minus' }));
    else if (r < 0.7) pg.onQuick(tap({ v: picks[Math.floor(rnd() * picks.length)] }));
    else if (r < 0.9) { pg.onSlideStart(touch(rnd() * 1000)); for (let j = 0; j < 5; j++) pg.onSlideMove(touch(rnd() * 1000)); pg.onSlideEnd(); }
    else if (r < 0.94) input(pg, ['', 'x', '0', '300', '31'][Math.floor(rnd() * 5)]);
    else if (r < 0.97) pg.onUnit(tap({ u: rnd() < 0.5 ? 'm2' : 'm3' }));
    else await tick(E.flyMs + E.flyStaggerMs + 20);
    const s = shown(pg);
    assert.equal(s.length, want(pg), '第 ' + k + ' 步 raw=' + pg.data.raw + ' unit=' + pg.data.unit);
    assert.deepEqual(pg.data.boxes.map((x) => x.i), pg.data.boxes.map((_, i) => i), '序号连续，不重复');
    assert.ok(pg.data.boxes.length <= E.stageBoxStepsM3.length);
    if (pg.data.ok) { const t = SI.tiers[bandOf(pg._v.capacity_m3)]; s.forEach((x) => assert.deepEqual([x.l, x.t], t.slots[x.i])); }
  }
  await settle();
  assert.equal(pg.data.boxes.length, want(pg)); assert.ok(pg.data.boxes.every((x) => !x.out)); assert.equal(pg._boxTimer, null);
  pg.onUnload();
});

test('卸载：箱子飘出途中离开页面，定时器清掉，之后不再 setData；带着已有需求进页时箱子一次到位', async () => {
  fresh(); const pg = await cap();
  input(pg, 12); input(pg, 6); assert.ok(pg._boxTimer);
  pg.onUnload(); assert.equal(pg._boxTimer, null);
  const count = spy(pg); await settle(); assert.equal(count(), 0);
  fresh(); state.setRequirement({ capacity_m3: 8, input_unit: 'm3', input_value: 8, source: 'manual', term_months: 6 });
  const p2 = await cap();
  assert.equal(p2.data.raw, '8'); assert.equal(p2.data.boxes.length, viz.boxCount(8)); assert.equal(p2.data.stage.key, 'medium'); assert.ok(!p2._boxTimer);
  p2.onUnload();
});

test('尺寸示意图只用在仓型层面：media.unitSizeIllus 按档返回合成图；具体仓位缩略图 unitThumb 不变，接口给了图仍优先', async () => {
  assert.deepEqual([0.8, 1.5, 1.6, 5, 5.1, 15, 15.1, 40].map((v) => path.basename(media.unitSizeIllus({ volume: v }))), ['mini', 'mini', 'small', 'small', 'medium', 'medium', 'large', 'large'].map((k) => 'size-' + k + '-box.svg'));
  assert.equal(media.unitThumb({ volume: 3, photo: 'https://cdn.example/u.jpg' }), 'https://cdn.example/u.jpg');
  BANDS.forEach((b) => assert.ok(fs.existsSync(path.join(root, media.unitSizeIllus({ volume: Number.isFinite(b.maxM3) ? b.maxM3 : 99 })))));
  assert.deepEqual(media.sizeIllusSet().map((x) => x.key), BANDS.map((b) => b.key));
  fresh(); state.setRequirement({ capacity_m3: 3, input_unit: 'm3', input_value: 3, source: 'manual', term_months: 6 });
  const pg = env.newPage('pages/store/detail', { id: 'SIM_BJ01' }); await tick(30);
  const heads = pg.data.blocks.filter((b) => b.head); assert.ok(heads.length >= 1);
  heads.forEach((b) => { assert.match(b.head.thumb, /^\/assets\/images\/units\/size-[a-z]+-box\.svg$/); assert.ok(fs.existsSync(path.join(root, b.head.thumb))); });
  if (pg.onUnload) pg.onUnload();
});

test('物品页（M-20 核对）：39 件物品每件都有图、没有单字缩略位；底栏仓库示意仍用 4 张空间图（88rpx 放不下尺寸线与数字），文件都在', async () => {
  fresh(); const pg = env.newPage('pkg-estimate/items/index', {}); await tick(30);
  assert.equal(items.items.length, 39); assert.equal(pg.data.rows.length, 39);
  pg.data.rows.forEach((r) => { assert.ok(r.thumb && fs.existsSync(path.join(root, r.thumb)), r.id); assert.equal(r.abbr, undefined); });
  assert.deepEqual(fs.readdirSync(path.join(root, 'pkg-estimate/assets/items')).map((f) => f.replace('.webp', '')).sort(), items.items.map((x) => x.id).sort(), '图与物品一一对应');
  const wxml = read('pkg-estimate/items/index.wxml'), js = read('pkg-estimate/items/index.js');
  assert.ok(!/abbr/.test(wxml + js)); assert.equal((wxml.match(/class="it-th[ "]/g) || []).length, 2, '列表行与清单行都是图');
  items.items.forEach((x) => { pg.setCount(x.id, 1); });
  assert.equal(pg.data.cartRows.length, 39); pg.data.cartRows.forEach((r) => assert.ok(fs.existsSync(path.join(root, r.thumb)), r.id));
  pg.data.depot.imgs.forEach((x) => { assert.match(x.src, /^\/assets\/images\/units\/[a-z]+\.webp$/); assert.ok(fs.existsSync(path.join(root, x.src))); });
  pg.onUnload();
});
