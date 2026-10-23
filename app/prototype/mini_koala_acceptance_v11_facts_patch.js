/* Acceptance Fix V1.1 / PATCH B — canonical cross-page display facts.
 * Does not rewrite contractual pricing or production inventory data.
 */
(function(){
  'use strict';
  const routeMaster=window.MINI_STORAGE_MASTER_V222?.route_base;
  const records=window.MINI_KOALA_DATA;
  function routeFor(storeId,origin='guomao',mode='drive'){
    if(window.MINI_STORAGE_REQUIREMENT_RECOMMENDATION_V274)return window.MINI_STORAGE_REQUIREMENT_RECOMMENDATION_V274.routeFor(storeId,origin,mode);
    if(!routeMaster)return null;
    const row=routeMaster[origin]||routeMaster.guomao||{};
    const item=(row[storeId]||(routeMaster.guomao||{})[storeId]);
    if(item?.[mode])return {m:Number(item[mode][0]),km:Number(item[mode][1]),source:'DEMO_SSOT'};
    const st=records?.getStore?.(storeId)||window.MINI_STORAGE_MASTER_V222?.stores?.[storeId]||{};
    const seed=[...String(storeId)].reduce((sum,ch)=>sum+ch.charCodeAt(0),0);
    const district=origin==='zhongguancun'?'海淀区':['guomao','wangjing','shuangjing','sanyuanqiao'].includes(origin)?'朝阳区':'';
    const same=district&&st.district===district;
    const km=Number(((st.city==='北京市'?(same?1.2:4.8):35)+(seed%58)/10).toFixed(1));
    const m=mode==='bike'?Math.max(8,Math.round(km*4.8)):
      mode==='walk'?Math.max(12,Math.round(km*12.5)):
      Math.max(6,Math.round(4+km*2.15+(seed%4)));
    return {m,km,source:'DETERMINISTIC_DEMO'};
  }
  function money(v){return Number(v).toLocaleString('zh-CN',{maximumFractionDigits:0});}
  function checkMoney(snapshot){
    const s=snapshot||{},rent=Number(s.total_rent),term=Number(s.term_months),
      d=Number(s.coupon_discount_amount||0),deposit=Number(s.deposit||s.deposit_amount||0),fee=Number(s.management_fee||0);
    if(![rent,term,d,deposit,fee].every(Number.isFinite)||term<=0)return {valid:false,reason:'INVALID_COMPONENT'};
    const payable=rent-d+deposit+fee;
    return {valid:true,monthly_approx:Math.round(rent/term),rent_after_coupon:rent-d,
      payable,display:`整期租金 ¥${money(rent)}${d?' − 优惠券 ¥'+money(d):''} + 押金 ¥${money(deposit)} + 管理费 ¥${money(fee)} = ¥${money(payable)}`};
  }
  window.MINI_KOALA_FACTS_V11={routeFor,checkMoney};
  const p=new URLSearchParams(location.search),page=location.pathname.split('/').pop();
  if(!page.startsWith('mini_storage_store_detail_s02_'))return;
  // S02 historically fell back to routeMasterRow.jianguo when an actual store ID
  // had no route-base entry, while S01 used a deterministic store-specific fallback.
  // Both pages now use the same semantics; no invented single distance for all origins.
  try{
    if(typeof travel==='undefined'||typeof storeId==='undefined')return;
    const origin=typeof searchOriginKey==='string'?searchOriginKey:(p.get('searchOriginKey')||'guomao');
    for(const mode of ['drive','bike','walk']){
      const result=routeFor(storeId,origin,mode);
      if(result&&travel[mode]){travel[mode].m=result.m;travel[mode].km=result.km;}
    }
    function syncRouteDisplay(){
      const current=travel[travelMode];if(!current)return;
      const label=document.getElementById('routeText');
      if(label)label.innerHTML=`${current.icon} ${current.label}约 <b>${current.m} 分钟</b> · ${current.km.toFixed(1)}km ▾`;
      if(typeof searchMin!=='undefined'){searchMin=current.m;searchKm=current.km;}
      const dc=document.getElementById('distanceContext');
      if(dc){
        const high=typeof accessFrequency!=='undefined'&&accessFrequency==='high';
        const far=high?(current.m>=20||current.km>=8):(current.m>=30||current.km>=20);
        dc.classList.toggle('hidden',!far);
        const desc=document.getElementById('distanceContextDesc');
        if(desc&&far)desc.textContent=`从当前找仓位置${current.label}约${current.m}分钟，您也可以返回比较其他门店。`;
      }
    }
    document.querySelectorAll('#travelSheet .option[data-travel]').forEach(el=>{
      const row=travel[el.dataset.travel];if(row){const span=el.querySelector('span');if(span)span.textContent=`约${row.m}分钟 · ${row.km.toFixed(1)}km`;}
      el.addEventListener('click',syncRouteDisplay);
    });
    syncRouteDisplay();
  }catch(err){console.warn('PATCH B route display skipped',err)}
})();
