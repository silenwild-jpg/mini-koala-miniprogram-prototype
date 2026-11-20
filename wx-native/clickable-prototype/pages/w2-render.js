/* VIS-REDESIGN-01A · W2 binder · 2026-11-17
 * Thin data binder for S02 / S5 / O01 (+ OVL-3/4/5). Builds page state through the UNMODIFIED runtime
 * modules in ../runtime/ (fixtures / demo-core / presentation-policy / br03-policy / recommendation-policy …)
 * and writes the view model into the editable HTML. No copy, field, price or ranking rule is invented here;
 * everything that had to be ported from DOM-coupled files (app.js candidateList / s5CandidateList /
 * s02Situation / s02AccessHours / category; br04/bridge.js s5MatchState / s5AdvisorNeeded / rentFormula /
 * displayUnitName) is marked PORT and registered as D-45 (implementation must use the originals).
 * Public prices use the 7–12 month tier (factor 0.65) = fixture.pricing.homeReferenceTerm (WP04 v1.1 D-10a / D-23). */
(function(){
'use strict';
const F=window.SIM_FIXTURES,q=new URLSearchParams(location.search),PAGE=document.body.dataset.page;
const PUBLIC_TERM=Number(F.pricing.homeReferenceTerm)||12;
const PHONE='13800138000',UNIT='SIM_BJ01_U03',STORE='SIM_BJ01';
const money=n=>'¥'+Math.trunc(Number(n)).toLocaleString('zh-CN');
const fmtNum=n=>Math.trunc(Number(n)).toLocaleString('zh-CN');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const el=html=>{const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild;};
const ico=(id,cls='ico')=>'<svg class="'+cls+'"><use href="#'+id+'"/></svg>';
const displayedKm=s=>{const n=Number(s?.distance);if(F.distanceVerified)return Number.isFinite(n)&&n>=0?n:NaN;if(!F.synthetic)return NaN;return Number.isFinite(n)&&n>=0?Number((n>8?0.6+n*0.16:n).toFixed(1)):NaN;};
const kmText=s=>{const k=displayedKm(s);return Number.isFinite(k)?k.toFixed(1)+'km':'';};
const photoOf=s=>'../assets/'+s.photo;
const heroOf=s=>'../assets/'+(s.photoDetail||s.photo);
const storeById=id=>F.stores.find(s=>s.id===id);
const unitById=id=>F.units.find(u=>u.id===id);
const thumb=u=>{const n=Number(u?.volume)||0;return '../assets/unit-r3/unit-r3-'+(n<=1.5?'mini':n<=5?'small':n<=15?'medium':'large')+'-336x312.webp';};
const category=u=>u.volume<=1.5?'迷你仓':u.volume<=5?'小型仓':u.volume<=10?'中型仓':'大型仓'; /* PORT app.js */
const CATEGORIES=['全部','迷你仓','小型仓','中型仓','大型仓'];
const tomorrow=()=>new Date(Date.now()+8*3600*1000+86400000).toISOString().slice(0,10);
function makeCore(state){return window.SIM_CORE.create(state?{state}:{});}
function policies(core){const P=window.SIM_BR03_POLICY.create({core,fixture:F,config:window.SIM_BR03_DATA});const pres=window.SIM_PRESENTATION.create({core,fixture:F,unitPolicy:P});return {P,pres};}
const termRule=m=>F.pricing.termRules.find(x=>m>=x.min&&m<=x.max);
const tagsHtml=list=>list.map(t=>'<span class="tag'+(t.type==='promotion'?' promo':'')+'">'+esc(t.label)+'</span>').join('');
const priceHtml=(num,unit,tag)=>'<div class="price"><span class="cur">¥</span><span class="num">'+esc(num)+'</span>'+(unit?'<span class="unit">'+esc(unit)+'</span>':'')+(tag||'')+'</div>';
/* 起价型（浏览态，每仓）：该仓在 PUBLIC_TERM 档（0.65）下的月租 */
const unitPublicMonthly=(core,u)=>W7.unitFromMonthly(core,u); /* W20 D-146 */
/* 整期型：整期租金主 + 折扣标签 + 月租次（bridge.js rentFormula 口径：仅当 月租×N = 整期 时带 × N个月） */
function discTag(a,months){if(a.campaign_ids?.length)return '<span class="tag promo">特价仓</span>';const f=Number(termRule(months)?.factor);return Number.isFinite(f)&&f>0&&f<1&&a.term_factor===f?'<span class="tag disc">'+Number((f*10).toFixed(1))+'折</span>':'';}
function rentFormula(a,months){const m=Number(a?.monthly_average),t=Number(a?.rent_total);if(!Number.isFinite(m)||!Number.isInteger(months))return '';return money(m)+'/月'+(Math.abs(m*months-t)<.011?' × '+months+'个月':'');} /* PORT bridge.js */
const termPriceHtml=(a,months)=>priceHtml(fmtNum(a.monthly_average),'/月',discTag(a,months))+'<div class="price-sec">整期 '+money(a.rent_total)+' · '+months+'个月'+(a.full_reduction>0?' · 满额减 '+money(a.full_reduction):'')+'</div>'; /* W21 D-162 */
const startPriceHtml=m=>priceHtml(fmtNum(m),'/月起');
/* W26（B14）：未登录时 w9-auth.js lockPrices() 把仓位行价格统一换成门店级「¥XX/m³/月起」，同店各仓数字相同。
   这里在它之后把仓位行改回各仓自己的「¥X/月起」（D-146 / D-147 口径），按钮仍是「查看报价」。代码侧直接在未登录分支渲染各仓起价即可，不需要这一步。 */
const LOCK_AUTH=['locked','phone','phone_agree','phone_wx','phone_loading','phone_fail','phone_denied','sms','sms_sent','sms_wrong','sms_expired','sms_sendfail','phone_conflict'].includes(q.get('auth'));
const sumFrom=(core,ids)=>ids.reduce((n,id)=>n+W7.unitFromMonthly(core,unitById(id)),0);
function unlockRowPrices(core){if(!LOCK_AUTH)return;const run=()=>{
  document.querySelectorAll('.urow[data-unit]').forEach(row=>{const box=row.querySelector('.foot')?.firstElementChild;if(box?.querySelector('.price'))box.innerHTML=startPriceHtml(sumFrom(core,[row.dataset.unit]));});
  document.querySelectorAll('.combo[data-units]').forEach(c=>{const p=c.querySelector('.foot .price');if(p)p.outerHTML=startPriceHtml(sumFrom(core,c.dataset.units.split(',')));});
  document.querySelectorAll('.s5card .unit[data-ids]').forEach(l=>{const box=l.nextElementSibling?.firstElementChild;if(box?.querySelector('.price'))box.innerHTML=startPriceHtml(sumFrom(core,l.dataset.ids.split(',')));l.querySelectorAll('span').forEach(x=>{if(/，每月多 ¥[\d,]+$/.test(x.textContent))x.textContent=x.textContent.replace(/，每月多 ¥[\d,]+$/,'');});}); /* 未登录不露出按租期算的月差额 */};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else setTimeout(run,0);} /* 等后面的 w9-auth.js 执行完 */
const displayUnitName=u=>{const name=String(u?.name||'').trim(),cabin=String(u?.demo_cabin_no||'').trim();if(!cabin)return name;const d=name.replace(/^[A-D]\d{1,3}(?=\s|[·•])/,'').replace(/^[\s·•]+/,'').trim();return cabin+(d?' · '+d.replace(/独立仓$/,''):'');}; /* W20 C-11 */ /* PORT bridge.js */
function sheet(title,inner,extra=''){return el('<div class="scrim" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><div class="sheet"><div class="grab"></div><h4>'+esc(title)+'</h4>'+inner+extra+'</div></div>');}
const SVC_ICON={'近地铁':'i-train','24小时存取':'i-clock','24小时开放':'i-clock','电梯直达':'i-elev','停车便利':'i-car','停车方便':'i-car','控温防潮':'i-temp','小推车':'i-cart','到店搬运':'i-truck','装卸区域':'i-truck','全天监控':'i-cam','独立安防':'i-shield','顾问协助':'i-user'};

/* ---------- PORT app.js: storeOffer / candidateList / s5CandidateList (D-45) ---------- */
function offers(core){
  const st=core.state(),r=st.requirement,REC=window.SIM_REC_POLICY,term=r.term_months||1;
  const storeOffer=s=>{const single=core.matchingUnits(s.id).sort((a,b)=>core.amounts([a.id],term).rent_total-core.amounts([b.id],term).rent_total)[0];return single?[single.id]:core.combinations(s.id)[0]?.ids;};
  const referenceCost=ids=>ids.reduce((t,id)=>t+(st.prices[id]??unitById(id)?.base_month??0),0);
  const recCost=ids=>r.term_confirmed?core.amounts(ids,r.term_months).rent_total:referenceCost(ids);
  const storeAmount=s=>{const ids=storeOffer(s);return ids?core.amounts(ids,term).rent_total:Infinity;};
  function candidateList(excludeStore){
    const rows=[];F.stores.filter(s=>s.city===st.city&&s.status==='open'&&s.id!==excludeStore).forEach(s=>{const ids=storeOffer(s);if(ids?.length)rows.push({store:s,ids,volume:ids.reduce((n,id)=>n+(unitById(id)?.volume||0),0),combo:ids.length>1});});
    return REC.rank(rows.sort((a,b)=>(a.volume-(r.capacity_m3||0))-(b.volume-(r.capacity_m3||0))||storeAmount(a.store)-storeAmount(b.store)),{distanceVerified:F.distanceVerified||F.stores.filter(s=>s.city===st.city&&s.status==='open').every(s=>Number.isFinite(s.distance)&&s.distance>=0),costOf:row=>recCost(row.ids)}).items;
  }
  function s5CandidateList(preferredDistrict=''){
    const need=Number(r.capacity_m3);if(!(need>0)||!r.term_confirmed)return [];
    const allExact=candidateList();
    const localExact=preferredDistrict?allExact.filter(row=>row.store.district===preferredDistrict):[];
    const exact=localExact.length?REC.rank(localExact,{distanceVerified:true,costOf:row=>recCost(row.ids)}).items.concat(allExact.filter(row=>row.store.district!==preferredDistrict)):allExact;
    if(exact.length){const distances=exact.map(row=>row.store.distance);const expanded=distances.length>0&&distances.every(km=>Number.isFinite(km)&&km>3);return exact.map(row=>({...row,expandedSearch:expanded,distanceDemo:!F.distanceVerified}));}
    const near=F.stores.filter(s=>s.city===st.city&&s.status==='open').flatMap(s=>{const units=F.units.filter(u=>u.store_id===s.id&&core.available(u)&&u.volume<need);const rows=units.filter(u=>u.volume>=need*0.8).map(u=>({store:s,ids:[u.id],volume:u.volume,combo:false,nearCapacity:true}));
      for(let i=0;i<units.length;i++)for(let j=i+1;j<units.length;j++){const volume=Number((units[i].volume+units[j].volume).toFixed(3));if(volume<need&&volume>=need*0.8)rows.push({store:s,ids:[units[i].id,units[j].id],volume,combo:true,nearCapacity:true});}
      return rows.sort((a,b)=>b.volume-a.volume).slice(0,1);});
    return near.sort((a,b)=>(preferredDistrict&&a.store.district===preferredDistrict?-1:0)-(preferredDistrict&&b.store.district===preferredDistrict?-1:0)||b.volume-a.volume||Number(a.store.distance??Infinity)-Number(b.store.distance??Infinity)||core.amounts(a.ids,r.term_months).rent_total-core.amounts(b.ids,r.term_months).rent_total).slice(0,2);
  }
  return {storeOffer,candidateList,s5CandidateList,recCost};
}
/* PORT app.js s02AccessHours / s02Situation (D-45) */
function accessHours(s){if(s.access_hours)return s.access_hours;let h=2166136261;for(const c of String(s.id)){h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;}return ['24小时','09:00-21:00','08:00-23:00'][h%3];}
/* ---------- W7 (FIND)：设计侧判定改用 model/w7-rules.js（D-97 / D-99 / D-101）；代码侧同步见 DEV_HANDOFF v2 ---------- */
const W7=window.MK_W7;
/* D-101：≥30m³ → large（不出自助匹配，交销售），取消 50；D-99：接近 = 比需求小 ≤20% */
function s5MatchState(core,rows,r){const need=Number(r.capacity_m3);if(W7.salesOnly(need))return 'large';if(!rows.length)return 'none';const first=rows[0];if(W7.fit(first.volume,need).state==='near')return 'near';if(first.combo)return 'combo';if(first.expandedSearch===true)return 'expanded';return 'matched';}
/* D-97：容量 >15m³ 或 整期租金 >¥3,000 */
function advisorNeeded(core,r,ids){let rent=0;try{if(ids?.length&&r.term_confirmed)rent=Number(core.amounts(ids,r.term_months)?.rent_total)||0;}catch{rent=0;}return W7.advisorNeeded(r.capacity_m3,rent);}
function s02Situation(core,s){const r=core.state().requirement,units=F.units.filter(u=>u.store_id===s.id),available=units.filter(u=>core.available(u));if(!available.length)return 'soldout';if(!core.requirementReady())return 'browse';if(W7.salesOnly(r.capacity_m3))return 'sales';if(available.some(u=>u.volume>=r.capacity_m3))return 'matched';if(core.combinations(s.id).length)return 'combo';const largest=Math.max(...available.map(u=>Number(u.volume)||0));return W7.fit(largest,r.capacity_m3).state==='near'?'near':'nomatch';}
const ADVISOR_URL='booking.html?mode=advisor',TRANSPORT_URL='acc.html?view=transport',ESTORE_URL='estore.html';
const legalUrl=doc=>'agreement.html?doc='+doc,C=window.MK_CONTRACT;
/* 契约 §2：顾问卡一页一次、放在列表之后、不拦截下单 */
function bigDeal(core,r,ids){let rent=0;try{if(ids?.length&&r.term_confirmed)rent=Number(core.amounts(ids,r.term_months)?.rent_total)||0;}catch{rent=0;}return W7.bigDeal(r.capacity_m3,rent);}
const advisorCard=big=>el('<div class="card advisor" data-w7="advisor" data-big="'+(big?1:0)+'"><div><div class="t">'+W7.advisorCopy(big).t+'</div><div class="s">'+W7.advisorCopy(big).s+'</div></div><a class="btn secondary md" href="'+ADVISOR_URL+'" data-action="advisor">预约顾问</a></div>');
/* 契约 §2：无需求 = 门店均价（体积加权 · 全部仓位 · 0.65 档），不带「起」 */
const avgHtml=(s,core)=>W7.fromPriceHtml(s,core,'weak'); /* W17 D-138 / D-140：标题右侧弱化显示 ¥XX/m³/月起 */
const fitTag=(vol,need)=>{const f=W7.fit(vol,need);return f.state==='near'?'<span class="tag warn">'+esc(f.text)+'</span>':'';};
/* shared: E存 service card (same component as S01 slot 3) */
const estoreCard=(sub)=>el('<a class="card ecard" href="'+ESTORE_URL+'"><div><div class="k">另一种存储方式</div><div class="t">考拉E存</div>'+(sub?'<div class="sub">'+esc(sub)+'</div>':'')+'<div class="a">了解考拉E存 ›</div></div><img src="../assets/mini_split.jpg" alt="考拉E存上门取送服务"></a>');
const emptyState=(title,sub,acts)=>el('<section class="card empty" role="status"><div class="pic">'+ico('i-box')+'</div><h4>'+esc(title)+'</h4>'+(sub?'<p>'+esc(sub)+'</p>':'')+'<div class="acts">'+acts+'</div></section>');
/* 契约 §3：统一租期 / 容量输入 */
function termPick(months){const h=W7.termHint(months);return '<div class="termpick">'+W7.termSeg(months)+(h?'<div class="note nudge">'+esc(h)+'</div>':'')+'</div>';} /* W21 D-159 */ /* W17 D-141 */
function capPick(v,unit){const m2=unit==='m2',H=window.MK_VOLUME_MODEL?window.MK_VOLUME_MODEL.LAYER_HEIGHT_M:2.4;
  const u=(label,on,val)=>'<button type="button" class="chipwrap" aria-pressed="'+on+'" data-action="capUnit" data-value="'+val+'"><span class="chip'+(on?' on':'')+'">'+label+'</span></button>';
  return '<div class="cappick"><div class="caprow"><div class="input focus"><span class="val">'+(v??'')+'</span><span class="suffix">'+(m2?'㎡':'m³')+'</span></div><div class="chips" role="group" aria-label="单位">'+u('m³',!m2,'m3')+u('㎡',m2,'m2')+'</div></div>'+(m2&&v?'<div class="conv">约 '+(+(v*H).toFixed(1))+' m³</div>':'')+'<div class="note">'+'可填 0.5m³–200㎡'+'，估算值，以实际仓位为准</div></div>';}
function demandOverlay(r,title,cold){return sheet(title,'<div class="field"><label>预计容量</label>'+(r.input_unit==='m2'?capPick(r.input_value,'m2'):capPick(r.capacity_m3,'m3'))+(cold?'<a class="btn text sm estlink" href="cap.html" data-action="estimate">不确定大小？去估算 '+ico('i-chev','ico sm')+'</a>':'')+'</div><div class="field"><label>租期</label>'+termPick(cold?W7.TERM_DEFAULT:r.term_months)+'</div><div class="acts"><button type="button" class="btn neutral">取消</button><button type="button" class="btn primary">'+(r.capacity_m3?'更新推荐':'查看推荐')+'</button></div>');}

/* ======================= S02 ======================= */
const S02_STATES={browse:{scenario:'noDemand'},matched:{scenario:'normal'},combo:{scenario:'combo'},near:{scenario:'normal',capacity:9,soldUnits:['SIM_BJ01_U01','SIM_BJ01_U03','SIM_BJ01_U04']} /* D-46 proposed fixture s02Near */,nomatch:{scenario:'noMatch'},soldout:{scenario:'soldout'},filtered:{scenario:'normal',category:'中型仓'},matched_area:{scenario:'normal',capacity:4.8,area:2},services:{scenario:'normal',tab:'服务设施'},route:{scenario:'normal',tab:'到店指引'},
  sales:{scenario:'normal',capacity:35} /* W7 新增：≥30m³ 交销售（D-101） */,advisor:{scenario:'normal',capacity:16,term:12} /* 16m³：大单文案 */,advisor_rent:{scenario:'normal',capacity:3,term:12} /* W26：3.5m³ × 12 个月 = ¥3,120，整期 ≥¥3,000 出顾问卡（普通文案） */};
function renderS02(){
  const key=q.get('state')||'browse',cfg=S02_STATES[key];
  if(!cfg){document.body.prepend(el('<p style="padding:16px;color:#B42318">未知状态 '+esc(key)+'；可用：'+Object.keys(S02_STATES).join(' / ')+'</p>'));return;}
  let core=makeCore();core.setScenario(cfg.scenario);if(cfg.capacity)core.setRequirement(cfg.capacity,cfg.term||6,true);
  if(cfg.area){const st1=core.state();Object.assign(st1.requirement,{input_unit:'m2',input_value:cfg.area});core=makeCore(st1);} /* W17 ㎡ 全流程 */
  if(cfg.soldUnits){const st0=core.state();cfg.soldUnits.forEach(id=>{st0.stock[id]='soldout';});core=makeCore(st0);} /* D-46: state override stands in for the proposed fixture key soldUnits */
  core.setStore(STORE);
  const {P,pres}=policies(core),s=storeById(STORE),st=core.state(),r=st.requirement,linked=core.requirementReady(),tab=cfg.tab||'可选仓位',cat=cfg.category||'全部',situation=s02Situation(core,s);
  document.body.dataset.state=key;document.body.dataset.scenario=cfg.scenario;document.body.dataset.situation=situation;document.body.dataset.tab=tab;
  document.getElementById('hero-img').src=heroOf(s);document.getElementById('hero-img').alt=s.name+'门店环境';
  document.querySelector('#hours span').textContent='存取时间：'+accessHours(s);
  const km=kmText(s);
  /* R-B-12：门店头部无需求显示均价；有需求时价格在仓位行（整期型） */
  document.getElementById('head').append(el('<div><div class="row"><h1 title="'+esc(s.name)+'">'+esc(s.name)+'</h1>'+(!linked&&tab==='可选仓位'?avgHtml(s,core):'')+'<div class="acts icons"><button type="button" class="iconbtn" data-action="s02OpenMap" aria-label="地图导航">'+ico('i-nav')+'</button><a class="iconbtn" href="tel:'+C.t('service.hotline').replace(/-/g,'')+'" aria-label="拨打400客服电话">'+ico('i-phone')+'</a></div></div>'+(tab==='服务设施'?'':'<div class="tags attrs">'+tagsHtml(pres.detailTags(s,5))+'</div>')+'<div class="arrbox"><div class="addr">'+ico('i-pin','ico sm')+'<span class="ellip" title="'+esc(s.address)+'">'+esc(s.address)+'</span>'+(km?'<b>'+km+'</b>':'')+'</div></div></div>'));
  const cap=window.SIM_SPACE_UNIT.demandCapacity(r);
  document.getElementById('dstrip-text').innerHTML=linked?'已选需求：<span class="v">'+esc(cap)+' · '+r.term_months+'个月</span>':'不确定用多大仓？';
  document.getElementById('dstrip-btn').textContent=linked?'修改需求':'立即估算';
  document.querySelectorAll('#tabs button').forEach(b=>{const on=b.dataset.tab===tab;b.classList.toggle('on',on);b.setAttribute('aria-selected',String(on));});
  const content=document.getElementById('content');
  const unitRow=(u,opts={})=>{const f=P.facts(u),d=P.describe(u,'S02').lines[0],avail=f.available,needsMore=avail&&linked&&u.volume<r.capacity_m3,area=window.SIM_SPACE_UNIT.unitAreaSuffix(u),fit=needsMore?W7.fit(u.volume,r.capacity_m3):null;
    /* R-B-12：起价型只用于未选租期的单个仓位行 */
    const price=!avail?'<span class="unavail">已租出</span>':linked?termPriceHtml(core.amounts([u.id],r.term_months),r.term_months):startPriceHtml(unitPublicMonthly(core,u));
    /* R-B-08 / R-B-32：接近（差额 ≤20%）可直接下单并写明差额；更小的仓位给「按 X m³ 重新匹配」 */
    const btn=!avail?'<button type="button" class="btn primary card-cta" disabled>暂不可租</button>':needsMore&&fit.state==='near'?'<button type="button" class="btn secondary card-cta" data-action="choose" data-value="'+esc(u.id)+'">立即下单</button>':needsMore?'<button type="button" class="btn secondary card-cta" data-action="s02EditCapacity" data-value="'+esc(u.id)+'">按 '+esc(u.volume)+'m³ 重新匹配</button>':'<button type="button" class="btn primary card-cta" data-action="choose" data-value="'+esc(u.id)+'">立即下单</button>';
    return '<article class="urow'+(avail?'':' off')+'" data-unit="'+esc(u.id)+'" data-promo-state="'+esc(f.state)+'"'+(fit?' data-fit="'+fit.state+'"':'')+'><img class="ph" src="'+thumb(u)+'" alt="'+esc(u.name)+'空间示意"><div><div class="top"><div class="name">'+esc(u.demo_cabin_no||u.code)+' · '+esc(u.volume)+'m³</div><button type="button" class="fav" data-action="favorite" data-value="'+esc(u.id)+'" aria-label="收藏'+esc(u.name)+'" aria-pressed="false">'+ico('i-heart')+'</button></div><div class="spec">'+esc(u.dimensions)+(area?' · '+esc(area):'')+'</div><div class="fit">'+esc(d)+'</div>'+(fit?.state==='near'?'<div class="fitline">'+fitTag(u.volume,r.capacity_m3)+'</div>':'')+''+'</div><div class="foot"><div>'+price+'</div>'+btn+'</div></article>';};
  const comboCard=x=>{const a=linked?core.amounts(x.ids,r.term_months):null;return '<article class="card combo" data-units="'+esc(x.ids.join(','))+'"><div class="pics">'+x.ids.slice(0,2).map(id=>'<img src="'+thumb(unitById(id))+'" alt="'+esc(unitById(id)?.name||'仓位')+'">').join('')+'</div><div><div class="name">'+esc(x.volume)+'m³<span class="tag info">'+x.ids.length+' 间组合</span></div><div class="fit">一笔订单 · 同一门店 · '+x.ids.map(id=>esc(unitById(id).demo_cabin_no||unitById(id).code)).join(' + ')+'</div></div><div class="foot"><div>'+(a?termPriceHtml(a,r.term_months):startPriceHtml(x.ids.reduce((n,id)=>n+unitPublicMonthly(core,unitById(id)),0)))+'</div><button type="button" class="btn primary card-cta" data-action="choose" data-value="'+esc(x.ids.join(','))+'">立即下单</button></div></article>';};
  /* 顾问入口不再在此重复（一页一次，统一用列表后的顾问卡） */
  const alternatives=()=>{const rows=offers(core).candidateList(s.id).slice(0,3);return '<section class="altlist" aria-label="其他匹配门店和仓位"><div class="gtitle">其他匹配门店和仓位</div>'+(rows.length?rows.map(x=>'<div class="altrow"><div><div class="n">'+esc(x.store.name)+'</div><div class="s">'+esc(x.volume)+'m³'+(x.combo?' · 组合方案':'')+(kmText(x.store)?' · '+kmText(x.store):'')+'</div></div><button type="button" class="btn secondary sm" data-action="store" data-value="'+esc(x.store.id)+'">查看匹配方案</button></div>').join(''):'<p class="gnote">当前城市没有满足容量的可用方案。</p>')+'</section>';};
  let showAdvisor=false;
  if(tab==='服务设施'){
    /* R-B-35：服务设施页列出门店全部设施，不受卡片 5 标签上限 */
    const seen=new Set(),items=[...pres.detailTags(s,99).filter(t=>t.type!=='promotion').map(t=>t.label),...(s.facilities||[]),...(s.serviceTags||[])].filter(l=>l&&!seen.has(l)&&seen.add(l));
    content.append(el('<div><div class="svcgrid">'+items.map(l=>'<div>'+ico(SVC_ICON[l]||'i-check')+esc(l)+'</div>').join('')+'</div><div class="kvlist" style="margin-top:12px"><div class="kv"><span class="k">存取时间</span><span class="v">'+esc(accessHours(s))+'</span></div><div class="kv"><span class="k">所在区域</span><span class="v">'+esc(s.district)+'</span></div></div>'+
      /* D-76：运输 / 搬运下单前可预约，按线索处理 */
      '<a class="card svcentry" href="'+TRANSPORT_URL+'" data-action="transport">'+ico('i-truck')+'<div><div class="t">预约运输 / 搬运</div><div class="s">下单前可预约，由顾问电话确认，不计入本次应付</div></div>'+ico('i-chev','ico sm chev')+'</a></div>'));
  }else if(tab==='到店指引'){
    content.append(el('<div><div class="kvlist"><div class="kv"><span class="k">门店地址</span><span class="v" style="font-weight:400;text-align:right">'+esc(s.address)+'</span></div></div><div class="mapbox" aria-label="门店位置地图" data-store-id="'+esc(s.id)+'" data-geo-candidate="'+Boolean(s.geo?.route_candidate)+'"><div class="grid"></div>'+ico('i-pin','ico pin')+'<span>'+esc(s.name)+'</span></div><div class="modes chips" role="group" aria-label="出行方式">'+[['transit','公交地铁',true],['drive','驾车'],['walk','步行'],['bike','骑行']].map(m=>'<button type="button" class="chipwrap" aria-pressed="'+!!m[2]+'" data-action="s02TravelMode" data-value="'+m[0]+'"><span class="chip'+(m[2]?' on':'')+'">'+(m[2]?ico('i-check','ico sm'):'')+m[1]+'</span></button>').join('')+'</div><div class="routeacts"><button type="button" class="btn secondary block" data-action="s02OpenMap">导航到门店</button></div></div>'));
  }else{
    const catalog=F.units.filter(u=>u.store_id===s.id),visible=catalog.filter(u=>cat==='全部'||category(u)===cat);
    const available=visible.filter(u=>core.available(u)).sort((a,b)=>a.volume-b.volume);
    const matching=linked?available.filter(u=>u.volume>=r.capacity_m3):available,others=linked?available.filter(u=>u.volume<r.capacity_m3).sort((a,b)=>b.volume-a.volume):[],unavailable=visible.filter(u=>!core.available(u));
    const combos=cat==='全部'?core.combinations(s.id):[];
    const chips='<div class="ucats"><div class="chips" role="group" aria-label="仓型筛选">'+CATEGORIES.map(c=>'<button type="button" class="chipwrap" aria-pressed="'+(c===cat)+'" data-action="category" data-value="'+c+'"><span class="chip'+(c===cat?' on':'')+'">'+(c===cat?ico('i-check','ico sm'):'')+c+'</span></button>').join('')+'</div></div>';
    const soldFold=n=>unavailable.length?'<details class="ufold"><summary>查看已租出的仓位'+ico('i-down','ico sm')+'</summary>'+unavailable.slice(0,n).map(unitRow).join('')+'</details>':'';
    let html='';
    if(situation==='sales'){ /* D-101：≥30m³ 不做自助匹配，主操作交顾问 */
      html='<div class="sec" style="margin-top:12px">'+emptyState('30m³ 及以上的需求由顾问为您配仓','提交后'+W7.LEAD_COPY.inHours+'。','<a class="btn primary md" href="'+ADVISOR_URL+'" data-action="advisor">提交给顾问</a><button type="button" class="btn neutral md" data-action="editDemand">修改容量</button>').outerHTML+'</div>';}
    else if(situation==='nomatch'){html=chips+'<div class="sec" style="margin-top:12px">'+emptyState('本店暂无匹配仓位','可查看其他门店的仓位','<button type="button" class="btn primary md" data-action="go" data-value="S01">查看其他门店</button>').outerHTML+'</div>';showAdvisor=true;}
    else if(!catalog.some(u=>core.available(u))){html='<div class="sec" style="margin-top:12px">'+emptyState(s.status==='open'?'本店暂无可租仓位':'本店暂停服务','可查看其他门店的仓位','<button type="button" class="btn primary md" data-action="go" data-value="S01">查看其他门店</button>').outerHTML+'</div>'+alternatives()+'<div class="ulist">'+soldFold(3)+'</div>';}
    else{
      const comboApplicable=linked&&combos.length&&(!matching.length||Number(r.capacity_m3)>10),comboExpanded=comboApplicable&&!matching.length;
      const nearOthers=others.filter(u=>W7.fit(u.volume,r.capacity_m3).state==='near'),smallOthers=others.filter(u=>W7.fit(u.volume,r.capacity_m3).state!=='near');
      html=chips+'<div class="ulist">'+(matching.length?matching.map(unitRow).join(''):linked&&!comboExpanded?'<p class="gnote">本店没有不小于 '+esc(r.capacity_m3)+'m³ 的单个仓位。</p>':'')+
        (comboApplicable&&matching.length?'<div class="more-row"><button type="button" class="btn text sm" data-action="s02ToggleCombos" aria-expanded="false">查看组合仓位 '+ico('i-down','ico sm')+'</button></div>':'')+
        (comboExpanded?'<div class="gtitle">组合方案</div>'+combos.map(comboCard).join(''):'')+
        (nearOthers.length?'<div class="gtitle">容量接近的仓位</div>'+nearOthers.map(unitRow).join(''):'')+
        (smallOthers.length?'<div class="gtitle">比需求小的仓位</div>'+smallOthers.map(unitRow).join(''):'')+
        (!available.length&&!combos.length?'<p class="gnote">当前仓型暂无可租仓位。</p><div class="more-row"><button type="button" class="btn secondary sm" data-action="category" data-value="全部">查看全部仓型</button></div>':'')+
        soldFold(3)+'</div>'+
        (linked&&!matching.length&&!combos.length?alternatives():'');
      if(linked&&!matching.length&&!combos.length)showAdvisor=true;
    }
    content.append(el('<div>'+html+'</div>'));
    const options=F.units.filter(u=>u.store_id===s.id&&core.available(u)&&(!linked||u.volume>=r.capacity_m3)).sort((a,b)=>a.volume-b.volume),chosen=options[0],quoteIds=chosen?[chosen.id]:(core.combinations(s.id)[0]?.ids||[]);
    /* D-97 / W26：顾问卡 = 容量 >15m³ 或 整期租金 ≥¥3,000；一页一次；≥30m³ 时主操作已是「提交给顾问」，不再重复 */
    if(situation!=='sales'&&(showAdvisor||(linked&&advisorNeeded(core,r,quoteIds))))content.append(advisorCard(bigDeal(core,r,quoteIds)));
  }
  if(linked)unlockRowPrices(core);
  window.__W2={page:'S02',state:key,situation,tab,category:cat,requirement:r,store:s.id,publicTerm:PUBLIC_TERM,avgCubic:W7.storeAvgText(s),advisorCard:!!document.querySelector('[data-w7="advisor"]'),units:F.units.filter(u=>u.store_id===s.id).map(u=>[u.demo_cabin_no,u.volume,core.available(u)?(linked?core.amounts([u.id],r.term_months).rent_total:unitPublicMonthly(core,u)):null])};
}

/* ======================= S5 ======================= */
const S5_STATES={matched:{scenario:'normal'},combo:{scenario:'combo'},expanded:{scenario:'noNear'} /* D-46 */,near:{scenario:'normal',capacity:29} /* W7：原 30 现归销售档，改 29 */,none:{scenario:'normal',capacity:22,forceNone:true} /* W7：<30m³ 的无匹配在现有样本数据里不会自然出现，用设计态强制 */,large:{scenario:'normal',capacity:60},advisor:{scenario:'promoLongTerm'},cold:{scenario:'noDemand',overlay:'demand'},loading:{scenario:'normal',skeleton:true},
  sales30:{scenario:'normal',capacity:30} /* W7 新增：边界 30m³（含 30）交销售 */,
  from_items:{scenario:'normal',capacity:3.4,from:'items'},from_area:{scenario:'normal',capacity:4.8,area:2} /* W16：从按物品估算进入，写明估算值与推荐仓位的关系（演示清单 = ITEMS 默认种子：3 箱 + 2 行李箱 + 1 沙发） */};
function renderS5(){
  const key=q.get('state')||'matched',cfg=S5_STATES[key];
  if(!cfg){document.body.prepend(el('<p style="padding:16px;color:#B42318">未知状态 '+esc(key)+'；可用：'+Object.keys(S5_STATES).join(' / ')+'</p>'));return;}
  let core=makeCore();core.setScenario(cfg.scenario);if(cfg.capacity)core.setRequirement(cfg.capacity,6,true);
  if(cfg.area){const st1=core.state();Object.assign(st1.requirement,{input_unit:'m2',input_value:cfg.area});core=makeCore(st1);} /* W17 ㎡ 全流程 */
  const {P,pres}=policies(core),st=core.state(),r=st.requirement,ready=core.requirementReady();
  document.body.dataset.state=key;document.body.dataset.scenario=cfg.scenario;
  document.getElementById('dsum-v').innerHTML=ready?(r.input_unit==='m2'?'<b>'+esc(r.input_value)+'<small>㎡</small></b><span class="conv">约'+esc(r.capacity_m3)+'m³</span>':'<b>'+esc(r.capacity_m3)+'<small>m³</small></b>')+'<i></i><b>'+r.term_months+'<small>个月</small></b>':'<b>—<small>m³</small></b><i></i><b>—<small>个月</small></b>';
  document.getElementById('origin').textContent=st.city+' · 全城门店';
  if(cfg.from==='items')document.querySelector('.dsum').after(el('<p class="estlink">'+ico('i-info','ico sm')+'<span>按物品估算：物品约 2.1m³，留出码放空隙后建议 '+esc(r.capacity_m3)+'m³。下方是不小于 '+esc(r.capacity_m3)+'m³ 的仓位。<br>清单含长件（三人位沙发），请对照仓位的长宽高。</span></p>'));
  const list=document.getElementById('rec-list'),h=document.getElementById('rec-h'),sub=document.getElementById('rec-sub'),nm=document.getElementById('nomatch'),adv=document.getElementById('advisor-slot'),more=document.getElementById('more-row');
  document.getElementById('estore').append(estoreCard('按需存储 · 上门取送'));
  let rows=[],matchState='none',showAdvisor=false;
  /* R-B-17：骨架 / 无匹配 / 交销售 / 冷启动 不显示「查看更多」 */
  const hideMore=()=>{more.style.display='none';};
  if(cfg.skeleton){hideMore();document.body.setAttribute('aria-busy','true');h.textContent='为您推荐门店';sub.textContent='正在按容量与租期匹配';for(let i=0;i<2;i++)list.append(el('<div class="card scard" aria-hidden="true"><div class="ph sk"></div><div><div class="sk" style="height:18px;width:55%"></div><div class="sk" style="height:12px;width:85%;margin-top:8px"></div><div class="sk" style="height:20px;width:40%;margin-top:8px"></div></div><div class="foot"><div class="sk" style="height:24px;width:96px"></div><div class="sk" style="height:40px;width:104px"></div></div></div>'));}
  else if(ready){
    const need=Number(r.capacity_m3),term=r.term_months,sales=W7.salesOnly(need);
    rows=sales||cfg.forceNone?[]:offers(core).s5CandidateList('').slice(0,2);matchState=s5MatchState(core,rows,r);
    h.textContent='为您推荐 '+rows.length+' 家门店';
    sub.textContent=({matched:'',near:'没有不小于 '+need+'m³ 的仓位，以下容量接近',expanded:'已扩大范围',combo:'支持组合仓位',large:'',none:''})[matchState];
    /* D-93 / D-100：与 S01 standardCard 同结构（图 88 + 店名 + 定位行 + 标签 → 仓位行），每卡 2 行：匹配仓 + 下一档更大的可租仓 */
    rows.forEach((row,rank)=>{const s=row.store,ids=row.ids,km=kmText(s);
      const first=core.amounts(ids,term),all=pres.tags(s,5),hasPromo=!!first.campaign_ids?.length,promo=hasPromo?all.find(x=>x.type==='promotion'):null,labels=[...(promo?[promo]:[]),...all.filter(x=>x.type!=='promotion').slice(0,promo?1:2)];
      const avail=F.units.filter(u=>u.store_id===s.id&&core.available(u)).sort((a,b)=>a.volume-b.volume);
      const next=avail.find(u=>u.volume>row.volume&&!ids.includes(u.id));
      const lines=[{ids,volume:row.volume,combo:row.combo},...(next?[{ids:[next.id],volume:next.volume,combo:false,next:true}]:[])];
      const shown=new Set(lines.flatMap(l=>l.ids)),rest=avail.filter(u=>!shown.has(u.id)).length;
      const ratio=need/row.volume,upWhy=row.combo||ratio>1?'':ratio>=.995?'需求与 '+row.volume+'m³ 仓相当，大一档更好放':ratio>=W7.UPSIZE_RATIO?'需求约占 '+row.volume+'m³ 仓的 '+Math.round(ratio*100)+'%，大一档更好放':cfg.from==='items'?'清单含长件，大一档更好放':''; /* W21 D-161 */
      const lineHtml=(l,i)=>{const a=core.amounts(l.ids,term),single=l.ids.length===1?unitById(l.ids[0]):null,cabin=l.combo?'组合仓 '+l.ids.map(id=>unitById(id).demo_cabin_no||unitById(id).code).join(' + '):(single?.demo_cabin_no||single?.code),use=P.describe(unitById(l.ids[0]),'S5').lines[0],near=W7.fit(l.volume,need).state==='near',gift=core.giftTermOptions?.(l.ids,term)?.find(x=>x.eligible);
        return '<div class="unit" data-line="'+i+'" data-ids="'+esc(l.ids.join(','))+'"><b>'+esc(cabin)+'</b><span>·</span><b>'+esc(l.volume)+'m³</b>'+(single&&!l.next&&window.SIM_SPACE_UNIT.unitAreaSuffix(single)?'<span>· '+esc(window.SIM_SPACE_UNIT.unitAreaSuffix(single))+'</span>':'')+'<span>· '+(l.next&&a.monthly_average>first.monthly_average?'大 '+(+(l.volume-row.volume).toFixed(1))+'m³，每月多 '+money(a.monthly_average-first.monthly_average):esc(use))+'</span>'+(l.next&&!(a.monthly_average>first.monthly_average)?'<span class="tag info">大一档</span>':'')+(gift?'<span class="tag ok">赠送'+esc(gift.gift_months)+'个月</span>':'')+fitTag(l.volume,need)+(l.next&&upWhy?'<span class="upnote">'+esc(upWhy)+'</span>':'')+'</div>'+
          '<div class="foot"><div>'+termPriceHtml(a,term)+'</div><button type="button" class="btn '+(i===0&&!near?'primary':'secondary')+' card-cta" data-action="choose" data-value="'+esc(l.ids.join(','))+'">立即下单</button></div>';};
      list.append(el('<article class="card scard s5card" data-rank="'+rank+'" data-store="'+esc(s.id)+'"><img class="ph" src="'+photoOf(s)+'" alt="'+esc(s.name)+'门店环境"><div><div class="name" title="'+esc(s.name)+'">'+esc(s.name)+'</div><div class="meta"><span class="ellip">'+esc(s.address)+'</span>'+(km?'<b>'+km+'</b>':'')+'</div><div class="tags"><span class="tag ok">'+(rank===0?'第一推荐':'第二推荐')+'</span>'+tagsHtml(labels)+'</div></div>'+
        lines.map(lineHtml).join('')+
        '<a class="storelink" href="s02.html?state=matched" data-action="store" data-value="'+esc(s.id)+'"><span>'+(rest>0?'另有 '+rest+' 个可租 · ':'')+'查看门店</span>'+ico('i-chev','ico sm')+'</a></article>'));});
    if(!rows.length){document.getElementById('rec').hidden=true;nm.hidden=false;
      if(matchState==='large'){ /* D-101：≥30m³（个人 / 企业同）不出自助匹配，主操作「提交给顾问」 */
        nm.append(el('<div class="card"><div class="k">30m³ 及以上的需求由顾问为您配仓</div><p>提交后'+esc(W7.LEAD_COPY.inHours)+'。'+esc(W7.LEAD_COPY.offHours.replace('已收到，','非服务时段提交的，'))+'。</p><div class="acts"><a class="btn primary" href="'+ADVISOR_URL+'" data-action="advisor">提交给顾问</a><button type="button" class="btn neutral" data-action="editDemand">修改容量</button></div></div>'));}
      else{nm.append(el('<div class="card"><div class="k">暂无匹配的仓位</div><p>当前城市没有容量接近 '+esc(need)+'m³ 的可租仓位，可查看全部门店或调整容量。</p><div class="acts"><button type="button" class="btn primary" data-action="more">查看全城门店</button><button type="button" class="btn neutral" data-action="editDemand">修改容量</button></div></div>'));showAdvisor=true;nm.after(adv);}
      hideMore();}
    if(rows.length&&advisorNeeded(core,r,rows[0].ids))showAdvisor=true;
    if(showAdvisor){adv.hidden=false;adv.append(advisorCard(bigDeal(core,r,rows[0]?.ids)));}
  }else{document.getElementById('rec').hidden=true;hideMore();}
  const ov=q.get('overlay')||cfg.overlay;
  if(ov==='demand')document.getElementById('overlay-root').append(demandOverlay(r,ready?'修改需求':'填写需求',!ready));
  /* W14 D-127：overlay=origin 打开全站唯一的「用仓位置」面板（pages/w14.js），原抽屉退役 */
  if(ov==='fees'&&rows.length){const a=core.amounts(rows[0].ids,r.term_months);document.getElementById('overlay-root').append(sheet('费用明细',feeListHtml(a,r.term_months,core,{compact:true}),'<div class="acts"><button type="button" class="btn primary">知道了</button></div>'));}
  if(ready)unlockRowPrices(core);
  window.__W2={page:'S5',state:key,matchState,requirement:r,advisorCard:showAdvisor,rows:rows.map(x=>({store:x.store.id,ids:x.ids,volume:x.volume,combo:!!x.combo,near:W7.fit(x.volume,r.capacity_m3).state==='near'})),publicTerm:PUBLIC_TERM};
}

/* ======================= O01 ======================= */
function feeListHtml(a,months,core,opts={}){
  const st=core.state(),couponName=a.coupon_id?(st.coupons.find(c=>c.id===a.coupon_id)?.name||'租金券'):'';
  const special=(a.unit_pricing||[]).filter(x=>x.campaign_id);
  const gift=core.giftTermOptions?.(st.selected,months)?.find(x=>x.eligible);
  return '<div class="fees">'+
    '<div class="row"><span class="k">整期租金<span class="sub">'+months+'个月</span>'+discTag(a,months)+'</span><b class="amt">'+money(a.rent_total)+'</b></div><div class="sec">'+esc(rentFormula(a,months))+'</div>'+
    /* R-C-16：变价时不显示「已省」 */
    (Number(a.term_discount_total)>0&&!opts.noSaved?'<div class="row saved"><span class="k">已省<span class="sub">较月基价 '+money(a.unit_pricing.reduce((n,x)=>n+Number(x.base_month||0),0))+'/月</span></span><b class="amt">'+money(a.term_discount_total)+'</b></div>':'')+ /* D-48 */
    (a.full_reduction>0?'<div class="row"><span class="k">满额减<span class="sub">整期满 '+money(a.full_min)+'</span></span><b class="amt">−'+money(a.full_reduction)+'</b></div><div class="sec">减后整期租金 '+money(a.rent_after_coupon)+'</div>':'')+
    (special.length?'<div class="row"><span class="k">特价仓</span><b class="amt">'+special.map(x=>money(x.unit_special_price)+'/月').join('、')+'</b></div>':'')+
    '<div class="row"><span class="k">优惠券'+(opts.compact||opts.locked?'':'<button type="button" class="link" data-action="coupon">'+(couponName?'更换':'选择')+' ›</button>')+'</span><b class="amt'+(a.coupon_discount>0?'':' muted')+'">'+(a.coupon_discount>0?'−'+money(a.coupon_discount):opts.locked?'未使用':a.coupon_skipped?'不与满额减同享':'暂无适用优惠')+'</b></div>'+
    (couponName?'<div class="sec">已使用 '+esc(couponName)+' · 券后整期租金 '+money(a.rent_after_coupon)+'</div>':'')+
    ((opts.km!==undefined?!(a.campaign_ids?.length)&&W7.freeTransportFor(opts.km,months):!!a.moving_benefit_pending_id)?'<div class="row"><span class="k">服务权益</span><b class="amt muted">免费运输 1 次 · 顾问联系安排</b></div>':'')+
    (gift?'<div class="row"><span class="k">赠送租期</span><b class="amt muted">赠送'+esc(gift.gift_months)+'个月</b></div>':'')+
    '<div class="row"><span class="k">押金<span class="sub">'+(st.selected.length>1?'各仓月租合计':'1个月月租')+'</span></span><b class="amt">'+money(a.deposit)+'</b></div>'+
    '<div class="row"><span class="k">整单管理费</span><b class="amt">'+money(a.management_fee)+'</b></div>'+
    '<div class="total"><span>'+(opts.estimate?'预估应付':'本次应付')+'</span><b class="amt">'+money(a.payable)+'</b></div></div>';
}
function authorize(c){c.requestPhone();c.resolvePhone('success',{phone:PHONE});}
function readyCore(scenario='normal',unit=UNIT){const c=makeCore();c.setScenario(scenario);c.select([unit]);authorize(c);c.setDate(tomorrow());return c;}
const countdown=exp=>{const r=Math.max(0,Math.ceil((Number(exp)-Date.now())/1000));const p=n=>String(n).padStart(2,'0');return p(Math.floor(r/3600))+':'+p(Math.floor(r%3600/60))+':'+p(r%60);};
/* R-C-22：对外订单号 = MK + 下单日期 8 位 + 4 位序号，不露内部 ID；与 O03 同格式（代码侧统一出一个 readableOrderNo） */
const pubOrder=o=>{const d=new Date(Number(o?.createdAt||Date.now())+8*3600*1000).toISOString().slice(0,10).replace(/-/g,''),m=String(o?.id||'').match(/[0-9]+$/);const seq=m?Number(m[0])%10000:Array.from(String(o?.id||'')).reduce((n,ch)=>(Math.imul(n,31)+ch.charCodeAt(0))>>>0,0)%10000;return 'MK'+d+String(seq).padStart(4,'0');};
function termCore(cap,months,unit){const c=makeCore();c.setScenario('normal');c.setRequirement(cap,months,true);c.select([unit]);authorize(c);c.setDate(tomorrow());return c;} /* W21 */
const pendingOrderOf=()=>{const c=readyCore();c.quote();const o=c.submit();return {core:c,order:o};};
const O01_BUILD={
  empty:()=>({core:(()=>{const c=makeCore();c.setScenario('noDemand');return c;})()}),
  unauthorized:()=>{const c=makeCore();c.setScenario('normal');c.select([UNIT]);return {core:c};},
  ready:()=>({core:readyCore()}),
  idv_todo:()=>({core:readyCore(),idvTodo:true}), /* W20 D-148：已登录、未实名 */
  coupon:()=>({core:readyCore('promoCouponCash')}),
  /* W21：下一档提示 / 满额减生效 / 差一点满额 */
  term_near:()=>({core:termCore(3.5,11,UNIT)}),
  full:()=>({core:termCore(8,24,'SIM_BJ01_U05')}),
  full_near:()=>({core:termCore(8,18,'SIM_BJ01_U05')}),
  /* W26：用仓位置距门店 ≥5km（演示距离 6.2km，仅本状态覆盖显示值）。5 个月 = 引导句；6 个月 = 费用明细出「免费运输 1 次」 */
  transport_near:()=>({core:termCore(3.5,5,UNIT),km:6.2}),
  transport_ok:()=>({core:termCore(3.5,6,UNIT),km:6.2}),
  submitting:()=>({core:readyCore(),submitting:true}), /* W7 新增 R-C-23 */
  pending:pendingOrderOf,
  paying:()=>({...pendingOrderOf(),paying:true}), /* W7 新增 R-C-23 */
  price_changed:()=>{const c=readyCore('priceChanged');const quote=c.quote();let err=null;try{c.submit();}catch(e){err=e.message;}return {core:c,oldQuote:quote,err};},
  payment_failed:()=>{const c=readyCore();c.quote();const o=c.submit();const failed=c.pay(o.id,'failed');return {core:c,order:failed,origin:o};},
  expired:()=>{const c=readyCore();c.quote();const o=c.submit();const st=c.state();const c2=window.SIM_CORE.create({state:st,now:()=>Date.now()+4*3600*1000});const checked=c2.resumePendingOrder(o.id);if(!c2.authorized())authorize(c2);return {core:c2,order:checked};},
  cancelled:()=>{const b=pendingOrderOf();return {core:b.core,order:{...b.order,status:'cancelled'}};} /* W7 新增 R-C-03：设计态标记，运行时走 cancelOrder */
};
function renderO01(){
  const key=q.get('state')||'ready',build=O01_BUILD[key];
  if(!build){document.body.prepend(el('<p style="padding:16px;color:#B42318">未知状态 '+esc(key)+'；可用：'+Object.keys(O01_BUILD).join(' / ')+'</p>'));return;}
  const built=build(),core=built.core,st=core.state(),r=st.requirement,body=document.getElementById('body'),act=document.getElementById('actbar-root'),ovr=document.getElementById('overlay-root');
  const submitting=!!built.submitting;
  /* W20 D-148：实名认证在下单签约时完成（使用协议 二.1）；演示：除 idv_todo 外已登录即视为已实名。姓名、证件号为演示占位 */
  const idvDone=!built.idvTodo,IDV_NAME='*明',IDV_NO='110***********0012';
  const agreed=(q.get('agreed')==='1'||submitting)&&key!=='price_changed';
  document.body.dataset.state=key;document.body.dataset.scenario=st.scenario;document.body.dataset.agreed=String(agreed);
  const selected=st.selected,authorized=core.authorized(),confirmed=r.term_confirmed,valid=selected.length&&core.selectionValid(selected);
  if(!selected.length){document.getElementById('screen').classList.remove('has-actbar');body.append(emptyState('请先选择仓位','请先从附近门店选择仓位，再继续下单。','<button type="button" class="btn primary md" data-action="home">返回首页</button>'));window.__W2={page:'O01',state:key,selected:[]};return;}
  const s=storeById(st.storeId),units=selected.map(unitById),u=units[0],months=r.term_months,order=built.order||null;
  const pendingOrder=order&&order.status==='pending'?order:null,failedOrder=order&&order.status==='payment_failed'?order:null,expiredOrder=order&&order.status==='expired'?order:null,cancelledOrder=order&&order.status==='cancelled'?order:null;
  const dead=!!(expiredOrder||cancelledOrder);
  /* R-C-17：订单生成后（待支付 / 支付失败 / 失效 / 取消）可编辑项锁定为只读摘要 */
  const locked=!!order||submitting;
  let a=null,estimate=false;
  try{if(pendingOrder||failedOrder||dead)a=order;else if(authorized&&confirmed&&valid)a=core.amounts(selected,months);
    }catch(_){a=null;estimate=false;} /* W9 D-110：未验证手机号不显示整期金额与费用明细（取代 R-C-14 的预估应付） */
  const usable=valid||!!pendingOrder||!!failedOrder;
  /* D-96：待支付与支付失败统一保留 3 小时，自下单起算，失败不重新计时 */
  const holdUntil=o=>Number(o?.expiresAt)||Number(built.origin?.expiresAt)||(Number(o?.createdAt||Date.now())+W7.PENDING_TTL_H*3600*1000);
  /* --- R-C-29 状态头：与 O03 同一样式（大标题 + 状态标签 + 次行事实），不再用左色条通知卡 --- */
  const shead=(h1,tag,toneCls,subs)=>el('<section class="shead" aria-label="订单状态" role="status"><div class="row"><h1>'+esc(h1)+'</h1><span class="tag status '+toneCls+'">'+esc(tag)+'</span></div><div class="sub">'+subs.filter(Boolean).map(x=>'<span>'+x+'</span>').join('')+'</div></section>');
  const clock=o=>'剩余 <b class="clock" role="timer" aria-label="支付剩余时间">'+countdown(holdUntil(o))+'</b>';
  if(pendingOrder)body.append(shead(built.paying?'等待支付结果':'订单待支付','待支付','warn',['订单号 '+pubOrder(pendingOrder),clock(pendingOrder),'协议已签署，仓位已为您保留；关闭支付窗口不会取消订单']));
  if(failedOrder){
    const stock=core.stockCount(u),sameBase=failedOrder.unit_ids.every((id,i)=>(st.prices[id]||unitById(id).base_month)===failedOrder.price_bases[i]);
    let now=null;try{now=core.amounts(selected,months);}catch(_){now=null;}
    const couponSame=(now?.coupon_id||null)===(failedOrder.coupon_id||null)&&Number(now?.coupon_discount||0)===Number(failedOrder.coupon_discount||0);
    const ok=stock>0&&sameBase&&couponSame&&now&&now.payable===failedOrder.payable;
    body.append(shead('支付未成功','支付失败','err',['订单号 '+pubOrder(failedOrder),clock(failedOrder),'订单为您保留，可在剩余时间内继续支付']));
    body.append(el('<section class="card notice'+(ok?'':' warn')+'" aria-label="恢复核对"><div class="t">已重新核对'+(ok?'，与原订单一致，可以继续支付':'，有变化，请确认后继续')+'</div><ul class="recheck"><li><span class="k">仓位 '+esc(u.demo_cabin_no||u.code)+'</span><span class="v'+(stock>0?'':' bad')+'">'+ico(stock>0?'i-check':'i-close')+(stock>0?'已保留':'已售出')+'</span></li><li><span class="k">价格</span><span class="v'+(sameBase?'':' bad')+'">'+ico(sameBase?'i-check':'i-close')+(sameBase?'与原订单一致':'已变化')+'</span></li><li><span class="k">优惠资格</span><span class="v'+(couponSame?'':' bad')+'">'+ico(couponSame?'i-check':'i-close')+(couponSame?'无变化':'已变化')+'</span></li></ul></section>'));
  }
  /* R-C-25：「已失效」用状态灰，不用促销橙 */
  if(expiredOrder)body.append(shead('订单已超时','已失效','info',['订单号 '+pubOrder(expiredOrder),'超过 '+W7.PENDING_TTL_H+' 小时付款有效期，仓位已释放']));
  if(cancelledOrder)body.append(shead('订单已取消','已取消','info',['订单号 '+pubOrder(cancelledOrder),'仓位已释放，需要时请重新找仓']));
  /* --- summary card --- */
  const kmN=Number.isFinite(built.km)?built.km:displayedKm(s),km=Number.isFinite(kmN)?kmN.toFixed(1)+'km':'';
  const termCell=locked?'<b>'+months+'个月</b>':'<span class="stepper" aria-label="租期"><button type="button" class="'+(months<=1?'off':'')+'" aria-label="减少">−</button><output>'+(confirmed?months+'个月':'请选择')+'</output><button type="button" aria-label="增加">+</button></span>';
  const dateCell=locked?'<b>'+esc(order?.start_date||st.startDate||'—')+'</b>':'<span class="input" role="button" aria-label="用仓开始日期">'+(st.startDate||'请选择日期')+ico('i-cal','ico sm')+'</span>';
  let nud='';if(!locked&&a&&authorized&&confirmed){try{nud=W7.nudgeFar(months,units.reduce((n,x)=>n+Number(st.prices[x.id]??x.base_month),0),k=>core.amounts(selected,k).rent_total,a.coupon_discount,a.campaign_ids?.length?NaN:kmN);}catch(_){nud='';}} /* W21 D-159 */
  body.append(el('<section class="card sumcard'+(dead?' off':'')+'" aria-label="'+(dead?'原订单仓位':'订单仓位信息')+'">'+(dead?'<div class="sec-title">原订单仓位</div>':'')+'<div class="store"><img class="ph" src="'+photoOf(s)+'" alt="'+esc(s.name)+'门店环境"><div><div class="name" title="'+esc(s.name)+'">'+esc(s.name)+'</div><div class="meta">'+(km?'<b>'+km+'</b>':'')+'<span class="ellip">'+esc(s.address)+'</span></div></div></div>'+
    '<div class="unit"><img class="ph" src="'+thumb(u)+'" alt="仓位空间示意"><div><div class="name">'+esc(units.map(displayUnitName).join(' + '))+'</div><div class="meta">'+(units.length>1?'<b>合计 '+esc(units.reduce((n,x)=>n+x.volume,0))+'m³</b>':'<span>'+esc(u.dimensions)+'</span>')+'</div>'+(dead?'':'<div class="tags">'+(units.length>1?'<span class="tag info">'+units.length+'项组合</span>':'')+'</div>')+'</div>'+(locked&&!failedOrder?'':'<a class="swap" href="s02.html?state=matched" data-action="back">'+(failedOrder?'更换仓位':'更换')+'</a>')+'</div>'+
    '<div class="kvlist"><div class="kv"'+(nud?' style="border-bottom:0"':'')+'><span class="k">租期</span><span class="v">'+termCell+'</span></div>'+(nud?'<div class="nudge">'+esc(nud)+'</div>':'')+
    '<div class="kv"><span class="k">'+(locked?'起租日':'预计用仓时间')+'</span><span class="v">'+dateCell+'</span></div></div></section>'));
  /* --- R-C-19 过期 / 取消：替代门店直接列在页内，带同租期整期价，按距离排 --- */
  const altRows=()=>{const o=offers(core);return o.candidateList(s.id).slice().sort((x,y)=>(Number.isFinite(displayedKm(x.store))?displayedKm(x.store):1e9)-(Number.isFinite(displayedKm(y.store))?displayedKm(y.store):1e9)).slice(0,3).map(x=>{let p=null;try{p=core.amounts(x.ids,months).rent_total;}catch(_){p=null;}return {x,p};});};
  const altRowHtml=({x,p})=>'<a class="altrow" href="s02.html?state=matched" data-action="store" data-value="'+esc(x.store.id)+'"><div><div class="n">'+esc(x.store.name)+'</div><div class="s">'+(kmText(x.store)?kmText(x.store)+' · ':'')+esc(x.volume)+'m³'+(x.combo?' · 组合方案':'')+'</div></div><div class="p">'+(p!=null?'<b>'+money(p)+'</b><small>'+months+'个月</small>':'')+'</div>'+ico('i-chev','ico sm')+'</a>';
  if(dead){const rows=altRows();if(rows.length)body.append(el('<section class="card o01alt" aria-label="其他可租门店"><div class="sec-title">其他可租门店<span class="by">按距离由近到远</span></div>'+rows.map(altRowHtml).join('')+'</section>'));}
  else{
    /* --- fee list --- */
    body.append(el('<section class="card" aria-label="费用明细"><div class="sec-title">费用明细'+(estimate?'<span class="tag info">预估</span>':'')+'</div>'+(a?feeListHtml(a,months,core,{noSaved:key==='price_changed',locked,estimate,km:kmN})+(estimate?'<p class="fine">预估金额，授权手机号后锁定报价；优惠券在授权后可选。</p>':'')+(!order&&authorized&&key!=='price_changed'?'<p class="fine" data-quote-ttl>'+W7.PREPAY_NOTE+' · 报价 '+W7.QUOTE_TTL_H+' 小时内有效</p>':''):'<div class="fees">'+['整期租金','优惠券','押金','整单管理费'].map(k=>'<div class="row"><span class="k">'+k+'</span><b class="amt muted">'+(!authorized?'登录后显示':!confirmed?'请选择租期':!valid?'已失效，待重新报价':'选择仓位后显示')+'</b></div>').join('')+'<div class="total"><span>本次应付</span><b class="amt muted" style="font-size:var(--mk-font-size-md);font-weight:500">'+(!authorized?'登录后显示':'待重新报价')+'</b></div></div>')+'</section>'));
    /* --- contact --- */
    body.append(el('<section class="card" aria-label="联系方式"><div class="kv" style="min-height:32px;border:0"><span class="k">联系方式</span><span class="v">'+(authorized?'登录手机号 138****8000':st.contactPhone?'联系电话 '+esc(st.contactPhone)+' · 未登录':'<span class="muted" style="font-weight:400;color:var(--mk-color-ink-secondary)">未登录</span>')+(locked?'':'<button type="button" class="btn text sm" data-action="phone" style="margin-right:-8px">'+(authorized?'更换':'去登录')+'</button>')+'</span></div></section>'));
    body.append(el('<section class="card" aria-label="实名信息" data-w20="idv"><div class="kv" style="min-height:32px;border:0"><span class="k">实名信息</span><span class="v">'+(!authorized?'<span style="font-weight:400;color:var(--mk-color-ink-secondary)">登录后填写</span>':idvDone?esc(IDV_NAME)+' · '+esc(IDV_NO)+' <span class="tag ok">已认证</span>':'<span style="font-weight:400;color:var(--mk-color-ink-secondary)">未认证</span>')+(authorized&&!idvDone&&!locked?'<button type="button" class="btn text sm" data-action="idv" style="margin-right:-8px">去认证</button>':'')+'</span></div></section>'));
    /* --- W26（A10）物品保障：基础保障随订单附赠；增值保障价格未提供，只说明、不在本页售卖（使用协议 七） --- */
    body.append(el('<a class="card svcentry" href="o01.html?state='+encodeURIComponent(key)+'&overlay=protect" data-action="protect">'+ico('i-shield')+'<div><div class="t">物品保障</div><div class="s">已含基础保障，可了解增值保障</div></div>'+ico('i-chev','ico sm chev')+'</a>'));
    /* --- D-76 运输 / 搬运：下单前可预约，按线索处理，不进应付 --- */
    body.append(el('<a class="card svcentry" href="'+TRANSPORT_URL+'" data-action="transport">'+ico('i-truck')+'<div><div class="t">预约运输 / 搬运</div><div class="s">下单前可预约，由顾问电话确认，不计入本次应付</div></div>'+ico('i-chev','ico sm chev')+'</a>'));
    /* --- R-C-03 取消订单入口（待支付 / 支付失败）--- */
    if((pendingOrder&&!built.paying)||failedOrder)body.append(el('<div class="cancelrow"><button type="button" class="btn danger md" data-action="cancelOrder">取消订单</button></div>'));
  }
  /* --- bottom action bar（R-C-18：协议勾选在底栏内主按钮上方；置灰时写明缺哪一步）--- */
  let label=estimate?'预估应付':'本次应付',amt=a?money(a.payable):'',amtMuted='',btn='',btnCls='btn primary',disabled=false,action='pay',hint='',showAgree=false;
  if(dead){label='';amt='';btn='重新找仓';action='restart';}
  else if(!authorized){btn='查看报价';action='phone';amtMuted='登录后显示';}
  else if(!usable){amtMuted='当前方案不可用';btn='选择其他匹配方案';btnCls='btn secondary';action='alternatives';}
  else if(!confirmed){amtMuted='请选择租期';btn='确认订单';disabled=true;hint='请先选择租期';}
  else if(pendingOrder){amt=money(pendingOrder.payable);btn=built.paying?'支付处理中…':'继续支付';action='paySheet';disabled=!!built.paying;}
  else if(key==='price_changed'){amtMuted='报价待确认';btn='确认订单';disabled=true;hint='请先确认新报价';}
  else if(failedOrder){amt=money(failedOrder.payable);btn='继续支付';action='paySheet';} /* R-C-17：失败重付不需重勾协议 */
  else if(!idvDone){btn='实名认证';action='idv';hint='签署协议前需完成实名认证';}
  else if(submitting){btn='正在生成电子合同…';disabled=true;showAgree=true;}
  else{btn='签署并提交';action='sign';disabled=!agreed;showAgree=true;if(!agreed)hint='请先勾选确认';} /* W20 D-148：勾选确认告知书与承诺 → 签署使用协议 → 生成电子合同 → 支付（使用协议 一.31、八.3） */
  const agreeHtml=showAgree?'<div class="cbox'+(agreed?' on':'')+(submitting?' locked':'')+'" role="checkbox" tabindex="0" aria-checked="'+agreed+'" aria-label="确认用户使用告知书，并承诺不存放违规违禁物品"><span class="box">'+ico('i-check')+'</span><span>我已阅读并确认 <a href="'+legalUrl('notice')+'" data-legal="notice">'+C.docName('notice')+'</a>，并承诺不存放<a href="'+legalUrl('usage')+'#att2" data-legal="prohibited">违规违禁物品</a></span></div>':''; /* W8：协议名与承诺句取自合同（使用协议 一.31、八.3） */
  act.append(el('<div class="actbar o01bar'+(dead?' solo':'')+'" role="region" aria-label="底部操作区">'+agreeHtml+'<div class="main">'+(dead?'':'<div><div class="lab">'+label+(a&&!amtMuted&&key!=='price_changed'&&W7.savedTotal(a)>0?' · <span class="savedlab">已省 '+money(W7.savedTotal(a))+'</span>':'')+'</div><div class="amt'+(amtMuted?' muted':'')+'">'+(amtMuted||amt)+'</div></div>')+'<div class="go"><button type="button" class="'+btnCls+(disabled?' disabled':'')+(dead?' block':'')+'" '+(disabled?'disabled aria-disabled="true"':'')+' data-action="'+action+'">'+btn+'</button>'+(hint?'<div class="hint" role="note">'+esc(hint)+'</div>':'')+'</div></div></div>'));
  document.getElementById('screen').classList.toggle('agree-bar',showAgree);
  /* --- overlays --- */
  const ov=q.get('overlay');
  if(key==='price_changed'){
    const o=built.oldQuote,n=core.amounts(selected,months);
    const row=(k,x,y,f=money)=>'<li><span class="k">'+k+'</span><span class="v">'+(x===y?f(y):'<s>'+f(x)+'</s>'+ico('i-arrow')+f(y))+'</span></li>';
    /* R-C-16：写明变化原因（由前后报价差异直接得出，不另编原因枚举）；弹窗与页面都不显示「已省」 */
    const baseOld=(o.unit_pricing||[]).reduce((t,x)=>t+Number(x.base_month||0),0),baseNew=(n.unit_pricing||[]).reduce((t,x)=>t+Number(x.base_month||0),0);
    const reason=baseOld!==baseNew?'该仓位月租由 '+money(baseOld)+' 调整为 '+money(baseNew):(o.coupon_discount||0)!==(n.coupon_discount||0)?'优惠资格发生变化':'报价已更新';
    ovr.append(el('<div class="scrim center" role="alertdialog" aria-modal="true" aria-labelledby="pc-title"><div class="dialog"><h4 id="pc-title">价格刚刚发生变化</h4><p>请核对新的金额后重新确认。已保留您的容量、租期和仓位。</p><div class="reason"><span class="k">变化原因</span><span class="v">'+esc(reason)+'</span></div><ul class="diff">'+row('整期租金',o.rent_total,n.rent_total)+row('月租',o.monthly_average,n.monthly_average,v=>money(v)+'/月')+row('押金',o.deposit,n.deposit)+row('本次应付',o.payable,n.payable)+'</ul><div class="acts"><button type="button" class="btn neutral md" data-action="alternatives">查看其他方案</button><button type="button" class="btn primary md" data-action="requote">确认新报价</button></div></div></div>'));
  }
  /* R-C-28：登录层协议名与订单页一致 */
  if(ov==='phone')ovr.append(el('<div class="scrim" role="dialog" aria-modal="true" aria-labelledby="au-title"><div class="sheet"><div class="grab"></div><button type="button" class="close" aria-label="关闭登录">'+ico('i-close')+'</button><div class="auth-mark"><i></i>迷你考拉仓</div><h4 id="au-title">手机号快捷登录</h4><div class="stackacts" style="margin-top:8px"><button type="button" class="btn primary" data-action="wechatPhone">微信手机号快捷登录</button><button type="button" class="btn neutral" data-action="smsMode">其他手机号登录</button></div><div class="cbox" role="checkbox" tabindex="0" aria-checked="false" aria-label="同意协议"><span class="box">'+ico('i-check')+'</span><span>我已阅读并同意 <a href="'+legalUrl('register')+'">'+C.docName('register')+'</a></span></div><p class="fine">手机号用于登录、查看报价、预约联系和订单通知，未注册的手机号将自动注册。</p></div></div>'));
  /* W20 D-148：实名认证弹层（?overlay=idv[&idv=filled|err|checking]）与签署弹层（?overlay=sign） */
  if(ov==='idv'&&authorized){const m=q.get('idv')||'',has=!!m,busy=m==='checking';
    const inp=(lab,val,ph,err)=>'<div class="field"><label>'+lab+'</label><div class="input'+(err?' err':'')+'" role="textbox" aria-label="'+lab+'"><span class="ph'+(val?' filled':'')+'">'+esc(val||ph)+'</span></div>'+(err?'<div class="ferr">'+esc(err)+'</div>':'')+'</div>';
    ovr.append(sheet('实名认证',inp('姓名',has?'张明':'','请填写证件上的姓名')+inp('身份证号',has?'110101********0012':'','请填写 18 位身份证号',m==='err'?'姓名与身份证号不一致，请核对后重试':'')+'<p class="fine">用于核实签约人身份并签署协议，由依法设立的第三方机构认证。</p>','<div class="acts"><button type="button" class="btn primary block'+(!has||busy?' disabled':'')+'" '+(!has||busy?'disabled aria-disabled="true"':'')+' data-action="idvSubmit">'+(busy?'认证中…':'提交认证')+'</button></div>'));}
  if(ov==='sign'&&a&&idvDone&&!order){const row=(k,v)=>'<div class="kv"><span class="k">'+k+'</span><span class="v">'+v+'</span></div>';
    ovr.append(sheet('签署使用协议','<div class="kvlist" style="padding:0">'+row('签署人',esc(IDV_NAME)+' · '+esc(IDV_NO))+row('门店',esc(s.name))+row('仓位',esc(units.map(displayUnitName).join(' + ')))+row('租期',months+'个月 · '+esc(st.startDate||'')+' 起')+row('本次应付','<b>'+money(a.payable)+'</b>')+'</div><a class="lk" style="display:inline-flex;min-height:32px;align-items:center;margin-top:8px" href="'+legalUrl('usage')+'" data-legal="usage">查看'+C.docName('usage')+'</a><p class="fine">点击「签署」即确认以上订单信息准确、完整。签署后生成电子合同，并进入支付。</p>','<div class="acts"><button type="button" class="btn neutral" data-action="closeOverlay">返回修改</button><button type="button" class="btn primary" data-action="signConfirm">签署</button></div>'));}
  if(ov==='fees'&&a)ovr.append(sheet('费用明细',feeListHtml(a,months,core,{compact:true,estimate,km:kmN}),'<div class="acts"><button type="button" class="btn primary">知道了</button></div>'));
  /* R-C-28：券行留有效期 / 使用门槛显示位；字段值待运营，无值显示「—」，不编数字 */
  if(ov==='coupon'&&authorized&&confirmed){core.claimCoupons();const opts=core.couponOptions(selected,months),cur=a?.coupon_id||null;
    const meta=c=>{const v=c.valid_until||c.expires_at,t=c.threshold_text||c.condition,x=[v?'有效期 '+esc(v):'',t?esc(t):''].filter(Boolean).join(' · ');return x?'<small>'+x+'</small>':'';}; /* W20：没有值就不显示这一行 */
    ovr.append(sheet('选择优惠券','<div class="opt'+(st.couponChoice==='auto'?' on':'')+'"><span class="r">自动使用最优优惠</span>'+(st.couponChoice==='auto'?ico('i-check','ico sm'):'')+'</div><div class="opt"><span class="r">暂不使用优惠</span></div>'+opts.map(c=>'<div class="opt cpn'+(c.eligible?(c.id===cur?' on':''):' off')+'"><span class="r"><span>'+esc(c.name)+(meta(c)?'<br>'+meta(c):'')+(c.eligible?'':'<br><small>'+esc(c.reason||'不适用于当前订单')+'</small>')+'</span></span><span class="amt">'+(c.amount>0?'−'+money(c.amount):'')+(c.id===cur?ico('i-check','ico sm'):'')+'</span></div>').join(''),'<div class="acts"><button type="button" class="btn neutral">取消</button><button type="button" class="btn primary">确定</button></div>'));}
  if(ov==='pay'&&pendingOrder)ovr.append(sheet('确认支付',''+feeListHtml(pendingOrder,months,core,{compact:true,km:kmN}),'<div class="stackacts"><button type="button" class="btn primary" data-action="payResult" data-value="success">微信支付 '+money(pendingOrder.payable)+'</button>'+(q.get('review')==='1'?'<button type="button" class="btn neutral" data-action="payResult" data-value="failed">（评审用）模拟支付失败</button>':'')+'<button type="button" class="btn text" data-action="cancelPay">暂不支付</button></div>'));
  /* R-C-23 支付等待 */
  if(built.paying)ovr.append(el('<div class="scrim center" role="alertdialog" aria-modal="true" aria-labelledby="py-title" aria-busy="true"><div class="dialog"><div class="spin" aria-hidden="true"></div><h4 id="py-title">正在等待支付结果</h4><p>请在微信支付窗口完成付款，完成后本页自动更新。</p><div class="acts"><button type="button" class="btn neutral md" data-action="payProblem">支付遇到问题</button><button type="button" class="btn primary md" data-action="payDone">已完成支付</button></div></div></div>'));
  /* R-C-03 取消订单确认 */
  if(ov==='cancel'&&(pendingOrder||failedOrder))ovr.append(el('<div class="scrim center" role="alertdialog" aria-modal="true" aria-labelledby="cx-title"><div class="dialog"><h4 id="cx-title">确认取消订单？</h4><p>取消后将释放为您保留的仓位，需要时请重新下单。</p><div class="acts"><button type="button" class="btn neutral md" data-action="closeOverlay">暂不取消</button><button type="button" class="btn danger md" data-action="confirmCancel">确认取消</button></div></div></div>'));
  if(ov==='protect')ovr.append(sheet('物品保障','<div class="protect"><div class="pi"><div class="t">基础保障<span class="tag ok">已含</span></div><p>'+esc(C.t('protect.basic'))+'</p></div><div class="pi"><div class="t">增值保障<span class="tag info">可选</span></div><p>'+esc(C.t('protect.plus'))+'</p><p class="s">价格与办理：'+esc(C.t('protect.plusPrice'))+'</p></div><p class="fine">'+esc(C.t('protect.claim'))+'</p></div>','<div class="acts"><a class="btn neutral" href="tel:'+C.t('service.hotline').replace(/-/g,'')+'">联系客服</a><button type="button" class="btn primary" data-action="closeOverlay">知道了</button></div>'));
  if(ov==='alternatives'){const rows=altRows();ovr.append(sheet('其他可租门店','<div class="o01alt">'+rows.map(altRowHtml).join('')+'</div>','<div class="stackacts"><a class="btn neutral" href="'+ADVISOR_URL+'" data-action="advisor">预约顾问</a></div>'));}
  window.__W2={page:'O01',state:key,scenario:st.scenario,authorized,confirmed,valid:!!valid,agreed,estimate,locked,selected,order:order?[pubOrder(order),order.status,order.payable]:null,amounts:a?{rent_total:a.rent_total,monthly:a.monthly_average,coupon:a.coupon_id,discount:a.coupon_discount,deposit:a.deposit,fee:a.management_fee,payable:a.payable}:null,err:built.err||null,oldQuote:built.oldQuote?[built.oldQuote.rent_total,built.oldQuote.payable]:null,publicTerm:PUBLIC_TERM};
}
try{if(PAGE==='S02')renderS02();else if(PAGE==='S5')renderS5();else if(PAGE==='O01')renderO01();}catch(e){console.error(e);document.body.prepend(el('<p style="padding:16px;color:#B42318">渲染失败：'+esc(e.message)+'</p>'));}
})();
