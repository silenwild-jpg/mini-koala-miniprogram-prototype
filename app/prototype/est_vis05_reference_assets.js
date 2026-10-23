/* EST-VIS-05 decorative photo substitution only. No change to business listeners. */
(function(){'use strict';
const prefix='../assets/est-vis05-ref/';
const scenes=new Set(['moving','renovation','luggage','seasonal','household','collection','merchant','enterprise']);
function currentScene(){try{return state.scene||''}catch(_){return document.querySelector('#s2 .scene.selected')?.dataset.id||''}}
function paint(){
 document.querySelectorAll('#s2 .scene[data-id]').forEach(el=>{
 const id=el.dataset.id,img=el.querySelector('.estvis03-photo img');if(!img||!scenes.has(id))return;
 const src=prefix+id+'.webp';if(img.getAttribute('src')!==src)img.setAttribute('src',src);
 });
 const id=currentScene();const hero=document.querySelector('#s3 .hero');
 if(hero&&scenes.has(id))hero.style.setProperty('--estvis04-hero-photo',`url("${prefix+id}.webp")`);
 const sub=document.getElementById('amountQuestionSub');
 if(sub&&id&&!sub.textContent.trim())sub.textContent='选择一个最接近的情况，之后还可以调整物品。';
 if(id==='moving')document.querySelectorAll('#s3 .estvis04-ref-amount').forEach((img,i)=>{
  const name=['moving-single','moving-onebed','moving-twobed'][i];if(name){const src=prefix+name+'.webp';if(img.getAttribute('src')!==src)img.src=src}
 });
}
['cScenes','bScenes','amountList'].forEach(id=>{const el=document.getElementById(id);if(el)new MutationObserver(paint).observe(el,{childList:true})});
const a=document.querySelector('#amountQuestionSub');if(a)a.removeAttribute('aria-hidden');
paint();
})();
