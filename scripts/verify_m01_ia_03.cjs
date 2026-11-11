#!/usr/bin/env node
'use strict';
// M01-IA-03: inspect rendered customer UI using the actual M01 module and deterministic in-memory fixtures.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const file=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo/m01-rebaseline-01.js');
const js=fs.readFileSync(file,'utf8'),sandbox={window:{},sessionStorage:{getItem:()=>null},Date,console};
vm.runInNewContext(js,sandbox,{filename:file});
const M=sandbox.window.M01_REBASELINE_01;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(act,label,val)=>'<button data-action="'+esc(act)+'" data-value="'+esc(val||'')+'">'+label+'</button>';
const U={u1:{code:'A103',volume:3},u2:{code:'B205',volume:8},u3:{code:'C307',volume:15},u4:{code:'D102',volume:1}};
const o=(id,units,status='paid_simulated',cap=3)=>({id,status,store_id:'S_'+id,unit_ids:units,capacity_m3:cap,term_months:12,start_date:'2026-07-01',payable:3200,expiresAt:Date.now()+10800000});
const l=(status,dep='HELD',date='2031-07-01')=>({lease_status:status,deposit_status:dep,identity_status:'verified',start_date:'2026-07-01',end_date:date,total_months:12,renewal_requests:[]});
const initial=()=>({orders:[],services:{},requirement:{capacity_m3:null,term_months:null,term_confirmed:false},selected:[],city:'北京',leads:[],enterpriseLeads:[],quote:null,coupons:[],messages:[]});
function ctx(state,lives,task={key:'new',title:'找仓',orderId:null}){
 return {state,orders:state.orders,sharedTask:task,getLife:id=>lives[id],
 storeName:row=>row.store_id||'门店',unitName:row=>(row.unit_ids||[]).map(id=>U[id]?.code||'仓位').join('、'),
 unitFacts:row=>(row.unit_ids||[]).map(id=>U[id]).filter(Boolean),
 esc,money:n=>'¥'+n,button,authorized:true,orderBrief:row=>'<article class="mk-order-list-row">'+row.id+'</article>'};
}
const cases=[];
function verify(name,fn){fn();cases.push({name,pass:true});}
function render(c,view='home'){M.setView(view);return M.render(c);}
verify('new user: no invented lease assets, no duplicate profile',()=>{
 const html=render(ctx(initial(),{}));assert(!html.includes('m01-assets-heading'));
 assert.equal((html.match(/data-value="account"/g)||[]).length,1);
 assert(html.includes('找附近门店'));
});
verify('one active unit: warehouse identity and capacity, no redundant active CTA',()=>{
 const s=initial();s.orders=[o('A',['u1'])];
 const html=render(ctx(s,{A:l('active')},{key:'active',title:'我的在租仓位',orderId:'A'}));
 assert(html.includes('m01-assets-heading'));assert(html.includes('A103 · 3m³'));
 assert(html.includes('租用中'));assert.equal((html.match(/m01-asset-row"/g)||[]).length,1);
 assert(!html.includes('class="m01-task"'),'passive in-use state must prefer asset over task duplication');
 assert(html.includes('data-action="m01Order" data-value="A"'));
});
verify('three different paid orders: two preview, all three in inventory page',()=>{
 const s=initial();s.orders=[o('A',['u1']),o('B',['u2']),o('C',['u3'])];
 const lives={A:l('active'),B:l('upcoming'),C:l('returning')};
 const c=ctx(s,lives,{key:'active',title:'我的在租仓位',orderId:'A'});
 const home=render(c);assert(home.includes('查看全部 3处'));
 assert.equal((home.match(/class="m01-asset-row"/g)||[]).length,2);
 const all=render(c,'assets');assert.equal((all.match(/class="m01-asset-row"/g)||[]).length,3);
 for(const t of ['A103 · 3m³','B205 · 8m³','C307 · 15m³'])assert(all.includes(t));
});
verify('combined two units: single order/asset and both codes with own capacities',()=>{
 const s=initial();s.orders=[o('COMBO',['u1','u2'],'paid_simulated',11)];
 const html=render(ctx(s,{COMBO:l('active')},{key:'active',orderId:'COMBO'}));
 assert.equal((html.match(/class="m01-asset-row"/g)||[]).length,1);
 assert(html.includes('A103 · 3m³')&&html.includes('B205 · 8m³'));
});
verify('closed order: history yes, active warehouse no, stale demand is reference',()=>{
 const s=initial();s.orders=[o('CLOSED',['u1'])];
 s.requirement={capacity_m3:3,term_months:12,term_confirmed:true};s.selected=['u1'];
 const c=ctx(s,{CLOSED:l('ended','REFUNDED')},{key:'new',title:'',orderId:null});
 const h=render(c);assert(!h.includes('m01-assets-heading'));assert(!h.includes('class="m01-task"'));
 assert(h.includes('我的订单'));
 const recent=render(c,'recent');assert(recent.includes('最近参考'));
 assert(recent.includes('按此需求重新找仓'));assert(!recent.includes('继续找仓'));
});
verify('genuine incomplete intent: preserve resume for new user',()=>{
 const s=initial();s.requirement={capacity_m3:3,term_months:12,term_confirmed:true};
 const html=render(ctx(s,{}),'recent');
 assert(html.includes('当前需求'));assert(html.includes('data-action="m01Resume"'));
});
verify('in-use and pending simultaneously: urgent payment card plus existing asset',()=>{
 const s=initial();s.orders=[o('ACTIVE',['u1']),o('PAY',['u2'],'pending',8)];
 const c=ctx(s,{ACTIVE:l('active')},{key:'pending',orderId:'PAY',title:'订单待支付',expiresAt:s.orders[1].expiresAt});
 const html=render(c);assert(html.includes('class="m01-task"'));assert(html.includes('m01-assets-heading'));
 assert(html.includes('data-action="m01ContinuePay"'));
});
verify('ended waiting refund is in task, not an active asset',()=>{
 const s=initial();s.orders=[o('REFUND',['u1'])];
 const c=ctx(s,{REFUND:l('ended','REFUND_PENDING')},{key:'refund',orderId:'REFUND',title:'押金处理中'});
 const html=render(c);assert(html.includes('data-value="REFUND|DP01"'));assert(!html.includes('m01-assets-heading'));
});
verify('personal, advisor and enterprise requests all appear without a fake confirmed appointment',()=>{
 const s=initial();s.leads=[{id:'L1',type:'SIMULATED_BOOKING_LEAD',address:'朝阳区',status:'saved_locally'},
 {id:'L2',type:'ADVISOR_CONSULTATION',address:'海淀区',status:'saved_locally'}];
 s.enterpriseLeads=[{id:'E1',type:'ENTERPRISE_REQUIREMENT',location:'上海市',status:'saved_locally'}];
 const c=ctx(s,{}),home=render(c);
 assert(home.includes('预约与需求'));assert(home.includes('3条记录'));
 const all=render(c,'booking');
 for(const x of ['预约用仓','顾问咨询','企业用仓'])assert(all.includes(x));
 assert.equal((all.match(/class="m01-info-item"/g)||[]).length,3);
 assert(!all.includes('预约已确认')&&!all.includes('已接单'));
});
verify('quote entry is truthful: one current quote not an invented history',()=>{
 const s=initial();s.quote={store_id:'STORE',unit_ids:['u1'],term_months:12,expiresAt:Date.now()+300000};
 let c=ctx(s,{});assert(render(c).includes('当前方案有效'));
 let view=render(c,'quotes');assert(view.includes('当前报价'));
 s.quote.expiresAt=Date.now()-1000;view=render(c,'quotes');assert(view.includes('已过期'));
});
verify('no comparison, stable 44px CSS targets by contract selectors',()=>{
 const s=initial();s.orders=[o('A',['u1'])];const html=render(ctx(s,{A:l('active')}));
 assert(!html.includes('比较仓位'));assert(!html.includes('方案对比'));
 const css=fs.readFileSync(path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo/m01-rebaseline-01.css'),'utf8');
 assert(/\.m01-asset-row\{[^}]*min-height:86px/.test(css));
 assert(/\.m01-assets-all\{[^}]*min-height:44px/.test(css));
});
console.log('M01-IA-03 unit contract PASS '+cases.length+'/'+cases.length);
console.log(JSON.stringify(cases));
