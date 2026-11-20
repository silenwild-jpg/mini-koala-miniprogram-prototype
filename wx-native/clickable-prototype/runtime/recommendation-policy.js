(function (root) {
  'use strict';
  // Shared demo selection order. Distance claims are only valid with an explicitly verified dataset.
  function rank(input, options = {}) {
    const rows = Array.isArray(input) ? input.slice() : [];
    const storeOf = options.storeOf || (row => row.store || row);
    const costOf = options.costOf || (() => Infinity);
    const dist = row => {
      const value = storeOf(row)?.distance;
      return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
    };
    const cost = row => {
      const value = Number(costOf(row));
      return Number.isFinite(value) && value >= 0 ? value : Infinity;
    };
    const reliableDistance = options.distanceVerified === true && rows.length > 0 &&
      rows.every(row => dist(row) !== null);
    const ordered = reliableDistance ? rows.sort((a, b) =>
      dist(a) - dist(b) || String(storeOf(a).id).localeCompare(String(storeOf(b).id))) : rows;
    if (ordered.length < 2) return {items: ordered, distanceRanked: reliableDistance, cheaperSecond: false};
    const first = ordered[0], rest = ordered.slice(1), baseCost = cost(first);
    const byCost = (a, b) => cost(a) - cost(b) ||
      (reliableDistance ? dist(a) - dist(b) : 0) ||
      String(storeOf(a).id).localeCompare(String(storeOf(b).id));
    let second = null;
    if (reliableDistance && Number.isFinite(baseCost)) {
      // Expand 3 km -> 5 km -> 10 km -> whole current city if no lower-price option exists.
      for (const radius of [3, 5, 10]) {
        const cheaper = rest.filter(row => dist(row) <= radius && cost(row) < baseCost);
        if (cheaper.length) { second = cheaper.sort(byCost)[0]; break; }
      }
    }
    if (!second) second = reliableDistance ? rest.slice().sort((a,b)=>dist(a)-dist(b)||byCost(a,b))[0] : rest.slice().sort(byCost)[0];
    const tail = rest.filter(row => row !== second);
    return {items: [first, second, ...tail], distanceRanked: reliableDistance,
      cheaperSecond: cost(second) < baseCost};
  }
  root.SIM_REC_POLICY = {rank};
  if (typeof module === 'object' && module.exports) module.exports = {rank};
})(typeof window === 'object' ? window : globalThis);
