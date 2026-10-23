const fs = require('fs');
const path = require('path');

const prototypeRoot = path.resolve(__dirname, '..', 'prototype');
const pages = [
  ['Estimator', 'space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html'],
  ['S01', 'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html'],
  ['S02', 'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html'],
  ['U01', 'mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html'],
  ['B2B01', 'mini_storage_business_b2b01_r113_Visual_V2_7_4.html'],
  ['RN01', 'mini_storage_renew_rn01_v2_7_4.html'],
];
const terms = [1, 3, 6, 12, 24, 36, 60];
let failures = 0;

function check(ok, message) {
  if (ok) console.log(`PASS ${message}`);
  else {
    failures += 1;
    console.error(`FAIL ${message}`);
  }
}

for (const [name, file] of pages) {
  const html = fs.readFileSync(path.join(prototypeRoot, file), 'utf8');
  for (const term of terms) {
    const declared = new RegExp(`(?:data-(?:term|quick|m|term-quick)=["']${term}["']|quick\\s*=\\s*\\[[^\\]]*\\b${term}\\b)`).test(html);
    check(declared, `${name}: includes ${term}-month shortcut`);
  }
  const numberInputs = [...html.matchAll(/<input\b[^>]*type=["']number["'][^>]*>/gi)].map(match => match[0]);
  check(numberInputs.some(input => /min=["']1["']/.test(input) && /max=["']60["']/.test(input)), `${name}: direct 1–60 month numeric input`);
  check(/(?:termMinus|data-term-step=["']-1["'])/.test(html), `${name}: decrement control`);
  check(/(?:termPlus|data-term-step=["']1["'])/.test(html), `${name}: increment control`);
  check(/oninput/.test(html) && /onchange/.test(html), `${name}: live input and committed-value handlers`);
  check(/其他租期/.test(html), `${name}: outer custom-term tool retained`);

  {
    const discountLabels = ['7.5折', '7折', '6.5折', '6折', '5.5折'];
    if(name!=='RN01') for (const label of discountLabels) check(html.includes(label), `${name}: term selector shows ${label}`);
    if(name==='RN01') check(html.includes('续租为单独报价')&&!discountLabels.some(label=>html.includes(`<small>${label}</small>`)), 'RN01: separately quoted; no fixed discount badge claims');
  }
  if (name === 'S01') {
    const estimatorHtml = fs.readFileSync(path.join(prototypeRoot, 'space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html'), 'utf8');
    check(!/nearbyNoMatchToggle|inventoryShortageToggle|演示：近距离无匹配|演示：整体库存不足/.test(estimatorHtml), 'Estimator: distance/inventory demo controls removed');
    check(!/稍远于30分钟偏好/.test(html) && !/距离较远/.test(html), 'S01: no distance-too-far recovery label in store cards');
  }
}

if (failures) {
  console.error(`\n${failures} term-selector consistency check(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${pages.length} term selectors passed consistency checks.`);
