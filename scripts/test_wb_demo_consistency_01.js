/* WB-DEMO-CONSISTENCY-01: demo-only, exact-commit contract QA.
 * Price examples are NOT approved production finance policies. */
'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const F=require(path.join(root,'fixtures.js'));
const CORE=require(path.join(root,'demo-core.js'));
const SPACE=require(path.join(root,'space-unit.js'));
const DATA=require(path.join(root,'br03-demo-snapshots.js'));
const POLICY=require(path.join(root,'br03-policy.js'));
const createAt=utc=>CORE.create({now:()=>Date.parse(utc)});
const c=createAt('2026-11-14T06:00:00Z');
assert.equal(c.today(),'2026-11-14');

// A1. All 146 demo units, every month from 1 to 60, integrated campaign-aware quote.
let count=0;
for(const u of F.units){
  let previous=null;
  for(let term=1;term<=60;term++){
    const a=c.amounts([u.id],term);
    assert(Number.isFinite(a.rent_total)&&a.rent_total>0,'Invalid rent for '+u.id+' term '+term);
    assert(Number.isFinite(a.payable)&&a.payable>=a.rent_total,'Invalid payable for '+u.id+' term '+term);
    assert.equal(a.monthly_average*term,a.rent_total,'Monthly and whole-term drift: '+u.id+' '+term);
    if(previous!==null)assert(a.rent_total>=previous,'Term rent drops: '+u.id+' '+(term-1)+'→'+term);
    previous=a.rent_total;
    count++;
  }
}
assert.equal(count,F.units.length*60);
for(const id of ['SIM_BJ01_U04','SIM_BJ02_U04']){
  const special=c.amounts([id],12),after=c.amounts([id],13);
  assert(special.unit_pricing[0].campaign_id,'Special sample should be active: '+id);
  assert(special.rent_total<=after.rent_total,'Special-to-term price inversion: '+id);
  const u=F.units.find(x=>x.id===id);
  assert(special.unit_pricing[0].monthly_rent<Math.trunc(u.base_month*.65),'Special should beat standard 12-month monthly: '+id);
}
const expired=createAt('2026-12-01T06:00:00Z');
assert.equal(expired.amounts(['SIM_BJ01_U04'],12).unit_pricing[0].campaign_id,null,'Expired campaign remains billable');

// A2. Square-metres are an estimate before unit choice, never a second rent unit.
assert.equal(SPACE.ESTIMATE_BASIS,'STANDARD_HEIGHT_ESTIMATE');
assert.equal(SPACE.cubicFromArea(1),2.5);
assert.equal(SPACE.areaForUnit(F.units.find(u=>u.id==='SIM_BJ01_U01')),0.4);
c.setRequirement(2.5,12,true,{input_unit:'m2',input_value:1,conversion_basis:SPACE.ESTIMATE_BASIS,assumed_height_m:SPACE.HEIGHT});
const req=c.state().requirement;
assert.equal(req.capacity_m3,2.5);
assert.equal(req.input_unit,'m2');
assert.equal(req.input_value,1);
assert.equal(req.assumed_height_m,2.5);
assert.equal(req.conversion_basis,'STANDARD_HEIGHT_ESTIMATE');
assert.equal(req.term_months,12);
assert.equal(c.requirementReady(),true);
assert.equal(SPACE.demandCapacity(req),'1㎡ · 约2.5m³');
assert.throws(()=>c.setRequirement(2.5,12,true,{input_unit:'m2',input_value:1,conversion_basis:'EXACT_UNIT'}),/INVALID_CAPACITY/);

// A3. Business timezone UTC+8 consistent in quote, campaign labels and date inputs.
const current=createAt('2026-11-14T06:00:00Z');
const promo=POLICY.create({core:current,fixture:F,config:DATA});
const store=F.stores.find(s=>s.id==='SIM_BJ01');
assert.equal(promo.storePromotionTag(store),'特价仓');
assert.equal(POLICY.create({core:expired,fixture:F,config:DATA}).storePromotionTag(store),'');
const live=CORE.create();
assert.equal(F.demoToday,live.today(),'Fixture business date and core business date differ');
assert.equal(live.validDate(F.defaultStart),true,'Default start is expired');
console.log(JSON.stringify({status:'PASS',units:F.units.length,pricing_cases:count,rent_inversions:0,utc8_today:live.today(),estimated_area_label:SPACE.demandCapacity(req),campaign_states:'active_and_expired_pass'},null,2));
