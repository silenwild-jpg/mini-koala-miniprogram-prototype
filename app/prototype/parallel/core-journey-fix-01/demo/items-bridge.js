(function(){
  'use strict';
  const KEY='mk_independent_sim_v1',DRAFT='mk_items_draft_v3';
  const read=k=>{try{return JSON.parse(sessionStorage.getItem(k)||'null');}catch{return null;}};
  const core=SIM_CORE.create({state:read(KEY)}),r=core.state().requirement;
  const saved=read(DRAFT);
  if(saved&&saved.version===1){
    for(const x of ITEMS){const q=saved.counts?.[x.id],v=saved.variants?.[x.id];COUNT[x.id]=Number.isInteger(q)&&q>=0&&q<=99?q:0;if(x.variants.some(y=>y.id===v))SELECTED_VARIANT[x.id]=v;}
    const modes=['items','scenes'],cats=[...CATS,...SCENE_CATS].map(x=>x[0]).concat(['term','known']);
    for(const key of ['category','lastItemCat','lastSceneCat'])if(cats.includes(saved.state?.[key]))state[key]=saved.state[key];
    if(modes.includes(saved.state?.mode))state.mode=saved.state.mode;
    state.known=core.validCapacity(saved.state?.known)?saved.state.known:null;
    state.term=core.validTerm(saved.state?.term)?saved.state.term:null;
    state.browsing=!!saved.state?.browsing;state.search=String(saved.state?.search||'').slice(0,80);
  }else if(['items_estimate','known_capacity_in_items_flow'].includes(r.source)){
    for(const item of r.items||[]){const x=BYID[item.id];if(x&&x.variants.some(v=>v.id===item.variant)){COUNT[item.id]=item.quantity;SELECTED_VARIANT[item.id]=item.variant;}}
    state.known=r.source==='known_capacity_in_items_flow'?r.capacity_m3:null;state.browsing=!!r.items?.length;
  }
  if(r.term_confirmed)state.term=r.term_months;
  const entry=read('mk_entry_context_v3');
  if(entry?.scene&&entry.id!==saved?.entryId){
    const map={'搬家过渡':'moving','装修暂存':'moving','行李寄存':'luggage','换季收纳':'home','兴趣收藏':'hobby','闲置物品':'home'};
    if(map[entry.scene]){state.mode='scenes';state.category='scene_'+map[entry.scene];state.lastSceneCat=state.category;state.browsing=true;}
  }
  function persist(){sessionStorage.setItem(DRAFT,JSON.stringify({version:1,entryId:entry?.id||saved?.entryId||null,counts:COUNT,variants:SELECTED_VARIANT,state:{category:state.category,mode:state.mode,lastItemCat:state.lastItemCat,lastSceneCat:state.lastSceneCat,known:state.known,term:state.term,browsing:state.browsing,search:state.search}}));}
  const originalRender=render;render=function(reset){originalRender(reset);persist();};
  const originalClear=clearAll;clearAll=function(){originalClear();state.mode='items';state.category='all';state.browsing=false;state.search='';render(false);};
  showHandoff=function(){
    if(!isValidVolume()){notify('请先确认容量');return;}
    if(!core.validTerm(state.term)){notify('请选择租期');switchCat('term');return;}
    try{const p=payload();core.setEstimate(p);sessionStorage.setItem(KEY,JSON.stringify(core.state()));sessionStorage.removeItem('mk_cap_draft_v3');persist();core.claimCoupons();sessionStorage.setItem(KEY,JSON.stringify(core.state()));const target=sessionStorage.getItem('mk_estimate_return_v4')||'index.html?page=S5';sessionStorage.removeItem('mk_estimate_return_v4');location.href=target;}
    catch{notify('需求暂时无法确认，请检查容量和租期');}
  };
  document.addEventListener('click',e=>{
    if(e.target.closest('.back')){e.stopImmediatePropagation();persist();location.href='cap.html';}
    else if(e.target.closest('#helpTool')){e.stopImmediatePropagation();persist();sessionStorage.setItem('mk_advisor_context_v3',JSON.stringify({_return:'items.html',items:selected().map(x=>x.name+'×'+COUNT[x.id]).join('、'),capacity_hint:volume()>0?display(volume())+'m³':'',term_hint:state.term?state.term+'个月':''}));location.href='index.html?page=BOOKING';}
    else if(e.target.closest('#aiTool')){e.stopImmediatePropagation();persist();location.href='cap.html?assist=AI';}
    else if(e.target.closest('#footerBtn')&&isValidVolume()&&!state.term){notify('请选择租期');}
  },true);
  document.addEventListener('click',persist);
  document.addEventListener('input',e=>{
    if(e.target.id==='customTerm'){
      const m=Number(e.target.value);state.term=e.target.value&&core.validTerm(m)?m:null;updateFooter();
      document.getElementById('navTermState').textContent=state.term?state.term+'个月':'未选择';
      document.querySelectorAll('[data-term]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.term)===state.term));
      const summary=document.querySelector('.selected-inline strong');if(summary)summary.textContent=state.term?state.term+'个月':'未选择';
    }persist();
  });document.addEventListener('change',persist);
  window.addEventListener('pagehide',persist);
  const style=document.createElement('style');style.textContent='@media(max-width:430px){.shell{height:100dvh;border-radius:0;margin:0 auto}}.notice{pointer-events:none}.content,.rail,.sheet-list{scrollbar-width:none}.content::-webkit-scrollbar,.rail::-webkit-scrollbar,.sheet-list::-webkit-scrollbar{display:none}';document.head.appendChild(style);
  render(false);
})();
