(function(root){
  'use strict';
  function create({core,fixture,unitPolicy}){
    const money=n=>'¥'+Math.trunc(Number(n)).toLocaleString('zh-CN');
    function services(store,limit=2){return [...new Set((store.serviceTags||[]).filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()))].slice(0,limit);}
    function price(ids){
      if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)throw Error('INVALID_PRESENTATION_IDS');
      const rows=ids.map(id=>fixture.units.find(u=>u.id===id));if(rows.some(x=>!x))throw Error('UNKNOWN_PRESENTATION_UNIT');
      const s=core.state(),r=s.requirement,termVisible=r.term_confirmed===true;
      // The computed term price is visible before phone verification; only core.quote() issues binding quotes.
      const amount=termVisible?core.amounts(ids,r.term_months):null;
      const value=amount?amount.rent_total:rows.reduce((sum,u)=>sum+(s.prices[u.id]||u.base_month),0);
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
      return Number.isFinite(n)&&n>0?{value:Number(n.toFixed(2)),money:money(Number(n.toFixed(2))),unit:'/m³/月起',basis:term+'个月折后最低立方月租'}:null;}
    return {price,facts,services,cubicReference};
  }
  root.SIM_PRESENTATION={create};
  if(typeof module==='object'&&module.exports)module.exports={create};
})(typeof window==='object'?window:globalThis);
