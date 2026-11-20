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
test('对照：匹配判定', () => { for (const c of G.fit) assert.deepEqual(matching.fit(c.v, c.n), c.r, JSON.stringify(c)); });
test('对照：免费运输、远距离引导句', () => {
  for (const c of G.freeTransport) assert.equal(pricing.freeTransportFor(c.km, c.m, false), c.r, JSON.stringify(c));
  for (const c of G.nudgeFar) assert.equal(pricing.nudge(c.m, { km: c.km, baseMonth: c.base }), c.r, JSON.stringify(c));
});
test('对照：体积模型 v0.2、面积换算', () => {
  for (const c of G.volume) { const r = volume.recommend(c.lines); assert.equal(r.recommended, c.r.recommended); assert.equal(r.k, c.r.k); assert.equal(r.net, c.r.net); }
  for (const c of G.areaToM3) assert.equal(req.areaToM3(c.a), c.r);
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
test('特价仓：不叠租期折扣、不参与满额减与券、不显示已省、不送免费运输', () => {
  const u = { id: 's', base_month: 2000, special_month: 900, volume: 10 };
  const q = pricing.quote([u], 12, { coupon: { id: 'c', amount: 300 } });
  assert.equal(q.special, true); assert.equal(q.monthly_average, 900); assert.equal(q.full_reduction, 0); assert.equal(q.coupon_discount, 0); assert.equal(q.saved, 0);
  assert.equal(pricing.freeTransportFor(8, 12, true), false);
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
  assert.equal(r.state, 'matched'); assert.equal(r.best.id, 'c'); assert.equal(r.larger.id, 'd'); assert.equal(r.near.id, 'b'); assert.equal(r.others, 1);
  r = matching.matchStore(us, 6);
  assert.equal(r.state, 'combo'); assert.deepEqual(r.combos[0].units.map((u) => u.id), ['a', 'd']); assert.equal(r.near.id, 'd');
  assert.equal(matching.matchStore(us, 12).state, 'none');
  assert.equal(matching.matchStore(us, 30).state, 'sales'); assert.equal(matching.matchStore(us, 29.99).state, 'none');
  assert.equal(matching.matchStore(us, null).state, 'browse');
  assert.deepEqual(matching.capacityRange(us), { min: 1, max: 5 });
});

test('容量输入：下限 0.5、两位小数、30m³ 及以上交顾问（含超过 200）', () => {
  assert.equal(req.validate('m3', '').error, 'empty'); assert.equal(req.validate('m3', 'abc').error, 'format'); assert.equal(req.validate('m3', '-1').error, 'format');
  assert.equal(req.validate('m3', '0.49').error, 'min'); assert.equal(req.validate('m3', '0.5').ok, true);
  assert.equal(req.validate('m3', '3.255').error, 'decimals'); assert.equal(req.validate('m3', '3.25').ok, true);
  assert.equal(req.validate('m3', '29.99').sales, false); assert.equal(req.validate('m3', '30').sales, true); assert.equal(req.validate('m3', '500').sales, true);
});
test('面积输入：0.2–200㎡、一位小数、换算后达到 30m³ 交顾问', () => {
  assert.equal(req.validate('m2', '0.1').error, 'range'); assert.equal(req.validate('m2', '200.1').error, 'range'); assert.equal(req.validate('m2', '2.25').error, 'decimals');
  assert.deepEqual(req.validate('m2', '2'), { ok: true, capacity_m3: 4.8, sales: false });
  assert.equal(req.validate('m2', '12.5').sales, true); assert.equal(req.validate('m2', '12.4').sales, false); assert.equal(req.validate('m2', '200').ok, true);
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
