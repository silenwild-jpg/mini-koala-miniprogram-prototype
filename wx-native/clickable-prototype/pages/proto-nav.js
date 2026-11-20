/* W29 可点击演示版 · 跳转层。只负责「点了去哪一个已画好的状态」，不改任何页面的结构、样式和文案。
   画面全部来自 W27 冻结稿；数值是各状态的演示值，不随点击重新计算。 */
(function(){
'use strict';
var Q=new URLSearchParams(location.search);
var PAGE=location.pathname.split('/').pop().replace('.html','');
var P={};Q.forEach(function(v,k){P[k]=v;});
var DEF={h01:'new',s01:'browse',s02:'browse',s5:'matched',cap:'empty',items:'empty',quick:'empty',booking:'empty',o01:'ready',o03:'active',rn01:'form',ex01:'form',dp01:'held',iv01:'form',m01:'new',oh01:'single',business:'empty',econtract:'signed'};
var ST=P.state||DEF[PAGE]||'';
var SS={get:function(k,d){try{return sessionStorage.getItem('mk_'+k)||d;}catch(e){return d;}},set:function(k,v){try{sessionStorage.setItem('mk_'+k,v);}catch(e){}}};
var stage=function(){return SS.get('stage','new');};      /* new → estimated → pending → upcoming → active */
var login=function(){return SS.get('login','0')==='1';};
var idv=function(){return SS.get('idv','0')==='1';};
var hasOrder=function(){return ['pending','upcoming','active'].indexOf(stage())>=0;};
/* ---------- D-198 进入守卫：未完成手机号注册 / 登录，不能进入确认订单及其后的页面 ----------
   GATE_ORDER：确认订单（含实名、签署、支付弹层）；GATE_AFTER：订单详情、续租、退仓、押金、发票、电子合同、订单内实名。
   画面目录（demo.html）里这些画面的链接带 as=member，表示以已登录用户身份查看。 */
if(P.as==='member')SS.set('login','1');
var GATE_ORDER=['o01'],GATE_AFTER=['o03','rn01','ex01','dp01','iv01','econtract'];
var GATED=GATE_ORDER.indexOf(PAGE)>=0?'order':(GATE_AFTER.indexOf(PAGE)>=0||(PAGE==='acc'&&P.view==='identity'))?'after':'';
if(GATED&&!login()){
  var fromQuick=/quick\.html/.test(document.referrer||'');
  location.replace(GATED==='order'?(fromQuick?'quick.html?state=ready&auth=phone&gate=1':'s5.html?state=matched&auth=phone&gate=1'):'m01.html?state=new&auth=phone&gate=1');
  return;}

/* ---------- 工具 ---------- */
function toast(m){document.querySelectorAll('.toastwrap').forEach(function(x){x.remove();});var d=document.createElement('div');d.className='toastwrap';d.setAttribute('role','status');d.innerHTML='<span class="toast"></span>';d.firstChild.textContent=m;(document.getElementById('toast-root')||document.body).appendChild(d);setTimeout(function(){d.remove();},2200);}
function self(o){var q=new URLSearchParams();Object.keys(o).forEach(function(k){if(o[k]!==''&&o[k]!=null)q.set(k,o[k]);});var s=q.toString();return PAGE+'.html'+(s?'?'+s:'');}
function st(s,extra){var o={};if(P.view)o.view=P.view;if(P.doc)o.doc=P.doc;o.state=s;if(extra)Object.keys(extra).forEach(function(k){o[k]=extra[k];});return self(o);}
function drop(){var o={};Object.keys(P).forEach(function(k){if(['overlay','auth','sub','sys','idv','review','open','info','unit'].indexOf(k)<0)o[k]=P[k];});return self(o);}
function dropOnly(keys){var o={};Object.keys(P).forEach(function(k){if(keys.indexOf(k)<0)o[k]=P[k];});return self(o);}
var T=function(m){return {toast:m};};
var FIXED=T('演示数据：这里的数值是固定的，不随点击变化');
function home(){return 'h01.html?state='+stage();}
function mine(){return login()||hasOrder()?'m01.html?state='+stage():'m01.html?state=new&auth=m_guest';}
function orders(){var s=stage();return 'oh01.html?state='+(s==='upcoming'?'upcoming':hasOrder()?'mixed':'empty');}
function stores(){return 's01.html?state='+(stage()==='new'?'browse':'matched');}
function order03(){var s=stage();return 'o03.html?state='+(s==='pending'?'pending':s==='upcoming'?'upcoming':'active');}
function capPage(){return 'cap.html?state='+(stage()==='new'?'empty':'filled');}
function recommend(){return 's5.html?state=matched'+(login()?'':'&auth=locked');}
function startOrder(){ /* 立即下单：登录 → 实名 → 确认订单（D-148）。D-198：未登录不进入确认订单页，在当前页打开登录层 */
  if(!login())return ['s5','s01','s02'].indexOf(PAGE)>=0?self({state:'matched',auth:'phone'}):PAGE==='quick'?self({state:'ready',auth:'phone'}):'s5.html?state=matched&auth=phone';
  return 'o01.html?state='+(idv()?'ready':'idv_todo');}
var HASH={S01:stores,S02:function(){return 's02.html?state='+(stage()==='new'?'browse':'matched');},CAP:capPage,M01:mine,H01:home,OH01:orders,BUSINESS:function(){return 'business.html?state=empty';},
  RN01:function(){return 'rn01.html?state=form';},EX01:function(){return 'ex01.html?state=form';},DP01:function(){return 'dp01.html?state=held';},IV01:function(){return 'iv01.html?state=form';},
  ESTORE:function(){return 'estore.html';},'privacy-guide':function(){return T('隐私保护指引正文待法务提供，体验版接入');},help:function(){return 'agreement.html?doc=notice';},access:function(){return 'acc.html?view=access&state=allowed';},O03:order03,S5:recommend};
var BARE={'h01.html':home,'m01.html':mine,'oh01.html':orders,'s01.html':stores,'cap.html':capPage,'o03.html':order03,'o01.html':function(){return 'BACK';},'booking.html':function(){return 'booking.html?state=empty';},'business.html':function(){return 'business.html?state=empty';},'rn01.html':function(){return 'rn01.html?state=form';}};
var PARENT={cap:home,items:function(){return 'cap.html?state=empty';},s5:capPage,s02:stores,quick:home,o01:recommend,o03:orders,rn01:order03,ex01:order03,dp01:order03,iv01:order03,booking:home,business:home,acc:mine,ent:mine,agreement:home,econtract:order03,estore:home};

/* ---------- 共用：用仓位置面板、登录层、订阅授权 ---------- */
function locRules(a,t,ov,base){
  var b=function(auth){return self({state:base,auth:auth});};
  if(a==='city'&&!ov)return b('search_on');
  if(a==='search')return b('search_on');
  if(a==='changeCity')return b('search_on');
  if(a==='closeHint')return self({state:base});
  if(a==='enableLocation')return PAGE==='h01'?b('loc_ask'):b('loc_ok');
  if(a==='openSetting')return b('loc_settings');
  if(a==='sysHelp')return b('loc_system');
  if(a==='relocate')return b('loc_ok');
  if(a==='privacyAgree')return b('loc_ok');
  if(a==='privacyDecline')return b('privacy_declined');
  if(P.auth==='loc_ask'||P.auth==='privacy_loc'||P.auth==='privacy_loc_checked'){if(a==='allow')return b('loc_ok');if(a==='deny')return b(P.auth==='loc_ask'?'loc_denied':'privacy_declined');}
  if(ov){
    if(a==='store')return 's02.html?state='+(stage()==='new'?'browse':'matched');
    if(a==='area'||a==='district')return PAGE==='quick'?self({state:'store',auth:'loc_area'}):b('loc_area');
    if(a==='city')return /北京/.test(t)?b('search_on'):T('演示版只有北京的门店数据');
    if(a==='allAreas')return T('演示版只列出常用商圈');
    if(a==='clearQuery'||a==='clearRecent')return b('search_on');
    if(a==='close')return self({state:base});
  }
  return null;}
function loginRules(a,t,base,done){ /* base：关闭登录后回到的地址；done：登录成功后去的地址 */
  if(a==='wechatPhone'||a==='smsLogin'||(a==='allow'&&/phone|bk_/.test(P.auth||''))){SS.set('login','1');return done;}
  if(a==='deny'&&/phone|bk_/.test(P.auth||''))return PAGE==='s5'?self({state:ST,auth:'phone_denied'}):base;
  if(a==='smsMode')return PAGE==='s5'?self({state:ST,auth:'sms'}):T('演示版只在仓位推荐页画了短信验证码登录');
  if(a==='wxMode')return PAGE==='s5'?self({state:ST,auth:'phone'}):null;
  if(a==='sendCode')return PAGE==='s5'?self({state:ST,auth:'sms_sent'}):T('验证码已发送（演示）');
  if(a==='close'&&P.auth)return base;
  return null;}
function subRules(a,yes,no,ask){if(a==='subAllow')return yes;if(a==='subDeny')return no;if(a==='subAsk')return ask;return null;}

/* ---------- 各页规则：返回 地址 | 'BACK' | {toast} | null ---------- */
var R={};
R.h01=function(a,t,ov,el){
  if(/^privacy_loc/.test(P.auth||'')&&el.tagName!=='A'&&el.closest('.cbox'))return self({state:ST,auth:P.auth==='privacy_loc'?'privacy_loc_checked':'privacy_loc'});
  var L=locRules(a,t,ov,ST);if(L)return L;
  if(a==='messages')return 'acc.html?view=messages&state='+(stage()==='new'?'empty':'unread');
  if(a==='navigate')return 's02.html?state=route';
  if(a==='nearby')return stores();
  if(a==='estimate')return /修改/.test(t)?'cap.html?state=filled':capPage();
  if(a==='recommend')return recommend();
  if(a==='booking')return 'acc.html?view=needs&state=list';
  if(a==='restart')return 'cap.html?state=empty';
  if(a==='renew')return 'rn01.html?state='+(ST==='renewal_quote'||ST==='renewal'?'quote_ready':ST==='renewal_pending'?'quote_pending':'form');
  if(a==='verify')return 'acc.html?view=identity&state=pending';
  if(a==='exit')return 'ex01.html?state='+(ST==='returning'?'requested':'form');
  if(a==='order')return ST==='payment_failed'?'o01.html?state=payment_failed':/支付/.test(t)?'o01.html?state=pending':'o03.html?state='+(ST==='active_pending'?'pending':'active');
  if(a==='fees')return 'o03.html?state=upcoming';
  if(a==='deposit')return 'dp01.html?state=refund_pending';
  if(a==='guide')return 'acc.html?view=access&state=before_start';
  if(a==='addUnit')return 'quick.html?state=ready';
  if(/^(展开|还有 \d+ 项待办)/.test(t))return 'h01.html?state=active_todo';
  return null;};
R.s01=function(a,t,ov,el){
  if(P.overlay==='demand'){if(/^㎡$/.test(t))return self({state:'matched',overlay:'demand',unit:'m2'});if(/^m³$/.test(t))return self({state:'matched',overlay:'demand'});if(a==='term'||a==='moreTerms')return FIXED;if(/取消|更新推荐|确定/.test(t))return self({state:P.unit==='m2'?'matched_area':'matched'});}
  if(P.overlay==='filter'){if(/取消|确定|重置/.test(t))return self({state:'matched'});return FIXED;}
  var L=loginRules(a,t,self({state:'matched',auth:'locked'}),self({state:'matched'}));if(L)return L;
  L=locRules(a,t,ov,ST==='matched'?'matched':'browse');if(L&&(ov||['city','search','changeCity','closeHint','enableLocation','openSetting','sysHelp','relocate'].indexOf(a)>=0))return L;
  if(a==='choose')return startOrder();
  if(a==='phone')return self({state:'matched',auth:'phone'});
  if(a==='editDemand'||/^修改需求/.test(t))return self({state:'matched',overlay:'demand'});
  if(a==='advisor')return 'booking.html?state=advisor';
  if(a==='store'||/另有 \d+ 个可租/.test(t))return 's02.html?state=matched';
  if(/^免费运输/.test(t))return self({state:'far_transport'});
  if(/^(排序|距离|服务|特价仓|价格优先|3km内)/.test(t))return ST==='browse'?self({state:'filtering'}):self({state:'matched',overlay:'filter'});
  if(/^立即估算/.test(t))return 'cap.html?state=empty';
  if(/^查看(更多|全部)门店/.test(t))return self({state:'browse'});
  if(el.closest('article,.store-card,.scard,[class*=card]')&&/店/.test(t))return 's02.html?state='+(/matched|far|near/.test(ST)?'matched':'browse');
  return null;};
R.s02=function(a,t,ov){
  var L=loginRules(a,t,self({state:'matched',auth:'locked'}),self({state:'matched'}));if(L)return L;
  if(ov&&/取消/.test(t))return drop();
  if(ov)return T('将打开微信内置地图（体验版接入）');
  if(a==='storeFavorite'||a==='favorite')return T('已收藏，可在「我的 · 收藏」查看');
  if(a==='share')return T('分享需在微信内使用');
  if(a==='s02OpenMap')return self({state:'route'});
  if(a==='category')return self({state:'filtered'});
  if(a==='choose')return startOrder();
  if(a==='phone')return self({state:'matched',auth:'phone'});
  if(a==='s02EditCapacity')return self({state:'matched'});
  if(a==='editDemand'||/^修改需求/.test(t))return 's5.html?state=matched&overlay=demand';
  if(a==='store')return self({state:'combo'});
  if(a==='go')return stores();
  if(/^可选仓位/.test(t))return self({state:stage()==='new'?'browse':'matched'});
  if(/^服务设施/.test(t))return self({state:'services'});
  if(/^到店指引/.test(t))return self({state:'route'});
  if(/^立即估算/.test(t))return 'cap.html?state=empty';
  if(/^到店导航/.test(t))return T('将打开微信内置地图（体验版接入）');
  if(/^复制地址/.test(t))return T('地址已复制');
  if(/^其他到店方式/.test(t))return self({state:'route',open:'transit'});
  if(/^看路线/.test(t))return self({state:'route',open:'guide'});
  if(/^位置示意/.test(t))return self({state:'route',open:'dest'});
  if(/^重新加载/.test(t))return self({state:'route'});
  return null;};
R.s5=function(a,t,ov){
  if(P.overlay==='demand'){if(a==='capUnit')return /㎡/.test(t)?self({state:'from_area',overlay:'demand'}):self({state:'matched',overlay:'demand'});if(a==='term'||a==='moreTerms')return FIXED;if(/取消|更新推荐|查看推荐/.test(t))return self({state:ST});}
  if(P.overlay==='origin'){var L0=locRules(a,t,true,'matched');if(L0)return a==='close'?self({state:'matched'}):/s02/.test(L0)?L0:self({state:'matched',auth:'loc_area'});}
  if(P.overlay==='fees'&&/知道了/.test(t))return drop();
  if(ST==='cold'){if(a==='capUnit'||a==='term'||a==='moreTerms')return FIXED;if(/^取消/.test(t))return 'BACK';if(/查看推荐/.test(t))return self({state:'matched'});}
  if(a==='allow'&&P.auth==='phone_wx'){SS.set('login','1');return self({state:ST,auth:'phone_ok'});}
  if(a==='wechatPhone')return self({state:ST,auth:'phone_wx'});
  if(a==='smsLogin'){SS.set('login','1');return self({state:ST,auth:'phone_ok'});}
  if(a==='close'&&P.auth)return self({state:ST,auth:'locked'});
  var L=loginRules(a,t,self({state:ST,auth:'locked'}),self({state:ST,auth:'phone_ok'}));if(L)return L;
  if(a==='editDemand')return self({state:ST==='from_area'?'from_area':'matched',overlay:'demand'});
  if(a==='origin')return self({state:'matched',overlay:'origin'});
  if(a==='choose')return startOrder();
  if(a==='phone')return self({state:ST,auth:'phone'});
  if(a==='more')return /全城/.test(t)?stores():self({state:'expanded'});
  return null;};
R.cap=function(a,t){
  var area=/^area/.test(ST);
  if(a==='quick'||a==='plus'||a==='minus')return /^(empty|invalid|area_invalid|over|area_over)$/.test(ST)?self({state:area?'area':'filled'}):FIXED;
  if(a==='unit')return /㎡/.test(t)?self({state:'area'}):self({state:'filled'});
  if(a==='toRef'){var r=document.getElementById('ref-sec');if(r)r.scrollIntoView({behavior:'smooth'});return {done:1};}
  if(a==='items')return 'items.html?state='+(/^from_items/.test(ST)?'selected':'empty');
  if(a==='term')return ST==='empty'?self({state:'term'}):FIXED;
  if(a==='moreTerms')return self({state:'other'});
  if(a==='termMinus'||a==='termPlus')return FIXED;
  if(a==='closeSheet')return self({state:'filled'});
  if(a==='customApply')return self({state:'term_near'});
  if(a==='advisor')return 'booking.html?state=advisor';
  if(a==='ai')return T('AI 估算暂未开放');
  if(a==='advisorSubmit')return 'booking.html?state=large';
  if(a==='restoreItems')return self({state:'from_items'});
  if(a==='cta'){if(ST==='empty')return T('请先填写预计容量');if(stage()==='new')SS.set('stage','estimated');
    return area?'s5.html?state=from_area':/^from_items/.test(ST)?'s5.html?state=from_items':recommend();}
  return null;};
R.items=function(a,t,ov){
  if(a==='advisor')return 'booking.html?state=advisor';
  if(a==='ai')return T('AI 估算暂未开放');
  if(/^按物品分类/.test(t))return self({state:'category'});
  if(/^按场景分类/.test(t))return self({state:'scenes'});
  if(a==='cat')return FIXED;
  if(a==='step'&&!ov)return /^(empty|scenes|category|search|tiny)$/.test(ST)?self({state:'selected'}):FIXED;
  if(a==='step'||a==='del'||a==='qtyQuick'||a==='term'||a==='termMinus'||a==='termPlus')return FIXED;
  if(a==='qty')return self({state:'qty'});
  if(a==='variant')return self({state:'variant'});
  if(a==='pickVariant'||a==='qtyNo'||a==='qtyYes'||a==='closeSheet')return self({state:'selected'});
  if(a==='cart')return /还没有/.test(t)?T('请先选择物品'):self({state:'cart'});
  if(a==='clearAll')return self({state:'clear'});
  if(a==='clearNo')return self({state:'cart'});
  if(a==='clearYes'||a==='resetSearch')return self({state:'empty'});
  if(a==='toCap')return 'cap.html?state=empty';
  if(a==='termSheet')return self({state:'term'});
  if(a==='moreTerms')return self({state:'term_other'});
  if(a==='business')return 'business.html?state=empty';
  if(a==='footer'){if(/请先/.test(t))return T('请先选择物品');if(/顾问/.test(t))return 'booking.html?state=large';if(stage()==='new')SS.set('stage','estimated');return 's5.html?state=from_items';}
  return null;};
R.quick=function(a,t,ov){
  if(P.overlay==='city'){var L0=locRules(a,t,true,'store');if(L0)return a==='close'?self({state:'store'}):self({state:'store',auth:'loc_area'});}
  var L=loginRules(a,t,self({state:'ready',auth:'locked'}),self({state:'ready'}));if(L)return L;
  if(ov&&a==='store')return self({state:'unit'});
  if(a==='customTerm')return self({state:'ready'});
  if(a==='termMinus'||a==='termPlus')return FIXED;
  if(ov&&/知道了|取消/.test(t))return drop();
  if(ov)return self({state:P.overlay==='unit'?'term':ST});
  if(a==='origin')return self({state:'store',overlay:'city'});
  if(a==='store')return self({state:'store',overlay:'store'});
  if(a==='unit')return self({state:'unit',overlay:'unit'});
  if(a==='term')return /^(term|unit)$/.test(ST)?self({state:'ready'}):FIXED;
  if(a==='moreTerms')return self({state:'term',overlay:'terms'});
  if(a==='date')return /请选择/.test(t)?self({state:'ready'}):FIXED;
  if(a==='fees')return self({state:'ready',overlay:'fees'});
  if(a==='phone')return self({state:'ready',auth:'phone'});
  if(a==='next'){if(/重新选择/.test(t))return self({state:'unit',overlay:'unit'});if(ST!=='ready'&&ST!=='addon')return T('请先选好门店、仓位、租期和用仓日期');return startOrder();}
  return null;};
R.o01=function(a,t,ov,el){
  if(el.tagName!=='A'&&el.closest('.cbox')&&!ov)return self({state:ST,agreed:P.agreed==='1'?'':'1'});
  if(P.overlay==='phone'||P.auth){var L=loginRules(a,t,self({state:'unauthorized'}),self({state:idv()?'ready':'idv_todo'}));if(L)return L;if(/关闭登录/.test(t))return self({state:'unauthorized'});}
  if(P.overlay==='coupon')return /确定/.test(t)?self({state:'coupon'}):self({state:'ready'});
  if(a==='idv')return self({state:'idv_todo',overlay:'idv'});
  if(a==='idvSubmit')return /认证中/.test(t)?{done:1}:self({state:'idv_todo',overlay:'idv',idv:'checking'});
  if(a==='phone')return /更换/.test(t)?T('联系电话可在「我的 · 个人信息」修改'):self({state:'unauthorized',overlay:'phone'});
  if(a==='coupon')return self({state:'coupon',overlay:'coupon'});
  if(a==='sign'){if(/重新选择/.test(t))return recommend();if(P.agreed!=='1')return T('请先勾选确认');return self({state:ST,agreed:'1',overlay:'sign'});}
  if(a==='signConfirm')return self({state:'submitting'});
  if(a==='closeOverlay'||(ov&&/知道了|取消|返回修改/.test(t)))return drop();
  if(a==='paySheet')return /处理中/.test(t)?{done:1}:self({state:'pending',overlay:'pay'});
  if(a==='payResult')return self({state:'paying'});
  if(a==='cancelPay')return self({state:'pending'});
  if(a==='payDone'){SS.set('stage','upcoming');return 'o03.html?state=pending&sub=ask';}
  if(a==='payProblem')return self({state:'payment_failed'});
  if(a==='cancelOrder')return self({state:ST==='payment_failed'?'payment_failed':'pending',overlay:'cancel'});
  if(a==='confirmCancel'){SS.set('stage','estimated');return self({state:'cancelled'});}
  if(a==='home')return home();
  if(a==='restart')return 'cap.html?state=empty';
  if(a==='requote'||a==='refreshQuote'||a==='pay')return /生成/.test(t)?{done:1}:self({state:'ready'});
  if(a==='alternatives')return recommend();
  if(/^[−+]$/.test(t)||/^\d{4}-\d\d-\d\d$/.test(t)||/请选择日期/.test(t))return FIXED;
  return null;};
R.o03=function(a,t,ov){
  var S=subRules(a,self({state:'upcoming',sub:'accepted'}),self({state:'upcoming',sub:'declined'}),self({state:'pending',sub:'ask'}));if(S)return S;
  if(a==='navigate')return 's02.html?state=route';
  if(a==='access')return 'acc.html?view=access&state='+(ST==='upcoming'?'before_start':'allowed');
  if(a==='RN01')return 'rn01.html?state='+(ST==='renewal'?'quote_ready':'form');
  if(a==='EX01')return 'ex01.html?state='+(ST==='returning'?'requested':ST==='inspection'?'waiting':ST==='upcoming'?'not_started':'form');
  if(a==='DP01')return 'dp01.html?state='+(ST==='refund'?'refund_pending':ST==='ended'?'refunded':ST==='inspection'||ST==='returning'?'waiting':'held');
  if(a==='IV01')return 'iv01.html?state=form';
  if(a==='mine')return orders();
  if(a==='restart')return 'cap.html?state=empty';
  if(a==='identity')return 'acc.html?view=identity&state=pending';
  if(a==='cancelOrder')return self({state:ST==='payment_failed'?'payment_failed':'pending',overlay:'cancel'});
  if(a==='close')return drop();
  if(a==='confirmCancel'){SS.set('stage','estimated');return self({state:'cancelled'});}
  if(a==='resumeOrder'||a==='resumeFailed')return 'o01.html?state=pending&overlay=pay';
  return null;};
R.rn01=function(a,t,ov){
  var keep=/keep/.test(ST);
  var S=subRules(a,self({state:'quote_pending',sub:'accepted'}),self({state:'quote_pending',sub:'declined'}),self({state:'form',sub:'ask'}));if(S)return S;
  if(a==='requestRenewal')return keep?self({state:'quote_keep'}):self({state:'form',sub:'ask'});
  if(a==='confirmRenewal'||a==='payNow')return self({state:'payment_pending',overlay:'pay'});
  if(a==='payRenewalSuccess')return self({state:'completed'});
  if(a==='payLater')return self({state:'payment_pending'});
  if(a==='renewRegular')return self({state:'quote_ready'});
  if(a==='skipRenewal'||a==='O03')return 'o03.html?state=active';
  if(a==='IV01')return 'iv01.html?state=two_payments';
  if(a==='mine')return orders();
  if(a==='months'||/^[−+]$/.test(t))return FIXED;
  return null;};
R.ex01=function(a,t){
  var S=subRules(a,self({state:'waiting',sub:'accepted'}),self({state:'waiting',sub:'declined'}),self({state:'requested',sub:'ask'}));if(S)return S;
  if(a==='exitType')return self({state:/提前/.test(t)?'form_early':'form'});
  if(a==='requestExit')return self({state:ST==='form_early'?'form_early':'form',overlay:'confirm'});
  if(a==='close')return drop();
  if(a==='confirmExit')return self({state:'requested'});
  if(a==='requestInspection')return self({state:'requested',sub:'ask'});
  if(a==='RN01')return 'rn01.html?state=form';
  if(a==='DP01')return 'dp01.html?state=refund_pending';
  if(a==='O03')return 'o03.html?state='+(/requested|waiting/.test(ST)?'returning':ST==='passed'?'refund':'active');
  if(a==='mine')return orders();
  return null;};
R.dp01=function(a){
  if(a==='O03')return 'o03.html?state='+(/refund_pending|refund_failed/.test(ST)?'refund':/refunded/.test(ST)?'ended':'active');
  if(a==='mine')return orders();
  if(a==='refundProgress')return self({state:'refund_pending',overlay:'progress'});
  if(a==='close')return drop();
  return null;};
R.iv01=function(a,t){
  if(a==='payment')return ST==='two_payments'?self({state:'two_payments',overlay:'payment'}):T('这笔订单只有一次付款');
  if(a==='close')return drop();
  if(a==='kind')return self({state:/企业|专用/.test(t)?'form_enterprise':'form'});
  if(a==='requestInvoice')return self({state:'submitting'});
  if(a==='retryInvoice')return self({state:'form'});
  if(a==='O03')return 'o03.html?state=active';
  if(a==='mine')return orders();
  if(a==='sendInvoice')return T('已发送到邮箱（演示）');
  if(a==='downloadInvoice')return T('下载在体验版接入');
  return null;};
R.m01=function(a,t){
  var L=loginRules(a,t,'m01.html?state=new&auth=m_guest','m01.html?state='+stage());if(L)return L;
  if(a==='phone')return 'm01.html?state=new&auth=phone';
  if(a==='navigate')return 's02.html?state=route';
  if(a==='estimate')return 'cap.html?state=filled';
  if(a==='recommend')return recommend();
  if(a==='restart')return 'cap.html?state=empty';
  if(a==='renew')return 'rn01.html?state='+(ST==='renewal_quote'||ST==='renewal'?'quote_ready':ST==='renewal_pending'?'quote_pending':'form');
  if(a==='verify')return 'acc.html?view=identity&state=pending';
  if(a==='exit')return 'ex01.html?state='+(ST==='returning'?'requested':'form');
  if(a==='order')return /支付/.test(t)?'o01.html?state=pending':'o03.html?state=active';
  if(a==='fees')return 'o03.html?state=upcoming';
  if(a==='deposit')return 'dp01.html?state=refund_pending';
  if(a==='nearby')return stores();
  if(a==='access')return 'acc.html?view=access&state=before_start';
  return null;};
function contactAuth(a,t,base){ /* 预约页 / 企业页的手机号授权（D-121 同一登录层） */
  if(a==='phone')return self({state:base,auth:'bk_login'});
  if(a==='changeContact')return self({state:base,auth:'bk_contact'});
  if(a==='wechatPhone')return self({state:base,auth:'bk_wx'});
  if(a==='allow'&&P.auth==='bk_wx'){SS.set('login','1');return self({state:base,auth:'bk_authed'});}
  if(a==='deny'&&P.auth==='bk_wx')return self({state:base,auth:'bk_denied'});
  if(a==='smsMode')return self({state:base,auth:P.auth==='bk_contact'?'bk_contact_sms':'bk_sms'});
  if(a==='wxMode')return self({state:base,auth:'bk_login'});
  if(a==='smsLogin'){SS.set('login','1');return self({state:base,auth:'bk_authed'});}
  if(a==='sendCode')return T('验证码已发送（演示）');
  if(a==='close'&&P.auth)return self({state:base,auth:login()?'bk_authed':'bk_unauth'});
  return null;}
R.booking=function(a,t,ov){
  var adv=ST==='advisor'||P.mode==='advisor';
  var S=subRules(a,self({state:'success',sub:'accepted'}),self({state:'success',sub:'declined'}),self({state:'success',sub:'accepted'}));if(S)return S;
  var C=contactAuth(a,t,'filled');if(C)return C;
  if(P.overlay){if(a==='term'||a==='moreTerms'||a==='capacity'||/^(m³|㎡)$/.test(t))return FIXED;if(/取消|确定/.test(t))return self({state:'filled'});}
  if(a==='locate')return T('已使用当前位置（演示）');
  if(a==='hint'||a==='choice')return ST==='empty'?self({state:'filled'}):FIXED;
  if(a==='date')return self({state:'filled',overlay:'date'});
  if(a==='submit'){if(/正在/.test(t))return {done:1};if(ST==='empty')return T('请先填写用仓位置和联系方式');return adv?self({state:'success_advisor'}):ST==='large'?self({state:'success_advisor'}):self({state:'filled',sub:'ask'});}
  if(a==='retry')return self({state:'filled'});
  if(a==='myNeeds')return 'acc.html?view=needs&state=list';
  if(a==='find')return stores();
  if(a==='business')return 'business.html?state=empty';
  return null;};
R.business=function(a,t,ov){
  var multi=/^multi_area/.test(ST);
  var C=contactAuth(a,t,'restored');if(C)return C;
  if(P.overlay==='date')return self({state:'filled'});
  if(a==='termMinus'||a==='termPlus'||(ov&&a==='term'))return FIXED;
  if(a==='customApply')return self({state:'custom'});
  if(a==='closeSheet')return self({state:'filled'});
  if(a==='find')return stores();
  if(a==='myNeeds')return 'acc.html?view=needs&state=list';
  if(a==='close')return drop();
  if(a==='step1')return self({state:multi?'multi_area':'filled'});
  if(a==='date')return self({state:'filled',overlay:'date'});
  if(a==='submit')return /正在/.test(t)?{done:1}:self({state:'submitting'});
  if(a==='newLead')return self({state:'empty'});
  if(a==='areasOpen')return self({state:'multi_area_open'});
  if(a==='area')return self({state:'multi_area'});
  if(a==='size'||a==='term'||a==='type'||a==='move')return ST==='empty'?self({state:'filled'}):FIXED;
  if(a==='estimate')return 'cap.html?state=empty';
  if(a==='moreTerms')return self({state:'custom',overlay:'term'});
  if(a==='browse')return 's01.html?state=matched';
  if(a==='step2')return ST==='empty'?T('请先填写企业用仓需求'):self({state:multi?'multi_area_step2':'step2'});
  if(a==='retry')return self({state:'step2'});
  return null;};
R.ent=function(a,t){
  var v=P.view||'cert',g=function(view,s){return 'ent.html?view='+view+'&state='+s;};
  if(a==='submitCert')return /提交中/.test(t)?{done:1}:g('cert','submitting');
  if(a==='retry')return v==='batch'?g('batch','selected'):g('cert','filled');
  if(/上传营业执照/.test(t))return g('cert','filled');
  if(a==='saveTitle')return g('titles','list');
  if(a==='edit')return g('titles','edit');
  if(a==='add')return g('titles','add');
  if(a==='deleteTitle')return g('titles','delete');
  if(a==='confirmDelete')return g('titles','list');
  if(a==='close')return g('titles','edit');
  if(a==='setDefault')return T('已设为默认抬头');
  if(a==='next')return g('batch','confirm');
  if(a==='submitBatch')return /提交中/.test(t)?{done:1}:g('batch','submitting');
  if(a==='download')return T('下载在体验版接入');
  if(a==='resend')return T('已重新发送到邮箱（演示）');
  if(/^(企业|个人|已上传)/.test(t))return FIXED;
  if(v==='batch'){if(/^全选/.test(t))return g('batch','all');if(/店/.test(t))return g('batch','selected');}
  return null;};
R.acc=function(a,t,ov){
  var v=P.view,g=function(s,x){return st(s,x);};
  if(a==='reload')return dropOnly(['sys']);
  if(v==='identity'){
    if(a==='identitySheet')return g('form');
    if(a==='identitySubmit')return g('reviewing');
    if(a==='identityReview')return g('reviewing',{review:'1'});
    if(a==='identityResult'){if(/未通过/.test(t))return g('failed');SS.set('idv','1');return g('verified');}}
  if(v==='access'){if(a==='navigate')return 's02.html?state=route';if(a==='enter')return g('allowed',{overlay:'unlock'});if(a==='close')return drop();}
  if(v==='transport'){if(a==='transport')return g('saved');if(a==='transportLead')return g('pre_saved');}
  if(v==='support'){if(a==='supportType')return /订单/.test(t)?g('order'):g('form');if(a==='support')return g('saved');}
  if(v==='needs'){
    if(a==='editLead')return g('edit');if(a==='leadMore')return g('more');if(a==='saveLead')return g('list');
    if(a==='withdraw')return g('withdraw');if(a==='confirmWithdraw')return g('withdrawn');if(a==='close')return g('list');}
  if(v==='progress'){if(a==='estimate')return 'cap.html?state=filled';if(a==='recommend')return recommend();}
  if(v==='coupons'){if(a==='claim')return g('available');if(a==='phone')return 'm01.html?state=new&auth=phone';}
  if(v==='referral'){if(a==='copyReferral')return g('copied');if(a==='phone')return 'm01.html?state=new&auth=phone';}
  if(v==='profile'){
    if(a==='contact')return g('contact',{overlay:'contact'});
    if(a==='saveContact')return g('contact');
    if(a==='changePhone')return g('verified',{auth:'m_change'});
    if(a==='sendCode')return g('verified',{auth:'m_change_sent'});
    if(a==='smsLogin')return g('verified',{auth:'m_change_ok'});
    if(a==='smsMode')return g('verified',{auth:'m_change'});
    if(a==='logout')return g('verified',{overlay:'logout'});
    if(a==='confirmLogout'){SS.set('login','0');SS.set('stage','new');return 'm01.html?state=new&auth=m_guest';}
    if(a==='confirmDelete')return hasOrder()?g('verified',{overlay:'delete_blocked'}):(SS.set('login','0'),SS.set('stage','new'),'m01.html?state=new&auth=m_guest');
    if(a==='confirmWithdraw'){SS.set('login','0');SS.set('stage','new');return 'h01.html?state=new&auth=privacy_loc';}
    if(a==='withdrawPrivacy'){if(P.overlay==='privacy')return g('verified',{overlay:'privacy_confirm'});SS.set('login','0');SS.set('stage','new');return 'h01.html?state=new&auth=privacy_loc';}
    if(a==='privacySetting')return T('将打开微信的小程序设置页（体验版接入）');
    if(a==='phone')return 'm01.html?state=new&auth=phone';
    if(a==='close')return g('verified');}
  return null;};

/* ---------- 自动前进（提交中 / 认证中 / 支付中这类过渡态） ---------- */
var AUTO={'o01|submitting':function(){SS.set('stage','pending');return 'o01.html?state=pending&overlay=pay';},
  'o01|idv_todo|checking':function(){SS.set('idv','1');return 'o01.html?state=ready';},
  'o01|paying':function(){SS.set('stage','upcoming');return 'o03.html?state=pending&sub=ask';},
  's5|phone_ok':function(){return 's5.html?state='+ST;},'s5|phone_loading':function(){SS.set('login','1');return 's5.html?state='+ST+'&auth=phone_ok';},
  'iv01|submitting':function(){return 'iv01.html?state=submitted';},'rn01|submitting':function(){return 'rn01.html?state=quote_pending';},'ex01|submitting':function(){return 'ex01.html?state=requested';},
  'booking|submitting':function(){return 'booking.html?state=success';},'business|submitting':function(){return 'business.html?state=success';},
  'ent|submitting':function(){return 'ent.html?view='+P.view+'&state='+(P.view==='batch'?'submitted':'reviewing');}};
/* ---------- 演示推进（本该由门店 / 时间 / 审核触发的变化，体验时手动模拟） ---------- */
var SIM={'o03|upcoming':['模拟：到起租日',function(){SS.set('stage','active');return 'o03.html?state=active';}],
  'o03|active':['模拟：临近到期',function(){return 'o03.html?state=expiring';}],
  'rn01|quote_pending':['模拟：门店已报价',function(){return 'rn01.html?state=quote_ready';}],
  'ex01|requested':['模拟：已清空，等待验仓',function(){return 'ex01.html?state=waiting';}],
  'ex01|waiting':['模拟：验仓通过',function(){return 'ex01.html?state=passed';}],
  'dp01|waiting':['模拟：验仓通过，开始退款',function(){return 'dp01.html?state=refund_pending';}],
  'dp01|refund_pending':['模拟：押金已退还',function(){return 'dp01.html?state=refunded';}],
  'iv01|submitted':['模拟：发票已开具',function(){return 'iv01.html?state=issued';}],
  'acc|reviewing':['模拟：审核通过',function(){SS.set('idv','1');return 'acc.html?view=identity&state=verified';}],
  'ent|reviewing':['模拟：企业认证通过',function(){return 'ent.html?view=cert&state=verified';}],
  'ent|submitted':['模拟：发票已开具',function(){return 'ent.html?view=batch&state=issued';}],
  'booking|success':['模拟：顾问已给出方案',function(){return 'acc.html?view=progress&state=quote';}]};

/* ---------- 执行 ---------- */
function go(r){
  if(!r)return false;
  if(r.done)return true;
  if(r.toast){toast(r.toast);return true;}
  if(r==='BACK'){if(history.length>1&&document.referrer&&document.referrer.indexOf(location.host)>=0){history.back();}else{var p=PARENT[PAGE];location.href=p?p():home();}return true;}
  if(typeof r==='string'){if(r.split('#')[0]===location.pathname.split('/').pop()+location.search){toast('已是当前画面');return true;}location.href=r;return true;}
  return false;}
function resolve(el){
  var a=el.dataset.action||'',t=(el.innerText||el.getAttribute('aria-label')||'').trim().replace(/\s+/g,' '),ov=!!el.closest('#overlay-root,.sheet,.mask,.modal,[role=dialog]');
  var href=el.tagName==='A'?el.getAttribute('href'):null;
  if(el.disabled||el.getAttribute('aria-disabled')==='true'){if(a==='ai')return T('AI 估算暂未开放');return {done:1};}
  if(a==='unlock'||/^(tel|mailto):/.test(href||''))return null;                 /* 保留原有行为 */
  if(a==='back'||/^返回上一?[步页]$/.test(el.getAttribute('aria-label')||''))return 'BACK';
  if(a==='reload')return dropOnly(['sys']);
  var page=R[PAGE]&&R[PAGE](a,t,ov,el);if(page)return page;
  if(href){
    if(href.charAt(0)==='#'){var h=HASH[href.slice(1)];return h?h():null;}       /* #sec1 等页内锚点走默认 */
    if(BARE[href])return BARE[href]();
    if(/^booking\.html\?mode=advisor/.test(href))return 'booking.html?state=advisor';
    if(/^quick\.html\?store=/.test(href))return 'quick.html?state=ready';
    if(href==='acc.html?view=needs')return 'acc.html?view=needs&state=list';
    if(href==='acc.html?view=support')return 'acc.html?view=support&state=form';
    if(/^acc\.html\?view=profile&state=(un)?verified$/.test(href))return login()||hasOrder()?'acc.html?view=profile&state=verified':'acc.html?view=profile&state=unverified';
    return null;}
  if(el.getAttribute('role')==='checkbox'||el.classList.contains('cbox')||/^(我已阅读并同意|总是保持以上选择)/.test(t)){var c=el.closest('[role=checkbox],.cbox')||el,on=c.getAttribute('aria-checked')!=='true';c.setAttribute('aria-checked',String(on));c.classList.toggle('on',on);return {done:1};}
  var tab={'首页':home,'附近门店':stores,'订单':orders,'我的':mine}[t];if(tab&&el.closest('.tabbar,nav,[class*=tab]'))return tab();
  return undefined;}                                                              /* undefined = 没有规则 */
/* 非按钮元素：选项行、示意输入框、开关、遮罩 */
function extra(e){
  var t=e.target;
  if(t.classList&&t.classList.contains('scrim')){var r=(R[PAGE]&&R[PAGE]('close','取消',true,t))||drop();return r&&r.toast?drop():r;}
  var sw=t.closest('[role=switch]');if(sw){var on=sw.getAttribute('aria-checked')!=='true';sw.setAttribute('aria-checked',String(on));sw.classList.toggle('on',on);return {done:1};}
  var opt=t.closest('.opt');
  if(opt){[].forEach.call(opt.parentNode.querySelectorAll('.opt'),function(o){o.classList.toggle('on',o===opt);});
    if(PAGE==='quick'&&P.overlay==='store')return self({state:'unit'});
    if(PAGE==='quick'&&P.overlay==='unit')return self({state:'term'});
    if((PAGE==='booking'||PAGE==='business')&&ST==='empty')return self({state:'filled'});
    return {done:1};}
  var inp=t.closest('[role=textbox]');
  if(inp){
    if(PAGE==='o01'&&P.overlay==='idv'&&!P.idv)return self({state:'idv_todo',overlay:'idv',idv:'filled'});
    if((PAGE==='booking'||PAGE==='business'||PAGE==='cap')&&ST==='empty')return self({state:'filled'});
    if(PAGE==='cap'&&/invalid|over/.test(ST))return self({state:/^area/.test(ST)?'area':'filled'});
    if(PAGE==='s5'&&P.auth==='sms')return T('请先点「获取验证码」');
    if(PAGE==='s5'&&/^sms_/.test(P.auth||'')){SS.set('login','1');return self({state:ST,auth:'phone_ok'});}
    if((PAGE==='booking'||PAGE==='business')&&/_sms$/.test(P.auth||'')){SS.set('login','1');return self({state:PAGE==='booking'?'filled':'restored',auth:'bk_authed'});}
    if(PAGE==='acc'&&P.auth==='m_change')return T('请先点「获取验证码」');
    if(PAGE==='acc'&&P.auth==='m_change_sent')return st('verified',{auth:'m_change_ok'});
    if(PAGE==='iv01'&&ST==='invalid')return self({state:'filled'});
    if(PAGE==='ent'&&P.view==='cert'&&ST==='invalid')return 'ent.html?view=cert&state=filled';
    if(PAGE==='ent'&&P.view==='titles'&&/add|invalid/.test(ST))return 'ent.html?view=titles&state=edit';
    if(PAGE==='iv01'&&ST==='form')return self({state:'filled'});
    if(PAGE==='ent'&&P.view==='cert'&&ST==='empty')return 'ent.html?view=cert&state=filled';
    if(PAGE==='acc'&&P.view==='transport'&&ST==='empty')return st('form');
    return T('演示版：输入框为示意，显示的是演示填写内容');}
  return undefined;}
document.addEventListener('click',function(e){
  if(e.target.closest('[data-proto-sim]'))return;
  var el=e.target.closest('a,button,[data-action],[role=button],[role=tab],[role=checkbox],.cbox');
  if(!el){var x=extra(e);if(x!==undefined){e.preventDefault();e.stopImmediatePropagation();go(x);}return;}
  var r=resolve(el);
  if(r===null)return;                                                            /* 交回页面原有处理 / 浏览器默认 */
  e.preventDefault();e.stopImmediatePropagation();
  if(r===undefined){toast('这一步在演示版里没有接');window.__MK_UNROUTED=(window.__MK_UNROUTED||0)+1;return;}
  go(r);},true);
window.__MK_RESOLVE=function(el){var r=resolve(el);return r===undefined?'UNROUTED':r===null?'NATIVE':r.toast?'TOAST:'+r.toast:r.done?'DONE':r;};

window.addEventListener('DOMContentLoaded',function(){
  if(P.gate==='1')toast(PAGE==='m01'?'请先登录，登录后查看订单':'请先登录，登录后才能确认订单');
  if(PAGE==='o01'&&ST==='pending'&&stage()!=='upcoming'&&stage()!=='active')SS.set('stage','pending');
  var k1=PAGE+'|'+ST+(P.idv?'|'+P.idv:''),k2=PAGE+'|'+(P.auth||''),f=AUTO[k1]||AUTO[k2]||AUTO[PAGE+'|'+ST];
  if(f&&!P.sys)setTimeout(function(){location.replace(f());},1400);
  var s=SIM[PAGE+'|'+ST];
  if(s&&!P.overlay&&P.sub!=='ask'&&!P.sys&&!(PAGE==='acc'&&P.view!=='identity')){
    var b=document.createElement('button');b.type='button';b.textContent=s[0]+' ›';b.setAttribute('data-proto-sim','1');
    b.style.cssText='position:fixed;left:8px;top:96px;z-index:9999;font:12px/1 system-ui,sans-serif;padding:7px 10px;border:1px dashed #8a8f98;border-radius:14px;background:rgba(255,255,255,.94);color:#4a4f57;cursor:pointer';
    b.addEventListener('click',function(e){e.stopImmediatePropagation();location.href=s[1]();},true);document.body.appendChild(b);}
});
})();
