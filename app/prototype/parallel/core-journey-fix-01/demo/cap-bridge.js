(function(){
  'use strict';
  const runtimeStyle=document.createElement('style');runtimeStyle.textContent='html{scrollbar-width:none}html::-webkit-scrollbar{display:none}.toast{pointer-events:none}';document.head.appendChild(runtimeStyle);
  const KEY='mk_independent_sim_v1',DRAFT='mk_cap_draft_v3';
  const read=k=>{try{return JSON.parse(sessionStorage.getItem(k)||'null');}catch{return null;}};
  const core=SIM_CORE.create({state:read(KEY)}),r=core.state().requirement,draft=read(DRAFT),signature=JSON.stringify(r);
  const phoneAuth=SIM_PHONE_AUTH.create({core,persist:()=>sessionStorage.setItem(KEY,JSON.stringify(core.state())),onMessage:message=>{const el=document.createElement('p');el.className='notice';el.setAttribute('role','status');el.textContent=message;document.body.appendChild(el);setTimeout(()=>el.remove(),4000);}});
  if(draft?.signature===signature){document.getElementById('capacity').value=draft.capacity;chosenMonth=core.validTerm(draft.term)?draft.term:null;}
  else{if(r.capacity_m3!==null)document.getElementById('capacity').value=r.capacity_m3;chosenMonth=r.term_confirmed?r.term_months:null;}
  const returnContext=sessionStorage.getItem('mk_estimate_return_v4')||'';const oldUpdate=update;update=function(){oldUpdate();const cta=document.getElementById('cta');if(cta&&!cta.disabled)cta.textContent=returnContext.includes('page=S01')?'查看推荐门店':returnContext.includes('page=S02')?'查看推荐仓位':'查看仓位 →';};update();
  const large=document.createElement('section');large.className='large-demand-advice';large.hidden=true;large.innerHTML='<strong>大空间需求建议联系顾问</strong><p>50m³及以上可由顾问核对空间、搬运和服务范围；运输资格需另行确认。</p><button type="button" id="large-advisor">请顾问协助</button>';document.getElementById('cta').parentNode.insertBefore(large,document.getElementById('cta'));document.getElementById('large-advisor').onclick=()=>window.openIndependentFlow('顾问');const largeUpdate=()=>{large.hidden=Number(document.getElementById('capacity').value)<50;};document.getElementById('capacity').addEventListener('input',largeUpdate);largeUpdate();
  function saveDraft(){sessionStorage.setItem(DRAFT,JSON.stringify({signature,capacity:document.getElementById('capacity').value,term:chosenMonth}));}
  function navigate(url){saveDraft();location.href=url;}
  document.querySelector('.nav .back').onclick=()=>{navigate(sessionStorage.getItem('mk_estimate_return_v4')||'home.html');};
  document.getElementById('cta').addEventListener('click',()=>{
    const p=window.__VIS09_confirmed;if(!p)return;
    core.setRequirement(p.target_volume,p.term_months,p.term_confirmed);sessionStorage.setItem(KEY,JSON.stringify(core.state()));sessionStorage.removeItem(DRAFT);sessionStorage.removeItem('mk_items_draft_v3');
    core.claimCoupons();sessionStorage.setItem(KEY,JSON.stringify(core.state()));const target=sessionStorage.getItem('mk_estimate_return_v4')||'index.html?page=S5';sessionStorage.removeItem('mk_estimate_return_v4');location.href=target;
  });
  window.addEventListener('pagehide',saveDraft);
  document.addEventListener('input',saveDraft);document.addEventListener('click',saveDraft);
  window.openIndependentFlow=function(name){
    saveDraft();
    if(name.includes('物品')){sessionStorage.setItem('mk_items_back_v1','cap.html');navigate('items.html');return;}
    if(name.includes('顾问')){sessionStorage.setItem('mk_advisor_context_v3',JSON.stringify({_return:'cap.html',capacity_hint:core.validCapacity(Number(document.getElementById('capacity').value))?document.getElementById('capacity').value+'m³':'',term_hint:chosenMonth?chosenMonth+'个月':''}));navigate('index.html?page=BOOKING&mode=advisor');return;}
    const bg=document.getElementById('flowBg'),box=bg.querySelector('.flow');
    box.innerHTML='<h3>AI估算</h3><p>照片识别功能尚未接入，当前不会上传或识别照片，也不会自动填写容量。您可以按物品估算，或返回手动填写。</p><button id="ai-items">按物品估算</button><button id="ai-return">返回容量填写</button>';
    document.getElementById('ai-items').onclick=()=>navigate('items.html');document.getElementById('ai-return').onclick=()=>{bg.classList.remove('on');document.body.style.overflow='';};
    bg.classList.add('on');document.body.style.overflow='hidden';
  };
  const params=new URLSearchParams(location.search);if(params.get('assist')==='AI')openIndependentFlow('AI估算');
  document.body.dataset.journeyReady='true';
})();
