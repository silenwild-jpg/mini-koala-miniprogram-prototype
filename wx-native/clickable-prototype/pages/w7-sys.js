/* W7-A · 全站系统状态层（R-A-20 / R-B-34）
 * 任意页面追加 ?sys=loading | error | offline | unit_gone
 *   loading   骨架屏（aria-busy），底部操作区隐藏
 *   error     服务错误：加载失败 + 重新加载
 *   offline   网络错误：网络未连接 + 重新加载
 *   unit_gone 仓位失效（QUICK / S02 / O01 前置）：顶部提示 + 主按钮禁用，引导重新选仓
 * 只替换内容区，状态栏 / 顶栏 / TabBar 保留，返回路径不丢。 */
(function(){
  const sys=new URLSearchParams(location.search).get('sys');if(!sys)return;
  const el=h=>{const t=document.createElement('template');t.innerHTML=h.trim();return t.content.firstElementChild;};
  const ico=id=>'<svg class="ico" aria-hidden="true"><use href="#'+id+'"/></svg>';
  const SVG_ERR='<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.4v.1"/></svg>';
  const SVG_OFF='<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9.2a13.5 13.5 0 0 1 4.2-2.6M10.6 5.6A13.6 13.6 0 0 1 21 9.2M6.2 12.6a9 9 0 0 1 3.4-2M13.8 10.4a9 9 0 0 1 4 2.2M9.4 16a4.2 4.2 0 0 1 5.2 0M12 19.4v.1M4 4l16 16"/></svg>';
  const screen=document.getElementById('screen');if(!screen)return;
  const KEEP='.statusbar,.topbar,.tabbar,header,nav,svg,#overlay-root,#toast-root,#actbar-root,script';
  function content(){
    let host=document.getElementById('body');
    if(host){host.replaceChildren();return host;}
    [...screen.children].forEach(c=>{if(c.matches(KEEP))return;
      if(c.querySelector(':scope > .statusbar, :scope > .topbar')){[...c.children].forEach(g=>{if(!g.matches(KEEP))g.style.display='none';});c.style.background='none';c.style.minHeight=(Math.max(0,...[...c.querySelectorAll(':scope > .statusbar, :scope > .topbar')].map(x=>x.offsetTop+x.offsetHeight))+8)+'px';c.querySelectorAll(':scope > .statusbar.overlay').forEach(x=>x.classList.remove('overlay'));} /* W24：首页状态栏 / 顶栏在 .hero-wrap 内，只隐藏其余内容 */
      else c.style.display='none';});
    screen.querySelectorAll('.topbar:not(.page):not(.title):not(.home)').forEach(c=>c.style.display='none'); /* S01 搜索行随内容区一起替换 */
    host=el('<div class="stack w7sys" style="padding:8px 0 0"></div>');
    const tab=screen.querySelector('.tabbar');tab?screen.insertBefore(host,tab):screen.append(host);return host;
  }
  function dropActbar(){const r=document.getElementById('actbar-root');if(r)r.replaceChildren();screen.classList.remove('has-actbar');screen.querySelectorAll('.actbar').forEach(a=>a.remove());}
  document.body.dataset.sys=sys;
  if(sys==='loading'){
    const host=content();dropActbar();document.body.setAttribute('aria-busy','true');
    const card=(n)=>'<section class="card w7sk" aria-hidden="true"><div class="sk" style="height:18px;width:46%"></div>'+Array.from({length:n},(_,i)=>'<div class="sk" style="height:14px;width:'+[92,78,64,85][i%4]+'%;margin-top:12px"></div>').join('')+'</section>';
    host.append(el('<div class="w7sysbox" role="status" aria-label="正在加载">'+card(2)+card(3)+card(3)+'</div>'));
  }else if(sys==='error'||sys==='offline'){
    const host=content();dropActbar();
    const off=sys==='offline';
    host.append(el('<section class="card empty w7err" role="alert"><div class="pic">'+(off?SVG_OFF:SVG_ERR)+'</div><h4>'+(off?'网络未连接':'加载失败')+'</h4><p>'+(off?'请检查网络设置后重试。':'服务暂时不可用，请稍后重试。')+'</p><div class="acts"><button type="button" class="btn primary md" data-action="reload">重新加载</button></div></section>'));
  }else if(sys==='unit_gone'){
    const host=document.getElementById('body')||document.getElementById('content')||screen;
    const n=el('<section class="notice err w7gone" role="alert"><div class="t">所选仓位已不可租</div><div class="s">该仓位刚被租出或已下架，请重新选择仓位。</div></section>');
    host===screen?screen.insertBefore(n,screen.querySelector('.topbar,header')?.nextSibling||null):host.prepend(n);
    document.querySelectorAll('.actbar .btn.primary').forEach(b=>{b.classList.add('disabled');b.setAttribute('aria-disabled','true');b.textContent='请重新选择仓位';});
  }
  document.addEventListener('click',e=>{if(e.target.closest('[data-action=reload]')){const u=new URL(location.href);u.searchParams.delete('sys');location.replace(u);}});
  window.__W7SYS={sys};
})();
