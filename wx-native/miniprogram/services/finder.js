// 找仓视图模型：把门店 + 仓位 + 需求 + 用仓位置 + 登录态，变成页面可直接绑定的数据。
// 首页推荐卡、门店列表、仓位推荐、门店详情共用，保证「同一口径只算一次」。
// 取价处直接按登录状态返回：未登录不产出整期金额、不产出「每月多 ¥X」（交接 v1.0 §1.2、§4.1-3、D-187）。
// 排序（B1-07）：并入冻结稿 runtime/recommendation-policy.js 与 home-recommend-policy.js，见 rank / buildHomeRecommend。
const C = require('../core/config');
const CF = require('../core/config-find');
const pricing = require('../core/pricing');
const matching = require('../core/matching');
const fmt = require('../core/format');
const req = require('../core/requirement');
const order = require('../core/order');
const T = require('../i18n/find');
const media = require('./media');

const imageOf = (store) => media.storeCard(store);
const num = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
const sumVol = (units) => Number(units.reduce((n, u) => n + Number(u.volume), 0).toFixed(3));

// 距离：现在是演示值（D-111）。定位城市没有门店时不显示公里数、不显示免费运输标签（D-184）。
// 没有起点时同样不给距离（FIX-01 A-04）：用仓位置还是「城市」一级且没有定位成功。真实接口在没有坐标时返回什么待后端定。
const hasOrigin = (location) => !!location && (location.kind !== 'city' || location.status === 'granted');
function distanceOf(store, location) {
  if (!location || location.noStoreCity || location.city !== store.city || !hasOrigin(location)) return null;
  return typeof store.distance_km === 'number' ? store.distance_km : null;
}
// 仓位用途短句与仓型（冻结稿 br03-policy.generic、w2-render.category）
function usageText(volume) {
  const i = CF.usageBandsM3.findIndex((b) => Number(volume) <= b);
  return T.usage.prefix + T.usage.bands[i < 0 ? T.usage.bands.length - 1 : i];
}
const categoryOf = (volume) => CF.unitCategories.find((c) => Number(volume) <= c.maxM3).key;

// 门店标签（冻结稿 presentation-policy.tags）：优惠 → 服务 → 属性；优惠标签最多一个。
// 「特价仓」按所展示的仓位判断（交接 §4.4-11），由调用方传入 promo。
const ATTRIBUTE_TAGS = { '新开门店': 1, '24小时存取': 1, '24小时开放': 1, '全天监控': 1, '控温防潮': 1, '独立安防': 1 };
function storeTags(store, limit, promo, far) {
  const seen = {}, service = [], attr = [];
  (store.tags || []).forEach((t) => { if (!t || seen[t] || t === T.price.special) return; seen[t] = 1; (ATTRIBUTE_TAGS[t] ? attr : service).push({ t, promo: false }); });
  const base = (n) => (promo ? [{ t: T.price.special, promo: true }] : []).concat(service, attr).slice(0, n);
  return far ? [{ t: T.card.freeTransport, promo: true }].concat(base(Math.max(1, limit - 2))) : base(limit);
}

// 一行仓位（单仓或两仓组合）的显示数据。months 为空（无需求）或未登录时，只给「/月起」。
function line(units, months, loggedIn) {
  const single = units.length === 1 ? units[0] : null, vol = sumVol(units);
  const l = {
    id: units.map((u) => u.id).join(','), combo: !single,
    name: single ? fmt.unitName(single) : fmt.comboName(units),
    code: single ? single.code : fmt.comboName(units), volText: fmt.pretty(vol) + 'm³',
    tier: single ? fmt.tierLabel(single) : '', dims: single ? fmt.dimsText(single) : fmt.comboVolumeText(units),
    area: single ? fmt.areaText(single) : '', usage: usageText(units[0].volume), special: units.some(pricing.isSpecial),
    thumbs: units.slice(0, 2).map(media.unitThumb)
  };
  if (loggedIn && pricing.isTerm(months)) {
    const q = pricing.quote(units, months);
    l.price = { mode: 'monthly', amount: q.monthly_average, unit: T.price.month, discount: q.special ? T.price.special : pricing.factorLabel(q.term_factor), sub: T.price.totalPrefix + pricing.yuan(q.rent_total) + ' · ' + fmt.termText(months) + (q.full_reduction > 0 ? ' · ' + T.price.fullOffShort + pricing.yuan(q.full_reduction) : '') }; // 满额减缩写为「-¥400」（W37 #28）；三页同一写法，卡片里放得下
    l.rentTotal = q.rent_total; l.monthly = q.monthly_average;
    l.cta = T.cta.order;
  } else {
    l.price = { mode: 'from', amount: units.reduce((n, u) => n + pricing.unitFromMonthly(u), 0), unit: T.price.fromMonth, discount: '', sub: '' };
    l.cta = pricing.isTerm(months) ? T.cta.quote : T.cta.order; // 没有需求时按默认租期下单（D-158），未登录由登录守卫拦在当前页
  }
  return l;
}
// 库存紧张提示：本店可租仓位总数不超过阈值时给一句话。阈值与开关在 core/config-find.js lowStock。
function lowText(storeUnits) {
  const c = CF.lowStock; if (!c || !c.show) return '';
  const n = (storeUnits || []).filter(matching.isAvailable).length;
  return n >= 1 && n <= c.maxLeft ? T.stock.low(n) : '';
}
const unitRow = (u, months, loggedIn) => line([u], months, loggedIn);
// 排序用的月租：只在本模块内部比较大小，不放进任何返回值（未登录也不外露）
const monthlyAt = (units, months) => units.reduce((n, u) => n + pricing.unitPricing(u, pricing.isTerm(months) ? months : pricing.bestRule().min).monthly_rent, 0);

function largerLine(avail, offerUnits, first, need, ctx, hasLong) {
  const ov = sumVol(offerUnits), ids = offerUnits.map((u) => u.id);
  // 下一档更大的可租仓：不超过需求的容量上限（FIX-01 R-11）。差额与价差都相对上一行的方案（交接 v1.0 §4.4-8，A-09）
  const next = avail.find((u) => u.volume > ov && ids.indexOf(u.id) < 0 && matching.fit(u.volume, need).state === 'matched');
  if (!next) return null;
  const months = ctx.requirement && ctx.requirement.term_months;
  const row = line([next], months, ctx.loggedIn);
  row.diffText = T.card.diff(fmt.pretty(next.volume - ov));
  row.bigTag = ''; // W37 #25：不再出「大一档」标签
  // 未登录不显示「每月多 ¥X」（D-187）；更大的仓不更贵时只写容量差
  if (ctx.loggedIn && first.monthly !== undefined && row.monthly !== undefined && row.monthly > first.monthly) row.diffText += T.card.diffMore(pricing.yuan(row.monthly - first.monthly));
  const ratio = need / ov; // 理由（D-161）：组合方案、接近方案不出
  row.reason = offerUnits.length > 1 || ratio > 1 ? '' : ratio >= 0.995 ? T.card.reasonEqual(fmt.pretty(ov)) : ratio >= C.pricing.upsizeRatio ? T.card.reasonRatio(fmt.pretty(ov), Math.round(ratio * 100)) : hasLong ? T.card.reasonLong : '';
  return row;
}

function storeCard(store, ctx) {
  const need = ctx.requirement && ctx.requirement.capacity_m3;
  const months = ctx.requirement && ctx.requirement.term_months;
  const km = distanceOf(store, ctx.location);
  const m = matching.matchStore(store.units, need);
  const range = matching.capacityRange(store.units);
  const far = pricing.isFar(km);
  // 本店给出的方案（FIX-01 R-10）：匹配仓 → 两仓组合 → 接近方案；列表与仓位推荐页取同一个
  const offer = m.best ? [m.best] : (m.combos[0] ? m.combos[0].units : m.nearOffer);
  const full = !!(m.best || m.combos[0]);
  const card = {
    id: store.id, photo: imageOf(store), name: store.name, district: store.district, area: store.area, community: store.community || '', address: store.address,
    km, kmText: fmt.kmText(km), accessHours: store.access_hours,
    hasStock: m.available.length > 0, state: m.state, listState: need > 0 ? (full ? 'matched' : m.nearOffer ? 'near' : 'none') : 'browse',
    fromPrice: pricing.storeFromCubic(m.available), // 门店「¥X/m³/月起」
    rangeText: range ? (range.min === range.max ? fmt.pretty(range.min) : fmt.pretty(range.min) + '–' + fmt.pretty(range.max)) + 'm³' : '',
    freeTransportTag: far ? T.card.freeTransport : '',
    operating: store.operating_tag || (m.available.some(pricing.isSpecial) ? T.price.special : ''),
    row: null, larger: null, nearText: '', moreText: '', compactText: '', emptyText: ''
  };
  if (offer) {
    card.offerIds = offer.map((u) => u.id);
    card.row = line(offer, months, ctx.loggedIn);
    let more = m.best ? m.others : 0;
    card.nearText = matching.fit(sumVol(offer), need).text || ''; // 比需求略小（10% 以内，仍算匹配）或接近（10%–20%）时写明差额
    if (!full) { // 接近：按钮进门店看仓位
      card.row.cta = T.cta.viewUnits; card.row.secondary = true;
      more = offer.length > 1 ? 0 : m.available.filter((u) => matching.fit(u.volume, need).state === 'near').length - 1;
    }
    if (more > 0) card.moreText = T.card.more(more);
    if (full) card.larger = largerLine(m.available, offer, card.row, need, ctx, false);
    card.compactText = card.row.volText + (card.row.rentTotal !== undefined ? ' · ' + fmt.termText(months) + ' ' + pricing.yuan(card.row.rentTotal) : '') + (card.nearText ? ' · ' + card.nearText : '');
  } else if (need > 0) card.emptyText = T.card.noMatch;
  else if (!card.hasStock) card.emptyText = T.card.noStock;
  // 「特价仓」标签按所展示的仓位判断：有需求看展示的那一行，无需求看本店可租仓位
  card.promo = card.row ? card.row.special : !!card.operating && card.operating === T.price.special;
  // 免费运输标签：展示的是特价仓时不出（特价仓不参与免费运输，规则配置表 §2，A-13）
  const freeTag = far && !card.promo;
  card.freeTransportTag = freeTag ? T.card.freeTransport : '';
  card.tags = storeTags(store, 3, card.promo, freeTag);
  card.tagsDetail = storeTags(store, 3, card.promo, false); // 门店详情不出免费运输标签（FIX-01 R-16）
  card.lowText = lowText(store.units);
  card.tagsCompact = storeTags(store, 2, card.promo, freeTag).slice(0, 2);
  card.locText = card.kmText ? card.kmText + ' · ' + store.district : store.district + (store.community ? ' · ' + store.community : '');
  return card;
}

/**
 * 冻结稿 runtime/recommendation-policy.js 的排序：最近的排第一；第二位在 3 → 5 → 10km 半径内找比第一位更便宜的，
 * 没有就取下一个最近的；其余按距离。距离不全（无门店城市等）时保持传入顺序，第二位取最便宜的。
 * o: { distOf, costOf, idOf }。排序与显示用同一个距离值。
 */
function rank(rows, o) {
  const dist = (r) => num(o.distOf(r));
  const cost = (r) => { const v = Number(o.costOf(r)); return Number.isFinite(v) && v >= 0 ? v : Infinity; };
  const id = (r) => String(o.idOf(r));
  const reliable = rows.length > 0 && rows.every((r) => dist(r) !== null);
  const ordered = reliable ? rows.slice().sort((a, b) => dist(a) - dist(b) || id(a).localeCompare(id(b))) : rows.slice();
  if (ordered.length < 2) return { items: ordered, distanceRanked: reliable, cheaperSecond: false };
  const first = ordered[0], rest = ordered.slice(1), base = cost(first);
  const byCost = (a, b) => cost(a) - cost(b) || (reliable ? dist(a) - dist(b) : 0) || id(a).localeCompare(id(b));
  let second = null;
  if (reliable && Number.isFinite(base)) {
    for (let i = 0; i < CF.recommend.cheaperRadiiKm.length && !second; i++) {
      const cheaper = rest.filter((r) => dist(r) <= CF.recommend.cheaperRadiiKm[i] && cost(r) < base);
      if (cheaper.length) second = cheaper.sort(byCost)[0];
    }
  }
  const cheaperSecond = !!second || (!reliable && rest.length > 0);
  if (!second) second = reliable ? rest.slice().sort((a, b) => dist(a) - dist(b) || byCost(a, b))[0] : rest.slice().sort(byCost)[0];
  return { items: [first, second].concat(rest.filter((r) => r !== second)), distanceRanked: reliable, cheaperSecond: cheaperSecond && cost(second) < base };
}

// 旧的简单排序（有匹配 → 距离 → 起价），保留给外部调用；列表与推荐现在走 rank。
function sortCards(cards, hasNeed) {
  const g = (c) => (hasNeed ? (c.state === 'matched' ? 0 : c.state === 'combo' ? 1 : c.state === 'near' ? 2 : 3) : (c.hasStock ? 0 : 1));
  const inf = (v) => (v === null || v === undefined ? Infinity : v);
  return cards.slice().sort((a, b) => g(a) - g(b) || inf(a.km) - inf(b.km) || inf(a.fromPrice) - inf(b.fromPrice) || String(a.id).localeCompare(String(b.id)));
}

// 用仓位置是区域 / 商圈 / 门店时的范围。门店：看它所在的区域，并把它排在最前（本轮自定，待确认）。
function scopeOf(location, stores) {
  const loc = location || {};
  if (loc.kind === 'district' && loc.label) return { text: loc.label, has: (s) => s.district === loc.label, pin: '' };
  if (loc.kind === 'area' && loc.label) return { text: loc.label, has: (s) => s.area === loc.label, pin: '' };
  if (loc.kind === 'store' && loc.label) {
    const hit = (stores || []).find((s) => s.name === loc.label || s.id === loc.storeId);
    if (hit) return { text: hit.district, has: (s) => s.district === hit.district, pin: hit.id };
  }
  return null;
}
function advisorFor(capacityM3, rentTotal) {
  if (!pricing.advisorNeeded(capacityM3, rentTotal)) return null;
  return pricing.bigDeal(capacityM3, rentTotal)
    ? { title: T.advisor.big.title, sub: T.advisor.big.sub() }
    : { title: T.advisor.normal.title, sub: T.advisor.normal.sub };
}
// 需求条：按面积填的写「6㎡ · 约15m³」（交接 v1.0 §4.3-4，A-11）
const demandLine = (r) => (r.input_unit === 'm2' && Number(r.input_value) > 0 ? '' : '约 ') + req.demandText(r) + ' · 租 ' + fmt.termText(r.term_months);

/**
 * 门店列表。ctx: { requirement, location, loggedIn }
 * filter: { sort: 'recommended'|'distance'|'price', maxKm, services: [], promo, freeTransport }
 * 返回 { mode: 'browse'|'demand'|'sales', cards, total, demandText, advisor, noMatch, far, scopeText, filtered }
 * 有需求时全部营业门店都在列表里：有匹配 → 接近 → 无匹配，组内保持排序（冻结稿 w1-render.js s01Stores）。
 */
function buildList(stores, ctx, filter) {
  const f = Object.assign({ sort: 'recommended', maxKm: null, services: [], promo: false, freeTransport: false }, filter || {});
  const r = ctx.requirement;
  const hasNeed = !!(r && r.capacity_m3 > 0);
  const filtered = f.sort !== 'recommended' || f.maxKm !== null || f.services.length > 0 || !!f.promo || !!f.freeTransport;
  if (hasNeed && matching.salesOnly(r.capacity_m3)) return { mode: 'sales', cards: [], demandText: demandLine(r), advisor: null, total: 0, noMatch: false, far: false, scopeText: '', filtered };
  const scope = scopeOf(ctx.location, stores);
  const byId = {}; stores.forEach((s) => { byId[s.id] = s; });
  const all = stores.map((s) => storeCard(s, ctx));
  // 用仓位置是定位点、5km 内没有营业门店（D-128）：按全部营业门店判断，与筛选无关
  const loc = ctx.location || {};
  const far = loc.kind === 'point' && all.length > 0 && all.every((c) => c.km !== null && c.km >= C.matching.nearbyRadiusKm);
  let cards = scope ? all.filter((c) => scope.has(byId[c.id])) : all;
  if (f.services.length) cards = cards.filter((c) => f.services.every((v) => (byId[c.id].tags || []).indexOf(v) >= 0));
  if (f.maxKm !== null) cards = cards.filter((c) => c.km !== null && c.km <= Number(f.maxKm));
  if (f.promo) cards = cards.filter((c) => c.promo || c.operating === T.price.special);
  if (f.freeTransport) cards = cards.filter((c) => pricing.isFar(c.km)); // 只留 5km 及以上的门店（D-173）
  // 排序入参与显示同一个数：无需求用门店「/m³/月起」，有需求用所展示仓位在所选租期下的月租
  const costs = {};
  cards.forEach((c) => {
    if (!hasNeed) { costs[c.id] = c.fromPrice === null ? Infinity : c.fromPrice; return; }
    const us = (c.offerIds || []).map((id) => byId[c.id].units.find((u) => u.id === id)).filter(Boolean);
    costs[c.id] = us.length ? monthlyAt(us, r.term_months) : Infinity;
  });
  const o = { distOf: (c) => c.km, costOf: (c) => costs[c.id], idOf: (c) => c.id };
  const inf = (v) => (v === null || v === undefined ? Infinity : v);
  if (f.sort === 'distance') cards = cards.slice().sort((a, b) => inf(a.km) - inf(b.km) || String(a.id).localeCompare(String(b.id)));
  else if (f.sort === 'price') cards = cards.slice().sort((a, b) => costs[a.id] - costs[b.id] || inf(a.km) - inf(b.km) || String(a.id).localeCompare(String(b.id)));
  else {
    const eligible = cards.filter((c) => (hasNeed ? c.row : c.hasStock)), rest = cards.filter((c) => !(hasNeed ? c.row : c.hasStock));
    cards = rank(eligible, o).items.concat(rest);
  }
  if (hasNeed) { const g = { matched: 0, near: 1, none: 2 }; cards = cards.map((c, i) => [c, i]).sort((a, b) => g[a[0].listState] - g[b[0].listState] || a[1] - b[1]).map((x) => x[0]); }
  if (scope && scope.pin) cards = cards.filter((c) => c.id === scope.pin).concat(cards.filter((c) => c.id !== scope.pin));
  if (far) cards = cards.slice().sort((a, b) => inf(a.km) - inf(b.km)); // 兜底：列最近的几家
  const noMatch = hasNeed ? !cards.some((c) => c.row) : cards.length === 0;
  // 顾问卡（D-97、D-182）：按需求容量与首位匹配仓位的整期租金判定；未登录只按容量（不间接透露金额档位）
  let advisor = null;
  if (hasNeed && !noMatch) { const c0 = cards.find((c) => c.listState === 'matched'); advisor = advisorFor(r.capacity_m3, (c0 && c0.row.rentTotal) || 0); }
  // 首位门店离得远（附近的门店没有合适仓位）时写一句「已扩大范围」（A-22），与仓位推荐页同一句
  const c1 = cards[0];
  const expanded = hasNeed && !noMatch && !far && f.sort === 'recommended' && !!c1 && !!c1.row && c1.km !== null && c1.km > CF.list.expandedKm;
  return { mode: hasNeed ? 'demand' : 'browse', cards, demandText: hasNeed ? demandLine(r) : '', advisor, total: cards.length, noMatch, far, expanded, large: hasNeed && matching.largeCapacity(r.capacity_m3), scopeText: scope ? scope.text : '', filtered };
}

// 列表里可选的服务标签（按出现的门店数排序）
function serviceOptions(stores) {
  const m = {}; (stores || []).forEach((s) => (s.tags || []).forEach((t) => { m[t] = (m[t] || 0) + 1; }));
  return Object.keys(m).sort((a, b) => m[b] - m[a] || a.localeCompare(b)).slice(0, CF.list.serviceOptionsMax);
}

/**
 * 首页推荐（冻结稿 runtime/home-recommend-policy.js）：最近 → 半径内更低价 → 运营位（特价仓优先）。
 * 只取有可租仓位的门店（没有仓位就没有起价可写）。距离不全时保持数据顺序取前两家。
 */
function buildHomeRecommend(stores, ctx) {
  const cards = stores.map((s) => storeCard(s, { requirement: null, location: ctx.location, loggedIn: ctx.loggedIn })).filter((c) => c.hasStock);
  let firstTwo;
  if (cards.length && cards.every((c) => c.km !== null)) {
    const sorted = cards.slice().sort((a, b) => a.km - b.km || String(a.id).localeCompare(String(b.id)));
    const first = sorted[0], rest = sorted.slice(1);
    let second = null;
    for (let i = 0; i < CF.recommend.cheaperRadiiKm.length && !second; i++) {
      const cheaper = rest.filter((c) => c.km <= CF.recommend.cheaperRadiiKm[i] && c.fromPrice !== null && c.fromPrice < first.fromPrice).sort((a, b) => a.fromPrice - b.fromPrice || a.km - b.km);
      if (cheaper.length) second = cheaper[0];
    }
    firstTwo = [first, second || rest[0]].filter(Boolean);
  } else firstTwo = cards.slice(0, 2);
  const rest = cards.filter((c) => firstTwo.indexOf(c) < 0);
  const op = rest.find((c) => c.operating === CF.recommend.operatingTag) || rest.find((c) => c.operating) || rest[0];
  const byId = {}; stores.forEach((s) => { byId[s.id] = s; });
  return firstTwo.concat(op ? [op] : []).slice(0, CF.recommend.homeCards).map((c) => Object.assign({}, c, { tags: storeTags(byId[c.id], 2, c.promo, false) }));
}

// 一家门店给出的方案：匹配仓 → 两仓组合 → 最接近的方案（接近的单仓或组合）。与门店列表的 storeCard 取同一个
function offerOf(store, need) {
  const m = matching.matchStore(store.units, need);
  const units = m.best ? [m.best] : (m.combos[0] ? m.combos[0].units : m.nearOffer);
  return units ? { store, units, volume: sumVol(units), combo: units.length > 1, m } : null;
}
function candidates(stores, ctx, excludeId) {
  const r = ctx.requirement, need = Number(r.capacity_m3), months = r.term_months;
  const rows = stores.filter((s) => s.id !== excludeId).map((s) => offerOf(s, need)).filter(Boolean);
  rows.forEach((x) => { x.cost = monthlyAt(x.units, months); x.km = distanceOf(x.store, ctx.location); });
  rows.sort((a, b) => (a.volume - need) - (b.volume - need) || a.cost - b.cost || String(a.store.id).localeCompare(String(b.store.id)));
  const ranked = rank(rows, { distOf: (x) => x.km, costOf: (x) => x.cost, idOf: (x) => x.store.id });
  ranked.items.forEach((x,i) => { x.rankTag = i === 0 && ranked.distanceRanked ? T.card.first : i === 1 && ranked.cheaperSecond ? T.card.second : ''; });
  return ranked.items;
}

/**
 * 仓位推荐（冻结稿 w2-render.js s5CandidateList / s5MatchState）。
 * 返回 { mode: 'sales'|'matched'|'combo'|'expanded'|'near'|'none', sub, cards, total, advisor }；
 * 每张卡 lines = [方案行, 下一档更大的可租仓]。
 */
function buildMatch(stores, ctx) {
  const r = ctx.requirement || {}, need = Number(r.capacity_m3), months = r.term_months;
  if (!(need > 0)) return { mode: 'none', sub: '', cards: [], total: 0, advisor: null };
  if (matching.salesOnly(need)) return { mode: 'sales', sub: '', cards: [], total: 0, advisor: null };
  const scope = scopeOf(ctx.location, stores), prefer = (s) => !!scope && scope.has(s);
  const hasLong = !!(r.source === 'items' && r.est && r.est.long && r.est.long.length);
  let rows = candidates(stores, ctx), mode;
  if (rows.length) {
    if (scope) { // 用仓位置选了区域 / 商圈：先推本范围内的，再接其余
      const local = rows.filter((x) => prefer(x.store));
      if (local.length) rows = rank(local, { distOf: (x) => x.km, costOf: (x) => x.cost, idOf: (x) => x.store.id }).items.concat(rows.filter((x) => !prefer(x.store)));
      if (scope.pin) rows = rows.filter((x) => x.store.id === scope.pin).concat(rows.filter((x) => x.store.id !== scope.pin));
    }
    const expanded = rows.every((x) => x.km !== null && x.km > CF.recommend.expandedKm);
    const isNear = (x) => matching.fit(x.volume, need).state === 'near';
    if (rows.every(isNear)) { // 全城只有接近方案：本范围优先，其次容量大的、近的、便宜的在前
      const inf = (v) => (v === null ? Infinity : v);
      rows.sort((a, b) => (prefer(b.store) ? 1 : 0) - (prefer(a.store) ? 1 : 0) || b.volume - a.volume || inf(a.km) - inf(b.km) || a.cost - b.cost);
      mode = 'near';
    } else {
      rows.sort((a, b) => (isNear(a) ? 1 : 0) - (isNear(b) ? 1 : 0));
      mode = rows[0].combo ? 'combo' : expanded ? 'expanded' : 'matched';
    }
  } else mode = 'none';
  const top = rows.slice(0, CF.recommend.matchCards);
  const cards = top.map((x, i) => {
    const avail = x.store.units.filter(matching.isAvailable).sort((a, b) => a.volume - b.volume);
    const first = line(x.units, months, ctx.loggedIn);
    const near = matching.fit(x.volume, need);
    if (near.text) first.nearText = near.text; // 略小（仍算匹配）与接近都写明差额
    if (near.state === 'near') first.secondary = true;
    first.tier = ''; first.usage = ''; first.area = ''; first.reason = '';
    const next = largerLine(avail, x.units, first, need, ctx, hasLong);
    if (next) { next.tier = ''; next.usage = ''; next.area = ''; next.reason = ''; }
    const lines = next ? [first, next] : [first];
    if (next) next.secondary = true;
    const shown = {}; lines.forEach((l) => l.id.split(',').forEach((id) => { shown[id] = 1; }));
    const restCount = avail.filter((u) => !shown[u.id]).length;
    const far = pricing.isFar(x.km), promo = first.special;
    return {
      id: x.store.id, photo: imageOf(x.store), name: x.store.name, address: x.store.address, km: x.km, kmText: fmt.kmText(x.km),
      rankTag: x.rankTag || '', tags: storeTags(x.store, 3, promo, far && !promo).slice(0, 2), lowText: lowText(x.store.units),
      lines, moreText: restCount > 0 ? T.card.more(restCount) : T.cta.viewStore
    };
  });
  const rent0 = top[0] && cards[0].lines[0].rentTotal;
  const advisor = mode === 'none' ? (advisorFor(need, 0) || { title: T.advisor.normal.title, sub: T.advisor.normal.sub }) : advisorFor(need, rent0 || 0);
  const sub = mode === 'near' ? T.match.subNear(fmt.pretty(need)) : mode === 'expanded' ? T.match.subExpanded : mode === 'combo' ? T.match.subCombo : '';
  return { mode, sub, cards, total: rows.length, advisor };
}

// 门店详情里「其他匹配门店和仓位」（冻结稿 w2-render.js alternatives）
function buildAlternatives(stores, ctx, excludeId) {
  if (!ctx.requirement || !(ctx.requirement.capacity_m3 > 0) || matching.salesOnly(ctx.requirement.capacity_m3)) return [];
  return candidates(stores, ctx, excludeId).slice(0, CF.detail.alternativesMax).map((x) => ({ id: x.store.id, name: x.store.name, text: fmt.pretty(x.volume) + 'm³' + (x.combo ? T.detail.altCombo : '') + (fmt.kmText(x.km) ? ' · ' + fmt.kmText(x.km) : '') }));
}

/**
 * 门店详情（冻结稿 w2-render.js renderS02）。opts: { category: 'all'|'mini'|'small'|'medium'|'large' }
 * situation: soldout | browse | sales | matched | combo | near | nomatch
 */
function buildStoreDetail(store, ctx, opts) {
  const cat = (opts && opts.category) || 'all';
  const card = storeCard(store, ctx);
  const r = ctx.requirement, need = r && r.capacity_m3 > 0 ? Number(r.capacity_m3) : 0, months = need ? r.term_months : null;
  const allAvail = store.units.filter(matching.isAvailable).sort((a, b) => a.volume - b.volume);
  const inCat = (u) => cat === 'all' || categoryOf(u.volume) === cat;
  const avail = allAvail.filter(inCat);
  const m = matching.matchStore(store.units, need);
    const situation = !allAvail.length ? 'soldout' : !need ? 'browse' : matching.salesOnly(need) ? 'sales' : m.best ? 'matched' : m.combos.length ? 'combo' : m.nearOffer ? 'near' : 'nomatch';
  const st = (u) => matching.fit(u.volume, need).state;
  const mk = (u) => Object.assign(line([u], months, ctx.loggedIn), { fit: st(u), favId: u.id });
  // 匹配区间内的仓位（D-230、R-11）：比需求略小的写明差额，仍可直接下单
  const matched = (need ? avail.filter((u) => st(u) === 'matched') : avail).map((u) => Object.assign(mk(u), need ? { nearText: matching.fit(u.volume, need).text || '' } : {}));
  // 超过容量上限的仓位：不进推荐，单列一组，仍可下单
  const over = need ? avail.filter((u) => st(u) === 'over').map((u) => Object.assign(mk(u), { secondary: true })) : [];
  const others = need ? avail.filter((u) => st(u) === 'near' || st(u) === 'small').sort((a, b) => b.volume - a.volume) : [];
  // 接近（差额不超过 20%）可直接下单并写明差额；更小的给「按 X m³ 重新匹配」
  const near = others.filter((u) => matching.fit(u.volume, need).state === 'near').map((u) => Object.assign(mk(u), { nearText: matching.fit(u.volume, need).text, secondary: true }));
  const smaller = others.filter((u) => matching.fit(u.volume, need).state !== 'near').map((u) => Object.assign(mk(u), { cta: T.detail.rematch(fmt.pretty(u.volume)), act: 'rematch', volume: u.volume, secondary: true }));
  const sold = store.units.filter((u) => !matching.isAvailable(u) && inCat(u)).slice(0, CF.detail.soldFoldMax).map((u) => ({ id: u.id, name: fmt.unitName(u), tier: fmt.tierLabel(u), dims: fmt.dimsText(u), area: fmt.areaText(u), usage: usageText(u.volume), thumb: media.unitThumb(u) }));
  const self = situation === 'browse' || situation === 'matched' || situation === 'combo' || situation === 'near'; // 交顾问 / 无可租 / 无匹配三种只出空态，不列仓位
  // 组合方案：合计落在匹配区间的；一个都没有时，退而列出合计只够「接近」的组合并写明差额
  const comboList = need && self && cat === 'all' ? (m.combos.length ? m.combos : m.nearCombos) : [];
  const comboMode = !comboList.length ? '' : !m.best ? 'open' : need > CF.detail.comboAlwaysFromM3 ? 'fold' : '';
  const combos = comboMode ? comboList.map((x) => { const l = line(x.units, months, ctx.loggedIn); return Object.assign(l, { tag: T.detail.comboTag(x.units.length), sub: T.detail.comboSub(x.units.map((u) => u.code).join(' + ')), nearText: matching.fit(x.volume, need).text || '' }); }) : [];
  // 顾问卡：一页一次；30m³ 及以上主操作已是「提交给顾问」，不再重复
  const chosen = m.best ? [m.best] : (m.combos[0] ? m.combos[0].units : null);
  const rent = chosen && ctx.loggedIn && pricing.isTerm(months) ? pricing.quote(chosen, months).rent_total : 0;
  const lonely = !!need && self && !m.best && !m.combos.length;
  const advisor = situation === 'sales' || !need ? null : (lonely || situation === 'nomatch' ? (advisorFor(need, rent) || { title: T.advisor.normal.title, sub: T.advisor.normal.sub }) : advisorFor(need, rent));
  return {
    card, situation, category: cat,
    rows: self ? matched : [], near: self ? near : [], smaller: self ? smaller : [], over: situation === 'sales' ? [] : over, sold, combos, comboMode,
    noSingleText: need && self && !matched.length && avail.length && comboMode !== 'open' && situation !== 'nomatch' ? T.detail.noSingle(fmt.pretty(need)) : '',
    catEmpty: self && !avail.length && !combos.length,
    showLow: situation !== 'nomatch' && situation !== 'soldout', // 无匹配时不出「仅剩 N 个可租」，免得和空态打架（A-21）
    showAlternatives: situation === 'soldout' || lonely, advisor,
    headPrice: !need && card.fromPrice ? card.fromPrice : null
  };
}

// 首页版式跟随订单任务卡的主卡阶段（冻结稿 w1-render.js WEAK_TASK / NO_REC）：
// 服务中的订单在前时双入口变弱、推荐不出；待支付 / 支付失败时推荐收起可展开。key 是 mk-task-card 主卡的阶段名，空 = 没有主卡。
// 主卡本身与待办条带（含「找仓进度」一行）由交易域的 mk-task-card 渲染，这里只决定首页其余区块的显隐。
const HOME_WEAK = { pending: 1, payment_failed: 1, identity: 1, upcoming: 1, renewal: 1, renewal_pending: 1, expiring: 1, active: 1 };
const HOME_NO_REC = { identity: 1, upcoming: 1, renewal: 1, renewal_pending: 1, expiring: 1, active: 1 };
const HOME_COLLAPSE = { pending: 1, payment_failed: 1 };
function layoutOf(key) { return { hasMain: !!key, weak: !!HOME_WEAK[key], noRec: !!HOME_NO_REC[key], collapse: !!HOME_COLLAPSE[key] }; }
// 取不到任务卡组件时的兜底：按订单阶段粗略推一个主卡阶段（押金 / 退仓 / 到期 ＞ 租用中 ＞ 待起租 ＞ 待支付 ＞ 已超时 / 已取消）
function homeLayout(orders, nowMs) {
  const S = order.STAGE, now = nowMs || Date.now();
  let best = null;
  (orders || []).forEach((o) => {
    let g = null;
    if (o.stage === S.EXITING) g = [0, 'returning'];
    else if (o.stage === S.OVERDUE) g = [0, 'expired_lease'];
    else if (o.stage === S.EXPIRING) g = [0.4, 'expiring'];
    else if (o.stage === S.ACTIVE) g = [0.5, 'active'];
    else if (o.stage === S.PAID) g = [1, o.identity_status && o.identity_status !== 'verified' ? 'identity' : 'upcoming'];
    else if (o.stage === S.FAILED) g = [2, 'payment_failed'];
    else if (o.stage === S.PENDING) g = o.pay && o.pay.expires_at && order.isExpired(o.pay.expires_at, now) ? [6, 'expired'] : [2, 'pending'];
    else if (o.stage === S.EXPIRED) g = [6, 'expired'];
    else if (o.stage === S.CANCELLED) g = [6, 'cancelled'];
    if (g && (!best || g[0] < best[0])) best = g;
  });
  return layoutOf(best ? best[1] : '');
}

module.exports = { distanceOf, usageText, categoryOf, storeTags, line, unitRow, storeCard, rank, sortCards, scopeOf, buildList, serviceOptions, buildHomeRecommend, buildMatch, buildAlternatives, buildStoreDetail, layoutOf, homeLayout, advisorFor };
