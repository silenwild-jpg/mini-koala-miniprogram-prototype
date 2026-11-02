(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.MK_LIFECYCLE_CONTRACT_V1=api;})(typeof window==='object'?window:globalThis,function(){'use strict';
const VERSION='RC2_RULE_FIX_01A_ISOLATED_V1';
const PAID=new Set(['paid_simulated']);
function normalize(coreState){
 const orders=Array.isArray(coreState&&coreState.orders)?coreState.orders:[];
 const services=coreState&&coreState.services||{};
 return orders.map(o=>{
  const paid=PAID.has(o.status);
  const service=services[o.id]||{},life=service.lifecycle_v2||null,exit=life?.exit||service.exit||null;
  const completed=(life?.renewal_requests||[]).filter(x=>x.status==='COMPLETED');
  return {id:o.id,source:'SIMULATED_ORDER',status:o.status,store_id:o.store_id,unit_ids:[...(o.unit_ids||[])],term_months:o.term_months,start_date:o.start_date,payable:o.payable,deposit:o.deposit,
   lease_status:!paid?'not_active':exit?.status==='INSPECTION_PASSED'||exit?.status==='completed'?'ended':exit?'returning':'active_demo',
   deposit_status:paid?(life?.deposit||service.deposit||'held'):'not_collected',
   identity_status:paid?(service.identity||'pending'):'not_applicable',
   payment_records:paid?[{id:o.id,type:'INITIAL',amount:o.payable,simulated:true},...completed.map(x=>({id:x.payment_id,type:'RENEWAL',amount:x.quote_total,simulated:true}))]:[],
   // Never infer real end dates, renewal prices, refunds or invoice issuance from old fixtures.
   lifecycle_actions:{renewal:'NOT_BOUND',exit:'NOT_BOUND',invoice:'NOT_BOUND',deposit:'READ_ONLY'}
  };
 });
}
function orderById(coreState,id){return normalize(coreState).find(o=>o.id===id)||null;}
function history(coreState){return normalize(coreState).slice().reverse();}
return {VERSION,normalize,orderById,history};
});