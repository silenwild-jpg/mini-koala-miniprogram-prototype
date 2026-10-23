const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const page=read('prototype/mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html');
const script=[...page.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)][0][1];

function scenario(query,requirement={}){
  const nodes=new Map(),storage=new Map([['mini_storage_requirement_current',JSON.stringify(requirement)]]);
  function node(selector){
    if(nodes.has(selector))return nodes.get(selector);
    const classes=new Set(),n={textContent:'',innerHTML:'',value:'',style:{},dataset:{},
      classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x),contains:x=>classes.has(x)},
      querySelector:s=>node(selector+' '+s),querySelectorAll:()=>[],addEventListener(){},scrollIntoView(){},closest(){return n}};
    nodes.set(selector,n);return n;
  }
  function selectAll(selector){
    if(selector==='#unitList .unit-card'||selector==='#allUnitsInline .unit-card'){
      const html=node(selector.startsWith('#unitList')?'#unitList':'#allUnitsInline').innerHTML;
      return [...html.matchAll(/class="unit-card" data-unit="([^"]+)"/g)].map(match=>({dataset:{unit:match[1]}}));
    }
    return [];
  }
  const location={search:query,href:''};
  const context={window:null,document:{querySelector:node,querySelectorAll:selectAll,body:node('body'),head:node('head')},
    location,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))},
    URLSearchParams,Date,Math,JSON,String,Number,Array,Object,Boolean,Error,console,setTimeout:()=>0,clearTimeout:()=>{}};
  context.window=context;vm.createContext(context);
  vm.runInContext(read('prototype/mini_koala_phase2_ux.js'),context);
  context.activeEstimatorSearchContext=()=>({origin:context.state.searchOriginOverride||context.returnListContext?.origin||context.returnStoreContext?.origin||'guomao',travel:context.returnListContext?.travel||context.returnStoreContext?.travel||'drive'});
  vm.runInContext(read('prototype/mini_storage_business_ssot_v274.js'),context);
  vm.runInContext(read('data/mini_koala_data.js'),context);
  vm.runInContext(script,context);
  return {context,node,location,run:code=>vm.runInContext(code,context)};
}

const browse=scenario('?store=jianguo&state=browse&searchOriginKey=sanyuanqiao&searchMin=12&searchKm=5.1&access=high');
browse.node('#browseEstimator').onclick();
const returnParams=new URLSearchParams(browse.location.href.split('?')[1]);
assert.equal(returnParams.get('entry'),null,'store estimation must start at estimator home');
assert.equal(returnParams.get('returnStore'),'jianguo');
assert.equal(returnParams.get('returnOriginKey'),'sanyuanqiao');
assert.equal(returnParams.get('returnSearchMin'),'12');
assert.equal(returnParams.get('returnAccess'),'high');
assert.equal(returnParams.get('returnTarget'),'5.0');
assert(page.includes('24小时自助存取 · 大件进出方便 · 可预约搬运'),'demo service promise is restored');

const manyUnits=scenario('?store=wangjing&state=browse');
assert.equal(manyUnits.run('inventoryUnits().length'),7);
assert.equal(manyUnits.node('#unitList').innerHTML.match(/class="unit-card"/g).length,3);
manyUnits.node('#allUnits').onclick();
assert.equal(manyUnits.run('allUnitsVisibleCount'),3);
assert(!manyUnits.node('#allUnits').classList.contains('hidden'));
manyUnits.node('#allUnits').onclick();
assert.equal(manyUnits.run('allUnitsVisibleCount'),4);
assert(manyUnits.node('#allUnits').classList.contains('hidden'),'view-more disappears after the last unit');

const matched=scenario('?store=jianguo&state=matched&target=6.3&term=6',
  {target_volume:6.3,min_volume:5.8,max_volume:6.8,has_oversize:true});
assert(matched.run('idealUnits().length')>0,'fixture needs an available, in-range option');
const unitId=matched.run('idealUnits()[0].id');
assert(!matched.node('#unitList').innerHTML.includes('查看本次费用'),'store cards no longer expose fee preview');
assert(matched.node('#unitList').innerHTML.includes('大件需求：体积可比较'),'oversize is not a verified dimension match');
matched.run(`gotoU01(${JSON.stringify(unitId)})`);
const unitParams=new URLSearchParams(matched.location.href.split('?')[1]);
assert.equal(unitParams.get('store'),'jianguo');
assert.equal(unitParams.get('term'),'6');
assert.equal(unitParams.get('target'),'6.3');

const cancelSource=scenario('?store=jianguo&state=matched&target=6.3&term=12&customer=enterprise&fromS01State=estimated&travel=bike&searchOriginKey=sanyuanqiao&searchMin=12&searchKm=5.1');
cancelSource.node('#deepEstimate').onclick();
const cancelParams=new URLSearchParams(cancelSource.location.href.split('?')[1]);
assert.equal(cancelParams.get('returnTarget'),'6.3');
assert.equal(cancelParams.get('returnTerm'),'12');
assert.equal(cancelParams.get('returnCustomer'),'enterprise');
assert.equal(cancelParams.get('returnFromS01State'),'estimated');
assert.equal(cancelParams.get('returnTravel'),'bike');

const noMatch=scenario('?store=jianguo&state=matched&target=200&term=6',
  {target_volume:200,min_volume:180,max_volume:220});
assert.equal(noMatch.run('state'),'nomatch','false matched routes must recover to no-match state');
noMatch.node('#seeNearbyStores').onclick();
assert(noMatch.location.href.includes('mini_storage_store_list_s01')&&noMatch.location.href.includes('target=200.0'));

const estimatorHtml=read('prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html');
const estimatorRoute=estimatorHtml.match(/function openEstimateResult\([\s\S]*?\n}\n(?=\n\$\('#toRealBtn'\))/);
assert(estimatorRoute,'extract actual estimator return function');
function estimatorReturn(target,requirement){
  const location={href:''};
  const context={window:null,location,URLSearchParams,Number,String,JSON,Infinity,
    pricingPreviewForVolume:()=>({rent_total:1800}),sharedAdvisorDecision:()=>({level:'standard',reason:'fixture',expected_contract_rent:1800}),
    returnStoreContext:{store:'jianguo',travel:'bike',state:'browse',origin:'sanyuanqiao',minutes:12,km:5.1,access:'high',fromS01State:'estimated'},
    estimatorStoreFacts:()=>({minutes:12,km:5.1}),storageGet:()=>JSON.stringify(requirement),REQUIREMENT_KEY:'current',state:{customer:'personal'},s01File:'stores.html'};
  context.window=context;
  vm.createContext(context);
  vm.runInContext(read('prototype/mini_koala_phase2_ux.js'),context);
  context.activeEstimatorSearchContext=()=>({origin:context.state.searchOriginOverride||context.returnListContext?.origin||context.returnStoreContext?.origin||'guomao',travel:context.returnListContext?.travel||context.returnStoreContext?.travel||'drive'});
  vm.runInContext(read('prototype/mini_storage_business_ssot_v274.js'),context);
  vm.runInContext(read('data/mini_koala_data.js'),context);
  vm.runInContext(estimatorRoute[0],context);
  vm.runInContext(`openEstimateResult(${target},6,'standard')`,context);
  return new URLSearchParams(location.href.split('?')[1]);
}
const returnMatch=estimatorReturn(6.3,{min_volume:5.8,max_volume:6.8});
assert.equal(returnMatch.get('state'),'matched');
assert.equal(returnMatch.get('store'),'jianguo');
assert.equal(returnMatch.get('searchOriginKey'),'sanyuanqiao');
assert.equal(returnMatch.get('searchMin'),'12');
assert.equal(returnMatch.get('access'),'high');
assert.equal(returnMatch.get('travel'),'bike');
assert.equal(returnMatch.get('fromS01State'),'estimated');
assert.equal(estimatorReturn(200,{min_volume:180,max_volume:220}).get('state'),'nomatch');
assert(estimatorHtml.includes("source:'estimator_cancel'")&&estimatorHtml.includes("target:String(returnStoreContext.target||5)")&&estimatorHtml.includes("q.set('term',String(returnStoreContext.term))"),'estimator cancel restores the original demand and term');
console.log('PASS MMS decision flow: original-store context, cancel restoration, progressive inventory, U01 handoff, oversize caveat, and zero-match recovery');
