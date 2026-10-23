(function(){
  const params=new URLSearchParams(location.search);
  const enabled=params.get('salesShare')==='1'||params.get('source')==='sales_chat';
  const type=params.get('shareType')||'';
  const shareId=params.get('shareId')||'';
  const advisor=params.get('advisor')||'考拉顾问';
  const titles={estimate:'顾问为您整理的空间估算',stores:'顾问为您筛选的门店',store:'顾问推荐的门店',unit:'顾问推荐的仓位'};

  function append(target){
    if(!enabled)return target;
    const q=target instanceof URLSearchParams?target:new URLSearchParams(target||'');
    q.set('salesShare','1');
    q.set('source','sales_chat');
    if(shareId)q.set('shareId',shareId);
    q.set('advisor',advisor);
    return q;
  }
  function nextType(next){
    if(!enabled)return '';
    if(next==='stores')return 'stores';
    if(next==='store')return 'store';
    if(next==='unit')return 'unit';
    return type;
  }
  function showMessage(message){
    if(typeof window.toast==='function'){window.toast(message);return}
    const old=document.querySelector('.sales-share-toast');if(old)old.remove();
    const el=document.createElement('div');el.className='sales-share-toast';el.textContent=message;
    (document.querySelector('.phone,.shell')||document.body).appendChild(el);
    requestAnimationFrame(()=>el.classList.add('show'));
    setTimeout(()=>el.remove(),1900);
  }
  function init(){
    if(!enabled)return;
    document.body.classList.add('sales-share-mode');
    const style=document.createElement('style');
    style.textContent=`
      .sales-share-mode .review,.sales-share-mode .demo-state-toggle{display:none!important}
      .sales-share-mode .tabbar{display:none!important}
      .sales-share-mode .page{padding-bottom:18px}
      .sales-share-mode:has(.bottombar) .page,.sales-share-mode:has(.bottom) .page{padding-bottom:92px}
      .sales-share-banner{margin:10px 12px 4px;padding:11px 12px;border:1px solid #bfd6c8;border-radius:14px;background:#eef7f1;color:#17251d;display:flex;align-items:center;justify-content:space-between;gap:10px;box-sizing:border-box}
      .sales-share-banner .sales-share-copy{min-width:0}
      .sales-share-banner .sales-share-eyebrow{font-size:10px;line-height:1.2;color:#2f7d5d;font-weight:800;margin-bottom:4px}
      .sales-share-banner b{display:block;font-size:13px;line-height:1.35}
      .sales-share-banner span{display:block;margin-top:3px;color:#66746c;font-size:10px;line-height:1.45}
      .sales-share-banner button{flex:0 0 auto;min-height:36px;padding:0 11px;border:1px solid #9dbdab;border-radius:10px;background:#fff;color:#2f7d5d;font-size:11px;font-weight:800;cursor:pointer}
      .sales-share-toast{position:absolute;left:50%;bottom:88px;transform:translate(-50%,8px);opacity:0;z-index:200;background:#24322a;color:#fff;padding:9px 12px;border-radius:10px;font-size:11px;white-space:nowrap;transition:.18s ease}
      .sales-share-toast.show{opacity:1;transform:translate(-50%,0)}
    `;
    document.head.appendChild(style);
    const header=document.querySelector('.header,.nav');
    if(!header)return;
    const banner=document.createElement('section');banner.className='sales-share-banner';banner.setAttribute('aria-label','顾问分享说明');
    const copy=document.createElement('div');copy.className='sales-share-copy';
    const eyebrow=document.createElement('div');eyebrow.className='sales-share-eyebrow';eyebrow.textContent=`${advisor} · 聊天方案`;
    const title=document.createElement('b');title.textContent=titles[type]||'顾问为您整理的方案';
    const note=document.createElement('span');note.textContent='已带入沟通中的需求，您仍可自行修改和比较。';
    const consult=document.createElement('button');consult.type='button';consult.textContent='继续咨询';
    copy.append(eyebrow,title,note);banner.append(copy,consult);header.insertAdjacentElement('afterend',banner);
    consult.onclick=()=>{
      const target=document.querySelector('#advisor,#consultBtn,#consult');
      if(target&&target.offsetParent!==null){target.click();return}
      showMessage('可返回聊天继续联系顾问');
    };
  }
  window.MINI_STORAGE_SALES_SHARE={enabled,type,shareId,advisor,append,nextType,showMessage};
  init();
})();
