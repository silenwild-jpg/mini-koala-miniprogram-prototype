const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..'),P=path.join(root,'prototype'),read=n=>fs.readFileSync(path.join(P,n),'utf8');
const storage=new Map(),ctx={window:null,console,URLSearchParams,Date,Math,JSON,Number,String,Array,Object,Boolean,Error,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)}};ctx.window=ctx;vm.createContext(ctx);
for(const n of ['mini_storage_business_ssot_v274.js','mini_koala_recommendation_policy_v2.js','mini_koala_asset_resume_v2.js','mini_storage_price_gate_v1.js','mini_storage_demo_fixture_v2.js'])vm.runInContext(read(n),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'data/mini_koala_data.js'),'utf8'),ctx);
for(const n of ['mini_koala_physical_fit_v1.js','mini_koala_combo_match_v1.js','mini_storage_requirement_recommendation_v274.js'])vm.runInContext(read(n),ctx);
let n=0;const test=(title,fn)=>{fn();console.log('PASS '+title);n++},rank=ctx.MINI_KOALA_RECOMMENDATION_POLICY_V2.rank;
const row=(id,km,price,type='single')=>({id,route:{km,m:km*3},price,matchType:type,count:10});
test('nearest and radius-local cheapest are distinct',()=>assert.deepEqual(Array.from(rank([row('a',1,100),row('b',2,90),row('c',2.9,50),row('d',7,10)]).rows.map(r=>r.id)).slice(0,2),['a','c']));
test('search expands to first radius with a cheaper candidate',()=>assert.equal(rank([row('a',1,100),row('b',4,90),row('c',8,10)]).rows[1].id,'b'));
test('zero candidates in radius puts E-storage first',()=>assert(rank([row('a',4,100),row('b',8,10)]).estoreFirst));
test('explicit filter never broadens range',()=>{const r=rank([row('a',4,100)],{distanceLimit:3});assert.equal(r.rows.length,0);assert.equal(r.estoreFirst,false)});
test('nearest real match may be a valid combo',()=>assert.equal(rank([row('a',1,10,'combo'),row('b',4,90,'single')],{demand:true}).rows[0].id,'a'));
test('unlocated ranking never uses distance',()=>{const a=[row('a',1,50),row('b',20,10)];a[1].count=100;assert.equal(rank(a,{located:false}).rows[0].id,'b');assert.equal(rank(a,{located:false}).estoreFirst,false)});
const D=ctx.MINI_KOALA_DEMO_V2;
const quote=(coupon="none")=>{D.activatePricingScenario(coupon);return JSON.parse(storage.get(D.K.quote))};
const pending=()=>{D.seed("pending_payment");return JSON.parse(storage.get(D.K.order))};
for(const coupon of ['none','coupon'])test('canonical '+coupon+' snapshot identity and gate',()=>{
 const s=D.priceSnapshot(coupon),asset=quote(coupon),params=new URLSearchParams();
 assert(ctx.MINI_KOALA_ASSET_RESUME_V2.restore(asset,params));
 const result=ctx.MINI_KOALA_PRICE_GATE_V1.validate(JSON.parse(storage.get(D.K.price)),{storeId:params.get('store'),sizeOptionId:params.get('sizeOption'),representativeUnitNo:params.get('representativeUnit'),actualUnitId:params.get('actualUnit'),termRaw:params.get('term'),pricingModelVersion:ctx.MINI_STORAGE_MASTER_V222.pricing.model_version,managementFee:50,couponVerifier:()=>({valid:true})});
 assert(result.valid,result.reason);assert.equal(result.values.payable,coupon==='coupon'?3863:4063);
});
test('pending order owns snapshot and restores identity',()=>{const o=pending(),p=new URLSearchParams();assert(o.price_snapshot);assert(ctx.MINI_KOALA_ASSET_RESUME_V2.restore(o,p));assert.equal(p.get('actualUnit'),D.C.unit_id)});
test('saved quote survives unrelated current snapshot',()=>{const q=quote(),bad={...D.priceSnapshot(),store_id:'OTHER'};storage.set(D.K.price,JSON.stringify(bad));assert(ctx.MINI_KOALA_ASSET_RESUME_V2.restore(q,new URLSearchParams()));assert.equal(JSON.parse(storage.get(D.K.price)).store_id,q.store_id)});
test('missing or mismatched identity does not fabricate quote',()=>{storage.delete(D.K.price);assert.equal(ctx.MINI_KOALA_ASSET_RESUME_V2.restore({...quote(),unit_id:'OTHER'},new URLSearchParams()),false)});
test('price gate still rejects wrong term and wrong identity',()=>{const s=D.priceSnapshot(),base={storeId:s.store_id,sizeOptionId:s.size_option_id,representativeUnitNo:s.representative_unit_no,actualUnitId:s.actual_unit_id,termRaw:'6',pricingModelVersion:s.pricing_model_version,managementFee:50};assert.equal(ctx.MINI_KOALA_PRICE_GATE_V1.validate(s,{...base,termRaw:'12'}).reason,'TERM_MISMATCH');assert.equal(ctx.MINI_KOALA_PRICE_GATE_V1.validate(s,{...base,sizeOptionId:'OTHER'}).reason,'IDENTITY_MISMATCH')});
const R=ctx.MINI_STORAGE_REQUIREMENT_RECOMMENDATION_V274;
for(const target of [4.8,7.4])test('real inventory matching stores are ranked by distance '+target,()=>{const result=R.recommend({target,min:target===4.8?4.3:6.5,max:target===4.8?5.5:8.5,term:6});assert(result.rows.length);assert(result.rows[0].hasMatch);assert(result.rows.every(row=>row.hasMatch));assert.equal(result.rows[0].route.km,Math.min(...result.rows.map(row=>row.route.km)))});
test('undersized replacement is excluded',()=>{assert(!R.isReasonableAlternative(1.6,4.7));assert(!R.isReasonableAlternative(4,4.7))});
// Execute actual home resume handlers and then actual Q/O gate setup, rather than mirror their implementations.
const home=read('mini_storage_home_H01_Visual_V2_7_4_SSOT.html');
const extract=(src,start,end)=>src.slice(src.indexOf(start),src.indexOf(end,src.indexOf(start)));
ctx.assetObj=k=>JSON.parse(storage.get(k)||'{}');ctx.QUOTE_KEY=D.K.quote;ctx.ORDER_KEY=D.K.order;ctx.q01File=D.P.Q01;ctx.o01File=D.P.O01;ctx.hsiQuoteTrusted=()=>true;ctx.hsiQuoteExpired=()=>false;ctx.hsiValidPending=()=>true;ctx.toast=()=>{};ctx.location={href:''};
vm.runInContext(extract(home,'function openSavedQuote(){','function openSavedOrder'),ctx);
vm.runInContext(extract(home,'function openPendingOrder(){',"$('#modifyRequirement')"),ctx);
for(const [fn,asset,page] of [['openSavedQuote',quote(),D.P.Q01],['openPendingOrder',pending(),D.P.O01]])test('actual '+fn+' destination gate remains valid',()=>{
 storage.set(fn==='openSavedQuote'?D.K.quote:D.K.order,JSON.stringify(asset));ctx[fn]();assert(ctx.location.href.startsWith(page));
 const other={...ctx,window:null,location:{search:'?'+ctx.location.href.split('?')[1]}};other.window=other;vm.createContext(other);
 let src=read(page),block=extract(src,'const p=new URLSearchParams(location.search);','const values=gateResult.values;');
 vm.runInContext(block+'\nglobalThis.__gate=gateResult;',other);assert(other.__gate.valid,other.__gate.reason);
});
for(const located of [true,false])test('actual homepage uses policy with H01 three-kilometre radius '+located,()=>{
 const hc={...ctx,window:null,homeParams:new URLSearchParams(),homeOriginKey:'guomao',homeLocationMode:located?'precise':'unknown',REQUIREMENT_KEY:D.K.req,assetObj:()=>({})};hc.window=hc;vm.createContext(hc);
 const section=extract(home,'const HOME_PRICE_RADIUS_KM=','const HOME_STORE_PLACEHOLDER=');vm.runInContext(section+'\nglobalThis.__homeRows=HOME_RECOMMENDATIONS;',hc);
 const candidates=ctx.MINI_KOALA_DATA.stores.filter(p=>p.city==='北京市'&&p.available_unit_count>0).map(p=>({id:p.store_id,price:Math.round(ctx.MINI_KOALA_DATA.storeUnitPriceFrom(p.store_id)*.65),count:p.available_unit_count,route:R.routeFor(p.store_id,'guomao','drive')}));
 const expected=rank(candidates,{located,radius:3}).rows.slice(0,2).map(r=>r.id);
 assert.deepEqual(Array.from(hc.__homeRows.slice(0,2).map(r=>r.id)),Array.from(expected));
});
test('guided paid coupon is recorded in used wallet',()=>{
 ctx.document={readyState:'loading',addEventListener(){}};ctx.location={pathname:'/product_demo_hub_v1.html',search:''};ctx.setTimeout=()=>{};
 vm.runInContext(read('mini_storage_coupon_benefit_v1.js'),ctx);
 ctx.read=(k,f)=>storage.has(k)?JSON.parse(storage.get(k)):f;ctx.write=(k,v)=>storage.set(k,JSON.stringify(v));
 ctx.PAY_RESULT='mini_storage_payment_result_current';ctx.COUPON_WALLET='mini_koala_coupon_wallet_v1';
 const demo=read('mini_koala_internal_demo_v1.js');vm.runInContext(extract(demo,'  function applyCouponSnapshot(){','  function route('),ctx);
 const o=ctx.patchCouponOrder('PAID');assert.equal(o.status,'PAID');
 const redeemed=ctx.MINI_KOALA_COUPON_V1.wallet().filter(r=>r.status==='REDEEMED');assert.equal(redeemed.length,1);assert.equal(redeemed[0].redeemed_order_id,o.order_no);
});
console.log(n+'/'+n+' behavior groups passed');
