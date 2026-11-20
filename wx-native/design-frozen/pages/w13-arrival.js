/* W13 → W14 · S02 到店信息布局（张坤 2026-11-18 裁定 D-122，已并入正式设计稿）
 * 默认档案 complex；?arrival=simple|transit|partial 切换；[&open=dest|guide|transit] [&map=fail]
 * 本层在 w2-render.js 渲染完成后改写：门店头部（地址两行 + 到店须知）、服务设施 Tab、到店指引 Tab。
 * ARRIVAL 里的到店事实全部是演示数据，用来验证版式能否装下三类门店，不对应任何已核实门店，上线前须逐店替换。 */
(function(){
'use strict';
const q=new URLSearchParams(location.search),key=q.get('arrival')||'complex';
if(document.body.dataset.page!=='S02')return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const el=h=>{const t=document.createElement('template');t.innerHTML=h.trim();return t.content.firstElementChild;};
const ico=(id,cls='ico')=>'<svg class="'+cls+'"><use href="#'+id+'"/></svg>';

const ARRIVAL=window.MK_ARRIVAL_DEMO;
const A=ARRIVAL[key];
if(!A){document.body.prepend(el('<p style="padding:16px;color:#B42318">未知到店档案 '+esc(key)+'；可用：'+Object.keys(ARRIVAL).join(' / ')+'</p>'));return;}

function mapHtml(fail){
  if(fail)return '<div class="arr-map fail" role="status"><div class="t">地图暂时无法加载</div><div><button type="button" class="btn text md" data-arr="retry">重新加载</button><button type="button" class="btn text md" data-arr="nav">到店导航</button></div></div>';
  /* 位置示意：静态图，不可拖拽；整块点击 = 到店导航 */
  const bg='<svg class="bg" viewBox="0 0 343 144" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="343" height="144" fill="#F5F7F6"/><path d="M-10 118H360M-10 36H360M70 -10V160M262 -10V160" stroke="#fff" stroke-width="12"/><path d="M150 36V118M70 78H150" stroke="#fff" stroke-width="6"/><rect x="164" y="50" width="84" height="54" rx="4" fill="#E3E8E5"/><rect x="84" y="50" width="52" height="20" rx="4" fill="#E3E8E5"/><rect x="278" y="50" width="52" height="54" rx="4" fill="#E3E8E5"/><rect x="-6" y="50" width="62" height="54" rx="4" fill="#E3E8E5"/></svg>';
  return '<div class="arr-mapwrap"><button type="button" class="arr-map" data-arr="nav" aria-label="查看门店位置并导航">'+bg+'<span class="lab">位置示意</span>'+A.pins.map(p=>'<span class="pin'+(p.car?' car':'')+'" style="left:'+p.x+'%;top:'+p.y+'%"><b>'+esc(p.label)+'</b>'+ico('i-pin')+'</span>').join('')+'</button><button type="button" class="btn secondary arr-go" data-arr="nav">'+ico('i-nav')+'到店导航</button></div>';
}
const row=r=>'<div class="arr-row'+(r[2]?' key':'')+'"><span class="k">'+esc(r[0])+'</span><span class="v">'+esc(r[1])+'</span></div>';
const ph=(t)=>'<div class="arr-ph" role="img" aria-label="'+esc(t)+'照片占位">'+ico('i-cam')+'<span>'+esc(t)+'</span><span>照片待门店提供</span></div>';

function routeTab(){
  const open=q.get('open'),fail=q.get('map')==='fail',address=document.querySelector('.s02head .addr .ellip')?.textContent||'';
  let h='<div class="arr" data-arr-root="route">';
  h+=mapHtml(fail);
  h+='<div class="arr-mapbar"><span class="t">'+esc(A.mapNote||address)+'</span><button type="button" class="btn text sm" data-arr="copy">复制地址</button></div>';
  h+='<section class="arr-sec" id="arr-entry"><h3>入口与停车卸货</h3>'+A.entry.map(row).join('')+'</section>';
  if(A.steps.length||A.path){
    h+='<section class="arr-sec" id="arr-path"><h3>进仓路径</h3>';
    h+=A.steps.length?'<ol class="arr-steps">'+A.steps.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol>':'<p class="arr-path">'+esc(A.path)+'</p>';
    if(A.facts.length)h+='<div class="arr-facts">'+A.facts.map(f=>'<span>'+esc(f[0])+'<b>'+esc(f[1])+'</b></span>').join('')+'</div>';
    const HAS_PHOTO=A.photos.some(p=>p[2]); /* W22：没有门店实拍照片时不显示照片位，文字指引照常 */
    if(HAS_PHOTO&&A.photos.length>1&&open==='guide')h+='<div class="arr-gallery">'+A.photos.map(p=>'<figure>'+ph(p[0])+'<figcaption>'+esc(p[1])+'</figcaption></figure>').join('')+'</div><div class="arr-more"><button type="button" class="btn text sm" data-arr="guide" aria-expanded="true">收起</button></div>';
    else if(HAS_PHOTO&&A.photos.length)h+='<button type="button" class="arr-photo" data-arr="guide" aria-expanded="false">'+ph(A.photos[0][0])+'<span class="cap">'+esc(A.photos[0][1])+(A.photos.length>1?'<span class="lk">查看进仓指引（'+A.photos.length+' 张）'+ico('i-chev')+'</span>':'')+'</span></button>';
    h+='</section>';
  }
  if(A.transit.length){
    h+='<section class="arr-sec" id="arr-transit"><h3>地铁与公交</h3>'+A.transit.map(row).join('')+(open==='transit'?A.transitMore.map(row).join(''):'')+'</section>';
    if(A.transitMore.length&&open!=='transit')h+='<div class="arr-more"><button type="button" class="btn text sm" data-arr="transit" aria-expanded="false">其他到店方式</button></div>';
  }
  h+='<div class="arr-ask"><span>'+(A.ask?'停车、卸货和进仓路径可向门店确认':'对到店方式有疑问？')+'</span><a class="btn '+(A.ask?'secondary':'text')+' sm" href="tel:4000358885" data-arr="ask">咨询到店方式</a></div>';
  h+='</div>';
  return h;
}

function svcTab(hours,transportEntry){
  const S=A.svc,r=(i,k,v)=>'<div class="arr-frow">'+ico(i)+'<span class="k">'+esc(k)+'</span><span class="v">'+esc(v)+'</span></div>';
  let h='<div class="arr-svc" data-arr-root="services">';
  h+='<section class="arr-sec"><h3>存取与安防</h3>'+r('i-clock','存取时间',hours+'，每日')+r('i-shield','进门方式','一键开锁（暂未开通），租后在「我的仓位」操作')+r('i-cam','安防','全天监控，独立门锁')+'</section>';
  h+='<section class="arr-sec"><h3>仓内环境</h3>'+r('i-temp','控温防潮','仓区恒温除湿')+'</section>';
  const move=[S.lift&&r('i-elev','电梯',S.lift),S.cart&&r('i-cart','推车',S.cart),S.dock&&r('i-truck','装卸区域',S.dock),S.park&&r('i-car','停车',S.park),S.metro&&r('i-train','地铁',S.metro)].filter(Boolean);
  if(move.length)h+='<section class="arr-sec"><h3 class="withlk">到店与搬运<button type="button" class="lk" data-arr="toRoute">看路线'+ico('i-chev')+'</button></h3>'+move.join('')+'</section>';
  h+=transportEntry||'';
  return h+'</div>';
}

function destSheet(){
  return el('<div class="scrim" role="dialog" aria-modal="true" aria-label="选择导航目的地"><div class="sheet"><div class="grab"></div><h4>导航到哪个入口</h4><p class="arr-sheetnote">选择后打开地图导航</p>'+A.dests.map((d,i)=>'<button type="button" class="arr-dest" data-arr="dest" data-value="'+i+'">'+ico(d.icon)+'<span class="b"><span class="t">'+esc(d.t)+'</span><span class="s" style="display:block">'+esc(d.s)+'</span></span>'+ico('i-chev','ico chev')+'</button>').join('')+'<div class="acts"><button type="button" class="btn neutral" data-arr="close">取消</button></div></div></div>');
}

function apply(){
  document.body.dataset.arrival=key;
  const tab=document.body.dataset.tab,head=document.querySelector('.s02head>div'),content=document.getElementById('content');
  /* 头部：到店须知只放门店级、会影响选店的一条；放在地址之后、标签之前 */
  if(false&&A.note&&head){ /* W17 D-138：头部不再放到店须知；通行限制只在「到店指引」Tab 的入口与停车卸货里 */
    const addr=head.querySelector('.addr');
    addr.after(el('<button type="button" class="arr-note" data-arr="toRoute" aria-label="到店须知：'+esc(A.note)+'，查看到店指引">'+ico('i-info')+'<span class="t">'+esc(A.note)+'</span>'+ico('i-chev','ico chev')+'</button>'));
  }
  if(tab==='到店指引'){content.replaceChildren(el(routeTab()));if(q.get('open')==='dest'&&A.dests.length)document.getElementById('overlay-root').append(destSheet());}
  else if(tab==='服务设施'){
    const hours=(document.querySelector('#hours span')?.textContent||'').replace('存取时间：',''),entry=content.querySelector('.svcentry')?.outerHTML||'';
    content.replaceChildren(el(svcTab(hours,entry)));
  }
  document.body.dataset.arrivalReady='1';
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-arr]');if(!b)return;const a=b.dataset.arr,u=new URL(location.href);
  if(a==='nav'){if(A.dests.length){u.searchParams.set('open','dest');location.replace(u);}return;}
  if(a==='close'||a==='dest'){u.searchParams.delete('open');location.replace(u);return;}
  if(a==='guide'||a==='transit'){if(b.getAttribute('aria-expanded')==='true')u.searchParams.delete('open');else u.searchParams.set('open',a);location.replace(u);return;}
  if(a==='toRoute'){u.searchParams.set('state','route');u.searchParams.delete('open');location.replace(u);return;}
  if(a==='retry'){u.searchParams.delete('map');location.replace(u);return;}
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
})();
