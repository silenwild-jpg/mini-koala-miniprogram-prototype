(function(root){
  'use strict';
  const allowedSources=new Set(['CAMPAIGN','SALES_CASE']);
  const transitions={
    DRAFT:['SUBMITTED'],
    SUBMITTED:['APPROVED','REJECTED'],
    APPROVED:['ATTACHED_TO_QUOTE','REJECTED'],
    REJECTED:[],
    ATTACHED_TO_QUOTE:['LOCKED_TO_ORDER','APPROVED'],
    LOCKED_TO_ORDER:['GRANTED','APPROVED'],
    GRANTED:[]
  };
  const copy=value=>JSON.parse(JSON.stringify(value));
  function create(){
    function validate(input){
      const reasons=[];
      if(!input||!allowedSources.has(input.source_type))reasons.push('INVALID_SOURCE');
      if(!Number.isInteger(input?.gift_months)||input.gift_months<1||input.gift_months>60)reasons.push('INVALID_GIFT_MONTHS');
      if(!input?.store_id||!input?.unit_id)reasons.push('SCOPE_REQUIRED');
      if(input?.source_type==='SALES_CASE'&&(!input.requested_by||!input.reason))reasons.push('SALES_AUDIT_REQUIRED');
      if(input?.source_type==='SALES_CASE'&&input.status!=='APPROVED'&&!input.approval_id)reasons.push('APPROVAL_REQUIRED');
      if(input?.expires_at&&input?.created_at&&input.expires_at<=input.created_at)reasons.push('INVALID_VALIDITY');
      return {valid:reasons.length===0,reasons};
    }
    function transition(item,next,meta={}){
      if(!item||!transitions[item.status]||!transitions[item.status].includes(next))throw Error('INVALID_GIFT_TERM_TRANSITION');
      if(next==='APPROVED'&&(!meta.approval_id||!meta.approved_by))throw Error('APPROVAL_METADATA_REQUIRED');
      if(next==='ATTACHED_TO_QUOTE'&&!meta.quote_id)throw Error('QUOTE_REQUIRED');
      if(next==='LOCKED_TO_ORDER'&&!meta.order_id)throw Error('ORDER_REQUIRED');
      return {...copy(item),...copy(meta),status:next};
    }
    function display(item){
      const check=validate(item);
      return {label:Number.isInteger(item?.gift_months)?'赠送'+item.gift_months+'个月':'赠送租期',
        status:item?.status||'UNCONFIRMED',eligible:check.valid&&item.status==='APPROVED',
        financial_effect:'PENDING_BUSINESS_CONFIRMATION',
        contract_months:null,paid_months:null,deposit_effect:null,
        reasons:check.reasons};
    }
    function snapshot(item){
      const check=validate(item);
      if(!check.valid)throw Error('INVALID_GIFT_TERM_BENEFIT');
      return {benefit_id:item.id||null,source_type:item.source_type,source_id:item.source_id||null,
        store_id:item.store_id,unit_id:item.unit_id,gift_months:item.gift_months,
        status:item.status,approval_id:item.approval_id||null,approved_by:item.approved_by||null,
        requested_by:item.requested_by||null,reason:item.reason||null,
        financial_effect:'PENDING_BUSINESS_CONFIRMATION',contract_months:null,paid_months:null};
    }
    return {validate,transition,display,snapshot};
  }
  root.SIM_GIFT_TERM_POLICY={create};
  if(typeof module==='object'&&module.exports)module.exports={create};
})(typeof window==='object'?window:globalThis);
