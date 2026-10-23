const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const ROOT=process.argv[2];const html=fs.readFileSync(path.join(ROOT,'prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html'),'utf8');
const cut=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i+a.length);assert(i>=0&&j>i,`slice ${a}`);return html.slice(i,j)};
const definitions=cut('const sceneCfg = {','const ITEM_ICON_SAMPLE_V1 = {');
const mapdef=cut('const ITEM_ICON_SAMPLE_V1 = {','function itemCard(');
const realFns=cut('function itemVol(id){','function renderEntry(){');
const itemCard=cut('function itemCard(id,priority){','function bindItemControls(root){');
const uiGate=cut('function usageActionModel(term, fallback, selectedStoreName){','function renderUsage(){');
const ctx={state:null};vm.createContext(ctx);
vm.runInContext(definitions+'\n'+mapdef+'\n'+realFns+'\n'+itemCard+'\n'+uiGate+'\nglobalThis.M={items,sceneCfg,sceneItems,preferenceCfg,ITEM_ICON_SAMPLE_V1,state,itemVol,rawVolume,efficiency,calc,itemCard,usageActionModel,currentLayout,applyPreset,invalidateUsageRequirement,fmt};',ctx);
const M=ctx.M;const item=JSON.parse(JSON.stringify(M.items));const scene=JSON.parse(JSON.stringify(M.sceneCfg));const scenes=JSON.parse(JSON.stringify(M.sceneItems));const map=JSON.parse(JSON.stringify(M.ITEM_ICON_SAMPLE_V1));
assert.equal(Object.keys(scene).length,8);assert.equal(Object.keys(item).length,40);const amountList=Object.entries(scene).map(([id,s])=>({scene:id,name:s.name,count:s.amounts.length,choices:s.amounts.map(a=>a.id)}));
const amountCount=amountList.reduce((s,x)=>s+x.count,0);assert.equal(amountCount,24);
let presetCases=0,allPresetNames=new Set();for(const [id,cfg] of Object.entries(scenes)){
  const sc=scene[id];assert(sc,`scene missing ${id}`);const presets=cfg.presets;assert(presets);
  for(const a of sc.amounts){assert(a.id in presets,`${id}/${a.id} missing preset`);for(const [iid,count] of Object.entries(presets[a.id])){assert(iid in item,`${id}/${a.id} unknown ${iid}`);assert(Number.isInteger(count)&&count>=0&&count<=99,`${id}/${a.id} invalid q for ${iid}`)} presetCases++;}
  for(const [tier,layout] of Object.entries(cfg)){
    if(tier==='presets')continue;
    for(const key of ['p1','p2','p3']){assert(Array.isArray(layout[key]));for(const iid of layout[key])assert(iid in item,`${id}/${tier}/${key} invalid ${iid}`)}
  }
}
ctx.state=M.state;Object.assign(ctx.state,{flow:'estimate',scene:'moving',screen:4,quantities:{},variants:{},complex:new Set(),preference:'balanced',addedP2:new Set(),usageTargetOverride:null,term:null});for(const [iid,it] of Object.entries(item))ctx.state.variants[iid]=Object.keys(it.variants)[0];
let calcCases=0,cardCases=0,images=new Set(),rangeIssues=[];const eps=1e-9;
for(const [iid,it] of Object.entries(item))for(const [vid,v] of Object.entries(it.variants)){
  ctx.state.variants[iid]=vid;
  ctx.state.quantities={};
  for(const q of [0,1,2,12,99]){
    ctx.state.quantities[iid]=q;
    assert(Math.abs(M.itemVol(iid)-q*v.vol)<eps,`${iid}/${vid}/${q} volume`);
    assert(Math.abs(M.rawVolume()-q*v.vol)<eps,`${iid}/${vid}/${q} raw`);
    const r=M.calc();assert(Math.abs(r.raw-q*v.vol)<eps,`${iid}/${vid}/${q} calc raw`);if(!(r.target>=0&&r.min>=0&&r.max>=0&&r.min<=r.max))rangeIssues.push({id:iid,variant:vid,quantity:q,raw:r.raw,target:r.target,min:r.min,max:r.max});calcCases++;
    const out=M.itemCard(iid,'p1');const key=map[iid][vid];assert(out.includes(key+'.webp'),`${iid}/${vid}/${q} image`);
    assert(out.includes(`当前约 ${(q*v.vol).toFixed(2)}m³`),`${iid}/${vid}/${q} current total display`);
    assert(out.includes(it.name)&&out.includes(it.meta));
    assert.equal(/data-act="minus"[^>]*disabled/.test(out),q===0,`${iid}/${vid}/${q} minus`);
    assert.equal(/data-act="plus"[^>]*disabled/.test(out),q===99,`${iid}/${vid}/${q} plus`);
    assert.equal((out.match(/class="item-media"/g)||[]).length,1,`${iid}/${vid}/${q} duplicate image containers`);
    assert(!out.includes('m³/件'),`legacy per-piece label ${iid}/${vid}/${q}`);
    images.add(key);cardCases++;
  }
}
assert.equal(images.size,44);
assert.equal(rangeIssues.length,0,`EST-SEM-01 negative or invalid range: ${JSON.stringify(rangeIssues)}`);
const sceneRangeReview=[];
for(const [sceneId,cfg] of Object.entries(scenes)){
 ctx.state.scene=sceneId;
 for(const [tier,preset] of Object.entries(cfg.presets)){
   ctx.state.amount=tier;M.applyPreset();
   assert.deepEqual(JSON.parse(JSON.stringify(ctx.state.quantities)),preset,`${sceneId}/${tier} preset applied`);
   let raw=0;for(const [id,q] of Object.entries(preset))raw+=q*item[id].variants[ctx.state.variants[id]].vol;
   assert(Math.abs(M.rawVolume()-raw)<eps,`${sceneId}/${tier} sum`);
   assert(M.calc().target>=M.rawVolume()||M.rawVolume()===0,`${sceneId}/${tier} target >= raw`); const a=scene[sceneId].amounts.find(x=>x.id===tier); const c=M.calc();sceneRangeReview.push({scene:sceneId,tier,label:a?.title,displayed_hint:a?.range||'',computed_example:`约 ${M.fmt(c.min)}–${M.fmt(c.max)}m³`,computed_min_m3:m3(c.min),computed_max_m3:m3(c.max),raw:m3(raw)});
 }
}
const alertCases=[];
for(const q of sceneRangeReview){
 if(!q.displayed_hint)continue;
 const m=q.displayed_hint.match(/约\s*([\d.]+)[–-]([\d.]+)m³/);assert(m,`bad hint ${q.scene}/${q.tier}`);
 const middle=(Number(m[1])+Number(m[2]))/2;
 const actual=(q.computed_min_m3+q.computed_max_m3)/2;
 const drift=Math.abs(middle-actual)/middle;
 if(drift >= .20)alertCases.push({scene:q.scene,tier:q.tier,drift});
}
assert.equal(alertCases.length,0,`EST-SEM-02 hint drift cases: ${JSON.stringify(alertCases)}`);
for(const id of Object.keys(item))ctx.state.variants[id]=Object.keys(item[id].variants)[0];ctx.state.quantities={};ctx.state.scene='moving';
const termNull=M.usageActionModel(null,false,'');assert(termNull.state==='term-required' && termNull.showStores===false && termNull.primaryAction==='select-term');
for(const t of [undefined,null,0])assert(M.usageActionModel(t,false,'').state==='term-required');
assert.equal(M.usageActionModel(6,true,'').state,'nomatch');assert.equal(M.usageActionModel(6,false,'').state,'matched');
assert(html.includes('const quick=[1,3,6,12,36,60]'));assert(html.includes('min="1" max="60"'));assert(html.includes('state.term=null'));
assert(html.includes("if(!state.term){\n    $('#usageActions').dataset.actionState='term-required';"));
assert(html.includes("$('#r113PlanCards').innerHTML='<div class=\"smallnote\">请选择租期后查看推荐仓位和整期租金。</div>'"));
assert(html.includes("returnTo==='S02'||params.get('source')==='store_detail'"));assert(html.includes("returnTo==='S01'||params.get('source')==='store_list'"));
assert(html.includes("params.get('requireTerm')==='1'?null"));
assert(html.includes("source:'ESTIMATOR_USAGE_TO_S01'"));
function m3(v){return Number(v.toFixed(3))}
const result={scene_range_review:sceneRangeReview,status:'PASS',scene_count:8,scene_choices:amountCount,scene_details:amountList,validated_presets:presetCases,item_count:40,variant_count:51,image_keys_used:images.size,real_source_calc_cases:calcCases,real_source_item_card_cases:cardCases,term_empty_gate:'PASS',term_range_and_quick_values:'SOURCE_CHECK',return_protocol:'SOURCE_CHECK',range_issue_count:rangeIssues.length,range_issue_examples:rangeIssues.slice(0,12),range_issues_all:rangeIssues,visual_browser:'NOT_TESTED',release_gate:'HOLD'};
console.log(JSON.stringify(result,null,2));
