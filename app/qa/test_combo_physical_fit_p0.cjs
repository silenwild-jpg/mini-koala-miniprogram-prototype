const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'../prototype');
const js=x=>fs.readFileSync(path.join(dir,x),'utf8');
const src={fit:js('mini_koala_physical_fit_v1.js'),combo:js('mini_koala_combo_match_v1.js'),recommend:js('mini_storage_requirement_recommendation_v274.js')};
const unit=(id,v,n=1,measured=true,xyz=[1.2,1.2,2.5])=>({id,size_option_id:id,v,available_count:n,base:100,
  length_m:xyz[0],width_m:xyz[1],height_m:xyz[2],dimension_estimate_status:measured?'measured':'simulated_from_volume_square_floor',
  door_width_m:1.1,door_height_m:2.2,door_measurement_status:measured?'measured':'simulated_from_volume'});
const item=(name,dims,qty=1,vol=1,measured=true)=>({item_id:name,name,quantity:qty,packed_volume_m3:vol,dims_m:dims,dimension_status:measured?'measured':'preset',risk_level:'large'});
const db={a:[unit('A',10),unit('B',8)],b:[unit('C',10),unit('D',8)],c:[unit('E',8,false)],d:[unit('F',6,1),unit('G',6,1)]};
const profiles=Object.fromEntries(Object.keys(db).map(id=>[id,{store_id:id,city:'北京市'}]));
const ctx={window:null,globalThis:null,MINI_KOALA_DATA:{getLegacyUnits:id=>db[id]||[],getStore:id=>profiles[id],getStoresByCity:()=>Object.values(profiles),resolveStoreId:id=>id},MINI_STORAGE_BUSINESS_HELPERS_V274:{contractRent:(base,term)=>base*term*.65,monthlyReference:base=>base*.65},MINI_STORAGE_MASTER_V222:{route_base:{guomao:{}},pricing:{}}};ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(src.fit,ctx);vm.runInContext(src.combo,ctx);vm.runInContext(src.recommend,ctx);
const FIT=ctx.MINI_KOALA_PHYSICAL_FIT_V1,combo=ctx.MINI_KOALA_COMBO_V1.findForStore;
let checks=0;const test=(name,run)=>{run();checks++;console.log('PASS FIT-P0',name)};
test('un-splittable 3.5m item physically impossible in every measured unit',()=>{
 const risk=item('一体式长件',[3.5,.4,.3],1,.42);
 const result=FIT.evaluateCandidate([unit('A',10),unit('B',8)],{items:[risk]});
 assert.equal(result.status,'rejected');assert.equal(result.reasonCodes[0],'UNSPLITTABLE_ITEM_NO_FIT');
 assert.equal(combo('a',{target:18,min:16,max:19,items:[risk]}).length,0);
});
test('unknown warehouse measurements cannot be verified OR hard rejected based only on simulated geometry',()=>{
 const risk=item('一体式长件',[3.5,.4,.3]);
 const result=FIT.evaluateCandidate([unit('A',10,1,false),unit('B',8,1,false)],{items:[risk]});
 assert.equal(result.status,'pending');
 assert(result.reasonCodes.includes('UNIT_MEASUREMENTS_UNVERIFIED'));
});
test('large catalogue items are flagged; selection preserves variants and full item counts',()=>{
 const entries=FIT.constraintsFromSelection({wardrobe:{name:'衣柜',vol:1,variants:{std:{vol:1}}},fridge:{name:'冰箱',vol:.55,variants:{std:{vol:.55}}},box:{name:'标准纸箱',variants:{std:{vol:.12}}}},{wardrobe:1,fridge:1,box:20},{wardrobe:'std',fridge:'std',box:'std'});
 assert.equal(entries.length,3);assert.equal(entries[2].quantity,20);
 assert(entries[0].requires_confirmation&&entries[1].requires_confirmation);
 assert.equal(entries[2].dimension_status,'preset');
});
test('known-too-large item blocks nominal single; 2-unit combination is still evaluated',()=>{
 const items=[item('长板',[3,.3,.2],1,.3)];
 const u1=unit('small',11,1,true,[1.1,1.1,2.5]),u2=unit('large',8,1,true,[3.6,1.5,2.5]);
 const list=combo('a',{target:16,min:10,max:12,items,units:[u1,u2]});
 assert(list.length>=1);assert.equal(list[0].fitStatus,'pending'); // full layout is not signed off
});
test('no item details is always pending even for real units',()=>assert.equal(FIT.evaluateCandidate([unit('A',10),unit('B',8)],{items:[]}).status,'pending'));
test('stock cannot be double consumed and sold-out does not enter recommendation',()=>{
 assert.equal(combo('d',{target:13,min:13,max:15,items:[],units:[unit('F',6,1),unit('G',6,1)]}).length,0);
 assert.equal(combo('d',{target:11,min:11,max:13,items:[],units:[unit('F',6,1),unit('G',6,0)]}).length,0);
});
test('separate measured objects without enough combined physical capacity are rejected',()=>{
 assert.equal(FIT.evaluateCandidate([unit('A',6),unit('B',6)],{items:[item('货物', [.7,.6,.6],3,4.2)]}).status,'rejected');
});
test('combination does not become verified from volume allocation alone',()=>{
 const q=FIT.evaluateCandidate([unit('A',10),unit('B',8)],{items:[item('箱子',[.5,.4,.3],2,.1)]});
 assert.equal(q.status,'pending');assert(q.reasonCodes.includes('LAYOUT_NOT_VERIFIED'));
 assert(q.allocations.length===2);
});
test('same store statuses respect single physical rejection and retain nearby fallback',()=>{
 const risk=item('3.5米长件',[3.5,.4,.3]);
 const a=ctx.MINI_STORAGE_REQUIREMENT_RECOMMENDATION_V274.evaluateStore('a',{target:18,min:16,max:20,term:6,items:[risk]});
 assert.equal(a.hasMatch,false);assert.notEqual(a.matchType,'combo');
});
test('S5,S01,S02 load guard before combo, do not claim combo is confirmed',()=>{
 const s=['space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html','mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html','mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html'].map(js);
 for(const x of s){assert(x.indexOf('mini_koala_physical_fit_v1.js')<x.indexOf('mini_koala_combo_match_v1.js'));assert(x.includes('尺寸待核对')||x.includes('尺寸还需核对'))}
 assert(s[0].includes('item_constraints:physicalItems'));
 assert(s[1].includes('fitItems'));
 assert(s[2].includes('fit_allocations')&&s[2].includes('item_constraints:estimatorRequirement.item_constraints'));
 assert(s[2].includes('leadSave(leadPhone(),cfg.node')&&s[2].includes('requires_confirmation'));
 assert(!s[0].includes('组合可满足'));
 assert(!s[1].includes('组合可满足'));
});
console.log(`Physical FIT P0: ${checks}/${checks} checks`);
