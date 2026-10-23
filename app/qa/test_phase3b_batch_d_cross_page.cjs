'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert'),vm=require('vm');
const root=path.resolve(__dirname,'..'),proto=path.join(root,'prototype');
const file={
 S01:'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html',
 S02:'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html',
 U01:'mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html',
 Q01:'mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html',
 O01:'mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html',
};
const read=f=>fs.readFileSync(path.join(proto,file[f]),'utf8');
const html=Object.fromEntries(Object.keys(file).map(k=>[k,read(k)]));
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const delta=require('./phase3b_batch_d_approved_delta.json');
let count=0;function test(label,check){check();count++;console.log(`PASS 3B-D${String(count).padStart(2,'0')} ${label}`)}
// A new independent version guard protects ALL runtime files, not only the two edited pages.
test('D authorization permits exactly Q01 and O01',()=>assert.deepEqual(Object.keys(delta.authorized_runtime).sort(),[file.Q01,file.O01].sort()));
test('Q01 and O01 hashes match only the new authorized versions',()=>{
 const c=require('./phase3b_batch_c_approved_delta.json');
 for(const k of ['Q01','O01']){const d=delta.authorized_runtime[file[k]];
 assert.equal(d.before_sha256,c.protected_unchanged['prototype/'+file[k]]);
 assert.equal(d.after_sha256,require('./phase3c_batch_a_approved_delta.json').authorized_runtime[file[k]].before_sha256);
 assert.equal(sha(html[k]),require('./phase3c_unified_approved_delta.json').authorized_runtime[file[k]].after_sha256);}
});
test('All other runtime HTML, JS, CSS remain byte-identical',()=>{
 for(const [f,h] of Object.entries(delta.immutable_runtime)){const auth=require('./phase3c_batch_a_approved_delta.json').authorized_runtime[f];if(auth){assert.equal(h,auth.before_sha256);assert.equal(sha(fs.readFileSync(path.join(proto,f))),require('./phase3c_unified_approved_delta.json').authorized_runtime[f]?.after_sha256||auth.after_sha256);}else if(require('./phase3c_unified_approved_delta.json').authorized_runtime[f]){const u=require('./phase3c_unified_approved_delta.json').authorized_runtime[f];assert.equal(h,u.before_sha256);assert.equal(sha(fs.readFileSync(path.join(proto,f))),u.after_sha256);}else assert.equal(sha(fs.readFileSync(path.join(proto,f))),h,f);}
});
test('U01 clearly distinguishes unassigned plan vs actual allocation',()=>{
 assert(html.U01.includes('actualUnitId?`已分配仓号 ${actualUnitId}`:`方案标识 ${representativeUnitNo}`'));
 assert(html.U01.includes('实际仓号以分配结果为准'));
});
function renderTitle(k,actualUnitId,representativeUnitNo){
 const s=html[k];let node=k==='Q01'?'#unit':'#unitTitle';let line=s.split('\n').find(x=>x.includes(`document.querySelector('${node}').textContent=`));
 assert(line,`missing ${k} user identity rendering`);
 let snippet=line.split(';')[0]+';';
 let dom={textContent:''};vm.runInNewContext(snippet,{actualUnitId,representativeUnitNo,document:{querySelector:x=>{assert.equal(x,node);return dom;}}});
 return dom.textContent;
}
test('Q01 without actual physical unit shows only plan identifier',()=>assert.equal(renderTitle('Q01','', 'C008'),'仓位方案 · 方案标识 C008'));
test('O01 without actual physical unit shows only plan identifier',()=>assert.equal(renderTitle('O01','', 'C008'),'仓位方案 · 方案标识 C008'));
test('Assigned physical unit shown faithfully in Q01/O01',()=>{
 for(const k of ['Q01','O01']){
 const v=renderTitle(k,'ACT-108','C008');assert.equal(v,'仓位方案 · 已分配仓号 ACT-108');assert(!v.includes('方案标识 C008'));
 }
});
test('O01 never asserts stock currently available merely from deep link',()=>{
 assert(!html.O01.includes('4.8m³ · 当前可租'));
 assert(html.O01.includes("actualUnitId?'仓位已分配':'具体仓位待分配'"));
});
test('Quoted plan remains non-binding for prices and allocation',()=>{
 assert(html.Q01.includes('不锁价、不锁仓'));assert(html.Q01.includes('以'+ '下单时为准'));
});
test('Requirement source and location selection remain city-scoped',()=>{
 assert(html.S01.includes('getStore(id)?.city===ACTIVE_STORE_CITY'));
 assert(html.S01.includes('function filteredOrder()'));
 assert(html.S02.includes('data-soldout=')&&html.S02.includes('data-soldout="${soldOut?'));
});
test('S02 distinguishes matches from small alternatives and sold-out units',()=>{
 for(const v of ['符合当前需求 · 推荐','低于当前需求下限','更宽裕 · 备选','已售出'])assert(html.S02.includes(v),v);
});
test('U01 retains sold-out and no-term protection',()=>{
 for(const v of ["$('#confirm').disabled=isSoldOut;","$('#saveQuote').disabled=isSoldOut;","$('#confirm').textContent='选择租期'"])assert(html.U01.includes(v),v);
});
test('All downstream pages keep identity context',()=>{
 for(const k of ['U01','Q01','O01'])for(const key of ['sizeOption','representativeUnit','actualUnit','inventoryIdentity'])assert(html[k].includes(key),`${k} ${key}`);
});
test('Q01 and O01 preserve common snapshot fields and fee components',()=>{
 for(const k of ['Q01','O01']){assert(html[k].includes('pricingGate.validate('),k);assert(html[k].includes('gateResult.values'),k);}
 const gate=fs.readFileSync(path.join(proto,'mini_storage_price_gate_v1.js'),'utf8');for(const key of ['monthly_average','total_rent','deposit','management_fee','upfront_payable'])assert(gate.includes(key),key);
});
test('Q01 and O01 both prefer matching price snapshot for current terms',()=>{
 for(const k of ['Q01','O01']){
 assert(html[k].includes('carriedPriceSnapshot.store_id===storeId'));
 assert(html[k].includes('Number(carriedPriceSnapshot.term_months)===term'));
 assert(html[k].includes('carriedPriceSnapshot.size_option_id===sizeOptionId'));
 }
});
test('Upfront payable reflects total, deposit and management fee in both pages',()=>{
 assert(html.Q01.includes('const initialPayable=initialPayableParam'));
 assert(html.O01.includes('const payableTotal=initialPayableParam'));
 assert(html.O01.includes("'#payableTotal'"));
});
test('Order routing, payment and persisted internal identity semantics are unmodified',()=>{
 for(const k of ['Q01','O01'])assert(html[k].includes("unit_id_semantics:'LEGACY_REPRESENTATIVE_DISPLAY'"));
 assert(html.O01.includes("status:'PENDING_PAYMENT'"));
});
test('Prototype stock limitations remain open while invalid term now fails closed',()=>{
 assert(html.O01.includes("pricingGate.parseTerm(p.get('term'))"));
 assert(!html.O01.includes('realTimeInventoryValidated'));
});
console.log(`Phase 3B Batch D cross-page checks: ${count}/${count} PASSED (source + isolated rendering; no browser or WeChat E2E)`);
