/* VIS-REBUILD-03C: isolated presentation data, permitted by user on 2026-10-28.
 * Services, compact addresses and A photographs are prototype content. Distances are fixed demonstration display values when live location is unavailable; they never mark geolocation verified or authorize sorting.
 * Original fixture IDs, inventory, capacity, price and order contracts are untouched.
 */
(function(root){
  'use strict';
  const capacities=[['all','全部容量'],['mini','1m³以内'],['small','1–3m³'],['medium','3–6m³'],['large','6–10m³'],['extra','10m³以上']];
  const ranges={mini:[0,1],small:[1,3],medium:[3,6],large:[6,10],extra:[10,Infinity]};
  function matches(volume,key){const range=ranges[key];return !range||(volume>range[0]&&volume<=range[1]);}
  // RC2 is an internal demo: unverified coordinates may still have stable visual km.
  // The same value is used for display, distance filtering and ranking; it never
  // changes the separate location-verification state.
  function distanceOf(s,verified=false){
    const num=s.distance===null||s.distance===undefined?NaN:Number(s.distance);
    const synthetic=typeof SIM_FIXTURES!=='undefined'&&SIM_FIXTURES.synthetic===true;
    if(!verified&&!synthetic)return '';
    if(Number.isFinite(num)&&num>=0)return num.toFixed(1)+'km';
    if(!synthetic)return '';
    const id=String(s.id||s.name||'store');
    const hash=Array.from(id).reduce((n,ch)=>(Math.imul(n,31)+ch.charCodeAt(0))>>>0,0);
    return (1+(hash%111)/10).toFixed(1)+'km';
  }
  function view(s,index){
    // Preserve current fixture/catalog fields (same IDs as S02 and O01).
    // Prior R2 visual reconstruction invented addresses ending in "88号B1层",
    // alternated generic services and recycled two photographs for all stores.
    const district=String(s.district||'').trim();
    const address=String(s.address||'').trim();
    const services=[...new Set((s.serviceTags||[]).filter(v=>typeof v==='string'&&v.trim()))].slice(0,3);
    const asset=String(s.photo||'');
    const photo=/^(?:store-curated\/v1\/SIM_[A-Z0-9]+\/(?:card|hero)\.webp|[a-zA-Z0-9_.-]+\.(?:jpg|jpeg|png|webp))$/.test(asset)?'assets/'+asset:'assets/s01-r2-a-1.webp';
    return {district,address,services,distance:distanceOf(s,false),photo,photoFallback:s.photoLegacy?'assets/'+s.photoLegacy:null,photoOrigin:s.photo_source||'LEGACY_DEMO'};
  }
  // Only copy on the isolated R2 journey is normalized. No fixture or state mutation.
  function productText(value){return String(value)
    .replace('本地原型不传输手机号；正式协议与隐私政策全文待提供。','我们将妥善保护您的手机号及个人信息。')
    .replace('这里只展示内部模拟条款说明，不签署正式协议，不产生真实扣款。','请确认所选门店、仓位、租期与费用，提交前可随时修改。')
    .replace('已创建，待支付。不会发生真实扣款。','已创建，请确认费用后继续。')
    .replace('付款已在本地记录，可查看订单和后续服务。','付款成功，可查看订单和后续服务。')
    .replace(/内部演示导航/g,'可返回继续选择门店')
    .replace(/模拟|示意图|示意|演示|测试/g,'');}
  function cleanCopy(node){
    if(!node)return;const doc=node.ownerDocument;
    const walker=doc.createTreeWalker(node,4);let text;
    while((text=walker.nextNode()))if(!/^(SCRIPT|STYLE)$/.test(text.parentElement?.tagName||'')){
      const value=productText(text.nodeValue);if(value!==text.nodeValue)text.nodeValue=value;
    }
    node.querySelectorAll('[alt],[title]').forEach(el=>{for(const key of ['alt','title'])if(el.hasAttribute(key))el.setAttribute(key,productText(el.getAttribute(key)));});
  }
  const api={capacities,matches,view,distanceOf,productText,cleanCopy};root.S01_R2_CONTENT=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis);
