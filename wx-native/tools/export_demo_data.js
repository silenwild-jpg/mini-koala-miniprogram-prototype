// 从冻结稿规则脚本导出：① 演示数据（清洗后）→ miniprogram/mock/；② 对照基准 → tests/golden.json
// 用法：node tools/export_demo_data.js <冻结稿 design 目录> <输出根目录>
const fs=require('fs'),vm=require('vm'),path=require('path');
const D=process.argv[2],OUT=process.argv[3];
const order=['runtime/fixtures.js','runtime/space-unit.js','runtime/store-geo.js','runtime/promotion-policy.js','runtime/gift-term-policy.js','runtime/presentation-policy.js','runtime/recommendation-policy.js','runtime/home-recommend-policy.js','runtime/lifecycle-contract.js','runtime/demo-core.js','runtime/items-catalog.js','model/volume-model.js','model/w7-rules.js'];
const ctx=vm.createContext({console});ctx.globalThis=ctx;ctx.window=ctx;
for(const f of order)vm.runInContext(fs.readFileSync(path.join(D,f),'utf8'),ctx,{filename:f});
const F=ctx.SIM_FIXTURES,W=ctx.MK_W7,core=ctx.SIM_CORE.create({}),V=ctx.MK_VOLUME_MODEL,CAT=ctx.MK_ITEMS_CATALOG;
const geo={};try{(ctx.SIM_STORE_GEO.list?ctx.SIM_STORE_GEO.list():[]).forEach(g=>geo[g.store_id]=g);}catch(_){}
const stores=F.stores.map(s=>({id:s.id,city:s.city,name:s.name,district:W.districtOf(s),area:W.areaOf(s),community:s.community||'',address:s.address,
  distance_km:typeof s.distance==='number'?s.distance:null,status:s.status,access_hours:s.access_hours||'',tags:s.serviceTags||s.tags||[],phone:s.phone||'',
  operating_tag:s.operatingTag||'',photo:''}));
const units=F.units.map(u=>{const t=W.unitTier(u);return {id:u.id,store_id:u.store_id,code:u.demo_cabin_no||('A'+String(u.code||'').replace(/\D/g,'').padStart(3,'0')),
  volume:Number(u.volume),area:Number(u.area)||null,dims:u.dimensions_m||null,base_month:u.base_month,status:u.status,special_month:null,
  tier_index:t?t.index:null,tier_total:t?t.total:null};});
const items={categories:CAT.categories,items:CAT.items.filter(i=>i.id!=='winebox').map(i=>({id:i.id,category:i.category,name:i.name,description:i.description||'',variants:i.variants,defaultVariant:i.defaultVariant,long:!!i.long,photo:i.photo||''}))};
items.categories=items.categories.map(c=>[c[0],c[1],c[2].filter(id=>id!=='winebox')]);
fs.mkdirSync(path.join(OUT,'miniprogram/mock'),{recursive:true});
const w=(n,o,note)=>fs.writeFileSync(path.join(OUT,'miniprogram/mock',n),'// '+note+'\n// 由 tools/export_demo_data.js 从冻结稿导出，不要手改；正式环境由接口返回。\nmodule.exports = '+JSON.stringify(o)+';\n');
w('stores.js',stores,'演示门店（名称与地址摘自业务表格；距离、营业时间为演示值，未核实）');
w('units.js',units,'演示仓位（容量、价格、库存、层标签均为内部演示配置，不是真实报价）');
w('items.js',items,'物品目录 39 项（单品体积为待实测校准的初值）');
// 对照基准
const TERMS=[1,2,3,5,6,11,12,24,60];
const g={terms:TERMS,termFactor:TERMS.map(W.termFactor),termDiscount:TERMS.map(W.termDiscount),units:{},stores:{},nextTier:{},fullTier:{},fit:[],freeTransport:[],nudgeFar:[],volume:[],areaToM3:[]};
for(const u of F.units){if(!core.available(u))continue;const row={from:W.unitFromMonthly(core,u),a:{}};
  for(const m of TERMS){const a=core.amounts([u.id],m);row.a[m]={rent_total:a.rent_total,monthly:a.monthly_average,deposit:a.deposit,fee:a.management_fee,full:a.full_reduction||0,full_min:a.full_min||null,payable:a.payable,term_saved:a.term_discount_total,special:!!(a.campaign_ids&&a.campaign_ids.length),saved:W.savedTotal(a)};}
  g.units[u.id]=row;}
for(const s of F.stores){g.stores[s.id]={from:W.storeFromText(s,core),available:F.units.filter(u=>u.store_id===s.id&&core.available(u)).map(u=>u.id)};}
for(let m=1;m<=60;m++)g.nextTier[m]=W.nextTier(m);
for(const t of [0,4999,5000,9999,10000,19999,20000,50000])g.fullTier[t]=W.fullTier(t);
for(const [v,n] of [[3.5,3.5],[4,3.5],[3,3.5],[2.8,3.5],[2.79,3.5],[5,null],[8,10],[7.9,10]])g.fit.push({v,n,r:W.fit(v,n)});
for(const km of [null,0,4.9,5,12])for(const m of [1,5,6,12])g.freeTransport.push({km,m,r:W.freeTransportFor(km,m)});
for(const km of [null,3,6])for(const m of [1,2,3,4,5,6,9,11,12])for(const base of [0,400])g.nudgeFar.push({km,m,base,r:W.nudgeFar(m,base,null,0,km)});
const pick=(id,vid,count)=>{const it=CAT.items.find(x=>x.id===id),v=it.variants.find(x=>x.id===(vid||it.defaultVariant));return {id,category:it.category,volume_m3:v.volume_m3,count};};
const lists=[[['box',10]],[['box',20],['sofa3',1]],[['sofa3',1],['bed180',1],['fridge',1]],[['goodsbox',30],['shelf',2]],[['archiveBox',40],['officeDesk',2],['box',5]],[['luggage28',2]],[['box',1]],[['wardrobe',2],['box',60],['washer',1],['bicycle',1]]];
for(const l of lists){const lines=l.map(([id,c])=>pick(id,null,c));g.volume.push({lines,r:V.recommend(lines)});}
for(const a of [0.2,1,2,12.5,200])g.areaToM3.push({a,r:V.cubicFromArea(a)});
g.meta={source:'冻结稿 W27 design/runtime + design/model',best_term:W.BEST_TERM,best_factor:W.BEST_FACTOR,stores:stores.length,units:units.length,items:items.items.length};
fs.writeFileSync(path.join(OUT,'tests/golden.json'),JSON.stringify(g));
console.log(JSON.stringify(g.meta),'available units',Object.keys(g.units).length,'special',Object.values(g.units).filter(r=>Object.values(r.a).some(x=>x.special)).length,'withFull',Object.values(g.units).filter(r=>Object.values(r.a).some(x=>x.full>0)).length);
console.log('sample store',JSON.stringify(stores[0]),'\nsample unit',JSON.stringify(units[2]),'\ncities',[...new Set(stores.map(s=>s.city))],'no dist',stores.filter(s=>s.distance_km==null).length,'statuses',[...new Set(stores.map(s=>s.status))]);
