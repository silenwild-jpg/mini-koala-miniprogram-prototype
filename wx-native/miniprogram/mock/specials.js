// 固定种子分配：每个有可租库存的店1–3个九折仓位，跨次打开保持一致。
function hash(s) { let n = 2166136261; for (let i=0;i<s.length;i++) { n ^= s.charCodeAt(i); n = Math.imul(n,16777619); } return n >>> 0; }
function assign(units) {
  const groups = {};
  units.forEach(u => { (groups[u.store_id] || (groups[u.store_id] = [])).push(u); });
  Object.keys(groups).forEach(id => {
    const all = groups[id], avail = all.filter(u => u.status === 'available').sort((a,b) => hash(a.id + ':20261120') - hash(b.id + ':20261120') || a.id.localeCompare(b.id));
    const selected = avail.slice(0, Math.min(avail.length, 1 + hash(id + ':20261120') % 3));
    all.forEach(u => { u.special_month = selected.includes(u) ? Math.round(u.base_month * require('../core/config').pricing.specialFactor * 100) / 100 : null; });
  });
  return units;
}
module.exports = { assign };
