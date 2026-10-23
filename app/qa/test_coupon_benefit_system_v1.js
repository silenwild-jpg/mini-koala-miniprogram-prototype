const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),proto=path.join(root,'prototype');
const source=fs.readFileSync(path.join(proto,'mini_storage_coupon_benefit_v1.js'),'utf8');
const storage=new Map();
const localStorage={getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
const context={window:{},document:{readyState:'loading',addEventListener:()=>{},head:{appendChild:()=>{}},getElementById:()=>null,createElement:()=>({})},localStorage,location:{pathname:'/prototype/test.html'},console,Date,URLSearchParams,setTimeout,clearTimeout,MutationObserver:function(){this.observe=()=>{};}};context.window=context;vm.createContext(context);vm.runInContext(source,context);
const API=context.MINI_KOALA_COUPON_V1;assert(API,'coupon API exported');
API.ensureAcquisitionWallet();
assert.deepEqual(API.wallet().map(x=>x.coupon_id).sort(),['CPN-001','CPN-002','CPN-003'],'acquisition wallet grants V1 coupon set');
const six={store_id:'MK_BJ_2CDB7BEE',unit_id:'BJ0112S01A009',size_option_id:'SZ-4.72',term_months:6,total_rent:3440,monthly_average:573,deposit:573,management_fee:50,upfront_payable:4063};
let applied=API.applyToSnapshot(six);
assert.equal(applied.coupon_id,'CPN-001','6m canonical chooses new-customer coupon');
assert.equal(applied.coupon_discount_amount,200,'6m discount is 200');
assert.equal(applied.rent_after_coupon,3240,'rent after coupon is 3240');
assert.equal(applied.upfront_payable,3863,'canonical upfront after coupon is 3863');
const twelve={...six,term_months:12,total_rent:6390,deposit:533,management_fee:50};
applied=API.applyToSnapshot(twelve);
assert.equal(applied.coupon_id,'CPN-002','12m automatically chooses higher-value long-term coupon');
assert.equal(applied.coupon_discount_amount,300,'12m discount is 300');
API.setSelection('none',null);applied=API.applyToSnapshot(six);assert.equal(applied.coupon_discount_amount,0,'user may choose not to use a coupon');
API.setSelection('auto',null);API.ensureRenewalWallet();assert(API.wallet().some(x=>x.coupon_id==='CPN-004'),'renewal coupon can be issued');
for(const f of ['space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html','mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html','mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html','mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html','mini_storage_order_o02_v1_17_self_service_Visual_V2_7_4.html','mini_storage_mine_m01_v1_11_self_service_Visual_V2_7_4.html','mini_storage_renew_rn01_v2_7_4.html']){
  const h=fs.readFileSync(path.join(proto,f),'utf8');assert(h.includes('mini_storage_coupon_benefit_v1.js'),`${f} loads coupon layer`);assert(h.includes('mini_storage_coupon_benefit_v1.css'),`${f} loads coupon visual layer`);
}
for(const f of ['mini_storage_coupon_wallet_c01_v1.html','mini_storage_coupon_select_c02_v1.html']){const h=fs.readFileSync(path.join(proto,f),'utf8');assert(h.includes('mini_storage_global_support_v274.js'),`${f} retains global support`)}
const hub=fs.readFileSync(path.join(proto,'product_demo_hub_v1.html'),'utf8');assert(hub.includes('mini_storage_coupon_benefit_v1.js'),'Product Demo Hub loads coupon layer');assert(source.includes('优惠券与权益专项'),'coupon layer injects Hub specialty entry');
console.log('PASS Coupon & Benefit System V1: wallet, best-coupon selection, canonical pricing, page integration, renewal issuance');
