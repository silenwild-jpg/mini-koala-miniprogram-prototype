const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),unitFile='mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html';
const u01=fs.readFileSync(path.join(root,'prototype',unitFile),'utf8');
const delta=require('./phase3b_batch_c_approved_delta.json');
const fullSha=s=>crypto.createHash('sha256').update(s).digest('hex');
let total=0;function test(name,cb){cb();total++;console.log(`PASS 3B-C${String(total).padStart(2,'0')} ${name}`)}
const originalHash=delta.runtime[unitFile].baseline_full_sha;
const baselineAB=require('./phase3b_approved_delta.json');
test('Only U01 is authorized for this runtime release',()=>{
 assert.deepEqual(Object.keys(delta.runtime),[unitFile]);
 assert.equal(originalHash,baselineAB.protected_files['prototype/'+unitFile]);
 assert.equal(fullSha(u01),delta.runtime[unitFile].full_sha);
 assert.notEqual(originalHash,delta.runtime[unitFile].full_sha);
 for(const [file,sha] of Object.entries(delta.protected_unchanged)){const authorized=require('./phase3b_batch_d_approved_delta.json').authorized_runtime[path.basename(file)];if(authorized){assert.equal(authorized.before_sha256,sha,`original protected ${file}`);assert.equal(authorized.after_sha256,require('./phase3c_batch_a_approved_delta.json').authorized_runtime[path.basename(file)].before_sha256);assert.equal(fullSha(fs.readFileSync(path.join(root,file))),require('./phase3c_unified_approved_delta.json').authorized_runtime[path.basename(file)].after_sha256,`Batch 3C-A authorized ${file}`);}else assert.equal(fullSha(fs.readFileSync(path.join(root,file))),sha,`protected ${file}`)}
 for(const [f,sha] of Object.entries(delta.prior_batch_ab_runtime))assert.equal(fullSha(fs.readFileSync(path.join(root,'prototype',f))),sha,f);
});
const between=(a,b)=>{const i=u01.indexOf(a),j=u01.indexOf(b,i+a.length);assert(i>=0&&j>i,`missing ${a}..${b}`);return u01.slice(i,j)};
const create=()=>{const d={};const el=id=>d[id]||(d[id]={textContent:'',title:'',disabled:false,attrs:{},classList:{classes:new Set(),add(x){this.classes.add(x)},toggle(x,v){if(v)this.classes.add(x);else this.classes.delete(x)}},setAttribute(k,v){this.attrs[k]=v}});return {el,d};};
const fitCode=between("  const fitPanel=$('#capacityFit');","  const urgencyMaster=");
function fit({v=5,min=4,max=6,sizeMode='about',hasRequirement=true}={}){
 const {el,d}=create();const ctx={u:{v},min,max,sizeMode,hasRequirement,$:el};vm.runInNewContext(fitCode,ctx);
 return {title:el('#capacityFitTitle').textContent,text:el('#capacityFitText').textContent,state:el('#capacityFit').attrs['data-fit-state'],d,ctx};
}
test('Matching space puts fit before price',()=>{let x=fit();assert.equal(x.state,'matched');assert(x.title.includes('符合'));assert(u01.indexOf('id="capacityFit"')<u01.indexOf('id="termSection"'))});
test('Undersized is explicit warning regardless of special price',()=>{let x=fit({v:3});assert.equal(x.state,'undersized');assert(x.title.includes('低于'));assert(x.text.includes('下限'))});
test('Within upper-limit violation is explicit warning',()=>{let x=fit({v:7,sizeMode:'within',max:5});assert.equal(x.state,'over-limit');assert(x.text.includes('容量上限'))});
test('At-least mode permits larger size without false max warning',()=>{let x=fit({v:9,min:5,max:Infinity,sizeMode:'atleast'});assert.equal(x.state,'matched')});
test('Over estimated range remains alternative not false match',()=>{let x=fit({v:8,max:6});assert.equal(x.state,'browse-or-alternative');assert(x.title.includes('超出预估范围'))});
test('Browsing without user requirement does not assert matching',()=>{let x=fit({hasRequirement:false});assert.equal(x.state,'browse-or-alternative');assert(!x.title.includes('符合'))});
const stockCode=between('  const stockCount=capacityRow?',"  document.querySelectorAll('[data-quick]')");
function stock(count,identity='SIZE_OPTION'){
 const {el,d}=create();const panel=el('#capacityFit');const ctx={capacityRow:count===undefined?null:{available_count:count},inventoryIdentity:identity,fitPanel:panel,$:el};vm.runInNewContext(stockCode+"\nthis.checkedStock={isSoldOut,sameCapacityAvailable};",ctx);return {d,el,ctx:ctx.checkedStock};
}
test('Zero available shows sold-out and not remaining one',()=>{let x=stock(0);assert.equal(x.ctx.isSoldOut,true);assert.equal(x.el('#inventoryUrgencyBadge').textContent,'已售出');assert(x.el('#capacityFitTitle').textContent.includes('已售出'));assert(!x.el('#inventoryUrgencyText').textContent.includes('剩余1个'))});
test('Positive stock is shown without simulated viewer data',()=>{let x=stock(2);assert.equal(x.ctx.isSoldOut,false);assert(x.el('#inventoryUrgencyText').textContent.includes('剩余2个'));assert.equal(x.el('#viewerSignal').textContent,'')});
test('Unknown stock does not claim a single unit remains',()=>{let x=stock();assert.equal(x.ctx.sameCapacityAvailable,null);assert.equal(x.el('#inventoryUrgencyBadge').textContent,'库存待确认')});
test('Existing assigned actual-unit identity not confused with size stock',()=>{let x=stock(0,'ACTUAL_UNIT');assert.equal(x.ctx.isSoldOut,false)});
test('No term has no implicit one-month quote',()=>{assert(u01.includes("let term=p.get('term')?clampTerm(p.get('term')):null;"));assert(u01.includes("$('#confirm').textContent='选择租期'"));assert(u01.includes("$('#contractTotal').textContent='—'"))});
test('Known assigned vs representative scheme display explicitly separate',()=>{assert(u01.includes('actualUnitId?`已分配仓号 ${actualUnitId}`:`方案标识 ${representativeUnitNo}`'));assert(u01.includes('实际仓号以分配结果为准'))});
test('Inventory notice is after contract rent, deposits and payable',()=>{let i=u01.indexOf('id="inventoryUrgency"');assert(i>u01.indexOf('id="initialPayable"'));assert(u01.includes('inventory-urgency-copy small{display:none!important}'));assert(!u01.includes('startCountdown(promoCountdown,'))});
test('Both order and optional quotation are blocked when sold out',()=>{assert(u01.includes("$('#confirm').disabled=isSoldOut;"));assert(u01.includes("$('#saveQuote').disabled=isSoldOut;"));assert(u01.includes("if($('#confirm').disabled){toast('当前方案已售出"))});
test('Pricing and order-routing functions are text-identical to baseline',()=>{
  const baselines=[["function contractRent(m){", "function promoStatus(){", "8dc3eeaf65869760597ad1a03cc19bd12bb53c5ccc54ffa6b787ae7cd5bc40f9"], ["function currentPriceSnapshot(){", "function transactionRoute(){", "64b5ad771835832a2c2366a4c2b04040a2287790319b824f2bfec1fe757bc0fd"], ["function transactionRoute(){", "function toast(msg){", "6f32bf94277148a7de7b7ec3f3d04e5967ea63a35174ac9afa846797ad5780c0"]];
  for(const [start,end,sha] of baselines){const a=u01.indexOf(start),b=u01.indexOf(end,a+start.length);assert(a>=0&&b>a);assert.equal(fullSha(u01.slice(a,b)),sha,`business block ${start}`);}
});
console.log(`Phase 3B Batch C U01 focused tests: ${total}/${total} PASSED (static plus isolated state execution; not browser E2E)`);
