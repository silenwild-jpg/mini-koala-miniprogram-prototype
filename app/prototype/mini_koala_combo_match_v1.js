/* Same-store multi-unit suggestion — internal prototype, not a multi-unit checkout. */
(function(root){
  'use strict';
  function findForStore(storeId,options={}){
    const D=root.MINI_KOALA_DATA;
    const H=root.MINI_STORAGE_BUSINESS_HELPERS_V274;
    const FIT=root.MINI_KOALA_PHYSICAL_FIT_V1;
    if(!D||!H)return [];
    const target=Math.max(.5,Number(options.target)||0),term=Math.min(60,Math.max(1,Math.round(Number(options.term)||6)));
    const min=Number(options.min)||0,max=Number(options.max)||Infinity;
    const source=Array.isArray(options.units)?options.units:D.getLegacyUnits(storeId);
    const units=source.filter(u=>Number(u.v)>0&&Number(u.base)>0&&Number(u.available_count)>0);
    // A physically impossible single does NOT suppress a viable multi-unit candidate.
    if(units.some(u=>Number(u.v)>=min&&Number(u.v)<=max &&
      (!FIT||FIT.evaluateCandidate([u],{items:options.items}).status!=='rejected')))return [];
    const choices=[];
    const need=Math.max(target,min);
    const maxPieces=3;
    // 30% headroom is the demo acceptance ceiling; oversized bundles are comparisons, not recommendations.
    const maxRecommendedCapacity=need*1.30;
    function walk(start,selected,capacity,total){
      // Adding another unit cannot reduce total capacity; prune oversized branches early.
      if(capacity>maxRecommendedCapacity+1e-7)return;
      if(selected.length>=2 && capacity+1e-7>=need){
        const physicalFit=FIT?FIT.evaluateCandidate(selected,{items:options.items}):{status:'pending',reasonCodes:['FIT_ENGINE_MISSING'],allocations:[]};
        if(physicalFit.status==='rejected'){
          // A third unit may fix the allocation failure even when two units cannot.
          if(selected.length>=maxPieces)return;
        } else {
        choices.push({parts:selected.map(p=>({...p,quantity:1})),physicalFit,fitStatus:physicalFit.status,count:selected.length,
          capacity:Number(capacity.toFixed(1)),monthly:Math.round(total/term),total,
          excess:Number((capacity-need).toFixed(1)),storeId,
          hasOversize:Boolean(options.hasOversize),requiresDimensionCheck:physicalFit.status!=='verified'});
          return;
        }
      }
      if(selected.length>=maxPieces)return;
      for(let i=start;i<units.length;i++){
        const u=units[i];
        const used=selected.filter(s=>s.size_option_id===u.size_option_id).length;
        if(used>=Number(u.available_count))continue;
        const rent=H.contractRent(Number(u.base),term,storeId);
        walk(i,[...selected,u],capacity+Number(u.v),total+rent);
      }
    }
    walk(0,[],0,0);
    const unique=new Set();
    return choices.sort((a,b)=>(a.fitStatus==='verified'?0:1)-(b.fitStatus==='verified'?0:1)||a.count-b.count||a.excess-b.excess||a.total-b.total)
      .filter(c=>{const key=c.parts.map(p=>p.size_option_id||p.id).sort().join('|');if(unique.has(key))return false;unique.add(key);return true;})
      .slice(0,Math.max(1,Math.min(2,Number(options.limit)||2)));
  }
  root.MINI_KOALA_COMBO_V1={findForStore};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.MINI_KOALA_COMBO_V1;
})(typeof window!=='undefined'?window:globalThis);
