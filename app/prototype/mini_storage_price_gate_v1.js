/* Phase 3C Batch A: fail-closed demo price snapshot gate. Not a signed server quotation. */
(function(root,factory){
  const API=factory();
  if(typeof module==='object'&&module.exports)module.exports=API;
  if(root)root.MINI_KOALA_PRICE_GATE_V1=API;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  function parseTerm(raw){
    const value=String(raw===null||raw===undefined?'':raw);
    return /^(?:[1-9]|[1-5][0-9]|60)$/.test(value)?Number(value):null;
  }
  function int(value,{positive=false}={}){
    if(value===null||value===undefined||value==='')return null;
    const n=typeof value==='number'?value:Number(value);
    return Number.isSafeInteger(n)&&(!positive||n>0)&&n>=0?n:null;
  }
  function validate(snapshot,ctx,now=Date.now()){
    function fail(reason){return {valid:false,reason,values:null}}
    const term=parseTerm(ctx?.termRaw);
    if(term===null)return fail('TERM_INVALID');
    if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))return fail('SNAPSHOT_MISSING');
    const expectedSize=String(ctx?.sizeOptionId||'');
    const expectedRepresentative=String(ctx?.representativeUnitNo||'');
    const expectedActual=String(ctx?.actualUnitId||'');
    const expectedType=expectedActual?'ACTUAL_UNIT':'SIZE_OPTION';
    if(!ctx?.storeId||!expectedSize||!expectedRepresentative)return fail('IDENTITY_MISSING');
    if(snapshot.store_id!==ctx.storeId||snapshot.size_option_id!==expectedSize||
       snapshot.representative_unit_no!==expectedRepresentative||
       snapshot.unit_id!==expectedRepresentative||
       String(snapshot.actual_unit_id||'')!==expectedActual||
       snapshot.unit_identity_type!==expectedType)return fail('IDENTITY_MISMATCH');
    if(int(snapshot.term_months,{positive:true})!==term)return fail('TERM_MISMATCH');
    if(!ctx?.pricingModelVersion||snapshot.pricing_model_version!==ctx.pricingModelVersion)return fail('PRICING_VERSION_MISMATCH');
    const stamp=String(snapshot.pricing_timestamp||'');
    const timestamp=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(stamp)?Date.parse(stamp):NaN;
    if(!Number.isFinite(timestamp)||new Date(timestamp).toISOString()!==new Date(stamp).toISOString()||timestamp>now+5*60*1000)return fail('TIMESTAMP_INVALID');
    // Price recency alone is not a lock-price policy. No invented 48h expiry here.
    const total=int(snapshot.total_rent,{positive:true});
    const monthly=int(snapshot.monthly_average,{positive:true});
    const deposit=int(snapshot.deposit,{positive:true});
    const fee=int(snapshot.management_fee);
    const payable=int(snapshot.upfront_payable,{positive:true});
    const discount=int(snapshot.coupon_discount_amount===undefined?0:snapshot.coupon_discount_amount);
    if([total,monthly,deposit,fee,payable,discount].some(x=>x===null))return fail('AMOUNT_INVALID');
    if(monthly!==Math.round(total/term)||deposit!==monthly||fee!==Number(ctx.managementFee)||discount>total)return fail('COMPONENT_MISMATCH');
    const applied=snapshot.coupon_applied===true;
    if((applied&&(!discount||!snapshot.coupon_id||!snapshot.user_coupon_id))||(!applied&&discount!==0))return fail('COUPON_SNAPSHOT_INVALID');
    if(applied&&(int(snapshot.rent_after_coupon)!==total-discount||int(snapshot.rent_before_coupon)!==total))return fail('COUPON_COMPONENT_MISMATCH');
    if(payable!==total-discount+deposit+fee)return fail('PAYABLE_MISMATCH');
    if(applied&&ctx?.requireCouponVerification&&typeof ctx?.couponVerifier!=='function')return fail('COUPON_VERIFIER_MISSING');
    if(applied&&typeof ctx?.couponVerifier==='function'){
      const eligibility=ctx.couponVerifier(snapshot,{firstPurchase:ctx.firstPurchase!==false});
      if(!eligibility?.valid)return fail(eligibility?.reason||'COUPON_INVALID');
    }
    return {valid:true,reason:'OK',values:{term,monthly,total,deposit,managementFee:fee,payable,couponDiscount:discount}};
  }
  return {parseTerm,validate};
});
