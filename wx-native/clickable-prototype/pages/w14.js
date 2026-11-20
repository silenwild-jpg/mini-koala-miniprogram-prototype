/* W14（张坤 2026-11-18 裁定 D-122～D-130）· 在各页渲染脚本与 w9-auth.js 之后加载
 * 1. 仓位层标签（D-123）：上下叠放的仓位在仓号旁显示「所在层/总层数」，独立单仓不显示；不单独占行。
 *    ?floor=spec|thumb 只用于布局方式对比（正式方案 = 默认，标签跟在仓号与容量之后）。
 * 2. 到店指引复用（D-124）：订单详情 O03、入仓指引 ACC access 复用 S02 的同一份到店档案（model/arrival-demo.js，演示数据）。
 * 3. 全站唯一的「用仓位置」（D-127）：首页 / 门店列表顶栏城市位、仓位推荐「用仓位置」行、快捷下单「用仓位置」行读写同一个状态、打开同一个面板。
 *    面板 A 期（D-130，不接地图）：门店字段搜索、当前位置、最近使用、城市、按区域 / 按商圈（带门店数，D-129 商圈名取门店数据）、无结果承接。
 *    ?auth=search_off|search_on|search_typing|search_empty|loc_area|loc_far（H01 / S01 / S5 / QUICK）；S5 ?overlay=origin、QUICK ?overlay=city 打开同一面板。
 *    W26：transport_noloc（S01）= 没有用仓位置时点「免费运输」→ 打开本面板并说明原因；search_move = 搬家场景进入时，「最近使用」下提示搬出地 / 搬入地可切换对比。
 *    loc_far = 已定位但 5km 内没有门店（D-128）。公里数仍是演示值（D-111）。 */
(function(){
'use strict';
const q=new URLSearchParams(location.search),auth=q.get('auth')||'',ov=q.get('overlay')||'';
const PAGE=document.body.dataset.page||'',F=window.SIM_FIXTURES,W=window.MK_W7;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $el=h=>{const t=document.createElement('template');t.innerHTML=h.trim();return t.content.firstElementChild;};
const screen=document.getElementById('screen');
let ovr=document.getElementById('overlay-root');if(!ovr){ovr=$el('<div id="overlay-root"></div>');document.body.append(ovr);}
const svg=(d,cls)=>'<svg class="'+(cls||'ico sm')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';
const I={pin:'<path d="M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11Z"/><circle cx="12" cy="10" r="2.2"/>',close:'<path d="M6 6l12 12M18 6 6 18"/>',chev:'<path d="m9 6 6 6-6 6"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',nav:'<path d="M20 4 4 11l8 1 1 8z"/>',store:'<path d="M4 10 5.5 4h13L20 10M4 10v10h16V10M4 10h16M9 20v-6h6v6"/>'};

/* ================= 1. 仓位层标签 ================= */
const tierTag=id=>{const t=W.unitTier({id});return t?'<span class="tag tier" aria-label="'+esc(t.aria)+'">'+esc(t.label)+'</span>':'';};
const FV=q.get('floor')||'name';
if(PAGE==='S02'){
  document.querySelectorAll('.urow[data-unit]').forEach(r=>{const t=W.unitTier({id:r.dataset.unit});if(!t)return;r.dataset.tier=t.label;
    if(FV==='spec'){const s=r.querySelector('.spec');if(s)s.append(' · '+t.label);}
    else if(FV==='thumb'){r.classList.add('w14rel');r.querySelector('.ph')?.after($el('<span class="tag tier onph" aria-label="'+esc(t.aria)+'">'+esc(t.label)+'</span>'));}
    else r.querySelector('.name')?.insertAdjacentHTML('beforeend',tierTag(r.dataset.unit));});
}
if(PAGE==='S01'||PAGE==='S5'){
  /* 门店卡里的仓位行：标签跟在容量后面，和「大一档」「赠送 N 个月」同一种行内标签 */
  document.querySelectorAll('.scard .unit').forEach(u=>{let f=u.nextElementSibling;while(f&&!f.classList.contains('foot'))f=f.nextElementSibling;
    const b=f&&f.querySelector('[data-value]'),ids=b?String(b.dataset.value).split(','):[];if(ids.length!==1)return;
    const bs=u.querySelectorAll(':scope > b');if(bs[1]&&W.unitTier({id:ids[0]}))bs[1].insertAdjacentHTML('afterend',tierTag(ids[0]));});
}
if(PAGE==='QUICK'){
  const sid=(F.stores.find(s=>document.querySelector('.lrow.pick .n')?.textContent===s.name)||F.stores[0]).id;
  document.querySelectorAll('.opt.cmp b').forEach(b=>{const cabin=b.textContent.split(' · ')[0],u=F.units.find(x=>x.store_id===sid&&(x.demo_cabin_no||x.code)===cabin);if(u&&W.unitTier(u))b.insertAdjacentHTML('beforeend',tierTag(u.id));});
}

/* ================= 2. 到店指引复用 ================= */
const A=window.MK_ARRIVAL_DEMO&&window.MK_ARRIVAL_DEMO[q.get('arrival')||'complex'];
if(A&&PAGE==='ACC'&&document.body.dataset.view==='access'&&['identity_required','before_start','allowed'].includes(document.body.dataset.state)){
  const sum=document.querySelector('#body .sumcard');
  if(sum){
    const row=r=>'<div class="arr-row'+(r[2]?' key':'')+'"><span class="k">'+esc(r[0])+'</span><span class="v">'+esc(r[1])+'</span></div>';
    sum.after($el('<section class="card w14arr" aria-label="到店与进仓"><div class="sec-title withlk">到店与进仓<a class="lk" href="s02.html?state=route">门店到店指引'+svg(I.chev,'ico sm')+'</a></div>'+A.entry.map(row).join('')+
      (A.steps.length?'<div class="sub">进仓路径</div><ol class="arr-steps">'+A.steps.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol>':A.path?'<div class="sub">进仓路径</div><p class="arr-path">'+esc(A.path)+'</p>':'')+
      (A.facts.length?'<div class="arr-facts">'+A.facts.map(f=>'<span>'+esc(f[0])+'<b>'+esc(f[1])+'</b></span>').join('')+'</div>':'')+
      '<div class="acts"><button type="button" class="btn secondary md" data-action="navigate">'+svg(I.nav,'ico sm')+'到店导航</button></div></section>'));
    /* 「到达门店」这一步不再重复地址，指向上面的到店信息 */
    const s0=document.querySelector('#body ol.steps li .s');if(s0&&s0.textContent.includes('存取时间'))s0.textContent=s0.textContent.replace(/^.*?·\s*/,'');
  }
}
if(A&&PAGE==='O03'){
  const grid=document.querySelector('.storesvc .svc-grid');
  if(grid&&grid.querySelector('[data-action="navigate"]')){
    const e=A.entry[0];
    grid.after($el('<a class="w14arrline" href="acc.html?view=access&state=allowed" data-action="access" aria-label="查看到店与进仓指引">'+svg(I.pin)+'<span class="b"><b>到店与进仓指引</b><span>'+esc(A.mapNote||e[1])+'</span>'+(A.note?'<span>'+esc(A.note)+'</span>':'')+'</span>'+svg(I.chev,'ico sm chev')+'</a>'));
  }
}

/* ================= 3. 用仓位置 ================= */
const LOCPAGES=['H01','S01','S5','QUICK'];
if(!LOCPAGES.includes(PAGE))return;
const CITY=((document.getElementById('city')||{}).textContent||(document.getElementById('origin')||{}).textContent||'北京').split(' ')[0];
const open=F.stores.filter(s=>(s.city||'').replace(/市$/,'')===CITY&&s.status==='open');
const tally=fn=>{const m=new Map();open.forEach(s=>{const k=fn(s);if(k)m.set(k,(m.get(k)||0)+1);});return [...m.entries()].sort((a,b)=>b[1]-a[1]);};
const DIST=tally(W.districtOf),AREA=tally(W.areaOf);
const setOrigin=label=>{const c=document.getElementById('city');if(c)c.textContent=label;const o=document.getElementById('origin');if(o)o.textContent=CITY+' · '+label;};

function panel(o){o=o||{};
  const sb=screen.querySelector('.statusbar');const top=sb?sb.getBoundingClientRect().bottom:44;
  if(sb){sb.style.zIndex=21;sb.style.background='#fff';sb.style.color='var(--mk-color-ink-primary)';if(getComputedStyle(sb).position==='static')sb.style.position='relative';}
  const chip=(x,n,act,on)=>'<button type="button" class="chip'+(on?' on':'')+'" data-action="'+act+'" data-value="'+esc(x)+'"'+(n?' aria-label="'+esc(x)+'，'+n+' 家门店"':'')+'>'+esc(x)+(n?'<i>'+n+'</i>':'')+'</button>';
  const input=o.query?'<span class="ph filled">'+esc(o.query)+'</span><button type="button" class="clr" data-action="clearQuery" aria-label="清空输入">'+svg(I.close,'ico sm')+'</button>':'<span class="ph">搜索门店、商圈或区域</span>';
  let h='<div class="w12search" role="dialog" aria-modal="true" aria-label="选择用仓位置" style="top:'+top+'px"><div class="w12sbar"><div class="search focus">'+svg(I.search)+input+'</div><button type="button" class="btn text sm" data-action="close">取消</button></div>'+(o.note?'<p class="w26pnote" role="status">'+esc(o.note)+'</p>':'');
  if(o.query){
    const k=o.query,areas=AREA.filter(a=>a[0].includes(k)),dists=DIST.filter(a=>a[0].includes(k)),stores=open.filter(s=>[s.name,s.community,s.address].some(v=>String(v||'').includes(k))).slice(0,6);
    const res=(icon,t,s,act,v)=>'<button type="button" class="w14res" data-action="'+act+'" data-value="'+esc(v)+'">'+svg(icon)+'<span class="b"><b>'+esc(t)+'</b><span>'+esc(s)+'</span></span>'+svg(I.chev,'ico sm chev')+'</button>';
    if(areas.length||dists.length||stores.length){
      if(areas.length||dists.length)h+='<h5>商圈与区域</h5>'+areas.map(a=>res(I.pin,a[0],'商圈 · '+a[1]+' 家门店','area',a[0])).join('')+dists.map(a=>res(I.pin,a[0],'区域 · '+a[1]+' 家门店','district',a[0])).join('');
      if(stores.length)h+='<h5>门店</h5>'+stores.map(s=>res(I.store,s.name,[W.districtOf(s),s.community].filter(Boolean).join(' · '),'store',s.id)).join('');
    }else{
      h+='<div class="w14none" role="status"><b>没有找到「'+esc(k)+'」相关的门店或商圈</b><span>目前可以搜索门店名、商圈、区域和门店所在小区。</span></div>'+
        '<h5>'+esc(CITY)+' · 有门店的商圈</h5><div class="w12chips">'+AREA.slice(0,8).map(a=>chip(a[0],a[1],'area')).join('')+'</div>'+
        '<h5>其他方式</h5><a class="w14res" href="estore.html">'+svg(I.store)+'<span class="b"><b>考拉E存</b><span>上门取送，不需要到店</span></span>'+svg(I.chev,'ico sm chev')+'</a>'+
        '<a class="w14res" href="booking.html?mode=advisor">'+svg(I.pin)+'<span class="b"><b>留下用仓需求</b><span>顾问电话与您确认可行的方案</span></span>'+svg(I.chev,'ico sm chev')+'</a>';
    }
  }else{
    h+=o.located
      ?'<div class="w12locrow">'+svg(I.pin)+'<div class="tx"><b>朝阳区 安贞附近</b><span>当前位置</span></div><button type="button" class="btn text sm" data-action="relocate">重新定位</button></div>'
      :'<div class="w12locrow">'+svg(I.pin)+'<div class="tx"><b>使用当前位置</b><span>开启定位后按距离排序</span></div><button type="button" class="btn text sm" data-action="enableLocation">开启</button></div>';
    /* 最近使用：最近 3 个，存本机，不需要登录 */
    h+='<h5 class="withact">最近使用<button type="button" class="btn text sm" data-action="clearRecent">清除</button></h5><div class="w12chips">'+[['望京','area'],['安贞·富仁名苑店','store'],['朝阳区','district']].map(r=>chip(r[0],0,r[1])).join('')+'</div>'+(o.move?'<p class="w26pnote soft" role="note">搬家用仓：搬出地、搬入地都可以查。先选一处，另一处会留在「最近使用」，可随时切换对比。</p>':'');
    h+='<h5>城市</h5><div class="w12chips">'+['北京','上海','深圳','杭州','广州'].map(c=>chip(c,0,'city',c===CITY&&!o.sel)).join('')+'</div>';
    if(DIST.length)h+='<h5>'+esc(CITY)+' · 按区域</h5><div class="w12chips">'+DIST.map(a=>chip(a[0],a[1],'district',a[0]===o.sel)).join('')+'</div>';
    if(AREA.length){const n=o.allAreas?AREA.length:8;h+='<h5>'+esc(CITY)+' · 按商圈</h5><div class="w12chips">'+AREA.slice(0,n).map(a=>chip(a[0],a[1],'area',a[0]===o.sel)).join('')+(AREA.length>n?'<button type="button" class="chip more" data-action="allAreas" aria-expanded="false">全部 '+AREA.length+' 个商圈</button>':'')+'</div>';}
  }
  ovr.append($el(h+'</div>'));
}
const quiet=()=>{try{window.MK_W9&&window.MK_W9.LOC.loc_quiet();}catch(_){}};
if(auth==='search_off'){quiet();panel({located:false});}
else if(auth==='search_on')panel({located:true});
else if(auth==='search_typing'){panel({query:'望京'});}
else if(auth==='search_empty'){panel({query:'天通苑'});}
else if(auth==='search_move')panel({located:true,move:true}); /* W26 A8：搬家两个地址，复用「最近使用」，用仓位置仍只有一个（D-127） */
else if(auth==='transport_noloc'&&PAGE==='S01'){quiet();panel({located:false,note:'免费运输按用仓位置到门店的距离判断，请先选择用仓位置。'});} /* W26 A3 */
else if((PAGE==='S5'&&ov==='origin')||(PAGE==='QUICK'&&ov==='city'))panel({located:true});

/* 选了区域 / 商圈之后：四处入口显示同一个用仓位置 */
if(auth==='loc_area'){
  const sel='朝阳区',n=(DIST.find(a=>a[0]===sel)||[0,0])[1];setOrigin(sel);
  document.querySelector('.topbar .city')?.setAttribute('aria-label','用仓位置 '+CITY+' '+sel);
  if(PAGE==='S01'){
    const cards=[...document.querySelectorAll('#list .scard')];cards.forEach(c=>{const s=F.stores.find(x=>x.id===c.dataset.store);if(s&&W.districtOf(s)!==sel)c.remove();});
    const left=document.querySelectorAll('#list .scard').length,rl=document.getElementById('result-line');if(rl)rl.textContent=sel+' · 共'+n+'家门店'+(left<n?' · 已显示前'+left+'家':'');
  }
}
/* 已定位，5km 内没有门店（D-128）：给最近的 3 家 + 考拉E存 + 留下需求 */
if(auth==='loc_far'&&PAGE==='S01'){
  const KM=W.NEARBY_KM,cards=[...document.querySelectorAll('#list .scard')];
  cards.slice(3).forEach(c=>c.remove());
  ['6.3km','7.8km','9.1km'].forEach((k,i)=>{const b=cards[i]&&cards[i].querySelector('.meta b');if(b)b.textContent=k;}); /* 演示：用户位于门店 5km 之外，公里数为演示值 */
  const rl=document.getElementById('result-line');if(rl){rl.classList.add('w14far');rl.setAttribute('role','status');rl.innerHTML='<b>附近 '+KM+'km 内暂无门店</b>以下是离您最近的 3 家';}
  const list=document.getElementById('list');
  if(!list.querySelector('.ecard'))list.append($el('<a class="card ecard" href="estore.html"><div><div class="k">不方便到店</div><div class="t">考拉E存</div><div class="sub">上门取送，不需要到店</div><div class="a">了解考拉E存 ›</div></div><img src="../assets/mini_split.jpg" alt="考拉E存上门取送服务"></a>'));
  list.append($el('<div class="card advisor" data-w7="advisor"><div><div class="t">留下用仓需求</div><div class="s">顾问电话与您确认可行的方案</div></div><a class="btn secondary md" href="booking.html?mode=advisor" data-action="advisor">预约顾问</a></div>'));
  const mr=document.querySelector('#more-row .btn');if(mr)mr.textContent='查看全部门店';
}
window.__W14={page:PAGE,auth,city:CITY,districts:DIST,areas:AREA,nearbyKm:W.NEARBY_KM};
})();
