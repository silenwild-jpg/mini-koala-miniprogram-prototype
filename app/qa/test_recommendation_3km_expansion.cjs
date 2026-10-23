const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'prototype/mini_koala_recommendation_policy_v2.js'),'utf8');
const ctx={window:{}};
vm.runInNewContext(source,ctx);
const policy=ctx.window.MINI_KOALA_RECOMMENDATION_POLICY_V2;
const row=(id,km,price,matchType='single')=>({id,storeId:id,route:{km,m:Math.round(km*4)},price,matchType,count:1});

const local=[row('nearest',1,100),row('second',2,95),row('lowest',3,80),row('far',4,60)];
let result=policy.highlightRanked(local);
assert.deepEqual(Array.from(result.rows.slice(0,2),x=>x.id),['nearest','lowest']);
assert.equal(result.highlights.lowest,'区域低价');
assert.equal(result.searchRadiusKm,3);

result=policy.highlightRanked([row('nearest',1,100),row('inside',2,110),row('justOutside',3.01,90)]);
assert.equal(result.rows[1].id,'justOutside');
assert.equal(result.highlights.justOutside,'稍远更省');
assert.equal(result.searchRadiusKm,3.01);

result=policy.highlightRanked([row('nearest',1,100),row('second',2,110),row('lowSix',5.9,90),row('lowNine',7,50)]);
assert.deepEqual(Array.from(result.rows.slice(0,2),x=>x.id),['nearest','lowSix']);
assert.equal(result.highlights.lowSix,'稍远更省');
assert.equal(result.searchRadiusKm,6);

result=policy.highlightRanked([row('nearest',1,100),row('second',2,110),row('third',3,100),row('fourth',8,90)]);
assert.equal(result.rows[1].id,'fourth');
assert.equal(result.searchRadiusKm,8);
assert.equal(result.highlights.fourth,'稍远更省');

result=policy.highlightRanked([row('nearest',1,80),row('second',2,95),row('third',5,80),row('fourth',8,120)]);
assert.equal(result.rows[1].id,'second');
assert.equal(result.highlights.second,undefined);
assert.equal(result.cheaper,false);

result=policy.rank([row('nearest',1,100),row('second',2,110),row('farCheap',5,80)],{demand:true,distanceLimit:3});
assert.deepEqual(Array.from(result.rows.slice(0,2),x=>x.id),['nearest','second']);
assert.equal(result.cheaper,false);

result=policy.rank([row('combo',1,100,'combo'),row('single',2,90)],{demand:true});
assert.equal(result.rows[0].id,'combo','nearest real match may be a combo');
assert.equal(result.rows[1].id,'single');

result=policy.highlightRanked([row('only',3,100)]);
assert.equal(result.rows.length,1);
assert.equal(result.highlights.only,'离您最近');

const home=fs.readFileSync(path.join(root,'prototype/mini_storage_home_H01_Visual_V2_7_4_SSOT.html'),'utf8');
const s01=fs.readFileSync(path.join(root,'prototype/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html'),'utf8');
const s5=fs.readFileSync(path.join(root,'prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html'),'utf8');
assert.match(home,/const HOME_PRICE_RADIUS_KM=3;/);
assert.match(home,/const validTerm=window\.MINI_STORAGE_BUSINESS_HELPERS_V274\.validTerm/);
assert.match(s01,/highlightRanked\([^;]+\{radius:3,maxRadius:scopeKm\}/);
assert.match(s5,/highlightRanked\([^;]+\{radius:3\}/);
function homeSelection(requirement){
  const context={window:null,homeParams:new URLSearchParams(),homeOriginKey:'guomao',homeLocationMode:'precise',REQUIREMENT_KEY:'requirement',assetObj:()=>requirement,URLSearchParams,console};
  context.window=context;
  vm.createContext(context);
  const read=name=>fs.readFileSync(path.join(root,'prototype',name),'utf8');
  for(const name of ['mini_storage_business_ssot_v274.js','mini_koala_recommendation_policy_v2.js'])vm.runInContext(read(name),context);
  context.MINI_KOALA_DATA=require(path.join(root,'data/mini_koala_data.js'));
  for(const name of ['mini_koala_physical_fit_v1.js','mini_koala_combo_match_v1.js','mini_storage_requirement_recommendation_v274.js'])vm.runInContext(read(name),context);
  const start=home.indexOf('const HOME_PRICE_RADIUS_KM='),end=home.indexOf('function renderHomeStorePrices(){',start);
  assert(start>=0&&end>start);
  vm.runInContext(home.slice(start,end),context);
  return vm.runInContext('({rows:HOME_RECOMMENDATIONS,meta:HOME_RECOMMENDATION_META})',context);
}
const pricedHome=homeSelection({target_volume:4.8,min_volume:4.3,max_volume:5.5,term_months:6});
assert(pricedHome.rows[0]?.matched?.hasMatch);
assert.equal(pricedHome.meta[0].badge,'离您最近');
if(pricedHome.meta[1]?.badge)assert(pricedHome.rows[1].price<pricedHome.rows[0].price);
const noTermHome=homeSelection({target_volume:4.8,min_volume:4.3,max_volume:5.5});
assert(noTermHome.rows[0]?.matched?.hasMatch);
assert.equal(noTermHome.meta[1]?.badge,'','unpriced demand cannot claim a saving');
console.log('PASS shared 3km expansion, strictly cheaper second role, nearest fallback, explicit radius, H01/S01/S5 wiring');
