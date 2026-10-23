/** UX-PATCH A3 source behavior gate. Does not replace HTTP/Chromium visual acceptance. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html'),'utf8');
const css=fs.readFileSync(path.join(root,'prototype/ux_patch_a3_usage_recommendation.css'),'utf8');
let passed=0;
function test(label,fn){fn();passed++;console.log('PASS',label)}
test('A3 stylesheet opt-in only once',()=>assert.strictEqual((html.match(/ux_patch_a3_usage_recommendation\.css/g)||[]).length,1));
test('S5 title, no progression counter',()=>{assert(html.includes('>存储时长</div>'));assert(html.includes('>推荐仓位</div>'));assert(html.includes('s===1||s===5||s===6'));assert(css.includes('body:has(#s5.active) .estvis05-steps{display:none!important}'))});
test('First entry defaults only invalid term to 12 months',()=>assert(html.includes('if(s===5 && !(Number.isInteger(Number(state.term))&&Number(state.term)>=1&&Number(state.term)<=60))state.term=12;')));
test('Term switching still rerenders and 1–60 month controls retained',()=>{assert(html.includes('const quick=[1,3,6,12,36,60]'));assert(html.includes('state.term=Number(el.dataset.termQuick);rerender()'));assert(html.includes('Math.min(60'))});
test('Freight benefit is conditional and qualification detail is a focusable help action',()=>{assert(html.includes('(state.term&&state.term>=6)?'));assert(html.includes('本次租仓有机会享1次单程免费运输'));assert(html.includes('id="uxA3TransportHelp"'));assert(html.includes('id="uxA3TransportExplanation"'));assert(html.includes('搬出地址、驾车距离和当前订单条件'));assert(html.includes("if(e.key==='Escape')"))});
test('Unit card uses recommendation engine values, not reference prices',()=>{assert(html.includes('const recommendationSet=window.MINI_STORAGE_REQUIREMENT_RECOMMENDATION_V274.recommend('));assert(html.includes('window.MINI_KOALA_DATA.priceText(x.total)'));assert(html.includes('window.MINI_KOALA_DATA.priceText(x.monthly)'));assert(html.includes('representative_unit_no||u.id'));assert(!html.includes('¥2,250'));});
const match=html.match(/  const goDirectToUnit=x=>\{[\s\S]*?\n  \};/);assert(match);
function runRoute(x){
 let combo=0, nearby=0,saved=null, href='';
 const state={r113Plan:'nearest',term:12,addedP2:new Set(),complex:new Set()};
 const win={MINI_STORAGE_MASTER_V222:{route_source:'DEMO'},location:{set href(v){href=v},get href(){return href}}};
 const sandbox={x,state,window:win,searchCtx:{travel:'drive',origin:'guomao'},target:3.2,term:12,URLSearchParams,returnListContext:null,returnStoreContext:null,recommendationSet:{fallback:false},
  syncSelectedRecommendation:()=>x,saveEffectiveRequirement:v=>saved=v,storageSet:()=>{},estimatorStoreFacts:()=>({km:2.5,minutes:8}),
  continueToRecommendedUnit:()=>combo++,carryRequirementToStoreList:()=>nearby++,JSON,Set};
 vm.runInNewContext(match[0]+'\n goDirectToUnit(x);',sandbox);
 return {href,combo,nearby,saved};
}
const example={storeId:'jianguo',id:'nearest',matchType:'single',unit:{id:'BJ0498S01B001',size_option_id:'MK-BJ-5',representative_unit_no:'BJ0498S01B001'}};
test('Single unit navigates directly to U01 with original store, unit and demand',()=>{
 const t=runRoute(example),url=new URL(t.href,'https://example.invalid');
 assert(url.pathname.endsWith('mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html'));
 assert.strictEqual(url.searchParams.get('store'),'jianguo');assert.strictEqual(url.searchParams.get('unit'),'BJ0498S01B001');
 assert.strictEqual(url.searchParams.get('sizeOption'),'MK-BJ-5');assert.strictEqual(url.searchParams.get('term'),'12');assert.strictEqual(url.searchParams.get('target'),'3.2');
 assert.strictEqual(t.saved.recommended_unit_id,'BJ0498S01B001');assert.strictEqual(t.combo,0);
});
test('Combo does not masquerade as one physical unit',()=>{const t=runRoute({...example,matchType:'combo'});assert.strictEqual(t.combo,1);assert.strictEqual(t.href,'')});
test('Independent navigation is not the card primary click',()=>{assert(html.includes("if(e.target.closest('[data-ux-a3-route]'))return"));assert(html.includes('e.stopPropagation();navigateToStoreInfo(row)'))});
test('S5 density and preserved action bar have explicit CSS scope',()=>{assert(css.includes('#s5 .rplan.ux-a3-unit'));assert(css.includes('#s5 .usage-summary.capacity-summary'));assert(html.includes('id="usageChooseBtn"'))});
console.log(`${passed}/${passed} A3 source tests PASS; real browser NOT TESTED`);
