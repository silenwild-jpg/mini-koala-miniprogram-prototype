"""W21（2026-11-18）：定价第一阶段 D-156～D-165 补丁（非幂等，只在 W20 工作树副本上跑一次）。
用法：python3 apply_w21_20261118.py <design 目录>"""
import os,sys
ROOT=sys.argv[1]
buf={}
def rd(f):
    if f not in buf: buf[f]=open(os.path.join(ROOT,f),encoding='utf-8').read()
    return buf[f]
log=[];bad=[]
def rep(f,old,new,n=1):
    s=rd(f);c=s.count(old)
    if not(c>0 and (n is None or c==n)): bad.append((f,old[:70],c));return
    buf[f]=s.replace(old,new);log.append((f,old[:40],c))
R='model/w7-rules.js';W1='pages/w1-render.js';W2='pages/w2-render.js';W3='pages/w3-render.js';W4='pages/w4-render.js';CSS='design-system/components.css'

# ---- D-156 公开折扣表 ----
rep(R,"  const F=root.SIM_FIXTURES;\n","""  const F=root.SIM_FIXTURES;
  /* ---- W21（2026-11-18）定价第一阶段 ---- */
  /* D-156 公开折扣表：最深做到主流成交价 6.5 折（张坤口径）；档位起点 3 / 6 / 12 个月；12 个月及以上同为 6.5 折，更深的转满额减与顾问审批。
     8 / 7.5 / 7 折三档是结构示例，待财务按成交数据定。runtime/fixtures.js 原件未改，在这里覆盖；BEST_TERM 随之变为 12 个月。 */
  F.pricing.termRules=[{min:1,max:2,factor:.80},{min:3,max:5,factor:.75},{min:6,max:11,factor:.70},{min:12,max:60,factor:.65}];
""")
rep(R,"（现为 37–60 个月 5.9 折）","（W21 起为 12 个月及以上 6.5 折）")
rep(R,"  root.MK_W7={unitFromMonthly,","""  /* ---- W21 定价第一阶段（续）---- */
  const TERM_DEFAULT=12;                           /* D-158：租期默认选中 12 个月 */
  const NUDGE_MONTHS=3;                            /* D-159：离下一档 3 个月以内才提示 */
  const UPSIZE_RATIO=0.85;                         /* D-161：需求占匹配仓 85% 及以上或含长件，写明大一档的理由；85% 是设计侧初值 */
  /* D-157 满额减：按整期租金（券前）自动生效，不用领取；与优惠券不同享，取优惠大的一项；特价仓、续租不参与。三档金额是结构示例，待财务定。 */
  const FULL_TIERS=[{min:5000,off:150},{min:10000,off:400},{min:20000,off:1000}];
  const yuan=n=>'¥'+Number(n).toLocaleString('zh-CN');
  const fullTier=t=>FULL_TIERS.filter(x=>Number(t)>=x.min).pop()||null;
  function applyFull(a,opts){
    if(!a||a.full_checked||(opts&&opts.renewal)||(a.campaign_ids&&a.campaign_ids.length))return a;
    const t=fullTier(a.rent_total),off=t?t.off:0,cp=Number(a.coupon_discount)||0;
    if(!(off>cp))return Object.assign(a,{full_checked:true,full_reduction:0});
    const after=a.rent_total-off,months=a.monthly_average?Math.round(a.rent_total/a.monthly_average):0;
    return Object.assign({},a,{full_checked:true,full_reduction:off,full_min:t.min,coupon_id:null,coupon_discount:0,coupon_skipped:cp>0,rent_after_coupon:after,monthly_after_coupon:months?Math.round(after/months*100)/100:a.monthly_after_coupon,payable:a.payable+cp-off});}
  /* 报价一律经 core.amounts / formalAmounts 取数，在这里统一套满额减；订单对象需由代码侧在下单时落 full_reduction（见 DEV_HANDOFF v10） */
  if(root.SIM_CORE&&!root.SIM_CORE.__w21){const mk=root.SIM_CORE.create;
    root.SIM_CORE.create=function(o){const c=mk.call(root.SIM_CORE,o),am=c.amounts,fa=c.formalAmounts;
      c.amounts=(ids,m,opts)=>applyFull(am(ids,m,opts),opts);if(fa)c.formalAmounts=(ids,m)=>applyFull(fa(ids,m));return c;};
    root.SIM_CORE.__w21=true;}
  /* D-164「已省」= 租期折扣 + 满额减 + 优惠券，比较基准是月基价（挂牌价） */
  const savedTotal=a=>a?(Number(a.term_discount_total)||0)+(Number(a.full_reduction)||0)+(Number(a.coupon_discount)||0):0;
  /* D-159 下一档提示：只在离下一档 3 个月以内出现；有仓位时带月均差额 */
  function nextTier(m){const cur=termFactor(m),r=F.pricing.termRules.filter(x=>x.min>m&&x.factor<cur).sort((a,b)=>a.min-b.min)[0];
    return r&&r.min-m<=NUDGE_MONTHS?{add:r.min-m,months:r.min,factor:r.factor,label:(Math.round(r.factor*100)/10)+' 折'}:null;}
  function termHint(m,baseMonth){if(!Number.isInteger(m))return '';const n=nextTier(m);if(!n)return '';
    const less=baseMonth?Math.trunc(baseMonth*termFactor(m)+1e-9)-Math.trunc(baseMonth*n.factor+1e-9):0;
    return '再租 '+n.add+' 个月享 '+n.label+(less>0?'，月均少 '+yuan(less):'');}
  function fullHint(m,rentAt,coupon){try{const cur=rentAt(m),next=FULL_TIERS.find(x=>x.min>cur&&x.off>(Number(coupon)||0));if(!next)return '';
      for(let k=1;k<=NUDGE_MONTHS&&m+k<=60;k++)if(rentAt(m+k)>=next.min)return '再租 '+k+' 个月，整期满 '+yuan(next.min)+' 减 '+yuan(next.off);}catch(_){}return '';}
  const nudge=(m,baseMonth,rentAt,coupon)=>termHint(m,baseMonth)||(rentAt&&Number.isInteger(m)?fullHint(m,rentAt,coupon):'');   /* 一处只出一句：先折扣档，后满额减 */
  /* D-163 顾问卡：D-97 的出现条件（>15m³ 或整期 >¥3,000）不动；达到「15m³ 以上或整期满最高满减档」时文案写明条件 */
  const BIG_DEAL_TOTAL=FULL_TIERS[FULL_TIERS.length-1].min;
  const bigDeal=(cap,total)=>Number(cap)>ADVISOR_CAP_M3||Number(total)>=BIG_DEAL_TOTAL;
  const advisorCopy=big=>big?{t:'可申请专属方案',s:ADVISOR_CAP_M3+'m³ 以上或整期满 '+yuan(BIG_DEAL_TOTAL)+'，由顾问确认方案与价格'}:{t:'需要顾问帮您确认方案？',s:'协助确认仓位、费用及搬运安排'};
  const PREPAY_NOTE='租期折扣按预付整期计算';      /* D-160 */
  root.MK_W7={TERM_DEFAULT,NUDGE_MONTHS,UPSIZE_RATIO,FULL_TIERS,fullTier,applyFull,savedTotal,nextTier,termHint,fullHint,nudge,bigDeal,advisorCopy,BIG_DEAL_TOTAL,PREPAY_NOTE,unitFromMonthly,""")

# ---- CSS ----
buf[CSS]=rd(CSS)+"""
/* ---- W21（2026-11-18）定价第一阶段 ---- */
.nudge{font-size:var(--mk-font-size-xs);line-height:18px;color:var(--mk-color-brand-text)}
.termpick .note.nudge{color:var(--mk-color-brand-text)}
.kvlist>.nudge{padding:0 0 8px;text-align:right}
.scard .unit .upnote{flex-basis:100%;font-size:var(--mk-font-size-xs);line-height:18px;color:var(--mk-color-ink-secondary);margin-top:2px}
.actbar .lab .savedlab{color:var(--mk-color-brand-text)}
"""

# ---- D-162 仓位行：月均价主、整期次（确认订单页与快捷下单费用卡不变）----
NEWTP="const termPriceHtml=(a,months)=>priceHtml(fmtNum(a.monthly_average),'/月',discTag(a,months))+'<div class=\"price-sec\">整期 '+money(a.rent_total)+' · '+months+'个月'+(a.full_reduction>0?' · 满额减 '+money(a.full_reduction):'')+'</div>'; /* W21 D-162 */"
rep(W2,"const termPriceHtml=(a,months)=>priceHtml(fmtNum(a.rent_total),'',discTag(a,months))+'<div class=\"price-sec\">'+esc(rentFormula(a,months))+'</div>';",NEWTP)
rep(W1,"priceHtml(fmtNum(a.rent_total),'',tag)+'<div class=\"price-sec\">'+money(a.monthly_average)+'/月 × '+ctx.r.term_months+'个月</div>",
       "priceHtml(fmtNum(a.monthly_average),'/月',tag)+'<div class=\"price-sec\">整期 '+money(a.rent_total)+' · '+ctx.r.term_months+'个月</div>")
rep(W1,"line='<div class=\"cprice\">'+priceHtml(fmtNum(a.rent_total),'')+'<span class=\"cmeta\">'+esc(u.volume)+'m³ · '+ctx.r.term_months+'个月'",
       "line='<div class=\"cprice\">'+priceHtml(fmtNum(a.monthly_average),'/月')+'<span class=\"cmeta\">'+esc(u.volume)+'m³ · '+ctx.r.term_months+'个月 '+money(a.rent_total)")

# ---- D-157 费用明细：满额减行 ----
FULLROW="(a.full_reduction>0?'<div class=\"row\"><span class=\"k\">满额减<span class=\"sub\">整期满 '+money(a.full_min)+'</span></span><b class=\"amt\">−'+money(a.full_reduction)+'</b></div><div class=\"sec\">减后整期租金 '+money(a.rent_after_coupon)+'</div>':'')+\n    "
rep(W2,"    (special.length?'<div class=\"row\"><span class=\"k\">特价仓</span>",'    '+FULLROW+"(special.length?'<div class=\"row\"><span class=\"k\">特价仓</span>")
rep(W3,"    (special.length?'<div class=\"row\"><span class=\"k\">特价仓</span>",'    '+FULLROW+"(special.length?'<div class=\"row\"><span class=\"k\">特价仓</span>")
rep(W2,"opts.locked?'未使用':'暂无适用优惠'","opts.locked?'未使用':a.coupon_skipped?'不与满额减同享':'暂无适用优惠'")
rep(W3,"'−'+money(a.coupon_discount):'暂无适用优惠')","'−'+money(a.coupon_discount):a.coupon_skipped?'不与满额减同享':'暂无适用优惠')")

# ---- D-164 确认订单页底栏「已省」；D-160 预付说明；D-159 租期旁提示 ----
rep(W2,"'<div><div class=\"lab\">'+label+'</div><div class=\"amt'",
       "'<div><div class=\"lab\">'+label+(a&&!amtMuted&&key!=='price_changed'&&W7.savedTotal(a)>0?' · <span class=\"savedlab\">已省 '+money(W7.savedTotal(a))+'</span>':'')+'</div><div class=\"amt'")
rep(W2,"'<p class=\"fine\" data-quote-ttl>报价 '+W7.QUOTE_TTL_H+' 小时内有效</p>'","'<p class=\"fine\" data-quote-ttl>'+W7.PREPAY_NOTE+' · 报价 '+W7.QUOTE_TTL_H+' 小时内有效</p>'")
rep(W2,"  body.append(el('<section class=\"card sumcard'+(dead?' off':'')+'\"",
       "  let nud='';if(!locked&&a&&authorized&&confirmed){try{nud=W7.nudge(months,units.reduce((n,x)=>n+Number(st.prices[x.id]??x.base_month),0),k=>core.amounts(selected,k).rent_total,a.coupon_discount);}catch(_){nud='';}} /* W21 D-159 */\n  body.append(el('<section class=\"card sumcard'+(dead?' off':'')+'\"")
rep(W2,"'<div class=\"kvlist\"><div class=\"kv\"><span class=\"k\">租期</span><span class=\"v\">'+termCell+'</span></div>'+",
       "'<div class=\"kvlist\"><div class=\"kv\"'+(nud?' style=\"border-bottom:0\"':'')+'><span class=\"k\">租期</span><span class=\"v\">'+termCell+'</span></div>'+(nud?'<div class=\"nudge\">'+esc(nud)+'</div>':'')+")

# ---- 租期组件：提示句 + 默认 12 个月 ----
rep(W2,"function termPick(months){return '<div class=\"termpick\">'+W7.termSeg(months)+'</div>';}",
       "function termPick(months){const h=W7.termHint(months);return '<div class=\"termpick\">'+W7.termSeg(months)+(h?'<div class=\"note nudge\">'+esc(h)+'</div>':'')+'</div>';} /* W21 D-159 */")
rep(W2,"termPick(cold?null:r.term_months)","termPick(cold?W7.TERM_DEFAULT:r.term_months)")
rep(W3,"function termPick(term,o={}){return '<div class=\"termpick\">'+W7.termSeg(term,o)+(o.note?'<div class=\"note\">'+esc(o.note)+'</div>':'')+'</div>';}",
       "function termPick(term,o={}){const h=o.soft||o.unsure!==undefined?'':o.rentAt?W7.nudge(term,o.base,o.rentAt):W7.termHint(term,o.base); /* W21 D-159：预约页（soft）不提示 */\n  return '<div class=\"termpick\">'+W7.termSeg(term,o)+(o.note?'<div class=\"note\">'+esc(o.note)+'</div>':'')+(h?'<div class=\"note nudge\">'+esc(h)+'</div>':'')+'</div>';}")
rep(W3,"missing=n===null&&!areaBad,invalid=areaBad||(!missing&&!ok&&!over),term=cfg.term||null;","missing=n===null&&!areaBad,invalid=areaBad||(!missing&&!ok&&!over),term=cfg.term||W7.TERM_DEFAULT; /* W21 D-158 */")
rep(W3,"category:cfg.category||'all',term:cfg.term||null,","category:cfg.category||'all',term:cfg.term||W7.TERM_DEFAULT,")
rep(W3,"  if(cfg.term)core.setTerm(cfg.term);\n","  if(cfg.term)core.setTerm(cfg.term);else{try{core.setTerm(W7.TERM_DEFAULT);}catch(_){}} /* W21 D-158 */\n")
rep(W3,"<div class=\"ct\">'+ico('i-ticket')+'选择租期</div>'+termPick(term)+'</section>'",
       "<div class=\"ct\">'+ico('i-ticket')+'选择租期</div>'+termPick(term,computed?{base:rows.reduce((n,u)=>n+Number(s.prices[u.id]??u.base_month),0),rentAt:k=>core.amounts(qs.ids,k).rent_total}:{})+'</section>'")
rep(W1,"<label>租期</label>'+W7.termSeg(term)+'</div>'","<label>租期</label>'+W7.termSeg(term||W7.TERM_DEFAULT)+'</div>'")

# ---- D-161 仓位推荐页：大一档写明差额与理由 ----
rep(W2,"</b><span>· '+esc(use)+'</span>'+(l.next?'<span class=\"tag info\">大一档</span>':'')",
       "</b><span>· '+(l.next&&a.monthly_average>first.monthly_average?'大 '+(+(l.volume-row.volume).toFixed(1))+'m³，每月多 '+money(a.monthly_average-first.monthly_average):esc(use))+'</span>'+(l.next&&!(a.monthly_average>first.monthly_average)?'<span class=\"tag info\">大一档</span>':'')")
rep(W2,"fitTag(l.volume,need)+'</div>'+\n          '<div class=\"foot\">",
       "fitTag(l.volume,need)+(l.next&&upWhy?'<span class=\"upnote\">'+esc(upWhy)+'</span>':'')+'</div>'+\n          '<div class=\"foot\">")
rep(W2,"      const lineHtml=(l,i)=>{const a=core.amounts(l.ids,term),",
       "      const ratio=need/row.volume,upWhy=row.combo||ratio>1?'':ratio>=.995?'需求与 '+row.volume+'m³ 仓相当，大一档更好放':ratio>=W7.UPSIZE_RATIO?'需求约占 '+row.volume+'m³ 仓的 '+Math.round(ratio*100)+'%，大一档更好放':cfg.from==='items'?'清单含长件，大一档更好放':''; /* W21 D-161 */\n      const lineHtml=(l,i)=>{const a=core.amounts(l.ids,term),")

# ---- D-163 顾问卡文案 ----
rep(W2,"const advisorCard=()=>el('<div class=\"card advisor\" data-w7=\"advisor\"><div><div class=\"t\">需要顾问帮您确认方案？</div><div class=\"s\">协助确认仓位、费用及搬运安排</div></div>",
       "function bigDeal(core,r,ids){let rent=0;try{if(ids?.length&&r.term_confirmed)rent=Number(core.amounts(ids,r.term_months)?.rent_total)||0;}catch{rent=0;}return W7.bigDeal(r.capacity_m3,rent);}\nconst advisorCard=big=>el('<div class=\"card advisor\" data-w7=\"advisor\" data-big=\"'+(big?1:0)+'\"><div><div class=\"t\">'+W7.advisorCopy(big).t+'</div><div class=\"s\">'+W7.advisorCopy(big).s+'</div></div>")
rep(W2,"content.append(advisorCard());","content.append(advisorCard(bigDeal(core,r,quoteIds)));")
rep(W2,"adv.append(advisorCard());","adv.append(advisorCard(bigDeal(core,r,rows[0]?.ids)));")
rep(W1,"const advisorCard=()=>el('<div class=\"advisor\" id=\"advisor-card\"><div><div class=\"t\">需要顾问帮您确认方案？</div><div class=\"s\">协助确认仓位、费用及搬运安排</div></div>",
       "const advisorCard=big=>el('<div class=\"advisor\" id=\"advisor-card\"><div><div class=\"t\">'+W7.advisorCopy(big).t+'</div><div class=\"s\">'+W7.advisorCopy(big).s+'</div></div>")
rep(W1,"moreRow.after(advisorCard());","moreRow.after(advisorCard(W7.bigDeal(ctx.r.capacity_m3,rent)));")

# ---- D-165 提前退租仅计算违约金：去掉「已享优惠按实际使用周期重新核算」----
rep(W4,"+kvl('已享优惠',ct('early.promo'))","")
# ---- D-158 续租默认不短于原租期 + 下一档提示 ----
rep(W4,"    const months=6,max=60-v.total_months;","    const months=Math.max(1,Math.min(max0,Number(raw.term_months)||6)),max=max0,rnHint=W.termHint(months); /* W21 D-158 / D-159 */")
rep(W4,"  if(key==='form'||key==='submitting'){\n","  if(key==='form'||key==='submitting'){\n    const max0=60-v.total_months;\n")
rep(W4,"[3,6,12].map(m=>chip(m+'个月',m===months,'months',m)).join('')+'</div><div class=\"rule\">可续租","[3,6,12].map(m=>chip(m+'个月',m===months,'months',m)).join('')+'</div>'+(rnHint?'<div class=\"nudge\" style=\"padding-top:6px\">'+esc(rnHint)+'</div>':'')+'<div class=\"rule\">可续租")

rep(W2,"  coupon:()=>({core:readyCore('promoCouponCash')}),","  coupon:()=>({core:readyCore('promoCouponCash')}),\n  /* W21：下一档提示 / 满额减生效 / 差一点满额 */\n  term_near:()=>({core:termCore(3.5,11,UNIT)}),\n  full:()=>({core:termCore(8,24,'SIM_BJ01_U05')}),\n  full_near:()=>({core:termCore(8,18,'SIM_BJ01_U05')}),")
rep(W2,"const pendingOrderOf=()=>","function termCore(cap,months,unit){const c=makeCore();c.setScenario('normal');c.setRequirement(cap,months,true);c.select([unit]);authorize(c);c.setDate(tomorrow());return c;} /* W21 */\nconst pendingOrderOf=()=>")
rep(W3,"CAP_STATES={empty:{},","CAP_STATES={term_near:{v:3,term:10},empty:{},")
import json
sj=os.path.join(ROOT,'tools','w7_states.json');d=json.load(open(sj,encoding='utf-8'))
NEW={'o01':['term_near','full','full&overlay=fees','full_near'],'cap':['term_near']}
for k,v in NEW.items(): d[k]['states']+=[x for x in v if x not in d[k]['states']]
if bad:
    print('FAILED anchors:');[print(' ',b) for b in bad];sys.exit(1)
for f,s in buf.items(): open(os.path.join(ROOT,f),'w',encoding='utf-8').write(s)
json.dump(d,open(sj,'w',encoding='utf-8'),ensure_ascii=False,indent=1)
json.dump({'added':NEW},open(os.path.join(ROOT,'tools','w21_states.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('applied',len(log),'replacements in',len(buf),'files')
