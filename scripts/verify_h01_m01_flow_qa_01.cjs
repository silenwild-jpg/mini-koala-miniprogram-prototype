#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const W={},globals={window:W,globalThis:W,sessionStorage:{getItem:()=>null},Date,console};
const exec=name=>vm.runInNewContext(read(name),globals,{filename:name});
exec('m01-order-route-01.js');exec('h01-state-policy-01.js');exec('m01-rebaseline-01.js');exec('lifecycle-ui.js');
const nav=W.MK_M01_ORDER_ROUTE_01,policy=W.H01_STATE_POLICY,mine=W.M01_REBASELINE_01,lifeUI=W.MK_LIFECYCLE_UI_V1;
const checks=[];
const ok=(label,fn)=>{fn();checks.push({label,pass:true});};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(action,label,value='')=>'<button data-action="'+esc(action)+'" data-value="'+esc(value)+'">'+esc(label)+'</button>';
const title=(label,back)=>'<header>'+label+' '+back+'</header>';
const storeA={id:'S_A',name:'安贞店',access_hours:'24小时'},storeB={id:'S_B',name:'芍药居店',access_hours:'09:00-21:00'};
const units=[{id:'U_A',code:'A103',name:'A103',volume:3},{id:'U_B',code:'B205',name:'B205',volume:8}];
const orders=[{id:'ORDER_A',store_id:'S_A',unit_ids:['U_A'],status:'paid_simulated',payable:4000,deposit:360,term_months:12,start_date:'2026-01-01'},
              {id:'ORDER_B',store_id:'S_B',unit_ids:['U_B'],status:'paid_simulated',payable:6000,deposit:500,term_months:12,start_date:'2026-01-01'}];
const lifeA={order_id:'ORDER_A',lease_status:'active',identity_status:'verified',access_allowed:true,total_months:12,start_date:'2026-01-01',end_date:'2027-01-01',deposit_status:'HELD',renewal_requests:[],payments:[{id:'ORDER_A',type:'INITIAL',amount:4000}],invoices:[],exit:null};
const lifeB={...lifeA,order_id:'ORDER_B',end_date:'2027-01-01',payments:[{id:'ORDER_B',type:'INITIAL',amount:6000}]};
const lives={ORDER_A:lifeA,ORDER_B:lifeB};
const state={orders:orders.slice(),requirement:{capacity_m3:8,term_months:12,term_confirmed:true},services:{},city:'北京',selected:[],leads:[],enterpriseLeads:[],coupons:[],messages:[],quote:null};
const core={fixture:{stores:[storeA,storeB],units},state:()=>state,lifecycleView:id=>lives[id],today:()=>new Date().toISOString().slice(0,10),authorized:()=>true};
const ctx={state,orders:state.orders,sharedTask:null,getLife:id=>lives[id],storeName:o=>(o.store_id==='S_A'?storeA:storeB).name,
  unitName:o=>o.unit_ids.map(id=>units.find(u=>u.id===id).name).join('、'),
  unitFacts:o=>o.unit_ids.map(id=>units.find(u=>u.id===id)),esc,button,money:n=>'¥'+n,
  orderBrief:o=>'<article>'+o.id+'</article>',authorized:true};
ok('Order route pages and four after-sales destinations',()=>{
 for(const p of ['O03','RN01','EX01','DP01','IV01'])assert(nav.isOrderPage(p));
 for(const p of ['M01','S01','S5','O01','H01'])assert(!nav.isOrderPage(p));
});
ok('Browser history resolves explicit old order A instead of latest B',()=>{
 assert.equal(nav.select(true,'ORDER_A','ORDER_B'),'ORDER_A');
 assert.equal(nav.select(false,null,'ORDER_B'),'ORDER_B');
});
ok('Unknown and empty deep link IDs do not fallback to other lease',()=>{
 assert.equal(nav.select(true,'NON_EXISTENT','ORDER_A'),'NON_EXISTENT');
 assert.equal(nav.select(true,'','ORDER_A'),'');
});
ok('Route includes a per-order ID in O03 and each service URL',()=>{
 const params={fields:{},set(k,v){this.fields[k]=v;}};
 for(const p of ['O03','RN01','EX01','DP01','IV01']){
   params.fields={};nav.addQueryOrder(params,p,'ORDER_A',orders);
   assert.equal(params.fields.order,'ORDER_A');
 }
 params.fields={};nav.addQueryOrder(params,'M01','ORDER_B',orders);
 assert(!Object.hasOwn(params.fields,'order'));
 params.fields={};nav.addQueryOrder(params,'O03','NON_EXISTENT',orders);
 assert(!Object.hasOwn(params.fields,'order'));
});
ok('Central app URL and popstate both use route contract',()=>{
 const app=read('app.js');
 assert(app.includes('MK_M01_ORDER_ROUTE_01.addQueryOrder(q,next,selectedOrderId,state().orders)'));
 assert(app.includes('MK_M01_ORDER_ROUTE_01.select(query.has('));
 assert(app.includes("sessionStorage.setItem('mk_lifecycle_selected_order_v1',selectedOrderId)"));
});
ok('Multiple paid orders in M01 are separate assets with exact original order links',()=>{
 mine.setView('assets');const html=mine.render(ctx);
 for(const id of ['ORDER_A','ORDER_B'])assert(html.includes('data-action="m01Order" data-value="'+id+'"'));
 assert(html.includes('A103 · 3m³')&&html.includes('B205 · 8m³'));
});
ok('Order A renewal and B renewal render respective store/id independently',()=>{
 const a=lifeUI.render('RN01',core,'ORDER_A',{esc,button,title,money:n=>'¥'+n,reviewMode:false,renewalDraft:''});
 const b=lifeUI.render('RN01',core,'ORDER_B',{esc,button,title,money:n=>'¥'+n,reviewMode:false,renewalDraft:''});
 assert(a.includes('安贞店')&&!a.includes('芍药居店'));
 assert(b.includes('芍药居店')&&!b.includes('安贞店'));
});
ok('EX01, DP01, IV01 render the selected paid order only',()=>{
 for(const page of ['EX01','DP01','IV01']){
   const a=lifeUI.render(page,core,'ORDER_A',{esc,button,title,money:n=>'¥'+n,reviewMode:false,renewalDraft:''});
   const b=lifeUI.render(page,core,'ORDER_B',{esc,button,title,money:n=>'¥'+n,reviewMode:false,renewalDraft:''});
   assert(a.includes('安贞店')&&!a.includes('芍药居店'),page+' A');
   assert(b.includes('芍药居店')&&!b.includes('安贞店'),page+' B');
 }
});
ok('Invalid service deep links do not silently select the last order',()=>{
 const invalid=lifeUI.render('RN01',core,'NON_EXISTENT',{esc,button,title,money:n=>'¥'+n,reviewMode:false,renewalDraft:''});
 assert(invalid.includes('没有可办理租后服务的订单'));
 assert(!invalid.includes('安贞店')&&!invalid.includes('芍药居店'));
});
ok('Shared H01 pending task is also top M01 action while rental assets remain',()=>{
 const pending={id:'ORDER_PENDING',status:'pending',store_id:'S_B',unit_ids:['U_B'],term_months:12,expiresAt:Date.now()+10000000,payable:7200};
 state.orders=[orders[0],pending];ctx.orders=state.orders;
 const projection=policy.derive(state,core);
 assert.equal(projection.key,'pending');
 ctx.sharedTask=projection;mine.setView('home');
 const html=mine.render(ctx);
 assert(html.includes('m01ContinuePay')&&html.includes('m01-assets-heading'));
 assert(html.includes('data-value="ORDER_A"'));
});
ok('Refunded closed order remains history, not active services',()=>{
 state.orders=[orders[0]];ctx.orders=state.orders;
 lives.ORDER_A={...lifeA,lease_status:'ended',deposit_status:'REFUNDED'};
 ctx.sharedTask=policy.derive(state,core);mine.setView('home');
 const html=mine.render(ctx);
 assert(!html.includes('m01-assets-heading'));assert(html.includes('我的订单'));
});
console.log('H01-M01-FLOW-QA-01 PASS '+checks.length+'/'+checks.length);
console.log(JSON.stringify(checks));
