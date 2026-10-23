/* HOME-SEARCH-02A · S01可选桥接。只有从首页搜索进来才触发原有搜索点击区。 */
(function(){
  'use strict';
  const KEY='mini_koala_h01_search_intent_02a';
  let val;
  try{val=JSON.parse(sessionStorage.getItem(KEY)||'null'); sessionStorage.removeItem(KEY);}catch(e){val=null;}
  if(!val || val.source!=='home_search' || !Number.isFinite(val.at) || Date.now()-val.at>180000)return;
  let done=false;
  function openExistingSearch(){
    if(done)return true;
    const btn=document.getElementById('locationSearchEntry');
    if(!btn || btn.disabled || btn.getClientRects().length===0)return false;
    done=true;
    btn.click(); // 复用S01原绑定事件，不自行发起定位，也不自造结果
    return true;
  }
  const attempt=()=>{if(!openExistingSearch())setTimeout(openExistingSearch,450);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attempt,{once:true});
  else attempt();
  window.addEventListener('load',openExistingSearch,{once:true});
})();