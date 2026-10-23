(function(root){
  const hash=s=>[...String(s||'mini-koala')].reduce((n,ch)=>(n*33+ch.charCodeAt(0))>>>0,5381);
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  function viewerCount(key,availableCount){
    const available=Math.max(0,Number(availableCount||0));
    const base=available<=1?8:available===2?6:available<=5?4:2;
    return clamp(base+(hash(key)%5),2,12);
  }
  function initialCountdownSeconds(key){
    return 7*60+(hash(key)%240); // 07:00–10:59, demo-only signal layer.
  }
  function sessionStart(key){
    const storageKey=`mini_koala_urgency_start_${String(key).replace(/[^a-zA-Z0-9_-]/g,'_')}`;
    let started=0;
    try{started=Number(sessionStorage.getItem(storageKey)||0)}catch(e){}
    if(!started){started=Date.now();try{sessionStorage.setItem(storageKey,String(started))}catch(e){}}
    return started;
  }
  function remainingSeconds(key){
    const initial=initialCountdownSeconds(key),elapsed=Math.floor((Date.now()-sessionStart(key))/1000);
    const cycle=12*60;
    const remaining=initial-(elapsed%cycle);
    return remaining>0?remaining:60;
  }
  function format(seconds){
    const s=Math.max(0,Math.floor(seconds)),m=Math.floor(s/60),r=s%60;
    return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
  }
  function startCountdown(el,key,options={}){
    if(!el)return ()=>{};
    const prefix=options.prefix||'';
    const suffix=options.suffix||' 后重新确认库存';
    const render=()=>{el.textContent=`${prefix}剩余 ${format(remainingSeconds(key))}（分:秒）${suffix}`};
    render();const timer=setInterval(render,1000);
    return ()=>clearInterval(timer);
  }
  root.MINI_STORAGE_INVENTORY_URGENCY_V1={
    schema_version:'1.0',source:'presentation_fixture',viewerCount,initialCountdownSeconds,remainingSeconds,format,startCountdown
  };
  if(typeof module!=='undefined'&&module.exports)module.exports=root.MINI_STORAGE_INVENTORY_URGENCY_V1;
})(typeof window!=='undefined'?window:globalThis);
