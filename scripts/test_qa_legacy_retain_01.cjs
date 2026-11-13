#!/usr/bin/env node
'use strict';

// QA-LEGACY-RETAIN-01: executable boundary checks against the frozen signed RC2 runtime.
// This QA-only branch is forked from 41a8a079...; no runtime/visual files are edited.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const demo=path.join(root,'app/prototype/parallel/core-journey-fix-01/demo');
const {create}=require(path.join(demo,'demo-core.js'));
const F=require(path.join(demo,'fixtures.js'));
const fixed=Date.parse('2026-11-13T12:00:00Z');
const signed='41a8a079eb48049e1060512bddf71c226bfd3738';
const results=[];
function check(name,fn){
  try{fn();results.push({name,status:'PASS'});}
  catch(e){results.push({name,status:'FAIL',message:String(e.message||e)});throw e;}
}
const approvedImage='app/assets/branch01/VIS-11J_用户批准唯一视觉母版.png';
const sourceGate='docs/RC2_MERGE_PREP_02_SOURCE_GATE.json';
check('VIS11J approved source path and verified SHA256',()=>{
  const cfg=JSON.parse(fs.readFileSync(path.join(root,sourceGate),'utf8'));
  assert.equal(cfg.h01.approved_master_repo_path,approvedImage);
  assert.equal(cfg.h01.effective_h01_visual,'VIS11J_USER_APPROVED_FINAL_VISUAL_20261102');
  const sha256=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,approvedImage))).digest('hex');
  assert.equal(sha256,'30749d1700c025423a4d54fb3e34e99e9516bf299fac2a2cf073a9e1b0560660');
  assert.equal(sha256,cfg.h01.approved_master_sha256);
  const blob=cp.execFileSync('git',['hash-object',approvedImage],{cwd:root,encoding:'utf8'}).trim();
  assert.equal(blob,'ba9995b7ca50079549d3e69ffde2bb3bdb7e4ee3');
  assert.equal(blob,cfg.h01.approved_master_git_blob);
});
check('frozen approved image is identical to the signed RC2 SHA',()=>{
  const frozen=cp.execFileSync('git',['rev-parse',signed+':'+approvedImage],{cwd:root,encoding:'utf8'}).trim();
  const current=cp.execFileSync('git',['rev-parse','HEAD:'+approvedImage],{cwd:root,encoding:'utf8'}).trim();
  assert.equal(current,frozen);
});
const availableStore=F.stores.find(s=>s.status==='open'&&s.city==='北京');
const availableUnit=F.units.find(u=>u.store_id===availableStore?.id&&u.status==='available');
assert.ok(availableStore&&availableUnit,'fixture must contain an open Beijing store with available stock');

const baseline=create({now:()=>fixed}).state();
const id='QA_LEGACY_PAID_ORDER';
baseline.orders=[{
  id,kind:'SIMULATED_ORDER',status:'paid_simulated',
  store_id:availableStore.id,unit_ids:[availableUnit.id],
  term_months:6,start_date:'2026-11-01',payable:4857,deposit:687
}];
baseline.services={[id]:{identity:'verified',useStatus:'active',renewals:[],exit:null,deposit:'held',invoices:[]}};
baseline.auth={status:'verified',phone:'13800138000',method:'qa_fixture',expiresAt:fixed+86400000};
baseline.stock[availableUnit.id]='occupied';
const core=create({now:()=>fixed,state:baseline});
check('paid order starts with six months and one initial payment',()=>{
  const life=core.lifecycleView(id);
  assert.equal(life.lease_status,'active');
  assert.equal(life.total_months,6);
  assert.equal(life.payments.length,1);
});
const req=core.lifecycleRequestRenewal(id,3);
check('renewal request is not yet a paid extension',()=>{
  assert.equal(req.status,'QUOTE_PENDING');
  assert.equal(core.lifecycleView(id).total_months,6);
  assert.equal(core.lifecycleView(id).payments.length,1);
});
check('reviewer authority is required before quoting renewal',()=>{
  assert.throws(()=>core.lifecycleReviewQuote(id,req.id,700,false),/REVIEW_ONLY/);
});
core.lifecycleReviewQuote(id,req.id,700,true);
const pending=core.lifecycleConfirmRenewal(id,req.id);
check('quotation acceptance preserves term and payment count',()=>{
  assert.equal(pending.id,req.id);
  assert.equal(pending.status,'PAYMENT_PENDING');
  assert.equal(core.lifecycleView(id).total_months,6);
  assert.equal(core.lifecycleView(id).payments.length,1);
});
const cancelled=core.lifecyclePayRenewal(id,req.id,'cancelled');
check('cancelled renewal payment does not extend lease or invoiceable records',()=>{
  assert.equal(cancelled.status,'PAYMENT_CANCELLED');
  assert.equal(core.lifecycleView(id).total_months,6);
  assert.equal(core.lifecycleView(id).payments.length,1);
});
const reentered=core.lifecycleConfirmRenewal(id,req.id);
check('renewal resume reuses the same request identity',()=>{
  assert.equal(reentered.id,req.id);
  assert.equal(reentered.status,'PAYMENT_PENDING');
  assert.equal(core.lifecycleView(id).renewal_requests.length,1);
});
const completed=core.lifecyclePayRenewal(id,req.id,'success');
check('one successful renewal creates exactly one renewal payment',()=>{
  const life=core.lifecycleView(id);
  assert.equal(completed.status,'COMPLETED');
  assert.equal(life.total_months,9);
  assert.equal(life.payments.length,2);
  assert.equal(life.payments[1].id,completed.payment_id);
  assert.equal(life.renewal_requests.length,1);
});
check('repeated renewal callback cannot pay a completed request again',()=>{
  assert.throws(()=>core.lifecyclePayRenewal(id,req.id,'success'),/RENEWAL_PAYMENT_NOT_PENDING/);
  assert.equal(core.lifecycleView(id).payments.length,2);
});
const invoice=core.lifecycleRequestInvoice(id,completed.payment_id,{
  kind:'enterprise',title:'测试企业',email:'finance@example.com',tax_id:'1234567890'
});
check('successful renewal payment can be invoiced once',()=>{
  assert.equal(invoice.status,'SUBMITTED');
  assert.equal(invoice.payment_id,completed.payment_id);
  assert.equal(core.lifecycleView(id).invoices.length,1);
});
check('repeat invoice request for same payment is rejected',()=>{
  assert.throws(()=>core.lifecycleRequestInvoice(id,completed.payment_id,{
    kind:'personal',title:'测试用户',email:'user@example.com'
  }),/INVOICE_EXISTS/);
  assert.equal(core.lifecycleView(id).invoices.length,1);
});
check('cumulative 9+52 months exceeds the sixty month limit',()=>{
  assert.throws(()=>core.lifecycleRequestRenewal(id,52),/RENEWAL_UNAVAILABLE/);
});
const lastReq=core.lifecycleRequestRenewal(id,51);
check('cumulative 9+51 months is eligible for the exact upper boundary',()=>{
  assert.equal(lastReq.status,'QUOTE_PENDING');
  assert.equal(lastReq.months,51);
});
core.lifecycleReviewQuote(id,lastReq.id,100,true);
core.lifecycleConfirmRenewal(id,lastReq.id);
core.lifecyclePayRenewal(id,lastReq.id,'success');
check('successfully renewed sixty-month lease cannot extend further',()=>{
  assert.equal(core.lifecycleView(id).total_months,60);
  assert.equal(core.lifecycleView(id).payments.length,3);
  assert.throws(()=>core.lifecycleRequestRenewal(id,1),/RENEWAL_UNAVAILABLE/);
});

// Separate checkout core: initial order payment screen cancellation is not order cancellation.
// Returning to the pending order must reuse the original identity, quote and reservation.
const fresh=create({now:()=>fixed});
const store=F.stores.find(s=>s.status==='open'&&s.city===fresh.state().city);
const unit=F.units.find(u=>u.store_id===store?.id&&u.status==='available');
assert.ok(store&&unit);
fresh.setRequirement(unit.volume,12,true);
fresh.select([unit.id]);
fresh.setDate(fresh.today());
fresh.requestPhone();
fresh.resolvePhone('success',{phone:'13800138000'});
const quote=fresh.quote(),order=fresh.submit();
check('new pending order creates one order and one reserved unit',()=>{
  assert.equal(order.status,'pending');
  assert.equal(fresh.state().orders.length,1);
  assert.equal(fresh.state().stock[unit.id],'reserved');
});
fresh.clearSelection();
const restored=fresh.resumePendingOrder(order.id);
const restoredAgain=fresh.resumePendingOrder(order.id);
check('returning after payment-screen cancellation reuses pending order ID',()=>{
  assert.equal(restored.id,order.id);
  assert.equal(restoredAgain.id,order.id);
  assert.equal(restored.quote_id,quote.id);
  assert.equal(fresh.state().orders.length,1);
});
const paid=fresh.pay(order.id,'success');
check('resumed order pays once without a duplicate order',()=>{
  assert.equal(paid.status,'paid_simulated');
  assert.equal(fresh.state().orders.length,1);
  assert.equal(fresh.state().orders.filter(x=>x.id===order.id).length,1);
});
check('repeat initial payment callback is idempotent',()=>{
  assert.equal(fresh.pay(order.id,'success').status,'paid_simulated');
  assert.equal(fresh.state().orders.length,1);
});

const output=path.join(root,'release-evidence/qa-legacy-retain-01');
fs.mkdirSync(output,{recursive:true});
const evidence={
  task:'QA-LEGACY-RETAIN-01',
  signed_runtime_sha:signed,
  qa_branch_sha:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
  runtime_unchanged:true,
  status:'PASS',
  checks:results,
  checks_passed:results.length,
  scope:['initial order resume identity','renewal cancel/resume','invoice idempotency','60-month cumulative limit','VIS11J approval hash'],
  stage:'ISOLATED_QA_EVIDENCE_ONLY',
  main_merge_allowed:false,
  deployment_allowed:false
};
fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(evidence,null,2)+'\n');
console.log('QA_LEGACY_RETAIN_01_PASS',JSON.stringify({tests:results.length,sha:evidence.qa_branch_sha,signed_runtime_sha:signed}));
