"""W26 包 D：订单详情满额减行（A4）、首次续租沿用原折扣（A5）、电子合同查看页（A9）、E存页头（B8）。非幂等。"""
import sys,os,json
R=sys.argv[1] if len(sys.argv)>1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def sub(f,a,b,n=1):
    p=os.path.join(R,f);s=open(p,encoding='utf-8').read()
    assert s.count(a)==n,(f,a[:60],s.count(a))
    open(p,'w',encoding='utf-8').write(s.replace(a,b))
W4='pages/w4-render.js'
# ---- A4：费用明细满额减行（写法同确认订单页）----
sub(W4,"""    (special.length?'<div class="row"><span class="k">特价仓</span><b class="amt">'+special.map(x=>money(x.unit_special_price)+'/月').join('、')+'</b></div>':'')+
    (Number(o.coupon_discount)>0?""","""    (Number(o.full_reduction)>0?'<div class="row"><span class="k">满额减<span class="sub">整期满 '+money(o.full_min)+'</span></span><b class="amt">−'+money(o.full_reduction)+'</b></div><div class="sec">减后整期租金 '+money(o.rent_after_coupon)+'</div>':'')+ /* W26 A4（D-157）：与确认订单页同一写法 */
    (special.length?'<div class="row"><span class="k">特价仓</span><b class="amt">'+special.map(x=>money(x.unit_special_price)+'/月').join('、')+'</b></div>':'')+
    (Number(o.coupon_discount)>0?""")
# 派生演示订单：在 life* 场景订单上套一个真实仓位的报价（core.amounts，含满额减），或套旧折扣
sub(W4,"""const O03={
""","""/* W26：life* 场景订单写死 ¥300/月 × 12（D-56）。这里派生两类演示订单，runtime/fixtures.js 不改：
   fullCore  整期租金达到满额减门槛（A4）：A005 8m³ × 12 个月，金额由 core.amounts 给出（已套 D-157 满额减）；
   legacyCore 按旧折扣表成交的在租订单（A5）：A003 3.5m³ × 24 个月 6 折（W20 及以前 13–36 个月档），剩余约 20 天。 */
const patchPay=(st,from,to)=>{const walk=x=>{if(!x||typeof x!=='object')return;for(const k in x){if(k==='amount'&&Number(x[k])===Number(from))x[k]=to;else walk(x[k]);}};walk(st);};
function fullCore(scn='lifeActive'){const c=lifeCore(scn),st=c.state(),o=st.orders[0],u=F.units.find(x=>x.id==='SIM_BJ01_U05'),a=c.amounts([u.id],12),old=o.payable;
  Object.assign(o,{unit_ids:[u.id],capacity_m3:u.volume,term_months:12,rent_total:a.rent_total,monthly_average:a.monthly_average,rent_after_coupon:a.rent_after_coupon,monthly_after_coupon:a.monthly_after_coupon,deposit:a.deposit,management_fee:a.management_fee,coupon_id:null,coupon_discount:0,full_reduction:a.full_reduction,full_min:a.full_min,term_factor:a.term_factor,term_discount_total:a.term_discount_total,unit_pricing:a.unit_pricing,payable:a.payable});
  patchPay(st,old,a.payable);const c2=makeCore(st);return {core:c2,id:firstOrder(c2).id};}
const LEGACY_FACTOR=0.6,LEGACY_TERM=24;
function legacyCore(scn='lifeActive',renew){const c=lifeCore(scn),st=c.state(),o=st.orders[0],u=unitById(o.unit_ids[0]),base=Number(u.base_month),mon=Math.trunc(base*LEGACY_FACTOR+1e-9),old=o.payable;
  const d=new Date(c.today()+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+20);d.setUTCMonth(d.getUTCMonth()-LEGACY_TERM);
  Object.assign(o,{term_months:LEGACY_TERM,start_date:d.toISOString().slice(0,10),rent_total:mon*LEGACY_TERM,monthly_average:mon,rent_after_coupon:mon*LEGACY_TERM,monthly_after_coupon:mon,deposit:mon,term_factor:LEGACY_FACTOR,term_discount_total:(base-mon)*LEGACY_TERM,unit_pricing:[{unit_id:u.id,base_month:base,monthly_rent:mon,term_factor:LEGACY_FACTOR}],payable:mon*LEGACY_TERM+mon+Number(o.management_fee)});
  patchPay(st,old,o.payable);
  if(renew){const walk=x=>{if(!x||typeof x!=='object')return;if(x.id==='SIM_REVIEW_RENEWAL'&&'quote_monthly' in x)Object.assign(x,{months:renew,quote_monthly:mon,quote_total:mon*renew});for(const k in x)walk(x[k]);};walk(st);}
  const c2=makeCore(st);return {core:c2,id:firstOrder(c2).id};}
/* D-180：在租客户首次续租沿用原折扣。设计侧取「原折扣与现行公开折扣中更优的一个」：只有原折扣更深时才出现沿用说明 */
const tf=m=>{const r=(F.pricing.termRules||[]).find(x=>m>=x.min&&m<=x.max);return r?r.factor:1;};
const zhe=f=>Number((f*10).toFixed(1))+' 折';
function keepInfo(raw,v,months){const f=Number(raw.term_factor),first=v.total_months===Number(raw.term_months)&&!(v.renewal_requests||[]).some(x=>x.status==='COMPLETED');
  if(!first||!(f>0&&f<1)||!(f<tf(months)-1e-9))return null;
  const base=(raw.unit_ids||[]).map(unitById).reduce((n,u)=>n+Number(u.base_month||0),0),mon=Math.trunc(base*f+1e-9),pub=Math.trunc(base*tf(months)+1e-9);
  return {factor:f,label:zhe(f),monthly:mon,total:mon*months,pubLabel:zhe(tf(months)),pubMonthly:pub,pubTotal:pub*months,less:pub-mon};}
const O03={
  active_full:()=>fullCore('lifeActive'), /* W26 A4：费用明细含满额减行 */
""")
# 订单详情「电子合同」一行链接到查看页
sub(W4,"""rows.push(lrow('i-shield','电子合同','已签署',false,'contract'));""","""rows.push(lrow('i-shield','电子合同','已签署',false,'contract').replace('href="#contract"','href="econtract.html?state=signed"')); /* W26 A9：链接到电子合同查看页 */""")
# ---- A5：续租页 ----
sub(W4,"""  quote_ready:rnQuote,
""","""  quote_ready:rnQuote,
  form_keep:()=>legacyCore('lifeActive'),              /* W26 A5（D-180）：首次续租沿用原折扣 · 填写 */
  quote_keep:()=>legacyCore('lifeRenewalQuote',12),    /* W26 A5：首次续租沿用原折扣 · 报价待确认 */
""")
sub(W4,"""  const r=(v.renewal_requests||[]).at(-1),rs=r?.status||null,expiredQ=key==='quote_expired';""","""  const rkey=key;key={form_keep:'form',quote_keep:'quote_ready'}[key]||key; /* W26 A5：沿用原折扣的两个状态复用原版式 */
  const r=(v.renewal_requests||[]).at(-1),rs=r?.status||null,expiredQ=key==='quote_expired';""")
sub(W4,"""  const {core,id}=b();document.body.dataset.state=key;
  if(!id)return noOrder('RN01');""","""  let {core,id}=b();document.body.dataset.state=key;
  if(!id)return noOrder('RN01');""")
sub(W4,"""function renderRN01(){
  const key=q.get('state')||'form',b=RN01[key];""","""function renderRN01(){
  let key=q.get('state')||'form';const b=RN01[key];""")
# 表单态费用卡
sub(W4,"""    body().append(el('<section class="card" aria-label="续租费用"><div class="sec-title">续租费用</div><div class="fees"><div class="row"><span class="k">续租租金<span class="sub">'+months+'个月</span></span><b class="amt muted">提交后由门店报价</b></div></div><div class="rule">续租价格需单独确认，不自动沿用当前月租。</div></section>'));
    if(key==='submitting')actbar(submittingBtn('提交中…'),'stack');
    else actbar(""","""    const kp=keepInfo(raw,v,months);
    if(kp)body().append(el('<section class="card rnkeep" aria-label="续租费用"><div class="sec-title">续租费用</div><div class="fees"><div class="row"><span class="k">续租租金<span class="sub">'+months+'个月</span><span class="tag disc">'+esc(kp.label.replace(' ',''))+'</span></span><b class="amt">约 '+money(kp.total)+'</b></div><div class="sec">'+money(kp.monthly)+'/月 × '+months+'个月</div></div><div class="keepnote" role="note">首次续租沿用您原订单的 '+esc(kp.label)+'，比现在 '+months+' 个月的 '+esc(kp.pubLabel)+'每月少 '+money(kp.less)+'。</div><div class="rule">金额以门店确认的报价为准。</div></section>'));
    else body().append(el('<section class="card" aria-label="续租费用"><div class="sec-title">续租费用</div><div class="fees"><div class="row"><span class="k">续租租金<span class="sub">'+months+'个月</span></span><b class="amt muted">提交后由门店报价</b></div></div><div class="rule">续租价格以门店确认的报价为准。</div></section>'));
    if(key==='submitting')actbar(submittingBtn('提交中…'),'stack');
    else if(kp)actbar('<div><div class="lab">续租 '+months+'个月 · 沿用 '+esc(kp.label)+'</div><div class="amt">约 '+money(kp.total)+'</div></div>'+btn('提交续租需求','primary','requestRenewal'));
    else actbar(""")
# 报价态
sub(W4,"""  if(key==='quote_ready'){
    body().append(""","""  const kq=r&&rkey==='quote_keep'?keepInfo(raw,v,r.months):null;
  if(kq){
    body().append(el('<section class="card rnquote rnkeep" aria-label="续租报价"><div class="sec-title">续租报价</div><div class="fees"><div class="row"><span class="k">续租租金<span class="sub">'+r.months+'个月</span><span class="tag disc">'+esc(kq.label.replace(' ',''))+'</span></span><b class="amt">'+money(r.quote_total)+'</b></div><div class="sec">'+money(r.quote_monthly)+'/月 × '+r.months+'个月</div>'+
      '<div class="row ref"><span class="k">现行折扣价<span class="sub">'+esc(kq.pubLabel.replace(' ',''))+'</span></span><b class="amt muted">'+money(kq.pubTotal)+'</b></div>'+
      '<div class="total"><span>续租应付</span><b class="amt">'+money(r.quote_total)+'</b></div></div>'+
      '<div class="keepnote" role="note">首次续租沿用您原订单的 '+esc(kq.label)+'，比现在 '+r.months+' 个月的 '+esc(kq.pubLabel)+'每月少 '+money(kq.less)+'，本次共少 '+money(kq.pubTotal-r.quote_total)+'。</div>'+
      '<div class="kvlist">'+kv('报价有效至',hm(deadline)+' · 剩余 '+clock(deadline))+kv('付款截止','与报价有效期相同','soft')+period+'</div>'+
      '<div class="rule">'+(capped?'距当前租期到期不足 '+W.RENEW_QUOTE_TTL_H+' 小时，报价有效期截至租期到期。':'报价 '+W.RENEW_QUOTE_TTL_H+' 小时内有效。')+'付款完成后新租期生效。</div></section>'));
    body().append(el('<div class="more-row rn-alt">'+btn('暂不续租','text','skipRenewal')+'</div>'));
    actbar('<div><div class="lab">续租应付</div><div class="amt">'+money(r.quote_total)+'</div></div>'+btn('确认并支付','primary','confirmRenewal'));
  }
  if(key==='quote_ready'&&!kq){
    body().append(""")
sub(W4,"""window.__W4={page:'RN01',state:key,""","""window.__W4={page:'RN01',state:rkey,keep:(kq||null),""")
# ---- B8 / A9：w7f ----
W7='pages/w7f-render.js'
sub(W7,"""不用自己到店：我们上门取件、入库保管，需要时再送回。""","""不用自己到店：预约上门取件、入库保管，需要时再预约送回。""")
sub(W7,"""/* ======================= ENT 企业服务（D-77） ======================= */""","""/* ======================= ECONTRACT 电子合同查看页（W26 A9，D-148） =======================
   econtract.html?state=signed|empty。订单取 lifeActive 演示订单；签署人与确认订单页签署弹层同一演示值。
   合同编号、签署存证、下载 / 发送邮箱等随第三方电子签工具定（D-176），本页不画；协议正文走协议页，不改写原文。 */
const SIGNER={name:'张明',no:'110101********0012'},PARTY_A='迷你考拉仓（北京）仓储服务有限公司'; /* 甲方取自使用协议「协议说明」北京地区提供方 */
function renderECONTRACT(){
  const key=q.get('state')||'signed';if(!['signed','empty'].includes(key))return unknown(key,{signed:1,empty:1});
  setTitle('电子合同');document.body.dataset.state=key;const b=body();
  if(key==='empty'){b.append(empty('i-shield','暂无电子合同','签署使用协议并完成下单后，可在这里查看。',link('返回订单','neutral md','oh01.html')));window.__W7F={page:'ECONTRACT',state:key};return;}
  const core=window.SIM_CORE.create({});core.setScenario('lifeActive');const o=core.state().orders[0],v=core.lifecycleView(o.id),s=F.stores.find(x=>x.id===o.store_id),units=(o.unit_ids||[]).map(id=>F.units.find(u=>u.id===id));
  const p2=n=>String(n).padStart(2,'0'),ts=new Date(Number(o.createdAt)+8*3600*1000).toISOString(),signedAt=ts.slice(0,10)+' '+ts.slice(11,16);
  const d=(o.start_date||'').replace(/-/g,''),m=String(o.id).match(/[0-9]+$/),no='MK'+d+String(m?Number(m[0])%10000:(String(o.id).length*137)%10000).padStart(4,'0');
  b.append(head(C.docName('usage'),stag('已签署','ok'),'签署后生成，内容以签署时的协议为准。'));
  b.append(card('签署信息','<div class="sec-title">签署信息</div>'+kvl('提供方（甲方）',esc(PARTY_A))+kv('使用方（乙方）',esc(SIGNER.name))+kv('证件号码',esc(SIGNER.no))+kv('签署时间',esc(signedAt))+kv('签署方式','线上签署'),'ec-sign'));
  b.append(card('订单与仓位','<div class="sec-title">订单与仓位</div>'+kv('订单号',esc(no))+kvl('门店',esc(s.name))+kv('仓位',esc(units.map(u=>u.demo_cabin_no?u.demo_cabin_no+' · '+u.volume+'m³':u.name).join(' + ')))+kv('租期',o.term_months+'个月')+kv('起止日期',esc(v.start_date+' 至 '+v.end_date)),'ec-order'));
  const row=(k,val,href)=>'<a class="lrow" href="'+esc(href)+'"><span class="k">'+esc(k)+'</span><span class="v">'+esc(val)+'</span>'+ico('i-chev','ico chev')+'</a>';
  b.append(card('协议文件','<div class="sec-title">协议文件</div>'+row(C.docName('usage'),'已签署','agreement.html?doc=usage')+row(C.docName('notice'),'已确认','agreement.html?doc=notice')+row('违法违规违禁物品清单','附件','agreement.html?doc=usage#att2'),'ec-docs'));
  b.append(el('<p class="w7f-fine pad">如对合同内容有疑问，请联系客服 '+esc(C.t('service.hotline'))+'。</p>'));
  actbar(link('查看协议全文','primary block','agreement.html?doc=usage'),'stack');
  window.__W7F={page:'ECONTRACT',state:key,order:no};
}

/* ======================= ENT 企业服务（D-77） ======================= */""")
sub(W7,"""if(PAGE==='ESTORE')renderESTORE();else if(PAGE==='AGREEMENT')""","""if(PAGE==='ECONTRACT')renderECONTRACT();else if(PAGE==='ESTORE')renderESTORE();else if(PAGE==='AGREEMENT')""")
# 新页面：以协议页为壳
p=os.path.join(R,'pages/agreement.html');s=open(p,encoding='utf-8').read()
for a,b in [('<body data-page="AGREEMENT">','<body data-page="ECONTRACT">'),('<!-- W7-F 新增页面：协议。','<!-- W26 新增页面：电子合同查看页（?state=signed|empty）。壳同协议页。'),('href="o01.html" aria-label="返回上页"','href="o03.html?state=active" aria-label="返回订单详情"'),('<span id="tb-title">协议</span>','<span id="tb-title">电子合同</span>')]:
    assert s.count(a)==1,a; s=s.replace(a,b)
open(os.path.join(R,'pages/econtract.html'),'w',encoding='utf-8').write(s)
open(os.path.join(R,'design-system/w26-d.css'),'a',encoding='utf-8').write("""
/* A5 首次续租沿用原折扣（rn01） */
body[data-page="RN01"] .rnkeep .keepnote{margin:10px 0 0;padding:10px 12px;border-radius:8px;background:var(--mk-color-surface-sunken,#F5F7F6);font-size:var(--mk-font-size-sm);line-height:1.6;color:var(--mk-color-ink-secondary)}
/* A9 电子合同查看页 */
body[data-page="ECONTRACT"] .ec-docs .lrow .k{flex:1;min-width:0}
""")
json.dump({'o03':['active_full'],'rn01':['form_keep','quote_keep'],'econtract':{'file':'pages/econtract.html','states':['signed','empty']}},open(os.path.join(R,'tools/w26_states_d.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('w26d ok')
