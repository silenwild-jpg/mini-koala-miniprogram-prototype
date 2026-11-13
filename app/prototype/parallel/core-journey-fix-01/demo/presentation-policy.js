(function(root){
  'use strict';
  function create({core,fixture,unitPolicy}){
    const whole=n=>Math.trunc(Number(n));
    // Public browsing uses the lowest available monthly rent under the current
    // lease discount table, without silently selecting a lease term for the user.
    function bestPublicTerm(){
      const rules=(fixture.pricing?.termRules||[]).filter(r=>Number.isInteger(Number(r.min))&&Number(r.min)>=1&&Number(r.min)<=60&&Number.isFinite(Number(r.factor))&&Number(r.factor)>0);
      const best=rules.sort((a,b)=>Number(a.factor)-Number(b.factor)||Number(a.min)-Number(b.min))[0];
      return best?Number(best.min):(fixture.pricing.homeReferenceTerm||12);
    }
    const money=n=>'¥'+whole(n).toLocaleString('zh-CN',{maximumFractionDigits:0});
    // One canonical store tag list for H01, S01, S02 and S5.
    // Promotion is an offer (not a service entitlement or an attribute).
    const promotionNames=new Set(['特价仓','双11大促','限时优惠','限时特价','优惠活动']);
    const attributeNames=new Set(['新开门店','24小时存取','24小时开放','全天监控','控温防潮','独立安防']);
    const typeOf=label=>promotionNames.has(label)?'promotion':attributeNames.has(label)?'attribute':'service';
    function tags(store,limit=Infinity){
      if(!store)return [];
      const values=[unitPolicy?.storePromotionTag?.(store),...(store.serviceTags||[])]
        .filter(t=>typeof t==='string'&&t.trim()).map(t=>t.trim());
      const seen=new Set(),arr=[];
      for(const label of values){
        if(seen.has(label))continue;seen.add(label);
        arr.push({label,type:typeOf(label),rank:arr.length});
      }
      const sorted=arr.sort((a,b)=>{
        const rank={promotion:0,service:1,attribute:2};
        return rank[a.type]-rank[b.type]||a.rank-b.rank;
      });
      // At most one promotion tag in the store listing card.
      let usedPromo=false;
      return sorted.filter(t=>{if(t.type!=='promotion')return true;if(usedPromo)return false;usedPromo=true;return true}).slice(0,limit)
        .map(({label,type})=>({label,type}));
    }
    // Detail adds visible S02 service candidates but shares taxonomy,
    // deduplication and ordering with H01, S01 and S5.
    function detailTags(store,limit=5){
      if(!store)return [];
      const extras=[...(store.serviceTags||[]),'到店搬运',...(store.facilities||[]),'装卸区域']
        .filter(v=>typeof v==='string'&&v.trim()&&!/24小时|全天存取|存取时间|独立仓/.test(v));
      return tags({...store,serviceTags:extras},limit);
    }
    function services(store,limit=2){return tags(store,limit).map(x=>x.label);}
    function price(ids){
      if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)throw Error('INVALID_PRESENTATION_IDS');
      const rows=ids.map(id=>fixture.units.find(u=>u.id===id));if(rows.some(x=>!x))throw Error('UNKNOWN_PRESENTATION_UNIT');
      const s=core.state(),r=s.requirement,termVisible=r.term_confirmed===true;
      // The computed term price is visible before phone verification; only core.quote() issues binding quotes.
      const amount=termVisible?core.amounts(ids,r.term_months):null;
      const value=amount?amount.rent_total:core.amounts(ids,bestPublicTerm()).monthly_average;
      return {kind:termVisible?'term':'reference',value,money:money(value),months:termVisible?r.term_months:null,caption:termVisible?'整期租金':'月租',suffix:termVisible?'/ '+r.term_months+'个月':'/月起',termLabel:termVisible?r.term_months+'个月整期':'/月起',average:amount?money(amount.monthly_average)+'/月 × '+r.term_months+'个月':'',amounts:amount};
    }
    function facts(ids){
      if(ids.length===1){const u=fixture.units.find(x=>x.id===ids[0]);if(u)return unitPolicy.facts(u);}
      return {promoLabel:'',inventoryLine:'',state:'N'};
    }
    function cubicReference(store){const term=bestPublicTerm();
      const rows=fixture.units.filter(u=>u.store_id===store.id&&core.available(u)&&Number(u.volume)>0);
      if(!rows.length)return null;
      const n=Math.min(...rows.map(u=>core.amounts([u.id],term).monthly_average/u.volume));
      return Number.isFinite(n)&&n>0?{value:Number(n.toFixed(2)),money:money(n),unit:'/m³/月起',basis:term+'个月折后最低立方月租'}:null;}
    return {price,facts,services,tags,detailTags,tagType:typeOf,cubicReference,bestPublicTerm,money,
      storePromotionTag:store=>unitPolicy?.storePromotionTag?.(store)||''};
  }

  // Shared promotion entitlement policy. Kept as a separate factory from
  // page presentation; the quote engine consumes this contract directly.
  const approvedStacks=new Set([
    'RENT_CASH_COUPON|TERM_DISCOUNT',
    'MOVING_SERVICE|RENT_CASH_COUPON',
    'MOVING_SERVICE|TERM_DISCOUNT'
  ]);
  const pendingStacks=new Set([
    'TERM_DISCOUNT|UNIT_SPECIAL_PRICE','RENT_CASH_COUPON|UNIT_SPECIAL_PRICE',
    'CAMPAIGN_FREE_TERM|RENT_CASH_COUPON','CAMPAIGN_FREE_TERM|TERM_DISCOUNT',
    'SALES_FREE_TERM|RENT_CASH_COUPON','SALES_FREE_TERM|TERM_DISCOUNT',
    'CAMPAIGN_FREE_TERM|UNIT_SPECIAL_PRICE','SALES_FREE_TERM|UNIT_SPECIAL_PRICE'
  ]);
  function createPromotionPolicy(){
    const key=(a,b)=>[String(a),String(b)].sort().join('|');
    function stacking(a,b){
      const k=key(a,b);
      if(a===b)return {status:'BLOCKED',allowed:false,reason:'DUPLICATE_BENEFIT_TYPE'};
      if(approvedStacks.has(k))return {status:'ALLOWED',allowed:true,reason:null};
      if(pendingStacks.has(k))return {status:'NEEDS_CONFIRMATION',allowed:false,reason:'BUSINESS_STACK_POLICY_UNCONFIRMED'};
      return {status:'NEEDS_CONFIRMATION',allowed:false,reason:'NO_APPROVED_STACK_POLICY'};
    }
    function evaluateCampaign(campaign,context={}){
      const reasons=[],today=String(context.today||''),unit=context.unit,store=context.store,term=Number(context.termMonths);
      if(!campaign||campaign.active!==true)reasons.push('INACTIVE');
      if(!today||!campaign?.from||!campaign?.until)reasons.push('DATE_CONTEXT_MISSING');
      else {if(campaign.from>today)reasons.push('NOT_STARTED');if(campaign.until<today)reasons.push('ENDED');}
      if(!unit||unit.id!==campaign?.unitId)reasons.push('UNIT_MISMATCH');
      if(!store||store.id!==campaign?.storeId||unit?.store_id!==store?.id)reasons.push('STORE_MISMATCH');
      if(unit&&Number(unit.revision)!==Number(campaign?.catalogRevision))reasons.push('CATALOG_REVISION_MISMATCH');
      if(context.available!==true)reasons.push('UNIT_UNAVAILABLE');
      if(!Number.isInteger(term)||term<1||term>60)reasons.push('TERM_REQUIRED');
      else if(term<Number(campaign?.minMonths)||term>Number(campaign?.maxMonths))reasons.push('TERM_INELIGIBLE');
      return {status:reasons.length?'INELIGIBLE':'ELIGIBLE',eligible:reasons.length===0,campaign_id:campaign?.id||null,reasons};
    }
    function transitionCoupon(coupon,next){
      const transitions={AVAILABLE:['SELECTED','EXPIRED','INVALID'],SELECTED:['AVAILABLE','LOCKED','EXPIRED','INVALID'],LOCKED:['AVAILABLE','REDEEMED','INVALID'],REDEEMED:[],EXPIRED:[],INVALID:[]};
      if(!coupon||!transitions[coupon.status]||!transitions[coupon.status].includes(next))throw Error('INVALID_COUPON_TRANSITION');
      return {...coupon,status:next};
    }
    return {stacking,evaluateCampaign,transitionCoupon};
  }
  root.SIM_PRESENTATION={create,createPromotionPolicy};
  if(typeof module==='object'&&module.exports)module.exports={create,createPromotionPolicy};
})(typeof window==='object'?window:globalThis);
