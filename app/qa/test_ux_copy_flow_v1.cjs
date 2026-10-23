const fs=require('fs'), path=require('path'), crypto=require('crypto'), assert=require('assert');
const root=path.join(__dirname,'..'), qa=path.join(__dirname,'ux_copy_flow_v1_scope.json');
const scope=JSON.parse(fs.readFileSync(qa,'utf8'));
const text=name=>fs.readFileSync(path.join(root,'prototype',name),'utf8');
const e=text('space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html');
const s02=text('mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html');
const u=text('mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html');
const s01=text('mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html');
const fallback=text('mini_koala_estimator_item_fallback_p0_v1.js');
const sales=text('mini_koala_sales_intervention_patch_v1.js');
const q=text('mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html');
let count=0;
function check(label,fn){fn();count++; console.log('PASS',String(count).padStart(2,'0'),label)}
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
check('runtime scope preserved relative to V1, exactly authorized 10',()=>{
 let changed=0;for(const [name,b] of Object.entries(scope.input_sha256)){
   const now=sha(path.join(root,name));
   if(scope.approved_runtime_files.includes(name)){
     assert.notStrictEqual(now,b,name);assert.strictEqual(now,scope.output_sha256[name],name);changed++;
   }else assert.strictEqual(now,b,'unauthorized change '+name);
 }assert.strictEqual(changed,10);
});
check('ordinary estimator hints removed',()=>{
 for(const t of ['选一个最接近的就可以，后面都可以修改','按实际数量调整，没有的减到 0','数量变化后自动更新','随数量实时更新','估算会结合常见摆放方式，后面会继续匹配真实可租仓位'])assert(!e.includes(t),t)
});
check('s3 selection subtitle hidden and S4 physical controls retained',()=>{
 assert(e.includes('id="amountQuestionSub" style="display:none"'));
 for(const id of ['id="amountList"','id="p1List"','id="p2List"','id="p3List"','id="liveRange"','id="toUsageBtn"'])assert(e.includes(id),id)
});
check('complex presets still require item review',()=>{assert(e.includes('if(!state.amount||!canQuickEstimate'));assert(e.includes('含家具或长件，请先核对物品数量。'))});
check('long item dynamic warning still exists',()=>{assert(e.includes('含长件，选仓时需确认门宽与搬运通道'));assert(fallback.includes('有长件或搬运不便'))});
check('U01 normal match compact, mismatch warnings retained',()=>{
 assert(u.includes("fitTitle='容量匹配'"));assert(u.includes("contextMatches&&Boolean(requirementContext.has_oversize)"));
 for(const phrase of ['容量低于需求下限','超过容量上限','当前方案已售出','门宽与仓位形态以门店确认为准','具体仓号待分配']) assert(u.includes(phrase),phrase)
});
check('U01 stock urgency and full payment disclosures retained',()=>{
 for(const id of ['id="inventoryUrgency"','id="contractTotal"','id="depositAmount"','id="managementFee"','id="initialPayable"'])assert(u.includes(id),id)
});
check('store enters estimator with explicit return-context',()=>{
 for(const word of ['returnTo:\'S02\'','returnStore:storeId','returnState:returnState','returnOriginKey:searchOriginKey','returnSearchKm:String(searchKm)'])assert(s02.includes(word),word)
});
check('origin store S5 primary action returns to origin S02',()=>{
 assert(e.includes("if(typeof returnStoreContext!=='undefined'&&returnStoreContext?.store)"));
 assert(e.includes("openEstimateResult(target,term,sharedAdvisorDecision(0).level)"));
 assert(e.includes("textContent='返回本店查看匹配仓位'"));
});
check('origin store always reachable even when global recommendation fallback',()=>{
 assert(e.includes("if(returnStoreContext?.store)$('#usageChooseBtn').onclick=continueToRecommendedUnit;"));
});
check('other stores remain an explicit option and E-store unchanged',()=>{
 assert(e.includes("storeListEntry.textContent=returnStoreContext?'查看其他门店 ›'"));
 assert(e.includes("$('#r113EstoreCard').innerHTML="));assert(e.includes("$('#estoreDemoLink').onclick="));
});
check('return to matched or nomatch S02 with focus marker',()=>{
 assert(e.includes("source:'estimator_return',focusMatched:'1'"));
 assert(s02.includes("qp.get('focusMatched')==='1'"));
 assert(s02.includes('scrollIntoView({behavior:\'auto\',block:\'start\'})'));
});
check('lead phone purpose concise but confirmation via button remains',()=>{
 assert(sales.includes('手机号仅用于本次咨询联系。'));
 assert(sales.includes('使用已确认手机号提交'));assert(sales.includes('window.finishLeadCapture'));
});
check('quotation verification disclosure remains',()=>assert(q.includes('下单前将重新确认价格与库存')));
check('no new forced lead capture in core path',()=>{
 assert(e.includes('continueToRecommendedUnit'));assert(e.includes('requestAdvisor'));
});
// Isolated execution of real S02 return function, not just matching text.
const begin=e.indexOf('function openEstimateResult('),end=e.indexOf('\n$(\'#toRealBtn\')',begin);
assert(begin>0&&end>begin);
const def=e.slice(begin,end);
function runReturn(units){
 const ctx={pricingPreviewForVolume:()=>({rent_total:3000}),sharedAdvisorDecision:()=>({level:'none',reason:'',expected_contract_rent:3000}),
 returnStoreContext:{store:'jianguo',travel:'drive',fromS01State:'estimated',access:'unknown'},
 activeEstimatorSearchContext:()=>({origin:'guomao'}),estimatorStoreFacts:()=>({minutes:10,km:2}),
 storageGet:()=>JSON.stringify({min_volume:4.5,max_volume:5.5,size_mode:'about'}),REQUIREMENT_KEY:'req',
 window:{MINI_KOALA_DATA:{getLegacyUnits:()=>units},MINI_STORAGE_MASTER_V222:{route_source:'demo'},location:{href:''}},
 state:{customer:'personal'},toast:()=>{throw Error('should have valid term')},
 s01File:'store-list.html',URLSearchParams};
 const fn=new Function(...Object.keys(ctx),def+'\nreturn openEstimateResult;')(...Object.values(ctx));
 assert.strictEqual(fn(5,6,'none'),true);
 return new URL(ctx.window.location.href,'https://example.test/');
}
check('real return function: original store with matched stock',()=>{
 const a=runReturn([{id:'A',v:5,available_count:1}]);assert.equal(a.searchParams.get('store'),'jianguo');assert.equal(a.searchParams.get('state'),'matched');assert.equal(a.searchParams.get('focusMatched'),'1');assert.equal(a.searchParams.get('term'),'6');
});
check('real return function: no match stays at original store',()=>{
 const a=runReturn([{id:'A',v:3,available_count:1}]);assert.equal(a.searchParams.get('store'),'jianguo');assert.equal(a.searchParams.get('state'),'nomatch');
});
check('AI entry forwards origin context only for store-origin flows',()=>{
  assert(e.includes("const aiContext=returnStoreContext?.store?location.search:''"));
  const ai01=text('mini_storage_ai_photo_ai01_v1_demo_patch.html');
  assert(ai01.includes('q.set(\'source\',source)'));
  assert(ai01.includes('location.search'));
});
check('AI processing preserves origin context through result',()=>{
  const loading=text('mini_storage_ai_loading_ai01_l_v1_demo_patch.html');
  assert(loading.includes('const q=new URLSearchParams(location.search)'));
  assert(loading.includes("q.set('case','office')"));
});
check('AI result returns to originating S02 without imposing six months',()=>{
  const ai02=text('mini_storage_ai_result_ai02_v1_demo_patch.html');
  assert(ai02.includes("const storeOrigin=origin.get('returnTo')==='S02'"));
  assert(ai02.includes('term_months:storeOrigin?verifiedTerm:6'));
  assert(ai02.includes("location.href='mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html?'"));
  assert(ai02.includes("if(verifiedTerm)q.set('term',String(verifiedTerm))"));
});
console.log(`UX Copy & Store Return ${count}/${count} passed`);
