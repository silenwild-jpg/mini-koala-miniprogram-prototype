(function(){
  try{
    var allowed={
      MK_BJ_E56D0702:1,MK_BJ_E68EC5FF:1,MK_BJ_04547515:1,MK_BJ_2CDB7BEE:1,MK_BJ_9A80090D:1
    };
    var legacy={jianguo:'MK_BJ_E56D0702',chaoyang:'MK_BJ_36574CE8',wangjing:'MK_BJ_2BAE933C',shuangjing:'MK_BJ_8D13DAA8',sanyuanqiao:'MK_BJ_D4462F1D'};
    var raw=new URLSearchParams(location.search).get('store')||'MK_BJ_E56D0702';
    var sid=legacy[raw]||raw;
    document.documentElement.setAttribute('data-real-store',allowed[sid]?sid:'MK_BJ_E56D0702');
  }catch(e){
    document.documentElement.setAttribute('data-real-store','MK_BJ_E56D0702');
  }
})();
