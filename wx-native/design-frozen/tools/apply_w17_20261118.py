# -*- coding: utf-8 -*-
"""W17（2026-11-18）补丁：D-138～D-145。从 W16 工作树接续；每处替换断言命中数。用法：python3 tools/apply_w17_20261118.py"""
import io,os,re,json
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def R(p):return io.open(os.path.join(ROOT,p),encoding='utf-8').read()
def W(p,s):io.open(os.path.join(ROOT,p),'w',encoding='utf-8').write(s)
def rep(p,old,new,n=1):
    s=R(p);c=s.count(old);assert c==n,(p,old[:60],c);W(p,s.replace(old,new))
def rex(p,pat,new,n=1):
    s=R(p);s2,c=re.subn(pat,lambda m:new,s,flags=re.S);assert c==n,(p,pat[:60],c);W(p,s2)

# ---------- model/w7-rules.js ----------
p='model/w7-rules.js'
rep(p,"const TERM_PRESETS=[1,3,6,12,24];","const TERM_PRESETS=[1,3,6,12];  /* W17 D-141：默认 1 / 3 / 6 / 12 个月（24 个月并入「其他」） */")
rep(p,"label:'30m³ 以上'","label:'30m³ 及以上'")
rep(p,"  root.MK_W7={NEARBY_KM,",r'''  /* ---- W17（2026-11-18）---- */
  /* D-140：门店价格 = ¥XX/m³/月起，以门店最低折扣下的立方单价计算 = 该店可租仓位在折扣表最低档（现为 37–60 个月 5.9 折）下「月租 ÷ 容量」的最小值。
     与运行时 presentation-policy.js cubicReference() 同一算法（取整同为舍去小数）。取代 D-98 门店均价与 D-23 的 0.65 公开档——仅门店级价格；单个仓位的「/月起」仍是 0.65 档，见 W17 报告待裁。 */
  const BEST_RULE=[...F.pricing.termRules].sort((a,b)=>a.factor-b.factor||a.min-b.min)[0],BEST_TERM=BEST_RULE.min,BEST_FACTOR=BEST_RULE.factor;
  function storeFromCubic(s,core){const us=allUnits(s).filter(u=>core?core.available(u):u.status!=='soldout');if(!us.length)return null;
    return Math.min(...us.map(u=>(core?core.amounts([u.id],BEST_TERM).monthly_average:Math.trunc(u.base_month*BEST_FACTOR))/Number(u.volume)));}
  const storeFromText=(s,core)=>{const v=storeFromCubic(s,core);return v==null?null:Math.trunc(v);};
  const fromPriceHtml=(s,core,cls)=>{const v=storeFromText(s,core);return v==null?'':'<div class="price fromprice'+(cls?' '+cls:'')+'"><span class="cur">¥</span><span class="num">'+v.toLocaleString('zh-CN')+'</span><span class="unit">/m³/月起</span></div>';};
  /* D-141：统一租期组件（紧凑版）：一行 4 个预设 +「其他」，折扣写在右上角标；「其他」走底部弹层，不在页内展开 */
  function termSeg(term,o){o=o||{};const P=TERM_PRESETS,other=Number.isInteger(term)&&!P.includes(term);
    const cell=(label,on,action,value,badge,extra)=>'<button type="button" class="tcell'+(on?' on':'')+(extra||'')+'" aria-pressed="'+!!on+'" data-action="'+action+'" data-value="'+value+'"><span class="m">'+label+'</span>'+(badge?'<span class="badge">'+badge+'</span>':'')+'</button>';
    return '<div class="termseg'+(o.unsure!==undefined?' six':'')+'" role="group" aria-label="租期">'+P.map(m=>cell(m+'个月',term===m,'term',m,termDiscount(m))).join('')+cell(other?term+'个月':'其他',other,'moreTerms','',other?termDiscount(term):'',' other')+(o.unsure!==undefined?cell('暂不确定',!!o.unsure,'term','unsure','',' unsure'):'')+'</div>';}
  /* ㎡ 全流程：需求以 ㎡ 输入时，各页需求条写「2㎡ · 约4.8m³」。运行时 space-unit.js 的 demandCapacity 按层高 2.5 校验，
     设计稿层高口径是 2.4（D-104），这里按 2.4 重写显示函数；runtime 原件未改，代码侧统一层高后可直接用原函数。 */
  const SU=root.SIM_SPACE_UNIT,AREA_H=(root.MK_VOLUME_MODEL&&root.MK_VOLUME_MODEL.LAYER_HEIGHT_M)||2.4,pretty=v=>String(Number(Number(v).toFixed(2)));
  function demandCapText(r){r=r||{};const v=Number(r.capacity_m3);if(!Number.isFinite(v)||v<=0)return '';
    if(r.input_unit==='m2'&&Number(r.input_value)>0&&Math.abs(Number(r.input_value)*AREA_H-v)<0.011)return pretty(r.input_value)+'㎡ · 约'+pretty(v)+'m³';return pretty(v)+'m³';}
  if(SU)SU.demandCapacity=demandCapText;
  root.MK_W7={storeFromCubic,storeFromText,fromPriceHtml,termSeg,demandCapText,BEST_TERM,BEST_FACTOR,NEARBY_KM,''')

# ---------- pages/w1-render.js（H01 / S01）----------
p='pages/w1-render.js'
rex(p,r"const avgPriceHtml=s=>\{.*?\};\n","const avgPriceHtml=(s,core)=>W7.fromPriceHtml(s,core)||'<div class=\"price\"><span class=\"unit\">暂无价格</span></div>'; /* W17 D-140：¥XX/m³/月起（门店最低折扣下的立方单价） */\n")
rep(p,"avgPriceHtml(s)","avgPriceHtml(s,core)",3)
rep(p,"const cubic=s=>W7.storeAvgCubic(s)??Infinity;","const cubic=s=>W7.storeFromCubic(s,core)??Infinity; /* W17 D-140：排序入参与显示同一数 */")
rep(p,"teaserCubicPrice:W7.storeAvgCubic(s)","teaserCubicPrice:W7.storeFromCubic(s,core)")
rep(p,"avgCubic:W7.storeAvgText(s)","fromCubic:W7.storeFromText(s)")
rep(p,"const m2=q.get('unit')==='m2',cap=ctx.r.capacity_m3","const m2=q.get('unit')==='m2'||ctx.r.input_unit==='m2',cap=ctx.r.capacity_m3")
rex(p,r"<div class=\"termpick\"><div class=\"chips\">'\+W7\.TERM_PRESETS\.map.*?可选 1–60 个月</div>':''\)\+'</div></div>'","'+W7.termSeg(term)+'</div>'")
rep(p,"  sales:{scenario:'noMatch'}","  matched_area:{scenario:'normal',requirement:{capacity_m3:4.8,term_months:6,term_confirmed:true,input_unit:'m2',input_value:2}}, /* W17 ㎡ 全流程 */\n  sales:{scenario:'noMatch'}")
rep(p,"m³ 以上的需求由顾问为您配置方案","m³ 及以上的需求由顾问为您配置方案")

# ---------- pages/w2-render.js（S02 / S5 / O01）----------
p='pages/w2-render.js'
rex(p,r"const avgHtml=s=>\{.*?\};\n","const avgHtml=(s,core)=>W7.fromPriceHtml(s,core,'weak'); /* W17 D-138 / D-140：标题右侧弱化显示 ¥XX/m³/月起 */\n")
rep(p,"""<div class="acts"><button type="button" class="btn secondary" data-action="s02OpenMap" aria-label="地图导航">'+ico('i-nav')+'导航</button><a class="btn secondary" href="tel:'+C.t('service.hotline').replace(/-/g,'')+'" aria-label="拨打400客服电话">'+ico('i-phone')+'电话</a></div></div>'""",
"""'+(!linked&&tab==='可选仓位'?avgHtml(s,core):'')+'<div class="acts icons"><button type="button" class="iconbtn" data-action="s02OpenMap" aria-label="地图导航">'+ico('i-nav')+'</button><a class="iconbtn" href="tel:'+C.t('service.hotline').replace(/-/g,'')+'" aria-label="拨打400客服电话">'+ico('i-phone')+'</a></div></div>'""")
rep(p,"""'</div></div>'+(!linked&&tab==='可选仓位'?avgHtml(s):'')+'</div>'));""","""'</div></div></div>'));""")
rex(p,r"function termPick\(months\)\{.*?\+'</div>';\}\nfunction capPick","function termPick(months){return '<div class=\"termpick\">'+W7.termSeg(months)+'</div>';} /* W17 D-141 */\nfunction capPick")
rep(p,"""'<div class="note">可填 0.5–200，估算值，以实际仓位为准</div></div>'""","""'<div class="note">'+(m2?'可填 0.2–80㎡':'可填 0.5–200m³')+'，估算值，以实际仓位为准</div></div>'""")
rep(p,"capPick(r.capacity_m3,'m3')+(cold?","(r.input_unit==='m2'?capPick(r.input_value,'m2'):capPick(r.capacity_m3,'m3'))+(cold?")
rep(p,"30m³ 以上的需求由顾问为您配仓","30m³ 及以上的需求由顾问为您配仓",2)
rep(p,"core.setScenario(cfg.scenario);if(cfg.capacity)core.setRequirement(cfg.capacity,cfg.term||6,true);","core.setScenario(cfg.scenario);if(cfg.capacity)core.setRequirement(cfg.capacity,cfg.term||6,true);\n  if(cfg.area){const st1=core.state();Object.assign(st1.requirement,{input_unit:'m2',input_value:cfg.area});core=makeCore(st1);} /* W17 ㎡ 全流程 */")
rep(p,"  const core=makeCore();core.setScenario(cfg.scenario);if(cfg.capacity)core.setRequirement(cfg.capacity,6,true);","  let core=makeCore();core.setScenario(cfg.scenario);if(cfg.capacity)core.setRequirement(cfg.capacity,6,true);\n  if(cfg.area){const st1=core.state();Object.assign(st1.requirement,{input_unit:'m2',input_value:cfg.area});core=makeCore(st1);} /* W17 ㎡ 全流程 */")
rep(p,"from_items:{scenario:'normal',capacity:3.3,from:'items'}","from_items:{scenario:'normal',capacity:3.4,from:'items'},from_area:{scenario:'normal',capacity:4.8,area:2}")
rep(p,"services:{scenario:'normal',tab:'服务设施'},route:","matched_area:{scenario:'normal',capacity:4.8,area:2},services:{scenario:'normal',tab:'服务设施'},route:")

# ---------- pages/w9-auth.js / w13-arrival.js ----------
rex('pages/w9-auth.js',r"  const avgBox=id=>\{.*?\n","  const avgBox=id=>{try{const s=F.stores.find(x=>x.id===id);return W.fromPriceHtml(s)||'';}catch(_){return '';}}; /* W17 D-140 */\n")
rep('pages/w13-arrival.js',"  if(A.note&&head){","  if(false&&A.note&&head){ /* W17 D-138：头部不再放到店须知；通行限制只在「到店指引」Tab 的入口与停车卸货里 */")

# ---------- pages/w3-render.js（CAP / ITEMS / QUICK / BOOKING）----------
p='pages/w3-render.js'
rex(p,r"function termPick\(term,o=\{\}\)\{.*?\(o\.note\?'<div class=\"note\">'\+esc\(o\.note\)\+'</div>':''\)\+'</div>';\}",
r'''function termPick(term,o={}){return '<div class="termpick">'+W7.termSeg(term,o)+(o.note?'<div class="note">'+esc(o.note)+'</div>':'')+'</div>';}
/* W17 D-141：「其他」租期走底部弹层（步进 + 常用 18 / 24 / 36），不再在页内展开面板 */
function termOtherRow(term){const other=Number.isInteger(term)&&!W7.TERM_PRESETS.includes(term),d=other?W7.termDiscount(term):'';
  return '<div class="termother"><span class="stepper" role="group" aria-label="其他租期"><button type="button" data-action="termMinus" aria-label="减少一个月"'+(other&&term>1?'':' class="off"')+'>−</button><output>'+(other?term+'个月':'—')+'</output><button type="button" data-action="termPlus" aria-label="增加一个月">＋</button></span>'+(d?'<span class="tag disc">'+d+'</span>':'')+'</div><div class="chips inline soft" role="group" aria-label="常用租期">'+[18,24,36].map(m=>chip(m+'个月',term===m,'term',m)).join('')+'</div><p class="fine">可选 1–60 个月</p>';}
function termSheet(term){const other=Number.isInteger(term)&&!W7.TERM_PRESETS.includes(term);
  return sheet('其他租期',termOtherRow(term),'<div class="acts"><button type="button" class="btn neutral" data-action="closeSheet">取消</button><button type="button" class="btn primary'+(other?'':' disabled')+'"'+(other?'':' disabled aria-disabled="true"')+' data-action="customApply">确定</button></div>');}''')
# CAP
rep(p,"other:{v:3,term:18,panel:true}","other:{v:3,term:18,overlay:'terms'}")
rep(p,"over:{v:260,term:12}};","over:{v:260,term:12},\n  /* W17：两页数据共享（D-142）与 ㎡ 全流程 */\n  from_items:{v:3.4,term:6,src:'items'},from_items_edited:{v:5,term:6,src:'edited'},area_term:{unit:'m2',area:2,term:6}};")
rep(p,"(unit==='m2'?'如：2':'请输入预计所需空间，如：3m³')","(unit==='m2'?'如 2':'如 3')")
rex(p,r"    '<div class=\"chips inline soft\" role=\"group\" aria-label=\"常用容量\">'.*?'<div class=\"note\">'\+EST_NOTE\+'</div></div>'\)\);",
r'''    (unit==='m3'?'<div class="chips inline soft" role="group" aria-label="常用容量">'+[1,3,8,15,20].map(v=>chip(v+'m³',ok&&n===v,'quick',v)).join('')+'</div>':'')+ /* W17：30 换成可自助的 20；㎡ 模式不显示 m³ 快捷项 */
    (cfg.src==='items'?'<div class="capsrc">'+ico('i-box','ico sm')+'<span>按物品估算 <b>'+esc(fmtCap(n))+'m³</b> · 3 种 6 件</span><button type="button" class="lnk" data-action="items" data-href="items.html?state=restored">修改清单 ›</button></div>':
     cfg.src==='edited'?'<div class="capsrc">'+ico('i-box','ico sm')+'<span>已改为手动填写 · 物品估算为 <b>3.4m³</b></span><button type="button" class="lnk" data-action="restoreItems">恢复</button></div>':
     '<div class="caphelprow">'+(ok&&!sales?'<button type="button" class="l" data-action="toRef">全放标准纸箱约 '+Math.floor(n*.8/.096)+' 箱 · 看示意</button>':'<span class="l">'+(sales?'':'不确定多大？')+'</span>')+'<button type="button" class="r" data-action="items" data-href="items.html">按物品估算 ›</button></div>')+
    '</div>'));''')
rep(p,"""  document.getElementById('term-sec').append(el('<div><div class="flabel">预计租多久？</div>'+termPick(term,{soft:true,panel:!!cfg.panel})+'</div>'));""",
"""  if(sales)document.getElementById('term-sec').hidden=true; /* W17：交顾问时收起租期 */
  else document.getElementById('term-sec').append(el('<div><div class="flabel">租期</div>'+termPick(term)+'</div>'));
  if(sales||hint)document.querySelector('.assist [data-action="advisor"]')?.remove(); /* W17：已有顾问卡时不再重复「顾问协助」 */""")
rep(p,"  if(ok||over){const b=BANDS.find(x=>n<=x.max)||BANDS[BANDS.length-1];","  if(ok||over){const b=BANDS.find(x=>n<=x.max)||BANDS[BANDS.length-1],bi=BANDS.indexOf(b),lo=bi>0?BANDS[bi-1].max:null,rng=lo===null?b.max+'m³ 以内':bi===BANDS.length-1?lo+'m³ 以上':lo+'–'+b.max+'m³'; /* W17：参考标题写区间，边界取档位表 */")
rep(p,"""<div class="flabel">空间参考<small>约'+b.anchor+'m³ 示意</small></div>""","""<div class="flabel">空间参考<small>'+rng+' 大致能放</small></div>""")
rep(p,"  if(ov==='ai')toast('AI 估算暂未开放，可按物品估算或直接填写容量');","  if(ov==='ai')toast('AI 估算暂未开放，可按物品估算或直接填写容量');\n  if(ov==='terms')document.getElementById('overlay-root').append(termSheet(term));")
rep(p,"window.__W3={page:'CAP',state:key,unit,raw,","window.__W3={page:'CAP',src:cfg.src||'manual',state:key,unit,raw,")
# ITEMS
rep(p,"const CATS=[['all','全部物品'],...CATALOG.categories.map(([id,name])=>[id,name])];","const CATS=[['all','全部物品'],...CATALOG.categories.filter(c=>c[0]!=='other').map(([id,name])=>[id,name])]; /* W17：「其他物品」只有 1 项，儿童推车并入家具 */")
rep(p,"const ITEMS=[...CATALOG.items].sort(","""/* W17 目录去重与说明改写：设计侧覆盖，runtime/items-catalog.js 原件未改，代码侧需同步改目录。
   办公椅 / 办公桌只保留办公物资里的单品，家具里的「餐椅 / 办公椅」「餐桌 / 办公桌」去掉办公规格；纸箱类单位统一用「箱」；四条说明去掉内部备注。 */
const DESC={box:'约 60×40×40cm',goodsbox:'约 60×40×50cm',pallet:'含货物的满载托盘',printer:'按中型设备估算，大型复印机请选顾问协助'};
const BOXLIKE=new Set(['box','bin','clothingBox','toybox','shoebox','figurebox','winebox','goodsbox','turnover','archiveBox','officeBox']);
const ITEMS=[...CATALOG.items].map(x=>x.id==='chair'?{...x,name:'餐椅',variants:x.variants.filter(v=>v.id!=='office')}:x.id==='dining'?{...x,name:'餐桌 / 小桌',variants:x.variants.filter(v=>v.id!=='office')}:x.id==='stroller'?{...x,category:'furniture'}:x).sort(""")
rep(p,"const ITEMS_STATES={empty:{},browse:{browsing:true},","const ITEMS_STATES={empty:{},")
rep(p,"term:{seed:true,category:'term',term:6},known:{category:'known',known:3.5},","term:{seed:true,browsing:true,term:6,overlay:'term'},term_other:{seed:true,browsing:true,term:18,overlay:'term'},advisor_hint:{seedMid:true,browsing:true,term:12,overlay:'cart'},")
rep(p,"  if(cfg.seedTiny){COUNT.box=1;}","  if(cfg.seedTiny){COUNT.box=1;}\n  if(cfg.seedMid){COUNT.sofa3=2;COUNT.bed180=2;COUNT.wardrobe=2;COUNT.fridge=1;COUNT.washer=1;COUNT.box=40;}")
rex(p,r"  rail\.append\(el\('<button type=\"button\" class=\"termnav'.*?\n","  /* W17：租期入口从左栏底部移到底栏（D-142）；左栏只留物品分类 */\n")
rex(p,r"  if\(st\.category==='term'\)\{.*?  \}else\{\n    let arr=filtered\(\);","  { /* W17：取消物品页内的租期页、已知容量页与空态页；进页直接是物品列表 */\n    let arr=filtered();")
rep(p,"esc(x.description)+'</div>')+'<div class=\"foot\">","esc(DESC[x.id]||x.description)+'</div>')+'<div class=\"foot\">")
rep(p,"(multi?'件':x.name==='标准纸箱'?'箱':'件')","(BOXLIKE.has(x.id)?'箱':'件')")
rep(p,"'建议容量为'+EST_NOTE+'。'","'物品约 '+disp1(exactSum())+'m³，留出码放空隙后建议 '+disp1(volume())+'m³。'+EST_NOTE+'。'")
rep(p,"  const top=st.known!==null?'已知容量 <b>'+display(st.known)+'m³</b>':'已选 <b>'+kinds()+'</b> 种 · 共 <b>'+units()+'</b> 件';","  const top=selected().length?'物品约 <b>'+disp1(exactSum())+'m³</b> · '+units()+' 件':'还没有选择物品'; /* W17：底栏同时写物品合计与建议容量 */")
rep(p,"+'</span> · '+(st.term?'<b>'+st.term+'个月</b>':'租期未选');","+'</span>';")
rep(p,"btn='选择租期 ›';dis=false;}else{btn='查看推荐 ›';dis=false;}","btn='选择租期';dis=false;}else{btn='查看仓位报价';dis=false;}")
rep(p,"btn='提交给顾问 ›';","btn='提交给顾问';")
rep(p,"""+top+'<br>'+bottom+'</button><button type="button" class="btn primary'""","""+top+'<br>'+bottom+'</button>'+(st.term&&validVol()&&!salesVol()?'<button type="button" class="termbtn" data-action="termSheet" aria-label="租期 '+st.term+'个月，点击修改">'+st.term+'个月'+ico('i-down','ico sm')+'</button>':'')+'<button type="button" class="btn primary'""")
rep(p,"""<small>物品合计约 '+disp1(exactSum())+'m³ ÷ 装载系数 '+(rec().k||'—')+(rec().tier?'（'+rec().tier+(rec().frequentAccess?'，留取货通道':'')+'）':'')+'<br>'+EST_NOTE+'</small>""","""<small>物品合计约 '+disp1(exactSum())+'m³，留出码放空隙后的建议值<br>'+EST_NOTE+'</small>""")
rep(p,"""+longHint()+'<div class="carttotal">""","""+longHint()+(volume()>W7.ADVISOR_CAP_M3&&!salesVol()?'<p class="fine advhint">'+ico('i-info','ico sm')+'<span>超过 '+W7.ADVISOR_CAP_M3+'m³ 可预约顾问协助，不影响自助找仓。</span></p>':'')+'<div class="carttotal">""")
rep(p,"  if(ov==='variant'){const x=BYID[cfg.ovItem];","  if(ov==='term'){const other=Number.isInteger(st.term)&&!W7.TERM_PRESETS.includes(st.term);ovr.append(sheet('租期',termPick(st.term)+(other?termOtherRow(st.term):''),'<div class=\"acts\"><button type=\"button\" class=\"btn primary\" data-action=\"closeSheet\">确定</button></div>'));}\n  if(ov==='variant'){const x=BYID[cfg.ovItem];")
rep(p,"capacity:['1m³','3m³','8m³','15m³','30m³ 以上','暂不确定']","capacity:['1m³','3m³','8m³','15m³','30m³ 及以上','暂不确定']")

# ---------- HTML ----------
rep('pages/cap.html',"""<div class="flabel">需要帮助估算？</div><div class="assist"><button type="button" data-action="items"><svg class="ico"><use href="#i-box"/></svg>按物品估算</button><button type="button" data-action="ai" class="soon" aria-disabled="true"><svg class="ico"><use href="#i-spark"/></svg><span class="lbl">AI估算<small>暂未开放</small></span></button><button type="button" data-action="advisor"><svg class="ico"><use href="#i-user"/></svg>顾问协助</button></div>""",
"""<div class="assist two"><button type="button" data-action="advisor"><svg class="ico"><use href="#i-user"/></svg>顾问协助</button><button type="button" data-action="ai" class="soon" aria-disabled="true"><svg class="ico"><use href="#i-spark"/></svg><span class="lbl">AI估算<small>暂未开放</small></span></button></div>""")
s=R('pages/items.html')
a=s.index('<div class="subchips"');b=s.index('<nav class="segtabs"')
s=s[:a]+'<div class="subchips" role="group" aria-label="辅助入口"><button type="button" class="chipwrap" data-action="advisor"><span class="chip"><svg class="ico sm"><use href="#i-headset"/></svg>顾问协助</span></button><button type="button" class="chipwrap soon" data-action="ai" aria-disabled="true"><span class="chip off"><svg class="ico sm"><use href="#i-spark"/></svg>AI 估算 · 暂未开放</span></button></div>\n  '+s[b:]
assert s.count('<span id="tb-title">按物品估算</span>')==1
s=s.replace('<span id="tb-title">按物品估算</span>','<span id="tb-title">按物品估算</span><a class="tbact" href="cap.html" data-action="toCap">直接填容量</a>')
W('pages/items.html',s)

# ---------- CSS ----------
css=r'''
/* ===================== W17（2026-11-18）D-138～D-145 ===================== */
/* D-141 统一租期组件（紧凑版）：一行 4 预设 + 其他；折扣角标用折扣标签同一组色 */
.termseg{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;padding-top:8px}
.termseg.six{grid-template-columns:repeat(3,minmax(0,1fr));row-gap:16px}
.tcell{position:relative;height:40px;padding:0 2px;border:1px solid transparent;border-radius:var(--mk-radius-control);background:var(--mk-color-canvas-sunken);font-size:var(--mk-font-size-sm);font-weight:500;color:var(--mk-color-ink-primary);display:flex;align-items:center;justify-content:center;white-space:nowrap}
.tcell.on{background:var(--mk-color-brand-tint);border-color:var(--mk-color-brand-fill);color:var(--mk-color-brand-text);font-weight:600}
.tcell .badge{position:absolute;top:-8px;right:-1px;height:16px;padding:0 4px;border-radius:8px 8px 8px 2px;font-size:var(--mk-font-size-xs);line-height:16px;font-weight:600;background:var(--mk-color-accent-promoFill);color:var(--mk-color-accent-promoText)}
.tcell.other:not(.on) .m::after{content:"";display:inline-block;width:6px;height:6px;margin:0 0 3px 5px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg)}
.termother{display:flex;align-items:center;gap:12px;margin:4px 0 12px}
.termother .stepper output{min-width:84px}
.sheet .termpick+.termother{margin-top:16px}
/* CAP：输入框下的一行（左 = 参考摘要，右 = 按物品估算）；两页共享时换成来源行 */
.caphelprow,.capsrc{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:36px;font-size:var(--mk-font-size-sm);color:var(--mk-color-ink-secondary)}
.caphelprow .l{min-width:0;height:36px;border:0;background:none;padding:0;font-size:inherit;color:inherit;text-align:left;display:flex;align-items:center}
.caphelprow .r,.capsrc .lnk{flex:none;height:36px;border:0;background:none;padding:0;font-size:var(--mk-font-size-md);font-weight:500;color:var(--mk-color-brand-text)}
.capsrc{justify-content:flex-start;gap:6px;padding:0 10px;background:var(--mk-color-canvas-sunken);border-radius:var(--mk-radius-control)}
.capsrc>span{flex:1;min-width:0}.capsrc b{color:var(--mk-color-ink-primary);font-weight:600}.capsrc .ico{flex:none;color:var(--mk-color-ink-secondary)}
body[data-page="CAP"] .assist.two{justify-content:flex-start;margin:0}
body[data-page="CAP"] .assist.two button{flex:none;padding:0 16px 0 0;margin-right:16px}
body[data-page="CAP"] .assist.two button+button{padding-left:16px}
body[data-page="CAP"] .form-sec[aria-label="需要帮助估算"]{margin-top:8px}
/* ITEMS：顶栏「直接填容量」、底栏租期按钮 */
.topbar.page{position:relative}
.topbar .tbact{position:absolute;right:var(--mk-space-pageGutter);top:50%;transform:translateY(-50%);height:32px;line-height:32px;font-size:var(--mk-font-size-md);font-weight:400;color:var(--mk-color-brand-text)}
.actbar .termbtn{flex:none;height:36px;padding:0 8px;border:1px solid var(--mk-color-line-strong);border-radius:var(--mk-radius-control);background:#fff;font-size:var(--mk-font-size-sm);color:var(--mk-color-ink-primary);display:flex;align-items:center;gap:2px;white-space:nowrap}
body[data-page="ITEMS"] .actbar{gap:8px}
body[data-page="ITEMS"] .actbar .sum{flex:1;min-width:0;font-size:var(--mk-font-size-xs);white-space:nowrap}
body[data-page="ITEMS"] .advhint{display:flex;gap:6px;align-items:flex-start;margin:8px 0}
/* D-140 门店价格 ¥XX/m³/月起 */
.fromprice{flex-wrap:nowrap;white-space:nowrap;gap:2px}
/* D-139 S01 无需求卡：可租容量在价格行左侧，价格在右 */
.scard.browse .foot .caprange{order:-1;margin-left:0}
.scard.browse .foot>div:first-child{margin-left:auto}
.scard.browse .foot .soldout{margin-left:0}
.scard.browse .foot>div:first-child:has(.soldout),.scard.browse .foot>div:first-child:has(.price:not(.fromprice)){margin-left:0;margin-right:auto}
body[data-page="S01"] .scard.compact .cprice .caprange{order:-1}
body[data-page="S01"] .scard.compact .cprice{justify-content:space-between;flex-wrap:nowrap;gap:8px}
/* D-138 S02 头部：导航 / 电话只留图标；价格在店名右侧弱化；不放到店须知 */
body[data-page="S02"] .s02head .acts.icons{gap:4px;margin-right:-6px}
body[data-page="S02"] .s02head .iconbtn{width:36px;height:36px;border:0;background:none;padding:0;display:flex;align-items:center;justify-content:center;color:var(--mk-color-brand-text)}
body[data-page="S02"] .s02head .iconbtn .ico{width:22px;height:22px}
body[data-page="S02"] .s02head .row{gap:8px}
body[data-page="S02"] .s02head .fromprice.weak{flex:none;margin:0;height:36px;align-items:center;color:var(--mk-color-ink-secondary)}
body[data-page="S02"] .s02head .fromprice.weak .cur,body[data-page="S02"] .s02head .fromprice.weak .num{font-size:var(--mk-font-size-md);font-weight:500;line-height:inherit;color:var(--mk-color-ink-secondary)}
body[data-page="S02"] .s02head .fromprice.weak .unit{font-size:var(--mk-font-size-xs)}
body[data-page="S02"] .s02head h1{line-height:36px}
body[data-page="S02"] .s02head .tags.attrs{margin-top:2px}
body[data-page="S02"] .s02head .arrbox{margin-top:10px}
'''
io.open(os.path.join(ROOT,'design-system/components.css'),'a',encoding='utf-8').write(css)
# S5 需求摘要：㎡ 输入时写「2㎡ 约4.8m³」
rep('pages/w2-render.js',"""ready?'<b>'+esc(r.capacity_m3)+'<small>m³</small></b><i></i>""","""ready?(r.input_unit==='m2'?'<b>'+esc(r.input_value)+'<small>㎡</small></b><span class="conv">约'+esc(r.capacity_m3)+'m³</span>':'<b>'+esc(r.capacity_m3)+'<small>m³</small></b>')+'<i></i>""")
io.open(os.path.join(ROOT,'design-system/components.css'),'a',encoding='utf-8').write('.dsum .v .conv{font-size:var(--mk-font-size-xs);color:var(--mk-color-ink-secondary);margin-left:4px;align-self:flex-end}\n')
io.open(os.path.join(ROOT,'design-system/components.css'),'a',encoding='utf-8').write('.capsrc .lnk{min-width:44px;text-align:right}\n')
print('W17 applied')
