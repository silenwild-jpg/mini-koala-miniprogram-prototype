const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const root = path.join(__dirname,'../miniprogram');
const env = require('../tools/fake_wx').install(root);
const R = p => require(path.join(root,p));
const state=R('services/state'),api=R('services/api'),auth=R('services/auth'),routes=R('services/routes');
const pricing=R('core/pricing'),matching=R('core/matching'),req=R('core/requirement'),order=R('core/order');
const {db}=R('services/mock-ext/_db'),inventory=R('mock/inventory');
env.loadApp();
const tick=()=>new Promise(r=>setTimeout(r,40));
function fresh(logged=false) { state.reset(); env.nav.length=0; db.orders=[];db.leads=[];db.kv={};db.seeded=true;db.seq=0;if(logged)state.setSession({loggedIn:true,phoneMasked:'138****8000',token:'demo'}); }
const START=new Date(Date.now()+11*86400e3+8*3600e3).toISOString().slice(0,10); // 预计用仓时间用相对今天的日期（明天起 90 天内才有效）
test('每个有可租库存的门店稳定分配1–3个九折仓位，来源库存不被改写',()=>{
 const source=R('mock/units'),again=R('mock/specials').assign(source.map(u=>({...u})));
 assert.deepEqual(inventory,again);
 for(const st of R('mock/stores')) {
  const us=inventory.filter(u=>u.store_id===st.id&&matching.isAvailable(u)),special=us.filter(pricing.isSpecial);
  if (us.length) assert.ok(special.length >= 1 && special.length <= Math.min(3,us.length)); else assert.equal(special.length,0);
  assert.ok(special.length<=3);for(const u of special)assert.equal(u.special_month,Math.round(u.base_month*90)/100);
 }
 assert.ok(source.every(u=>!u.special_month));
});
test('混合组合按仓位九折×租期系数后统一舍去月租小数，押金/整期/节省一致',()=>{
 const us=[{id:'a',base_month:1001,special_month:900.9},{id:'b',base_month:777,special_month:null}];
 const q=pricing.quote(us,6);assert.equal(q.monthly_average,630+543);assert.equal(q.rent_total,7038);assert.equal(q.deposit,1173);assert.equal(q.payable,8261);assert.equal(q.saved,(1001+777-1173)*6);
 assert.equal(pricing.quote(us,6,{renewal:true}).deposit,0);assert.equal(pricing.quote(us,6,{renewal:true}).management_fee,0);
});
test('面积换算后的建议容量继续向上到一位小数，超上限不因浮点被吞',()=>{
 assert.equal(req.validate('m2','1.1').capacity_m3,2.8);
 assert.equal(req.validate('m2','200.00000000000000000001').ok,false);
 assert.equal(req.validate('m3','3.1000000000000001').capacity_m3,3.2);
 const u={id:'u',volume:2.8,base_month:100,status:'available'};
 assert.equal(matching.matchStore([u],3.5).near.id,'u');assert.equal(matching.fit(7.9,10).state,'small');
});
test('ITEMS提醒是OR；15m³无大件不提醒，小容量冰箱也提醒',async()=>{
 assert.equal(req.itemsReminder(15,false),false);assert.equal(req.itemsReminder(15.1,false),true);assert.equal(req.itemsReminder(3,true),true);
 fresh();const pg=env.newPage('pkg-estimate/items/index',{});await tick();pg.setCount('fridge',1);pg.onSubmit();assert.equal(pg.data.advisoryVisible,true);assert.equal(state.get().requirement,null);pg.onAdvisoryContinue();assert.ok(state.get().requirement.capacity_m3>0);
});
test('看仓弹窗：手填电话提交独立销售线索，不登录、不下单、不锁仓',async()=>{
 fresh();const store=await api.getStore({id:'SIM_BJ01'});
 const c=env.newComponent('components/mk-visit-sheet/index',{store,visible:false,unitId:''});c.open();
 c.onPhone({detail:{value:'13800008000'}});c.onCapacity({detail:{value:'0.11'}});
 await c.onSubmit();assert.ok(c.data.success);assert.equal(state.get().session.loggedIn,false);assert.equal(db.orders.length,0);assert.equal(db.leads.length,1);
 assert.equal(db.leads[0].type,'visit');assert.equal(db.leads[0].capacity_m3,0.5);assert.equal(db.leads[0].store_id,'SIM_BJ01');assert.equal(db.leads[0].time_slot,'待电话确认');assert.equal(db.kv.trade,undefined);
 await c.onSubmit();assert.equal(db.leads.length,1);
});
test('看仓弹窗：必填电话、错误门店/仓位/过去日期均被接口拒绝',async()=>{
 fresh();const p={type:'visit',store_id:'SIM_BJ01',phone:'13800008000',time_slot:'上午'};
 for(const bad of [{phone:''},{store_id:'NOPE'},{unit_id:'SIM_BJ02_U01'},{preferred_date:'2000-01-01'},{time_slot:'凌晨'}]) await assert.rejects(api.submitLead({...p,...bad}),e=>e.code==='INVALID');
 assert.equal(db.leads.length,0);
});
test('看仓失败保留输入；回执超时核对同一请求，不重复建线索',async()=>{
 fresh();const store=await api.getStore({id:'SIM_BJ01'}),c=env.newComponent('components/mk-visit-sheet/index',{store});c.open();c.onPhone({detail:{value:'13800008000'}});
 db.kv.lead={seq:0,keys:{},failNext:'network'};await c.onSubmit();assert.equal(c.data.phone,'13800008000');assert.equal(db.leads.length,0);assert.ok(c.data.error);
 db.kv.lead.failNext='timeout';await c.onSubmit();assert.equal(c.data.unknown,true);assert.equal(db.leads.length,1);await c.onSubmit();assert.ok(c.data.success);assert.equal(db.leads.length,1);
});
test('快捷下单来源守卫回快捷下单；订单页会话失效立即隐藏内容',async()=>{
 fresh();state.patch('flags',{orderSource:'quick'});auth.enter(routes.CONFIRM);assert.equal(env.nav[0].url,routes.QUICK+'?login=1');
 const pg=env.newPage('pkg-trade/quick/index',{login:'1'});assert.equal(pg.data.loginVisible,true);
 fresh(true);const confirm=env.newPage('pkg-trade/confirm/index',{unit:'SIM_BJ01_U03',term:'6'});await tick();state.logout();env.nav.length=0;confirm.onShow();assert.equal(confirm.data.cardOrder,null);assert.equal(confirm.data.showBar,false);confirm.onUnload();
});
test('快捷下单未登录选齐后提示登录报价，不再显示空的还需状态',async()=>{
 fresh();const pg=env.newPage('pkg-trade/quick/index',{store:'SIM_BJ01',unit:'SIM_BJ01_U03'});await tick();pg.onDate({detail:{value:START}});pg.bar();
 assert.equal(pg.data.btnDisabled,false);assert.equal(pg.data.btnText,'查看报价');assert.equal(pg.data.barLabel,'登录后查看整期报价');assert.equal(pg.data.barAmount,'');assert.equal(pg.data.est,null);
});
test('预约用仓成功不等订阅；顾问允许手填电话且不登录',async()=>{
 fresh();const c=env.newPage('pkg-lead/booking/index',{mode:'advisor'});await tick();c.onManualPhone({detail:{value:'13800008000'}});let asked=0;const original=wx.requestSubscribeMessage;wx.requestSubscribeMessage=()=>{asked++};
 await c.onSubmit();wx.requestSubscribeMessage=original;assert.equal(c.data.status,'success');assert.equal(asked,0);assert.equal(state.get().session.loggedIn,false);assert.equal(db.leads[0].type,'advisor');
});
test('取消订单后全站库存恢复，待支付占用对门店/推荐/费用查询同时可见',async()=>{
 fresh(true);await api.verifyIdentity({name:'张明',id_no:'110101199001010012'});const ids=['SIM_BJ01_U03'];
 const d=await api.getOrderDraft({unit_ids:ids,months:6});const o=await api.createOrder({unit_ids:ids,months:6,quoted_at:d.quoted_at,expect_payable:d.quote.payable,start_date:START});
 let st=await api.getStore({id:'SIM_BJ01'});assert.equal(st.units.find(u=>u.id===ids[0]).status,'reserved');await assert.rejects(api.getQuote({unit_ids:ids,months:6}),e=>e.code==='NOT_FOUND');
 const snapshot=JSON.stringify(o.quote);await api.cancelOrder({order_id:o.id});st=await api.getStore({id:'SIM_BJ01'});assert.equal(st.units.find(u=>u.id===ids[0]).status,'available');assert.equal(JSON.stringify(o.quote),snapshot);
 assert.equal((await api.getOrder({id:o.id})).stage,order.STAGE.CANCELLED);
});
test('首页无订单的预约/需求/已选仓三种任务卡均有去向',async()=>{
 fresh(true);const c=env.newComponent('components/mk-task-card/index',{});await c.refresh();assert.equal(c.data.show,false);
 db.leads.push({id:'l',type:'booking',status:'submitted',store_name:'演示门店'});await c.refresh();assert.equal(c.data.main.key,'booking');
 state.setRequirement({capacity_m3:3,term_months:6});await c.refresh();assert.equal(c.data.main.key,'searching');
 state.set('selection',{store_name:'演示门店'});await c.refresh();assert.equal(c.data.main.key,'selected');c.__detach();
});
test('费用明细无赠送不占位，只有明确赠送月数才显示',()=>{
 const o={months:6,quote:pricing.quote([{id:'x',base_month:100}],6)};const view=R('services/order-view');
 assert.ok(!view.fees(o).rows.some(r=>r.id==='gift'));assert.equal(view.fees({...o,gift_months:1}).rows.find(r=>r.id==='gift').amt,'1个月');
});
