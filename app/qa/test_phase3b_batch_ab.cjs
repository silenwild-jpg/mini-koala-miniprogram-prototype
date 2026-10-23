'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),proto=path.join(root,'prototype');
const read=f=>fs.readFileSync(path.join(proto,f),'utf8');
const s01Name='mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html';
const s02Name='mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html';
const s01=read(s01Name),s02=read(s02Name);
const delta=require('./phase3b_approved_delta.json');
let passed=0;
function check(name,fn){fn();passed++;console.log(`PASS 3B-${String(passed).padStart(2,'0')} ${name}`)}
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
check('only approved S01/S02 full hashes are locked',()=>{
 assert.deepEqual(Object.keys(delta.runtime).sort(),[s01Name,s02Name].sort());
 for(const f of [s01Name,s02Name])assert.equal(sha(fs.readFileSync(path.join(proto,f))),delta.runtime[f].full_sha);
});
check('S01 state-specific demand summary and lightweight browse guide',()=>{
 assert(s01.includes('id="activeDemandCard"')&&s01.includes('按当前需求及${termHuman(termMonths)}比较附近可租仓位'));
 assert(s01.includes('state-browse" id="estimateStrip"')&&s01.includes('不确定需要多大空间'));
 assert(s01.includes('const totalLabel=zeroMatch?'));
 assert(s01.includes('查看匹配仓位')&&s01.includes('查看容量备选'));
});
check('S01 city filter, range, services, EStore isolation remain intact',()=>{
 for(const x of ["getStore(id)?.city===ACTIVE_STORE_CITY",'function filteredOrder()',"makeEStoreListCard({fallbackFirst:true})",'data-card-kind="ESTORE"','matchedDataFor'])assert(s01.includes(x),x);
});
check('S01 browse viewing is secondary and cards keyboard accessible',()=>{
 for(const x of ['browse-next-main','viewing-cta','openStoreViewing(btn.closest',"card.onkeydown=e=>{if(e.target!==card)return;"])assert(s01.includes(x),x);
});
check('S02 service accordions start closed; inventory and viewing order frozen',()=>{
 assert(s02.includes('<details class="section section-collapsible"><summary><div><b>到店与搬运'));
 assert(s02.includes('<details class="section section-collapsible"><summary><div><b>设施与服务'));
 assert(s02.indexOf('id="inventorySection"')<s02.indexOf('id="viewingSection"'));
 assert(s02.indexOf('id="unitList"')<s02.indexOf('id="allUnits"'));
 assert(s02.includes('id="allUnits" type="button"'));
});
function getFn(s,start,end){const i=s.indexOf(start),j=s.indexOf(end,i+start.length);assert(i>=0&&j>i,`missing snippet: ${start}`);return s.slice(i,j)}
const cardCode=getFn(s02,'function unitCard(unit,role,reason,tradeoff=\'\',showLonger=false){','function nearestUnits(){');
const ctx={state:'matched',termMonths:6,estimatorRequirement:{has_oversize:false},storeId:'store',
  range:()=>({min:4.5,max:5.5}),priceFor:u=>Math.round(u.base*.7),
  pricingContractFromBase:(base,term)=>Math.round(base*.7*term),termDiscountLabel:()=> '7折',
  nextPriceBreakpoint:()=>null,priceAtTerm:u=>Math.round(u.base*.7),
  window:{MINI_KOALA_DATA:{priceText:n=>String(n),sizeText:v=>`${v.toFixed(1)}m³`,areaText:v=>`${(v/2.5).toFixed(1)}㎡`,dimensionText:u=>'尺寸待核对'},MINI_STORAGE_INVENTORY_URGENCY_V1:null}
};vm.createContext(ctx);vm.runInContext(cardCode,ctx);
const unit=(v,count=2)=>({id:`UNIT${v}`,v,base:900,available_count:count});
check('S02 in-range warehouse is labeled as matching',()=>{
 const h=ctx.unitCard(unit(5),'推荐 · 需求接近','', '',true);
 assert(h.includes('符合当前需求 · 推荐')&&h.includes('查看仓位方案'));
 assert(!h.includes('is-alternative')&&!h.includes('data-tradeoff="compact"'));
});
check('S02 undersized tradeoff never masquerades as a match',()=>{
 const h=ctx.unitCard(unit(3),'推荐 · 需求接近','');
 for(const t of ['偏小备选','低于当前需求下限','is-compact-alternative','data-tradeoff="compact"','查看备选方案'])assert(h.includes(t),t);
});
check('S02 over-range item is a tradeoff, not a matching unit',()=>{
 const h=ctx.unitCard(unit(7),'更宽裕','');
 for(const t of ['更宽裕 · 备选','大于当前需求范围','data-tradeoff="out_of_range"','查看备选方案'])assert(h.includes(t),t);
});
check('S02 sold-out unit is not actionable',()=>{
 const h=ctx.unitCard(unit(5,0),'推荐','');
 assert(h.includes('已售出')&&h.includes('data-soldout="1"')&&h.includes('disabled aria-disabled="true"'));
 assert(s02.includes("if(card.dataset.soldout==='1')return"));
});
check('S02 browse does not invent a term-specific total',()=>{
 ctx.state='browse';ctx.termMonths=null;
 const h=ctx.unitCard(unit(5),'特价','');
 assert(h.includes('参考价格')&&!h.includes('整期总租金')&&!h.includes('data-tradeoff="compact"'));
 ctx.state='matched';ctx.termMonths=6;
});
check('S02 single matching choice hides redundant comparative price band',()=>{
 assert(s02.includes('if(totals.length<=1){band.classList.add(\'hidden\');return;}'));
});
check('previously frozen cross-page pricing and transaction sources unchanged',()=>{
 const protectedNames=delta.protected_files||{};
 assert(Object.keys(protectedNames).length>=5);
 for(const [f,h] of Object.entries(protectedNames)){const current=sha(fs.readFileSync(path.join(root,f)));if(f==='prototype/mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html'){const c=require('./phase3b_batch_c_approved_delta.json').runtime[path.basename(f)];assert.equal(c.baseline_full_sha,h,'Batch C baseline stays Batch A+B U01');assert.equal(current,c.full_sha,'Batch C U01 authorized hash');}else if(require('./phase3b_batch_d_approved_delta.json').authorized_runtime[path.basename(f)]){const d=require('./phase3b_batch_d_approved_delta.json').authorized_runtime[path.basename(f)];assert.equal(d.before_sha256,h,`authorized baseline ${f}`);assert.equal(d.after_sha256,require('./phase3c_batch_a_approved_delta.json').authorized_runtime[path.basename(f)].before_sha256);assert.equal(current,require('./phase3c_unified_approved_delta.json').authorized_runtime[path.basename(f)].after_sha256,`authorized Batch 3C-A ${f}`);}else assert.equal(current,h,`protected ${f}`);}
});
console.log(`Phase 3B Batch A+B checks ${passed}/${passed} PASSED`);
