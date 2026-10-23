const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'prototype');
const pages = [
  ['AI02', 'mini_storage_ai_result_ai02_v1_demo_patch.html'],
  ['S01', 'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html'],
  ['S02', 'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html'],
  ['U01', 'mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html'],
];
let failures = 0;
function check(ok, message) {
  if (ok) console.log(`PASS ${message}`);
  else { failures += 1; console.error(`FAIL ${message}`); }
}

const helper = fs.readFileSync(path.join(root, 'mini_storage_sales_share_v1.js'), 'utf8');
check(helper.includes('salesShare') && helper.includes('shareType') && helper.includes('shareId'), 'shared context helper defines share parameters');
check(helper.includes('sales-share-banner') && helper.includes('继续咨询'), 'shared context helper renders customer-facing banner');

for (const [name, file] of pages) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  check(html.includes('mini_storage_sales_share_v1.js'), `${name}: loads Sales Share helper`);
  check(html.includes('salesShare') || html.includes('MINI_STORAGE_SALES_SHARE'), `${name}: reads or propagates Sales Share context`);
}

const hub = fs.readFileSync(path.join(root, 'mini_storage_sales_share_demo.html'), 'utf8');
for (const type of ['estimate', 'stores', 'store', 'unit']) check(hub.includes(`shareType=${type}`), `share demo includes ${type} entry`);

const s01 = fs.readFileSync(path.join(root, pages[1][1]), 'utf8');
check(s01.includes('已为您展示当前更合适的可租方案'), 'S01 uses neutral recovery copy');
check(!s01.includes('低频存取更适合比较远一点的方案'), 'S01 does not force low-frequency distance framing');
check(/function distanceOverNote\(id\)\s*{\s*return '';\s*}/.test(s01), 'S01 suppresses repeated distance notes');

const s02 = fs.readFileSync(path.join(root, pages[2][1]), 'utf8');
check(s02.includes("searchMin>=30||searchKm>=20"), 'S02 uses a higher default distance threshold');
check(s02.includes('到店时间提示'), 'S02 uses neutral distance copy');

if (failures) process.exit(1);
console.log('All Sales Share Mode and distance-softening checks passed.');
