/* HOME-SEARCH-02A · 可删除的独立注入层：仅 H01 */
(function(){
  'use strict';
  const INTENT_KEY='mini_koala_h01_search_intent_02a';
  function boot(){
    if(document.getElementById('mkHomeSearchA'))return;
    const tasks=document.querySelector('.dual-task-grid');
    const banner=document.getElementById('newHero')||document.querySelector('[data-home-banner]');
    if(!tasks || !banner || !tasks.parentNode || tasks.parentNode!==banner.parentNode){
      console.warn('[HOME-SEARCH-02A] anchor not verified; skip insertion');
      return;
    }
    const wrap=document.createElement('div');
    wrap.className='mk-home-search-a-wrap state-new';
    wrap.id='mkHomeSearchAWrap';
    wrap.innerHTML='<button class="mk-home-search-city" id="mkHomeSearchCity" type="button" aria-label="选择城市或用仓位置"><span>北京</span><span aria-hidden="true">⌄</span></button><span class="mk-home-search-divider" aria-hidden="true"></span><button class="mk-home-search-a" id="mkHomeSearchA" type="button" aria-label="搜索小区、地址或门店，进入找仓搜索"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.7" cy="10.7" r="7"/><path d="m16 16 5 5"/></svg><span class="mk-home-search-a-label">搜索小区、地址或门店</span></button>';
    banner.insertAdjacentElement('afterend',wrap);
    wrap.querySelector('#mkHomeSearchCity').addEventListener('click',function(){
      document.getElementById('homeLocation')?.click();
    });
    wrap.querySelector('#mkHomeSearchA').addEventListener('click',function(){
      // 单次意图仅用于 S01 可选的自动打开搜索；不保存位置、用户输入及任何个人信息。
      try{sessionStorage.setItem(INTENT_KEY,JSON.stringify({source:'home_search',at:Date.now()}));}catch(e){}
      let hasEstimate=false;try{hasEstimate=(typeof currentState!=='undefined' && currentState==='estimated');}catch(e){}
      if(typeof goStores==='function'){
        goStores({nearbyShortcut:!hasEstimate,source:'home_search'});
      }else{
        // 若旧/新母版没有已验证的 goStores，则沿用现有「查看附近门店」事件，禁止猜造 URL。
        const existing=document.getElementById('storeLink');
        if(existing)existing.click();
        else console.warn('[HOME-SEARCH-02A] S01 navigation unavailable: leave page unchanged');
      }
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
