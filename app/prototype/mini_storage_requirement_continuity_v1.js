(function(g){
  'use strict';
  const KEY='mini_storage_requirement_current';
  function read(){try{const r=JSON.parse(localStorage.getItem(KEY)||'{}');return r&&typeof r==='object'&&!Array.isArray(r)?r:{}}catch(e){return {}}}
  function valid(r){return Number.isFinite(Number(r?.target_volume))&&Number(r.target_volume)>0}
  function term(v){return /^(?:[1-9]|[1-5][0-9]|60)$/.test(String(v??'').trim())?Number(v):null}
  function write(patch,source){
    const previous=read();if(!valid(previous))return previous;
    const next={...previous,...patch,updated_at:new Date().toISOString()};
    if(source)next.continuity_source=source;
    if(Number(previous.target_volume)!==Number(next.target_volume)||term(previous.term_months)!==term(next.term_months)){
      delete next.trade_confirmed;delete next.snapshot_basis;
    }
    try{localStorage.setItem(KEY,JSON.stringify(next))}catch(e){}
    return next;
  }
  function append(p,r=read()){
    if(!valid(r))return p;
    const values={target:Number(r.target_volume).toFixed(1),min:r.min_volume,max:r.max_volume,
      customer:r.customer_type,travel:r.travel_mode,searchOriginKey:r.search_origin_key,access:r.access_frequency};
    for(const [k,v] of Object.entries(values))if(v!==undefined&&v!==null&&v!=='')p.set(k,String(v));
    if(term(r.term_months))p.set('term',String(term(r.term_months)));else p.delete('term');
    return p;
  }
  function isolated(p){return p.has('demoStory')||p.has('demo')||['internal_demo','demo_hub'].includes(p.get('source'))||p.has('assetContext')||p.has('quoteStatus')||p.has('orderNo')||p.has('rentTotal')}
  const page=location.pathname.split('/').pop(),params=new URLSearchParams(location.search);
  function normalize(){
    const r=read();if(!valid(r)||isolated(params))return;
    const home=page.includes('home_H01'),list=page.includes('store_list_s01'),store=page.includes('store_detail_s02'),unit=page.includes('unit_detail_u01');
    if(home){
      if(params.get('state')==='new'){const p=new URLSearchParams(location.search);p.delete('state');history.replaceState(history.state,'',location.pathname+'?'+p+location.hash);}
      return;
    }
    if(!list&&!store&&!unit)return;
    const p=new URLSearchParams(location.search);append(p,r);
    if(list){
      if(['','browse','unlocated'].includes(p.get('state')||''))p.set('state','estimated');
      if(p.get('entry')==='browse_nearby')p.set('entry','resume_requirement');
      // A saved origin remains usable after a denied device-location permission.
      if(r.search_origin_key)p.set('loc','precise');
    }
    if(store){
      if(!p.get('state')||p.get('state')==='browse'&&p.get('source')!=='u01_other_units')p.set('state','matched');
      if(!p.get('fromS01State')||p.get('fromS01State')==='browse')p.set('fromS01State','estimated');
      if(!p.get('selectionContext')||p.get('selectionContext')==='browse')p.set('selectionContext','estimate_recommendation');
    }
    if(unit){
      if(!p.get('fromS01State')||p.get('fromS01State')==='browse')p.set('fromS01State','estimated');
      if(!p.get('selectionContext')||p.get('selectionContext').startsWith('browse'))p.set('selectionContext','estimate_size_option');
    }
    if(p.toString()!==location.search.slice(1))history.replaceState(history.state,'',location.pathname+'?'+p+location.hash);
  }
  function signature(){const r=read();return JSON.stringify([r.target_volume,r.min_volume,r.max_volume,r.term_months,r.customer_type,r.scene,r.item_summary,r.travel_mode,r.search_origin_key,r.moving_support,r.size_mode])}
  g.MINI_KOALA_REQUIREMENT_CONTINUITY_V1={read,valid,validTerm:term,write,append,isolated};
  normalize();
  let loadedSignature;
  addEventListener('pageshow',e=>{
    if(e.persisted&&loadedSignature!==undefined&&signature()!==loadedSignature&&!isolated(new URLSearchParams(location.search)))location.reload();
    loadedSignature=signature();
  });
})(window);
