"""W27（2026-11-18）：D-189 提前退仓按协议执行（撤回 D-165）；沿用报价过期仍沿用；订阅消息接验仓结果与到期提醒。非幂等。"""
import os,io,json
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def rep(f,a,b,n=1):
    p=os.path.join(R,f);s=io.open(p,encoding='utf-8').read();assert s.count(a)>=1,(f,a[:60]);assert n==0 or s.count(a)==n,(f,a[:60],s.count(a))
    io.open(p,'w',encoding='utf-8').write(s.replace(a,b))
W4='pages/w4-render.js'
# --- D-189 提前退仓：实际使用时间计费 + 违约金 + 已享优惠按实际使用周期重算（使用协议 三.10(2)、三.11）
rep(W4,"  /* W22 D-170：提前退仓只算违约金（D-165）= 剩余租金 20% 与 1 个月月租中较高者；界面只给一个数，不写规则（D-113） */",
"  /* W27 D-189（撤回 D-165）：提前退仓按协议执行。预计结算费用 = 违约金（剩余合同金额 20% 与 1 个月仓储服务费中较高者）+ 优惠重算补差（已用月数按其对应折扣档重算与原折扣的差额）；\n     已用月数不足 1 个月按 1 个月。界面只给一个数并写「约」，不写比例（D-113）；以门店结算为准。 */")
old=W4 and "const earlyFee=()=>{const o=core.state().orders.find(z=>z.id===id)||{},m=Number(o.deposit)||0,left=Math.max(0,Math.ceil((new Date(v.end_date)-new Date(core.today()))/2629800000));return Math.round(Math.max(m,m*left*0.2));};"
new=("const earlyCalc=()=>{const T=Number(raw.term_months)||v.total_months||0,f0=Number(raw.term_factor)||tf(T),base=(raw.unit_ids||[]).map(unitById).reduce((n,u)=>n+Number(u.base_month||0),0),mon=Math.trunc(base*f0+1e-9),"
 "de=new Date(v.end_date),dt=new Date(core.today()),cal=(de.getFullYear()-dt.getFullYear())*12+de.getMonth()-dt.getMonth()-(de.getDate()<dt.getDate()?1:0),left=Math.min(Math.max(0,T-1),Math.max(0,cal)),used=Math.max(1,T-left),f1=Math.max(f0,tf(used)),"
 "penalty=Math.round(Math.max(mon,mon*left*0.2)),redo=Math.max(0,Math.trunc(base*f1+1e-9)-mon)*used;return {used,left,mon,f0,f1,penalty,redo,fee:penalty+redo};},earlyFee=()=>earlyCalc().fee;")
rep(W4,old,new)
rep(W4,"kv('预计结算费用','约 '+money(earlyFee()))+kvl('费用结算',ct('early.rule')+'。 <a href=\"agreement.html?doc=usage\">查看协议</a>')",
       "kv('预计结算费用','约 '+money(earlyFee()))+kvl('费用结算',ct('early.rule')+'。 <a href=\"agreement.html?doc=usage\">查看协议</a>')+kvl('已享优惠',ct('early.promo'))")
rep(W4,"'提前退仓的预付租金处理：'+PLACEHOLDER+'。'","'提前退仓按实际使用时间结算，已享优惠按实际使用周期重新核算，具体以协议约定为准。'")
rep(W4,"window.__W4={page:'EX01',state:key,lease:v.lease_status,exit:xs,canStart};","window.__W4={page:'EX01',state:key,lease:v.lease_status,exit:xs,canStart,early:type==='early'?earlyCalc():null};")
rep('model/w7-rules.js',"const PREPAY_NOTE='租期折扣按预付整期计算';      /* D-160 */","const PREPAY_NOTE='租期折扣按预付整期计算，提前退仓时按协议重新核算';      /* D-160；W27 D-189 */")
# --- 沿用原折扣的报价过期：仍沿用，重新提交需求（待裁 #3 按建议）
rep(W4,"  quote_expired:rnQuote, /* W7","  quote_keep_expired:()=>legacyCore('lifeRenewalQuote',12), /* W27：沿用原折扣的报价过期，仍沿用，重新提交 */\n  quote_expired:rnQuote, /* W7")
rep(W4,"key={form_keep:'form',quote_keep:'quote_ready'}[key]||key;","key={form_keep:'form',quote_keep:'quote_ready',quote_keep_expired:'quote_expired'}[key]||key;")
rep(W4,"""  if(expiredQ)body().append(el('<section class="card notice" role="status"><div class="s">续租报价已过期，可按常规折扣价续租。</div></section>'));""",
"""  const kx=rkey==='quote_keep_expired'&&r?keepInfo(raw,v,r.months):null;
  if(expiredQ)body().append(el('<section class="card notice" role="status"><div class="s">'+(kx?'续租报价已过期。首次续租仍可沿用原订单的 '+esc(kx.label)+'，重新提交后由门店确认。':'续租报价已过期，可按常规折扣价续租。')+'</div></section>'));""")
rep(W4,"  if(expiredQ){\n    body().append(el('<section class=\"card rnquote\" aria-label=\"续租费用\">",
"""  if(expiredQ&&kx){
    body().append(el('<section class="card rnquote rnkeep" aria-label="续租费用"><div class="sec-title">续租费用</div><div class="fees"><div class="row"><span class="k">续租租金<span class="sub">'+r.months+'个月</span><span class="tag disc">'+esc(kx.label.replace(' ',''))+'</span></span><b class="amt">约 '+money(kx.total)+'</b></div><div class="sec">'+money(kx.monthly)+'/月 × '+r.months+'个月</div>'+
      '<div class="row ref"><span class="k">原门店报价<span class="sub">已过期</span></span><b class="amt muted strike">'+money(r.quote_total)+'</b></div></div><div class="kvlist">'+period+'</div><div class="rule">续租价格以门店确认的报价为准。</div></section>'));
    body().append(el('<div class="more-row rn-alt">'+btn('暂不续租','text','skipRenewal')+'</div>'));
    actbar('<div><div class="lab">续租 '+r.months+'个月 · 沿用 '+esc(kx.label)+'</div><div class="amt">约 '+money(kx.total)+'</div></div>'+btn('重新提交续租需求','primary','requestRenewal'));
  }
  if(expiredQ&&!kx){
    body().append(el('<section class="card rnquote" aria-label="续租费用">""")
# --- 订阅消息：验仓结果（EX01）、到期提醒（O03）（待裁 #8 按建议）
S='pages/w26-sub.js'
rep(S,"RN01:{name:'续租报价提醒',ok:'已开启微信通知。',no:'未开启微信通知。'}}[PAGE];",
"RN01:{name:'续租报价提醒',ok:'已开启微信通知。',no:'未开启微信通知。'},\n             /* W27：验仓结果（点「申请验仓」时触发）、到期提醒（点「确认支付」时触发；订单详情显示结果）。名称为设计侧暂用名 */\n             EX01:{name:'验仓结果提醒',ok:'已开启微信通知，验仓有结果时会提醒您。',no:'未开启微信通知，可在「消息」查看验仓结果。',anchor:true},\n             O03:{name:'租期到期提醒',ok:'已开启到期提醒，租期到期前会通过微信提醒您。',no:'未开启到期提醒，可在「消息」查看到期通知。',anchor:true}}[PAGE];")
rep(S,"    if(res){","    if(CTX.anchor){const h=document.querySelector('.shead');if(h){const c=el('<section class=\"card notice w27subcard\"></section>');c.append(el(line));h.after(c);}else if(n++<30)return setTimeout(place,50);}\n    else if(res){")
for f in ('pages/ex01.html','pages/o03.html'):
    rep(f,'<script src="w7-sys.js"></script>','<script src="w7-sys.js"></script>\n<script src="w26-sub.js"></script>')
io.open(os.path.join(R,'design-system/components.css'),'a',encoding='utf-8').write("\n/* W27 订阅结果行（订单详情、退仓页）*/\nbody[data-sub] .w27subcard{padding:10px 16px}\nbody[data-sub] .w27subcard .w26subline{margin:0;justify-content:flex-start}\n")
json.dump({'rn01':['quote_keep_expired'],'ex01':['requested&sub=ask','waiting&sub=accepted','waiting&sub=declined'],'o03':['pending&sub=ask','upcoming&sub=accepted','upcoming&sub=declined']},io.open(os.path.join(R,'tools/w27_states.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('ok')
