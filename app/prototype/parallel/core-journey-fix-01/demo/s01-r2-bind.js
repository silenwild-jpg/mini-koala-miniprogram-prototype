/* VIS-REBUILD-03B: DOM-only R2 binding. No legacy S01 CSS/HTML imports. */
(function(){
  'use strict';
  const masters=Array.from(document.querySelectorAll('.store-card')).map(n=>n.cloneNode(true));
  const stage=document.querySelector('.stores');
  const priceCss=document.createElement('link');priceCss.rel='stylesheet';priceCss.href='s01-r2-price-surface.css';document.head.append(priceCss);
  const visualCss=document.createElement('link');visualCss.rel='stylesheet';visualCss.href='s01-vis-decision-02.css?v=20261111';document.head.append(visualCss);
  const bridge=window.parent!==window?window.parent.SIM_DEMO?.s01R2Bridge:null;
  if(!bridge||!stage||masters.length!==2){document.documentElement.dataset.binding='UNAVAILABLE';return;}
  const setText=(el,v)=>{if(el)el.textContent=String(v??'');};
  // RESTORE: the visible search field and inline filter controls must stay in the
  // signed S01 surface, not hide behind a static phone-frame reconstruction.
  const panel=document.querySelector('#s01-inline-panel');
  // Keep the filter row and its dropdown attached during native page scrolling.
  const filterRow=document.querySelector('.filters');
  const filterAnchor=document.createElement('div');filterAnchor.className='s01-filter-anchor';
  filterRow.before(filterAnchor);filterAnchor.append(filterRow,panel);
  // VIS-REFINE-04: main filters first, lightweight quick filters second,
  // contextual capacity estimate third, then physical store list.
  // Reparent existing nodes; never build an additional visual container.
  const quickRow=document.querySelector('.s01-quick');
  const demandRow=document.querySelector('.s01-context');
  if(quickRow&&demandRow)quickRow.after(demandRow);
  let openIndex=-1;
  const serviceOptions=['近地铁','24小时存取','电梯直达','停车便利','控温防潮','小推车','全天监控'];
  const esc=v=>String(v).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  const choice=(name,value,active,attr)=>'<button type="button" class="s01-choice" '+attr+'="'+esc(value)+'" aria-pressed="'+(active?'true':'false')+'">'+esc(name)+'</button>';
  function closePanel(){
    openIndex=-1;panel.hidden=true;panel.replaceChildren();document.body.classList.remove('s01-panel-open');
    document.querySelectorAll('.filter').forEach(n=>n.setAttribute('aria-expanded','false'));
  }
  function renderPanel(){
    if(openIndex<0)return;
    const a=bridge.snapshot();let content='';
    if(openIndex===0){
      content='<div class="s01-choice-list">'
        +[['recommended','综合排序'],['distance','距离优先'],['price','价格优先']].map(([v,label])=>choice(label,v,a.filterLabels[0]===label||(v==='recommended'&&a.filterLabels[0]==='排序'),'data-sort')).join('')
        +'</div>';
    }else if(openIndex===1){
      const items=a.distanceFilterEnabled?[[0,'不限距离'],[1,'1km内'],[3,'3km内'],[5,'5km内'],[10,'10km内']]:[];
      content='<p class="s01-panel-note">'+(a.distanceFilterEnabled?'选择距离范围':'暂不可筛选距离')+'</p>'
        +(items.length?'<div class="s01-choice-list">'+items.map(([v,label])=>choice(label,v,(a.maxKm===null?v===0:Number(a.maxKm)===v),'data-radius')).join('')+'</div>':'');
    }else{
      content='<div class="s01-choice-list">'
        +serviceOptions.map(v=>'<label class="s01-choice"><input type="checkbox" name="s01-service" value="'+esc(v)+'" '+(a.servicesSelected.includes(v)?'checked':'')+'> '+esc(v)+'</label>').join('')
        +'</div><div class="s01-panel-actions"><button type="button" data-clear-service>清除</button><button type="button" class="apply" data-apply-service>确认筛选</button></div>';
    }
    panel.innerHTML=content;panel.hidden=false;document.body.classList.add('s01-panel-open');
    document.querySelectorAll('.filter').forEach((n,i)=>n.setAttribute('aria-expanded',String(i===openIndex)));
  }
  function togglePanel(index){if(openIndex===index){closePanel();return;}openIndex=index;renderPanel();}
  panel.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-sort')){closePanel();bridge.setSort(b.dataset.sort);}
    else if(b.hasAttribute('data-radius')){closePanel();bridge.setRadius(Number(b.dataset.radius)||null);}
    else if(b.hasAttribute('data-clear-service')){closePanel();bridge.setServices([]);}
    else if(b.hasAttribute('data-apply-service')){const values=Array.from(panel.querySelectorAll('input[name="s01-service"]:checked')).map(x=>x.value);closePanel();bridge.setServices(values);}
  });
  document.querySelector('.s01-city')?.addEventListener('click',()=>bridge.action('city'));
  document.querySelector('.s01-edit')?.addEventListener('click',()=>bridge.editDemand());
  document.querySelector('#s01-search')?.addEventListener('focus',()=>{if(openIndex>=0)closePanel();});
  document.querySelector('#s01-search')?.addEventListener('input',e=>{
    if(openIndex>=0)closePanel();
    bridge.search(e.target.value);
  });
  document.querySelectorAll('[data-quick]').forEach(b=>b.addEventListener('click',()=>bridge.setQuick(b.dataset.quick)));
  document.querySelector('#s01-more')?.addEventListener('click',()=>bridge.loadMore());
  document.addEventListener('click',e=>{if(openIndex>=0&&!e.target.closest('.filters, #s01-inline-panel'))closePanel();});

  function setUnit(el,u){
    if(!u){el.hidden=true;el.dataset.unitId='';return;}
    el.hidden=false;el.dataset.unitId=u.id;
    const capacity=el.querySelector('.capacity');
    capacity.firstChild.nodeValue=u.volume+'m';
    setText(capacity.querySelector('sup'),'3');
    const priceBox=el.querySelector('.price');
    priceBox.dataset.priceKind=u.priceKind;
    const mainAmount=priceBox.querySelector('strong');
    setText(mainAmount,u.price);
    setText(priceBox.querySelector(':scope > span:not(.s01-term-discount)'),u.suffix);
    // A single, low-contrast lease-term factor sits beside the total.
    // Never synthesize a struck-through "original price".
    let discountTag=priceBox.querySelector('.s01-term-discount');
    if(!discountTag){
      discountTag=document.createElement('span');
      discountTag.className='s01-term-discount';
      mainAmount.after(discountTag);
    }
    const termDiscount=u.priceKind==='term'&&u.termDiscountSource==='LEASE_TERM_RULE'?u.termDiscountLabel:null;
    setText(discountTag,termDiscount||'');
    discountTag.hidden=!termDiscount;
    if(termDiscount)discountTag.setAttribute('aria-label','租期优惠 '+termDiscount);
    else discountTag.removeAttribute('aria-label');
    let secondary=priceBox.querySelector('.price-secondary');
    if(!secondary){secondary=document.createElement('small');secondary.className='price-secondary';priceBox.append(secondary);}
    setText(secondary,u.secondary);secondary.hidden=!u.secondary;
    priceBox.setAttribute('aria-label',u.priceKind==='term'?'整期租金 '+u.price+'；'+u.secondary+(termDiscount?'；租期优惠'+termDiscount:'')+'；押金和管理费另计':u.priceKind==='unit_month'?u.price+' 每月，'+u.secondary:u.price+' 每月起');
    setText(el.querySelector('.unit-desc'),u.usage);
    const promo=el.querySelector('.hot');if(promo){promo.hidden=!u.promo;setText(promo,u.promo);}
    const btn=el.querySelector('.order');if(btn){
      btn.dataset.unitId=u.id;
      btn.setAttribute('role','button');btn.tabIndex=u.available?0:-1;
      btn.setAttribute('aria-disabled',u.available?'false':'true');
      setText(btn,u.available?'立即下单':'暂不可租');
      btn.style.opacity=u.available?'1':'0.56';
    }
  }
  function fill(card,s){
    card.dataset.storeId=s.id;card.dataset.source='CENTRAL_RC1';
    const photo=card.querySelector('.store-photo');
    photo.onerror=null;
    photo.onerror=()=>{photo.onerror=null;if(s.photoFallback)photo.src=s.photoFallback;};
    photo.src=s.photo;
    photo.alt=s.photoOrigin?.includes('NOT_PHYSICAL_STORE_VERIFIED')?'迷你考拉仓门店环境示例照片，具体门店归属待核实':s.name+'门店环境';
    photo.dataset.assetOrigin=s.photoOrigin||'LEGACY_DEMO';
    setText(card.querySelector('h2'),s.name);card.querySelector('h2').title=s.name;
    const tags=Array.from(card.querySelectorAll('.store-tags span'));
    tags.forEach((tag,i)=>{tag.hidden=!s.services[i];setText(tag,s.services[i]||'');});
    card.querySelector('.store-tags').style.visibility=s.services.length?'visible':'hidden';
    const address=card.querySelector('.address-copy');setText(address,s.address);address.title=s.address;
    const distance=card.querySelector('.km');setText(distance,s.distance);distance.hidden=!s.distance;distance.dataset.verified=String(!!s.distanceVerified);if(s.distance)distance.setAttribute('aria-label','距离约'+s.distance);else distance.removeAttribute('aria-label');
    let publicRate=card.querySelector('.store-cubic-price');
    if(!publicRate){publicRate=document.createElement('div');publicRate.className='store-cubic-price';card.querySelector('.address').after(publicRate);}
    publicRate.hidden=!s.publicCubicPrice;
    if(s.publicCubicPrice){setText(publicRate,'门店低至 '+s.publicCubicPrice+'/m³/月');publicRate.setAttribute('aria-label','门店最低每立方米月租 '+s.publicCubicPrice+'，'+s.publicCubicTerm+'个月租期');}
    card.querySelectorAll('.unit').forEach((el,i)=>setUnit(el,i===0?s.units[0]:null));
    const details=document.createElement('button');
    details.className='s01-store-detail';details.type='button';
    details.setAttribute('aria-label','查看'+s.name+'门店详情');details.textContent='›';
    card.append(details);
    card.querySelector('.units').hidden=!s.units.length;
    card.classList.toggle('r2-no-available',!s.units.length);
  }
  // Positions 1–2 retain the approved expanded store master. Position 3 is the
  // permanent E-storage operating slot. Later stores use a compact, clickable row.
  // Keep the PR #85 shared store/unit IDs and click paths, but render the PR #81
  // approved native-width photo-row structure for operating slot 3 and cards 4+.
  function estoreCard(){
    const article=document.createElement('article');
    article.className='s01-estore-card';
    article.dataset.cardRank='3';
    article.dataset.cardKind='estore';
    article.dataset.service='estore';
    article.innerHTML='<img class="s01-estore-photo" src="br04/s5/assets/estore-existing-scene.webp" alt="考拉E存上门取送服务">'+
      '<div class="s01-estore-copy"><span class="s01-estore-kicker">上门取送</span>'+
      '<strong class="s01-estore-name">考拉E存</strong>'+
      '<button type="button" class="s01-estore-cta">了解服务 ›</button></div>';
    const photo=article.querySelector('img');
    photo.onerror=()=>{photo.onerror=null;photo.src='assets/brand_corridor_cropped.png';};
    return article;
  }
  function compactStore(s,rank,showPublicPrice=true){
    const article=document.createElement('article');
    article.className='store-card s01-compact s01-compact-store';
    article.dataset.storeId=s.id;
    article.dataset.cardRank=String(rank);
    article.dataset.cardKind='compact';
    article.dataset.presentation='compact-direct';
    article.setAttribute('role','button');
    article.setAttribute('tabindex','0');
    article.setAttribute('aria-label','查看'+s.name+'的门店详情，整卡可点击');
    const photo=document.createElement('img');
    photo.className='store-photo s01-compact-photo';
    photo.src=s.photo;
    photo.alt=s.name+'门店环境';
    photo.loading='lazy';
    photo.onerror=()=>{photo.onerror=null;if(s.photoFallback)photo.src=s.photoFallback;};
    const info=document.createElement('div');info.className='store-body s01-compact-info';
    const name=document.createElement('h2');name.textContent=s.name;info.append(name);
    const tags=document.createElement('div');tags.className='store-tags s01-compact-tags';
    (s.services||[]).slice(0,2).forEach(v=>{const el=document.createElement('span');el.textContent=v;tags.append(el);});
    info.append(tags);
    const address=document.createElement('div');address.className='address';
    const addrText=document.createElement('span');addrText.className='address-copy';addrText.textContent=s.address||'';
    addrText.title=s.address||'';
    addrText.setAttribute('aria-label',s.address||'');
    address.append(addrText);
    if(s.distance){const distance=document.createElement('span');distance.className='km';distance.textContent=s.distance;distance.dataset.verified=String(!!s.distanceVerified);address.append(distance);}
    info.append(address);
    const side=document.createElement('div');side.className='s01-compact-side';
    // In browsing mode, use the same public per-m³ source as H01.
    // In matching mode, compact store #4+ only opens S02 and never
    // substitutes an unrelated unit price for the first two matched offers.
    if(showPublicPrice&&s.publicCubicPrice){
      const price=document.createElement('strong');price.textContent=s.publicCubicPrice;side.append(price);
      const suffix=document.createElement('small');suffix.textContent='/m³/月起';side.append(suffix);
      side.setAttribute('aria-label','门店最低每立方米月租 '+s.publicCubicPrice+'，'+s.publicCubicTerm+'个月价格口径');
    }
    const arrow=document.createElement('span');arrow.className='s01-compact-arrow';
    arrow.textContent='›';arrow.setAttribute('aria-hidden','true');side.append(arrow);
    info.append(side);
    article.append(photo,info);
    return article;
  }
  function render(){
    const state=bridge.snapshot();
    document.documentElement.dataset.binding='CENTRAL_RC1';
    document.documentElement.dataset.source=state.sourceNamespace;
    document.documentElement.dataset.verifiedDistance=String(state.distanceVerified);
    document.documentElement.dataset.matchMode=state.matched?'matched':'browse';
    const nodes=[];
    const hasAvailable=state.stores.some(store=>store.units?.length);
    const noMatch=!state.stores.length||(state.matched&&!hasAvailable);
    if(noMatch){
      const empty=document.createElement('section');
      empty.className='s01-empty-state';empty.setAttribute('role','status');
      const title=!state.stores.length?'暂无符合条件的门店':'当前需求暂无可租仓位';
      empty.innerHTML='<h2>'+title+'</h2><p>顾问可协助寻找合适仓位</p>'+
        '<button type="button" class="s01-advisor-cta" data-s01-advisor>顾问帮我找仓</button>'+
        '<button type="button" class="s01-reset-cta" data-s01-clear>清除筛选</button>';
      nodes.push(empty,estoreCard());
    }else{
      state.stores.forEach((store,i)=>{
        if(i===2)nodes.push(estoreCard());
        if(state.matched&&i<2){
          const card=masters[i].cloneNode(true);
          fill(card,store);card.dataset.cardRank=String(i+1);card.dataset.cardKind='expanded';card.dataset.presentation='expanded-one';
          nodes.push(card);
        }else{
          // All physical stores share one flat compact surface when no
          // committed capacity + term pair exists. E-storage remains slot 3.
          nodes.push(compactStore(store,i<2?i+1:i+2,!state.matched));
        }
      });
      if(state.stores.length<=2)nodes.push(estoreCard());
    }
    stage.replaceChildren(...nodes);
    document.querySelectorAll('.filter').forEach((n,i)=>{
      n.firstChild.nodeValue=state.filterLabels[i]+' ';
      n.setAttribute('aria-label',state.filterLabels[i]);
      n.setAttribute('aria-pressed',String(!!state.filterActive?.[i]));
    });
    // Restore historical city, search, demand, quick filters and all-store discovery.
    setText(document.querySelector('.s01-city'),state.city+' ▾');
    const query=document.querySelector('#s01-search');
    if(query&&document.activeElement!==query)query.value=state.keyword||'';
    setText(document.querySelector('.s01-context-text'),state.matched?'已选需求：'+state.requirement.capacity+'m³ · '+state.requirement.term+'个月':'不确定用多大仓？');
    setText(document.querySelector('.s01-edit'),state.matched?'修改需求':'立即估算');
    const contextualReturn=document.querySelector('.s01-return-recommend');
    if(contextualReturn)contextualReturn.hidden=!state.canReturnToS5;
    setText(document.querySelector('.s01-result-summary'),'共'+state.storeCount+'家门店'+(state.storeCount>state.visibleStoreCount?' · 已显示前'+state.visibleStoreCount+'家':''));
    const more=document.querySelector('#s01-more');more.hidden=noMatch||!state.canLoadMore;
    document.querySelectorAll('[data-quick]').forEach(b=>b.setAttribute('aria-pressed',String(state.quickSelected.includes(b.dataset.quick))));
  }
  stage.addEventListener('click',e=>{
    if(e.target.closest('[data-s01-advisor]')){bridge.action('advisor');return;}
    if(e.target.closest('[data-s01-clear]')){bridge.clearFilters();return;}
    if(e.target.closest('.s01-estore-card')){bridge.action('estore');return;}
    const order=e.target.closest('.order');
    if(order){if(order.getAttribute('aria-disabled')==='true')return;bridge.action('choose',order.dataset.unitId);return;}
    const detail=e.target.closest('.s01-store-detail');if(detail){bridge.action('store',detail.closest('.store-card').dataset.storeId);return;}
    const card=e.target.closest('.store-card');if(card)bridge.action('store',card.dataset.storeId);
  });
  stage.addEventListener('keydown',e=>{
    if(!['Enter',' '].includes(e.key))return;
    const compact=e.target.closest('.s01-compact-store');
    if(compact){e.preventDefault();bridge.action('store',compact.dataset.storeId);return;}
    const estore=e.target.closest('.s01-estore-cta');
    if(estore){e.preventDefault();bridge.action('estore');return;}
    const order=e.target.closest('.order');
    if(order){e.preventDefault();if(order.getAttribute('aria-disabled')!=='true')bridge.action('choose',order.dataset.unitId);}
  });
  document.querySelector('.s01-return-recommend')?.addEventListener('click',()=>bridge.action('returnRecommend'));
  document.querySelectorAll('.filter').forEach((n,i)=>{
    n.setAttribute('role','button');n.tabIndex=0;
    const action=()=>togglePanel(i);
    n.addEventListener('click',action);
    n.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action();}});
  });
  window.S01_R2_REFRESH=()=>{render();if(openIndex>=0)renderPanel();};render();
  // Re-entering a top-level tab from S02 keeps the user's list position.
  const lastScroll=Number(sessionStorage.getItem('mk_s01_scroll_top_v1'))||0;
  if(lastScroll>0)requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo(0,lastScroll)));
})();
