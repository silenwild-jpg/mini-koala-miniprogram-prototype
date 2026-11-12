/* CAP-UNIT-DUAL-01: input display only; prices and IDs remain m³-based. */
(function(root){
  'use strict';
  const HEIGHT=2.5;
  function validArea(value){
    return typeof value==='number'&&Number.isFinite(value)&&value>=0.2&&value<=80&&
      Math.abs(value*10-Math.round(value*10))<1e-7;
  }
  function cubicFromArea(value){
    return validArea(value)?Number((value*HEIGHT).toFixed(2)):null;
  }
  function areaForUnit(unit){
    if(!unit)return null;
    const dimensions=unit.dimensions_m;
    if(Array.isArray(dimensions)&&dimensions.length>=2){
      const a=Number(dimensions[0]),b=Number(dimensions[1]);
      if(Number.isFinite(a)&&a>0&&Number.isFinite(b)&&b>0)return Number((a*b).toFixed(2));
    }
    const area=unit.area;
    return typeof area==='number'&&Number.isFinite(area)&&area>0?area:null;
  }
  function pretty(value){return String(Number(Number(value).toFixed(2)));}
  function demandCapacity(requirement){
    const r=requirement||{};
    const volume=Number(r.capacity_m3);
    if(!Number.isFinite(volume)||volume<=0)return '';
    if(r.input_unit==='m2'&&validArea(Number(r.input_value))&&
      Math.abs(cubicFromArea(Number(r.input_value))-volume)<0.001)
      return pretty(r.input_value)+'㎡ · '+pretty(volume)+'m³';
    return pretty(volume)+'m³';
  }
  function unitAreaSuffix(unit){
    const area=areaForUnit(unit);
    return area===null?'':'约'+pretty(area)+'㎡';
  }
  const API={HEIGHT,validArea,cubicFromArea,areaForUnit,demandCapacity,unitAreaSuffix};
  root.SIM_SPACE_UNIT=API;
  if(typeof module==='object'&&module.exports)module.exports=API;
})(typeof window==='object'?window:globalThis);
