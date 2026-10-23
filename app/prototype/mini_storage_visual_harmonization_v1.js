(()=>{
  const ICONS={
    '🚗':'drive',
    '🚲':'bike',
    '🚶':'walk',
    '📍':'pin'
  };
  const travelType=(el)=>el?.dataset?.travel||'';
  function firstTextNode(el){
    if(!el)return null;
    for(const n of el.childNodes){if(n.nodeType===3 && n.nodeValue && n.nodeValue.trim())return n;}
    return null;
  }
  function stripDecorativeEmoji(el,hint=''){
    if(!el)return;
    const node=firstTextNode(el);
    let kind=hint;
    if(node){
      const m=node.nodeValue.match(/^\s*(🚗|🚲|🚶|📍)\s*/u);
      if(m){kind=ICONS[m[1]]||kind;node.nodeValue=node.nodeValue.replace(m[0],'');}
    }
    if(!kind)return;
    el.classList.add(`mk-icon-${kind}`);
    const hasReadableText=(el.textContent||'').trim().length>0;
    el.classList.add(hasReadableText?'mk-leading-icon':'mk-icon-only');
    el.classList.toggle('mk-icon-only',!hasReadableText);
    el.classList.toggle('mk-leading-icon',hasReadableText);
  }
  function decoratePromo(root=document){
    const selectors=['.store-tags span','.card-corner-badge','.role','#roleLabel','.kicker'];
    root.querySelectorAll(selectors.join(',')).forEach(el=>{
      if((el.textContent||'').includes('特价'))el.classList.add('mk-promo-tag');
    });
  }
  function decorateIcons(root=document){
    root.querySelectorAll('.route-icon,.pin').forEach(el=>stripDecorativeEmoji(el,el.classList.contains('pin')?'pin':''));
    root.querySelectorAll('.recommend-location span').forEach(el=>stripDecorativeEmoji(el,'pin'));
    root.querySelectorAll('#travelBtn').forEach(el=>stripDecorativeEmoji(el,travelType(el)));
    root.querySelectorAll('#routeText').forEach(el=>stripDecorativeEmoji(el));
    root.querySelectorAll('#travelSheet .option[data-travel]').forEach(el=>stripDecorativeEmoji(el,travelType(el)));
    root.querySelectorAll('#locationSheet .option').forEach(el=>stripDecorativeEmoji(el));
    root.querySelectorAll('body *').forEach(el=>{const n=firstTextNode(el);if(n&&/^\s*(🚗|🚲|🚶|📍)/u.test(n.nodeValue||''))stripDecorativeEmoji(el);});
  }
  function decorate(){decoratePromo();decorateIcons();}
  function start(){
    decorate();
    const mo=new MutationObserver(()=>decorate());
    mo.observe(document.body,{subtree:true,childList:true,characterData:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
