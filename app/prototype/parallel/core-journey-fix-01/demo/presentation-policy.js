(function(root){
  'use strict';
  function create({core,fixture,unitPolicy}){
    const money=n=>'¥'+Number(n).toLocaleString('zh-CN',{maximumFractionDigits:2});
    function services(store,limit=2){return [...new Set((store.serviceTags||[]).filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()))].slice(0,limit);}
    function price(ids){
      if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)throw Error('INVALID_PRESENTATION_IDS');
      const rows=ids.map(id=>fixture.units.find(u=>u.id===id));if(rows.some(x=>!x))throw Error('UNKNOWN_PRESENTATION_UNIT');
      const s=core.state(),r=s.requirement,formal=core.authorized()&&r.term_confirmed;
      const amount=formal?core.formalAmounts(ids,r.term_months):null;
      const value=amount?amount.rent_total:rows.reduce((sum,u)=>sum+(s.prices[u.id]||u.base_month),0);
      return {kind:formal?'term':'reference',value,money:money(value),months:formal?r.term_months:null,caption:formal?'整期租金':'月租',suffix:formal?'/ '+r.term_months+'个月':'/月起',termLabel:formal?r.term_months+'个月整期':'/月起',average:amount?'月均约 '+money(amount.monthly_average):'',amounts:amount};
    }
    function facts(ids){
      if(ids.length===1){const u=fixture.units.find(x=>x.id===ids[0]);if(u)return unitPolicy.facts(u);}
      return {promoLabel:'',inventoryLine:'',state:'N'};
    }
    function cubicReference(store){const n=Number(store.teaserCubicPrice);return Number.isFinite(n)&&n>0?{money:money(n),unit:'/m³/月起',basis:'12个月立方月租'}:null;}
    return {price,facts,services,cubicReference};
  }
  root.SIM_PRESENTATION={create};
  if(typeof module==='object'&&module.exports)module.exports={create};
})(typeof window==='object'?window:globalThis);
