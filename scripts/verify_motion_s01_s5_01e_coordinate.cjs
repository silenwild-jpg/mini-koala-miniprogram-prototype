#!/usr/bin/env node
/* MOTION-S01-S5-01E | Missing coordinates must never be converted to the equator. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const demo=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const ranker=require(path.join(demo,'br04/s5/location-ranker.js'));
const mk=(id,latitude,longitude,price=500,city='北京')=>({
  store:{id,city,geo:{latitude,longitude,route_candidate:true}},ids:[id],price
});
const origin={city:'北京',latitude:39.9,longitude:116.4};
const rows=[mk('closest',39.901,116.4,500),mk('lower-price',39.920,116.4,400),mk('far',39.943,116.4,100)];
const base=ranker.rank(rows,origin,x=>x.price);
assert.equal(base.applied,true);
assert.deepEqual(base.rows.slice(0,2).map(x=>x.store.id),['closest','lower-price']);
for(const [key,value] of [['latitude',null],['latitude',undefined],['latitude',''],['longitude',null],['longitude','  ']]){
  const invalid=ranker.rank(rows,{...origin,[key]:value},x=>x.price);
  assert.equal(invalid.applied,false,'Missing origin coordinate '+key+'='+String(value));
}
for(const [name,lat,lng] of [
  ['missing_lat',null,116.4],['blank_lat','',116.4],
  ['missing_lng',39.9,null],['blank_lng',39.9,'']
]){
  const input=[...rows,mk(name,lat,lng)];
  const result=ranker.rank(input,origin,x=>x.price);
  assert.equal(result.applied,true,'Keep other valid stores ranked');
  const missing=result.rows.find(x=>x.store.id===name);
  assert.equal(missing.distanceFromOrigin,false,name+' not geocoded');
  assert.ok(Number.isNaN(missing.store.distance),name+' hides stale distance');
}
const bridge=fs.readFileSync(path.join(demo,'br04/bridge.js'),'utf8');
const app=fs.readFileSync(path.join(demo,'app.js'),'utf8');
const rankerSource=fs.readFileSync(path.join(demo,'br04/s5/location-ranker.js'),'utf8');
assert.match(bridge,/latitude:res\?\.latitude,longitude:res\?\.longitude/);
assert.match(app,/value\?\.latitude!==null/);
assert.match(app,/value\?\.longitude!==undefined/);
assert.match(rankerSource,/const coord=value=>/);
for(const js of ['app.js','br04/bridge.js','br04/s5/location-ranker.js']){
  cp.execFileSync(process.execPath,['--check',path.join(demo,js)]);
}
console.log('MOTION-S01-S5-01E: PASS | missing coordinates rejected, old distances not reused');
