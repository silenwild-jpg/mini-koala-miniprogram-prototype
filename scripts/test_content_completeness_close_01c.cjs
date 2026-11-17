'use strict';
const assert=require('node:assert/strict');
const base='../app/prototype/parallel/core-journey-fix-01/demo/';
const SIM_CORE=require(base+'demo-core.js');globalThis.SIM_CORE=SIM_CORE;
const {create}=require(base+'lead-flow.js');
const input={phone:'13800000001',address:'合成测试地址01',note:'合成测试'};
(async()=>{
 let count=0;
 for(const kind of ['booking','advisor','enterprise']){
  const core=SIM_CORE.create(),packet={},persist=()=>{},flow=create({core,kind,packet,persist,delay:1});
  const data=kind==='enterprise'?{phone:input.phone,notes:input.note}:input;
  flow.scenario('fail_once');await flow.submit(data);assert.equal(packet.status,'FAILED_RETRYABLE');const key=packet.key;
  await Promise.all([flow.submit(data),flow.submit(data)]);assert.equal(packet.status,'SUCCESS');assert.equal(packet.key,key);
  const rows=()=>core.state()[kind==='enterprise'?'enterpriseLeads':'leads'];assert.equal(rows().length,1);
  await flow.submit(data);assert.equal(rows().length,1);
  assert.equal(core.state().orders.length,0);count+=4;
  flow.reset();flow.scenario('timeout_saved');await flow.submit(data);assert.equal(packet.status,'UNKNOWN_RESULT');const saved=rows().length;
  const restored=create({core,kind,packet:JSON.parse(JSON.stringify(packet)),persist,delay:1});await restored.submit({...data,phone:'13800000002'});
  assert.equal(restored.packet.status,'SUCCESS');assert.equal(rows().length,saved);assert.equal(restored.packet.result.phone,input.phone);count+=3;
  const failure={},blocked=create({core,kind,packet:failure,persist:()=>{throw Error('QuotaExceededError');},delay:1});
  await blocked.submit(data);assert.equal(failure.status,'STORAGE_ERROR');assert.equal(rows().length,saved);count+=2;
  assert.throws(()=>core.submitLeadRequest('rollback',kind,data,()=>{throw Error('QuotaExceededError');}));assert.equal(rows().length,saved);count++;
  if(kind==='enterprise'){
   const id=rows()[0].id;const edit=create({core,kind,persist,delay:1});await edit.submit({...data,lead_id:id,notes:'编辑合成记录'});
   assert.equal(rows().length,saved);assert.equal(rows()[0].notes,'编辑合成记录');count+=2;
  }
 }
 const core=SIM_CORE.create();core.setScenario('lifeRefund');const id=core.state().orders.at(-1).id;
 assert.throws(()=>core.lifecycleDemoRefund(id,'failed',false),/REVIEW_ONLY/);
 core.lifecycleDemoRefund(id,'failed',true);assert.equal(core.lifecycleView(id).deposit_status,'REFUND_FAILED');
 assert.throws(()=>core.lifecycleReviewRefund(id,false),/REVIEW_ONLY/);
 core.lifecycleDemoRefund(id,'processing',true);assert.equal(core.lifecycleView(id).deposit_status,'REFUND_PENDING');
 if(!core.authorized()){core.requestPhone();core.resolvePhone('success',{phone:input.phone});}const payment=core.lifecycleView(id).payments[0];
 const inv=core.lifecycleRequestInvoice(id,payment.id,{kind:'personal',title:'合成测试抬头',email:'qa@example.invalid'});
 assert.throws(()=>core.lifecycleDemoInvoice(id,inv.id,'failed',false),/REVIEW_ONLY/);
 core.lifecycleDemoInvoice(id,inv.id,'failed',true);core.lifecycleRetryInvoice(id,inv.id,{title:'更正抬头',email:'retry@example.invalid'});
 assert.equal(core.lifecycleView(id).invoices.length,1);assert.equal(core.lifecycleView(id).invoices[0].status,'PROCESSING');
 assert.throws(()=>core.lifecycleRetryInvoice(id,inv.id,{title:'重复',email:'qa@example.invalid'}),/INVALID_INVOICE_STATE/);
 count+=8;console.log('CONTENT_CLOSE_01C_UNIT_PASS',count,'assertion groups');
})().catch(e=>{console.error(e);process.exitCode=1;});
