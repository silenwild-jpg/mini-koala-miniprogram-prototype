const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../prototype');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const estimator=read('space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html');
const s01=read('mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html');
const u01=read('mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html');
const slice=(src,a,b)=>{const x=src.indexOf(a),y=src.indexOf(b,x+a.length);assert(x>=0&&y>x,`${a} missing`);return src.slice(x,y)};

// B2B handoff must create a valid interval from the entered size, not a 0–size range.
const stored={mini_storage_b2b_quick_current:JSON.stringify({target_volume:18,term_months:24,location:'北京望京',storage_types:['档案'],company:'演示企业',moving_support:'需要'})};
const b2b={state:{usageLocation:''},entry:'b2b_recommend',storageGet:k=>stored[k]||'',term:0,clampTerm:n=>n,go:()=>{},Number,JSON,Math};vm.createContext(b2b);
const init=slice(estimator,"if(entry==='b2b_recommend'){","\n\n  if(entry==='resume_recommend')");
vm.runInContext('(function(){'+init+'})()',b2b);
assert.equal(b2b.state.flow,'known');assert.equal(b2b.state.knownSize,18);assert.equal(b2b.state.term,24);assert.equal(b2b.state.searchOriginOverride,'wangjing');
vm.runInContext(slice(estimator,'function calc(preferenceOverride=null){','function fmt(v){'),b2b);
const requirement=b2b.effectiveRequirement();assert.equal(requirement.target,18);assert(requirement.min>16&&requirement.max>19);
const saved={mini_storage_requirement_current:JSON.stringify({storage_types:['档案'],company:'演示企业',expected_start_date:'2026-12-01'})};
const saveCtx={REQUIREMENT_KEY:'mini_storage_requirement_current',storageGet:k=>saved[k]||'',storageSet:(k,v)=>saved[k]=v,PRICING_MODEL_VERSION:'demo',pricingPreviewForVolume:()=>({}),Date,JSON,Number};vm.createContext(saveCtx);
vm.runInContext(slice(estimator,'function saveRequirementSnapshot(data={}){','\nconst sceneCfg ='),saveCtx);
const result=saveCtx.saveRequirementSnapshot({target_volume:18,min_volume:requirement.min,max_volume:requirement.max,term_months:24,customer_type:'enterprise',scene:'enterprise',storage_types:['档案'],company:'演示企业'});
assert.equal(result.customer_type,'enterprise');assert.equal(result.target_volume,18);assert.equal(result.term_months,24);assert.deepEqual(Array.from(result.storage_types),['档案']);assert.equal(result.company,'演示企业');

// Capacity adjustment is inline, immediate, and preserves term and input context.
const input={value:'',scrollIntoView(){},focus(){this.focused=true}};
let renders=0;const cap={state:{usageTargetOverride:8,term:12,quantities:{box:2},searchOriginOverride:'wangjing'},$:()=>input,effectiveRequirement:()=>({target:8}),renderUsage(){renders++},invalidateUsageRequirement(){cap.state.usageTargetOverride=null;cap.state.r113Plan=null},toast(){}};vm.createContext(cap);
vm.runInContext(slice(estimator,'function openUsageCapacityEditor(){','function openEstoreConsultation('),cap);
cap.openUsageCapacityEditor();assert(input.focused);cap.applyUsageCapacity(10);
assert.equal(cap.state.usageTargetOverride,10);assert.equal(cap.state.term,12);assert.equal(cap.state.searchOriginOverride,'wangjing');assert.equal(renders,1);
cap.applyUsageCapacity(201);assert.equal(cap.state.usageTargetOverride,10);

const tagCtx={stores:{a:{services:['24h','elevator']},b:{services:['24h','freight','parking']}}};vm.createContext(tagCtx);
vm.runInContext(slice(s01,'function storeDemoTags(id){','function makeCard(id,index=0){'),tagCtx);
for(const id of ['a','b']){const tags=tagCtx.storeDemoTags(id);assert(tags.length>=2&&tags.length<=4);assert.deepEqual(Array.from(tagCtx.storeDemoTags(id)),Array.from(tags));assert(!tags.includes('免押金'))}
assert(s01.includes('id="locationSheet"')&&s01.includes('id="travelSheet"'));
assert(s01.includes('.location-context #locationSheet.show,.location-context #travelSheet.show'));
assert(s01.includes('white-space:nowrap;overflow-x:auto'));
assert(!read('mini_koala_estimator_item_fallback_p0_v1.js').includes('id="estSearch"'));
assert(u01.includes("String(representativeUnitNo).split(/[、,，]/)[0].trim()"));
assert(u01.includes('class="term-price-combined"'));
const unitIdCode=slice(u01,"const actualUnitId=p.get('actualUnit')",'const transportServiceable=');
for(const [count,want] of [[2,'BJ101'],[0,'']]){const c={p:{get:()=>''},u:{available_count:count},representativeUnitNo:'BJ101、BJ102',Number,String};vm.createContext(c);vm.runInContext(unitIdCode,c);assert.equal(vm.runInContext('actualUnitId',c),want)}
console.log('PASS UX continuity: B2B size/term, inline capacity, deterministic demo tags, concrete unit, unified dropdowns');
