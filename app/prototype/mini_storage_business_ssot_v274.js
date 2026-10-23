window.MINI_STORAGE_MASTER_V242={
 version:'2.4.2',
 fees:{management_fee:50},
 pricing:{
  model_version:'unit_master_v221',
  source_monthly_price_basis:'pre_discount_base_price',
  source_monthly_price_basis_status:'CONFIRMED_BY_PRODUCT',
  home_default_display_discount_factor:.65,
  term_rules:[
   {min:1,max:3,factor:.75,label:'1–3个月 · 75折'},
   {min:4,max:6,factor:.70,label:'4–6个月 · 7折'},
   {min:7,max:12,factor:.65,label:'7–12个月 · 65折'},
   {min:13,max:36,factor:.60,label:'13–36个月 · 6折'},
   {min:37,max:60,factor:.55,label:'37–60个月 · 5.5折'}
  ],
  store_multipliers:{jianguo:1,shuangjing:.91,chaoyang:.84,sanyuanqiao:1.10,wangjing:1.04}
 },
 advisor_rules:{expected_contract_rent_threshold:2000},
 // Shared demo inventory used by S01 and S02; all store cards refer to these actual units.
 unit_catalog:[
  {id:'A038',v:0.8,area:0.4,dims:'0.8×0.5×2.0m',base:199,tag:'小件收纳'},
  {id:'A021',v:1.6,area:0.8,dims:'1.0×0.8×2.0m',base:359,tag:'行李 / 换季'},
  {id:'B014',v:2.3,area:1.1,dims:'1.1×1.0×2.1m',base:499,tag:'家庭杂物'},
  {id:'B031',v:4.2,area:1.9,dims:'1.4×1.35×2.2m',base:850,tag:'稍紧凑'},
  {id:'C008',v:4.8,area:2.1,dims:'1.5×1.4×2.3m',base:980,tag:'大小接近'},
  {id:'C012',v:5.6,area:2.4,dims:'1.6×1.5×2.3m',base:1060,tag:'更宽裕'},
  {id:'D005',v:7.8,area:3.4,dims:'2.0×1.7×2.3m',base:1390,tag:'大件较多'},
  {id:'E002',v:12.0,area:5.2,dims:'2.6×2.0×2.3m',base:1990,tag:'企业 / 大空间'}
 ],
 transaction:{agreement_version:'rental_terms_prototype_v1'},
 lifecycle:{ending_window_days:null,ending_rule_status:'BUSINESS_RULE_PENDING'},
 stores:{
  jianguo:{name:'安贞店',area:'朝阳区 · 富仁名苑',address:'北京市朝阳区安贞区域（演示）',entry:'到达建筑后按「迷你仓」现场标识进入',parking:'可临停卸货，具体车位按现场指引',freight:'大件通道按现场标识进入',access_hours:'24小时自助存取'},
  chaoyang:{name:'芍药居店',area:'朝阳区 · 芍药居北里',address:'北京市朝阳区芍药居区域（演示）',entry:'到达建筑后按「迷你仓」现场标识进入',parking:'可临停卸货，具体车位按现场指引',freight:'大件通道按现场标识进入',access_hours:'24小时自助存取'},
  wangjing:{name:'建国门外店',area:'东城区 · 璞邸酒店',address:'北京市东城区建国门外区域（演示）',entry:'到达建筑后按「迷你仓」现场标识进入',parking:'可临停卸货，具体车位按现场指引',freight:'大件通道按现场标识进入',access_hours:'24小时自助存取'},
  shuangjing:{name:'双井门店',area:'朝阳区 · 双井',address:'北京市朝阳区双井区域（演示）',entry:'到达建筑后按「迷你仓」现场标识进入',parking:'可临停卸货，具体车位按现场指引',freight:'大件通道按现场标识进入',access_hours:'24小时自助存取'},
  sanyuanqiao:{name:'三元桥门店',area:'朝阳区 · 三元桥',address:'北京市朝阳区三元桥区域（演示）',entry:'到达建筑后按「迷你仓」现场标识进入',parking:'可临停卸货，具体车位按现场指引',freight:'大件通道按现场标识进入',access_hours:'24小时自助存取'}
 },
 location_names:{
  guomao:'北京 · 国贸附近',wangjing:'北京 · 望京',shuangjing:'北京 · 双井',
  sanyuanqiao:'北京 · 三元桥',zhongguancun:'北京 · 中关村',outside:'北京 · 远郊示例',
  demo_nomatch:'异常演示 · 近距离无匹配',demo_extended:'异常演示 · 扩大范围',demo_far:'异常演示 · 较远位置'
 },
 route_base:{
  guomao:{
   jianguo:{drive:[8,3.2],bike:[18,3.2],walk:[42,3.2]},shuangjing:{drive:[10,4.1],bike:[22,4.0],walk:[54,4.0]},
   chaoyang:{drive:[12,5.1],bike:[25,5.1],walk:[66,5.1]},sanyuanqiao:{drive:[15,6.7],bike:[31,6.5],walk:[84,6.5]},
   wangjing:{drive:[18,8.4],bike:[38,8.4],walk:[110,8.4]}
  },
  wangjing:{
   wangjing:{drive:[6,2.1],bike:[12,2.0],walk:[27,2.0]},sanyuanqiao:{drive:[11,4.6],bike:[22,4.4],walk:[58,4.4]},
   chaoyang:{drive:[15,6.2],bike:[30,6.0],walk:[79,6.0]},jianguo:{drive:[23,10.8],bike:[47,10.3],walk:[138,10.3]},
   shuangjing:{drive:[27,12.1],bike:[52,11.8],walk:[151,11.8]}
  },
  shuangjing:{
   shuangjing:{drive:[5,1.8],bike:[10,1.7],walk:[23,1.7]},jianguo:{drive:[12,5.0],bike:[24,4.8],walk:[63,4.8]},
   wangjing:{drive:[14,6.1],bike:[29,5.9],walk:[77,5.9]},chaoyang:{drive:[20,9.3],bike:[41,9.0],walk:[116,9.0]},
   sanyuanqiao:{drive:[22,10.1],bike:[45,9.7],walk:[127,9.7]}
  },
  sanyuanqiao:{
   sanyuanqiao:{drive:[6,2.3],bike:[13,2.2],walk:[30,2.2]},chaoyang:{drive:[10,4.0],bike:[20,3.9],walk:[51,3.9]},
   wangjing:{drive:[13,5.5],bike:[27,5.3],walk:[70,5.3]},jianguo:{drive:[17,7.6],bike:[35,7.3],walk:[96,7.3]},
   shuangjing:{drive:[21,9.8],bike:[43,9.4],walk:[123,9.4]}
  },
  zhongguancun:{
   sanyuanqiao:{drive:[18,11.2],bike:[46,10.4],walk:[142,10.4]},wangjing:{drive:[22,13.5],bike:[55,12.8],walk:[173,12.8]},
   chaoyang:{drive:[25,15.1],bike:[62,14.4],walk:[190,14.4]},jianguo:{drive:[31,19.4],bike:[78,18.6],walk:[245,18.6]},
   shuangjing:{drive:[35,22.0],bike:[86,21.1],walk:[278,21.1]}
  },
  outside:{
   chaoyang:{drive:[36,28.2],bike:[104,27.0],walk:[350,27.0]},wangjing:{drive:[40,31.5],bike:[116,30.2],walk:[390,30.2]},
   sanyuanqiao:{drive:[44,34.8],bike:[128,33.6],walk:[430,33.6]},jianguo:{drive:[49,39.1],bike:[143,37.8],walk:[485,37.8]},
   shuangjing:{drive:[53,42.0],bike:[154,40.5],walk:[520,40.5]}
  },
  demo_nomatch:{
   chaoyang:{drive:[17,11.4],bike:[40,10.9],walk:[142,10.9]},wangjing:{drive:[21,13.2],bike:[47,12.7],walk:[165,12.7]},
   sanyuanqiao:{drive:[24,15.0],bike:[54,14.4],walk:[188,14.4]}
  },
  demo_extended:{
   sanyuanqiao:{drive:[18,11.2],bike:[46,10.4],walk:[142,10.4]},wangjing:{drive:[22,13.5],bike:[55,12.8],walk:[173,12.8]},
   chaoyang:{drive:[25,15.1],bike:[62,14.4],walk:[190,14.4]}
  },
  demo_far:{
   chaoyang:{drive:[31,22.8],bike:[82,21.9],walk:[288,21.9]},wangjing:{drive:[36,26.5],bike:[94,25.4],walk:[332,25.4]},
   sanyuanqiao:{drive:[40,29.6],bike:[105,28.5],walk:[372,28.5]}
  }
 },
 demo_rules:{nearby_radius_km:10,nearby_radius_status:'BUSINESS_TBD_DEMO_ASSUMPTION'},
 route_source:'DEMO_SSOT'
};
(function(){
 const M=window.MINI_STORAGE_MASTER_V242;
 const pricing=M.pricing;
 function clampTerm(value){return Math.max(1,Math.min(60,Math.round(Number(value)||1)))}
 function termFactor(months){
   const term=clampTerm(months);
   return (pricing.term_rules.find(rule=>term>=rule.min&&term<=rule.max)||pricing.term_rules[2]).factor;
 }
 function storeAdjustedBase(base,storeId='jianguo'){
   return Math.max(1,Math.round(Number(base||1)*(pricing.store_multipliers[storeId]||1)/10)*10);
 }
 function contractRent(base,months,storeId='jianguo'){
   const term=clampTerm(months);
   return Math.round(storeAdjustedBase(base,storeId)*term*termFactor(term)/10)*10;
 }
 function monthlyReference(base,months,storeId='jianguo'){
   const term=clampTerm(months);
   return Math.round(contractRent(base,term,storeId)/term);
 }
 function inventorySummary(units=M.unit_catalog){
   const list=Array.isArray(units)?units.filter(unit=>Number(unit?.v)>0):[];
   const volumes=list.map(unit=>Number(unit.v));
   return {scope:'CURRENT_DEMO_SELECTABLE_UNITS',count:list.length,min_volume:list.length?Math.min(...volumes):0,max_volume:list.length?Math.max(...volumes):0};
 }
 function advisorDecision(input={}){
   const expectedContractRent=Math.max(0,Number(input.expected_contract_rent||0));
   const carriedLevel=String(input.carried_level||'none');
   const carriedReason=String(input.carried_reason||'');
   let reason='';
   if(input.has_oversize)reason='oversize';
   else if(input.needs_multiple)reason='multiple_units';
   else if(input.customer_type==='enterprise')reason='enterprise';
   else if(expectedContractRent>=M.advisor_rules.expected_contract_rent_threshold)reason='high_contract_rent';
   else if(carriedLevel==='strong')reason=carriedReason||'carried_estimate';
   return {level:reason?'strong':'none',reason,expected_contract_rent:expectedContractRent};
 }
 // H01-007-S1 D-03: one shared lease-term validity rule for the H01 / S01 / S02 / U01 restore entries.
 // Returns the integer month count (1-60) or null. It never substitutes a default term.
 function validTerm(value){
   if(value===null||value===undefined||value==='')return null;
   const text=String(value).trim();
   if(!/^(?:[1-9]|[1-5][0-9]|60)$/.test(text))return null;
   return Number(text);
 }
 window.MINI_STORAGE_BUSINESS_HELPERS_V274={
   clampTerm,termFactor,storeAdjustedBase,contractRent,monthlyReference,inventorySummary,advisorDecision,validTerm
 };
 const K={current:'mini_storage_order_current',history:'mini_storage_order_history_v242',renewals:'mini_storage_renewal_requests_v242',returns:'mini_storage_return_requests_v242',invoices:'mini_storage_invoice_records_v242',payments:'mini_storage_payment_records_v242'};
 function read(k,fallback){try{const v=JSON.parse(localStorage.getItem(k)||'null');return v??fallback}catch(e){return fallback}}
 function write(k,v){try{localStorage.setItem(k,JSON.stringify(v));return v}catch(e){window['__'+k]=JSON.stringify(v);return v}}
 function uid(prefix){return prefix+'-'+new Date().toISOString().replace(/\D/g,'').slice(0,14)+'-'+Math.random().toString(36).slice(2,6).toUpperCase()}
 function startOfDay(d){const x=new Date(d);x.setHours(0,0,0,0);return x}
 function parseDate(v){if(!v)return null;const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return null;const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));return Number.isNaN(d.getTime())?null:d}
 function addMonthsClamped(date,months){const d=new Date(date.getTime()),day=d.getDate();d.setMonth(d.getMonth()+months);if(d.getDate()<day)d.setDate(0);return d}
 function toISODate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
 function identityStatus(order){const value=String(order?.identity_verification_status||'NOT_STARTED');return ['NOT_STARTED','PENDING','VERIFIED','FAILED'].includes(value)?value:'NOT_STARTED'}
 function lockCodeFor(unitId,ord){let h=0;for(const c of String(unitId||'')+String(ord||''))h=(h*31+c.charCodeAt(0))%9000;return String(1000+h).slice(-4)}
 function derive(order,now=new Date()){
   const o=order||{};
   const paid=o.status==='PAID' && o.payment_status==='PAID';
   const identityVerified=identityStatus(o)==='VERIFIED';
   const start=parseDate(o.start_date);
   const term=Math.max(1,Math.round(Number(o.term_months||1)));
   let end=o.end_date?parseDate(o.end_date):null;
   if(!end && start){end=addMonthsClamped(start,term);end.setDate(end.getDate()-1+Math.max(0,Number(o.referral_friend_bonus_days||0)))}
   const today=startOfDay(now);
   const explicitlyClosed=['CLOSED','EXPIRED','REVOKED'].includes(o.access_status)||['ENDED','CLOSED'].includes(o.lease_status)||o.detail_state==='ended'||o.lifecycle_state==='ended';
   const returnState=String(o.return_status||'');
   let state='invalid';
   if(!paid) state='not_paid';
   else if(!start||!end) state='invalid';
   else if(explicitlyClosed||today>end) state='ended';
   else if(today<start) state='upcoming';
   else if(['REQUESTED','WAITING_INSPECTION','INSPECTION_PASSED'].includes(returnState)) state='returning';
   else if(o.lifecycle_state==='ending'||o.detail_state==='ending') state='ending';
   else state='active';
   const isCurrent=['upcoming','active','ending','returning'].includes(state);
   const accessViewAllowed=paid&&isCurrent&&identityVerified&&state!=='upcoming';
   const physicalAccessAllowed=accessViewAllowed&&['active','ending','returning'].includes(state)&&!explicitlyClosed;
   const accessStatus=state==='ended'?'EXPIRED':(isCurrent&&!identityVerified?'IDENTITY_REQUIRED':(state==='upcoming'?'READY_ON_START_DATE':(['active','ending','returning'].includes(state)?'ACTIVE':'NOT_AVAILABLE')));
   return {state,paid,identity_verification_status:identityStatus(o),is_current:isCurrent,start_date:start?toISODate(start):null,end_date:end?toISODate(end):null,start,end,today,days_to_end:end?Math.ceil((startOfDay(end)-today)/86400000):null,access_view_allowed:accessViewAllowed,physical_access_allowed:physicalAccessAllowed,access_status:accessStatus};
 }
 function normalize(order,now=new Date()){
   const o={...(order||{})},lc=derive(o,now);
   if(lc.end_date)o.end_date=lc.end_date;
   if(lc.paid){o.lifecycle_state=lc.state;o.detail_state=lc.state;o.access_status=(o.access_status==='CLOSED'?'CLOSED':lc.access_status);o.first_access_allowed=lc.physical_access_allowed}
   return o
 }
 function upsert(arr,item,key){const a=Array.isArray(arr)?[...arr]:[],id=item?.[key];if(!id)return a;const i=a.findIndex(x=>x&&x[key]===id);if(i>=0)a[i]={...a[i],...item};else a.unshift(item);return a}
 const repo={
   keys:K,uid,
   getCurrent(){return read(K.current,{})},
   saveCurrent(order){const next={...(order||{}),updated_at:new Date().toISOString()};const prev=this.getCurrent();if(prev.order_no&&prev.order_no!==next.order_no)this.upsertOrder(prev);write(K.current,next);this.upsertOrder(next);return next},
   upsertOrder(order){if(!order?.order_no)return order;const hist=upsert(read(K.history,[]),order,'order_no');write(K.history,hist);return order},
   getOrders(){const current=this.getCurrent(),hist=read(K.history,[]);let all=hist;if(current.order_no)all=upsert(all,current,'order_no');return all.map(x=>normalize(x)).sort((a,b)=>String(b.updated_at||b.paid_at||b.created_at||'').localeCompare(String(a.updated_at||a.paid_at||a.created_at||'')))},
   findOrder(no){return this.getOrders().find(x=>x.order_no===no)||null},
   updateOrder(no,patch){let target=this.findOrder(no);if(!target)return null;target={...target,...patch,updated_at:new Date().toISOString()};this.upsertOrder(target);const cur=this.getCurrent();if(cur.order_no===no)write(K.current,target);return target},
   syncCurrent(){const cur=this.getCurrent();if(!cur.order_no)return cur;const n=normalize(cur);write(K.current,n);this.upsertOrder(n);return n},
   getPayments(){return read(K.payments,[])},
   addPayment(payment){const p={...payment,payment_id:payment.payment_id||uid('PAY'),created_at:payment.created_at||new Date().toISOString(),status:payment.status||'PAID'};write(K.payments,upsert(this.getPayments(),p,'payment_id'));return p},
   ensureInitialPayment(order){if(!order?.order_no||order.payment_status!=='PAID')return null;const id='INIT-'+order.order_no;const found=this.getPayments().find(x=>x.payment_id===id);if(found)return found;return this.addPayment({payment_id:id,order_no:order.order_no,type:'INITIAL',amount:Number(order.payable_total||0),breakdown:{rent:Number(order.total_price||0),deposit:Number(order.deposit_amount||0),management_fee:Number(order.management_fee||0)},paid_at:order.paid_at||new Date().toISOString()})},
   getRenewals(){return read(K.renewals,[])},
   findRenewal(orderNo){return this.getRenewals().find(x=>x.order_no===orderNo&&!['CANCELLED','COMPLETED'].includes(x.status))||this.getRenewals().filter(x=>x.order_no===orderNo).at(-1)||null},
   saveRenewal(r){const x={...r,renewal_id:r.renewal_id||uid('RN'),updated_at:new Date().toISOString()};write(K.renewals,upsert(this.getRenewals(),x,'renewal_id'));return x},
   getReturns(){return read(K.returns,[])},
   findReturn(orderNo){return this.getReturns().find(x=>x.order_no===orderNo&&!['CANCELLED','COMPLETED'].includes(x.status))||this.getReturns().find(x=>x.order_no===orderNo)||null},
   saveReturn(r){const x={...r,return_id:r.return_id||uid('RT'),updated_at:new Date().toISOString()};write(K.returns,upsert(this.getReturns(),x,'return_id'));return x},
   getInvoices(){return read(K.invoices,[])},
   saveInvoice(inv){const x={...inv,invoice_id:inv.invoice_id||uid('INV'),submitted_at:inv.submitted_at||new Date().toISOString(),status:inv.status||'SUBMITTED'};write(K.invoices,upsert(this.getInvoices(),x,'invoice_id'));return x}
 };
 window.MINI_STORAGE_LIFECYCLE_V242={derive,normalize,parseDate,addMonthsClamped,toISODate,identityStatus,lockCodeFor};
 window.MINI_STORAGE_REPO_V242=repo;
 // H01-007-S1 D-04: the user's final confirmation (store / unit / capacity / term) is the trade basis.
 // The first estimate is preserved under original_estimate and never overrides the confirmed trade.
 // Pricing is NOT computed here; price_snapshot stays the only authority for amounts.
 function confirmTradeRequirement(requirement,trade){
   const req=(requirement&&typeof requirement==='object'&&!Array.isArray(requirement))?requirement:{};
   const t=trade||{};
   const term=validTerm(t.term_months);
   const original=req.original_estimate||{
     requirement_id:req.requirement_id||null,target_volume:Number(req.target_volume)||null,min_volume:Number(req.min_volume)||null,max_volume:Number(req.max_volume)||null,
     term_months:validTerm(req.term_months),size_mode:req.size_mode||null,source:req.source||null,recorded_at:req.updated_at||null
   };
   return {
     ...req,
     target_volume:Number(req.target_volume)>0?Number(req.target_volume):(Number(t.target_volume)>0?Number(t.target_volume):(Number(t.volume)||null)),
     term_months:term===null?validTerm(req.term_months):term,
     selected_store_id:t.store_id||req.selected_store_id||'',
     selected_size_option_id:t.size_option_id||'',
     selected_representative_unit_no:t.representative_unit_no||'',
     selected_actual_unit_id:t.actual_unit_id||null,
     selected_unit_id:t.actual_unit_id||t.representative_unit_no||null,
     inventory_identity_type:t.unit_identity_type||(t.actual_unit_id?'ACTUAL_UNIT':'SIZE_OPTION'),
     confirmed_volume:Number(t.volume)>0?Number(t.volume):null,
     trade_confirmed:{store_id:t.store_id||'',size_option_id:t.size_option_id||'',representative_unit_no:t.representative_unit_no||'',actual_unit_id:t.actual_unit_id||null,unit_identity_type:t.unit_identity_type||'',volume:Number(t.volume)||null,target_volume:Number(t.target_volume)||null,term_months:term,confirmed_by:t.confirmed_by||'U01',confirmed_at:new Date().toISOString()},
     snapshot_basis:'FINAL_TRADE_CONFIRMED',
     original_estimate:original,
     updated_at:new Date().toISOString()
   };
 }
 window.MINI_STORAGE_TRADE_SNAPSHOT_V1={confirm:confirmTradeRequirement,validTerm};
 // H01-007-S3 D-07 / D-12: shared re-check helpers used by Q01 (expiry), U01 (re-quote confirmation), O01 (unpaid-order resume),
 // H01 / M01 (pending-task entries). Pure functions only: no price is computed and no business rule is changed here.
 function quoteExpired(quote,now=Date.now()){
   const q=quote||{};if(!q.quote_id)return false;
   if(q.status==='expired')return true;
   if(q.status!=='active')return false;
   const t=Date.parse(String(q.valid_until||''));
   return Number.isFinite(t)&&t<=now;
 }
 const RESUMABLE_ORDER_STATUS=['PENDING_PAYMENT','PAYMENT_FAILED'];
 function resumableOrder(order){const o=order||{};return !!(o.order_no&&o.unit_id&&RESUMABLE_ORDER_STATUS.includes(String(o.status||'')))}
 const AMOUNT_FIELDS=[['total_rent','整期租金'],['monthly_average','月均租金'],['deposit','押金'],['management_fee','管理费'],['coupon_discount_amount','优惠金额'],['upfront_payable','首次应付']];
 function num(v){return v===undefined||v===null||v===''?0:Number(v)}
 function amountDiff(saved,fresh){
   const a=saved||{},b=fresh||{};const changes=[];
   for(const [key,label] of AMOUNT_FIELDS){const x=num(a[key]),y=num(b[key]);if(x!==y)changes.push({key,label,from:x,to:y})}
   const ca=a.coupon_applied?String(a.coupon_id||''):'',cb=b.coupon_applied?String(b.coupon_id||''):'';
   if(ca!==cb)changes.push({key:'coupon_id',label:'优惠券',from:ca||'无',to:cb||'无'});
   return changes;
 }
 function money(v){return '¥'+Math.round(num(v)).toLocaleString()}
 function describeChanges(changes){return (changes||[]).map(c=>c.key==='coupon_id'?`${c.label}：${c.from} → ${c.to}`:`${c.label}：${money(c.from)} → ${money(c.to)}`).join('；')}
 // Amount views in price-snapshot shape; the record's own price_snapshot wins when it carries amounts.
 function quoteAmounts(q){const x=q||{},s=x.price_snapshot;if(s&&typeof s==='object'&&num(s.total_rent)>0)return s;
   return {total_rent:num(x.total_rent||x.total_price),monthly_average:num(x.monthly_average||x.monthly_price),deposit:num(x.deposit_amount),management_fee:num(x.management_fee),coupon_discount_amount:num(x.coupon_discount_amount),upfront_payable:num(x.upfront_payable||x.initial_payable),coupon_applied:!!x.coupon_id,coupon_id:x.coupon_id||null}}
 function orderAmounts(o){const x=o||{},s=x.price_snapshot;if(s&&typeof s==='object'&&num(s.total_rent)>0)return s;
   return {total_rent:num(x.total_price),monthly_average:num(x.monthly_price),deposit:num(x.deposit_amount),management_fee:num(x.management_fee),coupon_discount_amount:num(x.coupon_discount_amount),upfront_payable:num(x.payable_total),coupon_applied:!!x.coupon_id,coupon_id:x.coupon_id||null}}
 window.MINI_STORAGE_TRADE_RECHECK_V1={quoteExpired,resumableOrder,amountDiff,describeChanges,quoteAmounts,orderAmounts,money,RESUMABLE_ORDER_STATUS,AMOUNT_FIELDS};
 // Backward aliases for legacy inline code.
 window.MINI_STORAGE_MASTER_V241=M;window.MINI_STORAGE_MASTER_V231=M;window.MINI_STORAGE_MASTER_V222=M;
 window.MINI_STORAGE_LIFECYCLE_V241=window.MINI_STORAGE_LIFECYCLE_V242;
})();

// Fit confirmation is independent of the asynchronously loaded presentation layer.
window.MINI_STORAGE_FIT_V1={
  requiresCheck(requirement){return Boolean(requirement?.has_oversize||(requirement?.item_constraints||[]).some(x=>x.requires_dimension_check));},
  currentRequirement(){try{return JSON.parse(localStorage.getItem('mini_storage_requirement_current')||'{}')}catch(e){return {}}}
};
