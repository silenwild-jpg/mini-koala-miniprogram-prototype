"""W26 包 C：填容量页 ㎡ 上限 200；预约页 / 我的 / 找仓进度的 ㎡ 需求写法；企业页多区域多选；订阅消息授权层接入。非幂等。"""
import sys,os,json
R=sys.argv[1] if len(sys.argv)>1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def sub(f,a,b,n=1):
    p=os.path.join(R,f);s=open(p,encoding='utf-8').read()
    assert s.count(a)==n,(f,a[:60],s.count(a))
    open(p,'w',encoding='utf-8').write(s.replace(a,b))
W3='pages/w3-render.js';W5='pages/w5-render.js';W6='pages/w6-render.js'
# 1. CAP：㎡ 上限 200（张坤 2026-11-18）
sub(W3,"n>=0.2&&n<=80&&","n>=0.2&&n<=200&&")
sub(W3,"请填写 0.2–80㎡ 的面积","请填写 0.2–200㎡ 的面积")
sub(W3,"area_invalid:{unit:'m2',area:0.1},","area_invalid:{unit:'m2',area:0.1},area_large:{unit:'m2',area:120},area_over:{unit:'m2',area:260},")
sub(W3,"(unit==='m2'&&ok?'<div class=\"conv\">约 '+esc(fmtCap(n))+' m³</div>':'')","(unit==='m2'&&(ok||over)?'<div class=\"conv\">约 '+esc(fmtCap(n))+' m³</div>':'')")
# 2. BOOKING：㎡ 需求带入时写「2㎡ · 约4.8m³」
sub(W3,"carried:{scenario:'normal',v:{...FILLED,capacity_hint:'3.5m³'}},","carried:{scenario:'normal',v:{...FILLED,capacity_hint:'3.5m³'}},carried_area:{scenario:'normal',v:FILLED,area:2,areaCap:4.8},")
sub(W3,"  const core=makeCore();core.setScenario(cfg.scenario);const s=core.state();\n  const pStore=cfg.store||q.get('store')","  let core=makeCore();core.setScenario(cfg.scenario);\n  if(cfg.area){const st1=core.state();Object.assign(st1.requirement,{input_unit:'m2',input_value:cfg.area,capacity_m3:cfg.areaCap});core=makeCore(st1);} /* W26：㎡ 需求带入 */\n  const s=core.state(),rq=s.requirement,rqArea=rq.input_unit==='m2'&&Number(rq.input_value)>0;\n  const pStore=cfg.store||q.get('store')")
sub(W3,"capacity_hint:s.requirement.capacity_m3?s.requirement.capacity_m3+'m³':''","capacity_hint:s.requirement.capacity_m3?(rqArea?rq.input_value+'㎡ · 约'+rq.capacity_m3+'m³':s.requirement.capacity_m3+'m³'):''")
sub(W3,"const capNum=parseFloat(v.capacity_hint),","const capNum=parseFloat((String(v.capacity_hint).match(/约\\s*([\\d.]+)\\s*m³/)||[])[1]??v.capacity_hint),")
# 3. M01 / 找仓进度：㎡ 需求
sub(W6,"function factHtml([value,label]){const m=String(value).match(/^(¥?[\\d,.]+)(m³|个月|天|万\\+?|\\+)?$/);","const areaReq=s=>{const r=(s&&s.requirement)||{};return r.input_unit==='m2'&&Number(r.input_value)>0?r:null;}; /* W26：㎡ 需求与 S5 需求摘要同写法，不显示层高 */\nconst capText=(s,cap)=>{const r=areaReq(s);return r?r.input_value+'㎡ · 约'+cap+'m³':cap+'m³';};\nfunction factHtml([value,label]){const m=String(value).match(/^(¥?[\\d,.]+)(m³|㎡|个月|天|万\\+?|\\+)?$/);")
sub(W6,"k=t.key,o=t.orderId&&state.orders.find(x=>x.id===t.orderId);\n","k=t.key,o=t.orderId&&state.orders.find(x=>x.id===t.orderId);\n  if((k==='estimated'||k==='selected')&&areaReq(state)){const r=areaReq(state);t.facts=t.facts.map(([v,l])=>/^[\\d.]+m³$/.test(String(v))?[r.input_value+'㎡','约'+v]:[v,l]);}\n")
sub(W6,"filter(v=>/^[\\d.]+(m³|个月)$/.test(String(v)))","filter(v=>/^[\\d.]+(m³|㎡|个月)$/.test(String(v)))")
sub(W6,"demand.has?demand.cap+'m³'+(demand.term","demand.has?capText(state,demand.cap)+(demand.term")
sub(W6,"<div class=\"title\">'+esc(d.cap+'m³')+'</div>","<div class=\"title\">'+esc(capText(s,d.cap))+'</div>")
sub(W6,"  estimated:c=>c.setScenario('normal'),\n","  estimated:c=>c.setScenario('normal'),\n  estimated_area:c=>{c.setScenario('normal');return withArea(c);}, /* W26 */\n")
sub(W6,"const BUILD={","const withArea=c=>{const st=c.state();Object.assign(st.requirement,{input_unit:'m2',input_value:2,capacity_m3:4.8});return makeCore(st);};\nconst BUILD={")
sub(W6,"none:()=>lifeCore('noDemand'),demand:()=>lifeCore('normal'),","none:()=>lifeCore('noDemand'),demand:()=>lifeCore('normal'),demand_area:()=>withArea(lifeCore('normal')),")
# 4. BUSINESS：多区域多选
sub(W5,"  step2:{scenario:'normal',step:2,v:FILLED},","  step2:{scenario:'normal',step:2,v:FILLED},\n  multi_area_open:{scenario:'normal',v:{...FILLED,areasOpen:true}},multi_area:{scenario:'normal',v:{...FILLED,areas:['海淀区','丰台区']}},multi_area_step2:{scenario:'normal',step:2,v:{...FILLED,areas:['海淀区','丰台区']}}, /* W26：多区域多选 */")
sub(W5,"expected_start_date:'',notes:'',storage_type_other:''};\n  const v=existing","expected_start_date:'',notes:'',storage_type_other:'',areas:[],areasOpen:false};\n  const v=existing")
sub(W5,"    f.append(el(input('用仓位置',v.location,'城市、区域或详细地址')));\n","""    f.append(el(input('用仓位置',v.location,'城市、区域或详细地址')));
    { /* W26：多区域多选。只列当前城市有门店的区域；提交时并入用仓位置一栏，不新增字段 */
      const city=core.state().city||'北京',AREAS=[...new Set(window.SIM_FIXTURES.stores.filter(x=>x.city===city&&x.district).map(x=>x.district))],open=v.areasOpen||v.areas.length>0;
      f.append(el(open?'<div class="field w26areas" style="margin-top:-12px"><div class="flabel" style="margin:0">还需要用仓的区域<span class="opt">（可多选）</span></div><div class="chips inline soft" style="padding-top:0" role="group" aria-label="还需要用仓的区域">'+AREAS.map(a=>chip(a,v.areas.includes(a),'area',a)).join('')+'</div><div class="help">'+(v.areas.length?'已选 '+v.areas.length+' 个区域，顾问会按这些区域一并安排方案。':'列出的是'+esc(city)+'已有门店的区域。')+'</div></div>':
        '<div class="help row w26areas" style="margin-top:-18px"><button type="button" class="btn text" style="margin-left:-8px" data-action="areasOpen">'+ico('i-pin','ico sm')+'多个区域都需要仓位？添加区域</button></div>'));}
""")
sub(W5,"v.types.length?v.types.join('、'):''].filter(Boolean).join(' · '))+'</div>","v.types.length?v.types.join('、'):''].filter(Boolean).join(' · '))+'</div>'+(v.areas.length?'<div class=\"v w26areasum\">其他区域：'+esc(v.areas.join('、'))+'</div>':'')+'")
sub(W5,"flow.submit({lead_id:existing?.id||undefined,phone:v.phone,location:v.location,","flow.submit({lead_id:existing?.id||undefined,phone:v.phone,location:v.location+(v.areas.length?'；其他区域：'+v.areas.join('、'):''),")
# 5. 订阅消息授权层
for f in ['pages/booking.html','pages/rn01.html']:
    sub(f,'<script src="w7-sys.js"></script>','<script src="w7-sys.js"></script>\n<script src="w26-sub.js"></script>')
print('w26c ok')
