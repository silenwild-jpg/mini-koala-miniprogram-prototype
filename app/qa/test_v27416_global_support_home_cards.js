const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.resolve(__dirname,'..');
const prototype=path.join(root,'prototype');
const data=require(path.join(root,'data','mini_koala_data.js'));
const read=name=>fs.readFileSync(path.join(prototype,name),'utf8');

assert(data.getLegacyUnits('jianguo').every(unit=>!/[，,、]/.test(String(unit.id))),'legacy unit ids must display one representative unit number');
const support=read('mini_storage_global_support_v274.js');
assert(support.includes('4000358805'));
assert(support.includes('openCustomerServiceChat'));
const htmlFiles=fs.readdirSync(prototype).filter(name=>name.endsWith('.html'));
assert(htmlFiles.every(name=>read(name).includes('mini_storage_global_support_v274.js')),'all HTML pages must carry the global support float');

const estimator=read('space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html');
assert(!estimator.includes('1–60个月任意整数月'));
assert(estimator.includes("const shortDistance=x.dist.replace(/^距用仓位置/,'');"));
assert(estimator.includes('class="rplan-name-line"'));
assert(estimator.includes('匹配仓位 ${x.matchedCount}个')||estimator.includes('当前无匹配仓位'));
assert(!estimator.includes("x.dist} · ${x.matchedCount?'需求范围内':'最接近当前需求'}"));

const s01=read('mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html');
assert(s01.includes('v274-s01-price-color-global'));
assert(s01.includes('color:var(--v274-orange,#E77A3A)!important'));

const home=read('mini_storage_home_H01_Visual_V2_7_4_SSOT.html');
assert(home.includes("homeParams.get('loc')||'unknown'"));
assert(home.includes("profile.city==='北京市'"));
assert(home.includes('HOME_PRICE_RADIUS_KM=5'));
assert(home.includes('pickHomeRecommendations'));
assert(home.includes("a.route.km-b.route.km"));
assert(home.includes("a.unitPrice-b.unitPrice"));
assert(home.includes('HOME_STORE_IDS.forEach(id=>'));
assert(home.includes("card.querySelectorAll('.route-info[data-store-id]')"));

console.log('PASS V2.7.4.16 baseline + V2.7.4.17 override: global support, representative display number, unlocated home entry, and role-based Beijing cards');
