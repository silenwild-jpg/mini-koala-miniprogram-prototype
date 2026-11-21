// IMPL-01 估算域：容量填写页（AI 入口隐藏、刻度滑杆、仓库示意与箱子飘入）、按物品估算页（物品图、飞入仓库示意、数量弹窗进退场）。
// 在假的 wx 环境里跑：验证的是状态机（连点不堆积、卸载后不再写数据）与静态结果，不是微信里的真实动画。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = (p) => require(path.join(root, p));
const state = R('services/state'), scenarios = R('mock/scenarios'), media = R('services/media'), viz = R('core/estimate-viz');
const { db } = R('services/mock-ext/_db');
const C = R('core/config'), CF = R('core/config-find'), T = R('i18n/find'), mock = R('mock/items');
const E = CF.estimate;
env.loadApp();
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 0));
function fresh() {
  state.reset(); env.nav.length = 0; db.orders.length = 0; db.leads.length = 0; db.messages.length = 0; db.seq = 0; db.seeded = true; db.kv = {}; db.sms = {};
  scenarios.write({ scenario: '', stock: 'normal', events: {}, net: 'instant' });
  state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' });
}
const tap = (ds, x, y) => ({ currentTarget: { dataset: ds || {} }, changedTouches: x === null ? [] : [{ clientX: x === undefined ? 300 : x, clientY: y === undefined ? 300 : y }], detail: {} });
const touch = (x) => ({ touches: [{ clientX: x, clientY: 200 }], changedTouches: [{ clientX: x, clientY: 200 }] });
// 记录某一刻之后的 setData 次数
function spy(pg) { let n = 0; const raw = pg.setData; pg.setData = function (d, cb) { n++; return raw.call(this, d, cb); }; return () => n; }
async function cap() { const pg = env.newPage('pages/estimate/capacity', {}); await tick(30); if (pg.onReady) pg.onReady(); return pg; }
async function items() { const pg = env.newPage('pkg-estimate/items/index', {}); await tick(30); if (pg.onReady) pg.onReady(); return pg; }
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('容量页：AI 估算入口由 estimate.aiEnabled 控制，关着时不渲染、不留占位；空间参考在滑杆下方、租期之前', async () => {
  fresh(); const pg = await cap();
  assert.equal(E.aiEnabled, false); assert.equal(pg.data.ai, false);
  const wxml = read('pages/estimate/capacity.wxml');
  const ai = wxml.split('\n').filter((l) => /bindtap="onAi"/.test(l));
  assert.equal(ai.length, 1); assert.match(ai[0], /wx:if="\{\{ai\}\}"/);
  assert.ok(wxml.indexOf('cp-slider') < wxml.indexOf('id="cp-ref"') && wxml.indexOf('id="cp-ref"') < wxml.indexOf('mk-term-seg'));
  assert.ok(!/[一-龥]/.test(wxml.replace(/aria-label="[^"]*"/g, '')), 'WXML 里不写死中文');
  pg.onUnload();
});

test('容量页滑杆：五个快捷档都有刻度位置与仓型名；点刻度选中该档；位置与数值互相换算；拖动改值并收尾', async () => {
  fresh(); const pg = await cap();
  assert.deepEqual(pg.data.quick.map((x) => x.v), C.requirement.capacityQuickPicks);
  pg.data.quick.forEach((x, i) => { assert.equal(x.left, Number((E.sliderStops[i] * 100).toFixed(2))); assert.ok(x.sub, '刻度带仓型名'); assert.equal(x.on, false); });
  assert.equal(pg.data.pos, 0);
  pg.onQuick(tap({ v: 8 }));
  assert.equal(pg.data.raw, '8'); assert.deepEqual(pg.data.quick.map((x) => x.on), [false, false, true, false, false]); assert.equal(pg.data.pos, E.sliderStops[2]);
  const min = C.requirement.capacityMinM3;
  C.requirement.capacityQuickPicks.forEach((v, i) => { assert.equal(viz.posOf(v, min), E.sliderStops[i]); assert.equal(viz.valueOf(E.sliderStops[i], min, E.capStepM3), v); });
  assert.equal(viz.posOf(999, min), 1); assert.equal(viz.posOf('x', min), 0); assert.equal(viz.valueOf(-3, min, E.capStepM3), min); assert.equal(viz.valueOf(9, min, E.capStepM3), 20);
  // 拖到最右：值为最后一档；拖动中 sliding 为真，松手后为假
  pg._rect = { left: 40, width: 295 };
  const measure = pg.measure; pg.measure = () => {};
  pg.onSlideStart(touch(40 + 295 * E.sliderStops[1])); assert.equal(pg.data.sliding, true); assert.equal(pg.data.raw, '3');
  pg.onSlideMove(touch(999)); assert.equal(pg.data.raw, '20'); assert.equal(pg.data.pos, 1);
  pg.onSlideEnd(); assert.equal(pg.data.sliding, false);
  pg.onSlideMove(touch(40)); assert.equal(pg.data.raw, '20', '松手后的移动事件不再改值');
  pg.measure = measure;
  // 超过最后一档的容量：滑块停在最右，仓库示意放到最大
  pg.onInput({ detail: { value: '30' } }); assert.equal(pg.data.pos, 1); assert.equal(pg.data.stage.s, 1); assert.equal(pg.data.advise, true);
  pg.onUnload();
});

test('容量页仓库示意：没填时是淡的最小档；容量越大缩放越大、换到对应的空间图；面积模式按折算后的容量取', async () => {
  fresh(); const pg = await cap();
  assert.equal(pg.data.stage.on, false); assert.equal(pg.data.stage.s, E.stageScaleMin); assert.equal(pg.data.stage.imgs.length, CF.unitThumbBands.length);
  assert.equal(pg.data.stage.imgs.filter((x) => x.on).length, 1);
  let last = 0;
  [1, 3, 8, 15, 20].forEach((v) => {
    pg.onQuick(tap({ v }));
    assert.equal(pg.data.stage.on, true); assert.ok(pg.data.stage.s > last && pg.data.stage.s <= 1); last = pg.data.stage.s;
    assert.deepEqual(pg.data.stage.imgs.filter((x) => x.on).map((x) => x.key), [media.unitThumbKey(v)]);
    assert.ok(pg.data.ref && pg.data.ref.title, '空间参考文案仍按容量取档');
  });
  pg.data.stage.imgs.forEach((x) => assert.ok(fs.existsSync(path.join(root, x.src)), x.src));
  pg.onUnit(tap({ u: 'm2' })); assert.equal(pg.data.stage.on, false);
  pg.onInput({ detail: { value: '300' } }); assert.equal(pg.data.stage.on, false); assert.ok(pg.data.error); assert.deepEqual(pg.data.boxes, [], '无效输入不放箱子');
  pg.onUnload();
});

// IMPL-02：箱子从「飘过就消失」改成在示意区累计停留（data.boxes，只数由容量决定），下面三条按新机制改写；更细的用例在 impl-02-estimate.test.js。
test('容量页动效：点加号箱子落进示意区并留下、点减号最上面一只飘出，数字与底栏弹一下；快速连点 20 次只数仍与容量对应，只有一个收尾定时器', async () => {
  fresh(); const pg = await cap();
  const shown = () => pg.data.boxes.filter((x) => !x.out);
  pg.onStep(tap({ dir: 'plus' }));
  assert.equal(shown().length, viz.boxCount(0.5)); assert.match(pg.data.boxes[0].cls, /cp-box--in/);
  await tick(40); assert.match(pg.data.capBump, /mk-bump/); assert.equal(pg.data.sumBump, 'mk-bump');
  for (let i = 0; i < 20; i++) pg.onStep(tap({ dir: 'plus' }));
  assert.equal(Number(pg.data.raw), 10.5, '每次点击都算数');
  assert.equal(shown().length, viz.boxCount(10.5)); assert.equal(new Set(pg.data.boxes.map((x) => x.i)).size, pg.data.boxes.length, '键不重复');
  pg.onStep(tap({ dir: 'minus' })); assert.equal(Number(pg.data.raw), 10); assert.equal(shown().length, viz.boxCount(10));
  pg.onQuick(tap({ v: 8 })); assert.equal(pg.data.boxes[pg.data.boxes.length - 1].out, true, '变少：多出来的先带着飘出类留一拍');
  const first = pg._boxTimer; assert.ok(first);
  pg.onQuick(tap({ v: 6 })); assert.notEqual(pg._boxTimer, first, '定时器顺延而不是叠加');
  await tick(E.flyMs + E.flyStaggerMs + 80);
  assert.equal(pg.data.boxes.length, viz.boxCount(6)); assert.equal(pg._boxTimer, null);
  // 动画期间与之后都能正常提交
  assert.equal(pg.data.ok, true); pg.onStep(tap({ dir: 'minus' })); pg.onSubmit();
  assert.equal(state.get().requirement.capacity_m3, 5.5);
  pg.onUnload();
});

test('容量页动效：值没变不触发（已在最小值再点减号、重复点同一档）；拖动时箱子只数跟着容量走，不会多出来', async () => {
  fresh(); const pg = await cap();
  pg.onQuick(tap({ v: 3 })); await tick(60); const before = JSON.stringify(pg.data.boxes), bump = pg.data.capBump;
  pg.onQuick(tap({ v: 3 })); assert.equal(JSON.stringify(pg.data.boxes), before); assert.equal(pg.data.capBump, bump, '重复点同一档不再弹'); assert.ok(!pg._boxTimer);
  pg.onInput({ detail: { value: String(C.requirement.capacityMinM3) } }); await tick(E.flyMs + E.flyStaggerMs + 60);
  const min = JSON.stringify(pg.data.boxes); pg.onStep(tap({ dir: 'minus' })); assert.equal(JSON.stringify(pg.data.boxes), min);
  pg._rect = { left: 0, width: 1000 }; pg.measure = () => {};
  pg.onSlideStart(touch(200));
  for (let x = 220; x < 900; x += 20) { pg.onSlideMove(touch(x)); assert.equal(pg.data.boxes.filter((b) => !b.out).length, viz.boxCount(pg._v.capacity_m3)); }
  pg.onSlideEnd(); pg.onUnload();
});

test('容量页动效：箱子飘出途中离开页面，定时器清掉，之后不再 setData', async () => {
  fresh(); const pg = await cap();
  pg.onQuick(tap({ v: 8 })); pg.onQuick(tap({ v: 6 }));
  assert.ok(pg._boxTimer);
  pg.onUnload(); assert.equal(pg._boxTimer, null);
  const count = spy(pg);
  await tick(E.flyMs + E.flyStaggerMs * 4 + 80);
  assert.equal(count(), 0);
  const kept = pg.data.boxes; assert.equal(pg.planBoxes('large', 9), kept, '卸载后再算也不改'); assert.equal(pg._boxTimer, null);
});

test('物品页：头部不再有 AI 估算与「直接填容量」；物品行与清单行用物品图，39 件一一有图，单张不超过 10KB', async () => {
  fresh(); const pg = await items();
  assert.equal(pg.data.ai, false);
  const wxml = read('pkg-estimate/items/index.wxml');
  const ai = wxml.split('\n').filter((l) => /bindtap="onAi"/.test(l)); assert.equal(ai.length, 1);
  const head = wxml.slice(wxml.indexOf('class="it-head"'), wxml.indexOf('class="it-main"'));
  assert.match(head, /wx:if="\{\{ai\}\}" class="[^"]*it-assist/); assert.ok(!/onToCap/.test(head));
  assert.equal((wxml.match(/onToCap/g) || []).length, 1, '只剩搜不到时的出路'); assert.ok(!/abbr/.test(wxml));
  assert.ok(!/[一-龥]/.test(wxml.replace(/aria-label="[^"]*"/g, '')), 'WXML 里不写死中文');
  assert.equal(mock.items.length, 39); assert.equal(pg.data.rows.length, 39);
  let total = 0;
  pg.data.rows.forEach((r) => { assert.match(r.thumb, /^\/pkg-estimate\/assets\/items\/[A-Za-z0-9]+\.webp$/); const f = path.join(root, r.thumb); assert.ok(fs.existsSync(f), r.thumb); const sz = fs.statSync(f).size; assert.ok(sz <= 10 * 1024, r.thumb + ' ' + sz); total += sz; });
  assert.equal(fs.readdirSync(path.join(root, 'pkg-estimate/assets/items')).length, 39, '没有多余的图');
  assert.ok(total < 120 * 1024);
  assert.equal(media.itemThumb({ id: 'box', photo: 'https://x/y.webp' }), 'https://x/y.webp', '接口给了图优先用');
  assert.equal(pg.data.rows[pg.data.rows.length - 1].last, true);
  pg.setCount('box', 2); assert.equal(pg.data.cartRows[0].thumb, '/pkg-estimate/assets/items/box.webp');
  pg.onUnload();
});

test('物品页底栏仓库示意：没选时是淡的；选得越多缩放越大，角标写件数；合计句不再串件数', async () => {
  fresh(); const pg = await items();
  assert.equal(pg.data.depot.on, false); assert.equal(pg.data.depot.count, ''); assert.equal(pg.data.depot.s, E.stageScaleMin); assert.equal(pg.data.footTop, T.items.footNone);
  pg.setCount('box', 3); const s1 = pg.data.depot.s;
  assert.equal(pg.data.depot.on, true); assert.equal(pg.data.depot.count, '3'); assert.ok(!/[·•]/.test(pg.data.footTop)); assert.ok(!/[·•›]/.test(pg.data.selectedText));
  pg.setCount('sofa3', 2); pg.setCount('wardrobe', 2);
  assert.ok(pg.data.depot.s > s1 && pg.data.depot.s <= 1); assert.equal(pg.data.depot.count, '7');
  assert.equal(pg.data.depot.imgs.filter((x) => x.on).length, 1);
  await tick(40); assert.equal(pg.data.footBump, 'mk-bump');
  pg.setCount('box', 0); pg.setCount('sofa3', 0); pg.setCount('wardrobe', 0);
  assert.equal(pg.data.depot.on, false); assert.equal(pg.data.depot.count, '');
  pg.onUnload();
});

test('物品页动效：点「+」物品图从点击处飞向仓库示意；连点 12 次数量照加、飞行图不超过上限；落地后清空并让仓库弹一下', async () => {
  fresh(); const pg = await items();
  pg.onStep(tap({ id: 'box', d: 'plus' }, 320, 400));
  assert.equal(pg.data.flyers.length, 1);
  const f = pg.data.flyers[0]; assert.equal(f.src, '/pkg-estimate/assets/items/box.webp');
  assert.match(f.style, /left:320px;top:400px;--it-dx:-?\d+px;--it-dy:-?\d+px/);
  const dx = Number(/--it-dx:(-?\d+)px/.exec(f.style)[1]), dy = Number(/--it-dy:(-?\d+)px/.exec(f.style)[1]);
  assert.ok(dx < 0 && dy > 0, '仓库示意在左下方');
  for (let i = 0; i < 12; i++) pg.onStep(tap({ id: 'box', d: 'plus' }, 320, 400));
  assert.equal(pg.data.rows.find((r) => r.id === 'box').n, 13);
  assert.ok(pg.data.flyers.length <= E.flyMax); assert.equal(new Set(pg.data.flyers.map((x) => x.k)).size, pg.data.flyers.length);
  await tick(E.flyMs + E.flyStaggerMs + 80);
  assert.deepEqual(pg.data.flyers, []); assert.equal(pg._flyTimer, null); assert.match(pg.data.depotBump, /mk-bump/);
  pg.onUnload();
});

test('物品页动效：减号不飞；到数量上限再点不飞；事件里没有触点坐标时只改数量；清单抽屉开着时不飞', async () => {
  fresh(); const pg = await items();
  pg.setCount('box', 2);
  pg.onStep(tap({ id: 'box', d: 'minus' }, 320, 400)); assert.equal(pg.data.flyers.length, 0); assert.equal(pg.data.rows.find((r) => r.id === 'box').n, 1);
  pg.onStep(tap({ id: 'box', d: 'plus' }, null)); assert.equal(pg.data.flyers.length, 0); assert.equal(pg.data.rows.find((r) => r.id === 'box').n, 2);
  pg.onStep({ currentTarget: { dataset: { id: 'box', d: 'plus' } } }); assert.equal(pg.data.rows.find((r) => r.id === 'box').n, 3);
  pg.setCount('box', C.requirement.itemQtyMax); pg.onStep(tap({ id: 'box', d: 'plus' }, 320, 400)); assert.equal(pg.data.flyers.length, 0);
  pg.onCart(); assert.equal(pg.data.cartVisible, true);
  pg.onStep(tap({ id: 'sofa3', d: 'plus' }, 320, 400)); assert.equal(pg.data.flyers.length, 0); assert.equal(pg.data.rows.find((r) => r.id === 'sofa3').n, 1);
  pg.onStep(tap({ id: 'nope', d: 'plus' }, 320, 400)); assert.equal(pg.data.flyers.length, 0);
  pg.onUnload();
});

test('物品页动效：飞行中途离开页面，定时器清掉，之后不再 setData', async () => {
  fresh(); const pg = await items();
  pg.onStep(tap({ id: 'box', d: 'plus' }, 320, 400)); pg.onQty(tap({ id: 'box' })); pg.onQtyCancel();
  assert.ok(pg._flyTimer); assert.ok(pg._qtyTimer);
  pg.onUnload(); assert.equal(pg._flyTimer, null); assert.equal(pg._qtyTimer, null);
  const count = spy(pg);
  await tick(E.flyMs + E.flyStaggerMs + E.dialogOutMs + 80);
  assert.equal(count(), 0);
  pg.fly(tap({}, 10, 10), 'box'); assert.equal(count(), 0);
});

test('物品页数量弹窗：打开渐显；确定后逻辑上立刻关闭、画面多留一拍退场；重复点确定不重复提交；退场中再次打开不会被旧定时器关掉', async () => {
  fresh(); const pg = await items();
  pg.setCount('box', 2);
  pg.onQty(tap({ id: 'box' })); assert.equal(pg.data.qtyVisible, true); assert.equal(pg.data.qtyRender, true); assert.equal(pg.data.qtyOut, false);
  pg.onQtyQuick(tap({ n: 20 })); pg.onQtyOk();
  assert.equal(pg.data.qtyVisible, false); assert.equal(pg.data.qtyOut, true); assert.equal(pg.data.qtyRender, true);
  assert.equal(pg.data.rows.find((r) => r.id === 'box').n, 20);
  pg.setData({ qtyRaw: '5' }); pg.onQtyOk(); assert.equal(pg.data.rows.find((r) => r.id === 'box').n, 20, '已关闭的弹窗不再提交');
  await tick(E.dialogOutMs + 60); assert.equal(pg.data.qtyRender, false); assert.equal(pg.data.qtyOut, false);
  pg.onQty(tap({ id: 'box' })); pg.onQtyCancel(); pg.onQty(tap({ id: 'sofa3' }));
  assert.equal(pg._qtyTimer, null);
  await tick(E.dialogOutMs + 60);
  assert.equal(pg.data.qtyVisible, true); assert.equal(pg.data.qtyRender, true); assert.equal(pg.data.qtyOut, false);
  pg.onQtyInput({ detail: { value: '9999' } }); assert.equal(pg.data.qtyBad, true); pg.onQtyOk(); assert.equal(pg.data.qtyVisible, true, '超上限不关');
  pg.onUnload();
});

test('物品页：分类与模式切换轮换渐显类（换类名即重放，不用定时器）；重复点同一分类不重放；规格弹层分开写物品名与说明', async () => {
  fresh(); const pg = await items();
  const a = pg.data.listFx; assert.match(a, /^it-fx-[ab]$/);
  pg.onCat(tap({ id: 'furniture' })); const b = pg.data.listFx; assert.notEqual(b, a);
  pg.onCat(tap({ id: 'furniture' })); assert.equal(pg.data.listFx, b);
  pg.onMode(tap({ m: 'scenes' })); assert.equal(pg.data.listFx, a); assert.equal(pg.data.mode, 'scenes');
  pg.onMode(tap({ m: 'scenes' })); assert.equal(pg.data.listFx, a);
  const wxss = read('pkg-estimate/items/index.wxss'); assert.match(wxss, /\.it-fx-a \{/); assert.match(wxss, /\.it-fx-b \{/); assert.match(wxss, /@keyframes it-kf-fly/);
  pg.onMode(tap({ m: 'items' }));
  const multi = pg.data.rows.find((r) => r.multi); assert.ok(multi.variantText && !/[·•]/.test(multi.variantText));
  pg.onVariant(tap({ id: multi.id })); assert.equal(pg.data.variantVisible, true); assert.equal(pg.data.variantName, multi.name);
  pg.onVariantClose(); pg.onUnload();
});
