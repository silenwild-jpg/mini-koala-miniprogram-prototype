const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),proto=path.join(root,'prototype');
const data=require(path.join(root,'data','mini_koala_data.js'));
const canonical='MK_BJ_2CDB7BEE', unit='BJ0112S01A009', sizeOption='MK_BJ_2CDB7BEE__4.72';
assert.equal(data.getStore(canonical).store_name,'惠新西街店');
for(const name of [
 'mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html',
 'mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html',
 'mini_storage_viewing_v01_v1_14_self_service_synced.html',
 'mini_storage_viewing_v02_v1_14_self_service_synced.html',
 'mini_storage_order_o02_v1_17_self_service_Visual_V2_7_4.html',
 'mini_storage_order_o03_v1_17_self_service_Visual_V2_7_4.html',
 'mini_storage_mine_m01_v1_11_self_service_Visual_V2_7_4.html',
 'mini_storage_renew_rn01_v2_7_4.html',
 'mini_storage_exit_ex01_v2_7_4.html'
]){
 const html=fs.readFileSync(path.join(proto,name),'utf8');
 const business=html.indexOf('mini_storage_business_ssot_v274.js');
 const canonicalData=html.indexOf('../data/mini_koala_data.js');
 assert(business>=0&&canonicalData>business,`${name}: canonical store data must load after business SSOT and before inline flow logic`);
}
// Prove canonical data extends the shared store map rather than falling back to a legacy alias.
const ctx={window:null,globalThis:null,console};ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(proto,'mini_storage_business_ssot_v274.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'data','mini_koala_data.js'),'utf8'),ctx);
assert.equal(ctx.MINI_STORAGE_MASTER_V222.stores[canonical].name,'惠新西街店');
assert.notEqual(ctx.MINI_STORAGE_MASTER_V222.stores[canonical].name,ctx.MINI_STORAGE_MASTER_V222.stores.jianguo.name);

// Execute S01 estimated state and verify every listed recommendation is a real inventory match.
const nodes=new Map();
function node(selector){if(nodes.has(selector))return nodes.get(selector);const classes=new Set();const current={textContent:'',innerHTML:'',value:'',hidden:false,style:{},dataset:{},open:false,scrollTop:0,classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x),contains:x=>classes.has(x)},querySelector:s=>node(`${selector} ${s}`),querySelectorAll:()=>[],scrollIntoView(){},addEventListener(){},setAttribute(){},focus(){},remove(){},click(){if(typeof current.onclick==='function')current.onclick({target:current,currentTarget:current,stopPropagation(){}})},closest(){return current;}};nodes.set(selector,current);return current;}
const document={querySelector:node,querySelectorAll:()=>[],body:node('body'),head:node('head')};
const location={search:'?state=estimated&target=4.8&term=6',href:'',pathname:'/prototype/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html'};
const localStorage={getItem:()=>null,setItem:()=>{}};
const c={window:null,globalThis:null,document,location,localStorage,URLSearchParams,Date,Math,JSON,String,Number,Array,Object,Boolean,Set,Error,setTimeout:()=>0,clearTimeout:()=>{},console};c.window=c;c.globalThis=c;vm.createContext(c);
vm.runInContext(fs.readFileSync(path.join(proto,'mini_storage_business_ssot_v274.js'),'utf8'),c);
vm.runInContext(fs.readFileSync(path.join(root,'data','mini_koala_data.js'),'utf8'),c);
vm.runInContext(fs.readFileSync(path.join(proto,'mini_storage_requirement_recommendation_v274.js'),'utf8'),c);
vm.runInContext(fs.readFileSync(path.join(proto,'mini_koala_phase2_ux.js'),'utf8'),c);
const s01=fs.readFileSync(path.join(proto,'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html'),'utf8');
const inline=[...s01.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(x=>x[1]);assert.equal(inline.length,1);vm.runInContext(inline[0],c);
const ids=vm.runInContext('filteredOrder()',c);
assert(ids.length>0,'estimated flow should have matched stores');
assert(ids.every(id=>vm.runInContext(`matchedDataFor(${JSON.stringify(id)}).hasMatch`,c)),'S01 estimated list must exclude 0-match stores');
assert(ids.every(id=>vm.runInContext(`matchedDataFor(${JSON.stringify(id)}).availableMatchedCount>0`,c)),'each recommended store must have available matched inventory');
assert.equal(vm.runInContext('visibleStoreCount',c),8);
assert((node('#storeList').innerHTML.match(/class="store demand-store/g)||[]).length<=8,'initial estimated render must be progressively limited');
if(ids.length>8){node('#loadMore').click();assert.equal(vm.runInContext('visibleStoreCount',c),16);}

const launcher=fs.readFileSync(path.join(proto,'index_visual_v2_7_4_8.html'),'utf8');
assert(launcher.includes(`store=${canonical}`));assert(launcher.includes(`unit=${unit}`));assert(launcher.includes(`sizeOption=${sizeOption}`));
assert(!launcher.includes('unit=C008&store=jianguo'),'current launcher must not use the old standard order fixture');
console.log('PASS V1.4 canonical store continuity, matched-only S01 recommendations, progressive loading, and refreshed demo fixture');

// Phase 2: execute the real list filter using the page's actual matched data.
const full=vm.runInContext("browseDistanceKm='any';filteredOrder()",c);
const limited=vm.runInContext("browseDistanceKm='5';filteredOrder()",c);
assert(limited.length<=full.length);
assert(limited.every(id=>vm.runInContext(`routeFor(${JSON.stringify(id)}).km<=5`,c)),'estimated distance filter must actually exclude out-of-radius stores');
document.querySelectorAll=selector=>selector.includes('[data-group="service"] .pill.active')?[{dataset:{value:'parking'}}]:[];
const serviced=vm.runInContext('filteredOrder()',c);
assert(serviced.every(id=>vm.runInContext(`stores[${JSON.stringify(id)}].services.includes('parking')`,c)),'estimated service filter is applied with radius');
vm.runInContext("browseDistanceKm='0.1';render()",c);
assert.equal(vm.runInContext('filteredOrder().length',c),0);
assert.equal(vm.runInContext('browseDistanceKm',c),'0.1','empty results must not silently widen radius');
assert(node('#storeList').innerHTML.includes('扩大距离范围'));
assert(node('#storeList').innerHTML.includes('调整服务筛选'));
console.log('PASS Phase 2 actual S01: matched-only results + distance + services + empty recovery preserve conditions');
