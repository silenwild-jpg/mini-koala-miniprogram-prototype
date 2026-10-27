/* BRANCH03-HIFI-03 child side bridge. Standalone S01/S02 logic remains separate. */
(()=>{'use strict';
const API=window.BRANCH03_DEMO;
if(!API)return;
const PARAM=new URLSearchParams(window.location.search);
const embedded=PARAM.get('br03_embed')==='1';
if(!embedded)return;
const st=document.createElement('style');st.textContent=`
html,body{height:100%;background:white;overflow:hidden}
.app-shell{width:100%;max-width:390px;height:100dvh;min-height:0;margin:0 auto;border:0;border-radius:0;box-shadow:none}
.qa-panel{display:none!important}
@media(min-width:700px){.app-shell{width:100%;max-width:390px;height:100dvh;min-height:0;margin:auto;border:0;border-radius:0}}
`;document.head.append(st);
// Only accept host messages from own parent and the same origin (including test-only opaque origin).
const ownOrigin=window.location.origin;
const isAllowed=e=>e.source===window.parent && e.origin===ownOrigin;
const post=(kind,payload={},requestId=null)=>window.parent.postMessage({channel:'MINI_KOALA_BR03',kind,payload,requestId},ownOrigin==='null'?'*':ownOrigin);
const snapshot=()=>API.getState();
const normalize=r=>{
 if(!r||typeof r!=='object')return null;
 const raw=r.capacity_m3??r.capacityM3;
 const cap=raw==null?null:Number(raw);
 const rawTerm=r.term_months??r.rentalMonths;
 const months=rawTerm==null?null:Number(rawTerm);
 const validTerm=[1,3,6,12,24,36,60].includes(months);
 return {capacity_m3:Number.isFinite(cap)&&cap>0?cap:null,capacity_range:r.capacity_range??r.capacityRange??(cap?`${cap}m³`:null),source:r.source??r.entrySource??'CENTRAL',term_months:validTerm?months:null,term_confirmed:(r.term_confirmed===true||r.termConfirmed===true)&&validTerm,entry_context:r.entry_context??r.returnContext??null,quote_snapshot_ref:r.quote_snapshot_ref??r.quoteSnapshotRef??null,quote_store_id:r.quote_store_id??r.quoteStoreId??null,quote_unit_id:r.quote_unit_id??r.quoteUnitId??null};
};
function execute(command,data){
 switch(command){
 case 'setRequirement':API.setRequirement(normalize(data));return true;
 case 'openS01':API.showS01();return true;
 case 'openS02':{
   let id=data?.store_id??data?.storeId??'jingan';
   if(!['jingan','xuhui','changning','pudong'].includes(id))throw Error('UNKNOWN_DEMO_STORE_ID');
   API.showS02(id);return true;
 }
 case 'showScenario':API.showScenario(String(data?.scenario||''));return true;
 case 'getState':return snapshot();
 default:throw Error('UNKNOWN_COMMAND');
 }
}
window.addEventListener('message',e=>{
 if(!isAllowed(e))return;
 const msg=e.data;
 if(!msg||msg.channel!=='MINI_KOALA_BR03')return;
 if(msg.kind==='HELLO'){post('READY',{apiVersion:'1.0.0',page:snapshot().page,capabilities:['S01','S02','requirement','orderIntent','bookingIntent','favoriteState']});return;}
 if(msg.kind!=='COMMAND')return;
 const {command,payload,requestId}=msg;
 try{const result=execute(command,payload);post('COMMAND_RESULT',{ok:true,result},requestId);post('STATE_CHANGED',snapshot())}
 catch(err){post('COMMAND_RESULT',{ok:false,error:String(err?.message||err)},requestId)}
});
window.addEventListener('br03:orderIntent',e=>post('ORDER_INTENT',e.detail));
window.addEventListener('br03:bookingIntent',e=>post('BOOKING_INTENT',e.detail));
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-action]');if(!b)return;
 const action=b.dataset.action,val=b.dataset.val;
 if(action==='navBottom'&&val!=='附近门店')post('NAV_REQUEST',{target:val});
 if(action==='favorite'||action==='storeFavorite'||action==='back'||action==='category'){
  queueMicrotask(()=>{const s=snapshot();post('STATE_CHANGED',s);
   if(action==='favorite')post('FAVORITE_CHANGED',{unit_id:val,is_favorite:s.favorites.includes(val)});
  });
 }
},false);
post('READY',{apiVersion:'1.0.0',page:'S01',capabilities:['S01','S02','requirement','orderIntent','bookingIntent','favoriteState']});
})();