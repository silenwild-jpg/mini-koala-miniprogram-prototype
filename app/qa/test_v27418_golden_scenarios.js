const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
const ctx={window:{},localStorage:{getItem(){return null},setItem(){}},console};ctx.window=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'prototype/mini_storage_business_ssot_v274.js'),'utf8'),ctx);
ctx.window.MINI_KOALA_DATA=require(path.join(root,'data/mini_koala_data.js'));
vm.runInContext(fs.readFileSync(path.join(root,'prototype/mini_storage_requirement_recommendation_v274.js'),'utf8'),ctx);
const R=ctx.window.MINI_STORAGE_REQUIREMENT_RECOMMENDATION_V274;
const scenarios=[
  {name:'small',min:.5,max:1.5,target:1,term:6,match:true},
  {name:'standard',min:4.3,max:5.6,target:4.8,term:6,match:true},
  {name:'large',min:10,max:13,target:11.5,term:12,match:true},
  {name:'very-large',min:25,max:30,target:27,term:12,match:false},
  {name:'extreme',min:55,max:70,target:60,term:6,match:false},
];
for(const s of scenarios){
 const r=R.recommend({...s,origin:'guomao',travel:'drive',city:'北京市'});
 assert.equal(r.fallback,!s.match,`${s.name} fallback mismatch`);
 if(s.match){assert(r.matchedRows.length>0,`${s.name} should match`);assert(r.rows[0].hasMatch,`${s.name} top row should match`)}
 else {assert.equal(r.matchedRows.length,0,`${s.name} must be zero-match`);assert(r.rows.length>0,`${s.name} should still expose comparison alternatives`)}
}
const standard=R.recommend({min:4.3,max:5.6,target:4.8,term:6,origin:'guomao',travel:'drive',city:'北京市'});
assert.equal(standard.rows[0].profile.store_name,'惠新西街店');
assert.equal(standard.rows[1].profile.store_name,'广渠门店');
console.log('PASS V2.7.4.18 Golden Scenarios: small/standard/large matched; 25–30 and 55–70 true NOMATCH; standard top two stable');
