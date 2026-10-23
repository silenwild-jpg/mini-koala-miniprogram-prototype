/* Physical-fit safety gate. A capacity match is NOT a guarantee of usable storage. */
(function(root){
  'use strict';
  const validDims=d=>Array.isArray(d)&&d.length===3&&d.every(x=>Number.isFinite(Number(x))&&Number(x)>0);
  const trusted=s=>['measured','verified','staff_verified'].includes(String(s||'').toLowerCase());
  const IDENTITY='FIT_P0_V1';
  const RISK_IDS=new Set(['sofa3','bed180','wardrobe','fridge','washer','dining','tvcab','bicycle','bookcase','crib','pallet','displayRack','shelf','fileCab','officeDesk','printer']);
  function constraintsFromSelection(items,quantities,variants){
    return Object.entries(quantities||{}).filter(([id,q])=>items[id]&&Number(q)>0).map(([id,q])=>{
      const item=items[id],variant=(item.variants||{})[(variants||{})[id]]||Object.values(item.variants||{})[0]||{};
      const predefined=id==='box'?[.6,.4,.5]:null; // catalogue box: typical size, not measured
      return {item_id:id,name:item.name,quantity:Math.min(500,Math.floor(Number(q))),variant:(variants||{})[id]||'',
        packed_volume_m3:Number(variant.vol||item.vol)||null,dims_m:predefined,
        dimension_status:predefined?'preset':'unknown',risk_level:item.long||RISK_IDS.has(id)?'large':'normal',
        unpacked:!['box','goodsbox','turnover','bin','clothingBox'].includes(id),
        requires_confirmation:Boolean(item.long||RISK_IDS.has(id))};
    });
  }
  function unitFacts(u){
    return {dims:[u.length_m,u.width_m,u.height_m].map(Number),status:u.dimension_estimate_status||u.dimension_status||'unknown',
      door:Array.isArray(u.door_clearance_m)?u.door_clearance_m.map(Number):[u.door_width_m,u.door_height_m].map(Number),
      doorStatus:u.door_measurement_status||u.door_estimate_status||'unknown'};
  }
  function orientations(d){
    const a=[...d].map(Number);return [[a[0],a[1],a[2]],[a[0],a[2],a[1]],[a[1],a[0],a[2]],[a[1],a[2],a[0]],[a[2],a[0],a[1]],[a[2],a[1],a[0]]];
  }
  function individualFit(it,u){
    const ds=unitFacts(u);
    if(!validDims(it.dims_m)||!trusted(it.dimension_status)||!validDims(ds.dims)||!trusted(ds.status))return null;
    const size=ds.dims;
    const candidate=orientations(it.dims_m).filter(d=>d.every((v,i)=>v<=size[i]+1e-7));
    if(!candidate.length)return false;
    // Door restrictions can only pass with a credible opening, otherwise remain unknown.
    if(!validDims([ds.door[0],ds.door[1],1])||!trusted(ds.doorStatus))return null;
    return candidate.some(d=>[d[0],d[1],d[2]].some((axis,j)=>{
      const face=d.filter((_,i)=>i!==j);
      return face.some((v,k)=>v<=ds.door[0]+1e-7&&face[1-k]<=ds.door[1]+1e-7);
    }));
  }
  // Bin assignment is necessary, not sufficient, for a geometric packing certificate.
  function assignByBudget(parts,items){
    const bins=parts.map(p=>({remaining:Number(p.v),items:[]}));
    const ordered=[...items].sort((a,b)=>b.volume-a.volume||Number(b.risk)-Number(a.risk));
    if(ordered.length>180)return null;
    let steps=0;
    function place(index){
      if(index===ordered.length)return true;
      if(++steps>70000)return false;
      const item=ordered[index],tested=new Set();
      for(let j=0;j<bins.length;j++){
        const key=bins[j].remaining.toFixed(4)+'/'+(item.eligible[j]===false?'0':'1');
        if(tested.has(key))continue;tested.add(key);
        if(item.eligible[j]===false||bins[j].remaining+.00001<item.volume)continue;
        bins[j].remaining-=item.volume;bins[j].items.push(item);
        if(place(index+1))return true;
        bins[j].items.pop();bins[j].remaining+=item.volume;
      }
      return false;
    }
    if(!place(0))return null;
    return bins.map((bin,i)=>({unit_id:parts[i].id||parts[i].size_option_id||String(i),size_option_id:parts[i].size_option_id||'',
      volume_m3:Number(parts[i].v),item_names:[...new Set(bin.items.map(it=>it.name))],
      item_count:bin.items.length,planned_volume_m3:Number((Number(parts[i].v)-bin.remaining).toFixed(3))}));
  }
  function evaluateCandidate(parts,options={}){
    const given=Array.isArray(options.items)?options.items:[];
    const reasonCodes=[],capacity=parts.reduce((s,u)=>s+(Number(u.v)||0),0);
    const items=[];
    let incomplete=given.length===0;
    for(const it of given){
      const qty=Math.floor(Number(it.quantity||it.qty)||0),volume=Number(it.packed_volume_m3||it.volume_m3||it.volume||0);
      if(qty<=0)continue;
      if(!Number.isFinite(volume)||volume<=0||qty>500){incomplete=true;reasonCodes.push('ITEM_VOLUME_UNKNOWN');continue;}
      for(let k=0;k<Math.min(qty,181);k++)items.push({name:it.name||it.item_id||'物品',volume,risk:it.risk_level==='large',raw:it});
      if(qty>181){incomplete=true;reasonCodes.push('ITEMS_TOO_MANY');}
    }
    if(!given.length)reasonCodes.push('ITEM_LIST_UNKNOWN');
    const totalVolume=items.reduce((sum,x)=>sum+x.volume,0);
    if(totalVolume>capacity+1e-6)return {status:'rejected',reasonCodes:['TOTAL_VOLUME_SHORT'],allocations:[],model:IDENTITY};
    for(const item of items){
      item.eligible=parts.map(u=>individualFit(item.raw,u));
      if(item.eligible.every(value=>value===false))return {status:'rejected',reasonCodes:['UNSPLITTABLE_ITEM_NO_FIT'],itemName:item.name,allocations:[],model:IDENTITY};
      if(item.eligible.some(value=>value===null)){incomplete=true;reasonCodes.push('ITEM_OR_UNIT_DIMENSIONS_UNVERIFIED');}
    }
    const allocations=items.length?assignByBudget(parts,items):[];
    if(items.length&&!allocations){
      // Failure of a bounded heuristic isn't proof no real 3D arrangement exists.
      incomplete=true;reasonCodes.push('ASSIGNMENT_NOT_PROVEN');
    }
    if(parts.some(u=>!trusted(unitFacts(u).status)||!trusted(unitFacts(u).doorStatus))) {
      incomplete=true;reasonCodes.push('UNIT_MEASUREMENTS_UNVERIFIED');
    }
    if(given.some(it=>!trusted(it.dimension_status)||!validDims(it.dims_m))) {
      incomplete=true;reasonCodes.push('ITEM_MEASUREMENTS_UNVERIFIED');
    }
    // A volume assignment alone is never a packing/access-aisle certificate.
    // Only a separately audited layout can ever be promoted to 'verified'.
    if(!options.staffValidatedLayout) {incomplete=true;reasonCodes.push('LAYOUT_NOT_VERIFIED');}
    const unique=[...new Set(reasonCodes)];
    return {status:incomplete?'pending':'verified',reasonCodes:unique,allocations:allocations||[],model:IDENTITY,
      riskItems:given.filter(it=>it.risk_level==='large').map(it=>it.name).slice(0,4)};
  }
  root.MINI_KOALA_PHYSICAL_FIT_V1={evaluateCandidate,constraintsFromSelection,unitFacts,individualFit,IDENTITY};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.MINI_KOALA_PHYSICAL_FIT_V1;
})(typeof window!=='undefined'?window:globalThis);
