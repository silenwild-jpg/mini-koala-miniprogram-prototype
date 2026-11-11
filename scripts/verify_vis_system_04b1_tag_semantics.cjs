'use strict';
const assert=require('node:assert/strict');
const base='../app/prototype/parallel/core-journey-fix-01/demo/';
const F=require(base+'fixtures.js'),P=require(base+'presentation-policy.js');
const p=P.create({core:{},fixture:F,unitPolicy:{}}),rank={promotion:0,service:1,attribute:2};
assert(F.stores.length>=30,'five-city demo count');
assert.deepEqual([...new Set(F.stores.map(s=>s.city))].sort(),['上海','北京','广州','杭州','深圳'].sort());
const counts={};
for(const store of F.stores){
 counts[store.city]=(counts[store.city]||0)+1;
 const full=p.tags(store,3),h01=p.tags(store,2),s5=p.tags(store,2),detail=p.detailTags(store,5);
 assert.deepEqual(h01,s5,store.id+' H01 vs S5');
 assert.deepEqual(h01,full.slice(0,2),store.id+' H01 vs S01');
 assert(detail.length>=4&&detail.length<=5,store.id+' 4–5 detail tags');
 for(const [scope,arr] of [['listing',full],['detail',detail]]){
  assert.equal(new Set(arr.map(x=>x.label)).size,arr.length,store.id+' duplicate '+scope);
  for(let i=0;i<arr.length;i++){
   const t=arr[i];assert.equal(t.type,p.tagType(t.label),store.id+' '+scope+' '+t.label);
   if(i)assert(rank[arr[i-1].type]<=rank[t.type],store.id+' '+scope+' rank');
   if(scope==='detail')assert(!/24小时|全天存取|存取时间|独立仓/.test(t.label),store.id+' hours in service tags');
  }
 }
 for(const a of full)for(const b of detail)if(a.label===b.label)assert.equal(a.type,b.type,store.id+' '+a.label);
 if(store.operatingTag==='新开门店')assert.equal(p.tagType(store.operatingTag),'attribute');
 if(store.operatingTag==='免费搬运')assert.equal(p.tagType(store.operatingTag),'service');
}
assert.equal(p.tagType('电梯直达'),'service');
console.log('VIS-SYSTEM-04B1 5-CITY CANONICAL_TAGS PASS '+JSON.stringify({stores:F.stores.length,cities:counts}));
