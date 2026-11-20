/* VIS-REDESIGN-01A · W1 binder · 2026-11-17
 * Thin data binder: builds page state through the UNMODIFIED runtime modules in ../runtime/
 * (fixtures.js / demo-core.js / h01-state-policy-01.js / home-recommend-policy.js /
 *  recommendation-policy.js / presentation-policy.js / br03-policy.js) and writes the view model
 * into the editable HTML. No copy, field, price or ranking rule is invented here.
 * H01: ?state=<policy key>   S01: ?state=browse|matched|nomatch|soldout|filtering|loading[&overlay=demand|filter]
 * Design-side basis (WP04 v1.1 CONFIRMED, D-10a / D-23): public prices use the 7–12 month tier
 * (factor 0.65) = fixture.pricing.homeReferenceTerm, not bestPublicTerm() (37 months / 0.59 → D-10e code item). */
(function(){
'use strict';
const F=window.SIM_FIXTURES,q=new URLSearchParams(location.search),PAGE=document.body.dataset.page;
const PUBLIC_TERM=Number(F.pricing.homeReferenceTerm)||12;
const PHONE='13800138000',UNIT='SIM_BJ01_U03';
const money=n=>'¥'+Math.trunc(Number(n)).toLocaleString('zh-CN');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const el=html=>{const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild;};
const ico=(id,cls='ico')=>'<svg class="'+cls+'"><use href="#'+id+'"/></svg>';
/* distance text: port of app.js displayedDistanceKm (>8km compressed; ranking still uses raw distance → D-24) */
const displayedKm=s=>{const n=Number(s?.distance);if(F.distanceVerified)return Number.isFinite(n)&&n>=0?n:NaN;if(!F.synthetic)return NaN;return Number.isFinite(n)&&n>=0?Number((n>8?0.6+n*0.16:n).toFixed(1)):NaN;};
const kmText=s=>{const k=displayedKm(s);return Number.isFinite(k)?k.toFixed(1)+'km':'';};
const photoOf=s=>'../assets/'+s.photo;
const storeById=id=>F.stores.find(s=>s.id===id);
const unitById=id=>F.units.find(u=>u.id===id);
const tomorrow=()=>new Date(Date.now()+8*3600*1000+86400000).toISOString().slice(0,10);
function makeCore(state){return window.SIM_CORE.create(state?{state}:{});}
function policies(core){const P=window.SIM_BR03_POLICY.create({core,fixture:F,config:window.SIM_BR03_DATA});const pres=window.SIM_PRESENTATION.create({core,fixture:F,unitPolicy:P});return {P,pres};}
const availRows=(core,s)=>F.units.filter(u=>u.store_id===s.id&&core.available(u));
/* D-10a 起价型：门店公开最低折扣月租 = 可租仓位在 PUBLIC_TERM 档下的最低月租（core.amounts，含特价仓活动价） */
const publicMonthly=(core,s)=>{const rows=availRows(core,s);return rows.length?Math.min(...rows.map(u=>core.amounts([u.id],PUBLIC_TERM).monthly_average)):null;};
/* D-23 单价型：/m³/月起 = 可租仓位在 PUBLIC_TERM 档下最低「月租 ÷ 容量」 */
const publicCubic=(core,s)=>{const rows=availRows(core,s).filter(u=>Number(u.volume)>0);return rows.length?Math.min(...rows.map(u=>core.amounts([u.id],PUBLIC_TERM).monthly_average/u.volume)):null;};
const priceHtml=(num,unit,tag)=>'<div class="price"><span class="cur">¥</span><span class="num">'+esc(num)+'</span>'+(unit?'<span class="unit">'+esc(unit)+'</span>':'')+(tag||'')+'</div>';
const fmtNum=n=>Math.trunc(Number(n)).toLocaleString('zh-CN');
/* W7（D-98）门店均价 = 定价测算「加权单价」，全部仓位、0.65 档；不带「起」 */
const W7=window.MK_W7;
/* W16：无需求浏览卡价格行右侧补「可租容量」区间（当前可租仓位的最小–最大容量）；只有一种容量时写单值；不写剩余数量 */
const capRange=(core,s)=>{const vs=availRows(core,s).map(u=>Number(u.volume)).filter(v=>v>0);if(!vs.length)return '';const a=Math.min(...vs),b=Math.max(...vs);return '<div class="caprange"><span class="k">可租容量</span><b>'+(a===b?a:a+'–'+b)+'m³</b></div>';};
const avgPriceHtml=(s,core)=>W7.fromPriceHtml(s,core)||'<div class="price"><span class="unit">暂无价格</span></div>'; /* W17 D-140：¥XX/m³/月起（门店最低折扣下的立方单价） */
/* PORT w2-render.js accessHours（= app.js s02AccessHours），任务卡存取时间与 S02 / QUICK 同一取值（D-103） */
function accessHours(s){if(s.access_hours)return s.access_hours;let h=2166136261;for(const c of String(s.id)){h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;}return ['24小时','09:00-21:00','08:00-23:00'][h%3];}
/* R-A-32 标签放不下时整枚隐藏 */
function fitTags(root){root.querySelectorAll('.tags').forEach(box=>{const w=box.clientWidth;if(!w)return;[...box.children].forEach(t=>{if(t.offsetLeft-box.offsetLeft+t.offsetWidth>w+0.5)t.style.display='none';});});}
function toast(msg){document.querySelectorAll('.toastwrap').forEach(x=>x.remove());const t=el('<div class="toastwrap" role="status"><span class="toast">'+esc(msg)+'</span></div>');document.body.append(t);setTimeout(()=>t.remove(),2400);}
const tagsHtml=list=>list.map(t=>'<span class="tag'+(t.type==='promotion'?' promo':'')+'">'+esc(t.label)+'</span>').join('');

/* ======================= H01 ======================= */
function pendingOrder(c){c.setScenario('normal');c.select([UNIT]);c.requestPhone();c.resolvePhone('success',{phone:PHONE});c.setDate(tomorrow());c.quote();return c.submit();}
const H01_BUILD={
  new:c=>c.setScenario('noDemand'),
  estimated:c=>c.setScenario('normal'),
  selected:c=>{c.setScenario('normal');c.select([UNIT]);},
  booking:c=>{c.setScenario('normal');c.saveLead('北京市朝阳区富仁名苑胜古北里',{phone:PHONE});},
  pending:c=>pendingOrder(c),
  expired:c=>pendingOrder(c),             /* derived with nowMs = now + 4h (TTL 3h) */
  payment_failed:c=>{const o=pendingOrder(c);c.pay(o.id,'failed');},
  cancelled:c=>{const o=pendingOrder(c);c.cancelOrder(o.id);},
  invalidated:c=>{const o=pendingOrder(c);c.markUnavailable(UNIT);try{c.pay(o.id,'success');}catch(_){}},
  identity:c=>c.setScenario('lifeIdentity'),
  upcoming:c=>c.setScenario('lifeUpcoming'),
  renewal:c=>c.setScenario('lifeRenewalQuote'),
  active:c=>c.setScenario('lifeActive'),
  expiring:c=>{c.setScenario('lifeActive');const st=c.state();const d=new Date(c.today()+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+20);d.setUTCMonth(d.getUTCMonth()-12);st.orders[0].start_date=d.toISOString().slice(0,10);return makeCore(st);},
  returning:c=>c.setScenario('lifeReturning'),
  lease_expired:c=>c.setScenario('lifeExpired'),
  refund:c=>c.setScenario('lifeRefund'),
  /* ---- W26 A6：㎡ 需求（2㎡ ≈ 4.8m³，与 S01 matched_area 同一组数）---- */
  estimated_area:c=>{c.setScenario('normal');const st=c.state();st.requirement={...st.requirement,capacity_m3:4.8,term_months:6,term_confirmed:true,input_unit:'m2',input_value:2};return makeCore(st);},
  active_todo_area:c=>{c.setScenario('lifeActive');NEW_DEMAND={capacity_m3:4.8,term_months:6,input_unit:'m2',input_value:2};},
  /* ---- W7-B 新增演示状态（D-81 两层任务卡）---- */
  booking_only:c=>{c.setScenario('noDemand');c.saveLead('北京市朝阳区富仁名苑胜古北里',{phone:PHONE});},
  renewal_quote:c=>c.setScenario('lifeRenewalQuote'),
  renewal_pending:c=>{c.setScenario('lifeRenewalQuote');RENEWAL_PENDING=true;},
  active_todo:c=>{c.setScenario('lifeActive');c.saveLead('北京市朝阳区富仁名苑胜古北里',{phone:PHONE});NEW_DEMAND={capacity_m3:5,term_months:6};},
  active_pending:c=>{const p=makeCore();const o=pendingOrder(p);o2=p.state().orders.find(x=>x.id===o.id);c.setScenario('lifeActive');const st=c.state();st.orders.push({...o2,id:'SIM_ORDER_W7_PENDING',store_id:'SIM_BJ03',unit_ids:['SIM_BJ03_U02']});return makeCore(st);},
  active_many:c=>{const p=makeCore();const o=pendingOrder(p);o2=p.state().orders.find(x=>x.id===o.id);c.setScenario('lifeActive');c.saveLead('北京市朝阳区富仁名苑胜古北里',{phone:PHONE});const st=c.state();st.orders.push({...o2,id:'SIM_ORDER_W7_PENDING',store_id:'SIM_BJ03',unit_ids:['SIM_BJ03_U02']});NEW_DEMAND={capacity_m3:5,term_months:6};return makeCore(st);}
};
let NEW_DEMAND=null,RENEWAL_PENDING=false,o2=null; /* 演示夹具标记：已付款用户的新找仓需求（运行时 staleRequirement 屏蔽，R-A-07 代码侧放开）；续租报价未出 */
const KICKER={pending:'当前订单',payment_failed:'当前订单',expired:'订单状态',cancelled:'订单状态',invalidated:'订单状态',estimated:'找仓进度',selected:'找仓进度',booking:'预约用仓',identity:'入仓服务',upcoming:'入仓服务',active:'我的仓位',expiring:'我的仓位',renewal:'我的仓位',returning:'退仓服务',lease_expired:'退仓服务',refund:'押金服务'};
/* existing help copy (h01-state-impl-01.js) – content preserved */
const HELP={pending:['付款帮助','关闭支付窗口不会取消订单；请在付款有效期内继续支付。'],payment_failed:['付款帮助','订单与仓位保留至支付截止时间，截止前可继续支付。'],expired:['超时订单说明','原订单已失效，重新选择仓位后再付款。'],identity:['入仓前准备','这笔订单下单时未完成实名认证，完成后起租日起可入仓存取。'],upcoming:['首次入仓须知','起租日开放存取，提前查看门店位置和存取时间。'],active:['门店使用须知','存取时核对仓号，离开前请确认仓门已关好。'],expiring:['到期办理提醒','到期前可办理续租；退仓时需清空并申请验仓。'],renewal:['续租办理提醒','续租报价 24 小时内有效，过期后按常规折扣价续租。'],returning:['退仓与验仓','仓内物品清空后申请验仓，押金以审核结果为准。'],lease_expired:['退押金办理','先完成退仓和门店验仓，再办理押金退还。'],refund:['退款进度','押金退还进度可在订单详情查看。']};
const WEAK_TASK=['pending','payment_failed','identity','upcoming','renewal','expiring','active'];
const NO_REC=['identity','upcoming','renewal','expiring','active'];
const URGENT=['expired','payment_failed','invalidated','refund','returning','identity','expiring','lease_expired','cancelled'];
const countdown=exp=>{const r=Math.max(0,Math.ceil((Number(exp)-Date.now())/1000));const p=n=>String(n).padStart(2,'0');return p(Math.floor(r/3600))+':'+p(Math.floor(r%3600/60))+':'+p(r%60);};
function factHtml([value,label]){const m=String(value).match(/^(¥?[\d,.]+)(m³|㎡|个月|天|小时|万\+?|\+)?$/);
  const b=m?'<b>'+esc(m[1])+(m[2]?'<small>'+esc(m[2])+'</small>':'')+'</b>':'<b style="font-size:var(--mk-font-size-lg);white-space:normal">'+esc(value)+'</b>';
  return '<div'+(/剩余时间$/.test(label)?' role="timer" aria-label="'+esc(label)+'"':'')+'>'+b+'<span>'+esc(label)+'</span></div>';}
/* ---- W7-B · D-81 任务卡两层：主卡按服务阶段取 + 待办条带（契约 docs/W7_Shared_Contracts.md §1；runtime policy 不改，render 层重排与改写）---- */
const STAGE={refund:0,returning:0,lease_expired:0,renewal:0,expiring:0,active:0,identity:1,upcoming:1,pending:2,payment_failed:2,selected:3,estimated:4,booking:5,expired:6,cancelled:6,invalidated:6};
const FILLER=new Set(['待确认','待选择','以订单记录为准','未完成','起租日生效','待验仓','已过期','已取消','报价已失效','原仓位已释放','待处理']); /* R-A-28 事实格不放套话 */
const hm=ms=>{const m=Math.max(0,Math.ceil(ms/60000));return m>=60?Math.floor(m/60)+'小时'+(m%60?m%60+'分':''):m+'分';};
/* W26 A6：需求按 ㎡ 填写时，任务卡主格写面积、标签带「约X m³」；待办条与 S01 / S5 需求条同写法「2㎡ · 约4.8m³」（D-178 不写层高） */
const CAP_LABELS=['预计容量','需要容量'];
const capFacts=(facts,r,strip)=>r&&r.input_unit==='m2'&&Number(r.input_value)>0&&Number(r.capacity_m3)>0?facts.map(([v,l])=>CAP_LABELS.includes(l)?(strip?[window.SIM_SPACE_UNIT.demandCapacity(r),l]:[Number(r.input_value)+'㎡','预计面积 · 约'+Number(r.capacity_m3)+'m³']):[v,l]):facts;
function twoLayer(task,state){
  const recs=(task.tasks||[]).slice();
  if(NEW_DEMAND&&!recs.some(r=>r.key==='estimated'||r.key==='selected'))recs.push({key:'estimated',title:'继续查看仓位',badge:'已保存需求',sub:'已估算用仓需求',facts:[[NEW_DEMAND.capacity_m3+'m³','预计容量'],[NEW_DEMAND.term_months+'个月','租期']],primary:['查看推荐仓位','recommend'],secondary:['修改需求','estimate'],score:11,layout:'task',orderId:null,storeId:null,req:NEW_DEMAND});
  if(!recs.length)return {main:task,todos:[]};
  recs.sort((a,b)=>(STAGE[a.key]??9)-(STAGE[b.key]??9)||b.score-a.score);
  const m=recs[0],main={...task,...m,otherActiveCount:recs.filter(x=>(x.key==='active'||x.key==='expiring')&&x.orderId!==m.orderId).length};
  const inStrip=r=>['booking','estimated','selected'].includes(r.key)||((r.key==='pending'||r.key==='payment_failed')&&STAGE[m.key]<2);
  const ord={pending:0,payment_failed:0,booking:1,selected:2,estimated:2};
  const todos=recs.slice(1).filter(inStrip).sort((a,b)=>ord[a.key]-ord[b.key]);
  return {main,todos};
}
function rewriteMain(t,state,core){
  const k=t.key,o=t.orderId?state.orders.find(x=>x.id===t.orderId):null,store=t.storeId?storeById(t.storeId):null,r={...t};
  let life=null;try{life=o&&o.status==='paid_simulated'?core.lifecycleView(o.id):null;}catch(_){}
  r.facts=(t.facts||[]).map(([v,l])=>[v,l==='首次应付'?'本次应付':l]).filter(([v])=>!FILLER.has(String(v)));
  if(k==='estimated'||k==='selected')r.facts=capFacts(r.facts,t.req||state.requirement,false);
  const set=(title,primary,secondary,badge)=>{if(title)r.title=title;r.primary=primary;r.secondary=secondary||null;if(badge!==undefined)r.badge=badge;};
  if(k==='pending')set(null,['继续支付','order'],['费用明细','fees']);
  else if(k==='payment_failed'){set('支付未成功，订单为您保留',['继续支付','order'],['更换仓位','restart']);r.expiresAt=Number(o?.expiresAt)||(Number(o?.createdAt)?Number(o.createdAt)+W7.PENDING_TTL_H*3600000:Date.now()+W7.PENDING_TTL_H*3600000); /* D-96 自下单起 3 小时，失败不重新计时 */r.facts=[[money(o?.payable),'本次应付'],[countdown(r.expiresAt),'支付剩余时间']];}
  else if(k==='expired')set('订单已超时',['重新找仓','restart'],null,'');
  else if(k==='cancelled')set('订单已取消',['重新找仓','restart'],null,'');
  else if(k==='invalidated')set('报价已失效',['重新找仓','restart'],null,'');
  else if(k==='identity')set(null,['完成实名认证','verify'],['门店导航','navigate']);
  else if(k==='upcoming'){set(null,['门店导航','navigate'],['入仓指引','guide']);if(store)r.facts.push([accessHours(store),'存取时间']);}
  else if(k==='active'){set(null,['一键开锁','unlock'],['门店导航','navigate']);if(store)r.facts=r.facts.map(([v,l])=>l==='存取时间'?[accessHours(store),l]:[v,l]);}
  else if(k==='expiring')set(null,['办理续租','renew'],['一键开锁','unlock']);
  else if(k==='renewal'){const rq=(life?.renewal_requests||[]).find(x=>x.status==='QUOTE_READY');
    if(rq&&!RENEWAL_PENDING){const endMs=life?.end_date?Date.parse(life.end_date+'T00:00:00+08:00'):Infinity,left=Math.min(W7.RENEW_QUOTE_TTL_H*3600000,endMs-Date.now()); /* D-102 截止取较早者；夹具无报价时间，按刚发出演示 */
      set('续租报价待确认',['确认续租报价','renew'],['一键开锁','unlock'],'待确认');r.facts=[[life?.end_date||'','当前租期至'],[money(rq.quote_total),'续租报价'],[countdown(Date.now()+left),'报价剩余时间']].filter(f=>f[0]);}
    else set('续租申请处理中',['查看续租进度','renew'],['一键开锁','unlock']);}
  else if(k==='returning')set(null,['查看退仓进度','exit'],['门店导航','navigate']);
  else if(k==='lease_expired')set(null,['办理续租','renew'],['办理退仓','exit']);
  else if(k==='refund')set(null,['查看押金进度','deposit'],['查看订单','order']);
  else if(k==='booking'){set('预约用仓已提交',['查看预约','booking'],null,'已提交');r.sub=W7.LEAD_COPY.inHours;}
  return r;
}
const TODO_HREF={pending:'#O01',payment_failed:'#O01',booking:'#ACC_needs',selected:'#O01',estimated:'#S5'};
function todoStrip(todos,state){
  const row=t=>{const o=t.orderId?state.orders.find(x=>x.id===t.orderId):null,name=t.storeId?storeById(t.storeId)?.name:'';let k,txt;
    if(t.key==='pending'){k='待支付订单';txt=[name,'本次应付 '+money(o?.payable)].filter(Boolean).join(' · ')+'，剩余 '+countdown(t.expiresAt??o?.expiresAt);}
    else if(t.key==='payment_failed'){k='待支付订单';txt=[name,'支付未成功，订单保留中'].filter(Boolean).join(' · ');}
    else if(t.key==='booking'){k='预约用仓';txt='已提交，'+W7.LEAD_COPY.inHours;}
    else if(t.key==='selected'){k='找仓进度';txt=[...capFacts(t.facts||[],t.req||state.requirement,true).map(f=>f[0]).filter(v=>!FILLER.has(String(v))),'已选仓位'].join(' · ')+'，去确认订单';}
    else{k='找仓进度';txt=capFacts(t.facts||[],t.req||state.requirement,true).map(f=>f[0]).filter(v=>!FILLER.has(String(v))).join(' · ')+((t.req||state.requirement||{}).input_unit==='m2'?'':'，查看推荐仓位');} /* W26：㎡ 需求多一段「约X m³」，375 宽放不下尾句，整行可点、有箭头，尾句省略 */
    return '<a class="todo-row" data-action="'+esc(t.primary?.[1]||t.key)+'" data-todo="'+esc(t.key)+'" href="'+TODO_HREF[t.key]+'"><span class="todo-k">'+esc(k)+'</span><span class="todo-t">'+esc(txt)+'</span>'+ico('i-chev','ico sm')+'</a>';};
  const shown=todos.slice(0,2),more=todos.length-shown.length;
  return el('<div class="todo-strip" aria-label="待办">'+shown.map(row).join('')+(more>0?'<a class="todo-more" href="#M01">还有 '+more+' 项待办</a>':'')+'</div>');
}
function demandCard(task,state){
  const k=task.key,store=task.storeId?storeById(task.storeId):null,name=store?.name||'';
  const variant=(k==='pending'||k==='payment_failed')?'strong':(k==='active'||k==='expiring')?'service':'';
  let summary=task.sub||'';
  if(name&&summary.startsWith(name+' · '))summary=summary.slice(name.length+3);else if(name&&summary===name)summary='';
  const order=task.orderId&&state.orders.find(o=>o.id===task.orderId);
  if(order?.term_months&&['pending','payment_failed','identity','upcoming','active','expiring','renewal'].includes(k))summary+=(summary?' · ':'')+order.term_months+'个月';
  const address=['identity','upcoming','active','expiring','renewal','returning','lease_expired'].includes(k)?(store?.address||''):'';
  let badge;
  if(k==='pending'&&task.expiresAt)badge='<span class="badge err" role="timer" aria-label="支付剩余时间">剩余 '+countdown(task.expiresAt)+'</span>';
  else if(task.badge)badge='<span class="badge'+(URGENT.includes(k)?' warn':'')+'">'+esc(task.badge)+'</span>';
  else badge='';
  const facts=(task.facts||[]).filter(([,l])=>!(k==='pending'&&l==='支付剩余时间')).slice(0,3);
  const help=HELP[k];
  const svc=variant==='service';
  const html='<article class="card dcard '+variant+'" data-state="'+esc(k)+'">'+
    '<div class="kicker">'+esc(KICKER[k]||'当前任务')+'</div>'+
    '<div class="head"><div><div class="title">'+esc(task.title)+'</div>'+(name?'<div class="sub"><b>'+esc(name)+'</b>'+(summary?'<span>'+esc(summary)+'</span>':'')+'</div>':(summary?'<div class="sub">'+esc(summary)+'</div>':''))+(address?'<div class="addr">'+esc(address)+'</div>':'')+'</div>'+badge+'</div>'+
    (facts.length?'<div class="facts n'+facts.length+'">'+facts.map(factHtml).join('')+'</div>':'<div style="height:12px"></div>')+
    '<div class="acts">'+(task.secondary?'<button type="button" class="btn neutral md" data-action="'+esc(task.secondary[1])+'">'+esc(task.secondary[0])+'</button>':'')+'<button type="button" class="btn primary md" data-action="'+esc(task.primary?.[1]||'order')+'">'+esc(task.primary?.[0]||'查看订单')+'</button></div>'+
    (svc?'<div class="svc4" aria-label="仓位服务"><a href="#RN01">'+ico('i-renew')+'续租</a><a href="quick.html?store='+esc(store?.id||'')+'" data-action="addUnit">'+ico('i-plus')+'加租仓位</a><a href="#M01">'+ico('i-grid')+'更多服务</a><a href="#help">'+ico('i-info')+'门店使用须知</a></div>':'')+
    (help&&!(svc&&k==='active')?'<div class="note"><div><b>'+esc(help[0])+'</b> '+esc(help[1])+'</div><a href="agreement.html?doc=notice">查看须知 ›</a></div>':'')+
    (task.otherActiveCount>0?'<div class="note"><div>另有 '+task.otherActiveCount+' 间在租仓位，请在订单中查看。</div></div>':'')+
    '</article>';
  return el(html);
}
function recommendCards(core,state,pres){
  const city=state.city;
  const rows=F.stores.filter(s=>s.city===city).map(s=>({...s,teaserCubicPrice:W7.storeFromCubic(s,core)})); /* D-98 首页同改：排序入参与显示同一数 */
  const sel=window.SIM_HOME_RECOMMEND_02I.rank(rows,{distanceVerified:!!F.distanceVerified,allowDemoDistance:!!F.synthetic});
  return sel.cards.map(s=>{const km=kmText(s),loc=km?'<b>'+km+'</b><span>· '+esc(s.district||'')+'</span>':'<span>'+esc(s.district||'')+(s.community?' · '+esc(s.community):'')+'</span>';
    return el('<a class="card rcard" href="#S02" data-store="'+esc(s.id)+'"><div class="media"><img src="'+photoOf(s)+'" alt=""></div><div class="body"><div class="name" title="'+esc(s.name)+'">'+esc(s.name)+'</div><div class="loc">'+ico('i-pin','ico xs')+loc+'</div><div class="tags">'+tagsHtml(pres.tags(s,2))+'</div>'+avgPriceHtml(s,core)+'</div></a>');});
}
function renderH01(){
  const key=q.get('state')||'new',build=H01_BUILD[key];
  if(!build){document.body.prepend(el('<p style="padding:16px;color:#B42318">未知状态 '+esc(key)+'；可用：'+Object.keys(H01_BUILD).join(' / ')+'</p>'));return;}
  let core=makeCore();const built=build(core);if(built&&typeof built.state==='function')core=built;
  const state=core.state(),nowMs=key==='expired'?Date.now()+4*3600*1000:Date.now();
  const policyTask=window.H01_STATE_POLICY.derive(state,core,nowMs),{main,todos}=twoLayer(policyTask,state),task=rewriteMain(main,state,core),k=task.key,{pres}=policies(core);
  document.getElementById('city').textContent=state.city;
  document.body.dataset.state=k;document.body.dataset.scenario=state.scenario;document.body.dataset.layout=task.layout;document.body.dataset.todos=String(todos.length);
  if(k!=='new'){const slot=document.getElementById('slot-demand');slot.hidden=false;slot.style.marginTop='16px';slot.append(demandCard(task,state));if(todos.length)slot.after(todoStrip(todos,state));}
  document.getElementById('tasks-std').hidden=WEAK_TASK.includes(k);
  document.getElementById('tasks-weak').hidden=!WEAK_TASK.includes(k);
  if(k==='estimated')document.getElementById('task-est-sub').textContent='已估算用仓需求';
  const rec=document.getElementById('rec'),recC=document.getElementById('rec-collapsed');
  const collapse=k==='pending'||k==='payment_failed';
  rec.hidden=NO_REC.includes(k)||collapse;recC.hidden=!collapse;
  if(!rec.hidden){const rail=document.getElementById('rec-rail');rail.append(...recommendCards(core,state,pres));fitTags(rail);}
  document.getElementById('scenes').hidden=NO_REC.includes(k);
  document.addEventListener('click',e=>{const b=e.target.closest('[data-action="unlock"]');if(b)toast('一键开锁暂未开通，目前请按入仓指引到店存取');});
  window.__W1={page:'H01',state:k,urlState:key,policyKey:policyTask.key,task,todos:todos.map(t=>t.key),requirement:state.requirement,orders:state.orders.map(o=>[o.id,o.status]),publicTerm:PUBLIC_TERM};
}

/* ======================= S01 ======================= */
const NEAR_CAP=Number(q.get('cap'))||17;
const S01_STATES={
  browse:{scenario:'noDemand'},
  matched:{scenario:'normal'},
  nomatch:{scenario:'noMatch'},
  soldout:{scenario:'soldout',visibleLimit:50},
  filtering:{scenario:'normal',filters:{sort:'price',maxKm:3,quick:['promo']}},
  far_transport:{scenario:'normal',filters:{sort:'recommended',maxKm:null,quick:['moving']}}, /* W24 D-173 免费运输：只看距用仓位置 ≥5km 的门店 */
  loading:{scenario:'normal',skeleton:true},
  /* ---- W7-C 新增 ---- */
  advisor:{scenario:'normal',requirement:{capacity_m3:16,term_months:12,term_confirmed:true}},   /* D-97 整期租金 >¥3,000 → 列表后顾问卡 */
  near:{scenario:'normal',requirement:{capacity_m3:NEAR_CAP,term_months:6,term_confirmed:true}}, /* D-99 接近：比需求小 ≤20% */
  matched_area:{scenario:'normal',requirement:{capacity_m3:4.8,term_months:6,term_confirmed:true,input_unit:'m2',input_value:2}}, /* W17 ㎡ 全流程 */
  sales:{scenario:'noMatch'}                                                                   /* D-101 ≥30m³ 交销售，不出自助匹配列表 */
};
S01_STATES.nomatch.requirement={capacity_m3:28,term_months:6,term_confirmed:true}; /* 原夹具 200m³ 按 D-101 属于「交销售」（见 sales 态）；无匹配态改用 <30m³ 的无匹配需求 */
const DEFAULT_FILTERS={sort:'recommended',maxKm:null,services:[],quick:[],visibleLimit:10};
/* port of app.js visibleS01Stores() + s01R2Bridge.snapshot() ordering (r2 mode, no S5 origin, no keyword) */
function s01Stores(core,P,filters){
  const st=core.state(),r=st.requirement,matched=core.requirementReady(),term=r.term_months||1,demo=!!F.synthetic||!!F.distanceVerified,REC=window.SIM_REC_POLICY;
  const storeOffer=s=>{const single=core.matchingUnits(s.id).sort((a,b)=>core.amounts([a.id],term).rent_total-core.amounts([b.id],term).rent_total)[0];return single?[single.id]:core.combinations(s.id)[0]?.ids;};
  const recCost=ids=>r.term_confirmed?core.amounts(ids,r.term_months).rent_total:ids.reduce((t,id)=>t+(st.prices[id]??unitById(id).base_month),0);
  const cubic=s=>W7.storeFromCubic(s,core)??Infinity; /* W17 D-140：排序入参与显示同一数 */ /* D-98：无需求态排序用门店均价（与显示同一数；原为可租仓最低立方价） */
  let stores=F.stores.filter(s=>s.city===st.city);
  if(matched)stores=[...stores.filter(s=>s.status==='open'&&storeOffer(s)),...stores.filter(s=>!(s.status==='open'&&storeOffer(s)))];
  if(filters.services.length)stores=stores.filter(s=>filters.services.every(v=>(s.serviceTags||[]).includes(v)));
  if(filters.maxKm!==null)stores=stores.filter(s=>displayedKm(s)<=Number(filters.maxKm));
  if(filters.quick.includes('promo'))stores=stores.filter(s=>P.storePromotionTag(s)==='特价仓');
  if(filters.quick.includes('moving'))stores=stores.filter(s=>W7.freeTransport(displayedKm(s),r.term_confirmed?r.term_months:null)); /* W24 D-173：原为 moving_campaign_eligible（夹具里没有门店带这个标记） */
  if(filters.sort==='recommended'&&!matched){const active=stores.filter(s=>s.status==='open');stores=[...REC.rank(active,{distanceVerified:demo,costOf:cubic}).items,...stores.filter(s=>!active.includes(s))];}
  if(filters.sort==='recommended'&&matched){const matching=stores.filter(s=>s.status==='open'&&storeOffer(s)),other=stores.filter(s=>!matching.includes(s));
    const entries=matching.map(s=>{const ids=storeOffer(s);return {store:s,ids,volume:ids.reduce((n,id)=>n+(unitById(id)?.volume||0),0)};}).sort((a,b)=>(a.volume-r.capacity_m3)-(b.volume-r.capacity_m3)||recCost(a.ids)-recCost(b.ids));
    stores=[...REC.rank(entries,{distanceVerified:demo,costOf:row=>recCost(row.ids)}).items.map(x=>x.store),...other];}
  if(filters.sort==='distance')stores.sort((a,b)=>displayedKm(a)-displayedKm(b));
  if(filters.sort==='price'){const vp=s=>{if(!matched)return cubic(s);const first=core.matchingUnits(s.id).filter(u=>s.status==='open'&&core.available(u)).sort((a,b)=>a.volume-b.volume)[0];return first?core.amounts([first.id],r.term_months).rent_total:Infinity;};stores.sort((a,b)=>vp(a)-vp(b)||displayedKm(a)-displayedKm(b));}
  const rowsFor=s=>(matched?core.matchingUnits(s.id):F.units.filter(u=>u.store_id===s.id)).filter(u=>core.available(u)&&s.status==='open').sort((a,b)=>a.volume-b.volume);
  if(filters.sort==='recommended'){const eligible=stores.filter(s=>rowsFor(s).length>0),unavailable=stores.filter(s=>!rowsFor(s).length);
    stores=[...REC.rank(eligible,{distanceVerified:demo,costOf:s=>matched?(storeOffer(s)?core.amounts(storeOffer(s),term).rent_total:Infinity):cubic(s)}).items,...unavailable];}
  /* D-99 接近：该店没有不小于需求的仓位时，取比需求小且差额 ≤20% 的最大可租仓 */
  const nearFor=s=>matched&&s.status==='open'?F.units.filter(u=>u.store_id===s.id&&core.available(u)&&W7.fit(u.volume,r.capacity_m3).state==='near').sort((a,b)=>b.volume-a.volume):[];
  if(matched){const rank=x=>rowsFor(x).length?0:nearFor(x).length?1:2;stores=stores.map((x,n)=>[x,n]).sort((A,B)=>rank(A[0])-rank(B[0])||A[1]-B[1]).map(A=>A[0]);} /* 有匹配 → 接近 → 无匹配，组内保持原排序 */
  const limit=Math.max(2,Math.min(50,filters.visibleLimit));
  return {all:stores,stores:stores.slice(0,limit),canLoadMore:stores.length>limit,rowsFor,nearFor,matched,r,term};
}
function headHtml(s,tagLimit,pres){const km=kmText(s);
  return '<img class="ph" src="'+photoOf(s)+'" alt=""><div><div class="name" title="'+esc(s.name)+'">'+esc(s.name)+'</div><div class="meta"><span class="ellip">'+esc(s.address)+'</span>'+(km?'<b>'+km+'</b>':'')+'</div><div class="tags">'+(W7.freeTransport(displayedKm(s))?'<span class="tag promo">'+W7.FREE_TRANSPORT.tag+'</span>'+tagsHtml(pres.tags(s,Math.max(1,tagLimit-2))):tagsHtml(pres.tags(s,tagLimit)))+'</div></div>';}
function standardCard(s,ctx,core,P,pres){
  const rows=ctx.rowsFor(s);
  if(ctx.matched&&!ctx.noMatchPage){
    const near=rows.length?[]:ctx.nearFor(s);
    if(!rows.length&&!near.length)return el('<a class="card scard nomatch" href="#S02" data-store="'+esc(s.id)+'">'+headHtml(s,3,pres)+'<div class="foot"><div class="soldout">'+(s.status!=='open'?'暂停营业':'该店暂无匹配仓位')+'</div>'+ico('i-chev','ico chev')+'</div></a>');
    const isNear=!rows.length,u=isNear?near[0]:rows[0],a=core.amounts([u.id],ctx.r.term_months),rule=F.pricing.termRules.find(x=>ctx.r.term_months>=x.min&&ctx.r.term_months<=x.max),base=core.state().prices[u.id]??u.base_month;
    const factor=Number(rule?.factor),eligible=Number.isFinite(factor)&&factor>0&&factor<1&&Math.abs(Number(a.monthly_average)-Math.trunc(base*factor))<=.011;
    const tag=a.unit_special_price>0?'<span class="tag promo">特价仓</span>':eligible?'<span class="tag disc">'+Number((factor*10).toFixed(1))+'折</span>':'';
    const facts=P.facts(u),usage=P.describe(u,'S01').lines[0],area=window.SIM_SPACE_UNIT.unitAreaSuffix(u);
    const more=(isNear?near:rows).length-1; /* D-100 S01 每卡 1 行 +「另有 N 个可租」 */
    return el('<article class="card scard'+(isNear?' near':'')+'" data-store="'+esc(s.id)+'" data-unit="'+esc(u.id)+'" data-fit="'+(isNear?'near':'matched')+'">'+headHtml(s,3,pres)+
      '<div class="unit"><b>'+esc(u.demo_cabin_no||u.code)+'</b><span>·</span><b>'+esc(u.volume)+'m³</b>'+(isNear?'<span class="nearfit">'+esc(W7.fit(u.volume,ctx.r.capacity_m3).text)+'</span>':'')+(area?'<span>· '+esc(area)+'</span>':'')+'<span>· '+esc(usage)+'</span>'+''+(more>0?'<a class="moreunits" href="#S02">另有 '+more+' 个可租 · 查看门店 ›</a>':'')+'</div>'+
      '<div class="foot"><div>'+priceHtml(fmtNum(a.monthly_average),'/月',tag)+'<div class="price-sec">整期 '+money(a.rent_total)+' · '+ctx.r.term_months+'个月</div></div>'+(isNear?'<a class="btn secondary card-cta" href="#S02" data-action="store">查看仓位</a>':'<button type="button" class="btn primary card-cta" data-action="choose" data-value="'+esc(u.id)+'">立即下单</button>')+'</div></article>');
  }
  /* 无需求（及无匹配页的浏览卡）：门店均价，不带「起」（D-90 / D-98）；停业门店单独表述（R-B-16） */
  return el('<a class="card scard browse" href="#S02" data-store="'+esc(s.id)+'">'+headHtml(s,3,pres)+'<div class="foot"><div>'+(s.status!=='open'?'<div class="soldout closed">暂停营业</div>':(!ctx.noMatchPage&&!availRows(core,s).length)?'<div class="price"><span class="unit">暂无可租仓位</span></div>':avgPriceHtml(s,core))+'</div>'+(s.status==='open'&&!ctx.noMatchPage?capRange(core,s):'')+ico('i-chev','ico chev')+'</div></a>');
}
/* D-92 紧凑卡也显示价格：无需求 = 均价；有需求 = 匹配仓整期价 */
function compactCard(s,ctx,core,pres){const km=kmText(s),rows=ctx.rowsFor(s),near=ctx.matched&&!rows.length?ctx.nearFor(s):[];let line;
  if(s.status!=='open')line='<div class="soldout closed">暂停营业</div>';
  else if(ctx.matched&&!ctx.noMatchPage){const u=rows[0]||near[0];
    if(u){const a=core.amounts([u.id],ctx.r.term_months);line='<div class="cprice">'+priceHtml(fmtNum(a.monthly_average),'/月')+'<span class="cmeta">'+esc(u.volume)+'m³ · '+ctx.r.term_months+'个月 '+money(a.rent_total)+(rows[0]?'':' · '+esc(W7.fit(u.volume,ctx.r.capacity_m3).text))+'</span></div>';}
    else line='<div class="soldout nomatch">该店暂无匹配仓位</div>';}
  else line=(!ctx.noMatchPage&&!availRows(core,s).length)?'<div class="soldout nomatch">暂无可租仓位</div>':'<div class="cprice">'+avgPriceHtml(s,core)+(ctx.noMatchPage?'':capRange(core,s))+'</div>';
  return el('<a class="card scard compact" href="#S02" data-store="'+esc(s.id)+'"><img class="ph" src="'+photoOf(s)+'" alt=""><div><div class="name" title="'+esc(s.name)+'">'+esc(s.name)+'</div><div class="tags">'+(W7.freeTransport(displayedKm(s))?'<span class="tag promo">'+W7.FREE_TRANSPORT.tag+'</span>'+tagsHtml(pres.tags(s,1)):tagsHtml(pres.tags(s,2)))+'</div><div class="meta"><span class="ellip">'+esc(s.address)+'</span>'+(km?'<b>'+km+'</b>':'')+'</div>'+line+'</div>'+ico('i-chev','ico chev')+'</a>');}
const estoreCard=()=>el('<a class="card ecard" href="#ESTORE"><div><div class="k">上门取送</div><div class="t">考拉E存</div><div class="a">了解服务 ›</div></div><img src="../assets/mini_split.jpg" alt="考拉E存上门取送服务"></a>');
const skStandard=()=>el('<div class="card scard" aria-hidden="true"><div class="sk ph"></div><div><div class="sk" style="height:16px;width:60%"></div><div class="sk" style="height:12px;width:90%;margin-top:8px"></div><div class="sk" style="height:20px;width:40%;margin-top:8px"></div></div><div class="unit"><div class="sk" style="height:12px;width:80%"></div></div><div class="foot"><div class="sk" style="height:24px;width:96px"></div><div class="sk" style="height:40px;width:104px"></div></div></div>');
const skCompact=()=>el('<div class="card scard compact" aria-hidden="true"><div class="sk ph"></div><div><div class="sk" style="height:14px;width:55%"></div><div class="sk" style="height:12px;width:85%;margin-top:8px"></div></div></div>');
/* R-B-16：无筛选时不出「清除筛选」，改「修改需求」；同句只在这里出现一次 */
const emptyState=filtered=>el('<section class="card empty" role="status"><div class="pic">'+ico('i-box')+'</div><h4>当前需求暂无可租仓位</h4><p>可调整容量或租期，或由顾问协助寻找合适仓位</p><div class="acts">'+(filtered?'<button type="button" class="btn neutral md" data-action="clearFilters">清除筛选</button>':'<button type="button" class="btn neutral md" data-action="editDemand">修改需求</button>')+'<button type="button" class="btn primary md" data-action="advisor">顾问帮我找仓</button></div></section>');
/* D-101：≥30m³ 不做自助匹配，直接交销售（个人 / 企业同） */
const salesState=()=>el('<section class="card empty sales" role="status"><div class="pic">'+ico('i-box')+'</div><h4>'+W7.SALES_CAP_M3+'m³ 及以上的需求由顾问为您配置方案</h4><p>顾问会按物品与租期组合仓位并确认费用。提交后'+esc(W7.LEAD_COPY.inHours)+'</p><div class="acts"><button type="button" class="btn neutral md" data-action="editDemand">修改需求</button><a class="btn primary md" href="booking.html?mode=advisor" data-action="advisor">提交给顾问</a></div><p class="hours">'+esc(W7.LEAD_COPY.hoursNote)+'；非服务时段提交的：'+esc(W7.LEAD_COPY.offHours)+'</p></section>');
/* D-97：顾问卡，一页一次，列表之后，不拦截自助下单 */
const advisorCard=big=>el('<div class="advisor" id="advisor-card"><div><div class="t">'+W7.advisorCopy(big).t+'</div><div class="s">'+W7.advisorCopy(big).s+'</div></div><a class="btn secondary md" href="booking.html?mode=advisor" data-action="advisor">预约顾问</a></div>');
function overlay(kind,ctx){
  if(kind==='demand'){ /* R-B-21 / R-B-29 统一租期 / 容量组件（契约 §3） */
    const m2=q.get('unit')==='m2'||ctx.r.input_unit==='m2',cap=ctx.r.capacity_m3,H=window.MK_VOLUME_MODEL?window.MK_VOLUME_MODEL.LAYER_HEIGHT_M:2.4,areaV=cap?+(cap/H).toFixed(2):'',term=ctx.r.term_confirmed?ctx.r.term_months:null,preset=W7.TERM_PRESETS.includes(term);
    const chip=(on,inner,attr)=>'<button type="button" class="chipwrap" aria-pressed="'+on+'" '+attr+'><span class="chip'+(on?' on':'')+'">'+inner+'</span></button>';
    return el('<div class="scrim" role="dialog" aria-modal="true" aria-label="修改需求"><div class="sheet"><div class="grab"></div><h4>修改需求</h4>'+
      '<div class="field"><label>预计容量</label><div class="cappick"><div class="row"><div class="input focus">'+(m2?areaV:(cap??''))+'<span class="suffix">'+(m2?'㎡':'m³')+'</span></div><div class="units" role="group" aria-label="单位">'+chip(!m2,'m³','data-unit="m3"')+chip(m2,'㎡','data-unit="m2"')+'</div></div>'+(m2&&areaV?'<div class="conv">约 '+(+(areaV*H).toFixed(1))+' m³</div>':'')+'<div class="note">估算值，以实际仓位为准</div></div></div>'+
      '<div style="height:12px"></div><div class="field"><label>租期</label>'+W7.termSeg(term||W7.TERM_DEFAULT)+'</div>'+
      '<div class="acts"><button type="button" class="btn neutral">取消</button><button type="button" class="btn primary">'+(cap?'更新推荐':'查看门店')+'</button></div></div></div>');}
  if(kind==='filter')return el('<div class="scrim" role="dialog" aria-modal="true" aria-label="排序"><div class="sheet"><div class="grab"></div><h4>排序</h4><div class="opt on">综合排序'+ico('i-check','ico sm')+'</div><div class="opt">距离优先</div><div class="opt">价格优先</div><div class="acts"><button type="button" class="btn neutral">取消</button><button type="button" class="btn primary">确定</button></div></div></div>');
  return null;
}
function renderS01(){
  const key=q.get('state')||'browse',cfg=S01_STATES[key];
  if(!cfg){document.body.prepend(el('<p style="padding:16px;color:#B42318">未知状态 '+esc(key)+'；可用：'+Object.keys(S01_STATES).join(' / ')+'</p>'));return;}
  let core=makeCore();core.setScenario(cfg.scenario);
  const reqOverride=q.get('cap')&&key!=='near'?{capacity_m3:Number(q.get('cap')),term_months:Number(q.get('term'))||6,term_confirmed:true}:cfg.requirement;
  if(reqOverride){const st=core.state();st.requirement={...st.requirement,...reqOverride};core=makeCore(st);}
  const {P,pres}=policies(core),filters={...DEFAULT_FILTERS,...(cfg.filters||{}),visibleLimit:cfg.visibleLimit||10};
  const ctx=s01Stores(core,P,filters),list=document.getElementById('list');
  const filtered=filters.sort!=='recommended'||filters.maxKm!==null||filters.services.length>0||filters.quick.length>0;
  const sales=ctx.matched&&W7.salesOnly(ctx.r.capacity_m3);
  document.getElementById('city').textContent=core.state().city;
  document.body.dataset.state=key;document.body.dataset.scenario=cfg.scenario;document.body.dataset.matchMode=sales?'sales':ctx.matched?'matched':'browse';
  /* filter bar + chips (existing labels: app.js snapshot.filterLabels) */
  const labels=[filters.sort==='price'?'价格优先':filters.sort==='distance'?'距离优先':'排序',filters.maxKm!==null?filters.maxKm+'km内':'距离',filters.services.length?'已选服务':'服务'];
  const active=[filters.sort!=='recommended',filters.maxKm!==null,filters.services.length>0];
  document.querySelectorAll('#filterbar button').forEach((b,i)=>{b.firstChild.nodeValue=labels[i];b.classList.toggle('active',active[i]);b.setAttribute('aria-pressed',String(active[i]));});
  document.querySelectorAll('#chips .chip').forEach(c=>{const on=filters.quick.includes(c.dataset.quick);c.classList.toggle('on',on);c.closest('button').setAttribute('aria-pressed',String(on));if(on)c.insertAdjacentHTML('afterbegin',ico('i-check','ico sm'));});
  /* demand strip */
  const cap=window.SIM_SPACE_UNIT.demandCapacity(ctx.r);
  document.getElementById('dstrip-text').innerHTML=ctx.matched?'已选需求：<span class="v">'+esc(cap||ctx.r.capacity_m3+'m³')+' · '+ctx.r.term_months+'个月</span>':'不确定用多大仓？';
  document.getElementById('dstrip-btn').textContent=ctx.matched?'修改需求':'立即估算';
  const rl=document.getElementById('result-line');
  const moreRow=document.getElementById('more-row');moreRow.hidden=true;moreRow.style.display='none'; /* R-B-17：hidden 会被 display:flex 覆盖，用 style 控制 */
  if(cfg.skeleton){rl.hidden=true;list.append(skStandard(),skStandard(),estoreCard(),skCompact(),skCompact());document.body.setAttribute('aria-busy','true');}
  else if(sales){rl.hidden=true;['filterbar','chips'].forEach(id=>document.getElementById(id).style.display='none');list.append(salesState(),estoreCard());}
  else{
    rl.textContent='共'+ctx.all.length+'家门店'+(ctx.all.length>ctx.stores.length?' · 已显示前'+ctx.stores.length+'家':'');
    const hasAvailable=ctx.stores.some(s=>ctx.rowsFor(s).length||ctx.nearFor(s).length);
    const noMatch=!ctx.stores.length||(ctx.matched&&!hasAvailable);
    ctx.noMatchPage=noMatch;
    if(noMatch){list.append(emptyState(filtered),estoreCard());if(ctx.stores.length){rl.textContent='可先浏览附近门店';list.append(el('<h3 class="browse-h">附近门店</h3>'));}}
    ctx.stores.forEach((s,i)=>{if(i===2&&!noMatch)list.append(estoreCard());list.append(i<2?standardCard(s,ctx,core,P,pres):compactCard(s,ctx,core,pres));});
    if(ctx.stores.length<=2&&!noMatch)list.append(estoreCard());
    if(!noMatch&&ctx.canLoadMore){moreRow.hidden=false;moreRow.style.display='';}
    /* D-97 顾问卡：按需求容量与首位匹配仓位的整期租金判定 */
    if(ctx.matched&&!noMatch){const s0=ctx.stores.find(s=>ctx.rowsFor(s).length),u0=s0&&ctx.rowsFor(s0)[0],rent=u0?core.amounts([u0.id],ctx.r.term_months).rent_total:0;
      if(W7.advisorNeeded(ctx.r.capacity_m3,rent)){moreRow.after(advisorCard(W7.bigDeal(ctx.r.capacity_m3,rent)));document.body.dataset.advisor='1';}}
    fitTags(list);
  }
  const ov=q.get('overlay');if(ov){const o=overlay(ov,ctx);if(o)document.getElementById('overlay-root').append(o);}
  window.__W1={page:'S01',state:key,matched:ctx.matched,requirement:ctx.r,filters,visible:ctx.stores.map(s=>s.id),total:ctx.all.length,publicTerm:PUBLIC_TERM,
    sales,firstTwo:ctx.stores.slice(0,2).map(s=>({id:s.id,rows:ctx.rowsFor(s).map(u=>u.id),near:ctx.nearFor(s).map(u=>u.id),fromCubic:W7.storeFromText(s)}))};
}
try{if(PAGE==='H01')renderH01();else if(PAGE==='S01')renderS01();}catch(e){console.error(e);document.body.prepend(el('<p style="padding:16px;color:#B42318">渲染失败：'+esc(e.message)+'</p>'));}
})();
