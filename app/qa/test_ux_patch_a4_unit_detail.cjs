/** UX-PATCH A4 U01/S02 scoped behavior checks; Chromium is separately required. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const u=fs.readFileSync(path.join(root,'prototype/mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html'),'utf8');
const s=fs.readFileSync(path.join(root,'prototype/mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html'),'utf8');
const css=fs.readFileSync(path.join(root,'prototype/ux_patch_a4_unit_detail.css'),'utf8');
let pass=0;function test(name,fn){fn();console.log('PASS',name);pass++}
const start=u.indexOf('// UX-PATCH A4: use physical available counts');
const end=u.indexOf("$('#viewStoreDetail').onclick",start);
assert(start>0&&end>start);const snippet=u.slice(start,end);
function sandbox(ctx={}){
 const vars={availableUnits:[],sizeOptionId:'opt1',actualUnitId:'R1',u:{v:4.8},target:4.8,term:12,hasRequirement:true,fromS01State:'estimated',searchOriginKey:'guomao',searchMin:8,searchKm:3.5,accessFrequency:'low',customerType:'personal',storeId:'jianguo',s02File:'s02.html',s01File:'s01.html',URLSearchParams,window:{MINI_STORAGE_SALES_SHARE:{enabled:false}},$:()=>({dataset:{},setAttribute(){},set textContent(x){}}),...ctx};
 return vm.runInNewContext(snippet+'\n({otherAvailableUnitCount,storeDetailRoute,nearbyOtherUnitsRoute,syncOtherUnitEntry})',vars);
}
test('U01 alone opts into the scoped CSS',()=>{assert.strictEqual((u.match(/ux_patch_a4_unit_detail\.css/g)||[]).length,1);assert(css.includes('body.koala-site-shell.koala-u01'));});
test('Capacity-comparison prose removed, sold-out state retained',()=>{for(const x of ['容量匹配','更宽裕的容量','更紧凑的容量','比原估算空间更宽裕','空间尺寸</h2>'])assert(!u.includes(x),x);assert(u.includes("fitPanel.hidden=!isSoldOut"));});
test('Area and dimensions appear together as compact metadata',()=>{assert(u.includes('class="sub u01-space-meta"'));assert(u.includes('id="unitDimensions"'));for(const x of ['u.length_m','u.width_m','u.height_m'])assert(u.includes(x));});
test('Independent store and alternative-unit links exist',()=>{assert(u.includes('id="viewStoreDetail"'));assert(u.includes('id="viewOtherUnits"'));});
test('Other physical units counted instead of counting capacity cards',()=>{const f=sandbox().otherAvailableUnitCount;assert.strictEqual(f([{size_option_id:'opt1',available_count:1}],'opt1','R1'),0);assert.strictEqual(f([{size_option_id:'opt1',available_count:2}],'opt1','R1'),1);assert.strictEqual(f([{size_option_id:'opt1',available_count:0}],'opt1',''),0);assert.strictEqual(f([{size_option_id:'opt1',available_count:1},{size_option_id:'opt2',available_count:2}],'opt1','R1'),2);});
test('Store details retains requested store, target and selected term',()=>{const q=new URL(sandbox().storeDetailRoute(false),'https://example.test').searchParams;assert.strictEqual(q.get('store'),'jianguo');assert.strictEqual(q.get('target'),'4.8');assert.strictEqual(q.get('term'),'12');assert.strictEqual(q.get('state'),'matched');});
test('Same-store alternatives browse full stock and focus inventory',()=>{const route=new URL(sandbox().storeDetailRoute(true),'https://example.test');assert.strictEqual(route.searchParams.get('state'),'browse');assert.strictEqual(route.searchParams.get('focusOtherUnits'),'1');assert.strictEqual(route.hash,'#inventorySection');assert(s.includes("qp.get('source')==='u01_other_units'"));});
test('Nearby stores re-enter demand matching with duration and location context',()=>{const q=new URL(sandbox().nearbyOtherUnitsRoute(),'https://example.test').searchParams;assert.strictEqual(q.get('state'),'estimated');assert.strictEqual(q.get('target'),'4.8');assert.strictEqual(q.get('term'),'12');assert.strictEqual(q.get('searchOriginKey'),'guomao');});
test('Browse-origin alternative uses physical unit volume as new demand',()=>{const q=new URL(sandbox({hasRequirement:false,u:{v:3.3},fromS01State:'browse'}).nearbyOtherUnitsRoute(),'https://example.test').searchParams;assert.strictEqual(q.get('state'),'estimated');assert.strictEqual(q.get('target'),'3.3');assert.strictEqual(q.get('fromS01State'),'estimated');});
test('No missing duration is silently replaced by a default',()=>{const q=new URL(sandbox({term:null}).nearbyOtherUnitsRoute(),'https://example.test').searchParams;assert.strictEqual(q.get('term'),null);});
test('Price, payment and inventory paths preserved',()=>{for(const x of ['function currentPriceSnapshot()','function goOrder()','function goQuote()','function promoStatus()','function commitTradeRequirement()','const stockCount=capacityRow'])assert(u.includes(x));});
console.log(`${pass}/${pass} A4 targeted checks PASS; real browser NOT TESTED`);
