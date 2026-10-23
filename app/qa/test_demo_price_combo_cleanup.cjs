const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const prototype=path.resolve(__dirname,'../prototype');
const read=(file)=>fs.readFileSync(path.join(prototype,file),'utf8');
const u01=read('mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html');
const s02=read('mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html');
assert(u01.includes('u01-price-visual-demo-closure-v3'));
assert(u01.includes('body:has(#contractTotal) #termSection .term-price-combined .unified-price'));
for(const id of ['rentHeading','contractTotal','selectedTermPrice','initialPayable']){
  assert(u01.includes('#'+id),id+' style target missing');
  assert(u01.includes('id="'+id+'"'),id+' DOM missing');
}
assert(s02.includes('本店暂无合适的单仓，为您找到${combos.length}种组合方案'));
for(const phrase of ['组合总容量达标，不代表物品可以实际放入','费用不含需确认的组合押金与管理费','分仓摆放与门洞尺寸待核对','（待核对）</div>']){
 assert(!s02.includes(phrase),'old warning survives: '+phrase);
}
assert(s02.includes('physicalFit?.allocations?.some(a=>a.item_names?.length)'),'hide empty allocation card');
assert(s02.includes('fit_status:c.fitStatus')&&s02.includes('fit_allocations:c.physicalFit?.allocations||[]'),'fit advisory data kept');
assert(s02.includes('id="comboNearbyBtn"')&&s02.includes('S02_MULTI_UNIT_COMBO'),'combo and fallback not removed');
console.log('PASS demo price/combination copy closure');
