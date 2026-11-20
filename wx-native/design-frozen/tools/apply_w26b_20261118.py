"""W26 包 B（s02 / s5 / o01 + 共用规则）：顾问卡整期门槛回到 ¥3,000 及以上；确认订单页物品保障入口；未登录仓位行各仓「¥X/月起」；
免费运输引导句与赠送判断（按租期折扣档、按距离）。非幂等。"""
import sys,os,json
R=sys.argv[1] if len(sys.argv)>1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def sub(f,a,b,n=1):
    p=os.path.join(R,f);s=open(p,encoding='utf-8').read()
    assert s.count(a)==n,(f,a,s.count(a))
    open(p,'w',encoding='utf-8').write(s.replace(a,b))
W='model/w7-rules.js';P='pages/w2-render.js'
# ---- 1 顾问卡门槛 ----
sub(W,"ADVISOR_RENT_TOTAL=20000; /* W24 D-180：整期门槛由 ¥3,000 上调到 ¥20,000（自助价已是免审批最好价）；D-97：容量 >15m³ 或 整期租金 >¥3,000；",
      "ADVISOR_RENT_TOTAL=3000; /* W26（张坤 2026-11-18）：整期门槛保留 ¥3,000 及以上，撤回 W24 D-180 的 ¥20,000；D-97：容量 >15m³ 或 整期租金 ≥¥3,000；")
sub(W,"Number(rentTotalYuan)>ADVISOR_RENT_TOTAL;}","Number(rentTotalYuan)>=ADVISOR_RENT_TOTAL;}")
sub(W,"D-97 的出现条件（>15m³ 或整期 >¥3,000）不动","出现条件 = >15m³ 或整期 ≥¥3,000（W26 回到 ¥3,000，含 3,000）")
# ---- 5 / 4 免费运输：赠送判断与引导句 ----
sub(W,"用券 / 满额减后的实付折扣是否计入待裁。 */","\n     W26（B1，按设计侧建议执行）：是否赠送只看租期折扣档，用券 / 满额减后实付低于 6 折仍送——用户下单前就能知道自己有没有。 */")
sub(W,"  const PREPAY_NOTE=","""  const freeTransportFor=(km,term)=>Number.isInteger(Number(term))&&freeTransport(km,Number(term),termFactor(Number(term))); /* 订单是否送：距离 + 租期 + 租期折扣档 */
  /* W26（B2）：用仓位置距门店 ≥5km、租期不足 6 个月时的引导句。一处只出一句：
     下一折扣档正好是 6 个月（现表 3–5 个月）→ 合成一句「再租 N 个月享 7 折，还可免费运输 1 次」；
     下一折扣档更近（现表 1–2 个月 → 3 个月）→ 只出折扣档那句；没有折扣档提示时才单独出「租满 6 个月可免费运输 1 次」。 */
  function nudgeFar(m,baseMonth,rentAt,coupon,km){const far=Number.isInteger(m)&&m<FREE_TRANSPORT.minTerm&&Number.isFinite(Number(km))&&Number(km)>=FREE_TRANSPORT.minKm,n=far?nextTier(m):null;
    if(far&&n&&n.months===FREE_TRANSPORT.minTerm)return '再租 '+n.add+' 个月享 '+n.label+'，还可'+FREE_TRANSPORT.name;
    return nudge(m,baseMonth,rentAt,coupon)||(far?'租满 '+FREE_TRANSPORT.minTerm+' 个月可'+FREE_TRANSPORT.name:'');}
  const PREPAY_NOTE=""")
sub(W,"root.MK_W7={FREE_TRANSPORT,freeTransport,","root.MK_W7={FREE_TRANSPORT,freeTransport,freeTransportFor,nudgeFar,")
# ---- S02 状态：整期 ≥¥3,000 的顾问卡 ----
sub(P,"advisor:{scenario:'normal',capacity:16,term:12} /* W24 D-180：改 16m³；原 W7 新增：整期租金 >¥3,000 触发顾问卡（D-97） */};",
      "advisor:{scenario:'normal',capacity:16,term:12} /* 16m³：大单文案 */,advisor_rent:{scenario:'normal',capacity:3,term:12} /* W26：3.5m³ × 12 个月 = ¥3,120，整期 ≥¥3,000 出顾问卡（普通文案） */};")
sub(P,"/* D-97：顾问卡 = 容量 >15m³ 或 整期租金 >¥3,000；","/* D-97 / W26：顾问卡 = 容量 >15m³ 或 整期租金 ≥¥3,000；")
# ---- 3 B14：未登录、已填需求，仓位行写各仓自己的「¥X/月起」----
sub(P,"const startPriceHtml=m=>priceHtml(fmtNum(m),'/月起');","""const startPriceHtml=m=>priceHtml(fmtNum(m),'/月起');
/* W26（B14）：未登录时 w9-auth.js lockPrices() 把仓位行价格统一换成门店级「¥XX/m³/月起」，同店各仓数字相同。
   这里在它之后把仓位行改回各仓自己的「¥X/月起」（D-146 / D-147 口径），按钮仍是「查看报价」。代码侧直接在未登录分支渲染各仓起价即可，不需要这一步。 */
const LOCK_AUTH=['locked','phone','phone_agree','phone_wx','phone_loading','phone_fail','phone_denied','sms','sms_sent','sms_wrong','sms_expired','sms_sendfail','phone_conflict'].includes(q.get('auth'));
const sumFrom=(core,ids)=>ids.reduce((n,id)=>n+W7.unitFromMonthly(core,unitById(id)),0);
function unlockRowPrices(core){if(!LOCK_AUTH)return;const run=()=>{
  document.querySelectorAll('.urow[data-unit]').forEach(row=>{const box=row.querySelector('.foot')?.firstElementChild;if(box?.querySelector('.price'))box.innerHTML=startPriceHtml(sumFrom(core,[row.dataset.unit]));});
  document.querySelectorAll('.combo[data-units]').forEach(c=>{const p=c.querySelector('.foot .price');if(p)p.outerHTML=startPriceHtml(sumFrom(core,c.dataset.units.split(',')));});
  document.querySelectorAll('.s5card .unit[data-ids]').forEach(l=>{const box=l.nextElementSibling?.firstElementChild;if(box?.querySelector('.price'))box.innerHTML=startPriceHtml(sumFrom(core,l.dataset.ids.split(',')));l.querySelectorAll('span').forEach(x=>{if(/，每月多 ¥[\\d,]+$/.test(x.textContent))x.textContent=x.textContent.replace(/，每月多 ¥[\\d,]+$/,'');});}); /* 未登录不露出按租期算的月差额 */};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else setTimeout(run,0);} /* 等后面的 w9-auth.js 执行完 */""")
sub(P,"  window.__W2={page:'S02',state:key,situation,","  if(linked)unlockRowPrices(core);\n  window.__W2={page:'S02',state:key,situation,")
sub(P,"""return '<div class="unit" data-line="'+i+'"><b>'""","""return '<div class="unit" data-line="'+i+'" data-ids="'+esc(l.ids.join(','))+'"><b>'""")
sub(P,"  window.__W2={page:'S5',state:key,matchState,","  if(ready)unlockRowPrices(core);\n  window.__W2={page:'S5',state:key,matchState,")
# ---- 费用明细：免费运输行按 D-173 判断（距离 + 租期 + 折扣档），不再只看是否领取 ----
sub(P,"(a.moving_benefit_pending_id?'<div class=\"row\"><span class=\"k\">服务权益</span>","((opts.km!==undefined?!(a.campaign_ids?.length)&&W7.freeTransportFor(opts.km,months):!!a.moving_benefit_pending_id)?'<div class=\"row\"><span class=\"k\">服务权益</span>")
# ---- O01：演示距离、引导句、物品保障 ----
sub(P,"  full_near:()=>({core:termCore(8,18,'SIM_BJ01_U05')}),","""  full_near:()=>({core:termCore(8,18,'SIM_BJ01_U05')}),
  /* W26：用仓位置距门店 ≥5km（演示距离 6.2km，仅本状态覆盖显示值）。5 个月 = 引导句；6 个月 = 费用明细出「免费运输 1 次」 */
  transport_near:()=>({core:termCore(3.5,5,UNIT),km:6.2}),
  transport_ok:()=>({core:termCore(3.5,6,UNIT),km:6.2}),""")
sub(P,"  const km=kmText(s);\n  const termCell=","  const kmN=Number.isFinite(built.km)?built.km:displayedKm(s),km=Number.isFinite(kmN)?kmN.toFixed(1)+'km':'';\n  const termCell=")
sub(P,"nud=W7.nudge(months,units.reduce((n,x)=>n+Number(st.prices[x.id]??x.base_month),0),k=>core.amounts(selected,k).rent_total,a.coupon_discount);","nud=W7.nudgeFar(months,units.reduce((n,x)=>n+Number(st.prices[x.id]??x.base_month),0),k=>core.amounts(selected,k).rent_total,a.coupon_discount,a.campaign_ids?.length?NaN:kmN);")
sub(P,"feeListHtml(a,months,core,{noSaved:key==='price_changed',locked,estimate})","feeListHtml(a,months,core,{noSaved:key==='price_changed',locked,estimate,km:kmN})")
sub(P,"feeListHtml(a,months,core,{compact:true,estimate})","feeListHtml(a,months,core,{compact:true,estimate,km:kmN})")
sub(P,"feeListHtml(pendingOrder,months,core,{compact:true})","feeListHtml(pendingOrder,months,core,{compact:true,km:kmN})")
sub(P,"    /* --- D-76 运输 / 搬运：下单前可预约，按线索处理，不进应付 --- */","""    /* --- W26（A10）物品保障：基础保障随订单附赠；增值保障价格未提供，只说明、不在本页售卖（使用协议 七） --- */
    body.append(el('<a class="card svcentry" href="o01.html?state='+encodeURIComponent(key)+'&overlay=protect" data-action="protect">'+ico('i-shield')+'<div><div class="t">物品保障</div><div class="s">已含基础保障，可了解增值保障</div></div>'+ico('i-chev','ico sm chev')+'</a>'));
    /* --- D-76 运输 / 搬运：下单前可预约，按线索处理，不进应付 --- */""")
sub(P,"  if(ov==='alternatives'){const rows=altRows();","""  if(ov==='protect')ovr.append(sheet('物品保障','<div class="protect"><div class="pi"><div class="t">基础保障<span class="tag ok">已含</span></div><p>'+esc(C.t('protect.basic'))+'</p></div><div class="pi"><div class="t">增值保障<span class="tag info">可选</span></div><p>'+esc(C.t('protect.plus'))+'</p><p class="s">价格与办理：'+esc(C.t('protect.plusPrice'))+'</p></div><p class="fine">'+esc(C.t('protect.claim'))+'</p></div>','<div class="acts"><a class="btn neutral" href="tel:'+C.t('service.hotline').replace(/-/g,'')+'">联系客服</a><button type="button" class="btn primary" data-action="closeOverlay">知道了</button></div>'));
  if(ov==='alternatives'){const rows=altRows();""")
open(os.path.join(R,'design-system/w26-b.css'),'a',encoding='utf-8').write("""body[data-page="O01"] .sheet .protect .pi{padding:12px 0;border-bottom:1px solid var(--mk-color-line-hairline)}
body[data-page="O01"] .sheet .protect .pi:first-child{padding-top:0}
body[data-page="O01"] .sheet .protect .t{display:flex;align-items:center;gap:8px;font-size:var(--mk-font-size-md);font-weight:600}
body[data-page="O01"] .sheet .protect p{margin:6px 0 0;font-size:var(--mk-font-size-sm);line-height:1.5;color:var(--mk-color-ink-primary)}
body[data-page="O01"] .sheet .protect p.s{color:var(--mk-color-ink-secondary)}
""")
json.dump({'s02':['advisor_rent'],'o01':['ready&overlay=protect','transport_near','transport_ok']},open(os.path.join(R,'tools/w26_states_b.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('w26b ok')
