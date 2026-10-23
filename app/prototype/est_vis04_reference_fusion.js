/* EST-VIS-04: visual-only replacement of EST-VIS-03 decorator's image assets.
 No bindings or handlers for original scene/amount cards are modified. */
(function(){'use strict';
 const prefix='../assets/est-vis04-ref/';
 const keys=['moving','renovation','luggage','seasonal','household','collection','merchant','enterprise'];
 const dynamicScene=()=>{try{if(typeof state!=='undefined')return state.scene||'';}catch(e){} return document.querySelector('#s2 .scene.selected')?.dataset.id||'';};
 function decorate(){
   document.querySelectorAll('#s2 .scene[data-id] .estvis03-photo img').forEach(img=>{
      const key=img.closest('.scene')?.dataset.id;
      if(!keys.includes(key))return;
      const desired=prefix+key+'.webp';
      if(img.getAttribute('src')!==desired){img.setAttribute('src',desired);img.dataset.estvis04Source='source-board-crop';}
   });
   const scene=dynamicScene();
   const hero=document.querySelector('#s3 .hero');
   if(hero&&keys.includes(scene)){hero.style.setProperty('--estvis04-hero-photo',`url("${prefix+scene}.webp")`);}
   if(scene==='moving'){
      document.querySelectorAll('#s3 #amountList .amount-card .estvis03-amount-media').forEach((media,i)=>{
        const file=['moving-single','moving-onebed','moving-twobed'][i];
        if(!file||media.dataset.estvis04==='ref')return;
        // Only changes decorative images. No business DOM nodes or event listeners touched.
        const img=document.createElement('img'); img.className='estvis04-ref-amount';img.alt='';img.decoding='async';
        img.src=prefix+file+'.webp';
        media.replaceChildren(img); media.dataset.estvis04='ref';
      });
   }
 }
 const roots=['cScenes','bScenes','amountList'].map(id=>document.getElementById(id)).filter(Boolean);
 roots.forEach(el=>new MutationObserver(decorate).observe(el,{childList:true}));
 decorate();
})();