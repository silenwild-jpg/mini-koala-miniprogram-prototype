#!/usr/bin/env node
'use strict';
// Deterministic UTC+8 business-day boundaries, including start day and expiry.
const assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const fixtures=require(path.join(root,'fixtures.js'));
const {create}=require(path.join(root,'demo-core.js'));
const policy=require(path.join(root,'h01-state-policy-01.js'));
let clock=Date.parse('2026-11-11T22:14:00Z'); // Beijing 2026-11-12 06:14, UTC is still Nov 11.
function newCore(months=12,start='2026-11-12'){
 const c=create({now:()=>clock});c.setScenario('normal');c.setRequirement(3,months,true);
 c.requestPhone();c.resolvePhone('success',{phone:'13800138000'});
 const unit=c.matchingUnits().find(u=>u.volume>=3);assert(unit,'test fixture must contain warehouse option');
 c.select([unit.id]);c.setDate(start);c.quote();
 const order=c.submit();assert.equal(order.expiresAt-order.createdAt,10800000,'3-hour payment contract');
 c.pay(order.id,'success');c.identity(order.id,'success');
 return {c,order};
}
const start=newCore(),today=start.c.today();
assert.equal(today,'2026-11-12','UTC+8 business date');
assert.equal(start.c.lifecycleView(start.order.id).lease_status,'active','same Beijing start day must not be upcoming');
assert.equal(start.c.lifecycleView(start.order.id).access_allowed,true,'verified same-day renter can access');
assert.equal(policy.derive(start.c.state(),start.c,clock).key,'active','H01 task uses same business-day lifecycle');
assert.doesNotThrow(()=>start.c.enterStorage(start.order.id),'entry must not block local start day');
const future=newCore(12,'2026-11-13');
assert.equal(future.c.lifecycleView(future.order.id).lease_status,'upcoming','tomorrow remains upcoming');
assert.equal(future.c.lifecycleView(future.order.id).access_allowed,false,'future access denied');
assert.throws(()=>future.c.enterStorage(future.order.id),/BEFORE_START/,'future entry must remain guarded');
// A paid one-month lease must change to expired at local UTC+8 midnight, not UTC midnight.
const oneMonth=newCore(1,'2026-11-12');
assert.equal(oneMonth.c.lifecycleView(oneMonth.order.id).end_date,'2026-12-12');
clock=Date.parse('2026-12-10T22:14:00Z'); // Beijing Dec 11 06:14, tomorrow is Dec 12.
const expiring=policy.derive(oneMonth.c.state(),oneMonth.c,clock);
assert.equal(expiring.key,'expiring');
assert(expiring.facts.some(row=>row[0]==='1天'),'H01 must report one UTC+8 calendar day, not two');
clock=Date.parse('2026-12-11T15:59:00Z'); // Beijing Dec 11 23:59
assert.equal(oneMonth.c.today(),'2026-12-11');
assert.equal(oneMonth.c.lifecycleView(oneMonth.order.id).lease_status,'active','before Beijing midnight active');
clock=Date.parse('2026-12-11T16:01:00Z'); // Beijing Dec 12 00:01
assert.equal(oneMonth.c.today(),'2026-12-12');
assert.equal(oneMonth.c.lifecycleView(oneMonth.order.id).lease_status,'expired','after Beijing midnight expired');
assert.equal(oneMonth.c.lifecycleView(oneMonth.order.id).access_allowed,false);
assert.throws(()=>oneMonth.c.enterStorage(oneMonth.order.id),/ORDER_CLOSED/,'expired entry remains blocked');
console.log('H01-M01 BUSINESS DATE PASS: UTC+8 current, future, local midnight expiry, 3h unchanged');
