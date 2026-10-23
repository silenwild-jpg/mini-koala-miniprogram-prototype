// Unified Phase 3C: coupon eligibility, arithmetic, expiry, cross-page and noncash boundaries.
'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const root=path.join(__dirname,'..'), proto=path.join(root,'prototype');
const couponSrc=fs.readFileSync(path.join(proto,'mini_storage_coupon_benefit_v1.js'),'utf8');
const gate=require(path.join(proto,'mini_storage_price_gate_v1.js'));
const data=new Map();
const localStorage={getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
const document={readyState:'loading',addEventListener(){}};
const location={pathname:'/mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html',search:'?firstPurchase=1'};
const window={};const ctx=vm.createContext({window,document,location,localStorage,URLSearchParams,Date,console,setTimeout:()=>{}});
vm.runInContext(couponSrc,ctx);const api=window.MINI_KOALA_COUPON_V1;
let num=0;function check(name,fn){fn();num++;console.log('PASS U3C-'+String(num).padStart(2,'0'),name)}
const now=Date.now(),future=new Date(now+3*86400000).toISOString(),past=new Date(now-86400000).toISOString();
function row(id,status='CLAIMED',expiry=future){return {user_coupon_id:'UC-'+id,coupon_id:id,status,expire_time:expiry,claim_time:new Date(now-86400000).toISOString()}}
function wallet(rows){data.set(api.WALLET_KEY,JSON.stringify(rows))}
function setSelection(mode,id){api.setSelection(mode,id)}
function context(term=6,rent=4800,first=true){return {term,rent,first_purchase:first,renewal:false}}
function price(term=6){const total=4800,monthly=Math.round(total/term);return {store_id:'STORE-01',size_option_id:'SIZE-05',representative_unit_no:'R-01',unit_id:'R-01',actual_unit_id:null,unit_identity_type:'SIZE_OPTION',term_months:term,total_rent:total,monthly_average:monthly,deposit:monthly,management_fee:50,upfront_payable:total+monthly+50,pricing_model_version:'demo_v1',pricing_timestamp:new Date().toISOString()}}
function snap(coupon=true){return coupon?api.applyToSnapshot(price()):price()}
function verify(s){return api.validateSnapshotCoupon(s,{firstPurchase:true})}
function fullValidate(s,term='6',additional={}){return gate.validate(s,{storeId:'STORE-01',sizeOptionId:'SIZE-05',representativeUnitNo:'R-01',actualUnitId:'',termRaw:term,pricingModelVersion:'demo_v1',managementFee:50,firstPurchase:true,couponVerifier:api.validateSnapshotCoupon,...additional})}
check('expired coupon is ineligible',()=>{wallet([row('CPN-001','CLAIMED',past)]);assert.equal(api.entries(context())[0].eligible,false);assert.match(api.entries(context())[0].ineligible_reason,/过期/)})
check('missing expiry fails eligibility',()=>{wallet([{...row('CPN-001'),expire_time:null}]);assert.equal(api.entries(context())[0].eligible,false)})
check('used/invalid/locked coupons are ineligible',()=>{for(const status of ['REDEEMED','INVALID','LOCKED','REVOKED']){wallet([row('CPN-001',status)]);assert.equal(api.best(context()),null,status)}})
check('new customer coupon respects first purchase',()=>{wallet([row('CPN-001')]);assert.equal(api.entries(context(6,4800,false))[0].eligible,false)})
check('long lease coupon requires at least 12 months',()=>{wallet([row('CPN-002')]);assert.equal(api.best(context(6)),null);assert.equal(api.best(context(12)).coupon_id,'CPN-002')})
check('minimum rent coupon rejects shortfall',()=>{wallet([row('CPN-001')]);assert.equal(api.best(context(6,1999)),null)})
check('no quote gives no eligible coupon',()=>{wallet([row('CPN-001')]);assert.equal(api.entries(context(0,0))[0].eligible,false)})
check('manual expired coupon does not silently switch to another',()=>{wallet([row('CPN-001','CLAIMED',past),row('CPN-002')]);setSelection('manual','CPN-001');assert.equal(api.selected(context(12)),null)})
check('auto picks highest eligible rent coupon',()=>{wallet([row('CPN-001'),row('CPN-002')]);setSelection('auto');assert.equal(api.best(context(12)).coupon_id,'CPN-002')})
check('service benefit never offsets rent',()=>{wallet([row('CPN-003')]);setSelection('auto');const s=snap();assert.equal(s.coupon_discount_amount,0);assert.equal(s.upfront_payable,s.total_rent+s.deposit+s.management_fee)})
check('coupon component and payable reconcile',()=>{wallet([row('CPN-001')]);const s=snap();assert.equal(s.coupon_discount_amount,200);assert.equal(s.rent_before_coupon,4800);assert.equal(s.rent_after_coupon,4600);assert.equal(s.upfront_payable,5450);assert.equal(fullValidate(s).valid,true)})
check('different plan identity invalidates old price',()=>{const s=snap();assert.equal(fullValidate(s,'6',{sizeOptionId:'SIZE-OTHER'}).valid,false)})
check('changed lease term invalidates old quote',()=>{const s=snap();assert.equal(fullValidate(s,'12').valid,false)})
check('expired coupon makes saved snapshot invalid',()=>{wallet([row('CPN-001')]);const s=snap();wallet([row('CPN-001','CLAIMED',past)]);assert.equal(verify(s).valid,false);assert.equal(fullValidate(s).valid,false)})
check('coupon redeemed after quotation invalidates checkout',()=>{wallet([row('CPN-001')]);const s=snap();wallet([row('CPN-001','REDEEMED')]);assert.equal(fullValidate(s).valid,false)})
check('coupon selection changes require re-quote',()=>{wallet([row('CPN-001'),row('CPN-002')]);setSelection('manual','CPN-001');const s=snap();setSelection('none');assert.equal(fullValidate(s).valid,false)})
check('customer flag mismatch invalidates new customer coupon',()=>{wallet([row('CPN-001')]);setSelection('auto');const s=snap();assert.equal(fullValidate(s,'6',{firstPurchase:false}).valid,false)})
check('noncash rights are not applied as negative fees',()=>{const s=snap();assert.equal(s.service_benefit_amount,0);assert.equal(s.management_fee_discount,0);assert.equal(s.total_benefit_amount,s.coupon_discount_amount)})
check('checkout and quote validate current coupon state',()=>{for(const file of ['mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html','mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html']){let s=fs.readFileSync(path.join(proto,file),'utf8');assert(s.includes('couponVerifier:window.MINI_KOALA_COUPON_V1?.validateSnapshotCoupon'));assert(s.includes('firstPurchase:p.get'))}})
check('checkout revalidates before committing payment',()=>{let s=fs.readFileSync(path.join(proto,'mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html'),'utf8');assert(s.includes('const liveCheck=pricingGate.validate(readPriceSnapshot()'));assert(s.indexOf('const liveCheck=pricingGate.validate(readPriceSnapshot()')<s.indexOf('const order={'))})
check('coupon selection page has no invented default rent or term',()=>{let s=fs.readFileSync(path.join(proto,'mini_storage_coupon_select_c02_v1.html'),'utf8');assert(!s.includes('s.term_months||6'));assert(!s.includes('s.total_rent||3440'))})
check('payable breakdown keeps discount before deposit/fees',()=>{let q=fs.readFileSync(path.join(proto,'mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html'),'utf8');let o=fs.readFileSync(path.join(proto,'mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html'),'utf8');assert(q.includes('整期租金（用券前）'));assert(o.includes('整期租金（用券前）'));assert(q.includes('押金（折后月均租金）'))})
check('transport marked estimated and does not reduce payable',()=>{const o=fs.readFileSync(path.join(proto,'mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html'),'utf8');assert(o.includes('预计符合赠送条件 · 待确认'));assert(o.includes('不抵扣租金'));assert(!o.includes('当前活动条件已满足'))})
check('original price gate remains strict on identity and arithmetic',()=>{wallet([row('CPN-001')]);setSelection('auto');const s=snap();assert.equal(fullValidate({...s,upfront_payable:s.upfront_payable+1}).valid,false);assert.equal(fullValidate({...s,pricing_model_version:'other'}).valid,false)})
console.log(`Unified Phase 3C: ${num}/${num} targeted tests passed. Browser and WeChat E2E NOT VERIFIED.`)
