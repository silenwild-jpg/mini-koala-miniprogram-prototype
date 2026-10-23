const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const patch=fs.readFileSync('prototype/mini_koala_acceptance_v11_state_patch.js','utf8');
const html=fs.readFileSync('prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html','utf8');
const model=html.slice(html.indexOf('function usageActionModel('),html.indexOf('function renderUsage(){'));
const m={};vm.runInNewContext(model,m);
let callback;const classes=new Set();let attrs={};
const button={textContent:'',classList:{add:(...xs)=>xs.forEach(x=>classes.add(x)),remove:(...xs)=>xs.forEach(x=>classes.delete(x))},setAttribute:(k,v)=>attrs[k]=v};
const actions={dataset:{actionState:'term-required'},querySelector:()=>button};
const document={getElementById:id=>id==='usageActions'?actions:null};
class MutationObserver{constructor(fn){callback=fn}observe(){}}
const cases=[{term:0,fallback:false,label:'先选择租期 ›',action:'select-term',secondary:''},
 {term:6,fallback:false,label:'查看推荐仓位',action:'recommended-unit',secondary:'顾问协助'},
 {term:6,fallback:true,label:'顾问协助',action:'advisor',secondary:'调整需求'},
 {term:0,fallback:false,label:'先选择租期 ›',action:'select-term',secondary:''}];
vm.runInNewContext(patch,{document,location:{pathname:'/prototype/space_decision_assistant_test.html',search:''},URLSearchParams,MutationObserver});
for(const c of cases){
 const a=m.usageActionModel(c.term,c.fallback,'三元桥店');
 actions.dataset.actionState=a.state;button.textContent=a.primary;
 classes.clear();classes.add('cta');callback();
 assert.equal(button.textContent,c.label);assert.equal(a.primaryAction,c.action);assert.equal(a.secondary,c.secondary);
 assert.equal(classes.has('term-required-action'),!c.term);assert.equal(classes.has('secondary'),!c.term);
 console.log('PASS patched state:',a.state,button.textContent,c.action);
}
assert(html.includes("$('#usageChooseBtn').onclick=recommendationSet.fallback?requestAdvisor:continueToRecommendedUnit;"));
assert(html.includes("$('#usageAdvisorBtn').onclick=recommendationSet.fallback?adjustDemand:requestAdvisor;"));
assert(html.includes("$('#usageChooseBtn').onclick=()=>{document.querySelector('#termChips').scrollIntoView"));
const layout=fs.readFileSync('prototype/mini_koala_acceptance_v11_layout_patch.js','utf8');
const css=fs.readFileSync('prototype/mini_koala_acceptance_v11_layout_patch.css','utf8');
const support=fs.readFileSync('prototype/mini_storage_global_support_v274.js','utf8');
assert(!css.includes('mkd-inline-support'));assert(!layout.includes("support.classList.add('mkd-inline-support')"));
assert(support.includes('position:fixed;right:'));assert(support.includes("float.classList.toggle('expanded')"));
assert(support.includes("location.href='tel:4000358805'"));assert(support.includes('openCustomerServiceChat'));
console.log('PASS original floating support styles/contact actions retained; PATCH D no longer relocates help');
console.log('RESULT: 4 state cases + action bindings + help rollback PASS; not browser E2E');
