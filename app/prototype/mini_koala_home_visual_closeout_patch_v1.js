(function(){
  const CRITICAL_SELECTORS='[data-home-price],.home-brand-materials .materials-action,.bottomnav';
  const NUDGE_STEPS=[0,52,104,156,208,260,312];
  const SAFE_GAP=8;
  let raf=0;

  function overlaps(a,b,gap){
    return a.left<b.right+gap&&a.right>b.left-gap&&a.top<b.bottom+gap&&a.bottom>b.top-gap;
  }

  function isVisible(el){
    const style=getComputedStyle(el),rect=el.getBoundingClientRect();
    return style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0&&rect.bottom>0&&rect.top<innerHeight;
  }

  function init(){
    const support=document.getElementById('miniGlobalSupport');
    const nav=document.querySelector('.bottomnav');
    const launcher=document.getElementById('miniSupportLauncher');
    if(!support||!nav||!launcher)return;

    /* Remove the retired full-width help-bar geometry before enabling the float. */
    ['left','right','bottom','width','height','box-sizing','background','border-top','padding','align-items','justify-content']
      .forEach(name=>support.style.removeProperty(name));
    const page=document.querySelector('.page');
    if(page)page.style.removeProperty('padding-bottom');

    support.classList.remove('home-support-obstructed');
    support.classList.add('home-support-float');
    support.setAttribute('aria-hidden','false');
    support.querySelectorAll('button').forEach(button=>button.removeAttribute('tabindex'));

    const updatePosition=()=>{
      raf=0;
      const navHeight=Math.ceil(nav.getBoundingClientRect().height);
      support.style.setProperty('--home-support-nav-offset',(navHeight+12)+'px');
      support.style.setProperty('--home-support-nudge','0px');

      const base=support.getBoundingClientRect();
      const targets=Array.from(document.querySelectorAll(CRITICAL_SELECTORS))
        .filter(el=>el!==nav&&isVisible(el));
      let selected=0;
      let resolved=false;

      for(const nudge of NUDGE_STEPS){
        const candidate={left:base.left,right:base.right,top:base.top-nudge,bottom:base.bottom-nudge};
        if(candidate.top<SAFE_GAP)continue;
        if(!targets.some(target=>overlaps(candidate,target.getBoundingClientRect(),SAFE_GAP))){
          selected=nudge;
          resolved=true;
          break;
        }
      }

      support.style.setProperty('--home-support-nudge',selected+'px');
      support.toggleAttribute('data-collision-unresolved',!resolved);
    };

    const schedulePosition=()=>{
      if(!raf)raf=requestAnimationFrame(updatePosition);
    };

    support.addEventListener('click',schedulePosition);
    document.addEventListener('click',event=>{
      if(!support.classList.contains('expanded')||support.contains(event.target))return;
      support.classList.remove('expanded');
      launcher.focus();
      schedulePosition();
    });
    addEventListener('scroll',schedulePosition,{passive:true});
    if(page)page.addEventListener('scroll',schedulePosition,{passive:true});
    document.addEventListener('scroll',schedulePosition,true);
    addEventListener('resize',schedulePosition,{passive:true});
    new MutationObserver(schedulePosition).observe(support,{attributes:true,attributeFilter:['class']});
    schedulePosition();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
