(()=>{
  const icon=(name,extra='')=>`<i data-lucide="${name}" class="${extra}"></i>`;
  const sceneIcons={moving:'truck',renovation:'paint-roller',luggage:'luggage',seasonal:'shirt',household:'house',collection:'tent-tree'};
  document.querySelectorAll('#scenesNew .scene').forEach(el=>el.insertAdjacentHTML('afterbegin',icon(sceneIcons[el.dataset.scene],'hc-scene-icon')));
  const benefitIcons=['calendar-days','map-pin','key-round','truck'];
  document.querySelectorAll('.hero-benefits i').forEach((el,i)=>el.innerHTML=icon(benefitIcons[i]));
  ['list-checks','file-check-2','package-open','key-round'].forEach((name,i)=>{const el=document.querySelectorAll('.service-flow-icon')[i];if(el)el.innerHTML=icon(name)});
  ['shield-check','droplets','headset','truck'].forEach((name,i)=>{const el=document.querySelectorAll('.service-evidence-icon')[i];if(el)el.innerHTML=icon(name)});
  ['house','search','map-pinned','user-round'].forEach((name,i)=>{const el=document.querySelectorAll('.bottomnav .ico')[i];if(el)el.innerHTML=icon(name)});
  const help=document.querySelector('#miniSupportLauncher i');if(help)help.innerHTML=icon('headset');
  document.querySelector('#homeOtherScene').onclick=()=>goEstimator();
  lucide.createIcons();
})();

(()=>{
  const launcher=document.getElementById('miniSupportLauncher');
  const panel=document.getElementById('miniGlobalSupport');
  const actions=document.getElementById('miniSupportActions');
  const sheet=document.getElementById('miniSupportMask');
  if(!launcher||!panel||!actions)return;
  launcher.setAttribute('aria-controls','miniSupportActions');
  const sync=()=>{const open=panel.classList.contains('expanded');launcher.setAttribute('aria-expanded',String(open));launcher.setAttribute('aria-label',open?'收起电话和在线客服':'展开电话和在线客服');};
  sync();
  new MutationObserver(sync).observe(panel,{attributes:true,attributeFilter:['class']});
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    if(sheet&&sheet.classList.contains('show')){sheet.classList.remove('show');launcher.focus();}
    else if(panel.classList.contains('expanded')){panel.classList.remove('expanded');launcher.focus();}
  });
})();
