const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'../prototype');
function iso(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function harness(file,search='?orderNo=FIX-ORDER&review=1'){
 const storage=new Map(),nodes=new Map(),today=new Date(),end=new Date();end.setMonth(end.getMonth()+3);
 const order={order_no:'FIX-ORDER',store_id:'jianguo',unit_id:'C008',volume:4.8,start_date:iso(today),end_date:iso(end),status:'PAID',payment_status:'PAID',inventory_status:'LOCKED_TO_ORDER',lifecycle_state:'active',detail_state:'active',identity_verification_status:'VERIFIED'};
 storage.set('mini_storage_order_current',JSON.stringify(order));
 const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
 function node(s){if(nodes.has(s))return nodes.get(s);const classes=new Set();const n={textContent:'',innerHTML:'',value:s==='#months'?'6':s==='#reviewMonthly'?'687':'',checked:false,style:{},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,f)=>f?(classes.add(x),true):(classes.delete(x),false)},focus(){},click(){this.onclick?.()}};nodes.set(s,n);return n}
 const c={window:null,document:{querySelector:node,querySelectorAll:()=>[]},location:{search,href:''},localStorage,history:{length:1},URLSearchParams,Date,Math,JSON,String,Number,Array,Object,Boolean,Error,setTimeout:()=>0,clearTimeout:()=>{},console};c.window=c;vm.createContext(c);
 vm.runInContext(fs.readFileSync(path.join(root,'mini_storage_business_ssot_v274.js'),'utf8'),c);
 const script=[...fs.readFileSync(path.join(root,file),'utf8').matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)][0][1];vm.runInContext(script,c);
 return {c,node,repo:c.MINI_STORAGE_REPO_V242,order,localStorage};
}
{
 const h=harness('mini_storage_renew_rn01_v2_7_4.html'),before=h.repo.findOrder('FIX-ORDER').end_date;
 for(let i=0;i<2;i++){
  assert.notEqual(h.node('#renewForm').style.display,'none');h.node('#submitRenew').click();h.node('#makeQuote').click();h.node('#confirmRenew').click();h.node('#renewPayConfirm').click();
  assert.equal(h.repo.findRenewal('FIX-ORDER').status,'COMPLETED');
 }
 const records=h.repo.getRenewals().filter(x=>x.order_no==='FIX-ORDER');const payments=h.repo.getPayments().filter(x=>x.order_no==='FIX-ORDER'&&x.type==='RENEWAL');
 assert.equal(records.length,2);assert.notEqual(records[0].renewal_id,records[1].renewal_id);assert.equal(payments.length,2);assert.notEqual(payments[0].payment_id,payments[1].payment_id);assert.equal(h.repo.findOrder('FIX-ORDER').renewal_months_total,12);assert(h.repo.findOrder('FIX-ORDER').end_date>before);assert(h.node('#statusBody').innerHTML.includes('已完成续租记录'));
}
for(const [offset,type,accepted] of [[-1,'NORMAL_END',false],[-1,'EARLY_RETURN',true],[0,'NORMAL_END',true],[1,'EARLY_RETURN',false],[1,'LATE_RETURN',true]]){
 const h=harness('mini_storage_exit_ex01_v2_7_4.html'),end=new Date(h.order.end_date+'T12:00:00');end.setDate(end.getDate()+offset);h.node('#returnType').value=type;h.node('#targetDate').value=iso(end);h.node('#submitReturn').click();
 assert.equal(Boolean(h.repo.findReturn('FIX-ORDER')),accepted,`${type} ${offset}`);
 if(accepted)assert.equal(h.repo.findReturn('FIX-ORDER').type,type);
}
for(const [hour,accepted] of [[3,false],[9,true],[17,true],[18,false]]){
 const h=harness('mini_storage_viewing_v01_v1_14_self_service_synced.html'),d=new Date();d.setDate(d.getDate()+1);h.node('#appointment').value=`${iso(d)}T${String(hour).padStart(2,'0')}:00`;h.node('#confirm').click();
 assert.equal(Boolean(h.localStorage.getItem('mini_storage_viewing_current')),accepted,`viewing at ${hour}`);
}
// 2026-10-19 user decision: AI estimation is frozen as a fixed demo.
// Its example result may open the item editor, but may not commit a demand.
for(const term of ['12','']){
 const h=harness('mini_storage_ai_result_ai02_v1_demo_patch.html',`?returnTo=S01&returnOriginKey=wangjing&returnTravel=walk&returnTerm=${term}&returnDistance=3&returnSort=price&returnServices=24h`);h.node('#stores').click();
 assert(h.c.location.href.includes('space_decision_assistant'));const q=new URL(h.c.location.href,'http://example.test/').searchParams;
 assert.equal(q.get('entry'),'item');assert.equal(q.get('source'),'ai_demo_fallback');
 assert.equal(q.get('returnTo'),'S01');assert.equal(q.get('returnOriginKey'),'wangjing');assert.equal(q.get('returnTravel'),'walk');
 assert.equal(q.get('returnTerm'),term);assert.equal(h.localStorage.getItem('mini_storage_requirement_current'),null);
}
console.log('PASS review P1 behavior: repeat renewal, return date/type, viewing hours, frozen AI demo context');
