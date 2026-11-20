"""W11（2026-11-18）：D-114 隐私+定位合并弹窗 / D-115 门槛口径 / D-116 绑定长期有效+报价单独计时 / D-117 企业页电话 / S5 按钮「查看报价」。
在 W10 工作树上原位打补丁；每处替换要求恰好命中 1 次。"""
import os,json,io
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def sub(path,old,new,n=1):
    p=os.path.join(R,path);s=open(p,encoding='utf-8').read()
    assert s.count(old)==n,(path,old[:40],s.count(old))
    open(p,'w',encoding='utf-8').write(s.replace(old,new))
A='pages/w9-auth.js'
sub(A," *   loc_ask          微信位置权限弹窗（示意）"," *   privacy_loc / privacy_loc_checked   W11 D-114：官方「与授权弹窗耦合」样式，隐私勾选 + 位置权限合并为一个弹窗（主方案）\n *   loc_ask          微信位置权限弹窗（示意）；privacy → loc_ask 两步为低版本基础库回退")
sub(A," * 预约（BOOKING）"," * 我的 / 个人信息（W11 D-116）\n *   m_guest（M01）未登录入口；m_change / m_change_sent / m_change_conflict / m_change_ok（ACC profile）更换登录手机号\n *   quote_expired（O01）报价过期只刷新报价，不重新验证手机号\n * 预约（BOOKING）、企业咨询（BUSINESS，W11 D-117 同 D-112）")
sub(A,"  }else if(auth==='loc_ask'){","""  }else if(auth==='privacy_loc'||auth==='privacy_loc_checked'){
    const on=auth==='privacy_loc_checked';
    native('获取你的位置信息','用于查找附近门店及计算距离；也可以手动选择城市。','<div class="cbox w9pv'+(on?' on':'')+'" role="checkbox" tabindex="0" aria-checked="'+on+'" aria-label="同意隐私保护指引"><span class="box">'+svg(I.check,'ico')+'</span><span>我已阅读并同意 <a href="#privacy-guide">'+PRIVACY_DOC+'</a></span></div>','拒绝','允许');
    if(!on){const b=ovr.querySelector('[data-action="allow"]');b.classList.add('disabled');b.disabled=true;b.setAttribute('aria-disabled','true');}
  }else if(auth==='loc_ask'){""")
sub(A,"b.textContent='验证看价'","b.textContent='查看报价'")
sub(A,"  if(P[auth]&&PAGE!=='BOOKING'&&PAGE!=='H01')P[auth]();","""  if(P[auth]&&PAGE!=='BOOKING'&&PAGE!=='BUSINESS'&&PAGE!=='H01')P[auth]();

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
    const bar=$el('<section class="w9loc flush w9quote" role="status" aria-label="报价状态">'+svg(I.lock)+'<div class="tx"><b>报价已过有效期</b><span>刷新后显示最新金额</span></div><div class="ac"><button type="button" class="btn text sm" data-action="refreshQuote">刷新报价</button></div></section>');
    const b=document.getElementById('body');const first=b&&b.firstElementChild;if(first)first.before(bar);
    const nb=document.querySelector('.actbar .btn.primary');if(nb){nb.textContent='刷新报价';nb.dataset.action='refreshQuote';}
    const am=document.querySelector('.actbar .amt');if(am){am.textContent='刷新后显示';am.classList.add('muted');}
  }""")
sub(A,"  if(PAGE==='BOOKING'&&auth.startsWith('bk_')){","  if((PAGE==='BOOKING'||PAGE==='BUSINESS')&&auth.startsWith('bk_')){\n    const WHAT=PAGE==='BUSINESS'?'咨询':'预约';")
sub(A,"未取得微信手机号。预约需要一个可联系的手机号。","未取得微信手机号。'+WHAT+'需要一个可联系的手机号。")
sub(A,"该号码仅作为本次预约的联系电话。","该号码仅作为本次'+WHAT+'的联系电话。")
sub(A,"只修改本次预约的联系电话，不会更换您的登录手机号。","只修改本次'+WHAT+'的联系电话，不会更换您的登录手机号。")
W6='pages/w6-render.js'
sub(W6,"+(auth?'':btn('验证手机号','primary md','phone'))+'</div></section>'));","+(auth?btn('更换登录手机号','neutral md','changePhone'):btn('验证手机号','primary md','phone'))+'</div></section>'));")
sub(W6,"'<section class=\"notice\" role=\"note\"><div class=\"s\">浏览服务无需登录；正式报价及下单时按统一规则验证。</div></section>'","'<section class=\"notice\" role=\"note\"><div class=\"s\">'+(auth?'登录手机号验证一次后长期有效，更换时需短信验证。':'浏览门店无需登录；查看整期报价、预约和下单前需验证手机号。')+'</div></section>'")
for f in ['business','m01','acc','o01']:
    sub('pages/%s.html'%f,'<script src="w7-sys.js"></script>','<script src="w7-sys.js"></script>\n<script src="w9-auth.js"></script>')
NEW={'h01':['new&auth=privacy_loc','new&auth=privacy_loc_checked'],
 'business':['restored&auth=bk_unauth','restored&auth=bk_wx','restored&auth=bk_authed','restored&auth=bk_denied','restored&auth=bk_sms','restored&auth=bk_contact'],
 'm01':['new&auth=m_guest','new&auth=phone'],
 'acc_profile':['verified&auth=m_change','verified&auth=m_change_sent','verified&auth=m_change_conflict','verified&auth=m_change_ok'],
 'o01':['ready&auth=quote_expired']}
p=os.path.join(R,'tools','w7_states.json');d=json.load(open(p,encoding='utf-8'))
for k,ss in NEW.items():
    e=d.setdefault(k,{'states':[]})
    for s in ss:
        assert s not in e['states'];e['states'].append(s)
json.dump(d,open(p,'w',encoding='utf-8'),ensure_ascii=False,indent=1)
json.dump(NEW,open(os.path.join(R,'tools','w11_auth_states.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('ok',sum(map(len,NEW.values())))
