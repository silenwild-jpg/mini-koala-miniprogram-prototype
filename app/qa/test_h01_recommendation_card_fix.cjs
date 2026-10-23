const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const proto=path.join(root,'prototype');
const read=name=>fs.readFileSync(path.join(proto,name),'utf8');
const home=read('mini_storage_home_H01_Visual_V2_7_4_SSOT.html');
const section=(from,to)=>{
  const start=home.indexOf(from),end=home.indexOf(to,start);
  assert(start>=0&&end>start,`missing runtime section ${from}`);
  return home.slice(start,end);
};
function scenario(requirement,locationMode='precise'){
  const ctx={console,URLSearchParams,Date,Math,JSON,Number,String,Array,Object,Boolean,Error};
  ctx.window=ctx;
  ctx.homeParams=new URLSearchParams();
  ctx.homeOriginKey='guomao';
  ctx.homeLocationMode=locationMode;
  ctx.REQUIREMENT_KEY='requirement';
  ctx.assetObj=()=>requirement;
  vm.createContext(ctx);
  for(const name of ['mini_storage_business_ssot_v274.js','mini_koala_recommendation_policy_v2.js'])vm.runInContext(read(name),ctx);
  ctx.MINI_KOALA_DATA=require(path.join(root,'data/mini_koala_data.js'));
  ctx.MINI_KOALA_UXB_TAGS={html:()=>''};
  ctx.MINI_KOALA_STORE_ACTIVITY_DEMO={forStore:()=>({})};
  for(const name of ['mini_koala_physical_fit_v1.js','mini_koala_combo_match_v1.js','mini_storage_requirement_recommendation_v274.js'])vm.runInContext(read(name),ctx);
  vm.runInContext(section('const HOME_PRICE_RADIUS_KM=','function renderHomeStorePrices(){'),ctx);
  vm.runInContext(section('function renderHomeStorePrices(){','function renderTravelMode(){'),ctx);
  return ctx;
}
function state(ctx){return vm.runInContext('({rows:HOME_RECOMMENDATIONS,meta:HOME_RECOMMENDATION_META})',ctx)}
function card(){
  const nodes=new Map();
  const get=key=>{
    if(!nodes.has(key))nodes.set(key,{dataset:{},style:{},textContent:'',innerHTML:'',title:'',classList:{add(){},remove(){}},querySelector(){return null}});
    return nodes.get(key);
  };
  const price=get('[data-home-price][data-store-price]');
  price.querySelector=key=>key==='b'?get('price-b'):null;
  return {
    dataset:{},style:{},
    querySelector:key=>get(key),
    querySelectorAll:key=>key==='[data-home-price][data-store-price]'?[price]:[],
    get
  };
}
function render(ctx){
  const cards=[card(),card(),card()];
  ctx.document={querySelectorAll:()=>cards};
  ctx.$$=selector=>selector==='[data-home-price][data-store-price]'?cards.map(c=>c.get('[data-home-price][data-store-price]')):[];
  vm.runInContext('renderHomeStorePrices()',ctx);
  return cards;
}

const browse=scenario({});
const b=state(browse),bCards=render(browse);
assert.equal(b.rows.length,3);
assert.equal(b.meta[0].badge,'离您最近');
if(b.meta[1].badge==='区域低价')assert(b.rows[1].route.km<=3);
if(b.meta[1].badge)assert(b.rows[1].price<b.rows[0].price);
assert.equal(bCards[0].get('[data-home-price][data-store-price]').dataset.priceLabel,'参考单价');
assert.match(bCards[0].get('price-b').innerHTML,/\/月\/m³起/);
assert.match(bCards[0].get('.featured-inventory b').textContent,/剩余仓位：/);

const demand=scenario({target_volume:4.8,min_volume:4.3,max_volume:5.5,term_months:6});
const d=state(demand),dCards=render(demand);
assert(d.rows[0].matched,'demand must produce a matched first card');
const matched=d.rows[0].matched;
const summary=dCards[0].get('.featured-inventory b').textContent;
assert.match(summary,new RegExp(`匹配仓位：${matched.availableMatchedCount}个`));
assert.match(summary,/匹配容量：/);
assert(!summary.includes('剩余仓位：'),'matched card must not show whole-store inventory');
const total=dCards[0].get('[data-home-price][data-store-price]');
assert.equal(total.dataset.priceLabel,'整期租金 · 6个月');
assert.match(dCards[0].get('price-b').innerHTML,/¥[\d,]+.*起/);
assert(!dCards[0].get('price-b').innerHTML.includes('/6个月起'));
if(d.meta[1].badge)assert(d.rows[1].price<d.rows[0].price);
assert.equal(state(scenario({},'unknown')).meta[0].badge,'推荐门店','unknown location cannot claim nearest');
console.log('PASS H01 recommendation card: 3km expansion, browse unit price, matched facts and term-total label');
