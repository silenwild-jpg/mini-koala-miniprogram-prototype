(function(root){
  'use strict';
  const ALLOWED=new Set(['TERM_DISCOUNT|RENT_CASH_COUPON','TERM_DISCOUNT|MOVING_SERVICE','RENT_CASH_COUPON|MOVING_SERVICE']);
  const UNRESOLVED=new Set([
    'TERM_DISCOUNT|UNIT_SPECIAL_PRICE','RENT_CASH_COUPON|UNIT_SPECIAL_PRICE',
    'CAMPAIGN_FREE_TERM|RENT_CASH_COUPON','CAMPAIGN_FREE_TERM|TERM_DISCOUNT',
    'SALES_FREE_TERM|RENT_CASH_COUPON','SALES_FREE_TERM|TERM_DISCOUNT',
    'CAMPAIGN_FREE_TERM|UNIT_SPECIAL_PRICE','SALES_FREE_TERM|UNIT_SPECIAL_PRICE'
  ]);
  const pair=(a,b)=>[a,b].sort().join('|');
  function create({fixture,config,now}={}){
    const today=()=>typeof now==='function'?String(now()):String(fixture?.demoToday||'');
    function evaluateCampaign(campaign,context={}){
      const reasons=[],u=context.unit,store=context.store;
      if(!campaign||campaign.active!==true)reasons.push('INACTIVE');
      if(campaign?.from&&campaign.from>today())reasons.push('NOT_STARTED');
      if(campaign?.until&&campaign.until<today())reasons.push('ENDED');
      if(!u||u.id!==campaign?.unitId)reasons.push('UNIT_MISMATCH');
      if(!store||store.id!==campaign?.storeId||u?.store_id!==store?.id)reasons.push('STORE_MISMATCH');
      if(u&&campaign?.catalogRevision!==u.revision)reasons.push('CATALOG_REVISION_MISMATCH');
      if(context.available!==true)reasons.push('UNIT_UNAVAILABLE');
      const months=Number(context.termMonths);
      if(!Number.isInteger(months)||months<1||months>60)reasons.push('TERM_REQUIRED');
      else if(months<Number(campaign?.minMonths)||months>Number(campaign?.maxMonths))reasons.push('TERM_INELIGIBLE');
      const valid=reasons.length===0;
      return {status:valid?'ELIGIBLE':'INELIGIBLE',eligible:valid,campaign_id:campaign?.id||null,reasons};
    }
    function stacking(a,b){
      const k=pair(a,b);
      if(a===b)return {status:'BLOCKED',allowed:false,reason:'DUPLICATE_BENEFIT_TYPE'};
      if(ALLOWED.has(k))return {status:'ALLOWED',allowed:true,reason:null};
      if(UNRESOLVED.has(k))return {status:'NEEDS_CONFIRMATION',allowed:false,reason:'BUSINESS_STACK_POLICY_UNCONFIRMED'};
      return {status:'NEEDS_CONFIRMATION',allowed:false,reason:'NO_APPROVED_STACK_POLICY'};
    }
    function transitionCoupon(coupon,next){
      const allowed={
        AVAILABLE:['SELECTED','EXPIRED'],
        SELECTED:['AVAILABLE','LOCKED','EXPIRED'],
        LOCKED:['AVAILABLE','REDEEMED'],
        REDEEMED:[],
        EXPIRED:[]
      };
      if(!coupon||!allowed[coupon.status]||!allowed[coupon.status].includes(next))
        throw new Error('INVALID_COUPON_TRANSITION');
      return {...coupon,status:next};
    }
    return {evaluateCampaign,stacking,transitionCoupon};
  }
  root.SIM_PROMOTION_POLICY={create};
  if(typeof module==='object'&&module.exports)module.exports={create};
})(typeof window==='object'?window:globalThis);
