(function(){
  'use strict';
  const KEY='mk_independent_sim_v1',UIKEY='mk_independent_sim_ui_v1';
  const S01_ORIGIN_KEY='mk_s01_origin_s5_v1',S01_SCROLL_KEY='mk_s01_scroll_top_v1';
  const renewalDraftByOrder=Object.create(null);
  // RC1-P1: S5 edit-demand must resolve relative to central runtime, not nested BR04 iframe.
  const CENTRAL_DEMO_BASE=new URL('.',document.currentScript.src);
  let saved;try{saved=JSON.parse(sessionStorage.getItem(KEY)||'null');}catch{}
  const core=SIM_CORE.create({state:saved}),F=SIM_FIXTURES;
  const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const I=window.SIM_ICON;
  const P=SIM_BR03_POLICY.create({core,fixture:F,config:SIM_BR03_DATA});
  const presentation=SIM_PRESENTATION.create({core,fixture:F,unitPolicy:P});
  const REC=SIM_REC_POLICY;
  const visual={keyword:'',sort:'recommended',price:'all',service:'all',category:'全部',tab:'可选仓位',gallery:0,favorites:[],storeFavorites:[]};
  try{Object.assign(visual,JSON.parse(sessionStorage.getItem('mk_visual_align_ui_v1')||'{}'));}catch{}
  const saveVisual=()=>sessionStorage.setItem('mk_visual_align_ui_v1',JSON.stringify(visual));
  // RESTORE-03: clear retired persisted price filters without changing price-based sorting.
  if(visual.price!=='all'){visual.price='all';saveVisual();}
  if(!['可选仓位','服务设施','交通路线'].includes(visual.tab))visual.tab='可选仓位';
  if(!['transit','drive','walk','bike'].includes(visual.travelMode))visual.travelMode='drive';
  // Prototype display can use stable derived distances without asserting verified geolocation.
  const demoDistanceEnabled=!!F.distanceVerified||!!F.synthetic;
  const displayedDistanceKm=s=>{
    const n=Number(s?.distance);
    if(F.distanceVerified)return Number.isFinite(n)&&n>=0?n:NaN;
    if(!F.synthetic)return NaN;
    if(Number.isFinite(n)&&n>=0)return Number((n>8?0.6+n*0.16:n).toFixed(1));
    let h=2166136261;for(const ch of String(s?.id||''))h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;
    return Number((0.7+(h%150)/20).toFixed(1));
  };
  if(!demoDistanceEnabled&&visual.sort==='distance')visual.sort='recommended';
  const categories=['全部','迷你仓','小型仓','中型仓','大型仓'];
  const category=u=>u.volume<=1.5?'迷你仓':u.volume<=5?'小型仓':u.volume<=10?'中型仓':'大型仓';
  const unitName=u=>u.name;
  const usage=u=>u.volume<=1.5?'适合：行李箱、文件与换季衣物':u.volume<=5?'适合：行李箱、换季衣物、纸箱':u.volume<=10?'适合：床垫、沙发等家居物品':'适合：搬家家具、装修暂存物品';
  const serviceTags=s=>s.serviceTags.slice(0,3);
  const money=n=>'¥'+Number(n).toLocaleString('zh-CN');
  const store=id=>r2Store(F.stores.find(s=>s.id===id)),unit=id=>F.units.find(u=>u.id===id);
  const state=()=>core.state(),persist=()=>sessionStorage.setItem(KEY,JSON.stringify(state()));
  // Shared by O03 initial render and the module-level one-second countdown updater.
  const paymentTimeLeft=deadline=>{
    const sec=Math.max(0,Math.ceil((Number(deadline)-Date.now())/1000));
    const pad=n=>String(n).padStart(2,'0');
    return {sec,label:pad(Math.floor(sec/3600))+':'+pad(Math.floor((sec%3600)/60))+':'+pad(sec%60),tone:sec<=300?'critical':sec<=1800?'warning':'normal'};
  };
  let page=new URLSearchParams(location.search).get('page')||'S01',modal=null,pending=null,notice='',lastOrder=null;
  // RESTORE-06: normalize direct and historical S01 links before the first render.
  function canonicalS01Url(){
    if(page!=='S01')return;
    const url=new URL(location.href);
    if(url.searchParams.get('s01_r2')==='1')return;
    url.searchParams.set('s01_r2','1');
    history.replaceState(history.state||{},'',url.pathname+url.search+url.hash);
  }
  canonicalS01Url();
  let displayedPage=null;
  const requestedOrderId=new URLSearchParams(location.search).get('order');
  let selectedOrderId=requestedOrderId&&state().orders.some(o=>o.id===requestedOrderId)?requestedOrderId:(sessionStorage.getItem('mk_lifecycle_selected_order_v1')||null);
  const reviewMode=new URLSearchParams(location.search).get('review')==='1';
  const lifecycleId=()=>selectedOrderId||state().orders.filter(o=>o.status==='paid_simulated').at(-1)?.id;
  let resultKind=sessionStorage.getItem('mk_sim_result_kind')||'order';
  let positions={};try{positions=JSON.parse(sessionStorage.getItem(UIKEY)||'{}');}catch{}
  // Mode is now derived from this URL; do not retain a session-wide preview flag.
  
  const r2Mode=()=>new URLSearchParams(location.search).get('s01_r2')==='1';
  const R2=window.S01_R2_CONTENT,r2Orders={};
  const r2Filters={region:'all',capacity:'all',maxKm:null,services:[],quick:[],visibleLimit:10};
  try{Object.assign(r2Filters,JSON.parse(sessionStorage.getItem('mk_s01_r2_filters_v1')||'{}'));}catch{}
  function saveR2Filters(){sessionStorage.setItem('mk_s01_r2_filters_v1',JSON.stringify(r2Filters));}
  if(!Array.isArray(r2Filters.services))r2Filters.services=[];
  if(!Array.isArray(r2Filters.quick))r2Filters.quick=[];
  // Removed by S01 latest approved rules: no retired single-unit filter, including persisted selections.
  if(r2Filters.quick.includes('single')){r2Filters.quick=r2Filters.quick.filter(x=>x!=='single');saveR2Filters();}
  if(!Number.isInteger(r2Filters.visibleLimit)||r2Filters.visibleLimit<2)r2Filters.visibleLimit=10;
  if(!Number.isFinite(Number(r2Filters.maxKm))||Number(r2Filters.maxKm)<=0||!demoDistanceEnabled)r2Filters.maxKm=null;
  if(!demoDistanceEnabled&&visual.sort==='distance'){visual.sort='recommended';saveVisual();}
  // Three-filter visual keeps hidden region/capacity restrictions retired.
  if(r2Mode()&&(r2Filters.region!=='all'||r2Filters.capacity!=='all')){r2Filters.region='all';r2Filters.capacity='all';saveR2Filters();}
  function r2View(s){
    if(!r2Orders[s.city]){
      const active=F.stores.filter(x=>x.city===s.city&&x.status==='open');
      const eligible=active.filter(x=>F.units.some(u=>u.store_id===x.id&&core.available(u)));
      const fallback=active.filter(x=>!eligible.includes(x));
      // Use the same availability-first recommendation for concept-photo slots and card order.
      r2Orders[s.city]=[...REC.rank(eligible,{distanceVerified:demoDistanceEnabled,costOf:x=>presentation.cubicReference(x)?.value??Infinity}).items,...fallback].map(x=>x.id);
    }
    const v=R2.view(s,Math.max(0,r2Orders[s.city].indexOf(s.id)));const km=displayedDistanceKm(s);
    return {...v,distance:Number.isFinite(km)?km.toFixed(1)+'km':''};
  }
  function r2Store(s){if(!s||!r2Mode()||!R2)return s;const v=r2View(s);return {...s,address:v.address,district:v.district,serviceTags:v.services,facilities:v.services,r2Photo:s.photoDetail?'assets/'+s.photoDetail:v.photo};}
  if(r2Mode()){document.documentElement.classList.add('r2-product');document.title='迷你考拉仓';}
  const phoneAuth=SIM_PHONE_AUTH.create({core,persist,onChange:()=>render(),onMessage:message=>{notice=message;render();}});
  const messages={ENTER_PHONE:'请填写有效的联系电话',PHONE_REQUIRED:'请先完成手机号验证',SELECT_TERM:'请选择租期',SELECT_CAPACITY:'请填写容量',INVALID_CAPACITY:'请输入0.5–200m³的容量，最多两位小数',INVALID_TERM:'租期请选择1–60个月的整数',UNAVAILABLE:'当前仓位不可用，请选择其他匹配门店或仓位',SELECT_DATE:'请选择有效的用仓开始日期',INVENTORY_CHANGED:'库存刚刚发生变化，当前仓位不可用。已保留容量和租期，请选择其他匹配方案。',PRICE_CHANGED:'价格刚刚发生变化，请重新查看并确认报价。',QUOTE_STALE:'报价已失效，请重新获取报价',ENTER_ADDRESS:'请填写用仓地址（不超过120字）',INVALID_STORE:'该门店不存在或不属于当前城市',NO_PHONE_REQUEST:'请先点击页面内的授权入口'};
  function act(fn){try{fn();persist();}catch(e){notice=messages[e.message]||'当前操作无法完成，请检查选择';persist();render();}}
  function remember(){
    positions[page]=$('#scroll')?.scrollTop||0;
    if(page==='S01'){
      try{
        const frame=$('#s01-r2-frame');
        const top=frame?.contentWindow?.scrollY??frame?.contentDocument?.documentElement?.scrollTop??0;
        sessionStorage.setItem(S01_SCROLL_KEY,String(Math.max(0,top)));
      }catch{} // Navigation cannot fail because an iframe is transient.
    }
    sessionStorage.setItem(UIKEY,JSON.stringify(positions));
  }
  function s01OriginFromS5(){
    try{
      const context=JSON.parse(sessionStorage.getItem(S01_ORIGIN_KEY)||'null');
      if(!context||context.source!=='S5'||Date.now()-context.at>30*60*1000)return false;
      const r=state().requirement;
      return context.city===state().city&&context.capacity===r.capacity_m3&&
        context.termConfirmed===r.term_confirmed&&context.term===r.term_months;
    }catch{return false;}
  }
  function saveS5Origin(){const r=state().requirement;
    sessionStorage.setItem(S01_ORIGIN_KEY,JSON.stringify({source:'S5',city:state().city,
      capacity:r.capacity_m3,termConfirmed:r.term_confirmed,term:r.term_months,at:Date.now()}));
  }
  function clearS5Origin(){sessionStorage.removeItem(S01_ORIGIN_KEY);}

  function go(next,storeId,reset=false){if(next==='O01'&&!core.authorized()){phoneAuth.run('ORDER','OPEN_O01',()=>go(next,storeId,reset));return;}if(next==='O01'&&page!=='O01')sessionStorage.setItem('mk_order_return_v2',page);remember();if(reset)positions={};if(storeId&&storeId!==state().storeId){positions.S02=0;visual.tab='可选仓位';visual.category='全部';visual.gallery=0;saveVisual();}if(storeId)core.setStore(storeId);
    if(next==='S01'&&page==='S5'){saveS5Origin();sessionStorage.removeItem(S01_SCROLL_KEY);}
    else if(['M01','BOOKING','QUICK'].includes(next))clearS5Origin();
    if(next==='S5')clearS5Origin();
    page=next;displayedPage=null;notice='';modal=null;persist();const q=new URLSearchParams({page});if(next==='S01'||r2Mode())q.set('s01_r2','1');if(reviewMode)q.set('review','1');if(next==='S02'&&state().storeId)q.set('store',state().storeId);if(next==='BOOKING'&&sessionStorage.getItem('mk_advisor_context_v3'))q.set('mode','advisor');history.pushState({},'',location.pathname+'?'+q);render();}
  function button(action,label,value='',cls='btn'){return `<button ${label==='‹'?'aria-label="返回上页"':''} class="${cls}" data-action="${action}" data-value="${esc(value)}">${label}</button>`;}
  const priceCTA=()=>button('phone','验证后查看整期报价','','price-access-button');
  function price(ids){const p=presentation.price(ids);return `<div class="br03-price"><strong class="br03-price-main">${p.money}</strong>${p.kind==='term'?`<span class="br03-price-term">${p.termLabel}</span><span class="br03-price-average">${p.average}</span>`:`<span class="br03-reference">${p.termLabel}</span>${state().requirement.term_confirmed?button('phone','验证后查看整期价','','br03-price-link'):''}`}</div>`;}
  function stateLine(f){return `<div class="br03-state-line">${f.promoLabel?`<span class="br03-promo">${esc(f.promoLabel)}</span>`:''}${f.inventoryLine?`<span class="br03-stock">${esc(f.inventoryLine)}</span>`:''}</div>`;}
  function demand(){const r=state().requirement;return `<div class="demand"><span class="summary">${r.capacity_m3===null?'普通浏览':r.capacity_m3+'m³'} · ${r.term_confirmed?r.term_months+'个月':'租期待选'}</span><a data-edit-demand href="${state().requirement.source==='items_estimate'||state().requirement.source==='known_capacity_in_items_flow'?'items.html':'cap.html'}">修改需求 ›</a></div>`;}
  function title(text,back='S01'){return `<div class="view-title">${button('go','‹',back,'back-button')}<strong>${text}</strong></div>`;}
  function footer(){return `<nav class="bottom-nav" aria-label="底部导航">${[['home','首页','home'],['go','附近门店','stores','S01'],['navBooking','预约订单','calendar'],['mine','我的','user']].map(([action,label,icon,value])=>`<button class="bottom-item ${((page==='S01'&&label==='附近门店')||(page==='M01'&&label==='我的'))?'active':''}" data-action="${action}" data-value="${value||''}" ${action==='navBooking'?'aria-haspopup="dialog"':''}><img class="approved-nav-icon" src="assets/vis07-nav-${icon}.png" alt=""><span>${label}</span></button>`).join('')}</nav>`;}
  function visualDemand(){const r=state().requirement;return `<div class="demand ${r.capacity_m3===null?'demand-empty':''}"><span class="roundicon">${I('cube')}</span><span class="summary">${r.capacity_m3===null?'未选需求，可直接浏览门店':'已选需求：'+r.capacity_m3+'m³ · '+(r.term_confirmed?r.term_months+'个月':'租期待选')}</span><a data-edit-demand href="${state().requirement.source==='items_estimate'||state().requirement.source==='known_capacity_in_items_flow'?'items.html':'cap.html'}">${r.capacity_m3===null?'填写需求':'修改'} ${I('chevron')}</a></div>`;}
  function resetVisualFilters(){visual.keyword='';visual.sort='recommended';visual.price='all';visual.service='all';visual.category='全部';visual.tab='可选仓位';visual.gallery=0;saveVisual();}
  function storeOffer(s){const single=core.matchingUnits(s.id).sort((a,b)=>core.amounts([a.id],state().requirement.term_months||1).rent_total-core.amounts([b.id],state().requirement.term_months||1).rent_total)[0];return single?[single.id]:core.combinations(s.id)[0]?.ids;}
  function storeAmount(s){const ids=storeOffer(s);return ids?core.amounts(ids,state().requirement.term_months||1).rent_total:Infinity;}
  const referenceCost=ids=>ids.reduce((total,id)=>total+(state().prices[id]??unit(id)?.base_month??0),0);
  const recommendationCost=ids=>state().requirement.term_confirmed?core.amounts(ids,state().requirement.term_months).rent_total:referenceCost(ids);
  function candidateList(excludeStore){
    const rows=[];F.stores.filter(s=>s.city===state().city&&s.status==='open'&&s.id!==excludeStore).forEach(s=>{
      const ids=storeOffer(s);
      if(ids?.length)rows.push({store:s,ids,volume:ids.reduce((n,id)=>n+(unit(id)?.volume||0),0),combo:ids.length>1});
    });return REC.rank(rows.sort((a,b)=>(a.volume-(state().requirement.capacity_m3||0))-(b.volume-(state().requirement.capacity_m3||0))||storeAmount(a.store)-storeAmount(b.store)),{distanceVerified:F.distanceVerified||F.stores.filter(s=>s.city===state().city&&s.status==='open').every(s=>Number.isFinite(s.distance)&&s.distance>=0),costOf:row=>recommendationCost(row.ids)}).items;
  }
  // S5-only adaptation from the same live city/store/unit directory as S01.
  // Public demo distance values are explicitly illustrative when geolocation is unverified.
  function s5CandidateList(preferredDistrict=''){
    const requirement=state().requirement,need=Number(requirement.capacity_m3);
    if(!(need>0)||!requirement.term_confirmed)return [];
    const allExact=candidateList();
    const localExact=preferredDistrict?allExact.filter(row=>row.store.district===preferredDistrict):[];
    const exact=localExact.length?REC.rank(localExact,{distanceVerified:true,costOf:row=>recommendationCost(row.ids)}).items.concat(allExact.filter(row=>row.store.district!==preferredDistrict)):allExact;
    if(exact.length){
      // First two remain in the same order as the common recommendation contract.
      // Mark area expansion only when a usable distance is present and all suitable
      // candidates are outside the initial 3km radius (demo distances are permitted).
      const distances=exact.map(row=>row.store.distance);
      const expanded=distances.length>0&&distances.every(km=>Number.isFinite(km)&&km>3);
      return exact.map(row=>({...row,expandedSearch:expanded,distanceDemo:!F.distanceVerified}));
    }
    // No adequate warehouse: offer a clearly disclosed nearby-size alternative,
    // never treat it as meeting the user's actual volume or enable direct ordering.
    const near=F.stores.filter(s=>s.city===state().city&&s.status==='open').flatMap(s=>{
      const units=F.units.filter(u=>u.store_id===s.id&&core.available(u)&&u.volume<need);
      const rows=units.filter(u=>u.volume>=need*0.8)
        .map(u=>({store:s,ids:[u.id],volume:u.volume,combo:false,nearCapacity:true,distanceDemo:!F.distanceVerified}));
      for(let i=0;i<units.length;i++)for(let j=i+1;j<units.length;j++){
        const volume=Number((units[i].volume+units[j].volume).toFixed(3));
        if(volume<need&&volume>=need*0.8)
          rows.push({store:s,ids:[units[i].id,units[j].id],volume,combo:true,nearCapacity:true,distanceDemo:!F.distanceVerified});
      }
      return rows.sort((a,b)=>b.volume-a.volume).slice(0,1);
    });
    return near.sort((a,b)=>(preferredDistrict&&a.store.district===preferredDistrict?-1:0)-(preferredDistrict&&b.store.district===preferredDistrict?-1:0)||b.volume-a.volume ||
      Number(a.store.distance??Infinity)-Number(b.store.distance??Infinity) ||
      core.amounts(a.ids,requirement.term_months).rent_total-core.amounts(b.ids,requirement.term_months).rent_total).slice(0,2);
  }
  function alternatives(excludeStore){const rows=candidateList(excludeStore).slice(0,3);return `<section class="alternatives"><h3>其他匹配门店和仓位</h3><p>已保留您的容量和租期。</p>${rows.length?rows.map(r=>`<div class="alternative"><strong>${r.store.name}</strong><p>${r.volume}m³${r.combo?' · 组合方案':''}</p>${button('store','查看匹配方案',r.store.id,'outline')}</div>`).join(''):'<p>当前城市没有满足容量的可用方案。</p>'}${button('advisor','联系顾问 / 预约咨询','','outline')}</section>`;}
  function storeCard(s){
    const expanded=visual.expandedStoreIds.includes(s.id),r=state().requirement;
    const all=F.units.filter(u=>u.store_id===s.id&&core.available(u));
    const rows=(r.capacity_m3!==null?core.matchingUnits(s.id):all).sort((a,b)=>a.volume-b.volume);
    const previews=rows.slice(0,2),hasStock=all.length>0;
    const heading=r.capacity_m3!==null?'匹配仓位预览':'仓位预览';
    let empty=s.status!=='open'?'门店暂停服务':!hasStock?'已售罄':core.combinations(s.id).length?'暂无符合当前需求的单仓，可查看组合方案':'暂无符合当前需求的仓位';
    const min=rows.length?[...rows].sort((a,b)=>core.amounts([a.id],r.term_months||1).rent_total-core.amounts([b.id],r.term_months||1).rent_total)[0]:null;
    const collapsed=min?`${money(core.authorized()&&r.term_confirmed?core.formalAmounts([min.id],r.term_months).rent_total:(state().prices[min.id]||min.base_month))}${core.authorized()&&r.term_confirmed?' / '+r.term_months+'个月起' :' /月起'}`:empty;
    return `<article class="store-row ${expanded?'is-expanded':''}" data-store-id="${s.id}"><a class="store-entry" data-store="${s.id}" href="index.html?page=S02&store=${s.id}" aria-label="查看${s.name}"><img class="store-photo" src="assets/${s.photo}" alt="${F.sourceNamespace==='MK'?'门店场景示意素材':s.name+'门店环境'}"><div class="store-info"><div class="store-title"><strong class="store-name">${esc(s.name)}</strong>${Number.isFinite(s.rating)?`<span class="rating">${Number(s.rating).toFixed(1)}</span>`:''}</div><p class="address">${esc(s.address)}</p><p class="store-distance">${esc(s.district)} · ${F.distanceVerified?Number(s.distance).toFixed(1)+'km':R2.distanceOf(s,F.distanceVerified)}</p><div class="tags">${serviceTags(s).slice(0,2).map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div></div></a><div class="store-preview-bar"><strong>${expanded?heading:collapsed}</strong><button class="store-preview-toggle" data-action="toggleStore" data-value="${s.id}" aria-expanded="${expanded}" aria-controls="preview-${s.id}">${expanded?'收起':'展开仓位'}</button></div><section class="store-previews" id="preview-${s.id}" ${expanded?'':'hidden'} aria-label="${s.name}${heading}">${previews.length?previews.map(previewRow).join(''):`<p class="store-empty">${empty}</p>`}<a class="store-more" data-store="${s.id}" href="index.html?page=S02&store=${s.id}">${r.capacity_m3!==null&&rows.length>2?'查看本店更多匹配仓位':'查看本店仓位'}</a></section></article>`;
  }
  function previewRow(u){const f=P.facts(u),description=P.describe(u,'S01').lines[0];return `<article class="unit-preview" data-unit="${u.id}" data-promo-state="${f.state}"><img class="preview-image" src="${r3UnitImage(u)}" alt="${esc(u.name)}空间示意"><div class="preview-body"><h3 class="preview-title">${esc(u.name)}</h3><p class="preview-use" title="${esc(description)}">${esc(description)}</p><div class="preview-bottom">${price([u.id])}<button class="br03-buy" data-action="choose" data-value="${u.id}">立即下单</button></div>${stateLine(f)}</div></article>`;}
  function visibleS01Stores(){
    const r=state().requirement;let stores=F.stores.filter(s=>s.city===state().city);
    if(r.capacity_m3!==null)stores=[...stores.filter(s=>s.status==='open'&&storeOffer(s)),...stores.filter(s=>s.status!=='open'||!storeOffer(s))];
    if(visual.keyword)stores=stores.filter(s=>(s.name+s.address).includes(visual.keyword));
    if(visual.service!=='all')stores=stores.filter(s=>s.serviceTags.includes(visual.service));
    if(r2Mode()){
      if(r2Filters.services.length)stores=stores.filter(s=>r2Filters.services.every(v=>(s.serviceTags||[]).includes(v)));
      if(r2Filters.maxKm!==null&&demoDistanceEnabled)stores=stores.filter(s=>displayedDistanceKm(s)<=Number(r2Filters.maxKm));
      if(r2Filters.quick.includes('promo'))stores=stores.filter(s=>s.operatingTag==='特价仓'||s.operatingTag==='双11大促');
      if(r2Filters.quick.includes('moving'))stores=stores.filter(s=>s.operatingTag==='免费搬运');
    }

    if(visual.sort==='recommended'&&r.capacity_m3===null){
      const active=stores.filter(s=>s.status==='open');
      stores=[...REC.rank(active,{distanceVerified:demoDistanceEnabled,costOf:s=>presentation.cubicReference(s)?.value??Infinity}).items,...stores.filter(s=>!active.includes(s))];
    }
    if(visual.sort==='recommended'&&r.capacity_m3!==null){
      const matching=stores.filter(s=>s.status==='open'&&storeOffer(s));
      const other=stores.filter(s=>!matching.includes(s));
      const matchingEntries=matching.map(s=>{const ids=storeOffer(s);return {store:s,ids,volume:ids.reduce((n,id)=>n+(unit(id)?.volume||0),0)};})
        .sort((a,b)=>(a.volume-r.capacity_m3)-(b.volume-r.capacity_m3)||recommendationCost(a.ids)-recommendationCost(b.ids));
      stores=[...REC.rank(matchingEntries,{distanceVerified:demoDistanceEnabled,costOf:row=>recommendationCost(row.ids)}).items.map(row=>row.store),...other];
    }
    if(visual.sort==='distance'&&demoDistanceEnabled)stores.sort((a,b)=>displayedDistanceKm(a)-displayedDistanceKm(b));
    if(visual.sort==='price'&&core.authorized())stores.sort((a,b)=>storeAmount(a)-storeAmount(b));
    return stores;
  }
  function renderS01(){
    const r=state().requirement,stores=visibleS01Stores();
    const signature=JSON.stringify({requirement:r,city:state().city,sort:visual.sort,keyword:visual.keyword,service:visual.service,ids:stores.map(s=>s.id)});
    if(visual.expandSignature!==signature){visual.expandSignature=signature;visual.expandedStoreIds=stores.slice(0,2).map(s=>s.id);saveVisual();}
    return `<div class="topline"><button class="city" data-action="city" aria-label="切换城市">${state().city}${I('down')}</button><label class="search">${I('search')}<input id="store-search" type="search" autocomplete="off" placeholder="搜索门店、区域或地址" aria-label="搜索门店" value="${esc(visual.keyword)}"></label></div>${visualDemand()}<div class="filter-bar" aria-label="门店排序筛选"><button class="filter-btn ${visual.sort==='recommended'?'active':''}" data-action="sort">${{recommended:'综合排序',distance:'距离排序',price:'价格排序'}[visual.sort]}${I('down')}</button><button class="filter-btn ${visual.sort==='distance'?'active':''}" data-action="setSort" data-value="distance">距离</button><button class="filter-btn ${visual.service!=='all'?'active':''}" data-action="serviceFilter">服务${I('down')}</button></div><div class="list-body">${stores.length?stores.map(storeCard).join(''):`<div class="empty-units"><h3>考拉E存 · 上门取送</h3><p>当前条件下暂无匹配的门店仓位，了解上门取送服务范围与方案。</p>${button('estore','了解考拉E存','','outline')}${button('clearFilters','清除筛选','','outline')}${button('city','切换城市','','outline')}${alternatives()}</div>`}</div>`;
  }
  function r3UnitImage(u){const n=Number(u.volume)||0;const tier=n<=1.5?'mini':n<=5?'small':n<=15?'medium':'large';return 'assets/unit-r3/thumb/unit-r3-'+tier+'-336x312.webp';}
  function s02UnitPrice(ids){
    if(state().requirement.term_confirmed)return price(ids);
    const months=F.pricing.homeReferenceTerm||12;
    const monthly=core.amounts(ids,months).monthly_average;
    // As in S01, this is the selected warehouse's own 12-month discounted rent, never the store-wide cubic teaser.
    return '<div class="br03-price" data-price-kind="unit_month" data-reference-term="'+months+'"><strong class="br03-price-main">'+money(monthly)+'</strong><span class="br03-reference">/月 · '+months+'个月租期</span></div>';
  }
  function unitRow(u){const f=P.facts(u),description=P.describe(u,'S02'),fav=visual.favorites.includes(u.id);return `<article class="unit-row" data-unit="${u.id}" data-promo-state="${f.state}"><img class="unit-img" src="${r3UnitImage(u)}" alt="${esc(u.name)}空间示意"><div class="unit-card-inner"><div class="unit-head"><b class="unit-name">${esc(u.name)}</b><button class="fav ${fav?'on':''}" data-action="favorite" data-value="${u.id}" aria-label="${fav?'取消收藏':'收藏'}${esc(u.name)}" aria-pressed="${fav}">${I(fav?'heartfilled':'heart')}</button></div><p class="unit-spec">${u.dimensions}</p><p class="scenario">${description.lines.slice(0,2).map(x=>`<span>${esc(x)}</span>`).join('')}</p><div class="unit-bottom"><div class="unit-price">${f.available?s02UnitPrice([u.id]):'<span class="unavailable">已售出 / 暂不可用</span>'}</div><button class="order-button" data-action="choose" data-value="${u.id}" ${f.available?'':'disabled'}>${f.available?'立即下单':'暂不可租'}</button></div>${stateLine(f)}</div></article>`;}
  function advantages(s){return `<div class="advantages">${[['train','所在区域',s.district],...s.serviceTags.slice(0,3).map((t,i)=>[['clock','parking','shield'][i],t,{'近地铁':'交通配套','24小时存取':'全天存取','电梯直达':'楼层配套','停车便利':'停车配套','控温防潮':'环境配套','小推车':'搬运配套','全天监控':'安防配套','24小时开放':'全天存取','停车方便':'停车配套','商圈核心':'周边配套','交通便利':'交通配套'}[t]])].map(([icon,t,desc])=>`<div class="advantage"><span class="bubble"><img class="approved-adv-icon" src="assets/vis07-${icon}.png" alt=""></span><strong>${t}</strong><p>${desc}</p></div>`).join('')}</div>`;}
  function storeContent(s){if(visual.tab==='服务设施')return `<section class="detail-blank" aria-label="服务设施"><div class="facility-grid">${s.facilities.map((t,i)=>`<div class="facility-item">${I(['clock','shield','parking','user'][i])}<b>${t}</b></div>`).join('')}</div></section>`;
    const catalog=F.units.filter(u=>u.store_id===s.id),visible=catalog.filter(u=>visual.category==='全部'||category(u)===visual.category);
    const available=visible.filter(u=>core.available(u)).sort((a,b)=>a.volume-b.volume),linked=state().requirement.capacity_m3!==null;
    const matching=linked?available.filter(u=>u.volume>=state().requirement.capacity_m3):available;
    const others=linked?available.filter(u=>u.volume<state().requirement.capacity_m3):[];
    const unavailable=visible.filter(u=>!core.available(u));
    const combos=visual.category==='全部'?core.combinations(s.id):[];
    if(!catalog.some(u=>core.available(u)))return '<section class="empty-units"><h3>'+(s.status==='open'?'本店暂无可租仓位':'本店暂停服务')+'</h3><p>您的容量和租期已保留，可查看其他匹配门店。</p></section>'+alternatives(s.id)+'<details class="detail-blank"><summary>查看暂不可租仓位（最多3个）</summary>'+unavailable.slice(0,3).map(unitRow).join('')+'</details>';
    const filters=`<div class="unit-filter" role="group" aria-label="仓型筛选">${categories.map(x=>`<button class="chip ${visual.category===x?'selected':''}" data-action="category" data-value="${x}" aria-pressed="${visual.category===x}">${x}</button>`).join('')}</div>`;
    const comboHtml=combos.length?`<h3 class="br03-group-title">组合方案</h3>${combos.map(x=>`<article class="unit-row combo-row"><div class="s02-combo-pics" aria-label="多间独立仓位组合">${x.ids.slice(0,2).map(id=>`<img src="${r3UnitImage(unit(id))}" alt="${esc(unit(id)?.name||'独立仓位')}" loading="lazy">`).join('')}</div><div class="unit-card-inner"><h3 class="unit-name">${x.volume}m³ · ${x.ids.length}间组合</h3><p class="scenario"><span>一笔订单 · 同一门店</span></p><div class="unit-bottom">${s02UnitPrice(x.ids)}${button('choose','立即下单',x.ids.join(','),'order-button')}</div></div></article>`).join('')}`:'';
    return filters+`<div class="unit-list">${matching.length?matching.map(unitRow).join(''):linked?'<p class="br03-group-note">暂无符合当前需求的单仓，您的容量和租期已保留。</p>':''}${comboHtml}${others.length?'<h3 class="br03-group-title">其他可租容量</h3>'+others.map(unitRow).join(''):''}${!available.length&&!combos.length?'<p class="br03-group-note">当前仓型暂无可租仓位。</p>'+button('category','查看全部仓型','全部','outline'):''}${unavailable.length?'<details class="unavailable-units"><summary>查看暂不可租仓位</summary>'+unavailable.slice(0,3).map(unitRow).join('')+'</details>':''}${linked&&!matching.length&&!combos.length?alternatives(s.id):''}</div>`;
  }
  const s02HoursOptions=['24小时','09:00-21:00','08:00-23:00'];
  function s02AccessHours(s){
    if(s.access_hours)return s.access_hours;
    let h=2166136261;for(const char of String(s.id)){h=Math.imul(h^char.charCodeAt(0),16777619)>>>0}
    return s02HoursOptions[h%3];
  }
  function s02Situation(s){
    const r=state().requirement,units=F.units.filter(u=>u.store_id===s.id),available=units.filter(u=>core.available(u));
    if(!available.length)return 'soldout';
    if(r.capacity_m3===null)return 'browse';
    if(available.some(u=>u.volume>=r.capacity_m3))return 'matched';
    if(core.combinations(s.id).length)return 'combo';
    const largest=Math.max(...available.map(u=>Number(u.volume)||0));
    return largest>=r.capacity_m3*0.8?'near':'nomatch';
  }
  function s02Demand(){
    const r=state().requirement;
    if(r.capacity_m3===null)return '<div class="s02-demand"><span>不确定用多大仓？</span><a data-edit-demand href="cap.html">立即估算 ›</a></div>';
    return '<div class="s02-demand"><span>'+esc(r.capacity_m3)+'m³ · '+(r.term_confirmed?esc(r.term_months)+'个月':'租期待选')+'</span><a data-edit-demand href="cap.html">修改 ›</a></div>';
  }
  function s02HotRibbon(s){
    // A generated quantity is useful for selecting demo warehouse options, but cannot justify a scarcity claim.
    const certified=F.units.filter(u=>u.store_id===s.id&&u.inventory_verified===true&&core.available(u));
    if(!s.inventory_claim_verified||!certified.length)return '';
    return '<div class="s02-hot" data-inventory-verified="true"><div class="s02-hot-copy"><strong>当前可租仓型 '+certified.length+' 种</strong></div></div>';
  }
  function s02Route(s){
    const name=esc(s.name),addr=esc(s.address);
    const map='<div id="s02MapSlot" class="s02-map" data-store-id="'+esc(s.id)+'" data-address="'+addr+'" data-geo-candidate="'+Boolean(s.geo?.route_candidate)+'" aria-label="门店位置地图"><svg viewBox="0 0 360 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="360" height="240" fill="#eef1e9"/><g fill="#dfe9dc"><rect x="5" y="0" width="80" height="66" rx="8"/><rect x="112" y="0" width="116" height="67" rx="8"/><rect x="255" y="0" width="100" height="66" rx="8"/><rect x="5" y="98" width="80" height="57" rx="8"/><rect x="112" y="98" width="116" height="57" rx="8"/><rect x="255" y="98" width="100" height="57" rx="8"/><rect x="5" y="184" width="80" height="57" rx="8"/><rect x="112" y="184" width="116" height="57" rx="8"/><rect x="255" y="184" width="100" height="57" rx="8"/></g><path d="M99 0V240M241 0V240M0 82H360M0 170H360" fill="none" stroke="#fff" stroke-width="18"/><circle cx="180" cy="115" r="27" fill="#2e7858" opacity=".17"/><path d="M180 92c-14 0-23 11-23 23 0 15 23 36 23 36s23-21 23-36c0-12-9-23-23-23z" fill="#2f7958"/><circle cx="180" cy="114" r="7" fill="#fff"/></svg><span class="s02-map-place">'+name+'</span></div>';
    return '<div class="s02-route"><p class="s02-route-address">'+addr+'</p>'+map+'<div class="s02-travel-modes" role="group" aria-label="出行方式">'+[['transit','公交地铁'],['drive','驾车'],['walk','步行'],['bike','骑行']].map(item=>'<button type="button" data-action="s02TravelMode" data-value="'+item[0]+'" class="'+(visual.travelMode===item[0]?'active':'')+'">'+item[1]+'</button>').join('')+'</div><button class="s02-route-open" data-action="s02OpenMap">导航到门店 ›</button></div>';
  }
  function s02Services(s){
    const hours=s02AccessHours(s);
    const facilities=[...new Set([...(s.facilities||[]).filter(v=>hours==='24小时'||!/24小时|全天/.test(v)),'到店搬运','装卸区域'])];
    return '<div class="s02-services"><div class="s02-services-hours"><span>存取时间</span><strong>'+esc(s02AccessHours(s))+'</strong></div><div class="s02-service-tags">'+facilities.slice(0,6).map(x=>'<span>'+esc(x)+'</span>').join('')+'</div></div>';
  }
  function s02PhotoList(s){
    return [
      ...(Array.isArray(s.gallery_photos)?s.gallery_photos:[]),
      ...(s.r2Photo&&s.r2Photo!=='assets/'+s.photo?[s.r2Photo]:[]),
      'assets/'+(s.photo==='store_jingan.jpg'?'store_jingan_hero_clean.jpg':s.photo),
      'assets/'+s.photo
    ].filter((item,index,all)=>item&&all.indexOf(item)===index).slice(0,4);
  }
  function renderS02(){
    const s=store(state().storeId);if(!s)return title('门店详情')+'<p class="mini-state">请选择门店后继续。</p>';
    const photos=s02PhotoList(s);
    const fav=visual.storeFavorites.includes(s.id),status=s02Situation(s);
    const photo=photos[visual.gallery%photos.length];
    const hero='<div class="hero"><img src="'+photo+'" alt="'+esc(s.name)+'门店环境"><div class="hero-controls"><button class="circle-btn back-button" data-action="go" data-value="'+esc(state().returnPage)+'" aria-label="返回">'+I('back')+'</button><div class="hero-actions"><button class="circle-btn" data-action="storeFavorite" aria-label="'+(fav?'取消收藏门店':'收藏门店')+'" aria-pressed="'+fav+'">'+I(fav?'heartfilled':'heart')+'</button><button class="circle-btn" data-action="share" aria-label="分享门店">'+I('share')+'</button></div></div><span class="s02-hours">存取时间：'+esc(s02AccessHours(s))+'</span><button class="gallery-count" data-action="gallery" aria-label="下一张门店图片">'+(visual.gallery+1)+'/'+photos.length+'</button></div>';
    const header='<div class="detail-main"><div class="detail-head"><b class="detail-name">'+esc(s.name)+'</b><button class="nav-ext" data-action="s02OpenMap" aria-label="地图导航">'+I('navigation')+'</button></div><p class="detail-addr">'+I('pin')+'<span>'+esc(s.address)+'</span></p></div>';
    const banner=(status==='browse'||status==='matched')?s02HotRibbon(s):'';
    const contents=status==='nomatch'?'<div class="s02-no-match"><strong>本店暂无匹配仓位</strong><button type="button" data-action="go" data-value="S01">查看其他门店 ›</button></div>':storeContent(s);
    const tabs='<div id="s02MainTabs" class="s02-main-tabs" role="tablist" aria-label="门店信息">'+[['可选仓位','可选仓位'],['服务设施','服务设施'],['交通路线','交通路线']].map(item=>'<button role="tab" type="button" aria-selected="'+(visual.tab===item[0])+'" class="'+(visual.tab===item[0]?'active':'')+'" data-action="detailTab" data-value="'+item[0]+'">'+item[1]+'</button>').join('')+'</div>';
    const content=visual.tab==='交通路线'?s02Route(s):visual.tab==='服务设施'?s02Services(s):'<section id="s02Inventory" data-s02-status="'+status+'">'+contents+'</section>';
    const req=state().requirement;
    const options=F.units.filter(u=>u.store_id===s.id&&core.available(u)&&
      (req.capacity_m3===null||u.volume>=req.capacity_m3));
    const chosen=options.sort((a,b)=>a.volume-b.volume)[0];
    const combos=chosen?[]:core.combinations(s.id);
    const quoteIds=chosen?[chosen.id]:(combos[0]?.ids||[]);
    const totalRent=quoteIds.length&&req.capacity_m3!==null&&req.term_confirmed?
      core.amounts(quoteIds,req.term_months).rent_total:0;
    const showAdvisor=visual.tab==='可选仓位'&&
      (Number(req.capacity_m3)>10||totalRent>2000);
    const advisor=showAdvisor?'<button type="button" class="s02-advisor" data-action="advisor">顾问协助 ›</button>':'';
    return hero+banner+header+s02Demand()+tabs+content+advisor;
  }
  function amountLines(a){return `<dl class="amount-lines"><dt>整期租金</dt><dd>${money(a.rent_total)}</dd><dt>月均约</dt><dd>${money(a.monthly_average)}</dd><dt>押金</dt><dd>${money(a.deposit)}</dd><dt>整单管理费</dt><dd>${money(a.management_fee)}</dd><dt>首次应付</dt><dd><strong>${money(a.payable)}</strong></dd></dl>`;}
  function renderResult(){const o=resultKind==='order'?(state().orders.find(o=>o.id===lastOrder)||state().orders.at(-1)):null;return `${title('模拟结果')}<div class="detail-blank">${o?`<h3>${o.status==='paid_simulated'?'模拟支付成功':o.status==='payment_failed'?'模拟支付失败，仓位已释放':'模拟订单已创建，待支付'}</h3><p>${o.id}</p><p>${store(o.store_id).name} · ${o.unit_ids.length}间 · ${o.term_months}个月</p>${core.authorized()?amountLines(o):priceCTA()}${o.status==='pending'?button('paySuccess','模拟支付成功')+button('payFailed','模拟支付失败','','outline'):''}`:'<h3>预约需求已模拟提交</h3><p>已记录用仓地址，后续由顾问跟进；没有创建租仓订单。</p>'}${o&&o.status==='paid_simulated'?button('orderDetail','查看订单详情',o.id,'outline'):''}${button('go','继续浏览门店','S01','outline')}</div>`;}
  function modalHtml(){if(!modal)return'';let body='';if(modal==='contact')body=`<h3>请提供联系电话</h3><p>填写号码仅保存联系方式；进入订单前，请完成微信或短信验证并注册登录。月租价格可直接浏览。</p><label for="contact-phone">手机号</label><input id="contact-phone" class="field" type="tel" autocomplete="tel" value="${esc(state().contactPhone)}">${button('contactContinue','确认手机号并继续')}${button('phone','使用微信手机号授权','','outline')}`;if(modal==='phone')body=`<h3>手机号授权演示</h3><p>授权后可查看报价；拒绝后仍可浏览门店与设施。</p><p class="context-note">这里只模拟微信结果，不获取真实手机号。</p>${button('phoneSuccess','模拟同意并查看')}${button('phoneDenied','暂不授权，继续浏览','','outline')}${button('phoneFailed','模拟接口失败','','outline')}`;
    if(modal==='capacityMismatch')body=`<h3>当前仓位不满足已选容量</h3><p>已保留您的容量和租期。可以修改需求，或继续查看其他匹配门店。</p>${button('editCapacity','修改容量需求')}${button('go','查看其他匹配门店','S01','outline')}`;
    if(modal==='term')body=`<h3>请选择租期</h3><div class="chip-row">${[1,3,6,12,24,36,60].map(m=>button('setTerm',m+'个月',String(m),'chip')).join('')}</div><label for="custom-term">自定义租期（1–60个月）</label><input id="custom-term" class="field" type="number" min="1" max="60">${button('customTerm','确认租期')}`;
    if(modal==='r2-search')body=`<h3>搜索门店</h3><label for="r2-search-query">门店、区域或地址</label><input id="r2-search-query" class="field" type="search" maxlength="60" placeholder="输入门店名称、区域或地址" value="${esc(visual.keyword)}">${button('r2SearchClear','清除搜索','','outline')}${button('r2EditDemand','修改容量与租期','','outline')}`;
    if(modal==='r2-distance')body=`<h3>距离排序</h3><p>暂未取得可用于排序的位置。</p>`;
    if(modal==='r2-region')body=`<h3>选择区域</h3><div class="chip-row">${[['all','全部区域'],...s01R2Bridge.regions().map(x=>[x,x])].map(([v,label])=>button('setR2Region',label,v,'chip'+(r2Filters.region===v?' selected':''))).join('')}</div>`;
    if(modal==='r2-capacity')body=`<h3>选择容量</h3><div class="chip-row">${R2.capacities.map(([v,label])=>button('setR2Capacity',label,v,'chip'+(r2Filters.capacity===v?' selected':''))).join('')}</div>`;
    if(modal==='city')body=`<h3>选择城市</h3><div class="chip-row">${['北京','上海','深圳','杭州','广州'].map(c=>button('setCity',c,c,'chip')).join('')}</div>`;
    if(modal==='sort')body=`<h3>门店排序</h3><div class="chip-row">${[['recommended','综合排序'],['distance','距离优先'],['price','价格优先']].map(([value,label])=>button('setSort',label,value,'chip')).join('')}</div>`;

    if(modal==='serviceFilter')body=`<h3>服务筛选</h3><div class="chip-row">${[['all','不限'],...['近地铁','24小时存取','电梯直达','停车便利','控温防潮','小推车','全天监控'].map(x=>[x,x])].map(([value,label])=>button('setService',label,value,'chip')).join('')}</div>`;
    if(modal==='navBooking')body=`<h3>预约与下单</h3><p>预约只需用仓地址；立即下单先选合适的仓位。</p>${button('go','预约用仓','BOOKING')}${button('go','立即下单','QUICK','outline')}`;
    if(modal==='navigation')body=`<h3>地图导航</h3><p>${esc(store(state().storeId)?.address)}</p><p>地址来自门店资料；路线导航服务尚未接入，可按地址在地图中查找。</p>`;
    if(modal==='share')body=`<h3>分享门店</h3><p>复制后可在本机打开该门店。</p><input class="field" aria-label="门店链接" readonly value="${esc(location.href)}">${button('copyShare','复制链接')}`;
    if(modal==='saved')body=`<h3>我的收藏</h3>${visual.storeFavorites.map(id=>store(id)).filter(Boolean).map(s=>button('store',s.name,s.id,'outline')).join('')}${visual.favorites.map(id=>unit(id)).filter(Boolean).map(u=>`<p>${store(u.store_id).name} · ${unitName(u)}${button('store','查看',u.store_id,'outline')}</p>`).join('')}${!visual.storeFavorites.length&&!visual.favorites.length?'<p>暂无收藏，可在门店详情收藏门店或仓位。</p>':''}`;
    if(r2Mode()&&notice&&notice!=='请选择租期')body+='<p role="alert">'+esc(notice)+'</p>';
    return `<div class="scrim" data-action="close"></div><section class="control-sheet" role="dialog" aria-modal="true" aria-label="${modal}">${button('close','关闭','','close-button')}${body}</section>`;
  }
  function render(){
    // Snapshot the live value before any RN01 view replacement, including non-input-triggered refreshes.
    const inProgressRenewal=document.getElementById('renew-months');
    if(page==='RN01'&&inProgressRenewal)renewalDraftByOrder[lifecycleId()]=inProgressRenewal.value;
    core.expirePendingOrders();
    if(page==='O01'&&!core.authorized())notice='请验证手机号后继续确认订单';
    if(displayedPage===page&&$('#scroll'))positions[page]=$('#scroll').scrollTop;
    const was=displayedPage;core.authorized();persist();
    const framed={S5:'s5',BOOKING:'reserve',QUICK:'quick',O01:'o01'};
    function readableOrderNo(id){
    const suffix=String(id||'').match(/[0-9]+$/)?.[0];
    if(suffix)return 'KL'+suffix.padStart(8,'0');
    return 'KL'+Array.from(String(id||'')).reduce((n,ch)=>(Math.imul(n,31)+ch.charCodeAt(0))>>>0,0).toString().padStart(10,'0').slice(-10);
  }
  const orderStatusLabel=status=>({
    paid_simulated:'已支付',pending:'待支付',payment_failed:'支付失败',
    payment_cancelled:'支付已取消',cancelled:'已取消',expired:'已过期'
  }[status]||'办理中');
  const orderStatusTone=status=>status==='paid_simulated'?'paid':status==='pending'?'pending':'inactive';
  const leaseStatusLabel=status=>({
    upcoming:'待起租',active:'租用中',returning:'退租处理中',ended:'已退租',
    not_active:'尚未起租',active_demo:'租用中'
  }[status]||'办理中');
  const depositStatusLabel=status=>({
    HELD:'押金保管中',held:'押金保管中',
    REFUND_PENDING:'退款处理中',REFUNDED:'已退还',
    not_collected:'暂无押金',NOT_COLLECTED:'暂无押金'
  }[status]||'处理中');
  const paymentClockHtml=o=>{
    // O03 renders a summary without expiresAt; resolve the original deadline by order ID.
    // Reopening O03 must not reset the pending order's three-hour payment window.
    const source=state().orders.find(x=>x.id===o.id);
    const deadline=source?.expiresAt??o.expiresAt;
    if(o.status!=='pending'||!Number.isFinite(Number(deadline)))return '';
    const clock=paymentTimeLeft(deadline);
    return '<p class="mk-order-clock" role="timer" aria-live="off">支付剩余时间 <strong id="mk-order-countdown" data-tone="'+clock.tone+'">'+clock.label+'</strong></p>';
  };
  const orderStoreName=o=>store(o.store_id)?.name||'已选择门店';
  const orderUnitName=o=>o.unit_ids.map(id=>unit(id)?.name||'仓位方案').join('、');
  const orderLine=(label,value)=>'<div class="mk-order-line"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>';
  function orderBrief(o){
    return '<article class="mk-order-list-row"><div class="mk-order-list-meta"><b>'+esc(orderStoreName(o))+'</b><span class="mk-order-badge '+orderStatusTone(o.status)+'">'+esc(orderStatusLabel(o.status))+'</span></div>'
      +'<p class="mk-order-id">订单号 '+esc(readableOrderNo(o.id))+'</p>'
      +'<div class="mk-order-list-main"><span>'+esc(orderUnitName(o))+' · '+esc(o.term_months)+'个月</span><b>'+money(o.payable)+'</b></div>'
      +button('orderDetail','查看订单详情',o.id,'mk-order-list-link')+'</article>';
  }
  function renderM01(){
    const orders=MK_LIFECYCLE_CONTRACT_V1.history(state());
    return '<div class="view-title view-title-primary"><strong>我的</strong></div><div class="mk-orders">'
      +'<div class="mk-order-heading"><h2>我的订单</h2><p>查看用仓进度与订单服务</p></div>'
      +(orders.length?'<section class="mk-order-list">'+orders.map(orderBrief).join('')+'</section>'
        :'<div class="mk-order-empty"><b>还没有用仓订单</b><p>找到合适的门店和仓位，即可开始下单。</p>'+button('go','去附近门店','S01','mk-order-primary')+'</div>')
      +'<div class="mk-order-bottom">'+button('go','查看全部订单','OH01','mk-order-text-button')+'</div></div>';
  }
  function renderO03(){
    const os=MK_LIFECYCLE_CONTRACT_V1.history(state());
    const o=selectedOrderId?MK_LIFECYCLE_CONTRACT_V1.orderById(state(),selectedOrderId):os[0];
    let html=title('订单详情','M01')+'<div class="mk-orders mk-order-details">';
    if(!o)return html+'<div class="mk-order-empty"><b>暂无可查看的订单</b><p>请从我的订单列表选择需要查看的订单。</p>'+button('go','返回我的订单','M01','mk-order-primary')+'</div></div>';
    html+='<section class="mk-order-summary"><div class="mk-order-summary-top"><span class="mk-order-badge '+orderStatusTone(o.status)+'">'+esc(orderStatusLabel(o.status))+'</span><span class="mk-order-number">订单号 '+esc(readableOrderNo(o.id))+'</span></div>'
      +'<h2>'+esc(orderStoreName(o))+'</h2><p>'+esc(orderUnitName(o))+'</p>'
      +'<div class="mk-order-total"><span>'+esc(o.status==='expired'?'原订单金额（已失效）':'订单应付金额')+'</span><strong>'+money(o.payable)+'</strong></div></section>';
    html+='<section class="mk-order-section"><h3>用仓信息</h3>'
      +orderLine('用仓门店',orderStoreName(o))
      +orderLine('仓位类型',orderUnitName(o))
      +orderLine('约定租期',o.term_months+'个月');
    if(o.start_date)html+=orderLine('起租日期',o.start_date);
    html+='</section>';
    if(o.status==='paid_simulated'){
      const v=core.lifecycleView(o.id);
      html+='<section class="mk-order-section"><h3>租赁进度</h3>'
        +orderLine('当前状态',leaseStatusLabel(v.lease_status))
        +orderLine('累计租期',v.total_months+'个月')
        +(v.end_date?orderLine('租期至',v.end_date):'')
        +orderLine('押金进度',depositStatusLabel(v.deposit_status))+'</section>'
        +'<section class="mk-order-services"><h3>订单服务</h3><div class="mk-order-action-grid">'
        +button('go','续租','RN01','mk-order-action')+button('go','退租/到期','EX01','mk-order-action')
        +button('go','押金进度','DP01','mk-order-action')+button('go','申请发票','IV01','mk-order-action')
        +'</div></section>';
    }else{
      html+='<section class="mk-order-section"><h3>订单进度</h3>';
      if(o.status==='pending')html+=paymentClockHtml(o)+'<p class="mk-order-tip">请在倒计时结束前完成支付。</p>'+button('resumeOrder','继续支付','','mk-order-primary');
      else if(o.status==='expired')html+='<p class="mk-order-tip">支付时限已结束，原订单不可继续支付。需重新确认仓位和当前价格。</p>'+button('restartExpiredOrder','重新选择仓位','','mk-order-primary');
      else if(o.status==='payment_failed')html+='<p class="mk-order-tip">支付失败，原订单已失效，仓位已释放。需重新选择仓位并创建新订单。</p>'+button('restartExpiredOrder','重新选择仓位','','mk-order-primary');
      else html+='<p class="mk-order-tip">此订单不能继续支付，请返回门店重新选择。</p>';
      html+='</section>';
    }
    return html+'<div class="mk-order-bottom">'+button('go','返回我的订单','M01','mk-order-text-button')+'</div></div>';
  }
  function renderOH01(){
    const os=MK_LIFECYCLE_CONTRACT_V1.history(state());
    return title('订单记录','M01')+'<div class="mk-orders">'
      +'<div class="mk-order-heading"><h2>全部订单</h2><p>按最近订单排序</p></div>'
      +(os.length?'<section class="mk-order-list">'+os.map(orderBrief).join('')+'</section>'
        :'<div class="mk-order-empty"><b>暂无订单记录</b><p>先去附近门店看看可用仓位。</p>'+button('go','去附近门店','S01','mk-order-primary')+'</div>')
      +'<div class="mk-order-bottom">'+button('go','返回我的订单','M01','mk-order-text-button')+'</div></div>';
  }
  // Preserve the in-progress renewal field across harmless screen re-renders (auth/status refresh).
  function renderLifecycle(page){const id=lifecycleId();return MK_LIFECYCLE_UI_V1.render(page,core,id,{esc,button,title,money,reviewMode,renewalDraft:renewalDraftByOrder[id]??null});}
  const functions={S01:renderS01,S02:renderS02,RESULT:renderResult,M01:renderM01,O03:renderO03,OH01:renderOH01,RN01:()=>renderLifecycle('RN01'),EX01:()=>renderLifecycle('EX01'),DP01:()=>renderLifecycle('DP01'),IV01:()=>renderLifecycle('IV01')};
    if(!functions[page]&&!framed[page])page='S01';
    document.body.classList.toggle('br04-mode',!!framed[page]);$('#screen').className='screen page-'+page;
    if(page==='S01'&&r2Mode()){
      const f=$('#s01-r2-frame');
      if(!f||was!==page)$('#screen').innerHTML='<iframe id="s01-r2-frame" class="br04-frame s01-r2-frame" style="height:calc(100% - 74px)" title="附近门店" src="s01-r2-live.html"></iframe>'+footer();
      else {try{f.contentWindow.S01_R2_REFRESH?.();}catch{}}
    }else if(page==='O01'&&!core.authorized()){$('#screen').innerHTML=`<section class="phone-route-lock"><h2>确认订单</h2><p>验证手机号后继续，您的容量、租期和仓位已保留。</p>${button('phoneOrder','验证并继续')}${button('go','返回选择','QUICK','outline')}</section>`;}else if(framed[page]){
      const f=$('#br04-frame');
      if(!f||was!==page)$('#screen').innerHTML=`<iframe id="br04-frame" class="br04-frame" title="${{S5:'租期与推荐',BOOKING:new URLSearchParams(location.search).get('mode')==='advisor'?'顾问咨询':'预约用仓',QUICK:'快捷下单',O01:'确认订单'}[page]}" src="br04/${framed[page]}/index.html?v=VA04"></iframe>`;
      else {try{f.contentWindow.BR04_REFRESH?.();}catch{}}
    } else $('#screen').innerHTML=`<div id="scroll" class="scroll demo-scroll">${notice?`<p class="notice" role="status">${esc(notice)}</p>`:''}${functions[page]()}</div>${page==='M01'?footer():''}`;
    displayedPage=page;
    $('#overlay-root').innerHTML=modalHtml();if(r2Mode()){R2.cleanCopy($('#screen'));R2.cleanCopy($('#overlay-root'));}if(modal)$('#overlay-root').querySelector('button,input')?.focus();$('#scenario').value=state().scenario;$('#auth-state').textContent={anonymous:'未授权',pending:'待授权',verified:'本地已验证',expired:'已过期',denied:'已拒绝',failed:'接口失败'}[state().auth.status];
    if($('#scroll'))$('#scroll').scrollTop=positions[page]||0;
  }
  // Restore keyboard focus after an ordinary modal closes, including the S01 R2 child iframe.
  // Keep a selector rather than a DOM node: S02's content can be replaced during render().
  let modalReturnTarget=null;
  function restoreModalFocus(){
    const target=modalReturnTarget;modalReturnTarget=null;
    if(!target)return;
    requestAnimationFrame(()=>{
      try{
        const source=target.scope==='r2'?$('#s01-r2-frame')?.contentDocument:document;
        const node=target.scope==='r2'
          ?(target.kind==='filter'?source?.querySelectorAll('.filter')[target.index]:source?.querySelector(target.selector))
          :[...document.querySelectorAll('[data-action]')].find(el=>el.dataset.action===target.action&&el.dataset.value===target.value);
        if(node&&node.isConnected&&typeof node.focus==='function')node.focus({preventScroll:true});
      }catch{} // Focus repair must never interfere with the booking and payment state machine.
    });
  }
  function requestPhone(intent='QUOTE'){return phoneAuth.verify(intent);}
  function choose(ids){const r=state().requirement;if(ids.length===1&&r.capacity_m3!==null&&unit(ids[0])?.volume<r.capacity_m3){modal='capacityMismatch';notice='';render();return;}if(!r.term_confirmed){pending=ids;modal='term';notice='请选择租期';render();return;}if(!r.capacity_m3)core.setRequirement(core.fixture.units.filter(u=>ids.includes(u.id)).reduce((n,u)=>n+u.volume,0),r.term_months,true);core.select(ids);persist();phoneAuth.run('ORDER','CHOOSE_UNIT',()=>go('O01'));}
  const handlers={setR2Region(v){if(v!=='all'&&!s01R2Bridge.regions().includes(v))return;r2Filters.region=v;saveR2Filters();modal=null;render();},r2Search(){modal='r2-search';render();$('#r2-search-query')?.focus();},r2EditDemand(){window.SIM_DEMO.editRequirement();},r2SearchClear(){visual.keyword='';saveVisual();render();$('#r2-search-query')?.focus();},setR2Capacity(v){if(!R2.capacities.some(x=>x[0]===v))return;const r=state().requirement;const minimum={all:null,mini:0.5,small:1,medium:3,large:6,extra:10}[v];core.setRequirement(minimum,r.term_months,r.term_confirmed);r2Filters.capacity=v;saveR2Filters();modal=null;render();},toggleStore(id){visual.expandedStoreIds=visual.expandedStoreIds.includes(id)?visual.expandedStoreIds.filter(x=>x!==id):[...visual.expandedStoreIds,id];saveVisual();render();},editCapacity(){window.SIM_DEMO.editRequirement();},mine(){go('M01');},orderDetail(id){selectedOrderId=id;sessionStorage.setItem('mk_lifecycle_selected_order_v1',id);go('O03');},resumeOrder(){const o=state().orders.find(x=>x.id===selectedOrderId);if(!o||o.status!=='pending'){notice='该订单已不能继续支付，请查看最新状态';render();return;}const updated=core.resumePendingOrder(o.id);persist();if(updated.status!=='pending'){notice=updated.status==='expired'?'订单已超时，请重新下单':'仓位或价格已失效，请重新选仓';render();return;}go('O01');},restartExpiredOrder(){
      const o=state().orders.find(x=>x.id===selectedOrderId);
      if(!o||!['expired','payment_failed'].includes(o.status)){notice='订单状态已变化，请重新查看';render();return;}
      let draft={};try{draft=JSON.parse(sessionStorage.getItem('mk_br04_ui_v2')||'{}')||{};}catch(_){}
      delete draft.quick;sessionStorage.setItem('mk_br04_ui_v2',JSON.stringify(draft));
      sessionStorage.setItem('mk_h01_reorder_intent_01',JSON.stringify({previous_order_id:o.id,source:'O03',created_at:Date.now()}));
      go('QUICK');
    },recoverFailedOrder(){const o=state().orders.find(x=>x.id===selectedOrderId);if(!o||o.status!=='payment_failed'){notice='订单状态已更新，请从门店重新选择';render();return;}go('S01');},requestRenewal(){const input=$('#renew-months');if(!input)return;const raw=input.value.trim(),months=Number(raw),v=core.lifecycleView(lifecycleId()),max=Math.max(0,60-v.total_months);const error=message=>{let node=$('#renew-error');if(!node){node=document.createElement('p');node.id='renew-error';node.setAttribute('role','alert');node.className='mk-order-tip';input.closest('label').insertAdjacentElement('afterend',node);}node.textContent=message;input.setAttribute('aria-invalid','true');input.focus();};if(!raw||!Number.isInteger(months)||months<1||months>max){error('请输入1–'+max+'个月的整数，累计租期不得超过60个月');return;}try{core.lifecycleRequestRenewal(lifecycleId(),months);delete renewalDraftByOrder[lifecycleId()];render();}catch(e){error(e.message==='RENEWAL_ALREADY_PENDING'?'已有续租需求正在处理，请勿重复提交':'当前状态无法提交此续租申请，请检查订单和租期');}},reviewRenewal(reqId){core.lifecycleReviewQuote(lifecycleId(),reqId,Number($('#renew-review-price').value),reviewMode);render();},confirmRenewal(reqId){core.lifecycleConfirmRenewal(lifecycleId(),reqId);render();},requestExit(){core.lifecycleRequestExit(lifecycleId(),$('#exit-type').value,$('#exit-date').value);render();},requestInspection(){core.lifecycleRequestInspection(lifecycleId());render();},reviewInspectPass(){core.lifecycleReviewInspection(lifecycleId(),'passed',reviewMode);render();},reviewInspectFail(){core.lifecycleReviewInspection(lifecycleId(),'failed',reviewMode);render();},reviewRefund(){core.lifecycleReviewRefund(lifecycleId(),reviewMode);render();},requestInvoice(){core.lifecycleRequestInvoice(lifecycleId(),$('#invoice-payment').value,{kind:$('#invoice-kind').value,title:$('#invoice-title').value,email:$('#invoice-email').value,tax_id:$('#invoice-tax').value});render();},contactContinue(){core.setContact($('#contact-phone').value);modal=null;if(Array.isArray(pending)){const ids=pending;pending=null;choose(ids);}else if(state().selected.length)go('O01');else{notice='联系方式已保存，请继续选择门店与仓位';render();}},sort(){modal='sort';render();},setSort(v){if(v==='distance'&&!demoDistanceEnabled){notice='尚未取得出发位置，暂不能按距离排序';modal=null;render();return;}if(v==='price'&&!core.authorized()){phoneAuth.run('QUOTE','PRICE_SORT',()=>handlers.setSort(v));return;}visual.sort=v;modal=null;saveVisual();render();},serviceFilter(){modal='serviceFilter';render();},setService(v){visual.service=v;modal=null;saveVisual();render();},clearFilters(){resetVisualFilters();render();},category(v){visual.category=v;saveVisual();render();},detailTab(v){if(!['可选仓位','服务设施','交通路线'].includes(v))return;visual.tab=v;saveVisual();render();},s02TravelMode(v){visual.travelMode=v;saveVisual();render();},s02OpenMap(){
      const s=store(state().storeId);if(!s)return;
      const mode={transit:'bus',drive:'car',walk:'walk',bike:'ride'}[visual.travelMode]||'car';
      const coordinate=s.geo?.route_candidate?[s.geo.longitude,s.geo.latitude]:null;
      const valid=coordinate&&coordinate.length===2&&coordinate.every(x=>Number.isFinite(Number(x)))&&
        Number(coordinate[0])>70&&Number(coordinate[0])<140&&Number(coordinate[1])>15&&Number(coordinate[1])<55;
      const url=valid?
        'https://uri.amap.com/navigation?'+new URLSearchParams({
          from:'',to:coordinate.join(',')+','+s.name,mode,src:'minikoala',callnative:'1'
        }).toString():
        'https://uri.amap.com/search?'+new URLSearchParams({
          keyword:s.geo?.destination_query||[s.name,s.address].filter(Boolean).join(' '),city:s.city||'',view:'map',callnative:'1'
        }).toString();
      const win=window.open(url,'_blank','noopener,noreferrer');if(!win)location.href=url;
    },gallery(){const s=store(state().storeId);if(!s)return;const n=s02PhotoList(s).length;visual.gallery=(visual.gallery+1)%Math.max(1,n);saveVisual();render();},favorite(v){visual.favorites=visual.favorites.includes(v)?visual.favorites.filter(id=>id!==v):[...visual.favorites,v];saveVisual();render();},storeFavorite(){const id=state().storeId;visual.storeFavorites=visual.storeFavorites.includes(id)?visual.storeFavorites.filter(v=>v!==id):[...visual.storeFavorites,id];saveVisual();render();},navBooking(){modal='navBooking';render();},navigation(){modal='navigation';render();},share(){modal='share';render();},async copyShare(){try{await navigator.clipboard.writeText(location.href);notice='门店链接已复制';modal=null;render();}catch{notice='请选中并复制上方链接';render();}},saved(){modal='saved';render();},home(){clearS5Origin();persist();location.href='home.html';},go:v=>go(v),advisor(){sessionStorage.setItem('mk_advisor_context_v3',JSON.stringify({service_source:'advisor'}));go('BOOKING');},estore(){sessionStorage.setItem('mk_advisor_context_v3',JSON.stringify({service_source:'estore',capacity_hint:state().requirement.capacity_m3?state().requirement.capacity_m3+'m³':'',term_hint:state().requirement.term_confirmed?state().requirement.term_months+'个月':''}));persist();location.href='index.html?page=BOOKING&mode=advisor';},store(v){core.setReturn(page==='S5'?'S5':'S01');go('S02',v);},city(){modal='city';render();},setCity(v){clearS5Origin();sessionStorage.removeItem(S01_SCROLL_KEY);core.setCity(v);resetVisualFilters();r2Filters.region='all';r2Filters.maxKm=null;r2Filters.services=[];r2Filters.quick=[];r2Filters.visibleLimit=10;saveR2Filters();go('S01');},phone:()=>requestPhone(),phoneOrder:()=>phoneAuth.run('ORDER','ENTER_O01',()=>render()),
    close(){if(modal==='phone'&&state().auth.status==='pending')core.resolvePhone('denied');modal=null;render();restoreModalFocus();},term(){modal='term';render();},setTerm(v){const r=state().requirement;core.setTerm(Number(v));notice='';modal=null;if(Array.isArray(pending)){const ids=pending;pending=null;choose(ids);}else render();},customTerm(){handlers.setTerm($('#custom-term').value);},choose(v){choose(v.split(','));},
    quote(){phoneAuth.run('QUOTE','REQUEST_QUOTE',()=>{core.quote();notice='本次报价已更新。';render();});},submit(){phoneAuth.run('ORDER','SUBMIT_ORDER',()=>{const o=core.submit();lastOrder=o.id;resultKind='order';sessionStorage.setItem('mk_sim_result_kind','order');go('RESULT');});},paySuccess(){core.pay(lastOrder||state().orders.at(-1).id,'success');render();},payFailed(){core.pay(lastOrder||state().orders.at(-1).id,'failed');render();},
    lead(){core.saveLead($('#booking-address').value);lastOrder=null;resultKind='lead';sessionStorage.setItem('mk_sim_result_kind','lead');go('RESULT');},resetAuth(){core.revokePhone();render();},resetScenario(){core.setScenario(state().scenario);resetVisualFilters();sessionStorage.removeItem('mk_br04_ui_v2');['mk_cap_draft_v3','mk_items_draft_v3','mk_entry_context_v3'].forEach(k=>sessionStorage.removeItem(k));pending=null;lastOrder=null;go('S01',null,true);}
  };
  document.addEventListener('click',e=>{const edit=e.target.closest('[data-edit-demand]');if(edit){e.preventDefault();window.SIM_DEMO.editRequirement();return;}const b=e.target.closest('[data-action]');if(b){e.preventDefault();const hadModal=!!modal;act(()=>handlers[b.dataset.action]?.(b.dataset.value));if(!hadModal&&modal)modalReturnTarget={scope:'parent',action:b.dataset.action,value:b.dataset.value};return;}const c=e.target.closest('[data-store]');if(c){e.preventDefault();act(()=>handlers.store(c.dataset.store));}});
  document.addEventListener('input',e=>{if(e.target.id==='renew-months'){renewalDraftByOrder[lifecycleId()]=e.target.value;e.target.removeAttribute('aria-invalid');$('#renew-error')?.remove();return;}if(e.target.id==='r2-search-query'){visual.keyword=e.target.value.trimStart().slice(0,60);saveVisual();$('#s01-r2-frame')?.contentWindow?.S01_R2_REFRESH?.();return;}if(e.target.id!=='store-search')return;const value=e.target.value,pos=e.target.selectionStart;visual.keyword=value;saveVisual();render();const input=$('#store-search');input.focus();try{input.setSelectionRange(pos,pos);}catch{}});
  document.addEventListener('keydown',e=>{if(e.key==='Tab'&&modal){const controls=[...$('#overlay-root').querySelectorAll('button,input,a,select,textarea')].filter(x=>!x.disabled);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}if(['ArrowLeft','ArrowRight'].includes(e.key)&&e.target.matches('[role=tab]')){e.preventDefault();const tabs=[...document.querySelectorAll('[role=tab]')],next=tabs[(tabs.indexOf(e.target)+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length];handlers.detailTab(next.dataset.value);document.querySelector('[role=tab][aria-selected=true]')?.focus();}if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-store]')){e.preventDefault();act(()=>handlers.store(e.target.dataset.store));}if(e.key==='Escape'&&modal)handlers.close();});
  document.addEventListener('change',e=>{if(e.target.id==='start-date')act(()=>{core.setDate(e.target.value);render();});});
  $('#scenario').innerHTML=F.scenarios.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
  $('#scenario').addEventListener('change',e=>act(()=>{core.setScenario(e.target.value);resetVisualFilters();sessionStorage.removeItem('mk_br04_ui_v2');['mk_cap_draft_v3','mk_items_draft_v3','mk_entry_context_v3'].forEach(k=>sessionStorage.removeItem(k));positions={};pending=null;lastOrder=null;modal=null;go('S01',null,true);}));
  window.addEventListener('popstate',()=>{page=new URLSearchParams(location.search).get('page')||'S01';canonicalS01Url();document.documentElement.classList.toggle('r2-product',r2Mode());const id=new URLSearchParams(location.search).get('store');act(()=>{if(id)core.setStore(id);render();});});
  let lastStatus=state().auth.status;setInterval(()=>{const expired=core.expirePendingOrders();core.authorized();const status=state().auth.status;
    if(status!==lastStatus||expired){lastStatus=status;render();}
    else if(page==='O03'){
      const tick=$('#mk-order-countdown'),o=state().orders.find(x=>x.id===selectedOrderId);
      if(tick&&o?.status==='pending'&&Number.isFinite(Number(o.expiresAt))){const c=paymentTimeLeft(o.expiresAt);tick.textContent=c.label;tick.dataset.tone=c.tone;}
    }},1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
  const s01R2Bridge={
    storeView(id){const s=F.stores.find(x=>x.id===id);return s?r2View(s):null;},
    regions(){return [...new Set(F.stores.filter(s=>s.city===state().city).map(s=>r2View(s).district))].filter(Boolean);},
    snapshot(){
      const r=state().requirement;
      let stores=visibleS01Stores().filter(s=>r2Filters.region==='all'||r2View(s).district===r2Filters.region);
      const rowsFor=s=>(r.capacity_m3!==null?core.matchingUnits(s.id):F.units.filter(u=>u.store_id===s.id)).filter(u=>core.available(u)&&s.status==='open'&&R2.matches(u.volume,r2Filters.capacity)).sort((a,b)=>a.volume-b.volume);
      if(r2Filters.capacity!=='all')stores=stores.filter(s=>rowsFor(s).length);
      // For unconfigured demand, apply the shared recommendation policy only to stores
      // with an actually available size option. Unavailable stores stay in fallback;
      // the number of rows in the visual card must never re-rank the offers.
      if(visual.sort==='recommended'){
        const eligible=stores.filter(s=>rowsFor(s).length>0);
        const unavailable=stores.filter(s=>rowsFor(s).length===0);
        // In the isolated demo, presentation ranking follows the same per-store
        // seeded kilometers shown to users; this must not mark core location verified.
        const demoDistanceReady=!!F.synthetic; // Stable demonstration distances may rank, while location verification remains false.
        stores=[...REC.rank(eligible,{distanceVerified:F.distanceVerified||demoDistanceReady,costOf:s=>presentation.cubicReference(s)?.value??Infinity}).items,...unavailable];
      }
      if(visual.sort==='distance'&&demoDistanceEnabled){
        const kilometers=s=>displayedDistanceKm(s);
        const byKm=(a,b)=>kilometers(a)-kilometers(b)||String(a.id).localeCompare(String(b.id));
        const available=stores.filter(s=>rowsFor(s).length>0);
        const unavailable=stores.filter(s=>!rowsFor(s).length);
        stores=[...available.sort(byKm),...unavailable.sort(byKm)];
      }
      // Preserve an S5-selected district as a non-exclusive ranking preference on S01.
      // Keep the three approved top-level filters and let users browse all stores.
      const preferredDistrict=s5AreaPreference();
      if(preferredDistrict&&visual.sort==='recommended'&&stores.some(s=>r2View(s).district===preferredDistrict&&rowsFor(s).length)){
        stores=[...stores.filter(s=>r2View(s).district===preferredDistrict&&rowsFor(s).length),
          ...stores.filter(s=>!(r2View(s).district===preferredDistrict&&rowsFor(s).length))];
      }
      return {city:state().city,sourceNamespace:F.sourceNamespace||'SIM',
        distanceSortSource:F.distanceVerified?'VERIFIED_LOCATION':F.synthetic?'SYNTHETIC_FIXED':'DISABLED',
        distanceVerified:!!F.distanceVerified,
        authorized:core.authorized(),termConfirmed:r.term_confirmed,termMonths:r.term_months,
        keyword:visual.keyword,storeCount:stores.length,filters:{...r2Filters},
        filterLabels:[visual.sort==='price'?'价格优先':visual.sort==='distance'?'距离优先':'排序',r2Filters.maxKm!==null?r2Filters.maxKm+'km内':'距离',r2Filters.services.length?'已选服务':'服务'],filterActive:[visual.sort!=='recommended',r2Filters.maxKm!==null,r2Filters.services.length>0],
        servicesSelected:[...r2Filters.services],maxKm:r2Filters.maxKm,quickSelected:[...r2Filters.quick],
        requirement:{capacity:r.capacity_m3,term:r.term_confirmed?r.term_months:null},canReturnToS5:s01OriginFromS5(),distanceFilterEnabled:demoDistanceEnabled,
        visibleStoreCount:Math.min(stores.length,Math.max(2,Math.min(50,r2Filters.visibleLimit))),canLoadMore:stores.length>Math.max(2,Math.min(50,r2Filters.visibleLimit)),
        stores:stores.slice(0,Math.max(2,Math.min(50,r2Filters.visibleLimit))).map((s,rank)=>{
          const v=r2View(s);
          const hasVerifiedDistance=!!F.distanceVerified&&Number.isFinite(Number(s.distance))&&Number(s.distance)>=0;
          const termVisible=r.term_confirmed===true;
          const publicCubic=!termVisible?presentation.cubicReference(s):null;
          const publicTerm=F.pricing.homeReferenceTerm||12;
          return {id:s.id,name:s.name,...v,
            publicCubicPrice:publicCubic?.money||null,publicCubicTerm:publicTerm,
            distance:v.distance,
            distanceVerified:hasVerifiedDistance,
            units:rowsFor(s).slice(0,r.capacity_m3!==null?1:(rank===0?2:1)).map((u,i)=>{
              // Only the O01-equivalent central calculation may produce formal, whole-term rent.
              const amount=termVisible?core.amounts([u.id],r.term_months):null;
              // Unit rows show the actual selected unit's monthly amount, not the store-wide minimum per m³.
              const unitMonthly=termVisible?null:core.amounts([u.id],publicTerm).monthly_average;
              return {
                id:u.id,name:u.name,volume:u.volume,
                price:amount?money(amount.rent_total):money(unitMonthly),
                suffix:amount?'整期租金':'/月',
                priceKind:amount?'term':'unit_month',
                secondary:amount?'月均约 '+money(amount.monthly_average)+'/月':publicTerm+'个月租期',
                usage:'独立仓 · '+(u.volume<=3?'适合换季衣物、箱包':u.volume<=6?'适合家庭用品':'适合家具家电'),
                promo:u.promo_verified===true&&typeof u.promo_label==='string'?u.promo_label:'',available:core.available(u)
              };
            })};
        })};
    },
    filter(index){if(![0,1,2].includes(index))return;if(index===0||index===2)modalReturnTarget={scope:'r2',kind:'filter',index};act(()=>{pending=null;if(index===0)handlers.sort();else if(index===1){if(F.distanceVerified)handlers.setSort('distance');else{modal='r2-distance';render();}}else handlers.serviceFilter();});},
    action(name,value){
      const allowed=['store','choose','city','term','home','go','navigation','searchModal','estore','returnRecommend'];
      if(!allowed.includes(name))return false;
      act(()=>{
        if(name==='searchModal'){modalReturnTarget={scope:'r2',kind:'nav',selector:'.nav-more'};handlers.r2Search();}
        else if(name==='choose')handlers.choose(String(value));
        else if(name==='store')handlers.store(String(value));
        else if(name==='estore')handlers.estore();
        else if(name==='city'){modalReturnTarget={scope:'r2',kind:'nav',selector:'.nav-target'};handlers.city();}
        else if(name==='returnRecommend'){if(s01OriginFromS5())go('S5');}
        else if(name==='go'&&value==='CAP')window.SIM_DEMO.editRequirement();
        else if(name==='go'&&value==='S01')handlers.go('S01');
        else if(name==='go')return;
        else handlers[name](value);
      });return true;
    },
    search(text){visual.keyword=String(text||'').trimStart().slice(0,60);r2Filters.visibleLimit=10;saveR2Filters();saveVisual();act(()=>render());},
    setSort(value){if(!['recommended','distance','price'].includes(value))return;act(()=>handlers.setSort(value));},
    setRadius(value){const km=value===null?null:Number(value);if(km!==null&&(![1,3,5,10].includes(km)||!demoDistanceEnabled))return false;r2Filters.maxKm=km;r2Filters.visibleLimit=10;saveR2Filters();act(()=>render());return true;},
    setServices(values){const allowed=['近地铁','24小时存取','电梯直达','停车便利','控温防潮','小推车','全天监控'];r2Filters.services=Array.isArray(values)?[...new Set(values)].filter(v=>allowed.includes(v)):[];visual.service='all';r2Filters.visibleLimit=10;saveVisual();saveR2Filters();act(()=>render());},
    setQuick(value){if(!['promo','moving'].includes(value))return;r2Filters.quick=r2Filters.quick.includes(value)?r2Filters.quick.filter(v=>v!==value):[...r2Filters.quick,value];r2Filters.visibleLimit=10;saveR2Filters();act(()=>render());},
    loadMore(){r2Filters.visibleLimit=Math.min(50,r2Filters.visibleLimit+10);saveR2Filters();act(()=>render());},
    editDemand(){window.SIM_DEMO.editRequirement();}
  };
  const s5AreaKey='mk_s5_area_preference_v1';
  const s5AreaPreference=()=>{
    try{const v=JSON.parse(sessionStorage.getItem(s5AreaKey)||'null');return v&&v.city===state().city&&typeof v.district==='string'?v.district:'';}catch{return '';}
  };
  function s5SetArea(district=''){
    const city=state().city;
    if(district&&!F.stores.some(s=>s.city===city&&s.status==='open'&&s.district===district))return false;
    sessionStorage.setItem(s5AreaKey,JSON.stringify({city,district}));
    return true;
  }
  function s5SharedUnit(ids){
    const rows=ids.map(unit);
    if(!rows.length||rows.some(u=>!u))return null;
    const total=rows.reduce((n,u)=>n+Number(u.volume),0);
    const selected=rows.length===1?P.describe(rows[0],'S01').lines[0]:P.describe({...rows[0],volume:total},'S01').lines[0];
    const facts=rows.length===1?P.facts(rows[0]):null;
    return {ids:ids.slice(),volume:total,description:selected,
      available:rows.every(u=>core.available(u)),promo:facts?.promoLabel||'',stock:facts?.inventoryLine||''};
  }
  function s5SharedStore(id){
    const s=F.stores.find(s=>s.id===id);if(!s)return null;
    const v=r2View(s);
    return {id:s.id,name:s.name,address:v.address,district:v.district,
      photo:v.photo,services:v.services,distance:displayedDistanceKm(s),distanceVerified:F.distanceVerified};
  }
  window.SIM_DEMO={s01R2Bridge,presentation,s5SharedUnit,s5SharedStore,s5AreaPreference,s5SetArea,state:()=>core.state(),core,persist,navigate:go,order:choose,offers:candidateList,s5Offers:s5CandidateList,openStore(id,from){core.setReturn(from);go('S02',id);},openOrder(id){if(!state().orders.some(o=>o.id===id))throw Error('ORDER_NOT_FOUND');selectedOrderId=id;sessionStorage.setItem('mk_lifecycle_selected_order_v1',id);go('O03');},editRequirement(){persist();sessionStorage.setItem('mk_estimate_return_v4','index.html?page='+page+(page==='S02'?'&store='+encodeURIComponent(state().storeId):'')+(r2Mode()?'&s01_r2=1':''));const itemsFlow=['items_estimate','known_capacity_in_items_flow'].includes(state().requirement.source);if(itemsFlow)sessionStorage.setItem('mk_items_back_v1',sessionStorage.getItem('mk_estimate_return_v4'));window.location.assign(new URL(itemsFlow?'items.html':'cap.html',CENTRAL_DEMO_BASE).href);},requestPhone,phoneAuth,guarded:(intent,key,action)=>phoneAuth.run(intent,key,action)};
  // Direct H01 -> O01: validate and restore the specific pending order before rendering checkout.
  if(page==='O01'&&requestedOrderId){
    const target=state().orders.find(o=>o.id===requestedOrderId);
    if(target?.status==='pending'){
      const reopened=core.resumePendingOrder(requestedOrderId);
      persist();
      if(reopened.status!=='pending'){page='O03';history.replaceState({},'',location.pathname+'?page=O03&order='+encodeURIComponent(requestedOrderId));}
    }else{
      page=target?'O03':'M01';
      history.replaceState({},'',location.pathname+'?page='+page+(target?'&order='+encodeURIComponent(requestedOrderId):''));
    }
  }
  const initialStore=new URLSearchParams(location.search).get('store');act(()=>{if(initialStore)core.setStore(initialStore);render();});if(page==='O01'&&!core.authorized())phoneAuth.run('ORDER','DIRECT_O01',()=>render());
})();
