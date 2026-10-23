(function(){
  'use strict';
  const modalState=new Map();
  const visible=el=>el&&el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0&&getComputedStyle(el).visibility!=='hidden';
  const masks=()=>[...document.querySelectorAll('.sheet-mask:not(.inline-filter-sheet),.access-sheet-mask,.mini-support-mask,#mineSheet,#helpMask,#holdMask,#contractSheet,#phoneAuthSheet,#depositSheet,#rulesSheet,#prohibitedSheet,#storeMapSheet')];
  function refreshModals(){
    masks().forEach(mask=>{
      const open=mask.classList.contains('show')&&visible(mask);
      if(open&&!modalState.has(mask)){
        const previous=document.activeElement;
        const panel=mask.firstElementChild||mask;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
        const heading=panel.querySelector('h2,h3');
        if(heading){if(!heading.id)heading.id=(mask.id||'sheet')+'-title';panel.setAttribute('aria-labelledby',heading.id)}
        else panel.setAttribute('aria-label',mask.id==='requirementSheet'?'修改需求':'选项与说明');
        panel.tabIndex=-1;modalState.set(mask,{previous,panel});
        (panel.querySelector('button,input,select,[tabindex="0"]')||panel).focus({preventScroll:true});
      }else if(!open&&modalState.has(mask)){
        const previous=modalState.get(mask).previous;modalState.delete(mask);if(previous?.isConnected)previous.focus({preventScroll:true});
      }
    });
  }
  document.addEventListener('keydown',event=>{
    if(!event.defaultPrevented&&['Enter',' '].includes(event.key)&&event.target.matches('[role="button"]')&&!event.target.matches('button,input,select,textarea,a')){
      event.preventDefault();event.target.click();return;
    }
    const active=[...modalState].filter(([mask])=>visible(mask)&&mask.classList.contains('show')).pop();if(!active)return;
    const [mask,{panel}]=active;
    if(event.key==='Escape'){
      event.preventDefault();event.stopImmediatePropagation();
      if(mask.classList.contains('sheet-mask')&&typeof window.closeSheet==='function')window.closeSheet(mask);
      else mask.click();
      refreshModals();
    }
    if(event.key==='Tab'){
      const controls=[...panel.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(visible);
      if(!controls.length){event.preventDefault();panel.focus();return}
      const first=controls[0],last=controls[controls.length-1];
      if(event.shiftKey&&(document.activeElement===first||!panel.contains(document.activeElement))){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&(document.activeElement===last||!panel.contains(document.activeElement))){event.preventDefault();first.focus()}
    }
  },true);
  // Avoid obscuring an actionable card when it scrolls beneath the fixed help button.
  function avoidSupportOverlap(){
    const launcher=document.querySelector('#miniSupportLauncher');if(!launcher)return;
    const float=document.querySelector('#miniGlobalSupport');if(float?.classList.contains('expanded')){float.style.visibility='visible';return}
    const rect=launcher.getBoundingClientRect();
    const conflict=[...document.querySelectorAll('#bizAdvisor,.bottombar button,.actions button,.bottom button,[role="button"],button,a[href]')].some(el=>{
      if(el.closest('#miniGlobalSupport,.sheet-mask,.mini-support-mask'))return false;
      const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.left<rect.right&&r.right>rect.left&&r.top<rect.bottom&&r.bottom>rect.top;
    });
    float.style.visibility=conflict?'hidden':'visible';
  }
  let pending=false;
  function refresh(){pending=false;refreshModals();avoidSupportOverlap();
    document.querySelectorAll('.sheet-mask .pill,.sheet-mask .option,.sheet-mask .term-option').forEach(el=>{
      if(el.tagName!=='BUTTON'){el.setAttribute('role','button');el.tabIndex=0;el.setAttribute('aria-pressed',String(el.classList.contains('active')))}
    });
    document.querySelectorAll('.field label').forEach(label=>{
      const control=label.parentElement.querySelector('input[id],select[id],textarea[id]');
      if(control&&!label.htmlFor&&!label.contains(control))label.htmlFor=control.id;
    });
    for(const id of ['sizeMinus','sizePlus']){const button=document.getElementById(id),value=document.getElementById('sizeValue');if(button&&value){const n=parseFloat(value.textContent);button.disabled=id==='sizeMinus'?n<=.5:n>=200}}
  }
  const observer=new MutationObserver(()=>{if(!pending){pending=true;requestAnimationFrame(refresh)}});
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('scroll',avoidSupportOverlap,true);window.addEventListener('resize',avoidSupportOverlap);
  refresh();
})();
