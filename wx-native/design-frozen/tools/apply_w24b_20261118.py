"""W24 第二部分：D-174 付款后实名兜底、D-173 免费运输（原「送搬运」）、D-180 顾问卡阈值。非幂等。"""
import sys,os
R=sys.argv[1] if len(sys.argv)>1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def sub(f,a,b,n=1):
    p=os.path.join(R,f);s=open(p,encoding='utf-8').read()
    assert s.count(a)==n,(f,a,s.count(a))
    open(p,'w',encoding='utf-8').write(s.replace(a,b))

# ---- D-174：付款后的实名认证只作兜底，不在主流程里出现 ----
FB='这笔订单下单时未完成实名认证，完成后起租日起可入仓存取。'
sub('pages/w4-render.js',"""kv('实名认证',v.identity_status==='verified'?'已通过':'<span class="sec-ink">待完成</span>')+""","""(v.identity_status==='verified'?'':kv('实名认证','<span class="sec-ink">待完成</span>'))+""")
sub('pages/w4-render.js',"""identity:['','完成实名认证后，起租日起可入仓存取。','warn'],""","""identity:['','"""+FB+"""','warn'],""")
sub('pages/w1-render.js',"""identity:['入仓前准备','完成实名认证后，起租日起可入仓存取。']""","""identity:['入仓前准备','"""+FB+"""']""")
sub('pages/w6-render.js',"""identity:['入仓前准备','完成实名认证后，起租日可使用仓门开锁。']""","""identity:['入仓前准备','"""+FB+"""']""")
sub('pages/w6-render.js',"""['完成实名认证',v.identity_status==='verified'?'已通过':''],""","""...(v.identity_status==='verified'?[]:[['完成实名认证','下单时未完成的，请在起租前完成']]),""")
sub('pages/w6-render.js',"""dec.allowed?3:cur,0)+'</section>'""","""(dec.allowed?3:cur)-(v.identity_status==='verified'?1:0),0)+'</section>'""")

# ---- D-173：免费运输 1 次（原筛选项「送搬运」）----
sub('model/w7-rules.js',"""  const PREPAY_NOTE=""","""  /* D-173（张坤 2026-11-18）：面向远距离用户的召回策略。用仓位置距门店 ≥5km、租期 ≥6 个月、折扣不低于 6 折 → 免 1 次车辆运输费。
     「折扣」这里按租期折扣档判断（公开表最深 6.5 折，自助单都满足）；特价仓沿用原叠加规则不参与。用券 / 满额减后的实付折扣是否计入待裁。 */
  const FREE_TRANSPORT={minKm:5,minTerm:6,minFactor:0.6,chip:'免费运输',name:'免费运输 1 次',tag:'满6个月免费运输',
    cond:'用仓位置距门店 5km 及以上、租期满 6 个月可用',scope:'含 1 次车辆运输费；搬运、拆装、楼梯费另计'};
  const freeTransport=(km,term,factor)=>Number.isFinite(Number(km))&&Number(km)>=FREE_TRANSPORT.minKm&&(term==null||Number(term)>=FREE_TRANSPORT.minTerm)&&(factor==null||Number(factor)>=FREE_TRANSPORT.minFactor-1e-9);
  const PREPAY_NOTE=""")
sub('model/w7-rules.js',"""root.MK_W7={TERM_DEFAULT,""","""root.MK_W7={FREE_TRANSPORT,freeTransport,TERM_DEFAULT,""")
sub('pages/s01.html',"""data-quick="moving">含搬运权益</span>""","""data-quick="moving">免费运输</span>""")
sub('pages/w1-render.js',"""stores=stores.filter(s=>s.moving_campaign_eligible===true);""","""stores=stores.filter(s=>W7.freeTransport(displayedKm(s),r.term_confirmed?r.term_months:null)); /* W24 D-173：原为 moving_campaign_eligible（夹具里没有门店带这个标记） */""")
sub('pages/w1-render.js',"""<div class="tags">'+tagsHtml(pres.tags(s,tagLimit))+'</div></div>';}""","""<div class="tags">'+(W7.freeTransport(displayedKm(s))?'<span class="tag promo">'+W7.FREE_TRANSPORT.tag+'</span>'+tagsHtml(pres.tags(s,Math.max(1,tagLimit-2))):tagsHtml(pres.tags(s,tagLimit)))+'</div></div>';}""")
sub('pages/w1-render.js',"""  filtering:{scenario:'normal',filters:{sort:'price',maxKm:3,quick:['promo']}},""","""  filtering:{scenario:'normal',filters:{sort:'price',maxKm:3,quick:['promo']}},
  far_transport:{scenario:'normal',filters:{sort:'recommended',maxKm:null,quick:['moving']}}, /* W24 D-173 免费运输：只看距用仓位置 ≥5km 的门店 */""")
for f in ('pages/w2-render.js','pages/w3-render.js'):
    sub(f,"""基础搬运权益 · 顾问确认后生效""","""免费运输 1 次 · 顾问联系安排""")
sub('pages/w6-render.js',"""搬运补贴需顾问核定，可用范围另行确认。""","""免费运输限用仓位置距门店 5km 及以上、租期满 6 个月的订单，含 1 次车辆运输费。""")
sub('pages/w6-render.js',"""benefit:{ELIGIBILITY_PENDING:'顾问确认中',""","""benefit:{ELIGIBILITY_PENDING:'下单时可用',""")
sub('pages/w22-terms.js',"""[/服务范围与距离资格待确认/g,'服务范围由顾问确认'],""","""[/服务范围与距离资格待确认/g,'用仓位置距门店 5km 及以上、租期满 6 个月可用'],[/基础搬运权益/g,'免费运输 1 次'],""")

# ---- D-180：顾问卡出现条件 ¥3,000 → ¥20,000（W21 §6-2）----
sub('model/w7-rules.js',"""ADVISOR_RENT_TOTAL=3000; /* D-97""","""ADVISOR_RENT_TOTAL=20000; /* W24 D-180：整期门槛由 ¥3,000 上调到 ¥20,000（自助价已是免审批最好价）；D-97""")
sub('pages/w1-render.js',"""advisor:{scenario:'normal',requirement:{capacity_m3:8,term_months:12,term_confirmed:true}},""","""advisor:{scenario:'normal',requirement:{capacity_m3:16,term_months:12,term_confirmed:true}},""")

sub('pages/w2-render.js',"""advisor:{scenario:'normal',capacity:8,term:12} /* W7 新增：整期租金 >¥3,000""","""advisor:{scenario:'normal',capacity:16,term:12} /* W24 D-180：改 16m³；原 W7 新增：整期租金 >¥3,000""")
print('part2 ok')
