const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html','utf8');
let active,requests=0,applied=0,records={};
class Element{
  constructor(tag){this.tag=tag;this.children=[];this.events={};this.value='';}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  setAttribute(){}
  addEventListener(type,fn){this.events[type]=fn;}
  showModal(){active=this;}
  close(){this.events.close?.();active=null;}
  remove(){}
}
const document={querySelector:()=>active,createElement:tag=>new Element(tag),body:new Element('body')};
const c={window:null,document,localStorage:{setItem:(k,v)=>records[k]=v},Date};c.window=c;vm.createContext(c);
vm.runInContext(fs.readFileSync('prototype/mini_koala_phase2_ux.js','utf8'),c);
const api=c.MINI_KOALA_PHASE2;
function descendants(el){return [el,...el.children.flatMap(descendants)];}
function click(copy){const el=descendants(active).find(e=>e.tag==='button'&&e.textContent===copy);assert(el,'button '+copy);el.onclick();}
let count=0;function test(name,fn){fn();count++;console.log('PASS '+name);}
test('Lower / equal / higher rent recommendations do not make false savings claims',()=>{
  const nearest={storeId:'a',total:1000};
  assert.equal(api.recommendationRole(nearest,nearest,false),'离您最近');
  assert.equal(api.recommendationRole({storeId:'b',total:900},nearest,false),'整期租金更省');
  for(const total of [1000,1100])assert.equal(api.recommendationRole({storeId:'b',total},nearest,false),'另一家匹配门店');
  assert.equal(api.recommendationRole({storeId:'b'},nearest,true),'容量接近的备选');
});
test('Completed result parameters preserve sorting/radius and use active location',()=>{
  const source={origin:'guomao',travel:'drive',sort:'price',distance:'5',access:'high',scroll:100,loaded:16};
  const result=api.listParams(source,{origin:'wangjing',travel:'bike'});
  assert.equal(result.searchOriginKey,'wangjing');assert.equal(result.distance,'5');assert.equal(result.sort,'price');assert.equal(result.scroll,'0');assert.equal(source.origin,'guomao');assert.equal(source.loaded,16);
});
test('Radius filtering respects boundaries and unlimited mode',()=>{assert(api.withinDistance(5,'5'));assert(!api.withinDistance(5.1,'5'));assert(api.withinDistance(40,'any'));});
test('Opening capacity editor leaves demand untouched',()=>{api.capacityPicker({value:6,original:8,onApply:()=>applied++});assert.equal(applied,0);});
test('Capacity draft changes are discarded on cancel',()=>{click('−');click('取消');assert.equal(applied,0);});
test('Same capacity confirmation preserves selected result',()=>{api.capacityPicker({value:6,onApply:()=>applied++});click('按这个容量找仓');assert.equal(applied,0);});
test('Smaller capacity shows warning and applies only on confirmation',()=>{
  let next;api.capacityPicker({value:6,original:8,onApply:v=>next=v});click('−');assert(descendants(active).some(e=>e.textContent?.includes('找仓容量小于原估算')));assert.equal(next,undefined);click('按这个容量找仓');assert.equal(next,5.5);
});
test('Invalid capacity keeps editor open and does not apply',()=>{api.capacityPicker({value:6,onApply:()=>applied++});descendants(active).find(e=>e.tag==='input').value=0;click('按这个容量找仓');assert(active);assert.equal(applied,0);active.close();});
test('At least / at most semantics remain visible',()=>{for(const mode of ['atleast','within']){api.capacityPicker({value:6,mode,onApply:()=>{}});assert(descendants(active).some(e=>e.textContent?.includes(mode==='atleast'?'至少':'不超过')));active.close();}});
test('Unsupported location is not committed',()=>{api.locationPicker({origin:'guomao',names:{guomao:'国贸',wangjing:'望京'},onApply:()=>applied++});const select=descendants(active).find(e=>e.tag==='select');select.value='invalid';click('使用这个位置');assert(active);assert.equal(applied,0);active.close();});
test('Supported location is committed together with its label',()=>{let result;api.locationPicker({origin:'guomao',names:{guomao:'国贸',wangjing:'望京'},onApply:(key,label)=>result={key,label}});descendants(active).find(e=>e.tag==='select').value='wangjing';click('使用这个位置');assert.deepEqual(result,{key:'wangjing',label:'望京'});});
test('Canceling location editor keeps prior conditions',()=>{api.locationPicker({origin:'guomao',names:{guomao:'国贸'},onApply:()=>applied++});click('取消');assert.equal(applied,0);});
test('EStore introduction/cancel creates no consultation',()=>{api.estore({context:{target_volume:6,term_months:12,usage_location:'望京'},request:()=>requests++});assert.equal(requests,0);click('继续看其他方案');assert.equal(requests,0);assert.equal(Object.keys(records).length,0);});
test('Explicit consultation carries demand and clearly marks demo',()=>{let result;api.estore({context:{target_volume:6,term_months:12,usage_location:'望京'},request:v=>result=v});click('咨询E存方案');assert.equal(result.target_volume,6);assert.equal(result.term_months,12);assert.equal(result.service,'ESTORE');assert(result.demo_only);});
test('Demo consultation feedback does not claim actual sending',()=>{api.estoreSaved({target_volume:6});assert.equal(JSON.parse(records.mini_koala_estore_demo_request).status,'DEMO_SAVED');assert(descendants(active).some(e=>e.textContent?.includes('当前未发送给顾问')));active.close();});
test('Actual estimator reads current position without overwriting source context',()=>{
  c.state={searchOriginOverride:'wangjing'};c.returnListContext={origin:'guomao',travel:'bike'};c.returnStoreContext=null;
  const source=html.slice(html.indexOf('function activeEstimatorSearchContext(){'),html.indexOf('function estimatorUsageLocationLabel(){'));vm.runInContext(source,c);
  const context=c.activeEstimatorSearchContext();assert.equal(context.origin,'wangjing');assert.equal(context.travel,'bike');assert.equal(c.returnListContext.origin,'guomao');
});
test('Actual capacity apply retains items, term and position',()=>{
  const items={box:5},input={value:6,scrollIntoView(){},focus(){this.focused=true}};c.state={quantities:items,term:12,searchOriginOverride:'wangjing'};c.$=()=>input;c.effectiveRequirement=()=>({target:6});c.renderUsage=()=>{};c.toast=()=>{};c.invalidateUsageRequirement=()=>{};
  const fn=html.slice(html.indexOf('function openUsageCapacityEditor(){'),html.indexOf('function openEstoreConsultation('));vm.runInContext(fn,c);c.openUsageCapacityEditor();assert(input.focused);c.applyUsageCapacity(5.5);assert.equal(c.state.usageTargetOverride,5.5);assert.equal(c.state.quantities,items);assert.equal(c.state.term,12);assert.equal(c.state.searchOriginOverride,'wangjing');
});
// Parse every inline script in the two modified pages and the new shared script.
test('Modified page scripts compile',()=>{for(const name of ['space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html','mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html']){const text=fs.readFileSync('prototype/'+name,'utf8');for(const match of text.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi))new vm.Script(match[1]);}});
console.log(`RESULT: ${count} behavior groups passed; simulated DOM, browser/WeChat not verified.`);
