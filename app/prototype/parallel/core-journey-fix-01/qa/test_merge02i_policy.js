'use strict';
const assert=require('node:assert/strict');
const policy=require('../demo/home-recommend-policy');
const fixture=require('../demo/fixtures');
let passed=0;
function test(name,fun){fun();passed++;console.log('PASS '+name);}
test('unverified distance retains two frozen-home demonstration slots',()=>{
 const f=fixture.stores.filter(x=>x.city==='北京');
 const r=policy.rank(f,{distanceVerified:fixture.distanceVerified});
 assert.deepEqual(r.cards.slice(0,2).map(x=>x.id),f.filter(x=>x.status==='open').slice(0,2).map(x=>x.id));
 assert.equal(r.nearestClaimAllowed,false);
 assert.equal(r.cards.length,3);
});
test('third position is an actual operations store, not necessarily source third',()=>{
 const r=policy.rank(fixture.stores.filter(x=>x.city==='北京'),{distanceVerified:false});
 assert(r.operator);
 assert.equal(r.cards[2].id,r.operator);
 assert.equal(r.cards[2].operatingTag,'特价仓');
 assert(!r.cards.slice(0,2).some(x=>x.id===r.operator));
});
test('zero available stores uses E-store first, no synthetic store record',()=>{
 const r=policy.rank(fixture.stores.filter(x=>x.city==='广州'),{distanceVerified:false});
 assert.equal(r.cards.length,0);assert.equal(r.estoreFirst,true);assert.equal(r.operator,null);
});
test('verified nearest first, regional cheaper second, operational third',()=>{
 const rows=[
  {id:'A',status:'open',distance:1,teaserCubicPrice:120},
  {id:'B',status:'open',distance:2,teaserCubicPrice:110},
  {id:'C',status:'open',distance:4,teaserCubicPrice:80,operatingTag:'特价仓'},
  {id:'D',status:'open',distance:6,teaserCubicPrice:50}
 ];
 const r=policy.rank(rows,{distanceVerified:true});
 assert.deepEqual(r.cards.map(x=>x.id),['A','B','C']);assert(r.nearestClaimAllowed);
});
test('unverified/partial position cannot fabricate nearest',()=>{
 const list=[
  {id:'A',status:'open',distance:undefined,teaserCubicPrice:120},
  {id:'B',status:'open',distance:1,teaserCubicPrice:110},
  {id:'C',status:'open',distance:2,teaserCubicPrice:90,operatingTag:'特价仓'}];
 const r=policy.rank(list,{distanceVerified:true});
 assert.equal(r.nearestClaimAllowed,false);
 assert.deepEqual(r.cards.map(x=>x.id),['A','B','C']);
});
test('paused stores and duplicate operating slots never become fake candidates',()=>{
 const rows=[
  {id:'A',status:'open',distance:1,teaserCubicPrice:110,operatingTag:'特价仓'},
  {id:'B',status:'open',distance:2,teaserCubicPrice:90},
  {id:'C',status:'closed',distance:3,teaserCubicPrice:60,operatingTag:'特价仓'}
 ];
 const r=policy.rank(rows);
 assert.deepEqual(r.cards.map(x=>x.id),['A','B']);
 assert.equal(r.operator,null);
});
console.log('HOME_RECOMMEND_SUMMARY',JSON.stringify({tests:passed,result:'PASS'}));
