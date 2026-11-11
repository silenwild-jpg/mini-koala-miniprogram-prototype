(function(root){
  'use strict';
  function create({core,fixture,unitPolicy}){
    const whole=n=>Math.trunc(Number(n));
    const money=n=>'¥'+whole(n).toLocaleString('zh-CN',{maximumFractionDigits:0});
    // One canonical store tag list for H01, S01, S02 and S5.
    // Promotion is an offer (not a service entitlement or an attribute).
    const promotionNames=new Set(['特价仓','双11大促','限时优惠','限时特价','优惠活动']);
    const attributeNames=new Set(['新开门店','24小时存取','24小时开放','全天监控','控温防潮','独立安防']);
    const typeOf=label=>promotionNames.has(label)?'promotion':attributeNames.has(label)?'attribute':'service';
    function tags(store,limit=Infinity){
      if(!store)return [];
      const values=[store.operatingTag,...(store.serviceTags||[])]
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
    function services(store,limit=2){return tags(store,limit).map(x=>x.label);}
    function price(ids){
      if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)throw Error('INVALID_PRESENTATION_IDS');
      const rows=ids.map(id=>fixture.units.find(u=>u.id===id));if(rows.some(x=>!x))throw Error('UNKNOWN_PRESENTATION_UNIT');
      const s=core.state(),r=s.requirement,termVisible=r.term_confirmed===true;
      // The computed term price is visible before phone verification; only core.quote() issues binding quotes.
      const amount=termVisible?core.amounts(ids,r.term_months):null;
      const value=amount?amount.rent_total:whole(rows.reduce((sum,u)=>sum+(s.prices[u.id]??u.base_month),0));
      return {kind:termVisible?'term':'reference',value,money:money(value),months:termVisible?r.term_months:null,caption:termVisible?'整期租金':'月租',suffix:termVisible?'/ '+r.term_months+'个月':'/月起',termLabel:termVisible?r.term_months+'个月整期':'/月起',average:amount?money(amount.monthly_average)+'/月 × '+r.term_months+'个月':'',amounts:amount};
    }
    function facts(ids){
      if(ids.length===1){const u=fixture.units.find(x=>x.id===ids[0]);if(u)return unitPolicy.facts(u);}
      return {promoLabel:'',inventoryLine:'',state:'N'};
    }
    function cubicReference(store){const term=fixture.pricing.homeReferenceTerm||12;
      const rows=fixture.units.filter(u=>u.store_id===store.id&&core.available(u)&&Number(u.volume)>0);
      if(!rows.length)return null;
      const n=Math.min(...rows.map(u=>core.amounts([u.id],term).monthly_average/u.volume));
      return Number.isFinite(n)&&n>0?{value:Number(n.toFixed(2)),money:money(n),unit:'/m³/月起',basis:term+'个月折后最低立方月租'}:null;}
    return {price,facts,services,tags,tagType:typeOf,cubicReference,money};
  }
  root.SIM_PRESENTATION={create};
  if(typeof module==='object'&&module.exports)module.exports={create};
})(typeof window==='object'?window:globalThis);
