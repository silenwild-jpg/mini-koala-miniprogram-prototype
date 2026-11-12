(function(){
  'use strict';
  const runtimeStyle=document.createElement('style');runtimeStyle.textContent='html{scrollbar-width:none}html::-webkit-scrollbar{display:none}.toast{pointer-events:none}';document.head.appendChild(runtimeStyle);
  const KEY='mk_independent_sim_v1',DRAFT='mk_cap_draft_v3';
  const read=k=>{try{return JSON.parse(sessionStorage.getItem(k)||'null');}catch{return null;}};
  const core=SIM_CORE.create({state:read(KEY)}),r=core.state().requirement,draft=read(DRAFT),signature=JSON.stringify(r);
  const phoneAuth=SIM_PHONE_AUTH.create({core,persist:()=>sessionStorage.setItem(KEY,JSON.stringify(core.state())),onMessage:message=>{const el=document.createElement('p');el.className='notice';el.setAttribute('role','status');el.textContent=message;document.body.appendChild(el);setTimeout(()=>el.remove(),4000);}});
  if(draft?.signature===signature){document.getElementById('capacity').value=draft.capacity;chosenMonth=core.validTerm(draft.term)?draft.term:null;}
  else{if(r.capacity_m3!==null)document.getElementById('capacity').value=r.capacity_m3;chosenMonth=r.term_confirmed?r.term_months:null;}
  // CAP-UNIT-DUAL-01: the original #capacity remains the canonical m³ input
  // consumed by the frozen CAP estimator. Area is a single alternate expression.
  const capacityField=document.getElementById('capacity');
  const originalCapacity=String(capacityField.value||'');
  const areaField=capacityField.cloneNode(false);
  areaField.id='capacity-area';areaField.name='capacity-area';
  areaField.classList.add('cap-unit-field');
  capacityField.classList.add('cap-unit-field');
  // The native stepper already has minus/plus; a number-field spinner would duplicate them.
  areaField.type='text';areaField.maxLength=6;
  areaField.inputMode='decimal';areaField.setAttribute('aria-label','预计占地面积（平方米）');
  areaField.placeholder='如：2';areaField.hidden=true;
  const unitPicker=document.createElement('select');
  unitPicker.className='cap-unit-picker';unitPicker.setAttribute('aria-label','空间输入单位');
  unitPicker.innerHTML='<option value="m3">m³</option><option value="m2">㎡</option>';
  capacityField.insertAdjacentElement('afterend',areaField);
  areaField.insertAdjacentElement('afterend',unitPicker);
  // Retain the frozen label node for existing CAP scripts, but do not render
  // a second m³ label beside the new switcher.
  const legacyUnit=document.getElementById('unit');
  if(legacyUnit){legacyUnit.hidden=true;legacyUnit.setAttribute('aria-hidden','true');}
  const unitStyle=document.createElement('style');
  unitStyle.textContent='.cap-unit-field[hidden],.cap-unit-picker + #unit{display:none!important}.cap-unit-picker{margin-left:4px;min-width:54px;height:36px;padding:0 4px;border:0;border-bottom:1px solid #bdd2c6;background:transparent;color:#185d45;font:inherit;font-weight:700}';
  document.head.appendChild(unitStyle);
  const draftValid=draft?.signature===signature;
  let currentUnit=draftValid&&draft?.unitMode==='m2'||(!draftValid&&r.input_unit==='m2')?'m2':'m3';
  let savedArea=draftValid?draft?.area:r.input_value;
  let lastCanonical=originalCapacity;
  function putArea(value){
    const raw=String(value??'').trim(),num=Number(raw);
    const valid=raw!==''&&Number.isFinite(num)&&num>=0.2&&num<=80&&Math.abs(num*10-Math.round(num*10))<1e-7;
    const m3=valid?Number((num*2.5).toFixed(2)):null;
    capacityField.value=m3===null?'':String(m3);
    lastCanonical=capacityField.value;
    capacityField.dispatchEvent(new Event('input',{bubbles:true}));
  }
  function displayUnit(){
    unitPicker.value=currentUnit;
    const areaMode=currentUnit==='m2';
    areaField.hidden=!areaMode;capacityField.hidden=areaMode;
    if(areaMode)putArea(areaField.value);
    else{areaField.setCustomValidity('');capacityField.dispatchEvent(new Event('input',{bubbles:true}));}
  }
  if(currentUnit==='m2'){
    areaField.value=Number.isFinite(Number(savedArea))&&String(savedArea??'')!==''?String(savedArea):'';
  }
  displayUnit();
  areaField.addEventListener('input',()=>putArea(areaField.value));
  unitPicker.addEventListener('change',()=>{
    if(unitPicker.value==='m2'&&currentUnit!=='m2')areaField.value='';
    currentUnit=unitPicker.value;displayUnit();
    saveDraft();
  });
  // The frozen minus/plus operate on canonical m³. In area mode, reflect
  // their 0.5m³ increments back as 0.2㎡ without switching the user's unit.
  // An explicit m³ quick-size chip, however, is a deliberate cubic selection.
  document.addEventListener('click',event=>{
    if(currentUnit!=='m2')return;
    const preset=/^\\s*\\d+(?:\\.\\d+)?\\s*m(?:³|3)\\s*$/.test(event.target.closest('button')?.textContent||'');
    setTimeout(()=>{
      if(currentUnit!=='m2'||capacityField.value===lastCanonical)return;
      if(preset){currentUnit='m3';displayUnit();saveDraft();return;}
      const next=Number(capacityField.value)/2.5;
      if(Number.isFinite(next)&&next>=0.2&&next<=80){
        areaField.value=String(Number(next.toFixed(1)));
        putArea(areaField.value);saveDraft();
      }else{putArea(areaField.value);saveDraft();}
    },0);
  },true);
  const returnContext=sessionStorage.getItem('mk_estimate_return_v4')||'';const oldUpdate=update;update=function(){oldUpdate();const cta=document.getElementById('cta');if(cta&&!cta.disabled)cta.textContent='查看仓位报价';};update();
  const large=document.createElement('section');large.className='large-demand-advice';large.hidden=true;large.innerHTML='<strong>大空间需求建议联系顾问</strong><p>50m³及以上可由顾问核对空间、搬运和服务范围；运输资格需另行确认。</p><button type="button" id="large-advisor">请顾问协助</button>';document.getElementById('cta').parentNode.insertBefore(large,document.getElementById('cta'));document.getElementById('large-advisor').onclick=()=>window.openIndependentFlow('顾问');const largeUpdate=()=>{large.hidden=Number(document.getElementById('capacity').value)<50;};document.getElementById('capacity').addEventListener('input',largeUpdate);largeUpdate();
  function saveDraft(){sessionStorage.setItem(DRAFT,JSON.stringify({signature,capacity:document.getElementById('capacity').value,term:chosenMonth,unitMode:currentUnit,area:areaField.value}));}
  function navigate(url){saveDraft();location.href=url;}
  document.querySelector('.nav .back').onclick=()=>{navigate(sessionStorage.getItem('mk_estimate_return_v4')||'home.html');};
  document.getElementById('cta').addEventListener('click',()=>{
    const p=window.__VIS09_confirmed;if(!p)return;
    if(currentUnit==='m2'){
      const area=Number(areaField.value);
      if(!areaField.value.trim()||!Number.isFinite(area)||area<0.2||area>80||
        Math.abs(area*10-Math.round(area*10))>1e-7||
        Math.abs(p.target_volume-area*2.5)>1e-7)return;
    }
    core.setRequirement(p.target_volume,p.term_months,p.term_confirmed,
      currentUnit==='m2'?{input_unit:'m2',input_value:Number(areaField.value)}:null);
    sessionStorage.setItem(KEY,JSON.stringify(core.state()));sessionStorage.removeItem(DRAFT);sessionStorage.removeItem('mk_items_draft_v3');
    core.claimCoupons();sessionStorage.setItem(KEY,JSON.stringify(core.state()));const target=sessionStorage.getItem('mk_estimate_return_v4')||'index.html?page=S5';sessionStorage.removeItem('mk_estimate_return_v4');location.href=target;
  });
  window.addEventListener('pagehide',saveDraft);
  document.addEventListener('input',saveDraft);document.addEventListener('click',saveDraft);
  window.openIndependentFlow=function(name){
    saveDraft();
    if(name.includes('物品')){sessionStorage.setItem('mk_items_back_v1','cap.html');navigate('items.html');return;}
    if(name.includes('顾问')){sessionStorage.setItem('mk_advisor_context_v3',JSON.stringify({_return:'cap.html',capacity_hint:currentUnit==='m2'&&areaField.value?areaField.value+'㎡':core.validCapacity(Number(document.getElementById('capacity').value))?document.getElementById('capacity').value+'m³':'',term_hint:chosenMonth?chosenMonth+'个月':''}));navigate('index.html?page=BOOKING&mode=advisor');return;}
    const bg=document.getElementById('flowBg'),box=bg.querySelector('.flow');
    box.innerHTML='<h3>AI估算</h3><p>照片识别功能尚未接入，当前不会上传或识别照片，也不会自动填写容量。您可以按物品估算，或返回手动填写。</p><button id="ai-items">按物品估算</button><button id="ai-return">返回容量填写</button>';
    document.getElementById('ai-items').onclick=()=>navigate('items.html');document.getElementById('ai-return').onclick=()=>{bg.classList.remove('on');document.body.style.overflow='';};
    bg.classList.add('on');document.body.style.overflow='hidden';
  };
  const params=new URLSearchParams(location.search);if(params.get('assist')==='AI')openIndependentFlow('AI估算');
  document.body.dataset.journeyReady='true';
})();
