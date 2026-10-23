/* UX-PATCH B — S01/S02 common demo tag presentation; does not assert real store services. */
(function(root){
 'use strict';
 const pool=Object.freeze(['近地铁','新开门店','双11大促','24小时','电梯直达','热门','仓型齐全']);
 const PROMO=new Set(['特价仓','双11大促']);
 function forStore(id, activity){
   let seed=[...String(id)].reduce((n,ch)=>(n*31+ch.charCodeAt(0))>>>0,7);
   const count=2+seed%3, rest=pool.slice(), chosen=[];
   while(chosen.length<count&&rest.length){seed=(seed*1664525+1013904223)>>>0;chosen.push(rest.splice(seed%rest.length,1)[0]);}
   if(activity?.specialUnitIds?.size)chosen.push('特价仓');
   if(activity?.moving)chosen.push('送搬运');
   const sorted=[...new Set(chosen)].sort((a,b)=>Number(PROMO.has(b))-Number(PROMO.has(a))||chosen.indexOf(a)-chosen.indexOf(b));
   return sorted.slice(0,4);
 }
 function escape(s){return String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[x]));}
 function html(id,activity){return forStore(id,activity).map(tag=>`<span class="tag${PROMO.has(tag)?' mk-promo-tag':''}">${escape(tag)}</span>`).join('');}
 root.MINI_KOALA_UXB_TAGS={forStore,html,isPromo:tag=>PROMO.has(tag)};
})(typeof window==='object'?window:globalThis);
