const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html','utf8');
function part(a,b){const i=html.indexOf(a),j=html.indexOf(b,i+a.length);assert(i>=0&&j>i,a);return html.slice(i,j)}
let tests=0;function test(label,fun){fun();tests++;console.log('PASS '+label)}
function makeEnv(){const els={};const item=q=>els[q]||(els[q]={hidden:false,textContent:'',innerHTML:'',value:'',dataset:{},style:{},classList:{toggle(){}},listeners:{},addEventListener(type,fn){this.listeners[type]=fn},querySelectorAll(){return []}});const ctx={state:{flow:'estimate',screen:1,knownSize:4,knownMode:'within',term:12,customer:'merchant',complex:new Set(),movingSupport:'unknown',termCustomOpen:false},returnStoreContext:null,Set,Number,Math,Object,$:item,$$:()=>[],go:(s)=>ctx.lastScreen=s,clampTerm:n=>n};vm.createContext(ctx);return {ctx,item}}
test('P1-01 new known-size flow resets stale range mode and fields',()=>{
 const {ctx}=makeEnv();vm.runInContext(part('function renderEntry(){','function renderScenes(){'),ctx);
 vm.runInContext('renderEntry()',ctx);
 ctx.$$('#s1 .choice') // no elements from this empty stub; configure below with a new instance
 const known={dataset:{entry:'known'},onclick:null};ctx.$$=()=>[known];vm.runInContext('renderEntry()',ctx);
 known.onclick();assert.equal(ctx.state.knownMode,'about');assert.equal(ctx.state.knownSize,null);assert.equal(ctx.state.term,null);assert.equal(ctx.state.customer,null);assert.equal(ctx.lastScreen,7);
});
test('P1-03 S02 valid source capacity, term and customer inherited on known selection',()=>{
 const {ctx}=makeEnv();ctx.returnStoreContext={target:3.5,term:6,customer:'personal'};
 const known={dataset:{entry:'known'},onclick:null};ctx.$$=()=>[known];vm.runInContext(part('function renderEntry(){','function renderScenes(){'),ctx);vm.runInContext('renderEntry()',ctx);
 known.onclick();assert.equal(ctx.state.knownSize,3.5);assert.equal(ctx.state.term,6);assert.equal(ctx.state.customer,'personal');assert.equal(ctx.state.knownMode,'about');
});
test('P1-03 source with invalid/missing capacity behaves as fresh flow',()=>{
 const {ctx}=makeEnv();ctx.returnStoreContext={target:0,term:6,customer:'personal'};const known={dataset:{entry:'known'},onclick:null};ctx.$$=()=>[known];vm.runInContext(part('function renderEntry(){','function renderScenes(){'),ctx);vm.runInContext('renderEntry()',ctx);known.onclick();assert.equal(ctx.state.knownSize,null);assert.equal(ctx.state.term,null);assert.equal(ctx.state.customer,null);
});
test('P1-03 direct entry known preserves source and explicit range when supplied',()=>{
 const direct=part("  if(entry==='known'){",'  go(1,{initial:true});');assert(direct.includes('state.knownSize=hasSourceSize?sourceSize:null'));assert(direct.includes("['about','atleast','within'].includes(knownMode)?knownMode:'about'"));
 assert(html.includes("state.knownMode=knownMode||saved.size_mode||'about'")); // explicitly resumed known demand
});
test('P1-03 actual S02 URL context is parsed and preserved on entry selection',()=>{
 const {ctx}=makeEnv();ctx.location={search:'?source=store_detail&returnTo=S02&returnStore=jianguo&returnTarget=3.5&returnTerm=6&returnCustomer=personal',href:''};
 ctx.window={MINI_STORAGE_MASTER_V222:{location_names:{guomao:'北京·国贸'}}};
 ctx.URLSearchParams=URLSearchParams;ctx.returnListContext=null;ctx.activeEstimatorSearchContext=()=>({origin:'guomao'});ctx.renderEntry=()=>{};
 const start=part('function initFromHomepage(){','initFromHomepage();');vm.runInContext(start,ctx);
 ctx.initFromHomepage();
 assert.equal(ctx.returnStoreContext.target,3.5);assert.equal(ctx.state.knownSize,3.5);
 const known={dataset:{entry:'known'},onclick:null};ctx.$$=()=>[known];
 vm.runInContext(part('function renderEntry(){','function renderScenes(){'),ctx);ctx.renderEntry();known.onclick();
 assert.equal(ctx.state.knownSize,3.5);assert.equal(ctx.state.term,6);assert.equal(ctx.state.customer,'personal');
});
test('P1-02 valid term/customer interactions immediately clear their respective error only',()=>{
 const {ctx,item}=makeEnv();ctx.state.term=null;ctx.state.customer=null;
 const customers=[{dataset:{id:'personal'}},{dataset:{id:'merchant'}}];const modes=[{dataset:{id:'within'}}];
 ctx.$$=s=>s==='#knownCustomerChips .chip'?customers:s==='#knownModeList .option'?modes:[];
 let termRerender=null;ctx.renderTermSelector=(id,callback)=>termRerender=callback;
 ctx.clearKnownError=id=>{item('#'+id).hidden=true;item('#'+id).textContent=''};
 item('#knownTermError').hidden=false;item('#knownTermError').textContent='请选择租期';
 item('#knownCustomerError').hidden=false;item('#knownCustomerError').textContent='请选择使用类型';
 item('#knownTermChips .other-term-input').value='';
 vm.runInContext(part('function renderKnown(){','function onlineMonthlyPrice('),ctx);ctx.renderKnown();
 ctx.state.term=6;termRerender();assert(item('#knownTermError').hidden);assert(!item('#knownCustomerError').hidden);
 customers[0].onclick();assert(item('#knownCustomerError').hidden);
});
test('P1-02 valid manual term typing clears only term error immediately',()=>{
 const {ctx,item}=makeEnv();ctx.renderTermSelector=()=>{};ctx.$$=()=>[];ctx.clearKnownError=id=>item('#'+id).hidden=true;
 item('#knownTermError').hidden=false;item('#knownCustomerError').hidden=false;
 vm.runInContext(part('function renderKnown(){','function onlineMonthlyPrice('),ctx);ctx.renderKnown();
 const input=item('#knownTermChips .other-term-input');input.value='6';input.listeners.input({target:input});assert(item('#knownTermError').hidden);assert(!item('#knownCustomerError').hidden);
});
test('P2-01 cancel restores recommendation choice and bound store/unit IDs',()=>{
 const {ctx,item}=makeEnv();ctx.state={flow:'estimate',screen:5,scene:'luggage',amount:'few',quantities:{bag:2},variants:{},addedP2:new Set(),itemsConfirmed:false,usageTargetOverride:null,preference:'balanced',r113Plan:'low',r113StoreId:'sanlitun',r113UnitId:'AB101'};
 ctx.$$=()=>Array.from({length:9},()=>({classList:{toggle(){}}}));ctx.canQuickEstimate=()=>true;ctx.renderItems=()=>{};ctx.renderLive=()=>{};ctx.renderUsage=()=>{};ctx.renderAmounts=()=>{};
 vm.runInContext(part('let navigationHistory=[];','$(\'#startBlank\').onclick='),ctx);
 ctx.go(4);assert(item('#navTitle').textContent.includes('3/4'),'S5->S4 shows valid progress');
 ctx.state.quantities.bag=9;ctx.state.r113Plan=null;ctx.state.r113StoreId='changed';ctx.state.r113UnitId='changed';ctx.cancelItemDraft();
 assert.equal(ctx.state.quantities.bag,2);assert.equal(ctx.state.r113Plan,'low');assert.equal(ctx.state.r113StoreId,'sanlitun');assert.equal(ctx.state.r113UnitId,'AB101');
});
test('P2-02 S3 buttons use grid not ineffective grid columns on flex',()=>{
 assert(html.includes('#s3 .phase3a-amount-actions{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)'));
 assert(html.includes('#s3 .phase3a-amount-actions.is-review-only{grid-template-columns:minmax(0,1fr)}'));
});
test('No new extra pricing, inventory, or cross-city data updates',()=>{
 assert(html.includes("state.searchOriginOverride=key;state.usageLocation=label;renderUsage()"));
 assert(html.includes("item_review_status:'not_applicable'"));
});
test('Embedded page scripts remain parsable',()=>{const matches=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];for(const m of matches)new vm.Script(m[1]);});
console.log(`Independent Fix V1.1: ${tests}/${tests} passed (source/VM; not browser E2E)`);
