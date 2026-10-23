'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html'),'utf8');
const addon=fs.readFileSync(path.join(root,'prototype/mini_koala_estimator_item_fallback_p0_v1.js'),'utf8');
const css=fs.readFileSync(path.join(root,'prototype/ux_patch_a2_item_confirmation.css'),'utf8');
const between=(text,begin,end)=>{const i=text.indexOf(begin),j=text.indexOf(end,i+begin.length);assert(i>=0&&j>i,begin);return text.slice(i,j)};
let pass=0;function test(name,fn){fn();pass++;console.log('PASS',name)}
const s4=between(html,'<section class="screen ux-a2-items" id="s4">','<section class="screen" id="s5">');
class El{
 constructor(id){this.id=id;this.innerHTML='';this.textContent='';this.disabled=false;this.attrs={};this.style={};this.dataset={};this.classList={add(){},remove(){},toggle(){}};}
 setAttribute(k,v){this.attrs[k]=String(v)}
 replaceChildren(){this.innerHTML=''}
}
const dom={};const $=s=>dom[s] || (dom[s]=new El(s));
const context={document:{querySelector:$,querySelectorAll:()=>[]},window:{},console,setTimeout:()=>0,clearTimeout:()=>{}};
vm.createContext(context);
vm.runInContext(between(html,'const sceneCfg = {','// EST-VIS-09: ITEM-VIS-08 image mapping')+'\n'+between(html,'// EST-VIS-09: ITEM-VIS-08 image mapping','function termDiscountLabel')+'\nglobalThis.A2={sceneCfg,sceneItems,items,state,applyPreset,calc,itemVol,renderItems,renderLive,rawVolume,itemCard,currentLayout};',context);
const api=context.A2;
const clearSource=between(html,"$('#clearItemsBtn').onclick=()=>{","$('#toUsageBtn').onclick=");
context.toast=()=>{};
vm.runInContext(clearSource,context);
function setup(scene,amount){api.state.flow='estimate';api.state.scene=scene;api.state.amount=amount;api.applyPreset();api.renderItems();api.renderLive()}
function itemIds(rendered){return [...rendered.matchAll(/data-act="plus" data-id="([^"]+)"/g)].map(x=>x[1])}
test('S4 structure and required copy are present; old group labels are gone',()=>{
 for(const t of ['选择存储物品','需要存储容量','清空所选','查看推荐','id="p1List"','id="p2List"','id="p3List"'])assert(s4.includes(t),t);
 for(const t of ['核对要存的物品','先添加要存的物品','可能还要加','先确认这些','添加其他物品'])assert(!s4.includes(t),t);
 assert(css.includes('#s4.ux-a2-items')&&css.includes('#p2Chips')&&css.includes('#morePanel'));
});
test('8 scene configurations always show all default natural-list items, including zero-count',()=>{
 for(const [scene,config] of Object.entries(api.sceneCfg)){
  const amount=config.amounts[0].id;setup(scene,amount);
  const layout=api.currentLayout();const expected=[...new Set([...layout.p1,...layout.p2,...layout.p3])];
  const actual=['#p1List','#p2List','#p3List'].flatMap(s=>itemIds($(s).innerHTML));
  assert.deepStrictEqual(actual,expected,scene);
  assert.equal($('#p2Chips').innerHTML,'');
  assert(actual.some(id=>(api.state.quantities[id]||0)===0),scene+' zero-count listed');
 }
});
test('single-piece label is independent of quantity or variant count',()=>{
 setup('moving',api.sceneCfg.moving.amounts[0].id);
 const item='box',vid=api.state.variants[item];
 api.state.quantities[item]=12;
 let card=api.itemCard(item,'p1');
 let vol=api.items[item].variants[vid].vol;
 assert(card.includes('约 '+Number(vol.toFixed(vol<.1?3:2))+'m³/件'));
 assert(!card.includes('当前约 '+api.itemVol(item).toFixed(2)+'m³'));
 api.state.quantities[item]=0;assert(api.itemCard(item,'p1').includes('m³/件'));
});
test('clear zeros all quantities but retains scene, amount and variant selection',()=>{
 setup('moving',api.sceneCfg.moving.amounts[0].id);
 api.state.quantities['luggage28']=5;api.state.quantities['box']=2;
 api.state.itemsConfirmed=true;
 api.renderItems();api.renderLive();assert(!$('#clearItemsBtn').disabled);
 const scene=api.state.scene,amount=api.state.amount,variant=api.state.variants['box'];
 $('#clearItemsBtn').onclick();
 assert.equal(api.state.scene,scene);assert.equal(api.state.amount,amount);assert.equal(api.state.variants['box'],variant);
 assert(Object.values(api.state.quantities).every(q=>q===0));
 assert.equal(api.state.itemsConfirmed,false);assert.equal(api.rawVolume(),0);
 assert($('#clearItemsBtn').disabled);assert($('#toUsageBtn').disabled);
 assert($('#liveRange').textContent.includes('待添加'));assert($('#liveDockRange').textContent.includes('待添加'));
 assert(itemIds($('#p1List').innerHTML).length>0,'zero items stay visible');
});
test('after clear item can be added again and top/bottom capacity refresh together',()=>{
 api.state.quantities.box=1;api.renderItems();api.renderLive();
 assert(api.rawVolume()>0);assert(!$('#toUsageBtn').disabled);
 assert($('#liveRange').textContent.includes($('#liveDockRange').textContent));
});
test('catalog addon retains custom-dimension route without resurrecting old headings',()=>{
 for(const x of ['id="estCategory"','id="estCustomToggle"','id="estCustomSave"','function renderExtras(){'])assert(addon.includes(x),x);
 for(const x of ["textContent='先添加要存的物品'","textContent='可能还要加'",'selected.forEach(card=>first.appendChild(card))'])assert(!addon.includes(x),x);
 assert(addon.includes('host.querySelectorAll(\'.kv\')'));
});
test('51 variants × quantities 0/1/2/12/99 retain exact math, nonnegative ranges and per-piece copy',()=>{
 let count=0;
 for(const [id,it] of Object.entries(api.items))for(const [variant,record] of Object.entries(it.variants)){
  api.state.variants[id]=variant;
  for(const q of [0,1,2,12,99]){
   api.state.quantities={[id]:q};
   assert(Math.abs(api.itemVol(id)-record.vol*q)<1e-9,`${id}/${variant}/${q}`);
   const r=api.calc();assert(r.min>=0&&r.max>=r.min,`${id}/${variant}/${q} range`);
   const card=api.itemCard(id,'p2');
   const per=Number(record.vol.toFixed(record.vol<.1?3:2));
   assert(card.includes(`约 ${per}m³/件`),`${id}/${variant}/${q} per item`);
   count++;
  }
 }
 assert.equal(count,255);
});
test('A2 remains localized: previous A1.1 5m³ path untouched and existing quantity handlers remain',()=>{
 assert(html.includes('displayedUpper<5.0'));
 assert(html.includes('function bindItemControls(root)'));
 assert(html.includes('Math.min(99,q+1)'));assert(html.includes('Math.max(0,q-1)'));
 assert(html.includes('state.variants[btn.dataset.id]=btn.dataset.vid'));
 assert(html.includes("if(rawVolume()<=0){toast('请选择至少一件物品');return}"));
});
console.log('UX-PATCH A2',pass+'/8 PASS');
