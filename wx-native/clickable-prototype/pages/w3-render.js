/* VIS-REDESIGN-01A · W3 binder · 2026-11-17
 * Thin data binder for CAP / ITEMS / QUICK / BOOKING (T4). Page state is built through the UNMODIFIED runtime
 * modules in ../runtime/ (fixtures / demo-core / lead-flow / presentation-policy …) plus two VERBATIM data
 * extractions (cap-bands.js = cap.html bandData; items-catalog.js = items.html CATALOG + SCENE_DEFS).
 * Rules that live in DOM-coupled files (cap.html inline script, cap-bridge.js, items.html inline script,
 * br04/bridge.js renderQuick / quickUnit / renderReserve / reserveChoice) are ported here and marked PORT
 * (registered D-45 / D-49: implementation must use the originals). No copy, field or rule is invented. */
(function(){
'use strict';
const F=window.SIM_FIXTURES,q=new URLSearchParams(location.search),PAGE=document.body.dataset.page;
const PUBLIC_TERM=Number(F.pricing.homeReferenceTerm)||12;
const PHONE='13800138000';
const money=n=>'¥'+Math.trunc(Number(n)).toLocaleString('zh-CN');
const fmtNum=n=>Math.trunc(Number(n)).toLocaleString('zh-CN');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const el=html=>{const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild;};
const ico=(id,cls='ico')=>'<svg class="'+cls+'"><use href="#'+id+'"/></svg>';
const makeCore=state=>window.SIM_CORE.create(state?{state}:{});
const authorize=c=>{c.requestPhone();c.resolvePhone('success',{phone:PHONE});};
const tomorrow=()=>new Date(Date.now()+8*3600*1000+86400000).toISOString().slice(0,10);
const storeById=id=>F.stores.find(s=>s.id===id);
const unitById=id=>F.units.find(u=>u.id===id);
const photoOf=s=>'../assets/'+s.photo;
const r3Tier=n=>n<=1.5?'mini':n<=5?'small':n<=15?'medium':'large';
const thumb=u=>'../assets/unit-r3/unit-r3-'+r3Tier(Number(u?.volume)||0)+'-336x312.webp';
const displayedKm=s=>{const n=Number(s?.distance);if(F.distanceVerified)return Number.isFinite(n)&&n>=0?n:NaN;if(!F.synthetic)return NaN;return Number.isFinite(n)&&n>=0?Number((n>8?0.6+n*0.16:n).toFixed(1)):NaN;};
const kmText=s=>{const k=displayedKm(s);return Number.isFinite(k)?k.toFixed(1)+'km':'';};
const displayUnitName=u=>{const name=String(u?.name||'').trim(),cabin=String(u?.demo_cabin_no||'').trim();if(!cabin)return name;const d=name.replace(/^[A-D]\d{1,3}(?=\s|[·•])/,'').replace(/^[\s·•]+/,'').trim();return cabin+(d?' · '+d.replace(/独立仓$/,''):'');}; /* W20 C-11 */ /* PORT bridge.js */
const termRule=m=>F.pricing.termRules.find(x=>m>=x.min&&m<=x.max);
function discTag(a,months){if(a.campaign_ids?.length)return '<span class="tag promo">特价仓</span>';const f=Number(termRule(months)?.factor);return Number.isFinite(f)&&f>0&&f<1&&a.term_factor===f?'<span class="tag disc">'+Number((f*10).toFixed(1))+'折</span>':'';}
function rentFormula(a,months){const m=Number(a?.monthly_average),t=Number(a?.rent_total);if(!Number.isFinite(m)||!Number.isInteger(months))return '';return money(m)+'/月'+(Math.abs(m*months-t)<.011?' × '+months+'个月':'');} /* PORT bridge.js */
const priceHtml=(num,unit,tag)=>'<div class="price"><span class="cur">¥</span><span class="num">'+esc(num)+'</span>'+(unit?'<span class="unit">'+esc(unit)+'</span>':'')+(tag||'')+'</div>';
const termPriceHtml=(a,months)=>priceHtml(fmtNum(a.rent_total),'',discTag(a,months))+'<div class="price-sec">'+esc(rentFormula(a,months))+'</div>';
const unitPublicMonthly=(core,u)=>window.MK_W7.unitFromMonthly(core,u); /* W20 D-146 */ /* 起价型：0.65 档月租（D-10a / D-23） */
/* fee list — same markup as W2 (O01 / OVL-3), incl. D-48 已省 row */
function feeListHtml(a,months,core,opts={}){
  const st=core.state(),couponName=a.coupon_id?(st.coupons.find(c=>c.id===a.coupon_id)?.name||'租金券'):'';
  const special=(a.unit_pricing||[]).filter(x=>x.campaign_id);
  const ids=opts.ids||st.selected;
  const gift=core.giftTermOptions?.(ids,months)?.find(x=>x.eligible);
  return '<div class="fees">'+
    '<div class="row"><span class="k">整期租金<span class="sub">'+months+'个月</span>'+discTag(a,months)+'</span><b class="amt">'+money(a.rent_total)+'</b></div><div class="sec">'+esc(rentFormula(a,months))+'</div>'+
    (Number(a.term_discount_total)>0?'<div class="row saved"><span class="k">已省<span class="sub">较月基价 '+money(a.unit_pricing.reduce((n,x)=>n+Number(x.base_month||0),0))+'/月</span></span><b class="amt">'+money(a.term_discount_total)+'</b></div>':'')+
    (a.full_reduction>0?'<div class="row"><span class="k">满额减<span class="sub">整期满 '+money(a.full_min)+'</span></span><b class="amt">−'+money(a.full_reduction)+'</b></div><div class="sec">减后整期租金 '+money(a.rent_after_coupon)+'</div>':'')+
    (special.length?'<div class="row"><span class="k">特价仓</span><b class="amt">'+special.map(x=>money(x.unit_special_price)+'/月').join('、')+'</b></div>':'')+
    '<div class="row"><span class="k">优惠券</span><b class="amt'+(a.coupon_discount>0?'':' muted')+'">'+(a.coupon_discount>0?'−'+money(a.coupon_discount):a.coupon_skipped?'不与满额减同享':'暂无适用优惠')+'</b></div>'+
    (couponName?'<div class="sec">已使用 '+esc(couponName)+' · 券后整期租金 '+money(a.rent_after_coupon)+'</div>':'')+
    (a.moving_benefit_pending_id?'<div class="row"><span class="k">服务权益</span><b class="amt muted">免费运输 1 次 · 顾问联系安排</b></div>':'')+
    (gift?'<div class="row"><span class="k">赠送租期</span><b class="amt muted">赠送'+esc(gift.gift_months)+'个月</b></div>':'')+
    '<div class="row"><span class="k">押金<span class="sub">'+(ids.length>1?'各仓月租合计':'1个月月租')+'</span></span><b class="amt">'+money(a.deposit)+'</b></div>'+
    '<div class="row"><span class="k">整单管理费</span><b class="amt">'+money(a.management_fee)+'</b></div>'+
    '<div class="total"><span>本次应付</span><b class="amt">'+money(a.payable)+'</b></div></div>';
}
function sheet(title,inner,extra=''){return el('<div class="scrim" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><div class="sheet"><div class="grab"></div><h4>'+esc(title)+'</h4>'+inner+extra+'</div></div>');}
function dialog(title,p,acts){return el('<div class="scrim center" role="alertdialog" aria-modal="true"><div class="dialog" style="text-align:center"><h4>'+esc(title)+'</h4><p>'+p+'</p><div class="acts">'+acts+'</div></div></div>');}
function toast(msg){document.getElementById('toast-root').append(el('<div class="toastwrap" role="status"><div class="toast">'+esc(msg)+'</div></div>'));}
const optRow=(label,on,small)=>'<div class="opt'+(on?' on':'')+'"><span class="r"><span>'+esc(label)+(small?'<br><small>'+esc(small)+'</small>':'')+'</span></span>'+(on?ico('i-check','ico sm'):'')+'</div>';
const chip=(label,on,action,value,extra='')=>'<button type="button" class="chipwrap" aria-pressed="'+!!on+'" data-action="'+action+'" data-value="'+esc(value)+'"><span class="chip'+(on?' on':'')+'">'+(on?ico('i-check','ico sm'):'')+esc(label)+extra+'</span></button>';
const unknown=(key,obj)=>document.body.prepend(el('<p style="padding:16px;color:#B42318">未知状态 '+esc(key)+'；可用：'+Object.keys(obj).join(' / ')+'</p>'));
const actbar=html=>document.getElementById('actbar-root').append(el('<div class="actbar" role="region" aria-label="底部操作区">'+html+'</div>'));

/* ---- W7-C / D 共用（docs/W7_Shared_Contracts.md §3 §4）---- */
const W7=window.MK_W7,REVIEW=q.get('review')==='1',NEEDS_URL='acc.html?view=needs';
const dsc=m=>W7.termDiscount(m)?'<small>'+W7.termDiscount(m)+'</small>':'';
/* 统一租期组件 R-B-21：预设 1/3/6/12/24 +「其他」1–60 个月；折扣标签取折扣表，不写「推荐 / 优惠」 */
function termPick(term,o={}){const h=o.soft||o.unsure!==undefined?'':o.rentAt?W7.nudge(term,o.base,o.rentAt):W7.termHint(term,o.base); /* W21 D-159：预约页（soft）不提示 */
  return '<div class="termpick">'+W7.termSeg(term,o)+(o.note?'<div class="note">'+esc(o.note)+'</div>':'')+(h?'<div class="note nudge">'+esc(h)+'</div>':'')+'</div>';}
/* W17 D-141：「其他」租期走底部弹层（步进 + 常用 18 / 24 / 36），不再在页内展开面板 */
function termOtherRow(term){const other=Number.isInteger(term)&&!W7.TERM_PRESETS.includes(term),d=other?W7.termDiscount(term):'';
  return '<div class="termother"><span class="stepper" role="group" aria-label="其他租期"><button type="button" data-action="termMinus" aria-label="减少一个月"'+(other&&term>1?'':' class="off"')+'>−</button><output>'+(other?term+'个月':'—')+'</output><button type="button" data-action="termPlus" aria-label="增加一个月">＋</button></span>'+(d?'<span class="tag disc">'+d+'</span>':'')+'</div><div class="chips inline soft" role="group" aria-label="常用租期">'+[18,24,36].map(m=>chip(m+'个月',term===m,'term',m)).join('')+'</div><p class="fine">可选 1–60 个月</p>';}
function termSheet(term){const other=Number.isInteger(term)&&!W7.TERM_PRESETS.includes(term);
  return sheet('其他租期',termOtherRow(term),'<div class="acts"><button type="button" class="btn neutral" data-action="closeSheet">取消</button><button type="button" class="btn primary'+(other?'':' disabled')+'"'+(other?'':' disabled aria-disabled="true"')+' data-action="customApply">确定</button></div>');}
const EST_NOTE='估算值，以实际仓位为准';
const cmpRow=(title,sub,right,on)=>'<div class="opt cmp'+(on?' on':'')+'"><span class="r"><span><b>'+esc(title)+'</b><small>'+esc(sub)+'</small></span></span><span class="amt">'+right+'</span></div>';

/* ======================= CAP ======================= */
/* PORT cap.html inline script (isValid / format / bandData lookup / summary) + cap-bridge.js；W7-D：统一容量 / 租期组件、㎡ 换算可见（2.4m）、阈值两档（>15 顾问提示 / ≥30 交销售，取消 50）、AI 估算演示占位 */
const BANDS=window.MK_CAP_BANDS,AREA_H=window.MK_VOLUME_MODEL?window.MK_VOLUME_MODEL.LAYER_HEIGHT_M:2.5; /* W7-A：MK-VOL-0.1 层高 2.4（团队定价口径） */
const capValid=n=>Number.isFinite(n)&&n>=0.5&&n<=200&&Math.abs(Math.round(n*100)-n*100)<1e-7;
const areaValid=n=>Number.isFinite(n)&&n>=0.2&&n<=200&&Math.abs(n*10-Math.round(n*10))<1e-7;
const fmtCap=n=>String(parseFloat(Number(n).toFixed(2)));
const CAP_STATES={term_near:{v:3,term:10},empty:{},filled:{v:3},area:{unit:'m2',area:2},invalid:{raw:'0.3'},term:{v:3,term:6},other:{v:3,term:18,overlay:'terms'},large:{v:60,term:12},ai:{v:3,term:6,overlay:'ai'},advisor_hint:{v:20,term:12},sales:{v:30},area_invalid:{unit:'m2',area:0.1},area_large:{unit:'m2',area:120},area_over:{unit:'m2',area:260},over:{v:260,term:12},
  /* W17：两页数据共享（D-142）与 ㎡ 全流程 */
  from_items:{v:3.4,term:6,src:'items'},from_items_edited:{v:5,term:6,src:'edited'},area_term:{unit:'m2',area:2,term:6}}; /* W16：㎡ 无效输入；超过 200m³ 转顾问 */
function renderCAP(){
  const key=q.get('state')||'empty',cfg=CAP_STATES[key];if(!cfg)return unknown(key,CAP_STATES);
  document.body.dataset.state=key;
  const unit=cfg.unit||'m3';
  let raw=cfg.raw??(cfg.v!==undefined?String(cfg.v):'');
  if(unit==='m2')raw=areaValid(cfg.area)?String(Number((cfg.area*AREA_H).toFixed(2))):'';
  const areaBad=unit==='m2'&&cfg.area!==undefined&&!areaValid(cfg.area); /* W16 */
  const n=raw===''?null:Number(raw),ok=n!==null&&capValid(n),over=n!==null&&Number.isFinite(n)&&n>200,missing=n===null&&!areaBad,invalid=areaBad||(!missing&&!ok&&!over),term=cfg.term||W7.TERM_DEFAULT; /* W21 D-158 */
  const sales=(ok&&W7.salesOnly(n))||over,hint=ok&&!sales&&n>W7.ADVISOR_CAP_M3; /* W16：>200m³ 与 ≥30m³ 同样交顾问，不再报「超出范围」 */
  /* capacity：统一容量组件 .cappick（R-B-29）*/
  const shown=unit==='m2'?(cfg.area!==undefined?String(cfg.area):''):raw;
  document.getElementById('cap-sec').append(el('<div class="cappick">'+
    '<div class="caprow'+(invalid?' invalid':'')+'"><button type="button" class="stepbtn'+(ok&&n>0.5?'':' off')+'" data-action="minus" aria-label="容量减少0.5立方米">−</button><div class="input'+(shown===''?' empty':'')+(invalid?' invalid':'')+'" role="textbox" aria-label="'+(unit==='m2'?'预计占地面积（平方米）':'预计所需空间')+'"><span class="val">'+(shown===''?(unit==='m2'?'如 2':'如 3'):esc(shown))+'</span><span class="unitseg" role="group" aria-label="空间输入单位"><button type="button" class="'+(unit==='m3'?'on':'')+'" data-action="unit" data-value="m3" aria-pressed="'+(unit==='m3')+'">m³</button><button type="button" class="'+(unit==='m2'?'on':'')+'" data-action="unit" data-value="m2" aria-pressed="'+(unit==='m2')+'">㎡</button></span></div><button type="button" class="stepbtn" data-action="plus" aria-label="容量增加0.5立方米">＋</button></div>'+
    (unit==='m2'&&(ok||over)?'<div class="conv">约 '+esc(fmtCap(n))+' m³</div>':'')+ /* R-B-06 / D-104：㎡ 换算可见 */
    (invalid?'<div class="caphelp"><span class="err">'+(areaBad?'请填写 0.2–200㎡ 的面积，最多一位小数':'请填写不小于 0.5m³ 的容量，最多两位小数')+'</span></div>':'')+
    (unit==='m3'?'<div class="chips inline soft" role="group" aria-label="常用容量">'+[1,3,8,15,20].map(v=>chip(v+'m³',ok&&n===v,'quick',v)).join('')+'</div>':'')+ /* W17：30 换成可自助的 20；㎡ 模式不显示 m³ 快捷项 */
    (cfg.src==='items'?'<div class="capsrc">'+ico('i-box','ico sm')+'<span>按物品估算 <b>'+esc(fmtCap(n))+'m³</b> · 3 种 6 件</span><button type="button" class="lnk" data-action="items" data-href="items.html?state=restored">修改清单 ›</button></div>':
     cfg.src==='edited'?'<div class="capsrc">'+ico('i-box','ico sm')+'<span>已改为手动填写 · 物品估算为 <b>3.4m³</b></span><button type="button" class="lnk" data-action="restoreItems">恢复</button></div>':
     '<div class="caphelprow">'+(ok&&!sales?'<button type="button" class="l" data-action="toRef">全放标准纸箱约 '+Math.floor(n*.8/.096)+' 箱 · 看示意</button>':'<span class="l">'+(sales?'':'不确定多大？')+'</span>')+'<button type="button" class="r" data-action="items" data-href="items.html">按物品估算 ›</button></div>')+
    '</div>'));
  /* term：统一租期组件，位置上移到首屏（R-B-25）*/
  if(sales)document.getElementById('term-sec').hidden=true; /* W17：交顾问时收起租期 */
  else document.getElementById('term-sec').append(el('<div><div class="flabel">租期</div>'+termPick(term)+'</div>'));
  if(sales||hint)document.querySelector('.assist [data-action="advisor"]')?.remove(); /* W17：已有顾问卡时不再重复「顾问协助」 */
  /* 阈值两档（D-101）：≥30m³ 交销售；>15m³ 提示可预约顾问，不拦截自助找仓 */
  if(sales||hint){const a=document.getElementById('advice-sec');a.hidden=false;a.append(el(sales?
    '<section class="card advice"><div><div class="t">'+W7.SALES_CAP_M3+'m³ 及以上由顾问为您配仓</div><div class="s">提交后'+esc(W7.LEAD_COPY.inHours)+'。</div></div></section>':
    '<section class="card advice"><div><div class="t">需要顾问帮您确认方案？</div><div class="s">超过 '+W7.ADVISOR_CAP_M3+'m³ 可预约顾问协助，不影响自助找仓。</div></div><button type="button" class="btn secondary md" data-action="advisor">预约顾问</button></section>'));}
  /* reference */
  const ref=document.getElementById('ref-sec');
  if(ok||over){const b=BANDS.find(x=>n<=x.max)||BANDS[BANDS.length-1],bi=BANDS.indexOf(b),lo=bi>0?BANDS[bi-1].max:null,rng=lo===null?b.max+'m³ 以内':bi===BANDS.length-1?lo+'m³ 以上':lo+'–'+b.max+'m³'; /* W17：参考标题写区间，边界取档位表 */
    ref.append(el('<div class="flabel">空间参考<small>'+rng+' 大致能放</small></div>'));
    ref.append(el('<section class="card refcard"><div class="pic"><img src="../assets/unit-r3/unit-r3-'+r3Tier(n)+'-640x480.webp" alt="约'+b.anchor+'立方米仓储空间参考示意"></div><div class="body"><h3>'+esc(b.title)+'</h3><div class="note">'+esc(b.note)+'</div><div class="objs">'+b.things.map(o=>'<div class="o"><img src="../assets/estimate/objects/'+encodeURIComponent(o.image)+'" alt="'+esc(o.name)+'真实感物品示意图"><span class="n">'+esc(o.name)+'</span><span class="c">'+esc(o.value)+'</span></div>').join('')+'</div></div></section>'));}
  else ref.append(el('<div class="refbox" role="note">'+ico('i-cube')+'填写容量，查看对应的存储空间参考</div>'));
  /* bottom bar：置灰时写明还缺什么（R-B-25）*/
  const ready=ok&&!!term,need=[missing?'填写容量':areaBad?'修改面积':invalid?'修改容量':'',term?'':'选择租期'].filter(Boolean);
  const sum=sales?'<b>'+esc(fmtCap(n))+'m³</b> · 由顾问配仓':'<b>'+(ok?esc(fmtCap(n))+'m³':'—')+'</b> · <b>'+(term?term+'个月':'—')+'</b>'+(need.length?'<span class="need'+(invalid?' err':'')+'">还需'+need.join('、')+'</span>':'');
  actbar('<div class="sum">'+sum+'</div>'+(sales?'<button type="button" class="btn primary" data-action="advisorSubmit" data-href="booking.html?mode=advisor">提交给顾问</button>':'<button type="button" class="btn primary'+(ready?'':' disabled')+'"'+(ready?'':' disabled aria-disabled="true"')+' data-action="cta">查看仓位报价</button>'));
  /* AI 估算：演示占位（D-91），不进入假流程；state=ai 只给一条提示 */
  document.querySelectorAll('[data-action="ai"]').forEach(b=>{b.setAttribute('aria-disabled','true');if(REVIEW)b.title='演示占位：AI 估算后续接入';});
  const ov=q.get('overlay')||cfg.overlay;
  if(ov==='ai')toast('AI 估算暂未开放，可按物品估算或直接填写容量');
  if(ov==='terms')document.getElementById('overlay-root').append(termSheet(term));
  window.__W3={page:'CAP',src:cfg.src||'manual',state:key,unit,raw,capacity:ok?n:null,invalid,term,ready,band:ok?(BANDS.find(x=>n<=x.max)||BANDS.at(-1)).anchor:null,large:sales,advisorHint:hint,sales};
}

/* ======================= ITEMS ======================= */
/* PORT items.html inline script: catalog ordering, variants, volume / display / validity, empty / list / term / known pages, footer, cart sheet, clear dialog;
   items-bridge.js: AI → cap.html?assist=AI, 帮助 → BOOKING advisor, footer button copy by return context. Seed = window.demo.seed(). */
/* W20 D-152：红酒箱（winebox）拿掉；档案箱保留。runtime/items-catalog.js 原件未改，这里过滤 */
const HIDE_ITEMS=new Set(['winebox']);
const CATALOG=(c=>{const j=JSON.parse(JSON.stringify(c));(function w(o){for(const k in o){const v=o[k];if(Array.isArray(v)){o[k]=v.filter(x=>!(HIDE_ITEMS.has(x)||(x&&HIDE_ITEMS.has(x.id))));o[k].forEach(x=>x&&typeof x==='object'&&w(x));}else if(v&&typeof v==='object')w(v);}})(j);return j;})(window.MK_ITEMS_CATALOG),SCENES=(c=>{const j=JSON.parse(JSON.stringify(c));for(const k in j)if(Array.isArray(j[k].items))j[k].items=j[k].items.filter(x=>!HIDE_ITEMS.has(x));return j;})(window.MK_ITEMS_SCENES);
const CAT_ICON={all:'i-grid',suitcase:'i-bag',furniture:'i-sofa',electric:'i-plug',organize:'i-box',hobby:'i-star',business:'i-store',office:'i-office',other:'i-tag'};
const SCENE_ICON={moving:'i-sofa',home:'i-box',luggage:'i-bag',hobby:'i-star',business:'i-store',office:'i-office'};
const CATS=[['all','全部物品'],...CATALOG.categories.filter(c=>c[0]!=='other').map(([id,name])=>[id,name])]; /* W17：「其他物品」只有 1 项，儿童推车并入家具 */
const SCENE_CATS=Object.entries(SCENES).map(([id,x])=>['scene_'+id,x.name]);
/* W17 目录去重与说明改写：设计侧覆盖，runtime/items-catalog.js 原件未改，代码侧需同步改目录。
   办公椅 / 办公桌只保留办公物资里的单品，家具里的「餐椅 / 办公椅」「餐桌 / 办公桌」去掉办公规格；纸箱类单位统一用「箱」；四条说明去掉内部备注。 */
const DESC={box:'约 60×40×40cm',goodsbox:'约 60×40×50cm',pallet:'含货物的满载托盘',printer:'按中型设备估算，大型复印机请选顾问协助'};
const BOXLIKE=new Set(['box','bin','clothingBox','toybox','shoebox','figurebox','winebox','goodsbox','turnover','archiveBox','officeBox']);
const ITEMS=[...CATALOG.items].map(x=>x.id==='chair'?{...x,name:'餐椅',variants:x.variants.filter(v=>v.id!=='office')}:x.id==='dining'?{...x,name:'餐桌 / 小桌',variants:x.variants.filter(v=>v.id!=='office')}:x.id==='stroller'?{...x,category:'furniture'}:x).sort((a,b)=>{const o=CATALOG.categories.map(c=>c[0]);return o.indexOf(a.category)-o.indexOf(b.category);});
const BYID=Object.fromEntries(ITEMS.map(x=>[x.id,x]));
const UPGRADE=new Set(['luggage20','luggage24','luggage28','bag']);
const ITEMS_STATES={empty:{},selected:{seed:true,browsing:true},category:{seed:true,category:'furniture'},scenes:{seed:true,mode:'scenes',category:'scene_moving'},search:{seed:true,browsing:true,search:'沙发'},search_empty:{browsing:true,search:'钢琴'},term:{seed:true,browsing:true,term:6,overlay:'term'},term_other:{seed:true,browsing:true,term:18,overlay:'term'},advisor_hint:{seedMid:true,browsing:true,term:12,overlay:'cart'},scene_business:{mode:'scenes',category:'scene_business'},sales:{seedBig:true,browsing:true,term:12},cart:{seed:true,browsing:true,overlay:'cart'},clear:{seed:true,browsing:true,overlay:'cart',overlay2:'clear'},
  /* W16 补缺失状态 */
  variant:{seed:true,browsing:true,overlay:'variant',ovItem:'sofa3'},qty:{seed:true,browsing:true,overlay:'qty',ovItem:'box'},qty_max:{seed:true,browsing:true,overlay:'qty',ovItem:'box',qtyRaw:'1200'},
  tiny:{seedTiny:true,category:'organize',term:6},over:{seedHuge:true,category:'business',term:12},restored:{seed:true,browsing:true,term:6,restored:true}};
const QTY_MAX=999; /* W16：单种物品数量上限，设计侧初值（基线没有上限），待业务确认 */
/* W7-A：QUICK 存取时间取所选门店实际时间（与 S02 同一函数，逐字取自 w2-render.js） */
function accessHours(s){if(s.access_hours)return s.access_hours;let h=2166136261;for(const c of String(s.id)){h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;}return ['24小时','09:00-21:00','08:00-23:00'][h%3];}
function renderITEMS(){
  const key=q.get('state')||'empty',cfg=ITEMS_STATES[key];if(!cfg)return unknown(key,ITEMS_STATES);
  document.body.dataset.state=key;
  const COUNT=Object.fromEntries(ITEMS.map(x=>[x.id,0])),VAR=Object.fromEntries(ITEMS.map(x=>[x.id,x.defaultVariant]));
  if(cfg.seed){COUNT.box=3;COUNT.luggage28=2;COUNT.sofa3=1;}
  if(cfg.seedTiny){COUNT.box=1;}
  if(cfg.seedMid){COUNT.sofa3=2;COUNT.bed180=2;COUNT.wardrobe=2;COUNT.fridge=1;COUNT.washer=1;COUNT.box=40;}
  if(cfg.seedHuge){COUNT.pallet=90;COUNT.goodsbox=200;}
  if(cfg.seedBig){COUNT.sofa3=6;COUNT.box=60;COUNT.luggage28=10;COUNT.bed180=4;}
  const st={mode:cfg.mode||'items',category:cfg.category||'all',term:cfg.term||W7.TERM_DEFAULT,known:cfg.known??null,browsing:!!cfg.browsing,search:cfg.search||''};
  const curVar=x=>x.variants.find(v=>v.id===VAR[x.id])||x.variants[0];
  const round3=v=>Math.round((v+Number.EPSILON)*1000)/1000;
  const exactSum=()=>ITEMS.reduce((s,x)=>s+(COUNT[x.id]||0)*curVar(x).volume_m3,0);
  const rec=()=>window.MK_VOLUME_MODEL.recommend(ITEMS.filter(x=>COUNT[x.id]>0).map(x=>({id:x.id,category:x.category,volume_m3:curVar(x).volume_m3,count:COUNT[x.id]}))); /* W7-A：MK-VOL-0.1 建议容量 = 物品合计 ÷ 装载系数 */
  const volume=()=>st.known!==null?st.known:rec().recommended;
  const display=v=>(Math.round((v+Number.EPSILON)*100)/100).toLocaleString('zh-CN',{maximumFractionDigits:2}); /* W7-D R-B-27：单品体积最多两位小数 */
  const disp1=v=>v>0&&v<0.1?display(v):(Math.round((v+Number.EPSILON)*10)/10).toLocaleString('zh-CN',{maximumFractionDigits:1}); /* 小计 / 合计 / 建议容量精度 0.1 */
  const salesVol=()=>validVol()&&W7.salesOnly(volume());
  const selected=()=>ITEMS.filter(x=>COUNT[x.id]>0),kinds=()=>selected().length,units=()=>selected().reduce((s,x)=>s+COUNT[x.id],0);
  const validVol=()=>Number.isFinite(volume())&&volume()>0&&(st.known===null||(volume()>=0.5&&volume()<=200)); /* W16：按物品估出 >200m³ 不再置灰，走交顾问 */
  const tiny=()=>st.known===null&&volume()>0&&volume()<.5;
  const longSel=()=>selected().filter(x=>x.long);
  /* W16 长件提示（替代「大件」标签）：目录没有物品长度字段，只提示对照仓位尺寸，不做能否放入的判断 */
  const longHint=()=>longSel().length?'<p class="fine longhint">'+ico('i-info','ico sm')+'<span>含长件：'+esc(longSel().map(x=>x.name).join('、'))+'。选仓时请对照仓位的长宽高。</span></p>':'';
  const imgOf=x=>{if(UPGRADE.has(x.id))return '../assets/estimate/items/upgrade_'+x.id+'.webp';const photo=(x.id==='chair'&&VAR[x.id]==='office')?'办公椅_专属.webp':(x.id==='bed180'&&VAR[x.id]==='mattress')?'床垫.webp':x.photo;return '../assets/estimate/items/'+encodeURIComponent(photo);};
  const abbr={suitcase:'箱',furniture:'家',electric:'电',organize:'收',hobby:'藏',business:'商',office:'办',other:'物'};
  const thumbOf=x=>x.photo?'<img class="th" src="'+imgOf(x)+'" alt="'+esc(x.name)+'" loading="lazy">':'<span class="th ph" title="当前暂无专属图片，为中性示意"><b>'+(abbr[x.category]||'物')+'</b></span>';
  const bizGuide=()=>['scene_business','scene_office','business','office'].includes(st.category); /* W7-D R-B-33 */
  const navCats=()=>st.mode==='scenes'?SCENE_CATS:CATS;
  const filtered=()=>{if(st.mode==='scenes'&&st.category.startsWith('scene_')){const d=SCENES[st.category.slice(6)];return d?d.items.map(id=>BYID[id]).filter(Boolean):[];}return st.category==='all'?ITEMS:ITEMS.filter(x=>x.category===st.category);};
  const label=()=>navCats().find(x=>x[0]===st.category)?.[1]||'全部物品';
  const sceneDesc=()=>st.mode==='scenes'&&SCENES[st.category.slice(6)]?.description||'';
  /* mode tabs */
  document.querySelectorAll('#modetabs button').forEach(b=>{const on=b.dataset.mode===st.mode;b.classList.toggle('on',on);b.setAttribute('aria-selected',String(on));});
  /* rail */
  const rail=document.getElementById('rail');
  navCats().forEach(([id,name])=>rail.append(el('<button type="button" class="'+(st.category===id?'on':'')+'" data-action="cat" data-value="'+id+'" aria-pressed="'+(st.category===id)+'">'+ico(st.mode==='scenes'?SCENE_ICON[id.slice(6)]||'i-box':CAT_ICON[id]||'i-box')+'<span>'+esc(name)+'</span></button>')));
  /* W17：租期入口从左栏底部移到底栏（D-142）；左栏只留物品分类 */
  /* content */
  const c=document.getElementById('wsc');
  const row=x=>{const n=COUNT[x.id],v=curVar(x),multi=x.variants.length>1;return '<article class="irow'+(n>0?' has':'')+'" data-item="'+x.id+'">'+thumbOf(x)+'<div><div class="nm"><span>'+esc(x.name)+'</span>'+''+'</div>'+(multi?'<span class="var" data-action="variant" data-value="'+x.id+'">规格 · '+esc(v.name)+ico('i-down')+'</span>':'<div class="ds">'+esc(DESC[x.id]||x.description)+'</div>')+'<div class="foot"><div><div class="ds">约 '+display(v.volume_m3)+'m³/'+(BOXLIKE.has(x.id)?'箱':'件')+'</div>'+(n?'<div class="sub">小计 '+disp1(n*v.volume_m3)+'m³</div>':'')+'</div><span class="stepper sm'+(n?'':' zero')+'" aria-label="'+esc(x.name)+'数量"><button type="button" class="'+(n?'':'off')+'" data-action="step" data-value="'+x.id+'|-1" aria-label="减少'+esc(x.name)+'">−</button><output data-action="qty" data-value="'+x.id+'" title="点数字可直接填写数量">'+n+'</output><button type="button" data-action="step" data-value="'+x.id+'|1" aria-label="增加'+esc(x.name)+'">+</button></span></div></div></article>';};
  { /* W17：取消物品页内的租期页、已知容量页与空态页；进页直接是物品列表 */
    let arr=filtered();const k=st.search.trim().toLowerCase();if(k)arr=arr.filter(x=>(x.name+' '+x.description+' '+x.variants.map(y=>y.name).join(' ')).toLowerCase().includes(k));
    c.append(el('<div><div class="listhead"><b>'+(k?'搜索结果':esc(label()))+'</b><small>'+arr.length+'项</small></div>'+(sceneDesc()?'<p class="sceneintro">'+esc(sceneDesc())+'</p>':'')+(bizGuide()?'<section class="notice bizguide"><div class="t">商家 / 企业用仓</div><div class="s">多仓、长期或需要开票，可提交企业用仓需求，由顾问配仓。</div><button type="button" class="btn secondary md" data-action="business" data-href="business.html">填写企业用仓需求</button></section>':'')+'<div class="searchline"><div class="search'+(st.search?' filled':'')+'" role="search">'+ico('i-search','ico sm')+'<span>'+(st.search?esc(st.search):'搜索物品名称')+'</span>'+(st.search?'<span class="clear" aria-label="清除搜索">'+ico('i-close','ico xs')+'</span>':'')+'</div></div>'+(selected().length?'<button type="button" class="inlinelink" data-action="cart">已选 '+kinds()+' 种、'+units()+' 件 · 查看清单 ›</button>':'')+longHint()+'<div>'+(arr.length?arr.map(row).join(''):'<section class="card empty" role="status" style="border:0"><div class="pic">'+ico('i-search')+'</div><h4>没有找到相关物品</h4><p>可换个名称，或选一件大小相近的物品代替</p><div class="acts" style="flex-direction:column;align-items:center"><button type="button" class="btn secondary md" data-action="resetSearch">查看全部物品</button><button type="button" class="btn text md" data-action="toCap" data-href="cap.html">直接填写容量</button><button type="button" class="btn text md" data-action="advisor">顾问协助</button></div></section>')+'</div>'+(arr.length&&selected().length?'<p class="fine estnote">'+(tiny()?'物品约 '+disp1(exactSum())+'m³，小于最小仓位，按 0.5m³ 为您匹配。':'物品约 '+disp1(exactSum())+'m³，留出码放空隙后建议 '+disp1(volume())+'m³。'+EST_NOTE+'。')+'</p>':'')+'</div>'));
  }
  /* footer summary bar */
  const top=selected().length?'物品约 <b>'+disp1(exactSum())+'m³</b> · '+units()+' 件':'还没有选择物品'; /* W17：底栏同时写物品合计与建议容量 */
  const bottom='<span class="big">'+(tiny()?'按 0.5m³ 匹配':(volume()>0?(st.known!==null?'约 ':'建议 '):'')+disp1(volume())+'m³')+'</span>';
  let btn='请先选物品',dis=true;if(!validVol()){btn=volume()>200?'容量超出范围':'请先选物品';}else if(salesVol()){btn='提交给顾问';dis=false;}else if(!st.term){btn='选择租期';dis=false;}else{btn='查看仓位报价';dis=false;}
  actbar('<button type="button" class="sum" data-action="cart" aria-label="查看已选清单" style="text-align:left">'+top+'<br>'+bottom+'</button>'+(st.term&&validVol()&&!salesVol()?'<button type="button" class="termbtn" data-action="termSheet" aria-label="租期 '+st.term+'个月，点击修改">'+st.term+'个月'+ico('i-down','ico sm')+'</button>':'')+'<button type="button" class="btn primary'+(dis?' disabled':'')+'"'+(dis?' disabled aria-disabled="true"':'')+' data-action="footer">'+btn+'</button>');
  /* overlays */
  const ov=q.get('overlay')||cfg.overlay,ovr=document.getElementById('overlay-root');
  if(ov==='cart'){const a=selected();ovr.append(el('<div class="scrim" role="dialog" aria-modal="true" aria-label="已选物品"><div class="sheet"><div class="grab"></div><div class="head"><h4>已选物品（'+a.length+'种，共'+units()+'件）</h4><button type="button" class="btn text sm" data-action="clearAll">清空</button></div><div class="list">'+(a.length?a.map(x=>'<div class="cartrow"><img src="'+imgOf(x)+'" alt="'+esc(x.name)+'"><div><b>'+esc(x.name)+'</b><small>'+esc(curVar(x).name)+' · '+COUNT[x.id]+'件 · 约'+disp1(COUNT[x.id]*curVar(x).volume_m3)+'m³</small></div><div class="acts2"><button type="button" class="del" data-action="del" data-value="'+x.id+'" aria-label="删除'+esc(x.name)+'">删除</button><span class="stepper sm"><button type="button" data-action="step" data-value="'+x.id+'|-1" aria-label="减少">−</button><output>'+COUNT[x.id]+'</output><button type="button" data-action="step" data-value="'+x.id+'|1" aria-label="增加">+</button></span></div></div>').join(''):'<p class="note">暂未添加物品，关闭后可继续选择。</p>')+'</div>'+longHint()+(volume()>W7.ADVISOR_CAP_M3&&!salesVol()?'<p class="fine advhint">'+ico('i-info','ico sm')+'<span>超过 '+W7.ADVISOR_CAP_M3+'m³ 可预约顾问协助，不影响自助找仓。</span></p>':'')+'<div class="carttotal"><span class="k">建议容量<small>物品合计约 '+disp1(exactSum())+'m³，留出码放空隙后的建议值</small></span><b>'+disp1(volume())+'m³</b></div><div class="acts"><button type="button" class="btn primary" data-action="closeSheet">完成</button></div></div></div>'));}
  if(ov==='term'){const other=Number.isInteger(st.term)&&!W7.TERM_PRESETS.includes(st.term);ovr.append(sheet('租期',termPick(st.term)+(other?termOtherRow(st.term):''),'<div class="acts"><button type="button" class="btn primary" data-action="closeSheet">确定</button></div>'));}
  if(ov==='variant'){const x=BYID[cfg.ovItem];ovr.append(sheet('选择规格',x.variants.map(v=>'<div class="opt'+(v.id===VAR[x.id]?' on':'')+'" data-action="pickVariant" data-value="'+v.id+'"><span class="r"><span>'+esc(v.name)+'</span></span><span class="amt">约 '+display(v.volume_m3)+'m³/件'+(v.id===VAR[x.id]?ico('i-check','ico sm'):'')+'</span></div>').join(''),'<p class="fine">'+esc(x.name)+' · 换规格后数量不变，小计按新规格计算。</p>'));}
  if(ov==='qty'){const x=BYID[cfg.ovItem],raw=cfg.qtyRaw??String(COUNT[x.id]),bad=!(Number(raw)>=0&&Number(raw)<=QTY_MAX);
    ovr.append(el('<div class="scrim center" role="dialog" aria-modal="true" aria-label="填写数量"><div class="dialog qtydlg"><h4>'+esc(x.name)+'</h4><p>填写数量</p><div class="input'+(bad?' err':'')+'" role="textbox" aria-label="数量"><span class="ph filled" style="font-weight:600">'+esc(raw)+'</span><span class="suffix">件</span></div>'+(bad?'<div class="qerr">单种物品最多填 '+QTY_MAX+' 件，更多请交给顾问配仓</div>':'')+'<div class="chips inline soft" role="group" aria-label="常用数量">'+[10,20,50].map(v=>chip(v+' 件',false,'qtyQuick',v)).join('')+'</div><div class="acts"><button type="button" class="btn neutral md" data-action="qtyNo">取消</button><button type="button" class="btn primary md'+(bad?' disabled':'')+'"'+(bad?' disabled aria-disabled="true"':'')+' data-action="qtyYes">确定</button></div></div></div>'));}
  if(cfg.restored)toast('已保留上次选择的物品，可继续增减');
  if(cfg.overlay2==='clear')ovr.append(dialog('清空已选物品？','会删除当前选择的物品与数量。','<button type="button" class="btn neutral md" data-action="clearNo">取消</button><button type="button" class="btn danger md" data-action="clearYes">清空</button>'));
  window.__W3={page:'ITEMS',state:key,mode:st.mode,category:st.category,term:st.term,known:st.known,selected:selected().map(x=>[x.id,COUNT[x.id]]),volume:volume(),validVol:validVol(),btn,sales:salesVol(),countItems:ITEMS.length};
  document.querySelectorAll('[data-action="ai"]').forEach(b=>{b.setAttribute('aria-disabled','true');if(REVIEW)b.title='演示占位：AI 估算后续接入';});
}

/* ======================= QUICK ======================= */
/* PORT br04/bridge.js quickState / renderQuick / chooseStore / chooseUnit / quickUnit (auto-capacity) / moreTerms / citySheet / moneyLines
   W7-C：?store=<id> 带入门店（在租用户「加租仓位」R-B-02）；空态占位裁切（R-B-11）；选择抽屉比较信息 + 仓号统一（R-B-14）；
   租期统一组件、取消橙色「推荐」（R-B-21 / 23）；主按钮未就绪禁用并写明缺哪一步、预计费用进底栏（R-B-24） */
const QUICK_STATES={empty:{scenario:'noDemand'},store:{scenario:'noDemand',store:'SIM_BJ01'},unit:{scenario:'noDemand',store:'SIM_BJ01',unit:'SIM_BJ01_U03'},term:{scenario:'noDemand',store:'SIM_BJ01',unit:'SIM_BJ01_U03',term:6},ready:{scenario:'noDemand',store:'SIM_BJ01',unit:'SIM_BJ01_U03',term:6,date:true},addon:{scenario:'noDemand',store:'SIM_BJ01',carried:true}};
function renderQUICK(){
  const key=q.get('state')||'empty',cfg=QUICK_STATES[key];if(!cfg)return unknown(key,QUICK_STATES);
  document.body.dataset.state=key;document.body.dataset.scenario=cfg.scenario;
  const core=makeCore();core.setScenario(cfg.scenario);
  const qs={storeId:null,ids:[],autoCapacity:null};
  const pStore=q.get('store'),carriedStore=!cfg.store&&pStore&&storeById(pStore)?.status==='open'?pStore:null,cfgStore=cfg.store||carriedStore,carried=!!cfg.carried||!!carriedStore;
  if(cfgStore){core.clearSelection?.();core.setStore(cfgStore);qs.storeId=cfgStore;}
  if(cfg.unit){const ids=cfg.unit.split(','),rows=ids.map(unitById),r=core.state().requirement;const volume=Number(rows.reduce((n,u)=>n+Number(u.volume),0).toFixed(2));const auto=!core.validCapacity(r.capacity_m3)||(Number.isFinite(qs.autoCapacity)&&Number(qs.autoCapacity)===Number(r.capacity_m3));if(auto){core.setRequirement(volume,r.term_months,r.term_confirmed);qs.autoCapacity=volume;}qs.ids=ids;}
  if(cfg.term)core.setTerm(cfg.term);else{try{core.setTerm(W7.TERM_DEFAULT);}catch(_){}} /* W21 D-158 */
  const ov=q.get('overlay');
  if(cfg.date||ov==='fees'){authorize(core);}
  if(cfg.date)core.setDate(tomorrow());
  const s=core.state(),r=s.requirement,st=storeById(qs.storeId),rows=qs.ids.map(unitById).filter(Boolean),chosen=rows.length>0,valid=chosen&&rows.every(u=>u.store_id===qs.storeId)&&core.selectionValid(qs.ids);
  const computed=valid&&r.term_confirmed?core.amounts(qs.ids,r.term_months):null;
  const body=document.getElementById('body');
  /* store */
  body.append(el('<section class="card" aria-label="选择门店"><div class="ct">'+ico('i-pin')+'选择门店</div><div class="lrow"><span class="k">用仓位置</span><span class="v" id="origin">'+esc(s.city)+' · 全城门店</span><button type="button" class="lk" data-action="origin" aria-label="更改用仓位置">更改'+ico('i-chev','ico sm')+'</button></div><button type="button" class="lrow pick" data-action="store" style="padding:10px 0 2px">'+(st?'<img class="ph" src="'+photoOf(st)+'" alt="门店场景示意">':'<span class="ph">'+ico('i-store')+'</span>')+'<div><div class="n'+(st?'':' hint')+'">'+esc(st?.name||'请选择门店')+'</div><div class="s">'+esc(st?(kmText(st)?kmText(st)+' · ':'')+st.address:(F.stores.some(x=>x.city===s.city&&x.status==='open')?'选择门店后显示地址':'暂无可展示门店'))+'</div>'+(st?'<span class="lk" style="min-height:28px">查看详情'+ico('i-chev','ico sm')+'</span>':'')+'</div><span class="chevbtn">'+ico('i-chev','ico sm')+'</span></button>'+(carried&&st?'<div class="fine carried">已带入您在租的门店，可更换。</div>':'')+'</section>'));
  /* unit */
  const price=!chosen?'':!valid?'<div class="muted" style="font-size:var(--mk-font-size-sm);color:var(--mk-color-ink-secondary)">当前不可用</div>':computed?'':priceHtml(fmtNum(rows.reduce((n,u)=>n+unitPublicMonthly(core,u),0)),'/月起'); /* 起价型 0.65，只用于未选租期的单仓（D-51 / D-90） */
  body.append(el('<section class="card" aria-label="选择仓位"><div class="ct">'+ico('i-box')+'选择仓位</div><div class="pick" style="align-items:flex-start">'+(chosen?'<img class="ph" src="'+thumb(rows[0])+'" alt="仓位空间示意">':'<span class="ph">'+ico('i-cube')+'</span>')+'<div><div class="n'+(chosen?'':' hint')+'">'+esc(chosen?rows.map(displayUnitName).join(' + '):'请选择仓位')+'</div><div class="s">'+(chosen?(rows.length>1?'<b style="color:var(--mk-color-ink-primary)">合计 '+esc(rows.reduce((n,u)=>n+u.volume,0))+'m³</b>':esc(rows[0].dimensions)):(st?'选仓后显示容量与尺寸':'请先选择门店'))+'</div>'+(chosen&&rows.length>1?'<div class="tags"><span class="tag info">'+rows.length+'项组合</span></div>':'')+(price?'<div class="price-wrap" style="margin-top:8px">'+price+'</div>':'')+'</div><button type="button" class="swap" data-action="unit">'+(chosen?'更换':'选择')+'</button></div></section>'));
  /* term：统一组件，折扣档写在每个选项上 */
  const term=r.term_confirmed?r.term_months:null;
  body.append(el('<section class="card" aria-label="选择租期"><div class="ct">'+ico('i-ticket')+'选择租期</div>'+termPick(term,computed?{base:rows.reduce((n,u)=>n+Number(s.prices[u.id]??u.base_month),0),rentAt:k=>core.amounts(qs.ids,k).rent_total}:{})+'</section>'));
  /* date */
  body.append(el('<section class="card" aria-label="预计用仓时间"><div class="ct">'+ico('i-cal')+'预计用仓时间</div><button type="button" class="input" style="width:100%" data-action="date" aria-label="选择预计用仓日期"><span class="ph'+(s.startDate?' filled':'')+'">'+esc(s.startDate||'请选择用仓日期')+'</span>'+ico('i-cal','ico sm')+'</button></section>'));
  /* estimate (整期型, D-35)：仅在可计算时出卡；金额同时进底栏，首屏可见 */
  if(computed)body.append(el('<section class="card pricecard" aria-label="预计费用"><div style="min-width:0"><div class="lab">预计整期租金 <b>/ '+r.term_months+'个月</b></div>'+termPriceHtml(computed,r.term_months)+'<div class="fine" style="margin-top:8px;display:flex;align-items:center;gap:4px">'+(st?ico('i-clock','ico xs')+'存取时间 '+esc(accessHours(st)):'')+'</div></div><button type="button" class="lk" data-action="fees">费用明细'+ico('i-chev','ico sm')+'</button></section>'));
  else if(st)body.append(el('<p class="fine" style="padding:0 2px">'+ico('i-clock','ico xs')+' 存取时间 '+esc(accessHours(st))+'</p>'));
  const miss=!st?'选择门店':!chosen?'选择仓位':!valid?'更换仓位':!r.term_confirmed?'选择租期':!s.startDate?'选择用仓日期':null;
  actbar('<div class="qsum"><div class="lab">'+(computed?'预计整期租金':'还需')+'</div><div class="amt'+(computed?'':' muted')+'">'+(computed?money(computed.rent_total):miss)+'</div>'+(computed&&miss?'<div class="lab need">还需'+miss+'</div>':'')+'</div><button type="button" class="btn primary'+(miss?' disabled':'')+'"'+(miss?' disabled aria-disabled="true"':'')+' data-action="next">下一步：确认订单</button>');
  /* overlays */
  const ovr=document.getElementById('overlay-root');
  /* W14 D-127：overlay=city 打开全站唯一的「用仓位置」面板（pages/w14.js），原城市选择层退役 */
  if(ov==='store')ovr.append(sheet('更换门店','<div class="list">'+F.stores.filter(x=>x.city===s.city&&x.status==='open').slice(0,8).map(x=>{const n=F.units.filter(u=>u.store_id===x.id&&core.available(u)).length,avg=W7.storeFromText(x,core);return cmpRow(x.name,[kmText(x),'存取 '+accessHours(x),n?'可租 '+n+' 个':'暂无可租'].filter(Boolean).join(' · '),avg==null?'':'¥'+avg+'<small>/m³/月起</small>',x.id===qs.storeId);}).join('')+'</div>'));
  if(ov==='unit'){if(!qs.storeId)toast('请先选择门店');else{const auto=!core.validCapacity(r.capacity_m3)||(Number.isFinite(qs.autoCapacity)&&Number(qs.autoCapacity)===Number(r.capacity_m3));const singles=auto?F.units.filter(u=>u.store_id===qs.storeId&&core.available(u)):core.matchingUnits(qs.storeId);const combos=core.combinations(qs.storeId);ovr.append(sheet('选择仓位','<div class="list">'+singles.map(u=>cmpRow(displayUnitName(u),u.dimensions,'¥'+fmtNum(unitPublicMonthly(core,u))+'<small>/月起</small>',qs.ids.length===1&&qs.ids[0]===u.id)).join('')+combos.map(c=>cmpRow(c.volume+'m³ · '+c.ids.length+'间组合',c.ids.map(id=>unitById(id)?.demo_cabin_no||'').filter(Boolean).join(' + '),'',false)).join('')+(!singles.length&&!combos.length?'<p class="note">本店暂无满足容量的可用仓位。</p>'+optRow('查看其他匹配门店'):'')+'</div>'));}}
  if(ov==='terms'){const P=W7.TERM_PRESETS,other=term&&!P.includes(term);ovr.append(sheet('其他租期（1–60个月）','<div class="termpanel"><div class="custom"><span class="stepper" role="group" aria-label="其他租期"><button type="button" data-action="termMinus" aria-label="减少一个月">−</button><output>'+(other?term:18)+'个月</output><button type="button" data-action="termPlus" aria-label="增加一个月">＋</button></span><span class="fine">'+esc(W7.termDiscount(other?term:18))+'</span></div></div>','<div class="acts"><button type="button" class="btn primary" data-action="customTerm">确认租期</button></div>'));}
  if(ov==='fees'){if(!chosen)toast('请选择仓位');else if(!r.term_confirmed)toast('请选择租期');else ovr.append(sheet('费用明细',feeListHtml(core.formalAmounts(qs.ids,r.term_months),r.term_months,core,{compact:true,ids:qs.ids}),'<div class="acts"><button type="button" class="btn primary">知道了</button></div>'));}
  window.__W3={page:'QUICK',state:key,city:s.city,store:qs.storeId,carried,ids:qs.ids,autoCapacity:qs.autoCapacity,requirement:r,valid,miss,startDate:s.startDate||null,amounts:computed?{rent_total:computed.rent_total,monthly:computed.monthly_average,payable:computed.payable}:null,publicMonthly:chosen?rows.reduce((n,u)=>n+unitPublicMonthly(core,u),0):null,authorized:core.authorized()};
}

/* ======================= BOOKING (+advisor / business 预设) ======================= */
/* PORT br04/bridge.js renderReserve / reserveChoice / submitLead + lead-flow.js (real MK_LEAD_FLOW, real demo-core saveLead / saveAdvisorLead)
   W7-D：一个线索表单三种预设 ?mode=booking|advisor|business（字段同构，R-A-12）；受理文案 MK_W7.LEAD_COPY（D-95 / D-106）；
   预约只是线索（D-89）；?store=<id> 带入门店上下文（R-B-28）；容量 / 租期用统一组件（R-B-21 / 29）；成功唯一落点「预约用仓」 */
const FILLED={address:'北京市朝阳区安贞西里三区 12 号楼',phone:'13800138000',start_hint:'尽快',items:'日常物品',note:''};
const BOOKING_STATES={empty:{scenario:'noDemand',v:{}},filled:{scenario:'normal',v:FILLED},advisor:{scenario:'normal',advisor:true,v:{phone:'13800138000'}},error:{scenario:'normal',v:{},submit:true},submitting:{scenario:'normal',v:FILLED,status:'SUBMITTING'},failed:{scenario:'normal',v:FILLED,submit:true,flow:'fail_once'},success:{scenario:'normal',v:FILLED,submit:true},success_advisor:{scenario:'normal',advisor:true,v:{phone:'13800138000'},submit:true},
  business:{scenario:'normal',mode:'business',v:{phone:'13800138000'}},store:{scenario:'normal',v:FILLED,store:'SIM_BJ01'},carried:{scenario:'normal',v:{...FILLED,capacity_hint:'3.5m³'}},carried_area:{scenario:'normal',v:FILLED,area:2,areaCap:4.8},large:{scenario:'normal',v:{...FILLED,capacity_hint:'30m³ 及以上',term_hint:'12个月'}},success_offhours:{scenario:'normal',v:FILLED,submit:true,offhours:true},success_store:{scenario:'normal',v:FILLED,store:'SIM_BJ01',submit:true}};
const BOOKING_MODES={booking:{kind:'booking',title:'预约用仓',h1:'告诉我们您的用仓需求',p:W7.LEAD_COPY.notLock,submit:'预约用仓'},advisor:{kind:'advisor',title:'顾问咨询',h1:'告诉我们您的用仓需求',p:'留下联系电话，顾问来电了解需求并给出方案',submit:'提交咨询需求'},business:{kind:'advisor',title:'企业用仓咨询',h1:'告诉我们企业的用仓需求',p:'多仓、长期或需要开票，由顾问按企业需求配仓',submit:'提交咨询需求'}};
const RESERVE_OPTIONS={items:['日常物品','搬家家具','文件资料','暂不确定'],capacity:['1m³','3m³','8m³','15m³','30m³ 及以上','暂不确定'],duration:[...W7.TERM_PRESETS.map(m=>m+'个月'),'暂不确定']};
const RESERVE_NAMES={items:'存放物品',capacity:'意向容量',duration:'预计租期'};
const CODES={ENTER_PHONE:'请填写有效联系电话',ENTER_ADDRESS:'请填写用仓位置（不超过120字）'};
async function renderBOOKING(){
  const key=q.get('state')||'empty',cfg=BOOKING_STATES[key];if(!cfg)return unknown(key,BOOKING_STATES);
  const pm=q.get('mode'),mode=cfg.mode||(cfg.advisor?'advisor':BOOKING_MODES[pm]?pm:'booking'),M=BOOKING_MODES[mode],advisor=M.kind==='advisor';
  document.body.dataset.state=key;document.body.dataset.mode=mode;
  let core=makeCore();core.setScenario(cfg.scenario);
  if(cfg.area){const st1=core.state();Object.assign(st1.requirement,{input_unit:'m2',input_value:cfg.area,capacity_m3:cfg.areaCap});core=makeCore(st1);} /* W26：㎡ 需求带入 */
  const s=core.state(),rq=s.requirement,rqArea=rq.input_unit==='m2'&&Number(rq.input_value)>0;
  const pStore=cfg.store||q.get('store'),store=pStore?storeById(pStore):null;
  const v={address:'',phone:'',start_hint:'',preferred_date:'',items:'',capacity_hint:s.requirement.capacity_m3?(rqArea?rq.input_value+'㎡ · 约'+rq.capacity_m3+'m³':s.requirement.capacity_m3+'m³'):'',term_hint:s.requirement.term_confirmed?s.requirement.term_months+'个月':'',note:'',...cfg.v};
  const packet={status:'EDITING'};
  const flow=window.MK_LEAD_FLOW.create({core,kind:M.kind,packet,persist:()=>{},onChange:()=>{},delay:10});
  if(cfg.flow)flow.scenario(cfg.flow);
  let err=null;
  if(cfg.submit){try{await flow.submit(v);}catch(e){err=e.message;}}
  if(cfg.status)packet.status=cfg.status;
  const receipt=packet.status==='SUCCESS'?packet.result:null;
  document.getElementById('tb-title').textContent=M.title;
  const body=document.getElementById('body'),screen=document.getElementById('screen');
  const storeCard=store?'<section class="card bk-store" aria-label="意向门店"><div class="pick"><img class="ph" src="'+photoOf(store)+'" alt="门店场景示意"><div><div class="n">'+esc(store.name)+'</div><div class="s">'+esc((kmText(store)?kmText(store)+' · ':'')+store.address)+'</div></div><span class="tag">意向门店</span></div></section>':'';
  if(receipt){
    screen.classList.remove('has-actbar');
    const off=!!cfg.offhours||q.get('offhours')==='1'; /* 演示统一用服务时段内文案；&offhours=1 / success_offhours 为非服务时段变体 */
    body.append(el('<section class="result" role="status" aria-live="polite"><div class="ic">'+ico('i-check')+'</div><h4>已提交</h4><p class="ack">'+esc(off?W7.LEAD_COPY.offHours:W7.LEAD_COPY.inHours)+'</p><p class="fine">'+(off?esc(W7.LEAD_COPY.hoursNote)+(mode==='booking'?'<br>':''):'')+(mode==='booking'?esc(W7.LEAD_COPY.notLock):'')+'</p><span class="oid">需求编号 '+esc((String(receipt.id).match(/\d+/g)||['']).pop().padStart(4,'0'))+'</span><div class="acts"><button type="button" class="btn secondary" data-action="myNeeds" data-href="'+NEEDS_URL+'">查看预约记录</button><button type="button" class="btn neutral" data-action="find" data-href="s01.html">继续找仓</button></div></section>'));
    body.append(el('<section class="card" style="margin:16px 16px 0" aria-label="已提交的信息"><div class="sec-title">已提交的信息</div><div class="kvlist" style="padding:0">'+[...(store?[['意向门店',store.name]]:[]),['用仓位置',receipt.address||'—'],['联系电话',receipt.phone],['预计用仓时间',receipt.preferred_date||receipt.start_hint||'—'],['存放物品',receipt.items||'—'],['意向容量',receipt.capacity_hint||'—'],['预计租期',receipt.term_hint||'—']].map(([k,x])=>'<div class="kv"><span class="k">'+k+'</span><span class="v">'+esc(x)+'</span></div>').join('')+'</div></section>'));
    window.__W3={page:'BOOKING',state:key,mode,advisor,offhours:off,status:packet.status,lead:[receipt.id,receipt.type],store:store?.id||null};return;
  }
  const addrErr=err==='ENTER_ADDRESS'||(err==='ENTER_PHONE'&&!advisor&&!v.address.trim()),phoneErr=err==='ENTER_PHONE';
  if(['FAILED_RETRYABLE','UNKNOWN_RESULT','STORAGE_ERROR'].includes(packet.status))body.append(el('<section class="card notice err lead-status" role="status" style="margin-top:12px"><div style="min-width:0"><div class="t">'+(packet.status==='UNKNOWN_RESULT'?'提交结果暂未确认':'暂时无法提交')+'</div><div class="s">'+esc(window.MK_LEAD_FLOW.messages[packet.status])+'</div></div><button type="button" class="btn secondary md" data-action="retry">'+(packet.status==='UNKNOWN_RESULT'?'核对提交结果':'重试提交')+'</button></section>'));
  body.append(el('<div class="ptitle"><h1>'+esc(M.h1)+'</h1><p>'+esc(M.p)+'</p></div>'));
  if(mode==='business')body.append(el('<p class="fine" style="padding:8px 16px 0">需要填写完整企业资料？<button type="button" class="inlinelink" data-action="business" data-href="business.html">前往企业用仓需求'+ico('i-chev','ico sm')+'</button></p>'));
  const f=el('<form class="stack" style="padding:16px 16px 0;gap:24px" novalidate></form>');body.append(f);
  if(storeCard)f.append(el(storeCard));
  f.append(el('<div class="field"><div class="flabel" style="margin:0">用仓位置'+(advisor?'<span class="opt">（选填）</span>':'<span class="req">*</span>')+'</div><div class="input'+(addrErr?' err':'')+'" role="textbox" aria-label="用仓位置"><span class="ph'+(v.address?' filled':'')+'">'+esc(v.address||'填写用仓位置，如：小区、街道和楼栋')+'</span></div>'+(addrErr?'<div class="errtext">'+CODES.ENTER_ADDRESS+'</div>':'')+'<div class="help row"><span>'+(advisor?'联系电话必填；用仓位置和以下信息可选。':'用仓位置、联系电话必填；其他信息可选。')+'</span><button type="button" class="btn text" data-action="locate">'+ico('i-locate','ico sm')+'使用当前位置</button></div></div>'));
  f.append(el('<div class="field"><div class="flabel" style="margin:0">联系电话<span class="req">*</span></div><div class="input'+(phoneErr?' err':'')+'" role="textbox" aria-label="联系电话"><span class="ph'+(v.phone?' filled':'')+'">'+esc(v.phone?v.phone.replace(/(\d{3})(\d{4})(\d{4})/,'$1 $2 $3'):'请输入手机号')+'</span></div>'+(phoneErr?'<div class="errtext">'+CODES.ENTER_PHONE+'</div>':'')+'</div>'));
  f.append(el('<div class="field"><div class="flabel" style="margin:0">预计用仓时间<span class="opt">（可选）</span></div><div class="chips inline" style="padding-top:0" role="group" aria-label="预计用仓时间">'+['尽快','明天','近一周','暂不确定'].map(t=>chip(t,v.start_hint===t&&!v.preferred_date,'hint',t)).join('')+'</div><button type="button" class="input" style="width:100%;margin-top:4px" data-action="date" aria-label="选择具体日期">'+ico('i-cal','ico sm')+'<span class="ph'+(v.preferred_date?' filled':'')+'">'+esc(v.preferred_date||'选择日期')+'</span>'+ico('i-chev','ico sm')+'</button></div>'));
  const capNum=parseFloat((String(v.capacity_hint).match(/约\s*([\d.]+)\s*m³/)||[])[1]??v.capacity_hint),salesCap=/以上/.test(v.capacity_hint)||(Number.isFinite(capNum)&&W7.salesOnly(capNum));
  f.append(el('<div class="field"><div class="flabel" style="margin:0">用仓需求<span class="opt">（可选）</span></div><section class="card" style="padding:0 16px">'+[['items','i-user',v.items],['capacity','i-cube',v.capacity_hint],['duration','i-cal',v.term_hint]].map(([k,i,val])=>'<button type="button" class="lrow" data-action="choice" data-value="'+k+'">'+ico(i,'ico lead')+'<span class="k">'+RESERVE_NAMES[k]+'</span><span class="v'+(val?'':' ph')+'">'+esc(val||'请选择')+'</span>'+ico('i-chev','ico chev')+'</button>').join('')+'</section>'+(salesCap?'<div class="help">'+W7.SALES_CAP_M3+'m³ 及以上由顾问为您配仓。</div>':'')+'</div>'));
  f.append(el('<div class="field"><div class="flabel" style="margin:0">'+ico('i-note','ico sm')+'<span style="flex:1;margin-left:-2px">其他需求或备注</span></div><div class="input tall" role="textbox" aria-label="其他需求或备注"><span class="ph'+(v.note?' filled':'')+'" style="white-space:normal">'+esc(v.note||'例如：搬运需求、特殊物品、预算范围等...')+'</span><span class="count">'+v.note.length+'/200</span></div></div>'));
  body.append(el('<p class="paynote" style="margin-top:16px">提交后'+esc(W7.LEAD_COPY.inHours)+'，暂不产生订单</p>'));
  const busy=packet.status==='SUBMITTING';
  actbar('<button type="button" class="btn primary block'+(busy?' loading':'')+'" data-action="submit"'+(busy?' aria-busy="true"':'')+'>'+(busy?'<span class="spin"></span>正在提交':M.submit)+'</button>');
  if(err)toast(CODES[err]||'请检查已填写的信息');
  const ov=q.get('overlay'),ovr=document.getElementById('overlay-root');
  if(ov==='items')ovr.append(sheet(RESERVE_NAMES.items,RESERVE_OPTIONS.items.map(x=>optRow(x,x===v.items)).join('')));
  if(ov==='capacity'){const quickHit=RESERVE_OPTIONS.capacity.includes(v.capacity_hint),num=Number.isFinite(capNum)&&!/以上/.test(v.capacity_hint)?String(capNum):'';
    ovr.append(sheet(RESERVE_NAMES.capacity,'<div class="cappick"><div class="input" role="textbox" aria-label="意向容量"><span class="ph'+(num?' filled':'')+'">'+esc(num||'输入容量，如 3.5')+'</span><span class="unitseg" role="group" aria-label="空间输入单位"><button type="button" class="on" aria-pressed="true">m³</button><button type="button" aria-pressed="false">㎡</button></span></div><div class="chips inline soft" role="group" aria-label="常用容量">'+RESERVE_OPTIONS.capacity.map(x=>chip(x,x===v.capacity_hint,'capacity',x)).join('')+'</div><div class="note">'+EST_NOTE+'；'+W7.SALES_CAP_M3+'m³ 及以上由顾问配仓。</div></div>','<div class="acts"><button type="button" class="btn neutral">取消</button><button type="button" class="btn primary">确定</button></div>'));}
  if(ov==='duration'){const t=parseInt(v.term_hint,10);ovr.append(sheet(RESERVE_NAMES.duration,termPick(Number.isInteger(t)?t:null,{soft:true,unsure:v.term_hint==='暂不确定'}),'<div class="acts"><button type="button" class="btn neutral">取消</button><button type="button" class="btn primary">确定</button></div>'));}
  if(ov==='date')ovr.append(sheet('选择预计用仓日期',''+[0,1,2,3,6].map(d=>{const dt=new Date(Date.now()+8*3600*1000+d*86400000).toISOString().slice(0,10);return optRow(dt,v.preferred_date===dt);}).join(''),'<div class="acts"><button type="button" class="btn neutral">取消</button><button type="button" class="btn primary">确定</button></div>'));
  window.__W3={page:'BOOKING',state:key,mode,advisor,status:packet.status,err,values:v,store:store?.id||null,salesCap};
}
try{if(PAGE==='CAP')renderCAP();else if(PAGE==='ITEMS')renderITEMS();else if(PAGE==='QUICK')renderQUICK();else if(PAGE==='BOOKING')renderBOOKING().catch(e=>{console.error(e);document.body.prepend(el('<p style="padding:16px;color:#B42318">渲染失败：'+esc(e.message)+'</p>'));});}
catch(e){console.error(e);document.body.prepend(el('<p style="padding:16px;color:#B42318">渲染失败：'+esc(e.message)+'</p>'));}
})();
