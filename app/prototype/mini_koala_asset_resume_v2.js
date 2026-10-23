(function(g){
  'use strict';
  function read(k){try{return JSON.parse(localStorage.getItem(k)||'{}')}catch(e){return {}}}
  function restore(asset,params){
    const saved=asset?.price_snapshot,current=read('mini_storage_price_snapshot_current');
    const agrees=s=>s&&s.store_id===asset.store_id&&Number(s.term_months)===Number(asset.term_months)&&
      (!asset.size_option_id||s.size_option_id===asset.size_option_id)&&
      [s.unit_id,s.representative_unit_no,s.actual_unit_id].includes(asset.unit_id)&&
      Number(s.total_rent)===Number(asset.total_rent||asset.total_price)&&
      Number(s.upfront_payable)===Number(asset.payable_total||asset.upfront_payable||asset.initial_payable);
    const s=saved&&agrees(saved)?saved:agrees(current)?current:null;
    if(!s||!s.size_option_id||!s.representative_unit_no||!s.unit_identity_type)return false;
    const linked={store:s.store_id,unit:s.representative_unit_no,sizeOption:s.size_option_id,representativeUnit:s.representative_unit_no,
      actualUnit:s.actual_unit_id||'',inventoryIdentity:s.unit_identity_type,term:String(s.term_months),pricingModel:s.pricing_model_version,
      monthly:String(s.monthly_average),rentTotal:String(s.total_rent),deposit:String(s.deposit),managementFee:String(s.management_fee),initialPayable:String(s.upfront_payable)};
    Object.entries(linked).forEach(([k,v])=>params.set(k,v));
    if(asset.start_date)params.set('start',asset.start_date);
    localStorage.setItem('mini_storage_price_snapshot_current',JSON.stringify(s));return true;
  }
  g.MINI_KOALA_ASSET_RESUME_V2={restore};
})(window);
