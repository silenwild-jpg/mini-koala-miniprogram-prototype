(function(g){
  'use strict';
  const DEFAULT_RADIUS_KM=3;
  const EXPANSION_STEP_KM=3;
  const key=row=>String(row.id??row.storeId);
  const price=row=>Number(row.price??row.total);
  const byDistance=(a,b)=>Number(a.route.km)-Number(b.route.km)||Number(a.route.m)-Number(b.route.m)||price(a)-price(b)||key(a).localeCompare(key(b));
  const byPrice=(a,b)=>price(a)-price(b)||byDistance(a,b);

  // Start within 3 km, expand by 3 km until a genuinely cheaper store is found.
  // If none exists, keep the second nearest store without a low-price label.
  function choosePair(rows,{located=true,radius=DEFAULT_RADIUS_KM,maxRadius=null,demand=false}={}){
    const eligible=(rows||[]).filter(row=>row&&Number.isFinite(price(row))&&price(row)>0&&Number.isFinite(Number(row.route?.km)));
    if(!eligible.length)return {first:null,second:null,cheaper:false,expanded:false,searchRadiusKm:radius};
    const ordered=[...eligible].sort(located?byDistance:demand?byPrice:(a,b)=>(Number(b.count)||0)-(Number(a.count)||0)||byPrice(a,b));
    const first=ordered[0],rest=ordered.filter(row=>key(row)!==key(first));
    if(!rest.length)return {first,second:null,cheaper:false,expanded:false,searchRadiusKm:radius};
    if(!located){
      const second=[...rest].sort(byPrice)[0];
      return {first,second,cheaper:price(second)<price(first),expanded:false,searchRadiusKm:radius};
    }
    const cap=Number.isFinite(Number(maxRadius))&&Number(maxRadius)>0?Number(maxRadius):Math.max(radius,...rest.map(row=>Number(row.route.km)));
    let scope=Math.min(radius,cap),cheaperRows=[];
    while(scope<=cap+1e-8){
      cheaperRows=rest.filter(row=>Number(row.route.km)<=scope+1e-8&&price(row)<price(first));
      if(cheaperRows.length||scope>=cap)break;
      scope=Math.min(cap,scope+EXPANSION_STEP_KM);
    }
    const second=cheaperRows.length?[...cheaperRows].sort(byPrice)[0]:[...rest].sort(byDistance)[0];
    return {first,second,cheaper:cheaperRows.length>0,expanded:cheaperRows.length>0&&scope>radius,searchRadiusKm:scope};
  }

  function rank(rows,{located=true,radius=DEFAULT_RADIUS_KM,distanceLimit=null,demand=false}={}){
    const eligible=(rows||[]).filter(row=>row&&Number.isFinite(price(row))&&price(row)>0&&Number.isFinite(Number(row.route?.km))&&
      (distanceLimit==null||Number(row.route.km)<=Number(distanceLimit)));
    const pair=choosePair(eligible,{located,radius,maxRadius:distanceLimit,demand});
    const used=new Set([pair.first,pair.second].filter(Boolean).map(key));
    const tail=eligible.filter(row=>!used.has(key(row))).sort((a,b)=>
      Number(Boolean(demand&&a.matchType!=='single'))-Number(Boolean(demand&&b.matchType!=='single'))||(located?byDistance(a,b):byPrice(a,b)));
    return {...pair,rows:[pair.first,pair.second,...tail].filter(Boolean),
      estoreFirst:located&&!demand&&distanceLimit==null&&!eligible.some(row=>Number(row.route.km)<=radius)};
  }

  function highlightRanked(rows,{radius=DEFAULT_RADIUS_KM,maxRadius=null,located=true}={}){
    const ordered=(rows||[]).filter(Boolean);
    const pair=choosePair(ordered,{radius,maxRadius,located});
    const used=new Set([pair.first,pair.second].filter(Boolean).map(key));
    const rowsOut=[pair.first,pair.second,...ordered.filter(row=>!used.has(key(row)))].filter(Boolean);
    const highlights=Object.create(null);
    if(located&&pair.first)highlights[key(pair.first)]='离您最近';
    if(located&&pair.second&&pair.cheaper)highlights[key(pair.second)]=pair.expanded?'稍远更省':'区域低价';
    return {...pair,rows:rowsOut,highlights};
  }
  g.MINI_KOALA_RECOMMENDATION_POLICY_V2={rank,highlightRanked,choosePair};
})(window);
