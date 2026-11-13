/* MOTION-S01-S5-01B | No browser dependencies; static + ranking contract regression. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const root=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const file=p=>path.join(root,p);
const ranker=require(file('br04/s5/location-ranker.js'));
const row=(id,lat,lng,rent,city='北京')=>({
  store:{id,city,distance:99,geo:{latitude:lat,longitude:lng,route_candidate:true}},
  ids:[id],volume:3,rent
});
const origin={city:'北京',latitude:39.9,longitude:116.4};
const options=[
  row('far',39.943,116.4,100),
  row('nearest',39.901,116.4,500),
  row('costly',39.910,116.4,900),
  row('cheaper',39.92,116.4,400)
];
const r=ranker.rank(options,origin,x=>x.rent);
assert.equal(r.applied,true);
assert.equal(r.rows.length,4);
assert.equal(r.rows[0].store.id,'nearest','first is the nearest eligible store');
assert.equal(r.rows[1].store.id,'cheaper','second is a nearby lower-cost store');
assert.equal(r.rows[0].distanceFromOrigin,true);
assert.equal(r.rows[0].store.geo.longitude,116.4);
assert.equal(options[0].store.distance,99,'must not mutate fixture distances');
assert.deepEqual(options.map(x=>x.rent),[100,500,900,400],'pricing must not be changed');
assert.equal(ranker.rank(options,{...origin,latitude:NaN},x=>x.rent).applied,false);
assert.equal(ranker.rank(options,null,x=>x.rent).applied,false);
assert.equal(ranker.rank([options[0]],origin,x=>x.rent).applied,false,'one geo store is not enough');
const missing={...row('unknown',null,null,200),store:{id:'unknown',city:'北京',distance:7,geo:{route_candidate:false}}};
const mixed=ranker.rank([...options,missing],origin,x=>x.rent);
assert.equal(mixed.applied,true);
assert.equal(mixed.rows.at(-1).store.id,'unknown');
assert.ok(Number.isNaN(mixed.rows.at(-1).store.distance),'never show old-origin distance after map selection');
assert.equal(ranker.rank(options,{city:'上海',latitude:31.2,longitude:121.4},x=>x.rent).applied,false);
const bridge=fs.readFileSync(file('br04/bridge.js'),'utf8');
const s5=fs.readFileSync(file('br04/s5/index.html'),'utf8');
const s01=fs.readFileSync(file('s01-r2-bind.js'),'utf8');
const motion=fs.readFileSync(file('s01-motion-micro-01b.css'),'utf8');
assert.match(s5,/location-ranker\.js\?v=MOTION01B/);
assert.match(bridge,/S5_LOCATION_RANKER\?\.rank\(candidates,origin/);
assert.match(bridge,/ui\.s5MapOrigin=null/);
assert.match(bridge,/ui\.s5Area='';ui\.s5AreaCity=origin\.city/);
assert.match(s01,/s01-motion-micro-01b\.css/);
assert.match(motion,/prefers-reduced-motion:reduce/);
assert.doesNotMatch(motion,/\.store-card\s*\{/,'visual guard: no store-card structure change');
for(const f of ['br04/s5/location-ranker.js','br04/bridge.js','s01-r2-bind.js']){
  cp.execFileSync(process.execPath,['--check',file(f)],{stdio:'pipe'});
}
console.log('MOTION-S01-S5-01B: PASS (origin ranking, guardrails, JS syntax, CSS source)');
