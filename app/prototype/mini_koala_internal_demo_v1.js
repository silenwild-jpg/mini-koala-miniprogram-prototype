(function(){
  'use strict';
  const STORY_KEY='mini_koala_internal_demo_story_v1';
  const PAY_RESULT='mini_storage_payment_result_current';
  const COUPON_WALLET='mini_koala_coupon_wallet_v1';
  const COUPON_SELECT='mini_koala_coupon_selection_v1';
  const RETURN_HREF='mini_koala_coupon_return_href_v1';
  const HUB='product_demo_hub_v1.html';
  const STORIES={
    new_rental:{title:'Story 01｜第一次租仓',summary:'不知道多大 → 估算 → 匹配门店 → 仓位 → 优惠 → 下单 → 支付',steps:[
      ['新用户首页','从双任务入口理解产品主任务','home_new'],
      ['完成空间估算','约4.8m³ · 6个月，并获得新客券','est_recommend'],
      ['匹配门店','需求、位置、租期连续带回门店列表','s01_estimated'],
      ['门店与仓位','查看匹配仓位、库存与已售出容量','s02_matched'],
      ['确认仓位方案','库存紧迫感 + 自动使用¥200新客券','u01_coupon'],
      ['确认订单','优惠后一次支付¥3,863','o01_coupon'],
      ['支付成功','优惠券核销，进入待使用','o02_paid']
    ]},
    stores_first:{title:'Story 02｜先找附近门店',summary:'先比较位置和门店，再补估算需求',steps:[
      ['附近门店','未关联需求，先按位置和服务比较','s01_browse'],
      ['门店详情','先看门店、仓位和服务信息','s02_browse'],
      ['从门店进入估算','不知道大小时补充估算','est_from_s02'],
      ['带需求返回门店','约4.8m³ · 6个月重新匹配','s01_estimated'],
      ['选择匹配仓位','进入具体门店和仓位方案','u01_coupon']
    ]},
    urgency:{title:'Story 03｜库存紧迫感促成交',summary:'匹配库存稀缺 → 同容量仅剩 → 已售出 / 已售罄',steps:[
      ['门店匹配库存','匹配仓位仅剩1个','s01_estimated'],
      ['门店详情','同容量仅剩 + 正在查看人数','s02_matched'],
      ['仓位方案','库存紧张 + 复核倒计时','u01_coupon'],
      ['其他容量已售出','门店仍可租，但部分容量已售出','s02_matched'],
      ['整店已售罄','只保留恢复路径，不继续推动无效下单','s02_soldout']
    ]},
    coupon:{title:'Story 04｜优惠券与权益',summary:'获券 → 自动最优券 → 更换 → Quote锁定 → 支付核销',steps:[
      ['估算完成获券','自动获得¥200新客券','est_recommend'],
      ['自动使用最优优惠','6个月方案自动使用¥200','u01_coupon'],
      ['选择优惠券','查看¥300长租券不可用原因','c02'],
      ['保存方案','Quote保持-¥200与¥3,863','q01_coupon'],
      ['确认订单','订单继续读取同一优惠结果','o01_coupon'],
      ['支付成功核销','LOCKED → REDEEMED','o02_paid'],
      ['我的优惠券','查看可用 / 已使用 / 已失效','c01']
    ]},
    lifecycle:{title:'Story 05｜支付后完整生命周期',summary:'待使用 → 用仓中 → 即将到期 → 续租 / 退租 / 押金',steps:[
      ['待使用','已支付、尚未到起租日','home_pending_use'],
      ['当前订单','查看待使用订单资产','order_pending_use'],
      ['用仓中','正式进入租赁服务期','mine_active'],
      ['即将到期','续租 / 退租成为主任务','home_ending'],
      ['续租','展示¥150续租券','renew'],
      ['退租','申请与结算说明','exit'],
      ['押金','验仓后的押金处理状态','deposit']
    ]},
    exception:{title:'Story 06｜异常与恢复',summary:'无匹配 → 已售罄 → 支付失败 → 库存变化 → 优惠限制',steps:[
      ['需求无匹配','大空间需求无完全匹配，提供替代路径','s01_nomatch'],
      ['门店已售罄','不显示无效估算/预约入口','s02_soldout'],
      ['支付失败','保留订单恢复路径，优惠券释放','o02_failed'],
      ['库存发生变化','提示返回选择相近仓位','o02_inventory_changed'],
      ['优惠条件限制','6个月无法使用12个月长租券','c02']
    ]}
  };
  function read(k,f){try{const x=localStorage.getItem(k);return x?JSON.parse(x):f}catch(e){return f}}
  function write(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function clearAll(){try{localStorage.clear()}catch(e){};try{sessionStorage.clear()}catch(e){}}
  function loadScript(src,cb){const exists=[...document.scripts].some(s=>s.src&&s.src.endsWith(src));if(exists){cb&&cb();return}const s=document.createElement('script');s.src=src;s.onload=()=>cb&&cb();document.head.appendChild(s)}
  function ensureDeps(cb){if(window.MINI_KOALA_DEMO_V2&&window.MINI_KOALA_COUPON_V1){cb();return}const afterPricing=()=>{const afterD=()=>{if(window.MINI_KOALA_COUPON_V1){cb();return}loadScript('mini_storage_coupon_benefit_v1.js',cb)};if(window.MINI_KOALA_DEMO_V2)afterD();else loadScript('mini_storage_demo_fixture_v2.js',afterD)};if(window.MINI_STORAGE_MASTER_V222)afterPricing();else loadScript('mini_storage_business_ssot_v274.js',afterPricing)}
  function withStory(url,id,index){const u=new URL(url,location.href);u.searchParams.set('source','internal_demo');u.searchParams.set('demoStory',id);u.searchParams.set('demoStep',String(index));return u.href}
  function applyCouponSnapshot(){const D=window.MINI_KOALA_DEMO_V2,C=window.MINI_KOALA_COUPON_V1;if(!D||!C)return null;C.ensureAcquisitionWallet();const s=C.applyToSnapshot(D.priceSnapshot());localStorage.setItem(D.K.price,JSON.stringify(s));return s}
  function applyCouponQuote(s,previous){const D=window.MINI_KOALA_DEMO_V2,q=read(D.K.quote,{});if(!q.quote_id||!s)return null;const same=previous&&previous.store_id===s.store_id&&previous.unit_id===s.unit_id&&Number(previous.term_months)===Number(s.term_months);const updated={...q,...(same?{quote_id:previous.quote_id,created_at:previous.created_at}:{}),coupon_id:s.coupon_id,user_coupon_id:s.user_coupon_id,coupon_name:s.coupon_name,coupon_type:s.coupon_type,coupon_discount_amount:s.coupon_discount_amount,rent_before_coupon:s.total_rent,rent_after_coupon:s.rent_after_coupon,total_benefit_amount:s.total_benefit_amount,upfront_payable:s.upfront_payable,initial_payable:s.upfront_payable,price_snapshot:s,pricing_model_version:s.pricing_model_version};write(D.K.quote,updated);return updated}
  function patchCouponOrder(status){const D=window.MINI_KOALA_DEMO_V2,C=window.MINI_KOALA_COUPON_V1,previousQuote=read(D.K.quote,{});D.seed('pending_payment');const s=applyCouponSnapshot();applyCouponQuote(s,previousQuote);let o=read(D.K.order,{});const uc=C.wallet().find(x=>x.coupon_id===s.coupon_id)||{};o={...o,order_no:'O-DEMO-COUPON',status:'PENDING_PAYMENT',payment_status:'PAYING',inventory_status:'AWAITING_PAYMENT',detail_state:'upcoming',lifecycle_state:'upcoming',coupon_id:s.coupon_id,user_coupon_id:uc.user_coupon_id,coupon_name:s.coupon_name,coupon_type:s.coupon_type,coupon_discount_amount:s.coupon_discount_amount,rent_before_coupon:s.total_rent,rent_after_coupon:s.rent_after_coupon,total_benefit_amount:s.total_benefit_amount,payable_total:s.upfront_payable,initial_payable:s.upfront_payable,upfront_payable:s.upfront_payable,paid_total:0};
    localStorage.setItem(D.K.order,JSON.stringify(o));localStorage.setItem(D.K.hist,JSON.stringify([o]));
    const rows=C.wallet();const ix=rows.findIndex(x=>x.user_coupon_id===uc.user_coupon_id);if(ix>=0){rows[ix]={...rows[ix],status:'LOCKED',locked_order_id:o.order_no};localStorage.setItem(COUPON_WALLET,JSON.stringify(rows))}
    localStorage.setItem(PAY_RESULT,JSON.stringify({order_no:o.order_no,status:status,paid_amount:status==='PAID'?s.upfront_payable:0,processed_at:new Date().toISOString()}));
    if(status==='PAID'){
      const paid={...o,status:'PAID',payment_status:'PAID',actual_unit_id:o.unit_id,identity_verification_status:'UNVERIFIED',paid_total:s.upfront_payable,price_snapshot:s};
      localStorage.setItem(D.K.order,JSON.stringify(paid));localStorage.setItem(D.K.hist,JSON.stringify([paid]));
      C.syncPaymentResult();return paid;
    }
    return o;
  }
  function route(action,id,index){const D=window.MINI_KOALA_DEMO_V2,C=window.MINI_KOALA_COUPON_V1,P=D.P,K=D.K,canon=D.C;let url='';
    if(action==='home_new'){D.seed('new');url=`${P.HOME}?state=new&loc=unknown`;}
    else if(action==='est_recommend'){D.seed('estimated');C.ensureAcquisitionWallet();url=`${P.EST}?entry=resume_recommend&target=${canon.target}&min=${canon.min}&max=${canon.max}&term=${canon.term}&travel=${canon.travel}&searchOriginKey=${canon.origin}`;}
    else if(action==='s01_estimated'){D.seed('estimated');C.ensureAcquisitionWallet();url=`${P.S01}?state=estimated&target=${canon.target}&min=${canon.min}&max=${canon.max}&term=${canon.term}&travel=${canon.travel}&searchOriginKey=${canon.origin}&sort=recommended`;}
    else if(action==='s01_browse'){D.seed('new');url=`${P.S01}?state=browse&entry=browse_nearby&travel=${canon.travel}&searchOriginKey=${canon.origin}`;}
    else if(action==='s01_nomatch'){D.seed('estimated');localStorage.setItem(K.req,JSON.stringify(D.requirement({target_volume:60,min_volume:55,max_volume:70})));url=`${P.S01}?state=nomatch&target=60&min=55&max=70&term=${canon.term}&travel=${canon.travel}&searchOriginKey=${canon.origin}&sort=recommended`;}
    else if(action==='s02_matched'){D.seed('estimated');C.ensureAcquisitionWallet();url=`${P.S02}?store=${canon.store_id}&state=matched&target=${canon.target}&min=${canon.min}&max=${canon.max}&term=${canon.term}&travel=${canon.travel}&searchOriginKey=${canon.origin}`;}
    else if(action==='s02_browse'){D.seed('new');url=`${P.S02}?store=${canon.store_id}&state=browse&term=${canon.term}&travel=${canon.travel}&searchOriginKey=${canon.origin}`;}
    else if(action==='s02_soldout'){D.seed('new');url=`${P.S02}?store=MK_BJ_F2215896&state=browse&target=${canon.target}&min=${canon.min}&max=${canon.max}&term=${canon.term}&travel=${canon.travel}&searchOriginKey=${canon.origin}&inventoryStatus=soldout&inventoryScenario=soldout`;}
    else if(action==='est_from_s02'){D.seed('estimated');url=`${P.EST}?returnTo=S02&returnStore=${canon.store_id}&store=${canon.store_id}&target=${canon.target}&term=${canon.term}`;}
    else if(action==='u01_coupon'){D.seed('estimated');applyCouponSnapshot();url=`${P.U01}?store=${canon.store_id}&unit=${canon.unit_id}&sizeOption=${canon.size_option_id}&representativeUnit=${canon.unit_id}&actualUnit=${canon.unit_id}&inventoryIdentity=ACTUAL_UNIT&target=${canon.target}&min=${canon.min}&max=${canon.max}&term=${canon.term}`;}
    else if(action==='c02'){D.seed('estimated');applyCouponSnapshot();localStorage.setItem(RETURN_HREF,withStory(P.U01,id,index));url='mini_storage_coupon_select_c02_v1.html';}
    else if(action==='c01'){C.ensureAcquisitionWallet();url='mini_storage_coupon_wallet_c01_v1.html';}
    else if(action==='q01_coupon'){D.seed('quoted');const s=applyCouponSnapshot();applyCouponQuote(s);url=`${P.Q01}?store=${canon.store_id}&unit=${canon.unit_id}&sizeOption=${canon.size_option_id}&representativeUnit=${canon.unit_id}&actualUnit=${canon.unit_id}&inventoryIdentity=ACTUAL_UNIT&target=${canon.target}&volume=${canon.volume}&term=${canon.term}&monthly=${canon.monthly}&rentTotal=${canon.total}&deposit=${canon.deposit}&managementFee=${canon.fee}&initialPayable=${s.upfront_payable}&start=${D.scenarioFacts().start_date}&route=QUOTE_OPTIONAL&quoteStatus=active`;}
    else if(action==='o01_coupon'){const previousQuote=read(K.quote,{});D.seed('quoted');const s=applyCouponSnapshot();applyCouponQuote(s,previousQuote);url=`${P.O01}?store=${canon.store_id}&unit=${canon.unit_id}&sizeOption=${canon.size_option_id}&representativeUnit=${canon.unit_id}&actualUnit=${canon.unit_id}&inventoryIdentity=ACTUAL_UNIT&target=${canon.target}&volume=${canon.volume}&term=${canon.term}&monthly=${canon.monthly}&rentTotal=${canon.total}&deposit=${canon.deposit}&managementFee=${canon.fee}&initialPayable=${s.upfront_payable}&start=${D.scenarioFacts().start_date}&route=QUOTE_OPTIONAL&demoAutoAgree=1`;}
    else if(action==='o02_paid'){const o=patchCouponOrder('PAID');url=`${P.O02}?orderNo=${encodeURIComponent(o.order_no)}`;}
    else if(action==='o02_failed'){const o=patchCouponOrder('PAYMENT_FAILED');url=`${P.O02}?orderNo=${encodeURIComponent(o.order_no)}`;}
    else if(action==='o02_inventory_changed'){const o=patchCouponOrder('INVENTORY_CHANGED');url=`${P.O02}?orderNo=${encodeURIComponent(o.order_no)}`;}
    else if(action==='home_pending_use'){D.seed('pending_use');url=`${P.HOME}?state=active&loc=precise`;}
    else if(action==='order_pending_use'){D.seed('pending_use');const o=read(K.order,{});url=`${P.O03}?orderNo=${encodeURIComponent(o.order_no||'O-DEMO-PENDING-USE')}&state=pending_use`;}
    else if(action==='mine_active'){D.seed('active');url=P.M01;}
    else if(action==='home_ending'){D.seed('ending');url=`${P.HOME}?state=active&loc=precise`;}
    else if(action==='renew'){D.seed('ending');C.ensureRenewalWallet();const o=read(K.order,{});url=`${P.RN01}?orderNo=${encodeURIComponent(o.order_no||'O-DEMO-ENDING')}`;}
    else if(action==='exit'){D.seed('ending');const o=read(K.order,{});url=`${P.EX01}?orderNo=${encodeURIComponent(o.order_no||'O-DEMO-ENDING')}`;}
    else if(action==='deposit'){D.seed('exiting');const o=read(K.order,{});url=`${P.DP01}?orderNo=${encodeURIComponent(o.order_no||'O-DEMO-EXITING')}`;}
    else {D.seed('new');url=P.HOME+'?state=new&loc=unknown';}
    write(STORY_KEY,{id,step:index,updated_at:new Date().toISOString()});location.href=withStory(url,id,index);
  }
  function startStory(id){if(!STORIES[id])id='new_rental';clearAll();write(STORY_KEY,{id,step:0,started_at:new Date().toISOString()});ensureDeps(()=>route(STORIES[id].steps[0][2],id,0))}
  function goStep(id,index){const story=STORIES[id];if(!story)return;const i=Math.max(0,Math.min(index,story.steps.length-1));ensureDeps(()=>route(story.steps[i][2],id,i))}
  function resetStory(){const q=new URLSearchParams(location.search),id=q.get('demoStory')||read(STORY_KEY,{}).id||'new_rental';startStory(id)}
  function goHub(){location.href=HUB+'?fromStory=1'}
  function injectRibbon(){const q=new URLSearchParams(location.search),id=q.get('demoStory');if(!id||!STORIES[id]||document.getElementById('internalDemoRibbonV1'))return;const story=STORIES[id],i=Math.max(0,Math.min(Number(q.get('demoStep')||0),story.steps.length-1)),step=story.steps[i];write(STORY_KEY,{id,step:i,updated_at:new Date().toISOString()});
    const st=document.createElement('style');st.textContent=`#internalDemoRibbonV1{position:fixed;left:50%;top:0;transform:translateX(-50%);width:min(720px,calc(100% - 20px));z-index:9999;background:rgba(35,50,42,.96);color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:16px;box-shadow:0 12px 32px rgba(0,0,0,.22);padding:10px 12px;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}.idr-top{display:flex;align-items:center;justify-content:space-between;gap:10px}.idr-copy{min-width:0}.idr-copy b{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.idr-copy span{display:block;color:#C8D6CF;font-size:10px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.idr-actions{display:flex;gap:6px;flex:0 0 auto}.idr-actions button{height:32px;border-radius:9px;border:1px solid rgba(255,255,255,.22);background:transparent;color:#fff;font-size:10px;font-weight:800;padding:0 9px;cursor:pointer}.idr-actions .next{background:#fff;color:#2F6B4F}.idr-actions button:disabled{opacity:.35}.idr-menu{display:flex;gap:7px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.12)}.idr-menu button{border:0;background:transparent;color:#BFD0C7;font-size:9px;padding:0;cursor:pointer}.idr-progress{font-size:9px;color:#AFC2B8;margin-left:auto}@media(max-width:540px){#internalDemoRibbonV1{top:0;padding:9px}.idr-top{align-items:flex-start}.idr-copy span{max-width:190px}.idr-actions button{height:30px;padding:0 8px}.idr-actions .prev{display:none}}`;
    document.head.appendChild(st);const bar=document.createElement('div');bar.id='internalDemoRibbonV1';bar.innerHTML=`<div class="idr-top"><div class="idr-copy"><b>${story.title} · ${step[0]}</b><span>${step[1]}</span></div><div class="idr-actions"><button class="prev" ${i===0?'disabled':''}>上一步</button><button class="next">${i===story.steps.length-1?'完成':'下一步'}</button></div></div><div class="idr-menu"><button class="reset">重置本故事</button><button class="hub">返回 Demo Hub</button><span class="idr-progress">${i+1} / ${story.steps.length}</span></div>`;const host=document.querySelector('.screen.active')||document.querySelector('.page')||document.body;host.appendChild(bar);bar.style.marginTop='12px';bar.style.position='relative';bar.style.left='auto';bar.style.transform='none';bar.style.width='100%';bar.style.boxSizing='border-box';
    bar.querySelector('.prev').onclick=()=>goStep(id,i-1);bar.querySelector('.next').onclick=()=>{if(i===story.steps.length-1)goHub();else goStep(id,i+1)};bar.querySelector('.reset').onclick=resetStory;bar.querySelector('.hub').onclick=goHub;
    const support=document.getElementById('miniGlobalSupport');if(support)support.style.bottom='150px';
  }
  function init(){injectRibbon()}
  window.MINI_KOALA_INTERNAL_DEMO_V1={STORIES,STORY_KEY,startStory,goStep,resetStory,goHub,clearAll};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else setTimeout(init,0);
})();
