(function(root){
  'use strict';
  function create({core,fixture,config}){
    const catalog=fixture.units;
    const names=config.itemNames||{};
    function generic(volume,page){
      const words=volume<1?['换季衣物、箱包','换季衣物、箱包与小件收纳']:volume<3?['行李箱、纸箱、衣物','行李箱、纸箱和日常闲置']:volume<6?['纸箱、行李箱、小件家具','纸箱、行李箱和小件家具']:volume<10?['家电、折叠家具、收纳箱','小家电、折叠家具和收纳箱']:volume<20?['家具、家电、搬家物品','家庭家具、家电和搬家物品']:volume<50?['成组家具、家电、纸箱','多件家庭家具、家电及纸箱']:['大体量家庭物品、商家物资','大量家庭物品及商家物资'];
      return words[page==='S01'?0:1];
    }
    function describe(u,page){
      const r=core.state().requirement,linked=r.capacity_m3!==null,matches=linked&&u.volume>=r.capacity_m3;
      const selected=r.source==='items_estimate'&&Array.isArray(r.items)?[...new Set(r.items.map(x=>names[x.id]).filter(Boolean))].slice(0,2):[];
      const use=selected.length?'您选择：'+selected.join('、'):generic(u.volume,page);
      if(!linked)return {matches:false,lines:['适合'+generic(u.volume,page)]};
      if(!matches)return {matches:false,lines:['其他可租容量', '常见存放：'+generic(u.volume,page)]};
      return {matches:true,lines:page==='S01'?['容量匹配 · '+use]:['符合您约'+r.capacity_m3+'m³的容量需求',selected.length?use:'常见存放：'+use]};
    }
    function facts(u){
      const s=core.state(),available=core.available(u),term=s.requirement.term_months;
      const snapshot={unit_id:u.id,store_id:u.store_id,catalog_revision:u.revision,inventory_version:s.inventoryVersion,term_months:s.requirement.term_confirmed?term:null,base_month:s.prices[u.id]||u.base_month};
      let promoLabel='',inventoryLine='',inventoryCount=null,campaignId=null;
      if(available){
        const offer=(config.campaigns||[]).find(x=>x.unitId===u.id&&x.storeId===u.store_id&&x.active&&x.catalogRevision===u.revision&&x.baseMonth===snapshot.base_month&&x.from<=fixture.demoToday&&x.until>=fixture.demoToday&&s.requirement.term_confirmed&&term>=x.minMonths&&term<=x.maxMonths);
        if(offer&&core.authorized()){
          const a=core.formalAmounts([u.id],term);
          if(Number.isFinite(a.rent_total)&&a.rent_total>0){promoLabel='特价仓';campaignId=offer.id;snapshot.rent_total=a.rent_total;}
        }
        const group=(config.inventoryGroups||[]).find(g=>g.complete&&g.storeId===u.store_id&&g.volume===u.volume&&g.unitIds.includes(u.id));
        if(group&&group.unitIds.length&&new Set(group.unitIds).size===group.unitIds.length&&group.unitIds.every(id=>catalog.some(x=>x.id===id&&x.store_id===u.store_id&&x.volume===u.volume))){
          const actual=catalog.filter(x=>x.store_id===u.store_id&&x.volume===u.volume).map(x=>x.id).sort();
          if(JSON.stringify(actual)===JSON.stringify([...group.unitIds].sort())){
            inventoryCount=group.unitIds.filter(id=>core.available(catalog.find(x=>x.id===id))).length;
            inventoryLine=inventoryCount===1?'同容量仅剩这1个':inventoryCount===2?'同容量仅剩2个':inventoryCount>=3&&inventoryCount<=5?'同容量剩余'+inventoryCount+'个':'';
          }
        }
      }
      const low=inventoryCount!==null&&inventoryCount<=2;
      return {available,promoLabel,inventoryLine,inventoryCount,campaignId,snapshot,state:!available?'UNAVAILABLE':promoLabel?(low?'PL':'P'):(low?'L':'N')};
    }
    return {describe,facts,generic};
  }
  root.SIM_BR03_POLICY={create};
  if(typeof module==='object'&&module.exports)module.exports={create};
})(typeof window==='object'?window:globalThis);
