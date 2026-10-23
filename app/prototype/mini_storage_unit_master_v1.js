(function(root){
  const D=root.MINI_KOALA_DATA;
  if(!D)return;
  const round1=v=>Math.round(Number(v)*10)/10;
  const splitUnitNos=value=>String(value||'').split(/[，,、\s]+/).filter(Boolean);
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const hash=s=>[...String(s)].reduce((n,ch)=>(n*31+ch.charCodeAt(0))>>>0,2166136261);
  const fullOnlySizes=(options)=>{
    const sizes=options.map(x=>Number(x.size)).filter(v=>v>0).sort((a,b)=>a-b);
    if(!sizes.length)return [];
    const used=new Set(sizes.map(v=>v.toFixed(1)));
    const candidates=[];
    const lo=round1(Math.max(.5,sizes[0]*.72));
    const hi=round1(Math.min(200,sizes[sizes.length-1]*1.22));
    if(lo>=.5&&!used.has(lo.toFixed(1))&&Math.abs(lo-sizes[0])>=.2)candidates.push(lo);
    if(hi>sizes[sizes.length-1]&&!used.has(hi.toFixed(1))&&Math.abs(hi-sizes[sizes.length-1])>=.3)candidates.push(hi);
    if(candidates.length<2 && sizes.length>=3){
      let best=null;
      for(let i=1;i<sizes.length;i++){
        const gap=sizes[i]-sizes[i-1];
        if(gap>=1.2 && (!best||gap>best.gap))best={gap,value:round1((sizes[i]+sizes[i-1])/2)};
      }
      if(best&&!used.has(best.value.toFixed(1)))candidates.push(best.value);
    }
    return [...new Set(candidates)].slice(0,2);
  };
  const records=[];
  const capacities=[];
  const byStore={};
  D.stores.forEach(store=>{
    const opts=D.getSizeOptions(store.store_id);
    const storeRows=[];
    opts.forEach((opt,idx)=>{
      const available=Math.max(0,Number(opt.available_count||0));
      const occupied=Math.max(2,Math.ceil(available*(1.5+((hash(opt.size_option_id)%5)/10))));
      const reserved=available>=4?1:0;
      const maintenance=(hash(opt.size_option_id)%7===0)?1:0;
      const offline=(hash(opt.size_option_id)%13===0)?1:0;
      const total=available+occupied+reserved+maintenance+offline;
      const existing=splitUnitNos(opt.representative_unit_no);
      for(let i=0;i<total;i++){
        const state=i<available?'AVAILABLE':i<available+occupied?'RENTED':i<available+occupied+reserved?'RESERVED':i<available+occupied+reserved+maintenance?'MAINTENANCE':'OFFLINE';
        const id=existing[i]||`${store.store_id.replace('MK_','')}_${String(idx+1).padStart(2,'0')}${String(i+1).padStart(3,'0')}`;
        records.push({unit_id:id,store_id:store.store_id,size_option_id:opt.size_option_id,size:Number(opt.size),status:state,base_monthly_price:Number(opt.display_price_min||0),source:'prototype_unit_master'});
      }
      const row={store_id:store.store_id,size_option_id:opt.size_option_id,size:Number(opt.size),total_count:total,available_count:available,rented_count:occupied,reserved_count:reserved,maintenance_count:maintenance,offline_count:offline,status:available>0?'AVAILABLE':'SOLD_OUT',price:Number(opt.display_price_min||0)};
      capacities.push(row);storeRows.push(row);
    });
    fullOnlySizes(opts).forEach((size,idx)=>{
      const total=2+(hash(store.store_id+size)%5);
      const row={store_id:store.store_id,size_option_id:`${store.store_id}__FULL_${String(size).replace('.','_')}`,size:Number(size),total_count:total,available_count:0,rented_count:total,reserved_count:0,maintenance_count:0,offline_count:0,status:'SOLD_OUT',price:null};
      capacities.push(row);storeRows.push(row);
      for(let i=0;i<total;i++)records.push({unit_id:`${store.store_id.replace('MK_','')}_F${idx+1}${String(i+1).padStart(3,'0')}`,store_id:store.store_id,size_option_id:row.size_option_id,size:Number(size),status:'RENTED',base_monthly_price:null,source:'prototype_unit_master'});
    });
    byStore[store.store_id]=storeRows;
  });
  const storeId=id=>D.resolveStoreId(id);
  const getCapacitySummary=(id,scenario='')=>{
    const rows=(byStore[storeId(id)]||[]).map(r=>({...r}));
    if(scenario==='soldout')return rows.map(r=>({...r,available_count:0,rented_count:r.total_count,reserved_count:0,maintenance_count:0,offline_count:0,status:'SOLD_OUT'}));
    return rows;
  };
  const getStoreSummary=(id,scenario='')=>{
    const rows=getCapacitySummary(id,scenario);
    return {store_id:storeId(id),total_units:rows.reduce((n,r)=>n+r.total_count,0),available_units:rows.reduce((n,r)=>n+r.available_count,0),capacity_count:rows.length,available_capacity_count:rows.filter(r=>r.available_count>0).length,soldout_capacity_count:rows.filter(r=>r.available_count===0).length,status:rows.some(r=>r.available_count>0)?'AVAILABLE':'SOLD_OUT'};
  };
  const getSoldoutCapacities=(id,scenario='')=>getCapacitySummary(id,scenario).filter(r=>r.available_count===0).sort((a,b)=>a.size-b.size);
  const getUnits=(id,status)=>records.filter(r=>r.store_id===storeId(id)&&(!status||r.status===status));
  root.MINI_STORAGE_UNIT_MASTER_V1={schema_version:'1.0',states:['AVAILABLE','RENTED','RESERVED','MAINTENANCE','OFFLINE'],records,capacities,getCapacitySummary,getStoreSummary,getSoldoutCapacities,getUnits};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.MINI_STORAGE_UNIT_MASTER_V1;
})(typeof window!=='undefined'?window:globalThis);
