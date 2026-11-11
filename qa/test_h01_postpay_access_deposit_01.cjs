'use strict';
/* H01-POSTPAY-ACCESS-01 | real shared core, no hardware unlock success assertions. */
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const F=require(path.join(root,'fixtures.js')),Core=require(path.join(root,'demo-core.js')),Policy=require(path.join(root,'h01-state-policy-01.js'));
const now=Date.parse('2026-11-11T12:00:00+08:00');
let pass=0;
function check(name,fn){fn();pass++;console.log('H01-ACCESS '+name+' PASS')}
function setup(phase,months=12,identity=true){
  let api=Core.create({now:()=>now});
  const st=F.stores.find(x=>x.city===api.state().city&&x.status==='open');
  const unit=F.units.find(x=>x.store_id===st.id&&api.available(x));
  api.setRequirement(unit.volume,months,true);api.select([unit.id]);api.setDate(api.today());
  api.requestPhone();api.resolvePhone('success',{phone:'13800138000'});api.quote();
  const order=api.submit();api.pay(order.id,'success');
  const snapshot=api.state(),o=snapshot.orders.find(x=>x.id===order.id);
  if(phase==='upcoming')o.start_date='2026-11-20';
  else if(phase==='active')o.start_date='2026-10-01';
  else if(phase==='expired')o.start_date='2026-01-01';
  api=Core.create({now:()=>now,state:snapshot});if(identity)api.identity(order.id,'success');
  return {api,order,st,unit};
}
check('unverified paid order does not open lock',()=>{
  const x=setup('active',12,false);
  assert.equal(Policy.derive(x.api.state(),x.api,now).key,'identity');
  assert.deepEqual(Policy.accessDecision(x.api.state(),x.api,x.order.id).reason,'identity');
});
check('prestart sees unlock CTA but must wait for lease start',()=>{
  const x=setup('upcoming');
  const p=Policy.derive(x.api.state(),x.api,now),d=Policy.accessDecision(x.api.state(),x.api,x.order.id);
  assert.equal(p.key,'upcoming');assert.equal(p.primary[1],'unlock');assert.equal(p.secondary[1],'navigate');
  assert.equal(d.reason,'before_start');assert.equal(d.allowed,false);
});
check('verified active lease allows only eligible access',()=>{
  const x=setup('active'),p=Policy.derive(x.api.state(),x.api,now);
  assert.equal(p.key,'active');assert.equal(p.primary[1],'unlock');
  assert.equal(Policy.accessDecision(x.api.state(),x.api,x.order.id).allowed,true);
});
check('expired paid lease surfaces deposit application and refuses unlock',()=>{
  const x=setup('expired',1),p=Policy.derive(x.api.state(),x.api,now);
  assert.equal(p.key,'lease_expired');assert.equal(p.primary[1],'exit');
  assert.equal(Policy.accessDecision(x.api.state(),x.api,x.order.id).allowed,false);
});
check('expired lease can request exit and inspection then refund processing',()=>{
  const x=setup('expired',1);
  assert.equal(x.api.lifecycleRequestExit(x.order.id,'expiry',x.api.today()).status,'REQUESTED');
  assert.equal(x.api.lifecycleRequestInspection(x.order.id).status,'WAITING_INSPECTION');
  assert.equal(x.api.lifecycleReviewInspection(x.order.id,'passed',true).status,'INSPECTION_PASSED');
  const p=Policy.derive(x.api.state(),x.api,now);
  assert.equal(p.key,'refund');assert.equal(p.primary[1],'deposit');
});
check('verified rent in return request retains lock only before inspection',()=>{
  const x=setup('active');x.api.lifecycleRequestExit(x.order.id,'early',x.api.today());
  const p=Policy.derive(x.api.state(),x.api,now);
  assert.equal(p.key,'returning');assert.equal(p.secondary[1],'unlock');
  assert.equal(Policy.accessDecision(x.api.state(),x.api,x.order.id).allowed,true);
  x.api.lifecycleRequestInspection(x.order.id);
  assert.equal(Policy.accessDecision(x.api.state(),x.api,x.order.id).allowed,false);
});
check('failed payment has no lock eligibility',()=>{
  const api=Core.create({now:()=>now});
  assert.equal(Policy.accessDecision(api.state(),api,'nonexistent').reason,'not_paid');
});
check('expired rental does not revive old payment flow',()=>{
  const x=setup('expired',1);const p=Policy.derive(x.api.state(),x.api,now);
  assert.notEqual(p.primary[1],'order');assert.equal(x.api.state().orders[0].status,'paid_simulated');
});
check('lock approval is not granted by mere paid order status',()=>{
  const x=setup('upcoming');
  assert.equal(x.api.state().orders[0].status,'paid_simulated');
  assert.equal(x.api.lifecycleView(x.order.id).access_allowed,false);
});
console.log('H01-POSTPAY-ACCESS-01: '+pass+'/'+pass+' PASS');
