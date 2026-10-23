(function(){
  if(!document.querySelector('#s4')||!window.renderItems)return;
  const $=selector=>document.querySelector(selector);
  const catalogIds=Object.keys(items);
  const categories={
    furniture:['sofa3','bed180','wardrobe','dining','chair','coffee','tvcab','bookcase','crib','officeChair','officeDesk','fileCab'],
    appliances:['fridge','washer','appliance','printer'],
    containers:['box','luggage28','luggage24','luggage20','bag','bin','clothingBox','quilt','coat','stroller','toybox'],
    collections:['bicycle','shoebox','figurebox','winebox','guitar'],
    business:['goodsbox','turnover','clothingPack','pallet','displayRack','shelf','archiveBox','officeBox']
  };
  const extraIds=new Set(state.continuityDraft?Object.keys(state.quantities||{}).filter(id=>id.startsWith('est_custom_')):[]);
  let activeScene=state.scene;
  let customSeq=state.continuityDraft?Math.max(0,...Object.keys(state.customItems||{}).map(id=>Number(id.split('_').pop())||0)):0;
  let editingCustomId=null;

  const style=document.createElement('style');
  style.textContent=`
    #estDiscovery{margin:17px 0 20px;padding:14px;border:1px solid #D7E5DB;border-radius:16px;background:#FFF}
    #estDiscovery h2{margin:0 0 5px;font-size:16px;line-height:23px;color:#1F2923}
    #estDiscovery p{margin:0 0 11px;font-size:12px;line-height:18px;color:#59645E}
    #estDiscovery input,#estDiscovery select{box-sizing:border-box;width:100%;min-height:44px;padding:9px 11px;border:1px solid #CFE1D6;border-radius:10px;background:#FFF;font-size:14px}
    #estDiscovery .est-results{max-height:220px;overflow:auto;margin:7px 0}
    #estDiscovery button{min-height:44px;border:1px solid #CFE1D6;border-radius:10px;background:#FFF;color:#2F6B4F;font-size:13px;font-weight:650;cursor:pointer}
    #estDiscovery .est-results button{display:block;width:100%;margin:5px 0;text-align:left;padding:8px 11px}
    #estDiscovery .est-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    #estDiscovery .est-actions button{padding:7px}
    #estDiscovery .est-form{margin-top:11px;padding-top:11px;border-top:1px solid #E6E7E3}
    #estDiscovery .est-form[hidden],#estDiscovery .est-results[hidden]{display:none}
    #estDiscovery .est-dims{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
    #estDiscovery label{display:block;margin:7px 0 4px;font-size:12px;color:#59645E}
    #estDiscovery .est-check{display:flex;align-items:center;gap:7px;margin:9px 0;line-height:18px}
    #estDiscovery .est-check input{width:18px;height:18px;min-height:18px;flex:0 0 18px}
    #estDiscovery .est-save{width:100%;background:#2F6B4F!important;color:#FFF!important}
    #estDiscovery .est-error{min-height:19px;margin:5px 0;color:#B85A16;font-size:12px}
    #estExtraList{margin-top:13px}
    #estExtraList .kv{margin-bottom:8px}
    #estExtraList .qty button{min-width:44px;min-height:44px}
    #s4 .est-method-note{font-size:11px;line-height:17px;color:#59645E;margin:-10px 0 15px}
    #capacityMinus:disabled{opacity:.45;cursor:not-allowed}
    @media(max-width:360px){#estDiscovery .est-actions{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const box=document.createElement('section');
  box.id='estDiscovery';
  box.innerHTML=`
    <h2>没找到要存的物品？</h2>
    <p>当前场景未列出的物品，可按类别查找或按尺寸补充。</p>
    <label for="estCategory">按类别浏览</label>
    <select id="estCategory"><option value="">全部物品</option><option value="furniture">家具</option><option value="appliances">家电设备</option><option value="containers">箱包与收纳</option><option value="collections">收藏与长件</option><option value="business">商家与办公物资</option></select>
    <div class="est-results" id="estSearchResults" hidden></div>
    <div class="est-actions">
      <button type="button" id="estCustomToggle">＋ 按尺寸添加</button>
      <button type="button" id="estKnownRoute">只知道大概空间</button>
    </div>
    <div class="est-form" id="estCustomForm" hidden>
      <label for="estCustomName">物品名称</label><input id="estCustomName" maxlength="30" placeholder="如画框、设备箱">
      <p style="margin:9px 0 2px">填写打包或拆装后、实际要进仓的外部尺寸（厘米）。</p>
      <div class="est-dims"><div><label for="estLength">长</label><input id="estLength" type="number" inputmode="decimal" min="1" max="1000" placeholder="cm"></div><div><label for="estWidth">宽</label><input id="estWidth" type="number" inputmode="decimal" min="1" max="1000" placeholder="cm"></div><div><label for="estHeight">高</label><input id="estHeight" type="number" inputmode="decimal" min="1" max="1000" placeholder="cm"></div></div>
      <label for="estCustomQty">数量（件）</label><input id="estCustomQty" type="number" inputmode="numeric" min="1" max="99" value="1">
      <label class="est-check"><input id="estLong" type="checkbox">有长件或搬运不便</label>
      <div class="est-error" id="estCustomError" role="status"></div>
      <button type="button" class="est-save" id="estCustomSave">加入清单并更新估算</button>
    </div>
    <div id="estExtraList" aria-live="polite"></div>
  `;
  $('#morePanel').insertAdjacentElement('afterend',box);
  const p2List=$('#p2List'),p2Chips=$('#p2Chips');
  if(p2Chips.parentNode)p2Chips.parentNode.insertBefore(p2List,p2Chips);
  // Routine packing caveats are available from dimensions later in the flow.
  // Surface the door/access caution only when a long item is actually selected.

  // Keep the selected example in sync with the same calculation shown on step 4.
  sceneItems.luggage.presets.few.bag=0;
  sceneCfg.luggage.amounts.find(a=>a.id==='few').desc='几个行李箱';
  sceneCfg.moving.amounts.find(a=>a.id==='single').desc='纸箱、行李和收纳箱';
  sceneItems.enterprise.presets.file.printer=0;
  if(state.screen===4&&state.scene==='luggage'&&state.amount==='few'&&state.quantities.bag===1)state.quantities.bag=0;
  if(state.screen===4&&state.scene==='enterprise'&&state.amount==='file'&&state.quantities.printer===1)state.quantities.printer=0;
  function refreshAmountRanges(){
    const cfg=sceneCfg[state.scene];
    if(!cfg)return;
    cfg.amounts.forEach(amount=>{
      const previous=state.quantities;
      state.quantities={...sceneItems[state.scene].presets[amount.id]};
      try{
        const r=calc();
        amount.range=r.raw>0?`约 ${fmt(r.min)}–${fmt(r.max)}m³`:'';
      }finally{state.quantities=previous}
    });
  }
  const originalRenderAmounts=window.renderAmounts;
  window.renderAmounts=function(){refreshAmountRanges();originalRenderAmounts()};

  function syncScene(){
    if(activeScene===state.scene)return;
    extraIds.clear();activeScene=state.scene;
    $('#estSearchResults').hidden=true;
    $('#estCategory').value='';
    $('#estCustomForm').hidden=true;
  }
  function renderExtras(){
    syncScene();
    const root=$('#estExtraList');
    root.innerHTML=extraIds.size?'<p>补充的物品</p>'+[...extraIds].map(id=>itemCard(id,'p2')).join(''):'';
    if(extraIds.size)bindItemControls('#estExtraList');
    root.querySelectorAll?.('.kv').forEach(card=>{
      const id=card.querySelector('.qty button')?.dataset.id;
      if(!id?.startsWith('est_custom_'))return;
      const edit=document.createElement('button');edit.type='button';edit.textContent='修改尺寸';
      edit.style.cssText='min-height:44px;margin-top:8px;padding:8px 12px';
      edit.addEventListener('click',()=>{
        editingCustomId=id;const item=items[id];$('#estCustomName').value=item.name;
        ['#estLength','#estWidth','#estHeight'].forEach((selector,i)=>$(selector).value=item.dimensions_cm[i]);
        $('#estCustomQty').value=state.quantities[id]||1;$('#estLong').checked=Boolean(item.long);
        $('#estCustomForm').hidden=false;$('#estCustomSave').textContent='保存尺寸并更新估算';
        $('#estCustomForm').scrollIntoView({behavior:'smooth',block:'center'});$('#estCustomName').focus();
      });
      card.appendChild(edit);
    });
  }
  function volumeText(v){return String(Number(v.toFixed(v<.1?3:2)))}
  function organizeItems(){
    // A2: preserve natural order generated from currentLayout() and leave all
    // zero-count scene items visible. Never append selected nodes to a different
    // section or resurrect the retired “可能还要加” headings.
    for(const host of [$('#p1List'),$('#p2List'),$('#p3List'),$('#estExtraList')]){
      host.querySelectorAll('.kv').forEach(card=>{
        const id=card.querySelector('.qty button')?.dataset.id;
        if(!id||!items[id])return;
        const qty=state.quantities[id]||0;
        const variant=items[id].variants[state.variants[id]];
        if(!variant)return;
        const single=variant.vol;
        const meta=card.querySelector('.meta');
        if(meta)meta.textContent=`约 ${volumeText(single)}m³/件`;
        card.classList.toggle('prior',qty>0);
      });
    }
    $('#itemContextDesc').textContent='已按当前场景预填物品，数量和规格可随时调整。';
    const liveTitle=$('#s4 .live .mini');if(liveTitle)liveTitle.textContent='需要存储容量';
  }
  const originalRenderItems=window.renderItems;
  window.renderItems=function(){originalRenderItems();renderExtras();organizeItems()};
  const originalRenderLive=window.renderLive;
  window.renderLive=function(){
    originalRenderLive();
    if(rawVolume()<=0){
      $('#liveRange').textContent='添加物品后显示';
      $('#liveDockRange').textContent='待添加';
      $('#liveFloor').textContent='';
      $('#liveDesc').textContent='请从下方选择至少一件物品';
    }
  };
  const originalRenderUsage=window.renderUsage;
  window.renderUsage=function(){
    if(state.flow==='estimate'&&state.usageTargetOverride==null&&rawVolume()>0)state.usageTargetOverride=calc().target;
    originalRenderUsage();
    if(state.flow==='estimate'&&state.usageTargetOverride!=null){
      $('#capacityValue').textContent=state.usageTargetOverride.toFixed(1);
      $('#capacityMinus').disabled=state.usageTargetOverride<=.5;
      // Keep a single compact floor-area hint on the recommendation page.
    }
  };
  const originalSaveRequirement=window.saveRequirementSnapshot;
  function selectedConstraints(){
    return Object.entries(state.quantities).filter(([id,qty])=>qty>0&&items[id]).map(([id,qty])=>({
      item_id:id,name:items[id].name,quantity:qty,dimensions_cm:items[id].dimensions_cm||null,
      longest_edge_cm:items[id].dimensions_cm?Math.max(...items[id].dimensions_cm):null,
      requires_dimension_check:Boolean(items[id].long),packing_state:items[id].packing_state||'TO_CONFIRM'
    }));
  }
  function saveItemDraft(){
    const custom=Object.fromEntries(Object.entries(items).filter(([id])=>id.startsWith('est_custom_')));
    localStorage.setItem('mini_koala_estimator_item_draft_v1',JSON.stringify({scene:state.scene,amount:state.amount,quantities:state.quantities,variants:state.variants,custom,extraIds:[...extraIds]}));
  }
  window.saveRequirementSnapshot=function(data={}){
    if(state.flow!=='estimate'){
      const entry=new URLSearchParams(location.search).get('entry');
      return originalSaveRequirement(state.continuityResume||['resume_requirement','resume_unit_list'].includes(entry)?data:{...data,item_constraints:[],has_oversize:false,fit_status:'VOLUME_ONLY'});
    }
    saveItemDraft();
    const constraints=selectedConstraints();
    data={...data,item_constraints:constraints,has_oversize:constraints.some(x=>x.requires_dimension_check)||state.complex.has('oversize')};
    data.fit_status=data.has_oversize?'DIMENSIONS_PENDING':'VOLUME_ONLY';
    const additions=[...extraIds].filter(id=>(state.quantities[id]||0)>0).map(id=>`${items[id].name}×${state.quantities[id]}`);
    const existing=String(data.item_summary||'');
    const missing=additions.filter(label=>!existing.split('、').includes(label));
    return originalSaveRequirement({...data,item_summary:[existing,...missing].filter(Boolean).join('、')});
  };

  const results=$('#estSearchResults'),category=$('#estCategory');
  function renderCatalogResults(){
    results.hidden=!category.value;
    if(results.hidden){results.replaceChildren();return}
    const matches=categories[category.value].filter(id=>items[id]);
    results.replaceChildren();
    if(!matches.length){results.textContent='还没有匹配项，可按尺寸添加。';return}
    matches.forEach(id=>{
      const button=document.createElement('button');
      button.type='button';button.textContent=items[id].name;
      button.addEventListener('click',()=>{
        const layout=currentLayout();
        const alreadyListed=[...layout.p1,...layout.p2,...layout.p3].includes(id);
        if(!alreadyListed)extraIds.add(id);
        state.quantities[id]=Math.max(1,state.quantities[id]||0);
        invalidateUsageRequirement();renderItems();renderLive();
        category.value='';results.hidden=true;
        toast(alreadyListed?'此物品已在清单中，请核对数量':'已加入物品清单');
      });
      results.appendChild(button);
    });
  }
  category.addEventListener('change',renderCatalogResults);
  $('#estCustomToggle').addEventListener('click',()=>{
    editingCustomId=null;$('#estCustomSave').textContent='加入清单并更新估算';
    const form=$('#estCustomForm');form.hidden=!form.hidden;
    if(!form.hidden)$('#estCustomName').focus();
  });
  for(const selector of ['#estLength','#estWidth','#estHeight']){
    $(selector).addEventListener('input',()=>{
      const lengths=['#estLength','#estWidth','#estHeight'].map(s=>Number($(s).value)||0);
      if(Math.max(...lengths)>=150)$('#estLong').checked=true;
    });
  }
  $('#estCustomSave').addEventListener('click',()=>{
    const name=$('#estCustomName').value.trim().replace(/[<>&"'`]/g,'');
    const dims=['#estLength','#estWidth','#estHeight'].map(s=>Number($(s).value));
    const qty=Number($('#estCustomQty').value);
    const volume=dims.reduce((a,b)=>a*b,1)/1000000;
    const error=$('#estCustomError');error.textContent='';
    if(!name||dims.some(n=>!Number.isFinite(n)||n<=0||n>1000)||!Number.isInteger(qty)||qty<1||qty>99||volume<.01||volume>200){
      error.textContent='请填写名称、1–1000cm 的外部尺寸及 1–99 件；不足 0.01m³ 的小物可合并为箱。';return;
    }
    const id=editingCustomId||`est_custom_${++customSeq}`;
    editingCustomId=null;$('#estCustomSave').textContent='加入清单并更新估算';
    items[id]={name,meta:`单件外部尺寸 ${dims.join('×')}cm`,vol:volume,variants:{std:{name:'按填写尺寸',vol:volume}},long:$('#estLong').checked||Math.max(...dims)>=150,dimensions_cm:dims.slice(),packing_state:'packed_or_disassembled'};
    state.variants[id]='std';state.quantities[id]=qty;extraIds.add(id);
    invalidateUsageRequirement();renderItems();renderLive();
    $('#estCustomForm').hidden=true;
    $('#estCustomName').value='';$('#estLength').value='';$('#estWidth').value='';$('#estHeight').value='';
    $('#estCustomQty').value='1';$('#estLong').checked=false;
    toast('已加入估算，可继续选择仓位');
  });
  $('#estKnownRoute').addEventListener('click',()=>{
    state.flow='known';state.knownSize=0;go(7);
    $('#knownInput').value='';$('#knownInput').placeholder='例如 5';$('#knownInput').focus();
  });
  if(new URLSearchParams(location.search).get('entry')==='resume_item_check'){
    try{
      const draft=JSON.parse(localStorage.getItem('mini_koala_estimator_item_draft_v1')||'{}');
      if(draft.scene&&draft.quantities){
        Object.assign(items,draft.custom||{});state.flow='estimate';state.scene=draft.scene;state.amount=draft.amount;
        state.quantities=draft.quantities;state.variants={...state.variants,...draft.variants};
        activeScene=state.scene;(draft.extraIds||[]).forEach(id=>extraIds.add(id));
        customSeq=Math.max(0,...Object.keys(draft.custom||{}).map(id=>Number(id.split('_').pop())||0));
        invalidateUsageRequirement();go(4);
      }
    }catch(e){}
  }
  if(state.screen===3)renderAmounts();
  if(state.screen===4){renderItems();renderLive()}
})();
