(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SIM_HOME_RECOMMEND_02I=api;
})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  const num=x=>Number.isFinite(Number(x))&&Number(x)>=0?Number(x):null;
  const cost=x=>num(x?.teaserCubicPrice)>0?num(x.teaserCubicPrice):null;
  const distance=x=>num(x?.distance)??Number.POSITIVE_INFINITY;
  function rank(rows,{distanceVerified=false}={}){
    const open=(Array.isArray(rows)?rows:[]).filter(x=>x&&x.status==='open');
    const eligible=open.filter(x=>cost(x)!==null);
    if(!eligible.length)return {cards:[],firstTwo:[],operator:null,nearestClaimAllowed:false,estoreFirst:true};
    const sorted=eligible.slice().sort((a,b)=>distance(a)-distance(b)||String(a.id).localeCompare(String(b.id)));
    const first=sorted[0],rest=sorted.slice(1);
    let second=null;
    for(const radius of [3,5,10,Number.POSITIVE_INFINITY]){
      const cheaper=rest.filter(x=>distance(x)<=radius&&cost(x)<cost(first))
        .sort((a,b)=>cost(a)-cost(b)||distance(a)-distance(b));
      if(cheaper.length){second=cheaper[0];break;}
    }
    if(!second)second=rest[0]||null;
    const selected=[first,...(second?[second]:[])];
    const remaining=rest.filter(x=>!selected.includes(x));
    const nearby=remaining.filter(x=>distance(x)<=10);
    const operation=nearby.find(x=>x.operatingTag==='特价仓')||nearby.find(x=>x.operatingTag)||nearby[0]||
      remaining.find(x=>x.operatingTag==='特价仓')||remaining[0]||null;
    if(operation)selected.push(operation);
    return {cards:selected,firstTwo:selected.slice(0,2).map(x=>x.id),operator:operation?.id||null,
      nearestClaimAllowed:distanceVerified===true,estoreFirst:false};
  }
  return {rank};
});
