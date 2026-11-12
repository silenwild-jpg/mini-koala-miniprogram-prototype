#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const F=require('../app/prototype/parallel/core-journey-fix-01/demo/fixtures.js');
const {create}=require('../app/prototype/parallel/core-journey-fix-01/demo/demo-core.js');
const shaped=F.units.filter(u=>Array.isArray(u.dimensions_m)&&u.dimensions_m.length===3);
assert(shaped.length>=20,'expected populated synthetic warehouse dimensions');
let checked=0,large=0,small=0;
for(const u of shaped){
 const [w,d,h]=u.dimensions_m;
 assert(w>0&&d>0&&h>0,'positive geometry '+u.id);
 assert.equal(h,u.volume>=3?2.5:2,'height frozen at 2.5m from 3m³ '+u.id);
 assert(Math.abs(w*d*h-u.volume)<0.011,'warehouse volume conflict '+u.id+' '+u.dimensions);
 assert(Math.abs(u.area-w*d)<0.011,'footprint area conflict '+u.id);
 assert(u.dimensions.includes(String(h)),'display text does not use canonical height '+u.id);
 checked++;if(u.volume>=3)large++;else small++;
}
const chosen=shaped.find(u=>u.volume===3.5&&u.status==='available');assert(chosen,'3.5m³ demo unit missing');
assert.equal(chosen.dimensions,'1.4 × 1 × 2.5m');
assert.equal(chosen.area,1.4);
const c=create();const before=c.amounts([chosen.id],12);
assert.equal(before.monthly_average,Math.trunc(chosen.base_month*F.pricing.termRules.find(t=>12>=t.min&&12<=t.max).factor),'integer rent');
assert.equal(before.rent_total,before.monthly_average*12,'full-term rent');
assert.equal(before.deposit,before.monthly_average,'one month deposit');
console.log('RC2 2.5M WAREHOUSE GEOMETRY PASS '+JSON.stringify({checked,large,small,price:before.monthly_average,deposit:before.deposit}));
