/* Mini Koala store-location source: 项目文件“门店导出列表_地址标准化_2026-08-16.xlsx”.
   Input longitude/latitude use OSM-compatible WGS84; Amap URI needs GCJ-02.
   Ambiguous same-property candidates are retained with needs_review=true, not routed as precise points.
   This mapping identifies a property and does not certify the exact storage entrance. */
(function(root){
 'use strict';
 const raw=[["SIM_BJ01",116.41445,39.97457,"BJ0116S01",0],["SIM_BJ02",116.432207,39.983798,"BJ0486C01",1],["SIM_BJ03",116.45071,39.90468,"BJ0135S01",0],["SIM_BJ04",116.448885,39.966974,"BJ0420C01",0],["SIM_BJ05",116.464516,40.010883,"BJ0316C01",0],["SIM_SH01",121.42755,31.210717,"SH0565S01",0],["SIM_SH02",121.35605,31.22658,"SH0563S01",0],["SIM_SZ01",113.865184,22.586251,"SZ0568S01",0],["SIM_BJ06",116.38918,39.86996,"BJ0130S01",1],["SIM_BJ07",116.437814,39.893233,"BJ0361C01",0],["SIM_BJ08",116.484657,39.989365,"BJ0319C01",0],["SIM_BJ09",116.290931,39.815977,"BJ0136S01",0],["SIM_BJ10",116.46665,39.89614,"BJ0194S01",1],["SIM_BJ11",116.30055,39.96342,"BJ0127S01",0],["SIM_BJ12",116.337634,40.072996,"BJ0292S01",0],["SIM_BJ13",116.694507,39.890919,"BJ0170S01",0],["SIM_BJ14",116.222359,39.911865,"BJ0377S01",0],["SIM_BJ15",116.332665,39.894335,"BJ0219S01",0],["SIM_BJ16",116.398294,39.880482,"BJ0478C01",0],["SIM_BJ17",116.497948,39.918102,"BJ0220C01",0],["SIM_BJ18",116.320515,39.871181,"BJ0477C01",1],["SIM_BJ19",116.469395,39.991312,"BJ0414C01",0],["SIM_BJ20",116.35167,40.01131,"BJ0105S01",1],["SIM_BJ21",116.243893,40.154298,"BJ0191S01",0],["SIM_BJ22",116.68263,39.93153,"BJ0171S01",0],["SIM_BJ23",116.360054,39.886392,"BJ0419C01",1],["SIM_BJ24",116.432096,39.897725,"BJ0446C01",0],["SIM_BJ25",116.45241,39.83928,"BJ0113S01",0],["SIM_BJ26",116.300133,39.842473,"BJ0452C01",0],["SIM_BJ27",116.313557,40.057248,"BJ0107S01",0],["SIM_BJ28",116.34857,40.067764,"BJ0436C01",1],["SIM_BJ29",116.658288,39.921983,"BJ0495C01",0],["SIM_BJ30",116.332022,39.89545,"BJ0144S01",0]];
 const PI=Math.PI,a=6378245,ee=0.00669342162296594323;
 function tLat(x,y){let ret=-100+2*x+3*y+.2*y*y+.1*x*y+.2*Math.sqrt(Math.abs(x));ret+=(20*Math.sin(6*x*PI)+20*Math.sin(2*x*PI))*2/3;ret+=(20*Math.sin(y*PI)+40*Math.sin(y/3*PI))*2/3;ret+=(160*Math.sin(y/12*PI)+320*Math.sin(y*PI/30))*2/3;return ret}
 function tLon(x,y){let ret=300+x+2*y+.1*x*x+.1*x*y+.1*Math.sqrt(Math.abs(x));ret+=(20*Math.sin(6*x*PI)+20*Math.sin(2*x*PI))*2/3;ret+=(20*Math.sin(x*PI)+40*Math.sin(x/3*PI))*2/3;ret+=(150*Math.sin(x/12*PI)+300*Math.sin(x/30*PI))*2/3;return ret}
 function gcj(lon,lat){
  const dLat=tLat(lon-105,lat-35),dLon=tLon(lon-105,lat-35),rad=lat/180*PI;
  let magic=1-ee*Math.pow(Math.sin(rad),2);const sqrt=Math.sqrt(magic);
  return [Number((lon+dLon*180/(a/sqrt*Math.cos(rad)*PI)).toFixed(6)),Number((lat+dLat*180/((a*(1-ee))/(magic*sqrt)*PI)).toFixed(6))];
 }
 const lookup={};
 for(const [id,lon,lat,sourceId,review] of raw){
  const coord=gcj(lon,lat);
  lookup[id]={store_id:id,source_store_code:sourceId,source_date:'2026-08-16',
    source_format:'WGS84',input_wgs84:[lon,lat],amap_gcj02:coord,
    needs_review:!!review,coordinate_scope:'property',source:'address-standardization-export'};
 }
 root.SIM_STORE_GEO={get(id){return lookup[id]||null},coverage(){return Object.keys(lookup).length},records:lookup};
 if(typeof module==='object'&&module.exports)module.exports=root.SIM_STORE_GEO;
})(typeof window==='object'?window:globalThis);
