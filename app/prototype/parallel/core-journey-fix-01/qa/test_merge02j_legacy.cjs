'use strict';
const assert=require('node:assert/strict');
const F=require('../demo/fixtures');
const {create}=require('../demo/demo-core');
const C=require('../demo/central-contract');
const original=require('../../../../data/mini_koala_data.js');
const assertRun=(name,fn)=>{fn();console.log('MK_MIGRATION_PASS',name);};
if(process.env.MK_CATALOG_MODE!=='MK')throw Error('Set MK_CATALOG_MODE=MK to validate old catalog in isolation');
assertRun('126 historical stores and 766 size options retain source IDs and five cities',()=>{
 assert.equal(F.stores.length,126);
 assert.equal(F.units.length,766);
 assert.equal(F.sourceNamespace,'MK');
 assert.equal(new Set(F.stores.map(s=>s.id)).size,126);
 assert.equal(new Set(F.units.map(u=>u.id)).size,766);
 assert.deepEqual([...new Set(F.stores.map(s=>s.city))].sort(),['上海','北京','广州','杭州','深圳'].sort());
 const rawStore=new Map(original.stores.map(s=>[s.store_id,s]));
 const rawUnit=new Map(original.options.map(u=>[u.size_option_id,u]));
 for(const s of F.stores){
  const raw=rawStore.get(s.id);
  assert(raw, 'unknown raw store ID '+s.id);
  assert.equal(s.name,raw.store_name);
  assert.equal(s.address,raw.address);
  assert.equal(s.available_unit_count,raw.available_unit_count);
 }
 for(const u of F.units){
  const raw=rawUnit.get(u.id);
  assert(raw,'invented size option '+u.id);
  assert.equal(u.store_id,raw.store_id);
  assert.equal(u.size_option_id,raw.size_option_id);
  assert.equal(u.available_count,raw.available_count);
  assert.equal(u.base_month,raw.display_price_min);
  assert.equal(u.volume,raw.size);
  assert.equal(u.representative_unit_no,raw.representative_unit_no);
  assert.equal(u.unit_identity_type,'SIZE_OPTION');
  assert(!u.dimensions_m,'simulated dimensions must not masquerade as measured dimensions');
 }
});
assertRun('cities, historical prices and size-option identity never fabricate actual unit number',()=>{
 assert.equal(F.distanceVerified,false);
 assert.equal(F.unitIdentityType,'SIZE_OPTION');
 assert.equal(F.originalSourceVersion,original.dataVersion);
 assert(F.units.every(u=>u.base_month>0 && u.available_count>0));
 assert(F.units.every(u=>u.photo_source==='generic_demo_placeholder'));
});
function ready(){
 const c=create();
 c.setCity('北京');
 const st=F.stores.find(s=>s.city==='北京'&&s.status==='open');
 const u=F.units.find(x=>x.store_id===st.id&&x.status==='available');
 assert(st&&u);
 c.setRequirement(Math.min(1,u.volume),6,true);
 c.setStore(st.id);
 c.select([u.id]);
 c.setDate('2026-11-01');
 c.requestPhone();
 c.resolvePhone('success',{method:'wechat',phone:'13800000000'});
 return {c,st,u};
}
assertRun('MK source accepts source store/option but rejects SIM and cross-store IDs',()=>{
 const {c,st,u}=ready();
 assert.equal(C.storeId(F,st.id),st.id);
 assert.deepEqual(C.unitIds(F,st.id,[u.id]),[u.id]);
 assert.throws(()=>C.storeId(F,'SIM_BJ01'),/SOURCE_MISMATCH/);
 assert.throws(()=>C.unitIds(F,st.id,[F.units.find(x=>x.store_id!==st.id).id]),/UNIT_STORE_MISMATCH/);
 assert.equal(C.route(F,{page:'S02',store:st.id}),'index.html?page=S02&store='+encodeURIComponent(st.id));
});
assertRun('old store size-option -> quote -> O01 simulated order one immutable source with no physical warehouse fabrication',()=>{
 const {c,st,u}=ready();
 const item=C.selection(c);
 assert.equal(item.unit_identity_type,'SIZE_OPTION');
 assert.deepEqual(item.size_option_ids,[u.id]);
 assert.deepEqual(item.representative_unit_nos,[u.representative_unit_no]);
 assert.equal(item.pricing_origin,'historical_prediscount_base_demo_formula');
 const q=c.quote();
 const snap=C.quote(c,q);
 assert.equal(snap.amounts.management_fee,50);
 assert.equal(snap.amounts.payable,snap.amounts.rent_after_coupon+snap.amounts.deposit+50);
 assert.throws(()=>C.quote(c,{...q,unit_ids:['SIM_BJ01_U03']}),/QUOTE_IDENTITY_MISMATCH/);
 const o=c.submit();
 const cert=C.order(c,o,snap);
 assert.equal(o.quote_id,q.id);assert.equal(cert.store_id,st.id);
 assert.deepEqual(o.unit_ids,[u.size_option_id]);
 assert.equal(o.payable,snap.amounts.payable);
 assert.equal(o.kind,'SIMULATED_ORDER');
 const paid=c.pay(o.id,'success');
 assert.equal(paid.status,'paid_simulated');
});
console.log('MK_MIGRATION_SUMMARY',JSON.stringify({stores:F.stores.length,options:F.units.length,source:F.sourceNamespace,mode:'legacy',result:'PASS'}));
