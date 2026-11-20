/* VIS-REDESIGN-01A · W4 binder · 2026-11-17
 * Thin data binder for O03 / RN01 / EX01 / DP01 / IV01 (T8 订单与租后详情页). Every page state is built through the
 * UNMODIFIED runtime in ../runtime/ (fixtures lifecycle scenarios → demo-core.lifecycleView / lifecycleRequestRenewal /
 * lifecycleConfirmRenewal / lifecyclePayRenewal / lifecycleRequestExit / lifecycleRequestInspection /
 * lifecycleReviewInspection / lifecycleDemoRefund / lifecycleRequestInvoice / lifecycleDemoInvoice; pending / failed /
 * expired orders through quote → submit → pay / resumePendingOrder exactly like W2 O01) plus lifecycle-contract.js.
 * Label maps are PORTed verbatim from app.js (orderStatusLabel / leaseStatusLabel / depositStatusLabel / readableOrderNo)
 * and lifecycle-ui.js (stateLabel); differences are registered (D-54…). No copy, field or rule is invented. */
(function(){
'use strict';
const F=window.SIM_FIXTURES,q=new URLSearchParams(location.search),PAGE=document.body.dataset.page,REVIEW=q.get('review')==='1';
const PHONE='13800138000';
const money=n=>'¥'+Math.trunc(Number(n)).toLocaleString('zh-CN');
const fmtNum=n=>Math.trunc(Number(n)).toLocaleString('zh-CN');
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
/* W7 R-C-22：对客订单号 = MK + 下单日 8 位 + 4 位序号（内部 ID 数字尾号），不露内部 ID；O01 同格式 */
const orderNo=o=>{const d=(o?.createdAt?dateOf(o.createdAt):(o?.start_date||F.demoToday||'')).replace(/-/g,''),m=String(o?.id||'').match(/[0-9]+$/),n=m?Number(m[0])%10000:Array.from(String(o?.id||'')).reduce((a,ch)=>(Math.imul(a,31)+ch.charCodeAt(0))>>>0,0)%10000;return 'MK'+d+String(n).padStart(4,'0');};
const dateOf=ms=>new Date(Number(ms)+8*3600*1000).toISOString().slice(0,10);
const countdown=exp=>{const r=Math.max(0,Math.ceil((Number(exp)-Date.now())/1000));const p=n=>String(n).padStart(2,'0');return p(Math.floor(r/3600))+':'+p(Math.floor(r%3600/60))+':'+p(r%60);};
/* ---- label maps (PORT app.js + lifecycle-ui.js; `expired` lease key registered D-54: runtime falls back to 办理中) ---- */
const L={
  order:{paid_simulated:'已支付',pending:'待支付',payment_failed:'支付失败',payment_cancelled:'支付已取消',cancelled:'已取消',expired:'已过期'},
  lease:{upcoming:'待起租',active:'租用中',returning:'退仓处理中',ended:'已退仓',expired:'租期已到期'},
  deposit:{HELD:'押金保管中',WAITING_INSPECTION:'待验仓',REFUND_PENDING:'退款处理中',REFUND_FAILED:'退款未成功',REFUNDED:'已退还'},
  renewal:{QUOTE_PENDING:'报价确认中',QUOTE_READY:'待确认续租',PAYMENT_PENDING:'待支付续租费用',PAYMENT_FAILED:'付款未完成',PAYMENT_CANCELLED:'已暂缓支付',COMPLETED:'已完成'},
  exit:{REQUESTED:'已提交',WAITING_INSPECTION:'待验仓',INSPECTION_FAILED:'需重新验仓',INSPECTION_PASSED:'验仓通过'},
  invoice:{SUBMITTED:'已提交',PROCESSING:'申请处理中',ISSUED:'已开具',ISSUE_FAILED:'开票未成功'},
  payment:{INITIAL:'下单支付',RENEWAL:'续租费用'},exitType:{expiry:'到期退仓',early:'提前退仓'},kind:{personal:'个人',enterprise:'企业'}
};
const lab=(k,v)=>L[k][v]||'办理中';
const TONE={ok:['ISSUED','paid_simulated','active','upcoming','COMPLETED','REFUNDED','INSPECTION_PASSED','HELD'],warn:['pending','returning','QUOTE_PENDING','QUOTE_READY','PAYMENT_PENDING','PAYMENT_CANCELLED','REFUND_PENDING','WAITING_INSPECTION','REQUESTED','SUBMITTED','PROCESSING'],err:['payment_failed','PAYMENT_FAILED','INSPECTION_FAILED','REFUND_FAILED','ISSUE_FAILED','expired_lease'],info:['expired','cancelled','payment_cancelled','ended']};
const tone=v=>TONE.ok.includes(v)?'ok':TONE.warn.includes(v)?'warn':TONE.err.includes(v)?'err':'info';
const stag=(text,v)=>'<span class="tag status '+tone(v)+'">'+esc(text)+'</span>';
/* ---- shared blocks ---- */
function sheet(title,inner,extra=''){return el('<div class="scrim" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><div class="sheet"><div class="grab"></div><h4>'+esc(title)+'</h4>'+inner+extra+'</div></div>');}
function actbar(html,cls=''){document.getElementById('actbar-root').append(el('<div class="actbar'+(cls?' '+cls:'')+'" role="region" aria-label="底部操作区">'+html+'</div>'));}
const noActbar=()=>document.getElementById('screen').classList.remove('has-actbar');
const btn=(label,cls,action,extra='')=>'<button type="button" class="btn '+cls+'" data-action="'+esc(action)+'"'+extra+'>'+esc(label)+'</button>';
const emptyState=(title,sub,acts)=>el('<section class="card empty" role="status"><div class="pic">'+ico('i-order')+'</div><h4>'+esc(title)+'</h4>'+(sub?'<p>'+esc(sub)+'</p>':'')+'<div class="acts">'+acts+'</div></section>');
const chip=(label,on,action,value)=>'<button type="button" class="chipwrap" aria-pressed="'+!!on+'" data-action="'+action+'" data-value="'+esc(value)+'"><span class="chip'+(on?' on':'')+'">'+(on?ico('i-check','ico sm'):'')+esc(label)+'</span></button>';
const kv=(k,v,cls='')=>'<div class="kv"><span class="k">'+esc(k)+'</span><span class="v'+(cls?' '+cls:'')+'">'+v+'</span></div>';
const kvl=(k,v,cls='')=>'<div class="kv long"><span class="k">'+esc(k)+'</span><span class="v'+(cls?' '+cls:'')+'">'+v+'</span></div>'; /* W8：长文本口径，上下排 */
function shead(h1,tagHtml,subs){return el('<section class="shead" aria-label="订单状态"><div class="row"><h1>'+esc(h1)+'</h1>'+(tagHtml||'')+'</div><div class="sub">'+subs.filter(Boolean).map(s=>'<span>'+s+'</span>').join('')+'</div></section>');}
function sumcard(o,view,opts={}){
  const s=storeById(o.store_id),units=(o.unit_ids||[]).map(unitById),u=units[0];
  const period=view?view.start_date+' 至 '+view.end_date:o.start_date?'起租 '+o.start_date:'';
  return el('<section class="card sumcard" aria-label="订单仓位信息"><div class="store"><img class="ph" src="'+photoOf(s)+'" alt="'+esc(s.name)+'门店环境"><div><div class="name" title="'+esc(s.name)+'">'+esc(s.name)+'</div><div class="meta"><span class="ellip">'+esc(s.address)+'</span></div></div></div>'+
    '<div class="unit"><img class="ph" src="'+thumb(u)+'" alt="仓位空间示意"><div><div class="name">'+esc(units.map(cabinLabel).join(' + '))+'</div><div class="meta"><span>'+esc(u.dimensions)+'</span></div></div></div>'+
    (opts.noKv?'':'<div class="kvlist">'+kv('租期',(view?view.total_months:o.term_months)+'个月'+(view&&view.total_months!==o.term_months?' <small class="sec-ink">（含续租）</small>':''))+(period?kv(view?'起止日期':'用仓开始',period):'')+'</div>')+'</section>');
}
function orderFees(o,totalLabel){
  const special=(o.unit_pricing||[]).filter(x=>x.campaign_id),months=o.term_months,disc=Number(o.term_discount_total)>0;
  const tag=special.length?'<span class="tag promo">特价仓</span>':o.term_factor>0&&o.term_factor<1?'<span class="tag disc">'+Number((o.term_factor*10).toFixed(1))+'折</span>':'';
  return '<div class="fees">'+
    '<div class="row"><span class="k">整期租金<span class="sub">'+months+'个月</span>'+tag+'</span><b class="amt">'+money(o.rent_total)+'</b></div><div class="sec">'+money(o.monthly_average)+'/月 × '+months+'个月</div>'+
    (disc?'<div class="row saved"><span class="k">已省<span class="sub">较月基价 '+money((o.unit_pricing||[]).reduce((n,x)=>n+Number(x.base_month||0),0))+'/月</span></span><b class="amt">'+money(o.term_discount_total)+'</b></div>':'')+
    (Number(o.full_reduction)>0?'<div class="row"><span class="k">满额减<span class="sub">整期满 '+money(o.full_min)+'</span></span><b class="amt">−'+money(o.full_reduction)+'</b></div><div class="sec">减后整期租金 '+money(o.rent_after_coupon)+'</div>':'')+ /* W26 A4（D-157）：与确认订单页同一写法 */
    (special.length?'<div class="row"><span class="k">特价仓</span><b class="amt">'+special.map(x=>money(x.unit_special_price)+'/月').join('、')+'</b></div>':'')+
    (Number(o.coupon_discount)>0?'<div class="row"><span class="k">优惠券</span><b class="amt">−'+money(o.coupon_discount)+'</b></div>':'')+
    '<div class="row"><span class="k">押金<span class="sub">1个月月租</span></span><b class="amt">'+money(o.deposit)+'</b></div>'+
    '<div class="row"><span class="k">整单管理费</span><b class="amt">'+money(o.management_fee)+'</b></div>'+
    '<div class="total"><span>'+esc(totalLabel)+'</span><b class="amt">'+money(o.payable)+'</b></div></div>';
}
function steps(items,cur,fail){ /* items: [title, sub?]; cur: 1-based current index; fail: index rendered as failed */
  return '<ol class="steps">'+items.map((it,i)=>{const n=i+1,cls=fail===n?'fail':n<cur?'done':n===cur?'cur':'';return '<li class="'+cls+'"><span class="dot">'+(cls==='done'?ico('i-check'):cls==='fail'?ico('i-close'):'')+'</span><div><div class="t">'+esc(it[0])+'</div>'+(it[1]?'<div class="s">'+it[1]+'</div>':'')+'</div></li>';}).join('')+'</ol>';
}
const lrow=(icon,k,v,on,action)=>'<a class="lrow" href="#'+esc(action)+'" data-action="'+esc(action)+'"><span class="k">'+ico(icon,'ico lead')+esc(k)+'</span><span class="v'+(on?' on':'')+'">'+esc(v||'')+'</span>'+ico('i-chev','ico chev')+'</a>';
const seg=(opts,on,action)=>'<div class="seg" role="radiogroup">'+opts.map(([v,t])=>'<button type="button" role="radio" aria-checked="'+(v===on)+'" class="'+(v===on?'on':'')+'" data-action="'+action+'" data-value="'+v+'">'+esc(t)+'</button>').join('')+'</div>';
const field=(label,inner,err,opt)=>'<div class="field"><label>'+esc(label)+(opt?'<span class="opt">（可选）</span>':'')+'</label>'+inner+(err?'<div class="ferr">'+esc(err)+'</div>':'')+'</div>';
const input=(val,ph,suffix,err,aria)=>'<div class="input'+(err?' err':'')+'" role="textbox" aria-label="'+esc(aria||ph)+'"><span class="ph'+(val?' filled':'')+'">'+esc(val||ph)+'</span>'+(suffix||'')+'</div>';
const unknown=(key,obj)=>document.body.prepend(el('<p style="padding:16px;color:#B42318">未知状态 '+esc(key)+'；可用：'+Object.keys(obj).join(' / ')+'</p>'));
const body=()=>document.getElementById('body');
/* ---- builders (runtime only) ---- */
const lifeCore=scn=>{const c=makeCore();c.setScenario(scn);return c;};
const firstOrder=c=>c.state().orders[0];
function readyCore(scn='normal'){const c=makeCore();c.setScenario(scn);const u=F.units.find(x=>x.store_id==='SIM_BJ01'&&x.status==='available'&&Number(x.volume)>=3.5);c.select([u.id]);authorize(c);c.setDate(tomorrow());return c;}
const life=scn=>()=>{const c=lifeCore(scn);return {core:c,id:firstOrder(c).id};};

/* ======================= W7 共用块（TRADE：R-C-03…R-C-29） ======================= */
const W=window.MK_W7||{PENDING_TTL_H:3,RENEW_QUOTE_TTL_H:24,rentTotal:(u,m)=>u.base_month*m,termDiscount:()=>''};
const PLACEHOLDER='以协议约定为准',C=window.MK_CONTRACT,ct=k=>{const t=C.t(k);return esc(t==='待业务提供'?'请咨询客服':t);},HOTLINE=C.t('service.hotline').replace(/-/g,''); /* W8：口径取自合同文本模块；合同无约定的仍显示「待业务提供」 */ /* 业务未给口径：只留显示位，不写数字（契约 §5） */
function dialog(title,inner,acts){return el('<div class="scrim center" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><div class="dialog"><h4>'+esc(title)+'</h4>'+inner+'<div class="acts">'+acts+'</div></div></div>');}
function toast(text){document.getElementById('toast-root').replaceChildren(el('<div class="toastwrap" role="status"><span class="toast">'+esc(text)+'</span></div>'));}
const overlayRoot=()=>document.getElementById('overlay-root');
const UNLOCK_TOAST='一键开锁暂未开通，目前请按入仓指引到店存取'; /* D-75 */
const addDays=(d,n)=>{const t=new Date(d+'T00:00:00Z');t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10);};
const addMonths=(d,n)=>{const t=new Date(d+'T00:00:00Z');t.setUTCMonth(t.getUTCMonth()+n);return t.toISOString().slice(0,10);};
const daysBetween=(a,b)=>Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000);
const clock=ms=>'<b class="clock" role="timer">'+countdown(ms)+'</b>';
const hm=ms=>{const t=new Date(Number(ms)+8*3600*1000).toISOString();return t.slice(0,10)+' '+t.slice(11,16);};
/* R-C-06 失败态统一结构：标题 → 原因位 → 可改项 → 联系门店 */
function failBlock(title,fixables,store,extra){
  return el('<section class="card notice err failblock" role="status" aria-label="'+esc(title)+'"><div class="t">'+esc(title)+'</div>'+
    '<div class="kvlist">'+kv('原因','—')+kv('说明','以门店 / 顾问告知为准','soft')+(fixables&&fixables.length?kv('您可以','<span class="fixes">'+fixables.map(esc).join(' · ')+'</span>'):'')+'</div>'+
    (extra||'')+'<div class="facts-acts"><a class="btn neutral md" href="tel:'+esc(store?.phone||HOTLINE)+'" data-action="callStore">'+ico('i-phone','ico sm')+'联系门店</a></div></section>');
}
/* R-C-24 门店服务区：导航 / 联系门店 / 开锁（演示占位，仅在租、即将到期、续租待确认） */
function storeSvc(store,withUnlock){
  const cell=(icon,label,action,href)=>'<'+(href?'a href="'+esc(href)+'"':'button type="button"')+' class="svc-cell" data-action="'+action+'">'+ico(icon)+'<span>'+esc(label)+'</span></'+(href?'a':'button')+'>';
  return el('<section class="card storesvc" aria-label="门店服务"><div class="sec-title">门店服务</div><div class="svc-grid'+(withUnlock?' n3':'')+'">'+cell('i-nav','门店导航','navigate')+cell('i-phone','联系门店','callStore','tel:'+(store.phone||HOTLINE))+(withUnlock?cell('i-lock','一键开锁','unlock'):'')+'</div>'+(withUnlock?'<div class="rule">一键开锁暂未开通，目前请按入仓指引到店存取。</div>':'')+'</section>');
}
const submittingBtn=label=>'<button type="button" class="btn primary block loading disabled" disabled aria-disabled="true" aria-busy="true"><span class="spin" aria-hidden="true"></span>'+esc(label)+'</button>';
const noOrder=page=>{noActbar();body().append(emptyState(page==='O03'?'暂无可查看的订单':'没有可办理租后服务的订单',page==='O03'?'请从「订单」列表选择需要查看的订单。':'请从「订单」进入。',btn('返回订单','primary md','mine')));window.__W4={page,state:document.body.dataset.state,order:null};};

/* ======================= O03 订单详情 ======================= */
const pendingCore=()=>{const c=readyCore();c.quote();const o=c.submit();return {core:c,id:o.id};};
const expiringCore=()=>{const c=lifeCore('lifeActive'),st=c.state(),d=new Date(c.today()+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+20);d.setUTCMonth(d.getUTCMonth()-12);st.orders[0].start_date=d.toISOString().slice(0,10);const c2=makeCore(st);return {core:c2,id:firstOrder(c2).id};}; /* 同 H01 expiring 构造（剩余 20 天） */
/* W26：life* 场景订单写死 ¥300/月 × 12（D-56）。这里派生两类演示订单，runtime/fixtures.js 不改：
   fullCore  整期租金达到满额减门槛（A4）：A005 8m³ × 12 个月，金额由 core.amounts 给出（已套 D-157 满额减）；
   legacyCore 按旧折扣表成交的在租订单（A5）：A003 3.5m³ × 24 个月 6 折（W20 及以前 13–36 个月档），剩余约 20 天。 */
const patchPay=(st,from,to)=>{const walk=x=>{if(!x||typeof x!=='object')return;for(const k in x){if(k==='amount'&&Number(x[k])===Number(from))x[k]=to;else walk(x[k]);}};walk(st);};
function fullCore(scn='lifeActive'){const c=lifeCore(scn),st=c.state(),o=st.orders[0],u=F.units.find(x=>x.id==='SIM_BJ01_U05'),a=c.amounts([u.id],12),old=o.payable;
  Object.assign(o,{unit_ids:[u.id],capacity_m3:u.volume,term_months:12,rent_total:a.rent_total,monthly_average:a.monthly_average,rent_after_coupon:a.rent_after_coupon,monthly_after_coupon:a.monthly_after_coupon,deposit:a.deposit,management_fee:a.management_fee,coupon_id:null,coupon_discount:0,full_reduction:a.full_reduction,full_min:a.full_min,term_factor:a.term_factor,term_discount_total:a.term_discount_total,unit_pricing:a.unit_pricing,payable:a.payable});
  patchPay(st,old,a.payable);const c2=makeCore(st);return {core:c2,id:firstOrder(c2).id};}
const LEGACY_FACTOR=0.6,LEGACY_TERM=24;
function legacyCore(scn='lifeActive',renew){const c=lifeCore(scn),st=c.state(),o=st.orders[0],u=unitById(o.unit_ids[0]),base=Number(u.base_month),mon=Math.trunc(base*LEGACY_FACTOR+1e-9),old=o.payable;
  const d=new Date(c.today()+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+20);d.setUTCMonth(d.getUTCMonth()-LEGACY_TERM);
  Object.assign(o,{term_months:LEGACY_TERM,start_date:d.toISOString().slice(0,10),rent_total:mon*LEGACY_TERM,monthly_average:mon,rent_after_coupon:mon*LEGACY_TERM,monthly_after_coupon:mon,deposit:mon,term_factor:LEGACY_FACTOR,term_discount_total:(base-mon)*LEGACY_TERM,unit_pricing:[{unit_id:u.id,base_month:base,monthly_rent:mon,term_factor:LEGACY_FACTOR}],payable:mon*LEGACY_TERM+mon+Number(o.management_fee)});
  patchPay(st,old,o.payable);
  if(renew){const walk=x=>{if(!x||typeof x!=='object')return;if(x.id==='SIM_REVIEW_RENEWAL'&&'quote_monthly' in x)Object.assign(x,{months:renew,quote_monthly:mon,quote_total:mon*renew});for(const k in x)walk(x[k]);};walk(st);}
  const c2=makeCore(st);return {core:c2,id:firstOrder(c2).id};}
/* D-180：在租客户首次续租沿用原折扣。设计侧取「原折扣与现行公开折扣中更优的一个」：只有原折扣更深时才出现沿用说明 */
const tf=m=>{const r=(F.pricing.termRules||[]).find(x=>m>=x.min&&m<=x.max);return r?r.factor:1;};
const zhe=f=>Number((f*10).toFixed(1))+' 折';
function keepInfo(raw,v,months){const f=Number(raw.term_factor),first=v.total_months===Number(raw.term_months)&&!(v.renewal_requests||[]).some(x=>x.status==='COMPLETED');
  if(!first||!(f>0&&f<1)||!(f<tf(months)-1e-9))return null;
  const base=(raw.unit_ids||[]).map(unitById).reduce((n,u)=>n+Number(u.base_month||0),0),mon=Math.trunc(base*f+1e-9),pub=Math.trunc(base*tf(months)+1e-9);
  return {factor:f,label:zhe(f),monthly:mon,total:mon*months,pubLabel:zhe(tf(months)),pubMonthly:pub,pubTotal:pub*months,less:pub-mon};}
const O03={
  active_full:()=>fullCore('lifeActive'), /* W26 A4：费用明细含满额减行 */
  empty:()=>({core:lifeCore('noDemand'),id:null}),
  pending:pendingCore,
  paying:pendingCore, /* W7 新增：支付等待 */
  payment_failed:()=>{const r=pendingCore();r.core.pay(r.id,'failed');return r;},
  expired:()=>{const r=pendingCore();const c2=window.SIM_CORE.create({state:r.core.state(),now:()=>Date.now()+4*3600*1000});c2.resumePendingOrder(r.id);return {core:c2,id:r.id};},
  cancelled:()=>{const r=pendingCore();r.core.cancelOrder(r.id);return r;}, /* W7 新增 */
  identity:life('lifeIdentity'),upcoming:life('lifeUpcoming'),active:life('lifeActive'),
  expiring:expiringCore, /* W7 新增（R-C-10） */
  renewal:life('lifeRenewalQuote'),returning:life('lifeReturning'),inspection:life('lifeInspection'),refund:life('lifeRefund'),expired_lease:life('lifeExpired'),ended:life('lifeEnded')
};
/* 阶段判定：由订单 / 生命周期数据推出，不靠状态键 */
function o03Stage(o,v,core){
  if(o.status!=='paid_simulated')return ['payment_cancelled'].includes(o.status)?'cancelled':o.status;
  const dep=v.deposit_status,xs=v.exit?.status,ren=(v.renewal_requests||[]).find(x=>x.status!=='COMPLETED');
  if(['REFUND_PENDING','REFUND_FAILED'].includes(dep))return 'refund';
  if(v.lease_status==='ended')return 'ended';
  if(xs==='WAITING_INSPECTION')return 'inspection';
  if(v.lease_status==='returning'||xs)return 'returning';
  if(v.lease_status==='expired')return 'expired_lease';
  if(v.identity_status!=='verified')return 'identity';
  if(ren)return ren.status==='QUOTE_PENDING'?'renewal_pending':'renewal';
  if(v.lease_status==='upcoming')return 'upcoming';
  const n=daysBetween(core.today(),v.end_date);if(n>=0&&n<=30)return 'expiring';
  return 'active';
}
/* 阶段 → [大标题, 标签, 标签色调]（R-C-09 / R-C-29；标题与标签不重复同一句） */
const O03_HEAD={pending:['订单待支付','待支付','warn'],payment_failed:['支付未成功，订单为您保留','待支付','warn'],expired:['订单已超时','已失效','info'],cancelled:['订单已取消','已取消','info'],invalidated:['报价已失效','已失效','info'],
  identity:['入仓前需完成验证','待认证','warn'],upcoming:['入仓准备','待起租','ok'],active:['仓位租用中','租用中','ok'],expiring:['租期即将到期','需关注','warn'],renewal:['续租报价待确认','待确认','warn'],renewal_pending:['续租申请处理中','报价确认中','warn'],
  returning:['退仓处理中','办理中','warn'],inspection:['等待门店验仓','待验仓','warn'],refund:['押金处理中','退款处理中','warn'],expired_lease:['租期已到期','待办理','warn'],ended:['租赁已结束','已退仓','info']};
const tagT=(text,t)=>'<span class="tag status '+t+'">'+esc(text)+'</span>';
function renderO03(){
  const key=q.get('state')||'active',b=O03[key];if(!b)return unknown(key,O03);
  const {core,id}=b();document.body.dataset.state=key;
  const o=id?window.MK_LIFECYCLE_CONTRACT_V1.orderById(core.state(),id):null,raw=id?core.state().orders.find(x=>x.id===id):null;
  if(!o)return noOrder('O03');
  const paid=o.status==='paid_simulated',v=paid?core.lifecycleView(id):null,stage=o03Stage(o,v,core),store=storeById(raw.store_id);
  const head=O03_HEAD[stage]||[lab('order',o.status),'办理中','info'];
  const exp=raw.expiresAt||(raw.createdAt?raw.createdAt+W.PENDING_TTL_H*3600*1000:0);
  const left=paid?daysBetween(core.today(),v.end_date):null;
  const ren=paid?(v.renewal_requests||[]).find(x=>x.status!=='COMPLETED'):null;
  const subs=['订单号 '+orderNo(raw),raw.createdAt?'下单 '+dateOf(raw.createdAt):'',
    ['pending','payment_failed'].includes(stage)&&exp?'支付剩余 '+clock(exp):'',
    stage==='expiring'?'剩余 <b>'+left+' 天</b>':'',stage==='upcoming'||stage==='identity'?'计划起租 '+esc(raw.start_date):''];
  body().append(shead(head[0],tagT(head[1],head[2]),subs));
  /* 阶段说明：每个阶段至多一条，且不重复标题 */
  const note={
    payment_failed:['','订单保留至 '+hm(exp)+'。继续支付前会再次确认仓位、价格和优惠。','err'],
    expired:['','原订单不可继续支付，需重新确认仓位和当前价格。',''],
    cancelled:['','仓位已释放。如仍需用仓，可重新找仓下单。',''],
    identity:['','这笔订单下单时未完成实名认证，完成后起租日起可入仓存取。','warn'],
    expired_lease:['请办理续租或退仓',C.t('overdue.short')+'。','warn'],
    renewal:['','门店已给出续租报价，报价 '+W.RENEW_QUOTE_TTL_H+' 小时内有效，过期后按常规折扣价续租。','warn']
  }[stage];
  if(note)body().append(el('<section class="card notice'+(note[2]?' '+note[2]:'')+'" role="status">'+(note[0]?'<div class="t">'+esc(note[0])+'</div>':'')+'<div class="s">'+esc(note[1])+'</div></section>'));
  body().append(sumcard(raw,v));
  if(paid){
    if(stage!=='ended')body().append(storeSvc(store,['active','expiring','renewal','renewal_pending'].includes(stage)));
    body().append(el('<section class="card" aria-label="租赁进度"><div class="sec-title">租赁进度</div><div class="kvlist">'+kv('累计租期',v.total_months+'个月')+kv('租期至',v.end_date)+(stage==='expiring'?kv('剩余租期',left+' 天'):'')+(v.identity_status==='verified'?'':kv('实名认证','<span class="sec-ink">待完成</span>'))+kv('押金',lab('deposit',v.deposit_status))+'</div></section>'));
    const rows=[],lk=v.lease_status;
    rows.push(lrow('i-shield','电子合同','已签署',false,'contract').replace('href="#contract"','href="econtract.html?state=signed"')); /* W26 A9：链接到电子合同查看页 */ /* W20 D-148：签署后生成的电子合同在订单详情可查看 */
    if(['active','upcoming'].includes(lk))rows.push(v.identity_status==='verified'?lrow('i-shield','入仓指引','',false,'access'):lrow('i-shield','实名认证','待完成',true,'identity'));
    if(['active','upcoming'].includes(lk)&&v.total_months<60)rows.push(lrow('i-renew',ren?'续租进度':'续租',ren?lab('renewal',ren.status):'可申请',!!ren,'RN01'));
    if(lk==='expired')rows.push(lrow('i-renew','续租','可申请',true,'RN01'));
    if(['active','expired','returning'].includes(lk))rows.push(lrow('i-cal',lk==='returning'?'退仓进度':'退仓',v.exit?lab('exit',v.exit.status):'',!!v.exit,'EX01'));
    if(lk==='upcoming')rows.push(lrow('i-cal','退订 / 退仓','',false,'EX01'));
    rows.push(lrow('i-ticket','押金进度',['REFUND_PENDING','REFUND_FAILED','REFUNDED','WAITING_INSPECTION'].includes(v.deposit_status)?lab('deposit',v.deposit_status):'',['REFUND_PENDING','REFUND_FAILED'].includes(v.deposit_status),'DP01'));
    rows.push(lrow('i-note','申请发票',v.invoices.length?'已提交 '+v.invoices.length+' 份':'可申请',false,'IV01'));
    body().append(el('<section class="card svclist" aria-label="订单服务"><div class="sec-title">订单服务</div>'+rows.join('')+'</section>'));
  }
  body().append(el('<section class="card" aria-label="费用明细"><div class="sec-title">费用明细</div>'+orderFees(raw,paid?'已付':['expired','cancelled'].includes(stage)?'原订单金额（'+(stage==='cancelled'?'已取消':'已失效')+'）':'本次应付')+'</section>'));
  if(['pending','payment_failed'].includes(stage))body().append(el('<div class="more-row cancel-row">'+btn('取消订单','danger md','cancelOrder')+'</div>')); /* R-C-03 */
  const amt='<div><div class="lab">本次应付</div><div class="amt">'+money(raw.payable)+'</div></div>',two=(a,b2)=>actbar('<div class="split">'+b2+a+'</div>','stack'),one=a=>actbar(a,'stack');
  if(key==='paying')actbar(amt+'<button type="button" class="btn primary loading disabled" disabled aria-disabled="true" aria-busy="true"><span class="spin" aria-hidden="true"></span>支付确认中</button>');
  else if(stage==='pending')actbar(amt+btn('继续支付','primary','resumeOrder'));
  else if(stage==='payment_failed')actbar(amt+btn('继续支付','primary','resumeFailed'));
  else if(['expired','cancelled','invalidated'].includes(stage))one(btn('重新找仓','primary block','restart'));
  else if(stage==='identity')two(btn('完成实名认证','primary','identity'),btn('门店导航','neutral','navigate'));
  else if(stage==='upcoming')two(btn('门店导航','primary','navigate'),btn('入仓指引','neutral','access'));
  else if(stage==='active')two(btn('一键开锁','primary','unlock'),btn('门店导航','neutral','navigate'));
  else if(stage==='expiring')two(btn('办理续租','primary','RN01'),btn('一键开锁','neutral','unlock'));
  else if(stage==='renewal')two(btn('确认续租报价','primary','RN01'),btn('一键开锁','neutral','unlock'));
  else if(stage==='renewal_pending')two(btn('查看续租进度','primary','RN01'),btn('一键开锁','neutral','unlock'));
  else if(stage==='returning')two(btn('查看退仓进度','primary','EX01'),btn('门店导航','neutral','navigate'));
  else if(stage==='inspection')one(btn('查看验仓结果','primary block','EX01'));
  else if(stage==='refund')one(btn('查看押金进度','primary block','DP01'));
  else if(stage==='expired_lease')two(btn('办理续租','primary','RN01'),btn('办理退仓','neutral','EX01'));
  else if(stage==='ended')one(btn('再次找仓','primary block','restart'));
  else noActbar();
  const cancelDlg=()=>dialog('确认取消订单？','<p>取消后仓位将释放；如仍需用仓，可重新下单。</p>',btn('暂不取消','neutral','close')+btn('确认取消','danger','confirmCancel'));
  if(key==='paying')overlayRoot().append(el('<div class="scrim center" role="status" aria-live="polite" aria-label="正在确认支付结果"><div class="dialog paywait"><span class="spin lg" aria-hidden="true"></span><h4>正在确认支付结果</h4><p>请勿关闭页面，确认后自动更新订单状态。</p></div></div>'));
  if(q.get('overlay')==='cancel'&&['pending','payment_failed'].includes(stage))overlayRoot().append(cancelDlg());
  if(q.get('overlay')==='unlock')toast(UNLOCK_TOAST);
  document.addEventListener('click',e=>{const a=e.target.closest('[data-action]')?.dataset.action;if(a==='unlock')toast(UNLOCK_TOAST);else if(a==='cancelOrder')overlayRoot().replaceChildren(cancelDlg());else if(a==='close')overlayRoot().replaceChildren();});
  window.__W4={page:'O03',state:key,stage,order:o.status,lease:v?.lease_status||null,deposit:v?.deposit_status||null,identity:v?.identity_status||null,head:head.slice(0,2),orderNo:orderNo(raw),services:[...document.querySelectorAll('.svclist .lrow .k')].map(e=>e.textContent.trim())};
}

/* ======================= RN01 续租申请 ======================= */
const rnQuote=life('lifeRenewalQuote');
const RN01={
  empty:()=>({core:lifeCore('noDemand'),id:null}),
  form:life('lifeActive'),
  submitting:life('lifeActive'), /* W7 新增 */
  quote_pending:()=>{const c=lifeCore('lifeActive'),id=firstOrder(c).id;c.lifecycleRequestRenewal(id,6);return {core:c,id};},
  quote_ready:rnQuote,
  form_keep:()=>legacyCore('lifeActive'),              /* W26 A5（D-180）：首次续租沿用原折扣 · 填写 */
  quote_keep:()=>legacyCore('lifeRenewalQuote',12),    /* W26 A5：首次续租沿用原折扣 · 报价待确认 */
  quote_keep_expired:()=>legacyCore('lifeRenewalQuote',12), /* W27：沿用原折扣的报价过期，仍沿用，重新提交 */
  quote_expired:rnQuote, /* W7 新增（D-74 / D-102）：报价超过 24 小时，恢复常规折扣价，仍可续租 */
  payment_pending:()=>{const c=lifeCore('lifeRenewalQuote'),id=firstOrder(c).id;c.lifecycleConfirmRenewal(id,'SIM_REVIEW_RENEWAL');return {core:c,id};},
  payment_failed:()=>{const c=lifeCore('lifeRenewalQuote'),id=firstOrder(c).id;c.lifecycleConfirmRenewal(id,'SIM_REVIEW_RENEWAL');c.lifecyclePayRenewal(id,'SIM_REVIEW_RENEWAL','failed');return {core:c,id};},
  cancelled:()=>{const c=lifeCore('lifeRenewalQuote'),id=firstOrder(c).id;c.lifecycleConfirmRenewal(id,'SIM_REVIEW_RENEWAL');c.lifecyclePayRenewal(id,'SIM_REVIEW_RENEWAL','cancelled');return {core:c,id};},
  completed:()=>{const c=lifeCore('lifeRenewalQuote'),id=firstOrder(c).id;c.lifecycleConfirmRenewal(id,'SIM_REVIEW_RENEWAL');c.lifecyclePayRenewal(id,'SIM_REVIEW_RENEWAL','success');return {core:c,id};},
  unavailable:life('lifeReturning')
};
const RN_STEPS=['提交续租需求','门店确认报价','确认续租方案','支付续租费用','新租期生效'];
function renderRN01(){
  let key=q.get('state')||'form';const b=RN01[key];if(!b)return unknown(key,RN01);
  let {core,id}=b();document.body.dataset.state=key;
  if(!id)return noOrder('RN01');
  const v=core.lifecycleView(id),raw=core.state().orders.find(x=>x.id===id),store=storeById(raw.store_id),units=(raw.unit_ids||[]).map(unitById);
  const rkey=key;key={form_keep:'form',quote_keep:'quote_ready',quote_keep_expired:'quote_expired'}[key]||key; /* W26 A5：沿用原折扣的两个状态复用原版式 */
  const r=(v.renewal_requests||[]).at(-1),rs=r?.status||null,expiredQ=key==='quote_expired';
  const open=['active','upcoming'].includes(v.lease_status)&&v.total_months<60&&!(r&&rs!=='COMPLETED');
  const H={form:'申请续租',submitting:'申请续租',quote_pending:'门店正在确认报价',quote_ready:'续租报价待确认',quote_expired:'续租报价已过期',payment_pending:'续租费用待支付',payment_failed:'续租付款未成功',cancelled:'续租付款已暂缓',completed:'续租已生效',unavailable:'暂不能续租'}[key];
  const T={form:['可申请','ok'],submitting:['提交中','warn'],quote_pending:['报价确认中','warn'],quote_ready:['待确认','warn'],quote_expired:['报价已过期','info'],payment_pending:['待支付','warn'],payment_failed:['待支付','err'],cancelled:['待支付','warn'],completed:['已完成','ok'],unavailable:['不可办理','info']}[key];
  body().append(shead(H,tagT(T[0],T[1]),['订单号 '+orderNo(raw),'当前租期至 '+v.end_date,'累计 '+v.total_months+'个月']));
  const kx=rkey==='quote_keep_expired'&&r?keepInfo(raw,v,r.months):null;
  if(expiredQ)body().append(el('<section class="card notice" role="status"><div class="s">'+(kx?'续租报价已过期。首次续租仍可沿用原订单的 '+esc(kx.label)+'，重新提交后由门店确认。':'续租报价已过期，可按常规折扣价续租。')+'</div></section>'));
  body().append(sumcard(raw,v,{noKv:true}));
  const cur={form:1,submitting:1,quote_pending:2,quote_ready:3,quote_expired:3,payment_pending:4,payment_failed:4,cancelled:4,completed:6,unavailable:1}[key];
  const sub=i=>i===1&&r?'续租 '+r.months+'个月':i===2&&rs&&rs!=='QUOTE_PENDING'?(expiredQ?'报价已过期':'¥'+fmtNum(r.quote_monthly)+'/月'):i===5&&rs==='COMPLETED'?'新租期至 <b>'+v.end_date+'</b> · 累计 '+v.total_months+'个月':'';
  if(key!=='unavailable')body().append(el('<section class="card" aria-label="续租进度"><div class="sec-title">续租进度</div>'+steps(RN_STEPS.map((t,i)=>[t,sub(i+1)]),cur,key==='payment_failed'?4:undefined)+'</section>'));
  if(key==='unavailable'){body().append(el('<section class="card notice warn" role="status"><div class="s">退仓处理中的订单不能续租。</div></section>'));actbar(btn('返回订单详情','neutral block','O03'),'stack');}
  if(key==='form'||key==='submitting'){
    const max0=60-v.total_months;
    const months=Math.max(1,Math.min(max0,Number(raw.term_months)||6)),max=max0,rnHint=W.termHint(months); /* W21 D-158 / D-159 */
    body().append(el('<section class="card" aria-label="续租月数"><div class="sec-title">续租月数</div><div class="kv" style="border:0"><span class="k">续租</span><span class="v"><span class="stepper" aria-label="续租月数"><button type="button" class="'+(months<=1?'off':'')+'" aria-label="减少">−</button><output>'+months+'个月</output><button type="button" aria-label="增加">+</button></span></span></div><div class="chips inline soft" role="group" aria-label="常用续租月数" style="padding-top:4px">'+[3,6,12].map(m=>chip(m+'个月',m===months,'months',m)).join('')+'</div>'+(rnHint?'<div class="nudge" style="padding-top:6px">'+esc(rnHint)+'</div>':'')+'<div class="rule">可续租 1–'+max+'个月，累计租期不超过 60 个月</div></section>'));
    const kp=keepInfo(raw,v,months);
    if(kp)body().append(el('<section class="card rnkeep" aria-label="续租费用"><div class="sec-title">续租费用</div><div class="fees"><div class="row"><span class="k">续租租金<span class="sub">'+months+'个月</span><span class="tag disc">'+esc(kp.label.replace(' ',''))+'</span></span><b class="amt">约 '+money(kp.total)+'</b></div><div class="sec">'+money(kp.monthly)+'/月 × '+months+'个月</div></div><div class="keepnote" role="note">首次续租沿用您原订单的 '+esc(kp.label)+'，比现在 '+months+' 个月的 '+esc(kp.pubLabel)+'每月少 '+money(kp.less)+'。</div><div class="rule">金额以门店确认的报价为准。</div></section>'));
    else body().append(el('<section class="card" aria-label="续租费用"><div class="sec-title">续租费用</div><div class="fees"><div class="row"><span class="k">续租租金<span class="sub">'+months+'个月</span></span><b class="amt muted">提交后由门店报价</b></div></div><div class="rule">续租价格以门店确认的报价为准。</div></section>'));
    if(key==='submitting')actbar(submittingBtn('提交中…'),'stack');
    else if(kp)actbar('<div><div class="lab">续租 '+months+'个月 · 沿用 '+esc(kp.label)+'</div><div class="amt">约 '+money(kp.total)+'</div></div>'+btn('提交续租需求','primary','requestRenewal'));
    else actbar('<div><div class="lab">续租 '+months+'个月</div><div class="amt muted">报价待门店确认</div></div>'+btn('提交续租需求','primary','requestRenewal'));
  }
  /* 常规折扣价（折扣表参考价）= Σ 月基价 × 续租月数 × 该月数折扣档 */
  const regular=r?units.reduce((n,u)=>n+W.rentTotal(u,r.months),0):0,disc=r?W.termDiscount(r.months):'';
  /* 报价截止 = 报价后 24 小时与当前租期到期时刻中较早者（D-102）；演示以「现在」为报价时刻 */
  const leaseEndMs=Date.parse(addDays(v.end_date,1)+'T00:00:00Z')-8*3600*1000,deadline=Math.min(Date.now()+W.RENEW_QUOTE_TTL_H*3600*1000,leaseEndMs),capped=deadline===leaseEndMs;
  const period=r?kv('新租期至',addMonths(v.end_date,r.months))+kv('租期衔接','自当前租期截止日 '+v.end_date+' 顺延 '+r.months+'个月，不中断','soft'):'';
  const kq=r&&rkey==='quote_keep'?keepInfo(raw,v,r.months):null;
  if(kq){
    body().append(el('<section class="card rnquote rnkeep" aria-label="续租报价"><div class="sec-title">续租报价</div><div class="fees"><div class="row"><span class="k">续租租金<span class="sub">'+r.months+'个月</span><span class="tag disc">'+esc(kq.label.replace(' ',''))+'</span></span><b class="amt">'+money(r.quote_total)+'</b></div><div class="sec">'+money(r.quote_monthly)+'/月 × '+r.months+'个月</div>'+
      '<div class="row ref"><span class="k">现行折扣价<span class="sub">'+esc(kq.pubLabel.replace(' ',''))+'</span></span><b class="amt muted">'+money(kq.pubTotal)+'</b></div>'+
      '<div class="total"><span>续租应付</span><b class="amt">'+money(r.quote_total)+'</b></div></div>'+
      '<div class="keepnote" role="note">首次续租沿用您原订单的 '+esc(kq.label)+'，比现在 '+r.months+' 个月的 '+esc(kq.pubLabel)+'每月少 '+money(kq.less)+'，本次共少 '+money(kq.pubTotal-r.quote_total)+'。</div>'+
      '<div class="kvlist">'+kv('报价有效至',hm(deadline)+' · 剩余 '+clock(deadline))+kv('付款截止','与报价有效期相同','soft')+period+'</div>'+
      '<div class="rule">'+(capped?'距当前租期到期不足 '+W.RENEW_QUOTE_TTL_H+' 小时，报价有效期截至租期到期。':'报价 '+W.RENEW_QUOTE_TTL_H+' 小时内有效。')+'付款完成后新租期生效。</div></section>'));
    body().append(el('<div class="more-row rn-alt">'+btn('暂不续租','text','skipRenewal')+'</div>'));
    actbar('<div><div class="lab">续租应付</div><div class="amt">'+money(r.quote_total)+'</div></div>'+btn('确认并支付','primary','confirmRenewal'));
  }
  if(key==='quote_ready'&&!kq){
    body().append(el('<section class="card rnquote" aria-label="续租报价"><div class="sec-title">续租报价</div><div class="fees"><div class="row"><span class="k">门店报价<span class="sub">'+r.months+'个月</span></span><b class="amt">'+money(r.quote_total)+'</b></div><div class="sec">'+money(r.quote_monthly)+'/月 × '+r.months+'个月</div>'+
      '<div class="row ref"><span class="k">常规折扣价<span class="sub">'+(disc||'')+'</span></span><b class="amt muted">'+money(regular)+'</b></div>'+
      '<div class="total"><span>续租应付</span><b class="amt">'+money(r.quote_total)+'</b></div></div>'+
      '<div class="kvlist">'+kv('报价有效至',hm(deadline)+' · 剩余 '+clock(deadline))+kv('付款截止','与报价有效期相同','soft')+period+'</div>'+
      '<div class="rule">'+(capped?'距当前租期到期不足 '+W.RENEW_QUOTE_TTL_H+' 小时，报价有效期截至租期到期。':'报价 '+W.RENEW_QUOTE_TTL_H+' 小时内有效。')+'过期后按常规折扣价续租。付款完成后新租期生效。</div></section>'));
    body().append(el('<div class="more-row rn-alt">'+btn('按常规折扣续租','text','renewRegular')+btn('暂不续租','text','skipRenewal')+'</div>'));
    actbar('<div><div class="lab">续租应付</div><div class="amt">'+money(r.quote_total)+'</div></div>'+btn('确认并支付','primary','confirmRenewal'));
  }
  if(expiredQ&&kx){
    body().append(el('<section class="card rnquote rnkeep" aria-label="续租费用"><div class="sec-title">续租费用</div><div class="fees"><div class="row"><span class="k">续租租金<span class="sub">'+r.months+'个月</span><span class="tag disc">'+esc(kx.label.replace(' ',''))+'</span></span><b class="amt">约 '+money(kx.total)+'</b></div><div class="sec">'+money(kx.monthly)+'/月 × '+r.months+'个月</div>'+
      '<div class="row ref"><span class="k">原门店报价<span class="sub">已过期</span></span><b class="amt muted strike">'+money(r.quote_total)+'</b></div></div><div class="kvlist">'+period+'</div><div class="rule">续租价格以门店确认的报价为准。</div></section>'));
    body().append(el('<div class="more-row rn-alt">'+btn('暂不续租','text','skipRenewal')+'</div>'));
    actbar('<div><div class="lab">续租 '+r.months+'个月 · 沿用 '+esc(kx.label)+'</div><div class="amt">约 '+money(kx.total)+'</div></div>'+btn('重新提交续租需求','primary','requestRenewal'));
  }
  if(expiredQ&&!kx){
    body().append(el('<section class="card rnquote" aria-label="续租费用"><div class="sec-title">续租费用</div><div class="fees"><div class="row"><span class="k">常规折扣价<span class="sub">'+r.months+'个月'+(disc?' · '+disc:'')+'</span></span><b class="amt">'+money(regular)+'</b></div><div class="sec">'+money(Math.round(regular/r.months))+'/月 × '+r.months+'个月</div>'+
      '<div class="row ref"><span class="k">原门店报价<span class="sub">已过期</span></span><b class="amt muted strike">'+money(r.quote_total)+'</b></div>'+
      '<div class="total"><span>续租应付</span><b class="amt">'+money(regular)+'</b></div></div><div class="kvlist">'+period+'</div><div class="rule">付款完成后新租期生效。</div></section>'));
    body().append(el('<div class="more-row rn-alt">'+btn('暂不续租','text','skipRenewal')+'</div>'));
    actbar('<div><div class="lab">续租应付</div><div class="amt">'+money(regular)+'</div></div>'+btn('按常规折扣续租','primary','renewRegular'));
  }
  if(['payment_pending','payment_failed','cancelled','completed'].includes(key)){
    body().append(el('<section class="card" aria-label="续租费用"><div class="sec-title">续租费用</div><div class="fees"><div class="row"><span class="k">续租租金<span class="sub">'+r.months+'个月</span></span><b class="amt">'+money(r.quote_total)+'</b></div><div class="sec">'+money(r.quote_monthly)+'/月 × '+r.months+'个月</div><div class="total"><span>'+(rs==='COMPLETED'?'已付':'续租应付')+'</span><b class="amt">'+money(r.quote_total)+'</b></div></div>'+(rs==='COMPLETED'?'':'<div class="kvlist">'+kv('报价有效至',hm(deadline)+' · 剩余 '+clock(deadline))+period+'</div><div class="rule">付款完成后新租期生效。</div>')+'</section>'));
  }
  if(key==='quote_pending'){body().append(el('<section class="card notice" role="status"><div class="s">门店确认报价后会通知您。</div></section>'));actbar(btn('返回订单详情','neutral block','O03'),'stack');}
  if(key==='payment_pending')actbar('<div class="split">'+btn('稍后支付','neutral','payLater')+btn('立即付款','primary','payNow')+'</div>','stack');
  if(key==='payment_failed'){body().append(failBlock('续租付款未成功',['重新支付','更换支付方式'],store));actbar('<div><div class="lab">续租应付</div><div class="amt">'+money(r.quote_total)+'</div></div>'+btn('重新支付','primary','confirmRenewal'));}
  if(key==='cancelled'){actbar('<div><div class="lab">续租应付</div><div class="amt">'+money(r.quote_total)+'</div></div>'+btn('继续付款','primary','confirmRenewal'));}
  if(key==='completed'){actbar('<div class="split">'+btn('申请发票','secondary','IV01')+btn('返回订单详情','primary','O03')+'</div>','stack');}
  if(q.get('overlay')==='pay'&&key==='payment_pending')overlayRoot().append(sheet('支付流程','<div class="fees"><div class="row"><span class="k">续租租金<span class="sub">'+r.months+'个月</span></span><b class="amt">'+money(r.quote_total)+'</b></div><div class="total"><span>续租应付</span><b class="amt">'+money(r.quote_total)+'</b></div></div>','<div class="stackacts">'+btn('确认付款','primary','payRenewalSuccess')+btn('稍后支付','neutral','payLater')+'</div>'));
  window.__W4={page:'RN01',state:rkey,keep:(kq||null),lease:v.lease_status,renewal:rs,months:r?.months||null,total:v.total_months,end:v.end_date,open,regular,quote:r?.quote_total||null,newEnd:r?addMonths(v.end_date,r.months):null,capped};
}

/* ======================= EX01 退仓与到期 ======================= */
const EX01={
  empty:()=>({core:lifeCore('noDemand'),id:null}),
  form:life('lifeActive'),form_early:life('lifeActive'),form_expired:life('lifeExpired'),
  submitting:life('lifeActive'), /* W7 新增 */
  requested:life('lifeReturning'),waiting:life('lifeInspection'),
  failed:()=>{const c=lifeCore('lifeInspection'),id=firstOrder(c).id;c.lifecycleReviewInspection(id,'failed',true);return {core:c,id};},
  passed:life('lifeRefund'),
  not_started:life('lifeUpcoming'), /* W7 新增（R-C-11）：已付未起租 */
  unavailable:life('lifeUpcoming')  /* 原键保留，与 not_started 同一呈现 */
};
const EX_STEPS=['提交退仓安排','清空仓位并申请验仓','门店验仓','押金退款处理'];
function renderEX01(){
  const key=q.get('state')||'form',b=EX01[key];if(!b)return unknown(key,EX01);
  const {core,id}=b();document.body.dataset.state=key;
  if(!id)return noOrder('EX01');
  const v=core.lifecycleView(id),raw=core.state().orders.find(x=>x.id===id),x=v.exit,xs=x?.status||null,store=storeById(raw.store_id);
  const canStart=!x&&['active','expired'].includes(v.lease_status),notStarted=['not_started','unavailable'].includes(key),expiredLease=v.lease_status==='expired'&&!x;
  const H={form:'办理退仓',form_early:'办理退仓',submitting:'办理退仓',form_expired:'租期已到期',requested:'退仓已提交',waiting:'等待门店验仓',failed:'验仓未通过',passed:'验仓通过',not_started:'订单尚未起租',unavailable:'订单尚未起租'}[key];
  const T=notStarted?['待起租','info']:expiredLease?['待办理','warn']:key==='submitting'?['提交中','warn']:xs?[lab('exit',xs),tone(xs)]:['可办理','ok'];
  body().append(shead(H,tagT(T[0],T[1]),['订单号 '+orderNo(raw),notStarted?'计划起租 '+esc(raw.start_date):'租期至 '+v.end_date]));
  if(notStarted){
    body().append(sumcard(raw,v,{noKv:true}));
    body().append(el('<section class="card" aria-label="退订说明"><div class="sec-title">起租前退订</div><div class="kvlist">'+kvl('退订说明',ct('cancel.rule'))+kvl('已付租金',ct('cancel.paid'))+kv('押金',ct('cancel.deposit'),'soft')+kv('办理方式','联系门店办理')+'</div><div class="rule">起租后可在本页办理退仓。</div></section>'));
    actbar('<div class="split">'+btn('返回订单详情','neutral','O03')+'<a class="btn primary" href="tel:'+esc(store.phone||HOTLINE)+'" data-action="callStore">联系门店</a></div>','stack');
    window.__W4={page:'EX01',state:key,lease:v.lease_status};return;
  }
  if(expiredLease)body().append(el('<section class="card notice warn" role="status"><div class="t">请办理续租或退仓</div><div class="s">'+ct('overdue.short')+'。 <a style="display:inline-block;padding:7px 0" href="agreement.html?doc=usage">查看协议</a></div></section>')); /* R-C-05 */
  body().append(sumcard(raw,v,{noKv:true}));
  const cur={form:1,form_early:1,form_expired:1,submitting:1,requested:2,waiting:3,failed:3,passed:4}[key];
  const subs=i=>i===1&&x?lab('exitType',x.type)+' · 计划取空 <b>'+x.date+'</b>':i===4&&xs==='INSPECTION_PASSED'?lab('deposit',v.deposit_status):'';
  body().append(el('<section class="card" aria-label="退仓进度"><div class="sec-title">退仓进度</div>'+steps(EX_STEPS.map((t,i)=>[t,subs(i+1)]),cur,key==='failed'?3:undefined)+'</section>'));
  const type=key==='form_early'?'early':'expiry',minDate=v.end_date>=core.today()?v.end_date:core.today(),date=type==='expiry'?minDate:core.today();
  /* W27 D-189（撤回 D-165）：提前退仓按协议执行。预计结算费用 = 违约金（剩余合同金额 20% 与 1 个月仓储服务费中较高者）+ 优惠重算补差（已用月数按其对应折扣档重算与原折扣的差额）；
     已用月数不足 1 个月按 1 个月（协议口径），剩余月数 = 租期 − 已用月数，按日历月整月计（取代 W22 的「剩余月数向上取整」）。界面只给一个数并写「约」，不写比例（D-113）；以门店结算为准。 */
  const earlyCalc=()=>{const T=Number(raw.term_months)||v.total_months||0,f0=Number(raw.term_factor)||tf(T),base=(raw.unit_ids||[]).map(unitById).reduce((n,u)=>n+Number(u.base_month||0),0),mon=Math.trunc(base*f0+1e-9),de=new Date(v.end_date),dt=new Date(core.today()),cal=(de.getFullYear()-dt.getFullYear())*12+de.getMonth()-dt.getMonth()-(de.getDate()<dt.getDate()?1:0),left=Math.min(Math.max(0,T-1),Math.max(0,cal)),used=Math.max(1,T-left),f1=Math.max(f0,tf(used)),penalty=Math.round(Math.max(mon,mon*left*0.2)),redo=Math.max(0,Math.trunc(base*f1+1e-9)-mon)*used;return {used,left,mon,f0,f1,penalty,redo,fee:penalty+redo};},earlyFee=()=>earlyCalc().fee;
  const confirmDlg=()=>dialog('确认提交退仓？','<div class="kvlist">'+kv('退仓类型',lab('exitType',type))+kv('计划取空日期',date)+(type==='early'?kv('预计结算费用','约 '+money(earlyFee()))+kvl('费用结算',ct('early.rule')+'。 <a href="agreement.html?doc=usage">查看协议</a>')+kvl('已享优惠',ct('early.promo')):'')+'</div><p>提交后进入退仓流程；如需继续用仓，请先办理续租。</p>',btn('再想想','neutral','close')+btn('确认提交','danger','confirmExit')); /* R-C-04 */
  if(canStart){
    body().append(el('<section class="card" aria-label="退仓安排"><div class="sec-title">退仓安排</div>'+field('退仓类型',seg([['expiry','到期退仓'],['early','提前退仓']],type,'exitType'))+field('计划取空日期',input(date,'选择日期',ico('i-cal','ico sm'),'','计划取空日期'))+'<div class="rule">'+(type==='expiry'?(expiredLease?'租期已到期，取空日期从今天起选。':'到期退仓的取空日期不早于租期结束日 '+v.end_date+'。'):'提前退仓按实际使用时间结算，已享优惠按实际使用周期重新核算，具体以协议约定为准。')+'</div></section>'));
    body().append(el('<section class="card" aria-label="押金"><div class="kvlist" style="padding:0">'+kv('订单押金',money(raw.deposit))+kv('押金退还','验仓通过后进入退款处理','soft')+'</div></section>'));
    if(key==='submitting')actbar(submittingBtn('提交中…'),'stack');
    else if(expiredLease)actbar('<div class="split">'+btn('办理续租','secondary','RN01')+btn('提交退仓安排','danger','requestExit')+'</div>','stack');
    else actbar(btn('提交退仓安排','danger block','requestExit'),'stack');
  }
  if(x){
    body().append(el('<section class="card" aria-label="退仓安排"><div class="sec-title">退仓安排</div><div class="kvlist" style="padding:0">'+kv('退仓类型',lab('exitType',x.type))+kv('计划取空日期',x.date)+'</div></section>'));
    if(xs==='INSPECTION_FAILED')body().append(failBlock('验仓未通过',['重新清空仓位','再次申请验仓'],store));
    if(['REQUESTED','INSPECTION_FAILED'].includes(xs)){
      body().append(el('<section class="card" aria-label="验仓前确认"><div class="sec-title">申请验仓前</div><div class="rule" style="margin-top:0;font-size:var(--mk-font-size-md);color:var(--mk-color-ink-primary)">请确认物品全部取出、仓位清空并锁好。</div></section>'));
      actbar(btn(xs==='INSPECTION_FAILED'?'重新申请验仓':'确认清空并申请验仓','primary block','requestInspection'),'stack');
    }
    if(xs==='WAITING_INSPECTION'){body().append(el('<section class="card notice" role="status"><div class="s">验仓由门店完成，通过后押金进入退款处理。</div></section>'));actbar('<div class="split">'+btn('返回订单详情','neutral','O03')+'<a class="btn secondary" href="tel:'+esc(store.phone||HOTLINE)+'" data-action="callStore">联系门店</a></div>','stack');}
    if(xs==='INSPECTION_PASSED'){actbar(btn('查看押金进度','primary block','DP01'),'stack');}
  }
  if(q.get('overlay')==='confirm'&&canStart)overlayRoot().append(confirmDlg());
  document.addEventListener('click',e=>{const a=e.target.closest('[data-action]')?.dataset.action;if(a==='requestExit'&&canStart)overlayRoot().replaceChildren(confirmDlg());else if(a==='close')overlayRoot().replaceChildren();});
  window.__W4={page:'EX01',state:key,lease:v.lease_status,exit:xs,canStart,early:type==='early'?earlyCalc():null};
}

/* ======================= DP01 押金处理 ======================= */
const DP01={
  empty:()=>({core:lifeCore('noDemand'),id:null}),
  held:life('lifeActive'),waiting:life('lifeInspection'),refund_pending:life('lifeRefund'),refunded:life('lifeEnded'),refunded_partial:life('lifeEnded'), /* W22：有待结费用、部分退还 */
  refund_failed:()=>{const c=lifeCore('lifeRefund'),id=firstOrder(c).id;c.lifecycleDemoRefund(id,'failed',true);return {core:c,id};}
};
const DP_STEPS=['支付押金','押金保管中','验仓','退款处理','退还完成'];
function renderDP01(){
  const key=q.get('state')||'held',b=DP01[key];if(!b)return unknown(key,DP01);
  const {core,id}=b();document.body.dataset.state=key;
  if(!id)return noOrder('DP01');
  const v=core.lifecycleView(id),raw=core.state().orders.find(x=>x.id===id),ds=v.deposit_status,store=storeById(raw.store_id);
  body().append(shead('订单押金',stag(lab('deposit',ds),ds),['订单号 '+orderNo(raw),'租期至 '+v.end_date])); /* R-C-29：补状态标签 */
  body().append(el('<section class="card" aria-label="押金金额"><div class="amthero"><div><div class="k">押金 · 1个月月租</div><div class="amt">'+(core.authorized()?money(raw.deposit):'—')+'</div></div></div></section>'));
  if(ds==='REFUND_FAILED')body().append(failBlock('退款未成功',['核对收款账户','联系门店重新发起'],store));
  const cur={HELD:2,WAITING_INSPECTION:3,REFUND_PENDING:4,REFUND_FAILED:4,REFUNDED:6}[ds]||2;
  const subs=i=>i===1?'随下单支付 · '+raw.start_date:i===3&&v.exit?lab('exit',v.exit.status):'';
  body().append(el('<section class="card" aria-label="押金进度"><div class="sec-title">押金进度</div>'+steps(DP_STEPS.map((t,i)=>[t,subs(i+1)]),cur,ds==='REFUND_FAILED'?4:undefined)+'</section>'));
  /* R-C-12：三个显示位，业务口径未给，不写数字 */
  if(key==='refunded_partial'){const due=200,back=Math.max(0,Number(raw.deposit)-due);body().append(el('<section class="card" aria-label="押金结算"><div class="sec-title">押金结算</div><div class="kvlist">'+kv('订单押金',money(raw.deposit))+kv('待结费用','−'+money(due))+kv('实际退还',money(back))+'</div><p class="fine" style="margin:8px 0 0">待结费用明细可向门店查询。</p></section>'));}
  /* W22 D-169：押金保管中只留退还时限一行，进入退还流程后再展开方式与结算说明 */
  const dpFull=ds!=='HELD'||q.get('info')==='open';
  body().append(el('<section class="card" aria-label="押金退还说明"><div class="sec-title">退还说明</div><div class="kvlist">'+kv('退还时限',ct('deposit.refundTime'))+(dpFull?kvl('退还方式',ct('deposit.refundMethod'))+kvl('结算说明',ct('deposit.deduct')):'')+'</div>'+(dpFull?'':'<a class="btn text sm" style="margin-left:-8px" href="dp01.html?state='+key+'&info=open">查看退还方式与结算说明 ›</a>')+'</section>'));
  if(['REFUND_PENDING','REFUND_FAILED'].includes(ds))actbar(btn('查看处理进度','secondary block','refundProgress'),'stack');
  else actbar(btn('返回订单详情','neutral block','O03'),'stack');
  if(q.get('overlay')==='progress'&&['REFUND_PENDING','REFUND_FAILED'].includes(ds))overlayRoot().append(sheet('处理进度',steps([['验仓通过',v.exit?.date||''],['退款处理中',ds==='REFUND_FAILED'?lab('deposit',ds):'门店处理中'],['退还完成','']],2,ds==='REFUND_FAILED'?2:undefined),'<div class="stackacts">'+btn('知道了','neutral','close')+'</div>'));
  window.__W4={page:'DP01',state:key,deposit:ds,lease:v.lease_status};
}

/* ======================= IV01 发票申请 ======================= */
const IV_INPUT={title:'张三',email:'zhangsan@163.com',tax:'91110105MA01ABCD2X',enterpriseTitle:'北京安贞科技有限公司'};
const ivProcessing=()=>{const c=lifeCore('lifeActive'),id=firstOrder(c).id;const inv=c.lifecycleRequestInvoice(id,id,{kind:'personal',title:IV_INPUT.title,email:IV_INPUT.email});c.lifecycleDemoInvoice(id,inv.id,'processing',true);return {core:c,id};};
const IV01={
  empty:()=>({core:lifeCore('noDemand'),id:null}),
  form:life('lifeActive'),filled:life('lifeActive'),form_enterprise:life('lifeActive'),invalid:life('lifeActive'),
  submitting:life('lifeActive'), /* W7 新增 */
  submitted:()=>{const c=lifeCore('lifeActive'),id=firstOrder(c).id;c.lifecycleRequestInvoice(id,id,{kind:'personal',title:IV_INPUT.title,email:IV_INPUT.email});return {core:c,id};},
  processing:ivProcessing,
  issued:ivProcessing, /* W7 新增（R-C-13）：运行时无「已开具」终态，设计侧在视图层置 ISSUED，代码侧补 */
  issue_failed:()=>{const c=lifeCore('lifeActive'),id=firstOrder(c).id;const inv=c.lifecycleRequestInvoice(id,id,{kind:'enterprise',title:IV_INPUT.enterpriseTitle,email:IV_INPUT.email,tax_id:IV_INPUT.tax});c.lifecycleDemoInvoice(id,inv.id,'failed',true);return {core:c,id};},
  two_payments:()=>{const c=lifeCore('lifeRenewalQuote'),id=firstOrder(c).id;c.lifecycleConfirmRenewal(id,'SIM_REVIEW_RENEWAL');c.lifecyclePayRenewal(id,'SIM_REVIEW_RENEWAL','success');return {core:c,id};}
};
function renderIV01(){
  const key=q.get('state')||'form',b=IV01[key];if(!b)return unknown(key,IV01);
  const {core,id}=b();document.body.dataset.state=key;
  if(!id)return noOrder('IV01');
  const v=core.lifecycleView(id),raw=core.state().orders.find(x=>x.id===id),s=storeById(raw.store_id);
  if(key==='issued')v.invoices.forEach(i=>{i.status='ISSUED';});
  const available=v.payments.filter(p=>!v.invoices.some(i=>i.payment_id===p.id)),failed=v.invoices.find(i=>i.status==='ISSUE_FAILED');
  const H={form:'申请发票',filled:'申请发票',form_enterprise:'申请发票',invalid:'申请发票',two_payments:'申请发票',submitting:'申请发票',submitted:'发票申请已提交',processing:'发票开具中',issued:'发票已开具',issue_failed:'开票未成功'}[key];
  const last=v.invoices.at(-1);
  body().append(shead(H,key==='submitting'?tagT('提交中','warn'):last?stag(lab('invoice',last.status),last.status):tagT('可申请','ok'),['订单号 '+orderNo(raw),esc(s.name)]));
  if(failed)body().append(failBlock('开票未成功',['抬头','企业税号','邮箱'],s,'<div class="rule">原申请记录已保留，更正后可重新提交。</div>'));
  /* 付款拆分（R-C-08）：下单支付 = 租金 + 押金 + 管理费；发票是否含押金待财务确认，这里不替业务决定 */
  const split=p=>p.type==='INITIAL'?[['租金',Number(p.amount)-Number(raw.deposit)-Number(raw.management_fee)],['押金',raw.deposit],['管理费',raw.management_fee]]:[['续租租金',p.amount]];
  const splitHtml=p=>'<div class="paysplit">'+split(p).map(([k,a])=>'<div class="ps"><span>'+esc(k)+'</span><span>'+money(a)+'</span></div>').join('')+'</div>';
  const invoiceable='<div class="kvlist ivnote">'+kv('可开票金额','以开票结果为准','soft')+kv('是否含押金',ct('invoice.includesDeposit'),'soft')+kvl('开票内容',ct('invoice.types'))+kvl('申请期限',ct('invoice.applyDeadline'))+'</div>';
  if(v.invoices.length)body().append(el('<section class="card" aria-label="申请记录"><div class="sec-title">申请记录</div>'+v.invoices.map(i=>'<div class="rec"><div><div class="t">'+esc(lab('payment',v.payments.find(p=>p.id===i.payment_id)?.type||'INITIAL'))+' · '+money(i.payment_amount)+'</div><div class="s">'+esc(lab('kind',i.kind))+' · '+esc(i.title)+(i.tax_id?' · '+esc(i.tax_id):'')+'<br>'+esc(i.email)+'</div></div>'+stag(lab('invoice',i.status),i.status)+'</div>').join('')+'</section>'));
  const formState=['form','filled','form_enterprise','invalid','two_payments','submitting'].includes(key)||!!failed;
  const entLinks='<div class="entlinks"><a class="lrow" href="ent.html?view=titles" data-action="titles"><span class="k">管理开票抬头</span><span class="v"></span>'+ico('i-chev','ico chev')+'</a><a class="lrow" href="ent.html?view=batch" data-action="batch"><span class="k">批量开票</span><span class="v">多笔付款合并申请</span>'+ico('i-chev','ico chev')+'</a></div>';
  if(formState){
    const kind=key==='form_enterprise'||failed?'enterprise':'personal';
    const vals=failed?{title:failed.title,email:failed.email,tax:failed.tax_id}:key==='form'?{title:'',email:'',tax:''}:{title:kind==='enterprise'?IV_INPUT.enterpriseTitle:IV_INPUT.title,email:key==='invalid'?'zhangsan@example':IV_INPUT.email,tax:IV_INPUT.tax};
    if(available.length||!failed)body().append(el('<section class="card" aria-label="付款记录"><div class="sec-title">付款记录</div>'+(available.length?available.map((p,i)=>'<div class="payrec"><div class="lrow'+(available.length>1?' pick':'')+'" data-action="payment" data-value="'+esc(p.id)+'"><span class="k">'+esc(lab('payment',p.type))+'</span><span class="v">'+money(p.amount)+'</span>'+(available.length>1?ico(i===0?'i-check':'i-chev','ico chev'+(i===0?' on':'')):'')+'</div>'+splitHtml(p)+'</div>').join('')+invoiceable:'<div class="rule" style="margin-top:0">暂无可申请的付款记录。</div>')+'</section>'));
    if(available.length||failed){
      const emailErr=key==='invalid'?'请输入有效的邮箱地址':'';
      body().append(el('<section class="card" aria-label="发票信息"><div class="sec-title">发票信息</div>'+field('发票类型',seg([['personal','个人'],['enterprise','企业']],kind,'kind'))+field('抬头',input(vals.title,kind==='enterprise'?'请输入企业名称':'请输入姓名','','','抬头'))+(kind==='enterprise'?field('企业税号',input(vals.tax,'请输入纳税人识别号','','','企业税号')):'')+field('邮箱',input(vals.email,'请输入邮箱','',emailErr,'邮箱'),emailErr)+(kind==='enterprise'?entLinks:'')+'</section>'));
      const ready=!!(vals.title&&vals.email&&!emailErr&&(kind!=='enterprise'||vals.tax));
      if(key==='submitting')actbar(submittingBtn('提交中…'),'stack');
      else actbar(btn(failed?'更正资料后重新提交':'提交发票申请','primary block'+(ready?'':' disabled'),failed?'retryInvoice':'requestInvoice',ready?'':' disabled aria-disabled="true"'),'stack');
    }else noActbar();
  }else if(key==='issued'){
    body().append(el('<section class="card" aria-label="发票文件"><div class="sec-title">发票文件</div><div class="kvlist">'+kv('发票形式','电子发票')+kv('接收邮箱',esc(last.email))+'</div></section>'));
    actbar('<div class="split">'+btn('发送到邮箱','secondary','sendInvoice')+btn('下载发票','primary','downloadInvoice')+'</div>','stack');
  }else{
    actbar(btn('返回订单详情','neutral block','O03'),'stack');
  }
  if(q.get('overlay')==='payment'&&available.length>1)overlayRoot().append(sheet('选择付款记录',available.map((p,i)=>'<div class="opt'+(i===0?' on':'')+'"><span class="r"><span>'+esc(lab('payment',p.type))+' · '+money(p.amount)+'</span></span>'+(i===0?ico('i-check','ico sm'):'')+'</div>').join(''),'<div class="acts">'+btn('取消','neutral','close')+btn('确定','primary','close')+'</div>'));
  window.__W4={page:'IV01',state:key,invoices:v.invoices.map(i=>i.status),available:available.length,payments:v.payments.length};
}

try{({O03:renderO03,RN01:renderRN01,EX01:renderEX01,DP01:renderDP01,IV01:renderIV01}[PAGE])();}
catch(e){console.error(e);document.body.prepend(el('<p style="padding:16px;color:#B42318">渲染失败：'+esc(e.message)+'</p>'));}
})();
