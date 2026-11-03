#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const dir=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const context={console,Date,Math,Number,JSON,Array,String,Intl,setTimeout,clearTimeout};
context.window=context;context.globalThis=context;vm.createContext(context);
for(const file of ['store-geo.js','fixtures.js','demo-core.js'])vm.runInContext(fs.readFileSync(path.join(dir,file),'utf8'),context,{filename:file});
const f=context.SIM_FIXTURES,core=context.SIM_CORE.create({});
assert(f.stores.length>=30,'store coverage too low');
assert.equal(context.SIM_STORE_GEO.coverage(),f.stores.length,'coordinate source coverage');
let routeable=0,manualReview=0;
for(const s of f.stores){
 assert(s.geo&&s.geo.store_id===s.id&&s.geo.address===s.address&&s.geo.destination_query.includes(s.name),'missing lookup '+s.id);
 assert(!s.geo.verified||[s.geo.longitude,s.geo.latitude].every(Number.isFinite),'invalid verified coordinate '+s.id);
 const source=context.SIM_STORE_GEO.get(s.id);
 assert(source,'missing source matched location '+s.id);
 assert(s.geo.route_candidate,'source coordinate must be selectable '+s.id);
 assert(!s.geo.verified,'source-only point is not a provider-verified warehouse entrance '+s.id);
 routeable++;
 if(source.was_multi_candidate){manualReview++;assert(s.geo.was_multi_candidate,'multi-candidate source flag was lost '+s.id)}

}
let matched=0;
for(const u of f.units){
 assert(Number.isInteger(u.available_count)&&u.available_count>=0,'invalid fixture count '+u.id);
 if(core.available(u)){
  matched++;
  const initial=core.stockCount(u);
  assert(initial>0,'available with zero count '+u.id);
  const stock=core.state();
  const reserved=JSON.parse(JSON.stringify(stock));reserved.stock[u.id]='reserved';
  const occupied=JSON.parse(JSON.stringify(stock));occupied.stock[u.id]='occupied';
  const released=JSON.parse(JSON.stringify(stock));released.stock[u.id]='available';
  const c1=context.SIM_CORE.create({state:reserved}),c2=context.SIM_CORE.create({state:occupied}),c3=context.SIM_CORE.create({state:released});
  assert.equal(c1.stockCount(u),0,'reserved count');
  assert.equal(c2.stockCount(u),0,'occupied count');
  assert.equal(c3.stockCount(u),initial,'restored count');
  assert(!c1.matchingUnits(u.store_id).some(row=>row.id===u.id),'reserved selection');
 }
 else assert.equal(core.stockCount(u),0,'unavailable count');
}

// Exercise an actual order transaction and verify the same inventory state survives a central reload.
const sample=f.units.find(u=>core.available(u)&&f.stores.find(s=>s.id===u.store_id)?.status==='open');
assert(sample,'no available sample');
const base=JSON.parse(JSON.stringify(core.state()));
base.city=f.stores.find(s=>s.id===sample.store_id).city;
base.auth={status:'verified',method:'phone',phone:'13800000000',expiresAt:Date.now()+3600*1000};
base.requirement={capacity_m3:sample.volume,term_months:12,term_confirmed:true,source:'known_capacity'};
base.selected=[sample.id];
base.dateConfirmed=true;base.startDate=f.demoToday;
const unitSample=f.units.find(u=>u.id===sample.id);
const transaction=context.SIM_CORE.create({state:base});
assert(transaction.selectionValid(),'selected inventory invalid before order');
const quote=transaction.quote();
assert(quote.unit_ids.includes(sample.id),'wrong quoted unit');
const reservedOrder=transaction.submit();
assert.equal(transaction.stockCount(unitSample),0,'pending order did not lock stock');
const reloaded=context.SIM_CORE.create({state:transaction.state()});
assert.equal(reloaded.stockCount(unitSample),0,'reserved state lost after central reload');
reloaded.cancelOrder(reservedOrder.id);
assert.equal(reloaded.stockCount(unitSample),core.stockCount(unitSample),'cancel did not restore stock');
const paid=context.SIM_CORE.create({state:base});
paid.quote();
const paidOrder=paid.submit();
paid.pay(paidOrder.id,'success');
assert.equal(paid.stockCount(unitSample),0,'paid stock remains available');
assert.equal(context.SIM_CORE.create({state:paid.state()}).stockCount(unitSample),0,'paid status not persisted');

console.log(JSON.stringify({pass:true,stores:f.stores.length,unitOptions:f.units.length,bookable:matched,verifiedCoordinateStores:routeable,autoSelectedMultiCandidateStores:manualReview,lookupCovered:f.stores.length}));
