(function(){
  const P={
    HOME:'mini_storage_home_H01_Visual_V2_7_4_SSOT.html',
    S01:'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html',
    S02:'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html',
    EST:'space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html',
    U01:'mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html',
    Q01:'mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html',
    O01:'mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html',
    O02:'mini_storage_order_o02_v1_17_self_service_Visual_V2_7_4.html',
    O03:'mini_storage_order_o03_v1_17_self_service_Visual_V2_7_4.html',
    M01:'mini_storage_mine_m01_v1_11_self_service_Visual_V2_7_4.html',
    V01:'mini_storage_viewing_v01_v1_14_self_service_synced.html',
    V02:'mini_storage_viewing_v02_v1_14_self_service_synced.html',
    RN01:'mini_storage_renew_rn01_v2_7_4.html',
    EX01:'mini_storage_exit_ex01_v2_7_4.html',
    DP01:'mini_storage_deposit_dp01_v2_7_4.html',
    OH01:'mini_storage_order_history_oh01_v2_7_4.html',
    IV01:'mini_storage_invoice_iv01_v2_7_4.html'
  };
  const C={
    store_id:'MK_BJ_2CDB7BEE',store_name:'惠新西街店',unit_id:'BJ0112S01A009',size_option_id:'MK_BJ_2CDB7BEE__4.72',
    volume:4.72,target:4.8,min:4.3,max:5.5,term:6,monthly:573,total:3440,deposit:573,fee:50,payable:4063,
    origin:'sanyuanqiao',travel:'drive',access:'high',customer:'personal'
  };
  const K={
    req:'mini_storage_requirement_current',view:'mini_storage_viewing_current',quote:'mini_storage_quote_current',order:'mini_storage_order_current',
    hist:'mini_storage_order_history_v242',renew:'mini_storage_renewal_requests_v242',ret:'mini_storage_return_requests_v242',inv:'mini_storage_invoice_records_v242',
    pay:'mini_storage_payment_records_v242',refctx:'mini_storage_referral_context',refdash:'mini_storage_referral_dashboard',transport:'mini_storage_transport_promo_current',
    transportBooking:'mini_storage_transport_booking_current',phone:'mini_storage_lead_phone',price:'mini_storage_price_snapshot_current',hold:'mini_storage_unit_hold_current',
    estimatorReturn:'mini_storage_estimator_return_snapshot',s01Return:'mini_storage_s01_return_context_v151',story:'mini_koala_demo_story_current',scenario:'mini_koala_canonical_scenario_v11'
  };
  const KEYS=Object.values(K);
  function put(k,v){localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v))}
  function clear(){KEYS.forEach(k=>localStorage.removeItem(k));} // Preserve customer coupon choice inside guided journeys; startStory() owns full reset.
  function day(n){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+n);return d}
  function addMonths(d,n){const x=new Date(d);const original=x.getDate();x.setMonth(x.getMonth()+n);if(x.getDate()<original)x.setDate(0);return x}
  function iso(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function requirement(overrides={}){return {scenario_id:'MK-V11-CANONICAL',requirement_id:'REQ-DEMO-CANONICAL',scene:'moving',target_volume:C.target,min_volume:C.min,max_volume:C.max,term_months:C.term,item_summary:'搬家过渡物品',customer_type:C.customer,travel_mode:C.travel,access_frequency:C.access,search_origin_key:C.origin,usage_location:'北京市朝阳区三元桥附近',source:'PRODUCT_DEMO_HUB_V1',updated_at:new Date().toISOString(),...overrides}}
  // Price invariants: whole-term rent is authoritative; 573 is a rounded display-only monthly average.
  // The coupon scenario is separate from the no-coupon scenario; never carry one across a reset.
  function scenarioFacts(couponMode='none'){
    const discount=couponMode==='coupon'?200:0;
    const discountedRent=Math.max(0,C.total-discount);
    return {
      scenario_id:discount?'MK-V11-NEW-COUPON':'MK-V11-NEW-NO-COUPON',coupon_discount_amount:discount,
      rent_before_coupon:C.total,rent_after_coupon:discountedRent,upfront_payable:discountedRent+C.deposit+C.fee,
      volume_exact_m3:C.volume,monthly_display_is_approximate:Math.round(C.total/C.term)*C.term!==C.total,
      term_months:C.term,start_date:iso(day(0)),end_date:leaseEndDate(iso(day(0)),C.term)
    };
  }
  function priceSnapshot(couponMode='none'){
    const facts=scenarioFacts(couponMode),discount=facts.coupon_discount_amount;
    return {store_id:C.store_id,unit_id:C.unit_id,size_option_id:C.size_option_id,representative_unit_no:C.unit_id,actual_unit_id:C.unit_id,unit_identity_type:'ACTUAL_UNIT',pricing_model_version:window.MINI_STORAGE_MASTER_V222?.pricing?.model_version||'price_semantics_v1_1',term_months:C.term,
      discount_rate:.70,base_monthly_price:819,total_rent:C.total,monthly_average:C.monthly,
      deposit:C.deposit,management_fee:C.fee,upfront_payable:facts.upfront_payable,
      is_starting_price:false,pricing_timestamp:new Date().toISOString(),...facts,
      coupon_customer_first_purchase:true,
      coupon_applied:discount>0,coupon_id:discount?'CPN-001':null,
      user_coupon_id:discount?'UC-CPN-001-MK-V11':null,coupon_name:discount?'新客租仓券':'',
      coupon_type:discount?'RENT_CASH':'',total_benefit_amount:discount
    };
  }
  function leaseEndDate(start,months){
    const [y,m,d]=start.split('-').map(Number),x=new Date(y,m-1,1);
    x.setMonth(x.getMonth()+months);
    const last=new Date(x.getFullYear(),x.getMonth()+1,0).getDate();
    x.setDate(Math.min(d,last));x.setDate(x.getDate()-1);return iso(x);
  }
  function leaseStartFromEnd(end,months){
    // Inverse date calculation for demo lifecycle fixtures; keep the shown term exactly 6 months.
    const [y,m,d]=end.split('-').map(Number),after=new Date(y,m-1,d+1);
    const first=new Date(after.getFullYear(),after.getMonth()-months,1);
    const last=new Date(first.getFullYear(),first.getMonth()+1,0).getDate();
    first.setDate(Math.min(after.getDate(),last));return iso(first);
  }
  function activatePricingScenario(couponMode='none'){
    const facts=scenarioFacts(couponMode),snapshot=priceSnapshot(couponMode);
    // Direct quick-state entry is a fresh isolated fixture, unlike a continuing guided story.
    ['mini_koala_coupon_wallet_v1','mini_koala_coupon_selection_v1','mini_koala_coupon_return_href_v1'].forEach(k=>localStorage.removeItem(k));
    put(K.price,snapshot);put(K.quote,quote(couponMode));put(K.scenario,facts);
    if(couponMode==='coupon'){
      put('mini_koala_coupon_wallet_v1',[{user_coupon_id:'UC-CPN-001-MK-V11',coupon_id:'CPN-001',status:'CLAIMED',claim_time:new Date().toISOString(),expire_time:iso(day(7))+'T23:59:59',source:'DEMO_HUB'}]);
      put('mini_koala_coupon_selection_v1',{mode:'manual',coupon_id:'CPN-001',updated_at:new Date().toISOString()});
    }
    return facts;
  }
  function viewing(){return {viewing_id:'V-DEMO-CANONICAL',status:'BOOKED',viewing_scope:'UNIT',source_page:'U01',store_id:C.store_id,unit_id:C.unit_id,size_option_id:C.size_option_id,target_volume:C.target,volume:C.volume,term_months:C.term,current_monthly_price:C.monthly,appointment_date:iso(day(1)),appointment_slot:'14:00–16:00',created_at:new Date().toISOString()}}
  function quote(couponMode='none'){const facts=scenarioFacts(couponMode);return {scenario_id:facts.scenario_id,quote_id:'Q-DEMO-CANONICAL',status:'active',store_id:C.store_id,unit_id:C.unit_id,size_option_id:C.size_option_id,target_volume:C.target,volume:C.volume,term_months:C.term,monthly_price:C.monthly,monthly_average:C.monthly,total_price:C.total,total_rent:C.total,deposit_amount:C.deposit,management_fee:C.fee,initial_payable:facts.upfront_payable,upfront_payable:facts.upfront_payable,coupon_discount_amount:facts.coupon_discount_amount,coupon_id:facts.coupon_discount_amount?'CPN-001':null,user_coupon_id:facts.coupon_discount_amount?'UC-CPN-001-MK-V11':null,coupon_name:facts.coupon_discount_amount?'新客租仓券':'',rent_before_coupon:C.total,rent_after_coupon:facts.rent_after_coupon,start_date:facts.start_date,end_date:facts.end_date,price_snapshot:priceSnapshot(couponMode),transaction_route:'QUOTE_OPTIONAL',pricing_model_version:priceSnapshot(couponMode).pricing_model_version,valid_until:new Date(Date.now()+48*3600*1000).toISOString(),created_at:new Date().toISOString()}}
  function baseOrder(kind='active'){
    let start=day(-30),end=addMonths(start,C.term);end.setDate(end.getDate()-1);let extra={};
    if(kind==='pending_use'){start=day(3);end=addMonths(start,C.term);end.setDate(end.getDate()-1);extra={lifecycle_state:'upcoming',detail_state:'upcoming',access_status:'READY_ON_START_DATE'};}
    if(kind==='ending'){end=day(10);start=new Date(leaseStartFromEnd(iso(end),C.term)+'T12:00:00');end=new Date(leaseEndDate(iso(start),C.term)+'T12:00:00');extra={lifecycle_state:'ending',detail_state:'ending'};}
    if(kind==='exiting'){end=day(1);start=new Date(leaseStartFromEnd(iso(end),C.term)+'T12:00:00');end=new Date(leaseEndDate(iso(start),C.term)+'T12:00:00');extra={lifecycle_state:'returning',detail_state:'returning',return_status:'WAITING_INSPECTION',deposit_status:'WAITING_INSPECTION'};}
    if(kind==='ended'){start=day(-220);end=new Date(leaseEndDate(iso(start),C.term)+'T12:00:00');extra={lifecycle_state:'ended',detail_state:'ended',lease_status:'ENDED',access_status:'CLOSED',inventory_status:'RELEASED',deposit_status:'REFUNDED',actual_return_date:iso(end)};}
    return {scenario_id:'MK-V11-LIFECYCLE-'+kind.toUpperCase(),order_no:`O-DEMO-${kind.toUpperCase().replace(/_/g,'-')}`,status:'PAID',payment_status:'PAID',inventory_status:'OCCUPIED',store_id:C.store_id,store_name:C.store_name,unit_id:C.unit_id,actual_unit_id:C.unit_id,size_option_id:C.size_option_id,volume:C.volume,target_volume:C.target,term_months:C.term,monthly_price:C.monthly,monthly_average:C.monthly,total_price:C.total,total_rent:C.total,deposit_amount:C.deposit,management_fee:C.fee,payable_total:C.payable,initial_payable:C.payable,upfront_payable:C.payable,paid_total:C.payable,start_date:iso(start),end_date:iso(end),deposit_status:'HELD',access_status:'ACTIVE',lease_status:'ACTIVE',lock_code:'2468',identity_verification_status:'VERIFIED',agreement_version:'rental_terms_prototype_v1',agreement_accepted_at:new Date(Date.now()-86400000).toISOString(),paid_at:new Date(Date.now()-86400000).toISOString(),actual_unit_assigned_at:new Date(Date.now()-86400000).toISOString(),created_at:new Date(Date.now()-2*86400000).toISOString(),updated_at:new Date().toISOString(),...extra};
  }
  function pendingOrder(){return {order_no:'O-DEMO-PENDING-PAYMENT',status:'PENDING_PAYMENT',payment_status:'NOT_PAID',inventory_status:'AVAILABLE',store_id:C.store_id,store_name:C.store_name,unit_id:C.unit_id,size_option_id:C.size_option_id,volume:C.volume,target_volume:C.target,term_months:C.term,monthly_price:C.monthly,monthly_average:C.monthly,total_price:C.total,total_rent:C.total,deposit_amount:C.deposit,management_fee:C.fee,payable_total:C.payable,initial_payable:C.payable,upfront_payable:C.payable,price_snapshot:priceSnapshot(),start_date:iso(day(3)),created_at:new Date().toISOString(),updated_at:new Date().toISOString()}}
  function seedPaid(kind){const o=baseOrder(kind);put(K.order,o);put(K.hist,[o]);put(K.pay,[{payment_id:`INIT-${o.order_no}`,order_no:o.order_no,type:'INITIAL',amount:C.payable,status:'PAID',breakdown:{rent:C.total,deposit:C.deposit,management_fee:C.fee},paid_at:o.paid_at,created_at:o.paid_at}]);put(K.price,priceSnapshot());put(K.refdash,{rewards:[]});if(kind==='exiting')put(K.ret,[{return_id:'RT-DEMO-CANONICAL',order_no:o.order_no,type:'END_OF_TERM',status:'WAITING_INSPECTION',requested_at:new Date().toISOString(),target_return_date:iso(day(1))}]);return o}
  function seed(state){
    clear();
    if(state!=='new')put(K.phone,'13800138000');
    if(['estimated','appointed','quoted','pending_payment'].includes(state))put(K.req,requirement());
    if(state==='appointed')put(K.view,viewing());
    if(state==='quoted'){put(K.quote,quote());put(K.price,priceSnapshot());}
    if(state==='pending_payment'){put(K.quote,quote());put(K.price,priceSnapshot());const o=pendingOrder();put(K.order,o);put(K.hist,[o]);}
    if(state==='pending_use')seedPaid('pending_use');
    if(state==='active')seedPaid('active');
    if(state==='ending')seedPaid('ending');
    if(state==='exiting')seedPaid('exiting');
    if(state==='historical')seedPaid('ended');
    return state;
  }
  function home(state){seed(state);const map={new:'new',estimated:'estimated',appointed:'viewing',quoted:'quoted',pending_payment:'pending',pending_use:'active',active:'active',ending:'active',exiting:'active'};location.href=`${P.HOME}?state=${map[state]||'new'}&loc=${state==='new'?'unknown':'precise'}&source=demo_hub`;}
  function mine(state){seed(state);location.href=P.M01+'?source=demo_hub';}
  function s01(mode){
    if(mode==='browse'){seed('new');location.href=`${P.S01}?state=browse&entry=browse_nearby&source=demo_hub&travel=${C.travel}&searchOriginKey=${C.origin}`;return}
    if(mode==='estimated'){seed('estimated');location.href=`${P.S01}?state=estimated&target=${C.target}&min=${C.min}&max=${C.max}&term=${C.term}&travel=${C.travel}&searchOriginKey=${C.origin}&sort=recommended&source=demo_hub`;return}
    if(mode==='nomatch'){seed('estimated');put(K.req,requirement({target_volume:60,min_volume:55,max_volume:70}));location.href=`${P.S01}?state=nomatch&target=60&min=55&max=70&term=${C.term}&travel=${C.travel}&searchOriginKey=${C.origin}&sort=recommended&source=demo_hub`;return}
    if(mode==='soldout'){seed('new');location.href=`${P.S01}?state=browse&entry=browse_nearby&source=demo_hub&travel=${C.travel}&searchOriginKey=${C.origin}&inventoryScenario=soldout`;return}
    location.href=P.S01;
  }
  function s02(mode){
    const soldout=mode==='soldout';
    seed(mode==='browse'||soldout?'new':'estimated');
    const state=mode==='browse'||soldout?'browse':mode==='nomatch'?'nomatch':'matched';
    const target=mode==='nomatch'?60:C.target;const min=mode==='nomatch'?55:C.min;const max=mode==='nomatch'?70:C.max;
    const store=soldout?'MK_BJ_F2215896':C.store_id;
    location.href=`${P.S02}?store=${store}&state=${state}&target=${target}&min=${min}&max=${max}&term=${C.term}&travel=${C.travel}&searchOriginKey=${C.origin}&source=demo_hub${mode==='nomatch'?'&demo=exception':''}${soldout?'&inventoryStatus=soldout&inventoryScenario=soldout':''}`;
  }
  function estimator(mode){
    if(mode==='new'){seed('new');location.href=P.EST+'?source=demo_hub';return}
    seed('estimated');
    if(mode==='from_s01'){put(K.s01Return,{version:'1.5.1',returnTo:'S01',state:'browse',travel:C.travel,origin:C.origin,sort:'distance',distance:'any',access:C.access,services:['24h','elevator'],scroll:420,loaded:16,source:'demo_hub'});location.href=P.EST+'?returnTo=S01&source=s01_demo_hub';return}
    if(mode==='from_s02'){location.href=`${P.EST}?returnTo=S02&returnStore=${C.store_id}&store=${C.store_id}&target=${C.target}&term=${C.term}&source=s02_demo_hub`;return}
    location.href=P.EST+'?entry=resume_recommend&source=demo_hub';
  }
  function u01(){seed('estimated');put(K.price,priceSnapshot());location.href=`${P.U01}?store=${C.store_id}&unit=${C.unit_id}&sizeOption=${C.size_option_id}&target=${C.target}&min=${C.min}&max=${C.max}&term=${C.term}&source=demo_hub`;}
  function q01(mode='active'){
    seed('quoted');const couponMode=mode==='coupon'?'coupon':'none';const facts=activatePricingScenario(couponMode);
    const status=mode==='expired'?'expired':'active';const query=new URLSearchParams({
      store:C.store_id,unit:C.unit_id,sizeOption:C.size_option_id,representativeUnit:C.unit_id,actualUnit:C.unit_id,inventoryIdentity:'ACTUAL_UNIT',target:String(C.target),volume:String(C.volume),
      term:String(C.term),monthly:String(C.monthly),rentTotal:String(C.total),deposit:String(C.deposit),
      managementFee:String(C.fee),initialPayable:String(facts.upfront_payable),start:facts.start_date,
      searchOriginKey:C.origin,route:'QUOTE_OPTIONAL',quoteStatus:status,scenarioId:facts.scenario_id,source:'demo_hub'
    });location.href=P.Q01+'?'+query.toString();
  }
  function o01(mode='none'){
    seed('quoted');const facts=activatePricingScenario(mode==='coupon'?'coupon':'none');
    const query=new URLSearchParams({store:C.store_id,unit:C.unit_id,sizeOption:C.size_option_id,representativeUnit:C.unit_id,actualUnit:C.unit_id,inventoryIdentity:'ACTUAL_UNIT',
      target:String(C.target),volume:String(C.volume),term:String(C.term),monthly:String(C.monthly),
      rentTotal:String(C.total),deposit:String(C.deposit),managementFee:String(C.fee),
      initialPayable:String(facts.upfront_payable),start:facts.start_date,searchOriginKey:C.origin,
      route:'QUOTE_OPTIONAL',scenarioId:facts.scenario_id,source:'demo_hub'});
    location.href=P.O01+'?'+query.toString();
  }
  function orderDetail(state){const o=state==='pending_use'?seedPaid('pending_use'):state==='ending'?seedPaid('ending'):state==='exiting'?seedPaid('exiting'):state==='historical'?seedPaid('ended'):seedPaid('active');location.href=`${P.O03}?orderNo=${encodeURIComponent(o.order_no)}&state=${state}&source=demo_hub`;}
  function lifecycle(kind){let o;if(kind==='renew'){o=seedPaid('ending');location.href=`${P.RN01}?orderNo=${encodeURIComponent(o.order_no)}&source=demo_hub`;return}if(kind==='exit'){o=seedPaid('ending');location.href=`${P.EX01}?orderNo=${encodeURIComponent(o.order_no)}&source=demo_hub`;return}if(kind==='deposit'){o=seedPaid('exiting');location.href=`${P.DP01}?orderNo=${encodeURIComponent(o.order_no)}&source=demo_hub`;return}if(kind==='history'){o=seedPaid('ended');location.href=P.OH01+'?source=demo_hub';return}if(kind==='invoice'){o=seedPaid('active');location.href=`${P.IV01}?orderNo=${encodeURIComponent(o.order_no)}&source=demo_hub`;return}}
  function viewingPage(){seed('appointed');const v=viewing();location.href=`${P.V02}?viewingId=${v.viewing_id}&source=U01&scope=UNIT&store=${C.store_id}&unit=${C.unit_id}&target=${C.target}&term=${C.term}&date=${v.appointment_date}&slot=${encodeURIComponent(v.appointment_slot)}&status=BOOKED`;}
  function startStory(id){put(K.story,{id,started_at:new Date().toISOString()});if(id==='new_rental')home('new');else if(id==='stores_first')s01('browse');else if(id==='estimate_carryback')s01('browse');else if(id==='post_purchase')home('pending_use');else if(id==='ending')home('ending');else home('new');}
  window.MINI_KOALA_DEMO_V2={P,C,K,clear,seed,home,mine,s01,s02,estimator,u01,q01,o01,orderDetail,lifecycle,viewingPage,startStory,requirement,priceSnapshot,scenarioFacts,activatePricingScenario,leaseEndDate};
})();
