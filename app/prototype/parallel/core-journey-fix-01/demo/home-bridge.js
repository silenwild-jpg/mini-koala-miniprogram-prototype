(function(){
  'use strict';
  const KEY='mk_independent_sim_v1',read=k=>{try{return JSON.parse(sessionStorage.getItem(k)||'null');}catch{return null;}};
  const core=SIM_CORE.create({state:read(KEY)}),F=SIM_FIXTURES;
  const presentation=SIM_PRESENTATION.create({core,fixture:F,unitPolicy:SIM_BR03_POLICY.create({core,fixture:F,config:SIM_BR03_DATA})});
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const persist=()=>sessionStorage.setItem(KEY,JSON.stringify(core.state()));
  core.expirePendingOrders();
  document.body.classList.add('fidelity-hero','fidelity-enterprise');
  const dockSpace=document.createElement('style');dockSpace.textContent='.scroll{padding-bottom:calc(var(--w)*76/463)}';document.head.appendChild(dockSpace);
  const phone=document.getElementById('phone'),toolbar=document.querySelector('.toolbar');
  const css=document.createElement('style');css.textContent='.toolbar{position:fixed;top:2px;left:50%;transform:translateX(-50%);border:0;background:transparent;padding:0;z-index:100;font-size:9px;display:block}.toolbar summary{cursor:pointer;color:#a2b3ab;font-size:9px}.toolbar[open]{background:#fff;border:1px solid #dce7e1;border-radius:8px;padding:8px;min-width:165px}.toolbar a,.toolbar button{display:block;color:#006e56;margin:7px 0;font-size:11px}.workstage{padding:0;display:flex}.phone{border-radius:0;box-shadow:none;height:100dvh;max-height:844px}.footer-nav button:nth-of-type(1){left:0}.footer-nav button:nth-of-type(2){left:25%}.footer-nav button:nth-of-type(3){left:50%}.footer-nav button:nth-of-type(4){left:75%}.footer-nav button{width:25%}.demo12-dialog img{max-width:100%;height:auto}.demo12-buttons{flex-wrap:wrap}.demo12-dialog button:focus-visible{outline:2px solid #ff973d}.demo12-dialog .home-option{display:block;width:100%;height:42px;border:0;border-radius:8px;background:#eef4f0;color:#006e56;margin:8px 0}.demo12-dialog .home-option.primary{background:#006e56;color:#fff}.store-card.featured::after{content:"优先推荐";position:absolute;top:0;left:0;background:#007d60;color:#fff;padding:4px 7px;font-size:9px;border-radius:0 0 5px 0}';document.head.appendChild(css);
  const details=document.createElement('details');details.className='toolbar';details.innerHTML='<summary>内部演示设置</summary><small>CORE-JOURNEY-FIX-01 · 模拟数据</small><a href="index.html">场景控制台</a><button type="button" data-h="revoke">清除模拟手机号授权</button>';toolbar.replaceWith(details);details.hidden=new URLSearchParams(location.search).get('debug')!=='1';
  function fit(){const w=Math.min(innerWidth,390),suffix=w<=375?'375':'390';phone.style.setProperty('--w',w+'px');phone.style.setProperty('--h',(w<=375?812:844)+'px');
    const images={heroPhoto:`hero_original_${suffix}.png`,taskPhoto:`tasks_display_${suffix}.png`,refStores:`stores_original_${suffix}.png`,belowImg:`below_original_${suffix}.png`,navPhoto:`nav_original_${suffix}.png`,enterprisePhoto:`enterprise_${suffix}.jpg`,brandPhoto:`brand_portrait_${suffix}.jpg`};
    for(let i=1;i<=6;i++)images['scene'+i]=`scene_photo_${i}_${suffix}.jpg`;for(let i=1;i<=3;i++)images['proof'+i]=`proof_${i}_${suffix}.jpg`;
    for(const [id,file] of Object.entries(images)){const el=document.getElementById(id);if(el)el.src='assets/'+file;}}
  fit();window.addEventListener('resize',fit);
  const city=document.createElement('span');city.className='demo13-city-label';city.textContent=core.state().city;document.querySelector('.hero').appendChild(city);
  const selection=SIM_HOME_RECOMMEND_02I.rank(F.stores.filter(x=>x.city===core.state().city),{distanceVerified:F.distanceVerified});
  const stores=selection.cards;
  document.getElementById('storeRail').innerHTML=stores.map((x,i)=>`<article class="store-card ${i===0?'featured':''}" data-sim-store="${x.id}" tabindex="0" role="link" aria-label="查看${esc(x.name)}"><img class="store-photo" src="assets/${x.photo}" alt="门店场景示意"><div class="store-body"><b class="store-name">${esc(x.name)}</b><div class="store-location">${esc(x.district+' · '+(x.community||x.address))}</div><div class="store-tags">${presentation.services(x).map(t=>`<span>${esc(t)}</span>`).join('')}</div><div class="store-price"></div></div></article>`).join('');
  if(selection.estoreFirst){const wrap=document.querySelector('.store-section');wrap.classList.add('demo13-no-stores');const empty=document.createElement('div');empty.className='demo13-empty show';empty.innerHTML='<strong>考拉E存 · 上门取送</strong><small>当前城市暂无可展示的门店仓位。可了解适用范围，由顾问确认服务方案。</small><div><button type="button" data-h="estore">了解考拉E存</button><button type="button" data-h="booking">预约咨询</button></div>';document.getElementById('storeRail').after(empty);}
  const reference=document.querySelector('.section-heading p');if(reference)reference.textContent='12个月立方参考价';if(reference)reference.title='12个月租期的每立方米月参考价，非整期报价';
  function prices(){const allowed=true;document.querySelectorAll('#storeRail .store-price').forEach((el,i)=>{const p=presentation.cubicReference(stores[i]);el.innerHTML=allowed&&p?`<b>${p.money}</b><small>${p.unit}</small>`:'<small>暂无参考价</small>';});persist();}
  prices();setInterval(prices,1000);
  const snapshot=core.state(),latest=snapshot.orders.filter(o=>['pending','paid_simulated'].includes(o.status)).at(-1),lead=[...snapshot.leads,...snapshot.enterpriseLeads].filter(l=>l.status!=='withdrawn').at(-1);const task=document.createElement('section');task.className='lifecycle-home-task';const service=latest?snapshot.services[latest.id]:null;const stateText=latest?.status==='pending'?'待支付订单':latest?.status==='paid_simulated'?(service?.exit?'退租与押金进度':service?.identity!=='verified'?'完成验证，准备入仓':(()=>{const end=new Date(latest.start_date+'T00:00:00Z');end.setUTCMonth(end.getUTCMonth()+latest.term_months+(service?.renewals||[]).reduce((n,p)=>n+p.months,0));return end-Date.now()<=14*86400000?'租期即将到期，查看续租':'我的在租仓位';})()):lead?'查看已保存的用仓需求':snapshot.requirement.capacity_m3?'继续查看已估算方案':'';if(stateText){task.innerHTML='<b>'+stateText+'</b><a href="'+(latest?'account.html?view=order&id='+latest.id:lead?'account.html?view=needs':'index.html?page=S5')+'">继续办理 ›</a>';document.querySelector('.store-section').before(task);}const brand=document.createElement('a');brand.className='brand-details-link';brand.href='account.html?view=brand';brand.textContent='了解考拉服务与存放说明 ›';document.querySelector('.below-editable').appendChild(brand);
  const overlay=document.createElement('div');overlay.className='demo12-overlay';overlay.hidden=true;overlay.innerHTML='<section class="demo12-dialog" role="dialog" aria-modal="true" aria-labelledby="home-dialog-title"><h3 id="home-dialog-title"></h3><div id="home-dialog-content"></div><div class="demo12-buttons"><button type="button" class="muted" data-h="close">关闭</button></div></section>';phone.appendChild(overlay);
  const option=(action,text,value='',primary=false)=>`<button class="home-option ${primary?'primary':''}" type="button" data-h="${action}" data-value="${esc(value)}">${esc(text)}</button>`;
  function show(title,html){document.getElementById('home-dialog-title').textContent=title;document.getElementById('home-dialog-content').innerHTML=html;overlay.hidden=false;}
  function close(){if(core.state().auth.status==='pending')core.resolvePhone('denied');overlay.hidden=true;persist();}
  function go(url){persist();location.href=url;}
  function orderMenu(){show('预约与下单','<p>预约用仓只需填写地址；立即下单先选择合适的仓位。</p>'+option('booking','预约用仓','',true)+option('quick','立即下单'));}
  function entry(scene){sessionStorage.removeItem('mk_estimate_return_v4');sessionStorage.setItem('mk_entry_context_v3',JSON.stringify({scene,source:'home',id:Date.now()}));go('cap.html');}
  function dispatch(a){
    if(a==='首页')return;
    if(a.includes('城市')||a.includes('搜索')){show('城市与门店搜索','<label for="home-city">选择城市</label><select id="home-city" aria-label="选择城市">'+['北京','上海','深圳','广州'].map(x=>`<option ${core.state().city===x?'selected':''}>${x}</option>`).join('')+'</select><label for="home-search">门店或区域</label><input id="home-search" aria-label="搜索门店或区域" placeholder="输入门店名或区域">'+option('search','查看门店','',true));return;}
    if(a.includes('估大小')){entry(null);return;}
    if(/搬家过渡|装修暂存|行李寄存|换季收纳|兴趣收藏|闲置物品/.test(a)){entry(a.split(' →')[0]);return;}
    if(a.includes('预约订单')){orderMenu();return;}
    if(a.includes('企业用仓')){sessionStorage.removeItem('mk_estimate_return_v4');go('business.html');return;}
    if(a.includes('附近门店')||a.includes('全部门店')){go('index.html?page=S01');return;}
    if(a.includes('消息')){go('account.html?view=messages');return;}
    if(a.includes('我的')){go('account.html');return;}if(a.includes('品牌')||a.includes('了解考拉')){go('account.html?view=brand');return;}
    const proofs=[['高新','proof1','高新技术企业资料'],['CCTV','proof2','CCTV报道资料'],['国标','proof3','国标起草资料']];
    const proof=proofs.find(x=>a.includes(x[0]));if(proof){show(proof[2],`<img src="${document.getElementById(proof[1]).src}" alt="${proof[2]}"><p>沿用签收稿的历史品牌展示素材，未在本批重新核实资质现状。</p>`);return;}
  }
  document.addEventListener('click',e=>{
    const h=e.target.closest('[data-h]');if(h){e.preventDefault();const a=h.dataset.h;
      if(a==='close')close();if(a==='booking')go('index.html?page=BOOKING');if(a==='quick')go('index.html?page=QUICK');
      if(a==='estore'){sessionStorage.setItem('mk_advisor_context_v3',JSON.stringify({service_source:'estore',capacity_hint:core.state().requirement.capacity_m3?(core.state().requirement.capacity_m3+'m³'):'',term_hint:core.state().requirement.term_confirmed?(core.state().requirement.term_months+'个月'):''}));go('index.html?page=BOOKING&mode=advisor');}
      if(a==='revoke'){core.revokePhone();persist();prices();details.open=false;}
      if(a==='search'){const c=document.getElementById('home-city').value;if(c!==core.state().city)core.setCity(c);const v=read('mk_visual_align_ui_v1')||{};v.keyword=document.getElementById('home-search').value.trim();sessionStorage.setItem('mk_visual_align_ui_v1',JSON.stringify(v));go('index.html?page=S01');}return;
    }
    const card=e.target.closest('[data-sim-store]');if(card){e.preventDefault();core.setStore(card.dataset.simStore);core.setReturn('S01');go('index.html?page=S02&store='+card.dataset.simStore);return;}
    const b=e.target.closest('[data-action]');if(b){e.preventDefault();dispatch(b.dataset.action);}
  });
  document.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.matches('[data-sim-store]')){e.preventDefault();e.target.click();}if(e.key==='Escape')close();});
  window.addEventListener('pagehide',persist);
})();
