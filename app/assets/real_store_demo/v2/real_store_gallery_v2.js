(function(){
  function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn);else fn()}
  ready(function(){
    try{
      var raw=new URLSearchParams(location.search).get('store')||'jianguo';
      var sid=raw;
      try{if(window.MINI_KOALA_DATA&&window.MINI_KOALA_DATA.resolveStoreId)sid=window.MINI_KOALA_DATA.resolveStoreId(raw)||raw}catch(e){}
      var allowed={MK_BJ_E56D0702:1,MK_BJ_E68EC5FF:1,MK_BJ_04547515:1,MK_BJ_2CDB7BEE:1,MK_BJ_9A80090D:1};
      if(!allowed[sid]){
        var aliases={jianguo:'MK_BJ_E56D0702',chaoyang:'MK_BJ_36574CE8',wangjing:'MK_BJ_2BAE933C',shuangjing:'MK_BJ_8D13DAA8',sanyuanqiao:'MK_BJ_D4462F1D'};
        sid=aliases[raw]||sid;
      }
      if(!allowed[sid])return;
      document.documentElement.setAttribute('data-real-store',sid);
      var hero=document.getElementById('hero');
      if(!hero)return;
      var tabs=[].slice.call(document.querySelectorAll('#hero .gallery-tabs button'));
      var counter=document.getElementById('photoCounter');
      if(tabs.length){
        var setS02=function(i){
          i=((Number(i)||0)%4+4)%4;
          document.documentElement.setAttribute('data-s02-photo',String(i));
          tabs.forEach(function(b,j){b.classList.toggle('active',j===i);b.setAttribute('aria-pressed',j===i?'true':'false')});
          if(counter)counter.textContent=(i+1)+' / 4';
        };
        tabs.forEach(function(b,j){b.onclick=function(ev){ev.stopPropagation();setS02(j)}});
        hero.onclick=function(ev){if(ev.target&&ev.target.closest&&ev.target.closest('button'))return;var cur=Number(document.documentElement.getAttribute('data-s02-photo')||0);setS02(cur+1)};
        setS02(0);
        return;
      }
      var unitCounter=document.getElementById('counter');
      var setU01=function(i){
        i=((Number(i)||0)%2+2)%2;
        document.documentElement.setAttribute('data-u01-photo',String(i));
        if(unitCounter)unitCounter.textContent=(i+1)+' / 2';
      };
      hero.onclick=function(){var cur=Number(document.documentElement.getAttribute('data-u01-photo')||0);setU01(cur+1)};
      setU01(0);
    }catch(e){}
  });
})();
