(function(){
  'use strict';
  const WALLET_KEY='mini_koala_coupon_wallet_v1';
  const SELECT_KEY='mini_koala_coupon_selection_v1';
  const PRICE_SNAPSHOT_KEY='mini_storage_price_snapshot_current';
  const REQUIREMENT_KEY='mini_storage_requirement_current';
  const QUOTE_KEY='mini_storage_quote_current';
  const ORDER_KEY='mini_storage_order_current';
  const ORDER_HISTORY_KEY='mini_storage_order_history_v242'; // H01-007-S2 D-05: same key as MINI_STORAGE_REPO_V242.keys.history
  const TEMPLATES={
    'CPN-001':{coupon_id:'CPN-001',coupon_name:'新客租仓券',coupon_type:'RENT_CASH',face_value:200,min_rent_amount:2000,min_term_months:1,customer_scope:'NEW',display:'¥200'},
    'CPN-002':{coupon_id:'CPN-002',coupon_name:'12个月长租券',coupon_type:'RENT_CASH',face_value:300,min_rent_amount:0,min_term_months:12,customer_scope:'NEW',display:'¥300'},
    'CPN-003':{coupon_id:'CPN-003',coupon_name:'搬运补贴券',coupon_type:'SERVICE_BENEFIT',face_value:200,min_term_months:6,customer_scope:'NEW',display:'¥200搬运补贴'},
    'CPN-004':{coupon_id:'CPN-004',coupon_name:'续租优惠券',coupon_type:'RENEWAL_CASH',face_value:150,min_term_months:6,customer_scope:'RENEWAL',display:'¥150'}
  };
  function read(key,fallback){try{const v=localStorage.getItem(key);return v?JSON.parse(v):fallback}catch(e){return fallback}}
  function write(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(e){}}
  function now(){return new Date().toISOString()}
  function wallet(){return read(WALLET_KEY,[])}
  function saveWallet(rows){write(WALLET_KEY,rows);return rows}
  function grant(id,source){const t=TEMPLATES[id];if(!t)return null;const rows=wallet();let row=rows.find(x=>x.coupon_id===id);if(row)return row;const d=new Date();d.setDate(d.getDate()+7);row={user_coupon_id:`UC-${id}-${Date.now()}`,coupon_id:id,status:'CLAIMED',claim_time:now(),expire_time:d.toISOString(),source:source||'AUTO'};rows.push(row);saveWallet(rows);return row}
  function ensureAcquisitionWallet(){if(!isNewCustomer())return;grant('CPN-001','ESTIMATE_COMPLETED');grant('CPN-002','ESTIMATE_COMPLETED');grant('CPN-003','ESTIMATE_COMPLETED')}
  function ensureRenewalWallet(){grant('CPN-004','ENDING_RENEWAL')}
  function currentOrder(){return read(ORDER_KEY,{})}
  // H01-007-S2 D-05: first-purchase eligibility = no settled (PAID) rental order in the current order OR the order history on this device.
  // Before S2 only the current order pointer was checked, so a paid order that had moved into history (because a newer pending order
  // became current) made the user a "new customer" again. No phone / WeChat cross-identity rule is defined here (pending business confirmation).
  function isPaidRental(o){return !!(o&&typeof o==='object'&&o.order_no&&o.status==='PAID'&&(o.payment_status===undefined||o.payment_status===null||o.payment_status==='PAID'))}
  function paidRentalHistory(){const cur=currentOrder();const hist=read(ORDER_HISTORY_KEY,[]);const seen=new Set();const out=[];for(const o of [cur,...(Array.isArray(hist)?hist:[])]){if(!isPaidRental(o)||seen.has(o.order_no))continue;seen.add(o.order_no);out.push(o)}return out}
  function isNewCustomer(){return paidRentalHistory().length===0}
  // H01-007-S2 D-06: a coupon LOCKED by the current unpaid order (PENDING_PAYMENT / PAYMENT_FAILED) may be recovered by that same order
  // when the price snapshot being validated describes the same store + size option (+ actual unit) — i.e. the same identity rule O01 uses to
  // reuse an order_no. Any other order sees the coupon as occupied. No lock timeout / release delay is introduced here (not confirmed by business).
  function recoverableLockOrder(base){
    const o=currentOrder();if(!o||!o.order_no||!['PENDING_PAYMENT','PAYMENT_FAILED'].includes(String(o.status||'')))return null;
    if(!base||typeof base!=='object')return null;
    const sameStore=String(o.store_id||'')===String(base.store_id||'');
    const sameSize=base.size_option_id?String(o.size_option_id||'')===String(base.size_option_id):String(o.unit_id||'')===String(base.unit_id||base.representative_unit_no||'');
    const sameActual=!base.actual_unit_id||String(o.actual_unit_id||'')===String(base.actual_unit_id);
    return sameStore&&sameSize&&sameActual?o.order_no:null;
  }
  function lockOwnedBy(row,orderNo){return !!(orderNo&&row&&row.status==='LOCKED'&&row.locked_order_id===orderNo)}
  function isFirstPurchaseContext(){const params=new URLSearchParams(location.search);if(params.has('firstPurchase'))return isNewCustomer()&&params.get('firstPurchase')!=='0';const previous=read(PRICE_SNAPSHOT_KEY,{});return isNewCustomer()&&previous.coupon_customer_first_purchase!==false}
  function validExpiry(row,date=Date.now()){const expiry=Date.parse(String(row?.expire_time||''));return Number.isFinite(expiry)&&expiry>date}
  function effectiveStatus(row,date=Date.now()){return row?.status==='CLAIMED'&&!validExpiry(row,date)?'EXPIRED':String(row?.status||'INVALID')}
  function reason(t,ctx,row){
    if(!row)return '未领取优惠券';
    const st=effectiveStatus(row); // H01-007-S2 D-06
    if(st!=='CLAIMED'&&!lockOwnedBy(row,ctx.recover_order_no))return st==='EXPIRED'?'优惠券已过期':(st==='LOCKED'?'优惠券正在其他订单中使用':'优惠券状态不可用');
    if(!t)return '优惠券不可用';
    if(!Number.isSafeInteger(Number(ctx.term))||Number(ctx.term)<1||Number(ctx.term)>60||!Number.isFinite(Number(ctx.rent))||Number(ctx.rent)<=0)return '请先确认方案价格';
    if(t.customer_scope==='NEW'&&!ctx.first_purchase)return '仅限首次租仓';
    if(t.customer_scope==='RENEWAL'&&!ctx.renewal)return '仅限续租使用';
    if(Number(ctx.term||0)<Number(t.min_term_months||0))return `租满${t.min_term_months}个月可使用`;
    if(t.coupon_type==='RENT_CASH'&&Number(ctx.rent||0)<Number(t.min_rent_amount||0))return `整期租金满¥${Number(t.min_rent_amount).toLocaleString()}可使用`;
    return '';
  }
  function entries(ctx){return wallet().map(row=>{const t=TEMPLATES[row.coupon_id];const why=reason(t,ctx,row);return {...row,status:effectiveStatus(row),template:t,eligible:!why,ineligible_reason:why||''}})}
  function selection(){return read(SELECT_KEY,{mode:'auto',coupon_id:null})}
  function setSelection(mode,coupon_id){const s={mode:mode||'auto',coupon_id:coupon_id||null,updated_at:now()};write(SELECT_KEY,s);return s}
  function rentCandidates(ctx){return entries(ctx).filter(x=>x.eligible&&x.template.coupon_type==='RENT_CASH')}
  function best(ctx){const list=rentCandidates(ctx).sort((a,b)=>Number(b.template.face_value)-Number(a.template.face_value));return list[0]||null}
  function selected(ctx){const s=selection();if(s.mode==='none')return null;if(s.mode==='manual')return rentCandidates(ctx).find(y=>y.coupon_id===s.coupon_id)||null;return best(ctx)}
  function applyToSnapshot(base){
    if(!base||!Number(base.term_months)||!Number(base.total_rent))return base;
    const ctx={term:Number(base.term_months),rent:Number(base.total_rent),first_purchase:isFirstPurchaseContext(),renewal:false,recover_order_no:recoverableLockOrder(base)}; // H01-007-S2 D-06
    const c=selected(ctx);const discount=c?Math.min(Number(c.template.face_value||0),Number(base.total_rent||0)):0;
    const after=Math.max(0,Number(base.total_rent||0)-discount);
    return {...base,coupon_customer_first_purchase:ctx.first_purchase,coupon_id:c?.coupon_id||null,user_coupon_id:c?.user_coupon_id||null,coupon_name:c?.template.coupon_name||'',coupon_type:c?.template.coupon_type||'',coupon_discount_amount:discount,rent_before_coupon:Number(base.total_rent||0),rent_after_coupon:after,management_fee_discount:0,service_benefit_amount:0,total_benefit_amount:discount,benefit_ids:c?[c.coupon_id]:[],upfront_payable:after+Number(base.deposit||0)+Number(base.management_fee||0),coupon_applied:Boolean(c),coupon_applied_at:now()};
  }
  function readSnapshot(){return read(PRICE_SNAPSHOT_KEY,{})}
  function couponContextFromSnapshot(s){return {term:Number(s?.term_months||0),rent:Number(s?.total_rent||0),first_purchase:isFirstPurchaseContext(),renewal:false,recover_order_no:recoverableLockOrder(s)}} // H01-007-S2 D-06
  function validateSnapshotCoupon(s,ctx={}){
    if(!s?.coupon_applied)return {valid:true,reason:'NO_COUPON'};
    if(s.coupon_customer_first_purchase!==true||ctx.firstPurchase===false||!isNewCustomer())return {valid:false,reason:'CUSTOMER_NOT_ELIGIBLE'};
    const row=wallet().find(x=>x.user_coupon_id===s.user_coupon_id&&x.coupon_id===s.coupon_id);
    const t=TEMPLATES[s.coupon_id];
    if(!row||!t||t.coupon_type!=='RENT_CASH')return {valid:false,reason:'COUPON_NOT_FOUND'};
    const recover=recoverableLockOrder(s);const rowStatus=effectiveStatus(row); // H01-007-S2 D-06
    if(rowStatus!=='CLAIMED'&&!lockOwnedBy(row,recover))return {valid:false,reason:rowStatus==='LOCKED'?'COUPON_LOCKED_BY_OTHER_ORDER':'COUPON_EXPIRED_OR_USED'};
    const active={term:Number(s.term_months),rent:Number(s.total_rent),first_purchase:true,renewal:false,recover_order_no:recover};
    if(reason(t,active,row))return {valid:false,reason:'COUPON_RULE_MISMATCH'};
    if(selected(active)?.user_coupon_id!==row.user_coupon_id)return {valid:false,reason:'COUPON_SELECTION_CHANGED'};
    if(Number(s.coupon_discount_amount)!==Math.min(Number(t.face_value),Number(s.total_rent))||s.coupon_type!==t.coupon_type||s.coupon_name!==t.coupon_name)return {valid:false,reason:'COUPON_AMOUNT_MISMATCH'};
    return {valid:true,reason:'OK'};
  }
  function money(v){return `¥${Math.round(Number(v||0)).toLocaleString()}`}
  function page(){return (location.pathname.split('/').pop()||'').toLowerCase()}
  function addHeadStyle(){if(document.getElementById('coupon-v1-runtime-style'))return;const st=document.createElement('style');st.id='coupon-v1-runtime-style';st.textContent='.coupon-v1-hidden{display:none!important}';document.head.appendChild(st)}
  function estimatorInit(){
    let last='';
    function sync(){
      const s5=document.querySelector('#s5');if(!s5||!s5.classList.contains('active'))return;
      // Demo presentation: every new customer reaching S5 sees the offer.
      // Requirement snapshots, entry paths and term selection do not gate it.
      // Granting and actual coupon eligibility still use the existing rules.
      ensureAcquisitionWallet();
      const key='S5_OFFER';
      let el=document.getElementById('couponEstimateGrantV1');
      if(!el){el=document.createElement('div');el.id='couponEstimateGrantV1';el.className='coupon-v1-banner';const anchor=s5.querySelector('.usage-summary')||s5.firstElementChild;anchor?.insertAdjacentElement('afterend',el)}
      if(el&&last!==key){el.innerHTML='<details><summary><span class="coupon-v1-title">已获得 ¥200 新客租仓券</span><span class="coupon-v1-disclosure-label">优惠说明 ›</span></summary><div class="coupon-v1-ey">估算完成优惠</div><p class="coupon-v1-desc">下单满足条件时会自动使用最优优惠；12个月方案还可使用 ¥300 长租券。</p></details>';last=key}
    }
    new MutationObserver(sync).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','style'],childList:true});setTimeout(sync,80);setTimeout(sync,500)
  }
  function injectU01Panel(){
    if(isFirstPurchaseContext())ensureAcquisitionWallet();
    const holder=document.querySelector('.unified-price');if(!holder)return;
    let panel=document.getElementById('couponU01PanelV1');if(!panel){panel=document.createElement('div');panel.id='couponU01PanelV1';panel.className='coupon-v1-panel';const box=holder.querySelector('.totalbox');holder.insertBefore(panel,box)}
    function sync(){
      const base=typeof window.currentPriceSnapshot==='function'?window.currentPriceSnapshot():readSnapshot();
      if(!base||!Number(base.term_months)){panel.classList.add('coupon-v1-hidden');return}
      const applied=applyToSnapshot(base);write(PRICE_SNAPSHOT_KEY,applied);panel.classList.remove('coupon-v1-hidden');
      const d=Number(applied.coupon_discount_amount||0);panel.innerHTML=d?`<div class="coupon-v1-row"><span>优惠券 · ${applied.coupon_name}</span><b class="coupon-v1-discount">-${money(d)}</b></div><div class="coupon-v1-row"><span>优惠后租金</span><b class="coupon-v1-after">${money(applied.rent_after_coupon)}</b></div><div class="coupon-v1-meta"><span>${selection().mode==='auto'?'已自动使用最优优惠':'已按您的选择使用优惠'}</span><button class="coupon-v1-link" id="couponChangeV1" type="button">更换优惠券 ›</button></div>`:`<div class="coupon-v1-row"><span>优惠券</span><b>暂不使用</b></div><div class="coupon-v1-meta"><span>您可以选择可用优惠券</span><button class="coupon-v1-link" id="couponChangeV1" type="button">选择优惠券 ›</button></div>`;
      const payable=document.getElementById('initialPayable'),formula=document.getElementById('payableFormula');const payableText=money(applied.upfront_payable),formulaText=d?`优惠后租金 ${money(applied.rent_after_coupon)} + 押金 ${money(applied.deposit)} + 管理费 ${money(applied.management_fee)}`:`整期租金 ${money(applied.total_rent)} + 押金 ${money(applied.deposit)} + 管理费 ${money(applied.management_fee)}`;if(payable&&payable.textContent!==payableText)payable.textContent=payableText;if(formula&&formula.textContent!==formulaText)formula.textContent=formulaText;
      const ch=document.getElementById('couponChangeV1');if(ch)ch.onclick=()=>{try{const returnUrl=new URL(location.href);if(applied&&applied.term_months)returnUrl.searchParams.set('term',String(applied.term_months));localStorage.setItem('mini_koala_coupon_return_href_v1',returnUrl.href)}catch(e){}location.href='mini_storage_coupon_select_c02_v1.html?return=u01'};
    }
    if(typeof window.persistPriceSnapshot==='function'){const orig=window.persistPriceSnapshot;window.persistPriceSnapshot=function(){const base=orig();const applied=applyToSnapshot(base);if(applied)write(PRICE_SNAPSHOT_KEY,applied);return applied}}
    const target=document.getElementById('initialPayable')||holder;new MutationObserver(()=>setTimeout(sync,0)).observe(target,{subtree:true,childList:true,characterData:true});sync();setTimeout(sync,120)
  }
  function injectQuote(){
    if(window.MINI_KOALA_PRICE_GATE_STATUS?.valid!==true)return;
    const s=readSnapshot();if(!s||!s.coupon_applied||!validateSnapshotCoupon(s,{firstPurchase:true}).valid)return;const totalRow=document.getElementById('totalRow')?.closest('.row');if(totalRow&&!document.getElementById('couponQ01RowV1')){const a=document.createElement('div');a.className='row coupon-v1-inline-row';a.id='couponQ01RowV1';a.innerHTML=`<span>优惠券 · ${s.coupon_name}</span><b class="coupon-v1-discount">-${money(s.coupon_discount_amount)}</b>`;totalRow.insertAdjacentElement('afterend',a);const b=document.createElement('div');b.className='row coupon-v1-inline-row';b.innerHTML=`<span>优惠后租金</span><b>${money(s.rent_after_coupon)}</b>`;a.insertAdjacentElement('afterend',b)}
    const ip=document.getElementById('initialPayableRow');if(ip)ip.textContent=money(s.upfront_payable);const br=document.getElementById('payableBreakdown');if(br)br.textContent=`优惠后租金 ${money(s.rent_after_coupon)} + 押金 ${money(s.deposit)} + 管理费 ${money(s.management_fee)}`;
    const save=document.getElementById('save');if(save)save.addEventListener('click',()=>setTimeout(()=>{const q=read(QUOTE_KEY,{});if(q&&q.quote_id&&validateSnapshotCoupon(s,{firstPurchase:true}).valid&&q.store_id===s.store_id&&q.size_option_id===s.size_option_id&&Number(q.term_months)===Number(s.term_months))write(QUOTE_KEY,{...q,coupon_id:s.coupon_id,user_coupon_id:s.user_coupon_id,coupon_name:s.coupon_name,coupon_type:s.coupon_type,coupon_discount_amount:s.coupon_discount_amount,rent_before_coupon:s.total_rent,rent_after_coupon:s.rent_after_coupon,total_benefit_amount:s.total_benefit_amount,upfront_payable:s.upfront_payable,initial_payable:s.upfront_payable})},20));
  }
  function injectOrder(){
    if(window.MINI_KOALA_PRICE_GATE_STATUS?.valid!==true)return;
    const s=readSnapshot();if(!s||!s.coupon_applied||!validateSnapshotCoupon(s,{firstPurchase:true}).valid)return;const rent=document.getElementById('rentFee')?.closest('.row');if(rent&&!document.getElementById('couponO01RowV1')){const a=document.createElement('div');a.className='row coupon-v1-inline-row';a.id='couponO01RowV1';a.innerHTML=`<span>优惠券 · ${s.coupon_name}</span><b class="coupon-v1-discount">-${money(s.coupon_discount_amount)}</b>`;rent.insertAdjacentElement('afterend',a);const b=document.createElement('div');b.className='row coupon-v1-inline-row';b.innerHTML=`<span>优惠后租金</span><b>${money(s.rent_after_coupon)}</b>`;a.insertAdjacentElement('afterend',b)}
    const total=document.getElementById('payableTotal');if(total)total.textContent=money(s.upfront_payable);const pay=document.getElementById('pay');if(pay)pay.textContent=`确认并支付 ${money(s.upfront_payable)}`;
    const repo=window.MINI_STORAGE_REPO_V242;if(repo&&typeof repo.saveCurrent==='function'&&!repo.__couponWrappedV1){const orig=repo.saveCurrent.bind(repo);repo.saveCurrent=function(o){if(o&&validateSnapshotCoupon(s,{firstPurchase:true}).valid&&o.store_id===s.store_id&&o.size_option_id===s.size_option_id&&String(o.representative_unit_no||o.unit_id||'')===String(s.representative_unit_no)&&Number(o.term_months)===Number(s.term_months)){o={...o,coupon_id:s.coupon_id,user_coupon_id:s.user_coupon_id,coupon_name:s.coupon_name,coupon_type:s.coupon_type,coupon_discount_amount:s.coupon_discount_amount,rent_before_coupon:s.total_rent,rent_after_coupon:s.rent_after_coupon,total_benefit_amount:s.total_benefit_amount,payable_total:s.upfront_payable};const rows=wallet();const ix=rows.findIndex(x=>x.user_coupon_id===s.user_coupon_id);if(ix>=0){rows[ix]={...rows[ix],status:'LOCKED',locked_order_id:o.order_no,applied_quote_id:null};saveWallet(rows)}}return orig(o)};repo.__couponWrappedV1=true}
  }
  function injectMine(){ensureAcquisitionWallet();const menu=document.querySelector('.section .menu');if(!menu||document.getElementById('myCouponsV1'))return;const btn=document.createElement('button');btn.id='myCouponsV1';btn.className='coupon-v1-wallet-entry';const usable=wallet().filter(x=>effectiveStatus(x)==='CLAIMED').length;btn.innerHTML=`我的优惠券<span>${usable?`${usable}张可查看`:'暂无可用优惠'}</span>`;const orders=document.getElementById('myOrders');(orders||menu.lastElementChild)?.insertAdjacentElement('afterend',btn);btn.onclick=()=>location.href='mini_storage_coupon_wallet_c01_v1.html'}
  function injectRenewal(){
    ensureRenewalWallet();const form=document.getElementById('renewForm');if(!form)return;let box=document.getElementById('renewCouponV1');if(!box){box=document.createElement('div');box.id='renewCouponV1';box.className='coupon-v1-renew';const notice=form.querySelector('.notice');notice?.insertAdjacentElement('afterend',box)}
    function selectedMonths(){return Number(document.getElementById('months')?.value||6)}
    function syncBox(){const m=selectedMonths();box.innerHTML=m>=6?'<strong>续租满6个月可用 ¥150 续租券</strong><span>报价确认时自动使用，不影响当前租约。</span>':'<strong>续租满6个月可使用 ¥150 续租券</strong><span>当前租期未达到使用条件。</span>'}
    ['click','input','change'].forEach(evt=>form.addEventListener(evt,()=>setTimeout(syncBox,0)));syncBox();
    const repo=window.MINI_STORAGE_REPO_V242;if(repo&&typeof repo.saveRenewal==='function'&&!repo.__renewCouponWrappedV1){const orig=repo.saveRenewal.bind(repo);repo.saveRenewal=function(r){if(r&&r.status==='QUOTE_READY'&&Number(r.months)>=6&&!r.coupon_id&&wallet().some(x=>x.coupon_id==='CPN-004'&&effectiveStatus(x)==='CLAIMED')){const before=Number(r.quote_total||0),uc=wallet().find(x=>x.coupon_id==='CPN-004'&&effectiveStatus(x)==='CLAIMED');r={...r,quote_total_before_coupon:before,coupon_id:'CPN-004',user_coupon_id:uc?.user_coupon_id||null,coupon_name:TEMPLATES['CPN-004'].coupon_name,coupon_discount_amount:150,quote_total:Math.max(0,before-150),total_benefit_amount:150}}if(r&&r.status==='COMPLETED'&&r.user_coupon_id){const rows=wallet(),ix=rows.findIndex(x=>x.user_coupon_id===r.user_coupon_id);if(ix>=0){rows[ix]={...rows[ix],status:'REDEEMED',redeemed_order_id:r.order_no||null,redeemed_time:now()};saveWallet(rows)}}return orig(r)};repo.__renewCouponWrappedV1=true}
    const status=document.getElementById('statusBody');if(status){let decorating=false;new MutationObserver(()=>{if(decorating)return;const orderNo=new URLSearchParams(location.search).get('orderNo')||'';let req=null;try{req=repo?.findRenewal?repo.findRenewal(orderNo):null}catch(e){}if(req?.coupon_id&&req.status==='QUOTE_READY'&&!status.dataset.couponDecorated){decorating=true;status.dataset.couponDecorated='1';status.innerHTML=`<b>续租报价已生成</b><br>${req.months}个月 · 优惠前 ${money(req.quote_total_before_coupon)}<br>${req.coupon_name} -${money(req.coupon_discount_amount)} · <span class="total">优惠后 ${money(req.quote_total)}</span><div class="actions" style="margin-top:10px"><button class="btn primary" id="confirmRenew">查看并确认支付 ${money(req.quote_total)}</button></div>`;const b=document.getElementById('confirmRenew');if(b&&typeof window.openRenewPayment==='function')b.onclick=window.openRenewPayment;decorating=false}}, {childList:true,subtree:true})}
  }
  function injectDemoHub(){const grid=document.querySelector('.professional');if(!grid||document.getElementById('couponDemoToolV1'))return;const a=document.createElement('a');a.id='couponDemoToolV1';a.className='tool';a.href='mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html?store=MK_BJ_2CDB7BEE&unit=BJ0112S01A009&sizeOption=MK_BJ_2CDB7BEE__4.72&target=4.8&term=6&source=coupon_demo';a.innerHTML='<b>优惠券与权益专项</b><span>查看估算获券、自动最优券、优惠后租金、券包、支付核销与续租券。</span>';grid.appendChild(a)}
  // H01-007-P1: settle only a confirmed paid order; clean unused locks owned by that order.
  // No lock timeout, cross-order release, refund or new eligibility rule is introduced.
  function syncPaymentResult(){
    const repo=window.MINI_STORAGE_REPO_V242;let o={};
    try{o=repo?.getCurrent?repo.getCurrent():currentOrder()}catch(e){o=currentOrder()}
    if(!o)return;
    const rows=wallet(),ix=o.user_coupon_id?rows.findIndex(x=>x.user_coupon_id===o.user_coupon_id):-1;
    if(isPaidRental(o)){
      const used=ix>=0?rows[ix]:null;
      const mayRedeem=!!(used&&(used.status==='CLAIMED'||lockOwnedBy(used,o.order_no)));
      const alreadyRedeemed=!!(used&&used.status==='REDEEMED'&&used.redeemed_order_id===o.order_no);
      if(mayRedeem)rows[ix]={...used,status:'REDEEMED',locked_order_id:null,applied_quote_id:null,redeemed_order_id:o.order_no,redeemed_time:now()};
      for(let i=0;i<rows.length;i++){
        if(i===ix&&(mayRedeem||alreadyRedeemed))continue;
        const row=rows[i],t=TEMPLATES[row.coupon_id],ownLock=lockOwnedBy(row,o.order_no);
        // Other-order LOCKED rows and terminal states are preserved verbatim (D-13 remains deferred).
        if(ownLock){
          rows[i]=t?.customer_scope==='NEW'
            ? {...row,status:'INVALID',invalid_reason:'NEW_CUSTOMER_COMPLETED',locked_order_id:null,applied_quote_id:null}
            : {...row,status:'CLAIMED',locked_order_id:null,applied_quote_id:null};
        }else if(t?.customer_scope==='NEW'&&row.status==='CLAIMED'){
          rows[i]={...row,status:'INVALID',invalid_reason:'NEW_CUSTOMER_COMPLETED'};
        }
      }
      // Preserve the existing selected-coupon payment breakdown; never reprice the order here.
      if(mayRedeem||alreadyRedeemed){
        const payment=repo?.getPayments?.().find(x=>x.order_no===o.order_no&&x.type==='INITIAL'&&x.status==='PAID');
        if(payment&&repo?.addPayment){repo.addPayment({...payment,amount:Number(o.payable_total||0),breakdown:{...payment.breakdown,rent:Number(o.rent_after_coupon||o.total_price||0),rent_before_coupon:Number(o.rent_before_coupon||o.total_price||0),coupon_discount_amount:Number(o.coupon_discount_amount||0),deposit:Number(o.deposit_amount||0),management_fee:Number(o.management_fee||0)}})}
      }
      saveWallet(rows);
    }else if(['PAYMENT_FAILED','INVENTORY_CHANGED'].includes(o.status)&&ix>=0&&lockOwnedBy(rows[ix],o.order_no)){
      rows[ix]={...rows[ix],status:'CLAIMED',locked_order_id:null};saveWallet(rows);
    }
  }
  function init(){addHeadStyle();const p=page(),has=s=>!!document.querySelector(s);if(p.includes('space_decision_assistant')||(has('#s1')&&has('#s5')&&has('#usageActions')))estimatorInit();else if(p.includes('unit_detail_u01')||(has('#contractTotal')&&has('#initialPayable')&&has('#saveQuote')))injectU01Panel();else if(p.includes('quote_q01')||(has('#quoteId')&&has('#initialPayableRow')))injectQuote();else if(p.includes('order_o01')||(has('#payableTotal')&&has('#agreeContract')))injectOrder();else if(p.includes('order_o02')||(has('#statusIcon')&&has('#orderNo')))syncPaymentResult();else if(p.includes('mine_m01')||has('#primaryAssets'))injectMine();else if(p.includes('renew_rn01')||has('#renewForm'))injectRenewal();else if(p.includes('product_demo_hub')||has('.professional'))injectDemoHub()}
  window.MINI_KOALA_COUPON_V1={TEMPLATES,WALLET_KEY,SELECT_KEY,PRICE_SNAPSHOT_KEY,wallet,grant,ensureAcquisitionWallet,ensureRenewalWallet,entries,reason,selection,setSelection,best,selected,applyToSnapshot,readSnapshot,couponContextFromSnapshot,isNewCustomer,isPaidRental,paidRentalHistory,recoverableLockOrder,lockOwnedBy,ORDER_HISTORY_KEY,isFirstPurchaseContext,effectiveStatus,validExpiry,validateSnapshotCoupon,syncPaymentResult,money};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else setTimeout(init,0);
})();
