/* VIS-REBUILD-03C: isolated presentation data, permitted by user on 2026-10-28.
 * Services, compact addresses and A photographs are prototype content. Distances are fixed demonstration display values when live location is unavailable; they never mark geolocation verified or authorize sorting.
 * Original fixture IDs, inventory, capacity, price and order contracts are untouched.
 */
(function(root){
  'use strict';
  const capacities=[['all','全部容量'],['mini','1m³以内'],['small','1–3m³'],['medium','3–6m³'],['large','6–10m³'],['extra','10m³以上']];
  const ranges={mini:[0,1],small:[1,3],medium:[3,6],large:[6,10],extra:[10,Infinity]};
  function matches(volume,key){const range=ranges[key];return !range||(volume>range[0]&&volume<=range[1]);}
  function distanceOf(s){
    const num=s.distance===null||s.distance===undefined?NaN:Number(s.distance);
    if(Number.isFinite(num)&&num>=0)return num.toFixed(1)+'km';
    // Stable demonstration fallback: the same store ID must not change kilometers after filtering.
    const id=String(s.id||s.name||'store');
    const hash=Array.from(id).reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,0);
    return (1+(hash%111)/10).toFixed(1)+'km';
  }
  function view(s,index){
    const district=(s.district||'').replace(/^(北京|上海|广州|深圳|杭州)/,'').split(/\s*\/\s*/)[0];
    let address=(s.address||'').replace(/^(北京市|上海市|广州市|深圳市|杭州市)/,'').replace(/地下一层/gi,'B1层').replace(/地下二层/gi,'B2层');
    if(address.length>18)address=district+(s.community||s.name.replace(/店$/,'')).slice(0,9)+'88号B1层';
    const photoIndex=index%2;
    return {district,address,services:photoIndex?['24小时开放','商圈核心','交通便利']:['24小时开放','近地铁','停车方便'],
      distance:distanceOf(s), // Store-stable demo display; geolocation remains unverified
      photo:'assets/s01-r2-a-'+(photoIndex+1)+'.webp'};
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
