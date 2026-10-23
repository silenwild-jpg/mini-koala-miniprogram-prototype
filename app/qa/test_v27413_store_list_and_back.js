const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const path=require('path');

const root=path.resolve(__dirname,'..');
const prototype=path.join(root,'prototype');
const data=require(path.join(root,'data','mini_koala_data.js'));
const nodes=new Map();
function node(selector){
  if(nodes.has(selector))return nodes.get(selector);
  const classes=new Set();
  const current={
    textContent:'',innerHTML:'',value:'',hidden:false,style:{},dataset:{},open:false,scrollTop:0,
    classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x),contains:x=>classes.has(x)},
    querySelector:s=>node(`${selector} ${s}`),querySelectorAll:()=>[],
    scrollIntoView(){},addEventListener(){},setAttribute(){},focus(){},remove(){},click(){if(typeof current.onclick==='function')current.onclick({target:current,currentTarget:current,stopPropagation(){}})},closest(){return current;}
  };
  nodes.set(selector,current);
  return current;
}
const document={querySelector:node,querySelectorAll:()=>[],body:node('body'),head:node('head')};
const location={search:'?state=browse&entry=browse_nearby',href:'',pathname:'/prototype/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html'};
const localStorage={getItem:()=>null,setItem:()=>{}};
const context={window:null,document,location,localStorage,URLSearchParams,Date,Math,JSON,String,Number,Array,Object,Boolean,Error,setTimeout:()=>0,clearTimeout:()=>{},console};
context.window=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(prototype,'mini_storage_business_ssot_v274.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'data','mini_koala_data.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(prototype,'mini_storage_requirement_recommendation_v274.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(prototype,'mini_koala_phase2_ux.js'),'utf8'),context);

const file=path.join(prototype,'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html');
const html=fs.readFileSync(file,'utf8');
const scripts=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1]);
assert.equal(scripts.length,1);
assert.doesNotThrow(()=>vm.runInContext(scripts[0],context),'S01 browse script must initialize');

assert(!html.includes('id="resultCount"'));
assert(!html.includes('已找到 ${ids.length} 家门店'));
assert(html.includes('browse-stock-line'));
assert(html.includes('browse-unit-price'));
assert(html.includes('storeUnitPriceFrom(id)'));
assert(html.includes('homeDefaultDisplayDiscountFactor'));

const order=vm.runInContext('filteredOrder()',context);
const beijingCount=data.stores.filter(store=>store.city==='北京市').length;
assert(beijingCount>0);
assert(order.slice(0,beijingCount).every(id=>data.getStore(id).city==='北京市'),'Beijing stores must come first');
const firstRoutes=order.slice(0,beijingCount).map(id=>vm.runInContext(`routeFor(${JSON.stringify(id)})`,context));
assert(firstRoutes.every(route=>route.km>0&&route.m>=6&&route.m<90));
assert(firstRoutes.every((route,index)=>index===0||firstRoutes[index-1].m<=route.m),'Beijing stores must be distance sorted');

const firstId=order[0];
const expectedAverage=Math.round(data.storeUnitPriceFrom(firstId)*data.homeDefaultDisplayDiscountFactor);
const listHtml=node('#storeList').innerHTML;
assert(listHtml.includes(`data-id="${firstId}"`));
assert(listHtml.includes(`${expectedAverage}元`));
assert(listHtml.includes('/月/m³'));
assert(listHtml.includes('剩余仓位'));

assert(!html.includes('门店平均立方米单价'));
assert(!html.includes('按本店当前正价可租仓位加权平均'));
assert(html.includes("state!=='browse'&&index===0?'<span class=\"store-recommend-badge\">推荐</span>':''"));
assert(!html.includes('d?.badge'));
const estimator=fs.readFileSync(path.join(prototype,'space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html'),'utf8');
assert(estimator.includes('MINI_STORAGE_REQUIREMENT_RECOMMENDATION_V274.recommend'));
assert(estimator.includes('storeName:row.profile.store_name||row.profile.name'));
assert(estimator.includes('storeDistrict:row.profile.district'));
assert(estimator.includes('class="rplan-district"'));
assert(estimator.includes('class="rplan-address"'));
assert(!estimator.includes('${x.store}</div>'));
const s02=fs.readFileSync(path.join(prototype,'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html'),'utf8');
assert(!s02.includes('id="mapLink"'));
assert(!s02.includes('<div class="address-row">'));
const u01=fs.readFileSync(path.join(prototype,'mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html'),'utf8');
assert(!u01.includes('conversionPlain'));
assert(!u01.includes('itemPlain'));
assert(!u01.includes('oversizePlain'));

for(const name of [
  'mini_storage_business_b2b01_r113_Visual_V2_7_4.html',
  'mini_storage_contract_c01_v1_agreement_confirm_Visual_V2_7_4.html',
  'mini_storage_order_o02_v1_17_self_service_Visual_V2_7_4.html',
  'mini_storage_order_o03_v1_17_self_service_Visual_V2_7_4.html',
  'mini_storage_referral_ref01_v1.html'
]){
  assert(fs.readFileSync(path.join(prototype,name),'utf8').includes('MINI_KOALA_NAV.safeBack'),`${name} must use safe back navigation`);
}
assert(fs.readFileSync(path.join(prototype,'mini_storage_global_support_v274.js'),'utf8').includes('function safeBack(fallback)'));

console.log('PASS V2.7.4.13: safe returns, removed result count, Beijing-first distance order, unified 65%-discounted minimum m³ discovery price, and no-wrap inventory line');
