'use strict';
// Source/VM regression only. This test never claims Chromium or screenshot acceptance.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(process.argv[2]),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const results=[],artifacts={};
function test(name,fn){try{fn();results.push({name,status:'PASS'})}catch(e){results.push({name,status:'FAIL',error:e.message})}}
function sandbox(){
 const mem=new Map(),ctx={console,URL,URLSearchParams,Date,setTimeout:()=>{},clearTimeout:()=>{},Set};
 ctx.localStorage={getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k),clear:()=>mem.clear()};
 ctx.sessionStorage=ctx.localStorage;ctx.document={readyState:'loading',addEventListener(){},scripts:[]};
 ctx.location={href:'http://127.0.0.1:4173/prototype/product_demo_hub_v1.html',search:''};
 ctx.window=ctx;vm.createContext(ctx);
 ctx.run=f=>vm.runInContext(read(f),ctx,{filename:f});
 ctx.json=k=>JSON.parse(ctx.localStorage.getItem(k)||'null');
 return ctx;
}
function hub(){
 const ctx=sandbox(),html=read('prototype/product_demo_hub_v1.html');
 for(const match of html.matchAll(/<script src="([^"]+)"><\/script>/g)){
  const name=match[1];
  // Load the four actual static dependencies, leaving DOM decoration to browser tests.
  if(['mini_storage_business_ssot_v274.js','mini_storage_demo_fixture_v2.js','mini_koala_internal_demo_v1.js','mini_storage_coupon_benefit_v1.js'].includes(name))ctx.run('prototype/'+name);
 }
 return ctx;
}
function validate(ctx,s){
 const gate=require(path.join(root,'prototype/mini_storage_price_gate_v1.js'));
 const consumer=sandbox();consumer.run('prototype/mini_storage_business_ssot_v274.js');
 return gate.validate(s,{storeId:s.store_id,sizeOptionId:s.size_option_id,representativeUnitNo:s.representative_unit_no,actualUnitId:s.actual_unit_id,termRaw:String(s.term_months),pricingModelVersion:consumer.MINI_STORAGE_MASTER_V222.pricing.model_version,managementFee:consumer.MINI_STORAGE_MASTER_V222.fees.management_fee,requireCouponVerification:true,couponVerifier:ctx.MINI_KOALA_COUPON_V1?.validateSnapshotCoupon});
}
for(const [action,step] of [['story_q01',3],['story_o01',4]]){
 test(action+': seeded global snapshot passes unchanged consumer price gate',()=>{
  const ctx=hub();ctx.MINI_KOALA_INTERNAL_DEMO_V1.goStep('coupon',step);
  const s=ctx.json('mini_storage_price_snapshot_current'),q=ctx.json('mini_storage_quote_current'),gate=validate(ctx,s);
  artifacts[action]={url:ctx.location.href,price_snapshot:s,quote:q,gate};
  assert.equal(gate.valid,true,gate.reason);
  assert.equal(s.total_rent-s.coupon_discount_amount+s.deposit+s.management_fee,s.upfront_payable);
 });
 test(action+': nested quote snapshot agrees with quote and current snapshot',()=>{
  const ctx=hub();ctx.MINI_KOALA_INTERNAL_DEMO_V1.goStep('coupon',step);
  const s=ctx.json('mini_storage_price_snapshot_current'),q=ctx.json('mini_storage_quote_current');
  assert.equal(q.price_snapshot.upfront_payable,q.upfront_payable);
  assert.equal(q.price_snapshot.coupon_discount_amount,q.coupon_discount_amount);
  assert.equal(q.price_snapshot.user_coupon_id,s.user_coupon_id);
  assert.equal(q.price_snapshot.pricing_model_version,s.pricing_model_version);
 });
}
test('index Q01: demo launcher prepares identity and valid no-coupon snapshot',()=>{
 const html=read('prototype/index_visual_v2_7_4_7.html');
 const href=html.match(/href="([^"]+)"\s*><b>Q01 可选保存方案/)[1];
 artifacts.index_link=href;
 assert(html.includes('id="d4Q01DemoEntry"'),'old amount-only direct link lacks a legitimate snapshot');
 const ctx=sandbox();let handler=null,prevented=false;
 ctx.document.getElementById=id=>id==='d4Q01DemoEntry'?{addEventListener:(kind,fn)=>{handler=fn}}:null;
 for(const x of html.matchAll(/<script src="([^"]+)"><\/script>/g))if(['mini_storage_business_ssot_v274.js','mini_storage_demo_fixture_v2.js'].includes(x[1]))ctx.run('prototype/'+x[1]);
 vm.runInContext(html.match(/<script id="ux-patch-d4-index-q01">([\s\S]*?)<\/script>/)[1],ctx);
 assert(handler);handler({preventDefault:()=>{prevented=true}});assert(prevented);
 const s=ctx.json('mini_storage_price_snapshot_current'),q=ctx.json('mini_storage_quote_current'),gate=validate(ctx,s);
 artifacts.index_seed={url:ctx.location.href,price_snapshot:s,quote:q,gate};
 assert.equal(gate.valid,true,gate.reason);assert.equal(s.upfront_payable,q.price_snapshot.upfront_payable);
 assert.equal(s.coupon_applied,false);assert.equal(s.coupon_discount_amount,0);
 assert.equal(q.pricing_model_version,s.pricing_model_version);
});
test('real price gate rejects altered payable, identity, term and model version',()=>{
 const ctx=hub();ctx.MINI_KOALA_INTERNAL_DEMO_V1.goStep('coupon',3);const s=ctx.json('mini_storage_price_snapshot_current');
 const gate=require(path.join(root,'prototype/mini_storage_price_gate_v1.js'));
 const consumer=sandbox();consumer.run('prototype/mini_storage_business_ssot_v274.js');
 const c={storeId:s.store_id,sizeOptionId:s.size_option_id,representativeUnitNo:s.representative_unit_no,actualUnitId:s.actual_unit_id,termRaw:String(s.term_months),pricingModelVersion:consumer.MINI_STORAGE_MASTER_V222.pricing.model_version,managementFee:50};
 for(const patch of [{upfront_payable:s.upfront_payable+1},{actual_unit_id:'DIFFERENT'},{term_months:5},{pricing_model_version:'obsolete'}])assert.equal(gate.validate({...s,...patch},c).valid,false);
});
test('genuine quote amount change remains detectable by unchanged S3 recheck',()=>{
 const ctx=hub();ctx.run('prototype/mini_storage_business_ssot_v274.js');
 ctx.MINI_KOALA_INTERNAL_DEMO_V1.goStep('coupon',3);
 const s=ctx.json('mini_storage_price_snapshot_current'),q=ctx.json('mini_storage_quote_current'),RC=ctx.MINI_STORAGE_TRADE_RECHECK_V1;
 assert.equal(RC.amountDiff(RC.quoteAmounts(q),s).length,0);
 const changed={...s,total_rent:s.total_rent+100,upfront_payable:s.upfront_payable+100};
 assert(RC.amountDiff(RC.quoteAmounts(q),changed).some(x=>x.key==='upfront_payable'));
 const u=read('prototype/mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html');
 assert(u.includes('goOrder=guard(goOrder);goQuote=guard(goQuote);'));
});
test('S5 all-entry progress suppression and expandable unchanged benefit text (source only)',()=>{
 const css=read('prototype/est_vis06_estimate_visual_unity.css'),coupon=read('prototype/mini_storage_coupon_benefit_v1.js');
 assert(css.includes('body:has(#s5.active) .estvis05-steps{display:none!important}'));
 assert(!css.includes('body:has(#s5.active):not(.estvis06-shortcut) .estvis05-steps{display:flex'));
 assert(coupon.includes('<details><summary><span class="coupon-v1-title">已获得 ¥200 新客租仓券</span>'));
 assert(coupon.includes('下单满足条件时会自动使用最优优惠；12个月方案还可使用 ¥300 长租券。'));
 assert(coupon.includes('ensureAcquisitionWallet();'));
});
console.log(JSON.stringify({kind:'SOURCE_AND_VM_ONLY',root,results,artifacts,counts:{pass:results.filter(x=>x.status==='PASS').length,fail:results.filter(x=>x.status==='FAIL').length},browser_status:'NOT TESTED'},null,2));
process.exitCode=results.some(x=>x.status==='FAIL')?1:0;
