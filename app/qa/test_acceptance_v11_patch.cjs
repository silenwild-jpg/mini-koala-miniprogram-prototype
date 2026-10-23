/* V1.1 focused static + isolated DOM-contract regression.
   No browser availability is implied by these tests. */
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const dir=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(dir,p),'utf8');
const patch=read('prototype/mini_koala_acceptance_v11_state_patch.js');
const global=read('prototype/mini_storage_global_support_v274.js');
const fixture=read('prototype/mini_storage_demo_fixture_v2.js');
const hub=read('prototype/product_demo_hub_v1.html');
const s01=read('prototype/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html');
const q01=read('prototype/mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html');
const est=read('prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html');
assert(global.includes("mini_koala_acceptance_v11_state_patch.js"));
assert(global.includes("mini_koala_acceptance_v11_state_patch.css"));
assert(hub.includes('data-s01="soldout"')&&hub.includes('data-q01="expired"'));
assert(fixture.includes('function q01(mode='));
assert(s01.includes('id="inventorySecondary"')&&s01.includes('inventoryScenario'));
assert(q01.includes('id="edit"')&&q01.includes('id="save"'));
assert(est.includes('id="usageActions"'));
for(const p of ['prototype/mini_koala_acceptance_v11_state_patch.js','prototype/mini_storage_global_support_v274.js','prototype/mini_storage_demo_fixture_v2.js','prototype/mini_storage_inventory_urgency_v1.js'])execFileSync('node',['--check',path.join(dir,p)]);
console.log('PASS P-A-01: addon connected; frozen body entrypoints intact; JavaScript parses');

function element(initialText=''){
  const classes=new Set();
  const e={textContent:initialText,innerHTML:'',hidden:false,disabled:false,attributes:{},
    classList:{add:(...xs)=>xs.forEach(x=>classes.add(x)),contains:x=>classes.has(x)},
    setAttribute:(k,v)=>e.attributes[k]=v,
    addEventListener:(name,fn)=>e['on'+name]=fn,
    querySelector:()=>null,
    insertBefore:function(child){this.child=child},
  };
  return e;
}
function runQuote(search,saveQuote){
  const edit=element('继续下单'),save=element('保存方案'),role=element('稍后继续也方便'),hero=element(),body=element();
  const elements={edit,save,quoteRoleLabel:role};
  const document={body,querySelector:s=>s==='.hero'?hero:null,getElementById:id=>elements[id]||null,
    createElement:()=>element()};
  const store=new Map([['mini_storage_quote_current',JSON.stringify(saveQuote||{})],['mini_storage_price_snapshot_current','OLD_SNAPSHOT']]);
  const localStorage={getItem:k=>store.get(k)||null,removeItem:k=>store.delete(k)};
  const location={pathname:'/prototype/mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html',search,href:''};
  vm.runInNewContext(patch,{document,location,localStorage,URLSearchParams,Date,Number,MutationObserver:class{}},{timeout:1000});
  return {edit,save,body,hero,location,store};
}
const params='store=MK_BJ_2CDB7BEE&unit=BJ0112S01A009&target=4.8&term=6&monthly=573&rentTotal=3440&deposit=573&managementFee=50';
const exp=runQuote('?'+params+'&quoteStatus=expired');
assert.equal(exp.edit.textContent,'重新获取报价');
assert.equal(exp.save.disabled,true);
assert(exp.body.classList.contains('mini-v11-quote-expired'));
assert(exp.hero.child?.innerHTML.includes('重新获取当前报价'));
exp.edit.onclick();
assert(exp.location.href.includes('mini_storage_unit_detail_u01'));
assert(exp.location.href.includes('source=q01_quote_expired'));
assert(!exp.location.href.includes('monthly=')&&!exp.location.href.includes('rentTotal='));
assert(!exp.store.has('mini_storage_price_snapshot_current'));
console.log('PASS P-A-02: explicit expired status blocks old checkout and returns to repricing without stale sums');
const active=runQuote('?'+params+'&quoteStatus=active');
assert.equal(active.edit.textContent,'继续下单');assert(!active.save.disabled);
console.log('PASS P-A-03: active quote checkout remains untouched');
const old=runQuote('?'+params+'&quoteStatus=active',{store_id:'MK_BJ_2CDB7BEE',unit_id:'BJ0112S01A009',term_months:6,valid_until:'2020-01-01T00:00:00Z'});
assert(old.body.classList.contains('mini-v11-quote-expired'));
console.log('PASS P-A-04: actual stale valid_until is also recognized');

// Simulated S01 document: assert that injected sold-out banner reflects the
// existing secondary listing and that it does not appear in standard browsing.
function runSoldout(scenario){
  const strip=element(),stores=element(),secondary=element(),body=element();
  body.classList.add('v274-browse-state');
  const button=element();const heading=element();
  const dataName=element('国展店 · 所属小区');
  const card={querySelector:s=>s==='.inventory-status-name'?dataName:null};
  const nodeMap={estimateStrip:strip,storeList:stores,inventorySecondary:secondary};
  const document={body,getElementById:id=>nodeMap[id]||null,
    querySelector:s=>s.includes('.inventory-status-card')?card:null,
    createElement:()=>{const box=element();box.querySelector=s=>s==='button'?button:s==='strong'?heading:null;return box;}};
  stores.ownerDocument=document;
  strip.insertAdjacentElement=(pos,newNode)=>{strip.notice=newNode};
  const location={pathname:'/prototype/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html',search:`?state=browse${scenario?'&inventoryScenario=soldout':''}`};
  class MutationObserver {observe() {}}
  vm.runInNewContext(patch,{document,location,URLSearchParams,MutationObserver,window:{__s01ZeroMatch:false}},{timeout:1000});
  return {banner:strip.notice,heading,button};
}
assert.equal(runSoldout(true).banner.hidden,false);
assert.equal(runSoldout(false).banner.hidden,true);
console.log('PASS P-A-05: S01 sold-out state is explicitly visible; normal browsing is unaffected');
assert(read('prototype/mini_storage_inventory_urgency_v1.js').includes('（分:秒）'));
assert(patch.includes('最近门店')&&patch.includes('暂未'));
assert(patch.includes('term-required-action'));
console.log('PASS P-A-06: recovery copy, term guidance and countdown clarity have additive guards');
console.log('RESULT: 6/6 focused checks passed (not a browser screenshot acceptance)');
