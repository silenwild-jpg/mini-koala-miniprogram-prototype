/* Phase 2 P1 acceptance: S01 city must be scoped before sorting. Simulated DOM, not browser E2E. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),proto=path.join(root,'prototype');
const data=require(path.join(root,'data','mini_koala_data.js'));
const nodes=new Map();
function node(selector){
  if(nodes.has(selector))return nodes.get(selector);
  const classes=new Set();
  const item={textContent:'',innerHTML:'',value:'',style:{},dataset:{},scrollTop:0,
    classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x),contains:x=>classes.has(x)},
    querySelector:s=>node(`${selector} ${s}`),querySelectorAll:()=>[],addEventListener(){},setAttribute(){},focus(){},remove(){},click(){if(typeof item.onclick==='function')item.onclick({target:item,stopPropagation(){}})}};
  nodes.set(selector,item);return item;
}
const document={addEventListener(){},removeEventListener(){},querySelector:node,querySelectorAll:()=>[],body:node('body'),head:node('head')};
const location={search:'?state=browse&entry=browse_nearby&searchOriginKey=wangjing',href:'',pathname:'/prototype/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html'};
const context={document,location,localStorage:{getItem:()=>null,setItem:()=>{}},URLSearchParams,Date,Math,JSON,String,Number,Array,Object,Boolean,Set,Error,console,setTimeout:()=>0,clearTimeout:()=>{}};
context.window=context;context.globalThis=context;vm.createContext(context);
for(const file of ['mini_storage_business_ssot_v274.js','../data/mini_koala_data.js','mini_koala_physical_fit_v1.js','mini_koala_combo_match_v1.js','mini_koala_recommendation_policy_v2.js','mini_storage_requirement_recommendation_v274.js','mini_koala_phase2_ux.js','mini_koala_store_activity_demo_v1.js','mini_koala_location_permission_demo_v1.js']){
  const f=file.startsWith('../')?path.resolve(proto,file):path.join(proto,file);
  vm.runInContext(fs.readFileSync(f,'utf8'),context);
}
const source=fs.readFileSync(path.join(proto,'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html'),'utf8');
const scripts=[...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
assert.equal(scripts.length,1);
vm.runInContext(scripts[0][1],context);
function ids(expr){return Array.from(vm.runInContext(expr,context));}
function assertBeijing(order,label){
  assert(order.length>0,`${label}: expected some local stores`);
  assert(order.every(id=>data.getStore(id)?.city==='北京市'),`${label}: non-Beijing store leaked`);
  assert(!order.some(id=>data.getStore(id)?.store_name==='彩虹城店'),`${label}: Hangzhou Rainbow City leaked`);
}

let checks=0;function check(ok,msg){assert(ok,msg);checks++}
const all=ids("sortMode='recommended';browseDistanceKm='any';filteredOrder()");check(all.length>0,'normal browse results');
const flags=all.map(id=>vm.runInContext(`demoActivityFor(${JSON.stringify(id)})`,context));
for(const kind of ['special','moving','both','none'])check(flags.some(a=>kind==='special'?a.specialUnitIds.size&&!a.moving:kind==='moving'?!a.specialUnitIds.size&&a.moving:kind==='both'?a.specialUnitIds.size&&a.moving:!a.specialUnitIds.size&&!a.moving),'fixture coverage '+kind);
for(const selected of [[],['special'],['moving'],['single'],['special','moving'],['special','single'],['moving','single'],['special','moving','single']]){
 context.selected=selected;const result=ids("quickStoreFilters.clear();selected.forEach(k=>quickStoreFilters.add(k));filteredOrder()");
 check(result.every(id=>data.getStore(id).city==='北京市'),'city scope '+selected);
 check(result.every(id=>vm.runInContext(`passesQuickFilters(${JSON.stringify(id)})`,context)),'filter intersection '+selected);
 if(selected.includes('special'))check(result.every(id=>vm.runInContext(`demoActivityFor(${JSON.stringify(id)}).specialUnitIds.size>0`,context)),'available special units '+selected);
 if(selected.includes('moving'))check(result.every(id=>vm.runInContext(`demoActivityFor(${JSON.stringify(id)}).moving`,context)),'moving activity '+selected);
}
check(ids("quickStoreFilters.clear();filteredOrder()").length===all.length,'cancel restores list');
check(ids("quickStoreFilters.add('special');browseDistanceKm='0.01';filteredOrder()").length===0,'explicit distance never widened');
vm.runInContext("quickStoreFilters.clear();browseDistanceKm='any';state='estimated';termMonths=6;targetVolume=5",context);
for(const selected of [['single'],['special'],['special','single'],['moving','single'],['special','moving','single']]){
 context.selected=selected;const result=ids("quickStoreFilters.clear();selected.forEach(k=>quickStoreFilters.add(k));filteredOrder()");
 check(result.every(id=>vm.runInContext(`passesQuickFilters(${JSON.stringify(id)})`,context)),'demand filtering '+selected);
 if(selected.includes('single'))check(result.every(id=>vm.runInContext(`matchedDataFor(${JSON.stringify(id)}).matchType==='single'&&!matchedDataFor(${JSON.stringify(id)}).combo`,context)),'combo exclusion '+selected);
 if(selected.includes('special'))check(result.every(id=>vm.runInContext(`matchedDataFor(${JSON.stringify(id)}).matchedUnits.every(u=>demoActivityFor(${JSON.stringify(id)}).specialUnitIds.has(u.id))`,context)),'matching special units '+selected);
}
check(vm.runInContext("browseListHtml(filteredOrder()).includes('data-card-kind=\"ESTORE\"')",context)||ids('filteredOrder()').length===0,'independent EStore card retained');
const policy=context.MINI_KOALA_RECOMMENDATION_POLICY_V2;
const rows=[{id:'a',price:100,count:3,route:{km:1,m:5}},{id:'b',price:80,count:2,route:{km:2,m:8}},{id:'c',price:30,count:1,route:{km:6,m:12}}];
check(policy.rank(rows).rows[0].id==='a'&&policy.rank(rows).rows[1].id==='b','nearest then local cheapest');
check(policy.rank(rows.filter(r=>r.id!=='b')).rows[1].id==='c','expand cheap fallback when local candidate absent');
check(policy.rank([rows[2]]).estoreFirst,'zero within 3km EStore first');
check(policy.rank([rows[2]],{distanceLimit:3}).rows.length===0,'strict explicit radius');

const estHtml=fs.readFileSync(path.join(proto,'space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html'),'utf8');
function part(a,b){const i=estHtml.indexOf(a),j=estHtml.indexOf(b,i+a.length);assert(i>=0&&j>i);return estHtml.slice(i,j)}
const eNodes=new Map();const choices=[];
function el(q){if(!eNodes.has(q))eNodes.set(q,{style:{},hidden:false,innerHTML:'',textContent:'',scrollLeft:19,dataset:{},classList:{toggle(){}},focus(){},setAttribute(){},addEventListener(){},querySelector:el,querySelectorAll:()=>[]});return eNodes.get(q)}
const ectx={state:{scene:'luggage',amount:null,quantities:{},variants:{bag:'standard'},term:null},sceneCfg:{luggage:{name:'行李',desc:'行李',term:'按月',question:'多少行李',amounts:[{id:'few',title:'少量'}]},moving:{name:'搬家',desc:'家具',term:'按月',question:'多少东西',amounts:[{id:'small',title:'少量家具'}]}},items:{bag:{variants:{standard:{vol:1}}}},$ :el,$$:q=>q==='#amountList .amount-card'?choices:[],go:n=>ectx.lastScreen=n,applyPreset:()=>{ectx.state.quantities={bag:1}},calc:()=>({}),Object,Number,Math,Set,termDiscountLabel:()=> '7折'};
vm.createContext(ectx);vm.runInContext(part('const PHASE3A_QUICK_PRESETS=','function estimatorReviewStatus'),ectx);vm.runInContext(part('function renderAmounts(){','// Phase 3A:'),ectx);
choices.push({dataset:{id:'few'}});ectx.renderAmounts();choices[0].onclick();check(ectx.lastScreen===5,'simple amount selection advances directly');check(!ectx.state.itemsConfirmed,'quick preset is not misrepresented as reviewed');
ectx.lastScreen=null;ectx.state.scene='moving';ectx.state.amount=null;choices[0].dataset.id='small';ectx.renderAmounts();choices[0].onclick();check(ectx.lastScreen===null,'furniture stays for deliberate item review');check(!el('#amountActionBar').hidden,'furniture has one review action');el('#amountReviewBtn').onclick();check(ectx.lastScreen===4,'review action enters editable item list');
let updates=0;vm.runInContext(part('function renderTermSelector(','function estoreRule('),ectx);ectx.renderTermSelector('termChips',()=>updates++);const markup=el('#termChips').innerHTML;
check((markup.match(/data-term-quick=/g)||[]).length===6,'six quick terms');check(markup.includes('data-term-quick="36"')&&markup.includes('data-term-quick="60"')&&!markup.includes('data-term-quick="24"'),'3yr and 5yr replace 2yr');check(markup.includes('<div hidden class="other-term'),'custom term initially collapsed');el('.other-term-toggle').onclick();check(ectx.state.termCustomOpen&&updates===1,'custom term opens');ectx.state.term=17;ectx.renderTermSelector('termChips',()=>updates++);check(el('#termChips').innerHTML.includes('value="17"'),'1-60 month free input preserved');check(el('.term-scroll').scrollLeft===19,'horizontal position retained');
console.log('PASS confirmed UX runtime assertions: '+checks+' (simulated DOM; not browser screenshots)');
