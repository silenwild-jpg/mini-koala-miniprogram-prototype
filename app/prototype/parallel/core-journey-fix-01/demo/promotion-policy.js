(function(root){
  'use strict';
  // Promotion eligibility, stacking and coupon lifecycle are deliberately
  // independent from page presentation and price rendering.
  const approvedStacks=new Set([
    'RENT_CASH_COUPON|TERM_DISCOUNT',
    'MOVING_SERVICE|RENT_CASH_COUPON',
    'MOVING_SERVICE|TERM_DISCOUNT'
  ]);
  const pendingStacks=new Set([
    'TERM_DISCOUNT|UNIT_SPECIAL_PRICE','RENT_CASH_COUPON|UNIT_SPECIAL_PRICE',
    'CAMPAIGN_FREE_TERM|RENT_CASH_COUPON','CAMPAIGN_FREE_TERM|TERM_DISCOUNT',
    'SALES_FREE_TERM|RENT_CASH_COUPON','SALES_FREE_TERM|TERM_DISCOUNT',
    'CAMPAIGN_FREE_TERM|UNIT_SPECIAL_PRICE','SALES_FREE_TERM|UNIT_SPECIAL_PRICE'
  ]);
  function create(){
    const key=(a,b)=>[String(a),String(b)].sort().join('|');
    function stacking(a,b){
      const k=key(a,b);
      if(a===b)return {status:'BLOCKED',allowed:false,reason:'DUPLICATE_BENEFIT_TYPE'};
      if(approvedStacks.has(k))return {status:'ALLOWED',allowed:true,reason:null};
      if(pendingStacks.has(k))return {status:'NEEDS_CONFIRMATION',allowed:false,reason:'BUSINESS_STACK_POLICY_UNCONFIRMED'};
      return {status:'NEEDS_CONFIRMATION',allowed:false,reason:'NO_APPROVED_STACK_POLICY'};
    }
    function evaluateCampaign(campaign,context={}){
      const reasons=[],today=String(context.today||''),unit=context.unit,store=context.store,term=Number(context.termMonths);
      if(!campaign||campaign.active!==true)reasons.push('INACTIVE');
      if(!today||!campaign?.from||!campaign?.until)reasons.push('DATE_CONTEXT_MISSING');
      else {if(campaign.from>today)reasons.push('NOT_STARTED');if(campaign.until<today)reasons.push('ENDED');}
      if(!unit||unit.id!==campaign?.unitId)reasons.push('UNIT_MISMATCH');
      if(!store||store.id!==campaign?.storeId||unit?.store_id!==store?.id)reasons.push('STORE_MISMATCH');
      if(unit&&Number(unit.revision)!==Number(campaign?.catalogRevision))reasons.push('CATALOG_REVISION_MISMATCH');
      if(context.available!==true)reasons.push('UNIT_UNAVAILABLE');
      if(!Number.isInteger(term)||term<1||term>60)reasons.push('TERM_REQUIRED');
      else if(term<Number(campaign?.minMonths)||term>Number(campaign?.maxMonths))reasons.push('TERM_INELIGIBLE');
      return {status:reasons.length?'INELIGIBLE':'ELIGIBLE',eligible:reasons.length===0,campaign_id:campaign?.id||null,reasons};
    }
    function transitionCoupon(coupon,next){
      const transitions={AVAILABLE:['SELECTED','EXPIRED'],SELECTED:['AVAILABLE','LOCKED','EXPIRED'],LOCKED:['AVAILABLE','REDEEMED'],REDEEMED:[],EXPIRED:[]};
      if(!coupon||!transitions[coupon.status]||!transitions[coupon.status].includes(next))throw Error('INVALID_COUPON_TRANSITION');
      return {...coupon,status:next};
    }
    return {stacking,evaluateCampaign,transitionCoupon};
  }
  root.SIM_PROMOTION_POLICY={create};
  if(typeof module==='object'&&module.exports)module.exports={create};
})(typeof window==='object'?window:globalThis);
