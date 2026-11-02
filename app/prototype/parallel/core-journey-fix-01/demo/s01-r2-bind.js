/* VIS-REBUILD-03B: DOM-only R2 binding. No legacy S01 CSS/HTML imports. */
(function(){
  'use strict';
  const masters=Array.from(document.querySelectorAll('.store-card')).map(n=>n.cloneNode(true));
  const stage=document.querySelector('.stores');
  const bridge=window.parent!==window?window.parent.SIM_DEMO?.s01R2Bridge:null;
  if(!bridge||!stage||masters.length!==2){document.documentElement.dataset.binding='UNAVAILABLE';return;}
  const setText=(el,v)=>{if(el)el.textContent=String(v??'');};
  function setUnit(el,u){
    if(!u){el.hidden=true;el.dataset.unitId='';return;}
    el.hidden=false;el.dataset.unitId=u.id;
    const capacity=el.querySelector('.capacity');
    capacity.firstChild.nodeValue=u.volume+'m';
    setText(capacity.querySelector('sup'),'3');
    setText(el.querySelector('.price strong'),u.price);
    setText(el.querySelector('.price span'),u.suffix);
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
    photo.src=s.photo;
    photo.alt=s.name+'门店环境';
    photo.dataset.assetOrigin='A_APPROVED_PROTOTYPE_CONTENT';
    setText(card.querySelector('h2'),s.name);card.querySelector('h2').title=s.name;
    const tags=Array.from(card.querySelectorAll('.store-tags span'));
    tags.forEach((tag,i)=>{tag.hidden=!s.services[i];setText(tag,s.services[i]||'');});
    card.querySelector('.store-tags').style.visibility=s.services.length?'visible':'hidden';
    const address=card.querySelector('.address-copy');setText(address,s.address);address.title=s.address;
    setText(card.querySelector('.km'),s.distance);
    card.querySelectorAll('.unit').forEach((el,i)=>setUnit(el,s.units[i]));
    card.querySelector('.units').hidden=!s.units.length;
    card.classList.toggle('r2-no-available',!s.units.length);
  }
  function render(){
    const state=bridge.snapshot();
    document.documentElement.dataset.binding='CENTRAL_RC1';
    document.documentElement.dataset.source=state.sourceNamespace;
    document.documentElement.dataset.verifiedDistance=String(state.distanceVerified);
    const existing=Array.from(stage.querySelectorAll('.store-card'));
    while(existing.length<state.stores.length){
      const clone=masters[existing.length%2].cloneNode(true);
      stage.append(clone);existing.push(clone);
    }
    stage.querySelector('[role="status"]')?.remove();
    existing.forEach((card,i)=>i>=state.stores.length?card.remove():fill(card,state.stores[i]));
    if(!state.stores.length){
      const empty=document.createElement('p');empty.setAttribute('role','status');
      empty.textContent='未找到匹配门店，请调整搜索或筛选条件';stage.append(empty);
    }
    document.querySelectorAll('.filter').forEach((n,i)=>{
      n.firstChild.nodeValue=state.filterLabels[i]+' ';
      n.setAttribute('aria-label',state.filterLabels[i]);
      n.setAttribute('aria-pressed',String(!!state.filterActive?.[i]));
    });
    if(typeof scaleApprovedReference==='function')scaleApprovedReference();
  }
  stage.addEventListener('click',e=>{
    const order=e.target.closest('.order');
    if(order){if(order.getAttribute('aria-disabled')==='true')return;bridge.action('choose',order.dataset.unitId);return;}
    const card=e.target.closest('.store-card');if(card)bridge.action('store',card.dataset.storeId);
  });
  stage.addEventListener('keydown',e=>{
    if(!['Enter',' '].includes(e.key))return;
    const order=e.target.closest('.order');
    if(order){e.preventDefault();if(order.getAttribute('aria-disabled')!=='true')bridge.action('choose',order.dataset.unitId);}
  });
  document.querySelector('.nav-back')?.addEventListener('click',()=>bridge.action('home'));
  document.querySelector('.nav-target')?.addEventListener('click',()=>bridge.action('city'));
  document.querySelector('.nav-more')?.addEventListener('click',()=>bridge.action('searchModal'));
  document.querySelectorAll('.filter').forEach((n,i)=>{
    n.setAttribute('role','button');n.tabIndex=0;
    const action=()=>bridge.filter(i);
    n.addEventListener('click',action);
    n.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action();}});
  });
  for(const [selector,label] of [['.nav-back','返回首页'],['.nav-target','切换城市'],['.nav-more','搜索门店']]){
    const n=document.querySelector(selector);n.removeAttribute('aria-hidden');
    n.setAttribute('role','button');n.setAttribute('aria-label',label);n.tabIndex=0;
    n.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();n.click();}});
  }
  window.S01_R2_REFRESH=render;render();
})();
