/* VIS-REDESIGN-01A · W6 binder · 2026-11-17
 * Thin data binder for T7 账户与记录 (D-36 方案 A 单一「我的」, 张坤 2026-11-17):
 *   M01  = Tab「我的」首页 (?state=<H01_STATE_POLICY key>|ended)
 *   OH01 = 订单记录 (?state=empty|single|mixed|ended)
 *   ACC  = 13 个二级页 (acc.html?view=…&state=…[&overlay=…][&review=1])
 * Every page state is built through the UNMODIFIED runtime in ../runtime/ (fixtures scenarios, demo-core quote → submit → pay,
 * claimCoupons / saveLead / saveEnterpriseLead / saveAdvisorLead / editLead / withdrawLead / setContact / saveSupport /
 * requestTransport / requestIdentityVerification / identity / lifecycleView / readMessages, H01_STATE_POLICY.derive +
 * accessDecision, MK_LIFECYCLE_CONTRACT_V1.history). Copy, label maps and rules are PORTed verbatim from
 * m01-rebaseline-01.js (renderHome / activeAssets / demandInfo / names), account.js (titles / statusName / errors / view copy)
 * and app.js (orderBrief / readableOrderNo / cabinLabel); the H01 DemandCard is the W1 component (same markup, same data).
 * Nothing is invented; every deleted sentence and every new label is registered in W6_Report.md (D-63 …). */
(function(){
'use strict';
const F=window.SIM_FIXTURES,q=new URLSearchParams(location.search),PAGE=document.body.dataset.page,REVIEW=q.get('review')==='1',OVL=q.get('overlay')||'';
const W7=window.MK_W7,CS_TEL=window.MK_CONTRACT.t('service.hotline').replace(/-/g,''),OFFHOURS=q.get('offhours')==='1'; /* W7：共用规则 model/w7-rules.js；CS_TEL = S02 既有 400 客服电话 */
const PHONE='13800138000',UNIT='SIM_BJ01_U03',FAV_KEY='mk_visual_align_ui_v1'; /* FAV_KEY: runtime favourites storage contract (m01-rebaseline-01.js readFavorites) */
const money=n=>'¥'+Math.trunc(Number(n)).toLocaleString('zh-CN');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const el=html=>{const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild;};
const ico=(id,cls='ico')=>'<svg class="'+cls+'"><use href="#'+id+'"/></svg>';
const makeCore=state=>window.SIM_CORE.create(state?{state}:{});
const authorize=c=>{c.requestPhone();c.resolvePhone('success',{phone:PHONE});};
const tomorrow=()=>new Date(Date.now()+8*3600*1000+86400000).toISOString().slice(0,10);
const storeById=id=>F.stores.find(s=>s.id===id);
const unitById=id=>F.units.find(u=>u.id===id);
const photoOf=s=>'../assets/'+s.photo;
const r3Tier=n=>n<=1.5?'mini':n<=5?'small':n<=15?'medium':'large';
const thumb=u=>'../assets/unit-r3/unit-r3-'+r3Tier(Number(u?.volume)||0)+'-336x312.webp';
const cabinLabel=u=>{const no=u?.demo_cabin_no;return no?no+' · '+u.volume+'m³':(u?.name||'仓位方案');}; /* PORT app.js cabinLabel */
const orderNo=o=>{const d=(o?.createdAt?dateOf(o.createdAt):(o?.start_date||F.demoToday||'')).replace(/-/g,''),m=String(o?.id||'').match(/[0-9]+$/),n=m?Number(m[0])%10000:Array.from(String(o?.id||'')).reduce((a,ch)=>(Math.imul(a,31)+ch.charCodeAt(0))>>>0,0)%10000;return 'MK'+d+String(n).padStart(4,'0');}; /* W7 收口：与 O03（w4-render.js orderNo）同格式同算法：MK + 下单日 8 位 + 内部 ID 数字尾号后 4 位 */
const accessHours=s=>{if(s.access_hours)return s.access_hours;let h=2166136261;for(const c of String(s.id)){h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;}return ['24小时','09:00-21:00','08:00-23:00'][h%3];}; /* = w2-render.js accessHours */
const dateOf=ms=>new Date(Number(ms)+8*3600*1000).toISOString().slice(0,10);
const countdown=exp=>{const r=Math.max(0,Math.ceil((Number(exp)-NOW())/1000));const p=n=>String(n).padStart(2,'0');return p(Math.floor(r/3600))+':'+p(Math.floor(r%3600/60))+':'+p(r%60);};
const mask=p=>String(p||'').replace(/(\d{3})\d{4}(\d{4})$/,'$1****$2'); /* PORT m01 / account.js */
let NEW_DEMAND=null; /* 演示夹具标记，同 w1-render.js */
let NOW_OFFSET=0;const NOW=()=>Date.now()+NOW_OFFSET;
const storeName=o=>storeById(o.store_id)?.name||'已选择门店'; /* PORT app.js orderStoreName */
const unitName=o=>(o.unit_ids||[]).map(id=>cabinLabel(unitById(id))).join('、'); /* PORT app.js orderUnitName */
const history=s=>window.MK_LIFECYCLE_CONTRACT_V1.history(s);
const derive=(core,now)=>window.H01_STATE_POLICY.derive(core.state(),core,now);
/* ---- label maps (PORT app.js / lifecycle-ui.js / m01-rebaseline-01.js / account.js) ---- */
const L={
  order:{paid_simulated:'已支付',pending:'待支付',payment_failed:'支付失败',payment_cancelled:'支付已取消',cancelled:'已取消',expired:'已过期',invalidated:'已失效'},
  lease:{upcoming:'待起租',active:'租用中',returning:'退仓处理中',ended:'已退仓',expired:'租期已到期'},
  deposit:{HELD:'押金保管中',WAITING_INSPECTION:'待验仓',REFUND_PENDING:'退款处理中',REFUND_FAILED:'退款处理暂未完成',REFUNDED:'已退还'},
  lead:{saved_locally:'已提交，待顾问联系',withdrawn:'已撤回',submitted_simulated:'已提交，待顾问联系',awaiting_advisor:'待顾问确认',requested_locally:'已提交，待顾问联系'} /* W7 R-A-11：受理口径统一（D-95） */,
  coupon:{AVAILABLE:'可使用',SELECTED:'已选择',REDEEMED:'已使用',LOCKED:'已锁定',EXPIRED:'已过期',INVALID:'不可用'},
  benefit:{ELIGIBILITY_PENDING:'下单时可用',ELIGIBLE:'可使用',RESERVED:'已锁定',FULFILLED:'已履约',INELIGIBLE:'不适用'},
  gift:{SUBMITTED:'待审批',APPROVED:'已批准',ATTACHED_TO_QUOTE:'已加入报价',LOCKED_TO_ORDER:'已锁定',GRANTED:'已记录',REJECTED:'未通过'},
  identity:{pending:'待认证',reviewing:'认证中',verified:'已通过',failed:'未通过，可重试'},
  transport:{awaiting_advisor:'待顾问确认'},support:{saved_locally:'已提交，待顾问联系'}
};
const lab=(k,v)=>L[k][v]||'办理中';
const ERR={PAID_ORDER_REQUIRED:'需要已付款订单才能办理此项服务',ORDER_NOT_FOUND:'未找到这笔订单，请从订单列表进入',TRANSPORT_FIELDS:'请填写运输地址并选择有效日期',TRANSPORT_ADDRESS:'请填写取送地址',TRANSPORT_DATE:'请选择有效的运输日期',ENTER_QUESTION:'请填写咨询内容',ENTER_PHONE:'请填写有效联系电话',LEAD_WITHDRAWN:'该需求已撤回',IDENTITY_REQUIRED:'请先完成实名认证',BEFORE_START:'尚未到起租日期，可先查看指引'}; /* PORT account.js errors */
const COUPON_COND={'CPN-001':'首次租仓，整期租金满2000元','CPN-002':'首次租仓，租期满12个月','CPN-004':'续租满6个月'}; /* PORT account.js coupons() */
const TONE={ok:['paid_simulated','active','upcoming','REDEEMED','FULFILLED','verified','AVAILABLE','ELIGIBLE','APPROVED','HELD','REFUNDED','submitted_simulated'],warn:['pending','returning','LOCKED','SELECTED','RESERVED','ELIGIBILITY_PENDING','reviewing','awaiting_advisor','saved_locally','requested_locally','REFUND_PENDING','WAITING_INSPECTION','SUBMITTED','ATTACHED_TO_QUOTE','LOCKED_TO_ORDER','GRANTED'],err:['payment_failed','failed','REFUND_FAILED','REJECTED','expired_lease'],info:['expired','cancelled','payment_cancelled','invalidated','ended','withdrawn','EXPIRED','INVALID','INELIGIBLE','pending_identity']};
const tone=v=>TONE.ok.includes(v)?'ok':TONE.warn.includes(v)?'warn':TONE.err.includes(v)?'err':'info';
const stag=(text,v)=>'<span class="tag status '+tone(v)+'">'+esc(text)+'</span>';
/* ---- shared blocks (same helpers as W2–W5) ---- */
const body=()=>document.getElementById('body');
function sheet(title,inner){return el('<div class="scrim" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><div class="sheet"><div class="grab"></div><h4>'+esc(title)+'</h4>'+inner+'</div></div>');}
function dialog(title,p,acts){return el('<div class="scrim center" role="alertdialog" aria-modal="true"><div class="dialog"><h4>'+esc(title)+'</h4><p>'+p+'</p><div class="acts">'+acts+'</div></div></div>');}
function toast(msg){document.getElementById('toast-root').append(el('<div class="toastwrap" role="status"><div class="toast">'+esc(msg)+'</div></div>'));}
function actbar(html,cls=''){document.getElementById('screen').classList.add('has-actbar');document.getElementById('actbar-root').append(el('<div class="actbar'+(cls?' '+cls:'')+'" role="region" aria-label="底部操作区">'+html+'</div>'));}
const overlay=node=>document.getElementById('overlay-root').append(node);
const btn=(label,cls,action,extra='')=>'<button type="button" class="btn '+cls+'" data-action="'+esc(action)+'"'+extra+'>'+esc(label)+'</button>';
const emptyState=(icon,title,sub,acts)=>el('<section class="card empty" role="status"><div class="pic">'+ico(icon)+'</div><h4>'+esc(title)+'</h4>'+(sub?'<p>'+esc(sub)+'</p>':'')+(acts?'<div class="acts">'+acts+'</div>':'')+'</section>');
const kv=(k,v,cls='')=>'<div class="kv"><span class="k">'+esc(k)+'</span><span class="v'+(cls?' '+cls:'')+'">'+v+'</span></div>';
const field=(label,inner,err,opt)=>'<div class="field"><label>'+esc(label)+(opt?'<span class="opt">（可选）</span>':'')+'</label>'+inner+(err?'<div class="ferr">'+esc(err)+'</div>':'')+'</div>';
const input=(val,ph,suffix,err,aria)=>'<div class="input'+(err?' err':'')+'" role="textbox" aria-label="'+esc(aria||ph)+'"><span class="ph'+(val?' filled':'')+'">'+esc(val||ph)+'</span>'+(suffix||'')+'</div>';
const seg=(opts,on,action)=>'<div class="seg" role="radiogroup">'+opts.map(([v,t])=>'<button type="button" role="radio" aria-checked="'+(v===on)+'" class="'+(v===on?'on':'')+'" data-action="'+action+'" data-value="'+v+'">'+esc(t)+'</button>').join('')+'</div>';
const steps=(items,cur,fail)=>'<ol class="steps">'+items.map((it,i)=>{const n=i+1,cls=fail===n?'fail':n<cur?'done':n===cur?'cur':'';return '<li class="'+cls+'"><span class="dot">'+(cls==='done'?ico('i-check'):cls==='fail'?ico('i-close'):'')+'</span><div><div class="t">'+esc(it[0])+'</div>'+(it[1]?'<div class="s">'+it[1]+'</div>':'')+'</div></li>';}).join('')+'</ol>';
const unknown=(key,obj)=>document.body.prepend(el('<p style="padding:16px;color:#B42318">未知状态 '+esc(key)+'；可用：'+Object.keys(obj).join(' / ')+'</p>'));
/* menu row (T7 ListRow: 主 14/600 · 副 13 · count badge · ›) */
const mrow=(icon,label,sub,href,count)=>'<a class="lrow" href="'+esc(href)+'"><span class="k">'+ico(icon,'ico lead')+esc(label)+'</span><span class="v ph">'+esc(sub||'')+'</span>'+(count?'<span class="badge">'+esc(String(count))+'</span>':'')+ico('i-chev','ico chev')+'</a>';
const section=(title,rows,extra='')=>el('<section class="card mlist" aria-label="'+esc(title)+'"><div class="sec-title">'+esc(title)+extra+'</div>'+rows+'</section>');
/* user card (M01 / profile): PORT m01 renderHome profile copy */
function ucard(state,withLink){const phone=state.account&&state.account.phone?String(state.account.phone):'';
  const paid=(state.orders||[]).some(o=>o.status==='paid_simulated'),signed=!!phone||paid; /* W7 R-A-26：已付款用户必为登录态 */
  return el('<section class="ucard" aria-label="账户"><span class="av" aria-hidden="true">'+ico('i-user')+'</span><div><div class="t">'+(signed?'我的迷你考拉':'欢迎使用迷你考拉')+'</div><div class="s">'+(phone?esc(mask(phone)):signed?'已登录':'查看订单与用仓服务')+'</div></div>'+(withLink?'<a class="lk" href="acc.html?view=profile&state='+(signed?'verified':'unverified')+'">个人信息'+ico('i-chev','ico sm')+'</a>':'')+'</section>');}
/* order summary card = W4 sumcard (same component) */
function sumcard(o,view,opts={}){
  const s=storeById(o.store_id),units=(o.unit_ids||[]).map(unitById),u=units[0];
  const period=view?view.start_date+' 至 '+view.end_date:o.start_date?'起租 '+o.start_date:'';
  return el('<section class="card sumcard" aria-label="订单仓位信息"><div class="store"><img class="ph" src="'+photoOf(s)+'" alt="'+esc(s.name)+'门店环境"><div><div class="name" title="'+esc(s.name)+'">'+esc(s.name)+'</div><div class="meta"><span class="ellip">'+esc(s.address)+'</span></div></div></div>'+
    '<div class="unit"><img class="ph" src="'+thumb(u)+'" alt="仓位空间示意"><div><div class="name">'+esc(units.map(cabinLabel).join(' + '))+'</div><div class="meta"><span>'+esc(u.dimensions)+'</span>'+(opts.status?stag(opts.status[0],opts.status[1]):'')+'</div></div></div>'+
    (opts.noKv?'':'<div class="kvlist">'+kv('租期',(view?view.total_months:o.term_months)+'个月')+(period?kv(view?'起止日期':'用仓开始',period):'')+kv('订单号',orderNo(o))+'</div>')+'</section>');
}
/* ======================= H01 DemandCard · PORT w1-render.js (same markup, same data; CSS .dcard) ======================= */
const KICKER={pending:'当前订单',payment_failed:'订单状态',expired:'订单状态',cancelled:'订单状态',invalidated:'订单状态',estimated:'找仓进度',selected:'找仓进度',booking:'预约用仓',identity:'入仓服务',upcoming:'入仓服务',active:'我的仓位',expiring:'我的仓位',renewal:'我的仓位',returning:'退仓服务',lease_expired:'退仓服务',refund:'押金服务'};
const HELP={pending:['付款帮助','关闭支付窗口不会取消订单；请在付款有效期内继续支付。'],payment_failed:['付款帮助','订单与仓位保留至支付截止时间，截止前可继续支付。'],expired:['超时订单说明','原订单已失效，重新选择仓位后再付款。'],identity:['入仓前准备','这笔订单下单时未完成实名认证，完成后起租日起可入仓存取。'],upcoming:['首次入仓须知','起租日开放存取，提前查看门店位置和存取时间。'],active:['门店使用须知','存取时核对仓号，离开前请确认仓门已关好。'],expiring:['到期办理提醒','到期前可办理续租；退仓时需清空并申请验仓。'],renewal:['续租办理提醒','续租报价 24 小时内有效，过期后按常规折扣价续租。'],returning:['退仓与验仓','仓内物品清空后申请验仓，押金以审核结果为准。'],lease_expired:['退押金办理','先完成退仓和门店验仓，再办理押金退还。'],refund:['退款进度','押金退还进度可在订单详情查看。']};
const URGENT=['expired','payment_failed','invalidated','refund','returning','identity','expiring','lease_expired','cancelled'];
const areaReq=s=>{const r=(s&&s.requirement)||{};return r.input_unit==='m2'&&Number(r.input_value)>0?r:null;}; /* W26：㎡ 需求与 S5 需求摘要同写法，不显示层高 */
const capText=(s,cap)=>{const r=areaReq(s);return r?r.input_value+'㎡ · 约'+cap+'m³':cap+'m³';};
function factHtml([value,label]){const m=String(value).match(/^(¥?[\d,.]+)(m³|㎡|个月|天|万\+?|\+)?$/);
  const b=m?'<b>'+esc(m[1])+(m[2]?'<small>'+esc(m[2])+'</small>':'')+'</b>':'<b style="font-size:var(--mk-font-size-lg);white-space:normal">'+esc(value)+'</b>';
  return '<div>'+b+'<span>'+esc(label)+'</span></div>';}
/* ---- W7 任务卡两层（D-81，契约 docs/W7_Shared_Contracts.md §1）：render 层改写 policy 的标题 / 按钮 / 事实格；runtime policy 原件不动 ---- */
const STAGE={refund:6,returning:6,lease_expired:6,renewal:6,expiring:6,active:6,identity:5,upcoming:5,pending:4,payment_failed:4,selected:3,estimated:2,booking:1.5,expired:1,cancelled:1,invalidated:1};
const FLUFF=new Set(['以订单记录为准','待确认','待处理','起租日生效','已过期','已取消','报价已失效','原仓位已释放']); /* R-A-28：事实格只放事实 */
const hms=ms=>{const r=Math.max(0,Math.ceil(ms/1000));const p=n=>String(n).padStart(2,'0');return p(Math.floor(r/3600))+':'+p(Math.floor(r%3600/60))+':'+p(r%60);};
const payDeadline=o=>Number(o.expiresAt)>0?Number(o.expiresAt):Number(o.createdAt||NOW())+W7.PENDING_TTL_H*3600*1000; /* D-96：下单起 3 小时，失败不重新计时 */
function w7Task(task,state,core){
  const t={...task,facts:(task.facts||[]).filter(([v])=>!FLUFF.has(String(v))).map(([v,l])=>[v,l==='首次应付'?'本次应付':l])},k=t.key,o=t.orderId&&state.orders.find(x=>x.id===t.orderId);
  if((k==='estimated'||k==='selected')&&areaReq(state)){const r=areaReq(state);t.facts=t.facts.map(([v,l])=>/^[\d.]+m³$/.test(String(v))?[r.input_value+'㎡','预计面积 · 约'+v]:[v,l]);}
  const set=(title,p,s2)=>{if(title)t.title=title;t.primary=p;t.secondary=s2||null;};
  if(k==='pending')set('订单待支付',['继续支付','order'],['费用明细','fees']);
  else if(k==='payment_failed'){set('支付未成功，订单为您保留',['继续支付','order'],['更换仓位','restart']);t.badge='待支付';t.expiresAt=payDeadline(o);t.facts=[[money(o.payable),'本次应付'],[hms(t.expiresAt-NOW()),'支付剩余时间']];}
  else if(k==='expired'){set('订单已超时',['重新找仓','restart']);t.badge='已超时';}
  else if(k==='cancelled'){set('订单已取消',['重新找仓','restart']);t.badge='已取消';}
  else if(k==='invalidated'){set('报价已失效',['重新找仓','restart']);t.badge='已失效';}
  else if(k==='identity'){set('入仓前需完成验证',['完成实名认证','verify'],['门店导航','navigate']);t.facts=t.facts.filter(([,l])=>l==='计划起租');}
  else if(k==='upcoming'){set('入仓准备',['门店导航','navigate'],['入仓指引','access']);const st=storeById(o.store_id);t.facts=[...t.facts.filter(([,l])=>l==='计划起租'),...(st?[[accessHours(st),'存取时间']]:[])];}
  else if(k==='active')set(null,['一键开锁','unlock'],['门店导航','navigate']);
  else if(k==='expiring')set('租期即将到期',['办理续租','renew'],['一键开锁','unlock']);
  else if(k==='renewal'){let life=null;try{life=core.lifecycleView(o.id);}catch(_){}
    const req=(life?.renewal_requests||[]).find(x=>x.status==='QUOTE_READY');
    if(req){set('续租报价待确认',['确认续租报价','renew'],['一键开锁','unlock']);t.badge='待确认';
      const at=Number(req.quoted_at||req.quotedAt||req.updatedAt||req.createdAt),endMs=life?.end_date?Date.parse(life.end_date+'T16:00:00Z'):Infinity; /* D-102：截止取 24 小时与到期时刻的较早者 */
      const left=Number.isFinite(at)&&at>0?Math.min(at+W7.RENEW_QUOTE_TTL_H*3600*1000,endMs)-NOW():W7.RENEW_QUOTE_TTL_H*3600*1000;
      t.facts=[...(life?.end_date?[[life.end_date,'当前租期至']]:[]),...(Number.isFinite(req.quote_total)?[[money(req.quote_total),'续租报价']]:[]),[hms(left),'报价剩余时间']];}
    else{set('续租申请处理中',['查看续租进度','renew'],['一键开锁','unlock']);t.badge='办理中';}}
  else if(k==='returning')set('退仓处理中',['查看退仓进度','exit'],['门店导航','navigate']);
  else if(k==='lease_expired'){set('租期已到期',['办理续租','renew'],['办理退仓','exit']);t.facts=t.facts.filter(([,l])=>l==='租期截止');}
  else if(k==='refund')set('押金处理中',['查看押金进度','deposit'],['查看订单','order']);
  else if(k==='booking'){set('已提交预约',['查看预约','booking'],['浏览门店','browse']);t.badge='已提交';t.sub=W7.leadAck(OFFHOURS?new Date(Date.UTC(2026,0,1,15)):new Date(Date.UTC(2026,0,1,3)));} /* 演示固定取服务时段内文案；&offhours=1 取非服务时段文案 */
  return t;
}
/* 主卡 + 待办条带：主卡按服务阶段取，其余进条带（最多 2 条） */
function w7Plan(task,state,core){
  const recs0=(task.tasks||[]).slice();
  /* 演示夹具标记（同 w1 NEW_DEMAND）：已付款用户的新找仓需求，运行时 staleRequirement 屏蔽，R-A-07 代码侧放开 */
  if(NEW_DEMAND&&!recs0.some(r=>r.key==='estimated'||r.key==='selected'))recs0.push({key:'estimated',title:'继续查看仓位',badge:'已保存需求',sub:'已估算用仓需求',facts:[[NEW_DEMAND.capacity_m3+'m³','预计容量'],[NEW_DEMAND.term_months+'个月','租期']],primary:['查看推荐仓位','recommend'],secondary:['修改需求','estimate'],score:11,layout:'task',orderId:null,storeId:null});
  const recs=recs0.sort((a,b)=>(STAGE[b.key]||0)-(STAGE[a.key]||0)||b.score-a.score);
  if(!recs.length)return {main:task,todos:[],more:0};
  const m=recs[0],rental=recs.filter(x=>STAGE[x.key]===6);
  const main=w7Task({...task,...m,otherActiveCount:rental.filter(x=>x.orderId!==m.orderId).length},state,core);
  const todos=[],r=state.requirement||{};
  for(const x of recs.slice(1)){
    if((x.key==='pending'||x.key==='payment_failed')&&STAGE[m.key]>=5){const o=state.orders.find(y=>y.id===x.orderId);todos.push({a:'order',href:'o01.html?state='+x.key,k:'待支付订单',t:storeName(o)+' · '+(x.key==='pending'?'本次应付 '+money(o.payable)+'，剩余 ':'支付未成功，可继续支付'),exp:x.key==='pending'?payDeadline(o):0});}
    else if(x.key==='booking'&&!todos.some(y=>y.a==='booking'))todos.push({a:'booking',href:'acc.html?view=needs&state=list',k:'预约用仓',t:'已提交，'+W7.LEAD_COPY.inHours});
    else if((x.key==='selected'||x.key==='estimated')&&!todos.some(y=>y.a==='recommend'))todos.push({a:'recommend',href:'acc.html?view=progress&state='+(x.key==='selected'?'selected':'demand'),k:'找仓进度',t:(x.facts||[]).map(f=>f[0]).filter(v=>/^[\d.]+(m³|㎡|个月)$/.test(String(v))).join(' · ')+(x.key==='selected'?' · 已选仓位，去确认订单':'，查看推荐仓位')});
  }
  const rank={order:0,booking:1,recommend:2};todos.sort((a,b)=>rank[a.a]-rank[b.a]);
  return {main,todos:todos.slice(0,2),more:Math.max(0,todos.length-2),moreHref:'acc.html?view=progress&state=selected'};
}
const todoStrip=p=>p.todos.length?el('<div class="todo-strip" aria-label="待办">'+p.todos.map(x=>'<a class="todo-row" data-action="'+esc(x.a)+'" href="'+esc(x.href)+'"><span class="todo-k">'+esc(x.k)+'</span><span class="todo-t">'+esc(x.t)+(x.exp?'<span role="timer" aria-label="支付剩余时间" data-expires="'+x.exp+'">'+countdown(x.exp)+'</span>':'')+'</span>'+ico('i-chev','ico sm')+'</a>').join('')+(p.more?'<a class="todo-more" href="'+esc(p.moreHref)+'">还有 '+p.more+' 项待办</a>':'')+'</div>'):null;
function demandCard(task,state,opts={}){
  const k=task.key,store=task.storeId?storeById(task.storeId):null,name=store?.name||'';
  const variant=(k==='pending'||k==='payment_failed')?'strong':(k==='active'||k==='expiring')?'service':'';
  let summary=task.sub||'';
  if(name&&summary.startsWith(name+' · '))summary=summary.slice(name.length+3);else if(name&&summary===name)summary='';
  const order=task.orderId&&state.orders.find(o=>o.id===task.orderId);
  if(order?.term_months&&['pending','payment_failed','identity','upcoming','active','expiring','renewal'].includes(k))summary+=(summary?' · ':'')+order.term_months+'个月';
  const address=['identity','upcoming','active','expiring','renewal','returning','lease_expired'].includes(k)?(store?.address||''):'';
  let badge;
  if(k==='pending')badge='<span class="badge err" role="timer" aria-label="支付剩余时间">剩余 '+countdown(task.expiresAt)+'</span>';
  else if(task.badge)badge='<span class="badge'+(URGENT.includes(k)?' warn':'')+'">'+esc(task.badge)+'</span>';
  else badge='';
  const facts=(task.facts||[]).filter(([,l])=>!(k==='pending'&&l==='支付剩余时间')).slice(0,3);
  const showSecondary=task.secondary&&!opts.single;
  const help=HELP[k];
  const svc=variant==='service';
  const primary=opts.primaryHref?'<a class="btn primary md" href="'+esc(opts.primaryHref)+'">'+esc(opts.primaryLabel)+'</a>':'<button type="button" class="btn primary md" data-action="'+esc(task.primary?.[1]||'order')+'">'+esc(task.primary?.[0]||'查看订单')+'</button>';
  const html='<article class="card dcard '+variant+'" data-state="'+esc(k)+'">'+
    '<div class="kicker">'+esc(KICKER[k]||'当前任务')+'</div>'+
    '<div class="head"><div><div class="title">'+esc(task.title)+'</div>'+(name?'<div class="sub"><b>'+esc(name)+'</b>'+(summary?'<span>'+esc(summary)+'</span>':'')+'</div>':(summary?'<div class="sub">'+esc(summary)+'</div>':''))+(address?'<div class="addr">'+esc(address)+'</div>':'')+'</div>'+badge+'</div>'+
    (facts.length?'<div class="facts n'+facts.length+'">'+facts.map(factHtml).join('')+'</div>':'<div style="height:12px"></div>')+
    (opts.noActs?'':'<div class="acts">'+(showSecondary?'<button type="button" class="btn neutral md" data-action="'+esc(task.secondary[1])+'">'+esc(task.secondary[0])+'</button>':'')+primary+'</div>')+
    /* W7 R-B-02：QUICK 入口 =「加租仓位」带入当前门店；「我的订单」已由 Tab「订单」承担 */
    (svc?'<div class="svc4" aria-label="仓位服务"><a href="rn01.html">'+ico('i-renew')+'续租</a><a href="quick.html?store='+esc(task.storeId||'')+'" data-action="addUnit">'+ico('i-plusminus')+'加租仓位</a><a href="o03.html">'+ico('i-grid')+'更多服务</a><a href="#help">'+ico('i-info')+'门店使用须知</a></div>':'')+
    (help&&!(svc&&k==='active')&&!opts.noActs?'<div class="note"><div><b>'+esc(help[0])+'</b> '+esc(help[1])+'</div><a href="agreement.html?doc=notice">查看须知 ›</a></div>':'')+
    (task.otherActiveCount>0?'<div class="note"><div>另有 '+task.otherActiveCount+' 间在租仓位，请在订单中查看。</div></div>':'')+
    '</article>';
  return el(html);
}
/* M01 「尚未用仓」task card: PORT m01 primaryShared(key new, no orders) copy, rendered with the same DemandCard shell */
const newCard=()=>el('<article class="card dcard" data-state="new"><div class="kicker">尚未用仓</div><div class="head"><div><div class="title">找一个合适的仓位</div><div class="sub">可从附近门店开始</div></div></div><div style="height:12px"></div><div class="acts"><a class="btn primary md" href="s01.html">找附近门店</a></div></article>');
/* ======================= runtime-only builders ======================= */
function pendingOrder(c){c.setScenario('normal');c.select([UNIT]);authorize(c);c.setDate(tomorrow());c.quote();return c.submit();}
const withArea=c=>{const st=c.state();Object.assign(st.requirement,{input_unit:'m2',input_value:2,capacity_m3:4.8});return makeCore(st);};
const BUILD={ /* = W1 H01_BUILD + ended */
  new:c=>c.setScenario('noDemand'),
  estimated:c=>c.setScenario('normal'),
  estimated_area:c=>{c.setScenario('normal');return withArea(c);}, /* W26 */
  selected:c=>{c.setScenario('normal');c.select([UNIT]);},
  booking:c=>{c.setScenario('normal');c.saveLead('北京市朝阳区富仁名苑胜古北里',{phone:PHONE});},
  pending:c=>pendingOrder(c),
  expired:c=>{pendingOrder(c);NOW_OFFSET=4*3600*1000;},
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
  ended:c=>c.setScenario('lifeEnded'),
  /* W7 新增演示键（与 H01 同名）：在租 + 待办条带 / 在租 + 待支付 / 续租报价已出 / 续租申请处理中 */
  active_todo:c=>{c.setScenario('lifeActive');c.saveLead('北京市朝阳区富仁名苑胜古北里',{phone:PHONE});NEW_DEMAND={capacity_m3:5,term_months:6};},
  active_pending:c=>{const p=makeCore();const o=pendingOrder(p),o2=p.state().orders.find(x=>x.id===o.id);c.setScenario('lifeActive');const st=c.state();st.orders.push({...o2,id:'SIM_ORDER_W7_PENDING',store_id:'SIM_BJ03',unit_ids:['SIM_BJ03_U02']});return makeCore(st);},
  renewal_quote:c=>c.setScenario('lifeRenewalQuote'),
  renewal_pending:c=>{c.setScenario('lifeRenewalQuote');return makeCore(JSON.parse(JSON.stringify(c.state()).split('"QUOTE_READY"').join('"QUOTE_PENDING"')));}
};
const lifeCore=scn=>{const c=makeCore();c.setScenario(scn);return c;};
const firstOrder=c=>c.state().orders[0];
function mixedCore(){ /* paid (lifeActive) + pending + payment_failed, all through quote → submit → pay */
  const c=lifeCore('lifeActive');
  const pick=()=>F.units.find(x=>x.store_id==='SIM_BJ01'&&x.status==='available'&&Number(x.volume)>=3&&!c.state().orders.some(o=>o.unit_ids.includes(x.id)));
  c.select([pick().id]);c.setDate(tomorrow());c.quote();c.submit();
  c.select([pick().id]);c.setDate(tomorrow());c.quote();const o=c.submit();c.pay(o.id,'failed');
  return c;
}
function readyCore(){const c=makeCore();c.setScenario('normal');authorize(c);c.claimCoupons();c.setTerm(12);c.select([UNIT]);c.setDate(tomorrow());return c;}
/* W7 R-A-09 / R-A-15：同一订单全站只有一个租用阶段状态（任务卡 / 我的仓位 / 订单列表同源 = policy records） */
const STAGE_LABEL={identity:['待实名认证','pending','identity'],upcoming:['待入仓','upcoming','upcoming'],active:['租用中','active','active'],expiring:['即将到期','pending','expiring'],renewal:['续租办理中','pending','renewal'],returning:['退仓处理中','returning','returning'],lease_expired:['租期已到期','expired_lease','expired_lease'],refund:['押金处理中','REFUND_PENDING','refund']};
function stageOf(core,o,recs){
  if(o.status!=='paid_simulated'){const st=o.status==='pending'&&o.expiresAt&&NOW()>=o.expiresAt?'expired':o.status;
    return st==='payment_failed'?{key:st,label:'支付未成功',tone:'pending',o03:st}:{key:st,label:st==='expired'?'已超时':lab('order',st),tone:st,o03:st==='invalidated'?'expired':st};}
  const r=(recs||[]).find(x=>x.orderId===o.id&&STAGE_LABEL[x.key]);
  if(r){const [label,tn,o03]=STAGE_LABEL[r.key];return {key:r.key,label,tone:tn,o03};}
  let life=null;try{life=core.lifecycleView(o.id);}catch(_){}
  if(life?.lease_status==='ended')return {key:'ended',label:'已退仓',tone:'ended',o03:'ended'};
  return {key:'active',label:'租用中',tone:'active',o03:'active'};
}
function activeAssets(core,orders,recs){
  return orders.map(o=>{if(o.status!=='paid_simulated')return null;let life=null;try{life=core.lifecycleView(o.id);}catch(_){return null;}
    if(!life||!['active','upcoming','returning','expired'].includes(life.lease_status))return null;
    const st=stageOf(core,o,recs),priority={expiring:5,active:4,renewal:4,identity:3,upcoming:3,returning:2,lease_expired:1,refund:1}[st.key]||0;
    return {order:o,life,status:st.label,priority,key:st.key,stage:st};}).filter(Boolean).sort((a,b)=>b.priority-a.priority);
}
/* PORT m01 demandInfo */
function demandInfo(s){const r=s.requirement||{},cap=Number(r.capacity_m3);if(!(Number.isFinite(cap)&&cap>0))return {has:false,active:false};
  const orders=s.orders||[],selection=s.selected||[];
  const independentSelection=selection.length>0&&!orders.some(o=>{const ids=o.unit_ids||[];return ids.length===selection.length&&ids.every(id=>selection.includes(id));});
  const hasQuote=!!(s.quote&&s.quote.expiresAt>NOW());
  return {has:true,active:!orders.length||independentSelection||hasQuote,cap,term:r.term_confirmed?r.term_months:null,city:s.city||'北京'};}
const leadRecords=s=>[...(s.leads||[]),...(s.enterpriseLeads||[])].filter(x=>x&&x.id);
const leadTitle=l=>l.type==='ENTERPRISE_REQUIREMENT'?'企业用仓需求':l.service_source==='estore'?'考拉E存咨询':l.type==='ADVISOR_CONSULTATION'?'顾问咨询需求':'个人用仓需求'; /* PORT account.js needs() */
const assetRow=(e)=>{const o=e.order,l=e.life,s=storeById(o.store_id),when=l.lease_status==='upcoming'?'起租 '+(l.start_date||o.start_date||'待确认'):(l.end_date?'至 '+l.end_date:'租期查看订单');
  return '<a class="arow" href="o03.html?state='+esc(e.stage.o03)+'"><img class="ph" src="'+photoOf(s)+'" alt=""><div><div class="n"><span title="'+esc(s.name)+'">'+esc(s.name)+'</span>'+stag(e.status,e.stage.tone)+'</div><div class="u">'+esc(unitName(o))+'</div><div class="d">'+esc(l.total_months+'个月 · '+when)+'</div></div>'+ico('i-chev','ico chev')+'</a>';};
/* OrderCard（W7 R-A-15）：状态 = 租用阶段（待支付 / 待入仓 / 租用中 / 即将到期 / 已退仓…），不再只显示支付状态；已退仓链到 o03 ended */
const ocard=(o,core,recs,href)=>{const s=storeById(o.store_id),st=stageOf(core,o,recs);
  return '<a class="card ocard" data-stage="'+esc(st.key)+'" href="'+esc(href||'o03.html?state='+st.o03)+'" aria-label="'+esc(storeName(o)+'，'+st.label+'，查看订单详情')+'"><div class="top"><img class="ph" src="'+photoOf(s)+'" alt=""><div><div class="name" title="'+esc(s.name)+'">'+esc(s.name)+'</div><div class="no">订单号 '+orderNo(o)+(o.createdAt?' · 下单 '+dateOf(o.createdAt):'')+'</div></div>'+stag(st.label,st.tone)+'</div><div class="bot"><span class="u">'+esc(unitName(o)+' · '+o.term_months+'个月')+'</span><b class="amt">'+money(o.payable)+'</b></div></a>';};

/* ======================= M01 首页 ======================= */
function renderM01(){
  const key=q.get('state')||'new',build=BUILD[key];if(!build)return unknown(key,BUILD);
  let core=makeCore();const built=build(core);if(built&&typeof built.state==='function')core=built;
  const state=core.state(),task=derive(core,NOW()),orders=history(state),assets=activeAssets(core,orders,task.tasks),demand=demandInfo(state),leads=leadRecords(state);
  document.body.dataset.state=key;
  body().append(ucard(state,true));
  /* W7 D-81：主卡恒显（在租服务卡不再因「我的仓位」而隐藏）+ 待办条带；仅「已退仓且无其他任务」不显示任务卡 */
  const plan=w7Plan(task,state,core),main=plan.main,ended=main.key==='new'&&orders.length>0;
  if(!ended)body().append(main.key==='new'?newCard():demandCard(main,state));
  const strip=todoStrip(plan);if(strip)body().append(strip);
  /* 主卡已是唯一在租仓位时不再重复列出；多仓位时列表状态与主卡同源（R-A-09） */
  const soloOnCard=assets.length===1&&assets[0].order.id===main.orderId;
  if(assets.length&&!soloOnCard)body().append(el('<section class="card mlist" aria-label="我的仓位"><div class="sec-title">我的仓位'+(assets.length>2?'<a class="lk" href="oh01.html?state=mixed">查看全部 '+assets.length+'处'+ico('i-chev','ico sm')+'</a>':'')+'</div>'+assets.slice(0,2).map(assetRow).join('')+'</section>'));
  const quote=state.quote,progressSub=quote&&quote.unit_ids?.length?(quote.expiresAt>NOW()?'当前方案有效':'当前方案需重新报价'):demand.has?capText(state,demand.cap)+(demand.term?' · '+demand.term+'个月':' · 租期待确认'):'尚无保存的需求';
  body().append(section('我的记录',
    /* W7-A D-71：Tab3 已是「订单」，此处不再重复「我的订单」入口；W7 R-A-13「我的需求」→「预约用仓」 */
    mrow('i-note','预约用仓',leads.length?leads.length+'条记录':'查看已提交的预约','acc.html?view=needs&state='+(leads.length?'list':'empty'))+
    mrow('i-flag','找仓进度',progressSub,'acc.html?view=progress&state='+(quote?'quote':demand.has?(demand.active?'demand':'reference'):'none'))));
  const favs=(()=>{try{const v=JSON.parse(sessionStorage.getItem(FAV_KEY)||'{}');return (v.storeFavorites||[]).length+(v.favorites||[]).length;}catch(_){return 0;}})();
  const benefits=(state.coupons||[]).filter(x=>x.status==='AVAILABLE'||x.status==='SELECTED').length+(state.serviceBenefits||[]).length+(state.giftTerms||[]).filter(x=>x.status==='APPROVED').length;
  const unread=(state.messages||[]).filter(m=>!m.read).length;
  body().append(section('服务与权益',
    mrow('i-heart','我的收藏','门店和仓位','acc.html?view=favorites&state='+(favs?'list':'empty'),favs)+
    mrow('i-ticket','优惠与权益','查看可用权益','acc.html?view=coupons&state='+(benefits?'available':'empty'),benefits)+
    mrow('i-msg','消息','查看业务通知','acc.html?view=messages&state='+(unread?'unread':'empty'),unread)));
  /* W7 R-A-14：发票与抬头 / 押金 / 企业认证 汇总入口（ent.html 为 W7-F 新页） */
  const hasPaid=orders.some(o=>o.status==='paid_simulated');
  body().append(section('账务与企业',
    mrow('i-order','发票与抬头','','ent.html?view=titles')+
    mrow('i-shield','押金','','dp01.html?state='+(hasPaid?'held':'empty'))+
    mrow('i-building','企业认证','','ent.html?view=cert')));
  body().append(section('更多服务',
    mrow('i-truck','运输与搬运','下单前可预约','acc.html?view=transport&state='+(hasPaid?'pick':'empty'))+
    mrow('i-gift','推荐有礼','','acc.html?view=referral&state=ready')+
    mrow('i-headset','联系顾问','','acc.html?view=support&state=form')+
    mrow('i-info','关于迷你考拉','','acc.html?view=brand&state=default')));
  window.__W6={page:'M01',state:key,task:main.key,policyTask:task.key,todos:plan.todos.map(x=>x.a),more:plan.more,taskShown:!ended,assets:assets.map(a=>a.key),orders:orders.length,leads:leads.length,progress:progressSub,counts:{favs,benefits,unread},rows:[...document.querySelectorAll('.mlist .lrow .k')].map(e=>e.textContent.trim())};
}
/* ======================= OH01 订单记录 ======================= */
const OH01={empty:()=>lifeCore('noDemand'),single:()=>lifeCore('lifeActive'),mixed:()=>mixedCore(),ended:()=>lifeCore('lifeEnded'),
  /* W7 R-A-15 新增：各租用阶段 */
  identity:()=>lifeCore('lifeIdentity'),upcoming:()=>lifeCore('lifeUpcoming'),expiring:()=>{const b=BUILD.expiring(makeCore());return b;},returning:()=>lifeCore('lifeReturning'),lease_expired:()=>lifeCore('lifeExpired')};
function renderOH01(){
  const key=q.get('state')||'single',b=OH01[key];if(!b)return unknown(key,OH01);
  const core=b(),os=history(core.state()),recs=derive(core,NOW()).tasks;document.body.dataset.state=key;
  if(!os.length){body().append(emptyState('i-order','暂无订单记录','先去附近门店看看可用仓位。','<a class="btn primary md" href="s01.html">去附近门店</a>'));window.__W6={page:'OH01',state:key,orders:0};return;}
  body().append(el('<div class="listhead" style="padding:4px 16px 0"><b>全部订单</b><small>按最近订单排序</small></div>'));
  os.forEach(o=>body().append(el(ocard(o,core,recs))));
  window.__W6={page:'OH01',state:key,orders:os.map(o=>o.status),stages:os.map(o=>stageOf(core,o,recs).key)};
}
/* ======================= ACC 二级页 ======================= */
const TITLES={needs:'预约用仓',progress:'找仓进度',favorites:'我的收藏',coupons:'优惠与权益',messages:'消息',profile:'个人信息',identity:'实名认证',access:'入仓指引',transport:'运输与搬运',referral:'推荐有礼',support:'联系顾问',brand:'关于迷你考拉'};
/* W7 契约 §4：线索受理统一结果卡。演示默认服务时段内文案；&offhours=1 为非服务时段变体 */
const ackCard=(acts)=>el('<section class="card ack" role="status" aria-label="提交结果"><div class="pic">'+ico('i-check')+'</div><h4>已提交</h4><p class="m">'+esc(OFFHOURS?W7.LEAD_COPY.offHours:W7.LEAD_COPY.inHours)+'</p>'+(OFFHOURS?'<p class="s">'+esc(W7.LEAD_COPY.hoursNote)+'</p>':'')+(acts?'<div class="acts">'+acts+'</div>':'')+'</section>');
const ackNote=()=>el('<section class="notice" role="note"><div class="s">'+esc(W7.LEAD_COPY.inHours)+'；非服务时段提交的，顾问上班后将优先联系您。</div></section>');
const leadCard=l=>{const details=[l.capacity_hint||(l.capacity_m3?l.capacity_m3+'m³':'容量待补充'),l.term_hint||(l.term_months?l.term_months+'个月':'租期待补充')].join(' · ');
  const loc=l.address||l.location||(l.type==='ADVISOR_CONSULTATION'?'未填写用仓位置（选填）':'地址待补充'),ent=l.type==='ENTERPRISE_REQUIREMENT';
  /* R-A-19：企业卡一主一次 +「更多」（撤回进更多），375 下不再截断 */
  const acts=ent?btn('修改地址与备注','neutral md','editLead')+'<a class="btn secondary md" href="business.html?state=edit">补充企业资料</a>'+'<button type="button" class="btn neutral md more" data-action="leadMore" aria-label="更多操作">更多</button>':btn('撤回','neutral md','withdraw')+btn('修改地址与备注','secondary md','editLead');
  return '<article class="card lcard'+(ent?' bizlead':'')+'" data-lead="'+esc(l.id)+'"><div class="head"><div class="t">'+esc(leadTitle(l))+'</div>'+stag(lab('lead',l.status),l.status)+'</div><div class="line">'+esc(loc)+'</div><div class="line sec-ink">'+esc(details)+(l.phone?' · '+esc(mask(l.phone)):'')+'</div>'+(l.note?'<div class="line sec-ink">备注：'+esc(l.note)+'</div>':'')+
    (l.status!=='withdrawn'?'<div class="acts">'+acts+'</div>':'')+'</article>';};
const V={};
/* --- 预约用仓（W7 R-A-13：原「我的需求」） --- */
V.needs={title:'预约用仓',states:{
  empty:()=>lifeCore('noDemand'),
  list:()=>{const c=lifeCore('normal');c.saveLead('北京市朝阳区富仁名苑胜古北里',{phone:PHONE,note:'周末搬入，需协助搬运'});c.saveEnterpriseLead({phone:PHONE,location:'北京市朝阳区安贞西里三区 12 号楼',contact_name:'王经理',company:'安贞商贸有限公司',capacity_m3:10,capacity_band:'5–15m³',term_months:12,storage_types:['库存','样品'],moving_support:'待确认',notes:''});return c;},
  withdrawn:()=>{const c=V.needs.states.list();c.withdrawLead(c.state().leads[0].id);return c;},
  edit:()=>V.needs.states.list(),withdraw:()=>V.needs.states.list(),more:()=>V.needs.states.list()},
  render(core,key){const leads=leadRecords(core.state());
    if(!leads.length){body().append(emptyState('i-note','暂无预约记录','预约用仓后，可在这里查看受理进度。','<a class="btn primary md" href="booking.html">预约用仓</a>'));return;}
    if(leads.some(l=>l.status!=='withdrawn'))body().append(ackNote());
    leads.slice().reverse().forEach(l=>body().append(el(leadCard(l))));
    const l=leads[0];
    if(key==='edit'||OVL==='edit')overlay(sheet('修改需求',field('用仓位置',input(l.address||l.location||'','请填写用仓位置'))+field('备注',input(l.note||'','补充说明（可选）','','','备注'))+'<p class="rule">容量、租期和联系方式保留；企业资料可在「补充企业资料」里修改。</p><div class="acts">'+btn('保存修改','primary block','saveLead')+'</div>'));
    if(key==='withdraw'||OVL==='withdraw')overlay(dialog('撤回需求','撤回后不再作为有效需求展示。',btn('暂不撤回','neutral','close')+btn('确认撤回','danger','confirmWithdraw')));
    if(key==='more'||OVL==='more')overlay(sheet('更多操作','<div class="mlist sheetlist">'+'<button type="button" class="lrow" data-action="withdraw"><span class="k">撤回需求</span>'+ico('i-chev','ico chev')+'</button><a class="lrow" href="acc.html?view=support&state=form"><span class="k">联系顾问</span>'+ico('i-chev','ico chev')+'</a></div><div class="acts">'+btn('取消','neutral block','close')+'</div>'));
    window.__W6.leads=leads.map(x=>x.type+':'+x.status);}};
/* --- 找仓进度（报价方案 + 最近找仓 合并，张坤 2026-11-17） --- */
V.progress={title:'找仓进度',states:{
  none:()=>lifeCore('noDemand'),demand:()=>lifeCore('normal'),demand_area:()=>withArea(lifeCore('normal')),selected:()=>{const c=lifeCore('normal');c.select([UNIT]);return c;},
  quote:()=>{const c=lifeCore('normal');c.select([UNIT]);authorize(c);c.setDate(tomorrow());c.quote();return c;},
  quote_expired:()=>{const c=V.progress.states.quote();NOW_OFFSET=6*60*1000;return c;},
  reference:()=>lifeCore('lifeActive')},
  render(core,key){const s=core.state(),task=derive(core,NOW()),d=demandInfo(s),qt=s.quote;
    if(!d.has){body().append(emptyState('i-flag','尚无保存的找仓需求','','<a class="btn primary md" href="cap.html">估大小算价格</a><a class="btn neutral md" href="s01.html">找附近门店</a>'));return;}
    /* 同一组件同一数据（R-A-08）：取与 M01 相同的 policy records；W7 R-A-16：已选仓只留一个主按钮「去确认订单」→ O01；报价已出时按钮只在报价卡上 */
    const find=(task.tasks||[]).find(x=>x.key==='selected'||x.key==='estimated'),hasQt=!!(qt&&qt.unit_ids?.length);
    if(find)body().append(demandCard(w7Task({...find},s,core),s,find.key==='selected'?(hasQt?{noActs:true}:{single:true,primaryHref:'o01.html?state=ready',primaryLabel:'去确认订单'}):{}));
    else body().append(el('<article class="card dcard" data-state="reference"><div class="kicker">找仓进度</div><div class="head"><div><div class="title">'+esc(capText(s,d.cap))+'</div><div class="sub">'+esc(d.city+' · '+(d.term?d.term+'个月':'租期待选择'))+'</div></div><span class="badge">'+(d.active?'当前需求':'最近参考')+'</span></div><div style="height:12px"></div><div class="acts">'+(d.active?'<a class="btn primary md" href="s5.html">继续找仓</a>':'<a class="btn primary md" href="s01.html">按此需求重新找仓</a>')+'</div></article>'));
    if(qt&&qt.unit_ids?.length){const valid=qt.expiresAt>NOW(),st=storeById(qt.store_id);
      body().append(el('<section class="card" aria-label="报价方案"><div class="sec-title">报价方案'+stag(valid?'当前报价':'已过期',valid?'pending':'expired')+'</div><div class="store-line"><img class="ph" src="'+photoOf(st)+'" alt=""><div><div class="n" title="'+esc(st.name)+'">'+esc(st.name)+'</div><div class="s">'+esc(qt.term_months+'个月 · '+qt.unit_ids.map(id=>cabinLabel(unitById(id))).join('、'))+'</div></div></div><div class="kvlist" style="padding:0;margin-top:8px;border-top:1px solid var(--mk-color-line-hairline)">'+kv('整期租金',money(qt.rent_total))+(Number(qt.coupon_discount)>0?kv('优惠券','−'+money(qt.coupon_discount)):'')+kv('本次应付','<b class="amt">'+money(qt.payable)+'</b>')+'</div><div class="acts" style="margin-top:12px"><a class="btn primary md block" href="o01.html?state='+(valid?'ready':'price_changed')+'">'+(valid?'去确认订单':'重新报价')+'</a></div></section>'));}
    window.__W6.task=find?find.key:task.key;window.__W6.demand=d;window.__W6.quote=qt?{valid:qt.expiresAt>NOW()}:null;}};
/* --- 我的收藏 --- */
V.favorites={title:'我的收藏',states:{empty:()=>{sessionStorage.removeItem(FAV_KEY);return lifeCore('noDemand');},list:()=>{sessionStorage.setItem(FAV_KEY,JSON.stringify({storeFavorites:['SIM_BJ01','SIM_BJ03'],favorites:['SIM_BJ02_U03']}));return lifeCore('normal');},
  list_gone:()=>{sessionStorage.setItem(FAV_KEY,JSON.stringify({storeFavorites:['SIM_BJ01','SIM_BJ03'],favorites:['SIM_BJ02_U03'],gone:['SIM_BJ03','SIM_BJ02_U03']}));return lifeCore('normal');}}, /* W24：收藏的仓位已租出 / 门店暂停营业（演示标记，真实取仓位与门店状态） */
  render(){let ui={};try{ui=JSON.parse(sessionStorage.getItem(FAV_KEY)||'{}');}catch(_){}
    const stores=(ui.storeFavorites||[]).map(storeById).filter(Boolean),units=(ui.favorites||[]).map(unitById).filter(Boolean),gone=id=>(ui.gone||[]).includes(id),gtag=t=>'<span class="tag" style="margin-left:6px;flex:none">'+t+'</span>';
    if(!stores.length&&!units.length){body().append(emptyState('i-heart','暂无收藏，可在门店详情收藏','','<a class="btn primary md" href="s01.html">找附近门店</a>'));return;}
    if(stores.length)body().append(el('<section class="card mlist" aria-label="收藏的门店"><div class="sec-title">门店</div>'+stores.map(s=>'<a class="arow" href="s02.html?state=browse"><img class="ph" src="'+photoOf(s)+'" alt=""><div><div class="n"><span title="'+esc(s.name)+'">'+esc(s.name)+'</span>'+(gone(s.id)?gtag('暂停营业'):'')+'</div><div class="u ellip">'+(gone(s.id)?'可查看附近其他门店':esc(s.address))+'</div></div>'+ico('i-chev','ico chev')+'</a>').join('')+'</section>'));
    if(units.length)body().append(el('<section class="card mlist" aria-label="收藏的仓位"><div class="sec-title">仓位</div>'+units.map(u=>{const s=storeById(u.store_id);return '<a class="arow" href="s02.html?state=browse"><img class="ph" src="'+thumb(u)+'" alt=""><div><div class="n"><span>'+esc(s.name)+'</span>'+(gone(u.id)?gtag('已租出'):'')+'</div><div class="u">'+esc(cabinLabel(u)+' · '+u.dimensions)+(gone(u.id)?' · 可看同店其他仓位':'')+'</div></div>'+ico('i-chev','ico chev')+'</a>';}).join('')+'</section>'));
    window.__W6.favorites={stores:stores.length,units:units.length};}};
/* --- 优惠与权益 --- */
V.coupons={title:'优惠与权益',states:{
  empty:()=>{const c=lifeCore('normal');authorize(c);return c;},
  gate:()=>{const c=lifeCore('normal');c.claimCoupons();return c;},
  available:()=>{const c=lifeCore('normal');authorize(c);c.claimCoupons();return c;},
  locked:()=>{const c=readyCore();c.quote();c.submit();return c;},
  redeemed:()=>{const c=readyCore();c.quote();const o=c.submit();c.pay(o.id,'success');return c;}},
  render(core){const s=core.state(),auth=core.authorized(),cs=s.coupons||[],bs=s.serviceBenefits||[],gs=s.giftTerms||[];
    body().append(el('<section class="notice" role="note"><div class="s">租金券不抵扣押金和管理费；免费运输限用仓位置距门店 5km 及以上、租期满 6 个月的订单，含 1 次车辆运输费。</div></section>'));
    if(!cs.length)body().append(emptyState('i-ticket','暂无可查看的优惠与权益','',btn('领取新客券','primary md','claim')));
    else body().append(el('<section class="card" aria-label="优惠券"><div class="sec-title">优惠券</div>'+cs.map(c=>{const off=['REDEEMED','EXPIRED','INVALID'].includes(c.status);return '<div class="ccard'+(off?' off':'')+'"><div class="amt">'+(auth?'<b>'+money(c.amount)+'</b>':'<span class="gate">登录后查看金额</span>')+'</div><div class="info"><div class="n">'+esc(c.name)+stag(lab('coupon',c.status),c.status)+'</div><div class="c">'+esc(COUPON_COND[c.id]||'服务权益，不能抵扣租金')+'</div><div class="c meta"><span>有效期 '+esc(c.valid_until||c.expires_at||'以券面为准')+'</span>'+(auth&&c.status==='AVAILABLE'?'<a class="use" href="s01.html" data-action="useCoupon">去使用'+ico('i-chev','ico xs')+'</a>':'')+'</div></div></div>';}).join('')+(auth?'':'<div class="acts" style="margin-top:12px">'+btn('登录后查看金额','secondary md block','phone')+'</div>')+'</section>'));
    if(bs.length)body().append(el('<section class="card mlist" aria-label="服务权益"><div class="sec-title">服务权益</div>'+bs.map(b=>'<div class="lrow"><span class="k">'+ico('i-truck','ico lead')+esc(b.name||'服务权益')+'</span><span class="v">'+stag(lab('benefit',b.status),b.status)+'</span></div>').join('')+'</section>'));
    if(gs.length)body().append(el('<section class="card mlist" aria-label="赠送租期"><div class="sec-title">赠送租期</div>'+gs.map(g=>'<div class="lrow"><span class="k">'+ico('i-gift','ico lead')+'赠送'+esc(g.gift_months)+'个月</span><span class="v">'+stag(lab('gift',g.status),g.status)+'</span></div>').join('')+'</section>'));
    window.__W6.coupons=cs.map(c=>c.id+':'+c.status);window.__W6.authorized=auth;}};
/* --- 消息 --- */
V.messages={title:'消息',states:{empty:()=>lifeCore('noDemand'),
  unread:()=>{const c=readyCore();c.quote();const o=c.submit();c.pay(o.id,'success');c.requestTransport(o.id,{address:'北京市朝阳区望京西园四区',date:tomorrow()});c.saveSupport({text:'想了解仓位是否可以临时换到更大的仓',type:'order',order_id:o.id});return c;},
  read:()=>{const c=V.messages.states.unread();c.readMessages();return c;}},
  render(core){const ms=(core.state().messages||[]).slice().reverse();
    if(!ms.length){body().append(emptyState('i-msg','暂无消息'));return;}
    /* W7 R-A-23：分类 + 时间 + 按类型落到对应页面；R-A-11：不再出现「尚未发送」 */
    const CAT=[[/续租/,'续租','rn01.html?state=quote_ready','查看续租'],[/退仓|验仓/,'退仓','ex01.html?state=requested','查看退仓进度'],[/押金/,'押金','dp01.html?state=refund_pending','查看押金进度'],[/发票/,'发票','iv01.html?state=submitted','查看开票进度'],[/身份/,'实名认证','acc.html?view=identity&state=reviewing','查看验证进度'],[/入仓/,'入仓','acc.html?view=access&state=allowed','查看入仓指引'],[/运输|搬运/,'运输','acc.html?view=transport&state=saved','查看运输预约'],[/咨询|预约|需求/,'咨询','acc.html?view=needs&state=list','查看预约记录'],[/支付|付款|订单/,'订单','o03.html?state=identity','查看订单']];
    const REWRITE={'咨询已保存，尚未发送':'咨询已提交，'+W7.LEAD_COPY.inHours,'运输需求已记录，权益待顾问确认':'运输预约已提交，'+W7.LEAD_COPY.inHours};
    const tm=m=>{const t=Number(m.createdAt||m.created_at||m.at||m.time);if(!(t>0))return '';const d=new Date(t+8*3600*1000).toISOString();return d.slice(5,10)+' '+d.slice(11,16);};
    body().append(el('<section class="card mlist" aria-label="消息列表">'+ms.map(m=>{const title=REWRITE[m.title]||m.title||'消息',c=CAT.find(x=>x[0].test(title))||[null,'通知',m.order_id?'o03.html?state=identity':'',m.order_id?'查看订单':''];
      return '<div class="msgrow" data-cat="'+esc(c[1])+'"><span class="dot'+(m.read?' read':'')+'" aria-hidden="true"></span><div><div class="mh"><span class="tag">'+esc(c[1])+'</span><time>'+esc(tm(m))+'</time></div><div class="t">'+esc(title)+'</div>'+(m.text?'<div class="s">'+esc(m.text)+'</div>':'')+(c[2]?'<a class="inlinelink" href="'+esc(c[2])+'">'+esc(c[3])+ico('i-chev','ico xs')+'</a>':'')+'</div></div>';}).join('')+'</section>'));
    window.__W6.messages=ms.map(m=>(m.read?'read:':'unread:')+m.title);window.__W6.msgTimes=ms.map(tm);}};
/* --- 个人信息 --- */
V.profile={title:'个人信息',states:{unverified:()=>lifeCore('noDemand'),verified:()=>{const c=lifeCore('noDemand');authorize(c);return c;},
  contact:()=>{const c=lifeCore('noDemand');authorize(c);c.setContact('13912345678');return c;},
  contact_invalid:()=>{const c=lifeCore('noDemand');authorize(c);try{c.setContact('12');}catch(_){}return c;}},
  render(core,key){const s=core.state(),auth=core.authorized(),phone=s.account&&s.account.phone?String(s.account.phone):'';
    body().append(ucard(s,false));
    body().append(el('<section class="card" aria-label="账户与联系方式"><div class="sec-title">账户与联系方式</div><div class="kvlist" style="padding:0">'+kv('登录手机号',phone?esc(mask(phone)):'<span class="soft">未登录</span>',phone?'':'soft')+kv('联系手机号',s.contactPhone?esc(mask(s.contactPhone)):'未填写',s.contactPhone?'':'soft')+'</div><div class="acts" style="margin-top:12px">'+btn('修改联系电话','neutral md','contact')+(auth?btn('更换登录手机号','neutral md','changePhone'):btn('登录 / 注册','primary md','phone'))+'</div></section>'));
    body().append(el('<section class="notice" role="note"><div class="s">'+(auth?'登录手机号验证一次后长期有效，更换时需短信验证。':'浏览门店无需登录；查看报价、预约和下单时登录即可。')+'</div></section>'));
    /* W20 D-153：账户出口。注销条件、撤回后的处理是设计侧初稿，需法务确认 */
    if(auth){const P='acc.html?view=profile&state='+key+'&overlay=';
      body().append(el('<section class="card" aria-label="账户与隐私" data-w20="account"><div class="sec-title">账户与隐私</div>'+(mrow('i-shield','隐私授权管理','',P+'privacy')+mrow('i-user','注销账号','',P+'delete')).replace(/<span class="k">/g,'<span class="k" style="display:inline-flex;align-items:center;gap:8px">')+'</section>'));
      body().append(el('<div data-w20="logout" style="padding:4px 16px 24px">'+btn('退出登录','neutral md block','logout')+'</div>'));
      const dlg=(t,p,acts)=>el('<div class="scrim center" role="alertdialog" aria-modal="true" aria-label="'+esc(t)+'"><div class="dialog"><h4>'+esc(t)+'</h4><p>'+p+'</p><div class="acts">'+acts+'</div></div></div>');
      const prow=(k,v,act)=>'<div class="kv"><span class="k">'+k+'</span><span class="v">'+v+(act?' '+btn(act,'text sm','privacySetting'):'')+'</span></div>';
      if(OVL==='logout')overlay(dlg('退出登录？','退出后仍可浏览门店；查看报价、订单和下单时需要重新登录。',btn('取消','neutral md','close')+btn('退出登录','primary md','confirmLogout')));
      if(OVL==='privacy'||OVL==='privacy_confirm')overlay(sheet('隐私授权管理','<div class="kvlist" style="padding:0">'+prow('位置信息','已授权','去设置')+prow('手机号','已授权')+prow('实名信息','已认证')+'</div><p class="fine">位置权限在微信「设置」里开关。撤回隐私授权后将退出登录，再次使用相关功能时会重新征得您的同意。</p><div class="acts">'+btn('撤回隐私授权','neutral block','withdrawPrivacy')+'</div>'));
      if(OVL==='privacy_confirm')overlay(dlg('撤回隐私授权？','撤回后将退出登录。已签署的协议和租用中的订单不受影响。',btn('取消','neutral md','close')+btn('确认撤回','primary md','confirmWithdraw')));
      if(OVL==='delete')overlay(sheet('注销账号','<p class="para">满足以下条件后可申请注销：</p><ul class="recheck" style="margin:8px 0"><li><span class="k">没有租用中或待支付的订单</span></li><li><span class="k">押金已退还</span></li><li><span class="k">没有处理中的发票或退款</span></li></ul><p class="fine">注销后，登录手机号、优惠券、预约与收藏记录将被删除。</p><div class="acts">'+btn('暂不注销','neutral','close')+btn('申请注销','primary','confirmDelete')+'</div>'));
      if(OVL==='delete_blocked')overlay(dlg('暂时不能注销','您有 1 个租用中的订单，退仓并结清后可申请注销。',btn('知道了','neutral md','close')+'<a class="btn primary md" href="oh01.html">查看订单</a>'));
      if(OVL==='delete_done')toast('已提交注销申请');
    }
    if(OVL==='contact'||key==='contact_invalid')overlay(sheet('填写联系电话',field('手机号（支持国际区号）',input(key==='contact_invalid'?'12':(s.contactPhone||''),'请填写手机号',ico('i-phone','ico sm'),key==='contact_invalid'?ERR.ENTER_PHONE:''))+'<div class="acts">'+btn('保存联系方式','primary block','saveContact')+'</div>'));
    window.__W6.profile={verified:!!phone,authorized:auth,contact:s.contactPhone||null};}};
/* --- 实名认证 --- */
const ID_STEPS=['提交身份资料','认证中','认证通过'];
V.identity={title:'实名认证',states:{not_paid:()=>lifeCore('noDemand'),pending:()=>lifeCore('lifeIdentity'),form:()=>lifeCore('lifeIdentity'),invalid:()=>lifeCore('lifeIdentity'),
  reviewing:()=>{const c=lifeCore('lifeIdentity');c.requestIdentityVerification(firstOrder(c).id);return c;},
  result:()=>V.identity.states.reviewing(),
  verified:()=>{const c=V.identity.states.reviewing();c.identity(firstOrder(c).id,'success');return c;},
  failed:()=>{const c=V.identity.states.reviewing();c.identity(firstOrder(c).id,'failed');return c;}},
  render(core,key){const o=firstOrder(core);if(!o||o.status!=='paid_simulated'){body().append(emptyState('i-id','无法打开该服务',ERR.PAID_ORDER_REQUIRED,'<a class="btn primary md" href="oh01.html?state=empty">查看我的订单</a>'));return;}
    const v=core.lifecycleView(o.id),st=v.identity_status,cur=st==='pending'?1:st==='reviewing'?2:3,fail=st==='failed'?2:0;
    body().append(sumcard(o,v,{noKv:true}));
    body().append(el('<section class="card" aria-label="验证进度"><div class="sec-title">实名认证'+stag(lab('identity',st),st)+'</div>'+steps([[ID_STEPS[0],st==='pending'?'下单时未完成的，请在起租前完成':''],[ID_STEPS[1],st==='reviewing'?'资料已提交，请等待认证结果。':st==='failed'?'未通过，可重试':''],[ID_STEPS[2],st==='verified'?'可查看入仓指引':'']],st==='verified'?4:st==='failed'?2:cur,fail)+'</section>'));
    if(st==='pending')actbar(btn('开始验证','primary block','identitySheet'),'stack');
    else if(st==='failed')actbar(btn('重新提交资料','primary block','identitySheet'),'stack');
    else if(st==='reviewing'&&REVIEW)actbar(btn('审核认证结果','neutral block','identityReview'),'stack');
    else if(st==='verified')actbar('<a class="btn primary block" href="acc.html?view=access&state=before_start">查看入仓指引</a>','stack');
    if(key==='form'||key==='invalid'||OVL==='form')overlay(sheet('提交身份资料',field('姓名',input(key==='invalid'?'王':'','请填写姓名','',key==='invalid'?'请填写有效姓名':''))+field('证件号码',input(key==='invalid'?'1101':'','请填写身份证号码','',key==='invalid'?'请填写18位证件号码':''))+'<div class="acts">'+btn('提交认证','primary block','identitySubmit')+'</div>'));
    if(key==='result'||OVL==='result')overlay(dialog('认证结果审核','',btn('审核未通过','neutral','identityResult')+btn('审核通过','primary','identityResult')));
    window.__W6.identity=st;}};
/* --- 入仓指引 --- */
V.access={title:'入仓指引',states:{not_paid:()=>lifeCore('noDemand'),identity_required:()=>lifeCore('lifeIdentity'),before_start:()=>lifeCore('lifeUpcoming'),allowed:()=>lifeCore('lifeActive'),inactive:()=>lifeCore('lifeEnded')},
  render(core,key){const o=firstOrder(core);if(!o||o.status!=='paid_simulated'){body().append(emptyState('i-door','无法打开该服务',ERR.PAID_ORDER_REQUIRED,'<a class="btn primary md" href="oh01.html?state=empty">查看我的订单</a>'));return;}
    const v=core.lifecycleView(o.id),s=storeById(o.store_id),dec=window.H01_STATE_POLICY.accessDecision(core.state(),core,o.id);
    body().append(sumcard(o,v,{noKv:true}));
    const cur=v.identity_status!=='verified'?2:v.lease_status==='upcoming'?3:dec.allowed?3:4;
    body().append(el('<section class="card" aria-label="入仓步骤"><div class="sec-title">入仓步骤</div>'+steps([['到达门店',esc(s.address||'查看门店详细地址')+(s.access_hours?' · 存取时间 '+esc(s.access_hours):'')],...(v.identity_status==='verified'?[]:[['完成实名认证','下单时未完成的，请在起租前完成']]),['起租后查看入仓信息',v.lease_status==='upcoming'?'起租日 <b>'+esc(v.start_date)+'</b>':dec.allowed?'可查看仓位开门信息':''],['存取后检查仓门关闭','']],(dec.allowed?3:cur)-(v.identity_status==='verified'?1:0),0)+'</section>'));
    if(dec.allowed)actbar(btn('查看仓位开门信息','primary block','enter'),'stack');
    else if(dec.reason==='identity')actbar('<a class="btn primary block" href="acc.html?view=identity&state=pending">完成实名认证</a>','stack');
    else if(dec.reason==='before_start')body().append(el('<section class="notice" role="status"><div class="t">尚未到起租时间</div><div class="s">入仓信息将在起租后开放。</div></section>'));
    else body().append(el('<section class="card" aria-label="当前状态"><div class="kvlist" style="padding:0">'+kv('当前状态',stag(lab('lease',v.lease_status),v.lease_status))+'</div></section>'));
    if(OVL==='unlock'&&dec.allowed)overlay(dialog('仓位开锁','当前仓门设备暂未接入。如需存取，请联系门店协助。',btn('知道了','primary','close')));
    window.__W6.access=dec;}};
/* --- 运输与搬运（W7 D-76 / R-A-22：下单前可预约，按线索处理；R-A-21：校验错误文字） --- */
const TRANSPORT_NOTE='下单前即可预约运输 / 搬运，由顾问确认方案与费用，不计入本次应付。';
V.transport={title:'运输与搬运',states:{empty:()=>lifeCore('noDemand'),pre_invalid:()=>lifeCore('noDemand'),pre_saved:()=>lifeCore('noDemand'),pick:()=>mixedCore(),form:()=>lifeCore('lifeActive'),invalid:()=>lifeCore('lifeActive'),
  saved:()=>{const c=lifeCore('lifeActive');c.requestTransport(firstOrder(c).id,{address:'北京市朝阳区望京西园四区',date:tomorrow()});return c;}},
  render(core,key){const s=core.state(),paid=history(s).filter(o=>o.status==='paid_simulated'),recsAll=derive(core,NOW()).tasks;
    const form=(addr,date,bad,withPhone)=>el('<section class="card" aria-label="运输预约表单">'+field('取送地址',input(addr,'请填写取送地址','',bad?ERR.TRANSPORT_ADDRESS:''),bad?ERR.TRANSPORT_ADDRESS:'')+field('期望运输日期',input(date,'请选择日期',ico('i-cal','ico sm'),bad?ERR.TRANSPORT_DATE:''),bad?ERR.TRANSPORT_DATE:'')+(withPhone?field('联系电话',input(withPhone===true?'':withPhone,'请填写手机号',ico('i-phone','ico sm'),'')):'')+'</section>');
    if(!paid.length){ /* 无已付款订单：不再是空页，直接预约（线索） */
      if(key==='pre_saved'){body().append(ackCard('<a class="btn neutral md" href="m01.html">返回我的</a><a class="btn primary md" href="s01.html">去找仓</a>'));body().append(el('<section class="card" aria-label="运输预约"><div class="sec-title">运输预约'+stag('待顾问确认','awaiting_advisor')+'</div><div class="rec"><div><div class="t">北京市朝阳区望京西园四区</div><div class="s">'+esc(tomorrow())+' · '+esc(mask(PHONE))+'</div></div></div></section>'));window.__W6.transport='pre_saved';return;}
      body().append(el('<section class="notice" role="note"><div class="s">'+esc(TRANSPORT_NOTE)+'</div></section>'));
      body().append(form('','',key==='pre_invalid',true));
      actbar(btn('提交运输预约','primary block','transportLead'),'stack');window.__W6.transport=key==='pre_invalid'?'pre_invalid':'pre_form';return;}
    if(key==='pick'){body().append(el('<div class="listhead" style="padding:4px 16px 0"><b>选择关联订单</b></div>'));paid.forEach(o=>body().append(el(ocard(o,core,recsAll,'acc.html?view=transport&state=form'))));window.__W6.transport='pick';return;}
    const o=paid[0],v=core.lifecycleView(o.id),recs=(s.services[o.id]||{}).transport||[];
    body().append(sumcard(o,v,{noKv:true}));
    body().append(el('<section class="notice" role="note"><div class="s">下单前即可预约运输 / 搬运，由顾问确认方案与费用，不计入本次应付。</div></section>'));
    body().append(form(key==='saved'?recs[recs.length-1]?.address:'',key==='saved'?recs[recs.length-1]?.date:'',key==='invalid',false));
    if(recs.length)body().append(el('<section class="card" aria-label="运输记录"><div class="sec-title">运输记录</div>'+recs.map(t=>'<div class="rec"><div><div class="t">'+esc(t.address)+'</div><div class="s">'+esc(t.date)+'</div></div>'+stag(lab('transport',t.status),t.status)+'</div>').join('')+'</section>'));
    actbar(btn('提交运输预约','primary block','transport'),'stack');
    if(key==='saved')toast('已提交，'+(OFFHOURS?'顾问上班后将优先联系您':W7.LEAD_COPY.inHours));
    window.__W6.transport={records:recs.length};}};
/* --- 推荐有礼 --- */
V.referral={title:'推荐有礼',states:{gate:()=>lifeCore('noDemand'),ready:()=>{const c=lifeCore('noDemand');authorize(c);return c;},copied:()=>V.referral.states.ready()},
  render(core,key){const auth=core.authorized(),url='小程序首页 · 我的邀请码'; /* W20：不露本机地址；正式链接由代码侧生成 */ /* PORT account.js referral(): home.html?ref=LOCAL-KOALA */
    body().append(el('<section class="card" aria-label="推荐有礼"><div class="sec-title">邀请好友</div><p class="para">邀请好友了解迷你考拉仓的仓储服务。</p>'+(auth?'':'<div class="acts" style="margin-top:12px">'+btn('登录 / 注册','secondary md block','phone')+'</div>')+'</section>'));
    body().append(el('<section class="card" aria-label="分享链接">'+field('分享链接','<div class="linkbox">'+ico('i-copy','ico sm')+'<span>'+esc(url)+'</span></div>')+'<div class="acts" style="margin-top:12px">'+btn('复制分享链接','secondary md block','copyReferral')+'</div></section>'));
    body().append(el('<section class="notice" role="note" data-placeholder="referral"><div class="t">活动筹备中</div><div class="s">活动开始后，规则与奖励会在这里更新。</div></section>'));
    if(key==='copied')toast('链接已复制');
    window.__W6.referral={authorized:auth};}};
/* --- 联系顾问 --- */
const SUPPORT_TYPES=[['general','选仓与服务咨询'],['order','订单与租后'],['moving','搬运服务']];
V.support={title:'联系顾问',states:{form:()=>lifeCore('noDemand'),order:()=>lifeCore('lifeActive'),invalid:()=>lifeCore('noDemand'),
  saved:()=>{const c=lifeCore('noDemand');c.saveSupport({text:'想了解朝阳区 3m³ 左右的仓位和月租',type:'general',order_id:null});return c;}},
  render(core,key){const s=core.state(),o=key==='order'?firstOrder(core):null,last=(s.messages||[]).slice(-1)[0];
    if(o){document.getElementById('tb-title').textContent='订单咨询';body().append(sumcard(o,core.lifecycleView(o.id),{noKv:true}));}
    /* W7 R-A-12：直接联系方式（电话 = S02 既有 400 客服电话；服务时段 D-106） */
    const direct=()=>el('<section class="card direct" aria-label="直接联系"><div class="sec-title">直接联系</div><div class="drow"><div><div class="t">电话咨询</div><div class="s">'+esc(W7.LEAD_COPY.hoursNote)+'</div></div><a class="btn secondary md" href="tel:'+CS_TEL+'" aria-label="拨打400客服电话">'+ico('i-phone')+'拨打电话</a></div></section>');
    if(key==='saved'){ /* 同一结果落点：受理结果卡（契约 §4），不再用「尚未通知顾问」toast */
      body().append(ackCard('<a class="btn neutral md" href="m01.html">返回我的</a><a class="btn primary md" href="acc.html?view=needs&state=list">查看预约记录</a>'));
      body().append(el('<section class="card" aria-label="已提交内容"><div class="sec-title">已提交内容</div><div class="kvlist" style="padding:0">'+kv('咨询类型',esc((SUPPORT_TYPES.find(x=>x[0]===(last?.type||'general'))||SUPPORT_TYPES[0])[1]))+'</div><p class="para" style="margin-top:8px">想了解朝阳区 3m³ 左右的仓位和月租</p></section>'));
      body().append(direct());window.__W6.support={saved:!!last,type:last?.type||null};return;}
    body().append(direct());
    body().append(el('<section class="card" aria-label="咨询表单"><div class="sec-title">留言给顾问</div>'+field('咨询类型',seg(SUPPORT_TYPES,o?'order':'general','supportType'))+field('咨询内容','<div class="input tall'+(key==='invalid'?' err':'')+'" role="textbox" aria-label="咨询内容"><span class="ph">请填写咨询内容</span><span class="count">0/500</span></div>',key==='invalid'?ERR.ENTER_QUESTION:'')+'<p class="rule">'+esc(W7.LEAD_COPY.inHours)+'；非服务时段提交的，顾问上班后将优先联系您。</p></section>'));
    body().append(el('<section class="card mlist" aria-label="其他入口"><div class="sec-title">预约用仓</div>'+mrow('i-cal','个人用仓需求','','booking.html')+mrow('i-building','企业用仓需求','','business.html')+'</section>'));
    actbar(btn('提交咨询','primary block','support'),'stack');
    window.__W6.support={saved:!!last,type:last?.type||null};}};
/* --- 关于迷你考拉 --- */
V.brand={title:'关于迷你考拉',states:{default:()=>lifeCore('noDemand')},
  render(){
    /* brand zone = H01 .brand component (same markup; D-05 copy as-is) */
    body().append(el('<section class="brand card" aria-label="品牌信任" style="margin:0 16px"><div class="logo"><i></i>迷你考拉仓</div><div class="metrics"><div><b>14<small>年</small></b><span>稳定运营</span></div><div><b>590+</b><span>直营门店</span></div><div><b>30<small>万+</small></b><span>累计服务用户</span></div></div><div class="pillars"><div>'+ico('i-shield')+'<div><strong>安全防护</strong><small>24小时监控</small></div></div><div>'+ico('i-temp')+'<div><strong>恒温防潮</strong><small>智能除湿</small></div></div><div>'+ico('i-headset')+'<div><strong>专属服务</strong><small>用仓问题协助</small></div></div><div>'+ico('i-truck')+'<div><strong>上门搬运</strong><small>考拉E存服务</small></div></div></div><div class="proofs"><img src="../assets/brand-proof-hitech-demo.webp" alt="高新技术企业"><img src="../assets/brand-proof-media-demo.webp" alt="媒体报道"><img src="../assets/brand-proof-standard-demo.webp" alt="国标起草单位"></div></section>'));
    body().append(el('<section class="card about" aria-label="关于迷你考拉"><p class="para">为个人和企业提供自助仓储及用仓方案咨询。</p><h3>如何选择</h3><ol class="olist"><li><i>1</i>填写容量或按物品估算</li><li><i>2</i>主动选择租期并查看可用方案</li><li><i>3</i>核对门店地址、设施和费用</li><li><i>4</i>确认订单，付款后按指引办理入仓</li></ol><h3>存放说明</h3><p class="para">存放物品、承重、存取条件与服务范围，请在签约前向门店确认。易燃易爆、危险及法律禁止存储的物品不得入仓。</p><h3>门店与服务</h3><p class="para">支持查看北京、上海、深圳、杭州、广州的门店资料；具体库存和服务以门店确认为准。</p><div class="acts" style="margin-top:16px"><a class="btn primary md" href="s01.html">查看门店</a><a class="btn secondary md" href="acc.html?view=support&state=form">联系顾问</a></div></section>'));
    window.__W6.brand=true;}};
function renderACC(){
  const view=q.get('view')||'profile',def=V[view];if(!def)return unknown(view,V);
  const key=q.get('state')||Object.keys(def.states)[0],b=def.states[key];if(!b)return unknown(key,def.states);
  document.body.dataset.view=view;document.body.dataset.state=key;document.getElementById('tb-title').textContent=def.title;document.title='迷你考拉仓 · '+def.title+' · W6 高保真（可编辑）';
  const core=b();window.__W6={page:'ACC',view,state:key};def.render(core,key);
}
if(PAGE==='M01')renderM01();else if(PAGE==='OH01')renderOH01();else renderACC();
/* W7 D-75：开锁为演示占位 */
document.addEventListener('click',e=>{const b=e.target.closest('[data-action="unlock"]');if(b&&!document.querySelector('.toastwrap'))toast('一键开锁暂未开通，目前请按入仓指引到店存取');});
/* pending countdown ticks like W1/W2 */
setInterval(()=>{document.querySelectorAll('[role=timer]').forEach(n=>{const exp=Number(n.dataset.expires);if(exp)n.textContent=countdown(exp);});},1000);
})();
