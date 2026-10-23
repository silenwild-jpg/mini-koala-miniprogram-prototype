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

// A1.1 user decision supersedes the original A1 CTA and 3 m³ routing contract.
test('three S2 routes remain available, S3 has no bottom Next control',()=>{
 for(const name of ['known','ai','browse'])assert(html.includes('data-method="'+name+'"'));
 assert(!html.includes('id="amountQuickBtn"'));
 assert(!html.includes('id="amountActionBar"'));
 assert(!css.includes('ux-a1-next-actions'));
 assert(html.includes('id="startBlank"'));
 assert(Object.keys(X.sceneCfg).length===8);
});
test('24 real presets use displayed upper bound <5 with no whitelist',()=>{
 let count=0,short=0;
 for(const [scene,sc] of Object.entries(X.sceneCfg))for(const a of sc.amounts){
   X.state.flow='estimate';X.state.scene=scene;X.state.amount=a.id;X.applyPreset();const r=X.calc();
   const expected=r.raw>0&&r.max>=r.min&&r.min>=0&&Number(X.fmt(r.max))<5;
   assert.strictEqual(X.canQuickEstimate(scene,a.id,X.state.quantities),expected,`${scene}/${a.id}`);
   count++;short+=Number(expected);
 }
 assert.equal(count,24);assert(short>0&&short<count);console.log('ROUTE_24',JSON.stringify({direct:short,review:count-short}));
});
test('display precision around five cubic meters and invalid values',()=>{
 X.state.flow='estimate'; X.state.scene='moving';X.state.amount='single';X.applyPreset();
 const actual=context.calc;
 try{
  for(const [raw,max,expected] of [[1,4.74,true],[1,4.90,false],[1,4.95,false],[1,5,false],[1,5.1,false],[1,5.5,false],[0,4.0,false]]){
    context.calc=()=>({raw,target:raw,min:0.2,max});
    assert.strictEqual(X.canQuickEstimate('moving','single',X.state.quantities),expected,`max=${max}`);
  }
  context.calc=()=>({raw:1,target:1,min:0.2,max:NaN});assert(!X.canQuickEstimate('moving','single',X.state.quantities));
  context.calc=()=>({raw:1,target:1,min:-1,max:4});assert(!X.canQuickEstimate('moving','single',X.state.quantities));
 }finally{context.calc=actual;}
});
test('click tier immediately navigates short case to S5, long to S4',()=>{
 X.state.flow='estimate';X.state.scene='moving';X.state.amount=null;X.state.quantities={};context.route.length=0;
 X.renderAmounts();
 dom.cards.find(c=>c.dataset.id==='single').click();
 assert.deepEqual(context.route,[5]); assert.strictEqual(X.state.amount,'single'); assert.strictEqual(X.state.itemsConfirmed,false);
 context.route.length=0;X.renderAmounts();
 dom.cards.find(c=>c.dataset.id==='twobed').click();
 assert.deepEqual(context.route,[4]);assert.strictEqual(X.state.amount,'twobed');
});
test('click threshold 5 shown on screen goes item confirmation',()=>{
 X.state.flow='estimate';X.state.scene='moving';X.state.amount='onebed';X.applyPreset();
 const realCalc=context.calc;context.route.length=0;
 try{
   context.calc=()=>({raw:1,target:1,min:.5,max:4.95});
   X.renderAmounts();dom.cards.find(c=>c.dataset.id==='onebed').click();assert.deepEqual(context.route,[4]);
 }finally{context.calc=realCalc;}
});
test('keyboard selection, return to S3, and item-review status preserved',()=>{
 assert(html.includes("el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click();}}"));
 assert(html.includes('role="radiogroup"'));
 assert(html.includes('aria-checked="${state.amount===a.id}"'));
 assert(html.includes("function estimatorReviewStatus(){return state.itemsConfirmed?'items_reviewed':'preset_unreviewed'}"));
 assert(html.includes("const shortcut=state.flow==='estimate'&&state.amount&&!state.itemsConfirmed&&canQuickEstimate"));
 X.state.scene='luggage';X.state.amount=null;X.state.flow='estimate';context.route.length=0;X.renderAmounts();
 const card=dom.cards[0];assert.equal(typeof card.onkeydown,'function');
 card.onkeydown({key:'Enter',preventDefault(){card._prevented=true;}});
 assert(card._prevented);assert.deepEqual(context.route,[5]);X.renderAmounts();
 assert(dom.cards.some(c=>c.dataset.id===X.state.amount));
});
test('A1.1 scope: no changes to S4/S5 markup or S2 use-case layout',()=>{
 assert(css.includes('#s2')&&css.includes('#s3'));assert(!css.includes('#s4')&&!css.includes('#s5'));
 assert(!html.includes('PHASE3A_QUICK_PRESETS'));
 assert(html.includes('const quick=[1,3,6,12,36,60]'));
});
console.log('UX PATCH A1.1',passed+'/7 PASS');
