const assert=require('assert');const fs=require('fs');const path=require('path');const vm=require('vm');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'prototype');
const store=new Map(),localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),clear:()=>store.clear()};
const location={href:'http://demo.invalid/prototype/product_demo_hub_v1.html',pathname:'/prototype/product_demo_hub_v1.html',search:''};
const window={},document={readyState:'loading',addEventListener(){},querySelector(){return null;},getElementById(){return null;},head:{appendChild(){}},createElement(){return {}}};
const context={window,localStorage,location,document,URL,URLSearchParams,Date,console};vm.createContext(context);
const run=(name)=>vm.runInContext(fs.readFileSync(path.join(dir,name),'utf8'),context,{filename:name});
run('mini_storage_business_ssot_v274.js');run('mini_storage_demo_fixture_v2.js');
const D=window.MINI_KOALA_DEMO_V2,read=k=>JSON.parse(localStorage.getItem(k)||'null');let total=0;
function test(name,fn){fn();console.log('PASS',name);total++}
test('canonical price invariant and exact capacity',()=>{
  const no=D.scenarioFacts('none'),yes=D.scenarioFacts('coupon');
  assert.equal(no.upfront_payable,4063);assert.equal(yes.upfront_payable,3863);
  assert.equal(yes.volume_exact_m3,4.72);assert(yes.monthly_display_is_approximate);
  assert.equal(yes.rent_before_coupon,3440);assert.equal(yes.rent_after_coupon,3240);
  assert.equal(Math.round(3440/6),573);
});
test('coupon quick story seeds correct coherent quote and wallet',()=>{
  D.q01('coupon');const q=read(D.K.quote),p=read(D.K.price);
  assert.equal(q.upfront_payable,3863);assert.equal(q.coupon_discount_amount,200);assert.equal(p.upfront_payable,3863);
  assert.equal(q.scenario_id,p.scenario_id);assert.equal(read('mini_koala_coupon_wallet_v1')[0].coupon_id,'CPN-001');
  const url=new URL(location.href,'http://demo.invalid/prototype/');assert.equal(url.searchParams.get('volume'),'4.72');assert.equal(url.searchParams.get('initialPayable'),'3863');assert.equal(url.searchParams.get('start'),D.scenarioFacts().start_date);
});
test('no-coupon quick story clears cross-fixture coupon leakage',()=>{
  D.q01('active');assert.equal(read(D.K.quote).upfront_payable,4063);assert.equal(read(D.K.price).coupon_applied,false);
  assert.equal(localStorage.getItem('mini_koala_coupon_wallet_v1'),null);
  assert.equal(localStorage.getItem('mini_koala_coupon_selection_v1'),null);
});
test('direct O01 coupon route retains payable and unit precision',()=>{
  D.o01('coupon');const url=new URL(location.href,'http://demo.invalid/prototype/');
  assert.equal(url.searchParams.get('volume'),'4.72');assert.equal(url.searchParams.get('initialPayable'),'3863');
  assert.equal(read(D.K.quote).upfront_payable,read(D.K.price).upfront_payable);
});
test('lease date add-month arithmetic matches same scenario',()=>{
  for(const state of ['ending','exiting','historical']){
    D.seed(state);const o=read(D.K.order);
    assert.equal(o.term_months,6);
    const expected=D.leaseEndDate(o.start_date,o.term_months);
    assert.equal(o.end_date,expected,`${state}: ${o.start_date} -> ${o.end_date}, expected ${expected}`);
  }
});
// The facts helper can initialize with a no-UI pathname; routeFor is still available to test.
location.pathname='/prototype/empty.html';vm.runInContext(fs.readFileSync(path.join(root,'data','mini_koala_data.js'),'utf8'),context,{filename:'mini_koala_data.js'});run('mini_koala_acceptance_v11_facts_patch.js');
test('S01/S02 use one store+origin+travel deterministic fallback',()=>{
  const f=window.MINI_KOALA_FACTS_V11;assert(f);
  const id='MK_BJ_2CDB7BEE';
  for(const origin of ['guomao','sanyuanqiao','wangjing'])for(const mode of ['drive','bike','walk']){
    const r=f.routeFor(id,origin,mode);
    const profile=window.MINI_KOALA_DATA?.getStore?.(id)||{};
    const seed=[...id].reduce((sum,ch)=>sum+ch.charCodeAt(0),0);
    const district=origin==='wangjing'||origin==='sanyuanqiao'||origin==='guomao'?'朝阳区':'';
    const km=Number(((profile.city==='北京市'?(profile.district===district?1.2:4.8):35)+(seed%58)/10).toFixed(1));
    const minutes=mode==='bike'?Math.max(8,Math.round(km*4.8)):mode==='walk'?Math.max(12,Math.round(km*12.5)):Math.max(6,Math.round(4+km*2.15+(seed%4)));
    assert.equal(r.km,km);assert.equal(r.m,minutes);
  }
  assert(f.routeFor('jianguo','guomao','drive').km===3.2);
});
test('S02 route label and all travel options are corrected after page initialization',()=>{
  const labels={routeText:{innerHTML:''},distanceContextDesc:{textContent:''}};
  const flags=new Set(['hidden']);labels.distanceContext={classList:{toggle:(k,enabled)=>enabled?flags.add(k):flags.delete(k),contains:k=>flags.has(k)}};
  const options=['drive','bike','walk'].map(mode=>({dataset:{travel:mode},inner:'',handlers:{},querySelector(){return this.span||(this.span={textContent:''});},addEventListener(type,cb){this.handlers[type]=cb}}));
  document.getElementById=id=>labels[id]||null;
  document.querySelectorAll=selector=>selector==='#travelSheet .option[data-travel]'?options:[];
  vm.runInContext(`const travel={drive:{icon:'🚗',label:'驾车',m:8,km:3.2},bike:{icon:'🚲',label:'骑行',m:14,km:3},walk:{icon:'🚶',label:'步行',m:38,km:2.8}};let travelMode='drive';let storeId='MK_BJ_2CDB7BEE';let searchOriginKey='sanyuanqiao';let searchMin=8;let searchKm=3.2;let accessFrequency='high';`,context);
  location.pathname='/prototype/mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html';
  run('mini_koala_acceptance_v11_facts_patch.js');
  const drive=window.MINI_KOALA_FACTS_V11.routeFor('MK_BJ_2CDB7BEE','sanyuanqiao','drive');
  assert(labels.routeText.innerHTML.includes(drive.km.toFixed(1)+'km'));
  assert(options[0].span.textContent.includes(drive.km.toFixed(1)+'km'));
  const bike=window.MINI_KOALA_FACTS_V11.routeFor('MK_BJ_2CDB7BEE','sanyuanqiao','bike');
  vm.runInContext("travelMode='bike'",context);options[1].handlers.click();
  assert(labels.routeText.innerHTML.includes(bike.km.toFixed(1)+'km'));
  assert.equal(vm.runInContext('searchKm',context),bike.km);
});
test('display check uses whole-term total not rounded average × months',()=>{
  const f=window.MINI_KOALA_FACTS_V11;
  assert.equal(f.checkMoney(D.priceSnapshot('none')).payable,4063);
  assert.equal(f.checkMoney(D.priceSnapshot('coupon')).payable,3863);
  assert.equal(f.checkMoney(D.priceSnapshot('coupon')).monthly_approx,573);
});
test('core page body frozen and internal hub has distinct snapshot entries',()=>{
  const hub=fs.readFileSync(path.join(dir,'product_demo_hub_v1.html'),'utf8');
  assert(hub.includes('data-q01="coupon"')&&hub.includes('data-o01="none"'));
  assert(hub.includes("bind('[data-o01]'"));
  const story=fs.readFileSync(path.join(dir,'mini_koala_internal_demo_v1.js'),'utf8');
  assert(!story.includes('min=4.5&max=5.0'));assert(story.includes('min=${canon.min}&max=${canon.max}'));
});
console.log(`RESULT ${total}/${total} PATCH B focused checks PASSED`);
