#!/usr/bin/env node
'use strict';
// M01-REBASELINE-01 isolated static & state-view checks. Not a browser or WeChat claim.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const js=fs.readFileSync(path.join(root,'m01-rebaseline-01.js'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'m01-rebaseline-01.css'),'utf8');
const legacy=fs.readFileSync(path.join(root,'account.html'),'utf8');
assert(legacy.includes('href="index.html?page=M01"'),'legacy identity/service pages must return to central M01');
assert(html.includes('m01-rebaseline-01.js')&&html.includes('m01-rebaseline-01.css'));
assert(html.indexOf('m01-rebaseline-01.js')<html.indexOf('app.js?v=VIS03C'),'M01 module must load first');
assert(app.includes('M01_REBASELINE_01.render')&&app.includes('m01Order(value)')&&app.includes('m01Service(value)'),'central M01 routes missing');
assert(!/s5-compare|comparison-table|compare-tab/.test(js+css),'must not restore any comparison module');
assert(css.includes('.page-M01')&&!css.includes('body{'),'M01 CSS must stay scoped');

const sandbox={window:{},sessionStorage:{getItem:()=>null},Date};
vm.runInNewContext(js,sandbox,{filename:'m01-rebaseline-01.js'});
const ui=sandbox.window.M01_REBASELINE_01;
function state(overrides={}){return {account:null,leads:[],enterpriseLeads:[],orders:[],messages:[],coupons:[],quote:null,city:'北京',requirement:{capacity_m3:null,term_months:null,term_confirmed:false},...overrides};}
function sample(id,status){return {id,store_id:'SIM_BJ01',unit_ids:['SIM_BJ01_U01'],term_months:12,status,start_date:'2026-11-01',payable:3250};}
function render(s,orders=[],lives={}){
 const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return ui.render({state:s,orders,getLife:id=>lives[id],esc:escape,money:n=>'¥'+n,
 storeName:o=>o.store_id||'未知门店',unitName:o=>(o.unit_ids||[]).join('、'),
 button:(action,label,value)=>'<button data-action="'+action+'" data-value="'+escape(value||'')+'">'+label+'</button>',
 orderBrief:o=>'<article>order:'+escape(o.id)+'</article>'});
}
ui.setView('home');
assert.match(render(state()),/尚未用仓/);
assert.match(render(state()),/预约用仓/);
assert.match(render(state()),/最近找仓/);
assert.doesNotMatch(render(state()),/内部预览设置/);
const p=sample('order-A','pending');
assert.match(render(state(),[p]),/继续支付/);assert.match(render(state(),[p]),/应付¥3250/);
const failed=sample('order-F','payment_failed');
assert.match(render(state(),[failed]),/重新查看可用仓位/);
const paid=sample('order-P','paid_simulated');
const life=(lease_status,identity_status='verified')=>({lease_status,identity_status,total_months:12,end_date:'2027-11-01',renewal_requests:[]});
assert.match(render(state(),[paid],{'order-P':life('active')}),/查看我的仓位/);
assert.match(render(state(),[paid],{'order-P':life('upcoming')}),/查看入仓准备/);
assert.match(render(state(),[paid],{'order-P':life('active','pending')}),/完成身份验证/);
assert.match(render(state(),[paid],{'order-P':life('returning')}),/查看退租进度/);
assert.match(render(state(),[paid],{'order-P':{...life('active'),renewal_requests:[{status:'QUOTE_PENDING'}]}}),/续租申请处理中/);
assert.match(render(state({requirement:{capacity_m3:3,term_months:12,term_confirmed:true}})),/继续找仓/);
assert.match(render(state({leads:[{id:'b1',type:'SIMULATED_BOOKING_LEAD',status:'saved_locally',address:'北京市朝阳区'}]})),/预约需求已记录/);
ui.setView('orders');assert.match(render(state(),[p]),/order:order-A/);
ui.setView('services');assert.match(render(state(),[paid],{'order-P':life('active')}),/押金/);
ui.setView('coupons');assert.match(render(state({coupons:[{id:'c1',name:'租金券',status:'CLAIMED'}]})),/租金券/);
ui.setView('recent');assert.match(render(state({requirement:{capacity_m3:3,term_months:12,term_confirmed:true}})),/需求已确认/);
ui.setView('help');assert.match(render(state()),/联系客服/);
console.log('M01-REBASELINE-01 isolated assertions PASS; central routes, state variants and no comparison verified.');
