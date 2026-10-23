// H01-007-S2 · D-05 (first-purchase eligibility incl. settled history) / D-06 (own-order lock recovery, no cross-order reuse)
// Logic-level tests of the shared coupon layer in a sandbox. Does not replace the real HTTP run (qa/test_h01_007_s2_http_flows.py).
// Usage: node qa/test_h01_007_s2_coupon_eligibility.cjs [path/to/mini_storage_coupon_benefit_v1.js]
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const srcPath=process.argv[2]?path.resolve(process.argv[2]):path.join(root,'prototype/mini_storage_coupon_benefit_v1.js');
const source=fs.readFileSync(srcPath,'utf8');
const c02=fs.readFileSync(path.join(root,'prototype/mini_storage_coupon_select_c02_v1.html'),'utf8');

function sandbox(seed={}){
  const storage=new Map();for(const [k,v] of Object.entries(seed))storage.set(k,JSON.stringify(v));
  const localStorage={getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
  const context={window:{},document:{readyState:'loading',addEventListener:()=>{},head:{appendChild:()=>{}},getElementById:()=>null,createElement:()=>({}),querySelector:()=>null},localStorage,location:{pathname:'/prototype/test.html',search:''},console,Date,URLSearchParams,setTimeout,clearTimeout,MutationObserver:function(){this.observe=()=>{}}};
  context.window=context;vm.createContext(context);vm.runInContext(source,context);
  const API=context.MINI_KOALA_COUPON_V1;
  const get=k=>JSON.parse(storage.get(k)||'null');
  return {API,get,set:(k,v)=>storage.set(k,JSON.stringify(v)),context};
}
const WALLET='mini_koala_coupon_wallet_v1',CUR='mini_storage_order_current',HIST='mini_storage_order_history_v242',PRICE='mini_storage_price_snapshot_current';
const future=()=>{const d=new Date();d.setDate(d.getDate()+7);return d.toISOString()};
const past=()=>{const d=new Date();d.setDate(d.getDate()-1);return d.toISOString()};
const row=(id,status,extra={})=>({user_coupon_id:`UC-${id}-T`,coupon_id:id,status,claim_time:'2026-10-13T00:00:00.000Z',expire_time:future(),source:'TEST',...extra});
const freshWallet=()=>[row('CPN-001','CLAIMED'),row('CPN-002','CLAIMED'),row('CPN-003','CLAIMED')];
const ident={store_id:'jianguo',unit_id:'BJ0498S01B001',size_option_id:'MK_BJ_A__6.24',representative_unit_no:'BJ0498S01B001',actual_unit_id:null,unit_identity_type:'SIZE_OPTION'};
const six={...ident,term_months:6,total_rent:3440,monthly_average:573,monthly_price:573,deposit:573,management_fee:50,upfront_payable:4063};
const twelve={...ident,term_months:12,total_rent:6390,monthly_average:533,deposit:533,management_fee:50,upfront_payable:6973};
const withCoupon=(base,id,face,uc)=>({...base,coupon_customer_first_purchase:true,coupon_id:id,user_coupon_id:uc||`UC-${id}-T`,coupon_name:id==='CPN-001'?'新客租仓券':'12个月长租券',coupon_type:'RENT_CASH',coupon_discount_amount:face,rent_before_coupon:base.total_rent,rent_after_coupon:base.total_rent-face,total_benefit_amount:face,benefit_ids:[id],upfront_payable:base.total_rent-face+base.deposit+base.management_fee,coupon_applied:true});
const paidA=(extra={})=>({order_no:'O-A-PAID',status:'PAID',payment_status:'PAID',store_id:'jianguo',unit_id:'BJ0498S01B001',size_option_id:'MK_BJ_A__6.24',term_months:6,total_price:3440,payable_total:3863,paid_at:'2026-09-01T00:00:00.000Z',...extra});
const pendingB=(extra={})=>({order_no:'O-B-PENDING',status:'PENDING_PAYMENT',payment_status:'PAYING',store_id:'chaoyang',unit_id:'BJ0386S01B002',size_option_id:'MK_BJ_B__6.0',term_months:6,...extra});
const pendingA=(extra={})=>({order_no:'O-A-PENDING',status:'PENDING_PAYMENT',payment_status:'PAYING',...ident,term_months:6,total_price:3440,payable_total:3863,...extra});

// values cross a vm realm boundary: compare by JSON shape, not prototype identity
const deq=(a,b,m)=>assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);
const cases=[];const t=(name,fn)=>{try{fn();cases.push([name,true])}catch(e){cases.push([name,false,e.message])}};

// ---------------- FRESH ----------------
t('FRESH: no paid history -> new customer, wallet granted, CPN-001 applied to 6m canonical',()=>{
  const {API}=sandbox();assert.equal(API.isNewCustomer(),true);API.ensureAcquisitionWallet();
  deq(API.wallet().map(x=>x.coupon_id).sort(),['CPN-001','CPN-002','CPN-003']);
  const a=API.applyToSnapshot(six);assert.equal(a.coupon_id,'CPN-001');assert.equal(a.coupon_discount_amount,200);assert.equal(a.upfront_payable,3863);assert.equal(a.coupon_customer_first_purchase,true);
  assert.equal(API.validateSnapshotCoupon(a,{firstPurchase:true}).valid,true);
  assert.equal(API.applyToSnapshot(twelve).coupon_id,'CPN-002','12m still picks the ¥300 long-term coupon');
});
t('FRESH: unpaid history (PAYMENT_FAILED / PENDING) does not end first-purchase status',()=>{
  const {API}=sandbox({[HIST]:[paidA({status:'PAYMENT_FAILED',payment_status:'PAYMENT_FAILED'}),pendingB()],[CUR]:pendingB()});
  assert.equal(API.isNewCustomer(),true);assert.equal(API.paidRentalHistory().length,0);
});
// ---------------- REPEAT ----------------
t('REPEAT: paid order in history + new pending current order -> NOT first purchase',()=>{
  const {API}=sandbox({[HIST]:[paidA()],[CUR]:pendingB(),[WALLET]:freshWallet()});
  assert.equal(API.isNewCustomer(),false);assert.equal(API.isFirstPurchaseContext(),false);
  const a=API.applyToSnapshot(six);assert.equal(a.coupon_applied,false);assert.equal(a.coupon_discount_amount,0);assert.equal(a.coupon_customer_first_purchase,false);assert.equal(a.upfront_payable,4063);
  const forged=withCoupon(six,'CPN-001',200);deq(API.validateSnapshotCoupon(forged,{firstPurchase:true}),{valid:false,reason:'CUSTOMER_NOT_ELIGIBLE'});
  const e=API.entries(API.couponContextFromSnapshot(six)).find(x=>x.coupon_id==='CPN-001');assert.equal(e.eligible,false);assert.equal(e.ineligible_reason,'仅限首次租仓');
});
t('REPEAT: paid order that is the current order (pre-S2 behaviour) still blocks; ensureAcquisitionWallet grants nothing',()=>{
  const {API}=sandbox({[CUR]:paidA()});assert.equal(API.isNewCustomer(),false);API.ensureAcquisitionWallet();deq(API.wallet(),[]);
});
t('REPEAT: paid order in history only (current pointer empty) blocks; ended lifecycle still counts as settled history (assumption, see report)',()=>{
  assert.equal(sandbox({[HIST]:[paidA()]}).API.isNewCustomer(),false);
  assert.equal(sandbox({[HIST]:[paidA({lifecycle_state:'ended',detail_state:'ended',access_status:'EXPIRED'})]}).API.isNewCustomer(),false);
  assert.equal(sandbox({[HIST]:[paidA({order_no:''})]}).API.isNewCustomer(),true,'records without order_no are ignored');
});
t('REPEAT: renewal coupon (CPN-004) unaffected by first-purchase status',()=>{
  const {API}=sandbox({[HIST]:[paidA()],[CUR]:paidA()});API.ensureRenewalWallet();const r=API.wallet().find(x=>x.coupon_id==='CPN-004');assert(r);
  assert.equal(API.reason(API.TEMPLATES['CPN-004'],{term:6,rent:3440,first_purchase:false,renewal:true},r),'');
  assert.equal(API.reason(API.TEMPLATES['CPN-001'],{term:6,rent:3440,first_purchase:false,renewal:true},row('CPN-001','CLAIMED')),'仅限首次租仓');
});
// ---------------- OWN_LOCK ----------------
for(const st of ['PENDING_PAYMENT','PAYMENT_FAILED']){
t(`OWN_LOCK (${st}): coupon LOCKED by the current unpaid order is recoverable by that order's snapshot`,()=>{
  const wallet=[row('CPN-001','LOCKED',{locked_order_id:'O-A-PENDING'}),row('CPN-002','CLAIMED'),row('CPN-003','CLAIMED')];
  const {API}=sandbox({[WALLET]:wallet,[CUR]:pendingA({status:st,payment_status:st==='PAYMENT_FAILED'?'PAYMENT_FAILED':'PAYING'})});
  assert.equal(API.recoverableLockOrder(six),'O-A-PENDING');
  const snap=withCoupon(six,'CPN-001',200);deq(API.validateSnapshotCoupon(snap,{firstPurchase:true}),{valid:true,reason:'OK'});
  const a=API.applyToSnapshot(six);assert.equal(a.coupon_id,'CPN-001');assert.equal(a.coupon_discount_amount,200,'auto-select keeps using the own-locked coupon');
  const e=API.entries(API.couponContextFromSnapshot(six)).find(x=>x.coupon_id==='CPN-001');assert.equal(e.eligible,true);assert.equal(e.status,'LOCKED','status is not rewritten to CLAIMED');
});}
t('OWN_LOCK: recovery still enforces coupon rules (term / rent / amount / selection)',()=>{
  const wallet=[row('CPN-002','LOCKED',{locked_order_id:'O-A-PENDING'}),row('CPN-001','CLAIMED')];
  const {API}=sandbox({[WALLET]:wallet,[CUR]:pendingA({term_months:12})});
  assert.equal(API.validateSnapshotCoupon(withCoupon(twelve,'CPN-002',300),{firstPurchase:true}).valid,true);
  assert.equal(API.validateSnapshotCoupon(withCoupon(six,'CPN-002',300),{firstPurchase:true}).reason,'COUPON_RULE_MISMATCH','12m coupon cannot be recovered onto a 6m snapshot');
  assert.equal(API.validateSnapshotCoupon(withCoupon(twelve,'CPN-002',350),{firstPurchase:true}).reason,'COUPON_AMOUNT_MISMATCH');
});
// ---------------- OTHER_LOCK ----------------
t('OTHER_LOCK: another order (different store) cannot use the coupon locked by order A',()=>{
  const wallet=[row('CPN-001','LOCKED',{locked_order_id:'O-A-PENDING'}),row('CPN-002','CLAIMED')];
  const {API}=sandbox({[WALLET]:wallet,[CUR]:pendingA()});
  const other={...six,store_id:'chaoyang',unit_id:'BJ0386S01B002',representative_unit_no:'BJ0386S01B002',size_option_id:'MK_BJ_B__6.0'};
  assert.equal(API.recoverableLockOrder(other),null);
  deq(API.validateSnapshotCoupon(withCoupon(other,'CPN-001',200),{firstPurchase:true}),{valid:false,reason:'COUPON_LOCKED_BY_OTHER_ORDER'});
  const a=API.applyToSnapshot(other);assert.equal(a.coupon_id,null,'auto-select skips the occupied coupon (CPN-002 needs 12 months)');
  const e=API.entries(API.couponContextFromSnapshot(other)).find(x=>x.coupon_id==='CPN-001');assert.equal(e.eligible,false);assert.equal(e.ineligible_reason,'优惠券正在其他订单中使用');
});
t('OTHER_LOCK: same store/size but a different order_no, a paid current order, or no current order -> not recoverable',()=>{
  const wallet=[row('CPN-001','LOCKED',{locked_order_id:'O-A-PENDING'})];
  assert.equal(sandbox({[WALLET]:wallet,[CUR]:pendingA({order_no:'O-C-PENDING'})}).API.validateSnapshotCoupon(withCoupon(six,'CPN-001',200),{firstPurchase:true}).reason,'COUPON_LOCKED_BY_OTHER_ORDER');
  assert.equal(sandbox({[WALLET]:wallet,[CUR]:paidA({order_no:'O-A-PENDING'})}).API.validateSnapshotCoupon(withCoupon(six,'CPN-001',200),{firstPurchase:true}).reason,'CUSTOMER_NOT_ELIGIBLE');
  assert.equal(sandbox({[WALLET]:wallet}).API.validateSnapshotCoupon(withCoupon(six,'CPN-001',200),{firstPurchase:true}).reason,'COUPON_LOCKED_BY_OTHER_ORDER');
  assert.equal(sandbox({[WALLET]:[row('CPN-001','LOCKED')],[CUR]:pendingA()}).API.validateSnapshotCoupon(withCoupon(six,'CPN-001',200),{firstPurchase:true}).reason,'COUPON_LOCKED_BY_OTHER_ORDER','LOCKED without owner is never treated as usable');
  assert.equal(sandbox({[WALLET]:wallet,[CUR]:pendingA({size_option_id:'OTHER'})}).API.recoverableLockOrder(six),null,'different size option = different order identity');
});
// ---------------- INVALID ----------------
t('INVALID: expired / redeemed / invalid coupons and unmet thresholds stay blocked',()=>{
  const wallet=[row('CPN-001','CLAIMED',{expire_time:past()}),row('CPN-002','REDEEMED'),row('CPN-003','INVALID')];
  const {API}=sandbox({[WALLET]:wallet,[CUR]:pendingA()});
  const ctx=API.couponContextFromSnapshot(twelve);const ent=API.entries(ctx);
  assert.equal(ent.find(x=>x.coupon_id==='CPN-001').ineligible_reason,'优惠券已过期');assert.equal(ent.find(x=>x.coupon_id==='CPN-002').ineligible_reason,'优惠券状态不可用');
  assert.equal(API.validateSnapshotCoupon(withCoupon(twelve,'CPN-001',200),{firstPurchase:true}).reason,'COUPON_EXPIRED_OR_USED');
  assert.equal(API.validateSnapshotCoupon(withCoupon(twelve,'CPN-002',300),{firstPurchase:true}).reason,'COUPON_EXPIRED_OR_USED');
  const {API:B}=sandbox({[WALLET]:freshWallet()});
  assert.equal(B.reason(B.TEMPLATES['CPN-001'],{term:1,rent:592,first_purchase:true},row('CPN-001','CLAIMED')),'整期租金满¥2,000可使用');
  assert.equal(B.reason(B.TEMPLATES['CPN-002'],{term:6,rent:3440,first_purchase:true},row('CPN-002','CLAIMED')),'租满12个月可使用');
  assert.equal(B.applyToSnapshot({...six,term_months:1,total_rent:592,deposit:592,upfront_payable:1234}).coupon_applied,false);
  assert.equal(B.validateSnapshotCoupon(withCoupon(six,'CPN-001',200,'UC-UNKNOWN'),{firstPurchase:true}).reason,'COUPON_NOT_FOUND');
});
// ---------------- state transitions (existing rules must not regress) ----------------
t('TRANSITIONS: PAID -> REDEEMED + other NEW coupons INVALID; PAYMENT_FAILED -> back to CLAIMED (unchanged rules)',()=>{
  let sb=sandbox({[WALLET]:[row('CPN-001','LOCKED',{locked_order_id:'O-A-PENDING'}),row('CPN-002','CLAIMED'),row('CPN-003','CLAIMED'),row('CPN-004','CLAIMED')],[CUR]:pendingA({status:'PAID',payment_status:'PAID',user_coupon_id:'UC-CPN-001-T',coupon_id:'CPN-001'})});
  sb.API.syncPaymentResult();let w=Object.fromEntries(sb.get(WALLET).map(x=>[x.coupon_id,x.status]));
  deq(w,{'CPN-001':'REDEEMED','CPN-002':'INVALID','CPN-003':'INVALID','CPN-004':'CLAIMED'});assert.equal(sb.get(WALLET)[0].redeemed_order_id,'O-A-PENDING');
  sb=sandbox({[WALLET]:[row('CPN-001','LOCKED',{locked_order_id:'O-A-PENDING'})],[CUR]:pendingA({status:'PAYMENT_FAILED',payment_status:'PAYMENT_FAILED',user_coupon_id:'UC-CPN-001-T'})});
  sb.API.syncPaymentResult();assert.equal(sb.get(WALLET)[0].status,'CLAIMED');assert.equal(sb.get(WALLET)[0].locked_order_id,null);
});
// ---------------- source-level guards ----------------
t('SOURCE: C02 builds its context through couponContextFromSnapshot (own lock shown as usable); no lock timeout / release delay introduced',()=>{
  assert(c02.includes('const ctx=API.couponContextFromSnapshot(s);'));
  assert(!/LOCK_(TTL|TIMEOUT|MINUTES)|lock_expires|release_after/i.test(source),'no invented lock timing');
  assert(!/function isNewCustomer\(\)\{const o=currentOrder\(\);return !\(o&&o\.status==='PAID'&&o\.order_no\)\}/.test(source),'pre-S2 current-order-only rule removed');
  assert(source.includes("if(rowStatus!=='CLAIMED'&&!lockOwnedBy(row,recover))"));
});

for(const [n,ok,msg] of cases)console.log((ok?'PASS':'FAIL')+' '+n+(ok?'':'  <- '+msg));
console.log(cases.filter(c=>c[1]).length+'/'+cases.length+'  source='+path.relative(root,srcPath));
process.exit(cases.every(c=>c[1])?0:1);
