(function(g){
  'use strict';
  function forStore(id){
    const data=g.MINI_KOALA_DATA;
    const canonical=data.getStore(id)?.store_id||id;
    const index=data.stores.findIndex(s=>s.store_id===canonical);
    const units=data.getLegacyUnits(id).filter(u=>Number(u.available_count)>0&&Number(u.base)>0);
    const specialUnits=index>=0&&(index%4===0||index%4===2)?units.filter((u,i)=>i%2===0):[];
    return {specialUnitIds:new Set(specialUnits.map(u=>u.id)),moving:index>=0&&(index%4===1||index%4===2)};
  }
  g.MINI_KOALA_STORE_ACTIVITY_DEMO={forStore};
})(window);
