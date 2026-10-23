const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const path=require('path');

const root=path.resolve(__dirname,'..');
const prototype=path.join(root,'prototype');
const nodes=new Map();
function node(selector){
  if(nodes.has(selector))return nodes.get(selector);
  const classes=new Set();
  const current={
    textContent:'',innerHTML:'',value:'',hidden:false,style:{},dataset:{},open:false,
    classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x),contains:x=>classes.has(x)},
    querySelector:s=>node(`${selector} ${s}`),querySelectorAll:()=>[],
    scrollIntoView(){},addEventListener(){},setAttribute(){},focus(){},closest(){return current;}
  };
  nodes.set(selector,current);
  return current;
}
const document={querySelector:node,querySelectorAll:()=>[],body:node('body'),head:node('head')};
const location={search:'?store=jianguo&state=browse&source=s01',href:''};
const localStorage={getItem:()=>null,setItem:()=>{}};
const context={window:null,document,location,localStorage,URLSearchParams,Date,Math,JSON,String,Number,Array,Object,Boolean,Error,setTimeout:()=>0,clearTimeout:()=>{},console};
context.window=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(prototype,'mini_storage_business_ssot_v274.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'data','mini_koala_data.js'),'utf8'),context);

const s02=fs.readFileSync(path.join(prototype,'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html'),'utf8');
const scripts=[...s02.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1]);
assert.equal(scripts.length,1);
assert.doesNotThrow(()=>vm.runInContext(scripts[0],context),'S02 main script must initialize');
assert(node('#unitList').innerHTML.includes('unit-card'),'S02 must render warehouse unit cards');
assert(node('#unitList').innerHTML.includes('仓位 '),'S02 unit cards must show a unit identifier');
assert.equal(typeof node('#browseEstimator').onclick,'function','estimate entry must be interactive');
node('#browseEstimator').onclick();
assert(location.href.includes('space_decision_assistant'),'estimate entry must navigate to estimator');
assert.equal(new URLSearchParams(location.href.split('?')[1]||'').get('entry'),null,'estimate entry must open estimator home without forcing a scene');

const estimator=fs.readFileSync(path.join(prototype,'space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html'),'utf8');
assert(estimator.includes('sourceProfile.store_name'),'recommendation cards must adapt generated store_name');
assert(estimator.includes('sourceProfile.district'),'recommendation cards must adapt generated store location');

console.log('PASS V2.7.4.12: recommendation store name, S02 inventory rendering, and estimate-entry navigation');
