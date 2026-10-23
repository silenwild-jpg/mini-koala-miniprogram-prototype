const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html'),'utf8');
const source=fs.readFileSync(path.join(root,'prototype/mini_koala_estimator_item_fallback_p0_v1.js'),'utf8');
const support=fs.readFileSync(path.join(root,'prototype/mini_storage_global_support_v274.js'),'utf8');
assert.match(support,/itemPatch\.src='mini_koala_estimator_item_fallback_p0_v1\.js'/);
const definitions=html.slice(html.indexOf('const sceneCfg = {'),html.indexOf('let returnStoreContext'));
const model=html.slice(html.indexOf('function itemVol(id)'),html.indexOf('function renderEntry()'));

function node(){
  const listeners={};
  return {
    value:'',textContent:'',innerHTML:'',hidden:false,checked:false,placeholder:'',children:[],style:{},
    classList:{values:new Set(),add(x){this.values.add(x)},remove(x){this.values.delete(x)}},
    addEventListener(name,callback){(listeners[name]??=[]).push(callback)},
    emit(name){for(const callback of listeners[name]||[])callback({target:this})},
    click(){this.emit('click')},
    replaceChildren(){this.children=[]},appendChild(child){
      if(child.parent){const siblings=child.parent.children;const i=siblings.indexOf(child);if(i>=0)siblings.splice(i,1)}
      this.children.push(child);child.parent=this;
    },
    insertAdjacentElement(){},focus(){this.focused=true}
  };
}
function setup(scene,prepare=()=>{}){
  const nodes=new Map();const get=selector=>{
    if(!nodes.has(selector))nodes.set(selector,node());
    return nodes.get(selector);
  };
  const ctx={document:{querySelector:get,createElement:node,head:{appendChild(){}}},window:null,console};
  ctx.URLSearchParams=URLSearchParams;ctx.location={search:''};
  const storage=new Map();ctx.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
  ctx.window=ctx;
  vm.createContext(ctx);
  vm.runInContext(definitions+'\nthis.items=items;this.sceneItems=sceneItems;this.sceneCfg=sceneCfg;',ctx);
  ctx.state={scene,screen:4,flow:'estimate',quantities:{},variants:{},knownSize:5,preference:'balanced',complex:new Set(),usageTargetOverride:null};
  for(const [id,item] of Object.entries(ctx.items))ctx.state.variants[id]=Object.keys(item.variants)[0];
  ctx.currentLayout=()=>ctx.sceneItems[ctx.state.scene].default||ctx.sceneItems[ctx.state.scene][Object.keys(ctx.sceneItems[ctx.state.scene].presets)[0]];
  vm.runInContext(model,ctx);
  ctx.renderItems=()=>{};
  ctx.renderAmounts=()=>{};
  ctx.renderLive=()=>{get('#liveRange').textContent='约 0–0m³';get('#liveFloor').textContent='约需 0.5㎡'};
  ctx.renderUsage=()=>{
    if(ctx.state.usageTargetOverride==null)ctx.state.usageTargetOverride=Math.round(ctx.calc().target*2)/2;
    const r=ctx.effectiveRequirement();
    get('#usageRange').textContent=`约 ${ctx.fmt(r.min)}–${ctx.fmt(r.max)}m³`;
    get('#capacityValue').textContent=ctx.fmt(r.target);
    get('#usageMeta').textContent='根据刚才确认的物品估算';
  };
  ctx.itemCard=id=>`<article>${ctx.items[id].name}</article>`;
  ctx.bindItemControls=()=>{};
  ctx.invalidateUsageRequirement=()=>{};
  ctx.saveRequirementSnapshot=data=>data;
  ctx.toast=message=>ctx.lastToast=message;
  ctx.go=screen=>{ctx.state.screen=screen;get('#knownInput').value=String(ctx.state.knownSize)};
  prepare({ctx,get});
  vm.runInContext(source,ctx);
  return {ctx,get};
}

for(const [scene,query,id] of [['household','洗衣机','washer'],['moving','儿童推车','stroller']]){
  const {ctx,get}=setup(scene);
  get('#estSearch').value=query;get('#estSearch').emit('input');
  assert.ok(get('#estSearchResults').children.some(child=>child.textContent===ctx.items[id].name));
  get('#estSearchResults').children.find(child=>child.textContent===ctx.items[id].name).click();
  assert.equal(ctx.state.quantities[id],1,`${scene}: cross-scene item must be counted`);
  assert.match(get('#estExtraList').innerHTML,new RegExp(ctx.items[id].name));
  assert.ok(ctx.rawVolume()>0);
  assert.match(ctx.saveRequirementSnapshot({item_summary:'已有物品×2'}).item_summary,new RegExp(ctx.items[id].name+'×1'));
}
{
  const {ctx,get}=setup('household');
  get('#estCategory').value='appliances';get('#estCategory').emit('change');
  assert.ok(get('#estSearchResults').children.some(child=>child.textContent==='洗衣机'));
  assert.ok(!get('#estSearchResults').children.some(child=>child.textContent==='三人位沙发'));
  const seen=new Set();
  for(const category of ['furniture','appliances','containers','collections','business']){
    get('#estCategory').value=category;get('#estCategory').emit('change');
    for(const option of get('#estSearchResults').children)seen.add(option.textContent);
  }
  assert.equal(seen.size,Object.keys(ctx.items).length,'each catalog item must be browseable');
}
{
  const {ctx,get}=setup('luggage');
  assert.equal(ctx.sceneItems.luggage.presets.few.bag,0);
  assert.equal(ctx.sceneCfg.luggage.amounts.find(a=>a.id==='few').desc,'几个行李箱');
  const count=Object.values(ctx.sceneItems.luggage.presets.few).reduce((a,b)=>a+b,0);
  assert.equal(count,4,'2–4 箱包 preset must contain four bags');
  ctx.renderAmounts();
  const amount=ctx.sceneCfg.luggage.amounts.find(a=>a.id==='few');
  ctx.state.quantities={...ctx.sceneItems.luggage.presets.few};
  const r=ctx.calc();
  assert.equal(amount.range,`约 ${ctx.fmt(r.min)}–${ctx.fmt(r.max)}m³`);
  ctx.renderUsage();
  assert.equal(ctx.state.usageTargetOverride,r.target,'first usage step must preserve exact target');
  if(r.target<=.5)assert.equal(get('#capacityMinus').disabled,true,'minus must not increase a sub-0.5 estimate');
}
{
  const {ctx,get}=setup('moving');
  assert.equal(ctx.sceneCfg.moving.amounts.find(a=>a.id==='single').desc,'纸箱、行李和收纳箱');
  assert.equal(ctx.sceneItems.enterprise.presets.file.printer,0);
  ctx.state.quantities={...ctx.sceneItems.moving.presets.single};
  const r=ctx.calc();
  const range=`约 ${ctx.fmt(r.min)}–${ctx.fmt(r.max)}m³`;
  ctx.renderUsage();
  assert.equal(get('#usageRange').textContent,range,'confirmation and recommendation ranges must agree');
  assert.equal(get('#capacityValue').textContent,r.target.toFixed(1));
  assert.match(get('#usageMeta').textContent,/摆放余量/);
}
{
  function card(id){
    const el=node();el.itemId=id;el.className='kv';el.meta=node();
    el.querySelector=selector=>selector==='.meta'?el.meta:{dataset:{id}};
    return el;
  }
  const {get}=setup('renovation',({ctx,get})=>{
    ctx.state.amount='part';ctx.state.quantities={...ctx.sceneItems.renovation.presets.part};
    const layout=ctx.sceneItems.renovation.default;
    const first=get('#p1List'),second=get('#p2List'),more=get('#p3List'),chips=get('#p2Chips');
    for(const group of [first,second,more,get('#estExtraList')])group.querySelectorAll=()=>group.children;
    first.previousElementSibling=node();chips.previousElementSibling=node();
    chips.parentNode={insertBefore(){}};
    chips.querySelectorAll=()=>layout.p2.map(id=>({dataset:{id},style:{}}));
    ctx.renderItems=()=>{
      first.replaceChildren();second.replaceChildren();more.replaceChildren();
      for(const id of layout.p1)first.appendChild(card(id));
      for(const id of layout.p2.filter(id=>ctx.state.quantities[id]>0))second.appendChild(card(id));
      for(const id of layout.p3)more.appendChild(card(id));
    };
  });
  assert.deepEqual(get('#p1List').children.map(x=>x.itemId),['wardrobe','box','dining']);
  assert.deepEqual(get('#p2List').children.map(x=>x.itemId),['sofa3','bed180','fridge','washer']);
  assert.equal(get('#p1List').previousElementSibling.textContent,'已选物品 · 核对数量');
  assert.doesNotMatch(get('#p2List').children[0].meta.textContent,/当前约 0\.00/);
}
{
  const {ctx,get}=setup('collection');
  ctx.renderLive();
  assert.equal(get('#liveRange').textContent,'添加物品后显示');
  assert.equal(get('#liveFloor').textContent,'');
  get('#estCustomToggle').click();
  get('#estCustomName').value='装裱画框';
  get('#estLength').value='180';get('#estLength').emit('input');
  get('#estWidth').value='80';get('#estHeight').value='10';get('#estCustomQty').value='2';
  get('#estCustomSave').click();
  const id=Object.keys(ctx.items).find(key=>key.startsWith('est_custom_'));
  assert.equal(ctx.items[id].long,true);
  assert.equal(ctx.state.quantities[id],2);
  assert.ok(Math.abs(ctx.rawVolume()-.288)<1e-8);
  assert.match(get('#estExtraList').innerHTML,/装裱画框/);
  assert.equal(get('#estCustomForm').hidden,true);
}
{
  const {ctx,get}=setup('enterprise');
  get('#estCustomToggle').click();get('#estCustomName').value='无尺寸设备';
  get('#estCustomSave').click();
  assert.match(get('#estCustomError').textContent,/请填写/);
  assert.equal(ctx.rawVolume(),0);
  get('#estKnownRoute').click();
  assert.equal(ctx.state.flow,'known');
  assert.equal(ctx.state.screen,7);
  assert.equal(get('#knownInput').value,'');
}
console.log('estimator item fallback P0: pass');
