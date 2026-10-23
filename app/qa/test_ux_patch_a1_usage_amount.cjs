const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html'),'utf8');
const css=fs.readFileSync(path.join(root,'prototype/ux_patch_a1_usage_amount.css'),'utf8');
let passed=0;function test(name,fn){fn();passed++;console.log('PASS',name)}
const pick=(begin,end)=>{const i=html.indexOf(begin),j=html.indexOf(end,i+begin.length);assert(i>=0&&j>i,begin);return html.slice(i,j)};
class El{
 constructor(id){this.id=id;this.dataset={};this.style={};this.attributes={};this.disabled=false;this.focused=false;this.textContent='';this._html='';this.visible=true;}
 set innerHTML(value){this._html=value;if(this.id==='amountList'){dom.cards=[...value.matchAll(/class="amount-card [^"]*" data-id="([^"]+)"/g)].map(m=>{const e=new El('card');e.dataset.id=m[1];return e;});}}
 get innerHTML(){return this._html;}
 setAttribute(k,v){this.attributes[k]=v;}
 focus(){this.focused=true;}
 click(){if(this.disabled)return;if(this.onclick)this.onclick();}
}
const dom={elements:{},cards:[],scenes:[]};
const el=s=>dom.elements[s] ||=new El(s.replace('#',''));
const document={querySelector:el,querySelectorAll(q){if(q==='#amountList .amount-card')return dom.cards;if(q==='#s2 .scene')return dom.scenes;return[];}};
const context={document,console,setTimeout:(f)=>f(),clearTimeout:()=>{}};vm.createContext(context);
vm.runInContext(pick('const sceneCfg = {','// EST-VIS-09: ITEM-VIS-08 image mapping')+'\nglobalThis.A1={sceneCfg,sceneItems,items,state,applyPreset,calc,fmt,canQuickEstimate,renderAmounts,renderScenes};',context);
const X=context.A1;context.route=[];context.go=n=>context.route.push(n);
test('S2 three alternative entries and one-line scene texts',()=>{
 for(const name of ['known','ai','browse'])assert(html.includes('data-method="'+name+'"'));
 assert(html.includes('choice[data-entry=\\"${button.dataset.method}\\"]')||html.includes('choice[data-entry="${button.dataset.method}"]'));
 assert(!html.includes('id="switchEstimateMethod"'));
 assert(Object.keys(X.sceneCfg).length===8);
 assert(Object.values(X.sceneCfg).reduce((n,x)=>n+x.amounts.length,0)===24);
 for(const [k,v]of Object.entries({moving:'换房过渡、物品暂存',renovation:'装修腾房、家具家电',luggage:'箱包、行李临时存放',seasonal:'衣物被褥、换季用品',household:'家里的闲置物品',collection:'球鞋、手办、乐器',merchant:'商家备货、库存物料',enterprise:'档案、办公家具、设备'}))assert(html.includes(k+":'"+v+"'"));
 assert(css.includes('white-space:nowrap!important')&&css.includes('text-overflow:ellipsis!important'));
});
test('S3 single CTA without mandatory item-review controls',()=>{
 assert(html.includes('id="amountQuickBtn" disabled>下一步</button>'));
 for(const old of ['id="amountReviewBtn"','id="amountQuickInfo"','含家具或长件，请先核对物品数量。','PHASE3A_QUICK_PRESETS'])assert(!html.includes(old),old);
 assert(html.includes('id="startBlank"'));
});
test('24 actual presets use displayed max rather than old whitelist',()=>{
 let cases=0,shortcuts=0;
 for(const [scene,sc] of Object.entries(X.sceneCfg))for(const amount of sc.amounts){
  X.state.scene=scene;X.state.amount=amount.id;X.applyPreset();const r=X.calc();
  const expected=r.raw>0&&r.max>=r.min&&r.min>=0&&Number(X.fmt(r.max))<3;
  assert.strictEqual(X.canQuickEstimate(scene,amount.id,X.state.quantities),expected,`${scene}/${amount.id}`);
  shortcuts+=Number(expected);cases++;
 }
 assert.equal(cases,24);assert(shortcuts>0&&shortcuts<24);
 X.state.scene='moving';X.state.amount='single';X.applyPreset();assert(X.canQuickEstimate('moving','single',X.state.quantities),'small moving furniture cannot be blocked');
 X.state.scene='collection';X.state.amount='mid';X.applyPreset();assert(X.canQuickEstimate('collection','mid',X.state.quantities),'long-item preset cannot be blanket blocked');
});
test('2.9 / 3.0 / 3.1 and invalid boundary cases',()=>{
 X.state.scene='moving';X.state.amount='single';X.applyPreset();
 const actual=context.calc;
 try{
  for(const [raw,max,expected] of [[1,2.90,true],[1,2.94,true],[1,2.96,false],[1,3,false],[1,3.10,false],[0,2.9,false]]){
   context.calc=()=>({raw,target:raw,min:0.2,max});
   assert.equal(X.canQuickEstimate('moving','single',X.state.quantities),expected,`upper ${max}`);
  }
  context.calc=()=>({raw:1,target:1,min:0.2,max:NaN});assert(!X.canQuickEstimate('moving','single',X.state.quantities));
 }finally{context.calc=actual;}
});
test('selected tier stays in S3 until Next button and routes appropriately',()=>{
 X.state.scene='moving';X.state.amount=null;X.state.quantities={};context.route.length=0;
 X.renderAmounts();const next=el('#amountQuickBtn');assert(next.disabled);
 dom.cards.find(c=>c.dataset.id==='single').click();assert.deepEqual(context.route,[]);
 assert.equal(X.state.amount,'single');assert(!next.disabled);assert(!X.state.itemsConfirmed);
 next.click();assert.deepEqual(context.route,[5]);assert(!X.state.itemsConfirmed);
 context.route.length=0;
 dom.cards.find(c=>c.dataset.id==='onebed').click();assert.deepEqual(context.route,[]);
 next.click();assert.deepEqual(context.route,[4]);
});
test('S2 controls are keyboard accessible and flow remains estimate for scene click',()=>{
 assert(html.includes("el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click();}}"));
 assert(html.includes("state.flow='estimate';"));
 assert(html.includes('role="radiogroup"'));
 assert(html.includes('aria-checked="${state.amount===a.id}"'));
});
test('A1 edits remain scoped; no changes to S4/S5 markup or business terms',()=>{
 assert(css.includes('#s2')&&css.includes('#s3'));assert(!css.includes('#s4')&&!css.includes('#s5'));
 assert(html.includes('function estimatorReviewStatus(){return state.itemsConfirmed?\'items_reviewed\':\'preset_unreviewed\'}'));
 assert(html.includes('const quick=[1,3,6,12,36,60]'));
});
console.log('UX PATCH A1',passed+'/7 PASS');
