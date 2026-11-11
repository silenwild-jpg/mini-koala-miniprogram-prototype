(function(root,factory){
  var api=factory();
  root.MK_M01_ORDER_ROUTE_01=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  // Central navigation contract for customer-facing order and after-sale screens.
  // An explicit unknown ID must stay unknown: never silently switch to a previously opened order.
  var pages=['O03','RN01','EX01','DP01','IV01'];
  function isOrderPage(page){return pages.includes(page);}
  function select(hasExplicitOrder,explicitOrderId,lastOrderId){
    return hasExplicitOrder?String(explicitOrderId??''):(lastOrderId||null);
  }
  function addQueryOrder(params,page,id,orders){
    if(isOrderPage(page)&&id&&Array.isArray(orders)&&orders.some(function(o){return o&&o.id===id;})){
      params.set('order',id);
    }
    return params;
  }
  return Object.freeze({isOrderPage:isOrderPage,select:select,addQueryOrder:addQueryOrder});
});
