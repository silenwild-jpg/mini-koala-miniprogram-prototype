const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const s01=read('prototype/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html');
const estimator=read('prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html');

for(const token of ["source:'store_list'","returnTo:'S01'",'returnOriginKey:searchLocation','returnTravel:travelMode','returnSort:sortMode','returnDistance:String(browseDistanceKm)',"returnScroll:String($('#page').scrollTop||0)",'returnLoaded:String(visibleStoreCount)','returnServices']){
  assert(s01.includes(token),`S01 estimator entry includes ${token}`);
}
assert(s01.includes("if(['any','3','5','10'].includes(qp.get('distance')))browseDistanceKm=qp.get('distance')"),'S01 cancel restores browse distance');
assert(s01.includes("restoredServices.includes(pill.dataset.value)"),'S01 restores service filters');
assert(s01.includes("$('#page').scrollTop=Number(qp.get('scroll'))"),'S01 cancel restores the previous list position');
assert(s01.includes("const restoredLoaded=Number(qp.get('loaded')||0)"),'S01 reads restored loaded-store count');
assert(s01.includes('visibleStoreCount=Math.max(STORE_PAGE_SIZE'),'S01 restores the loaded-store count before rendering');
assert(estimator.includes("source:'estimator_cancel'")&&estimator.includes("entry:'browse_nearby'")&&estimator.includes("loaded:String(returnListContext.loaded||8)")&&estimator.includes("returnListContext.services.join(',')"),'estimator cancel returns to the original S01 browse context including loaded count');

const route=estimator.match(/function openEstimateResult\([\s\S]*?\n}\n(?=\n\$\('#toRealBtn'\))/);
assert(route,'extract estimator result routing');
const location={href:''};
const context={window:null,location,URLSearchParams,Number,String,JSON,Infinity,
  pricingPreviewForVolume:()=>({rent_total:2400}),sharedAdvisorDecision:()=>({level:'standard',reason:'fixture',expected_contract_rent:2400}),
  returnStoreContext:null,returnListContext:{origin:'sanyuanqiao',travel:'bike',sort:'price',distance:'5',access:'high',loaded:16,services:['24h','elevator']},
  state:{customer:'personal'},s01File:'stores.html'};
context.window=context;vm.createContext(context);
  vm.runInContext(read('prototype/mini_koala_phase2_ux.js'),context);
  context.activeEstimatorSearchContext=()=>({origin:context.state.searchOriginOverride||context.returnListContext?.origin||context.returnStoreContext?.origin||'guomao',travel:context.returnListContext?.travel||context.returnStoreContext?.travel||'drive'});
vm.runInContext(route[0],context);
vm.runInContext("openEstimateResult(6.3,12,'standard')",context);
const result=new URLSearchParams(location.href.split('?')[1]);
assert.equal(location.href.split('?')[0],'stores.html');
assert.equal(result.get('state'),'estimated');
assert.equal(result.get('entry'),'estimate_complete');
assert.equal(result.get('target'),'6.3');
assert.equal(result.get('term'),'12');
assert.equal(result.get('travel'),'bike');
assert.equal(result.get('searchOriginKey'),'sanyuanqiao');
assert.equal(result.get('services'),'24h,elevator');
assert.equal(result.get('source'),'estimator_return');
assert.equal(result.get('scroll'),'0','completed estimation explicitly returns to top');
assert.equal(result.get('distance'),'5','completed estimation preserves the visible hard distance filter');
assert.equal(result.get('sort'),'price','completed estimation preserves the chosen sorting');
assert.equal(result.get('loaded'),null,'completed estimation starts a fresh recommendation result set');

console.log('PASS S01 estimator return: cancel restores browse filters + loaded count + scroll; completion returns to top in demand-recommendation state');
