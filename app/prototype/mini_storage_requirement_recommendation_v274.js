(function(global){
  'use strict';
  const aliasKeys=['jianguo','shuangjing','chaoyang','sanyuanqiao','wangjing'];
  function data(){return global.MINI_KOALA_DATA}
  function master(){return global.MINI_STORAGE_MASTER_V222||global.MINI_STORAGE_MASTER_V242}
  function helpers(){return global.MINI_STORAGE_BUSINESS_HELPERS_V274}
  function routeFor(storeId,origin='guomao',travel='drive'){
    const D=data(),M=master();
    const profile=D?.getStore(storeId)||{};
    const canonical=D?.resolveStoreId(storeId)||storeId;
    const alias=aliasKeys.find(key=>D?.resolveStoreId(key)===canonical);
    const row=M?.route_base?.[origin]||M?.route_base?.guomao||{};
    const tuple=(row[storeId]||row[canonical]||(alias?row[alias]:null))?.[travel];
    if(tuple)return {m:Number(tuple[0]),km:Number(tuple[1]),source:'DEMO_SSOT'};
    const seed=[...String(canonical)].reduce((sum,ch)=>sum+ch.charCodeAt(0),0);
    const targetDistrict=origin==='zhongguancun'?'海淀区':['guomao','wangjing','shuangjing','sanyuanqiao'].includes(origin)?'朝阳区':'';
    const sameDistrict=targetDistrict&&profile.district===targetDistrict;
    const baseKm=profile.city==='北京市'?(sameDistrict?1.2:4.8):35;
    const km=Number((baseKm+(seed%58)/10).toFixed(1));
    const drive=Math.max(6,Math.round(4+km*2.15+(seed%4)));
    if(travel==='bike')return {m:Math.max(8,Math.round(km*4.8)),km,source:'DETERMINISTIC_DEMO'};
    if(travel==='walk')return {m:Math.max(12,Math.round(km*12.5)),km,source:'DETERMINISTIC_DEMO'};
    return {m:drive,km,source:'DETERMINISTIC_DEMO'};
  }
  function monthly(base,term,storeId){
    const H=helpers();
    return H?.monthlyReference?Number(H.monthlyReference(base,term,storeId)):Number(base||0);
  }
  function total(base,term,storeId){
    const H=helpers();
    return H?.contractRent?Number(H.contractRent(base,term,storeId)):Number(base||0)*Math.max(1,Number(term)||1);
  }
  // Demo-only approximate alternatives: never present a tiny store unit as a
  // viable substitute for a much larger storage requirement.
  function isReasonableAlternative(volume,target){
    const v=Number(volume),t=Number(target);
    return Number.isFinite(v)&&Number.isFinite(t)&&t>0 &&
      v>=Math.max(.5,t-Math.max(.5,t*.10))-1e-8 && v<=t*1.30+1e-8;
  }
  function hasTrustedLargeItem(items){
    return Array.isArray(items)&&items.some(item=>item?.risk_level==='large'&&
      ['measured','verified','staff_verified'].includes(String(item.dimension_status||'').toLowerCase())&&
      Array.isArray(item.dims_m)&&item.dims_m.length===3&&item.dims_m.every(n=>Number.isFinite(Number(n))&&Number(n)>0));
  }
  function evaluateStore(storeId,{min,max,target,term,origin='guomao',travel='drive',items=[]}={}){
    const D=data(),profile=D?.getStore(storeId);
    if(!profile)return null;
    const units=(D.getLegacyUnits(storeId)||[]).filter(unit=>Number(unit.base)>0&&Number(unit.available_count)>0);
    const FIT=global.MINI_KOALA_PHYSICAL_FIT_V1;
    const matched=units.filter(unit=>Number(unit.v)>=Number(min)&&Number(unit.v)<=Number(max)&&
      (!FIT||FIT.evaluateCandidate([unit],{items}).status!=='rejected'));
    const combo=!matched.length?global.MINI_KOALA_COMBO_V1?.findForStore(storeId,{min,max,target,term,units,items})[0]:null;
    const fitResult=matched.length&&FIT?FIT.evaluateCandidate([matched[0]],{items}):combo?.physicalFit||null;
    const nearUnits=matched.length||combo?[]:units.filter(u=>isReasonableAlternative(u.v,target)&&
      (!FIT||FIT.evaluateCandidate([u],{items}).status!=='rejected'));
    const source=matched.length?matched:nearUnits.length?nearUnits:units;
    if(!source.length)return null;
    const ranked=[...source].sort((a,b)=>{
      const am=monthly(a.base,term,storeId),bm=monthly(b.base,term,storeId);
      const at=total(a.base,term,storeId),bt=total(b.base,term,storeId);
      const fit=Math.abs(Number(a.v)-Number(target))-Math.abs(Number(b.v)-Number(target));
      return matched.length?(at-bt||fit||am-bm):(fit||at-bt||am-bm);
    });
    const unit=ranked[0],route=routeFor(storeId,origin,travel);
    return {
      storeId:profile.store_id,profile,unit,route,
      matchedUnits:matched,matchedCount:matched.length,
      availableMatchedCount:matched.reduce((sum,u)=>sum+Math.max(0,Number(u.available_count)||0),0),
      combo:combo||null,fitStatus:fitResult?.status||'pending',fitResult,matchType:matched.length?'single':combo?'combo':'alternative',
      monthly:combo?combo.monthly:monthly(unit.base,term,profile.store_id),
      total:combo?combo.total:total(unit.base,term,profile.store_id),
      hasMatch:matched.length>0||Boolean(combo),
      alternativeEligible:nearUnits.length>0,
      alternativeUnit:nearUnits.length?unit:null
    };
  }
  function recommend({min,max,target,term,origin='guomao',travel='drive',city='北京市',items=[]}={}){
    const D=data();
    const all=(D?.getStoresByCity(city)||[]).map(profile=>evaluateStore(profile.store_id,{min,max,target,term,origin,travel,items})).filter(Boolean);
    const matched=all.filter(row=>row.hasMatch);
    // With no true matches, recommend ONLY appropriately sized alternatives.
    // If none exist, keep the recovery CTA but do not manufacture priced cards.
    const pool=matched.length?matched:all.filter(row=>row.alternativeEligible);
    if(!pool.length)return {rows:[],matchedRows:[],fallback:true,expandedSearch:false};
    const ranked=matched.length?
      global.MINI_KOALA_RECOMMENDATION_POLICY_V2.rank(pool.map(row=>({...row,id:row.storeId,price:row.total})),{located:true,demand:true}):
      {rows:pool.map(row=>({...row,id:row.storeId,price:row.total})).sort((a,b)=>
        Math.abs(Number(a.unit.v)-Number(target))-Math.abs(Number(b.unit.v)-Number(target))||
        Number(b.unit.v>=target)-Number(a.unit.v>=target)||Number(a.route.km)-Number(b.route.km)),estoreFirst:false};
    const nearestMatchKm=matched.length?Math.min(...matched.map(row=>Number(row.route.km))):Infinity;
    return {rows:ranked.rows,matchedRows:matched,fallback:matched.length===0,estoreFirst:ranked.estoreFirst,
      expandedSearch:matched.length>0&&nearestMatchKm>3};
  }
  global.MINI_STORAGE_REQUIREMENT_RECOMMENDATION_V274={routeFor,evaluateStore,recommend,monthly,total,isReasonableAlternative,hasTrustedLargeItem};
})(window);
