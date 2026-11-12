#!/usr/bin/env node
'use strict';
// RC2-FINAL-VIS-SIGNOFF-04: deterministic business contract, no actual payment or identity data.
const assert=require('node:assert/strict');
const {create}=require('../app/prototype/parallel/core-journey-fix-01/demo/demo-core.js');
const F=require('../app/prototype/parallel/core-journey-fix-01/demo/fixtures.js');
const now=Date.parse('2026-11-12T09:00:00+08:00'),core=create({now:()=>now});
let checked=0;const verify=(name,fn)=>{fn();checked++;console.log('PASS',name)};
const fail=(fn,code)=>assert.throws(fn,e=>e.message===code,code);
core.setScenario('normal');core.requestPhone();core.resolvePhone('success',{phone:'13800138000'});
const first=F.units.find(u=>u.status==='available'&&u.volume>=3),second=F.units.find(u=>u.status==='available'&&u.id!==first.id&&u.store_id!==first.store_id&&u.volume>=3);
assert(first&&second);
function newPaid(u,start=core.today()){
 core.setRequirement(u.volume,12,true);core.select([u.id]);core.setDate(start);core.quote();
 const o=core.submit();core.pay(o.id,'success');return o;
}
const a=newPaid(first),b=newPaid(second);
verify('two paid orders have separate initial payments and 12-month periods',()=>{
 const x=core.lifecycleView(a.id),y=core.lifecycleView(b.id);
 assert.equal(x.total_months,12);assert.equal(y.total_months,12);assert.equal(x.payments.length,1);assert.equal(y.payments.length,1);
});
const req=core.lifecycleRequestRenewal(a.id,6),reviewed=core.lifecycleReviewQuote(a.id,req.id,315.9,true);
assert.equal(reviewed.quote_monthly,315);assert.equal(reviewed.quote_total,1890);
const before=core.lifecycleView(a.id);
verify('confirming quote is not a payment, a lease extension or an invoiceable record',()=>{
 const pending=core.lifecycleConfirmRenewal(a.id,req.id);
 assert.equal(pending.status,'PAYMENT_PENDING');assert.equal(pending.payment_id,undefined);
 const after=core.lifecycleView(a.id);
 assert.equal(after.total_months,before.total_months);assert.equal(after.end_date,before.end_date);
 assert.deepEqual(after.payments,before.payments);
 fail(()=>core.lifecycleRequestInvoice(a.id,'LRENEW_PAYMENT_INVALID',{kind:'personal',title:'测试',email:'test@example.com'}),'INVALID_PAYMENT');
 fail(()=>core.lifecycleRequestRenewal(a.id,2),'RENEWAL_ALREADY_PENDING');
});
verify('payment cancellation persists and can recover the same quote and order',()=>{
 assert.equal(core.lifecyclePayRenewal(a.id,req.id,'cancelled').status,'PAYMENT_CANCELLED');
 const after=core.lifecycleView(a.id);assert.equal(after.total_months,12);assert.equal(after.payments.length,1);
 const restored=create({now:()=>now,state:core.state()});
 assert.equal(restored.lifecycleView(a.id).renewal_requests.at(-1).status,'PAYMENT_CANCELLED');
 assert.equal(core.lifecycleConfirmRenewal(a.id,req.id).status,'PAYMENT_PENDING');
});
verify('payment failure preserves price and does not invent an invoice',()=>{
 const failed=core.lifecyclePayRenewal(a.id,req.id,'failed');assert.equal(failed.status,'PAYMENT_FAILED');
 assert.equal(failed.quote_total,1890);assert.equal(core.lifecycleView(a.id).payments.length,1);
 assert.equal(core.lifecycleConfirmRenewal(a.id,req.id).status,'PAYMENT_PENDING');
});
verify('only successful explicit payment extends lease and creates a unique payment',()=>{
 const done=core.lifecyclePayRenewal(a.id,req.id,'success');
 assert.equal(done.status,'COMPLETED');assert.equal(done.paid_amount,1890);
 assert(done.payment_id.startsWith('LRENEW_PAYMENT_'));
 const view=core.lifecycleView(a.id);assert.equal(view.total_months,18);assert.equal(view.payments.length,2);
 assert.equal(view.payments[1].id,done.payment_id);assert.equal(view.payments[1].amount,1890);
 fail(()=>core.lifecyclePayRenewal(a.id,req.id,'success'),'RENEWAL_PAYMENT_NOT_PENDING');
 const invoice=core.lifecycleRequestInvoice(a.id,done.payment_id,{kind:'personal',title:'示例',email:'test@example.com'});
 assert.equal(invoice.payment_amount,1890);assert.equal(invoice.status,'SUBMITTED');
 fail(()=>core.lifecycleRequestInvoice(a.id,done.payment_id,{kind:'personal',title:'示例',email:'test@example.com'}),'INVOICE_EXISTS');
});
verify('other paid order remains unrelated to renewal payment and invoice history',()=>{
 const y=core.lifecycleView(b.id);assert.equal(y.total_months,12);assert.equal(y.payments.length,1);assert.equal(y.invoices.length,0);
});
verify('identity submission is reviewing, cannot unlock and never stores name or identity number',()=>{
 const before=core.lifecycleView(b.id);assert.equal(before.identity_status,'pending');
 assert.equal(core.requestIdentityVerification(b.id).status,'reviewing');
 assert.equal(core.lifecycleView(b.id).identity_status,'reviewing');
 assert.equal(core.lifecycleView(b.id).access_allowed,false);
 fail(()=>core.enterStorage(b.id),'IDENTITY_REQUIRED');
 fail(()=>core.requestIdentityVerification(b.id),'IDENTITY_REVIEW_PENDING');
 assert(!JSON.stringify(core.state()).includes('11010119900101123X'));
});
verify('reviewer can decline then user resubmit; only a later reviewer result may qualify lease',()=>{
 core.identity(b.id,'failed');assert.equal(core.lifecycleView(b.id).identity_status,'failed');
 assert.equal(core.requestIdentityVerification(b.id).status,'reviewing');
 core.identity(b.id,'success');assert.equal(core.lifecycleView(b.id).identity_status,'verified');
 fail(()=>core.requestIdentityVerification(b.id),'IDENTITY_ALREADY_VERIFIED');
 assert.equal(core.lifecycleView(a.id).identity_status,'pending');
});
verify('pending start date remains closed even after reviewer verifies identity',()=>{
 const snapshot=core.state(),order=snapshot.orders.find(o=>o.id===b.id);
 order.start_date='2026-11-20';
 const future=create({now:()=>now,state:snapshot});
 assert.equal(future.lifecycleView(b.id).lease_status,'upcoming');assert.equal(future.lifecycleView(b.id).access_allowed,false);
 fail(()=>future.enterStorage(b.id),'BEFORE_START');
});
console.log('RC2-VIS04 BUSINESS PASS '+checked+'/'+checked);
