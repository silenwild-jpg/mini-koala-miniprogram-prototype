'use strict';
const assert=require('node:assert/strict');
const {create}=require('../app/prototype/parallel/core-journey-fix-01/demo/gift-term-policy.js');
const policy=create();

function approvedCampaign(){
  return {id:'GIFT-C1',source_type:'CAMPAIGN',source_id:'CAMPAIGN-DEMO',
    store_id:'SIM_BJ01',unit_id:'SIM_BJ01_U04',gift_months:1,status:'APPROVED',
    created_at:'2026-10-01',expires_at:'2026-11-30',min_months:6,max_months:12,active:true};
}
function approvedSales(){
  return {id:'GIFT-S2',source_type:'SALES_CASE',source_id:'SALES-DEMO',
    store_id:'SIM_BJ01',unit_id:'SIM_BJ01_U04',gift_months:1,status:'APPROVED',
    requested_by:'advisor-demo',reason:'回归测试',approval_id:'APPROVAL-DEMO',
    approved_by:'manager-demo',created_at:'2026-10-01',expires_at:'2026-11-30',
    min_months:6,max_months:12};
}

const campaignLocked=policy.transition(
  policy.transition(approvedCampaign(),'ATTACHED_TO_QUOTE',{quote_id:'Q-CAM'}),
  'LOCKED_TO_ORDER',{order_id:'O-CAM'}
);
const campaignReleased=policy.transition(campaignLocked,'APPROVED');
assert.equal(campaignReleased.status,'APPROVED');
assert.equal(campaignReleased.quote_id,null);
assert.equal(campaignReleased.order_id,null);
assert.equal(campaignReleased.source_type,'CAMPAIGN');
assert.equal(policy.validate(campaignReleased).valid,true);

const salesLocked=policy.transition(
  policy.transition(approvedSales(),'ATTACHED_TO_QUOTE',{quote_id:'Q-SALES'}),
  'LOCKED_TO_ORDER',{order_id:'O-SALES'}
);
const salesReleased=policy.transition(salesLocked,'APPROVED');
assert.equal(salesReleased.status,'APPROVED');
assert.equal(salesReleased.quote_id,null);
assert.equal(salesReleased.order_id,null);
assert.equal(salesReleased.approval_id,'APPROVAL-DEMO');
assert.equal(salesReleased.approved_by,'manager-demo');
assert.equal(policy.validate(salesReleased).valid,true);

const quoteOnly={...approvedCampaign(),status:'ATTACHED_TO_QUOTE',quote_id:'Q-OLD'};
const quoteReleased=policy.transition(quoteOnly,'APPROVED');
assert.equal(quoteReleased.quote_id,null);
assert.equal(quoteReleased.order_id,null);

const submittedSales={...approvedSales(),status:'SUBMITTED'};
assert.throws(()=>policy.transition(submittedSales,'APPROVED'),/APPROVAL_METADATA_REQUIRED/);
assert.throws(()=>policy.transition(submittedSales,'APPROVED',{approval_id:'APPROVAL-ONLY'}),/APPROVAL_METADATA_REQUIRED/);
const newlyApproved=policy.transition(submittedSales,'APPROVED',{
  approval_id:'APPROVAL-NEW',approved_by:'manager-new'
});
assert.equal(newlyApproved.approval_id,'APPROVAL-NEW');
assert.equal(newlyApproved.approved_by,'manager-new');
assert.equal(policy.validate(newlyApproved).valid,true);

console.log('PASS: campaign gift can be released from order lock without invented approval metadata');
console.log('PASS: sales gift can be released while preserving its original approval metadata');
console.log('PASS: initial sales approval still requires approval_id and approved_by');
console.log('PASS: quote/order bindings are cleared when an approved benefit is released');
