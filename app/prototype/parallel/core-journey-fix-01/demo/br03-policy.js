(function(root){
  'use strict';
  function create({core,fixture,config}){
    const catalog=fixture.units;
    const names=config.itemNames||{};
    // One capacity-to-use short sentence across S01, S02, S5 and CAP.
    // Descriptive examples only; a particular oversized item is not guaranteed to fit.
    function generic(volume){
      const v=Number(volume);
      return v<=1.5?'行李箱、换季衣物':
        v<=5?'纸箱、小件家具':
        v<=10?'小件家具、家电':
        v<=25?'沙发、家庭家具':
        v<=50?'大件家具、家电':'大量家具、物资';
    }
    // Store-level promotion labels must be derived from an explicit, currently valid
    // unit campaign. Never infer a promotion from store position or rotating demo tags.
    function storePromotionTag(store){
      if(!store||store.status!=='open')return '';
      const today=String(fixture.demoToday||'');
      const prices=core.state().prices||{};
      const eligible=(config.campaigns||[]).some(c=>{
        if(!c||c.active!==true||c.storeId!==store.id||!c.unitId||
          !c.from||!c.until||c.from>today||c.until<today)return false;
        const u=catalog.find(x=>x.id===c.unitId&&x.store_id===store.id);
        if(!u||!core.available(u)||u.revision!==c.catalogRevision)return false;
        const base=prices[u.id]??u.base_month;
        return Number.isFinite(Number(base))&&Number(base)===Number(c.baseMonth);
      });
      return eligible?'特价仓':'';
    }
    function describe(u,page){
      const r=core.state().requirement,linked=core.requirementReady(),
        matches=linked&&u.volume>=r.capacity_m3;
      const selected=r.source==='items_estimate'&&Array.isArray(r.items)?
        [...new Set(r.items.map(x=>names[x.id]).filter(Boolean))].slice(0,2):[];
      const words='适合'+generic(u.volume);
      // The first line is deliberately identical on every page; an S02
      // detail can separately expand the user's selected list if requested.
      const extra=page==='S02'&&selected.length?'您选择：'+selected.join('、'):null;
      return {matches,lines:extra?[words,extra]:[words],category:generic(u.volume)};
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
    return {describe,facts,generic,storePromotionTag};
  }
  root.SIM_BR03_POLICY={create};
  if(typeof module==='object'&&module.exports)module.exports={create};
})(typeof window==='object'?window:globalThis);
