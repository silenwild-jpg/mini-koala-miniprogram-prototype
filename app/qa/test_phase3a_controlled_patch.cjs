const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const file='prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html';
const html=fs.readFileSync(file,'utf8');
let count=0;
function test(label,fn){fn();count++;console.log('PASS '+label)}
function part(start,end){const i=html.indexOf(start),j=html.indexOf(end,i+start.length);assert(i>=0&&j>i,'missing source section '+start);return html.slice(i,j)}
const seed=part('const sceneCfg = {','let returnStoreContext=null;')+part('let returnStoreContext=null;','const $=')+part('function invalidateUsageRequirement(){','function renderEntry(){')+part('const PHASE3A_QUICK_PRESETS=','function itemCard(id,priority){');
const env={Set,Math,Number,Object,console};vm.createContext(env);vm.runInContext(seed,env);
function value(expr){return vm.runInContext(expr,env)}
function select(scene,amount){vm.runInContext(`state.flow='estimate';state.scene='${scene}';state.amount='${amount}';applyPreset()`,env)}
test('Conservative whitelist of quick presets',()=>{
 const good={luggage:['few','more','group'],seasonal:['personal','family'],household:['light'],collection:['small']};
 for(const [scene,ids] of Object.entries(good))for(const id of ids){select(scene,id);assert(value('canQuickEstimate(state.scene,state.amount,state.quantities)'),scene+':'+id)}
 const bad={moving:['single','onebed','twobed'],renovation:['part','room','whole'],seasonal:['plus'],household:['mid','more'],collection:['mid','more'],merchant:['light','mid','large'],enterprise:['file','furniture','mixed']};
 for(const [scene,ids] of Object.entries(bad))for(const id of ids){select(scene,id);assert(!value('canQuickEstimate(state.scene,state.amount,state.quantities)'),scene+':'+id)}
});
test('Zero-volume and special long item are never quick',()=>{
 select('luggage','few');vm.runInContext('state.quantities={};',env);assert(!value('canQuickEstimate(state.scene,state.amount,state.quantities)'));
 select('luggage','few');vm.runInContext('state.quantities.guitar=1;',env);assert(!value('canQuickEstimate(state.scene,state.amount,state.quantities)'));
});
test('Quick and confirmed item volume calculations are identical',()=>{
 select('seasonal','personal');const a=value('calc().target');vm.runInContext('state.itemsConfirmed=true',env);
 assert.equal(value('calc().target'),a);assert.equal(value('estimatorReviewStatus()'),'items_reviewed');
 vm.runInContext('state.itemsConfirmed=false',env);assert.equal(value('estimatorReviewStatus()'),'preset_unreviewed');
});
test('Choosing another amount invalidates former confirmation',()=>{
 select('household','light');vm.runInContext('state.itemsConfirmed=true;state.amount="mid";applyPreset()',env);
 assert.equal(value('state.itemsConfirmed'),false);
});
test('S3 selection does not force S4 and quick button goes straight to S5',()=>{
 const els={};const buttons=[];
 const mk=(id)=>els[id]||(els[id]={textContent:'',innerHTML:'',style:{},hidden:false,classList:{toggle(){},add(){}},dataset:{}});
 env.$=s=>mk(s);env.$$=s=>s==='#amountList .amount-card'?buttons:[];env.go=n=>{env.screen=n};
 vm.runInContext('state.scene="luggage";state.amount=null;state.itemsConfirmed=false',env);
 vm.runInContext(part('function renderAmounts(){','// Phase 3A:'),env);
 buttons.push({dataset:{id:'few'},onclick:null});
 vm.runInContext('renderAmounts()',env);
 buttons[0].onclick();
 assert.equal(value('state.screen'),1); // not force navigated to item page
 assert.equal(vm.runInContext('state.amount',env),'few');
 assert.equal(mk('#amountQuickBtn').hidden,false);
 mk('#amountQuickBtn').onclick();
 assert.equal(env.screen,5);
});
test('Actual navigation skips unvisited S4 and restores S4 draft on cancel',()=>{
 const elements={};let loc={href:''};
 function element(q){return elements[q]||(elements[q]={style:{},textContent:'',classList:{toggle(){}},click(){this.onclick?.()},dataset:{}})}
 const page={state:{flow:'estimate',screen:1,scene:'luggage',amount:'few',quantities:{bag:3},variants:{},addedP2:new Set(),itemsConfirmed:false,preference:'balanced',usageTargetOverride:null},
   $:element,$$:()=>Array.from({length:9},()=>({classList:{toggle(){}}})),renderScenes(){},renderAmounts(){},renderItems(){},renderLive(){},renderUsage(){},renderKnown(){},renderResult(){},renderUnits(){},
   location:loc,homeFile:'home.html',returnStoreContext:null,returnListContext:null,canQuickEstimate:()=>true,
   s01File:'s01.html',URLSearchParams,Set,Object,Math,Number};
 vm.createContext(page);vm.runInContext(part('let navigationHistory=[];','$(\'#startBlank\').onclick='),page);
 page.go(3,{initial:true});page.go(5);assert.equal(page.state.screen,5);
 page.$('#backBtn').onclick();assert.equal(page.state.screen,3);
 page.go(4);page.state.quantities.bag=15;
 page.$('#backBtn').onclick();assert.equal(page.state.screen,3);assert.equal(page.state.quantities.bag,3);
 page.go(5);page.go(4);page.$('#backBtn').onclick();assert.equal(page.state.screen,5);
});
test('Known size starts empty, never treats example value as confirmed',()=>{
 assert(html.includes('knownSize:null,knownMode:'));
 assert(html.includes('placeholder="例如：3.5"'));
 assert(!html.includes('id="knownInput" min="0.1" step="0.1" type="number" value="5"'));
 assert(html.includes("state.knownSize==null?'':state.knownSize"));
 assert(html.includes("state.knownSize=hasSourceSize?sourceSize:null"));
 assert(html.includes("state.knownMode='about'"));
});
test('Known size validates volume, term and customer without silently defaulting',()=>{
 for(const s of ['Number.isFinite(entered)','state.term<1||state.term>60',"['personal','merchant','enterprise'].includes(state.customer)","showKnownError('knownInputError'","showKnownError('knownTermError'","showKnownError('knownCustomerError'"])assert(html.includes(s),s);
});
test('Known-size form validates sequentially and commits only after all required fields',()=>{
 const els={},saved=[];let navigated=0;
 const get=(q)=>els[q]||(els[q]={hidden:true,textContent:'',value:'',tagName:q==='#knownInput'?'INPUT':'DIV',scrollIntoView(){},focus(){},style:{}});
 const c={state:{knownSize:null,term:null,customer:null,knownMode:'about'},$:get,onlineMonthlyPrice:()=>200,leadLevelFor:()=> 'none',
   activeEstimatorSearchContext:()=>({travel:'drive',origin:'guomao'}),estimatorUsageLocationLabel:()=> '北京·国贸',saveRequirementSnapshot:o=>saved.push(o),openEstimateResult:()=>navigated++,Number,Object,Math};
 vm.createContext(c);vm.runInContext(part("$('#knownInput').oninput=","$('#backHomeBrowse').onclick="),c);
 get('#knownNextBtn').onclick();assert.equal(navigated,0);assert(!get('#knownInputError').hidden);
 c.state.knownSize=3.5;get('#knownNextBtn').onclick();assert.equal(navigated,0);assert(!get('#knownTermError').hidden);
 c.state.term=6;get('#knownNextBtn').onclick();assert.equal(navigated,0);assert(!get('#knownCustomerError').hidden);
 c.state.customer='personal';get('#knownNextBtn').onclick();assert.equal(navigated,1);
 assert.equal(saved.length,1);assert.equal(saved[0].size_mode,'about');assert.equal(saved[0].target_volume,3.5);
 assert.equal(saved[0].item_review_status,'not_applicable');assert.equal(saved[0].item_summary,'');assert.equal(saved[0].has_oversize,false);
});
test('Estimating after known-size clears previous range semantics',()=>{
 const section=html.slice(html.indexOf('const saveEffectiveRequirement='),html.indexOf('const continueToRecommendedUnit='));
 assert(section.includes("size_mode:'about'"));
 const later=html.slice(html.indexOf("$('#toRealBtn').onclick="),html.indexOf("$('#toggleMore').onclick="));
 assert(later.includes("size_mode:'about'"));
});
test('Requirement snapshot distinguishes shortcut and confirmed items',()=>{
 assert(html.includes('item_review_status:estimatorReviewStatus()'));
 assert(html.includes("item_review_status:'not_applicable'"));
 assert(html.includes('地面空间'));
 assert(!html.includes('已调整找仓容量，原物品清单保留')); 
 assert(html.includes('reviewButton.onclick=()=>go(4)'));
});
test('Existing Phase 2 location and screen routing are retained',()=>{
 assert(html.includes('state.searchOriginOverride=key;state.usageLocation=label;renderUsage()'));
 assert(html.includes('window.MINI_KOALA_PHASE2.listParams(returnListContext'));
 for(const route of ['ESTIMATOR_MERGED_R113','ESTIMATOR_USAGE_TO_S01','KNOWN_SIZE'])assert(html.includes(route));
});
test('All embedded scripts parse',()=>{
 const matches=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
 assert(matches.length>0);for(const m of matches)new vm.Script(m[1]);
});
console.log(`Phase 3A target tests: ${count}/${count} passed; DOM simulation only, not browser/WeChat E2E`);
