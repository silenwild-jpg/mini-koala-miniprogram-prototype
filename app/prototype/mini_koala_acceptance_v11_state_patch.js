/* Mini Koala Acceptance Fix V1.1 / PATCH A.
 * Runtime-only additive fixes: the HTML bodies and frozen business rules stay intact.
 */
(function(){
  'use strict';
  const page=location.pathname.split('/').pop();
  const params=new URLSearchParams(location.search);

  if(page.startsWith('mini_storage_store_list_s01_')){
    const strip=document.getElementById('estimateStrip');
    const stores=document.getElementById('storeList');
    if(strip&&stores){
      const banner=document.createElement('div');
      banner.id='miniV11Soldout';
      banner.className='mini-v11-soldout';
      banner.hidden=true;
      banner.setAttribute('role','status');
      banner.setAttribute('aria-live','polite');
      banner.innerHTML='<div><strong>附近有门店已售罄</strong><p>已售罄门店不参与可租推荐，您仍可查看其他门店。</p></div><button type="button">查看详情 ›</button>';
      strip.insertAdjacentElement('afterend',banner);
      banner.querySelector('button').addEventListener('click',()=>{
        document.getElementById('inventorySecondary')?.scrollIntoView({behavior:'smooth',block:'start'});
      });
      function update(){
        const sold=stores.ownerDocument.querySelector('#inventoryStatusList .inventory-status-card[data-id="MK_BJ_F2215896"][data-status="SOLD_OUT"]');
        const show=params.get('inventoryScenario')==='soldout'&&document.body.classList.contains('v274-browse-state')&&!!sold;
        banner.hidden=!show;
        if(show)banner.querySelector('strong').textContent=`${sold.querySelector('.inventory-status-name')?.textContent?.split(' · ')[0]||'附近门店'}已售罄`;
        // A recovery banner must describe the actually rendered filtered results,
        // not unfiltered fixture rows with different travel-time calculations.
        const recovery=document.getElementById('distanceRecoveryCard');
        if(recovery&&!recovery.classList.contains('hidden')&&typeof window.filteredOrder==='function'){
          const ids=window.filteredOrder();
          const title=document.getElementById('distanceRecoveryTitle');
          const desc=document.getElementById('distanceRecoveryDesc');
          if(ids.length){
            const nearest=Math.min(...ids.map(id=>window.routeFor(id).m));
            title.textContent='已扩大门店查找范围';
            desc.textContent=`当前筛选结果中，最近门店${window.travelMeta().label}约 ${nearest} 分钟。可继续比较空间和价格。`;
          }else{
            title.textContent='扩大范围后暂未找到符合条件的门店';
            desc.textContent='可以调整空间需求或门店筛选条件，继续查找可租仓位。';
          }
        }
        const nomatchCopy=document.getElementById('nomatchBody');
        if(nomatchCopy&&window.__s01ZeroMatch){
          const hasReference=!!stores.querySelector('.store[data-id]');
          nomatchCopy.textContent=hasReference
            ?'可比较下方实体门店的容量取舍方案，或调整需求、查看考拉E存。'
            :'暂时没有可展示的实体门店参考方案。建议调整需求，或咨询客服继续查找。';
        }
      }
      const observer=new MutationObserver(update);
      observer.observe(stores,{childList:true});
      const secondary=document.getElementById('inventorySecondary');
      if(secondary)observer.observe(secondary,{attributes:true,attributeFilter:['class']});
      update();
    }
  }

  if(page.startsWith('mini_storage_quote_q01_')){
    let saved={};
    try{saved=JSON.parse(localStorage.getItem('mini_storage_quote_current')||'{}')}catch(_err){}
    const matching=String(saved.store_id||'')===String(params.get('store')||'')
      &&Number(saved.term_months)===Number(params.get('term')||6)
      &&String(saved.unit_id||'')===String(params.get('unit')||'');
    const staleByTime=matching&&saved.valid_until&&Number.isFinite(Date.parse(saved.valid_until))&&Date.parse(saved.valid_until)<=Date.now();
    if(params.get('quoteStatus')==='expired'||(params.get('quoteStatus')==='active'&&staleByTime)){
      const hero=document.querySelector('.hero'),edit=document.getElementById('edit'),save=document.getElementById('save');
      if(hero&&edit&&save){
        document.body.classList.add('mini-v11-quote-expired');
        const banner=document.createElement('div');
        banner.className='mini-v11-expired-banner';
        banner.id='quoteExpiredNotice'; // H01-007-S3 D-07
        banner.setAttribute('role','status');
        banner.innerHTML='<b>方案已超过 48 小时参考期</b>原方案金额仅供查看。请重新获取当前报价：系统会按当前价格、优惠和可租情况重新核对，如有变化，需要您确认后才会继续下单。';
        hero.insertBefore(banner,hero.querySelector('.summary'));
        const role=document.getElementById('quoteRoleLabel');if(role)role.textContent='报价需重新确认';
        edit.textContent='重新获取报价';
        save.disabled=true;
        edit.onclick=function(){
          const next=new URLSearchParams();
          for(const key of ['store','unit','sizeOption','representativeUnit','actualUnit','target','term','customer','start','fromS01State','s02State','searchOriginKey']){
            const val=params.get(key);if(val)next.set(key,val);
          }
          next.set('source','q01_quote_expired');
          // H01-007-S3 D-07: U01 compares the fresh price with this saved quote and asks for confirmation when it changed.
          next.set('requote','1');next.set('quoteId',String(saved.quote_id||params.get('quoteId')||''));
          // Do not carry the stale monetary snapshot into the unit repricing flow.
          localStorage.removeItem('mini_storage_price_snapshot_current');
          location.href='mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html?'+next.toString();
        };
      }
    }
  }

  if(page.startsWith('space_decision_assistant_')){
    const actions=document.getElementById('usageActions');
    if(actions){
      const update=()=>{
        const button=actions.querySelector('#usageChooseBtn');
        if(button&&actions.dataset.actionState==='term-required'){
          button.classList.add('secondary','term-required-action');
          button.setAttribute('type','button');
          if(button.textContent!=='先选择租期 ›')button.textContent='先选择租期 ›';
        }else if(button){
          button.classList.remove('secondary','term-required-action');
        }
      };
      new MutationObserver(update).observe(actions,{childList:true});
      update();
    }
  }
})();
