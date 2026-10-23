const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'../prototype');
const data=require('../data/mini_koala_data.js');
const businessSrc=fs.readFileSync(path.join(root,'mini_storage_business_ssot_v274.js'),'utf8');
const recSrc=fs.readFileSync(path.join(root,'mini_storage_requirement_recommendation_v274.js'),'utf8');
const files={s01:'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html',s02:'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html'};
function source(file){return fs.readFileSync(path.join(root,files[file]),'utf8')}
function fn(file,name){
  const src=source(file),start=src.indexOf(`function ${name}(`);assert(start>=0,name);
  const brace=src.indexOf('{',start);let depth=0,end=brace;
  for(;end<src.length;end++){if(src[end]==='{')depth++;if(src[end]==='}'&&!--depth){end++;break}}
  return src.slice(start,end)
}
function s01(target,min,max){
  const ctx={targetVolume:target,termMonths:6,searchLocation:'guomao',travelMode:'drive',requirementRange:()=>({min,max}),localStorage:{getItem:()=>null,setItem:()=>{}},window:null,console,Date,Math,JSON,String,Number,Array,Object,Boolean,Error};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(businessSrc,ctx);ctx.MINI_KOALA_DATA=data;vm.runInContext(recSrc,ctx);vm.runInContext(fn('s01','matchedDataFor'),ctx);return ctx;
}
function s02(storeId,target,min,max){
  const ctx={rawUnits:data.getLegacyUnits(storeId),targetVolume:target,demoMode:'',EXCEPTION_UNIT_SNAPSHOT_IDS:[],range:()=>({min,max})};
  vm.createContext(ctx);vm.runInContext([fn('s02','inventoryUnits'),fn('s02','idealUnits'),fn('s02','recommendedUnit')].join('\n'),ctx);return ctx;
}
const storeId='jianguo',catalog=data.getLegacyUnits(storeId);
assert(catalog.length>0,'legacy alias must resolve to public generated units');
assert(catalog.every(u=>u.base>0&&!u.has_zero_price&&u.size_unit==='m³'));

const exact=catalog[Math.floor(catalog.length/2)],epsilon=.001;
const a=s01(exact.v,exact.v-epsilon,exact.v+epsilon),b=s02(storeId,exact.v,exact.v-epsilon,exact.v+epsilon);
assert.equal(a.matchedDataFor(storeId).hasMatch,true);
assert.equal(a.matchedDataFor(storeId).unitId,exact.id);
assert.equal(b.recommendedUnit().id,exact.id);
assert(a.matchedDataFor(storeId).price>0,'S01 term price must be positive');

const largest=[...catalog].sort((x,y)=>y.v-x.v||x.base-y.base)[0];
const outOfRange=largest.v+5;
const c=s01(outOfRange,outOfRange-.1,outOfRange+.1),d=s02(storeId,outOfRange,outOfRange-.1,outOfRange+.1);
assert.equal(c.matchedDataFor(storeId).hasMatch,false);
assert.equal(c.matchedDataFor(storeId).unitId,largest.id);
assert.equal(d.idealUnits().length,0);
assert.equal(d.recommendedUnit().id,largest.id);

console.log('PASS S01 and S02 derive matching and fallback units from the generated positive-price store inventory');
