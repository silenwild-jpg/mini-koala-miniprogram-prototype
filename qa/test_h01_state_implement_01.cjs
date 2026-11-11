'use strict';
/* H01-STATE-IMPLEMENT-01: use the real shared fixture and order lifecycle engine. */
const assert=require('node:assert/strict');
const path=require('node:path');
const base=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const fixture=require(path.join(base,'fixtures.js'));
const coreApi=require(path.join(base,'demo-core.js'));
const policy=require(path.join(base,'h01-state-policy-01.js'));
const now=Date.parse('2026-11-11T12:00:00Z');
let passed=0;
function check(name,make,expected,extra){
  const state=make();
  const original=JSON.stringify(state);
  const core=coreApi.create({now:()=>now,state});
  const out=policy.derive(core.state(),core,now);
  assert.equal(out.key,expected,name);
  if(extra)extra(out);
  assert.equal(JSON.stringify(state),original,'policy must not mutate source: '+name);
  passed++;
}
function baseState(){return coreApi.create({now:()=>now}).state()}
const bid=fixture.stores.find(x=>x.city==='北京')?.id||fixture.stores[0].id;
const sampleUnit=fixture.units.find(x=>x.store_id===bid);
function order(id,status,values={}){
  return {id,status,store_id:bid,unit_ids:[sampleUnit.id],start_date:'2026-11-01',term_months:12,payable:3430,...values};
}
function paid(id,values={}){return order(id,'paid_simulated',values)}
check('no task uses full marketing',baseState,'new',x=>assert.equal(x.isMarketing,true));
check('estimated capacity remains actionable',()=>{const s=baseState();s.requirement={capacity_m3:3,term_months:12,term_confirmed:true};return s},'estimated');
check('pending is actionable while valid',()=>{const s=baseState();s.orders=[order('P','pending',{expiresAt:now+60000})];return s},'pending',x=>assert.equal(x.primary[0],'继续支付'));
check('pending expiry not payable',()=>{const s=baseState();s.orders=[order('P','pending',{expiresAt:now-100})];return s},'expired',x=>assert.notEqual(x.primary[0],'继续支付'));
for(const st of ['payment_failed','cancelled','invalidated','expired']){
  check(st+' cannot retry old payment',()=>{const s=baseState();s.orders=[order('P',st)];return s},st,x=>assert.equal(x.primary[0],'查看订单'));
}
check('paid without identity never grants access',()=>{const s=baseState();s.orders=[paid('A')];return s},'identity');
check('paid identity verified and active',()=>{const s=baseState();s.orders=[paid('A')];s.services.A={identity:'verified'};return s},'active');
check('pending newer order outranks paid active',()=>{const s=baseState();s.orders=[paid('A'),order('P','pending',{expiresAt:now+60000})];s.services.A={identity:'verified'};return s},'pending',x=>assert.equal(x.hasRental,true));
check('refund pending beats normal service',()=>{const s=baseState();s.orders=[paid('A')];s.services.A={identity:'verified',lifecycle_v2:{renewal_requests:[],exit:{status:'INSPECTION_PASSED'},deposit:'REFUND_PENDING'}};return s},'refund');
check('returning from inspection',()=>{const s=baseState();s.orders=[paid('A')];s.services.A={identity:'verified',lifecycle_v2:{renewal_requests:[],exit:{status:'WAITING_INSPECTION'},deposit:'WAITING_INSPECTION'}};return s},'returning');
check('renewal quote ahead of normal in-rent',()=>{const s=baseState();s.orders=[paid('A')];s.services.A={identity:'verified',lifecycle_v2:{renewal_requests:[{status:'QUOTE_PENDING'}],exit:null,deposit:'HELD'}};return s},'renewal');
console.log('H01-STATE-IMPLEMENT-01: '+passed+' shared-core policy checks PASS');
