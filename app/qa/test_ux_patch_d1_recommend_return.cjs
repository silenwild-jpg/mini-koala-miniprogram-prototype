'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=n=>fs.readFileSync(path.join(root,'prototype',n),'utf8');
const policy=read('mini_koala_recommendation_policy_v2.js');
const s5=read('space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html');
const s01=read('mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html');
const s02=read('mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html');
const u01=read('mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html');
let n=0;function test(label,fn){fn();n++;console.log('PASS',String(n).padStart(2,'0'),label)}
function sourceBetween(html,from,to){const a=html.indexOf(from),b=html.indexOf(to,a+from.length);assert(a>=0&&b>a,`source interval: ${from}`);return html.slice(a,b)}
const scope={window:{}};vm.runInNewContext(policy,scope);const P=scope.window.MINI_KOALA_RECOMMENDATION_POLICY_V2;
const row=(id,km,price,m=7)=>({id,storeId:id,route:{km,m},price,total:price,unit:{id:'u'+id,available_count:2}});
test('Shared policy offers one nearest/regional-low-price function',()=>{
  assert(typeof P.highlightRanked==='function');
  assert(s01.includes('MINI_KOALA_RECOMMENDATION_POLICY_V2.highlightRanked'));
  assert(s5.includes('MINI_KOALA_RECOMMENDATION_POLICY_V2.highlightRanked'));
});
test('Nearest plus distinct local lowest price',()=>{
 const x=P.highlightRanked([row('A',2,2000),row('B',1,2500),row('C',2.6,1500)]);
 assert.deepStrictEqual(Array.from(x.rows,r=>r.id),['B','C','A']);assert.strictEqual(x.highlights.B,'离您最近');assert.strictEqual(x.highlights.C,'区域低价');
});
test('Nearest also cheapest does not invent a regional-low-price winner',()=>{
 const x=P.highlightRanked([row('A',1,1000),row('B',2,2000)]);assert.strictEqual(x.highlights.A,'离您最近');assert.strictEqual(x.highlights.B,undefined)
});
test('Cheaper store outside 3km is found by expanding the search',()=>{
 const x=P.highlightRanked([row('A',1,1000),row('B',6,50)]);assert.strictEqual(x.highlights.B,'稍远更省')
});
test('Optional radius is honored',()=>{
 const x=P.highlightRanked([row('A',1,1200),row('B',4,800)],{radius:5});assert.strictEqual(x.highlights.B,'区域低价')
});
test('Zero and one row cases do not duplicate stores',()=>{
 assert.strictEqual(P.highlightRanked([]).rows.length,0);const x=P.highlightRanked([row('A',1,100)]);assert.strictEqual(x.rows.length,1)
});
function goSource(x,over={}){
 let url='',saved=null,stored=null,combo=0,listing=0;
 const base={x,state:{r113Plan:'low',term:12,addedP2:new Set(),complex:new Set()},window:{MINI_STORAGE_MASTER_V222:{route_source:'DEMO'},location:{get href(){return url},set href(t){url=t}}},searchCtx:{travel:'drive',origin:'guomao'},target:4.5,term:12,URLSearchParams,returnListContext:null,returnStoreContext:null,recommendationSet:{fallback:false},syncSelectedRecommendation:()=>x,saveEffectiveRequirement:v=>saved=v,storageSet:(k,v)=>stored={k,v},estimatorStoreFacts:()=>({km:2,minutes:9}),continueToRecommendedUnit:()=>combo++,carryRequirementToStoreList:()=>listing++,toast:()=>{},JSON,Set};
 Object.assign(base,over);
 const code=sourceBetween(s5,'  const goDirectToUnit=x=>{','  plans.innerHTML=');vm.runInNewContext(code+'\ngoDirectToUnit(x);',base);
 return {url,saved,stored,combo,listing};
}
const single={id:'nearest',storeId:'jianguo',matchType:'single',unit:{id:'A',size_option_id:'size1',available_count:1}};
test('S5 single warehouse direct U01 includes explicit returnTo S5',()=>{
 const x=goSource(single),q=new URL(x.url,'https://test.invalid');assert(q.pathname.includes('unit_detail_u01'));assert.strictEqual(q.searchParams.get('returnTo'),'S5');assert.strictEqual(q.searchParams.get('unit'),'A');assert.strictEqual(q.searchParams.get('term'),'12');assert.strictEqual(x.saved.recommended_unit_id,'A');assert.strictEqual(JSON.parse(x.stored.v).screen,5)
});
test('S5 sold-out row cannot enter U01',()=>{
 const x=goSource({...single,unit:{...single.unit,available_count:0}});assert.strictEqual(x.url,'')
});
test('Combo and alternative rows do not masquerade as a single U01',()=>{
 assert.strictEqual(goSource({...single,matchType:'combo'}).combo,1);assert.strictEqual(goSource({...single,matchType:'alternative'}).combo,1)
});
const ctaCode=sourceBetween(s5,'  const firstTradeable=rows.find','  $(\'#usageAdvisorBtn\').onclick=requestAdvisor;');
function executeMain(rows,fallback=false){let selected=null,combo=null,nearby=0;const cta={};const v={rows,recommendationSet:{fallback},$:(k)=>cta,goDirectToUnit:x=>selected=x,openRecommendedStore:x=>combo=x,carryRequirementToStoreList:()=>nearby++};vm.runInNewContext(ctaCode+'\n$(\'#usageChooseBtn\').onclick();',v);return {selected,combo,nearby,txt:cta.textContent}}
test('Primary CTA follows FIRST displayed tradeable single, not previously selected second',()=>{
 const x=executeMain([single,{...single,id:'low',storeId:'shuangjing',unit:{id:'B',available_count:1}}]);assert.strictEqual(x.selected.unit.id,'A');assert.strictEqual(x.txt,'查看推荐')
});
test('Primary CTA skips unavailable top entry and opens next valid physical unit',()=>{
 const x=executeMain([{...single,unit:{id:'sold',available_count:0}},{...single,id:'low',unit:{id:'available',available_count:2}}]);assert.strictEqual(x.selected.unit.id,'available')
});
test('Primary CTA sends combo-only to S02 instead of phantom single',()=>{
 const x=executeMain([{...single,matchType:'combo'}]);assert(x.combo);assert.strictEqual(x.txt,'查看组合仓方案');assert.strictEqual(x.selected,null)
});
test('Fallback alternatives use listing recovery, not U01',()=>{
 const x=executeMain([{...single,matchType:'alternative'}],true);assert.strictEqual(x.nearby,1);assert.strictEqual(x.txt,'查看附近门店')
});
test('No result uses listing recovery',()=>{assert.strictEqual(executeMain([]).nearby,1)});
const unitSrc=sourceBetween(u01,'// UX-PATCH A4: use physical available counts',"$('#viewStoreDetail').onclick");
function unitRoute(returnToUsage){const vars={availableUnits:[{size_option_id:'x',available_count:2}],sizeOptionId:'x',actualUnitId:'physical1',target:4.5,term:6,hasRequirement:true,fromS01State:'estimated',searchOriginKey:'wangjing',searchMin:12,searchKm:3,accessFrequency:'unknown',customerType:'personal',storeId:'jianguo',s02File:'s02.html',s01File:'s01.html',u:{v:4.7},returnToUsage,window:{MINI_STORAGE_SALES_SHARE:{enabled:false}},URLSearchParams,$:()=>({dataset:{},setAttribute(){},set textContent(x){}})};return vm.runInNewContext(unitSrc+'\n({storeDetailRoute,nearbyOtherUnitsRoute})',vars)}
test('S5-origin U01 → S02 preserves return protocol, demand and selected term',()=>{
 const q=new URL(unitRoute(true).storeDetailRoute(false),'https://test.invalid').searchParams;assert.strictEqual(q.get('returnTo'),'S5');assert.strictEqual(q.get('term'),'6');assert.strictEqual(q.get('target'),'4.5');assert.strictEqual(q.get('store'),'jianguo')
});
test('Ordinary U01 → S02 is not incorrectly labelled as S5',()=>{
 const q=new URL(unitRoute(false).storeDetailRoute(false),'https://test.invalid').searchParams;assert.strictEqual(q.get('returnTo'),null)
});
test('S02 from S5 routes its back click to resume_usage even when source changes',()=>{
 let href='';const location={search:'?returnTo=S5&source=u01_store_detail',set href(v){href=v},get href(){return href}};
 const back={'#backBtn':{}};const v={entrySource:'u01_store_detail',termMonths:6,location,estimatorFile:'estimator.html',$:k=>back[k],URLSearchParams};
 vm.runInNewContext(sourceBetween(s02,"$('#backBtn').onclick=()=>{",'function openStoreMap'),v);
 back['#backBtn'].onclick();const q=new URL(href,'https://test.invalid');assert.strictEqual(q.searchParams.get('entry'),'resume_usage');assert.strictEqual(q.searchParams.get('term'),'6')
});
test('S02 → U01 carries source and return flag forward',()=>{
 assert(s02.includes("p.set('returnTo','S5')"));assert(s02.includes("?'estimator_recommendation':'s02'"));assert(u01.includes("const returnToUsage=p.get('returnTo')==='S5'"))
});
test('S5 creates and restores one screen-5 snapshot without resetting term on valid return',()=>{
 assert(s5.includes("storageSet('mini_storage_estimator_return_snapshot'"));assert(s5.includes("if(entry==='resume_usage')"));assert(s5.includes('go(5,{initial:true});return;'));
  assert(s5.includes('if(s===5 && !state.capFirstCommitted && !state.continuityResume && !(Number.isInteger(Number(state.term))&&Number(state.term)>=1&&Number(state.term)<=60))state.term=12;'))
});
test('Direct S5 candidate does not touch pricing, order or inventory business modules',()=>{
 assert(s5.includes('window.MINI_STORAGE_REQUIREMENT_RECOMMENDATION_V274.recommend'));assert(s5.includes('window.MINI_KOALA_DATA.priceText(x.total)'));assert(u01.includes('function currentPriceSnapshot()'))
});
console.log(`UX-PATCH D1 ${n}/${n} PASS (source + VM parameter tests; browser NOT TESTED)`);
