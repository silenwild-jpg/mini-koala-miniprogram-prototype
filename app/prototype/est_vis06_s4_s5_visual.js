/* EST-VIS-06: decorative S4 images and shortcut-step display only.
   This script never modifies estimator item IDs, calculation, navigation, or event callbacks. */
(function(){'use strict';
 const sources={
   box:'../assets/est-vis03/item_cardboard-box.webp',
   goodsbox:'../assets/est-vis03/item_cardboard-box.webp',
   sofa3:'../assets/est-vis03/item_sofa-three-seat.webp',
   fridge:'../assets/est-vis03/item_fridge-standard.webp',
   dining:'../assets/est-vis03/item_dining-table.webp',
   quilt:'../assets/est-vis03/item_folded-duvet.webp',
   luggage28:'../assets/est-vis03/item_suitcase.webp'
 };
 // Neutral category icon: used for unmatched item/specification, not a misleading photo.
 const neutral=`data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#F4F8F5"/><path d="m17 23 15-8 15 8v19l-15 8-15-8V23Z" fill="#FFFFFF" stroke="#A3BBAA" stroke-width="2" stroke-linejoin="round"/><path d="m17 23 15 9 15-9M32 32v18" stroke="#A3BBAA" stroke-width="2" fill="none"/></svg>')}`;
 const actualImage=id=>{
   if(!(id in sources))return null;
   // A single 3-seat sofa or standard fridge/dining photo must never represent a different size.
   try {
     const v=(typeof state!=='undefined'&&state.variants)?state.variants[id]:null;
     if(id==='sofa3'&&v&&v!=='std')return null;
     if(id==='fridge'&&v&&v!=='std')return null;
     if(id==='dining'&&v&&v!=='std')return null;
   }catch(_){return null}
   return sources[id];
 };
 function decorateItems(){
   document.querySelectorAll('#s4 .kv .hd').forEach(row=>{
     const id=row.querySelector('.qty button[data-id]')?.dataset.id;
     if(!id)return;
     // EST-VIS-09 compatibility gate: ITEM-VIS owns a native media slot.
     // Never render the older six-photo / neutral overlay on top of ITEM-VIS media.
     // On a switch between renderers, remove any stale decoration as well.
     if(row.querySelector('.item-media, .item-compact-media')){
       row.querySelectorAll(':scope > .estvis06-thumb').forEach(el=>el.remove());
       return;
     }
     let thumb=row.querySelector('.estvis06-thumb');
     if(!thumb){thumb=document.createElement('div');thumb.className='estvis06-thumb';thumb.setAttribute('aria-hidden','true');
       const img=document.createElement('img');img.alt='';img.decoding='async';thumb.appendChild(img);row.insertBefore(thumb,row.firstChild);}
     const image=actualImage(id);
     thumb.classList.toggle('estvis06-placeholder',!image);
     const img=thumb.querySelector('img');const src=image||neutral;
     if(img.getAttribute('src')!==src)img.setAttribute('src',src);
     // Future linked artwork is cosmetic; the adjacent text remains the source of identity.
   });
 }
 function routeDecoration(){
  // A shortcut without item review must not display a misleading 4-step completion state.
  try{const quick=typeof state!=='undefined'&&state.screen===5&&state.flow==='estimate'&&state.itemsConfirmed===false;
   document.body.classList.toggle('estvis06-shortcut',Boolean(quick));}catch(_){}
 }
 const observe=(id,cb)=>{const el=document.getElementById(id);if(el)new MutationObserver(cb).observe(el,{childList:true});};
 ['p1List','p2List','p3List'].forEach(id=>observe(id,decorateItems));
 const root=document.querySelector('.phone');if(root)new MutationObserver(routeDecoration).observe(root,{subtree:true,attributes:true,attributeFilter:['class']});
 decorateItems();routeDecoration();
})();
