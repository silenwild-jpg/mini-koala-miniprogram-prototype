#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs');
const base=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const f=require(path.join(base,'fixtures.js'));
const rank=require(path.join(base,'home-recommend-policy.js')).rank;
const cities=['北京','上海','深圳','杭州','广州'];
assert.equal(f.distanceVerified,false,'demo km must not imply verified location');
const rows=[];
for(const city of cities){
 const all=f.stores.filter(s=>s.city===city),r=rank(all,{distanceVerified:false});
 assert(all.length>=5,city+': fewer than 5 stores');
 assert.equal(r.cards.length,3,city+': recommendation must show 3 priced stores');
 assert.equal(r.estoreFirst,false,city+': E-store should not replace bookable recommendation');
 assert.equal(new Set(r.cards.map(x=>x.id)).size,3,'unique cards');
 const nearest=all.filter(s=>s.status==='open'&&Number(s.teaserCubicPrice)>0)
    .sort((a,b)=>a.distance-b.distance||a.id.localeCompare(b.id))[0];
 assert.equal(r.cards[0].id,nearest.id,city+': nearest not first');
 for(const s of r.cards){
  assert(Number.isFinite(s.distance)&&s.distance>=0,s.id+' missing demo km');
  assert(Number(s.teaserCubicPrice)>0,s.id+' missing shown price');
  assert(s.photo.endsWith('/card.webp'),s.id+' not using curated photo');
  assert(s.photo_identity_verified===false,s.id+' unverified identity wrongly marked verified');
  assert(fs.existsSync(path.join(base,'assets',s.photo)),s.id+' missing card asset');
  assert(fs.existsSync(path.join(base,s.gallery_photos[0])),s.id+' missing hero asset');
  assert(f.units.some(u=>u.store_id===s.id&&u.status==='available'),s.id+' missing orderable units');
 }
 rows.push({city,stores:all.length,recommendations:r.cards.map(x=>({id:x.id,km:x.distance,price:x.teaserCubicPrice}))});
}
console.log(JSON.stringify({pass:true,source:'RC2 isolated H01 demo fixture',rows},null,2));
