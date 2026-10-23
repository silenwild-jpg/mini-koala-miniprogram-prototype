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
const document={querySelector:node,querySelectorAll:()=>[],body:node('body'),head:node('head')};
const location={search:'?state=browse&entry=browse_nearby&searchOriginKey=wangjing',href:'',pathname:'/prototype/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html'};
const context={document,location,localStorage:{getItem:()=>null,setItem:()=>{}},URLSearchParams,Date,Math,JSON,String,Number,Array,Object,Boolean,Set,Error,console,setTimeout:()=>0,clearTimeout:()=>{}};
context.window=context;context.globalThis=context;vm.createContext(context);
for(const file of ['mini_storage_business_ssot_v274.js','../data/mini_koala_data.js','mini_storage_requirement_recommendation_v274.js','mini_koala_phase2_ux.js']){
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
assert.equal(vm.runInContext('searchLocation',context),'wangjing');
const byPrice=ids("sortMode='price';browseDistanceKm='any';filteredOrder()");
assertBeijing(byPrice,'browse price sort');
const values=byPrice.map(id=>vm.runInContext(`browseUnitPrice(${JSON.stringify(id)})`,context));
assert(values.every((v,i)=>i===0||values[i-1]<=v),'Beijing stores must still be sorted by price');
const byDistance=ids("sortMode='distance';filteredOrder()");
assertBeijing(byDistance,'browse distance sort');
const mins=byDistance.map(id=>vm.runInContext(`routeFor(${JSON.stringify(id)}).m`,context));
assert(mins.every((v,i)=>i===0||mins[i-1]<=v),'Beijing stores must still be sorted by travel time');
const shortDistance=ids("sortMode='price';browseDistanceKm='5';filteredOrder()");
assert(shortDistance.every(id=>byPrice.includes(id)),'distance filter cannot expand city scope');
assert(shortDistance.every(id=>vm.runInContext(`routeFor(${JSON.stringify(id)}).km<=5`,context)),'distance filter must still apply');
const blocked=ids("browseDistanceKm='0.01';filteredOrder()");
assert.equal(blocked.length,0,'no result should be preserved rather than filled with out-of-city stores');
assert.equal(vm.runInContext('browseDistanceKm',context),'0.01','must not auto-widen distance filter');
const browseCards=vm.runInContext(`browseListHtml(${JSON.stringify(byPrice.slice(0,4))})`,context);
assert(browseCards.includes('data-card-kind="ESTORE"'),'EStore service card remains separate from store sorting');
assert.equal((browseCards.match(/data-card-kind="ESTORE"/g)||[]).length,1);
assert.equal(data.getStoresByCity('杭州市').some(s=>s.store_name==='彩虹城店'),true,'original Hangzhou master data is not changed');
const estimated=ids("state='estimated';sortMode='price';browseDistanceKm='any';filteredOrder()");
assertBeijing(estimated,'estimated price sort');
const serviceNodes=[{dataset:{value:'parking'}}];
document.querySelectorAll=selector=>selector.includes('[data-group="service"] .pill.active')?serviceNodes:[];
const filtered=ids("state='browse';sortMode='price';filteredOrder()");
assertBeijing(filtered,'service filtered browse price sort');
assert(filtered.every(id=>vm.runInContext(`stores[${JSON.stringify(id)}].services.includes('parking')`,context)),'service filter must still apply');
console.log(`PASS Phase 2 P1 city scoping: Beijing-only price(${byPrice.length}), distance(${byDistance.length}), estimated(${estimated.length}), filters, empty recovery, EStore separation`);
