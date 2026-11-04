/* VIS-REBUILD-03B: DOM-only R2 binding. No legacy S01 CSS/HTML imports. */
(function(){
  'use strict';
  const masters=Array.from(document.querySelectorAll('.store-card')).map(n=>n.cloneNode(true));
  const stage=document.querySelector('.stores');
  const bridge=window.parent!==window?window.parent.SIM_DEMO?.s01R2Bridge:null;
  if(!bridge||!stage||masters.length!==2){document.documentElement.dataset.binding='UNAVAILABLE';return;}
  const setText=(el,v)=>{if(el)el.textContent=String(v??'');};
  // RESTORE: the visible search field and inline filter controls must stay in the
  // signed S01 surface, not hide behind a static phone-frame reconstruction.
  const panel=document.querySelector('#s01-inline-panel');
  let openIndex=-1;
  const serviceOptions=['近地铁','24小时存取','电梯直达','停车便利','控温防潮','小推车','全天监控'];
  const esc=v=>String(v).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  const choice=(name,value,active,attr)=>'<button type="button" class="s01-choice" '+attr+'="'+esc(value)+'" aria-pressed="'+(active?'true':'false')+'">'+esc(name)+'</button>';
  function closePanel(){
    openIndex=-1;panel.hidden=true;panel.replaceChildren();
    document.querySelectorAll('.filter').forEach(n=>n.setAttribute('aria-expanded','false'));
  }
  function renderPanel(){
    if(openIndex<0)return;
    const a=bridge.snapshot();let content='';
    if(openIndex===0){
      content='<p class="s01-panel-note">门店排序</p><div class="s01-choice-list">'
        +[['recommended','综合排序'],['distance','距离优先'],['price','价格优先']].map(([v,label])=>choice(label,v,a.filterLabels[0]===label||(v==='recommended'&&a.filterLabels[0]==='排序'),'data-sort')).join('')
        +'</div>';
    }else if(openIndex===1){
      const items=a.distanceFilterEnabled?[[0,'不限距离'],[1,'1km内'],[3,'3km内'],[5,'5km内'],[10,'10km内']]:[];
      content='<p class="s01-panel-note">'+(a.distanceFilterEnabled?'选择距离范围':'暂不可筛选距离')+'</p>'
        +(items.length?'<div class="s01-choice-list">'+items.map(([v,label])=>choice(label,v,(a.maxKm===null?v===0:Number(a.maxKm)===v),'data-radius')).join('')+'</div>':'');
    }else{
      content='<p class="s01-panel-note">可多选服务；确认后更新门店列表</p><div class="s01-choice-list">'
        +serviceOptions.map(v=>'<label class="s01-choice"><input type="checkbox" name="s01-service" value="'+esc(v)+'" '+(a.servicesSelected.includes(v)?'checked':'')+'> '+esc(v)+'</label>').join('')
        +'</div><div class="s01-panel-actions"><button type="button" data-clear-service>清除</button><button type="button" class="apply" data-apply-service>确认筛选</button></div>';
    }
    panel.innerHTML=content;panel.hidden=false;
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
  document.querySelector('#s01-search')?.addEventListener('input',e=>bridge.search(e.target.value));
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
    setText(priceBox.querySelector('strong'),u.price);
    setText(priceBox.querySelector('span'),u.suffix);
    let secondary=priceBox.querySelector('.price-secondary');
    if(!secondary){secondary=document.createElement('small');secondary.className='price-secondary';priceBox.append(secondary);}
    setText(secondary,u.secondary);secondary.hidden=!u.secondary;
    priceBox.setAttribute('aria-label',u.priceKind==='term'?u.price+' 整期租金，'+u.secondary:u.price+' 每月起');
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
    card.querySelectorAll('.unit').forEach((el,i)=>setUnit(el,s.units[i]));
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
    article.innerHTML='<img class="s01-estore-photo" src="br04/s5/assets/estore-existing-scene.webp" alt="考拉E存上门取送服务">'+
      '<div class="s01-estore-copy"><span class="s01-estore-kicker">上门取送</span>'+
      '<strong class="s01-estore-name">考拉E存</strong>'+
      '<button type="button" class="s01-estore-cta">了解服务 ›</button></div>';
    const photo=article.querySelector('img');
    photo.onerror=()=>{photo.onerror=null;photo.src='assets/brand_corridor_cropped.png';};
    return article;
  }
  function compactStore(s,rank){
    const article=document.createElement('article');
    article.className='store-card s01-compact s01-compact-store';
    article.dataset.storeId=s.id;
    article.dataset.cardRank=String(rank);
    article.dataset.cardKind='compact';
    article.dataset.presentation='compact-direct';
    article.setAttribute('role','button');
    article.setAttribute('tabindex','0');
    article.setAttribute('aria-label','查看'+s.name+'的门店详情');
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
    address.append(addrText);
    if(s.distance){const distance=document.createElement('span');distance.className='km';distance.textContent=s.distance;distance.dataset.verified=String(!!s.distanceVerified);address.append(distance);}
    info.append(address);
    const side=document.createElement('div');side.className='s01-compact-side';
    const first=s.units?.[0];
    if(first){
      const price=document.createElement('strong');price.textContent=first.price;side.append(price);
      const suffix=document.createElement('small');suffix.textContent=first.suffix||'';side.append(suffix);
    }
    const arrow=document.createElement('span');arrow.className='s01-compact-arrow';arrow.textContent='查看门店 ›';side.append(arrow);
    info.append(side);
    article.append(photo,info);
    return article;
  }
  function render(){
    const state=bridge.snapshot();
    document.documentElement.dataset.binding='CENTRAL_RC1';
    document.documentElement.dataset.source=state.sourceNamespace;
    document.documentElement.dataset.verifiedDistance=String(state.distanceVerified);
    const nodes=[];
    state.stores.forEach((store,i)=>{
      if(i===2)nodes.push(estoreCard());
      if(i<2){
        const card=masters[i].cloneNode(true);
        fill(card,store);card.dataset.cardRank=String(i+1);card.dataset.cardKind='expanded';
        nodes.push(card);
      }else nodes.push(compactStore(store,i+2));
    });
    // No store listings still offer the operating service, without inventing stores.
    if(state.stores.length<=2)nodes.push(estoreCard());
    if(!state.stores.length){
      const empty=document.createElement('p');empty.setAttribute('role','status');
      empty.textContent='未找到匹配门店，请调整搜索或筛选条件';
      nodes.unshift(empty);
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
    setText(document.querySelector('.s01-context-text'),state.requirement.capacity===null?'未填写容量需求，可直接找仓':'已选需求：'+state.requirement.capacity+'m³ · '+(state.requirement.term?state.requirement.term+'个月':'租期待选'));
    setText(document.querySelector('.s01-edit'),state.requirement.capacity===null?'估算大小':'修改需求');
    setText(document.querySelector('.s01-result-summary'),'共'+state.storeCount+'家门店'+(state.storeCount>state.visibleStoreCount?' · 已显示前'+state.visibleStoreCount+'家':''));
    const more=document.querySelector('#s01-more');more.hidden=!state.canLoadMore;
    document.querySelectorAll('[data-quick]').forEach(b=>b.setAttribute('aria-pressed',String(state.quickSelected.includes(b.dataset.quick))));
  }
  stage.addEventListener('click',e=>{
    if(e.target.closest('.s01-estore-card')){bridge.action('estore');return;}
    const order=e.target.closest('.order');
    if(order){if(order.getAttribute('aria-disabled')==='true')return;bridge.action('choose',order.dataset.unitId);return;}
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
  document.querySelector('.nav-back')?.addEventListener('click',()=>bridge.action('home'));
  document.querySelector('.nav-target')?.addEventListener('click',()=>bridge.action('city'));
  document.querySelector('.nav-more')?.addEventListener('click',()=>bridge.action('searchModal'));
  document.querySelectorAll('.filter').forEach((n,i)=>{
    n.setAttribute('role','button');n.tabIndex=0;
    const action=()=>togglePanel(i);
    n.addEventListener('click',action);
    n.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action();}});
  });
  for(const [selector,label] of [['.nav-back','返回首页'],['.nav-target','切换城市'],['.nav-more','搜索门店']]){
    const n=document.querySelector(selector);n.removeAttribute('aria-hidden');
    n.setAttribute('role','button');n.setAttribute('aria-label',label);n.tabIndex=0;
    n.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();n.click();}});
  }
  window.S01_R2_REFRESH=()=>{render();if(openIndex>=0)renderPanel();};render();
})();
