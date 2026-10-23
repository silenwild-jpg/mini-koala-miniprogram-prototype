/* EST-VIS-03: DOM-only image decoration. Deliberately does not replace
   renderScenes(), renderAmounts(), applyPreset(), or any navigation function. */
(function(){
  'use strict';
  const scenePictures={
    moving:'../assets/home-lifestyle/scenes/moving.webp',
    renovation:'../assets/home-lifestyle/scenes/renovation.webp',
    luggage:'../assets/home-lifestyle/scenes/luggage.webp',
    seasonal:'../assets/home-lifestyle/scenes/seasonal.webp',
    household:'../assets/home-lifestyle/scenes/household.webp',
    collection:'../assets/est-vis03/collection_concept.svg',
    merchant:'../assets/est-vis03/scene_merchant_placeholder.svg',
    enterprise:'../assets/est-vis03/scene_enterprise_placeholder.svg'
  };
  const itemPath=name=>'../assets/est-vis03/item_'+name+'.webp';
  const conceptPath=name=>'../assets/est-vis03/'+name+'.svg';
  const visual={
    moving:[['cardboard-box','suitcase'],['sofa-three-seat','cardboard-box'],['sofa-three-seat','fridge-standard','cardboard-box']],
    renovation:[['cardboard-box','sofa-three-seat'],['sofa-three-seat','fridge-standard'],['sofa-three-seat','fridge-standard','dining-table']],
    luggage:[['suitcase'],['suitcase','cardboard-box'],['suitcase','suitcase','cardboard-box']],
    seasonal:[['folded-duvet'],['folded-duvet','cardboard-box'],['folded-duvet','folded-duvet','cardboard-box']],
    household:[['cardboard-box'],['cardboard-box','folded-duvet'],['sofa-three-seat','cardboard-box','fridge-standard']],
    collection:[['@collection_concept'],['@collection_concept'],['@collection_concept']],
    merchant:[['@merchant_boxes'],['@merchant_shelf'],['@merchant_pallet']],
    enterprise:[['@enterprise_archive_placeholder'],['@enterprise_office_placeholder'],['@enterprise_mixed_placeholder']]
  };
  // The visual index follows DOM order, not the business ID names. IDs and
  // business data are intentionally left untouched.
  function sourceScene(){
    try{ if(typeof state !== 'undefined' && state.scene) return state.scene; }catch(e){}
    return document.querySelector('#s2 .scene.selected')?.dataset.id || '';
  }
  function decorateScenes(){
    document.querySelectorAll('#s2 .scene[data-id]').forEach(card=>{
      if(card.querySelector('.estvis03-photo'))return;
      const src=scenePictures[card.dataset.id];if(!src)return;
      const wrap=document.createElement('span');wrap.className='estvis03-photo';wrap.setAttribute('aria-hidden','true');
      const img=document.createElement('img');img.src=src;img.alt='';img.decoding='async';
      wrap.appendChild(img);card.insertBefore(wrap,card.firstChild);
    });
  }
  function decorateAmounts(){
    const scene=sourceScene();
    if(!scene||!visual[scene])return;
    document.querySelectorAll('#s3 #amountList .amount-card').forEach((card,index)=>{
      if(card.querySelector('.estvis03-amount-media'))return;
      const ids=visual[scene][index];if(!ids)return;
      const container=document.createElement('span');container.className='estvis03-amount-media';container.setAttribute('aria-hidden','true');
      ids.forEach((name,i)=>{
        const img=document.createElement('img');img.alt='';img.decoding='async';
        const diagram=name.startsWith('@');img.src=diagram?conceptPath(name.substring(1)):itemPath(name);
        img.className=diagram?'estvis03-diagram':'estvis03-part-'+i;
        container.appendChild(img);
      });
      card.insertBefore(container,card.firstChild);
    });
  }
  function render(){decorateScenes();decorateAmounts();}
  function watch(id){const node=document.getElementById(id);if(!node)return;
    new MutationObserver(render).observe(node,{childList:true});}
  watch('cScenes');watch('bScenes');watch('amountList');render();
})();
