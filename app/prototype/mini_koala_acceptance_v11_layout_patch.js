/* Mini Koala Acceptance Fix V1.1 / PATCH D: presentation only. */
(function(){
  'use strict';
  if(window.MINI_KOALA_LAYOUT_V11)return;
  const page=(location.pathname||'').split('/').pop().toLowerCase();
  const scope=/mine_m01/.test(page)?'m01':/business_b2b/.test(page)?'b2b':/coupon_(wallet|select)/.test(page)?'coupon':'other';
  function initialize(){
    if(!document.body)return;
    document.body.classList.add('mkd-page','mkd-'+scope);
    dockService();
    syncAccordions();
    addInlineValidation();
    if(scope==='coupon')watchServiceCoupon();
  }
  function dockService(){
    // User-requested rollback: the original shared script owns the floating help UI.
    // Keep other PATCH D accordion, validation and coupon changes active.
    return false;
  }
  function syncAccordions(){
    document.querySelectorAll('details.section-collapsible,details.quote-secondary').forEach(item=>{
      if(item.dataset.mkdAccordion==='1')return;
      const trigger=item.querySelector('summary');
      const label=trigger&&trigger.querySelector('em');
      if(!trigger||!label)return;
      item.dataset.mkdAccordion='1';
      const update=()=>{
        label.textContent=item.open?'收起 ▴':'展开 ▾';
        trigger.setAttribute('aria-expanded',String(!!item.open));
      };
      item.addEventListener('toggle',update);
      update();
    });
  }
  function errorText(input){
    const validity=input.validity||{};
    if(validity.valueMissing)return '请填写此项后继续';
    if(validity.typeMismatch&&input.type==='email')return '请填写有效的电子邮箱地址';
    if(validity.typeMismatch)return '请检查输入格式';
    if(validity.rangeUnderflow||validity.rangeOverflow)return '请输入允许范围内的数值';
    if(validity.patternMismatch)return '输入格式不符合要求，请核对后重试';
    return input.validationMessage||'请检查此处填写的信息';
  }
  function showError(input,message){
    if(!input||!input.parentNode||!input.setAttribute)return;
    const id=input.id||input.name;
    const errorId='mkd-error-'+(id?String(id).replace(/[^\w-]/g,'-'):'field');
    let err=document.getElementById(errorId);
    if(!err){
      err=document.createElement('div');err.id=errorId;err.className='mkd-field-error';err.setAttribute('role','alert');
      input.insertAdjacentElement('afterend',err);
    }
    err.hidden=false;err.textContent=message;
    input.setAttribute('aria-invalid','true');
    const previous=(input.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean);
    if(!previous.includes(errorId))input.setAttribute('aria-describedby',[...previous,errorId].join(' '));
  }
  function clearError(input){
    if(!input)return;
    input.removeAttribute('aria-invalid');
    const id=input.id||input.name;
    const eid='mkd-error-'+String(id||'field').replace(/[^\w-]/g,'-');
    const err=document.getElementById(eid);if(err)err.hidden=true;
    const described=(input.getAttribute('aria-describedby')||'').split(/\s+/).filter(s=>s&&s!==eid);
    if(described.length)input.setAttribute('aria-describedby',described.join(' '));
    else input.removeAttribute('aria-describedby');
  }
  function addInlineValidation(){
    document.addEventListener('invalid',e=>{
      if(!e.target||!e.target.matches||!e.target.matches('input,textarea,select'))return;
      // No new validation rule: mirror the browser's existing constraint result inline.
      e.preventDefault();showError(e.target,errorText(e.target));
    },true);
    document.addEventListener('input',e=>{
      const t=e.target;
      if(t&&t.getAttribute&&t.getAttribute('aria-invalid')==='true'&&t.validity&&t.validity.valid)clearError(t);
    },true);
    // B2B already validates its required phone in original code but only displays a toast.
    if(scope==='b2b'){
      const submit=document.getElementById('submit'),phone=document.getElementById('phone');
      if(submit&&phone){
        submit.addEventListener('click',()=>{
          const digits=String(phone.value||'').replace(/[\s-]/g,'');
          const valid=/^1[3-9]\d{9}$/.test(digits)||/^\+[1-9]\d{7,14}$/.test(digits);
          if(!valid)showError(phone,digits?'请填写有效手机号，国际号码请带国家区号':'请先填写联系电话');
          else clearError(phone);
        });
        phone.addEventListener('input',()=>{
          const digits=String(phone.value||'').replace(/[\s-]/g,'');
          if(/^1[3-9]\d{9}$/.test(digits)||/^\+[1-9]\d{7,14}$/.test(digits))clearError(phone);
        });
      }
    }
  }
  function watchServiceCoupon(){
    const list=document.getElementById('list');if(!list)return;
    function decorate(){
      list.querySelectorAll('.coupon-card').forEach(card=>{
        if(card.querySelector('.mkd-coupon-info'))return;
        const name=card.querySelector('.coupon-card-name');
        if(!name||!name.textContent.includes('搬运补贴'))return;
        const foot=card.querySelector('.coupon-card-foot');if(!foot)return;
        // Service benefit is not rent cashback: do not invent a coupon redemption path.
        const btn=document.createElement('button');btn.type='button';btn.className='mkd-coupon-info';
        btn.textContent='查看使用说明';btn.setAttribute('aria-expanded','false');
        const note=document.createElement('div');note.className='mkd-coupon-explain';note.hidden=true;
        note.textContent='该权益用于符合条件的搬运服务，不直接抵扣仓位租金。具体适用条件以券面说明和实际可办理服务为准。';
        btn.addEventListener('click',()=>{note.hidden=!note.hidden;btn.setAttribute('aria-expanded',String(!note.hidden));});
        foot.appendChild(btn);card.appendChild(note);
      });
    }
    decorate();
    if(typeof MutationObserver==='function'){
      const observer=new MutationObserver(decorate);
      observer.observe(list,{childList:true,subtree:true});
    }
  }
  window.MINI_KOALA_LAYOUT_V11={dockService,syncAccordions,showError,clearError,watchServiceCoupon,scope};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
