'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const F=require(path.join(root,'fixtures.js'));
const {create}=require(path.join(root,'demo-core.js'));
const policy=require(path.join(root,'h01-state-policy-01.js'));
const MS=3*60*60*1000;
const start=Date.parse('2026-11-11T10:00:00Z');
let passed=0;
function check(name,fn){try{fn();passed++;}catch(e){e.message=name+': '+e.message;throw e;}}
function setup(){
  let now=start;
  const core=create({now:()=>now});
  const store=F.stores.find(x=>x.city===core.state().city&&x.status==='open');
  const unit=F.units.find(x=>x.store_id===store.id&&x.status==='available');
  assert.ok(unit);
  core.setRequirement(unit.volume,12,true);core.select([unit.id]);core.setDate(core.today());
  core.requestPhone();core.resolvePhone('success',{phone:'13800000000'});
  const quote=core.quote(),order=core.submit();
  return {core,unit,order,quote,getNow:()=>now,setNow:v=>{now=v},reauth:()=>{core.requestPhone();core.resolvePhone('success',{phone:'13800000000'})}};
}
check('new unpaid order gets exactly three hours',()=>{
  const s=setup();assert.equal(s.order.createdAt,start);assert.equal(s.order.expiresAt-start,MS);
  assert.equal(s.order.expiresAt-s.order.createdAt,MS);assert.equal(s.core.state().stock[s.unit.id],'reserved');
});
check('quote still expires after five minutes',()=>{
  const s=setup();assert.equal(s.quote.expiresAt-start,5*60*1000);
});
check('one second before the deadline stays payable',()=>{
  const s=setup();s.setNow(s.order.expiresAt-1000);
  assert.equal(s.core.expirePendingOrders(),0);
  assert.equal(s.core.orderDetail(s.order.id).status,'pending');
  assert.equal(policy.derive(s.core.state(),s.core,s.getNow()).key,'pending');
});
check('deadline is exclusive and releases inventory once',()=>{
  const s=setup();s.setNow(s.order.expiresAt);
  assert.equal(s.core.expirePendingOrders(),1);
  assert.equal(s.core.orderDetail(s.order.id).status,'expired');
  assert.equal(s.core.state().stock[s.unit.id],'available');
  assert.equal(s.core.expirePendingOrders(),0);
  const view=policy.derive(s.core.state(),s.core,s.getNow());
  assert.equal(view.key,'expired');assert.equal(view.primary[1],'restart');
});
check('background return after deadline expires immediately',()=>{
  const s=setup();s.setNow(s.order.expiresAt+30000);
  const resumed=create({now:s.getNow,state:s.core.state()});
  assert.equal(resumed.expirePendingOrders(),1);assert.equal(resumed.state().orders[0].status,'expired');
});
check('late payment cannot revive expired order',()=>{
  const s=setup();s.setNow(s.order.expiresAt);assert.equal(s.core.expirePendingOrders(),1);
  s.reauth();const result=s.core.pay(s.order.id,'success');
  assert.equal(result.status,'expired');
  assert.notEqual(s.core.orderDetail(s.order.id).status,'paid_simulated');
});
check('payment before three hours succeeds and removes pending task',()=>{
  const s=setup();s.setNow(s.order.expiresAt-1000);s.reauth();
  assert.equal(s.core.pay(s.order.id,'success').status,'paid_simulated');
  assert.equal(s.core.expirePendingOrders(),0);
  assert.notEqual(policy.derive(s.core.state(),s.core,s.getNow()).key,'pending');
});
check('failed payment still follows existing immediate release rule',()=>{
  const s=setup();const r=s.core.pay(s.order.id,'failed');
  assert.equal(r.status,'payment_failed');assert.equal(s.core.state().stock[s.unit.id],'available');
});
check('failed payment ends original order immediately without waiting three hours',()=>{
  const s=setup();
  const failed=s.core.pay(s.order.id,'failed');
  assert.equal(failed.status,'payment_failed');
  assert.equal(s.core.state().stock[s.unit.id],'available');
  assert.equal(s.core.expirePendingOrders(),0);
  const home=policy.derive(s.core.state(),s.core,s.getNow());
  assert.equal(home.key,'payment_failed');
  assert.equal(home.primary[1],'restart');
});
check('failed order cannot be directly paid after release',()=>{
  const s=setup();
  s.core.pay(s.order.id,'failed');
  const old=s.core.pay(s.order.id,'success');
  assert.equal(old.status,'payment_failed');
  assert.notEqual(s.core.orderDetail(s.order.id).status,'paid_simulated');
});
check('retry after payment failure creates a new order and new three-hour deadline',()=>{
  const s=setup();s.core.pay(s.order.id,'failed');
  s.setNow(start+5*60*1000);
  s.core.setRequirement(s.unit.volume,12,true);
  s.core.select([s.unit.id]);s.core.setDate(s.core.today());
  const q=s.core.quote(),replacement=s.core.submit();
  assert.notEqual(q.id,s.quote.id);assert.notEqual(replacement.id,s.order.id);
  assert.equal(replacement.expiresAt-s.getNow(),MS);
  assert.equal(s.core.orderDetail(s.order.id).status,'payment_failed');
  assert.equal(s.core.state().stock[s.unit.id],'reserved');
});
check('expired order requires a new quote and new order identity',()=>{
  const s=setup();s.setNow(s.order.expiresAt);s.core.expirePendingOrders();s.reauth();
  s.core.setRequirement(s.unit.volume,12,true);s.core.select([s.unit.id]);s.core.setDate(s.core.today());
  const newQuote=s.core.quote(),newOrder=s.core.submit();
  assert.notEqual(newOrder.id,s.order.id);
  assert.notEqual(newQuote.id,s.quote.id);
  assert.equal(newOrder.expiresAt-s.getNow(),MS);
});
check('legacy pending order keeps its original absolute deadline',()=>{
  const s=setup(),snapshot=s.core.state();
  snapshot.orders[0].expiresAt=snapshot.orders[0].createdAt+15*60*1000;
  s.setNow(start+15*60*1000);
  const old=create({now:s.getNow,state:snapshot});
  assert.equal(old.expirePendingOrders(),1);
});
check('resume pending by order ID after demand was changed',()=>{
  const s=setup();s.core.clearSelection();s.core.setRequirement(8,6,true);
  const restored=s.core.resumePendingOrder(s.order.id);
  assert.equal(restored.status,'pending');
  assert.deepEqual(s.core.state().selected,[s.unit.id]);
  assert.equal(s.core.state().requirement.term_months,12);
  assert.equal(restored.expiresAt,s.order.expiresAt);
});
check('resumed valid order pays without generating a new quote',()=>{
  const s=setup();s.core.clearSelection();s.core.resumePendingOrder(s.order.id);
  assert.equal(s.core.pay(s.order.id,'success').status,'paid_simulated');
  assert.equal(s.core.state().stock[s.unit.id],'occupied');
});
check('resuming expired order releases reserved unit, never restarts clock',()=>{
  const s=setup();s.core.clearSelection();s.setNow(s.order.expiresAt);
  assert.equal(s.core.resumePendingOrder(s.order.id).status,'expired');
  assert.equal(s.core.state().stock[s.unit.id],'available');
});
check('resuming failed order does not recreate payment eligibility',()=>{
  const s=setup();s.core.pay(s.order.id,'failed');
  assert.equal(s.core.resumePendingOrder(s.order.id).status,'payment_failed');
});
check('price changed before resuming invalidates pending order',()=>{
  const s=setup(),snapshot=s.core.state();
  snapshot.prices[s.unit.id]=s.order.price_bases[0]+10;
  const alt=create({now:s.getNow,state:snapshot});
  assert.equal(alt.resumePendingOrder(s.order.id).status,'invalidated');
  assert.equal(alt.state().stock[s.unit.id],'available');
});
console.log('H01-ORDER-3H: '+passed+'/'+passed+' shared-core regression checks PASS');
