const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.resolve(__dirname,'..');
const file=path.join(root,'prototype','space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html');
const html=fs.readFileSync(file,'utf8');

assert(html.includes('MINI_STORAGE_REQUIREMENT_RECOMMENDATION_V274.recommend'),'recommendation must use shared requirement matcher');
assert(html.includes('matchedCount:row.matchedCount'),'recommendation must carry real matched type count');
assert(!html.includes('符合需求仓位区间 ${sizeRange}'),'capacity interval sentence must be removed');
assert(html.includes('匹配仓位 ${x.matchedCount}个'),'recommendation must show non-zero matched warehouse count');
assert(html.includes('const totalMain=x.matchedCount>1'),'multi-match recommendation must use total-price /起 hierarchy');
assert(html.includes('const monthlyCopy=`月均约 ${window.MINI_KOALA_DATA.priceText(x.monthly)}/月'),'both recommendation cards show monthly average as secondary price');
assert(html.includes('white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important'),'recommendation address must stay on one line');

assert(html.includes('id="storeDistrictTag"'),'completed store list must expose the district tag');
assert(html.includes("$('#storeUnitListTitle').textContent=cfg.storeName;"));
assert(html.includes("$('#storeDistrictTag').textContent=cfg.district||'区域待确认';"));
assert(!html.includes('id="storeAddressLine"'),'completed store list must not render the detailed address');
assert(!html.includes("$('#storeAddressLine').textContent"),'completed store list must not bind the detailed address');
assert(html.includes('storeName:fact.profile.name,district:fact.profile.district'));

console.log('PASS V2.7.4.15: matched-range recommendation pricing and completed store-title hierarchy');
