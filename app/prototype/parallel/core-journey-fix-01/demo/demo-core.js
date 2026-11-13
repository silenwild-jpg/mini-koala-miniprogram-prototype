(function(root){
  'use strict';
  const fixture=typeof module==='object'&&module.exports?require('./fixtures'):root.SIM_FIXTURES;
  const copy=x=>JSON.parse(JSON.stringify(x));
  const PENDING_ORDER_TTL_MS=3*60*60*1000;
  function create(options={}) {
    const now=options.now||Date.now;
    const fail=code=>{throw new Error(code);};
    const initial=()=>({schema:1,fixtureVersion:fixture.version,scenario:'noDemand',city:fixture.defaultCity,locationAuthorized:false,requirement:{capacity_m3:null,term_months:null,term_confirmed:false},storeId:null,selected:[],startDate:null,dateConfirmed:false,auth:{status:'anonymous',expiresAt:0},account:null,contactPhone:'',coupons:[],couponChoice:'auto',services:{},messages:[],previewConsumed:false,inventoryVersion:1,stock:{},prices:{},quote:null,orders:[],leads:[],enterpriseLeads:[],nextRecheck:null,sequence:0,returnPage:'S01'});
    let s=initial();
    if(options.state&&options.state.fixtureVersion===fixture.version&&options.state.schema===1)s={...s,...copy(options.state)};
    const store=id=>fixture.stores.find(x=>x.id===id);
    const unit=id=>fixture.units.find(x=>x.id===id);
    const available=u=>!!u&&store(u.store_id)?.status==='open'&&(s.stock[u.id]||u.status)==='available';
    // Count reflects shared reservation/occupancy state, not an independent display-only counter.
    const stockCount=u=>!available(u)?0:Math.max(0,Math.trunc(Number(u.available_count)||0));
    const validTerm=m=>Number.isInteger(m)&&m>=1&&m<=60;
    const validCapacity=c=>typeof c==='number'&&Number.isFinite(c)&&c>=.5&&c<=200&&Math.abs(c*100-Math.round(c*100))<1e-7;
    const authorized=()=>{if(s.auth.status==='verified'&&now()>=s.auth.expiresAt){s.auth.status='expired';s.quote=null;}return s.auth.status==='verified';};
    const invalidate=()=>{s.quote=null;};
    function setRequirement(capacity,months,confirmed=false,input=null){
      if(capacity!==null&&!validCapacity(capacity))fail('INVALID_CAPACITY');
      if(months!==null&&!validTerm(months))fail('INVALID_TERM');
      if(confirmed&&!validTerm(months))fail('SELECT_TERM');if(confirmed&&!validCapacity(capacity))fail('SELECT_CAPACITY');
      // A square-metre input is display intent, not a new pricing or order unit.
      // Reject inconsistent metadata rather than trusting an arbitrary URL/draft.
      const area=input?.input_unit==='m2'?Number(input.input_value):null;
      if(area!==null&&(!Number.isFinite(area)||area<0.2||area>80||
        Math.abs(area*10-Math.round(area*10))>1e-7||Math.abs(area*2.5-capacity)>1e-7))
        fail('INVALID_CAPACITY');
      s.requirement={capacity_m3:capacity,term_months:months,term_confirmed:confirmed&&validTerm(months),
        ...(area===null?{}:{input_unit:'m2',input_value:area})};s.selected=[];invalidate();
    }
    function setEstimate(payload){
      const p=payload||{},raw=p.estimated_volume;
      if(p.source==='known_capacity_in_items_flow'){
        if(p.term_confirmed===true&&!validTerm(p.term_months))fail('SELECT_TERM');
        setRequirement(p.target_volume,p.term_months??null,p.term_confirmed===true);
        s.requirement.source=p.source;s.requirement.estimated_volume=null;s.requirement.items=[];return;
      }
      if(p.source!=='items_estimate'||typeof raw!=='number'||!Number.isFinite(raw)||raw<=0||raw>200||Math.abs(raw*1000-Math.round(raw*1000))>1e-7||p.target_volume!==Math.max(.5,raw))fail('INVALID_ESTIMATE');
      if(p.term_confirmed===true&&!validTerm(p.term_months))fail('SELECT_TERM');
      if(!Array.isArray(p.items)||!p.items.length||p.items.some(x=>typeof x.id!=='string'||typeof x.variant!=='string'||!Number.isInteger(x.quantity)||x.quantity<1||x.quantity>99)||new Set(p.items.map(x=>x.id)).size!==p.items.length)fail('INVALID_ESTIMATE');
      s.requirement={capacity_m3:p.target_volume,term_months:p.term_confirmed===true?p.term_months:null,term_confirmed:p.term_confirmed===true,source:p.source,estimated_volume:raw,items:p.items.map(x=>({id:x.id,variant:x.variant,quantity:x.quantity}))};s.selected=[];invalidate();
    }
    function setTerm(months){if(!validTerm(months))fail('INVALID_TERM');if(!validRequirementCapacity())fail('SELECT_CAPACITY');s.requirement.term_months=months;s.requirement.term_confirmed=true;s.selected=[];invalidate();}
    const validRequirementCapacity=()=>validCapacity(s.requirement.capacity_m3)||(s.requirement.source==='items_estimate'&&s.requirement.estimated_volume>0&&s.requirement.estimated_volume<=200&&s.requirement.capacity_m3===Math.max(.5,s.requirement.estimated_volume)&&Math.abs(s.requirement.capacity_m3*1000-Math.round(s.requirement.capacity_m3*1000))<1e-7);
    const requirementReady=()=>validRequirementCapacity()&&s.requirement.term_confirmed===true&&validTerm(s.requirement.term_months);
    function setScenario(id){
      const scene=fixture.scenarios.find(x=>x.id===id);if(!scene)fail('UNKNOWN_SCENARIO');
      const previewConsumed=s.previewConsumed;
      s=initial();s.previewConsumed=previewConsumed;s.scenario=id;s.city=scene.city;
      setRequirement(scene.capacity,scene.term,scene.term!==null);
      if(scene.soldStore)fixture.units.filter(u=>u.store_id===scene.soldStore).forEach(u=>s.stock[u.id]='soldout');
      if(scene.soldStores)fixture.units.filter(u=>scene.soldStores.includes(u.store_id)).forEach(u=>s.stock[u.id]='soldout');
      s.nextRecheck=scene.nextRecheck||null;
      if(Array.isArray(scene.coupons))s.coupons=copy(scene.coupons);
      if(scene.couponChoice)s.couponChoice=scene.couponChoice;
      if(scene.auth)s.auth.status=scene.auth;
    }
    const totalVolume=ids=>Number(ids.reduce((n,id)=>n+(unit(id)?.volume||0),0).toFixed(3));
    function selectionValid(ids=s.selected){
      if(!ids.length||ids.length>2||new Set(ids).size!==ids.length||ids.some(id=>!available(unit(id))))return false;
      const st=store(unit(ids[0]).store_id);
      return st.city===s.city&&ids.every(id=>unit(id).store_id===st.id)&&(!s.requirement.capacity_m3||totalVolume(ids)>=s.requirement.capacity_m3);
    }
    function matchingUnits(storeId){return fixture.units.filter(u=>(!storeId||u.store_id===storeId)&&store(u.store_id).city===s.city&&available(u)&&(!s.requirement.capacity_m3||u.volume>=s.requirement.capacity_m3));}
    function alternatives(excludeStore){return matchingUnits().filter(u=>u.store_id!==excludeStore).sort((a,b)=>store(a.store_id).distance-store(b.store_id).distance||a.volume-b.volume);}
    function combinations(storeId){
      const target=s.requirement.capacity_m3;if(!target)return[];
      const units=fixture.units.filter(u=>u.store_id===storeId&&available(u)&&u.volume<target),rows=[];
      for(let i=0;i<units.length;i++)for(let j=i+1;j<units.length;j++)if(units[i].volume+units[j].volume>=target)rows.push({ids:[units[i].id,units[j].id],volume:totalVolume([units[i].id,units[j].id]),store_id:storeId});
      return rows.sort((a,b)=>a.volume-b.volume).slice(0,3);
    }
    const currency=n=>Math.round((n+Number.EPSILON)*100)/100;
    function discountedMonth(u,months){if(!validTerm(months))fail('SELECT_TERM');const base=s.prices[u.id]??u.base_month;const rule=fixture.pricing.termRules.find(x=>months>=x.min&&months<=x.max);if(!rule)fail('INVALID_TERM');return Math.trunc(Number(base)*rule.factor+1e-9);}
    function rent(u,months){return discountedMonth(u,months)*months;}
    function couponEligible(c,rentTotal,months,renewal=false){
      if(!['CLAIMED','APPLIED'].includes(c.status))return false;
      if(c.id==='CPN-004')return renewal&&months>=6;
      if(renewal||s.orders.some(o=>o.status==='paid_simulated'))return false;
      return c.id==='CPN-001'?rentTotal>=2000:c.id==='CPN-002'?months>=12:false;
    }
    function amounts(ids,months,opts={}){
      if(!ids.length||ids.some(id=>!unit(id)))fail('INVALID_SELECTION');
      // Integer source of truth: truncate each unit's discounted month rent,
      // combine monthly rents, then multiply by the exact term.
      const deposit=ids.reduce((n,id)=>n+discountedMonth(unit(id),months),0);
      const rentTotal=deposit*months;
      const eligible=s.coupons.filter(c=>couponEligible(c,rentTotal,months,!!opts.renewal));
      const coupon=opts.renewal?eligible.find(c=>c.id==='CPN-004'):s.couponChoice==='none'?null:s.couponChoice==='auto'?eligible.sort((a,b)=>b.amount-a.amount)[0]:eligible.find(c=>c.id===s.couponChoice);
      const discount=coupon?Math.min(coupon.amount,rentTotal):0;
      // A moving/service entitlement is tracked separately, and does not subtract rent.
      const moving=!opts.renewal&&Number(months)>=6?s.coupons.find(c=>c.type==='SERVICE_BENEFIT'&&c.status==='CLAIMED'&&!s.orders.some(o=>o.status==='paid_simulated'&&o.moving_benefit_pending_id===c.id)):null;
      const rentAfterCoupon=rentTotal-discount;
      return {rent_total:rentTotal,monthly_average:deposit,rent_after_coupon:rentAfterCoupon,// Backward-compatible analytic field: a cash coupon can make term
        // price non-divisible by months. Do not present it as monthly rent.
        monthly_after_coupon:currency(rentAfterCoupon/months),deposit:opts.renewal?0:deposit,management_fee:opts.renewal?0:fixture.pricing.managementFee,coupon_id:coupon?.id||null,coupon_discount:discount,moving_benefit_pending_id:opts.renewal?null:(moving?.id||null),payable:rentAfterCoupon+(opts.renewal?0:deposit+fixture.pricing.managementFee)};
    }
    function signature(){return JSON.stringify({fixture:fixture.version,inventory:s.inventoryVersion,requirement:s.requirement,city:s.city,selected:s.selected,startDate:s.startDate,couponChoice:s.couponChoice,coupons:s.coupons.map(c=>[c.id,c.status]),prices:s.selected.map(id=>s.prices[id]||unit(id)?.base_month)});}
    function assertReady(){
      if(!authorized())fail('PHONE_REQUIRED');
      if(!s.requirement.term_confirmed||!validTerm(s.requirement.term_months))fail('SELECT_TERM');
      if(!validRequirementCapacity())fail('SELECT_CAPACITY');
      if(!selectionValid())fail('UNAVAILABLE');
      if(!s.dateConfirmed||!validDate(s.startDate))fail('SELECT_DATE');
    }
    const today=()=>new Date(now()+8*60*60*1000).toISOString().slice(0,10); // Business date: UTC+8
    function validDate(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v&&v>=today();}
    function recheck(){
      if(!s.nextRecheck||!s.selected.length)return null;
      const reason=s.nextRecheck;s.nextRecheck=null;
      if(reason==='inventory')s.stock[s.selected[0]]='soldout';else s.prices[s.selected[0]]=Math.round((s.prices[s.selected[0]]||unit(s.selected[0]).base_month)*1.1/10)*10;
      s.inventoryVersion++;invalidate();return reason;
    }
    function quote(){assertReady();const a=amounts(s.selected,s.requirement.term_months);if(a.coupon_id)s.coupons.find(c=>c.id===a.coupon_id).status='APPLIED';s.quote={id:'SIM_QUOTE_'+(++s.sequence),signature:signature(),unit_ids:[...s.selected],store_id:unit(s.selected[0]).store_id,start_date:s.startDate,term_months:s.requirement.term_months,capacity_m3:s.requirement.capacity_m3,...a,expiresAt:now()+5*60*1000,kind:'SIMULATED_QUOTE'};return copy(s.quote);}
    function submit(){
      if(!authorized())fail('PHONE_REQUIRED');
      if(s.quote){const existing=s.orders.find(o=>o.quote_id===s.quote.id);if(existing)return copy(existing);}
      const change=recheck();if(change)fail(change==='inventory'?'INVENTORY_CHANGED':'PRICE_CHANGED');
      assertReady();
      if(!s.quote||s.quote.signature!==signature()||now()>=s.quote.expiresAt){invalidate();fail('QUOTE_STALE');}
      const a=amounts(s.selected,s.requirement.term_months);
      if(Object.keys(a).some(k=>s.quote[k]!==a[k])){invalidate();fail('QUOTE_STALE');}
      const o={id:'SIM_ORDER_'+(++s.sequence),quote_id:s.quote.id,kind:'SIMULATED_ORDER',store_id:s.quote.store_id,unit_ids:[...s.selected],capacity_m3:s.quote.capacity_m3,term_months:s.quote.term_months,start_date:s.quote.start_date,...a,status:'pending',createdAt:now(),expiresAt:now()+PENDING_ORDER_TTL_MS,price_bases:s.selected.map(id=>s.prices[id]||unit(id).base_month),previous_stock:Object.fromEntries(s.selected.map(id=>[id,s.stock[id]||unit(id).status]))};
      s.orders.push(o);o.unit_ids.forEach(id=>s.stock[id]='reserved');if(o.coupon_id)s.coupons.find(c=>c.id===o.coupon_id).status='LOCKED';return copy(o);
    }
    function releaseOrder(o,status){o.status=status;o.unit_ids.forEach(id=>{if(s.stock[id]==='reserved')s.stock[id]=o.previous_stock[id];});const c=s.coupons.find(c=>c.id===o.coupon_id);if(c?.status==='LOCKED')c.status='CLAIMED';s.inventoryVersion++;invalidate();}
    // Recover an existing reserved order after the user has browsed or edited another demand.
    // A reserved unit cannot be re-selected through the normal available-stock path.
    function resumePendingOrder(orderId){
      const o=findOrder(orderId);
      if(o.status!=='pending')return copy(o);
      if(now()>=o.expiresAt){releaseOrder(o,'expired');return copy(o);}
      const changed=o.unit_ids.some((id,i)=>s.stock[id]!=='reserved'||(s.prices[id]||unit(id)?.base_month)!==o.price_bases[i]);
      if(changed){releaseOrder(o,'invalidated');return copy(o);}
      const st=store(o.store_id);
      if(!st||st.status!=='open'){releaseOrder(o,'invalidated');return copy(o);}
      s.city=st.city;
      s.storeId=o.store_id;
      s.selected=[...o.unit_ids];
      s.requirement={capacity_m3:o.capacity_m3,term_months:o.term_months,term_confirmed:true};
      s.startDate=o.start_date;
      s.dateConfirmed=true;
      invalidate();
      return copy(o);
    }
    function pay(orderId,outcome){const o=findOrder(orderId);if(!authorized())fail('PHONE_REQUIRED');if(!['success','failed'].includes(outcome))fail('INVALID_PAYMENT_OUTCOME');if(o.status!=='pending')return copy(o);if(now()>=o.expiresAt){releaseOrder(o,'expired');fail('ORDER_EXPIRED');}if(o.unit_ids.some((id,i)=>s.stock[id]!=='reserved'||(s.prices[id]||unit(id).base_month)!==o.price_bases[i])){releaseOrder(o,'invalidated');fail('QUOTE_STALE');}if(outcome==='failed'){releaseOrder(o,'payment_failed');return copy(o);}o.status='paid_simulated';o.unit_ids.forEach(id=>s.stock[id]='occupied');const c=s.coupons.find(c=>c.id===o.coupon_id);if(c)c.status='REDEEMED';s.coupons.filter(c=>['CPN-001','CPN-002'].includes(c.id)&&c.status!=='REDEEMED').forEach(c=>c.status='INVALID');s.services[o.id]={identity:'pending',useStatus:'pending_use',renewals:[],exit:null,deposit:'held',invoices:[],transport:[],support:[]};s.messages.push({id:'MSG_'+(++s.sequence),title:'付款完成，请完成身份验证',order_id:o.id,read:false});s.inventoryVersion++;invalidate();return copy(o);}
    const findOrder=id=>{const o=s.orders.find(x=>x.id===id);if(!o)fail('ORDER_NOT_FOUND');return o;};
    const paidService=id=>{const o=findOrder(id);if(o.status!=='paid_simulated')fail('PAID_ORDER_REQUIRED');return s.services[id]||(s.services[id]={identity:'pending',useStatus:'pending_use',renewals:[],exit:null,deposit:'held',invoices:[],transport:[],support:[]});};
    const validPhone=p=>/^1[3-9]\d{9}$/.test(p)||/^\+[1-9]\d{7,14}$/.test(p);
    if(authorized()&&validPhone(s.auth.phone)&&!s.account)s.account={id:'LOCAL_ACCOUNT_'+(++s.sequence),phone:s.auth.phone,createdAt:now(),lastLoginAt:now(),methods:[s.auth.method||'local_fixture']};
    const notify=(title,id)=>s.messages.push({id:'MSG_'+(++s.sequence),title,order_id:id,read:false});
    function addCalendarMonths(date,months){const d=new Date(date+'T00:00:00Z'),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d.toISOString().slice(0,10);}
    function rentalPeriod(id){const o=findOrder(id),service=paidService(id),months=o.term_months+service.renewals.reduce((total,p)=>total+p.months,0);return {start_date:o.start_date,total_months:months,end_date:addCalendarMonths(o.start_date,months)};}

    // Isolated V2 lifecycle contract: review-only backend transitions and no inferred prices.
    const dayNow=()=>today(); // same UTC+8 business date as checkout.
    const lifecycleLedger=id=>{
      const service=paidService(id);
      if(!service.lifecycle_v2)service.lifecycle_v2={renewal_requests:[],exit:null,deposit:'HELD',invoices:[]};
      return service.lifecycle_v2;
    };
    function lifecycleView(id){
      const o=findOrder(id);
      if(o.status!=='paid_simulated')fail('PAID_ORDER_REQUIRED');
      const service=s.services[id]||{},l=service.lifecycle_v2||{renewal_requests:[],exit:null,deposit:'HELD',invoices:[]};
      const completed=(l.renewal_requests||[]).filter(x=>x.status==='COMPLETED');
      const legacyRenewals=(service.renewals||[]).filter(x=>x.kind==='RENEWAL');
      const totalMonths=o.term_months+completed.reduce((n,x)=>n+x.months,0)+legacyRenewals.reduce((n,x)=>n+x.months,0);
      const end=addCalendarMonths(o.start_date,totalMonths);
      const exit=l.exit;
      const leaseStatus=exit&&exit.status==='INSPECTION_PASSED'?'ended':
        exit&&['REQUESTED','WAITING_INSPECTION','INSPECTION_FAILED'].includes(exit.status)?'returning':
        dayNow()<o.start_date?'upcoming':dayNow()>=end?'expired':'active';
      const payments=[{id:o.id,type:'INITIAL',amount:o.payable,simulated:true},
        ...legacyRenewals.map(x=>({id:x.id,type:'RENEWAL',amount:x.payable??x.rent_after_coupon,simulated:true})),
        ...completed.map(x=>({id:x.payment_id,type:'RENEWAL',amount:x.quote_total,simulated:true}))];
      return copy({order_id:id,lease_status:leaseStatus,start_date:o.start_date,end_date:end,total_months:totalMonths,
        deposit_status:l.deposit||'HELD',exit:exit||null,renewal_requests:l.renewal_requests||[],invoices:l.invoices||[],
        payments,access_allowed:service.identity==='verified'&&(leaseStatus==='active'||(leaseStatus==='returning'&&dayNow()>=o.start_date&&dayNow()<end&&['REQUESTED','INSPECTION_FAILED'].includes(exit?.status))),identity_status:service.identity||'pending'});
    }
    function lifecycleRequestRenewal(id,months){
      if(!authorized())fail('PHONE_REQUIRED');
      if(!validTerm(months))fail('SELECT_TERM');
      const v=lifecycleView(id),l=lifecycleLedger(id);
      if(!['active','upcoming'].includes(v.lease_status)||v.total_months+months>60)fail('RENEWAL_UNAVAILABLE');
      if(l.renewal_requests.some(x=>['QUOTE_PENDING','QUOTE_READY','PAYMENT_PENDING','PAYMENT_FAILED','PAYMENT_CANCELLED'].includes(x.status)))fail('RENEWAL_ALREADY_PENDING');
      const req={id:'LRENEW_'+(++s.sequence),months,status:'QUOTE_PENDING',requested_at:now()};
      l.renewal_requests.push(req);return copy(req);
    }
    function lifecycleReviewQuote(id,reqId,monthly,review){
      if(review!==true)fail('REVIEW_ONLY');
      if(!Number.isFinite(monthly)||monthly<=0||monthly>1000000)fail('INVALID_REVIEW_QUOTE');
      const req=lifecycleLedger(id).renewal_requests.find(x=>x.id===reqId);
      if(!req||req.status!=='QUOTE_PENDING')fail('RENEWAL_REQUEST_NOT_PENDING');
      const y=Math.trunc(monthly);if(y<1)fail('INVALID_REVIEW_QUOTE');
      req.quote_monthly=y;req.quote_total=y*req.months;
      req.status='QUOTE_READY';req.review_simulated=true;return copy(req);
    }
    // Confirmation freezes an accepted quotation, but must not extend the lease or create an invoiceable payment.
    function lifecycleConfirmRenewal(id,reqId){
      if(!authorized())fail('PHONE_REQUIRED');
      const v=lifecycleView(id),req=lifecycleLedger(id).renewal_requests.find(x=>x.id===reqId);
      if(!req||!['QUOTE_READY','PAYMENT_FAILED','PAYMENT_CANCELLED'].includes(req.status)||!Number.isFinite(req.quote_total))fail('RENEWAL_QUOTE_REQUIRED');
      if(!['active','upcoming'].includes(v.lease_status)||v.total_months+req.months>60)fail('RENEWAL_UNAVAILABLE');
      req.status='PAYMENT_PENDING';req.payment_started_at=now();req.payment_attempts=(req.payment_attempts||0)+1;
      notify('续租方案已确认，待完成付款',id);return copy(req);
    }
    function lifecyclePayRenewal(id,reqId,outcome){
      if(!authorized())fail('PHONE_REQUIRED');
      if(!['success','failed','cancelled'].includes(outcome))fail('INVALID_PAYMENT_RESULT');
      const req=lifecycleLedger(id).renewal_requests.find(x=>x.id===reqId);
      if(!req||req.status!=='PAYMENT_PENDING')fail('RENEWAL_PAYMENT_NOT_PENDING');
      if(outcome==='success'){
        const v=lifecycleView(id);
        if(!['active','upcoming'].includes(v.lease_status)||v.total_months+req.months>60)fail('RENEWAL_UNAVAILABLE');
        req.status='COMPLETED';req.completed_at=now();
        req.payment_id='LRENEW_PAYMENT_'+(++s.sequence);req.paid_amount=req.quote_total;
        notify('续租付款成功，租期已更新',id);
      }else{
        req.status=outcome==='failed'?'PAYMENT_FAILED':'PAYMENT_CANCELLED';
        req.payment_last_result_at=now();
        notify(outcome==='failed'?'续租付款未完成，请重新支付':'已暂缓续租付款，可稍后继续',id);
      }
      return copy(req);
    }
    function lifecycleRequestExit(id,type,date){
      if(!authorized())fail('PHONE_REQUIRED');
      if(!['expiry','early'].includes(type)||!validDate(date))fail('INVALID_EXIT_REQUEST');
      const currentLease=lifecycleView(id);
      if(!['active','expired'].includes(currentLease.lease_status))fail('ACTIVE_ORDER_REQUIRED');
      if(type==='expiry'&&date<currentLease.end_date)fail('EXIT_BEFORE_END');
      const l=lifecycleLedger(id);
      if(l.exit)fail('EXIT_IN_PROGRESS');
      l.exit={type,date,status:'REQUESTED',requested_at:now()};notify('退租安排已记录',id);return copy(l.exit);
    }
    function lifecycleRequestInspection(id){
      if(!authorized())fail('PHONE_REQUIRED');
      const l=lifecycleLedger(id);
      if(!l.exit||!['REQUESTED','INSPECTION_FAILED'].includes(l.exit.status))fail('EXIT_REQUEST_REQUIRED');
      l.exit.status='WAITING_INSPECTION';l.deposit='WAITING_INSPECTION';
      notify('已申请验仓，等待门店确认',id);return copy(l.exit);
    }
    function lifecycleReviewInspection(id,outcome,review){
      if(review!==true)fail('REVIEW_ONLY');
      const l=lifecycleLedger(id);
      if(!l.exit||l.exit.status!=='WAITING_INSPECTION'||!['passed','failed'].includes(outcome))fail('INSPECTION_NOT_PENDING');
      if(outcome==='failed'){l.exit.status='INSPECTION_FAILED';return copy(l.exit);}
      l.exit.status='INSPECTION_PASSED';l.deposit='REFUND_PENDING';
      const service=paidService(id);service.useStatus='ended';
      const o=findOrder(id);for(const unitId of o.unit_ids)if(s.stock[unitId]==='occupied')s.stock[unitId]='available';
      s.inventoryVersion++;notify('验仓已通过，押金进入退款处理',id);return copy(l.exit);
    }
    function lifecycleReviewRefund(id,review){
      if(review!==true)fail('REVIEW_ONLY');
      const l=lifecycleLedger(id);
      if(l.exit?.status!=='INSPECTION_PASSED'||l.deposit!=='REFUND_PENDING')fail('INSPECTION_REQUIRED');
      l.deposit='REFUNDED';notify('押金退款状态已更新，请查看订单进度',id);
      return {status:l.deposit,amount:null,simulated:true};
    }
    function lifecycleRequestInvoice(id,paymentId,input){
      if(!authorized())fail('PHONE_REQUIRED');
      const v=lifecycleView(id),p=v.payments.find(x=>x.id===paymentId);
      if(!p)fail('INVALID_PAYMENT');
      const kind=input?.kind;
      if(!['personal','enterprise'].includes(kind)||!String(input.title||'').trim()||
        !/^\S+@\S+\.\S+$/.test(String(input.email||''))||
        (kind==='enterprise'&&!String(input.tax_id||'').trim()))fail('INVOICE_FIELDS');
      const l=lifecycleLedger(id);
      if(l.invoices.some(x=>x.payment_id===paymentId))fail('INVOICE_EXISTS');
      const req={id:'LINVOICE_'+(++s.sequence),payment_id:paymentId,payment_amount:p.amount,
        kind,title:String(input.title).trim().slice(0,120),email:String(input.email).trim().slice(0,120),
        tax_id:kind==='enterprise'?String(input.tax_id).trim().slice(0,50):null,
        status:'SUBMITTED',simulated:true,submitted_at:now()};
      l.invoices.push(req);notify('发票申请已提交，请查看申请进度',id);return copy(req);
    }

    return {fixture,state:()=>copy(s),setScenario,setRequirement,setEstimate,setTerm,requirementReady,available,stockCount,matchingUnits,alternatives,combinations,amounts,validCapacity,validTerm,validDate,today,selectionValid,authorized,quote,submit,pay,resumePendingOrder,recheck,
      hasContact(){return authorized()||validPhone(s.contactPhone);},
      formalAmounts(ids,months){if(!authorized())fail('PHONE_REQUIRED');if(!s.requirement.term_confirmed||months!==s.requirement.term_months)fail('SELECT_TERM');return amounts(ids,months);},
      setContact(phone){const p=String(phone).replace(/[\s-]/g,'');if(!validPhone(p))fail('ENTER_PHONE');s.contactPhone=p;},
      claimCoupons(){for(const [id,name,amount,type] of [['CPN-001','新客租仓券',200,'RENT_CASH'],['CPN-002','12个月长租券',300,'RENT_CASH'],['CPN-003','基础搬运权益',200,'SERVICE_BENEFIT']])if(!s.coupons.some(c=>c.id===id))s.coupons.push({id,name,amount,type,status:s.orders.some(o=>o.status==='paid_simulated')&&type==='RENT_CASH'?'INVALID':'CLAIMED'});invalidate();},
      couponOptions(ids,months){const a=amounts(ids,months);return s.coupons.map(c=>({...copy(c),eligible:couponEligible(c,a.rent_total,months),reason:c.type==='SERVICE_BENEFIT'?(months<6?'租期需满6个月':'租期符合；服务范围与距离资格待确认，不抵扣租金'):!['CLAIMED','APPLIED'].includes(c.status)?'已锁定、使用或失效':s.orders.some(o=>o.status==='paid_simulated')?'仅限首次租仓':c.id==='CPN-001'&&a.rent_total<2000?'整期租金需满2000元':c.id==='CPN-002'&&months<12?'租期需满12个月':''}));},
      setCoupon(id){if(!['auto','none'].includes(id)&&!s.coupons.some(c=>c.id===id))fail('INVALID_COUPON');s.couponChoice=id;invalidate();},
      expirePendingOrders(){let count=0;s.orders.filter(o=>o.status==='pending'&&now()>=o.expiresAt).forEach(o=>{releaseOrder(o,'expired');count++;});return count;},
      cancelOrder(id){const o=findOrder(id);if(o.status!=='pending')fail('INVALID_ORDER_STATE');releaseOrder(o,'cancelled');return copy(o);},
      orderDetail(id){const o=findOrder(id);return {...copy(o),service:copy(s.services[id]||null)};},
      requestIdentityVerification(id){const service=paidService(id);if(service.identity==='verified')fail('IDENTITY_ALREADY_VERIFIED');if(service.identity==='reviewing')fail('IDENTITY_REVIEW_PENDING');service.identity='reviewing';service.identity_submitted_at=now();notify('身份资料已提交，等待核验结果',id);return {status:'reviewing'};},
      identity(id,outcome){const service=paidService(id);if(!['success','failed'].includes(outcome))fail('INVALID_IDENTITY');service.identity=outcome==='success'?'verified':'failed';notify(outcome==='success'?'身份验证通过':'身份验证失败，可重试',id);},
      enterStorage(id){const service=paidService(id),o=findOrder(id);if(service.identity!=='verified')fail('IDENTITY_REQUIRED');if(o.start_date>today())fail('BEFORE_START');if(service.exit?.status==='completed')fail('ORDER_CLOSED');if(!lifecycleView(id).access_allowed)fail('ORDER_CLOSED');service.useStatus='active';notify('已查看入仓指引',id);},
      rentalPeriod,
      lifecycleView,lifecycleRequestRenewal,lifecycleReviewQuote,lifecycleConfirmRenewal,lifecyclePayRenewal,lifecycleRequestExit,lifecycleRequestInspection,lifecycleReviewInspection,lifecycleReviewRefund,lifecycleRequestInvoice,
      setRenewalMonths(id,value){const service=paidService(id);service.renewalDraft=String(value??'').slice(0,12);const months=Number(service.renewalDraft);if(!validTerm(months)||service.renewalQuote?.months!==months)delete service.renewalQuote;return service.renewalDraft;},
      renewalQuote(id,months){const service=paidService(id);if(service.exit)fail('EXIT_IN_PROGRESS');if(!validTerm(months))fail('SELECT_TERM');if(!authorized())fail('PHONE_REQUIRED');if(!s.coupons.some(c=>c.id==='CPN-004'))s.coupons.push({id:'CPN-004',name:'续租券',amount:150,type:'RENEWAL_CASH',status:'CLAIMED'});const a=amounts(findOrder(id).unit_ids,months,{renewal:true}),period=rentalPeriod(id);service.renewalDraft=String(months);service.renewalQuote={...a,quote_id:'RENEW_QUOTE_'+(++s.sequence),months,previous_end_date:period.end_date,new_end_date:addCalendarMonths(period.start_date,period.total_months+months),expiresAt:now()+5*60*1000,base:findOrder(id).unit_ids.map(x=>s.prices[x]||unit(x).base_month)};return copy(service.renewalQuote);},
      payRenewal(id,expectedMonths){const service=paidService(id),o=findOrder(id),q=service.renewalQuote;if(!authorized())fail('PHONE_REQUIRED');if(service.exit)fail('EXIT_IN_PROGRESS');const draft=Number(service.renewalDraft??q?.months),stale=()=>{delete service.renewalQuote;fail('QUOTE_STALE');};if(!q||!validTerm(draft)||q.months!==draft||(expectedMonths!==undefined&&(!validTerm(expectedMonths)||expectedMonths!==q.months))||q.expiresAt<=now()||q.previous_end_date!==rentalPeriod(id).end_date||q.new_end_date!==addCalendarMonths(o.start_date,rentalPeriod(id).total_months+q.months)||o.unit_ids.some((u,i)=>(s.prices[u]||unit(u).base_month)!==q.base[i]))stale();const fresh=amounts(o.unit_ids,q.months,{renewal:true});if(Object.keys(fresh).some(k=>fresh[k]!==q[k]))stale();const payment={...q,id:'RENEW_'+(++s.sequence),paid_at:now(),kind:'RENEWAL'};service.renewals.push(payment);if(q.coupon_id)s.coupons.find(c=>c.id===q.coupon_id).status='REDEEMED';delete service.renewalQuote;service.renewalDraft='';notify('续租付款已记录',id);return copy(payment);},
      requestExit(id,date,empty){const service=paidService(id);if(service.exit)fail('EXIT_IN_PROGRESS');if(service.useStatus!=='active')fail('ACTIVE_ORDER_REQUIRED');if(!validDate(date)||date<findOrder(id).start_date)fail('SELECT_DATE');if(empty!==true)fail('EMPTY_REQUIRED');service.exit={date,status:'awaiting_inspection'};service.deposit='awaiting_inspection';notify('退租申请已记录，等待验仓',id);},
      inspectExit(id,outcome){const service=paidService(id);if(service.exit?.status!=='awaiting_inspection')fail('INVALID_EXIT_STATE');if(!['passed','failed'].includes(outcome))fail('INVALID_INSPECTION');if(outcome==='failed'){service.exit.status='inspection_failed';notify('验仓未通过，请联系顾问',id);return;}service.exit.status='completed';service.useStatus='ended';service.deposit='processing';findOrder(id).unit_ids.forEach(u=>s.stock[u]='available');s.inventoryVersion++;notify('验仓通过，押金退款处理中',id);},
      retryExit(id){const service=paidService(id);if(service.exit?.status!=='inspection_failed')fail('INVALID_EXIT_STATE');service.exit.status='awaiting_inspection';},
      refundDeposit(id){const service=paidService(id);if(service.deposit!=='processing')fail('INSPECTION_REQUIRED');service.deposit='refunded_simulated';notify('押金退款已记录',id);},
      requestInvoice(id,input){const service=paidService(id),o=findOrder(id);if(!input.title?.trim()||!/^\S+@\S+\.\S+$/.test(input.email||''))fail('INVOICE_FIELDS');const payment=input.payment||o.id;if(payment!==o.id&&!service.renewals.some(x=>x.id===payment))fail('INVALID_PAYMENT');if(service.invoices.some(x=>x.payment===payment))fail('INVOICE_EXISTS');const a=payment===o.id?o:service.renewals.find(x=>x.id===payment),invoice={id:'IV_'+(++s.sequence),payment,title:input.title.trim().slice(0,120),email:input.email.trim().slice(0,120),amount:a.rent_after_coupon+a.management_fee,status:'requested_locally'};service.invoices.push(invoice);notify('发票申请已保存',id);return copy(invoice);},
      requestTransport(id,input){const service=paidService(id);if(!input.address?.trim()||!validDate(input.date))fail('TRANSPORT_FIELDS');const request={id:'TR_'+(++s.sequence),address:input.address.trim().slice(0,120),date:input.date,status:'awaiting_advisor',eligibility:'pending_confirmation'};service.transport.push(request);notify('运输需求已记录，权益待顾问确认',id);return copy(request);},
      saveSupport(input){const text=String(input.text||'').trim();if(!text)fail('ENTER_QUESTION');if(input.order_id)findOrder(input.order_id);const message={id:'SUP_'+(++s.sequence),text:text.slice(0,500),order_id:input.order_id||null,type:input.type||'general',status:'saved_locally'};s.messages.push({...message,title:'咨询已保存，尚未发送',read:false});return copy(message);},
      readMessages(){s.messages.forEach(x=>x.read=true);},
      editLead(id,input){const lead=[...s.leads,...s.enterpriseLeads].find(l=>l.id===id);if(!lead)fail('LEAD_NOT_FOUND');if(lead.status==='withdrawn')fail('LEAD_WITHDRAWN');const address=String(input.address||'').trim(),personal=lead.type==='SIMULATED_BOOKING_LEAD',advisor=lead.type==='ADVISOR_CONSULTATION';if((personal&&!address)||address.length>120)fail('ENTER_ADDRESS');if(personal||advisor)lead.address=address;else if(input.address!==undefined)lead.location=address.slice(0,120);if(input.note!==undefined)lead[personal||advisor?'note':'notes']=String(input.note).slice(0,200);if(lead.type==='ENTERPRISE_REQUIREMENT')lead.updated_at=now();return copy(lead);},
      withdrawLead(id){const lead=[...s.leads,...s.enterpriseLeads].find(l=>l.id===id);if(!lead)fail('LEAD_NOT_FOUND');lead.status='withdrawn';},
      clearSelection(){s.selected=[];invalidate();},
      select(ids){if(!selectionValid(ids))fail('UNAVAILABLE');s.selected=[...ids];s.storeId=unit(ids[0]).store_id;invalidate();},
      setCity(city){if(!['北京','上海','深圳','广州','杭州'].includes(city))fail('INVALID_CITY');s.city=city;s.locationAuthorized=false;s.selected=[];s.storeId=null;invalidate();},
      setDate(v){if(!validDate(v))fail('SELECT_DATE');s.startDate=v;s.dateConfirmed=true;invalidate();},
      setStore(id){if(!store(id)||store(id).city!==s.city)fail('INVALID_STORE');s.storeId=id;},
      setReturn(page){s.returnPage=page;},
      consumePreview(){const eligible=!s.previewConsumed;s.previewConsumed=true;return eligible;},
      requestPhone(){if(authorized())return false;s.auth={status:'pending',expiresAt:0};return true;},
      resolvePhone(result,details={}){if(s.auth.status!=='pending')fail('NO_PHONE_REQUEST');if(!['success','denied','failed'].includes(result))fail('INVALID_PHONE_OUTCOME');const phone=String(details.phone||'').replace(/[\s-]/g,'');if(result==='success'&&details.phone&&!validPhone(phone))fail('ENTER_PHONE');s.auth={status:result==='success'?'verified':result,expiresAt:result==='success'?now()+30*60*1000:0};if(result==='success'){s.auth.method=details.method||'local_fixture';s.auth.phone=phone||null;if(phone){s.contactPhone=phone;if(!s.account||s.account.phone!==phone)s.account={id:'LOCAL_ACCOUNT_'+(++s.sequence),phone,createdAt:now(),methods:[]};s.account.lastLoginAt=now();s.account.methods=[...new Set([...s.account.methods,s.auth.method])];}}else invalidate();},
      revokePhone(){s.auth={status:'anonymous',expiresAt:0};invalidate();},
      markUnavailable(id){if(!unit(id))fail('INVALID_UNIT');s.stock[id]='soldout';s.inventoryVersion++;invalidate();},
      saveEnterpriseLead(input={}){
        const requestedId=input.lead_id;let index=-1,existing=null;
        if(requestedId!==undefined&&requestedId!==null&&requestedId!==''){index=s.enterpriseLeads.findIndex(l=>l.id===requestedId);if(index<0)fail('LEAD_NOT_FOUND');existing=s.enterpriseLeads[index];if(existing.status==='withdrawn')fail('LEAD_WITHDRAWN');input={...existing,...input};}
        const phone=String(input.phone||'').replace(/[\s-]/g,'');if(!validPhone(phone)&&!(phone===''&&authorized()))fail('ENTER_BUSINESS_PHONE');
        const capacity=input.capacity_m3??null,term=input.term_months??null;
        if(capacity!==null&&(!(typeof capacity==='number'&&Number.isFinite(capacity)&&capacity>=.5&&capacity<=200)||Math.abs(capacity*1000-Math.round(capacity*1000))>1e-7))fail('INVALID_CAPACITY');
        if(term!==null&&!validTerm(term))fail('INVALID_TERM');
        const types=['库存','样品','文件','设备','项目物料','其他'],moving=['需要','待确认','不需要'];
        const lead={id:existing?.id||'B2B_LEAD_'+(++s.sequence),type:'ENTERPRISE_REQUIREMENT',status:'saved_locally',customer_type:'enterprise',phone:phone||null,contact_source:phone?'manual':'wechat_authorized',capacity_m3:capacity,term_months:term,storage_types:[...new Set((input.storage_types||[]).filter(x=>types.includes(x)))],moving_support:moving.includes(input.moving_support)?input.moving_support:'待确认',transport_eligible:null,created_at:existing?.created_at??now(),updated_at:now()};
        for(const key of ['location','contact_name','company','storage_type_other','notes','capacity_band'])if(typeof input[key]==='string')lead[key]=input[key].trim().slice(0,key==='notes'?500:120);
        if(input.expected_start_date){if(!validDate(input.expected_start_date))fail('SELECT_DATE');lead.expected_start_date=input.expected_start_date;}
        if(existing)s.enterpriseLeads[index]=lead;else s.enterpriseLeads.push(lead);if(phone)s.contactPhone=phone;return copy(lead);
      },
      saveAdvisorLead(input={}){const phone=String(input.phone??(authorized()?s.auth.phone:'')??'').replace(/[\s-]/g,''),address=String(input.address||'').trim();if(!validPhone(phone))fail('ENTER_PHONE');if(address.length>120)fail('ENTER_ADDRESS');const lead={id:'SIM_LEAD_'+(++s.sequence),type:'ADVISOR_CONSULTATION',address,phone,capacity_m3:s.requirement.capacity_m3,term_months:s.requirement.term_confirmed?s.requirement.term_months:null,status:'saved_locally'};for(const key of ['start_hint','preferred_date','items','capacity_hint','term_hint','note','service_source'])if(typeof input[key]==='string'&&input[key].trim())lead[key]=input[key].trim().slice(0,200);s.contactPhone=phone;s.leads.push(lead);return copy(lead);},
      saveLead(address,details={}){const text=String(address||'').trim(),phone=String(details.phone??s.contactPhone??'').replace(/[\s-]/g,'');if(!validPhone(phone))fail('ENTER_PHONE');if(!text||text.length>120)fail('ENTER_ADDRESS');const lead={id:'SIM_LEAD_'+(++s.sequence),type:'SIMULATED_BOOKING_LEAD',address:text,capacity_m3:s.requirement.capacity_m3,term_months:s.requirement.term_confirmed?s.requirement.term_months:null,phone,status:'saved_locally',follow_up_owner:'sales_pending_sync'};for(const key of ['start_hint','preferred_date','items','capacity_hint','term_hint','note','service_source']){if(typeof details[key]==='string'&&details[key].trim())lead[key]=details[key].trim().slice(0,200);}s.leads.push(lead);return copy(lead);}
    };
  }
  root.SIM_CORE={create};
  if(typeof module==='object'&&module.exports)module.exports={create};
})(typeof window==='object'?window:globalThis);
