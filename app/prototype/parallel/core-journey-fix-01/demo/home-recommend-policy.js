(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SIM_HOME_RECOMMEND_02I=api;
})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  const value=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0?x:null;
  function rank(rows,{distanceVerified=false}={}){
    const eligible=(Array.isArray(rows)?rows:[]).filter(x=>x&&x.status==='open');
    let firstTwo;
    if(distanceVerified&&eligible.every(x=>value(x.distance)!==null)){
      const sorted=eligible.slice().sort((a,b)=>a.distance-b.distance||String(a.id).localeCompare(String(b.id)));
      const first=sorted[0],rest=sorted.slice(1),primaryPrice=value(first?.teaserCubicPrice);
      let second=null;
      if(primaryPrice!==null){
        for(const radius of [3,5,10,Infinity]){
          const cheaper=rest.filter(x=>x.distance<=radius&&value(x.teaserCubicPrice)!==null&&x.teaserCubicPrice<primaryPrice)
            .sort((a,b)=>a.teaserCubicPrice-b.teaserCubicPrice||a.distance-b.distance);
          if(cheaper.length){second=cheaper[0];break;}
        }
      }
      firstTwo=[first,second||rest[0]].filter(Boolean);
    }else{
      // Source fixture has no verified distance: preserve existing approved demo card order.
      firstTwo=eligible.slice(0,2);
    }
    const rest=eligible.filter(x=>!firstTwo.includes(x));
    const operation=rest.find(x=>x.operatingTag==='特价仓')||rest.find(x=>x.operatingTag)||rest[0];
    return {cards:[...firstTwo,...(operation?[operation]:[])],firstTwo:firstTwo.map(s=>s.id),
      operator:operation?.id||null,nearestClaimAllowed:distanceVerified===true&&eligible.every(x=>value(x.distance)!==null),
      estoreFirst:eligible.length===0};
  }
  return {rank};
});
