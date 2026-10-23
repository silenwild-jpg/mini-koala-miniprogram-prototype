/* UNIT-COMPARE-R5A: display-only favorite/compare state. Never write quote/order/hold. */
(function(){'use strict';
  const FAV='mini_koala_unit_favorites_r5a_v1';
  const CMP='mini_koala_unit_compare_r5a_v1';
  function read(key){try{const x=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(x)?x:[]}catch(_){return []}}
  function write(key,items){try{localStorage.setItem(key,JSON.stringify(items))}catch(_){}}
  function idOf(item){return String(item.store_id||'')+'|'+String(item.unit_id||'')}
  function has(key,item){return read(key).some(x=>idOf(x)===idOf(item))}
  function toggle(key,item,max){let a=read(key),idx=a.findIndex(x=>idOf(x)===idOf(item));let on=idx<0;if(on){if(max&&a.length>=max){return {on:false,limited:true,count:a.length}}a.push(item)}else{a.splice(idx,1)}write(key,a);return {on,count:a.length}}
  function note(s){if(typeof window.toast==='function'){window.toast(s);return}let el=document.querySelector('#toast');if(el){el.textContent=s;el.style.display='block';setTimeout(()=>el.style.display='none',1800)}}
  function itemFromU01(){
    const p=new URLSearchParams(location.search);
    const displayed=document.querySelector('#unitId')?.textContent.replace(/^仓位\s*/, '').trim()||'';
    const actual=p.get('actualUnit')||(/^(暂不可租|已售出)$/.test(displayed)?'':displayed);
    return {store_id:p.get('store')||'jianguo',unit_id:actual||'',representative_unit_no:p.get('representativeUnit')||p.get('unit')||'',actual_unit_id:actual||'',size_option_id:p.get('sizeOption')||'',store_label:document.querySelector('#unitStoreName')?.textContent||'门店',volume_label:document.querySelector('#unitSize')?.textContent||'',area_label:document.querySelector('#unitArea')?.textContent||'',label:(document.querySelector('#unitStoreName')?.textContent||'门店')+' · '+(document.querySelector('#unitSize')?.textContent||'仓位'),saved_at:new Date().toISOString()};
  }
  function favoriteFromU01(){const item=itemFromU01(),p=new URLSearchParams(location.search);return {...item,unit_id:p.get('unit')||p.get('representativeUnit')||item.unit_id}}
  function comparePanel(){
    let mask=document.querySelector('#r5aCompareMask');if(mask)return mask;
    mask=document.createElement('div');mask.id='r5aCompareMask';mask.className='r5a-compare-mask';mask.hidden=true;
    mask.innerHTML='<section class="r5a-compare-sheet" role="dialog" aria-modal="true" aria-label="轻量仓位对比"><div class="r5a-compare-head"><div><b>已选仓位</b><span>最多3个，仅供浏览比较</span></div><button type="button" id="r5aCompareClose" aria-label="关闭对比">×</button></div><div id="r5aCompareItems"></div><p class="r5a-compare-note">仓位与租期费用以详情页当前信息为准。这里不会生成报价或锁仓。</p></section>';
    document.body.append(mask);
    const close=()=>{mask.hidden=true;document.body.classList.remove('r5a-compare-open')};
    mask.querySelector('#r5aCompareClose').onclick=close;
    mask.onclick=e=>{if(e.target===mask)close()};
    mask.onkeydown=e=>{if(e.key==='Escape')close()};
    return mask;
  }
  function openCompare(){
    const mask=comparePanel(),host=mask.querySelector('#r5aCompareItems');host.replaceChildren();
    const items=read(CMP).slice(0,3);
    if(!items.length){const empty=document.createElement('p');empty.textContent='还没有加入对比的仓位。可在仓位详情页选择“对比”。';host.append(empty)}
    items.forEach(item=>{
      const row=document.createElement('article');row.className='r5a-compare-row';
      const title=document.createElement('strong');title.textContent=item.label||('门店 '+item.store_id+' · 仓位 '+item.unit_id);
      const meta=document.createElement('small');meta.textContent='门店 '+item.store_id+' · 仓位 '+item.unit_id;
      const facts=document.createElement('div');facts.className='r5a-compare-facts';
      for(const [label,value] of [['容量',item.volume_label],['地面面积',item.area_label]]){if(!value)continue;const fact=document.createElement('span');fact.textContent=label+'：'+value;facts.append(fact)}
      const actions=document.createElement('div');actions.className='r5a-compare-row-actions';
      const link=document.createElement('a');const p=new URLSearchParams({store:item.store_id,unit:item.representative_unit_no||item.unit_id,source:'unit_compare'});
      if(item.actual_unit_id)p.set('actualUnit',item.actual_unit_id);
      if(item.representative_unit_no)p.set('representativeUnit',item.representative_unit_no);
      if(item.size_option_id)p.set('sizeOption',item.size_option_id);
      link.href='mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html?'+p.toString();link.textContent='查看详情';
      const remove=document.createElement('button');remove.type='button';remove.textContent='移出对比';remove.setAttribute('aria-label','移出对比：'+title.textContent);
      remove.onclick=()=>{write(CMP,read(CMP).filter(x=>idOf(x)!==idOf(item)));document.dispatchEvent(new Event('r5a-compare-change'));openCompare()};
      actions.append(link,remove);row.append(title,meta,facts,actions);host.append(row);
    });
    mask.hidden=false;document.body.classList.add('r5a-compare-open');mask.querySelector('#r5aCompareClose').focus();
  }
  function initU01(){const f=document.querySelector('#r5aFavorite'),c=document.querySelector('#r5aCompare');if(!f||!c)return;
    const render=()=>{const item=itemFromU01(),favorite=favoriteFromU01(),yes=has(FAV,favorite),cmp=has(CMP,item);f.setAttribute('aria-pressed',String(yes));c.setAttribute('aria-pressed',String(cmp));f.querySelector('span').textContent=yes?'♥':'♡';c.querySelector('span').textContent=cmp?'↔':'⇄';f.setAttribute('aria-label',yes?'取消收藏':'收藏仓位');c.setAttribute('aria-label',cmp?'查看已选仓位对比':'加入轻量对比')};
    f.onclick=()=>{const item=favoriteFromU01();if(!item.unit_id){note('当前没有可收藏的仓位');return}const r=toggle(FAV,item);render();note(r.on?'已收藏此仓位':'已取消收藏')};
    c.onclick=()=>{const item=itemFromU01();if(!item.unit_id){note('当前没有可对比的仓位');return}if(!has(CMP,item)){const r=toggle(CMP,item,3);if(r.limited){note('最多可对比3个仓位');openCompare();return}note('已加入轻量对比')}render();document.dispatchEvent(new Event('r5a-compare-change'));openCompare()};
    document.addEventListener('r5a-compare-change',render);window.addEventListener('storage',render);render();
    const home=document.querySelector('#r5aHome');if(home)home.onclick=()=>{location.href='mini_storage_home_H01_Visual_V2_7_4_SSOT.html?source=u01_home'};
    const bk=document.querySelector('#back');if(bk)bk.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();bk.click()}};
    const openContact=id=>{document.querySelector('#helpMask')?.classList.remove('show');const target=document.querySelector(id);if(target&&typeof target.click==='function'){target.click();return}note('当前客服入口仅供浏览器演示')};
    document.querySelector('#r5aPhone')?.addEventListener('click',()=>openContact('#miniSupportPhone'));
    document.querySelector('#r5aWechat')?.addEventListener('click',()=>openContact('#miniSupportChat'));
  }
  function initS02(){const cards=document.querySelector('#unitList');if(!cards)return;const params=new URLSearchParams(location.search);const store=params.get('store')||'jianguo';
    const init=()=>cards.querySelectorAll('[data-r5a-favorite]').forEach(btn=>{const item={store_id:store,unit_id:btn.dataset.r5aFavorite,label:'门店仓位 '+btn.dataset.r5aFavorite};const active=has(FAV,item);const label=active?'♥':'♡';if(btn.textContent!==label)btn.textContent=label;if(btn.getAttribute('aria-pressed')!==String(active))btn.setAttribute('aria-pressed',String(active));const aria=active?'取消收藏仓位 '+item.unit_id:'收藏仓位 '+item.unit_id;if(btn.getAttribute('aria-label')!==aria)btn.setAttribute('aria-label',aria)});
    cards.addEventListener('click',e=>{const btn=e.target.closest('[data-r5a-favorite]');if(!btn)return;e.stopPropagation();e.preventDefault();const item={store_id:store,unit_id:btn.dataset.r5aFavorite,label:'门店仓位 '+btn.dataset.r5aFavorite,saved_at:new Date().toISOString()};const r=toggle(FAV,item);init();note(r.on?'已收藏仓位':'已取消收藏')},true);
    new MutationObserver(init).observe(cards,{childList:true,subtree:true});init();
  }
  function initS5(){
    const plans=document.querySelector('#r113PlanCards');if(!plans)return;
    const dock=document.createElement('div');dock.id='r5aCompareDock';dock.className='r5a-compare-dock';dock.dataset.placement='temporary';dock.hidden=true;
    const button=document.createElement('button');button.type='button';button.onclick=openCompare;dock.append(button);plans.after(dock);
    const render=()=>{const count=read(CMP).length;dock.hidden=!(count&&plans.querySelector('.rplan'));button.textContent='已选 '+count+' 个仓位 · 轻量对比 ›'};
    new MutationObserver(render).observe(plans,{childList:true,subtree:true});
    document.addEventListener('r5a-compare-change',render);window.addEventListener('storage',render);render();
  }
  function boot(){if(document.querySelector('#r5aFavorite'))initU01();if(document.querySelector('#unitList'))initS02();if(document.querySelector('#r113PlanCards'))initS5()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.MINI_KOALA_UNIT_CHOICE_R5A={favorites:()=>read(FAV),compare:()=>read(CMP),openCompare};
})();
