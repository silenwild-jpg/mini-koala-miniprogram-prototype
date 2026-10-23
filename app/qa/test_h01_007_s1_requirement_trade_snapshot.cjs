// H01-007-S1 · D-03 (no silent default term) / D-04 (final trade = requirement snapshot)
// Source-level + shared-helper tests. Does not replace the real HTTP run (qa/test_h01_007_s1_http_flows.py).
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const ssotSrc=read('prototype/mini_storage_business_ssot_v274.js');
const m01=read('prototype/mini_storage_mine_m01_v1_11_self_service_Visual_V2_7_4.html');
const s01=read('prototype/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html');
const s02=read('prototype/mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html');
const u01=read('prototype/mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html');
const q01=read('prototype/mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html');
const o01=read('prototype/mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html');
const est=read('prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html');
const h01=read('prototype/mini_storage_home_H01_Visual_V2_7_4_SSOT.html');

// ---- run the shared SSOT in a sandbox ----
const store={};
const ctx={window:{},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}},console};
ctx.window.localStorage=ctx.localStorage;ctx.self=ctx.window;
vm.createContext(ctx);vm.runInContext(ssotSrc,ctx);
const H=ctx.window.MINI_STORAGE_BUSINESS_HELPERS_V274,T=ctx.window.MINI_STORAGE_TRADE_SNAPSHOT_V1;

const cases=[];
const t=(name,fn)=>{try{fn();cases.push([name,true])}catch(e){cases.push([name,false,e.message])}};

// D-03 shared validity
t('validTerm accepts 1..60 integers only',()=>{for(const v of [1,6,12,60,'6','12']){assert.equal(H.validTerm(v),Number(v))}for(const v of [0,'0',61,-1,1.5,'abc','',null,undefined,'6.0',' ']){assert.equal(H.validTerm(v),null,'rejects '+JSON.stringify(v))}});
t('clampTerm untouched (pricing helper still clamps as before)',()=>{assert.equal(H.clampTerm('abc'),1);assert.equal(H.clampTerm(99),60);assert.equal(H.clampTerm(7),7)});
t('M01 resume: no valid term -> estimator requireTerm=1, never term 1',()=>{assert(m01.includes("requireTerm:'1',source:'mine_resume_term_required'"));assert(!m01.includes("term:String(r.term_months||1)"));assert(!m01.includes('${r.term_months||1}个月'))});
t('S01 resume entries: bottom find + browse strip route to term selection when term missing',()=>{assert(s01.includes("termRequiredEstimatorUrl(r,'bottom_find_term_required')"));assert(s01.includes("termRequiredEstimatorUrl(r,'s01_browse_strip_term_required')"));assert(!s01.includes("term:String(r.term_months||1)"))});
t('S01 estimated entry without valid term does not persist a default term',()=>{assert(s01.includes("if(state==='estimated' && qp.get('target') && !termRequiredRedirect)saveCurrentRequirement();"));assert(!s01.includes("if(qp.get('term'))termMonths=clampTerm(qp.get('term'));"))});
t('S02 / U01 parse the term strictly (invalid never clamps to 1)',()=>{assert(!s02.includes("if(qp.get('term'))termMonths=clampTerm(qp.get('term'));"));assert(u01.includes("let term=BUSINESS_HELPERS.validTerm(p.get('term'));"));assert(u01.includes("BUSINESS_HELPERS.validTerm(requirementContext.term_months)"))});
t('Estimator resume never substitutes 6 months for a missing saved term',()=>{assert(!est.includes("clampTerm(saved.term_months||6)"));assert(est.includes("validTerm?.(saved.term_months)??null"))});
t('H01 restore rule unchanged and consistent (hsiValidTerm 1..60 integer)',()=>{assert(h01.includes("function hsiValidTerm(value){const n=Number(value);return value!==null&&value!==undefined&&value!==''&&Number.isInteger(n)&&n>=1&&n<=60}"))});

// D-04 final trade snapshot
t('confirm(): final term wins, original estimate preserved, identity carried',()=>{
  const req={requirement_id:'R1',target_volume:5,min_volume:4.5,max_volume:5.8,term_months:6,size_mode:'about',source:'ESTIMATOR',updated_at:'2026-10-13T00:00:00.000Z',moving_support:'need'};
  const out=T.confirm(req,{store_id:'jianguo',size_option_id:'SO1',representative_unit_no:'BJ0498S01B001',actual_unit_id:null,unit_identity_type:'SIZE_OPTION',term_months:12,volume:6.24,target_volume:5,confirmed_by:'U01'});
  assert.equal(out.term_months,12);assert.equal(out.original_estimate.term_months,6);assert.equal(out.original_estimate.requirement_id,'R1');
  assert.equal(out.selected_store_id,'jianguo');assert.equal(out.selected_unit_id,'BJ0498S01B001');assert.equal(out.confirmed_volume,6.24);assert.equal(out.target_volume,5);
  assert.equal(out.moving_support,'need','non-trade fields preserved');assert.equal(out.snapshot_basis,'FINAL_TRADE_CONFIRMED');assert.equal(out.trade_confirmed.term_months,12);
  const again=T.confirm(out,{store_id:'jianguo',representative_unit_no:'BJ0498S01B001',term_months:24,volume:6.24,target_volume:5});
  assert.equal(again.term_months,24);assert.equal(again.original_estimate.term_months,6,'original estimate is written once, never overwritten');
});
t('confirm(): never invents a term and never computes price fields',()=>{
  const out=T.confirm({target_volume:5,term_months:0},{store_id:'jianguo',representative_unit_no:'X',term_months:'abc',volume:3});
  assert.equal(out.term_months,null);for(const k of ['monthly_price','total_price','deposit_amount','payable_total','price_snapshot'])assert(!(k in out),k+' must not be produced here');
});
t('U01 commits the final trade requirement at both commit points only',()=>{assert.equal((u01.match(/commitTradeRequirement\(\);/g)||[]).length,2);assert(u01.includes("if(!term||!T||!contextMatches)return null;"))});
t('Q01 / O01 requirement snapshot = confirmed trade; price gate untouched',()=>{assert(q01.includes("confirmed_by:'Q01'"));assert(o01.includes("confirmed_by:'O01'"));assert(o01.includes("if(!liveCheck.valid||liveCheck.values.payable!==payableTotal){toast('当前优惠或报价已变化，请返回仓位方案重新确认');return}"));assert(q01.includes("if(!T||!gateResult.valid)return base;"))});
t('Frozen rules untouched: management fee, deposit=monthly, term factors, price gate file',()=>{assert(ssotSrc.includes('management_fee:50'));assert(u01.includes('deposit=monthlyAverage'));assert.equal(read('prototype/mini_storage_price_gate_v1.js').includes("fail('TERM_INVALID')"),true)});

for(const [n,ok,msg] of cases)console.log((ok?'PASS':'FAIL')+' '+n+(ok?'':'  <- '+msg));
console.log(cases.filter(c=>c[1]).length+'/'+cases.length);
process.exit(cases.every(c=>c[1])?0:1);
