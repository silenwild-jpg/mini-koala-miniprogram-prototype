/* DEMO-PREPAY-02: real source functions in a Node VM; never a browser/E2E claim. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const names={
 list:'prototype/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html',
 detail:'prototype/mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html',
 unit:'prototype/mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html',
 quote:'prototype/mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html',
 order:'prototype/mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html',
 est:'prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html'
};
const html=Object.fromEntries(Object.entries(names).map(([k,p])=>[k,read(p)]));
function part(text,start,end){const a=text.indexOf(start),b=text.indexOf(end,a+start.length);assert(a>=0&&b>a,'source anchors '+start);return text.slice(a,b)}
function func(text,name,next){return part(text,'function '+name+'(',next)}
function core(page='list'){
 const mem=new Map(),c={console,URL,URLSearchParams,Date,Math,Number,Set,Map,JSON,
  localStorage:{getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)},
  location:{search:'',pathname:'/prototype/source_probe.html'},setTimeout:()=>0,clearTimeout(){},document:{}};
 c.window=c;vm.createContext(c);
 for(const p of ['prototype/mini_storage_business_ssot_v274.js','data/mini_koala_data.js'])vm.runInContext(read(p),c,{filename:p});
 if(html[page].includes('<script src="mini_storage_requirement_recommendation_v274.js"></script>'))vm.runInContext(read('prototype/mini_storage_requirement_recommendation_v274.js'),c);
 vm.runInContext(read('prototype/mini_koala_acceptance_v11_facts_patch.js'),c);
 c.STORE_PROFILES=c.MINI_STORAGE_MASTER_V222.stores;c.ROUTE_BASE=c.MINI_STORAGE_MASTER_V222.route_base;
 return c;
}
const reference=core('list'),D=reference.MINI_KOALA_DATA;
const beijing=D.stores.filter(s=>s.city==='北京市');
const origins=Object.keys(reference.MINI_STORAGE_MASTER_V222.location_names);
const modes=['drive','bike','walk'];
const expected=(id,origin,mode)=>reference.MINI_STORAGE_REQUIREMENT_RECOMMENDATION_V274.routeFor(id,origin,mode);
const results=[],samples={};let routeCases=0;
function test(name,fn){try{fn();results.push({name,status:'PASS'})}catch(e){results.push({name,status:'FAIL',error:e.message})}}
function pair(got,want,label){assert.strictEqual(Number(got.m),Number(want.m),label+' minutes');assert.strictEqual(Number(got.km),Number(want.km),label+' km')}
test('S02 final facts provider matches S01 for every Beijing store, origin and travel mode',()=>{
 const c=core('detail');for(const s of beijing)for(const origin of origins)for(const mode of modes){
  pair(c.MINI_KOALA_FACTS_V11.routeFor(s.store_id,origin,mode),expected(s.store_id,origin,mode),s.store_id+'/'+origin+'/'+mode);routeCases++;
 }
});
test('S02 initial route table uses the same provider; canonical IDs and legacy aliases',()=>{
 const c=core('detail'),t=html.detail;
 const block=t.includes('const routeMasterRow=')?part(t,'const routeMasterRow=','document.querySelector(\'.header h1\')'):part(t,"for(const mode of ['drive','bike','walk']){","document.querySelector('.header h1')");
 for(const id of [...Object.keys(D.legacyAliases),...beijing.slice(0,8).map(s=>s.store_id)])for(const origin of origins){
  const got=vm.runInContext('(()=>{const travel={drive:{},bike:{},walk:{}};const storeId='+JSON.stringify(id)+';const searchOriginKey='+JSON.stringify(origin)+';'+block+';return travel})()',c);
  for(const mode of modes)pair(got[mode],expected(id,origin,mode),id+'/'+origin+'/'+mode);
 }
});
test('S02 travel switching updates carried distance and option labels together',()=>{
 const c=core('detail'),route=expected(beijing[0].store_id,'guomao','bike');
 const target={dataset:{}},spans={drive:{},bike:{},walk:{}};
 c.travel={};for(const mode of modes)c.travel[mode]={...expected(beijing[0].store_id,'guomao',mode),icon:'',label:mode};
 c.travelMode='bike';c.searchMin=999;c.searchKm=999;
 c.$=()=>target;c.$$=()=>modes.map(mode=>({dataset:{travel:mode},querySelector:()=>spans[mode]}));
 vm.runInContext(func(html.detail,'renderTravelContext',"\n$$('#travelSheet .option')")+'renderTravelContext();',c);
 pair({m:c.searchMin,km:c.searchKm},route,'bike');assert(spans.bike.textContent.includes(route.km.toFixed(1)));assert(target.title.includes('演示'));
});
test('U01 ignores stale incoming distance and preserves origin/travel from shared provider',()=>{
 const c=core('unit'),t=html.unit;
 const block=t.includes('const searchRoute=')?part(t,"const searchOriginKey=p.get('searchOriginKey')","let pickupAddress="):part(t,"const searchKm=Number(p.get('searchKm')","let pickupAddress=");
 for(const mode of modes){
  const id=beijing.find(s=>s.store_name.includes('丽泽'))?.store_id||beijing[0].store_id;
  c.p=new URLSearchParams({searchOriginKey:'wangjing',travel:mode,searchMin:'999',searchKm:'999'});c.storeId=id;
  const got=vm.runInContext('(()=>{'+block+'return {m:searchMin,km:searchKm}})()',c);
  pair(got,expected(id,'wangjing',mode),'stale URL/'+mode);
 }
});
test('S5 displayed and transferred store distances agree with S01 across all Beijing stores',()=>{
 const c=core('est');vm.runInContext(func(html.est,'estimatorStoreFacts','function estimatorRouteText('),c);
 for(const s of beijing)for(const origin of origins)for(const mode of modes){
  const fact=c.estimatorStoreFacts(s.store_id,mode,origin);
  pair({m:fact.minutes,km:fact.km},expected(s.store_id,origin,mode),s.store_id+'/'+origin+'/'+mode);
 }
});
function listContext(params){
 const c=core('list');c.qp=params;c.entrySource=params.get('source')||'';
 c.searchLocation='guomao';c.travelMode='drive';
 vm.runInContext(part(html.list,'function routeFor(id)','function travelMeta('),c);return c;
}
test('Other-stores exclusion compares canonical IDs and aliases, not store names',()=>{
 const id=D.legacyAliases.shuangjing,c=listContext(new URLSearchParams({source:'u01_other_stores',excludeStore:'shuangjing'}));
 assert.strictEqual(c.passesOtherStoreContext(id),false);assert.strictEqual(c.passesOtherStoreContext('shuangjing'),false);
 const other=beijing.find(s=>s.store_id!==id);assert.strictEqual(c.passesOtherStoreContext(other.store_id),true);
});
test('Ordinary lists and invalid exclusion IDs keep all eligible stores',()=>{
 const id=beijing[0].store_id;
 for(const p of [new URLSearchParams({source:'browse',excludeStore:id}),new URLSearchParams({source:'u01_other_stores'}),new URLSearchParams({source:'u01_other_stores',excludeStore:'INVALID-ID'})]){
  const c=listContext(p);assert.strictEqual(c.passesOtherStoreContext(id),true);
 }
});
function runBase(ids,params){
 const c=listContext(params);c.stores=Object.fromEntries(ids.map(id=>[id,c.MINI_STORAGE_MASTER_V222.stores[id]]));
 Object.assign(c,{EXCEPTION_STATE_DATA:{},state:'browse',sortMode:'distance',distancePreference:'any',ACTIVE_STORE_CITY:'北京市',inventoryStatusForStore:()=> 'AVAILABLE'});
 vm.runInContext(func(html.list,'baseOrder','function filteredOrder('),c);return c.baseOrder();
}
test('Primary lists exclude the originating store before sorting and filtering',()=>{
 const ids=beijing.slice(0,8).map(s=>s.store_id),p=new URLSearchParams({source:'u01_other_stores',excludeStore:ids[0]});
 assert(!runBase(ids,p).includes(ids[0]));assert.strictEqual(runBase(ids,new URLSearchParams({source:'browse',excludeStore:ids[0]})).length,ids.length);
});
test('No other eligible store produces an empty list rather than reintroducing the current store',()=>{
 const id=beijing[0].store_id;assert.strictEqual(runBase([id],new URLSearchParams({source:'u01_other_stores',excludeStore:id})).length,0);
});
test('Sold-out/secondary inventory also excludes the originating store',()=>{
 const ids=beijing.slice(0,3).map(s=>s.store_id),c=listContext(new URLSearchParams({source:'u01_other_stores',excludeStore:ids[0]}));
 c.stores=Object.fromEntries(ids.map(id=>[id,{city:'北京市'}]));c.state='browse';c.inventoryScenario='soldout';c.demoSoldoutStoreId='';
 c.passesServiceFilters=()=>true;c.passesBrowseDistance=()=>true;c.inventoryStatusForStore=()=> 'SOLD_OUT';c.unavailableStoreCard=id=>id;
 const els={};c.$=id=>els[id]||(els[id]={classList:{toggle(){}}});c.$$=()=>[];
 vm.runInContext(func(html.list,'renderInventorySecondary','const routeBase='),c);c.renderInventorySecondary();
 assert(!els['#inventoryStatusList'].innerHTML.includes(ids[0]));assert(els['#inventoryStatusList'].innerHTML.includes(ids[1]));
});
function unitFunctions(ctx={}){
 const c=core('unit'),elements={};c.$=id=>elements[id]||(elements[id]={dataset:{},setAttribute(){}});
 Object.assign(c,{storeId:D.legacyAliases.shuangjing,fromS01State:'estimated',searchOriginKey:'wangjing',searchMin:27,searchKm:12.1,accessFrequency:'low',target:4.8,term:6,hasRequirement:true,u:{v:4.8},customerType:'personal',travelMode:'bike',s01File:'s01.html',s02File:'s02.html',p:new URLSearchParams({otherStoresSource:'u01_other_stores',excludeStore:beijing[0].store_id}),...ctx});
 c.MINI_STORAGE_SALES_SHARE={enabled:false};
 vm.runInContext(part(html.unit,'function preserveUnitContext(', 'function syncOtherUnitEntry('),c);return c;
}
test('U01 other-stores route carries current ID, mode, demand and selected term',()=>{
 const c=unitFunctions(),q=new URL(c.nearbyOtherUnitsRoute(),'http://example.test').searchParams;
 assert.strictEqual(q.get('excludeStore'),c.storeId);assert.strictEqual(q.get('travel'),'bike');assert.strictEqual(q.get('term'),'6');
 assert.strictEqual(q.get('target'),'4.8');assert.strictEqual(q.get('source'),'u01_other_stores');assert.strictEqual(q.get('otherStoresSource'),null);
});
test('U01 browse-origin alternative uses physical volume and never invents a missing duration',()=>{
 const c=unitFunctions({hasRequirement:false,u:{v:3.3},term:null}),q=new URL(c.nearbyOtherUnitsRoute(),'http://example.test').searchParams;
 assert.strictEqual(q.get('target'),'3.3');assert.strictEqual(q.get('term'),null);
});
test('Alternative-store context survives S01→S02→U01→S02 and S02→S01 return',()=>{
 const excluded=beijing[0].store_id,p=new URLSearchParams({source:'u01_other_stores',excludeStore:excluded});
 const list=listContext(p),q=new URLSearchParams();list.carryOtherStoreContext(q);
 assert.strictEqual(q.get('otherStoresSource'),'u01_other_stores');
 const unit=unitFunctions({p:q}),back=new URL(unit.storeDetailRoute(),'http://example.test').searchParams;
 assert.strictEqual(back.get('excludeStore'),excluded);assert.strictEqual(back.get('otherStoresSource'),'u01_other_stores');
 const c=core('detail'),button={};c.$=()=>button;c.location={search:'?otherStoresSource=u01_other_stores&excludeStore='+excluded+'&sort=price&distance=5&services=lift&loaded=12&scroll=78'};
 Object.assign(c,{state:'browse',entrySource:'s01',fromS01State:'browse',targetVolume:4.8,travelMode:'bike',leadRoute:'none',leadReason:'',leadTcv:0,searchOriginKey:'wangjing',accessFrequency:'low',searchMin:27,searchKm:12.1,customerType:'',termMonths:6,s01File:'s01.html'});
 c.MINI_STORAGE_SALES_SHARE={enabled:false};
 vm.runInContext(part(html.detail,"$('#backBtn').onclick=()=>{",'function openStoreMap('),c);button.onclick();
 const result=new URL(c.location.href,'http://example.test').searchParams;
 assert.strictEqual(result.get('source'),'u01_other_stores');assert.strictEqual(result.get('excludeStore'),excluded);
 for(const key of ['sort','distance','services','loaded','scroll'])assert.strictEqual(result.get(key),new URLSearchParams(c.location.search).get(key),key);
 assert.strictEqual(result.get('travel'),'bike');assert.strictEqual(result.get('term'),'6');
});
test('S5 recommendation, navigation and list routes all carry selected travel mode',()=>{
 assert.strictEqual((html.est.match(/travel:searchCtx\.travel,searchOriginKey:searchCtx\.origin,search/g)||[]).length,3);
});
test('U01/Q01/O01 navigation carrier preserves travel/exclusion without altering financial fields',()=>{
 for(const page of ['unit','quote','order']){
  const c={URLSearchParams,p:new URLSearchParams({travel:'bike',otherStoresSource:'u01_other_stores',excludeStore:beijing[0].store_id,term:'60',initialPayable:'1',couponDiscount:'999'})};vm.createContext(c);
  const fn=func(html[page],'carryPrepayNavigationContext',page==='unit'?'function goOrder(':page==='quote'?'function goBack(':"document.querySelector('#back').onclick");
  vm.runInContext(fn,c);const q=new URLSearchParams({term:'6',initialPayable:'3863',couponDiscount:'200',unit:'REAL-ID'});c.carryPrepayNavigationContext(q);
  assert.strictEqual(q.get('travel'),'bike');assert.strictEqual(q.get('excludeStore'),beijing[0].store_id);
  assert.strictEqual(q.get('term'),'6');assert.strictEqual(q.get('initialPayable'),'3863');assert.strictEqual(q.get('couponDiscount'),'200');assert.strictEqual(q.get('unit'),'REAL-ID');
 }
 assert.strictEqual((html.unit.match(/carryPrepayNavigationContext\(q\);/g)||[]).length,2);
 assert.strictEqual((html.quote.match(/carryPrepayNavigationContext\(q\);/g)||[]).length,2);
 assert.strictEqual((html.order.match(/carryPrepayNavigationContext\(q\);/g)||[]).length,1);
});
const liz=D.stores.find(s=>s.store_name.includes('丽泽'));
if(liz){const old=core('detail');samples.lize={id:liz.store_id,s01:expected(liz.store_id,'guomao','drive'),s02Final:old.MINI_KOALA_FACTS_V11.routeFor(liz.store_id,'guomao','drive')};}
const out={evidence_kind:'SOURCE_VM_NOT_BROWSER',pass:results.filter(r=>r.status==='PASS').length,fail:results.filter(r=>r.status==='FAIL').length,routeCases,beijingStores:beijing.length,originCount:origins.length,results,samples};
console.log(JSON.stringify(out,null,2));process.exitCode=out.fail?1:0;

