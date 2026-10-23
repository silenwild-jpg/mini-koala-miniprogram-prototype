/* HOME-VIS controlled trial: artwork and category focus only. */
(function(){
  'use strict';
  const asset='../assets/home-vis-2026-10-19/';
  const entries=[
    {id:'personal',label:'个人存储',detail:'家居杂物',category:'organize',image:'quick_personal_storage.png'},
    {id:'luggage',label:'行李寄存',detail:'短租长租',category:'suitcase',image:'quick_luggage_storage.png'},
    {id:'home',label:'家庭收纳',detail:'腾出空间',category:'furniture',image:'quick_home_storage.png'},
    {id:'business',label:'企业存储',detail:'档案设备',category:'business',image:'quick_business_storage.png'},
    {id:'more',label:'更多服务',detail:'灵活选择',category:'all',image:'quick_more_services.png'}
  ];
  function boot(){
    const hero=document.getElementById('newHero');
    const search=document.getElementById('mkHomeSearchAWrap');
    const tasks=document.querySelector('.dual-task-grid');
    if(!hero||!search||!tasks||hero.dataset.homeVisTrial==='1')return;
    hero.dataset.homeVisTrial='1';
    hero.classList.add('mk-home-vis-trial');
    hero.innerHTML='<img class="mk-home-vis-banner" src="'+asset+'home_banner_main.png" width="1774" height="887" fetchpriority="high" alt="存东西用考拉！北京仓储管家在线。东西太多没处放？考拉在京200家门店，马上预约实地或远程看仓。添加微信。"><button class="mk-home-vis-contact" type="button" aria-label="添加微信，打开在线咨询演示"></button>';
    hero.querySelector('.mk-home-vis-contact').addEventListener('click',function(){
      if(typeof openHomeHelp==='function')openHomeHelp('添加微信咨询','当前为演示：可在这里咨询门店与看仓安排；尚未建立微信会话或发送消息。');
    });
    const quick=document.createElement('nav');
    quick.id='mkHomeVisQuick';
    quick.className='mk-home-vis-quick state-new';
    quick.setAttribute('aria-label','按用途选择物品分类');
    quick.innerHTML=entries.map(item=>'<button type="button" data-focus-category="'+item.category+'" aria-label="'+item.label+'，查看'+item.detail+'分类"><img src="'+asset+item.image+'" alt="" width="88" height="88" loading="lazy"><strong>'+item.label+'</strong><small>'+item.detail+'</small></button>').join('');
    search.insertAdjacentElement('afterend',quick);
    quick.addEventListener('click',function(event){
      const button=event.target.closest('[data-focus-category]');
      if(!button)return;
      if(typeof goEstimator==='function')goEstimator({entry:'item',focusCategory:button.dataset.focusCategory});
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
