/* VIS-REDESIGN-01A · W5 binder · 2026-11-17
 * Thin data binder for BUSINESS (T4, 商家 / 企业存储). Page state is built through the UNMODIFIED runtime modules
 * in ../runtime/ : demo-core.saveEnterpriseLead (validation codes ENTER_BUSINESS_PHONE / INVALID_CAPACITY / INVALID_TERM /
 * SELECT_DATE / LEAD_NOT_FOUND / LEAD_WITHDRAWN), MK_LEAD_FLOW kind='enterprise' (SUBMITTING / FAILED_RETRYABLE /
 * UNKNOWN_RESULT / STORAGE_ERROR / RETURN_RESTORE / SUCCESS + successCopy), core.validTerm / validCapacity / today.
 * Rules that live in the DOM-coupled business-bridge.js (draft merge with requirement, edit-context text, validDraft toasts,
 * browse pre-checks, button copy) are ported here and marked PORT (registered D-60: implementation must use the original).
 * No copy, field, option or rule is invented. Business facts frozen: field labels, chip values, 4 benefit tags, button copy. */
(function(){
'use strict';
const F=window.SIM_FIXTURES,q=new URLSearchParams(location.search),PAGE=document.body.dataset.page;
const PHONE='13800138000';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const el=html=>{const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild;};
const ico=(id,cls='ico')=>'<svg class="'+cls+'"><use href="#'+id+'"/></svg>';
const makeCore=state=>window.SIM_CORE.create(state?{state}:{});
const authorize=c=>{c.requestPhone();c.resolvePhone('success',{phone:PHONE});};
const tomorrow=()=>new Date(Date.now()+8*3600*1000+86400000).toISOString().slice(0,10);
const chip=(label,on,action,value,extra='')=>'<button type="button" class="chipwrap" aria-pressed="'+!!on+'" data-action="'+action+'" data-value="'+esc(value)+'"><span class="chip'+(on?' on':'')+'">'+(on?ico('i-check','ico sm'):'')+esc(label)+extra+'</span></button>';
function sheet(title,inner,extra=''){return el('<div class="scrim" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><div class="sheet"><div class="grab"></div><h4>'+esc(title)+'</h4>'+inner+extra+'</div></div>');}
function dialog(title,p,acts){return el('<div class="scrim center" role="alertdialog" aria-modal="true"><div class="dialog" style="text-align:center"><h4>'+esc(title)+'</h4><p>'+p+'</p><div class="acts">'+acts+'</div></div></div>');}
function toast(msg){document.getElementById('toast-root').append(el('<div class="toastwrap" role="status"><div class="toast">'+esc(msg)+'</div></div>'));}
const optRow=(label,on)=>'<div class="opt'+(on?' on':'')+'"><span class="r"><span>'+esc(label)+'</span></span>'+(on?ico('i-check','ico sm'):'')+'</div>';
const unknown=(key,obj)=>document.body.prepend(el('<p style="padding:16px;color:#B42318">未知状态 '+esc(key)+'；可用：'+Object.keys(obj).join(' / ')+'</p>'));
const actbar=html=>document.getElementById('actbar-root').append(el('<div class="actbar" role="region" aria-label="底部操作区">'+html+'</div>'));
const input=(label,val,ph,opts={})=>'<div class="field"><div class="flabel" style="margin:0">'+esc(label)+(opts.req?'<span class="req">*</span>':'')+(opts.opt?'<span class="opt">（选填）</span>':'')+'</div><div class="input'+(opts.err?' err':'')+(opts.tall?' tall':'')+'" role="textbox" aria-label="'+esc(label)+'">'+(opts.lead?ico(opts.lead,'ico sm'):'')+'<span class="ph'+(val?' filled':'')+'"'+(opts.tall?' style="white-space:normal"':'')+'>'+esc(val||ph)+'</span>'+(opts.suffix?'<span class="suffix">'+esc(opts.suffix)+'</span>':'')+(opts.tall?'<span class="count">'+String(val||'').length+'/500</span>':'')+(opts.chev?ico('i-chev','ico sm'):'')+'</div>'+(opts.errtext?'<div class="errtext">'+esc(opts.errtext)+'</div>':'')+'</div>';

/* ======================= BUSINESS ======================= */
/* Frozen content (business.html, PR #220 HEAD 1d0dc7f) */
const TITLE='商家 / 企业用仓';
const W7=window.MK_W7,NEEDS_URL='acc.html?view=needs';
const INTRO='多仓、长期或用量较大的商家与企业用仓，由顾问为您配仓。'; /* W7-D D-95 / D-106 */
const BENEFITS=['可开发票','专属顾问','长期 / 多仓可协助','搬运方案可确认'];
const BANDS=W7.BIZ_BANDS,bandOf=k=>BANDS.find(b=>b.key===k||b.label===k)||null; /* W7-D D-88 / D-101：企业容量存区间，不再写成 3 / 10 / 22 / 35 单点 */
const dsc=m=>W7.termDiscount(m)?'<small>'+W7.termDiscount(m)+'</small>':'';
const TYPES=['库存','样品','文件','设备','项目物料','其他'];
const MOVES=['需要','待确认','不需要'];
const MSG={LEAD_NOT_FOUND:'这条需求已不存在，请从「预约用仓」重新打开，或重新提交',LEAD_WITHDRAWN:'这条需求已撤回，可重新提交',ENTER_BUSINESS_PHONE:'请填写有效的联系电话，国际号码请带国家区号',INVALID_TERM:'租期请选择1–60个月的整数',SELECT_DATE:'请选择有效的预计用仓日期',INVALID_CAPACITY:'请填写0.5m³–200㎡的有效容量'}; /* PORT business-bridge.js submit catch */
const DRAFT_MSG={size:'请填写0.5m³–200㎡，手填容量最多两位小数',term:'租期请选择1–60个月的整数',browseSize:'请填写或选择所需空间',browseTerm:'请选择租期',browseSales:'30m³ 及以上由顾问配仓，请直接提交需求'}; /* PORT validDraft / browse */
const FILLED={location:'北京市朝阳区安贞西里三区 12 号楼',size:null,band:'5-15',custom:false,term:12,types:['库存','样品'],move:'待确认',contact_name:'王经理',company:'安贞商贸有限公司',phone:PHONE,expected_start_date:'',notes:'约 20 箱样品与两台设备，需协助搬入。',storage_type_other:''};
const STATES={ /* W7-D R-B-33：表单分两步 ①用仓需求 ②联系方式；step 缺省 = 1。原有状态键全部保留 */
  empty:{scenario:'noDemand',v:{}},
  filled:{scenario:'normal',v:FILLED},
  custom:{scenario:'normal',v:{...FILLED,size:48,band:'',custom:true,term:30,types:['设备','其他'],storage_type_other:'展会物料',move:'需要'}},
  authorized:{scenario:'normal',auth:true,step:2,v:{...FILLED,phone:''}},
  edit:{scenario:'normal',existing:true,v:{}},
  blocked:{scenario:'normal',lead:'B2B_LEAD_999',v:{}},
  error_phone:{scenario:'normal',step:2,v:{...FILLED,phone:''},submit:true},
  invalid_capacity:{scenario:'normal',v:{...FILLED,size:0.3,band:'',custom:true},submit:true},
  browse_error:{scenario:'noDemand',v:{...FILLED,size:null,band:'',term:null},browse:true},
  submitting:{scenario:'normal',step:2,v:FILLED,status:'SUBMITTING'},
  failed:{scenario:'normal',step:2,v:FILLED,submit:true,flow:'fail_once'},
  unknown:{scenario:'normal',step:2,v:FILLED,status:'UNKNOWN_RESULT'},
  restored:{scenario:'normal',step:2,v:FILLED,status:'RETURN_RESTORE'},
  success:{scenario:'normal',step:2,v:FILLED,submit:true},
  success_update:{scenario:'normal',step:2,existing:true,v:{notes:'新增：需要周末入仓。'},submit:true},
  step2:{scenario:'normal',step:2,v:FILLED},
  multi_area_open:{scenario:'normal',v:{...FILLED,areasOpen:true}},multi_area:{scenario:'normal',v:{...FILLED,areas:['海淀区','丰台区']}},multi_area_step2:{scenario:'normal',step:2,v:{...FILLED,areas:['海淀区','丰台区']}}, /* W26：多区域多选 */
  sales:{scenario:'normal',v:{...FILLED,band:'30+'}},
  success_offhours:{scenario:'normal',step:2,v:FILLED,submit:true,offhours:true},
  success_sales:{scenario:'normal',step:2,v:{...FILLED,band:'30+'},submit:true}
};
const validSize=(core,v)=>core.validCapacity(v); /* PORT validSize (items_estimate / existing-lead exceptions not exercised here) */
function termHuman(core,t){return core.validTerm(t)?t+'个月'+(W7.termDiscount(t)?' · '+W7.termDiscount(t):''):'请选择租期';} /* W7-D：一律写「N个月」，不写「2年」 */
async function renderBUSINESS(){
  const key=q.get('state')||'empty',cfg=STATES[key];if(!cfg)return unknown(key,STATES);
  document.body.dataset.state=key;
  const core=makeCore();core.setScenario(cfg.scenario);if(cfg.auth)authorize(core);
  const r=core.state().requirement;
  /* existing enterprise lead (edit flow entered from 我的需求「补充企业资料」= business.html?lead=ID) */
  let existing=null;
  if(cfg.existing){existing=core.saveEnterpriseLead({phone:PHONE,location:FILLED.location,contact_name:FILLED.contact_name,company:FILLED.company,capacity_m3:null,capacity_band:bandOf(FILLED.band).label,term_months:FILLED.term,storage_types:FILLED.types,moving_support:FILLED.move,notes:FILLED.notes});}
  const requestedId=cfg.lead||existing?.id||null,blocked=!!cfg.lead&&!existing;
  /* PORT business-bridge.js fresh() + requirement merge: a new draft inherits capacity / confirmed term from the current requirement */
  const base={location:'',size:r.capacity_m3,band:'',custom:!!r.capacity_m3,term:r.term_confirmed?r.term_months:null,types:[],move:'待确认',contact_name:'',company:'',phone:core.state().contactPhone||'',expected_start_date:'',notes:'',storage_type_other:'',areas:[],areasOpen:false};
  const v=existing?{...base,location:existing.location||'',size:existing.capacity_m3,band:bandOf(existing.capacity_band)?.key||'',custom:!existing.capacity_band&&existing.capacity_m3!==null,term:existing.term_months,types:existing.storage_types||[],move:existing.moving_support||'待确认',contact_name:existing.contact_name||'',company:existing.company||'',phone:existing.phone||'',notes:existing.notes||'',...cfg.v}:{...base,...cfg.v};
  const band=v.custom?null:bandOf(v.band),matchCap=v.custom?v.size:(band?band.match:null); /* 带入找仓按区间上限；30m³ 以上不带入 */
  const salesOnly=!!band?.sales||(v.custom&&Number.isFinite(Number(v.size))&&v.size!==null&&W7.salesOnly(Number(v.size)));
  const step=cfg.step||1;
  const packet={status:'EDITING'};
  const flow=window.MK_LEAD_FLOW.create({core,kind:'enterprise',packet,persist:()=>{},onChange:()=>{},delay:10});
  if(cfg.flow)flow.scenario(cfg.flow);
  let err=null,draftErr=null;
  /* PORT validDraft (runs before submit and before browse) */
  if((cfg.submit||cfg.browse)&&v.custom&&v.size!==null&&!validSize(core,Number(v.size)))draftErr='size';
  if(!draftErr&&(cfg.submit||cfg.browse)&&v.term!==null&&!core.validTerm(Number(v.term)))draftErr='term';
  if(cfg.browse&&!draftErr){if(salesOnly)draftErr='browseSales';else if(!validSize(core,matchCap))draftErr='browseSize';else if(!core.validTerm(v.term))draftErr='browseTerm';}
  if(cfg.submit&&!draftErr&&!blocked){try{await flow.submit({lead_id:existing?.id||undefined,phone:v.phone,location:v.location+(v.areas.length?'；其他区域：'+v.areas.join('、'):''),contact_name:v.contact_name,company:v.company,capacity_m3:v.custom?v.size:null,capacity_band:band?band.label:'',term_months:v.term,storage_types:v.types,storage_type_other:v.storage_type_other,moving_support:v.move,expected_start_date:v.expected_start_date,notes:v.notes});}catch(e){err=e.message;}}
  if(cfg.status)packet.status=cfg.status;
  const success=packet.status==='SUCCESS'?packet.result:null;
  const locked=['SUBMITTING','UNKNOWN_RESULT'].includes(packet.status);
  const editing=!!existing||!!success;
  const body=document.getElementById('body');
  /* title block (D-30: no dark-green gradient header)；W7-D：两步表单 */
  body.append(el('<div class="stepbar" aria-label="流程：用仓需求，联系方式"><span class="'+(step===1?'on':'')+'"><b>1</b>用仓需求</span><i></i><span class="'+(step===2?'on':'')+'"><b>2</b>联系方式</span></div>'));
  if(step===1)body.append(el('<div class="ptitle"><h1>'+esc(TITLE)+'</h1><p>'+esc(INTRO)+'</p><div class="tags" style="margin-top:10px">'+BENEFITS.map(b=>'<span class="tag info">'+esc(b)+'</span>').join('')+'</div></div>'));
  /* edit context (PORT updateEditContext): shown only when it says something the form does not already express */
  if(blocked)body.append(el('<section class="card notice err lead-status" role="status" style="margin-top:16px"><div style="min-width:0"><div class="t">这条需求已不存在或已撤回</div><div class="s">可以重新提交一条需求。</div></div><button type="button" class="btn secondary md" data-action="newLead">新建企业需求</button></section>'));
  else if(existing&&!success)body.append(el('<section class="card notice lead-status" role="status" style="margin-top:16px"><div style="min-width:0"><div class="t">正在补充已有企业需求</div><div class="s">保存后将更新这条需求。</div></div><button type="button" class="btn neutral md" data-action="newLead">新建企业需求</button></section>'));
  /* lead-flow status (same component as BOOKING) */
  if(['FAILED_RETRYABLE','UNKNOWN_RESULT','STORAGE_ERROR'].includes(packet.status))body.append(el('<section class="card notice err lead-status" role="status" style="margin-top:16px"><div style="min-width:0"><div class="t">'+(packet.status==='UNKNOWN_RESULT'?'提交结果暂未确认':'暂时无法保存')+'</div><div class="s">'+esc(window.MK_LEAD_FLOW.messages[packet.status])+'</div></div>'+(packet.status==='UNKNOWN_RESULT'?'':'<button type="button" class="btn secondary md" data-action="retry">重试提交</button>')+'</section>'));
  if(packet.status==='RETURN_RESTORE')body.append(el('<section class="card notice lead-status" role="status" style="margin-top:16px"><div style="min-width:0"><div class="t">已恢复上次填写的信息</div><div class="s">请核对后继续。</div></div></section>'));
  /* form */
  const f=el('<form class="stack" style="padding:20px 16px 0;gap:24px" novalidate'+(locked?' aria-disabled="true"':'')+'></form>');body.append(f);
  const P=W7.TERM_PRESETS,termOther=v.term!==null&&v.term!==undefined&&!P.includes(v.term);
  const sizeText=v.custom?(v.size!==null&&v.size!==undefined?v.size+'m³':'容量未填'):(band?band.label:'容量未选');
  if(step===1){
    f.append(el('<div class="sh" style="padding:0;margin:0"><h2 style="font-size:var(--mk-font-size-xl)">用仓需求</h2><a href="'+NEEDS_URL+'" data-action="myNeeds">查看预约记录'+ico('i-chev','ico sm')+'</a></div>'));
    f.append(el(input('用仓位置',v.location,'城市、区域或详细地址')));
    { /* W26：多区域多选。只列当前城市有门店的区域；提交时并入用仓位置一栏，不新增字段 */
      const city=core.state().city||'北京',AREAS=[...new Set(window.SIM_FIXTURES.stores.filter(x=>x.city===city&&x.district).map(x=>x.district))],open=v.areasOpen||v.areas.length>0;
      f.append(el(open?'<div class="field w26areas" style="margin-top:-12px"><div class="flabel" style="margin:0">还需要用仓的区域<span class="opt">（可多选）</span></div><div class="chips inline soft" style="padding-top:0" role="group" aria-label="还需要用仓的区域">'+AREAS.map(a=>chip(a,v.areas.includes(a),'area',a)).join('')+'</div><div class="help">'+(v.areas.length?'已选 '+v.areas.length+' 个区域，顾问会按这些区域一并安排方案。':'列出的是'+esc(city)+'已有门店的区域。')+'</div></div>':
        '<div class="help row w26areas" style="margin-top:-18px"><button type="button" class="btn text" style="margin-left:-8px" data-action="areasOpen">'+ico('i-pin','ico sm')+'多个区域都需要仓位？添加区域</button></div>'));}
    const sizeErr=draftErr==='size'||err==='INVALID_CAPACITY';
    f.append(el('<div class="field"><div class="flabel" style="margin:0">大概需要多大空间</div><div class="cappick"><div class="chips inline soft" role="group" aria-label="大概需要多大空间">'+BANDS.map(b=>chip(b.label,!v.custom&&band?.key===b.key,'size',b.key)).join('')+chip('自定义',v.custom,'size','custom')+'</div>'+
      (v.custom?'<div class="input'+(sizeErr?' err':'')+'" role="textbox" aria-label="自定义容量"><span class="ph'+(v.size!==null&&v.size!==undefined?' filled':'')+'">'+esc(v.size!==null&&v.size!==undefined?String(v.size):'请输入预计体积')+'</span><span class="suffix">m³</span></div>'+(sizeErr?'<div class="errtext">'+esc(draftErr==='size'?DRAFT_MSG.size:MSG.INVALID_CAPACITY)+'</div>':''):'')+
      (salesOnly?'<div class="note">'+W7.SALES_CAP_M3+'m³ 及以上由顾问配仓。</div>':matchCap&&!sizeErr?'<div class="note">找仓时按 '+esc(String(matchCap))+'m³ 匹配，可修改。</div>':'')+
      '</div><div class="help row" style="margin-top:6px"><button type="button" class="btn text" style="margin-left:-8px" data-action="estimate" data-href="cap.html">'+ico('i-cube','ico sm')+'不知道多大？使用空间估算</button></div></div>'));
    f.append(el('<div class="field"><div class="flabel" style="margin:0">租用时长</div><div class="termpick">'+W7.termSeg(v.term)+
      (draftErr==='term'||err==='INVALID_TERM'?'<div class="errtext">'+esc(DRAFT_MSG.term)+'</div>':'')+'</div></div>'));
    f.append(el('<div class="field"><div class="flabel" style="margin:0">主要存储类型<span class="opt">（可多选）</span></div><div class="chips inline soft" style="padding-top:0" role="group" aria-label="主要存储类型">'+TYPES.map(t=>chip(t,v.types.includes(t),'type',t)).join('')+'</div>'+
      (v.types.includes('其他')?'<div class="input" role="textbox" aria-label="其他存储类型" style="margin-top:4px"><span class="ph'+(v.storage_type_other?' filled':'')+'">'+esc(v.storage_type_other||'请补充存储类型')+'</span></div>':'')+'</div>'));
    f.append(el('<div class="field"><div class="flabel" style="margin:0">搬入时是否需要协助</div><div class="seg" role="radiogroup" aria-label="搬入时是否需要协助">'+MOVES.map(m=>'<button type="button" role="radio" aria-checked="'+(v.move===m)+'" class="'+(v.move===m?'on':'')+'" data-action="move" data-value="'+esc(m)+'">'+esc(m)+'</button>').join('')+'</div>'+
      (v.move==='需要'?'<section class="notice" style="margin:4px 0 0;padding-left:14px"><div class="t">搬运方案待确认</div><div class="s">将结合物品、用仓位置及门店条件确认搬运方案。</div></section>':'')+'</div>'));
  }else{
    f.append(el('<div class="sh" style="padding:0;margin:0"><h2 style="font-size:var(--mk-font-size-xl)">联系方式</h2><a href="'+NEEDS_URL+'" data-action="myNeeds">查看预约记录'+ico('i-chev','ico sm')+'</a></div>'));
    f.append(el('<section class="card bizsum" aria-label="已填写的用仓需求"><div style="min-width:0"><div class="k">用仓需求</div><div class="v">'+esc([sizeText,v.term?v.term+'个月':'租期未选',v.types.length?v.types.join('、'):''].filter(Boolean).join(' · '))+'</div>'+(v.areas.length?'<div class="v w26areasum">其他区域：'+esc(v.areas.join('、'))+'</div>':'')+'</div><button type="button" class="btn text sm" data-action="step1">修改</button></section>'));
    f.append(el(input('您的称呼',v.contact_name,'请输入您的称呼',{opt:true})));
    f.append(el(input('公司 / 商家名称',v.company,'请输入名称',{opt:true})));
    const phoneErr=err==='ENTER_BUSINESS_PHONE';
    const phoneAuthNote=core.authorized()&&!v.phone; /* W7-A R-B-36：必读说明不放占位灰，移到输入框下方用次级文字色 */
    const phonePh=phoneAuthNote?'如需更换，请输入联系电话':'用于顾问联系';
    f.append(el(input('联系电话',v.phone?v.phone.replace(/(\d{3})(\d{4})(\d{4})/,'$1 $2 $3'):'',phonePh,{req:!core.authorized(),err:phoneErr,errtext:phoneErr?MSG.ENTER_BUSINESS_PHONE:''})));
    if(phoneAuthNote)f.append(el('<p class="fine" style="margin-top:-4px;color:var(--mk-color-ink-secondary)">已微信授权，无需重复填写手机号。</p>'));
    f.append(el('<div class="field"><div class="flabel" style="margin:0">预计用仓时间</div><button type="button" class="input" style="width:100%" data-action="date" aria-label="选择预计用仓日期">'+ico('i-cal','ico sm')+'<span class="ph'+(v.expected_start_date?' filled':'')+'">'+esc(v.expected_start_date||'选择日期')+'</span>'+ico('i-chev','ico sm')+'</button>'+(err==='SELECT_DATE'?'<div class="errtext">'+esc(MSG.SELECT_DATE)+'</div>':'')+'</div>'));
    f.append(el(input('补充信息',v.notes,'补充用仓信息，方便我们更准确的理解您的需求，高效协助配仓',{opt:true,tall:true})));
    body.append(el('<p class="paynote" style="margin-top:16px">提交后'+esc(W7.LEAD_COPY.inHours)+'</p>'));
  }
  /* bottom action bar：第 1 步 次「查看可选仓位」· 主「下一步：联系方式」；第 2 步 次「上一步」· 主「邀请顾问协助 / 保存企业需求更新」 */
  const busy=packet.status==='SUBMITTING';
  const primaryLabel=busy?'正在保存…':editing?'保存企业需求更新':'邀请顾问协助'; /* PORT updateEditContext / onChange */
  if(step===1)actbar('<div class="split"><button type="button" class="btn secondary'+(locked||salesOnly?' disabled':'')+'" data-action="browse"'+(locked||salesOnly?' disabled aria-disabled="true"':'')+'>查看可选仓位</button><button type="button" class="btn primary'+(blocked||locked?' disabled':'')+'" data-action="step2"'+(blocked||locked?' disabled':'')+'>下一步：联系方式</button></div>');
  else actbar('<div class="split"><button type="button" class="btn neutral'+(locked?' disabled':'')+'" data-action="step1"'+(locked?' disabled':'')+'>上一步</button><button type="button" class="btn primary'+(busy?' loading':'')+(blocked||locked?' disabled':'')+'" data-action="submit"'+(busy?' aria-busy="true"':'')+(blocked||locked?' disabled':'')+'>'+(busy?'<span class="spin"></span>':'')+esc(primaryLabel)+'</button></div>');
  if(draftErr)toast(DRAFT_MSG[draftErr]);else if(err)toast(MSG[err]||'请检查已填写的信息');
  /* success：统一受理文案（契约 §4），唯一落点「预约用仓」 */
  const ovr=document.getElementById('overlay-root');
  if(success){const off=!!cfg.offhours||q.get('offhours')==='1';ovr.append(dialog(existing?'企业需求已更新':'已提交',esc(off?W7.LEAD_COPY.offHours:W7.LEAD_COPY.inHours)+'<br><span class="fine">'+(off?'':'非服务时段提交的：'+esc(W7.LEAD_COPY.offHours)+'<br>')+esc(W7.LEAD_COPY.hoursNote)+'</span><br><span class="oid" style="display:inline-flex;margin-top:8px;padding:4px 10px;border-radius:var(--mk-radius-control);background:var(--mk-color-canvas-sunken);font-size:var(--mk-font-size-xs);color:var(--mk-color-ink-secondary)">需求编号 '+esc((String(success.id).match(/\d+/g)||['']).pop().padStart(4,'0'))+'</span>',(salesOnly?'<button type="button" class="btn neutral" data-action="close">知道了</button>':'<button type="button" class="btn neutral" data-action="find" data-href="s01.html">继续找仓</button>')+'<button type="button" class="btn primary" data-action="myNeeds" data-href="'+NEEDS_URL+'">查看预约记录</button>'));}
  if(q.get('overlay')==='term'){const P0=W7.TERM_PRESETS,oth=Number.isInteger(v.term)&&!P0.includes(v.term),d=oth?W7.termDiscount(v.term):''; /* W24 D-180：其他租期底部弹层 */
    ovr.append(sheet('其他租期','<div class="termother"><span class="stepper" role="group" aria-label="其他租期"><button type="button" data-action="termMinus" aria-label="减少一个月"'+(oth&&v.term>1?'':' class="off"')+'>−</button><output>'+(oth?v.term+'个月':'—')+'</output><button type="button" data-action="termPlus" aria-label="增加一个月">＋</button></span>'+(d?'<span class="tag disc">'+d+'</span>':'')+'</div><div class="chips inline soft" role="group" aria-label="常用租期">'+[18,24,36].map(m=>chip(m+'个月',v.term===m,'term',m)).join('')+'</div><p class="fine">可选 1–60 个月</p>','<div class="acts"><button type="button" class="btn neutral" data-action="closeSheet">取消</button><button type="button" class="btn primary'+(oth?'':' disabled')+'"'+(oth?'':' disabled aria-disabled="true"')+' data-action="customApply">确定</button></div>'));}
  if(q.get('overlay')==='date')ovr.append(sheet('选择预计用仓日期',[0,1,2,3,6,14].map(d=>{const dt=new Date(Date.now()+8*3600*1000+d*86400000).toISOString().slice(0,10);return optRow(dt,v.expected_start_date===dt);}).join(''),'<div class="acts"><button type="button" class="btn neutral">取消</button><button type="button" class="btn primary">确定</button></div>'));
  window.__W5={page:'BUSINESS',state:key,status:packet.status,err,draftErr,blocked,existing:existing?.id||null,lead:success?[success.id,success.type,success.capacity_m3,success.term_months,success.storage_types]:null,step,salesOnly,matchCap,values:{size:v.size,band:band?.key||null,bandLabel:band?.label||null,term:v.term,types:v.types,move:v.move},enterpriseLeads:core.state().enterpriseLeads.length};
}
try{if(PAGE==='BUSINESS')renderBUSINESS().catch(e=>{console.error(e);document.body.prepend(el('<p style="padding:16px;color:#B42318">渲染失败：'+esc(e.message)+'</p>'));});}
catch(e){console.error(e);}
})();
