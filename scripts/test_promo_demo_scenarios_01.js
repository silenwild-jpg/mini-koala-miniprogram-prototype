'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const F=require('../app/prototype/parallel/core-journey-fix-01/demo/fixtures.js');
const config=require('../app/prototype/parallel/core-journey-fix-01/demo/br03-demo-snapshots.js');
const {create:makeCore}=require('../app/prototype/parallel/core-journey-fix-01/demo/demo-core.js');
const {create:makeUnitPolicy}=require('../app/prototype/parallel/core-journey-fix-01/demo/br03-policy.js');
const H01=require('../app/prototype/parallel/core-journey-fix-01/demo/h01-state-policy-01.js');
const bridge=fs.readFileSync(path.join(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo/br04/bridge.js'),'utf8');
const unitId='SIM_BJ01_U04';
const scenarios=new Set(F.scenarios.map(x=>x.id));
for(const id of ['promoSpecial','promoLongTerm','promoCouponCash','promoMoving','promoMovingIneligible'])
  assert(scenarios.has(id),'missing review scenario: '+id);

const special=makeCore();special.setScenario('promoSpecial');
assert.equal(special.state().requirement.capacity_m3,5);
assert.equal(special.state().requirement.term_months,6);
const policy=makeUnitPolicy({core:special,fixture:F,config});
assert.equal(policy.storePromotionTag(F.stores.find(s=>s.id==='SIM_BJ01')),'特价仓');
assert(special.matchingUnits('SIM_BJ01').some(u=>u.id===unitId),'special warehouse sample remains selectable');

const short=makeCore();short.setScenario('normal');
const long=makeCore();long.setScenario('promoLongTerm');
assert.equal(long.state().requirement.term_months,12);
assert(long.amounts([unitId],12).monthly_average<short.amounts([unitId],6).monthly_average,
  'longer term scenario should use the configured lower monthly tier');

const cash=makeCore();cash.setScenario('promoCouponCash');
const cashAmounts=cash.amounts([unitId],12);
assert.equal(cashAmounts.coupon_discount,300,'12-month coupon is selected as the highest eligible cash coupon');
assert.equal(cashAmounts.moving_benefit_pending_id,null,'cash coupon scenario does not silently add service benefits');

const moving=makeCore();moving.setScenario('promoMoving');
const movingAmounts=moving.amounts([unitId],6);
assert.equal(movingAmounts.coupon_discount,0,'moving benefit is not a cash rent discount');
assert.equal(movingAmounts.moving_benefit_pending_id,'CPN-003');
const movingOption=moving.couponOptions([unitId],6).find(x=>x.id==='CPN-003');
assert.equal(movingOption.eligible,false,'service benefit is not selectable as a cash coupon');
assert.match(movingOption.reason,/服务范围与距离资格待确认/);

const below=makeCore();below.setScenario('promoMovingIneligible');
assert.equal(below.state().requirement.term_months,3);
assert.equal(below.amounts([unitId],3).moving_benefit_pending_id,null,'less than six months does not receive the moving benefit');
assert.match(below.couponOptions([unitId],3).find(x=>x.id==='CPN-003').reason,/租期需满6个月/);

assert(bridge.includes('基础搬运权益 · 资格待确认'),'O01 must show the service benefit separately from cash discounts');
assert(bridge.includes('a.moving_benefit_pending_id?'),'service benefit line must be conditional');

const promotionPolicy=require('../app/prototype/parallel/core-journey-fix-01/demo/presentation-policy.js').createPromotionPolicy();
assert.equal(promotionPolicy.stacking('TERM_DISCOUNT','RENT_CASH_COUPON').status,'ALLOWED');
assert.equal(promotionPolicy.stacking('TERM_DISCOUNT','MOVING_SERVICE').status,'ALLOWED');
assert.equal(promotionPolicy.stacking('RENT_CASH_COUPON','MOVING_SERVICE').status,'ALLOWED');
assert.equal(promotionPolicy.stacking('UNIT_SPECIAL_PRICE','TERM_DISCOUNT').status,'NEEDS_CONFIRMATION');
assert.equal(promotionPolicy.stacking('UNIT_SPECIAL_PRICE','RENT_CASH_COUPON').status,'NEEDS_CONFIRMATION');
assert.equal(promotionPolicy.stacking('CAMPAIGN_FREE_TERM','TERM_DISCOUNT').status,'NEEDS_CONFIRMATION');
const sampleCampaign={id:'C1',unitId:'U1',storeId:'S1',active:true,catalogRevision:1,baseMonth:520,minMonths:6,maxMonths:12,from:'2026-10-01',until:'2026-11-30'};
const sampleUnit={id:'U1',store_id:'S1',revision:1},sampleStore={id:'S1'};
assert.equal(promotionPolicy.evaluateCampaign(sampleCampaign,{today:'2026-11-13',unit:sampleUnit,store:sampleStore,available:true,termMonths:6}).status,'ELIGIBLE');
assert.equal(promotionPolicy.evaluateCampaign(sampleCampaign,{today:'2026-11-13',unit:sampleUnit,store:sampleStore,available:true,termMonths:3}).status,'INELIGIBLE');
assert(promotionPolicy.evaluateCampaign({...sampleCampaign,until:'2020-01-01'},{today:'2026-11-13',unit:sampleUnit,store:sampleStore,available:true,termMonths:6}).reasons.includes('ENDED'));
let coupon={id:'C1',status:'AVAILABLE'};
for(const state of ['SELECTED','LOCKED','AVAILABLE','SELECTED','LOCKED','REDEEMED'])coupon=promotionPolicy.transitionCoupon(coupon,state);
assert.equal(coupon.status,'REDEEMED');
assert.throws(()=>promotionPolicy.transitionCoupon(coupon,'AVAILABLE'),/INVALID_COUPON_TRANSITION/);


function couponFlow(){
  let clock=Date.UTC(2026,10,13,4,0,0);
  const core=makeCore({now:()=>clock,state:{
    schema:1,fixtureVersion:F.version,scenario:'promoCouponCash',city:'北京',
    requirement:{capacity_m3:5,term_months:12,term_confirmed:true},
    selected:[unitId],startDate:'2026-11-13',dateConfirmed:true,
    auth:{status:'verified',expiresAt:clock+86400000,phone:'13800138000'},
    coupons:[{id:'CPN-002',name:'12个月长租券',amount:300,type:'RENT_CASH',status:'CLAIMED'}],
    couponChoice:'CPN-002',stock:{},prices:{},orders:[],services:{},inventoryVersion:1,sequence:0
  }});
  core.claimCoupons();
  const q=core.quote();
  assert.equal(core.state().coupons.find(c=>c.id==='CPN-002').status,'SELECTED','quote selects but does not redeem coupon');
  const o=core.submit();
  assert.equal(core.state().coupons.find(c=>c.id==='CPN-002').status,'LOCKED','order submission locks coupon');
  core.cancelOrder(o.id);
  assert.equal(core.state().coupons.find(c=>c.id==='CPN-002').status,'CLAIMED','cancel releases coupon');
  const q2=core.quote(),o2=core.submit();
  assert.equal(core.state().coupons.find(c=>c.id==='CPN-002').status,'LOCKED');
  core.pay(o2.id,'failed');
  assert.equal(core.state().coupons.find(c=>c.id==='CPN-002').status,'CLAIMED','failed payment releases coupon');
  const q3=core.quote(),o3=core.submit();
  core.pay(o3.id,'success');
  assert.equal(core.state().coupons.find(c=>c.id==='CPN-002').status,'REDEEMED','successful payment redeems coupon');
  assert(q.id&&q2.id&&q3.id);
}
couponFlow();
console.log('PROMO-DEMO-SCENARIOS-01 PASS: 5 review scenarios, term gate, coupon separation, campaign tag and O01 benefit line');

const lifecycleCases=[
  ['lifeIdentity','identity','active','pending'],
  ['lifeUpcoming','upcoming','upcoming','verified'],
  ['lifeActive','active','active','verified'],
  ['lifeRenewalQuote','renewal','active','verified'],
  ['lifeReturning','returning','returning','verified'],
  ['lifeInspection','returning','returning','verified'],
  ['lifeRefund','refund','ended','verified'],
  ['lifeExpired','lease_expired','expired','verified'],
  ['lifeEnded','new','ended','verified']
];
for(const [scenario,key,lease,identity] of lifecycleCases){
  const core=makeCore();core.setScenario(scenario);
  const state=core.state(),order=state.orders[0];
  assert(order&&order.status==='paid_simulated','scenario seeds one paid demo order: '+scenario);
  const life=core.lifecycleView(order.id);
  assert.equal(life.lease_status,lease,scenario+' lease state');
  assert.equal(life.identity_status,identity,scenario+' identity state');
  assert.equal(H01.derive(state,core).key,key,scenario+' H01 task projection');
  assert.equal(order.id,'SIM_REVIEW_ORDER_'+scenario,'scenario order identity is stable');
}
assert.equal(F.scenarios.filter(x=>x.lifecycle).length,9,'all nine lifecycle demo scenarios are available to the existing internal selector');
console.log('LIFECYCLE-DEMO-SCENARIOS-01 PASS: identity, upcoming, active, renewal, return, inspection, refund, expired and ended');

