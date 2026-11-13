'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const F=require('../app/prototype/parallel/core-journey-fix-01/demo/fixtures.js');
const config=require('../app/prototype/parallel/core-journey-fix-01/demo/br03-demo-snapshots.js');
const {create:makeCore}=require('../app/prototype/parallel/core-journey-fix-01/demo/demo-core.js');
const {create:makeUnitPolicy}=require('../app/prototype/parallel/core-journey-fix-01/demo/br03-policy.js');
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
assert.equal(movingAmounts.moving_benefit_pending_id,'BEN-MOVING-01');
const movingOption=moving.couponOptions([unitId],6).find(x=>x.id==='BEN-MOVING-01');
assert.equal(movingOption.eligible,false,'service benefit is not selectable as a cash coupon');
assert.match(movingOption.reason,/服务范围与距离资格待确认/);

const below=makeCore();below.setScenario('promoMovingIneligible');
assert.equal(below.state().requirement.term_months,3);
assert.equal(below.amounts([unitId],3).moving_benefit_pending_id,null,'less than six months does not receive the moving benefit');
assert.match(below.couponOptions([unitId],3).find(x=>x.id==='BEN-MOVING-01').reason,/租期需满6个月/);

assert(bridge.includes('基础搬运权益 · 资格待确认'),'O01 must show the service benefit separately from cash discounts');
assert(bridge.includes('a.moving_benefit_pending_id?'),'service benefit line must be conditional');
console.log('PROMO-DEMO-SCENARIOS-01 PASS: 5 review scenarios, term gate, coupon separation, campaign tag and O01 benefit line');
