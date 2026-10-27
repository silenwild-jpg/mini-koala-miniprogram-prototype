(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SIM_CENTRAL_CONTRACT_V1=api;
})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  const VERSION='CENTRAL_DEMO_02G_SIM_SOURCE_1';
  const fail=(reason)=>{throw new Error('CENTRAL_CONTRACT_'+reason);};
  const values=['rent_total','monthly_average','rent_after_coupon','monthly_after_coupon','deposit','management_fee','coupon_discount','payable'];
  function source(fixture){
    if(!fixture||fixture.synthetic!==true||!fixture.version||!Array.isArray(fixture.stores)||!Array.isArray(fixture.units))
      fail('FIXTURE_NOT_AUTHORIZED');
    const stores=new Map(),units=new Map();
    const ns=fixture.sourceNamespace==='MK'?'MK':'SIM',validId=id=>typeof id==='string'&&id.startsWith(ns+'_');
    for(const s of fixture.stores){if(!validId(s.id)||stores.has(s.id))fail('STORE_NAMESPACE');stores.set(s.id,s);}
    for(const u of fixture.units){if(!validId(u.id)||units.has(u.id)||!stores.has(u.store_id))fail('UNIT_NAMESPACE');units.set(u.id,u);}
    return {stores,units,fixtureVersion:fixture.version,sourceNamespace:ns};
  }
  function storeId(fixture,id){
    const catalog=source(fixture),key=String(id||'');
    if(!catalog.stores.has(key))fail(/^MK_|^SIM_/.test(key)?'STORE_SOURCE_MISMATCH_OR_UNMAPPED':'UNKNOWN_STORE_ID');
    return key;
  }
  function unitIds(fixture,store,ids){
    const catalog=source(fixture),key=storeId(fixture,store);
    if(!Array.isArray(ids)||!ids.length||ids.length>2||new Set(ids).size!==ids.length)fail('INVALID_UNIT_SELECTION');
    for(const id of ids){const u=catalog.units.get(id);if(!u||u.store_id!==key)fail('UNIT_STORE_MISMATCH');}
    return [...ids];
  }
  function selection(core){
    const s=core.state(),fixture=core.fixture,ids=unitIds(fixture,s.storeId,s.selected);
    const st=source(fixture).stores.get(s.storeId);
    if(st.city!==s.city||!core.selectionValid(ids))fail('INELIGIBLE_SELECTION');
    if(!s.requirement.term_confirmed||!Number.isInteger(s.requirement.term_months)||s.requirement.term_months<1||s.requirement.term_months>60)fail('TERM_UNCONFIRMED');
    if(!s.dateConfirmed||!s.startDate)fail('DATE_UNCONFIRMED');
    if(!core.authorized())fail('PHONE_UNVERIFIED');
    return {source:VERSION,fixtureVersion:fixture.version,
      catalogNamespace:fixture.sourceNamespace==='MK'?'MK':'SIM',
      unit_identity_type:fixture.sourceNamespace==='MK'?'SIZE_OPTION':'SIMULATED_UNIT',
      size_option_ids:fixture.sourceNamespace==='MK'?[...ids]:[],
      representative_unit_nos:fixture.sourceNamespace==='MK'?ids.map(id=>source(fixture).units.get(id).representative_unit_no):[],
      pricing_origin:fixture.sourceNamespace==='MK'?'historical_prediscount_base_demo_formula':'synthetic_demo_price',
      store_id:s.storeId,unit_ids:ids,term_months:s.requirement.term_months,start_date:s.startDate};
  }
  function quote(core,q=core.state().quote){
    const intent=selection(core);
    if(!q||q.kind!=='SIMULATED_QUOTE'||!/^SIM_QUOTE_/.test(q.id))fail('QUOTE_MISSING');
    if(q.store_id!==intent.store_id||JSON.stringify(q.unit_ids)!==JSON.stringify(intent.unit_ids)
      ||q.term_months!==intent.term_months||q.start_date!==intent.start_date)fail('QUOTE_IDENTITY_MISMATCH');
    if(!Number.isFinite(q.expiresAt)||q.expiresAt<=Date.now())fail('QUOTE_EXPIRED');
    const amount=core.formalAmounts(intent.unit_ids,intent.term_months);
    for(const k of values)if(q[k]!==amount[k])fail('QUOTE_AMOUNT_MISMATCH_'+k);
    if(q.coupon_id!==amount.coupon_id||q.payable!==q.rent_after_coupon+q.deposit+q.management_fee)
      fail('QUOTE_COMPONENT_MISMATCH');
    return {...intent,quote_id:q.id,amounts:Object.fromEntries(values.map(k=>[k,q[k]])),coupon_id:q.coupon_id};
  }
  function order(core,o,snap){
    // Uses the certified pre-submit snapshot: submit() legitimately reserves inventory.
    if(!snap||snap.source!==VERSION||snap.fixtureVersion!==core.fixture.version)fail('UNCERTIFIED_QUOTE');
    unitIds(core.fixture,snap.store_id,snap.unit_ids);
    if(!o||o.kind!=='SIMULATED_ORDER'||o.quote_id!==snap.quote_id||o.store_id!==snap.store_id
      ||JSON.stringify(o.unit_ids)!==JSON.stringify(snap.unit_ids)||o.term_months!==snap.term_months
      ||o.start_date!==snap.start_date)fail('ORDER_SNAPSHOT_MISMATCH');
    for(const k of values)if(o[k]!==snap.amounts[k])fail('ORDER_AMOUNT_MISMATCH_'+k);
    return {...snap,order_id:o.id,status:o.status};
  }
  const allowedRoutes={H01:'home.html',CAP:'cap.html',ITEMS:'items.html',
    S01:'index.html?page=S01',S02:'index.html?page=S02',
    S5:'index.html?page=S5',BOOKING:'index.html?page=BOOKING',
    QUICK:'index.html?page=QUICK',O01:'index.html?page=O01'};
  function route(fixture,options={}){
    const p=String(options.page||'H01').toUpperCase();
    if(!Object.prototype.hasOwnProperty.call(allowedRoutes,p))fail('ROUTE_UNKNOWN');
    let url=allowedRoutes[p];
    const store=options.store||null,unit=options.unit||null;
    if(store){storeId(fixture,store);if(p!=='S02')fail('STORE_ROUTE_NOT_ALLOWED');url+='&store='+encodeURIComponent(store);}
    if(unit){if(!store)fail('UNIT_WITHOUT_STORE');unitIds(fixture,store,[unit]);fail('DIRECT_UNIT_ROUTE_NOT_SUPPORTED');}
    // O01 is entered only through an existing candidate state; never trust query prices/IDs.
    if(p==='O01'&&!options.hasEligibleOrderContext)fail('DIRECT_ORDER_NOT_ALLOWED');
    return url;
  }
  return {VERSION,source,storeId,unitIds,selection,quote,order,route};
});
