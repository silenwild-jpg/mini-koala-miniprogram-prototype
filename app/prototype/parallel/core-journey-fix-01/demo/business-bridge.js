(function(){
  'use strict';
  const KEY='mk_independent_sim_v1',DRAFT='mk_business_draft_v4';
  const read=k=>{try{return JSON.parse(sessionStorage.getItem(k)||'null');}catch{return null;}};
  const core=SIM_CORE.create({state:read(KEY)}),r=core.state().requirement,$=id=>document.getElementById(id);
  const fresh=()=>({lead_id:null,lead_updated_at:null,size:null,band:'',custom:false,term:null,types:[],move:'待确认',location:'',contact_name:'',company:'',phone:'',expected_start_date:'',notes:'',storage_type_other:'',requirementSignature:JSON.stringify(r)});
  const contact=core.state().contactPhone,draft=read(DRAFT),requestedId=new URLSearchParams(location.search).get('lead');
  const targetId=requestedId||draft?.value?.lead_id;const requested=targetId?core.state().enterpriseLeads.find(l=>l.id===targetId):null;
  let form=draft?.version===1?{...fresh(),...draft.value}:fresh(),invalidRequested=!!requestedId&&!requested;
  if(requested&&!(draft?.version===1&&draft.value?.lead_id===requested.id&&draft.value?.lead_updated_at===requested.updated_at)){form={...fresh(),lead_id:requested.id,lead_updated_at:requested.updated_at,size:requested.capacity_m3,band:requested.capacity_band||'',custom:!requested.capacity_band&&requested.capacity_m3!==null,term:requested.term_months,types:requested.storage_types||[],move:requested.moving_support||'待确认',location:requested.location||'',contact_name:requested.contact_name||'',company:requested.company||'',phone:requested.phone||'',expected_start_date:requested.expected_start_date||'',notes:requested.notes||'',storage_type_other:requested.storage_type_other||''};}
  if(!form.lead_id&&(form.requirementSignature!==JSON.stringify(r)||!draft)){
    form.size=r.capacity_m3;form.term=r.term_confirmed?r.term_months:null;form.custom=!!r.capacity_m3;form.band='';form.requirementSignature=JSON.stringify(r);
  }
  if(!form.phone&&contact)form.phone=contact;if(core.authorized()&&!form.phone)$('phone').placeholder='已微信授权，无需重复填写；也可修改联系电话';
  const validSize=v=>core.validCapacity(v)||(r.source==='items_estimate'&&r.capacity_m3===v)||(!!form.lead_id&&core.state().enterpriseLeads.some(l=>l.id===form.lead_id&&l.capacity_m3===v));
  const fields={businessAddress:'location',contactName:'contact_name',company:'company',phone:'phone',expectedDate:'expected_start_date',notes:'notes',otherTypeInput:'storage_type_other'};
  for(const [id,key] of Object.entries(fields))$(id).value=form[key]||'';
  const editContext=document.createElement('div');editContext.className='enterprise-edit-context';editContext.innerHTML='<p id="enterprise-edit-status" role="status"></p><button type="button" id="new-enterprise">新建企业需求</button><a href="account.html?view=needs">查看我的需求</a>';$('businessAddress').closest('.field').before(editContext);
  function updateEditContext(){const existing=form.lead_id?core.state().enterpriseLeads.find(l=>l.id===form.lead_id):null,blocked=invalidRequested||!!form.lead_id&&(!existing||existing.status==='withdrawn');$('enterprise-edit-status').textContent=blocked?'原需求不存在或已撤回；可明确新建另一条需求。':form.lead_id?'正在补充企业需求 '+form.lead_id+'；保存后更新原记录。':'新企业需求；首次保存后可继续补充。';$('submit').disabled=blocked;$('submit').textContent=form.lead_id?'保存企业需求更新':'邀请顾问协助';}
  $('new-enterprise').onclick=()=>{form={...fresh(),size:r.capacity_m3,term:r.term_confirmed?r.term_months:null,custom:r.capacity_m3!==null,phone:core.state().contactPhone||''};invalidRequested=false;for(const [id,key] of Object.entries(fields))$(id).value=form[key]||'';history.replaceState({},'',location.pathname);result.hidden=true;refresh();};
  function persist(){sessionStorage.setItem(DRAFT,JSON.stringify({version:1,value:form}));sessionStorage.setItem(KEY,JSON.stringify(core.state()));}
  function notify(t){$('toast').textContent=t;$('toast').style.display='block';clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('toast').style.display='none',3200);}
  function validDraft(){
    const size=$('sizeInput').value.trim(),term=$('termInput').value.trim();
    if(form.custom&&size&&!validSize(Number(size))){notify('请填写0.5–200m³，手填容量最多两位小数');$('sizeInput').focus();return false;}
    if(term&&!core.validTerm(Number(term))){notify('租期请选择1–60个月的整数');$('termInput').focus();return false;}
    return true;
  }
  function refresh(writeInputs=true){
    document.querySelectorAll('#sizeChips [data-size]').forEach(b=>{const selected=form.custom?b.dataset.size==='custom':form.size!==null&&Number(b.dataset.size)===form.size;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});
    $('customSize').classList.toggle('show',form.custom);if(writeInputs)$('sizeInput').value=form.custom&&form.size!==null?form.size:'';
    document.querySelectorAll('#termChips [data-term]').forEach(b=>{const on=Number(b.dataset.term)===form.term;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
    if(writeInputs)$('termInput').value=form.term??'';$('termHuman').textContent=core.validTerm(form.term)?(form.term<12?form.term+'个月':form.term+'个月（'+Math.floor(form.term/12)+'年'+(form.term%12?form.term%12+'个月':'')+'）'):'请选择租期';
    document.querySelectorAll('#typeChips [data-type]').forEach(b=>{const on=form.types.includes(b.dataset.type);b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
    $('otherType').classList.toggle('show',form.types.includes('其他'));
    document.querySelectorAll('#moveChips [data-move]').forEach(b=>{const on=b.dataset.move===form.move;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
    $('transportGift').classList.toggle('show',form.move==='需要');updateEditContext();persist();
  }
  $('back').onclick=()=>{persist();location.href='home.html';};
  $('sizeChips').onclick=e=>{const b=e.target.closest('[data-size]');if(!b)return;if(b.dataset.size==='custom'){form.custom=true;form.band='';refresh();$('sizeInput').focus();}else{form.size=Number(b.dataset.size);form.band=b.textContent.trim();form.custom=false;refresh();}};
  $('sizeInput').oninput=e=>{const raw=e.target.value,v=Number(raw);form.size=raw&&validSize(v)?v:null;form.custom=true;form.band='';persist();};
  $('termChips').onclick=e=>{const b=e.target.closest('[data-term]');if(!b)return;form.term=Number(b.dataset.term);refresh();};
  $('termInput').oninput=e=>{const v=Number(e.target.value);form.term=e.target.value&&core.validTerm(v)?v:null;refresh(false);};
  $('termMinus').onclick=()=>{form.term=form.term===null?1:Math.max(1,form.term-1);refresh();};
  $('termPlus').onclick=()=>{form.term=form.term===null?1:Math.min(60,form.term+1);refresh();};
  $('typeChips').onclick=e=>{const b=e.target.closest('[data-type]');if(!b)return;const v=b.dataset.type;form.types=form.types.includes(v)?form.types.filter(x=>x!==v):[...form.types,v];refresh();};
  $('moveChips').onclick=e=>{const b=e.target.closest('[data-move]');if(b){form.move=b.dataset.move;refresh();}};
  for(const [id,key] of Object.entries(fields))$(id).oninput=e=>{form[key]=e.target.value;persist();};
  $('expectedDate').min=core.fixture.demoToday;
  $('estimate').setAttribute('role','button');$('estimate').tabIndex=0;
  $('estimate').onclick=()=>{persist();sessionStorage.setItem('mk_estimate_return_v4','business.html');location.href='cap.html';};
  $('estimate').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('estimate').click();}};
  $('browse').onclick=()=>{
    if(!validDraft())return;
    if(!validSize(form.size)){notify('请填写或选择所需空间');$('sizeInput').focus();return;}
    if(!core.validTerm(form.term)){notify('请选择租期');$('termInput').focus();return;}
    try{const current=core.state().requirement;if(current.source==='items_estimate'&&current.capacity_m3===form.size)core.setTerm(form.term);else core.setRequirement(form.size,form.term,true);form.requirementSignature=JSON.stringify(core.state().requirement);persist();location.href='index.html?page=S5';}
    catch{notify('请核对所需空间与租期');}
  };
  const result=document.createElement('div');result.className='business-result';result.hidden=true;result.innerHTML='<section role="dialog" aria-modal="true" aria-labelledby="business-result-title"><h2 id="business-result-title">企业需求已保存</h2><p id="business-result-text"></p><p>当前为内部预览，尚未向顾问发送。</p><button type="button" id="business-result-close">继续查看需求</button></section>';document.body.appendChild(result);
  $('business-result-close').onclick=()=>result.hidden=true;
  $('submit').onclick=()=>{
    if(!validDraft())return;
    try{const updating=!!form.lead_id;const lead=core.saveEnterpriseLead({lead_id:form.lead_id||undefined,phone:form.phone,location:form.location,contact_name:form.contact_name,company:form.company,capacity_m3:form.size,capacity_band:form.band,term_months:form.term,storage_types:form.types,storage_type_other:form.storage_type_other,moving_support:form.move,expected_start_date:form.expected_start_date,notes:form.notes});form.lead_id=lead.id;form.lead_updated_at=lead.updated_at;persist();updateEditContext();$('business-result-title').textContent=updating?'企业需求已更新':'企业需求已保存';$('business-result-text').textContent=(updating?'已更新原需求 ':'需求编号 ')+lead.id+'，继续补充仍使用同一编号。';result.hidden=false;}
    catch(e){const messages={LEAD_NOT_FOUND:'原需求不存在，请从我的需求打开或明确新建',LEAD_WITHDRAWN:'该需求已撤回，可明确新建其他需求',ENTER_BUSINESS_PHONE:'请填写有效的联系电话，国际号码请带国家区号',INVALID_TERM:'租期请选择1–60个月的整数',SELECT_DATE:'请选择有效的预计用仓日期',INVALID_CAPACITY:'请填写0.5–200m³的有效容量'};notify(messages[e.message]||'请检查已填写的信息');if(e.message==='ENTER_BUSINESS_PHONE')$('phone').focus();}
  };
  window.addEventListener('pagehide',persist);refresh();
})();
