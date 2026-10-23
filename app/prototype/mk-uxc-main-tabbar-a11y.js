/* UX-PATCH C: keyboard access to existing main-nav click handlers; no route overrides. */
(function(){'use strict';
 const nav=document.querySelector('.koala-uxc-nav .tabbar,.koala-uxc-nav .bottomnav');
 if(!nav)return;
 nav.setAttribute('aria-label','主导航');
 /* NAV-ICON-01C: keep existing tabs and handlers, render local Scheme B assets. */
 const resourceBase=new URL('../assets/nav/scheme-b/',document.currentScript.src);
 const iconNames=['home','find','stores','me'];
 const labels=['首页','找仓','门店','我的'];
 const renderIcons=()=>{
  nav.querySelectorAll('.tab,.navitem').forEach((el,index)=>{
   const icon=el.querySelector('.ico');if(!icon||!iconNames[index])return;
   const active=el.classList.contains('active');
   const asset=iconNames[index]+'-'+(active?'active':'inactive');
   el.setAttribute('aria-label',labels[index]);
   if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');
   if(icon.dataset.navAsset===asset&&icon.querySelector('img'))return;
   icon.dataset.navAsset=asset;icon.setAttribute('aria-hidden','true');
   const img=document.createElement('img');img.alt='';img.width=26;img.height=26;
   img.onerror=()=>{
    if(img.dataset.fallback){img.hidden=true;icon.textContent=['⌂','⌕','▦','◉'][index];return;}
    img.dataset.fallback='png';img.src=new URL('png_3x/'+asset+'.png',resourceBase).href;
   };
   img.src=new URL('svg/'+asset+'.svg',resourceBase).href;icon.replaceChildren(img);
  });
 };
 renderIcons();
 window.addEventListener('pageshow',renderIcons);
 new MutationObserver(renderIcons).observe(nav,{subtree:true,attributes:true,attributeFilter:['class']});
 for(const el of nav.querySelectorAll('.tab,.navitem')){
  if(!el.hasAttribute('tabindex'))el.setAttribute('tabindex','0');
  if(!el.hasAttribute('role'))el.setAttribute('role','link');
  if(el.classList.contains('active'))el.setAttribute('aria-current','page');
  /* H01 already binds a key handler to every .navitem; do not double click. */
  if(el.classList.contains('navitem'))continue;
  el.addEventListener('keydown',ev=>{
   if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();el.click();}
  });
 }
})();
