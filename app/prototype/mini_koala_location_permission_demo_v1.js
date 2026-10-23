(function(g){
  'use strict';
  const KEY='mini_koala_location_permission_demo_v1';
  let memory='';
  function status(){try{return sessionStorage.getItem(KEY)||memory}catch(e){return memory}}
  function save(v){memory=v;try{sessionStorage.setItem(KEY,v)}catch(e){}}
  function request({onAllow,onDeny}={}){
    if(document.querySelector('.mk-location-mask'))return;
    if(status()==='allowed'){if(onAllow)onAllow();return}
    const previous=document.activeElement;
    const mask=document.createElement('div');mask.className='mk-location-mask';
    mask.innerHTML='<section class="mk-location-sheet" role="dialog" aria-modal="true" aria-labelledby="mkLocationHeading" aria-describedby="mkLocationDescription"><div class="mk-location-app"><span class="mk-location-icon" aria-hidden="true">🐨</span><span>迷你考拉仓 申请</span><span class="mk-location-info" aria-hidden="true">i</span></div><h2 id="mkLocationHeading">获取您的位置信息</h2><p id="mkLocationDescription">将获取您的位置信息，用于查找附近门店和计算到店距离。</p><div class="mk-location-buttons"><button type="button" data-permission="denied">拒绝</button><button type="button" data-permission="allowed">允许</button></div></section>';
    const buttons=mask.querySelectorAll('button');
    function finish(value){save(value);mask.remove();document.removeEventListener('keydown',keys,true);if(previous&&previous.isConnected)previous.focus();if(value==='allowed'){if(onAllow)onAllow()}else if(onDeny)onDeny()}
    function keys(e){if(e.key==='Escape'){e.preventDefault();finish('denied')}else if(e.key==='Tab'){e.preventDefault();(document.activeElement===buttons[0]?buttons[1]:buttons[0]).focus()}}
    buttons.forEach(b=>b.onclick=()=>finish(b.dataset.permission));
    document.body.appendChild(mask);document.addEventListener('keydown',keys,true);buttons[0].focus();
  }
  g.MINI_KOALA_LOCATION_DEMO={status,request};
})(window);
