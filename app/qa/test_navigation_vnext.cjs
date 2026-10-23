const fs=require('fs'),assert=require('node:assert/strict'),vm=require('node:vm'),path=require('path');
const p=path.join(__dirname,'../prototype');
const e=fs.readFileSync(path.join(p,'space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html'),'utf8');
const u=fs.readFileSync(path.join(p,'mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html'),'utf8');
const j=fs.readFileSync(path.join(p,'mini_koala_estimator_item_fallback_p0_v1.js'),'utf8');
assert(!e.includes('<section class="screen" id="s9">'));
assert(!e.includes('go(9)'));
assert(!e.includes('门店仓位列表'));
assert(!e.includes('已调整找仓容量，原物品清单保留'));
assert(!e.includes('根据您核对的物品估算'));
assert(!j.includes("$('#usageMeta').textContent+=' · 含常见摆放余量'"));
const start=e.indexOf('  const continueToRecommendedUnit=()=>{');
const end=e.indexOf('  const carryRequirementToStoreList=()=>{',start);
assert(start>0&&end>start);
const logic=e.slice(start,end);
function simulate(chosen,units,extra={}){
 const outputs={saved:[],snapshot:[],url:''};
 const ctx={state:{r113Plan:'nearest',r113StoreId:'',r113UnitId:'',term:6,addedP2:new Set(),complex:new Set(),customer:'personal'},
 syncSelectedRecommendation:()=>chosen,saveEffectiveRequirement:obj=>outputs.saved.push(obj),
 returnStoreContext:null,term:6,target:5,volMin:4.5,volMax:5.6,searchCtx:{travel:'drive',origin:'guomao'},
 window:{MINI_STORAGE_REQUIREMENT_RECOMMENDATION_V274:{evaluateStore:()=>({hasMatch:units.some(u=>u.available_count>0&&u.v>=4.5&&u.v<=5.6)})},MINI_KOALA_DATA:{getLegacyUnits:()=>units},MINI_STORAGE_MASTER_V222:{route_source:'fixture'},location:{href:''}},
 storageSet:(...args)=>outputs.snapshot.push(args),estimatorStoreFacts:()=>({minutes:15,km:3.8}),
 carryRequirementToStoreList:()=>{outputs.fallback=true},toast:()=>{},sharedAdvisorDecision:()=>({level:'none'}),openEstimateResult:()=>{},
 returnListContext:null,JSON,Number,String,Math,URLSearchParams,Date};
 vm.createContext(ctx);vm.runInContext(logic.replace('  const continueToRecommendedUnit=','var continueToRecommendedUnit='),ctx);
 ctx.continueToRecommendedUnit();outputs.url=ctx.window.location.href;
 return outputs;
}
const chosen={storeId:'jianguo',unit:{id:'U1',v:5},matchedCount:1};
const one=simulate(chosen,[{id:'U1',v:5,available_count:1}]);
const many=simulate({...chosen,matchedCount:3},[{id:'U1',v:5,available_count:2},{id:'U2',v:5.2,available_count:1}]);
const none=simulate(chosen,[{id:'U1',v:5,available_count:0}]);
for(const r of [one,many,none]){
 assert(r.url.includes('mini_storage_store_detail_s02_'));
 assert(r.url.includes('source=estimator_recommendation'));
 assert(r.url.includes('selectionContext=estimate_recommendation'));
 assert(r.url.includes('term=6'));
 assert(r.snapshot.length===1);
 assert(!r.url.includes('mini_storage_unit_detail_u01_'));
}
assert(one.url.includes('state=matched'));
assert(many.url.includes('state=matched'));
assert(none.url.includes('state=nomatch'));
assert(one.saved[0].recommended_store_id==='jianguo');
assert(simulate(null,[]).fallback);
assert(e.includes("if(entry==='resume_unit_list'){location.replace"));
assert(/\.capacity-summary\{grid-template-columns:minmax\(0,1fr\) 140px/.test(e));
assert(u.includes('</style>\n<style id="u01-compact-term-fee-v1">'));
assert(u.includes('<style id="u01-compact-price-layout-fix-v2">'));
console.log('PASS VNext: single/multi/no-match routes; removed S9; copy/layout/style scoped');
