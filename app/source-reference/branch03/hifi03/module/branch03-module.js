/* BRANCH03-HIFI-03 central-facing isolated mount adapter, no codebase overwrite. */
(()=>{'use strict';
const VERSION='1.0.0';
const STORE_IDS=new Set(['jingan','xuhui','changning','pudong']);
const methods=new Set(['setRequirement','openS01','openS02','showScenario','getState']);
function mount(target,opts={}){
 const el=typeof target==='string'?document.querySelector(target):target;
 if(!el)throw Error('BR03_CONTAINER_MISSING');
 const base=new URL(opts.baseUrl||'../isolated/',document.currentScript?.src||document.baseURI);
 const source=new URL('index.html',base);source.searchParams.set('br03_embed','1');
 const frame=document.createElement('iframe');frame.className='br03-frame';frame.title='迷你考拉仓 S01/S02';frame.setAttribute('aria-label','S01附近门店与S02仓位选择');frame.style.cssText='display:block;border:0;width:100%;height:100%;max-width:390px;margin:auto;background:#fff';
 frame.addEventListener('load',()=>{const target=source.origin==='null'?'*':source.origin;frame.contentWindow?.postMessage({channel:'MINI_KOALA_BR03',kind:'HELLO'},target)});
 // Append frame only after message listener is installed.
 const ownOrigin=location.origin, expectedOrigin=source.origin;
 const pending=new Map();let seq=0,active=true,ready=false;
 const listeners=new Set();const all=[];
 function publish(kind,payload){const detail={kind,payload,source:'BRANCH-03-HIFI-03'};
  el.dispatchEvent(new CustomEvent('br03:'+kind.toLowerCase(),{detail,bubbles:true}));
  for(const cb of listeners)cb(detail);
  const names={ORDER_INTENT:'onOrderIntent',BOOKING_INTENT:'onBookingIntent',FAVORITE_CHANGED:'onFavoriteChanged',NAV_REQUEST:'onNavigationRequest',STATE_CHANGED:'onStateChanged'};
  if(names[kind]&&typeof opts[names[kind]]==='function')opts[names[kind]](payload);
 }
 function receive(ev){
  if(!active||ev.source!==frame.contentWindow||ev.origin!==expectedOrigin)return;
  const m=ev.data;if(!m||m.channel!=='MINI_KOALA_BR03')return;
  if(m.kind==='READY'){
    if(ready)return;
    ready=true;publish('READY',m.payload);
    // Explicit no-demand default; never accidentally reuse 6-month sample values on central entry.
    const requirement=Object.prototype.hasOwnProperty.call(opts,'requirement')?opts.requirement:null;
    command('setRequirement',requirement).then(()=>{
      const context=opts.entry||{page:'S01'};
      return context.page==='S02'?command('openS02',{store_id:context.store_id||context.storeId||'jingan'}):command('openS01');
    }).catch(err=>publish('ERROR',{message:err.message}));
  }else if(m.kind==='COMMAND_RESULT'){
    const p=pending.get(m.requestId);if(!p)return;
    pending.delete(m.requestId);clearTimeout(p.timer);
    m.payload.ok?p.resolve(m.payload.result):p.reject(Error(m.payload.error||'BR03_COMMAND_FAILED'));
  }else publish(m.kind,m.payload);
 }
 window.addEventListener('message',receive);
 function command(name,payload){
  if(!active)return Promise.reject(Error('BR03_DESTROYED'));
  if(!methods.has(name))return Promise.reject(Error('BR03_INVALID_COMMAND'));
  if(name==='openS02'&&payload?.store_id&&!STORE_IDS.has(payload.store_id))return Promise.reject(Error('UNKNOWN_DEMO_STORE_ID'));
  return new Promise((resolve,reject)=>{
   const id='br03-'+(++seq);const timer=setTimeout(()=>{pending.delete(id);reject(Error('BR03_COMMAND_TIMEOUT'))},5000);
   pending.set(id,{resolve,reject,timer});
   const target=expectedOrigin==='null'?'*':expectedOrigin;
   frame.contentWindow.postMessage({channel:'MINI_KOALA_BR03',kind:'COMMAND',command:name,payload,requestId:id},target);
  });
 }
 frame.src=source.href;el.replaceChildren(frame);
 return Object.freeze({frame,version:VERSION,isReady:()=>ready,
  openS01:()=>command('openS01',{}),openS02:(id)=>command('openS02',{store_id:id}),
  setRequirement:r=>command('setRequirement',r),getState:()=>command('getState',{}),
  showScenario:scenario=>command('showScenario',{scenario}),
  subscribe:cb=>{if(typeof cb!=='function')throw Error('callback required');listeners.add(cb);return ()=>listeners.delete(cb)},
  destroy:()=>{active=false;window.removeEventListener('message',receive);for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('BR03_DESTROYED'))}pending.clear();listeners.clear();frame.remove()}
 });
}
window.MiniKoalaBranch03=Object.freeze({mount,version:VERSION,previewOnly:true});
})();