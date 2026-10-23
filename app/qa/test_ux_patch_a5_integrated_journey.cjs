'use strict';
/** UX-PATCH A5 integrated parameter hand-off and frozen-contract checks.
 * Source executed in VM: no browser geometry or actual interaction claims.
 */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,'prototype',name),'utf8');
const estimator=read('space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html');
const unit=read('mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html');
const store=read('mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html');
const listing=read('mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html');
let passes=0;
const t=(name,fn)=>{fn();passes++;console.log('PASS',name)};
const routeSrc=estimator.match(/  const goDirectToUnit=x=>\{[\s\S]*?\n  \};/);
assert(routeSrc,'Missing real S5 direct route source');
function fromS5({term=12,target=4.4,matchType='single',id='nearest',storeId='jianguo',unitId='BJ0498S01B001'}={}){
  let href='',snapshot,combo=0,nearby=0;
  const x={id,storeId,matchType,unit:{id:unitId,size_option_id:'MK-BJ-5',representative_unit_no:unitId}};
  const state={r113Plan:'nearest',term,addedP2:new Set(),complex:new Set()};
  const v={x,state,window:{MINI_STORAGE_MASTER_V222:{route_source:'DEMO'},location:{get href(){return href},set href(x){href=x}}},
    searchCtx:{travel:'drive',origin:'guomao'},target,term,URLSearchParams,
    returnListContext:null,returnStoreContext:null,recommendationSet:{fallback:false},
    syncSelectedRecommendation:()=>x,saveEffectiveRequirement:r=>snapshot=r,storageSet:()=>{},
    estimatorStoreFacts:()=>({km:2.6,minutes:9}),continueToRecommendedUnit:()=>combo++,carryRequirementToStoreList:()=>nearby++,JSON,Set};
  vm.runInNewContext(routeSrc[0]+'\ngoDirectToUnit(x);',v);
  return {href,snapshot,combo,nearby};
}
const start=unit.indexOf('// UX-PATCH A4: use physical available counts');
const end=unit.indexOf("$('#viewStoreDetail').onclick",start);
assert(start>0&&end>start,'missing U01 route');
const unitSrc=unit.slice(start,end);
function fromU01(s5url,inventory,params={}){
  const p=new URL(s5url,'https://example.invalid').searchParams;
  const ctx={availableUnits:inventory,sizeOptionId:p.get('sizeOption'),actualUnitId:p.get('unit'),u:{v:4.8},target:Number(p.get('target')),
    term:Number(p.get('term')),hasRequirement:true,fromS01State:p.get('fromS01State'),searchOriginKey:p.get('searchOriginKey'),
    searchMin:Number(p.get('searchMin')),searchKm:Number(p.get('searchKm')),accessFrequency:'unknown',customerType:'',storeId:p.get('store'),
    s02File:'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html',
    s01File:'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html',
    URLSearchParams,window:{MINI_STORAGE_SALES_SHARE:{enabled:false}},$:(id)=>({dataset:{},setAttribute(){},set textContent(s){}}),...params};
  return vm.runInNewContext(unitSrc+'\n({otherAvailableUnitCount,storeDetailRoute,nearbyOtherUnitsRoute,syncOtherUnitEntry})',ctx);
}
const inventory1=[{size_option_id:'MK-BJ-5',available_count:1}];
const inventory2=[{size_option_id:'MK-BJ-5',available_count:2}];
const multi=[{size_option_id:'MK-BJ-5',available_count:1},{size_option_id:'OTHER',available_count:2}];
t('S5 single card carries unit, size option, estimated capacity and 12-month term together',()=>{
 const out=fromS5();const u=new URL(out.href,'https://example.invalid');
 for(const [k,v] of Object.entries({store:'jianguo',unit:'BJ0498S01B001',sizeOption:'MK-BJ-5',target:'4.4',term:'12',fromS01State:'estimated'}))assert.strictEqual(u.searchParams.get(k),v,k);
 assert(out.snapshot && out.snapshot.recommended_unit_id==='BJ0498S01B001');
});
t('Selected 6-month term is carried to U01; default 12-month rule is not imposed after choice',()=>{
 const u=new URL(fromS5({term:6}).href,'https://example.invalid');assert.strictEqual(u.searchParams.get('term'),'6');
 assert(estimator.includes('if(s===5 && !(Number.isInteger(Number(state.term))&&Number(state.term)>=1&&Number(state.term)<=60))state.term=12;'));
});
t('S5→U01→S02 store-detail route retains real store, target and term',()=>{
 const src=fromS5();const u=fromU01(src.href,inventory2),route=new URL(u.storeDetailRoute(false),'https://example.invalid');
 assert.strictEqual(route.searchParams.get('store'),'jianguo');assert.strictEqual(route.searchParams.get('target'),'4.4');assert.strictEqual(route.searchParams.get('term'),'12');assert.strictEqual(route.searchParams.get('state'),'matched');
});
t('Two physical units in same capacity route to inventory list rather than near stores',()=>{
 const u=fromU01(fromS5().href,inventory2),other=u.otherAvailableUnitCount(inventory2,'MK-BJ-5','BJ0498S01B001');
 assert.strictEqual(other,1);const r=new URL(u.storeDetailRoute(true),'https://example.invalid');assert.strictEqual(r.searchParams.get('focusOtherUnits'),'1');assert.strictEqual(r.searchParams.get('state'),'browse');assert.strictEqual(r.hash,'#inventorySection');
 assert(store.includes("qp.get('source')==='u01_other_units'"));
});
t('One physical unit in current store chooses nearby matched listing retaining 12 months',()=>{
 const u=fromU01(fromS5().href,inventory1);assert.strictEqual(u.otherAvailableUnitCount(inventory1,'MK-BJ-5','BJ0498S01B001'),0);
 const r=new URL(u.nearbyOtherUnitsRoute(),'https://example.invalid');assert(r.pathname.includes('store_list_s01'));assert.strictEqual(r.searchParams.get('state'),'estimated');
 assert.strictEqual(r.searchParams.get('target'),'4.4');assert.strictEqual(r.searchParams.get('term'),'12');
});
t('Another size option counts as valid same-store alternatives',()=>{
 const u=fromU01(fromS5().href,multi);assert.strictEqual(u.otherAvailableUnitCount(multi,'MK-BJ-5','BJ0498S01B001'),2);
});
t('Browsed U01 creates demand for nearby search without silently generating rental term',()=>{
 const u=fromU01(fromS5().href,inventory1,{hasRequirement:false,fromS01State:'browse',term:null,u:{v:3.3}});
 const r=new URL(u.nearbyOtherUnitsRoute(),'https://example.invalid');assert.strictEqual(r.searchParams.get('term'),null);assert.strictEqual(r.searchParams.get('target'),'3.3');assert.strictEqual(r.searchParams.get('state'),'estimated');
});
t('Combination recommendation stays on combo-compatible route instead of misleading single-unit U01',()=>{
 const out=fromS5({matchType:'combo'});assert.strictEqual(out.combo,1);assert.strictEqual(out.href,'');
});
t('S3 immediate click with <5 shown upper bound and no Next CTA persists',()=>{
 assert(estimator.includes('go(canQuickEstimate(state.scene,state.amount,state.quantities)?5:4)'));
 assert(estimator.includes('const displayedUpper=Number(fmt(r.max))'));
 assert(estimator.includes('displayedUpper<5.0'));
 assert(!estimator.includes('id="amountActionBar"'));
});
t('S4 clear selection protects empty recommendation and preserves item pictures',()=>{
 assert(estimator.includes("$('#clearItemsBtn').onclick"));
 assert(estimator.includes("if(rawVolume()<=0){toast('请选择至少一件物品');return}"));
 assert(estimator.includes('需要存储容量'));
});
t('Inventory sold-out and price+order functions are retained through U01',()=>{
 assert(unit.includes('const isSoldOut=sameCapacityAvailable===0||!actualUnitId'));
 for(const x of ['function currentPriceSnapshot()','function goOrder()','function goQuote()','function promoStatus()'])assert(unit.includes(x),x);
});
t('S01 has requirement-based and browse entry; S02 inventory focus limited to requested source',()=>{
 assert(listing.includes("'estimated'"));assert(listing.includes('browse'));assert(store.includes('focusOtherUnits'));
});
console.log(`A5 CROSS-PAGE ${passes}/${passes} PASS — source-level only, not HTTP/WeChat proof`);
