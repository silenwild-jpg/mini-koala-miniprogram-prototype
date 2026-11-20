/* W9 · AUTH-PRIVACY-01A 授权状态层（张坤 2026-11-18 裁定 D-109～D-112）
 * 任意已接入页面追加 ?auth=<key>，叠加在该页 state 之上。全部为 Web 演示示意，不是微信真机证据。
 *
 * 隐私 / 定位（H01、S01）
 *   privacy          首次进入首页：隐私保护指引弹层（同意 / 拒绝）
 *   privacy_loc / privacy_loc_checked   W11 D-114：官方「与授权弹窗耦合」样式，隐私勾选 + 位置权限合并为一个弹窗（主方案）
 *   loc_ask          微信位置权限弹窗（示意）；privacy → loc_ask 两步为低版本基础库回退
 *   loc_ok           已定位
 *   privacy_declined 拒绝隐私指引：不再申请定位，手动选城市
 *   loc_denied       小程序位置权限被拒
 *   loc_system       手机系统定位关闭
 *   loc_timeout      定位超时
 *   loc_settings     用户主动点「去开启」后的设置引导
 *   W12 D-119：以上未定位状态不再插入页内状态条，改为城市选择区轻气泡（浮层）；loc_quiet = 气泡关闭后只留城市旁圆点
 *   W26：loc_nocity = 定位到没有门店的城市（演示：成都）→ 自动回到北京，城市位下方轻气泡说明，可切换城市；公里数与免费运输标签不显示
 *   W14：search_* / loc_area / loc_far 见 pages/w14.js（全站唯一的「用仓位置」面板）；city_off 已退役
 * 手机号（S5 全套；S01 / S02 / QUICK 取 locked + phone）
 *   locked           未验证：整期金额不显示
 *   phone            登录层（协议未勾选）
 *   phone_agree      未勾协议就点登录
 *   phone_wx         微信手机号弹窗（示意）
 *   phone_loading    验证中
 *   phone_fail       微信取号失败 / 额度不足 → 短信兜底
 *   phone_denied     用户不允许 → 其他手机号 / 暂不验证
 *   sms / sms_sent / sms_wrong / sms_expired / sms_sendfail   短信验证码登录
 *   phone_conflict   号码已绑定其他账号
 *   phone_ok         验证成功，回到原流程
 * 我的 / 个人信息（W11 D-116）
 *   m_guest（M01）未登录入口；m_change / m_change_sent / m_change_conflict / m_change_ok（ACC profile）更换登录手机号
 *   quote_expired（O01）报价过期只刷新报价，不重新验证手机号
 * 预约（BOOKING）、企业咨询（BUSINESS，W11 D-117 同 D-112）
 *   W14 D-126：未登录时授权手机号 = 同时注册登录（bk_login 打开同一登录层；bk_sms = 其他手机号登录；bk_contact_sms = 已登录改本次联系电话）
 *   bk_unauth        联系电话 = 微信手机号授权按钮
 *   bk_wx            提交时调起微信手机号弹窗（示意）
 *   bk_authed        已取得号码
 *   bk_denied        不允许 → 其他手机号 + 短信验证
 *   bk_sms           其他手机号验证码
 *   bk_contact       修改联系电话（不改登录手机号）
 */
(function(){
  const auth=new URLSearchParams(location.search).get('auth');if(!auth)return;
  const PAGE=document.body.dataset.page||'';
  const $el=h=>{const t=document.createElement('template');t.innerHTML=h.trim();return t.content.firstElementChild;};
  const screen=document.getElementById('screen');
  let ovr=document.getElementById('overlay-root');if(!ovr){ovr=$el('<div id="overlay-root"></div>');document.body.append(ovr);}
  const C=window.MK_CONTRACT,W=window.MK_W7,F=window.SIM_FIXTURES;
  const REG=C&&C.docName?C.docName('register'):'《迷你考拉用户注册协议和个人信息保护政策》';
  const HOTLINE=C&&C.t?C.t('service.hotline'):'400-035-8885';
  const PRIVACY_DOC='《迷你考拉仓小程序隐私保护指引》';
  const svg=(d,cls)=>'<svg class="'+(cls||'ico sm')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';
  const I={lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',pin:'<path d="M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11Z"/><circle cx="12" cy="10" r="2.2"/>',close:'<path d="M6 6l12 12M18 6 6 18"/>',check:'<path d="m5 12 4.5 4.5L19 7"/>',chev:'<path d="m9 6 6 6-6 6"/>'};
  const toast=m=>document.body.append($el('<div class="toastwrap" role="status"><span class="toast">'+m+'</span></div>'));
  const dialog=(title,body,acts,extra)=>ovr.append($el('<div class="scrim center" role="alertdialog" aria-modal="true" aria-label="'+title+'"><div class="dialog w9dlg"><h4>'+title+'</h4>'+body+'<div class="acts">'+acts+'</div>'+(extra||'')+'</div></div>'));
  /* 微信原生弹窗示意：底部白色面板，带「示意」角标，文案结构仿官方但不冒充真机截图 */
  const native=(what,purpose,inner,deny,allow)=>ovr.append($el('<div class="scrim" role="dialog" aria-modal="true" aria-label="微信授权弹窗示意"><div class="sheet w9native"><div class="w9app"><i></i>迷你考拉仓<span>申请</span></div><h4>'+what+'</h4><p class="note">'+purpose+'</p>'+(inner||'')+'<div class="acts"><button type="button" class="btn neutral" data-action="deny">'+deny+'</button><button type="button" class="btn primary" data-action="allow">'+allow+'</button></div></div></div>'));
  document.body.dataset.auth=auth;

  /* ---------- W12 D-119：定位提醒 = 城市选择区轻气泡（浮层，不占内页高度）；取代 W9 的页内状态条 ---------- */
  const cityBtn=screen.querySelector('.topbar .city');
  function lochint(text,act,quiet){
    if(!cityBtn)return;
    cityBtn.classList.add('w12off');cityBtn.insertAdjacentHTML('beforeend','<i class="w12dot" aria-hidden="true"></i>');
    cityBtn.setAttribute('aria-label','当前城市 北京，定位未开启');
    if(quiet)return;
    if(getComputedStyle(screen).position==='static')screen.style.position='relative';
    const r=cityBtn.getBoundingClientRect(),sr=screen.getBoundingClientRect();
    const n=$el('<div class="w12pop" role="status" aria-label="定位提醒"><span class="tx">'+text+'</span><button type="button" class="btn text sm" data-action="'+act[0]+'">'+act[1]+'</button><button type="button" class="x" aria-label="关闭定位提醒" data-action="closeHint">'+svg(I.close,'ico sm')+'</button></div>');
    n.style.top=(r.bottom-sr.top+6)+'px';n.style.left=Math.max(12,r.left-sr.left-4)+'px';
    screen.append(n);
  }
  const LOC={
    loc_ok:()=>{},
    privacy_declined:()=>lochint('开启定位，查看离您近的门店',['enableLocation','开启']),
    loc_denied:()=>lochint('开启定位，查看离您近的门店',['openSetting','去开启']),
    loc_system:()=>lochint('手机定位未开启',['sysHelp','查看方法']),
    loc_timeout:()=>lochint('暂未获取到位置',['relocate','重试']),
    loc_quiet:()=>lochint('',[],true),
  };
  /* W26 A2（张坤 2026-11-18）：定位到没有门店的城市 → 说明后回到北京。不拦截、不弹确认：页面直接是北京内容，气泡给「切换城市」。
     公里数是相对用户所在位置的，人在外地时不显示；「满6个月免费运输」标签依赖距离，同样不显示。 */
  const NOCITY='成都'; /* 演示城市 */
  function nocity(){
    if(!cityBtn)return;
    cityBtn.setAttribute('aria-label','当前城市 北京；您所在的'+NOCITY+'暂无门店');
    if(getComputedStyle(screen).position==='static')screen.style.position='relative';
    const r=cityBtn.getBoundingClientRect(),sr=screen.getBoundingClientRect();
    const n=$el('<div class="w12pop w26nocity" role="status" aria-label="城市提醒"><span class="tx">'+NOCITY+'暂无门店，已为您显示北京门店</span><button type="button" class="btn text sm" data-action="changeCity">切换城市</button><button type="button" class="x" aria-label="关闭城市提醒" data-action="closeHint">'+svg(I.close,'ico sm')+'</button></div>');
    n.style.top=(r.bottom-sr.top+6)+'px';n.style.left=Math.max(12,r.left-sr.left-4)+'px';
    screen.append(n);
    document.querySelectorAll('.scard .meta > b, .rcard .loc > b').forEach(b=>{const nx=b.nextElementSibling;b.remove();if(nx)nx.textContent=nx.textContent.replace(/^·\s*/,'');});
    const FT=W&&W.FREE_TRANSPORT&&W.FREE_TRANSPORT.tag;
    if(FT)document.querySelectorAll('.scard .tags .tag').forEach(t=>{if(t.textContent===FT)t.remove();});
    document.body.dataset.nocity=NOCITY;
  }
  /* W14 D-127：搜索面板与城市选择层合并为全站唯一的「用仓位置」面板，移到 pages/w14.js（search_* / loc_area / loc_far；city_off 退役） */
  if(auth==='privacy'){
    dialog('隐私保护指引','<p class="w9p">使用定位、手机号等功能前，请阅读并同意 <a href="#privacy-guide">'+PRIVACY_DOC+'</a>。</p><ul class="w9list"><li><b>位置信息</b><span>查找附近门店、计算距离</span></li><li><b>手机号</b><span>登录、预约联系、订单通知</span></li><li><b>身份证件信息</b><span>下单时实名认证</span></li></ul><p class="w9fine">各项信息仅在您使用对应功能时收集。拒绝后仍可浏览门店并手动选择城市。</p>','<button type="button" class="btn neutral md" data-action="privacyDecline">拒绝</button><button type="button" class="btn primary md" data-action="privacyAgree">同意</button>');
  }else if(auth==='privacy_loc'||auth==='privacy_loc_checked'){
    const on=auth==='privacy_loc_checked';
    native('获取你的位置信息','用于查找附近门店及计算距离；也可以手动选择城市。','<div class="cbox w9pv'+(on?' on':'')+'" role="checkbox" tabindex="0" aria-checked="'+on+'" aria-label="同意隐私保护指引"><span class="box">'+svg(I.check,'ico')+'</span><span>我已阅读并同意 <a href="#privacy-guide">'+PRIVACY_DOC+'</a></span></div>','拒绝','允许');
    if(!on){const b=ovr.querySelector('[data-action="allow"]');b.classList.add('disabled');b.disabled=true;b.setAttribute('aria-disabled','true');}
  }else if(auth==='loc_ask'){
    native('获取你的位置信息','用于查找附近门店及计算距离；也可以手动选择城市。','','拒绝','允许');
  }else if(auth==='loc_settings'){
    LOC.loc_quiet();
    dialog('开启位置权限','<p class="w9p">在小程序设置中，将「位置信息」改为「使用小程序时」。不开启也可以手动选择城市。</p>','<button type="button" class="btn neutral md" data-action="close">暂不开启</button><button type="button" class="btn primary md" data-action="openSetting">去设置</button>');
  }else if(auth==='loc_nocity'&&(PAGE==='H01'||PAGE==='S01')){nocity();
  }else if(LOC[auth]&&(PAGE==='H01'||PAGE==='S01')){LOC[auth]();if(auth==='loc_ok'&&PAGE==='H01')toast('已定位到朝阳区');}

  /* ---------- 未验证：整期金额锁定（S5 / S01 / S02 / QUICK）---------- */
  const PHONE_KEYS=['locked','phone','phone_agree','phone_wx','phone_loading','phone_fail','phone_denied','sms','sms_sent','sms_wrong','sms_expired','sms_sendfail','phone_conflict'];
  /* W12 D-121：验证 = 注册登录同一逻辑。不再显示「验证手机号后显示整期价格」区块与锁图标行；
     未登录时卡片价格位显示门店均价（与无需求浏览态同一表达），「查看报价」直接调起登录层 */
  const avgBox=id=>{try{const s=F.stores.find(x=>x.id===id);return W.fromPriceHtml(s)||'';}catch(_){return '';}}; /* W17 D-140 */
  function lockPrices(){
    const sid=el=>{const c=el&&el.closest('[data-store]');return c?c.dataset.store:(F.stores[0]&&F.stores[0].id);};
    document.querySelectorAll('.scard:not(.compact) .foot, .urow .foot').forEach(f=>{
      const box=f.firstElementChild;if(!box||!box.querySelector('.price'))return;
      box.innerHTML=avgBox(sid(f));
      const b=f.querySelector('.card-cta');if(b){b.textContent='查看报价';b.dataset.action='phone';}
    });
    document.querySelectorAll('.scard.compact .cprice').forEach(c=>{c.innerHTML=avgBox(sid(c));});
    document.querySelectorAll('.combo .price, .combo .price-sec').forEach(p=>{if(p.classList.contains('price'))p.outerHTML=avgBox(sid(p));else p.remove();});
    const pc=document.querySelector('.pricecard');
    if(pc){const p=pc.querySelector('.price');if(p)p.outerHTML=avgBox(sid(p));pc.querySelector('.price-sec')?.remove();pc.querySelector('.lk')?.remove();
      const am=document.querySelector('.actbar .qsum .amt');if(am){am.textContent='登录后显示';am.classList.add('muted');}
      const nb=document.querySelector('.actbar .btn.primary');if(nb){nb.textContent='查看报价';nb.dataset.action='phone';}}
  }
  if(PHONE_KEYS.includes(auth)&&['S5','S01','S02','QUICK'].includes(PAGE))lockPrices();

  /* ---------- 手机号登录层 ---------- */
  const cbox=(on,err)=>'<div class="cbox'+(on?' on':'')+'" role="checkbox" tabindex="0" aria-checked="'+!!on+'" aria-label="同意协议"><span class="box">'+svg(I.check,'ico')+'</span><span>我已阅读并同意 <a href="agreement.html?doc=register">'+REG+'</a></span></div>'+(err?'<p class="w9err" role="alert">请先阅读并勾选协议</p>':'');
  const PURPOSE='<p class="fine">手机号用于登录、查看报价、预约联系和订单通知，未注册的手机号将自动注册。</p>';
  const head=t=>'<div class="grab"></div><button type="button" class="close" aria-label="关闭登录" data-action="close">'+svg(I.close,'ico')+'</button><div class="auth-mark"><i></i>迷你考拉仓</div><h4 id="au-title">'+t+'</h4>';
  const sheetWrap=inner=>ovr.append($el('<div class="scrim" role="dialog" aria-modal="true" aria-labelledby="au-title"><div class="sheet w9sheet">'+inner+'</div></div>'));
  const note=(tone,t,s)=>'<div class="w9note '+tone+'" role="alert"><b>'+t+'</b>'+(s?'<span>'+s+'</span>':'')+'</div>';
  function loginSheet(o){o=o||{};
    sheetWrap(head('手机号快捷登录')+(o.note||'')+'<div class="stackacts" style="margin-top:8px">'+(o.noWx?'':'<button type="button" class="btn primary'+(o.loading?' disabled':'')+'"'+(o.loading?' disabled aria-disabled="true"':'')+' data-action="wechatPhone">'+(o.loading?'验证中…':'微信手机号快捷登录')+'</button>')+'<button type="button" class="btn '+(o.noWx?'primary':'neutral')+'" data-action="smsMode">其他手机号登录</button>'+(o.skip?'<button type="button" class="btn text" data-action="close">暂不登录，继续浏览</button>':'')+'</div>'+cbox(o.agreed,o.agreeErr)+PURPOSE);
  }
  function smsSheet(o){o=o||{};
    const ph=o.phone?'<span class="ph filled">'+o.phone+'</span>':'<span class="ph">请输入手机号</span>';
    const code=o.code?'<span class="ph filled">'+o.code+'</span>':'<span class="ph">请输入 6 位验证码</span>';
    sheetWrap(head(o.title||'其他手机号登录')+'<div class="field" style="margin-top:4px"><div class="flabel">手机号</div><div class="input" role="textbox" aria-label="手机号">'+ph+'</div></div><div class="field" style="margin-top:12px"><div class="flabel">验证码</div><div class="w9code"><div class="input'+(o.codeErr?' err':'')+'" role="textbox" aria-label="验证码">'+code+'</div><button type="button" class="btn neutral'+(o.wait?' disabled':'')+'"'+(o.wait?' disabled aria-disabled="true"':'')+' data-action="sendCode">'+(o.wait?o.wait+'s 后重发':o.resend?'重新获取':'获取验证码')+'</button></div>'+(o.err?'<p class="w9err" role="alert">'+o.err+'</p>':o.hint?'<p class="w9hint">'+o.hint+'</p>':'')+'</div><div class="stackacts"><button type="button" class="btn primary'+(o.ready?'':' disabled')+'"'+(o.ready?'':' disabled aria-disabled="true"')+' data-action="smsLogin">'+(o.cta||'登录')+'</button>'+(o.back===false?'':'<button type="button" class="btn text" data-action="wxMode">使用微信手机号</button>')+'</div>'+(o.noAgree?'':cbox(true))+(o.fine||''));
  }
  const wxPicker=()=>native('使用你的手机号','用于登录、预约联系和订单通知。','<div class="opt on"><span class="r">138****8000<small>微信绑定号码</small></span>'+svg(I.check)+'</div><div class="opt"><span class="r">使用其他号码</span>'+svg(I.chev)+'</div>','不允许','允许');
  const P={
    phone:()=>loginSheet(),
    phone_agree:()=>loginSheet({agreeErr:true}),
    phone_wx:()=>wxPicker(),
    phone_loading:()=>loginSheet({agreed:true,loading:true}),
    phone_fail:()=>loginSheet({agreed:true,noWx:true,skip:true,note:note('err','微信手机号暂时无法获取','请使用其他手机号，通过短信验证码登录。')}),
    phone_denied:()=>loginSheet({agreed:true,skip:true,note:note('info','未取得微信手机号','可以改用其他手机号，或先继续浏览。')}),
    sms:()=>smsSheet(),
    sms_sent:()=>smsSheet({phone:'138 0013 8000',wait:52,hint:'验证码已发送，5 分钟内有效'}),
    sms_wrong:()=>smsSheet({phone:'138 0013 8000',code:'482913',codeErr:true,wait:31,err:'验证码不正确，请重新输入',ready:true}),
    sms_expired:()=>smsSheet({phone:'138 0013 8000',code:'482913',codeErr:true,resend:true,err:'验证码已过期，请重新获取'}),
    sms_sendfail:()=>smsSheet({phone:'138 0013 8000',resend:true,err:'发送过于频繁，请稍后再试'}),
    phone_conflict:()=>dialog('该手机号已绑定其他微信账号','<p class="w9p">为保护账户和订单安全，不会自动合并账户。您可以换一个手机号，或联系客服 '+HOTLINE+' 处理。</p>','<a class="btn neutral md" href="tel:'+HOTLINE.replace(/-/g,'')+'">联系客服</a><button type="button" class="btn primary md" data-action="smsMode">换个手机号</button>'),
    phone_ok:()=>toast('登录成功'),
  };
  if(P[auth]&&PAGE!=='BOOKING'&&PAGE!=='BUSINESS'&&PAGE!=='H01')P[auth]();

  /* ---------- W11 D-116：手机号绑定长期有效；报价单独计时 ---------- */
  if(PAGE==='M01'&&(auth==='m_guest'||auth==='phone')){
    const lk=document.querySelector('.ucard .lk');if(lk)lk.outerHTML='<button type="button" class="btn neutral sm w9login" data-action="phone">登录 / 注册</button>';
  }
  if(PAGE==='ACC'&&auth.startsWith('m_change')){
    const CH={title:'更换登录手机号',cta:'确认更换',noAgree:true,back:false,fine:'<p class="fine">更换后使用新手机号登录，订单、优惠券和预约记录保留在当前账户。</p>'};
    if(auth==='m_change')smsSheet(CH);
    if(auth==='m_change_sent')smsSheet(Object.assign({phone:'139 0013 9000',wait:52,hint:'验证码已发送，5 分钟内有效'},CH));
    if(auth==='m_change_conflict')P.phone_conflict();
    if(auth==='m_change_ok')toast('登录手机号已更换');
  }
  if(PAGE==='O01'&&auth==='quote_expired'){
    const bar=$el('<section class="w9loc flush w9quote" role="status" aria-label="报价状态">'+svg(I.lock)+'<div class="tx"><b>报价已超过 '+(W&&W.QUOTE_TTL_H||3)+' 小时</b><span>刷新后显示最新金额</span></div><div class="ac"><button type="button" class="btn text sm" data-action="refreshQuote">刷新报价</button></div></section>');
    const b=document.getElementById('body');const first=b&&b.firstElementChild;if(first)first.before(bar);
    const nb=document.querySelector('.actbar .btn.primary');if(nb){nb.textContent='刷新报价';nb.dataset.action='refreshQuote';nb.classList.remove('disabled');nb.disabled=false;nb.removeAttribute('aria-disabled');nb.parentElement.querySelector('.hint')?.remove();}
    const am=document.querySelector('.actbar .amt');if(am){am.textContent='刷新后显示';am.classList.add('muted');}
  }

  /* ---------- 预约：联系电话走微信手机号授权（D-112）---------- */
  if((PAGE==='BOOKING'||PAGE==='BUSINESS')&&auth.startsWith('bk_')){
    const WHAT=PAGE==='BUSINESS'?'咨询':'预约';
    const field=[...document.querySelectorAll('.field')].find(f=>f.querySelector('.flabel')?.textContent.includes('联系电话'));
    const setField=h=>{if(!field)return;field.querySelectorAll(':scope > :not(.flabel)').forEach(n=>n.remove());field.insertAdjacentHTML('beforeend',h);};
    const authed='<div class="input w9authed" aria-label="联系电话"><span class="ph filled">138****8000</span><span class="tag ok">已验证</span><button type="button" class="btn text sm" data-action="changeContact">修改</button></div>';
    /* W14 D-126：未登录用户在预约 / 企业页授权手机号 = 同时完成注册登录，打开的是全站同一个登录层；已登录用户直接带出登录手机号 */
    const unauth='<button type="button" class="btn neutral w9wxbtn" data-action="phone">使用微信手机号</button><p class="w9hint">授权后同时完成登录，用于顾问电话联系您。</p>';
    if(auth==='bk_unauth')setField(unauth);
    if(auth==='bk_login'){setField(unauth);loginSheet();}
    if(auth==='bk_wx'){setField(unauth);wxPicker();}
    if(auth==='bk_authed')setField(authed);
    if(auth==='bk_denied'){setField(unauth);loginSheet({agreed:true,note:note('info','未取得微信手机号',WHAT+'需要一个可联系的手机号，可以改用其他手机号登录。')});}
    if(auth==='bk_sms'){setField(unauth);smsSheet({phone:'139 0013 9000',wait:52,hint:'验证码已发送，5 分钟内有效'});}
    /* 已登录用户改本次联系电话：只改这一次，不换登录手机号 */
    if(auth==='bk_contact_sms'){setField(authed);smsSheet({title:'验证其他手机号',phone:'139 0013 9000',wait:52,hint:'验证码已发送，5 分钟内有效',cta:'确认',noAgree:true,back:false,fine:'<p class="fine">该号码仅作为本次'+WHAT+'的联系电话，不会更换您的登录手机号。</p>'});}
    if(auth==='bk_contact'){setField(authed);ovr.append($el('<div class="scrim" role="dialog" aria-modal="true" aria-label="修改联系电话"><div class="sheet w9sheet"><div class="grab"></div><h4>修改联系电话</h4><p class="note">只修改本次'+WHAT+'的联系电话，不会更换您的登录手机号。</p><div class="opt on"><span class="r">138****8000<small>微信手机号</small></span>'+svg(I.check)+'</div><div class="opt" data-action="smsMode"><span class="r">使用其他手机号<small>需短信验证</small></span>'+svg(I.chev)+'</div><div class="acts"><button type="button" class="btn primary" data-action="close">完成</button></div></div></div>'));}
  }
  window.__W9AUTH={auth,page:PAGE};window.MK_W9={LOC,svg,I,$el,ovr,toast};
})();
