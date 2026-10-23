/* EST-VIS-09 independent source/asset/runtime contract check. No browser or network. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html'),'utf8');
function between(a,b){const i=html.indexOf(a);assert(i!==-1,a);const j=html.indexOf(b,i+a.length);assert(j!==-1,b);return html.slice(i,j)}
const snippet=between('const items = {','const sceneItems = {')+'\n'+between('const ITEM_ICON_SAMPLE_V1 = {','function itemCard(')+'\n;globalThis.DATA={items,ITEM_ICON_SAMPLE_V1};';
const ctx={};vm.runInNewContext(snippet,ctx);const {items,ITEM_ICON_SAMPLE_V1:map}=ctx.DATA;
const p=path.join(root,'assets/item-icons/full45-trial');const asset=JSON.parse(fs.readFileSync(path.join(p,'ASSET_MANIFEST.json'),'utf8'));
let variants=0,keys=new Set();assert.equal(Object.keys(items).length,40);assert.equal(Object.keys(map).length,40);
for(const [id,it] of Object.entries(items)){
 assert.deepEqual(Object.keys(map[id]).sort(),Object.keys(it.variants).sort(),`Invalid variant ID for ${id}`);
 for(const vid of Object.keys(it.variants)){const key=map[id][vid];assert(fs.existsSync(path.join(p,key+'.webp')));variants++;keys.add(key)}
}
assert.equal(variants,51);assert.equal(keys.size,44);assert.deepEqual(JSON.parse(JSON.stringify(map)),asset.mapping);
assert.equal(fs.readdirSync(p).filter(x=>x.endsWith('.webp')).length,45);
const fn=between('function itemCard(id,priority){','function bindItemControls(root){');
const state={variants:{},quantities:{}};for(const [id,it]of Object.entries(items))state.variants[id]=Object.keys(it.variants)[0];
const caseCtx={state};vm.runInNewContext(snippet+'\nfunction itemVol(id){return items[id].variants[state.variants[id]].vol*(state.quantities[id]||0)}\n'+fn+'\nglobalThis.itemCardRun=itemCard;',caseCtx);
let cases=0;
for(const [id,it] of Object.entries(items))for(const vid of Object.keys(it.variants))for(const q of [0,1,12,99]){
 state.variants[id]=vid;state.quantities[id]=q;
 const card=caseCtx.itemCardRun(id,'p1');
 assert(card.includes('/'+map[id][vid]+'.webp'),`Wrong photo ${id}/${vid}`);
 assert(card.includes(it.name)&&card.includes(it.meta)&&card.includes('当前约 '));
 assert.equal(/data-act="minus"[^>]*disabled/.test(card),q===0);
 assert.equal(/data-act="plus"[^>]*disabled/.test(card),q===99);
 assert(card.includes('class="item-media"')&&!card.includes('estvis06-thumb'));
 cases++;
}
state.variants.sofa3='std';state.quantities.sofa3=1;assert(caseCtx.itemCardRun('sofa3','p1').includes('当前约 1.60m³'));
state.variants.sofa3='double';assert(caseCtx.itemCardRun('sofa3','p1').includes('当前约 1.15m³'));
state.variants.sofa3='single';assert(caseCtx.itemCardRun('sofa3','p1').includes('当前约 0.60m³'));
const guard=fs.readFileSync(path.join(root,'prototype/est_vis06_s4_s5_visual.js'),'utf8');assert(guard.includes("row.querySelector('.item-media, .item-compact-media')"));
const result={PASS:true,items:40,variants:51,assets:45,unique_mapped_images:44,render_cases:cases,legacy_thumbnail_guard:true,release_gate:'HOLD'};
console.log(JSON.stringify(result,null,2));
