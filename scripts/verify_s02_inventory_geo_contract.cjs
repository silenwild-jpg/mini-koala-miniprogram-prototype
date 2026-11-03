#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const dir=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const context={console,Date,Math,Number,JSON,Array,String,Intl,setTimeout,clearTimeout};
context.window=context;context.globalThis=context;vm.createContext(context);
for(const file of ['fixtures.js','demo-core.js'])vm.runInContext(fs.readFileSync(path.join(dir,file),'utf8'),context,{filename:file});
const f=context.SIM_FIXTURES,core=context.SIM_CORE.create({});
assert(f.stores.length>=30,'store coverage too low');
for(const s of f.stores){
 assert(s.geo&&s.geo.store_id===s.id&&s.geo.address===s.address&&s.geo.destination_query.includes(s.name),'missing lookup '+s.id);
 assert(!s.geo.verified||[s.geo.longitude,s.geo.latitude].every(Number.isFinite),'invalid verified coordinate '+s.id);
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
console.log(JSON.stringify({pass:true,stores:f.stores.length,unitOptions:f.units.length,bookable:matched,verifiedCoordinateStores:f.stores.filter(s=>s.geo.verified).length,lookupCovered:f.stores.length}));
