// 核心规则单元测试。运行：node --test tests/
// 「对照」类用例把新模块的结果与冻结稿规则脚本导出的基准（tests/golden.json）逐项比较。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const R = (p) => require(path.join(__dirname, '../miniprogram', p));
const G = require('./golden.json');
const pricing = R('core/pricing'), matching = R('core/matching'), volume = R('core/volume'), req = R('core/requirement'), fmt = R('core/format'), order = R('core/order'), C = R('core/config');
const units = R('mock/units'), stores = R('mock/stores');
const U = Object.fromEntries(units.map((u) => [u.id, u]));

test('对照：折扣表与折扣标签', () => {
  assert.deepEqual(G.terms.map(pricing.termFactor), G.termFactor);
  assert.deepEqual(G.terms.map(pricing.termDiscountLabel), G.termDiscount);
  assert.equal(pricing.bestRule().min, G.meta.best_term);
  assert.equal(pricing.bestRule().factor, G.meta.best_factor);
});
test('对照：可租仓位集合与冻结稿一致', () => {
  const mine = units.filter(matching.isAvailable).map((u) => u.id).sort();
  assert.deepEqual(mine, Object.keys(G.units).sort());
});
test('对照：每个可租仓位 × 9 个租期的金额（整期、月均、押金、管理费、满额减、应付、已省）', () => {
  let n = 0;
  for (const [id, row] of Object.entries(G.units)) {
    assert.equal(pricing.unitFromMonthly(U[id]), row.from, id + ' 月起');
    for (const m of G.terms) {
      const q = pricing.quote([U[id]], m), e = row.a[m];
      assert.deepEqual({ rent_total: q.rent_total, monthly: q.monthly_average, deposit: q.deposit, fee: q.management_fee, full: q.full_reduction, full_min: q.full_min, payable: q.payable, term_saved: q.term_discount_total, special: q.special, saved: q.saved }, e, id + ' × ' + m);
      n++;
    }
  }
  assert.equal(n, Object.keys(G.units).length * G.terms.length);
});
test('对照：每家门店的「¥X/m³/月起」', () => {
  for (const s of stores) {
    const av = units.filter((u) => u.store_id === s.id && matching.isAvailable(u));
    assert.equal(pricing.storeFromCubic(av), G.stores[s.id].from, s.id);
  }
});
test('对照：下一折扣档 1–60 个月、满额减取档', () => {
  for (let m = 1; m <= 60; m++) assert.deepEqual(pricing.nextTier(m), G.nextTier[m], 'm=' + m);
  for (const [t, e] of Object.entries(G.fullTier)) assert.deepEqual(pricing.fullTier(Number(t)), e, 't=' + t);
});
// 匹配区间（D-230 容差 10%、FIX-01 R-11 上限 130%，两端都含）：[0.9n, 1.3n] 匹配；[0.8n, 0.9n) 接近；更小不推荐；更大单列
test('匹配判定：容差 10%、上限 130%、接近 10%–20%，含十进制边界', () => {
  assert.deepEqual([C.matching.tolerance, C.matching.maxOverRatio, C.matching.nearRatio], [0.1, 0.3, 0.8]);
  const f = (v, n) => matching.fit(v, n);
  assert.deepEqual(f(3.5, 3.5), { state: 'matched', diff: 0, text: '' });
  assert.deepEqual(f(4, 3.5), { state: 'matched', diff: 0.5, text: '' });
  assert.deepEqual(f(4.55, 3.5), { state: 'matched', diff: 1.05, text: '' }, '上限含端点：3.5 × 1.3 = 4.55');
  assert.deepEqual(f(4.6, 3.5), { state: 'over', diff: 1.1 });
  assert.deepEqual(f(16, 3.5), { state: 'over', diff: 12.5 }, '库存紧张时不再把大 4 倍的仓放进推荐（A-17）');
  assert.deepEqual(f(3.5, 3.8), { state: 'matched', diff: -0.3, text: '小 0.3m³' }, '小 7.9%，算匹配并写明差额（A-01）');
  assert.deepEqual(f(3.15, 3.5), { state: 'matched', diff: -0.35, text: '小 0.35m³' }, '容差含端点：3.5 × 0.9 = 3.15');
  assert.deepEqual(f(3.1, 3.5), { state: 'near', diff: 0.4, text: '小 0.4m³' });
  assert.deepEqual(f(2.8, 3.5), { state: 'near', diff: 0.7, text: '小 0.7m³' }, '接近含端点：3.5 × 0.8 = 2.8（十进制边界）');
  assert.deepEqual(f(2.7, 3.5), { state: 'small' });
  assert.deepEqual(f(5, 0), { state: 'browse' });
  // 冻结稿对照表里不受新规则影响的行（不小于需求且不超过 130%、小于 80%）仍然一致
  for (const c of G.fit) if ((c.v >= c.n && c.v <= c.n * 1.3) || c.v < c.n * 0.8 - 1e-9) assert.equal(f(c.v, c.n).state, c.r.state, JSON.stringify(c));
});
test('对照：免费运输、远距离引导句', () => {
  for (const c of G.freeTransport) assert.equal(pricing.freeTransportFor(c.km, c.m, false), c.r, JSON.stringify(c));
  for (const c of G.nudgeFar) assert.equal(pricing.nudge(c.m, { km: c.km, baseMonth: c.base }), c.r, JSON.stringify(c));
});
test('对照：体积模型 v0.2、面积换算', () => {
  for (const c of G.volume) { const r = volume.recommend(c.lines); assert.equal(r.recommended, c.r.recommended); assert.equal(r.k, c.r.k); assert.equal(r.net, c.r.net); }
  for (const c of G.areaToM3) assert.equal(req.areaToM3(c.a), Number((c.a * 2.5).toFixed(2)));
});

test('交接文档里的两个试算：安贞店 ¥63/m³/月起；A003 租 12 个月 ¥260/月、整期 ¥3,120', () => {
  const av = units.filter((u) => u.store_id === 'SIM_BJ01' && matching.isAvailable(u));
  assert.equal(pricing.storeFromCubic(av), 63);
  const a003 = units.find((u) => u.store_id === 'SIM_BJ01' && u.code === 'A003');
  const q = pricing.quote([a003], 12);
  assert.equal(q.monthly_average, 260); assert.equal(q.rent_total, 3120); assert.equal(q.payable, 3120 + 260 + 50);
});
test('满额减与券不同享，取优惠大的一项', () => {
  const u = { id: 'x', base_month: 1000, volume: 8 }; // 12 个月：650 × 12 = 7,800 → 满 5,000 减 150
  let q = pricing.quote([u], 12, { coupon: { id: 'c', amount: 100 } });
  assert.equal(q.full_reduction, 150); assert.equal(q.coupon_discount, 0); assert.equal(q.coupon_skipped, true); assert.equal(q.payable, 7800 - 150 + 650 + 50);
  q = pricing.quote([u], 12, { coupon: { id: 'c', amount: 300 } });
  assert.equal(q.full_reduction, 0); assert.equal(q.coupon_discount, 300); assert.equal(q.coupon_skipped, false);
  assert.equal(q.saved, (1000 - 650) * 12 + 300);
});
test('券只抵租金，不抵押金和管理费', () => {
  const q = pricing.quote([{ id: 'x', base_month: 100, volume: 1 }], 1, { coupon: { id: 'c', amount: 999 } });
  assert.equal(q.coupon_discount, 80); assert.equal(q.payable, 0 + 80 + 50);
});
test('特价仓：九折与租期折扣乘算；保留券/满额减/运输资格', () => {
 const u={id:'s',base_month:2000,special_month:1800,volume:10};
 const q=pricing.quote([u],12,{coupon:{id:'c',amount:300}});
 assert.equal(q.monthly_average,1170); assert.equal(q.term_factor,0.65); assert.equal(q.rent_total,14040);
 assert.equal(q.full_reduction,0); assert.equal(q.coupon_discount,0); assert.equal(q.saved,9960); assert.equal(q.deposit,1170);
 assert.equal(pricing.freeTransportFor(8,12,true),false);
});

test('续租：无押金、无管理费、不参与满额减；首次续租沿用更深的原折扣', () => {
  const u = { id: 'x', base_month: 800, volume: 8 };
  const k = pricing.renewalFactor({ deal_factor: 0.6, renewal_count: 0 }, 12);
  assert.deepEqual(k, { factor: 0.6, kept: true, current: 0.65 });
  const q = pricing.quote([u], 12, { renewal: true, factorOverride: k.factor });
  assert.equal(q.rent_total, 5760); assert.equal(q.deposit, 0); assert.equal(q.management_fee, 0); assert.equal(q.full_reduction, 0);
  assert.equal(pricing.quote([u], 12, { renewal: true }).monthly_average - q.monthly_average, 40);
  assert.equal(pricing.renewalFactor({ deal_factor: 0.7, renewal_count: 0 }, 12).kept, false); // 原折扣更浅取现行
  assert.equal(pricing.renewalFactor({ deal_factor: 0.6, renewal_count: 1 }, 12).kept, false); // 第二次起按现行
});
test('组合仓：两仓月租相加', () => {
  const a = { id: 'a', base_month: 180, volume: 0.8 }, b = { id: 'b', base_month: 400, volume: 3.5 };
  const q = pricing.quote([a, b], 6);
  assert.equal(q.monthly_average, Math.trunc(180 * 0.7 + 1e-9) + 280); assert.equal(q.deposit, q.monthly_average);
});
test('租期非法时报错，不静默给价', () => {
  for (const m of [0, 61, 1.5, null, '12']) assert.throws(() => pricing.quote([{ id: 'x', base_month: 100, volume: 1 }], m));
  assert.throws(() => pricing.quote([], 12));
});
test('顾问卡门槛：容量 >15m³ 或整期 ≥¥3,000（含）；专属方案 ≥¥20,000', () => {
  assert.equal(pricing.advisorNeeded(15, 2999), false); assert.equal(pricing.advisorNeeded(15.01, 0), true);
  assert.equal(pricing.advisorNeeded(3.5, 3000), true); assert.equal(pricing.advisorNeeded(3.5, 3120), true);
  assert.equal(pricing.bigDeal(3.5, 19999), false); assert.equal(pricing.bigDeal(3.5, 20000), true);
});
test('满额减引导句：没有折扣档提示时才出', () => {
  const rentAt = (m) => 400 * m; // 12 个月 4,800，再租 1 个月满 5,000
  assert.equal(pricing.nudge(12, { rentAt }), '再租 1 个月，整期满 ¥5,000 减 ¥150');
  assert.equal(pricing.nudge(11, { rentAt, baseMonth: 400 }), '再租 1 个月享 6.5 折，月均少 ¥20');
  assert.equal(pricing.nudge(30, { rentAt: (m) => 100 * m }), '');
});

test('匹配：最小匹配仓、下一档、接近、组合、交顾问', () => {
  const mk = (id, v, st) => ({ id, volume: v, base_month: v * 100, status: st || 'available' });
  const us = [mk('a', 1), mk('b', 3), mk('c', 3.5), mk('d', 5), mk('e', 8, 'occupied')];
  let r = matching.matchStore(us, 3.2);
  // 需求 3.2：区间 [2.88, 4.16]。3 与 3.5 都在区间内，取不小于需求的最小仓 3.5；5m³ 超上限，不作下一档，单列 over
  assert.equal(r.state, 'matched'); assert.equal(r.best.id, 'c'); assert.equal(r.larger, null); assert.equal(r.near, null); assert.equal(r.others, 1); assert.deepEqual(r.over.map((u) => u.id), ['d']);
  r = matching.matchStore(us, 3); assert.equal(r.best.id, 'b'); assert.equal(r.larger.id, 'c', '下一档在区间内才给');
  r = matching.matchStore([mk('a', 1), mk('b', 3)], 3.3); assert.equal(r.state, 'matched'); assert.equal(r.best.id, 'b', '没有不小于需求的仓时，取略小（10% 以内）的');
  // 需求 6：区间 [5.4, 7.8]。没有单仓；组合合计要落在区间内（1+5=6、3+3.5=6.5；3+5=8 超上限）
  r = matching.matchStore(us, 6);
  assert.equal(r.state, 'combo'); assert.deepEqual(r.combos.map((x) => x.units.map((u) => u.id).join('')), ['ad', 'bc']); assert.equal(r.near.id, 'd'); assert.equal(r.nearOffer, null);
  // 需求 10：没有匹配，合计最大的组合 8.5 只够「接近」→ 作为本店最接近的方案
  r = matching.matchStore(us, 10); assert.equal(r.state, 'near'); assert.equal(r.near, null); assert.deepEqual(r.nearOffer.map((u) => u.id), ['c', 'd']); assert.equal(r.nearCombos[0].volume, 8.5);
  assert.equal(matching.matchStore(us, 12).state, 'none');
  assert.equal(matching.matchStore(us, 30).state, 'none'); assert.equal(matching.matchStore(us, 29.99).state, 'none');
  assert.equal(matching.matchStore(us, null).state, 'browse');
  assert.deepEqual(matching.capacityRange(us), { min: 1, max: 5 });
});

test('容量输入：任意小数向上归一，下限建议，30m³不中断',()=>{
 for(const raw of ['', 'abc','-1','Infinity']) assert.equal(req.validate('m3',raw).ok,false);
 for(const [raw,want] of [['0',0.5],['0.49',0.5],['3.01',3.1],['3.1',3.1],['3.1000000000000001',3.2],['29.99',30],['500',500]]) {
  const r=req.validate('m3',raw);assert.equal(r.ok,true);assert.equal(r.capacity_m3,want);assert.equal(r.sales,false);assert.equal(r.input_raw,raw);
 }
});

test('面积输入：最高200㎡，2.5m暂定层高，下限建议不阻断',()=>{
 assert.equal(req.validate('m2','0.11').input_value,0.2);assert.equal(req.validate('m2','0.11').capacity_m3,0.5);
 assert.equal(req.validate('m2','2').capacity_m3,5);assert.equal(req.validate('m2','2.25').input_value,2.3);
 assert.equal(req.validate('m2','200').capacity_m3,500);assert.equal(req.validate('m2','200.0000000001').error,'range');
 assert.equal(req.validate('m2','12.5').sales,false);
});

test('需求显示与纸箱数', () => {
  assert.equal(req.demandText({ capacity_m3: 4.8, input_unit: 'm2', input_value: 2 }), '2㎡ · 约4.8m³');
  assert.equal(req.demandText({ capacity_m3: 3.5, input_unit: 'm3', input_value: 3.5 }), '3.5m³'); assert.equal(req.demandText(null), '');
  assert.equal(req.cartonCount(3), 25); assert.equal(req.cartonCount(0.5), 4);
});
test('命名口径：仓位名、层标签、尺寸、组合仓', () => {
  const u = { code: 'A003', volume: 3.5, dims: [1.4, 1, 2.5], area: 1.4 };
  assert.equal(fmt.unitName(u), 'A003 · 3.5m³'); assert.equal(fmt.dimsText(u), '1.4 × 1 × 2.5m'); assert.equal(fmt.areaText(u), '约1.4㎡');
  assert.equal(fmt.tierLabel({ tier_index: 2, tier_total: 2 }), '上层 2/2'); assert.equal(fmt.tierLabel({ tier_index: 1, tier_total: 2 }), '下层 1/2');
  assert.equal(fmt.tierLabel({ tier_index: 2, tier_total: 3 }), '中层 2/3'); assert.equal(fmt.tierLabel({ tier_index: null, tier_total: null }), ''); assert.equal(fmt.tierLabel({ tier_index: 1, tier_total: 1 }), '');
  assert.equal(fmt.comboName([{ code: 'A001' }, { code: 'A002' }]), '组合仓 A001 + A002'); assert.equal(fmt.comboVolumeText([{ volume: 0.8 }, { volume: 1.5 }]), '合计 2.3 m³');
});
test('演示数据：仓号全部三位、不带「仓号」字样、层标签成对', () => {
  for (const u of units) { assert.match(u.code, /^[A-Z]\d{3}$/, u.id); assert.ok((u.tier_index === null) === (u.tier_total === null)); }
  for (const s of stores) { assert.ok(!/北京.+区$/.test(s.district), s.id); assert.ok(!/昌平其它|科技园区·/.test(s.name), s.id); }
});
test('订单号、三个计时、服务时段', () => {
  const t = Date.UTC(2026, 10, 18, 16, 30); // 北京时间 11-19 00:30
  assert.equal(order.orderNo(t, 7), 'MK202611190007');
  assert.equal(order.pendingExpiresAt(t) - t, 3 * 3600e3); assert.equal(order.quoteExpiresAt(t) - t, 3 * 3600e3);
  assert.equal(order.renewQuoteExpiresAt(t, t + 3600e3), t + 3600e3); assert.equal(order.renewQuoteExpiresAt(t, t + 99 * 3600e3), t + 24 * 3600e3);
  assert.equal(order.inServiceHours(t), false); assert.equal(order.inServiceHours(Date.UTC(2026, 10, 18, 1, 0)), true); assert.equal(order.inServiceHours(Date.UTC(2026, 10, 18, 12, 0)), false);
  assert.equal(order.isExpired(t, t), true);
});
test('配置：折扣表连续无缝、覆盖 1–60 个月', () => {
  const r = C.pricing.termRules; assert.equal(r[0].min, 1); assert.equal(r[r.length - 1].max, 60);
  for (let i = 1; i < r.length; i++) { assert.equal(r[i].min, r[i - 1].max + 1); assert.ok(r[i].factor <= r[i - 1].factor); }
});
