const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const data = require(path.join(root, 'data', 'mini_koala_data.js'));
const pages = [
  'space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html',
  'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html',
  'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html',
  'mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html',
  'mini_storage_home_H01_Visual_V2_7_4_SSOT.html'
].map(file => path.join(root, 'prototype', file));

assert.strictEqual(data.stores.length, 126);
assert.strictEqual(data.options.length, 766);
assert.strictEqual(data.options.reduce((sum, option) => sum + option.available_count, 0), 1297);
assert(data.stores.every(store => store.size_unit === 'm³'));
assert(data.options.every(option => option.size_unit === 'm³'));
assert(data.options.every(option => option.has_zero_price === false && option.display_price_min > 0));
assert(data.options.every(option => option.simulated_floor_area_sqm > 0));
assert.strictEqual(data.areaConversionAssumedHeightM, 2.5);
assert(data.options.every(option => option.length_m > 0 && option.width_m > 0 && option.height_m === 2.5));
assert(data.options.every(option => data.dimensionText(option).includes('2.5m')));
assert(!data.areaText(data.options[0].size).includes('模拟'));
assert(Number.isInteger(data.unitPricePerM3(data.options[0])));
assert(data.options.every(option => data.priceText(option.price_min_raw) !== '¥0'));

for (const file of pages) {
  const source = fs.readFileSync(file, 'utf8');
  assert(source.includes('../data/mini_koala_data.js'), `${path.basename(file)} must load the generated source`);
  assert(!source.includes('8个仓位') && !source.includes('8个可租'), `${path.basename(file)} has a fixed 8-unit fact`);
  assert(!source.includes('0.8m³～12m³') && !source.includes('0.8–12m³'), `${path.basename(file)} has a fixed capacity range`);
  const scripts = [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1]).filter(script => script.trim());
  scripts.forEach(script => new Function(script));
}

const s02 = fs.readFileSync(pages[2], 'utf8');
const u01 = fs.readFileSync(pages[3], 'utf8');
assert(s02.includes('getLegacyUnits(storeId)'));
assert(s02.includes('sizeText(unit.v)'));
assert(s02.includes('areaText(unit.v)'));
assert(u01.includes('getLegacyUnits(storeId)'));
assert(u01.includes('priceText(v)'));
assert(u01.includes('areaText(u.v)'));
assert(u01.includes('u.length_m') && u01.includes('u.width_m') && u01.includes('u.height_m'));

console.log('PASS store data integration: visible counts, m³ semantics, 2.5m-derived area/dimensions, integer unit price, zero-price exclusion, page wiring, and inline syntax');
