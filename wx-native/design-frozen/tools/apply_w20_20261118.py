"""W20（2026-11-18）：D-146～D-155 文案与规则补丁（非幂等，只在 W17 工作树副本上跑一次）。"""
import re,os,io
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
buf={}
def rd(f):
    if f not in buf: buf[f]=open(os.path.join(ROOT,f),encoding='utf-8').read()
    return buf[f]
log=[];bad=[]
def rep(f,old,new,n=None):
    s=rd(f);c=s.count(old)
    if not(c>0 and (n is None or c==n)): bad.append((f,old[:60],c));return
    buf[f]=s.replace(old,new);log.append((f,old[:40],c))
def rex(f,pat,new,n=None):
    s=rd(f);s2,c=re.subn(pat,new,s)
    if not(c>0 and (n is None or c==n)): bad.append((f,pat[:60],c));return
    buf[f]=s2;log.append((f,pat[:40],c))
R='model/w7-rules.js';W1='pages/w1-render.js';W2='pages/w2-render.js';W3='pages/w3-render.js';W4='pages/w4-render.js';W5='pages/w5-render.js';W6='pages/w6-render.js';W7F='pages/w7f-render.js';W9='pages/w9-auth.js';ARR='pages/w13-arrival.js'
# ---- D-146 / D-147：仓位行「/月起」与门店同用最低折扣档；起价小数进位 ----
rep(R,"const storeFromText=(s,core)=>{const v=storeFromCubic(s,core);return v==null?null:Math.trunc(v);};",
  "const storeFromText=(s,core)=>{const v=storeFromCubic(s,core);return v==null?null:Math.ceil(v-1e-9);}; /* W20 D-147：起价小数进位 */\n  /* W20 D-146：单个仓位的「/月起」与门店级同口径 = 折扣表最低档下的月租，小数进位（取代 0.65 档 PUBLIC_TERM） */\n  const unitFromMonthly=(core,u)=>Math.ceil(core.amounts([u.id],BEST_TERM).monthly_average-1e-9);",1)
rep(R,"root.MK_W7={storeFromCubic,","root.MK_W7={unitFromMonthly,storeFromCubic,",1)
rep(W2,"const unitPublicMonthly=(core,u)=>core.amounts([u.id],PUBLIC_TERM).monthly_average;","const unitPublicMonthly=(core,u)=>W7.unitFromMonthly(core,u); /* W20 D-146 */",1)
rep(W3,"const unitPublicMonthly=(core,u)=>core.amounts([u.id],PUBLIC_TERM).monthly_average;","const unitPublicMonthly=(core,u)=>window.MK_W7.unitFromMonthly(core,u); /* W20 D-146 */",1)
# ---- C-02 快捷下单选店层：均价 → 月起 ----
rep(W3,"avg=W7.storeAvgText(x);","avg=W7.storeFromText(x,core);",1)
rep(W3,"avg==null?'':'均价 ¥'+avg","avg==null?'':'¥'+avg",1)
# ---- C-06 ----
rep(W3,"capacity_hint:'30m³ 以上'","capacity_hint:'30m³ 及以上'",1)
rep(W5,"browseSales:'30m³ 以上由顾问配仓","browseSales:'30m³ 及以上由顾问配仓",1)
rep(W5,"+W7.SALES_CAP_M3+'m³ 以上由顾问配仓，不进入自助找仓。</div>'","+W7.SALES_CAP_M3+'m³ 及以上由顾问配仓。</div>'",1)
# ---- C-09 登录用词 ----
rep(W2,"authorized?'手机号 · 已验证':st.contactPhone?'联系电话 '+esc(st.contactPhone)+' · 未验证'","authorized?'登录手机号 138****8000':st.contactPhone?'联系电话 '+esc(st.contactPhone)+' · 未登录'",1)
rep(W2,'aria-label="关闭手机号验证"','aria-label="关闭登录"',1)
rep(W2,"手机号用于登录、查看整期报价、预约联系和订单通知。验证通过后自动注册或登录。暂不验证也可继续浏览门店与仓位。","手机号用于登录、查看报价、预约联系和订单通知，未注册的手机号将自动注册。",1)
rep(W2,"请先从附近门店选择仓位，并完成必要的验证后继续下单。","请先从附近门店选择仓位，再继续下单。",1)
rep(W9,"未注册的手机号将自动注册。手机号用于查看报价、预约联系和订单通知。","手机号用于登录、查看报价、预约联系和订单通知，未注册的手机号将自动注册。",1)
# ---- C-10 / 冗余 12：续租报价过期统一一句，只在报价与提醒处出现 ----
RN="过期后按常规折扣价续租"
rep(W1,"报价 24 小时内有效，过期后按折扣表价格续租。","续租报价 24 小时内有效，"+RN+"。",1)
rep(W6,"续租报价 24 小时内有效，过期后按常规折扣续租。","续租报价 24 小时内有效，"+RN+"。",1)
rep(W4,"小时内有效，过期恢复常规折扣价。','warn']","小时内有效，"+RN+"。','warn']",1)
rep(W4,"报价已过期，已恢复常规折扣价；仍可按常规折扣价续租。","续租报价已过期，可按常规折扣价续租。",1)
rex(W4,r"门店报价 '\+W\.RENEW_QUOTE_TTL_H\+' 小时内有效，过期恢复常规折扣价。","",1)
rep(W4,"'过期未确认的，恢复常规折扣价，仍可续租。付款完成后新租期生效。","'"+RN+"。付款完成后新租期生效。",1)
rep(W4,"付款完成后新租期生效；报价过期未付款的，恢复常规折扣价。","付款完成后新租期生效。",1)
rex(W4,r"门店确认报价后会通知您；报价 '\+W\.RENEW_QUOTE_TTL_H\+' 小时内有效，过期恢复常规折扣价。","门店确认报价后会通知您。",1)
rep(W4,"<span class=\"sub\">折扣表'+(disc?' · '+disc:'')+'</span>","<span class=\"sub\">'+(disc||'')+'</span>",1)
# ---- C-14 / C-16 ----
rep(W6,"payment_failed:['继续支付说明','订单与仓位保留至下单后 3 小时，期间可继续支付。']","payment_failed:['付款帮助','订单与仓位保留至支付截止时间，截止前可继续支付。']",1)
rep(W4,"const PLACEHOLDER='以合同约定为准'","const PLACEHOLDER='以协议约定为准'",1)
# ---- 内部表达 ----
UNLOCK='一键开锁即将开通，目前请按入仓指引到店存取'
rep(W1,"toast('开锁功能演示占位，后续接入')","toast('"+UNLOCK+"')",1)
rep(W4,"const UNLOCK_TOAST='开锁功能演示占位，后续接入'","const UNLOCK_TOAST='"+UNLOCK+"'",1)
rep(W4,"一键开锁为演示占位，功能后续接入。",UNLOCK+"。",1)
rex(W6,r"toast\('开锁[^']*'\)","toast('"+UNLOCK+"')")
rep(ARR,"'进门方式','手机开门，租后在「我的仓位」操作'","'进门方式','一键开锁（即将开通），租后在「我的仓位」操作'",1)
rep(W1,"identity:['入仓前准备','完成身份验证后，起租日可使用仓门开锁。']","identity:['入仓前准备','完成实名认证后，起租日起可入仓存取。']",1)
rep(W2,'data-value="success">体验支付成功流程</button><button type="button" class="btn neutral" data-action="payResult" data-value="failed">体验支付失败流程</button><button type="button" class="btn text" data-action="cancelPay">暂不支付，保留待支付记录</button>',
  'data-value="success">微信支付 \'+money(pendingOrder.payable)+\'</button>\'+(q.get(\'review\')===\'1\'?\'<button type="button" class="btn neutral" data-action="payResult" data-value="failed">（评审用）模拟支付失败</button>\':\'\')+\'<button type="button" class="btn text" data-action="cancelPay">暂不支付</button>',1)
rep(W2,"sheet('支付流程',''+feeListHtml","sheet('确认支付',''+feeListHtml",1)
rep(W2,"const meta=c=>'<small>有效期 '+esc(c.valid_until||c.expires_at||'—')+' · 使用门槛 '+esc(c.threshold_text||c.condition||'—')+'</small>';",
  "const meta=c=>{const v=c.valid_until||c.expires_at,t=c.threshold_text||c.condition,x=[v?'有效期 '+esc(v):'',t?esc(t):''].filter(Boolean).join(' · ');return x?'<small>'+x+'</small>':'';}; /* W20：没有值就不显示这一行 */",1)
rep(W2,"esc(c.name)+'<br>'+meta(c)+","esc(c.name)+(meta(c)?'<br>'+meta(c):'')+",1)
TN='下单前即可预约运输 / 搬运，由顾问确认方案与费用，不计入本次应付。'
rex(W6,r"const TRANSPORT_NOTE='[^']*'","const TRANSPORT_NOTE='"+TN+"'",1)
rex(W6,r"运输 / 搬运按线索处理，不计价、不进应付金额，由顾问确认；[^<]*",TN,1)
rep(W6,"'当前方案需重新核价'","'当前方案需重新报价'",1); rep(W6,"'去确认订单':'重新核价'","'去确认订单':'重新报价'",1)
rep(W6,"容量、租期和联系方式保留；企业其他字段可返回独立表单重新提交。","容量、租期和联系方式保留；企业资料可在「补充企业资料」里修改。",1)
rep(W5,"带入找仓时按 '","找仓时按 '",1)
rex(W4,r"'订单保留至 '\+hm\(exp\)\+'（自下单起 '\+W\.PENDING_TTL_H\+' 小时，不重新计时）。","'订单保留至 '+hm(exp)+'。",1)
rep(W1,"押金进度以订单审核记录为准。","押金退还进度可在订单详情查看。",1); rep(W6,"押金进度以订单审核记录为准。","押金退还进度可在订单详情查看。",1)
rep(W5,"LEAD_NOT_FOUND:'原需求不存在，请从「预约与咨询」打开或明确新建',LEAD_WITHDRAWN:'该需求已撤回，可明确新建其他需求'","LEAD_NOT_FOUND:'这条需求已不存在，请从「预约与咨询」重新打开，或重新提交',LEAD_WITHDRAWN:'这条需求已撤回，可重新提交'",1)
rep(W5,'<div class="t">原需求不存在或已撤回</div><div class="s">可明确新建另一条需求。</div>','<div class="t">这条需求已不存在或已撤回</div><div class="s">可以重新提交一条需求。</div>',1)
rep(W5,"const TITLE='商家/企业用户快捷选仓'","const TITLE='商家 / 企业用仓'",1)
rep(W5,"const INTRO='我们为复杂、多仓、长期仓库租赁用户提供专属仓储方案。填写用仓需求，提交后'+W7.LEAD_COPY.inHours+'。'","const INTRO='多仓、长期或用量较大的商家与企业用仓，由顾问为您配仓。'",1)
rep(W5,"'专属客服'","'专属顾问'",1)
rep(W6,'<div class="t">演示占位</div><div class="s">活动规则后续补充，当前页面不展示奖励内容。</div>','<div class="t">活动筹备中</div><div class="s">活动开始后，规则与奖励会在这里更新。</div>',1)
rep(W6,"url=location.origin+location.pathname.replace(/acc\\.html$/,'h01.html')+'?ref=LOCAL-KOALA';","url='小程序首页 · 我的邀请码'; /* W20：不露本机地址；正式链接由代码侧生成 */",1)
# ---- 冗余 ----
rep(R,"offHours:'已收到，工作人员上班后将优先联系您'","offHours:'已收到，顾问上班后将优先联系您'",1)
rex(W6,r"工作人员上班后将优先联系您","顾问上班后将优先联系您")
rep(W6,"+(OFFHOURS?'':'<p class=\"s\">非服务时段提交的：'+esc(W7.LEAD_COPY.offHours)+'</p>')+'<p class=\"s\">'+esc(W7.LEAD_COPY.hoursNote)+'</p>'","+(OFFHOURS?'<p class=\"s\">'+esc(W7.LEAD_COPY.hoursNote)+'</p>':'')",1)
rep(W6,"esc(W7.LEAD_COPY.inHours)+'；非服务时段提交的，顾问上班后将优先联系您。'+esc(W7.LEAD_COPY.hoursNote)+'</div></section>'","esc(W7.LEAD_COPY.inHours)+'；非服务时段提交的，顾问上班后将优先联系您。</div></section>'",1)
rep(W2,"<p class=\"fine\">'+esc(W7.LEAD_COPY.hoursNote)+'</p></div>'));}","</div>'));}",1)
rep(W3,"提交后'+esc(W7.LEAD_COPY.inHours)+'。'+esc(W7.LEAD_COPY.hoursNote)+'</div></div></section>':","提交后'+esc(W7.LEAD_COPY.inHours)+'。</div></div></section>':",1)
rep(W3,"(off?'':'非服务时段提交的：'+esc(W7.LEAD_COPY.offHours)+'<br>')+esc(W7.LEAD_COPY.hoursNote)+(mode==='booking'?'<br>'+esc(W7.LEAD_COPY.notLock):'')","(off?esc(W7.LEAD_COPY.hoursNote)+(mode==='booking'?'<br>':''):'')+(mode==='booking'?esc(W7.LEAD_COPY.notLock):'')",1)
rep(W3,"，暂不产生订单<br>'+esc(W7.LEAD_COPY.hoursNote)+'</p>'","，暂不产生订单</p>'",1)
rep(W3,"+ico('i-check','ico xs')+'品牌保障 · 安全可靠'+(st?' · 存取时间 '+esc(accessHours(st)):'')+","+(st?ico('i-clock','ico xs')+'存取时间 '+esc(accessHours(st)):'')+",1)
rep(W2,"'<span class=\"tag\">独立仓位</span><span class=\"tag\">实体门</span><span class=\"tag\">空间示意</span></div>'","'</div>'",1)
rep(W2,"sub.textContent=({matched:'按您的容量和租期匹配',","sub.textContent=({matched:'',",1)
# ---- 用词统一 ----
for f in (W1,W4,W6,W2,W3,W5,W7F,W9,'pages/w14.js',ARR):
    s=rd(f)
    for a,b in (('退仓与验仓','退租与验收'),('退仓验收','退租验收'),('验仓','验收'),('用仓身份验证','实名认证'),('身份验证','实名认证'),('用仓预约','预约用仓'),('已提交预约用仓','已提交预约')):
        s=s.replace(a,b)
    buf[f]=s
rep(W6,"退仓","退租") if '退仓' in rd(W6) else None
rep(W1,"退仓","退租") if '退仓' in rd(W1) else None
# ---- D-152 红酒箱从物品目录拿掉（runtime 原件不改，渲染层过滤）----
rep(W3,"const CATALOG=window.MK_ITEMS_CATALOG,SCENES=window.MK_ITEMS_SCENES;",
 "/* W20 D-152：红酒箱（winebox）拿掉；档案箱保留。runtime/items-catalog.js 原件未改，这里过滤 */\nconst HIDE_ITEMS=new Set(['winebox']);\nconst CATALOG=(c=>{const j=JSON.parse(JSON.stringify(c));(function w(o){for(const k in o){const v=o[k];if(Array.isArray(v)){o[k]=v.filter(x=>!(HIDE_ITEMS.has(x)||(x&&HIDE_ITEMS.has(x.id))));o[k].forEach(x=>x&&typeof x==='object'&&w(x));}else if(v&&typeof v==='object')w(v);}})(j);return j;})(window.MK_ITEMS_CATALOG),SCENES=(c=>{const j=JSON.parse(JSON.stringify(c));for(const k in j)if(Array.isArray(j[k].items))j[k].items=j[k].items.filter(x=>!HIDE_ITEMS.has(x));return j;})(window.MK_ITEMS_SCENES);",1)
if bad:
    for b in bad: print('MISS',b)
    raise SystemExit(1)
for f,s in buf.items(): open(os.path.join(ROOT,f),'w',encoding='utf-8').write(s)
print(len(log),'replacements in',len(buf),'files')
