const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),proto=path.join(root,'prototype');
const s01=fs.readFileSync(path.join(proto,'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html'),'utf8');
const s02=fs.readFileSync(path.join(proto,'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html'),'utf8');
const fixture=fs.readFileSync(path.join(proto,'mini_storage_demo_fixture_v2.js'),'utf8');
const hub=fs.readFileSync(path.join(proto,'product_demo_hub_v1.html'),'utf8');
const matrix=fs.readFileSync(path.join(proto,'index_state_machine_demo.html'),'utf8');
function has(src,x,msg){assert(src.includes(x),msg+' -> '+x)}

// S01: only authoritative zero inventory or an explicit demo fixture becomes SOLD_OUT.
has(s01,"window.MINI_STORAGE_UNIT_MASTER_V1?.getStoreSummary",'S01 derives inventory availability through the full unit master');
has(s01,"inventoryScenario==='soldout' && id===INVENTORY_DEMO_SOLDOUT_STORE_ID",'S01 demo override is explicit and isolated');
has(s01,"ids=ids.filter(id=>inventoryStatusForStore(id)==='AVAILABLE')",'sold-out stores are excluded from the normal recommendation/price list');
has(s01,"当前已售罄，可以查看附近其他门店。",'sold-out card provides a customer recovery path');
has(s01,"暂无符合当前需求的仓位",'NO_MATCH is distinct from SOLD_OUT');
has(s01,"'NO_MATCH'",'NO_MATCH status is explicit');
has(s01,"'SOLD_OUT'",'SOLD_OUT status is explicit');

// S02: sold-out means no user-facing unit cards; do not fabricate rented-unit rows.
has(s02,"if(typeof inventoryStatus!=='undefined' && inventoryStatus==='SOLD_OUT')return []",'S02 inventory list is empty in sold-out state');
has(s02,'其他容量','S02 can expose capacity-level availability without listing rented unit numbers');
has(s02,'已售罄','S02 sold-out state uses frozen customer wording');
has(s02,'当前没有可租仓位','S02 sold-out empty state');
has(s02,'查看附近有仓门店','S02 has a recovery path');
assert(!s02.includes('已租仓位 1') && !s02.includes('已租用仓位列表'),'S02 does not introduce fabricated rented-unit inventory');

// Demo Hub: sold-out state is available for review without adding a demo badge to customer-facing screens.
has(fixture,"if(mode==='soldout')",'fixture exposes S01 sold-out demo');
has(fixture,"mode==='soldout'",'fixture exposes S02 sold-out demo');
has(hub,'门店已售罄','Hub exposes sold-out state');
has(matrix,'S01_SOLD_OUT_VISIBILITY','State Matrix exposes S01 sold-out semantics');
has(matrix,'S02_SOLD_OUT','State Matrix exposes S02 sold-out semantics');

// Current remaining-inventory mother data remains unchanged; the full-unit layer is separate.
const ctx={window:{},console};ctx.window.window=ctx.window;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'data','mini_koala_data.js'),'utf8'),ctx);
const zero=ctx.window.MINI_KOALA_DATA.stores.filter(s=>Number(s.available_unit_count||0)<=0);
assert.equal(zero.length,0,'current real remaining-inventory mother data is unchanged; no real store is re-labeled sold-out');

console.log('PASS Inventory Visibility & Sold-out Semantics V1: AVAILABLE / NO_MATCH / SOLD_OUT separated, sold-out leaves recommendation layer, no rented-unit fabrication');
