/* CAP-FIRST-ITEM-02: capacity-first entry and an explicit, single S5 submit. */
(function(){
  'use strict';
  const $=selector=>document.querySelector(selector);
  const categories=[
    ['suitcase','箱包',['luggage28','luggage24','luggage20','bag']],
    ['furniture','家具',['sofa3','bed180','wardrobe','dining','chair','coffee','tvcab','bookcase','crib']],
    ['electric','家电',['fridge','washer','appliance','printer']],
    ['organize','纸箱收纳',['box','bin','clothingBox','quilt','coat','toybox']],
    ['hobby','收藏乐器',['shoebox','figurebox','winebox','guitar','bicycle']],
    ['business','商家货品',['goodsbox','turnover','clothingPack','pallet','displayRack','shelf']],
    ['office','办公物资',['archiveBox','fileCab','officeChair','officeDesk','officeBox']],
    ['other','其他物品',['stroller']]
  ];
  const requestedCategory=new URLSearchParams(location.search).get('focusCategory');
  const assigned=new Set(categories.flatMap(group=>group[2]));
  if(assigned.size!==categories.flatMap(group=>group[2]).length)throw Error('物品分类存在重复编号');
  categories.at(-1)[2].push(...Object.keys(items).filter(id=>!assigned.has(id)&&!id.startsWith('est_custom_')));
  const scenes=[['household','家庭收纳'],['moving','搬家过渡'],['renovation','装修暂存'],['luggage','行李寄存'],['seasonal','换季收纳'],['collection','爱好收藏'],['merchant','商家库存'],['enterprise','企业物资']];
  let mode='category',category=requestedCategory==='all'||categories.some(group=>group[0]===requestedCategory)?requestedCategory:'suitcase',submitting=false;
  const originalLayout=currentLayout;
  currentLayout=function(){
    if(state.screen===4&&state.capFirstItemUi&&mode==='category'){
      const ids=category==='all'?categories.flatMap(group=>group[2]):categories.find(group=>group[0]===category)?.[2]||[];
      return {p1:['other','all'].includes(category)?[...ids,...Object.keys(items).filter(id=>id.startsWith('est_custom_'))]:ids,p2:[],p3:[]};
    }
    return originalLayout.apply(this,arguments);
  };
  const originalRenderItems=renderItems;
  renderItems=function(){
    const result=originalRenderItems.apply(this,arguments);
    if(state.capFirstItemUi&&state.screen===4){renderCatalog();renderCart();}
    return result;
  };
  const originalRenderLive=renderLive;
  renderLive=function(){
    const result=originalRenderLive.apply(this,arguments);
    if(state.capFirstItemUi&&state.screen===4)renderCart();
    return result;
  };
  const originalGo=go;
  go=function(){
    const result=originalGo.apply(this,arguments);
    if(state.screen===7)renderConfirmedSummary();
    return result;
  };

  function confirmed(){
    try{return JSON.parse(storageGet(REQUIREMENT_KEY)||'{}')}catch(e){return {}}
  }
  function renderConfirmedSummary(){
    const box=$('#capConfirmedSummary');if(!box)return;
    const saved=confirmed(),target=Number(saved.target_volume);
    if(!Number.isFinite(target)||target<=0){box.hidden=true;box.textContent='';return;}
    const source={manual:'手动填写',item_estimate:'物品估算',ai_assisted:'AI辅助'}[saved.source]||'已有需求';
    const min=Number(saved.min_volume),max=Number(saved.max_volume);
    const range=Number.isFinite(min)&&Number.isFinite(max)&&max>0?` · 估算区间 ${Number(min.toFixed(2))}–${Number(max.toFixed(2))}m³`:'';
    const term=Number(saved.term_months)>0?` · ${saved.term_months}个月`:' · 租期待选择';
    const items=Array.isArray(saved.item_snapshot)&&saved.item_snapshot.length?` · ${saved.item_snapshot.length}类物品可继续修改`:'';
    box.textContent=`最近确认：${target}m³ · ${source}${range}${term}${items}`;
    box.hidden=false;
  }
  function entryContext(){
    if(returnUnitContext){
      const unit=new URLSearchParams(returnUnitContext.query);
      return {originPage:'U01',storeId:unit.get('store')||'',unitId:unit.get('unit')||'',
        sizeOptionId:unit.get('sizeOption')||'',previousPage:unit.get('source')||''};
    }
    if(returnStoreContext)return {originPage:'S02',storeId:returnStoreContext.store,returnState:returnStoreContext.state,
      origin:returnStoreContext.origin,travel:returnStoreContext.travel,access:returnStoreContext.access};
    if(returnListContext)return {originPage:'S01',returnState:returnListContext.state,origin:returnListContext.origin,
      travel:returnListContext.travel,sort:returnListContext.sort,distance:returnListContext.distance,
      services:returnListContext.services,loaded:returnListContext.loaded,scroll:returnListContext.scroll};
    return {originPage:'H01'};
  }
  function submit(source,expectedScreen,demand){
    if(submitting||state.screen!==expectedScreen)return false;
    const target=Number(demand.target_volume),min=Number(demand.min_volume),max=Number(demand.max_volume);
    if(!Number.isFinite(target)||target<.5||target>200||!Number.isFinite(min)||min<0||
        !Number.isFinite(max)||max<0||(max>0&&max<min)){
      toast('容量或估算区间无效，请修改后再试');return false;
    }
    submitting=true;
    const previous=confirmed();
    const token='CAP2-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
    const context=entryContext();
    try{
      state.capFirstCommitting=true;
      saveRequirementSnapshot({...demand,source,entry_context:context,cap_first_submission_id:token,
        customer_type:demand.customer_type||previous.customer_type||'personal',
        search_origin_key:demand.search_origin_key||previous.search_origin_key||context.origin||'guomao',
        travel_mode:demand.travel_mode||previous.travel_mode||context.travel||'drive',
        usage_location:demand.usage_location||previous.usage_location||''});
      state.capFirstCommitted=true;
      state.capFirstConfirmed=confirmed();
      state.continuityResume=false;
      state.usageTargetOverride=target;
      state.r113StoreId=null;state.r113UnitId=null;
      go(5);
      return true;
    }catch(error){
      console.error('CAP-FIRST-ITEM-02 submit failed',error);
      toast('暂时无法保存需求，请重试');
      return false;
    }finally{
      state.capFirstCommitting=false;
      submitting=false;
    }
  }
  function submitManual(){
    const input=$('#knownInput'),raw=input.value.trim();
    if(!/^\d+(?:\.\d{1,2})?$/.test(raw)||Number(raw)<.5||Number(raw)>200){
      showKnownError('knownInputError','请输入0.5–200m³的有效容量，最多两位小数。','knownInput');return false;
    }
    clearKnownError('knownInputError');
    const k=Number(raw),mode=['about','atleast','within'].includes(state.knownMode)?state.knownMode:'about';
    const prior=confirmed();
    const term=Number.isInteger(state.term)&&state.term>=1&&state.term<=60?state.term:0;
    state.flow='known';state.knownSize=k;
    return submit('manual',7,{target_volume:k,min_volume:mode==='within'?0:mode==='atleast'?k:k*.92,
      max_volume:mode==='atleast'?0:mode==='within'?k:k*1.08,term_months:term,size_mode:mode,
      customer_type:state.customer||prior.customer_type||'personal',scene:'',item_snapshot:[],
      item_summary:'',item_constraints:[],has_oversize:false,item_review_status:'not_applicable',
      fit_status:'VOLUME_ONLY',calculation_model:'DIRECT_CAPACITY_INPUT'});
  }
  function itemSelection(){
    return Object.entries(state.quantities).filter(([id,q])=>items[id]&&Number.isInteger(Number(q))&&Number(q)>0)
      .map(([id,qty])=>{
        const variantId=state.variants[id],variant=items[id].variants[variantId];
        return {item_id:id,variant_id:variantId,quantity:Number(qty),unit_volume_m3:Number(variant?.vol)};
      });
  }
  function submitItems(){
    if(state.screen!==4)return false;
    const positive=Object.entries(state.quantities).filter(([,q])=>Number(q)>0);
    if(positive.some(([id,q])=>!items[id]||!Number.isInteger(Number(q))||Number(q)>99)){
      toast('物品数量异常，请检查清单');return false;
    }
    const selection=itemSelection();
    if(!selection.length){toast('请选择至少一件物品');return false}
    if(selection.some(row=>!Number.isFinite(row.unit_volume_m3)||row.unit_volume_m3<=0||row.quantity>99)){
      toast('物品规格或数量异常，请检查清单');return false;
    }
    if(rawVolume()<=0){toast('请选择至少一件物品');return false}
    state.flow='estimate';
    const result=calc();
    if(![result.target,result.min,result.max].every(Number.isFinite)||result.target<.5||result.target>200||result.min<0||result.max>200){
      toast('估算范围超出支持值，请调整物品或咨询顾问');return false;
    }
    const constraints=window.MINI_KOALA_PHYSICAL_FIT_V1.constraintsFromSelection(items,state.quantities,state.variants);
    const previous=confirmed();
    const term=Number.isInteger(state.term)&&state.term>=1&&state.term<=60?state.term:0;
    state.itemsConfirmed=true;
    return submit('item_estimate',4,{target_volume:result.target,min_volume:result.min,max_volume:result.max,
      term_months:term,size_mode:'about',customer_type:state.customer||previous.customer_type||'personal',
      scene:state.scene||'',item_snapshot:selection,
      item_summary:selection.map(row=>`${items[row.item_id].name}×${row.quantity}`).join('、'),
      item_constraints:constraints,has_oversize:constraints.some(row=>row.risk_level==='large'),
      item_review_status:'selected_by_customer',fit_status:'DIMENSIONS_PENDING',
      calculation_model:'BASE_ESTIMATOR_CALC_2026_10_15',moving_support:state.movingSupport||previous.moving_support||'unknown'});
  }
  function ensureItemUI(){
    if($('#capItemNav'))return;
    const head=$('#s4 .ux-a2-section-head');
    head.insertAdjacentHTML('afterend',`<div class="cap-item-modes" role="group" aria-label="浏览物品方式"><button type="button" data-cap-mode="category">按类别</button><button type="button" data-cap-mode="scene">按场景</button></div><nav id="capItemNav" class="cap-item-nav" aria-label="物品分类"></nav>`);
    const bottom=$('#s4 .bottom');
    bottom.insertAdjacentHTML('beforebegin',`<button type="button" id="capCartToggle" class="cap-cart-toggle" aria-expanded="false">购物车 · 0件</button><div id="capCartSheet" class="cap-cart-sheet" hidden><div class="cap-cart-head"><b>已选物品</b><button type="button" id="capCartClose" aria-label="关闭购物车">×</button></div><div id="capCartRows"></div><div id="capCartTotal"></div></div>`);
    $('#capCartToggle').onclick=()=>{
      const sheet=$('#capCartSheet');sheet.hidden=!sheet.hidden;
      $('#capCartToggle').setAttribute('aria-expanded',String(!sheet.hidden));
    };
    $('#capCartClose').onclick=()=>{$('#capCartSheet').hidden=true;$('#capCartToggle').setAttribute('aria-expanded','false')};
    $('#s4 .cap-item-modes').onclick=event=>{
      const button=event.target.closest('[data-cap-mode]');if(!button)return;
      mode=button.dataset.capMode;renderItems();renderLive();
    };
    $('#capItemNav').onclick=event=>{
      const button=event.target.closest('[data-category],[data-scene]');if(!button)return;
      if(mode==='category')category=button.dataset.category;
      else{state.scene=button.dataset.scene;state.amount=null;state.customer=['merchant','enterprise'].includes(state.scene)?state.scene:'personal'}
      renderItems();renderLive();
    };
    $('#capCartRows').onclick=event=>{
      const button=event.target.closest('[data-cart-id]');if(!button)return;
      const id=button.dataset.cartId,step=Number(button.dataset.step),old=Number(state.quantities[id]||0);
      state.quantities[id]=Math.max(0,Math.min(99,old+step));
      invalidateUsageRequirement();renderItems();renderLive();
    };
  }
  function renderCatalog(){
    const controls=$('#s4 .cap-item-modes');
    controls?.querySelectorAll('button').forEach(button=>button.classList.toggle('active',button.dataset.capMode===mode));
    const nav=$('#capItemNav');if(!nav)return;
    const options=mode==='category'?[['all','全部'],...categories.map(([id,label])=>[id,label])]:scenes;
    nav.innerHTML=options.map(([id,label])=>`<button type="button" ${mode==='category'?`data-category="${id}"`:`data-scene="${id}"`} class="${(mode==='category'?category:state.scene)===id?'active':''}">${label}</button>`).join('');
  }
  function renderCart(){
    const toggle=$('#capCartToggle'),rows=$('#capCartRows'),total=$('#capCartTotal');
    if(!toggle||!rows||!total)return;
    const selected=itemSelection(),count=selected.reduce((sum,row)=>sum+row.quantity,0);
    toggle.textContent=`购物车 · ${count}件 · 约${Number(rawVolume().toFixed(2))}m³`;
    rows.innerHTML=selected.map(row=>`<div class="cap-cart-row"><span>${items[row.item_id].name} · ${row.quantity}件 · ${Number((row.quantity*row.unit_volume_m3).toFixed(2))}m³</span><div><button type="button" data-cart-id="${row.item_id}" data-step="-1">−</button><button type="button" data-cart-id="${row.item_id}" data-step="1">＋</button></div></div>`).join('')||'<p>尚未选择物品。</p>';
    const result=calc();total.textContent=selected.length?`建议 ${Number(result.min.toFixed(2))}–${Number(result.max.toFixed(2))}m³；按母版计算引擎。`:'';
    $('#toUsageBtn').textContent='查看适合仓位';
  }
  function openItems(){
    ensureItemUI();
    if(!state.capItemsInitialized){
      const saved=confirmed(),snapshot=Array.isArray(saved.item_snapshot)&&saved.source==='item_estimate'?saved.item_snapshot:[];
      let draft={};try{draft=JSON.parse(storageGet('mini_storage_estimator_draft_v1')||'{}')}catch(e){}
      const sameBase=(draft.capFirstConfirmed?.cap_first_submission_id||'')===(saved.cap_first_submission_id||'');
      if(draft.capFirstItemUi&&sameBase&&draft.quantities&&typeof draft.quantities==='object'){
        state.quantities=Object.fromEntries(Object.entries(draft.quantities).filter(([id])=>items[id]));
        for(const [id,variant] of Object.entries(draft.variants||{}))if(items[id]?.variants[variant])state.variants[id]=variant;
        if(sceneCfg[draft.scene])state.scene=draft.scene;
        if(Number.isInteger(Number(draft.term))&&Number(draft.term)>=1&&Number(draft.term)<=60)state.term=Number(draft.term);
      }else if(snapshot.length){
        state.quantities=Object.fromEntries(snapshot.filter(row=>items[row.item_id]).map(row=>[row.item_id,Number(row.quantity)]));
        for(const row of snapshot)if(items[row.item_id]?.variants[row.variant_id])state.variants[row.item_id]=row.variant_id;
      }
      state.capItemsInitialized=true;
    }
    state.capFirstCommitted=false;state.capFirstItemUi=true;state.flow='estimate';
    state.scene=sceneCfg[state.scene]?state.scene:'household';
    state.customer=state.customer||confirmed().customer_type||'personal';
    state.amount=null;
    go(4);
  }
  $('#capFirstItems').onclick=openItems;
  $('#capFirstAi').onclick=()=>{
    const q=new URLSearchParams(location.search);q.set('source','cap_first_item_02');
    location.href=ai01File+'?'+q.toString();
  };
  $('#capFirstAdvisor').onclick=()=>openLeadCapture({node:'CAP_FIRST_ADVISOR',title:'咨询仓储顾问',
    desc:'可直接咨询，不需要先填写容量。',allowSkip:true,context:{...entryContext(),target_volume:state.knownSize||null}});
  window.MINI_KOALA_CAP_FIRST_ITEM_02={openItems,submitManual,submitItems};
  renderConfirmedSummary();
  if(new URLSearchParams(location.search).get('entry')==='item')openItems();
})();
