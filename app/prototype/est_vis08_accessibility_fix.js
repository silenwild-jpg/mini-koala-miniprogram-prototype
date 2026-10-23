/* EST-VIS-08: semantic keyboard access to existing click-driven choice cards. */
(function(){'use strict';
 const types=['#s2 .scene[data-id]','#s3 #amountList .amount-card[data-id]'];
 function sync(){
  for(const selector of types)document.querySelectorAll(selector).forEach(card=>{
   card.setAttribute('role','button');card.tabIndex=0;
   const name=card.querySelector('b')?.textContent?.trim()||card.dataset.id||'选择';
   card.setAttribute('aria-label',name);
   card.setAttribute('aria-pressed',card.classList.contains('selected')?'true':'false');
  });
 }
 function onKey(ev){
  if(ev.repeat||ev.ctrlKey||ev.metaKey||ev.altKey||!(ev.key==='Enter'||ev.key===' '))return;
  const card=ev.target.closest?.('#s2 .scene[data-id],#s3 #amountList .amount-card[data-id]');
  if(!card||ev.target!==card)return;
  ev.preventDefault();card.click();
 }
 ['cScenes','bScenes','amountList'].forEach(id=>{
  const parent=document.getElementById(id);
  if(parent)new MutationObserver(sync).observe(parent,{childList:true});
 });
 document.addEventListener('keydown',onKey);
 sync();
})();
