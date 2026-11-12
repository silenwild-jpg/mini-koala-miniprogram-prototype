/* MOTION-S01-S5-01B | S5 selected-origin distance rank; display only, no price or order mutations. */
(function(root){
  'use strict';
  const RAD=Math.PI/180;
  const earthKm=6371.0088;
  const valid=(lat,lng)=>Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-90&&lat<=90&&lng>=-180&&lng<=180&&!(lat===0&&lng===0);
  function distanceKm(a,b){
    const dLat=(b.latitude-a.latitude)*RAD,dLng=(b.longitude-a.longitude)*RAD;
    const h=Math.sin(dLat/2)**2+Math.cos(a.latitude*RAD)*Math.cos(b.latitude*RAD)*Math.sin(dLng/2)**2;
    return 2*earthKm*Math.asin(Math.min(1,Math.sqrt(h)));
  }
  function rentOf(row,costOf){
    try{const n=Number(costOf(row));return Number.isFinite(n)&&n>=0?n:Infinity;}catch{return Infinity;}
  }
  function rank(input,origin,costOf=()=>Infinity){
    const initial=Array.isArray(input)?input.slice():[];
    const latitude=Number(origin?.latitude),longitude=Number(origin?.longitude);
    if(!origin||!valid(latitude,longitude)||!origin.city)return {rows:initial,applied:false,supported:0};
    const located=[],unlocated=[];
    for(const row of initial){
      const s=row?.store||{},g=s.geo||{};
      const lat=Number(g.latitude),lng=Number(g.longitude);
      if(s.city!==origin.city||!g.route_candidate||!valid(lat,lng)){
        unlocated.push(row);
        continue;
      }
      const km=Number(distanceKm({latitude,longitude},{latitude:lat,longitude:lng}).toFixed(1));
      located.push({...row,store:{...s,distance:km},distanceFromOrigin:true,originDistanceKm:km,
        expandedSearch:km>3});
    }
    if(located.length<2)return {rows:initial,applied:false,supported:located.length};
    const byDistance=(a,b)=>a.originDistanceKm-b.originDistanceKm||String(a.store.id).localeCompare(String(b.store.id));
    const byCost=(a,b)=>rentOf(a,costOf)-rentOf(b,costOf)||byDistance(a,b);
    located.sort(byDistance);
    const first=located[0],rest=located.slice(1),basePrice=rentOf(first,costOf);
    let second=null;
    if(Number.isFinite(basePrice)){
      for(const radius of [3,5,10]){
        const options=rest.filter(r=>r.originDistanceKm<=radius&&rentOf(r,costOf)<basePrice);
        if(options.length){second=options.sort(byCost)[0];break;}
      }
    }
    if(!second)second=rest.slice().sort(byDistance)[0];
    const tail=rest.filter(x=>x!==second);
    // A store without coordinates may remain browsable but must not display a
    // distance inherited from the pre-selection, unrelated origin.
    const remaining=unlocated.map(row=>({...row,store:{...row.store,distance:NaN},distanceFromOrigin:false}));
    return {rows:[first,second,...tail,...remaining],applied:true,supported:located.length};
  }
  root.S5_LOCATION_RANKER={rank,distanceKm};
  if(typeof module==='object'&&module.exports)module.exports=root.S5_LOCATION_RANKER;
})(typeof window==='object'?window:globalThis);
