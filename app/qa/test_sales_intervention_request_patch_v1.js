const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const patch=fs.readFileSync(path.join(root,'prototype/mini_koala_sales_intervention_patch_v1.js'),'utf8');
const support=fs.readFileSync(path.join(root,'prototype/mini_storage_global_support_v274.js'),'utf8');
assert.match(support,/salesPatch\.src='mini_koala_sales_intervention_patch_v1\.js'/);

function element(){
  const listeners={};
  return {
    textContent:'',value:'',hidden:false,open:false,style:{},attributes:{},
    classList:{items:new Set(),add(name){this.items.add(name)},remove(name){this.items.delete(name)}},
    addEventListener(name,fn){(listeners[name]??=[]).push(fn)},
    click(){const event={stopImmediatePropagation(){this.stopped=true}};for(const fn of listeners.click||[]){fn(event);if(event.stopped)break}},
    setAttribute(name,value){this.attributes[name]=value},focus(){this.focused=true},
    append(...children){this.children=(this.children||[]).concat(children)},
    querySelector(){return this.summary||this.body}
  };
}
function harness(page,selectors){
  const nodes=Object.fromEntries(selectors.map(selector=>[selector,element()]));
  const data=new Map();const messages=[];
  const context={
    location:{pathname:`/prototype/mini_storage_${page}_v1.html`},
    document:{querySelector:selector=>nodes[selector]||null,createElement:()=>element(),head:{appendChild(){}}},
    localStorage:{getItem:key=>data.get(key)||'',setItem:(key,value)=>data.set(key,value)},
    window:null,Date,JSON,String,
    toast:message=>messages.push(message),
    maskPhone:value=>`${value.slice(0,3)}****${value.slice(-4)}`,
    leadPhone:()=>data.get('mini_storage_lead_phone')||'',
    leadStorageSet:(key,value)=>data.set(key,value),
    leadClose:()=>nodes['#leadMask'].classList.remove('show')
  };
  context.window=context;
  vm.createContext(context);
  return {nodes,data,messages,context,run:()=>vm.runInContext(patch,context)};
}

for(const page of ['store_list_s01','store_detail_s02']){
  const h=harness(page,['#leadWxBtn','.lead-note','#leadModalTitle','#leadModalDesc','#leadSkipBtn','#leadPhoneInput','#leadMask','#nomatchAdvisor']);
  h.data.set('mini_storage_lead_phone','13912345678');
  h.run();
  let callbacks=0;
  h.context.openLeadCapture({node:'S01_NO_MATCH',context:{state:'nomatch'},onSuccess:()=>callbacks++});
  assert.equal(callbacks,0,`${page}: opening must not submit`);
  assert.equal(h.nodes['#leadMask'].classList.items.has('show'),true);
  assert.match(h.nodes['#leadWxBtn'].textContent,/139\*\*\*\*5678/);
  h.nodes['#leadWxBtn'].click();
  assert.equal(callbacks,1);
  assert.equal(h.data.get('mini_storage_lead_phone'),'13912345678');
  const request=JSON.parse(h.data.get('mini_storage_lead_context'));
  assert.equal(request.status,'PENDING');
  assert.equal(request.state,'nomatch');
  assert.ok(request.submitted_at);
  assert.equal(h.messages.at(-1),'已提交选仓顾问协助需求');
}

{
  const h=harness('store_list_s01',['#leadWxBtn','.lead-note','#leadModalTitle','#leadModalDesc','#leadSkipBtn','#leadPhoneInput','#leadMask']);
  h.run();
  h.context.openLeadCapture({node:'S01_ZERO_MATCH',allowSkip:true});
  assert.equal(h.nodes['#leadModalTitle'].textContent,'顾问协助继续查找');
  h.nodes['#leadSkipBtn'].click();
  assert.equal(h.data.has('mini_storage_lead_context'),false,'skip must not submit');
  h.context.openLeadCapture({node:'S01_NO_MATCH'});
  h.context.finishLeadCapture('13700001234');
  assert.equal(JSON.parse(h.data.get('mini_storage_lead_context')).status,'PENDING');
}

{
  const h=harness('quote_q01',['#contactSection','#contactHint','#phone']);
  const section=h.nodes['#contactSection'];
  section.summary=element();section.body=element();
  section.querySelector=selector=>selector==='summary b'?section.summary:section.body;
  h.nodes['#phone'].value='13800138000';
  h.context.qid='Q-DEMO';h.context.storeId='jianguo';h.context.representativeUnitNo='C008';
  h.context.sizeOptionId='S-8';h.context.term=6;h.context.total=3440;h.context.customerType='personal';
  h.context.qGet=key=>h.data.get(key)||'';
  h.context.qSet=(key,value)=>h.data.set(key,value);
  h.context.savePhone=(value,node)=>{
    h.data.set('mini_storage_lead_phone',value);
    h.data.set('mini_storage_lead_context',JSON.stringify({phone_capture_node:node}));
    return true;
  };
  h.context.renderContact=()=>{section.open=false};
  h.run();
  const button=section.body.children[0],status=section.body.children[1];
  h.context.savePhone('13800138000','Q01_QUOTE');
  assert.notEqual(JSON.parse(h.data.get('mini_storage_lead_context')).status,'PENDING');
  button.click();
  const request=JSON.parse(h.data.get('mini_storage_lead_context'));
  assert.equal(request.status,'PENDING');
  assert.equal(request.quote_id,'Q-DEMO');
  assert.equal(request.total_rent,3440);
  assert.equal(status.hidden,false);
  assert.equal(section.open,true);
}
{
  const h=harness('quote_q01',['#contactSection','#contactHint','#phone']);
  const section=h.nodes['#contactSection'];
  section.summary=element();section.body=element();
  section.querySelector=selector=>selector==='summary b'?section.summary:section.body;
  h.context.qid='Q-EMPTY';h.context.qGet=key=>h.data.get(key)||'';
  h.context.qSet=(key,value)=>h.data.set(key,value);
  h.context.savePhone=()=>false;h.context.renderContact=()=>{};
  h.run();
  section.body.children[0].click();
  assert.equal(h.data.has('mini_storage_lead_context'),false,'request requires phone');
  assert.equal(h.nodes['#phone'].focused,true);
}
console.log('sales intervention request patch: pass');
