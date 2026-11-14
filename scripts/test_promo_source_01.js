'use strict';
const assert=require('node:assert/strict');
const F=require('../app/prototype/parallel/core-journey-fix-01/demo/fixtures.js');
const config=require('../app/prototype/parallel/core-journey-fix-01/demo/br03-demo-snapshots.js');
const {create:makeCore}=require('../app/prototype/parallel/core-journey-fix-01/demo/demo-core.js');
const {create:makeUnitPolicy}=require('../app/prototype/parallel/core-journey-fix-01/demo/br03-policy.js');
const {create:makePresentation}=require('../app/prototype/parallel/core-journey-fix-01/demo/presentation-policy.js');
const home=require('../app/prototype/parallel/core-journey-fix-01/demo/home-recommend-policy.js');

const core=makeCore(),unitPolicy=makeUnitPolicy({core,fixture:F,config});
const presentation=makePresentation({core,fixture:F,unitPolicy});
const campaigns=config.campaigns||[];
assert.ok(campaigns.length>0,'explicit special-warehouse campaigns are configured');
for(const c of campaigns){
  const store=F.stores.find(s=>s.id===c.storeId);
  assert.ok(store,'campaign store exists');
  assert.equal(unitPolicy.storePromotionTag(store),'特价仓','eligible campaign yields store-level discovery tag');
  const promo=presentation.tags(store,5).filter(t=>t.type==='promotion');
  assert.equal(promo.length,1,'one promotion tag maximum');
  assert.equal(promo[0].label,'特价仓');
}
assert.ok(F.stores.every(s=>!Object.hasOwn(s,'operatingTag')),'fixtures must not assign rotating operating tags');
for(const store of F.stores.filter(s=>!campaigns.some(c=>c.storeId===s.id))){
  assert.equal(unitPolicy.storePromotionTag(store),'','stores without a configured campaign have no promotion tag');
  assert.ok(presentation.tags(store,5).every(t=>t.type!=='promotion'));
}
const store=F.stores.find(s=>s.id===campaigns[0].storeId);
const originalDate=F.demoToday,originalActive=campaigns[0].active;
F.demoToday='2026-12-01';
assert.equal(unitPolicy.storePromotionTag(store),'','expired campaign is not surfaced');
F.demoToday=originalDate;
campaigns[0].active=false;
assert.equal(unitPolicy.storePromotionTag(store),'','inactive campaign is not surfaced');
campaigns[0].active=originalActive;
const campaignUnit=F.units.find(u=>u.id===campaigns[0].unitId),originalStatus=campaignUnit.status;
campaignUnit.status='soldout';
assert.equal(unitPolicy.storePromotionTag(store),'','unavailable campaign unit is not surfaced');
campaignUnit.status=originalStatus;
const homeRows=F.stores.filter(s=>s.city===F.defaultCity).map(s=>({...s,operatingTag:unitPolicy.storePromotionTag(s)}));
const ranked=home.rank(homeRows,{distanceVerified:false});
assert.equal(ranked.cards.length,Math.min(3,homeRows.filter(s=>s.status==='open').length));
assert.ok(ranked.cards.every(s=>s.operatingTag===''||s.operatingTag==='特价仓'));
console.log('PROMO-SOURCE-01 explicit campaign tag contract PASS');
