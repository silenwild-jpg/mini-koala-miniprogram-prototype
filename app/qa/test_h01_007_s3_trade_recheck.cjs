// H01-007-S3 · D-07 (expired quote must be re-checked before trading) / D-12 (payment-failure recovery keeps the order).
// Shared-helper + source-level tests. Does not replace the real HTTP run (qa/test_h01_007_s3_http_flows.py).
// Usage: node qa/test_h01_007_s3_trade_recheck.cjs [package root]   (point it at the S2 checkpoint tree to see the defects reproduced)
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=process.argv[2]?path.resolve(process.argv[2]):path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');
const ssotSrc=read('prototype/mini_storage_business_ssot_v274.js');
const q01patch=read('prototype/mini_koala_acceptance_v11_state_patch.js');
const u01=read('prototype/mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html');
const o01=read('prototype/mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html');
const h01=read('prototype/mini_storage_home_H01_Visual_V2_7_4_SSOT.html');
const m01=read('prototype/mini_storage_mine_m01_v1_11_self_service_Visual_V2_7_4.html');
const o02=read('prototype/mini_storage_order_o02_v1_17_self_service_Visual_V2_7_4.html');

const store={};
const ctx={window:{},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}},console};
ctx.window.localStorage=ctx.localStorage;ctx.self=ctx.window;
vm.createContext(ctx);vm.runInContext(ssotSrc,ctx);
const RC=ctx.window.MINI_STORAGE_TRADE_RECHECK_V1,H=ctx.window.MINI_STORAGE_BUSINESS_HELPERS_V274,T=ctx.window.MINI_STORAGE_TRADE_SNAPSHOT_V1;
const J=x=>JSON.parse(JSON.stringify(x));const eq=(a,b,m)=>assert.deepEqual(J(a),J(b),m); // vm-context objects: compare by value
const cases=[];const t=(name,fn)=>{try{fn();cases.push([name,true])}catch(e){cases.push([name,false,e.message])}};
const NOW=Date.parse('2026-10-13T10:00:00.000Z');const iso=ms=>new Date(ms).toISOString();

// ---- shared helpers (D-07 / D-12) ----
t('RECHECK helpers exported from the shared SSOT',()=>{assert(RC&&typeof RC.quoteExpired==='function'&&typeof RC.resumableOrder==='function'&&typeof RC.amountDiff==='function')});
t('quoteExpired: active quote past valid_until is expired; inside 48h is not',()=>{
  assert.equal(RC.quoteExpired({quote_id:'Q',status:'active',valid_until:iso(NOW-1)},NOW),true);
  assert.equal(RC.quoteExpired({quote_id:'Q',status:'active',valid_until:iso(NOW-49*3600e3)},NOW),true);
  assert.equal(RC.quoteExpired({quote_id:'Q',status:'active',valid_until:iso(NOW+24*3600e3)},NOW),false);
  assert.equal(RC.quoteExpired({quote_id:'Q',status:'active',valid_until:iso(NOW+1)},NOW),false);
});
t('quoteExpired: explicit expired status, advisor-pending and converted/invalid quotes',()=>{
  assert.equal(RC.quoteExpired({quote_id:'Q',status:'expired'},NOW),true);
  assert.equal(RC.quoteExpired({quote_id:'Q',status:'pending_advisor',valid_until:iso(NOW-1)},NOW),false);
  assert.equal(RC.quoteExpired({quote_id:'Q',status:'converted',valid_until:iso(NOW-1)},NOW),false);
  assert.equal(RC.quoteExpired({quote_id:'Q',status:'active'},NOW),false,'no valid_until -> not treated as expired (H01 hsiQuoteTrusted already excludes it)');
  assert.equal(RC.quoteExpired({},NOW),false);assert.equal(RC.quoteExpired(null,NOW),false);
});
t('resumableOrder: only PENDING_PAYMENT / PAYMENT_FAILED orders with an order_no and unit',()=>{
  for(const s of ['PENDING_PAYMENT','PAYMENT_FAILED'])assert.equal(RC.resumableOrder({order_no:'O1',unit_id:'U',status:s}),true,s);
  for(const s of ['PAID','INVENTORY_CHANGED','CANCELLED','',undefined])assert.equal(RC.resumableOrder({order_no:'O1',unit_id:'U',status:s}),false,String(s));
  assert.equal(RC.resumableOrder({unit_id:'U',status:'PAYMENT_FAILED'}),false);assert.equal(RC.resumableOrder(null),false);
});
const snap=(o={})=>({total_rent:3820,monthly_average:637,deposit:637,management_fee:50,coupon_discount_amount:200,upfront_payable:4307,coupon_applied:true,coupon_id:'CPN-001',...o});
t('amountDiff: identical amounts -> no changes',()=>{eq(RC.amountDiff(snap(),snap()),[])});
t('amountDiff: rent / payable change and coupon loss are reported with labels and amounts',()=>{
  const d=RC.amountDiff(snap(),snap({total_rent:4120,monthly_average:687,deposit:687,upfront_payable:4657}));
  eq(d.map(x=>x.key),['total_rent','monthly_average','deposit','upfront_payable']);
  assert.equal(d[0].from,3820);assert.equal(d[0].to,4120);
  const lost=RC.amountDiff(snap(),snap({coupon_applied:false,coupon_id:null,coupon_discount_amount:0,upfront_payable:4507}));
  eq(lost.map(x=>x.key),['coupon_discount_amount','upfront_payable','coupon_id']);
  assert.equal(lost[2].from,'CPN-001');assert.equal(lost[2].to,'无');
  assert(RC.describeChanges(lost).includes('优惠金额：¥200 → ¥0')&&RC.describeChanges(lost).includes('首次应付：¥4,307 → ¥4,507')&&RC.describeChanges(lost).includes('优惠券：CPN-001 → 无'));
});
t('quoteAmounts / orderAmounts: the record\'s own price_snapshot wins, legacy fields map when it is missing',()=>{
  eq(RC.quoteAmounts({price_snapshot:snap(),total_price:1}),snap());
  const q=RC.quoteAmounts({total_price:3820,monthly_price:637,deposit_amount:637,management_fee:50,coupon_discount_amount:200,initial_payable:4307,coupon_id:'CPN-001'});
  eq(RC.amountDiff(q,snap()),[]);
  const o=RC.orderAmounts({total_price:3820,monthly_price:637,deposit_amount:637,management_fee:50,payable_total:4507});
  eq(RC.amountDiff(o,snap({coupon_applied:false,coupon_id:null,coupon_discount_amount:0,upfront_payable:4507})),[]);
});
t('no pricing rule is touched: contractRent / monthlyReference / termFactor unchanged and not referenced by the re-check helpers',()=>{
  assert.equal(H.contractRent(1000,6,'jianguo'),Math.round(H.storeAdjustedBase(1000,'jianguo')*6*H.termFactor(6)/10)*10);
  assert.equal(H.monthlyReference(1000,12,'jianguo'),Math.round(H.contractRent(1000,12,'jianguo')/12));
  const s3=ssotSrc.slice(ssotSrc.indexOf('H01-007-S3'));assert(!/contractRent|monthlyReference|termFactor|storeAdjustedBase/.test(s3));
});
// ---- S1 / S2 protection ----
t('S1 kept: validTerm + MINI_STORAGE_TRADE_SNAPSHOT_V1.confirm + U01 commitTradeRequirement + Q01/O01 confirm() calls',()=>{
  assert.equal(H.validTerm('0'),null);assert.equal(H.validTerm('12'),12);assert.equal(T.confirm({},{term_months:12,store_id:'s'}).trade_confirmed.term_months,12);
  assert(u01.includes('function commitTradeRequirement'));assert(o01.includes("confirmed_by:'O01'"));assert(read('prototype/mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html').includes("confirmed_by:'Q01'"));
});
// H01-007-P1: authorized settlement-only change supersedes the historical whole-file hash.
// Still hash every byte outside syncPaymentResult and normalize exactly one C02 CSS property.
t('S2 kept outside authorized P1 settlement function / C02 transform reset',()=>{
  let coupon=read('prototype/mini_storage_coupon_benefit_v1.js');
  coupon=coupon.replace(/  \/\/ H01-007-P1: settle only[^\n]*\n  \/\/ No lock timeout[^\n]*\n/,'');
  const start=coupon.indexOf('  function syncPaymentResult()'),end=coupon.indexOf('\n  function init()',start);
  assert(start>=0&&end>start);
  assert.equal(crypto.createHash('sha256').update(coupon.slice(0,start)+coupon.slice(end)).digest('hex'),'397d63dbec777974d358772f4007e78b5e690239f0f6a4f46debe11288b13eef');
  const c02=read('prototype/mini_storage_coupon_select_c02_v1.html').replace('.coupon-bottom{transform:none!important;left:0!important;','.coupon-bottom{left:0!important;');
  assert.equal(crypto.createHash('sha256').update(c02).digest('hex'),'8c60c47bfe3bcc5121ebc931e7d6873016265d79d3611eab980baf00772d87a8');
});
t('price gate untouched (sha256 equals H01-004B / S1 / S2; no invented 48h expiry inside the gate)',()=>{assert.equal(sha('prototype/mini_storage_price_gate_v1.js'),'09e9d7fe95c8e0d3ac8eb96bba55d9c02652f6a400859ff640a878c31f2b199b');assert(read('prototype/mini_storage_price_gate_v1.js').includes('No invented 48h expiry here'))});
// ---- D-07 wiring ----
t('D-07 Q01 expired-quote notice is named, mentions 48h, and hands requote=1 + quoteId to U01',()=>{assert(q01patch.includes("banner.id='quoteExpiredNotice'"));assert(q01patch.includes('48 小时参考期'));assert(q01patch.includes("next.set('requote','1')"));assert(q01patch.includes("next.set('quoteId'"))});
t('D-07 Q01 keeps the stale amounts viewable and 保存方案 disabled; 继续 goes to U01 without the stale snapshot',()=>{assert(q01patch.includes("save.disabled=true"));assert(q01patch.includes("localStorage.removeItem('mini_storage_price_snapshot_current')"));assert(q01patch.includes('mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html?'))});
t('D-07 U01 re-check block: compares against the saved quote / order, requires acknowledgement, guards goOrder and goQuote',()=>{assert(u01.includes("id='requoteNotice'"));assert(u01.includes('id="requoteAck"'));assert(u01.includes('goOrder=guard(goOrder);goQuote=guard(goQuote);'));assert(u01.includes("RC.quoteAmounts(q)"));assert(u01.includes("RC.orderAmounts(o)"))});
// ---- D-12 wiring ----
t('D-12 H01: PAYMENT_FAILED is a pending task with distinct copy; structure untouched',()=>{assert(h01.includes("['PENDING','PENDING_PAYMENT','PAYMENT_FAILED'].includes(o.status)"));assert(h01.includes('有一笔订单支付未完成'));assert(h01.includes('上次支付未完成，订单已保留'));assert.equal((h01.match(/id="pendingCard"/g)||[]).length,1)});
t('D-12 M01: failed order card, badge and goOrder -> O01',()=>{assert(m01.includes("o.status==='PAYMENT_FAILED')html+="));assert(m01.includes('1个支付未完成'));assert(m01.includes("['PENDING','PENDING_PAYMENT','PAYMENT_FAILED'].includes(o.status)){/* H01-007-S3 D-12 */"))});
t('D-12 O01: resume keeps the order\'s own snapshot, re-checks status / price / inventory / coupon, blocks + offers re-pricing on change',()=>{
  assert(o01.includes('let carriedPriceSnapshot=readPriceSnapshot();'));assert(o01.includes("const resumeOrderNo=p.get('orderNo')||'';"));
  assert(o01.includes("id='orderResumeNotice'"));assert(o01.includes('id="orderResumeReprice"'));assert(o01.includes("block('not_found'"));assert(o01.includes("block('sold_out'"));assert(o01.includes("block('changed'"));
  assert(o01.includes('您已有成交订单，原订单中的新客优惠不再适用'));assert(o01.includes("resumeOrder:resumeOrderNo"));
  // order_no reuse rule (existing) still in place, so re-pricing never silently creates a second order
  assert(o01.includes("['PENDING_PAYMENT','PAYMENT_FAILED'].includes(existingOrder.status))?existingOrder.order_no:makeOrderNo()"));
});
t('D-12 O02 untouched: success only from a matching PAID gateway result or an already PAID order',()=>{assert(o02.includes("paymentResult.order_no===existingOrder.order_no"));assert(o02.includes("if(existingOrder.status==='PAID'||existingOrder.payment_status==='PAID')return 'paid'"));assert(!o02.includes('H01-007-S3'))});

let fail=0;for(const [n,ok,msg] of cases){console.log((ok?'PASS':'FAIL')+' '+n+(ok?'':'  -- '+msg));if(!ok)fail++}
console.log(`\n${cases.length-fail}/${cases.length} passed (root=${root})`);process.exit(fail?1:0);
