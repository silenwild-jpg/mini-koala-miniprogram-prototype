"""W20 第二部分：D-148 下单实名 + 电子签署、D-153 账户退出/注销/撤回隐私授权、占位字样收口。非幂等。"""
import re,os,json
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
buf={};bad=[];n_ok=0
def rd(f):
    if f not in buf: buf[f]=open(os.path.join(ROOT,f),encoding='utf-8').read()
    return buf[f]
def rep(f,old,new,n=1):
    global n_ok
    s=rd(f);c=s.count(old)
    if not(c>0 and (n is None or c==n)): bad.append((f,old[:70],c));return
    buf[f]=s.replace(old,new);n_ok+=1
W2='pages/w2-render.js';W3='pages/w3-render.js';W4='pages/w4-render.js';W6='pages/w6-render.js';W7F='pages/w7f-render.js'
# ---------- 仓位叫法：去掉「独立仓」后缀（C-11） ----------
for f in (W2,W3): rep(f,"return cabin+(d?' · '+d:'');};","return cabin+(d?' · '+d.replace(/独立仓$/,''):'');}; /* W20 C-11 */")
# ---------- 占位字样 ----------
rep(W7F,"const PENDING='待业务提供',C=window.MK_CONTRACT,ct=k=>esc(C.t(k));","const PENDING='请咨询客服',C=window.MK_CONTRACT,ct=k=>{const t=C.t(k);return esc(t==='待业务提供'?PENDING:t);}; /* W20：业务未给口径的显示位统一写「请咨询客服」，不露内部字样 */")
rep(W7F,"<div class=\"t\">正文'+PENDING+'</div><div class=\"s\">本协议在合同文件中被引用，正文尚未提供，提供后在此展示。</div>","<div class=\"t\">协议正文暂未上线</div><div class=\"s\">如需了解协议内容，请联系客服。</div>")
rep(W7F,"正文逐字取自合同文件，仅合并了排版换行。版本与生效日期'+PENDING+'。","如对协议内容有疑问，请联系客服。")
rep(W7F,"可开具的发票种类'+PENDING+'；需要专用发票时请填写本段。","需要专用发票时请填写本段。")
rep(W7F,"押金是否计入开票金额待财务确认，本页暂只列租金与管理费。","本页列出租金与管理费；押金开票事宜请咨询客服。")
rep(W4,"C=window.MK_CONTRACT,ct=k=>esc(C.t(k)),HOTLINE=","C=window.MK_CONTRACT,ct=k=>{const t=C.t(k);return esc(t==='待业务提供'?'请咨询客服':t);},HOTLINE=")
rep(W4,"kv('可开票金额','待财务确认','soft')","kv('可开票金额','以开票结果为准','soft')")
# ---------- D-148 O01：下单时实名认证 + 电子签署 ----------
rep(W2,"  ready:()=>({core:readyCore()}),","  ready:()=>({core:readyCore()}),\n  idv_todo:()=>({core:readyCore(),idvTodo:true}), /* W20 D-148：已登录、未实名 */")
rep(W2,"  const submitting=!!built.submitting;","  const submitting=!!built.submitting;\n  /* W20 D-148：实名认证在下单签约时完成（使用协议 二.1）；演示：除 idv_todo 外已登录即视为已实名。姓名、证件号为演示占位 */\n  const idvDone=!built.idvTodo,IDV_NAME='*明',IDV_NO='110***********0012';")
rep(W2,"(authorized?'更换':'去登录')+'</button>')+'</span></div></section>'));",
 "(authorized?'更换':'去登录')+'</button>')+'</span></div></section>'));\n"
 "    body.append(el('<section class=\"card\" aria-label=\"实名信息\" data-w20=\"idv\"><div class=\"kv\" style=\"min-height:32px;border:0\"><span class=\"k\">实名信息</span><span class=\"v\">'+(!authorized?'<span style=\"font-weight:400;color:var(--mk-color-ink-secondary)\">登录后填写</span>':idvDone?esc(IDV_NAME)+' · '+esc(IDV_NO)+' <span class=\"tag ok\">已认证</span>':'<span style=\"font-weight:400;color:var(--mk-color-ink-secondary)\">未认证</span>')+(authorized&&!idvDone&&!locked?'<button type=\"button\" class=\"btn text sm\" data-action=\"idv\" style=\"margin-right:-8px\">去认证</button>':'')+'</span></div></section>'));")
rep(W2,"  else if(submitting){btn='正在提交…';disabled=true;showAgree=true;}\n  else{btn='确认订单';disabled=!agreed;showAgree=true;if(!agreed)hint='请先勾选同意协议';}",
 "  else if(!idvDone){btn='实名认证';action='idv';hint='签署协议前需完成实名认证';}\n  else if(submitting){btn='正在生成电子合同…';disabled=true;showAgree=true;}\n  else{btn='签署并提交';action='sign';disabled=!agreed;showAgree=true;if(!agreed)hint='请先勾选确认';} /* W20 D-148：勾选确认告知书与承诺 → 签署使用协议 → 生成电子合同 → 支付（使用协议 一.31、八.3） */")
rep(W2,'aria-label="同意用户使用告知书与自助式设备设施使用协议，并承诺不存放违规违禁物品"','aria-label="确认用户使用告知书，并承诺不存放违规违禁物品"')
rep(W2,"<span>我已阅读并同意 <a href=\"'+legalUrl('notice')+'\" data-legal=\"notice\">'+C.docName('notice')+'</a><a href=\"'+legalUrl('usage')+'\" data-legal=\"usage\">'+C.docName('usage')+'</a>，并承诺","<span>我已阅读并确认 <a href=\"'+legalUrl('notice')+'\" data-legal=\"notice\">'+C.docName('notice')+'</a>，并承诺")
rep(W2,"'仓位已为您保留，关闭支付窗口不会取消订单']));","'协议已签署，仓位已为您保留；关闭支付窗口不会取消订单']));")
rep(W2,"  if(ov==='fees'&&a)ovr.append(",
 "  /* W20 D-148：实名认证弹层（?overlay=idv[&idv=filled|err|checking]）与签署弹层（?overlay=sign） */\n"
 "  if(ov==='idv'&&authorized){const m=q.get('idv')||'',has=!!m,busy=m==='checking';\n"
 "    const inp=(lab,val,ph,err)=>'<div class=\"field\"><label>'+lab+'</label><div class=\"input'+(err?' err':'')+'\" role=\"textbox\" aria-label=\"'+lab+'\"><span class=\"ph'+(val?' filled':'')+'\">'+esc(val||ph)+'</span></div>'+(err?'<div class=\"ferr\">'+esc(err)+'</div>':'')+'</div>';\n"
 "    ovr.append(sheet('实名认证',inp('姓名',has?'张明':'','请填写证件上的姓名')+inp('身份证号',has?'110101********0012':'','请填写 18 位身份证号',m==='err'?'姓名与身份证号不一致，请核对后重试':'')+'<p class=\"fine\">用于核实签约人身份并签署协议，由依法设立的第三方机构核验。</p>','<div class=\"acts\"><button type=\"button\" class=\"btn primary block'+(!has||busy?' disabled':'')+'\" '+(!has||busy?'disabled aria-disabled=\"true\"':'')+' data-action=\"idvSubmit\">'+(busy?'认证中…':'提交认证')+'</button></div>'));}\n"
 "  if(ov==='sign'&&a&&idvDone&&!order){const row=(k,v)=>'<div class=\"kv\"><span class=\"k\">'+k+'</span><span class=\"v\">'+v+'</span></div>';\n"
 "    ovr.append(sheet('签署使用协议','<div class=\"kvlist\" style=\"padding:0\">'+row('签署人',esc(IDV_NAME)+' · '+esc(IDV_NO))+row('门店',esc(s.name))+row('仓位',esc(units.map(displayUnitName).join(' + ')))+row('租期',months+'个月 · '+esc(st.startDate||'')+' 起')+row('本次应付','<b>'+money(a.payable)+'</b>')+'</div><a class=\"lk\" style=\"display:inline-flex;min-height:32px;align-items:center;margin-top:8px\" href=\"'+legalUrl('usage')+'\" data-legal=\"usage\">查看'+C.docName('usage')+'</a><p class=\"fine\">点击「签署」即确认以上订单信息准确、完整。签署后生成电子合同，并进入支付。</p>','<div class=\"acts\"><button type=\"button\" class=\"btn neutral\" data-action=\"closeOverlay\">返回修改</button><button type=\"button\" class=\"btn primary\" data-action=\"signConfirm\">签署</button></div>'));}\n"
 "  if(ov==='fees'&&a)ovr.append(")
rep(W4,"const rows=[],lk=v.lease_status;","const rows=[],lk=v.lease_status;\n    rows.push(lrow('i-shield','电子合同','已签署',false,'contract')); /* W20 D-148：签署后生成的电子合同在订单详情可查看 */")
rep(W6,"st==='pending'?'起租前完成，用于仓门开锁授权':''","st==='pending'?'下单时未完成的，请在起租前完成':''")
# ---------- D-153 个人信息页：退出登录 / 注销账号 / 隐私授权管理 ----------
rep(W6,"    if(OVL==='contact'||key==='contact_invalid')overlay(",
 "    /* W20 D-153：账户出口。注销条件、撤回后的处理是设计侧初稿，需法务确认 */\n"
 "    if(auth){const P='acc.html?view=profile&state='+key+'&overlay=';\n"
 "      body().append(el('<section class=\"card\" aria-label=\"账户与隐私\" data-w20=\"account\"><div class=\"sec-title\">账户与隐私</div>'+mrow('i-shield','隐私授权管理','',P+'privacy')+mrow('i-user','注销账号','',P+'delete')+'</section>'));\n"
 "      body().append(el('<div class=\"cancelrow\" data-w20=\"logout\">'+btn('退出登录','neutral md','logout')+'</div>'));\n"
 "      const dlg=(t,p,acts)=>el('<div class=\"scrim center\" role=\"alertdialog\" aria-modal=\"true\" aria-label=\"'+esc(t)+'\"><div class=\"dialog\"><h4>'+esc(t)+'</h4><p>'+p+'</p><div class=\"acts\">'+acts+'</div></div></div>');\n"
 "      const prow=(k,v,act)=>'<div class=\"kv\"><span class=\"k\">'+k+'</span><span class=\"v\">'+v+(act?' '+btn(act,'text sm','privacySetting'):'')+'</span></div>';\n"
 "      if(OVL==='logout')overlay(dlg('退出登录？','退出后仍可浏览门店；查看报价、订单和下单时需要重新登录。',btn('取消','neutral md','close')+btn('退出登录','primary md','confirmLogout')));\n"
 "      if(OVL==='privacy'||OVL==='privacy_confirm')overlay(sheet('隐私授权管理','<div class=\"kvlist\" style=\"padding:0\">'+prow('位置信息','已授权','去设置')+prow('手机号','已授权')+prow('实名信息','已认证')+'</div><p class=\"fine\">位置权限在微信「设置」里开关。撤回隐私授权后将退出登录，再次使用相关功能时会重新征得您的同意。</p><div class=\"acts\">'+btn('撤回隐私授权','neutral block','withdrawPrivacy')+'</div>'));\n"
 "      if(OVL==='privacy_confirm')overlay(dlg('撤回隐私授权？','撤回后将退出登录。已签署的协议和租用中的订单不受影响。',btn('取消','neutral md','close')+btn('确认撤回','primary md','confirmWithdraw')));\n"
 "      if(OVL==='delete')overlay(sheet('注销账号','<p class=\"para\">满足以下条件后可申请注销：</p><ul class=\"recheck\" style=\"margin:8px 0\"><li><span class=\"k\">没有租用中或待支付的订单</span></li><li><span class=\"k\">押金已退还</span></li><li><span class=\"k\">没有处理中的发票或退款</span></li></ul><p class=\"fine\">注销后，登录手机号、优惠券、预约与收藏记录将被删除。</p><div class=\"acts\">'+btn('暂不注销','neutral','close')+btn('申请注销','primary','confirmDelete')+'</div>'));\n"
 "      if(OVL==='delete_blocked')overlay(dlg('暂时不能注销','您有 1 个租用中的订单，退租并结清后可申请注销。',btn('知道了','neutral md','close')+'<a class=\"btn primary md\" href=\"oh01.html\">查看订单</a>'));\n"
 "      if(OVL==='delete_done')toast('已提交注销申请');\n"
 "    }\n"
 "    if(OVL==='contact'||key==='contact_invalid')overlay(")
if bad:
    for b in bad: print('MISS',b)
    raise SystemExit(1)
for f,s in buf.items(): open(os.path.join(ROOT,f),'w',encoding='utf-8').write(s)
# ---------- 回归状态登记 ----------
new={'o01':['idv_todo','idv_todo&overlay=idv','idv_todo&overlay=idv&idv=filled','idv_todo&overlay=idv&idv=err','idv_todo&overlay=idv&idv=checking','ready&agreed=1&overlay=sign','submitting'],
     'acc_profile':['verified&overlay=logout','verified&overlay=privacy','verified&overlay=privacy_confirm','verified&overlay=delete','verified&overlay=delete_blocked']}
p=os.path.join(ROOT,'tools','w7_states.json');j=json.load(open(p,encoding='utf-8'))
for k,ss in new.items():
    d=j.setdefault(k,{'states':[]})
    for s in ss:
        if s not in d['states']: d['states'].append(s)
json.dump(j,open(p,'w',encoding='utf-8'),ensure_ascii=False,indent=1)
json.dump({'added':new},open(os.path.join(ROOT,'tools','w20_states.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print(n_ok,'ok')
